/**
 * @file WameetFeed.tsx
 * @description Conteneur Snap Scroll magnétique pour le fil immersif Wameet (Prompt 2).
 * 
 * Spécifications :
 * - Défilement vertical magnétique plein écran (snap-y snap-mandatory)
 * - Occupe 100% du conteneur central mobile
 * - Arrière-plan ultra-propre bg-slate-950
 * - Scrollbar masquée (scrollbar-none)
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), fonds sombres média
 * - Zéro marque tierce
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { FeedCard, FeedPost } from './FeedCard';
import { FALLBACK_REEL_POSTS } from './SocialFeedScreen';

export interface WameetFeedProps {
  posts: FeedPost[] | any[];
  currentUserId?: string;
  currentUserDiamonds?: number;
  onSaveToVault?: (postId: string) => void;
  onOpenWameetModal?: (authorId: string, authorName?: string) => void;
  onReaction?: (postId: string, type: 'like' | 'love' | 'idea') => void;
  onOpenComments?: (post: any) => void;
  onOpenWWithMember?: (member: { name: string; handle: string; avatarUrl: string }) => void;
  onBuyProductDirect?: (offer: any) => void;
  className?: string;
}

export const WameetFeed: React.FC<WameetFeedProps> = ({
  posts,
  currentUserId,
  currentUserDiamonds,
  onSaveToVault,
  onOpenWameetModal,
  onReaction,
  onOpenComments,
  onOpenWWithMember,
  onBuyProductDirect,
  className = ''
}) => {
  // Injecter systématiquement les 5 publications de démonstration (3 vidéos 9:16 + 2 affiches) si BDD vide
  const displayPosts = posts && posts.length > 0 ? posts : FALLBACK_REEL_POSTS;

  return (
    <div
      className={`w-full flex flex-col gap-3 px-2.5 pt-2 pb-24 bg-slate-950 select-none ${className}`}
      role="feed"
      aria-label="Fil d'actualité Wameet"
    >
      {displayPosts.map((post) => (
        <FeedCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          currentUserDiamonds={currentUserDiamonds}
          onSaveToVault={onSaveToVault}
          onOpenWameetModal={onOpenWameetModal}
          onReaction={onReaction}
          onOpenComments={onOpenComments}
          onOpenWWithMember={onOpenWWithMember}
          onBuyProductDirect={onBuyProductDirect}
        />
      ))}
    </div>
  );
};

export default WameetFeed;
