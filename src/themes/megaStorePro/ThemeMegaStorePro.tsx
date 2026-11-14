import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, ShoppingCart, Phone, MapPin, ChevronDown, ChevronRight, 
  Menu, X, Store, Baby, Sparkles, Cpu, Home as HomeIcon, Utensils, 
  Shirt, Laptop, BookOpen, Compass, Gift, Globe, Users, Zap, 
  Truck, Percent, Ticket, Tag, Eye, Star, Palette, ArrowRight,
  ShieldCheck, Check, Clock, Flame, Heart, Layers, ArrowLeft,
  LayoutGrid, List, SlidersHorizontal, RotateCcw
} from 'lucide-react';
import { StoreThemeProps } from '../../types/theme';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import './megaStoreTheme.css';
import { MegaStoreProductCard, MegaProductExtended } from './MegaStoreProductCard';
import { MegaStorePDP } from './MegaStorePDP';
import { MegaStoreFilters, FilterState } from './MegaStoreFilters';
import { MegaStoreFooter } from './MegaStoreFooter';
import { AdaptiveHeaderEngine } from '../../components/storeBuilder/headers/AdaptiveHeaderEngine';
import { AdaptiveFooterEngine } from '../../components/storeBuilder/footers/AdaptiveFooterEngine';
import { MEGA_CATEGORIES, MegaMenuCategory } from './megaStoreCategoriesData';
import { AdminSectionEditTrigger } from '../../components/storeBuilder/AdminSectionEditTrigger';
import { LiveEditable } from '../../components/storeBuilder/LiveEditable';
import { 
  MEGA_MODEL_HERO_SVG, 
  MEGA_GROCERY_DRINKS_SVG, 
  MEGA_OLED_TV_SVG,
  FLASH_THUNDER_SVG,
  HEADSET_IMG_1,
  HEADSET_IMG_2,
  CAMERA_IMG_1,
  CAMERA_IMG_2,
  CONTROLLER_IMG_1,
  CONTROLLER_IMG_2,
  MINT_PHONE_IMG_1,
  MINT_PHONE_IMG_2,
  WATCH_IMG_1,
  WATCH_IMG_2
} from './megaStoreAssets';

// =========================================================================
// PRODUITS VENTES FLASH DE DÉMO (AVEC HOVER SWAP, RÉDUCTION & STOCK)
// =========================================================================

const DEMO_FLASH_SALE_PRODUCTS: MegaProductExtended[] = [
  {
    id: 'flash-1',
    name: 'Casque Audio Hi-Fi Over-Ear Sans Fil Réduction de Bruit',
    price: 18500,
    originalPrice: 34500,
    image: HEADSET_IMG_1,
    secondaryImage: HEADSET_IMG_2,
    discountPercent: 46,
    statusBadge: 'hot',
    rating: 4.9,
    reviewCount: 42,
    stockLeft: 12,
    stockTotal: 100,
    stock: 12,
    category: 'Audio & Casques'
  },
  {
    id: 'flash-2',
    name: 'Caméra de Sécurité 360° Smart Home Vision Nocturne HD',
    price: 24900,
    originalPrice: 37500,
    image: CAMERA_IMG_1,
    secondaryImage: CAMERA_IMG_2,
    discountPercent: 33,
    statusBadge: 'nouveau',
    rating: 4.8,
    reviewCount: 29,
    stockLeft: 8,
    stockTotal: 80,
    stock: 8,
    category: 'Maison Connectée'
  },
  {
    id: 'flash-3',
    name: 'Manette Sans Fil Xbox Series Pro + Game Pass Ultimate',
    price: 32000,
    originalPrice: 62000,
    discountPercent: 48,
    image: CONTROLLER_IMG_1,
    secondaryImage: CONTROLLER_IMG_2,
    statusBadge: 'hot',
    rating: 5.0,
    reviewCount: 56,
    stockLeft: 15,
    stockTotal: 120,
    stock: 15,
    category: 'Gaming'
  },
  {
    id: 'flash-4',
    name: 'Smartphone 5G Mint Pro AMOLED 120Hz Double SIM',
    price: 145000,
    originalPrice: 240000,
    discountPercent: 40,
    image: MINT_PHONE_IMG_1,
    secondaryImage: MINT_PHONE_IMG_2,
    statusBadge: 'nouveau',
    rating: 4.9,
    reviewCount: 68,
    stockLeft: 5,
    stockTotal: 50,
    stock: 5,
    category: 'Smartphones'
  },
  {
    id: 'flash-5',
    name: 'Montre Connectée Pro Fitness GPS & Cardio Tracker',
    price: 29900,
    originalPrice: 49900,
    discountPercent: 40,
    image: WATCH_IMG_1,
    secondaryImage: WATCH_IMG_2,
    statusBadge: 'hot',
    rating: 4.7,
    reviewCount: 34,
    stockLeft: 9,
    stockTotal: 90,
    stock: 9,
    category: 'Montres & Objets'
  }
];

const TIME_SLOTS = [
  { id: 0, time: '00:00', label: 'Bientôt', isLive: false },
  { id: 1, time: '09:00', label: 'En cours', isLive: true },
  { id: 2, time: '12:00', label: 'Bientôt', isLive: false },
  { id: 3, time: '21:00', label: 'Bientôt', isLive: false },
];

export const ThemeMegaStorePro: React.FC<StoreThemeProps> = (props) => {
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
  // État du Méga-Menu au survol
  const [hoveredCategory, setHoveredCategory] = useState<MegaMenuCategory | null>(null);
  const [searchCategory, setSearchCategory] = useState<string>('Toutes les catégories');
  const [cartCount, setCartCount] = useState<number>(0);
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [showSocialProof, setShowSocialProof] = useState<boolean>(true);
  const [socialProofIndex, setSocialProofIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // État de la vue Fiche Produit (PDP Shopify-Style)
  const [activeProduct, setActiveProduct] = useState<StoreProductItem | null>(selectedProduct || null);

  useEffect(() => {
    if (selectedProduct) {
      setActiveProduct(selectedProduct);
    }
  }, [selectedProduct]);

  // Filtres avancés de la Sidebar (Image 3)
  const [filters, setFilters] = useState<FilterState>({
    maxPrice: 300000,
    selectedBrands: [],
    selectedColors: [],
    selectedSizes: []
  });

  // Mode d'affichage Catalogue (Grille [ ▦ ] ou Liste [ ☷ ])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Tri du Catalogue
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'alpha-asc' | 'alpha-desc' | 'bestseller'>('default');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Compte à rebours dynamique des Ventes Flash (décrémente chaque seconde)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 15,
    minutes: 32,
    seconds: 48
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotation de la Preuve Sociale toutes les 8 secondes
  useEffect(() => {
    const socialInterval = setInterval(() => {
      setSocialProofIndex(prev => (prev + 1) % DEMO_FLASH_SALE_PRODUCTS.length);
    }, 8000);
    return () => clearInterval(socialInterval);
  }, []);

  // Synchronisation des produits réels de la vitrine
  const displayProducts = useMemo(() => {
    if (filteredProducts && filteredProducts.length > 0) return filteredProducts;
    if (allProducts && allProducts.length > 0) return allProducts;
    return DEMO_FLASH_SALE_PRODUCTS;
  }, [filteredProducts, allProducts]);

  // Détection du prix maximal et des marques disponibles pour les filtres
  const maxPossiblePrice = useMemo(() => {
    if (displayProducts.length === 0) return 300000;
    const highest = Math.max(...displayProducts.map(p => p.price || 0));
    return Math.max(highest, 200000);
  }, [displayProducts]);

  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    displayProducts.forEach(p => {
      if ((p as any).brand) brandsSet.add((p as any).brand);
    });
    return brandsSet.size > 0 
      ? Array.from(brandsSet) 
      : ['Apple', 'Samsung', 'Sony', 'Xiaomi', 'Nike', 'Zara'];
  }, [displayProducts]);

  // Réinitialisation des filtres
  const handleResetFilters = () => {
    playTapBeep();
    setFilters({
      maxPrice: maxPossiblePrice,
      selectedBrands: [],
      selectedColors: [],
      selectedSizes: []
    });
    setCurrentPage(1);
  };

  // Produits du catalogue enrichis pour le rendu MegaStoreProductCard
  const extendedCatalogProducts = useMemo(() => {
    return displayProducts.map((p, idx) => {
      const hasDiscount = p.originalPrice && p.originalPrice > p.price;
      const discountVal = hasDiscount 
        ? Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100)
        : (idx % 2 === 0 ? 20 : undefined);
      
      return {
        ...p,
        discountPercent: discountVal,
        statusBadge: (idx % 3 === 0 ? 'nouveau' : idx % 4 === 0 ? 'hot' : undefined) as ('nouveau' | 'hot' | undefined),
        stockLeft: (p as any).stockLeft || Math.max(3, 24 - idx * 2),
        stockTotal: (p as any).stockTotal || 60,
      } as MegaProductExtended;
    });
  }, [displayProducts]);

  // Filtrage et Tri en temps réel des produits du catalogue
  const filteredCatalogProducts = useMemo(() => {
    return extendedCatalogProducts.filter(p => {
      // Filtrage par Prix
      if (p.price > filters.maxPrice) return false;

      // Filtrage par Marques
      if (filters.selectedBrands.length > 0) {
        const pBrand = ((p as any).brand || '').toLowerCase();
        const pName = p.name.toLowerCase();
        const match = filters.selectedBrands.some(b => 
          pBrand.includes(b.toLowerCase()) || pName.includes(b.toLowerCase())
        );
        if (!match) return false;
      }

      // Filtrage par Tailles (si spécifiées)
      if (filters.selectedSizes.length > 0) {
        const pSizes = (p as any).sizes || [];
        const pDesc = (p.description || '').toUpperCase();
        const matchSize = filters.selectedSizes.some(s => 
          pSizes.includes(s) || pDesc.includes(s)
        );
        // On n'exclut que si le produit a des tailles renseignées
        if (pSizes.length > 0 && !matchSize) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'alpha-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'alpha-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'bestseller') return (b.rating || 5) - (a.rating || 5);
      return 0;
    });
  }, [extendedCatalogProducts, filters, sortBy]);

  // Pagination dynamique
  const totalPages = Math.max(1, Math.ceil(filteredCatalogProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCatalogProducts.slice(start, start + itemsPerPage);
  }, [filteredCatalogProducts, currentPage, itemsPerPage]);

  // Catégorie active au survol pour le méga-menu
  const activeMegaCategory = hoveredCategory;

  // Produit Vedette / Offre Spéciale (customConfig.specialOfferProductId)
  const specialOfferProduct = useMemo(() => {
    if (customConfig?.specialOfferProductId) {
      const picked = displayProducts.find(p => p.id === customConfig.specialOfferProductId);
      if (picked) return picked;
    }
    return displayProducts.find(p => p.originalPrice && p.originalPrice > p.price) || null;
  }, [displayProducts, customConfig?.specialOfferProductId]);

  const handleFocusSearch = () => {
    playTapBeep();
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  return (
    <div className="mega-store-root min-h-screen w-full bg-[#FFFFFF] text-[#1E293B] flex flex-col selection:bg-[#0056D2] selection:text-white">
      
      {/* =========================================================================
          1. LE HEADER ADAPTATIF OU NATIVE À 3 NIVEAUX
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
            onSelectProduct={(p) => {
              setActiveProduct(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onResetToHome={() => {
              setActiveProduct(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectCategory={onSelectCategory}
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
          {(customConfig?.announcementBarEnabled ?? true) && (
        <div className="w-full bg-[#0B132A] text-slate-300 text-[11px] font-semibold py-2 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          
          {/* Texte de Garantie à gauche */}
          <div className="flex items-center gap-2 tracking-wide text-slate-200 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold text-white truncate">
              {customConfig?.announcementBarText || 'Garantie du meilleur prix en ligne !'}
            </span>
            {!customConfig?.announcementBarText && (
              <span className="hidden md:inline text-slate-400">| Expédition sécurisée 24h</span>
            )}
          </div>

          {/* Liens Rapides à droite (Connexion, Devise, Aide, Blog) */}
          <div className="flex items-center gap-4 sm:gap-6 uppercase tracking-wider text-[10.5px] shrink-0">
            <button 
              type="button" 
              onClick={() => {
                playTapBeep();
                alert("Espace Client : Connectez-vous avec votre numéro WhatsApp ou email pour suivre vos commandes.");
              }}
              className="hover:text-white transition flex items-center gap-1 cursor-pointer"
            >
              <span>CONNEXION</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            <button 
              type="button" 
              onClick={() => {
                playTapBeep();
                alert("Création de compte express Nanasore.");
              }}
              className="hidden sm:inline hover:text-white transition cursor-pointer"
            >
              INSCRIPTION
            </button>

            <div className="flex items-center gap-1 text-slate-300">
              <span className="text-amber-400 font-bold">XOF CFA</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            <button 
              type="button" 
              onClick={() => {
                playTapBeep();
                alert("Assistance Nanasore disponible 7j/7 via WhatsApp.");
              }}
              className="hover:text-white transition cursor-pointer"
            >
              AIDE
            </button>

            <button 
              type="button" 
              onClick={() => {
                playTapBeep();
                alert("Blog Nanasore : Conseils E-commerce et nouveautés high-tech.");
              }}
              className="hidden md:inline hover:text-white transition cursor-pointer"
            >
              BLOG
            </button>
          </div>
        </div>
      </div>
      )}

      {/* NIVEAU 2 : MIDDLE BAR (Logo, Barre de Recherche Géante & Hotline / Panier) */}
      <div
        className="w-full bg-white border-b border-[#EBEBEB] py-3 sm:py-4 px-4 sm:px-6 lg:px-8"
        style={customConfig?.headerBgColor ? { backgroundColor: customConfig.headerBgColor } : undefined}
      >
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 lg:gap-8">
          
          {/* Logo à gauche */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer group">
            {(customConfig?.logoUrl || storeConfig.logoUrl) ? (
              <img 
                src={customConfig?.logoUrl || storeConfig.logoUrl} 
                alt={customConfig?.storeName || storeConfig.storeName} 
                className="h-10 sm:h-12 w-auto max-w-[180px] object-contain rounded"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded bg-[#0056D2] text-white flex items-center justify-center shadow-sm">
                  <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-black tracking-widest text-[#0056D2] uppercase truncate max-w-[140px]">
                    {customConfig?.storeTagline || 'You&Me'}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#0B132A] tracking-tight">
                    {customConfig?.storeName || storeConfig.storeName || 'Shop'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Barre de Recherche GÉANTE avec Dropdown "Toutes les catégories" à l'intérieur */}
          <div className="w-full max-w-2xl flex-1">
            <div className="mega-search-wrapper">
              
              {/* Sélecteur de catégorie interne */}
              <select 
                value={searchCategory}
                onChange={(e) => {
                  setSearchCategory(e.target.value);
                  if (e.target.value !== 'Toutes les catégories') {
                    onSelectCategory(e.target.value);
                  } else {
                    onSelectCategory('Tous');
                  }
                }}
                className="mega-search-select hidden sm:block"
                aria-label="Filtrer par catégorie"
              >
                <option value="Toutes les catégories">Toutes les catégories</option>
                {MEGA_CATEGORIES.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <div className="mega-search-divider hidden sm:block" />

              {/* Input de recherche textuelle */}
              <input 
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher un produit, un rayon..."
                className="mega-search-input"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="p-1 mr-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Bouton Loupe Bleu Vif */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  const gridEl = document.getElementById('mega-products-catalog');
                  if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mega-search-btn"
                title="Lancer la recherche"
              >
                <Search className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Hotline, Localisation & Panier à droite */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            
            {/* Localisation */}
            <div className="hidden xl:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-left leading-tight text-xs">
                <span className="text-[10px] text-slate-500 font-medium block">Zone de livraison</span>
                <strong className="text-slate-900 font-bold block truncate max-w-[140px]">
                  {customConfig?.footerAddress || "Afrique de l'Ouest"}
                </strong>
              </div>
            </div>

            {/* Service Client WhatsApp */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0056D2] flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight text-xs">
                <span className="text-[10px] text-slate-500 font-medium block">Service Client</span>
                <strong className="text-slate-900 font-black block">
                  {customConfig?.whatsappNumber || customConfig?.supportPhone || storeConfig.whatsappPhone || '+221 77 000 00 00'}
                </strong>
              </div>
            </div>

            {/* Panier d'achat avec montant */}
            <div 
              onClick={() => {
                playTapBeep();
                if (displayProducts[0]) onSelectProduct(displayProducts[0]);
              }}
              className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded border border-[#EBEBEB] transition cursor-pointer"
            >
              <div className="relative text-slate-900">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-2 bg-[#0056D2] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <div className="text-left leading-tight text-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">PANIER ({cartCount})</span>
                <strong className="text-slate-900 font-black block">0 FCFA</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NIVEAU 3 : BOTTOM BAR (Menu Principal Horizontal) */}
      <div className="w-full bg-white border-b border-[#EBEBEB] shadow-[0_2px_4px_rgba(0,0,0,0.02)] sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12">
          
          {/* Liens Centrés Classiques */}
          <nav className="flex items-center gap-6 sm:gap-8 overflow-x-auto text-[12.5px] font-bold uppercase tracking-wider text-slate-700 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveProduct(null);
                onSelectCategory('Tous');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-[#0056D2] hover:text-[#0046AB] flex items-center gap-1 cursor-pointer transition shrink-0"
            >
              <span>ACCUEIL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveProduct(null);
                const gridEl = document.getElementById('mega-products-catalog');
                if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#0056D2] flex items-center gap-1 cursor-pointer transition shrink-0"
            >
              <span>TOUTES LES COLLECTIONS</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                alert("Rayons & Modes : Affichage modulable haute densité activé.");
              }}
              className="hover:text-[#0056D2] flex items-center gap-1 cursor-pointer transition shrink-0"
            >
              <span>RAYONS & MODES</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                alert("Engagements : Découvrir nos politiques de livraison, CGV et garanties.");
              }}
              className="hidden md:flex items-center gap-1 hover:text-[#0056D2] cursor-pointer transition shrink-0"
            >
              <span>ENGAGEMENTS</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                alert("Guides Pro : Derniers conseils d'achat et comparatifs tests.");
              }}
              className="hidden lg:flex items-center gap-1 hover:text-[#0056D2] cursor-pointer transition shrink-0"
            >
              <span>GUIDES PRO</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (storeConfig.whatsappPhone) {
                  window.open(`https://wa.me/${storeConfig.whatsappPhone.replace(/[^0-9]/g, '')}`, '_blank');
                } else {
                  alert("Contactez le service client via le bouton WhatsApp.");
                }
              }}
              className="hover:text-[#0056D2] flex items-center gap-1 cursor-pointer transition shrink-0"
            >
              <span>CONTACTEZ-NOUS</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </nav>

          {/* Raccourci Galerie de Thèmes à droite */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenThemeSelector?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 text-[#0056D2] hover:bg-blue-100 text-xs font-bold transition cursor-pointer shrink-0"
            title="Changer de thème storefront"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Changer de thème</span>
          </button>
          </div>
        </div>
      </div>
      )}

      {/* =========================================================================
          CONTENU PRINCIPAL : FICHE PRODUIT PDP OU PAGE D'ACCUEIL / CATALOGUE
         ========================================================================= */}
      {activeProduct ? (
        /* VUE FICHE PRODUIT DÉTAILLÉE (PDP) CONFORME AUX IMAGES 1 & 2 */
        <MegaStorePDP
          product={activeProduct}
          allProducts={displayProducts}
          onBack={() => {
            playTapBeep();
            setActiveProduct(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onAddToCart={(prod, qty) => {
            playValidationBeep();
            setCartCount(prev => prev + (qty || 1));
            if (onAddToCart) onAddToCart(prod);
          }}
          onBuyNow={(prod, qty) => {
            playValidationBeep();
            setCartCount(prev => prev + qty);
            onBuyNow(prod, qty);
          }}
          onSelectProduct={(prod) => {
            playTapBeep();
            setActiveProduct(prod);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          whatsappPhone={storeConfig.whatsappNumber || storeConfig.phone}
        />
      ) : (
        <>
          {/* =========================================================================
              2 & 3. SECTION PRINCIPALE : NAVIGATION VERTICALE & HERO ASYMÉTRIQUE 70/30
             ========================================================================= */}
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex items-start gap-5 relative">
          
          {/* =======================================================================
              2. NAVIGATION LATÉRALE (VERTICAL MEGA-MENU TOUJOURS OUVERT SUR HOME)
             ======================================================================= */}
          <aside 
            className="mega-sidebar-nav hidden lg:block"
            onMouseLeave={() => setHoveredCategory(null)}
          >
            {/* Liste des Catégories Principales */}
            <div className="flex flex-col">
              {MEGA_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isHovered = hoveredCategory?.id === cat.id;

                return (
                  <div
                    key={cat.id}
                    data-category-id={cat.id}
                    onMouseEnter={() => setHoveredCategory(cat)}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapBeep();
                      setHoveredCategory(prev => (prev?.id === cat.id ? null : cat));
                    }}
                    className={`mega-sidebar-item ${isHovered ? 'active' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center text-[#0056D2]">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="truncate max-w-[160px]">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {cat.badge && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                          cat.badge === 'HOT' ? 'bg-red-500 text-white' : 'bg-amber-400 text-slate-900'
                        }`}>
                          {cat.badge}
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 mega-sidebar-chevron transition-transform ${isHovered ? 'rotate-90 text-[#0056D2]' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LE MÉGA-MENU BLANC EN SURIMPRESSION VERS LA DROITE AU SURVOL */}
            {activeMegaCategory && (
              <div 
                className="mega-dropdown-panel"
                onMouseEnter={() => setHoveredCategory(activeMegaCategory)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                {/* 3 Colonnes de Liens Sous-Catégories */}
                {activeMegaCategory.columns.map((col, cIdx) => (
                  <div key={cIdx} className="space-y-3">
                    <h4 className="text-xs font-black text-[#0B132A] uppercase tracking-wider border-b border-slate-100 pb-2">
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
                              const gridEl = document.getElementById('mega-products-catalog');
                              if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-xs text-slate-600 hover:text-[#0056D2] hover:font-bold transition text-left cursor-pointer flex items-center gap-1.5 group"
                          >
                            <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-[#0056D2]" />
                            <span>{item}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* 4ème Colonne : Mini-Bannière Promotionnelle du Rayon */}
                {activeMegaCategory.promoBanner && (
                  <div className="rounded bg-gradient-to-br from-blue-900 via-[#0056D2] to-indigo-900 text-white p-4 flex flex-col justify-between overflow-hidden relative shadow-md">
                    <div className="space-y-2 relative z-10">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-400 text-slate-950 inline-block">
                        {activeMegaCategory.promoBanner.badge}
                      </span>
                      <h5 className="text-base font-black leading-tight">
                        {activeMegaCategory.promoBanner.title}
                      </h5>
                      <p className="text-[11px] text-blue-100 leading-snug">
                        {activeMegaCategory.promoBanner.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setHoveredCategory(null);
                        const gridEl = document.getElementById('mega-products-catalog');
                        if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="mt-4 px-3 py-2 rounded bg-white text-[#0056D2] hover:bg-slate-100 font-bold text-xs uppercase tracking-wider flex items-center justify-between cursor-pointer"
                    >
                      <span>{activeMegaCategory.promoBanner.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* =======================================================================
              3. LE HERO HEADER ASYMÉTRIQUE (GRILLE CSS 70% / 30%)
             ======================================================================= */}
          <div className="flex-1 w-full overflow-hidden">
            <div className="mega-hero-grid">
              
              {/* GROS BLOC GAUCHE (70%) : BANNIÈRE PROMOTIONNELLE PRINCIPALE */}
              <div className="mega-main-banner p-6 sm:p-10 flex items-center justify-between relative group">
                <AdminSectionEditTrigger
                  label="✏️ Personnaliser le Hero (Titre, Image & Promo) ⚡"
                  targetAccordion={2}
                  onSelectSection={onSelectCustomizerSection}
                  isPublicView={isPublicView}
                  isAdminPreview={isAdminPreview}
                  position="top-right"
                />
                
                {/* Textes promotionnels massifs */}
                <div className="space-y-4 max-w-md z-10">
                  <div className="space-y-1">
                    <LiveEditable
                      label="Sous-titre / Badge Hero"
                      field="heroSubtitle"
                      value={customConfig?.heroSubtitle || 'GRAND DÉSTOCKAGE'}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                      isInline={true}
                    >
                      <div className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white drop-shadow-sm mega-outline-text">
                        {customConfig?.heroSubtitle || 'GRAND DÉSTOCKAGE'}
                      </div>
                    </LiveEditable>
                    <LiveEditable
                      label="Titre Principal Hero"
                      field="heroTitle"
                      value={customConfig?.heroTitle || "-20% SUR TOUT LE RAYON !"}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      {customConfig?.heroTitle ? (
                        <div className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-purple-950 leading-tight">
                          {customConfig.heroTitle}
                        </div>
                      ) : (
                        <>
                          <div className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-purple-950 leading-none">
                            -20% <span className="text-3xl sm:text-4xl">SUR</span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black uppercase tracking-wide text-purple-900">
                            TOUT LE RAYON !
                          </div>
                        </>
                      )}
                    </LiveEditable>
                  </div>

                  <LiveEditable
                    label="Description Hero"
                    field="heroDescription"
                    value={customConfig?.heroDescription || "Profitez dès maintenant de nos réductions exclusives sur l'ensemble des rayons de la boutique."}
                    type="textarea"
                    targetAccordion={2}
                    isAdminPreview={isAdminPreview}
                  >
                    <p className="text-xs sm:text-sm text-purple-800 font-medium max-w-sm">
                      {customConfig?.heroDescription || "Profitez dès maintenant de nos réductions exclusives sur l'ensemble des rayons de la boutique."}
                    </p>
                  </LiveEditable>

                  <div className="pt-2">
                    <LiveEditable
                      label="Bouton CTA Hero"
                      field="heroCtaText"
                      value={customConfig?.heroCtaText || "PROFITER DE L'OFFRE"}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                      isInline={true}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          if (customConfig?.heroLinkedProductId) {
                            const targetProd = displayProducts.find(p => p.id === customConfig.heroLinkedProductId);
                            if (targetProd) {
                              setActiveProduct(targetProd);
                              onSelectProduct(targetProd);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              return;
                            }
                          }
                          const gridEl = document.getElementById('mega-products-catalog');
                          if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="mega-btn-sharp px-8 py-3 bg-white hover:bg-slate-900 text-slate-900 hover:text-white text-xs sm:text-sm font-extrabold uppercase tracking-widest shadow-md transition cursor-pointer"
                      >
                        {customConfig?.heroCtaText || "PROFITER DE L'OFFRE"}
                      </button>
                    </LiveEditable>
                  </div>
                </div>

                {/* Visuel Haute Définition de l'Égérie avec Cosmétique */}
                <div className="hidden sm:flex items-center justify-center flex-1 max-w-[380px] -mr-6">
                  <LiveEditable
                    label="Visuel Image / Vidéo Hero"
                    field="heroBannerImageUrl"
                    value={customConfig?.heroBannerImageUrl || MEGA_MODEL_HERO_SVG}
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
                        poster={customConfig?.heroBannerImageUrl || MEGA_MODEL_HERO_SVG}
                        className="w-full h-auto rounded-xl object-cover"
                      />
                    ) : (
                      <img 
                        src={customConfig?.heroBannerImageUrl || MEGA_MODEL_HERO_SVG} 
                        alt={customConfig?.heroTitle || "Mannequin Cosmétique Beauté"} 
                        className="w-full h-auto object-contain transform scale-110"
                      />
                    )}
                  </LiveEditable>
                </div>
              </div>

              {/* PETITS BLOCS DROITE (30%) : 2 BANNIÈRES SECONDAIRES EMPILÉES */}
              <div className="flex flex-col gap-4">
                
                {/* Bannière 1 (Haut) : ÉPICERIE FINE - NOUVEAU ! */}
                <div 
                  onClick={() => {
                    playTapBeep();
                    onSelectCategory('Alimentation');
                    const gridEl = document.getElementById('mega-products-catalog');
                    if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mega-sub-banner cursor-pointer group"
                >
                  <div className="space-y-1.5 z-10 max-w-[130px]">
                    <LiveEditable
                      label="Badge Bannière 1"
                      field="subBanner1Badge"
                      value={customConfig?.subBanner1Badge || 'ÉPICERIE FINE'}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                      isInline={true}
                    >
                      <span className="text-[11px] font-black uppercase tracking-wider text-blue-200 block">
                        {customConfig?.subBanner1Badge || 'ÉPICERIE FINE'}
                      </span>
                    </LiveEditable>
                    <LiveEditable
                      label="Titre Bannière 1"
                      field="subBanner1Title"
                      value={customConfig?.subBanner1Title || 'NOUVEAU !'}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      <h3 className="text-2xl font-black text-amber-300 leading-none">
                        {customConfig?.subBanner1Title || 'NOUVEAU !'}
                      </h3>
                    </LiveEditable>
                    <LiveEditable
                      label="Sous-titre Bannière 1"
                      field="subBanner1Subtitle"
                      value={customConfig?.subBanner1Subtitle || 'Boissons fraîches & épicerie livrées en 24h'}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      <p className="text-[10px] text-blue-100 font-medium">
                        {customConfig?.subBanner1Subtitle || 'Boissons fraîches & épicerie livrées en 24h'}
                      </p>
                    </LiveEditable>
                  </div>

                  <div className="flex-1 flex items-center justify-end -mr-2">
                    <LiveEditable
                      label="Image Bannière 1"
                      field="subBanner1Image"
                      value={customConfig?.subBanner1Image || MEGA_GROCERY_DRINKS_SVG}
                      type="image"
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      <img 
                        src={customConfig?.subBanner1Image || MEGA_GROCERY_DRINKS_SVG} 
                        alt={customConfig?.subBanner1Title || "Boissons & Épicerie Fraîche"} 
                        className="w-full max-w-[170px] h-auto object-contain group-hover:scale-105 transition-transform"
                      />
                    </LiveEditable>
                  </div>
                </div>

                {/* Bannière 2 (Bas) : TV & HIGH-TECH - PROMO */}
                <div 
                  onClick={() => {
                    playTapBeep();
                    onSelectCategory('Electronics');
                    const gridEl = document.getElementById('mega-products-catalog');
                    if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mega-sub-banner cursor-pointer group"
                >
                  <div className="space-y-1.5 z-10 max-w-[130px]">
                    <LiveEditable
                      label="Badge Bannière 2"
                      field="subBanner2Badge"
                      value={customConfig?.subBanner2Badge || 'TV & HIGH-TECH'}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                      isInline={true}
                    >
                      <span className="text-[11px] font-black uppercase tracking-wider text-blue-200 block">
                        {customConfig?.subBanner2Badge || 'TV & HIGH-TECH'}
                      </span>
                    </LiveEditable>
                    <LiveEditable
                      label="Titre Bannière 2"
                      field="subBanner2Title"
                      value={customConfig?.subBanner2Title || 'PROMO'}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      <h3 className="text-2xl font-black text-amber-300 leading-none">
                        {customConfig?.subBanner2Title || 'PROMO'}
                      </h3>
                    </LiveEditable>
                    <LiveEditable
                      label="Sous-titre Bannière 2"
                      field="subBanner2Subtitle"
                      value={customConfig?.subBanner2Subtitle || 'Smart TV OLED 65" à prix défiant toute concurrence'}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      <p className="text-[10px] text-blue-100 font-medium">
                        {customConfig?.subBanner2Subtitle || 'Smart TV OLED 65" à prix défiant toute concurrence'}
                      </p>
                    </LiveEditable>
                  </div>

                  <div className="flex-1 flex items-center justify-end -mr-2">
                    <LiveEditable
                      label="Image Bannière 2"
                      field="subBanner2Image"
                      value={customConfig?.subBanner2Image || MEGA_OLED_TV_SVG}
                      type="image"
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      <img 
                        src={customConfig?.subBanner2Image || MEGA_OLED_TV_SVG} 
                        alt={customConfig?.subBanner2Title || "Smart TV 65 pouces OLED"} 
                        className="w-full max-w-[170px] h-auto object-contain group-hover:scale-105 transition-transform"
                      />
                    </LiveEditable>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. RANGÉE DES 4 CARTES PROMOTIONS RAPIDES (HAUTE VISIBILITÉ)
         ========================================================================= */}
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#0056D2] text-white p-3.5 rounded flex items-center justify-between cursor-pointer hover:bg-blue-700 transition">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">MAQUILLAGE & SOINS DÈS</span>
              <strong className="text-xl font-black text-amber-300">15 000 F</strong>
            </div>
            <div className="w-12 h-10 bg-white/10 rounded flex items-center justify-center">
              <Heart className="w-6 h-6 text-amber-300" />
            </div>
          </div>

          <div className="bg-[#0056D2] text-white p-3.5 rounded flex items-center justify-between cursor-pointer hover:bg-blue-700 transition">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">ÉPICERIE GOURMANDE DÈS</span>
              <strong className="text-xl font-black text-amber-300">5 000 F</strong>
            </div>
            <div className="w-12 h-10 bg-white/10 rounded flex items-center justify-center">
              <Utensils className="w-6 h-6 text-amber-300" />
            </div>
          </div>

          <div className="bg-[#0056D2] text-white p-3.5 rounded flex items-center justify-between cursor-pointer hover:bg-blue-700 transition">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">ÉQUIPEMENT PLEIN AIR</span>
              <strong className="text-xl font-black text-amber-300">JUSQU'À -50%</strong>
            </div>
            <div className="w-12 h-10 bg-white/10 rounded flex items-center justify-center">
              <Compass className="w-6 h-6 text-amber-300" />
            </div>
          </div>

          <div className="bg-[#0056D2] text-white p-3.5 rounded flex items-center justify-between cursor-pointer hover:bg-blue-700 transition">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">MONTRES CONNECTÉES</span>
              <strong className="text-xl font-black text-amber-300">1 OFFERTE</strong>
            </div>
            <div className="w-12 h-10 bg-white/10 rounded flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-300" />
            </div>
          </div>
        </div>
      </div>

      {/* OFFRE SPÉCIALE VEDETTE / TOP DEAL (specialOfferProductId) */}
      {specialOfferProduct && (
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-r from-blue-950 via-[#0056D2] to-indigo-950 text-white p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-white p-2 flex items-center justify-center shrink-0">
                <img
                  src={specialOfferProduct.image}
                  alt={specialOfferProduct.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-slate-950" />
                    <span>Offre Vedette Méga-Store</span>
                  </span>
                  {specialOfferProduct.originalPrice && specialOfferProduct.originalPrice > specialOfferProduct.price && (
                    <span className="px-2 py-0.5 rounded bg-red-500 text-white font-black text-[10px]">
                      -{Math.round(((specialOfferProduct.originalPrice - specialOfferProduct.price) / specialOfferProduct.originalPrice) * 100)}%
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {specialOfferProduct.name}
                </h3>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-black text-amber-300">
                    {formatCFA(specialOfferProduct.price)}
                  </span>
                  {specialOfferProduct.originalPrice && specialOfferProduct.originalPrice > specialOfferProduct.price && (
                    <span className="text-xs text-blue-200 line-through">
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
                  playTapBeep();
                  setActiveProduct(specialOfferProduct);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex-1 md:flex-initial px-5 py-3 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer border border-white/20"
              >
                Détails du produit
              </button>
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  setCartCount(prev => prev + 1);
                  if (onBuyNow) onBuyNow(specialOfferProduct, 1);
                }}
                className="flex-1 md:flex-initial px-6 py-3 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg"
              >
                Acheter maintenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4b. SECTION VENTES FLASH (CRÉNEAUX HORAIRES, COMPTE À REBOURS & CARROUSEL)
         ========================================================================= */}
      <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="mega-flash-sale-box">
          
          {/* 1. Onglets Horaires en haut du bloc Flash Sale */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-blue-900/40 bg-slate-900/40">
            {TIME_SLOTS.map((slot) => {
              const isCurrent = activeSlot === slot.id;
              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    playTapBeep();
                    setActiveSlot(slot.id);
                  }}
                  className={`mega-slot-tab ${isCurrent ? 'active' : 'inactive'} flex items-center justify-center gap-2`}
                >
                  <span className="text-sm font-black font-mono tracking-wider">{slot.time}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    isCurrent ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {slot.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 2. Corps de la Section Ventes Flash */}
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Colonne Gauche : Urgence & Compte à Rebours Dynamique */}
            <div className="lg:col-span-3 bg-gradient-to-br from-[#003882] to-[#00266B] rounded p-5 text-white flex flex-col justify-between border border-blue-400/20 shadow-inner relative group">
              <AdminSectionEditTrigger
                label="✏️ Configurer l'Offre Flash & Compte à Rebours ⚡"
                targetAccordion={3}
                onSelectSection={onSelectCustomizerSection}
                isPublicView={isPublicView}
                isAdminPreview={isAdminPreview}
                position="top-right"
              />
              <div className="space-y-4">
                
                {/* Header avec Éclair Doré */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
                    <img src={FLASH_THUNDER_SVG} alt="Éclair Ventes Flash" className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                      SESSION EN COURS
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                      VENTES FLASH
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-blue-100 font-medium leading-relaxed">
                  Profitez de remises immédiates allant jusqu'à -50% avant expiration du chronomètre.
                </p>

                {/* Compte à Rebours Dynamique (Heures : Minutes : Secondes) */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-200 block">
                    Fin de la session dans :
                  </span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 bg-black/45 border border-white/10 rounded p-2 text-center shadow-inner">
                      <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </div>
                      <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Heures
                      </div>
                    </div>
                    <span className="text-xl font-black text-amber-300">:</span>
                    <div className="flex-1 bg-black/45 border border-white/10 rounded p-2 text-center shadow-inner">
                      <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </div>
                      <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Min
                      </div>
                    </div>
                    <span className="text-xl font-black text-amber-300">:</span>
                    <div className="flex-1 bg-black/45 border border-white/10 rounded p-2 text-center shadow-inner">
                      <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono leading-none animate-pulse">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </div>
                      <div className="text-[9px] font-bold text-amber-200 uppercase tracking-widest mt-1">
                        Sec
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton d'Action Urgence */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    const gridEl = document.getElementById('mega-products-catalog');
                    if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-[#0056D2] font-black text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2 shadow cursor-pointer active:scale-95"
                >
                  <span>Voir tous les articles</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Colonne Droite : Carrousel Horizontal des MegaStoreProductCard */}
            <div className="lg:col-span-9 flex flex-col justify-center overflow-hidden">
              <div className="flex items-center justify-between mb-3 text-white">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Sélection Éclair Haute Conversion
                  </span>
                </div>
                <span className="text-[11px] text-blue-200 font-medium hidden sm:inline">
                  Glissez horizontalement pour découvrir les offres →
                </span>
              </div>

              {/* Carrousel Horizontal Fluide */}
              <div className="flex gap-3.5 overflow-x-auto pb-3 pt-1 px-0.5 scrollbar-thin scrollbar-thumb-blue-400/30 scrollbar-track-transparent">
                {DEMO_FLASH_SALE_PRODUCTS.map((prod) => (
                  <div key={prod.id} className="min-w-[215px] sm:min-w-[235px] max-w-[235px] shrink-0">
                    <MegaStoreProductCard
                      product={prod}
                      isPublicView={isPublicView}
                      isAdminPreview={isAdminPreview}
                      storeSlug={storeConfig.slug || storeConfig.storeName}
                      onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
                      onPreviewFunnel={onPreviewFunnel}
                      onSelect={(p) => {
                        playTapBeep();
                        setActiveProduct(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        onSelectProduct(p);
                      }}
                      onBuyNow={(p, qty) => {
                        playTapBeep();
                        setCartCount(prev => prev + qty);
                        onBuyNow(p, qty);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. SECTION SERVICES & AVANTAGES (PILLS D'ICÔNES DE RÉASSURANCE)
         ========================================================================= */}
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 relative group">
        <AdminSectionEditTrigger
          label="✏️ Modifier les Services & Avantages ⚡"
          targetAccordion={4}
          onSelectSection={onSelectCustomizerSection}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
          position="top-right"
        />
        <div className="border border-[#EBEBEB] rounded p-5 bg-white space-y-4">
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            SERVICES & AVANTAGES DU MÉGA-STORE
          </h3>

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 text-center">
            {[
              { icon: Gift, label: 'Boutique Cadeaux' },
              { icon: Globe, label: 'Import / Export' },
              { icon: Users, label: 'Partenaires' },
              { icon: Zap, label: 'Ventes Flash' },
              { icon: Truck, label: 'Livraison Gratuite' },
              { icon: Percent, label: 'Jusqu\'à -50%' },
              { icon: Ticket, label: 'Bons & Coupons' },
              { icon: Shirt, label: "Mode & Tendances" },
              { icon: Star, label: 'Nouveautés' },
            ].map((offer, oIdx) => {
              const IconComp = offer.icon;
              return (
                <div 
                  key={oIdx} 
                  className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 rounded transition cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0056D2] border border-blue-100 flex items-center justify-center group-hover:bg-[#0056D2] group-hover:text-white transition-colors">
                    <IconComp className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 leading-tight">
                    {offer.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

          {/* =========================================================================
              6. CATALOGUE DES PRODUITS EN 2 COLONNES (FILTRES SIDEBAR & GRILLE/LISTE)
             ========================================================================= */}
          <section id="mega-products-catalog" className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative group">
            <AdminSectionEditTrigger
              label="✏️ Modifier la Grille & Rayons ⚡"
              targetAccordion={3}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            
            {/* Titre & Breadcrumbs de Collection (Image 3) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EBEBEB] pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <span className="hover:text-[#0056D2] cursor-pointer" onClick={() => onSelectCategory('Tous')}>Accueil</span>
                  <span>/</span>
                  <span className="font-bold text-slate-900">{selectedCategory || 'Tous les rayons'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span>{selectedCategory === 'Tous' || !selectedCategory ? 'Catalogue Complet Mega-Store' : selectedCategory}</span>
                  <span className="text-xs font-bold text-[#0056D2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {filteredCatalogProducts.length} articles trouvés
                  </span>
                </h2>
              </div>

              {/* Raccourcis de Catégories Rapides */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onSelectCategory('Tous');
                    setCurrentPage(1);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer shrink-0 ${
                    selectedCategory === 'Tous' || !selectedCategory
                      ? 'bg-[#0056D2] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tous
                </button>
                {categories?.slice(0, 6).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      onSelectCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#0056D2] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Structure en 2 Colonnes (grid-template-columns: 260px 1fr) */}
            <div className="mega-catalog-layout items-start">
              
              {/* Colonne Gauche (Filtres) : MegaStoreFilters */}
              <div className="w-full">
                <MegaStoreFilters
                  filters={filters}
                  onFilterChange={(newF) => {
                    setFilters(newF);
                    setCurrentPage(1);
                  }}
                  onResetFilters={handleResetFilters}
                  availableBrands={availableBrands}
                  maxPossiblePrice={maxPossiblePrice}
                  categories={categories || []}
                  selectedCategory={selectedCategory || 'Tous'}
                  onSelectCategory={(cat) => {
                    onSelectCategory(cat);
                    setCurrentPage(1);
                  }}
                  totalProductsCount={filteredCatalogProducts.length}
                />
              </div>

              {/* Colonne Droite : Barre de tri + Grille / Liste + Pagination */}
              <div className="space-y-4 min-w-0">
                
                {/* Barre Supérieure de Tri & Bascule Vue (Image 3) */}
                <div className="mega-sort-bar">
                  {/* Compteur de résultats */}
                  <div className="text-xs text-slate-600 font-medium">
                    Affichage de <span className="font-bold text-slate-900">{paginatedProducts.length}</span> sur <span className="font-bold text-slate-900">{filteredCatalogProducts.length}</span> articles
                  </div>

                  {/* Options de Tri & Bascule Vue */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Trier par :</span>
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          playTapBeep();
                          setSortBy(e.target.value as any);
                        }}
                        className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-bold text-xs focus:outline-none focus:border-[#0056D2] cursor-pointer"
                      >
                        <option value="default">Recommandés</option>
                        <option value="price-asc">Prix : croissant</option>
                        <option value="price-desc">Prix : décroissant</option>
                        <option value="alpha-asc">Nom : A à Z</option>
                        <option value="alpha-desc">Nom : Z à A</option>
                        <option value="bestseller">Meilleures ventes</option>
                      </select>
                    </div>

                    {/* Boutons Grille [ ▦ ] / Liste [ ☷ ] */}
                    <div className="flex items-center gap-1 border border-slate-200 rounded p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setViewMode('grid');
                        }}
                        className={`mega-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        title="Affichage en Grille"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setViewMode('list');
                        }}
                        className={`mega-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        title="Affichage en Liste"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* État vide si aucun produit ne correspond aux filtres */}
                {filteredCatalogProducts.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded p-12 text-center space-y-3">
                    <SlidersHorizontal className="w-10 h-10 text-slate-400 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">
                      Aucun produit ne correspond à vos critères
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Essayez d'augmenter le prix maximum ou de réinitialiser vos filtres de sélection.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 bg-[#0056D2] text-white text-xs font-bold rounded hover:bg-blue-700 transition cursor-pointer"
                    >
                      Réinitialiser tous les filtres
                    </button>
                  </div>
                ) : viewMode === 'grid' ? (
                  /* Vue Grille Haute Densité */
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {paginatedProducts.map((product) => (
                      <MegaStoreProductCard
                        key={product.id}
                        product={product}
                        isPublicView={isPublicView}
                        isAdminPreview={isAdminPreview}
                        storeSlug={storeConfig.slug || storeConfig.storeName}
                        onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
                        onPreviewFunnel={onPreviewFunnel}
                        onSelect={(p) => {
                          playTapBeep();
                          setActiveProduct(p);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onBuyNow={(p, qty) => {
                          playTapBeep();
                          setCartCount(prev => prev + qty);
                          onBuyNow(p, qty);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  /* Vue Liste Haute Densité */
                  <div className="space-y-3">
                    {paginatedProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => {
                          playTapBeep();
                          setActiveProduct(product);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="mega-list-item hover:border-[#0056D2] group"
                      >
                        {/* Boîte Image */}
                        <div className="mega-list-img-box">
                          {product.discountPercent && (
                            <span className="mega-badge-discount">-{product.discountPercent}%</span>
                          )}
                          <img
                            src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Informations Produit */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {product.category || 'Rayon Mega-Store'}
                            </span>
                            {product.statusBadge && (
                              <span className={`mega-badge-status ${product.statusBadge}`}>
                                {product.statusBadge === 'hot' ? 'HOT' : 'NEW'}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0056D2] transition line-clamp-1">
                            {product.name}
                          </h3>

                          <p className="text-xs text-slate-500 line-clamp-2">
                            {product.description || "Article de qualité supérieure sélectionné avec soin par la boutique. Garantie satisfait ou remboursé sous 14 jours."}
                          </p>

                          {/* Étoiles & Disponibilité */}
                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              <span className="text-slate-800">{product.rating || 4.9}</span>
                              <span className="text-slate-400 font-normal">({product.reviewCount || 34})</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              {product.stockLeft || 12} en stock
                            </span>
                          </div>
                        </div>

                        {/* Prix & Boutons d'Action */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-4 min-w-[140px]">
                          <div className="text-right">
                            {product.originalPrice && (
                              <div className="text-xs text-slate-400 line-through">
                                {formatCFA(product.originalPrice)}
                              </div>
                            )}
                            <div className="text-base font-black text-[#D32F2F]">
                              {formatCFA(product.price)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 w-full">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playValidationBeep();
                                setCartCount(prev => prev + 1);
                                if (onAddToCart) onAddToCart(product);
                              }}
                              className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-[#0056D2] font-bold text-xs rounded border border-blue-200 transition text-center cursor-pointer"
                            >
                              Panier
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playValidationBeep();
                                setCartCount(prev => prev + 1);
                                onBuyNow(product, 1);
                              }}
                              className="flex-1 py-1.5 px-2 bg-[#0056D2] hover:bg-blue-700 text-white font-bold text-xs rounded transition text-center cursor-pointer shadow-sm"
                            >
                              Acheter
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination (< 1 2 3 ... 5 >) */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
                    <div className="text-xs text-slate-500 font-medium">
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredCatalogProducts.length)} sur {filteredCatalogProducts.length} articles
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => {
                          playTapBeep();
                          setCurrentPage(prev => Math.max(1, prev - 1));
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Précédent
                      </button>
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pNum = i + 1;
                        return (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              setCurrentPage(pNum);
                            }}
                            className={`w-8 h-8 text-xs font-bold rounded cursor-pointer transition ${
                              currentPage === pNum
                                ? 'bg-[#0056D2] text-white shadow-sm'
                                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {pNum}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => {
                          playTapBeep();
                          setCurrentPage(prev => Math.min(totalPages, prev + 1));
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* =========================================================================
          7. POPUP DE PREUVE SOCIALE FLOTTANTE (NOTIFICATION HAUTE CONVERSION)
         ========================================================================= */}
      {showSocialProof && customConfig?.enableLiveSalesPopup !== false && DEMO_FLASH_SALE_PRODUCTS[socialProofIndex] && (
        <div className="mega-social-popup">
          <div className="w-12 h-12 rounded bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
            <img 
              src={DEMO_FLASH_SALE_PRODUCTS[socialProofIndex].image} 
              alt={DEMO_FLASH_SALE_PRODUCTS[socialProofIndex].name}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Consulté à l'instant ({['Dakar', 'Abidjan', 'Lomé', 'Cotonou'][socialProofIndex % 4]})</span>
            </div>
            <h5 className="text-[11px] font-extrabold text-slate-900 truncate">
              {DEMO_FLASH_SALE_PRODUCTS[socialProofIndex].name}
            </h5>
            <div className="text-[11px] font-black text-[#0056D2]">
              {formatCFA(DEMO_FLASH_SALE_PRODUCTS[socialProofIndex].price)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSocialProof(false)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            title="Fermer la notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          8. GRAND FOOTER RETAIL HAUTE CONVERSION OU ADAPTATIF
         ========================================================================= */}
      {customConfig?.footerStyle && customConfig.footerStyle !== 'none' ? (
        <div className="relative group/footer-section">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Coordonnées ⚡"
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
            onSelectProduct={(p) => {
              setActiveProduct(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onResetToHome={() => {
              setActiveProduct(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectCategory={onSelectCategory}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Coordonnées ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <MegaStoreFooter 
            storeName={customConfig?.storeName || storeConfig.storeName || 'You&Me Shop'}
            whatsappPhone={customConfig?.whatsappNumber || storeConfig.whatsappNumber || storeConfig.phone}
            customConfig={customConfig}
          />
        </div>
      )}
    </div>
  );
};
