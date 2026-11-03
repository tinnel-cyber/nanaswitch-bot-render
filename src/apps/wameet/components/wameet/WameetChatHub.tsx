import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageCircle,
  Search,
  Mic,
  Send,
  Image as ImageIcon,
  Video,
  ShoppingBag,
  Play,
  Pause,
  CheckCheck,
  User,
  Store,
  Plus,
  X,
  ExternalLink,
  Volume2,
  Sparkles,
  ChevronLeft,
  Radio,
  Link2,
  Square,
  Clock,
  Smile,
  Upload,
  ShieldCheck,
  Flame,
  RefreshCw,
  Phone,
  PhoneOff,
  Gift
} from 'lucide-react';
import { StealthYouTubePlayer, extractYouTubeVideoId } from '../../../../components/lms/video/StealthYouTubePlayer';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { LockedGiftBubble } from './LockedGiftBubble';
import { EncryptionNotice } from './EncryptionNotice';

import {
  WameetChatMessage,
  WameetChatThread,
  WameetChatProductCard,
  getDeterministicChatId,
  subscribeToChatMessages,
  subscribeToUserChats,
  sendWameetMessage,
  markChatMessagesAsRead,
  formatExpirationRemaining
} from '../../../../services/wameetChatService';
import { compressAndTrimVideo } from '../../../../utils/videoCompressor';
import {
  WameetCallType,
  WameetCallDocument,
  WameetCallParticipant,
  subscribeToIncomingCalls,
  declineIncomingCall,
  WameetRingtonePlayer
} from '../../../../services/wameetCallService';
import { WameetCallScreen } from './WameetCallScreen';

export type {
  WameetChatMessage,
  WameetChatThread,
  WameetChatProductCard
};

export type WameetChatFilter = 'ALL' | 'VOICE' | 'SHOPPING';

export interface WameetChatHubProps {
  currentUserProfile: {
    name: string;
    handle: string;
    avatarUrl: string;
    statusBadge: string;
  };
  initialRecipient?: {
    name: string;
    handle: string;
    avatarUrl: string;
    contextReelTitle?: string;
  } | null;
  onOpenShopForMember?: (product?: WameetChatProductCard, memberHandle?: string) => void;
  onOpenProfileForMember?: (memberName: string, memberHandle: string) => void;
}

export type WameetWHubProps = WameetChatHubProps;

const STORAGE_KEY_W_THREADS = 'wameet_w_threads_v1';

const PRESET_MINI_SHOP_PRODUCTS: WameetChatProductCard[] = [
  {
    id: 'wshop-1',
    name: 'Coffret Beauté Karité Royal Or',
    priceFcfa: 18500,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=400&auto=format&fit=crop&q=80',
    badge: '🛍️ Produit Physique'
  },
  {
    id: 'wshop-2',
    name: 'Masterclass Tunnels & IA UEMOA (12 Blocs)',
    priceFcfa: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80',
    badge: '🎓 Formation Digitale'
  },
  {
    id: 'wshop-3',
    name: 'Kit Studio Ring Light Pro Live 18"',
    priceFcfa: 22000,
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80',
    badge: '🔥 Offre Live'
  },
  {
    id: 'wshop-4',
    name: 'Ebook : 30 Idées Business après 18h',
    priceFcfa: 7500,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
    badge: '📘 Ebook PDF'
  }
];

const INITIAL_THREADS: WameetChatThread[] = [
  {
    id: 'thread-ibrahim',
    memberName: 'Ibrahim Konaté',
    memberHandle: '@ibrahim.k',
    memberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🎁 Cadeau Mystère',
    isOnline: true,
    unreadCount: 1,
    hasVoiceNote: false,
    hasShoppingCard: true,
    lastActivityLabel: 'À l’instant',
    messages: [
      {
        id: 'm-ibrahim-1',
        sender: 'them',
        createdAt: '19:44',
        type: 'text',
        text: 'Salut ! J’ai une énorme surprise physique pour toi ce soir 🎂🎉 Valide ta livraison ci-dessous :'
      },
      {
        id: 'm-ibrahim-2',
        sender: 'them',
        senderName: 'Ibrahim',
        createdAt: '19:45',
        type: 'gift',
        text: 'Ibrahim vous a envoyé un cadeau surprise !'
      }
    ]
  },
  {
    id: 'thread-awa',
    memberName: 'Awa Ouédraogo',

    memberHandle: '@awa.empire.bf',
    memberAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🛍️ Commerçante & E-Shop',
    isOnline: true,
    unreadCount: 2,
    hasVoiceNote: true,
    hasShoppingCard: true,
    lastActivityLabel: '19:42',
    messages: [
      {
        id: 'm-awa-1',
        sender: 'them',
        createdAt: '19:38',
        type: 'text',
        text: 'Bonsoir ! Bienvenue sur Wameet après le boulot 🌙 J’ai vu que tu t’intéressais à notre Coffret Karité Royal Or.'
      },
      {
        id: 'm-awa-2',
        sender: 'them',
        createdAt: '19:40',
        type: 'voice',
        audioDurationSec: 18,
        waveformBars: [35, 65, 80, 45, 90, 70, 55, 85, 95, 60, 40, 75, 88, 50, 68, 42, 78, 60, 45, 30]
      },
      {
        id: 'm-awa-3',
        sender: 'them',
        createdAt: '19:42',
        type: 'product',
        text: 'Voici la fiche directe du coffret avec livraison express dès demain matin :',
        productCard: {
          id: 'wshop-1',
          name: 'Coffret Beauté Karité Royal Or',
          priceFcfa: 18500,
          imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=400&auto=format&fit=crop&q=80',
          badge: '🛍️ En stock • Livraison 24h'
        }
      }
    ]
  },
  {
    id: 'thread-idriss',
    memberName: 'Dr. Idriss Kaboré',
    memberHandle: '@idriss.academie',
    memberAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🎓 Formateur & Mentor',
    isOnline: true,
    unreadCount: 1,
    hasVoiceNote: true,
    hasShoppingCard: true,
    lastActivityLabel: '19:15',
    messages: [
      {
        id: 'm-idriss-1',
        sender: 'them',
        createdAt: '19:10',
        type: 'text',
        text: 'Salut ! Voici l’extrait vidéo de la Masterclass sur les Tunnels 12 Blocs que je viens de partager sur Wameet :'
      },
      {
        id: 'm-idriss-2',
        sender: 'them',
        createdAt: '19:12',
        type: 'video',
        mediaUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        text: '🎬 Extrait Masterclass (lu directement via le Lecteur YouTube Furtif)'
      },
      {
        id: 'm-idriss-3',
        sender: 'them',
        createdAt: '19:15',
        type: 'voice',
        audioDurationSec: 24,
        waveformBars: [40, 75, 60, 85, 92, 55, 48, 80, 70, 95, 65, 50, 72, 84, 60, 45, 68, 52, 40, 35]
      }
    ]
  },
  {
    id: 'thread-salif',
    memberName: 'Salif Tech & Gadgets',
    memberHandle: '@salif.tech.ci',
    memberAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🚀 Entrepreneur Hybride',
    isOnline: true,
    unreadCount: 0,
    hasVoiceNote: false,
    hasShoppingCard: true,
    lastActivityLabel: '18:50',
    messages: [
      {
        id: 'm-salif-1',
        sender: 'them',
        createdAt: '18:45',
        type: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
        text: 'Voici la photo du Kit Ring Light Pro 18 pouces en situation réelle au studio !'
      },
      {
        id: 'm-salif-2',
        sender: 'me',
        createdAt: '18:50',
        type: 'text',
        text: 'Superbe éclairage Salif ! Envoie-moi la fiche produit je vais passer commande.'
      }
    ]
  },
  {
    id: 'thread-clarisse',
    memberName: 'Clarisse Zongo',
    memberHandle: '@clarisse.coach',
    memberAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    memberBadge: '🌙 Détente & Idées après le boulot',
    isOnline: true,
    unreadCount: 0,
    hasVoiceNote: true,
    hasShoppingCard: false,
    lastActivityLabel: 'Hier',
    messages: [
      {
        id: 'm-clarisse-1',
        sender: 'them',
        createdAt: 'Hier',
        type: 'voice',
        audioDurationSec: 14,
        waveformBars: [50, 70, 85, 60, 45, 78, 92, 64, 55, 80, 70, 48, 62, 75, 50, 40, 58, 45, 35, 25]
      },
      {
        id: 'm-clarisse-2',
        sender: 'them',
        createdAt: 'Hier',
        type: 'text',
        text: 'On se retrouve ce soir à 20h30 sur Wameet pour débriefer nos idées business de la semaine !'
      }
    ]
  }
];

function formatAudioSeconds(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Détecte le type MIME d'enregistrement audio optimal selon le terminal (iOS vs Android)
 * Privilégie audio/mp4 et audio/aac (compatible iOS Safari + Android moderne)
 * avant audio/webm (bloqué/mal supporté sur Safari).
 */
export function getOptimalVoiceRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }
  const preferredTypes = [
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus'
  ];
  for (const t of preferredTypes) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

/**
 * Bulle Audio Interactive Style Wameet Supra-App (▶️ Play / ⏸️ Pause, ondes sonores animées, durée & vitesse 1x / 1.5x / 2x)
 */
const WameetVoiceNoteBubble: React.FC<{
  message: WameetChatMessage;
  isMe: boolean;
  avatarUrl: string;
}> = ({ message, isMe, avatarUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);

  const totalSec = message.audioDurationSec || 18;
  const bars =
    message.waveformBars && message.waveformBars.length > 0
      ? message.waveformBars
      : [40, 75, 55, 88, 65, 92, 50, 78, 84, 60, 45, 72, 90, 58, 68, 48, 76, 62, 42, 32];

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (_) {}
        sourceNodeRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (_) {}
      }
    };
  }, []);

  const playWithWebAudioFallback = async (audioUrl: string) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        startSimulatedPlayback();
        return;
      }
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const res = await fetch(audioUrl);
      const arrayBuf = await res.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuf);

      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.playbackRate.value = speed;
      source.connect(ctx.destination);
      sourceNodeRef.current = source;

      const startTime = ctx.currentTime;
      const duration = decodedBuffer.duration;

      source.onended = () => {
        setIsPlaying(false);
        setProgressPct(0);
        if (timerRef.current) window.clearInterval(timerRef.current);
      };

      source.start(0);
      setIsPlaying(true);

      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        const elapsed = (ctx.currentTime - startTime) * speed;
        const pct = Math.min(100, (elapsed / duration) * 100);
        setProgressPct(pct);
        if (pct >= 100) {
          if (timerRef.current) window.clearInterval(timerRef.current);
        }
      }, 100);
    } catch (fallbackErr) {
      console.warn('[WAMEET AUDIO] Fallback Web Audio impossible, lecture simulée :', fallbackErr);
      startSimulatedPlayback();
    }
  };

  const togglePlay = () => {
    playTapBeep();
    if (message.audioUrl) {
      if (isPlaying) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.stop();
          } catch (_) {}
          sourceNodeRef.current = null;
        }
        if (timerRef.current) window.clearInterval(timerRef.current);
        setIsPlaying(false);
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio(message.audioUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setProgressPct(0);
        };
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current && audioRef.current.duration) {
            setProgressPct(
              Math.min(100, (audioRef.current.currentTime / audioRef.current.duration) * 100)
            );
          }
        };
      }
      audioRef.current.playbackRate = speed;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(playErr => {
          console.warn('[WAMEET AUDIO] Lecture HTML5 bloquée (iOS WebM ou autoplay), déclenchement Web Audio API :', playErr);
          playWithWebAudioFallback(message.audioUrl!);
        });
      return;
    }

    // Mode note vocale interactive légère (simulation d'onde sonore temps réel)
    if (isPlaying) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setIsPlaying(false);
    } else {
      startSimulatedPlayback();
    }
  };

  const startSimulatedPlayback = () => {
    setIsPlaying(true);
    if (timerRef.current) window.clearInterval(timerRef.current);
    const stepMs = 100;
    const increment = (100 / (totalSec * 10)) * speed;
    timerRef.current = window.setInterval(() => {
      setProgressPct(prev => {
        if (prev + increment >= 100) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setIsPlaying(false);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);
  };

  const cycleSpeed = () => {
    playTapBeep();
    const nextSpeed: 1 | 1.5 | 2 = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = nextSpeed;
    }
  };

  const currentElapsedSec = Math.round((progressPct / 100) * totalSec);

  return (
    <div className="flex items-center gap-2.5 min-w-[230px] sm:min-w-[270px] py-1">
      {/* Avatar avec petit micro */}
      <div className="relative shrink-0">
        <img
          src={avatarUrl}
          alt=""
          className={`w-9 h-9 rounded-full object-cover border-2 ${
            isMe ? 'border-white' : 'border-[#2563EB]'
          }`}
        />
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
          <Mic className="w-2.5 h-2.5" />
        </span>
      </div>

      {/* Bouton ▶️ Play / ⏸️ Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer shadow-md ${
          isMe
            ? 'bg-white text-[#2563EB] hover:bg-blue-50'
            : 'bg-[#2563EB] text-white hover:bg-blue-700'
        }`}
        title={isPlaying ? 'Pause' : 'Écouter la note vocale'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Barres d'ondes sonores animées + Durée */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[3px] h-7">
          {bars.map((barHeight, i) => {
            const barPct = (i / bars.length) * 100;
            const isPlayed = barPct <= progressPct;
            return (
              <span
                key={i}
                style={{
                  height: `${Math.max(22, isPlaying ? ((barHeight + (i * 13) % 30) % 95) : barHeight)}%`
                }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isMe
                    ? isPlayed
                      ? 'bg-emerald-300'
                      : 'bg-white/45'
                    : isPlayed
                      ? 'bg-[#2563EB]'
                      : 'bg-blue-200'
                }`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold mt-0.5">
          <span className={isMe ? 'text-blue-100' : 'text-slate-500'}>
            🎙️ {isPlaying ? formatAudioSeconds(currentElapsedSec) : formatAudioSeconds(totalSec)}
          </span>
          {message.audioUrl && !message.audioUrl.startsWith('blob:') && (
            <span className={isMe ? 'text-emerald-200' : 'text-emerald-600'}>Lien Audio</span>
          )}
        </div>
      </div>

      {/* Bouton Vitesse 1x / 1.5x / 2x */}
      <button
        type="button"
        onClick={cycleSpeed}
        className={`px-2 py-1 rounded-lg text-[10px] font-black shrink-0 border transition cursor-pointer ${
          isMe
            ? 'bg-blue-800/70 text-white border-white/30 hover:bg-blue-900'
            : 'bg-blue-50 text-[#2563EB] border-blue-200 hover:bg-blue-100'
        }`}
        title="Changer la vitesse de lecture"
      >
        {speed}x
      </button>
    </div>
  );
};

export const WameetChatHub: React.FC<WameetChatHubProps> = ({
  currentUserProfile,
  initialRecipient,
  onOpenShopForMember,
  onOpenProfileForMember
}) => {
  const [threads, setThreads] = useState<WameetChatThread[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_W_THREADS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_THREADS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_W_THREADS, JSON.stringify(threads));
    } catch (e) {}
  }, [threads]);

  const [activeThreadId, setActiveThreadId] = useState<string>(threads[0]?.id || 'thread-awa');
  const [mobileShowChatScreen, setMobileShowChatScreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<WameetChatFilter>('ALL');

  // Saisie SMS
  const [smsText, setSmsText] = useState<string>('');

  // Tiroirs d'envoi dans la barre inférieure : Audio (Direct ou Lien), Image/Vidéo par Lien, Fiche Produit
  const [activeComposerDrawer, setActiveComposerDrawer] = useState<
    'none' | 'voice' | 'media_link' | 'product_card'
  >('none');

  // Enregistrement Vocal Direct & Lien Audio Externe
  const [voiceModeTab, setVoiceModeTab] = useState<'DIRECT_RECORD' | 'EXTERNAL_LINK'>('DIRECT_RECORD');
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [externalAudioUrl, setExternalAudioUrl] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const optimalVoiceMimeRef = useRef<string>('');

  // Envoi Image / Vidéo par Lien
  const [mediaLinkType, setMediaLinkType] = useState<'image' | 'video'>('image');
  const [mediaLinkUrl, setMediaLinkUrl] = useState<string>('');
  const [mediaLinkCaption, setMediaLinkCaption] = useState<string>('');

  // Envoi Fiche Produit dans la discussion
  const [selectedPresetProdId, setSelectedPresetProdId] = useState<string>(PRESET_MINI_SHOP_PRODUCTS[0].id);
  const [customProdName, setCustomProdName] = useState<string>('');
  const [customProdPrice, setCustomProdPrice] = useState<string>('15000');
  const [customProdImageUrl, setCustomProdImageUrl] = useState<string>('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Synchronisation temps réel 100% Firebase Firestore & Storage
  const [isSyncingMessages, setIsSyncingMessages] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCompressingVideo, setIsCompressingVideo] = useState<boolean>(false);
  const [videoCompressionProgress, setVideoCompressionProgress] = useState<number>(0);
  const QUICK_EMOJIS = ['❤️', '🔥', '👏', '😂', '👍', '🙏', '🎉', '🛍️', '💰', '📦', '🤝', '✨', '👋', '💯'];

  // =========================================================================
  // APPELS EN DIRECT WEBRTC P2P (0 STOCKAGE / 0 BANDE-PASSANTE SERVEUR)
  // =========================================================================
  interface ActiveCallState {
    callId: string;
    mode: 'caller' | 'callee';
    callType: WameetCallType;
    remoteUser: WameetCallParticipant;
  }
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<WameetCallDocument | null>(null);
  const incomingRingtoneRef = useRef<WameetRingtonePlayer | null>(null);

  // Écouteur en temps réel des appels entrants (Firestore /calls)
  useEffect(() => {
    if (!currentUserProfile.handle) return;
    const ringtone = new WameetRingtonePlayer();
    incomingRingtoneRef.current = ringtone;

    const unsubscribe = subscribeToIncomingCalls(
      currentUserProfile.handle,
      (call) => {
        if (call) {
          setIncomingCall(call);
          ringtone.playRingtone();
        } else {
          setIncomingCall(null);
          ringtone.stop();
        }
      }
    );

    return () => {
      ringtone.stop();
      unsubscribe();
    };
  }, [currentUserProfile.handle]);

  const handleStartCall = (callType: WameetCallType) => {
    if (!activeThread) return;
    playTapBeep();
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveCall({
      callId,
      mode: 'caller',
      callType,
      remoteUser: {
        name: activeThread.memberName,
        handle: activeThread.memberHandle,
        avatar: activeThread.memberAvatar
      }
    });
  };

  // Si on arrive depuis un Reel ou le Mur avec un destinataire précis (initialRecipient)
  useEffect(() => {
    if (!initialRecipient) return;
    const existing = threads.find(
      t =>
        t.memberHandle.toLowerCase() === initialRecipient.handle.toLowerCase() ||
        t.memberName.toLowerCase() === initialRecipient.name.toLowerCase()
    );
    if (existing) {
      setActiveThreadId(existing.id);
      setMobileShowChatScreen(true);
    } else {
      const newThreadId = `thread-${Date.now()}`;
      const newThread: WameetChatThread = {
        id: newThreadId,
        memberName: initialRecipient.name,
        memberHandle: initialRecipient.handle,
        memberAvatar: initialRecipient.avatarUrl,
        memberBadge: '🌟 Membre Wameet',
        isOnline: true,
        unreadCount: 0,
        hasVoiceNote: false,
        hasShoppingCard: false,
        lastActivityLabel: "À l'instant",
        messages: [
          {
            id: `msg-init-${Date.now()}`,
            sender: 'them',
            createdAt: "À l'instant",
            type: 'text',
            text: `Salut ${currentUserProfile.name} ! Ravi d'échanger avec toi en direct sur Wameet 🟢`
          }
        ]
      };
      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(newThreadId);
      setMobileShowChatScreen(true);
    }
  }, [initialRecipient, currentUserProfile.name]);

  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      if (activeFilter === 'VOICE' && !t.hasVoiceNote) return false;
      if (activeFilter === 'SHOPPING' && !t.hasShoppingCard) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.memberName.toLowerCase().includes(q) ||
          t.memberHandle.toLowerCase().includes(q) ||
          t.memberBadge.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [threads, activeFilter, searchQuery]);

  const activeThread = useMemo(
    () => threads.find(t => t.id === activeThreadId) || threads[0],
    [threads, activeThreadId]
  );

  // =========================================================================
  // 1. ÉCOUTEUR FIRESTORE TEMPS RÉEL (onSnapshot) DE LA CONVERSATION ACTIVE
  // =========================================================================
  useEffect(() => {
    if (!activeThread || !currentUserProfile.handle) return;
    const chatId = getDeterministicChatId(currentUserProfile.handle, activeThread.memberHandle);

    setIsSyncingMessages(true);
    // Marquer immédiatement les messages reçus comme lus (désactive le fallback SMS de 3 min)
    markChatMessagesAsRead(chatId, currentUserProfile.handle);

    const unsubscribe = subscribeToChatMessages(
      chatId,
      currentUserProfile.handle,
      firestoreMessages => {
        setIsSyncingMessages(false);
        // Marquer comme lus quand de nouveaux messages arrivent pendant que le chat est ouvert
        markChatMessagesAsRead(chatId, currentUserProfile.handle);
        if (firestoreMessages.length > 0) {
          setThreads(prev =>
            prev.map(t =>
              t.id === activeThread.id
                ? {
                    ...t,
                    messages: firestoreMessages,
                    lastActivityLabel:
                      firestoreMessages[firestoreMessages.length - 1].createdAt || t.lastActivityLabel,
                    hasVoiceNote: firestoreMessages.some(m => m.type === 'voice'),
                    hasShoppingCard: firestoreMessages.some(m => m.type === 'product')
                  }
                : t
            )
          );
        }
      },
      err => {
        setIsSyncingMessages(false);
        console.warn('[WAMEET CHAT] Erreur Firestore messages sync:', err);
      }
    );

    return () => unsubscribe();
  }, [activeThread?.id, activeThread?.memberHandle, currentUserProfile.handle]);

  // =========================================================================
  // 2. ÉCOUTEUR FIRESTORE TEMPS RÉEL (onSnapshot) DES FILS DE L'UTILISATEUR
  // =========================================================================
  useEffect(() => {
    if (!currentUserProfile.handle) return;
    const unsubscribe = subscribeToUserChats(currentUserProfile.handle, remoteThreads => {
      if (remoteThreads.length > 0) {
        setThreads(prev => {
          const map = new Map<string, WameetChatThread>();
          prev.forEach(t => map.set(t.memberHandle.toLowerCase(), t));
          remoteThreads.forEach(rt => {
            const existing = map.get(rt.memberHandle.toLowerCase());
            if (existing) {
              map.set(rt.memberHandle.toLowerCase(), {
                ...existing,
                lastActivityLabel: rt.lastActivityLabel || existing.lastActivityLabel,
                hasVoiceNote: existing.hasVoiceNote || rt.hasVoiceNote,
                hasShoppingCard: existing.hasShoppingCard || rt.hasShoppingCard
              });
            } else {
              map.set(rt.memberHandle.toLowerCase(), rt);
            }
          });
          return Array.from(map.values());
        });
      }
    });

    return () => unsubscribe();
  }, [currentUserProfile.handle]);

  const handleSelectThread = (threadId: string) => {
    playTapBeep();
    setActiveThreadId(threadId);
    setMobileShowChatScreen(true);
    setThreads(prev =>
      prev.map(t => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
    );
  };

  // =========================================================================
  // 3. ENVOI DE MESSAGE DANS FIRESTORE + STORAGE (AVEC TTL EXPIRE-AT 7 JOURS)
  // =========================================================================
  const sendChatMessageToFirestore = async (params: {
    type: 'text' | 'voice' | 'image' | 'video' | 'product' | 'gift';
    text?: string;
    mediaUrl?: string;
    imageFile?: File | Blob;
    videoFile?: File | Blob;
    audioBlob?: Blob;
    audioDurationSec?: number;
    waveformBars?: number[];
    productCard?: WameetChatProductCard;
    giftProduct?: any;
  }) => {
    if (!activeThread) return;
    const chatId = getDeterministicChatId(currentUserProfile.handle, activeThread.memberHandle);
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Rendu optimiste instantané dans l'interface
    let optimisticMediaUrl = params.mediaUrl;
    if (params.imageFile) optimisticMediaUrl = URL.createObjectURL(params.imageFile);
    if (params.videoFile) optimisticMediaUrl = URL.createObjectURL(params.videoFile);

    const optimisticMsg: WameetChatMessage = {
      id: `msg-opt-${Date.now()}`,
      chatId,
      sender: 'me',
      createdAt: nowTime,
      type: params.type,
      text: params.text,
      mediaUrl: optimisticMediaUrl,
      audioUrl: params.audioBlob ? URL.createObjectURL(params.audioBlob) : undefined,
      audioDurationSec: params.audioDurationSec,
      waveformBars: params.waveformBars,
      productCard: params.productCard,
      giftProduct: params.giftProduct,
      daysRemaining: 7,
      isEphemeral: true
    };


    setThreads(prev =>
      prev.map(t => {
        if (t.id !== activeThread.id) return t;
        return {
          ...t,
          lastActivityLabel: nowTime,
          hasVoiceNote: t.hasVoiceNote || params.type === 'voice',
          hasShoppingCard: t.hasShoppingCard || params.type === 'product',
          messages: [...t.messages, optimisticMsg]
        };
      })
    );

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);

    // Envoi réel vers Firebase Cloud Firestore & Storage
    try {
      await sendWameetMessage({
        chatId,
        senderHandle: currentUserProfile.handle,
        senderName: currentUserProfile.name,
        senderAvatar: currentUserProfile.avatarUrl,
        recipientHandle: activeThread.memberHandle,
        recipientName: activeThread.memberName,
        recipientAvatar: activeThread.memberAvatar,
        recipientBadge: activeThread.memberBadge,
        recipientPhone: activeThread.memberPhone || undefined,
        type: params.type,
        text: params.text,
        mediaUrl: params.mediaUrl,
        imageFile: params.imageFile,
        videoFile: params.videoFile,
        audioBlob: params.audioBlob,
        audioDurationSec: params.audioDurationSec,
        waveformBars: params.waveformBars,
        productCard: params.productCard,
        giftProduct: params.giftProduct
      });

    } catch (err: any) {
      console.warn('[WAMEET CHAT] Erreur persistance Firestore/Storage :', err);
      if (err?.message?.includes('trop longue')) {
        showToast('Vidéo trop longue pour le chat rapide. Veuillez raccourcir la vidéo.');
      }
    }
  };

  // Envoi d'un SMS classique
  const handleSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsText.trim() || !activeThread) return;
    playValidationBeep();
    const textToSend = smsText.trim();
    setSmsText('');
    setShowEmojiPicker(false);
    sendChatMessageToFirestore({
      type: 'text',
      text: textToSend
    });
  };

  // Upload d'une Image locale (Appareil Photo / Galerie) vers Firebase Storage
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeThread) return;
    playValidationBeep();
    showToast('📷 Optimisation & envoi de l\'image en cours...');
    sendChatMessageToFirestore({
      type: 'image',
      imageFile: file,
      text: ''
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload d'une Nano-Vidéo locale (Galerie / Caméra native) avec encodage 480p côté client
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeThread) return;
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';

    playValidationBeep();
    setIsCompressingVideo(true);
    setVideoCompressionProgress(0);
    showToast('🎬 Encodage vidéo optimisé... (0%)');

    try {
      const compressed = await compressAndTrimVideo(file, {
        maxDurationSec: 30,
        targetMaxDimension: 854,
        targetBitrate: 600_000,
        maxSizeLimitBytes: 5 * 1024 * 1024,
        onProgress: pct => setVideoCompressionProgress(pct)
      });

      // Blocage anti-abus strict si > 5 Mo
      if (compressed.sizeBytes > 5 * 1024 * 1024) {
        showToast('Vidéo trop longue pour le chat rapide. Veuillez raccourcir la vidéo.');
        setIsCompressingVideo(false);
        return;
      }

      showToast(`🎬 Vidéo optimisée (${Math.round(compressed.sizeBytes / 1024)} Ko, ${compressed.reductionRatio}) ! Envoi...`);

      await sendChatMessageToFirestore({
        type: 'video',
        videoFile: compressed.file,
        text: ''
      });
    } catch (err: any) {
      console.warn('[WAMEET CHAT] Erreur compression nano-vidéo :', err);
      // Règle 3 Anti-Abus : Toast exact exigé
      showToast('Vidéo trop longue pour le chat rapide. Veuillez raccourcir la vidéo.');
    } finally {
      setIsCompressingVideo(false);
      setVideoCompressionProgress(0);
    }
  };

  // Démarrer / Arrêter l'enregistrement d'une Note Vocale Directe
  const handleStartDirectRecording = async () => {
    playTapBeep();
    setRecordingSeconds(0);
    setIsRecordingVoice(true);
    recordedChunksRef.current = [];

    if (recordIntervalRef.current) window.clearInterval(recordIntervalRef.current);
    recordIntervalRef.current = window.setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = getOptimalVoiceRecorderMimeType();
        optimalVoiceMimeRef.current = mimeType;
        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = event => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.start();
      }
    } catch (e) {
      // Si micro non autorisé ou absent, le chronomètre continue en mode note vocale légère simulée
    }
  };

  const handleStopAndSendDirectRecording = () => {
    playValidationBeep();
    if (recordIntervalRef.current) {
      window.clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    const finalDuration = Math.max(3, recordingSeconds);
    setIsRecordingVoice(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const rec = mediaRecorderRef.current;
      rec.onstop = () => {
        rec.stream.getTracks().forEach(track => track.stop());
        const chosenMime = optimalVoiceMimeRef.current || rec.mimeType || 'audio/mp4';
        const blob =
          recordedChunksRef.current.length > 0
            ? new Blob(recordedChunksRef.current, { type: chosenMime })
            : undefined;

        sendChatMessageToFirestore({
          type: 'voice',
          audioBlob: blob,
          audioDurationSec: finalDuration,
          waveformBars: Array.from({ length: 20 }).map(() => Math.floor(30 + Math.random() * 65))
        });
        setActiveComposerDrawer('none');
        showToast(`🎙️ Note vocale (${formatAudioSeconds(finalDuration)}) synchronisée sur Firestore !`);
      };
      rec.stop();
    } else {
      sendChatMessageToFirestore({
        type: 'voice',
        audioDurationSec: finalDuration,
        waveformBars: Array.from({ length: 20 }).map(() => Math.floor(30 + Math.random() * 65))
      });
      setActiveComposerDrawer('none');
      showToast(`🎙️ Note vocale (${formatAudioSeconds(finalDuration)}) envoyée !`);
    }
  };

  // Envoi d'un Lien Audio Externe (Vocaroo, Drive, MP3)
  const handleSendExternalAudioLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalAudioUrl.trim()) return;
    playValidationBeep();
    sendChatMessageToFirestore({
      type: 'voice',
      mediaUrl: externalAudioUrl.trim(),
      audioDurationSec: 22,
      waveformBars: [45, 80, 65, 90, 50, 72, 85, 60, 95, 55, 48, 82, 70, 62, 78, 52, 68, 45, 38, 30]
    });
    setExternalAudioUrl('');
    setActiveComposerDrawer('none');
    showToast('🎙️ Lien Audio synchronisé dans la conversation !');
  };

  // Envoi d'une Image ou Vidéo YouTube Furtive par Lien
  const handleSendMediaLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaLinkUrl.trim()) return;
    playValidationBeep();
    const isYt = Boolean(extractYouTubeVideoId(mediaLinkUrl.trim()));
    const finalType: 'image' | 'video' =
      mediaLinkType === 'video' || isYt ? 'video' : 'image';

    sendChatMessageToFirestore({
      type: finalType,
      mediaUrl: mediaLinkUrl.trim(),
      text: mediaLinkCaption.trim() || undefined
    });
    setMediaLinkUrl('');
    setMediaLinkCaption('');
    setActiveComposerDrawer('none');
    showToast(
      finalType === 'video'
        ? '🎬 Vidéo synchronisée (Lecture directe dans la bulle) !'
        : '🖼️ Image synchronisée par lien direct !'
    );
  };

  // Envoi d'une Fiche Produit Interactive dans la Discussion
  const handleSendProductCardInChat = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    let card: WameetChatProductCard;
    if (selectedPresetProdId !== 'custom') {
      const found =
        PRESET_MINI_SHOP_PRODUCTS.find(p => p.id === selectedPresetProdId) ||
        PRESET_MINI_SHOP_PRODUCTS[0];
      card = { ...found };
    } else {
      card = {
        id: `chat-prod-${Date.now()}`,
        name: customProdName.trim() || 'Offre Spéciale Wameet Shop',
        priceFcfa: Number(customProdPrice) || 15000,
        imageUrl:
          customProdImageUrl.trim() ||
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80',
        badge: '🛍️ Offre Directe Chat'
      };
    }

    sendChatMessageToFirestore({
      type: 'product',
      text: `Voici la fiche produit de mon Mini-Shop Wameet :`,
      productCard: card
    });
    setActiveComposerDrawer('none');
    showToast(`🛍️ Fiche produit "${card.name}" synchronisée dans le chat !`);
  };

  // Aperçu du dernier message pour la colonne de gauche
  const getLastMessagePreview = (thread: WameetChatThread): string => {
    const last = thread.messages[thread.messages.length - 1];
    if (!last) return 'Démarrer la discussion...';
    if (last.type === 'voice') {
      return `🎙️ Audio (${formatAudioSeconds(last.audioDurationSec || 18)})`;
    }
    if (last.type === 'product') {
      return `🛍️ Fiche Produit : ${last.productCard?.name || 'Produit Shop'}`;
    }
    if (last.type === 'video') {
      return `🎬 Vidéo partagée ${last.text ? `• ${last.text}` : ''}`;
    }
    if (last.type === 'image') {
      return `🖼️ Photo partagée ${last.text ? `• ${last.text}` : ''}`;
    }
    return last.text || 'Message';
  };

  return (
    <div className="space-y-4 relative">
      {/* Notification Toast Flottante */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-black shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Bannière de progression encodage nano-vidéo côté client */}
      {isCompressingVideo && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-xs font-black shadow-2xl border-2 border-white flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin shrink-0 text-amber-300" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span>Encodage vidéo optimisé... ({videoCompressionProgress}%)</span>
              <span className="px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-black">{videoCompressionProgress}%</span>
            </div>
            <span className="text-[10px] text-blue-200 font-semibold">Max 30s • Débit 600 kbps • Éphémère 7 jours</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          APPEL EN COURS (ÉCRAN PLEIN ÉCRAN WEBRTC DIRECT P2P)
         ===================================================================== */}
      {activeCall && (
        <WameetCallScreen
          callId={activeCall.callId}
          mode={activeCall.mode}
          callType={activeCall.callType}
          currentUser={{
            name: currentUserProfile.name,
            handle: currentUserProfile.handle,
            avatar: currentUserProfile.avatarUrl
          }}
          remoteUser={activeCall.remoteUser}
          onClose={() => setActiveCall(null)}
        />
      )}

      {/* =====================================================================
          POPUP D'APPEL ENTRANT STYLISÉE (WEBRTC PEER-TO-PEER)
         ===================================================================== */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm rounded-[32px] bg-slate-900 border-2 border-emerald-500/50 shadow-2xl p-6 text-white text-center space-y-6 relative overflow-hidden">
            {/* Halos d'ambiance */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="relative inline-block">
                <img
                  src={incomingCall.caller.avatar}
                  alt={incomingCall.caller.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-emerald-400 mx-auto shadow-xl ring-4 ring-emerald-500/20"
                />
                <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping pointer-events-none" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
                  {incomingCall.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                  <span>Appel {incomingCall.type === 'video' ? 'Vidéo' : 'Vocal'} Wameet</span>
                </div>
                <h3 className="text-xl font-black text-white">{incomingCall.caller.name}</h3>
                <p className="text-xs font-semibold text-blue-300">{incomingCall.caller.handle}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">
                  🔒 Connexion directe WebRTC (0 serveur / 0 stockage)
                </p>
              </div>
            </div>

            {/* Boutons d'action Décrocher / Rejeter */}
            <div className="flex items-center justify-center gap-8 pt-2 relative z-10">
              {/* Rejeter */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (incomingRingtoneRef.current) incomingRingtoneRef.current.stop();
                  declineIncomingCall(incomingCall.callId);
                  setIncomingCall(null);
                }}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg transition">
                  <PhoneOff className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">Refuser</span>
              </button>

              {/* Décrocher */}
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  if (incomingRingtoneRef.current) incomingRingtoneRef.current.stop();
                  setActiveCall({
                    callId: incomingCall.callId,
                    mode: 'callee',
                    callType: incomingCall.type,
                    remoteUser: incomingCall.caller
                  });
                  setIncomingCall(null);
                }}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-xl ring-4 ring-emerald-400/40 animate-bounce transition">
                  {incomingCall.type === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                </div>
                <span className="text-[11px] font-bold text-emerald-300 group-hover:text-emerald-200">Décrocher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. CARROUSEL HORIZONTAL DES MEMBRES EN LIGNE MAINTENANT SUR WAMEET (🟢)
         ===================================================================== */}
      <div className="rounded-[28px] border-2 border-blue-600/90 ring-4 ring-blue-500/10 bg-white/95 backdrop-blur-xl p-4 shadow-[0_12px_40px_-10px_rgba(37,99,235,0.22)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
              🟢 Membres en Ligne sur Wameet (Chat 1-Clic après le travail)
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
            {threads.length} actifs maintenant
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
          {threads.map(member => {
            const isSelected = member.id === activeThread?.id;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSelectThread(member.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border-2 transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                    : 'bg-blue-50/50 hover:bg-blue-50 text-slate-900 border-blue-200'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={member.memberAvatar}
                    alt={member.memberName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white ring-2 ring-emerald-400"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black leading-tight">{member.memberName}</div>
                  <div
                    className={`text-[10px] font-bold truncate max-w-[120px] ${
                      isSelected ? 'text-blue-100' : 'text-[#2563EB]'
                    }`}
                  >
                    {member.memberBadge}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. LE COCKPIT "SUPRA-WAMEET" À BORDURES STYLISÉES
             (rounded-[32px] border-2 border-blue-600 bg-white shadow-2xl overflow-hidden)
         ===================================================================== */}
      <div className="rounded-[32px] border-2 border-blue-600 ring-4 ring-blue-500/10 bg-white shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px]">
        {/* =====================================================================
            BANNIÈRE MOTEUR D'AUTO-SUPPRESSION (ANTI-COÛTS) & 100% FIREBASE SYNC
           ===================================================================== */}
        <div className="col-span-12 px-4 py-2.5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b-2 border-blue-600">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs shrink-0">🔥</span>
            <div className="text-[11px] leading-tight truncate">
              <strong className="font-black text-amber-300 uppercase tracking-wider">Chat Éphémère (7 Jours) : </strong>
              <span className="text-slate-300 font-medium">Auto-suppression programmée des messages et médias pour zéro surcoût (Firestore TTL + Storage Lifecycle).</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>100% Firebase Sync (onSnapshot)</span>
            </span>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            COLONNE GAUCHE : LISTE DES DISCUSSIONS, RECHERCHE & FILTRES
           ------------------------------------------------------------------- */}
        <div
          className={`md:col-span-5 border-r-2 border-blue-100 flex flex-col bg-slate-50/50 ${
            mobileShowChatScreen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* En-tête Liste & Recherche */}
          <div className="p-4 bg-white border-b border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Discussions Wameet</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 text-[10px] font-black">
                SMS & Audio 🎙️
              </span>
            </div>

            {/* Barre de Recherche Instantanée */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un membre, commerçant, formateur..."
                className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            {/* Filtres : 💬 Toutes les discussions | 🎙️ Messages Vocaux | 🛍️ Discussions Shopping */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveFilter('ALL');
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap transition cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-blue-50 text-slate-700 hover:bg-blue-100'
                }`}
              >
                💬 Toutes
              </button>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveFilter('VOICE');
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap transition cursor-pointer ${
                  activeFilter === 'VOICE'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-blue-50 text-slate-700 hover:bg-blue-100'
                }`}
              >
                🎙️ Messages Vocaux
              </button>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveFilter('SHOPPING');
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap transition cursor-pointer ${
                  activeFilter === 'SHOPPING'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-blue-50 text-slate-700 hover:bg-blue-100'
                }`}
              >
                🛍️ Discussions Shopping
              </button>
            </div>
          </div>

          {/* Liste des fils de discussion */}
          <div className="flex-1 overflow-y-auto divide-y divide-blue-100/80">
            {filteredThreads.map(thread => {
              const isSelected = thread.id === activeThread?.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/90 border-l-4 border-l-[#2563EB]'
                      : 'bg-white hover:bg-blue-50/40'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={thread.memberAvatar}
                      alt={thread.memberName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#2563EB]"
                    />
                    {thread.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {thread.memberName}
                      </span>
                      <span className="text-[10px] font-bold text-[#2563EB] shrink-0">
                        {thread.lastActivityLabel}
                      </span>
                    </div>

                    <div className="text-[10px] font-black text-[#2563EB] truncate mt-0.5">
                      {thread.memberBadge}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[11px] font-semibold text-slate-600 truncate">
                        {getLastMessagePreview(thread)}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shrink-0 shadow-xs">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* -------------------------------------------------------------------
            COLONNE DROITE : ÉCRAN DE CONVERSATION DIRECTE (SMS, AUDIO & LIENS)
           ------------------------------------------------------------------- */}
        <div
          className={`md:col-span-7 flex flex-col bg-gradient-to-b from-blue-50/30 via-white to-blue-50/40 ${
            !mobileShowChatScreen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeThread && (
            <>
              {/* EN-TÊTE DE CHAT STYLISÉ */}
              <div className="px-4 py-3.5 bg-white border-b-2 border-blue-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileShowChatScreen(false)}
                    className="md:hidden p-1.5 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-200 cursor-pointer"
                    title="Retour aux discussions"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="relative shrink-0">
                    <img
                      src={activeThread.memberAvatar}
                      alt={activeThread.memberName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#2563EB] ring-2 ring-emerald-400/50"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {activeThread.memberName}
                      </h4>
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-black border border-blue-200">
                        {activeThread.memberBadge}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 flex-wrap">
                      <span>🟢 En ligne • Actif sur Wameet</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-amber-600 text-[10px] font-black flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200" title="Messages auto-supprimés après 7 jours via Google Cloud Firestore TTL">
                        <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                        <span>Éphémère 7j</span>
                      </span>
                      {isSyncingMessages && (
                        <span className="text-blue-600 text-[10px] flex items-center gap-1 animate-spin" title="Synchronisation Firestore...">
                          <RefreshCw className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Boutons d'action de l'en-tête : 📞 Vocal | 📹 Vidéo | 🛍️ Voir sa boutique | 👤 Voir son profil */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                  {/* Bouton Appel Vocal P2P */}
                  <button
                    type="button"
                    onClick={() => handleStartCall('audio')}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 text-[11px] font-black transition cursor-pointer flex items-center gap-1 shadow-2xs group"
                    title="Lancer un appel vocal direct P2P (WebRTC • 0 stockage)"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                    <span className="hidden sm:inline">📞 Vocal</span>
                  </button>

                  {/* Bouton Appel Vidéo P2P */}
                  <button
                    type="button"
                    onClick={() => handleStartCall('video')}
                    className="px-2.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-black transition cursor-pointer flex items-center gap-1 shadow-2xs group"
                    title="Lancer un appel vidéo direct P2P (WebRTC 720p • 0 stockage)"
                  >
                    <Video className="w-3.5 h-3.5 text-white" />
                    <span className="hidden sm:inline">📹 Vidéo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      if (onOpenShopForMember) {
                        onOpenShopForMember(undefined, activeThread.memberHandle);
                      } else {
                        showToast(`🛍️ Ouverture de la boutique de ${activeThread.memberName}`);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-[#2563EB] text-[#2563EB] hover:text-white border border-blue-300 text-[11px] font-black transition cursor-pointer flex items-center gap-1"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">🛍️ Boutique</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      if (onOpenProfileForMember) {
                        onOpenProfileForMember(activeThread.memberName, activeThread.memberHandle);
                      } else {
                        showToast(`👤 Profil Wameet de ${activeThread.memberName}`);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-slate-700 border border-blue-200 text-[11px] font-black transition cursor-pointer flex items-center gap-1"
                  >
                    <User className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="hidden md:inline">👤 Profil</span>
                  </button>
                </div>
              </div>

              {/* Bannière contextuelle si on vient d'un Reel */}
              {initialRecipient &&
                initialRecipient.contextReelTitle &&
                activeThread.memberHandle.toLowerCase() ===
                  initialRecipient.handle.toLowerCase() && (
                  <div className="px-4 py-2 bg-blue-50/90 border-b border-blue-200 text-[11px] font-bold text-[#2563EB] flex items-center justify-between">
                    <span>
                      🎬 Discussion lancée depuis le Reel :{' '}
                      <strong>« {initialRecipient.contextReelTitle} »</strong>
                    </span>
                  </div>
                )}

              {/* ZONE DES MESSAGES (BULLES HAUT DE GAMME BLEU ROYAL & BLANC PUR) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[450px]">
                {/* Sceau de Chiffrement de bout en bout Wameet (Prompt 32) */}
                <EncryptionNotice chatId={activeThread.id} />

                {activeThread.messages.map(msg => {
                  const isMe = msg.sender === 'me';
                  const isYt = msg.mediaUrl ? Boolean(extractYouTubeVideoId(msg.mediaUrl)) : false;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[88%] sm:max-w-[78%] p-3.5 ${
                          isMe
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-none shadow-md'
                            : 'bg-white border-2 border-blue-100 text-slate-800 rounded-2xl rounded-tl-none shadow-sm'
                        }`}
                      >
                        {/* 1. Texte SMS */}
                        {msg.text && (
                          <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line">
                            {msg.text}
                          </p>
                        )}

                        {/* 2. Note Vocale / Audio (WameetVoiceNoteBubble) */}
                        {msg.type === 'voice' && (
                          <WameetVoiceNoteBubble
                            message={msg}
                            isMe={isMe}
                            avatarUrl={
                              isMe ? currentUserProfile.avatarUrl : activeThread.memberAvatar
                            }
                          />
                        )}

                        {/* 3. Image par Lien */}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border-2 border-white/40 bg-slate-100">
                            <img
                              src={msg.mediaUrl}
                              alt="Média partagé"
                              className="w-full max-h-64 object-cover"
                            />
                          </div>
                        )}

                        {/* 4. Vidéo (YouTube Furtif ou Nano-Vidéo HTML5 Native) */}
                        {msg.type === 'video' && msg.mediaUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border-2 border-white/40 bg-black min-w-[250px] sm:min-w-[310px]">
                            {isYt ? (
                              <StealthYouTubePlayer
                                videoUrl={msg.mediaUrl}
                                title="Vidéo Wameet Chat"
                                hideBranding={true}
                              />
                            ) : (
                              <div className="relative group">
                                <video
                                  src={msg.mediaUrl}
                                  controls
                                  playsInline
                                  preload="none"
                                  className="w-full max-h-60 object-contain bg-black"
                                />
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-black text-white flex items-center gap-1 border border-white/20 pointer-events-none">
                                  <span>🎬 480p Nano-Vidéo</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5. Fiche Produit Interactive ("Envoyer une Fiche Produit dans la Discussion") */}
                        {msg.type === 'product' && msg.productCard && (
                          <div className="mt-2 rounded-2xl border-2 border-[#2563EB] bg-white text-slate-900 p-3 shadow-lg space-y-2.5 min-w-[230px]">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={msg.productCard.imageUrl}
                                alt={msg.productCard.name}
                                className="w-14 h-14 rounded-xl object-cover border border-blue-200 shrink-0"
                              />
                              <div className="min-w-0">
                                {msg.productCard.badge && (
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] text-[9px] font-black border border-blue-200 mb-0.5">
                                    {msg.productCard.badge}
                                  </span>
                                )}
                                <div className="text-xs font-black text-slate-900 truncate">
                                  {msg.productCard.name}
                                </div>
                                <div className="text-sm font-black text-[#2563EB]">
                                  {msg.productCard.priceFcfa.toLocaleString('fr-FR')} FCFA
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                playValidationBeep();
                                if (onOpenShopForMember && msg.productCard) {
                                  onOpenShopForMember(msg.productCard, activeThread.memberHandle);
                                } else {
                                  showToast(
                                    `⚡ Ouverture de "${msg.productCard?.name}" dans Wameet Shop !`
                                  );
                                }
                              }}
                              className="w-full py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>⚡ Acheter dans Wameet Shop</span>
                            </button>
                          </div>
                        )}

                        {/* 6. Cadeau Mystère Verrouillé Wameet (Prompt 22 : LockedGiftBubble) */}
                        {msg.type === 'gift' && (
                          <div className="mt-2">
                            <LockedGiftBubble
                              senderName={
                                msg.senderName ||
                                (isMe ? currentUserProfile.name : activeThread.memberName) ||
                                'Ibrahim'
                              }
                              giftProduct={msg.giftProduct}
                              isMe={isMe}
                              timestamp={msg.createdAt}
                              onUnlocked={(coords) => {
                                showToast(`📍 GPS transmis au livreur NaNa Express (${coords.formattedCoords})`);
                              }}
                              onTrackDelivery={() => {
                                showToast(`🛵 Livreur en route vers votre adresse !`);
                              }}
                              onThankSender={(name) => {
                                showToast(`❤️ Remerciement envoyé à ${name} !`);
                              }}
                            />
                          </div>
                        )}


                        {/* Pied de bulle : Heure + Badge Éphémère (Anti-Coûts) + Double coche ✓✓ */}
                        <div
                          className={`flex items-center justify-between gap-2 mt-1.5 pt-1 border-t ${
                            isMe ? 'border-white/15 text-blue-100' : 'border-slate-100 text-slate-400'
                          } text-[10px] font-semibold`}
                        >
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                              isMe
                                ? 'bg-blue-800/80 text-blue-100 border border-white/20'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                            title="Auto-suppression programmée dans 7 jours (TTL Firestore)"
                          >
                            <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                            <span>{msg.daysRemaining !== undefined ? `${msg.daysRemaining}j` : '7j'}</span>
                          </span>

                          <div className="flex items-center gap-1 text-[10px]">
                            <span>{msg.createdAt}</span>
                            {isMe && <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* =============================================================
                  PANNEAUX COULISSANTS AU-DESSUS DE LA BARRE DE SAISIE :
                  1) 🎙️ Audio (Direct ou Lien Externe)
                  2) 🖼️ Image / Vidéo par Lien Direct S3 ou Web
                  3) 🛍️ Envoyer une Fiche Produit dans la Discussion
                 ============================================================= */}
              {activeComposerDrawer === 'voice' && (
                <div className="p-4 bg-blue-50/95 border-t-2 border-[#2563EB] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVoiceModeTab('DIRECT_RECORD')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                          voiceModeTab === 'DIRECT_RECORD'
                            ? 'bg-[#2563EB] text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-blue-200'
                        }`}
                      >
                        🎙️ Mode Direct (Note Vocale)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceModeTab('EXTERNAL_LINK')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                          voiceModeTab === 'EXTERNAL_LINK'
                            ? 'bg-[#2563EB] text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-blue-200'
                        }`}
                      >
                        🔗 Mode Lien Audio (Vocaroo / MP3)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveComposerDrawer('none')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {voiceModeTab === 'DIRECT_RECORD' ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border-2 border-blue-200">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isRecordingVoice
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-blue-100 text-[#2563EB]'
                          }`}
                        >
                          <Mic className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            {isRecordingVoice
                              ? `🔴 Enregistrement en cours... ${formatAudioSeconds(recordingSeconds)}`
                              : 'Prêt à enregistrer votre note vocale Wameet'}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            Ondes sonores interactives + vitesse 1x / 1.5x / 2x
                          </div>
                        </div>
                      </div>

                      {!isRecordingVoice ? (
                        <button
                          type="button"
                          onClick={handleStartDirectRecording}
                          className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer"
                        >
                          🎙️ Démarrer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStopAndSendDirectRecording}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Envoyer l'Audio</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSendExternalAudioLink} className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={externalAudioUrl}
                        onChange={e => setExternalAudioUrl(e.target.value)}
                        placeholder="Coller un lien audio (https://vocaroo.com/... ou .mp3)"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-white border-2 border-blue-300 text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer"
                      >
                        Envoyer
                      </button>
                    </form>
                  )}
                </div>
              )}

              {activeComposerDrawer === 'media_link' && (
                <form
                  onSubmit={handleSendMediaLink}
                  className="p-4 bg-blue-50/95 border-t-2 border-[#2563EB] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaLinkType('image')}
                        className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer ${
                          mediaLinkType === 'image'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-white text-slate-700 border border-blue-200'
                        }`}
                      >
                        🖼️ Photo / Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaLinkType('video')}
                        className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer ${
                          mediaLinkType === 'video'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-white text-slate-700 border border-blue-200'
                        }`}
                      >
                        🎬 Vidéo (Galerie / YouTube)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveComposerDrawer('none')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {mediaLinkType === 'image' ? (
                    <div className="space-y-2">
                      <input
                        id="chat-media-image-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                setMediaLinkUrl(ev.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      {!mediaLinkUrl ? (
                        <button
                          type="button"
                          onClick={() => document.getElementById('chat-media-image-file')?.click()}
                          className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-blue-300 bg-white hover:bg-blue-50 flex items-center justify-center gap-2 text-xs font-black text-[#2563EB] cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Choisir une photo de la galerie</span>
                        </button>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-white border border-blue-200 flex items-center gap-3">
                          <img
                            src={mediaLinkUrl}
                            alt="Aperçu"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                              Photo prête ✓
                            </span>
                            <button
                              type="button"
                              onClick={() => document.getElementById('chat-media-image-file')?.click()}
                              className="text-[10px] font-bold text-[#2563EB] hover:underline block mt-0.5 cursor-pointer"
                            >
                              Changer de photo
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMediaLinkUrl('')}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mediaLinkCaption}
                          onChange={e => setMediaLinkCaption(e.target.value)}
                          placeholder="Légende (optionnel)..."
                          className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-xs font-medium text-slate-900 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!mediaLinkUrl}
                          className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer shrink-0"
                        >
                          Envoyer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="url"
                          required
                          value={mediaLinkUrl}
                          onChange={e => setMediaLinkUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=... ou .mp4"
                          className="px-3.5 py-2 rounded-xl bg-white border-2 border-blue-300 text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={mediaLinkCaption}
                            onChange={e => setMediaLinkCaption(e.target.value)}
                            placeholder="Légende (optionnel)..."
                            className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-xs font-medium text-slate-900 focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer shrink-0"
                          >
                            Envoyer
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-blue-200">
                        <span className="text-[11px] font-bold text-slate-600">
                          📱 Ou téléversez une vidéo de votre galerie (480p • &lt; 3 Mo) :
                        </span>
                        <button
                          type="button"
                          disabled={isCompressingVideo}
                          onClick={() => {
                            playTapBeep();
                            videoFileInputRef.current?.click();
                            setActiveComposerDrawer('none');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>🎬 Choisir de la Galerie</span>
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}

              {activeComposerDrawer === 'product_card' && (
                <form
                  onSubmit={handleSendProductCardInChat}
                  className="p-4 bg-blue-50/95 border-t-2 border-[#2563EB] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#2563EB] uppercase tracking-wider">
                      🛍️ Envoyer une Fiche Produit dans la Discussion (1-Clic)
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveComposerDrawer('none')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedPresetProdId}
                      onChange={e => setSelectedPresetProdId(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white border-2 border-blue-300 text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      {PRESET_MINI_SHOP_PRODUCTS.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} • {p.priceFcfa.toLocaleString('fr-FR')} FCFA
                        </option>
                      ))}
                      <option value="custom">✨ Créer une offre sur-mesure...</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer shrink-0"
                    >
                      🛍️ Envoyer la Fiche
                    </button>
                  </div>

                  {selectedPresetProdId === 'custom' && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          value={customProdName}
                          onChange={e => setCustomProdName(e.target.value)}
                          placeholder="Nom du produit..."
                          className="px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-semibold"
                        />
                        <input
                          type="number"
                          required
                          value={customProdPrice}
                          onChange={e => setCustomProdPrice(e.target.value)}
                          placeholder="Prix FCFA"
                          className="px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-semibold"
                        />
                        <div>
                          <input
                            id="chat-custom-prod-file"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target?.result) {
                                    setCustomProdImageUrl(ev.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                          {!customProdImageUrl ? (
                            <button
                              type="button"
                              onClick={() => document.getElementById('chat-custom-prod-file')?.click()}
                              className="w-full px-3 py-2 rounded-xl bg-white border border-dashed border-blue-300 text-xs font-bold text-[#2563EB] flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Photo produit</span>
                            </button>
                          ) : (
                            <div className="px-2.5 py-1.5 rounded-xl bg-white border border-blue-200 flex items-center gap-2">
                              <img
                                src={customProdImageUrl}
                                alt="Produit"
                                className="w-7 h-7 rounded-md object-cover shrink-0"
                              />
                              <span className="text-[10px] font-black text-emerald-700 flex-1 truncate">
                                Photo prête ✓
                              </span>
                              <button
                                type="button"
                                onClick={() => setCustomProdImageUrl('')}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* =============================================================
                  BARRE D'EMOJIS RAPIDES AFRICAINS & COMMERCE
                 ============================================================= */}
              {showEmojiPicker && (
                <div className="px-3 py-2 bg-blue-50/80 border-t-2 border-blue-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-2 duration-150">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Smile className="w-3 h-3" />
                    <span>Emojis :</span>
                  </span>
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setSmsText(prev => prev + emoji);
                      }}
                      className="text-base hover:scale-130 transition-transform p-1 cursor-pointer select-none"
                      title={`Insérer ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* =============================================================
                  BARRE DE SAISIE INFÉRIEURE SUPRA-WAMEET :
                  📷 Photo Directe | 🎬 Vidéo Native | 🔗 Lien | 🛍️ Produit | 😊 Emojis | Champ SMS | 🎙️ Audio | Envoyer
                 ============================================================= */}
              <form
                onSubmit={handleSendSms}
                className="p-3 bg-white border-t-2 border-blue-100 flex items-center gap-1.5 sm:gap-2"
              >
                {/* Input fichier masqué pour l'upload photo direct */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Input fichier masqué pour l'upload vidéo direct (galerie du téléphone) */}
                <input
                  type="file"
                  ref={videoFileInputRef}
                  onChange={handleVideoFileUpload}
                  accept="video/*"
                  className="hidden"
                />

                {/* Bouton 📷 Téléverser Photo Directe */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    fileInputRef.current?.click();
                  }}
                  className="p-2.5 rounded-2xl border-2 bg-blue-50 hover:bg-blue-100 text-[#2563EB] border-blue-200 transition cursor-pointer shrink-0 flex items-center gap-1 text-xs font-black shadow-2xs"
                  title="Téléverser une photo optimisée"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden xl:inline">📷 Photo</span>
                </button>

                {/* Bouton 🎬 Téléverser Nano-Vidéo Directe depuis la galerie */}
                <button
                  type="button"
                  disabled={isCompressingVideo}
                  onClick={() => {
                    playTapBeep();
                    videoFileInputRef.current?.click();
                  }}
                  className="p-2.5 rounded-2xl border-2 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-[#2563EB] border-blue-200 transition cursor-pointer shrink-0 flex items-center gap-1 text-xs font-black shadow-2xs"
                  title="Envoyer une vidéo de la galerie (Encodage optimisé 480p max 30s)"
                >
                  <Video className="w-4 h-4" />
                  <span className="hidden xl:inline">🎬 Vidéo</span>
                </button>

                {/* Bouton 🔗 Image / Vidéo par Lien */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveComposerDrawer(prev =>
                      prev === 'media_link' ? 'none' : 'media_link'
                    );
                  }}
                  className={`p-2.5 rounded-2xl border-2 transition cursor-pointer shrink-0 flex items-center gap-1 text-xs font-black ${
                    activeComposerDrawer === 'media_link'
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-blue-50 hover:bg-blue-100 text-[#2563EB] border-blue-200'
                  }`}
                  title="Envoyer une Image ou Vidéo YouTube par Lien"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden lg:inline">🔗 Lien</span>
                </button>

                {/* Bouton 🛍️ Envoyer une Fiche Produit */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveComposerDrawer(prev =>
                      prev === 'product_card' ? 'none' : 'product_card'
                    );
                  }}
                  className={`p-2.5 rounded-2xl border-2 transition cursor-pointer shrink-0 flex items-center gap-1 text-xs font-black ${
                    activeComposerDrawer === 'product_card'
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-blue-50 hover:bg-blue-100 text-[#2563EB] border-blue-200'
                  }`}
                  title="Envoyer une Fiche Produit dans la Discussion"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="hidden lg:inline">🛍️ Produit</span>
                </button>

                {/* Bouton 🎁 Cadeau Mystère Verrouillé (Prompt 22) */}
                <button
                  type="button"
                  onClick={() => {
                    playValidationBeep();
                    sendChatMessageToFirestore({
                      type: 'gift',
                      text: `${currentUserProfile.name} vous a envoyé un cadeau surprise !`,
                      giftProduct: {
                        title: "Gâteau d'anniversaire Signature",
                        price: 15000,
                        currency: 'FCFA',
                        merchantName: 'Pâtisserie Douceur Divine • NaNa POS',
                        imageUrl:
                          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format&fit=crop'
                      }
                    });
                    showToast('🎁 Cadeau Mystère envoyé dans le chat !');
                  }}
                  className="p-2.5 rounded-2xl border-2 bg-pink-50 hover:bg-pink-100 text-pink-600 border-pink-200 transition cursor-pointer shrink-0 flex items-center gap-1 text-xs font-black shadow-2xs"
                  title="Envoyer un Cadeau Mystère Physique Wameet (Prompt 22)"
                >
                  <Gift className="w-4 h-4 text-pink-600" />
                  <span className="hidden lg:inline">🎁 Cadeau</span>
                </button>


                {/* Bouton 😊 Sélecteur d'Emojis */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowEmojiPicker(prev => !prev);
                  }}
                  className={`p-2.5 rounded-2xl border-2 transition cursor-pointer shrink-0 flex items-center text-xs font-black ${
                    showEmojiPicker
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-[#2563EB] border-blue-200'
                  }`}
                  title="Afficher la barre d'Emojis"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Champ de saisie SMS */}
                <input
                  type="text"
                  value={smsText}
                  onChange={e => setSmsText(e.target.value)}
                  placeholder={`Écrire un SMS à ${activeThread.memberName}...`}
                  className="flex-1 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none min-w-0"
                />

                {/* Grand Bouton Rond Stylisé 🎙️ Audio */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveComposerDrawer(prev => (prev === 'voice' ? 'none' : 'voice'));
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow-md cursor-pointer shrink-0 border-2 ${
                    activeComposerDrawer === 'voice' || isRecordingVoice
                      ? 'bg-emerald-500 text-white border-white ring-2 ring-emerald-500 animate-pulse'
                      : 'bg-blue-50 hover:bg-blue-100 text-[#2563EB] border-[#2563EB]'
                  }`}
                  title="🎙️ Enregistrer une Note Vocale ou coller un Lien Audio"
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Bouton Envoyer SMS */}
                <button
                  type="submit"
                  disabled={!smsText.trim()}
                  className="px-3.5 sm:px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Envoyer</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const WameetWHub = WameetChatHub;
export default WameetChatHub;
export { ChatListScreen } from './ChatListScreen';
