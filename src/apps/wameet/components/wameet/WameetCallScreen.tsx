import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  RefreshCw,
  Volume2,
  VolumeX,
  ShieldCheck,
  Minimize2,
  Maximize2,
  Radio,
  Sparkles,
  Phone,
  Camera
} from 'lucide-react';
import {
  WameetCallType,
  WameetCallParticipant,
  WameetActiveCallSession,
  getLocalMediaStream,
  switchCameraTrack,
  startOutgoingCall,
  acceptIncomingCall,
  declineIncomingCall,
  WameetRingtonePlayer
} from '../../../../services/wameetCallService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface WameetCallScreenProps {
  callId: string;
  mode: 'caller' | 'callee';
  callType: WameetCallType;
  currentUser: WameetCallParticipant;
  remoteUser: WameetCallParticipant;
  onClose: () => void;
}

export const WameetCallScreen: React.FC<WameetCallScreenProps> = ({
  callId,
  mode,
  callType,
  currentUser,
  remoteUser,
  onClose
}) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(callType === 'audio');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeSessionRef = useRef<WameetActiveCallSession | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const ringtonePlayerRef = useRef<WameetRingtonePlayer | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Initialisation de l'appel (getUserMedia + WebRTC session)
  useEffect(() => {
    let isCancelled = false;
    const ringtone = new WameetRingtonePlayer();
    ringtonePlayerRef.current = ringtone;

    const setupCall = async () => {
      try {
        setCallStatus('connecting');

        // 1. Capture du flux local
        const localStream = await getLocalMediaStream(callType, 'user');
        if (isCancelled) {
          localStream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = localStream;

        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = localStream;
        }

        // Callback pour attacher le flux distant
        const handleRemoteStream = (remoteStream: MediaStream) => {
          remoteStreamRef.current = remoteStream;
          ringtone.stop();

          // Vérifier si une piste vidéo est active
          const videoTracks = remoteStream.getVideoTracks();
          setHasRemoteVideo(videoTracks.length > 0 && videoTracks[0].enabled);

          videoTracks.forEach(vt => {
            vt.onmute = () => setHasRemoteVideo(false);
            vt.onunmute = () => setHasRemoteVideo(true);
          });

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
          }
        };

        const handleCallEnded = () => {
          setCallStatus('ended');
          ringtone.stop();
          setTimeout(() => {
            onClose();
          }, 1200);
        };

        if (mode === 'caller') {
          setCallStatus('ringing');
          ringtone.playRingtone();

          const session = await startOutgoingCall({
            callId,
            type: callType,
            caller: currentUser,
            callee: remoteUser,
            localStream,
            onRemoteStream: handleRemoteStream,
            onCallAnswered: () => {
              ringtone.stop();
              setCallStatus('active');
            },
            onCallEnded: handleCallEnded
          });
          activeSessionRef.current = session;
        } else {
          // Mode Callee (accept incoming call)
          const session = await acceptIncomingCall({
            callId,
            localStream,
            onRemoteStream: handleRemoteStream,
            onCallEnded: handleCallEnded
          });
          activeSessionRef.current = session;
          setCallStatus('active');
        }
      } catch (err) {
        console.error('[WAMEET WEBRTC] Échec d\'initialisation de l\'appel :', err);
        setCallStatus('ended');
        ringtone.stop();
        setTimeout(onClose, 1500);
      }
    };

    setupCall();

    return () => {
      isCancelled = true;
      if (ringtonePlayerRef.current) ringtonePlayerRef.current.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (activeSessionRef.current) {
        activeSessionRef.current.hangUp().catch(() => {});
      }
    };
  }, [callId, mode, callType]);

  // Chronomètre de durée d'appel dès que l'appel est connecté
  useEffect(() => {
    if (callStatus === 'active') {
      timerIntervalRef.current = window.setInterval(() => {
        setCallDurationSec(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [callStatus]);

  // Formatage de la durée mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle Micro
  const toggleMute = () => {
    playTapBeep();
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newMutedState = !isMuted;
      audioTracks.forEach(t => {
        t.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
    }
  };

  // Toggle Caméra
  const toggleVideo = () => {
    playTapBeep();
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const newVideoDisabledState = !isVideoDisabled;
      videoTracks.forEach(t => {
        t.enabled = !newVideoDisabledState;
      });
      setIsVideoDisabled(newVideoDisabledState);
    }
  };

  // Basculer Caméra (Front / Back)
  const handleSwitchCamera = async () => {
    if (isSwitchingCamera || !localStreamRef.current || callType !== 'video') return;
    playTapBeep();
    setIsSwitchingCamera(true);
    const targetFacing = facingMode === 'user' ? 'environment' : 'user';

    try {
      const peerConn = activeSessionRef.current?.peerConnection || null;
      await switchCameraTrack(localStreamRef.current, peerConn, targetFacing);
      setFacingMode(targetFacing);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (e) {
      console.warn('[WAMEET WEBRTC] Échec du basculement caméra :', e);
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Raccrocher
  const handleHangUp = async () => {
    playValidationBeep();
    setCallStatus('ended');
    if (ringtonePlayerRef.current) ringtonePlayerRef.current.stop();

    if (activeSessionRef.current) {
      await activeSessionRef.current.hangUp();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      {/* Élément audio pour le flux distant */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* =====================================================================
          1. ZONE VIDÉO PRINCIPALE (PLEIN ÉCRAN) OU VOCAL PUR
         ===================================================================== */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {callType === 'video' ? (
          <>
            {/* Flux vidéo distant */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                callStatus === 'active' && hasRemoteVideo ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Écran de veille si la vidéo distante n'est pas encore prête */}
            {(!hasRemoteVideo || callStatus !== 'active') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-6 space-y-6">
                <div className="relative">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl relative z-10 ring-8 ring-blue-500/20">
                    <img
                      src={remoteUser.avatar}
                      alt={remoteUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Anneaux d'onde radar */}
                  <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping -z-10" />
                  <span className="absolute -inset-4 rounded-full bg-indigo-500/20 animate-pulse -z-10" />
                </div>

                <div className="text-center space-y-1.5 z-10">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">{remoteUser.name}</h3>
                  <p className="text-xs sm:text-sm font-semibold text-blue-300">{remoteUser.handle}</p>
                  <p className="text-xs font-bold text-slate-400 mt-2">
                    {callStatus === 'ringing'
                      ? '🔔 Sonnerie en cours...'
                      : callStatus === 'connecting'
                        ? '🔄 Négociation WebRTC P2P...'
                        : callStatus === 'ended'
                          ? '❌ Appel terminé'
                          : 'Caméra distante coupée'}
                  </p>
                </div>
              </div>
            )}

            {/* Encart flottant de la vidéo locale (Picture-in-Picture) */}
            <div className="absolute top-18 right-4 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl bg-slate-900 z-30 transition-transform active:scale-95">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />
              {isVideoDisabled && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-slate-400 text-[10px] font-bold">
                  <VideoOff className="w-5 h-5 mb-1 text-rose-400" />
                  <span>Caméra off</span>
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[9px] font-black text-white pointer-events-none">
                Moi
              </div>
            </div>
          </>
        ) : (
          /* Mode Appel Vocal Pur (Avatar + Ondes Sonores) */
          <div className="flex flex-col items-center justify-center p-6 space-y-8 max-w-md w-full">
            <div className="relative">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-[#2563EB] shadow-2xl relative z-10 ring-8 ring-blue-500/20">
                <img
                  src={remoteUser.avatar}
                  alt={remoteUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Onde de pulsation vocale */}
              <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping -z-10" />
              <span className="absolute -inset-6 rounded-full bg-emerald-500/20 animate-pulse -z-10" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black text-white">{remoteUser.name}</h3>
              <p className="text-sm font-bold text-blue-300">{remoteUser.handle}</p>
              <div className="pt-2">
                {callStatus === 'ringing' && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-bold text-blue-200 animate-pulse">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Appel en cours...</span>
                  </span>
                )}
                {callStatus === 'active' && (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-sm font-black text-emerald-300 shadow">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{formatDuration(callDurationSec)}</span>
                  </span>
                )}
                {callStatus === 'ended' && (
                  <span className="inline-block px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold">
                    Appel terminé
                  </span>
                )}
              </div>
            </div>

            {/* Visualiseur d'ondes audio simulé */}
            {callStatus === 'active' && (
              <div className="flex items-center justify-center gap-1.5 h-10 w-full">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      height: `${Math.floor(20 + Math.random() * 75)}%`,
                      animationDuration: `${0.4 + (i % 5) * 0.15}s`
                    }}
                    className="w-1.5 rounded-full bg-gradient-to-t from-blue-500 to-emerald-400 animate-pulse"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          2. EN-TÊTE SUPÉRIEUR FLOTTANT (SÉCURITÉ P2P & TEMPS)
         ===================================================================== */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-black text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>🔒 WebRTC P2P Direct</span>
          <span className="text-white/40">•</span>
          <span className="text-white/80">0 Bande-passante</span>
        </div>

        {callStatus === 'active' && callType === 'video' && (
          <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-black text-white">
            ⏱️ {formatDuration(callDurationSec)}
          </div>
        )}

        <button
          type="button"
          onClick={handleHangUp}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition cursor-pointer"
          title="Fermer"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      {/* =====================================================================
          3. BARRE DE CONTRÔLES INFÉRIEURE (MUTE, CAMÉRA, RETOURNEMENT, HANGUP)
         ===================================================================== */}
      <div className="p-6 sm:p-8 z-40 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center space-y-4">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Bouton Mute Micro */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer ${
              isMuted
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-white/15 hover:bg-white/25 text-white backdrop-blur-lg border border-white/20'
            }`}
            title={isMuted ? 'Activer le micro' : 'Couper le micro'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Bouton Couper Caméra (Mode Vidéo uniquement) */}
          {callType === 'video' && (
            <button
              type="button"
              onClick={toggleVideo}
              className={`w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer ${
                isVideoDisabled
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-white/15 hover:bg-white/25 text-white backdrop-blur-lg border border-white/20'
              }`}
              title={isVideoDisabled ? 'Activer la caméra' : 'Couper la caméra'}
            >
              {isVideoDisabled ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
            </button>
          )}

          {/* Bouton Retourner la Caméra Front/Back (Mode Vidéo uniquement) */}
          {callType === 'video' && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              disabled={isSwitchingCamera || isVideoDisabled}
              className={`w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition shadow-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white backdrop-blur-lg border border-white/20 cursor-pointer ${
                isSwitchingCamera ? 'animate-spin' : ''
              }`}
              title="Retourner la caméra (Front / Back)"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
          )}

          {/* Bouton Raccrocher (Grand bouton rouge) */}
          <button
            type="button"
            onClick={handleHangUp}
            className="w-15 h-15 sm:w-17 sm:h-17 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center transition shadow-2xl cursor-pointer ring-4 ring-rose-500/30"
            title="Raccrocher"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-400">
          Wameet Direct Peer-to-Peer • STUN Google • Audio & Vidéo Haute Définition
        </div>
      </div>
    </div>
  );
};

export default WameetCallScreen;
