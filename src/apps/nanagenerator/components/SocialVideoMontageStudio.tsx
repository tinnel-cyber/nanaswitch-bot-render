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
  Image as ImageIcon,
  Subtitles,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  VolumeX,
  ChevronLeft,
  ChevronRight
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
import {
  SubtitleCue,
  SubtitleTemplateId,
  SUBTITLE_TEXT_TEMPLATES,
  generateTimedSubtitlesFromScript,
  exportSubtitlesToSrt,
  exportSubtitlesToVtt,
  downloadSubtitleFile,
  autoTranscribeBlobToSubtitles
} from '../../../services/subtitleStudioService';
import {
  TimelineClip,
  VisualOverlayLayer,
  getClipOutputDuration,
  getTotalTimelineDuration,
  splitClipAtTime,
  deleteClipFromTimeline,
  duplicateClipInTimeline,
  moveClipInTimeline,
  updateClipInTimeline,
  exportTimelineToVideoBlob
} from '../../../services/videoTimelineService';
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
type ExportResolutionId = '480p' | '720p' | '1080p';
type ExportContainerId = 'mp4' | 'webm';
type StudioPanelTab = 'EDIT' | 'SUBTITLES' | 'MOTION' | 'BACKDROP' | 'AUDIO' | 'PARTNERS' | 'PUBLISH';
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

  // Zéro élément superposé par défaut : l'utilisateur choisit librement quoi ajouter et retirer
  const [overlayHeadline, setOverlayHeadline] = useState<string>('');
  const [overlayPrice, setOverlayPrice] = useState<string>('');
  const [overlayContact, setOverlayContact] = useState<string>('');
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

  // Paramètres d'Export Vidéo Complets (Résolutions 480p/720p/1080p + MP4/WebM)
  const [exportResolution, setExportResolution] = useState<ExportResolutionId>('720p');
  const [exportContainer, setExportContainer] = useState<ExportContainerId>('mp4');

  // Émetteur de Sous-Titres Automatique & Modèles de Textes Viraux
  const [subtitleScript, setSubtitleScript] = useState<string>(
    initialHeadline ? `${initialHeadline}. Commandez maintenant avec livraison rapide !` : ''
  );
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleTemplateId, setSubtitleTemplateId] = useState<SubtitleTemplateId>('hormozi_viral');
  const [subtitleCustomColor, setSubtitleCustomColor] = useState<string>('');
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [isAutoTranscribing, setIsAutoTranscribing] = useState<boolean>(false);
  const [subtitleStatusMsg, setSubtitleStatusMsg] = useState<string | null>(null);

  const activeSubtitleTemplate = useMemo(
    () => SUBTITLE_TEXT_TEMPLATES.find(t => t.id === subtitleTemplateId) || SUBTITLE_TEXT_TEMPLATES[0],
    [subtitleTemplateId]
  );

  const resolvedSubtitleColor = subtitleCustomColor || activeSubtitleTemplate.textColor;

  const activeSubtitleCue = useMemo(() => {
    if (subtitleCues.length === 0) return null;
    const matched = subtitleCues.find(c => currentVideoTime >= c.startSec && currentVideoTime <= c.endSec);
    return matched || subtitleCues[0];
  }, [subtitleCues, currentVideoTime]);

  const resolvedExportDimensions = useMemo(() => {
    const baseShort = exportResolution === '480p' ? 480 : exportResolution === '720p' ? 720 : 1080;
    if (socialFormat === '9:16') {
      return { width: baseShort, height: Math.round((baseShort * 16) / 9 / 2) * 2 };
    }
    if (socialFormat === '1:1') {
      return { width: baseShort, height: baseShort };
    }
    // 16:9
    return { width: Math.round((baseShort * 16) / 9 / 2) * 2, height: baseShort };
  }, [exportResolution, socialFormat]);

  const handleGenerateSubtitlesFromScript = () => {
    const textSource = subtitleScript.trim() || [overlayHeadline, overlayPrice, overlayContact].filter(Boolean).join('. ');
    if (!textSource) {
      setEncodeError('Saisissez un script ou texte pour générer automatiquement les sous-titres horodatés.');
      return;
    }
    playValidationBeep();
    const cues = generateTimedSubtitlesFromScript(textSource, maxDurationSec || videoDuration || 30);
    setSubtitleCues(cues);
    setSubtitleStatusMsg(`✅ ${cues.length} sous-titres générés et synchronisés (${maxDurationSec}s) !`);
  };

  const [isLiveDictating, setIsLiveDictating] = useState<boolean>(false);
  const speechRecognitionRef = useRef<any>(null);

  const handleToggleLiveDictation = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setEncodeError('La dictée vocale directe n\'est pas supportée sur ce navigateur. Utilisez « Auto-Transcrire Audio » ou tapez votre texte.');
      return;
    }

    if (isLiveDictating && speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      setIsLiveDictating(false);
      return;
    }

    playTapBeep();
    setEncodeError(null);
    const rec = new SpeechRec();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    speechRecognitionRef.current = rec;

    let finalTranscript = subtitleScript.trim();
    rec.onstart = () => {
      setIsLiveDictating(true);
      setSubtitleStatusMsg('🎙️ Dictée micro en cours... Parlez clairement (cliquez sur Arrêter quand terminé).');
    };
    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript = [finalTranscript, piece.trim()].filter(Boolean).join(' ');
        } else {
          interim += piece;
        }
      }
      const liveText = [finalTranscript, interim.trim()].filter(Boolean).join(' ').trim();
      setSubtitleScript(liveText);
      if (liveText) {
        const cues = generateTimedSubtitlesFromScript(liveText, videoDuration || maxDurationSec || 30);
        setSubtitleCues(cues);
      }
    };
    rec.onerror = (ev: any) => {
      setIsLiveDictating(false);
      if (ev?.error !== 'aborted') {
        setEncodeError(`Erreur dictée micro : ${ev?.error || 'autorisation micro refusée'}.`);
      }
    };
    rec.onend = () => {
      setIsLiveDictating(false);
      if (finalTranscript.trim()) {
        const cues = generateTimedSubtitlesFromScript(finalTranscript, videoDuration || maxDurationSec || 30);
        setSubtitleCues(cues);
        setSubtitleStatusMsg(`✅ ${cues.length} sous-titres dictés et synchronisés !`);
        playValidationBeep();
      }
    };
    try {
      rec.start();
    } catch {
      setIsLiveDictating(false);
    }
  };

  const handleAutoTranscribeVoice = async () => {
    let blobToTranscribe: Blob | null = rawVoiceBlob || sourceFile;
    if (!blobToTranscribe && previewUrl) {
      try {
        setIsAutoTranscribing(true);
        setSubtitleStatusMsg('Extraction de la piste audio de la vidéo...');
        const fetched = await fetch(previewUrl);
        if (fetched.ok) blobToTranscribe = await fetched.blob();
      } catch {}
    }
    if (!blobToTranscribe) {
      setIsAutoTranscribing(false);
      setEncodeError('Importez une vidéo ou enregistrez une voix off (onglet Voix DSP) pour la transcription automatique.');
      return;
    }
    setIsAutoTranscribing(true);
    setEncodeError(null);
    setSubtitleStatusMsg('Extraction audio WAV légère + Transcription automatique IA en cours...');
    try {
      const result = await autoTranscribeBlobToSubtitles(blobToTranscribe, videoDuration || maxDurationSec || 30);
      setSubtitleScript(result.text);
      setSubtitleCues(result.cues);
      playValidationBeep();
      setSubtitleStatusMsg(`✅ ${result.cues.length} sous-titres transcrits automatiquement et affichés sur la vidéo !`);
    } catch (err: any) {
      playCancelSound();
      setSubtitleStatusMsg(null);
      setEncodeError(err?.message || 'Erreur lors de la transcription automatique.');
    } finally {
      setIsAutoTranscribing(false);
    }
  };

  // =========================================================================
  // TIMELINE DE MONTAGE PRO (CUT, SUPPRESSION, MULTI-CLIPS, VITESSE, MUTE, UNDO/REDO)
  // =========================================================================
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string>('');
  const [historyPast, setHistoryPast] = useState<TimelineClip[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<TimelineClip[][]>([]);
  const [timelineNotice, setTimelineNotice] = useState<string | null>(null);
  const addClipInputRef = useRef<HTMLInputElement | null>(null);

  const selectedClip = useMemo(
    () => timelineClips.find(c => c.id === selectedClipId) || timelineClips[0] || null,
    [timelineClips, selectedClipId]
  );

  const totalTimelineSec = useMemo(
    () => getTotalTimelineDuration(timelineClips),
    [timelineClips]
  );

  const pushTimelineState = (nextClips: TimelineClip[], nextSelectedId?: string, notice?: string) => {
    setHistoryPast(prev => [...prev.slice(-24), timelineClips]);
    setHistoryFuture([]);
    setTimelineClips(nextClips);
    if (nextSelectedId !== undefined) {
      setSelectedClipId(nextSelectedId);
    } else if (nextClips.length > 0 && !nextClips.some(c => c.id === selectedClipId)) {
      setSelectedClipId(nextClips[0].id);
    }
    if (notice) {
      setTimelineNotice(notice);
      setTimeout(() => setTimelineNotice(prev => (prev === notice ? null : prev)), 3000);
    }
  };

  const handleUndoTimeline = () => {
    if (historyPast.length === 0) return;
    playTapBeep();
    const previous = historyPast[historyPast.length - 1];
    setHistoryFuture(f => [timelineClips, ...f.slice(0, 24)]);
    setHistoryPast(p => p.slice(0, -1));
    setTimelineClips(previous);
    if (previous[0]) {
      setSelectedClipId(previous[0].id);
      setPreviewUrl(previous[0].sourceUrl);
      setCurrentVideoTime(previous[0].startSec);
    }
  };

  const handleRedoTimeline = () => {
    if (historyFuture.length === 0) return;
    playTapBeep();
    const next = historyFuture[0];
    setHistoryPast(p => [...p.slice(-24), timelineClips]);
    setHistoryFuture(f => f.slice(1));
    setTimelineClips(next);
    if (next[0]) {
      setSelectedClipId(next[0].id);
      setPreviewUrl(next[0].sourceUrl);
      setCurrentVideoTime(next[0].startSec);
    } else {
      setSelectedClipId('');
      setPreviewUrl('');
    }
  };

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleSelectClip = (clip: TimelineClip, autoPlay = false) => {
    playTapBeep();
    setSelectedClipId(clip.id);
    setCurrentVideoTime(clip.startSec);
    const switchingSrc = previewUrl !== clip.sourceUrl;
    if (switchingSrc) {
      setPreviewUrl(clip.sourceUrl);
    }
    const applySeek = () => {
      const v = videoPreviewRef.current;
      if (!v) return;
      try {
        v.playbackRate = clip.speed || 1;
        v.muted = clip.muted;
        v.currentTime = clip.startSec;
        if (autoPlay) {
          v.play().catch(() => {});
        }
      } catch {}
    };
    if (switchingSrc) {
      setTimeout(applySeek, 90);
    } else {
      applySeek();
    }
  };

  const handleScrubPlayhead = (targetSec: number) => {
    const clamped = Math.max(0, Number(targetSec.toFixed(2)));
    setCurrentVideoTime(clamped);
    const v = videoPreviewRef.current;
    if (v) {
      try {
        v.currentTime = clamped;
      } catch {}
    }
    // Sélectionner automatiquement le clip qui contient cette position sur la même source
    const matching = timelineClips.find(
      c => c.sourceUrl === previewUrl && clamped >= c.startSec && clamped <= c.endSec
    );
    if (matching && matching.id !== selectedClipId) {
      setSelectedClipId(matching.id);
    }
  };

  const handlePlayFullTimeline = () => {
    const v = videoPreviewRef.current;
    if (!v || timelineClips.length === 0) return;
    if (!v.paused) {
      v.pause();
      setIsVideoPlaying(false);
      return;
    }
    const first = timelineClips[0];
    handleSelectClip(first, true);
    setIsVideoPlaying(true);
    setTimelineNotice(`▶ Lecture de la timeline (${timelineClips.length} segment${timelineClips.length > 1 ? 's' : ''}, passages supprimés ignorés).`);
  };

  const handleSplitAtPlayhead = () => {
    if (!selectedClip) return;
    const rawPlayhead = videoPreviewRef.current?.currentTime ?? currentVideoTime;
    // 1. Trouver le clip sous la tête de lecture (priorité au clip sélectionné, sinon le clip contenant le playhead)
    let targetClip = selectedClip;
    if (rawPlayhead <= targetClip.startSec + 0.3 || rawPlayhead >= targetClip.endSec - 0.3) {
      const underPlayhead = timelineClips.find(
        c =>
          c.sourceUrl === previewUrl &&
          rawPlayhead > c.startSec + 0.3 &&
          rawPlayhead < c.endSec - 0.3
      );
      if (underPlayhead) {
        targetClip = underPlayhead;
      }
    }

    // 2. Si le playhead est exactement au bord (ex: 0.0s), couper intelligemment au milieu du clip sélectionné
    let cutPoint = rawPlayhead;
    let usedMidpoint = false;
    if (cutPoint <= targetClip.startSec + 0.3 || cutPoint >= targetClip.endSec - 0.3) {
      const dur = targetClip.endSec - targetClip.startSec;
      if (dur < 0.7) {
        setTimelineNotice('⚠️ Segment trop court (< 0.7s) pour être coupé davantage.');
        playCancelSound();
        return;
      }
      cutPoint = Number(((targetClip.startSec + targetClip.endSec) / 2).toFixed(2));
      usedMidpoint = true;
    }

    const { clips: nextClips, rightClipId } = splitClipAtTime(timelineClips, targetClip.id, cutPoint);
    if (!rightClipId) {
      setTimelineNotice('⚠️ Impossible de couper ici. Déplacez le curseur de lecture à l\'intérieur du clip.');
      playCancelSound();
      return;
    }
    playValidationBeep();
    setCurrentVideoTime(cutPoint);
    if (videoPreviewRef.current) {
      try {
        videoPreviewRef.current.currentTime = cutPoint;
      } catch {}
    }
    pushTimelineState(
      nextClips,
      rightClipId,
      usedMidpoint
        ? `✂️ Cut effectué au milieu (${cutPoint.toFixed(1)}s) — 2 segments créés. Cliquez sur 🗑️ pour supprimer un passage.`
        : `✂️ Cut effectué à ${cutPoint.toFixed(1)}s — 2 segments créés.`
    );
  };

  const handleDeleteSelectedClip = (clipIdToDelete?: string) => {
    const target = clipIdToDelete
      ? timelineClips.find(c => c.id === clipIdToDelete) || selectedClip
      : selectedClip;
    if (!target) return;

    const deletedIdx = timelineClips.findIndex(c => c.id === target.id);
    if (timelineClips.length <= 1) {
      // Permettre de vider le clip unique (récupérable via Annuler / Undo)
      playTapBeep();
      pushTimelineState([], '', `🗑️ Segment "${target.label}" supprimé. Cliquez sur ↩️ Annuler pour le restaurer ou importez une vidéo.`);
      setPreviewUrl('');
      setSourceFile(null);
      setCurrentVideoTime(0);
      setIsVideoPlaying(false);
      return;
    }

    playTapBeep();
    const nextClips = deleteClipFromTimeline(timelineClips, target.id);
    const nextSelected = nextClips[Math.min(deletedIdx, nextClips.length - 1)] || nextClips[0];
    pushTimelineState(
      nextClips,
      nextSelected?.id || '',
      `🗑️ Segment "${target.label}" supprimé (${nextClips.length} segment${nextClips.length > 1 ? 's' : ''} restant${nextClips.length > 1 ? 's' : ''}).`
    );
    if (nextSelected) {
      const switching = previewUrl !== nextSelected.sourceUrl;
      if (switching) setPreviewUrl(nextSelected.sourceUrl);
      setCurrentVideoTime(nextSelected.startSec);
      const seekRemaining = () => {
        const v = videoPreviewRef.current;
        if (!v) return;
        try {
          v.pause();
          v.playbackRate = nextSelected.speed || 1;
          v.muted = nextSelected.muted;
          v.currentTime = nextSelected.startSec;
        } catch {}
      };
      if (switching) setTimeout(seekRemaining, 90);
      else seekRemaining();
    }
  };

  const handleDuplicateSelectedClip = () => {
    if (!selectedClip) return;
    playTapBeep();
    const { clips: nextClips, newClipId } = duplicateClipInTimeline(timelineClips, selectedClip.id);
    if (newClipId) {
      pushTimelineState(nextClips, newClipId, `📋 Clip dupliqué sur la timeline.`);
    }
  };

  const handleMoveSelectedClip = (dir: 'left' | 'right') => {
    if (!selectedClip) return;
    playTapBeep();
    const nextClips = moveClipInTimeline(timelineClips, selectedClip.id, dir);
    pushTimelineState(nextClips, selectedClip.id);
  };

  // =========================================================================
  // PISTE AUDIO DÉTACHABLE DE LA TIMELINE (EXTRACTION AUDIO WAV + WAVEFORM)
  // =========================================================================
  const [extractedAudioBlob, setExtractedAudioBlob] = useState<Blob | null>(null);
  const [extractedAudioUrl, setExtractedAudioUrl] = useState<string>('');
  const [extractedAudioDuration, setExtractedAudioDuration] = useState<number>(0);
  const [extractedAudioPeaks, setExtractedAudioPeaks] = useState<number[]>([]);
  const [extractedAudioMuted, setExtractedAudioMuted] = useState<boolean>(false);
  const [extractedAudioVolume, setExtractedAudioVolume] = useState<number>(1);
  const [isExtractingAudio, setIsExtractingAudio] = useState<boolean>(false);
  const [isPlayingExtractedAudio, setIsPlayingExtractedAudio] = useState<boolean>(false);
  const extractedAudioRef = useRef<HTMLAudioElement | null>(null);

  const encodeAudioBufferToWavBlob = (audioBuffer: AudioBuffer): Blob => {
    const numChannels = Math.min(2, audioBuffer.numberOfChannels || 1);
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (off: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) channels.push(audioBuffer.getChannelData(c));
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const handleExtractAudioFromVideo = async () => {
    const targetClip = selectedClip || timelineClips[0];
    let mediaBlob: Blob | null = targetClip?.sourceFile || sourceFile || null;
    if (!mediaBlob && (targetClip?.sourceUrl || previewUrl)) {
      try {
        setIsExtractingAudio(true);
        const res = await fetch(targetClip?.sourceUrl || previewUrl);
        if (res.ok) mediaBlob = await res.blob();
      } catch {}
    }
    if (!mediaBlob) {
      setIsExtractingAudio(false);
      setTimelineNotice('⚠️ Importez d\'abord une vidéo pour extraire sa piste audio.');
      playCancelSound();
      return;
    }

    setIsExtractingAudio(true);
    setEncodeError(null);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API non supportée par ce navigateur.');
      const arrBuf = await mediaBlob.arrayBuffer();
      const ctx = new AudioCtx();
      const decoded = await ctx.decodeAudioData(arrBuf.slice(0));
      ctx.close().catch(() => {});

      // Calculer 44 barres réelles de forme d'onde (waveform)
      const ch0 = decoded.getChannelData(0);
      const barsCount = 44;
      const step = Math.max(1, Math.floor(ch0.length / barsCount));
      const peaks: number[] = [];
      for (let b = 0; b < barsCount; b++) {
        let maxAmp = 0;
        const start = b * step;
        const end = Math.min(ch0.length, start + step);
        for (let i = start; i < end; i += Math.max(1, Math.floor(step / 120))) {
          const abs = Math.abs(ch0[i]);
          if (abs > maxAmp) maxAmp = abs;
        }
        peaks.push(Math.max(0.14, Math.min(1, maxAmp)));
      }

      const wavBlob = encodeAudioBufferToWavBlob(decoded);
      const wavUrl = URL.createObjectURL(wavBlob);

      setExtractedAudioBlob(wavBlob);
      setExtractedAudioUrl(wavUrl);
      setExtractedAudioDuration(Number(decoded.duration.toFixed(1)));
      setExtractedAudioPeaks(peaks);
      setExtractedAudioMuted(false);
      setExtractedAudioVolume(1);

      // Détacher le son des clips vidéo de cette source pour éviter un double son
      const srcUrl = targetClip?.sourceUrl || previewUrl;
      if (timelineClips.length > 0) {
        const mutedClips = timelineClips.map(c =>
          c.sourceUrl === srcUrl ? { ...c, muted: true } : c
        );
        pushTimelineState(
          mutedClips,
          selectedClip?.id || mutedClips[0]?.id || '',
          `🎵 Piste audio extraite (${decoded.duration.toFixed(1)}s) et détachée de la vidéo !`
        );
        if (videoPreviewRef.current) videoPreviewRef.current.muted = true;
      }
      playValidationBeep();
    } catch (err: any) {
      playCancelSound();
      setTimelineNotice('⚠️ Cette vidéo ne contient pas de piste audio décodable.');
      console.warn('[ExtractAudio] warning:', err?.message);
    } finally {
      setIsExtractingAudio(false);
    }
  };

  const handleTogglePlayExtractedAudio = () => {
    if (!extractedAudioUrl) return;
    if (!extractedAudioRef.current) {
      extractedAudioRef.current = new Audio(extractedAudioUrl);
      extractedAudioRef.current.onended = () => setIsPlayingExtractedAudio(false);
    }
    const a = extractedAudioRef.current;
    if (a.src !== extractedAudioUrl) {
      a.src = extractedAudioUrl;
    }
    a.muted = extractedAudioMuted;
    a.volume = Math.min(1, Math.max(0, extractedAudioVolume));
    if (isPlayingExtractedAudio) {
      a.pause();
      setIsPlayingExtractedAudio(false);
    } else {
      a.play().catch(() => {});
      setIsPlayingExtractedAudio(true);
    }
  };

  const handleSendExtractedAudioToDsp = () => {
    if (!extractedAudioBlob || !extractedAudioUrl) return;
    playValidationBeep();
    setRawVoiceBlob(extractedAudioBlob);
    setRawVoiceUrl(extractedAudioUrl);
    setEnhancedVoiceUrl(null);
    setDspStatusMsg('🎵 Audio extrait chargé ! Réglez l\'Égaliseur / Anti-Bruit puis cliquez sur « Appliquer DSP Studio ».');
    setActivePanel('AUDIO');
  };

  const handleDownloadExtractedAudio = () => {
    if (!extractedAudioUrl) return;
    playTapBeep();
    const a = document.createElement('a');
    a.href = extractedAudioUrl;
    a.download = `nana-audio-extrait-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteExtractedAudio = () => {
    playTapBeep();
    if (extractedAudioRef.current) {
      extractedAudioRef.current.pause();
    }
    setIsPlayingExtractedAudio(false);
    setExtractedAudioBlob(null);
    setExtractedAudioUrl('');
    setExtractedAudioDuration(0);
    setExtractedAudioPeaks([]);
    setTimelineNotice('🗑️ Piste audio détachée supprimée de la timeline.');
  };

  const handleAddExtraClip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playValidationBeep();
    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const dur = Math.max(1, Number((probe.duration || 10).toFixed(2)));
      const newId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      const newClip: TimelineClip = {
        id: newId,
        label: `Clip ${timelineClips.length + 1}`,
        sourceUrl: url,
        sourceFile: file,
        startSec: 0,
        endSec: dur,
        sourceDurationSec: dur,
        speed: 1,
        muted: false
      };
      pushTimelineState([...timelineClips, newClip], newId, `➕ "${file.name}" ajouté à la timeline (${dur}s).`);
    };
    probe.src = url;
    e.target.value = '';
  };

  // Initialise automatiquement le Clip 1 quand une vidéo source arrive
  useEffect(() => {
    if (previewUrl && timelineClips.length === 0) {
      const initDur = Math.max(1, videoDuration || 30);
      const id = `clip_main_${Date.now()}`;
      setTimelineClips([
        {
          id,
          label: 'Clip 1',
          sourceUrl: previewUrl,
          sourceFile,
          startSec: 0,
          endSec: initDur,
          sourceDurationSec: initDur,
          speed: 1,
          muted: false
        }
      ]);
      setSelectedClipId(id);
    }
  }, [previewUrl, sourceFile, videoDuration, timelineClips.length]);

  // =========================================================================
  // CALQUES VISUELS SUPERPOSÉS (LOGOS, IMAGES PiP, STICKERS REDIMENSIONNABLES)
  // =========================================================================
  const [visualLayers, setVisualLayers] = useState<VisualOverlayLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const overlayImageInputRef = useRef<HTMLInputElement | null>(null);

  const selectedVisualLayer = useMemo(
    () => visualLayers.find(l => l.id === selectedLayerId) || visualLayers[0] || null,
    [visualLayers, selectedLayerId]
  );

  const handleImportOverlayImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playValidationBeep();
    const url = URL.createObjectURL(file);
    const id = `layer_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const newLayer: VisualOverlayLayer = {
      id,
      kind: 'image',
      label: file.name.replace(/\.[^/.]+$/, '').slice(0, 18) || 'Logo / Image',
      imageUrl: url,
      xPct: 82, // Coin Haut-Droite par défaut (style logo YouTubeur / TV)
      yPct: 14,
      sizePct: 24,
      opacity: 1,
      shape: 'rounded',
      rotationDeg: 0
    };
    setVisualLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(id);
    e.target.value = '';
  };

  const handleAddPresetSticker = (badgeText: string, badgeBg: string) => {
    playTapBeep();
    const id = `badge_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const newLayer: VisualOverlayLayer = {
      id,
      kind: 'badge',
      label: badgeText,
      badgeText,
      badgeBg,
      xPct: 24, // Coin Haut-Gauche par défaut
      yPct: 14,
      sizePct: 32,
      opacity: 1,
      shape: 'rounded',
      rotationDeg: 0
    };
    setVisualLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(id);
  };

  const handleUpdateVisualLayer = (layerId: string, patch: Partial<VisualOverlayLayer>) => {
    setVisualLayers(prev => prev.map(l => (l.id === layerId ? { ...l, ...patch } : l)));
  };

  const handleDeleteVisualLayer = (layerId: string) => {
    playTapBeep();
    setVisualLayers(prev => {
      const next = prev.filter(l => l.id !== layerId);
      if (selectedLayerId === layerId) {
        setSelectedLayerId(next[0]?.id || '');
      }
      return next;
    });
  };

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
    setTimelineClips([]);
    setSelectedClipId('');
    setHistoryPast([]);
    setHistoryFuture([]);
    setCurrentVideoTime(0);
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

    // Si la timeline, un texte, des sous-titres, un filtre ou des calques visuels sont actifs -> rendu Canvas complet (couleurs & textes garantis)
    const isTimelineEdited =
      visualLayers.length > 0 ||
      Boolean(combinedOverlayText) ||
      subtitleCues.length > 0 ||
      Boolean(activeFilterCss) ||
      timelineClips.length > 1 ||
      (timelineClips.length === 1 &&
        (timelineClips[0].startSec > 0.1 ||
          timelineClips[0].endSec < timelineClips[0].sourceDurationSec - 0.1 ||
          timelineClips[0].speed !== 1 ||
          timelineClips[0].muted));

    if (isTimelineEdited && timelineClips.length > 0) {
      try {
        const assembled = await exportTimelineToVideoBlob(timelineClips, {
          width: resolvedExportDimensions.width,
          height: resolvedExportDimensions.height,
          filterCss: activeFilterCss || undefined,
          overlayText: combinedOverlayText || undefined,
          overlayPosition: textPosition,
          overlayColor: textColor,
          subtitles: subtitleCues,
          subtitleColor: resolvedSubtitleColor,
          visualLayers,
          onProgress: (pct) => setEncodeProgress(pct)
        });

        const ext = exportContainer === 'mp4' ? 'mp4' : 'webm';
        const outFile = new File(
          [assembled.blob],
          `nana-timeline-${socialFormat.replace(':', 'x')}-${exportResolution}-${Date.now()}.${ext}`,
          { type: assembled.mimeType }
        );
        setEncodeProgress(100);
        setEncodeResult({
          file: outFile,
          originalSizeBytes: inputBlob.size,
          encodedSizeBytes: outFile.size,
          savingsPercent: 0,
          durationSec: assembled.durationSec,
          width: resolvedExportDimensions.width,
          height: resolvedExportDimensions.height,
          elapsedMs: Math.round(assembled.durationSec * 1000),
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
      } catch (tlErr: any) {
        playCancelSound();
        setEncodeError(tlErr?.message || 'Erreur lors de l\'assemblage de la timeline.');
        setIsEncoding(false);
        return;
      }
    }

    try {
      const overlayTextForExport =
        combinedOverlayText ||
        (activeSubtitleCue?.text ? activeSubtitleCue.text : undefined);

      const result = await encodeVideo(inputBlob, {
        preset: exportResolution === '480p' ? 'chat' : 'reel',
        targetWidth: resolvedExportDimensions.width,
        targetHeight: resolvedExportDimensions.height,
        maxDurationSec,
        overlay: {
          filterCss: activeFilterCss || undefined,
          text: overlayTextForExport,
          textPosition,
          textColor: activeSubtitleCue && !combinedOverlayText ? resolvedSubtitleColor : textColor
        },
        onProgress: (pct) => setEncodeProgress(Math.min(99, Math.max(10, Math.round(pct))))
      });

      setEncodeProgress(100);
      setEncodeResult(result);
      playValidationBeep();

      const ext = exportContainer === 'webm' ? 'webm' : 'mp4';
      const dlUrl = URL.createObjectURL(result.file);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `nana-montage-${socialFormat.replace(':', 'x')}-${exportResolution}-${Date.now()}.${ext}`;
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
                      const d = Math.max(1, Number((e.currentTarget.duration || 30).toFixed(2)));
                      setVideoDuration(Math.round(d));
                      setMaxDurationSec(Math.min(Math.round(d), SOCIAL_FORMATS[socialFormat].maxRecommendedSec));
                      setTimelineClips(prev =>
                        prev.map(c => {
                          if (c.sourceUrl !== previewUrl) return c;
                          const wasDefaultEnd = Math.abs(c.endSec - c.sourceDurationSec) < 0.05;
                          return {
                            ...c,
                            sourceDurationSec: d,
                            endSec: wasDefaultEnd ? d : Math.min(c.endSec, d),
                          };
                        })
                      );
                    }}
                    onPlay={(e) => {
                      setIsVideoPlaying(true);
                      if (selectedClip) {
                        const t = e.currentTarget.currentTime;
                        if (t < selectedClip.startSec - 0.15 || t >= selectedClip.endSec - 0.08) {
                          e.currentTarget.currentTime = selectedClip.startSec;
                          setCurrentVideoTime(selectedClip.startSec);
                        }
                        e.currentTarget.playbackRate = selectedClip.speed || 1;
                        e.currentTarget.muted = selectedClip.muted;
                      }
                    }}
                    onPause={() => setIsVideoPlaying(false)}
                    onTimeUpdate={(e) => {
                      const t = e.currentTarget.currentTime;
                      setCurrentVideoTime(t);
                      if (selectedClip && !e.currentTarget.paused) {
                        if (t < selectedClip.startSec - 0.15) {
                          e.currentTarget.currentTime = selectedClip.startSec;
                          return;
                        }
                        if (t >= selectedClip.endSec - 0.06) {
                          const idx = timelineClips.findIndex(c => c.id === selectedClip.id);
                          const nextClip = idx >= 0 && idx + 1 < timelineClips.length ? timelineClips[idx + 1] : null;
                          if (nextClip) {
                            handleSelectClip(nextClip, true);
                          } else if (timelineClips.length > 1 || selectedClip.endSec < selectedClip.sourceDurationSec - 0.1) {
                            e.currentTarget.pause();
                            setIsVideoPlaying(false);
                          }
                        }
                      }
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

                  {/* Calques Visuels Superposés Live (Logos, Images PiP, Stickers redimensionnables) */}
                  {visualLayers.map((layer) => {
                    const isSelectedLayer = selectedVisualLayer?.id === layer.id;
                    const shapeClass =
                      layer.shape === 'circle'
                        ? 'rounded-full aspect-square object-cover'
                        : layer.shape === 'rounded'
                          ? 'rounded-xl object-contain'
                          : 'rounded-none object-contain';
                    return (
                      <div
                        key={layer.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(layer.id);
                          setActivePanel('MOTION');
                        }}
                        style={{
                          left: `${layer.xPct}%`,
                          top: `${layer.yPct}%`,
                          width: `${layer.sizePct}%`,
                          opacity: layer.opacity,
                          transform: `translate(-50%, -50%) rotate(${layer.rotationDeg}deg)`
                        }}
                        className={`group absolute z-20 cursor-pointer transition-shadow ${
                          isSelectedLayer ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-black/40 rounded-xl' : ''
                        }`}
                        title="Cliquez pour modifier ou utilisez × pour retirer"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVisualLayer(layer.id);
                          }}
                          className="absolute -top-2 -right-2 z-30 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center justify-center border border-white/40 cursor-pointer transition-transform active:scale-90"
                          title={`Retirer "${layer.label}" de la vidéo`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {layer.kind === 'image' && layer.imageUrl ? (
                          <img
                            src={layer.imageUrl}
                            alt={layer.label}
                            className={`w-full h-auto shadow-lg pointer-events-none ${shapeClass}`}
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: layer.badgeBg || '#EF4444' }}
                            className={`w-full px-2.5 py-1 text-center text-[10px] sm:text-xs font-black text-white shadow-lg whitespace-nowrap overflow-hidden text-ellipsis ${
                              layer.shape === 'square' ? 'rounded-sm' : 'rounded-full'
                            }`}
                          >
                            {layer.badgeText}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Sous-Titres Live Synchronisés (Modèle Viral sélectionné + Couleur personnalisée) */}
                  {activeSubtitleCue && (
                    <div className="pointer-events-none absolute inset-x-4 bottom-24 flex justify-center text-center z-20">
                      <div className="pointer-events-auto relative inline-flex items-center">
                        <span
                          className={`inline-block max-w-full ${activeSubtitleTemplate.previewClass}`}
                          style={{ color: resolvedSubtitleColor }}
                        >
                          {activeSubtitleCue.text}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            setSubtitleCues([]);
                            setSubtitleStatusMsg('Sous-titres retirés de la vidéo.');
                          }}
                          className="ml-1.5 w-5 h-5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-md border border-white/30 cursor-pointer shrink-0"
                          title="Retirer les sous-titres de la vidéo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Motion Design & Animation Live Overlay */}
                  {(overlayHeadline.trim() || overlayPrice.trim() || overlayContact.trim()) && (
                    <div
                      key={`${motionDesignId}_${motionAnimId}_${animReplayKey}`}
                      className={`pointer-events-none absolute inset-x-3 z-20 ${
                        textPosition === 'top' ? 'top-3' : textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-12'
                      }`}
                    >
                      <div className={`pointer-events-auto relative ${activeMotionPack.wrapperClass} ${activeAnimationPack.animClass} flex items-center gap-2.5`}>
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
                            <p className="text-[10.5px] font-bold mt-0.5 truncate opacity-95" style={{ color: textColor }}>
                              {[overlayPrice.trim(), overlayContact.trim()].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            setOverlayHeadline('');
                            setOverlayPrice('');
                            setOverlayContact('');
                          }}
                          className="w-5 h-5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-md border border-white/30 cursor-pointer shrink-0"
                          title="Retirer ce bandeau texte de la vidéo"
                        >
                          <X className="w-3 h-3" />
                        </button>
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

            {/* CONTRÔLES D'EXPORT MULTI-QUALITÉ & MULTI-FORMATS */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">Qualité &amp; Format d'Export</span>
                <span className="text-[10px] font-mono text-indigo-300 font-bold">
                  {resolvedExportDimensions.width}×{resolvedExportDimensions.height}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: '480p', label: '480p Éco', sub: 'WhatsApp' },
                  { id: '720p', label: '720p HD', sub: 'TikTok/Reels' },
                  { id: '1080p', label: '1080p Full HD', sub: 'YouTube Pro' }
                ] as Array<{ id: ExportResolutionId; label: string; sub: string }>).map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setExportResolution(r.id);
                    }}
                    className={`py-1.5 px-2 rounded-xl border text-center cursor-pointer transition ${
                      exportResolution === r.id
                        ? 'bg-indigo-600/25 border-indigo-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-[11px] font-black">{r.label}</span>
                    <span className="block text-[9px] opacity-75">{r.sub}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { id: 'mp4', label: 'MP4 (H.264 Universel)' },
                  { id: 'webm', label: 'WebM (VP9 / Web HD)' }
                ] as Array<{ id: ExportContainerId; label: string }>).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setExportContainer(c.id)}
                    className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition ${
                      exportContainer === c.id
                        ? 'bg-emerald-600/20 border-emerald-400 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCompileAndDownload}
                disabled={isEncoding || !previewUrl}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-black shadow-xl flex items-center justify-center gap-2 cursor-pointer transition"
              >
                {isEncoding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Encodage vidéo optimisé... ({encodeProgress}%)</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Exporter {exportContainer.toUpperCase()} ({socialFormat} • {exportResolution})</span>
                  </>
                )}
              </button>

              {/* Exports Annexes Rapides : .SRT, .VTT, .WAV */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={subtitleCues.length === 0}
                  onClick={() => {
                    downloadSubtitleFile(exportSubtitlesToSrt(subtitleCues), `sous-titres-${Date.now()}.srt`);
                    playValidationBeep();
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-[10.5px] font-bold text-slate-200 cursor-pointer"
                >
                  📝 Export .SRT
                </button>
                <button
                  type="button"
                  disabled={subtitleCues.length === 0}
                  onClick={() => {
                    downloadSubtitleFile(exportSubtitlesToVtt(subtitleCues), `sous-titres-${Date.now()}.vtt`, 'text/vtt;charset=utf-8');
                    playValidationBeep();
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-[10.5px] font-bold text-slate-200 cursor-pointer"
                >
                  🌐 Export .VTT
                </button>
                {enhancedVoiceUrl && (
                  <a
                    href={enhancedVoiceUrl}
                    download={`voix-studio-${Date.now()}.wav`}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-[10.5px] font-bold text-emerald-300 text-center"
                  >
                    🎙️ Audio .WAV
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : 7 ONGLETS COMPLETS */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
              {[
                { id: 'EDIT' as StudioPanelTab, label: 'Montage', icon: Scissors },
                { id: 'SUBTITLES' as StudioPanelTab, label: 'Sous-titres', icon: Subtitles },
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
                    className={`py-2 px-1 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                      active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* PANNEAU ÉMETTEUR DE SOUS-TITRES AUTOMATIQUE & TOP 8 MODÈLES DE TEXTES VIRAUX */}
            {activePanel === 'SUBTITLES' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                {/* 1. Émetteur Automatique (Transcription IA ou Script) */}
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/35 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Subtitles className="w-4 h-4 text-amber-400" />
                        <span>Émetteur de Sous-Titres Automatique (Auto-Captions)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Transcrivez automatiquement votre voix off par IA ou découpez votre script en sous-titres synchronisés (.SRT / .VTT + incrustation live).
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleToggleLiveDictation}
                        className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          isLiveDictating
                            ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40'
                        }`}
                        title="Dicter directement vos sous-titres au micro en français (instantané)"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{isLiveDictating ? 'Arrêter dictée' : 'Dicter au micro'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoTranscribeVoice}
                        disabled={isAutoTranscribing}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-60 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isAutoTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>{isAutoTranscribing ? 'Transcription...' : 'Auto-Transcrire Audio'}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={subtitleScript}
                    onChange={(e) => setSubtitleScript(e.target.value)}
                    placeholder="Collez votre texte parlé ici (ex: Découvrez notre offre exceptionnelle aujourd'hui seulement à 15 000 FCFA avec livraison rapide partout...)"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateSubtitlesFromScript}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Générer &amp; Synchroniser les Sous-Titres</span>
                    </button>
                    {subtitleCues.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            downloadSubtitleFile(exportSubtitlesToSrt(subtitleCues), `sous-titres-${Date.now()}.srt`);
                            playValidationBeep();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold cursor-pointer"
                        >
                          Télécharger .SRT
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            downloadSubtitleFile(exportSubtitlesToVtt(subtitleCues), `sous-titres-${Date.now()}.vtt`, 'text/vtt;charset=utf-8');
                            playValidationBeep();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-[11px] font-bold cursor-pointer"
                        >
                          Télécharger .VTT
                        </button>
                      </div>
                    )}
                  </div>

                  {subtitleStatusMsg && (
                    <p className="text-[11px] text-emerald-300 font-semibold">{subtitleStatusMsg}</p>
                  )}
                </div>

                {/* 2. Top 8 Modèles de Textes & Sous-Titres les Plus Utilisés */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-indigo-400" />
                    <span>Modèles de Textes &amp; Sous-Titres les Plus Utilisés (Top 8 Viral)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SUBTITLE_TEXT_TEMPLATES.map((tpl) => {
                      const active = subtitleTemplateId === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setSubtitleTemplateId(tpl.id);
                            if (subtitleCues.length === 0) {
                              const sampleText =
                                subtitleScript.trim() ||
                                overlayHeadline.trim() ||
                                'Votre sous-titre viral ici !';
                              if (!subtitleScript.trim()) setSubtitleScript(sampleText);
                              setSubtitleCues(
                                generateTimedSubtitlesFromScript(sampleText, videoDuration || maxDurationSec || 30)
                              );
                            }
                          }}
                          className={`text-left p-3 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                            active
                              ? 'bg-indigo-950/60 border-indigo-400 shadow-lg'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-white">{tpl.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9.5px] font-bold text-amber-300">
                              {tpl.badge}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-400">{tpl.desc}</p>
                          <div className="pt-1">
                            <span
                              className={`inline-block text-[11px] ${tpl.previewClass}`}
                              style={active && subtitleCustomColor ? { color: subtitleCustomColor } : undefined}
                            >
                              EXEMPLE VIRAL
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Personnalisation de la couleur du texte des sous-titres */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-300">Couleur du texte :</span>
                      {['#FFFFFF', '#FDE047', '#34D399', '#38BDF8', '#FB7185', '#F97316', '#C084FC', '#000000'].map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setSubtitleCustomColor(hex);
                            if (subtitleCues.length === 0 && subtitleScript.trim()) {
                              setSubtitleCues(
                                generateTimedSubtitlesFromScript(subtitleScript.trim(), videoDuration || maxDurationSec || 30)
                              );
                            }
                          }}
                          className={`w-6 h-6 rounded-full border-2 cursor-pointer transition ${
                            resolvedSubtitleColor.toLowerCase() === hex.toLowerCase()
                              ? 'border-white scale-115 shadow-md'
                              : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                      <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10.5px] font-bold text-slate-200 cursor-pointer hover:border-indigo-400">
                        <input
                          type="color"
                          value={resolvedSubtitleColor}
                          onChange={(e) => {
                            setSubtitleCustomColor(e.target.value);
                            if (subtitleCues.length === 0 && subtitleScript.trim()) {
                              setSubtitleCues(
                                generateTimedSubtitlesFromScript(subtitleScript.trim(), videoDuration || maxDurationSec || 30)
                              );
                            }
                          }}
                          className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span>Libre</span>
                      </label>
                    </div>

                    {subtitleCustomColor && (
                      <button
                        type="button"
                        onClick={() => setSubtitleCustomColor('')}
                        className="text-[10.5px] font-bold text-indigo-300 hover:text-white cursor-pointer"
                      >
                        ↺ Couleur du modèle
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Éditeur de segments horodatés */}
                {subtitleCues.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white">Timeline des Sous-Titres ({subtitleCues.length})</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const lastEnd = subtitleCues[subtitleCues.length - 1]?.endSec || 0;
                          setSubtitleCues(prev => [
                            ...prev,
                            { id: `cue_${Date.now()}`, startSec: lastEnd, endSec: lastEnd + 3, text: 'Nouveau sous-titre' }
                          ]);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ajouter</span>
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {subtitleCues.map((cue, idx) => (
                        <div key={cue.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] font-mono text-indigo-300 shrink-0 w-20">
                            {cue.startSec.toFixed(1)}s–{cue.endSec.toFixed(1)}s
                          </span>
                          <input
                            type="text"
                            value={cue.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSubtitleCues(prev => prev.map((c, i) => (i === idx ? { ...c, text: val } : c)));
                            }}
                            className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setSubtitleCues(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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

            {/* PANNEAU 1 : MONTAGE (TIMELINE PRO MULTI-CLIPS, CUT, SUPPRESSION, TRIM, TEXTE, FILTRES) */}
            {activePanel === 'EDIT' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                {/* TIMELINE PRO MULTI-CLIPS */}
                <div className="p-4 rounded-2xl bg-slate-950/95 border border-indigo-500/30 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        Timeline Multi-Clips ({timelineClips.length} segment{timelineClips.length > 1 ? 's' : ''})
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600/25 border border-indigo-500/40 text-[10px] font-mono font-black text-indigo-200">
                        Total : {totalTimelineSec}s
                      </span>
                    </div>

                    {/* Undo / Redo + Ajouter Clip */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleUndoTimeline}
                        disabled={historyPast.length === 0}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 border border-slate-800 cursor-pointer"
                        title="Annuler (Undo)"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRedoTimeline}
                        disabled={historyFuture.length === 0}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 border border-slate-800 cursor-pointer"
                        title="Rétablir (Redo)"
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => addClipInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Clip</span>
                      </button>
                      <input
                        ref={addClipInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleAddExtraClip}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Curseur Tête de lecture (Playhead) intégré pour positionner précisément le Cut */}
                  {selectedClip && (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Scissors className="w-3 h-3" />
                          Position de coupe (Tête de lecture)
                        </span>
                        <span className="font-mono font-black text-white">
                          {currentVideoTime.toFixed(1)}s / {selectedClip.sourceDurationSec.toFixed(1)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min={selectedClip.startSec}
                        max={Math.max(selectedClip.startSec + 0.1, selectedClip.endSec)}
                        step={0.1}
                        value={Math.max(selectedClip.startSec, Math.min(selectedClip.endSec, currentVideoTime))}
                        onChange={(e) => handleScrubPlayhead(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Barre d'actions principales : Lire montage, Cut, Supprimer, Dupliquer, Déplacer */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePlayFullTimeline}
                      disabled={timelineClips.length === 0}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-sm"
                      title="Lire le montage assemblé (ignore les segments supprimés)"
                    >
                      {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isVideoPlaying ? 'Pause' : 'Lire montage'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSplitAtPlayhead}
                      disabled={!selectedClip}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Couper le clip sélectionné à la tête de lecture (ou au milieu si à 0.0s)"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Cut ici ({currentVideoTime.toFixed(1)}s)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSelectedClip()}
                      disabled={!selectedClip}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-600/25 hover:bg-rose-600/45 disabled:opacity-35 text-rose-200 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Supprimer le segment sélectionné"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDuplicateSelectedClip}
                      disabled={!selectedClip}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Dupliquer</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExtractAudioFromVideo}
                      disabled={isExtractingAudio || timelineClips.length === 0}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 disabled:opacity-35 text-cyan-200 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Extraire et détacher la piste audio de la vidéo sur la timeline"
                    >
                      {isExtractingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AudioWaveform className="w-3.5 h-3.5" />}
                      <span>{isExtractingAudio ? 'Extraction...' : 'Extraire l\'audio'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSelectedClip('left')}
                      disabled={!selectedClip || timelineClips.findIndex(c => c.id === selectedClip.id) <= 0}
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 border border-slate-700 cursor-pointer"
                      title="Déplacer à gauche"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSelectedClip('right')}
                      disabled={!selectedClip || timelineClips.findIndex(c => c.id === selectedClip.id) >= timelineClips.length - 1}
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 border border-slate-700 cursor-pointer"
                      title="Déplacer à droite"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {timelineNotice && (
                    <p
                      className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border ${
                        timelineNotice.startsWith('⚠️')
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                          : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                      }`}
                    >
                      {timelineNotice}
                    </p>
                  )}

                  {/* Piste 1 : Piste Vidéo Interactive des Segments */}
                  {timelineClips.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Film className="w-3 h-3 text-indigo-400" />
                        <span>Piste Vidéo</span>
                      </div>
                      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1.5">
                        {timelineClips.map((clip, idx) => {
                          const isSel = selectedClip?.id === clip.id;
                          const outDur = getClipOutputDuration(clip);
                          return (
                            <div
                              key={clip.id}
                              onClick={() => handleSelectClip(clip)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') handleSelectClip(clip);
                              }}
                              style={{ minWidth: `${Math.max(120, Math.min(230, Math.round(outDur * 14)))}px` }}
                              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 shrink-0 ${
                                isSel
                                  ? 'bg-indigo-600/30 border-indigo-400 shadow-lg shadow-indigo-950/50'
                                  : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10.5px] font-black text-white truncate">
                                  #{idx + 1} {clip.label}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {clip.speed !== 1 && (
                                    <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black">
                                      {clip.speed}x
                                    </span>
                                  )}
                                  {clip.muted && <VolumeX className="w-3 h-3 text-rose-400" />}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSelectedClip(clip.id);
                                    }}
                                    className="p-1 rounded-md hover:bg-rose-500/30 text-slate-400 hover:text-rose-200 transition-colors cursor-pointer"
                                    title={`Supprimer ${clip.label}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <span className="text-[9.5px] font-mono text-slate-400">
                                {clip.startSec.toFixed(1)}s → {clip.endSec.toFixed(1)}s ({outDur}s)
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Piste 2 : Piste Audio dédiée (Son vidéo lié OU Audio extrait avec forme d'onde PCM) */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Music className="w-3 h-3 text-emerald-400" />
                            <span>Piste Audio</span>
                          </span>
                          {extractedAudioUrl && (
                            <span className="text-[10px] font-mono text-emerald-300">
                              Audio détaché • {extractedAudioDuration}s
                            </span>
                          )}
                        </div>

                        {extractedAudioUrl ? (
                          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                            {/* Forme d'onde PCM réelle */}
                            <div className="h-9 flex items-end gap-[2px] px-1 overflow-hidden">
                              {(extractedAudioPeaks.length > 0 ? extractedAudioPeaks : Array(36).fill(0.4)).map((peak, i) => (
                                <div
                                  key={i}
                                  style={{ height: `${Math.round(peak * 100)}%` }}
                                  className={`flex-1 rounded-full transition-colors ${
                                    extractedAudioMuted ? 'bg-slate-600/60' : 'bg-gradient-to-t from-emerald-500 to-cyan-300'
                                  }`}
                                />
                              ))}
                            </div>

                            {/* Contrôles de la Piste Audio Extraite */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-500/20">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={handleTogglePlayExtractedAudio}
                                  className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10.5px] font-black flex items-center gap-1 cursor-pointer"
                                >
                                  {isPlayingExtractedAudio ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                  <span>{isPlayingExtractedAudio ? 'Pause' : 'Écouter'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = !extractedAudioMuted;
                                    setExtractedAudioMuted(next);
                                    if (extractedAudioRef.current) extractedAudioRef.current.muted = next;
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer border ${
                                    extractedAudioMuted
                                      ? 'bg-rose-600/25 text-rose-200 border-rose-500/40'
                                      : 'bg-slate-900 text-slate-200 border-slate-700'
                                  }`}
                                >
                                  {extractedAudioMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                  <span>{extractedAudioMuted ? 'Muet' : `${Math.round(extractedAudioVolume * 100)}%`}</span>
                                </button>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  value={extractedAudioVolume}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setExtractedAudioVolume(v);
                                    if (extractedAudioRef.current) extractedAudioRef.current.volume = v;
                                  }}
                                  className="w-20 accent-emerald-400 cursor-pointer"
                                  title="Volume piste audio"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={handleSendExtractedAudioToDsp}
                                  className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[10.5px] font-bold cursor-pointer"
                                  title="Envoyer cette piste dans le Studio Voix (Égaliseur + Anti-Bruit)"
                                >
                                  🎛️ Voix DSP
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDownloadExtractedAudio}
                                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Télécharger l'audio extrait (.WAV)"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>.WAV</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeleteExtractedAudio}
                                  className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 cursor-pointer"
                                  title="Supprimer cette piste audio"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[11px] text-slate-300">
                              <AudioWaveform className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>
                                {selectedClip?.muted
                                  ? 'Son vidéo coupé (Muet) — réactivez le son ou extrayez l\'audio'
                                  : `Audio intégré à la vidéo (${totalTimelineSec}s)`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleExtractAudioFromVideo}
                              disabled={isExtractingAudio}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 text-[10.5px] font-black flex items-center gap-1 cursor-pointer"
                            >
                              {isExtractingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <AudioWaveform className="w-3 h-3" />}
                              <span>Extraire / Détacher l&apos;audio</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-slate-800 text-center text-[11px] text-slate-400">
                      Importez une vidéo pour activer la timeline multi-clips.
                    </div>
                  )}

                  {/* Contrôles Fins du Clip Sélectionné : Trim In/Out, Vitesse & Muet */}
                  {selectedClip && (
                    <div className="pt-2.5 border-t border-slate-800/90 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-400">Début (In)</span>
                            <span className="font-mono font-bold text-indigo-300">{selectedClip.startSec.toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={Math.max(0.5, selectedClip.endSec - 0.3)}
                            step={0.1}
                            value={selectedClip.startSec}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setTimelineClips(prev => updateClipInTimeline(prev, selectedClip.id, { startSec: v }));
                              if (videoPreviewRef.current) videoPreviewRef.current.currentTime = v;
                            }}
                            className="w-full accent-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-400">Fin (Out)</span>
                            <span className="font-mono font-bold text-emerald-300">{selectedClip.endSec.toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            min={selectedClip.startSec + 0.3}
                            max={Math.max(selectedClip.startSec + 0.5, selectedClip.sourceDurationSec)}
                            step={0.1}
                            value={selectedClip.endSec}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setTimelineClips(prev => updateClipInTimeline(prev, selectedClip.id, { endSec: v }));
                            }}
                            className="w-full accent-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10.5px] text-slate-400 mr-1">Vitesse :</span>
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => {
                                playTapBeep();
                                pushTimelineState(updateClipInTimeline(timelineClips, selectedClip.id, { speed: spd }), selectedClip.id);
                                if (videoPreviewRef.current) videoPreviewRef.current.playbackRate = spd;
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold cursor-pointer ${
                                selectedClip.speed === spd
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            const nextMuted = !selectedClip.muted;
                            pushTimelineState(updateClipInTimeline(timelineClips, selectedClip.id, { muted: nextMuted }), selectedClip.id);
                            if (videoPreviewRef.current) videoPreviewRef.current.muted = nextMuted;
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer border ${
                            selectedClip.muted
                              ? 'bg-rose-600/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-900 text-slate-200 border-slate-700'
                          }`}
                        >
                          {selectedClip.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{selectedClip.muted ? 'Muet' : 'Son Actif'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">Couleur :</span>
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTextColor(c.id)}
                          className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                            textColor.toLowerCase() === c.id.toLowerCase() ? 'border-white scale-110' : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: c.id }}
                          title={c.label}
                        />
                      ))}
                      <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-700 text-[10.5px] font-bold text-slate-200 cursor-pointer hover:border-indigo-400">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span>Libre</span>
                      </label>
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

            {/* PANNEAU 2 : SUPERPOSITION LOGO/IMAGES + PACK MOTION DESIGN + ANIMATIONS */}
            {activePanel === 'MOTION' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                {/* SUPERPOSITION D'ÉLÉMENTS VISUELS (LOGO, IMAGES PiP, STICKERS REDIMENSIONNABLES) */}
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/35 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        <span>Superposition Logo, Images &amp; Badges ({visualLayers.length})</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ajoutez votre logo, une photo produit ou un QR Code dans un coin et redimensionnez-le librement.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => overlayImageInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>+ Logo / Image</span>
                    </button>
                    <input
                      ref={overlayImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImportOverlayImage}
                      className="hidden"
                    />
                  </div>

                  {/* Stickers / Badges Rapides */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { text: '🔥 PROMO', bg: '#DC2626' },
                      { text: '✅ LIVRAISON RAPIDE', bg: '#059669' },
                      { text: '⭐ NOUVEAU', bg: '#D97706' },
                      { text: '💎 AUTHENTIQUE', bg: '#4F46E5' },
                      { text: '📲 COMMANDEZ ICI', bg: '#0284C7' }
                    ].map(st => (
                      <button
                        key={st.text}
                        type="button"
                        onClick={() => handleAddPresetSticker(st.text, st.bg)}
                        className="px-2.5 py-1 rounded-full text-[10px] font-black text-white border border-white/15 cursor-pointer hover:scale-105 transition"
                        style={{ backgroundColor: st.bg }}
                      >
                        + {st.text}
                      </button>
                    ))}
                  </div>

                  {/* Liste des calques actifs */}
                  {visualLayers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {visualLayers.map(layer => {
                        const isSel = selectedVisualLayer?.id === layer.id;
                        return (
                          <div
                            key={layer.id}
                            onClick={() => setSelectedLayerId(layer.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold cursor-pointer ${
                              isSel
                                ? 'bg-indigo-600/30 border-indigo-400 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="truncate max-w-[110px]">{layer.label}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVisualLayer(layer.id);
                              }}
                              className="text-slate-400 hover:text-rose-400 cursor-pointer"
                              title="Supprimer cet élément"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Contrôles Position, 4 Coins, Taille, Opacité, Forme & Rotation du calque sélectionné */}
                  {selectedVisualLayer && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-indigo-300">
                          Réglages : {selectedVisualLayer.label}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: '↖ Haut-G', x: 18, y: 14 },
                            { label: '↗ Haut-D', x: 82, y: 14 },
                            { label: '↙ Bas-G', x: 18, y: 78 },
                            { label: '↘ Bas-D', x: 82, y: 78 },
                            { label: '◎ Centre', x: 50, y: 50 }
                          ].map(pos => (
                            <button
                              key={pos.label}
                              type="button"
                              onClick={() => {
                                playTapBeep();
                                handleUpdateVisualLayer(selectedVisualLayer.id, { xPct: pos.x, yPct: pos.y });
                              }}
                              className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-[10px] font-bold text-slate-200 border border-slate-700 cursor-pointer"
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-400">Taille (Redimensionner)</span>
                            <span className="font-mono font-bold text-emerald-300">{selectedVisualLayer.sizePct}%</span>
                          </div>
                          <input
                            type="range"
                            min={8}
                            max={65}
                            value={selectedVisualLayer.sizePct}
                            onChange={(e) => handleUpdateVisualLayer(selectedVisualLayer.id, { sizePct: Number(e.target.value) })}
                            className="w-full accent-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-400">Opacité</span>
                            <span className="font-mono font-bold text-sky-300">{Math.round(selectedVisualLayer.opacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0.2}
                            max={1}
                            step={0.05}
                            value={selectedVisualLayer.opacity}
                            onChange={(e) => handleUpdateVisualLayer(selectedVisualLayer.id, { opacity: Number(e.target.value) })}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-400">Position Horizontale (X)</span>
                            <span className="font-mono font-bold text-indigo-300">{selectedVisualLayer.xPct}%</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={95}
                            value={selectedVisualLayer.xPct}
                            onChange={(e) => handleUpdateVisualLayer(selectedVisualLayer.id, { xPct: Number(e.target.value) })}
                            className="w-full accent-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-slate-400">Position Verticale (Y)</span>
                            <span className="font-mono font-bold text-amber-300">{selectedVisualLayer.yPct}%</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={92}
                            value={selectedVisualLayer.yPct}
                            onChange={(e) => handleUpdateVisualLayer(selectedVisualLayer.id, { yPct: Number(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10.5px] text-slate-400">Forme :</span>
                          {([
                            { id: 'square', label: 'Carré' },
                            { id: 'rounded', label: 'Arrondi' },
                            { id: 'circle', label: 'Cercle' }
                          ] as const).map(sh => (
                            <button
                              key={sh.id}
                              type="button"
                              onClick={() => handleUpdateVisualLayer(selectedVisualLayer.id, { shape: sh.id })}
                              className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold cursor-pointer ${
                                selectedVisualLayer.shape === sh.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}
                            >
                              {sh.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] text-slate-400">Rotation : {selectedVisualLayer.rotationDeg}°</span>
                          <input
                            type="range"
                            min={-45}
                            max={45}
                            value={selectedVisualLayer.rotationDeg}
                            onChange={(e) => handleUpdateVisualLayer(selectedVisualLayer.id, { rotationDeg: Number(e.target.value) })}
                            className="w-24 accent-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

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
