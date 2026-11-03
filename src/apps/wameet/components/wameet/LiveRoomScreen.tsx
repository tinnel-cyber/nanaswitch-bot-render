import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  X,
  Send,
  Heart,
  Radio,
  Flame,
  Zap,
  ShoppingBag,
  Users,
  Smile,
  ShieldCheck,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { PhygitalScarcityAlert } from './PhygitalScarcityAlert';
import { LiveProductToast, LiveProductToastItem } from './LiveProductToast';
import { TontineGaugeOverlay } from './TontineGaugeOverlay';
import { RelayShareButton } from './RelayShareButton';
import { CommissionToast } from './CommissionToast';
import { DriverAssignedToast, DriverAssignedData } from './DriverAssignedToast';
import { useMicroRelay } from '../../../../hooks/useMicroRelay';
import { extractYouTubeId } from './WameetLiveWrapper';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';


export interface LiveChatMessage {
  id: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: 'host' | 'buyer' | 'viewer';
  text: string;
  timestamp?: string;
  isOrderNotification?: boolean;
}

export interface LiveRoomScreenProps {
  /** URL YouTube Live ou vidéo directe */
  videoUrl?: string;
  youtubeUrl?: string;
  /** Titre de la session Live */
  title?: string;
  /** Informations sur l'hôte / vendeur */
  hostName?: string;
  hostAvatar?: string;
  hostBadge?: string;
  /** Nombre de spectateurs en direct */
  viewersCount?: number;
  /** Produit poussé en direct par le vendeur */
  pushedProduct?: LiveProductToastItem | null;
  /** Callback lors du clic sur "Acheter en 1 clic" */
  onBuyProduct?: (product: LiveProductToastItem) => void;
  /** Messages initiaux du chat */
  initialMessages?: LiveChatMessage[];
  /** Callback lors de l'envoi d'un message par l'utilisateur */
  onSendMessage?: (text: string) => void;
  /** Configuration de l'alerte de rareté phygitale */
  phygitalAlert?: {
    isOpen?: boolean;
    remainingStock?: number;
    storeName?: string;
  };
  /** Configuration de la Tontine Flash (Achat Groupé Viral) */
  tontine?: {
    isOpen?: boolean;
    initialOrders?: number;
    targetOrders?: number;
    blockedAmount?: number;
    refundAmount?: number;
  };
  /** Callback de fermeture de l'écran Live */
  onClose?: () => void;
  /** Identifiant unique de la session Live (pour l'URL de micro-relais) */
  liveId?: string;
  /** Identifiant de l'utilisateur / spectateur connecté */
  currentUserId?: string;
  /** Pourcentage de commission reversé à l'affilié (défaut: 5%) */
  affiliateCommissionRate?: number;
  /** Activer le bouton de test/simulation Cha-ching (+750 FCFA) */
  showDemoTrigger?: boolean;
  /** Afficher le bouton d'action flottant "Relayer & Gagner" en plus de la barre d'outils */
  showFloatingRelayButton?: boolean;
  className?: string;
}

const DEFAULT_QUICK_EMOJIS = ['🔥', '❤️', '⚡', '👏', '😍', '🎉'];

const DEFAULT_MESSAGES_MOCK: LiveChatMessage[] = [
  {
    id: 'msg-1',
    senderName: 'Vendeur Officiel',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    senderRole: 'host',
    text: 'Bienvenue dans la vente Flash spéciale ! Commandes expédiées aujourd\'hui en 1 clic 🚀',
    timestamp: '14:30'
  },
  {
    id: 'msg-2',
    senderName: 'Awa Ouédraogo',
    senderRole: 'viewer',
    text: 'Coucou ! Le produit est disponible en quelle taille ?',
    timestamp: '14:31'
  },
  {
    id: 'msg-3',
    senderName: 'Vendeur Officiel',
    senderRole: 'host',
    text: 'Toutes les tailles du S au XXL sont prêtes en stock restreint !',
    timestamp: '14:31'
  },
  {
    id: 'msg-4',
    senderName: 'Système Wameet',
    senderRole: 'buyer',
    text: 'Moussa K. vient d\'acheter en 1 clic via Mobile Money ! 🎉',
    timestamp: '14:32',
    isOrderNotification: true
  }
];

const DEFAULT_DEMO_PRODUCT: LiveProductToastItem = {
  id: 'prod_flash_live_1',
  name: 'Coffret Karité Royal Or Prestige (Édition Limitée)',
  price: 18500,
  promoPrice: 14500,
  compareAtPrice: 22000,
  imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=400&auto=format&fit=crop&q=80',
  stock: 3
};

/**
 * COMPOSANT MAÎTRE LiveRoomScreen (Vue "Flash Group Live" Split-Screen Wameet)
 * Architecture mobile-first :
 * - Moitié supérieure (40%) : VideoPlayer Fixe (shrink-0 anti-clavier)
 * - Moitié inférieure (60%) : ChatFeed scrollable + MessageInput
 * - Mini-carte LiveProductToast en surimpression flottante
 * - Alerte PhygitalAlert animée en rouge depuis le haut de la vidéo
 */
export const LiveRoomScreen: React.FC<LiveRoomScreenProps> = ({
  videoUrl,
  youtubeUrl = 'https://www.youtube.com/watch?v=live_demo_wameet',
  title = 'Live Flash Shopping Wameet',
  hostName = 'Awa Nana Empire',
  hostAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  hostBadge = 'Vendeur Vérifié',
  viewersCount = 142,
  pushedProduct = DEFAULT_DEMO_PRODUCT,
  onBuyProduct,
  initialMessages,
  onSendMessage,
  phygitalAlert = {
    isOpen: true,
    remainingStock: 2,
    storeName: 'Boutique Abidjan Mall'
  },
  tontine = {
    isOpen: true,
    initialOrders: 42,
    targetOrders: 50,
    blockedAmount: 20000,
    refundAmount: 5000
  },
  onClose,
  liveId = 'live_flash_demo',
  currentUserId = 'usr_viewer_live',
  affiliateCommissionRate = 5,
  showDemoTrigger = true,
  showFloatingRelayButton = false,
  className = ''
}) => {
  // Gestion du système Micro-Relais d'affiliation Wameet (Prompt 14 & 15)
  const {
    commissionToast,
    totalEarnings,
    closeToast,
    triggerDemoCommission
  } = useMicroRelay({
    liveId,
    affiliateId: currentUserId
  });

  // États de l'écran
  const [messages, setMessages] = useState<LiveChatMessage[]>(
    initialMessages || DEFAULT_MESSAGES_MOCK
  );
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const [isToastOpen, setIsToastOpen] = useState(Boolean(pushedProduct));
  const [isTontineOpen, setIsTontineOpen] = useState(tontine?.isOpen ?? true);
  const [activePhygitalAlert, setActivePhygitalAlert] = useState(phygitalAlert?.isOpen ?? true);
  const [heartsCount, setHeartsCount] = useState(384);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number }[]>([]);

  // Signal de réconfort client : Livreur assigné (Prompt 17)
  const [driverToast, setDriverToast] = useState<{
    isOpen: boolean;
    data: DriverAssignedData | null;
  }>({
    isOpen: false,
    data: null
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronisation du produit poussé
  useEffect(() => {
    if (pushedProduct) {
      setIsToastOpen(true);
    }
  }, [pushedProduct]);

  // Écoute de l'événement WebSocket 'driver_assigned' (Signal de réconfort client)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleDriverAssigned = (event: Event) => {
      const customEvent = event as CustomEvent<DriverAssignedData>;
      if (customEvent.detail) {
        setDriverToast({
          isOpen: true,
          data: customEvent.detail
        });
      }
    };

    window.addEventListener('wameet:driver_assigned', handleDriverAssigned);
    return () => {
      window.removeEventListener('wameet:driver_assigned', handleDriverAssigned);
    };
  }, []);

  // Défilement automatique vers le bas à l'arrivée d'un message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Extraction de l'ID YouTube pour iframe responsive
  const effectiveVideoUrl = videoUrl || youtubeUrl;
  const ytVideoId = extractYouTubeId(effectiveVideoUrl);

  // Envoi d'un message dans le chat
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    try {
      playTapBeep();
    } catch {}

    const newMsg: LiveChatMessage = {
      id: `msg_${Date.now()}`,
      senderName: 'Moi',
      senderRole: 'viewer',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    if (onSendMessage) {
      onSendMessage(trimmed);
    }
  };

  // Envoi de réaction coeur avec animation flottante
  const handleSendHeart = () => {
    try {
      playTapBeep();
    } catch {}
    setHeartsCount((c) => c + 1);

    const heartId = Date.now() + Math.random();
    const randomX = Math.floor(Math.random() * 40) - 20;
    setFloatingHearts((prev) => [...prev, { id: heartId, x: randomX }]);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1500);
  };

  return (
    <div
      className={`h-screen h-[100dvh] w-full flex flex-col overflow-hidden bg-slate-950 font-sans select-none relative ${className}`}
    >
      {/* =====================================================================
          NOTIFICATION DE COMMISSION JUBILATOIRE "CHA-CHING" (MICRO-RELAIS)
          Prompt 14 : Notification Pill émeraude + bordure dorée + confettis
         ===================================================================== */}
      <CommissionToast
        isOpen={commissionToast.isOpen}
        amount={commissionToast.amount}
        currency={commissionToast.currency}
        buyerName={commissionToast.buyerName}
        productName={commissionToast.productName}
        onClose={closeToast}
      />

      {/* =====================================================================
          SIGNAL DE RÉCONFORT CLIENT "WOW EFFECT" (SWARM LOGISTICS)
          Prompt 17 : Alerte personnalisée quand un livreur récupère la commande
         ===================================================================== */}
      <DriverAssignedToast
        isOpen={driverToast.isOpen}
        data={driverToast.data}
        onClose={() => setDriverToast((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* =====================================================================
          1. MOITIÉ SUPÉRIEURE (40% DE L'ÉCRAN) : LE VIDEO PLAYER FIXE
             - shrink-0 : Garantit que l'ouverture du clavier mobile ne réduit
                          jamais la hauteur de la vidéo !
             - min-h-[40%] max-h-[40%] : Cadre strict 40%
         ===================================================================== */}
      <section className="h-[40%] min-h-[40%] max-h-[40%] shrink-0 relative w-full bg-black overflow-hidden flex items-center justify-center">
        {/* Lecteur Vidéo (YouTube Iframe ou fallback vidéo) */}
        {ytVideoId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&mute=${
              isMuted ? 1 : 0
            }&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
            title={title}
            className="w-full h-full object-cover pointer-events-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black">
            <img
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"
              alt={title}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/60" />
          </div>
        )}

        {/* -------------------------------------------------------------------
            ALERTE DE RARETÉ PHYGITALE (Animée en rouge Drop & Shake)
           ------------------------------------------------------------------- */}
        {activePhygitalAlert && (
          <PhygitalScarcityAlert
            isOpen={activePhygitalAlert}
            productName={pushedProduct?.name || 'Coffret Prestige Karité Royal'}
            location={phygitalAlert?.storeName || 'Boutique Ouagadougou'}
            remainingStock={phygitalAlert?.remainingStock ?? 2}
            durationMs={5000}
            onClose={() => setActivePhygitalAlert(false)}
          />
        )}

        {/* Barre Supérieure Flottante sur la Vidéo */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
          {/* Identité du Vendeur & Badge Direct */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md p-1.5 pr-3 rounded-full border border-white/20 pointer-events-auto">
            <img
              src={hostAvatar}
              alt={hostName}
              className="w-7 h-7 rounded-full object-cover border border-amber-400"
            />
            <div className="leading-tight">
              <div className="text-[11px] font-black text-white flex items-center gap-1">
                <span>{hostName}</span>
                <CheckCircle2 className="w-3 h-3 text-blue-400 fill-blue-400" />
              </div>
              <div className="text-[9px] font-bold text-amber-300">{hostBadge}</div>
            </div>
          </div>

          {/* Badge "EN DIRECT" & Spectateurs & Fermer */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-[10px] font-black uppercase tracking-wider shadow-md animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>DIRECT</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/10">
              <Users className="w-3 h-3 text-slate-300" />
              <span>{viewersCount}</span>
            </span>

            {/* Mute / Unmute */}
            <button
              type="button"
              onClick={() => {
                try { playTapBeep(); } catch {}
                setIsMuted(!isMuted);
              }}
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/10 transition cursor-pointer"
              title={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Bouton Quitter */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/10 transition cursor-pointer"
                title="Quitter le Live"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cœurs flottants animés */}
        <div className="absolute right-4 bottom-3 pointer-events-none z-20">
          {floatingHearts.map((h) => (
            <span
              key={h.id}
              className="absolute text-xl animate-fade-up"
              style={{
                transform: `translateX(${h.x}px)`,
                animation: 'floatUp 1.4s ease-out forwards'
              }}
            >
              ❤️
            </span>
          ))}
        </div>
      </section>

      {/* =====================================================================
          2. MOITIÉ INFÉRIEURE (60% DE L'ÉCRAN) : LE CHATFEED + MESSAGE INPUT
             - flex-1 min-h-0 : Absorbe le redimensionnement du clavier
             - overscroll-contain : Empêche le bounce tactile mobile indésirable
         ===================================================================== */}
      <section className="h-[60%] flex-1 min-h-0 flex flex-col bg-slate-950 relative overflow-hidden border-t border-slate-800/80">
        {/* Titre du Live et barre d'état discrète */}
        <div className="px-3.5 py-1.5 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 truncate">
            <Radio className="w-3 h-3 text-rose-500 shrink-0" />
            <span className="truncate">{title}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bouton d'Action "Relayer & Gagner 5%" (Prompt 14) */}
            <RelayShareButton
              liveId={liveId}
              userId={currentUserId}
              commissionPercentage={affiliateCommissionRate}
              variant="toolbar"
            />

            <span className="hidden sm:inline-flex text-[10px] text-emerald-400 font-bold items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Smart Escrow Actif</span>
            </span>
          </div>

        </div>

        {/* -------------------------------------------------------------------
            TONTINE FLASH GAUGE OVERLAY (En haut du chat pendant le Live)
           ------------------------------------------------------------------- */}
        {isTontineOpen && (
          <div className="px-3 pt-2 shrink-0 pointer-events-auto">
            <TontineGaugeOverlay
              initialOrders={tontine?.initialOrders ?? 42}
              targetOrders={tontine?.targetOrders ?? 50}
              blockedAmount={tontine?.blockedAmount ?? 20000}
              refundAmount={tontine?.refundAmount ?? 5000}
              isOpen={isTontineOpen}
              onClose={() => setIsTontineOpen(false)}
              onParticipate={(amount, updated) => {
                const newMsg: LiveChatMessage = {
                  id: `msg_tontine_${Date.now()}`,
                  senderName: 'Système Wameet',
                  senderRole: 'buyer',
                  text: `🔥 Un spectateur a bloqué ${amount.toLocaleString('fr-FR')} FCFA pour la Tontine Flash ! (${updated}/50 commandes) 🎉`,
                  timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                  isOrderNotification: true
                };
                setMessages((prev) => [...prev, newMsg]);
              }}
              onGoalReached={() => {
                const newMsg: LiveChatMessage = {
                  id: `msg_tontine_unlocked_${Date.now()}`,
                  senderName: 'Système Wameet',
                  senderRole: 'buyer',
                  text: `🎉 OBJECTIF TONTINE FLASH ATTEINT ! Prix de gros débloqué, 5 000 FCFA remboursés à chaque participant ! 🚀`,
                  timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                  isOrderNotification: true
                };
                setMessages((prev) => [...prev, newMsg]);
              }}
            />
          </div>
        )}

        {/* -------------------------------------------------------------------
            FLUX DE CHAT SCROLLABLE (ChatFeed)
           ------------------------------------------------------------------- */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2 min-h-0 scroll-smooth"
        >
          {messages.map((msg) => {
            // Notification spéciale d'achat en 1 clic
            if (msg.isOrderNotification) {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in zoom-in-95 duration-200"
                >
                  <span className="text-sm">🛍️</span>
                  <span className="leading-snug">{msg.text}</span>
                </div>
              );
            }

            const isHost = msg.senderRole === 'host';
            const isMe = msg.senderName === 'Moi';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 text-xs leading-relaxed ${
                  isMe ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isMe && (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      isHost
                        ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {msg.senderName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div
                  className={`max-w-[82%] px-3 py-1.5 rounded-2xl ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : isHost
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200 rounded-tl-xs'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold ${
                        isHost ? 'text-amber-400' : isMe ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.senderName}
                    </span>
                    {isHost && (
                      <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 text-[8px] font-black uppercase">
                        Hôte
                      </span>
                    )}
                    {msg.timestamp && (
                      <span className="text-[9px] text-slate-500 ml-auto">{msg.timestamp}</span>
                    )}
                  </div>

                  <p className="mt-0.5 text-xs text-slate-100 break-words">{msg.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* -------------------------------------------------------------------
            MINI-CARTE "PUSH" PRODUIT (LiveProductToast en surimpression)
           ------------------------------------------------------------------- */}
        {pushedProduct && isToastOpen && (
          <div className="absolute bottom-16 left-3 right-3 z-20 pointer-events-auto">
            <LiveProductToast
              product={pushedProduct}
              isOpen={isToastOpen}
              onClose={() => setIsToastOpen(false)}
              onBuyClick={(prod) => {
                if (onBuyProduct) {
                  onBuyProduct(prod);
                }
              }}
              onAcceptOffer={(acceptedPrice, prod) => {
                const newMsg: LiveChatMessage = {
                  id: `msg_haggle_${Date.now()}`,
                  senderName: 'Système Wameet',
                  senderRole: 'buyer',
                  text: `🤝 Offre Smart Haggle acceptée à ${acceptedPrice.toLocaleString('fr-FR')} FCFA pour ${prod.name} ! 🎉`,
                  timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                  isOrderNotification: true
                };
                setMessages((prev) => [...prev, newMsg]);
              }}
            />
          </div>
        )}

        {/* -------------------------------------------------------------------
            BARRE D'EMOJIS RAPIDES & SAISIE MESSAGE (Tout en bas)
           ------------------------------------------------------------------- */}
        <div className="shrink-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2 sm:p-2.5 space-y-1.5">
          {/* Raccourcis Emojis Réactifs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1 py-0.5">
            {DEFAULT_QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  try { playTapBeep(); } catch {}
                  setInputText((prev) => prev + emoji);
                  inputRef.current?.focus();
                }}
                className="text-sm hover:scale-125 transition-transform p-1 cursor-pointer select-none"
              >
                {emoji}
              </button>
            ))}

            {/* Badge de gains cumulés si le spectateur a généré des ventes */}
            {totalEarnings > 0 && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black text-emerald-300 shrink-0">
                <span>💰</span>
                <span>+{totalEarnings.toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}

            {/* Raccourci Démo interactif pour tester l'animation & le son jubilatoire Cha-ching */}
            {showDemoTrigger && (
              <>
                <button
                  type="button"
                  onClick={() => triggerDemoCommission(750, 'Moussa K.')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/40 text-[9px] font-black transition cursor-pointer shrink-0 active:scale-95"
                  title="Tester l'animation Cha-ching (+750 FCFA)"
                >
                  <span>⚡ Test Cha-ching</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(
                        new CustomEvent('wameet:driver_assigned', {
                          detail: {
                            orderId: 'ord_demo_live',
                            driverName: 'Moussa Express (Moto #24)',
                            driverPhone: '+226 70 12 34 56',
                            eta: '45 minutes',
                            productName: pushedProduct?.name || 'Coffret Karité Royal Prestige'
                          }
                        })
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-400/20 hover:bg-lime-400/30 text-lime-300 border border-lime-400/40 text-[9px] font-black transition cursor-pointer shrink-0 active:scale-95"
                  title="Tester le toast Wow Effect (Livreur assigné)"
                >
                  <span>🛵 Test Livreur</span>
                </button>
              </>
            )}

            {/* Bouton Coeur Réactif en Direct */}
            <button
              type="button"
              onClick={handleSendHeart}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-[10px] font-black transition cursor-pointer shrink-0 active:scale-95"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
              <span>{heartsCount}</span>
            </button>
          </div>


          {/* Formulaire d'Envoi Minimaliste */}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Poser une question au vendeur..."
              className="flex-1 bg-slate-800/90 border border-slate-700/80 focus:border-blue-500 focus:outline-none rounded-2xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-400"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold transition-all shadow-md cursor-pointer shrink-0 active:scale-95 flex items-center justify-center"
              aria-label="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Bouton d'action flottant "Relayer & Gagner" (si activé) */}
      {showFloatingRelayButton && (
        <RelayShareButton
          liveId={liveId}
          userId={currentUserId}
          commissionPercentage={affiliateCommissionRate}
          variant="floating"
        />
      )}
    </div>
  );
};

export default LiveRoomScreen;
