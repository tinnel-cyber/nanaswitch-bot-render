/**
 * @file WameetModal.tsx
 * @description Modale d'Intention & Filtrage de Modération Wameet (Prompt 5).
 * 
 * Spécifications :
 * - Formulaire d'invitation avec champ : "Quel est le motif de votre échange ?"
 * - Algorithme de modération des motifs :
 *   - Liste de mots interdits (BANNED_WORDS : arnaque, spam, insulte, crypto_fake, etc.)
 *   - Alerte dynamique rouge si mot interdit : "Votre motif ne respecte pas les standards de la communauté Wameet."
 *   - Vérification de longueur minimale (>= 10 caractères)
 * - Génération d'un identifiant de session unique (wm-${Date.now()})
 * - Déclenchement de onSubmitSuccess(wameetId)
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF)
 * - Zéro marque tierce
 */

import React, { useState } from 'react';
import { Video, AlertCircle, X, Sparkles, Send, Calendar } from 'lucide-react';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../../../utils/audio';

export const BANNED_WORDS = [
  'arnaque',
  'escroquerie',
  'spam',
  'insulte',
  'crypto_fake',
  'haine',
  'porn',
  'sexe',
  'viol',
  'drogue',
  'fake',
  'fraude',
  'phishing',
  'injure',
  'racisme',
  'violence',
  'piratage',
  'terrorisme',
  'vol',
  'menace'
];

export interface WameetModalProps {
  isOpen: boolean;
  targetAuthorName?: string;
  creatorName?: string;
  creatorHandle?: string;
  creatorAvatar?: string;
  onClose: () => void;
  onSubmitSuccess?: (wameetId: string) => void;
  onInviteCreated?: (inviteData: {
    wameetId: string;
    inviteUrl: string;
    creatorName: string;
    reason: string;
    time: string;
  }) => void;
  onOpenScheduleAppointment?: () => void;
}

export const WameetModal: React.FC<WameetModalProps> = ({
  isOpen,
  targetAuthorName,
  creatorName,
  creatorHandle,
  creatorAvatar,
  onClose,
  onSubmitSuccess,
  onInviteCreated,
  onOpenScheduleAppointment
}) => {
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetName = targetAuthorName || creatorName || 'Créateur Wameet';

  const handleValidation = () => {
    const normalized = reason.trim().toLowerCase();

    // 1. Détection de mots interdits
    const isInvalid = BANNED_WORDS.some((word) => normalized.includes(word.toLowerCase()));
    if (isInvalid) {
      playCancelSound();
      setErrorMsg('Votre motif ne respecte pas les standards de la communauté Wameet.');
      return;
    }

    // 2. Vérification de longueur minimale (au moins 10 caractères)
    if (reason.trim().length < 10) {
      playCancelSound();
      setErrorMsg('Veuillez préciser votre motif en au moins 10 caractères.');
      return;
    }

    playValidationBeep();
    setErrorMsg(null);
    const mockWameetId = `wm-${Date.now()}`;

    if (onSubmitSuccess) {
      onSubmitSuccess(mockWameetId);
    }

    if (onInviteCreated) {
      const inviteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/wameet/${mockWameetId}?creator=${encodeURIComponent(targetName)}&reason=${encodeURIComponent(reason)}`
        : `/wameet/${mockWameetId}?creator=${encodeURIComponent(targetName)}&reason=${encodeURIComponent(reason)}`;

      onInviteCreated({
        wameetId: mockWameetId,
        inviteUrl,
        creatorName: targetName,
        reason,
        time: 'À convenir'
      });
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Invitation Wameet"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        {/* En-tête de la Modale */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#4169E1]/10 text-[#4169E1] flex items-center justify-center shadow-xs">
              <Video className="w-5 h-5 text-[#4169E1]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Invitation Wameet</h3>
              <p className="text-[11px] text-slate-500 font-medium">Demande d'échange avec {targetName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Champ de Saisie du Motif */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
            Quel est le motif de votre échange ?
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Ex : Je souhaite discuter d'une opportunité de partenariat ou d'une session de coaching..."
            className="w-full h-28 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20 resize-none transition-all font-medium"
          />
        </div>

        {/* Message d'Erreur Dynamique de Modération */}
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Boutons d'Action */}
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleValidation}
            className="flex-1 py-3 bg-[#4169E1] hover:bg-blue-600 text-white font-extrabold rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Envoyer l'invitation</span>
          </button>
        </div>

        {/* Option Prise de Rendez-vous Différé */}
        {onOpenScheduleAppointment && (
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
              onOpenScheduleAppointment();
            }}
            className="w-full py-2.5 px-3 rounded-xl border border-[#4169E1]/30 bg-blue-50/70 hover:bg-blue-100 text-[#4169E1] text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer mt-1"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Ou programmer un rendez-vous différé</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default WameetModal;
