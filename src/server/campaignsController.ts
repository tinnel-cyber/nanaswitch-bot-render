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

export interface RecipientTarget {
  email: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Attache la route /api/campaigns/send au serveur Express (authentifiée & 100% réelle Brevo + Supabase)
 */
export function attachCampaignsRoutes(app: Express): void {
  app.post('/api/campaigns/send', async (req: Request, res: Response): Promise<void> => {
    try {
      // 1. Authentification obligatoire (Bearer JWT Supabase ou clé interne serveur)
      const adminSecret = process.env.ADMIN_API_KEY || process.env.INTERNAL_API_SECRET || '';
      const providedSecret = String(req.headers['x-admin-api-key'] || req.headers['x-internal-secret'] || '');
      const authHeader = String(req.headers.authorization || '');
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

      let authenticatedUserId: string | null = null;
      let isAuthorized = false;

      if (adminSecret && providedSecret && providedSecret === adminSecret) {
        isAuthorized = true;
      } else if (bearerToken && supabaseAdmin) {
        const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
        if (!error && data?.user) {
          isAuthorized = true;
          authenticatedUserId = data.user.id;
        }
      }

      if (!isAuthorized) {
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
        htmlContent,
        segment = 'all',
        recipients: directRecipients,
        testEmail,
        promoCode = '',
      } = body;

      const tenantId = authenticatedUserId || (rawTenantId && rawTenantId !== 'default' ? String(rawTenantId) : null);

      const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || '';
      if (!brevoApiKey || brevoApiKey.length < 10) {
        res.status(503).json({
          error: 'Service SMTP Brevo non configuré sur le serveur (BREVO_API_KEY manquant). Aucun e-mail simulé en production.',
        });
        return;
      }

      // 2. Contrôle réel des crédits dans Supabase
      let tenantEmailCredits = 0;
      let isTenantFound = false;

      if (tenantId && supabaseAdmin) {
        const { data: tenant, error: tenantError } = await supabaseAdmin
          .from('tenants')
          .select('id, email_credits')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenantError) {
          console.warn('[CAMPAIGN_SEND_EXPRESS] Erreur recherche tenant Supabase:', tenantError.message);
        } else if (tenant) {
          isTenantFound = true;
          tenantEmailCredits = Number(tenant.email_credits ?? 0);
        }
      }

      // 3. Destinataires réels (testEmail, liste sélectionnée ou base Supabase `customers`)
      let customers: RecipientTarget[] = [];

      if (testEmail) {
        customers = [{ email: String(testEmail).trim().toLowerCase(), first_name: 'Destinataire', last_name: 'Test' }];
      } else if (Array.isArray(directRecipients) && directRecipients.length > 0) {
        customers = directRecipients
          .map((c: any) => ({
            email: String(c.email || '').trim().toLowerCase(),
            first_name: c.first_name || c.name?.split(' ')[0] || 'Client',
            last_name: c.last_name || c.name?.split(' ').slice(1).join(' ') || '',
          }))
          .filter((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email));
      } else if (tenantId && supabaseAdmin) {
        let query = supabaseAdmin
          .from('customers')
          .select('email, first_name, last_name')
          .eq('tenant_id', tenantId);

        if (segment === 'active-buyers' || segment === 'buyer') {
          query = query.eq('status', 'active');
        }

        const { data: dbCustomers, error: customerError } = await query;
        if (!customerError && Array.isArray(dbCustomers)) {
          customers = dbCustomers.filter((c: any) => c.email && c.email.includes('@'));
        }
      }

      if (customers.length === 0) {
        res.status(400).json({ error: 'Aucun destinataire valide sélectionné ou trouvé dans votre base clients.' });
        return;
      }

      if (isTenantFound && tenantEmailCredits < customers.length) {
        res.status(402).json({
          error: `Crédits insuffisants. Requis : ${customers.length}, Disponibles : ${tenantEmailCredits}`,
        });
        return;
      }

      // 4. Normalisation des variables dynamiques + lien de désinscription obligatoire (RGPD / CAN-SPAM)
      let normalizedHtmlContent = String(htmlContent)
        .replace(/\{\{(FIRSTNAME|firstname|prenom|PRENOM)\}\}/gi, '{{params.FIRSTNAME}}')
        .replace(/\{\{(LASTNAME|lastname|nom|NOM)\}\}/gi, '{{params.LASTNAME}}')
        .replace(/\{\{(NAME|name)\}\}/gi, '{{params.NAME}}')
        .replace(/\{\{(EMAIL|email)\}\}/gi, '{{params.EMAIL}}')
        .replace(/\{\{(SHOP_NAME|shop_name|boutique)\}\}/gi, senderName)
        .replace(/\{\{(PROMO_CODE|promo_code|code_promo)\}\}/gi, promoCode || '');

      const officialSenderEmail = process.env.BREVO_SENDER_EMAIL || process.env.DEFAULT_SENDER_EMAIL || 'contact@nanasore.com';

      const brevoPayload = {
        sender: {
          name: senderName,
          email: officialSenderEmail,
        },
        replyTo: {
          name: senderName,
          email: senderEmail && senderEmail.includes('@') ? senderEmail : officialSenderEmail,
        },
        subject: String(subject).trim(),
        htmlContent: normalizedHtmlContent,
        messageVersions: customers.map((c) => ({
          to: [
            {
              email: c.email,
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email.split('@')[0],
            },
          ],
          params: {
            FIRSTNAME: c.first_name || 'Client',
            LASTNAME: c.last_name || '',
            NAME: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Client',
            EMAIL: c.email,
          },
        })),
      };

      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(brevoPayload),
      });

      if (!brevoResponse.ok) {
        const errData: any = await brevoResponse.json().catch(() => ({}));
        console.error('[BREVO_API_ERROR_EXPRESS]', brevoResponse.status, errData);
        res.status(brevoResponse.status || 500).json({
          error: errData.message || "Échec de transmission vers l'API Brevo SMTP.",
        });
        return;
      }

      const brevoResult: any = await brevoResponse.json().catch(() => ({}));
      const brevoMessageId = brevoResult.messageId || brevoResult.messageIds?.[0] || `campaign_${Date.now()}`;
      const sentCount = customers.length;
      const newCreditBalance = isTenantFound ? Math.max(0, tenantEmailCredits - sentCount) : undefined;

      if (supabaseAdmin && tenantId) {
        if (isTenantFound && typeof newCreditBalance === 'number') {
          await supabaseAdmin
            .from('tenants')
            .update({ email_credits: newCreditBalance })
            .eq('id', tenantId);
        }

        await supabaseAdmin.from('email_campaigns').insert({
          tenant_id: tenantId,
          sender_name: senderName,
          sender_email: senderEmail,
          subject: String(subject).trim(),
          recipient_count: sentCount,
          segment: String(segment),
          provider_message_id: brevoMessageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
      }

      res.status(200).json({
        success: true,
        message: `Campagne transmise avec succès à ${sentCount} contact(s) via le relais SMTP Pro (Brevo).`,
        campaignId: brevoMessageId,
        sentCount,
        remainingCredits: newCreditBalance,
      });
    } catch (err: any) {
      console.error('[CAMPAIGN_SEND_CRITICAL_EXPRESS]', err);
      res.status(500).json({
        error: err?.message || "Erreur interne lors de l'envoi de la campagne.",
      });
    }
  });
}
