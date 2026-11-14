import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, ShoppingBag, Heart, RefreshCw, MapPin, Truck, 
  ChevronDown, ChevronRight, Menu, X, User, ArrowRight,
  ShieldCheck, Star, Sparkles, Flame, Tag, Check, Palette
} from 'lucide-react';
import { StoreThemeProps } from '../../types/theme';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import './electroOrangeTheme.css';
import { 
  ELECTRO_SMARTWATCH_DUO_SVG, 
  ELECTRO_HEADPHONES_HERO_SVG, 
  ELECTRO_CAMERA_MINI_SVG, 
  ELECTRO_LAPTOP_MINI_SVG, 
  ELECTRO_DESKTOP_MINI_SVG, 
  ELECTRO_ACTION_CAM_MINI_SVG,
  ELECTRO_XBOX_CONTROLLER_SVG,
  ELECTRO_SPEAKER_OVAL_SVG,
  ELECTRO_SMARTPHONE_GOLD_SVG,
  ELECTRO_REVERSIBLE_LAPTOP_SVG,
  ELECTRO_NX_CAMERA_SVG,
  ELECTRO_PRINTER_SVG,
  ELECTRO_USB_DRIVE_SVG,
  ELECTRO_VR_HEADSET_SVG
} from './electroOrangeAssets';
import { 
  ELECTRO_DEPARTMENTS, 
  ElectroDepartmentCategory 
} from './electroOrangeCategoriesData';
import { ElectroProductCard } from './ElectroProductCard';
import { 
  SPECIAL_OFFER_DEFAULT, 
  ELECTRO_SHOWCASE_PRODUCTS, 
  ELECTRO_ADDITIONAL_PRODUCTS 
} from './electroTechData';
import { ElectroHeader } from './ElectroHeader';
import { ElectroPDP } from './ElectroPDP';
import { ElectroCatalog } from './ElectroCatalog';
import { ElectroFooter } from './ElectroFooter';
import { AdaptiveHeaderEngine } from '../../components/storeBuilder/headers/AdaptiveHeaderEngine';
import { AdaptiveFooterEngine } from '../../components/storeBuilder/footers/AdaptiveFooterEngine';
import { AdminSectionEditTrigger } from '../../components/storeBuilder/AdminSectionEditTrigger';
import { AdminProductQuickBar } from '../../components/storeBuilder/AdminProductQuickBar';
import { LiveEditable } from '../../components/storeBuilder/LiveEditable';

// Slides du Hero Slider 50/50
interface HeroSlide {
  id: number;
  badge: string;
  lightTitle: string;
  boldSubtitle: string;
  fromText: string;
  price: number;
  originalPrice?: number;
  image: string;
  ctaText: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    badge: 'MONTRES CONNECTÉES PRO',
    lightTitle: 'THE NEW STANDARD',
    boldSubtitle: 'UNDER FAVORABLE SMARTWATCHES',
    fromText: 'À PARTIR DE',
    price: 145000,
    originalPrice: 185000,
    image: ELECTRO_SMARTWATCH_DUO_SVG,
    ctaText: 'Acheter maintenant'
  },
  {
    id: 2,
    badge: 'AUDIO HAUTE FIDÉLITÉ',
    lightTitle: 'ACOUSTIQUE PURE SANS FIL',
    boldSubtitle: 'CASQUES ROSE GOLD & BLANC',
    fromText: 'À PARTIR DE',
    price: 29900,
    originalPrice: 45000,
    image: ELECTRO_HEADPHONES_HERO_SVG,
    ctaText: 'Découvrir le son'
  }
];

export const ThemeElectroOrange: React.FC<StoreThemeProps> = (props) => {
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
    onOpenEditProduct,
    onEditProduct,
    onPreviewFunnel,
    onSelectCustomizerSection,
    onOpenFunnel,
    onRemoveProduct,
    onShareProduct,
    onOpenAddProduct,
    onOpenThemeSelector,
    customConfig
  } = props;
  // Navigation entre les vues : 'home' (Accueil), 'shop' (Catalogue & Filtres), 'pdp' (Fiche Produit Détaillée)
  const [currentView, setCurrentView] = useState<'home' | 'shop' | 'pdp'>('home');
  const [activeProduct, setActiveProduct] = useState<StoreProductItem | null>(selectedProduct || null);

  // Synchronisation avec selectedProduct transmis par les props parentes
  useEffect(() => {
    if (selectedProduct) {
      setActiveProduct(selectedProduct);
      setCurrentView('pdp');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedProduct]);

  // États de navigation et d'interface
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [hoveredCategory, setHoveredCategory] = useState<ElectroDepartmentCategory | null>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [compareCount, setCompareCount] = useState<number>(0);
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState<boolean>(true);

  // Rotation automatique du Hero Slider toutes les 7 secondes sur l'accueil
  useEffect(() => {
    if (currentView !== 'home') return;
    const slideTimer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(slideTimer);
  }, [currentView]);

  // Compte à rebours temps réel de l'Offre Spéciale
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 8,
    minutes: 42,
    seconds: 19
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Onglet sélectionné pour la grille 3x2 asymétrique (En vedette | En promo | Mieux notés)
  const [asymActiveTab, setAsymActiveTab] = useState<'featured' | 'on_sale' | 'top_rated'>('featured');

  // Catégorie active pour la section Produit Vedette Central
  const [centerActiveCategory, setCenterActiveCategory] = useState<string>('Best Deals');

  // Miniature active du Produit Vedette Central (0 à 3)
  const [activeCenterThumbIndex, setActiveCenterThumbIndex] = useState<number>(0);

  // Notification Toast pour retours interactifs
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleAddToWishlist = (product: StoreProductItem) => {
    playTapBeep();
    setWishlistCount(prev => prev + 1);
    triggerToast(`"${product.name}" ajouté à vos favoris ♡`);
  };

  const handleAddToCompare = (product: StoreProductItem) => {
    playTapBeep();
    setCompareCount(prev => prev + 1);
    triggerToast(`"${product.name}" ajouté au comparateur ⇄`);
  };

  // Synchronisation des produits réels de la vitrine
  const displayProducts = useMemo(() => {
    if (filteredProducts && filteredProducts.length > 0) return filteredProducts;
    if (allProducts && allProducts.length > 0) return allProducts;
    return ELECTRO_SHOWCASE_PRODUCTS;
  }, [filteredProducts, allProducts]);

  // Ouverture d'une fiche produit (PDP)
  const handleOpenPDP = (product: StoreProductItem) => {
    playTapBeep();
    setActiveProduct(product);
    setCurrentView('pdp');
    if (onSelectProduct) onSelectProduct(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Retour depuis la PDP
  const handleBackFromPDP = () => {
    playTapBeep();
    setCurrentView('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Produit de l'Offre Spéciale
  const specialOfferProduct = useMemo(() => {
    if (customConfig?.specialOfferProductId) {
      const picked = displayProducts.find(p => p.id === customConfig.specialOfferProductId);
      if (picked) {
        const diff = (picked.originalPrice && picked.originalPrice > picked.price)
          ? picked.originalPrice - picked.price
          : 0;
        return {
          ...picked,
          available: picked.stock || 6,
          alreadySold: 28,
          discountAmount: diff
        };
      }
    }
    const promo = displayProducts.find(p => p.originalPrice && p.originalPrice > p.price);
    if (promo) {
      const diff = (promo.originalPrice || 0) - promo.price;
      return {
        ...promo,
        available: promo.stock || 6,
        alreadySold: 28,
        discountAmount: diff
      };
    }
    return SPECIAL_OFFER_DEFAULT;
  }, [displayProducts, customConfig?.specialOfferProductId]);

  // Produits filtrés pour la grille 3x2 de la section asymétrique
  const asymGridProducts = useMemo(() => {
    let pool = [...displayProducts];
    if (pool.length < 6) {
      pool = [...pool, ...ELECTRO_SHOWCASE_PRODUCTS];
    }
    if (asymActiveTab === 'on_sale') {
      const saleItems = pool.filter(p => p.originalPrice && p.originalPrice > p.price);
      return (saleItems.length >= 6 ? saleItems : [...saleItems, ...pool]).slice(0, 6);
    }
    if (asymActiveTab === 'top_rated') {
      return [...pool].reverse().slice(0, 6);
    }
    return pool.slice(0, 6);
  }, [displayProducts, asymActiveTab]);

  // Variantes / Angles du Grand Produit Vedette Central
  const CENTER_FEATURE_VARIANTS = useMemo(() => [
    {
      id: 0,
      title: 'Casque Hi-Fi Wireless Beats Studio Solo 2 Rose Gold',
      subtitle: 'White with Rose Gold Metallic Finish',
      rating: 5.0,
      reviewsCount: 42,
      price: 129000,
      originalPrice: 165000,
      image: ELECTRO_HEADPHONES_HERO_SVG,
      thumb: ELECTRO_HEADPHONES_HERO_SVG,
      thumbLabel: 'Rose Gold',
      category: 'Audio & Casques'
    },
    {
      id: 1,
      title: 'Wireless Audio System Multiroom 360 Oval Acoustic',
      subtitle: 'Pure White & Brushed Chrome Base',
      rating: 5.0,
      reviewsCount: 29,
      price: 185000,
      originalPrice: 220000,
      image: ELECTRO_SPEAKER_OVAL_SVG,
      thumb: ELECTRO_SPEAKER_OVAL_SVG,
      thumbLabel: 'Enceinte 360',
      category: 'Systèmes Son Multiroom'
    },
    {
      id: 2,
      title: 'Smartwatch 2.0 LTE Stainless Steel Bezel Duo',
      subtitle: 'Silver Sport Band & Sapphire Glass',
      rating: 4.9,
      reviewsCount: 56,
      price: 110000,
      originalPrice: 145000,
      image: ELECTRO_SMARTWATCH_DUO_SVG,
      thumb: ELECTRO_SMARTWATCH_DUO_SVG,
      thumbLabel: 'Montre LTE',
      category: 'Montres & Bracelets'
    },
    {
      id: 3,
      title: 'Tablet White EliteBook Revolve 810 G2 Touch 360',
      subtitle: 'Intel Core i7 16GB SSD 512GB IPS',
      rating: 4.8,
      reviewsCount: 22,
      price: 349000,
      originalPrice: 420000,
      image: ELECTRO_REVERSIBLE_LAPTOP_SVG,
      thumb: ELECTRO_REVERSIBLE_LAPTOP_SVG,
      thumbLabel: 'Laptop 360',
      category: 'PC Portables & Tablettes'
    }
  ], []);

  const currentCenterFeature = CENTER_FEATURE_VARIANTS[activeCenterThumbIndex] || CENTER_FEATURE_VARIANTS[0];

  // Colonnes gauche (2 produits) et droite (2 produits) du bloc vedette central
  const centerLeftProducts = useMemo(() => {
    const list = displayProducts.length >= 4 ? displayProducts : [...displayProducts, ...ELECTRO_SHOWCASE_PRODUCTS];
    return list.slice(0, 2);
  }, [displayProducts]);

  const centerRightProducts = useMemo(() => {
    const list = displayProducts.length >= 4 ? displayProducts : [...displayProducts, ...ELECTRO_SHOWCASE_PRODUCTS, ...ELECTRO_ADDITIONAL_PRODUCTS];
    return list.slice(2, 4);
  }, [displayProducts]);

  const currentHero = useMemo(() => {
    if (customConfig?.heroTitle || customConfig?.heroBannerImageUrl) {
      return {
        id: 99,
        badge: customConfig.heroSubtitle || 'PROMO EXCLUSIVE',
        lightTitle: customConfig.heroSubtitle || 'NOUVELLE COLLECTION',
        boldSubtitle: customConfig.heroTitle || 'High-Tech & Électronique',
        fromText: 'À partir de',
        price: customConfig.heroPriceHighlight ? parseInt(customConfig.heroPriceHighlight.replace(/\D/g, '')) || 25000 : 25000,
        image: customConfig.heroBannerImageUrl || HERO_SLIDES[activeSlide]?.image,
        ctaText: customConfig.heroCtaText || 'DÉCOUVRIR L\'OFFRE'
      };
    }
    return HERO_SLIDES[activeSlide] || HERO_SLIDES[0];
  }, [customConfig, activeSlide]);

  return (
    <div className="electro-root min-h-screen w-full bg-[#FFFFFF] text-[#333E48] flex flex-col selection:bg-[#FF6A00] selection:text-white">
      
      {/* =========================================================================
          1. HEADER ADAPTATIF À 3 NIVEAUX
          - Blanc sur l'Accueil
          - FOND PLEIN ORANGE (#FF6A00) SUR LES PAGES INTERNES (PDP & CATALOGUE) !
         ========================================================================= */}
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
            products={displayProducts}
            categories={categories}
            storeSlug={storeConfig?.slug || storeConfig?.storeName || 'boutique'}
            onOpenFunnel={onOpenFunnel}
            onSelectProduct={handleOpenPDP}
            onResetToHome={() => {
              setCurrentView('home');
              setActiveProduct(null);
            }}
            onSelectCategory={(cat) => {
              onSelectCategory(cat);
              setCurrentView('shop');
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
          <ElectroHeader
            storeName={customConfig?.storeName || storeConfig.storeName}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              onSelectCategory(cat);
              setCurrentView('shop');
            }}
            cartCount={cartCount}
            wishlistCount={wishlistCount}
            compareCount={compareCount}
            currentView={currentView}
            onNavigate={(view) => {
              setCurrentView(view);
              if (view === 'home') setActiveProduct(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenThemeSelector={onOpenThemeSelector}
            isDepartmentsOpen={isDepartmentsOpen}
            setIsDepartmentsOpen={setIsDepartmentsOpen}
            onCartClick={() => {
              if (displayProducts[0]) handleOpenPDP(displayProducts[0]);
            }}
            customConfig={customConfig}
          />
        </div>
      )}

      {/* =========================================================================
          2. CONTENU PRINCIPAL SELON LA VUE ACTIVE
         ========================================================================= */}
      
      {/* -------------------------------------------------------------------------
          VUE A : PAGE PRODUIT DÉTAILLÉE (PDP) & VENTE GROUPÉE (BUNDLE)
         ------------------------------------------------------------------------- */}
      {currentView === 'pdp' && activeProduct && (
        <ElectroPDP
          product={activeProduct}
          allProducts={displayProducts}
          onBack={handleBackFromPDP}
          onNavigate={(view) => {
            setCurrentView(view);
            if (view === 'home') setActiveProduct(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onAddToCart={(p, qty) => {
            setCartCount(prev => prev + qty);
            onAddToCart(p, qty);
            triggerToast(`"${p.name}" ajouté au panier !`);
          }}
          onBuyNow={(p, qty) => {
            setCartCount(prev => prev + qty);
            onBuyNow(p, qty);
          }}
          onOpenFunnel={onOpenFunnel}
          onAddToWishlist={handleAddToWishlist}
          onAddToCompare={handleAddToCompare}
          onSelectProduct={handleOpenPDP}
        />
      )}

      {/* -------------------------------------------------------------------------
          VUE B : PAGE CATALOGUE (SHOP) AVEC SIDEBAR 270PX & FILTRES
         ------------------------------------------------------------------------- */}
      {currentView === 'shop' && (
        <ElectroCatalog
          products={displayProducts}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          onSelectProduct={handleOpenPDP}
          onAddToCart={(p, qty) => {
            setCartCount(prev => prev + (qty || 1));
            onAddToCart(p, qty || 1);
            triggerToast(`"${p.name}" ajouté au panier !`);
          }}
          onAddToWishlist={handleAddToWishlist}
          onAddToCompare={handleAddToCompare}
          onNavigatePDP={handleOpenPDP}
        />
      )}

      {/* -------------------------------------------------------------------------
          VUE C : PAGE D'ACCUEIL COMPLÈTE (HOME)
         ------------------------------------------------------------------------- */}
      {currentView === 'home' && (
        <>
          {/* BLOC HERO + MENU VERTICAL (270PX) + SLIDER 50/50 */}
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-6">
            <div className="flex items-start gap-6 relative">
              
              {/* COLONNE GAUCHE (270PX) : Liste verticale des départements */}
              {isDepartmentsOpen && (
                <aside 
                  className="electro-categories-sidebar shrink-0 hidden lg:block"
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <div className="flex flex-col">
                    {ELECTRO_DEPARTMENTS.map((dept) => {
                      const isHovered = hoveredCategory?.id === dept.id;
                      return (
                        <div
                          key={dept.id}
                          onMouseEnter={() => {
                            if (dept.hasSubmenu) setHoveredCategory(dept);
                            else setHoveredCategory(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            if (dept.hasSubmenu) {
                              setHoveredCategory(prev => (prev?.id === dept.id ? null : dept));
                            } else {
                              onSelectCategory(dept.name);
                              setCurrentView('shop');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          className={`electro-cat-item ${dept.isFeatured ? 'featured' : ''} ${isHovered ? 'active' : ''}`}
                        >
                          <span className="truncate">{dept.name}</span>
                          {dept.hasSubmenu && (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* MEGA-MENU DÉROULANT AU SURVOL VERS LA DROITE */}
                  {hoveredCategory && hoveredCategory.columns && (
                    <div 
                      className="electro-megamenu-panel"
                      onMouseEnter={() => setHoveredCategory(hoveredCategory)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      {hoveredCategory.columns.map((col, cIdx) => (
                        <div key={cIdx} className="space-y-3">
                          <h4 className="text-xs font-black text-[#333E48] uppercase tracking-wider border-b border-slate-100 pb-2">
                            {col.title}
                          </h4>
                          <ul className="space-y-2">
                            {col.items.map((item, iIdx) => (
                              <li key={iIdx}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    playTapBeep();
                                    onSearchChange(item);
                                    setHoveredCategory(null);
                                    setCurrentView('shop');
                                  }}
                                  className="text-xs text-slate-600 hover:text-[#FF6A00] hover:font-bold transition text-left cursor-pointer flex items-center gap-1.5 group"
                                >
                                  <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-[#FF6A00]" />
                                  <span>{item}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}

                      {hoveredCategory.promoBanner && (
                        <div className="rounded bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 border border-orange-200/80 p-4 flex flex-col justify-between text-left shadow-xs">
                          <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FF6A00] text-white inline-block">
                              {hoveredCategory.promoBanner.badge}
                            </span>
                            <h5 className="text-base font-black text-slate-900 leading-tight">
                              {hoveredCategory.promoBanner.title}
                            </h5>
                            <p className="text-[11px] text-slate-600 leading-snug">
                              {hoveredCategory.promoBanner.subtitle}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              setHoveredCategory(null);
                              setCurrentView('shop');
                            }}
                            className="mt-4 px-3 py-2 rounded-full bg-[#FF6A00] hover:bg-[#E05D00] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between cursor-pointer transition shadow-xs"
                          >
                            <span>{hoveredCategory.promoBanner.cta}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </aside>
              )}

              {/* COLONNE DROITE : LE SLIDER HERO 50/50 */}
              <div className="flex-1 w-full min-w-0 relative group">
                <AdminSectionEditTrigger
                  label="✏️ Personnaliser le Hero (Titre, Image & Promo) ⚡"
                  targetAccordion={2}
                  onSelectSection={onSelectCustomizerSection}
                  isPublicView={isPublicView}
                  isAdminPreview={isAdminPreview}
                  position="top-right"
                />
                <div className="electro-hero-slider p-6 sm:p-10 lg:p-12">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center w-full z-10">
                    
                    {/* 50% Gauche : Typographie géante & Bouton Orange */}
                    <div className="md:col-span-6 space-y-4 text-left">
                      <LiveEditable
                        label="Badge Promo Hero"
                        field="heroSubtitle"
                        value={customConfig?.heroSubtitle || currentHero.badge}
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                        isInline={true}
                      >
                        <div className="inline-block text-[11px] font-black uppercase tracking-widest text-[#FF6A00] bg-orange-100/70 px-2.5 py-0.5 rounded">
                          {customConfig?.heroSubtitle || currentHero.badge}
                        </div>
                      </LiveEditable>

                      <div className="space-y-1">
                        <LiveEditable
                          label="Accroche Légère Hero"
                          field="heroLightTitle"
                          value={customConfig?.heroLightTitle || currentHero.lightTitle}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                        >
                          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-slate-800 tracking-tight leading-none">
                            {customConfig?.heroLightTitle || currentHero.lightTitle}
                          </h2>
                        </LiveEditable>
                        <LiveEditable
                          label="Titre Principal Hero"
                          field="heroTitle"
                          value={customConfig?.heroTitle || currentHero.boldSubtitle}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                        >
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#333E48] tracking-tight leading-tight">
                            {customConfig?.heroTitle || currentHero.boldSubtitle}
                          </h3>
                        </LiveEditable>
                      </div>

                      <div className="pt-2 flex items-baseline gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {currentHero.fromText}
                        </span>
                        <strong className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#333E48] font-mono leading-none">
                          {formatCFA(currentHero.price)}
                        </strong>
                        {currentHero.originalPrice && (
                          <span className="text-sm font-semibold text-slate-400 line-through">
                            {formatCFA(currentHero.originalPrice)}
                          </span>
                        )}
                      </div>

                      <div className="pt-3">
                        <LiveEditable
                          label="Bouton CTA Hero"
                          field="heroCtaText"
                          value={customConfig?.heroCtaText || currentHero.ctaText}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                          isInline={true}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              playValidationBeep();
                              setCartCount(prev => prev + 1);
                              const linked = customConfig?.heroLinkedProductId
                                ? displayProducts.find(p => p.id === customConfig.heroLinkedProductId)
                                : displayProducts[0];
                              if (linked) onBuyNow(linked, 1);
                            }}
                            className="electro-hero-btn cursor-pointer"
                          >
                            <span>{customConfig?.heroCtaText || currentHero.ctaText}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </LiveEditable>
                      </div>
                    </div>

                    {/* 50% Droite : Image ou Vidéo Produit Phare */}
                    <div className="md:col-span-6 flex items-center justify-center -my-4">
                      <LiveEditable
                        label="Visuel Hero Image / Vidéo"
                        field="heroBannerImageUrl"
                        value={customConfig?.heroBannerImageUrl || currentHero.image}
                        type="image"
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                      >
                        {customConfig?.heroVideoUrl ? (
                          <video
                            src={customConfig.heroVideoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="max-h-[300px] sm:max-h-[340px] w-auto object-contain rounded-xl"
                          />
                        ) : (
                          <img
                            src={customConfig?.heroBannerImageUrl || currentHero.image}
                            alt={currentHero.boldSubtitle}
                            className="max-h-[300px] sm:max-h-[340px] w-auto object-contain transform hover:scale-105 transition-transform duration-300"
                          />
                        )}
                      </LiveEditable>
                    </div>
                  </div>

                  {/* Dots de pagination */}
                  <div className="absolute bottom-4 left-6 sm:left-10 flex items-center gap-2 z-20">
                    {HERO_SLIDES.map((slide, sIdx) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setActiveSlide(sIdx);
                        }}
                        className={`electro-dot ${activeSlide === sIdx ? 'active' : ''}`}
                        title={`Slide ${sIdx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SOUS-BANNIÈRES SECONDAIRES PERSONNALISÉES (subBanner1 & subBanner2) */}
            {(customConfig?.subBanner1Title || customConfig?.subBanner1Image || customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
              <div className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(customConfig?.subBanner1Title || customConfig?.subBanner1Image) && (
                    <div
                      onClick={() => {
                        playTapBeep();
                        setCurrentView('shop');
                      }}
                      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FF6A00] to-amber-600 text-white p-5 flex items-center justify-between gap-4 cursor-pointer hover:shadow-lg transition-all group"
                    >
                      <div className="space-y-1.5 z-10">
                        {customConfig?.subBanner1Badge && (
                          <LiveEditable
                            label="Badge Bannière 1"
                            field="subBanner1Badge"
                            value={customConfig.subBanner1Badge}
                            targetAccordion={2}
                            isAdminPreview={isAdminPreview}
                            isInline={true}
                          >
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/20 text-white inline-block">
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
                          <h4 className="text-lg font-black leading-tight text-white group-hover:text-amber-100 transition-colors">
                            {customConfig.subBanner1Title}
                          </h4>
                        </LiveEditable>
                        {customConfig?.subBanner1Subtitle && (
                          <LiveEditable
                            label="Sous-titre Bannière 1"
                            field="subBanner1Subtitle"
                            value={customConfig.subBanner1Subtitle}
                            targetAccordion={2}
                            isAdminPreview={isAdminPreview}
                          >
                            <p className="text-xs text-white/90 max-w-xs">{customConfig.subBanner1Subtitle}</p>
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
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-white pt-1">
                              <span>{customConfig.subBanner1CtaText}</span>
                              <span className="group-hover:translate-x-1 transition-transform">›</span>
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
                            className="w-24 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                          />
                        </LiveEditable>
                      )}
                    </div>
                  )}
                  {(customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
                    <div
                      onClick={() => {
                        playTapBeep();
                        setCurrentView('shop');
                      }}
                      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between gap-4 cursor-pointer hover:shadow-lg transition-all group"
                    >
                      <div className="space-y-1.5 z-10">
                        {customConfig?.subBanner2Badge && (
                          <LiveEditable
                            label="Badge Bannière 2"
                            field="subBanner2Badge"
                            value={customConfig.subBanner2Badge}
                            targetAccordion={2}
                            isAdminPreview={isAdminPreview}
                            isInline={true}
                          >
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FF6A00] text-white inline-block">
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
                          <h4 className="text-lg font-black leading-tight text-white group-hover:text-[#FF6A00] transition-colors">
                            {customConfig.subBanner2Title}
                          </h4>
                        </LiveEditable>
                        {customConfig?.subBanner2Subtitle && (
                          <LiveEditable
                            label="Sous-titre Bannière 2"
                            field="subBanner2Subtitle"
                            value={customConfig.subBanner2Subtitle}
                            targetAccordion={2}
                            isAdminPreview={isAdminPreview}
                          >
                            <p className="text-xs text-slate-300 max-w-xs">{customConfig.subBanner2Subtitle}</p>
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
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF6A00] pt-1">
                              <span>{customConfig.subBanner2CtaText}</span>
                              <span className="group-hover:translate-x-1 transition-transform">›</span>
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
                            className="w-24 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                          />
                        </LiveEditable>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LES 4 MINI-BANNIÈRES HORIZONTALES */}
            <div className="pt-6">
              <div className="electro-mini-banners-grid">
                
                <div 
                  onClick={() => {
                    playTapBeep();
                    onSearchChange('Caméra');
                    setCurrentView('shop');
                  }}
                  className="electro-mini-card group"
                >
                  <div className="electro-mini-card-img">
                    <img 
                      src={ELECTRO_CAMERA_MINI_SVG} 
                      alt="Caméras & Photo" 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform" 
                    />
                  </div>
                  <div className="electro-mini-card-content space-y-1">
                    <h4 className="text-xs font-black uppercase text-[#333E48] tracking-tight leading-tight">
                      GRANDES OFFRES SUR LES CAMÉRAS
                    </h4>
                    <div className="text-xs font-bold text-slate-500 group-hover:text-[#FF6A00] flex items-center gap-1 transition">
                      <span>Voir l'offre</span>
                      <span className="electro-round-arrow">›</span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => {
                    playTapBeep();
                    onSearchChange('Ordinateur');
                    setCurrentView('shop');
                  }}
                  className="electro-mini-card group"
                >
                  <div className="electro-mini-card-img">
                    <img 
                      src={ELECTRO_LAPTOP_MINI_SVG} 
                      alt="PC Portables" 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform" 
                    />
                  </div>
                  <div className="electro-mini-card-content space-y-1">
                    <h4 className="text-xs font-black uppercase text-[#333E48] tracking-tight leading-tight">
                      PROMOS SUR LES PC & TABLETTES
                    </h4>
                    <div className="text-xs font-bold text-slate-500 group-hover:text-[#FF6A00] flex items-center gap-1 transition">
                      <span>Voir l'offre</span>
                      <span className="electro-round-arrow">›</span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => {
                    playTapBeep();
                    onSearchChange('Gaming');
                    setCurrentView('shop');
                  }}
                  className="electro-mini-card group"
                >
                  <div className="electro-mini-card-img">
                    <img 
                      src={ELECTRO_DESKTOP_MINI_SVG} 
                      alt="Tours PC Gamer" 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform" 
                    />
                  </div>
                  <div className="electro-mini-card-content space-y-1">
                    <h4 className="text-xs font-black uppercase text-[#333E48] tracking-tight leading-tight">
                      OFFRES SUR LES PC GAMING RGB
                    </h4>
                    <div className="text-xs font-bold text-slate-500 group-hover:text-[#FF6A00] flex items-center gap-1 transition">
                      <span>Voir l'offre</span>
                      <span className="electro-round-arrow">›</span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => {
                    playTapBeep();
                    onSearchChange('Accessoires');
                    setCurrentView('shop');
                  }}
                  className="electro-mini-card group"
                >
                  <div className="electro-mini-card-img">
                    <img 
                      src={ELECTRO_ACTION_CAM_MINI_SVG} 
                      alt="Caméras 360" 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform" 
                    />
                  </div>
                  <div className="electro-mini-card-content space-y-1">
                    <h4 className="text-xs font-black uppercase text-[#333E48] tracking-tight leading-tight">
                      ACTION CAMS & GADGETS 360°
                    </h4>
                    <div className="text-xs font-bold text-slate-500 group-hover:text-[#FF6A00] flex items-center gap-1 transition">
                      <span>Voir l'offre</span>
                      <span className="electro-round-arrow">›</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* LA SECTION ASYMÉTRIQUE (GRILLE 320PX 1FR) - OFFRE SPÉCIALE & ONGLETS */}
          <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="electro-asym-section">
              
              {/* COLONNE GAUCHE (LE BLOC "OFFRE SPÉCIALE" 320PX) */}
              <div className="electro-special-offer-card group relative">
                <AdminSectionEditTrigger
                  label="✏️ Configurer l'Offre Spéciale & Compte à Rebours ⚡"
                  targetAccordion={3}
                  onSelectSection={onSelectCustomizerSection}
                  isPublicView={isPublicView}
                  isAdminPreview={isAdminPreview}
                  position="top-right"
                />
                <div className="electro-save-badge">
                  <span className="save-label">Économisez</span>
                  <span className="save-amount">
                    {customConfig?.specialOfferSaveBadgeText || (specialOfferProduct.discountAmount ? formatCFA(specialOfferProduct.discountAmount) : '16 000 F')}
                  </span>
                </div>

                <div className="pr-16">
                  <h3 className="text-xl font-black text-[#333E48] tracking-tight uppercase">
                    Offre Spéciale
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {specialOfferProduct.category || 'Jeux Vidéo & Accessoires'}
                  </span>
                </div>

                <div 
                  onClick={() => handleOpenPDP(specialOfferProduct)}
                  className="w-full aspect-square my-3 flex items-center justify-center p-2 cursor-pointer bg-white"
                >
                  <img
                    src={specialOfferProduct.image}
                    alt={specialOfferProduct.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                <div className="space-y-1.5 text-center">
                  <h4 
                    onClick={() => handleOpenPDP(specialOfferProduct)}
                    className="electro-product-title text-sm line-clamp-2 cursor-pointer hover:underline"
                  >
                    {specialOfferProduct.name}
                  </h4>

                  <div className="flex items-center justify-center gap-3 pt-1">
                    {specialOfferProduct.originalPrice && (
                      <span className="text-sm font-semibold text-slate-400 line-through">
                        {formatCFA(specialOfferProduct.originalPrice)}
                      </span>
                    )}
                    <span className="text-2xl font-black text-[#E52E04] font-mono leading-none">
                      {formatCFA(specialOfferProduct.price)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>Disponible : <strong className="text-slate-900">{specialOfferProduct.available || 6}</strong></span>
                    <span>Déjà vendu : <strong className="text-slate-900">{specialOfferProduct.alreadySold || 28}</strong></span>
                  </div>

                  <div className="w-full h-2.5 bg-[#EAEAEA] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FF6A00] rounded-full transition-all duration-500"
                      style={{ width: '78%' }}
                    />
                  </div>
                </div>

                <div className="pt-4 text-center space-y-2">
                  <span className="text-xs font-bold text-slate-600 block">
                    Dépêchez-vous ! L'offre se termine dans :
                  </span>

                  <div className="flex items-center justify-center gap-2">
                    <div className="electro-countdown-box">
                      <div className="electro-countdown-num">
                        {String(countdown.hours).padStart(2, '0')}
                      </div>
                      <div className="electro-countdown-lbl">HEURES</div>
                    </div>

                    <span className="font-black text-slate-400 text-lg">:</span>

                    <div className="electro-countdown-box">
                      <div className="electro-countdown-num">
                        {String(countdown.minutes).padStart(2, '0')}
                      </div>
                      <div className="electro-countdown-lbl">MINS</div>
                    </div>

                    <span className="font-black text-slate-400 text-lg">:</span>

                    <div className="electro-countdown-box">
                      <div className="electro-countdown-num">
                        {String(countdown.seconds).padStart(2, '0')}
                      </div>
                      <div className="electro-countdown-lbl">SECS</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        playValidationBeep();
                        setCartCount(prev => prev + 1);
                        onBuyNow(specialOfferProduct, 1);
                      }}
                      className="w-full py-2.5 px-4 rounded-full bg-[#FF6A00] hover:bg-[#E05D00] text-white font-extrabold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Profiter du deal</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* COLONNE DROITE (GRILLE À ONGLETS : "EN VEDETTE | EN PROMO | MIEUX NOTÉS") */}
              <div className="flex flex-col min-w-0">
                <div className="electro-tabs-bar">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setAsymActiveTab('featured');
                    }}
                    className={`electro-tab-btn ${asymActiveTab === 'featured' ? 'active' : ''}`}
                  >
                    En vedette
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setAsymActiveTab('on_sale');
                    }}
                    className={`electro-tab-btn ${asymActiveTab === 'on_sale' ? 'active' : ''}`}
                  >
                    En promo
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setAsymActiveTab('top_rated');
                    }}
                    className={`electro-tab-btn ${asymActiveTab === 'top_rated' ? 'active' : ''}`}
                  >
                    Mieux notés
                  </button>
                </div>

                <div className="electro-products-grid-3x2">
                  {asymGridProducts.map((product) => (
                    <ElectroProductCard
                      key={product.id}
                      product={product}
                      onSelectProduct={handleOpenPDP}
                      onAddToCart={(p, qty) => {
                        setCartCount(prev => prev + (qty || 1));
                        onAddToCart(p, qty);
                        triggerToast(`"${p.name}" ajouté au panier !`);
                      }}
                      onAddToWishlist={handleAddToWishlist}
                      onAddToCompare={handleAddToCompare}
                      isPublicView={isPublicView}
                      isAdminPreview={isAdminPreview}
                      storeSlug={storeConfig.slug || storeConfig.storeName}
                      onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
                      onPreviewFunnel={onPreviewFunnel}
                    />
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* LA SECTION "PRODUIT VEDETTE CENTRAL" (GRILLE 3 COLONNES : 1FR 1.5FR 1FR) */}
          <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-[#EAEAEA]">
            <div className="flex items-center justify-between mb-4 border-b border-[#EAEAEA] pb-0">
              <div className="electro-tabs-bar border-b-0 mb-0">
                {['Best Deals', 'TV & Vidéo', 'Caméras', 'Audio', 'Smartphones', 'Informatique', 'Accessoires'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setCenterActiveCategory(tab);
                    }}
                    className={`electro-tab-btn ${centerActiveCategory === tab ? 'active' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="hidden md:flex items-center gap-2 pb-2 text-xs font-bold text-slate-500">
                <span className="text-[#FF6A00] font-black">Top Ventes</span>
                <span>du mois</span>
              </div>
            </div>

            <div className="electro-featured-center-grid">
              
              {/* Colonne Gauche (1fr) */}
              <div className="flex flex-col">
                {centerLeftProducts.map((prod) => (
                  <ElectroProductCard
                    key={`center-left-${prod.id}`}
                    product={prod}
                    onSelectProduct={handleOpenPDP}
                    onAddToCart={(p, qty) => {
                      setCartCount(prev => prev + (qty || 1));
                      onAddToCart(p, qty);
                      triggerToast(`"${p.name}" ajouté au panier !`);
                    }}
                    onAddToWishlist={handleAddToWishlist}
                    onAddToCompare={handleAddToCompare}
                    isPublicView={isPublicView}
                    isAdminPreview={isAdminPreview}
                    storeSlug={storeConfig.slug || storeConfig.storeName}
                    onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
                    onPreviewFunnel={onPreviewFunnel}
                  />
                ))}
              </div>

              {/* Colonne Centrale (1.5fr) */}
              <div className="electro-center-feature-col group">
                <div className="space-y-1 w-full text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    {currentCenterFeature.category}
                  </span>
                  <h3 
                    onClick={() => handleOpenPDP(currentCenterFeature as any)}
                    className="text-lg sm:text-xl font-bold text-[#0062BD] leading-snug hover:text-[#FF6A00] transition cursor-pointer"
                  >
                    {currentCenterFeature.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {currentCenterFeature.subtitle}
                  </p>

                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <div className="flex items-center text-amber-400">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <Star className="w-4 h-4 fill-amber-400" />
                      <Star className="w-4 h-4 fill-amber-400" />
                      <Star className="w-4 h-4 fill-amber-400" />
                      <Star className="w-4 h-4 fill-amber-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600">
                      {currentCenterFeature.rating} ({currentCenterFeature.reviewsCount} avis)
                    </span>
                  </div>
                </div>

                <div 
                  onClick={() => handleOpenPDP(currentCenterFeature as any)}
                  className="w-full my-6 flex items-center justify-center p-2 min-h-[220px] cursor-pointer"
                >
                  <img
                    src={currentCenterFeature.image}
                    alt={currentCenterFeature.title}
                    className="max-h-[240px] sm:max-h-[260px] w-auto object-contain transform group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="flex items-center justify-center gap-2 mb-4 w-full">
                  {CENTER_FEATURE_VARIANTS.map((variant, vIdx) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setActiveCenterThumbIndex(vIdx);
                      }}
                      className={`w-14 h-14 p-1 rounded border-2 bg-white transition cursor-pointer flex items-center justify-center ${
                        activeCenterThumbIndex === vIdx 
                          ? 'border-[#FF6A00] shadow-sm' 
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                      title={variant.thumbLabel}
                    >
                      <img
                        src={variant.thumb}
                        alt={variant.thumbLabel}
                        className="max-h-full max-w-full object-contain"
                      />
                    </button>
                  ))}
                </div>

                <div className="w-full flex flex-col items-center gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-semibold text-slate-400 line-through">
                      {formatCFA(currentCenterFeature.originalPrice)}
                    </span>
                    <span className="text-3xl font-black text-[#333E48] font-mono">
                      {formatCFA(currentCenterFeature.price)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      setCartCount(prev => prev + 1);
                      if (displayProducts[0]) {
                        onAddToCart(displayProducts[0], 1);
                      }
                      triggerToast(`Produit ajouté au panier !`);
                    }}
                    className="electro-pill-cart-btn"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Ajouter au panier</span>
                  </button>
                </div>
              </div>

              {/* Colonne Droite (1fr) */}
              <div className="flex flex-col">
                {centerRightProducts.map((prod) => (
                  <ElectroProductCard
                    key={`center-right-${prod.id}`}
                    product={prod}
                    onSelectProduct={handleOpenPDP}
                    onAddToCart={(p, qty) => {
                      setCartCount(prev => prev + (qty || 1));
                      onAddToCart(p, qty);
                      triggerToast(`"${p.name}" ajouté au panier !`);
                    }}
                    onAddToWishlist={handleAddToWishlist}
                    onAddToCompare={handleAddToCompare}
                    isPublicView={isPublicView}
                    isAdminPreview={isAdminPreview}
                    storeSlug={storeConfig.slug || storeConfig.storeName}
                    onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
                    onPreviewFunnel={onPreviewFunnel}
                  />
                ))}
              </div>

            </div>
          </section>

          {/* CATALOGUE DES ARTICLES RECOMMANDÉS (IMAGE 1) */}
          <section id="electro-catalog-section" className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-[#EAEAEA] relative group">
            <AdminSectionEditTrigger
              label="✏️ Modifier la Grille & Titre Catalogue ⚡"
              targetAccordion={3}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#EAEAEA]">
              <div className="flex items-center gap-3">
                <LiveEditable
                  label="Titre du Catalogue"
                  field="catalogTitle"
                  value={customConfig?.catalogTitle || 'Articles Recommandés & Nouveautés'}
                  targetAccordion={3}
                  isAdminPreview={isAdminPreview}
                >
                  <h2 className="text-xl font-black text-[#333E48] tracking-tight uppercase">
                    {customConfig?.catalogTitle || 'Articles Recommandés & Nouveautés'}
                  </h2>
                </LiveEditable>
                <span className="text-xs font-bold text-[#FF6A00] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  {displayProducts.length} produits
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('Tous');
                    setCurrentView('shop');
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer bg-[#FF6A00] text-white shadow-xs"
                >
                  Voir tout le shop
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {displayProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleOpenPDP(product)}
                  className="bg-white border border-[#EAEAEA] rounded hover:border-[#FF6A00] hover:shadow-lg transition-all p-3 flex flex-col justify-between group cursor-pointer relative"
                >
                  <AdminProductQuickBar
                    product={product}
                    isPublicView={isPublicView}
                    isAdminPreview={isAdminPreview}
                    storeSlug={storeConfig.slug || storeConfig.storeName}
                    onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
                    onPreviewFunnel={onPreviewFunnel}
                  />

                  <div className="w-full aspect-square bg-[#FBFBFB] rounded overflow-hidden flex items-center justify-center p-2 relative">
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="absolute top-2 left-2 bg-[#FF6A00] text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs">
                        -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                      </span>
                    )}
                    <img
                      src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="pt-3 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {product.category || 'Électronique'}
                      </span>
                      <h3 className="electro-product-title line-clamp-2">
                        {product.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {product.originalPrice && (
                          <span className="text-[11px] text-slate-400 line-through block leading-none">
                            {formatCFA(product.originalPrice)}
                          </span>
                        )}
                        <span className="text-sm font-black text-[#333E48] font-mono">
                          {formatCFA(product.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playValidationBeep();
                          setCartCount(prev => prev + 1);
                          onAddToCart(product, 1);
                          triggerToast(`"${product.name}" ajouté au panier !`);
                        }}
                        className="w-8 h-8 rounded-full bg-orange-50 hover:bg-[#FF6A00] text-[#FF6A00] hover:text-white border border-orange-200 flex items-center justify-center transition cursor-pointer"
                        title="Ajouter au panier"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* =========================================================================
          3. LE PRÉ-FOOTER & FOOTER COMPLET (SUR TOUTES LES PAGES) (PROMPT 4)
          - Barre des marques en niveaux de gris
          - 3 Colonnes de mini-listes (Featured | Onsale | Top Rated)
          - Bandeau Newsletter pleine largeur en Orange Vif (#FF6A00)
          - Footer 4 colonnes #F8F8F8 avec hotline, catégories et service client
          - Sous-footer avec Copyright et badges de paiement
         ========================================================================= */}
      {customConfig?.footerStyle && customConfig.footerStyle !== 'none' ? (
        <div className="relative group/footer-section">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Contact Hotline ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <AdaptiveFooterEngine
            config={customConfig}
            products={displayProducts}
            storeSlug={storeConfig?.slug || storeConfig?.storeName || 'boutique'}
            categories={categories}
            onOpenFunnel={onOpenFunnel}
            onSelectProduct={handleOpenPDP}
            onResetToHome={() => {
              setCurrentView('home');
              setActiveProduct(null);
            }}
            onSelectCategory={(cat) => {
              onSelectCategory(cat);
              setCurrentView('shop');
            }}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Contact Hotline ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <ElectroFooter
            storeName={customConfig?.storeName || storeConfig.storeName}
            onSelectProduct={handleOpenPDP}
            onNavigateCategory={(cat) => {
              onSelectCategory(cat);
              setCurrentView('shop');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            customConfig={customConfig}
          />
        </div>
      )}

      {/* Toast Notification Flottant */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#333E48] text-white text-xs font-bold px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 border-l-4 border-[#FF6A00] animate-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[#FF6A00] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
