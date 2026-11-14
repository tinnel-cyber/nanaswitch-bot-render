/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Configuration Centrale des Domaines Officiels Nanasore SaaS & nsore.shop
 * Architecture Dual-Domain :
 * - https://nanasore.com : Portail SaaS, Dashboard Vendeur, Funnel Builder et Administration.
 * - https://nsore.shop : Domaine court officiel dédié à l'affichage public des boutiques, aux ventes et au partage de liens (Facebook Ads, TikTok, WhatsApp).
 */

import { getThemeRoutePrefix, resolveThemeFromPrefix, toRomanNumeral, fromRomanNumeral } from '../utils/themeRoutePrefix';

export { getThemeRoutePrefix, resolveThemeFromPrefix, toRomanNumeral, fromRomanNumeral };

export const SAAS_ADMIN_ORIGIN = (import.meta.env?.VITE_ADMIN_ORIGIN as string) || 'https://nanasore.com';
export const PUBLIC_SHOP_ORIGIN = (import.meta.env?.VITE_SHOP_ORIGIN as string) || 'https://nsore.shop';

export interface BuildPublicShopUrlOptions {
  themeId?: string;
  blankIndex?: number;
  productSlug?: string;
  funnelSlugOrId?: string;
  funnelSlug?: string;
  previewTheme?: string;
}

/**
 * Helper universel pour générer tous les liens de partage public et voir en ligne côté vendeur.
 * Remplace immédiatement https://nanasore.com par https://nsore.shop dès le clic sur Activer ou Partager.
 * 
 * Format généré :
 * - Boutique : https://nsore.shop/{themePrefix}/{storeSlug}
 * - Produit : https://nsore.shop/{themePrefix}/{storeSlug}/p/{productSlug}
 * - Funnel : https://nsore.shop/{themePrefix}/{storeSlug}/f/{funnelSlug}
 */
export function buildPublicShopUrl(
  storeSlug: string, 
  options?: BuildPublicShopUrlOptions
): string {
  const cleanStoreSlug = (storeSlug || 'boutique')
    .trim()
    .replace(/^store-/, '');

  // Résolution du thème actif pour le préfixe
  let resolvedThemeId = options?.themeId || options?.previewTheme;
  if (!resolvedThemeId && typeof window !== 'undefined') {
    try {
      resolvedThemeId = localStorage.getItem('nana_active_theme_id') || 
        localStorage.getItem('nana_boutique_theme_id') || 
        undefined;
    } catch {}
  }

  const prefix = getThemeRoutePrefix(resolvedThemeId, options?.blankIndex || 1);

  let path = `/${prefix}/${encodeURIComponent(cleanStoreSlug)}`;
  if (options?.productSlug) {
    const cleanProdSlug = options.productSlug.trim().replace(/^prod-/, '');
    path += `/p/${encodeURIComponent(cleanProdSlug)}`;
  }
  const resolvedFunnel = options?.funnelSlugOrId || options?.funnelSlug;
  if (resolvedFunnel) {
    const cleanFunnel = resolvedFunnel.trim().replace(/^funnel-/, '');
    path += `/f/${encodeURIComponent(cleanFunnel)}`;
  }

  const params = new URLSearchParams();
  if (options?.previewTheme) {
    params.set('preview_theme', options.previewTheme);
  }
  
  const query = params.toString();
  return `${PUBLIC_SHOP_ORIGIN}${path}${query ? `?${query}` : ''}`;
}
