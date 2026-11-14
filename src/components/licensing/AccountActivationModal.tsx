import React, { useEffect } from 'react';

export interface AccountActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetModuleId?: string;
  targetModuleName?: string;
  userId?: string;
  onSuccess?: (result: any) => void;
}

/**
 * AccountActivationModal (Rétro-compatibilité & Redirection Unique)
 * 
 * Conformément à la logique d'identification unifiée NanaSwitch :
 * L'accès à un module nécessitant un compte/univers redirige directement vers
 * le formulaire unique canonique de Création d'Univers ("Créer un Univers" / KycModal).
 * Aucun formulaire distinct ("champ noir") ne doit être affiché en parallèle.
 */
export const AccountActivationModal: React.FC<AccountActivationModalProps> = ({
  isOpen,
  onClose,
  targetModuleId,
  targetModuleName,
}) => {
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('nanasore_open_create_universe', {
            detail: {
              id: targetModuleId,
              name: targetModuleName || 'Mon Univers Marchand',
            },
          })
        );
      }
      onClose();
    }
  }, [isOpen, onClose, targetModuleId, targetModuleName]);

  return null;
};

export default AccountActivationModal;
