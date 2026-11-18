/**
 * ==============================================================================
 * MOTEUR DE TARIFICATION HYBRIDE & FACTURATION API (PRICING ENGINE)
 * ==============================================================================
 * 
 * Modèle Hybride :
 * 1. Mode Marchands Agrégés (Commissions sur transactions avec marge nette +1.5%)
 * 2. Mode Développeurs / Clients Externes SaaS (0.02 XOF par requête API / Coupe-circuit 402)
 */

const { merchantService, DEFAULT_PRICING_MATRIX } = require('./merchant-service');

class NanaSwitchPricingEngine {
  constructor() {
    this.DEFAULT_REQUEST_COST_XOF = 0.02;
  }

  /**
   * Calcule le split financier et les frais pour un marchand agrégé
   * @param {object} params
   * @param {number} params.amount Montant brut de la commande
   * @param {string} [params.country='BF'] Code pays (BF, CI, SN, etc.)
   * @param {string} [params.operator='orange_bf'] Réseau opérateur
   * @param {object} [params.pricingMatrix] Matrice tarifaire optionnelle
   */
  calculateAggregatedFees(params) {
    const {
      amount,
      country = 'BF',
      operator = 'orange_bf',
      pricingMatrix = null
    } = params;

    const numAmount = Number(amount || 0);
    return merchantService.calculateTransactionFee(numAmount, country, operator, pricingMatrix);
  }

  /**
   * Crédite atomiquement le portefeuille du marchand (wallets/{tenantId})
   * en déduisant la commission plateforme
   * @param {admin.firestore.Firestore} db 
   * @param {string} tenantId Identifiant du marchand / boutique
   * @param {number} netAmount Montant net après commission
   * @param {string} [currency='XOF'] Devise
   */
  async creditMerchantWallet(db, tenantId, netAmount, currency = 'XOF') {
    if (!db || !tenantId) return null;

    try {
      const admin = require('../firebase-admin-fallback');
      const nowServer = admin.firestore.FieldValue.serverTimestamp();
      const walletRef = db.collection('wallets').doc(tenantId);

      const updateData = {
        tenantId,
        currency: currency.toUpperCase(),
        balance: admin.firestore.FieldValue.increment(netAmount),
        totalEarnings: admin.firestore.FieldValue.increment(netAmount),
        lastPaymentAt: nowServer,
        updatedAt: nowServer
      };

      await walletRef.set(updateData, { merge: true });
      console.log(`[PRICING ENGINE] Portefeuille crédité | Marchand: ${tenantId} | Montant Net: +${netAmount} ${currency}`);
      return updateData;
    } catch (err) {
      console.error('[PRICING ENGINE ERROR] Échec crédit portefeuille :', err.message);
      throw err;
    }
  }

  /**
   * Vérifie et applique le coupe-circuit de crédits pour les clients SaaS / BYOK
   * @param {admin.firestore.Firestore} db 
   * @param {object} merchant Données du compte marchand
   * @returns {{ allowed: boolean, remainingCredits: number, cost: number, errorResponse?: object }}
   */
  async verifyAndCheckApiCredits(db, merchant) {
    if (!merchant) {
      return { allowed: true, remainingCredits: 5000, cost: this.DEFAULT_REQUEST_COST_XOF };
    }

    const merchantId = merchant.merchant_id || merchant.id || 'm_live_bf_001';
    let credits = merchant.api_pricing_config?.api_credits_balance;

    // Si non présent dans l'objet en mémoire, lecture fraîche dans Firestore
    if (typeof credits !== 'number' && db) {
      try {
        const snap = await db.collection('merchants').doc(merchantId).get();
        if (snap.exists) {
          credits = snap.data()?.api_pricing_config?.api_credits_balance;
        }
      } catch (e) {
        console.warn('[PRICING ENGINE] Lecture crédits merchants :', e.message);
      }
    }

    // Fallback switch_wallets si configuré séparément
    if (typeof credits !== 'number' && db) {
      try {
        const walletSnap = await db.collection('switch_wallets').doc(merchantId).get();
        if (walletSnap.exists) {
          credits = walletSnap.data()?.credits;
        }
      } catch (e) {
        console.warn('[PRICING ENGINE] Lecture switch_wallets :', e.message);
      }
    }

    const resolvedCredits = typeof credits === 'number' ? credits : 5000;
    const autoBlock = merchant.api_pricing_config?.auto_block_on_zero !== false;
    const cost = merchant.api_pricing_config?.cost_per_request_xof || this.DEFAULT_REQUEST_COST_XOF;

    if (resolvedCredits <= 0 && autoBlock) {
      return {
        allowed: false,
        remainingCredits: 0,
        cost,
        errorResponse: {
          success: false,
          errorCode: '402_INSUFFICIENT_CLOUD_CREDITS',
          message: 'Coupe-circuit activé : Solde de crédits API épuisé (0 crédit restant). Veuillez recharger votre portefeuille dans NaNaSwitch Cloud.',
          remainingCredits: 0,
          costPerRequest: cost,
          merchantId
        }
      };
    }

    return {
      allowed: true,
      remainingCredits: resolvedCredits,
      cost
    };
  }

  /**
   * Débite atomiquement 1 requête (0.02 XOF) du compte client externe
   * @param {admin.firestore.Firestore} db 
   * @param {string} merchantId 
   * @param {object} logData 
   */
  async debitApiRequest(db, merchantId, logData = {}) {
    return merchantService.recordApiUsageAndDebit(db, {
      merchantId,
      orderId: logData.orderId,
      amount: logData.amount,
      currency: logData.currency,
      country: logData.country,
      gateway: logData.gateway,
      status: logData.status || 'SUCCESS',
      latencyMs: logData.latencyMs || 0
    });
  }
}

const pricingEngine = new NanaSwitchPricingEngine();

module.exports = {
  NanaSwitchPricingEngine,
  pricingEngine
};
