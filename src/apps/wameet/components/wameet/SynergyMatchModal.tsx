/**
 * @file SynergyMatchModal.tsx
 * @description Modale de Célébration de Match Synergique Plein Écran (Prompt 4).
 * 
 * Spécifications :
 * - Plein écran ultra-immersif : fixed inset-0 z-50 backdrop-blur-2xl bg-slate-950/90
 * - Titre géant holographique : SYNERGY MATCH ! avec dégradé blanc / Bleu Royal
 * - Duo d'avatars face-à-face réunis par un diamant 💎 rayonnant
 * - Bouton direct : "Rejoindre le Wameet" (ouvre le salon Jitsi wameetUrl)
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), fonds sombres
 * - Zéro marque tierce
 */

import React, { useEffect } from 'react';
import { Video, Sparkles, ArrowRight } from 'lucide-react';
import { SynergyMatchResult } from '../../../../services/resonanceService';
import { wameetNotificationService } from '../../../../services/wameetNotificationService';
import { playTapBeep } from '../../../../utils/audio';

export interface SynergyMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: SynergyMatchResult | null;
  currentUserAvatar?: string;
  currentUserName?: string;
  creatorAvatar?: string;
  creatorName?: string;
}

export const SynergyMatchModal: React.FC<SynergyMatchModalProps> = ({
  isOpen,
  onClose,
  match,
  currentUserAvatar,
  currentUserName = 'Vous',
  creatorAvatar,
  creatorName = 'Partenaire'
}) => {
  useEffect(() => {
    if (isOpen && match) {
      wameetNotificationService.notifySynergyMatch({
        partnerName: creatorName,
        score: match.synergyScore || 98,
        roomId: match.wameetUrl
      }).catch(() => {});
    }
  }, [isOpen, match, creatorName]);

  if (!isOpen || !match) return null;

  const handleJoinWameet = () => {
    playTapBeep();
    if (typeof window !== 'undefined' && match.wameetUrl) {
      window.open(match.wameetUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 backdrop-blur-2xl bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Célébration Match Synergique"
    >
      <div className="w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 duration-300">
        {/* Badge Étoilé */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4169E1]/20 border border-[#4169E1]/40 text-blue-200 text-xs font-black uppercase tracking-wider mb-4 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-[#4169E1]" />
          <span>Résonance Réciproque</span>
        </div>

        {/* Titre SYNERGY MATCH */}
        <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white via-blue-200 to-[#4169E1] bg-clip-text text-transparent tracking-widest uppercase mb-6 drop-shadow-lg">
          SYNERGY MATCH !
        </h2>

        {/* Les Deux Avatars avec Diamant Rayonnant */}
        <div className="flex items-center justify-center gap-4 my-4 relative">
          {/* Avatar Utilisateur */}
          <div className="w-20 h-20 rounded-full border-4 border-[#4169E1] p-1 bg-slate-900 shadow-[0_0_25px_rgba(65,105,225,0.6)] shrink-0">
            {currentUserAvatar ? (
              <img
                src={currentUserAvatar}
                alt={currentUserName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#4169E1] flex items-center justify-center text-white font-black text-xl">
                {currentUserName.charAt(0)}
              </div>
            )}
          </div>

          {/* Diamant Central en Lévitation */}
          <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-white/20 flex items-center justify-center text-2xl shadow-xl animate-bounce shrink-0">
            💎
          </div>

          {/* Avatar Créateur */}
          <div className="w-20 h-20 rounded-full border-4 border-[#4169E1] p-1 bg-slate-900 shadow-[0_0_25px_rgba(65,105,225,0.6)] shrink-0">
            {creatorAvatar ? (
              <img
                src={creatorAvatar}
                alt={creatorName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#4169E1] flex items-center justify-center text-white font-black text-xl">
                {creatorName.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Message de Synergie */}
        <p className="text-sm text-slate-200 font-medium my-4 max-w-xs leading-relaxed">
          Une opportunité partagée vient d'éclore. Vous et <strong className="text-white font-bold">{creatorName}</strong> avez résonné mutuellement.
        </p>

        {/* Bouton Principal : Rejoindre le Wameet */}
        <button
          type="button"
          onClick={handleJoinWameet}
          className="w-full py-4 bg-[#4169E1] hover:bg-blue-600 text-white font-extrabold rounded-2xl shadow-[0_10px_30px_rgba(65,105,225,0.5)] active:scale-95 transition-all text-base flex items-center justify-center gap-2 cursor-pointer mt-4"
        >
          <Video className="w-5 h-5" />
          <span>Rejoindre le Wameet</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white mt-4 cursor-pointer font-bold transition-colors py-2"
        >
          Continuer à explorer le fil
        </button>
      </div>
    </div>
  );
};

export default SynergyMatchModal;
