import React, { useState } from 'react';
import {
  X,
  Crown,
  Star,
  Users,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Clock,
  Award,
  Radio,
  ExternalLink,
  MessageCircle,
  Gem,
  GraduationCap
} from 'lucide-react';
import { VipBusinessLounge, VipCourseRoom } from './types';
import { playValidationBeep, playTapBeep } from '../../../../../utils/audio';

export interface VipRoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lounge?: VipBusinessLounge | null;
  course?: VipCourseRoom | null;
  onSuccessAction?: (message: string) => void;
  onEnterRoom?: (course: VipCourseRoom) => void;
  onEnterLounge?: (lounge: VipBusinessLounge) => void;
}

export const VipRoomDetailModal: React.FC<VipRoomDetailModalProps> = ({
  isOpen,
  onClose,
  lounge,
  course,
  onSuccessAction,
  onEnterRoom,
  onEnterLounge
}) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  if (!isOpen || (!lounge && !course)) return null;

  const isLounge = !!lounge;

  const handleAction = () => {
    playValidationBeep();
    if (isLounge) {
      setIsSubscribed(true);
      onSuccessAction?.(`👑 Vous avez rejoint avec succès le ${lounge?.title} !`);
      if (lounge) {
        onEnterLounge?.(lounge);
      }
    } else {
      setIsEnrolled(true);
      onSuccessAction?.(`🎓 Inscription confirmée à la Masterclass : ${course?.title} !`);
      if (course) {
        onEnterRoom?.(course);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl rounded-[32px] bg-gradient-to-b ${
          isLounge
            ? 'from-slate-900 via-amber-950/20 to-slate-950 border-2 border-amber-500/40 shadow-[0_20px_70px_rgba(245,158,11,0.25)]'
            : 'from-slate-900 via-blue-950/30 to-slate-950 border-2 border-cyan-400/40 shadow-[0_20px_70px_rgba(56,189,248,0.25)]'
        } text-white overflow-hidden p-0 max-h-[92vh] flex flex-col`}
      >
        {/* Bouton de Fermeture Flottant */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          aria-label="Fermer"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Bannière d'en-tête */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900 shrink-0">
          <img
            src={
              isLounge
                ? lounge?.bannerUrl ||
                  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80'
                : course?.bannerUrl ||
                  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80'
            }
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          {/* Badge Supérieur */}
          <div className="absolute top-4 left-4 z-10">
            {isLounge ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/25 border border-amber-400/70 text-amber-300 backdrop-blur-md text-xs font-black uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Salon d'Affaires VIP</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/25 border border-cyan-400/70 text-cyan-200 backdrop-blur-md text-xs font-black uppercase tracking-wider">
                <Gem className="w-3.5 h-3.5 text-cyan-300" />
                <span>Salle de Cours VIP</span>
              </span>
            )}
          </div>

          {/* Code de salle / Statut Live */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-slate-900 shrink-0">
                <img
                  src={isLounge ? lounge?.coachAvatar : course?.instructorAvatar}
                  alt={isLounge ? lounge?.coachName : course?.instructorName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-white truncate">
                    {isLounge ? lounge?.coachName : course?.instructorName}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                </div>
                <p className="text-xs text-slate-300 truncate">
                  {isLounge ? lounge?.coachRole : course?.instructorRole}
                </p>
              </div>
            </div>

            {(isLounge ? lounge?.isLiveNow : course?.isLiveNow) && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/25 border border-red-500/60 text-red-300 text-xs font-black uppercase animate-pulse shadow-md shrink-0">
                <Radio className="w-3.5 h-3.5 text-red-400" />
                <span>En Direct</span>
              </span>
            )}
          </div>
        </div>

        {/* Contenu Défilant */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Titre & Description */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2">
              {isLounge ? lounge?.title : course?.title}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isLounge ? lounge?.coachBio : course?.instructorRole}
            </p>
          </div>

          {/* Métriques Clés */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm font-black text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>
                  {isLounge ? lounge?.rating.toFixed(2) : course?.rating.toFixed(1)}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isLounge ? `${lounge?.reviewsCount} avis certifiés` : `${course?.reviewsCount} avis`}
              </div>
            </div>

            <div className="text-center border-x border-slate-800">
              <div className="flex items-center justify-center gap-1 text-sm font-black text-white">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>
                  {isLounge
                    ? `${lounge?.activeMembersCount} Membres`
                    : `${course?.studentsCount} Inscrits`}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isLounge ? 'Cercle restreint' : 'Taux de succès 96%'}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm font-black text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <span>
                  {isLounge
                    ? lounge?.subscriptionPriceLabel
                    : course?.priceLabel || 'Offert'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isLounge ? 'Abonnement VIP' : 'Accès Masterclass'}
              </div>
            </div>
          </div>

          {/* Avantages & Programme / Syllabus */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {isLounge ? 'Avantages Inclus dans ce Salon' : 'Au Programme de la Salle'}
              </span>
            </h4>

            <div className="space-y-2">
              {(isLounge ? lounge?.perks : course?.syllabus)?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-200"
                >
                  <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-amber-400 shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer avec Bouton d'Action */}
        <div className="p-4 sm:p-5 border-t border-slate-800/90 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <div className="font-bold text-white">
              {isLounge
                ? lounge?.nextLiveDate || 'Session en direct hebdomadaire'
                : course?.nextSessionDate || 'Accès immédiat illimité'}
            </div>
            <div className="text-[10px] text-slate-500">
              Garantie d'excellence Wameet • Support VIP 7j/7
            </div>
          </div>

          <button
            type="button"
            onClick={handleAction}
            className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer active:scale-95 ${
              isLounge
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/25'
                : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/25'
            }`}
          >
            {isLounge ? (
              <>
                <Crown className="w-4 h-4 fill-slate-950" />
                <span>
                  {isSubscribed ? 'Salon Rejoint ✅' : `S'abonner (${lounge?.subscriptionPriceLabel})`}
                </span>
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4" />
                <span>
                  {isEnrolled ? 'En Salle ✅' : 'Entrer en Salle de Cours'}
                </span>
              </>
            )}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VipRoomDetailModal;
