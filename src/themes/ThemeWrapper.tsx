/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ThemeWrapper - Le Routeur de Rendu Dynamique Storefront & Machine à États
 * 
 * Respecte strictement les règles d'architecture Dual-Domain (nanasore.com & nsore.shop) :
 * 1. Initialisation de l'état à NULL (Zéro Fallback Précoce sur 'theme-default')
 * 2. Verrou de rendu : Tant que Firestore n'a pas répondu, monte exclusivement <StorefrontNeutralLoader />
 * 3. Résolution Firestore autoritaire (sans AUCUNE lecture depuis le localStorage)
 * 4. Détection du paramètre URL ?f=:funnelSlug ou ?funnel= pour ouverture immédiate du <SlideOutFunnelDrawer />
 * 5. Isolation totale : Seul le thème résolu est monté dans le DOM, accompagné uniquement du tiroir et de la pastille de rappel.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { StoreThemeProps } from '../types/theme';
import { StoreProductItem } from '../components/storeBuilder/types';
import { getThemeDefinition, isValidTheme, normalizeThemeId } from './themeRegistry';
import { normalizeModularCustomization } from './themeCustomizationAdapter';
import { SlideOutFunnelDrawer } from '../components/funnel/SlideOutFunnelDrawer';
import { resolveProductFunnelEngine } from '../services/omniFunnelService';
import { StorefrontNeutralLoader } from '../components/common/StorefrontNeutralLoader';
import { fetchPublicStoreBySlugOrId, getSafeStoreSlug } from '../utils/slugService';
import { ThemeErrorBoundary } from '../components/theme/ThemeErrorBoundary';

interface ClosedFunnelState {
  id: string;
  title?: string;
}

export interface StoreData {
  id?: string;
  storeName?: string;
  name?: string;
  storeSlug?: string;
  slug?: string;
  activeThemeId?: string;
  active_theme_id?: string;
  [key: string]: any;
}

import { triggerOpenFunnel, useParams, useSearchParams } from './themeUtils';
export { triggerOpenFunnel, useParams, useSearchParams };

export const ThemeWrapper: React.FC<StoreThemeProps> = (props) => {
  const params = useParams<{ storeSlug?: string; slug?: string; productSlug?: string }>();
  const urlStoreSlug = params.storeSlug || params.slug;
  const [searchParams] = useSearchParams();

  // Détermination du slug effectif (priorité URL, fallback props storeConfig / id / getSafeStoreSlug)
  const effectiveStoreSlug = useMemo(() => {
    const resolved =
      (urlStoreSlug && urlStoreSlug.trim()) ||
      (props as any).storeSlug ||
      props.storeConfig?.slug ||
      getSafeStoreSlug(props.customConfig, props.storeConfig, { storeId: (props as any).targetStoreId }) ||
      'ma-boutique';
    if (typeof window !== 'undefined') {
      (window as any).storeSlug = resolved;
    }
    return resolved;
  }, [urlStoreSlug, (props as any).storeSlug, props.storeConfig, props.customConfig, (props as any).targetStoreId]);
  const storeSlug = effectiveStoreSlug;

  // Détection synchrone du paramètre de prévisualisation dans l'URL (?previewTheme= ou ?preview_theme= ou ?theme=)
  const urlPreviewTheme = useMemo(() => {
    const raw = searchParams.get('previewTheme') || searchParams.get('preview_theme') || searchParams.get('theme') || searchParams.get('preview');
    return (raw && isValidTheme(raw)) ? normalizeThemeId(raw) : null;
  }, [searchParams]);

  // Thème forcé ou fourni immédiatement par le parent (StoreStudioPage ou prop explicite)
  const directForcedTheme = useMemo(() => {
    if (urlPreviewTheme) return urlPreviewTheme;
    if (props.forcedThemeId && isValidTheme(props.forcedThemeId)) return normalizeThemeId(props.forcedThemeId);
    if (props.isAdminPreview) {
      const studioTheme = props.storeConfig?.active_theme_id || props.storeConfig?.activeThemeId;
      if (studioTheme && isValidTheme(studioTheme)) return normalizeThemeId(studioTheme);
    }
    return null;
  }, [urlPreviewTheme, props.forcedThemeId, props.isAdminPreview, props.storeConfig?.active_theme_id, props.storeConfig?.activeThemeId]);

  // =========================================================================
  // 1. MACHINE À ÉTATS STRICTE : INITIALISATION (Synchrone si déjà connu, sinon neutral loader)
  // =========================================================================
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [resolvedThemeId, setResolvedThemeId] = useState<string | null>(() => directForcedTheme);
  const [isLoading, setIsLoading] = useState<boolean>(() => directForcedTheme ? false : true);

  // État du tiroir dépliable de tunnel de vente
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null);
  const [activeFunnelProduct, setActiveFunnelProduct] = useState<StoreProductItem | null>(null);
  const [activeFunnelEngine, setActiveFunnelEngine] = useState<'t' | 'f' | 'c'>('t');
  const [currentFunnelTitle, setCurrentFunnelTitle] = useState<string | null>(null);

  // Mémoire du dernier tunnel fermé (pastille de rappel flottante)
  const [lastClosedFunnel, setLastClosedFunnel] = useState<ClosedFunnelState | null>(null);

  // Résolution Cloud Firestore autoritaire du Thème et des Métadonnées Storefront
  useEffect(() => {
    let isCancelled = false;

    // Si un thème forcé (Studio / prop / paramètre URL) est actif, synchroniser immédiatement
    if (directForcedTheme) {
      setResolvedThemeId(directForcedTheme);
      setIsLoading(false);
    }

    async function resolveStoreAndTheme() {
      if (!directForcedTheme) {
        setIsLoading(true);
      }
      try {
        const storeDoc = await fetchPublicStoreBySlugOrId(effectiveStoreSlug);
        if (isCancelled) return;

        if (storeDoc) {
          setStoreData(storeDoc);
          if (!directForcedTheme) {
            const docTheme = storeDoc.activeThemeId || storeDoc.active_theme_id || props.storeConfig?.active_theme_id || props.storeConfig?.activeThemeId;
            const finalTheme = (docTheme && isValidTheme(docTheme)) ? normalizeThemeId(docTheme) : 'theme-blank-custom';
            setResolvedThemeId(finalTheme);
          }
        } else {
          if (!directForcedTheme) {
            const fallback = props.storeConfig?.active_theme_id || props.storeConfig?.activeThemeId || 'theme-blank-custom';
            const finalTheme = (fallback && isValidTheme(fallback)) ? normalizeThemeId(fallback) : 'theme-blank-custom';
            setResolvedThemeId(finalTheme);
          }
        }
      } catch (err) {
        console.error("Erreur résolution boutique/thème Firestore :", err);
        if (!isCancelled && !directForcedTheme) {
          const fallback = props.storeConfig?.active_theme_id || 'theme-blank-custom';
          setResolvedThemeId((fallback && isValidTheme(fallback)) ? normalizeThemeId(fallback) : 'theme-blank-custom');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    resolveStoreAndTheme();

    return () => {
      isCancelled = true;
    };
  }, [effectiveStoreSlug, directForcedTheme, props.storeConfig?.active_theme_id, props.storeConfig?.activeThemeId]);

  // Écouteur global pour ouverture universelle du tiroir dépliable
  useEffect(() => {
    const handleCustomOpen = (e: any) => {
      if (e?.detail?.funnelId) {
        const matchedProd =
          e.detail.product ||
          props.allProducts?.find(
            (p) => p.linkedFunnelId === e.detail.funnelId || p.id === e.detail.funnelId
          ) ||
          null;
        const engine = resolveProductFunnelEngine(matchedProd, e.detail.resolvedEngine || null);
        setActiveFunnelProduct(matchedProd);
        setActiveFunnelEngine(engine);
        setActiveFunnelId(e.detail.funnelId);
        setCurrentFunnelTitle(e.detail.title || matchedProd?.name || null);
        setLastClosedFunnel(null);
      }
    };
    window.addEventListener('nana:open_funnel', handleCustomOpen);
    return () => window.removeEventListener('nana:open_funnel', handleCustomOpen);
  }, [props.allProducts]);

  // Détection du paramètre URL ?t=xyz, ?funnel=xyz ou ?f=xyz pour deep-linking de pub Facebook/TikTok
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlFunnelParam = searchParams.get('t') || searchParams.get('tunnel') || searchParams.get('funnel') || searchParams.get('f') || searchParams.get('c');
      if (urlFunnelParam) {
        const matched = props.allProducts?.find(
          (p) => p.linkedFunnelId === urlFunnelParam || p.id === urlFunnelParam
        ) || null;
        const explicitPrefix = searchParams.get('t') || searchParams.get('tunnel') ? 't' : searchParams.get('c') ? 'c' : searchParams.get('f') ? 'f' : null;
        const engine = resolveProductFunnelEngine(matched, explicitPrefix);
        setActiveFunnelProduct(matched);
        setActiveFunnelEngine(engine);
        setActiveFunnelId(urlFunnelParam);
        if (matched?.name) {
          setCurrentFunnelTitle(matched.name);
        }
      }
    } catch {}
  }, [searchParams, props.allProducts]);

  // Gestionnaire d'ouverture du tunnel depuis une carte produit (Priorité 1 : Funnel Modulaire 12 blocs)
  const handleOpenTunnel = useCallback((product: StoreProductItem) => {
    const funnelTarget = product.linkedFunnelId || product.id;
    const engine = resolveProductFunnelEngine(product);
    if (funnelTarget) {
      setActiveFunnelProduct(product);
      setActiveFunnelEngine(engine);
      setActiveFunnelId(funnelTarget);
      setCurrentFunnelTitle(product.name || null);
      setLastClosedFunnel(null);
    } else if (props.onOpenTunnel) {
      props.onOpenTunnel(product);
    }
  }, [props.onOpenTunnel]);

  const handleOpenFunnel = useCallback((product: StoreProductItem, e?: React.MouseEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const funnelTarget = product.linkedFunnelId || product.id;
    const engine = resolveProductFunnelEngine(product);
    if (funnelTarget) {
      setActiveFunnelProduct(product);
      setActiveFunnelEngine(engine);
      setActiveFunnelId(funnelTarget);
      setCurrentFunnelTitle(product.name || null);
      setLastClosedFunnel(null);
    } else if (props.onOpenFunnel) {
      props.onOpenFunnel(product, e as any);
    }
  }, [props.onOpenFunnel]);

  const handleEditProduct = useCallback((product: StoreProductItem, options?: { initialCard?: number }) => {
    if (props.onEditProduct) {
      props.onEditProduct(product, options);
    } else if (props.onOpenEditProduct) {
      props.onOpenEditProduct(product);
    }
  }, [props.onEditProduct, props.onOpenEditProduct]);

  const handleOpenEditProduct = useCallback((product: StoreProductItem) => {
    if (props.onOpenEditProduct) {
      props.onOpenEditProduct(product);
    } else if (props.onEditProduct) {
      props.onEditProduct(product);
    }
  }, [props.onOpenEditProduct, props.onEditProduct]);

  const handleSelectProduct = useCallback((product: StoreProductItem) => {
    if (props.isAdminPreview) {
      if (props.onEditProduct) {
        props.onEditProduct(product);
      } else if (props.onOpenEditProduct) {
        props.onOpenEditProduct(product);
      }
      return;
    }
    if (props.onSelectProduct) {
      props.onSelectProduct(product);
    }
  }, [props.isAdminPreview, props.onEditProduct, props.onOpenEditProduct, props.onSelectProduct]);

  // Fermeture du tiroir et repli propre sans rechargement
  const handleCloseDrawer = useCallback(() => {
    if (activeFunnelId) {
      setLastClosedFunnel({
        id: activeFunnelId,
        title: currentFunnelTitle || undefined
      });
    }
    setActiveFunnelId(null);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('f') || url.searchParams.has('funnel')) {
          url.searchParams.delete('f');
          url.searchParams.delete('funnel');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
        }
      } catch {}
    }
  }, [activeFunnelId, currentFunnelTitle]);

  // Réouverture via la pastille flottante
  const handleReopenLastFunnel = useCallback(() => {
    if (lastClosedFunnel) {
      setActiveFunnelId(lastClosedFunnel.id);
      setCurrentFunnelTitle(lastClosedFunnel.title || null);
      setLastClosedFunnel(null);
    }
  }, [lastClosedFunnel]);

  // Masquer la pastille définitivement (croix ✕)
  const handleDismissLastFunnelPill = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLastClosedFunnel(null);
  }, []);

  // Détection du mode prévisualisation dynamique Shopify-like (?preview_theme=... ou ?previewTheme=...)
  const previewThemeId = useMemo(() => {
    return urlPreviewTheme || searchParams.get('preview_theme') || searchParams.get('previewTheme') || null;
  }, [urlPreviewTheme, searchParams]);

  const handleExitPreview = () => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('preview_theme');
      url.searchParams.delete('previewTheme');
      window.location.href = url.pathname + (url.search ? url.search : '') + url.hash;
    } catch {
      window.location.reload();
    }
  };

  // Synchronisation globale de isAdminPreview dans window pour les thèmes et composants enfants
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).isAdminPreview = Boolean(props.isAdminPreview);
    }
  }, [props.isAdminPreview]);

  // Résolution et adaptation de la personnalisation modulaire (Priorité prop Studio > Firestore)
  const rawCustomConfig = useMemo(() => {
    const fromProps = props.customConfig;
    const fromFirestore = storeData?.themeCustomization || (storeData?.customization ? { customization: storeData.customization } : null);
    const merged = fromProps || fromFirestore || {};
    if (storeData?.customization && !merged.customization) {
      return { ...merged, customization: storeData.customization };
    }
    return merged;
  }, [props.customConfig, storeData]);

  const effectiveCustomConfig = useMemo(() => {
    return normalizeModularCustomization(rawCustomConfig, props.storeConfig || storeData);
  }, [rawCustomConfig, props.storeConfig, storeData]);

  // Fusion transparente des données Firestore & CustomConfig dans storeConfig (Exécuté inconditionnellement avant tout return)
  const effectiveStoreConfig = useMemo(() => {
    return {
      ...props.storeConfig,
      ...(storeData ? {
        storeName: storeData.storeName || props.storeConfig?.storeName,
        name: storeData.storeName || storeData.name || props.storeConfig?.name,
        slug: storeData.storeSlug || storeData.slug || props.storeConfig?.slug,
        whatsappPhone: storeData.whatsappPhone || props.storeConfig?.whatsappPhone,
        welcomeText: storeData.welcomeText || props.storeConfig?.welcomeText,
        logoUrl: storeData.logoUrl || props.storeConfig?.logoUrl,
        bannerImage: storeData.bannerImage || props.storeConfig?.bannerImage,
        promoBanners: storeData.promoBanners || props.storeConfig?.promoBanners,
        paymentTickerText: storeData.paymentTickerText || props.storeConfig?.paymentTickerText,
        tickerBgGradient: storeData.tickerBgGradient || props.storeConfig?.tickerBgGradient,
        showPaymentTicker: storeData.showPaymentTicker !== undefined ? storeData.showPaymentTicker : props.storeConfig?.showPaymentTicker,
        fbPixelId: storeData.fbPixelId || props.storeConfig?.fbPixelId,
        tiktokPixelId: storeData.tiktokPixelId || props.storeConfig?.tiktokPixelId
      } : {}),
      ...(effectiveCustomConfig ? {
        storeName: effectiveCustomConfig.storeName || storeData?.storeName || props.storeConfig?.storeName,
        whatsappPhone: effectiveCustomConfig.whatsappNumber || storeData?.whatsappPhone || props.storeConfig?.whatsappPhone,
        logoUrl: effectiveCustomConfig.logoUrl || storeData?.logoUrl || props.storeConfig?.logoUrl,
        paymentTickerText: effectiveCustomConfig.announcementBarText || storeData?.paymentTickerText || props.storeConfig?.paymentTickerText,
        showPaymentTicker: effectiveCustomConfig.announcementBarEnabled !== undefined ? effectiveCustomConfig.announcementBarEnabled : props.storeConfig?.showPaymentTicker,
        bannerImage: effectiveCustomConfig.heroBannerImageUrl || storeData?.bannerImage || props.storeConfig?.bannerImage,
        primaryColor: effectiveCustomConfig.primaryAccentColor || props.storeConfig?.primaryColor
      } : {}),
      active_theme_id: resolvedThemeId || directForcedTheme || props.storeConfig?.active_theme_id || 'theme-blank-custom'
    };
  }, [props.storeConfig, storeData, effectiveCustomConfig, resolvedThemeId, directForcedTheme]);

  // Bannières réactives pour le Hero du Thème (Hook inconditionnel : Strict Rules of Hooks)
  const effectiveDisplayBanners = useMemo(() => {
    if (props.displayBanners && props.displayBanners.length > 0) {
      if (effectiveCustomConfig?.heroBannerImageUrl || effectiveCustomConfig?.heroTitle || effectiveCustomConfig?.heroSubtitle) {
        return [
          {
            ...props.displayBanners[0],
            image: effectiveCustomConfig.heroBannerImageUrl || props.displayBanners[0].image,
            title: effectiveCustomConfig.heroTitle || props.displayBanners[0].title,
            subtitle: effectiveCustomConfig.heroDescription || effectiveCustomConfig.heroSubtitle || props.displayBanners[0].subtitle,
            badge: effectiveCustomConfig.heroSubtitle || props.displayBanners[0].badge
          },
          ...props.displayBanners.slice(1)
        ];
      }
      return props.displayBanners;
    }
    if (effectiveCustomConfig) {
      return [
        {
          image: effectiveCustomConfig.heroBannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80",
          title: effectiveCustomConfig.heroTitle || effectiveStoreConfig.storeName,
          subtitle: effectiveCustomConfig.heroDescription || "Découvrez notre collection d'exception",
          badge: effectiveCustomConfig.heroSubtitle || "OFFRE EXCLUSIVE"
        }
      ];
    }
    return props.displayBanners || [];
  }, [props.displayBanners, effectiveCustomConfig, effectiveStoreConfig.storeName]);

  // Calcul dynamique de la couleur d'accentuation et injection des règles CSS temps-réel (0ms)
  const dynamicAccentColor = useMemo(() => {
    return effectiveCustomConfig?.primaryAccentColor || 
      (resolvedThemeId === 'theme-electro-orange' ? '#FF6A00' :
       resolvedThemeId === 'theme-beauty-emerald' ? '#0F4C3A' :
       resolvedThemeId === 'theme-electro-tech' ? '#0056D2' :
       '#2563EB');
  }, [effectiveCustomConfig?.primaryAccentColor, resolvedThemeId]);

  const dynamicThemeStyles = useMemo(() => {
    if (!dynamicAccentColor || !resolvedThemeId) return '';
    const activeId = normalizeThemeId(resolvedThemeId);
    return `
      .storefront-theme-container[data-theme-id="${activeId}"] {
        --theme-primary: ${dynamicAccentColor};
        --theme-primary-hover: ${dynamicAccentColor}ee;
        --primary-color: ${dynamicAccentColor};
        --primary-accent: ${dynamicAccentColor};
      }
      /* Electro Orange & Blanc : Répercussion temps-réel */
      .storefront-theme-container[data-theme-id="theme-electro-orange"] .electro-search-pill {
        border-color: ${dynamicAccentColor} !important;
      }
      .storefront-theme-container[data-theme-id="theme-electro-orange"] .electro-search-btn,
      .storefront-theme-container[data-theme-id="theme-electro-orange"] .electro-logo-dot,
      .storefront-theme-container[data-theme-id="theme-electro-orange"] [class*="bg-[#FF6A00]"],
      .storefront-theme-container[data-theme-id="theme-electro-orange"] [class*="bg-orange-500"] {
        background-color: ${dynamicAccentColor} !important;
      }
      .storefront-theme-container[data-theme-id="theme-electro-orange"] [class*="text-[#FF6A00]"],
      .storefront-theme-container[data-theme-id="theme-electro-orange"] [class*="text-orange-500"] {
        color: ${dynamicAccentColor} !important;
      }
      .storefront-theme-container[data-theme-id="theme-electro-orange"] [class*="border-[#FF6A00]"],
      .storefront-theme-container[data-theme-id="theme-electro-orange"] [class*="border-orange-500"] {
        border-color: ${dynamicAccentColor} !important;
      }

      /* Émeraude Prestige : Répercussion temps-réel */
      .storefront-theme-container[data-theme-id="theme-beauty-emerald"] [class*="bg-[#0F4C3A]"] {
        background-color: ${dynamicAccentColor} !important;
      }
      .storefront-theme-container[data-theme-id="theme-beauty-emerald"] [class*="text-[#0F4C3A]"] {
        color: ${dynamicAccentColor} !important;
      }
      .storefront-theme-container[data-theme-id="theme-beauty-emerald"] [class*="border-[#0F4C3A]"] {
        border-color: ${dynamicAccentColor} !important;
      }

      /* Electro Tech / Pro : Répercussion temps-réel */
      .storefront-theme-container[data-theme-id="theme-electro-tech"] [class*="bg-[#0056D2]"],
      .storefront-theme-container[data-theme-id="theme-electro-tech"] [class*="bg-blue-600"] {
        background-color: ${dynamicAccentColor} !important;
      }
      .storefront-theme-container[data-theme-id="theme-electro-tech"] [class*="text-[#0056D2]"],
      .storefront-theme-container[data-theme-id="theme-electro-tech"] [class*="text-blue-600"] {
        color: ${dynamicAccentColor} !important;
      }

      /* Standard Élite : Répercussion temps-réel */
      .storefront-theme-container[data-theme-id="theme-default"] [class*="bg-blue-600"] {
        background-color: ${dynamicAccentColor} !important;
      }
      .storefront-theme-container[data-theme-id="theme-default"] [class*="text-blue-600"] {
        color: ${dynamicAccentColor} !important;
      }
      .storefront-theme-container[data-theme-id="theme-default"] [class*="border-blue-600"] {
        border-color: ${dynamicAccentColor} !important;
      }

      /* Digital Pro : Répercussion temps-réel */
      .storefront-theme-container[data-theme-id="theme-digital-pro"] [class*="bg-[#0056D2]"],
      .storefront-theme-container[data-theme-id="theme-digital-pro"] [class*="bg-blue-600"] {
        background-color: ${dynamicAccentColor} !important;
      }
    `;
  }, [dynamicAccentColor, resolvedThemeId]);

  // =========================================================================
  // 2. VERROU DE RENDU : Tant que Firestore n'a pas répondu, affiche le Loader neutre.
  // STRICT RULES OF HOOKS : ABSOLUMENT TOUS LES HOOKS SONT EXÉCUTÉS AU-DESSUS !
  // AUCUN HOOK NE SE TROUVE EN DESSOUS DE CE RETURN !
  // =========================================================================
  if (isLoading || !resolvedThemeId) {
    return (
      <StorefrontNeutralLoader 
        storeName={storeData?.storeName || props.storeConfig?.storeName} 
      />
    );
  }

  // =========================================================================
  // 3. ISOLATION TOTALE DU LAYOUT : Rendu exclusif du seul thème sélectionné
  // =========================================================================
  const themeDefinition = getThemeDefinition(resolvedThemeId);
  const SelectedThemeComponent = themeDefinition.component;

  return (
    <div 
      className="storefront-theme-container w-full min-h-full transition-all duration-300 relative"
      data-theme-id={themeDefinition.id}
      data-theme-name={themeDefinition.name}
      data-preview-mode={Boolean(previewThemeId)}
      style={{
        '--theme-primary': dynamicAccentColor,
        '--theme-primary-hover': `${dynamicAccentColor}ee`,
        '--primary-color': dynamicAccentColor,
        '--primary-accent': dynamicAccentColor
      } as React.CSSProperties}
    >
      {/* Injection temps-réel des règles CSS pour répercussion immédiate (0ms) des couleurs */}
      {dynamicThemeStyles && (
        <style dangerouslySetInnerHTML={{ __html: dynamicThemeStyles }} />
      )}
      {/* Barre flottante d'indication Mode Prévisualisation (Shopify-Style) */}
      {previewThemeId && (
        <aside 
          aria-label="Mode prévisualisation actif"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[92%] sm:w-auto bg-slate-900/95 backdrop-blur-md border border-blue-500/50 shadow-2xl shadow-blue-950/80 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 text-white animate-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                👁️ Mode Prévisualisation :
              </span>
              <span className="font-black text-blue-300 flex items-center gap-1">
                {themeDefinition.name}
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {themeDefinition.badge}
                </span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExitPreview}
            className="text-[11px] font-black uppercase px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition cursor-pointer shadow-sm shrink-0"
            title="Quitter la prévisualisation et revenir au thème actif"
          >
            Quitter l'aperçu
          </button>
        </aside>
      )}

      {/* Rendu exclusif du layout complet du thème résolu isolé dans son ThemeErrorBoundary dédié */}
      <ThemeErrorBoundary
        themeId={resolvedThemeId || 'theme-blank-custom'}
        themeName={themeDefinition.name}
        onSwitchTheme={(fallbackId) => {
          setResolvedThemeId(fallbackId);
        }}
      >
        <SelectedThemeComponent
          {...props}
          isAdminPreview={Boolean(props.isAdminPreview)}
          isPublicView={props.isPublicView ?? false}
          storeSlug={storeSlug}
          storeConfig={effectiveStoreConfig}
          customConfig={effectiveCustomConfig}
          displayBanners={effectiveDisplayBanners}
          onOpenTunnel={handleOpenTunnel}
          onOpenFunnel={handleOpenFunnel}
          onEditProduct={handleEditProduct}
          onOpenEditProduct={handleOpenEditProduct}
          onSelectProduct={handleSelectProduct}
        />
      </ThemeErrorBoundary>

      {/* Le Tiroir Dépliable Universel (SlideOutFunnelDrawer) */}
      <SlideOutFunnelDrawer
        funnelId={activeFunnelId}
        product={activeFunnelProduct}
        funnelType={activeFunnelEngine}
        isOpen={Boolean(activeFunnelId)}
        onClose={handleCloseDrawer}
      />

      {/* Pastille de Rappel Flottante "👀 Revoir l'offre en cours" après fermeture */}
      {!activeFunnelId && lastClosedFunnel && (
        <div
          role="button"
          tabIndex={0}
          onClick={handleReopenLastFunnel}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleReopenLastFunnel();
          }}
          aria-label="Revoir l'offre en cours"
          className="fixed bottom-6 right-6 z-50 bg-black/90 hover:bg-black text-white px-4 py-3 rounded-full shadow-2xl border border-white/20 flex items-center gap-3 animate-bounce-subtle cursor-pointer transition transform hover:scale-105 active:scale-95 select-none backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">👀</span>
            <span className="text-xs sm:text-sm font-bold tracking-tight">
              {lastClosedFunnel.title
                ? `Revoir l'offre : ${lastClosedFunnel.title}`
                : "Revoir l'offre en cours"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismissLastFunnelPill}
            aria-label="Masquer la pastille"
            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xs transition cursor-pointer ml-1"
            title="Fermer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
