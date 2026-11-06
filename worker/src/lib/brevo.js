/**
 * Module Brevo (Sendinblue) Transactional Email (SMTP API v3)
 * Optimisé pour Cloudflare Workers à l'Edge (via fetch natif sans dépendances lourdes).
 */

const BREVO_API_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Envoie un email transactionnel via l'API Brevo v3 (SMTP).
 *
 * @param {Record<string, any>} env - Variables d'environnement du Worker
 * @param {object} payload - Paramètres du courriel
 * @param {Array<{email: string, name?: string}>|{email: string, name?: string}} payload.to - Destinataire(s)
 * @param {string} payload.subject - Objet du courriel
 * @param {string} payload.htmlContent - Contenu au format HTML
 * @param {string} [payload.textContent] - Contenu au format texte brut de repli
 * @param {{name?: string, email?: string}} [payload.sender] - Expéditeur personnalisé (repli sur env.BREVO_SENDER_*)
 * @param {{name?: string, email: string}} [payload.replyTo] - Adresse de réponse personnalisée
 * @param {string[]} [payload.tags] - Balises de suivi Brevo
 * @param {Record<string, any>} [payload.params] - Variables dynamiques du template Brevo
 * @returns {Promise<{messageId: string, status: number}>}
 */
export async function sendTransactionalEmail(env, {
  to,
  subject,
  htmlContent,
  textContent,
  sender,
  replyTo,
  tags = ['nanasore-worker'],
  params = {},
}) {
  const apiKey = env?.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('La variable BREVO_API_KEY est requise pour envoyer des emails.');
  }

  // Normalisation du ou des destinataires
  const recipients = Array.isArray(to) ? to : [to];
  const formattedRecipients = recipients
    .filter(Boolean)
    .map(dest => {
      if (typeof dest === 'string') {
        return { email: dest.trim() };
      }
      return {
        email: dest.email.trim(),
        name: dest.name ? dest.name.trim() : undefined,
      };
    });

  if (formattedRecipients.length === 0 || !formattedRecipients[0].email) {
    throw new Error('Au moins un destinataire valide (avec champ email) doit être spécifié.');
  }

  // Expéditeur par défaut : "Nanasore Team"
  const defaultSender = {
    name: env?.BREVO_SENDER_NAME || 'Nanasore Team',
    email: env?.BREVO_SENDER_EMAIL || 'contact@nanasore.com',
  };

  const finalSender = {
    name: sender?.name || defaultSender.name,
    email: sender?.email || defaultSender.email,
  };

  const bodyPayload = {
    sender: finalSender,
    to: formattedRecipients,
    subject: subject || 'Notification Nanasore',
    htmlContent: htmlContent || '<p>Notification automatique</p>',
    ...(textContent ? { textContent } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(tags?.length ? { tags } : {}),
    ...(Object.keys(params).length > 0 ? { params } : {}),
  };

  const response = await fetch(BREVO_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorDetail = responseData?.message || responseData?.code || response.statusText;
    throw new Error(`Échec de l'envoi d'email Brevo (${response.status}): ${errorDetail}`);
  }

  return {
    messageId: responseData?.messageId || 'sent',
    status: response.status,
    data: responseData,
  };
}

/**
 * Envoie un email de bienvenue à un utilisateur nouvellement inscrit.
 */
export async function sendWelcomeEmail(env, { email, fullName }) {
  const name = fullName || 'Chère / Cher utilisateur';
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .logo { font-size: 24px; font-weight: 700; color: #4f46e5; margin-bottom: 20px; }
        .button { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
        .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Nanasore</div>
        <h2>Bienvenue sur Nanasore, ${name} !</h2>
        <p>Votre compte a été initialisé avec succès et votre profil a été configuré de manière sécurisée.</p>
        <p>Vous avez maintenant accès aux services de notre plateforme et aux capacités de nos agents intelligents.</p>
        <a href="https://nanasore.com" class="button">Accéder à mon espace</a>
        <div class="footer">
          Cet email a été envoyé par <strong>Nanasore Team</strong> via l'infrastructure sécurisée Cloudflare & Brevo.<br>
          Pour toute question, contactez notre équipe de support.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendTransactionalEmail(env, {
    to: { email, name: fullName },
    subject: 'Bienvenue sur Nanasore !',
    htmlContent: html,
    textContent: `Bienvenue ${name} ! Votre compte et profil Nanasore sont désormais actifs.`,
    tags: ['welcome-email', 'auth-trigger'],
  });
}

/**
 * Envoie un email de notification déclenché par l'agent ou le système.
 */
export async function sendAgentNotification(env, { email, title, message, actionUrl, actionText }) {
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 24px; margin: 0; }
        .card { max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
        .badge { display: inline-block; background: #0284c7; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
        .button { display: inline-block; background-color: #38bdf8; color: #0f172a !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 24px; }
        .footer { font-size: 12px; color: #64748b; margin-top: 32px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Agent Nanasore</span>
        <h2 style="color: #ffffff; margin-top: 0;">${title}</h2>
        <div style="line-height: 1.6; color: #cbd5e1;">${message}</div>
        ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText || 'Consulter'}</a>` : ''}
        <div class="footer">
          Notification générée par l'agent Nanasore — Expéditeur vérifié : <strong>Nanasore Team</strong>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendTransactionalEmail(env, {
    to: { email },
    subject: `[Nanasore Agent] ${title}`,
    htmlContent: html,
    textContent: `${title}\n\n${message}\n\n${actionUrl || ''}`,
    tags: ['agent-notification'],
  });
}
