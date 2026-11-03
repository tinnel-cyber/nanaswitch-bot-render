/**
 * @file WameetAppointmentModal.tsx
 * @description Modale de Réservation de Rendez-vous Différé Wameet (Prompt 10).
 * 
 * Spécifications :
 * - Sélection de date (7 prochains jours) et créneau horaire
 * - Saisie du motif avec modération stricte (BANNED_WORDS)
 * - Option d'attacher un Mini-Pitch Vidéo/Audio de 30 secondes en différé
 * - Gating Mobile Money / CinetPay si tarif défini (Wameet Premium)
 * - Enregistrement Firestore dans 'wameet_appointments'
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), boutons épurés
 */

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  X, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Video, 
  Mic, 
  CreditCard,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { BANNED_WORDS } from './WameetModal';
import { createWameetAppointment, WameetAppointment } from '../../../../services/wameetAppointmentService';
import { wameetNotificationService } from '../../../../services/wameetNotificationService';
import { WameetAsyncPitchRecorder } from './WameetAsyncPitchRecorder';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../../../utils/audio';

export interface WameetAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  creatorHandle?: string;
  priceFcfa?: number;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onAppointmentCreated?: (appointment: WameetAppointment) => void;
}

const AVAILABLE_SLOTS = [
  '09:00',
  '10:30',
  '11:45',
  '14:00',
  '15:30',
  '17:00',
  '18:30',
  '20:00'
];

export const WameetAppointmentModal: React.FC<WameetAppointmentModalProps> = ({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  creatorAvatar,
  creatorHandle,
  priceFcfa = 0,
  currentUserId = 'user-current',
  currentUserName = 'Vous',
  currentUserAvatar,
  onAppointmentCreated
}) => {
  // Génération des 7 prochains jours
  const nextDays = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const isoDate = d.toISOString().split('T')[0];
      const dayLabel = i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      list.push({ isoDate, dayLabel });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(nextDays[0].isoDate);
  const [selectedSlot, setSelectedSlot] = useState<string>(AVAILABLE_SLOTS[1]);
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mode Asynchrone : Attacher un mini-pitch
  const [isPitchRecorderOpen, setIsPitchRecorderOpen] = useState(false);
  const [attachedPitch, setAttachedPitch] = useState<{
    url: string;
    mediaType: 'video' | 'audio';
    duration: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleValidateAndSubmit = async () => {
    const normalized = reason.trim().toLowerCase();

    // 1. Modération des motifs
    const isInvalid = BANNED_WORDS.some((word) => normalized.includes(word.toLowerCase()));
    if (isInvalid) {
      playCancelSound();
      setErrorMsg('Votre motif ne respecte pas les standards de la communauté Wameet.');
      return;
    }

    if (reason.trim().length < 8 && !attachedPitch) {
      playCancelSound();
      setErrorMsg('Veuillez préciser le motif de votre échange ou joindre un mini-pitch.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    playValidationBeep();

    try {
      const newApt = await createWameetAppointment({
        creatorId,
        creatorName,
        creatorAvatar,
        creatorHandle,
        requesterId: currentUserId,
        requesterName: currentUserName,
        requesterAvatar: currentUserAvatar,
        date: selectedDate,
        timeSlot: selectedSlot,
        reason: reason.trim() || 'Échange & Consultation privée',
        priceFcfa,
        pitchMediaUrl: attachedPitch?.url,
        pitchMediaType: attachedPitch?.mediaType,
        autoConfirm: true
      });

      // Notification de confirmation
      wameetNotificationService.notifyAppointmentReminder(newApt).catch(() => {});

      setIsSuccess(true);
      if (onAppointmentCreated) {
        onAppointmentCreated(newApt);
      }

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (e) {
      setErrorMsg('Erreur lors de la réservation. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* En-tête Supérieur Bleu Royal Wameet */}
        <div className="bg-[#4169E1] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
              <Calendar className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Agenda Wameet
                </span>
                {priceFcfa > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    Premium • {priceFcfa.toLocaleString('fr-FR')} FCFA
                  </span>
                )}
              </div>
              <h3 className="text-base font-black truncate mt-0.5">
                Réserver avec {creatorName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps de la Modale */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          {isSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-black text-slate-900">Rendez-vous Confirmé !</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Votre créneau du <strong>{selectedDate} à {selectedSlot}</strong> est enregistré. Une alerte de rappel vous sera envoyée 10 minutes avant.
              </p>
            </div>
          ) : isPitchRecorderOpen ? (
            /* Mode Enregistrement Asynchrone intégré */
            <div className="space-y-3">
              <WameetAsyncPitchRecorder
                onPitchRecorded={(res) => {
                  setAttachedPitch({
                    url: res.url,
                    mediaType: res.mediaType,
                    duration: res.durationSeconds
                  });
                  setIsPitchRecorderOpen(false);
                }}
                onCancel={() => setIsPitchRecorderOpen(false)}
              />
            </div>
          ) : (
            <>
              {/* 1. Sélection de la Date */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#4169E1]" />
                  <span>1. Choisir le jour</span>
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {nextDays.map((d) => {
                    const isSelected = selectedDate === d.isoDate;
                    return (
                      <button
                        key={d.isoDate}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedDate(d.isoDate);
                        }}
                        className={`px-3 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all border ${
                          isSelected
                            ? 'bg-[#4169E1] text-white border-[#4169E1] shadow-md shadow-blue-500/20'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {d.dayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Sélection du Créneau Horaire */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#4169E1]" />
                  <span>2. Choisir l'horaire</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_SLOTS.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedSlot(slot);
                        }}
                        className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#4169E1] text-white border-[#4169E1] shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Motif de l'Échange */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  3. Motif de votre rendez-vous
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex : Conseil sur mon projet e-commerce et revue de ma vitrine..."
                  rows={3}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1] focus:bg-white resize-none transition"
                />
              </div>

              {/* 4. Mini-Pitch Asynchrone (Optionnel) */}
              <div>
                {attachedPitch ? (
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#4169E1] text-white flex items-center justify-center">
                        {attachedPitch.mediaType === 'video' ? <Video className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Pitch {attachedPitch.mediaType === 'video' ? 'Vidéo' : 'Vocal'} joint ({attachedPitch.duration}s)
                        </p>
                        <p className="text-[10px] text-blue-600 font-semibold">Votre interlocuteur pourra le visionner</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedPitch(null)}
                      className="text-xs text-red-500 font-bold hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsPitchRecorderOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-2xl border-2 border-dashed border-[#4169E1]/40 bg-blue-50/50 hover:bg-blue-50 text-[#4169E1] text-xs font-black flex items-center justify-center gap-2 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Laisser un Mini-Pitch Vidéo/Vocal de 30s (Différé)</span>
                  </button>
                )}
              </div>

              {/* Message d'erreur dynamique */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Bouton de Confirmation Finale */}
              <button
                type="button"
                onClick={handleValidateAndSubmit}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#4169E1] hover:bg-blue-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {priceFcfa > 0 ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Payer & Confirmer ({priceFcfa.toLocaleString('fr-FR')} FCFA)</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirmer la réservation du Wameet</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WameetAppointmentModal;
