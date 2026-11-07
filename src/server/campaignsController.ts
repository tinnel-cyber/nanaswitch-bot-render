import { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface RecipientTarget {
  email: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Attache la route /api/campaigns/send au serveur Express
 */
export function attachCampaignsRoutes(app: Express): void {
  app.post('/api/campaigns/send', async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body;

      if (!body || !body.subject || !body.htmlContent) {
        res.status(400).json({ error: 'Les champs "subject" et "htmlContent" sont obligatoires.' });
        return;
      }

      const {
        tenantId,
        senderName = 'Ma Boutique Pro',
        senderEmail = 'contact@maboutique.com',
        subject,
        htmlContent,
        segment = 'all',
        recipients: directRecipients,
        testEmail
      } = body;

      let tenantEmailCredits = 1500;
      let isTenantFound = false;

      // 1. Contrôle des crédits dans Supabase
      if (tenantId && tenantId !== 'default') {
        const { data: tenant, error: tenantError } = await supabaseAdmin
          .from('tenants')
          .select('id, email_credits')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenantError) {
          console.warn('[CAMPAIGN_SEND_EXPRESS] Erreur recherche tenant Supabase:', tenantError.message);
        } else if (tenant) {
          isTenantFound = true;
          tenantEmailCredits = tenant.email_credits ?? 0;
        }
      }

      // 2. Destinataires
      let customers: RecipientTarget[] = [];

      if (testEmail) {
        customers = [{
          email: testEmail,
          first_name: 'Destinataire',
          last_name: 'Test'
        }];
      } else if (Array.isArray(directRecipients) && directRecipients.length > 0) {
        customers = directRecipients.map((c: any) => ({
          email: (c.email || '').trim().toLowerCase(),
          first_name: c.first_name || c.name?.split(' ')[0] || 'Client',
          last_name: c.last_name || c.name?.split(' ').slice(1).join(' ') || ''
        })).filter(c => c.email.includes('@'));
      } else if (tenantId && tenantId !== 'default') {
        let query = supabaseAdmin
          .from('customers')
          .select('email, first_name, last_name')
          .eq('tenant_id', tenantId);

        if (segment === 'active-buyers') {
          query = query.eq('status', 'active');
        }

        const { data: dbCustomers, error: customerError } = await query;
        if (!customerError && dbCustomers && dbCustomers.length > 0) {
          customers = dbCustomers;
        }
      }

      if (customers.length === 0) {
        res.status(400).json({ error: 'Aucun destinataire sélectionné ou trouvé dans ce segment.' });
        return;
      }

      if (isTenantFound && tenantEmailCredits < customers.length) {
        res.status(402).json({
          error: `Crédits insuffisants. Requis : ${customers.length}, Disponibles : ${tenantEmailCredits}`
        });
        return;
      }

      // 3. Normalisation balises
      const normalizedHtmlContent = htmlContent
        .replace(/\{\{FIRSTNAME\}\}/g, '{{params.FIRSTNAME}}')
        .replace(/\{\{LASTNAME\}\}/g, '{{params.LASTNAME}}')
        .replace(/\{\{SHOP_NAME\}\}/g, senderName)
        .replace(/\{\{PROMO_CODE\}\}/g, 'PROMO20');

      const brevoPayload = {
        sender: {
          name: senderName,
          email: process.env.BREVO_SENDER_EMAIL || (senderEmail.includes('@') ? senderEmail : 'notifications@nanasore.com')
        },
        replyTo: {
          name: senderName,
          email: senderEmail.includes('@') ? senderEmail : (process.env.BREVO_SENDER_EMAIL || 'notifications@nanasore.com')
        },
        subject: subject,
        htmlContent: normalizedHtmlContent,
        messageVersions: customers.map((c) => ({
          to: [
            {
              email: c.email,
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email.split('@')[0]
            }
          ],
          params: {
            FIRSTNAME: c.first_name || 'Client',
            LASTNAME: c.last_name || ''
          }
        }))
      };

      const brevoApiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_SMTP_KEY || process.env.VITE_BREVO_API_KEY;

      let brevoMessageId = `campaign_${Date.now()}`;
      let isBrevoLive = false;

      if (brevoApiKey && brevoApiKey.length > 10) {
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'content-type': 'application/json',
            'accept': 'application/json'
          },
          body: JSON.stringify(brevoPayload)
        });

        if (!brevoResponse.ok) {
          const errData = await brevoResponse.json().catch(() => ({}));
          console.error('[BREVO_API_ERROR_EXPRESS]', brevoResponse.status, errData);
          res.status(brevoResponse.status || 500).json({
            error: errData.message || 'Échec de transmission vers l\'API Brevo SMTP.'
          });
          return;
        }

        const brevoResult: any = await brevoResponse.json().catch(() => ({}));
        brevoMessageId = brevoResult.messageId || brevoResult.messageIds?.[0] || brevoMessageId;
        isBrevoLive = true;
      }

      const sentCount = customers.length;
      let newCreditBalance = Math.max(0, tenantEmailCredits - sentCount);

      if (isTenantFound && tenantId && isBrevoLive) {
        await supabaseAdmin
          .from('tenants')
          .update({ email_credits: newCreditBalance })
          .eq('id', tenantId);

        await supabaseAdmin
          .from('email_campaigns')
          .insert({
            tenant_id: tenantId,
            sender_name: senderName,
            sender_email: senderEmail,
            subject: subject,
            recipient_count: sentCount,
            segment: segment,
            provider_message_id: brevoMessageId,
            status: 'sent',
            sent_at: new Date().toISOString()
          });
      }

      res.status(200).json({
        success: true,
        message: isBrevoLive
          ? `Campagne transmise avec succès à ${sentCount} contact(s) via le relais SMTP Pro (Brevo).`
          : `Mode Test : ${sentCount} message(s) simulé(s) avec succès. Configurez BREVO_API_KEY en production.`,
        campaignId: brevoMessageId,
        sentCount: sentCount,
        remainingCredits: newCreditBalance,
        isSimulated: !isBrevoLive
      });

    } catch (err: any) {
      console.error('[CAMPAIGN_SEND_CRITICAL_EXPRESS]', err);
      res.status(500).json({
        error: err?.message || 'Erreur interne lors de l\'envoi de la campagne.'
      });
    }
  });
}
