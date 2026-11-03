import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  BookOpen,
  Clock,
  Sparkles,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { extractYouTubeVideoId } from '../../../../components/lms/video/StealthYouTubePlayer';
import { WameetMediaDispatcher } from './media/WameetMediaDispatcher';

export interface CourseVideoBubbleProps {
  id?: string;
  lessonTitle: string;
  courseTitle?: string;
  moduleBadge?: string; // ex: "Module 2 • Leçon 3"
  videoUrl: string;
  durationLabel?: string; // ex: "08:45"
  initialCompleted?: boolean;
  timestamp?: string;
  authorName?: string;
  onMarkCompleted?: (lessonId?: string) => void;
  className?: string;
}

export const CourseVideoBubble: React.FC<CourseVideoBubbleProps> = ({
  id,
  lessonTitle,
  courseTitle,
  moduleBadge = 'Module de cours',
  videoUrl,
  durationLabel,
  initialCompleted = false,
  timestamp,
  authorName,
  onMarkCompleted,
  className = ''
}) => {
  const [isCompleted, setIsCompleted] = useState<boolean>(initialCompleted);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const youtubeId = extractYouTubeVideoId(videoUrl);

  const handleCompleteClick = () => {
    if (isCompleted) return;
    setIsCompleted(true);
    if (onMarkCompleted) {
      onMarkCompleted(id);
    }
  };

  return (
    <div
      className={`max-w-md w-full rounded-2xl bg-white border border-slate-200/90 shadow-md overflow-hidden font-sans select-none transition-all duration-200 hover:shadow-lg ${className}`}
    >
      {/* -------------------------------------------------------------------
          1. EN-TÊTE DU MODULE DE COURS
         ------------------------------------------------------------------- */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#0084FF] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 truncate">
                {moduleBadge}
              </span>
              {durationLabel && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[9px] font-bold border border-slate-700">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  {durationLabel}
                </span>
              )}
            </div>

            {courseTitle && (
              <p className="text-[11px] font-medium text-slate-400 truncate">
                {courseTitle}
              </p>
            )}
          </div>
        </div>

        {isCompleted && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Terminé
          </span>
        )}
      </div>

      {/* -------------------------------------------------------------------
          2. LECTEUR VIDÉO ADAPTATIF WAMEET (MEDIA DISPATCHER)
         ------------------------------------------------------------------- */}
      <div className="relative w-full overflow-hidden bg-black">
        {videoUrl ? (
          <WameetMediaDispatcher
            mediaUrl={videoUrl}
            title={lessonTitle}
            subtitle={courseTitle}
            moduleLabel={moduleBadge}
            instructorName={authorName}
            isCompleted={isCompleted}
            onComplete={handleCompleteClick}
            aspectRatio="16:9"
          />
        ) : (
          <div className="aspect-video w-full text-slate-500 text-xs flex flex-col items-center justify-center gap-2 bg-slate-950">
            <BookOpen className="w-8 h-8 text-slate-600" />
            <span>Vidéo indisponible</span>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------
          3. CORPS : TITRE DU COURS ET BOUTON D'ACTION INTERACTIF
         ------------------------------------------------------------------- */}
      <div className="p-4 space-y-3 bg-slate-50/50">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
            {lessonTitle}
          </h4>
          {authorName && (
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Par {authorName}
            </p>
          )}
        </div>

        {/* BOUTON D'ACTION : "Marquer la vidéo comme terminée" */}
        <div className="pt-1">
          {isCompleted ? (
            <button
              type="button"
              disabled
              className="w-full py-3 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed shadow-2xs select-none"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.4]" />
              <span className="text-slate-600 font-extrabold">Vidéo terminée</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md font-bold border border-emerald-200">
                Validé ✓
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteClick}
              className="w-full py-3 px-4 rounded-xl bg-[#0084FF] hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
              <span>Marquer la vidéo comme terminée</span>
            </button>
          )}
        </div>

        {/* Pied discret avec horodatage */}
        {timestamp && (
          <div className="text-right text-[10px] font-semibold text-slate-400 pt-0.5">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseVideoBubble;
