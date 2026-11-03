import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ChevronDown,
  Play,
  Sparkles,
  UserPlus,
  ExternalLink
} from 'lucide-react';
import { getPageAssistantConfig } from '../../config/assistantStepsConfig';
import {
  getTutorials,
  getFirstPresentativeTutorial,
  formatVideoEmbedUrl,
  isDirectVideoStream,
  TutorialItem
} from '../../services/tutorialService';
import { GuidedTourBubbles } from './GuidedTourBubbles';
import { SupportQuestionModal } from './SupportQuestionModal';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

interface NanasoreAssistantBubbleProps {
  currentView: string;
  onOpenAcademy?: () => void;
  onOpenAiAdvisor?: () => void;
  onRequestAuth?: () => void;
  isAuthenticated?: boolean;
  customAvatarUrl?: string;
  className?: string;
}

const STORAGE_KEY_ONBOARDING = 'nanasore_onboarding_completed';
const STORAGE_KEY_AUTO_SHOWN = 'nanasore_assistant_autoshown_pages';

export const NanasoreAssistantBubble: React.FC<NanasoreAssistantBubbleProps> = ({
  currentView,
  onOpenAcademy,
  onOpenAiAdvisor,
  onRequestAuth,
  isAuthenticated = false,
  customAvatarUrl = '/assistant.jpg',
  className = ''
}) => {
  // Détection de la configuration correspondant à la page actuelle
  const pageConfig = useMemo(() => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    return getPageAssistantConfig(currentView, pathname);
  }, [currentView]);

  // Catalogue public des tutoriels avec la vidéo de création de compte en 1ère vidéo présentative
  const [tutorials, setTutorials] = useState<TutorialItem[]>(() => getTutorials());
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialItem>(() => getFirstPresentativeTutorial());

  // États d'ouverture & lecture instantanée
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [isPlayingFallback, setIsPlayingFallback] = useState(false);
  const [hasFinishedVideoOrTour, setHasFinishedVideoOrTour] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Préchargement silencieux du poster de Sarah et synchronisation publique des tutoriels
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const img = new Image();
    img.src = '/fondateur-nanasore.jpg';

    const handleTutorialsUpdate = () => {
      const updated = getTutorials();
      setTutorials(updated);
      setSelectedTutorial((prev) => updated.find((t) => t.id === prev.id) || getFirstPresentativeTutorial());
    };
    window.addEventListener('tutorialsUpdated', handleTutorialsUpdate);
    return () => window.removeEventListener('tutorialsUpdated', handleTutorialsUpdate);
  }, []);

  // Démarrage instantané de la lecture dès l'ouverture de Sarah (0ms, sans redirection login)
  const triggerInstantPlay = useCallback(() => {
    setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      v.play().catch(() => {
        // Fallback navigateur strict : démarrer en muet puis laisser l'utilisateur activer le son
        v.muted = true;
        v.play().catch(() => {});
      });
    }, 30);
  }, []);

  const handleOpenSarahAndPlay = useCallback(() => {
    playTapBeep();
    setShowTooltip(false);
    setVideoLoadError(false);
    // Toujours présenter la vidéo de création de compte comme 1ère vidéo présentative à l'ouverture
    const firstPresentative = getFirstPresentativeTutorial();
    setSelectedTutorial(firstPresentative);
    setIsExpanded(true);
    triggerInstantPlay();
  }, [triggerInstantPlay]);

  const handleToggleSarah = useCallback(() => {
    playTapBeep();
    setShowTooltip(false);
    setIsExpanded((prev) => {
      const next = !prev;
      if (next) {
        setVideoLoadError(false);
        setSelectedTutorial(getFirstPresentativeTutorial());
        triggerInstantPlay();
      }
      return next;
    });
  }, [triggerInstantPlay]);

  const handleAuthCtaClick = useCallback(() => {
    playValidationBeep();
    setIsExpanded(false);
    if (onRequestAuth) {
      onRequestAuth();
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({ intent: 'vendor', plan: 'free' }, '', '/register?intent=vendor&plan=free');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onRequestAuth]);

  // Mémorisation localStorage : Pages dont le guide a déjà été complété
  const getCompletedPages = (): string[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ONBOARDING);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const markPageCompleted = useCallback((pageId: string) => {
    try {
      const completed = getCompletedPages();
      if (!completed.includes(pageId)) {
        completed.push(pageId);
        localStorage.setItem(STORAGE_KEY_ONBOARDING, JSON.stringify(completed));
      }
    } catch (e) {
      console.warn('[Assistant] Erreur sauvegarde localStorage :', e);
    }
  }, []);

  // Détection première visite : affichage du tooltip d'accueil de Sarah
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const completed = getCompletedPages();
    const isCompleted = completed.includes(pageConfig.pageId);

    let autoShown: string[] = [];
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_AUTO_SHOWN);
      autoShown = raw ? JSON.parse(raw) : [];
    } catch {
      // Ignorer
    }

    if (!isCompleted && !autoShown.includes(pageConfig.pageId)) {
      setShowTooltip(true);

      try {
        autoShown.push(pageConfig.pageId);
        sessionStorage.setItem(STORAGE_KEY_AUTO_SHOWN, JSON.stringify(autoShown));
      } catch {
        // Ignorer
      }

      // Masquer automatiquement après 10s si pas d'interaction
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setShowTooltip(false);
    }
  }, [pageConfig.pageId]);

  // Actions
  const handleStartGuidedTour = () => {
    playValidationBeep();
    setIsExpanded(false);
    setShowTooltip(false);
    setIsTourActive(true);
  };

  const handleOpenAcademyDrawer = () => {
    playTapBeep();
    setIsExpanded(false);
    setShowTooltip(false);
    if (onOpenAcademy) {
      onOpenAcademy();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nana_open_academy', { detail: { tutorialId: selectedTutorial.id } }));
    }
  };

  const activeVideoUrl = selectedTutorial?.videoUrl || '/assets/videos/intro_nanasore.mp4';
  const activePosterUrl = selectedTutorial?.videoThumbnail || '/fondateur-nanasore.jpg';
  const isDirectVideo = isDirectVideoStream(activeVideoUrl);

  return (
    <>
      {/* ===== WIDGET DUO ASSISTANCE & FORMATION NANASORE ===== */}
      <div className={`nana-widget-container ${className}`}>
        {/* 1. Bulle d'accueil / Tooltip de Sarah */}
        {showTooltip && !isExpanded && (
          <div 
            className="nana-welcome-tooltip" 
            id="nanaTooltip"
            onClick={handleOpenSarahAndPlay}
          >
            <span 
              className="nana-tooltip-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              aria-label="Fermer la bulle d'aide"
            >
              ×
            </span>
            👋 <strong>Bonjour !</strong><br />
            Je suis Sarah. Cliquez pour lancer la vidéo explicative (Création de compte &amp; démarrage en 1 min) !
          </div>
        )}

        {/* 2. Carte Principale Dépliée : Sarah + Vidéo Présentative Instantanée */}
        {isExpanded && (
          <div className="nana-card" id="nanaCard">
            {/* En-tête : Sarah */}
            <div className="nana-header">
              <div className="nana-header-profile">
                <img 
                  src={customAvatarUrl} 
                  alt="Sarah - Accueil"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/avatar_nanasore.jpg';
                  }}
                />
                <div>
                  <div className="nana-header-title">Sarah • Support Nanasore</div>
                  <div className="nana-header-sub">🟢 Accès libre • Lecture instantanée</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsExpanded(false);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Réduire"
                aria-label="Réduire la fenêtre"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Bannière 1ère Vidéo Présentative : Création de compte & Onboarding */}
            <div className="nana-trainer-banner flex items-center justify-between gap-2">
              <span className="truncate">
                <span>🎬</span>{' '}
                <strong>
                  {selectedTutorial.id === 'tuto-1-gmail-signup'
                    ? '1ère Vidéo Présentative : Créer votre compte'
                    : selectedTutorial.title}
                </strong>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 font-bold">
                Accès Public
              </span>
            </div>

            {/* Lecteur Vidéo Instantané (MP4/HLS optimisé + Poster préchargé) */}
            <div className="nana-video-wrapper">
              {isDirectVideo ? (
                <video 
                  key={activeVideoUrl}
                  ref={videoRef}
                  id="nanaVideo" 
                  controls 
                  autoPlay
                  preload="auto"
                  poster={activePosterUrl}
                  playsInline
                  onEnded={() => setHasFinishedVideoOrTour(true)}
                  onError={() => setVideoLoadError(true)}
                >
                  <source src={activeVideoUrl} type="video/mp4" />
                  <source src="/assets/videos/intro_nanasore.mp4" type="video/mp4" />
                  Votre navigateur ne supporte pas la lecture vidéo HTML5.
                </video>
              ) : (
                <iframe
                  key={activeVideoUrl}
                  src={formatVideoEmbedUrl(activeVideoUrl)}
                  title={selectedTutorial.title}
                  className="w-full h-full border-0 aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}

              {/* Écran interactif élégant si la vidéo brute est en attente d'enregistrement */}
              {videoLoadError && (
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 text-center cursor-pointer select-none"
                  onClick={() => {
                    setIsPlayingFallback(!isPlayingFallback);
                    setHasFinishedVideoOrTour(true);
                  }}
                >
                  <div className="relative mb-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-950/80 transition-transform active:scale-95">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                  </div>
                  <div className="text-xs font-black text-white">
                    {selectedTutorial.title || pageConfig.videoTitle}
                  </div>
                  <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
                    1ère vidéo présentative : Créer votre compte Nanasore en 1 minute
                  </div>
                  {isPlayingFallback && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse" />
                      <span className="w-1 h-2 bg-purple-400 rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-pink-400 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sélecteur rapide des vidéos tutoriels (1ère vidéo présentative = Création de compte) */}
            <div className="px-3 pt-2.5 pb-1 bg-slate-900/90 border-b border-slate-800/80">
              <div className="flex items-center justify-between text-[10.5px] text-slate-400 mb-1.5">
                <span className="font-bold text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Vidéo présentative sélectionnée :
                </span>
                <span className="text-slate-500">{selectedTutorial.duration}</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {tutorials.slice(0, 4).map((tuto, idx) => {
                  const isActive = selectedTutorial.id === tuto.id;
                  return (
                    <button
                      key={tuto.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setVideoLoadError(false);
                        setSelectedTutorial(tuto);
                        triggerInstantPlay();
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 border ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                          : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>
                        {idx === 0 ? '1. Créer un compte (Présentation)' : `${idx + 1}. ${tuto.categoryLabel}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Corps & Actions Clés + Appel à l'action doux post-visionnage */}
            <div className="nana-body">
              {/* Appel à l'action doux (Post-visionnage ou fin de parcours) pour les visiteurs non connectés */}
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={handleAuthCtaClick}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                    hasFinishedVideoOrTour
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white border-emerald-400/50 shadow-lg shadow-emerald-950/50 animate-pulse'
                      : 'bg-slate-800/90 hover:bg-indigo-950/80 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span>Créer mon compte / Se connecter pour profiter de Nanasore</span>
                </button>
              )}

              <button 
                type="button" 
                className="nana-btn-primary"
                onClick={handleStartGuidedTour}
              >
                🎯 Lancer la visite guidée de l'écran
              </button>

              <button 
                type="button" 
                className="nana-btn-secondary"
                onClick={handleOpenAcademyDrawer}
              >
                📚 Accéder à tous les tutoriels vidéo
              </button>
            </div>
          </div>
        )}

        {/* 3. Bouton Avatar Flottant (Sarah) - Lecture instantanée au clic */}
        <button 
          className="nana-avatar-btn" 
          aria-label="Ouvrir l'assistant Nanasore et lancer la vidéo explicative de Sarah"
          onClick={handleToggleSarah}
        >
          <img 
            src={customAvatarUrl} 
            alt="Sarah - Assistante Nanasore"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/avatar_nanasore.jpg';
            }}
          />
          <span className="nana-online-dot"></span>
        </button>
      </div>

      {/* Bulles d'accompagnement pas-à-pas (Guided Tour) */}
      <GuidedTourBubbles
        isOpen={isTourActive}
        config={pageConfig}
        onClose={() => setIsTourActive(false)}
        onComplete={() => {
          setIsTourActive(false);
          setHasFinishedVideoOrTour(true);
          markPageCompleted(pageConfig.pageId);
          if (!isAuthenticated) {
            setIsExpanded(true);
          }
        }}
        avatarUrl={customAvatarUrl}
      />

      {/* Modale de support complémentaire */}
      <SupportQuestionModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        onOpenAiAdvisor={onOpenAiAdvisor}
        avatarUrl={customAvatarUrl}
      />
    </>
  );
};

export default NanasoreAssistantBubble;
