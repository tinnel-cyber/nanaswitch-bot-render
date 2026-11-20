/**
 * ==============================================================================
 * NaNaSwitch : Moteur de "Split" Financier Automatisé — 100 % SUPABASE (ACID)
 * ==============================================================================
 * - Calcule la commission plateforme Nanasore (5 % par défaut)
 * - Exécute le split de manière atomique via RPC PostgreSQL `execute_nanaswitch_split_atomic`
 *   (idempotence stricte + incrément atomique des soldes sans race condition)
 * - Échoue explicitement si Supabase Service Role n'est pas configuré (fail-closed)
 */

const { getSupabaseAdmin } = require('../supabase-admin');

const DEFAULT_PLATFORM_COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT || 5);
const CENTRAL_WALLET_ID = 'nanasore_central';

/**
 * Exécute le Split financier idempotent et atomique sur Supabase
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
    throw new Error(
      `[SPLIT ENGINE ERROR] Client Supabase Service Role non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis) pour #${orderId}.`
    );
  }

  // Exécution ACID en base via RPC PostgreSQL atomique (aucune race condition sur les soldes)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('execute_nanaswitch_split_atomic', {
    p_order_id: String(orderId),
    p_store_id: String(storeId),
    p_transaction_id: String(transactionId),
    p_gateway: String(gateway),
    p_total_amount: cleanTotal,
    p_vendor_share: vendorShare,
    p_platform_commission: platformCommission,
    p_commission_percent: commissionPercent,
    p_currency: String(currency),
    p_central_wallet_id: CENTRAL_WALLET_ID,
  });

  if (rpcError) {
    throw new Error(`[SPLIT ENGINE ATOMIC RPC ERROR] ${rpcError.message}`);
  }

  if (!rpcResult || rpcResult.success !== true) {
    throw new Error(`[SPLIT ENGINE ATOMIC RPC ERROR] Réponse invalide pour #${orderId}`);
  }

  if (rpcResult.alreadyProcessed) {
    console.log(`[SPLIT ENGINE SUPABASE] Split déjà traité pour commande #${orderId} (idempotence ACID respectée).`);
  } else {
    console.log(
      `[SPLIT ENGINE SUPABASE] Split atomique validé #${orderId} | Total: ${cleanTotal} ${currency} | Vendeur (${storeId}): +${vendorShare} | Plateforme (${commissionPercent}%): +${platformCommission}`
    );
  }

  return rpcResult;
}

module.exports = {
  executeFinancialSplit,
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  CENTRAL_WALLET_ID,
};
