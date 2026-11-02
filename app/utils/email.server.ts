// app/utils/email.server.ts

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
    email: process.env.BREVO_SENDER_EMAIL || 'admin@nanasore.com',
    name: process.env.BREVO_SENDER_NAME || 'Nanasore Team'
  };
}

export async function sendBrevoEmail({ templateId, email, name, params }: SendEmailPayload) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY est manquante dans les variables d'environnement (.env)");
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
 * L'URL de confirmation est générée dynamiquement avec le domaine nanasore.com
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
 * Envoie l'e-mail de réinitialisation de mot de passe (Template ID 2)
 */
export async function sendPasswordResetEmail({ email, name, resetUrl }: { email: string; name?: string; resetUrl: string }) {
  return sendBrevoEmail({
    templateId: 2,
    email,
    name,
    params: {
      RESET_PASSWORD_URL: resetUrl,
      EMAIL: email,
      NAME: name || 'Utilisateur',
    },
  });
}
