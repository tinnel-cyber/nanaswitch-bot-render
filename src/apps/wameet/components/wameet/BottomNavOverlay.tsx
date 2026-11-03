import React from 'react';
import { Home, Compass, Plus, Users, MessageSquare } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export type BottomNavTab = 'home' | 'discover' | 'create' | 'friends' | 'chat';

export interface BottomNavOverlayProps {
  /** Onglet actuellement actif */
  activeTab?: BottomNavTab;
  /** Callback lors du clic sur Accueil */
  onOpenHome?: () => void;
  /** Callback lors du clic sur Découvrir */
  onOpenDiscover?: () => void;
  /** Callback lors du clic sur Ajouter un reel (+) */
  onAddReel?: () => void;
  /** Callback lors du clic sur Amis */
  onOpenFriends?: () => void;
  /** Callback lors du clic sur Chat */
  onOpenChat?: () => void;
  /** Callback lors d'un double-clic sur le bouton Chat */
  onChatDoubleClick?: (e: React.MouseEvent) => void;
  /** Callback lors de l'appui long / pointer down sur le bouton Chat */
  onChatPointerDown?: (e: React.PointerEvent) => void;
  /** Callback lors du relâchement / pointer up sur le bouton Chat */
  onChatPointerUp?: (e: React.PointerEvent) => void;
  /** Nombre de messages non lus sur le Chat (optionnel) */
  unreadChatCount?: number;
  /** Classes CSS supplémentaires */
  className?: string;
}

/**
 * PROMPT 3 : BottomNavOverlay
 * L’Interface de Navigation Basse Flottante (L’Accès Rapide)
 * 
 * Contrainte absolue :
 * AUCUN bloc d'arrière-plan, AUCUN panneau flouté ou blanc.
 * Les icônes et les textes sont blancs, très fins et flottent librement à l'écran
 * avec de l'ombrage de texte (drop-shadow-md).
 * 
 * Directives au millimètre près :
 * - Positionnement : Fixé en bas à gauche (absolute bottom-4 left-4 z-40 flex items-center gap-5 text-white)
 * - Bouton Accueil : Home fine avec "Accueil" en dessous
 *   (text-[9px] font-medium text-white/95 drop-shadow-md flex flex-col items-center gap-1 hover:opacity-100 opacity-90 transition-opacity)
 * - Bouton Découvrir : Compass fine avec "Découvrir" en dessous
 * - Bouton Ajouter un reel (+) : Bouton central libre et stylisé
 *   (border border-white/40 p-2 rounded-xl text-white/95 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform)
 * - Bouton Amis : Users fine avec "Amis" en dessous
 * - Bouton Chat : MessageSquare fine avec "Chat" en dessous
 */
export const BottomNavOverlay: React.FC<BottomNavOverlayProps> = ({
  activeTab = 'home',
  onOpenHome,
  onOpenDiscover,
  onAddReel,
  onOpenFriends,
  onOpenChat,
  onChatDoubleClick,
  onChatPointerDown,
  onChatPointerUp,
  unreadChatCount,
  className = ''
}) => {
  const handleHomeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onOpenHome?.();
  };

  const handleDiscoverClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onOpenDiscover?.();
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    onAddReel?.();
  };

  const handleFriendsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onOpenFriends?.();
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onOpenChat?.();
  };

  return (
    <nav
      role="navigation"
      aria-label="Navigation basse rapide"
      onClick={e => e.stopPropagation()}
      className={`absolute bottom-4 left-4 z-40 flex items-center gap-5 text-white select-none pointer-events-auto flex-nowrap whitespace-nowrap ${className}`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
    >
      {/* 1. Bouton Accueil : Home + "Accueil" */}
      <button
        type="button"
        onClick={handleHomeClick}
        aria-label="Accueil"
        title="Accueil"
        className={`text-[9px] font-medium text-white/95 drop-shadow-md flex flex-col items-center gap-1 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-0 p-0 focus:outline-none shrink-0 ${
          activeTab === 'home' ? 'opacity-100 font-semibold' : 'opacity-90'
        }`}
      >
        <Home
          className={`w-5 h-5 drop-shadow-md transition-transform ${
            activeTab === 'home' ? 'stroke-[2.2] scale-105' : 'stroke-[1.75]'
          }`}
        />
        <span className="drop-shadow-md leading-none">Accueil</span>
      </button>

      {/* 2. Bouton Découvrir : Compass + "Découvrir" */}
      <button
        type="button"
        onClick={handleDiscoverClick}
        aria-label="Découvrir"
        title="Découvrir"
        className={`text-[9px] font-medium text-white/95 drop-shadow-md flex flex-col items-center gap-1 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-0 p-0 focus:outline-none shrink-0 ${
          activeTab === 'discover' ? 'opacity-100 font-semibold' : 'opacity-90'
        }`}
      >
        <Compass
          className={`w-5 h-5 drop-shadow-md transition-transform ${
            activeTab === 'discover' ? 'stroke-[2.2] scale-105' : 'stroke-[1.75]'
          }`}
        />
        <span className="drop-shadow-md leading-none">Découvrir</span>
      </button>

      {/* 3. Bouton Ajouter un reel (+) : Bouton central stylisé dans un carré ouvert ultra-fin */}
      <button
        type="button"
        onClick={handleAddClick}
        aria-label="Ajouter un reel"
        title="Créer un nouveau Reel"
        className="border border-white/40 p-2 rounded-xl text-white/95 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer bg-transparent shadow-sm focus:outline-none shrink-0 group"
      >
        <Plus className="w-4 h-4 stroke-[2.2] drop-shadow-md group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* 4. Bouton Amis : Users + "Amis" */}
      <button
        type="button"
        onClick={handleFriendsClick}
        aria-label="Amis"
        title="Amis"
        className={`text-[9px] font-medium text-white/95 drop-shadow-md flex flex-col items-center gap-1 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-0 p-0 focus:outline-none shrink-0 ${
          activeTab === 'friends' ? 'opacity-100 font-semibold' : 'opacity-90'
        }`}
      >
        <Users
          className={`w-5 h-5 drop-shadow-md transition-transform ${
            activeTab === 'friends' ? 'stroke-[2.2] scale-105' : 'stroke-[1.75]'
          }`}
        />
        <span className="drop-shadow-md leading-none">Amis</span>
      </button>

      {/* 5. Bouton Chat : MessageSquare + "Chat" */}
      <button
        type="button"
        onClick={handleChatClick}
        onDoubleClick={e => {
          e.stopPropagation();
          onChatDoubleClick?.(e);
        }}
        onPointerDown={onChatPointerDown}
        onPointerUp={onChatPointerUp}
        aria-label="Chat"
        title="Chat & Messages (Clic = ouvrir, Clic prolongé ou double-clic = chat complet)"
        className={`text-[9px] font-medium text-white/95 drop-shadow-md flex flex-col items-center gap-1 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-0 p-0 focus:outline-none shrink-0 relative ${
          activeTab === 'chat' ? 'opacity-100 font-semibold' : 'opacity-90'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <MessageSquare
            className={`w-5 h-5 drop-shadow-md transition-transform ${
              activeTab === 'chat' ? 'stroke-[2.2] scale-105' : 'stroke-[1.75]'
            }`}
          />
          {typeof unreadChatCount === 'number' && unreadChatCount > 0 && (
            <span
              className="absolute -top-1 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center border border-white/60 shadow-sm"
              aria-label={`${unreadChatCount} messages non lus`}
            >
              {unreadChatCount > 99 ? '99+' : unreadChatCount}
            </span>
          )}
        </div>
        <span className="drop-shadow-md leading-none">Chat</span>
      </button>
    </nav>
  );
};

export default BottomNavOverlay;
