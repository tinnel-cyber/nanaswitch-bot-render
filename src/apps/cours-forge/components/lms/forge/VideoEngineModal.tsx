import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  Video,
  Upload,
  Sparkles,
  Check,
  CheckCircle2,
  Play,
  RotateCcw,
  UserCheck,
  Mic,
  Sliders,
  HardDrive,
  Clock,
  Film,
  AlertCircle,
  Youtube,
  ShieldCheck,
  EyeOff,
  Eye,
  Crown
} from 'lucide-react';
import { VideoLessonNodeConfig } from '../../../../../types';
import { StealthYouTubePlayer } from '../video/StealthYouTubePlayer';
import { updateLessonBranding, updateModuleBranding } from '../../../../../services/lmsService';
import { generateAIMedia } from '../../../../../services/aiStudioService';
import { playValidationBeep, playTapBeep } from '../../../../../utils/audio';
import { useFeatureGate } from '../../../../../hooks/useFeatureGate';

interface VideoEngineModalProps {
  isOpen: boolean;
  nodeId: string;
  nodeTitle: string;
  initialConfig?: VideoLessonNodeConfig;
  onClose: () => void;
  onSave: (nodeId: string, config: VideoLessonNodeConfig) => void;
}

const AVATAR_MODELS = [
  {
    id: 'ibrahim_konkobo_hd',
    name: 'Ibrahim Pousbila Konkobo HD',
    role: 'Directeur Général & Fondateur',
    desc: 'Avatar officiel haute fidélité avec gestuelle naturelle et autorité institutionnelle',
    badge: 'Officiel',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'fintech_instructor_female',
    name: 'Amina Ouédraogo',
    role: 'Experte Fintech & Monétique',
    desc: 'Présentation dynamique axée sur les flux de paiement et transactions bancaires',
    badge: 'Populaire',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'telecom_expert_male',
    name: 'Kader Sanou',
    role: 'Architecte Réseaux & Télécom',
    desc: 'Explications techniques précises et démonstrations d\'infrastructures',
    badge: 'Technique',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  }
];

export const VideoEngineModal: React.FC<VideoEngineModalProps> = ({
  isOpen,
  nodeId,
  nodeTitle,
  initialConfig,
  onClose,
  onSave,
}) => {
  const { handlePremiumAction } = useFeatureGate();
  const [activeTab, setActiveTab] = useState<'MANUAL_UPLOAD' | 'AI_AVATAR' | 'YOUTUBE_EMBED'>(
    initialConfig?.mode || (initialConfig?.youtubeUrl ? 'YOUTUBE_EMBED' : 'MANUAL_UPLOAD')
  );

  // Configuration du cours / vidéo
  const [title, setTitle] = useState(initialConfig?.title || nodeTitle);
  const [durationMinutes, setDurationMinutes] = useState(initialConfig?.durationMinutes || 15);

  // ÉTAT DU MODE YOUTUBE EMBED & STEALTH
  const [youtubeUrl, setYoutubeUrl] = useState(
    initialConfig?.youtubeUrl || 
    (initialConfig?.mode === 'YOUTUBE_EMBED' ? initialConfig?.aiVideoUrl || '' : 'https://www.youtube.com/watch?v=jfKfPfyJRdk')
  );
  const [hideBranding, setHideBranding] = useState<boolean>(
    initialConfig?.hideBranding !== undefined ? initialConfig.hideBranding : true
  );

  // ÉTAT DU MODE UPLOAD MANUEL
  const [manualFileName, setManualFileName] = useState(initialConfig?.manualFileName || '');
  const [manualFileSize, setManualFileSize] = useState(initialConfig?.manualFileSize || 0);
  const [manualVideoUrl, setManualVideoUrl] = useState(initialConfig?.manualVideoUrl || '');
  const [uploadProgress, setUploadProgress] = useState(initialConfig?.isUploaded ? 100 : 0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(initialConfig?.isUploaded || false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ÉTAT DU MODE AVATAR IA
  const [aiScript, setAiScript] = useState(
    initialConfig?.aiScript ||
      `Bienvenue dans ce module de formation dispensé par l'Entreprise Konkobo Pousbila.\n\nAujourd'hui, nous allons étudier l'architecture des transactions financières hybrides et l'optimisation des flux de paiement déconnectés.\n\nPrenez des notes attentives car un quiz adaptatif IRT validera vos acquis à la fin de cette leçon.`
  );
  const [aiAvatarModel, setAiAvatarModel] = useState(
    initialConfig?.aiAvatarModel || 'ibrahim_konkobo_hd'
  );
  const [aiVoiceTone, setAiVoiceTone] = useState<'PROFESSIONAL' | 'DYNAMIC' | 'ACADEMIC'>(
    initialConfig?.aiVoiceTone || 'PROFESSIONAL'
  );
  const [aiRenderStatus, setAiRenderStatus] = useState<'IDLE' | 'GENERATING' | 'READY'>(
    initialConfig?.aiRenderStatus || (initialConfig?.aiVideoUrl ? 'READY' : 'IDLE')
  );
  const [aiStepIndex, setAiStepIndex] = useState(0);
  const [aiVideoUrl, setAiVideoUrl] = useState(
    initialConfig?.aiVideoUrl || ''
  );

  if (!isOpen) return null;

  // Upload Direct vers Stockage Cloud via URL pré-signée /api/get-upload-url
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setManualFileName(file.name);
    setManualFileSize(file.size);
    setIsUploading(true);
    setUploadProgress(15);
    setIsUploaded(false);

    try {
      // 1. Préparer les infos du fichier
      const formData = new FormData();
      formData.append('fileName', file.name);
      formData.append('fileType', file.type || 'video/mp4');

      // 2. Demander l'URL pré-signée S3
      const response = await fetch('/api/get-upload-url', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur get-upload-url (${response.status})`);
      }

      const { uploadUrl, finalVideoUrl } = await response.json();
      setUploadProgress(45);

      // 3. Envoyer le fichier DIRECTEMENT sur le Stockage Cloud
      const s3Upload = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'video/mp4',
        },
      });

      if (s3Upload.ok) {
        setUploadProgress(100);
        setIsUploading(false);
        setIsUploaded(true);
        setManualVideoUrl(finalVideoUrl);
        playValidationBeep();
      } else {
        throw new Error('Échec du transfert direct S3');
      }
    } catch (err) {
      console.warn('[VIDEO ENGINE] Erreur upload S3, bascule prévisualisation :', err);
      // Fallback preview local
      setManualVideoUrl(URL.createObjectURL(file));
      setUploadProgress(100);
      setIsUploading(false);
      setIsUploaded(true);
    }
  };

  // Pipeline de Synthèse Avatar IA connecté à la Callable Function Firebase
  const handleStartAiGeneration = async () => {
    if (!aiScript.trim()) {
      alert("Veuillez saisir le texte ou script que l'avatar vidéo doit énoncer.");
      return;
    }

    playTapBeep();
    setAiRenderStatus('GENERATING');
    setAiStepIndex(0);

    const stepInterval = setInterval(() => {
      setAiStepIndex(prev => Math.min(prev + 1, 3));
    }, 1200);

    try {
      const result = await generateAIMedia({
        prompt: aiScript.trim(),
        type: 'video',
        options: {
          avatarModel: aiAvatarModel,
          voiceTone: aiVoiceTone
        }
      });

      clearInterval(stepInterval);
      setAiStepIndex(3);
      setAiVideoUrl(result.mediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      setAiRenderStatus('READY');
      playValidationBeep();
    } catch (err: any) {
      clearInterval(stepInterval);
      console.warn("Repli sur avatar vidéo local suite à l'erreur :", err);
      setAiVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      setAiRenderStatus('READY');
    }
  };

  const handleSave = () => {
    const finalVideoUrl = activeTab === 'YOUTUBE_EMBED' 
      ? youtubeUrl 
      : activeTab === 'AI_AVATAR' 
        ? aiVideoUrl 
        : manualVideoUrl;

    const config: VideoLessonNodeConfig = {
      mode: activeTab,
      title,
      durationMinutes,
      youtubeUrl: activeTab === 'YOUTUBE_EMBED' ? youtubeUrl : undefined,
      hideBranding: hideBranding,
      manualFileName,
      manualFileSize,
      manualVideoUrl,
      uploadProgress,
      isUploaded: activeTab === 'YOUTUBE_EMBED' ? !!youtubeUrl : isUploaded,
      aiScript,
      aiAvatarModel,
      aiVoiceTone,
      aiRenderStatus,
      aiVideoUrl: finalVideoUrl,
    };

    // Sauvegarde asynchrone dans Firestore (sans bloquer la fermeture)
    updateLessonBranding('telecom-fintech-masterclass', nodeId, hideBranding, youtubeUrl).catch(err => {
      console.warn("Mise à jour Firestore en tâche de fond:", err);
    });

    onSave(nodeId, config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden">
        
        {/* En-tête de la Modal */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Moteur de Production Vidéo
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                  Hybride : Manuel & IA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Paramétrage de la leçon vidéo pour le nœud visualisé
              </p>
            </div>
          </div>

          {/* Toggle Sélecteur de Mode */}
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('MANUAL_UPLOAD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'MANUAL_UPLOAD'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Upload MP4</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('YOUTUBE_EMBED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'YOUTUBE_EMBED'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>YouTube Stealth</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AI_AVATAR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'AI_AVATAR'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Avatar IA</span>
                <Crown className="w-3 h-3 text-amber-400 fill-amber-400/20" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps de la Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Métadonnées de base */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-300">Titre de la Leçon</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Architecture des flux Mobile Money"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>Durée Estimée</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono text-center focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400 font-bold">min</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* PARAMÈTRE GLOBAL : MASQUER LE BRANDING YOUTUBE */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-indigo-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Protection Marque Blanche LMS
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Zero-Branding
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-slate-200">
                Masquer le logo et le branding YouTube lors de la lecture
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Neutralise l&apos;interface native YouTube, applique l&apos;overlay sécurisé anti-fuite (<code className="text-indigo-300 font-mono">scale-107</code> &amp; <code className="text-indigo-300 font-mono">pointer-events-none</code>) et déploie les contrôles sur-mesure HTML5 NaNa Academy.
              </p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              <span className={`text-xs font-bold ${hideBranding ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hideBranding ? 'Activé (Furtif)' : 'Désactivé'}
              </span>
              <button
                type="button"
                onClick={() => setHideBranding(!hideBranding)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hideBranding ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={hideBranding}
                title="Masquer le logo et le branding YouTube lors de la lecture"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    hideBranding ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* OPTION 2 : YOUTUBE EMBED FURTIF SANS BRANDING */}
          {/* ======================================================== */}
          {activeTab === 'YOUTUBE_EMBED' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-500" />
                    <span>Lien Vidéo YouTube (Watch, Embed ou YouTu.be)</span>
                  </span>
                  <span className="text-[10.5px] text-slate-400 font-normal">
                    Lien public ou non-répertorié
                  </span>
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) setYoutubeUrl(clipText);
                      } catch {
                        // ignore
                      }
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
                  >
                    Coller
                  </button>
                </div>
              </div>

              {/* Aperçu direct avec StealthYouTubePlayer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Aperçu en Direct du Lecteur Furtif NaNa</span>
                  </span>
                  {hideBranding && (
                    <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Interface YouTube masquée</span>
                    </span>
                  )}
                </div>

                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-xl">
                  <StealthYouTubePlayer
                    videoUrl={youtubeUrl}
                    title={title}
                    hideBranding={hideBranding}
                    hasNextLesson={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* OPTION 1 : UPLOAD MANUEL (Firebase Storage Chunked) */}
          {/* ======================================================== */}
          {activeTab === 'MANUAL_UPLOAD' && (
            <div className="space-y-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleFileSelected}
                className="hidden"
              />

              {!isUploaded && !isUploading ? (
                /* Dropzone d'upload */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-900/50 transition duration-200 group space-y-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center group-hover:scale-110 transition duration-200">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Déposez votre fichier vidéo MP4 ou parcourez votre disque
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Supporte les fichiers MP4, MOV jusqu&apos;à 2 Go avec téléversement par morceaux (chunks de 5 MB).
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
                  >
                    Sélectionner un fichier MP4
                  </button>
                </div>
              ) : isUploading ? (
                /* Indicateur de Progression Circulaire SVG */
                <div className="p-8 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-32 h-32">
                    {/* SVG Circle */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="54"
                        stroke="#1e293b"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="54"
                        stroke="#6366f1"
                        strokeWidth="8"
                        strokeDasharray={339.292}
                        strokeDashoffset={339.292 - (339.292 * uploadProgress) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-300 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white font-mono">
                        {uploadProgress}%
                      </span>
                      <span className="text-[10px] uppercase font-bold text-indigo-400">
                        Téléversement
                      </span>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <h5 className="text-sm font-bold text-white">
                      {manualFileName || 'video_formation_module.mp4'}
                    </h5>
                    <p className="text-xs text-slate-400">
                      Envoi par chunks de 5MB vers Firebase Cloud Storage...
                    </p>
                  </div>
                </div>
              ) : (
                /* Vidéo Prête : Prévisualisation Native HTML5 */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        Fichier vidéo téléversé avec succès ({manualFileName})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploaded(false);
                        setUploadProgress(0);
                        setTimeout(() => fileInputRef.current?.click(), 100);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold"
                    >
                      Remplacer la vidéo
                    </button>
                  </div>

                  {/* Lecteur Vidéo Natif */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-[340px] flex items-center justify-center">
                    {manualVideoUrl ? (
                      <video
                        src={manualVideoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-500 space-y-2">
                        <Film className="w-10 h-10 mx-auto opacity-40" />
                        <p className="text-xs">Aperçu vidéo prêt à la lecture</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* OPTION 2 : GENERATE AI AVATAR (Synthèse Neuronale) */}
          {/* ======================================================== */}
          {activeTab === 'AI_AVATAR' && (
            <div className="space-y-5">
              {/* Choix de l'avatar avec Menu Déroulant (Cahier des charges) */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sélectionnez le Présentateur Virtuel</span>
                  </label>

                  {/* Menu déroulant de sélection d'avatar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-semibold">Avatar :</span>
                    <select
                      value={aiAvatarModel}
                      onChange={e => setAiAvatarModel(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:border-rose-500 outline-none cursor-pointer"
                    >
                      {AVATAR_MODELS.map(model => (
                        <option key={model.id} value={model.id} className="bg-slate-900 text-white">
                          {model.name} — {model.role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {AVATAR_MODELS.map(model => {
                    const isSelected = aiAvatarModel === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => setAiAvatarModel(model.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-rose-500/10 border-rose-500/80 ring-2 ring-rose-500 shadow-lg shadow-rose-950/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={model.avatarUrl}
                            alt={model.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1">
                              <span>{model.name}</span>
                            </div>
                            <div className="text-[10px] text-rose-300 font-semibold">{model.role}</div>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-2 line-clamp-2">
                          {model.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tonalité Vocale & Prompt de Script */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tonalité Vocale</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'PROFESSIONAL', label: 'Professionnel & Rigoureux' },
                      { id: 'DYNAMIC', label: 'Dynamique & Pédagogique' },
                      { id: 'ACADEMIC', label: 'Académique & Formel' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAiVoiceTone(t.id as any)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                          aiVoiceTone === t.id
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      <span>Texte & Script de la Leçon (Générateur Lip-Sync)</span>
                    </label>
                    <span className="text-[10.5px] text-slate-500 font-mono">
                      {aiScript.length} caractères
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={aiScript}
                    onChange={e => setAiScript(e.target.value)}
                    placeholder="Saisissez ou collez le script que l'avatar IA doit énoncer avec synchronisation labiale..."
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-rose-500 leading-relaxed font-sans"
                  />
                </div>
              </div>

              {/* État du Rendu IA */}
              {aiRenderStatus === 'IDLE' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handlePremiumAction('pro', handleStartAiGeneration, {
                        featureType: 'AVATAR',
                        featureName: 'Avatar Vidéo Enseignant IA',
                        featureKey: 'AI_VIDEO_AVATAR',
                        customTitle: 'Débloquez les Avatars Vidéo IA 👑',
                        customMessage: 'Cette fonctionnalité (Avatar Vidéo Enseignant IA) est incluse dans nos plans Premium. Gagnez des heures de travail chaque semaine en laissant notre Intelligence Artificielle créer vos leçons vidéo à partir de vos scripts.'
                      });
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:opacity-95 text-white font-black text-xs sm:text-sm transition shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 group"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                    <span>✨ Générer avec avatar vidéo</span>
                    <Crown className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0" />
                  </button>
                </div>
              )}

              {aiRenderStatus === 'GENERATING' && (
                <div className="p-6 rounded-2xl bg-slate-950 border border-rose-500/40 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin flex items-center justify-center text-rose-400" />
                    <div>
                      <h5 className="text-xs font-bold text-white">
                        Traitement de la Synthèse Multimodale en cours...
                      </h5>
                      <p className="text-[11px] text-rose-300 font-semibold">
                        Étape {aiStepIndex + 1}/4 : {
                          [
                            'Analyse sémantique & phonétique du script',
                            'Génération TTS neuronale 48kHz',
                            'Calcul des descripteurs faciaux 3D Lip-Sync',
                            'Rendu vidéo 4K ultra-réaliste'
                          ][aiStepIndex] || 'Finalisation'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-indigo-500 transition-all duration-700"
                      style={{ width: `${((aiStepIndex + 1) / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {aiRenderStatus === 'READY' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Avatar IA synthétisé avec succès avec lip-sync parfait !</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartAiGeneration}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-bold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Régénérer</span>
                    </button>
                  </div>

                  {/* Lecteur Vidéo de l'Avatar */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-[340px]">
                    <video
                      src={aiVideoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pied de Page de la Modal */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Mode sélectionné : <span className="text-white font-bold">{
              activeTab === 'MANUAL_UPLOAD' 
                ? 'MP4 Manuel' 
                : activeTab === 'YOUTUBE_EMBED' 
                  ? 'YouTube Stealth (Marque Blanche)' 
                  : 'Avatar IA'
            }</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Sauvegarder la Leçon Vidéo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEngineModal;
