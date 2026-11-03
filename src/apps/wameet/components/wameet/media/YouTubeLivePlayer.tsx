/**
 * @file YouTubeLivePlayer.tsx
 * @description Lecteur de diffusion de masse YouTube Live en marque blanche (Prompt 11).
 * 
 * Spécifications :
 * - session_type: 'public_live'
 * - Diffusion à grande échelle avec capacité illimitée de spectateurs passifs
 * - Iframe YouTube Live encapsulée sans recommandations externes (rel=0, modestbranding=1)
 * - Badge "EN DIRECT" rouge clignotant avec halo Bleu Royal (#4169E1)
 * - Compteur de spectateurs connectés en temps réel
 */

import React, { useMemo } from 'react';
import { Radio, Users, Sparkles } from 'lucide-react';
import { extractYouTubeVideoId } from '../../../../../components/lms/video/StealthYouTubePlayer';

export interface YouTubeLivePlayerProps {
  streamUrl?: string;
  videoId?: string;
  title?: string;
  creatorName?: string;
  viewersCount?: number;
  className?: string;
}

export const YouTubeLivePlayer: React.FC<YouTubeLivePlayerProps> = ({
  streamUrl = '',
  videoId,
  title = 'Direct Grand Public Wameet',
  creatorName = 'Créateur Wameet',
  viewersCount = 350,
  className = ''
}) => {
  const finalVideoId = useMemo(() => {
    if (videoId) return videoId;
    return extractYouTubeVideoId(streamUrl) || 'jfKfPfyJRdk'; // Fallback stream test
  }, [videoId, streamUrl]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `https://www.youtube-nocookie.com/embed/${finalVideoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&controls=1&enablejsapi=1&origin=${origin}`;

  return (
    <div
      className={`relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-slate-200/40 flex flex-col justify-between select-none ${className}`}
    >
      {/* 1. Flux Iframe Haute Définition */}
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0 z-0"
      />

      {/* 2. Barre d'état Marque Blanche Supérieure */}
      <div className="relative z-10 px-4 py-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          {/* Badge Live Rouge Clignotant */}
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-lg flex items-center gap-1.5 border border-white/20 animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            En Direct
          </span>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4169E1] text-white shadow-md flex items-center gap-1 border border-white/20">
            <Sparkles className="w-3 h-3" />
            Live Grand Public
          </span>
        </div>

        {/* Compteur de spectateurs */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>{viewersCount.toLocaleString('fr-FR')} spectateurs</span>
        </div>
      </div>

      {/* 3. Bandeau Inférieur de Description */}
      <div className="relative z-10 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
        <div className="truncate">
          <h4 className="text-sm sm:text-base font-black text-white drop-shadow truncate">
            {title}
          </h4>
          <p className="text-xs text-white/80 font-medium truncate mt-0.5">
            Diffusé par <span className="font-bold text-[#4169E1]">{creatorName}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default YouTubeLivePlayer;
