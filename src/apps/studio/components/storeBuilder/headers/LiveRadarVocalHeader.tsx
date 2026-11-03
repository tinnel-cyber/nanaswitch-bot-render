import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  MessageCircle, 
  ShoppingBag, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Zap,
  Search,
  ExternalLink,
  ShieldCheck,
  Radio,
  Video,
  Clock,
  X,
  Share2,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../../types';
import { StoreProductItem } from '../types';
import { SlideOutFunnelDrawer } from '../../../../../components/SlideOutFunnelDrawer';
import { DigitalWideProductView } from '../DigitalWideProductView';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface LiveRadarVocalHeaderProps {
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

// Fallback image 1080x1080 SVG gradient haute définition
const DEFAULT_1080_POSTER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%231E3A8A"/>
      <stop offset="50%" stop-color="%232563EB"/>
      <stop offset="100%" stop-color="%230F172A"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(%23bgGrad)"/>
  <circle cx="540" cy="460" r="220" fill="%232563EB" opacity="0.4"/>
  <polygon points="500,380 620,460 500,540" fill="%23FFFFFF"/>
  <text x="540" y="760" font-family="system-ui, sans-serif" font-size="52" font-weight="900" fill="%23FFFFFF" text-anchor="middle">MASTERCLASS &amp; LIVE WEBINAR</text>
  <text x="540" y="830" font-family="system-ui, sans-serif" font-size="32" font-weight="700" fill="%2393C5FD" text-anchor="middle">SESSION OFFICIELLE NANASORE</text>
</svg>`;

export interface FormatFilterPill {
  id: string;
  label: string;
  categoryFilter?: string;
}

export const LiveRadarVocalHeader: React.FC<LiveRadarVocalHeaderProps> = ({
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

  // État du lecteur de note vocale du vendeur
  const [isPlayingWelcomeAudio, setIsPlayingWelcomeAudio] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(20);

  // État d'ouverture de la Carte Flottante du Radar Live (au survol / clic)
  const [isRadarOpen, setIsRadarOpen] = useState<boolean>(false);

  // État de recherche rapide
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Vue Plein Écran de la Salle Live / Produit Numérique 1080x1080
  const [isDigitalViewOpen, setIsDigitalViewOpen] = useState<boolean>(false);

  // Compte à rebours de la prochaine session / offre
  const [radarCountdown, setRadarCountdown] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 2,
    minutes: 15,
    seconds: 40
  });

  // Filtre actif de la barre de formats (Sous-Barre)
  const [activeFormatFilter, setActiveFormatFilter] = useState<string>('all');

  // Panier Local & Quantité
  const [cartCount, setCartCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_marketplace_cart');
        if (stored) {
          const items = JSON.parse(stored);
          return Array.isArray(items) ? items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) : 0;
        }
      } catch (e) {
        return 0;
      }
    }
    return 0;
  });

  // Tiroir Tunnel d'achat intégré en 0ms
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);

  // Références audio & synthèse vocale & conteneurs dropdowns
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const radarDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);

  // Nom et accroche boutique
  const storeName = useMemo(() => {
    return config.storeName || 'Nanasore Academy';
  }, [config.storeName]);

  const storeTagline = useMemo(() => {
    return config.storeTagline || 'Plateforme Officielle Certifiée';
  }, [config.storeTagline]);

  // Numéro WhatsApp vendeur nettoyé
  const cleanPhone = useMemo(() => {
    const raw = config.whatsappNumber || config.supportPhone || '+225 07 00 00 00 00';
    return raw.replace(/[^0-9]/g, '');
  }, [config.whatsappNumber, config.supportPhone]);

  // URL audio de bienvenue personnalisée
  const customAudioUrl = useMemo(() => {
    return config.headerSettings?.welcomeAudioUrl || (config as any).welcomeAudioUrl || '';
  }, [config.headerSettings, config]);

  // Message Web Speech API en français (personnalisable dans le studio ou par défaut)
  const welcomeSpeechText = useMemo(() => {
    if (config.headerSettings?.welcomeSpeechText && config.headerSettings.welcomeSpeechText.trim() !== '') {
      return config.headerSettings.welcomeSpeechText;
    }
    return `Bienvenue sur ${storeName} ! Découvrez nos meilleures offres et cliquez sur Voir le tunnel ou sur WhatsApp pour commander immédiatement.`;
  }, [config.headerSettings?.welcomeSpeechText, storeName]);

  // Détection d'un flux Live Stream actif
  const isLiveActive = useMemo(() => {
    const streamUrl = config.headerSettings?.liveStreamVideoUrl || (config as any).liveStreamVideoUrl;
    const streamActiveFlag = config.headerSettings?.isLiveActive || (config as any).isLiveActive;
    return Boolean(streamUrl || streamActiveFlag);
  }, [config.headerSettings, config]);

  // Produit vedette général
  const featuredProduct = useMemo(() => {
    return products[0] || null;
  }, [products]);

  // Produit live / formation ciblé par le Radar
  const liveProduct = useMemo(() => {
    const found = products.find(p => 
      (p.category && /live|formation|webinaire|coaching|cours/i.test(p.category)) ||
      (p.name && /live|formation|webinaire|masterclass|coaching/i.test(p.name))
    );
    return found || products[0] || null;
  }, [products]);

  // Image 1080x1080 de la formation / session live
  const liveProductImage = useMemo(() => {
    if (liveProduct?.image && liveProduct.image.trim() !== '') {
      return liveProduct.image;
    }
    return DEFAULT_1080_POSTER;
  }, [liveProduct]);

  // Construction des Pilules de Filtres par Formats & Catégories Vendeur
  const formatPills = useMemo<FormatFilterPill[]>(() => {
    const basePills: FormatFilterPill[] = [
      { id: 'all', label: '🌟 Tout le Catalogue', categoryFilter: '' },
      { id: 'formations', label: '🎓 Formations & Webinaires', categoryFilter: 'formations' },
      { id: 'lives', label: '🔴 Lives Shopping & Replays', categoryFilter: 'live' },
      { id: 'ebooks', label: '📘 E-books & Logiciels', categoryFilter: 'ebooks' }
    ];

    // Ajouter les catégories spécifiques créées par le vendeur
    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        const isAlreadyCovered = basePills.some(p => p.id.toLowerCase() === cat.toLowerCase());
        if (!isAlreadyCovered && cat.trim() !== '') {
          basePills.push({
            id: cat,
            label: `📦 ${cat}`,
            categoryFilter: cat
          });
        }
      });
    }

    return basePills;
  }, [categories]);

  // Nettoyage de la synthèse vocale au démontage
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Décompte du compte à rebours chaque seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setRadarCountdown(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 2, minutes: 15, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fermeture des dropdowns au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (radarDropdownRef.current && !radarDropdownRef.current.contains(e.target as Node)) {
        setIsRadarOpen(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Déclencheur Tunnel d'achat
  const handleOpenTunnel = useCallback((product: StoreProductItem) => {
    playTapBeep();
    if (onOpenFunnel) {
      onOpenFunnel(product);
    } else {
      setSelectedFunnelProduct(product);
    }
  }, [onOpenFunnel]);

  // Bascule Lecture / Pause de la note vocale d'accueil
  const handleToggleWelcomeAudio = useCallback(() => {
    if (isPlayingWelcomeAudio) {
      playTapBeep();
      if (audioRef.current && customAudioUrl) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingWelcomeAudio(false);
    } else {
      playValidationBeep();
      if (customAudioUrl && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play()
          .then(() => {
            setIsPlayingWelcomeAudio(true);
          })
          .catch((err) => {
            console.warn('[LiveRadarVocalHeader] Audio error, fallback Web Speech', err);
            startWebSpeech();
          });
      } else {
        startWebSpeech();
      }
    }
  }, [isPlayingWelcomeAudio, customAudioUrl, welcomeSpeechText]);

  // Moteur de synthèse vocale Web Speech API
  const startWebSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(welcomeSpeechText);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsPlayingWelcomeAudio(true);
      utterance.onend = () => setIsPlayingWelcomeAudio(false);
      utterance.onerror = () => setIsPlayingWelcomeAudio(false);

      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsPlayingWelcomeAudio(true);
    } else {
      setIsPlayingWelcomeAudio(true);
      setTimeout(() => setIsPlayingWelcomeAudio(false), 5000);
    }
  }, [welcomeSpeechText]);

  // Clic : Entrer dans la Salle Live / Webinaire
  const handleEnterLiveRoom = useCallback(() => {
    playValidationBeep();
    setIsRadarOpen(false);

    // 1. Chercher si le module omni_live_studio est présent sur la page
    const liveElement = document.getElementById('omni_live_studio') || 
                        document.querySelector('[data-section-type="omni_live_studio"]');

    if (liveElement) {
      liveElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      liveElement.classList.add('ring-4', 'ring-blue-500', 'transition-all');
      setTimeout(() => {
        liveElement.classList.remove('ring-4', 'ring-blue-500');
      }, 3000);
    } else {
      // 2. Sinon, ouvrir la vue produit numérique 1080x1080 immersive
      if (liveProduct) {
        setIsDigitalViewOpen(true);
      }
    }
  }, [liveProduct]);

  // Clic Logo
  const handleLogoClick = useCallback(() => {
    playTapBeep();
    if (onResetToHome) {
      onResetToHome();
    }
  }, [onResetToHome]);

  // Clic sur une Pilule de Format de la Sous-Barre
  const handleSelectFormat = useCallback((pill: FormatFilterPill) => {
    playTapBeep();
    setActiveFormatFilter(pill.id);
    if (onSelectCategory) {
      onSelectCategory(pill.categoryFilter || '');
    }
  }, [onSelectCategory]);

  return (
    <header className={`w-full bg-white border-b-2 border-blue-100 sticky top-0 z-40 select-none transition-all shadow-sm ${className}`}>
      
      {/* Styles keyframes pour onde sonore animée & radar ping */}
      <style>{`
        @keyframes nanasoreSoundWave {
          0%, 100% { height: 4px; }
          50% { height: 18px; }
        }
        .nanasore-wave-animated {
          animation: nanasoreSoundWave 0.75s ease-in-out infinite;
        }
        /* Masquage de barre de défilement horizontal */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Balise audio native si fichier audio configuré */}
      {customAudioUrl && (
        <audio
          ref={audioRef}
          src={customAudioUrl}
          onEnded={() => setIsPlayingWelcomeAudio(false)}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setAudioCurrentTime(audioRef.current.currentTime);
              if (audioRef.current.duration) {
                setAudioDuration(audioRef.current.duration);
              }
            }
          }}
          className="hidden"
        />
      )}

      {/* ========================================================================= */}
      {/* ÉTAGE 1 : BARRE PRINCIPALE (DESKTOP & MOBILE LIGNE 1) */}
      {/* ========================================================================= */}
      <div className="px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4 lg:gap-6">
          
          {/* IDENTITÉ DE LA BOUTIQUE / ACADÉMIE */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
            title="Retour à l'accueil"
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={storeName}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-blue-200 object-cover shadow-xs group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-600 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-md shadow-blue-600/30 border border-blue-200 group-hover:scale-105 transition-transform shrink-0">
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs sm:text-base text-slate-900 leading-tight group-hover:text-blue-600 transition-colors truncate max-w-[125px] sm:max-w-none">
                  {storeName}
                </span>
                <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                  OFFICIEL
                </span>
              </div>
              <span className="text-[9px] sm:text-[11px] text-slate-500 font-medium leading-tight mt-0.5 max-w-[130px] sm:max-w-[200px] truncate">
                {storeTagline}
              </span>
            </div>
          </div>

          {/* CENTRE SUR DESKTOP : PILULE VOCALE & RADAR LIVE (MD+) */}
          <div className="hidden md:flex items-center justify-center flex-1 gap-2 sm:gap-3 lg:justify-start lg:pl-3">
            
            {/* 🎙️ PILULE VOCALE DESKTOP */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleToggleWelcomeAudio}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleWelcomeAudio();
                }
              }}
              aria-label={isPlayingWelcomeAudio ? "Mettre en pause la note vocale" : "Écouter le mot de bienvenue du fondateur"}
              className={`bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-full p-1.5 pr-4 flex items-center gap-2.5 transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-98 select-none group shrink-0 ${
                isPlayingWelcomeAudio ? 'ring-2 ring-blue-500/30 bg-blue-100/60' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                {isPlayingWelcomeAudio ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                )}
              </div>

              <div className="flex items-center gap-1 h-5 px-1 shrink-0">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const restHeights = [6, 12, 8, 14, 6];
                  return (
                    <span
                      key={idx}
                      className={`w-0.5 rounded-full bg-blue-600 transition-all ${
                        isPlayingWelcomeAudio ? 'nanasore-wave-animated' : ''
                      }`}
                      style={{
                        height: isPlayingWelcomeAudio ? undefined : `${restHeights[idx]}px`,
                        animationDelay: `${idx * 0.15}s`,
                        animationDuration: '0.8s'
                      }}
                    />
                  );
                })}
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[11px] font-extrabold text-blue-900 leading-tight flex items-center gap-1">
                  <span>🎙️</span>
                  <span>Mot de bienvenue du vendeur</span>
                </span>
                <span className="text-[10px] text-blue-600 font-medium leading-tight">
                  {isPlayingWelcomeAudio ? 'En cours d\'écoute... (0:20)' : 'Cliquez pour écouter (0:20)'}
                </span>
              </div>
            </div>

            {/* 🔴 RADAR LIVE / WEBINAIRE DESKTOP */}
            <div 
              ref={radarDropdownRef}
              className="relative"
              onMouseEnter={() => setIsRadarOpen(true)}
              onMouseLeave={() => setIsRadarOpen(false)}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  playTapBeep();
                  setIsRadarOpen(!isRadarOpen);
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 shadow-md shadow-blue-600/20 cursor-pointer hover:scale-[1.02] active:scale-98 transition-all relative group select-none"
              >
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="absolute w-3 h-3 rounded-full bg-red-400 opacity-80 animate-ping" />
                  <span className="relative w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-xs" />
                </div>

                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black tracking-wider uppercase bg-white/20 px-1 py-0.2 rounded text-white leading-none">
                      🔴 {isLiveActive ? 'LIVE & FORMATION' : 'RADAR LIVE'}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold leading-tight mt-0.5 whitespace-nowrap text-white/95">
                    {isLiveActive ? (
                      <span className="flex items-center gap-1 text-emerald-200">
                        En direct maintenant • Rejoindre →
                      </span>
                    ) : (
                      <span>
                        ⏳ Prochaine session : {String(radarCountdown.hours).padStart(2, '0')}h {String(radarCountdown.minutes).padStart(2, '0')}m
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* APERÇU FLOTTANT AU SURVOL / CLIC : CARTE RADAR BLANC & BLEU */}
              {isRadarOpen && (
                <div className="w-[320px] sm:w-[340px] bg-white text-slate-900 border-2 border-blue-600 rounded-2xl shadow-2xl p-4 z-50 absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-blue-100">
                    <div className="flex items-center gap-1.5">
                      {isLiveActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200">
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                          EN DIRECT MAINTENANT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock className="w-3 h-3 text-blue-600" />
                          DANS {String(radarCountdown.hours).padStart(2, '0')}H {String(radarCountdown.minutes).padStart(2, '0')}M
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRadarOpen(false);
                      }}
                      className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="relative aspect-square w-full rounded-xl overflow-hidden my-3 border border-blue-200 shadow-sm group/thumb bg-slate-900">
                    <img
                      src={liveProductImage}
                      alt={liveProduct?.name || 'Session Live'}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30 flex flex-col justify-between p-3">
                      <span className="self-start px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-600 text-white shadow-xs">
                        FORMAT 1080×1080
                      </span>

                      <div className="text-left">
                        <span className="text-[10px] font-semibold text-blue-200 block uppercase tracking-wider">
                          {liveProduct?.category || 'Formation Exclusive'}
                        </span>
                        <h4 className="text-sm font-black text-white leading-tight line-clamp-2">
                          {liveProduct?.name || 'Masterclass & Webinaire Haute Conversion'}
                        </h4>
                        {liveProduct?.price ? (
                          <span className="text-xs font-black text-amber-300 mt-0.5 block">
                            {liveProduct.price.toLocaleString()} FCFA
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-300 mt-0.5 block">
                            Accès Gratuit • Inclus
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleEnterLiveRoom}
                      className="w-full bg-slate-900 hover:bg-black text-white text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                      <span>🎥 Entrer dans la Salle Live / Webinaire</span>
                    </button>

                    {liveProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRadarOpen(false);
                          handleOpenTunnel(liveProduct);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>⚡ Voir Tunnel &amp; Acheter</span>
                      </button>
                    )}

                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${storeName}, je souhaite réserver ma place pour la session : ${liveProduct?.name || 'Masterclass Live'}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        playTapBeep();
                        setIsRadarOpen(false);
                      }}
                      className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>💬 Réserver / Acheter via WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* SECTION DROITE : RECHERCHE, WHATSAPP & PANIER */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* 🔍 Bouton Loupe de recherche rapide (MD+) */}
            <div ref={searchDropdownRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsSearchOpen(!isSearchOpen);
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center cursor-pointer transition-colors"
                title="Rechercher une formation ou un produit"
              >
                <Search className="w-4 h-4" />
              </button>

              {isSearchOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border-2 border-blue-600 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-blue-600 absolute left-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (onSearch) onSearch(e.target.value);
                      }}
                      placeholder="Rechercher formation, e-book..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-blue-50/50 border border-blue-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          if (onSearch) onSearch('');
                        }}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 💬 Bouton WhatsApp / Coaching Direct */}
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${storeName}, j'aimerais avoir un coaching ou échanger directement sur vos formations.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playTapBeep()}
              className="bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Coaching et support WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-current shrink-0" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            {/* 🛒 Bouton Panier en Bleu Royal (#2563EB) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (featuredProduct) handleOpenTunnel(featuredProduct);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-600/30 transition-all active:scale-95 cursor-pointer shrink-0"
              title="Panier et commande immédiate"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">PANIER</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white text-blue-700 text-[10px] font-black">
                {cartCount}
              </span>
            </button>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* MOBILE LIGNE 2 (< 768px) : PILULE VOCALE & RADAR CÔTE À CÔTE */}
        {/* ========================================================================= */}
        <div className="md:hidden flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-blue-50">
          
          {/* 🎙️ PILULE VOCALE COMPACTE MOBILE */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleToggleWelcomeAudio}
            className={`flex-1 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-full p-1 pr-2.5 flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 select-none ${
              isPlayingWelcomeAudio ? 'ring-2 ring-blue-500/30 bg-blue-100/60' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              {isPlayingWelcomeAudio ? (
                <Pause className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current translate-x-0.5" />
              )}
            </div>

            <div className="flex items-center gap-0.5 h-4 px-0.5 shrink-0">
              {[0, 1, 2, 3, 4].map((idx) => {
                const restHeights = [5, 10, 7, 12, 5];
                return (
                  <span
                    key={idx}
                    className={`w-0.5 rounded-full bg-blue-600 transition-all ${
                      isPlayingWelcomeAudio ? 'nanasore-wave-animated' : ''
                    }`}
                    style={{
                      height: isPlayingWelcomeAudio ? undefined : `${restHeights[idx]}px`,
                      animationDelay: `${idx * 0.15}s`,
                      animationDuration: '0.8s'
                    }}
                  />
                );
              })}
            </div>

            <div className="flex flex-col text-left truncate">
              <span className="text-[10px] font-black text-blue-900 leading-none truncate">
                🎙️ {isPlayingWelcomeAudio ? 'En écoute' : 'Écouter'}
              </span>
              <span className="text-[9px] text-blue-600 font-semibold leading-none mt-0.5">
                (0:20)
              </span>
            </div>
          </div>

          {/* 🔴 RADAR LIVE COMPACT MOBILE */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              playTapBeep();
              setIsRadarOpen(!isRadarOpen);
            }}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl px-2.5 py-1.5 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-98 select-none relative"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute w-2.5 h-2.5 rounded-full bg-red-400 opacity-80 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-red-500 border border-white" />
            </div>

            <div className="flex flex-col text-left truncate">
              <span className="text-[9px] font-black tracking-wider uppercase text-white leading-none truncate">
                🔴 {isLiveActive ? 'EN DIRECT' : 'RADAR OFFRE'}
              </span>
              <span className="text-[9px] font-bold text-blue-100 leading-none mt-0.5 truncate">
                {isLiveActive ? 'Rejoindre →' : `⏳ ${String(radarCountdown.hours).padStart(2, '0')}h ${String(radarCountdown.minutes).padStart(2, '0')}m`}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* ÉTAGE 2 : SOUS-BARRE DE NAVIGATION PAR FORMATS & CATÉGORIES (FOND #F8FAFC) */}
      {/* ========================================================================= */}
      <div className="w-full bg-slate-50/90 border-t border-b border-blue-100/80 px-3 sm:px-4 lg:px-8 py-1.5 sm:py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Rail de Pilules de Formats Défilable */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1">
            {formatPills.map((pill) => {
              const isActive = activeFormatFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handleSelectFormat(pill)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30 border border-blue-600'
                      : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-blue-200/80 shadow-2xs'
                  }`}
                >
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Badge de Confiance Stratégique à Droite */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-extrabold shrink-0 shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-blue-600 fill-current" />
            <span>⚡ Accès Immédiat après paiement</span>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIROIR TUNNEL D'ACHAT DIRECT EN 0MS */}
      {/* ========================================================================= */}
      {selectedFunnelProduct && (
        <SlideOutFunnelDrawer
          funnelId={selectedFunnelProduct.linkedFunnelId || selectedFunnelProduct.id}
          isOpen={Boolean(selectedFunnelProduct)}
          onClose={() => setSelectedFunnelProduct(null)}
          renderMode="component"
        />
      )}

      {/* ========================================================================= */}
      {/* SALLE LIVE / VUE NUMÉRIQUE 1080x1080 IMMERSIVE (DIGITAL WIDE PRODUCT VIEW) */}
      {/* ========================================================================= */}
      {isDigitalViewOpen && liveProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md overflow-y-auto flex flex-col p-2 sm:p-6 animate-in fade-in">
          <div className="max-w-7xl mx-auto w-full relative">
            <button
              type="button"
              onClick={() => setIsDigitalViewOpen(false)}
              className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all cursor-pointer"
              title="Fermer la salle"
            >
              <X className="w-5 h-5" />
            </button>

            <DigitalWideProductView
              product={liveProduct}
              allProducts={products}
              categories={categories}
              storeName={storeName}
              whatsappPhone={cleanPhone}
              onBack={() => setIsDigitalViewOpen(false)}
              onSelectProduct={(p) => {
                setIsDigitalViewOpen(false);
                if (onSelectProduct) onSelectProduct(p);
              }}
              onBuyNow={(p) => {
                setIsDigitalViewOpen(false);
                handleOpenTunnel(p);
              }}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
            />
          </div>
        </div>
      )}

    </header>
  );
};

export default LiveRadarVocalHeader;
