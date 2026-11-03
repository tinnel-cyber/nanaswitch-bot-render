/**
 * @file WameetAsyncPitchRecorder.tsx
 * @description Enregistreur de Mini-Pitch (30s) Vidéo ou Audio pour le Mode Asynchrone Wameet (Prompt 10).
 * 
 * Spécifications :
 * - Enregistrement natif HTML5 MediaRecorder (30 secondes max)
 * - Choix du format : Vidéo (Webcam/Caméra) ou Note Vocale (Audio seul)
 * - Chronomètre circulaire animé Bleu Royal (#4169E1)
 * - Prévisualisation instantanée et validation avant envoi
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), fonds sombres
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  Mic, 
  Square, 
  Play, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Sparkles,
  Camera,
  X
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../../../utils/audio';

export interface WameetAsyncPitchRecorderProps {
  onPitchRecorded: (result: {
    blob: Blob;
    url: string;
    mediaType: 'video' | 'audio';
    durationSeconds: number;
  }) => void;
  onCancel?: () => void;
  maxSeconds?: number;
  className?: string;
}

export const WameetAsyncPitchRecorder: React.FC<WameetAsyncPitchRecorderProps> = ({
  onPitchRecorded,
  onCancel,
  maxSeconds = 30,
  className = ''
}) => {
  const [mediaType, setMediaType] = useState<'video' | 'audio'>('video');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const timerIntervalRef = useRef<any>(null);

  // 1. Initialisation ou arrêt du flux caméra/micro
  const startCameraStream = async (type: 'video' | 'audio') => {
    stopCurrentStream();
    setHasPermissionError(false);

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (type === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('[WameetAsyncPitchRecorder] Erreur d’accès caméra/micro :', err);
      setHasPermissionError(true);
    }
  };

  const stopCurrentStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    startCameraStream(mediaType);
    return () => {
      stopCurrentStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [mediaType]);

  // 2. Lancement de l'enregistrement
  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    playValidationBeep();
    chunksRef.current = [];
    setRecordedBlob(null);
    setPreviewUrl(null);
    setElapsedSeconds(0);

    try {
      const mimeType = mediaType === 'video' 
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm')
        : 'audio/webm';

      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(finalBlob);
        setRecordedBlob(finalBlob);
        setPreviewUrl(url);
        stopCurrentStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setIsRecording(true);

      // Chronomètre 30 secondes max
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= maxSeconds) {
            stopRecording();
            return maxSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      console.error('[WameetAsyncPitchRecorder] Erreur enregistrement :', e);
    }
  };

  // 3. Arrêt de l'enregistrement
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    playTapBeep();
  };

  // 4. Reprise
  const handleRetake = () => {
    playCancelSound();
    setRecordedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setElapsedSeconds(0);
    startCameraStream(mediaType);
  };

  // 5. Validation finale
  const handleConfirm = () => {
    if (!recordedBlob || !previewUrl) return;
    playValidationBeep();
    onPitchRecorded({
      blob: recordedBlob,
      url: previewUrl,
      mediaType,
      durationSeconds: elapsedSeconds || 1
    });
  };

  // Calcul du pourcentage pour la jauge circulaire
  const progressPercent = (elapsedSeconds / maxSeconds) * 100;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div
      className={`relative w-full max-w-sm mx-auto rounded-3xl bg-slate-950 border border-slate-800 p-4 shadow-2xl flex flex-col items-center text-white select-none ${className}`}
    >
      {/* En-tête : Choix Vidéo ou Audio */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4169E1] animate-pulse" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
            Mini-Pitch 30s (Différé)
          </h4>
        </div>

        {!isRecording && !recordedBlob && (
          <div className="flex bg-slate-900 rounded-xl p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setMediaType('video');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                mediaType === 'video' ? 'bg-[#4169E1] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Vidéo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setMediaType('audio');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                mediaType === 'audio' ? 'bg-[#4169E1] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Vocal</span>
            </button>
          </div>
        )}
      </div>

      {/* Cadre de visualisation (Caméra Live ou Prévisualisation) */}
      <div className="relative w-full aspect-square my-3 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10">
        {hasPermissionError ? (
          <div className="p-4 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-xs font-bold text-slate-300">
              Accès caméra/micro non autorisé par votre navigateur.
            </p>
          </div>
        ) : previewUrl ? (
          /* Mode Prévisualisation enregistrée */
          mediaType === 'video' ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 space-y-3 w-full">
              <div className="w-16 h-16 rounded-full bg-[#4169E1]/20 border border-[#4169E1]/40 flex items-center justify-center text-[#4169E1]">
                <Mic className="w-8 h-8" />
              </div>
              <p className="text-xs font-bold text-slate-300">Note Vocale ({elapsedSeconds}s)</p>
              <audio src={previewUrl} controls className="w-full" />
            </div>
          )
        ) : (
          /* Mode Caméra / Micro en direct */
          mediaType === 'video' ? (
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 text-slate-400">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${
                isRecording ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}>
                <Mic className="w-10 h-10" />
              </div>
              <span className="text-xs font-medium">Prêt pour votre note vocale</span>
            </div>
          )
        )}

        {/* Compteur 30s circulaire superposé pendant l'enregistrement */}
        {isRecording && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/40">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-xs font-bold text-white">
              00:{elapsedSeconds.toString().padStart(2, '0')} / 00:{maxSeconds}
            </span>
          </div>
        )}
      </div>

      {/* Barre d'actions & Contrôles */}
      <div className="w-full flex items-center justify-center gap-4 pt-1">
        {!previewUrl ? (
          isRecording ? (
            /* Bouton Arrêter */
            <button
              type="button"
              onClick={stopRecording}
              className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Arrêter ({maxSeconds - elapsedSeconds}s restantes)</span>
            </button>
          ) : (
            /* Bouton Enregistrer */
            <button
              type="button"
              onClick={startRecording}
              disabled={hasPermissionError}
              className="px-6 py-3 rounded-full bg-[#4169E1] hover:bg-blue-600 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {mediaType === 'video' ? <Camera className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>Lancer le Pitch (30s)</span>
            </button>
          )
        ) : (
          /* Boutons Recommencer / Valider */
          <div className="w-full flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reprendre</span>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#4169E1] hover:bg-blue-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/30 transition active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Joindre ce Pitch</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WameetAsyncPitchRecorder;
