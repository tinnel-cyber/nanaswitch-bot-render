/**
 * @file WameetClassroomReelPlayer.tsx
 * @description Lecteur de cours et leçons vidéo préenregistrées immersif (Prompt 9).
 * 
 * Spécifications :
 * - Optimisé pour l'apprentissage moderne format Reel / Masterclass
 * - IntersectionObserver : Lecture automatique à l'entrée dans le viewport, pause immédiate au défilement
 * - Contrôles de validation pédagogique (Marquer comme terminé, Leçon Suivante)
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), fonds sombres
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  SkipForward, 
  GraduationCap, 
  Sparkles,
  Award,
  BookOpen
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../../utils/audio';
import { extractYouTubeVideoId } from '../../../../../components/lms/video/StealthYouTubePlayer';
import { ReelErrorBoundary } from '../../../../../components/ReelErrorBoundary';

export interface WameetClassroomReelPlayerProps {
  videoUrl: string;
  posterUrl?: string;
  lessonTitle: string;
  courseTitle?: string;
  moduleLabel?: string;
  instructorName?: string;
  isCompleted?: boolean;
  hasNextLesson?: boolean;
  onComplete?: () => void;
  onNextLesson?: () => void;
  className?: string;
}

const BaseWameetClassroomReelPlayer: React.FC<WameetClassroomReelPlayerProps> = ({
  videoUrl,
  posterUrl,
  lessonTitle,
  courseTitle,
  moduleLabel = 'Module de cours',
  instructorName = 'Formateur Wameet',
  isCompleted = false,
  hasNextLesson = false,
  onComplete,
  onNextLesson,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [completed, setCompleted] = useState(isCompleted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const youtubeId = extractYouTubeVideoId(videoUrl);

  // 1. IntersectionObserver pour lecture/pause automatique au défilement (Reels format)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Entrée dans le champ de vision : lecture automatique
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {});
            }
          } else {
            // Sortie du champ de vision : pause immédiate
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: [0.2, 0.5, 0.8] }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const togglePlay = () => {
    playTapBeep();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    playTapBeep();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleValidateLesson = () => {
    playValidationBeep();
    setCompleted(true);
    if (onComplete) onComplete();
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10 select-none flex flex-col justify-end ${
        youtubeId ? 'aspect-video' : 'aspect-[9/16] max-h-[80vh]'
      } ${className}`}
    >
      {/* Rendu Vidéo HTML5 ou YouTube Iframe */}
      {youtubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&playsinline=1&modestbranding=1&rel=0&controls=1`}
          title={lessonTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          playsInline
          muted={isMuted}
          loop
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration || 0);
            }
          }}
          onClick={togglePlay}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        />
      )}

      {/* Dégradés d'ombrage immersifs */}
      {!youtubeId && (
        <>
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />
        </>
      )}

      {/* En-tête Supérieur : Module & Statut */}
      {!youtubeId && (
        <div className="absolute top-3.5 inset-x-3.5 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#4169E1] text-white shadow-md flex items-center gap-1.5 border border-white/20">
              <GraduationCap className="w-3.5 h-3.5" />
              {moduleLabel}
            </span>
            {completed && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Validée
              </span>
            )}
          </div>

          {/* Bouton Mute */}
          <button
            type="button"
            onClick={toggleMute}
            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition active:scale-95"
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-white/80" /> : <Volume2 className="w-4 h-4 text-[#4169E1]" />}
          </button>
        </div>
      )}

      {/* Bouton Play/Pause central */}
      {!youtubeId && !isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-20"
        >
          <div className="w-16 h-16 rounded-full bg-[#4169E1] hover:bg-blue-600 text-white shadow-[0_0_30px_rgba(65,105,225,0.7)] flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/40">
            <Play className="w-7 h-7 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Barre d'informations & Action pédagogique en bas */}
      {!youtubeId && (
        <div className="relative z-20 p-4 flex flex-col gap-3">
          {/* Barre de progression fluide */}
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#4169E1] h-full rounded-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div>
            {courseTitle && (
              <p className="text-[11px] font-bold text-white/70 uppercase tracking-wide truncate">
                {courseTitle}
              </p>
            )}
            <h3 className="text-base sm:text-lg font-black text-white drop-shadow leading-tight mt-0.5">
              {lessonTitle}
            </h3>
            <p className="text-xs text-white/80 font-medium mt-1">
              Par <span className="font-bold text-[#4169E1]">{instructorName}</span>
            </p>
          </div>

          {/* Boutons d'interaction pédagogique */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleValidateLesson}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md ${
                completed
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#4169E1] hover:bg-blue-600 text-white border border-white/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {completed ? 'Leçon validée' : 'Marquer comme terminée'}
            </button>

            {hasNextLesson && onNextLesson && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onNextLesson();
                }}
                className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95"
              >
                <span>Suivante</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const WameetClassroomReelPlayer: React.FC<WameetClassroomReelPlayerProps> = (props) => (
  <ReelErrorBoundary>
    <BaseWameetClassroomReelPlayer {...props} />
  </ReelErrorBoundary>
);

export default WameetClassroomReelPlayer;
