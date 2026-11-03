import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  SkipForward, 
  RefreshCw, 
  ExternalLink,
  Sparkles
} from 'lucide-react';

// ─── Extraction d'ID YouTube Universelle (URLs standards, Shorts, Live, et code IFrame) ─
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim();

  // 1. Identifiant direct de 11 caractères (ex: dQw4w9WgXcQ)
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return cleaned;
  }

  // 2. Code embed complet iFrame (ex: <iframe ... src="https://www.youtube.com/embed/..." ...>)
  const iframeSrcMatch = cleaned.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i);
  const target = iframeSrcMatch ? iframeSrcMatch[1] : cleaned;

  // 3. Regex universelle couvrant youtu.be, embed, v, watch?v=, shorts, live, e, et nocookie
  const universalPattern = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/|e\/))([a-zA-Z0-9_-]{11})/;
  const match = target.match(universalPattern);
  if (match && match[1]) {
    return match[1];
  }

  // 4. Fallback générique sur paramètre v=
  const fallbackMatch = target.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1];
  }

  return null;
}

// ─── Formatage Monospace des Durées (mm:ss ou hh:mm:ss) ─────────────────────
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface StealthYouTubePlayerProps {
  videoUrl?: string;
  title?: string;
  hideBranding?: boolean;
  onEnded?: () => void;
  onNextLesson?: () => void;
  onComplete?: () => void;
  hasNextLesson?: boolean;
  autoPlay?: boolean;
  className?: string;
}

// ─── Filet de Sécurité Anti-Crash Local ─────────────────────────────────────
interface VideoErrorBoundaryProps {
  children: React.ReactNode;
  videoUrl?: string;
}

interface VideoErrorBoundaryState {
  hasError: boolean;
}

class VideoPlayerErrorBoundary extends React.Component<VideoErrorBoundaryProps, VideoErrorBoundaryState> {
  public state: VideoErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): VideoErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    console.warn('[StealthYouTubePlayer] Incident d’affichage du lecteur intercepté localement :', error);
  }

  public render() {
    if (this.state.hasError) {
      const videoId = extractYouTubeVideoId(this.props.videoUrl || '');
      return (
        <div className="aspect-video relative w-full overflow-hidden rounded-xl bg-black flex flex-col items-center justify-center p-6 text-center text-slate-400 border border-slate-800 space-y-3">
          <p className="text-sm font-semibold text-slate-200">Incident d'affichage du lecteur vidéo</p>
          <p className="text-xs text-slate-500 max-w-sm">Le lecteur a été isolé pour préserver la navigation dans la leçon.</p>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recharger le lecteur</span>
            </button>
            {videoId && (
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Lien direct</span>
              </a>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Composant Principal White-Label avec Illusion d'Optique Hauteur 150% ───
export const StealthYouTubePlayer: React.FC<StealthYouTubePlayerProps> = ({
  videoUrl = '',
  title = 'Leçon Vidéo',
  hideBranding = true,
  onEnded,
  onNextLesson,
  onComplete,
  hasNextLesson = false,
  autoPlay = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const directVideoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressHoverRef = useRef<HTMLDivElement>(null);

  const videoId = useMemo(() => extractYouTubeVideoId(videoUrl), [videoUrl]);
  const isDirectVideo = useMemo(() => {
    return (
      !videoId &&
      (videoUrl.endsWith('.mp4') ||
        videoUrl.endsWith('.webm') ||
        videoUrl.includes('/blob/') ||
        videoUrl.includes('firebasestorage.googleapis.com'))
    );
  }, [videoId, videoUrl]);

  // États du Lecteur
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPositionPercent, setHoverPositionPercent] = useState(0);

  // URL IFrame avec contrôles masqués & API prête pour communication postMessage
  const youtubeEmbedUrl = useMemo(() => {
    if (!videoId) return '';
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    const baseParams = 'enablejsapi=1&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1';
    const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : '';
    const autoPlayParam = autoPlay ? '&autoplay=1' : '';
    return `https://www.youtube-nocookie.com/embed/${videoId}?${baseParams}${originParam}${autoPlayParam}`;
  }, [videoId, autoPlay]);

  // Émission directe et immédiate des commandes via postMessage vers l'iFrame YouTube
  const sendCommand = useCallback((func: string, args: any[] = []) => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch (err) {
      console.warn('[StealthYouTubePlayer] Échec envoi commande :', func, err);
    }
  }, []);

  // Initialisation de l'écouteur après chargement de l'iFrame
  const handleIframeLoad = useCallback(() => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      }
    } catch {}
  }, []);

  // Actions de Contrôle Vidéo (YouTube & Direct HTML5)
  const handlePlay = useCallback(() => {
    if (isDirectVideo && directVideoRef.current) {
      directVideoRef.current.play().catch(() => {});
      setIsPlaying(true);
      return;
    }
    if (videoId) {
      sendCommand('playVideo');
      setIsPlaying(true);
    }
  }, [isDirectVideo, videoId, sendCommand]);

  const handlePause = useCallback(() => {
    if (isDirectVideo && directVideoRef.current) {
      directVideoRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (videoId) {
      sendCommand('pauseVideo');
      setIsPlaying(false);
    }
  }, [isDirectVideo, videoId, sendCommand]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePause, handlePlay]);

  const handleSeek = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.min(duration || 0, seconds));
    setCurrentTime(clamped);
    if (isDirectVideo && directVideoRef.current) {
      directVideoRef.current.currentTime = clamped;
    } else if (videoId) {
      sendCommand('seekTo', [clamped, true]);
    }
  }, [duration, isDirectVideo, videoId, sendCommand]);

  const handleSkip = useCallback((offsetSeconds: number) => {
    handleSeek(currentTime + offsetSeconds);
  }, [currentTime, handleSeek]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(100, newVolume));
    setVolume(clamped);
    if (clamped === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }

    if (isDirectVideo && directVideoRef.current) {
      directVideoRef.current.volume = clamped / 100;
      directVideoRef.current.muted = clamped === 0;
    } else if (videoId) {
      sendCommand('setVolume', [clamped]);
      if (clamped === 0) {
        sendCommand('mute');
      } else {
        sendCommand('unMute');
      }
    }
  }, [isDirectVideo, videoId, isMuted, sendCommand]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      const restored = volume === 0 ? 50 : volume;
      setVolume(restored);
      if (isDirectVideo && directVideoRef.current) {
        directVideoRef.current.muted = false;
        directVideoRef.current.volume = restored / 100;
      } else if (videoId) {
        sendCommand('unMute');
        sendCommand('setVolume', [restored]);
      }
    } else {
      setIsMuted(true);
      if (isDirectVideo && directVideoRef.current) {
        directVideoRef.current.muted = true;
      } else if (videoId) {
        sendCommand('mute');
      }
    }
  }, [isMuted, volume, isDirectVideo, videoId, sendCommand]);

  const cyclePlaybackSpeed = useCallback(() => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);

    if (isDirectVideo && directVideoRef.current) {
      directVideoRef.current.playbackRate = nextSpeed;
    } else if (videoId) {
      sendCommand('setPlaybackRate', [nextSpeed]);
    }
  }, [playbackSpeed, isDirectVideo, videoId, sendCommand]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleNext = useCallback(() => {
    if (onNextLesson) {
      onNextLesson();
    } else if (onComplete) {
      onComplete();
    }
  }, [onNextLesson, onComplete]);

  // Détection du plein écran
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Écouteur global des événements postMessage de YouTube
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data !== 'string') return;
        const data = JSON.parse(event.data);

        // Données d'avancement et d'état du lecteur YouTube
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (typeof data.info.playerState === 'number') {
            if (data.info.playerState === 1) setIsPlaying(true);
            else if (data.info.playerState === 2) setIsPlaying(false);
            else if (data.info.playerState === 0) {
              setIsPlaying(false);
              if (onEnded) onEnded();
              if (onComplete) onComplete();
            }
          }
          if (typeof data.info.videoLoadedFraction === 'number') {
            setBuffered(data.info.videoLoadedFraction);
          }
        } else if (data.event === 'onStateChange') {
          if (data.info === 1) setIsPlaying(true);
          else if (data.info === 2) setIsPlaying(false);
          else if (data.info === 0) {
            setIsPlaying(false);
            if (onEnded) onEnded();
            if (onComplete) onComplete();
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEnded, onComplete]);

  // Disparition automatique fluide de la barre de contrôle pendant la lecture
  const triggerUserActivity = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2600);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    } else {
      triggerUserActivity();
    }
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [isPlaying, triggerUserActivity]);

  // Sondage léger de progression si le message postMessage est asynchrone
  useEffect(() => {
    if (!isPlaying || !videoId) return;
    const interval = setInterval(() => {
      sendCommand('getCurrentTime');
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, videoId, sendCommand]);

  // Calcul du pourcentage d'avancement
  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  // Interaction Scrubber
  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverPositionPercent(ratio * 100);
    setHoverTime(ratio * (duration || 0));
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = ratio * (duration || 0);
    handleSeek(targetSeconds);
  };

  // Raccourcis Clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft' || e.key === 'j') {
      e.preventDefault();
      handleSkip(-5);
    } else if (e.key === 'ArrowRight' || e.key === 'l') {
      e.preventDefault();
      handleSkip(5);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleVolumeChange(volume + 10);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleVolumeChange(volume - 10);
    } else if (e.key === 'm') {
      e.preventDefault();
      toggleMute();
    } else if (e.key === 'f') {
      e.preventDefault();
      toggleFullscreen();
    }
  };

  // Source indisponible
  if (!videoId && !isDirectVideo) {
    return (
      <div className={`aspect-video w-full relative overflow-hidden bg-black rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-400 border border-slate-800 ${className}`}>
        <p className="text-sm font-semibold text-slate-200">Aucune source vidéo configurée pour cette leçon</p>
        <p className="text-xs text-slate-500 mt-1">L'administrateur ou l'enseignant peut ajouter une URL YouTube ou téléverser une vidéo.</p>
      </div>
    );
  }

  return (
    <VideoPlayerErrorBoundary videoUrl={videoUrl}>
      {/* 1. LE CONTENEUR PRINCIPAL : aspect-video w-full relative overflow-hidden bg-black */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseMove={triggerUserActivity}
        onMouseLeave={() => {
          if (isPlaying) setShowControls(false);
        }}
        className={`aspect-video w-full relative overflow-hidden bg-black rounded-xl select-none group focus:outline-none ${className}`}
      >
        {/* 2. LE HACK DE LA HAUTEUR : w-full h-[150%] top-1/2 -translate-y-1/2 pointer-events-none */}
        {/* L'illusion d'optique génère des bandes noires en haut et en bas dans l'iFrame, repoussant le logo et le titre hors du conteneur parent */}
        {videoId && (
          <iframe
            ref={iframeRef}
            src={youtubeEmbedUrl}
            title={title}
            onLoad={handleIframeLoad}
            className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[150%] pointer-events-none border-0 select-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            tabIndex={-1}
          />
        )}

        {/* OU VIDÉO DIRECTE HTML5 */}
        {isDirectVideo && (
          <video
            ref={directVideoRef}
            src={videoUrl}
            playsInline
            className="w-full h-full object-contain select-none"
            onTimeUpdate={() => {
              if (directVideoRef.current) {
                setCurrentTime(directVideoRef.current.currentTime);
                setDuration(directVideoRef.current.duration || 0);
              }
            }}
            onProgress={() => {
              if (directVideoRef.current && directVideoRef.current.buffered.length > 0) {
                const bEnd = directVideoRef.current.buffered.end(directVideoRef.current.buffered.length - 1);
                const d = directVideoRef.current.duration;
                if (d > 0) setBuffered(bEnd / d);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              if (onEnded) onEnded();
              if (onComplete) onComplete();
            }}
          />
        )}

        {/* ZONE DE CLIC PRINCIPALE (Lecture / Pause / Plein Écran) */}
        <div
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label={isPlaying ? 'Mettre en pause' : 'Lire la vidéo'}
          title="Cliquer pour Lire / Pause, double-cliquer pour plein écran"
        />

        {/* BOUTON PLAY CENTRAL FLOTTANT (Affiché en pause) */}
        {!isPlaying && (
          <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none transition-opacity duration-300">
            <button
              type="button"
              onClick={handlePlay}
              className="pointer-events-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white shadow-2xl shadow-blue-500/40 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md border border-white/20"
              title="Lancer la vidéo"
            >
              <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-white translate-x-0.5" />
            </button>
          </div>
        )}

        {/* TITRE DISCRET EN HAUT À GAUCHE */}
        {title && (
          <div
            className={`absolute top-3 left-3 z-15 transition-opacity duration-300 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-800 text-[11px] font-semibold text-slate-200 ${
              showControls || !isPlaying ? 'opacity-90' : 'opacity-0'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{title}</span>
          </div>
        )}

        {/* 3. LA BARRE DE CONTRÔLE NANA : absolute bottom-0 w-full z-20 (Élégante & Fine) */}
        <div
          className={`absolute bottom-0 inset-x-0 w-full z-20 px-3 sm:px-4 pt-6 pb-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-all duration-300 flex flex-col gap-1.5 ${
            showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Scrubber Fin & Fluide */}
          <div
            ref={progressHoverRef}
            onClick={handleScrubberClick}
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={() => setHoverTime(null)}
            className="group/scrubber relative w-full h-3 flex items-center cursor-pointer py-1"
          >
            {/* Infobulle Horodatage au Survol */}
            {hoverTime !== null && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[10px] font-mono shadow-xl pointer-events-none whitespace-nowrap"
                style={{ left: `${hoverPositionPercent}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Rail de base ultra-fin */}
            <div className="relative w-full h-1 group-hover/scrubber:h-2 rounded-full bg-white/20 overflow-hidden transition-all duration-150">
              {/* Tampon de chargement */}
              <div
                className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-200"
                style={{ width: `${Math.min(100, buffered * 100)}%` }}
              />
              {/* Ligne de lecture */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Curseur Circulaire (Thumb) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md shadow-blue-500/50 border border-blue-500 scale-0 group-hover/scrubber:scale-100 transition-transform duration-150 pointer-events-none"
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          {/* Rangée des Boutons : Fine & Épurée */}
          <div className="flex items-center justify-between gap-2 text-slate-200">
            {/* Côté Gauche : Play, Sauts, Volume, Compteur */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-lg hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition cursor-pointer text-white"
                title={isPlaying ? 'Pause (Espace)' : 'Lire (Espace)'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSkip(-10)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                title="Reculer de 10s (←)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSkip(10)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                title="Avancer de 10s (→)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Volume & Sourdine */}
              <div className="flex items-center gap-1 ml-0.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                  title={isMuted ? 'Activer le son (M)' : 'Couper le son (M)'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : volume < 50 ? (
                    <Volume1 className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-12 sm:w-16 h-1 rounded-lg bg-slate-700 accent-blue-500 cursor-pointer opacity-70 hover:opacity-100 transition"
                  title={`Volume : ${isMuted ? 0 : volume}%`}
                />
              </div>

              {/* Compteur temps monospace */}
              <div className="text-[11px] font-mono text-slate-300 ml-1.5 select-none tracking-tight">
                <span>{formatTime(currentTime)}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Côté Droit : Vitesse, Bouton Suivant (fin et raffiné), Plein Écran */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cyclePlaybackSpeed}
                className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 transition cursor-pointer"
                title="Vitesse de lecture"
              >
                {playbackSpeed}x
              </button>

              {/* Bouton Suivant Élégant & Fin */}
              {(onNextLesson || hasNextLesson !== false || onComplete) && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-md shadow-blue-600/30 transition cursor-pointer select-none"
                  title="Leçon suivante"
                >
                  <span>Suivant</span>
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                title={isFullscreen ? 'Quitter le plein écran (F)' : 'Plein écran (F)'}
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5" />
                ) : (
                  <Maximize className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </VideoPlayerErrorBoundary>
  );
};

export default StealthYouTubePlayer;
