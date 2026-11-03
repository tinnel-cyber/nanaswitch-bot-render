import React, { useState, useEffect } from 'react';
import { Bookmark, Sparkles, Check } from 'lucide-react';
import { WameetPostItem, INITIAL_POSTS } from '../../../../pages/wameet/WameetSupraApp';
import { FeedCard } from './FeedCard';
import { WameetGeneratorModal } from './WameetGeneratorModal';
import { playValidationBeep, playTapBeep } from '../../../../utils/audio';

export interface ImmersiveFeedProps {
  posts: WameetPostItem[];
  onReaction?: (postId: string, type: 'like' | 'love' | 'idea') => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onOpenWWithMember?: (member: { name: string; handle: string; avatarUrl: string }) => void;
  onOpenComments?: (post: WameetPostItem) => void;
  onSaveToVaultExternal?: (postId: string) => void;
  onOpenGeneratorExternal?: (creatorId: string, creatorName?: string) => void;
}

export const ImmersiveFeed: React.FC<ImmersiveFeedProps> = ({
  posts,
  onReaction,
  onVotePoll,
  onOpenWWithMember,
  onOpenComments,
  onSaveToVaultExternal,
  onOpenGeneratorExternal
}) => {
  const displayPosts = Array.isArray(posts) && posts.length >= 5 ? posts : INITIAL_POSTS;
  const handleOpenMemberChat = onOpenWWithMember;
  // Gestion du Coffre-fort (Vault)
  const [vaultPostIds, setVaultPostIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('wameet_vault_posts');
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Toast "Sauvegardé" avec animation
  const [toast, setToast] = useState<{ visible: boolean; message: string } | null>(null);

  // État de la modale WameetGeneratorModal
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [targetCreator, setTargetCreator] = useState<{ id: string; name: string }>({
    id: '@createur',
    name: 'Créateur'
  });

  // Sauvegarde dans le Coffre-fort (Swipe Gauche)
  const saveToVault = (postId: string) => {
    setVaultPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      try {
        localStorage.setItem('wameet_vault_posts', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error('Erreur stockage coffre-fort', e);
      }
      return next;
    });

    playValidationBeep();

    // Déclenchement de l'animation Toast "Sauvegardé"
    setToast({
      visible: true,
      message: 'Sauvegardé'
    });

    if (onSaveToVaultExternal) {
      onSaveToVaultExternal(postId);
    }
  };

  // Fermeture automatique du toast après 2.2s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Ouverture du WameetGeneratorModal (Swipe Droite)
  const handleOpenGenerator = (creatorId: string, creatorName?: string) => {
    setTargetCreator({
      id: creatorId || '@createur',
      name: creatorName || 'Créateur'
    });
    setIsGeneratorModalOpen(true);

    if (onOpenGeneratorExternal) {
      onOpenGeneratorExternal(creatorId, creatorName);
    }
  };

  return (
    <div className="relative w-full h-full bg-white">
      {/* ===================================================================
          ANIMATION TOAST "SAUVEGARDÉ" (BLEU ROYAL #4169E1 & BLANC)
         =================================================================== */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="bg-[#4169E1] text-white px-5 py-2.5 rounded-full shadow-2xl shadow-[#4169E1]/40 flex items-center gap-2.5 text-xs font-black border border-white/20">
            <Bookmark className="w-4 h-4 fill-white text-white shrink-0 animate-bounce" />
            <span className="tracking-wide">{toast.message}</span>
            <Check className="w-3.5 h-3.5 text-blue-200" />
          </div>
        </div>
      )}

      {/* ===================================================================
          1. CONTENEUR NATIVE SNAP SCROLL (WAMEET STYLE)
          overflow-y-scroll snap-y snap-mandatory h-[85vh] pb-24
         =================================================================== */}
      <div className="overflow-y-scroll snap-y snap-mandatory h-[85vh] pb-24 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] bg-white relative w-full">
        {displayPosts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            isSaved={vaultPostIds.has(post.id)}
            onSaveToVault={saveToVault}
            onOpenGenerator={handleOpenGenerator}
            onReaction={onReaction}
            onVotePoll={onVotePoll}
            onOpenWWithMember={handleOpenMemberChat}
            onOpenComments={onOpenComments}
          />
        ))}
      </div>

      {/* ===================================================================
          2. MODALE WAMEET GENERATOR AVEC ID DU CRÉATEUR PRÉ-REMPLI
         =================================================================== */}
      <WameetGeneratorModal
        isOpen={isGeneratorModalOpen}
        onClose={() => setIsGeneratorModalOpen(false)}
        creatorId={targetCreator.id}
        creatorName={targetCreator.name}
      />
    </div>
  );
};

export default ImmersiveFeed;
