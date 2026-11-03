import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Search, 
  ShoppingBag, 
  MessageCircle, 
  Sparkles, 
  Zap, 
  ChevronDown, 
  X, 
  Flame, 
  ArrowRight,
  Eye,
  Check,
  Command,
  Star,
  Bell,
  Smartphone
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../../types';
import { StoreProductItem } from '../types';
import { SlideOutFunnelDrawer } from '../../../../../components/SlideOutFunnelDrawer';
import { triggerOpenFunnel } from '../../../../../themes/themeUtils';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface DynamicIslandHeaderProps {
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

export const DynamicIslandHeader: React.FC<DynamicIslandHeaderProps> = ({
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

  // Morphing dynamique au scroll (scrollY > 90)
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // Expansion en mode Spotlight / Command Palette au clic
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Onglet de navigation actif
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'catalog' | 'deals' | 'categories'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Recherche Spotlight
  const [searchQuery, setSearchQuery] = useState<string>('');
  const spotlightInputRef = useRef<HTMLInputElement>(null);

  // Micro-Notifications Dynamiques Toast (style Live Activities iPhone)
  const [isToastVisible, setIsToastVisible] = useState<boolean>(false);
  const [toastIndex, setToastIndex] = useState<number>(0);

  // Tiroir Tunnel d'achat intégré
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);

  // Référence conteneur pour clic à l'extérieur
  const containerRef = useRef<HTMLDivElement>(null);

  // Écouteur de scroll pour morphing Dynamic Island
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 90;
      setIsScrolled(scrolled);
      if (scrolled && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  // Fermeture au clic en dehors de l'îlot étendu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermeture avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus sur le champ Spotlight lors de l'expansion
  useEffect(() => {
    if (isExpanded && spotlightInputRef.current) {
      setTimeout(() => {
        spotlightInputRef.current?.focus();
      }, 120);
    }
  }, [isExpanded]);

  // Catégories effectives
  const effectiveCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const fromProds = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return fromProds.length > 0 ? fromProds : ['Tous les rayons', 'Soins & Beauté', 'Accessoires', 'Tendances'];
  }, [categories, products]);

  // Produit Vedette pour l'affichage compact au scroll et notifications
  const featuredProduct = useMemo<StoreProductItem | null>(() => {
    if (products.length === 0) return null;
    const promo = products.find(p => p.originalPrice && p.originalPrice > p.price);
    return promo || products[0];
  }, [products]);

  // Liste des messages de micro-notifications toast en direct
  const toastMessages = useMemo(() => {
    const pName = featuredProduct?.name || 'Notre produit phare';
    return [
      {
        id: 'toast-1',
        icon: '🔥',
        text: `${pName} est en forte demande aujourd'hui`,
        cta: 'Voir le Tunnel →',
        product: featuredProduct
      },
      {
        id: 'toast-2',
        icon: '⚡',
        text: 'Livraison express disponible aujourd\'hui partout à Abidjan & intérieur',
        cta: 'Commander →',
        product: featuredProduct
      },
      {
        id: 'toast-3',
        icon: '✅',
        text: `Plus que quelques exemplaires en stock pour ${pName}`,
        cta: '⚡ Payer maintenant',
        product: featuredProduct
      }
    ];
  }, [featuredProduct]);

  // Timer cyclique des Micro-Notifications : déclenchées toutes les 20s pendant 4s
  useEffect(() => {
    const enableToasts = config.headerSettings?.enableDynamicToasts !== false;
    if (!enableToasts) return;

    // Intervalle de 20 secondes
    const interval = setInterval(() => {
      // N'afficher que si l'îlot n'est pas déjà étendu en Spotlight
      if (!isExpanded) {
        setIsToastVisible(true);
        setToastIndex((prev) => (prev + 1) % (toastMessages?.length || 1));

        // Disparaît automatiquement après 4 secondes
        const hideTimer = setTimeout(() => {
          setIsToastVisible(false);
        }, 4000);

        return () => clearTimeout(hideTimer);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [isExpanded, toastMessages?.length, config.headerSettings?.enableDynamicToasts]);

  // Les 3 Coups de Cœur Instantanés (ou résultats de recherche en direct dans le Spotlight)
  const spotlightThreeProducts = useMemo<StoreProductItem[]>(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = products.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.category?.toLowerCase().includes(q) || 
        p.description?.toLowerCase().includes(q)
      );
      if (matches.length > 0) return matches.slice(0, 3);
    }

    if (selectedCategory !== 'all') {
      const catProds = products.filter(p => p.category === selectedCategory);
      if (catProds.length > 0) return catProds.slice(0, 3);
    }

    const promos = products.filter(p => p.originalPrice && p.originalPrice > p.price);
    if (promos.length >= 3) return promos.slice(0, 3);
    if (products.length >= 3) return products.slice(0, 3);
    return products;
  }, [products, searchQuery, selectedCategory]);

  // Numéro WhatsApp
  const whatsappPhone = useMemo(() => {
    return (config.whatsappNumber || config.supportPhone || '+225 07 00 00 00 00').replace(/[^0-9]/g, '');
  }, [config.whatsappNumber, config.supportPhone]);

  // Nombre d'articles panier
  const cartCount = 1;

  // Handlers
  const handleOpenTunnel = useCallback((product: StoreProductItem) => {
    playValidationBeep();
    setSelectedFunnelProduct(product);
    setIsExpanded(false);
    setIsToastVisible(false);
    if (onOpenFunnel) {
      onOpenFunnel(product);
    } else {
      triggerOpenFunnel(product);
    }
  }, [onOpenFunnel]);

  const handleLogoClick = useCallback(() => {
    playTapBeep();
    setActiveNavTab('home');
    setIsExpanded(false);
    if (onResetToHome) {
      onResetToHome();
    }
  }, [onResetToHome]);

  const handleExecuteSearch = useCallback((q: string) => {
    playTapBeep();
    setIsExpanded(false);
    if (onSearch) {
      onSearch(q);
    }
  }, [onSearch]);

  const handleSelectCat = useCallback((cat: string) => {
    playTapBeep();
    setSelectedCategory(cat);
    setActiveNavTab('categories');
    if (onSelectCategory && cat !== 'all') {
      onSelectCategory(cat);
    }
  }, [onSelectCategory]);

  const handleToggleExpand = useCallback(() => {
    playTapBeep();
    setIsExpanded(prev => !prev);
    setIsToastVisible(false);
  }, []);

  const currentToast = toastMessages[toastIndex] || toastMessages[0];

  return (
    <header className={`w-full sticky top-3 sm:top-4 z-40 px-3 sm:px-6 pointer-events-none select-none ${className}`}>
      
      {/* Conteneur englobant centré */}
      <div ref={containerRef} className="max-w-[1240px] mx-auto">
        
        {/* ======================================================================= */}
        {/* LA PILULE FLOTTANTE EN VERRE DÉPOLI (AVEC MORPHING & LIVE TOAST NOTIFICATION) */}
        {/* ======================================================================= */}
        <div 
          className={`pointer-events-auto mx-auto transition-all duration-500 ease-out relative ${
            isScrolled
              ? 'max-w-[680px] w-full rounded-full bg-white/95 backdrop-blur-2xl border-2 border-blue-500/30 shadow-[0_16px_50px_rgba(37,99,235,0.18)] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3'
              : 'max-w-[1240px] w-full rounded-full bg-white/90 backdrop-blur-2xl border-2 border-blue-100/90 shadow-[0_12px_40px_rgba(37,99,235,0.10)] px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-4'
          }`}
        >
          
          {/* ===================================================================== */}
          {/* CONDITION SPECIALE : MICRO-NOTIFICATION TEMPS RÉEL (STYLE LIVE ACTIVITY) */}
          {/* S'affiche en bandeau dynamique Bleu Royal & Blanc pendant 4 secondes */}
          {/* ===================================================================== */}
          {isToastVisible && !isExpanded ? (
            <div className="w-full flex items-center justify-between gap-2 sm:gap-3 animate-in fade-in zoom-in-95 duration-300 py-0.5">
              
              {/* Message Toast avec icône animée */}
              <div 
                onClick={() => {
                  if (currentToast.product) handleOpenTunnel(currentToast.product);
                }}
                className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 cursor-pointer group"
                title="Cliquer pour voir l'offre"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm animate-pulse">
                  {currentToast.icon}
                </div>
                <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {currentToast.text}
                  </span>
                  <span className="text-[10px] font-black text-blue-600 underline shrink-0 hidden sm:inline">
                    {currentToast.cta}
                  </span>
                </div>
              </div>

              {/* Boutons d'Action Rapide de la Toast */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (currentToast.product) handleOpenTunnel(currentToast.product);
                  }}
                  className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black shadow-sm shadow-blue-600/30 active:scale-95 transition cursor-pointer"
                >
                  ⚡ Acheter
                </button>
                <button
                  type="button"
                  onClick={() => setIsToastVisible(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title="Masquer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ) : !isScrolled ? (
            /* ===================================================================== */
            /* CAS 1 : ÉTAT NORMAL EN HAUT DE PAGE (!isScrolled) */
            /* ===================================================================== */
            <>
              {/* A. GAUCHE : LOGO ROND + NOM + BADGE EN DIRECT */}
              <div 
                onClick={handleLogoClick}
                className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
                title="Retour accueil"
              >
                {/* Avatar rond avec liseré Bleu Royal */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full p-[2px] ring-2 ring-blue-600/30 bg-white flex items-center justify-center overflow-hidden shadow-xs group-hover:scale-105 transition-transform">
                  {config.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt={config.storeName || 'Boutique'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center">
                      {(config.storeName || 'N').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Nom & Badge En direct */}
                <div className="flex flex-col">
                  <span className="text-xs sm:text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-1">
                    {config.storeName || 'Boutique Officielle'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      <span>En direct</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* B. CENTRE (DESKTOP) : PILULES DE NAVIGATION PAR RAYONS */}
              <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-full border border-slate-200/60 shadow-inner">
                
                {/* 1. Accueil */}
                <button
                  type="button"
                  onClick={handleLogoClick}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    activeNavTab === 'home'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-white/70'
                  }`}
                >
                  Accueil
                </button>

                {/* 2. Catalogue */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveNavTab('catalog');
                    if (effectiveCategories[0] && onSelectCategory) {
                      onSelectCategory(effectiveCategories[0]);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    activeNavTab === 'catalog'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-white/70'
                  }`}
                >
                  Catalogue
                </button>

                {/* 3. Promos */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveNavTab('deals');
                    const promo = products.find(p => p.originalPrice && p.originalPrice > p.price);
                    if (promo && onSelectProduct) onSelectProduct(promo);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    activeNavTab === 'deals'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-rose-600 hover:bg-white/70'
                  }`}
                >
                  <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                  <span>Promos</span>
                </button>

                {/* 4. Catégories ⌄ (Déploie l'expansion de l'îlot) */}
                <button
                  type="button"
                  onClick={handleToggleExpand}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    isExpanded || activeNavTab === 'categories'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-white/70'
                  }`}
                >
                  <span>Catégories</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

              </nav>

              {/* B. BIS (VERSION MOBILE < 1024px) : BOUTON RAPIDE 🔍 RECHERCHER / RAYONS */}
              <div className="flex lg:hidden flex-1 justify-center px-1">
                <button
                  type="button"
                  onClick={handleToggleExpand}
                  className="py-1 px-3 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-600 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                >
                  <Search className="w-3.5 h-3.5 text-blue-600" />
                  <span className="truncate max-w-[120px] sm:max-w-none">Rayons & Recherche</span>
                </button>
              </div>

              {/* C. DROITE : LOUPE DÉPLIANTE, WHATSAPP & PANIER BLEU ROYAL */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                
                {/* Bouton Loupe 🔍 Desktop */}
                <button
                  type="button"
                  onClick={handleToggleExpand}
                  className={`hidden sm:flex p-2 rounded-full transition cursor-pointer ${
                    isExpanded
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-blue-50/70'
                  }`}
                  title="Recherche Spotlight"
                >
                  <Search className="w-4 h-4 text-current" />
                </button>

                {/* Bouton 💬 WhatsApp Direct */}
                <a
                  href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent("Bonjour, je visite votre boutique et j'aimerais des conseils.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full shadow-sm hover:shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  title="Conseiller WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>

                {/* Bouton Panier en Bleu Royal 🛒 {cartCount} */}
                <button
                  type="button"
                  onClick={() => {
                    if (featuredProduct) handleOpenTunnel(featuredProduct);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm shadow-blue-600/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  title="Panier et commande"
                >
                  <ShoppingBag className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Panier ({cartCount})</span>
                </button>
              </div>
            </>
          ) : (
            /* ===================================================================== */
            /* CAS 2 : ÉTAT MORPHING PENDANT LE SCROLL (DYNAMIC ISLAND COMPACTE) */
            /* ===================================================================== */
            <>
              {/* A. GAUCHE COMPACTE : LOGO / AVATAR MINIATURE */}
              <div 
                onClick={handleLogoClick}
                className="flex items-center gap-2 cursor-pointer shrink-0"
                title="Retour en haut"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-blue-600/40 bg-white flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      {(config.storeName || 'N').charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* B. CENTRE DE LA DYNAMIC ISLAND : BANDEAU PRODUIT VEDETTE (CLIC DÉPLOIE L'ÎLOT) */}
              {featuredProduct ? (
                <div 
                  onClick={handleToggleExpand}
                  className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 px-1 sm:px-2 cursor-pointer group"
                  title="Cliquer pour déplier l'îlot"
                >
                  {/* Miniature ronde avec bordure Bleue */}
                  <img
                    src={featuredProduct.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=100&auto=format&fit=crop&q=80'}
                    alt={featuredProduct.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-blue-600 shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                  />

                  {/* Titre court + Prix en Bleu Royal */}
                  <div className="min-w-0 flex flex-col">
                    <span className="text-[11px] sm:text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[130px] sm:max-w-[190px] leading-tight">
                      {featuredProduct.name}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] sm:text-xs font-black text-blue-600">
                        {featuredProduct.price?.toLocaleString()} FCFA
                      </span>
                      {featuredProduct.originalPrice && (
                        <span className="text-[9px] text-slate-400 line-through hidden sm:inline">
                          {featuredProduct.originalPrice.toLocaleString()} F
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={handleToggleExpand}
                  className="flex-1 text-center text-xs font-bold text-slate-800 cursor-pointer"
                >
                  {config.storeName || 'Nanasore Store'}
                </div>
              )}

              {/* C. DROITE DE LA DYNAMIC ISLAND : BOUTON RAPIDE ⚡ VOIR TUNNEL & ACHETER */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (featuredProduct) handleOpenTunnel(featuredProduct);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-3 sm:px-4 py-1.5 rounded-full shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  title="Commander immédiatement"
                >
                  <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                  <span className="hidden sm:inline">⚡ Voir Tunnel</span>
                  <span className="sm:hidden">⚡ Acheter</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleExpand}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-600 transition cursor-pointer"
                  title="Recherche & Déplier"
                >
                  <Search className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </>
          )}

        </div>

        {/* ======================================================================= */}
        {/* L'EXPANSION INTERACTIVE DE LA DYNAMIC ISLAND (MODE SPOTLIGHT & APERÇU 3 COUPS DE CŒUR) */}
        {/* ======================================================================= */}
        {isExpanded && (
          <div className="pointer-events-auto rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-blue-200 shadow-[0_25px_70px_rgba(37,99,235,0.22)] p-4 sm:p-6 max-w-[780px] w-full mx-auto mt-2 animate-in fade-in zoom-in-95 duration-200 relative z-50">
            
            {/* Header Spotlight avec Titre, Badge & Bouton Fermer */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Command className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    Dynamic Spotlight
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                      Recherche 0ms
                    </span>
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                title="Fermer (Échap)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Barre de Recherche Instantanée ("Spotlight Search") */}
            <div className="relative mb-3.5">
              <div className="w-full rounded-2xl bg-slate-50 border border-blue-100 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/10 p-2.5 sm:p-3.5 flex items-center gap-3 transition-all shadow-inner">
                <Search className="w-5 h-5 text-blue-600 shrink-0" />
                <input
                  ref={spotlightInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteSearch(searchQuery);
                  }}
                  placeholder="Rechercher instantanément un soin, produit, promo..."
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Grille Rapide des Catégories en Pilules Bleues & Blanches */}
            <div className="mb-3.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => handleSelectCat('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-blue-50/70 text-blue-700 border border-blue-200/60 hover:bg-blue-100'
                  }`}
                >
                  Tous les rayons
                </button>
                {effectiveCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelectCat(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-blue-50/70 text-blue-700 border border-blue-200/60 hover:bg-blue-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Rangée des 3 "Coups de Cœur Instantanés" directement dans l'îlot déplié */}
            <div>
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  {searchQuery ? `Résultats pour "${searchQuery}"` : '🔥 3 Coups de Cœur du Moment :'}
                </span>
                <span className="text-[10px] text-blue-600 font-bold">
                  Commande Express 1-Clic
                </span>
              </div>

              {spotlightThreeProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Aucun produit ne correspond à votre recherche.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {spotlightThreeProducts.map((p, idx) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-100 hover:border-blue-300 bg-slate-50/60 hover:bg-white p-3 flex flex-col justify-between transition-all group shadow-xs hover:shadow-md"
                    >
                      {/* Partie Haute : Image + Titre + Prix */}
                      <div 
                        onClick={() => {
                          setIsExpanded(false);
                          if (onSelectProduct) onSelectProduct(p);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-white border border-slate-200 mb-2 relative">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&auto=format&fit=crop&q=80'}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                            {idx === 0 ? 'TOP 1' : idx === 1 ? 'PROMO' : 'TENDANCE'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
                          {p.name}
                        </h4>

                        <div className="flex items-baseline gap-1.5 mb-2.5">
                          <span className="text-xs sm:text-sm font-black text-blue-600">
                            {p.price?.toLocaleString()} FCFA
                          </span>
                          {p.originalPrice && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {p.originalPrice.toLocaleString()} F
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Partie Basse : Les 2 Boutons (⚡ Voir Tunnel & 💬 WhatsApp) */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                        {/* Bouton 1 : ⚡ Voir Tunnel & Acheter */}
                        <button
                          type="button"
                          onClick={() => handleOpenTunnel(p)}
                          className="w-full py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/25 active:scale-95 transition-all cursor-pointer"
                        >
                          <Zap className="w-3 h-3 fill-current text-yellow-300" />
                          <span>⚡ Voir Tunnel & Acheter</span>
                        </button>

                        {/* Bouton 2 : 💬 WhatsApp */}
                        <a
                          href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Bonjour, j'aimerais commander "${p.name}" à ${p.price?.toLocaleString()} FCFA.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => playTapBeep()}
                          className="w-full py-1.5 px-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3 fill-current" />
                          <span>Acheter via WhatsApp</span>
                        </a>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* TIROIR TUNNEL D'ACHAT DIRECT AU CLIC SUR LE BOUTON DE LA DYNAMIC ISLAND */}
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

export default DynamicIslandHeader;
