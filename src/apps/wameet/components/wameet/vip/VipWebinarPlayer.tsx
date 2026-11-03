import React, { useState } from 'react';
import {
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Users,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Tv,
  RotateCcw
} from 'lucide-react';
import { StealthYouTubePlayer, extractYouTubeVideoId } from '../../../../../components/lms/video/StealthYouTubePlayer';
import { WameetMediaDispatcher } from '../media/WameetMediaDispatcher';
import { playTapBeep } from '../../../../../utils/audio';

export interface VipWebinarPlayerProps {
  title: string;
  instructorName: string;
  instructorRole: string;
  instructorAvatar: string;
  isLive?: boolean;
  activeVideoUrl?: string;
  viewersCount?: number;
  lessonDuration?: string;
  onLessonCompleted?: () => void;
  className?: string;
}

/**
 * Zone Supérieure (Le Webinaire)
 * Lecteur vidéo large avec statut "LIVE" rouge clignotant et contrôles haute fidélité
 */
export const VipWebinarPlayer: React.FC<VipWebinarPlayerProps> = ({
  title,
  instructorName,
  instructorRole,
  instructorAvatar,
  isLive = true,
  activeVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  viewersCount = 142,
  lessonDuration = '35 min',
  onLessonCompleted,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);

  const youtubeVideoId = extractYouTubeVideoId(activeVideoUrl);

  const handleTogglePlay = () => {
    playTapBeep();
    setIsPlaying((prev) => !prev);
  };

  const handleToggleMute = () => {
    playTapBeep();
    setIsMuted((prev) => !prev);
  };

  const handleCompleteLesson = () => {
    playTapBeep();
    setCompleted((prev) => !prev);
    onLessonCompleted?.();
  };

  return (
    <section
      aria-label="Zone Webinaire & Lecteur de cours VIP"
      className={`relative w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl ${className}`}
    >
      {/* Conteneur Vidéo Format Cinéma 16:9 */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        <WameetMediaDispatcher
          mediaUrl={activeVideoUrl}
          title={title}
          instructorName={instructorName}
          autoPlay={isPlaying}
          aspectRatio="16:9"
          className="w-full h-full"
        />

        {/* =====================================================================
            STATUT "LIVE" ROUGE CLIGNOTANT (SI LE PROFESSEUR EST EN DIRECT)
           ===================================================================== */}
        {isLive && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg shadow-red-600/40 border border-red-400/50">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span>LIVE • EN DIRECT</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-slate-200 text-xs font-bold backdrop-blur-md border border-white/20">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>{viewersCount} étudiants</span>
            </div>
          </div>
        )}

        {/* Bouton Plein Écran */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setIsFullscreen((prev) => !prev);
          }}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 transition cursor-pointer backdrop-blur-md"
          title="Plein écran"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Barre d'Informations et Contrôles du Cours en dessous du lecteur */}
      <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Titre & Formateur */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-wide">
              Masterclass VIP
            </span>
            <span className="text-xs text-slate-400">• {lessonDuration}</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white leading-snug truncate">
            {title}
          </h2>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <img
              src={instructorAvatar}
              alt={instructorName}
              className="w-6 h-6 rounded-full object-cover border border-cyan-400"
            />
            <span className="font-bold text-white">{instructorName}</span>
            <span className="text-slate-400">• {instructorRole}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
        </div>

        {/* Bouton d'action Rapide : Marquer comme terminé */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCompleteLesson}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-md ${
              completed
                ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <CheckCircle2
              className={`w-4 h-4 ${completed ? 'text-slate-950' : 'text-emerald-400'}`}
            />
            <span>{completed ? 'Leçon Terminée ✅' : 'Marquer comme terminée'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default VipWebinarPlayer;
