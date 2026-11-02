import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  ShoppingBag, 
  Plus, 
  Search, 
  MessageCircle, 
  Phone, 
  ShieldCheck, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Settings, 
  Trash2, 
  Flame, 
  Clock, 
  Check, 
  Play, 
  Mic, 
  SlidersHorizontal, 
  HelpCircle,
  Award,
  ChevronRight,
  Zap,
  Volume2,
  Layers
} from 'lucide-react';
import { StoreThemeProps } from '../../types/theme';
import { CustomSectionInstance, CustomSectionType, StoreProductItem } from '../../types';
import { 
  resolveCustomThemeMood, 
  getMoodCssVariables, 
  getMoodStyle, 
  getButtonRadiusClass 
} from './moodStyles';
import { 
  ARCHITECT_MODULES, 
  ModuleDefinition, 
  ARCHITECT_RECOMMENDED_SECTIONS, 
  RECOMMENDED_DEFAULT_SECTIONS 
} from './architectModules';
import { AdminProductQuickBar } from '../../components/storeBuilder/AdminProductQuickBar';
import { AdminSectionEditTrigger } from '../../components/storeBuilder/AdminSectionEditTrigger';
import { triggerOpenFunnel, useParams } from '../themeUtils';
import { getSafeStoreSlug } from '../../utils/slugEngine';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import {
  BentoHeroModule,
  SpotifyShelfModule,
  SmartMasonryGridModule,
  FlashDealVaultModule,
  VideoStoryCarouselModule,
  ParallaxBrandStoryModule,
  InteractiveTrustBarModule,
  SmartFaqConciergeModule,
  GlowingCosmeticsGrid,
  DigitalSquareGrid,
  OmniLiveStudioModule
} from './fundamentalModules';
import {
  VoiceNotePitchModule,
  LiveHaggleOfferModule,
  InteractiveBundleLabModule,
  ProductFinderQuizModule,
  BeforeAfterSliderModule,
  SocialWallWameetModule,
  VipMysteryScratchModule
} from './exclusiveModules';
import { ARCHITECT_BLUEPRINTS, ArchitectBlueprint } from './blueprints';
import { ShopifyWideProductView } from '../../components/storeBuilder/ShopifyWideProductView';
import { GlowingWideProductView } from '../../components/storeBuilder/GlowingWideProductView';
import { DigitalWideProductView } from '../../components/storeBuilder/DigitalWideProductView';
import { AdaptiveHeaderEngine } from '../../components/storeBuilder/headers/AdaptiveHeaderEngine';
import { AdaptiveFooterEngine } from '../../components/storeBuilder/footers/AdaptiveFooterEngine';
import { SmartSlideOutCartDrawer, openSmartCart, addToSmartCart } from '../../components/storeBuilder/SmartSlideOutCartDrawer';
import { MobileAppBottomTabBar } from '../../components/storeBuilder/MobileAppBottomTabBar';
import { StoreLegalAndTrackingModals } from '../../components/storeBuilder/StoreLegalAndTrackingModals';
import { OrderConfirmationVaultModal } from '../../components/storeBuilder/OrderConfirmationVaultModal';
import { initPixels } from '../../utils/pixelTrackingEngine';
import { SectionErrorBoundary } from './SectionErrorBoundary';

export { ARCHITECT_RECOMMENDED_SECTIONS, RECOMMENDED_DEFAULT_SECTIONS };

export const ThemeBlankCustom: React.FC<StoreThemeProps> = (props) => {
  // S'assurer que isAdminPreview est défini (par défaut false si non fourni)
  const isAdminPreview = Boolean(
    props.isAdminPreview ??
    (typeof window !== 'undefined' && ((window as any).isAdminPreview || (window as any).__isAdminPreview)) ??
    false
  );

  const {
    storeConfig,
    customConfig,
    allProducts = [],
    categories = [],
    selectedCategory = 'Tous les produits',
    onSelectCategory,
    isPublicView = false,
    isSimulatedMobile = false,
    onBuyNow,
    onOpenTunnel,
    onPreviewFunnel,
    onSelectProduct,
    onEditProduct,
    onSelectCustomizerSection,
    onUpdateCustomSections
  } = props;

  // Résolution sécurisée et infaillible du storeSlug tout en haut du composant
  const params = useParams<{ storeSlug?: string; slug?: string }>();
  const storeSlug = useMemo(() => {
    const resolved =
      params.storeSlug ||
      params.slug ||
      (props as any).storeSlug ||
      storeConfig?.slug ||
      (storeConfig as any)?.storeSlug ||
      getSafeStoreSlug(customConfig, storeConfig) ||
      'ma-boutique';
    if (typeof window !== 'undefined') {
      (window as any).storeSlug = resolved;
    }
    return resolved;
  }, [params.storeSlug, params.slug, (props as any).storeSlug, storeConfig, customConfig]);

  // Résolution du Mood actif et des tokens
  const currentMood = useMemo(() => resolveCustomThemeMood(customConfig?.customMood), [customConfig?.customMood]);
  const moodStyle = useMemo(() => getMoodStyle(currentMood), [currentMood]);
  const cssVariables = useMemo(() => getMoodCssVariables(currentMood), [currentMood]);
  const buttonRadiusClass = useMemo(() => getButtonRadiusClass(currentMood.buttonRadius), [currentMood.buttonRadius]);

  // État local d'ouverture de la Vue Produit Grande Largeur Shopify ("Derrière la Porte" du Module grid)
  const [activeDoorProduct, setActiveDoorProduct] = useState<StoreProductItem | null>(null);
  const [activeDoorViewType, setActiveDoorViewType] = useState<'shopify_standard' | 'glowing_cosmetics' | 'digital_square'>('shopify_standard');

  // Moteur de Pixels Publicitaires (Meta, TikTok, Google)
  useEffect(() => {
    initPixels({
      metaPixelId: customConfig?.metaPixelId || storeConfig?.fbPixelId,
      tiktokPixelId: customConfig?.tiktokPixelId || storeConfig?.tiktokPixelId,
      googleTagId: customConfig?.googleTagId
    });
  }, [
    customConfig?.metaPixelId,
    customConfig?.tiktokPixelId,
    customConfig?.googleTagId,
    storeConfig?.fbPixelId,
    storeConfig?.tiktokPixelId
  ]);

  const rawSections: CustomSectionInstance[] = (customConfig?.customSections as any[]) || [];
  const hasSections = rawSections.length > 0;

  // Côté public : si vide, injecte le layout recommandé pour que la boutique soit toujours opérationnelle
  const effectiveSections: CustomSectionInstance[] = useMemo(() => {
    if (hasSections) {
      return isPublicView ? rawSections.filter(s => s.visible !== false) : rawSections;
    }
    if (isPublicView) {
      return ARCHITECT_RECOMMENDED_SECTIONS;
    }
    return [];
  }, [hasSections, rawSections, isPublicView]);

  // Détection du contexte cosmétique / santé / beauté (Module Glowing ou Mood emerald/hermes)
  const isCosmeticsContext = useMemo(() => {
    if (currentMood?.presetId === 'emerald-botanic' || currentMood?.presetId === 'hermes-sand') {
      return true;
    }
    if (effectiveSections.some(s => s.type === 'glowing_cosmetics_grid')) {
      return true;
    }
    return false;
  }, [currentMood?.presetId, effectiveSections]);

  // Détection du contexte numérique / formation / webinaire (Module digital_square_grid)
  const isDigitalContext = useMemo(() => {
    if (effectiveSections.some(s => s.type === 'digital_square_grid')) {
      return true;
    }
    return false;
  }, [effectiveSections]);

  const effectiveStoreName = customConfig?.storeName || storeConfig?.storeName || "Ma Boutique";
  const effectiveWhatsapp = customConfig?.whatsappNumber || storeConfig?.whatsappPhone || "";
  const announcementEnabled = customConfig?.announcementBarEnabled !== false;
  const announcementText = customConfig?.announcementBarText || "⚡ PROMO FLASH : LIVRAISON OFFERTE DÈS 10 000 F CFA AUJOURD'HUI ! • PAIEMENT MOBILE MONEY & CASH";

  // 1. Détection initiale et routage profond URL (?product=slug ou #product-slug)
  useEffect(() => {
    if (typeof window === 'undefined' || allProducts.length === 0) return;

    try {
      const params = new URLSearchParams(window.location.search);
      const queryTarget = params.get('product') || params.get('produit') || params.get('p');
      const hashTarget = window.location.hash ? window.location.hash.replace(/^#product-/, '') : null;
      const targetSlugOrId = queryTarget || hashTarget;

      if (targetSlugOrId) {
        const found = allProducts.find(
          p => (p.slug && p.slug.toLowerCase() === targetSlugOrId.toLowerCase()) ||
               (p.productSlug && p.productSlug.toLowerCase() === targetSlugOrId.toLowerCase()) ||
               p.id === targetSlugOrId
        );

        if (found) {
          const resolvedType = (found.category?.toLowerCase().includes('formation') || found.category?.toLowerCase().includes('digital') || isDigitalContext)
            ? 'digital_square'
            : (isCosmeticsContext || found.category?.toLowerCase().includes('beaut') || found.category?.toLowerCase().includes('sant'))
            ? 'glowing_cosmetics'
            : 'shopify_standard';

          setActiveDoorProduct(found);
          setActiveDoorViewType(resolvedType);
        }
      }

      // Support Direct-Linking Tunnel Publicitaire (?funnel=ID)
      const queryFunnel = params.get('funnel') || params.get('tunnel');
      if (queryFunnel) {
        triggerOpenFunnel(queryFunnel, 'Offre Exclusive');
      }
    } catch (err) {
      console.warn('Erreur résolution URL produit direct :', err);
    }
  }, [allProducts, isDigitalContext, isCosmeticsContext]);

  // 2. Synchronisation popstate (Bouton Retour du téléphone)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const queryTarget = params.get('product') || params.get('produit') || params.get('p');

      if (!queryTarget && !event.state?.productView) {
        // L'utilisateur a appuyé sur "Retour" sur son téléphone : referme la grande vue
        setActiveDoorProduct(null);
      } else if (queryTarget && allProducts.length > 0) {
        const found = allProducts.find(
          p => (p.slug && p.slug.toLowerCase() === queryTarget.toLowerCase()) ||
               (p.productSlug && p.productSlug.toLowerCase() === queryTarget.toLowerCase()) ||
               p.id === queryTarget
        );
        if (found) {
          const resolvedType = (found.category?.toLowerCase().includes('formation') || isDigitalContext)
            ? 'digital_square'
            : (isCosmeticsContext)
            ? 'glowing_cosmetics'
            : 'shopify_standard';
          setActiveDoorProduct(found);
          setActiveDoorViewType(resolvedType);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allProducts, isDigitalContext, isCosmeticsContext]);

  // Actions de manipulation directe sur la toile Studio
  const handleMove = (index: number, direction: 'up' | 'down') => {
    playTapBeep();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= rawSections.length) return;
    const next = [...rawSections];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    onUpdateCustomSections?.(next);
  };

  const handleDuplicate = (index: number) => {
    playValidationBeep();
    const target = rawSections[index];
    const clone: CustomSectionInstance = {
      ...target,
      id: `sec_${target.type}_${Date.now()}`,
      title: `${target.title} (Copie)`,
      settings: { ...(target.settings || {}) }
    };
    const next = [...rawSections];
    next.splice(index + 1, 0, clone);
    onUpdateCustomSections?.(next);
  };

  const handleDelete = (index: number) => {
    playTapBeep();
    const next = rawSections.filter((_, i) => i !== index);
    onUpdateCustomSections?.(next);
  };

  const handleInsertAt = (insertIndex: number) => {
    playValidationBeep();
    const newInstance: CustomSectionInstance = {
      id: `sec_bento_hero_${Date.now()}`,
      type: 'bento_hero',
      title: 'Nouvelle Section Nanasore',
      subtitle: 'MODULABLE EN DIRECT',
      visible: true,
      spacingTop: 'md',
      spacingBottom: 'md',
      backgroundStyle: 'default',
      settings: {}
    };
    const next = [...rawSections];
    next.splice(insertIndex, 0, newInstance);
    onUpdateCustomSections?.(next);
  };

  const handleCloseDoor = useCallback(() => {
    playTapBeep();
    setActiveDoorProduct(null);
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has('product') || currentUrl.searchParams.has('produit') || currentUrl.searchParams.has('p')) {
        currentUrl.searchParams.delete('product');
        currentUrl.searchParams.delete('produit');
        currentUrl.searchParams.delete('p');
        window.history.replaceState({}, '', currentUrl.toString());
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleProductTrigger = (product: any, viewType?: 'shopify_standard' | 'glowing_cosmetics' | 'digital_square') => {
    playTapBeep();
    // Ouverture de la Vue Produit Grande Largeur (Shopify "You&Me", "Glowing" Cosmétiques ou "Digital" 1080x1080)
    const resolvedType = viewType || (isDigitalContext ? 'digital_square' : isCosmeticsContext ? 'glowing_cosmetics' : 'shopify_standard');
    setActiveDoorProduct(product);
    setActiveDoorViewType(resolvedType);

    // Deep-linking URL pushState pour le bouton retour du téléphone
    if (typeof window !== 'undefined') {
      const prodSlug = product.slug || product.productSlug || product.id;
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('product', prodSlug);
      window.history.pushState({ productView: prodSlug }, '', currentUrl.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  const onProductClick = (product: any, viewType?: 'shopify' | 'shopify_standard' | 'glowing_cosmetics' | 'digital_square') => {
    const mapped = viewType === 'shopify' ? 'shopify_standard' : viewType;
    handleProductTrigger(product, mapped);
  };

  return (
    <div 
      style={cssVariables}
      className={`min-h-screen ${moodStyle.bg} ${moodStyle.textPrimary} font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 relative pb-36 md:pb-12`}
    >
      {/* SYSTÈME DES 6 EN-TÊTES PREMIUM NANASORE (<AdaptiveHeaderEngine />) */}
      {!activeDoorProduct && (
        <div className="relative group/header-section">
          <AdminSectionEditTrigger
            title="En-tête & Barre de Navigation"
            subtitle="Changer de Header (6 styles), logo, liens, devises"
            targetAccordion={1}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
          <AdaptiveHeaderEngine
            config={customConfig}
            products={allProducts}
            categories={categories}
            storeSlug={storeSlug}
            onOpenFunnel={onOpenTunnel || onProductClick}
            onSelectProduct={(p) => onProductClick(p, 'shopify')}
            onResetToHome={() => {
              playTapBeep();
              setActiveDoorProduct(null);
            }}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      )}

      {/* 3. Zone Centrale Interactive (Dropzone & Modules) OU Vue Produit Grande Largeur Shopify */}
      <main className="w-full">
        {activeDoorProduct ? (
          activeDoorViewType === 'digital_square' ? (
            /* VUE ARRIÈRE GRANDE LARGEUR PRODUITS NUMÉRIQUES & FORMATIONS 1080x1080 */
            <DigitalWideProductView
              product={activeDoorProduct}
              allProducts={allProducts}
              categories={categories}
              storeName={effectiveStoreName}
              whatsappPhone={effectiveWhatsapp}
              onBack={handleCloseDoor}
              onSelectProduct={(p) => {
                setActiveDoorProduct(p);
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                if (onSelectProduct) onSelectProduct(p);
              }}
              onAddToCart={(p, qty) => {
                playValidationBeep();
                addToSmartCart(p, qty || 1);
              }}
              onBuyNow={(p, qty) => {
                if (onBuyNow) {
                  onBuyNow(p, qty || 1);
                } else if (props.onBuyNow) {
                  props.onBuyNow(p, qty || 1);
                }
              }}
              onOpenTunnel={(p) => {
                if (onOpenTunnel) {
                  onOpenTunnel(p);
                } else if (onPreviewFunnel) {
                  onPreviewFunnel(p);
                } else {
                  triggerOpenFunnel(p.linkedFunnelId || p.id, p.name, p);
                }
              }}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
            />
          ) : activeDoorViewType === 'glowing_cosmetics' ? (
            /* VUE ARRIÈRE GRANDE LARGEUR STYLE SHOPIFY "GLOWING" (Santé, Cosmétique & Beauté) */
            <GlowingWideProductView
              product={activeDoorProduct}
              allProducts={allProducts}
              categories={categories}
              storeName={effectiveStoreName}
              whatsappPhone={effectiveWhatsapp}
              onBack={handleCloseDoor}
              onSelectProduct={(p) => {
                setActiveDoorProduct(p);
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                if (onSelectProduct) onSelectProduct(p);
              }}
              onAddToCart={(p, qty) => {
                playValidationBeep();
                addToSmartCart(p, qty || 1);
              }}
              onBuyNow={(p, qty) => {
                if (onBuyNow) {
                  onBuyNow(p, qty || 1);
                } else if (props.onBuyNow) {
                  props.onBuyNow(p, qty || 1);
                }
              }}
              onOpenTunnel={(p) => {
                if (onOpenTunnel) {
                  onOpenTunnel(p);
                } else if (onPreviewFunnel) {
                  onPreviewFunnel(p);
                } else {
                  triggerOpenFunnel(p.linkedFunnelId || p.id, p.name, p);
                }
              }}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
            />
          ) : (
            /* VUE PRODUIT GRANDE LARGEUR STYLE SHOPIFY "YOU&ME SHOP" ("Derrière la Porte" du Module grid standard) */
            <ShopifyWideProductView
              product={activeDoorProduct}
              allProducts={allProducts}
              categories={categories}
              storeName={effectiveStoreName}
              whatsappPhone={effectiveWhatsapp}
              onBack={handleCloseDoor}
              onSelectProduct={(p) => {
                setActiveDoorProduct(p);
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                if (onSelectProduct) onSelectProduct(p);
              }}
              onAddToCart={(p, qty) => {
                playValidationBeep();
                addToSmartCart(p, qty || 1);
              }}
              onBuyNow={(p, qty) => {
                if (onBuyNow) {
                  onBuyNow(p, qty || 1);
                } else if (props.onBuyNow) {
                  props.onBuyNow(p, qty || 1);
                }
              }}
              onOpenTunnel={(p) => {
                if (onOpenTunnel) {
                  onOpenTunnel(p);
                } else if (onPreviewFunnel) {
                  onPreviewFunnel(p);
                } else {
                  triggerOpenFunnel(p.linkedFunnelId || p.id, p.name, p);
                }
              }}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
            />
          )
        ) : (
          <>
            {/* ÉTAT "TOILE VIERGE" GRANDIOSE (Studio & customSections vide) */}
        {!hasSections && isAdminPreview && (
          <div className="max-w-4xl mx-auto my-16 px-6">
            <div className="border-2 border-dashed border-blue-400/80 rounded-3xl p-8 sm:p-14 text-center bg-blue-50/30 dark:bg-blue-950/20 backdrop-blur-md shadow-2xl space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/30 text-blue-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                🏗️
              </div>

              <div className="space-y-2 max-w-xl mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-xs font-black uppercase tracking-wider">
                  <span>NANASORE ARCHITECT OS • VERSION 5A</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Votre Toile Vierge A à Z est prête !
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Composez votre boutique en Glisser-Déposer (Drag & Drop) parmi nos 15 modules ultra-rapides,
                  ou déployez notre structure haute conversion en un clic.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => handleInsertAt(0)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-blue-700 font-black text-xs border border-blue-300 shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-4 h-4 text-blue-600 stroke-[3]" />
                  <span>➕ Ajouter mon 1er bloc</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playValidationBeep();
                    onUpdateCustomSections?.(ARCHITECT_RECOMMENDED_SECTIONS);
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>⚡ Déployer le Layout Recommandé</span>
                </button>
              </div>

              {/* 4 Blueprints Haute Conversion Pré-Assemblés en 1 Clic */}
              <div className="pt-8 border-t border-blue-200/60 dark:border-blue-900/40 text-left">
                <div className="flex items-center gap-2 mb-4 justify-center sm:justify-start">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Ou choisissez un Blueprint Pré-Assemblé en 1 clic :
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {ARCHITECT_BLUEPRINTS.map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => {
                        playValidationBeep();
                        if (props.onDeployBlueprint) {
                          props.onDeployBlueprint(bp);
                        } else {
                          onUpdateCustomSections?.(bp.sections);
                        }
                      }}
                      className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-xl transition-all text-left flex items-start gap-3.5 group cursor-pointer active:scale-98"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                        {bp.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                            {bp.badge}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 font-mono">
                            {bp.sections.length} blocs
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                          {bp.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {bp.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-slate-400">
                <span>✓ 8 Modules Fondamentaux E-Commerce</span>
                <span>✓ 7 Exclusivités Mondiales Nanasore</span>
                <span>✓ Drag & Drop HTML5 Fluide (0ms)</span>
              </div>
            </div>
          </div>
        )}

        {/* BOUCLE DE RENDU DES 15 MODULES AVEC OUTILS DE SURVOL STUDIO */}
        {effectiveSections.map((sec, idx) => {
          const meta = ARCHITECT_MODULES.find(m => m.type === sec.type);
          const isFirst = idx === 0;
          const isLast = idx === effectiveSections.length - 1;

          return (
            <div 
              key={sec.id}
              id={`section-${sec.id}`}
              className="relative group/section"
            >
              {/* Séparateur d'insertion "➕ Insérer un module ici" entre sections (Studio uniquement) */}
              {isAdminPreview && (
                <div className="h-6 -my-3 relative z-30 opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center justify-center pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => handleInsertAt(idx)}
                    className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] shadow-lg flex items-center gap-1 cursor-pointer transform -translate-y-1/2 active:scale-95"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Insérer un module ici</span>
                  </button>
                </div>
              )}

              {/* Cadre de survol bleu interactif Studio */}
              <div className={`relative transition-all duration-150 ${
                isAdminPreview ? 'group-hover/section:ring-2 group-hover/section:ring-blue-500 group-hover/section:shadow-xl' : ''
              }`}>
                {/* Barre d'outils flottante supérieure droite (Studio uniquement) */}
                {isAdminPreview && (
                  <div className="absolute top-3 right-3 z-30 opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-1 bg-slate-950/95 backdrop-blur-md border border-slate-700 rounded-xl p-1 shadow-2xl text-white select-none">
                    <span className="text-[10px] font-black text-blue-400 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 font-mono">
                      #{idx + 1} {meta?.icon || '📦'} {meta?.title || sec.type}
                    </span>

                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(idx, 'up')}
                      title="Monter ce module"
                      className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                        isFirst ? 'text-slate-600 opacity-40 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(idx, 'down')}
                      title="Descendre ce module"
                      className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                        isLast ? 'text-slate-600 opacity-40 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(idx)}
                      title="Dupliquer ce module"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (props.onConfigureCustomSection) {
                          props.onConfigureCustomSection(sec.id);
                        } else {
                          onSelectCustomizerSection?.(idx);
                        }
                      }}
                      title="Personnaliser ce bloc"
                      className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-md active:scale-95"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      title="Supprimer ce module"
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* RENDU MODULAIRE DES 15 SECTIONS ARCHITECT OS */}
                <SectionErrorBoundary sectionType={sec.type} sectionId={sec.id} sectionTitle={sec.title}>
                  <RenderArchitectSection
                    section={sec}
                    moodStyle={moodStyle}
                    buttonRadiusClass={buttonRadiusClass}
                    products={allProducts}
                    categories={categories}
                    storeSlug={storeSlug}
                    storeName={effectiveStoreName}
                    whatsappPhone={effectiveWhatsapp}
                    onBuyNow={onBuyNow || props.onBuyNow}
                    onOpenTunnel={onOpenTunnel || ((p) => triggerOpenFunnel(p.linkedFunnelId || p.id, p.name, p))}
                    onProductClick={handleProductTrigger}
                    onEditProduct={onEditProduct}
                    onPreviewFunnel={onPreviewFunnel}
                    onSelectProduct={handleProductTrigger}
                    isPublicView={isPublicView}
                    isAdminPreview={isAdminPreview}
                  />
                </SectionErrorBoundary>
              </div>
            </div>
          );
        })}
          </>
        )}
      </main>

      {/* 4. Moteur de Pied de Page Adaptatif (Footer Engine - 3 Modèles Premium Nanasore) */}
      <div className="relative group/footer-section">
        <AdminSectionEditTrigger
          title="Pied de page & Contact"
          subtitle="Personnaliser textes, liens sociaux, WhatsApp et copyright"
          targetAccordion={5}
          onSelectSection={onSelectCustomizerSection}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
        <AdaptiveFooterEngine
          config={customConfig}
          products={allProducts}
          storeSlug={storeSlug}
          categories={categories}
          onOpenFunnel={onOpenTunnel || onProductClick}
          onSelectCategory={(cat) => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('nana_filter_category', { detail: { category: cat } }));
            }
          }}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      </div>

      {/* 5. TIROIR PANIER GLOBAL MULTI-PRODUITS NANASORE (Checkout Express + WhatsApp + Upsell) */}
      <SmartSlideOutCartDrawer
        storeName={effectiveStoreName}
        storeSlug={storeSlug}
        whatsappNumber={effectiveWhatsapp}
        products={allProducts}
        onOpenFunnel={onOpenTunnel || handleProductTrigger}
      />

      {/* 6. BARRE DE NAVIGATION MOBILE BASSE STYLE APP IOS / ANDROID (5 Onglets au Pouce) */}
      {!activeDoorProduct && customConfig?.showMobileBottomBar !== false && (
        <MobileAppBottomTabBar
          storeName={effectiveStoreName}
          whatsappNumber={effectiveWhatsapp}
          categories={categories}
          allProducts={allProducts}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          onResetToHome={handleCloseDoor}
          onOpenCart={openSmartCart}
          isSimulatedMobile={isSimulatedMobile}
        />
      )}

      {/* 7. MODALES LÉGALES, GARANTIES & SUIVI DE COMMANDE CLIENT AUTO-GÉNÉRÉES */}
      <StoreLegalAndTrackingModals
        storeName={effectiveStoreName}
        footerAddress={customConfig?.footerAddress}
        whatsappNumber={effectiveWhatsapp}
        storeSlug={storeSlug}
        customConfig={customConfig}
      />

      {/* 8. COFFRE DE CONFIRMATION VIP & FACTURE INSTANTANÉE (0ms Post-Achat) */}
      <OrderConfirmationVaultModal
        storeName={effectiveStoreName}
        footerAddress={customConfig?.footerAddress}
        whatsappNumber={effectiveWhatsapp}
        storeSlug={storeSlug}
      />
    </div>
  );
};

// =========================================================================
// MOTEUR DE RENDU MODULAIRE DES 15 SECTIONS NANASORE ARCHITECT OS
// (8 Fondamentaux + 7 Exclusivités Mondiales + Rétrocompatibilité)
// =========================================================================
interface RenderArchitectSectionProps {
  section: CustomSectionInstance;
  moodStyle: any;
  buttonRadiusClass: string;
  products: any[];
  categories: string[];
  storeSlug?: string;
  storeName?: string;
  whatsappPhone?: string;
  onBuyNow?: (p: any, qty?: number) => void;
  onOpenTunnel?: (p: any) => void;
  onProductClick: (p: any, viewType?: 'shopify_standard' | 'glowing_cosmetics') => void;
  onEditProduct?: (p: any, opt?: any) => void;
  onPreviewFunnel?: (p: any) => void;
  onSelectProduct?: (p: any) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

const RenderArchitectSection: React.FC<RenderArchitectSectionProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  products = [],
  categories = [],
  storeSlug = 'boutique',
  storeName = 'Ma Boutique',
  whatsappPhone = '',
  onBuyNow,
  onOpenTunnel,
  onProductClick,
  onEditProduct,
  onPreviewFunnel,
  onSelectProduct,
  isPublicView = false,
  isAdminPreview = false
}) => {
  const cfg = section.settings || section.config || {};
  const targetProduct = products.find(p => p.id === cfg.productId) || products[0];

  switch (section.type) {
    // 1. Bento Hero
    case 'bento_hero':
    case 'hero_split_banner':
      return (
        <BentoHeroModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 2. Spotify Shelf
    case 'spotify_shelf':
    case 'spotify_product_shelf':
      return (
        <SpotifyShelfModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          categories={categories}
          storeSlug={storeSlug}
          onBuyNow={onBuyNow}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 3. Smart Masonry Grid
    case 'smart_masonry_grid':
    case 'product_grid_custom':
      return (
        <SmartMasonryGridModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          categories={categories}
          storeSlug={storeSlug}
          onBuyNow={onBuyNow}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 3B. Grille Cosmétique & Santé "Glowing" (Shopify Glowing Style)
    case 'glowing_cosmetics_grid':
      return (
        <GlowingCosmeticsGrid
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          categories={categories}
          storeSlug={storeSlug}
          onOpenTunnel={(p) => onProductClick(p, 'glowing_cosmetics')}
          onPreviewFunnel={(p) => onProductClick(p, 'glowing_cosmetics')}
          onSelectProduct={(p) => onProductClick(p, 'glowing_cosmetics')}
          onProductClick={(p) => onProductClick(p, 'glowing_cosmetics')}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 3C. Grille Produits Numériques, Formations & Webinaires (1080x1080 + Vue Vidéo)
    case 'digital_square_grid':
      return (
        <DigitalSquareGrid
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          categories={categories}
          storeSlug={storeSlug}
          onOpenTunnel={(p) => onProductClick(p, 'digital_square')}
          onPreviewFunnel={(p) => onProductClick(p, 'digital_square')}
          onSelectProduct={(p) => onProductClick(p, 'digital_square')}
          onProductClick={(p) => onProductClick(p, 'digital_square')}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 3D. Studio Live, Webinaire & Coaching 1-to-1 (Nanasore Omni Live)
    case 'omni_live_studio':
      return (
        <OmniLiveStudioModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel || onProductClick}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 4. Flash Deal Vault
    case 'flash_deal_vault':
    case 'spotlight_deal_countdown':
      return (
        <FlashDealVaultModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 5. Video Story Carousel
    case 'video_story_carousel':
    case 'video_story_reel':
      return (
        <VideoStoryCarouselModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 6. Parallax Brand Story
    case 'parallax_brand_story':
    case 'rich_story_banner':
      return (
        <ParallaxBrandStoryModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          storeName={storeName}
        />
      );

    // 7. Interactive Trust Bar
    case 'interactive_trust_bar':
    case 'trust_badges_strip':
      return (
        <InteractiveTrustBarModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
        />
      );

    // 8. Smart FAQ Concierge
    case 'smart_faq_concierge':
    case 'faq_accordion_section':
      return (
        <SmartFaqConciergeModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          whatsappPhone={whatsappPhone}
          storeName={storeName}
        />
      );

    // 9. Voice Note Pitch (Nanasore Original)
    case 'voice_note_pitch':
      return (
        <VoiceNotePitchModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          storeName={storeName}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 10. Interactive Bundle Lab (Nanasore Original)
    case 'interactive_bundle_lab':
      return (
        <InteractiveBundleLabModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 11. Live Haggle Offer (Nanasore Original)
    case 'live_haggle_offer':
      return (
        <LiveHaggleOfferModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 12. Product Finder Quiz (Nanasore Original)
    case 'product_finder_quiz':
      return (
        <ProductFinderQuizModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 13. Before After Slider (Nanasore Original)
    case 'before_after_slider':
      return (
        <BeforeAfterSliderModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 14. Social Wall Wameet (Nanasore Original)
    case 'social_wall_wameet':
    case 'social_wall_w':
      return (
        <SocialWallWameetModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    // 15. VIP Mystery Scratch (Nanasore Original)
    case 'vip_mystery_scratch':
      return (
        <VipMysteryScratchModule
          section={section}
          moodStyle={moodStyle}
          buttonRadiusClass={buttonRadiusClass}
          products={products}
          storeSlug={storeSlug}
          onOpenTunnel={onOpenTunnel || onProductClick}
          onPreviewFunnel={onPreviewFunnel}
          onSelectProduct={onSelectProduct || onProductClick}
          onEditProduct={onEditProduct}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      );

    default:
      return null;
  }
};

export default ThemeBlankCustom;
