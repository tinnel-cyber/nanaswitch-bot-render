import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  getUserContextualProfile,
  evaluateModuleAccess,
  processPayPerUseConsumption,
  submitAccountOpening,
  injectModuleToFreeTheme,
  PAY_PER_USE_MODULE_KEYS,
  FREE_MODULE_KEYS,
} from "../../services/contextualLicensing.server";
import { CANONICAL_APP_REGISTRY } from "../../../src/config/appRegistry";

/**
 * Route API Remix : app/routes/api/account-activation.ts
 * Gestion centralisée des licences contextuelles, des tunnels KYC et du portefeuille.
 */

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || url.searchParams.get("user_id") || "anonymous-user";
    const requestedModule = url.searchParams.get("module");

    const profile = await getUserContextualProfile(userId);

    // Si un module particulier est demandé
    if (requestedModule) {
      const evaluation = evaluateModuleAccess(profile, requestedModule);
      return json({
        success: true,
        userId,
        profile,
        evaluation,
      });
    }

    // Évaluation globale de tous les modules du registre canonique
    const modulesEvaluations: Record<string, any> = {};
    for (const mod of CANONICAL_APP_REGISTRY) {
      modulesEvaluations[mod.id] = evaluateModuleAccess(profile, mod.id, mod.type);
    }

    return json({
      success: true,
      userId,
      profile,
      evaluations: modulesEvaluations,
      payPerUseModules: PAY_PER_USE_MODULE_KEYS,
      freeModules: FREE_MODULE_KEYS,
    });
  } catch (error: any) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    let body: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      if (typeof body.kycData === "string") {
        try {
          body.kycData = JSON.parse(body.kycData);
        } catch {
          body.kycData = {};
        }
      }
    }

    const intent = body.intent || "submit_kyc";
    const userId = String(body.userId || body.user_id || "").trim();

    if (!userId) {
      return json({ success: false, error: "Identifiant utilisateur (userId) manquant" }, { status: 400 });
    }

    // =========================================================================
    // CAS 1 : Consommation de module paiement à l'usage (Portefeuille sans KYC)
    // =========================================================================
    if (intent === "pay_per_use" || intent === "wallet_deduct") {
      let moduleKey = String(body.moduleKey || body.module_key || "").trim();
      let amount = Number(body.amount || 0);

      // Tarifs automatiques pour achat à l'usage
      if (moduleKey === "extra-product" && amount <= 0) {
        amount = 1000; // 1 000 FCFA par produit supplémentaire
      } else if (moduleKey === "sales-funnel" && amount <= 0) {
        amount = 5000; // 5 000 FCFA par tunnel de vente
      }

      if (!moduleKey || amount <= 0) {
        return json(
          { success: false, error: "Paramètres moduleKey et amount obligatoires et positifs" },
          { status: 400 }
        );
      }

      const result = await processPayPerUseConsumption({
        userId,
        moduleKey,
        amount,
        description: body.description || `Achat Pay-As-You-Go ${moduleKey}`,
      });

      return json(result);
    }

    if (intent === "buy_extra_product") {
      const result = await processPayPerUseConsumption({
        userId,
        moduleKey: "extra-product",
        amount: 1000,
        description: "Activation d'un produit supplémentaire au catalogue (Pay-As-You-Go)",
      });
      return json(result);
    }

    if (intent === "buy_sales_funnel") {
      const result = await processPayPerUseConsumption({
        userId,
        moduleKey: "sales-funnel",
        amount: 5000,
        description: "Achat d'un tunnel de vente supplémentaire haute conversion (Pay-As-You-Go)",
      });
      return json(result);
    }

    // =========================================================================
    // CAS 2 : Achat à la carte et injection dans le Thème Gratuit
    // =========================================================================
    if (intent === "inject_carte_module" || intent === "buy_a_la_carte") {
      const moduleKey = String(body.moduleKey || body.module_key || "").trim();
      const price = Number(body.price || 0);

      const result = await injectModuleToFreeTheme({
        userId,
        moduleKey,
        price,
      });

      return json(result);
    }

    // =========================================================================
    // CAS 3 : Soumission Tunnel d'Ouverture de Compte & KYC
    // Branche Commission (KYC léger) vs Branche Abonnement (KYC entreprise)
    // =========================================================================
    if (intent === "submit_kyc" || intent === "open_account") {
      let pricingModel = body.pricingModel || body.pricing_model;
      const accountType = body.accountType || body.account_type;
      if (!pricingModel && accountType) {
        pricingModel = accountType === "entreprise" ? "subscription" : "commission";
      }
      const subscriptionOption = body.subscriptionOption || body.subscription_option || null;
      const kycData = body.kycData || {};
      const organizationId = body.organizationId || body.organization_id || null;

      if (!pricingModel || !["commission", "subscription", "pay_per_use"].includes(pricingModel)) {
        return json(
          { success: false, error: "Type de compte ou modèle invalide ('particulier', 'entreprise')" },
          { status: 400 }
        );
      }

      // Validation des champs selon la branche
      if (pricingModel === "commission") {
        // Formulaire KYC Léger :
        // Nom prenom, Pièce d'identité, photo capture, Email, numero de paiement, Domaine d'activite, description
        if (!kycData.fullName || !kycData.email || !kycData.paymentNumber) {
          return json(
            {
              success: false,
              error: "Veuillez renseigner votre nom, email et numéro de paiement pour le KYC léger",
            },
            { status: 400 }
          );
        }
      } else if (pricingModel === "subscription") {
        // KYC Entreprise : Exige nom de l'entreprise et documents légaux
        if (!kycData.companyName) {
          return json(
            {
              success: false,
              error: "Le nom de l'entreprise est obligatoire pour la souscription avec KYC Entreprise",
            },
            { status: 400 }
          );
        }
      }

      const result = await submitAccountOpening({
        userId,
        pricingModel,
        subscriptionOption,
        kycData,
        organizationId,
      });

      return json(result);
    }

    return json({ success: false, error: `Action inconnue: ${intent}` }, { status: 400 });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
