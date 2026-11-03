import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  X,
  Maximize2,
  ChevronDown,
  Sparkles,
  Heart,
  Share2,
  ShoppingBag,
  Users,
  Radio,
  Flame,
  MessageCircle,
  Zap
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { NanasoreLiveCommerceOverlay } from '../../../../components/live/NanasoreLiveCommerceOverlay';
import { WameetLiveChatOverlay } from './WameetLiveChatOverlay';
import { RelayShareButton } from './RelayShareButton';
import { CommissionToast } from './CommissionToast';
import { ScreenRecordButton } from './ScreenRecordButton';
import { useMicroRelay } from '../../../../hooks/useMicroRelay';

export interface WameetLiveWrapperProps {
  provider?: 'YOUTUBE' | 'JITSI';
  jitsiRoomName?: string;
  jitsiDomain?: string;
  youtubeUrl?: string;
  videoId?: string;
  title?: string;
  creatorName?: string;
  creatorHandle?: string;
  creatorAvatar?: string;
  viewersCount?: number;
  isOpen?: boolean;
  initialMinimized?: boolean;
  liveEventId?: string;
  isFallback?: boolean;
  failoverReason?: string | null;
  onClose?: () => void;
  onMinimizeChange?: (isMinimized: boolean) => void;
  className?: string;
}

// ─── Extraction de l'ID YouTube (URLs standards, Shorts, Live streams & embeds) ─────
export function extractYouTubeId(input: string): string {
  if (!input || typeof input !== 'string') return 'jfKfPfyJRdk'; // Fallback live stream haute disponibilité
  const cleaned = input.trim();

  // 1. Déjà un ID de 11 caractères
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return cleaned;
  }

  // 2. Code Iframe
  const iframeMatch = cleaned.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i);
  const target = iframeMatch ? iframeMatch[1] : cleaned;

  // 3. Regex universelle YouTube (live, shorts, embed, watch, youtu.be)
  const pattern = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/|e\/))([a-zA-Z0-9_-]{11})/;
  const match = target.match(pattern);
  if (match && match[1]) {
    return match[1];
  }

  const vParam = target.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vParam && vParam[1]) {
    return vParam[1];
  }

  return 'jfKfPfyJRdk';
}

export const WameetLiveWrapper: React.FC<WameetLiveWrapperProps> = ({
  provider = 'YOUTUBE',
  jitsiRoomName,
  jitsiDomain = 'meet.jit.si',
  youtubeUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  videoId,
  title = 'Direct Live Shopping & Démo Exclusive Wameet 🔥',
  creatorName = 'Salif Tech & Gadgets',
  creatorHandle = '@salif.tech.ci',
  creatorAvatar = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  viewersCount = 1420,
  isOpen = true,
  initialMinimized = false,
  liveEventId = 'wameet-live-session-1',
  isFallback = false,
  failoverReason = null,
  onClose,
  onMinimizeChange,
  className = ''
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(initialMinimized);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [likesCount, setLikesCount] = useState<number>(384);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(true);
  const [floatingHearts, setFloatingHearts] = useState<{ id: string; left: number }[]>([]);

  const touchStartY = useRef<number | null>(null);

  // Système Micro-Relais d'affiliation Wameet (Prompt 14)
  const { commissionToast, closeToast } = useMicroRelay({
    liveId: liveEventId
  });

  // Résolution de l'ID YouTube
  const resolvedVideoId = videoId || extractYouTubeId(youtubeUrl);

  // URL YouTube avec paramètres stricts pour hack overscan
  const embedUrl = `https://www.youtube-nocookie.com/embed/${resolvedVideoId}?controls=0&modestbranding=1&rel=0&showinfo=0&fs=0&disablekb=1&playsinline=1&autoplay=1&mute=${isMuted ? 1 : 0}&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : 'http://localhost'}`;

  // URL Jitsi Meet Failover avec optimisation HD
  const cleanJitsiDomain = (jitsiDomain || 'meet.jit.si').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const cleanJitsiRoom = jitsiRoomName || `wameet_live_${liveEventId || 'stream'}`;
  const jitsiEmbedUrl = `https://${cleanJitsiDomain}/${cleanJitsiRoom}#userInfo.displayName="${encodeURIComponent(creatorName)}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=${isMuted ? 'true' : 'false'}&config.disableDeepLinking=true&config.toolbarButtons=["microphone","camera","fullscreen"]`;

  // Notification du changement d'état minimisé
  const handleToggleMinimize = useCallback((nextState: boolean) => {
    playTapBeep();
    setIsMinimized(nextState);
    if (onMinimizeChange) {
      onMinimizeChange(nextState);
    }
  }, [onMinimizeChange]);

  // Cacher l'indice de swipe après 4 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // Détection du geste Swipe-to-Minimize sur le Glass Shield (Touch & Pointer)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    // Si glissement vers le bas > 80px, on minimise en mode 60 FPS
    if (deltaY > 80 && !isMinimized) {
      handleToggleMinimize(true);
    }
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    setLikesCount(prev => prev + 1);
    setIsLiked(true);

    const newHeart = {
      id: `heart-${Date.now()}-${Math.random()}`,
      left: Math.floor(Math.random() * 50) + 25
    };
    setFloatingHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 2000);
  };

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    setIsMuted(prev => !prev);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        layout
        role="region"
        aria-label="Lecteur Live Wameet Ultra-Premium"
        // ─── Animations Framer Motion 60 FPS Fluides (Spring Physics) ────────
        initial={false}
        animate={
          isMinimized
            ? {
                width: 120,
                height: 200,
                borderRadius: 12,
                bottom: 80,
                right: 20,
                top: 'auto',
                left: 'auto',
                scale: 1,
                opacity: 1
              }
            : {
                width: '100vw',
                height: '100vh',
                borderRadius: 0,
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                scale: 1,
                opacity: 1
              }
        }
        transition={{
          type: 'spring',
          damping: 28,
          stiffness: 300,
          mass: 0.8
        }}
        // Geste natif de Drag vers le bas en mode plein écran
        drag={isMinimized ? false : 'y'}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (!isMinimized && (info.offset.y > 90 || info.velocity.y > 280)) {
            handleToggleMinimize(true);
          }
        }}
        className={`fixed z-50 overflow-hidden bg-black select-none transform-gpu will-change-transform ${
          isMinimized
            ? 'shadow-[0_20px_50px_rgba(0,0,0,0.9)] ring-2 ring-blue-500/60 cursor-pointer hover:ring-blue-400 group'
            : 'shadow-2xl'
        } ${className}`}
        style={{
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased'
        }}
        onClick={() => {
          if (isMinimized) {
            handleToggleMinimize(false);
          }
        }}
      >
        {/* ================================================================= */}
        {/* 1. LECTEUR VIDÉO IMMERSIF : YOUTUBE (OVERSCAN) vs JITSI MEET HD   */}
        {/* ================================================================= */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none">
          {provider === 'JITSI' ? (
            <iframe
              key={`wameet-jitsi-${cleanJitsiRoom}-${isMuted}`}
              src={jitsiEmbedUrl}
              title="Wameet Live HD"
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto border-0 select-none ${
                isMinimized
                  ? 'w-[280px] h-[360px] max-w-none'
                  : 'w-[100vw] h-[100vh] max-w-none'
              }`}
              allow="camera; microphone; display-capture; autoplay; clipboard-run; fullscreen"
              allowFullScreen
            />
          ) : (
            <iframe
              key={`wameet-yt-${resolvedVideoId}-${isMuted}`}
              src={embedUrl}
              title="Wameet YouTube Live"
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none border-0 select-none ${
                isMinimized
                  ? 'w-[280px] h-[360px] max-w-none'
                  : 'w-[130vw] h-[130vh] max-w-none'
              }`}
              style={{
                pointerEvents: 'none'
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        {/* ================================================================= */}
        {/* 2. LE BOUCLIER TACTILE (GLASS SHIELD) : z-index 10                */}
        {/* Intercepte les clics pour éviter d'interagir avec YouTube         */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 z-10 select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={e => {
            // En plein écran, un clic sur le bouclier neutre n'a pas d'effet indésirable
            if (isMinimized) {
              handleToggleMinimize(false);
            }
          }}
        >
          {/* Gradients sombres pour la lisibilité supérieure et inférieure */}
          {!isMinimized && (
            <>
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
            </>
          )}

          {/* =============================================================== */}
          {/* VUE MINI-PLAYER RÉDUITE (120px x 200px)                         */}
          {/* =============================================================== */}
          {isMinimized ? (
            <div className="relative w-full h-full p-2 flex flex-col justify-between pointer-events-auto">
              {/* Badge LIVE & Bouton Fermer */}
              <div className="flex items-center justify-between gap-1">
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                  <span>LIVE</span>
                </span>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white transition cursor-pointer"
                  title="Fermer le direct"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Bouton pour Agrandir au Centre / Fond */}
              <div className="flex flex-col items-center justify-center text-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg p-1 backdrop-blur-xs">
                <Maximize2 className="w-4 h-4 text-white drop-shadow mb-0.5" />
                <span className="text-[9px] font-extrabold text-white leading-tight">
                  Agrandir
                </span>
              </div>

              {/* Bandeau inférieur mini-player */}
              <div className="bg-black/70 backdrop-blur-md rounded-lg p-1 text-center">
                <span className="text-[9px] font-black text-amber-300 block truncate">
                  Shopping Direct
                </span>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* VUE PLEIN ÉCRAN WAMEET (100vw x 100vh)                          */
            /* =============================================================== */
            <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-6 pointer-events-auto">
              
              {/* Notification Jubilatoire Cha-ching (Prompt 14) */}
              <CommissionToast
                isOpen={commissionToast.isOpen}
                amount={commissionToast.amount}
                currency={commissionToast.currency}
                buyerName={commissionToast.buyerName}
                productName={commissionToast.productName}
                onClose={closeToast}
              />

              {/* ─── A. EN-TÊTE SUPÉRIEUR DU LIVE (WAMEET HUD) ──────────────── */}
              <header className="flex flex-col gap-2 z-20">
                {/* Poignée tactile de réduction (Swipe Indicator) */}
                <div
                  onClick={() => handleToggleMinimize(true)}
                  className="w-full flex flex-col items-center justify-center cursor-pointer py-1 group/pull"
                  title="Glisser vers le bas pour réduire"
                >
                  <div className="w-12 h-1.5 rounded-full bg-white/40 group-hover/pull:bg-white/80 transition" />
                  {showSwipeHint && (
                    <motion.span
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-white/80 font-black tracking-wide mt-1 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md"
                    >
                      ⬇️ Glissez vers le bas pour réduire
                    </motion.span>
                  )}
                </div>

                {/* Barre principale : Profil créateur, Spectateurs & Actions rapides */}
                <div className="flex items-center justify-between gap-3">
                  {/* Profil Créateur */}
                  <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/15">
                    <img
                      src={creatorAvatar}
                      alt={creatorName}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500"
                    />
                    <div className="leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{creatorName}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>LIVE {provider === 'JITSI' ? 'WAMEET' : 'HD'}</span>
                        </span>
                        {isFallback && (
                          <span className="px-1.5 py-0.2 rounded-full bg-cyan-600/90 text-white text-[8px] font-black uppercase tracking-wider" title={failoverReason || 'Secours Wameet actif'}>
                            FAILOVER
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-blue-300 font-bold block">{creatorHandle}</span>
                    </div>
                  </div>

                  {/* Badges Spectateurs & Contrôles */}
                  <div className="flex items-center gap-2">
                    {/* Compteur de spectateurs en direct */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-white text-xs font-black">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>{new Intl.NumberFormat('fr-FR').format(viewersCount)}</span>
                    </div>

                    {/* Bouton d'Enregistrement d'Écran Local (Prompt 52) */}
                    <ScreenRecordButton
                      sessionTitle={title}
                      variant="pill"
                    />

                    {/* Bouton Son / Muet */}
                    <button
                      type="button"
                      onClick={handleToggleSound}
                      className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition cursor-pointer backdrop-blur-xl"
                      title={isMuted ? 'Activer le son' : 'Couper le son'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    </button>

                    {/* Bouton Réduire (1-Clic) */}
                    <button
                      type="button"
                      onClick={() => handleToggleMinimize(true)}
                      className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition cursor-pointer backdrop-blur-xl"
                      title="Réduire en miniature"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Bouton Fermer */}
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition cursor-pointer backdrop-blur-xl"
                      title="Quitter le live"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </header>

              {/* ─── B. ZONE CENTRALE : RÉACTIONS FLOTTANTES ──────────────── */}
              <div className="relative flex-1 pointer-events-none">
                {floatingHearts.map(h => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -260, scale: 1.4 }}
                    transition={{ duration: 1.8, ease: 'easeOut' }}
                    className="absolute bottom-10 text-3xl"
                    style={{ left: `${h.left}%` }}
                  >
                    ❤️
                  </motion.div>
                ))}
              </div>

              {/* ─── C. COLONNE LATERALE DROITE (INTERACTIONS WAMEET REELS) ─── */}
              <div className="absolute right-4 bottom-28 flex flex-col items-center gap-4 z-20 pointer-events-auto">
                {/* J'aime / Coeur */}
                <button
                  type="button"
                  onClick={handleHeartClick}
                  className="flex flex-col items-center gap-1 group/btn cursor-pointer"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center transition transform active:scale-125 border ${
                    isLiked
                      ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/40'
                      : 'bg-black/50 text-white border-white/20 backdrop-blur-xl hover:bg-white/20'
                  }`}>
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
                  </div>
                  <span className="text-[11px] font-black text-white drop-shadow">
                    {new Intl.NumberFormat('fr-FR').format(likesCount)}
                  </span>
                </button>

                {/* Bouton Viral Micro-Relais Wameet (Prompt 14) */}
                <div className="flex flex-col items-center">
                  <RelayShareButton
                    liveId={liveEventId}
                    title={title}
                    commissionPercentage={5}
                    variant="compact"
                    className="shadow-lg shadow-emerald-500/30 ring-1 ring-yellow-300/40"
                  />
                </div>
              </div>

              {/* ─── D. MOITIÉ BASSE DE L'ÉCRAN : CHAT FIREBASE EN TEMPS RÉEL + TITRE + E-COMMERCE LIVE ─── */}
              <div className="z-20 space-y-2.5 max-w-[420px] pointer-events-auto">
                {/* 1. CHAT FIREBASE EN TEMPS RÉEL ABSOLU (ZÉRO DÉLAI / SUPERPOSÉ SUR LE GLASS SHIELD) */}
                <WameetLiveChatOverlay
                  liveId={liveEventId}
                  currentUserName="Spectateur Wameet"
                  isHost={false}
                  className="w-full"
                />

                {/* 2. BANDEAU TITRE & STATUT VENTE FLASH */}
                <div className="bg-black/55 backdrop-blur-xl px-3 py-2 rounded-2xl border border-white/15 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-black">
                    <Flame className="w-3.5 h-3.5 fill-amber-300" />
                    <span>SESSION SPÉCIALE VENTE FLASH</span>
                  </div>
                  <h3 className="text-xs sm:text-[13px] font-extrabold text-white leading-snug line-clamp-1">
                    {title}
                  </h3>
                </div>

                {/* =========================================================== */}
                {/* 3. MOTEUR E-COMMERCE NANASORE LIVE SYNC & TIME-SYNC HACK    */}
                {/* Latence compensée de 3s ➡️ Pop-up slide-up ➡️ Bottom Sheet 50% Mobile Money */}
                {/* =========================================================== */}
                <NanasoreLiveCommerceOverlay
                  liveId={liveEventId}
                  isHost={false}
                  positionMode="absolute"
                  bottomOffset="10px"
                />
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WameetLiveWrapper;
