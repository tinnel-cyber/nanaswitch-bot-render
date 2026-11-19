/**
 * @file WhipLiveBroadcaster.tsx
 * @description Composant Studio Vendeur pour la diffusion en direct WebRTC WHIP vers MediaMTX.
 * 
 * Fonctionnalités :
 * - Capture média mobile & desktop (caméra + micro)
 * - Bouton de bascule caméra avant/arrière (user / environment)
 * - Mute micro & pause vidéo
 * - Handshake WebRTC WHIP (POST SDP vers ${LIVE_WHIP_URL}/${storeSlug}/whip)
 * - Déconnexion et nettoyage propre (DELETE Location + arrêt pistes)
 * - Affichage du chronomètre de live et du débit/état
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  RefreshCw, 
  Radio, 
  Square, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Settings,
  Volume2,
  Share2
} from 'lucide-react';
import { 
  startWhipBroadcast, 
  stopWhipBroadcast, 
  captureCameraStream,
  stopMediaStream,
  switchBroadcastCamera,
  formatCameraError,
  WhipBroadcastSession 
} from '../../../../services/whipBroadcastService';
import {
  loadStoreMultistreamConfig,
  startMultistreamRelay,
  stopMultistreamRelay,
  stopMultistreamRelayBeacon,
  hasEnabledMultistreamDestinations
} from '../../../../services/liveMultistreamService';
import { buildStoreHlsUrl, buildStoreWhipUrl } from '../../../../config/liveStreamConfig';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { LiveMultistreamStudioModal } from './LiveMultistreamStudioModal';

export interface WhipLiveBroadcasterProps {
  storeSlug: string;
  storeName?: string;
  onLiveStarted?: (session: WhipBroadcastSession) => void;
  onLiveStopped?: () => void;
  className?: string;
}

export const WhipLiveBroadcaster: React.FC<WhipLiveBroadcasterProps> = ({
  storeSlug,
  storeName = 'Boutique en Direct',
  onLiveStarted,
  onLiveStopped,
  className = ''
}) => {
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const broadcastSessionRef = useRef<WhipBroadcastSession | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [isMicActive, setIsMicActive] = useState<boolean>(true);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isMultistreamModalOpen, setIsMultistreamModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveDurationSec, setLiveDurationSec] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Initialisation de la caméra locale pour prévisualisation
  const initLocalCamera = useCallback(async (newFacing: 'user' | 'environment') => {
    try {
      setErrorMessage(null);
      if (streamRef.current) {
        stopMediaStream(streamRef.current);
        streamRef.current = null;
      }

      const stream = await captureCameraStream({ facingMode: newFacing });
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('[WHIP BROADCASTER] Erreur accès caméra/micro :', err);
      setErrorMessage(formatCameraError(err));
    }
  }, []);

  // Montage initial : démarrer la prévisualisation + nettoyage FFmpeg si fermeture onglet
  useEffect(() => {
    initLocalCamera(facingMode);

    const handleBeforeUnload = () => {
      if (broadcastSessionRef.current) {
        stopMultistreamRelayBeacon(storeSlug);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Nettoyage au démontage : arrêter WHIP + tous les relais FFmpeg actifs
      if (broadcastSessionRef.current) {
        stopWhipBroadcast(broadcastSessionRef.current);
        broadcastSessionRef.current = null;
        stopMultistreamRelayBeacon(storeSlug);
      }
      if (streamRef.current) {
        stopMediaStream(streamRef.current);
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [storeSlug]);

  // Bascule Caméra Avant / Arrière (fonctionne avant ET pendant le direct)
  const handleToggleFacingMode = async () => {
    playTapBeep();
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setErrorMessage(null);

    if (isBroadcasting && broadcastSessionRef.current) {
      try {
        const newStream = await switchBroadcastCamera(broadcastSessionRef.current, nextMode);
        streamRef.current = newStream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = newStream;
          videoPreviewRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        setErrorMessage(formatCameraError(err));
      }
      return;
    }

    await initLocalCamera(nextMode);
  };

  // Mute / Unmute Micro
  const handleToggleMic = () => {
    playTapBeep();
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(t => {
        t.enabled = !isMicActive;
      });
      setIsMicActive(!isMicActive);
    }
  };

  // Activer / Désactiver Caméra (fond noir)
  const handleToggleCamera = () => {
    playTapBeep();
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(t => {
        t.enabled = !isCameraActive;
      });
      setIsCameraActive(!isCameraActive);
    }
  };

  // Démarrer la diffusion WebRTC WHIP vers MediaMTX + lancement automatique des relais FFmpeg configurés
  const handleStartBroadcast = async () => {
    playValidationBeep();
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      if (!streamRef.current) {
        await initLocalCamera(facingMode);
      }

      if (!streamRef.current) {
        throw new Error("Flux caméra non disponible.");
      }

      const session = await startWhipBroadcast({
        storeSlug,
        existingStream: streamRef.current
      });

      broadcastSessionRef.current = session;
      setIsBroadcasting(true);
      setIsConnecting(false);
      setLiveDurationSec(0);

      // Démarrer le chronomètre
      timerRef.current = setInterval(() => {
        setLiveDurationSec(prev => prev + 1);
      }, 1000);

      // Démarrer automatiquement le relais FFmpeg réel vers les réseaux sociaux activés
      loadStoreMultistreamConfig(storeSlug)
        .then((cfg) => {
          if (hasEnabledMultistreamDestinations(cfg)) {
            startMultistreamRelay(storeSlug, cfg).catch((relayErr) => {
              console.warn('[WHIP BROADCASTER] Erreur démarrage auto multistream :', relayErr);
            });
          }
        })
        .catch(() => {});

      if (onLiveStarted) {
        onLiveStarted(session);
      }
    } catch (err: any) {
      console.error('[WHIP BROADCASTER] Échec démarrage broadcast :', err);
      setIsConnecting(false);
      setIsBroadcasting(false);
      setErrorMessage(err?.message || "Impossible de se connecter au serveur d'ingestion Live.");
    }
  };

  // Arrêter la diffusion WHIP et tuer immédiatement les processus FFmpeg côté serveur
  const handleStopBroadcast = async () => {
    playTapBeep();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Arrêter les relais FFmpeg sur Northflank avant/pendant l'arrêt WHIP
    await stopMultistreamRelay(storeSlug).catch(() => {});

    if (broadcastSessionRef.current) {
      await stopWhipBroadcast(broadcastSessionRef.current);
      broadcastSessionRef.current = null;
    }

    setIsBroadcasting(false);
    setIsConnecting(false);

    // Relancer la caméra locale pour continuer la prévisu
    await initLocalCamera(facingMode);

    if (onLiveStopped) {
      onLiveStopped();
    }
  };

  // Formatage du chrono (MM:SS ou HH:MM:SS)
  const formatDuration = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hlsUrl = buildStoreHlsUrl(storeSlug);
  const whipUrl = buildStoreWhipUrl(storeSlug);

  return (
    <div className={`relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col ${className}`}>
      
      {/* 1. Zone Vidéo Plein Écran / Preview */}
      <div className="relative w-full aspect-[9/16] sm:aspect-video bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoPreviewRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />

        {/* Caméra coupée : Masque visuel */}
        {!isCameraActive && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <CameraOff className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold text-slate-400">Caméra désactivée</span>
          </div>
        )}

        {/* Gradient d'ambiance supérieur et inférieur pour lisibilité des contrôles */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

        {/* 2. Badges en direct & Infos Supérieures */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-2">
            {isBroadcasting ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black shadow-lg shadow-rose-600/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>EN DIRECT</span>
                <span className="ml-1 font-mono text-[11px] opacity-90">{formatDuration(liveDurationSec)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 backdrop-blur-md text-slate-300 text-xs font-bold border border-slate-700">
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                <span>Studio Vendeur (Prêt)</span>
              </div>
            )}

            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-black/60 text-emerald-400 text-[10px] font-mono border border-emerald-500/30 backdrop-blur-md">
              MediaMTX WHIP
            </span>
          </div>

          {/* Actions Droite : Multistreaming & Bascule Caméra */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsMultistreamModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-full bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-400/40 backdrop-blur-md transition active:scale-95 cursor-pointer shadow-md text-xs font-bold flex items-center gap-1.5"
              title="Configurer la multidiffusion YouTube, Facebook, TikTok, Instagram..."
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Multistreaming</span>
            </button>

            {/* Bouton de bascule Caméra Avant / Arrière */}
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition active:scale-95 cursor-pointer shadow-md"
              title={`Basculer vers la caméra ${facingMode === 'environment' ? 'avant (Selfie)' : 'arrière (Produits)'}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message d'erreur s'il y a lieu */}
        {errorMessage && (
          <div className="absolute top-16 left-4 right-4 z-20 p-3 rounded-2xl bg-rose-950/90 border border-rose-600/40 text-rose-200 text-xs flex items-center gap-2 shadow-xl backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="line-clamp-2">{errorMessage}</span>
          </div>
        )}

        {/* 3. Barre de Contrôles Inférieure */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 z-10 pointer-events-auto">
          {/* Mute micro & Caméra */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-3 rounded-2xl border backdrop-blur-md transition active:scale-95 cursor-pointer ${
                isMicActive
                  ? 'bg-slate-900/80 hover:bg-slate-800 text-white border-slate-700'
                  : 'bg-rose-600/90 text-white border-rose-500'
              }`}
              title={isMicActive ? 'Couper le micro' : 'Activer le micro'}
            >
              {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleCamera}
              className={`p-3 rounded-2xl border backdrop-blur-md transition active:scale-95 cursor-pointer ${
                isCameraActive
                  ? 'bg-slate-900/80 hover:bg-slate-800 text-white border-slate-700'
                  : 'bg-rose-600/90 text-white border-rose-500'
              }`}
              title={isCameraActive ? 'Désactiver la vidéo' : 'Activer la vidéo'}
            >
              {isCameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Bouton Principal : DÉMARRER LE DIRECT / ARRÊTER */}
          {isBroadcasting ? (
            <button
              type="button"
              onClick={handleStopBroadcast}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-rose-950 transition active:scale-95 cursor-pointer border border-rose-400/30"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Arrêter le Direct</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartBroadcast}
              disabled={isConnecting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-blue-950 transition active:scale-95 cursor-pointer disabled:opacity-50 border border-blue-400/30"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connexion WHIP...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Passer en Direct (WHIP)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 4. Barre d'état & URLs techniques pour le commerçant */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          <span className="font-bold text-slate-300">Flux Vendeur : </span>
          <span className="font-mono text-blue-400 text-[11px] truncate">{storeSlug}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
            HLS : {hlsUrl.split('/').slice(-2).join('/')}
          </span>
          {isBroadcasting && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Connecté
            </span>
          )}
        </div>
      </div>

      {/* 5. Modale de Configuration & Pilotage Multistreaming Réel */}
      <LiveMultistreamStudioModal
        isOpen={isMultistreamModalOpen}
        storeSlug={storeSlug}
        storeName={storeName}
        onClose={() => setIsMultistreamModalOpen(false)}
      />

    </div>
  );
};

export default WhipLiveBroadcaster;
