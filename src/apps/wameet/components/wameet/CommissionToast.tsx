import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Coins, X, Wallet, ArrowRight } from 'lucide-react';
import { playChaChingSound } from '../../../../utils/audio';

export interface CommissionToastProps {
  /** Indique si la notification jubilatoire est visible */
  isOpen: boolean;
  /** Montant de la commission perçue en FCFA (défaut: 750) */
  amount?: number;
  /** Devise d'affichage (défaut: 'FCFA') */
  currency?: string;
  /** Nom optionnel de l'acheteur (ex: 'Moussa K.') */
  buyerName?: string;
  /** Titre ou produit concerné */
  productName?: string;
  /** Durée d'affichage en millisecondes avant fermeture automatique (défaut: 6500ms) */
  durationMs?: number;
  /** Jouer l'effet sonore de caisse enregistreuse 'Cha-ching' (défaut: true) */
  soundEnabled?: boolean;
  /** Déclencher l'explosion de particules confettis dorées/émeraude (défaut: true) */
  confettiEnabled?: boolean;
  /** Callback lors de la fermeture */
  onClose?: () => void;
  /** Callback lors du clic sur le raccourci Wallet */
  onViewWallet?: () => void;
  /** Classes CSS supplémentaires pour le positionnement */
  className?: string;
}

/**
 * COMPOSANT CommissionToast (La Récompense Visuelle - Prompt 14)
 * 
 * Directives de design UI/UX au millimètre :
 * - Notification type "Pill" en haut de l'écran (fixed top-4 left-1/2 -translate-x-1/2 rounded-full)
 * - Fond vert émeraude translucide : bg-emerald-600/90 backdrop-blur-md
 * - Bordure dorée : border border-yellow-400
 * - Contenu : "🎉 Cha-ching ! Quelqu'un a acheté via votre lien. + 750 FCFA ajoutés à votre Wallet !"
 * - Animation : Glisse depuis le haut (translate-y-0) avec transition fluide
 * - Effet sonore : Synthèse Web Audio API réaliste de caisse enregistreuse + tintement de pièces d'or
 * - Particules : Explosion de confettis locaux dorés & verts émeraude tirés depuis la notification (canvas-confetti)
 */
export const CommissionToast: React.FC<CommissionToastProps> = ({
  isOpen,
  amount = 750,
  currency = 'FCFA',
  buyerName,
  productName,
  durationMs = 6500,
  soundEnabled = true,
  confettiEnabled = true,
  onClose,
  onViewWallet,
  className = ''
}) => {
  const [progress, setProgress] = useState<number>(100);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredFxRef = useRef<boolean>(false);

  // Déclencheur des effets jubilatoires audiovisuels (Son Cha-ching + Confettis)
  const triggerCelebrationEffects = useCallback(() => {
    // 1. Synthétiseur Audio Web Audio API Cha-ching (caisse enregistreuse + pièces d'or)
    if (soundEnabled) {
      try {
        playChaChingSound();
      } catch (err) {
        console.warn('[CommissionToast] Audio non autorisé ou non supporté :', err);
      }
    }

    // 2. Particules & Confettis festifs locaux (Or & Vert Émeraude)
    if (confettiEnabled && typeof window !== 'undefined') {
      try {
        const count = 90;
        const defaults = {
          origin: { y: 0.12, x: 0.5 },
          colors: ['#10B981', '#059669', '#FBBF24', '#F59E0B', '#FDE047', '#FFFFFF', '#34D399'],
          disableForReducedMotion: true,
          zIndex: 9999
        };

        // Salve centrale éclatante
        confetti({
          ...defaults,
          particleCount: Math.floor(count * 0.6),
          spread: 75,
          startVelocity: 35,
          scalar: 1.1
        });

        // Étoiles et dispersion latérale
        confetti({
          ...defaults,
          particleCount: Math.floor(count * 0.4),
          spread: 110,
          startVelocity: 45,
          decay: 0.92,
          scalar: 0.9
        });
      } catch (err) {
        console.warn('[CommissionToast] Confetti non disponible :', err);
      }
    }
  }, [soundEnabled, confettiEnabled]);

  // Cycle de vie : synchronisation lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      // Déclenche l'effet une seule fois par ouverture
      if (!hasTriggeredFxRef.current) {
        hasTriggeredFxRef.current = true;
        triggerCelebrationEffects();
      }

      setProgress(100);
      const stepMs = 50;
      const decrement = 100 / (durationMs / stepMs);

      // Barre de progression du toast
      progressIntervalRef.current = setInterval(() => {
        if (!isHovered) {
          setProgress((prev) => {
            const next = prev - decrement;
            if (next <= 0) {
              clearInterval(progressIntervalRef.current as NodeJS.Timeout);
              return 0;
            }
            return next;
          });
        }
      }, stepMs);

      // Minuterie de fermeture automatique
      timerRef.current = setTimeout(() => {
        if (onClose) onClose();
      }, durationMs);
    } else {
      hasTriggeredFxRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isOpen, durationMs, onClose, isHovered, triggerCelebrationEffects]);

  const formattedAmount = Number(amount || 750).toLocaleString('fr-FR');
  const buyerText = buyerName
    ? `${buyerName} a acheté via votre lien.`
    : "Quelqu'un a acheté via votre lien.";

  return (
    <aside
      aria-label="Alerte de commission Wameet"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-500 ease-out ${
        isOpen
          ? 'translate-y-0 opacity-100 pointer-events-auto scale-100'
          : '-translate-y-28 opacity-0 pointer-events-none scale-95'
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 
        Le Pill : Vert émeraude translucide + bordure dorée 
        bg-emerald-600/90 backdrop-blur-md border border-yellow-400
      */}
      <div
        className="relative group max-w-[94vw] sm:max-w-xl mx-auto flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-emerald-600/90 backdrop-blur-md border border-yellow-400 shadow-[0_12px_36px_-6px_rgba(5,150,105,0.7),0_0_24px_rgba(250,204,21,0.5)] text-white select-none transition-transform active:scale-[0.99]"
      >
        {/* Halo lumineux d'accentuation dorée en arrière-plan */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/20 via-emerald-400/10 to-teal-400/20 blur-md pointer-events-none" />

        {/* 1. Icône animée "Cha-ching / Pièces d'or" */}
        <div className="relative shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-emerald-950/40 flex items-center justify-center text-yellow-300">
            <Coins className="w-5 h-5 text-yellow-300 animate-pulse" />
          </div>
          {/* Étincelle dorée */}
          <Sparkles className="w-3.5 h-3.5 text-white absolute -top-1 -right-1 animate-spin-slow drop-shadow" />
        </div>

        {/* 2. Contenu gratifiant au millimètre : "🎉 Cha-ching ! Quelqu'un a acheté via votre lien. + 750 FCFA ajoutés à votre Wallet !" */}
        <div className="flex-1 min-w-0 pr-1 text-left leading-tight">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-black tracking-wide text-white drop-shadow-xs">
              🎉 Cha-ching !
            </span>
            <span className="text-[11px] sm:text-xs text-emerald-100 font-medium truncate">
              {buyerText}
            </span>
          </div>

          <div className="mt-0.5 text-xs sm:text-sm font-extrabold text-yellow-300 flex items-center gap-1.5 drop-shadow-sm flex-wrap">
            <span className="bg-yellow-400/25 px-2 py-0.5 rounded-full border border-yellow-300/50 font-black tracking-wider text-yellow-200">
              +{formattedAmount} {currency}
            </span>
            <span className="text-[11px] sm:text-xs text-emerald-100 font-bold">
              ajoutés à votre Wallet !
            </span>
          </div>

          {productName && (
            <div className="text-[10px] text-emerald-200/90 font-medium truncate mt-0.5">
              Article : {productName}
            </div>
          )}
        </div>

        {/* 3. Actions : Bouton "Wallet" + Bouton Fermer */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {onViewWallet && (
            <button
              type="button"
              onClick={onViewWallet}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-[11px] font-black shadow transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Consulter le solde de mon Wallet"
            >
              <Wallet className="w-3 h-3 text-slate-900" />
              <span>Wallet</span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-900" />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Fermer la notification de commission"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 4. Barre de progression discrète en bas du pill */}
        <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-emerald-900/40 rounded-full overflow-hidden pointer-events-none">
          <div
            className="h-full bg-yellow-300/80 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
};

export default CommissionToast;
