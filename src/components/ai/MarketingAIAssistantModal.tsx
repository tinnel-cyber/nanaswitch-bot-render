import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NanaGeneratorModal } from '../../apps/nanagenerator/components/NanaGeneratorModal';
import { StoreUser, StoreSubscription } from '../../types';

export interface MarketingAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductName?: string;
  initialFeatures?: string;
  initialPrice?: number;
  storeName?: string;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onInsertIntoDescription?: (text: string) => void;
  onOpenUpgrade?: () => void;
}

/**
 * Interface Nana-générateur (Marque Blanche 100% neutre)
 * Remplace tout ancien modal par Nana-générateur (Assistant Texte, Création d'Image, Animation Vidéo)
 */
export const MarketingAIAssistantModal: React.FC<MarketingAIAssistantModalProps> = ({
  isOpen,
  onClose,
  initialProductName = '',
  initialFeatures = '',
  storeName = 'Votre Entreprise',
}) => {
  const combinedPrompt = [initialProductName, initialFeatures].filter(Boolean).join(' - ');

  return (
    <NanaGeneratorModal
      isOpen={isOpen}
      onClose={onClose}
      initialPrompt={combinedPrompt}
      storeName={storeName}
      isModal={true}
    />
  );
};

export default MarketingAIAssistantModal;
