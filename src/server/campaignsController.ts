import crypto from 'crypto';
import { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://wsxnznobeefrsoicjqte.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';

const supabaseAdmin = supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

const UNSUB_HMAC_SECRET =
  process.env.EMAIL_UNSUBSCRIBE_SECRET ||
  process.env.PAYMENT_WEBHOOK_SECRET ||
  process.env.ADMIN_API_KEY ||
  'nanasore_unsub_signing_key';

const PUBLIC_API_BASE =
  (process.env.API_URL || process.env.APP_URL || 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run').replace(/\/+$/, '');

const BATCH_SIZE = 100; // Lots de 100 destinataires max par appel Brevo (haute fiabilité)

export interface RecipientTarget {
  email: string;
  first_name?: string;
  last_name?: string;
}

function signUnsubscribeToken(tenantId: string, email: string, campaignId = ''): string {
  const payload = Buffer.from(JSON.stringify({ t: tenantId, e: email.toLowerCase(), c: campaignId })).toString('base64url');
  const sig = crypto.createHmac('sha256', UNSUB_HMAC_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyUnsubscribeToken(token: string): { tenantId: string; email: string; campaignId: string } | null {
  try {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', UNSUB_HMAC_SECRET).update(payload).digest('base64url');
    const bufA = Buffer.from(sig, 'utf8');
    const bufB = Buffer.from(expected, 'utf8');
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded?.t || !decoded?.e) return null;
    return { tenantId: String(decoded.t), email: String(decoded.e).toLowerCase(), campaignId: String(decoded.c || '') };
  } catch {
    return null;
  }
}

async function resolveAuthenticatedTenant(req: Request): Promise<{ authorized: boolean; userId: string | null }> {
  const adminSecret = process.env.ADMIN_API_KEY || process.env.INTERNAL_API_SECRET || '';
  const providedSecret = String(req.headers['x-admin-api-key'] || req.headers['x-internal-secret'] || '');
  const authHeader = String(req.headers.authorization || '');
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (adminSecret && providedSecret && providedSecret === adminSecret) {
    return { authorized: true, userId: null };
  }
  if (bearerToken && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
    if (!error && data?.user) {
      const tid = String(data.user.user_metadata?.tenant_id || data.user.user_metadata?.store_id || data.user.id);
      return { authorized: true, userId: tid };
    }
  }
  return { authorized: false, userId: null };
}

/**
 * Découpe une liste de destinataires en lots et expédie via Brevo API v3
 * avec retry exponentiel sur 429/5xx, en-têtes RFC 8058 List-Unsubscribe et support A/B Testing.
 */
async function sendCampaignInBatches(params: {
  brevoApiKey: string;
  tenantId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  abSubjectB?: string;
  htmlContent: string;
  promoCode?: string;
  customers: RecipientTarget[];
  campaignTagId: string;
}): Promise<{ messageIds: string[]; batchCount: number; sentCount: number }> {
  const officialSenderEmail = process.env.BREVO_SENDER_EMAIL || process.env.DEFAULT_SENDER_EMAIL || 'contact@nanasore.com';

  // Vérifier si le marchand possède un domaine vérifié dans `email_sender_domains`
  let effectiveSenderEmail = officialSenderEmail;
  if (supabaseAdmin && params.senderEmail.includes('@')) {
    const senderDomain = params.senderEmail.split('@')[1]?.toLowerCase();
    if (senderDomain) {
      const { data: verifiedDomain } = await supabaseAdmin
        .from('email_sender_domains')
        .select('domain')
        .eq('tenant_id', params.tenantId)
        .eq('domain', senderDomain)
        .eq('verification_status', 'verified')
        .maybeSingle();
      if (verifiedDomain) {
        effectiveSenderEmail = params.senderEmail;
      }
    }
  }

  // Normalisation des variables dynamiques + pied de page légal de désinscription
  let normalizedHtml = String(params.htmlContent)
    .replace(/\{\{(FIRSTNAME|firstname|prenom|PRENOM)\}\}/gi, '{{params.FIRSTNAME}}')
    .replace(/\{\{(LASTNAME|lastname|nom|NOM)\}\}/gi, '{{params.LASTNAME}}')
    .replace(/\{\{(NAME|name)\}\}/gi, '{{params.NAME}}')
    .replace(/\{\{(EMAIL|email)\}\}/gi, '{{params.EMAIL}}')
    .replace(/\{\{(SHOP_NAME|shop_name|boutique)\}\}/gi, params.senderName)
    .replace(/\{\{(PROMO_CODE|promo_code|code_promo)\}\}/gi, params.promoCode || '')
    .replace(/\{\{(UNSUBSCRIBE_URL|unsubscribe_url)\}\}/gi, '{{params.UNSUBSCRIBE_URL}}');

  if (!normalizedHtml.includes('{{params.UNSUBSCRIBE_URL}}')) {
    const unsubFooter = `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-family:sans-serif;font-size:11px;color:#64748b;">Vous recevez cet e-mail car vous êtes client ou abonné de ${params.senderName}. <a href="{{params.UNSUBSCRIBE_URL}}" style="color:#1d4ed8;text-decoration:underline;">Se désinscrire en 1 clic</a></div>`;
    normalizedHtml = normalizedHtml.includes('</body>')
      ? normalizedHtml.replace('</body>', `${unsubFooter}</body>`)
      : `${normalizedHtml}${unsubFooter}`;
  }

  const messageIds: string[] = [];
  let sentCount = 0;
  let batchCount = 0;

  for (let i = 0; i < params.customers.length; i += BATCH_SIZE) {
    const chunk = params.customers.slice(i, i + BATCH_SIZE);
    batchCount += 1;

    const messageVersions = chunk.map((c, idx) => {
      const globalIdx = i + idx;
      const useVariantB = Boolean(params.abSubjectB && params.abSubjectB.trim() && globalIdx % 2 === 1);
      const unsubToken = signUnsubscribeToken(params.tenantId, c.email, params.campaignTagId);
      const unsubUrl = `${PUBLIC_API_BASE}/api/campaigns/unsubscribe?t=${encodeURIComponent(unsubToken)}`;

      return {
        to: [
          {
            email: c.email,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email.split('@')[0],
          },
        ],
        subject: useVariantB ? params.abSubjectB!.trim() : params.subject.trim(),
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Nanasore-Campaign-Id': params.campaignTagId,
          'X-Nanasore-Variant': useVariantB ? 'B' : 'A',
        },
        params: {
          FIRSTNAME: c.first_name || 'Client',
          LASTNAME: c.last_name || '',
          NAME: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Client',
          EMAIL: c.email,
          UNSUBSCRIBE_URL: unsubUrl,
        },
      };
    });

    const brevoPayload = {
      sender: { name: params.senderName, email: effectiveSenderEmail },
      replyTo: {
        name: params.senderName,
        email: params.senderEmail.includes('@') ? params.senderEmail : effectiveSenderEmail,
      },
      subject: params.subject.trim(),
      htmlContent: normalizedHtml,
      tags: [`tenant:${params.tenantId}`, `campaign:${params.campaignTagId}`],
      messageVersions,
    };

    // Retry résilient (jusqu'à 3 tentatives sur 429 / 5xx)
    let attempt = 0;
    let lastError = '';
    let chunkDelivered = false;

    while (attempt < 3 && !chunkDelivered) {
      attempt += 1;
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': params.brevoApiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(brevoPayload),
      });

      if (resp.ok) {
        const resData: any = await resp.json().catch(() => ({}));
        if (resData.messageId) messageIds.push(resData.messageId);
        if (Array.isArray(resData.messageIds)) messageIds.push(...resData.messageIds.slice(0, 5));
        sentCount += chunk.length;
        chunkDelivered = true;
      } else {
        const errData: any = await resp.json().catch(() => ({}));
        lastError = errData.message || `HTTP ${resp.status}`;
        if (resp.status === 429 || resp.status >= 500) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
        } else {
          throw new Error(`Brevo API error (${resp.status}): ${lastError}`);
        }
      }
    }

    if (!chunkDelivered) {
      throw new Error(`Échec d'envoi du lot #${batchCount} après 3 tentatives : ${lastError}`);
    }
  }

  return { messageIds, batchCount, sentCount };
}

/**
 * Attache l'infrastructure complète d'E-mailing Pro au serveur Express :
 * - POST /api/campaigns/send (batching, suppression list, A/B testing, scheduling)
 * - GET/POST /api/campaigns/unsubscribe (RFC 8058 1-clic signé HMAC)
 * - POST /api/webhooks/brevo (tracking temps réel opens/clicks/bounces/spam + auto-suppression)
 * - GET /api/campaigns/history (analytics réels par campagne + liste de suppression)
 * - GET/POST /api/campaigns/domains (authentification SPF/DKIM/DMARC par marchand)
 */
export function attachCampaignsRoutes(app: Express): void {
  // =========================================================================
  // 1. DIFFUSION / PROGRAMMATION DE CAMPAGNE (BATCHING + A/B + SUPPRESSION)
  // =========================================================================
  app.post('/api/campaigns/send', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await resolveAuthenticatedTenant(req);
      if (!auth.authorized) {
        res.status(401).json({ error: 'Authentification requise pour diffuser une campagne e-mailing.' });
        return;
      }

      const body = req.body;
      if (!body || !body.subject || !body.htmlContent) {
        res.status(400).json({ error: 'Les champs "subject" et "htmlContent" sont obligatoires.' });
        return;
      }

      const {
        tenantId: rawTenantId,
        senderName = 'Ma Boutique Pro',
        senderEmail = 'contact@nanasore.com',
        subject,
        abSubjectB = '',
        htmlContent,
        segment = 'all',
        recipients: directRecipients,
        testEmail,
        promoCode = '',
        scheduledAt,
      } = body;

      const tenantId = auth.userId || (rawTenantId && rawTenantId !== 'default' ? String(rawTenantId) : 'nanasore_central_hub');
      const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || '';

      if (!brevoApiKey || brevoApiKey.length < 10) {
        res.status(503).json({
          error: 'Service SMTP Brevo non configuré sur le serveur (BREVO_API_KEY manquant).',
        });
        return;
      }

      // Contrôle réel des crédits dans Supabase
      let tenantEmailCredits = 0;
      let isTenantFound = false;

      if (supabaseAdmin) {
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('id, email_credits')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenant) {
          isTenantFound = true;
          tenantEmailCredits = Number(tenant.email_credits ?? 0);
        }
      }

      // Résolution des destinataires
      let rawCustomers: RecipientTarget[] = [];
      if (testEmail) {
        rawCustomers = [{ email: String(testEmail).trim().toLowerCase(), first_name: 'Test', last_name: '' }];
      } else if (Array.isArray(directRecipients) && directRecipients.length > 0) {
        rawCustomers = directRecipients
          .map((c: any) => ({
            email: String(c.email || '').trim().toLowerCase(),
            first_name: c.first_name || c.name?.split(' ')[0] || 'Client',
            last_name: c.last_name || c.name?.split(' ').slice(1).join(' ') || '',
          }))
          .filter((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email));
      } else if (supabaseAdmin) {
        let query = supabaseAdmin
          .from('customers')
          .select('email, first_name, last_name')
          .eq('tenant_id', tenantId);
        if (segment === 'active-buyers' || segment === 'buyer') {
          query = query.eq('status', 'active');
        }
        const { data: dbCustomers } = await query;
        if (Array.isArray(dbCustomers)) {
          rawCustomers = dbCustomers.filter((c: any) => c.email && c.email.includes('@'));
        }
      }

      // Déduplication par email
      const dedupMap = new Map<string, RecipientTarget>();
      for (const c of rawCustomers) {
        if (!dedupMap.has(c.email)) dedupMap.set(c.email, c);
      }
      const uniqueCustomers = Array.from(dedupMap.values());

      // Filtrage automatique via la liste de suppression (désinscrits, hard bounces, spam)
      let suppressedSet = new Set<string>();
      if (supabaseAdmin && !testEmail && uniqueCustomers.length > 0) {
        const { data: suppressedRows } = await supabaseAdmin
          .from('email_unsubscribes')
          .select('email')
          .eq('tenant_id', tenantId);
        for (const r of suppressedRows || []) {
          if (r.email) suppressedSet.add(String(r.email).toLowerCase());
        }
      }

      const eligibleCustomers = uniqueCustomers.filter((c) => !suppressedSet.has(c.email));
      const suppressedCount = uniqueCustomers.length - eligibleCustomers.length;

      if (eligibleCustomers.length === 0) {
        res.status(400).json({
          error:
            suppressedCount > 0
              ? `Tous les ${suppressedCount} destinataire(s) sélectionnés sont dans votre liste de suppression (désinscrits ou rebonds).`
              : 'Aucun destinataire valide sélectionné.',
        });
        return;
      }

      if (isTenantFound && tenantEmailCredits < eligibleCustomers.length) {
        res.status(402).json({
          error: `Crédits insuffisants. Requis : ${eligibleCustomers.length}, Disponibles : ${tenantEmailCredits}`,
        });
        return;
      }

      const campaignTagId = `cmp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      // Cas A : Campagne programmée (Scheduled Send)
      if (scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 30_000) {
        if (supabaseAdmin) {
          await supabaseAdmin.from('email_campaigns').insert({
            tenant_id: tenantId,
            sender_name: senderName,
            sender_email: senderEmail,
            subject: String(subject).trim(),
            ab_variant_b_subject: abSubjectB ? String(abSubjectB).trim() : null,
            html_content: String(htmlContent),
            recipient_count: eligibleCustomers.length,
            suppressed_count: suppressedCount,
            segment: String(segment),
            provider_message_id: campaignTagId,
            status: 'scheduled',
            scheduled_at: new Date(scheduledAt).toISOString(),
          });
        }
        res.status(200).json({
          success: true,
          scheduled: true,
          campaignId: campaignTagId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          recipientCount: eligibleCustomers.length,
          suppressedCount,
          message: `Campagne programmée pour le ${new Date(scheduledAt).toLocaleString('fr-FR')} (${eligibleCustomers.length} destinataires éligibles, ${suppressedCount} protégés/exclus).`,
        });
        return;
      }

      // Cas B : Envoi immédiat par lots de 100 avec retry + List-Unsubscribe + A/B Testing
      const { messageIds, batchCount, sentCount } = await sendCampaignInBatches({
        brevoApiKey,
        tenantId,
        senderName,
        senderEmail,
        subject: String(subject).trim(),
        abSubjectB: abSubjectB ? String(abSubjectB).trim() : undefined,
        htmlContent: String(htmlContent),
        promoCode: String(promoCode || ''),
        customers: eligibleCustomers,
        campaignTagId,
      });

      const primaryMsgId = messageIds[0] || campaignTagId;
      const newCreditBalance = isTenantFound ? Math.max(0, tenantEmailCredits - sentCount) : undefined;

      if (supabaseAdmin) {
        if (isTenantFound && typeof newCreditBalance === 'number') {
          await supabaseAdmin.from('tenants').update({ email_credits: newCreditBalance }).eq('id', tenantId);
        }

        await supabaseAdmin.from('email_campaigns').insert({
          tenant_id: tenantId,
          sender_name: senderName,
          sender_email: senderEmail,
          subject: String(subject).trim(),
          ab_variant_b_subject: abSubjectB ? String(abSubjectB).trim() : null,
          html_content: String(htmlContent),
          recipient_count: sentCount,
          suppressed_count: suppressedCount,
          batch_count: batchCount,
          segment: String(segment),
          provider_message_id: primaryMsgId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
      }

      res.status(200).json({
        success: true,
        message: `Campagne expédiée à ${sentCount} contact(s) en ${batchCount} lot(s) via Brevo Pro${suppressedCount > 0 ? ` (${suppressedCount} désinscrits/rebonds filtrés automatiquement)` : ''}.`,
        campaignId: primaryMsgId,
        sentCount,
        batchCount,
        suppressedCount,
        remainingCredits: newCreditBalance,
      });
    } catch (err: any) {
      console.error('[CAMPAIGN_SEND_CRITICAL_EXPRESS]', err);
      res.status(500).json({
        error: err?.message || "Erreur interne lors de l'envoi de la campagne.",
      });
    }
  });

  // =========================================================================
  // 2. DÉSINSCRIPTION 1-CLIC RFC 8058 SIGNÉE HMAC (RGPD / CAN-SPAM)
  // =========================================================================
  const handleUnsubscribe = async (req: Request, res: Response) => {
    const token = String(req.query.t || req.body?.t || '');
    const verified = verifyUnsubscribeToken(token);
    if (!verified) {
      res.status(400).send('<h1>Lien de désinscription invalide ou expiré.</h1>');
      return;
    }

    if (supabaseAdmin) {
      await supabaseAdmin.from('email_unsubscribes').upsert(
        {
          tenant_id: verified.tenantId,
          email: verified.email,
          reason: 'unsubscribe',
          source_campaign_id: verified.campaignId || null,
          unsubscribed_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,email' }
      );
      if (verified.campaignId) {
        await supabaseAdmin.rpc('increment_email_campaign_stat', {
          p_message_id: verified.campaignId,
          p_stat_column: 'unsubscribed_count',
        });
      }
    }

    if (req.method === 'POST') {
      res.status(200).json({ success: true, unsubscribed: verified.email });
      return;
    }

    res.status(200).send(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Désinscription confirmée</title></head>
<body style="font-family:system-ui,sans-serif;background:#FBF9F5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;">
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;max-width:440px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.05);">
    <div style="font-size:36px;margin-bottom:12px;">✅</div>
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 8px;">Désinscription confirmée</h1>
    <p style="font-size:14px;color:#475569;line-height:1.5;margin:0;">L'adresse <strong>${verified.email}</strong> a bien été retirée de cette liste de diffusion. Vous ne recevrez plus d'e-mails marketing de cet expéditeur.</p>
  </div>
</body></html>`);
  };

  app.get('/api/campaigns/unsubscribe', handleUnsubscribe);
  app.post('/api/campaigns/unsubscribe', handleUnsubscribe);

  // =========================================================================
  // 3. WEBHOOK BREVO TEMPS RÉEL (DELIVERED / OPEN / CLICK / BOUNCE / SPAM)
  // =========================================================================
  app.get('/api/webhooks/brevo', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'nanasore-brevo-webhook' });
  });
  app.head('/api/webhooks/brevo', (_req: Request, res: Response) => {
    res.status(200).end();
  });

  app.post('/api/webhooks/brevo', async (req: Request, res: Response): Promise<void> => {
    try {
      const configuredSecret = process.env.BREVO_WEBHOOK_SECRET || '';
      if (configuredSecret) {
        const provided = String(req.headers['x-brevo-secret'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '') || '');
        if (provided !== configuredSecret) {
          res.status(401).json({ error: 'Unauthorized Brevo webhook' });
          return;
        }
      }

      const payload = req.body || {};
      const eventType = String(payload.event || '').toLowerCase();
      const recipientEmail = String(payload.email || '').trim().toLowerCase();
      const messageId = String(payload['message-id'] || payload.messageId || '');
      const tags: string[] = Array.isArray(payload.tags) ? payload.tags : [];
      const tenantTag = tags.find((t) => String(t).startsWith('tenant:'))?.replace('tenant:', '') || null;
      const campaignTag = tags.find((t) => String(t).startsWith('campaign:'))?.replace('campaign:', '') || null;

      if (supabaseAdmin && recipientEmail && eventType) {
        await supabaseAdmin.from('email_campaign_events').insert({
          campaign_id: campaignTag,
          tenant_id: tenantTag,
          message_id: messageId || null,
          recipient_email: recipientEmail,
          event_type: eventType,
          link_url: payload.link || null,
          raw_payload: payload,
          occurred_at: new Date().toISOString(),
        });

        const statMap: Record<string, string> = {
          delivered: 'delivered_count',
          unique_opened: 'opened_count',
          opened: 'opened_count',
          click: 'clicked_count',
          hard_bounce: 'bounced_count',
          soft_bounce: 'bounced_count',
          invalid_email: 'bounced_count',
          spam: 'spam_count',
          complaint: 'spam_count',
          unsubscribed: 'unsubscribed_count',
        };

        const targetStat = statMap[eventType];
        if (targetStat && messageId) {
          await supabaseAdmin.rpc('increment_email_campaign_stat', {
            p_message_id: messageId,
            p_stat_column: targetStat,
          });
        }

        // Protection automatique de réputation : hard_bounce / spam / unsubscribed -> liste de suppression
        if (tenantTag && ['hard_bounce', 'invalid_email', 'spam', 'complaint', 'unsubscribed'].includes(eventType)) {
          const reason =
            eventType === 'unsubscribed'
              ? 'unsubscribe'
              : eventType === 'spam' || eventType === 'complaint'
              ? 'spam_complaint'
              : 'hard_bounce';
          await supabaseAdmin.from('email_unsubscribes').upsert(
            {
              tenant_id: tenantTag,
              email: recipientEmail,
              reason,
              source_campaign_id: campaignTag,
              unsubscribed_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id,email' }
          );
        }
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[BREVO WEBHOOK ERROR]', err?.message);
      res.status(500).json({ error: 'Brevo webhook error' });
    }
  });

  // =========================================================================
  // 4. ANALYTICS & HISTORIQUE RÉEL DES CAMPAGNES + LISTE DE SUPPRESSION
  // =========================================================================
  app.get('/api/campaigns/history', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await resolveAuthenticatedTenant(req);
      if (!auth.authorized) {
        res.status(401).json({ error: 'Authentification requise.' });
        return;
      }
      const tenantId = auth.userId || String(req.query.tenantId || '');
      if (!supabaseAdmin || !tenantId) {
        res.json({ success: true, campaigns: [], suppressedCount: 0, suppressedList: [] });
        return;
      }

      const [campaignsRes, suppressedRes] = await Promise.all([
        supabaseAdmin
          .from('email_campaigns')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('sent_at', { ascending: false })
          .limit(50),
        supabaseAdmin
          .from('email_unsubscribes')
          .select('email, reason, unsubscribed_at')
          .eq('tenant_id', tenantId)
          .order('unsubscribed_at', { ascending: false })
          .limit(200),
      ]);

      res.json({
        success: true,
        campaigns: campaignsRes.data || [],
        suppressedCount: (suppressedRes.data || []).length,
        suppressedList: suppressedRes.data || [],
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur chargement historique' });
    }
  });

  // =========================================================================
  // 5. AUTHENTIFICATION DE DOMAINE EXPÉDITEUR (SPF / DKIM / DMARC PAR MARCHAND)
  // =========================================================================
  app.get('/api/campaigns/domains', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await resolveAuthenticatedTenant(req);
      if (!auth.authorized) {
        res.status(401).json({ error: 'Authentification requise.' });
        return;
      }
      const tenantId = auth.userId || String(req.query.tenantId || '');
      if (!supabaseAdmin || !tenantId) {
        res.json({ success: true, domains: [] });
        return;
      }
      const { data } = await supabaseAdmin
        .from('email_sender_domains')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      res.json({ success: true, domains: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur chargement domaines' });
    }
  });

  app.post('/api/campaigns/domains', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await resolveAuthenticatedTenant(req);
      if (!auth.authorized) {
        res.status(401).json({ error: 'Authentification requise.' });
        return;
      }
      const tenantId = auth.userId || String(req.body?.tenantId || '');
      const cleanDomain = String(req.body?.domain || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');

      if (!cleanDomain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) {
        res.status(400).json({ error: 'Nom de domaine invalide (ex: maboutique.com).' });
        return;
      }

      let dkimRecord = `mail._domainkey.${cleanDomain} TXT "k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4..." (activez via Brevo)`;
      let brevoDomainId: string | null = null;
      let verificationStatus = 'pending';

      const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || '';
      if (brevoApiKey && brevoApiKey.length > 10) {
        try {
          const brevoResp = await fetch('https://api.brevo.com/v3/senders/domains', {
            method: 'POST',
            headers: {
              'api-key': brevoApiKey,
              'content-type': 'application/json',
              accept: 'application/json',
            },
            body: JSON.stringify({ name: cleanDomain }),
          });
          const brevoData: any = await brevoResp.json().catch(() => ({}));
          if (brevoResp.ok) {
            brevoDomainId = String(brevoData.id || '');
            const dkimVal = brevoData.dns_records?.dkim_record?.value;
            if (dkimVal) dkimRecord = dkimVal;
          }
        } catch {}
      }

      if (supabaseAdmin && tenantId) {
        const { data, error } = await supabaseAdmin
          .from('email_sender_domains')
          .upsert(
            {
              tenant_id: tenantId,
              domain: cleanDomain,
              spf_record: 'v=spf1 include:spf.brevo.com ~all',
              dkim_record: dkimRecord,
              dmarc_record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${cleanDomain}`,
              verification_status: verificationStatus,
              brevo_domain_id: brevoDomainId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id,domain' }
          )
          .select()
          .maybeSingle();

        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.status(201).json({ success: true, domain: data });
        return;
      }

      res.status(201).json({
        success: true,
        domain: {
          domain: cleanDomain,
          spf_record: 'v=spf1 include:spf.brevo.com ~all',
          dkim_record: dkimRecord,
          dmarc_record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${cleanDomain}`,
          verification_status: verificationStatus,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erreur ajout domaine' });
    }
  });

  // =========================================================================
  // 6. SCHEDULER ARRIÈRE-PLAN (EXPÉDITION AUTOMATIQUE DES CAMPAGNES PROGRAMMÉES)
  // =========================================================================
  if (supabaseAdmin) {
    setInterval(async () => {
      try {
        const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || '';
        if (!brevoApiKey || !supabaseAdmin) return;

        const { data: dueCampaigns } = await supabaseAdmin
          .from('email_campaigns')
          .select('*')
          .eq('status', 'scheduled')
          .lte('scheduled_at', new Date().toISOString())
          .limit(5);

        for (const cmp of dueCampaigns || []) {
          // Verrou optimiste : passer en 'sending'
          const { data: locked } = await supabaseAdmin
            .from('email_campaigns')
            .update({ status: 'sending' })
            .eq('id', cmp.id)
            .eq('status', 'scheduled')
            .select('id')
            .maybeSingle();

          if (!locked) continue;

          try {
            const { data: dbCustomers } = await supabaseAdmin
              .from('customers')
              .select('email, first_name, last_name')
              .eq('tenant_id', cmp.tenant_id);

            const { data: suppressedRows } = await supabaseAdmin
              .from('email_unsubscribes')
              .select('email')
              .eq('tenant_id', cmp.tenant_id);
            const suppressedSet = new Set((suppressedRows || []).map((r: any) => String(r.email).toLowerCase()));

            const eligible = (dbCustomers || []).filter(
              (c: any) => c.email && c.email.includes('@') && !suppressedSet.has(String(c.email).toLowerCase())
            );

            if (eligible.length === 0) {
              await supabaseAdmin.from('email_campaigns').update({ status: 'failed' }).eq('id', cmp.id);
              continue;
            }

            const { messageIds, batchCount, sentCount } = await sendCampaignInBatches({
              brevoApiKey,
              tenantId: cmp.tenant_id,
              senderName: cmp.sender_name || 'Nanasore',
              senderEmail: cmp.sender_email || 'contact@nanasore.com',
              subject: cmp.subject,
              abSubjectB: cmp.ab_variant_b_subject || undefined,
              htmlContent: cmp.html_content || '<p>Bonjour</p>',
              customers: eligible,
              campaignTagId: cmp.provider_message_id || String(cmp.id),
            });

            await supabaseAdmin
              .from('email_campaigns')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                recipient_count: sentCount,
                batch_count: batchCount,
                provider_message_id: messageIds[0] || cmp.provider_message_id,
              })
              .eq('id', cmp.id);
          } catch (schedErr: any) {
            console.error('[EMAIL SCHEDULER ERROR]', cmp.id, schedErr?.message);
            await supabaseAdmin.from('email_campaigns').update({ status: 'failed' }).eq('id', cmp.id);
          }
        }
      } catch {
        // silent poll guard
      }
    }, 60_000).unref();
  }
}
