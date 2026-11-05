import { supabase } from "../utils/supabase.server";

export interface LandingPricingPlanItem {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  monthlyPriceFCFA: number;
  annualPriceFCFA: number;
  euroEquivalent?: string;
  badge?: string;
  isPopular?: boolean;
  features: string[];
  ctaText?: string;
  limits?: Record<string, any>;
}

export interface LandingPricingConfigPayload {
  title?: string;
  subtitle?: string;
  zeroCommissionBanner?: {
    title: string;
    description: string;
    badge: string;
  };
  plans: LandingPricingPlanItem[];
  updatedBy?: string;
}

export const CANONICAL_FREE_19_FEATURES: string[] = [
  "Caisse tactile POS de comptoir ou portable avec synchronisation Cloud",
  "Boutique en ligne nsore.shop offerte",
  "Publication Marketplace & catalogue public",
  "Assistant IA décisionnel de base",
  "Impression tickets thermiques (Bluetooth/USB)",
  "Carnet d'ardoises dettes & créances clients",
  "Formulaires devis & contact instantané",
  "Catalogue LMS public pour formations",
  "Centre d'aide & documentation intégrée",
  "Tableau de bord central unifié caméléon",
  "Simulateur de marge & rentabilité",
  "Simulateur de trésorerie (Cashflow)",
  "Extension Nanaswitch Cloud",
  "Revente & affiliation services partenaires",
  "Souscription gratuite au service de livraison pendant le live shopping",
  "Export tunnels formats compatibles",
  "Gestion & consultation multi-devises",
  "Notifications email de confirmation",
  "0% de commission sur vos encaissements"
];

export const CANONICAL_DEFAULT_PRICING: LandingPricingConfigPayload = {
  title: "Des tarifs simples, transparents et sans surprise.",
  subtitle: "Choisissez le modèle adapté à votre activité : abonnement fixe 0% commission, formule créateur à la performance, ou services à l'acte sans engagement.",
  zeroCommissionBanner: {
    title: "0% de commission. 100% de vos revenus vous appartiennent.",
    description: "Contrairement aux plateformes qui ponctionnent entre 5% et 15% sur chaque vente, Nanasore ne prélève aucun centime sur votre chiffre d'affaires. Vous ne payez qu'un abonnement mensuel transparent.",
    badge: "Zéro Frais Cachés"
  },
  plans: [
    {
      id: "free",
      name: "Plan Zéro",
      subtitle: "Gratuit / Acquisition",
      description: "Démarrez et vendez sans frais ni carte bancaire. 19 outils essentiels inclus pour le commerce physique et l'initiation e-learning.",
      monthlyPriceFCFA: 0,
      annualPriceFCFA: 0,
      euroEquivalent: "100% Gratuit à vie • Aucune carte requise",
      badge: "Freemium",
      isPopular: false,
      features: CANONICAL_FREE_19_FEATURES,
      ctaText: "Commencer Gratuitement (0F)"
    },
    {
      id: "starter",
      name: "Plan Pro",
      subtitle: "Boutique & Formateur Pro",
      description: "La formule tout-en-un pour les commerces actifs et les formateurs indépendants voulant encaisser sans aucune limite.",
      monthlyPriceFCFA: 15000,
      annualPriceFCFA: 12500,
      euroEquivalent: "Soit 15 000 FCFA / mois (150 000 / an)",
      badge: "Le Choix Recommandé",
      isPopular: true,
      features: [
        "Caisse POS & Produits illimités",
        "10 Tunnels de vente (Option à l'usage)",
        "Jusqu'à 50 cours hébergés & élèves illimités",
        "Gestion jusqu'à 5 caissiers (PIN)",
        "Module CV Pro inclus en illimité",
        "Passerelles directes à 0% de commission",
        "Certificats officiels sécurisés QR Code"
      ],
      ctaText: "Choisir le Plan Pro"
    },
    {
      id: "pro",
      name: "Plan Business",
      subtitle: "Multi-Boutiques & Campus",
      description: "Solution complète pour commerces en réseau, équipes multi-caissiers et académies avec plusieurs instructeurs.",
      monthlyPriceFCFA: 30000,
      annualPriceFCFA: 25000,
      euroEquivalent: "Soit 30 000 FCFA / mois (300 000 / an)",
      badge: "Croissance & Équipe",
      isPopular: false,
      features: [
        "Multi-points de vente (jusqu'à 20 caissiers)",
        "Stocks multi-magasins synchronisés",
        "Pixels publicitaires Meta & TikTok intégrés",
        "CRM marketing & relances de paniers",
        "Gestion multi-formateurs & cohortes d'élèves",
        "Assistance prioritaire WhatsApp 7j/7"
      ],
      ctaText: "Choisir Plan Business"
    },
    {
      id: "elite",
      name: "Plan Enterprise",
      subtitle: "Franchises & Marque Blanche",
      description: "Pour réseaux de distribution, universités privées et grandes enseignes exigeant une autonomie souveraine absolue.",
      monthlyPriceFCFA: 60000,
      annualPriceFCFA: 50000,
      euroEquivalent: "Soit 60 000 FCFA / mois (600 000 / an)",
      badge: "Marque Blanche 100%",
      isPopular: false,
      features: [
        "Marque Blanche totale (Zéro mention NaNa)",
        "Votre propre nom de domaine personnalisé",
        "Nombre de caisses & campus illimité",
        "CV Pro & attestations d'entreprise illimités",
        "Accès complet aux webhooks & API souveraines",
        "Chargé de compte dédié & SLA garanti 99.9%"
      ],
      ctaText: "Choisir Enterprise"
    }
  ]
};

/**
 * Récupère la configuration des tarifs Landing Page depuis Supabase
 */
export async function getLandingPricingFromSupabase(): Promise<LandingPricingConfigPayload> {
  try {
    // 1. Essai sur la table dédiée landing_pricing_config
    const { data: dedicated, error: dedErr } = await supabase
      .from("landing_pricing_config")
      .select("*")
      .eq("id", "current")
      .maybeSingle();

    if (!dedErr && dedicated && dedicated.plans) {
      return sanitizePricingPayload({
        title: dedicated.title,
        subtitle: dedicated.subtitle,
        zeroCommissionBanner: dedicated.zero_commission_banner,
        plans: dedicated.plans,
        updatedBy: dedicated.updated_by
      });
    }

    // 2. Si la table landing_pricing_config n'existe pas encore, repli sur app_registry (clé système)
    const { data: appData, error: appErr } = await supabase
      .from("app_registry")
      .select("description")
      .eq("key", "system_landing_pricing_config")
      .maybeSingle();

    if (!appErr && appData?.description) {
      const parsed = JSON.parse(appData.description);
      if (parsed && Array.isArray(parsed.plans)) {
        return sanitizePricingPayload(parsed);
      }
    }
  } catch (err) {
    console.warn("[SUPABASE LANDING PRICING READ WARNING]", err);
  }

  // 3. Fallback sur la configuration canonique par défaut
  return CANONICAL_DEFAULT_PRICING;
}

/**
 * Enregistre et publie la configuration des tarifs Landing Page dans Supabase
 */
export async function saveLandingPricingToSupabase(
  payload: LandingPricingConfigPayload,
  authorName?: string
): Promise<{ success: boolean; data?: LandingPricingConfigPayload; error?: string }> {
  const sanitized = sanitizePricingPayload(payload);
  const author = authorName || payload.updatedBy || "Super-Admin";

  try {
    // 1. Sauvegarde dans landing_pricing_config si la table existe
    const { error: dedErr } = await supabase
      .from("landing_pricing_config")
      .upsert(
        {
          id: "current",
          title: sanitized.title,
          subtitle: sanitized.subtitle,
          zero_commission_banner: sanitized.zeroCommissionBanner,
          plans: sanitized.plans,
          updated_by: author,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      );

    if (!dedErr) {
      return { success: true, data: sanitized };
    }

    // 2. Si erreur de table (PGRST205), sauvegarde dans app_registry comme enregistrement système
    console.info("[SUPABASE] Table landing_pricing_config non trouvée, enregistrement dans app_registry...");
    const jsonString = JSON.stringify({ ...sanitized, updatedBy: author, updatedAt: Date.now() });

    const { error: appErr } = await supabase
      .from("app_registry")
      .upsert(
        {
          key: "system_landing_pricing_config",
          name: "Configuration Tarifs Landing Page",
          description: jsonString,
          category: "Configuration Système",
          is_public: true
        },
        { onConflict: "key" }
      );

    if (!appErr) {
      return { success: true, data: sanitized };
    }

    return { success: false, error: appErr.message };
  } catch (err: any) {
    console.error("[SUPABASE LANDING PRICING WRITE ERROR]", err);
    return { success: false, error: err?.message || "Erreur d'enregistrement Supabase" };
  }
}

/**
 * Sanctuarise la liste des 19 modules pour le Plan Gratuit et valide les plans
 */
function sanitizePricingPayload(payload: Partial<LandingPricingConfigPayload>): LandingPricingConfigPayload {
  const rawPlans = Array.isArray(payload.plans) && payload.plans.length > 0
    ? payload.plans
    : CANONICAL_DEFAULT_PRICING.plans;

  const sanitizedPlans = rawPlans.map((p) => {
    // Si c'est le Plan Gratuit, sanctuariser impérativement les 19 fonctionnalités officielles
    if (p.id === "free") {
      return {
        ...p,
        monthlyPriceFCFA: 0,
        annualPriceFCFA: 0,
        features: CANONICAL_FREE_19_FEATURES
      };
    }
    return p;
  });

  // Garantir que le Plan Gratuit est toujours présent en 1ère position
  if (!sanitizedPlans.some((p) => p.id === "free")) {
    const freePlan = CANONICAL_DEFAULT_PRICING.plans.find((p) => p.id === "free")!;
    sanitizedPlans.unshift(freePlan);
  }

  return {
    title: payload.title || CANONICAL_DEFAULT_PRICING.title,
    subtitle: payload.subtitle || CANONICAL_DEFAULT_PRICING.subtitle,
    zeroCommissionBanner: payload.zeroCommissionBanner || CANONICAL_DEFAULT_PRICING.zeroCommissionBanner,
    plans: sanitizedPlans,
    updatedBy: payload.updatedBy || "Super-Admin"
  };
}
