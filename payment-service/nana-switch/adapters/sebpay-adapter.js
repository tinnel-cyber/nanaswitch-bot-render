/**
 * ==============================================================================
 * NaNaSwitch : Adapter Officiel Passerelle Sebpay (Bénin, Togo, CI, UEMOA)
 * ==============================================================================
 * 
 * - Communication avec Sebpay via IP Statique Fixie (IP Whitelisting)
 * - Validation cryptographique stricte par HMAC-SHA256 (Anti-fraude)
 * - Résolution multi-boutique `${storeId}___${orderId}`
 */

const crypto = require('crypto');
const PaymentGatewayAdapter = require('../gateway-adapter');
const {
  createSebpayCollection,
  createSebpayCheckoutSession,
  getSebpayCollection,
  getSebpayCheckoutSession,
  getSebpayConfigStatus
} = require('../../sebpay-client');

class SebpayAdapter extends PaymentGatewayAdapter {
  constructor() {
    super('sebpay', 'Sebpay Mobile Money & Cartes');
  }

  /**
   * 1. Initialise une demande de paiement auprès de l'API Sebpay Hosted Checkout Session
   * Utilise POST /api/v1/checkout/sessions pour une redirection fluide avec pré-remplissage
   */
  async initiatePayment(params) {
    const {
      orderId,
      amount,
      currency = 'XOF',
      customerPhone,
      phone,
      customer_phone,
      customerEmail,
      customerName,
      description = 'Commande Wameet / Nanasore Live',
      returnUrl,
      redirectUrl,
      redirect_url,
      callbackUrl,
      callback_url,
      storeId = 'nanasore_central_hub',
      country,
      countryCode,
      operator,
      otpCode,
      metadata = {}
    } = params;

    if (!orderId || !amount || amount <= 0) {
      throw new Error('[SEBPAY INITIATE ERROR] orderId et amount (> 0) sont obligatoires.');
    }

    // Référence composite standardisée pour le multi-tenant : "nanasore_${cleanShopName}___${orderId}"
    const rawShopName = params.shopName || params.storeName || storeId || 'boutique';
    const cleanShopName = String(rawShopName)
      .toLowerCase()
      .replace(/^nanasore_/, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'boutique';

    const externalReference = params.externalReference || params.external_reference || `nanasore_${cleanShopName}___${orderId}`;
    const resolvedPhone = customerPhone || customer_phone || phone || '';

    const effectiveRedirectUrl = redirectUrl || redirect_url || returnUrl || 'https://nsore.shop/checkout/return';
    const effectiveCallbackUrl = callbackUrl || callback_url || process.env.PAYMENT_CALLBACK_URL || 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/payment/webhook';

    console.log(`[SEBPAY ADAPTER] Création Hosted Checkout Session pour commande ${orderId} (${amount} ${currency})...`);

    const sessionRes = await createSebpayCheckoutSession({
      amount: Math.round(Number(amount)),
      currency: currency.toUpperCase(),
      orderId,
      storeId,
      tenantId: `nanasore_${cleanShopName}`,
      shopName: rawShopName,
      externalReference,
      redirect_url: effectiveRedirectUrl,
      redirectUrl: effectiveRedirectUrl,
      callback_url: effectiveCallbackUrl,
      callbackUrl: effectiveCallbackUrl,
      customer_phone: resolvedPhone,
      customerPhone: resolvedPhone,
      phone: resolvedPhone,
      customerEmail: customerEmail || params.customer_email || params.email || params.client_email || undefined,
      customerName: customerName || params.customer_name || params.name || params.client_name || 'Client',
      country: country || countryCode || 'BF',
      failover: Boolean(params.failover),
      customCredentials: params.customCredentials,
      metadata: {
        orderId,
        storeId,
        shopName: rawShopName,
        ...metadata
      }
    });

    const checkoutUrl = sessionRes.checkout_url || sessionRes.redirectUrl || sessionRes.paymentUrl;
    const checkoutSessionId = sessionRes.checkout_session_id || sessionRes.id || sessionRes.transaction_id;

    return {
      success: true,
      action: 'REDIRECT',
      redirectUrl: checkoutUrl,
      checkout_url: checkoutUrl,
      paymentUrl: checkoutUrl,
      provider_link: checkoutUrl,
      checkout_session_id: checkoutSessionId,
      id: checkoutSessionId,
      transactionId: checkoutSessionId,
      reference: externalReference,
      externalReference,
      orderId,
      storeId,
      amount: Math.round(Number(amount)),
      currency,
      failover: Boolean(params.failover),
      message: params.failover ? 'Redirection vers le canal sécurisé Sebpay' : 'Redirection vers la page de paiement sécurisée Sebpay',
      rawResponse: sessionRes
    };
  }

  /**
   * 2. Vérification cryptographique de la signature du Webhook Sebpay
   */
  async verifyWebhook(req) {
    const signature =
      req.headers['x-sebpay-signature'] ||
      req.headers['X-SebPay-Signature'] ||
      req.headers['x-webhook-signature'] ||
      req.headers['x-signature-sha256'] ||
      req.query?.signature;

    if (!signature) {
      return {
        isValid: false,
        errorMessage: 'Signature cryptographique X-SebPay-Signature absente des en-têtes.'
      };
    }

    const secretKey = process.env.SEBPAY_SECRET_KEY || process.env.SEBPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secretKey) {
      return {
        isValid: false,
        errorMessage: 'Clé secrète SEBPAY_SECRET_KEY (ou SEBPAY_WEBHOOK_SECRET) non configurée sur le serveur.'
      };
    }

    // Récupération du rawBody pour préserver la signature HMAC octet par octet
    const rawBuffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})), 'utf8');

    const cleanSignature = String(signature).trim().toLowerCase();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(rawBuffer).digest('hex').toLowerCase();

    const isValid = cleanSignature.length === calculatedHash.length
      && crypto.timingSafeEqual(Buffer.from(cleanSignature, 'utf8'), Buffer.from(calculatedHash, 'utf8'));

    if (!isValid) {
      return {
        isValid: false,
        errorMessage: 'Signature HMAC invalide. Rejet de la requête pour protection anti-fraude.'
      };
    }

    // Décodage du payload JSON
    let payload = {};
    try {
      payload = JSON.parse(rawBuffer.toString('utf8'));
    } catch {
      payload = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : {};
    }

    const txData = payload.data || payload;

    const transactionId = String(
      txData.transaction_id ||
      txData.transactionId ||
      payload.transaction_id ||
      payload.transactionId ||
      txData.id ||
      `tx_${Date.now()}`
    ).trim();

    const externalRef = String(
      txData.external_reference ||
      payload.external_reference ||
      txData.externalReference ||
      payload.externalReference ||
      txData.reference ||
      ''
    ).trim();

    // Décomposition multi-tenant storeId___orderId
    let storeId = 'nanasore_central_hub';
    let orderId = externalRef || transactionId;
    if (externalRef && externalRef.includes('___')) {
      const parts = externalRef.split('___');
      storeId = parts[0] || storeId;
      orderId = parts[1] || orderId;
    }

    const rawStatus = String(txData.status || payload.status || 'APPROVED').toUpperCase();
    const isPaid = ['APPROVED', 'SUCCESS', 'COMPLETED', 'PAID', 'VALIDATED', 'CONFIRMED', 'VALIDE', 'PAYÉ'].includes(rawStatus);

    const amount = Number(txData.amount || payload.amount || txData.price || 0);
    const currency = txData.currency || payload.currency || 'XOF';
    const customerPhone = txData.customer_phone || txData.client_phone || txData.phone || payload.customer_phone || '';
    const customerEmail = txData.client_email || txData.email || payload.client_email || '';

    return {
      isValid: true,
      transactionId,
      orderId,
      storeId,
      amount,
      currency,
      status: isPaid ? 'PAID' : 'FAILED',
      rawStatus,
      customerPhone,
      customerEmail,
      rawPayload: payload
    };
  }

  /**
   * 3. Vérification du statut d'une transaction auprès de Sebpay
   */
  async checkPaymentStatus(transactionId, externalRef) {
    try {
      // Privilégier systématiquement le transactionId officiel numérique Sebpay (ex: 26102609322822189215)
      // Ne JAMAIS interroger Sebpay avec une référence interne de commande (CHK-...)
      let refToQuery = transactionId;
      if (!refToQuery || String(refToQuery).startsWith('CHK-') || String(refToQuery).includes('___')) {
        refToQuery = (!externalRef?.startsWith('CHK-') && !externalRef?.includes('___')) ? externalRef : null;
      }

      if (!refToQuery) {
        return {
          status: 'PENDING',
          isPaid: false,
          amount: 0,
          currency: 'XOF',
          message: 'En attente de transactionId officiel opérateur'
        };
      }

      // Si l'identifiant correspond à une Hosted Checkout Session (cs_... ou non purement numérique)
      if (String(refToQuery).startsWith('cs_') || String(refToQuery).includes('session')) {
        const sessionRes = await getSebpayCheckoutSession(refToQuery);
        return {
          status: sessionRes.status,
          isPaid: sessionRes.isPaid,
          amount: sessionRes.amount,
          currency: sessionRes.currency,
          transaction_status: sessionRes.transaction_status,
          rawData: sessionRes
        };
      }

      const res = await getSebpayCollection(refToQuery);
      const data = res.data || res;
      const status = String(data.status || 'PENDING').toUpperCase();
      const isPaid = ['SUCCESS', 'COMPLETED', 'PAID', 'VALIDATED'].includes(status);
      return {
        status,
        isPaid,
        amount: Number(data.amount || 0),
        rawData: res
      };
    } catch (err) {
      console.warn(`[SEBPAY CHECK ERROR] Erreur vérification ${transactionId} :`, err.message);
      return {
        status: 'PENDING',
        isPaid: false,
        amount: 0,
        errorMessage: err.message
      };
    }
  }

  getConfigStatus() {
    return {
      ...super.getConfigStatus(),
      ...getSebpayConfigStatus()
    };
  }
}

module.exports = SebpayAdapter;
