/**
 * ==============================================================================
 * NaNaSwitch : Service de Prélèvement des Frais de Communication (SMS / Email)
 * ==============================================================================
 * 
 * Spécifications & Règle d'Or :
 * 1. Exécution strictly Asynchrone (Non-blocking) : Ne bloque JAMAIS la réponse 200 OK du Webhook Sebpay.
 * 2. Vérification préalable du solde de "Crédits de communication" du Vendeur dans Firestore.
 * 3. Si solde suffisant (ex: >= 25 FCFA pour SMS, >= 5 FCFA pour Email) :
 *    - Déclenche l'envoi du reçu via Twilio (SMS/WhatsApp) ou Brevo (Email).
 *    - Déduit instantanément le coût unitaire du message du solde du vendeur.
 * 4. Si solde insuffisant :
 *    - Journalise l'alerte sans faire échouer la commande.
 *    - Crée une notification incitative pour recharger les crédits.
 */

const https = require('https');
const admin = require('firebase-admin');

// Coûts unitaires par canal (paramétrables via variables d'environnement)
const SMS_UNIT_COST_FCFA = Number(process.env.COMMUNICATION_SMS_COST_FCFA || 25);
const EMAIL_UNIT_COST_FCFA = Number(process.env.COMMUNICATION_EMAIL_COST_FCFA || 5);

/**
 * Envoi d'un SMS via l'API REST officielle Twilio
 */
async function sendTwilioSms({ to, message }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[TWILIO SIMULATION] Clés Twilio absentes du .env. Envoi simulé à destination de ${to} : "${message.substring(0, 60)}..."`);
    return { success: true, simulated: true, messageId: `mock_twilio_${Date.now()}` };
  }

  const postData = new URLSearchParams({
    To: to.trim(),
    From: fromNumber.trim(),
    Body: message
  }).toString();

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  return new Promise((resolve) => {
    const req = https.request(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(raw);
            resolve({ success: true, messageId: data.sid });
          } catch {
            resolve({ success: true, raw });
          }
        } else {
          console.warn(`[TWILIO SMS WARNING ${res.statusCode}] :`, raw);
          resolve({ success: false, error: raw });
        }
      });
    });

    req.on('error', (err) => {
      console.warn('[TWILIO NETWORK ERROR] :', err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Envoi d'un Email de confirmation via l'API officielle Brevo (ex-Sendinblue)
 */
async function sendBrevoEmail({ toEmail, toName, subject, htmlContent }) {
  const brevoApiKey = process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY;

  if (!brevoApiKey) {
    console.log(`[BREVO SIMULATION] Clé BREVO_SMTP_KEY / BREVO_API_KEY absente. Envoi simulé vers ${toEmail} : "${subject}"`);
    return { success: true, simulated: true, messageId: `mock_brevo_${Date.now()}` };
  }

  const payload = JSON.stringify({
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'Wameet / Nanasore Live',
      email: process.env.BREVO_SENDER_EMAIL || 'notifications@wameet.africa'
    },
    to: [{ email: toEmail.trim(), name: toName || 'Client' }],
    subject,
    htmlContent
  });

  return new Promise((resolve) => {
    const req = https.request('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, raw });
        } else {
          console.warn(`[BREVO EMAIL WARNING ${res.statusCode}] :`, raw);
          resolve({ success: false, error: raw });
        }
      });
    });

    req.on('error', (err) => {
      console.warn('[BREVO NETWORK ERROR] :', err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Traitement Asynchrone Non-Bloquant post-paiement :
 * 1. Contrôle du solde de crédits communication du vendeur dans Firestore
 * 2. Déclenchement de l'envoi (SMS Twilio ou Email Brevo)
 * 3. Déduction instantanée du coût unitaire (25 FCFA / 5 FCFA)
 * 4. Traçabilité dans communication_logs
 */
async function processPostPaymentCommunication(db, params) {
  const {
    orderId,
    storeId = 'nanasore_central_hub',
    customerPhone,
    customerEmail,
    customerName = 'Client Wameet',
    totalAmount,
    productTitle = 'Commande en direct',
    storeName = 'Boutique Wameet'
  } = params;

  if (!db) {
    console.warn('[COMMUNICATION NOTICE] Firestore non initialisé, envoi direct sans débit de crédit.');
    return;
  }

  try {
    const walletRef = db.collection('wallets').doc(storeId);
    const walletSnap = await walletRef.get();

    const walletData = walletSnap.exists ? walletSnap.data() : {};
    // Solde de crédits de communication du vendeur (en F CFA)
    let communicationCredits = Number(walletData.communicationCredits ?? 100); // 100 crédits de bienvenue par défaut

    const nowServer = admin.firestore.FieldValue.serverTimestamp();
    let totalDeducted = 0;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Canal SMS / WhatsApp (Si téléphone fourni et solde >= 25 FCFA)
    // ──────────────────────────────────────────────────────────────────────────
    if (customerPhone && customerPhone.trim().length >= 8) {
      if (communicationCredits >= SMS_UNIT_COST_FCFA) {
        console.log(`[COMMUNICATION] Solde suffisant pour SMS vendeur ${storeId} (${communicationCredits} FCFA). Déclenchement Twilio...`);

        const smsText = `Wameet / ${storeName} : Reçu de commande #${orderId}. Montant : ${totalAmount} F CFA validé. Merci de votre confiance !`;
        const smsRes = await sendTwilioSms({ to: customerPhone, message: smsText });

        // Déduction instantanée des 25 FCFA
        await walletRef.set({
          communicationCredits: admin.firestore.FieldValue.increment(-SMS_UNIT_COST_FCFA),
          totalSmsSent: admin.firestore.FieldValue.increment(1),
          updatedAt: nowServer
        }, { merge: true });

        communicationCredits -= SMS_UNIT_COST_FCFA;
        totalDeducted += SMS_UNIT_COST_FCFA;

        // Journalisation
        await db.collection('communication_logs').add({
          storeId,
          orderId,
          channel: 'SMS',
          recipient: customerPhone,
          costFcfa: SMS_UNIT_COST_FCFA,
          status: smsRes.success ? 'DELIVERED' : 'FAILED',
          messageId: smsRes.messageId || null,
          simulated: Boolean(smsRes.simulated),
          createdAt: nowServer
        });

        console.log(`[COMMUNICATION] Reçu SMS expédié à ${customerPhone}. ${SMS_UNIT_COST_FCFA} FCFA prélevés du solde de ${storeId}.`);
      } else {
        console.warn(`[COMMUNICATION ALERT] Solde insuffisant pour SMS chez ${storeId} (Solde: ${communicationCredits} FCFA, Requis: ${SMS_UNIT_COST_FCFA} FCFA). SMS ignoré.`);

        await db.collection('communication_logs').add({
          storeId,
          orderId,
          channel: 'SMS',
          recipient: customerPhone,
          costFcfa: 0,
          status: 'SKIPPED_INSUFFICIENT_CREDITS',
          currentBalance: communicationCredits,
          requiredCost: SMS_UNIT_COST_FCFA,
          createdAt: nowServer
        });

        // Notification d'alerte pour le vendeur
        await db.collection('notifications').add({
          storeId,
          type: 'COMMUNICATION_CREDITS_LOW',
          title: 'Crédits SMS épuisés',
          message: `Le reçu SMS pour la commande #${orderId} n'a pas pu être envoyé au client. Rechargez vos crédits de communication.`,
          createdAt: nowServer,
          isRead: false
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Canal Email (Si email fourni et solde >= 5 FCFA)
    // ──────────────────────────────────────────────────────────────────────────
    if (customerEmail && customerEmail.includes('@')) {
      if (communicationCredits >= EMAIL_UNIT_COST_FCFA) {
        console.log(`[COMMUNICATION] Solde suffisant pour Email vendeur ${storeId} (${communicationCredits} FCFA). Déclenchement Brevo...`);

        const emailSubject = `Confirmation de votre commande #${orderId} - ${storeName}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #2563EB;">Commande #${orderId} Confirmée !</h2>
            <p>Bonjour <strong>${customerName}</strong>,</p>
            <p>Votre paiement en direct pour <strong>${productTitle}</strong> a été validé avec succès.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Montant payé :</strong> ${totalAmount} F CFA</p>
              <p style="margin: 5px 0 0 0;"><strong>Vendeur :</strong> ${storeName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            </div>
            <p style="color: #64748b; font-size: 12px;">Merci pour votre achat sur Wameet / Nanasore.</p>
          </div>
        `;

        const emailRes = await sendBrevoEmail({
          toEmail: customerEmail,
          toName: customerName,
          subject: emailSubject,
          htmlContent: emailHtml
        });

        // Déduction des 5 FCFA
        await walletRef.set({
          communicationCredits: admin.firestore.FieldValue.increment(-EMAIL_UNIT_COST_FCFA),
          totalEmailsSent: admin.firestore.FieldValue.increment(1),
          updatedAt: nowServer
        }, { merge: true });

        totalDeducted += EMAIL_UNIT_COST_FCFA;

        await db.collection('communication_logs').add({
          storeId,
          orderId,
          channel: 'EMAIL',
          recipient: customerEmail,
          costFcfa: EMAIL_UNIT_COST_FCFA,
          status: emailRes.success ? 'DELIVERED' : 'FAILED',
          simulated: Boolean(emailRes.simulated),
          createdAt: nowServer
        });
      }
    }

    return { success: true, totalDeducted };
  } catch (err) {
    console.error('[COMMUNICATION ASYNC ERROR] Erreur traitement communication :', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  processPostPaymentCommunication,
  sendTwilioSms,
  sendBrevoEmail,
  SMS_UNIT_COST_FCFA,
  EMAIL_UNIT_COST_FCFA
};
