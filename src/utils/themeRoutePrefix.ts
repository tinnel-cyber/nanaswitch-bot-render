/**
 * @file themeRoutePrefix.ts
 * @description Gestionnaire officiel des préfixes de routes publiques Nanasore (nsore.shop)
 * 
 * Règles d'attribution :
 * 1. Thèmes déjà présents : 2 premières lettres de leurs deux mots (ex: Standard Élite -> 'se', Digital Pro -> 'dp')
 *    Ces deux consonnes ne se mélangent JAMAIS avec les chiffres romains des blank themes.
 * 2. Blank Themes : comptage en chiffres romains (1er -> 'i' (alias 'l'), 2e -> 'ii' (alias 'll'), 5e -> 'v', 10e -> 'x')
 * 3. Structure d'URL finale : https://nsore.shop/{themePrefix}/{storeSlug}
 *    Avec produit : https://nsore.shop/{themePrefix}/{storeSlug}/p/{productSlug}
 *    Avec funnel : https://nsore.shop/{themePrefix}/{storeSlug}/f/{funnelSlug}
 */

// Mapping des thèmes présents prédéfinis vers leurs 2 initiales
export const PREDEFINED_THEME_PREFIXES: Record<string, string> = {
  'theme-default': 'se',        // Standard Élite
  'theme-digital-pro': 'dp',     // Digital Pro
  'theme-electro-tech': 'et',    // Electro Tech
  'theme-mega-store-pro': 'ms',  // Mega Store
  'theme-electro-orange': 'eo',  // Electro Orange
  'theme-beauty-emerald': 'ep',  // Émeraude Prestige
  'theme-livestream-pro': 'lp',  // LiveStream Pro
  'theme-minimal': 'mc',         // Minimal Clean
  'theme-grid': 'gs',            // Grid Store
};

// Inversion pour décodage rapide depuis l'URL
export const PREFIX_TO_THEME_ID: Record<string, string> = {
  se: 'theme-default',
  dp: 'theme-digital-pro',
  et: 'theme-electro-tech',
  ms: 'theme-mega-store-pro',
  mp: 'theme-mega-store-pro',
  eo: 'theme-electro-orange',
  ep: 'theme-beauty-emerald',
  be: 'theme-beauty-emerald',
  lp: 'theme-livestream-pro',
  sl: 'theme-livestream-pro',
  mc: 'theme-minimal',
  gs: 'theme-grid',
};

/**
 * Convertit un entier en chiffre romain en minuscules
 * (1 -> i, 2 -> ii, 3 -> iii, 4 -> iv, 5 -> v, 10 -> x, etc.)
 */
export function toRomanNumeral(num: number): string {
  if (!num || num <= 0) return 'i';
  const lookup: Array<[number, string]> = [
    [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
    [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
  ];
  let roman = '';
  let n = Math.floor(num);
  for (const [val, letter] of lookup) {
    while (n >= val) {
      roman += letter;
      n -= val;
    }
  }
  return roman || 'i';
}

/**
 * Décode un chiffre romain (avec support de l'alias clavier l / ll tapé à la place de i / ii)
 */
export function fromRomanNumeral(str: string): number | null {
  const clean = (str || '').toLowerCase().trim();
  if (!clean) return null;

  // Support des alias clavier l / ll / lll pour les blank themes
  if (clean === 'l') return 1;
  if (clean === 'll') return 2;
  if (clean === 'lll') return 3;

  const romanMap: Record<string, number> = {
    i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000
  };

  let total = 0;
  let prev = 0;
  for (let i = clean.length - 1; i >= 0; i--) {
    const char = clean[i];
    const curr = romanMap[char];
    if (!curr) return null; // Contient un caractère non romain
    if (curr < prev) {
      total -= curr;
    } else {
      total += curr;
      prev = curr;
    }
  }
  return total > 0 ? total : null;
}

/**
 * Attribue le préfixe de route pour un thème donné :
 * - Thème existant : 2 lettres (ex: 'se', 'dp', 'et', 'ms', 'eo', 'ep', 'lp')
 * - Blank Theme : chiffre romain ('i', 'ii', 'v', 'x'...)
 */
export function getThemeRoutePrefix(themeId?: string, blankIndex = 1): string {
  if (!themeId) return 'se';
  const cleanId = themeId.toLowerCase().trim();

  // Si c'est un Blank Theme
  if (cleanId.includes('blank') || cleanId.startsWith('custom-') || cleanId === 'theme-blank-custom') {
    const matchNum = cleanId.match(/(\d+)/);
    const index = matchNum ? parseInt(matchNum[1], 10) : blankIndex;
    return toRomanNumeral(index || 1);
  }

  // Si c'est un thème prédéfini répertorié
  if (PREDEFINED_THEME_PREFIXES[cleanId]) {
    return PREDEFINED_THEME_PREFIXES[cleanId];
  }

  return 'se';
}

/**
 * Résout le thème et les paramètres à partir d'un segment de préfixe d'URL
 */
export function resolveThemeFromPrefix(prefix: string): { themeId: string; isBlank: boolean; blankIndex?: number } | null {
  const clean = (prefix || '').toLowerCase().trim();
  if (!clean) return null;

  // 1. Thème prédéfini présent ?
  if (PREFIX_TO_THEME_ID[clean]) {
    return {
      themeId: PREFIX_TO_THEME_ID[clean],
      isBlank: false
    };
  }

  // 1-bis. Support alias b1, b2, b3... pour les Blank Themes
  const bMatch = clean.match(/^b(\d+)$/);
  if (bMatch) {
    return {
      themeId: 'theme-blank-custom',
      isBlank: true,
      blankIndex: parseInt(bMatch[1], 10)
    };
  }

  // 2. Chiffre romain (Blank Theme) ?
  const romanNum = fromRomanNumeral(clean);
  if (romanNum !== null) {
    return {
      themeId: 'theme-blank-custom',
      isBlank: true,
      blankIndex: romanNum
    };
  }

  return null;
}

/**
 * Expression régulière pour identifier les préfixes de thèmes publics valides :
 * - Thèmes présents : se|dp|et|ms|mp|eo|ep|be|lp|sl|mc|gs
 * - Alias thèmes blank : b1, b2, b3... ou chiffres romains i|l|ii|ll|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx
 */
export const THEME_PREFIX_REGEX = /^(?:se|dp|et|ms|mp|eo|ep|be|lp|sl|mc|gs|b\d+|[ivxlcdm]+|l{1,3})$/i;

export interface PublicStoreRouteParams {
  storeIdFromPath: string | null;
  productIdFromPath: string | null;
  themePrefix: string | null;
  themeId: string | null;
}

/**
 * Analyse de manière 100% blindée et sans risque de ReferenceError n'importe quel chemin d'URL
 * pour en extraire le storeSlug, productSlug et themePrefix.
 */
export function extractPublicStoreRouteParams(pathname: string): PublicStoreRouteParams {
  const result: PublicStoreRouteParams = {
    storeIdFromPath: null,
    productIdFromPath: null,
    themePrefix: null,
    themeId: null
  };

  if (!pathname || typeof pathname !== 'string') return result;

  try {
    const cleanPath = pathname.trim();

    // 1. Détection des URL publiques avec préfixes de thèmes et produit : /{themePrefix}/:store/p/:product
    const themeProductMatch = cleanPath.match(/^\/([a-z0-9]+)\/([^/?#]+)\/(?:p|produit|produits)\/([^/?#]+)/i);
    if (themeProductMatch && THEME_PREFIX_REGEX.test(themeProductMatch[1])) {
      const prefix = themeProductMatch[1].toLowerCase();
      const resolved = resolveThemeFromPrefix(prefix);
      result.storeIdFromPath = decodeURIComponent(themeProductMatch[2]);
      result.productIdFromPath = decodeURIComponent(themeProductMatch[3]);
      result.themePrefix = prefix;
      result.themeId = resolved?.themeId || null;
      return result;
    }

    // 2. Détection des URL publiques avec préfixes de thèmes boutique : /{themePrefix}/:store
    const themeStoreMatch = cleanPath.match(/^\/([a-z0-9]+)\/([^/?#]+)/i);
    if (themeStoreMatch && THEME_PREFIX_REGEX.test(themeStoreMatch[1]) && !cleanPath.startsWith('/dashboard/')) {
      const prefix = themeStoreMatch[1].toLowerCase();
      const resolved = resolveThemeFromPrefix(prefix);
      result.storeIdFromPath = decodeURIComponent(themeStoreMatch[2]);
      result.themePrefix = prefix;
      result.themeId = resolved?.themeId || null;
      return result;
    }

    // 3. URLs classiques /s/:store/p/:product, /boutique/:store/p/:product, /shop/:store/p/:product, etc.
    const cleanProductMatch = cleanPath.match(/^\/(?:s|boutique|shop|store|vitrine)\/([^/?#]+)\/(?:p|produit|produits)\/([^/?#]+)/i);
    if (cleanProductMatch) {
      result.storeIdFromPath = decodeURIComponent(cleanProductMatch[1]);
      result.productIdFromPath = decodeURIComponent(cleanProductMatch[2]);
      return result;
    }

    if (cleanPath.startsWith('/dashboard/vitrine/')) {
      result.storeIdFromPath = decodeURIComponent(cleanPath.split('/dashboard/vitrine/')[1]?.split('/')[0]?.split('?')[0] || '');
      return result;
    }
    if (cleanPath.startsWith('/dashboard/boutique/')) {
      result.storeIdFromPath = decodeURIComponent(cleanPath.split('/dashboard/boutique/')[1]?.split('/')[0]?.split('?')[0] || '');
      return result;
    }
    if (cleanPath.startsWith('/s/')) {
      result.storeIdFromPath = decodeURIComponent(cleanPath.split('/s/')[1]?.split('/')[0]?.split('?')[0] || '');
      return result;
    }
    if (cleanPath.startsWith('/shop/')) {
      result.storeIdFromPath = decodeURIComponent(cleanPath.split('/shop/')[1]?.split('/')[0]?.split('?')[0] || '');
      return result;
    }
    if (cleanPath.startsWith('/boutique/')) {
      result.storeIdFromPath = decodeURIComponent(cleanPath.split('/boutique/')[1]?.split('/')[0]?.split('?')[0] || '');
      return result;
    }
    if (cleanPath.startsWith('/store/')) {
      result.storeIdFromPath = decodeURIComponent(cleanPath.split('/store/')[1]?.split('/')[0]?.split('?')[0] || '');
      return result;
    }
    if (cleanPath.startsWith('/vitrine/')) {
      result.storeIdFromPath = decodeURIComponent(cleanPath.split('/vitrine/')[1]?.split('/')[0]?.split('?')[0] || '');
      return result;
    }

    const pMatch = cleanPath.match(/^\/(?:p|produit|produits)\/([^/?#]+)/i);
    if (pMatch) {
      result.productIdFromPath = decodeURIComponent(pMatch[1]);
      return result;
    }

    // 4. Raccourci direct https://nsore.shop/:storeSlug
    const SYSTEM_ROUTES = [
      'login', 'register', 'signup', 'partenaire', 'partenaires', 'affiliate', 
      'affiliation', 'ai-studio', 'aistudio', 'generateur', 'generator', 'nana-generateur', 
      'builder', 'funnel-builder', 'pays-couverts', 'international', 'countries', 
      'coverage', 'catalog', 'courses', 'course', 'webinar', 'live', 'crm', 
      'crm-dashboard', 'docusign', 'devis', 'tarifs', 'admin', 'superadmin', 'saas-admin',
      'dashboard', 'studio', 'store-studio', 'nana-studio', 'f', 't', 'c', 'p', 's',
      'nana-switch', 'nanaswitch', 'nana-switch-app', 'nanaswitch-app',
      'nana-switch-apppage', 'nanaswitch-apppage', 'nanaswitch-docs',
      'app', 'apps', 'docs', 'documentation', 'hub-builder', 'pos',
      'market', 'market-directory', 'directory', 'annuaire',
      'certificat', 'certificate', 'diplome', 'checkout', 'payment', 'checkout-return',
      'instructor', 'classroom', 'auth', 'teacher-dashboard',
      'salles-vip', 'salle-vip', 'vip', 'salles',
      'wameet', 'communaute', 'community', 'reseau', 'wameet-room',
      'deconnexion', 'logout', 'mentions-legales', 'cgu', 'privacy'
    ];
    const firstSegment = cleanPath.split('/')[1]?.split('?')[0]?.toLowerCase();
    if (firstSegment && !SYSTEM_ROUTES.includes(firstSegment)) {
      result.storeIdFromPath = decodeURIComponent(firstSegment);
      return result;
    }
  } catch (err) {
    console.warn('[ROUTING] Erreur analyse route publique :', err);
  }

  return result;
}
