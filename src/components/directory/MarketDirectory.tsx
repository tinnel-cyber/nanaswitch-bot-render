import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NanasorePasserelleIcon } from '../common/NanasoreLogo';
import {
  Search,
  Store,
  MapPin,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Star,
  CheckCircle2,
  Tag,
  Phone,
  ArrowRight,
  Filter,
  Layers,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  ShoppingBag,
  SlidersHorizontal,
  Compass,
  Crown,
  Zap,
  Globe,
  RefreshCw,
  X,
  Mic,
  GraduationCap,
  Radio,
  Video,
  BookOpen,
  Laptop,
  ChevronDown,
  Play,
  Pause,
  Flame,
  Award,
  Eye,
  Gift,
  Package,
  Calendar,
  Sparkle,
  Sliders,
  PlusCircle
} from 'lucide-react';
import { MarketDirectoryStore } from '../../types';
import {
  DIRECTORY_CATEGORIES,
  getDirectoryStores,
  filterDirectoryStores,
  isProStore,
  DirectoryMainTab,
  subscribeToNanaMarketCards
} from '../../services/marketDirectoryService';
import { CreateMarketCardModal } from './CreateMarketCardModal';

export interface MarketDirectoryProps {
  onNavigateHome?: () => void;
  onOpenStore?: (storeId: string) => void;
  onOpenMerchantSignup?: () => void;
}

// ============================================================================
// 1. DÉFINITION DES CATÉGORIES EN BULLES CIRCULAIRES (STYLE EBAY)
// ============================================================================
interface CircleCategory {
  id: string;
  name: string;
  categoryFilter: string;
  image: string;
  badge?: string;
  badgeBg?: string;
}

const CIRCLE_CATEGORIES: CircleCategory[] = [
  {
    id: 'beaute',
    name: 'Beauté',
    categoryFilter: 'Santé, Beauté & Cosmétiques',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&auto=format&fit=crop&q=80',
    badge: 'Bio'
  },
  {
    id: 'cameras',
    name: 'Caméras',
    categoryFilter: 'Électronique & High-Tech',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'high-tech',
    name: 'High-Tech',
    categoryFilter: 'Électronique & High-Tech',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&auto=format&fit=crop&q=80',
    badge: 'Top'
  },
  {
    id: 'ecouteurs',
    name: 'Écouteurs',
    categoryFilter: 'Électronique & High-Tech',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'mode',
    name: 'Mode',
    categoryFilter: 'Mode & Prêt-à-Porter',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'maison',
    name: 'Maison & Déco',
    categoryFilter: 'Maison, Meubles & Déco',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'epicerie',
    name: 'Alimentation',
    categoryFilter: 'Alimentation & Épicerie',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'formations',
    name: 'Formations',
    categoryFilter: 'Formations & E-learning',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80',
    badge: 'Diplôme'
  },
  {
    id: 'webinaires',
    name: 'Webinaires',
    categoryFilter: 'Webinaires & Lives',
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=200&auto=format&fit=crop&q=80',
    badge: '🔴 Live'
  },
  {
    id: 'coaching',
    name: 'Coaching',
    categoryFilter: 'Coaching & Consulting',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'deals',
    name: 'Daily Deals',
    categoryFilter: 'Toutes les Catégories',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&auto=format&fit=crop&q=80',
    badge: '-25%'
  },
  {
    id: 'bijoux',
    name: 'Bijoux & Or',
    categoryFilter: 'Bijouterie & Luxe',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'auto',
    name: 'Auto & Outils',
    categoryFilter: 'Auto & Quincaillerie',
    image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=200&auto=format&fit=crop&q=80'
  }
];

// ============================================================================
// 2. SLIDES DU HERO BANNER CARROUSEL (STYLE EBAY PROMO)
// ============================================================================
interface PromoSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  targetCategory?: string;
  targetTab?: DirectoryMainTab;
  bgGradient: string;
  couponTag?: string;
  accentColor: string;
}

const HERO_PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'deal-electronics',
    badge: '⚡ OFFRE SPÉCIALE MARQUES',
    title: 'Jusqu\'à -25% sur l\'Électronique & High-Tech',
    subtitle: 'Smartphones reconditionnés certifiés, laptops pro & accessoires garantis avec livraison express.',
    ctaText: 'Explorer les offres',
    targetCategory: 'Électronique & High-Tech',
    bgGradient: 'from-blue-600 via-indigo-600 to-sky-700',
    couponTag: 'CODE : NANA25',
    accentColor: 'text-amber-300'
  },
  {
    id: 'summit-live',
    badge: '🔴 DIRECT LIVE & BILLETTERIE',
    title: 'Sommet E-Commerce Afrique 2026',
    subtitle: '5 jours de webinaires interactifs animés par les formateurs et experts leaders de l\'écosystème UEMOA.',
    ctaText: 'Réserver ma place en ligne',
    targetCategory: 'Webinaires & Lives',
    targetTab: 'DIGITAL_EVENTS',
    bgGradient: 'from-indigo-900 via-blue-900 to-slate-900',
    couponTag: 'SESSION INTERACTIVE',
    accentColor: 'text-rose-400'
  },
  {
    id: 'pro-merchant-call',
    badge: '🌟 OPPORTUNITÉ MARCHANDS & CRÉATEURS',
    title: 'Vendez vos produits ou formations sur NaNa Market',
    subtitle: 'Bénéficiez d\'une visibilité prioritaire B2C, des paiements instantanés Wave & OM et de votre boutique clé en main.',
    ctaText: 'Inscrire ma boutique gratuitement',
    bgGradient: 'from-amber-600 via-orange-600 to-rose-600',
    couponTag: 'PLAN PRO PRIORITAIRE',
    accentColor: 'text-yellow-200'
  }
];

export const MarketDirectory: React.FC<MarketDirectoryProps> = ({
  onNavigateHome,
  onOpenStore,
  onOpenMerchantSignup
}) => {
  // --------------------------------------------------------------------------
  // 1. ÉTATS DES DONNÉES & CHARGEMENT
  // --------------------------------------------------------------------------
  const [stores, setStores] = useState<MarketDirectoryStore[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCreateCardModalOpen, setIsCreateCardModalOpen] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // 2. ÉTATS DES FILTRES & RECHERCHE
  // --------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<DirectoryMainTab>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes les Catégories');
  const [selectedCity, setSelectedCity] = useState<string>('Toutes les Villes');
  const [onlyPro, setOnlyPro] = useState<boolean>(false);

  // Dépliants Mega-Menu
  const [isProductsMenuOpen, setIsProductsMenuOpen] = useState<boolean>(false);
  const [isDigitalMenuOpen, setIsDigitalMenuOpen] = useState<boolean>(false);

  // Hero Slider
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isSliderHovered, setIsSliderHovered] = useState<boolean>(false);

  // Référence pour le scroll horizontal des bulles
  const circleScrollRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // RECHERCHE VOCALE PANAFRICAINE (WEB SPEECH API NATIVE ZÉRO FRAIS)
  // --------------------------------------------------------------------------
  const isSpeechRecognitionSupported = useMemo(() => {
    return typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }, []);

  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceFeedbackPlaceholder, setVoiceFeedbackPlaceholder] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVoiceError = useCallback((customMsg?: string) => {
    setVoiceFeedbackPlaceholder(customMsg || "Désolé, je n'ai pas compris. Réessayez avec le nom du produit.");
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setVoiceFeedbackPlaceholder(null);
    }, 4500);
  }, []);

  const startVoiceSearch = useCallback(() => {
    if (!isSpeechRecognitionSupported) return;

    // Si déjà en écoute, arrêt propre
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionClass) return;

      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Adaptation aux accents d'Afrique de l'Ouest
      recognition.lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'fr-FR';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceFeedbackPlaceholder(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          setSearchQuery(transcript);
          setIsListening(false);
        } else {
          handleVoiceError();
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VOICE SEARCH] Web Speech error:', event?.error);
        setIsListening(false);
        if (event?.error === 'no-speech' || event?.error === 'audio-capture' || event?.error === 'not-allowed') {
          handleVoiceError();
        }
      };

      recognition.onnomatch = () => {
        setIsListening(false);
        handleVoiceError();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('[VOICE SEARCH] Impossible de lancer le micro:', err);
      setIsListening(false);
      handleVoiceError();
    }
  }, [isSpeechRecognitionSupported, isListening, handleVoiceError]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // --------------------------------------------------------------------------
  // 3. CHARGEMENT INITIAL DES BOUTIQUES DEPUIS FIRESTORE
  // --------------------------------------------------------------------------
  const loadStores = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getDirectoryStores();
      setStores(data);
    } catch (err) {
      console.error('[NANA-MARKET] Erreur chargement :', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStores();

    // Écoute en temps réel des publications de cartes NanaMarket (/nanamarket_cards)
    const unsubscribeSnapshot = subscribeToNanaMarketCards((realtimeCards) => {
      if (!realtimeCards || realtimeCards.length === 0) return;
      setStores(prev => {
        const map = new Map<string, MarketDirectoryStore>();
        // Insérer les cartes en temps réel en tête
        realtimeCards.forEach(c => map.set(c.id, c));
        // Conserver les boutiques existantes si pas déjà dans la map
        prev.forEach(s => {
          if (!map.has(s.id)) {
            map.set(s.id, s);
          }
        });
        return Array.from(map.values());
      });
    });

    const handleCustomCardsUpdated = (e: any) => {
      const card = e?.detail?.card;
      if (card && card.id) {
        setStores(prev => [card, ...prev.filter(s => s.id !== card.id)]);
      } else {
        loadStores(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('nanamarket_cards_updated', handleCustomCardsUpdated);
    }

    return () => {
      if (typeof unsubscribeSnapshot === 'function') unsubscribeSnapshot();
      if (typeof window !== 'undefined') {
        window.removeEventListener('nanamarket_cards_updated', handleCustomCardsUpdated);
      }
    };
  }, [loadStores]);

  // Carrousel Promo Slider Auto-Play (5.5s)
  useEffect(() => {
    if (isSliderHovered) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % HERO_PROMO_SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isSliderHovered]);

  // Liste dynamique des villes
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    stores.forEach(s => {
      if (s.city && s.city.trim() && !s.city.includes('En Ligne') && !s.city.includes('Streaming')) {
        citySet.add(s.city.trim());
      }
    });
    return ['Toutes les Villes', ...Array.from(citySet).sort()];
  }, [stores]);

  // --------------------------------------------------------------------------
  // 4. APPLICATION DU FILTRAGE & DU TRI
  // --------------------------------------------------------------------------
  const filteredStores = useMemo(() => {
    return filterDirectoryStores(stores, {
      queryText: searchQuery,
      selectedCategory,
      selectedCity,
      onlyPro,
      activeTab
    });
  }, [stores, searchQuery, selectedCategory, selectedCity, onlyPro, activeTab]);

  const proCount = useMemo(() => stores.filter(isProStore).length, [stores]);

  // --------------------------------------------------------------------------
  // 5. NAVIGATION & ACTIONS
  // --------------------------------------------------------------------------
  const handleVisitStore = (store: MarketDirectoryStore) => {
    if (store.shopUrl && typeof window !== 'undefined') {
      const targetUrl = store.shopUrl.startsWith('http') ? store.shopUrl : `https://${store.shopUrl}`;
      window.open(targetUrl, '_blank');
      return;
    }
    if (store.customDomain && typeof window !== 'undefined') {
      window.open(`https://${store.customDomain}`, '_blank');
      return;
    }
    if (onOpenStore) {
      onOpenStore(store.slug || store.storeId || store.id);
      return;
    }
    if (typeof window !== 'undefined') {
      const targetPath = store.slug ? `/shop/${store.slug}` : `/shop/${store.storeId || store.id}`;
      window.location.href = targetPath;
    }
  };

  const handleContactWhatsApp = (e: React.MouseEvent, store: MarketDirectoryStore) => {
    e.stopPropagation();
    const phone = (store.whatsappPhone || store.phone || '').replace(/[^0-9]/g, '');
    if (!phone) return;
    const isDigital = store.merchantType === 'digital_creator';
    const isEvent = store.merchantType === 'event_host';
    const contextTerm = isEvent ? 'votre webinaire / live' : isDigital ? 'vos formations' : 'vos produits';
    const msg = encodeURIComponent(`Bonjour *${store.storeName}*, je vous ai découvert sur la marketplace *NaNa Market* et souhaite des informations sur ${contextTerm} !`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  // Scroll horizontal des bulles
  const scrollCircles = (direction: 'left' | 'right') => {
    if (!circleScrollRef.current) return;
    const offset = direction === 'left' ? -260 : 260;
    circleScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Clic sur une bulle circulaire
  const handleSelectCircleCategory = (catFilter: string) => {
    if (selectedCategory === catFilter) {
      setSelectedCategory('Toutes les Catégories');
    } else {
      setSelectedCategory(catFilter);
    }
    // Si c'est un format digital
    if (catFilter === 'Webinaires & Lives' || catFilter === 'Formations & E-learning' || catFilter === 'Coaching & Consulting') {
      setActiveTab('DIGITAL_EVENTS');
    } else if (catFilter !== 'Toutes les Catégories') {
      setActiveTab('PHYSICAL');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* ==================================================================== */}
      {/* EN-TÊTE ÉPURÉ DE LA MARKETPLACE (STYLE EBAY / AMAZON)                */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                title="Retour à l'accueil"
              >
                <Compass className="w-5 h-5" />
              </button>
            )}

            {/* Logo Officiel Nanasore Market */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigateHome ? onNavigateHome() : null}>
              <NanasorePasserelleIcon pixelSize={38} />
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-slate-900">Nana<span className="text-sky-600">sore</span></span>
                  <span className="text-xl font-black text-blue-600">Market</span>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    Plateforme Unifiée
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions rapides droite */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs">
            <span className="hidden lg:inline-flex items-center gap-1 text-gray-500 font-medium">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Wave & Orange Money acceptés</span>
            </span>

            {/* Bouton Publier ma carte NanaMarket (1-Click Instant Publish) */}
            <button
              type="button"
              onClick={() => setIsCreateCardModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 sm:px-3.5 py-2 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
              title="Publier gratuitement une carte sur NanaMarket"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Publier ma carte</span>
              <span className="xs:hidden sm:hidden">Publier</span>
            </button>

            <button
              type="button"
              onClick={() => loadStores(true)}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              title="Rafraîchir la marketplace"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {onOpenMerchantSignup ? (
              <button
                type="button"
                onClick={onOpenMerchantSignup}
                className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition items-center gap-1.5 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Vendre sur NaNa</span>
              </button>
            ) : (
              <a
                href="/signup"
                className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition items-center gap-1.5 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Vendre sur NaNa</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 1. LA NAVIGATION PAR BULLES (INFINITE CIRCLE CATEGORIES)              */}
      {/* ==================================================================== */}
      <section className="bg-white border-b border-gray-100 relative group/carousel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          {/* Bouton défilement gauche */}
          <button
            type="button"
            onClick={() => scrollCircles('left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 border border-gray-300 shadow-md text-gray-700 hover:text-blue-600 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all cursor-pointer"
            aria-label="Catégories précédentes"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Conteneur défilant des cercles */}
          <div
            ref={circleScrollRef}
            className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-3.5 px-2 select-none"
          >
            {CIRCLE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.categoryFilter;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCircleCategory(cat.categoryFilter)}
                  className="flex flex-col items-center gap-1.5 group shrink-0 cursor-pointer focus:outline-none"
                >
                  <div className="relative">
                    {/* Bulle circulaire parfaite avec photo réelle */}
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden p-0.5 transition-all duration-200 group-hover:scale-105 shadow-xs ${
                      isSelected
                        ? 'ring-3 ring-blue-600 ring-offset-2 border-blue-600'
                        : 'border border-gray-200 hover:border-blue-400 bg-white'
                    }`}>
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover rounded-full"
                        loading="lazy"
                      />
                    </div>

                    {/* Badge optionnel (Live, -25%, Bio...) */}
                    {cat.badge && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-tight bg-rose-600 text-white shadow-xs">
                        {cat.badge}
                      </span>
                    )}
                  </div>

                  {/* Nom de la catégorie sous la bulle */}
                  <span className={`text-[11px] sm:text-xs font-medium text-center truncate max-w-[76px] transition-colors ${
                    isSelected ? 'text-blue-600 font-bold' : 'text-gray-700 group-hover:text-blue-600'
                  }`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bouton défilement droite */}
          <button
            type="button"
            onClick={() => scrollCircles('right')}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 border border-gray-300 shadow-md text-gray-700 hover:text-blue-600 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all cursor-pointer"
            aria-label="Catégories suivantes"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. LA "MASTER SEARCH BAR" (BARRE DE RECHERCHE CENTRALE STYLE EBAY)   */}
      {/* ==================================================================== */}
      <section className="bg-white pt-4 pb-2 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className={`w-full rounded-full bg-white border-2 transition-all duration-200 flex items-center shadow-xs p-1 sm:p-1.5 ${
            isListening
              ? 'border-rose-500 ring-4 ring-rose-100'
              : voiceFeedbackPlaceholder
              ? 'border-amber-500 ring-4 ring-amber-100'
              : 'border-gray-300 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'
          }`}>
            {/* Icône de recherche */}
            <div className="pl-3 sm:pl-4 text-gray-400 shrink-0">
              <Search className={`w-5 h-5 transition-colors ${isListening ? 'text-rose-500' : 'text-gray-400'}`} />
            </div>

            {/* Champ de saisie XXL */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (voiceFeedbackPlaceholder) setVoiceFeedbackPlaceholder(null);
              }}
              placeholder={
                voiceFeedbackPlaceholder
                  ? voiceFeedbackPlaceholder
                  : isListening
                  ? "Écoute en cours..."
                  : "Rechercher des produits, boutiques, formations, webinaires (ex: iPhone, Robe, Live, E-book)..."
              }
              className={`flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-gray-900 focus:outline-none transition-colors ${
                voiceFeedbackPlaceholder
                  ? 'placeholder:text-amber-600 font-medium'
                  : isListening
                  ? 'placeholder:text-rose-600 font-semibold animate-pulse'
                  : 'placeholder:text-gray-400'
              }`}
            />

            {/* Bouton d'effacement X */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setVoiceFeedbackPlaceholder(null);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mr-1 cursor-pointer"
                title="Effacer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Micro Panafricain */}
            {isSpeechRecognitionSupported && (
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`p-2 rounded-full transition-all mr-1 sm:mr-2 flex items-center justify-center cursor-pointer ${
                  isListening
                    ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-400 shadow-sm animate-pulse'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
                }`}
                title={isListening ? "Écoute en cours... Cliquez pour arrêter" : "Recherche vocale (Panafricaine - Parlez naturellement)"}
                aria-label="Recherche vocale"
              >
                <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce text-rose-600' : ''}`} />
              </button>
            )}

            {/* Séparateur vertical */}
            <div className="h-6 w-[1px] bg-gray-200 hidden md:block mx-1" />

            {/* Sélecteur de catégorie/ville intégré style eBay */}
            <div className="hidden md:flex items-center pr-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs text-gray-600 font-medium px-2 py-1.5 focus:outline-none cursor-pointer max-w-[170px] truncate"
              >
                {DIRECTORY_CATEGORIES.map(c => (
                  <option key={c} value={c} className="text-gray-900">{c}</option>
                ))}
              </select>
            </div>

            {/* Gros Bouton d'action "Rechercher" Bleu Vif */}
            <button
              type="button"
              onClick={() => {}}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
            >
              <Search className="w-4 h-4 hidden sm:inline" />
              <span>Rechercher</span>
            </button>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. LE MEGA-MENU HORIZONTAL & LES DÉPLIANTS (SIDEBARS/DROPDOWNS)     */}
      {/* ==================================================================== */}
      <section className="bg-white border-b border-gray-200/80 relative z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 text-xs py-2 select-none">
            {/* Extrémité GAUCHE : Dépliant "Explorer les Produits" */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsProductsMenuOpen(!isProductsMenuOpen);
                  setIsDigitalMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isProductsMenuOpen
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                <span>Explorer les Produits</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isProductsMenuOpen ? 'rotate-180 text-blue-600' : 'text-gray-400'}`} />
              </button>

              {/* Dépliant Méga-Menu Produits Physiques */}
              <AnimatePresence>
                {isProductsMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-[340px] sm:w-[540px] bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 z-50 grid grid-cols-1 sm:grid-cols-2 gap-5"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-black text-gray-900 pb-2 border-b border-gray-100">
                        <ShoppingBag className="w-4 h-4 text-blue-600" />
                        <span>Rayons Phares & Boutiques</span>
                      </div>
                      <ul className="mt-2.5 space-y-2 text-xs text-gray-600">
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Électronique & High-Tech');
                              setActiveTab('PHYSICAL');
                              setIsProductsMenuOpen(false);
                            }}
                            className="hover:text-blue-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>📱 Smartphones, PC & Gaming</span>
                            <span className="text-[10px] text-gray-400 font-mono">Tech</span>
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Mode & Prêt-à-Porter');
                              setActiveTab('PHYSICAL');
                              setIsProductsMenuOpen(false);
                            }}
                            className="hover:text-blue-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>👗 Mode Africaine, Dan Fani & Robes</span>
                            <span className="text-[10px] text-gray-400 font-mono">Mode</span>
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Santé, Beauté & Cosmétiques');
                              setActiveTab('PHYSICAL');
                              setIsProductsMenuOpen(false);
                            }}
                            className="hover:text-blue-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>🌿 Cosmétiques Bio & Beurre de Karité</span>
                            <span className="text-[10px] text-gray-400 font-mono">Soin</span>
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Alimentation & Épicerie');
                              setActiveTab('PHYSICAL');
                              setIsProductsMenuOpen(false);
                            }}
                            className="hover:text-blue-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>🍲 Épicerie Fine & Produits du Terroir</span>
                            <span className="text-[10px] text-gray-400 font-mono">Frais</span>
                          </button>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs font-black text-gray-900 pb-2 border-b border-gray-100">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Maison, Luxe & Bricolage</span>
                      </div>
                      <ul className="mt-2.5 space-y-2 text-xs text-gray-600">
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Maison, Meubles & Déco');
                              setActiveTab('PHYSICAL');
                              setIsProductsMenuOpen(false);
                            }}
                            className="hover:text-blue-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>🛋️ Meubles en Bois Noble & Déco</span>
                            <span className="text-[10px] text-gray-400 font-mono">Maison</span>
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Bijouterie & Luxe');
                              setActiveTab('PHYSICAL');
                              setIsProductsMenuOpen(false);
                            }}
                            className="hover:text-blue-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>💍 Bijoux Or 18k, Argent & Parures</span>
                            <span className="text-[10px] text-gray-400 font-mono">Luxe</span>
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Auto & Quincaillerie');
                              setActiveTab('PHYSICAL');
                              setIsProductsMenuOpen(false);
                            }}
                            className="hover:text-blue-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>🔧 Pièces Auto, Outillage & Quincaillerie</span>
                            <span className="text-[10px] text-gray-400 font-mono">Pro</span>
                          </button>
                        </li>
                      </ul>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('PHYSICAL');
                            setSelectedCategory('Toutes les Catégories');
                            setIsProductsMenuOpen(false);
                          }}
                          className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <span>Voir toutes les boutiques physiques</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Au CENTRE : Liens rapides texte brut (style eBay) */}
            <div className="hidden md:flex items-center gap-4 overflow-x-auto scrollbar-none text-gray-600">
              <button
                type="button"
                onClick={() => {
                  setOnlyPro(false);
                  setActiveTab('ALL');
                  setSelectedCategory('Toutes les Catégories');
                }}
                className={`hover:text-blue-600 transition-colors whitespace-nowrap ${
                  selectedCategory === 'Toutes les Catégories' && !onlyPro && activeTab === 'ALL'
                    ? 'text-blue-600 font-bold'
                    : ''
                }`}
              >
                Tous les Articles
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Électronique & High-Tech');
                  setActiveTab('PHYSICAL');
                }}
                className="hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                High-Tech
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Mode & Prêt-à-Porter');
                  setActiveTab('PHYSICAL');
                }}
                className="hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Mode & Luxe
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Santé, Beauté & Cosmétiques');
                  setActiveTab('PHYSICAL');
                }}
                className="hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Santé & Beauté
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Alimentation & Épicerie');
                  setActiveTab('PHYSICAL');
                }}
                className="hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Épicerie
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Maison, Meubles & Déco');
                  setActiveTab('PHYSICAL');
                }}
                className="hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Maison
              </button>
              <button
                type="button"
                onClick={() => setOnlyPro(!onlyPro)}
                className={`flex items-center gap-1 font-bold transition-colors whitespace-nowrap ${
                  onlyPro ? 'text-amber-600' : 'text-gray-700 hover:text-amber-600'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Membres Pro 🌟</span>
              </button>
            </div>

            {/* Extrémité DROITE : Dépliant "Formations & Événements" */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDigitalMenuOpen(!isDigitalMenuOpen);
                  setIsProductsMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDigitalMenuOpen
                    ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                    : 'text-gray-800 hover:text-purple-600 hover:bg-gray-50'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                <span>Formations & Événements</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDigitalMenuOpen ? 'rotate-180 text-purple-600' : 'text-gray-400'}`} />
              </button>

              {/* Dépliant Méga-Menu Univers Digital */}
              <AnimatePresence>
                {isDigitalMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-[340px] sm:w-[500px] bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 z-50 grid grid-cols-1 sm:grid-cols-2 gap-5"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-black text-gray-900 pb-2 border-b border-gray-100">
                        <Radio className="w-4 h-4 text-rose-600" />
                        <span>Lives & Événements en Direct</span>
                      </div>
                      <ul className="mt-2.5 space-y-2 text-xs text-gray-600">
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Webinaires & Lives');
                              setActiveTab('DIGITAL_EVENTS');
                              setIsDigitalMenuOpen(false);
                            }}
                            className="hover:text-purple-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>🔴 Webinaires & Sommets en Direct</span>
                            <span className="text-[10px] text-rose-600 font-semibold">Live HD</span>
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('billetterie');
                              setActiveTab('DIGITAL_EVENTS');
                              setIsDigitalMenuOpen(false);
                            }}
                            className="hover:text-purple-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>🎟️ Billetterie & Réservations de Places</span>
                            <span className="text-[10px] text-gray-400 font-mono">Accès</span>
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Coaching & Consulting');
                              setActiveTab('DIGITAL_EVENTS');
                              setIsDigitalMenuOpen(false);
                            }}
                            className="hover:text-purple-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>🤝 Sessions de Coaching 1-sur-1</span>
                            <span className="text-[10px] text-gray-400 font-mono">Visio</span>
                          </button>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs font-black text-gray-900 pb-2 border-b border-gray-100">
                        <GraduationCap className="w-4 h-4 text-purple-600" />
                        <span>E-Learning & Ressources</span>
                      </div>
                      <ul className="mt-2.5 space-y-2 text-xs text-gray-600">
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('Formations & E-learning');
                              setActiveTab('DIGITAL_EVENTS');
                              setIsDigitalMenuOpen(false);
                            }}
                            className="hover:text-purple-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>🎓 Formations E-commerce & Fintech</span>
                            <span className="text-[10px] text-emerald-600 font-semibold">Certifié</span>
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('ebook');
                              setActiveTab('DIGITAL_EVENTS');
                              setIsDigitalMenuOpen(false);
                            }}
                            className="hover:text-purple-600 flex items-center justify-between w-full text-left py-0.5"
                          >
                            <span>📘 E-books & Guides PDF Téléchargeables</span>
                            <span className="text-[10px] text-gray-400 font-mono">PDF</span>
                          </button>
                        </li>
                      </ul>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('DIGITAL_EVENTS');
                            setSelectedCategory('Toutes les Catégories');
                            setIsDigitalMenuOpen(false);
                          }}
                          className="text-purple-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <span>Explorer l'univers digital</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. LE HERO BANNER SLIDER (CARROUSEL D'ANNONCES STYLE EBAY)           */}
      {/* ==================================================================== */}
      <section
        className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-4 w-full"
        onMouseEnter={() => setIsSliderHovered(true)}
        onMouseLeave={() => setIsSliderHovered(false)}
      >
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md">
          {/* Slide actif avec animation fluide */}
          <div className="relative min-h-[220px] sm:min-h-[260px] md:min-h-[280px] flex items-center">
            {HERO_PROMO_SLIDES.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              if (!isActive) return null;

              return (
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.35 }}
                  className={`w-full h-full bg-gradient-to-r ${slide.bgGradient} p-6 sm:p-10 md:p-12 text-white flex flex-col justify-between`}
                >
                  <div className="max-w-2xl space-y-2.5">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-white border border-white/10">
                      <span>{slide.badge}</span>
                      {slide.couponTag && (
                        <span className={`font-mono font-bold ${slide.accentColor}`}>
                          • {slide.couponTag}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
                      {slide.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-100/90 leading-relaxed max-w-xl">
                      {slide.subtitle}
                    </p>
                  </div>

                  {/* Bouton d'action du Slide */}
                  <div className="pt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (slide.targetCategory) setSelectedCategory(slide.targetCategory);
                        if (slide.targetTab) setActiveTab(slide.targetTab);
                        if (slide.id === 'pro-merchant-call' && onOpenMerchantSignup) {
                          onOpenMerchantSignup();
                        }
                      }}
                      className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg transition-all flex items-center gap-2 cursor-pointer group"
                    >
                      <span>{slide.ctaText}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Contrôles du Carrousel (Flèches & Dots) */}
          <button
            type="button"
            onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + HERO_PROMO_SLIDES.length) % HERO_PROMO_SLIDES.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
            aria-label="Slide précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % HERO_PROMO_SLIDES.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
            aria-label="Slide suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots de pagination */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-20">
            {HERO_PROMO_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSlideIndex(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === currentSlideIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Aller au slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. LA GRILLE DE CARTES (VITRINES / UNIVERS DE LA MARKETPLACE)       */}
      {/* ==================================================================== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {/* Barre d'état des résultats & filtres rapides */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
              {selectedCategory === 'Toutes les Catégories' ? 'Vitrines & Univers Recommandés' : selectedCategory}
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              ({filteredStores.length} résultat{filteredStores.length > 1 ? 's' : ''})
            </span>
          </div>

          {/* Filtres secondaires : Onglets physiques vs digitaux & Pro */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Filtre Ville */}
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
              >
                {availableCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Toggle Pro Uniquement */}
            <button
              type="button"
              onClick={() => setOnlyPro(!onlyPro)}
              className={`px-3 py-1.5 rounded-lg border font-bold transition flex items-center gap-1 cursor-pointer ${
                onlyPro
                  ? 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sponsorisés Pro ({proCount})</span>
            </button>

            {/* Bouton Créer / Publier ma carte */}
            <button
              type="button"
              onClick={() => setIsCreateCardModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="Ajouter une fiche ou carte d'entreprise"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Publier</span>
            </button>
          </div>
        </div>

        {/* CONTENU DE LA GRILLE */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto animate-pulse shadow-sm">
              <Store className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-700">
              Chargement des boutiques et univers NaNa Market...
            </p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gray-50 text-gray-400 border border-gray-200 flex items-center justify-center mx-auto shadow-sm">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">Aucune boutique ne correspond à votre recherche</h3>
              <p className="text-xs text-gray-500 mt-1">
                Essayez un autre mot-clé, sélectionnez une autre catégorie ou publiez votre propre carte sur NanaMarket.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Toutes les Catégories');
                  setSelectedCity('Toutes les Villes');
                  setOnlyPro(false);
                  setActiveTab('ALL');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Réinitialiser les critères
              </button>
              <button
                type="button"
                onClick={() => setIsCreateCardModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Publier une carte</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 pt-4 sm:pt-6">
            {filteredStores.map((store) => {
              const isPro = isProStore(store);
              const type = store.merchantType || 'physical_store';
              const isDigital = type === 'digital_creator';
              const isEvent = type === 'event_host';

              // Badges visuels dynamiques
              const tagList = (store.searchTags || []).map(t => t.toLowerCase());
              const visualBadges: { label: string; bg: string; text: string }[] = [];

              if (isEvent || tagList.some(t => t.includes('live') || t.includes('direct') || t.includes('streaming'))) {
                visualBadges.push({ label: '🔴 Live', bg: 'bg-rose-50', text: 'text-rose-700' });
              }
              if (isDigital || tagList.some(t => t.includes('video') || t.includes('cours') || t.includes('formation'))) {
                visualBadges.push({ label: '🎥 Vidéo', bg: 'bg-purple-50', text: 'text-purple-700' });
              }
              if (tagList.some(t => t.includes('ebook') || t.includes('livre') || t.includes('pdf') || t.includes('guide'))) {
                visualBadges.push({ label: '📘 E-book', bg: 'bg-blue-50', text: 'text-blue-700' });
              }
              if (tagList.some(t => t.includes('certificat') || t.includes('diplome') || t.includes('certif'))) {
                visualBadges.push({ label: '🎓 Certifié', bg: 'bg-emerald-50', text: 'text-emerald-700' });
              }

              // Bouton d'action adapté au profil
              let ctaText = 'Visiter';
              let CtaIcon = ShoppingBag;
              if (isDigital) {
                ctaText = 'Formations';
                CtaIcon = GraduationCap;
              } else if (isEvent) {
                ctaText = 'Réserver';
                CtaIcon = Radio;
              }

              // Localisation adaptée
              let locationText = store.city || 'UEMOA';
              if (store.quarter) locationText += ` • ${store.quarter}`;
              let LocationIcon = MapPin;

              if (isDigital) {
                locationText = store.quarter ? `En ligne • ${store.quarter}` : 'En ligne';
                LocationIcon = Globe;
              } else if (isEvent) {
                locationText = store.quarter ? `Direct Live • ${store.quarter}` : 'Live Stream';
                LocationIcon = Radio;
              }

              return (
                <motion.article
                  key={store.id || store.storeId}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`relative rounded-xl sm:rounded-2xl bg-white border transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md flex flex-col group hover:-translate-y-0.5 ${
                    isPro
                      ? 'border-amber-300 ring-1 ring-amber-200/60'
                      : 'border-gray-200/90 hover:border-blue-200'
                  }`}
                >
                  {/* Bannière de la carte */}
                  <div className="relative h-20 sm:h-28 md:h-32 w-full bg-gray-100 overflow-hidden shrink-0">
                    {store.bannerImage ? (
                      <img
                        src={store.bannerImage}
                        alt={store.storeName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-gray-100 via-blue-50 to-indigo-50" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

                    {/* Badge Pro Sponsorisé en haut à droite */}
                    <div className="absolute top-1.5 sm:top-2.5 right-1.5 sm:right-2.5 z-10 flex items-center gap-1">
                      {isPro ? (
                        <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-xs flex items-center gap-0.5 sm:gap-1">
                          <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-slate-950" />
                          <span className="hidden xs:inline">Pro</span>
                        </span>
                      ) : (
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[7.5px] sm:text-[9.5px] font-bold bg-white/95 text-gray-700 shadow-2xs backdrop-blur-md">
                          Vérifié
                        </span>
                      )}
                    </div>

                    {/* Localisation Pill en haut à gauche */}
                    <div className="absolute top-1.5 sm:top-2.5 left-1.5 sm:left-2.5 z-10">
                      <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold bg-white/95 text-gray-800 shadow-2xs backdrop-blur-md flex items-center gap-1">
                        <LocationIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 shrink-0" />
                        <span className="truncate max-w-[70px] sm:max-w-[120px]">{locationText}</span>
                      </span>
                    </div>

                    {/* Badges spéciaux (Live, Vidéo, E-book) en bas de bannière */}
                    {visualBadges.length > 0 && (
                      <div className="absolute bottom-1 sm:bottom-2 right-1.5 sm:right-2.5 z-10 flex items-center gap-1">
                        {visualBadges.slice(0, 1).map((b, i) => (
                          <span
                            key={i}
                            className={`px-1.5 sm:px-2 py-0.2 rounded-full text-[7.5px] sm:text-[9px] font-bold ${b.bg} ${b.text} border border-gray-200/60 shadow-2xs`}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Corps de la Carte (Compact & Ultra lisible pour mobile 2-3 par ligne) */}
                  <div className="p-2 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3 bg-white">
                    <div className="space-y-1.5 sm:space-y-2">
                      {/* Logo + En-tête */}
                      <div className="flex items-start gap-2 sm:gap-2.5 -mt-5 sm:-mt-7 relative z-20">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-white border-2 border-gray-100 shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                          {store.logoUrl || store.avatarUrl ? (
                            <img
                              src={store.logoUrl || store.avatarUrl}
                              alt={store.storeName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : isDigital ? (
                            <div className="w-full h-full bg-purple-50 flex items-center justify-center">
                              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                            </div>
                          ) : isEvent ? (
                            <div className="w-full h-full bg-rose-50 flex items-center justify-center">
                              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            </div>
                          )}
                        </div>

                        <div className="pt-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate tracking-tight">
                              {store.storeName}
                            </h4>
                            {isPro && (
                              <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" title="Officiel" />
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[11px] text-gray-500 mt-0.5">
                            <span className="font-semibold text-blue-600 truncate">
                              {store.category}
                            </span>
                            {store.rating && (
                              <span className="hidden xs:flex items-center gap-0.5 text-amber-500 font-bold shrink-0">
                                <Star className="w-2.5 h-2.5 fill-amber-400" />
                                <span>{store.rating}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description courte */}
                      {store.description && (
                        <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-1 sm:line-clamp-2 leading-tight sm:leading-relaxed">
                          {store.description}
                        </p>
                      )}

                      {/* Mots-clés de recherche (searchTags - visibles sur écran moyen+) */}
                      {store.searchTags && store.searchTags.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1 flex-wrap pt-0.5">
                          {store.searchTags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded bg-gray-50 border border-gray-200/80 text-[9px] text-gray-600"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Boutons d'Action */}
                    <div className="pt-2 sm:pt-2.5 border-t border-gray-100 flex items-center gap-1 sm:gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleVisitStore(store)}
                        className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer truncate"
                      >
                        <CtaIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span className="truncate">{ctaText}</span>
                        <ArrowRight className="w-3 h-3 shrink-0 hidden xs:inline" />
                      </button>

                      {/* Lien WhatsApp */}
                      {store.whatsappPhone && (
                        <button
                          type="button"
                          onClick={(e) => handleContactWhatsApp(e, store)}
                          className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 hover:text-emerald-800 transition cursor-pointer shadow-2xs shrink-0"
                          title="WhatsApp"
                        >
                          <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}

                      {/* Lien WaMeet direct si configuré */}
                      {((store as any).wameetUrl || (store as any).wameetHandle) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const raw = (store as any).wameetUrl || (store as any).wameetHandle;
                            const url = raw.startsWith('http') ? raw : `https://wameet.net/${raw.replace('@', '')}`;
                            window.open(url, '_blank');
                          }}
                          className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 transition cursor-pointer shadow-2xs shrink-0"
                          title="Profil WaMeet"
                        >
                          <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Publication de Carte NanaMarket (1-Click Instant Publish) */}
      <CreateMarketCardModal
        isOpen={isCreateCardModalOpen}
        onClose={() => setIsCreateCardModalOpen(false)}
        onCardPublished={(newCard) => {
          setStores(prev => [newCard, ...prev.filter(s => s.id !== newCard.id)]);
        }}
      />

      {/* ==================================================================== */}
      {/* PIED DE PAGE DISCRET DU CENTRE COMMERCIAL                           */}
      {/* ==================================================================== */}
      <footer className="mt-auto border-t border-gray-200 bg-gray-50 py-8 px-4 text-center text-xs text-gray-500 space-y-1.5">
        <div className="flex items-center justify-center gap-2 text-gray-700 font-bold mb-1">
          <NanasorePasserelleIcon pixelSize={24} />
          <span className="text-slate-900 font-black">Nana<span className="text-sky-600">sore</span> Market</span>
        </div>
        <p>Paiements sécurisés par Wave, Orange Money, MTN MoMo et Cartes Bancaires.</p>
        <p className="text-[11px] text-gray-400">
          © {new Date().getFullYear()} Nanasore. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
};

export default MarketDirectory;
