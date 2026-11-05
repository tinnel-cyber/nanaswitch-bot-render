/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Service de Détection & Résolution Multi-Tenant Marque Blanche (Custom Domains).
 * Permet de relier les noms de domaine personnalisés des clients Premium (ex: client-boutique.com)
 * et de charger directement leur boutique ou tunnel isolé sans exposer la landing page Nanasore.
 */

import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomDomainTenant } from '../types';

/**
 * Domaines natifs officiels de l'infrastructure SaaS Nanasore.
 * Sur ces domaines, l'application fonctionne avec le routage par chemin natif (/f/:slug, etc.).
 */
export const NATIVE_DOMAINS = [
  'nanasore.com',
  'nsore.shop',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
] as const;

/**
 * Nettoie et normalise un nom de domaine ou hostname.
 * - Supprime le protocole (http/https)
 * - Supprime les ports (:3000, :5173, etc.)
 * - Supprime les barres obliques de fin
 * - Convertit en minuscules
 */
export function cleanDomain(domain: string): string {
  if (!domain) return '';
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split(':')[0] // Supprime le port éventuel
    .split('/')[0] // Supprime le chemin éventuel
    .replace(/\/+$/, '');
}

/**
 * Sous-domaines techniques réservés de l'infrastructure SaaS Nanasore.
 */
export const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'admin',
  'api',
  'hosting',
  'mail',
  'staging',
  'dev',
  'test'
] as const;

/**
 * Extrait un identifiant de tunnel si présent en paramètre d'URL (?subdomain=... / ?deal=... / ?funnel=...).
 * Utilisé principalement pour le test local rapide.
 */
export function extractSubdomain(rawHostname: string): string | null {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const emulatedSub = params.get('subdomain') || params.get('shop') || params.get('deal') || params.get('funnel') || params.get('tunnel');
    if (emulatedSub) {
      const cleanSub = emulatedSub.trim().toLowerCase();
      if (!RESERVED_SUBDOMAINS.includes(cleanSub as any)) return cleanSub;
    }
  }

  const host = cleanDomain(rawHostname);
  if (!host) return null;

  // Support des anciens sous-domaines pour rétrocompatibilité d'URL
  if (host.endsWith('.nanasore.com')) {
    const sub = host.slice(0, -'.nanasore.com'.length);
    if (sub && !RESERVED_SUBDOMAINS.includes(sub as any)) {
      return sub;
    }
  }

  if (host.endsWith('.nsore.shop')) {
    const sub = host.slice(0, -'.nsore.shop'.length);
    if (sub && !RESERVED_SUBDOMAINS.includes(sub as any)) {
      return sub;
    }
  }

  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length);
    if (sub && !RESERVED_SUBDOMAINS.includes(sub as any)) {
      return sub;
    }
  }

  return null;
}

/**
 * Détecte si le hostname donné est un domaine natif SaaS Nanasore.
 * TOUS les domaines et sous-domaines Nanasore (*.nanasore.com, *.nsore.shop, localhost, web.app)
 * sont reconnus comme natifs et utilisent le routage par chemin instantané (/f/:slug).
 * Aucun de ces domaines ne déclenche de recherche externe Custom Domain !
 */
export function isNativeDomain(rawHostname: string): boolean {
  const host = cleanDomain(rawHostname);
  if (!host) return true;

  // Environnements locaux
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.localhost')
  ) {
    return true;
  }

  // Domaines officiels Nanasore et leurs sous-domaines
  if (
    host === 'nanasore.com' ||
    host.endsWith('.nanasore.com') ||
    host === 'nsore.shop' ||
    host.endsWith('.nsore.shop') ||
    host.includes('web.app') ||
    host.includes('firebaseapp.com') ||
    host.includes('cloudflarepreviews.com') ||
    host.includes('workers.dev') ||
    host.includes('onrender.com')
  ) {
    return true;
  }

  return false;
}

/**
 * Détecte si le hostname est la racine SaaS officielle.
 */
export function isPlatformRootDomain(rawHostname: string): boolean {
  const host = cleanDomain(rawHostname);
  if (!host) return true;

  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') {
    return true;
  }

  if (
    host === 'nanasore.com' ||
    host === 'www.nanasore.com' ||
    host === 'nsore.shop' ||
    host === 'www.nsore.shop' ||
    host.includes('pages.dev') ||
    host === 'pos-app-1759a.web.app' ||
    host === 'pos-app-1759a.firebaseapp.com' ||
    host.includes('cloudflarepreviews.com') ||
    host.includes('workers.dev')
  ) {
    return true;
  }

  return false;
}

/**
 * Récupère le hostname courant avec support d'émulation pour les tests en local.
 */
export function detectCurrentHostname(): { hostname: string; isNative: boolean; isCustom: boolean } {
  if (typeof window !== 'undefined') {
    const rawHost = window.location.hostname;
    const params = new URLSearchParams(window.location.search);
    
    // Émulation via paramètre d'URL (ex: ?custom_domain=client-boutique.com)
    const emulated = params.get('custom_domain') || params.get('test_domain') || params.get('customDomain');
    const hostname = cleanDomain(emulated || rawHost);

    const native = isNativeDomain(hostname);
    return {
      hostname,
      isNative: native,
      isCustom: !native
    };
  }

  return { hostname: 'localhost', isNative: true, isCustom: false };
}

/**
 * Résout un véritable Domaine Personnalisé externe (ex: client-boutique.com)
 * en interrogeant la collection standardisée 'tenants' de Firestore.
 * - Ne résout JAMAIS les domaines natifs (nanasore.com).
 * - Utilise un cache LocalStorage pour chargement instantané à 0ms.
 * - AUCUNE création automatique (auto-provisioning) de données factices.
 */
export async function resolveCustomDomain(domain: string): Promise<CustomDomainTenant | null> {
  const clean = cleanDomain(domain);
  if (!clean || isNativeDomain(clean)) {
    return null;
  }

  // Variantes du domaine (avec et sans www.)
  const variants = [clean];
  if (clean.startsWith('www.')) {
    variants.push(clean.replace(/^www\./, ''));
  } else {
    variants.push(`www.${clean}`);
  }

  const cacheKey = `nana_resolved_tenant_domain_${clean}`;

  // 1. Hydratation immédiate depuis le cache local si disponible
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as CustomDomainTenant;
      if (parsed && (parsed.storeId || parsed.funnelId || parsed.customDomain)) {
        console.log(`[CUSTOM-DOMAIN] Tenant restauré instantanément depuis le cache pour ${clean}:`, parsed.storeName || parsed.storeId);
        // Rafraîchissement asynchrone non-bloquant
        fetchTenantFromFirestore(variants, cacheKey).catch(() => {});
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[CUSTOM-DOMAIN] Erreur lecture cache tenant:', e);
  }

  // 2. Requête en direct dans Firestore
  return await fetchTenantFromFirestore(variants, cacheKey);
}

/**
 * Recherche le domaine personnalisé dans la collection 'tenants' de Firestore.
 */
async function fetchTenantFromFirestore(variants: string[], cacheKey: string): Promise<CustomDomainTenant | null> {
  try {
    for (const hostVariant of variants) {
      // A. Recherche directe par ID de document dans 'tenants' (clé = nom de domaine propre)
      try {
        const directSnap = await getDoc(doc(db, 'tenants', hostVariant));
        if (directSnap.exists()) {
          const tData = directSnap.data();
          const funnelId = tData.funnelId || tData.storeId || directSnap.id;
          const funnelSlug = tData.funnelSlug || tData.slug || funnelId;

          // Hydratation des données du funnel si non présentes
          let funnelData = tData.funnelData;
          if (!funnelData && funnelSlug) {
            try {
              const fSnap = await getDoc(doc(db, 'funnels', funnelSlug));
              if (fSnap.exists()) {
                funnelData = fSnap.data();
              }
            } catch {}
          }

          const tenant: CustomDomainTenant = {
            storeId: tData.storeId || directSnap.id,
            storeName: tData.storeName || funnelData?.title || funnelData?.funnelTitle || 'Boutique Partenaire',
            customDomain: tData.customDomain || hostVariant,
            type: tData.type || 'funnel',
            vendorType: tData.vendorType || 'funnel',
            funnelId,
            funnelSlug,
            dealSlug: tData.dealSlug || funnelSlug,
            funnelData,
            logoUrl: tData.logoUrl || funnelData?.ogImageUrl || funnelData?.image || '',
            primaryColor: tData.primaryColor || funnelData?.brandColor || '#10b981',
            whatsappPhone: tData.whatsappPhone || funnelData?.merchantWhatsapp || '',
            whiteLabel: {
              hidePoweredBy: true,
              hideReceiptLogo: true,
              customFaviconUrl: tData.customFaviconUrl || funnelData?.faviconUrl || ''
            },
            ...tData
          };

          try {
            localStorage.setItem(cacheKey, JSON.stringify(tenant));
          } catch {}

          return tenant;
        }
      } catch (e) {
        console.warn(`[CUSTOM-DOMAIN] Erreur getDoc direct tenants/${hostVariant}:`, e);
      }

      // B. Recherche par champ customDomain dans 'tenants'
      try {
        const q = query(collection(db, 'tenants'), where('customDomain', '==', hostVariant));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const tData = docSnap.data();
          const funnelId = tData.funnelId || tData.storeId || docSnap.id;
          const funnelSlug = tData.funnelSlug || tData.slug || funnelId;

          let funnelData = tData.funnelData;
          if (!funnelData && funnelSlug) {
            try {
              const fSnap = await getDoc(doc(db, 'funnels', funnelSlug));
              if (fSnap.exists()) {
                funnelData = fSnap.data();
              }
            } catch {}
          }

          const tenant: CustomDomainTenant = {
            storeId: tData.storeId || docSnap.id,
            storeName: tData.storeName || funnelData?.title || funnelData?.funnelTitle || 'Boutique Partenaire',
            customDomain: tData.customDomain || hostVariant,
            type: tData.type || 'funnel',
            vendorType: tData.vendorType || 'funnel',
            funnelId,
            funnelSlug,
            dealSlug: tData.dealSlug || funnelSlug,
            funnelData,
            logoUrl: tData.logoUrl || funnelData?.ogImageUrl || funnelData?.image || '',
            primaryColor: tData.primaryColor || funnelData?.brandColor || '#10b981',
            whatsappPhone: tData.whatsappPhone || funnelData?.merchantWhatsapp || '',
            whiteLabel: {
              hidePoweredBy: true,
              hideReceiptLogo: true,
              customFaviconUrl: tData.customFaviconUrl || funnelData?.faviconUrl || ''
            },
            ...tData
          };

          try {
            localStorage.setItem(cacheKey, JSON.stringify(tenant));
          } catch {}

          return tenant;
        }
      } catch (e) {
        console.warn(`[CUSTOM-DOMAIN] Erreur query tenants customDomain == ${hostVariant}:`, e);
      }
    }

    return null;
  } catch (err) {
    console.error('[CUSTOM-DOMAIN] Échec de la résolution du domaine personnalisé:', err);
    return null;
  }
}

/**
 * Enregistre un nom de domaine personnalisé externe dans Firestore ('tenants')
 * et met à jour le funnel associé ('funnels/{funnelSlug}').
 */
export async function saveTenantCustomDomain(
  storeId: string,
  rawDomain: string,
  metadata?: Partial<CustomDomainTenant>
): Promise<boolean> {
  const clean = cleanDomain(rawDomain);
  if (!storeId || !clean) return false;

  // Refuser d'enregistrer des domaines natifs Nanasore comme domaine personnalisé externe
  if (isNativeDomain(clean)) {
    console.warn('[CUSTOM-DOMAIN] Impossible d\'enregistrer un domaine système Nanasore comme domaine personnalisé.');
    return false;
  }

  const timestamp = new Date().toISOString();
  const funnelSlug = metadata?.funnelSlug || metadata?.dealSlug || storeId;
  const payload: Partial<CustomDomainTenant> = {
    storeId,
    customDomain: clean,
    funnelId: metadata?.funnelId || storeId,
    funnelSlug,
    dealSlug: funnelSlug,
    type: metadata?.type || 'funnel',
    vendorType: metadata?.vendorType || 'funnel',
    updatedAt: timestamp,
    ...metadata
  };

  try {
    // 1. Sauvegarde dans la table unique des domaines personnalisés 'tenants'
    await setDoc(doc(db, 'tenants', clean), payload, { merge: true });

    // 2. Mise à jour de la référence customDomain sur le document canonique du tunnel
    try {
      await updateDoc(doc(db, 'funnels', funnelSlug), {
        customDomain: clean,
        updatedAt: Date.now()
      });
    } catch {}

    // 3. Mise en cache local pour résolution instantanée
    try {
      localStorage.setItem(`nana_custom_domain_${storeId}`, clean);
      localStorage.setItem('nana_custom_domain', clean);
      localStorage.setItem(`nana_resolved_tenant_domain_${clean}`, JSON.stringify({
        storeId,
        customDomain: clean,
        funnelSlug,
        ...metadata
      }));
    } catch {}

    console.log(`[CUSTOM-DOMAIN] Domaine personnalisé ${clean} relié avec succès au tunnel ${funnelSlug} !`);
    return true;
  } catch (error) {
    console.error('[CUSTOM-DOMAIN] Erreur sauvegarde domaine personnalisé:', error);
    return false;
  }
}

/**
 * Dissocie et supprime un domaine personnalisé externe
 */
export async function removeTenantCustomDomain(storeId: string, domainToRemove?: string): Promise<boolean> {
  try {
    const domain = domainToRemove ? cleanDomain(domainToRemove) : localStorage.getItem(`nana_custom_domain_${storeId}`);
    if (domain) {
      await deleteDoc(doc(db, 'tenants', domain)).catch(() => {});
      localStorage.removeItem(`nana_resolved_tenant_domain_${domain}`);
    }
    localStorage.removeItem(`nana_custom_domain_${storeId}`);
    try {
      await updateDoc(doc(db, 'funnels', storeId), {
        customDomain: null,
        updatedAt: Date.now()
      });
    } catch {}
    return true;
  } catch (e) {
    console.warn('[CUSTOM-DOMAIN] Erreur suppression domaine personnalisé:', e);
    return false;
  }
}
