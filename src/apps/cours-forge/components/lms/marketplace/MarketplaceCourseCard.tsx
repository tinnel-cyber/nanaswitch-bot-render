import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Volume2,
  VolumeX,
  Star,
  Clock,
  Users,
  Award,
  ChevronRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { MarketplaceCourse } from './types';
import { formatCFA, playTapBeep } from '../../../../../utils/audio';

interface MarketplaceCourseCardProps {
  course: MarketplaceCourse;
  onSelectCourse: (courseId: string) => void;
  onQuickEnroll?: (course: MarketplaceCourse) => void;
}

export const MarketplaceCourseCard: React.FC<MarketplaceCourseCardProps> = ({
  course,
  onSelectCourse,
  onQuickEnroll
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Détection du survol avec temporisation (300ms) pour fluidité Netflix
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      setIsPlayingVideo(true);
    }, 320);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
    setIsPlayingVideo(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Lecture / pause automatique
  useEffect(() => {
    if (isPlayingVideo && videoRef.current) {
      videoRef.current.play().catch(() => {
        // En cas de blocage navigateur, on reste en muet
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [isPlayingVideo]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const effectivePrice = course.discountPrice || course.price;

  return (
    <div
      className="relative flex-none w-[280px] sm:w-[320px] md:w-[340px] group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelectCourse(course.id)}
    >
      <motion.div
        layout
        whileHover={{ scale: 1.04, y: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="rounded-3xl overflow-hidden bg-slate-900/90 border border-slate-800/80 group-hover:border-indigo-500/50 group-hover:shadow-2xl group-hover:shadow-indigo-500/20 transition-all duration-300 flex flex-col h-full"
      >
        {/* Zone Média : Image de Couverture ou Vidéo Teaser Auto-Play */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
          {/* Vidéo de Bande-Annonce (Silent Hover-to-Play) */}
          {course.trailerVideoUrl && (
            <video
              ref={videoRef}
              src={course.trailerVideoUrl}
              muted={isMuted}
              loop
              playsInline
              preload="none"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                isPlayingVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
          )}

          {/* Image de Couverture Fallback / État Repos */}
          <img
            src={course.coverImage}
            alt={course.title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              isPlayingVideo ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Dégradé d'ambiance sombre inférieur */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

          {/* Badge Supérieur (Bestseller, Tendance, etc.) */}
          {course.badge && (
            <div className="absolute top-3 left-3 z-10">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border shadow-lg ${
                course.badge === 'Bestseller'
                  ? 'bg-amber-500/90 text-slate-950 border-amber-300'
                  : course.badge === 'Tendance UEMOA'
                  ? 'bg-rose-500/90 text-white border-rose-400'
                  : 'bg-indigo-500/90 text-white border-indigo-400'
              }`}>
                {course.badge}
              </span>
            </div>
          )}

          {/* Contrôle du Son si Vidéo Active */}
          {isPlayingVideo && (
            <button
              type="button"
              onClick={toggleSound}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition cursor-pointer"
              title={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Indicateur de lecture en survol */}
          {isPlayingVideo && (
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Aperçu Vidéo en Direct</span>
            </div>
          )}
        </div>

        {/* Corps d'Informations */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            {/* Catégorie & Note Étoilée */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                {course.category}
              </span>

              <div className="flex items-center gap-1 text-amber-400 font-black text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{course.rating.toFixed(1)}</span>
                <span className="text-slate-500 text-[10px]">({course.reviewsCount || 120})</span>
              </div>
            </div>

            {/* Titre */}
            <h3 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
              {course.title}
            </h3>

            {/* Tagline courte */}
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {course.tagline}
            </p>
          </div>

          {/* Formateur & Métriques */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <img
                  src={course.instructor.avatarUrl}
                  alt={course.instructor.name}
                  className="w-5 h-5 rounded-full object-cover border border-amber-500/40"
                />
                <span className="truncate max-w-[130px] font-medium text-slate-300">
                  {course.instructor.name}
                </span>
              </div>

              <div className="flex items-center gap-1 font-semibold text-slate-300">
                <Users className="w-3 h-3 text-emerald-400" />
                <span>{course.enrolledCount} inscrits</span>
              </div>
            </div>

            {/* Prix & Bouton d'Action */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-black text-white">
                    {formatCFA(effectivePrice)}
                  </span>
                  {course.originalPrice && course.originalPrice > effectivePrice && (
                    <span className="text-[11px] text-slate-500 line-through">
                      {formatCFA(course.originalPrice)}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">
                  Accès à vie + Certificat
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playTapBeep();
                  if (onQuickEnroll) {
                    onQuickEnroll(course);
                  } else {
                    onSelectCourse(course.id);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-indigo-600/20 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Rejoindre</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MarketplaceCourseCard;
