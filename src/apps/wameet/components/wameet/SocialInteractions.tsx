import React, { useState, useEffect } from 'react';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  doc, updateDoc, increment, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { MessageCircle, Share2, Send, X, Check, Copy } from 'lucide-react';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  text: string;
  createdAt: any;
}

export interface SocialInteractionsProps {
  reelId: string;
  reelTitle: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string;
  initialCommentCount?: number;
  initialShareCount?: number;
  initialComments?: Comment[];
  onShareClick?: () => void;
  className?: string;
}

export const SocialInteractions: React.FC<SocialInteractionsProps> = ({
  reelId,
  reelTitle,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  initialCommentCount = 0,
  initialShareCount = 0,
  initialComments = [],
  onShareClick,
  className = ''
}) => {
  const [isOpenComments, setIsOpenComments] = useState<boolean>(false);
  const [isOpenShareModal, setIsOpenShareModal] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState<string>('');
  const [commentCount, setCommentCount] = useState<number>(initialCommentCount);
  const [shareCount, setShareCount] = useState<number>(initialShareCount);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Synchroniser avec les props initiales si changement de Reel
  useEffect(() => {
    setCommentCount(initialCommentCount);
    setShareCount(initialShareCount);
    if (initialComments && initialComments.length > 0) {
      setComments(initialComments);
    }
  }, [reelId, initialCommentCount, initialShareCount]);

  // Écoute en temps réel des commentaires Firestore
  useEffect(() => {
    if (!isOpenComments || !reelId) return;

    let unsubscribed = false;
    let unsub1: (() => void) | null = null;
    let unsub2: (() => void) | null = null;

    try {
      const commentsRef = collection(db, 'reels', reelId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      unsub1 = onSnapshot(q, (snapshot) => {
        if (!unsubscribed && !snapshot.empty) {
          const loadedComments: Comment[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data()
          } as Comment));
          setComments(loadedComments);
          setCommentCount(loadedComments.length);
        }
      }, (err) => {
        console.warn('[COMMENTS] Écoute reels/comments :', err);
      });
    } catch (e) {
      console.warn('[COMMENTS] Initialisation listener reels/comments :', e);
    }

    try {
      const wameetCommentsRef = collection(db, 'wameet_reels', reelId, 'comments');
      const q2 = query(wameetCommentsRef, orderBy('createdAt', 'desc'));
      unsub2 = onSnapshot(q2, (snapshot) => {
        if (!unsubscribed && !snapshot.empty) {
          const loadedComments: Comment[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data()
          } as Comment));
          setComments(prev => {
            const ids = new Set(prev.map(p => p.id));
            const fresh = loadedComments.filter(l => !ids.has(l.id));
            return [...fresh, ...prev];
          });
        }
      }, (err) => {
        console.warn('[COMMENTS] Écoute wameet_reels/comments :', err);
      });
    } catch (e) {
      console.warn('[COMMENTS] Initialisation listener wameet_reels/comments :', e);
    }

    return () => {
      unsubscribed = true;
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, [isOpenComments, reelId]);

  // Poster un nouveau commentaire
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    playTapBeep();
    setIsSubmitting(true);

    const commentText = newComment.trim();
    const effectiveUserId = currentUserId || 'guest_user';
    const effectiveUserName = currentUserName || 'Moi';
    const effectiveAvatar = currentUserAvatarUrl || '';

    // Ajout optimiste immédiat
    const optimisticComment: Comment = {
      id: `local-${Date.now()}`,
      userId: effectiveUserId,
      userName: effectiveUserName,
      userAvatarUrl: effectiveAvatar,
      text: commentText,
      createdAt: new Date().toISOString()
    };
    setComments((prev) => [optimisticComment, ...prev]);
    setCommentCount((prev) => prev + 1);
    setNewComment('');

    try {
      // 1. Enregistrer dans la sous-collection comments
      try {
        const commentsRef = collection(db, 'reels', reelId, 'comments');
        await addDoc(commentsRef, {
          userId: effectiveUserId,
          userName: effectiveUserName,
          userAvatarUrl: effectiveAvatar,
          text: commentText,
          createdAt: serverTimestamp()
        });
      } catch (err1) {
        console.warn('[COMMENTS] Écriture sous-collection reels :', err1);
      }

      // 2. Incrémenter le compteur principal sur le Reel
      try {
        const reelRef = doc(db, 'reels', reelId);
        await updateDoc(reelRef, {
          commentCount: increment(1),
          commentsCount: increment(1)
        });
      } catch (err2) {
        // Fallback wameet_reels
        try {
          const wameetRef = doc(db, 'wameet_reels', reelId);
          await updateDoc(wameetRef, {
            commentCount: increment(1),
            commentsCount: increment(1)
          });
        } catch (_) {}
      }

      playValidationBeep();
    } catch (err) {
      console.error('Erreur lors de la publication du commentaire :', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Partager le Reel
  const handleShareReel = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapBeep();

    if (onShareClick) {
      onShareClick();
    }

    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/reel/${reelId}`
      : `https://wameet.net/reel/${reelId}`;

    const shareData = {
      title: `Découvrez ce Reel sur Wameet : ${reelTitle || 'Vidéo Wameet'}`,
      text: reelTitle || 'Regardez cette vidéo captivante sur Wameet !',
      url: shareUrl
    };

    // Incrémenter le compteur de partages en tâche de fond
    const recordShareIncrement = async () => {
      setShareCount((prev) => prev + 1);
      try {
        const reelRef = doc(db, 'reels', reelId);
        await updateDoc(reelRef, {
          shareCount: increment(1),
          sharesCount: increment(1)
        });
      } catch (err) {
        try {
          const wameetRef = doc(db, 'wameet_reels', reelId);
          await updateDoc(wameetRef, {
            shareCount: increment(1),
            sharesCount: increment(1)
          });
        } catch (_) {}
      }
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        playValidationBeep();
        recordShareIncrement();
      } else {
        // Ouvrir la modale sociale personnalisée Wameet
        setIsOpenShareModal(true);
        recordShareIncrement();
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('Partage natif non disponible, ouverture modale :', err);
      setIsOpenShareModal(true);
      recordShareIncrement();
    }
  };

  const copyShareLink = async () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/reel/${reelId}`
      : `https://wameet.net/reel/${reelId}`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        playValidationBeep();
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch (_) {}
  };

  return (
    <>
      {/* =====================================================================
          1. BOUTONS SUR LE PANNEAU LATÉRAL DU REEL
         ===================================================================== */}
      <div className={`flex flex-col items-center gap-1.5 sm:gap-2 select-none ${className}`}>
        {/* BOUTON COMMENTAIRES (💬) */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playTapBeep();
              setIsOpenComments(true);
            }}
            className="w-8.5 h-8.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition active:scale-75 cursor-pointer shadow-sm text-white"
            title="Voir les commentaires"
            aria-label="Commentaires du Reel"
          >
            <MessageCircle className="w-4 h-4 fill-white/15 text-white stroke-[2]" />
          </button>
          <span className="text-[9px] font-bold text-white drop-shadow-md leading-none">
            {commentCount}
          </span>
        </div>

        {/* BOUTON PARTAGE SOCIAL (↪️) */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={handleShareReel}
            className="w-8.5 h-8.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition active:scale-75 cursor-pointer shadow-sm text-white"
            title="Partager ce Reel"
            aria-label="Partager ce Reel"
          >
            <Share2 className="w-4 h-4 fill-white/15 text-white stroke-[2]" />
          </button>
          <span className="text-[9px] font-bold text-white drop-shadow-md leading-none">
            {shareCount}
          </span>
        </div>
      </div>

      {/* =====================================================================
          2. TIROIR (BOTTOM SHEET) DE COMMENTAIRES EN DIRECT
         ===================================================================== */}
      {isOpenComments && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setIsOpenComments(false);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-gray-900 border-t border-gray-700 rounded-t-3xl p-4 text-white shadow-2xl z-10 h-[65vh] flex flex-col animate-in slide-in-from-bottom duration-300"
          >
            {/* Poignée supérieure */}
            <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-3" />

            {/* Header du tiroir */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-100 flex items-center gap-2">
                <span>💬</span>
                <span>Commentaires ({commentCount})</span>
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playTapBeep();
                  setIsOpenComments(false);
                }}
                className="text-gray-400 hover:text-white p-1.5 rounded-full bg-gray-800 hover:bg-gray-700 transition cursor-pointer"
                title="Fermer"
                aria-label="Fermer les commentaires"
              >
                ✕
              </button>
            </div>

            {/* LISTE DÉFILANTE DES COMMENTAIRES */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 select-text">
              {comments.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-12 flex flex-col items-center justify-center gap-2">
                  <span className="text-3xl">✨</span>
                  <p className="font-semibold text-gray-400">Soyez le premier à commenter ce Reel !</p>
                  <p className="text-[11px] text-gray-500">Posez une question ou partagez vos impressions.</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-300 overflow-hidden shrink-0 border border-white/20">
                      {c.userAvatarUrl ? (
                        <img src={c.userAvatarUrl} alt={c.userName} className="w-full h-full object-cover" />
                      ) : (
                        (c.userName || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 bg-gray-800/70 p-3 rounded-2xl border border-gray-700/60">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-400 text-[11px]">{c.userName || 'Membre Wameet'}</span>
                        <span className="text-[10px] text-gray-500">Récent</span>
                      </div>
                      <p className="text-gray-200 mt-1 leading-relaxed text-xs break-words">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* FORMULAIRE D'ENVOI DE COMMENTAIRE */}
            <form onSubmit={handlePostComment} className="pt-3 border-t border-gray-800 flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="flex-1 bg-gray-800 text-white text-xs px-4 py-2.5 rounded-full border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="bg-[#4169E1] hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30 active:scale-95 shrink-0"
              >
                {isSubmitting ? (
                  <span>...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. MODALE DE PARTAGE VIRAL SOCIAL WAMEET (DESKTOP & FALLBACK)
         ===================================================================== */}
      {isOpenShareModal && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setIsOpenShareModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl p-6 text-white shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setIsOpenShareModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-full bg-gray-800 hover:bg-gray-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto text-2xl border border-blue-500/30">
              <Share2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Partager ce Reel</h3>
              <p className="text-xs text-gray-400 mt-1 line-clamp-1">{reelTitle || 'Vidéo Wameet'}</p>
            </div>

            {/* Raccourcis Sociaux */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/reel/${reelId}`;
                  const msg = `Regarde ce Reel sur Wameet : ${reelTitle} 👉 ${url}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                  setIsOpenShareModal(false);
                }}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <span>💬 WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/reel/${reelId}`;
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                  setIsOpenShareModal(false);
                }}
                className="py-3 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <span>🌐 Facebook</span>
              </button>
            </div>

            {/* Copier le lien */}
            <button
              type="button"
              onClick={copyShareLink}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-gray-700 transition active:scale-95 cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-extrabold">Lien copié dans le presse-papier !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-gray-300" />
                  <span>Copier le lien direct</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SocialInteractions;
