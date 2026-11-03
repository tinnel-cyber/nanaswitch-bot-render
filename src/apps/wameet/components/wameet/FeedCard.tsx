/**
 * @file FeedCard.tsx
 * @description Carte plein écran immersive pour le Feed Wameet (Prompt 2).
 * 
 * Spécifications :
 * - Défilement magnétique snap-start snap-always
 * - Rendu média avec fallback de classe mondiale (Dégradé Bleu Royal #4169E1 & Logo Wameet en filigrane)
 * - Superposition d'informations (Jauge d'Impact, description, tag catégorie)
 * - Détection native des gestes tactiles :
 *   - Swipe Gauche : Sauvegarde dans le coffre-fort privé
 *   - Swipe Droite : Ouverture de la demande Wameet (Salon Privé)
 * - Toasts holographiques dynamiques au swipe
 * - Charte : Bleu Royal (#4169E1), Blanc Pur (#FFFFFF), fonds sombres média (#0F172A, slate-950)
 * - Zéro marque tierce
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bookmark,
  MessageSquare,
  Heart,
  Share2,
  Send,
  Lightbulb,
  Volume2,
  VolumeX,
  Play,
  ArrowUpRight,
  ShoppingBag,
  ExternalLink,
  Lock,
  Tag,
  Eye,
  X,
  ArrowLeft,
  ArrowRight,
  Video
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { ResonateButton } from './ResonateButton';
import { VaultOfferButton, ProductOffer } from './VaultOfferButton';
import { WameetActionButton } from './WameetActionButton';
import { CentralLockButton } from './CentralLockButton';
import { WameetReelCheckoutDrawer } from './WameetReelCheckoutDrawer';
import { MediaDispatcher } from './media/MediaDispatcher';
import { FeatureErrorBoundary } from '../../../../components/FeatureErrorBoundary';
import { SynergyMatchModal } from './SynergyMatchModal';
import { SynergyMatchResult } from '../../../../services/resonanceService';
import { StealthYouTubePlayer, extractYouTubeVideoId } from '../../../../components/lms/video/StealthYouTubePlayer';
import ImmersiveReelItem from './ImmersiveReelItem';

export interface FeedPost {
  id: string;
  authorName: string;
  authorRole?: string;
  authorHandle?: string;
  authorAvatar?: string;
  authorBadge?: string;
  impactScore?: number;
  description: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  category?: string;
  likesCount?: number;
  commentsCount?: number;
  userReaction?: 'like' | 'love' | 'idea' | null;
  type?: 'PRODUCT_POST' | 'AD_POST' | 'IDEA_POST' | string;
  priceXOF?: number | null;
  shopUrl?: string | null;
  targetUrl?: string | null;
  actionButtonText?: string | null;
  sector?: string | null;
  contact?: string | null;
  [key: string]: any;
}

export interface FeedCardProps {
  post: FeedPost | any;
  currentUserId?: string;
  currentUserDiamonds?: number;
  onSaveToVault?: (postId: string) => void;
  onOpenWameetModal?: (authorId: string, authorName?: string) => void;
  onReaction?: (postId: string, type: 'like' | 'love' | 'idea') => void;
  onOpenComments?: (post: any) => void;
  onOpenWWithMember?: (member: { name: string; handle: string; avatarUrl: string }) => void;
  onBuyProductDirect?: (offer: any) => void;
  isSaved?: boolean;
  className?: string;
}

export const FeedCard: React.FC<FeedCardProps> = ({
  post,
  currentUserId = 'user_me',
  currentUserDiamonds = 18450,
  onSaveToVault,
  onOpenWameetModal,
  onReaction,
  onOpenComments,
  onOpenWWithMember,
  onBuyProductDirect,
  isSaved = false,
  className = ''
}) => {
  const [activeVisioRoomUrl, setActiveVisioRoomUrl] = useState<string | null>(null);
  const [visioTitle, setVisioTitle] = useState<string>('Salon VIP');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [hasMediaError, setHasMediaError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSynergyMatch, setActiveSynergyMatch] = useState<SynergyMatchResult | null>(null);
  const [localLiked, setLocalLiked] = useState(post.userReaction === 'like');
  const [likesCount, setLikesCount] = useState(post.likesCount || 12);
  const [selectedOfferForCheckout, setSelectedOfferForCheckout] = useState<ProductOffer | null>(null);

  const minSwipeDistance = 50;

  // Mode découverte des fonctions cachées (Appui long classique)
  const [isDiscoveryMode, setIsDiscoveryMode] = useState<boolean>(false);
  // Mode appui très prolongé pour le Cadenas Central VIP
  const [isVipLongPressActive, setIsVipLongPressActive] = useState<boolean>(false);
  const [vipLockTriggerCount, setVipLockTriggerCount] = useState<number>(0);

  // Timers et références pour les appuis
  const longPressTimerRef = useRef<any>(null);
  const vipPressTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const isVipTriggeredRef = useRef<boolean>(false);

  // Nettoyage des timers
  const clearPressTimers = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (vipPressTimerRef.current) {
      clearTimeout(vipPressTimerRef.current);
      vipPressTimerRef.current = null;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('a') || target.closest('input')) {
      setTouchStart(null);
      setTouchEnd(null);
      clearPressTimers();
      return;
    }

    const touch = e.targetTouches[0];
    setTouchEnd(null);
    setTouchStart(touch.clientX);
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressTriggeredRef.current = false;
    isVipTriggeredRef.current = false;

    clearPressTimers();

    // 1. Appui long standard (~500ms) : active les flèches bleuâtres et explications
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsDiscoveryMode(true);
      playTapBeep();
    }, 500);

    // 2. Appui très prolongé (~2800ms) : réservé UNIQUEMENT aux affiches/cartes de Guichet
    if (hasGuichetOffer) {
      vipPressTimerRef.current = setTimeout(() => {
        isVipTriggeredRef.current = true;
        setIsVipLongPressActive(true);
        playValidationBeep();
      }, 2800);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    setTouchEnd(currentX);

    // Si le doigt bouge de plus de 15px avant le déclenchement de l'appui long,
    // l'utilisateur est simplement en train de faire défiler la carte : rien ne doit se passer !
    if (touchStartPosRef.current) {
      const deltaX = Math.abs(currentX - touchStartPosRef.current.x);
      const deltaY = Math.abs(currentY - touchStartPosRef.current.y);

      if (!isLongPressTriggeredRef.current && (deltaX > 15 || deltaY > 15)) {
        clearPressTimers();
      }
    }
  };

  const onTouchEnd = () => {
    clearPressTimers();

    // RÈGLE : Si l'appui long n'a PAS été déclenché, un simple défilement ne fait RIEN !
    const wasDiscoveryActive = isLongPressTriggeredRef.current;
    const wasVipActive = isVipTriggeredRef.current;

    // Réinitialiser les états d'affichage
    setIsDiscoveryMode(false);
    setIsVipLongPressActive(false);

    // Si un appui très prolongé a été complété sur une carte contenant un guichet, on déclenche l'ouverture du RDV VIP
    if (wasVipActive && hasGuichetOffer) {
      setVipLockTriggerCount((prev) => prev + 1);
      setTouchStart(null);
      setTouchEnd(null);
      touchStartPosRef.current = null;
      return;
    }

    // Si l'utilisateur était en mode découverte (flèches actives) et a glissé vers une direction
    if (wasDiscoveryActive && touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
        playValidationBeep();
        triggerToast('⭐ Ajouté aux favoris');
        if (onSaveToVault) {
          onSaveToVault(post.id);
        }
      } else if (isRightSwipe) {
        playTapBeep();
        triggerToast('🤝 Ouverture de la demande Wameet...');
        if (onOpenWameetModal) {
          const creatorId = post.authorHandle || post.authorName || post.id;
          onOpenWameetModal(creatorId, post.authorName);
        }
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
    touchStartPosRef.current = null;
  };

  // Support pour la souris (Desktop / test clic maintenu)
  const onMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('a') || target.closest('input')) return;

    clearPressTimers();
    isLongPressTriggeredRef.current = false;
    isVipTriggeredRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsDiscoveryMode(true);
      playTapBeep();
    }, 500);

    if (hasGuichetOffer) {
      vipPressTimerRef.current = setTimeout(() => {
        isVipTriggeredRef.current = true;
        setIsVipLongPressActive(true);
        playValidationBeep();
      }, 2800);
    }
  };

  const onMouseUp = () => {
    clearPressTimers();
    if (isVipTriggeredRef.current && hasGuichetOffer) {
      setVipLockTriggerCount((prev) => prev + 1);
    }
    setIsDiscoveryMode(false);
    setIsVipLongPressActive(false);
  };

  const onMouseLeave = () => {
    clearPressTimers();
    setIsDiscoveryMode(false);
    setIsVipLongPressActive(false);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleToggleLike = () => {
    playTapBeep();
    const next = !localLiked;
    setLocalLiked(next);
    setLikesCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
    if (onReaction) {
      onReaction(post.id, 'like');
    }
  };

  // Normalisation des champs pour compatibilité totale
  const description = post.description || post.content || '';
  const authorRole = post.authorRole || post.authorBadge || 'Membre Wameet';
  const impactScore = post.impactScore || 18450;
  const category = post.category || 'Business';

  // Condition stricte : Le cadenas des guichets ne s'active QUE sur les cartes contenant une offre/affiche de Guichet
  const hasGuichetOffer = Boolean(
    post.hasGuichet === true ||
    post.isGuichet === true ||
    post.type === 'GUICHET_POST' ||
    post.guichetUrl ||
    (post.vipOfferTitle && post.vipOfferTitle.trim().length > 0) ||
    /guichet|mentorat|consultation|rdv|formation vip|masterclass|expert coach|b2b/i.test(post.title || '') ||
    /guichet|mentorat|consultation vip|rdv vip|rendez-vous/i.test(post.content || '') ||
    /guichet|mentorat|consultation vip|rdv vip|rendez-vous/i.test(post.description || '')
  );

  const [isMuted, setIsMuted] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isTextDetached, setIsTextDetached] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Résolution universelle de la source vidéo ou média
  const mediaSrc = post.videoUrl || post.mediaUrl || '';

  // Détection format YouTube
  const isYouTube = Boolean(extractYouTubeVideoId(mediaSrc));

  // Détection format vidéo direct (MP4/WebM/MOV, S3, Firebase Storage, Google Bucket ou blob)
  const isVideo = !isYouTube && Boolean(
    post.mediaType === 'video' ||
    (mediaSrc && (
      mediaSrc.endsWith('.mp4') ||
      mediaSrc.endsWith('.webm') ||
      mediaSrc.endsWith('.mov') ||
      mediaSrc.includes('.mp4?') ||
      mediaSrc.includes('/videos/') ||
      mediaSrc.includes('reel-') ||
      mediaSrc.includes('amazonaws.com/videos/') ||
      mediaSrc.includes('wameet_reels') ||
      mediaSrc.includes('w3schools.com') ||
      mediaSrc.includes('zencdn.net') ||
      mediaSrc.includes('gtv-videos-bucket') ||
      mediaSrc.includes('/sample/') ||
      mediaSrc.includes('blob:')
    ))
  );

  // Moteur d'Autoplay / Pause intelligent via IntersectionObserver dès que la carte entre dans l'écran
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            setIsInView(true);
          } else {
            setIsInView(false);
            setIsUserPaused(false); // Réinitialise l'état pour reprendre au prochain scroll
          }
        });
      },
      { threshold: [0, 0.35, 0.7] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Tap sur la carte pour basculer lecture / pause
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('input')) return;

    if (isVideo) {
      playTapBeep();
      setIsUserPaused((prev) => !prev);
    }
  };

  const fallbackPoster = post.thumbnailUrl || post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80';
  const videoPoster = post.thumbnailUrl && post.thumbnailUrl !== post.authorAvatar ? post.thumbnailUrl : undefined;

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      className={`h-[68dvh] min-h-[440px] max-h-[620px] w-full rounded-3xl border border-white/10 relative flex flex-col justify-end overflow-hidden bg-slate-900 shadow-xl select-none cursor-pointer touch-pan-y ${className}`}
      role="article"
      aria-label={`Publication par ${post.authorName}`}
    >
      {/* ============================================================== */}
      {/* 1. RENDU MÉDIA EN ARRIÈRE-PLAN (CALQUE PRINCIPAL ABSOLUTE Z-0)  */}
      {/* ============================================================== */}
      {!hasMediaError && mediaSrc ? (
        isYouTube ? (
          <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-black">
            <StealthYouTubePlayer
              videoUrl={mediaSrc}
              title={description}
              autoPlay={isInView}
              hideBranding={true}
            />
          </div>
        ) : isVideo ? (
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
            <ImmersiveReelItem
              videoUrl={mediaSrc}
              posterUrl={videoPoster || fallbackPoster}
              isActive={isInView && !isUserPaused}
              isMuted={isMuted}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black flex items-center justify-center">
            <img
              src={mediaSrc}
              alt={description}
              onError={() => setHasMediaError(true)}
              className="w-full h-full object-cover pointer-events-none"
            />
            {/* Si c'est une image / affiche promotionnelle, badge élégant */}
            {(post.mediaType === 'image' || post.type === 'AD_POST') && (
              <div className="absolute top-16 left-3.5 z-20 px-2.5 py-0.5 rounded-full bg-amber-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Affiche Wameet</span>
              </div>
            )}
          </div>
        )
      ) : (
        <img
          src={fallbackPoster}
          alt={description}
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none brightness-90"
        />
      )}

      {/* Bouton Play discret si la vidéo est mise en pause manuellement */}
      {isVideo && !hasMediaError && isUserPaused && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20">
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg animate-in zoom-in-75 duration-150">
            <Play className="w-7 h-7 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Bouton Mute/Unmute Son en haut à droite */}
      {isVideo && !hasMediaError && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playTapBeep();
            setIsMuted((prev) => !prev);
          }}
          className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg"
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-white/80" /> : <Volume2 className="w-4 h-4 text-[#4169E1]" />}
        </button>
      )}

      {/* ============================================================== */}
      {/* 2. DÉGRADÉS D'OMBRE IMMERSIFS (HAUT & BAS - Z-10)               */}
      {/* ============================================================== */}
      <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/60 via-black/20 to-transparent z-10 pointer-events-none" />
      <div className={`absolute bottom-0 inset-x-0 h-72 bg-gradient-to-t from-black/95 via-black/55 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${isTextDetached ? 'opacity-20' : 'opacity-100'}`} />

      {/* ============================================================== */}
      {/* 3. BARRE LATÉRALE D'ACTIONS COMMERCIALES & SOCIALES (EXCLUSIF SOCIAL FEED) */}
      {/* ============================================================== */}
      <div className="absolute right-3 bottom-6 z-20 flex flex-col items-center gap-3">
        {/* 1. Moteur de Résonance Wameet (Onde & Étincelle) */}
        <ResonateButton
          postId={post.id}
          receiverId={post.creatorId || post.authorHandle || post.authorName || post.id}
          receiverName={post.authorName}
          initialCount={post.resonanceCount || post.likesCount || post.ideasCount || 12}
          onMatchDetected={(match) => setActiveSynergyMatch(match)}
        />

        {/* 2. Bouton 2 : Le Petit Coffre Noir / Catalogue Nanasore POS (Offre Produit) */}
        <VaultOfferButton
          reelId={post.id}
          productId={post.productId || (post.type === 'PRODUCT_POST' ? post.id : undefined)}
          creatorShopDomain={post.shopUrl ? post.shopUrl.replace('https://', '').replace('http://', '').split('/')[0] : 'boutique.nsore.shop'}
          initialOffer={{
            id: post.productId || post.id,
            title: post.title || (post.type === 'PRODUCT_POST' ? 'Article E-Shop Nanasore' : post.type === 'AD_POST' ? 'Offre Sponsorisée Wameet' : `Proposition • ${post.authorName}`),
            priceXOF: post.priceXOF || (post.type === 'PRODUCT_POST' ? 18500 : 5000),
            imageUrl: post.mediaUrl || post.imageUrl || post.thumbnailUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
            description: post.content || post.description || 'Article officiel vérifié disponible au tarif spécial Wameet.',
            shopUrl: post.shopUrl || 'https://nanasore.com',
            inStock: true
          }}
          onBuyDirect={(offer) => {
            setSelectedOfferForCheckout(offer);
            if (onBuyProductDirect) {
              onBuyProductDirect(offer);
            }
          }}
        />

        {/* 3. Bouton 4 : Le Bouton Vert Wameet (🚀 / 💬) Messagerie Privée & Profil Commercial */}
        <WameetActionButton
          reelId={post.id}
          reelTitle={post.title || post.content || 'Publication Wameet'}
          reelThumbnailUrl={post.mediaUrl || post.thumbnailUrl}
          creatorId={post.creatorId || post.authorHandle || post.authorName || 'creator_wameet'}
          creatorName={post.authorName}
          creatorAvatarUrl={post.authorAvatar}
          currentUserId={currentUserId || 'user_me'}
          onOpenChat={onOpenWWithMember ? () => {
            onOpenWWithMember({
              name: post.authorName,
              handle: post.authorHandle || post.authorName,
              avatarUrl: post.authorAvatar || ''
            });
          } : undefined}
        />

        {/* 4. Commentaires */}
        {onOpenComments && (
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenComments(post);
            }}
            className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition-transform"
            aria-label="Commentaires"
          >
            <div className="w-11 h-11 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center shadow-lg transition-colors">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow-md">
              {(post.comments || []).length || post.commentCount || post.commentsCount || 0}
            </span>
          </button>
        )}

        {/* 5. Sauvegarder dans les favoris */}
        <button
          type="button"
          onClick={() => {
            playValidationBeep();
            triggerToast('⭐ Ajouté aux favoris');
            if (onSaveToVault) onSaveToVault(post.id);
          }}
          className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition-transform"
          aria-label="Favoris"
        >
          <div className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center shadow-lg transition-colors ${
            isSaved ? 'bg-white/20 border-white/40 text-amber-300' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
          }`}>
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-amber-300 text-amber-300' : ''}`} />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow-md">Favoris</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 4. OVERLAY CONTENU PRINCIPAL EN BAS (Z-20)                     */}
      {/* ============================================================== */}
      {isTextDetached ? (
        <div className="relative z-20 p-4 pb-5 flex items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playTapBeep();
              setIsTextDetached(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold shadow-lg transition active:scale-95 cursor-pointer"
            title="Afficher les informations"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Afficher les détails</span>
          </button>
        </div>
      ) : (
        <div className="relative z-20 p-5 pb-6 flex flex-col gap-2.5 text-white max-w-[80%]">
          {/* Auteur + Jauge d'Impact + Bouton Croix pour détacher */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full border-2 border-[#4169E1] p-0.5 bg-slate-900 shadow-[0_0_15px_rgba(65,105,225,0.5)] shrink-0">
                {post.authorAvatar ? (
                  <img
                    src={post.authorAvatar}
                    alt={post.authorName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm text-white">
                    {post.authorName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-base text-white drop-shadow-sm truncate">
                    {post.authorName}
                  </h4>
                  <span className="backdrop-blur-md bg-white/10 border border-white/20 text-blue-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    💎 {impactScore.toLocaleString('fr-FR')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium truncate">{authorRole}</p>
              </div>
            </div>

            {/* Bouton Croix pour détacher le texte et voir le média en plein écran */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playTapBeep();
                setIsTextDetached(true);
              }}
              className="shrink-0 w-7 h-7 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-md"
              title="Détacher le texte pour voir l'image/vidéo"
              aria-label="Masquer les informations"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Format Spécifique : Badge & Titre */}
          {post.type === 'PRODUCT_POST' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-black uppercase">
                📦 Affiche Produit
              </span>
              {post.priceXOF && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black">
                  💰 {Number(post.priceXOF).toLocaleString('fr-FR')} FCFA
                </span>
              )}
            </div>
          )}

          {post.type === 'AD_POST' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400 text-indigo-300 text-[10px] font-black uppercase">
                📢 Publicité Sponsorisée
              </span>
            </div>
          )}

          {post.type === 'IDEA_POST' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[10px] font-black uppercase">
                💡 Idée & Statut
              </span>
              {post.sector && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold">
                  🏷️ {post.sector}
                </span>
              )}
            </div>
          )}

          {/* Titre si présent */}
          {post.title && post.title !== description && (
            <h3 className="text-sm font-black text-white leading-tight drop-shadow-sm">
              {post.title}
            </h3>
          )}

          {/* Description de l'idée / opportunité */}
          <p className="text-xs sm:text-sm text-slate-100 font-normal leading-relaxed line-clamp-3 drop-shadow-sm">
            {description}
          </p>

          {/* Actions Rapides contextuelles au format */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {/* Action Affiche Produit : Boutique Nanasore */}
            {post.shopUrl && (
              <a
                href={post.shopUrl.startsWith('http') ? post.shopUrl : `https://${post.shopUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-400/40 px-2.5 py-1 rounded-xl hover:bg-amber-900/80 transition"
              >
                <ShoppingBag className="w-3 h-3 text-amber-400" />
                <span>Boutique Nanasore</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            )}

            {/* Action Pub : CTA Button */}
            {post.targetUrl && (
              <a
                href={post.targetUrl.startsWith('http') ? post.targetUrl : `https://${post.targetUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-blue-600 hover:bg-blue-500 border border-blue-400 px-3 py-1 rounded-xl shadow-lg transition active:scale-95"
              >
                <span>{post.actionButtonText || 'En savoir plus'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Action Contact Idée */}
            {post.contact && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-400/40 px-2.5 py-1 rounded-xl">
                📞 {post.contact}
              </span>
            )}
          </div>

          {/* Tags & Guide de Geste */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="backdrop-blur-md bg-white/10 border border-white/20 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              #{category}
            </span>
            <span className="text-[10px] text-slate-400 italic">↔️ Glissez pour interagir</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4.5. GUIDE HOLOGRAPHIQUE DES FONCTIONS CACHÉES (APPUI LONG)   */}
      {/* Flèches brillantes bleuâtres placées HAUT sur la vidéo        */}
      {/* ============================================================== */}
      {isDiscoveryMode && !isVipLongPressActive && (
        <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-start pt-16 sm:pt-20 px-4 sm:px-6 animate-in fade-in zoom-in-95 duration-200 bg-slate-950/60 backdrop-blur-[3px]">
          {/* Haut : Indicateur d'aide gestuelle */}
          <div className="self-center px-4 py-1.5 rounded-full bg-blue-950/90 border border-cyan-400/80 shadow-[0_0_25px_rgba(34,211,238,0.7)] backdrop-blur-md animate-pulse mb-6 sm:mb-8">
            <span className="text-xs font-black text-cyan-200 tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
              <span>Glissez votre doigt vers la gauche ou la droite</span>
            </span>
          </div>

          {/* Centre-Haut : Flèches brillantes bleuâtres DÉPLACÉES EN HAUT pour ne pas être couvertes */}
          <div className="flex items-start justify-between w-full px-1 gap-3">
            {/* Flèche Droite (Glisser vers la droite ➡️ : Demande Wameet / Discussion) */}
            <div className="flex flex-col items-start gap-1.5 max-w-[48%] animate-in slide-in-from-left duration-250">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-600/50 border-2 border-cyan-300 flex items-center justify-center text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.9)] animate-pulse shrink-0">
                  <ArrowRight className="w-6 h-6 stroke-[3]" />
                </div>
                <span className="text-xs sm:text-sm font-black uppercase text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]">
                  Vers la droite ➡️
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-white leading-tight bg-slate-900/95 px-3 py-2 rounded-xl border border-cyan-400/50 shadow-2xl backdrop-blur-md">
                Ouvre directement la demande Wameet & la discussion privée avec {post.authorName}.
              </p>
            </div>

            {/* Flèche Gauche (Glisser vers la gauche ⬅️ : Favoris / Coffre-fort) */}
            <div className="flex flex-col items-end text-right gap-1.5 max-w-[48%] animate-in slide-in-from-right duration-250">
              <div className="flex items-center gap-2 flex-row-reverse">
                <div className="w-12 h-12 rounded-full bg-blue-600/50 border-2 border-cyan-300 flex items-center justify-center text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.9)] animate-pulse shrink-0">
                  <ArrowLeft className="w-6 h-6 stroke-[3]" />
                </div>
                <span className="text-xs sm:text-sm font-black uppercase text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]">
                  ⬅️ Vers la gauche
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-white leading-tight bg-slate-900/95 px-3 py-2 rounded-xl border border-cyan-400/50 shadow-2xl backdrop-blur-md">
                Sauvegarde instantanément cette vidéo dans votre coffre de favoris.
              </p>
            </div>
          </div>

          {/* Rappel appui très prolongé (uniquement si affiche/carte de Guichet) */}
          {hasGuichetOffer && (
            <div className="self-center text-center mt-8">
              <span className="text-[11px] font-extrabold text-amber-300 bg-amber-950/80 px-4 py-1.5 rounded-full border border-amber-400/50 shadow-lg backdrop-blur-md flex items-center gap-1.5">
                <span>🔒 Maintenez 3 secondes pour ouvrir le Guichet VIP</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4.6. MODE APPUI TRÈS PROLONGÉ : CADENAS & SALON VIP            */}
      {/* Réservé EXCLUSIVEMENT aux cartes d'affiche de Guichet          */}
      {/* ============================================================== */}
      {hasGuichetOffer && isVipLongPressActive && (
        <div className="absolute inset-0 z-35 pointer-events-none flex flex-col justify-end p-5 pb-8 animate-in fade-in duration-200 bg-slate-950/70 backdrop-blur-xs">
          <div className="mx-auto w-full max-w-sm rounded-2xl bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-amber-950/90 border-2 border-amber-400/80 p-3.5 text-center shadow-[0_0_35px_rgba(245,158,11,0.5)] flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-300 animate-bounce shadow-lg">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                👑 Cadenas Guichet • Consultation 1-on-1
              </h4>
              <p className="text-[11px] font-semibold text-white/95 mt-0.5 leading-snug">
                Relâchez votre doigt pour déverrouiller une consultation vidéo privée avec {post.authorName}.
              </p>
            </div>
            <span className="text-[9.5px] font-bold text-amber-400 bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-400/40">
              🔓 Relâchez maintenant pour ouvrir le guichet
            </span>
          </div>
        </div>
      )}

      {/* Instance Invisible du CentralLockButton connectée à l'appui très prolongé (uniquement si affiche de Guichet) */}
      {hasGuichetOffer && (
        <CentralLockButton
          reelId={post.id}
          creatorId={post.creatorId || post.authorHandle || post.authorName || 'creator_wameet'}
          creatorName={post.authorName}
          currentUserId={currentUserId || 'user_me'}
          userDiamonds={currentUserDiamonds || 18450}
          offer={{
            title: post.vipOfferTitle || `Consultation Guichet avec ${post.authorName}`,
            priceXOF: post.vipPriceXOF || (post.priceXOF ? Math.round(Number(post.priceXOF) * 0.25) : 5000),
            priceDiamonds: post.vipPriceDiamonds || 500,
            durationMinutes: post.vipDurationMinutes || 15,
            type: 'APPOINTMENT'
          }}
          onLaunchVipSession={(roomUrl) => {
            playValidationBeep();
            setVisioTitle(`Guichet VIP avec ${post.authorName}`);
            setActiveVisioRoomUrl(roomUrl);
          }}
          openModalTrigger={vipLockTriggerCount}
          hideDefaultButton={true}
        />
      )}

      {/* Dispatcher Visio Instantané si Cadenas VIP ou Consultation déverrouillé */}
      {activeVisioRoomUrl && (
        <FeatureErrorBoundary featureName="Visio Instantanée">
          <MediaDispatcher
            session_type="instant_match"
            roomUrl={activeVisioRoomUrl}
            title={visioTitle}
            onLeave={() => setActiveVisioRoomUrl(null)}
          />
        </FeatureErrorBoundary>
      )}

      {/* ============================================================== */}
      {/* 5. TOAST DYNAMIQUE AU SWIPE (AU CENTRE DE L'ÉCRAN)             */}
      {/* ============================================================== */}
      {toastMessage && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 backdrop-blur-xl bg-slate-900/90 border border-[#4169E1] text-white px-6 py-4 rounded-3xl shadow-[0_10px_40px_rgba(65,105,225,0.4)] animate-in fade-in flex items-center gap-3 select-none">
          <Sparkles className="w-5 h-5 text-[#4169E1] animate-spin shrink-0" />
          <span className="font-bold text-sm tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MODALE DE CÉLÉBRATION DU MATCH SYNERGIQUE                   */}
      {/* ============================================================== */}
      <SynergyMatchModal
        isOpen={Boolean(activeSynergyMatch)}
        onClose={() => setActiveSynergyMatch(null)}
        match={activeSynergyMatch}
        creatorName={post.authorName}
        creatorAvatar={post.authorAvatar}
      />

      {/* ============================================================== */}
      {/* 7. TIROIR PAIEMENT ZERO-FRICTION POUR L'OFFRE DU COFFRE        */}
      {/* ============================================================== */}
      {selectedOfferForCheckout && (
        <WameetReelCheckoutDrawer
          isOpen={Boolean(selectedOfferForCheckout)}
          product={{
            id: selectedOfferForCheckout.id,
            name: selectedOfferForCheckout.title,
            priceFcfa: selectedOfferForCheckout.priceXOF,
            imageUrl: selectedOfferForCheckout.imageUrl || post.mediaUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
            sellerName: post.authorName,
            sellerHandle: post.authorHandle
          }}
          creator={{
            name: post.authorName,
            handle: post.authorHandle || post.authorName,
            avatarUrl: post.authorAvatar || ''
          }}
          currentUserProfile={{
            name: 'Moi',
            handle: currentUserId,
            avatarUrl: ''
          }}
          onClose={() => setSelectedOfferForCheckout(null)}
          onOrderSuccess={(order) => {
            playValidationBeep();
            triggerToast(`🎉 Commande confirmée pour ${selectedOfferForCheckout.title} !`);
            setSelectedOfferForCheckout(null);
          }}
        />
      )}
    </div>
  );
};

export default FeedCard;
