import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  ChevronDown, 
  Sparkles, 
  ArrowRight, 
  ShoppingBag, 
  Zap, 
  Search, 
  Heart, 
  Star,
  Phone, 
  Menu, 
  X, 
  Check, 
  Flame, 
  Eye,
  MessageCircle
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../../types';
import { StoreProductItem } from '../types';
import { SlideOutFunnelDrawer } from '../../../../../components/SlideOutFunnelDrawer';
import { triggerOpenFunnel } from '../../../../../themes/themeUtils';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface EditorialGlowingHeaderProps {
  config: ThemeCustomizationConfig;
  products?: StoreProductItem[];
  categories?: string[];
  storeSlug?: string;
  onOpenFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onResetToHome?: () => void;
  onSelectCategory?: (category: string) => void;
  onSearch?: (query: string) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  className?: string;
}

export const EditorialGlowingHeader: React.FC<EditorialGlowingHeaderProps> = ({
  config,
  products = [],
  categories = [],
  storeSlug = 'boutique',
  onOpenFunnel,
  onSelectProduct,
  onResetToHome,
  onSelectCategory,
  onSearch,
  isPublicView = false,
  isAdminPreview = false,
  className = ''
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (ZÉRO ERREUR #310)
  // =========================================================================

  // Scroll sticky compression state
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // Menu dépliant actif ('shop' | 'products' | 'categories' | null)
  const [activeMenuDropdown, setActiveMenuDropdown] = useState<'shop' | 'products' | 'categories' | null>(null);

  // Tiroir mobile (< 1024px)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Recherche plein écran / overlay
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Favoris locaux (id des produits)
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesModal, setShowFavoritesModal] = useState<boolean>(false);

  // Tiroir Tunnel d'achat intégré
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);

  // Références
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Écouteur de scroll intelligent pour compression (window.scrollY > 80)
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 80;
      setIsScrolled(scrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fermeture du dropdown au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveMenuDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus de l'input de recherche lors de l'ouverture
  useEffect(() => {
    if (isSearchOverlayOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isSearchOverlayOpen]);

  // Catégories effectives
  const effectiveCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const fromProds = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return fromProds.length > 0 ? fromProds : ['Soins Visage', 'Sérums & Huiles', 'Anti-Âge', 'Corps & Bain', 'Parfums'];
  }, [categories, products]);

  // Top 3 Produits Phares pour l'aperçu du Mega-Menu
  const featuredThreeProducts = useMemo(() => {
    if (products.length >= 3) return products.slice(0, 3);
    if (products.length > 0) return products;
    return [];
  }, [products]);

  // Filtrage des produits pour la recherche prédictive
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 4);
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [products, searchQuery]);

  // Téléphone WhatsApp
  const whatsappPhone = useMemo(() => {
    return (config.whatsappNumber || config.supportPhone || '+225 07 00 00 00 00').replace(/[^0-9]/g, '');
  }, [config.whatsappNumber, config.supportPhone]);

  // Configuration personnalisée de l'en-tête
  const showMegaMenu = config.headerSettings?.showMegaMenu !== false;
  const accentColor = config.headerSettings?.accentColor || '#2563EB';

  // Handlers
  const handleOpenTunnel = useCallback((product: StoreProductItem) => {
    playValidationBeep();
    setSelectedFunnelProduct(product);
    setActiveMenuDropdown(null);
    setIsMobileDrawerOpen(false);
    setIsSearchOverlayOpen(false);
    setShowFavoritesModal(false);
    if (onOpenFunnel) {
      onOpenFunnel(product);
    } else {
      triggerOpenFunnel(product);
    }
  }, [onOpenFunnel]);

  const handleViewProduct = useCallback((product: StoreProductItem) => {
    playTapBeep();
    setActiveMenuDropdown(null);
    setIsMobileDrawerOpen(false);
    setIsSearchOverlayOpen(false);
    setShowFavoritesModal(false);
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  }, [onSelectProduct]);

  const handleLogoClick = useCallback(() => {
    playTapBeep();
    setActiveMenuDropdown(null);
    setIsMobileDrawerOpen(false);
    setIsSearchOverlayOpen(false);
    setShowFavoritesModal(false);
    if (onResetToHome) {
      onResetToHome();
    }
  }, [onResetToHome]);

  const toggleFavorite = useCallback((productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapBeep();
    setFavorites(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  }, []);

  const handleExecuteSearch = useCallback((queryToSearch: string) => {
    playTapBeep();
    setIsSearchOverlayOpen(false);
    setIsMobileDrawerOpen(false);
    if (onSearch) {
      onSearch(queryToSearch);
    }
  }, [onSearch]);

  // Produits favoris complets
  const favoriteProducts = useMemo(() => {
    return products.filter(p => favorites.includes(p.id));
  }, [products, favorites]);

  return (
    <header className={`w-full bg-white select-none z-40 relative ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. LA BARRE D'ANNONCE FINE SUPÉRIEURE (GLOWING STYLE — 00:34) */}
      {/* ========================================================================= */}
      {config.announcementBarEnabled !== false && (
        <div className="w-full py-2 px-4 text-center text-xs font-medium tracking-wide bg-blue-50/80 text-slate-800 border-b border-blue-100/60 flex items-center justify-between gap-4">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="hidden md:block w-24" />

            {/* Texte Centré Modifiable */}
            <div className="flex-1 text-center font-medium text-slate-700 text-[11px] sm:text-xs">
              <span className="font-semibold text-blue-900">
                {config.headerSettings?.announcementText || config.announcementBarText || '✨ Livraison rapide sur toutes vos commandes • Paiement sécurisé à la réception ou Mobile Money'}
              </span>
            </div>

            {/* Lien à droite "Voir les offres →" */}
            <div className="hidden sm:flex items-center justify-end w-32">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (onSelectCategory && effectiveCategories[0]) {
                    onSelectCategory(effectiveCategories[0]);
                  }
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer transition"
              >
                <span>Voir les offres</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GRILLE D'EN-TÊTE ÉDITORIALE AVEC SMART STICKY SCROLL COMPRESSION */}
      {/* Normal : h-20 | Au scroll (>80px) : h-16 + fond translucide blur + bouton rapide */}
      {/* ========================================================================= */}
      <div 
        ref={dropdownRef}
        className={`bg-white/95 backdrop-blur-xl sticky top-0 z-40 border-b border-blue-100/80 px-4 lg:px-12 transition-all duration-300 grid grid-cols-3 items-center relative ${
          isScrolled ? 'h-16 shadow-sm' : 'h-20'
        }`}
      >
        
        {/* ======================================================================= */}
        {/* A. ZONE GAUCHE : NAVIGATION ÉDITORIALE (DESKTOP) OU BURGER ☰ (MOBILE) */}
        {/* ======================================================================= */}
        <div className="flex items-center">
          {/* Version Mobile / Tablette : Bouton ☰ */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsMobileDrawerOpen(true);
              }}
              className="p-2 -ml-2 rounded-xl text-slate-900 hover:text-blue-600 hover:bg-blue-50/50 transition cursor-pointer"
              title="Menu de navigation"
            >
              <Menu className="w-6 h-6 stroke-[2]" />
            </button>
          </div>

          {/* Version Desktop : 5 Liens Éditoriaux */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-bold tracking-[0.14em] uppercase text-slate-900">
            {/* 1. ACCUEIL */}
            <button
              type="button"
              onClick={handleLogoClick}
              className="relative py-2 transition cursor-pointer text-slate-900 hover:text-blue-600 after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:w-0 hover:after:w-full after:h-[2px] after:bg-blue-600 after:transition-all after:duration-300"
            >
              Accueil
            </button>

            {/* 2. BOUTIQUE ⌄ */}
            <div 
              className="relative"
              onMouseEnter={() => showMegaMenu && setActiveMenuDropdown('shop')}
            >
              <button
                type="button"
                onClick={() => {
                  if (showMegaMenu) {
                    setActiveMenuDropdown(activeMenuDropdown === 'shop' ? null : 'shop');
                  } else if (onSelectCategory && effectiveCategories[0]) {
                    onSelectCategory(effectiveCategories[0]);
                  }
                }}
                className={`relative py-2 flex items-center gap-1 transition cursor-pointer text-slate-900 hover:text-blue-600 after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:bg-blue-600 after:transition-all after:duration-300 ${
                  activeMenuDropdown === 'shop' ? 'text-blue-600 after:w-full' : 'after:w-0 hover:after:w-full'
                }`}
              >
                <span>Boutique</span>
                {showMegaMenu && (
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activeMenuDropdown === 'shop' ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                )}
              </button>
            </div>

            {/* 3. PRODUITS PHARES ⌄ */}
            <div 
              className="relative"
              onMouseEnter={() => showMegaMenu && setActiveMenuDropdown('products')}
            >
              <button
                type="button"
                onClick={() => {
                  if (showMegaMenu) {
                    setActiveMenuDropdown(activeMenuDropdown === 'products' ? null : 'products');
                  } else if (featuredThreeProducts[0]) {
                    handleViewProduct(featuredThreeProducts[0]);
                  }
                }}
                className={`relative py-2 flex items-center gap-1 transition cursor-pointer text-slate-900 hover:text-blue-600 after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:bg-blue-600 after:transition-all after:duration-300 ${
                  activeMenuDropdown === 'products' ? 'text-blue-600 after:w-full' : 'after:w-0 hover:after:w-full'
                }`}
              >
                <span>Produits Phares</span>
                {showMegaMenu && (
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activeMenuDropdown === 'products' ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                )}
              </button>
            </div>

            {/* 4. CATÉGORIES ⌄ */}
            <div 
              className="relative"
              onMouseEnter={() => showMegaMenu && setActiveMenuDropdown('categories')}
            >
              <button
                type="button"
                onClick={() => {
                  if (showMegaMenu) {
                    setActiveMenuDropdown(activeMenuDropdown === 'categories' ? null : 'categories');
                  } else if (onSelectCategory && effectiveCategories[0]) {
                    onSelectCategory(effectiveCategories[0]);
                  }
                }}
                className={`relative py-2 flex items-center gap-1 transition cursor-pointer text-slate-900 hover:text-blue-600 after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:bg-blue-600 after:transition-all after:duration-300 ${
                  activeMenuDropdown === 'categories' ? 'text-blue-600 after:w-full' : 'after:w-0 hover:after:w-full'
                }`}
              >
                <span>Catégories</span>
                {showMegaMenu && (
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activeMenuDropdown === 'categories' ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                )}
              </button>
            </div>

            {/* 5. WHATSAPP */}
            <a
              href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent("Bonjour, j'aimerais des conseils personnalisés sur vos produits d'exception.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative py-2 transition cursor-pointer text-slate-900 hover:text-blue-600 after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:w-0 hover:after:w-full after:h-[2px] after:bg-blue-600 after:transition-all after:duration-300"
            >
              WhatsApp
            </a>
          </nav>
        </div>

        {/* ======================================================================= */}
        {/* B. ZONE CENTRALE : LE GRAND LOGO MAJESTUEUX CENTRÉ (GLOWING STYLE) */}
        {/* ======================================================================= */}
        <div 
          onClick={handleLogoClick}
          className="flex flex-col items-center justify-center text-center cursor-pointer group"
          title="Retour à l'accueil"
        >
          {config.logoUrl ? (
            <img
              src={config.logoUrl}
              alt={config.storeName || 'GLOWING'}
              className={`object-contain max-w-[180px] sm:max-w-[220px] group-hover:opacity-90 transition-all duration-300 ${
                isScrolled ? 'h-8 sm:h-9' : 'h-10 sm:h-11'
              }`}
            />
          ) : (
            <div className="flex flex-col items-center">
              <span className={`font-extrabold tracking-[0.22em] uppercase text-slate-900 group-hover:text-blue-600 transition-all leading-none ${
                isScrolled ? 'text-xl lg:text-2xl' : 'text-2xl lg:text-[28px]'
              }`}>
                {config.storeName || 'GLOWING'}
              </span>
              {!isScrolled && (
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1 transition-opacity">
                  {config.storeTagline || 'BEAUTÉ • SANTÉ • LUXE'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ======================================================================= */}
        {/* C. ZONE DROITE : ICÔNES D'ACTION (🔍 RECHERCHE, ☆ FAVORIS, 🛍️ PANIER) */}
        {/* & BOUTON D'ACTION RAPIDE EN BLEU ROYAL AU SCROLL STICKY */}
        {/* ======================================================================= */}
        <div className="flex items-center justify-end gap-2 sm:gap-4">
          
          {/* Bouton d'action rapide Sticky au Scroll (Apparaît quand isScrolled === true) */}
          {isScrolled && (
            <button
              type="button"
              onClick={() => {
                if (products[0]) handleOpenTunnel(products[0]);
              }}
              className="animate-in fade-in zoom-in-95 duration-200 hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
              <span>Commander Express</span>
            </button>
          )}

          {/* 1. Icône 🔍 Recherche */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsSearchOverlayOpen(true);
            }}
            className="p-2 rounded-xl text-slate-800 hover:text-blue-600 hover:bg-blue-50/60 transition cursor-pointer"
            title="Rechercher un produit"
          >
            <Search className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* 2. Icône ☆ Favoris avec badge */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setShowFavoritesModal(true);
            }}
            className="p-2 rounded-xl text-slate-800 hover:text-amber-500 hover:bg-amber-50/60 transition cursor-pointer relative"
            title="Produits favoris"
          >
            <Star className={`w-5 h-5 stroke-[1.8] ${favorites.length > 0 ? 'fill-amber-400 text-amber-400' : ''}`} />
            {favorites.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                {favorites.length}
              </span>
            )}
          </button>

          {/* 3. Icône 🛍️ Panier avec déclencheur direct du Tunnel */}
          <button
            type="button"
            onClick={() => {
              if (products[0]) handleOpenTunnel(products[0]);
            }}
            className="p-2 rounded-xl text-slate-900 hover:text-blue-600 hover:bg-blue-50/60 transition relative cursor-pointer"
            title="Panier & Commander"
          >
            <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>
        </div>

        {/* ======================================================================= */}
        {/* LE MEGA-MENU VISUEL ÉDITORIAL DÉPLIÉ SOUS L'EN-TÊTE (DESKTOP) */}
        {/* ======================================================================= */}
        {showMegaMenu && activeMenuDropdown && (
          <div 
            onMouseLeave={() => setActiveMenuDropdown(null)}
            className="absolute top-full left-0 right-0 bg-white border-b border-blue-100 shadow-2xl py-8 px-6 lg:px-16 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Colonne Gauche (lg:col-span-4) : Collections & Catégories */}
              <div className="lg:col-span-4 space-y-4 pr-6 lg:border-r border-slate-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Collections & Soins
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold uppercase">
                    Catalogue Officiel
                  </span>
                </div>

                <div className="space-y-2">
                  {effectiveCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (onSelectCategory) onSelectCategory(cat);
                        setActiveMenuDropdown(null);
                      }}
                      className="w-full text-left py-2 px-3 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 transition flex items-center justify-between group cursor-pointer"
                    >
                      <span>{cat}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-600" />
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <a
                    href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent("Bonjour, j'aimerais voir le catalogue complet de votre boutique.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <span>Demander le catalogue PDF complet sur WhatsApp</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Colonne Droite (lg:col-span-8) : Les 3 Cartes Produits Phares avec "⚡ Voir Tunnel & Acheter" */}
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-100">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-500" /> Sélection Prestige du Moment
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Cliquez sur un produit pour commander en 1 clic
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {featuredThreeProducts.map((prod, idx) => (
                    <div 
                      key={prod.id}
                      className="bg-slate-50/60 rounded-2xl p-3 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Image Produit avec bascule favoris */}
                        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white border border-slate-200 mb-2.5 relative">
                          <img
                            src={prod.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&auto=format&fit=crop&q=80'}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <span className="absolute top-2 left-2 bg-slate-900 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                            {idx === 0 ? 'BEST-SELLER' : idx === 1 ? 'NOUVEAU' : 'ÉDITION'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(prod.id, e)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-amber-500 shadow-sm transition"
                            title="Ajouter aux favoris"
                          >
                            <Star className={`w-3.5 h-3.5 ${favorites.includes(prod.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                        </div>

                        {/* Catégorie & Nom */}
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block truncate mb-0.5">
                          {prod.category || 'Soin'}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                          {prod.name}
                        </h4>

                        {/* Prix en Bleu Royal */}
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-sm font-black text-blue-600">
                            {prod.price?.toLocaleString()} FCFA
                          </span>
                          {prod.originalPrice && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {prod.originalPrice.toLocaleString()} FCFA
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Boutons d'Action : Voir & Tunnel */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => handleViewProduct(prod)}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-400 text-xs font-bold transition cursor-pointer"
                          title="Voir la fiche détaillée"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenTunnel(prod)}
                          className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/25 transition active:scale-95 cursor-pointer"
                        >
                          <Zap className="w-3 h-3 fill-current text-yellow-300" />
                          <span>Voir Tunnel</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. TIROIR DE NAVIGATION MOBILE ÉDITORIAL (< 1024px & SIMULATEUR IPHONE) */}
      {/* ========================================================================= */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start animate-in fade-in duration-200">
          <div className="w-[85%] max-w-[340px] bg-white h-full p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-250 overflow-y-auto">
            
            {/* Haut du Tiroir Mobile */}
            <div className="space-y-5">
              
              {/* En-Tête du Tiroir avec Logo & Fermeture */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-base font-extrabold tracking-wider uppercase text-slate-900">
                  {config.storeName || 'GLOWING'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barre de Recherche Directe dans le tiroir mobile */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteSearch(searchQuery);
                  }}
                  placeholder="Rechercher un soin, parfum..."
                  className="w-full py-2.5 pl-9 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Liens de Base & Catégories */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleLogoClick}
                  className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-slate-800 hover:text-blue-600 flex items-center justify-between"
                >
                  <span>Accueil</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Liste des Catégories */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Rayons & Soins :
                  </span>
                  <div className="space-y-1">
                    {effectiveCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (onSelectCategory) onSelectCategory(cat);
                          setIsMobileDrawerOpen(false);
                        }}
                        className="w-full text-left py-2 px-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/60 transition flex items-center justify-between"
                      >
                        <span>{cat}</span>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Produits Vedettes dans le Tiroir Mobile */}
                {featuredThreeProducts.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                      ⭐ Produits Vedettes :
                    </span>
                    <div className="space-y-2">
                      {featuredThreeProducts.slice(0, 2).map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleViewProduct(p)}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition cursor-pointer"
                        >
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=200&auto=format&fit=crop&q=80'}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-white"
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate">{p.name}</h5>
                            <span className="text-xs font-black text-blue-600">{p.price?.toLocaleString()} FCFA</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Bas du Tiroir Mobile : 2 Grands Boutons d'Action (WhatsApp + Offres Flash) */}
            <div className="pt-5 border-t border-slate-100 space-y-2.5 mt-4">
              {/* Grand Bouton WhatsApp */}
              <a
                href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent("Bonjour, j'aimerais commander un produit de votre catalogue.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>💬 Discuter / Commander sur WhatsApp</span>
              </a>

              {/* Grand Bouton Offres Flash */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  if (products[0]) handleOpenTunnel(products[0]);
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current text-yellow-300" />
                <span>⚡ Voir les Offres Flash</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OVERLAY DE RECHERCHE PLEIN ÉCRAN INSTANTANÉ (AU CLIC SUR 🔍) */}
      {/* ========================================================================= */}
      {isSearchOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 mt-12 sm:mt-16">
            
            {/* Header Recherche */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-blue-600 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteSearch(searchQuery);
                }}
                placeholder="Rechercher par nom, catégorie, bienfait..."
                className="flex-1 text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setIsSearchOverlayOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Suggestions de Catégories rapides */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Rayons :</span>
              {effectiveCategories.slice(0, 5).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSearchQuery(cat);
                    handleExecuteSearch(cat);
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 transition shrink-0"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Résultats Produits */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                {searchQuery ? `Résultats pour "${searchQuery}"` : 'Produits populaires'}
              </span>

              {filteredProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Aucun produit ne correspond à votre recherche.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map(p => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-white transition flex items-center justify-between gap-3 group"
                    >
                      <div 
                        onClick={() => handleViewProduct(p)} 
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <img
                          src={p.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=200&auto=format&fit=crop&q=80'}
                          alt={p.name}
                          className="w-12 h-12 rounded-xl object-cover bg-white shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 truncate">{p.name}</h4>
                          <span className="text-xs font-black text-blue-600">{p.price?.toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenTunnel(p)}
                        className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm transition active:scale-95"
                        title="Commander en 1 clic"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODALE DES FAVORIS (AU CLIC SUR ☆) */}
      {/* ========================================================================= */}
      {showFavoritesModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Mes Favoris ({favoriteProducts.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFavoritesModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {favoriteProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Star className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Vous n'avez pas encore de favoris</p>
                  <p className="text-[11px] text-slate-400">Cliquez sur l'étoile d'un produit pour l'enregistrer ici.</p>
                </div>
              ) : (
                favoriteProducts.map(p => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 flex items-center justify-between gap-3"
                  >
                    <div 
                      onClick={() => handleViewProduct(p)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <img
                        src={p.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=200&auto=format&fit=crop&q=80'}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover bg-white shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{p.name}</h4>
                        <span className="text-xs font-black text-blue-600">{p.price?.toLocaleString()} FCFA</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(p.id, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                        title="Retirer des favoris"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenTunnel(p)}
                        className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1 shadow-sm transition active:scale-95"
                      >
                        <Zap className="w-3 h-3 fill-current text-yellow-300" />
                        <span>Acheter</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TIROIR TUNNEL D'ACHAT DIRECT DÉPLOYÉ EN 0MS SANS QUITTER LA PAGE */}
      {/* ========================================================================= */}
      {selectedFunnelProduct && (
        <SlideOutFunnelDrawer
          funnelId={selectedFunnelProduct.linkedFunnelId || selectedFunnelProduct.id}
          isOpen={Boolean(selectedFunnelProduct)}
          onClose={() => setSelectedFunnelProduct(null)}
          renderMode="component"
        />
      )}

    </header>
  );
};

export default EditorialGlowingHeader;
