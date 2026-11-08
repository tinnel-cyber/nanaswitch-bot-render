/**
 * Client Supabase Factory pour Cloudflare Workers & Agents Serverless
 * 
 * Configuré sans persistance de session (stateless) et avec injection
 * dynamique du JWT utilisateur pour l'application des règles RLS (Row Level Security).
 */

import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://wsxnznobeefrsoicjqte.supabase.co';
const defaultAnonKey = 'sb_publishable_bUKrC8_WEvMbKwE5lUAZ2w_LGg2F5Ro';

const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
  defaultUrl;

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
  defaultAnonKey;

const isBrowser = typeof window !== 'undefined';

/**
 * Client Supabase standard réactif (Realtime & Auth)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export function getSupabaseClient() {
  return supabase;
}


/**
 * Instancie un client Supabase adapté à l'environnement serverless de Cloudflare Workers.
 *
 * @param {Record<string, any>} env - Variables d'environnement Cloudflare Worker (env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
 * @param {string|null} [jwtToken=null] - Token JWT de l'utilisateur authentifié (format: "Bearer <token>" ou "<token>")
 * @param {object} [customOptions={}] - Options additionnelles optionnelles passées au SDK Supabase
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createSupabaseClient(env, jwtToken = null, customOptions = {}) {
  const supabaseUrl = env?.SUPABASE_URL;
  const supabaseAnonKey = env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variables manquantes: SUPABASE_URL et SUPABASE_ANON_KEY doivent être définies dans l\'environnement Cloudflare Worker.'
    );
  }

  // Préparation des en-têtes globaux pour l'injection du JWT
  const headers = {};
  if (jwtToken) {
    const cleanToken = jwtToken.replace(/^Bearer\s+/i, '').trim();
    if (cleanToken) {
      headers.Authorization = `Bearer ${cleanToken}`;
    }
  }

  // Fusion des headers globaux
  const globalHeaders = {
    ...headers,
    ...(customOptions.global?.headers || {}),
  };

  return createClient(supabaseUrl, supabaseAnonKey, {
    // Configuration critique requise pour les runtimes serverless / Cloudflare Workers :
    // Évite tout accès au localStorage/sessionStorage ou gestionnaire de cookies local
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: globalHeaders,
    },
    ...customOptions,
  });
}

/**
 * Instancie un client Supabase avec la clé de rôle de service (Service Role Key).
 * Réservé exclusivement aux tâches administratives d'arrière-plan ou à l'agent
 * nécessitant un accès complet outrepassant la RLS (ex: webhooks, cron jobs, indexation).
 *
 * @param {Record<string, any>} env - Variables d'environnement Cloudflare Worker
 * @param {object} [customOptions={}] - Options additionnelles
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createSupabaseAdminClient(env, customOptions = {}) {
  const supabaseUrl = env?.SUPABASE_URL;
  const serviceRoleKey = env?.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variables manquantes: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises pour le client administrateur.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...customOptions,
  });
}

/**
 * Extrait commodément le token JWT d'une requête HTTP standard (en-tête Authorization).
 *
 * @param {Request} request - Requête Fetch Cloudflare Worker
 * @returns {string|null} Le token JWT extrait ou null
 */
export function extractBearerToken(request) {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
