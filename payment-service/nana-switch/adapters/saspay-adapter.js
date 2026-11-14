/**
 * ==============================================================================
 * NaNaSwitch : Adapter Officiel Passerelle SasPay (Multi-Pays & Failover)
 * ==============================================================================
 * 
 * - Communication avec SasPay (24 pays africains : UEMOA, CEMAC, EAC, CEDEAO)
 * - Encaissement direct ou via proxy selon la stratégie réseau configurée
 * - Validation cryptographique stricte par HMAC-SHA256 & Timestamp (anti-rejeu)
 * - Compatible avec l'orchestrateur de failover NaNaSwitch
 */

const PaymentGatewayAdapter = require('../gateway-adapter');
const {
  createSaspayPayin,
  verifySaspayPayment,
  verifySaspayWebhookSignature,
  getSaspayConfigStatus
} = require('../../saspay-client');

class SaspayAdapter extends PaymentGatewayAdapter {
  constructor() {
    super('saspay', 'SasPay Mobile Money & Payouts');
  }

  /**
   * 1. Initialise une demande de paiement (Pay-In) auprès de l'API SasPay
   */
  async initiatePayment(params) {
    const {
      orderId,
      amount,
      currency = 'XOF',
      customerPhone,
      phone,
      customerEmail = 'client@wameet.africa',
      customerName = 'Client Wameet',
      description = 'Commande Wameet / Nanasore Live',
      returnUrl,
      callbackUrl,
      storeId = 'nanasore_central_hub',
      country = 'BF',
      countryCode,
      operator,
      network,
      metadata = {}
    } = params;

    if (!orderId || !amount || Number(amount) <= 0) {
      throw new Error('[SASPAY INITIATE ERROR] orderId et amount (> 0) sont obligatoires.');
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
    const resolvedPhone = customerPhone || phone || '+22670000000';
    const resolvedCountry = (country || countryCode || 'BF').toUpperCase();

    const saspayPayload = {
      tenantId: `nanasore_${cleanShopName}`,
      shopName: rawShopName,
      storeName: rawShopName,
      orderId,
      externalReference,
      amount: Math.round(Number(amount)),
      currency: currency.toUpperCase(),
      country: resolvedCountry,
      phone: resolvedPhone,
      customerPhone: resolvedPhone,
      customerName,
      customerEmail,
      operator,
      network,
      otp: params.otp || params.otpCode || params.otp_code,
      otpCode: params.otp || params.otpCode || params.otp_code,
      description: description.substring(0, 120),
      returnUrl: returnUrl || 'https://nanasore.web.app/orders',
      callbackUrl: callbackUrl || process.env.PAYMENT_CALLBACK_URL || 'https://nana-payment-api.onrender.com/webhook/saspay',
      customCredentials: params.customCredentials,
      customPayload: {
        metadata: {
          storeId,
          orderId,
          ...metadata
        }
      }
    };

    console.log(`[SASPAY ADAPTER] Initiation paiement pour commande ${orderId} (${amount} ${currency}) via SasPay...`);
    const saspayRes = await createSaspayPayin(saspayPayload);

    const paymentUrl =
      saspayRes.checkout_url ||
      saspayRes.redirectUrl ||
      saspayRes.url ||
      saspayRes.data?.checkout_url ||
      `https://pay.saspay.me/checkout/${saspayRes.transaction_id || orderId}`;

    const transactionId = String(
      saspayRes.transaction_id ||
      saspayRes.id ||
      saspayRes.data?.id ||
      `sas_${Date.now()}`
    );

    return {
      success: true,
      paymentUrl,
      checkout_url: paymentUrl,
      redirectUrl: paymentUrl,
      provider_link: paymentUrl,
      action: saspayRes.action || (saspayRes.checkout_url ? 'redirect' : 'ussd_push'),
      transactionId,
      reference: externalReference,
      orderId,
      storeId,
      amount: Math.round(Number(amount)),
      currency: currency.toUpperCase(),
      rawResponse: saspayRes
    };
  }

  /**
   * 2. Vérification cryptographique de la signature du Webhook SasPay
   */
  async verifyWebhook(req) {
    const signature =
      req.headers['x-saspay-signature'] ||
      req.headers['X-Saspay-Signature'] ||
      req.headers['x-webhook-signature'] ||
      req.headers['x-signature-sha256'] ||
      req.query?.signature;

    const timestamp =
      req.headers['x-webhook-timestamp'] ||
      req.headers['x-saspay-timestamp'] ||
      req.headers['x-timestamp'];

    if (!signature) {
      return {
        isValid: false,
        errorMessage: 'Signature cryptographique X-Saspay-Signature absente des en-têtes.'
      };
    }

    const secretKey = process.env.SASPAY_WEBHOOK_SECRET;
    if (!secretKey) {
      return {
        isValid: false,
        errorMessage: 'Clé secrète SASPAY_WEBHOOK_SECRET non configurée sur le serveur.'
      };
    }

    const rawBuffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})), 'utf8');

    const sigResult = verifySaspayWebhookSignature({
      rawBody: rawBuffer,
      signature,
      timestamp,
      secret: secretKey
    });

    if (!sigResult.valid) {
      return {
        isValid: false,
        errorMessage: `Signature HMAC SasPay invalide : ${sigResult.reason}`
      };
    }

    let payload = {};
    try {
      payload = JSON.parse(rawBuffer.toString('utf8'));
    } catch {
      payload = req.body || {};
    }

    const data = payload.data || payload;
    const txId = data.id || payload.id || `sas_${Date.now()}`;
    const externalRef = data.external_reference || payload.external_reference || '';
    const parts = externalRef.split('___');
    const storeId = parts.length > 1 ? parts[0] : 'nanasore_central_hub';
    const orderId = parts.length > 1 ? parts[1] : (data.order_id || externalRef);

    const statusStr = String(data.status || payload.status || '').toUpperCase();
    const isPaid = statusStr === 'SUCCESS' || statusStr === 'COMPLETED';

    return {
      isValid: true,
      transactionId: txId,
      orderId,
      storeId,
      amount: Number(data.amount || payload.amount || 0),
      currency: data.currency || payload.currency || 'XOF',
      status: isPaid ? 'PAID' : (statusStr === 'FAILED' ? 'FAILED' : 'PENDING'),
      rawPayload: payload
    };
  }

  /**
   * 3. Vérification du statut d'une transaction SasPay
   */
  async checkPaymentStatus(transactionId, externalRef) {
    const res = await verifySaspayPayment(transactionId || externalRef);
    return {
      status: res.status,
      isPaid: res.isPaid,
      amount: res.amount,
      currency: res.currency,
      rawData: res.data
    };
  }

  /**
   * Diagnostic de configuration
   */
  getConfigStatus() {
    return {
      id: this.id,
      name: this.name,
      ...getSaspayConfigStatus()
    };
  }
}

module.exports = SaspayAdapter;
