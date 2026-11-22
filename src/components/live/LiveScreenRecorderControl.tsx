import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Circle, Square, Camera, Video, VideoOff, CheckCircle2, AlertCircle, X } from 'lucide-react';
import {
  ProScreenRecorderSession,
  captureOneShotScreenPng,
  isScreenCaptureSupported,
  type CamBubbleConfig,
  type BrandWatermarkConfig
} from '../../services/screenRecorderService';
import { loadVideoStudioSettings } from '../../services/studioSettingsService';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';

export interface LiveScreenRecorderControlProps {
  /** Contexte d'utilisation (ex: 'cours-direct', 'live-shopping') */
  contextLabel?: string;
  /** Variante visuelle adaptée au fond sombre (LiveStage) ou clair (LiveInstructorControlBar) */
  variant?: 'dark' | 'light';
  /** Active/désactive l'affichage du bouton Capture PNG rapide */
  showScreenshotButton?: boolean;
  className?: string;
}

const formatElapsed = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

async function acquireCameraStream(preferredDeviceId?: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Caméra non disponible sur ce navigateur.');
  }
  const attempts: MediaTrackConstraints[] = [];
  if (preferredDeviceId) {
    attempts.push({ deviceId: { ideal: preferredDeviceId }, width: { ideal: 640 }, height: { ideal: 640 } });
  }
  attempts.push({ facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } });
  attempts.push({});

  let lastErr: any = null;
  for (const constraint of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: Object.keys(constraint).length > 0 ? constraint : true,
        audio: false
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Impossible d’accéder à la caméra.');
}

export const LiveScreenRecorderControl: React.FC<LiveScreenRecorderControlProps> = ({
  contextLabel = 'live-direct',
  variant = 'dark',
  showScreenshotButton = true,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [withCamBubble, setWithCamBubble] = useState<boolean>(false);
  const [isCamLoading, setIsCamLoading] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const sessionRef = useRef<ProScreenRecorderSession | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const camVideoElRef = useRef<HTMLVideoElement | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const stopPreviewCamera = useCallback(() => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    }
    if (camVideoElRef.current) {
      camVideoElRef.current.srcObject = null;
    }
    setWithCamBubble(false);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
      if (elapsedTimerRef.current) window.clearInterval(elapsedTimerRef.current);
      if (sessionRef.current) {
        sessionRef.current.stop();
        sessionRef.current = null;
      }
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((t) => t.stop());
        camStreamRef.current = null;
      }
    };
  }, []);

  // Attacher le flux caméra à la bulle flottante dès qu'elle est montée
  useEffect(() => {
    if (withCamBubble && camStreamRef.current && camVideoElRef.current) {
      camVideoElRef.current.srcObject = camStreamRef.current;
      camVideoElRef.current.play().catch(() => {});
    }
  }, [withCamBubble]);

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setStatusToast({ type, text });
    window.setTimeout(() => {
      setStatusToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const stopTimers = () => {
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  };

  // Activation / Désactivation réelle et immédiate de la caméra bulle
  const handleToggleCameraBubble = async () => {
    playTapBeep();
    if (withCamBubble) {
      stopPreviewCamera();
      if (sessionRef.current) {
        sessionRef.current.updateBubbleConfig({ enabled: false });
      }
      return;
    }

    setIsCamLoading(true);
    try {
      const settings = loadVideoStudioSettings();
      const stream = await acquireCameraStream(settings.selectedCameraDeviceId || undefined);
      camStreamRef.current = stream;
      setWithCamBubble(true);
      if (sessionRef.current) {
        sessionRef.current.updateBubbleConfig({ enabled: true });
      }
      playValidationBeep();
    } catch (err: any) {
      playCancelSound();
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Accès caméra refusé : autorisez la caméra dans la barre d’adresse du navigateur.'
          : err?.name === 'NotReadableError'
            ? 'Caméra déjà utilisée par une autre application ou fenêtre.'
            : err?.message || 'Impossible d’activer la caméra.';
      showNotice('err', msg);
      setWithCamBubble(false);
    } finally {
      setIsCamLoading(false);
    }
  };

  const launchRecording = async () => {
    if (!isScreenCaptureSupported()) {
      playCancelSound();
      showNotice('err', 'Capture écran non supportée par ce navigateur (utilisez un ordinateur ou navigateur compatible).');
      return;
    }

    const settings = loadVideoStudioSettings();

    // Si la bulle caméra est activée dans les paramètres ou le bouton, s'assurer que le flux est déjà actif avant getDisplayMedia
    let activeCamStream = camStreamRef.current;
    const shouldUseBubble = withCamBubble;
    if (shouldUseBubble && (!activeCamStream || !activeCamStream.getVideoTracks().some((t) => t.readyState === 'live'))) {
      try {
        activeCamStream = await acquireCameraStream(settings.selectedCameraDeviceId || undefined);
        camStreamRef.current = activeCamStream;
        setWithCamBubble(true);
      } catch {
        activeCamStream = null;
      }
    }

    const bubble: CamBubbleConfig = {
      enabled: shouldUseBubble,
      shape: settings.bubbleShape,
      corner: settings.bubbleCorner,
      sizePct: settings.bubbleSizePct,
      mirror: settings.bubbleMirror
    };
    const watermark: BrandWatermarkConfig = {
      enabled: settings.watermarkEnabled,
      text: settings.watermarkText,
      logoDataUrl: settings.watermarkLogoDataUrl || undefined,
      corner: settings.watermarkCorner,
      opacity: settings.watermarkOpacity,
      color: settings.watermarkColor,
      sizePct: settings.watermarkSizePct
    };

    try {
      const session = new ProScreenRecorderSession({
        mode: 'screen',
        quality: settings.recorderQuality,
        aspectRatio: settings.recorderAspectRatio,
        fps: settings.recorderFps,
        outputFormat: settings.recorderOutputFormat,
        hideBrowserAddressBar: settings.hideBrowserAddressBar,
        captureAngle: settings.captureAngle,
        autoDownload: true,
        includeMic: settings.includeMic,
        includeSystemAudio: settings.includeSystemAudio,
        cameraDeviceId: settings.selectedCameraDeviceId || undefined,
        micDeviceId: settings.selectedMicDeviceId || undefined,
        existingCamStream: activeCamStream,
        bubble,
        watermark,
        onStop: (result) => {
          stopTimers();
          setIsRecording(false);
          setElapsedSec(0);
          sessionRef.current = null;
          playValidationBeep();
          showNotice(
            'ok',
            `Vidéo ${contextLabel} téléchargée (${result.durationSec}s) — prête à coller son lien ou envoyer sur S3.`
          );
        },
        onError: (msg) => {
          showNotice('err', msg);
        }
      });

      sessionRef.current = session;
      await session.start({
        includeMic: settings.includeMic,
        includeSystemAudio: settings.includeSystemAudio
      });

      setIsRecording(true);
      setElapsedSec(0);
      elapsedTimerRef.current = window.setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
      playValidationBeep();
    } catch (err: any) {
      stopTimers();
      sessionRef.current = null;
      setIsRecording(false);
      playCancelSound();
      showNotice('err', err?.message || 'Autorisation de capture écran annulée.');
    }
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      playTapBeep();
      stopTimers();
      if (sessionRef.current) {
        sessionRef.current.stop();
      }
      return;
    }

    if (countdown > 0) return;

    playTapBeep();
    const settings = loadVideoStudioSettings();
    const cd = settings.countdownSec || 0;
    if (cd > 0) {
      setCountdown(cd);
      let remaining = cd;
      countdownTimerRef.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          setCountdown(0);
          launchRecording();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    } else {
      await launchRecording();
    }
  };

  const handleScreenshot = async () => {
    if (!isScreenCaptureSupported()) {
      playCancelSound();
      showNotice('err', 'Capture PNG non supportée par ce navigateur.');
      return;
    }
    playTapBeep();
    try {
      const settings = loadVideoStudioSettings();
      const bubble: CamBubbleConfig = {
        enabled: withCamBubble,
        shape: settings.bubbleShape,
        corner: settings.bubbleCorner,
        sizePct: settings.bubbleSizePct,
        mirror: settings.bubbleMirror
      };
      const watermark: BrandWatermarkConfig = {
        enabled: settings.watermarkEnabled,
        text: settings.watermarkText,
        logoDataUrl: settings.watermarkLogoDataUrl || undefined,
        corner: settings.watermarkCorner,
        opacity: settings.watermarkOpacity,
        color: settings.watermarkColor,
        sizePct: settings.watermarkSizePct
      };
      await captureOneShotScreenPng(bubble, watermark);
      playValidationBeep();
      showNotice('ok', 'Capture écran PNG téléchargée sur votre appareil !');
    } catch (err: any) {
      playCancelSound();
      showNotice('err', err?.message || 'Capture écran annulée.');
    }
  };

  const isDark = variant === 'dark';
  const currentSettings = loadVideoStudioSettings();
  const cornerClass =
    currentSettings.bubbleCorner === 'top-left'
      ? 'top-20 left-5'
      : currentSettings.bubbleCorner === 'top-right'
        ? 'top-20 right-5'
        : currentSettings.bubbleCorner === 'bottom-right'
          ? 'bottom-6 right-5'
          : 'bottom-6 left-5';

  return (
    <>
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        {/* Toggle Bulle Caméra réel (allume/éteint la vraie webcam et la bulle flottante) */}
        <button
          type="button"
          disabled={isCamLoading}
          onClick={handleToggleCameraBubble}
          className={`inline-flex items-center gap-1 justify-center rounded-xl transition cursor-pointer border disabled:opacity-60 ${
            isDark
              ? withCamBubble
                ? 'px-2.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-400/60 backdrop-blur-md text-[10px] font-bold shadow-md'
                : 'px-2 py-1.5 bg-black/70 hover:bg-black/90 text-slate-300 border-white/20 backdrop-blur-md text-[10px] font-bold'
              : withCamBubble
                ? 'px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-400 text-xs font-bold'
                : 'px-2 py-1.5 bg-[#F5F7FB] hover:bg-slate-100 text-slate-600 border-slate-200 text-xs font-bold'
          }`}
          title={
            withCamBubble
              ? 'Bulle caméra active (cliquer pour éteindre la caméra)'
              : 'Activer la bulle caméra en direct sur l’écran'
          }
        >
          {withCamBubble ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isCamLoading ? 'Cam...' : withCamBubble ? 'Bulle ON' : 'Bulle Cam'}</span>
        </button>

        {/* Bouton principal Enregistrer / Stopper l'écran */}
        <button
          type="button"
          onClick={handleToggleRecord}
          className={`inline-flex items-center gap-1.5 font-extrabold transition active:scale-95 cursor-pointer border ${
            isRecording
              ? 'px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-600/30 text-xs animate-pulse'
              : countdown > 0
                ? 'px-3 py-1.5 rounded-xl bg-amber-500 text-white border-amber-400 text-xs'
                : isDark
                  ? 'px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white border-rose-400/50 backdrop-blur-md text-[10px] sm:text-xs shadow-md'
                  : 'px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 text-xs'
          }`}
          title={
            isRecording
              ? 'Arrêter et télécharger l’enregistrement localement'
              : 'Enregistrer l’écran en direct (téléchargement local direct, 0 stockage serveur)'
          }
        >
          {isRecording ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span className="font-mono">REC {formatElapsed(elapsedSec)}</span>
            </>
          ) : countdown > 0 ? (
            <span>Démarrage {countdown}s...</span>
          ) : (
            <>
              <Circle className="w-3 h-3 fill-current text-rose-400" />
              <span className="hidden sm:inline">Enregistrer écran</span>
              <span className="sm:hidden">REC</span>
            </>
          )}
        </button>

        {/* Capture PNG instantanée */}
        {showScreenshotButton && !isRecording && (
          <button
            type="button"
            onClick={handleScreenshot}
            className={`inline-flex items-center justify-center rounded-xl transition cursor-pointer border ${
              isDark
                ? 'w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/70 hover:bg-black/90 border-white/20 text-white backdrop-blur-md'
                : 'px-2 py-1.5 bg-[#F5F7FB] hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] border-slate-200'
            }`}
            title="Capture écran PNG instantanée (téléchargement local)"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Notification flottante compacte */}
        {statusToast && (
          <div
            className={`absolute top-full right-0 mt-2 z-50 min-w-[240px] max-w-[320px] p-2.5 rounded-xl text-[11px] font-bold shadow-xl border flex items-start gap-2 ${
              statusToast.type === 'ok'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/95 border-rose-500/50 text-rose-200'
            }`}
          >
            {statusToast.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{statusToast.text}</span>
          </div>
        )}
      </div>

      {/* BULLE CAMÉRA FLOTTANTE EN DIRECT SUR L'ÉCRAN (Rond ou Carré, miroir, fermeture 1 clic) */}
      {withCamBubble && (
        <div
          className={`fixed ${cornerClass} z-[9990] group/bubble select-none shadow-2xl shadow-black/60 border-[3px] border-white/90 overflow-hidden bg-slate-950 ${
            currentSettings.bubbleShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
          }`}
          style={{ width: 156, height: 156 }}
        >
          <video
            ref={camVideoElRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{
              transform: currentSettings.bubbleMirror ? 'scaleX(-1)' : undefined
            }}
          />
          {isRecording && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-rose-600/90 text-white text-[9px] font-black flex items-center gap-1 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              REC
            </span>
          )}
          <button
            type="button"
            onClick={handleToggleCameraBubble}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover/bubble:opacity-100 transition cursor-pointer"
            title="Fermer la bulle caméra"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};

export default LiveScreenRecorderControl;
