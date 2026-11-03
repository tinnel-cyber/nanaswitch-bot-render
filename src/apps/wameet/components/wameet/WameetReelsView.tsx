import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Plus,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ShoppingBag,
  Sparkles,
  Check,
  X,
  Send,
  Film,
  ExternalLink,
  Music,
  Play,
  Flame,
  Lightbulb,
  Image as ImageIcon,
  MessageSquare,
  Upload,
  CheckCircle2,
  CornerDownRight,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  prefetchReelsVideos,
  cacheReelsMetadata,
  getCachedReelsMetadata,
  getCachedReelUrls,
  normalizeVideoUrl
} from '../../../../services/wameetOfflineReelsService';
import { StealthYouTubePlayer, extractYouTubeVideoId } from '../../../../components/lms/video/StealthYouTubePlayer';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import ComposantUploadVideo from '../../../../components/ComposantUploadVideo';
import { ReelProductCard } from './ReelProductCard';
import { WameetReelCheckoutDrawer } from './WameetReelCheckoutDrawer';
import { WameetLiveWrapper } from './WameetLiveWrapper';
import { getDeterministicChatId, sendWameetMessage } from '../../../../services/wameetChatService';
import { ImmersiveVideoSearch } from '../../../../components/wameet/search';
import { TopNavOverlay, TopNavTab } from './TopNavOverlay';
import { ReelEngagementSidebar } from './ReelEngagementSidebar';
import { BottomNavOverlay, BottomNavTab } from './BottomNavOverlay';
import { UrgentChatPopup } from './UrgentChatPopup';
import { FullChatOverlay } from './FullChatOverlay';
import { detectIsAIGenerated } from './ReelDescriptionOverlay';
import { SingleReelPlayer } from './ReelVideoPlayer';
import { ReelVideoPreloader } from './ReelVideoPreloader';
import { ReelErrorBoundary } from '../../../../components/ReelErrorBoundary';
import { FeatureErrorBoundary } from '../../../../components/FeatureErrorBoundary';
import { MediaDispatcher } from './media/MediaDispatcher';
import { db } from '../../../../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export type WameetReelCategory = 'FOR_YOU' | 'IDEAS_BUSINESS' | 'SHOPPING_LIVE';

export interface WameetReelProductTag {
  id: string;
  name: string;
  priceFcfa: number;
  imageUrl: string;
  sellerName?: string;
  sellerHandle?: string;
}

export interface WameetReelComment {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
  parentId?: string | null;
  replyToId?: string | null;
  replyToAuthor?: string | null;
  status?: 'approved' | 'pending' | 'rejected';
}

export interface WameetReelItem {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorBadge: string;
  isFollowing: boolean;
  videoUrl: string;
  thumbnailUrl?: string;
  mediaType?: 'video' | 'image';
  title: string;
  description: string;
  hashtags: string[];
  audioTrackName: string;
  category: WameetReelCategory;
  likesCount: number;
  isLiked: boolean;
  bookmarksCount: number;
  isBookmarked: boolean;
  sharesCount: number;
  followersCount?: number;
  isAIGenerated?: boolean;
  generatorEngine?: 'Tinnela AI Studio' | 'Gemini' | 'Pollinations' | 'Replicate' | string;
  comments: WameetReelComment[];
  productTag?: WameetReelProductTag | null;
  createdAt: string;
  moderationSettings?: {
    filterMode: 'all' | 'blocked_words' | 'manual_approval';
    blockedWords: string[];
  };
}

export interface WameetReelsViewProps {
  currentUserProfile: {
    name: string;
    handle: string;
    avatarUrl: string;
    statusBadge: string;
  };
  onOpenWWithCreator?: (creator: {
    name: string;
    handle: string;
    avatarUrl: string;
    contextReelTitle?: string;
  }) => void;
  onBuyProductFromReel?: (product: WameetReelProductTag, reel: WameetReelItem) => void;
  onReelCreated?: (newReel: WameetReelItem) => void;
}

export type WameetReelsTViewProps = WameetReelsViewProps;

interface HeartBurstParticle {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

const STORAGE_KEY_REELS = 'wameet_reels_v7';

const PRESET_SHOP_PRODUCTS: WameetReelProductTag[] = [
  {
    id: 'shop-prod-1',
    name: 'Coffret Beauté Karité Royal Or',
    priceFcfa: 18500,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'shop-prod-2',
    name: 'Masterclass Tunnels & IA UEMOA (12 Blocs)',
    priceFcfa: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'shop-prod-3',
    name: 'Kit Studio Ring Light Pro Live 18"',
    priceFcfa: 22000,
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'shop-prod-4',
    name: 'Ebook : 30 Idées Business après 18h',
    priceFcfa: 7500,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80'
  }
];

const INITIAL_REELS: WameetReelItem[] = [
  // 1. VIDÉO VERTICALE (9:16) #1
  {
    id: 'reel-v916-1',
    authorName: 'Awa Ouédraogo',
    authorHandle: '@awa.empire.bf',
    authorAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    authorBadge: '🛍️ Commerçante & E-Shop',
    isFollowing: false,
    mediaType: 'video',
    videoUrl: '/videos/reel-eshop.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80',
    title: 'Comment je prépare 45 commandes après 18h grâce à Wameet Shop 🔥',
    description:
      'Astuce e-commerce du soir (Format 9:16) : montrez les coulisses de votre préparation de colis en 15 secondes, épinglez le produit et encaissez en direct !',
    hashtags: ['#WameetShop', '#EcommerceAfrique', '#AfterworkBusiness', '#Ouaga'],
    audioTrackName: 'Son Original • Awa Empire E-Shop',
    category: 'SHOPPING_LIVE',
    likesCount: 348,
    isLiked: false,
    bookmarksCount: 89,
    isBookmarked: false,
    sharesCount: 54,
    productTag: {
      id: 'shop-prod-1',
      name: 'Coffret Beauté Karité Royal Or',
      priceFcfa: 18500,
      imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=300&auto=format&fit=crop&q=80',
      sellerName: 'Awa Ouédraogo',
      sellerHandle: '@awa.empire.bf'
    },
    comments: [
      {
        id: 'rc-1',
        authorName: 'Moussa Traoré',
        authorHandle: '@moussa.digital',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        text: 'Le packaging est magnifique Awa ! Je viens de commander un coffret via le bouton Acheter 👏',
        createdAt: 'Il y a 8 min'
      },
      {
        id: 'rc-2',
        authorName: 'Fatou Ndiaye',
        authorHandle: '@fatou.dakar',
        authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        text: 'Super inspirant après le boulot ❤️',
        createdAt: 'Il y a 3 min'
      }
    ],
    createdAt: 'Il y a 15 min'
  },
  // 2. AFFICHE PROMOTIONNELLE DE TEST #1 (9:16)
  {
    id: 'reel-poster-1',
    authorName: 'Maison Kente & Wax Royal',
    authorHandle: '@kente.royal.ci',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    authorBadge: '✨ Affiche Promo Officielle',
    isFollowing: true,
    mediaType: 'image',
    videoUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&auto=format&fit=crop&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&auto=format&fit=crop&q=85',
    title: '🔥 AFFICHE PROMO : -40% sur la Collection Prestige Soirée !',
    description:
      'Offre flash valable 48h : commandez votre tenue sur-mesure directement depuis cette affiche interactive et recevez la livraison express gratuite.',
    hashtags: ['#PromoFlash', '#ModeAfricaine', '#AffichePromo', '#WameetShop'],
    audioTrackName: 'Ambiance Lounge • Kente Royal',
    category: 'SHOPPING_LIVE',
    likesCount: 412,
    isLiked: false,
    bookmarksCount: 134,
    isBookmarked: false,
    sharesCount: 76,
    productTag: {
      id: 'shop-prod-promo-1',
      name: 'Ensemble Kente Cousu Main — Édition Limitée (-40%)',
      priceFcfa: 24000,
      imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&auto=format&fit=crop&q=80',
      sellerName: 'Maison Kente & Wax Royal',
      sellerHandle: '@kente.royal.ci'
    },
    comments: [],
    createdAt: 'Il y a 25 min'
  },
  // 3. VIDÉO VERTICALE (9:16) #2
  {
    id: 'reel-v916-2',
    authorName: 'Dr. Idriss Kaboré',
    authorHandle: '@idriss.academie',
    authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    authorBadge: '🎓 Formateur & Mentor',
    isFollowing: true,
    mediaType: 'video',
    videoUrl: '/videos/reel-mentor.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    title: '3 Secrets pour vendre votre savoir en automatique avec un Tunnel 12 Blocs 🎓⚡',
    description:
      'Vous avez une compétence en comptabilité, couture, import-export ou tech ? Voici comment la transformer en formation rentable dès ce soir sur Wameet.',
    hashtags: ['#FormateurWameet', '#VendreSonSavoir', '#TunnelDeVente', '#IdéeDuSoir'],
    audioTrackName: 'Masterclass Audio • Dr. Idriss Kaboré',
    category: 'IDEAS_BUSINESS',
    likesCount: 512,
    isLiked: true,
    bookmarksCount: 164,
    isBookmarked: true,
    sharesCount: 92,
    productTag: {
      id: 'shop-prod-2',
      name: 'Masterclass Tunnels & IA UEMOA (12 Blocs)',
      priceFcfa: 25000,
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80',
      sellerName: 'Dr. Idriss Kaboré',
      sellerHandle: '@idriss.academie'
    },
    comments: [
      {
        id: 'rc-3',
        authorName: 'Clarisse Zongo',
        authorHandle: '@clarisse.coach',
        authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        text: 'Le lecteur vidéo 9:16 intégré dans le Reel est ultra fluide ! Bravo Doc 🔥',
        createdAt: 'Il y a 19 min'
      }
    ],
    createdAt: 'Il y a 40 min'
  },
  // 4. AFFICHE PROMOTIONNELLE DE TEST #2 (9:16)
  {
    id: 'reel-poster-2',
    authorName: 'NaNa POS Pro • Afrique',
    authorHandle: '@nanapos.officiel',
    authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
    authorBadge: '🚀 Affiche Promo SaaS',
    isFollowing: false,
    mediaType: 'image',
    videoUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=900&auto=format&fit=crop&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=900&auto=format&fit=crop&q=85',
    title: '⚡ AFFICHE PROMO : Digitalisez votre boutique en 3 minutes chrono !',
    description:
      'Fini les cahiers de dettes perdus et les erreurs de caisse : activez votre terminal NaNa POS Pro avec suivi des ventes en temps réel.',
    hashtags: ['#NaNaPOS', '#AffichePromo', '#FintechAfrique', '#CommerceModerne'],
    audioTrackName: 'Son Officiel • NaNa POS Pro',
    category: 'IDEAS_BUSINESS',
    likesCount: 634,
    isLiked: false,
    bookmarksCount: 215,
    isBookmarked: true,
    sharesCount: 145,
    productTag: {
      id: 'shop-prod-promo-2',
      name: 'Pack NaNa POS Pro Annuel + Formation Équipe Offerte',
      priceFcfa: 29000,
      imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=400&auto=format&fit=crop&q=80',
      sellerName: 'NaNa POS Pro • Afrique',
      sellerHandle: '@nanapos.officiel'
    },
    comments: [],
    createdAt: 'Il y a 50 min'
  },
  // 5. VIDÉO VERTICALE (9:16) #3
  {
    id: 'reel-v916-3',
    authorName: 'Salif Tech & Gadgets',
    authorHandle: '@salif.tech.ci',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    authorBadge: '🚀 Entrepreneur Hybride',
    isFollowing: false,
    mediaType: 'video',
    videoUrl: '/videos/reel-business.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
    title: 'Mon setup d’éclairage à 22 000 FCFA pour tourner des Reels pros 9:16 💡📱',
    description:
      'Pas besoin d’une caméra à 1 million ! Une bonne lumière + votre téléphone + un lien direct sur Wameet suffisent pour exploser vos ventes.',
    hashtags: ['#SetupCreateur', '#WameetReels', '#TechAbidjan', '#LiveShopping'],
    audioTrackName: 'Beat Afro-Tech • Salif Studio Live',
    category: 'SHOPPING_LIVE',
    likesCount: 279,
    isLiked: false,
    bookmarksCount: 73,
    isBookmarked: false,
    sharesCount: 41,
    productTag: {
      id: 'shop-prod-3',
      name: 'Kit Studio Ring Light Pro Live 18"',
      priceFcfa: 22000,
      imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80',
      sellerName: 'Salif Tech & Gadgets',
      sellerHandle: '@salif.tech.ci'
    },
    comments: [],
    createdAt: 'Il y a 1 h'
  }
];

export const WameetReelsView: React.FC<WameetReelsViewProps> = ({
  currentUserProfile,
  onOpenWWithCreator,
  onBuyProductFromReel,
  onReelCreated
}) => {
  const handleOpenCreatorChat = onOpenWWithCreator;
  const sanitizeReelItems = (list: WameetReelItem[]): WameetReelItem[] => {
    return list.map((item) => {
      if (item.videoUrl && (item.videoUrl.includes('commondatastorage.googleapis.com') || item.videoUrl.includes('mixkit.co'))) {
        if (item.id === 'reel-v916-1' || item.videoUrl.includes('ForBiggerBlazes')) {
          return { ...item, videoUrl: '/videos/reel-eshop.mp4' };
        }
        if (item.id === 'reel-v916-2' || item.videoUrl.includes('ForBiggerEscapes')) {
          return { ...item, videoUrl: '/videos/reel-mentor.mp4' };
        }
        return { ...item, videoUrl: '/videos/reel-business.mp4' };
      }
      return item;
    });
  };

  const [reels, setReels] = useState<WameetReelItem[]>(() => {
    try {
      const cached = getCachedReelsMetadata();
      if (cached && cached.length >= 5) {
        return sanitizeReelItems(cached);
      }
      const saved = localStorage.getItem(STORAGE_KEY_REELS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          return sanitizeReelItems(parsed);
        }
      }
    } catch (e) {}
    return INITIAL_REELS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REELS, JSON.stringify(reels));
      cacheReelsMetadata(reels);
    } catch (e) {}
  }, [reels]);

  // Pré-chargement en arrière-plan des vidéos dans le CacheStorage (5 à 10 premiers Reels)
  useEffect(() => {
    if (reels && reels.length > 0) {
      prefetchReelsVideos(reels, 0, 10);
    }
  }, [reels]);

  // Chargement automatique des vrais Reels publiés depuis Firestore (wameet_reels)
  useEffect(() => {
    const fetchRemoteReels = async () => {
      try {
        const q = query(collection(db, 'wameet_reels'), orderBy('timestamp', 'desc'), limit(25));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const remoteList: WameetReelItem[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && (data.videoUrl || data.mediaUrl)) {
              remoteList.push({
                id: data.id || docSnap.id,
                authorName: data.authorName || data.creatorName || 'Créateur Wameet',
                authorHandle: data.authorHandle || '@createur.wameet',
                authorAvatar: data.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                authorBadge: data.authorBadge || '✨ Créateur Wameet',
                isFollowing: Boolean(data.isFollowing),
                mediaType: data.mediaType === 'image' ? 'image' : 'video',
                videoUrl: data.videoUrl || data.mediaUrl || '',
                thumbnailUrl: data.thumbnailUrl,
                title: data.title || data.caption || 'Reel Wameet',
                description: data.description || data.caption || '',
                hashtags: Array.isArray(data.hashtags) ? data.hashtags : ['#WameetReels'],
                audioTrackName: data.audioTrackName || 'Son Original • Wameet',
                category: data.category || 'SHOPPING_LIVE',
                likesCount: typeof data.likesCount === 'number' ? data.likesCount : 1,
                isLiked: Boolean(data.isLiked),
                bookmarksCount: typeof data.bookmarksCount === 'number' ? data.bookmarksCount : 0,
                isBookmarked: Boolean(data.isBookmarked),
                sharesCount: typeof data.sharesCount === 'number' ? data.sharesCount : 0,
                comments: Array.isArray(data.comments) ? data.comments : [],
                createdAt: data.createdAt || 'Récemment'
              });
            }
          });
          if (remoteList.length > 0) {
            setReels((prev) => {
              const existingIds = new Set(prev.map((r) => r.id));
              const existingUrls = new Set(prev.map((r) => r.videoUrl));
              const fresh = remoteList.filter((r) => !existingIds.has(r.id) && !existingUrls.has(r.videoUrl));
              return fresh.length > 0 ? [...fresh, ...prev] : prev;
            });
          }
        }
      } catch (err) {
        console.warn('[REELS VIEW] Impossible de récupérer les Reels Firestore :', err);
      }
    };
    fetchRemoteReels();
  }, []);

  const [activeFilter, setActiveFilter] = useState<'ALL' | WameetReelCategory>('ALL');
  const [navTab, setNavTab] = useState<TopNavTab>('for_you');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [bottomTab, setBottomTab] = useState<BottomNavTab>('home');
  // PROMPT 4 : Double Mode de Chat Flottant (Popup Urgent & Ouverture Totale)
  const [isUrgentPopupVisible, setIsUrgentPopupVisible] = useState<boolean>(true);
  const [isFullChatOpen, setIsFullChatOpen] = useState<boolean>(false);
  const lastChatClickRef = useRef<number>(0);
  const chatLongPressTimerRef = useRef<any>(null);
  const isChatLongPressRef = useRef<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wameet_reels_muted');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (_) {}
    return true;
  });
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [isLiveStudioOpen, setIsLiveStudioOpen] = useState<boolean>(false);

  // Pluie de Cœurs (Double-Tap & Bouton J'aime)
  const [heartParticles, setHeartParticles] = useState<HeartBurstParticle[]>([]);
  const lastTapRef = useRef<{ time: number; reelId: string }>({ time: 0, reelId: '' });

  // Tiroir coulissant du bas (Bottom Sheet Commentaires)
  const [commentsDrawerReelId, setCommentsDrawerReelId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [reelReplyingTo, setReelReplyingTo] = useState<{ parentId: string; replyToId: string; replyToAuthor: string } | null>(null);

  // Tiroir de Paiement Zero-Friction (Le Pont E-Commerce Nanasore)
  const [selectedCheckoutProduct, setSelectedCheckoutProduct] = useState<WameetReelProductTag | null>(null);
  const [selectedCheckoutReel, setSelectedCheckoutReel] = useState<WameetReelItem | null>(null);

  // Le Pont Social : Tiroir Quick DM / Discussion avec le Créateur
  const [isQuickDmReelId, setIsQuickDmReelId] = useState<string | null>(null);
  const [quickDmInput, setQuickDmInput] = useState<string>('');

  // Modale Pop-up Synergy Match (📡) & Visioconférence Instantanée
  const [synergyModal, setSynergyModal] = useState<{
    isOpen: boolean;
    roomUrl: string;
    creatorName: string;
    creatorAvatar: string;
  } | null>(null);
  const [activeVisioRoomUrl, setActiveVisioRoomUrl] = useState<string | null>(null);
  const [visioSessionTitle, setVisioSessionTitle] = useState<string>('Salon VIP • Consultation Directe');

  // Modale ➕ Publier mon Reel Vidéo (par Lien ou Upload S3)
  const [isCreateReelModalOpen, setIsCreateReelModalOpen] = useState<boolean>(false);
  const [reelVideoInputMode, setReelVideoInputMode] = useState<'upload' | 'url'>('upload');
  const [newReelVideoUrl, setNewReelVideoUrl] = useState<string>('');
  const [newReelThumbnailUrl, setNewReelThumbnailUrl] = useState<string>('');
  const [newReelTitle, setNewReelTitle] = useState<string>('');
  const [newReelDescription, setNewReelDescription] = useState<string>('');
  const [newReelHashtags, setNewReelHashtags] = useState<string>('#WameetReels #Afterwork #Business');
  const [newReelCategory, setNewReelCategory] = useState<WameetReelCategory>('IDEAS_BUSINESS');
  const [attachProductToReel, setAttachProductToReel] = useState<boolean>(true);
  const [selectedPresetProductId, setSelectedPresetProductId] = useState<string>('custom');
  const [customProductName, setCustomProductName] = useState<string>('');
  const [customProductPrice, setCustomProductPrice] = useState<string>('15000');
  const [customProductImageUrl, setCustomProductImageUrl] = useState<string>('');
  const [isPublishingReel, setIsPublishingReel] = useState<boolean>(false);

  // Toast interne
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Référence du conteneur de défilement vertical Snap Scroll
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Escamotage dynamique immersif du Header / Footer au défilement (60fps avec requestAnimationFrame)
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const isChromeVisibleRef = useRef<boolean>(true);
  const lastScrollTopRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const idleTimerRef = useRef<any>(null);
  const touchStartYRef = useRef<number | null>(null);

  const updateChromeVisibility = (visible: boolean) => {
    if (isChromeVisibleRef.current !== visible) {
      isChromeVisibleRef.current = visible;
      setIsChromeVisible(visible);
    }
  };

  const filteredReels = useMemo(() => {
    let list = reels;
    if (showSavedOnly) {
      list = list.filter(r => r.isBookmarked);
    } else if (navTab === 'following') {
      const followed = list.filter(r => r.isFollowing);
      list = followed.length > 0 ? followed : list;
    } else if (activeFilter !== 'ALL') {
      list = list.filter(r => r.category === activeFilter);
    }
    return list.length > 0 ? list : reels;
  }, [reels, activeFilter, showSavedOnly, navTab]);

  const currentReel = filteredReels[activeIndex] || filteredReels[0];

  // =========================================================================
  // GESTION HORS-LIGNE & PRÉ-CHARGEMENT CONTINU DES REELS (CACHESTORAGE)
  // =========================================================================
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });
  const [cachedUrlSet, setCachedUrlSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refreshCachedUrls = () => {
      getCachedReelUrls()
        .then((urls) => {
          setCachedUrlSet(new Set(urls.map((u) => normalizeVideoUrl(u))));
        })
        .catch(() => {});
    };

    refreshCachedUrls();

    const handleOnline = () => {
      setIsOffline(false);
      if (reels && reels.length > 0) {
        prefetchReelsVideos(reels, activeIndex, 8);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      refreshCachedUrls();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('wameet_reels_cache_updated', refreshCachedUrls);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('wameet_reels_cache_updated', refreshCachedUrls);
    };
  }, [activeIndex, reels]);

  // Pré-chargement dynamique lors du défilement
  useEffect(() => {
    if (filteredReels && filteredReels.length > 0) {
      prefetchReelsVideos(filteredReels, activeIndex + 1, 6);
    }
  }, [activeIndex, filteredReels]);

  // Détection de l'atteinte de la fin des vidéos en cache hors-ligne
  const isAtEndOfCachedReels = useMemo(() => {
    if (!isOffline || !filteredReels || filteredReels.length === 0) return false;
    if (activeIndex >= filteredReels.length - 1) return true;
    const nextReel = filteredReels[activeIndex + 1];
    if (nextReel && nextReel.mediaType !== 'image') {
      const nextNorm = normalizeVideoUrl(nextReel.videoUrl);
      const isCached = cachedUrlSet.has(nextNorm) || cachedUrlSet.has(nextReel.videoUrl);
      if (!isCached) return true;
    }
    return false;
  }, [isOffline, activeIndex, filteredReels, cachedUrlSet]);

  // Pré-chargement en arrière-plan des 2 prochaines vidéos (index + 1 et index + 2) pour swipe instantané sans buffering
  const nextReelUrls = useMemo(() => {
    if (!filteredReels || filteredReels.length === 0) return [];
    const urls: string[] = [];
    for (let offset = 1; offset <= 2; offset++) {
      const candidate = filteredReels[activeIndex + offset];
      if (candidate && candidate.mediaType !== 'image' && candidate.videoUrl) {
        if (!candidate.videoUrl.includes('youtube.com') && !candidate.videoUrl.includes('youtu.be')) {
          urls.push(candidate.videoUrl);
        }
      }
    }
    return urls;
  }, [filteredReels, activeIndex]);

  // =========================================================================
  // MOTEUR D'AUTOPLAY / PAUSE INTELLIGENT VIA INTERSECTION OBSERVER
  // =========================================================================
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const rawIdx = entry.target.getAttribute('data-index');
          const idx = rawIdx !== null ? parseInt(rawIdx, 10) : NaN;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            if (!isNaN(idx) && idx !== activeIndex) {
              setActiveIndex(idx);
            }
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
            // Sorti de l'écran : pause immédiate pour préserver la bande passante mobile
            if (!isNaN(idx) && videoRefs.current[idx] && !videoRefs.current[idx]?.paused) {
              videoRefs.current[idx]?.pause();
            }
          }
        });
      },
      {
        root: container,
        threshold: [0.1, 0.3, 0.55, 0.85]
      }
    );

    slideRefs.current.forEach(slide => {
      if (slide) observer.observe(slide);
    });

    return () => observer.disconnect();
  }, [filteredReels, activeIndex]);

  // Pause automatique générale lors du changement d'onglet ou minimisation
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        videoRefs.current.forEach(vid => {
          if (vid && !vid.paused) vid.pause();
        });
      } else {
        const currentVid = videoRefs.current[activeIndex];
        if (currentVid && currentVid.paused) {
          currentVid.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeIndex]);

  // Contrôle précis de la lecture vidéo : seule la vidéo active visible est lue
  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === activeIndex) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [activeIndex]);

  // Synchronisation de secours de l'index actif au scroll vertical et détection de direction haute performance (60fps)
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const height = container.clientHeight;
    const currentScrollTop = container.scrollTop;
    if (height > 0) {
      const idx = Math.round(currentScrollTop / height);
      if (idx >= 0 && idx < filteredReels.length && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const diff = currentScrollTop - lastScrollTopRef.current;
      const threshold = 10;

      if (diff > threshold && currentScrollTop > 24) {
        updateChromeVisibility(false);
      } else if (diff < -threshold) {
        updateChromeVisibility(true);
      }

      lastScrollTopRef.current = currentScrollTop;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        updateChromeVisibility(true);
      }, 1200);
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const diff = touchStartYRef.current - e.touches[0].clientY;
    if (diff > 16) {
      updateChromeVisibility(false);
    } else if (diff < -16) {
      updateChromeVisibility(true);
    }
  };

  const handleTouchEnd = () => {
    touchStartYRef.current = null;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      updateChromeVisibility(true);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const scrollToReelIndex = (targetIdx: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(filteredReels.length - 1, targetIdx));
    playTapBeep();
    setActiveIndex(clamped);
    container.scrollTo({
      top: clamped * container.clientHeight,
      behavior: 'smooth'
    });
  };

  // Déclenchement d'une explosion / pluie de cœurs ❤️
  const spawnHeartRain = (centerX = 50, centerY = 50) => {
    const batch: HeartBurstParticle[] = Array.from({ length: 9 }).map((_, idx) => ({
      id: `heart-${Date.now()}-${idx}-${Math.random()}`,
      x: Math.max(15, Math.min(85, centerX + (Math.random() * 44 - 22))),
      y: Math.max(20, Math.min(80, centerY + (Math.random() * 30 - 15))),
      scale: 0.85 + Math.random() * 0.9,
      rotate: Math.round(Math.random() * 40 - 20)
    }));
    setHeartParticles(prev => [...prev, ...batch]);
    setTimeout(() => {
      setHeartParticles(prev => prev.filter(p => !batch.some(b => b.id === p.id)));
    }, 1150);
  };

  // J'aime via bouton ou Double-Tap
  const handleToggleLikeReel = (reelId: string, forceLike = false) => {
    playValidationBeep();
    spawnHeartRain(52, 52);
    setReels(prev =>
      prev.map(reel => {
        if (reel.id !== reelId) return reel;
        if (forceLike && reel.isLiked) {
          return { ...reel, likesCount: reel.likesCount + 1 };
        }
        const nextLiked = forceLike ? true : !reel.isLiked;
        return {
          ...reel,
          isLiked: nextLiked,
          likesCount: nextLiked ? reel.likesCount + 1 : Math.max(0, reel.likesCount - 1)
        };
      })
    );
  };

  // Gestion du Double-Tap / Double-Clic magique sur l'écran vidéo & Simple tap pour débloquer/basculer la lecture
  const handleVideoSurfaceTap = (e: React.MouseEvent<HTMLDivElement>, reelId: string, idx: number) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    const relY = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;

    if (lastTapRef.current.reelId === reelId && now - lastTapRef.current.time < 340) {
      // Double-Tap détecté !
      spawnHeartRain(relX, relY);
      handleToggleLikeReel(reelId, true);
      lastTapRef.current = { time: 0, reelId: '' };
    } else {
      lastTapRef.current = { time: now, reelId };
      // Réactivation du Header/Footer sur simple tap
      updateChromeVisibility(true);
      // Déblocage au simple clic pour surmonter toute restriction autoplay du navigateur
      const vid = videoRefs.current[idx];
      if (vid) {
        if (vid.paused) {
          vid.muted = isMuted;
          vid.defaultMuted = true;
          vid.playsInline = true;
          const playPromise = vid.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => console.warn("Autoplay bloqué par le navigateur :", error));
          }
        } else {
          vid.pause();
        }
      }
    }
  };

  // S'abonner au créateur en 1 clic
  const handleToggleFollowCreator = (reelId: string, authorName: string) => {
    playValidationBeep();
    setReels(prev =>
      prev.map(r => {
        if (r.id !== reelId) return r;
        const nextFollow = !r.isFollowing;
        triggerToast(
          nextFollow
            ? `✅ Vous êtes maintenant abonné à ${authorName} sur Wameet !`
            : `Abonnement à ${authorName} retiré`
        );
        return { ...r, isFollowing: nextFollow };
      })
    );
  };

  // Enregistrer dans les favoris Wameet
  const handleToggleBookmarkReel = (reelId: string) => {
    playTapBeep();
    setReels(prev =>
      prev.map(r => {
        if (r.id !== reelId) return r;
        const nextSaved = !r.isBookmarked;
        triggerToast(
          nextSaved
            ? '🔖 Vidéo enregistrée dans vos Favoris Wameet !'
            : 'Retiré des favoris Wameet'
        );
        return {
          ...r,
          isBookmarked: nextSaved,
          bookmarksCount: nextSaved ? r.bookmarksCount + 1 : Math.max(0, r.bookmarksCount - 1)
        };
      })
    );
  };

  // Ajouter un commentaire en direct dans le Bottom Sheet
  const handleAddReelComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentsDrawerReelId || !newCommentText.trim()) return;
    playValidationBeep();
    const commentObj: WameetReelComment = {
      id: `rc-${Date.now()}`,
      authorName: currentUserProfile.name,
      authorHandle: currentUserProfile.handle,
      authorAvatar: currentUserProfile.avatarUrl,
      text: newCommentText.trim(),
      createdAt: "À l'instant",
      parentId: reelReplyingTo?.parentId || null,
      replyToId: reelReplyingTo?.replyToId || null,
      replyToAuthor: reelReplyingTo?.replyToAuthor || null,
      status: 'approved'
    };
    setReels(prev =>
      prev.map(r =>
        r.id === commentsDrawerReelId
          ? { ...r, comments: [...r.comments, commentObj] }
          : r
      )
    );
    setNewCommentText('');
    setReelReplyingTo(null);
  };

  // Publier un nouveau Reel par Lien ou S3
  const handlePublishNewReel = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = (newReelVideoUrl || '').trim();
    const finalTitle = (newReelTitle || '').trim();

    if (!finalUrl) {
      triggerToast('⚠️ Veuillez renseigner ou téléverser une vidéo pour votre Reel.');
      return;
    }

    if (finalUrl.startsWith('blob:')) {
      triggerToast('⏳ Le transfert vers le serveur est en cours, veuillez patienter une seconde...');
      return;
    }

    if (!finalTitle) {
      triggerToast('⚠️ Veuillez donner un titre accrocheur à votre Reel.');
      return;
    }

    setIsPublishingReel(true);
    try {
      playValidationBeep();

      let productTag: WameetReelProductTag | null = null;
      if (attachProductToReel) {
        if (selectedPresetProductId !== 'custom') {
          const found = PRESET_SHOP_PRODUCTS.find(p => p.id === selectedPresetProductId);
          if (found) {
            productTag = {
              ...found,
              sellerName: currentUserProfile.name,
              sellerHandle: currentUserProfile.handle
            };
          }
        } else if (customProductName.trim()) {
          productTag = {
            id: `reel-prod-${Date.now()}`,
            name: customProductName.trim(),
            priceFcfa: Number(customProductPrice) || 10000,
            imageUrl:
              customProductImageUrl.trim() ||
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
            sellerName: currentUserProfile.name,
            sellerHandle: currentUserProfile.handle
          };
        }
      }

      const parsedTags = newReelHashtags
        .split(/[\s,]+/)
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => (t.startsWith('#') ? t : `#${t}`));

      const createdReel: WameetReelItem = {
        id: `reel-${Date.now()}`,
        authorName: currentUserProfile.name || 'Membre Wameet',
        authorHandle: currentUserProfile.handle || '@membre',
        authorAvatar: currentUserProfile.avatarUrl || '',
        authorBadge: currentUserProfile.statusBadge || 'Créateur Wameet',
        isFollowing: true,
        videoUrl: finalUrl,
        thumbnailUrl: newReelThumbnailUrl.trim() || undefined,
        title: finalTitle,
        description:
          newReelDescription.trim() ||
          'Découvrez mon nouveau Reel publié par lien direct sur Wameet !',
        hashtags: parsedTags.length > 0 ? parsedTags : ['#WameetReels', '#Afterwork'],
        audioTrackName: `Son Original • ${currentUserProfile.name || 'Wameet'}`,
        category: newReelCategory,
        likesCount: 1,
        isLiked: true,
        bookmarksCount: 0,
        isBookmarked: false,
        sharesCount: 0,
        comments: [],
        productTag,
        isAIGenerated: detectIsAIGenerated({
          videoUrl: finalUrl,
          title: finalTitle,
          description: newReelDescription,
          hashtags: parsedTags
        }),
        createdAt: "À l'instant"
      };

      setReels(prev => [createdReel, ...prev]);
      setActiveFilter('ALL');
      setShowSavedOnly(false);
      setActiveIndex(0);
      setIsCreateReelModalOpen(false);
      setNewReelVideoUrl('');
      setNewReelThumbnailUrl('');
      setNewReelTitle('');
      setNewReelDescription('');
      setCustomProductName('');
      setCustomProductImageUrl('');
      if (onReelCreated) onReelCreated(createdReel);
      triggerToast('🎬 Votre Reel Wameet a été publié en tête du flux !');

      setTimeout(() => {
        scrollToReelIndex(0);
      }, 80);
    } catch (err: any) {
      console.error('[PUBLISH REEL VIEW ERROR]', err);
      triggerToast(`❌ Erreur lors de la publication : ${err?.message || 'Vérifiez votre connexion'}`);
    } finally {
      setIsPublishingReel(false);
    }
  };

  const [quickDmMessages, setQuickDmMessages] = useState<
    Record<string, Array<{ id: string; sender: 'me' | 'seller'; text: string; time: string }>>
  >({});

  const handleSendQuickDm = (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (presetText || quickDmInput).trim();
    if (!textToSend || !isQuickDmReelId) return;

    playValidationBeep();
    const currentReelId = isQuickDmReelId;
    const targetReel = reels.find(r => r.id === currentReelId);
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    setQuickDmMessages(prev => {
      const existing = prev[currentReelId] || [];
      return {
        ...prev,
        [currentReelId]: [
          ...existing,
          { id: `dm-${Date.now()}`, sender: 'me', text: textToSend, time: nowTime }
        ]
      };
    });
    setQuickDmInput('');
    triggerToast(`💬 Message envoyé à ${targetReel?.authorName || 'le créateur'} !`);

    if (targetReel) {
      const chatId = getDeterministicChatId(currentUserProfile.handle, targetReel.authorHandle);
      sendWameetMessage({
        chatId,
        senderHandle: currentUserProfile.handle,
        senderName: currentUserProfile.name,
        senderAvatar: currentUserProfile.avatarUrl,
        recipientHandle: targetReel.authorHandle,
        recipientName: targetReel.authorName,
        recipientAvatar: targetReel.authorAvatar,
        recipientBadge: targetReel.authorBadge,
        type: 'text',
        text: textToSend
      }).catch(err => console.warn('[WAMEET REELS DM] Sync Firestore:', err));
    }

    setTimeout(() => {
      setQuickDmMessages(prev => {
        const existing = prev[currentReelId] || [];
        return {
          ...prev,
          [currentReelId]: [
            ...existing,
            {
              id: `reply-${Date.now()}`,
              sender: 'seller',
              text: 'Merci pour votre message ! Je vous réponds dans un instant. ✨',
              time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      });
    }, 1200);
  };

  const activeCommentsReel = useMemo(
    () => reels.find(r => r.id === commentsDrawerReelId) || null,
    [reels, commentsDrawerReelId]
  );

  const activeQuickDmReel = useMemo(
    () => reels.find(r => r.id === isQuickDmReelId) || null,
    [reels, isQuickDmReelId]
  );

  const savedReelsCount = useMemo(() => reels.filter(r => r.isBookmarked).length, [reels]);

  return (
    <div className="space-y-4 relative">
      {/* Notification Toast Flottante */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-black shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =====================================================================
          BARRE D'EN-TÊTE DU STUDIO WAMEET REELS + BOUTON LUMINEUX ➕ CRÉER UN REEL
         ===================================================================== */}
      <div className="rounded-[28px] border-2 border-blue-600/90 ring-4 ring-blue-500/10 bg-white/95 backdrop-blur-xl p-4 shadow-[0_12px_40px_-10px_rgba(37,99,235,0.22)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2563EB] to-indigo-700 text-white flex items-center justify-center shadow-md border-2 border-white ring-2 ring-blue-600/30">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                🎬 Wameet Reels
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 text-[10px] font-black uppercase">
                100 % Liens & Lecteur Furtif
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Double-cliquez sur une vidéo pour faire jaillir une pluie de cœurs ❤️ ou achetez en 1 clic !
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setShowSavedOnly(prev => !prev);
              setActiveIndex(0);
            }}
            className={`px-3 py-2 rounded-2xl text-xs font-black border-2 transition cursor-pointer flex items-center gap-1.5 ${
              showSavedOnly
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                : 'bg-blue-50/80 text-[#2563EB] border-blue-200 hover:border-[#2563EB]'
            }`}
            title="Voir mes Reels enregistrés"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Favoris ({savedReelsCount})</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          1. LE CHÂSSIS "SUPRA-PHONE WAMEET" À BORDURES STYLISÉES BLEUES & BLANCHES
         ===================================================================== */}
      <div className="relative flex items-center justify-center">
        {/* Contrôles Latéraux Desktop (⬆️ Reel précédent / ⬇️ Reel suivant) */}
        <div className="hidden sm:flex flex-col items-center gap-3 mr-4">
          <button
            type="button"
            onClick={() => scrollToReelIndex(activeIndex - 1)}
            disabled={activeIndex <= 0}
            className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-blue-50 disabled:opacity-40 text-[#2563EB] border-2 border-[#2563EB] shadow-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
            <span>⬆️ Reel précédent</span>
          </button>
          <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-black text-[#2563EB]">
            Reel {activeIndex + 1} / {filteredReels.length}
          </div>
          <button
            type="button"
            onClick={() => scrollToReelIndex(activeIndex + 1)}
            disabled={activeIndex >= filteredReels.length - 1}
            className="px-3.5 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white border-2 border-white ring-2 ring-[#2563EB] shadow-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
            <span>⬇️ Reel suivant</span>
          </button>
        </div>

        {/* CHÂSSIS RESPONSIVE WAMEET REELS (Plein écran mobile, encadrement centré tablette/desktop) */}
        <div className="w-full h-[100dvh] md:max-w-md lg:max-w-lg mx-auto md:h-[95vh] md:rounded-[38px] md:p-1.5 md:bg-gradient-to-b md:from-blue-600 md:via-blue-500 md:to-blue-700 md:shadow-[0_20px_60px_-10px_rgba(37,99,235,0.45)] relative md:ring-4 md:ring-white overflow-hidden flex items-center justify-center">
          {/* Encoche Supérieure Stylisée Supra-Phone */}
          <div className="w-full h-full md:rounded-[32px] overflow-hidden bg-slate-950 relative">
            {/* =================================================================
                PROMPT 1 : NAVIGATION HAUTE FLOTTANTE (TOPNAVOVERLAY - 100% SANS FOND)
                Contrainte absolue : AUCUN fond blanc, AUCUN conteneur.
               ================================================================= */}
            <TopNavOverlay
              activeTab={isSearchOpen ? 'search' : navTab}
              onOpenSalles={() => {
                playTapBeep();
                window.location.href = '/salles-vip';
              }}
              onOpenSalonVip={() => {
                playValidationBeep();
                window.location.href = '/vip';
              }}
              onAddReel={() => {
                playValidationBeep();
                setIsCreateReelModalOpen(true);
              }}
              onOpenFollowing={() => {
                setNavTab(prev => prev === 'following' ? 'for_you' : 'following');
                triggerToast(navTab === 'following' ? 'Flux global' : 'Vidéos de vos abonnements');
              }}
              onOpenSearch={() => {
                setIsSearchOpen(true);
                setIsMuted(true);
              }}
              className={`top-3 left-3 right-3 transition-all duration-300 ease-in-out will-change-transform ${
                isChromeVisible
                  ? 'translate-y-0 opacity-100 pointer-events-auto'
                  : '-translate-y-full opacity-0 pointer-events-none'
              }`}
            />

            {/* BARRE DE FILTRES THÉMATIQUES EN SURIMPRESSION : 🔥 Pour Vous | 💡 Idées & Business | 🛍️ Shopping Live */}
            <div className={`absolute top-11.5 left-3 right-3 z-30 flex items-center justify-between gap-1.5 pointer-events-auto transition-all duration-300 ease-in-out will-change-transform ${
              isChromeVisible
                ? 'translate-y-0 opacity-100 pointer-events-auto'
                : '-translate-y-full opacity-0 pointer-events-none'
            }`}>
              <div className="flex items-center gap-1 bg-slate-950/65 backdrop-blur-xl p-1 rounded-full border border-white/25 shadow-lg overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowSavedOnly(false);
                    setNavTab('for_you');
                    setActiveFilter('ALL');
                    setActiveIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap transition cursor-pointer ${
                    !showSavedOnly && navTab === 'for_you' && activeFilter === 'ALL'
                      ? 'bg-[#2563EB] text-white shadow-xs border border-white/40'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  🔥 Pour Vous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowSavedOnly(false);
                    setNavTab('for_you');
                    setActiveFilter('IDEAS_BUSINESS');
                    setActiveIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap transition cursor-pointer ${
                    !showSavedOnly && activeFilter === 'IDEAS_BUSINESS'
                      ? 'bg-[#2563EB] text-white shadow-xs border border-white/40'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  💡 Idées & Business
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowSavedOnly(false);
                    setNavTab('for_you');
                    setActiveFilter('SHOPPING_LIVE');
                    setActiveIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap transition cursor-pointer ${
                    !showSavedOnly && activeFilter === 'SHOPPING_LIVE'
                      ? 'bg-[#2563EB] text-white shadow-xs border border-white/40'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  🛍️ Shopping Live
                </button>
              </div>

              {/* Boutons Flottants Mobiles ⬆️ / ⬇️ intégrés en haut à droite de l'écran */}
              <div className="flex sm:hidden items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollToReelIndex(activeIndex - 1)}
                  disabled={activeIndex <= 0}
                  className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white flex items-center justify-center disabled:opacity-30 cursor-pointer"
                  title="⬆️ Reel précédent"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToReelIndex(activeIndex + 1)}
                  disabled={activeIndex >= filteredReels.length - 1}
                  className="w-7 h-7 rounded-full bg-[#2563EB]/90 backdrop-blur-md border border-white/50 text-white flex items-center justify-center disabled:opacity-30 cursor-pointer"
                  title="⬇️ Reel suivant"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* =================================================================
                PROMPT 24 : IMMERSIVE VIDEO SEARCH (SUR LES REELS / LIVES)
               ================================================================= */}
            <ImmersiveVideoSearch
              isOpen={isSearchOpen}
              onOpenChange={setIsSearchOpen}
              showFloatingBar={false}
              onSearchStateChange={(isOpen) => {
                if (isOpen) {
                  setIsMuted(true);
                }
              }}
              floatingBarClassName="top-13.5 left-3 right-3"
              onSelectVideo={(video) => {
                setToastMsg(`🎬 Sélection : "${video.title}"`);
              }}
              onSelectLive={(live) => {
                setToastMsg(`🔴 Rejoindre le Live : "${live.title}"`);
              }}
              onOpenChatWithCreator={(creator) => {
                if (handleOpenCreatorChat) {
                  handleOpenCreatorChat({
                    name: creator.name,
                    handle: creator.handle,
                    avatarUrl: creator.avatarUrl,
                    contextReelTitle: 'Recherche Wameet'
                  });
                }
              }}
            />


            {/* EXPLOSION & PLUIE DE CŒURS ❤️ ANIMÉS AU CENTRE DE L'ÉCRAN */}
            <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
              {heartParticles.map(particle => (
                <div
                  key={particle.id}
                  style={{
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                    transform: `translate(-50%, -50%) scale(${particle.scale}) rotate(${particle.rotate}deg)`
                  }}
                  className="absolute animate-ping text-rose-500 drop-shadow-[0_6px_20px_rgba(244,63,94,0.85)]"
                >
                  <Heart className="w-16 h-16 fill-rose-500 text-white stroke-[1.5]" />
                </div>
              ))}
            </div>

            {/* PRÉ-CHARGEMENT INVISIBLE EN ARRIÈRE-PLAN DES 2 PROCHAINES VIDÉOS (index + 1 & index + 2) */}
            <ReelVideoPreloader urls={nextReelUrls} />

            {/* FLUX VERTICAL SNAP SCROLL DES REELS */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth"
            >
              {filteredReels.map((reel, idx) => {
                const isPosterItem = reel.mediaType === 'image';
                const isS3Video = !isPosterItem && (
                  reel.videoUrl.includes('.mp4') ||
                  reel.videoUrl.includes('.webm') ||
                  reel.videoUrl.includes('.mov') ||
                  reel.videoUrl.includes('.m3u8') ||
                  reel.videoUrl.includes('amazonaws.com') ||
                  reel.videoUrl.includes('cloudfront.net') ||
                  reel.videoUrl.includes('storage.googleapis.com')
                );
                const isYouTubeReel = !isPosterItem && !isS3Video && Boolean(extractYouTubeVideoId(reel.videoUrl));
                const isCurrentActive = idx === activeIndex;

                return (
                  <div
                    key={reel.id}
                    ref={el => {
                      slideRefs.current[idx] = el;
                    }}
                    data-index={idx}
                    onClick={e => handleVideoSurfaceTap(e, reel.id, idx)}
                    className="w-full h-[100dvh] md:h-full snap-start snap-always relative shrink-0 select-none bg-slate-950 flex items-center justify-center overflow-hidden"
                  >
                    {/* Image de fond floutée esthétique si miniature fournie */}
                    {reel.thumbnailUrl && (
                      <img
                        src={reel.thumbnailUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-25 blur-xl scale-110 pointer-events-none"
                      />
                    )}

                    {/* LECTEUR VIDÉO 9:16 OU AFFICHE PROMOTIONNELLE */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                      {isPosterItem ? (
                        <div className="relative w-full h-full">
                          <img
                            src={reel.thumbnailUrl || reel.videoUrl}
                            alt={reel.title}
                            className={`w-full h-full object-cover transition-all duration-300 ${
                              selectedCheckoutProduct || isQuickDmReelId
                                ? 'brightness-40 blur-[2px]'
                                : 'brightness-100'
                            }`}
                          />
                          <div className="absolute top-28 left-4 z-20 px-3 py-1 rounded-full bg-amber-500/95 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            <span>Affiche Promotionnelle</span>
                          </div>
                        </div>
                      ) : (
                        <ReelErrorBoundary key={reel.id}>
                          {isYouTubeReel ? (
                            /* Lecteur Stealth pour les vidéos YouTube Nanasore */
                            <div
                              className={`w-full my-auto px-1 transition-all duration-300 ${
                                selectedCheckoutProduct || isQuickDmReelId
                                  ? 'brightness-40 blur-[2px]'
                                  : 'brightness-100'
                              }`}
                            >
                              <StealthYouTubePlayer
                                videoUrl={reel.videoUrl}
                                title={reel.title}
                                hideBranding={true}
                                autoPlay={isCurrentActive}
                              />
                            </div>
                          ) : (
                            /* Lecteur Reel S3 natif dédié (<video> HTML5 standard pour AWS S3 / MP4) */
                            <SingleReelPlayer
                              key={reel.videoUrl}
                              videoUrl={reel.videoUrl}
                              posterUrl={reel.thumbnailUrl || (reel as any).posterUrl || undefined}
                              thumbnailUrl={reel.thumbnailUrl}
                              isActive={isCurrentActive}
                              isMuted={isMuted}
                              className={`w-full h-full object-cover transition-all duration-300 ${
                                selectedCheckoutProduct || isQuickDmReelId
                                  ? 'brightness-40 blur-[2px]'
                                  : 'brightness-100'
                              }`}
                              videoRef={el => {
                                videoRefs.current[idx] = el;
                              }}
                              onClick={e => handleVideoSurfaceTap(e as any, reel.id, idx)}
                            />
                          )}
                        </ReelErrorBoundary>
                      )}
                    </div>

                    {/* Dégradé sombre inférieur pour lisibilité parfaite des textes et du Shop Pill */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-transparent z-10" />

                    {/* =========================================================
                        PROMPT 2 : LA "SIDEBAR" D'ENGAGEMENT SANS CADRES (À DROITE)
                        Contrainte absolue : AUCUN cadre d'arrière-plan, AUCUN fond blanc ni boîte.
                        Les icônes et textes sont blancs et flottent avec drop-shadow-md.
                       ========================================================= */}
                    <ReelEngagementSidebar
                      authorAvatar={reel.authorAvatar}
                      authorName={reel.authorName}
                      authorHandle={reel.authorHandle}
                      isFollowing={reel.isFollowing}
                      onToggleFollow={() => handleToggleFollowCreator(reel.id, reel.authorName)}
                      likesCount={reel.likesCount}
                      isLiked={reel.isLiked}
                      onLike={() => handleToggleLikeReel(reel.id)}
                      favoritesCount={reel.bookmarksCount || '45K'}
                      isFavorited={reel.isBookmarked}
                      onFavorite={() => handleToggleBookmarkReel(reel.id)}
                      commentsCount={(reel.comments || []).length}
                      onComment={() => {
                        playTapBeep();
                        setCommentsDrawerReelId(reel.id);
                      }}
                      onShare={() => {
                        playTapBeep();
                        triggerToast('🔗 Lien du Reel copié dans le presse-papier !');
                      }}
                      reelId={reel.id}
                      reelTitle={reel.title}
                      reelThumbnailUrl={reel.thumbnailUrl}
                      creatorId={(reel as any).authorId || (reel as any).creatorId || reel.authorHandle || 'creator_wameet'}
                      currentUserId={currentUserProfile.handle || 'user_me'}
                      currentUserName={currentUserProfile.name || 'Moi'}
                      resonanceCount={(reel as any).resonanceCount || 0}
                      onSynergyMatchTriggered={(roomUrl) => {
                        playValidationBeep();
                        setSynergyModal({
                          isOpen: true,
                          roomUrl,
                          creatorName: reel.authorName,
                          creatorAvatar: reel.authorAvatar
                        });
                      }}
                      className="absolute right-2 sm:right-3 bottom-10 sm:bottom-12 z-40"
                    />

                    {/* Contrôles Audio & Disque Vinyle en Bas à Droite (100% Flottants) */}
                    <div
                      onClick={e => e.stopPropagation()}
                      className="absolute right-2.5 sm:right-3 bottom-2.5 sm:bottom-3 z-40 flex items-center gap-1.5 select-none"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setIsMuted(prev => {
                            const next = !prev;
                            try {
                              localStorage.setItem('wameet_reels_muted', next ? 'true' : 'false');
                            } catch (_) {}
                            return next;
                          });
                        }}
                        className="text-white drop-shadow-md p-1 opacity-90 hover:opacity-100 transition cursor-pointer bg-transparent border-0 focus:outline-none"
                        title={isMuted ? 'Activer le son 🔊' : 'Couper le son 🔇'}
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4 text-rose-300 drop-shadow-md" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-300 drop-shadow-md" />
                        )}
                      </button>

                      {/* Disque Audio Tournant */}
                      <div
                        className="w-6.5 h-6.5 rounded-full bg-slate-900 border border-white/40 shadow-md p-0.5 animate-spin"
                        style={{ animationDuration: '6s' }}
                        title={reel.audioTrackName}
                      >
                        <img
                          src={reel.authorAvatar}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    </div>


                    {/* =========================================================
                        INFOS CRÉATEUR EN BAS À GAUCHE (REELS ÉPURÉ)
                       ========================================================= */}
                    <div
                      onClick={e => e.stopPropagation()}
                      className="absolute left-3.5 right-16 bottom-16 z-20 space-y-2.5"
                    >
                      {/* Pseudo @createur & Badge */}
                      <div className="space-y-1">
                        {/* Avertissement Vidéo générée par IA */}
                        {reel.isAIGenerated && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 text-[10px] text-slate-300 font-medium">
                            <span>✨</span>
                            <span>Vidéo générée par IA</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-white drop-shadow">
                            {reel.authorHandle}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#2563EB]/90 border border-white/40 text-[10px] font-black text-white">
                            {reel.authorBadge}
                          </span>
                        </div>

                        {/* Titre & Description */}
                        <h3 className="text-xs font-black text-white leading-snug drop-shadow">
                          {reel.title}
                        </h3>
                        <p className="text-[11px] text-white/85 line-clamp-2 leading-relaxed">
                          {reel.description}
                        </p>

                        {/* #Hashtags */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {reel.hashtags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] font-black text-blue-300 bg-blue-950/60 border border-blue-400/30 px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Piste Audio en bas */}
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 pt-1">
                          <Music className="w-3 h-3 text-blue-400 shrink-0 animate-pulse" />
                          <span className="truncate">{reel.audioTrackName}</span>
                        </div>

                        {/* Action Spéciale Live Shopping Wameet (Hack Overscan & Mini-Player) */}
                        {reel.category === 'SHOPPING_LIVE' && (
                          <button
                            type="button"
                            onClick={() => {
                              playValidationBeep();
                              setIsLiveStudioOpen(true);
                            }}
                            className="w-full mt-2 py-2 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/40 border border-white/30 cursor-pointer active:scale-95 transition"
                          >
                            <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                            <span>Rejoindre le Live Shopping Direct 🔴</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Accès chat direct et création via la barre standard / Rosace */}

            {/* =================================================================
                BANNIÈRE NON-BLOQUANTE : FIN DES REELS EN CACHE HORS-LIGNE
                Exigée lorsque l'utilisateur atteint la fin des vidéos en cache.
               ================================================================= */}
            {isOffline && isAtEndOfCachedReels && (
              <div className="absolute bottom-20 inset-x-3.5 z-40 p-3.5 bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between text-white animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3 pr-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>Mode Hors-ligne</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    </p>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Vous êtes en mode hors ligne. Connectez-vous pour voir les derniers Reels.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    window.location.reload();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shrink-0 transition-transform active:scale-95 shadow-md"
                >
                  Actualiser
                </button>
              </div>
            )}

            {/* =================================================================
                PROMPT 3 : L’INTERFACE DE NAVIGATION BASSE FLOTTANTE (L’ACCÈS RAPIDE)
                Fixé en bas à gauche : absolute bottom-3 left-3.5 z-30 flex items-center gap-5 text-white
               ================================================================= */}
            <BottomNavOverlay
              activeTab={bottomTab}
              onOpenHome={() => {
                setBottomTab('home');
                setNavTab('for_you');
                setActiveFilter('ALL');
                setShowSavedOnly(false);
                scrollToReelIndex(0);
                triggerToast('🏠 Accueil Reels Wameet');
              }}
              onOpenDiscover={() => {
                setBottomTab('discover');
                setIsSearchOpen(true);
                setIsMuted(true);
              }}
              onAddReel={() => {
                playValidationBeep();
                setIsCreateReelModalOpen(true);
              }}
              onOpenFriends={() => {
                setBottomTab('friends');
                setNavTab('following');
                triggerToast('👥 Flux de vos amis & abonnements');
              }}
              onOpenChat={() => {
                setBottomTab('chat');
                setIsFullChatOpen(true);
                setIsMuted(true);
              }}
              onChatDoubleClick={() => {
                setIsFullChatOpen(true);
                setIsMuted(true);
                triggerToast('💬 Ouverture du Chat Complet (Double-clic)');
              }}
              onChatPointerDown={() => {
                isChatLongPressRef.current = false;
                chatLongPressTimerRef.current = setTimeout(() => {
                  isChatLongPressRef.current = true;
                  setIsFullChatOpen(true);
                  setIsMuted(true);
                  triggerToast('💬 Chat Complet (Appui long)');
                }, 480);
              }}
              onChatPointerUp={() => {
                if (chatLongPressTimerRef.current) {
                  clearTimeout(chatLongPressTimerRef.current);
                  chatLongPressTimerRef.current = null;
                }
              }}
              className={`bottom-3 left-3.5 transition-all duration-300 ease-in-out will-change-transform ${
                isChromeVisible
                  ? 'translate-y-0 opacity-100 pointer-events-auto'
                  : 'translate-y-full opacity-0 pointer-events-none'
              }`}
            />

            {/* =================================================================
                PROMPT 4 - OPTION 2 : L'OUVERTURE TOTALE (FULLCHATOVERLAY)
                Chat plein écran flouté (backdrop-blur-2xl bg-black/40) avec slide fluide
               ================================================================= */}
            <FullChatOverlay
              isOpen={isFullChatOpen}
              onClose={() => setIsFullChatOpen(false)}
              creator={{
                name: currentReel.authorName,
                handle: currentReel.authorHandle,
                avatarUrl: currentReel.authorAvatar,
                statusBadge: currentReel.authorBadge,
                isOnline: true
              }}
              reelContextTitle={currentReel.title}
              currentUser={currentUserProfile}
              onSendMessage={(text) => {
                const chatId = getDeterministicChatId(currentUserProfile.handle, currentReel.authorHandle);
                sendWameetMessage({
                  chatId,
                  senderId: currentUserProfile.handle,
                  senderName: currentUserProfile.name,
                  senderHandle: currentUserProfile.handle,
                  senderAvatar: currentUserProfile.avatarUrl,
                  text,
                  type: 'text'
                }).catch(() => {});
              }}
            />

            {/* =================================================================
                TIROIR COULISSANT DU BAS (BOTTOM SHEET COMMENTAIRES À BORDURE BLEUE)
               ================================================================= */}
            {activeCommentsReel && (
              <div
                onClick={e => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 z-40 h-[68%] rounded-t-[32px] border-t-4 border-[#2563EB] bg-white/98 backdrop-blur-xl shadow-[0_-15px_40px_rgba(15,23,42,0.45)] flex flex-col overflow-hidden"
              >
                {/* Poignée & En-tête du Bottom Sheet */}
                <div className="px-4 pt-3 pb-2.5 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      💬 Commentaires en direct ({(activeCommentsReel.comments || []).length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommentsDrawerReelId(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Liste des commentaires */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {(() => {
                    const allComments = activeCommentsReel.comments || [];
                    const rootComments = allComments.filter(c => !c.parentId);
                    const getReplies = (parentId: string) => allComments.filter(c => c.parentId === parentId);

                    if (rootComments.length === 0) {
                      return (
                        <div className="text-center py-8 text-xs font-semibold text-slate-400">
                          Soyez le premier à commenter ce Reel de {activeCommentsReel.authorName} !
                        </div>
                      );
                    }

                    return rootComments.map(c => {
                      const replies = getReplies(c.id);
                      return (
                        <div key={c.id} className="space-y-1.5">
                          {/* Commentaire Parent */}
                          <div className="flex items-start gap-2.5">
                            <img
                              src={c.authorAvatar}
                              alt={c.authorName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-[#2563EB] shrink-0"
                            />
                            <div className="flex-1 bg-blue-50/60 border border-blue-100 rounded-2xl p-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900">
                                  {c.authorName}{' '}
                                  <span className="text-[10px] font-bold text-[#2563EB]">
                                    {c.authorHandle}
                                  </span>
                                </span>
                                <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                              </div>
                              <p className="text-xs text-slate-700 mt-1 leading-relaxed">{c.text}</p>
                              <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-blue-100/60">
                                <button
                                  type="button"
                                  onClick={() => {
                                    playTapBeep();
                                    setReelReplyingTo({
                                      parentId: c.id,
                                      replyToId: c.id,
                                      replyToAuthor: c.authorName
                                    });
                                  }}
                                  className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer active:scale-95"
                                >
                                  <CornerDownRight className="w-2.5 h-2.5" />
                                  <span>Répondre</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Réponses Imbriquées Indentées */}
                          {replies.length > 0 && (
                            <div className="ml-7 border-l-2 border-blue-200 pl-2.5 space-y-2 mt-1">
                              {replies.map(reply => (
                                <div key={reply.id} className="flex items-start gap-2">
                                  <img
                                    src={reply.authorAvatar}
                                    alt={reply.authorName}
                                    className="w-6 h-6 rounded-full object-cover border border-[#2563EB] shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 bg-white border border-blue-100 rounded-xl p-2 shadow-2xs">
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-black text-slate-900">{reply.authorName}</span>
                                        {reply.replyToAuthor && (
                                          <span className="text-[9px] font-bold text-[#2563EB] bg-blue-50 px-1 py-0.2 rounded border border-blue-100">
                                            @{reply.replyToAuthor}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-slate-400">{reply.createdAt}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{reply.text}</p>
                                    <div className="flex items-center gap-2 mt-1 pt-0.5 border-t border-slate-100">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          playTapBeep();
                                          setReelReplyingTo({
                                            parentId: c.id,
                                            replyToId: reply.id,
                                            replyToAuthor: reply.authorName
                                          });
                                        }}
                                        className="text-[9px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer active:scale-95"
                                      >
                                        <CornerDownRight className="w-2.5 h-2.5" />
                                        <span>Répondre</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Bannière de réponse active */}
                {reelReplyingTo && (
                  <div className="px-4 py-1.5 bg-blue-50 border-t border-blue-200 flex items-center justify-between text-xs text-[#2563EB] animate-in fade-in">
                    <span className="flex items-center gap-1 font-semibold truncate">
                      <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                      <span>Répondre à <strong>@{reelReplyingTo.replyToAuthor}</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setReelReplyingTo(null)}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Formulaire d'ajout de commentaire */}
                <form
                  onSubmit={handleAddReelComment}
                  className="p-3 bg-white border-t border-blue-100 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    placeholder={
                      reelReplyingTo
                        ? `Répondre à @${reelReplyingTo.replyToAuthor}...`
                        : "Ajouter un commentaire sur ce Reel..."
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-md flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publier</span>
                  </button>
                </form>
              </div>
            )}

            {/* =================================================================
                1. LE PONT SOCIAL : TIROIR DE DISCUSSION PRIVÉE (QUICK DM)
               ================================================================= */}
            {activeQuickDmReel && (
              <div
                onClick={e => e.stopPropagation()}
                className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
              >
                <div className="w-full h-[76%] rounded-t-[32px] border-t-4 border-[#2563EB] bg-white/98 backdrop-blur-xl shadow-[0_-20px_50px_rgba(15,23,42,0.6)] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <img
                          src={activeQuickDmReel.authorAvatar}
                          alt={activeQuickDmReel.authorName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#2563EB]"
                        />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {activeQuickDmReel.authorName}
                          </h4>
                          <span className="text-[10px] font-bold text-[#2563EB]">
                            {activeQuickDmReel.authorHandle}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          ⚡ En direct sur Wameet • Répond vite
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Pont direct Wameet si disponible */}
                      <button
                        type="button"
                        onClick={() => {
                          if (handleOpenCreatorChat) {
                            handleOpenCreatorChat({
                              name: activeQuickDmReel.authorName,
                              handle: activeQuickDmReel.authorHandle,
                              avatarUrl: activeQuickDmReel.authorAvatar,
                              contextReelTitle: activeQuickDmReel.title
                            });
                          } else {
                            const msg = `Bonjour ${activeQuickDmReel.authorName}, j'ai vu votre Reel "${activeQuickDmReel.title}" sur Wameet !`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1 shadow-sm cursor-pointer transition"
                        title="Continuer sur Wameet"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-white" />
                        <span>Wameet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsQuickDmReelId(null)}
                        className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center cursor-pointer transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Context preview de la vidéo */}
                  <div className="px-3.5 py-2 bg-blue-100/50 border-b border-blue-200/60 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-blue-900 truncate flex items-center gap-1">
                      🎬 Reel : <em>"{activeQuickDmReel.title}"</em>
                    </span>
                    {activeQuickDmReel.productTag && (
                      <span className="font-black text-[#2563EB] shrink-0 font-mono ml-2">
                        {activeQuickDmReel.productTag.priceFcfa.toLocaleString('fr-FR')} FCFA
                      </span>
                    )}
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {/* Welcome bubble from seller */}
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <img
                        src={activeQuickDmReel.authorAvatar}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover shrink-0 mt-1"
                      />
                      <div className="p-2.5 rounded-2xl rounded-tl-xs bg-slate-100 text-slate-800 text-xs shadow-xs">
                        <p className="font-medium">
                          👋 Bonjour ! Merci d'avoir regardé mon Reel. Tu as une question sur{' '}
                          {activeQuickDmReel.productTag ? `ce produit (${activeQuickDmReel.productTag.name})` : 'ce contenu'} ? Écris-moi directement ici !
                        </p>
                        <span className="block text-[9px] text-slate-400 mt-1 text-right">
                          En direct
                        </span>
                      </div>
                    </div>

                    {/* Messages sent */}
                    {(quickDmMessages[activeQuickDmReel.id] || []).map(msg => (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 max-w-[85%] ${
                          msg.sender === 'me' ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        {msg.sender === 'seller' && (
                          <img
                            src={activeQuickDmReel.authorAvatar}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover shrink-0 mt-1"
                          />
                        )}
                        <div
                          className={`p-2.5 rounded-2xl text-xs shadow-xs ${
                            msg.sender === 'me'
                              ? 'rounded-tr-xs bg-[#2563EB] text-white font-medium'
                              : 'rounded-tl-xs bg-slate-100 text-slate-800 font-medium'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <span
                            className={`block text-[9px] mt-1 text-right ${
                              msg.sender === 'me' ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Suggestions rapides africaines */}
                  <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {[
                      '📦 Est-ce disponible ?',
                      '🚚 Livraison possible ?',
                      '💰 Dernier prix ?',
                      '📍 Où êtes-vous situés ?'
                    ].map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSendQuickDm(undefined, chip)}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 border border-blue-200 text-slate-700 text-[10px] font-bold whitespace-nowrap cursor-pointer transition shadow-2xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Formulaire d'envoi rapide */}
                  <form
                    onSubmit={e => handleSendQuickDm(e)}
                    className="p-3 bg-white border-t border-blue-100 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={quickDmInput}
                      onChange={e => setQuickDmInput(e.target.value)}
                      placeholder={`Écrire à ${activeQuickDmReel.authorName}...`}
                      className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!quickDmInput.trim()}
                      className="px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black shadow-md flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Envoyer</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* =================================================================
                3. LE TIROIR DE PAIEMENT ZERO-FRICTION (BOTTOM DRAWER E-COMMERCE)
               ================================================================= */}
            {selectedCheckoutProduct && selectedCheckoutReel && (
              <WameetReelCheckoutDrawer
                isOpen={Boolean(selectedCheckoutProduct)}
                onClose={() => {
                  setSelectedCheckoutProduct(null);
                  setSelectedCheckoutReel(null);
                }}
                product={selectedCheckoutProduct}
                creator={{
                  name: selectedCheckoutReel.authorName,
                  handle: selectedCheckoutReel.authorHandle,
                  avatarUrl: selectedCheckoutReel.authorAvatar
                }}
                currentUserProfile={currentUserProfile}
                onOrderSuccess={orderData => {
                  triggerToast(`🎉 Commande #${orderData?.orderId || 'WAMEET'} confirmée !`);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. MODALE ➕ PUBLIER MON REEL VIDÉO (100 % PAR LIEN)
         ===================================================================== */}
      {isCreateReelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl my-auto rounded-[32px] border-2 border-[#2563EB] ring-4 ring-blue-500/15 bg-white shadow-2xl overflow-hidden">
            {/* En-tête de la Modale */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#2563EB] to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Film className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    ➕ Publier mon Reel Vidéo
                  </h3>
                  <p className="text-[11px] text-blue-100 font-medium">
                    Upload direct Espace Cloud ou Lecture directe via Lecteur Furtif / MP4
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateReelModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handlePublishNewReel}
              className="p-6 space-y-4 max-h-[82vh] overflow-y-auto"
            >
              {/* 1. Sélection de la Source Vidéo : Upload Direct Cloud vs Lien Externe */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    🎬 Vidéo du Reel *
                  </label>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Espace Cloud Direct Ready
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setReelVideoInputMode('upload')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      reelVideoInputMode === 'upload'
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Direct S3</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReelVideoInputMode('url')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      reelVideoInputMode === 'url'
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Lien Externe (YouTube / MP4)</span>
                  </button>
                </div>

                {reelVideoInputMode === 'upload' ? (
                  <ComposantUploadVideo
                    title="Téléverser ma vidéo de Reel (S3)"
                    initialVideoUrl={newReelVideoUrl}
                    onUploadComplete={(finalVideoUrl) => {
                      setNewReelVideoUrl(finalVideoUrl);
                      triggerToast('✅ Vidéo Reel envoyée avec succès sur Amazon S3 !');
                    }}
                  />
                ) : (
                  <div>
                    <input
                      type="url"
                      required={!newReelVideoUrl}
                      value={newReelVideoUrl}
                      onChange={e => setNewReelVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/shorts/... ou https://.../video.mp4"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-blue-300 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                    {newReelVideoUrl.trim() && (
                      <div className="mt-1.5 text-[11px] font-bold text-[#2563EB] flex items-center gap-1.5">
                        {extractYouTubeVideoId(newReelVideoUrl) ? (
                          <span>✅ Lien YouTube / Shorts détecté : Lecture via le Lecteur Furtif Wameet</span>
                        ) : (
                          <span>✅ Lien vidéo externe détecté : Lecture fluide dans le Supra-Phone</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Miniature / Affiche du Reel (Carte de prévisualisation visuelle) */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  🖼️ Miniature / Affiche de Couverture (Optionnel)
                </label>
                <input
                  id="reel-thumb-file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setNewReelThumbnailUrl(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
                {!newReelThumbnailUrl ? (
                  <button
                    type="button"
                    onClick={() => document.getElementById('reel-thumb-file-input')?.click()}
                    className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 flex items-center justify-center gap-2.5 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-black text-[#2563EB]">Choisir une miniature visuelle</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <img
                      src={newReelThumbnailUrl}
                      alt="Aperçu miniature"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Miniature prête ✓
                      </span>
                      <button
                        type="button"
                        onClick={() => document.getElementById('reel-thumb-file-input')?.click()}
                        className="text-[10px] font-bold text-[#2563EB] hover:underline cursor-pointer block mt-1"
                      >
                        Changer d'image
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewReelThumbnailUrl('')}
                      className="p-1 rounded-full text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Titre, Idée partagée & #Hashtags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                    ✨ Titre accrocheur du Reel *
                  </label>
                  <input
                    type="text"
                    required
                    value={newReelTitle}
                    onChange={e => setNewReelTitle(e.target.value)}
                    placeholder="Ex: Voici comment j'automatise mes ventes après 18h..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                    📝 Description & Idée partagée
                  </label>
                  <textarea
                    rows={2}
                    value={newReelDescription}
                    onChange={e => setNewReelDescription(e.target.value)}
                    placeholder="Expliquez votre idée, votre astuce ou présentez votre produit..."
                    className="w-full px-4 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-medium text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                    #️⃣ Hashtags
                  </label>
                  <input
                    type="text"
                    value={newReelHashtags}
                    onChange={e => setNewReelHashtags(e.target.value)}
                    placeholder="#WameetReels #Business #Shop"
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                    📂 Catégorie du Flux
                  </label>
                  <select
                    value={newReelCategory}
                    onChange={e => setNewReelCategory(e.target.value as WameetReelCategory)}
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-black text-[#2563EB] focus:outline-none"
                  >
                    <option value="FOR_YOU">🔥 Pour Vous</option>
                    <option value="IDEAS_BUSINESS">💡 Idées & Business</option>
                    <option value="SHOPPING_LIVE">🛍️ Shopping Live</option>
                  </select>
                </div>
              </div>

              {/* 4. Épingler un produit de mon Wameet Shop sur cette vidéo (Optionnel) */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-200 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-black text-[#2563EB] flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>🛍️ Épingler un produit de mon Wameet Shop sur cette vidéo (Optionnel)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={attachProductToReel}
                    onChange={e => setAttachProductToReel(e.target.checked)}
                    className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
                  />
                </label>

                {attachProductToReel && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1">
                        Choisir un produit existant ou créer une étiquette rapide :
                      </label>
                      <select
                        value={selectedPresetProductId}
                        onChange={e => setSelectedPresetProductId(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border-2 border-blue-300 text-xs font-bold text-slate-900 focus:outline-none"
                      >
                        <option value="custom">✨ Personnaliser un nouveau produit à épingler</option>
                        {PRESET_SHOP_PRODUCTS.map(prod => (
                          <option key={prod.id} value={prod.id}>
                            🛍️ {prod.name} • {prod.priceFcfa.toLocaleString('fr-FR')} FCFA
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedPresetProductId === 'custom' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">
                            Nom du Produit / Formation
                          </label>
                          <input
                            type="text"
                            value={customProductName}
                            onChange={e => setCustomProductName(e.target.value)}
                            placeholder="Ex: Pack Formation E-Commerce"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-semibold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">
                            Prix (FCFA)
                          </label>
                          <input
                            type="number"
                            value={customProductPrice}
                            onChange={e => setCustomProductPrice(e.target.value)}
                            placeholder="15000"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-semibold text-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">
                            Photo du Produit
                          </label>
                          <input
                            id="reel-custom-prod-file"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target?.result) {
                                    setCustomProductImageUrl(ev.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                          {!customProductImageUrl ? (
                            <button
                              type="button"
                              onClick={() => document.getElementById('reel-custom-prod-file')?.click()}
                              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-blue-300 bg-white hover:bg-blue-50 text-xs font-bold text-[#2563EB] flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Choisir une photo produit</span>
                            </button>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-white border border-blue-200 flex items-center gap-2.5">
                              <img
                                src={customProductImageUrl}
                                alt="Produit"
                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Photo produit prête ✓
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCustomProductImageUrl('')}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Boutons de validation */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateReelModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPublishingReel}
                  className="px-6 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {isPublishingReel ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Publication en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Publier mon Reel sur Wameet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lecteur Live Shopping Wameet (Hack Overscan & Mini-Player Swipe-to-Minimize) */}
      {isLiveStudioOpen && (
        <WameetLiveWrapper
          isOpen={isLiveStudioOpen}
          onClose={() => setIsLiveStudioOpen(false)}
        />
      )}

      {/* =====================================================================
          MODALE POP-UP SYNERGY MATCH ! 🎉 (RÉSONANCE MUTUELLE DÉTECTÉE)
         ===================================================================== */}
      {synergyModal && synergyModal.isOpen && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-2xl bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in select-none"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 duration-300">
            {/* Badge Étoilé */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4169E1]/20 border border-[#4169E1]/40 text-blue-200 text-xs font-black uppercase tracking-wider mb-4 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-[#4169E1]" />
              <span>Résonance Réciproque</span>
            </div>

            {/* Titre SYNERGY MATCH */}
            <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white via-blue-200 to-[#4169E1] bg-clip-text text-transparent tracking-widest uppercase mb-6 drop-shadow-lg">
              SYNERGY MATCH ! 🎉
            </h2>

            {/* Les Deux Avatars avec Diamant Rayonnant */}
            <div className="flex items-center justify-center gap-4 my-4 relative">
              <div className="w-20 h-20 rounded-full border-4 border-[#4169E1] p-1 bg-slate-900 shadow-[0_0_25px_rgba(65,105,225,0.6)] shrink-0">
                <img
                  src={currentUserProfile.avatarUrl}
                  alt={currentUserProfile.name}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-white/20 flex items-center justify-center text-2xl shadow-xl animate-bounce shrink-0">
                💎
              </div>
              <div className="w-20 h-20 rounded-full border-4 border-[#4169E1] p-1 bg-slate-900 shadow-[0_0_25px_rgba(65,105,225,0.6)] shrink-0">
                <img
                  src={synergyModal.creatorAvatar}
                  alt={synergyModal.creatorName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>

            {/* Message de Synergie */}
            <p className="text-sm text-slate-200 font-medium my-4 max-w-xs leading-relaxed">
              Une opportunité partagée vient d'éclore ! Vous et <strong className="text-white font-bold">{synergyModal.creatorName}</strong> avez résonné mutuellement.
            </p>

            {/* Bouton Direct : Lancer la Visio Instantanée */}
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                const room = synergyModal.roomUrl;
                setSynergyModal(null);
                setActiveVisioRoomUrl(room);
              }}
              className="w-full py-4 bg-[#4169E1] hover:bg-blue-600 text-white font-extrabold rounded-2xl shadow-[0_10px_30px_rgba(65,105,225,0.5)] active:scale-95 transition-all text-base flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Lancer la Visio Instantanée</span>
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={() => setSynergyModal(null)}
              className="text-xs text-slate-400 hover:text-white mt-4 cursor-pointer font-bold transition-colors py-2"
            >
              Continuer à explorer le fil
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          SALON VISIO INSTANTANÉ (DAILY.CO / JITSI VIA MEDIA DISPATCHER)
         ===================================================================== */}
      {activeVisioRoomUrl && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-3 bg-slate-900 border-b border-white/10 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">{visioSessionTitle}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveVisioRoomUrl(null)}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
            >
              Quitter
            </button>
          </div>
          <div className="flex-1 w-full h-full">
            <FeatureErrorBoundary featureName="Visio">
              <MediaDispatcher
                session_type="instant_match"
                roomUrl={activeVisioRoomUrl}
                creatorName={currentUserProfile.name}
                creatorAvatar={currentUserProfile.avatarUrl}
                title={visioSessionTitle}
                onLeave={() => setActiveVisioRoomUrl(null)}
                className="w-full h-full"
              />
            </FeatureErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
};

export const WameetReelsTView = WameetReelsView;
export default WameetReelsView;
export { ReelsScreen } from './ReelsScreen';
