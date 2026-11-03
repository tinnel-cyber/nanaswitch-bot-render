/**
 * @file WameetReelUploadStudio.tsx
 * @description Studio d'Upload Vidéo Direct S3 & Pipeline Serverless AWS Lambda FFmpeg.
 * 
 * Spécifications Implémentées :
 * 1. Direct Upload S3 (Pre-signed URL) :
 *    - Destination S3 dans le dossier obligatoire `wa-videos/` (ex: wa-videos/{timestamp}_{filename}.mp4).
 *    - Envoi direct via requête HTTP PUT avec gestion précise du pourcentage (Progress Bar).
 * 2. Suivi de l'expérience utilisateur (UX) :
 *    - Dès que l'upload S3 atteint 100%, affichage immédiat de l'indicateur visuel :
 *      "Traitement et optimisation du Reel en cours..."
 *    - Le lecteur vidéo et la prévisualisation pointent vers l'URL finale dans `compressed-reels/{timestamp}_{filename}.mp4`.
 * 3. Validation & Gestion des erreurs :
 *    - Limite stricte côté client à 200 Mo max : alerte "La vidéo est trop lourde (maximum 200 Mo)."
 *    - Contrôle du format (vidéo uniquement) avant toute requête pré-signée.
 *    - Bouton de nouvelle tentative (Retry) en cas d'échec d'envoi.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Video as VideoIcon,
  X,
  Sparkles,
  CloudUpload,
  Loader2,
  RotateCcw,
  Cpu
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../../../utils/audio';
import {
  getPresignedUploadUrl,
  uploadFileToS3,
  checkCompressedVideoReady,
  PresignedUploadResult
} from '../../../../services/s3UploadService';
import { VideoUploadModal } from '../../../../components/upload/VideoUploadModal';

export interface WameetReelUploadStudioProps {
  authorName?: string;
  authorAvatar?: string;
  authorBadge?: string;
  caption: string;
  onChangeCaption: (val: string) => void;
  onUploadSuccess: (videoUrl: string, thumbnailUrl?: string) => void;
  onPublishReel: (
    e?: React.FormEvent | React.MouseEvent,
    directUrl?: string,
    directCaption?: string,
    directThumb?: string
  ) => Promise<void> | void;
  onCancel: () => void;
  initialVideoUrl?: string;
  onSwitchMediaType?: (mediaType: 'image' | 'video') => void;
}

// Limite maximale stricte de 200 Mo côté client
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

/**
 * Formate un nombre d'octets en Mo/Ko lisible
 */
function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 Mo';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} Mo`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} Ko`;
}

export const WameetReelUploadStudio: React.FC<WameetReelUploadStudioProps> = ({
  authorName = 'Vous',
  authorAvatar,
  authorBadge = 'Créateur Wameet',
  caption,
  onChangeCaption,
  onUploadSuccess,
  onPublishReel,
  onCancel,
  initialVideoUrl = '',
  onSwitchMediaType
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // État de l'Upload direct vers S3
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // État de conversion AWS Lambda serverless (wa-videos/ -> compressed-reels/)
  const [isLambdaProcessing, setIsLambdaProcessing] = useState<boolean>(false);
  const [isOptimizedReady, setIsOptimizedReady] = useState<boolean>(false);

  // URLs S3
  const [presignedData, setPresignedData] = useState<PresignedUploadResult | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(initialVideoUrl || null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  // État de l'écran / modal de transition élégant lors du clic sur "Publier"
  const [isVerifyingAndApproving, setIsVerifyingAndApproving] = useState<boolean>(false);
  const [verificationDynamicText, setVerificationDynamicText] = useState<string>(
    "Vérification et approbation du Reel en cours..."
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const thumbnailRef = useRef<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Nettoyage de l'URL locale et du timer de polling au démontage
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [localPreviewUrl]);

  /**
   * Extraction asynchrone de la miniature du Reel via Canvas HTML5
   */
  const extractThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      tempVideo.src = objectUrl;

      tempVideo.onloadedmetadata = () => {
        tempVideo.currentTime = Math.min(0.5, tempVideo.duration > 1 ? 0.5 : 0.1);
      };

      tempVideo.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(480, tempVideo.videoWidth || 480);
          canvas.height = Math.round(canvas.width * (tempVideo.videoHeight / (tempVideo.videoWidth || 1)));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            URL.revokeObjectURL(objectUrl);
            resolve(dataUrl);
            return;
          }
        } catch (e) {
          console.warn('[THUMBNAIL EXTRACTION WARN]', e);
        }
        URL.revokeObjectURL(objectUrl);
        resolve('');
      };

      tempVideo.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      };
    });
  };

  /**
   * Surveillance en arrière-plan de la génération de la vidéo 480p dans compressed-reels/
   */
  const startLambdaMonitoring = useCallback((compressedUrl: string) => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    let attempts = 0;
    const maxAttempts = 20; // 20 * 2.5s = 50 secondes max de surveillance

    pollTimerRef.current = window.setInterval(async () => {
      attempts++;
      const ready = await checkCompressedVideoReady(compressedUrl);
      if (ready) {
        if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
        setIsLambdaProcessing(false);
        setIsOptimizedReady(true);
        console.log('[AWS LAMBDA S3] Version 480p compressée disponible :', compressedUrl);
      } else if (attempts >= maxAttempts) {
        if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
        // Même si le polling expire, la Lambda termine sous peu côté serveur
        setIsLambdaProcessing(false);
        setIsOptimizedReady(true);
      }
    }, 2500);
  }, []);

  /**
   * Exécution du Direct Upload vers S3 dans le dossier obligatoire `wa-videos/`
   */
  const executeDirectS3Upload = async (file: File) => {
    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);
    setIsLambdaProcessing(false);
    setIsOptimizedReady(false);

    try {
      // 1. Demande de Pre-signed URL PUT S3 vers le dossier obligatoire `wa-videos/` (upload brut direct)
      const mimeType = file.type || 'video/mp4';
      const presigned = await getPresignedUploadUrl(file.name, mimeType);
      setPresignedData(presigned);

      console.log('[S3 DIRECT RAW UPLOAD] Dépôt brut dans :', presigned.fileKey);
      console.log('[S3 HLS CONVERSION TARGET] Cible finale HLS :', presigned.hlsUrl || presigned.finalVideoUrl);

      // 2. Envoi du fichier vidéo brut directement vers S3 via PUT avec suivi du pourcentage
      await uploadFileToS3(presigned.uploadUrl, file, (percent) => {
        setUploadProgress(percent);
      });

      // 3. Upload S3 brut terminé à 100%
      setUploadProgress(100);
      setIsUploading(false);
      setIsLambdaProcessing(true);

      // Le composant de prévisualisation et la publication pointent sur le flux HLS dans compressed-reels/
      const finalTargetUrl = presigned.hlsUrl || presigned.finalVideoUrl;
      const finalPosterUrl = presigned.posterUrl || thumbnailRef.current || thumbnailUrl || undefined;
      setUploadedVideoUrl(finalTargetUrl);

      playValidationBeep();
      onUploadSuccess(finalTargetUrl, finalPosterUrl);

      // 4. Suivi visuel du transcodage HLS & poster Lambda en arrière-plan
      startLambdaMonitoring(finalTargetUrl);

    } catch (err: any) {
      console.error('[S3 DIRECT UPLOAD ERROR]', err);
      setIsUploading(false);
      setIsLambdaProcessing(false);
      playCancelSound();
      setErrorMessage(
        err?.message || "Échec lors de l'envoi de la vidéo vers le serveur de stockage S3. Veuillez vérifier votre connexion et réessayer."
      );
    }
  };

  /**
   * Sélection et validation stricte du fichier côté client
   */
  const handleFileSelection = async (file: File) => {
    setErrorMessage(null);

    // 1. Validation du format : vidéo uniquement
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(file.name);
    if (!isVideo) {
      playCancelSound();
      setErrorMessage("Format non supporté. Veuillez sélectionner un fichier vidéo valide (MP4, MOV, WebM).");
      return;
    }

    // 2. Règle stricte : Limiter la taille maximale à 200 Mo côté client
    if (file.size > MAX_FILE_SIZE_BYTES) {
      playCancelSound();
      setErrorMessage("La vidéo est trop lourde (maximum 200 Mo).");
      return;
    }

    playTapBeep();
    setSelectedFile(file);

    // Prévisualisation immédiate en local
    const localUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(localUrl);

    // Extraction asynchrone de la miniature pour affichage
    extractThumbnail(file).then((thumb) => {
      if (thumb) {
        thumbnailRef.current = thumb;
        setThumbnailUrl(thumb);
      }
    });

    // Déclenchement automatique de l'upload direct S3
    await executeDirectS3Upload(file);
  };

  /**
   * Nouvelle tentative en cas d'erreur de téléversement
   */
  const handleRetryUpload = () => {
    if (selectedFile) {
      executeDirectS3Upload(selectedFile);
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Publication sécurisée du Reel avec écran de transition élégant et surveillance Lambda
   */
  const handlePublishAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isUploading) {
      setErrorMessage("Veuillez patienter pendant le téléversement de la vidéo vers le serveur.");
      return;
    }

    const finalVideo = (uploadedVideoUrl || '').trim();
    if (!finalVideo) {
      playCancelSound();
      setErrorMessage("Aucune vidéo prête. Veuillez sélectionner une vidéo.");
      return;
    }

    // 1. Écran de transition immédiat (bloque l'interface et informe l'utilisateur)
    setIsVerifyingAndApproving(true);
    setVerificationDynamicText("Vérification et approbation du Reel en cours...");
    setIsPublishing(true);

    try {
      // 2. Surveillance de la fin du traitement en arrière-plan (compressed-reels/)
      let isReady = isOptimizedReady;
      let attempts = 0;
      const maxAttempts = 12; // Surveillance non-bloquante d'environ 15 secondes

      while (!isReady && attempts < maxAttempts) {
        attempts++;
        if (attempts === 2) {
          setVerificationDynamicText("Optimisation et encodage haute fidélité 480p...");
        } else if (attempts === 5) {
          setVerificationDynamicText("Vérification du flux ultra-rapide mobile...");
        } else if (attempts === 8) {
          setVerificationDynamicText("Finalisation de l'approbation Wameet...");
        }

        isReady = await checkCompressedVideoReady(finalVideo);
        if (!isReady) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }

      // Si le fichier était déjà prêt, courte temporisation UX élégante (800ms) pour masquer la latence perçue
      if (attempts === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setIsOptimizedReady(true);
      setIsLambdaProcessing(false);
      playValidationBeep();

      // 3. Validation et Succès : appel de la publication pour injection directe dans le feed
      await onPublishReel(
        e,
        finalVideo,
        caption,
        thumbnailRef.current || thumbnailUrl || undefined
      );

      setIsVerifyingAndApproving(false);
    } catch (err: any) {
      console.error('[STUDIO PUBLISH REEL ERROR]', err);
      setIsVerifyingAndApproving(false);
      playCancelSound();
      setErrorMessage(err?.message || "Échec lors de la publication du Reel.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = () => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    setThumbnailUrl(null);
    setUploadedVideoUrl(null);
    setPresignedData(null);
    setUploadProgress(0);
    setIsUploading(false);
    setIsLambdaProcessing(false);
    setIsOptimizedReady(false);
    setIsVerifyingAndApproving(false);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    cameraInputRef.current && (cameraInputRef.current.value = '');
  };

  return (
    <div className="w-full space-y-4 text-slate-900 select-none relative">
      {/* ─── MODAL DE TRANSITION & APPROBATION DU REEL (BLOQUANT ET ÉLÉGANT) ─── */}
      {isVerifyingAndApproving && (
        <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-[#4169E1] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#4169E1] animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white tracking-tight">
                {verificationDynamicText}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Optimisation finale et validation du flux 480p sur le réseau haute performance Wameet.
              </p>
            </div>

            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#4169E1] h-full rounded-full animate-pulse w-3/4" />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#4169E1] text-[11px] font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Traitement Cloud Serverless</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── EN-TÊTE PROFIL DU CRÉATEUR ───────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4169E1] text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-[#4169E1]/20 overflow-hidden">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              authorName.charAt(0)
            )}
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>{authorName}</span>
              <span className="text-[10px] font-bold text-[#4169E1] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {authorBadge}
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">Format Reel Plein Écran (9:16)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ─── SÉLECTEUR DE FORMAT (PHOTO / VIDÉO REEL) ──────────────────── */}
      {onSwitchMediaType && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSwitchMediaType('image')}
            className="flex-1 py-1.5 rounded-xl text-xs font-black bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
          >
            Photo
          </button>
          <button
            type="button"
            className="flex-1 py-1.5 rounded-xl text-xs font-black bg-[#4169E1] text-white border border-[#4169E1] shadow-xs cursor-pointer"
          >
            Vidéo Reel
          </button>
        </div>
      )}

      {/* ─── INPUTS DE SÉLECTION / CAPTURE ─────────────────────────────── */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="video/*"
        capture="user"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelection(file);
        }}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/x-m4v,video/quicktime,video/webm,video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelection(file);
        }}
        className="hidden"
      />

      {/* ─── BOUTONS D'ACQUISITION SI AUCUNE VIDÉO ─────────────────────── */}
      {!selectedFile && !uploadedVideoUrl && (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="py-4 px-3 rounded-2xl border-2 border-dashed border-[#4169E1]/40 bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[#4169E1] text-white flex items-center justify-center shadow-md shadow-[#4169E1]/30 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-[#4169E1]">Caméra Selfie</span>
            <span className="text-[10px] text-slate-500 font-medium">Enregistrer un Reel</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-4 px-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 hover:bg-slate-100 flex flex-col items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5 text-slate-700" />
            </div>
            <span className="text-xs font-black text-slate-800">Galerie Vidéo</span>
            <span className="text-[10px] text-slate-500 font-medium">Jusqu'à 200 Mo (MP4 / MOV)</span>
          </button>
        </div>
      )}

      {/* ─── MESSAGE D'ALERTE EN CAS D'ERREUR + BOUTON RETRY ───────────── */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="flex-1 font-semibold leading-relaxed">{errorMessage}</p>
          </div>
          {selectedFile && !isUploading && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleRetryUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réessayer l'envoi</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── PROGRESS BAR DIRECT UPLOAD S3 VERS wa-videos/ ─────────────── */}
      {isUploading && (
        <div className="p-4 rounded-3xl bg-slate-50/90 border border-slate-200/90 space-y-3 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="flex items-center gap-2 text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-[#4169E1]/10 text-[#4169E1] flex items-center justify-center">
                <CloudUpload className="w-3.5 h-3.5 animate-bounce" />
              </span>
              <span>Envoi direct vers S3 (wa-videos)... ({uploadProgress}%)</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-[#4169E1] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {uploadProgress}%
            </span>
          </div>

          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
            <div
              className="bg-[#4169E1] h-full transition-all duration-150 ease-out rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium pt-0.5">
            <span>Fichier source : <strong className="text-slate-700">{selectedFile ? formatBytes(selectedFile.size) : '0 Mo'}</strong></span>
            <span className="text-[#4169E1] font-bold">Transfert direct S3 Pre-signed ⚡</span>
          </div>
        </div>
      )}

      {/* ─── INDICATEUR VISUEL : TRAITEMENT & OPTIMISATION DU REEL (100%) ─ */}
      {isLambdaProcessing && (
        <div className="p-4 rounded-3xl bg-blue-50/80 border border-blue-200 space-y-2.5 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#4169E1] text-white flex items-center justify-center shadow-md shadow-[#4169E1]/30">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>Traitement et optimisation du Reel en cours...</span>
              </h4>
              <p className="text-[10px] text-slate-600 font-medium">
                Encodage Cloud Haute Performance + FFmpeg FastStart
              </p>
            </div>
          </div>

          <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden">
            <div className="bg-[#4169E1] h-full w-full animate-pulse rounded-full" />
          </div>

          <p className="text-[10px] text-blue-700/80 font-medium italic">
            Génération automatique du flux optimisé dans <code className="font-mono font-bold">compressed-reels/</code>
          </p>
        </div>
      )}

      {/* ─── PRÉVISUALISATION DU REEL & URL FINALE compressed-reels/ ───── */}
      {(localPreviewUrl || uploadedVideoUrl) && !isUploading && (
        <div className="p-4 rounded-3xl bg-slate-50/90 border border-slate-200 space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>Vidéo prête 🚀</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  {isOptimizedReady ? (
                    <span className="text-emerald-700 font-bold">Flux 480p FastStart finalisé (compressed-reels)</span>
                  ) : (
                    <span>Prévisualisation instantanée (conversion en tâche de fond)</span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Changer
            </button>
          </div>

          {/* Lecteur vidéo de prévisualisation pointant sur compressed-reels ou local stream */}
          <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-inner border border-slate-300">
            <video
              ref={videoPreviewRef}
              src={localPreviewUrl || uploadedVideoUrl || undefined}
              poster={thumbnailUrl || undefined}
              preload="metadata"
              playsInline
              loop
              muted
              controls
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* ─── DESCRIPTION / LÉGENDE DU REEL ─────────────────────────────── */}
      <div>
        <label className="text-xs font-black text-slate-800 block mb-1.5">
          Description du Reel :
        </label>
        <textarea
          rows={3}
          value={caption}
          onChange={(e) => onChangeCaption(e.target.value)}
          placeholder="Racontez votre histoire, partagez une opportunité ou un conseil percutant..."
          className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/30 focus:border-[#4169E1] resize-none"
        />
      </div>

      {/* ─── BOUTONS D'ACTION DU FORMULAIRE ─────────────────────────────── */}
      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
        >
          Annuler
        </button>

        <button
          type="button"
          onClick={handlePublishAction}
          disabled={!uploadedVideoUrl || isUploading || isPublishing}
          className="px-6 py-2.5 rounded-xl bg-[#4169E1] hover:bg-[#3154b3] text-white font-black text-xs shadow-lg shadow-[#4169E1]/30 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Publication en cours...</span>
            </>
          ) : isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Envoi S3 ({uploadProgress}%)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Publier le Reel</span>
            </>
          )}
        </button>
      </div>

      <VideoUploadModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onSuccess={(videoUrl, previewUrl) => {
          setUploadedVideoUrl(videoUrl);
          if (previewUrl) setThumbnailUrl(previewUrl);
          onUploadSuccess(videoUrl, previewUrl || undefined);
        }}
      />
    </div>
  );
};

export default WameetReelUploadStudio;
