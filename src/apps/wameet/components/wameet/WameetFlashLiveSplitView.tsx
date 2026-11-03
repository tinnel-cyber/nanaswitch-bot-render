import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  X,
  Maximize2,
  Minimize2,
  Send,
  Heart,
  Share2,
  Radio,
  Flame,
  Sparkles,
  MapPin,
  Clock,
  ShoppingBag,
  Users,
  Smile,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { extractYouTubeId } from './WameetLiveWrapper';
import { LiveProductCard, LiveProductItem } from './LiveProductCard';
import { FlashLiveClosedModal } from './FlashLiveClosedModal';
import { useLiveShoppingRoom } from '../../../../hooks/useLiveShoppingRoom';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface FlashLiveChatMessage {
  id: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: 'host' | 'buyer' | 'viewer';
  text: string;
  timestamp?: string;
  isOrderNotification?: boolean;
}

export interface WameetFlashLiveSplitViewProps {
  // Vidéo Live
  youtubeUrl?: string;
  directVideoUrl?: string;
  title?: string;
  sellerName?: string;
  sellerHandle?: string;
  sellerAvatar?: string;
  viewersCount?: number;
  initialMuted?: boolean;

  // Caractéristiques du Groupe Éphémère & Géolocalisation
  groupLocation?: string; // ex: "Abidjan • Cocody & 15km"
  ephemeralTimerLabel?: string; // ex: "Ferme dans 32:45"
  isSellerOnline?: boolean;

  // Produit poussé en direct
  initialPushedProduct?: LiveProductItem | null;
  onBuyProduct?: (product: LiveProductItem) => void;

  // Intégration Salon Éphémère & WebSockets
  roomId?: string;
  isSeller?: boolean;
  onRedirectHome?: () => void;

  // Chat & Navigation
  currentUserName?: string;
  currentUserAvatar?: string;
  onClose?: () => void;
  className?: string;
}

const DEFAULT_QUICK_EMOJIS = ['🔥', '❤️', '👏', '😍', '⚡', '🎉'];

const MOCK_MESSAGES_FALLBACK: FlashLiveChatMessage[] = [
  {
    id: 'msg-1',
    senderName: 'Vendeur Officiel',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    senderRole: 'host',
    text: 'Bienvenue dans la vente Flash spéciale Abidjan ! Stock limité à 10 pièces par article 🔥',
    timestamp: '14:02'
  },
  {
    id: 'msg-2',
    senderName: 'Fatou Traoré',
    senderRole: 'viewer',
    text: 'Bonjour ! La livraison est disponible aujourd’hui sur Cocody ?',
    timestamp: '14:03'
  },
  {
    id: 'msg-3',
    senderName: 'Vendeur Officiel',
    senderRole: 'host',
    text: 'Oui Fatou ! Les commandes confirmées avant 16h sont livrées ce soir en 1 clic 🚀',
    timestamp: '14:03'
  },
  {
    id: 'msg-4',
    senderName: 'Système Wameet',
    senderRole: 'buyer',
    text: 'Moussa K. vient de commander via Smart Escrow Mobile Money !',
    isOrderNotification: true,
    timestamp: '14:04'
  }
];

export const WameetFlashLiveSplitView: React.FC<WameetFlashLiveSplitViewProps> = ({
  youtubeUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  directVideoUrl,
  title = 'Vente Flash Live Shopping • Nouveautés Mode & Tech 🔥',
  sellerName = 'Awa Boutique Chic',
  sellerHandle = '@awa.abidjan',
  sellerAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  viewersCount = 1240,
  initialMuted = true,
  groupLocation = 'Abidjan • Cocody (15 km)',
  ephemeralTimerLabel = 'Ferme dans 38:15',
  isSellerOnline = true,
  initialPushedProduct = {
    id: 'prod-flash-1',
    title: 'Robe Wax Royale Édition Limitée 2026',
    price: 18500,
    originalPrice: 28000,
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&auto=format&fit=crop&q=80',
    badge: 'FLASH -34% 🔥',
    stockRemaining: 4
  },
  onBuyProduct,
  roomId,
  isSeller = false,
  onRedirectHome,
  currentUserName = 'Moi (Client)',
  currentUserAvatar,
  onClose,
  className = ''
}) => {
  const effectiveRoomId = roomId || 'flash_live_default_room';

  // États de contrôle vidéo et audio
  const [isMuted, setIsMuted] = useState<boolean>(initialMuted);
  const [viewers, setViewers] = useState<number>(viewersCount);
  const [likesCount, setLikesCount] = useState<number>(428);
  const [floatingHearts, setFloatingHearts] = useState<{ id: string; left: number }[]>([]);

  // États du chat & produit poussé
  const [messages, setMessages] = useState<FlashLiveChatMessage[]>(MOCK_MESSAGES_FALLBACK);
  const [inputText, setInputText] = useState<string>('');
  const [pushedProduct, setPushedProduct] = useState<LiveProductItem | null>(initialPushedProduct);
  const [isFollowed, setIsFollowed] = useState<boolean>(false);

  // Hook Temps Réel : Salon Éphémère, WebSocket/Firebase Push Produit & Compte à Rebours
  const {
    pushedProduct: livePushedProduct,
    isClosed: isRoomClosed,
    timerLabel: liveTimerLabel,
    farewellMessage,
    viewersCount: liveViewersCount,
    pushProduct: executePushProduct,
    dismissPushedProduct,
    closeRoom: executeCloseRoom
  } = useLiveShoppingRoom({
    roomId: effectiveRoomId,
    isSeller,
    initialProduct: initialPushedProduct,
    roomConfig: {
      title,
      sellerName,
      sellerAvatar,
      location: groupLocation,
      youtubeUrl
    },
    onProductPushed: (prod) => {
      setPushedProduct(prod);
    },
    onRoomClosed: (msg) => {
      console.log('[FLASH LIVE VIEW] Salon clos :', msg);
    },
    onRedirectHome: () => {
      if (onRedirectHome) onRedirectHome();
      else if (onClose) onClose();
      else if (typeof window !== 'undefined') window.location.hash = '#/';
    }
  });

  const activePushedProduct = livePushedProduct || pushedProduct;
  const activeTimerLabel = liveTimerLabel || ephemeralTimerLabel;
  const activeViewers = liveViewersCount || viewers;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const youtubeVideoId = extractYouTubeId(youtubeUrl);

  // Auto-scroll doux vers le bas quand un nouveau message arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, pushedProduct]);

  // Déclenchement de coeurs flottants sur les likes
  const handleLike = () => {
    try {
      playTapBeep();
    } catch {}
    setLikesCount(prev => prev + 1);

    const heartId = `heart-${Date.now()}-${Math.random()}`;
    const leftOffset = Math.floor(Math.random() * 40) + 30; // entre 30% et 70%

    setFloatingHearts(prev => [...prev, { id: heartId, left: leftOffset }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== heartId));
    }, 1800);
  };

  // Envoi d'un message dans le chat
  const handleSendMessage = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;

    try {
      playTapBeep();
    } catch {}

    const newMsg: FlashLiveChatMessage = {
      id: `chat-${Date.now()}`,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      senderRole: 'viewer',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    if (!customText) setInputText('');
  };

  // Clic sur l'achat en 1 clic
  const handleBuy = (product: LiveProductItem) => {
    try {
      playValidationBeep();
    } catch {}

    if (onBuyProduct) {
      onBuyProduct(product);
    } else {
      // Notification sociale automatique dans le chat
      const orderNotice: FlashLiveChatMessage = {
        id: `notice-${Date.now()}`,
        senderName: 'Système Wameet',
        senderRole: 'buyer',
        text: `${currentUserName} vient de valider la commande de : ${product.title} !`,
        isOrderNotification: true,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, orderNotice]);
      alert(`Commande validée en 1 clic : ${product.title} pour ${product.price.toLocaleString('fr-FR')} FCFA via Mobile Money.`);
    }
  };

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full max-w-md mx-auto flex flex-col bg-slate-950 text-white overflow-hidden relative select-none font-sans shadow-2xl ${className}`}
    >
      {/* =====================================================================
          1. MOITIÉ SUPÉRIEURE : LECTEUR VIDÉO LIVE FIXE (NE RECULE JAMAIS)
             La règle shrink-0 + aspect-video garantit que la vidéo reste 100% visible
             même lorsque le clavier virtuel du téléphone s'ouvre pour taper !
         ===================================================================== */}
      <section
        aria-label="Lecteur Vidéo Live Shopping"
        className="shrink-0 w-full relative aspect-video bg-black z-20 shadow-lg border-b border-slate-800/80 overflow-hidden"
      >
        {/* Iframe YouTube ou Balise Vidéo Directe */}
        {directVideoUrl ? (
          <video
            src={directVideoUrl}
            autoPlay
            playsInline
            muted={isMuted}
            loop
            className="w-full h-full object-cover"
          />
        ) : (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&playsinline=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-full h-full border-0 pointer-events-auto"
          />
        )}

        {/* -------------------------------------------------------------
            SURIMPRESSION VIDÉO : En-tête du vendeur & Badges Direct
           ------------------------------------------------------------- */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none z-30">
          {/* Badge Vendeur & Bouton Suivre */}
          <div className="flex items-center gap-2 bg-slate-950/75 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/15 pointer-events-auto shadow-md min-w-0">
            <div className="relative shrink-0">
              <img
                src={sellerAvatar}
                alt={sellerName}
                className="w-7 h-7 rounded-full object-cover border border-white/20"
              />
              {isSellerOnline && (
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-black" />
              )}
            </div>

            <div className="min-w-0 pr-1">
              <h3 className="text-[11px] font-extrabold text-white truncate max-w-[110px] leading-tight">
                {sellerName}
              </h3>
              <p className="text-[9px] text-slate-300 truncate leading-none">
                {sellerHandle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFollowed(!isFollowed)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                isFollowed
                  ? 'bg-white/20 text-white'
                  : 'bg-[#0084FF] text-white hover:bg-blue-600'
              }`}
            >
              {isFollowed ? 'Abonné' : 'Suivre'}
            </button>
          </div>

          {/* Badges de direct & Contrôles (Mute, Close) */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Badge EN DIRECT */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Direct
            </span>

            {/* Spectateurs */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-slate-200 text-[10px] font-bold border border-white/10">
              <Users className="w-3 h-3 text-slate-300" />
              {activeViewers.toLocaleString('fr-FR')}
            </span>

            {/* Bouton Mute */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition cursor-pointer border border-white/10"
              title={isMuted ? 'Activer le son' : 'Couper le son'}
              aria-label="Son"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Bouton Fermer */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-rose-600/80 transition cursor-pointer border border-white/10"
                title="Quitter le live"
                aria-label="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------------
            CONTRÔLES DU VENDEUR (SI IS_SELLER = TRUE)
           ------------------------------------------------------------- */}
        {isSeller && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-30 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                if (initialPushedProduct) {
                  executePushProduct(initialPushedProduct);
                }
              }}
              className="px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-md transition cursor-pointer"
            >
              <Flame className="w-3 h-3 fill-current" />
              <span>Pousser le produit en direct</span>
            </button>

            <button
              type="button"
              onClick={() => executeCloseRoom("La vente Flash est terminée. Merci à tous nos acheteurs !")}
              className="px-2.5 py-1 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[10px] font-black flex items-center gap-1 shadow-md transition cursor-pointer"
            >
              <span>Terminer le live</span>
            </button>
          </div>
        )}

        {/* -------------------------------------------------------------
            COEURS FLOTTANTS ANIMÉS SUR LE LIVE ❤️
           ------------------------------------------------------------- */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {floatingHearts.map(heart => (
            <span
              key={heart.id}
              style={{
                left: `${heart.left}%`,
                bottom: '15px',
                animation: 'floatUpHeart 1.8s ease-out forwards'
              }}
              className="absolute text-rose-500 text-2xl select-none"
            >
              ❤️
            </span>
          ))}
          <style>{`
            @keyframes floatUpHeart {
              0% { transform: translateY(0) scale(0.8); opacity: 1; }
              50% { transform: translateY(-70px) scale(1.3) rotate(-15deg); opacity: 0.9; }
              100% { transform: translateY(-160px) scale(1.6) rotate(15deg); opacity: 0; }
            }
          `}</style>
        </div>
      </section>

      {/* =====================================================================
          2. BANDEAU DE GROUPE ÉPHÉMÈRE & GÉOLOCALISATION
         ===================================================================== */}
      <div className="shrink-0 px-3.5 py-1.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 text-slate-300 flex items-center justify-between text-[11px] font-semibold">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3 h-3 text-[#0084FF] shrink-0" />
          <span className="truncate text-slate-200">{groupLocation}</span>
        </div>

        <div className="flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0 text-[10px] font-bold">
          <Clock className="w-2.5 h-2.5" />
          <span>{activeTimerLabel}</span>
        </div>
      </div>

      {/* =====================================================================
          3. MOITIÉ INFÉRIEURE : FLUX DE CHAT SCROLLABLE & INTERACTIF
         ===================================================================== */}
      <section
        aria-label="Discussion du Live Shopping"
        className="flex-1 min-h-0 flex flex-col bg-slate-900/90 relative z-10 overflow-hidden"
      >
        {/* Conteneur des messages scrollables */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto px-3.5 py-2 space-y-2.5 scroll-smooth overscroll-contain select-text"
        >
          {messages.map(msg => {
            const isHost = msg.senderRole === 'host';
            const isOrder = msg.isOrderNotification;

            if (isOrder) {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-2 animate-in fade-in"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="flex-1">{msg.text}</span>
                  <span className="text-[9px] text-emerald-400/80">{msg.timestamp}</span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 text-xs leading-snug animate-in fade-in ${
                  isHost ? 'bg-blue-950/40 border border-blue-800/40 p-2 rounded-xl' : ''
                }`}
              >
                {msg.senderAvatar ? (
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-slate-700"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {msg.senderName.charAt(0)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-black text-[11px] truncate ${
                        isHost ? 'text-[#0084FF]' : 'text-slate-300'
                      }`}
                    >
                      {msg.senderName}
                    </span>
                    {isHost && (
                      <span className="px-1 py-0.2 rounded-md bg-[#0084FF] text-white text-[8px] font-black uppercase">
                        Vendeur
                      </span>
                    )}
                    {msg.timestamp && (
                      <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                    )}
                  </div>

                  <p className="text-slate-100 mt-0.5 break-words select-text font-normal text-[12px]">
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ===================================================================
            4. COMPOSANT LIVEPRODUCTCARD (TOAST / STICKY BOTTOM EN SURIMPRESSION)
               Apparaît temporairement au-dessus de la barre de saisie
           =================================================================== */}
        {activePushedProduct && (
          <div className="px-3 pb-1.5 transition-all duration-300">
            <LiveProductCard
              product={activePushedProduct}
              onBuyClick={handleBuy}
              onDismiss={() => {
                setPushedProduct(null);
                dismissPushedProduct();
              }}
              autoDismissSeconds={30}
            />
          </div>
        )}

        {/* ===================================================================
            5. BARRE DE SAISIE DU CHAT (FIXÉE EN BAS, ADAPTÉE AU CLAVIER MOBILE)
           =================================================================== */}
        <div className="shrink-0 p-2.5 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md space-y-2">
          {/* Emojis rapides */}
          <div className="flex items-center justify-between gap-1 px-1">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {DEFAULT_QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendMessage(undefined, emoji)}
                  className="px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-xs active:scale-90 transition cursor-pointer select-none"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Bouton de Like coeur */}
            <button
              type="button"
              onClick={handleLike}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[11px] font-bold active:scale-95 transition cursor-pointer shrink-0 border border-rose-500/30"
              title="Envoyer un like"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>{likesCount}</span>
            </button>
          </div>

          {/* Formulaire de saisie de message */}
          <form onSubmit={e => handleSendMessage(e)} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Poser une question en direct..."
                className="w-full text-xs bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 rounded-full pl-3.5 pr-9 py-2.5 focus:outline-none focus:border-[#0084FF] focus:ring-1 focus:ring-[#0084FF] transition"
              />
              <button
                type="button"
                onClick={() => setInputText(prev => prev + ' 🔥')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                title="Ajouter un emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            {/* Bouton Envoyer */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-full bg-[#0084FF] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md transition active:scale-95 cursor-pointer shrink-0"
              title="Envoyer"
              aria-label="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* =====================================================================
          6. MODALE DE CLÔTURE & REDIRECTION PROPRE (SI LE LIVE SE TERMINE)
         ===================================================================== */}
      {isRoomClosed && (
        <FlashLiveClosedModal
          farewellMessage={farewellMessage}
          onRedirectHome={() => {
            if (onRedirectHome) onRedirectHome();
            else if (onClose) onClose();
            else if (typeof window !== 'undefined') window.location.hash = '#/';
          }}
          redirectCountdownSec={4}
        />
      )}
    </div>
  );
};

export default WameetFlashLiveSplitView;
