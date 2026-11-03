import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Search, 
  ShoppingBag, 
  MessageCircle, 
  CheckCircle2, 
  Flame, 
  Video, 
  Sparkles, 
  Star, 
  ChevronRight, 
  ChevronLeft,
  X,
  Zap,
  Eye,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Check,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../../types';
import { StoreProductItem } from '../types';
import { SlideOutFunnelDrawer } from '../../../../../components/SlideOutFunnelDrawer';
import { triggerOpenFunnel } from '../../../../../themes/themeUtils';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface StoryRingItem {
  id: string;
  title: string;
  type: 'flash_sale' | 'reviews' | 'demo_video' | 'product' | 'category';
  image: string;
  badge: string;
  badgeColor?: string;
  product?: StoreProductItem;
  videoUrl?: string;
  rating?: number;
}

export interface StoriesRingsHeaderProps {
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

export const StoriesRingsHeader: React.FC<StoriesRingsHeaderProps> = ({
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

  // Recherche locale
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // État du Lecteur de Story Plein Écran
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // État des Stories déjà consultées
  const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]);

  // Comportement au scroll (Smart Sticky)
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isRailManuallyExpanded, setIsRailManuallyExpanded] = useState<boolean>(false);

  // Tiroir Tunnel d'achat intégré
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);

  // Rail de défilement horizontal
  const railRef = useRef<HTMLDivElement>(null);

  // Écouteur de scroll intelligent (window.scrollY > 100)
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 100;
      setIsScrolled(scrolled);
      if (!scrolled) {
        setIsRailManuallyExpanded(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Enregistrement de la Story active comme "consultée"
  useEffect(() => {
    if (activeStoryIndex !== null) {
      // storyRings est défini dans useMemo plus bas, on utilise une mise à jour d'état différée
    }
  }, [activeStoryIndex]);

  // Téléphone WhatsApp nettoyé
  const whatsappPhone = useMemo(() => {
    return (config.whatsappNumber || config.supportPhone || '+225 07 00 00 00 00').replace(/[^0-9]/g, '');
  }, [config.whatsappNumber, config.supportPhone]);

  // Nombre d'articles panier
  const cartCount = 1;

  // Réglages studio
  const storiesFilter = config.headerSettings?.storiesFilter || 'all'; // 'all' | 'promo_only'
  const storiesRailTitle = config.headerSettings?.storiesRailTitle || '🔥 Stories & Offres Flash';

  // Construction dynamique des 6 à 8 Bulles de Stories Shoppables
  const storyRings = useMemo<StoryRingItem[]>(() => {
    const list: StoryRingItem[] = [];

    // Filtrage des produits si l'option "promo_only" est choisie
    const eligibleProducts = storiesFilter === 'promo_only'
      ? products.filter(p => p.originalPrice && p.originalPrice > p.price)
      : products;
    const effectiveProds = eligibleProducts.length > 0 ? eligibleProducts : products;

    // 1. Story 1 (Spéciale Promo) : 🔥 Offre Flash
    const flashProd = effectiveProds.find(p => p.originalPrice && p.originalPrice > p.price) || effectiveProds[0];
    const discountPct = flashProd && flashProd.originalPrice
      ? Math.round(((flashProd.originalPrice - flashProd.price) / flashProd.originalPrice) * 100)
      : 30;

    list.push({
      id: 'story-flash-sale',
      title: 'Offre Flash',
      type: 'flash_sale',
      image: flashProd?.image || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&auto=format&fit=crop&q=80',
      badge: `-${discountPct}%`,
      badgeColor: 'bg-rose-600',
      product: flashProd
    });

    // 2. Story 2 (Preuve Sociale) : 💬 Avis Clients
    list.push({
      id: 'story-reviews',
      title: 'Avis Clients',
      type: 'reviews',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      badge: '★ 4.9',
      badgeColor: 'bg-amber-500',
      rating: 4.9,
      product: effectiveProds[0]
    });

    // 3. Story 3 (Démo Vidéo) : 🎥 Démo Live
    const videoProd = effectiveProds.find(p => p.videoUrl) || effectiveProds[1] || effectiveProds[0];
    list.push({
      id: 'story-demo-video',
      title: 'Démo Live',
      type: 'demo_video',
      image: videoProd?.image || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&auto=format&fit=crop&q=80',
      badge: 'LIVE',
      badgeColor: 'bg-blue-600',
      product: videoProd,
      videoUrl: videoProd?.videoUrl
    });

    // 4 à 8. Stories Produits Vedettes & Catégories
    const remainingProducts = effectiveProds.filter(p => p.id !== flashProd?.id).slice(0, 5);

    if (remainingProducts.length > 0) {
      remainingProducts.forEach((prod, idx) => {
        const badgeLabel = idx === 0 ? 'NEW' : `${Math.round(prod.price / 1000)}k F`;
        list.push({
          id: `story-prod-${prod.id}`,
          title: prod.name.split(' ')[0] || 'Produit',
          type: 'product',
          image: prod.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=300&auto=format&fit=crop&q=80',
          badge: badgeLabel,
          badgeColor: 'bg-blue-600',
          product: prod
        });
      });
    } else {
      const fallbackItems = [
        { title: 'Sérum Glow', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80', badge: 'NEW' },
        { title: 'Coffret VIP', image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&auto=format&fit=crop&q=80', badge: 'TOP' },
        { title: 'Édition 24h', image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=300&auto=format&fit=crop&q=80', badge: '-20%' }
      ];
      fallbackItems.forEach((f, idx) => {
        list.push({
          id: `story-fallback-${idx}`,
          title: f.title,
          type: 'product',
          image: f.image,
          badge: f.badge,
          badgeColor: 'bg-blue-600',
          product: effectiveProds[0]
        });
      });
    }

    return list;
  }, [products, storiesFilter]);

  // Synchronisation viewedStoryIds lorsque la story s'ouvre
  useEffect(() => {
    if (activeStoryIndex !== null && storyRings[activeStoryIndex]) {
      const currentId = storyRings[activeStoryIndex].id;
      setViewedStoryIds(prev => prev.includes(currentId) ? prev : [...prev, currentId]);
    }
  }, [activeStoryIndex, storyRings]);

  // Timer de progression automatique de 6 secondes (6000ms) pour le lecteur plein écran
  useEffect(() => {
    if (activeStoryIndex === null || isPaused) return;

    const intervalTime = 50; // mise à jour toutes les 50ms
    const step = (intervalTime / 6000) * 100; // progression pour 6 secondes

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (activeStoryIndex < (storyRings?.length || 0) - 1) {
            setActiveStoryIndex((curr) => (curr !== null ? curr + 1 : null));
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeStoryIndex, isPaused, storyRings?.length]);

  // Handlers principaux
  const handleOpenTunnel = useCallback((product: StoreProductItem) => {
    playValidationBeep();
    setSelectedFunnelProduct(product);
    if (onOpenFunnel) {
      onOpenFunnel(product);
    } else {
      triggerOpenFunnel(product);
    }
  }, [onOpenFunnel]);

  const handleLogoClick = useCallback(() => {
    playTapBeep();
    if (onResetToHome) {
      onResetToHome();
    }
  }, [onResetToHome]);

  const handleExecuteSearch = useCallback((queryToSearch: string) => {
    playTapBeep();
    setIsMobileSearchOpen(false);
    if (onSearch) {
      onSearch(queryToSearch);
    }
  }, [onSearch]);

  const handleStoryRingClick = useCallback((index: number) => {
    playTapBeep();
    setActiveStoryIndex(index);
    setProgress(0);
    setIsPaused(false);
  }, []);

  const handleCloseStory = useCallback(() => {
    playTapBeep();
    setActiveStoryIndex(null);
    setProgress(0);
    setIsPaused(false);
  }, []);

  const handlePrevStory = useCallback(() => {
    playTapBeep();
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [activeStoryIndex]);

  const handleNextStory = useCallback(() => {
    playTapBeep();
    if (activeStoryIndex !== null && activeStoryIndex < (storyRings?.length || 0) - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setProgress(0);
    } else {
      handleCloseStory();
    }
  }, [activeStoryIndex, storyRings?.length, handleCloseStory]);

  const getSmartShortDescription = useCallback((product?: StoreProductItem, maxLength: number = 110) => {
    if (!product) return 'Découvrez cette offre exceptionnelle disponible en quantité limitée aujourd\'hui.';
    const desc = product.description || product.category || 'Qualité garantie et livraison express partout en Côte d\'Ivoire.';
    if (desc.length <= maxLength) return desc;
    return desc.slice(0, maxLength).trim() + '...';
  }, []);

  const currentStory = activeStoryIndex !== null ? storyRings[activeStoryIndex] : null;
  const currentProduct = currentStory?.product || products[0];

  // Affichage effectif du rail de stories
  const showStoriesRail = !isScrolled || isRailManuallyExpanded;

  return (
    <header className={`w-full bg-white select-none z-40 relative ${className}`}>
      
      {/* ========================================================================= */}
      {/* ÉTAGE 1 : LA BARRE D'IDENTITÉ & CONVERSION DIRECTE (STICKY AU SCROLL) */}
      {/* ========================================================================= */}
      <div className={`bg-white border-b border-blue-100 px-4 lg:px-8 py-3 flex items-center justify-between gap-3 sm:gap-4 sticky top-0 z-40 transition-all ${
        isScrolled ? 'shadow-sm bg-white/95 backdrop-blur-md py-2.5' : ''
      }`}>
        
        {/* A. GAUCHE : IDENTITÉ & STATUT VENDEUR VÉRIFIÉ */}
        <div 
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
          title="Accueil boutique"
        >
          {/* Avatar / Logo rond du vendeur avec anneau Bleu Royal + point vert pulsant */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-[2px] ring-2 ring-blue-600 bg-white flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.storeName || 'Boutique'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                  {(config.storeName || 'N').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Petit point vert pulsant (En Ligne) */}
            <span 
              className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-sm" 
              title="Vendeur en ligne"
            />
          </div>

          {/* Nom de la boutique & Badge Bleu/Blanc ✔ Boutique Certifiée */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-1">
                {config.storeName || 'Boutique Officielle'}
              </h1>
            </div>

            <div className="flex items-center gap-1 mt-0.5">
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full leading-none">
                <CheckCircle2 className="w-3 h-3 fill-blue-600 text-white" />
                <span>Certifiée</span>
              </span>
            </div>
          </div>
        </div>

        {/* B. CENTRE (DESKTOP) : BARRE DE RECHERCHE PILULE RAPIDE OU BOUTON REVOIR STORIES AU SCROLL */}
        <div className="hidden md:flex flex-1 max-w-md mx-4 items-center justify-center">
          {isScrolled ? (
            /* Bouton Rapide au Scroll : 📱 Revoir les Stories Offres (X) */
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsRailManuallyExpanded(!isRailManuallyExpanded);
              }}
              className="animate-in fade-in zoom-in-95 duration-150 py-1.5 px-4 rounded-full bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-200 hover:border-blue-400 text-blue-700 text-xs font-black shadow-xs flex items-center gap-2 transition cursor-pointer active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>📱 {isRailManuallyExpanded ? 'Replier le Rail Stories' : `Revoir les Stories Offres (${storyRings.length})`}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isRailManuallyExpanded ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <div className="w-full rounded-full bg-slate-50 border border-blue-100 hover:border-blue-300 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/10 px-4 py-2 flex items-center gap-2.5 transition-all shadow-inner">
              <Search className="w-4 h-4 text-blue-600 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteSearch(searchQuery);
                }}
                placeholder="Rechercher parmi les offres du moment..."
                className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* C. DROITE : BOUTONS RAPIDES WHATSAPP & PANIER */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Bouton Mobile : Revoir Stories au Scroll */}
          {isScrolled && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsRailManuallyExpanded(!isRailManuallyExpanded);
              }}
              className="md:hidden p-2 rounded-full bg-blue-50 text-blue-600 border border-blue-200 transition"
              title="Stories"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          )}

          {/* Bouton Loupe Mobile (< 768px) */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsMobileSearchOpen(!isMobileSearchOpen);
            }}
            className="md:hidden p-2 rounded-full text-slate-700 hover:text-blue-600 hover:bg-blue-50/60 transition cursor-pointer"
            title="Rechercher"
          >
            <Search className="w-5 h-5 text-blue-600" />
          </button>

          {/* Bouton Pilule 💬 WhatsApp Direct */}
          <a
            href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent("Bonjour, j'ai vu vos stories et je souhaite passer commande.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 sm:px-3.5 py-2 rounded-full shadow-sm hover:shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Discuter directement sur WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>

          {/* Bouton Panier en Bleu Royal 🛒 ({cartCount}) */}
          <button
            type="button"
            onClick={() => {
              if (products[0]) handleOpenTunnel(products[0]);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-3.5 py-2 rounded-full shadow-sm shadow-blue-600/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Voir mon panier et commander"
          >
            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Panier ({cartCount})</span>
          </button>
        </div>

      </div>

      {/* Barre de Recherche Mobile Rétractable (< 768px) */}
      {isMobileSearchOpen && (
        <div className="md:hidden px-4 py-2.5 bg-blue-50/50 border-b border-blue-100 animate-in slide-in-from-top-2 duration-150">
          <div className="w-full rounded-full bg-white border border-blue-200 px-3.5 py-2 flex items-center gap-2 shadow-sm">
            <Search className="w-4 h-4 text-blue-600 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExecuteSearch(searchQuery);
              }}
              placeholder="Rechercher un produit..."
              className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAGE 2 : LE RAIL HORIZONTAL DES ANNEAUX DE STORIES SHOPPABLES */}
      {/* Avec gestion "Story Déjà Vue" (Argenté + Coche ✓) & Repli au Scroll */}
      {/* ========================================================================= */}
      {showStoriesRail && (
        <div 
          ref={railRef}
          className="w-full bg-gradient-to-b from-blue-50/40 via-white to-white border-b border-slate-100 py-3.5 px-4 lg:px-8 overflow-x-auto no-scrollbar scroll-smooth animate-in fade-in duration-200"
        >
          {/* Titre discret du Rail (Personnalisable dans le Studio) */}
          <div className="max-w-[1360px] mx-auto mb-2 flex items-center justify-between px-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-600" />
              {storiesRailTitle}
            </span>
            <span className="text-[10px] text-slate-400">
              {viewedStoryIds.length}/{storyRings.length} vues
            </span>
          </div>

          <div className="flex items-start justify-start sm:justify-center gap-4 sm:gap-6 lg:gap-7 max-w-[1360px] mx-auto min-w-max px-2">
            {storyRings.map((story, idx) => {
              const isViewed = viewedStoryIds.includes(story.id);

              return (
                <div
                  key={story.id}
                  onClick={() => handleStoryRingClick(idx)}
                  className="flex flex-col items-center cursor-pointer group shrink-0 transition-transform hover:scale-105 active:scale-95"
                >
                  {/* Conteneur Anneau */}
                  <div className="relative">
                    <div 
                      className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full p-[3px] transition-all relative ${
                        isViewed
                          ? 'bg-slate-200 border border-slate-300 opacity-80 group-hover:opacity-100'
                          : 'bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 shadow-md shadow-blue-600/20 group-hover:shadow-lg group-hover:shadow-blue-600/35'
                      }`}
                    >
                      {/* Image de la Story avec fin filet Blanc Pur */}
                      <img
                        src={story.image}
                        alt={story.title}
                        className="w-full h-full rounded-full object-cover border-2 border-white bg-white"
                      />

                      {/* Petite Coche ✓ sur la Story Déjà Consultée */}
                      {isViewed && (
                        <span 
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-white text-[9px] font-black flex items-center justify-center border border-white shadow-xs"
                          title="Déjà consultée"
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Mini-Badge Flottant (-30%, NEW, LIVE, AVIS...) */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
                      <span className={`${
                        isViewed 
                          ? 'bg-slate-600' 
                          : (story.badgeColor || 'bg-blue-600')
                      } text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white shadow-sm tracking-wide uppercase whitespace-nowrap`}>
                        {story.badge}
                      </span>
                    </div>
                  </div>

                  {/* Titre Court de la Story sur 1 ligne */}
                  <span className={`text-[11px] font-bold max-w-[76px] truncate mt-2 text-center transition-colors ${
                    isViewed ? 'text-slate-500' : 'text-slate-800 group-hover:text-blue-600'
                  }`}>
                    {story.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LECTEUR DE STORY PLEIN ÉCRAN SHOPPABLE (PROMPT 3B/3) */}
      {/* ========================================================================= */}
      {activeStoryIndex !== null && currentStory && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          
          {/* Cadre Format Smartphone au Centre */}
          <div 
            className="w-full max-w-[420px] h-full sm:h-[86vh] sm:rounded-3xl overflow-hidden relative bg-slate-900 shadow-2xl border border-white/15 flex flex-col justify-between animate-in zoom-in-95 duration-200 select-none"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            
            {/* ------------------------------------------------------------------- */}
            {/* A. EN-TÊTE DE LA STORY : BARRES DE PROGRESSION DE 6 SECONDES & TOPBAR */}
            {/* ------------------------------------------------------------------- */}
            <div className="relative z-30 pt-3 px-3 pb-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex flex-col gap-2.5">
              
              {/* Petites barres horizontales de progression */}
              <div className="flex items-center gap-1.5 w-full">
                {storyRings.map((_, sIdx) => {
                  let barWidth = '0%';
                  if (sIdx < activeStoryIndex) {
                    barWidth = '100%';
                  } else if (sIdx === activeStoryIndex) {
                    barWidth = `${progress}%`;
                  }
                  return (
                    <div 
                      key={sIdx} 
                      className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm"
                    >
                      <div 
                        className="h-full bg-white transition-all duration-75 ease-linear rounded-full shadow-sm"
                        style={{ width: barWidth }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Barre d'info sous les barres de progression */}
              <div className="flex items-center justify-between gap-2 text-white">
                
                {/* Logo + Nom boutique + Badge Prix */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full ring-2 ring-blue-500 overflow-hidden bg-white shrink-0">
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                        {(config.storeName || 'N').charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex flex-col">
                    <span className="text-xs font-black text-white truncate leading-tight">
                      {config.storeName || 'Boutique'}
                    </span>
                    <span className="text-[10px] text-blue-300 font-bold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                      {currentStory.title}
                    </span>
                  </div>

                  {/* Badge Prix Bleu Royal */}
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black shrink-0 shadow-sm border border-blue-400/30 ml-1">
                    {(currentProduct?.price || 15000).toLocaleString()} F
                  </span>
                </div>

                {/* Contrôles : Pause / Mute / Fermer */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPaused(!isPaused);
                    }}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer"
                    title={isPaused ? "Reprendre" : "Pause"}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer"
                    title={isMuted ? "Activer le son" : "Couper le son"}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseStory();
                    }}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer ml-1"
                    title="Fermer la story"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

              </div>

            </div>

            {/* ------------------------------------------------------------------- */}
            {/* B. CORPS VISUEL DE LA STORY (IMAGE HD / VIDÉO + ZONES CLIC GAUCHE/DROITE) */}
            {/* ------------------------------------------------------------------- */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              
              {/* Média de la Story avec léger zoom cinématique */}
              {currentStory.videoUrl ? (
                <video
                  src={currentStory.videoUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover scale-105 transition-transform duration-[6000ms]"
                />
              ) : (
                <img
                  src={currentStory.image}
                  alt={currentStory.title}
                  className="w-full h-full object-cover scale-105 transition-transform duration-[6000ms]"
                />
              )}

              {/* Zone de clic Gauche : Revenir à la story précédente */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevStory();
                }}
                className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
                title="Story précédente"
              >
                <span className="p-1.5 rounded-full bg-black/40 text-white/80 backdrop-blur-sm">
                  <ChevronLeft className="w-5 h-5" />
                </span>
              </div>

              {/* Zone de clic Droite : Passer à la story suivante */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextStory();
                }}
                className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
                title="Story suivante"
              >
                <span className="p-1.5 rounded-full bg-black/40 text-white/80 backdrop-blur-sm">
                  <ChevronRight className="w-5 h-5" />
                </span>
              </div>

              {/* Bulle Verre Dépoli : Description Courte & Badge de Stock */}
              <div className="absolute bottom-3 inset-x-4 z-20 pointer-events-none">
                <div className="bg-slate-950/75 backdrop-blur-md border border-white/20 p-3 rounded-2xl text-white shadow-xl space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      En Stock • Expédition 24h
                    </span>
                    <span className="text-[10px] text-amber-300 font-extrabold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                      4.9 (Avis vérifiés)
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {getSmartShortDescription(currentProduct, 110)}
                  </p>
                </div>
              </div>

            </div>

            {/* ------------------------------------------------------------------- */}
            {/* C. 🔥 PIED DE LA STORY : LA CARTE DE CONVERSION IMMÉDIATE NANASORE */}
            {/* ------------------------------------------------------------------- */}
            <div className="relative z-30 bg-white p-4 rounded-t-2xl sm:rounded-b-3xl shadow-2xl border-t border-slate-100 flex flex-col gap-3">
              
              {/* Miniature + Titre + Prix en Bleu Royal */}
              <div className="flex items-center gap-3">
                <img
                  src={currentStory.image}
                  alt={currentProduct?.name || currentStory.title}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-slate-900 truncate">
                    {currentProduct?.name || currentStory.title}
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base sm:text-lg font-black text-blue-600">
                      {(currentProduct?.price || 15000).toLocaleString()} FCFA
                    </span>
                    {currentProduct?.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {currentProduct.originalPrice.toLocaleString()} FCFA
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bouton Principal : ⚡ Voir Tunnel & Acheter */}
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  handleCloseStory();
                  const prod = currentProduct || products[0];
                  if (prod) handleOpenTunnel(prod);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4 fill-current text-yellow-300" />
                <span>⚡ Voir Tunnel & Acheter</span>
              </button>

              {/* 2 Boutons Secondaires : WhatsApp & Fiche Détaillée */}
              <div className="grid grid-cols-2 gap-2">
                
                {/* Bouton WhatsApp */}
                <a
                  href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Bonjour, j'ai vu votre story sur "${currentProduct?.name || currentStory.title}" à ${(currentProduct?.price || 15000).toLocaleString()} FCFA et je souhaite passer commande.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playTapBeep()}
                  className="bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>Acheter WhatsApp</span>
                </a>

                {/* Bouton Voir la Fiche Produit */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    handleCloseStory();
                    const prod = currentProduct || products[0];
                    if (prod && onSelectProduct) {
                      onSelectProduct(prod);
                    } else if (prod) {
                      handleOpenTunnel(prod);
                    }
                  }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Voir la Fiche</span>
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TIROIR TUNNEL D'ACHAT DIRECT DÉPLOYÉ EN 0MS SANS QUITTER LA PAGE */}
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

export default StoriesRingsHeader;
