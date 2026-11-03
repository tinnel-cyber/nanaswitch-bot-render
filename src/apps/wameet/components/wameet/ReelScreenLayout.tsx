import React, { useState, useRef } from 'react';
import { TopNavOverlay, TopNavTab } from './TopNavOverlay';
import { ReelEngagementSidebar } from './ReelEngagementSidebar';
import { BottomNavOverlay, BottomNavTab } from './BottomNavOverlay';
import { UrgentChatPopup } from './UrgentChatPopup';
import { FullChatOverlay } from './FullChatOverlay';

export interface ReelScreenLayoutProps {
  /** Source de la vidéo ou élément vidéo React personnalisé */
  videoUrl?: string;
  videoPoster?: string;
  isMuted?: boolean;
  videoElement?: React.ReactNode;

  /** Données du créateur */
  authorAvatar: string;
  authorName?: string;
  authorHandle?: string;
  authorBadge?: string;
  isFollowing?: boolean;
  onToggleFollow?: (isFollowing: boolean) => void;
  onProfileClick?: () => void;

  /** Engagement métriques */
  likesCount?: number | string;
  isLiked?: boolean;
  onLike?: () => void;
  favoritesCount?: number | string;
  isFavorited?: boolean;
  onFavorite?: () => void;
  sharesCount?: number | string;
  onShare?: () => void;
  commentsCount?: number | string;
  onComment?: () => void;
  onChatWithCreator?: () => void;

  /** Contenu du Reel (Bas gauche) */
  title?: string;
  description?: string;
  hashtags?: string[];
  audioTrackName?: string;
  productCard?: React.ReactNode;
  isAIGenerated?: boolean;

  /** Navigation Haute (Prompt 1) */
  activeTab?: TopNavTab;
  onOpenCommunity?: () => void;
  onOpenLives?: () => void;
  onOpenFollowing?: () => void;
  onOpenSearch?: () => void;

  /** Navigation Basse (Prompt 3) */
  showBottomNav?: boolean;
  bottomNavTab?: BottomNavTab;
  onOpenHome?: () => void;
  onOpenDiscover?: () => void;
  onAddReel?: () => void;
  onOpenFriends?: () => void;
  onOpenChat?: () => void;
  unreadChatCount?: number;

  /** Contenu additionnel (ex: modales, search overlay) */
  children?: React.ReactNode;
  className?: string;
}

/**
 * PROMPT 1 & 2 : ReelScreenLayout
 * Layout complet plein écran pour les Reels Wameet
 * 
 * Directives UI/UX au millimètre :
 * - Layout de base : h-screen w-screen bg-black overflow-hidden relative
 * - La vidéo tourne en arrière-plan sans obstruction
 * - Navigation Haute Flottante (TopNavOverlay) : top-4 left-4 right-4 sans aucun fond
 * - Sidebar d'engagement (ReelEngagementSidebar) : bottom-28 right-4 sans aucun cadre
 * - Contenu bas-gauche : pseudo, titre, description, hashtags, et carte produit
 */
export const ReelScreenLayout: React.FC<ReelScreenLayoutProps> = ({
  videoUrl,
  videoPoster,
  isMuted = true,
  videoElement,
  authorAvatar,
  authorName = 'Créateur Wameet',
  authorHandle = '@createur',
  authorBadge,
  isFollowing,
  onToggleFollow,
  onProfileClick,
  likesCount = '348',
  isLiked,
  onLike,
  favoritesCount = '45K',
  isFavorited,
  onFavorite,
  onShare,
  commentsCount,
  onComment,
  onChatWithCreator,
  title,
  description,
  hashtags = [],
  audioTrackName,
  productCard,
  isAIGenerated = false,
  activeTab,
  onOpenCommunity,
  onOpenLives,
  onOpenFollowing,
  onOpenSearch,
  showBottomNav = true,
  bottomNavTab = 'home',
  onOpenHome,
  onOpenDiscover,
  onAddReel,
  onOpenFriends,
  onOpenChat,
  unreadChatCount,
  children,
  className = ''
}) => {
  // PROMPT 4 : Double Mode de Chat Flottant (Popup Urgent & Ouverture Totale)
  const [isUrgentPopupVisible, setIsUrgentPopupVisible] = useState(true);
  const [isFullChatOpen, setIsFullChatOpen] = useState(false);
  const chatLongPressTimer = useRef<any>(null);
  const isChatLongPress = useRef<boolean>(false);

  return (
    <div
      className={`h-screen w-screen bg-black overflow-hidden relative select-none ${className}`}
    >
      {/* =====================================================================
          1. LA VIDÉO TOURNE EN ARRIÈRE-PLAN (PLEIN ÉCRAN)
         ===================================================================== */}
      <div className="absolute inset-0 z-0 w-full h-full flex items-center justify-center bg-black">
        {videoElement ? (
          videoElement
        ) : videoUrl ? (
          <video
            src={videoUrl}
            poster={videoPoster}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center text-white/40">
            <span>Aucune vidéo</span>
          </div>
        )}
      </div>

      {/* Dégradé supérieur très léger pour lisibilité sans boîte ni fond visible */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent z-20" />

      {/* Dégradé inférieur naturel pour lisibilité des textes et titres */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/85 via-black/45 to-transparent z-10" />

      {/* =====================================================================
          2. PROMPT 1 : NAVIGATION HAUTE FLOTTANTE (TOPNAVOVERLAY - 100% SANS FOND)
         ===================================================================== */}
      <TopNavOverlay
        activeTab={activeTab}
        onOpenCommunity={onOpenCommunity}
        onOpenLives={onOpenLives}
        onOpenFollowing={onOpenFollowing}
        onOpenSearch={onOpenSearch}
      />

      {/* =====================================================================
          3. PROMPT 2 : SIDEBAR D'ENGAGEMENT SANS CADRES (À DROITE)
         ===================================================================== */}
      <ReelEngagementSidebar
        authorAvatar={authorAvatar}
        authorName={authorName}
        authorHandle={authorHandle}
        isFollowing={isFollowing}
        onToggleFollow={onToggleFollow}
        onProfileClick={onProfileClick}
        likesCount={likesCount}
        isLiked={isLiked}
        onLike={onLike}
        favoritesCount={favoritesCount}
        isFavorited={isFavorited}
        onFavorite={onFavorite}
        onShare={onShare}
        commentsCount={commentsCount}
        onComment={onComment}
        onChatWithCreator={onChatWithCreator}
      />

      {/* =====================================================================
          4. INFORMATIONS BAS-GAUCHE (CRÉATEUR, TITRE, PRODUIT)
         ===================================================================== */}
      <div
        className={`absolute left-4 right-20 z-20 flex flex-col gap-2 pointer-events-auto transition-all ${
          showBottomNav ? 'bottom-18' : 'bottom-8'
        }`}
      >
        {/* Carte Produit Shop si présente */}
        {productCard && <div className="mb-1">{productCard}</div>}

        {/* Avertissement Vidéo générée par IA */}
        {isAIGenerated && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 text-[10px] text-slate-300 font-medium">
            <span>✨</span>
            <span>Vidéo générée par IA</span>
          </div>
        )}

        {/* Pseudo du créateur & badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            onClick={onProfileClick}
            className="text-sm font-bold text-white drop-shadow-md cursor-pointer hover:underline"
          >
            {authorHandle}
          </span>
          {authorBadge && (
            <span className="px-2 py-0.5 rounded-full bg-blue-600/90 text-[10px] font-semibold text-white drop-shadow-md">
              {authorBadge}
            </span>
          )}
        </div>

        {/* Titre & Description */}
        {title && (
          <h2 className="text-sm font-bold text-white drop-shadow-md leading-tight line-clamp-2">
            {title}
          </h2>
        )}
        {description && (
          <p className="text-xs text-white/90 drop-shadow-md line-clamp-2 leading-snug">
            {description}
          </p>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {hashtags.map(tag => (
              <span
                key={tag}
                className="text-xs font-semibold text-blue-300 drop-shadow-md hover:underline cursor-pointer"
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}

        {/* Piste Audio */}
        {audioTrackName && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/80 drop-shadow-md pt-0.5">
            <span>🎵</span>
            <span className="truncate">{audioTrackName}</span>
          </div>
        )}
      </div>

      {/* =====================================================================
          5. PROMPT 3 & 4 : NAVIGATION BASSE & DOUBLE MODE DE CHAT FLOTTANT
         ===================================================================== */}
      {showBottomNav && (
        <>
          {/* Option 1 : Le Popup Urgent Aérien */}
          <UrgentChatPopup
            isOpen={isUrgentPopupVisible && !isFullChatOpen}
            onOpenFullChat={() => setIsFullChatOpen(true)}
            onClose={() => setIsUrgentPopupVisible(false)}
            className="bottom-14 left-4 z-50"
          />

          {/* Navigation Basse Flottante */}
          <BottomNavOverlay
            activeTab={bottomNavTab}
            onOpenHome={onOpenHome}
            onOpenDiscover={onOpenDiscover}
            onAddReel={onAddReel}
            onOpenFriends={onOpenFriends}
            onOpenChat={() => {
              onOpenChat?.();
              setIsFullChatOpen(true);
            }}
            onChatDoubleClick={() => setIsFullChatOpen(true)}
            onChatPointerDown={() => {
              isChatLongPress.current = false;
              chatLongPressTimer.current = setTimeout(() => {
                isChatLongPress.current = true;
                setIsFullChatOpen(true);
              }, 480);
            }}
            onChatPointerUp={() => {
              if (chatLongPressTimer.current) {
                clearTimeout(chatLongPressTimer.current);
                chatLongPressTimer.current = null;
              }
            }}
            unreadChatCount={unreadChatCount}
          />

          {/* Option 2 : L'Ouverture Totale du Chat en Plein Écran Flouté */}
          <FullChatOverlay
            isOpen={isFullChatOpen}
            onClose={() => setIsFullChatOpen(false)}
            creator={{
              name: authorName,
              handle: authorHandle,
              avatarUrl: authorAvatar,
              statusBadge: authorBadge,
              isOnline: true
            }}
            reelContextTitle={title}
          />
        </>
      )}

      {/* =====================================================================
          6. ENFANTS ADDITIONNELS (OVERLAYS, SEARCH, MODALES)
         ===================================================================== */}
      {children}
    </div>
  );
};

export default ReelScreenLayout;
