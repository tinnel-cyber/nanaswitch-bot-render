import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  GraduationCap, 
  CheckCircle2, 
  Circle, 
  Play, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  Layers, 
  Video, 
  Tv, 
  Check, 
  Award,
  BookOpen,
  HelpCircle,
  Minimize2,
  Maximize2,
  UserPlus
} from 'lucide-react';
import { 
  TutorialItem, 
  TutorialCategory, 
  TUTORIAL_CATEGORIES, 
  getTutorials, 
  getCompletedTutorialIds, 
  toggleTutorialCompleted, 
  getCompletionProgress,
  formatVideoEmbedUrl,
  getContextualTutorial,
  getFirstPresentativeTutorial,
  isDirectVideoStream
} from '../../../services/tutorialService';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { CertificatePreviewModal } from './lms/CertificatePreviewModal';

interface NanaAcademyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentContextView?: string;
  onLaunchMiniPlayer: (tutorial: TutorialItem) => void;
  activeMiniTutorialId?: string | null;
  initialTutorialId?: string | null;
  isAuthenticated?: boolean;
  onRequestAuth?: () => void;
}

export const NanaAcademyDrawer: React.FC<NanaAcademyDrawerProps> = ({
  isOpen,
  onClose,
  currentContextView = 'POS',
  onLaunchMiniPlayer,
  activeMiniTutorialId,
  initialTutorialId,
  isAuthenticated = false,
  onRequestAuth
}) => {
  const [tutorials, setTutorials] = useState<TutorialItem[]>(() => getTutorials());
  const [completedIds, setCompletedIds] = useState<string[]>(() => getCompletedTutorialIds());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TutorialCategory | 'ALL'>('ALL');
  const [expandedTutorialId, setExpandedTutorialId] = useState<string | null>(initialTutorialId || 'tuto-1-gmail-signup');
  const [viewingVideoModal, setViewingVideoModal] = useState<TutorialItem | null>(null);
  const [hasModalVideoEnded, setHasModalVideoEnded] = useState(false);
  const [isCertificatePreviewOpen, setIsCertificatePreviewOpen] = useState(false);

  const firstPresentativeTutorial = useMemo(() => getFirstPresentativeTutorial(), [tutorials]);

  // Synchronisation avec initialTutorialId
  useEffect(() => {
    if (initialTutorialId) {
      setExpandedTutorialId(initialTutorialId);
      const found = tutorials.find(t => t.id === initialTutorialId);
      if (found) {
        setViewingVideoModal(found);
      }
    }
  }, [initialTutorialId, tutorials]);

  // Écouteur global pour ouverture ciblée sur un tutoriel spécifique
  useEffect(() => {
    const handleTargetTutorial = (e: any) => {
      const targetId = e?.detail?.tutorialId;
      if (targetId) {
        setExpandedTutorialId(targetId);
        const found = tutorials.find(t => t.id === targetId);
        if (found) {
          setViewingVideoModal(found);
        }
      }
    };
    window.addEventListener('nana_open_academy', handleTargetTutorial);
    return () => window.removeEventListener('nana_open_academy', handleTargetTutorial);
  }, [tutorials]);

  // Synchronisation avec les mises à jour globales (Admin RTDB & Progression)
  useEffect(() => {
    const handleTutorialsUpdate = () => {
      setTutorials(getTutorials());
    };
    const handleProgressUpdate = () => {
      setCompletedIds(getCompletedTutorialIds());
    };

    window.addEventListener('tutorialsUpdated', handleTutorialsUpdate);
    window.addEventListener('tutorialProgressUpdated', handleProgressUpdate);

    return () => {
      window.removeEventListener('tutorialsUpdated', handleTutorialsUpdate);
      window.removeEventListener('tutorialProgressUpdated', handleProgressUpdate);
    };
  }, []);

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (viewingVideoModal) {
          setViewingVideoModal(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewingVideoModal, onClose]);

  // Tutoriel recommandé contextuellement selon la vue active (pour un visiteur non connecté, la 1ère vidéo présentative est toujours la création de compte)
  const contextualTutorial = useMemo(() => {
    if (!isAuthenticated) {
      return firstPresentativeTutorial;
    }
    return getContextualTutorial(currentContextView);
  }, [currentContextView, tutorials, isAuthenticated, firstPresentativeTutorial]);

  // Filtrage des tutoriels
  const filteredTutorials = useMemo(() => {
    return tutorials.filter((tuto) => {
      const matchCategory = selectedCategory === 'ALL' || tuto.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchTitle = tuto.title.toLowerCase().includes(q);
      const matchDesc = tuto.description.toLowerCase().includes(q);
      const matchSteps = tuto.steps.some(step => step.toLowerCase().includes(q));
      const matchCatLabel = tuto.categoryLabel.toLowerCase().includes(q);

      return matchTitle || matchDesc || matchSteps || matchCatLabel;
    });
  }, [tutorials, selectedCategory, searchQuery]);

  // Progression globale
  const progress = useMemo(() => {
    const total = tutorials.length;
    const completed = completedIds.filter(id => tutorials.some(t => t.id === id)).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }, [tutorials, completedIds]);

  const handleToggleComplete = (tutorialId: string) => {
    const res = toggleTutorialCompleted(tutorialId);
    if (res.isCompleted) {
      playValidationBeep();
    } else {
      playTapBeep();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99990] flex justify-end animate-in fade-in duration-200">
      {/* Arrière-plan semi-transparent */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panneau tiroir latéral (Slide-over) */}
      <div className="relative w-full max-w-2xl h-full bg-slate-900 border-l border-slate-700/80 shadow-2xl flex flex-col z-10 overflow-hidden text-slate-100">
        
        {/* HEADER DU TIROIR */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-500/30 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  NaNa Académie
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Micro-Learning
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Formations pas à pas pour booster vos ventes et maîtriser chaque outil
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            title="Fermer le centre de tutoriels"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRE DE PROGRESSION & CHECKLIST GLOBALE */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-800/60 border-b border-slate-700/50">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Award className="w-4 h-4 text-amber-400" />
              Progression de votre formation :
            </span>
            <span className="text-indigo-300 font-bold">
              {progress.completed} / {progress.total} complétés ({progress.percent}%)
            </span>
          </div>

          {/* Jauge animée */}
          <div className="w-full h-2.5 bg-slate-700/80 rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          {progress.percent === 100 && (
            <p className="text-[11px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
              🎉 Félicitations ! Vous avez validé l’ensemble des tutoriels NaNa Académie !
            </p>
          )}

          {/* Bouton Tester / Prévisualiser le Certificat Officiel */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsCertificatePreviewOpen(true);
            }}
            className="mt-2.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-600/20 to-indigo-600/20 hover:from-amber-500/30 hover:to-indigo-600/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Tester / Prévisualiser le Certificat Officiel (QR Code &amp; PDF)</span>
          </button>
        </div>

        {/* RECHERCHE INSTANTANÉE */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un tutoriel : paiement, produit, live, IA, docusign..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-9 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ONGLETS CATÉGORIES (HORIZONTAL SCROLL) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setSelectedCategory('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Tous ({tutorials.length})
            </button>

            {TUTORIAL_CATEGORIES.map((cat) => {
              const count = tutorials.filter(t => t.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CORPS PRINCIPAL DÉFILANT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* BANDEAU RECOMMANDATION CONTEXTUELLE INTELIGENTE */}
          {contextualTutorial && selectedCategory === 'ALL' && !searchQuery && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-slate-900 border-2 border-indigo-500/50 p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Aide contextuelle immédiate pour votre vue active ({currentContextView})
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">
                    {contextualTutorial.title}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {contextualTutorial.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-indigo-300">
                      <Clock className="w-3 h-3" /> {contextualTutorial.duration}
                    </span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-medium text-[10px]">
                      {contextualTutorial.categoryLabel}
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setViewingVideoModal(contextualTutorial);
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Regarder
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      onLaunchMiniPlayer(contextualTutorial);
                      onClose();
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-indigo-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Ouvrir dans le mini-lecteur flottant pour manipuler en même temps"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    Mini-lecteur
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LISTE DES TUTORIELS */}
          {filteredTutorials.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <HelpCircle className="w-10 h-10 mx-auto text-slate-500 stroke-[1.5]" />
              <p className="text-sm font-semibold">Aucun tutoriel trouvé pour cette recherche.</p>
              <p className="text-xs text-slate-500">Essayez un autre mot-clé ou réinitialisez le filtre de catégorie.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTutorials.map((tuto) => {
                const isCompleted = completedIds.includes(tuto.id);
                const isExpanded = expandedTutorialId === tuto.id;
                const isPlayingInMini = activeMiniTutorialId === tuto.id;

                return (
                  <div
                    key={tuto.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isCompleted 
                        ? 'bg-slate-900/60 border-emerald-500/30' 
                        : isExpanded
                          ? 'bg-slate-800/90 border-indigo-500/60 shadow-lg'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Carte Entête cliquable pour déplier */}
                    <div className="p-3.5 sm:p-4 flex items-start gap-3">
                      {/* Checkbox "Vu" */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(tuto.id);
                        }}
                        className="mt-0.5 p-1 rounded-lg text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                        title={isCompleted ? "Marqué comme vu (cliquer pour décocher)" : "Marquer comme vu"}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                        )}
                      </button>

                      {/* Infos principales */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          playTapBeep();
                          setExpandedTutorialId(isExpanded ? null : tuto.id);
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                            {tuto.categoryLabel}
                          </span>
                          <span className="text-[10.5px] text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {tuto.duration}
                          </span>
                          <span className="text-[10.5px] px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 text-[10px]">
                            {tuto.level}
                          </span>
                          {isPlayingInMini && (
                            <span className="text-[10px] font-bold text-amber-400 animate-pulse flex items-center gap-1">
                              <Tv className="w-3 h-3" /> En cours dans le mini-lecteur
                            </span>
                          )}
                        </div>

                        <h4 className={`text-sm font-bold leading-snug transition ${
                          isCompleted ? 'text-slate-300 line-through decoration-emerald-500/50' : 'text-white'
                        }`}>
                          {tuto.title}
                        </h4>

                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {tuto.description}
                        </p>
                      </div>

                      {/* Bouton déplier/replier */}
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setExpandedTutorialId(isExpanded ? null : tuto.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* DÉTAIL DÉPLIÉ : 3 ÉTAPES CLÉS + ACTIONS VIDÉO */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-700/50 bg-slate-900/50 animate-in fade-in duration-150 space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {tuto.description}
                        </p>

                        {/* Guide 3 étapes clés */}
                        <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                            Guide express en 3 étapes clés :
                          </span>

                          <div className="space-y-1.5">
                            {tuto.steps.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="leading-snug">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Boutons d'action pour la vidéo */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              setViewingVideoModal(tuto);
                            }}
                            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Regarder la vidéo
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              onLaunchMiniPlayer(tuto);
                              onClose();
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-indigo-500/30 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                            title="Ouvrir dans un mini-lecteur flottant pour manipuler en direct"
                          >
                            <Tv className="w-3.5 h-3.5" />
                            Détacher en Mini-lecteur (PiP)
                          </button>

                          {tuto.externalActionUrl && (
                            <a
                              href={tuto.externalActionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition cursor-pointer active:scale-95 animate-pulse"
                              title="Ouvrir le lien direct"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{tuto.externalActionLabel || 'Lien direct'}</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleComplete(tuto.id)}
                            className={`px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer ml-auto ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isCompleted ? 'Validé ✅' : 'Marquer comme validé'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PIED DE PAGE TIROIR + APPEL À L'ACTION DOUX VISITEUR */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-500 flex flex-col gap-2 px-4">
          {!isAuthenticated && onRequestAuth && (
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                onClose();
                onRequestAuth();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-indigo-600/90 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 border border-emerald-400/40 shadow-md transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Créer mon compte / Se connecter pour profiter de Nanasore</span>
            </button>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              NaNa Académie • Assistance 24/7
            </span>
            <span className="text-[11px] text-slate-400">
              Micro-vidéos courtes &amp; interactives
            </span>
          </div>
        </div>
      </div>

      {/* MODAL LECTEUR VIDÉO COMPLET */}
      {viewingVideoModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-indigo-500/50 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header Modal */}
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="w-5 h-5 text-indigo-400 shrink-0" />
                <h3 className="text-sm font-bold text-white truncate">
                  {viewingVideoModal.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onLaunchMiniPlayer(viewingVideoModal);
                    setViewingVideoModal(null);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Détacher dans un mini-lecteur flottant"
                >
                  <Tv className="w-3.5 h-3.5" />
                  Mini-lecteur
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setViewingVideoModal(null);
                    setHasModalVideoEnded(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lecteur Vidéo (Flux direct MP4/HLS ou Iframe) */}
            <div className="relative aspect-video w-full bg-black">
              {viewingVideoModal.videoUrl && isDirectVideoStream(viewingVideoModal.videoUrl) ? (
                <video
                  key={viewingVideoModal.videoUrl}
                  controls
                  autoPlay
                  preload="auto"
                  playsInline
                  poster={viewingVideoModal.videoThumbnail || '/fondateur-nanasore.jpg'}
                  className="w-full h-full object-cover"
                  onEnded={() => setHasModalVideoEnded(true)}
                >
                  <source src={viewingVideoModal.videoUrl} type="video/mp4" />
                  <source src="/assets/videos/intro_nanasore.mp4" type="video/mp4" />
                  Votre navigateur ne supporte pas la lecture vidéo HTML5.
                </video>
              ) : viewingVideoModal.videoUrl ? (
                <iframe
                  src={formatVideoEmbedUrl(viewingVideoModal.videoUrl)}
                  title={viewingVideoModal.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Video className="w-10 h-10 mb-2 opacity-40" />
                  <span>Vidéo en cours d’intégration</span>
                </div>
              )}
            </div>

            {/* Infos et Étapes sous la vidéo + Appel à l'action doux post-visionnage */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-purple-300">{viewingVideoModal.categoryLabel}</span>
                    <span>•</span>
                    <span>{viewingVideoModal.duration}</span>
                    <span>•</span>
                    <span>Niveau {viewingVideoModal.level}</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {viewingVideoModal.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {viewingVideoModal.externalActionUrl && (
                    <a
                      href={viewingVideoModal.externalActionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/40 transition cursor-pointer active:scale-95 animate-pulse"
                      title="Ouvrir le lien direct"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{viewingVideoModal.externalActionLabel || 'Lien direct'}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleComplete(viewingVideoModal.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer ${
                      completedIds.includes(viewingVideoModal.id)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {completedIds.includes(viewingVideoModal.id) ? 'Tutoriel validé ✅' : 'Marquer comme vu'}
                  </button>
                </div>
              </div>

              {/* Appel à l'action doux post-visionnage pour visiteur non connecté */}
              {!isAuthenticated && onRequestAuth && (
                <button
                  type="button"
                  onClick={() => {
                    playValidationBeep();
                    setViewingVideoModal(null);
                    onClose();
                    onRequestAuth();
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                    hasModalVideoEnded
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white border-emerald-400/50 shadow-lg shadow-emerald-950/50 animate-pulse'
                      : 'bg-slate-800/90 hover:bg-indigo-950 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>Créer mon compte / Se connecter pour profiter de Nanasore</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale de Test & Prévisualisation du Certificat Officiel */}
      <CertificatePreviewModal
        isOpen={isCertificatePreviewOpen}
        onClose={() => setIsCertificatePreviewOpen(false)}
      />
    </div>
  );
};

export default NanaAcademyDrawer;
