import React, { useState } from 'react';
import { WameetPhoneAuth } from './WameetPhoneAuth';
import { WameetContactSync, WameetMatchedUser } from './WameetContactSync';
import { RegistrationFinalStep, RegistrationFinalStepFormData } from './RegistrationFinalStep';
import { isSuperAdminLocally } from '../../../../services/superAdminService';
import { X, CheckCircle, Smartphone, Users, UserCheck } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface WameetOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: 'phone' | 'profile' | 'contacts';
  currentUser?: any;
  onUserAuthenticated?: (result: any) => void;
  onSyncComplete?: (matchedContacts: WameetMatchedUser[]) => void;
}

export const WameetOnboardingModal: React.FC<WameetOnboardingModalProps> = ({
  isOpen,
  onClose,
  initialStep = 'phone',
  currentUser,
  onUserAuthenticated,
  onSyncComplete
}) => {
  const [currentStep, setCurrentStep] = useState<'phone' | 'profile' | 'contacts'>(() => {
    if (currentUser?.phoneNumber || currentUser?.phone) return 'contacts';
    return initialStep;
  });

  const [authenticatedUser, setAuthenticatedUser] = useState<any>(currentUser || null);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState<string>(
    currentUser?.phoneNumber || currentUser?.phone || ''
  );

  if (!isOpen || isSuperAdminLocally(currentUser)) return null;

  const handlePhoneSuccess = (result: { user: any; phoneNumber: string; isNewUser: boolean }) => {
    setAuthenticatedUser(result.user);
    setVerifiedPhoneNumber(result.phoneNumber);
    if (onUserAuthenticated) {
      onUserAuthenticated(result);
    }
    // Si nouvel utilisateur -> étape finale d'inscription avec acceptation légale
    if (result.isNewUser) {
      setCurrentStep('profile');
    } else {
      setCurrentStep('contacts');
    }
  };

  const handleProfileComplete = async (formData: RegistrationFinalStepFormData) => {
    playValidationBeep();
    setAuthenticatedUser((prev: any) => ({
      ...prev,
      displayName: formData.fullName,
      username: formData.username,
      photoURL: formData.avatarUrl,
      bio: formData.bio,
      isLegalAccepted: formData.isLegalAccepted
    }));
    // Transition vers la synchronisation des contacts
    setCurrentStep('contacts');
  };

  const handleSyncComplete = (matched: WameetMatchedUser[]) => {
    if (onSyncComplete) {
      onSyncComplete(matched);
    }
    onClose();
  };

  return (
    <div
      data-scroll-container="true"
      className="fixed inset-0 z-[2000] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto overscroll-y-contain animate-in fade-in duration-200"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div className="relative w-full max-w-lg my-4 sm:my-auto pb-12 sm:pb-0">
        {/* Bouton fermer modal */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="absolute -top-3 -right-3 z-50 w-9 h-9 rounded-full bg-slate-900 border-2 border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition shadow-xl cursor-pointer"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Indicateur d'étapes */}
        <div className="mb-3 flex items-center justify-center gap-1.5 sm:gap-2">
          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-black transition-all ${
              currentStep === 'phone'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-white/80 text-emerald-700 border border-emerald-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>1. SMS</span>
            {currentStep !== 'phone' && <CheckCircle className="w-3 h-3 text-emerald-600 ml-0.5" />}
          </div>

          <span className="text-slate-400 font-bold text-xs">→</span>

          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-black transition-all ${
              currentStep === 'profile'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : currentStep === 'contacts'
                ? 'bg-white/80 text-emerald-700 border border-emerald-300'
                : 'bg-white/40 text-slate-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>2. Profil & CGU</span>
            {currentStep === 'contacts' && <CheckCircle className="w-3 h-3 text-emerald-600 ml-0.5" />}
          </div>

          <span className="text-slate-400 font-bold text-xs">→</span>

          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-black transition-all ${
              currentStep === 'contacts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-white/40 text-slate-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>3. Répertoire</span>
          </div>
        </div>

        {/* Contenu de l'étape active */}
        {currentStep === 'phone' && (
          <WameetPhoneAuth
            onSuccess={handlePhoneSuccess}
            onCancel={onClose}
          />
        )}

        {currentStep === 'profile' && (
          <RegistrationFinalStep
            verifiedPhoneNumber={verifiedPhoneNumber}
            onSubmit={handleProfileComplete}
            onCancel={onClose}
          />
        )}

        {currentStep === 'contacts' && (
          <WameetContactSync
            currentUserId={authenticatedUser?.uid || currentUser?.uid || currentUser?.id}
            currentUserPhoneNumber={verifiedPhoneNumber}
            onComplete={handleSyncComplete}
            onSkip={onClose}
          />
        )}
      </div>
    </div>
  );
};
export default WameetOnboardingModal;
