import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Film,
  Upload,
  Download,
  Scissors,
  Type,
  Sliders,
  Music,
  Mic,
  Square,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Smartphone,
  Monitor,
  Square as SquareIcon,
  Wand2,
  Volume2,
  AudioWaveform,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { encodeVideo, formatBytes, VideoEncodeResult } from '../../../services/videoEncoderService';
import {
  processVoiceWithDsp,
  VOICE_EQ_PRESETS,
  VoiceDspSettings
} from '../../../services/voiceEnhancerService';
import {
  ChromaKeyConfig,
  DEFAULT_CHROMA_CONFIG,
  STUDIO_BACKDROP_PRESETS,
  renderChromaKeyFrame,
  BackdropKeyMode
} from '../../../services/chromaKeyStudioService';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../../utils/audio';

export interface SocialVideoMontageStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialVideoUrl?: string;
  initialHeadline?: string;
  storeName?: string;
  whatsappPhone?: string;
  publicLink?: string;
}

type SocialFormatId = '9:16' | '1:1' | '16:9';
type StudioPanelTab = 'EDIT' | 'MOTION' | 'BACKDROP' | 'AUDIO' | 'PARTNERS' | 'PUBLISH';
type SocialNetworkId = 'tiktok_reels' | 'whatsapp_status' | 'facebook_youtube';
type MotionDesignId =
  | 'classic'
  | 'lower_third_glass'
  | 'promo_flash_neon'
  | 'breaking_ticker'
  | 'luxury_gold'
  | 'social_cta_pill';
type MotionAnimId =
  | 'none'
  | 'slide_up_spring'
  | 'kinetic_pop'
  | 'pulse_glow'
  | 'float_smooth'
  | 'zoom_impact';

const SOCIAL_FORMATS: Record<SocialFormatId, { label: string; subtitle: string; width: number; height: number; aspectClass: string; maxRecommendedSec: number }> = {
  '9:16': {
    label: '9:16 Vertical',
    subtitle: 'TikTok • Reels • Shorts • WhatsApp',
    width: 480,
    height: 854,
    aspectClass: 'aspect-[9/16] max-h-[430px]',
    maxRecommendedSec: 30
  },
  '1:1': {
    label: '1:1 Carré',
    subtitle: 'Instagram • Facebook Feed',
    width: 720,
    height: 720,
    aspectClass: 'aspect-square max-h-[380px]',
    maxRecommendedSec: 60
  },
  '16:9': {
    label: '16:9 Paysage',
    subtitle: 'YouTube • Facebook • Formation',
    width: 1280,
    height: 720,
    aspectClass: 'aspect-video w-full',
    maxRecommendedSec: 120
  }
};

const VIDEO_FILTERS = [
  { id: 'none', label: 'Original', css: '' },
  { id: 'vivid', label: 'Pub Éclatante', css: 'contrast(1.12) saturate(1.28) brightness(1.04)' },
  { id: 'cinema', label: 'Cinéma Chaud', css: 'contrast(1.15) sepia(0.18) saturate(1.15)' },
  { id: 'pro', label: 'Contraste Pro', css: 'contrast(1.22) brightness(1.03) saturate(1.08)' },
  { id: 'luxe_bw', label: 'Luxe N&B', css: 'grayscale(1) contrast(1.25)' }
];

const MOTION_DESIGN_PACK: Array<{
  id: MotionDesignId;
  name: string;
  badge: string;
  desc: string;
  wrapperClass: string;
  accentBar?: boolean;
  pillTag?: string;
}> = [
  {
    id: 'classic',
    name: 'Classique Épuré',
    badge: 'Standard',
    desc: 'Bandeau sombre lisible sur tous les fonds.',
    wrapperClass: 'bg-black/65 backdrop-blur-xs border border-white/10 rounded-xl px-3 py-2'
  },
  {
    id: 'lower_third_glass',
    name: 'Glassmorphism Pro',
    badge: '✨ Moderne',
    desc: 'Effet verre dépoli + barre latérale néon + badge OFFRE.',
    wrapperClass: 'bg-slate-950/55 backdrop-blur-md border border-white/25 rounded-2xl px-3.5 py-2.5 shadow-2xl',
    accentBar: true,
    pillTag: 'OFFRE'
  },
  {
    id: 'promo_flash_neon',
    name: 'Flash Promo Néon',
    badge: '🔥 TikTok / Pub',
    desc: 'Dégradé vibrant haute conversion pour ventes flash.',
    wrapperClass: 'bg-gradient-to-r from-rose-600/90 via-amber-500/90 to-orange-600/90 border border-amber-300/70 rounded-2xl px-3.5 py-2.5 shadow-xl shadow-rose-950/60',
    pillTag: 'FLASH'
  },
  {
    id: 'breaking_ticker',
    name: 'Bandeau Média / Live',
    badge: '📺 Annonce',
    desc: 'Style journal TV / annonce urgente très visible.',
    wrapperClass: 'bg-red-700/95 border-y-2 border-white/80 rounded-none px-3 py-2 shadow-lg',
    pillTag: 'EN DIRECT'
  },
  {
    id: 'luxury_gold',
    name: 'Cadre Luxe Or',
    badge: '👑 Premium',
    desc: 'Esthétique minimaliste noire & or pour produits haut de gamme.',
    wrapperClass: 'bg-black/80 backdrop-blur-md border border-amber-400/70 rounded-2xl px-4 py-2.5 shadow-2xl shadow-amber-950/40',
    pillTag: 'EXCLUSIF'
  },
  {
    id: 'social_cta_pill',
    name: 'Pilule CTA Réseaux',
    badge: '📲 Conversion',
    desc: 'Bouton pilule flottant incitant au clic / WhatsApp.',
    wrapperClass: 'bg-emerald-600/95 border-2 border-emerald-200/70 rounded-full px-4 py-2 shadow-xl shadow-emerald-950/60',
    pillTag: 'COMMANDER'
  }
];

const ANIMATION_PACK: Array<{
  id: MotionAnimId;
  name: string;
  badge: string;
  desc: string;
  animClass: string;
}> = [
  { id: 'none', name: 'Statique', badge: 'Fixe', desc: 'Sans mouvement.', animClass: '' },
  { id: 'slide_up_spring', name: 'Slide-Up Ressort', badge: 'Moderne', desc: 'Entrée dynamique fluide par le bas.', animClass: 'nana-anim-slide-up' },
  { id: 'kinetic_pop', name: 'Pop Cinétique', badge: 'TikTok', desc: 'Rebond dynamique style CapCut.', animClass: 'nana-anim-kinetic-pop' },
  { id: 'pulse_glow', name: 'Pulsation Néon', badge: 'Promo', desc: 'Pulsation lumineuse qui capte le regard.', animClass: 'nana-anim-pulse-glow' },
  { id: 'float_smooth', name: 'Flottement Doux', badge: 'Luxe', desc: 'Lévitation continue élégante.', animClass: 'nana-anim-float' },
  { id: 'zoom_impact', name: 'Zoom Impact Pub', badge: 'Punchy', desc: 'Effet coup de poing pour ventes flash.', animClass: 'nana-anim-zoom-impact' }
];

const TEXT_COLORS = [
  { id: '#FFFFFF', label: 'Blanc' },
  { id: '#FACC15', label: 'Or Promo' },
  { id: '#34D399', label: 'Émeraude' },
  { id: '#38BDF8', label: 'Cyan' }
];

const PRO_AUDIO_LIBRARY = [
  { id: 'pub_1', title: 'Rythme Pub Dynamique', category: 'Pub & Reels', duration: '2:15', url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3' },
  { id: 'afro_1', title: 'Énergie & Lancement Viral', category: 'Afro / Énergie', duration: '2:05', url: 'https://assets.mixkit.co/music/preview/mixkit-happy-times-158.mp3' },
  { id: 'corp_1', title: 'Fond Corporate & Formation', category: 'Cours & Webinaire', duration: '1:48', url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3' },
  { id: 'urg_1', title: 'Suspense Vente Flash', category: 'Offre Limitée', duration: '1:30', url: 'https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3' },
  { id: 'sfx_whoosh', title: 'SFX Transition Whoosh', category: 'Transitions', duration: '0:02', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
  { id: 'sfx_cash', title: 'SFX Encaissement / Succès', category: 'SFX Promo', duration: '0:02', url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3' }
];

const PARTNER_EDITORS = [
  {
    id: 'capcut',
    name: 'CapCut Web & Mobile',
    badge: '⭐ #1 TikTok / Reels',
    desc: 'Sous-titres automatiques en français, cuts dynamiques, effets viraux et export 1080p 9:16.',
    url: 'https://www.capcut.com/editor',
    color: 'from-slate-800 to-slate-900 border-emerald-500/40'
  },
  {
    id: 'canva',
    name: 'Canva Video Editor',
    badge: '🎨 Templates & Logos',
    desc: 'Idéal pour habiller vos vidéos avec des modèles commerciaux, animations de prix et charte graphique.',
    url: 'https://www.canva.com/video-editor/',
    color: 'from-indigo-950/70 to-slate-900 border-indigo-500/40'
  },
  {
    id: 'clipchamp',
    name: 'Microsoft Clipchamp',
    badge: '🎬 Multi-Pistes Gratuit',
    desc: 'Banc de montage timeline complet dans le navigateur avec voix off IA et transitions fluides.',
    url: 'https://app.clipchamp.com/',
    color: 'from-purple-950/70 to-slate-900 border-purple-500/40'
  }
];

export const SocialVideoMontageStudio: React.FC<SocialVideoMontageStudioProps> = ({
  isOpen,
  onClose,
  initialVideoUrl = '',
  initialHeadline = '',
  storeName = 'Ma Boutique',
  whatsappPhone = '',
  publicLink = ''
}) => {
  const [activePanel, setActivePanel] = useState<StudioPanelTab>('EDIT');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialVideoUrl);
  const [videoDuration, setVideoDuration] = useState<number>(30);
  const [maxDurationSec, setMaxDurationSec] = useState<number>(30);

  // Paramètres de montage, Motion Design & Animations
  const [socialFormat, setSocialFormat] = useState<SocialFormatId>('9:16');
  const [selectedFilterId, setSelectedFilterId] = useState<string>('vivid');
  const [motionDesignId, setMotionDesignId] = useState<MotionDesignId>('lower_third_glass');
  const [motionAnimId, setMotionAnimId] = useState<MotionAnimId>('slide_up_spring');
  const [animReplayKey, setAnimReplayKey] = useState<number>(0);

  const [overlayHeadline, setOverlayHeadline] = useState<string>(initialHeadline || `🔥 ${storeName}`);
  const [overlayPrice, setOverlayPrice] = useState<string>('');
  const [overlayContact, setOverlayContact] = useState<string>(whatsappPhone ? `📲 ${whatsappPhone}` : '');
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [textColor, setTextColor] = useState<string>('#FFFFFF');

  // Encodage via videoEncoderService (100% local, 0 stockage Cloud)
  const [isEncoding, setIsEncoding] = useState<boolean>(false);
  const [encodeProgress, setEncodeProgress] = useState<number>(0);
  const [encodeResult, setEncodeResult] = useState<VideoEncodeResult | null>(null);
  const [encodeError, setEncodeError] = useState<string | null>(null);

  // Studio Voix Off Micro + DSP Réel (Égaliseur 3 Bandes + Suppression de Bruit + Amélioration Broadcast)
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [rawVoiceBlob, setRawVoiceBlob] = useState<Blob | null>(null);
  const [rawVoiceUrl, setRawVoiceUrl] = useState<string | null>(null);
  const [enhancedVoiceUrl, setEnhancedVoiceUrl] = useState<string | null>(null);
  const [isProcessingDsp, setIsProcessingDsp] = useState<boolean>(false);
  const [dspStatusMsg, setDspStatusMsg] = useState<string | null>(null);
  const [dspSettings, setDspSettings] = useState<VoiceDspSettings>(VOICE_EQ_PRESETS.broadcast_pub.settings);
  const [activeEqPreset, setActiveEqPreset] = useState<string>('broadcast_pub');

  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const voiceFileInputRef = useRef<HTMLInputElement | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  // Fond Vert / Fond Bleu YCbCr + Remplacement d'Arrière-Plan IA Gemini
  const [chromaConfig, setChromaConfig] = useState<ChromaKeyConfig>(DEFAULT_CHROMA_CONFIG);
  const [selectedBackdropId, setSelectedBackdropId] = useState<string>('yt_neon');
  const [customBackdropUrl, setCustomBackdropUrl] = useState<string>('');
  const [geminiBackdropPrompt, setGeminiBackdropPrompt] = useState<string>('');
  const [isGeneratingBackdrop, setIsGeneratingBackdrop] = useState<boolean>(false);
  const [backdropStatusMsg, setBackdropStatusMsg] = useState<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const chromaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageObjRef = useRef<HTMLImageElement | null>(null);

  // Kit Publication Réseaux Sociaux
  const [targetNetwork, setTargetNetwork] = useState<SocialNetworkId>('tiktok_reels');
  const [copiedPost, setCopiedPost] = useState<boolean>(false);

  const activeBackdropUrl = useMemo(() => {
    if (customBackdropUrl) return customBackdropUrl;
    const preset = STUDIO_BACKDROP_PRESETS.find(p => p.id === selectedBackdropId);
    return preset?.type === 'image' ? preset.value : '';
  }, [customBackdropUrl, selectedBackdropId]);

  const activeBackdropGradient = useMemo(() => {
    if (customBackdropUrl) return '';
    const preset = STUDIO_BACKDROP_PRESETS.find(p => p.id === selectedBackdropId);
    return preset?.type === 'gradient' ? preset.value : '';
  }, [customBackdropUrl, selectedBackdropId]);

  // Chargement image d'arrière-plan pour le canvas Chroma Key
  useEffect(() => {
    if (!activeBackdropUrl) {
      bgImageObjRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageObjRef.current = img;
    };
    img.src = activeBackdropUrl;
  }, [activeBackdropUrl]);

  // Boucle de rendu Live Chroma Key YCbCr + Anti-Spill sur le Canvas quand activé
  useEffect(() => {
    if (chromaConfig.mode === 'none' || !previewUrl) return;
    let rafId = 0;
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });

    const loop = () => {
      const video = videoPreviewRef.current;
      const canvas = chromaCanvasRef.current;
      if (video && canvas && offCtx && video.readyState >= 2) {
        const fmt = SOCIAL_FORMATS[socialFormat];
        const renderW = Math.min(480, fmt.width);
        const renderH = Math.round(renderW * (fmt.height / fmt.width));
        if (canvas.width !== renderW || canvas.height !== renderH) {
          canvas.width = renderW;
          canvas.height = renderH;
          offscreen.width = renderW;
          offscreen.height = renderH;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            renderChromaKeyFrame(
              ctx,
              offCtx,
              video,
              renderW,
              renderH,
              chromaConfig,
              bgImageObjRef.current,
              activeBackdropGradient,
              VIDEO_FILTERS.find(f => f.id === selectedFilterId)?.css || ''
            );
          } catch {}
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [chromaConfig, previewUrl, socialFormat, activeBackdropGradient, selectedFilterId]);

  const handleGenerateGeminiBackdrop = async () => {
    if (!geminiBackdropPrompt.trim()) {
      setEncodeError('Décrivez le décor d\'arrière-plan souhaité (ex: Studio YouTube néon bleu).');
      return;
    }
    setIsGeneratingBackdrop(true);
    setEncodeError(null);
    setBackdropStatusMsg('Gemini IA prépare le décor Studio photoréaliste...');
    try {
      const res = await fetch('/api/ai/backdrop-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: geminiBackdropPrompt.trim(),
          aspectRatio: socialFormat
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json.imageUrl) {
        throw new Error(json?.error || 'Impossible de générer le décor IA.');
      }
      setCustomBackdropUrl(json.imageUrl);
      if (chromaConfig.mode === 'none') {
        setChromaConfig(c => ({ ...c, mode: 'green_screen' }));
      }
      playValidationBeep();
      setBackdropStatusMsg('✅ Décor généré par Gemini IA et appliqué en direct !');
    } catch (err: any) {
      playCancelSound();
      setEncodeError(err?.message || 'Erreur lors de la génération du décor IA.');
      setBackdropStatusMsg(null);
    } finally {
      setIsGeneratingBackdrop(false);
    }
  };

  const handleCustomBgImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playTapBeep();
    setCustomBackdropUrl(URL.createObjectURL(file));
    if (chromaConfig.mode === 'none') {
      setChromaConfig(c => ({ ...c, mode: 'green_screen' }));
    }
    setBackdropStatusMsg(`✅ Photo de fond chargée : ${file.name}`);
  };

  useEffect(() => {
    if (initialVideoUrl && !sourceFile) {
      setPreviewUrl(initialVideoUrl);
    }
  }, [initialVideoUrl, sourceFile]);

  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  const activeFilterCss = useMemo(
    () => VIDEO_FILTERS.find(f => f.id === selectedFilterId)?.css || '',
    [selectedFilterId]
  );

  const activeMotionPack = useMemo(
    () => MOTION_DESIGN_PACK.find(m => m.id === motionDesignId) || MOTION_DESIGN_PACK[0],
    [motionDesignId]
  );

  const activeAnimationPack = useMemo(
    () => ANIMATION_PACK.find(a => a.id === motionAnimId) || ANIMATION_PACK[0],
    [motionAnimId]
  );

  const combinedOverlayText = useMemo(() => {
    const tagPrefix = activeMotionPack.pillTag ? `[${activeMotionPack.pillTag}] ` : '';
    const main = [overlayHeadline.trim(), overlayPrice.trim(), overlayContact.trim()]
      .filter(Boolean)
      .join(' • ');
    return main ? `${tagPrefix}${main}` : '';
  }, [activeMotionPack.pillTag, overlayHeadline, overlayPrice, overlayContact]);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playTapBeep();
    setSourceFile(file);
    setEncodeResult(null);
    setEncodeError(null);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleAudioFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playTapBeep();
    setRawVoiceBlob(file);
    setRawVoiceUrl(URL.createObjectURL(file));
    setEnhancedVoiceUrl(null);
    setDspStatusMsg(`Fichier audio importé : ${file.name}. Cliquez sur « Appliquer DSP Studio » pour nettoyer et égaliser.`);
  };

  // Encodage final via videoEncoderService.ts -> téléchargement direct local (0 stockage Cloud)
  const handleCompileAndDownload = async () => {
    setEncodeError(null);
    setEncodeResult(null);

    let inputBlob: File | Blob | null = sourceFile;
    if (!inputBlob && previewUrl) {
      try {
        setIsEncoding(true);
        setEncodeProgress(5);
        const res = await fetch(previewUrl);
        if (!res.ok) throw new Error('Impossible de charger la vidéo distante pour encodage local.');
        inputBlob = await res.blob();
      } catch {
        setIsEncoding(false);
        setEncodeError(
          'Cette vidéo distante bloque la lecture directe (CORS). Téléchargez-la d\'abord puis importez le fichier ici avec « Importer Vidéo ».'
        );
        return;
      }
    }

    if (!inputBlob) {
      setEncodeError('Importez d\'abord une vidéo depuis votre appareil (ou générez-en une dans le studio).');
      return;
    }

    const fmt = SOCIAL_FORMATS[socialFormat];
    setIsEncoding(true);
    setEncodeProgress(10);

    // Si incrustation Fond Vert / Décor IA active : enregistrer le Canvas composé (YCbCr + Anti-Spill + Décor + Audio)
    if (chromaConfig.mode !== 'none' && videoPreviewRef.current && chromaCanvasRef.current && typeof MediaRecorder !== 'undefined') {
      try {
        const videoEl = videoPreviewRef.current;
        const canvasEl = chromaCanvasRef.current;
        const targetSec = Math.min(maxDurationSec, Math.max(2, Math.round(videoEl.duration || maxDurationSec)));

        const canvasStream = canvasEl.captureStream(24);
        const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
        try {
          const vStream = (videoEl as any).captureStream?.() || (videoEl as any).mozCaptureStream?.();
          if (vStream) {
            vStream.getAudioTracks().forEach((t: MediaStreamTrack) => tracks.push(t));
          }
        } catch {}

        const combinedStream = new MediaStream(tracks);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm';
        const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 1_800_000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };

        const recordedBlob = await new Promise<Blob>((resolve, reject) => {
          recorder.onerror = () => reject(new Error('Erreur enregistrement vidéo Fond Vert.'));
          recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));

          videoEl.currentTime = 0;
          recorder.start(250);
          videoEl.play().catch(() => {});

          const startTime = Date.now();
          const tick = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            setEncodeProgress(Math.min(98, Math.round((elapsed / targetSec) * 100)));
            if (elapsed >= targetSec || videoEl.ended) {
              clearInterval(tick);
              videoEl.pause();
              if (recorder.state !== 'inactive') recorder.stop();
            }
          }, 150);
        });

        const outFile = new File([recordedBlob], `nana-chroma-${socialFormat.replace(':', 'x')}-${Date.now()}.webm`, { type: mimeType });
        setEncodeProgress(100);
        setEncodeResult({
          file: outFile,
          originalSizeBytes: inputBlob.size,
          encodedSizeBytes: outFile.size,
          savingsPercent: 0,
          durationSec: targetSec,
          width: canvasEl.width,
          height: canvasEl.height,
          elapsedMs: targetSec * 1000,
          engine: 'webcodecs-hardware'
        });
        playValidationBeep();

        const dlUrl = URL.createObjectURL(outFile);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = outFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(dlUrl), 15000);
        setIsEncoding(false);
        return;
      } catch (chromaErr: any) {
        playCancelSound();
        setEncodeError(chromaErr?.message || 'Erreur lors de la compilation Fond Vert.');
        setIsEncoding(false);
        return;
      }
    }

    try {
      const result = await encodeVideo(inputBlob, {
        preset: 'reel',
        targetWidth: fmt.width,
        targetHeight: fmt.height,
        maxDurationSec,
        overlay: {
          filterCss: activeFilterCss || undefined,
          text: combinedOverlayText || undefined,
          textPosition,
          textColor
        },
        onProgress: (pct) => setEncodeProgress(Math.min(99, Math.max(10, Math.round(pct))))
      });

      setEncodeProgress(100);
      setEncodeResult(result);
      playValidationBeep();

      const dlUrl = URL.createObjectURL(result.file);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `nana-montage-${socialFormat.replace(':', 'x')}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(dlUrl), 15000);
    } catch (err: any) {
      playCancelSound();
      setEncodeError(err?.message || 'Erreur lors de la compilation vidéo locale.');
    } finally {
      setIsEncoding(false);
    }
  };

  // Enregistrement Voix Off Micro (avec réduction de bruit matérielle activée à la capture)
  const handleToggleVoiceRecord = async () => {
    if (isRecordingVoice && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: dspSettings.noiseReduction,
          echoCancellation: true,
          autoGainControl: dspSettings.voiceEnhance
        }
      });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRawVoiceBlob(blob);
        setRawVoiceUrl(URL.createObjectURL(blob));
        setEnhancedVoiceUrl(null);
        setDspStatusMsg('Voix enregistrée ! Cliquez sur « Appliquer DSP Studio » pour lancer l\'égaliseur, la suppression de bruit et l\'amélioration.');
        stream.getTracks().forEach(t => t.stop());
        playValidationBeep();
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecordingVoice(true);
      playTapBeep();
    } catch {
      setEncodeError('Accès au microphone refusé. Autorisez le micro dans votre navigateur pour enregistrer une voix off.');
    }
  };

  // Exécution réelle du moteur DSP Web Audio API (Suppression de bruit + EQ 3 Bandes + Broadcast Enhance)
  const handleRunVoiceDsp = async () => {
    if (!rawVoiceBlob) {
      setEncodeError('Enregistrez d\'abord votre voix au micro ou importez un fichier audio.');
      return;
    }
    setIsProcessingDsp(true);
    setEncodeError(null);
    try {
      const result = await processVoiceWithDsp(rawVoiceBlob, dspSettings);
      setEnhancedVoiceUrl(result.wavUrl);
      playValidationBeep();
      setDspStatusMsg(
        `✅ Voix traitée (${result.durationSec.toFixed(1)}s) : ${dspSettings.noiseReduction ? 'Bruit supprimé • ' : ''}${dspSettings.voiceEnhance ? 'Amélioration Broadcast • ' : ''}EQ (${dspSettings.eqBassDb >= 0 ? '+' : ''}${dspSettings.eqBassDb}/${dspSettings.eqMidDb >= 0 ? '+' : ''}${dspSettings.eqMidDb}/${dspSettings.eqTrebleDb >= 0 ? '+' : ''}${dspSettings.eqTrebleDb} dB).`
      );
    } catch (err: any) {
      playCancelSound();
      setEncodeError(err?.message || 'Erreur lors du traitement DSP de la voix.');
    } finally {
      setIsProcessingDsp(false);
    }
  };

  const handleToggleAudioTrack = (track: typeof PRO_AUDIO_LIBRARY[number]) => {
    if (playingTrackId === track.id && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setPlayingTrackId(null);
      return;
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    const audio = new Audio(track.url);
    audio.onended = () => setPlayingTrackId(null);
    audio.play().catch(() => {});
    audioPreviewRef.current = audio;
    setPlayingTrackId(track.id);
  };

  const generatedSocialPost = useMemo(() => {
    const title = overlayHeadline.trim() || storeName;
    const priceLine = overlayPrice.trim() ? `💰 ${overlayPrice.trim()}` : '';
    const phoneLine = overlayContact.trim() ? overlayContact.trim() : (whatsappPhone ? `📲 WhatsApp : ${whatsappPhone}` : '');
    const linkLine = publicLink ? `🔗 Commander ici : ${publicLink}` : '';

    if (targetNetwork === 'whatsapp_status') {
      return [
        `${title}`,
        priceLine,
        `✅ Disponible immédiatement • Qualité vérifiée`,
        phoneLine,
        linkLine
      ].filter(Boolean).join('\n');
    }
    if (targetNetwork === 'facebook_youtube') {
      return [
        `🚀 ${title} — ${storeName}`,
        '',
        priceLine,
        `Découvrez notre offre exclusive conçue pour vous livrer le meilleur rapport qualité/prix.`,
        phoneLine,
        linkLine,
        '',
        `#BusinessAfrique #Ecommerce #UEMOA #MobileMoney #Promo #${storeName.replace(/\s+/g, '')}`
      ].filter(Boolean).join('\n');
    }
    return [
      `${title} 🔥`,
      priceLine,
      `👇 Commandez en 1 clic ou écrivez-nous sur WhatsApp !`,
      phoneLine,
      linkLine,
      '',
      `#TikTokAfrique #ReelsBusiness #BonPlan #Burkina #CoteDIvoire #Senegal #FYP #Promo`
    ].filter(Boolean).join('\n');
  }, [targetNetwork, overlayHeadline, overlayPrice, overlayContact, storeName, whatsappPhone, publicLink]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950 text-slate-100 flex flex-col min-h-[100dvh] overflow-hidden">
      {/* Keyframes CSS du Pack Animations Modernes */}
      <style>{`
        @keyframes nanaSlideUpSpring {
          0% { opacity: 0; transform: translateY(28px) scale(0.95); }
          70% { opacity: 1; transform: translateY(-4px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes nanaKineticPop {
          0% { opacity: 0; transform: scale(0.6); }
          60% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes nanaPulseGlow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.35); }
          50% { transform: scale(1.03); box-shadow: 0 0 22px 4px rgba(250, 204, 21, 0.55); }
        }
        @keyframes nanaFloatSmooth {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes nanaZoomImpact {
          0% { opacity: 0; transform: scale(1.45); filter: blur(4px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        .nana-anim-slide-up { animation: nanaSlideUpSpring 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .nana-anim-kinetic-pop { animation: nanaKineticPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .nana-anim-pulse-glow { animation: nanaPulseGlow 1.8s ease-in-out infinite; }
        .nana-anim-float { animation: nanaFloatSmooth 2.6s ease-in-out infinite; }
        .nana-anim-zoom-impact { animation: nanaZoomImpact 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Header Studio Pro */}
      <header className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white truncate">Studio de Montage Vidéo Pro</h2>
            <p className="text-[11px] text-slate-400 truncate">
              Motion Design • Animations • Voix DSP (EQ + Anti-Bruit) • Zéro stockage Cloud
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Importer Vidéo</span>
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileImport} className="hidden" />
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            title="Fermer le Studio de Montage"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Corps Principal Responsive */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 pb-12">
          {/* COLONNE GAUCHE : APERÇU VIDÉO LIVE & EXPORT */}
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(['9:16', '1:1', '16:9'] as SocialFormatId[]).map((fmt) => {
                const isSelected = socialFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSocialFormat(fmt);
                      setMaxDurationSec(SOCIAL_FORMATS[fmt].maxRecommendedSec);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 text-xs font-black">
                      {fmt === '9:16' ? <Smartphone className="w-3.5 h-3.5" /> : fmt === '1:1' ? <SquareIcon className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                      <span>{fmt}</span>
                    </div>
                    <span className="block text-[9.5px] text-slate-400 mt-0.5 truncate">
                      {SOCIAL_FORMATS[fmt].subtitle.split('•')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Écran de Prévisualisation Live avec Motion Design & Animation */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 flex flex-col items-center justify-center min-h-[330px] relative">
              {previewUrl ? (
                <div className={`relative w-full ${SOCIAL_FORMATS[socialFormat].aspectClass} bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl mx-auto flex items-center justify-center`}>
                  <video
                    ref={videoPreviewRef}
                    src={previewUrl}
                    crossOrigin="anonymous"
                    controls
                    playsInline
                    onLoadedMetadata={(e) => {
                      const d = Math.round(e.currentTarget.duration || 30);
                      setVideoDuration(d);
                      setMaxDurationSec(Math.min(d, SOCIAL_FORMATS[socialFormat].maxRecommendedSec));
                    }}
                    style={{ filter: chromaConfig.mode === 'none' ? activeFilterCss : undefined }}
                    className={`w-full h-full object-cover ${chromaConfig.mode !== 'none' ? 'opacity-0' : ''}`}
                  />
                  {chromaConfig.mode !== 'none' && (
                    <canvas
                      ref={chromaCanvasRef}
                      onClick={() => {
                        const v = videoPreviewRef.current;
                        if (!v) return;
                        if (v.paused) v.play().catch(() => {});
                        else v.pause();
                      }}
                      className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                      title="Cliquez pour Lecture / Pause (Fond Vert YCbCr + Anti-Spill actif)"
                    />
                  )}

                  {/* Motion Design & Animation Live Overlay */}
                  {(overlayHeadline.trim() || overlayPrice.trim() || overlayContact.trim()) && (
                    <div
                      key={`${motionDesignId}_${motionAnimId}_${animReplayKey}`}
                      className={`pointer-events-none absolute inset-x-3 ${
                        textPosition === 'top' ? 'top-3' : textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-12'
                      }`}
                    >
                      <div className={`${activeMotionPack.wrapperClass} ${activeAnimationPack.animClass} flex items-center gap-2.5`}>
                        {activeMotionPack.accentBar && (
                          <span className="w-1 self-stretch rounded-full bg-gradient-to-b from-amber-400 via-emerald-400 to-indigo-400 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {activeMotionPack.pillTag && (
                              <span className="px-1.5 py-0.5 rounded bg-white text-slate-950 text-[9px] font-black uppercase tracking-wider shrink-0">
                                {activeMotionPack.pillTag}
                              </span>
                            )}
                            {overlayHeadline.trim() && (
                              <span className="font-black text-xs sm:text-sm leading-tight truncate" style={{ color: textColor }}>
                                {overlayHeadline.trim()}
                              </span>
                            )}
                          </div>
                          {(overlayPrice.trim() || overlayContact.trim()) && (
                            <p className="text-[10.5px] font-bold text-white/90 mt-0.5 truncate">
                              {[overlayPrice.trim(), overlayContact.trim()].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-12 px-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 text-center space-y-2 cursor-pointer transition"
                >
                  <Upload className="w-8 h-8 text-indigo-400 mx-auto" />
                  <p className="text-xs font-black text-white">Importer votre vidéo (Flow, Replicate ou téléphone)</p>
                  <p className="text-[11px] text-slate-400">
                    Traitement 100 % local sur votre appareil • Aucun fichier stocké sur le serveur
                  </p>
                </button>
              )}
            </div>

            {encodeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{encodeError}</span>
              </div>
            )}

            {encodeResult && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-black text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Vidéo compilée et téléchargée !</span>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  Format {encodeResult.width}×{encodeResult.height} • Taille finale : {formatBytes(encodeResult.encodedSizeBytes)} ({encodeResult.engine})
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleCompileAndDownload}
              disabled={isEncoding || !previewUrl}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-black shadow-xl flex items-center justify-center gap-2 cursor-pointer transition"
            >
              {isEncoding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encodage vidéo optimisé... ({encodeProgress}%)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Compiler &amp; Télécharger ({socialFormat})</span>
                </>
              )}
            </button>
          </div>

          {/* COLONNE DROITE : 6 ONGLETS COMPLETS */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
              {[
                { id: 'EDIT' as StudioPanelTab, label: 'Montage', icon: Scissors },
                { id: 'MOTION' as StudioPanelTab, label: 'Motion', icon: Layers },
                { id: 'BACKDROP' as StudioPanelTab, label: 'Fond / IA', icon: ImageIcon },
                { id: 'AUDIO' as StudioPanelTab, label: 'Voix DSP', icon: AudioWaveform },
                { id: 'PARTNERS' as StudioPanelTab, label: 'CapCut', icon: Wand2 },
                { id: 'PUBLISH' as StudioPanelTab, label: 'Publier', icon: Share2 }
              ].map((t) => {
                const Icon = t.icon;
                const active = activePanel === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActivePanel(t.id);
                    }}
                    className={`py-2 px-1.5 rounded-xl text-[10.5px] font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                      active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* PANNEAU FOND VERT / FOND BLEU YCbCr + DÉCOR IA GEMINI (SECRET YOUTUBEURS) */}
            {activePanel === 'BACKDROP' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>Suppression &amp; Remplacement d'Arrière-Plan (Chroma Key YCbCr + Gemini IA)</span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Méthode plateau TV / YouTubeurs : découpe chromatique YCbCr + suppression du reflet vert sur la peau (Anti-Spill) pour remplacer votre fond par un décor généré par <strong>Gemini IA</strong> sans jamais dénaturer le présentateur.
                  </p>

                  {/* Sélection du mode Chroma Key */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {([
                      { id: 'none', label: 'Désactivé', desc: 'Fond original' },
                      { id: 'green_screen', label: '🟩 Fond Vert', desc: 'Standard YouTube' },
                      { id: 'blue_screen', label: '🟦 Fond Bleu', desc: 'Plateau TV' },
                      { id: 'custom_color', label: '🎨 Couleur Mur', desc: 'Mur uni perso' }
                    ] as Array<{ id: BackdropKeyMode; label: string; desc: string }>).map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setChromaConfig(c => ({ ...c, mode: m.id }));
                        }}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          chromaConfig.mode === m.id
                            ? 'bg-emerald-600/20 border-emerald-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="block text-xs font-black">{m.label}</span>
                        <span className="block text-[10px] text-slate-400">{m.desc}</span>
                      </button>
                    ))}
                  </div>

                  {chromaConfig.mode === 'custom_color' && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <label className="text-xs font-bold text-slate-300">Couleur exacte à supprimer :</label>
                      <input
                        type="color"
                        value={chromaConfig.keyColorHex}
                        onChange={(e) => setChromaConfig(c => ({ ...c, keyColorHex: e.target.value }))}
                        className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-slate-400">{chromaConfig.keyColorHex}</span>
                    </div>
                  )}
                </div>

                {/* Réglages précis YCbCr + Anti-Spill + Bokeh */}
                {chromaConfig.mode !== 'none' && (
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Tolérance Chroma</span>
                        <span className="font-mono font-bold text-emerald-300">{Math.round(chromaConfig.similarity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.15}
                        max={0.65}
                        step={0.01}
                        value={chromaConfig.similarity}
                        onChange={(e) => setChromaConfig(c => ({ ...c, similarity: Number(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Douceur contours / cheveux</span>
                        <span className="font-mono font-bold text-indigo-300">{Math.round(chromaConfig.smoothness * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.02}
                        max={0.30}
                        step={0.01}
                        value={chromaConfig.smoothness}
                        onChange={(e) => setChromaConfig(c => ({ ...c, smoothness: Number(e.target.value) }))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Anti-Spill (zéro halo vert)</span>
                        <span className="font-mono font-bold text-amber-300">{Math.round(chromaConfig.spillSuppression * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={chromaConfig.spillSuppression}
                        onChange={(e) => setChromaConfig(c => ({ ...c, spillSuppression: Number(e.target.value) }))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Flou Bokeh du décor</span>
                        <span className="font-mono font-bold text-sky-300">{chromaConfig.bgBlurPx} px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={12}
                        step={1}
                        value={chromaConfig.bgBlurPx}
                        onChange={(e) => setChromaConfig(c => ({ ...c, bgBlurPx: Number(e.target.value) }))}
                        className="w-full accent-sky-500"
                      />
                    </div>
                  </div>
                )}

                {/* Générateur de Décor d'Arrière-Plan par IA Gemini */}
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/35 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Générer un Arrière-Plan sur-mesure avec Gemini IA</span>
                    </h4>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={geminiBackdropPrompt}
                      onChange={(e) => setGeminiBackdropPrompt(e.target.value)}
                      placeholder="Ex: Studio YouTube moderne avec néons bleus, étagères design et éclairage doux..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateGeminiBackdrop}
                      disabled={isGeneratingBackdrop}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-60 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isGeneratingBackdrop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{isGeneratingBackdrop ? 'Création...' : 'Générer Décor IA'}</span>
                    </button>
                  </div>
                  {backdropStatusMsg && (
                    <p className="text-[11px] text-emerald-300 font-semibold">{backdropStatusMsg}</p>
                  )}
                </div>

                {/* Décors Studio prêts en 1 clic + Import Photo Perso */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white">Décors YouTubeurs &amp; Studio Prêts en 1 Clic</h4>
                    <button
                      type="button"
                      onClick={() => bgFileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Ma photo</span>
                    </button>
                    <input ref={bgFileInputRef} type="file" accept="image/*" onChange={handleCustomBgImport} className="hidden" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STUDIO_BACKDROP_PRESETS.map(preset => {
                      const active = !customBackdropUrl && selectedBackdropId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setCustomBackdropUrl('');
                            setSelectedBackdropId(preset.id);
                            if (chromaConfig.mode === 'none') {
                              setChromaConfig(c => ({ ...c, mode: 'green_screen' }));
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                            active
                              ? 'bg-indigo-950/60 border-indigo-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className="block text-[10px] font-bold text-amber-300">{preset.badge}</span>
                          <span className="block text-xs font-black truncate">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PANNEAU 1 : MONTAGE (TRIM, TEXTE COMMERCIAL, FILTRES) */}
            {activePanel === 'EDIT' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-indigo-400" />
                      <span>Durée maximale à exporter (Trim)</span>
                    </span>
                    <span className="font-mono font-black text-emerald-400">{maxDurationSec}s / {videoDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={Math.max(10, videoDuration)}
                    value={maxDurationSec}
                    onChange={(e) => setMaxDurationSec(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  {socialFormat === '9:16' && maxDurationSec > 30 && (
                    <p className="text-[11px] text-amber-300">
                      💡 Astuce Statut WhatsApp : limitez à 30 secondes pour éviter une coupure automatique.
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-amber-400" />
                    <span>Habillage Commercial incrusté dans la vidéo</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={overlayHeadline}
                      onChange={(e) => setOverlayHeadline(e.target.value)}
                      placeholder="Accroche (ex: 🔥 PROMO FLASH -30%)"
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={overlayPrice}
                      onChange={(e) => setOverlayPrice(e.target.value)}
                      placeholder="Prix FCFA (ex: 15 000 FCFA)"
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={overlayContact}
                    onChange={(e) => setOverlayContact(e.target.value)}
                    placeholder="Contact / WhatsApp (ex: 📲 +226 70 00 00 00)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Position :</span>
                      {(['top', 'center', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setTextPosition(pos)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            textPosition === pos ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {pos === 'top' ? 'Haut' : pos === 'center' ? 'Centre' : 'Bas'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Couleur :</span>
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTextColor(c.id)}
                          className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                            textColor === c.id ? 'border-white scale-110' : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: c.id }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-800">
                  <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span>Filtre Visuel Pro</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFilterId(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition ${
                          selectedFilterId === f.id
                            ? 'bg-emerald-600/20 border-emerald-400 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PANNEAU 2 : PACK MOTION DESIGN MODERNE & PACK ANIMATIONS MODERNES */}
            {activePanel === 'MOTION' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                {/* Pack Motion Design */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Pack Motion Design Moderne (6 Habillages Pro)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setAnimReplayKey(k => k + 1);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10.5px] font-bold text-indigo-300 cursor-pointer"
                    >
                      ▶ Rejouer l'animation
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {MOTION_DESIGN_PACK.map((pack) => {
                      const active = motionDesignId === pack.id;
                      return (
                        <button
                          key={pack.id}
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setMotionDesignId(pack.id);
                            setAnimReplayKey(k => k + 1);
                          }}
                          className={`text-left p-3.5 rounded-2xl border transition cursor-pointer space-y-1 ${
                            active
                              ? 'bg-indigo-950/60 border-indigo-400 shadow-lg'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-white">{pack.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9.5px] font-bold text-slate-200">
                              {pack.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{pack.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pack Animations Modernes */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Pack Animations Modernes (Entrées &amp; Effets Live)</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ANIMATION_PACK.map((anim) => {
                      const active = motionAnimId === anim.id;
                      return (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setMotionAnimId(anim.id);
                            setAnimReplayKey(k => k + 1);
                          }}
                          className={`text-left p-3 rounded-2xl border transition cursor-pointer space-y-1 ${
                            active
                              ? 'bg-amber-500/15 border-amber-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black truncate">{anim.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                              {anim.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug">{anim.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PANNEAU 3 : AUDIO & VOIX DSP (ÉGALISEUR 3 BANDES + SUPPRESSION DE BRUIT + AMÉLIORATION VOIX) */}
            {activePanel === 'AUDIO' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                {/* Enregistreur / Import Voix Off */}
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Mic className="w-4 h-4 text-rose-400" />
                        <span>Studio Voix Off &amp; Traitement DSP Réel</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Enregistrez votre voix ou importez un audio, puis appliquez l'anti-bruit, l'EQ 3 bandes et l'amélioration Broadcast.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => voiceFileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Audio</span>
                      </button>
                      <input ref={voiceFileInputRef} type="file" accept="audio/*" onChange={handleAudioFileImport} className="hidden" />
                      <button
                        type="button"
                        onClick={handleToggleVoiceRecord}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                          isRecordingVoice
                            ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {isRecordingVoice ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        <span>{isRecordingVoice ? 'Arrêter' : 'Enregistrer'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Préréglages Studio */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-indigo-500/20">
                    {Object.entries(VOICE_EQ_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setActiveEqPreset(key);
                          setDspSettings(preset.settings);
                        }}
                        className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                          activeEqPreset === key
                            ? 'bg-indigo-600/30 border-indigo-400 text-white'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="block text-[10.5px] font-black truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Toggles Suppression de bruit & Amélioration de Voix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDspSettings(s => ({ ...s, noiseReduction: !s.noiseReduction }))}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition ${
                        dspSettings.noiseReduction
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-black block">🔇 Suppression de Bruit</span>
                        <span className="text-[10px] opacity-80">Coupe souffle, vent 85Hz &amp; Noise Gate</span>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-black/30">
                        {dspSettings.noiseReduction ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDspSettings(s => ({ ...s, voiceEnhance: !s.voiceEnhance }))}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition ${
                        dspSettings.voiceEnhance
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-black block">✨ Amélioration Voix Studio</span>
                        <span className="text-[10px] opacity-80">Compresseur Broadcast + Présence 3.2kHz</span>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-black/30">
                        {dspSettings.voiceEnhance ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  {/* Égaliseur de Voix 3 Bandes (Graves / Médiums / Aigus) */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                      <Volume2 className="w-4 h-4 text-indigo-400" />
                      <span>Égaliseur de Voix 3 Bandes (EQ Studio)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Graves (180Hz)</span>
                          <span className="font-mono font-bold text-indigo-300">{dspSettings.eqBassDb >= 0 ? '+' : ''}{dspSettings.eqBassDb} dB</span>
                        </div>
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={0.5}
                          value={dspSettings.eqBassDb}
                          onChange={(e) => setDspSettings(s => ({ ...s, eqBassDb: Number(e.target.value) }))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Médiums (1.8kHz)</span>
                          <span className="font-mono font-bold text-emerald-300">{dspSettings.eqMidDb >= 0 ? '+' : ''}{dspSettings.eqMidDb} dB</span>
                        </div>
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={0.5}
                          value={dspSettings.eqMidDb}
                          onChange={(e) => setDspSettings(s => ({ ...s, eqMidDb: Number(e.target.value) }))}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Aigus (5.5kHz)</span>
                          <span className="font-mono font-bold text-amber-300">{dspSettings.eqTrebleDb >= 0 ? '+' : ''}{dspSettings.eqTrebleDb} dB</span>
                        </div>
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={0.5}
                          value={dspSettings.eqTrebleDb}
                          onChange={(e) => setDspSettings(s => ({ ...s, eqTrebleDb: Number(e.target.value) }))}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bouton Traitement DSP + Comparaison Original vs Améliorée */}
                  {rawVoiceBlob && (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={handleRunVoiceDsp}
                        disabled={isProcessingDsp}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isProcessingDsp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>{isProcessingDsp ? 'Traitement DSP en cours...' : 'Appliquer DSP Studio (Anti-Bruit + EQ + Broadcast)'}</span>
                      </button>

                      {dspStatusMsg && (
                        <p className="text-[11px] text-emerald-300 font-semibold">{dspStatusMsg}</p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {rawVoiceUrl && (
                          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Voix Originale</span>
                            <audio controls src={rawVoiceUrl} className="h-8 w-full" />
                          </div>
                        )}
                        {enhancedVoiceUrl && (
                          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-emerald-300 uppercase">Voix Améliorée (WAV Studio)</span>
                              <a
                                href={enhancedVoiceUrl}
                                download={`voix-studio-dsp-${Date.now()}.wav`}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>WAV</span>
                              </a>
                            </div>
                            <audio controls src={enhancedVoiceUrl} className="h-8 w-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bibliothèque Audio */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-emerald-400" />
                    <span>Pistes Musiques &amp; Effets Sonores (Libres de droits)</span>
                  </h3>
                  <div className="space-y-2">
                    {PRO_AUDIO_LIBRARY.map((track) => (
                      <div key={track.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleAudioTrack(track)}
                            className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition"
                          >
                            {playingTrackId === track.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{track.title}</p>
                            <p className="text-[10px] text-slate-400">{track.category} • {track.duration}</p>
                          </div>
                        </div>
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 shrink-0"
                        >
                          <Download className="w-3 h-3" />
                          <span>MP3</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PANNEAU 4 : PASSERELLES PARTENAIRES (CAPCUT + CANVA + CLIPCHAMP) */}
            {activePanel === 'PARTNERS' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Éditeurs Partenaires Multi-Pistes</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Téléchargez vos essais vidéo + votre voix off WAV améliorée, puis ouvrez directement votre éditeur favori.
                  </p>
                </div>

                <div className="space-y-3">
                  {PARTNER_EDITORS.map((partner) => (
                    <div
                      key={partner.id}
                      className={`p-4 rounded-2xl bg-gradient-to-r ${partner.color} border flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-white">{partner.name}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-slate-200">
                            {partner.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{partner.desc}</p>
                      </div>
                      <a
                        href={partner.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          playTapBeep();
                          if (combinedOverlayText) {
                            navigator.clipboard?.writeText(combinedOverlayText).catch(() => {});
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-slate-200 text-xs font-black flex items-center justify-center gap-1.5 shrink-0 transition"
                      >
                        <span>Ouvrir</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PANNEAU 5 : KIT PUBLICATION RÉSEAUX SOCIAUX */}
            {activePanel === 'PUBLISH' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'tiktok_reels' as SocialNetworkId, label: 'TikTok / Reels' },
                    { id: 'whatsapp_status' as SocialNetworkId, label: 'WhatsApp Statut' },
                    { id: 'facebook_youtube' as SocialNetworkId, label: 'Facebook / YouTube' }
                  ].map((net) => (
                    <button
                      key={net.id}
                      type="button"
                      onClick={() => setTargetNetwork(net.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer ${
                        targetNetwork === net.id
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {net.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Légende &amp; Hashtags prêts à publier</label>
                  <textarea
                    readOnly
                    rows={7}
                    value={generatedSocialPost}
                    className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(generatedSocialPost).catch(() => {});
                      playValidationBeep();
                      setCopiedPost(true);
                      setTimeout(() => setCopiedPost(false), 2500);
                    }}
                    className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedPost ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPost ? 'Légende copiée ✓' : 'Copier toute la légende'}</span>
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(generatedSocialPost)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Partager sur WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialVideoMontageStudio;
