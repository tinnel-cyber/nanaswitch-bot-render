/**
 * @file Live1to1BookingModal.tsx
 * @description Modale professionnelle de prise de rendez-vous Coaching 1-to-1 (100 % Supabase Auth & DB).
 * Permet aux étudiants / spectateurs de réserver un créneau réel et soumettre leurs données/objectifs,
 * et au formateur / coach de consulter toutes les demandes reçues.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  Video,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import {
  CoachingBookingRecord,
  getUpcomingBookingDates,
  STANDARD_1TO1_TIME_SLOTS,
  submitCoachingBooking,
  listCoachingBookingsForStore,
} from '../../../../services/coachingBookingService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface Live1to1BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  storeSlug: string;
  coachName: string;
  isHost?: boolean;
  defaultRoomUrl?: string;
}

export const Live1to1BookingModal: React.FC<Live1to1BookingModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  storeSlug,
  coachName,
  isHost = false,
  defaultRoomUrl,
}) => {
  const upcomingDates = useMemo(() => getUpcomingBookingDates(7), []);
  const [date, setDate] = useState<string>(upcomingDates[0]?.date || new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState<string>(STANDARD_1TO1_TIME_SLOTS[0]);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [whatsappPhone, setWhatsappPhone] = useState<string>('');
  const [objectiveNotes, setObjectiveNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<CoachingBookingRecord | null>(null);

  // Liste des rendez-vous (vue Formateur / Coach)
  const [bookingsList, setBookingsList] = useState<CoachingBookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (isHost) {
      setLoadingBookings(true);
      listCoachingBookingsForStore(storeSlug)
        .then((rows) => setBookingsList(rows))
        .finally(() => setLoadingBookings(false));
    } else {
      supabase.auth.getUser().then(({ data }) => {
        const u = data?.user;
        if (u) {
          if (!email && u.email) setEmail(u.email);
          const metaName = u.user_metadata?.full_name || u.user_metadata?.name;
          if (!fullName && metaName) setFullName(String(metaName));
        }
      }).catch(() => {});
    }
  }, [isOpen, isHost, storeSlug]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const res = await submitCoachingBooking({
      sessionId,
      storeSlug,
      coachName,
      consultationType: 'Coaching Privé 1-to-1',
      date,
      timeSlot,
      fullName,
      email,
      whatsappPhone,
      objectiveNotes,
      roomUrl: defaultRoomUrl,
    });

    setIsSubmitting(false);

    if (!res.success || !res.booking) {
      setErrorMsg(res.error || "Impossible d'enregistrer votre demande.");
      return;
    }

    playValidationBeep();
    setCreatedBooking(res.booking);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">
                {isHost ? 'Demandes de Rendez-vous 1-to-1' : `Réserver un Coaching 1-to-1`}
              </h3>
              <p className="text-xs text-blue-100">
                {isHost
                  ? `Formulaires soumis par vos étudiants & clients (${bookingsList.length})`
                  : `Avec ${coachName} • Enregistrement sécurisé Supabase`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isHost ? (
            loadingBookings ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span>Chargement des rendez-vous 1-to-1 depuis Supabase...</span>
              </div>
            ) : bookingsList.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-slate-500">
                <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Aucun rendez-vous 1-to-1 soumis pour le moment</p>
                <p className="text-xs">Les demandes soumises par vos étudiants/clients sur nsore.shop apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookingsList.map((b) => {
                  const digits = (b.whatsappPhone || '').replace(/[^0-9]/g, '');
                  const waHref = digits
                    ? `https://wa.me/${digits}?text=${encodeURIComponent(
                        `Bonjour ${b.fullName}, votre séance Coaching 1-to-1 du ${b.date} (${b.timeSlot}) est confirmée ! Voici votre lien visio : ${b.roomUrl || ''}`
                      )}`
                    : '';
                  return (
                    <div key={b.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-sm text-slate-900">{b.fullName}</p>
                          <p className="text-xs text-slate-500">
                            {b.whatsappPhone} {b.email ? `• ${b.email}` : ''}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                          {b.date} • {b.timeSlot}
                        </span>
                      </div>
                      {b.objectiveNotes && (
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                          {b.objectiveNotes}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        {waHref && (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Confirmer sur WhatsApp
                          </a>
                        )}
                        {b.roomUrl && (
                          <a
                            href={b.roomUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
                          >
                            <Video className="w-3.5 h-3.5" /> Ouvrir la salle 1-to-1
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : createdBooking ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-lg font-black text-slate-900">Rendez-vous 1-to-1 enregistré !</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Votre demande pour le <strong>{createdBooking.date}</strong> ({createdBooking.timeSlot}) a bien été transmise à <strong>{coachName}</strong>.
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
                <div><span className="text-slate-500">Référence :</span> <strong className="font-mono">{createdBooking.id}</strong></div>
                <div><span className="text-slate-500">Participant :</span> <strong>{createdBooking.fullName}</strong> ({createdBooking.whatsappPhone})</div>
                {createdBooking.roomUrl && (
                  <div className="pt-1">
                    <a
                      href={createdBooking.roomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-bold hover:underline break-all"
                    >
                      📹 Lien Visio 1-to-1 : {createdBooking.roomUrl}
                    </a>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreatedBooking(null);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer"
              >
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5">
                  1. Choisissez la date du rendez-vous *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                  {upcomingDates.slice(0, 4).map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setDate(d.date);
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        date === d.date
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  required
                  min={upcomingDates[0]?.date}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> 2. Créneau horaire (GMT) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {STANDARD_1TO1_TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setTimeSlot(slot);
                      }}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        timeSlot === slot
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Aminata Diallo"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" /> Téléphone WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="+226 70 00 00 00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" /> E-mail (optionnel)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" /> Objectif, questions & données à soumettre au coach
                </label>
                <textarea
                  rows={3}
                  value={objectiveNotes}
                  onChange={(e) => setObjectiveNotes(e.target.value)}
                  placeholder="Décrivez votre besoin, vos questions ou les informations à préparer avant le rendez-vous..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  <span>{isSubmitting ? 'Enregistrement...' : 'Confirmer mon Rendez-vous 1-to-1'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Live1to1BookingModal;
