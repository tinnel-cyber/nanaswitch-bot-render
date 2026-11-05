import { BrevoClient } from '@getbrevo/brevo';

const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL || 'contact@nanasore.com';
const senderName = process.env.BREVO_SENDER_NAME || 'Nanasore';

// Initialisation du client officiel Brevo SDK
export const brevoClient = apiKey && !apiKey.includes('votre-cle-api')
  ? new BrevoClient({ apiKey })
  : null;

export interface NanasoreEmailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  title?: string;
  preheader?: string;
  messageHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  securityNote?: string;
}

/**
 * Génère un template HTML élégant et responsive aux couleurs officielles de Nanasore (#1d4ed8)
 */
export function buildNanasoreBrandedHtml({
  title = "Notification Nanasore",
  preheader = "Votre plateforme souveraine de commerce et savoir",
  messageHtml,
  ctaText,
  ctaUrl,
  securityNote,
}: {
  title?: string;
  preheader?: string;
  messageHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  securityNote?: string;
}) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #334155;
    }
    .container {
      max-width: 600px;
      margin: 32px auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(29, 78, 216, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      padding: 36px 28px;
      text-align: center;
      color: #ffffff;
    }
    .logo-badge {
      display: inline-block;
      width: 44px;
      height: 44px;
      line-height: 44px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      font-size: 24px;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 13px;
      color: #bfdbfe;
    }
    .content {
      padding: 36px 32px;
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .cta-btn {
      background-color: #1d4ed8;
      color: #ffffff !important;
      padding: 14px 32px;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      display: inline-block;
      font-size: 15px;
      box-shadow: 0 4px 14px rgba(29, 78, 216, 0.35);
    }
    .cta-btn:hover {
      background-color: #1e40af;
    }
    .note-box {
      background-color: #f8fafc;
      border-left: 4px solid #1d4ed8;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 24px 0 0;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
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
      <div class="logo-badge">N</div>
      <h1>Nanasore</h1>
      <p>${preheader}</p>
    </div>
    <div class="content">
      ${messageHtml}

      ${
        ctaText && ctaUrl
          ? `
      <div class="cta-container">
        <a href="${ctaUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">
          ${ctaText} →
        </a>
      </div>
      `
          : ""
      }

      ${
        securityNote
          ? `
      <div class="note-box">
        <strong>Sécurité :</strong> ${securityNote}
      </div>
      `
          : ""
      }
    </div>
    <div class="footer">
      <p>Une question ou assistance ? <a href="mailto:contact@nanasore.com">contact@nanasore.com</a></p>
      <p style="margin-top: 6px;">© ${new Date().getFullYear()} Nanasore OS — Plateforme de commerce souverain.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Envoie un email transactionnel personnalisé aux couleurs de Nanasore (#1d4ed8) via Brevo API
 */
export async function sendNanasoreEmail({
  toEmail,
  toName = "Utilisateur",
  subject,
  title,
  preheader,
  messageHtml,
  ctaText,
  ctaUrl,
  securityNote,
}: NanasoreEmailOptions) {
  const htmlContent = buildNanasoreBrandedHtml({
    title: title || subject,
    preheader,
    messageHtml,
    ctaText,
    ctaUrl,
    securityNote,
  });

  // Mode simulation si clé absente ou placeholder
  if (!brevoClient) {
    console.warn(`[BREVO_SIMULATION] Clé API non configurée. E-mail simulé pour : ${toEmail}`);
    console.log(`[BREVO_SIMULATION_DETAILS] Sujet: "${subject}" | Lien: ${ctaUrl || "N/A"}`);
    return {
      success: true,
      simulated: true,
      toEmail,
      subject,
    };
  }

  try {
    const response = await brevoClient.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent,
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail, name: toName }],
      replyTo: { email: senderEmail, name: senderName },
    });

    console.log(`[BREVO_SUCCESS] E-mail envoyé avec succès à ${toEmail} (MessageId: ${(response as any)?.messageId || "ok"})`);
    return {
      success: true,
      messageId: (response as any)?.messageId,
    };
  } catch (error: any) {
    console.error("[BREVO_ERROR] Échec d'envoi de l'e-mail via Brevo:", error);
    throw new Error(error?.message || "Erreur lors de l'envoi de l'e-mail via l'API Brevo");
  }
}

/**
 * Helper spécifique pour l'envoi de lien de vérification d'adresse e-mail
 */
export async function sendEmailVerification({
  toEmail,
  toName = "Marchand",
  verificationUrl,
}: {
  toEmail: string;
  toName?: string;
  verificationUrl: string;
}) {
  return sendNanasoreEmail({
    toEmail,
    toName,
    subject: "Activez et confirmez votre compte Nanasore",
    preheader: "Confirmation d'adresse e-mail sécurisée",
    messageHtml: `
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Bienvenue sur Nanasore, ${toName} !</h2>
      <p style="margin-bottom: 16px;">
        Votre inscription a bien été enregistrée. Pour finaliser l'ouverture de votre compte et débloquer l'accès à vos modules et coffre numérique R2, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous :
      </p>
    `,
    ctaText: "Confirmer mon adresse e-mail",
    ctaUrl: verificationUrl,
    securityNote: "Ce lien sécurisé est personnel et expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.",
  });
}
