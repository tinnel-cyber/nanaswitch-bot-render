import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Radio, 
  Maximize2, 
  ExternalLink, 
  ShieldCheck, 
  Users, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles,
  PhoneOff
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface JitsiClassroomPlayerProps {
  serverDomain?: string;
  roomName: string;
  title: string;
  studentName?: string;
  onSessionComplete?: () => void;
  className?: string;
}

export const JitsiClassroomPlayer: React.FC<JitsiClassroomPlayerProps> = ({
  serverDomain = '',
  roomName,
  title,
  studentName = 'Étudiant NaNa',
  onSessionComplete,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tous les Lives du Campus Privé font appel à notre Thème dédié au Live (/live/:room)
  // (sauf si le formateur a configuré son propre serveur Jitsi auto-hébergé personnalisé)
  const sanitizedRoom = encodeURIComponent(roomName || 'nana-academy-room');
  const encodedName = encodeURIComponent(studentName);
  const cleanDomain = (serverDomain || '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  const useDedicatedLiveTheme = !cleanDomain || cleanDomain === 'meet.jit.si';

  const liveThemePageUrl = `/live/${sanitizedRoom}`;
  const embedUrl = useDedicatedLiveTheme
    ? `${liveThemePageUrl}?embed=1&name=${encodedName}&title=${encodeURIComponent(title || 'Session Live')}`
    : `https://${cleanDomain}/${sanitizedRoom}#userInfo.displayName="${encodedName}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.disableDeepLinking=true`;

  const handleToggleFullscreen = () => {
    playTapBeep();
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleFinishLive = () => {
    playValidationBeep();
    setIsCompleted(true);
    if (onSessionComplete) {
      onSessionComplete();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-slate-950 flex flex-col overflow-hidden select-none ${className}`}
    >
      {/* Barre d'état supérieure Salle Live */}
      <div className="shrink-0 px-3 sm:px-4 py-2 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {useDedicatedLiveTheme ? 'Thème Live Dédié • Direct' : `Serveur Privé • ${cleanDomain}`}
            </span>
            <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
              {title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={useDedicatedLiveTheme ? liveThemePageUrl : embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 transition"
            title="Ouvrir dans notre Thème dédié au Live"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thème Live</span>
          </a>

          {!isCompleted ? (
            <button
              type="button"
              onClick={handleFinishLive}
              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
              title="Valider la présence et marquer la leçon comme terminée"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Valider Présence</span>
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Présence Validée ✓</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Plein écran"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conteneur Iframe */}
      <div className="flex-1 w-full h-full relative bg-slate-950">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Connexion à la salle WaMeet Direct...</h4>
            <p className="text-xs text-slate-400">Durée illimitée • Zéro coupure • Audio &amp; vidéo HD</p>
          </div>
        )}

        <iframe
          src={embedUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 absolute inset-0"
          title={`Salle Live - ${title}`}
        />
      </div>
    </div>
  );
};

export default JitsiClassroomPlayer;
