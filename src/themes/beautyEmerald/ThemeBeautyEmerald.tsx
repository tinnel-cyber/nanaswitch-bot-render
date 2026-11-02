import React, { useState, useMemo } from 'react';
import { 
  Star, ShoppingBag, Eye, Heart, ArrowRight, ShieldCheck, 
  Award, MessageCircle, Check, ChevronRight, CheckCircle2 
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
import { AdminSectionEditTrigger } from '../../components/storeBuilder/AdminSectionEditTrigger';
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
      
      {/* 1. Header Minimaliste à Micro-Badges (85px, fond #FFFFFF) */}
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
                <h4 className="font-['Syne'] font-bold text-sm text-[#111C18]">
                  {customConfig?.reassurance1Title || 'Formules 100% Naturelles'}
                </h4>
                <p className="font-['Outfit'] text-xs text-slate-500">
                  {customConfig?.reassurance1Desc || 'Ingrédients botaniques purs sans parabènes'}
                </p>
              </div>
              <div className="space-y-2">
                <span className="w-10 h-10 mx-auto rounded-full bg-[#0F4C3A]/10 text-[#0F4C3A] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#0F4C3A]" />
                </span>
                <h4 className="font-['Syne'] font-bold text-sm text-[#111C18]">
                  {customConfig?.reassurance2Title || 'Testé Dermatologiquement'}
                </h4>
                <p className="font-['Outfit'] text-xs text-slate-500">
                  {customConfig?.reassurance2Desc || 'Convient à tous les types de peaux même sensibles'}
                </p>
              </div>
              <div className="space-y-2">
                <span className="w-10 h-10 mx-auto rounded-full bg-[#0F4C3A]/10 text-[#0F4C3A] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#C59B27]" />
                </span>
                <h4 className="font-['Syne'] font-bold text-sm text-[#111C18]">
                  {customConfig?.reassurance3Title || 'Paiement Sécurisé & Mobile Money'}
                </h4>
                <p className="font-['Outfit'] text-xs text-slate-500">
                  {customConfig?.reassurance3Desc || 'Orange Money, Wave, Moov & Cartes Bancaires'}
                </p>
              </div>
            </div>
          </section>
          </div>
        </main>
      )}

      {/* ================= ÉTAPE 4 : FOOTER MARBRE NOIR & OR ================= */}
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
