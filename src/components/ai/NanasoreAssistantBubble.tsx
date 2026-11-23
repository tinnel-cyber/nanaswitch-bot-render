import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ChevronDown,
  Play,
  Sparkles,
  UserPlus,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  Bot
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

interface SarahChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  source?: string;
}

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
  customAvatarUrl = '/assets/avatar_aicha.jpg',
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
  const [sarahTab, setSarahTab] = useState<'CHAT' | 'VIDEO'>('CHAT');
  const [isTourActive, setIsTourActive] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [isPlayingFallback, setIsPlayingFallback] = useState(false);
  const [hasFinishedVideoOrTour, setHasFinishedVideoOrTour] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Chat IA intelligent d'Aïcha (propulsé par gemini-flash-lite-latest)
  const [sarahMessages, setSarahMessages] = useState<SarahChatMessage[]>([
    {
      id: 'sarah-welcome',
      sender: 'ai',
      text: isAuthenticated
        ? "Bonjour ! Je suis Aïcha, votre assistante IA Nanasore (37 modules). Comment puis-je vous aider aujourd'hui ?"
        : "Bonjour ! Je suis Aïcha, votre guide IA sur Nanasore (37 modules tout-en-un).\n\nDites-moi ce que vous souhaitez vendre ou lancer (boutique, formations, live shopping, services…) et je vous oriente tout de suite !"
    }
  ]);
  const [sarahInput, setSarahInput] = useState('');
  const [isSarahLoading, setIsSarahLoading] = useState(false);
  const sarahChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && sarahTab === 'CHAT') {
      sarahChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sarahMessages, isSarahLoading, isExpanded, sarahTab]);

  const handleSendSarahMessage = async (presetText?: string) => {
    const query = (presetText || sarahInput).trim();
    if (!query || isSarahLoading) return;

    playTapBeep();
    const userMsg: SarahChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query
    };
    const nextHistory = [...sarahMessages, userMsg];
    setSarahMessages(nextHistory);
    if (!presetText) setSarahInput('');
    setIsSarahLoading(true);

    try {
      const res = await fetch('/api/ai/growth-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          persona: 'sarah_public',
          messages: nextHistory.slice(-16).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            sender: m.sender,
            text: m.text
          })),
          merchantContext: {
            isNewUser: !isAuthenticated,
            currentView,
            storeName: 'Nanasore'
          }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) {
        setSarahMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'ai',
            text: data.reply,
            source: data.source
          }
        ]);
        playValidationBeep();
      } else {
        setSarahMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'ai',
            text: data.error || "Je suis temporairement très sollicitée. Vous pouvez déjà créer votre compte gratuitement en 2 minutes ou lancer la vidéo explicative !"
          }
        ]);
      }
    } catch {
      setSarahMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'ai',
          text: "Connexion momentanément instable. Nanasore regroupe 37 modules (Boutique, POS, Formations, Live Shopping, Paiements Mobile Money). Cliquez sur « Créer mon compte » pour démarrer gratuitement !"
        }
      ]);
    } finally {
      setIsSarahLoading(false);
    }
  };

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
            Je suis Aïcha. Cliquez pour discuter avec moi ou voir la vidéo explicative (démarrage en 1 min) !
          </div>
        )}

        {/* 2. Carte Principale Dépliée : Aïcha + Chat IA & Vidéo Présentative */}
        {isExpanded && (
          <div className="nana-card" id="nanaCard">
            {/* En-tête : Aïcha */}
            <div className="nana-header">
              <div className="nana-header-profile">
                <img 
                  src={customAvatarUrl} 
                  alt="Aïcha - Accueil Nanasore"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/avatar_aicha.jpg';
                  }}
                />
                <div>
                  <div className="nana-header-title">Aïcha • Support Nanasore</div>
                  <div className="nana-header-sub">🟢 En ligne • Guide IA (37 modules)</div>
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

            {/* Onglets Aïcha : Discuter avec Aïcha IA vs Vidéo & Guide */}
            <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-950/90 border-b border-slate-800">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setSarahTab('CHAT');
                }}
                className={`py-1.5 px-2.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                  sarahTab === 'CHAT'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discuter avec Aïcha IA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setSarahTab('VIDEO');
                }}
                className={`py-1.5 px-2.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                  sarahTab === 'VIDEO'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Vidéo &amp; Guide</span>
              </button>
            </div>

            {/* ONGLET 1 : CHAT IA INTELLIGENT D'AÏCHA (ORIENTATION NOUVEAUX CLIENTS — 37 MODULES) */}
            {sarahTab === 'CHAT' && (
              <div className="flex flex-col bg-slate-950/95">
                <div className="p-3 h-64 overflow-y-auto space-y-2.5 scrollbar-thin">
                  {sarahMessages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[88%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                            isUser
                              ? 'bg-indigo-600 text-white rounded-tr-sm'
                              : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                        {!isUser && msg.source && msg.source.includes('gemini-') && !msg.source.includes('fallback') && (
                          <span className="text-[9px] text-emerald-400/80 mt-0.5 px-1 font-semibold flex items-center gap-1">
                            <Bot className="w-2.5 h-2.5" />
                            Aïcha IA • {msg.source}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {isSarahLoading && (
                    <div className="flex items-center gap-2 text-[11px] text-indigo-300 bg-slate-900/90 border border-indigo-500/30 rounded-xl px-3 py-2 w-fit">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Aïcha réfléchit...</span>
                    </div>
                  )}
                  <div ref={sarahChatEndRef} />
                </div>

                {/* Questions rapides visiteurs */}
                <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/80 bg-slate-900/60">
                  {[
                    'Quel module pour mon activité ?',
                    'Combien ça coûte ?',
                    'Orange Money / Wave ?',
                    'Créer ma boutique'
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isSarahLoading}
                      onClick={() => handleSendSarahMessage(q)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-400 text-[10px] font-bold text-slate-200 whitespace-nowrap cursor-pointer transition disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Saisie message */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendSarahMessage();
                  }}
                  className="p-2.5 flex items-center gap-1.5 border-t border-slate-800 bg-slate-900/90"
                >
                  <input
                    type="text"
                    value={sarahInput}
                    onChange={(e) => setSarahInput(e.target.value)}
                    placeholder="Posez votre question à Aïcha..."
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSarahLoading || !sarahInput.trim()}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white cursor-pointer transition shrink-0"
                    aria-label="Envoyer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                {!isAuthenticated && (
                  <div className="px-2.5 pb-2.5 bg-slate-900/90">
                    <button
                      type="button"
                      onClick={handleAuthCtaClick}
                      className="w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-md"
                    >
                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      <span>Créer mon compte gratuit (2 min) →</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET 2 : VIDÉO PRÉSENTATIVE & VISITE GUIDÉE */}
            {sarahTab === 'VIDEO' && (
              <>
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
              </>
            )}
          </div>
        )}

        {/* 3. Bouton Avatar Flottant (Aïcha) */}
        <button 
          className="nana-avatar-btn" 
          aria-label="Ouvrir l'assistante IA Aïcha de Nanasore"
          onClick={handleToggleSarah}
        >
          <img 
            src={customAvatarUrl} 
            alt="Aïcha - Assistante IA Nanasore"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/avatar_aicha.jpg';
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
