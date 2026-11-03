import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Sparkles, 
  Compass, 
  ArrowRight
} from 'lucide-react';
import { TourStep, PageAssistantConfig } from '../../config/assistantStepsConfig';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';

interface GuidedTourBubblesProps {
  isOpen: boolean;
  config: PageAssistantConfig;
  onClose: () => void;
  onComplete: () => void;
  avatarUrl?: string;
}

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const GuidedTourBubbles: React.FC<GuidedTourBubblesProps> = ({
  isOpen,
  config,
  onClose,
  onComplete,
  avatarUrl = '/assets/avatar_nanasore.jpg'
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const [isElementVisible, setIsElementVisible] = useState(false);
  const currentStep = config.steps[currentStepIndex] || null;

  // Calcul et mise à jour de la position de l'élément cible
  const updateTargetRect = useCallback(() => {
    if (!currentStep || !currentStep.targetSelector) {
      setTargetRect(null);
      setIsElementVisible(false);
      return;
    }

    try {
      const selectors = currentStep.targetSelector.split(',').map((s) => s.trim());
      let element: HTMLElement | null = null;

      for (const sel of selectors) {
        const found = document.querySelector<HTMLElement>(sel);
        if (found && found.offsetParent !== null) {
          element = found;
          break;
        }
      }

      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right
        });
        setIsElementVisible(true);

        // Faire défiler doucement l'écran vers l'élément si nécessaire
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      } else {
        setTargetRect(null);
        setIsElementVisible(false);
      }
    } catch (e) {
      console.warn('[GuidedTour] Erreur sélecteur DOM :', e);
      setTargetRect(null);
      setIsElementVisible(false);
    }
  }, [currentStep]);

  // Synchronisation lors du changement d'étape et d'affichage
  useEffect(() => {
    if (isOpen) {
      updateTargetRect();
      const timer = setTimeout(updateTargetRect, 250); // Temps pour animations de vue
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStepIndex, updateTargetRect]);

  // Écoute des redimensionnements et défilements pour maintenir la surbrillance
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      requestAnimationFrame(updateTargetRect);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updateTargetRect]);

  // Réinitialisation de l'étape à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen, config.pageId]);

  if (!isOpen || !currentStep) return null;

  const totalSteps = config.steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      playValidationBeep();
      onComplete();
    } else {
      playTapBeep();
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      playTapBeep();
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    playCancelSound();
    onClose();
  };

  // Calcul du positionnement dynamique de la bulle d'explication
  const getBubbleStyle = (): React.CSSProperties => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    
    // Si aucun élément cible détecté ou sur mobile étroit : centrage sécurisé
    if (!targetRect || !isElementVisible || isMobile) {
      return {
        position: 'fixed',
        bottom: isMobile ? '80px' : 'auto',
        top: isMobile ? 'auto' : '50%',
        left: '50%',
        transform: isMobile ? 'translateX(-50%)' : 'translate(-50%, -50%)',
        width: 'calc(100vw - 32px)',
        maxWidth: '460px',
        zIndex: 100002
      };
    }

    const margin = 16;
    const bubbleEstimatedHeight = 220;
    const fitsBelow = targetRect.bottom + bubbleEstimatedHeight + margin < window.innerHeight;
    const fitsAbove = targetRect.top - bubbleEstimatedHeight - margin > 0;

    let top: number;
    if (currentStep.placement === 'top' && fitsAbove) {
      top = targetRect.top - bubbleEstimatedHeight - margin;
    } else if (fitsBelow) {
      top = targetRect.bottom + margin;
    } else if (fitsAbove) {
      top = targetRect.top - bubbleEstimatedHeight - margin;
    } else {
      top = Math.max(margin, (window.innerHeight - bubbleEstimatedHeight) / 2);
    }

    let left = targetRect.left + (targetRect.width / 2) - 200;
    // Empêcher le débordement hors de l'écran à gauche ou à droite
    left = Math.max(16, Math.min(window.innerWidth - 420, left));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: '400px',
      maxWidth: 'calc(100vw - 32px)',
      zIndex: 100002
    };
  };

  return (
    <div className="fixed inset-0 z-[100000] pointer-events-auto">
      {/* 1. Voile d'assombrissement global (Backdrop Spotlight) */}
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-[1.5px] transition-opacity duration-300"
        onClick={handleSkip}
      />

      {/* 2. Cadre lumineux de surbrillance (Spotlight Frame) */}
      {targetRect && isElementVisible && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out z-[100001] rounded-2xl ring-4 ring-indigo-400 shadow-[0_0_35px_rgba(99,102,241,0.65)] bg-indigo-500/10"
          style={{
            top: `${Math.max(0, targetRect.top - 8)}px`,
            left: `${Math.max(0, targetRect.left - 8)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`
          }}
        >
          {/* Petits repères visuels d'angles cyber */}
          <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-300" />
          <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-300" />
          <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-300" />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-300" />
        </div>
      )}

      {/* 3. Bulle explicative flottante */}
      <div
        style={getBubbleStyle()}
        className="bg-slate-900/95 border-2 border-indigo-500/80 rounded-3xl shadow-2xl shadow-indigo-950/90 text-slate-100 overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200"
      >
        {/* En-tête de la bulle : Progression & Badge */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-black text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-600/40">
              Étape {currentStepIndex + 1} sur {totalSteps}
            </span>
            {currentStep.badge && (
              <span className="text-[10px] font-black text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-500/40 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>{currentStep.badge}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Passer le guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps de la bulle avec Avatar miniature & Explication */}
        <div className="p-4 sm:p-5 flex items-start gap-3.5">
          {/* Miniature Avatar */}
          <div className="relative shrink-0 mt-0.5">
            <img
              src={avatarUrl}
              alt="Avatar Guide"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover border-2 border-indigo-400 shadow-md shadow-indigo-900/40"
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
          </div>

          {/* Textes : Titre + Description */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight mb-1.5 flex items-center gap-1.5">
              <span>{currentStep.title}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Barre de progression discrète */}
        <div className="w-full h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Pied de la bulle : Boutons d'action */}
        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {/* Bouton Passer */}
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition px-2 py-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer"
          >
            Passer
          </button>

          {/* Navigation Précédent / Suivant / Terminer */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs flex items-center gap-1 border border-slate-700 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`px-4 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer ${
                isLastStep
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 border border-emerald-400/40'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/60 border border-indigo-400/40'
              }`}
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Terminer</span>
                </>
              ) : (
                <>
                  <span>Suivant</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
