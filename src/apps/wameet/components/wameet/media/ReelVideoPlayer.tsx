/**
 * @file ReelVideoPlayer.tsx
 * @description Lecteur de Reels & Contenus Cloud avec Snap-Scroll et IntersectionObserver (Prompt 11).
 * 
 * Spécifications :
 * - session_type: 'reel' | 'ad_banner'
 * - Détection automatique et gestion dynamique des ratios :
 *   - Reel 9:16 : aspect-[9/16] max-h-[85vh] object-cover mx-auto rounded-3xl
 *   - Bannière 16:9 : aspect-video w-full object-contain rounded-2xl
 * - Lecture et pause automatiques contrôlées par IntersectionObserver
 * - Barre de défilement Bleu Royal (#4169E1) et contrôles épurés en marque blanche
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Sparkles 
} from 'lucide-react';
import { playTapBeep } from '../../../../../utils/audio';
import { ReelErrorBoundary } from '../../../../../components/ReelErrorBoundary';
import { getOfflineVideoBlobUrl } from '../../../../../services/wameetOfflineReelsService';
import Hls from 'hls.js';
import { resolvePosterFromVideoUrl } from '../../../../../services/s3UploadService';

export interface ReelVideoPlayerProps {
  mediaUrl: string;
  posterUrl?: string;
  sessionType?: 'reel' | 'ad_banner';
  title?: string;
  subtitle?: string;
  creatorName?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  aspectRatio?: 'auto' | '9:16' | '16:9';
  onEnded?: () => void;
  className?: string;
}

const BaseReelVideoPlayer: React.FC<ReelVideoPlayerProps> = ({
  mediaUrl,
  posterUrl,
  sessionType = 'reel',
  title,
  subtitle,
  creatorName,
  autoPlay = false,
  loop = true,
  muted = true,
  aspectRatio = 'auto',
  onEnded,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [detectedRatio, setDetectedRatio] = useState<'9:16' | '16:9'>(
    sessionType === 'reel' ? '9:16' : '16:9'
  );
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);

  const [resolvedSrc, setResolvedSrc] = useState<string>(mediaUrl);
  const effectivePoster = posterUrl || resolvePosterFromVideoUrl(resolvedSrc) || resolvePosterFromVideoUrl(mediaUrl);

  useEffect(() => {
    let isCancelled = false;
    getOfflineVideoBlobUrl(mediaUrl)
      .then((blob) => {
        if (!isCancelled && blob) {
          setResolvedSrc(blob);
        } else if (!isCancelled) {
          setResolvedSrc(mediaUrl);
        }
      })
      .catch(() => {
        if (!isCancelled) setResolvedSrc(mediaUrl);
      });

    return () => {
      isCancelled = true;
    };
  }, [mediaUrl]);

  // Forcer les attributs DOM muted et initialiser le flux HLS ou MP4 natif
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!resolvedSrc) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const isHls = resolvedSrc.includes('.m3u8');
    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = resolvedSrc;
        if (autoPlay || sessionType === 'reel') {
          const p = video.play();
          if (p !== undefined) {
            p.then(() => setIsPlaying(true)).catch(() => {});
          }
        }
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });
        hls.loadSource(resolvedSrc);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay || sessionType === 'reel') {
            const p = video.play();
            if (p !== undefined) {
              p.then(() => setIsPlaying(true)).catch(() => {});
            }
          }
        });
      } else {
        video.src = resolvedSrc;
      }
    } else {
      video.src = resolvedSrc;
      if (autoPlay || sessionType === 'reel') {
        const p = video.play();
        if (p !== undefined) {
          p.then(() => setIsPlaying(true)).catch((err) => {
            console.warn("Autoplay vidéo S3 en attente d'interaction :", err);
          });
        }
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedSrc, autoPlay, sessionType]);

  // 1. Détection dynamique du ratio natif de la vidéo S3
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const { videoWidth, videoHeight, duration: vidDur } = videoRef.current;
    setDuration(vidDur || 0);

    if (aspectRatio === '9:16') {
      setDetectedRatio('9:16');
    } else if (aspectRatio === '16:9') {
      setDetectedRatio('16:9');
    } else {
      if (sessionType === 'reel' || videoHeight > videoWidth * 1.15) {
        setDetectedRatio('9:16');
      } else {
        setDetectedRatio('16:9');
      }
    }
  };

  // 2. IntersectionObserver : Lecture automatique si visible à 50%, pause immédiate si défilé
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.defaultMuted = true;
              videoRef.current.muted = isMuted;
              videoRef.current.playsInline = true;
              videoRef.current.play()
                .then(() => setIsPlaying(true))
                .catch((err) => {
                  console.warn("Autoplay bloqué par le navigateur :", err);
                });
            }
          } else {
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

  // 3. Masquage temporisé des contrôles
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // 4. Contrôles de lecture
  const togglePlay = () => {
    playTapBeep();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    playTapBeep();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    playTapBeep();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
    resetControlsTimeout();
  };

  const isVertical = detectedRatio === '9:16';
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className={`relative select-none transition-all duration-300 snap-start snap-always ${
        isVertical
          ? 'aspect-[9/16] max-h-[85vh] w-full max-w-[420px] mx-auto rounded-3xl shadow-2xl overflow-hidden border border-white/10 bg-black'
          : 'aspect-video w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200/40 bg-black'
      } ${className}`}
    >
      {/* Miniature instantanée (Poster) sans écran noir */}
      {effectivePoster && !currentTime && (
        <div className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300">
          <img
            src={effectivePoster}
            alt=""
            className={`w-full h-full select-none ${isVertical ? 'object-cover' : 'object-contain'}`}
            loading="eager"
          />
        </div>
      )}

      {/* Balise Vidéo HTML5 optimisée pour streaming S3 HLS / MP4 */}
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        poster={effectivePoster}
        preload="metadata"
        autoPlay={autoPlay}
        loop={loop}
        muted={isMuted}
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        }}
        onPlay={() => console.log("Lecture en cours :", mediaUrl)}
        onPause={() => console.log("Vidéo mise en pause :", mediaUrl)}
        onWaiting={() => console.log("Vidéo en attente de données (buffering) :", mediaUrl)}
        onError={(e) => console.error("Erreur native du lecteur vidéo :", e.currentTarget.error, mediaUrl)}
        onClick={togglePlay}
        className={`w-full h-full cursor-pointer ${isVertical ? 'object-cover' : 'object-contain'}`}
      />

      {/* Dégradés d'ombrage contextuels */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Bouton Play Central lors de l'arrêt */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-20"
        >
          <div className="w-16 h-16 rounded-full bg-[#4169E1] hover:bg-blue-600 text-white shadow-[0_0_30px_rgba(65,105,225,0.7)] flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/40">
            <Play className="w-7 h-7 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Badge Supérieur Wameet */}
      <div
        className={`absolute top-3 inset-x-3 flex items-center justify-between z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4169E1] text-white shadow-md flex items-center gap-1 border border-white/20">
            <Sparkles className="w-3 h-3" />
            {isVertical ? 'Wameet Reel' : 'Wameet S3'}
          </span>
          {title && (
            <span className="text-xs font-bold text-white drop-shadow truncate max-w-[200px]">
              {title}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleMute}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition active:scale-90"
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#4169E1]" />}
        </button>
      </div>

      {/* Barre de Contrôles Inférieure Wameet (#4169E1) */}
      <div
        className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 z-20 flex flex-col gap-2 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Barre de défilement (Scrubber) */}
        <div className="relative w-full flex items-center cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#4169E1]"
          />
          <div
            className="absolute left-0 top-0 bottom-0 bg-[#4169E1] rounded-lg pointer-events-none transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Détails auteur et plein écran */}
        <div className="flex items-center justify-between text-white text-xs font-bold">
          <div className="truncate">
            {creatorName && (
              <p className="text-xs text-white/90 drop-shadow truncate">
                Par <span className="text-[#4169E1] font-black">{creatorName}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition active:scale-90"
            aria-label="Plein écran"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ReelVideoPlayer: React.FC<ReelVideoPlayerProps> = (props) => (
  <ReelErrorBoundary>
    <BaseReelVideoPlayer {...props} />
  </ReelErrorBoundary>
);

export default ReelVideoPlayer;
