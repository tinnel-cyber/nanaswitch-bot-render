/**
 * Service d'envoi d'emails transactionnels via l'API REST v3 de Brevo.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendTransactionalEmailOptions {
  /** Adresse e-mail ou objet destinataire (ou liste de destinataires) */
  to: string | EmailRecipient | Array<string | EmailRecipient>;
  /** Objet / Sujet de l'email */
  subject: string;
  /** Contenu HTML du corps de l'e-mail */
  htmlContent: string;
  /** Paramètres dynamiques / variables pour le template Brevo */
  params?: Record<string, any>;
  /** Nom de l'expéditeur optionnel (écrase la variable d'environnement) */
  senderName?: string;
  /** Email de l'expéditeur optionnel (écrase la variable d'environnement) */
  senderEmail?: string;
  /** Adresse de réponse optionnelle */
  replyTo?: EmailRecipient;
  /** Contenu texte brut optionnel */
  textContent?: string;
}

export interface BrevoEmailResponse {
  messageId: string;
  [key: string]: any;
}

/**
 * Envoie un email transactionnel en appelant directement l'API REST de Brevo.
 * 
 * Variables d'environnement requises / supportées :
 * - BREVO_API_KEY : Clé API Brevo (v3)
 * - BREVO_SENDER_EMAIL : Adresse email d'expédition par défaut
 * - BREVO_SENDER_NAME : Nom d'affichage de l'expéditeur par défaut
 */
export async function sendTransactionalEmail({
  to,
  subject,
  htmlContent,
  params,
  senderName,
  senderEmail,
  replyTo,
  textContent,
}: SendTransactionalEmailOptions): Promise<BrevoEmailResponse> {
  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
  const defaultSenderEmail = process.env.BREVO_SENDER_EMAIL || "contact@votre-domaine.com";
  const defaultSenderName = process.env.BREVO_SENDER_NAME || "NomDeVotreApp";

  if (!apiKey) {
    throw new Error("La variable d'environnement BREVO_API_KEY est manquante.");
  }

  // Normalisation du ou des destinataires au format Brevo [{ email, name }]
  const recipients: EmailRecipient[] = Array.isArray(to)
    ? to.map((recipient) => (typeof recipient === "string" ? { email: recipient } : recipient))
    : [typeof to === "string" ? { email: to } : to];

  const payload: Record<string, any> = {
    sender: {
      name: senderName || defaultSenderName,
      email: senderEmail || defaultSenderEmail,
    },
    to: recipients,
    subject,
    htmlContent,
  };

  if (params && Object.keys(params).length > 0) {
    payload.params = params;
  }

  if (replyTo) {
    payload.replyTo = replyTo;
  }

  if (textContent) {
    payload.textContent = textContent;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(`Erreur Brevo API (${response.status}): ${errorMessage}`);
  }

  return (await response.json()) as BrevoEmailResponse;
}
