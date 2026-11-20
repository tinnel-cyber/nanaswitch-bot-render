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
  RefreshCw,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { LiveAspectRatio } from '../../../../types/liveSession';
import { HlsLivePlayer } from './HlsLivePlayer';
import { playTapBeep } from '../../../../utils/audio';

export type DetectedProvider =
  | 'youtube'
  | 'vimeo'
  | 'dailymotion'
  | 'twitch'
  | 'facebook'
  | 'tiktok'
  | 'instagram'
  | 'hls'
  | 'html5'
  | 'generic_iframe';

export interface ParsedChameleonSource {
  provider: DetectedProvider;
  embedUrl: string;
  videoId?: string;
  suggestedRatio: LiveAspectRatio;
  overscanClass: string;
  isLikelyLive: boolean;
}

export function extractUniversalYouTubeId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) return cleaned;
  const iframeSrcMatch = cleaned.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i);
  const target = iframeSrcMatch ? iframeSrcMatch[1] : cleaned;
  const match = target.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/|e\/))([a-zA-Z0-9_-]{11})/i
  );
  if (match?.[1]) return match[1];
  const fallback = target.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return fallback?.[1] || null;
}

export function parseChameleonVideoSource(rawInput: string, autoPlay = true): ParsedChameleonSource | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const raw = rawInput.trim();
  if (!raw) return null;

  const iframeMatch = raw.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i);
  const url = iframeMatch ? iframeMatch[1].trim() : raw;
  const lower = url.toLowerCase();

  // 1. YouTube (Standard, Live, Shorts, nocookie, embed)
  const ytId = extractUniversalYouTubeId(url);
  if (ytId) {
    const isShorts = lower.includes('/shorts/');
    const isLive = lower.includes('/live/');
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    const params = [
      'enablejsapi=1',
      'controls=0',
      'modestbranding=1',
      'rel=0',
      'playsinline=1',
      'iv_load_policy=3',
      'disablekb=1',
      'fs=0',
      'showinfo=0',
      autoPlay ? 'autoplay=1' : 'autoplay=0',
      origin ? `origin=${encodeURIComponent(origin)}` : '',
    ]
      .filter(Boolean)
      .join('&');

    return {
      provider: 'youtube',
      videoId: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?${params}`,
      suggestedRatio: isShorts ? '9:16' : '16:9',
      // Technique Stealth Campus Privé : hauteur 150% centrée -> repousse 100% du logo YouTube,
      // de l'avatar de chaîne, du titre, de "Regarder plus tard" et des suggestions hors du cadre !
      overscanClass: isShorts
        ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[112%] h-[135%] pointer-events-none border-0 select-none'
        : 'absolute top-1/2 left-0 -translate-y-1/2 w-full h-[150%] pointer-events-none border-0 select-none',
      isLikelyLive: isLive,
    };
  }

  // 2. Vimeo (controls=0, title=0, byline=0, portrait=0, dnt=1, badge=0)
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/|event\/)?([0-9]+)/i);
  if (vimeoMatch?.[1]) {
    return {
      provider: 'vimeo',
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${autoPlay ? 1 : 0}&controls=0&title=0&byline=0&portrait=0&badge=0&dnt=1&playsinline=1`,
      suggestedRatio: '16:9',
      overscanClass: 'absolute top-1/2 left-0 -translate-y-1/2 w-full h-[138%] pointer-events-none border-0 select-none',
      isLikelyLive: lower.includes('/event/'),
    };
  }

  // 3. Dailymotion (ui-logo=false, controls=false)
  const dmMatch = url.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  if (dmMatch?.[1]) {
    return {
      provider: 'dailymotion',
      videoId: dmMatch[1],
      embedUrl: `https://geo.dailymotion.com/player.html?video=${dmMatch[1]}&autoplay=${autoPlay ? 1 : 0}&controls=false&ui-logo=false&ui-start-screen-info=false`,
      suggestedRatio: '16:9',
      overscanClass: 'absolute top-1/2 left-0 -translate-y-1/2 w-full h-[142%] pointer-events-none border-0 select-none',
      isLikelyLive: false,
    };
  }

  // 4. Twitch
  if (lower.includes('twitch.tv')) {
    const channel = url.split('twitch.tv/')[1]?.split('/')[0]?.split('?')[0] || '';
    const host = typeof window !== 'undefined' ? window.location.hostname : 'nsore.shop';
    if (channel) {
      return {
        provider: 'twitch',
        videoId: channel,
        embedUrl: `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(host)}&autoplay=${autoPlay ? 'true' : 'false'}&controls=false`,
        suggestedRatio: '16:9',
        overscanClass: 'absolute top-1/2 left-0 -translate-y-1/2 w-full h-[132%] pointer-events-none border-0 select-none',
        isLikelyLive: true,
      };
    }
  }

  // 5. Facebook Live / Video
  if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.gg')) {
    const isReel = lower.includes('/reel/');
    return {
      provider: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=${autoPlay ? 'true' : 'false'}`,
      suggestedRatio: isReel ? '9:16' : '16:9',
      overscanClass: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[108%] h-[138%] pointer-events-none border-0 select-none',
      isLikelyLive: lower.includes('/live'),
    };
  }

  // 6. TikTok
  if (lower.includes('tiktok.com')) {
    const matchTt = url.match(/\/video\/(\d+)/) || url.match(/\/live\/(\d+)/);
    if (matchTt?.[1]) {
      return {
        provider: 'tiktok',
        videoId: matchTt[1],
        embedUrl: `https://www.tiktok.com/player/v1/${matchTt[1]}?autoplay=${autoPlay ? 1 : 0}&controls=0&description=0&music_info=0&rel=0`,
        suggestedRatio: '9:16',
        overscanClass: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[112%] h-[130%] pointer-events-none border-0 select-none',
        isLikelyLive: lower.includes('/live/'),
      };
    }
  }

  // 7. Instagram Reel / TV / Post
  if (lower.includes('instagram.com')) {
    const matchIg = url.match(/instagram\.com\/(p|reel|tv)\/([^/?#&]+)/i);
    if (matchIg) {
      return {
        provider: 'instagram',
        videoId: matchIg[2],
        embedUrl: `https://www.instagram.com/${matchIg[1]}/${matchIg[2]}/embed/`,
        suggestedRatio: matchIg[1].toLowerCase() === 'reel' ? '9:16' : '1:1',
        overscanClass: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[112%] h-[142%] pointer-events-none border-0 select-none',
        isLikelyLive: false,
      };
    }
  }

  // 8. HLS (.m3u8)
  if (lower.includes('.m3u8')) {
    return {
      provider: 'hls',
      embedUrl: url,
      suggestedRatio: '16:9',
      overscanClass: 'w-full h-full',
      isLikelyLive: true,
    };
  }

  // 9. Vidéo HTML5 directe (.mp4, .webm, .mov, Supabase Storage, blob)
  if (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.includes('/blob/') ||
    lower.includes('supabase.co/storage')
  ) {
    return {
      provider: 'html5',
      embedUrl: url,
      suggestedRatio: '16:9',
      overscanClass: 'w-full h-full object-contain',
      isLikelyLive: false,
    };
  }

  // 10. Tout autre embed vidéo tiers (Wistia, Loom, Bunny, Cloudflare Stream, etc.)
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return {
      provider: 'generic_iframe',
      embedUrl: url,
      suggestedRatio: '16:9',
      overscanClass: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[106%] h-[132%] pointer-events-none border-0 select-none',
      isLikelyLive: lower.includes('live'),
    };
  }

  return null;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface NanasoreChameleonPlayerProps {
  videoUrl: string;
  title?: string;
  storeSlug?: string;
  storeName?: string;
  posterUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  onDetectedAspectRatio?: (ratio: LiveAspectRatio) => void;
  onMutedChange?: (muted: boolean) => void;
  onRequestFullscreen?: () => void;
  isFullscreen?: boolean;
  className?: string;
}

/**
 * Lecteur Universel Marque Blanche Caméléon Nanasore (inspiré du StealthYouTubePlayer Campus Privé).
 * - Masque 100% des logos, titres, avatars et liens sortants de YouTube, Vimeo, Dailymotion,
 *   Twitch, Facebook, TikTok, Instagram et tout fournisseur tiers.
 * - S'adapte automatiquement au format de la source (16:9, 9:16, 1:1, 4:3).
 * - Contrôles 100% Nanasore (Play/Pause, Volume, Timeline/LIVE, Vitesse, Rechargement, Plein écran).
 */
export const NanasoreChameleonPlayer: React.FC<NanasoreChameleonPlayerProps> = ({
  videoUrl,
  title = 'Diffusion Nanasore',
  storeSlug = 'live',
  storeName = 'Nanasore',
  posterUrl,
  autoPlay = true,
  muted = false,
  onDetectedAspectRatio,
  onMutedChange,
  onRequestFullscreen,
  isFullscreen = false,
  className = '',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const directVideoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parsed = useMemo(() => parseChameleonVideoSource(videoUrl, autoPlay), [videoUrl, autoPlay]);

  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(muted);
  const [volume, setVolume] = useState<number>(muted ? 0 : 100);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  // Synchroniser le mode muet externe
  useEffect(() => {
    setIsMuted(muted);
  }, [muted]);

  // Auto-adaptation Caméléon dès la détection de la source
  useEffect(() => {
    if (parsed?.suggestedRatio && onDetectedAspectRatio) {
      onDetectedAspectRatio(parsed.suggestedRatio);
    }
  }, [parsed?.suggestedRatio, parsed?.embedUrl, onDetectedAspectRatio]);

  // Commandes postMessage YouTube / Vimeo
  const sendYouTubeCmd = useCallback((func: string, args: any[] = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch {}
  }, []);

  const sendVimeoCmd = useCallback((method: string, value?: any) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify(value !== undefined ? { method, value } : { method }),
        '*'
      );
    } catch {}
  }, []);

  // Écoute des événements YouTube / Vimeo pour synchroniser durée, temps courant et état
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.data) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (parsed?.provider === 'youtube') {
          if (data?.event === 'infoDelivery' && data?.info) {
            if (typeof data.info.currentTime === 'number') setCurrentTime(data.info.currentTime);
            if (typeof data.info.duration === 'number') setDuration(data.info.duration);
            if (typeof data.info.playerState === 'number') {
              if (data.info.playerState === 1) setIsPlaying(true);
              if (data.info.playerState === 2 || data.info.playerState === 0) setIsPlaying(false);
            }
          }
        } else if (parsed?.provider === 'vimeo') {
          if (data?.event === 'play') setIsPlaying(true);
          if (data?.event === 'pause') setIsPlaying(false);
          if (data?.event === 'timeupdate' && data?.data) {
            if (typeof data.data.seconds === 'number') setCurrentTime(data.data.seconds);
            if (typeof data.data.duration === 'number') setDuration(data.data.duration);
          }
        }
      } catch {}
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [parsed?.provider]);

  const handleIframeLoad = useCallback(() => {
    if (parsed?.provider === 'youtube') {
      try {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
        if (isMuted) sendYouTubeCmd('mute');
        if (autoPlay) sendYouTubeCmd('playVideo');
      } catch {}
    } else if (parsed?.provider === 'vimeo') {
      sendVimeoCmd('addEventListener', 'play');
      sendVimeoCmd('addEventListener', 'pause');
      sendVimeoCmd('addEventListener', 'timeupdate');
      if (isMuted) sendVimeoCmd('setVolume', 0);
    }
  }, [parsed?.provider, isMuted, autoPlay, sendYouTubeCmd, sendVimeoCmd]);

  const triggerControls = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleTogglePlay = useCallback(() => {
    playTapBeep();
    triggerControls();
    if (!parsed) return;

    if (parsed.provider === 'html5' && directVideoRef.current) {
      if (isPlaying) {
        directVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        directVideoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }

    if (parsed.provider === 'youtube') {
      if (isPlaying) {
        sendYouTubeCmd('pauseVideo');
        setIsPlaying(false);
      } else {
        sendYouTubeCmd('playVideo');
        setIsPlaying(true);
      }
      return;
    }

    if (parsed.provider === 'vimeo') {
      if (isPlaying) {
        sendVimeoCmd('pause');
        setIsPlaying(false);
      } else {
        sendVimeoCmd('play');
        setIsPlaying(true);
      }
      return;
    }

    setIsPlaying((prev) => !prev);
  }, [parsed, isPlaying, sendYouTubeCmd, sendVimeoCmd, triggerControls]);

  const handleToggleMute = useCallback(() => {
    playTapBeep();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    onMutedChange?.(nextMuted);

    if (parsed?.provider === 'html5' && directVideoRef.current) {
      directVideoRef.current.muted = nextMuted;
    } else if (parsed?.provider === 'youtube') {
      sendYouTubeCmd(nextMuted ? 'mute' : 'unMute');
      if (!nextMuted && volume === 0) {
        setVolume(80);
        sendYouTubeCmd('setVolume', [80]);
      }
    } else if (parsed?.provider === 'vimeo') {
      sendVimeoCmd('setVolume', nextMuted ? 0 : (volume || 80) / 100);
    }
  }, [isMuted, parsed?.provider, volume, sendYouTubeCmd, sendVimeoCmd, onMutedChange]);

  const handleVolumeChange = useCallback(
    (nextVol: number) => {
      setVolume(nextVol);
      const nextMuted = nextVol === 0;
      setIsMuted(nextMuted);
      onMutedChange?.(nextMuted);
      if (parsed?.provider === 'html5' && directVideoRef.current) {
        directVideoRef.current.volume = nextVol / 100;
        directVideoRef.current.muted = nextMuted;
      } else if (parsed?.provider === 'youtube') {
        if (nextMuted) sendYouTubeCmd('mute');
        else {
          sendYouTubeCmd('unMute');
          sendYouTubeCmd('setVolume', [nextVol]);
        }
      } else if (parsed?.provider === 'vimeo') {
        sendVimeoCmd('setVolume', nextVol / 100);
      }
    },
    [parsed?.provider, sendYouTubeCmd, sendVimeoCmd, onMutedChange]
  );

  const handleSkip = useCallback(
    (delta: number) => {
      playTapBeep();
      const target = Math.max(0, Math.min(duration || currentTime + Math.abs(delta), currentTime + delta));
      setCurrentTime(target);
      if (parsed?.provider === 'html5' && directVideoRef.current) {
        directVideoRef.current.currentTime = target;
      } else if (parsed?.provider === 'youtube') {
        sendYouTubeCmd('seekTo', [target, true]);
      } else if (parsed?.provider === 'vimeo') {
        sendVimeoCmd('setCurrentTime', target);
      }
    },
    [currentTime, duration, parsed?.provider, sendYouTubeCmd, sendVimeoCmd]
  );

  const handleScrub = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const target = ratio * duration;
      setCurrentTime(target);
      if (parsed?.provider === 'html5' && directVideoRef.current) {
        directVideoRef.current.currentTime = target;
      } else if (parsed?.provider === 'youtube') {
        sendYouTubeCmd('seekTo', [target, true]);
      } else if (parsed?.provider === 'vimeo') {
        sendVimeoCmd('setCurrentTime', target);
      }
    },
    [duration, parsed?.provider, sendYouTubeCmd, sendVimeoCmd]
  );

  const handleCycleSpeed = useCallback(() => {
    playTapBeep();
    const speeds = [1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(next);
    if (parsed?.provider === 'html5' && directVideoRef.current) {
      directVideoRef.current.playbackRate = next;
    } else if (parsed?.provider === 'youtube') {
      sendYouTubeCmd('setPlaybackRate', [next]);
    } else if (parsed?.provider === 'vimeo') {
      sendVimeoCmd('setPlaybackRate', next);
    }
  }, [playbackSpeed, parsed?.provider, sendYouTubeCmd, sendVimeoCmd]);

  if (!parsed) return null;

  // Flux HLS natif Nanasore
  if (parsed.provider === 'hls') {
    return (
      <HlsLivePlayer
        src={parsed.embedUrl}
        storeSlug={storeSlug}
        storeName={storeName}
        posterUrl={posterUrl}
        autoPlay={autoPlay}
        muted={isMuted}
        className={`w-full h-full ${className}`}
      />
    );
  }

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const isLiveStream = parsed.isLikelyLive || duration === 0;

  return (
    <div
      onMouseMove={triggerControls}
      onTouchStart={triggerControls}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      className={`relative w-full h-full overflow-hidden bg-black select-none group ${className}`}
    >
      {/* 1. COUCHE MÉDIA SOUS-JACENTE (100% MARQUE BLANCHE VIA OVERSCAN OPTIQUE & BOUCLIER) */}
      {parsed.provider === 'html5' ? (
        <video
          ref={directVideoRef}
          key={`${parsed.embedUrl}_${reloadNonce}`}
          src={parsed.embedUrl}
          poster={posterUrl}
          autoPlay={autoPlay}
          muted={isMuted}
          playsInline
          className="w-full h-full object-contain select-none"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setDuration(v.duration || 0);
            if (v.videoWidth > 0 && v.videoHeight > 0 && onDetectedAspectRatio) {
              const r = v.videoWidth / v.videoHeight;
              if (r < 0.8) onDetectedAspectRatio('9:16');
              else if (r <= 1.2) onDetectedAspectRatio('1:1');
              else if (r <= 1.45) onDetectedAspectRatio('4:3');
              else onDetectedAspectRatio('16:9');
            }
          }}
          onTimeUpdate={() => {
            if (directVideoRef.current) {
              setCurrentTime(directVideoRef.current.currentTime);
              setDuration(directVideoRef.current.duration || 0);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      ) : (
        <iframe
          ref={iframeRef}
          key={`${parsed.embedUrl}_${reloadNonce}`}
          src={parsed.embedUrl}
          title={title}
          onLoad={handleIframeLoad}
          className={parsed.overscanClass}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          tabIndex={-1}
        />
      )}

      {/* 2. MASQUES OPTIQUES HAUT & BAS ANTI-LOGO EXTERNE + BOUCLIER ANTI-CLIC SORTANT */}
      <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

      {/* Bouclier transparent plein écran : empêche tout clic sur un logo tiers (YouTube/Vimeo/TikTok/Facebook) */}
      <div
        onClick={handleTogglePlay}
        onDoubleClick={() => onRequestFullscreen?.()}
        className="absolute inset-0 z-15 cursor-pointer"
        aria-label={isPlaying ? 'Mettre en pause' : 'Lire le flux'}
      />

      {/* 3. BOUTON PLAY CENTRAL MARQUE BLANCHE NANASORE (EN PAUSE) */}
      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePlay();
            }}
            className="pointer-events-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1D4ED8]/95 hover:bg-blue-600 text-white shadow-2xl shadow-blue-950/60 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-2 border-white/25 backdrop-blur-md cursor-pointer"
            title="Lancer la lecture Nanasore"
          >
            <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-white translate-x-0.5" />
          </button>
        </div>
      )}

      {/* 4. BARRE DE CONTRÔLE 100% NANASORE (ZÉRO LOGO EXTERNE) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 inset-x-0 z-25 px-3 sm:px-4 pt-5 pb-2.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-all duration-300 flex flex-col gap-1.5 ${
          showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Scrubber temporel (masqué si pur flux live sans durée) */}
        {!isLiveStream && duration > 0 && (
          <div
            ref={progressRef}
            onClick={handleScrub}
            className="group/scrub relative w-full h-3 flex items-center cursor-pointer py-1"
          >
            <div className="relative w-full h-1 group-hover/scrub:h-2 rounded-full bg-white/20 overflow-hidden transition-all">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#1D4ED8] shadow-md pointer-events-none"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-white">
          {/* Gauche : Play/Pause, +/-10s, Volume, Horodatage / EN DIRECT */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer shrink-0"
              title={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
            </button>

            {!isLiveStream && (
              <>
                <button
                  type="button"
                  onClick={() => handleSkip(-10)}
                  className="hidden sm:flex w-7 h-7 rounded-lg hover:bg-white/15 items-center justify-center transition cursor-pointer"
                  title="Reculer 10s"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSkip(10)}
                  className="hidden sm:flex w-7 h-7 rounded-lg hover:bg-white/15 items-center justify-center transition cursor-pointer"
                  title="Avancer 10s"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleToggleMute}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer shrink-0"
              title={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : volume < 50 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="hidden md:block w-16 accent-[#2563EB] cursor-pointer h-1"
              aria-label="Volume"
            />

            {isLiveStream ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600/90 text-[10px] font-black uppercase tracking-wider shrink-0">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Direct</span>
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-200 tabular-nums shrink-0 ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>

          {/* Droite : Filigrane Marque Blanche Nanasore, Vitesse, Reload, Plein Écran */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 text-[10px] font-extrabold text-blue-200">
              <ShieldCheck className="w-3 h-3 text-blue-400" />
              <span>Nanasore Player</span>
            </span>

            {!isLiveStream && (
              <button
                type="button"
                onClick={handleCycleSpeed}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-black tabular-nums transition cursor-pointer"
                title="Vitesse de lecture"
              >
                {playbackSpeed}x
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setReloadNonce((n) => n + 1);
              }}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
              title="Recharger le flux"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {onRequestFullscreen && (
              <button
                type="button"
                onClick={onRequestFullscreen}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NanasoreChameleonPlayer;
