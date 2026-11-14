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

export type KycStatusTier = 'none' | 'light' | 'full';
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
  AI_VIDEO_MEDIA: 150, // 150 FCFA par création vidéo publicitaire ou visuel IA
  DOCUSIGN: 300,       // 300 FCFA par signature certifiée
  SMS_OTP: 25,         // 25 FCFA par SMS
  WHATSAPP_MSG: 35     // 35 FCFA par notification WhatsApp
} as const;

// Modules Gratuits inclus d'office (PAS de theme-builder, accessible en preview)
export const FREE_MODULES = ['nanamarket', 'scanner', 'nana-switch', 'academic-upload'] as const;

// Thèmes inclus dans l'Offre Gratuite : Le thème Electro pro et le thème Élite Default
export const FREE_THEMES = ['theme-default', 'theme-electro-tech'] as const;

// Modules Commerce Physique
export const PHYSICAL_COMMERCE_MODULES = ['pos', 'studio', 'inventory', 'scanner', 'debts', 'analytics', 'team-employees'] as const;

// Modules Digitaux & Formation
export const DIGITAL_FORMATION_MODULES = ['cours-forge', 'course-create', 'academy-support', 'wameet', 'webinar'] as const;

const LOCAL_LICENSE_KEY = 'nana_contextual_license_v1';

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
 * Évalue contextuellement si un module est en lecture seule ou actif
 */
export function evaluateClientModuleAccess(
  moduleKey: string,
  licenseProp?: Partial<UserContextualLicense> | null
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

  // 3. Modules Gratuits
  const isFree = FREE_MODULES.some(k => cleanKey.includes(k) || k.includes(cleanKey));
  if (isFree) {
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: false,
      requiresAccountOpening: false,
      isPayPerUse: false
    };
  }

  // 4. Utilisateur sans KYC / Sans compte validé (Accès Général)
  // RÈGLE : Mode Lecture / Preview pour les Modules Métiers jusqu'à identification légale
  if (!license.kycStatus || license.kycStatus === 'none') {
    return {
      moduleKey: cleanKey,
      hasAccess: true,
      readOnly: true,
      requiresAccountOpening: true,
      isPayPerUse: false,
      ctaMessage: 'Identification juridique requise pour encaisser avec ce module'
    };
  }

  // 5. Compte Particulier ou Entreprise validé :
  // Le titulaire est juridiquement identifié et autorisé à opérer
  // (commerce physique avec caisse POS et boutique, vente en ligne, académie et cours, etc.)
  // dans la limite de son plafond mensuel d'encaissement (1 000 000 FCFA pour Particulier, 5 000 000 FCFA pour Entreprise).
  // L'ouverture de compte n'étant pas une souscription tarifaire, elle ne restreint pas l'accès
  // d'un particulier au commerce physique s'il choisit cette activité.
  return {
    moduleKey: cleanKey,
    hasAccess: true,
    readOnly: false,
    requiresAccountOpening: false,
    isPayPerUse: false
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
      enabledThemes: data.enabled_themes || ['theme-default', 'theme-electro-tech', 'theme-digital-pro', 'theme-livestream-pro']
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
