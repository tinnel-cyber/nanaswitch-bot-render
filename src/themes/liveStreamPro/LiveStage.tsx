import React, { useState, useRef, useEffect } from 'react';
import { 
  Volume2, VolumeX, Maximize2, Radio, Sparkles, 
  Tv, Play, ShieldAlert, Award, Flame, Zap 
} from 'lucide-react';
import { LiveProductItem, LiveChatMessage } from './liveStreamAssets';
import { LiveOfferHud } from './LiveOfferHud';
import { LiveChatPanel } from './LiveChatPanel';
import { LiveMiniPlayer } from './LiveMiniPlayer';
import { NanasoreLiveCommerceOverlay } from '../../components/live/NanasoreLiveCommerceOverlay';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

interface FloatingReaction {
  id: string;
  emoji: string;
  leftOffset: number;
}

interface LiveStageProps {
  streamUrl?: string;
  products: LiveProductItem[];
  pinnedProduct: LiveProductItem;
  onOpenOffer: (product: LiveProductItem) => void;
  onAddToCart?: (product: LiveProductItem) => void;
  liveId?: string;
  isHost?: boolean;
}

// Vidéo de démonstration Studio 4K fluide et optimisée (royalty-free CDN)
const DEFAULT_DEMO_STREAM_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

export const LiveStage: React.FC<LiveStageProps> = ({
  streamUrl,
  products,
  pinnedProduct,
  onOpenOffer,
  onAddToCart,
  liveId = 'live-stream-pro',
  isHost = false
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [isOutOfView, setIsOutOfView] = useState(false);
  const [isMiniPlayerDismissed, setIsMiniPlayerDismissed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver pour détecter la sortie d'écran du lecteur principal au scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = stageRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsOutOfView(!entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const handleScrollToTop = () => {
    if (stageRef.current) {
      stageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Bascule du son en 1 clic sans coupure
  const handleToggleSound = () => {
    playTapBeep();
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (!newMuted) {
        videoRef.current.volume = 1.0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      setIsMuted(!isMuted);
    }
  };

  // Plein écran
  const handleFullscreen = () => {
    if (stageRef.current) {
      if (!document.fullscreenElement) {
        stageRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Gestion des réactions flottantes
  const handleTriggerReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: `reaction-${Date.now()}-${Math.random()}`,
      emoji,
      leftOffset: Math.floor(Math.random() * 80) + 10 // 10% à 90% de la colonne
    };

    setReactions((prev) => [...prev, newReaction]);

    // Nettoyage après fin de l'animation CSS (2.8s)
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2800);
  };

  // Détection du type de flux (YouTube Live, Twitch, ou Vidéo HTML5)
  const isYouTube = streamUrl && (streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be'));
  const isTwitch = streamUrl && streamUrl.includes('twitch.tv');

  return (
    <section 
      ref={stageRef}
      className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8"
      aria-label="Scène Principale du Live"
    >
      {/* Grille Desktop 70% / 30% — Stackée en 1 colonne sur Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        
        {/* ================= A. ZONE VIDÉO PRINCIPALE (70% - 8 colonnes sur 12) ================= */}
        <div className="lg:col-span-8 flex flex-col">
          {/* Sur Mobile : Vidéo épinglée tout en haut (sticky top-[75px] sous le header 75px) */}
          <div className="relative w-full aspect-video rounded-[20px] overflow-hidden live-stage-glow bg-black border border-white/[0.1] select-none group sticky top-[75px] md:static z-30 md:z-auto transition-all">
            
            {/* 1. Lecteur Vidéo Multi-Flux (HTML5 / YouTube / Twitch) */}
            {isYouTube ? (
              <iframe
                src={`${streamUrl}?autoplay=1&mute=${isMuted ? 1 : 0}&enablejsapi=1&controls=1`}
                title="Live Stream YouTube"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : isTwitch ? (
              <iframe
                src={`${streamUrl}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&autoplay=true&muted=${isMuted}`}
                title="Live Stream Twitch"
                className="w-full h-full border-0"
                allowFullScreen
              />
            ) : (
              <video
                ref={videoRef}
                src={streamUrl || DEFAULT_DEMO_STREAM_VIDEO}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
              />
            )}

            {/* Gradient sombre en haut et en bas pour un contraste parfait des overlays HUD */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/60" />

            {/* 2. Overlays HUD en Haut de Vidéo : Badge EN DIRECT + Qualité 4K + Titre de Session */}
            <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-20 flex items-center justify-between gap-3 pointer-events-auto">
              
              {/* Gauche : Badges Live & 4K */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF2A54]/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-black shadow-lg shadow-[#FF2A54]/30">
                  <span className="w-2 h-2 rounded-full bg-white live-pulse-dot shrink-0" />
                  <span>EN DIRECT</span>
                </div>

                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 border border-white/20 backdrop-blur-md text-slate-200 text-[10px] sm:text-[11px] font-bold">
                  <span className="text-[#38BDF8]">4K</span>
                  <span>UHD • 60 FPS</span>
                </div>

                <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 border border-white/20 backdrop-blur-md text-amber-300 text-[10px] sm:text-[11px] font-bold">
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>Vente Flash Exclusive</span>
                </div>
              </div>

              {/* Droite : Contrôles Rapides (Son & Plein Écran) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
                  title={isMuted ? "Activer le son" : "Couper le son"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
                  title="Plein écran"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* 3. Gros Bouton Flottant au Centre : "🔊 Cliquez pour activer le son du Direct" (quand muet) */}
            {isMuted && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className="pointer-events-auto px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-[#090A0F]/85 hover:bg-[#090A0F] text-white font-extrabold text-xs sm:text-sm border border-indigo-500/50 shadow-2xl shadow-indigo-950/80 backdrop-blur-md flex items-center gap-2.5 sm:gap-3 transition transform hover:scale-105 active:scale-95 cursor-pointer animate-in zoom-in-95 group/soundbtn"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                    <Volume2 className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight text-white flex items-center gap-1.5">
                      <span>Cliquez pour activer le son du Direct</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Écoutez les explications et réponses en direct
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* 4. Incrustation HUD (En bas à gauche de la vidéo) — L'Offre Épinglée du Moment */}
            <LiveOfferHud
              product={pinnedProduct}
              onOpenOffer={onOpenOffer}
            />

            {/* 5. Moteur E-Commerce & Tiroir Nanasore Live Sync (activeProductId -> Pop-up -> Bottom Sheet 50vh) */}
            <NanasoreLiveCommerceOverlay
              liveId={liveId}
              isHost={isHost}
              availableProducts={products.map(p => ({
                id: p.id,
                title: p.name,
                shortTitle: p.name,
                price: p.price,
                originalPrice: p.compareAtPrice,
                imageUrl: p.imageUrl,
                stockCount: p.stockLeft || p.inventoryQuantity,
                operatorBadge: 'Wave & Orange Money'
              }))}
            />

          </div>
        </div>

        {/* ================= B. COLONNE INTERACTIVE (30% - 4 colonnes sur 12) ================= */}
        <div className="lg:col-span-4 relative flex flex-col h-[520px] sm:h-[580px] lg:h-auto min-h-[480px]">
          
          {/* Panneau Interactif avec Chat & Produits Débloqués */}
          <LiveChatPanel
            products={products}
            onOpenOffer={onOpenOffer}
            onAddToCart={onAddToCart}
            onTriggerReaction={handleTriggerReaction}
          />

          {/* Rendu des Réactions Flottantes CSS Pure (🔥, ❤️, 👏, ⚡) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {reactions.map((react) => (
              <div
                key={react.id}
                className="floating-reaction-item text-2xl sm:text-3xl"
                style={{
                  bottom: '60px',
                  right: `${react.leftOffset}%`
                }}
              >
                {react.emoji}
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* ================= C. STICKY MINI-PLAYER FLOTTANT AU SCROLL (PICTURE-IN-PICTURE) ================= */}
      <LiveMiniPlayer
        streamUrl={streamUrl}
        pinnedProduct={pinnedProduct}
        onOpenOffer={onOpenOffer}
        isVisible={isOutOfView && !isMiniPlayerDismissed}
        onClose={() => setIsMiniPlayerDismissed(true)}
        onScrollToTop={handleScrollToTop}
      />

    </section>
  );
};
