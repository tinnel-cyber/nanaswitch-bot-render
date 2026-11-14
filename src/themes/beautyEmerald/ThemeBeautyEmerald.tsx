import React, { useState, useMemo } from 'react';
import { 
  Star, ShoppingBag, Eye, Heart, ArrowRight, ShieldCheck, 
  Award, MessageCircle, Check, ChevronRight, CheckCircle2, Sparkles, Flame
} from 'lucide-react';
import { StoreThemeProps } from '../../types/theme';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { BeautyEmeraldHeader } from './BeautyEmeraldHeader';
import { BeautyEmeraldHero } from './BeautyEmeraldHero';
import { EmeraldTrendingProducts } from './EmeraldTrendingProducts';
import { BeautyPDP } from './BeautyPDP';
import { BeautyTestimonialsSection } from './BeautyTestimonialsSection';
import { BeautyLiveSalesPopup } from './BeautyLiveSalesPopup';
import { BeautyEmeraldFooter } from './BeautyEmeraldFooter';
import { AdaptiveHeaderEngine } from '../../components/storeBuilder/headers/AdaptiveHeaderEngine';
import { AdaptiveFooterEngine } from '../../components/storeBuilder/footers/AdaptiveFooterEngine';
import { AdminSectionEditTrigger } from '../../components/storeBuilder/AdminSectionEditTrigger';
import { LiveEditable } from '../../components/storeBuilder/LiveEditable';
import { 
  BEAUTY_HERO_PODIUM_FLACONS_SVG,
  BEAUTY_FLACON_SERUM_SVG,
  BEAUTY_FLACON_CREAM_SVG,
  BEAUTY_FLACON_PARFUM_SVG 
} from './beautyEmeraldAssets';
import './beautyEmeraldTheme.css';

// Produits cosmétiques par défaut de démonstration haute couture
const DEMO_BEAUTY_PRODUCTS: StoreProductItem[] = [
  {
    id: 'demo-beauty-serum',
    name: 'Sérum Éclat Botanique C+',
    price: 18500,
    originalPrice: 24000,
    category: 'Sérums',
    image: BEAUTY_FLACON_SERUM_SVG,
    description: 'Concentré actif en vitamine C stabilisée et acide hyaluronique végétal pour un teint lumineux et unifié.',
    stock: 24,
    rating: 5.0,
    reviewCount: 38,
    badge: 'Nouveau'
  },
  {
    id: 'demo-beauty-cream',
    name: 'Crème Royale Régénérante Nuit',
    price: 22000,
    originalPrice: 28000,
    category: 'Soins Visage',
    image: BEAUTY_FLACON_CREAM_SVG,
    description: 'Texture onctueuse infusée au beurre de karité bio et aux extraits de rose sauvage pour régénérer la barrière cutanée.',
    stock: 19,
    rating: 4.9,
    reviewCount: 52,
    badge: 'Best-Seller'
  },
  {
    id: 'demo-beauty-parfum',
    name: 'Extrait Pur - Oud & Rose Précieuse',
    price: 35000,
    originalPrice: 45000,
    category: 'Parfums',
    image: BEAUTY_FLACON_PARFUM_SVG,
    description: 'Une eau de parfum envoûtante aux accords boisés et floraux précieux, élaborée avec des huiles distillées à la main.',
    stock: 12,
    rating: 5.0,
    reviewCount: 29,
    badge: 'Édition Privée'
  },
  {
    id: 'demo-beauty-cleanser',
    name: 'Nettoyant Purifiant Fleur d\'Oranger',
    price: 12500,
    originalPrice: 16000,
    category: 'Soins Visage',
    image: BEAUTY_HERO_PODIUM_FLACONS_SVG,
    description: 'Gelée nettoyante moussante douce qui élimine les impuretés sans dessécher les peaux les plus sensibles.',
    stock: 35,
    rating: 4.8,
    reviewCount: 44,
    badge: 'Indispensable'
  }
];

export const ThemeBeautyEmerald: React.FC<StoreThemeProps> = (props) => {
  // S'assurer que isAdminPreview est défini (par défaut false si non fourni)
  const isAdminPreview = Boolean(
    props.isAdminPreview ??
    (typeof window !== 'undefined' && ((window as any).isAdminPreview || (window as any).__isAdminPreview)) ??
    false
  );

  const {
    storeConfig,
    storeTheme,
    whiteLabelConfig,
    allProducts,
    filteredProducts,
    categories,
    selectedCategory,
    onSelectCategory,
    searchQuery,
    onSearchChange,
    onClearSearch,
    selectedProduct,
    onSelectProduct,
    onAddToCart,
    onBuyNow,
    getProductWhatsAppUrl,
    isPublicView = false,
    isStoreAdmin,
    isProductEditor,
    canDelete,
    displayBanners,
    onOpenAddProduct,
    onOpenEditProduct,
    onEditProduct,
    onPreviewFunnel,
    onSelectCustomizerSection,
    onOpenThemeSelector,
    onOpenFunnel,
    onOpenTunnel,
    customConfig
  } = props;
  // Panier local interactif
  const [localCartCount, setLocalCartCount] = useState(0);
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);
  const [internalSelectedProduct, setInternalSelectedProduct] = useState<StoreProductItem | null>(null);

  const currentPDPProduct = selectedProduct || internalSelectedProduct;

  // Utilise les produits réels de la boutique si disponibles, sinon les produits cosmétiques de démo
  const effectiveProducts = useMemo(() => {
    if (filteredProducts && filteredProducts.length > 0) {
      return filteredProducts;
    }
    if (allProducts && allProducts.length > 0) {
      return allProducts;
    }
    return DEMO_BEAUTY_PRODUCTS;
  }, [filteredProducts, allProducts]);

  // Produit Vedette / Offre d'Exception (customConfig.specialOfferProductId)
  const specialOfferProduct = useMemo(() => {
    if (customConfig?.specialOfferProductId) {
      const picked = effectiveProducts.find(p => p.id === customConfig.specialOfferProductId);
      if (picked) return picked;
    }
    return effectiveProducts.find(p => p.originalPrice && p.originalPrice > p.price) || null;
  }, [effectiveProducts, customConfig?.specialOfferProductId]);

  const handleAddToCart = (product: StoreProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playValidationBeep();
    setLocalCartCount(prev => prev + 1);
    setQuickAddedId(product.id);
    setTimeout(() => setQuickAddedId(null), 1800);

    if (onAddToCart) {
      onAddToCart(product, 1);
    }
  };

  const handleHeroCta = (cat?: string) => {
    if (customConfig?.heroLinkedProductId) {
      const targetProd = effectiveProducts.find(p => p.id === customConfig.heroLinkedProductId);
      if (targetProd) {
        setInternalSelectedProduct(targetProd);
        if (onSelectProduct) onSelectProduct(targetProd);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    if (cat && onSelectCategory) {
      onSelectCategory(cat);
    }
    const catalogEl = document.getElementById('beauty-catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBackToCatalog = () => {
    playTapBeep();
    setInternalSelectedProduct(null);
    if (onSelectProduct) {
      try {
        onSelectProduct(null as any);
      } catch (_) {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="beauty-emerald-root min-h-screen flex flex-col w-full selection:bg-[#0F4C3A]/20 selection:text-[#0F4C3A]">
      
      {/* 1. Header Adaptatif ou Minimaliste à Micro-Badges (85px, fond #FFFFFF) */}
      {customConfig?.headerStyle && customConfig.headerStyle !== 'none' ? (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier l'En-Tête & Navigation ⚡"
            targetAccordion={1}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <AdaptiveHeaderEngine
            config={customConfig}
            products={effectiveProducts}
            categories={categories}
            storeSlug={storeConfig?.slug || storeConfig?.storeName || 'boutique'}
            onOpenFunnel={onOpenFunnel}
            onSelectProduct={(prod) => {
              setInternalSelectedProduct(prod);
              if (onSelectProduct) onSelectProduct(prod);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onResetToHome={() => {
              setInternalSelectedProduct(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectCategory={(cat) => {
              setInternalSelectedProduct(null);
              if (onSelectCategory) onSelectCategory(cat);
            }}
            onSearch={onSearchChange}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier l'En-Tête & Navigation ⚡"
            targetAccordion={1}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <BeautyEmeraldHeader
            storeConfig={storeConfig}
            customConfig={customConfig}
            cartCount={localCartCount}
            onOpenCart={() => playTapBeep()}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSelectCategory={(cat) => {
              setInternalSelectedProduct(null);
              if (onSelectCategory) onSelectCategory(cat);
            }}
            selectedCategory={selectedCategory}
            categories={categories}
          />
        </div>
      )}

      {/* 2. Affichage Conditionnel : Fiche Produit (PDP) ou Accueil (Hero + Catalogue) */}
      {currentPDPProduct ? (
        <main className="flex-1">
          <BeautyPDP
            product={currentPDPProduct}
            allProducts={effectiveProducts}
            onBack={handleBackToCatalog}
            onSelectProduct={(p) => {
              setInternalSelectedProduct(p);
              if (onSelectProduct) onSelectProduct(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAddToCart={(p, qty) => {
              handleAddToCart(p);
            }}
            onBuyNow={(p, qty) => {
              if (onBuyNow) {
                onBuyNow(p, qty);
              } else {
                handleAddToCart(p);
              }
            }}
            onOpenFunnel={onOpenFunnel}
          />
        </main>
      ) : (
        <main className="flex-1">
          <div className="relative group">
            <AdminSectionEditTrigger
              label="✏️ Personnaliser le Hero (Titre, Image & Promo) ⚡"
              targetAccordion={2}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            <BeautyEmeraldHero
              storeDescription={storeConfig.description}
              bannerImage={storeConfig.bannerImage}
              customBanners={displayBanners}
              customConfig={customConfig}
              onCtaClick={handleHeroCta}
            />
          </div>

          {/* ================= SOUS-BANNIÈRES SECONDAIRES PRESTIGE (subBanner1 & subBanner2) ================= */}
          {(customConfig?.subBanner1Title || customConfig?.subBanner1Image || customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(customConfig?.subBanner1Title || customConfig?.subBanner1Image) && (
                  <div
                    onClick={() => {
                      playTapBeep();
                      const catalogEl = document.getElementById('beauty-catalog-section');
                      if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="relative overflow-hidden rounded-2xl bg-[#0F4C3A] text-white p-6 sm:p-8 flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition-all group border border-[#C59B27]/20"
                  >
                    <div className="space-y-2 z-10">
                      {customConfig?.subBanner1Badge && (
                        <LiveEditable
                          label="Badge Bannière 1"
                          field="subBanner1Badge"
                          value={customConfig.subBanner1Badge}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                          isInline={true}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#C59B27] text-slate-950 inline-block">
                            {customConfig.subBanner1Badge}
                          </span>
                        </LiveEditable>
                      )}
                      <LiveEditable
                        label="Titre Bannière 1"
                        field="subBanner1Title"
                        value={customConfig.subBanner1Title}
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                      >
                        <h3 className="font-['Syne'] text-xl sm:text-2xl font-bold leading-tight text-white group-hover:text-[#C59B27] transition-colors">
                          {customConfig.subBanner1Title}
                        </h3>
                      </LiveEditable>
                      {customConfig?.subBanner1Subtitle && (
                        <LiveEditable
                          label="Sous-titre Bannière 1"
                          field="subBanner1Subtitle"
                          value={customConfig.subBanner1Subtitle}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                        >
                          <p className="font-['Outfit'] text-xs text-white/80 max-w-xs">{customConfig.subBanner1Subtitle}</p>
                        </LiveEditable>
                      )}
                      {customConfig?.subBanner1CtaText && (
                        <LiveEditable
                          label="Bouton CTA Bannière 1"
                          field="subBanner1CtaText"
                          value={customConfig.subBanner1CtaText}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                          isInline={true}
                        >
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C59B27] pt-2">
                            <span>{customConfig.subBanner1CtaText}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </LiveEditable>
                      )}
                    </div>
                    {customConfig?.subBanner1Image && (
                      <LiveEditable
                        label="Image Bannière 1"
                        field="subBanner1Image"
                        value={customConfig.subBanner1Image}
                        type="image"
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                      >
                        <img
                          src={customConfig.subBanner1Image}
                          alt={customConfig.subBanner1Title || 'Bannière'}
                          className="w-24 sm:w-32 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                        />
                      </LiveEditable>
                    )}
                  </div>
                )}
                {(customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
                  <div
                    onClick={() => {
                      playTapBeep();
                      const catalogEl = document.getElementById('beauty-catalog-section');
                      if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#111C18] to-[#1E2E28] text-white p-6 sm:p-8 flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition-all group border border-slate-800"
                  >
                    <div className="space-y-2 z-10">
                      {customConfig?.subBanner2Badge && (
                        <LiveEditable
                          label="Badge Bannière 2"
                          field="subBanner2Badge"
                          value={customConfig.subBanner2Badge}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                          isInline={true}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 inline-block">
                            {customConfig.subBanner2Badge}
                          </span>
                        </LiveEditable>
                      )}
                      <LiveEditable
                        label="Titre Bannière 2"
                        field="subBanner2Title"
                        value={customConfig.subBanner2Title}
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                      >
                        <h3 className="font-['Syne'] text-xl sm:text-2xl font-bold leading-tight text-white group-hover:text-emerald-300 transition-colors">
                          {customConfig.subBanner2Title}
                        </h3>
                      </LiveEditable>
                      {customConfig?.subBanner2Subtitle && (
                        <LiveEditable
                          label="Sous-titre Bannière 2"
                          field="subBanner2Subtitle"
                          value={customConfig.subBanner2Subtitle}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                        >
                          <p className="font-['Outfit'] text-xs text-slate-300 max-w-xs">{customConfig.subBanner2Subtitle}</p>
                        </LiveEditable>
                      )}
                      {customConfig?.subBanner2CtaText && (
                        <LiveEditable
                          label="Bouton CTA Bannière 2"
                          field="subBanner2CtaText"
                          value={customConfig.subBanner2CtaText}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                          isInline={true}
                        >
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 pt-2">
                            <span>{customConfig.subBanner2CtaText}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </LiveEditable>
                      )}
                    </div>
                    {customConfig?.subBanner2Image && (
                      <LiveEditable
                        label="Image Bannière 2"
                        field="subBanner2Image"
                        value={customConfig.subBanner2Image}
                        type="image"
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                      >
                        <img
                          src={customConfig.subBanner2Image}
                          alt={customConfig.subBanner2Title || 'Bannière'}
                          className="w-24 sm:w-32 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                        />
                      </LiveEditable>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ================= ÉDITION D'EXCEPTION / OFFRE VEDETTE (specialOfferProductId) ================= */}
          {specialOfferProduct && (
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full">
              <div className="rounded-2xl border border-[#0F4C3A]/20 bg-gradient-to-r from-[#0F4C3A]/5 via-white to-amber-50/20 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white border border-[#0F4C3A]/10 p-2 flex items-center justify-center shrink-0">
                    <img
                      src={specialOfferProduct.image}
                      alt={specialOfferProduct.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0F4C3A] text-[#C59B27] font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#C59B27]" />
                        <span>Édition Spéciale Recommandée</span>
                      </span>
                      {specialOfferProduct.originalPrice && specialOfferProduct.originalPrice > specialOfferProduct.price && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0F4C3A] font-black text-[10px]">
                          -{Math.round(((specialOfferProduct.originalPrice - specialOfferProduct.price) / specialOfferProduct.originalPrice) * 100)}%
                        </span>
                      )}
                    </div>
                    <h3 className="font-['Syne'] text-lg sm:text-xl font-bold text-[#111C18] tracking-tight">
                      {specialOfferProduct.name}
                    </h3>
                    <div className="flex items-baseline gap-3">
                      <span className="font-['Outfit'] text-2xl font-black text-[#0F4C3A]">
                        {formatCFA(specialOfferProduct.price)}
                      </span>
                      {specialOfferProduct.originalPrice && specialOfferProduct.originalPrice > specialOfferProduct.price && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatCFA(specialOfferProduct.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setInternalSelectedProduct(specialOfferProduct);
                      if (onSelectProduct) onSelectProduct(specialOfferProduct);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 md:flex-initial px-5 py-3 rounded-full border border-[#0F4C3A] text-[#0F4C3A] font-bold text-xs hover:bg-[#0F4C3A]/5 transition cursor-pointer"
                  >
                    Découvrir la formule
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleAddToCart(specialOfferProduct, e);
                      if (onBuyNow) onBuyNow(specialOfferProduct, 1);
                    }}
                    className="flex-1 md:flex-initial px-6 py-3 rounded-full bg-[#0F4C3A] text-white font-bold text-xs hover:bg-[#0D3B2D] transition cursor-pointer shadow-md"
                  >
                    Commander maintenant
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ================= ÉTAPE 2 : SECTION CATALOGUE "TRENDING PRODUCTS" & GRILLE FOOL-PROOF ================= */}
          <div id="beauty-catalog-section" className="relative group">
            <AdminSectionEditTrigger
              label="✏️ Modifier la Grille & Titres Produits ⚡"
              targetAccordion={3}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            <EmeraldTrendingProducts
              realProducts={effectiveProducts}
              catalogSubtitle={customConfig?.catalogSubtitle}
              catalogTitle={customConfig?.catalogTitle}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              storeSlug={storeConfig.slug || storeConfig.storeName}
              onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
              onPreviewFunnel={onPreviewFunnel}
              onSelectProduct={(p) => {
                setInternalSelectedProduct(p);
                if (onSelectProduct) onSelectProduct(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onAddToCart={(p, qty) => {
                handleAddToCart(p);
              }}
              onBuyNow={(p, qty) => {
                if (onBuyNow) {
                  onBuyNow(p, qty);
                } else {
                  handleAddToCart(p);
                }
              }}
              onOpenFunnel={(p, e) => {
                if (p.linkedFunnelId && onOpenTunnel) {
                  onOpenTunnel(p);
                } else {
                  setInternalSelectedProduct(p);
                  if (onOpenFunnel) onOpenFunnel(p, e);
                }
              }}
            />
          </div>

          {/* ================= ÉTAPE 4 : SECTION AVIS CLIENTS IMMERSIFS (50/50 AVANT/APRÈS) ================= */}
          <BeautyTestimonialsSection
            title={customConfig?.testimonialsTitle || "Ce que disent nos clientes"}
            subtitle={customConfig?.testimonialsSubtitle || "Résultats Visibles & Avis Certifiés"}
          />

          {/* Bandeau de réassurance universelle */}
          <div className="relative group">
            <AdminSectionEditTrigger
              label="✏️ Configurer le Live & Liens ⚡"
              targetAccordion={4}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
            <div className="mt-4 pt-12 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <span className="w-10 h-10 mx-auto rounded-full bg-[#0F4C3A]/10 text-[#0F4C3A] flex items-center justify-center">
                  <Award className="w-5 h-5 text-[#C59B27]" />
                </span>
                <LiveEditable
                  label="Garantie 1 Titre"
                  field="reassurance1Title"
                  value={customConfig?.reassurance1Title || 'Formules 100% Naturelles'}
                  targetAccordion={4}
                  isAdminPreview={isAdminPreview}
                >
                  <h4 className="font-['Syne'] font-bold text-sm text-[#111C18]">
                    {customConfig?.reassurance1Title || 'Formules 100% Naturelles'}
                  </h4>
                </LiveEditable>
                <LiveEditable
                  label="Garantie 1 Description"
                  field="reassurance1Desc"
                  value={customConfig?.reassurance1Desc || 'Ingrédients botaniques purs sans parabènes'}
                  targetAccordion={4}
                  isAdminPreview={isAdminPreview}
                >
                  <p className="font-['Outfit'] text-xs text-slate-500">
                    {customConfig?.reassurance1Desc || 'Ingrédients botaniques purs sans parabènes'}
                  </p>
                </LiveEditable>
              </div>
              <div className="space-y-2">
                <span className="w-10 h-10 mx-auto rounded-full bg-[#0F4C3A]/10 text-[#0F4C3A] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#0F4C3A]" />
                </span>
                <LiveEditable
                  label="Garantie 2 Titre"
                  field="reassurance2Title"
                  value={customConfig?.reassurance2Title || 'Testé Dermatologiquement'}
                  targetAccordion={4}
                  isAdminPreview={isAdminPreview}
                >
                  <h4 className="font-['Syne'] font-bold text-sm text-[#111C18]">
                    {customConfig?.reassurance2Title || 'Testé Dermatologiquement'}
                  </h4>
                </LiveEditable>
                <LiveEditable
                  label="Garantie 2 Description"
                  field="reassurance2Desc"
                  value={customConfig?.reassurance2Desc || 'Convient à tous les types de peaux même sensibles'}
                  targetAccordion={4}
                  isAdminPreview={isAdminPreview}
                >
                  <p className="font-['Outfit'] text-xs text-slate-500">
                    {customConfig?.reassurance2Desc || 'Convient à tous les types de peaux même sensibles'}
                  </p>
                </LiveEditable>
              </div>
              <div className="space-y-2">
                <span className="w-10 h-10 mx-auto rounded-full bg-[#0F4C3A]/10 text-[#0F4C3A] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#C59B27]" />
                </span>
                <LiveEditable
                  label="Garantie 3 Titre"
                  field="reassurance3Title"
                  value={customConfig?.reassurance3Title || 'Paiement Sécurisé & Mobile Money'}
                  targetAccordion={4}
                  isAdminPreview={isAdminPreview}
                >
                  <h4 className="font-['Syne'] font-bold text-sm text-[#111C18]">
                    {customConfig?.reassurance3Title || 'Paiement Sécurisé & Mobile Money'}
                  </h4>
                </LiveEditable>
                <LiveEditable
                  label="Garantie 3 Description"
                  field="reassurance3Desc"
                  value={customConfig?.reassurance3Desc || 'Orange Money, Wave, Moov & Cartes Bancaires'}
                  targetAccordion={4}
                  isAdminPreview={isAdminPreview}
                >
                  <p className="font-['Outfit'] text-xs text-slate-500">
                    {customConfig?.reassurance3Desc || 'Orange Money, Wave, Moov & Cartes Bancaires'}
                  </p>
                </LiveEditable>
              </div>
            </div>
          </section>
          </div>
        </main>
      )}

      {/* ================= ÉTAPE 4 : FOOTER ADAPTATIF OU MARBRE NOIR & OR ================= */}
      {customConfig?.footerStyle && customConfig.footerStyle !== 'none' ? (
        <div className="relative group/footer-section">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Contact ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <AdaptiveFooterEngine
            config={customConfig}
            products={effectiveProducts}
            storeSlug={storeConfig?.slug || storeConfig?.storeName || 'boutique'}
            categories={categories}
            onOpenFunnel={onOpenFunnel}
            onSelectProduct={(prod) => {
              setInternalSelectedProduct(prod);
              if (onSelectProduct) onSelectProduct(prod);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onResetToHome={() => {
              setInternalSelectedProduct(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectCategory={(cat) => {
              setInternalSelectedProduct(null);
              if (onSelectCategory) onSelectCategory(cat);
            }}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Contact ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <BeautyEmeraldFooter
            storeConfig={storeConfig}
            customConfig={customConfig}
            whiteLabelConfig={whiteLabelConfig}
            onNavigateCategory={onSelectCategory}
          />
        </div>
      )}

      {/* ================= ÉTAPE 4 : NOTIFICATION LIVE SALES (PREUVE SOCIALE EN DIRECT) ================= */}
      {customConfig?.enableLiveSalesPopup !== false && (
        <BeautyLiveSalesPopup
          products={effectiveProducts}
          onSelectProduct={(p) => {
            setInternalSelectedProduct(p);
            if (onSelectProduct) onSelectProduct(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

    </div>
  );
};
