import React from 'react';
import { GraduationCap, Crown, Plus, UserPlus, UserCheck, Search, Volume2, VolumeX } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export type TopNavTab = 'salles' | 'vip' | 'following' | 'search' | 'for_you' | 'community' | 'lives';

export interface TopNavOverlayProps {
  /** Onglet actuellement actif */
  activeTab?: TopNavTab;
  /** Clic sur l'icône Salles (à gauche) */
  onOpenSalles?: () => void;
  /** Clic sur l'icône Salon VIP (à gauche) */
  onOpenSalonVip?: () => void;
  /** Bouton vert Suivi (détaché pour être entre Salon VIP et le bouton +) */
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  /** Clic sur le bouton d'ajout/upload (+) */
  onAddReel?: () => void;
  /** Clic sur l'icône Suivis */
  onOpenFollowing?: () => void;
  /** Clic sur l'icône Inviter des Amis */
  onOpenInviteFriends?: () => void;
  /** Clic sur l'icône Recherche (loupe) */
  onOpenSearch?: () => void;
  /** Contrôle Volume/Mute intégré (aligné à droite pour ne rien cacher) */
  isMuted?: boolean;
  onToggleMute?: () => void;
  /** Callbacks legacy de compatibilité */
  onOpenCommunity?: () => void;
  onOpenLives?: () => void;
  communityLabel?: string;
  /** Classes CSS supplémentaires */
  className?: string;
}

/**
 * TopNavOverlay : Contrôles de Navigation Haute Flottante (Reels - Wameet)
 * 
 * Spécifications :
 * - Tous les boutons sont transparents avec glassmorphism (bg-white/10 hover:bg-white/20 border-white/20)
 * - À gauche : Salles (GraduationCap) et Salon VIP (Crown)
 * - Au centre / entre Salon VIP et le bouton (+) : Bouton Vert Suivi
 * - À droite : Bouton (+) d'ajout, Amis (UserPlus), Recherche (Search) et Volume
 */
export const TopNavOverlay: React.FC<TopNavOverlayProps> = ({
  activeTab,
  onOpenSalles,
  onOpenSalonVip,
  isFollowing,
  onToggleFollow,
  onAddReel,
  onOpenFollowing,
  onOpenInviteFriends,
  onOpenSearch,
  isMuted,
  onToggleMute,
  onOpenCommunity,
  onOpenLives,
  className = ''
}) => {
  const handleSallesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (onOpenSalles) {
      onOpenSalles();
    } else if (onOpenCommunity) {
      onOpenCommunity();
    } else {
      window.location.href = '/salles-vip';
    }
  };

  const handleSalonVipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    if (onOpenSalonVip) {
      onOpenSalonVip();
    } else if (onOpenLives) {
      onOpenLives();
    } else {
      window.location.href = '/vip';
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    onAddReel?.();
  };

  const handleFollowingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (onOpenInviteFriends) {
      onOpenInviteFriends();
    } else if (onOpenFollowing) {
      onOpenFollowing();
    }
  };

  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onOpenSearch?.();
  };

  return (
    <header
      role="banner"
      aria-label="Navigation haute Reels"
      className={`absolute top-3 sm:top-4 left-3 right-3 z-40 flex justify-between items-center gap-2 sm:gap-3 text-white select-none pointer-events-auto flex-nowrap ${className}`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.25rem)' }}
    >
      {/* =====================================================================
          1. À GAUCHE : SALLES, SALON VIP ET BOUTON VERT SUIVI
         ===================================================================== */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Salle de classe */}
        <button
          type="button"
          onClick={handleSallesClick}
          aria-label="Salle de classe et formations"
          title="Salle de classe • Campus Wameet"
          className="w-8 h-8 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white drop-shadow-md active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <GraduationCap className="w-4 h-4 text-white shrink-0 stroke-[2.2]" />
        </button>

        {/* Salon VIP (transparent) */}
        <button
          type="button"
          onClick={handleSalonVipClick}
          aria-label="Salon VIP (Expert Coach, Partenaire d'Affaires, Rencontre VIP)"
          title="Salon VIP"
          className="px-2.5 py-1 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-amber-300 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0 relative"
        >
          <Crown className="w-3.5 h-3.5 drop-shadow-[0_2px_8px_rgba(245,158,11,0.7)] text-amber-300 shrink-0 stroke-[2.2]" />
          <span className="text-[11px] font-bold text-amber-300">VIP</span>
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.9)]"
            aria-hidden="true"
          />
        </button>

        {/* BOUTON VERT SUIVI (détaché pour être entre Salon VIP et le bouton Plus) */}
        {onToggleFollow && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playValidationBeep();
              onToggleFollow();
            }}
            aria-label={isFollowing ? 'Abonné' : 'Suivre'}
            title={isFollowing ? 'Abonné (cliquez pour vous désabonner)' : 'Suivre ce compte'}
            className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm shrink-0 flex items-center gap-1 ${
              isFollowing
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/50 text-emerald-300'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-400/30 text-emerald-400'
            }`}
          >
            {isFollowing ? (
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 stroke-[2.4]" />
            ) : (
              <UserPlus className="w-3.5 h-3.5 text-emerald-400 stroke-[2.4]" />
            )}
            <span className="text-[11px] font-bold">{isFollowing ? 'Suivi' : 'Suivre'}</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          2. À DROITE : BOUTON PLUS, AMIS, RECHERCHE
         ===================================================================== */}
      <nav
        aria-label="Contrôles directs"
        className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-nowrap"
      >
        {/* Petit bouton + (icône d'ajout / upload) */}
        <button
          type="button"
          onClick={handleAddClick}
          aria-label="Ajouter / Upload vidéo"
          title="Ajouter un Reel"
          className="w-8 h-8 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white drop-shadow-md hover:scale-105 active:scale-90 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.6]" />
        </button>

        {/* Bouton Amis : Inviter des Amis */}
        <button
          type="button"
          onClick={handleFollowingClick}
          aria-label="Inviter des amis"
          title="Inviter des Amis"
          className="w-8 h-8 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white drop-shadow-md active:scale-90 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* Recherche : loupe Search */}
        <button
          type="button"
          onClick={handleSearchClick}
          aria-label="Recherche de vidéos"
          title="Recherche"
          className={`w-8 h-8 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center drop-shadow-md active:scale-90 transition-all cursor-pointer shadow-sm shrink-0 ${
            activeTab === 'search'
              ? 'text-blue-300 border-blue-400/50'
              : 'text-white'
          }`}
        >
          <Search className="w-4 h-4 stroke-[2.2]" />
        </button>
      </nav>
    </header>
  );
};

export default TopNavOverlay;
