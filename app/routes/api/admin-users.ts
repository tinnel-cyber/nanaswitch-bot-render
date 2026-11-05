import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabase } from "../../utils/supabase.server";

/**
 * Route GET /api/admin-users
 * Permet au Super Admin de consulter la vue SQL admin_user_overview
 * pour filtrer et superviser les parcours utilisateurs (Usage Ponctuel, Commission, Abonnement).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const filterParcours = url.searchParams.get("parcours");

    let query = supabase
      .from("admin_user_overview")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterParcours) {
      query = query.eq("parcours_actif", filterParcours);
    }

    const { data, error } = await query;

    if (error) {
      // Repli gracieux sur profiles si la vue admin_user_overview est en cours d'application
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, email, full_name, wallet_balance, kyc_status, pricing_model, created_at");

      if (pErr) {
        return json({ success: false, error: pErr.message }, { status: 500 });
      }

      const mapped = (profiles || []).map((p: any) => ({
        user_id: p.id,
        email: p.email,
        full_name: p.full_name,
        wallet_balance: p.wallet_balance || 0,
        kyc_status: p.kyc_status || 'none',
        pricing_model: p.pricing_model || 'none',
        created_at: p.created_at,
        parcours_actif: p.kyc_status === 'none' && (p.pricing_model === 'none' || p.pricing_model === 'pay_per_use')
          ? 'Usage Ponctuel / Gratuit'
          : p.pricing_model === 'commission'
          ? 'Branche Commission (Pay-As-You-Go)'
          : p.pricing_model === 'subscription'
          ? 'Branche Abonnement'
          : 'Nouveau Compte'
      }));

      return json({ success: true, users: mapped, source: "profiles_fallback" });
    }

    return json({ success: true, users: data || [], source: "admin_user_overview" });
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}
