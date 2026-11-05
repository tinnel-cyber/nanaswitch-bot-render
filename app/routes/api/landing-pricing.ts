import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  getLandingPricingFromSupabase,
  saveLandingPricingToSupabase,
  LandingPricingConfigPayload
} from "../../services/landingPricing.server";

/**
 * Route GET /api/landing-pricing :
 * Retourne la configuration des tarifs Landing Page publiée dans Supabase.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const config = await getLandingPricingFromSupabase();
    return json({
      success: true,
      pricingSection: config
    });
  } catch (error: any) {
    console.error("[API LANDING PRICING GET ERROR]", error);
    return json(
      { success: false, error: error?.message || "Erreur de lecture Supabase" },
      { status: 500 }
    );
  }
}

/**
 * Route POST /api/landing-pricing :
 * Enregistre et publie la configuration des modules et tarifs de la Landing Page dans Supabase.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ success: false, error: "Méthode non autorisée" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const pricingSection: LandingPricingConfigPayload = body.pricingSection || body;
    const author = body.author || body.updatedBy || "Super-Admin";

    if (!pricingSection || !Array.isArray(pricingSection.plans)) {
      return json(
        { success: false, error: "Format invalide : 'pricingSection.plans' doit être un tableau" },
        { status: 400 }
      );
    }

    const result = await saveLandingPricingToSupabase(pricingSection, author);

    if (!result.success) {
      return json({ success: false, error: result.error }, { status: 500 });
    }

    return json({
      success: true,
      message: "Tarifs de la landing page publiés avec succès dans Supabase !",
      pricingSection: result.data
    });
  } catch (error: any) {
    console.error("[API LANDING PRICING POST ERROR]", error);
    return json(
      { success: false, error: error?.message || "Erreur lors de la publication" },
      { status: 500 }
    );
  }
}
