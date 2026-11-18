/**
 * ==============================================================================
 * NaNaSwitch : Moteur de "Split" Financier Automatisé (ACID via runTransaction)
 * ==============================================================================
 * 
 * Spécifications & Règle d'Or :
 * 1. Récupère le montant total de la commande payée.
 * 2. Calcule la commission plateforme Wameet (ex: 5% par défaut).
 * 3. Utilise IMPÉRATIVEMENT db.runTransaction() pour garantir l'atomicité stricte :
 *    - Crédite le portefeuille du Vendeur (Montant total - Commission)
 *    - Crédite le portefeuille central Nanasore (Montant de la Commission)
 * 4. Gestion des rollbacks automatiques en cas de micro-coupure réseau.
 * 5. Idempotence stricte : empêche tout double split en cas de relivraison du Webhook.
 */

const admin = require('../firebase-admin-fallback');

// Taux de commission standard Wameet / Nanasore (5%)
const DEFAULT_PLATFORM_COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT || 5);
const CENTRAL_WALLET_ID = 'nanasore_central';

/**
 * Exécute le Split financier atomique ACID
 * 
 * @param {admin.firestore.Firestore} db - Instance Firestore Admin
 * @param {object} params
 * @param {string} params.orderId - Identifiant de la commande
 * @param {string} params.storeId - Identifiant de la boutique / vendeur
 * @param {number} params.totalAmount - Montant total payé en F CFA
 * @param {string} params.transactionId - Identifiant de transaction de l'opérateur (ex: Sebpay)
 * @param {string} params.gateway - Passerelle utilisée (ex: 'sebpay')
 * @param {number} [params.customCommissionPercent] - Taux négocié spécifique
 * @returns {Promise<{ success: boolean, totalAmount: number, vendorShare: number, platformCommission: number, commissionPercent: number }>}
 */
async function executeFinancialSplit(db, params) {
  const {
    orderId,
    storeId = 'nanasore_central_hub',
    totalAmount,
    transactionId = `tx_${Date.now()}`,
    gateway = 'sebpay',
    customCommissionPercent
  } = params;

  if (!db) {
    throw new Error('[SPLIT ENGINE ERROR] Instance Firestore (db) non fournie.');
  }

  const cleanTotal = Math.round(Number(totalAmount));
  if (isNaN(cleanTotal) || cleanTotal <= 0) {
    throw new Error(`[SPLIT ENGINE ERROR] Montant invalide pour le split : ${totalAmount}`);
  }

  // Taux de commission applicable (5% par défaut)
  const commissionPercent = typeof customCommissionPercent === 'number'
    ? customCommissionPercent
    : DEFAULT_PLATFORM_COMMISSION_PERCENT;

  // Calcul du split
  const platformCommission = Math.round(cleanTotal * (commissionPercent / 100));
  const vendorShare = cleanTotal - platformCommission;

  console.log(`[SPLIT ENGINE ACID] Début transaction pour commande #${orderId} (Total: ${cleanTotal} FCFA | Vendeur: ${vendorShare} FCFA | Nanasore 5%: ${platformCommission} FCFA)...`);

  const orderRef = db.collection('orders').doc(orderId);
  const vendorWalletRef = db.collection('wallets').doc(storeId);
  const centralWalletRef = db.collection('wallets').doc(CENTRAL_WALLET_ID);
  const splitAuditRef = db.collection('processed_splits').doc(orderId);

  // Exécution de la Transaction ACID Firestore
  return await db.runTransaction(async (transaction) => {
    // 1. LECTURES ATOMIQUES OBLIGATOIRES (Firestore exige toutes les lectures avant les écritures)
    const [orderSnap, vendorWalletSnap, centralWalletSnap, splitAuditSnap] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(vendorWalletRef),
      transaction.get(centralWalletRef),
      transaction.get(splitAuditRef)
    ]);

    // IDEMPOTENCE GUARD : Si cette commande a déjà été splitée, on annule pour éviter tout double crédit
    if (splitAuditSnap.exists && splitAuditSnap.data()?.completed === true) {
      console.log(`[SPLIT IDEMPOTENCE] Commande #${orderId} déjà splitée précédemment. Transaction abandonnée en douceur.`);
      return {
        success: true,
        alreadyProcessed: true,
        totalAmount: cleanTotal,
        vendorShare,
        platformCommission,
        commissionPercent
      };
    }

    // Solde actuel du portefeuille Vendeur
    const vendorData = vendorWalletSnap.exists ? vendorWalletSnap.data() : {};
    const currentVendorBalance = Number(vendorData.balance || 0);
    const currentVendorTotalEarned = Number(vendorData.totalEarned || 0);

    // Solde actuel du portefeuille Central Plateforme Nanasore
    const centralData = centralWalletSnap.exists ? centralWalletSnap.data() : {};
    const currentCentralBalance = Number(centralData.balance || 0);
    const currentCentralTotalCommissions = Number(centralData.totalCommissions || 0);

    const nowServer = admin.firestore.FieldValue.serverTimestamp();

    // 2. ÉCRITURES ATOMIQUES DANS LA TRANSACTION

    // A. Crédit du portefeuille du Vendeur (Montant total - Commission)
    const newVendorBalance = currentVendorBalance + vendorShare;
    const newVendorTotalEarned = currentVendorTotalEarned + vendorShare;

    transaction.set(vendorWalletRef, {
      storeId,
      balance: newVendorBalance,
      totalEarned: newVendorTotalEarned,
      currency: 'XOF',
      lastTransactionAt: nowServer,
      updatedAt: nowServer
    }, { merge: true });

    // B. Crédit du portefeuille Central Nanasore (Montant de la Commission 5%)
    const newCentralBalance = currentCentralBalance + platformCommission;
    const newCentralTotalCommissions = currentCentralTotalCommissions + platformCommission;

    transaction.set(centralWalletRef, {
      id: CENTRAL_WALLET_ID,
      name: 'Portefeuille Central Nanasore Platform',
      balance: newCentralBalance,
      totalCommissions: newCentralTotalCommissions,
      currency: 'XOF',
      lastTransactionAt: nowServer,
      updatedAt: nowServer
    }, { merge: true });

    // C. Verrouillage d'Idempotence du Split
    transaction.set(splitAuditRef, {
      orderId,
      storeId,
      transactionId,
      gateway,
      totalAmount: cleanTotal,
      vendorShare,
      platformCommission,
      commissionPercent,
      completed: true,
      splitAt: nowServer
    });

    // D. Mise à jour du statut de la commande à 'PAID' avec traçabilité du Split
    const splitDetails = {
      completed: true,
      totalAmount: cleanTotal,
      vendorShare,
      platformCommission,
      commissionPercent,
      vendorBalanceAfter: newVendorBalance,
      centralBalanceAfter: newCentralBalance,
      splitAt: nowServer
    };

    if (orderSnap.exists) {
      transaction.update(orderRef, {
        status: 'PAID',
        paymentStatus: 'PAID',
        isPaid: true,
        paidAt: nowServer,
        gateway,
        transactionId,
        split: splitDetails
      });
    } else {
      transaction.set(orderRef, {
        id: orderId,
        storeId,
        totalAmount: cleanTotal,
        amount: cleanTotal,
        status: 'PAID',
        paymentStatus: 'PAID',
        isPaid: true,
        paidAt: nowServer,
        gateway,
        transactionId,
        split: splitDetails,
        createdAt: nowServer
      }, { merge: true });
    }

    // E. Écriture dans le Grand Livre (Ledger / Double Entry Accounting)
    const vendorLedgerRef = db.collection('wallet_transactions').doc(`tx_vend_${orderId}_${Date.now()}`);
    transaction.set(vendorLedgerRef, {
      type: 'VENDOR_SALE_CREDIT',
      walletId: storeId,
      orderId,
      transactionId,
      gateway,
      amount: vendorShare,
      balanceBefore: currentVendorBalance,
      balanceAfter: newVendorBalance,
      currency: 'XOF',
      description: `Vente commande #${orderId} (Part vendeur après commission 5%)`,
      createdAt: nowServer
    });

    const centralLedgerRef = db.collection('wallet_transactions').doc(`tx_comm_${orderId}_${Date.now()}`);
    transaction.set(centralLedgerRef, {
      type: 'PLATFORM_COMMISSION_CREDIT',
      walletId: CENTRAL_WALLET_ID,
      sourceStoreId: storeId,
      orderId,
      transactionId,
      gateway,
      amount: platformCommission,
      balanceBefore: currentCentralBalance,
      balanceAfter: newCentralBalance,
      currency: 'XOF',
      description: `Commission plateforme Wameet 5% sur commande #${orderId}`,
      createdAt: nowServer
    });

    console.log(`[SPLIT ENGINE ACID] Succès du split pour commande #${orderId}. Vendeur crédité de ${vendorShare} FCFA, Plateforme créditée de ${platformCommission} FCFA.`);

    return {
      success: true,
      orderId,
      totalAmount: cleanTotal,
      vendorShare,
      platformCommission,
      commissionPercent,
      vendorBalance: newVendorBalance,
      centralBalance: newCentralBalance
    };
  });
}

module.exports = {
  executeFinancialSplit,
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  CENTRAL_WALLET_ID
};
