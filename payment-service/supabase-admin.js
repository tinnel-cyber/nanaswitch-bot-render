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

async function checkSupabaseHealth() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('orders').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

function sanitizeRedirectUrl(rawUrl, fallbackUrl = null) {
  if (!rawUrl || typeof rawUrl !== 'string') return fallbackUrl;
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallbackUrl;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallbackUrl;
    const allowedHostsEnv = process.env.ALLOWED_REDIRECT_HOSTS || 'nsore.shop,nanasore.com,code.run,onrender.com,localhost,127.0.0.1';
    const allowedDomains = allowedHostsEnv.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = allowedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));
    return isAllowed ? parsed.toString() : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

module.exports = {
  getSupabaseAdmin,
  checkSupabaseHealth,
  sanitizeRedirectUrl,
  SUPABASE_URL,
  isSupabaseConfigured: Boolean(createClient && SUPABASE_URL && SUPABASE_SERVICE_KEY),
};
