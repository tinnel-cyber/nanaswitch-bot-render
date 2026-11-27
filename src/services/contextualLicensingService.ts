/**
 * ============================================================================
 * SERVICE CLIENT : LICENCE CONTEXTUELLE, CONTRÔLE D'ACCÈS AUX MODULES & KYC
 * ============================================================================
 * 
 * Règles d'accès Nanasore :
 * 1. Accès Général Sans KYC : Modules gratuits & Modules paiement à l'usage (CV, vidéos pub, signatures)
 *    -> Débit direct du Wallet sans demande d'identité
 *    -> Achat à la carte de produits/modules pour les injecter dans le Thème Gratuit
 * 2. Mode Lecture / Preview pour les Modules Métiers :
 *    -> Omnibar & App Registry autorisent la lecture de tous les modules
 *    -> Si compte non activé : statut read_only: true + CTA « Ouvrir mon compte pour utiliser ce module »
 * 3. Tunnels d'ouverture de compte & KYC :
 *    -> Branche Commission : KYC léger (Nom, prénom, pièce d'identité, photo capture, email, numéro de paiement, domaine et description sans RCCM)
 *       -> Active Thème Digital Pro & Live Webinaire. Verrouille E-commerce physique.
 *    -> Branche Abonnement :
 *       -> Option Formation : Désactive caisse physique & vitrine physique
 *       -> Option Caisse & Vitrine : Active caisse physique, vitrines physiques & Live Shopping / Webinaire. Verrouille Thème Digital Pro.
 *       -> KYC Entreprise : Exige nom de l'entreprise et documents légaux.
 */

export type KycStatusTier = 'none' | 'pending' | 'pending_approval' | 'pending_verification' | 'light' | 'full' | 'verified' | 'approved';
export type AccountTypeTier = 'particulier' | 'entreprise';
export type PricingModelTier = 'pay_per_use' | 'commission' | 'subscription';
export type SubscriptionOptionTier = 'training' | 'caisse_vitrine' | 'all_inclusive';

export interface UserContextualLicense {
  userId: string;
  walletBalance: number;
  kycStatus: KycStatusTier;
  accountType?: AccountTypeTier;
  monthlyLimit?: number; // 1 000 000 FCFA pour Particulier, 5 000 000 FCFA pour Entreprise
  pricingModel: PricingModelTier;
  subscriptionOption?: SubscriptionOptionTier | null;
  enabledThemes: string[];
  injectedCarteModules: string[];
}

export interface ModuleAccessInfo {
  moduleKey: string;
  hasAccess: boolean;
  readOnly: boolean;
  requiresAccountOpening: boolean;
  isPendingValidation?: boolean;
  isSubscriptionRequired?: boolean;
  isPayPerUse: boolean;
  ctaMessage?: string;
}

// Modules éligibles au Paiement à l'Usage sans KYC (consomment le Wallet)
export const PAY_PER_USE_MODULES = [
  'cvpro',
  'nanagenerator',
  'docusign',
  'extra-product',
  'sales-funnel',
  'ultimate-funnel',
  'modular-funnel'
] as const;

// Grille tarifaire officielle Pay-As-You-Go (Recharge Portefeuille sans KYC)
export const PAY_AS_YOU_GO_PRICES = {
  EXTRA_PRODUCT: 1000, // 1 000 FCFA par produit supplémentaire activé au-delà des 3 gratuits
  SALES_FUNNEL: 5000,  // 5 000 FCFA par tunnel de vente modulaire
  CV_PRO: 500,         // 500 FCFA par CV Pro & Lettre de Motivation IA
  AI_VIDEO_MEDIA: 1500, // 1 500 FCFA par création vidéo publicitaire ou visuel IA
  DOCUSIGN: 300,       // 300 FCFA par signature certifiée
  SMS_OTP: 25,         // 25 FCFA par SMS
  WHATSAPP_MSG: 35     // 35 FCFA par notification WhatsApp
} as const;

// Modules Gratuits inclus d'office (EXCLUT STRICTEMENT LA CAISSE POS ET L'ECOMMERCE PHYSIQUE)
export const FREE_MODULES = ['nanamarket', 'scanner', 'nana-switch'] as const;

// Modules strictement soumis au Plan Abonnement (Commerce physique, Caisse POS tactile pro, Formations pro)
export const SUBSCRIPTION_PLAN_MODULES = [
  'pos',
  'pos-caisse-core',
  'caisse',
  'mod_pos_closing',
  'mod_cashier_sessions',
  'mod_receipt_printer',
  'store_builder',
  'ecommerce-physique',
  'boutique',
  'boutique-physique',
  'cours-forge',
  'course-create',
  'academy-support',
  'wameet',
  'webinar',
  'inventory',
  'debts',
  'team-employees'
] as const;

// Modules soumis au Plan Commission (Produits numériques, téléchargements, affiliation, upload vendeur)
export const COMMISSION_PLAN_MODULES = [
  'downloads',
  'product_downloads',
  'download',
  'telechargement',
  'academic-upload',
  'academic_upload',
  'vendor-upload',
  'vendor_upload',
  'digital-products',
  'digital',
  'affiliates',
  'partenaire',
  'affiliation',
  'links',
  'checkout'
] as const;

// Thèmes inclus dans l'Offre Gratuite : Le thème Electro pro et le thème Élite Default
export const FREE_THEMES = ['theme-default', 'theme-electro-tech'] as const;

// Modules Commerce Physique
export const PHYSICAL_COMMERCE_MODULES = ['pos', 'studio', 'inventory', 'scanner', 'debts', 'analytics', 'team-employees'] as const;

// Modules Digitaux & Formation
export const DIGITAL_FORMATION_MODULES = ['cours-forge', 'course-create', 'academy-support', 'wameet', 'webinar'] as const;

const LOCAL_LICENSE_KEY = 'nana_contextual_license_v1';

/**
 * Détecte si un module relève strictement du Plan Abonnement
 */
export function isSubscriptionPlanModule(moduleKey: string): boolean {
  const k = (moduleKey || '').toLowerCase();
  if (k.includes('pos') || k.includes('caisse')) return true;
  if (k.includes('store_builder') || k.includes('ecommerce-physique') || k.includes('boutique-physique')) return true;
  if (k.includes('cours-forge') || k.includes('course-create') || k.includes('academy-support') || k.includes('wameet') || k.includes('webinar')) return true;
  return SUBSCRIPTION_PLAN_MODULES.some(subKey => k === subKey || k.includes(subKey) || subKey.includes(k));
}

/**
 * Détecte si un module relève du Plan Commission (accessible dès validation du compte)
 */
export function isCommissionPlanModule(moduleKey: string): boolean {
  const k = (moduleKey || '').toLowerCase();
  if (isSubscriptionPlanModule(k)) return false;
  if (k.includes('download') || k.includes('telechargement') || k.includes('digital') || k.includes('numerique')) return true;
  if (k.includes('upload') || k.includes('vendor') || k.includes('academic')) return true;
  if (k.includes('affiliate') || k.includes('partenaire')) return true;
  if (k.includes('link') || k.includes('checkout')) return true;
  return COMMISSION_PLAN_MODULES.some(commKey => k === commKey || k.includes(commKey) || commKey.includes(k));
}

/**
 * Récupère la licence locale avec valeurs par défaut
 */
export function getLocalUserLicense(userId?: string): UserContextualLicense {
  if (typeof window === 'undefined') {
    return {
      userId: userId || 'anon',
      walletBalance: 0,
      kycStatus: 'none',
      pricingModel: 'pay_per_use',
      enabledThemes: ['theme-default', 'theme-electro-tech'],
      injectedCarteModules: []
    };
  }

  try {
    const raw = localStorage.getItem(LOCAL_LICENSE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!userId || parsed.userId === userId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[LICENCE] Erreur lecture cache local :', e);
  }

  return {
    userId: userId || 'anon',
    walletBalance: 0,
    kycStatus: 'none',
    pricingModel: 'pay_per_use',
    enabledThemes: ['theme-default', 'theme-electro-tech'],
    injectedCarteModules: []
  };
}

/**
 * Sauvegarde locale de la licence
 */
export function saveLocalUserLicense(license: UserContextualLicense): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_LICENSE_KEY, JSON.stringify(license));
    window.dispatchEvent(new CustomEvent('nana_license_updated', { detail: license }));
  } catch (e) {
    console.warn('[LICENCE] Erreur sauvegarde cache local :', e);
  }
}

/**
 * Retourne la mention d'ouverture d'univers adaptée au type d'entité :
 * - SERVICE : "Ouvrir un univers pour utiliser ce service"
 * - APPLICATION : "Ouvrir un univers pour utiliser cette application"
 * - OUTIL : "Ouvrir un univers pour utiliser cet outil"
 * - MODULE : "Ouvrir un univers pour utiliser ce module"
 */
export function getUniverseRequiredCta(type?: string): string {
  const t = (type || 'MODULE').toUpperCase();
  if (t === 'SERVICE') return 'Ouvrir un univers pour utiliser ce service';
  if (t === 'APPLICATION' || t === 'APP') return 'Ouvrir un univers pour utiliser cette application';
  if (t === 'OUTIL' || t === 'TOOL') return 'Ouvrir un univers pour utiliser cet outil';
  return 'Ouvrir un univers pour utiliser ce module';
}

/**
 * Retourne la mention pour les modules en attente de validation du compte :
 */
export function getPendingValidationCta(type?: string): string {
  const t = (type || 'MODULE').toUpperCase();
  if (t === 'SERVICE') return 'En attente de validation pour accéder à ce service';
  if (t === 'APPLICATION' || t === 'APP') return 'En attente de validation pour accéder à cette application';
  if (t === 'OUTIL' || t === 'TOOL') return 'En attente de validation pour accéder à cet outil';
  return 'En attente de validation pour accéder à ce module';
}

/**
 * Retourne la mention pour les modules soumis au plan abonnement :
 */
export function getSubscriptionRequiredCta(type?: string): string {
  const t = (type || 'MODULE').toUpperCase();
  if (t === 'SERVICE') return 'Abonnement requis pour débloquer ce service';
  if (t === 'APPLICATION' || t === 'APP') return 'Abonnement requis pour débloquer cette application';
  if (t === 'OUTIL' || t === 'TOOL') return 'Abonnement requis pour débloquer cet outil';
  return 'Abonnement requis pour débloquer ce module';
}

/**
 * Évalue contextuellement si un module est en lecture seule ou actif
 */
export function evaluateClientModuleAccess(
  moduleKey: string,
  licenseProp?: Partial<UserContextualLicense> | null,
  moduleType?: string
): ModuleAccessInfo {
  const license = { ...getLocalUserLicense(), ...(licenseProp || {}) };
  const cleanKey = (moduleKey || '').toLowerCase();

  // 1. Module injecté à la carte dans le Thème Gratuit
  if (license.injectedCarteModules && license.injectedCarteModules.includes(cleanKey)) {
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: false,
      requiresAccountOpening: false,
      isPayPerUse: false
    };
  }

  // 2. Modules Paiement à l'Usage : ACCÈS IMMÉDIAT SANS KYC
  const isPayPerUse = PAY_PER_USE_MODULES.some(k => cleanKey.includes(k) || k.includes(cleanKey));
  if (isPayPerUse) {
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: false,
      requiresAccountOpening: false,
      isPayPerUse: true
    };
  }

  // 3. Modules Gratuits (EXCLUT STRICTEMENT LA CAISSE POS ET L'ECOMMERCE PHYSIQUE)
  const isCaisseOrPos = cleanKey.includes('pos') || cleanKey.includes('caisse');
  const isFree = !isCaisseOrPos && FREE_MODULES.some(k => cleanKey === k || cleanKey.includes(k) || k.includes(cleanKey));
  if (isFree) {
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: false,
      requiresAccountOpening: false,
      isPayPerUse: false
    };
  }

  const kycStatus = license.kycStatus || 'none';
  const isPending = kycStatus === 'pending' || kycStatus === 'pending_approval' || kycStatus === 'pending_verification';
  const isApproved = kycStatus === 'verified' || kycStatus === 'approved' || kycStatus === 'full';

  // 4. Utilisateur sans KYC / Sans univers soumis
  if (kycStatus === 'none') {
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: true,
      requiresAccountOpening: true,
      isPayPerUse: false,
      ctaMessage: getUniverseRequiredCta(moduleType)
    };
  }

  // 5. Compte en cours de validation (dossier transmis au Super Admin)
  if (isPending) {
    if (isCommissionPlanModule(cleanKey)) {
      return {
        moduleKey: cleanKey,
        hasAccess: true,
        readOnly: true,
        requiresAccountOpening: false,
        isPendingValidation: true,
        isPayPerUse: false,
        ctaMessage: getPendingValidationCta(moduleType)
      };
    }

    // Modules soumis au Plan Abonnement (commerce physique, caisse tactile POS pro, formation pro)
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: true,
      requiresAccountOpening: false,
      isSubscriptionRequired: true,
      isPayPerUse: false,
      ctaMessage: getSubscriptionRequiredCta(moduleType)
    };
  }

  // 6. Compte approuvé & validé
  if (isApproved) {
    // Si c'est un module Plan Commission : TOUS ACCESSIBLES DIRECTEMENT SANS ABONNEMENT !
    if (isCommissionPlanModule(cleanKey)) {
      return {
        moduleKey: cleanKey,
        hasAccess: true,
        readOnly: false,
        requiresAccountOpening: false,
        isPayPerUse: false
      };
    }

    // Si c'est un module Plan Abonnement (commerce physique, caisse tactile POS pro, formations pro)
    const hasActiveSubscription = license.pricingModel === 'subscription';
    if (hasActiveSubscription) {
      return {
        moduleKey: cleanKey,
        hasAccess: true,
        readOnly: false,
        requiresAccountOpening: false,
        isPayPerUse: false
      };
    }

    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: true,
      requiresAccountOpening: false,
      isSubscriptionRequired: true,
      isPayPerUse: false,
      ctaMessage: getSubscriptionRequiredCta(moduleType)
    };
  }

  return {
    moduleKey: cleanKey,
    hasAccess: true,
    readOnly: true,
    requiresAccountOpening: true,
    isPayPerUse: false,
    ctaMessage: getUniverseRequiredCta(moduleType)
  };
}

/**
 * Soumission du formulaire d'ouverture de compte (Commission ou Abonnement)
 */
export async function submitAccountOpeningTunnel(payload: {
  userId: string;
  accountType?: AccountTypeTier;
  monthlyLimit?: number;
  pricingModel?: PricingModelTier;
  subscriptionOption?: SubscriptionOptionTier | null;
  kycData: {
    fullName?: string;
    idCardUrl?: string;
    photoCaptureUrl?: string;
    email?: string;
    paymentNumber?: string;
    activityDomain?: string;
    activityDescription?: string;
    companyName?: string;
    legalDocuments?: string[];
    [key: string]: any;
  };
  organizationId?: string | null;
}) {
  const isParticulier = payload.accountType === 'particulier' || payload.pricingModel === 'commission';
  const effectivePricingModel = payload.pricingModel || (isParticulier ? 'commission' : 'subscription');

  const response = await fetch('/api/account-activation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'submit_kyc',
      ...payload,
      accountType: isParticulier ? 'particulier' : 'entreprise',
      monthlyLimit: isParticulier ? 1000000 : 5000000,
      pricingModel: effectivePricingModel,
    })
  });

  const data = await response.json();

  if (data.success) {
    // Mettre à jour le cache local
    const current = getLocalUserLicense(payload.userId);
    const updatedLicense: UserContextualLicense = {
      ...current,
      accountType: isParticulier ? 'particulier' : 'entreprise',
      monthlyLimit: isParticulier ? 1000000 : 5000000,
      pricingModel: effectivePricingModel,
      subscriptionOption: payload.subscriptionOption || null,
      kycStatus: isParticulier ? 'light' : 'full',
      enabledThemes: data.enabled_themes || ['theme-default', 'theme-electro-tech', 'theme-digital-pro', 'theme-livestream-pro', 'theme-service-portfolio']
    };
    saveLocalUserLicense(updatedLicense);
  }

  return data;
}

/**
 * Consommation d'un module pay-per-use débité directement du Wallet sans KYC
 */
export async function consumeWalletForPayPerUse(params: {
  userId: string;
  moduleKey: string;
  amount: number;
  description?: string;
}) {
  const response = await fetch('/api/account-activation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'pay_per_use',
      ...params
    })
  });

  const data = await response.json();

  if (data.success && typeof data.new_balance === 'number') {
    const current = getLocalUserLicense(params.userId);
    saveLocalUserLicense({
      ...current,
      walletBalance: data.new_balance
    });
  }

  return data;
}

/**
 * Achat à la carte d'un module et injection dans le Thème Gratuit
 */
export async function buyModuleAlaCarte(params: {
  userId: string;
  moduleKey: string;
  price: number;
}) {
  const response = await fetch('/api/account-activation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'inject_carte_module',
      ...params
    })
  });

  const data = await response.json();

  if (data.success) {
    const current = getLocalUserLicense(params.userId);
    const existing = current.injectedCarteModules || [];
    if (!existing.includes(params.moduleKey)) {
      saveLocalUserLicense({
        ...current,
        injectedCarteModules: [...existing, params.moduleKey]
      });
    }
  }

  return data;
}
