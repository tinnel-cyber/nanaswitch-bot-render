import React, { useEffect, useState, useRef } from 'react';
import { Store, Flame, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { playCancelSound, playTapBeep } from '../../../../utils/audio';

export interface PhygitalScarcityAlertProps {
  /** Nom du produit vendu en magasin physique */
  productName?: string;
  /** Emplacement ou nom de la boutique physique (ex: "Boutique Ouagadougou") */
  location?: string;
  /** Alias rétrocompatible pour location */
  storeName?: string;
  /** Nombre d'exemplaires restants en stock physique/online */
  remainingStock?: number;
  /** Afficher ou masquer l'alerte */
  isOpen?: boolean;
  /** Durée d'affichage en millisecondes avant disparition en fondu (par défaut: 5000ms = 5s) */
  durationMs?: number;
  /** Alias rétrocompatible pour durationMs */
  autoDismissMs?: number;
  /** Callback lors de la fermeture automatique ou manuelle */
  onClose?: () => void;
  /** Alias rétrocompatible pour onClose */
  onDismiss?: () => void;
  /** Émettre un signal sonore d'alerte à l'apparition */
  enableSound?: boolean;
  className?: string;
}

/**
 * COMPOSANT PhygitalScarcityAlert (L'Alerte Phygitale — Le Choc Visuel)
 * 
 * Directives UI/UX au millimètre :
 * - Position : absolute top-4 left-1/2 transform -translate-x-1/2 z-50 (en surimpression sur la vidéo du Live)
 * - Animation : Entrée avec effet de "Drop & Shake" pour capter instantanément l'œil
 * - Design System :
 *   - Fond : Verre dépoli rouge profond (bg-red-600/90 backdrop-blur-md)
 *   - Bordure : Lueur rouge néon (shadow-[0_0_20px_rgba(220,38,38,0.8)] border border-red-400)
 *   - Typographie : Texte blanc pur, gras et très lisible
 * - Contenu dynamique :
 *   - Ligne 1 : "⚠️ Alerte Magasin : 1 {productName} vendu en caisse physique !"
 *   - Ligne 2 : "🔥 Plus que {remainingStock} en stock !" (ou "❌ RUPTURE DE STOCK DÉFINITIVE" si stock <= 0)
 * - Disparition : S'affiche pendant 5 secondes puis disparaît en fondu
 */
export const PhygitalScarcityAlert: React.FC<PhygitalScarcityAlertProps> = ({
  productName = 'Coffret Prestige Karité Royal',
  location,
  storeName,
  remainingStock = 2,
  isOpen = true,
  durationMs,
  autoDismissMs,
  onClose,
  onDismiss,
  enableSound = true,
  className = ''
}) => {
  const effectiveLocation = location || storeName || 'Boutique Ouagadougou';
  const effectiveDuration = durationMs ?? autoDismissMs ?? 5000; // 5 secondes strictes

  const [isVisible, setIsVisible] = useState(isOpen);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(100);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
      if (onDismiss) onDismiss();
    }, 400);
  };

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsFadingOut(false);
      setProgress(100);

      // Son d'impact d'urgence subtil
      if (enableSound) {
        try {
          playCancelSound();
        } catch {}
      }

      // Nettoyage des timers précédents
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);

      if (effectiveDuration > 0) {
        // Barre de décompte visuelle
        const intervalMs = 50;
        const totalSteps = effectiveDuration / intervalMs;
        const stepDecrement = 100 / totalSteps;

        progressTimerRef.current = setInterval(() => {
          setProgress((prev) => Math.max(0, prev - stepDecrement));
        }, intervalMs);

        // Début du fondu de sortie 500ms avant la fin
        fadeTimerRef.current = setTimeout(() => {
          setIsFadingOut(true);
        }, Math.max(0, effectiveDuration - 500));

        // Disparition totale au bout des 5 secondes
        timerRef.current = setTimeout(() => {
          setIsVisible(false);
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          if (onClose) onClose();
          if (onDismiss) onDismiss();
        }, effectiveDuration);
      }
    } else {
      setIsVisible(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isOpen, effectiveDuration, enableSound]);

  if (!isVisible) return null;

  const isOutOfStock = remainingStock <= 0;

  return (
    <>
      {/* Styles d'animation Drop & Shake haute performance */}
      <style>{`
        @keyframes dropAndShake {
          0% {
            transform: translate(-50%, -120%) scale(0.92);
            opacity: 0;
          }
          45% {
            transform: translate(-50%, 4px) scale(1.04);
            opacity: 1;
          }
          60% {
            transform: translate(calc(-50% - 6px), 0) rotate(-1deg);
          }
          75% {
            transform: translate(calc(-50% + 6px), 0) rotate(1deg);
          }
          88% {
            transform: translate(calc(-50% - 2px), 0) rotate(-0.5deg);
          }
          100% {
            transform: translate(-50%, 0) rotate(0deg);
            opacity: 1;
          }
        }
        .animate-drop-shake {
          animation: dropAndShake 0.65s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          will-change: transform, opacity;
        }
      `}</style>

      {/* =====================================================================
          CONTENEUR POSITIONNÉ EN HAUT DE LA VIDÉO
          top-4 left-1/2 transform -translate-x-1/2 z-50
         ===================================================================== */}
      <div
        role="alert"
        aria-live="assertive"
        className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-[94%] sm:w-auto sm:min-w-[380px] max-w-md select-none pointer-events-auto transition-all duration-500 ${
          isFadingOut
            ? 'opacity-0 -translate-y-3 pointer-events-none'
            : 'animate-drop-shake'
        } ${className}`}
      >
        {/* ===================================================================
            DESIGN SYSTEM (URGENCE PREMIUM)
            - Fond : Verre dépoli rouge profond (bg-red-600/90 backdrop-blur-md)
            - Bordure : Lueur rouge néon (shadow-[0_0_20px_rgba(220,38,38,0.8)] border border-red-400)
            - Typographie : Texte blanc pur, gras et très lisible
           =================================================================== */}
        <div className="relative rounded-2xl bg-red-600/90 backdrop-blur-md border border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.8)] text-white overflow-hidden p-3 sm:p-3.5 ring-1 ring-red-300/40">
          {/* Lueur rouge néon dynamique */}
          <div className="absolute -inset-1 bg-gradient-to-r from-red-500/30 via-rose-400/40 to-red-600/30 blur-sm rounded-2xl pointer-events-none animate-pulse" />

          <div className="relative z-10 flex items-start gap-2.5 sm:gap-3">
            {/* Gyrophare d'alerte physique avec icône animée */}
            <div className="w-10 h-10 rounded-xl bg-black/30 border border-white/30 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
              <span className="text-xl animate-bounce">⚠️</span>
            </div>

            {/* Contenu textuel d'urgence phygitale */}
            <div className="flex-1 min-w-0 pr-1">
              {/* Badge d'identification de la boutique physique */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/20 text-[9px] font-black uppercase tracking-wider text-amber-300 shadow-2xs">
                  <Store className="w-2.5 h-2.5 text-amber-300" />
                  <span>{effectiveLocation}</span>
                </span>
                <span className="text-[10px] font-extrabold text-white/90">
                  À l&apos;instant en caisse
                </span>
              </div>

              {/* Ligne 1 : ⚠️ Alerte Magasin : 1 {productName} vendu en caisse physique ! */}
              <p className="text-xs sm:text-sm font-black text-white leading-tight drop-shadow-sm">
                ⚠️ Alerte Magasin : 1 {productName} vendu en caisse physique !
              </p>

              {/* Ligne 2 : 🔥 Plus que {remainingStock} en stock ! ou ❌ RUPTURE DE STOCK DÉFINITIVE */}
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-black text-white bg-black/50 px-2 py-0.5 rounded-lg border border-red-300 animate-pulse tracking-wide">
                    ❌ RUPTURE DE STOCK DÉFINITIVE
                  </span>
                ) : (
                  <p className="text-xs sm:text-sm font-black text-yellow-300 flex items-center gap-1 leading-tight drop-shadow-xs">
                    <Flame className="w-4 h-4 text-yellow-300 fill-yellow-300 shrink-0 animate-pulse" />
                    <span>
                      Plus que{' '}
                      <strong className="text-white font-black underline decoration-white/70">
                        {remainingStock}
                      </strong>{' '}
                      en stock !
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Bouton de fermeture manuelle */}
            <button
              type="button"
              onClick={handleClose}
              className="text-white/70 hover:text-white p-1 -mr-1 -mt-1 rounded-lg hover:bg-black/20 transition cursor-pointer shrink-0"
              aria-label="Fermer l'alerte"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Micro-barre de défilement des 5 secondes au bas de la carte */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30 overflow-hidden">
            <div
              className="h-full bg-yellow-300/90 transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

// Rétrocompatibilité : export sous le nom PhygitalAlert également
export const PhygitalAlert = PhygitalScarcityAlert;
export type PhygitalAlertProps = PhygitalScarcityAlertProps;

export default PhygitalScarcityAlert;
