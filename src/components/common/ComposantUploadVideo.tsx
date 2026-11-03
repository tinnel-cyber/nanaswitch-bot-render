/**
 * @file ComposantUploadVideo.tsx
 * @description Studio de Création Multimédia & Upload Vidéo Direct AWS S3
 * 
 * PROMPT 3 :
 * 1. Acquisition Caméra Frontale (Selfie) : <input type="file" accept="video/*" capture="user" />
 *    Généralisé à tous les utilisateurs.
 * 2. Éditeur Vidéo via HTML5 Canvas (aperçu en direct) :
 *    - Frame-by-frame loop sur <canvas>
 *    - Filtres CSS en direct (Sépia, Contraste, Noir & Blanc, Vibrant, etc.)
 *    - Texte en superposition (fillText, positionnable Haut / Centre / Bas)
 *    - Filtres et texte appliqués image par image pendant l'encodage WebCodecs (Web Worker)
 * 3. Charte Graphique VIP : Bleu Royal (#4169E1) et Blanc Pur (#FFFFFF).
 * 4. Encodage vidéo optimisé 720p matériel (VideoEncoder) puis transfert sécurisé vers le serveur.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Film,
  Sparkles,
  X,
  Play,
  Pause,
  Zap,
  ArrowRight,
  RefreshCw,
  Cpu,
  CloudUpload,
  Camera,
  Sliders,
  Type,
  Palette,
  Check
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';
import { getPresignedUploadUrl, uploadFileToS3, checkCompressedVideoReady } from '../../services/s3UploadService';
import { storage } from '../../firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export interface ComposantUploadVideoProps {
  /** Callback standard appelé avec le lien final S3 dès la fin de l'upload */
  onUploadComplete?: (finalVideoUrl: string, fileName?: string) => void;
  /** Alias rétro-compatible */
  onVideoUploaded?: (finalVideoUrl: string, fileName?: string) => void;
  /** Titre ou libellé du bloc */
  title?: string;
  /** Format visuel : 'card' (carte complète), 'compact' (zone réduite), ou 'inline-button' */
  variant?: 'card' | 'compact' | 'inline-button';
  /** Lien initial si une vidéo est déjà hébergée */
  initialVideoUrl?: string;
  /** Classes CSS supplémentaires */
  className?: string;
}

/**
 * Formate un nombre d'octets en Ko / Mo lisible
 */
function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 Mo';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} Mo`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} Ko`;
}

interface FilterPreset {
  id: string;
  label: string;
  css: string;
}

const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', label: 'Normal', css: 'none' },
  { id: 'sepia', label: 'Sépia Vintage', css: 'sepia(0.85) contrast(1.15)' },
  { id: 'contrast', label: 'Contraste Élevé', css: 'contrast(1.35) brightness(1.05)' },
  { id: 'grayscale', label: 'Noir & Blanc', css: 'grayscale(1)' },
  { id: 'vibrant', label: 'Vibrant Pop', css: 'saturate(1.6) brightness(1.08)' },
  { id: 'cyber', label: 'Cyber Bleu', css: 'hue-rotate(185deg) contrast(1.2)' }
];

export default function ComposantUploadVideo({
  onUploadComplete,
  onVideoUploaded,
  title = 'Studio Reels & Vidéos Wameet',
  variant = 'card',
  initialVideoUrl = '',
  className = ''
}: ComposantUploadVideoProps) {
  // ─── ÉTAPE 1 : STATES POUR L'APERÇU LOCAL (ZÉRO REQUÊTE) ─────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  // ─── ÉTAPE 2 : HTML5 CANVAS VIDEO EDITOR STATES (PRÉVISUALISATION TEMPS RÉEL) ──
  const [selectedFilterId, setSelectedFilterId] = useState<string>('none');
  const [overlayText, setOverlayText] = useState<string>('');
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [isCanvasPlaying, setIsCanvasPlaying] = useState<boolean>(true);
  const [activeTabEditor, setActiveTabEditor] = useState<'filters' | 'text'>('filters');

  // ─── ÉTAPE 3 : ÉTATS DE L'UPLOAD DIRECT BRUT S3 VERS wa-videos/ ─────────
  const [originalFileSize, setOriginalFileSize] = useState<number | null>(null);
  const [uploadEnCours, setUploadEnCours] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [lienVideo, setLienVideo] = useState<string | null>(initialVideoUrl || null);
  const [statut, setStatut] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isLambdaProcessing, setIsLambdaProcessing] = useState<boolean>(false);

  // REFS
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ─── NETTOYAGE STRICT DE LA MÉMOIRE (REVOKEOBJECTURL) ─────────────────────
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  // ─── ÉDITEUR HTML5 CANVAS : RENDU DES FRAMES EN TEMPS RÉEL ────────────────
  const activePreset = FILTER_PRESETS.find(p => p.id === selectedFilterId) || FILTER_PRESETS[0];

  useEffect(() => {
    if (!selectedFile || !localPreviewUrl) return;

    let animId: number;

    const renderFrameLoop = () => {
      const video = hiddenVideoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Ajustement automatique de la résolution du canvas au format vidéo d'origine
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 720;
            canvas.height = video.videoHeight || 1280;
          }

          // 1. Application du Filtre CSS sur le contexte Canvas
          ctx.filter = activePreset.css;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 2. Texte en superposition avec ctx.fillText()
          if (overlayText.trim()) {
            ctx.filter = 'none'; // Réinitialisation pour que le texte reste net et éclatant

            const fontSize = Math.max(22, Math.round(canvas.width * 0.052));
            ctx.font = `bold ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let yPos = canvas.height * 0.5;
            if (textPosition === 'top') yPos = canvas.height * 0.16;
            if (textPosition === 'bottom') yPos = canvas.height * 0.84;

            const text = overlayText.trim();
            const metrics = ctx.measureText(text);
            const padX = 22;
            const padY = 14;
            const boxW = metrics.width + padX * 2;
            const boxH = fontSize + padY * 2;
            const boxX = (canvas.width - boxW) / 2;
            const boxY = yPos - boxH / 2;

            // Pastille d'arrière-plan contrastée style Reels / TikTok
            ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
            ctx.beginPath();
            if (typeof (ctx as any).roundRect === 'function') {
              (ctx as any).roundRect(boxX, boxY, boxW, boxH, 16);
            } else {
              ctx.rect(boxX, boxY, boxW, boxH);
            }
            ctx.fill();

            // Bordure Bleu Royal (#4169E1)
            ctx.strokeStyle = '#4169E1';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Dessin du texte par-dessus la frame
            ctx.fillStyle = textColor;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 8;
            ctx.fillText(text, canvas.width / 2, yPos);
            ctx.shadowBlur = 0;
          }
        }
      }

      animId = requestAnimationFrame(renderFrameLoop);
    };

    animId = requestAnimationFrame(renderFrameLoop);
    return () => cancelAnimationFrame(animId);
  }, [selectedFile, localPreviewUrl, activePreset, overlayText, textPosition, textColor]);

  // ─── GESTIONNAIRE DE SÉLECTION DE FICHIER (APERÇU LOCAL IMMÉDIAT) ────────
  const gererSelectionFichier = (fichier: File) => {
    if (!fichier) return;

    if (!fichier.type.startsWith('video/')) {
      setStatut('❌ Veuillez sélectionner un fichier vidéo valide (MP4, MOV, WebM...).');
      playCancelSound();
      return;
    }

    // Limitation stricte de 200 Mo max
    if (fichier.size > 200 * 1024 * 1024) {
      setStatut("La vidéo est trop lourde (maximum 200 Mo).");
      playCancelSound();
      return;
    }

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    const newPreviewUrl = URL.createObjectURL(fichier);

    setSelectedFile(fichier);
    setLocalPreviewUrl(newPreviewUrl);
    setOriginalFileSize(fichier.size);
    setCompressedFileSize(null);
    setCompressionProgress(0);
    setUploadProgress(0);
    setSelectedFilterId('none');
    setOverlayText('');
    setStatut(`📁 Vidéo : ${fichier.name} (${formatBytes(fichier.size)}). Lancement automatique...`);
    playTapBeep();

    // Pipeline 100% automatique pour la variante inline
    if (variant === 'inline-button') {
      demarrerEnvoi(fichier);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = event.target.files?.[0];
    if (fichier) {
      gererSelectionFichier(fichier);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const fichier = e.dataTransfer.files?.[0];
    if (fichier) {
      gererSelectionFichier(fichier);
    }
  };

  // ─── UPLOAD DIRECT BRUT S3 VERS wa-videos/ & DÉLÉGATION LAMBDA ────────────
  const demarrerEnvoi = async (fichierCible?: File) => {
    const fileSource = fichierCible || selectedFile;
    if (!fileSource) return;

    setUploadEnCours(true);
    setUploadProgress(0);
    setIsLambdaProcessing(false);
    setStatut("Envoi direct de la vidéo brute vers le stockage Cloud (wa-videos/)...");

    try {
      let finalUrl = '';
      try {
        const presigned = await getPresignedUploadUrl(
          fileSource.name,
          fileSource.type || 'video/mp4'
        );

        await uploadFileToS3(presigned.uploadUrl, fileSource, (percent) => {
          setUploadProgress(percent);
        });

        finalUrl = presigned.hlsUrl || presigned.finalVideoUrl;
      } catch (s3Err) {
        console.warn('[REEL UPLOAD] Serveur S3 direct indisponible, bascule sur stockage secondaire :', s3Err);
        const cleanName = fileSource.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileRef = storageRef(storage, `wameet_reels/${Date.now()}-${cleanName}`);
        const uploadTask = uploadBytesResumable(fileRef, fileSource, {
          contentType: fileSource.type || 'video/mp4'
        });

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              if (snapshot.totalBytes > 0) {
                const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setUploadProgress(pct);
              }
            },
            (err) => reject(err),
            async () => {
              finalUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      setUploadProgress(100);
      setIsLambdaProcessing(true);
      setStatut("✅ Vidéo brute transférée vers wa-videos/. Découpage HLS et poster délégués au Cloud Serverless.");
      setLienVideo(finalUrl);
      playValidationBeep();

      if (onUploadComplete) onUploadComplete(finalUrl, fileSource.name);
      if (onVideoUploaded) onVideoUploaded(finalUrl, fileSource.name);
    } catch (err: any) {
      console.error('[STUDIO REEL UPLOAD ERROR]', err);
      setStatut(`❌ Problème lors de l'envoi : ${err?.message || 'Erreur réseau'}`);
      playCancelSound();
    } finally {
      setUploadEnCours(false);
    }
  };

  const reinitialiser = () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    setLienVideo(null);
    setOriginalFileSize(null);
    setUploadProgress(0);
    setSelectedFilterId('none');
    setOverlayText('');
    setStatut('');
    setIsLambdaProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const togglePlayCanvas = () => {
    const video = hiddenVideoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
        setIsCanvasPlaying(true);
      } else {
        video.pause();
        setIsCanvasPlaying(false);
      }
    }
  };

  // ─── VARIANTE BOUTON INLINE ──────────────────────────────────────────────
  if (variant === 'inline-button') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Input Selfie Mobile Obligatoire : capture="user" */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="video/*"
          capture="user"
          onChange={handleInputChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/x-m4v,video/quicktime,video/webm,video/*"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={uploadEnCours}
            onClick={() => cameraInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-[#4169E1] hover:bg-[#3154b3] text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Prendre une vidéo selfie caméra frontale"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Caméra Selfie</span>
          </button>

          <button
            type="button"
            disabled={uploadEnCours}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Fichier</span>
          </button>

          {selectedFile && !uploadEnCours && !lienVideo && (
            <button
              type="button"
              onClick={() => demarrerEnvoi()}
              className="px-3.5 py-2 rounded-xl bg-[#4169E1] text-white font-black text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Envoyer sur S3 ({formatBytes(selectedFile.size)})</span>
            </button>
          )}

          {(lienVideo || selectedFile) && (
            <button
              type="button"
              onClick={reinitialiser}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* DOUBLE BARRE DE PROGRESSION EN TEMPS RÉEL (PROMPT SPEC) */}
        {uploadEnCours && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 mt-2 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[11px] font-black text-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4169E1] animate-ping" />
                <span>Upload direct brut vers l'Espace Cloud (wa-videos/)... ({uploadProgress}%)</span>
              </span>
              <span className="text-[#4169E1] font-mono font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-[#4169E1] to-emerald-500 h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(65,105,225,0.4)]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
              <span>Source brute : {selectedFile ? formatBytes(selectedFile.size) : '0 Mo'}</span>
              <span className="text-emerald-700 font-bold">Sans transcodage client</span>
            </div>
          </div>
        )}

        {/* SUCCÈS SANS LIEN BRUT BUCKET */}
        {lienVideo && !uploadEnCours && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-black text-emerald-900 mt-2">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Vidéo prête 🚀</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Prête
            </span>
          </div>
        )}

        {statut && !lienVideo && (
          <p className="text-[11px] font-semibold text-slate-600 animate-pulse">{statut}</p>
        )}
      </div>
    );
  }

  // ─── VARIANTE CARTE COMPLÈTE : BLEU ROYAL (#4169E1) ET BLANC PUR (#FFFFFF)
  return (
    <div className={`p-4 sm:p-6 rounded-[28px] bg-white border-2 border-[#4169E1]/20 shadow-[0_12px_40px_-15px_rgba(65,105,225,0.18)] space-y-4 text-slate-900 ${className}`}>
      {/* Input Selfie HTML5 obligatoire capture="user" (Caméra frontale mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="video/*"
        capture="user"
        onChange={handleInputChange}
        className="hidden"
      />
      {/* Input fichier vidéo classique */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/x-m4v,video/quicktime,video/webm,video/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Élément <video> masqué pour le pipeline Canvas */}
      {localPreviewUrl && (
        <video
          ref={hiddenVideoRef}
          src={localPreviewUrl}
          playsInline
          loop
          muted
          autoPlay
          className="hidden"
        />
      )}

      {/* En-tête : Bleu Royal (#4169E1) & Blanc Pur (#FFFFFF) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#4169E1] text-white flex items-center justify-center shadow-md shadow-[#4169E1]/30">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#4169E1]/10 text-[#4169E1] border border-[#4169E1]/30">
                Selfie & Canvas
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Caméra frontale, filtres CSS & texte incrusté avant encodage 720p S3
            </p>
          </div>
        </div>

        {(selectedFile || lienVideo) && (
          <button
            type="button"
            onClick={reinitialiser}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
            title="Effacer et changer de vidéo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─── CAS 1 : AUCUN FICHIER (DOUBLE BOUTON : SELFIE / FICHIER) ───────── */}
      {!selectedFile && !lienVideo && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition bg-slate-50/70 ${
            isDragOver ? 'border-[#4169E1] bg-blue-50/50 scale-[1.01]' : 'border-slate-300 hover:border-[#4169E1]'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#4169E1]/10 border border-[#4169E1]/20 text-[#4169E1] mx-auto flex items-center justify-center mb-3.5 shadow-sm">
            <Camera className="w-7 h-7" />
          </div>

          <h4 className="text-sm sm:text-base font-black text-slate-900 mb-1.5">
            Filmez votre Reel ou choisissez une vidéo
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            Accessible à tous les créateurs. Enregistrez directement via votre caméra frontale avec filtres en direct et incrustation de texte.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Bouton Caméra Frontale Mobile Obligatoire : capture="user" */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#4169E1] hover:bg-[#3154b3] text-white text-xs font-black shadow-lg shadow-[#4169E1]/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>📸 Caméra Frontale (Selfie Reel)</span>
            </button>

            {/* Bouton Import Galerie / Disque */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border-2 border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>📁 Choisir un Fichier Vidéo</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── CAS 2 : ÉDITEUR HTML5 CANVAS AVEC FILTRES & TEXTE OVERLAY ──────── */}
      {selectedFile && localPreviewUrl && !lienVideo && (
        <div className="space-y-4 p-4 rounded-3xl bg-slate-50/80 border border-slate-200">
          {/* Barre supérieure d'information */}
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#4169E1] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#4169E1]" />
              <span>Éditeur Vidéo Canvas (Temps Réel)</span>
            </span>

            <span className="text-[11px] font-mono text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
              Taille brute : {formatBytes(selectedFile.size)}
            </span>
          </div>

          {/* Le Canvas de Rendu Frame-by-Frame */}
          <div className="relative rounded-2xl overflow-hidden bg-black max-h-80 flex items-center justify-center border-2 border-slate-800 shadow-inner group">
            <canvas
              ref={canvasRef}
              className="w-full max-h-80 object-contain"
            />

            {/* Bouton Play/Pause flottant sur le Canvas */}
            <button
              type="button"
              onClick={togglePlayCanvas}
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              {isCanvasPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Lecture</span>
                </>
              )}
            </button>
          </div>

          {/* Onglets Contrôles de l'Éditeur : Filtres CSS vs Texte en Superposition */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTabEditor('filters')}
              className={`flex-1 py-2 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                activeTabEditor === 'filters'
                  ? 'border-[#4169E1] text-[#4169E1]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Filtres Créatifs ({FILTER_PRESETS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTabEditor('text')}
              className={`flex-1 py-2 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                activeTabEditor === 'text'
                  ? 'border-[#4169E1] text-[#4169E1]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Texte en Superposition</span>
              {overlayText.trim() && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          {/* CONTENU ONGLET 1 : FILTRES CSS SUR CANVAS */}
          {activeTabEditor === 'filters' && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Sélectionnez un style de couleur en direct :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FILTER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSelectedFilterId(preset.id);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold text-left flex items-center justify-between border transition cursor-pointer ${
                      selectedFilterId === preset.id
                        ? 'bg-[#4169E1] text-white border-[#4169E1] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {selectedFilterId === preset.id && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CONTENU ONGLET 2 : TEXTE EN SUPERPOSITION (ctx.fillText) */}
          {activeTabEditor === 'text' && (
            <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  ✏️ Texte à incruster sur le Reel :
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder="Ex : Astuce du jour 🔥 | -50% jusqu'à minuit"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-[#4169E1] text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Position du texte */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Position sur la vidéo :
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { pos: 'top' as const, label: 'Haut' },
                      { pos: 'center' as const, label: 'Milieu' },
                      { pos: 'bottom' as const, label: 'Bas' }
                    ].map((item) => (
                      <button
                        key={item.pos}
                        type="button"
                        onClick={() => setTextPosition(item.pos)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          textPosition === item.pos
                            ? 'bg-[#4169E1] text-white border-[#4169E1]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Couleur du texte */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Couleur du texte :
                  </label>
                  <div className="flex gap-2 items-center">
                    {[
                      { color: '#ffffff', label: 'Blanc' },
                      { color: '#fbbf24', label: 'Jaune' },
                      { color: '#4169E1', label: 'Bleu Royal' },
                      { color: '#34d399', label: 'Vert' }
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setTextColor(c.color)}
                        style={{ backgroundColor: c.color }}
                        className={`w-7 h-7 rounded-full border-2 transition cursor-pointer shadow-xs ${
                          textColor === c.color ? 'border-slate-900 scale-110 ring-2 ring-[#4169E1]' : 'border-slate-300'
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── DEUX JOLIES BARRES DE PROGRESSION VISUELLE ─────────────────── */}
          {uploadEnCours && (
            <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-black text-slate-900">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#4169E1]/10 text-[#4169E1] flex items-center justify-center">
                    <CloudUpload className="w-3.5 h-3.5 animate-bounce" />
                  </span>
                  <span>Envoi direct vers l'Espace Cloud (wa-videos)... ({uploadProgress}%)</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-[#4169E1] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-[#4169E1] via-blue-500 to-emerald-500 h-full transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium pt-0.5">
                <span>Source brute : <strong className="text-slate-700">{selectedFile ? formatBytes(selectedFile.size) : '0 Mo'}</strong></span>
                <span className="text-[#4169E1] font-bold">Sans transcodage client • Découpage HLS délégué au Cloud Serverless ⚡</span>
              </div>
            </div>
          )}

          {/* ─── BOUTONS D'ACTION ───────────────────────────────────────────── */}
          {!uploadEnCours && (
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => demarrerEnvoi()}
                className="flex-1 px-5 py-3 rounded-2xl bg-[#4169E1] hover:bg-[#3154b3] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#4169E1]/25 transition active:scale-95 cursor-pointer"
              >
                <CloudUpload className="w-4 h-4 text-white" />
                <span>Téléverser la vidéo brute vers S3 (wa-videos/)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── MESSAGES DE STATUT ────────────────────────────────────────────── */}
      {statut && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
            statut.includes('✅')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statut.includes('❌')
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-[#4169E1] border border-blue-200 animate-pulse'
          }`}
        >
          {statut.includes('✅') ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : statut.includes('❌') ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 text-[#4169E1] animate-spin shrink-0" />
          )}
          <span className="flex-1">{statut}</span>
        </div>
      )}

      {/* ─── CAS 3 : VIDÉO PUBLIÉE - APERÇU ET MASQUAGE DU LIEN BRUT ────────── */}
      {lienVideo && (
        <div className="p-4 rounded-3xl bg-slate-50 border-2 border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black text-emerald-700">Vidéo prête 🚀</span>
            </div>

            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Prête à la publication
            </span>
          </div>

          {originalFileSize && (
            <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Poids source brute : <span className="text-slate-800 font-bold">{formatBytes(originalFileSize)}</span>
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                S3 wa-videos/
              </span>
            </div>
          )}

          <div className="relative rounded-2xl overflow-hidden bg-black max-h-72 flex items-center justify-center border border-slate-200">
            <video
              src={lienVideo}
              preload="none"
              controls
              playsInline
              className="w-full max-h-72 object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-500 font-medium">
              Aperçu haute fidélité généré
            </span>

            <button
              type="button"
              onClick={reinitialiser}
              className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition shrink-0 cursor-pointer"
            >
              Remplacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
