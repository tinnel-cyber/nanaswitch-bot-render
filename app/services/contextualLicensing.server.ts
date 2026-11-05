/**
 * ============================================================================
 * SERVICE SERVEUR : SYSTÈME DE CONTRÔLE D'ACCÈS ET LICENCE CONTEXTUELLE
 * ============================================================================
 * 
 * Implémente la matrice d'habilitation Nanasore selon :
 * 1. Accès Général Sans KYC : Modules gratuits & Modules paiement à l'usage (CV, vidéos pub, signatures)
 * 2. Mode Lecture / Preview : Tous les modules accessibles en lecture si compte non activé
 * 3. Tunnels d'ouverture de compte & KYC (Commission vs Abonnement)
 * 4. Gestion du portefeuille (Wallet) sans KYC pour les consommations à l'usage
 */

import { supabase } from '../utils/supabase.server';
import type { Profile, AccountActivation, PricingModelTier, KycStatusTier, SubscriptionOptionTier } from '../types/supabase';

// 1. Modules & Services à Paiement à l'Usage (débitent le solde du Wallet sans KYC)
export const PAY_PER_USE_MODULE_KEYS = [
  'cvpro',
  'nanagenerator',
  'docusign',
  'extra-product',
  'sales-funnel',
  'ultimate-funnel',
  'modular-funnel'
] as const;

// Tarifs officiels Pay-As-You-Go déductibles du Portefeuille (Wallet) sans KYC
export const PAY_PER_USE_RATES = {
  EXTRA_PRODUCT: { code: 'extra-product', name: 'Produit supplémentaire actif (au-delà des 3 gratuits)', price: 1000.0, unit: 'produit' },
  SALES_FUNNEL: { code: 'sales-funnel', name: 'Tunnel de vente modulaire haute conversion', price: 5000.0, unit: 'tunnel' },
  CV_PRO: { code: 'cvpro', name: 'Générateur CV Pro & Lettre de Motivation IA', price: 500.0, unit: 'document' },
  AI_VIDEO_MEDIA: { code: 'nanagenerator', name: 'Génération Vidéos Pub & Visuels IA', price: 150.0, unit: 'média HD' },
  DOCUSIGN_SIGNATURE: { code: 'docusign', name: 'Signature Électronique Certifiée & Archivage', price: 300.0, unit: 'signature' },
  SMS_GATEWAY: { code: 'sms-otp', name: 'Passerelle SMS OTP / Confirmation', price: 25.0, unit: 'SMS' },
  WHATSAPP_NOTIF: { code: 'whatsapp-biz', name: 'Notifications WhatsApp Business', price: 35.0, unit: 'message' }
} as const;

// 2. Modules d'accès gratuit immédiat (PAS de theme-builder, accessible en lecture seule)
export const FREE_MODULE_KEYS = ['nanamarket', 'scanner', 'nana-switch', 'academic-upload'] as const;

// 3. Thèmes autorisés pour l'Offre Gratuite (Electro Pro et Élite Default)
export const FREE_OFFER_THEMES = ['theme-default', 'theme-electro-tech'] as const;

// 4. Modules Métiers nécessitant une ouverture de compte pour l'écriture
export const PHYSICAL_COMMERCE_MODULE_KEYS = ['pos', 'studio', 'inventory', 'scanner', 'debts'] as const;
export const DIGITAL_FORMATION_MODULE_KEYS = ['cours-forge', 'course-create', 'academy-support', 'wameet', 'webinar'] as const;

// 4. Cartographie des Thèmes
export const PHYSICAL_ECOMMERCE_THEMES = [
  'theme-default',
  'theme-electro-tech',
  'theme-electro-orange',
  'theme-beauty-emerald',
  'theme-megastore-pro',
  'theme-blank-custom'
] as const;

export const DIGITAL_AND_WEBINAR_THEMES = [
  'theme-digital-pro',
  'theme-livestream-pro'
] as const;

export interface ModuleAccessEvaluation {
  moduleKey: string;
  hasAccess: boolean;
  readOnly: boolean;
  requiresAccountOpening: boolean;
  isPayPerUse: boolean;
  pricingModel: PricingModelTier;
  kycStatus: KycStatusTier;
  ctaMessage?: string;
  allowedThemes: string[];
}

export function isPayPerUseModule(moduleKey: string): boolean {
  const cleanKey = (moduleKey || '').toLowerCase();
  return PAY_PER_USE_MODULE_KEYS.some((k) => cleanKey.includes(k) || k.includes(cleanKey));
}

export function isFreeModule(moduleKey: string): boolean {
  const cleanKey = (moduleKey || '').toLowerCase();
  return FREE_MODULE_KEYS.some((k) => cleanKey.includes(k) || k.includes(cleanKey));
}

export function isPhysicalCommerceModule(moduleKey: string): boolean {
  const cleanKey = (moduleKey || '').toLowerCase();
  return PHYSICAL_COMMERCE_MODULE_KEYS.some((k) => cleanKey.includes(k) || k.includes(cleanKey));
}

export function isDigitalFormationModule(moduleKey: string): boolean {
  const cleanKey = (moduleKey || '').toLowerCase();
  return DIGITAL_FORMATION_MODULE_KEYS.some((k) => cleanKey.includes(k) || k.includes(cleanKey));
}

/**
 * Évalue contextuellement le droit d'accès et le statut read_only d'un module
 */
export function evaluateModuleAccess(
  profile: Partial<Profile> | null | undefined,
  moduleKey: string
): ModuleAccessEvaluation {
  const cleanKey = (moduleKey || '').toLowerCase();
  const pricingModel: PricingModelTier = profile?.pricing_model || 'pay_per_use';
  const kycStatus: KycStatusTier = profile?.kyc_status || 'none';
  const enabledThemes = Array.isArray(profile?.enabled_themes) && profile.enabled_themes.length > 0
    ? profile.enabled_themes
    : ['theme-default', 'theme-electro-tech'];

  // A. Modules de Paiement à l'Usage : TOUJOURS ACCESSIBLES SANS KYC
  if (isPayPerUseModule(cleanKey)) {
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: false,
      requiresAccountOpening: false,
      isPayPerUse: true,
      pricingModel,
      kycStatus,
      allowedThemes: enabledThemes
    };
  }

  // B. Modules Gratuits : Accès direct sans KYC
  if (isFreeModule(cleanKey)) {
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: false,
      requiresAccountOpening: false,
      isPayPerUse: false,
      pricingModel,
      kycStatus,
      allowedThemes: enabledThemes
    };
  }

  // C. Si l'utilisateur n'a validé AUCUNE ouverture de compte (kyc_status === 'none')
  // RÈGLE : Dans l'Omnibar et l'App Registry, autorise l'accès en lecture à tous les modules.
  // Afficher le module avec un statut read_only: true et un bouton CTA d'activation.
  if (kycStatus === 'none' || pricingModel === 'pay_per_use') {
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: true,
      requiresAccountOpening: true,
      isPayPerUse: false,
      pricingModel,
      kycStatus,
      ctaMessage: 'Ouvrir mon compte pour utiliser ce module',
      allowedThemes: ['theme-default', 'theme-electro-tech']
    };
  }

  // D. Branche COMMISSION (Pay-as-you-go) : KYC Léger validé
  // Active uniquement le Thème Digital Pro et le Thème Live Webinaire.
  // Verrouille les thèmes d'E-commerce physique.
  if (pricingModel === 'commission') {
    // Si c'est un module e-commerce physique (caisse, stock, scanner...) : Verrouillé / Read Only
    if (isPhysicalCommerceModule(cleanKey)) {
      return {
        moduleKey: cleanKey,
        hasAccess: true,
        readOnly: true,
        requiresAccountOpening: true,
        isPayPerUse: false,
        pricingModel,
        kycStatus,
        ctaMessage: 'Passez à l’Abonnement Caisse & Vitrine pour débloquer le commerce physique',
        allowedThemes: ['theme-digital-pro', 'theme-livestream-pro']
      };
    }

    // Sinon modules digitaux / webinaires : autorisés en écriture
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: false,
      requiresAccountOpening: false,
      isPayPerUse: false,
      pricingModel,
      kycStatus,
      allowedThemes: ['theme-digital-pro', 'theme-livestream-pro']
    };
  }

  // E. Branche ABONNEMENT (KYC Entreprise)
  if (pricingModel === 'subscription') {
    const subscriptionOption = (profile as any)?.subscription_option as SubscriptionOptionTier | undefined;

    // Option Formation : Désactive la caisse physique et vitrine physique
    if (subscriptionOption === 'training') {
      if (isPhysicalCommerceModule(cleanKey)) {
        return {
          moduleKey: cleanKey,
          hasAccess: true,
          readOnly: true,
          requiresAccountOpening: true,
          isPayPerUse: false,
          pricingModel,
          kycStatus,
          ctaMessage: 'Option Caisse & Vitrine requise pour utiliser la caisse physique',
          allowedThemes: ['theme-digital-pro', 'theme-livestream-pro']
        };
      }
      return {
        moduleKey: cleanKey,
        hasAccess: true,
        readOnly: false,
        requiresAccountOpening: false,
        isPayPerUse: false,
        pricingModel,
        kycStatus,
        allowedThemes: ['theme-digital-pro', 'theme-livestream-pro']
      };
    }

    // Option Caisse & Vitrine : Active caisse physique, vitrines physiques et Live Shopping / Webinaire.
    // Verrouille le Thème Digital Pro.
    if (subscriptionOption === 'caisse_vitrine') {
      if (isDigitalFormationModule(cleanKey) && cleanKey === 'cours-forge') {
        return {
          moduleKey: cleanKey,
          hasAccess: true,
          readOnly: true,
          requiresAccountOpening: true,
          isPayPerUse: false,
          pricingModel,
          kycStatus,
          ctaMessage: 'Option Formation requise pour la création de cours académiques',
          allowedThemes: [
            'theme-default',
            'theme-electro-tech',
            'theme-electro-orange',
            'theme-beauty-emerald',
            'theme-megastore-pro',
            'theme-blank-custom',
            'theme-livestream-pro'
          ]
        };
      }
      return {
        moduleKey: cleanKey,
        hasAccess: true,
        readOnly: false,
        requiresAccountOpening: false,
        isPayPerUse: false,
        pricingModel,
        kycStatus,
        allowedThemes: [
          'theme-default',
          'theme-electro-tech',
          'theme-electro-orange',
          'theme-beauty-emerald',
          'theme-megastore-pro',
          'theme-blank-custom',
          'theme-livestream-pro'
        ]
      };
    }

    // Par défaut pour abonnement : tout actif
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: false,
      requiresAccountOpening: false,
      isPayPerUse: false,
      pricingModel,
      kycStatus,
      allowedThemes: enabledThemes
    };
  }

  // Fallback sécurisé en mode lecture
  return {
    moduleKey: cleanKey,
    hasAccess: true,
    readOnly: true,
    requiresAccountOpening: true,
    isPayPerUse: false,
    pricingModel,
    kycStatus,
    ctaMessage: 'Ouvrir mon compte pour utiliser ce module',
    allowedThemes: enabledThemes
  };
}

/**
 * Récupère le profil et la licence d'un utilisateur Supabase
 */
export async function getUserContextualProfile(userId: string): Promise<Profile | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    // Si aucun profil existant, renvoyer un profil standard sans KYC
    return {
      id: userId,
      organization_id: null,
      full_name: null,
      role: 'user',
      wallet_balance: 0.0,
      kyc_status: 'none',
      pricing_model: 'pay_per_use',
      enabled_themes: ['theme-default']
    };
  }

  return {
    id: data.id,
    organization_id: data.organization_id,
    full_name: data.full_name,
    email: data.email,
    role: data.role,
    wallet_balance: Number(data.wallet_balance || 0),
    kyc_status: data.kyc_status || 'none',
    pricing_model: data.pricing_model || 'pay_per_use',
    enabled_themes: Array.isArray(data.enabled_themes) ? data.enabled_themes : ['theme-default']
  };
}

/**
 * Déduit le montant pour un module de paiement à l'usage sans exiger de KYC
 */
export async function processPayPerUseConsumption(params: {
  userId: string;
  moduleKey: string;
  amount: number;
  description?: string;
}) {
  const { data, error } = await supabase.rpc('deduct_wallet_usage', {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_module_key: params.moduleKey,
    p_description: params.description || `Paiement usage module ${params.moduleKey}`
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Soumet une demande d'ouverture de compte (Commission ou Abonnement)
 */
export async function submitAccountOpening(params: {
  userId: string;
  pricingModel: PricingModelTier;
  subscriptionOption?: SubscriptionOptionTier | null;
  kycData: Record<string, any>;
  organizationId?: string | null;
}) {
  const { data, error } = await supabase.rpc('submit_account_activation', {
    p_user_id: params.userId,
    p_pricing_model: params.pricingModel,
    p_subscription_option: params.subscriptionOption || null,
    p_kyc_data: params.kycData,
    p_org_id: params.organizationId || null
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Injection d'un module ou produit acheté à la carte dans le Thème Gratuit
 */
export async function injectModuleToFreeTheme(params: {
  userId: string;
  moduleKey: string;
  price?: number;
}) {
  const { data, error } = await supabase.rpc('inject_carte_module_to_free_theme', {
    p_user_id: params.userId,
    p_module_key: params.moduleKey,
    p_price: params.price || 0.0
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}
