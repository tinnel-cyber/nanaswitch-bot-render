/**
 * @file WameetAdaptiveCloudPlayer.tsx
 * @description Lecteur vidéo HTML5 personnalisé réactif pour vidéos Cloud & CDN (Prompt 9).
 * 
 * Spécifications :
 * - Détection dynamique du ratio natif (9:16 vs 16:9) lors du chargement des métadonnées
 * - Format Reel Vertical (9:16) : aspect-[9/16] max-h-[85vh] object-cover mx-auto rounded-3xl
 * - Format Horizontal (16:9) : aspect-video w-full object-contain rounded-2xl
 * - Contrôles personnalisés Wameet en Bleu Royal (#4169E1) et Blanc Pur (#FFFFFF)
 * - Gestion automatique du masquage des contrôles pendant la lecture
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface WameetAdaptiveCloudPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitle?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  forcedRatio?: 'auto' | '9:16' | '16:9';
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  className?: string;
  showCustomControls?: boolean;
}

export const WameetAdaptiveCloudPlayer: React.FC<WameetAdaptiveCloudPlayerProps> = ({
  src,
  poster,
  title,
  subtitle,
  autoPlay = false,
  loop = false,
  muted = false,
  forcedRatio = 'auto',
  onEnded,
  onTimeUpdate,
  className = '',
  showCustomControls = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [detectedRatio, setDetectedRatio] = useState<'9:16' | '16:9'>('16:9');
  const [hasError, setHasError] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);

  // 1. Détection dynamique du ratio natif
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const { videoWidth, videoHeight, duration: vidDuration } = videoRef.current;
    setDuration(vidDuration || 0);

    if (forcedRatio === '9:16') {
      setDetectedRatio('9:16');
    } else if (forcedRatio === '16:9') {
      setDetectedRatio('16:9');
    } else {
      // Détection automatique : si la hauteur dépasse 1.15 fois la largeur -> Vertical Reel 9:16
      if (videoHeight > videoWidth * 1.15) {
        setDetectedRatio('9:16');
      } else {
        setDetectedRatio('16:9');
      }
    }
  };

  // 2. Gestion de la temporisation des contrôles
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // 3. Play / Pause
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

  // 4. Mute / Volume
  const toggleMute = () => {
    playTapBeep();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    resetControlsTimeout();
  };

  // 5. Plein écran
  const toggleFullscreen = () => {
    playTapBeep();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
    resetControlsTimeout();
  };

  // 6. Seek bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
    resetControlsTimeout();
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isVertical = (forcedRatio === '9:16') || (forcedRatio === 'auto' && detectedRatio === '9:16');

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className={`relative select-none transition-all duration-300 ${
        isVertical
          ? 'aspect-[9/16] max-h-[85vh] w-full max-w-[420px] mx-auto rounded-3xl shadow-2xl overflow-hidden border border-white/10 bg-black'
          : 'aspect-video w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200/50 bg-black'
      } ${className}`}
    >
      {/* Balise Vidéo HTML5 Haute Performance */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (onTimeUpdate) {
              onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration || 0);
            }
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
          if (onEnded) onEnded();
        }}
        onError={() => setHasError(true)}
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

      {/* Bouton Play/Pause central lors de l'arrêt */}
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

      {/* En-tête supérieur discret */}
      <div
        className={`absolute top-3 inset-x-3 flex items-center justify-between z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4169E1] text-white shadow-md flex items-center gap-1 border border-white/20">
            <Sparkles className="w-3 h-3" />
            {isVertical ? 'Wameet Reel' : 'Wameet Vidéo'}
          </span>
          {title && (
            <span className="text-xs font-bold text-white drop-shadow truncate max-w-[200px] sm:max-w-xs">
              {title}
            </span>
          )}
        </div>

        {/* Ratio badge */}
        <span className="text-[10px] font-mono font-bold text-white/70 px-2 py-0.5 rounded bg-black/40 backdrop-blur-md border border-white/10">
          {detectedRatio}
        </span>
      </div>

      {/* Barre de contrôles inférieure Wameet */}
      {showCustomControls && (
        <div
          className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 z-20 flex flex-col gap-2 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Barre de défilement (Scrubber) */}
          <div className="relative w-full flex items-center group cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#4169E1] hover:h-2 transition-all"
            />
            {/* Barre de remplissage colorée Bleu Royal */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-[#4169E1] rounded-lg pointer-events-none transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Boutons d'action et timecodes */}
          <div className="flex items-center justify-between text-white text-xs font-bold">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition active:scale-90"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ml-0.5 fill-white" />}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition active:scale-90"
                aria-label={isMuted ? 'Rétablir le son' : 'Couper le son'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#4169E1]" />}
              </button>

              <span className="font-mono text-[11px] text-white/90">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition active:scale-90"
                aria-label="Plein écran"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WameetAdaptiveCloudPlayer;
