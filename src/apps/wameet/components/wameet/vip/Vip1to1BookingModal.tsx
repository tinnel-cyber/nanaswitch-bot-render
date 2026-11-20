import React, { useState, useEffect, useMemo } from 'react';
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
  Mail,
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
} from './mockVipData';
import { supabase } from '../../../../../lib/supabase';
import {
  getUpcomingBookingDates,
  STANDARD_1TO1_TIME_SLOTS,
  submitCoachingBooking,
} from '../../../../../services/coachingBookingService';
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
  onConfirmBooking
}) => {
  const upcomingDates = useMemo(() => getUpcomingBookingDates(7), []);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(consultationTypes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(upcomingDates[0]?.date || new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(STANDARD_1TO1_TIME_SLOTS[0]);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneContact, setPhoneContact] = useState<string>('');
  const [briefText, setBriefText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedRoomUrl, setConfirmedRoomUrl] = useState<string>('');

  // Pré-remplissage depuis Supabase Auth (ZÉRO Firebase)
  useEffect(() => {
    if (!isOpen) return;
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (user) {
        if (!email && user.email) setEmail(user.email);
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (!fullName && metaName) setFullName(String(metaName));
      }
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedType = consultationTypes.find((t) => t.id === selectedTypeId) || consultationTypes[0];

  const handleConfirm = async () => {
    setSubmitError(null);
    if (!fullName.trim() || !phoneContact.trim()) {
      setSubmitError('Veuillez renseigner votre nom complet et votre numéro WhatsApp.');
      return;
    }

    setIsSubmitting(true);
    playValidationBeep();

    const res = await submitCoachingBooking({
      sessionId: lounge.id || 'vip-1to1',
      storeSlug: lounge.id || 'nanasore',
      coachName: lounge.coachName,
      consultationType: selectedType?.title || 'Coaching 1-to-1',
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      fullName,
      email,
      whatsappPhone: phoneContact,
      objectiveNotes: briefText,
    });

    setIsSubmitting(false);

    if (!res.success || !res.booking) {
      setSubmitError(res.error || "Erreur lors de l'enregistrement du rendez-vous.");
      return;
    }

    setConfirmedRoomUrl(res.booking.roomUrl || '');
    setIsSuccess(true);

    const bookingData: Vip1to1BookingData = {
      consultationType: selectedType?.title || 'Coaching 1-to-1',
      date: selectedDate,
      time: selectedTimeSlot,
      memberNotes: briefText,
      memberPhone: phoneContact
    };

    onConfirmBooking?.(bookingData);
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setSubmitError(null);
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
                    {selectedDate} à {selectedTimeSlot}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Participant :</span>
                  <span className="font-bold text-white">{fullName} ({phoneContact})</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Canal vidéo :</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> Salle Visio Privée 1-to-1 (Supabase)
                  </span>
                </div>
                {confirmedRoomUrl && (
                  <div className="pt-2 border-t border-slate-800">
                    <a
                      href={confirmedRoomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-amber-300 hover:underline break-all"
                    >
                      🔗 Lien Visio 1-to-1 : {confirmedRoomUrl}
                    </a>
                  </div>
                )}
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
              {submitError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

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

              {/* ÉTAPE 2 : SÉLECTION DE LA DATE RÉELLE */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  2. Sélectionnez le jour de rendez-vous
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
                  {upcomingDates.slice(0, 4).map((d) => {
                    const isSelected = selectedDate === d.date;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedDate(d.date);
                        }}
                        className={`p-2.5 rounded-xl text-center border font-bold text-xs transition-all ${
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
                <input
                  type="date"
                  min={upcomingDates[0]?.date}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* ÉTAPE 3 : CRÉNEAUX HORAIRES */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  3. Choisissez un créneau horaire (GMT)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STANDARD_1TO1_TIME_SLOTS.map((slot) => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedTimeSlot(slot);
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <span>{slot}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ÉTAPE 4 : COORDONNÉES DU PARTICIPANT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-amber-400" /> Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Votre nom et prénom"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-amber-400" /> WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneContact}
                    onChange={(e) => setPhoneContact(e.target.value)}
                    placeholder="+226 70 00 00 00"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-amber-400" /> E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* ÉTAPE 5 : BRIEF CONFIDENTIEL DE LA DEMANDE */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  5. Brief confidentiel / Questions à soumettre
                </label>
                <textarea
                  rows={3}
                  value={briefText}
                  onChange={(e) => setBriefText(e.target.value)}
                  placeholder="Décrivez votre objectif, vos questions ou les données que vous souhaitez aborder avec le coach..."
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors leading-relaxed"
                />
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Enregistrement direct et confidentiel sur Supabase.
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
