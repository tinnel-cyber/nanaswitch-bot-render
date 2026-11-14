import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, Maximize2, Minimize2, 
  RefreshCw, Settings, ShieldCheck, Radio, Users, Sparkles, Volume2, 
  VolumeX, Camera, AlertCircle
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface DailyNativePlayerProps {
  roomUrl?: string;
  isHost?: boolean;
  userName?: string;
  onLeave?: () => void;
  isCutoff?: boolean;
  className?: string;
}

export const DailyNativePlayer: React.FC<DailyNativePlayerProps> = React.memo(({
  roomUrl,
  isHost = false,
  userName = 'Participant NaNa Live',
  onLeave,
  isCutoff = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const callFrameRef = useRef<any>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(isHost ? 1 : 24);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [useLocalWebcamFallback, setUseLocalWebcamFallback] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // 1. Initialisation Daily.co dynamique ou WebRTC Local
  useEffect(() => {
    let isMounted = true;

    // Si une URL Daily.co valide est configurée, charger dynamiquement le SDK pour alléger le bundle initial
    if (roomUrl && roomUrl.includes('daily.co') && containerRef.current) {
      const initDaily = async () => {
        try {
          const DailyIframeModule = await import('@daily-co/daily-js');
          const DailyIframe: any = DailyIframeModule.default || DailyIframeModule;
          if (!isMounted || !containerRef.current) return;

          const callFrame = DailyIframe.createFrame(containerRef.current, {
            iframeStyle: {
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#070b14',
              borderRadius: '1rem',
            },
            showLeaveButton: false,
            showFullscreenButton: false,
            showUserNameChangeUI: false,
            theme: {
              colors: {
                accent: '#2563eb',
                accentText: '#ffffff',
                background: '#070b14',
                backgroundAccent: '#0f172a',
                baseText: '#f8fafc',
                border: '#1e293b',
                mainAreaBg: '#070b14',
                mainAreaBgAccent: '#0d1527',
              },
            },
          });

          callFrameRef.current = callFrame;

          if (callFrame && typeof (callFrame as any).on === 'function') {
            callFrame
              .on('joined-meeting', () => {
                if (!isMounted) return;
                setConnectionState('connected');
              })
              .on('participant-joined', () => {
                if (!isMounted) return;
                setParticipantsCount((c) => c + 1);
              })
              .on('participant-left', () => {
                if (!isMounted) return;
                setParticipantsCount((c) => Math.max(1, c - 1));
              })
              .on('error', (e: any) => {
                console.warn('[DAILY] Call error, falling back to WebRTC local media:', e);
                if (isMounted) setUseLocalWebcamFallback(true);
              });
          }

          // Récupération dynamique d'un Meeting Token éphémère auprès du backend
          let meetingToken: string | undefined = undefined;
          try {
            const rawRoomName = roomUrl.split('daily.co/')[1]?.split('?')[0] || '';
            if (rawRoomName) {
              const tokenRes = await fetch('/api/daily/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomName: rawRoomName,
                  isOwner,
                  userName,
                  durationSeconds: 7200
                })
              });
              if (tokenRes.ok) {
                const tokenData = await tokenRes.json();
                meetingToken = tokenData.token;
              }
            }
          } catch (tErr) {
            console.warn('[DAILY] Token éphémère non obtenu, connexion publique directe:', tErr);
          }

          if (callFrame && typeof (callFrame as any).join === 'function') {
            const joinOptions: any = { url: roomUrl, userName };
            if (meetingToken) {
              joinOptions.token = meetingToken;
            }
            callFrame.join(joinOptions);
          }
        } catch (err) {
          console.warn('[DAILY] createFrame error:', err);
          if (isMounted) setUseLocalWebcamFallback(true);
        }
      };

      initDaily();

      return () => {
        isMounted = false;
        if (callFrameRef.current) {
          try {
            callFrameRef.current.destroy();
            callFrameRef.current = null;
          } catch (e) {}
        }
      };
    } else {
      // Pas d'URL Daily ou mode démo autonome -> initialiser le flux WebRTC média local
      setUseLocalWebcamFallback(true);
    }

    return () => {
      isMounted = false;
    };
  }, [roomUrl, userName]);

  // 2. Gestion du flux Webcam local WebRTC autonome
  useEffect(() => {
    if (!useLocalWebcamFallback) return;
    let stream: MediaStream | null = null;

    const startWebcam = async () => {
      try {
        setConnectionState('connecting');
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: true,
          });
          setLocalStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setConnectionState('connected');
        } else {
          setConnectionState('connected');
        }
      } catch (e) {
        console.info('[WEBRTC] Webcam permission notice or simulation fallback:', e);
        // Même sans webcam physique disponible, simuler un flux actif
        setConnectionState('connected');
      }
    };

    startWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [useLocalWebcamFallback, facingMode]);

  // Coupure gracieuse après expiration abonnement
  useEffect(() => {
    if (isCutoff) {
      if (callFrameRef.current) {
        try {
          callFrameRef.current.leave();
        } catch (e) {}
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    }
  }, [isCutoff, localStream]);

  // Contrôles Micro
  const toggleMic = () => {
    playTapBeep();
    if (callFrameRef.current) {
      callFrameRef.current.setLocalAudio(!isMicOn);
    }
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMicOn;
      });
    }
    setIsMicOn(!isMicOn);
  };

  // Contrôles Caméra
  const toggleCamera = () => {
    playTapBeep();
    if (callFrameRef.current) {
      callFrameRef.current.setLocalVideo(!isCameraOn);
    }
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraOn;
      });
    }
    setIsCameraOn(!isCameraOn);
  };

  // Bascule Caméra Avant / Arrière (Mobile)
  const toggleFacingMode = () => {
    playTapBeep();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Partage d'écran (Host uniquement)
  const toggleScreenShare = async () => {
    playTapBeep();
    if (callFrameRef.current) {
      if (!isScreenSharing) {
        await callFrameRef.current.startScreenShare();
      } else {
        await callFrameRef.current.stopScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
      return;
    }

    if (navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia) {
      try {
        if (!isScreenSharing) {
          const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = screenStream;
          }
          setIsScreenSharing(true);
          screenStream.getVideoTracks()[0].onended = () => {
            if (videoRef.current && localStream) {
              videoRef.current.srcObject = localStream;
            }
            setIsScreenSharing(false);
          };
        } else {
          if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
          }
          setIsScreenSharing(false);
        }
      } catch (err) {
        console.warn('Screen share cancelled or failed', err);
      }
    }
  };

  // Plein écran
  const toggleFullscreen = () => {
    playTapBeep();
    const elem = containerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video bg-[#070b14] rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl flex items-center justify-center select-none group ${className}`}
    >
      {/* 1. Affichage Vidéo Native WebRTC / Fallback Stream */}
      {useLocalWebcamFallback && (
        <div className="w-full h-full relative overflow-hidden bg-gradient-to-tr from-slate-950 via-[#070b14] to-indigo-950 flex items-center justify-center">
          {isCameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isHost}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-xl">
                <VideoOff className="w-8 h-8 text-rose-400/80" />
              </div>
              <div className="text-sm font-bold text-white">Caméra en pause</div>
              <p className="text-xs text-slate-400 max-w-xs">
                Le flux vidéo de l'animateur est momentanément désactivé
              </p>
            </div>
          )}

          {/* Halo d'ambiance direct */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        </div>
      )}

      {/* 2. Bandeau Supérieur de Télémétrie & Marque Blanche 100% */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-4 flex items-center justify-between z-20 pointer-events-none">
        {/* Badge Statut Live & Spectateurs */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-[11px] font-black shadow-lg backdrop-blur-md animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            <span>EN DIRECT</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-200 text-[11px] font-bold shadow-md backdrop-blur-md">
            <Users className="w-3 h-3 text-indigo-400" />
            <span>{participantsCount}</span>
          </div>
        </div>

        {/* Qualité WebRTC & Sceau Sécurisé */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold backdrop-blur-md">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>NaNa Live 1080p WebRTC</span>
          </span>

          {/* Bouton Plein Écran */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 backdrop-blur-md transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95"
            title="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Barre de Contrôles Flottante Épurée (Marque Blanche) */}
      <div className="absolute bottom-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-lg border border-slate-800 shadow-2xl z-20 transition-opacity duration-200 opacity-95 group-hover:opacity-100">
        {/* Micro */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-2.5 rounded-xl text-xs font-black transition cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center active:scale-95 ${
            isMicOn 
              ? 'bg-slate-800 hover:bg-slate-700 text-white' 
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
          title={isMicOn ? 'Couper mon micro' : 'Activer mon micro'}
        >
          {isMicOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Caméra */}
        <button
          type="button"
          onClick={toggleCamera}
          className={`p-2.5 rounded-xl text-xs font-black transition cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center active:scale-95 ${
            isCameraOn 
              ? 'bg-slate-800 hover:bg-slate-700 text-white' 
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
          title={isCameraOn ? 'Couper ma caméra' : 'Activer ma caméra'}
        >
          {isCameraOn ? <Video className="w-4 h-4 text-blue-400" /> : <VideoOff className="w-4 h-4" />}
        </button>

        {/* Changer de Caméra (Mobile) */}
        <button
          type="button"
          onClick={toggleFacingMode}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center active:scale-95 sm:hidden"
          title="Basculer caméra avant / arrière"
        >
          <Camera className="w-4 h-4 text-amber-400" />
        </button>

        {/* Partage d'écran (Host uniquement ou Desktop) */}
        {isHost && (
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`hidden sm:flex p-2.5 rounded-xl text-xs font-black transition cursor-pointer min-h-[42px] min-w-[42px] items-center justify-center active:scale-95 ${
              isScreenSharing 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Partager mon écran"
          >
            <Monitor className="w-4 h-4" />
          </button>
        )}

        {/* Quitter le direct */}
        {onLeave && (
          <button
            type="button"
            onClick={() => { playTapBeep(); onLeave(); }}
            className="px-3 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition cursor-pointer min-h-[42px] flex items-center gap-1.5 active:scale-95"
            title="Quitter la salle"
          >
            <span>Quitter</span>
          </button>
        )}
      </div>

      {/* 4. Coupure gracieuse / Limite de temps atteinte */}
      {isCutoff && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-2xl">
            <Radio className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white">
            Fin de la session de diffusion (Limite 20 min)
          </h3>
          <p className="text-xs text-slate-400 max-w-md">
            Votre temps d'antenne gratuit est écoulé. Les forfaits Pro & Illimité permettent de diffuser en continu sans coupure et d'accéder aux enregistrements HD.
          </p>
        </div>
      )}
    </div>
  );
});

export default DailyNativePlayer;
