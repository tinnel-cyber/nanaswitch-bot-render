// app/api/campaigns/send/route.ts
import { NextResponse } from 'next/server';
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.subject || !body.htmlContent) {
      return NextResponse.json(
        { error: 'Les champs "subject" et "htmlContent" sont obligatoires.' },
        { status: 400 }
      );
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

    // 1. Vérification du solde de crédits du tenant dans Supabase
    if (tenantId && tenantId !== 'default') {
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('id, email_credits')
        .eq('id', tenantId)
        .maybeSingle();

      if (tenantError) {
        console.warn('[CAMPAIGN_SEND] Erreur recherche tenant Supabase:', tenantError.message);
      } else if (tenant) {
        isTenantFound = true;
        tenantEmailCredits = tenant.email_credits ?? 0;
      }
    }

    // 2. Récupération des clients du tenant selon le segment ou liste directe
    let customers: RecipientTarget[] = [];

    if (testEmail) {
      customers = [{
        email: testEmail,
        first_name: 'Destinataire',
        last_name: 'Test'
      }];
    } else if (Array.isArray(directRecipients) && directRecipients.length > 0) {
      // Priorité à la sélection interactive du carnet de contacts du tenant
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

    // Si aucune donnée en base et aucun contact fourni
    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'Aucun destinataire sélectionné ou trouvé dans ce segment.' },
        { status: 400 }
      );
    }

    // 3. Contrôle du quota
    if (isTenantFound && tenantEmailCredits < customers.length) {
      return NextResponse.json({ 
        error: `Crédits insuffisants. Requis : ${customers.length}, Disponibles : ${tenantEmailCredits}` 
      }, { status: 402 });
    }

    // 4. Construction du payload Brevo v3 avec messageVersions
    // Normalisation pour assurer le bon rendu des balises {{params.FIRSTNAME}} et {{FIRSTNAME}}
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

    // 5. Appel de l'API Brevo v3 (POST https://api.brevo.com/v3/smtp/email)
    const brevoApiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_SMTP_KEY || process.env.VITE_BREVO_API_KEY;

    let brevoMessageId = `campaign_${Date.now()}`;
    let isBrevoLive = false;

    if (brevoApiKey && brevoApiKey.length > 10) {
      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(brevoPayload),
      });

      if (!brevoResponse.ok) {
        const brevoErr = await brevoResponse.json().catch(() => ({}));
        console.error('[API /api/campaigns/send] Erreur Brevo:', brevoResponse.status, brevoErr);
        return NextResponse.json(
          { error: 'Erreur lors de l\'envoi Brevo', details: brevoErr },
          { status: brevoResponse.status >= 400 && brevoResponse.status < 600 ? brevoResponse.status : 500 }
        );
      }

      const brevoData = await brevoResponse.json().catch(() => ({}));
      brevoMessageId = brevoData.messageId || brevoData.messageIds?.[0] || brevoMessageId;
      isBrevoLive = true;
    } else {
      console.warn('[CAMPAIGN_SEND] Clé BREVO_API_KEY non détectée - Envoi simulé avec succès.');
    }

    // 6. Déduction des crédits du tenant et enregistrement de l'historique dans Supabase
    const remainingCredits = Math.max(0, tenantEmailCredits - customers.length);

    if (tenantId && isTenantFound) {
      try {
        await supabaseAdmin
          .from('tenants')
          .update({ email_credits: remainingCredits })
          .eq('id', tenantId);

        await supabaseAdmin.from('email_campaigns').insert({
          tenant_id: tenantId,
          sender_name: senderName,
          sender_email: senderEmail,
          subject: subject,
          html_content: htmlContent,
          segment: segment,
          recipients_count: customers.length,
          brevo_message_id: brevoMessageId,
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('[CAMPAIGN_SEND] Sauvegarde historique db:', dbErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      sentCount: customers.length, 
      remainingCredits: remainingCredits,
      brevoMessageId: brevoMessageId,
      liveBrevo: isBrevoLive
    });

  } catch (err: any) {
    console.error('[API /api/campaigns/send] Exception serveur:', err);
    return NextResponse.json({ error: 'Erreur serveur', details: err.message }, { status: 500 });
  }
}
