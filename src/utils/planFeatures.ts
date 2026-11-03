/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Centralisation des fonctionnalités, des quotas et de la matrice des droits SaaS (Freemium PLG).
 * Permet au Super Admin d'ajuster les règles sans modifications éparpillées dans le code.
 */

import {
  StoreSubscription,
  SubscriptionPlan,
  TenantQuotaItem,
  StoreUser,
  CompletedSale,
  InventoryProduct,
  SellerMode
} from '../types';
import { getSuperAdminPlanLimits, isSuperAdminLocally } from '../services/superAdminService';

export type ProFeatureKey =
  | 'CUSTOM_DOMAIN'
  | 'SOVEREIGN_GATEWAY'
  | 'EMPLOYEE_MANAGEMENT'
  | 'TRACKING_PIXELS_CRM'
  | 'WHITE_LABEL'
  | 'NANA_LIVE_NATIVE'
  | 'TWILIO_BREVO_INTEGRATIONS'
  | 'SOCIAL_LIVE_COMMERCE'
  | 'PREMIUM_FUNNELS'
  | 'COURSE_NODE_GRAPH'
  | 'CONTENT_DRIP'
  | 'COURSE_DRM_PROTECTION'
  | 'LIVE_CHAT_STUDENT_TEACHER'
  | 'COMMUNITY_CAMPUS'
  | 'LEVEL_SIMULATOR_QUIZ'
  | 'CERTIFICATE_GENERATOR'
  | 'AI_STUDIO'
  | 'AI_PRODUCT_DESCRIPTION'
  | 'AI_IMAGE_GENERATION'
  | 'AI_VIDEO_AVATAR'
  | 'AI_GRADING_ENGINE';

export type LimiterKey =
  | 'PRODUCTS'
  | 'FUNNELS'
  | 'COURSES'
  | 'LIVE_CALLS'
  | 'DOCUMENTS'
  | 'CASHIERS';

export interface PlanLimitsDefinition {
  maxProducts: number; // 3 pour Free, 100 pour Starter, -1 pour Illimité
  maxFunnels: number; // 1 pour Free, 5 pour Starter, -1 pour Illimité
  maxCourses: number; // 1 pour Free, 1 pour Starter, -1 pour Illimité
  maxLiveCallsMonthly: number; // 3 pour Free, 20 pour Starter, -1 pour Illimité
  maxDocuments: number; // 1 pour Free (CV / DocuSign), 20 pour Starter, -1 pour Illimité
  maxCashiers: number; // 1 pour Free (Plan Découverte), 2 pour Starter, 10 pour Pro, -1 pour Illimité
}

export interface ProFeatureMetadata {
  key: ProFeatureKey;
  label: string;
  category: 'COMMERCE' | 'PAYMENT' | 'TEAM' | 'MARKETING' | 'LMS' | 'LIVE' | 'BRANDING';
  recommendedPlan: 'starter' | 'pro' | 'elite';
  description: string;
}

export const PRO_FEATURES_CATALOG: Record<ProFeatureKey, ProFeatureMetadata> = {
  CUSTOM_DOMAIN: {
    key: 'CUSTOM_DOMAIN',
    label: 'Domaine Personnalisé',
    category: 'BRANDING',
    recommendedPlan: 'starter',
    description: 'Connectez votre propre nom de domaine .com, .ci ou .bf pour une vitrine ou un tunnel 100% à votre nom.'
  },
  SOVEREIGN_GATEWAY: {
    key: 'SOVEREIGN_GATEWAY',
    label: 'Passerelle Souveraine / Connecter API',
    category: 'PAYMENT',
    recommendedPlan: 'starter',
    description: 'Encaisser directement sur vos comptes marchands (FedaPay, Stripe, Wave direct, LigdiCash) sans intermédiaire avec 0% de commission.'
  },
  EMPLOYEE_MANAGEMENT: {
    key: 'EMPLOYEE_MANAGEMENT',
    label: 'Gestion des Employés / Caissiers',
    category: 'TEAM',
    recommendedPlan: 'starter',
    description: 'Ajoutez plusieurs caissiers, attribuez des codes PIN uniques et suivez les ventes de votre équipe en temps réel.'
  },
  TRACKING_PIXELS_CRM: {
    key: 'TRACKING_PIXELS_CRM',
    label: 'Pixels de Tracking & CRM Avancé',
    category: 'MARKETING',
    recommendedPlan: 'starter',
    description: 'Intégrez Meta Pixel (Facebook/IG), TikTok Pixel et automatisez vos tags CRM pour décupler vos conversions publicitaires.'
  },
  WHITE_LABEL: {
    key: 'WHITE_LABEL',
    label: 'Marque Blanche / Retirer le logo Nanasore',
    category: 'BRANDING',
    recommendedPlan: 'pro',
    description: 'Supprimez toute mention NaNa sur votre vitrine, vos tickets de caisse et vos cours pour valoriser exclusivement votre marque.'
  },
  NANA_LIVE_NATIVE: {
    key: 'NANA_LIVE_NATIVE',
    label: 'Nana Live Native (WebRTC Haute Définition)',
    category: 'LIVE',
    recommendedPlan: 'starter',
    description: 'Diffusez vos sessions vidéo en direct directement dans votre académie sans obliger les participants à installer Zoom.'
  },
  TWILIO_BREVO_INTEGRATIONS: {
    key: 'TWILIO_BREVO_INTEGRATIONS',
    label: 'Intégrations Twilio (SMS) & Brevo (Emailing)',
    category: 'MARKETING',
    recommendedPlan: 'starter',
    description: 'Relances automatiques par SMS après panier abandonné et envois massifs de newsletters ciblées.'
  },
  SOCIAL_LIVE_COMMERCE: {
    key: 'SOCIAL_LIVE_COMMERCE',
    label: 'Synchronisation Social Live Commerce (TikTok, FB, IG)',
    category: 'LIVE',
    recommendedPlan: 'pro',
    description: 'Vendez vos produits en direct simultanément sur vos réseaux sociaux préférés avec capture de leads automatisée.'
  },
  PREMIUM_FUNNELS: {
    key: 'PREMIUM_FUNNELS',
    label: 'Tunnels Premium Haute Conversion & Publicité',
    category: 'MARKETING',
    recommendedPlan: 'starter',
    description: 'Débloquez des modèles de tunnels ultra-agressifs avec One-Click Upsell, Order Bump et timers d\'urgence.'
  },
  COURSE_NODE_GRAPH: {
    key: 'COURSE_NODE_GRAPH',
    label: 'Constructeur de Cours par Graphe (Nodes visuels)',
    category: 'LMS',
    recommendedPlan: 'starter',
    description: 'Concevez des parcours d\'apprentissage adaptatifs non linéaires avec embranchements conditionnels par quiz.'
  },
  CONTENT_DRIP: {
    key: 'CONTENT_DRIP',
    label: 'Content Drip (Déblocage Goutte à Goutte)',
    category: 'LMS',
    recommendedPlan: 'starter',
    description: 'Libérez les leçons jour après jour pour maximiser l\'engagement et éviter le piratage massif de vos contenus.'
  },
  COURSE_DRM_PROTECTION: {
    key: 'COURSE_DRM_PROTECTION',
    label: 'Protection Avancée des Cours (DRM & Filigrane Dynamique)',
    category: 'LMS',
    recommendedPlan: 'pro',
    description: 'Incrustez l\'email et l\'IP de l\'étudiant en filigrane transparent sur la vidéo pour empêcher le pillage de vos formations.'
  },
  LIVE_CHAT_STUDENT_TEACHER: {
    key: 'LIVE_CHAT_STUDENT_TEACHER',
    label: 'Chat en Direct Étudiant / Formateur',
    category: 'LMS',
    recommendedPlan: 'starter',
    description: 'Messagerie instantanée directe pour répondre aux questions des apprenants et créer un lien de confiance.'
  },
  COMMUNITY_CAMPUS: {
    key: 'COMMUNITY_CAMPUS',
    label: 'Campus Social (Espace Communauté & Feed)',
    category: 'LMS',
    recommendedPlan: 'starter',
    description: 'Créez un réseau social privé dédié à vos étudiants pour échanger, s\'entraider et célébrer leurs victoires.'
  },
  LEVEL_SIMULATOR_QUIZ: {
    key: 'LEVEL_SIMULATOR_QUIZ',
    label: 'Simulateur de Niveau (Quiz Diagnostiques Avancés)',
    category: 'LMS',
    recommendedPlan: 'starter',
    description: 'Tests d\'évaluation intelligents qui orientent automatiquement l\'étudiant vers le module adapté à son niveau.'
  },
  CERTIFICATE_GENERATOR: {
    key: 'CERTIFICATE_GENERATOR',
    label: 'Génération de Certificats de Réussite Signés',
    category: 'BRANDING',
    recommendedPlan: 'starter',
    description: 'Délivrez des diplômes PDF officiels avec QR Code de vérification d\'authenticité pour récompenser vos diplômés.'
  },
  AI_STUDIO: {
    key: 'AI_STUDIO',
    label: 'Studio IA (Vidéos, Images & Textes)',
    category: 'MARKETING',
    recommendedPlan: 'pro',
    description: 'Générez des vidéos promotionnelles immersives, visuels publicitaires et copies percutantes avec les technologies d\'IA les plus avancées.'
  },
  AI_PRODUCT_DESCRIPTION: {
    key: 'AI_PRODUCT_DESCRIPTION',
    label: 'Générateur de Fiche Produit IA',
    category: 'COMMERCE',
    recommendedPlan: 'pro',
    description: 'Rédigez instantanément des fiches descriptives percutantes et convaincantes pour stimuler vos ventes e-commerce.'
  },
  AI_IMAGE_GENERATION: {
    key: 'AI_IMAGE_GENERATION',
    label: 'Génération d’Images Produits IA',
    category: 'COMMERCE',
    recommendedPlan: 'pro',
    description: 'Créez des visuels e-commerce photoréalistes en quelques secondes avec Google Imagen 3.'
  },
  AI_VIDEO_AVATAR: {
    key: 'AI_VIDEO_AVATAR',
    label: 'Avatar Vidéo Enseignant IA',
    category: 'LMS',
    recommendedPlan: 'pro',
    description: 'Transformez vos scripts de cours en leçons vidéo animées par des avatars pédagogiques ultra-réalistes.'
  },
  AI_GRADING_ENGINE: {
    key: 'AI_GRADING_ENGINE',
    label: 'Correction Automatique IA Elite',
    category: 'LMS',
    recommendedPlan: 'pro',
    description: 'Évaluez automatiquement les devoirs et quiz de vos étudiants selon vos critères pédagogiques personnalisés via Google AI Studio.'
  }
};

export const DEFAULT_PLAN_LIMITS: Record<string, PlanLimitsDefinition> = {
  free: {
    maxProducts: 3,
    maxFunnels: 1,
    maxCourses: 1,
    maxLiveCallsMonthly: 3,
    maxDocuments: 0, // RÈGLE CRITIQUE : CV Pro strictement exclu du Plan Zéro / Gratuit
    maxCashiers: 1
  },
  'plan-zero': {
    maxProducts: 3,
    maxFunnels: 1,
    maxCourses: 1,
    maxLiveCallsMonthly: 3,
    maxDocuments: 0, // RÈGLE CRITIQUE : CV Pro strictement exclu du Plan Zéro
    maxCashiers: 1
  },
  'plan-creator-commission': {
    maxProducts: 50,
    maxFunnels: 3,
    maxCourses: 3,
    maxLiveCallsMonthly: 10,
    maxDocuments: 0, // Facturé à l'usage sur portefeuille
    maxCashiers: 1
  },
  'plan-pay-as-you-go': {
    maxProducts: 10,
    maxFunnels: 2,
    maxCourses: 2,
    maxLiveCallsMonthly: 5,
    maxDocuments: 0, // Soumis au solde de crédits wallets
    maxCashiers: 2
  },
  starter: {
    maxProducts: 100,
    maxFunnels: 5,
    maxCourses: 5,
    maxLiveCallsMonthly: 20,
    maxDocuments: 50,
    maxCashiers: 2
  },
  'plan-business': {
    maxProducts: 500,
    maxFunnels: 20,
    maxCourses: 20,
    maxLiveCallsMonthly: 50,
    maxDocuments: 100,
    maxCashiers: 20
  },
  pro: {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: 10
  },
  'plan-pro': {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: 10
  },
  elite: {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: -1
  },
  'plan-enterprise': {
    maxProducts: -1,
    maxFunnels: -1,
    maxCourses: -1,
    maxLiveCallsMonthly: -1,
    maxDocuments: -1,
    maxCashiers: -1
  }
};

/**
 * Normalise l'identifiant du plan actuel (gère 'free', 'FREE_TRIAL', 'starter', 'pro', 'elite', StoreSubscription, StoreUser, string, localStorage)
 */
export function normalizePlanId(target?: StoreSubscription | StoreUser | string | null | undefined): string {
  // Exemption totale et droits illimités pour le Super Admin
  if (isSuperAdminLocally(typeof target === 'object' ? target as any : null)) {
    return 'elite';
  }

  let raw = '';

  if (target) {
    if (typeof target === 'string') {
      raw = target;
    } else if (typeof target === 'object') {
      if ('plan' in target && typeof (target as any).plan === 'string') {
        raw = (target as any).plan;
      } else if ('subscription' in target && (target as any).subscription?.plan) {
        raw = String((target as any).subscription.plan);
      } else if ('subscriptionPlan' in target && (target as any).subscriptionPlan) {
        raw = String((target as any).subscriptionPlan);
      }
    }
  }

  // Fallback sur le cache local du plan utilisateur
  if (!raw && typeof window !== 'undefined') {
    const storedUserPlan = localStorage.getItem('nana_user_plan') || localStorage.getItem('nana_store_plan');
    if (storedUserPlan) {
      raw = storedUserPlan;
    } else {
      const storedSub = localStorage.getItem('nana_store_sub');
      if (storedSub) {
        try {
          const parsed = JSON.parse(storedSub);
          raw = parsed.plan || parsed.subscriptionPlan || '';
        } catch {}
      }
      if (!raw) {
        const storedUser = localStorage.getItem('nana_store_auth_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            raw = parsed.plan || parsed.subscriptionPlan || parsed.subscription?.plan || '';
          } catch {}
        }
      }
    }
  }

  const plan = String(raw || '').toLowerCase().trim();
  if (plan.includes('enterprise') || plan.includes('elite')) return 'elite';
  if (plan.includes('business')) return 'starter';
  if (plan.includes('starter')) return 'starter';
  if (plan.includes('creator') || plan.includes('commission')) return 'plan-creator-commission';
  if (plan.includes('pay-as-you-go') || plan.includes('pay_as_you_go') || plan.includes('usage')) return 'plan-pay-as-you-go';
  if (plan.includes('pro')) return 'pro';
  if (plan.includes('zero') || plan === 'free' || plan === 'free_trial' || plan === 'trial' || !plan) {
    return 'free';
  }
  return 'free';
}

/**
 * Vérifie si le compte a accès à un hébergement de cours illimités (Plan Pro ou Elite)
 */
export function isUnlimitedCourses(target?: StoreSubscription | StoreUser | string | null | undefined): boolean {
  const planId = normalizePlanId(target);
  return planId === 'pro' || planId === 'elite';
}

/**
 * Vérifie si le compte est actuellement sur le plan gratuit Freemium
 */
export function isFreePlan(subscription?: StoreSubscription | StoreUser | string | null | undefined): boolean {
  if (isSuperAdminLocally(typeof subscription === 'object' ? subscription as any : null)) {
    return false;
  }
  return normalizePlanId(subscription) === 'free';
}

/**
 * Récupère les limites applicables pour un abonnement
 */
export function getPlanLimits(subscription?: StoreSubscription | StoreUser | string | null | undefined): PlanLimitsDefinition {
  const planId = normalizePlanId(subscription);
  const defaultLim = DEFAULT_PLAN_LIMITS[planId] || DEFAULT_PLAN_LIMITS.free;

  // Priorité absolue aux réglages Super Admin (Firebase / localStorage)
  const customLimits = getSuperAdminPlanLimits(planId);
  if (customLimits) {
    return {
      maxProducts: customLimits.maxProducts !== undefined ? customLimits.maxProducts : defaultLim.maxProducts,
      maxFunnels: customLimits.maxFunnels !== undefined ? customLimits.maxFunnels : defaultLim.maxFunnels,
      maxCourses: customLimits.maxCourses !== undefined ? customLimits.maxCourses : defaultLim.maxCourses,
      maxLiveCallsMonthly: customLimits.maxLiveCallsMonthly !== undefined 
        ? customLimits.maxLiveCallsMonthly 
        : (customLimits.maxLiveShoppingSessions !== undefined ? customLimits.maxLiveShoppingSessions : defaultLim.maxLiveCallsMonthly),
      maxDocuments: customLimits.maxDocuments !== undefined ? customLimits.maxDocuments : defaultLim.maxDocuments,
      maxCashiers: customLimits.maxCashiers !== undefined ? customLimits.maxCashiers : defaultLim.maxCashiers,
    };
  }

  return defaultLim;
}

/**
 * Vérifie si une fonctionnalité PRO est débloquée sur le plan donné
 */
export function isFeatureUnlocked(
  subscription: StoreSubscription | StoreUser | string | null | undefined,
  featureKey: ProFeatureKey
): boolean {
  if (isSuperAdminLocally(typeof subscription === 'object' ? subscription as any : null)) {
    return true;
  }
  const planId = normalizePlanId(subscription);
  if (planId === 'pro' || planId === 'elite') return true;

  const featureMeta = PRO_FEATURES_CATALOG[featureKey];
  if (!featureMeta) return false;

  if (planId === 'starter') {
    // Le plan starter débloque les fonctionnalités de niveau 'starter'
    return featureMeta.recommendedPlan === 'starter';
  }

  // Sur le plan 'free', toutes les fonctionnalités PRO sont verrouillées
  return false;
}

/**
 * Détaille le statut d'une limite quantitative
 */
export function getLimitStatus(
  subscription: StoreSubscription | StoreUser | string | null | undefined,
  limiterKey: LimiterKey,
  currentCount: number
): { isReached: boolean; max: number; current: number } {
  const limits = getPlanLimits(subscription);

  let max = 0;
  switch (limiterKey) {
    case 'PRODUCTS':
      max = limits.maxProducts;
      break;
    case 'FUNNELS':
      max = limits.maxFunnels;
      break;
    case 'COURSES':
      max = limits.maxCourses;
      break;
    case 'LIVE_CALLS':
      max = limits.maxLiveCallsMonthly;
      break;
    case 'DOCUMENTS':
      max = limits.maxDocuments;
      break;
    case 'CASHIERS':
      max = limits.maxCashiers;
      break;
  }

  // -1 signifie illimité
  if (max === -1) {
    return { isReached: false, max: -1, current: currentCount };
  }

  return {
    isReached: currentCount >= max,
    max,
    current: currentCount
  };
}

/**
 * Contrôle si une limite quantitative est atteinte (compteurs)
 * Retourne true si bloqué (limite atteinte ou dépassée)
 */
export function isLimitReached(
  subscription: StoreSubscription | StoreUser | string | null | undefined,
  limiterKey: LimiterKey,
  currentCount: number
): boolean {
  if (isSuperAdminLocally(typeof subscription === 'object' ? subscription as any : null)) {
    return false;
  }
  return getLimitStatus(subscription, limiterKey, currentCount).isReached;
}

/**
 * Détails du déclencheur d'Upsell
 */
export interface UpsellTriggerDetail {
  mode: 'FEATURE_LOCKED' | 'LIMIT_REACHED';
  featureKey?: ProFeatureKey;
  featureLabel?: string;
  limiterKey?: LimiterKey;
  limiterItemName?: string;
  currentCount?: number;
  maxCount?: number;
  recommendedPlan?: 'starter' | 'pro';
  customTitle?: string;
  customMessage?: string;
}

/**
 * Déclencheur global de la modale d'Upsell via événement système
 */
export function triggerUpsellModal(detail: UpsellTriggerDetail) {
  if (typeof window === 'undefined') return;
  if (isSuperAdminLocally()) return;
  window.dispatchEvent(
    new CustomEvent('nana_trigger_upsell', {
      detail
    })
  );
}

/**
 * Déclenchement rapide pour fonctionnalité PRO verrouillée
 */
export function triggerProFeatureUpsell(featureKey: ProFeatureKey) {
  if (isSuperAdminLocally()) return;
  const meta = PRO_FEATURES_CATALOG[featureKey];
  triggerUpsellModal({
    mode: 'FEATURE_LOCKED',
    featureKey,
    featureLabel: meta ? meta.label : featureKey,
    recommendedPlan: meta ? (meta.recommendedPlan === 'elite' ? 'pro' : meta.recommendedPlan) : 'starter'
  });
}

/**
 * Déclenchement rapide pour compteur saturé
 */
export function triggerLimitReachedUpsell(
  limiterKey: LimiterKey,
  currentCount: number,
  maxCount: number,
  itemName: string
) {
  if (isSuperAdminLocally()) return;
  triggerUpsellModal({
    mode: 'LIMIT_REACHED',
    limiterKey,
    currentCount,
    maxCount,
    limiterItemName: itemName,
    recommendedPlan: 'starter'
  });
}

/**
 * Résout le mode vendeur Caméléon ('creator_trainer' | 'merchant_ecommerce' | 'hybrid_all')
 * Priorité : argument direct > localStorage('nanasore_seller_mode') > user.sellerMode > user.vendorType / user.role
 */
export function resolveSellerMode(
  target?: StoreUser | SellerMode | string | null
): SellerMode {
  const normalizeRaw = (raw?: string | null): SellerMode | null => {
    if (!raw) return null;
    const val = raw.toLowerCase().trim();
    if (
      val === 'creator_trainer' ||
      val === 'elearning' ||
      val === 'courses' ||
      val === 'teacher' ||
      val === 'instructor' ||
      val.includes('formateur') ||
      val.includes('savoir')
    ) {
      return 'creator_trainer';
    }
    if (val === 'hybrid_all' || val === 'hybrid' || val.includes('hybride')) {
      return 'hybrid_all';
    }
    if (
      val === 'merchant_ecommerce' ||
      val === 'ecommerce' ||
      val === 'products' ||
      val === 'merchant' ||
      val.includes('commer')
    ) {
      return 'merchant_ecommerce';
    }
    return null;
  };

  if (typeof target === 'string') {
    const fromStr = normalizeRaw(target);
    if (fromStr) return fromStr;
  }

  if (target && typeof target === 'object') {
    const fromSellerMode = normalizeRaw(target.sellerMode);
    if (fromSellerMode) return fromSellerMode;
  }

  if (typeof window !== 'undefined') {
    try {
      const storedMode = localStorage.getItem('nanasore_seller_mode');
      const normalizedStored = normalizeRaw(storedMode);
      if (normalizedStored) return normalizedStored;
    } catch {}
  }

  if (target && typeof target === 'object') {
    const fromVendor = normalizeRaw(target.vendorType);
    if (fromVendor) return fromVendor;
    if ((target.role as string) === 'teacher' || (target.role as string) === 'CREATOR_TRAINER') return 'creator_trainer';
  }

  if (typeof window !== 'undefined') {
    try {
      const storedAuthUser = localStorage.getItem('nana_store_auth_user');
      if (storedAuthUser) {
        const parsed = JSON.parse(storedAuthUser);
        const fromAuthUser = normalizeRaw(parsed?.sellerMode || parsed?.vendorType || parsed?.role);
        if (fromAuthUser) return fromAuthUser;
      }
      const storedVendor = localStorage.getItem('nana_vendor_type');
      const fromVendor = normalizeRaw(storedVendor);
      if (fromVendor) return fromVendor;
    } catch {}
  }

  return 'merchant_ecommerce';
}

/**
 * Sauvegarde immédiatement le sellerMode dans localStorage ('nanasore_seller_mode', 'nana_vendor_type', 'nana_store_auth_user')
 * et émet un événement global pour synchroniser le Tableau de Bord Caméléon et la Sidebar en 1 clic.
 */
export function persistSellerModeLocally(mode: SellerMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('nanasore_seller_mode', mode);
    const legacyVendorType = mode === 'creator_trainer' ? 'elearning' : 'ecommerce';
    localStorage.setItem('nana_vendor_type', legacyVendorType);

    const rawUser = localStorage.getItem('nana_store_auth_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      parsed.sellerMode = mode;
      parsed.vendorType = legacyVendorType;
      localStorage.setItem('nana_store_auth_user', JSON.stringify(parsed));
    }

    window.dispatchEvent(
      new CustomEvent('nanasore_seller_mode_changed', {
        detail: { sellerMode: mode, vendorType: legacyVendorType }
      })
    );
  } catch (err) {
    console.warn('[SELLER_MODE] Erreur sauvegarde locale :', err);
  }
}

/**
 * Récupère le type de vendeur ('ecommerce' ou 'elearning')
 */
export function resolveVendorType(vendorType?: string | null): 'ecommerce' | 'elearning' {
  if (!vendorType) {
    if (typeof window !== 'undefined') {
      const sellerMode = localStorage.getItem('nanasore_seller_mode');
      if (sellerMode === 'creator_trainer') return 'elearning';
      if (sellerMode === 'merchant_ecommerce' || sellerMode === 'hybrid_all') return 'ecommerce';
      const stored = localStorage.getItem('nana_vendor_type');
      if (stored === 'elearning' || stored === 'ecommerce') return stored;
    }
    return 'ecommerce';
  }
  const normalized = vendorType.toLowerCase().trim();
  if (
    normalized === 'creator_trainer' ||
    normalized.includes('elearning') ||
    normalized.includes('formation') ||
    normalized.includes('cours') ||
    normalized.includes('instructor')
  ) {
    return 'elearning';
  }
  return 'ecommerce';
}

/**
 * Gestion du stockage local des quotas pour Funnels, Appels Directs et Documents
 */
export function getStoredFunnelsCount(storeId?: string): number {
  try {
    const key = `nana_funnels_count_${storeId || 'default'}`;
    const val = localStorage.getItem(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function incrementStoredFunnelsCount(storeId?: string): number {
  try {
    const current = getStoredFunnelsCount(storeId);
    const updated = current + 1;
    const key = `nana_funnels_count_${storeId || 'default'}`;
    localStorage.setItem(key, String(updated));
    return updated;
  } catch {
    return 1;
  }
}

export function getMonthlyLiveCallsCount(storeId?: string): number {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const key = `nana_live_calls_${storeId || 'default'}_${currentMonth}`;
    const val = localStorage.getItem(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function incrementMonthlyLiveCallsCount(storeId?: string): number {
  try {
    const current = getMonthlyLiveCallsCount(storeId);
    const updated = current + 1;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const key = `nana_live_calls_${storeId || 'default'}_${currentMonth}`;
    localStorage.setItem(key, String(updated));
    return updated;
  } catch {
    return 1;
  }
}

export function getGeneratedDocumentsCount(storeId?: string): number {
  try {
    const key = `nana_documents_count_${storeId || 'default'}`;
    const val = localStorage.getItem(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function incrementGeneratedDocumentsCount(storeId?: string): number {
  try {
    const current = getGeneratedDocumentsCount(storeId);
    const updated = current + 1;
    const key = `nana_documents_count_${storeId || 'default'}`;
    localStorage.setItem(key, String(updated));
    return updated;
  } catch {
    return 1;
  }
}

export interface DynamicTenantQuotasOptions {
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  sales?: CompletedSale[];
  inventory?: InventoryProduct[];
  storageBytesUsed?: number;
  marketingAiUsed?: number;
}

/**
 * Calcule dynamiquement les 6 jauges réelles d'utilisation du compte (Production Ready)
 * Sans données fictives, avec protection totale contre NaN et micro-copies motivantes à 0.
 */
export function computeDynamicTenantQuotas(options: DynamicTenantQuotasOptions): TenantQuotaItem[] {
  const {
    currentUser,
    subscription,
    sales = [],
    inventory = [],
    storageBytesUsed = 0,
    marketingAiUsed = 0
  } = options;

  const planId = normalizePlanId(subscription);
  const limits = getPlanLimits(subscription);
  const storeId = currentUser?.storeId || 'default';

  // 1. Jauge Ventes & Chiffre d'Affaires (Objectif Palier)
  const salesTotal = sales && sales.length > 0
    ? sales.reduce((sum, s) => sum + (s.total || 0), 0)
    : ((currentUser as any)?.totalSales || 0);

  // Palier incitatif par formule (100 000 pour Free, 500 000 pour Starter, 2M pour Pro, 10M pour Elite)
  let salesMilestoneTarget = 100000;
  if (planId === 'starter') salesMilestoneTarget = 500000;
  else if (planId === 'pro') salesMilestoneTarget = 2000000;
  else if (planId === 'elite') salesMilestoneTarget = 10000000;

  const quotaSales: TenantQuotaItem = {
    id: 'quota-sales',
    name: 'Chiffre d\'Affaires & Ventes Réalisées',
    current: Math.max(0, salesTotal),
    max: salesMilestoneTarget,
    unit: 'FCFA',
    category: 'sales',
    resetPeriod: `Palier ${salesMilestoneTarget.toLocaleString('fr-FR')} FCFA`,
    isSaturated: false,
    emptyStateActionLabel: `0 FCFA générés sur ${salesMilestoneTarget.toLocaleString('fr-FR')} FCFA — Enregistrez votre 1ère vente ! 🚀`,
    targetAction: 'POS'
  };

  // 2. Jauge Produits créés (Catalogue POS & E-Shop)
  const productCount = inventory && inventory.length > 0
    ? inventory.length
    : 0;
  const maxProducts = limits.maxProducts; // 3 pour Free, 100 pour Starter, -1 pour Pro

  const quotaInventory: TenantQuotaItem = {
    id: 'quota-inventory',
    name: 'Produits au Catalogue & Vitrine',
    current: Math.max(0, productCount),
    max: maxProducts,
    unit: 'articles',
    category: 'inventory',
    resetPeriod: maxProducts === -1 ? 'Illimité (Plan Pro)' : 'Limite active',
    isSaturated: maxProducts !== -1 && productCount >= maxProducts,
    emptyStateActionLabel: `0 produit créé sur ${maxProducts === -1 ? 'Illimité' : maxProducts} — Ajoutez votre premier article ! 📦`,
    targetAction: 'INVENTORY'
  };

  // 3. Jauge Espace Disque & Médias Cloud (en Mo)
  const currentMo = Math.round((storageBytesUsed / (1024 * 1024)) * 10) / 10;
  let maxStorageMo = 50; // 50 Mo pour Free
  if (planId === 'starter') maxStorageMo = 500;
  else if (planId === 'pro') maxStorageMo = 5000;
  else if (planId === 'elite') maxStorageMo = 20000;

  const quotaStorage: TenantQuotaItem = {
    id: 'quota-storage',
    name: 'Espace Disque & Médias Cloud',
    current: Math.max(0, currentMo),
    max: maxStorageMo,
    unit: 'Mo',
    category: 'storage',
    resetPeriod: 'Stockage Cloud Sécurisé',
    isSaturated: currentMo >= maxStorageMo,
    emptyStateActionLabel: `0 Mo utilisés sur ${maxStorageMo} Mo — Prêt pour vos photos et vidéos ! 💾`,
    targetAction: 'INVENTORY'
  };

  // 4. Jauge Live Flash & Webinaires
  const liveCallsCount = getMonthlyLiveCallsCount(storeId);
  const maxLiveCalls = limits.maxLiveCallsMonthly; // 3 pour Free, 20 pour Starter, -1 pour Pro

  const quotaLive: TenantQuotaItem = {
    id: 'quota-live',
    name: 'Live Flash & Webinaires Commerciaux',
    current: Math.max(0, liveCallsCount),
    max: maxLiveCalls,
    unit: 'diffusions',
    category: 'live',
    resetPeriod: 'Ce mois-ci',
    isSaturated: maxLiveCalls !== -1 && liveCallsCount >= maxLiveCalls,
    emptyStateActionLabel: `0 diffusion sur ${maxLiveCalls === -1 ? 'Illimité' : maxLiveCalls} ce mois-ci — Lancez votre 1ère vente en direct ! 🎥`,
    targetAction: 'BOUTIQUE'
  };

  // 5. Jauge Assistant IA Marketing & Copywriting
  let maxAiQueries = 5; // Free
  if (planId === 'starter') maxAiQueries = 20;
  else if (planId === 'pro') maxAiQueries = 100;
  else if (planId === 'elite') maxAiQueries = -1;

  const quotaAi: TenantQuotaItem = {
    id: 'quota-ai',
    name: 'Assistant IA Marketing & Copywriting',
    current: Math.max(0, marketingAiUsed),
    max: maxAiQueries,
    unit: 'requêtes IA',
    category: 'marketing',
    resetPeriod: 'Ce mois-ci',
    isSaturated: maxAiQueries !== -1 && marketingAiUsed >= maxAiQueries,
    emptyStateActionLabel: `0 requête utilisée sur ${maxAiQueries === -1 ? 'Illimité' : maxAiQueries} — Rédigez avec Gemini IA ! ✨`,
    targetAction: 'AI_STUDIO'
  };

  // 6. Jauge Devis & Factures Sécurisées DocuSign
  const docsCount = getGeneratedDocumentsCount(storeId);
  const maxDocs = limits.maxDocuments; // 1 pour Free, 50 pour Starter, -1 pour Pro

  const quotaInvoicing: TenantQuotaItem = {
    id: 'quota-invoicing',
    name: 'Devis & Factures Sécurisées DocuSign',
    current: Math.max(0, docsCount),
    max: maxDocs,
    unit: 'documents',
    category: 'invoicing',
    resetPeriod: 'Ce mois-ci',
    isSaturated: maxDocs !== -1 && docsCount >= maxDocs,
    emptyStateActionLabel: `0 document généré sur ${maxDocs === -1 ? 'Illimité' : maxDocs} — Créez et signez votre premier devis ! 📑`,
    targetAction: 'DEVIS'
  };

  return [
    quotaSales,
    quotaInventory,
    quotaStorage,
    quotaLive,
    quotaAi,
    quotaInvoicing
  ];
}



/**
 * RÈGLE CRITIQUE D'AUTORISATION CV PRO :
 * Le module CV Pro (mod-cvpro / usage-cvpro) est STRICTEMENT EXCLU du Plan Zéro.
 * - Inclus sur les abonnements payants (Pro, Business, Enterprise, Starter).
 * - Autorisé via débit de crédits pour le Plan Usage (Pay-As-You-Go).
 * - Bloqué formellement sur le Plan Zéro gratuit.
 */
export interface CvProAccessResult {
  allowed: boolean;
  reason: 'SUBSCRIPTION_INCLUDED' | 'WALLET_CREDITS' | 'BLOCKED_PLAN_ZERO' | 'INSUFFICIENT_CREDITS';
  message: string;
}

export function canAccessCvPro(
  subscription?: StoreSubscription | StoreUser | string | null | undefined,
  walletCreditBalance: number = 0
): CvProAccessResult {
  // Super Admin toujours exempté
  if (isSuperAdminLocally(typeof subscription === 'object' ? subscription as any : null)) {
    return {
      allowed: true,
      reason: 'SUBSCRIPTION_INCLUDED',
      message: 'Accès illimité Super-Administrateur.'
    };
  }

  const planId = normalizePlanId(subscription);

  // 1. Abonnements payants récurrents : Débloqué sans surcoût
  if (planId === 'pro' || planId === 'elite' || planId === 'starter') {
    return {
      allowed: true,
      reason: 'SUBSCRIPTION_INCLUDED',
      message: 'Module CV Pro inclus dans votre formule d\'abonnement.'
    };
  }

  // 2. Mode Pay-As-You-Go ou solde de crédits disponible (>= 5 crédits ou >= 500 XOF)
  if (planId === 'plan-pay-as-you-go' || walletCreditBalance >= 5) {
    if (walletCreditBalance >= 5) {
      return {
        allowed: true,
        reason: 'WALLET_CREDITS',
        message: 'Accès autorisé via débit de 5 crédits sur votre portefeuille (Wallet).'
      };
    }
    return {
      allowed: false,
      reason: 'INSUFFICIENT_CREDITS',
      message: 'Solde insuffisant sur votre portefeuille. Recharger 5 crédits (500 F CFA) pour exporter votre CV Pro.'
    };
  }

  // 3. Plan Zéro / Gratuit : Bloqué formellement
  return {
    allowed: false,
    reason: 'BLOCKED_PLAN_ZERO',
    message: 'Le module CV Pro n\'est pas inclus dans le Plan Zéro gratuit. Passez au Plan Pro ou activez la formule Pay-As-You-Go (500 F CFA / CV).'
  };
}
