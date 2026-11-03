import React from 'react';
import {
  GraduationCap,
  Users,
  Star,
  ShieldCheck,
  Clock,
  BookOpen,
  ArrowRight,
  Radio,
  Gem,
  Sparkles,
  Award
} from 'lucide-react';
import { VipCourseRoomCardProps } from './types';
import { playTapBeep } from '../../../../../utils/audio';

/**
 * Carte de Salle de Cours & Masterclass (VIP)
 * Style : Tons Bleu Nuit / Argent, Cyan Métallique, Shimmer Argenté
 * Micro-interactions : hover:scale-105 transition-transform, shimmer au survol
 */
export const VipCourseRoomCard: React.FC<VipCourseRoomCardProps> = ({
  course,
  onSelect,
  onEnroll,
  className = ''
}) => {
  const handleClick = () => {
    playTapBeep();
    onSelect?.(course);
  };

  const handleEnrollClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onEnroll ? onEnroll(course) : onSelect?.(course);
  };

  const isPremium = course.accessType === 'PREMIUM';

  return (
    <article
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Salle de Cours VIP : ${course.title} par ${course.instructorName}`}
      className={`group relative w-[310px] sm:w-[340px] shrink-0 rounded-3xl bg-gradient-to-b from-slate-900/95 via-blue-950/30 to-slate-950 border ${
        isPremium
          ? 'border-cyan-400/35 hover:border-cyan-300'
          : 'border-emerald-500/30 hover:border-emerald-400'
      } shadow-[0_10px_35px_-8px_rgba(0,0,0,0.8)] hover:shadow-[0_16px_50px_-8px_rgba(56,189,248,0.28)] transition-all duration-300 ease-out hover:scale-105 active:scale-[1.02] cursor-pointer select-none overflow-hidden flex flex-col justify-between vip-shimmer-silver ${className}`}
    >
      {/* Halo bleuté / cyan en arrière-plan */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-400/25 transition-all duration-500" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Image de couverture du cours */}
      <div className="relative h-28 w-full overflow-hidden bg-slate-900">
        <img
          src={course.bannerUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80'}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover opacity-45 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {/* Badge "Accès Gratuit" ou "Premium" (Bleu nuit / Argent ou Vert Émeraude) */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md shadow-xs">
          {isPremium ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/25 via-blue-500/30 to-indigo-500/25 border border-cyan-400/70 text-cyan-200">
              <Gem className="w-3 h-3 text-cyan-300" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {course.badgeLabel || 'Premium'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/25 via-teal-500/30 to-emerald-600/25 border border-emerald-400/70 text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {course.badgeLabel || 'Accès Gratuit'}
              </span>
            </div>
          )}
        </div>

        {/* Nombre d'étudiants & Live si session active */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
          {course.isLiveNow ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/25 border border-red-500/60 text-red-300 backdrop-blur-md shadow-[0_0_12px_rgba(239,68,68,0.4)]">
              <Radio className="w-3 h-3 text-red-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wide">Direct</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 backdrop-blur-md text-[10px] font-bold">
              <Users className="w-3 h-3 text-cyan-400" />
              <span>{course.studentsCount.toLocaleString('fr-FR')} élèves</span>
            </div>
          )}
        </div>
      </div>

      {/* Corps de la carte */}
      <div className="p-4 pt-1 flex-1 flex flex-col justify-between relative z-10">
        <div>
          {/* Instructeur & Badge Vérifié */}
          <div className="flex items-start gap-3 -mt-9 mb-3">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(56,189,248,0.35)] bg-slate-900">
                <img
                  src={course.instructorAvatar}
                  alt={course.instructorName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                  }}
                />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-4">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-extrabold text-white truncate group-hover:text-cyan-200 transition-colors">
                  {course.instructorName}
                </h4>
                {course.isInstructorVerified && (
                  <ShieldCheck
                    className="w-4 h-4 text-cyan-400 shrink-0"
                    title="Instructeur & Mentor Certifié Wameet"
                  />
                )}
              </div>
              <p className="text-[11px] text-cyan-400/90 font-medium truncate">
                {course.instructorRole}
              </p>
            </div>
          </div>

          {/* Titre du Cours / Masterclass */}
          <h3 className="text-base font-black text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug mb-2">
            {course.title}
          </h3>

          {/* Détails du cours : Modules, Durée, Note */}
          <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 mb-3 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-[11px] font-black text-white">
                <BookOpen className="w-3 h-3 text-cyan-400" />
                <span>{course.modulesCount}</span>
              </div>
              <span className="text-[9px] text-slate-400">modules</span>
            </div>

            <div className="flex flex-col items-center justify-center border-x border-slate-800">
              <div className="flex items-center gap-1 text-[11px] font-black text-white">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{course.durationHours}h</span>
              </div>
              <span className="text-[9px] text-slate-400">vidéo HD</span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-[11px] font-black text-amber-300">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{course.rating.toFixed(1)}</span>
              </div>
              <span className="text-[9px] text-slate-400">({course.reviewsCount})</span>
            </div>
          </div>

          {/* Tags thématiques & Certificat */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {course.hasCertificate && (
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                <Award className="w-3 h-3 text-cyan-300" />
                <span>Certifiant</span>
              </span>
            )}
            {course.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800/70 text-slate-300 border border-slate-700/60 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer : Session & Bouton d'entrée */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="text-[10px] text-slate-400 min-w-0">
            <span className="text-cyan-300 font-bold block truncate">
              {course.nextSessionDate || 'Accès immédiat'}
            </span>
            <span className="text-slate-500 text-[9px] truncate block">
              {course.priceLabel || (isPremium ? 'Accès Privilège' : '100% Offert')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleEnrollClick}
            className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-md ${
              isPremium
                ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/20 group-hover:shadow-cyan-400/40'
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20 group-hover:shadow-emerald-400/40'
            }`}
          >
            <span>Entrer en Salle</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default VipCourseRoomCard;
