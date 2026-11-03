import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { playValidationBeep, playTapBeep } from '../../../../utils/audio';

export interface ProfileSubButtonProps {
  /** URL de la photo de profil du créateur */
  avatarUrl: string;
  /** Nom du créateur pour accessibilité et infobulle */
  authorName?: string;
  /** État d'abonnement contrôlé (optionnel) */
  isFollowing?: boolean;
  /** Callback lors du basculement d'abonnement */
  onToggleFollow?: (isFollowing: boolean) => void;
  /** Clic sur l'avatar pour ouvrir le profil */
  onProfileClick?: () => void;
  /** Classes CSS supplémentaires */
  className?: string;
}

/**
 * PROMPT 2 : ProfileSubButton
 * Le Profil avec Abonnement Dynamique (Style Wameet Reels / Wameet épuré)
 * 
 * Directives UI/UX au millimètre :
 * - Photo de profil ronde : w-11 h-11 rounded-full border border-white/20 object-cover relative
 * - Bouton Plus (+) en bas au centre :
 *   absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-600 border border-white/10 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-md cursor-pointer transition-all duration-300
 * - Au Clic (Logique d'animation) : Jaillit (scale-110), se transforme en une discrète coche (Check)
 *   ou s'anime de manière autonome avec son propre state React.
 */
export const ProfileSubButton: React.FC<ProfileSubButtonProps> = ({
  avatarUrl,
  authorName = 'Créateur',
  isFollowing: controlledIsFollowing,
  onToggleFollow,
  onProfileClick,
  className = ''
}) => {
  // State autonome pour l'abonnement
  const [internalIsFollowing, setInternalIsFollowing] = useState(false);
  // State pour l'effet de jaillissement au clic (scale-110)
  const [isPopping, setIsPopping] = useState(false);

  const isFollowing =
    controlledIsFollowing !== undefined ? controlledIsFollowing : internalIsFollowing;

  const handleSubClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 320);

    const nextState = !isFollowing;
    if (nextState) {
      playValidationBeep();
    } else {
      playTapBeep();
    }

    if (controlledIsFollowing === undefined) {
      setInternalIsFollowing(nextState);
    }
    onToggleFollow?.(nextState);
  };

  return (
    <div className={`relative mb-0.5 inline-flex flex-col items-center select-none ${className}`}>
      {/* 1. Photo de profil ronde */}
      <img
        src={avatarUrl}
        alt={authorName}
        onClick={onProfileClick}
        className="w-8.5 h-8.5 rounded-full border border-white/20 object-cover relative select-none cursor-pointer hover:opacity-95 transition-opacity"
        title={`Profil de ${authorName}`}
      />

      {/* 2. Bouton rond Plus (+) bleu Wameet et blanc au centre inférieur */}
      <button
        type="button"
        onClick={handleSubClick}
        aria-label={isFollowing ? `Abonné à ${authorName}` : `S'abonner à ${authorName}`}
        title={isFollowing ? 'Abonné' : "S'abonner"}
        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-600 border border-white/10 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-md cursor-pointer transition-all duration-300 ${
          isFollowing ? 'bg-blue-600 ring-1 ring-white/40' : 'bg-blue-600 hover:bg-blue-500'
        } ${isPopping ? 'scale-110 rotate-12' : 'scale-100 hover:scale-105 active:scale-95'}`}
      >
        {isFollowing ? (
          <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
        ) : (
          <Plus className="w-2.5 h-2.5 stroke-[3] text-white" />
        )}
      </button>
    </div>
  );
};

export default ProfileSubButton;
