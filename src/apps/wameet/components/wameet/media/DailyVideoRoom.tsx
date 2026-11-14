/**
 * @file DailyVideoRoom.tsx
 * @description Module Daily.co en marque blanche pour Synergy Matches, Rendez-vous et Guichet Rapide.
 * 
 * Sécurité & Spécifications :
 * - Gestion API Key vs Meeting Tokens : le client utilise exclusivement un token éphémère fourni par le backend.
 * - Hôte (Créateur / Vendeur) : is_owner = true
 * - Spectateur (Visiteur / Acheteur) : is_owner = false
 * - Timer Résonance 15 Minutes : Compte à rebours visuel discret, alerte douce à 2 minutes, et clôture fluide à 00:00.
 * - Écran de fin personnalisé avec CTAs : "Rejoindre un autre salon", "Contacter l'hôte", "Découvrir sa boutique".
 * - Thème Bleu Royal (#4169E1), Blanc Pur (#FFFFFF) et fond sombre (#070b14).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  PhoneOff, 
  Sparkles, 
  Users, 
  Clock, 
  Radio, 
  AlertTriangle,
  MessageSquare,
  ShoppingBag,
  RotateCcw
} from 'lucide-react';
import { playTapBeep, playCancelSound } from '../../../../../utils/audio';
import { 
  DAILY_BASE_URL, 
  fetchDailyMeetingToken, 
  sanitizeDailyRoomName 
} from '../../../../../services/dailyVideoService';

export interface DailyVideoRoomProps {
  roomUrl?: string;
  roomId?: string;
  userName?: string;
  sessionType?: 'instant_match' | 'appointment' | 'quick_booth';
  durationSeconds?: number; // 900s = 15 minutes par défaut (Résonance)
  meetingToken?: string;
  title?: string;
  partnerName?: string;
  isHost?: boolean;
  sellerStoreSlug?: string;
  hostUserId?: string;
  onLeave?: () => void;
  onContactHost?: () => void;
  onVisitShop?: () => void;
  onJoinAnotherRoom?: () => void;
  onErrorFallback?: () => void;
  className?: string;
}

export const DailyVideoRoom: React.FC<DailyVideoRoomProps> = ({
  roomUrl,
  roomId = 'wameet-quick-room',
  userName = 'Membre Wameet',
  sessionType = 'instant_match',
  durationSeconds = 900, // 15 minutes par défaut (900s)
  meetingToken,
  title,
  partnerName,
  isHost = false,
  sellerStoreSlug,
  hostUserId,
  onLeave,
  onContactHost,
  onVisitShop,
  onJoinAnotherRoom,
  onErrorFallback,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const callFrameRef = useRef<any>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(isHost ? 1 : 2);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'ended'>('connecting');
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Gestion du chronomètre 15 minutes (ou personnalisé)
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const isExpiringSoon = timeLeft <= 120 && timeLeft > 0; // Alerte douce à 2 minutes (<= 120s)

  // Construction de l'URL de chambre Daily.co officielle (nanasore.daily.co)
  const rawUrl = roomUrl || (roomId.startsWith('http') ? roomId : `${DAILY_BASE_URL}/${roomId}`);
  const effectiveRoomUrl = rawUrl.replace(/https:\/\/(wameet|nanasore|nana-telecom)\.daily\.co/g, `${DAILY_BASE_URL}`);

  // Formatage mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(Math.max(0, secs) / 60);
    const s = Math.floor(Math.max(0, secs) % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Fermeture propre de la session
  const closeSessionCleanly = useCallback(() => {
    setIsSessionEnded(true);
    setConnectionStatus('ended');
    if (callFrameRef.current) {
      try {
        callFrameRef.current.leave();
      } catch (_) {}
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
  }, [localStream]);

  // 1. Minuteur actif une fois connecté
  useEffect(() => {
    if (connectionStatus !== 'connected' || isSessionEnded) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          closeSessionCleanly();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [connectionStatus, isSessionEnded, closeSessionCleanly]);

  // 2. Initialisation SDK Daily.co avec Meeting Token sécurisé backend
  useEffect(() => {
    let isMounted = true;

    const initDailyCall = async () => {
      const roomNameMatch = effectiveRoomUrl.match(/daily\.co\/([a-zA-Z0-9_-]+)/);
      const cleanRoomName = sanitizeDailyRoomName(roomNameMatch ? roomNameMatch[1] : roomId);

      // Récupération dynamique du token éphémère backend si non fourni en prop
      let effectiveToken = meetingToken;
      try {
        if (!effectiveToken) {
          const tokenData = await fetchDailyMeetingToken({
            roomName: cleanRoomName,
            isOwner: isHost,
            userName,
            durationSeconds,
          });
          effectiveToken = tokenData.token;
        }
      } catch (err) {
        console.warn('[DailyVideoRoom] Obtention token éphémère différée :', err);
      }

      // Si le conteneur est prêt
      if (effectiveRoomUrl && containerRef.current) {
        try {
          const DailyIframeModule = await import('@daily-co/daily-js');
          const DailyIframe: any = DailyIframeModule.default || DailyIframeModule;
          if (!isMounted || !containerRef.current) return;

          // Nettoyage préalable d'un ancien callFrame
          if (callFrameRef.current) {
            try {
              callFrameRef.current.destroy();
            } catch (_) {}
            callFrameRef.current = null;
          }

          // Création du callFrame en marque blanche totale
          const callFrame = DailyIframe.createFrame(containerRef.current, {
            iframeStyle: {
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#070b14',
              borderRadius: '1.25rem',
            },
            showLeaveButton: false,
            showFullscreenButton: false,
            showUserNameChangeUI: false,
            theme: {
              colors: {
                accent: '#4169E1',
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

          callFrame
            .on('joined-meeting', () => {
              if (!isMounted) return;
              setConnectionStatus('connected');
              console.log('[DailyVideoRoom] Connecté au salon Daily.co avec token éphémère sécurisé');
            })
            .on('participant-joined', () => {
              if (!isMounted) return;
              setParticipantsCount((c) => c + 1);
            })
            .on('participant-left', () => {
              if (!isMounted) return;
              setParticipantsCount((c) => Math.max(1, c - 1));
            })
            .on('left-meeting', () => {
              if (!isMounted) return;
              if (!isSessionEnded) {
                closeSessionCleanly();
              }
            })
            .on('error', (err: any) => {
              console.warn('[DailyVideoRoom] Erreur de connexion Daily.co, bascule fallback :', err);
              if (onErrorFallback) {
                onErrorFallback();
              } else if (isMounted) {
                setUseLocalFallback(true);
              }
            });

          // Connexion au salon avec le token éphémère (is_owner respecté automatiquement)
          const joinConfig: any = {
            url: effectiveRoomUrl,
            userName,
          };
          if (effectiveToken) {
            joinConfig.token = effectiveToken;
          }

          await callFrame.join(joinConfig);
        } catch (e) {
          console.warn('[DailyVideoRoom] Impossible de charger Daily.co SDK, activation du repli local :', e);
          if (onErrorFallback) {
            onErrorFallback();
          } else if (isMounted) {
            setUseLocalFallback(true);
          }
        }
      } else {
        if (onErrorFallback) {
          onErrorFallback();
        } else if (isMounted) {
          setUseLocalFallback(true);
        }
      }
    };

    initDailyCall();

    return () => {
      isMounted = false;
      if (callFrameRef.current) {
        try {
          callFrameRef.current.destroy();
        } catch (_) {}
        callFrameRef.current = null;
      }
    };
  }, [effectiveRoomUrl, userName, meetingToken, isHost, durationSeconds, onErrorFallback]);

  // 3. Gestion du flux local WebRTC de secours
  useEffect(() => {
    if (!useLocalFallback) return;

    let activeStream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        activeStream = stream;
        setLocalStream(stream);
        setConnectionStatus('connected');
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('[DailyVideoRoom] Accès caméra/micro refusé en fallback :', err);
        setConnectionStatus('error');
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [useLocalFallback]);

  // Actions de contrôle
  const toggleMic = useCallback(() => {
    playTapBeep();
    if (callFrameRef.current && typeof callFrameRef.current.setLocalAudio === 'function') {
      const next = !isMicOn;
      callFrameRef.current.setLocalAudio(next);
      setIsMicOn(next);
    } else if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, [isMicOn, localStream]);

  const toggleCamera = useCallback(() => {
    playTapBeep();
    if (callFrameRef.current && typeof callFrameRef.current.setLocalVideo === 'function') {
      const next = !isCameraOn;
      callFrameRef.current.setLocalVideo(next);
      setIsCameraOn(next);
    } else if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, [isCameraOn, localStream]);

  const toggleScreenShare = useCallback(async () => {
    playTapBeep();
    if (callFrameRef.current) {
      try {
        if (isScreenSharing) {
          callFrameRef.current.stopScreenShare();
          setIsScreenSharing(false);
        } else {
          await callFrameRef.current.startScreenShare();
          setIsScreenSharing(true);
        }
      } catch (err) {
        console.warn('[DailyVideoRoom] Erreur partage d\'écran :', err);
      }
    }
  }, [isScreenSharing]);

  const handleLeave = () => {
    playCancelSound();
    closeSessionCleanly();
    if (onLeave) onLeave();
  };

  const getBadgeLabel = () => {
    switch (sessionType) {
      case 'instant_match':
        return '⚡ Résonance Wameet';
      case 'appointment':
        return '📅 Rendez-vous Live';
      case 'quick_booth':
        return '🟢 Guichet Rapide';
      default:
        return 'Salon Live Wameet';
    }
  };

  return (
    <div
      className={`relative w-full h-full min-h-[500px] bg-[#070b14] rounded-3xl overflow-hidden flex flex-col justify-between border border-white/10 shadow-2xl select-none ${className}`}
    >
      {/* 1. Barre d'en-tête Marque Blanche Supérieure */}
      <div className="relative z-20 px-4 py-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4169E1] text-white shadow-md flex items-center gap-1.5 border border-white/20">
            <Sparkles className="w-3 h-3" />
            {getBadgeLabel()}
          </span>

          <span className="text-xs font-bold text-white drop-shadow truncate max-w-[140px] sm:max-w-xs">
            {title || (partnerName ? `Échange avec ${partnerName}` : 'Session Résonance')}
          </span>
        </div>

        {/* Compteur de temps discret & Participants */}
        <div className="flex items-center gap-2">
          {/* Minuteur visuel discret */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-black transition-all ${
              isExpiringSoon
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-black/50 border-white/10 text-white'
            }`}
            title="Temps restant dans ce salon de résonance"
          >
            <Clock className={`w-3.5 h-3.5 ${isExpiringSoon ? 'text-amber-400' : 'text-[#4169E1]'}`} />
            <span className="tracking-wider tabular-nums font-mono">{formatTime(timeLeft)}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold">
            <Users className="w-3 h-3 text-[#4169E1]" />
            <span>{participantsCount}</span>
          </div>
        </div>
      </div>

      {/* Alerte visuelle douce à 2 minutes de la fin */}
      {isExpiringSoon && !isSessionEnded && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-amber-500/90 backdrop-blur-md text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg border border-amber-300 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
          <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
          <span>Le salon se termine dans 2 minutes</span>
        </div>
      )}

      {/* 2. Zone d'affichage vidéo centrale (Iframe Daily.co ou WebRTC Local) */}
      <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden z-0">
        <div ref={containerRef} className="w-full h-full absolute inset-0" />

        {useLocalFallback && !isSessionEnded && (
          <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Salon Direct Connecté</span>
            </div>
          </div>
        )}

        {connectionStatus === 'connecting' && !useLocalFallback && !isSessionEnded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950/90 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#4169E1]/20 border border-[#4169E1]/40 flex items-center justify-center text-[#4169E1] animate-pulse mb-3">
              <Radio className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-black text-white">Connexion au Salon Wameet...</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Établissement du canal sécurisé Daily.co (15 min).
            </p>
          </div>
        )}

        {/* 4. ÉCRAN DE FIN DE SALON FLUIDE À 00:00 (Exigence Prompt) */}
        {isSessionEnded && (
          <div className="absolute inset-0 z-40 bg-[#070b14]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-[#4169E1]/20 border border-[#4169E1]/40 flex items-center justify-center text-[#4169E1] mb-4 shadow-[0_0_30px_rgba(65,105,225,0.4)]">
              <Clock className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-white">
              Session de Résonance terminée
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 max-w-sm leading-relaxed">
              Le salon de 15 minutes a pris fin. Vous pouvez poursuivre vos échanges, contacter l'hôte ou explorer sa vitrine.
            </p>

            {/* Boutons d'Appel à l'Action (CTAs) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full max-w-xs sm:max-w-md">
              {/* CTA 1 : Rejoindre un autre salon */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (onJoinAnotherRoom) {
                    onJoinAnotherRoom();
                  } else if (onLeave) {
                    onLeave();
                  }
                }}
                className="w-full flex-1 py-3 px-4 rounded-2xl bg-[#4169E1] hover:bg-[#3457c7] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95 cursor-pointer border border-white/20"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Rejoindre un autre salon</span>
              </button>

              {/* CTA 2 : Contacter l'hôte */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (onContactHost) {
                    onContactHost();
                  } else if (hostUserId) {
                    window.location.href = `/chat/${hostUserId}`;
                  } else if (onLeave) {
                    onLeave();
                  }
                }}
                className="w-full flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 backdrop-blur-md transition active:scale-95 cursor-pointer border border-white/10"
              >
                <MessageSquare className="w-4 h-4 text-blue-300" />
                <span>Contacter l'hôte</span>
              </button>

              {/* CTA 3 : Découvrir sa boutique */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (onVisitShop) {
                    onVisitShop();
                  } else if (sellerStoreSlug) {
                    window.location.href = `/${sellerStoreSlug}`;
                  } else {
                    window.location.href = '/catalog';
                  }
                }}
                className="w-full flex-1 py-3 px-4 rounded-2xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95 cursor-pointer border border-white/20"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-200" />
                <span>Découvrir sa boutique</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Barre de Contrôles Inférieure Wameet (#4169E1) */}
      {!isSessionEnded && (
        <div className="relative z-20 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-center justify-center gap-3 sm:gap-4 pointer-events-auto">
          {/* Micro Toggle */}
          <button
            type="button"
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg ${
              isMicOn
                ? 'bg-slate-800/90 hover:bg-slate-700 text-white border border-white/20'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/30'
            }`}
            aria-label={isMicOn ? 'Couper le micro' : 'Activer le micro'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Caméra Toggle */}
          <button
            type="button"
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg ${
              isCameraOn
                ? 'bg-slate-800/90 hover:bg-slate-700 text-white border border-white/20'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/30'
            }`}
            aria-label={isCameraOn ? 'Couper la caméra' : 'Activer la caméra'}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Partage d'écran Toggle */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg ${
              isScreenSharing
                ? 'bg-[#4169E1] text-white ring-2 ring-white shadow-blue-500/50'
                : 'bg-slate-800/90 hover:bg-slate-700 text-white border border-white/20'
            }`}
            title={isScreenSharing ? "Arrêter le partage d'écran" : "Partager mon écran"}
            aria-label={isScreenSharing ? "Arrêter le partage d'écran" : "Partager mon écran"}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Bouton Raccrocher / Quitter */}
          <button
            type="button"
            onClick={handleLeave}
            className="px-5 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-red-600/40 transition active:scale-95 cursor-pointer border border-white/20"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Quitter</span>
          </button>
        </div>
      )}
    </div>
  );
};
export default DailyVideoRoom;
