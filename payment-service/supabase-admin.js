/**
 * @file supabase-admin.js
 * @description Client Supabase serveur pour le micro-service de paiement NanaSwitch (Northflank).
 * Remplace définitivement firebase-admin / Firestore pour la persistance des transactions,
 * des wallets vendeurs et du split financier idempotent.
 */

let createClient = null;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch {
  createClient = null;
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://nqwlvkkxwvwhcwxpxtjq.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

let cachedClient = null;

function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;
  if (!createClient || !SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }
  cachedClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

module.exports = {
  getSupabaseAdmin,
  SUPABASE_URL,
  isSupabaseConfigured: Boolean(createClient && SUPABASE_URL && SUPABASE_KEY),
};
