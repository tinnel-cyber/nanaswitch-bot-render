import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultUrl = 'https://wsxnznobeefrsoicjqte.supabase.co';
const defaultAnonKey = 'sb_publishable_bUKrC8_WEvMbKwE5lUAZ2w_LGg2F5Ro';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export function getSupabaseClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Crée un client Supabase scopé avec le jeton JWT Bearer de l'utilisateur connecté
 * afin que les politiques RLS PostgreSQL (auth.uid()) fonctionnent même sans clé service_role.
 */
export function getSupabaseClientForToken(token?: string): SupabaseClient {
  const cleanToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
  const isServiceRole =
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== defaultAnonKey &&
    !String(process.env.SUPABASE_SERVICE_ROLE_KEY).startsWith('sb_publishable_');

  if (!cleanToken || isServiceRole) {
    return supabase;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    },
  });
}

/**
 * Client Supabase côté serveur robuste avec fallback automatique.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});


