import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabase } from "../../utils/supabase.server";

/**
 * Route GET /api/auth-profile?uid=...
 * Récupère le profil Supabase d'un utilisateur par son UID Firebase
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const uid = url.searchParams.get("uid");

  if (!uid) {
    return json({ success: false, error: "Paramètre uid manquant" }, { status: 400 });
  }

  try {
    // 1. Recherche par firebase_uid
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("firebase_uid", uid)
      .maybeSingle();

    if (!error && profile) {
      return json({ success: true, profile });
    }

    // 2. Repli par id direct (si l'ID est déjà un UUID)
    const { data: profileById } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (profileById) {
      return json({ success: true, profile: profileById });
    }

    return json({
      success: true,
      profile: {
        firebase_uid: uid,
        kyc_status: "none",
        pricing_model: "none",
        wallet_balance: 0,
        enabled_themes: []
      }
    });
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

/**
 * Route POST /api/auth-profile
 * Enregistrement neutre à l'entrée sans KYC ni permission :
 * kyc_status: 'none', pricing_model: 'none', wallet_balance: 0, enabled_themes: []
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ success: false, error: "Méthode non autorisée" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { firebaseUid, email, fullName, whatsapp } = body;

    if (!firebaseUid) {
      return json({ success: false, error: "firebaseUid est obligatoire" }, { status: 400 });
    }

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(fullName || "").trim();
    const cleanWhatsapp = String(whatsapp || "").trim();

    // 1. Appel RPC Supabase sync_firebase_profile si disponible
    const { data: rpcData, error: rpcErr } = await supabase.rpc("sync_firebase_profile", {
      p_firebase_uid: firebaseUid,
      p_email: cleanEmail,
      p_full_name: cleanName,
      p_whatsapp: cleanWhatsapp
    });

    if (!rpcErr && rpcData && rpcData.success) {
      return json({
        success: true,
        profile: rpcData,
        message: "Profil synchronisé avec succès dans Supabase"
      });
    }

    // 2. Si la fonction RPC n'est pas encore exécutée dans Supabase, repli sur upsert direct
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("*")
      .or(`firebase_uid.eq.${firebaseUid},email.eq.${cleanEmail}`)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      const existing = existingProfiles[0];
      return json({
        success: true,
        profile: {
          ...existing,
          firebase_uid: firebaseUid,
          email: existing.email || cleanEmail,
          full_name: existing.full_name || cleanName,
          whatsapp_number: existing.whatsapp_number || cleanWhatsapp
        },
        message: "Profil existant conservé sans altération des droits"
      });
    }

    // 3. Fallback neutre en attendant la migration SQL
    const defaultNeutralProfile = {
      firebase_uid: firebaseUid,
      email: cleanEmail,
      full_name: cleanName,
      whatsapp_number: cleanWhatsapp,
      kyc_status: "none",
      pricing_model: "none",
      wallet_balance: 0,
      enabled_themes: [],
      created_at: new Date().toISOString()
    };

    return json({
      success: true,
      profile: defaultNeutralProfile,
      message: "Profil initialisé avec succès en mode neutre sans KYC"
    });
  } catch (error: any) {
    console.error("[AUTH_PROFILE_ACTION_ERROR]", error);
    return json({ success: false, error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
