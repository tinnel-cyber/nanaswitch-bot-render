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
  Wand2
} from 'lucide-react';
import { encodeVideo, formatBytes, VideoEncodeResult } from '../../../services/videoEncoderService';
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
type StudioPanelTab = 'EDIT' | 'AUDIO' | 'PARTNERS' | 'PUBLISH';
type SocialNetworkId = 'tiktok_reels' | 'whatsapp_status' | 'facebook_youtube';

const SOCIAL_FORMATS: Record<SocialFormatId, { label: string; subtitle: string; width: number; height: number; aspectClass: string; maxRecommendedSec: number }> = {
  '9:16': {
    label: '9:16 Vertical',
    subtitle: 'TikTok • Reels • Shorts • WhatsApp',
    width: 480,
    height: 854,
    aspectClass: 'aspect-[9/16] max-h-[420px]',
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

  // Paramètres de montage & habillage
  const [socialFormat, setSocialFormat] = useState<SocialFormatId>('9:16');
  const [selectedFilterId, setSelectedFilterId] = useState<string>('vivid');
  const [overlayHeadline, setOverlayHeadline] = useState<string>(initialHeadline || `🔥 ${storeName}`);
  const [overlayPrice, setOverlayPrice] = useState<string>('');
  const [overlayContact, setOverlayContact] = useState<string>(whatsappPhone ? `📲 ${whatsappPhone}` : '');
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [textColor, setTextColor] = useState<string>('#FACC15');

  // Encodage via videoEncoderService (100% local, 0 stockage Cloud)
  const [isEncoding, setIsEncoding] = useState<boolean>(false);
  const [encodeProgress, setEncodeProgress] = useState<number>(0);
  const [encodeResult, setEncodeResult] = useState<VideoEncodeResult | null>(null);
  const [encodeError, setEncodeError] = useState<string | null>(null);

  // Voix Off Micro intégrée (MediaRecorder)
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceBlobUrl, setVoiceBlobUrl] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Kit Publication Réseaux Sociaux
  const [targetNetwork, setTargetNetwork] = useState<SocialNetworkId>('tiktok_reels');
  const [copiedPost, setCopiedPost] = useState<boolean>(false);

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

  const combinedOverlayText = useMemo(() => {
    return [overlayHeadline.trim(), overlayPrice.trim(), overlayContact.trim()]
      .filter(Boolean)
      .join(' • ');
  }, [overlayHeadline, overlayPrice, overlayContact]);

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
      } catch (err: any) {
        setIsEncoding(false);
        setEncodeError(
          'Cette vidéo distante bloque la lecture directe (CORS). Téléchargez-la d\'abord puis importez le fichier ici avec le bouton « Importer une vidéo ».'
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

    try {
      const result = await encodeVideo(inputBlob, {
        preset: socialFormat === '9:16' ? 'reel' : 'reel',
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

      // Téléchargement direct sur l'appareil (zéro stockage Cloud)
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

  // Enregistrement Voix Off Micro (local, téléchargeable pour CapCut / Canva)
  const handleToggleVoiceRecord = async () => {
    if (isRecordingVoice && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setVoiceBlobUrl(url);
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
    // tiktok_reels
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
      {/* Header Studio Pro */}
      <header className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white truncate">Studio de Montage Vidéo Pro</h2>
            <p className="text-[11px] text-slate-400 truncate">
              Encodage matériel local • Zéro stockage Cloud • Prêt réseaux sociaux
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
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileImport}
            className="hidden"
          />
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

      {/* Corps Principal Responsive (Split Desktop / Stacked Mobile) */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 pb-12">
          {/* COLONNE GAUCHE : APERÇU VIDÉO LIVE & EXPORT */}
          <div className="lg:col-span-5 space-y-4">
            {/* Sélecteur de Format Réseaux Sociaux */}
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

            {/* Écran de Prévisualisation Live */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 flex flex-col items-center justify-center min-h-[320px] relative">
              {previewUrl ? (
                <div className={`relative w-full ${SOCIAL_FORMATS[socialFormat].aspectClass} bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl mx-auto flex items-center justify-center`}>
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    onLoadedMetadata={(e) => {
                      const d = Math.round(e.currentTarget.duration || 30);
                      setVideoDuration(d);
                      setMaxDurationSec(Math.min(d, SOCIAL_FORMATS[socialFormat].maxRecommendedSec));
                    }}
                    style={{ filter: activeFilterCss }}
                    className="w-full h-full object-cover"
                  />
                  {/* Aperçu de l'incrustation texte commercial */}
                  {combinedOverlayText && (
                    <div
                      className={`pointer-events-none absolute inset-x-3 px-3 py-2 rounded-xl bg-black/65 backdrop-blur-xs text-center font-black text-xs sm:text-sm shadow-lg ${
                        textPosition === 'top' ? 'top-3' : textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-12'
                      }`}
                      style={{ color: textColor }}
                    >
                      {combinedOverlayText}
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

            {/* Barre d'encodage & bouton Export MP4 Direct */}
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

          {/* COLONNE DROITE : OUTILS DE MONTAGE, AUDIO, PARTENAIRES & PUBLICATION */}
          <div className="lg:col-span-7 space-y-4">
            {/* Onglets d'outils */}
            <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
              {[
                { id: 'EDIT' as StudioPanelTab, label: 'Montage', icon: Scissors },
                { id: 'AUDIO' as StudioPanelTab, label: 'Audio & Voix', icon: Music },
                { id: 'PARTNERS' as StudioPanelTab, label: 'CapCut / Canva', icon: Wand2 },
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
                    className={`py-2 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* PANNEAU 1 : MONTAGE (TRIM, HABILLAGE TEXTE COMMERCIAL, FILTRES) */}
            {activePanel === 'EDIT' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                {/* Durée / Trim */}
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

                {/* Habillage Texte Commercial */}
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

                {/* Filtres Cinéma & Pub */}
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

            {/* PANNEAU 2 : AUDIO LIBRE DE DROITS & ENREGISTREUR VOIX OFF MICRO */}
            {activePanel === 'AUDIO' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
                {/* Enregistreur Voix Off Micro */}
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Mic className="w-4 h-4 text-rose-400" />
                        <span>Studio Voix Off Commerciale (Micro)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Enregistrez votre voix off et téléchargez-la pour l'ajouter sur CapCut / Canva.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleVoiceRecord}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        isRecordingVoice
                          ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isRecordingVoice ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isRecordingVoice ? 'Arrêter' : 'Enregistrer'}</span>
                    </button>
                  </div>

                  {voiceBlobUrl && (
                    <div className="flex items-center gap-2 pt-2 border-t border-indigo-500/20">
                      <audio controls src={voiceBlobUrl} className="h-8 flex-1" />
                      <a
                        href={voiceBlobUrl}
                        download={`voix-off-${Date.now()}.webm`}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Télécharger</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Bibliothèque Audio */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-white">Pistes Musiques &amp; Effets Sonores (Libres de droits)</h3>
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

            {/* PANNEAU 3 : PASSERELLES PARTENAIRES (CAPCUT + CANVA + CLIPCHAMP) */}
            {activePanel === 'PARTNERS' && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Éditeurs Partenaires Multi-Pistes</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Téléchargez vos essais vidéo (Google Flow ou Direct) et ouvrez directement votre éditeur favori avec vos textes prêts à coller.
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

            {/* PANNEAU 4 : KIT PUBLICATION RÉSEAUX SOCIAUX (LÉGENDE + HASHTAGS + WHATSAPP) */}
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
