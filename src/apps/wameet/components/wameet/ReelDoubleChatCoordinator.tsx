import React, { useState, useRef, useEffect } from 'react';
import { UrgentChatPopup } from './UrgentChatPopup';
import { FullChatOverlay, FullChatOverlayCreatorInfo } from './FullChatOverlay';

export interface ReelDoubleChatCoordinatorProps {
  /** Informations sur le créateur du Reel */
  creator: FullChatOverlayCreatorInfo;
  /** Titre ou contexte du Reel actuel */
  reelContextTitle?: string;
  /** Callback lors de l'envoi d'un message */
  onSendMessage?: (text: string) => void;
  /** Profil de l'utilisateur courant */
  currentUser?: {
    name: string;
    handle: string;
    avatarUrl: string;
  };
  /** Afficher le popup de questions urgentes par défaut (défaut: true) */
  initialShowUrgentPopup?: boolean;
  /** Callback quand l'overlay complet s'ouvre ou se ferme */
  onFullChatStateChange?: (isOpen: boolean) => void;
  /** Position personnalisée pour le popup urgent */
  urgentPopupClassName?: string;
  /** Classes CSS supplémentaires */
  className?: string;
  /** Render prop pour injecter les handlers dans les boutons de navigation basse */
  children?: (handlers: {
    isUrgentPopupVisible: boolean;
    isFullChatOpen: boolean;
    openFullChat: () => void;
    closeFullChat: () => void;
    showUrgentPopup: () => void;
    hideUrgentPopup: () => void;
    handleChatClick: (e: React.MouseEvent) => void;
    handleChatPointerDown: (e: React.PointerEvent) => void;
    handleChatPointerUp: (e: React.PointerEvent) => void;
  }) => React.ReactNode;
}

/**
 * PROMPT 4 : ReelDoubleChatCoordinator
 * Coordinateur du Double Mode de Chat Flottant (Popup Urgent et Ouverture Totale)
 * 
 * Directives UI/UX au millimètre :
 * 1. État Option 1 : UrgentChatPopup flottant juste au-dessus du bouton Chat
 *    (Questions urgentes ? (Chat rapide) ×)
 * 2. État Option 2 : FullChatOverlay avec glissement ultra-fluide et floutage backdrop-blur-2xl bg-black/40
 * 3. Déclencheurs de l'ouverture totale :
 *    - Clic sur "Questions urgentes"
 *    - Double-clic sur le bouton Chat (< 320ms)
 *    - Clic prolongé (Long Press > 480ms) sur le bouton Chat
 *    - Clic direct
 */
export const ReelDoubleChatCoordinator: React.FC<ReelDoubleChatCoordinatorProps> = ({
  creator,
  reelContextTitle,
  onSendMessage,
  currentUser,
  initialShowUrgentPopup = true,
  onFullChatStateChange,
  urgentPopupClassName = '',
  className = '',
  children
}) => {
  // Variables d'état demandées par le Prompt 4
  const [isUrgentPopupVisible, setIsUrgentPopupVisible] = useState(initialShowUrgentPopup);
  const [isFullChatOpen, setIsFullChatOpen] = useState(false);

  // Références pour la détection du double-clic et du long press
  const lastClickTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  // Synchronisation avec callback parent
  const handleSetFullChatOpen = (open: boolean) => {
    setIsFullChatOpen(open);
    onFullChatStateChange?.(open);
    if (open) {
      // Masquer le micro-popup une fois le chat complet ouvert
      setIsUrgentPopupVisible(false);
    }
  };

  /**
   * Gestion du clic prolongé (Long Press)
   */
  const handleChatPointerDown = (e: React.PointerEvent) => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      handleSetFullChatOpen(true);
    }, 480);
  };

  const handleChatPointerUp = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  /**
   * Gestion du clic & double-clic
   */
  const handleChatClick = (e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }

    const now = Date.now();
    const elapsed = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    if (elapsed < 320) {
      // Double-clic détecté -> Ouverture totale immédiate !
      handleSetFullChatOpen(true);
    } else {
      // Clic simple -> Ouvre le chat complet ou fait réapparaître le popup urgent
      if (!isFullChatOpen) {
        handleSetFullChatOpen(true);
      }
    }
  };

  // Nettoyage des timers au démontage
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  return (
    <div className={`contents ${className}`}>
      {/* Option 1 : Le Popup Urgent Aérien au-dessus du bouton Chat */}
      <UrgentChatPopup
        isOpen={isUrgentPopupVisible && !isFullChatOpen}
        onOpenFullChat={() => handleSetFullChatOpen(true)}
        onClose={() => setIsUrgentPopupVisible(false)}
        className={urgentPopupClassName}
      />

      {/* Option 2 : L'Ouverture Totale du Chat en Plein Écran Flouté */}
      <FullChatOverlay
        isOpen={isFullChatOpen}
        onClose={() => handleSetFullChatOpen(false)}
        creator={creator}
        reelContextTitle={reelContextTitle}
        onSendMessage={onSendMessage}
        currentUser={currentUser}
      />

      {/* Injection des gestionnaires d'événements pour les boutons de navigation */}
      {children?.({
        isUrgentPopupVisible,
        isFullChatOpen,
        openFullChat: () => handleSetFullChatOpen(true),
        closeFullChat: () => handleSetFullChatOpen(false),
        showUrgentPopup: () => setIsUrgentPopupVisible(true),
        hideUrgentPopup: () => setIsUrgentPopupVisible(false),
        handleChatClick,
        handleChatPointerDown,
        handleChatPointerUp
      })}
    </div>
  );
};

export default ReelDoubleChatCoordinator;
