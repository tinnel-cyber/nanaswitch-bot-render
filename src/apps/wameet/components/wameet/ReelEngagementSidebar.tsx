import React, { useState } from 'react';
import {
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  MessageSquare
} from 'lucide-react';
import { ProfileSubButton } from './ProfileSubButton';
import { ResonanceButton } from './ResonanceButton';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface ReelEngagementSidebarProps {
  /** Avatar du créateur */
  authorAvatar: string;
  /** Nom du créateur */
  authorName?: string;
  /** Handle du créateur (@pseudo) */
  authorHandle?: string;
  /** État d'abonnement au créateur */
  isFollowing?: boolean;
  /** Callback lors du changement d'abonnement */
  onToggleFollow?: (isFollowing: boolean) => void;
  /** Clic sur l'avatar pour ouvrir le profil */
  onProfileClick?: () => void;

  /** Nombre de likes (ex: 348 ou 34800 ou '34.8K') */
  likesCount?: number | string;
  /** État Like actif */
  isLiked?: boolean;
  /** Callback Like */
  onLike?: () => void;

  /** Nombre de favoris (ex: 45000 ou '45K') */
  favoritesCount?: number | string;
  /** État Favori actif */
  isFavorited?: boolean;
  /** Callback Favori */
  onFavorite?: () => void;

  /** Callback Partager */
  onShare?: () => void;
  /** Libellé ou compteur de partage (défaut: 'Partager') */
  shareLabel?: string;

  /** Nombre de commentaires (optionnel) */
  commentsCount?: number | string;
  /** Callback Commentaires (optionnel) */
  onComment?: () => void;

  /** Callback Discuter en direct / Le Pont Social (optionnel) */
  onChatWithCreator?: () => void;

  /** Bouton 1 : La Résonance (📡) */
  reelId?: string;
  creatorId?: string;
  currentUserId?: string;
  currentUserName?: string;
  resonanceCount?: number;
  onSynergyMatchTriggered?: (roomUrl: string) => void;

  /** Bouton 2 : Le Petit Coffre Noir / Catalogue Nanasore POS */
  productId?: string;
  creatorShopDomain?: string;
  initialOffer?: Partial<ProductOffer> | null;
  /** Bouton 4 : Le Bouton Vert Wameet (🚀 / 💬) Messagerie Privée */
  reelTitle?: string;
  reelThumbnailUrl?: string;

  /** Classes CSS supplémentaires pour le positionnement */
  className?: string;
}

/**
 * Formatage fin des compteurs (ex: 45000 -> 45K, 1200000 -> 1.2M)
 */
export const formatEngagementCount = (count?: number | string): string => {
  if (count === undefined || count === null) return '0';
  if (typeof count === 'string') return count;
  if (count >= 1_000_000) {
    const val = count / 1_000_000;
    return `${val.toFixed(val >= 10 ? 0 : 1)}M`;
  }
  if (count >= 1_000) {
    const val = count / 1_000;
    return `${val.toFixed(val >= 10 ? 0 : 1)}K`;
  }
  return count.toString();
};

/**
 * PROMPT 2 : ReelEngagementSidebar
 * La "Sidebar" d'Engagement sans Cadres (À Droite)
 * 
 * Contrainte absolue :
 * AUCUN cadre d'arrière-plan, AUCUN fond blanc ni boîte.
 * Les icônes et textes sont blancs et flottent naturellement à droite avec de l'ombrage (drop-shadow-md).
 * 
 * Directives au millimètre près :
 * - Positionnement : absolute bottom-28 right-4 z-40 flex flex-col items-center gap-5 text-white
 * - ProfileSubButton : Avatar rond w-11 h-11 avec petit bouton (+) bleu Wameet et blanc en bas au centre
 * - Cœur (J'aime) : Heart w-7 h-7 drop-shadow-md opacity-90 hover:opacity-100 active:scale-110 transition-transform
 *   + compteur en dessous text-[10px] text-white/90 drop-shadow-md
 * - Favoris : Icône signet/étoile blanc avec compteur fin (45K)
 * - Partager : Flèche de partage Share2 vers la droite avec la mention "Partager"
 */
export const ReelEngagementSidebar: React.FC<ReelEngagementSidebarProps> = ({
  authorAvatar,
  authorName = 'Créateur',
  authorHandle,
  isFollowing,
  onToggleFollow,
  onProfileClick,
  likesCount = '348',
  isLiked: controlledIsLiked,
  onLike,
  favoritesCount = '45K',
  isFavorited: controlledIsFavorited,
  onFavorite,
  onShare,
  shareLabel = 'Partager',
  commentsCount,
  onComment,
  onChatWithCreator,
  reelId,
  creatorId,
  currentUserId,
  currentUserName,
  resonanceCount,
  onSynergyMatchTriggered,
  productId,
  creatorShopDomain,
  initialOffer,
  onBuyDirect,
  reelTitle,
  reelThumbnailUrl,
  className = ''
}) => {
  // State autonome local si non contrôlé
  const [internalLiked, setInternalLiked] = useState(false);
  const [internalFavorited, setInternalFavorited] = useState(false);

  const isLiked = controlledIsLiked !== undefined ? controlledIsLiked : internalLiked;
  const isFavorited = controlledIsFavorited !== undefined ? controlledIsFavorited : internalFavorited;

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    if (controlledIsLiked === undefined) {
      setInternalLiked(prev => !prev);
    }
    onLike?.();
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (controlledIsFavorited === undefined) {
      setInternalFavorited(prev => !prev);
    }
    onFavorite?.();
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onShare?.();
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onComment?.();
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onChatWithCreator?.();
  };

  return (
    <aside
      onClick={e => e.stopPropagation()}
      aria-label="Actions du Reel"
      className={`absolute bottom-3 sm:bottom-4 right-2 sm:right-3 z-40 flex flex-col items-center gap-1.5 sm:gap-2 text-white select-none ${className}`}
    >
      {/* 1. Profil avec Abonnement Dynamique (ProfileSubButton) */}
      <ProfileSubButton
        avatarUrl={authorAvatar}
        authorName={authorName}
        isFollowing={isFollowing}
        onToggleFollow={onToggleFollow}
        onProfileClick={onProfileClick}
      />

      {/* BOUTON 1 : LA RÉSONANCE (📡) */}
      {reelId && (
        <ResonanceButton
          reelId={reelId}
          creatorId={creatorId || 'creator_wameet'}
          currentUserId={currentUserId || 'user_me'}
          currentUserName={currentUserName || 'Moi'}
          initialResonanceCount={resonanceCount || 0}
          onSynergyMatchTriggered={onSynergyMatchTriggered || (() => {})}
        />
      )}

      {/* 2. Cœur (J'aime) - Transparent */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={handleLikeClick}
          aria-label="J'aime ce Reel"
          title="J'aime"
          className="w-8.5 h-8.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition active:scale-75 cursor-pointer shadow-sm text-white"
        >
          <Heart
            className={`w-4 h-4 drop-shadow-md transition-transform ${
              isLiked
                ? 'fill-rose-500 text-rose-500 scale-110'
                : 'fill-white/15 text-white'
            }`}
          />
        </button>
        <span className="text-[9px] font-bold text-white drop-shadow-md leading-none">
          {formatEngagementCount(likesCount)}
        </span>
      </div>

      {/* 3. Commentaires - Transparent */}
      {commentsCount !== undefined && (
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={handleCommentClick}
            aria-label="Commentaires"
            title="Commentaires"
            className="w-8.5 h-8.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition active:scale-75 cursor-pointer shadow-sm text-white"
          >
            <MessageSquare className="w-4 h-4 fill-white/15 text-white stroke-[2]" />
          </button>
          <span className="text-[9px] font-bold text-white drop-shadow-md leading-none">
            {formatEngagementCount(commentsCount)}
          </span>
        </div>
      )}

      {/* 4. Favoris - Transparent */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label="Enregistrer dans les favoris"
          title="Favoris"
          className="w-8.5 h-8.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition active:scale-75 cursor-pointer shadow-sm text-white"
        >
          <Bookmark
            className={`w-4 h-4 drop-shadow-md transition-transform ${
              isFavorited
                ? 'fill-amber-400 text-amber-400 scale-110'
                : 'fill-white/15 text-white stroke-[2]'
            }`}
          />
        </button>
        <span className="text-[9px] font-bold text-white drop-shadow-md leading-none">
          {formatEngagementCount(favoritesCount)}
        </span>
      </div>

      {/* 5. Partager - Transparent */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={handleShareClick}
          aria-label="Partager ce Reel"
          title="Partager"
          className="w-8.5 h-8.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition active:scale-75 cursor-pointer shadow-sm text-white"
        >
          <Share2 className="w-4 h-4 fill-white/15 text-white stroke-[2]" />
        </button>
        <span className="text-[9px] font-bold text-white drop-shadow-md leading-none">
          {shareLabel}
        </span>
      </div>
    </aside>
  );
};

export default ReelEngagementSidebar;
