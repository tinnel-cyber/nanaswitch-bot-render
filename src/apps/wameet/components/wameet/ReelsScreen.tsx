import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Plus,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  X,
  Send,
  Music,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Crown,
  UserPlus,
  Users,
  UserCheck,
  Copy,
  Briefcase,
  Video,
  Radio
} from 'lucide-react';
import { StealthYouTubePlayer, extractYouTubeVideoId } from '../../../../components/lms/video/StealthYouTubePlayer';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';
import { WameetReelProductTag, WameetReelComment, WameetReelItem } from './WameetReelsView';
import { TopNavOverlay } from './TopNavOverlay';
import { detectIsAIGenerated, AIGeneratedBadge } from './ReelDescriptionOverlay';
import { SingleReelPlayer } from './ReelVideoPlayer';
import { ReelVideoPreloader } from './ReelVideoPreloader';
import { ReelErrorBoundary } from '../../../../components/ReelErrorBoundary';
import { FeatureErrorBoundary } from '../../../../components/FeatureErrorBoundary';
import { ResonanceButton } from './ResonanceButton';
import { SocialInteractions } from './SocialInteractions';
import { ImmersiveVideoSearch } from '../../../../components/wameet/search';
import { MediaDispatcher } from './media/MediaDispatcher';
import { db } from '../../../../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export interface ReelsScreenProps {
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
  onOpenLiveShopping?: (seller: string) => void;
  onOpenCreateReel?: () => void;
  latestAddedReel?: WameetReelItem | null;
  onHeaderFooterVisibilityChange?: (visible: boolean) => void;
}

interface HeartBurstParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

const STORAGE_KEY_REELS = 'wameet_reels_v7';

export const formatFollowersCount = (count?: number | string): string => {
  if (count === undefined || count === null) return '1.2K';
  const num = typeof count === 'string' ? parseInt(count) : count;
  if (isNaN(num)) return String(count);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

export const INITIAL_REELS: WameetReelItem[] = [
  // 1. VIDÉO VERTICALE (9:16) #1
  {
    id: 'reel-v916-1',
    authorName: 'Awa Ouédraogo',
    authorHandle: '@awa.empire.bf',
    authorAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    authorBadge: '🛍️ Commerçante & E-Shop',
    isFollowing: false,
    followersCount: 1240,
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
    followersCount: 3480,
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
    followersCount: 2890,
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
    authorName: 'Nanasore Pro • Afrique',
    authorHandle: '@nanapos.officiel',
    authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
    authorBadge: '🚀 Affiche Promo SaaS',
    isFollowing: false,
    followersCount: 4560,
    mediaType: 'image',
    videoUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=900&auto=format&fit=crop&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=900&auto=format&fit=crop&q=85',
    title: '⚡ AFFICHE PROMO : Digitalisez votre boutique en 3 minutes chrono !',
    description:
      'Fini les cahiers de dettes perdus et les erreurs de caisse : activez votre terminal Nanasore Pro avec suivi des ventes en temps réel.',
    hashtags: ['#NaNaPOS', '#AffichePromo', '#FintechAfrique', '#CommerceModerne'],
    audioTrackName: 'Son Officiel • Nanasore Pro',
    category: 'IDEAS_BUSINESS',
    likesCount: 634,
    isLiked: false,
    bookmarksCount: 215,
    isBookmarked: true,
    sharesCount: 145,
    productTag: {
      id: 'shop-prod-promo-2',
      name: 'Pack Nanasore Pro Annuel + Formation Équipe Offerte',
      priceFcfa: 29000,
      imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=400&auto=format&fit=crop&q=80',
      sellerName: 'Nanasore Pro • Afrique',
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
    followersCount: 1870,
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
    isAIGenerated: false,
    createdAt: 'Il y a 1h'
  },
  // 6. VIDÉO VERTICALE GÉNÉRÉE PAR IA (Tinnela AI Studio / Replicate)
  {
    id: 'reel-ai-tinnela-1',
    authorName: 'Tinnela AI Studio',
    authorHandle: '@tinnela.ai',
    authorAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
    authorBadge: '✨ Moteur IA Officiel',
    isFollowing: true,
    followersCount: 5420,
    mediaType: 'video',
    videoUrl: '/videos/reel-business.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    title: 'Démonstration : Vidéo produit 9:16 générée en 60 secondes par IA 🚀✨',
    description:
      'Ce Reel promotionnel a été généré automatiquement via Tinnela AI Studio et le modèle Wan-2.1 Replicate. Découvrez la puissance de l\'IA générative pour vos tunnels de vente.',
    hashtags: ['#TinnelaAI', '#VideoIA', '#Replicate', '#InnovationAfrique', '#GenerativeAI'],
    audioTrackName: 'Cyber Synth • Tinnela AI Sound',
    category: 'IDEAS_BUSINESS',
    likesCount: 890,
    isLiked: false,
    bookmarksCount: 340,
    isBookmarked: false,
    sharesCount: 210,
    isAIGenerated: true,
    generatorEngine: 'Tinnela AI Studio',
    comments: [],
    createdAt: 'Il y a 10 min'
  }
];

export const ReelsScreen: React.FC<ReelsScreenProps> = ({
  currentUserProfile,
  onOpenWWithCreator,
  onBuyProductFromReel,
  onOpenCreateReel,
  latestAddedReel,
  onHeaderFooterVisibilityChange
}) => {
  const handleOpenCreatorChat = onOpenWWithCreator;
  const sanitizeReelItems = (list: WameetReelItem[]): WameetReelItem[] => {
    return list.map((item) => {
      const isAI = item.isAIGenerated ?? detectIsAIGenerated(item);
      let nextItem: WameetReelItem = { ...item, isAIGenerated: isAI };
      if (item.videoUrl && (item.videoUrl.includes('commondatastorage.googleapis.com') || item.videoUrl.includes('mixkit.co'))) {
        if (item.id === 'reel-v916-1' || item.videoUrl.includes('ForBiggerBlazes')) {
          return { ...nextItem, videoUrl: '/videos/reel-eshop.mp4' };
        }
        if (item.id === 'reel-v916-2' || item.videoUrl.includes('ForBiggerEscapes')) {
          return { ...nextItem, videoUrl: '/videos/reel-mentor.mp4' };
        }
        return { ...nextItem, videoUrl: '/videos/reel-business.mp4' };
      }
      return nextItem;
    });
  };

  const [reels, setReels] = useState<WameetReelItem[]>(() => {
    try {
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
    } catch (e) {}
  }, [reels]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Injection immédiate au début de la liste des Reels
  const handleUploadSuccess = (newReelData: WameetReelItem) => {
    const isAI = newReelData.isAIGenerated ?? detectIsAIGenerated(newReelData);
    const enrichedReel: WameetReelItem = {
      ...newReelData,
      isAIGenerated: isAI
    };
    setReels((prevReels) => [
      enrichedReel,
      ...prevReels.filter((r) => r.id !== enrichedReel.id && r.videoUrl !== enrichedReel.videoUrl),
    ]);
    setActiveIndex(0);
    setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      const firstVid = videoRefs.current[0];
      if (firstVid) {
        firstVid.currentTime = 0;
        firstVid.play().catch(() => {});
      }
    }, 50);
  };

  // Ajout immédiat d'un Reel dès sa publication (via prop ou événement global)
  useEffect(() => {
    if (latestAddedReel && (latestAddedReel.videoUrl || (latestAddedReel as any).mediaUrl)) {
      handleUploadSuccess(latestAddedReel);
    }
  }, [latestAddedReel]);

  useEffect(() => {
    const handleReelAdded = (event: Event) => {
      const customEvent = event as CustomEvent<WameetReelItem>;
      const newReel = customEvent.detail;
      if (newReel && (newReel.videoUrl || (newReel as any).mediaUrl)) {
        handleUploadSuccess(newReel);
      }
    };
    window.addEventListener('wameet:reel-added', handleReelAdded);
    return () => window.removeEventListener('wameet:reel-added', handleReelAdded);
  }, []);

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
              const isAI = typeof data.isAIGenerated === 'boolean'
                ? data.isAIGenerated
                : detectIsAIGenerated(data);
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
                followersCount: typeof data.followersCount === 'number' ? data.followersCount : 1240,
                isAIGenerated: isAI,
                generatorEngine: data.generatorEngine || (data.engine ? String(data.engine) : undefined),
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
        console.warn('[REELS] Impossible de récupérer les Reels Firestore :', err);
      }
    };
    fetchRemoteReels();
  }, []);

  // Obligatoire sur navigateurs mobiles pour autoriser l'autoPlay sans blocage initial, mais conserve le choix de l'utilisateur
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wameet_reels_muted');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (_) {}
    return true;
  });
  const [heartParticles, setHeartParticles] = useState<HeartBurstParticle[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Tiroirs et modales superposées
  const [commentsDrawerReelId, setCommentsDrawerReelId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
  const [isVipLoungeModalOpen, setIsVipLoungeModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedInviteReel, setSelectedInviteReel] = useState<WameetReelItem | null>(null);
  const [invitedContactIds, setInvitedContactIds] = useState<Set<string>>(new Set());
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Modale Pop-up Synergy Match (📡) & Visioconférence Instantanée
  const [synergyModal, setSynergyModal] = useState<{
    isOpen: boolean;
    roomUrl: string;
    creatorName: string;
    creatorAvatar: string;
  } | null>(null);
  const [activeVisioRoomUrl, setActiveVisioRoomUrl] = useState<string | null>(null);
  const [visioSessionTitle, setVisioSessionTitle] = useState<string>('Salon VIP • Consultation Directe');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const lastTapRef = useRef<{ time: number; reelId: string } | null>(null);

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
      onHeaderFooterVisibilityChange?.(visible);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Gestion du défilement snap vertical et détection de direction haute performance
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const currentScrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    if (clientHeight > 0) {
      const index = Math.round(currentScrollTop / clientHeight);
      if (index !== activeIndex && index >= 0 && index < reels.length) {
        setActiveIndex(index);
      }
    }

    // Calcul de la direction du scroll via requestAnimationFrame pour 60fps garanti
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const diff = currentScrollTop - lastScrollTopRef.current;
      const threshold = 10;

      if (diff > threshold && currentScrollTop > 24) {
        // Défilement vers le bas -> escamoter immédiatement le Header et le Footer
        updateChromeVisibility(false);
      } else if (diff < -threshold) {
        // Défilement vers le haut -> réapparaître instantanément
        updateChromeVisibility(true);
      }

      lastScrollTopRef.current = currentScrollTop;

      // Lorsque l'utilisateur s'arrête de défiler, réapparition automatique douce
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        updateChromeVisibility(true);
      }, 1200);
    });
  };

  // Gestion tactile fluide (onTouchStart / onTouchMove / onTouchEnd)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartYRef.current - currentY;
    if (diff > 16) {
      // Swipe vers le haut (le flux avance vers le bas) -> masquer Header/Footer
      updateChromeVisibility(false);
    } else if (diff < -16) {
      // Swipe vers le bas (le flux remonte) -> afficher Header/Footer
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

  // Nettoyage de l'animation frame et du timer d'inactivité
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Synchroniser la lecture vidéo selon l'index actif et la liste des Reels
  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      vid.defaultMuted = true;
      vid.muted = isMuted;
      if (i === activeIndex) {
        vid.play().catch((err) => {
          console.warn("Autoplay bloqué par le navigateur :", err);
        });
      } else {
        vid.pause();
      }
    });
  }, [activeIndex, reels, isMuted]);

  // Pause automatique générale lors du changement d'onglet ou minimisation
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        videoRefs.current.forEach((vid) => {
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

  // IntersectionObserver précis pour s'assurer que isActive passe toujours à true sur la slide visible
  // et met en pause immédiate les vidéos sorties de l'écran pour économiser la data
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
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
        threshold: [0.1, 0.3, 0.55, 0.85],
      }
    );

    slideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });

    return () => observer.disconnect();
  }, [reels, activeIndex]);

  // Double Tap pour Liker + Explosion de cœurs / Simple Tap pour débloquer/basculer la lecture
  const handleVideoSurfaceTap = (e: React.MouseEvent, reelId: string, idx: number) => {
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.reelId === reelId && now - lastTapRef.current.time < 320) {
      playValidationBeep();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const newP: HeartBurstParticle = {
        id: now + Math.random(),
        x,
        y,
        scale: 1.4 + Math.random() * 0.4,
        rotate: (Math.random() - 0.5) * 40
      };
      setHeartParticles(prev => [...prev, newP]);
      setTimeout(() => {
        setHeartParticles(prev => prev.filter(p => p.id !== newP.id));
      }, 900);

      // Mettre à jour l'état Like du Reel
      setReels(prev =>
        prev.map(r => {
          if (r.id !== reelId) return r;
          const currentCount = Number(r.likesCount) || 0;
          return {
            ...r,
            isLiked: true,
            likesCount: r.isLiked ? currentCount : currentCount + 1
          };
        })
      );
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, reelId };
      // Réactivation du Header/Footer sur simple tap si escamoté
      updateChromeVisibility(true);
      // Déblocage au simple clic pour surmonter toute restriction autoplay du navigateur
      const vid = videoRefs.current[idx];
      if (vid) {
        if (vid.paused) {
          vid.play().catch((err) => console.warn("Erreur lecture au tap :", err));
        } else {
          vid.pause();
        }
      }
    }
  };

  const handleToggleLikeReel = (reelId: string) => {
    playTapBeep();
    setReels(prev =>
      prev.map(r => {
        if (r.id !== reelId) return r;
        const nextLiked = !r.isLiked;
        const currentCount = Number(r.likesCount) || 0;
        const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
        return {
          ...r,
          isLiked: nextLiked,
          likesCount: nextCount
        };
      })
    );
  };

  const handleToggleFollow = (reelId: string, authorName: string) => {
    playValidationBeep();
    setReels(prev =>
      prev.map(r => {
        if (r.id !== reelId) return r;
        const nextFollow = !r.isFollowing;
        const currentCount = r.followersCount || 1240;
        const nextCount = nextFollow ? currentCount + 1 : Math.max(0, currentCount - 1);
        triggerToast(
          nextFollow
            ? `✅ Vous suivez maintenant ${authorName} ! (${formatFollowersCount(nextCount)} suivis)`
            : `Désabonné de ${authorName}`
        );
        return { ...r, isFollowing: nextFollow, followersCount: nextCount };
      })
    );
  };

  const handleToggleBookmark = (reelId: string) => {
    playTapBeep();
    setReels(prev =>
      prev.map(r => {
        if (r.id !== reelId) return r;
        const next = !r.isBookmarked;
        triggerToast(next ? '🔖 Reel enregistré dans vos favoris !' : 'Retiré des favoris');
        return {
          ...r,
          isBookmarked: next,
          bookmarksCount: next ? r.bookmarksCount + 1 : Math.max(0, r.bookmarksCount - 1)
        };
      })
    );
  };

  const handleShareReel = (reel: WameetReelItem) => {
    playTapBeep();
    if (navigator.share) {
      navigator.share({
        title: reel.title,
        text: `${reel.title} - Regardez sur Wameet Reels !`,
        url: window.location.href
      }).catch(() => {});
    } else {
      triggerToast('🔗 Lien du Reel copié dans le presse-papiers !');
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentsDrawerReelId || !newCommentText.trim()) return;
    playValidationBeep();
    const commentObj: WameetReelComment = {
      id: `rc-${Date.now()}`,
      authorName: currentUserProfile.name,
      authorHandle: currentUserProfile.handle,
      authorAvatar: currentUserProfile.avatarUrl,
      text: newCommentText.trim(),
      createdAt: "À l'instant"
    };
    setReels(prev =>
      prev.map(r =>
        r.id === commentsDrawerReelId
          ? { ...r, comments: [...r.comments, commentObj] }
          : r
      )
    );
    setNewCommentText('');
  };

  const activeCommentsReel = useMemo(
    () => reels.find(r => r.id === commentsDrawerReelId) || null,
    [reels, commentsDrawerReelId]
  );

  return (
    <div className="h-full w-full bg-black overflow-hidden relative select-none">
      {/* Toast Notification Flottant */}
      {toastMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Navigation Haute Flottante 100% Icônes & Transparente (Reels Wameet) */}
      <TopNavOverlay
        onOpenSalles={() => {
          playTapBeep();
          setIsClassroomModalOpen(true);
        }}
        onOpenSalonVip={() => {
          playValidationBeep();
          setIsVipLoungeModalOpen(true);
        }}
        isFollowing={reels[activeIndex]?.isFollowing}
        onToggleFollow={() => {
          const currentReel = reels[activeIndex];
          if (currentReel) {
            handleToggleFollow(currentReel.id, currentReel.authorName);
          }
        }}
        onOpenInviteFriends={() => {
          playTapBeep();
          setSelectedInviteReel(reels[activeIndex] || reels[0]);
          setIsInviteModalOpen(true);
        }}
        onAddReel={() => {
          playValidationBeep();
          if (onOpenCreateReel) {
            onOpenCreateReel();
          } else {
            triggerToast('🎬 Ouvrez le studio Reel pour publier');
          }
        }}
        onOpenFollowing={() => {
          triggerToast('👥 Vidéos de vos abonnements');
        }}
        onOpenSearch={() => {
          playTapBeep();
          setIsSearchOpen(true);
        }}
        className={`top-3 sm:top-4 left-3 right-3 transition-all duration-300 ease-in-out will-change-transform ${
          isChromeVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      />

      {/* Bouton Volume Aéré et Descendu à Droite (Ne coince plus le haut) */}
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
        className={`absolute top-16 right-3.5 z-30 w-8 h-8 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all duration-300 ease-in-out will-change-transform active:scale-90 cursor-pointer shadow-lg ${
          isChromeVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        title={isMuted ? 'Activer le son' : 'Couper le son'}
        aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-rose-300 stroke-[2.2]" />
        ) : (
          <Volume2 className="w-4 h-4 text-emerald-300 stroke-[2.2]" />
        )}
      </button>

      {/* Explosion de cœurs au double tap */}
      <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
        {heartParticles.map(p => (
          <div
            key={p.id}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `translate(-50%, -50%) scale(${p.scale}) rotate(${p.rotate}deg)`
            }}
            className="absolute animate-ping text-rose-500 drop-shadow-[0_4px_16px_rgba(244,63,94,0.9)]"
          >
            <Heart className="w-16 h-16 fill-rose-500 text-white stroke-[1.5]" />
          </div>
        ))}
      </div>

      {/* Pré-chargement invisible en arrière-plan des 2 prochaines vidéos (index + 1 & index + 2) */}
      <ReelVideoPreloader urls={
        [1, 2].map(offset => reels[activeIndex + offset]?.videoUrl).filter(Boolean) as string[]
      } />

      {/* =====================================================================
          CONTENEUR VERTICAL DES REELS : PLEIN ÉCRAN ABSOLU & SNAP-SCROLL
         ===================================================================== */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none flex flex-col items-center"
      >
        {reels.map((reel, idx) => {
          const mediaSrc = reel.videoUrl || (reel as any).mediaUrl || '';
          const reelTitle = reel.title || (reel as any).caption || 'Reel Wameet';
          const creatorName = reel.authorName || (reel as any).creatorName || 'Créateur Wameet';
          const isPosterItem = reel.mediaType === 'image';
          const isS3Video = !isPosterItem && (
            mediaSrc.includes('.mp4') ||
            mediaSrc.includes('.webm') ||
            mediaSrc.includes('.mov') ||
            mediaSrc.includes('.m3u8') ||
            mediaSrc.includes('amazonaws.com') ||
            mediaSrc.includes('cloudfront.net') ||
            mediaSrc.includes('storage.googleapis.com')
          );
          const isYouTubeReel = !isPosterItem && !isS3Video && Boolean(extractYouTubeVideoId(mediaSrc));
          const isCurrentActive = idx === activeIndex;

          return (
            <div
              key={reel.id}
              data-index={idx}
              ref={el => {
                slideRefs.current[idx] = el;
              }}
              onClick={e => handleVideoSurfaceTap(e, reel.id, idx)}
              className="h-[100dvh] w-full max-w-full md:max-w-md lg:max-w-lg shrink-0 snap-start snap-always relative overflow-hidden bg-black flex items-center justify-center mx-auto"
            >
              {/* =============================================================
                  LA VIDÉO 9:16 OU L'AFFICHE PROMOTIONNELLE : COUVRE 100% DE L'ÉCRAN
                 ============================================================= */}
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                {isPosterItem ? (
                  <div className="relative w-full h-full">
                    <img
                      src={reel.thumbnailUrl || mediaSrc}
                      alt={reelTitle}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-16 left-4 z-20 px-3 py-1 rounded-full bg-amber-500/95 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>Affiche Promotionnelle</span>
                    </div>
                  </div>
                ) : (
                  <ReelErrorBoundary key={reel.id}>
                    {isYouTubeReel ? (
                      /* Lecteur Stealth pour les vidéos YouTube Nanasore */
                      <div className="w-full h-full scale-[1.35] sm:scale-100 flex items-center justify-center">
                        <StealthYouTubePlayer
                          videoUrl={mediaSrc}
                          title={reelTitle}
                          hideBranding={true}
                          autoPlay={isCurrentActive}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      /* Lecteur Reel S3 natif dédié (<video> HTML5 standard pour AWS S3 / MP4) */
                      <SingleReelPlayer
                        key={mediaSrc}
                        videoUrl={mediaSrc}
                        posterUrl={reel.thumbnailUrl || (reel as any).posterUrl || undefined}
                        thumbnailUrl={reel.thumbnailUrl}
                        isActive={isCurrentActive}
                        isMuted={isMuted}
                        className="w-full h-full object-cover"
                        videoRef={el => {
                          videoRefs.current[idx] = el;
                        }}
                        onClick={e => handleVideoSurfaceTap(e, reel.id, idx)}
                      />
                    )}
                  </ReelErrorBoundary>
                )}
              </div>

              {/* Dégradé sombre inférieur : garantit la lisibilité des contrôles flottants */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />

              {/* Dégradé supérieur très léger */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent z-10" />

              {/* =============================================================
                  CONTRÔLES FLOTTANTS À DROITE (Style Wameet Pur)
                  Icônes transparentes, élégantes et compactes sans encombrer
                 ============================================================= */}
              <div
                className="absolute right-2 sm:right-3 bottom-3 sm:bottom-4 z-20 flex flex-col items-center gap-1.5 sm:gap-2 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] pointer-events-auto"
                style={{
                  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.4rem)',
                  paddingRight: 'env(safe-area-inset-right, 0px)'
                }}
              >
                {/* Avatar du Créateur avec bouton (+) */}
                <div className="relative mb-0.5">
                  <img
                    src={reel.authorAvatar}
                    alt={reel.authorName}
                    className="w-8.5 h-8.5 rounded-full object-cover border-1.5 border-white shadow-xl bg-slate-900"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFollow(reel.id, reel.authorName);
                    }}
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center text-white border border-white shadow-md transition-all duration-200 active:scale-90 cursor-pointer ${
                      reel.isFollowing ? 'bg-emerald-500' : 'bg-rose-500 hover:scale-110'
                    }`}
                    title={reel.isFollowing ? 'Abonné' : 'Suivre ce créateur'}
                  >
                    {reel.isFollowing ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Plus className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>
                </div>

                {/* =============================================================
                    BOUTON 1 : LA RÉSONANCE (📡)
                   ============================================================= */}
                <ResonanceButton
                  reelId={reel.id}
                  creatorId={(reel as any).authorId || (reel as any).creatorId || reel.authorHandle || 'creator_wameet'}
                  currentUserId={currentUserProfile.handle || 'user_me'}
                  currentUserName={currentUserProfile.name || 'Moi'}
                  initialResonanceCount={(reel as any).resonanceCount || 0}
                  onSynergyMatchTriggered={(roomUrl) => {
                    playValidationBeep();
                    setSynergyModal({
                      isOpen: true,
                      roomUrl,
                      creatorName: reel.authorName,
                      creatorAvatar: reel.authorAvatar
                    });
                  }}
                />

                {/* Bouton Like (Cœur) */}
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLikeReel(reel.id);
                    }}
                    className="w-8.5 h-8.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition active:scale-75 cursor-pointer shadow-sm"
                    title="J'aime ce Reel"
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors duration-200 ${
                        reel.isLiked
                          ? 'fill-rose-500 text-rose-500 scale-110'
                          : 'fill-white/15 text-white stroke-[2]'
                      }`}
                    />
                  </button>
                  <span className="text-[9px] font-bold text-white drop-shadow-md leading-none">
                    {reel.likesCount}
                  </span>
                </div>

                {/* =============================================================
                    BOUTON 4 : COMMENTAIRES (💬) & PARTAGE SOCIAL (↪️)
                   ============================================================= */}
                <SocialInteractions
                  reelId={reel.id}
                  reelTitle={reel.title}
                  currentUserId={currentUserProfile.handle || 'user_me'}
                  currentUserName={currentUserProfile.name || 'Moi'}
                  currentUserAvatarUrl={currentUserProfile.avatarUrl}
                  initialCommentCount={(reel.comments || []).length || (reel as any).commentCount || (reel as any).commentsCount || 0}
                  initialShareCount={reel.sharesCount || (reel as any).shareCount || 0}
                  initialComments={(reel.comments || []).map((c: any, idx: number) => ({
                    id: c.id || `c-${idx}`,
                    userId: c.authorHandle || c.userId || 'user',
                    userName: c.authorName || c.userName || 'Membre Wameet',
                    userAvatarUrl: c.authorAvatar || c.userAvatarUrl,
                    text: c.text,
                    createdAt: c.createdAt
                  }))}
                  onShareClick={() => triggerToast('Lien du Reel prêt à être partagé !')}
                />

                {/* Bouton Favoris / Bookmark */}
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBookmark(reel.id);
                    }}
                    className="w-8.5 h-8.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition active:scale-75 cursor-pointer shadow-sm"
                    title="Enregistrer dans mes favoris"
                  >
                    <Bookmark
                      className={`w-4 h-4 transition-colors duration-200 ${
                        reel.isBookmarked
                          ? 'fill-amber-400 text-amber-400 scale-110'
                          : 'fill-white/15 text-white stroke-[2]'
                      }`}
                    />
                  </button>
                  <span className="text-[9px] font-bold text-white drop-shadow-md leading-none">
                    {reel.bookmarksCount}
                  </span>
                </div>

                {/* Disque Vinyle Rotatif Style Wameet */}
                <div className="w-7 h-7 rounded-full border border-white/60 bg-gradient-to-tr from-slate-900 to-slate-700 flex items-center justify-center animate-spin [animation-duration:6s] shadow-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-white/40 flex items-center justify-center">
                    <Music className="w-1.5 h-1.5 text-white" />
                  </div>
                </div>
              </div>


              {/* =============================================================
                  INFOS DU CRÉATEUR & LÉGENDE (POSITION BASSE POUR LIBÉRER LA VIDÉO)
                 ============================================================= */}
              <div
                className="absolute left-3.5 right-16 bottom-3 sm:bottom-4 z-20 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] space-y-1 pointer-events-auto max-w-[78%]"
                style={{
                  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.4rem)',
                  paddingLeft: 'env(safe-area-inset-left, 0px)'
                }}
              >
                {/* Avertissement Vidéo générée par IA (Tinnela AI Studio / Gemini / Pollinations / Replicate) */}
                {(reel.isAIGenerated || detectIsAIGenerated(reel)) && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 text-[10px] text-slate-300 font-medium">
                    <span>✨</span>
                    <span>Vidéo générée par IA</span>
                  </div>
                )}

                {/* Auteur + Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black tracking-tight drop-shadow-md">
                    {reel.authorName}
                  </span>
                  <span className="text-xs font-semibold text-white/80">
                    {reel.authorHandle}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white border border-white/30">
                    {reel.authorBadge}
                  </span>
                </div>

                {/* Titre & Description du Reel */}
                <p className="text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-white/95 drop-shadow-md">
                  {reel.title}
                </p>

                {/* Hashtags */}
                <div className="flex flex-wrap gap-1.5 text-xs font-bold text-white/90">
                  {reel.hashtags.map((tag) => (
                    <span key={tag} className="hover:underline cursor-pointer">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Piste Audio & Musique */}
                <div className="flex items-center gap-2 text-xs font-medium text-white/80 pt-0.5">
                  <Music className="w-3.5 h-3.5 animate-pulse text-white/90 shrink-0" />
                  <span className="truncate">{reel.audioTrackName}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          TIROIR COMMENTAIRES FLOTTANT (BOTTOM SHEET STYLE WAMEET)
         ===================================================================== */}
      {commentsDrawerReelId && activeCommentsReel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg mx-auto bg-slate-950/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl text-white shadow-2xl flex flex-col max-h-[65vh] animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header du tiroir */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-black tracking-wider uppercase">
                {(activeCommentsReel.comments || []).length} Commentaires
              </span>
              <button
                type="button"
                onClick={() => setCommentsDrawerReelId(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste défilante des commentaires */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {(activeCommentsReel.comments || []).length === 0 ? (
                <p className="text-center text-xs text-white/50 py-8">
                  Soyez le premier à commenter ce Reel ! ✨
                </p>
              ) : (
                (activeCommentsReel.comments || []).map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <img
                      src={c.authorAvatar}
                      alt={c.authorName}
                      className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{c.authorName}</span>
                        <span className="text-[10px] text-white/40">{c.createdAt}</span>
                      </div>
                      <p className="text-xs text-white/80 mt-0.5 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input de saisie de commentaire */}
            <form onSubmit={handleAddComment} className="p-3 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Ajouter un commentaire bienveillant..."
                className="flex-1 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer transition active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
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

      {/* =====================================================================
          MODALE SALLE DE CLASSE (CAMPUS E-LEARNING WAMEET)
         ===================================================================== */}
      {isClassroomModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsClassroomModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Salle de Classe Wameet</h3>
                  <p className="text-[11px] text-white/60">Campus live & Masterclasses interactives</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClassroomModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste des Salles de Cours Ouvertes */}
            <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
              {[
                {
                  id: 'cls-1',
                  title: 'Masterclass : IA & Automatisation Business',
                  instructor: 'Dr. Alex Kouamé',
                  participants: 48,
                  badge: 'En Direct 🔴',
                  color: 'from-blue-600/30 to-indigo-600/20'
                },
                {
                  id: 'cls-2',
                  title: 'Stratégies Vente & Pitch Haute Conversion',
                  instructor: 'Sarah Mensah',
                  participants: 32,
                  badge: 'En Direct 🔴',
                  color: 'from-purple-600/30 to-pink-600/20'
                },
                {
                  id: 'cls-3',
                  title: 'Création de Contenu Viral & Storytelling',
                  instructor: 'David Konan',
                  participants: 64,
                  badge: 'Ouvert',
                  color: 'from-emerald-600/30 to-teal-600/20'
                }
              ].map((cls) => (
                <div
                  key={cls.id}
                  className={`p-3.5 rounded-2xl bg-gradient-to-r ${cls.color} border border-white/10 flex items-center justify-between gap-3`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                        {cls.badge}
                      </span>
                      <span className="text-[11px] text-white/70">👥 {cls.participants} élèves</span>
                    </div>
                    <h4 className="text-xs font-bold leading-tight">{cls.title}</h4>
                    <p className="text-[11px] text-white/60">Formateur : {cls.instructor}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      setIsClassroomModalOpen(false);
                      setVisioSessionTitle(`Salle de Classe • ${cls.title}`);
                      setActiveVisioRoomUrl('https://nanasore.daily.co/classroom-masterclass');
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition cursor-pointer shrink-0"
                  >
                    Rejoindre
                  </button>
                </div>
              ))}
            </div>

            {/* Footer rapide */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span>📚 3 salles de classe actives</span>
              <button
                type="button"
                onClick={() => {
                  setIsClassroomModalOpen(false);
                  window.location.href = '/salles-vip';
                }}
                className="text-indigo-300 hover:underline font-bold"
              >
                Explorer tout le Campus →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE SALON VIP (EXPERT COACH, PARTENAIRE D'AFFAIRES, RENCONTRE VIP)
         ===================================================================== */}
      {isVipLoungeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsVipLoungeModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-950/90 backdrop-blur-2xl border border-amber-400/30 rounded-3xl p-5 text-white shadow-[0_0_50px_rgba(245,158,11,0.2)] space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header VIP */}
            <div className="flex items-center justify-between border-b border-amber-400/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black tracking-tight text-amber-200">Salons VIP Exclusifs</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                      PREMIUM
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60">Espaces réservés : Experts, Partenaires & Décideurs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVipLoungeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Les 3 Salons VIP demandés explicitement */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {/* Salon 1 : Salon VIP Expert Coach */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300">
                      <Radio className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-amber-200">1. Salon VIP Expert Coach</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    En direct
                  </span>
                </div>
                <p className="text-[11px] text-white/80 leading-relaxed">
                  Coaching individuel haute performance, conseils stratégiques et audit sur-mesure par nos coachs certifiés.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-white/50">👥 12 coachs en ligne</span>
                  <button
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      setIsVipLoungeModalOpen(false);
                      setVisioSessionTitle('Salon VIP • Expert Coach');
                      setActiveVisioRoomUrl('https://nanasore.daily.co/vip-coach-lounge');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                  >
                    Entrer au Salon
                  </button>
                </div>
              </div>

              {/* Salon 2 : Salon VIP Partenaire d'Affaires */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent border border-blue-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-400/20 flex items-center justify-center text-blue-300">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-blue-200">2. Salon VIP Partenaire d'Affaires</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-300">B2B & Deals</span>
                </div>
                <p className="text-[11px] text-white/80 leading-relaxed">
                  Pitchs d'opportunités, négociations d'alliances stratégiques, investissements et partenariats commerciaux.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-white/50">🤝 8 sessions B2B ouvertes</span>
                  <button
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      setIsVipLoungeModalOpen(false);
                      setVisioSessionTitle("Salon VIP • Partenaire d'Affaires");
                      setActiveVisioRoomUrl('https://nanasore.daily.co/vip-business-partners');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                  >
                    Rejoindre le Deal
                  </button>
                </div>
              </div>

              {/* Salon 3 : Salon VIP Rencontre VIP */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-transparent border border-rose-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-400/20 flex items-center justify-center text-rose-300">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-rose-200">3. Salon VIP Rencontre VIP</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-300">Réseautage Élite</span>
                </div>
                <p className="text-[11px] text-white/80 leading-relaxed">
                  Table ronde privée entre membres sélects. Discussions confidentielles, networking de prestige et synergie directe.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-white/50">✨ Entrée sur réservation</span>
                  <button
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      setIsVipLoungeModalOpen(false);
                      setVisioSessionTitle('Salon VIP • Rencontre VIP');
                      setActiveVisioRoomUrl('https://nanasore.daily.co/vip-elite-networking');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                  >
                    Rejoindre le Salon
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span>🔒 Espaces sécurisés & cryptés</span>
              <button
                type="button"
                onClick={() => {
                  setIsVipLoungeModalOpen(false);
                  window.location.href = '/vip';
                }}
                className="text-amber-300 hover:underline font-bold"
              >
                Détails de l'abonnement VIP →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE INVITER DES AMIS (WHATSAPP, LIEN, CONTACTS WAMEET)
         ===================================================================== */}
      {isInviteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsInviteModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Inviter des Amis</h3>
                  <p className="text-[11px] text-white/60">Partagez ce Reel et connectez-vous ensemble</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Boutons d'Action Rapide de Partage */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* WhatsApp direct */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  const reelTitle = selectedInviteReel?.title || 'ce Reel exclusif';
                  const shareUrl = window.location.href;
                  const text = encodeURIComponent(`Regarde "${reelTitle}" sur Wameet Reels ! Découvre aussi les salons VIP et masterclasses ici : ${shareUrl}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                  triggerToast('💬 WhatsApp ouvert pour inviter vos amis !');
                }}
                className="p-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 flex items-center gap-2.5 text-left transition active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">WhatsApp</div>
                  <div className="text-[10px] text-emerald-300">Inviter directement</div>
                </div>
              </button>

              {/* Copier le lien */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  try {
                    navigator.clipboard.writeText(window.location.href);
                    triggerToast('📋 Lien copié dans le presse-papiers !');
                  } catch (_) {
                    triggerToast('📋 Lien prêt à partager !');
                  }
                }}
                className="p-3 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 flex items-center gap-2.5 text-left transition active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Copier le Lien</div>
                  <div className="text-[10px] text-blue-300">Partage partout</div>
                </div>
              </button>
            </div>

            {/* Suggestions d'amis Wameet */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Amis suggérés sur Wameet
              </span>
              <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                {[
                  { id: 'f-1', name: 'Karim Traoré', handle: '@karim_t', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
                  { id: 'f-2', name: 'Amina Diop', handle: '@amina_d', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
                  { id: 'f-3', name: 'Jean-Luc Koffi', handle: '@jeanluc_k', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
                  { id: 'f-4', name: 'Fatou Sow', handle: '@fatou_s', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }
                ].map((friend) => {
                  const isInvited = invitedContactIds.has(friend.id);
                  return (
                    <div
                      key={friend.id}
                      className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-9 h-9 rounded-full object-cover border border-white/20"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{friend.name}</div>
                          <div className="text-[10px] text-white/50">{friend.handle}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setInvitedContactIds(prev => {
                            const next = new Set(prev);
                            if (next.has(friend.id)) {
                              next.delete(friend.id);
                              triggerToast(`Invitation annulée pour ${friend.name}`);
                            } else {
                              next.add(friend.id);
                              triggerToast(`✉️ Invitation envoyée à ${friend.name} !`);
                            }
                            return next;
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                          isInvited
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {isInvited ? 'Invité ✓' : 'Inviter'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bouton Partage Natif Mobile */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  navigator.share({
                    title: selectedInviteReel?.title || 'Wameet Reels',
                    text: `Découvre ce Reel sur Wameet : ${selectedInviteReel?.title || ''}`,
                    url: window.location.href
                  }).catch(() => {});
                }}
                className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer border border-white/15"
              >
                <Share2 className="w-4 h-4 text-white/80" />
                <span>Autres options de partage du téléphone...</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          RECHERCHE VIDÉO IMMERSIVE (IMMERSED SEARCH & CREATOR PROFILE CARDS)
         ===================================================================== */}
      <ImmersiveVideoSearch
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        showFloatingBar={false}
        onSearchStateChange={(isOpen) => {
          if (isOpen) {
            setIsMuted(true);
          }
        }}
        onSelectVideo={(video) => {
          setIsSearchOpen(false);
          triggerToast(`🎬 Lancement de : "${video.title}"`);
          if (video.videoUrl) {
            setReels(prev => [{
              id: video.id || `search-${Date.now()}`,
              authorName: video.authorName || 'Créateur Wameet',
              authorHandle: video.authorHandle || '@createur',
              authorAvatar: video.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
              authorBadge: '✨ Recherche',
              isFollowing: false,
              mediaType: 'video',
              videoUrl: video.videoUrl,
              thumbnailUrl: video.thumbnailUrl,
              title: video.title,
              description: video.title,
              hashtags: ['#WameetSearch'],
              audioTrackName: 'Audio Original • Wameet',
              category: 'SEARCH',
              likesCount: video.likesCount || 10,
              isLiked: false,
              bookmarksCount: 0,
              isBookmarked: false,
              sharesCount: 0,
              followersCount: 1200,
              comments: [],
              createdAt: 'À l’instant'
            }, ...prev]);
            setActiveIndex(0);
          }
        }}
        onSelectLive={(live) => {
          setIsSearchOpen(false);
          triggerToast(`🔴 Connexion au Live de ${live.creatorName}...`);
        }}
        onOpenChatWithCreator={(creator) => {
          setIsSearchOpen(false);
          if (onOpenWWithCreator) {
            onOpenWWithCreator({
              name: creator.name,
              handle: creator.handle,
              avatarUrl: creator.avatarUrl
            });
          }
        }}
      />
    </div>
  );
};

export default ReelsScreen;
