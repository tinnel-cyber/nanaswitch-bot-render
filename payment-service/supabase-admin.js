/**
 * @file supabase-admin.js
 * @description Client Supabase serveur (Service Role uniquement) pour le micro-service de paiement NanaSwitch.
 * Remplace définitivement firebase-admin / Firestore pour la persistance des transactions,
 * des wallets vendeurs, des marchands et du split financier idempotent atomique.
 */

let createClient = null;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch {
  createClient = null;
}

// URL unifiée avec src/lib/supabase.ts et server.ts (surchargeable via SUPABASE_URL)
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://wsxnznobeefrsoicjqte.supabase.co';

// Exige strictement une clé Service Role / Secret côté serveur (jamais de fallback anon silencieux)
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';

let cachedClient = null;

function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;
  if (!createClient || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return null;
  }
  cachedClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

module.exports = {
  getSupabaseAdmin,
  SUPABASE_URL,
  isSupabaseConfigured: Boolean(createClient && SUPABASE_URL && SUPABASE_SERVICE_KEY),
};
