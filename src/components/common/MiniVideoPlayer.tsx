import React, { useState } from 'react';
import { 
  X, 
  Maximize2, 
  CheckCircle2, 
  Clock, 
  GripHorizontal,
  GraduationCap,
  UserPlus
} from 'lucide-react';
import { TutorialItem, formatVideoEmbedUrl, isDirectVideoStream } from '../../services/tutorialService';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

interface MiniVideoPlayerProps {
  tutorial: TutorialItem | null;
  isCompleted: boolean;
  onClose: () => void;
  onExpand: () => void;
  onToggleComplete: () => void;
  isAuthenticated?: boolean;
  onRequestAuth?: () => void;
}

export const MiniVideoPlayer: React.FC<MiniVideoPlayerProps> = ({
  tutorial,
  isCompleted,
  onClose,
  onExpand,
  onToggleComplete,
  isAuthenticated = false,
  onRequestAuth
}) => {
  const [hasEnded, setHasEnded] = useState(false);

  if (!tutorial) return null;

  const isDirectVideo = isDirectVideoStream(tutorial.videoUrl);
  const embedUrl = formatVideoEmbedUrl(tutorial.videoUrl);

  return (
    <div className="fixed bottom-4 right-4 z-[99999] w-[310px] sm:w-[360px] bg-slate-900/95 border-2 border-indigo-500/80 rounded-2xl shadow-2xl shadow-indigo-950/80 backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Barre de contrôle supérieure (Header) */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 px-3 py-2 border-b border-indigo-500/40 flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <GraduationCap className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-[11px] font-black text-white truncate" title={tutorial.title}>
            {tutorial.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Agrandir en grand écran */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onExpand();
            }}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Agrandir et voir les étapes complètes"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Fermer le lecteur flottant */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="Fermer le mini-lecteur"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lecteur Vidéo (Flux direct MP4/HLS ou Iframe) */}
      <div className="relative aspect-video w-full bg-black">
        {isDirectVideo ? (
          <video
            key={tutorial.videoUrl}
            controls
            autoPlay
            preload="auto"
            playsInline
            poster={tutorial.videoThumbnail || '/fondateur-nanasore.jpg'}
            className="w-full h-full object-cover"
            onEnded={() => setHasEnded(true)}
          >
            <source src={tutorial.videoUrl} type="video/mp4" />
            <source src="/assets/videos/intro_nanasore.mp4" type="video/mp4" />
            Votre navigateur ne supporte pas la lecture vidéo HTML5.
          </video>
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            title={tutorial.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-slate-400">
            <span className="text-xs">Vidéo en cours de préparation</span>
          </div>
        )}
      </div>

      {/* Appel à l'action doux post-visionnage pour visiteur non connecté */}
      {!isAuthenticated && onRequestAuth && (
        <div className="px-3 py-2 bg-slate-900 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onRequestAuth();
            }}
            className={`w-full py-1.5 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer border ${
              hasEnded
                ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white border-emerald-400/50 animate-pulse'
                : 'bg-slate-800/90 hover:bg-indigo-950 text-emerald-300 border-emerald-500/30'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span>Créer mon compte / Se connecter pour profiter de Nanasore</span>
          </button>
        </div>
      )}

      {/* Pied du lecteur : Durée + Checkbox "Vu" */}
      <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 text-[10.5px]">
          <Clock className="w-3 h-3 text-indigo-400" />
          <span>{tutorial.duration}</span>
          <span className="text-slate-600">•</span>
          <span className="text-purple-300 font-semibold">{tutorial.categoryLabel}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            playValidationBeep();
            onToggleComplete();
          }}
          className={`px-2.5 py-1 rounded-lg font-bold text-[10.5px] flex items-center gap-1 transition active:scale-95 cursor-pointer ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>{isCompleted ? 'Vu ✅' : 'Marquer vu'}</span>
        </button>
      </div>
    </div>
  );
};

export default MiniVideoPlayer;
