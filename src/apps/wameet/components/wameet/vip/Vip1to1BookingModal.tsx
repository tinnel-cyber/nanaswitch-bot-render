import React, { useState } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Video,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Crown,
  Lock,
  ArrowRight,
  FileText,
  User,
  Phone,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import {
  VipBusinessLounge,
  Vip1to1ConsultationType,
  Vip1to1Slot,
  Vip1to1BookingData
} from './types';
import {
  DEFAULT_VIP_1TO1_TYPES,
  DEFAULT_VIP_1TO1_SLOTS
} from './mockVipData';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface Vip1to1BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lounge: VipBusinessLounge;
  consultationTypes?: Vip1to1ConsultationType[];
  availableSlots?: Vip1to1Slot[];
  onConfirmBooking?: (booking: Vip1to1BookingData) => void;
}

export const Vip1to1BookingModal: React.FC<Vip1to1BookingModalProps> = ({
  isOpen,
  onClose,
  lounge,
  consultationTypes = DEFAULT_VIP_1TO1_TYPES,
  availableSlots = DEFAULT_VIP_1TO1_SLOTS,
  onConfirmBooking
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<string>(consultationTypes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-16');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('s-1');
  const [briefText, setBriefText] = useState<string>('');
  const [phoneContact, setPhoneContact] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // Filtrer les créneaux pour la date sélectionnée
  const slotsForSelectedDate = availableSlots.filter(
    (slot) => slot.date === selectedDate
  );

  const selectedType = consultationTypes.find((t) => t.id === selectedTypeId) || consultationTypes[0];
  const selectedSlot = availableSlots.find((s) => s.id === selectedSlotId);

  const handleConfirm = () => {
    setIsSubmitting(true);
    playValidationBeep();

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);

      const bookingData: Vip1to1BookingData = {
        consultationType: selectedType.title,
        date: selectedDate,
        time: selectedSlot ? selectedSlot.time : '10:00 - 10:45',
        memberNotes: briefText,
        memberPhone: phoneContact
      };

      onConfirmBooking?.(bookingData);
    }, 1000);
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-amber-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =====================================================================
            HEADER EXECUTIVE DU MODAL (OR & ONYX)
           ===================================================================== */}
        <div className="relative p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-amber-500/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src={lounge.coachAvatar}
                  alt={lounge.coachName}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-400"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Crown className="w-3 h-3 fill-slate-950" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    Séance Privée 1-to-1
                  </span>
                  <span className="text-xs text-slate-400">Chiffrement Wameet HD</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                  Réserver un 1-to-1 avec {lounge.coachName}
                </h2>
                <p className="text-xs text-slate-400">{lounge.coachRole}</p>
              </div>
            </div>

            <button
              onClick={handleResetAndClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =====================================================================
            CORPS DU MODAL (ÉCRAN SUCCÈS OU FORMULAIRE DE RÉSERVATION)
           ===================================================================== */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {isSuccess ? (
            /* ÉCRAN DE CONFIRMATION SUCCÈS */
            <div className="py-8 text-center space-y-4 animate-scale-up">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 mx-auto flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.5)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h3 className="text-2xl font-black text-white">
                Consultation 1-to-1 Confirmée !
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Votre créneau confidentiel a été réservé avec succès dans l'agenda privé de{' '}
                <strong className="text-amber-400">{lounge.coachName}</strong>.
              </p>

              {/* Récapitulatif de la séance */}
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950 border border-amber-500/25 text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Format :</span>
                  <span className="font-bold text-amber-300">{selectedType.title}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Date & Heure :</span>
                  <span className="font-bold text-white">
                    {selectedDate} à {selectedSlot ? selectedSlot.time : '10:00 GMT'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Canal vidéo :</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> Wameet Room Sécurisée 1-to-1
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Facturation :</span>
                  <span className="font-bold text-cyan-300">
                    Inclus dans votre Pass VIP Wameet
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={handleResetAndClose}
                  className="px-6 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:brightness-110 transition-all shadow-lg shadow-amber-500/20"
                >
                  Fermer & Accéder au Salon
                </button>
              </div>
            </div>
          ) : (
            /* FORMULAIRE DE RÉSERVATION ÉTAPE PAR ÉTAPE */
            <>
              {/* ÉTAPE 1 : CHOIX DU TYPE DE CONSULTATION */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  1. Choisissez le format de votre consultation
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {consultationTypes.map((type) => {
                    const isSelected = selectedTypeId === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedTypeId(type.id);
                        }}
                        className={`p-3.5 rounded-2xl text-left border transition-all relative ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                        )}
                        <h4 className="text-xs font-black text-white">{type.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {type.description}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/60 text-[10px]">
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {type.durationMinutes} min
                          </span>
                          <span className="font-bold text-emerald-400">{type.priceLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ÉTAPE 2 : SÉLECTION DE LA DATE DU CALENDRIER */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  2. Sélectionnez le jour de rendez-vous
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Vendredi 16 Oct', date: '2026-10-16', active: true },
                    { label: 'Samedi 17 Oct', date: '2026-10-17', active: true },
                    { label: 'Lundi 19 Oct', date: '2026-10-19', active: true },
                    { label: 'Mardi 20 Oct', date: '2026-10-20', active: false }
                  ].map((d) => {
                    const isSelected = selectedDate === d.date;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedDate(d.date);
                        }}
                        className={`p-3 rounded-xl text-center border font-bold text-xs transition-all ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ÉTAPE 3 : CRÉNEAUX DISPONIBLES */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  3. Choisissez un créneau horaire (GMT)
                </label>
                {slotsForSelectedDate.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slotsForSelectedDate.map((slot) => {
                      const isSelected = selectedSlotId === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => {
                            playTapBeep();
                            setSelectedSlotId(slot.id);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                            !slot.isAvailable
                              ? 'bg-slate-950/60 border-slate-800 text-slate-600 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <span>{slot.time}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                    Aucun créneau libre pour ce jour. Veuillez sélectionner une autre date.
                  </div>
                )}
              </div>

              {/* ÉTAPE 4 : BRIEF CONFIDENTIEL DE LA DEMANDE */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  4. Brief confidentiel / Objet de la consultation
                </label>
                <textarea
                  rows={3}
                  value={briefText}
                  onChange={(e) => setBriefText(e.target.value)}
                  placeholder="Ex : Revue de term sheet de levée 50M FCFA, arbitrage sur pacte d'associés, questions fiscales OHADA..."
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors leading-relaxed"
                />
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Secret professionnel garanti par la charte d'éthique Wameet Executive.
                </div>
              </div>
            </>
          )}
        </div>

        {/* =====================================================================
            PIED DE PAGE AVEC CTA DE RÉSERVATION
           ===================================================================== */}
        {!isSuccess && (
          <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Séance 1-to-1 incluse dans votre <strong className="text-white">Abonnement VIP</strong>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors flex-1 sm:flex-none"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-xs hover:brightness-110 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 flex-1 sm:flex-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Confirmation...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 fill-slate-950" />
                    Confirmer la séance 1-to-1
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vip1to1BookingModal;
