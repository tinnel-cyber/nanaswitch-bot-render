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
  serverDomain = 'meet.jit.si',
  roomName,
  title,
  studentName = 'Étudiant NaNa',
  onSessionComplete,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // URL de l'Iframe Jitsi avec paramètres pré-configurés pour fluidité
  const sanitizedRoom = encodeURIComponent(roomName || 'nana-academy-room');
  const encodedName = encodeURIComponent(studentName);
  const domain = serverDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  const jitsiEmbedUrl = `https://${domain}/${sanitizedRoom}#userInfo.displayName="${encodedName}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.disableDeepLinking=true&config.toolbarButtons=["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","profile","chat","recording","livestreaming","etherpad","sharedvideo","settings","raisehand","videoquality","filmstrip","feedback","stats","shortcuts","tileview","videobackgroundblur","help","mute-everyone"]`;

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
      {/* Barre d'état supérieure Jitsi */}
      <div className="shrink-0 px-3 sm:px-4 py-2 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-[#4169E1]/20 text-blue-300 border border-[#4169E1]/30">
              Salon Wameet • Direct
            </span>
            <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
              {title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Connexion à la salle Jitsi Meet...</h4>
            <p className="text-xs text-slate-400">Chiffrement de bout en bout &amp; audio sans latence</p>
          </div>
        )}

        <iframe
          src={jitsiEmbedUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 absolute inset-0"
          title={`Jitsi Meet - ${title}`}
        />
      </div>
    </div>
  );
};

export default JitsiClassroomPlayer;
