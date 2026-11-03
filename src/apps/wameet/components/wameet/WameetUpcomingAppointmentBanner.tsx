/**
 * @file WameetUpcomingAppointmentBanner.tsx
 * @description Carte prioritaire d'accès rapide aux rendez-vous confirmés imminents (< 30 min) (Prompt 10).
 * 
 * Spécifications :
 * - Affichage en overlay élégant sous les vitrines vivantes
 * - Message clair : "Votre Wameet avec [Nom] commence à [Heure] - [Rejoindre la salle]"
 * - Bouton direct d'entrée en visioconférence
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), effet verre dépoli
 */

import React, { useState, useEffect } from 'react';
import { Video, Clock, ChevronRight, X, Sparkles, ShieldCheck } from 'lucide-react';
import { WameetAppointment } from '../../../../services/wameetAppointmentService';
import { playTapBeep } from '../../../../utils/audio';

export interface WameetUpcomingAppointmentBannerProps {
  appointment: WameetAppointment;
  onJoinRoom: (appointment: WameetAppointment) => void;
  onDismiss?: () => void;
  className?: string;
}

export const WameetUpcomingAppointmentBanner: React.FC<WameetUpcomingAppointmentBannerProps> = ({
  appointment,
  onJoinRoom,
  onDismiss,
  className = ''
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState<number>(15);

  useEffect(() => {
    const calculateTime = () => {
      if (!appointment.timeSlot) return;
      const [h, m] = appointment.timeSlot.split(':').map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);

      const diff = Math.round((target.getTime() - Date.now()) / (1000 * 60));
      setMinutesRemaining(diff);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 30000);
    return () => clearInterval(interval);
  }, [appointment]);

  if (isDismissed) return null;

  return (
    <div
      className={`w-full max-w-md mx-auto px-3 py-1.5 z-25 transition-all duration-300 animate-in slide-in-from-top-4 ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/95 via-[#4169E1]/90 to-blue-800/95 backdrop-blur-md border border-white/20 p-3 shadow-[0_8px_30px_rgba(65,105,225,0.45)] text-white flex items-center justify-between gap-3">
        {/* Glow Bleu Royal */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none" />

        {/* Partie Gauche : Avatar et Informations */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={appointment.creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
              alt={appointment.creatorName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow-md ring-2 ring-white/30"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
          </div>

          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.2 rounded-full bg-white/20 text-white border border-white/30">
                {minutesRemaining > 0 ? `Dans ${minutesRemaining} min` : 'En cours'}
              </span>
              <span className="text-[10px] font-bold text-blue-100 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {appointment.timeSlot}
              </span>
            </div>
            <p className="text-xs font-black text-white truncate drop-shadow-sm mt-0.5">
              Votre Wameet avec {appointment.creatorName}
            </p>
          </div>
        </div>

        {/* Partie Droite : Bouton d'accès direct 1-clic */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onJoinRoom(appointment);
            }}
            className="px-3.5 py-2 rounded-xl bg-white text-[#4169E1] hover:bg-blue-50 font-black text-xs flex items-center gap-1 shadow-lg shadow-black/20 transition active:scale-95 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5 fill-[#4169E1]" />
            <span>Rejoindre</span>
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsDismissed(true);
                onDismiss();
              }}
              className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 hover:text-white transition"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WameetUpcomingAppointmentBanner;
