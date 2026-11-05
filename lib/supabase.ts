import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseClient(useServiceRole: boolean = false): SupabaseClient {
  const url = supabaseUrl;
  const key = useServiceRole && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey;

  if (!url || !key) {
    console.warn("⚠️ SUPABASE_URL ou SUPABASE_ANON_KEY n'est pas configuré dans les variables d'environnement.");
  }

  return createClient(url || "https://placeholder.supabase.co", key || "placeholder-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Instance Supabase standard côté serveur (App Router)
 */
export const supabase = getSupabaseClient();

/**
 * UIDs et Emails des Super Admins officiels Nanasore
 */
export const KNOWN_SUPERADMIN_UIDS = [
  'Jz9wo3HN4YXdgTnYtDJFsNvnJKv1', // Administrateur Officiel pousbila36
  'rgLiIgFUFjQLfjzPlmSY9jy6mBE3'  // Administrateur Officiel pousbila04
];

export const KNOWN_SUPERADMIN_EMAILS = [
  'pousbila36@gmail.com',
  'pousbila04@gmail.com',
  'contact@nanasore.com',
  'admin@nanasore.com'
];

/**
 * Synchronisation de l'UID Firebase vers la table Supabase `profiles`
 * Enregistrement neutre à l'entrée sans KYC ni permission :
 * kyc_status: 'none', pricing_model: 'none', wallet_balance: 0, enabled_themes: []
 */
export async function syncFirebaseProfileToSupabase({
  firebaseUid,
  email,
  fullName,
  whatsapp,
}: {
  firebaseUid: string;
  email?: string;
  fullName?: string;
  whatsapp?: string;
}) {
  if (!firebaseUid) {
    throw new Error("firebaseUid est requis pour la synchronisation");
  }

  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(fullName || "").trim();
  const cleanWhatsapp = String(whatsapp || "").trim();

  // 1. Tenter l'appel RPC Postgres `sync_firebase_profile`
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("sync_firebase_profile", {
      p_firebase_uid: firebaseUid,
      p_email: cleanEmail,
      p_full_name: cleanName,
      p_whatsapp: cleanWhatsapp,
    });

    if (!rpcErr && rpcData) {
      return { success: true, profile: rpcData };
    }
  } catch (err) {
    console.warn("[SUPABASE_RPC_WARN] RPC non disponible, repli sur upsert direct:", err);
  }

  // 2. Repli direct avec vérification d'existant
  try {
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("*")
      .or(`firebase_uid.eq.${firebaseUid},email.eq.${cleanEmail}`)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      const existing = existingProfiles[0];
      return {
        success: true,
        profile: {
          ...existing,
          firebase_uid: firebaseUid,
          email: existing.email || cleanEmail,
          full_name: existing.full_name || cleanName,
          whatsapp_number: existing.whatsapp_number || cleanWhatsapp,
        },
      };
    }

    // 3. Fallback neutre sans altération de privilèges
    const defaultNeutralProfile = {
      firebase_uid: firebaseUid,
      email: cleanEmail,
      full_name: cleanName,
      whatsapp_number: cleanWhatsapp,
      kyc_status: "none",
      pricing_model: "none",
      wallet_balance: 0,
      enabled_themes: [],
      created_at: new Date().toISOString(),
    };

    const { data: created, error: insertErr } = await supabase
      .from("profiles")
      .insert(defaultNeutralProfile)
      .select("*")
      .maybeSingle();

    if (!insertErr && created) {
      return { success: true, profile: created };
    }

    return { success: true, profile: defaultNeutralProfile };
  } catch (error: any) {
    console.error("[SUPABASE_SYNC_ERROR]", error);
    return { success: false, error: error?.message || "Erreur lors de la synchronisation Supabase" };
  }
}

/**
 * Vérification des droits Super Admin via la table Supabase `super_admins` et les listes officielles
 */
export async function checkIsSuperAdmin(userIdOrUid?: string | null, email?: string | null): Promise<boolean> {
  if (!userIdOrUid && !email) return false;

  // 1. Vérification liste blanche immédiate
  if (userIdOrUid && KNOWN_SUPERADMIN_UIDS.includes(userIdOrUid)) return true;
  if (email && KNOWN_SUPERADMIN_EMAILS.includes(email.toLowerCase())) return true;

  // 2. Vérification dans la table Supabase `super_admins`
  try {
    if (userIdOrUid) {
      // Test direct par user_id UUID ou recherche via profiles
      const { data: superAdminRecord } = await supabase
        .from("super_admins")
        .select("user_id, role")
        .eq("user_id", userIdOrUid)
        .maybeSingle();

      if (superAdminRecord) return true;

      // Recherche du user_id profile correspondant au firebase_uid
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("firebase_uid", userIdOrUid)
        .maybeSingle();

      if (profile?.id) {
        const { data: adminRecord } = await supabase
          .from("super_admins")
          .select("user_id")
          .eq("user_id", profile.id)
          .maybeSingle();

        if (adminRecord) return true;
      }
    }
  } catch (err) {
    console.warn("[CHECK_SUPER_ADMIN_WARN] Erreur vérification table super_admins:", err);
  }

  return false;
}

/**
 * Récupère le statut du compte utilisateur pour la gestion du mode `read_only`
 */
export async function getUserAccountStatus(userIdOrUid?: string | null): Promise<{
  isAccountOpened: boolean;
  isReadOnly: boolean;
  kycStatus: string;
  pricingModel: string;
}> {
  if (!userIdOrUid) {
    return {
      isAccountOpened: false,
      isReadOnly: true,
      kycStatus: 'none',
      pricingModel: 'none',
    };
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("kyc_status, pricing_model")
      .or(`id.eq.${userIdOrUid},firebase_uid.eq.${userIdOrUid}`)
      .maybeSingle();

    if (!profile) {
      return {
        isAccountOpened: false,
        isReadOnly: true,
        kycStatus: 'none',
        pricingModel: 'none',
      };
    }

    const isAccountOpened = profile.kyc_status !== 'none' || (profile.pricing_model !== 'none' && profile.pricing_model !== 'pay_per_use');

    return {
      isAccountOpened,
      isReadOnly: !isAccountOpened,
      kycStatus: profile.kyc_status || 'none',
      pricingModel: profile.pricing_model || 'none',
    };
  } catch (error) {
    return {
      isAccountOpened: false,
      isReadOnly: true,
      kycStatus: 'none',
      pricingModel: 'none',
    };
  }
}
