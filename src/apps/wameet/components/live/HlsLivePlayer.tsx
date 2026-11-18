/**
 * @file HlsLivePlayer.tsx
 * @description Lecteur vidéo Live Streaming HLS basse latence pour les acheteurs et spectateurs.
 * 
 * Fonctionnalités :
 * - Prise en charge universelle : hls.js pour Chrome/Android/Desktop + fallback natif Safari iOS
 * - Configuration basse latence (LL-HLS MediaMTX)
 * - Gestion de reconnexion automatique avec backoff si le vendeur n'a pas encore démarré
 * - Overlay d'activation du son (tap-to-unmute) pour contourner les blocages autoplay
 * - Détection fluide de l'état du direct (En attente / En direct / Pause)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Radio, 
  RefreshCw, 
  Play, 
  AlertCircle, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { buildStoreHlsUrl, getLiveHlsBaseUrl } from '../../../../config/liveStreamConfig';
import { playTapBeep } from '../../../../utils/audio';

export interface HlsLivePlayerProps {
  storeSlug?: string;
  src?: string;
  posterUrl?: string;
  storeName?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onStreamReady?: () => void;
  onStreamWaiting?: () => void;
}

export const HlsLivePlayer: React.FC<HlsLivePlayerProps> = ({
  storeSlug = 'live-master',
  src,
  posterUrl,
  storeName = 'Boutique en Direct',
  autoPlay = true,
  muted: initialMuted = true,
  className = '',
  onStreamReady,
  onStreamWaiting
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<any>(null);

  const [isMuted, setIsMuted] = useState<boolean>(initialMuted);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Résolution de l'URL HLS finale
  const targetHlsUrl = src || buildStoreHlsUrl(storeSlug);

  // Initialisation du flux HLS (hls.js ou natif Safari)
  const initHlsPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video || !targetHlsUrl) return;

    // Nettoyer l'instance précédente
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setErrorMessage(null);
    setIsRetrying(false);

    // 1. Support Hls.js (Chrome, Firefox, Edge, Android)
    if (Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,
        maxLiveSyncPlaybackRate: 1.2,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1500,
        levelLoadingTimeOut: 10000,
        fragLoadingTimeOut: 20000,
        enableWorker: true,
        lowLatencyMode: true
      });

      hlsRef.current = hls;
      hls.loadSource(targetHlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[HLS PLAYER] Manifeste chargé avec succès :', targetHlsUrl);
        setIsLiveActive(true);
        setRetryCount(0);
        if (onStreamReady) onStreamReady();
        if (autoPlay) {
          video.play().catch(() => {
            // Si autoplay bloqué par le navigateur, on force en muet
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS PLAYER] Erreur réseau, tentative de récupération / attente vendeur...');
              setIsLiveActive(false);
              setIsRetrying(true);
              if (onStreamWaiting) onStreamWaiting();
              // Reconnexion automatique avec backoff progressif
              if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
              retryTimerRef.current = setTimeout(() => {
                setRetryCount(prev => prev + 1);
                hls.startLoad();
              }, Math.min(2000 + (retryCount * 500), 6000));
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS PLAYER] Erreur média, récupération automatique...');
              hls.recoverMediaError();
              break;

            default:
              console.warn('[HLS PLAYER] Erreur fatale non récupérable :', data);
              hls.destroy();
              setIsLiveActive(false);
              setIsRetrying(true);
              // Réinitialisation complète après 3s
              if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
              retryTimerRef.current = setTimeout(() => {
                initHlsPlayer();
              }, 3000);
              break;
          }
        }
      });
    } 
    // 2. Fallback natif Safari iOS & macOS
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = targetHlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLiveActive(true);
        if (onStreamReady) onStreamReady();
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          });
        }
      });

      video.addEventListener('error', () => {
        setIsLiveActive(false);
        setIsRetrying(true);
        if (onStreamWaiting) onStreamWaiting();
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          initHlsPlayer();
        }, 3000);
      });
    } else {
      setErrorMessage("Votre navigateur ne supporte pas la lecture de flux HLS.");
    }
  }, [targetHlsUrl, autoPlay, retryCount, onStreamReady, onStreamWaiting]);

  // Initialisation au montage
  useEffect(() => {
    initHlsPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [targetHlsUrl]);

  // Bascule du Son (Unmute / Mute)
  const handleToggleMute = () => {
    playTapBeep();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted) {
        videoRef.current.volume = 1.0;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Plein écran
  const handleToggleFullscreen = () => {
    playTapBeep();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-black select-none group shadow-2xl border border-slate-800 flex items-center justify-center ${className}`}
    >
      {/* 1. Élément Vidéo HTML5 Principal */}
      <video
        ref={videoRef}
        playsInline
        muted={isMuted}
        poster={posterUrl}
        className="w-full h-full object-cover"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* 2. Écran d'attente quand le direct n'a pas encore commencé ou micro-coupure */}
      {!isLiveActive && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 animate-ping" />
          </div>

          <div className="space-y-1.5 max-w-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Direct en Approche</span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white">
              {storeName} prépare sa session
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Le flux vidéo va démarrer automatiquement dès que le vendeur lance sa caméra.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Reconnexion automatique en cours...</span>
          </div>

          <button
            type="button"
            onClick={initHlsPlayer}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
          >
            Actualiser maintenant
          </button>
        </div>
      )}

      {/* 3. Gradient Supérieur & Inférieur pour lisibilité des contrôles */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      {/* 4. Badges Supérieurs : EN DIRECT + HD HLS */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10 pointer-events-auto">
        <div className="flex items-center gap-2">
          {isLiveActive ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black shadow-lg shadow-rose-600/40">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>EN DIRECT</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
              <span>HORS LIGNE</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 border border-white/20 backdrop-blur-md text-slate-200 text-[10px] font-bold">
            <span className="text-blue-400">LL-HLS</span>
            <span>MediaMTX</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition active:scale-95 cursor-pointer"
            title="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 5. Grosse Pastille Flottante Centrale : "Cliquez pour activer le son" (si muet et en direct) */}
      {isLiveActive && isMuted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
          <button
            type="button"
            onClick={handleToggleMute}
            className="pointer-events-auto px-5 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-900 text-white font-extrabold text-xs sm:text-sm border border-blue-500/50 shadow-2xl backdrop-blur-md flex items-center gap-3 transition transform hover:scale-105 active:scale-95 cursor-pointer animate-in zoom-in-95"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Volume2 className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 font-bold">
                <span>Cliquez pour activer le son du Direct</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                Écoutez les démonstrations et promotions en direct
              </span>
            </div>
          </button>
        </div>
      )}

      {/* 6. Contrôles Inférieurs : Bouton Mute Son */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-auto">
        <button
          type="button"
          onClick={handleToggleMute}
          className="p-2.5 rounded-2xl bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Son désactivé</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Son actif</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default HlsLivePlayer;
