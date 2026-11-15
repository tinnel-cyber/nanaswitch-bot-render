// app/utils/email.server.ts

export interface DeliveryEmailParams {
  toEmail: string;
  customerName?: string;
  productName: string;
  orderId: string;
  downloadRoute: string; // ex: "/download/CMD-9841" ou URL complète
}

export type DeliveryEmailOptions = DeliveryEmailParams;

interface SendEmailPayload {
  templateId: number;
  email: string;
  name?: string;
  params: Record<string, string>;
}

/**
 * Configuration de l'expéditeur depuis les variables d'environnement
 */
function getSenderConfig() {
  return {
    email: process.env.BREVO_SENDER_EMAIL || process.env.DEFAULT_SENDER_EMAIL || 'support@nanasore.com',
    name: process.env.BREVO_SENDER_NAME || 'Nanasore'
  };
}

/**
 * Génère le template HTML responsive aux couleurs de Nanasore (Bleu Royal)
 */
export function buildNanasoreEmailTemplate({
  customerName = "Client",
  productName,
  orderId,
  downloadLink,
}: {
  customerName?: string;
  productName: string;
  orderId: string;
  downloadLink: string;
}) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de commande - Nanasore</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #334155;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      padding: 36px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 14px;
      color: #bfdbfe;
    }
    .content {
      padding: 36px 30px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 24px;
    }
    .order-box {
      background-color: #f8fafc;
      border-left: 4px solid #1d4ed8;
      padding: 20px;
      border-radius: 8px;
      margin: 24px 0;
      border-top: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .order-product {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 6px;
    }
    .order-id {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      font-family: monospace;
    }
    .btn-container {
      text-align: center;
      margin: 36px 0 24px;
    }
    .btn {
      background-color: #1d4ed8;
      color: #ffffff !important;
      padding: 14px 32px;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      display: inline-block;
      font-size: 15px;
      box-shadow: 0 4px 12px rgba(29, 78, 216, 0.25);
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #1e40af;
    }
    .help-text {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
      margin-top: 24px;
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer a {
      color: #1d4ed8;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nanasore</h1>
      <p>Plateforme de livraison numérique sécurisée</p>
    </div>
    <div class="content">
      <p class="greeting">Bonjour ${customerName},</p>
      <p class="text">
        Merci pour votre achat ! Votre paiement a été validé avec succès. Votre produit est dès à présent disponible au téléchargement sécurisé.
      </p>
      
      <div class="order-box">
        <p class="order-product">${productName}</p>
        <p class="order-id">Commande : #${orderId}</p>
      </div>

      <div class="btn-container">
        <a href="${downloadLink}" class="btn">Accéder à mon fichier →</a>
      </div>

      <p class="help-text">
        <strong>Note de sécurité :</strong> Ce lien de téléchargement est personnel et sécurisé. Vous pouvez également retrouver l'historique de tous vos achats à tout moment depuis votre tableau de bord client Nanasore.
      </p>
    </div>
    <div class="footer">
      <p>Une question ? Contactez notre support technique à <a href="mailto:support@nanasore.com">support@nanasore.com</a></p>
      <p style="margin-top: 8px;">© ${new Date().getFullYear()} Nanasore — Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export const buildDeliveryEmailHtml = buildNanasoreEmailTemplate;

/**
 * Envoie l'email de livraison post-paiement (via Brevo / API SMTP)
 */
export async function sendDeliveryEmail({
  toEmail,
  customerName = "Client",
  productName,
  orderId,
  downloadRoute,
}: DeliveryEmailParams) {
  const baseUrl = process.env.APP_URL || process.env.BASE_URL || "https://nanasore.com";
  const downloadLink = downloadRoute.startsWith("http")
    ? downloadRoute
    : `${baseUrl.replace(/\/$/, "")}${downloadRoute.startsWith("/") ? "" : "/"}${downloadRoute}`;

  const htmlContent = buildNanasoreEmailTemplate({
    customerName,
    productName,
    orderId,
    downloadLink,
  });

  try {
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      console.warn("[AVERTISSEMENT EMAIL] BREVO_API_KEY non définie. Mode simulation actif.");
      console.log(`[SIMULATION EMAIL] Destinataire: ${toEmail} | Lien: ${downloadLink}`);
      return { success: true, simulated: true };
    }

    const sender = getSenderConfig();

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: sender.name, email: sender.email },
        to: [{ email: toEmail, name: customerName }],
        subject: `Vos accès et téléchargement — Commande #${orderId}`,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erreur Brevo API: ${errorData}`);
    }

    console.log(`[EMAIL SUCCÈS] E-mail de livraison envoyé à ${toEmail} pour la commande #${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("[ERREUR EMAIL] Échec de l'envoi de l'email de livraison :", error);
    throw error;
  }
}

/**
 * Fonction raccourcie pour l'envoi direct d'accès client
 */
export async function sendCustomerAccessEmail(
  clientEmail: string,
  orderId: string,
  downloadLink: string,
  productName: string = "Votre produit numérique",
  customerName: string = "Client Nanasore"
) {
  return sendDeliveryEmail({
    toEmail: clientEmail,
    customerName,
    productName,
    orderId,
    downloadRoute: downloadLink,
  });
}

/**
 * Envoie un email transactionnel via un template existant de Brevo
 */
export async function sendBrevoEmail({ templateId, email, name, params }: SendEmailPayload) {
  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || process.env.VITE_BREVO_SMTP_KEY || process.env.VITE_BREVO_API_KEY;

  if (!apiKey || apiKey.length < 5) {
    console.warn("[BREVO] Aucune clé Brevo API trouvée. E-mail simulé.");
    return { success: true, simulated: true };
  }

  const sender = getSenderConfig();

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      templateId,
      sender,
      to: [{ email, name: name || 'Client' }],
      params,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("❌ Erreur Brevo API:", errorData);
    throw new Error(`Échec de l'envoi de l'e-mail (Code ${response.status}): ${errorData.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Envoie l'e-mail de confirmation de compte (Template ID 1)
 */
export async function sendConfirmationEmail({ email, name, confirmationUrl }: { email: string; name?: string; confirmationUrl: string }) {
  return sendBrevoEmail({
    templateId: 1,
    email,
    name,
    params: {
      CONFIRMATION_URL: confirmationUrl,
      EMAIL: email,
      NAME: name || 'Utilisateur',
    },
  });
}

/**
 * Envoie l'e-mail de réinitialisation de mot de passe (Template ID 2 ou template HTML de marque direct)
 */
export async function sendPasswordResetEmail({ email, name, resetUrl }: { email: string; name?: string; resetUrl: string }) {
  const userName = name || email.split('@')[0] || 'Utilisateur';

  // 1. Tenter avec le Template ID 2 officiel de Brevo
  try {
    const templateResult = await sendBrevoEmail({
      templateId: 2,
      email,
      name: userName,
      params: {
        RESET_PASSWORD_URL: resetUrl,
        EMAIL: email,
        NAME: userName,
      },
    });
    return templateResult;
  } catch (templateError: any) {
    console.warn("[BREVO] Template ID 2 non configuré ou introuvable, expédition via le template de marque HTML direct :", templateError?.message);
  }

  // 2. Repli direct avec le template HTML de prestige Nanasore
  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || process.env.VITE_BREVO_SMTP_KEY || process.env.VITE_BREVO_API_KEY;
  if (!apiKey || apiKey.length < 5) {
    console.warn("[BREVO] Aucune clé Brevo API trouvée. E-mail de reset simulé.");
    return { success: true, simulated: true };
  }

  const sender = getSenderConfig();
  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de votre mot de passe - Nanasore</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(29, 78, 216, 0.08);">
    <div style="background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); padding: 36px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(255, 255, 255, 0.15); border-radius: 12px; font-size: 22px; font-weight: 900; margin-bottom: 8px;">N</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Nanasore Security</h1>
      <p style="margin: 6px 0 0; font-size: 13px; color: #bfdbfe;">Réinitialisation sécurisée de vos accès</p>
    </div>
    <div style="padding: 36px 28px;">
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Bonjour ${userName},</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Nanasore. Cliquez sur le bouton sécurisé ci-dessous pour choisir votre nouveau mot de passe :
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #1d4ed8; color: #ffffff; padding: 14px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px 14px rgba(29, 78, 216, 0.35);">
          Changer mon mot de passe →
        </a>
      </div>
      <div style="background-color: #f8fafc; border-left: 4px solid #1d4ed8; padding: 14px 18px; border-radius: 8px; margin: 24px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        <strong>Sécurité :</strong> Ce lien temporaire est strictement confidentiel et expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute tranquillité.
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
      <p style="margin: 0;">© ${new Date().getFullYear()} Nanasore OS — Plateforme de commerce souverain.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email, name: userName }],
      subject: 'Réinitialisation de votre mot de passe Nanasore',
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("❌ Erreur Brevo SMTP direct:", errorData);
    throw new Error(`Échec de l'envoi de l'e-mail (Code ${response.status})`);
  }

  return await response.json();
}

