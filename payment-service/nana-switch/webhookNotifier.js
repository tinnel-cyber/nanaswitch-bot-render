/**
 * ==============================================================================
 * MODULE DE SÉCURITÉ & NOTIFICATION WEBHOOK SORTANT (HMAC-SHA256)
 * NANASWITCH CLOUD NODE - NANASORE TECHNOLOGIES
 * ==============================================================================
 * 
 * Spécifications :
 * 1. Secret Webhook : "ns_whsec_<random_bytes_32_hex>"
 * 2. Signature sortante : "x-nanaswitch-signature: t=<timestamp>,v1=<hmac_hash>"
 * 3. Algorithme : HMAC-SHA256 sur la chaîne `${timestamp}.${raw_payload}`
 * 4. Helper de vérification client avec protection contre les attaques par rejeu (fenêtre 300s)
 * 5. Traçabilité des envois dans Firestore (collection `webhook_deliveries`)
 */

const crypto = require('crypto');

/**
 * Génère une clé secrète de signature Webhook conforme au standard NanaSwitch
 * @returns {string} Format: "ns_whsec_<64_hex_chars>"
 */
function generateWebhookSecret() {
  return `ns_whsec_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Signe cryptographiquement un payload de webhook avec le secret du marchand
 * @param {object|string|Buffer} payload Données de l'événement
 * @param {string} secretKey Clé secrète Webhook (ns_whsec_...)
 * @param {number} [timestamp] Timestamp Unix en secondes (par défaut : maintenant)
 * @returns {{ signatureHeader: string, timestamp: number, hmac: string, serializedPayload: string }}
 */
function signWebhookPayload(payload, secretKey, timestamp = Math.floor(Date.now() / 1000)) {
  if (!secretKey) {
    throw new Error('[WEBHOOK SIGN] Clé secrète requise pour signer le webhook.');
  }

  const serializedPayload = typeof payload === 'string'
    ? payload
    : (Buffer.isBuffer(payload) ? payload.toString('utf8') : JSON.stringify(payload));

  const signedPayload = `${timestamp}.${serializedPayload}`;
  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload, 'utf8')
    .digest('hex')
    .toLowerCase();

  const signatureHeader = `t=${timestamp},v1=${hmac}`;

  return {
    signatureHeader,
    timestamp,
    hmac,
    serializedPayload
  };
}

/**
 * Helper de vérification cryptographique de la signature Webhook (côté client/SDK ou tests)
 * Compare à temps constant et protège contre les attaques par rejeu
 * 
 * @param {object} params
 * @param {string|Buffer|object} params.payload Corps brut reçu de la requête HTTP
 * @param {string} params.signatureHeader En-tête 'x-nanaswitch-signature' (t=...,v1=...)
 * @param {string} params.secretKey Clé secrète du marchand (ns_whsec_...)
 * @param {number} [params.toleranceSeconds=300] Fenêtre d'acceptation de l'horodatage en secondes
 * @returns {{ valid: boolean, reason: string|null, timestamp?: number, deltaSeconds?: number }}
 */
function verifyWebhookSignature({ payload, signatureHeader, secretKey, toleranceSeconds = 300 }) {
  if (!signatureHeader) {
    return { valid: false, reason: 'missing_signature' };
  }
  if (!secretKey) {
    return { valid: false, reason: 'missing_secret_key' };
  }

  // 1. Analyse des éléments de l'en-tête (t=<timestamp>,v1=<hmac>)
  const headerParts = String(signatureHeader).split(',');
  let timestamp = null;
  let receivedHmac = null;

  for (const part of headerParts) {
    const trimmed = part.trim();
    if (trimmed.startsWith('t=')) {
      timestamp = parseInt(trimmed.substring(2), 10);
    } else if (trimmed.startsWith('v1=')) {
      receivedHmac = trimmed.substring(3).trim().toLowerCase();
    }
  }

  if (!timestamp || isNaN(timestamp)) {
    return { valid: false, reason: 'invalid_timestamp_in_header' };
  }
  if (!receivedHmac) {
    return { valid: false, reason: 'invalid_v1_signature_in_header' };
  }

  // 2. Contrôle anti-rejeu (Timestamp tolerance)
  const now = Math.floor(Date.now() / 1000);
  const delta = Math.abs(now - timestamp);
  if (toleranceSeconds > 0 && delta > toleranceSeconds) {
    return {
      valid: false,
      reason: 'timestamp_expired',
      timestamp,
      deltaSeconds: delta
    };
  }

  // 3. Calcul de la signature attendue
  const rawString = typeof payload === 'string'
    ? payload
    : (Buffer.isBuffer(payload) ? payload.toString('utf8') : JSON.stringify(payload));

  const signedString = `${timestamp}.${rawString}`;
  const expectedHmac = crypto
    .createHmac('sha256', secretKey)
    .update(signedString, 'utf8')
    .digest('hex')
    .toLowerCase();

  // 4. Comparaison à temps constant via crypto.timingSafeEqual
  let isValid = false;
  try {
    const bufA = Buffer.from(receivedHmac, 'utf8');
    const bufB = Buffer.from(expectedHmac, 'utf8');
    if (bufA.length === bufB.length && bufA.length > 0) {
      isValid = crypto.timingSafeEqual(bufA, bufB);
    }
  } catch {
    isValid = false;
  }

  return {
    valid: isValid,
    reason: isValid ? null : 'signature_mismatch',
    timestamp,
    deltaSeconds: delta
  };
}

/**
 * Notifie le serveur d'un marchand de manière asynchrone et résiliente
 * Signe le payload avec le secret Webhook et journalise l'envoi
 * 
 * @param {admin.firestore.Firestore} db Instance Firestore
 * @param {object} params
 * @param {string} params.merchantId Identifiant unique du marchand (m_live_...)
 * @param {string} params.event Nom de l'événement (ex: 'payment.success', 'payment.failed')
 * @param {object} params.data Données de la transaction
 * @param {string} [params.orderId] Identifiant de commande
 * @param {string} [params.transactionId] Identifiant passerelle
 * @returns {Promise<{ sent: boolean, status: number|null, deliveryId: string, reason?: string }>}
 */
async function dispatchMerchantWebhook(db, { merchantId, event, data, orderId = null, transactionId = null }) {
  const deliveryId = `del_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const startTs = Date.now();

  if (!merchantId) {
    return { sent: false, deliveryId, reason: 'missing_merchant_id' };
  }

  let webhookConfig = null;

  // 1. Récupération de la configuration Webhook du marchand
  if (db) {
    try {
      const merchantSnap = await db.collection('merchants').doc(merchantId).get();
      if (merchantSnap.exists) {
        webhookConfig = merchantSnap.data()?.webhook_config;
      }
    } catch (err) {
      console.warn(`[WEBHOOK NOTIFIER] Erreur lecture merchant ${merchantId} :`, err.message);
    }
  }

  // Si le marchand n'a pas configuré d'URL ou désactivé les webhooks
  if (!webhookConfig || !webhookConfig.url || webhookConfig.is_active === false) {
    console.log(`[WEBHOOK NOTIFIER] Marchand ${merchantId} sans webhook actif configuré (envoi ignoré).`);
    return { sent: false, deliveryId, reason: 'webhook_not_configured_or_inactive' };
  }

  const webhookUrl = webhookConfig.url;
  const secretKey = webhookConfig.secret_key;

  if (!secretKey) {
    console.warn(`[WEBHOOK NOTIFIER] Marchand ${merchantId} n'a pas de secret_key configurée.`);
    return { sent: false, deliveryId, reason: 'missing_secret_key' };
  }

  // 2. Construction de l'enveloppe d'événement standardisée
  const eventPayload = {
    id: `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
    event,
    created_at: Math.floor(Date.now() / 1000),
    merchant_id: merchantId,
    data: {
      ...data,
      order_id: orderId || data.order_id || data.orderId,
      transaction_id: transactionId || data.transaction_id || data.transactionId
    }
  };

  // 3. Signature cryptographique HMAC-SHA256
  const { signatureHeader, serializedPayload } = signWebhookPayload(eventPayload, secretKey);

  console.log(`[WEBHOOK NOTIFIER] Envoi événement "${event}" vers ${webhookUrl} pour marchand [${merchantId}]...`);

  // 4. Transmission HTTP POST vers le serveur marchand (avec timeout de 10s)
  let statusCode = null;
  let responseBody = null;
  let isSuccess = false;
  let errorMessage = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NanaSwitch-Webhook/1.0 (+https://cloud.nanasore.com)',
        'x-nanaswitch-signature': signatureHeader,
        'x-nanaswitch-event': event,
        'x-merchant-id': merchantId
      },
      body: serializedPayload,
      signal: controller.signal
    });

    clearTimeout(timeout);
    statusCode = response.status;
    isSuccess = response.ok; // 200-299

    const text = await response.text().catch(() => '');
    responseBody = text ? text.slice(0, 500) : null;
    console.log(`[WEBHOOK NOTIFIER] Réponse marchand HTTP ${statusCode} en ${Date.now() - startTs}ms`);
  } catch (netErr) {
    errorMessage = netErr.message;
    console.warn(`[WEBHOOK NOTIFIER] Échec transmission vers ${webhookUrl} :`, netErr.message);
  }

  const latencyMs = Date.now() - startTs;

  // 5. Journalisation d'audit dans Firestore (collection `webhook_deliveries`)
  if (db) {
    try {
      const nowServer = new Date().toISOString();
      await db.collection('webhook_deliveries').doc(deliveryId).set({
        delivery_id: deliveryId,
        merchant_id: merchantId,
        event,
        url: webhookUrl,
        order_id: orderId || data.order_id || null,
        transaction_id: transactionId || data.transaction_id || null,
        status_code: statusCode,
        success: isSuccess,
        latency_ms: latencyMs,
        response_body: responseBody,
        error: errorMessage,
        created_at: nowServer
      }, { merge: true });
    } catch (fbErr) {
      console.warn('[WEBHOOK NOTIFIER] Échec journalisation livraison :', fbErr.message);
    }
  }

  return {
    sent: isSuccess,
    status: statusCode,
    deliveryId,
    latencyMs,
    error: errorMessage
  };
}

module.exports = {
  generateWebhookSecret,
  signWebhookPayload,
  verifyWebhookSignature,
  dispatchMerchantWebhook
};
