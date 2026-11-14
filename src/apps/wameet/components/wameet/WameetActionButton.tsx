import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface WameetActionButtonProps {
  reelId: string;
  reelTitle: string;
  reelThumbnailUrl?: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl?: string;
  currentUserId: string;
  onOpenChat?: (creator: {
    name: string;
    handle: string;
    avatarUrl: string;
    contextReelTitle?: string;
  }) => void;
  className?: string;
}

export const WameetActionButton: React.FC<WameetActionButtonProps> = ({
  reelId,
  reelTitle,
  reelThumbnailUrl,
  creatorId,
  creatorName,
  creatorAvatarUrl,
  currentUserId,
  onOpenChat,
  className = ''
}) => {
  const [isCreatorOnline, setIsCreatorOnline] = useState<boolean>(true);
  const [isStartingChat, setIsStartingChat] = useState<boolean>(false);

  useEffect(() => {
    // Vérifier le statut de présence en ligne du créateur
    let isMounted = true;
    const checkOnlineStatus = async () => {
      if (!creatorId) return;
      try {
        const cleanCreatorId = creatorId.replace('@', '').trim();
        const userDoc = await getDoc(doc(db, 'users', cleanCreatorId));
        if (userDoc.exists() && isMounted) {
          const data = userDoc.data();
          if (data.isOnline !== undefined) {
            setIsCreatorOnline(Boolean(data.isOnline));
          }
        }
      } catch (err) {
        console.warn('[WAMEET ACTION BUTTON] Statut présence créateur :', err);
      }
    };
    checkOnlineStatus();
    return () => {
      isMounted = false;
    };
  }, [creatorId]);

  const handleOpenPrivateChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();

    if (!currentUserId || !creatorId) {
      if (onOpenChat) {
        onOpenChat({
          name: creatorName,
          handle: creatorId.startsWith('@') ? creatorId : `@${creatorId}`,
          avatarUrl: creatorAvatarUrl || '',
          contextReelTitle: reelTitle
        });
      }
      return;
    }

    if (currentUserId === creatorId) {
      alert("Il s'agit de votre propre Reel !");
      return;
    }

    setIsStartingChat(true);
    try {
      // ID unique du canal de chat P2P (tri alphabétique pour éviter les doublons)
      const cleanCurrent = currentUserId.replace('@', '').trim();
      const cleanCreator = creatorId.replace('@', '').trim();
      const chatId = [cleanCurrent, cleanCreator].sort().join('_');

      try {
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
          // Création du canal de discussion initial avec le contexte du Reel
          await setDoc(chatRef, {
            participants: [cleanCurrent, cleanCreator],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: `Intérêt pour le Reel : ${reelTitle}`,
            referencedReel: {
              reelId,
              title: reelTitle,
              thumbnailUrl: reelThumbnailUrl || ''
            }
          });
        }
      } catch (dbErr) {
        console.warn('[WAMEET ACTION BUTTON] Création canal chats storage :', dbErr);
      }

      playValidationBeep();

      // Priorité 1 : Ouvrir le tiroir / overlay de chat intégré si fourni
      if (onOpenChat) {
        onOpenChat({
          name: creatorName,
          handle: creatorId.startsWith('@') ? creatorId : `@${creatorId}`,
          avatarUrl: creatorAvatarUrl || '',
          contextReelTitle: reelTitle
        });
      } else {
        // Priorité 2 : Navigation vers la route de messagerie P2P
        window.location.href = `/messages/${chatId}?contextReel=${encodeURIComponent(reelId)}`;
      }
    } catch (err) {
      console.error("Erreur lors de l'ouverture du chat Wameet :", err);
      alert("Impossible d'ouvrir la discussion pour le moment.");
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-1 select-none ${className}`}>
      <button
        type="button"
        onClick={handleOpenPrivateChat}
        disabled={isStartingChat}
        className="relative p-3.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-lg transition-all duration-300 transform active:scale-90 flex items-center justify-center cursor-pointer disabled:opacity-50"
        title={`Discuter en privé avec ${creatorName}`}
        aria-label={`Contacter ${creatorName} en privé`}
      >
        {/* Badge de Présence En Ligne (Vert Clignotant) */}
        {isCreatorOnline && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center pointer-events-none">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
          </span>
        )}

        {/* Icône Wameet / Fusée / Message Direct */}
        {isStartingChat ? (
          <svg className="w-5 h-5 animate-spin text-white drop-shadow-md" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 drop-shadow-md text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
      <span className="text-[10px] font-extrabold text-white drop-shadow-md">
        Contact
      </span>
    </div>
  );
};

export default WameetActionButton;
