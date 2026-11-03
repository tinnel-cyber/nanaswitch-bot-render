/**
 * @file WameetYouTubePlayer.tsx
 * @description Lecteur YouTube épuré en marque blanche au ratio standard 16:9 (Prompt 9).
 * 
 * Spécifications :
 * - Format : Standard 16:9 avec conteneur réactif (aspect-video w-full rounded-2xl overflow-hidden)
 * - Encapsulation sans distractions (modestbranding=1, rel=0, controls=1, playsinline=1)
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), fonds sombres
 * - Zéro redirection ni marque intrusive
 */

import React, { useState, useMemo } from 'react';
import { Play, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { extractYouTubeVideoId } from '../../../../../components/lms/video/StealthYouTubePlayer';
import { playTapBeep } from '../../../../../utils/audio';

export interface WameetYouTubePlayerProps {
  videoUrl: string;
  title?: string;
  subtitle?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
  showBadge?: boolean;
}

export const WameetYouTubePlayer: React.FC<WameetYouTubePlayerProps> = ({
  videoUrl,
  title,
  subtitle,
  autoPlay = false,
  onEnded,
  className = '',
  showBadge = true
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [hasError, setHasError] = useState(false);

  const videoId = useMemo(() => {
    return extractYouTubeVideoId(videoUrl);
  }, [videoUrl]);

  if (!videoId || hasError) {
    return (
      <div
        className={`aspect-video w-full rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-center text-white select-none ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
          <Play className="w-6 h-6 ml-0.5" />
        </div>
        <p className="text-sm font-bold text-slate-200">Vidéo indisponible ou lien invalide</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm truncate">{videoUrl}</p>
      </div>
    );
  }

  // URL d'intégration YouTube sécurisée en marque blanche
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${
    isPlaying ? 1 : 0
  }&playsinline=1&modestbranding=1&rel=0&controls=1&iv_load_policy=3&enablejsapi=1`;

  return (
    <div
      className={`aspect-video w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200/50 bg-black relative group select-none ${className}`}
    >
      {/* 1. Couverture Initiale (Si non démarré en autoPlay) */}
      {!isPlaying ? (
        <div className="absolute inset-0 w-full h-full relative cursor-pointer" onClick={() => {
          playTapBeep();
          setIsPlaying(true);
        }}>
          {/* Miniature YouTube HQ */}
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={title || 'Vidéo Wameet'}
            className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-300 group-hover:scale-105"
            onError={() => setHasError(true)}
          />

          {/* Dégradés d'ombrage */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

          {/* Badge Supérieur Wameet */}
          {showBadge && (
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#4169E1] text-white shadow-md flex items-center gap-1.5 border border-white/20">
                <Sparkles className="w-3 h-3" />
                Vidéo Wameet
              </span>
            </div>
          )}

          {/* Bouton Play Central Stylisé */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-16 h-16 rounded-full bg-[#4169E1] hover:bg-blue-600 text-white shadow-[0_0_30px_rgba(65,105,225,0.7)] flex items-center justify-center transform group-hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/40">
              <Play className="w-7 h-7 ml-1 fill-white" />
            </div>
          </div>

          {/* Titre et détails en bas */}
          {title && (
            <div className="absolute bottom-3 left-3 right-3 z-10">
              <h4 className="text-sm sm:text-base font-black text-white drop-shadow-md truncate">
                {title}
              </h4>
              {subtitle && (
                <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 2. Iframe Intégrée Haute Performance */
        <iframe
          src={embedUrl}
          title={title || 'Lecteur Vidéo Wameet'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      )}
    </div>
  );
};

export default WameetYouTubePlayer;
