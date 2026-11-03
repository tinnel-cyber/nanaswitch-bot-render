import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Volume2,
  VolumeX,
  GraduationCap,
  Award,
  ShieldCheck,
  Users,
  ChevronRight,
  Star,
  CheckCircle2
} from 'lucide-react';
import { MarketplaceCourse } from './types';
import { formatCFA, playTapBeep } from '../../../../../utils/audio';

interface MarketplaceHeroBannerProps {
  course: MarketplaceCourse;
  onSelectCourse: (courseId: string) => void;
  onDirectEnroll: (course: MarketplaceCourse) => void;
}

export const MarketplaceHeroBanner: React.FC<MarketplaceHeroBannerProps> = ({
  course,
  onSelectCourse,
  onDirectEnroll
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const toggleSound = () => {
    playTapBeep();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const effectivePrice = course.discountPrice || course.price;

  return (
    <div className="relative w-full min-h-[500px] lg:min-h-[580px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-end">
      
      {/* 1. Vidéo de fond Cinématique ou Image HD */}
      <div className="absolute inset-0 z-0">
        {course.trailerVideoUrl ? (
          <video
            ref={videoRef}
            src={course.trailerVideoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover filter brightness-[0.45] scale-105"
          />
        ) : (
          <img
            src={course.coverImage}
            alt={course.title}
            className="w-full h-full object-cover filter brightness-[0.45]"
          />
        )}

        {/* Dégradés superposés d'immersion (Netflix Dark Fade) */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      {/* 2. Contrôle Audio Flottant */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={toggleSound}
          className="p-3 rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition flex items-center gap-2 text-xs font-bold cursor-pointer"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Activer le son</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Son actif</span>
            </>
          )}
        </button>
      </div>

      {/* 3. Contenu Éditorial & Appel à l'Action */}
      <div className="relative z-10 p-6 sm:p-10 md:p-14 max-w-3xl space-y-5">
        
        {/* Badges de Tête */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>FORMATION &amp; MASTERCLASS D&apos;EXCELLENCE</span>
          </span>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Certifications Professionnelles Reconnues</span>
          </span>
        </div>

        {/* Titre Principal */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
          Explorez nos Cours &amp; Masterclasses
        </h1>

        {/* Tagline marketing */}
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal max-w-2xl drop-shadow">
          Développez vos compétences pratiques et accélérez votre réussite grâce à des formations d&apos;élite et des programmes interactifs animés par des experts.
        </p>

        {/* Preuve Sociale Rapide */}
        <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <strong className="text-white text-sm">{course.rating} / 5</strong>
            <span className="text-slate-400">({course.reviewsCount || 194} avis vérifiés)</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-white font-bold">{course.enrolledCount} entrepreneurs</span>
            <span className="text-slate-400">inscrits</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-white font-bold">Certificat Officiel Inclus</span>
          </div>
        </div>

        {/* Boutons d'Action Clés */}
        <div className="flex items-center gap-3.5 flex-wrap pt-2">
          {/* Action Primaire d'Achat 1-Clic */}
          <button
            type="button"
            onClick={() => onDirectEnroll(course)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition transform active:scale-95 flex items-center gap-2.5 cursor-pointer"
          >
            <GraduationCap className="w-5 h-5 text-slate-950" />
            <span>S&apos;inscrire Immédiatement ({formatCFA(effectivePrice)})</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Action Secondaire : Découvrir la Fiche */}
          <button
            type="button"
            onClick={() => onSelectCourse(course.id)}
            className="px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-sm backdrop-blur-md border border-slate-700 transition flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" />
            <span>Voir la Fiche &amp; Programme</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceHeroBanner;
