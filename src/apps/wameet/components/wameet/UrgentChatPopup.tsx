import React from 'react';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface UrgentChatPopupProps {
  /** Contrôle de visibilité du popup */
  isOpen: boolean;
  /** Clic sur le texte ou le popup pour ouvrir le Chat Complet */
  onOpenFullChat: () => void;
  /** Clic sur la petite croix (×) pour masquer le popup */
  onClose: () => void;
  /** Texte personnalisé (défaut: "Questions urgentes ? (Chat rapide)") */
  text?: string;
  /** Classes CSS supplémentaires pour le positionnement */
  className?: string;
}

/**
 * PROMPT 4 - Option 1 : UrgentChatPopup
 * Le Popup Urgent Aérien (Chat Rapide Reels - Wameet)
 * 
 * Contrainte absolue :
 * AUCUN arrière-plan blanc uni ou lourd. Aérien, transparent,
 * minimaliste avec ombrage de texte (drop-shadow-lg) pour se détacher sans polluer la vidéo.
 * 
 * Directives au millimètre près :
 * - Positionnement : absolute bottom-14 left-4 z-50 animate-bounce-subtle max-w-[200px] text-white
 * - Sans aucun cadre ni fond blanc : Texte et icône blancs flottants
 *   (drop-shadow-lg flex items-center gap-1.5 text-xs font-semibold)
 * - Contenu : "Questions urgentes ? (Chat rapide)" suivi d'une petite croix "×"
 *   (cursor-pointer ml-1 text-white/70 hover:text-white)
 * - Micro-filet de liaison / lueur subtile d'ancrage sans fond solide
 */
export const UrgentChatPopup: React.FC<UrgentChatPopupProps> = ({
  isOpen,
  onOpenFullChat,
  onClose,
  text = 'Questions urgentes ? (Chat rapide)',
  className = ''
}) => {
  if (!isOpen) return null;

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    onOpenFullChat();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.92 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`absolute bottom-14 left-4 z-50 max-w-[200px] text-white select-none pointer-events-auto ${className}`}
      >
        {/* Conteneur flottant avec animation de pulsation subtile (sans fond solide ni cadre blanc) */}
        <div className="relative group animate-bounce-subtle">
          {/* Lueur subtile diffuse d'ancrage (sans fond solide) */}
          <div className="absolute -inset-1 rounded-full bg-blue-500/20 blur-md pointer-events-none" />

          {/* Corps du popup : Texte blanc fin + icône flottante */}
          <div
            onClick={handleOpen}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') handleOpen(e as any);
            }}
            title="Ouvrir le chat complet pour poser votre question urgente"
            className="relative drop-shadow-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer py-1 px-1.5 rounded-full hover:opacity-100 transition-opacity bg-white/5 backdrop-blur-xs border border-white/10"
          >
            {/* Icône de notification / étincelle rapide */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            </span>

            {/* Texte : "Questions urgentes ? (Chat rapide)" */}
            <span className="text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] leading-tight text-[11px] truncate">
              {text}
            </span>

            {/* Petite croix "×" pour fermer en 1 clic */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Masquer le message"
              title="Fermer"
              className="cursor-pointer ml-1 text-white/70 hover:text-white text-sm font-bold leading-none p-0.5 rounded-full hover:bg-white/20 transition-colors focus:outline-none shrink-0"
            >
              ×
            </button>
          </div>

          {/* Micro-filet de liaison subtil pointant vers le bas vers l'icône Chat */}
          <div className="w-1.5 h-1.5 rotate-45 border-r border-b border-white/20 bg-black/30 ml-5 -mt-1 pointer-events-none" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UrgentChatPopup;
