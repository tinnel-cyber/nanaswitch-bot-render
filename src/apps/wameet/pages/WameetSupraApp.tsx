import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  ArrowLeft,
  Check,
  MessageSquare,
  Upload,
  CheckCircle2,
  Video,
  Image as ImageIcon
} from 'lucide-react';

import { StoreUser } from '../../../types';
import { StealthYouTubePlayer, extractYouTubeVideoId } from '../../../components/lms/video/StealthYouTubePlayer';
import { ReelsScreen } from '../../../components/wameet/ReelsScreen';
import { WameetReelProductTag, WameetReelItem } from '../../../components/wameet/WameetReelsView';
import { ChatListScreen } from '../../../components/wameet/ChatListScreen';
import { WameetMiniShopView } from '../../../components/wameet/WameetMiniShopView';
import { WameetIsolatedExtensionApp } from '../extension/WameetIsolatedExtensionApp';
import { WameetOnboardingModal } from '../../../components/wameet/WameetOnboardingModal';
import { WameetLiveWrapper } from '../../../components/wameet/WameetLiveWrapper';
import { DeliveryHeatmapScreen } from '../../../components/delivery/DeliveryHeatmapScreen';
import { CagnotteGroupDemoScreen } from '../../../components/wameet/cagnotte/CagnotteGroupDemoScreen';
import { VipDiscoveryScreen } from '../../../components/wameet/vip';
import { WameetAppHeader } from '../../../components/wameet/WameetAppHeader';
import { WameetBottomTabBar } from '../../../components/wameet/WameetBottomTabBar';
import { WameetLayout } from '../../../components/wameet/WameetLayout';
import { WameetSidebarDrawer } from '../../../components/wameet/WameetSidebarDrawer';
import { NanasoreProShowcaseModal } from '../../../components/wameet/NanasoreProShowcaseModal';
import { WameetPrivacySecurityScreen } from '../../../components/wameet/WameetPrivacySecurityScreen';
import { WameetWalletFinanceScreen } from '../../../components/wameet/WameetWalletFinanceScreen';
import { SocialFeedScreen } from '../../../components/wameet/SocialFeedScreen';
import { WameetNotificationsModal } from '../../../components/wameet/WameetNotificationsModal';
import { SettingsMainScreen } from '../../../components/wameet/SettingsMainScreen';
import { ActiveSearchOverlay } from '../../../components/wameet/search/ActiveSearchOverlay';
import {
  LiveShoppingGatewayBottomSheet,
  VipLoungeGatewayBottomSheet,
  SwarmDeliveryGatewayBottomSheet
} from '../../../components/wameet/ActionBottomSheet';
import { MiniAppActionPayload } from '../../../components/wameet/MiniAppsGridModal';
import { VipYouTubePlayer } from '../../../components/wameet/vip/VipYouTubePlayer';
import { LiveShoppingJitsiEngine } from '../../../components/wameet/LiveShoppingJitsiEngine';
import ComposantUploadVideo from '../../../components/ComposantUploadVideo';
import { WameetReelUploadStudio } from '../../../components/wameet/WameetReelUploadStudio';
import { detectIsAIGenerated } from '../../../components/wameet/ReelDescriptionOverlay';
import { VideoUploadModal } from '../../../components/upload/VideoUploadModal';
import { WameetModal } from '../../../components/wameet/WameetModal';
import { GuichetModal } from '../../../components/wameet/GuichetModal';
import { WameetPremiumPaymentModal } from '../../../components/wameet/WameetPremiumPaymentModal';
import { WameetAppointmentModal } from '../../../components/wameet/WameetAppointmentModal';
import { WameetRoom } from '../../../components/wameet/WameetRoom';
import { wameetNotificationService } from '../../../services/wameetNotificationService';
import { 
  getWameetAppointments, 
  getImminentAppointment, 
  WameetAppointment 
} from '../../../services/wameetAppointmentService';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { db } from '../../../firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

export type WameetTabId = 'WALL_PROFILE' | 'REELS' | 'W_CHAT' | 'SHOP' | 'VIP_HUB';

export interface WameetProfileData {
  name: string;
  handle: string;
  avatarUrl: string;
  bannerUrl: string;
  statusBadge: string;
  bio: string;
  city: string;
  followersCount: number;
  heartsCount: number;
  reelsCount: number;
  shopProductsCount: number;
  isOnline: boolean;
  impactScore: number;
}

export interface WameetStoryItem {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorBadge: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption: string;
  createdAt: string;
  viewsCount: number;
  likesCount: number;
  consultationPrice?: number; // Prompt 7 : Tarif de la consultation en FCFA
}

export interface WameetPollOption {
  id: string;
  text: string;
  votes: number;
}

export interface WameetCommentItem {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorHandle?: string;
  text: string;
  createdAt: string;
  parentId?: string | null;
  replyToId?: string | null;
  replyToAuthor?: string | null;
  status?: 'approved' | 'pending' | 'rejected';
}

export interface WameetModerationSettings {
  filterMode: 'all' | 'blocked_words' | 'manual_approval';
  blockedWords: string[];
}

export interface WameetPostItem {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorBadge: string;
  isOnline: boolean;
  createdAt: string;
  content: string;
  mediaType?: 'none' | 'video' | 'image' | 'audio' | 'poll';
  mediaUrl?: string;
  pollQuestion?: string;
  pollOptions?: WameetPollOption[];
  votedOptionId?: string | null;
  likesCount: number;
  lovesCount: number;
  ideasCount: number;
  sharesCount: number;
  userReaction?: 'like' | 'love' | 'idea' | null;
  comments: WameetCommentItem[];
  attachedMiniApp?: {
    type: string;
    title: string;
    subtitle?: string;
    amountFcfa?: number;
    badge?: string;
    imageUrl?: string;
    meta?: Record<string, any>;
  };
  impactScore?: number;
  moderationSettings?: WameetModerationSettings;
}

export interface WameetSupraAppProps {
  currentUser?: StoreUser | null;
  initialTab?: WameetTabId;
  onOpenPrivateCampus?: () => void;
  onBackToDashboard?: () => void;
}

export const STATUS_BADGE_PRESETS = [
  '🌙 Détente & Idées après le boulot',
  '🚀 Entrepreneur',
  '🛍️ Commerçant',
  '🎓 Formateur',
  '🎨 Créateur Digital',
  '💡 Innovateur Tech & Business'
];

export const DEFAULT_PROFILE: WameetProfileData = {
  name: 'Ibrahim Pousbila Konkobo',
  handle: '@ibrahim.wameet',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  bannerUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&auto=format&fit=crop&q=80',
  statusBadge: '🌙 Détente & Idées après le boulot',
  bio: 'Bienvenue sur Wameet ("Wa" = Viens en Mooré + "Meet" = Se retrouver) ! On se retrouve après le travail pour échanger nos grandes idées, regarder des Reels, discuter et développer nos projets.',
  city: 'Ouagadougou • Abidjan • Dakar',
  followersCount: 14820,
  heartsCount: 89450,
  reelsCount: 42,
  shopProductsCount: 18,
  isOnline: true,
  impactScore: 18450
};

export const INITIAL_STORIES: WameetStoryItem[] = [
  {
    id: 'story-1',
    authorName: 'Ibrahim Pousbila',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    authorBadge: '🚀 Entrepreneur',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&auto=format&fit=crop&q=80',
    caption: 'Session de coaching après le travail à Ouaga ! Grande vision pour nos boutiques.',
    createdAt: 'Il y a 25 min',
    viewsCount: 342,
    likesCount: 88,
    consultationPrice: 15000
  },
  {
    id: 'story-coach',
    authorName: 'Coach Moussa',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorBadge: '🎓 Coach Vente',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&auto=format&fit=crop&q=80',
    caption: 'Session intensive : Clôture de ventes en direct & stratégie business 1-to-1.',
    createdAt: 'Il y a 10 min',
    viewsCount: 420,
    likesCount: 150,
    consultationPrice: 20000
  },
  {
    id: 'story-2',
    authorName: 'Awa Ouédraogo',
    authorAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    authorBadge: '🛍️ Mode & Beauté',
    mediaType: 'video',
    mediaUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    caption: 'Arrivage direct de la nouvelle collection wax & accessoires !',
    createdAt: 'Il y a 1 h',
    viewsCount: 512,
    likesCount: 140
  },
  {
    id: 'story-3',
    authorName: 'Mamadou Diallo',
    authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    authorBadge: '💡 Fintech & Crypto',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&auto=format&fit=crop&q=80',
    caption: 'Qui est connecté ce soir pour débattre e-commerce & IA en Afrique ?',
    createdAt: 'Il y a 3 h',
    viewsCount: 625,
    likesCount: 192
  }
];

export const INITIAL_POSTS: WameetPostItem[] = [
  // 1. VIDÉO VERTICALE (9:16) #1
  {
    id: 'post-wameet-v916-1',
    authorName: 'Awa Ouédraogo',
    authorHandle: '@awa.empire.bf',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    authorBadge: '🛍️ E-Shop & Mode Wax',
    isOnline: true,
    createdAt: 'À l’instant',
    content: '🔥 45 commandes expédiées ce soir sur Wameet Shop ! Les coulisses de l’atelier de confection en direct (Format 9:16).',
    description: '🔥 45 commandes expédiées ce soir sur Wameet Shop ! Les coulisses de l’atelier de confection en direct (Format 9:16).',
    mediaType: 'video',
    mediaUrl: '/videos/reel-eshop.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80',
    likesCount: 348,
    lovesCount: 180,
    ideasCount: 94,
    sharesCount: 52,
    impactScore: 19450,
    category: 'E-Commerce',
    userReaction: null,
    comments: [
      {
        id: 'c-1',
        authorName: 'Aïcha Traoré',
        authorAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&auto=format&fit=crop&q=80',
        text: 'Le lecteur vidéo vertical intégré dans le mur est ultra fluide ! Bravo 🔥',
        createdAt: 'Il y a 8 min',
        status: 'approved'
      }
    ],
    moderationSettings: {
      filterMode: 'all',
      blockedWords: []
    }
  },
  // 2. AFFICHE PROMOTIONNELLE DE TEST #1
  {
    id: 'post-wameet-poster-1',
    authorName: 'Amadou Sanogo • Wax Royal',
    authorHandle: '@amadou.wax',
    authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    authorBadge: '🏷️ Vente Flash & Mode Wax',
    isOnline: true,
    createdAt: 'Il y a 15 min',
    content: '🎉 Affiche Promo : -40% sur toute la collection Wax Authentique jusqu’à minuit ! Commandez directement en 1 clic.',
    description: '🎉 Affiche Promo : -40% sur toute la collection Wax Authentique jusqu’à minuit ! Commandez directement en 1 clic.',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1080&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1080&auto=format&fit=crop&q=80',
    likesCount: 642,
    lovesCount: 310,
    ideasCount: 125,
    sharesCount: 88,
    impactScore: 28900,
    category: 'Vente Flash',
    userReaction: null,
    comments: []
  },
  // 3. VIDÉO VERTICALE (9:16) #2
  {
    id: 'post-wameet-v916-2',
    authorName: 'Dr. Idriss Kaboré',
    authorHandle: '@idriss.mentor',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    authorBadge: '🎓 Mentor & Formateur',
    isOnline: true,
    createdAt: 'Il y a 25 min',
    content: '💡 3 Secrets pour vendre votre savoir en automatique et lancer votre guichet Wameet (Format 9:16).',
    description: '💡 3 Secrets pour vendre votre savoir en automatique et lancer votre guichet Wameet (Format 9:16).',
    mediaType: 'video',
    mediaUrl: '/videos/reel-mentor.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&auto=format&fit=crop&q=80',
    likesCount: 512,
    lovesCount: 240,
    ideasCount: 160,
    sharesCount: 78,
    impactScore: 24800,
    category: 'Business',
    userReaction: null,
    comments: []
  },
  // 4. AFFICHE PROMOTIONNELLE DE TEST #2
  {
    id: 'post-wameet-poster-2',
    authorName: 'Mariam Traoré • Live Commerce',
    authorHandle: '@mariam.live',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    authorBadge: '🚀 Masterclass & Live Commerce',
    isOnline: true,
    createdAt: 'Il y a 40 min',
    content: '⚡ Affiche Officielle : Masterclass Live comment scaler votre business en ligne avec les Tunnels Nanasore et Wameet.',
    description: '⚡ Affiche Officielle : Masterclass Live comment scaler votre business en ligne avec les Tunnels Nanasore et Wameet.',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1080&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1080&auto=format&fit=crop&q=80',
    likesCount: 890,
    lovesCount: 420,
    ideasCount: 230,
    sharesCount: 145,
    impactScore: 34100,
    category: 'Formation VIP',
    userReaction: null,
    comments: []
  },
  // 5. VIDÉO VERTICALE (9:16) #3
  {
    id: 'post-wameet-v916-3',
    authorName: 'Fatou Ndiaye',
    authorHandle: '@fatou.tech',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    authorBadge: '⚡ Tech & Innovation',
    isOnline: true,
    createdAt: 'Il y a 55 min',
    content: '🚀 Lancement du Hackathon Wameet Supra à Abidjan ! L’écosystème numérique africain en direct (Format 9:16).',
    description: '🚀 Lancement du Hackathon Wameet Supra à Abidjan ! L’écosystème numérique africain en direct (Format 9:16).',
    mediaType: 'video',
    mediaUrl: '/videos/reel-business.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&auto=format&fit=crop&q=80',
    likesCount: 289,
    lovesCount: 140,
    ideasCount: 88,
    sharesCount: 39,
    impactScore: 16320,
    category: 'Innovation',
    userReaction: null,
    comments: []
  }
];

export const ImageLinkHelperNotice: React.FC<{ className?: string }> = () => null;

/**
 * ARCHITECTURE PRINCIPALE WAMEET "APP SHELL" & SWIPE DES 3 PILIERS (PROMPT 42)
 * Directives :
 * - Conteneur App Shell : h-screen w-screen overflow-hidden bg-white. Aucune marge.
 * - Conteneur Coulissant (Swipe/Carousel) : snap-x snap-mandatory flex w-full h-full overflow-x-auto.
 * - Les 3 écrans (100% de la largeur w-screen shrink-0 snap-center) :
 *   1. Accueil (Feed Wameet)
 *   2. Reels (Reels Wameet)
 *   3. Chats (Messagerie Wameet)
 * - Header Global :
 *   - En haut à gauche : Icône "3 points" (Menu hamburger stylisé) ouvrant le tiroir.
 *   - Au centre : Logo Wameet.
 *   - En haut à droite : Icône de recherche et de notification.
 *   - ATTENTION : Disparaît complètement et automatiquement sur l'écran des Reels.
 */
export const WameetSupraApp: React.FC<WameetSupraAppProps> = ({
  currentUser,
  initialTab = 'WALL_PROFILE',
  onOpenPrivateCampus,
  onBackToDashboard
}) => {
  // Navigation 3 Piliers Swipe
  // 0 = Accueil (Feed Wameet), 1 = Reels (Reels Wameet), 2 = Chats (Messagerie Wameet)
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const [activeScreenIndex, setActiveScreenIndex] = useState<0 | 1 | 2>(() => {
    if (initialTab === 'REELS') return 1;
    if (initialTab === 'WHATSAPP' || (initialTab as any) === 'W_CHAT') return 2;
    return 0;
  });
  const isProgrammaticScrollRef = useRef(false);

  // Détection du Swipe horizontal
  const handleScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    if (!swipeContainerRef.current) return;
    const { scrollLeft, clientWidth } = swipeContainerRef.current;
    if (clientWidth > 0) {
      const page = Math.round(scrollLeft / clientWidth);
      if (page >= 0 && page <= 2 && page !== activeScreenIndex) {
        setActiveScreenIndex(page as 0 | 1 | 2);
      }
    }
  };

  // Escamotage dynamique immersif du Header / Footer lors du visionnage des Reels
  const [isReelsChromeVisible, setIsReelsChromeVisible] = useState(true);

  // Glissement fluide programmatique
  const scrollToScreen = (index: 0 | 1 | 2) => {
    setActiveScreenIndex(index);
    setIsReelsChromeVisible(true);
    if (!swipeContainerRef.current) return;
    isProgrammaticScrollRef.current = true;
    swipeContainerRef.current.scrollTo({
      left: index * swipeContainerRef.current.clientWidth,
      behavior: 'smooth'
    });
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 450);
  };

  // Profil Personnel
  const [profile, setProfile] = useState<WameetProfileData>(() => {
    try {
      const saved = localStorage.getItem('wameet_profile_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          impactScore: parsed.impactScore || DEFAULT_PROFILE.impactScore,
          name: parsed.name || currentUser?.name || DEFAULT_PROFILE.name,
          avatarUrl: parsed.avatarUrl || currentUser?.avatarUrl || DEFAULT_PROFILE.avatarUrl
        };
      }
    } catch (e) {}
    return {
      ...DEFAULT_PROFILE,
      name: currentUser?.name || DEFAULT_PROFILE.name,
      avatarUrl: currentUser?.avatarUrl || DEFAULT_PROFILE.avatarUrl
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('wameet_profile_v1', JSON.stringify(profile));
    } catch (e) {}
  }, [profile]);

  // Modales d'édition par Lien
  const [isBannerLinkModalOpen, setIsBannerLinkModalOpen] = useState(false);
  const [bannerUrlInput, setBannerUrlInput] = useState(profile.bannerUrl);

  const [isAvatarLinkModalOpen, setIsAvatarLinkModalOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState(profile.avatarUrl);

  const [isBadgeEditorOpen, setIsBadgeEditorOpen] = useState(false);
  const [customBadgeInput, setCustomBadgeInput] = useState(profile.statusBadge);

  // Modales & Tiroirs Wameet
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVipOpen, setIsVipOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);

  const [isIsolatedExtensionOpen, setIsIsolatedExtensionOpen] = useState(false);
  const [isWameetLiveOpen, setIsWameetLiveOpen] = useState(false);
  const [isDeliveryHeatmapOpen, setIsDeliveryHeatmapOpen] = useState(false);
  const [isCagnotteOpen, setIsCagnotteOpen] = useState(false);

  // Modales et sous-écrans Prompt 43 (Tiroir des 3 points & Nanasore)
  const [isNanasorePromoOpen, setIsNanasorePromoOpen] = useState(false);
  const [isPrivacySecurityOpen, setIsPrivacySecurityOpen] = useState(false);
  const [isWalletFinanceOpen, setIsWalletFinanceOpen] = useState(false);

  // Sas de Configuration (Prompt 48 - ActionBottomSheets)
  const [isLiveShoppingGatewayOpen, setIsLiveShoppingGatewayOpen] = useState(false);
  const [isSwarmDeliveryGatewayOpen, setIsSwarmDeliveryGatewayOpen] = useState(false);
  const [isVipLoungeGatewayOpen, setIsVipLoungeGatewayOpen] = useState(false);

  // Moteur Vidéo YouTube Live Headless pour Salles VIP (Prompt 50)
  const [activeVipPlayerConfig, setActiveVipPlayerConfig] = useState<{
    isOpen: boolean;
    youtubeLiveUrl: string;
    salonTitle: string;
    instructorName?: string;
    monthlyPriceFcfa?: number;
    categoryBadge?: string;
  } | null>(null);

  // Moteur Vidéo WebRTC Jitsi Headless pour Live Shopping (Prompt 51)
  const [liveJitsiEngineConfig, setLiveJitsiEngineConfig] = useState<{
    isOpen: boolean;
    title: string;
    category?: string;
    isSeller: boolean;
  } | null>(null);

  // Authentification & Contacts viraux
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<'phone' | 'contacts'>('phone');

  // Générateur de Salon Privé Wameet (Prompt 5)
  const [isWameetModalOpen, setIsWameetModalOpen] = useState(false);
  const [wameetTargetMember, setWameetTargetMember] = useState<{
    name: string;
    handle: string;
    avatarUrl: string;
  } | null>(null);

  // Stories
  const [stories, setStories] = useState<WameetStoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('wameet_stories_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_STORIES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('wameet_stories_v1', JSON.stringify(stories));
    } catch (e) {}
  }, [stories]);

  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [newStoryMediaType, setNewStoryMediaType] = useState<'image' | 'video'>('video');
  const [newStoryUrl, setNewStoryUrl] = useState('');
  const [newStoryThumbnailUrl, setNewStoryThumbnailUrl] = useState('');
  const [newStoryCaption, setNewStoryCaption] = useState('');
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyReplyText, setStoryReplyText] = useState('');

  // Wameet Premium & Guichet d'Expert (Prompt 7)
  const [isGuichetModalOpen, setIsGuichetModalOpen] = useState(false);
  const [premiumPaymentTarget, setPremiumPaymentTarget] = useState<{
    id: string;
    name: string;
    avatar?: string;
    price: number;
    topic?: string;
  } | null>(null);

  // Prise de Rendez-vous, FCM & Mode Asynchrone (Prompt 10)
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentTargetCreator, setAppointmentTargetCreator] = useState<{
    id: string;
    name: string;
    avatar?: string;
    handle?: string;
    priceFcfa?: number;
  } | null>(null);
  const [userAppointments, setUserAppointments] = useState<WameetAppointment[]>([]);
  const [imminentAppointment, setImminentAppointment] = useState<WameetAppointment | null>(null);
  const [activeAppointmentRoom, setActiveAppointmentRoom] = useState<{
    wameetId: string;
    creatorName: string;
    reason?: string;
    time?: string;
  } | null>(null);

  useEffect(() => {
    // Inscription FCM
    const activeUserId = currentUser?.id || profile.handle || 'user-wameet-main';
    wameetNotificationService.initUserFCM(activeUserId).catch(() => {});

    // Chargement rendez-vous et détection imminente
    getWameetAppointments(activeUserId).then((apts) => {
      setUserAppointments(apts);
      setImminentAppointment(getImminentAppointment(apts));
    }).catch(() => {});
  }, [currentUser, profile.handle]);

  // Posts
  const [posts, setPosts] = useState<WameetPostItem[]>(() => {
    try {
      const saved = localStorage.getItem('wameet_posts_v5') || localStorage.getItem('wameet_posts_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          return parsed.map((p, idx) => {
            if (p.mediaUrl && (p.mediaUrl.includes('commondatastorage.googleapis.com') || p.mediaUrl.includes('mixkit.co'))) {
              const localList = ['/videos/reel-eshop.mp4', '/videos/reel-mentor.mp4', '/videos/reel-business.mp4'];
              return { ...p, mediaUrl: localList[idx % localList.length] };
            }
            return p;
          });
        }
      }
    } catch (e) {}
    return INITIAL_POSTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('wameet_posts_v5', JSON.stringify(posts));
    } catch (e) {}
  }, [posts]);

  // Chargement initial des Reels publiés depuis Firestore (wameet_reels)
  useEffect(() => {
    const fetchFirestoreReels = async () => {
      try {
        const q = query(collection(db, 'wameet_reels'), orderBy('timestamp', 'desc'), limit(20));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const remoteReels: any[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && (data.videoUrl || data.mediaUrl)) {
              remoteReels.push({
                ...data,
                id: data.id || docSnap.id,
                videoUrl: data.videoUrl || data.mediaUrl,
                comments: Array.isArray(data.comments) ? data.comments : []
              });
            }
          });
          if (remoteReels.length > 0) {
            setPosts((prev) => {
              const existingUrls = new Set(prev.map((p) => p.mediaUrl));
              const newPostsFromReels: WameetPostItem[] = remoteReels
                .filter((r) => !existingUrls.has(r.videoUrl))
                .map((r) => ({
                  id: 'post-' + r.id,
                  authorName: r.authorName || profile.name,
                  authorHandle: r.authorHandle || profile.handle,
                  authorAvatar: r.authorAvatar || profile.avatarUrl,
                  authorBadge: r.authorBadge || profile.statusBadge,
                  isOnline: true,
                  createdAt: r.createdAt || 'À l’instant',
                  content: r.title || r.caption || 'Reel Wameet ✨',
                  description: r.description || r.caption || 'Reel Wameet ✨',
                  mediaType: r.mediaType || 'video',
                  mediaUrl: r.videoUrl,
                  thumbnailUrl: r.thumbnailUrl,
                  likesCount: r.likesCount || 1,
                  lovesCount: 0,
                  ideasCount: 1,
                  sharesCount: r.sharesCount || 0,
                  userReaction: null,
                  comments: []
                }));
              return newPostsFromReels.length > 0 ? [...newPostsFromReels, ...prev] : prev;
            });

            if (typeof window !== 'undefined') {
              remoteReels.reverse().forEach((r) => {
                window.dispatchEvent(new CustomEvent('wameet:reel-added', { detail: r }));
              });
            }
          }
        }
      } catch (err) {
        console.warn('[storage REELS LOAD]', err);
      }
    };
    fetchFirestoreReels();
  }, []);

  const [composerText, setComposerText] = useState('');
  const [composerMediaType, setComposerMediaType] = useState<'none' | 'video' | 'image' | 'audio' | 'poll'>('none');
  const [composerMediaUrl, setComposerMediaUrl] = useState('');
  const [composerPollQuestion, setComposerPollQuestion] = useState('');
  const [composerPollOpt1, setComposerPollOpt1] = useState('');
  const [composerPollOpt2, setComposerPollOpt2] = useState('');
  const [composerPollOpt3, setComposerPollOpt3] = useState('');
  const [composerAttachedMiniApp, setComposerAttachedMiniApp] = useState<MiniAppActionPayload | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Contexte inter-piliers
  const [activeWRecipient, setActiveWRecipient] = useState<{
    name: string;
    handle: string;
    avatarUrl: string;
    contextReelTitle?: string;
  } | null>(null);
  const activeWhatsAppRecipient = activeWRecipient;
  const setActiveWhatsAppRecipient = setActiveWRecipient;
  const [selectedShopProductFromReel, setSelectedShopProductFromReel] = useState<WameetReelProductTag | null>(null);
  const [latestAddedReel, setLatestAddedReel] = useState<WameetReelItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleSaveBannerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerUrlInput.trim()) return;
    playValidationBeep();
    setProfile(prev => ({ ...prev, bannerUrl: bannerUrlInput.trim() }));
    setIsBannerLinkModalOpen(false);
    showToast('✨ Bannière mise à jour avec succès !');
  };

  const handleSaveAvatarUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarUrlInput.trim()) return;
    playValidationBeep();
    setProfile(prev => ({ ...prev, avatarUrl: avatarUrlInput.trim() }));
    setIsAvatarLinkModalOpen(false);
    showToast('✨ Photo de profil mise à jour avec succès !');
  };

  /**
/**
 * Fonction d'assainissement récursive pour Firebase Firestore :
 * Empêche le plantage immédiat causé par les valeurs 'undefined'
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

  /**
   * Injection immédiate au début du state local (Reels + Feed) et enregistrement Firestore
   */
  const injectReelIntoStateAndFirestore = (
    videoUrl: string,
    captionText: string,
    mediaType: 'image' | 'video',
    thumbUrl?: string,
    redirectToReels = false
  ) => {
    try {
      const finalUrl = (videoUrl || '').trim();
      if (!finalUrl || finalUrl.startsWith('blob:')) {
        console.warn('[INJECT REEL] URL invalide ou locale ignorée :', finalUrl);
        return;
      }
      const finalCaption = captionText.trim() || 'Mon Reel sur Wameet ✨';
      const nowId = Date.now();
      const resolvedThumb =
        mediaType === 'image'
          ? finalUrl
          : thumbUrl && thumbUrl.trim().length > 0 && !thumbUrl.startsWith('blob:')
          ? thumbUrl
          : null;

      const createdStory: WameetStoryItem = {
        id: 'story-' + nowId,
        authorName: profile.name || 'Utilisateur',
        authorAvatar: profile.avatarUrl || '',
        authorBadge: profile.statusBadge || 'Créateur Wameet',
        mediaType,
        mediaUrl: finalUrl,
        caption: finalCaption,
        createdAt: 'À l’instant',
        viewsCount: 1,
        likesCount: 1
      };
      setStories((prev) => [createdStory, ...prev.filter((s) => s.mediaUrl !== finalUrl)]);

      // 1. Injection immédiate en tête du Feed Accueil (posts)
      const newPost: WameetPostItem = {
        id: 'post-reel-' + nowId,
        authorName: profile.name || 'Utilisateur',
        authorHandle: profile.handle || '@membre',
        authorAvatar: profile.avatarUrl || '',
        authorBadge: profile.statusBadge || 'Créateur Wameet',
        isOnline: true,
        createdAt: 'À l’instant',
        content: finalCaption,
        description: finalCaption,
        mediaType,
        mediaUrl: finalUrl,
        thumbnailUrl: resolvedThumb || undefined,
        likesCount: 1,
        lovesCount: 0,
        ideasCount: 1,
        sharesCount: 0,
        userReaction: 'like',
        comments: []
      };
      setPosts((prev) => [newPost, ...prev.filter((p) => p.mediaUrl !== finalUrl)]);

      // 2. Injection immédiate en tête des Reels (WameetReelItem)
      const newReel: WameetReelItem & { mediaUrl?: string; caption?: string; creatorName?: string; timestamp?: number } = {
        id: 'reel-' + nowId,
        authorName: profile.name || 'Utilisateur',
        creatorName: profile.name || 'Utilisateur',
        authorHandle: profile.handle || '@membre',
        authorAvatar: profile.avatarUrl || '',
        authorBadge: profile.statusBadge || 'Créateur Wameet',
        isFollowing: true,
        mediaType,
        videoUrl: finalUrl,
        mediaUrl: finalUrl,
        thumbnailUrl: resolvedThumb || undefined,
        title: finalCaption,
        caption: finalCaption,
        description: finalCaption,
        hashtags: ['#WameetReels', '#Direct', '#Nouveau'],
        audioTrackName: `Son Original • ${profile.name || 'Wameet'}`,
        category: 'SHOPPING_LIVE',
        likesCount: 1,
        isLiked: true,
        bookmarksCount: 0,
        isBookmarked: false,
        sharesCount: 0,
        comments: [],
        isAIGenerated: detectIsAIGenerated({
          videoUrl: finalUrl,
          title: finalCaption,
          description: finalCaption
        }),
        createdAt: 'À l’instant',
        timestamp: nowId
      };

      setLatestAddedReel(newReel);
      try {
        const existing = JSON.parse(localStorage.getItem('wameet_reels_v4') || '[]');
        const filtered = Array.isArray(existing) ? existing.filter((r: any) => r.videoUrl !== finalUrl) : [];
        const nextReels = [newReel, ...filtered];
        localStorage.setItem('wameet_reels_v4', JSON.stringify(nextReels));
      } catch (err) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wameet:reel-added', { detail: newReel }));
        window.dispatchEvent(new CustomEvent('reel:created', { detail: newReel }));
      }

      // 3. Enregistrement asynchrone sécurisé dans Firestore (assaini à 100%)
      try {
        const sanitizedDoc = sanitizeForFirestore({
          id: newReel.id,
          authorName: newReel.authorName || 'Utilisateur',
          creatorName: newReel.creatorName || newReel.authorName || 'Utilisateur',
          authorHandle: newReel.authorHandle || '@membre',
          authorAvatar: newReel.authorAvatar || '',
          authorBadge: newReel.authorBadge || 'Créateur Wameet',
          isFollowing: true,
          mediaType: newReel.mediaType || 'video',
          videoUrl: finalUrl,
          mediaUrl: finalUrl,
          thumbnailUrl: resolvedThumb,
          title: newReel.title || finalCaption,
          caption: newReel.caption || finalCaption,
          description: newReel.description || finalCaption,
          hashtags: newReel.hashtags || ['#WameetReels'],
          audioTrackName: newReel.audioTrackName || 'Son Original',
          category: newReel.category || 'SHOPPING_LIVE',
          likesCount: 1,
          isLiked: true,
          bookmarksCount: 0,
          isBookmarked: false,
          sharesCount: 0,
          comments: [],
          createdAt: newReel.createdAt || 'À l’instant',
          timestamp: nowId
        });

        setDoc(doc(collection(db, 'wameet_reels'), newReel.id), sanitizedDoc)
          .catch((err) => console.warn('[storage SAVE REEL]', err));
      } catch (fsErr) {
        console.warn('[storage SYNC ERROR]', fsErr);
      }

      if (redirectToReels && mediaType === 'video') {
        scrollToScreen(1); // Redirige directement sur l'écran Reels
      }
    } catch (fatalErr) {
      console.error('[INJECT REEL CRITICAL]', fatalErr);
    }
  };

  const handleCreateStory = async (
    e?: React.FormEvent | React.MouseEvent,
    directUrl?: string,
    directCaption?: string,
    directThumb?: string
  ) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const targetUrl = (directUrl || newStoryUrl || '').trim();
    const targetCaption = (directCaption !== undefined ? directCaption : newStoryCaption).trim();
    const targetThumb = (directThumb !== undefined ? directThumb : newStoryThumbnailUrl).trim();

    if (!targetUrl) {
      showToast('⚠️ Veuillez sélectionner une vidéo ou attendre la fin de l’encodage.');
      return;
    }

    if (targetUrl.startsWith('blob:')) {
      showToast('⏳ Le transfert vers le serveur AWS S3 est en cours, veuillez patienter une seconde...');
      return;
    }

    setIsUploadingStory(true);
    try {
      playValidationBeep();

      injectReelIntoStateAndFirestore(
        targetUrl,
        targetCaption,
        newStoryMediaType,
        targetThumb || undefined,
        true // Redirige directement sur l'écran Reels
      );

      setProfile((prev) => ({ ...prev, reelsCount: (prev.reelsCount || 0) + 1 }));
      setNewStoryUrl('');
      setNewStoryThumbnailUrl('');
      setNewStoryCaption('');
      setIsAddStoryModalOpen(false);
      showToast('Votre vidéo a été vérifiée et approuvée avec succès !');
    } catch (pubErr: any) {
      console.error('[HANDLE CREATE STORY ERROR]', pubErr);
      showToast(`❌ Erreur de publication : ${pubErr?.message || 'Vérifiez votre connexion internet'}`);
    } finally {
      setIsUploadingStory(false);
    }
  };

  const handlePublishPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() && !composerMediaUrl.trim() && composerMediaType !== 'poll' && !composerAttachedMiniApp) return;
    playValidationBeep();

    let finalMediaType = composerMediaType;
    let finalMediaUrl = composerMediaUrl.trim() || undefined;

    // Détection automatique de lien vidéo YouTube si collé dans le texte ou dans l'URL
    const ytInUrl = finalMediaUrl ? extractYouTubeVideoId(finalMediaUrl) : null;
    const ytInText = composerText ? extractYouTubeVideoId(composerText) : null;
    if ((ytInUrl || ytInText) && finalMediaType !== 'poll' && finalMediaType !== 'image') {
      finalMediaType = 'video';
      if (!finalMediaUrl && ytInText) {
        finalMediaUrl = `https://www.youtube.com/watch?v=${ytInText}`;
      }
    }

    const pollOptions: WameetPollOption[] | undefined =
      composerMediaType === 'poll'
        ? [
            { id: 'p-1', text: composerPollOpt1.trim() || 'Oui, excellente idée 🔥', votes: 1 },
            { id: 'p-2', text: composerPollOpt2.trim() || 'À tester cette semaine 🚀', votes: 0 },
            ...(composerPollOpt3.trim()
              ? [{ id: 'p-3', text: composerPollOpt3.trim(), votes: 0 }]
              : [])
          ]
        : undefined;

    const finalContent =
      composerText.trim() ||
      (composerAttachedMiniApp
        ? `Partage d'attachement : ${composerAttachedMiniApp.title}`
        : finalMediaType === 'poll'
        ? composerPollQuestion.trim() || 'Sondage Express Wameet'
        : 'Nouveau partage sur Wameet ✨');

    const newPost: WameetPostItem = {
      id: 'post-' + Date.now(),
      authorName: profile.name,
      authorHandle: profile.handle,
      authorAvatar: profile.avatarUrl,
      authorBadge: profile.statusBadge,
      isOnline: true,
      createdAt: 'À l’instant',
      content: finalContent,
      description: finalContent,
      mediaType: finalMediaType,
      mediaUrl: finalMediaUrl,
      pollQuestion: composerMediaType === 'poll' ? composerPollQuestion.trim() || 'Votre avis ?' : undefined,
      pollOptions,
      votedOptionId: null,
      likesCount: 1,
      lovesCount: 0,
      ideasCount: 1,
      sharesCount: 0,
      userReaction: 'idea',
      comments: [],
      attachedMiniApp: composerAttachedMiniApp
        ? {
            type: composerAttachedMiniApp.type,
            title: composerAttachedMiniApp.title,
            subtitle: composerAttachedMiniApp.subtitle,
            amountFcfa: composerAttachedMiniApp.amountFcfa,
            badge: composerAttachedMiniApp.badge,
            imageUrl: composerAttachedMiniApp.imageUrl,
            meta: composerAttachedMiniApp.meta
          }
        : undefined
    };

    setPosts(prev => [newPost, ...prev]);

    // Si c'est une vidéo ou une affiche image avec URL, l'ajouter aussi immédiatement aux Reels
    if (finalMediaUrl && (finalMediaType === 'video' || finalMediaType === 'image')) {
      const newReelFromPost: WameetReelItem & { mediaUrl?: string; caption?: string; creatorName?: string } = {
        id: 'reel-post-' + Date.now(),
        authorName: profile.name,
        creatorName: profile.name,
        authorHandle: profile.handle,
        authorAvatar: profile.avatarUrl,
        authorBadge: profile.statusBadge,
        isFollowing: true,
        mediaType: finalMediaType,
        videoUrl: finalMediaUrl,
        mediaUrl: finalMediaUrl,
        thumbnailUrl: finalMediaType === 'image' ? finalMediaUrl : profile.avatarUrl,
        title: finalContent,
        caption: finalContent,
        description: finalContent,
        hashtags: ['#Wameet', '#Nouveau'],
        audioTrackName: `Son Original • ${profile.name}`,
        category: 'SHOPPING_LIVE',
        likesCount: 1,
        isLiked: true,
        bookmarksCount: 0,
        isBookmarked: false,
        sharesCount: 0,
        comments: [],
        isAIGenerated: detectIsAIGenerated({
          videoUrl: composerMediaUrl,
          title: finalContent,
          description: finalContent
        }),
        createdAt: 'À l’instant'
      };
      setLatestAddedReel(newReelFromPost);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wameet:reel-added', { detail: newReelFromPost }));
      }
    }

    setComposerText('');
    setComposerMediaUrl('');
    setComposerPollQuestion('');
    setComposerPollOpt1('');
    setComposerPollOpt2('');
    setComposerPollOpt3('');
    setComposerMediaType('none');
    setComposerAttachedMiniApp(null);
    showToast('🚀 Publication ajoutée sur le Mur Wameet !');
  };

  const handleReaction = (postId: string, type: 'like' | 'love' | 'idea') => {
    playTapBeep();
    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;
        const isSame = post.userReaction === type;
        const nextReaction = isSame ? null : type;

        let likes = post.likesCount;
        let loves = post.lovesCount;
        let ideas = post.ideasCount;

        if (post.userReaction === 'like') likes = Math.max(0, likes - 1);
        if (post.userReaction === 'love') loves = Math.max(0, loves - 1);
        if (post.userReaction === 'idea') ideas = Math.max(0, ideas - 1);

        if (nextReaction === 'like') likes += 1;
        if (nextReaction === 'love') loves += 1;
        if (nextReaction === 'idea') ideas += 1;

        return {
          ...post,
          likesCount: likes,
          lovesCount: loves,
          ideasCount: ideas,
          userReaction: nextReaction
        };
      })
    );
  };

  const handleVotePoll = (postId: string, optionId: string) => {
    playTapBeep();
    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId || !post.pollOptions) return post;
        if (post.votedOptionId === optionId) return post;
        return {
          ...post,
          votedOptionId: optionId,
          pollOptions: post.pollOptions.map(opt => {
            if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
            if (opt.id === post.votedOptionId) return { ...opt, votes: Math.max(0, opt.votes - 1) };
            return opt;
          })
        };
      })
    );
  };

  const handleAddComment = (
    postId: string,
    replyMeta?: { parentId?: string | null; replyToId?: string | null; replyToAuthor?: string | null }
  ) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    playValidationBeep();

    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;

        // Modération des commentaires
        let status: 'approved' | 'pending' | 'rejected' = 'approved';
        const mod = post.moderationSettings;
        if (mod) {
          if (mod.filterMode === 'manual_approval') {
            status = 'pending';
          } else if (mod.filterMode === 'blocked_words' && Array.isArray(mod.blockedWords) && mod.blockedWords.length > 0) {
            const lowerText = text.toLowerCase();
            const hasBlockedWord = mod.blockedWords.some(w => {
              const cleaned = w.trim().toLowerCase();
              return cleaned.length > 0 && lowerText.includes(cleaned);
            });
            if (hasBlockedWord) {
              status = 'pending';
            }
          }
        }

        const newComment: WameetCommentItem = {
          id: 'comment-' + Date.now(),
          authorName: profile.name,
          authorAvatar: profile.avatarUrl,
          authorHandle: profile.handle,
          text,
          createdAt: 'À l’instant',
          parentId: replyMeta?.parentId || null,
          replyToId: replyMeta?.replyToId || null,
          replyToAuthor: replyMeta?.replyToAuthor || null,
          status
        };

        return { ...post, comments: [...post.comments, newComment] };
      })
    );

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    showToast('💬 Commentaire envoyé !');
  };

  const handleUpdateModerationSettings = (postId: string, settings: WameetModerationSettings) => {
    playValidationBeep();
    setPosts(prev =>
      prev.map(post => (post.id === postId ? { ...post, moderationSettings: settings } : post))
    );
    showToast('🛡️ Paramètres de confidentialité mis à jour !');
  };

  const handleApproveComment = (postId: string, commentId: string) => {
    playValidationBeep();
    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: post.comments.map(c => (c.id === commentId ? { ...c, status: 'approved' } : c))
        };
      })
    );
    showToast('✅ Commentaire approuvé et visible !');
  };

  const handleRejectComment = (postId: string, commentId: string) => {
    playTapBeep();
    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: post.comments.filter(c => c.id !== commentId)
        };
      })
    );
    showToast('🗑️ Commentaire retiré.');
  };

  const handleGoToPrivateCampus = () => {
    playTapBeep();
    if (onOpenPrivateCampus) {
      onOpenPrivateCampus();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/classroom/telecom-fintech-masterclass');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Synchronisation de l'onglet initial
  useEffect(() => {
    if (initialTab === 'REELS') scrollToScreen(1);
    else if (initialTab === 'WHATSAPP' || (initialTab as any) === 'W_CHAT') scrollToScreen(2);
    else if (initialTab === 'VIP_HUB') setIsVipOpen(true);
    else if (initialTab === 'SHOP') setIsShopOpen(true);
  }, [initialTab]);

  // Modération & Sécurité Wameet : Affichage du toast rassurant à la victime (Prompt 8)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const safetyToast = sessionStorage.getItem('wameet_safety_toast');
        if (safetyToast) {
          showToast(safetyToast);
          sessionStorage.removeItem('wameet_safety_toast');
        }
      } catch (e) {}
    }
  }, []);

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <WameetLayout mainClassName="flex-1 flex flex-col relative overflow-hidden">
      {/* Toast Flottant */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-[120] max-w-sm rounded-2xl border border-[#4169E1] bg-white/95 backdrop-blur-xl px-4 py-3 shadow-xl flex items-center gap-2.5 animate-bounce">
          <div className="w-6 h-6 rounded-full bg-[#4169E1] text-white flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-slate-900">{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          1. HEADER FIXE GLOBAL (shrink-0 z-40 bg-white/90 backdrop-blur-md sticky top-0)
          Disparaît complètement et automatiquement sur l'écran des Reels [1].
         ===================================================================== */}
      <WameetAppHeader
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        activeScreenIndex={activeScreenIndex}
        onSelectScreen={scrollToScreen}
        impactScore={profile.impactScore || 18450}
      />

      {/* =====================================================================
          2. LE CONTENEUR COULISSANT (SWIPE/CAROUSEL DES 3 PILIERS)
             flex-1 w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none touch-pan-x flex flex-row
         ===================================================================== */}
      <div
        ref={swipeContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none flex flex-row"
        style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      >
        {/* -------------------------------------------------------------------
            PILIER 1 : ACCUEIL (Feed Mobile-First Immersif)
           ------------------------------------------------------------------- */}
        <div className="w-full h-full overflow-y-auto relative bg-slate-950 flex flex-col shrink-0 snap-center pb-20">
          <SocialFeedScreen
            profile={profile}
            setProfile={setProfile}
            stories={stories}
            posts={posts}
            hideFloatingFab={
              activeScreenIndex === 1 ||
              activeScreenIndex === 2 ||
              activeStoryIndex !== null ||
              isAddStoryModalOpen
            }
            onOpenAddStoryModal={(initialType) => {
              if (initialType) setNewStoryMediaType(initialType);
              setIsAddStoryModalOpen(true);
            }}
            onOpenGuichet={() => setIsGuichetModalOpen(true)}
            onSelectStory={(_st, idx) => setActiveStoryIndex(idx)}
            onOpenWWithMember={(member) => {
              setActiveWRecipient({
                name: member.name,
                handle: member.handle,
                avatarUrl: member.avatarUrl
              });
              scrollToScreen(2);
              showToast(`💬 Discussion Wameet ouverte avec ${member.name}`);
            }}
            onReaction={handleReaction}
            onVotePoll={handleVotePoll}
            onAddComment={handleAddComment}
            onUpdateModerationSettings={handleUpdateModerationSettings}
            onApproveComment={handleApproveComment}
            onRejectComment={handleRejectComment}
            commentInputs={commentInputs}
            setCommentInputs={setCommentInputs}
            composerText={composerText}
            setComposerText={setComposerText}
            composerMediaType={composerMediaType}
            setComposerMediaType={setComposerMediaType}
            composerMediaUrl={composerMediaUrl}
            setComposerMediaUrl={setComposerMediaUrl}
            composerPollQuestion={composerPollQuestion}
            setComposerPollQuestion={setComposerPollQuestion}
            composerPollOpt1={composerPollOpt1}
            setComposerPollOpt1={setComposerPollOpt1}
            composerPollOpt2={composerPollOpt2}
            setComposerPollOpt2={setComposerPollOpt2}
            composerPollOpt3={composerPollOpt3}
            setComposerPollOpt3={setComposerPollOpt3}
            handlePublishPost={handlePublishPost}
            attachedMiniApp={composerAttachedMiniApp}
            setAttachedMiniApp={setComposerAttachedMiniApp}
            isAvatarLinkModalOpen={isAvatarLinkModalOpen}
            setIsAvatarLinkModalOpen={setIsAvatarLinkModalOpen}
            avatarUrlInput={avatarUrlInput}
            setAvatarUrlInput={setAvatarUrlInput}
            handleSaveAvatarUrl={handleSaveAvatarUrl}
            isBannerLinkModalOpen={isBannerLinkModalOpen}
            setIsBannerLinkModalOpen={setIsBannerLinkModalOpen}
            bannerUrlInput={bannerUrlInput}
            setBannerUrlInput={setBannerUrlInput}
            handleSaveBannerUrl={handleSaveBannerUrl}
            isBadgeEditorOpen={isBadgeEditorOpen}
            setIsBadgeEditorOpen={setIsBadgeEditorOpen}
            customBadgeInput={customBadgeInput}
            setCustomBadgeInput={setCustomBadgeInput}
            statusBadgePresets={STATUS_BADGE_PRESETS}
            onScheduleAppointment={(sc) => {
              setAppointmentTargetCreator({
                id: sc.id,
                name: sc.authorName || sc.creatorName || 'Membre Wameet',
                avatar: sc.authorAvatar,
                handle: sc.authorHandle,
                priceFcfa: sc.priceFcfa || sc.consultationPrice
              });
              setIsAppointmentModalOpen(true);
            }}
            imminentAppointment={imminentAppointment}
            onJoinAppointmentRoom={(apt) => {
              setActiveAppointmentRoom({
                wameetId: apt.jitsiRoomId,
                creatorName: apt.creatorName,
                reason: apt.reason,
                time: apt.timeSlot
              });
            }}
          />
        </div>

        {/* -------------------------------------------------------------------
            PILIER 2 : REELS WAMEET
            w-full h-full shrink-0 snap-center overflow-hidden bg-black relative
           ------------------------------------------------------------------- */}
        <div className="w-full h-full shrink-0 snap-center overflow-hidden bg-black relative flex items-center justify-center">
          <ReelsScreen
            currentUserProfile={{
              name: profile.name,
              handle: profile.handle,
              avatarUrl: profile.avatarUrl,
              statusBadge: profile.statusBadge
            }}
            latestAddedReel={latestAddedReel}
            onOpenWWithCreator={(creator) => {
              setActiveWRecipient(creator);
              scrollToScreen(2);
              showToast(`💬 Discussion Wameet ouverte avec ${creator.name}`);
            }}
            onBuyProductFromReel={(product: WameetReelProductTag, _reel: WameetReelItem) => {
              setSelectedShopProductFromReel(product);
              setIsShopOpen(true);
              showToast(`🛍️ "${product.name}" ouvert dans Wameet Shop !`);
            }}
            onReelCreated={() => {
              setProfile(prev => ({ ...prev, reelsCount: prev.reelsCount + 1 }));
            }}
            onOpenCreateReel={() => {
              playTapBeep();
              setNewStoryMediaType('video');
              setIsAddStoryModalOpen(true);
            }}
            onHeaderFooterVisibilityChange={setIsReelsChromeVisible}
          />
        </div>

        {/* -------------------------------------------------------------------
            PILIER 3 : CHATS (MESSAGERIE WAMEET)
            w-full h-full shrink-0 snap-center flex flex-col overflow-hidden relative bg-white
           ------------------------------------------------------------------- */}
        <div className="w-full h-full shrink-0 snap-center flex flex-col overflow-hidden relative bg-white">
          {/* Zone de Contenu Fluide & Infinite Scroll */}
          <div className="flex-1 overflow-y-auto overscroll-y-contain relative scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] bg-white">
            <ChatListScreen
              currentUserProfile={{
                name: profile.name,
                handle: profile.handle,
                avatarUrl: profile.avatarUrl,
                statusBadge: profile.statusBadge
              }}
              initialRecipient={activeWRecipient}
              onOpenShopForMember={(productCard) => {
                if (productCard) {
                  setSelectedShopProductFromReel({
                    id: productCard.id,
                    name: productCard.name,
                    priceFcfa: productCard.priceFcfa,
                    imageUrl: productCard.imageUrl
                  });
                }
                setIsShopOpen(true);
              }}
              onOpenProfileForMember={() => {
                scrollToScreen(0);
              }}
              onOpenContacts={() => {
                playTapBeep();
                setOnboardingInitialStep('contacts');
                setIsOnboardingModalOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          BARRE DE NAVIGATION BASSE FIXE (ESCROTABLE SUR REELS)
         ===================================================================== */}
      <WameetBottomTabBar
        activeScreenIndex={activeScreenIndex}
        onSelectScreen={scrollToScreen}
        onOpenShop={() => setIsShopOpen(true)}
        onOpenWallet={() => setIsWalletFinanceOpen(true)}
        unreadChatsCount={3}
        className={
          activeScreenIndex === 1 && !isReelsChromeVisible
            ? 'translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }
      />

      {/* =====================================================================
          3. TIROIR LATÉRAL SIDEBAR DRAWER (PROMPT 43)
          Ouvert au clic sur les 3 points du Header Wameet
         ===================================================================== */}
      <WameetSidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        profile={profile}
        walletBalanceFcfa={145000}
        onOpenLiveShopping={() => setIsLiveShoppingGatewayOpen(true)}
        onOpenCagnotte={() => setIsCagnotteOpen(true)}
        onOpenSwarmDelivery={() => setIsSwarmDeliveryGatewayOpen(true)}
        onOpenNanasorePromo={() => setIsNanasorePromoOpen(true)}
        onOpenPrivacySettings={() => setIsPrivacySecurityOpen(true)}
        onOpenWallet={() => setIsWalletFinanceOpen(true)}
        onOpenCreateVip={() => setIsVipLoungeGatewayOpen(true)}
      />

      {/* =====================================================================
          PAGE PROMOTIONNELLE DÉDIÉE NANASORE (PROMPT 43 - SECTION 2)
         ===================================================================== */}
      {isNanasorePromoOpen && (
        <NanasoreProShowcaseModal
          isOpen={isNanasorePromoOpen}
          onClose={() => setIsNanasorePromoOpen(false)}
          onLaunchNanasore={() => {
            setIsNanasorePromoOpen(false);
            if (onBackToDashboard) onBackToDashboard();
            else if (typeof window !== 'undefined') window.location.href = '/dashboard';
          }}
        />
      )}

      {/* =====================================================================
          ÉCRAN PARAMÈTRES DE CONFIDENTIALITÉ (PROMPT 43 - SECTION 3)
         ===================================================================== */}
      {isPrivacySecurityOpen && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-in fade-in duration-200">
          <WameetPrivacySecurityScreen
            onBack={() => setIsPrivacySecurityOpen(false)}
          />
        </div>
      )}

      {/* =====================================================================
          ÉCRAN WALLET S & MONÉTISATION WAMEET (PROMPT 43 - SECTION 3)
         ===================================================================== */}
      {isWalletFinanceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto animate-in fade-in duration-200">
          <WameetWalletFinanceScreen
            initialBalance={145000}
            onBack={() => setIsWalletFinanceOpen(false)}
          />
        </div>
      )}

      {/* =====================================================================
          4. RECHERCHE ACTIVE (OUVERTE PAR L'ICÔNE RECHERCHE EN HAUT À DROITE)
         ===================================================================== */}
      {isSearchOpen && (
        <ActiveSearchOverlay
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchSubmit={(q) => {
            showToast(`🔍 Recherche pour "${q}"`);
            setIsSearchOpen(false);
          }}
          searchHistory={['Chaussures Ouaga', 'Concert Live', 'Vente Flash Nanasore', 'Afterwork Tech']}
          onRemoveHistoryItem={() => {}}
          onClearHistory={() => {}}
          hasSubmittedSearch={false}
        />
      )}

      {/* =====================================================================
          5. NOTIFICATIONS (OUVERTES PAR LA CLOCHE EN HAUT À DROITE)
         ===================================================================== */}
      {isNotificationsOpen && (
        <WameetNotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onNavigateToTab={(tab) => {
            if (tab === 'WALL_PROFILE') scrollToScreen(0);
            if (tab === 'REELS') scrollToScreen(1);
            if (tab === 'W_CHAT') scrollToScreen(2);
            if (tab === 'SHOP') setIsShopOpen(true);
          }}
        />
      )}

      {/* =====================================================================
          6. MODALE PLEIN ÉCRAN PARAMÈTRES & CONFIDENTIALITÉ
         ===================================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-in fade-in duration-200">
          <SettingsMainScreen
            currentUser={{
              name: profile.name,
              username: profile.handle,
              avatarUrl: profile.avatarUrl,
              isProCreator: true,
              proRole: profile.statusBadge,
              walletBalanceFcfa: 145000
            }}
            onBack={() => setIsSettingsOpen(false)}
            onLogout={() => {
              setIsSettingsOpen(false);
              showToast('Déconnexion effectuée');
            }}
            onNavigateToVipRooms={() => {
              setIsSettingsOpen(false);
              setIsVipOpen(true);
            }}
            onNavigateToShop={() => {
              setIsSettingsOpen(false);
              setIsShopOpen(true);
            }}
          />
        </div>
      )}

      {/* =====================================================================
          7. MODALE PLEIN ÉCRAN ESPACES VIP & SALONS D'AFFAIRES
         ===================================================================== */}
      {isVipOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto animate-in fade-in duration-200">
          <VipDiscoveryScreen
            currentUserProfile={{
              name: profile.name,
              handle: profile.handle,
              avatarUrl: profile.avatarUrl,
              isVipMember: true
            }}
            onBackToApp={() => setIsVipOpen(false)}
            onCreateVipSpace={() => setIsVipLoungeGatewayOpen(true)}
            onSelectLounge={(lounge) => {
              setActiveVipPlayerConfig({
                isOpen: true,
                youtubeLiveUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
                salonTitle: lounge.title,
                instructorName: lounge.hostName,
                monthlyPriceFcfa: lounge.monthlyPriceFcfa,
                categoryBadge: 'Club VIP'
              });
              showToast(`👑 Entrée en direct dans le Salon VIP : ${lounge.title}`);
            }}
            onSelectCourse={(course) => {
              setActiveVipPlayerConfig({
                isOpen: true,
                youtubeLiveUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
                salonTitle: course.title,
                instructorName: course.instructorName,
                monthlyPriceFcfa: 15000,
                categoryBadge: 'Masterclass'
              });
              showToast(`🎓 Masterclass VIP : ${course.title}`);
            }}
          />
        </div>
      )}

      {/* =====================================================================
          8. MODALE PLEIN ÉCRAN WAMEET SHOP (MINI-SITE E-COMMERCE)
         ===================================================================== */}
      {isShopOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-xs">
            <button
              type="button"
              onClick={() => setIsShopOpen(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
            <span className="text-xs font-black text-[#4169E1]">Wameet Shop</span>
            <div className="w-14" />
          </div>
          <div className="p-3 sm:p-6 max-w-4xl mx-auto">
            <WameetMiniShopView
              currentUserProfile={{
                name: profile.name,
                handle: profile.handle,
                avatarUrl: profile.avatarUrl,
                statusBadge: profile.statusBadge
              }}
              highlightedProductFromReelOrChat={selectedShopProductFromReel}
              onClearHighlightedProduct={() => setSelectedShopProductFromReel(null)}
              onNegotiateInW={(seller) => {
                setIsShopOpen(false);
                setActiveWRecipient({
                  name: seller.name,
                  handle: seller.handle,
                  avatarUrl: seller.avatarUrl,
                  contextReelTitle: `${seller.productTitle} (${seller.productPriceFcfa.toLocaleString('fr-FR')} FCFA)`
                });
                scrollToScreen(2); // Navigation vers Messagerie Wameet
                showToast(`💬 Négociation Wameet avec ${seller.name}`);
              }}
              onProductPublished={() => {
                setProfile(prev => ({
                  ...prev,
                  shopProductsCount: prev.shopProductsCount + 1
                }));
              }}
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          9. VISIONNEUSE PLEIN ÉCRAN DES STATUTS 24H / STORIES
         ===================================================================== */}
      {activeStory && activeStoryIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-lg rounded-3xl border-2 border-blue-600 bg-slate-900 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Barre de progression des stories */}
            <div className="flex gap-1.5 p-3 bg-black/50">
              {stories.map((st, i) => (
                <div
                  key={st.id}
                  onClick={() => setActiveStoryIndex(i)}
                  className="h-1.5 flex-1 rounded-full bg-white/25 overflow-hidden cursor-pointer"
                >
                  <div
                    className={`h-full transition-all ${
                      i <= activeStoryIndex ? 'w-full bg-[#4169E1]' : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Header de la Story */}
            <div className="px-4 py-2 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeStory.authorAvatar}
                  alt={activeStory.authorName}
                  className="w-9 h-9 rounded-full object-cover border border-[#4169E1]"
                />
                <div>
                  <div className="text-xs font-black text-white">{activeStory.authorName}</div>
                  <div className="text-[10px] text-blue-300">
                    {activeStory.authorBadge} • {activeStory.createdAt}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Petit badge sur sa Vitrine XXL : 'Premium - [Prix] FCFA' (Prompt 7) */}
                {activeStory.consultationPrice && activeStory.consultationPrice > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] font-black shadow-md flex items-center gap-1 border border-amber-300">
                    <span>⭐</span>
                    <span>Premium - {activeStory.consultationPrice.toLocaleString('fr-FR')} FCFA</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setActiveStoryIndex(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Média de la Story */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden">
              {activeStory.mediaType === 'video' ? (
                extractYouTubeVideoId(activeStory.mediaUrl) ? (
                  <div className="w-full">
                    <StealthYouTubePlayer
                      videoUrl={activeStory.mediaUrl}
                      title={activeStory.caption}
                      autoPlay={true}
                      hideBranding={true}
                    />
                  </div>
                ) : (
                  <video
                    src={activeStory.mediaUrl}
                    preload="auto"
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full max-h-[60vh] object-contain"
                  />
                )
              ) : (
                <img
                  src={activeStory.mediaUrl}
                  alt={activeStory.caption}
                  className="w-full h-full max-h-[60vh] object-contain"
                />
              )}

              {activeStoryIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveStoryIndex(activeStoryIndex - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-[#4169E1] text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {activeStoryIndex < stories.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStoryIndex(activeStoryIndex + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-[#4169E1] text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Légende & Réponse */}
            <div className="p-3 bg-slate-900 space-y-2">
              <p className="text-xs font-bold text-white text-center">
                {activeStory.caption}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={storyReplyText}
                  onChange={e => setStoryReplyText(e.target.value)}
                  placeholder={`Répondre à ${activeStory.authorName}...`}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 border border-blue-500/40 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    playValidationBeep();
                    setStoryReplyText('');
                    showToast(`💬 Réponse envoyée à ${activeStory.authorName} !`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#4169E1] text-white text-xs font-black cursor-pointer"
                >
                  Envoyer
                </button>
              </div>

              {/* Action Wameet / Monétisation Consultation Payante (Prompt 7) */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  {activeStory.consultationPrice && activeStory.consultationPrice > 0 ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <span>⭐</span>
                      <span>Consultation ({activeStory.consultationPrice.toLocaleString('fr-FR')} FCFA)</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold">🟢 Guichet Ouvert</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    if (activeStory.consultationPrice && activeStory.consultationPrice > 0) {
                      // Verrouillage du Jitsi par le Paiement :
                      // Intercepte l'action avant la génération de la salle Jitsi
                      setPremiumPaymentTarget({
                        id: activeStory.id,
                        name: activeStory.authorName,
                        avatar: activeStory.authorAvatar,
                        price: activeStory.consultationPrice,
                        topic: activeStory.caption || 'Consultation d\'Expert'
                      });
                    } else {
                      setIsWameetModalOpen(true);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#4169E1] hover:bg-blue-600 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>
                    {activeStory.consultationPrice && activeStory.consultationPrice > 0
                      ? `Demander Wameet (${activeStory.consultationPrice.toLocaleString('fr-FR')} F)`
                      : 'Demander un Wameet'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout Statut / Story / Reel */}
      {isAddStoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 border border-slate-100 shadow-2xl">
            {newStoryMediaType === 'video' ? (
              <WameetReelUploadStudio
                authorName={profile.name}
                authorAvatar={profile.avatarUrl}
                authorBadge={profile.statusBadge}
                caption={newStoryCaption}
                onChangeCaption={setNewStoryCaption}
                onUploadSuccess={(url, thumb) => {
                  setNewStoryUrl(url);
                  if (thumb) setNewStoryThumbnailUrl(thumb);
                }}
                onPublishReel={async (e, directUrl, directCaption, directThumb) => {
                  await handleCreateStory(e, directUrl, directCaption, directThumb);
                }}
                onCancel={() => {
                  setIsAddStoryModalOpen(false);
                  setNewStoryUrl('');
                  setNewStoryThumbnailUrl('');
                  setNewStoryCaption('');
                }}
                onSwitchMediaType={(type) => setNewStoryMediaType(type)}
                initialVideoUrl={newStoryUrl}
              />
            ) : (
              <form onSubmit={handleCreateStory} className="space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#4169E1] text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-[#4169E1]/20 overflow-hidden">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        profile.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>{profile.name}</span>
                        <span className="text-[10px] font-bold text-[#4169E1] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {profile.statusBadge}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">Format Photo Statut</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddStoryModalOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sélecteur de format */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 py-1.5 rounded-xl text-xs font-black bg-[#4169E1] text-white border border-[#4169E1] shadow-xs cursor-pointer"
                  >
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStoryMediaType('video')}
                    className="flex-1 py-1.5 rounded-xl text-xs font-black bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Vidéo Reel
                  </button>
                </div>

                {/* Sélecteur de Photo & Carte de prévisualisation visuelle */}
                <div>
                  <input
                    id="story-image-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setNewStoryUrl(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />

                  {!newStoryUrl ? (
                    <button
                      type="button"
                      onClick={() => document.getElementById('story-image-input')?.click()}
                      className="w-full py-4 px-3 rounded-2xl border-2 border-dashed border-[#4169E1]/40 bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#4169E1] text-white flex items-center justify-center shadow-md shadow-[#4169E1]/30">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-[#4169E1]">Choisir une Photo de Vitrine</span>
                      <span className="text-[10px] text-slate-500 font-medium">JPEG, PNG ou WebP</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                      <img
                        src={newStoryUrl}
                        alt="Aperçu Story"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Photo prête 🚀
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Visuel validé</p>
                        <button
                          type="button"
                          onClick={() => document.getElementById('story-image-input')?.click()}
                          className="text-[10px] font-bold text-[#4169E1] hover:underline cursor-pointer block mt-0.5"
                        >
                          Changer de photo
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewStoryUrl('')}
                        className="p-1 rounded-full text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Lien Direct de l'Image (URL) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Lien Direct de l'Image (URL) :</label>
                  <input
                    type="url"
                    placeholder="https://... lien direct vers l'image"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-[#4169E1] focus:outline-none"
                    value={newStoryUrl.startsWith('data:') ? '' : newStoryUrl}
                    onChange={(e) => setNewStoryUrl(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Légende courte :
                  </label>
                  <input
                    type="text"
                    value={newStoryCaption}
                    onChange={e => setNewStoryCaption(e.target.value)}
                    placeholder="Ex: Belle soirée de travail à Ouaga !"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#4169E1]"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddStoryModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#4169E1] text-white text-xs font-black shadow-md hover:bg-blue-700 cursor-pointer"
                  >
                    Publier la Photo
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal d'Authentification / Contacts */}
      {isOnboardingModalOpen && (
        <WameetOnboardingModal
          isOpen={isOnboardingModalOpen}
          onClose={() => setIsOnboardingModalOpen(false)}
          initialStep={onboardingInitialStep}
          currentUser={currentUser}
          onUserAuthenticated={result => {
            setProfile(prev => ({
              ...prev,
              name: result.user?.displayName || prev.name,
              avatarUrl: result.user?.photoURL || prev.avatarUrl
            }));
            showToast('✅ Numéro vérifié avec succès !');
          }}
          onSyncComplete={matched => {
            showToast(`🎉 ${matched.length} contacts synchronisés sur Wameet !`);
          }}
        />
      )}

      {/* =====================================================================
          SAS DE CONFIGURATION (PROMPT 48 : ACTION BOTTOM SHEETS)
          Empêche l'ouverture brutale des fonctionnalités expertes
         ===================================================================== */}
      {/* 1. Sas Lancer un Live Shopping */}
      <LiveShoppingGatewayBottomSheet
        isOpen={isLiveShoppingGatewayOpen}
        onClose={() => setIsLiveShoppingGatewayOpen(false)}
        onLaunchLive={(config) => {
          setIsLiveShoppingGatewayOpen(false);
          setLiveJitsiEngineConfig({
            isOpen: true,
            title: config.title,
            category: config.category,
            isSeller: true
          });
          showToast(`🚀 Live Shopping WebRTC "${config.title}" démarré !`);
        }}
      />

      {/* 2. Sas Créer un Salon VIP */}
      <VipLoungeGatewayBottomSheet
        isOpen={isVipLoungeGatewayOpen}
        onClose={() => setIsVipLoungeGatewayOpen(false)}
        onLaunchVip={(config) => {
          setIsVipLoungeGatewayOpen(false);
          setActiveVipPlayerConfig({
            isOpen: true,
            youtubeLiveUrl: config.youtubeLiveUrl,
            salonTitle: config.name,
            instructorName: profile.name,
            monthlyPriceFcfa: config.monthlyPriceFcfa,
            categoryBadge: config.contentType
          });
          showToast(`👑 Salon VIP "${config.name}" ouvert en direct !`);
        }}
      />

      {/* 3. Sas Livreur Swarm Delivery */}
      <SwarmDeliveryGatewayBottomSheet
        isOpen={isSwarmDeliveryGatewayOpen}
        onClose={() => setIsSwarmDeliveryGatewayOpen(false)}
        onLaunchDelivery={(config) => {
          setIsSwarmDeliveryGatewayOpen(false);
          setIsDeliveryHeatmapOpen(true);
          showToast(`📍 Mode Livreur activé (${config.vehicleType}, rayon ${config.radiusKm}km) !`);
        }}
      />

      {/* Lecteur Salles & Salons VIP Headless YouTube (Prompt 50) */}
      {activeVipPlayerConfig?.isOpen && (
        <VipYouTubePlayer
          isOpen={activeVipPlayerConfig.isOpen}
          youtubeLiveUrl={activeVipPlayerConfig.youtubeLiveUrl}
          salonTitle={activeVipPlayerConfig.salonTitle}
          instructorName={activeVipPlayerConfig.instructorName}
          monthlyPriceFcfa={activeVipPlayerConfig.monthlyPriceFcfa}
          categoryBadge={activeVipPlayerConfig.categoryBadge}
          onClose={() => setActiveVipPlayerConfig(null)}
        />
      )}

      {/* Moteur Live Shopping WebRTC Jitsi Headless (Prompt 51) */}
      {liveJitsiEngineConfig?.isOpen && (
        <LiveShoppingJitsiEngine
          isOpen={liveJitsiEngineConfig.isOpen}
          title={liveJitsiEngineConfig.title}
          isSeller={liveJitsiEngineConfig.isSeller}
          sellerName={profile.name}
          sellerHandle={profile.handle}
          sellerAvatar={profile.avatarUrl}
          onClose={() => setLiveJitsiEngineConfig(null)}
        />
      )}

      {/* Lecteur Live Shopping */}
      {isWameetLiveOpen && (
        <WameetLiveWrapper
          isOpen={isWameetLiveOpen}
          onClose={() => setIsWameetLiveOpen(false)}
        />
      )}

      {/* Swarm Delivery Heatmap */}
      {isDeliveryHeatmapOpen && (
        <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
          <DeliveryHeatmapScreen onClose={() => setIsDeliveryHeatmapOpen(false)} />
        </div>
      )}

      {/* Cagnotte Phygitale */}
      {isCagnotteOpen && (
        <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
          <CagnotteGroupDemoScreen onClose={() => setIsCagnotteOpen(false)} />
        </div>
      )}

      {/* Extension Isolée Wameet */}
      {isIsolatedExtensionOpen && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-in fade-in duration-200">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsIsolatedExtensionOpen(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 text-xs font-black text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Fermer l'extension</span>
            </button>
            <span className="text-xs font-black text-[#4169E1]">Wameet Extension</span>
            <div className="w-14" />
          </div>
          <WameetIsolatedExtensionApp onOpenMainWameet={() => setIsIsolatedExtensionOpen(false)} />
        </div>
      )}

      {/* Générateur de Salon Privé Wameet (Prompt 5 & 10) */}
      <WameetModal
        isOpen={isWameetModalOpen}
        onClose={() => {
          setIsWameetModalOpen(false);
          setWameetTargetMember(null);
        }}
        creatorName={wameetTargetMember?.name || profile.name}
        creatorHandle={wameetTargetMember?.handle || profile.handle}
        creatorAvatar={wameetTargetMember?.avatarUrl || profile.avatarUrl}
        onOpenScheduleAppointment={() => {
          setAppointmentTargetCreator({
            id: wameetTargetMember?.handle || 'creator',
            name: wameetTargetMember?.name || profile.name,
            avatar: wameetTargetMember?.avatarUrl || profile.avatarUrl,
            handle: wameetTargetMember?.handle || profile.handle
          });
          setIsAppointmentModalOpen(true);
        }}
        onInviteCreated={(invite) => {
          showToast(`Lien Wameet copié ! Prêt à partager.`);
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(invite.inviteUrl).catch(() => {});
          }
        }}
      />

      {/* Guichet d'Expert (Prompt 7 & 10 : Notification Push FCM à l'ouverture) */}
      <GuichetModal
        isOpen={isGuichetModalOpen}
        onClose={() => setIsGuichetModalOpen(false)}
        defaultPrice={15000}
        onActivateGuichet={(data) => {
          const newShowcase: WameetStoryItem = {
            id: 'story-guichet-' + Date.now(),
            authorName: profile.name,
            authorAvatar: profile.avatarUrl,
            authorBadge: data.status === 'coaching' ? '🎓 Coach Expert' : '🟢 Guichet Live',
            mediaType: 'image',
            mediaUrl: data.mediaUrl,
            caption: `${data.title} • ${data.caption}`,
            createdAt: 'À l\'instant',
            viewsCount: 1,
            likesCount: 0,
            consultationPrice: data.consultationPrice
          };
          setStories((prev) => [newShowcase, ...prev]);

          // Déclencheur Notification Push Firebase (FCM) (Prompt 10)
          wameetNotificationService.notifyGuichetOpened({
            creatorName: profile.name,
            creatorId: profile.handle,
            topic: data.title
          }).catch(() => {});

          if (data.consultationPrice && data.consultationPrice > 0) {
            showToast(
              `🏪 Guichet activé ! Vitrine XXL Premium affichée à ${data.consultationPrice.toLocaleString('fr-FR')} FCFA`
            );
          } else {
            showToast('🏪 Guichet d\'expert ouvert en direct ! Notification push transmise à vos contacts 🚀');
          }
        }}
      />

      {/* Modale de Réservation Différée & Mini-Pitch Asynchrone (Prompt 10) */}
      {isAppointmentModalOpen && (
        <WameetAppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => {
            setIsAppointmentModalOpen(false);
            setAppointmentTargetCreator(null);
          }}
          creatorId={appointmentTargetCreator?.id || 'creator'}
          creatorName={appointmentTargetCreator?.name || 'Créateur Wameet'}
          creatorAvatar={appointmentTargetCreator?.avatar}
          creatorHandle={appointmentTargetCreator?.handle}
          priceFcfa={appointmentTargetCreator?.priceFcfa || 0}
          currentUserId={currentUser?.id || profile.handle || 'user-current'}
          currentUserName={profile.name}
          currentUserAvatar={profile.avatarUrl}
          onAppointmentCreated={(newApt) => {
            setUserAppointments((prev) => [newApt, ...prev]);
            setImminentAppointment(getImminentAppointment([newApt, ...userAppointments]));
            showToast(`📅 Wameet réservé pour le ${newApt.date} à ${newApt.timeSlot} !`);
          }}
        />
      )}

      {/* Salon Vidéo Wameet Actif pour Rendez-vous */}
      {activeAppointmentRoom && (
        <div className="fixed inset-0 z-[160] bg-black">
          <WameetRoom
            wameetId={activeAppointmentRoom.wameetId}
            creatorName={activeAppointmentRoom.creatorName}
            reason={activeAppointmentRoom.reason}
            time={activeAppointmentRoom.time}
            onBack={() => setActiveAppointmentRoom(null)}
          />
        </div>
      )}

      {/* Interface de Paiement Mobile Money & Verrouillage Jitsi (Prompt 7) */}
      {premiumPaymentTarget && (
        <WameetPremiumPaymentModal
          isOpen={Boolean(premiumPaymentTarget)}
          onClose={() => setPremiumPaymentTarget(null)}
          expert={premiumPaymentTarget}
          requester={{
            id: profile.handle || profile.name,
            name: profile.name,
            phone: (profile as any).wNumber || (profile as any).phone
          }}
          onPaymentSuccess={(result) => {
            showToast('✅ Paiement validé par webhook ! Salon Wameet débloqué.');
          }}
        />
      )}
    </WameetLayout>
  );
};

export default WameetSupraApp;
