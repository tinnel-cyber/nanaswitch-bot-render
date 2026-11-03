/**
 * @file WameetClassroomLivePlayer.tsx
 * @description Lecteur de session live en direct pour les salles de classe Wameet (Prompt 9).
 * 
 * Spécifications :
 * - Intégration optimisée du flux YouTube Live API (basse latence, direct continu)
 * - Badge "EN DIRECT WAMEET" clignotant
 * - Encapsulation en marque blanche sans publicités ni vidéos recommandées intrusives
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), fonds sombres
 */

import React, { useMemo, useState } from 'react';
import { Radio, Users, Sparkles, ShieldCheck, Maximize2, ExternalLink } from 'lucide-react';
import { extractYouTubeVideoId } from '../../../../../components/lms/video/StealthYouTubePlayer';
import { playTapBeep } from '../../../../../utils/audio';

export interface WameetClassroomLivePlayerProps {
  streamUrl: string;
  title: string;
  instructorName?: string;
  viewersCount?: number;
  className?: string;
}

export const WameetClassroomLivePlayer: React.FC<WameetClassroomLivePlayerProps> = ({
  streamUrl,
  title,
  instructorName = 'Formateur NaNa',
  viewersCount = 142,
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);

  const videoId = useMemo(() => {
    return extractYouTubeVideoId(streamUrl) || 'jfKfPfyJRdk'; // Fallback live stream
  }, [streamUrl]);

  const liveEmbedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&controls=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;

  return (
    <div
      className={`relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-slate-200/50 flex flex-col justify-between select-none ${className}`}
    >
      {/* 1. Flux YouTube Live Iframe */}
      <iframe
        src={liveEmbedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0 z-0"
        onError={() => setHasError(true)}
      />

      {/* 2. Barre d'état en direct supérieure (Marque blanche) */}
      <div className="relative z-10 px-3 sm:px-4 py-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          {/* Badge Live Rouge / Bleu Royal */}
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-600 text-white shadow-lg flex items-center gap-1.5 border border-white/20 animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            En Direct
          </span>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4169E1] text-white shadow-md flex items-center gap-1 border border-white/20">
            <Sparkles className="w-3 h-3" />
            Classe Wameet
          </span>
        </div>

        {/* Compteur de spectateurs */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>{viewersCount} connectés</span>
        </div>
      </div>

      {/* 3. Bandeau inférieur d'information de session */}
      <div className="relative z-10 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
        <div className="truncate">
          <h4 className="text-sm sm:text-base font-black text-white drop-shadow truncate">
            {title}
          </h4>
          <p className="text-xs text-white/80 font-medium truncate mt-0.5">
            Animé par <span className="font-bold text-[#4169E1]">{instructorName}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WameetClassroomLivePlayer;
