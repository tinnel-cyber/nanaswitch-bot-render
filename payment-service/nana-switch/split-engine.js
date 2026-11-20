/**
 * ==============================================================================
 * NaNaSwitch : Moteur de "Split" Financier Automatisé — 100 % SUPABASE
 * ==============================================================================
 * - Calcule la commission plateforme Nanasore (5 % par défaut)
 * - Idempotence stricte via clé primaire `order_id` sur `nanaswitch_splits`
 * - Crédite le portefeuille vendeur et le portefeuille central `nanasore_central`
 *   dans `nanaswitch_wallets`
 * - Met à jour le statut de la transaction dans `nanaswitch_transactions`
 */

const { getSupabaseAdmin } = require('../supabase-admin');

const DEFAULT_PLATFORM_COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT || 5);
const CENTRAL_WALLET_ID = 'nanasore_central';

async function creditWalletSupabase(supabase, storeId, amountToAdd, currency = 'XOF') {
  const { data: existing } = await supabase
    .from('nanaswitch_wallets')
    .select('balance, total_earned')
    .eq('store_id', storeId)
    .maybeSingle();

  const currentBalance = Number(existing?.balance || 0);
  const currentEarned = Number(existing?.total_earned || 0);

  await supabase.from('nanaswitch_wallets').upsert({
    store_id: storeId,
    balance: currentBalance + amountToAdd,
    total_earned: currentEarned + amountToAdd,
    currency,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Exécute le Split financier idempotent sur Supabase
 */
async function executeFinancialSplit(_legacyDb, params) {
  const {
    orderId,
    storeId = 'nanasore_central_hub',
    totalAmount,
    transactionId = `tx_${Date.now()}`,
    gateway = 'saspay',
    currency = 'XOF',
    customCommissionPercent,
  } = params;

  const cleanTotal = Math.round(Number(totalAmount));
  if (isNaN(cleanTotal) || cleanTotal <= 0) {
    throw new Error(`[SPLIT ENGINE ERROR] Montant invalide pour le split : ${totalAmount}`);
  }

  const commissionPercent =
    typeof customCommissionPercent === 'number'
      ? customCommissionPercent
      : DEFAULT_PLATFORM_COMMISSION_PERCENT;

  const platformCommission = Math.round(cleanTotal * (commissionPercent / 100));
  const vendorShare = cleanTotal - platformCommission;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn(
      `[SPLIT ENGINE SUPABASE] Client Supabase non configuré (vérifiez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY). Split calculé uniquement pour #${orderId}.`
    );
    return {
      success: true,
      alreadyProcessed: false,
      persisted: false,
      orderId,
      storeId,
      transactionId,
      gateway,
      totalAmount: cleanTotal,
      vendorShare,
      platformCommission,
      commissionPercent,
    };
  }

  // 1. Contrôle d'idempotence strict : empêche tout double crédit sur relance webhook
  const { data: existingSplit } = await supabase
    .from('nanaswitch_splits')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existingSplit) {
    console.log(`[SPLIT ENGINE SUPABASE] Split déjà traité pour commande #${orderId} (idempotence respectée).`);
    return {
      success: true,
      alreadyProcessed: true,
      persisted: true,
      orderId,
      storeId: existingSplit.store_id,
      transactionId: existingSplit.transaction_id,
      gateway: existingSplit.gateway,
      totalAmount: Number(existingSplit.total_amount),
      vendorShare: Number(existingSplit.vendor_share),
      platformCommission: Number(existingSplit.platform_commission),
      commissionPercent: Number(existingSplit.commission_percent),
    };
  }

  // 2. Insertion du verrou d'audit `nanaswitch_splits` (clé primaire order_id)
  const { error: insertErr } = await supabase.from('nanaswitch_splits').insert({
    order_id: orderId,
    store_id: storeId,
    transaction_id: transactionId,
    gateway,
    total_amount: cleanTotal,
    vendor_share: vendorShare,
    platform_commission: platformCommission,
    commission_percent: commissionPercent,
    currency,
    processed_at: new Date().toISOString(),
  });

  if (insertErr) {
    // En cas de course critique simultanée (violation PK 23505), traiter comme idempotent
    if (String(insertErr.code) === '23505') {
      return {
        success: true,
        alreadyProcessed: true,
        persisted: true,
        orderId,
        storeId,
        transactionId,
        gateway,
        totalAmount: cleanTotal,
        vendorShare,
        platformCommission,
        commissionPercent,
      };
    }
    throw new Error(`[SPLIT ENGINE SUPABASE ERROR] ${insertErr.message}`);
  }

  // 3. Crédit des portefeuilles (Vendeur + Central Nanasore) et mise à jour de la transaction
  await Promise.all([
    creditWalletSupabase(supabase, storeId, vendorShare, currency),
    platformCommission > 0
      ? creditWalletSupabase(supabase, CENTRAL_WALLET_ID, platformCommission, currency)
      : Promise.resolve(),
    supabase
      .from('nanaswitch_transactions')
      .upsert({
        order_id: orderId,
        store_id: storeId,
        amount: cleanTotal,
        currency,
        gateway,
        provider: String(gateway).toUpperCase(),
        transaction_id: transactionId,
        status: 'PAID',
        updated_at: new Date().toISOString(),
      }),
  ]);

  console.log(
    `[SPLIT ENGINE SUPABASE] Split validé #${orderId} | Total: ${cleanTotal} ${currency} | Vendeur (${storeId}): +${vendorShare} | Plateforme (${commissionPercent}%): +${platformCommission}`
  );

  return {
    success: true,
    alreadyProcessed: false,
    persisted: true,
    orderId,
    storeId,
    transactionId,
    gateway,
    totalAmount: cleanTotal,
    vendorShare,
    platformCommission,
    commissionPercent,
  };
}

module.exports = {
  executeFinancialSplit,
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  CENTRAL_WALLET_ID,
};
