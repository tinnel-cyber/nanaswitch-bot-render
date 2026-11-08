import React from 'react';
import {
  Image as ImageIcon,
  Video,
  Film,
  BarChart2,
  Plus,
  Heart,
  ThumbsUp,
  Lightbulb,
  MessageSquare,
  Share2,
  Send,
  Volume2,
  Edit3,
  X,
  Sparkles,
  ExternalLink,
  MoreHorizontal,
  Bookmark,
  Check,
  Coins,
  Lock,
  PieChart,
  Users,
  ShoppingBag,
  Banknote,
  Shield,
  ShieldCheck,
  CornerDownRight,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Upload,
  Camera
} from 'lucide-react';
import {
  WameetProfileData,
  WameetStoryItem,
  WameetPostItem,
  WameetCommentItem,
  WameetModerationSettings,
  ImageLinkHelperNotice
} from '../../../../pages/wameet/WameetSupraApp';
import { StealthYouTubePlayer, extractYouTubeVideoId } from '../../../../components/lms/video/StealthYouTubePlayer';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';
import { MiniAppsGridModal, MiniAppActionPayload } from './MiniAppsGridModal';
import { FabRosace } from '../../../../components/FabRosace';
import { CreatePostModal } from './CreatePostModal';
import { ImmersiveFeed } from './ImmersiveFeed';
import { WameetFeed } from './WameetFeed';
import { LiveShowcases, DEFAULT_SHOWCASES, ShowcaseItem, ShowcaseStatusType } from './LiveShowcases';
import { WameetUpcomingAppointmentBanner } from './WameetUpcomingAppointmentBanner';
import { WameetAppointment } from '../../../../services/wameetAppointmentService';
import { db } from '../../../../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { supabase } from '@/lib/supabase';

export interface SocialFeedScreenProps {
  profile: WameetProfileData;
  setProfile: React.Dispatch<React.SetStateAction<WameetProfileData>>;
  stories: WameetStoryItem[];
  posts: WameetPostItem[];
  onOpenAddStoryModal: (initialMediaType?: 'image' | 'video') => void;
  onOpenGuichet?: () => void;
  onSelectStory: (story: WameetStoryItem, index: number) => void;
  onOpenWWithMember?: (member: { name: string; handle: string; avatarUrl: string }) => void;
  onReaction: (postId: string, type: 'like' | 'love' | 'idea') => void;
  onVotePoll: (postId: string, optionId: string) => void;
  onAddComment: (
    postId: string,
    replyMeta?: { parentId?: string | null; replyToId?: string | null; replyToAuthor?: string | null }
  ) => void;
  onUpdateModerationSettings?: (postId: string, settings: WameetModerationSettings) => void;
  onApproveComment?: (postId: string, commentId: string) => void;
  onRejectComment?: (postId: string, commentId: string) => void;
  commentInputs: Record<string, string>;
  setCommentInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // Composer
  composerText: string;
  setComposerText: (val: string) => void;
  composerMediaType: 'none' | 'video' | 'image' | 'audio' | 'poll';
  setComposerMediaType: (val: 'none' | 'video' | 'image' | 'audio' | 'poll') => void;
  composerMediaUrl: string;
  setComposerMediaUrl: (val: string) => void;
  composerPollQuestion: string;
  setComposerPollQuestion: (val: string) => void;
  composerPollOpt1: string;
  setComposerPollOpt1: (val: string) => void;
  composerPollOpt2: string;
  setComposerPollOpt2: (val: string) => void;
  composerPollOpt3: string;
  setComposerPollOpt3: (val: string) => void;
  handlePublishPost: (e: React.FormEvent) => void;
  attachedMiniApp?: MiniAppActionPayload | null;
  setAttachedMiniApp?: React.Dispatch<React.SetStateAction<MiniAppActionPayload | null>>;

  // Profile Edit Modals
  isAvatarLinkModalOpen: boolean;
  setIsAvatarLinkModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  avatarUrlInput: string;
  setAvatarUrlInput: (val: string) => void;
  handleSaveAvatarUrl: (e: React.FormEvent) => void;

  isBannerLinkModalOpen: boolean;
  setIsBannerLinkModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  bannerUrlInput: string;
  setBannerUrlInput: (val: string) => void;
  handleSaveBannerUrl: (e: React.FormEvent) => void;

  isBadgeEditorOpen: boolean;
  setIsBadgeEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  customBadgeInput: string;
  setCustomBadgeInput: (val: string) => void;
  statusBadgePresets: string[];

  // Prise de rendez-vous & Alerte prioritaire (Prompt 10)
  onScheduleAppointment?: (showcase: ShowcaseItem) => void;
  imminentAppointment?: WameetAppointment | null;
  onJoinAppointmentRoom?: (appointment: WameetAppointment) => void;
  hideFloatingFab?: boolean;
}

/**
 * COMPOSANT SocialFeedScreen (Prompt 44 : Le Flux Wameet Edge-to-Edge)
 * 
 * Directives UI/UX au millimètre :
 * 1. Suppression Totale des Cadres :
 *    - Zéro bordure bleue épaisse (border-blue-500, border-2, etc.).
 *    - Design plat, fluide, immersif et ultra-moderne.
 * 2. Les Cartes de Publication (Posts) :
 *    - Prennent 100% de la largeur de l'écran : w-full rounded-none.
 *    - Séparation entre deux posts : simple espace gris clair épais (border-b-[6px] border-slate-100).
 * 3. Espaces et Marges Internes :
 *    - Contenu texte et avatars avec padding latéral standard (px-4).
 *    - L'image ou la vidéo de la publication touche les bords gauche et droit de l'écran du téléphone (Edge-to-Edge).
 */
export const FALLBACK_REEL_POSTS: WameetPostItem[] = [
  {
    id: 'mock-reel-1',
    authorName: 'Awa Ouédraogo',
    authorHandle: '@awa.empire.bf',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    authorBadge: '🛍️ E-Shop & Mode Wax',
    isOnline: true,
    createdAt: 'À l’instant',
    title: 'Coffret Beauté Karité Royal Or',
    content: '🔥 45 commandes expédiées ce soir sur Wameet Shop ! Les coulisses de l’atelier de confection en direct.',
    description: '🔥 45 commandes expédiées ce soir sur Wameet Shop ! Les coulisses de l’atelier de confection en direct.',
    type: 'PRODUCT_POST',
    priceXOF: 18500,
    shopUrl: 'https://awa.nana-store.shop',
    mediaType: 'video',
    mediaUrl: '/videos/reel-eshop.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80',
    likesCount: 348,
    lovesCount: 180,
    ideasCount: 94,
    sharesCount: 52,
    impactScore: 19450,
    category: 'E-Commerce',
    comments: [
      { id: 'mc-1', authorName: 'Moussa T.', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120', text: 'Top la vidéo !', createdAt: 'Il y a 2 min', status: 'approved' }
    ]
  },
  {
    id: 'mock-reel-2',
    authorName: 'Dr. Idriss Kaboré',
    authorHandle: '@idriss.mentor',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    authorBadge: '🎓 Mentor & Formateur',
    isOnline: true,
    createdAt: 'Il y a 10 min',
    title: 'Masterclass Vente & Guichet Automatique',
    content: '💡 3 Secrets pour vendre votre savoir en automatique et lancer votre guichet Wameet.',
    description: '💡 3 Secrets pour vendre votre savoir en automatique et lancer votre guichet Wameet.',
    type: 'AD_POST',
    targetUrl: 'https://wameet.net/mentorat',
    actionButtonText: 'Rejoindre la Session',
    mediaType: 'video',
    mediaUrl: '/videos/reel-mentor.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&auto=format&fit=crop&q=80',
    likesCount: 512,
    lovesCount: 240,
    ideasCount: 160,
    sharesCount: 78,
    impactScore: 24800,
    category: 'Business',
    comments: [
      { id: 'mc-2', authorName: 'Fatou N.', authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120', text: 'Très inspirant !', createdAt: 'Il y a 5 min', status: 'approved' }
    ]
  },
  {
    id: 'mock-reel-3',
    authorName: 'Fatou Ndiaye',
    authorHandle: '@fatou.tech',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    authorBadge: '⚡ Tech & Innovation',
    isOnline: true,
    createdAt: 'Il y a 25 min',
    title: 'Hackathon Wameet Supra à Abidjan',
    content: '🚀 Lancement du Hackathon Wameet Supra à Abidjan ! L’écosystème numérique africain en direct.',
    description: '🚀 Lancement du Hackathon Wameet Supra à Abidjan ! L’écosystème numérique africain en direct.',
    type: 'IDEA_POST',
    sector: 'EdTech & IA',
    contact: '+225 07 00 11 22 33',
    mediaType: 'video',
    mediaUrl: '/videos/reel-business.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&auto=format&fit=crop&q=80',
    likesCount: 289,
    lovesCount: 140,
    ideasCount: 88,
    sharesCount: 39,
    impactScore: 16320,
    category: 'Innovation',
    comments: []
  },
  {
    id: 'mock-poster-1',
    authorName: 'Amadou Sanogo',
    authorHandle: '@amadou.wax',
    authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    authorBadge: '🏷️ Vente Flash & Mode Wax',
    isOnline: true,
    createdAt: 'Il y a 30 min',
    title: 'Pack Tissu Wax Royal Authentique',
    content: '🎉 Affiche Promo : -40% sur toute la collection Wax Authentique jusqu’à minuit ! Commandez directement en 1 clic.',
    description: '🎉 Affiche Promo : -40% sur toute la collection Wax Authentique jusqu’à minuit ! Commandez directement en 1 clic.',
    type: 'PRODUCT_POST',
    priceXOF: 24000,
    shopUrl: 'https://amadou.nana-store.shop',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1080&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1080&auto=format&fit=crop&q=80',
    likesCount: 642,
    lovesCount: 310,
    ideasCount: 125,
    sharesCount: 88,
    impactScore: 28900,
    category: 'Vente Flash',
    comments: [
      { id: 'mc-p1', authorName: 'Salif O.', authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120', text: 'Superbe collection !', createdAt: 'Il y a 8 min', status: 'approved' }
    ]
  },
  {
    id: 'mock-poster-2',
    authorName: 'Mariam Traoré',
    authorHandle: '@mariam.live',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    authorBadge: '🚀 Masterclass & Live Commerce',
    isOnline: true,
    createdAt: 'Il y a 45 min',
    title: 'Tunnels de Vente & Terminal NaNa POS',
    content: '⚡ Affiche Officielle : Masterclass Live comment scaler votre business en ligne avec les Tunnels Nanasore et Wameet.',
    description: '⚡ Affiche Officielle : Masterclass Live comment scaler votre business en ligne avec les Tunnels Nanasore et Wameet.',
    type: 'AD_POST',
    targetUrl: 'https://nanasore.com/scale',
    actionButtonText: 'Découvrir NaNa POS',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1080&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1080&auto=format&fit=crop&q=80',
    likesCount: 890,
    lovesCount: 420,
    ideasCount: 230,
    sharesCount: 145,
    impactScore: 34100,
    category: 'Formation VIP',
    comments: [
      { id: 'mc-p2', authorName: 'Bintou D.', authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120', text: 'Inscrite à la session !', createdAt: 'Il y a 12 min', status: 'approved' }
    ]
  }
];

export const SocialFeedScreen: React.FC<SocialFeedScreenProps> = ({
  profile,
  setProfile,
  stories,
  posts,
  onOpenAddStoryModal,
  onOpenGuichet,
  onSelectStory,
  onOpenWWithMember,
  onReaction,
  onVotePoll,
  onAddComment,
  commentInputs,
  setCommentInputs,
  composerText,
  setComposerText,
  composerMediaType,
  setComposerMediaType,
  composerMediaUrl,
  setComposerMediaUrl,
  composerPollQuestion,
  setComposerPollQuestion,
  composerPollOpt1,
  setComposerPollOpt1,
  composerPollOpt2,
  setComposerPollOpt2,
  composerPollOpt3,
  setComposerPollOpt3,
  handlePublishPost,
  attachedMiniApp,
  setAttachedMiniApp,
  isAvatarLinkModalOpen,
  setIsAvatarLinkModalOpen,
  avatarUrlInput,
  setAvatarUrlInput,
  handleSaveAvatarUrl,
  isBannerLinkModalOpen,
  setIsBannerLinkModalOpen,
  bannerUrlInput,
  setBannerUrlInput,
  handleSaveBannerUrl,
  isBadgeEditorOpen,
  setIsBadgeEditorOpen,
  customBadgeInput,
  setCustomBadgeInput,
  statusBadgePresets,
  onUpdateModerationSettings,
  onApproveComment,
  onRejectComment,
  onScheduleAppointment,
  imminentAppointment,
  onJoinAppointmentRoom,
  hideFloatingFab = false
}) => {
  const [localAttachedMiniApp, setLocalAttachedMiniApp] = React.useState<MiniAppActionPayload | null>(null);
  const currentAttachedMiniApp = attachedMiniApp !== undefined ? attachedMiniApp : localAttachedMiniApp;
  const updateAttachedMiniApp = setAttachedMiniApp || setLocalAttachedMiniApp;
  const [isMiniAppsModalOpen, setIsMiniAppsModalOpen] = React.useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [isBusinessIdeaModalOpen, setIsBusinessIdeaModalOpen] = React.useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = React.useState(false);

  // Gestion de la modération des commentaires (Prompt 1)
  const [activeModerationPost, setActiveModerationPost] = React.useState<WameetPostItem | null>(null);
  const [moderationFilterMode, setModerationFilterMode] = React.useState<'all' | 'blocked_words' | 'manual_approval'>('all');
  const [blockedWordsInput, setBlockedWordsInput] = React.useState<string>('');

  // Gestion des réponses imbriquées (Prompt 1)
  const [replyingToMap, setReplyingToMap] = React.useState<Record<string, { parentId: string; replyToId: string; replyToAuthor: string } | null>>({});
  const [activeCommentsPostId, setActiveCommentsPostId] = React.useState<string | null>(null);
  const activeCommentsPost = activeCommentsPostId ? posts.find(p => p.id === activeCommentsPostId) || null : null;

  const handleOpenModerationModal = (post: WameetPostItem) => {
    playTapBeep();
    setActiveModerationPost(post);
    setModerationFilterMode(post.moderationSettings?.filterMode || 'all');
    setBlockedWordsInput((post.moderationSettings?.blockedWords || []).join(', '));
  };

  const handleSaveModerationSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModerationPost) return;
    playValidationBeep();
    const words = blockedWordsInput
      .split(',')
      .map(w => w.trim())
      .filter(Boolean);

    if (onUpdateModerationSettings) {
      onUpdateModerationSettings(activeModerationPost.id, {
        filterMode: moderationFilterMode,
        blockedWords: words
      });
    }
    setActiveModerationPost(null);
  };

  const handleStartReply = (postId: string, rootId: string, replyToId: string, replyToAuthor: string) => {
    playTapBeep();
    setReplyingToMap(prev => ({
      ...prev,
      [postId]: {
        parentId: rootId,
        replyToId,
        replyToAuthor
      }
    }));
  };

  const handleCancelReply = (postId: string) => {
    playTapBeep();
    setReplyingToMap(prev => ({ ...prev, [postId]: null }));
  };

  const handleSubmitComment = (postId: string) => {
    const replyMeta = replyingToMap[postId] || undefined;
    onAddComment(postId, replyMeta);
    setReplyingToMap(prev => ({ ...prev, [postId]: null }));
  };

  // Fusion dynamique des vitrines vivantes (Guichets d'experts créés + vitrines réseau)
  const combinedShowcases: ShowcaseItem[] = [
    ...(stories || []).map((st) => ({
      id: st.id,
      authorName: st.authorName,
      authorAvatar: st.authorAvatar,
      statusType: (st.authorBadge?.toLowerCase().includes('coach')
        ? 'COACHING'
        : st.authorBadge?.toLowerCase().includes('business')
        ? 'BUSINESS'
        : 'DISPO') as ShowcaseStatusType,
      backgroundMedia: st.mediaUrl,
      impactScore: 18450,
      priceFcfa: st.consultationPrice,
      consultationPrice: st.consultationPrice,
      expiresInSeconds: 7200,
      caption: st.caption
    })),
    ...DEFAULT_SHOWCASES
  ];

  // État des posts synchronisés en temps réel depuis Firestore 'social_feed_posts' (PRODUCT_POST, AD_POST, IDEA_POST)
  const [remoteSocialPosts, setRemoteSocialPosts] = React.useState<WameetPostItem[]>([]);

  React.useEffect(() => {
    let isCancelled = false;
    const fetchSocialPosts = async () => {
      try {
        const q = query(collection(db, 'social_feed_posts'), orderBy('createdAt', 'desc'), limit(30));
        const snapshot = await getDocs(q);
        if (isCancelled) return;
        const fetched: WameetPostItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const cleanCreator = data.creatorId ? (data.creatorId.startsWith('@') ? data.creatorId.substring(1) : data.creatorId) : 'membre';
          fetched.push({
            id: docSnap.id,
            authorName: data.authorName || cleanCreator,
            authorHandle: data.authorHandle || (data.creatorId ? (data.creatorId.startsWith('@') ? data.creatorId : `@${data.creatorId}`) : `@${cleanCreator}`),
            authorAvatar: data.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            authorBadge: data.type === 'PRODUCT_POST' ? '🛍️ Vendeur Vérifié' : data.type === 'AD_POST' ? '📢 Annonceur Officiel' : '💡 Porteur d\'Idée',
            description: data.content || data.description || data.title || '',
            content: data.content || data.description || data.title || '',
            title: data.title,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType || (data.mediaUrl && (data.mediaUrl.endsWith('.mp4') || data.mediaUrl.includes('/videos/')) ? 'video' : 'image'),
            thumbnailUrl: data.mediaUrl,
            likesCount: data.resonanceCount || 0,
            lovesCount: 0,
            ideasCount: 0,
            sharesCount: data.shareCount || 0,
            impactScore: data.impactScore || (data.priceXOF ? Number(data.priceXOF) * 2 : 18500),
            category: data.sector || (data.type === 'PRODUCT_POST' ? 'E-Commerce' : data.type === 'AD_POST' ? 'Sponsorisé' : 'Innovation'),
            type: data.type,
            priceXOF: data.priceXOF,
            shopUrl: data.shopUrl,
            targetUrl: data.targetUrl,
            actionButtonText: data.actionButtonText,
            sector: data.sector,
            contact: data.contact,
            createdAt: 'Récemment'
          } as any);
        });
        if (fetched.length > 0) {
          setRemoteSocialPosts(fetched);
        }
      } catch (e) {
        console.warn('[SOCIAL POSTS LOAD]', e);
      }
    };

    fetchSocialPosts();

    // Écouteur Supabase Realtime
    const channelName = `social_feed_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wameet_messages',
        },
        () => {
          fetchSocialPosts();
        }
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Fusion dynamique des posts distants et locaux
  const activePosts = React.useMemo(() => {
    const combined = [...remoteSocialPosts, ...(posts || [])];
    if (combined.length > 0) {
      return combined;
    }
    return FALLBACK_REEL_POSTS;
  }, [remoteSocialPosts, posts]);

  return (
    <div
      className="h-full min-h-[100dvh] w-full overflow-y-auto pb-24 relative bg-slate-950 select-none touch-pan-y"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* ===================================================================
          1. COMPOSANT LIVESHOWCASES.TSX (VITRINES VIVANTES EN HAUT DU FLUX)
         =================================================================== */}
      <div className="relative z-20 pointer-events-auto bg-slate-950 border-b border-white/10 pt-1">
        <LiveShowcases
          showcases={combinedShowcases}
          currentUserAvatar={profile.avatarUrl}
          currentUserName={profile.name}
          currentUserImpactScore={profile.impactScore || 18450}
          onOpenCreateShowcase={onOpenAddStoryModal}
          onSelectShowcase={(sc, idx) => {
            onSelectStory({
              id: sc.id,
              authorName: sc.authorName || sc.creatorName || 'Membre Wameet',
              authorAvatar: sc.authorAvatar || sc.creatorAvatar || profile.avatarUrl,
              authorBadge: sc.statusType || sc.statusLabel || 'En Direct',
              mediaType: sc.mediaType || 'image',
              mediaUrl: sc.backgroundMedia || sc.mediaUrl || '',
              caption: sc.caption || '',
              createdAt: 'En Direct',
              viewsCount: 350,
              likesCount: 120,
              consultationPrice: sc.priceFcfa || sc.consultationPrice
            }, idx);
          }}
          onScheduleAppointment={onScheduleAppointment}
          className="bg-transparent backdrop-blur-none border-none py-2"
        />

        {/* BANDEAU PRIORITAIRE WAMEET IMMINENT (< 30 min) (Prompt 10) */}
        {imminentAppointment && onJoinAppointmentRoom && (
          <div className="px-3 pt-1">
            <WameetUpcomingAppointmentBanner
              appointment={imminentAppointment}
              onJoinRoom={onJoinAppointmentRoom}
            />
          </div>
        )}
      </div>

      {/* ===================================================================
          2. FLUX D'ACTUALITÉ ALIGNÉ DIRECTEMENT SOUS LES VITRINES VIVANTES
         =================================================================== */}
      <WameetFeed
        posts={activePosts}
        currentUserId={profile.handle || 'user_me'}
        currentUserDiamonds={profile.diamonds || profile.impactScore || 18450}
        onReaction={onReaction}
        onOpenWWithMember={onOpenWWithMember}
        onOpenComments={(p) => setActiveCommentsPostId(p.id)}
        onSaveToVault={(postId) => {
          try {
            const current = JSON.parse(localStorage.getItem('wameet_vault_posts') || '[]');
            if (!current.includes(postId)) {
              localStorage.setItem('wameet_vault_posts', JSON.stringify([...current, postId]));
            }
          } catch (e) {}
        }}
        onOpenWameetModal={(creatorId) => {
          if (onOpenWWithMember) {
            onOpenWWithMember({
              name: creatorId,
              handle: creatorId.startsWith('@') ? creatorId : `@${creatorId}`,
              avatarUrl: ''
            });
          }
        }}
      />

      {/* ===================================================================
          TIROIR / MODALE DE COMMENTAIRES IMBRIQUÉS & MODÉRATION (PROMPT 1 & 2)
         =================================================================== */}
      {activeCommentsPost && (
        <div className="fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#4169E1]" />
                <h3 className="text-sm font-black text-slate-900">
                  Commentaires ({(activeCommentsPost.comments || []).length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Bouton Paramètres de Confidentialité si propriétaire */}
                {((activeCommentsPost.authorHandle && activeCommentsPost.authorHandle === profile.handle) || (!activeCommentsPost.authorHandle && activeCommentsPost.authorName === profile.name) || activeCommentsPost.authorName === profile.name) && (
                  <button
                    type="button"
                    onClick={() => handleOpenModerationModal(activeCommentsPost)}
                    className="px-2.5 py-1 rounded-full bg-blue-50 text-[#4169E1] text-[11px] font-bold flex items-center gap-1 border border-blue-200 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Modérer</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveCommentsPostId(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition active:scale-95"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Liste défilable des commentaires */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(() => {
                const isPostOwner = (activeCommentsPost.authorHandle && activeCommentsPost.authorHandle === profile.handle) || (!activeCommentsPost.authorHandle && activeCommentsPost.authorName === profile.name) || activeCommentsPost.authorName === profile.name;
                const rootComments = (activeCommentsPost.comments || []).filter(c => !c.parentId);
                const getReplies = (parentId: string) => (activeCommentsPost.comments || []).filter(c => c.parentId === parentId);

                const visibleRootComments = rootComments.filter(c => {
                  if (c.status === 'pending') return isPostOwner;
                  return c.status !== 'rejected';
                });

                if (visibleRootComments.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-500">Aucun commentaire pour le moment</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Soyez le premier à réagir ci-dessous !</p>
                    </div>
                  );
                }

                return visibleRootComments.map((c) => {
                  const isPending = c.status === 'pending';
                  const replies = getReplies(c.id).filter(r => {
                    if (r.status === 'pending') return isPostOwner;
                    return r.status !== 'rejected';
                  });

                  return (
                    <div key={c.id} className="space-y-1.5">
                      {/* Commentaire Parent */}
                      <div className="flex items-start gap-2.5">
                        <img
                          src={c.authorAvatar}
                          alt={c.authorName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="flex-1 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200/60">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900">{c.authorName}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{c.createdAt}</span>
                          </div>

                          {isPending && isPostOwner && (
                            <div className="my-1.5 p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-bold text-amber-800 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>En attente de validation</span>
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onApproveComment?.(activeCommentsPost.id, c.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                                >
                                  Approuver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRejectComment?.(activeCommentsPost.id, c.id)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] cursor-pointer"
                                >
                                  Rejeter
                                </button>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-slate-700 mt-1 font-normal leading-relaxed">{c.text}</p>

                          <div className="flex items-center gap-3 mt-1.5 pt-1 border-t border-slate-200/50">
                            <button
                              type="button"
                              onClick={() => handleStartReply(activeCommentsPost.id, c.id, c.id, c.authorName)}
                              className="text-[11px] font-bold text-[#4169E1] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <CornerDownRight className="w-3 h-3 text-[#4169E1]" />
                              <span>Répondre</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Réponses Imbriquées */}
                      {replies.length > 0 && (
                        <div className="ml-8 sm:ml-10 border-l-2 border-blue-200/70 pl-3 space-y-2 mt-1">
                          {replies.map((reply) => {
                            const isReplyPending = reply.status === 'pending';
                            return (
                              <div key={reply.id} className="flex items-start gap-2">
                                <img
                                  src={reply.authorAvatar}
                                  alt={reply.authorName}
                                  className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                                />
                                <div className="flex-1 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200/60">
                                  <div className="flex items-center justify-between flex-wrap gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[11px] font-black text-slate-900">{reply.authorName}</span>
                                      {reply.replyToAuthor && (
                                        <span className="text-[10px] font-bold text-[#4169E1] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                          @{reply.replyToAuthor}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">{reply.createdAt}</span>
                                  </div>

                                  {isReplyPending && isPostOwner && (
                                    <div className="my-1.5 p-1.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-[10px]">
                                      <span className="font-bold text-amber-800 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span>En attente</span>
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => onApproveComment?.(activeCommentsPost.id, reply.id)}
                                          className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                                        >
                                          Approuver
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onRejectComment?.(activeCommentsPost.id, reply.id)}
                                          className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-bold text-[10px] cursor-pointer"
                                        >
                                          Rejeter
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <p className="text-xs text-slate-700 mt-0.5 font-normal leading-relaxed">{reply.text}</p>

                                  <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-200/50">
                                    <button
                                      type="button"
                                      onClick={() => handleStartReply(activeCommentsPost.id, c.id, reply.id, reply.authorName)}
                                      className="text-[10px] font-bold text-[#4169E1] hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <CornerDownRight className="w-2.5 h-2.5 text-[#4169E1]" />
                                      <span>Répondre</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Saisie de commentaire */}
            <div className="p-3 border-t border-slate-100 bg-white shrink-0 space-y-2">
              {replyingToMap[activeCommentsPost.id] && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-[#4169E1]">
                  <div className="flex items-center gap-1.5 truncate">
                    <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                    <span>Réponse à <strong>{replyingToMap[activeCommentsPost.id]?.replyToAuthor}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelReply(activeCommentsPost.id)}
                    className="p-1 hover:bg-blue-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentInputs[activeCommentsPost.id] || ''}
                  onChange={(e) =>
                    setCommentInputs(prev => ({
                      ...prev,
                      [activeCommentsPost.id]: e.target.value
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitComment(activeCommentsPost.id);
                    }
                  }}
                  placeholder={
                    replyingToMap[activeCommentsPost.id]
                      ? `Répondre à ${replyingToMap[activeCommentsPost.id]?.replyToAuthor}...`
                      : 'Écrire un commentaire public...'
                  }
                  className="flex-1 px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 focus:border-[#4169E1] text-xs text-slate-900 font-medium focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSubmitComment(activeCommentsPost.id)}
                  className="px-4 py-2.5 rounded-full bg-[#4169E1] hover:bg-blue-700 active:scale-95 text-white text-xs font-black cursor-pointer shrink-0 transition shadow-md shadow-[#4169E1]/20 flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          PANNEAU DE MODÉRATION DES COMMENTAIRES (PROMPT 1)
          Accessible UNIQUEMENT au propriétaire du post
         =================================================================== */}
      {activeModerationPost && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#4169E1] text-white flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Paramètres de confidentialité</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Modération des commentaires</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModerationPost(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModerationSettings} className="p-5 space-y-4">
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Option de filtrage des commentaires :
                </label>

                {/* Option 1 : Tout afficher */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                    moderationFilterMode === 'all'
                      ? 'bg-blue-50/80 border-[#4169E1] text-slate-900 ring-1 ring-[#4169E1]'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="moderationMode"
                    value="all"
                    checked={moderationFilterMode === 'all'}
                    onChange={() => setModerationFilterMode('all')}
                    className="mt-1 text-[#4169E1] focus:ring-[#4169E1]"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black">Tout afficher</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Tous les commentaires sont publiés et visibles immédiatement par toute la communauté.
                    </div>
                  </div>
                </label>

                {/* Option 2 : Mots bloqués */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                    moderationFilterMode === 'blocked_words'
                      ? 'bg-blue-50/80 border-[#4169E1] text-slate-900 ring-1 ring-[#4169E1]'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="moderationMode"
                    value="blocked_words"
                    checked={moderationFilterMode === 'blocked_words'}
                    onChange={() => setModerationFilterMode('blocked_words')}
                    className="mt-1 text-[#4169E1] focus:ring-[#4169E1]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black">Mots bloqués</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Les commentaires contenant certains mots sensibles sont masqués et mis en attente d'approbation.
                    </div>

                    {moderationFilterMode === 'blocked_words' && (
                      <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <label className="text-[10px] font-bold text-slate-700 uppercase">
                          Mots interdits (séparés par des virgules) :
                        </label>
                        <input
                          type="text"
                          value={blockedWordsInput}
                          onChange={(e) => setBlockedWordsInput(e.target.value)}
                          placeholder="ex: arnaque, spam, faux, nul, voleur"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-[#4169E1] text-xs font-medium focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-400">
                          Séparez chaque mot ou expression par une virgule.
                        </p>
                      </div>
                    )}
                  </div>
                </label>

                {/* Option 3 : Approbation manuelle */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                    moderationFilterMode === 'manual_approval'
                      ? 'bg-blue-50/80 border-[#4169E1] text-slate-900 ring-1 ring-[#4169E1]'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="moderationMode"
                    value="manual_approval"
                    checked={moderationFilterMode === 'manual_approval'}
                    onChange={() => setModerationFilterMode('manual_approval')}
                    className="mt-1 text-[#4169E1] focus:ring-[#4169E1]"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black">Approbation manuelle</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Les commentaires restent cachés tant que vous ne les avez pas validés un par un.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModerationPost(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#4169E1] hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer transition active:scale-95"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          HUB D'ATTACHEMENTS : LA GRILLE DES MINI-APPS (PROMPT 49)
         =================================================================== */}
      <MiniAppsGridModal
        isOpen={isMiniAppsModalOpen}
        onClose={() => setIsMiniAppsModalOpen(false)}
        onSelectAction={(payload) => {
          updateAttachedMiniApp(payload);
          playCashChime();
        }}
        chatRecipientName={profile.name}
        chatRecipientHandle={profile.handle}
      />

      {/* ===================================================================
          3. FAB ROSACE FLOTTANT EN BAS : LE BOUTON MAGIQUE MOBILE-FIRST
          absolute bottom-6 left-1/2 -translate-x-1/2 z-50
         =================================================================== */}
      {!hideFloatingFab && (
        <FabRosace
          hidden={hideFloatingFab || isCreatePostModalOpen || isImageModalOpen || isBusinessIdeaModalOpen || isMiniAppsModalOpen}
          onSelectPostCreator={() => setIsCreatePostModalOpen(true)}
          onSelectImage={() => setIsCreatePostModalOpen(true)}
          onSelectBusinessIdea={() => setIsCreatePostModalOpen(true)}
          onSelectReel={() => onOpenAddStoryModal('video')}
          onSelectGuichet={() => (onOpenGuichet ? onOpenGuichet() : setIsMiniAppsModalOpen(true))}
        />
      )}

      {/* ===================================================================
          MODALE PRINCIPALE : CRÉER UNE PUBLICATION (AFFICHE & IDÉE)
         =================================================================== */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        currentUserId={profile.handle || profile.name || 'user_wameet'}
      />

      {/* ===================================================================
          MODALE 1 : PUBLIER UNE IMAGE / AFFICHE COMMERCIALE
         =================================================================== */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#4169E1]/10 text-[#4169E1] flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Publier une Image / Affiche</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Partagez votre visuel, promo ou infographie</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setComposerMediaType('image');
                handlePublishPost(e);
                setIsImageModalOpen(false);
              }}
              className="space-y-3.5"
            >
              {/* Sélecteur d'image / Acquisition directe & Carte de prévisualisation visuelle */}
              <div>
                <input
                  id="image-file-input-gallery"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setComposerMediaUrl(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
                <input
                  id="image-file-input-camera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setComposerMediaUrl(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />

                {!composerMediaUrl ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => document.getElementById('image-file-input-gallery')?.click()}
                      className="py-4 px-3 rounded-2xl border-2 border-dashed border-[#4169E1]/40 bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#4169E1] text-white flex items-center justify-center shadow-md shadow-[#4169E1]/30 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-[#4169E1]">Galerie Photos</span>
                      <span className="text-[10px] text-slate-500 font-medium">Choisir un visuel / affiche</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => document.getElementById('image-file-input-camera')?.click()}
                      className="py-4 px-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 hover:bg-slate-100 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <Camera className="w-5 h-5 text-slate-700" />
                      </div>
                      <span className="text-xs font-black text-slate-800">Prendre une Photo</span>
                      <span className="text-[10px] text-slate-500 font-medium">Capture instantanée</span>
                    </button>
                  </div>
                ) : (
                  /* Carte de prévisualisation visuelle épurée */
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center gap-3.5 shadow-xs">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shrink-0 shadow-inner">
                      <img
                        src={composerMediaUrl}
                        alt="Aperçu de l'affiche"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Affiche prête 🚀
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        Visuel optimisé pour le Feed Wameet
                      </p>
                      <button
                        type="button"
                        onClick={() => document.getElementById('image-file-input-gallery')?.click()}
                        className="text-[11px] font-bold text-[#4169E1] hover:underline cursor-pointer inline-flex items-center gap-1 pt-0.5"
                      >
                        Changer de visuel
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComposerMediaUrl('')}
                      className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Supprimer cette image"
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
                  value={composerMediaUrl.startsWith('data:') ? '' : composerMediaUrl}
                  onChange={(e) => setComposerMediaUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Texte de présentation / Légende :
                </label>
                <textarea
                  rows={3}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Décrivez votre offre, annonce ou affiche promotionnelle..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] text-xs font-medium text-slate-900 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#4169E1] hover:bg-[#3154b3] text-white text-xs font-black shadow-md shadow-[#4169E1]/30 cursor-pointer flex items-center gap-1.5 transition active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publier l'Affiche</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODALE 2 : PARTAGER UNE IDÉE BUSINESS / OPPORTUNITÉ
         =================================================================== */}
      {isBusinessIdeaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#4169E1]/10 text-[#4169E1] flex items-center justify-center">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Partager une Idée Business</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Proposez un concept, projet ou partenariat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBusinessIdeaModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setComposerMediaType(composerPollQuestion.trim() ? 'poll' : 'none');
                handlePublishPost(e);
                setIsBusinessIdeaModalOpen(false);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Votre proposition ou opportunité d'affaires :
                </label>
                <textarea
                  rows={4}
                  required
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Ex : Qui est partant pour lancer une centrale d'achat groupée pour l'énergie solaire ? Partageons nos idées..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] text-xs font-medium text-slate-900 focus:outline-none resize-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  📊 Sondage Express (Optionnel) :
                </label>
                <input
                  type="text"
                  value={composerPollQuestion}
                  onChange={(e) => setComposerPollQuestion(e.target.value)}
                  placeholder="Question du sondage (ex: Intéressé par le projet ?)"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-[#4169E1] text-xs font-medium"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={composerPollOpt1}
                    onChange={(e) => setComposerPollOpt1(e.target.value)}
                    placeholder="Option 1 (ex: Oui totalement 🔥)"
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-[#4169E1] text-xs"
                  />
                  <input
                    type="text"
                    value={composerPollOpt2}
                    onChange={(e) => setComposerPollOpt2(e.target.value)}
                    placeholder="Option 2 (ex: À étudier 🤔)"
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-[#4169E1] text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBusinessIdeaModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#4169E1] hover:bg-[#3154b3] text-white text-xs font-black shadow-md shadow-[#4169E1]/30 cursor-pointer flex items-center gap-1.5 transition active:scale-95"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Propulser l'Idée</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SocialFeedScreen;
