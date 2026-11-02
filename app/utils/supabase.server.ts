import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Les variables d'environnement SUPABASE_URL et SUPABASE_ANON_KEY sont manquantes dans votre fichier .env"
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Client Supabase côté serveur.
 * Si les clés ne sont pas encore renseignées dans le .env, il lance une erreur claire à l'usage.
 */
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
          throw new Error(
            "SUPABASE_URL ou SUPABASE_ANON_KEY n'est pas configuré dans votre fichier .env"
          );
        }
        const client = getSupabaseClient();
        return (client as any)[prop];
      },
    });
