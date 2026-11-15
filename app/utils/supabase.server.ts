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
 * Client Supabase côté serveur robuste avec fallback automatique.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

