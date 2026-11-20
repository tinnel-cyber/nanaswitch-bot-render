/**
 * @file NativeCoaching1to1Room.tsx
 * @description Salle Visio Coaching native Nanasore (1-to-1 ou groupe jusqu'à 6 participants)
 * propulsée par WebRTC Mesh + Supabase Realtime (100 % marque blanche, zéro Jitsi, zéro Firebase).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  RefreshCw,
  Monitor,
  MonitorOff,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Users,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import {
  NativeCoachingRtcSession,
  CoachingRtcStatus,
  RemotePeerInfo,
} from '../../../../services/nativeCoachingRtcService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface NativeCoaching1to1RoomProps {
  roomId: string;
  storeSlug: string;
  storeName?: string;
  isHost?: boolean;
  onCallEnded?: () => void;
}

const RemotePeerTile: React.FC<{ peer: RemotePeerInfo; fullBleed?: boolean }> = ({
  peer,
  fullBleed = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream, peer.stream.getTracks().length]);

  return (
    <div
      className={`relative overflow-hidden bg-slate-900 ${
        fullBleed ? 'w-full h-full' : 'w-full h-full rounded-2xl border border-white/15 shadow-lg'
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm text-[11px] font-bold text-white flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            peer.connectionState === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
          }`}
        />
        <span className="truncate max-w-[140px]">{peer.displayName}</span>
      </div>
    </div>
  );
};

export const NativeCoaching1to1Room: React.FC<NativeCoaching1to1RoomProps> = ({
  roomId,
  storeSlug,
  storeName = 'Nanasore Coaching',
  isHost = false,
  onCallEnded,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<NativeCoachingRtcSession | null>(null);

  const [status, setStatus] = useState<CoachingRtcStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isCamOn, setIsCamOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [remotePeers, setRemotePeers] = useState<RemotePeerInfo[]>([]);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  const publicInviteUrl = `https://nsore.shop/live/${encodeURIComponent(storeSlug)}?room=${encodeURIComponent(roomId)}`;
  const totalParticipants = 1 + remotePeers.length;
  const isGroupGrid = remotePeers.length >= 2;

  // Réattache la vidéo locale si le layout bascule entre PiP (1-to-1) et grille (3-6 participants)
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isGroupGrid]);

  const startCall = useCallback(async () => {
    setErrorMsg(null);
    setRemotePeers([]);

    let displayName = isHost ? `Coach • ${storeName}` : 'Participant';
    try {
      const { data } = await supabase.auth.getUser();
      const metaName = data?.user?.user_metadata?.full_name || data?.user?.user_metadata?.name;
      if (metaName) displayName = String(metaName);
    } catch (_) {}

    if (sessionRef.current) {
      sessionRef.current.hangup();
    }

    const rtc = new NativeCoachingRtcSession({
      roomId,
      displayName,
      isHost,
      callbacks: {
        onStatusChange: (next) => setStatus(next),
        onLocalStream: (stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        },
        onPeersChange: (peers) => setRemotePeers(peers),
        onError: (msg) => setErrorMsg(msg),
      },
    });

    sessionRef.current = rtc;
    await rtc.start();
  }, [roomId, storeName, isHost]);

  useEffect(() => {
    startCall();
    return () => {
      sessionRef.current?.hangup();
      sessionRef.current = null;
    };
  }, [startCall]);

  const handleToggleMic = () => {
    playTapBeep();
    if (!sessionRef.current) return;
    setIsMicOn(sessionRef.current.toggleAudio());
  };

  const handleToggleCam = () => {
    playTapBeep();
    if (!sessionRef.current) return;
    setIsCamOn(sessionRef.current.toggleVideo());
  };

  const handleSwitchCamera = async () => {
    playTapBeep();
    if (!sessionRef.current) return;
    try {
      setFacingMode(await sessionRef.current.switchCamera());
    } catch (_) {}
  };

  const handleToggleScreenShare = async () => {
    playTapBeep();
    if (!sessionRef.current) return;
    try {
      setIsScreenSharing(await sessionRef.current.toggleScreenShare(!isScreenSharing));
    } catch (_) {}
  };

  const handleHangup = () => {
    playTapBeep();
    sessionRef.current?.hangup();
    setRemotePeers([]);
    setStatus('disconnected');
    onCallEnded?.();
  };

  const handleCopyInvite = () => {
    playValidationBeep();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(publicInviteUrl);
    }
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  return (
    <div className="w-full h-full relative bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* Barre d'état supérieure 100 % marque blanche Nanasore */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/15 shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : status === 'error' || status === 'disconnected'
                ? 'bg-rose-500'
                : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="text-[11px] font-black text-white">
            {status === 'connected'
              ? remotePeers.length === 1
                ? `En ligne HD • ${remotePeers[0].displayName}`
                : `Coaching Groupe HD`
              : status === 'connecting'
              ? 'Connexion WebRTC sécurisée...'
              : status === 'waiting_peer'
              ? isHost
                ? 'En attente des participants...'
                : 'En attente du coach...'
              : status === 'acquiring_media'
              ? 'Activation caméra & micro...'
              : status === 'disconnected'
              ? 'Appel terminé'
              : 'Visio Coaching'}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-blue-300 font-bold border-l border-white/15 pl-2">
            <Users className="w-3 h-3" /> {totalParticipants}/6
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold border-l border-white/15 pl-2">
            <ShieldCheck className="w-3 h-3" /> Chiffré
          </span>
        </div>

        {isHost && (
          <button
            type="button"
            onClick={handleCopyInvite}
            className="pointer-events-auto px-3 py-1.5 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow-lg border border-blue-400/30 transition cursor-pointer active:scale-95"
            title="Copier le lien d'invitation nsore.shop (jusqu'à 6 participants)"
          >
            {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedInvite ? 'Lien nsore.shop copié !' : 'Inviter (nsore.shop)'}</span>
          </button>
        )}
      </div>

      {/* Zone Vidéo : Face-à-Face (1-to-1) OU Grille Multi-Participants (3 à 6 personnes) */}
      <div className="flex-1 relative flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        {isGroupGrid ? (
          /* GRILLE MULTI-PARTICIPANTS (3 à 6 PERSONNES) */
          <div
            className={`w-full h-full p-3 pt-14 pb-20 grid gap-2.5 ${
              totalParticipants <= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {/* Tuile Locale */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border-2 border-blue-500/40 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''} ${!isCamOn ? 'opacity-20' : ''}`}
              />
              {!isCamOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                  <VideoOff className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 text-[11px] font-bold text-white">
                Vous {isHost ? '(Coach)' : ''}
              </div>
            </div>

            {/* Tuiles Distantes */}
            {remotePeers.map((peer) => (
              <RemotePeerTile key={peer.peerId} peer={peer} />
            ))}
          </div>
        ) : (
          /* VUE 1-TO-1 PLEIN ÉCRAN + VIGNETTE LOCALE PiP */
          <>
            {remotePeers.length === 1 ? (
              <RemotePeerTile peer={remotePeers[0]} fullBleed />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3">
                {errorMsg ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-rose-200 max-w-md">{errorMsg}</p>
                    <button
                      type="button"
                      onClick={startCall}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" /> Réessayer la connexion
                    </button>
                  </>
                ) : status === 'disconnected' ? (
                  <>
                    <p className="text-sm font-black text-white">Séance de coaching terminée</p>
                    <button
                      type="button"
                      onClick={startCall}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" /> Rejoindre à nouveau
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-3xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
                    </div>
                    <p className="text-sm font-black text-white">
                      {isHost ? 'Salle Privée Ouverte (2 à 6 participants)' : 'Connexion à votre Coach...'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      {isHost
                        ? 'Partagez le lien nsore.shop à vos participants : la vidéo passe automatiquement en face-à-face ou en grille multi-participants.'
                        : 'Votre caméra et votre micro sont prêts. Le flux vidéo s’affichera automatiquement dès que le coach est en ligne.'}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Vignette Caméra Locale (PiP) */}
            <div className="absolute bottom-20 right-3 z-20 w-28 sm:w-40 aspect-video rounded-2xl overflow-hidden bg-slate-900 border-2 border-white/25 shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''} ${!isCamOn ? 'opacity-20' : ''}`}
              />
              {!isCamOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                  <VideoOff className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white">
                Vous
              </span>
            </div>
          </>
        )}
      </div>

      {/* Barre de Contrôles Visio */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/15 shadow-2xl">
        <button
          type="button"
          onClick={handleToggleMic}
          className={`p-2.5 rounded-xl transition cursor-pointer ${
            isMicOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
          title={isMicOn ? 'Couper le micro' : 'Activer le micro'}
        >
          {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleToggleCam}
          className={`p-2.5 rounded-xl transition cursor-pointer ${
            isCamOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
          title={isCamOn ? 'Couper la caméra' : 'Activer la caméra'}
        >
          {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleSwitchCamera}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          title="Changer de caméra (Avant / Arrière)"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleToggleScreenShare}
          className={`hidden sm:flex p-2.5 rounded-xl transition cursor-pointer ${
            isScreenSharing ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={isScreenSharing ? "Arrêter le partage d'écran" : "Partager l'écran"}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleHangup}
          className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          title="Quitter la séance"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Raccrocher</span>
        </button>
      </div>
    </div>
  );
};

export default NativeCoaching1to1Room;
