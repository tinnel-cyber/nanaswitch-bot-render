import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Camera,
  RefreshCw,
  ShoppingBag,
  Zap,
  Flame,
  Radio,
  Users,
  Heart,
  Share2,
  X,
  MessageCircle,
  Sparkles,
  Sliders,
  DollarSign,
  ShieldCheck,
  Check,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Gift,
  Tag,
  AlertTriangle,
  Store,
  Layers,
  Send
} from 'lucide-react';
import {
  playTapBeep,
  playValidationBeep,
  playCashChime,
  playCancelSound
} from '../../../../utils/audio';
import { PhygitalScarcityAlert } from './PhygitalScarcityAlert';
import { RelayShareButton } from './RelayShareButton';
import { CommissionToast } from './CommissionToast';
import { ScreenRecordButton } from './ScreenRecordButton';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface LiveProductLot {
  id: string;
  title: string;
  shortTitle: string;
  category: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  stockLeft: number;
  badge?: string;
  description?: string;
}

export interface LiveSaleMessage {
  id: string;
  type: 'chat' | 'purchase' | 'haggling' | 'farotage';
  senderName: string;
  senderAvatar: string;
  text: string;
  amountFcfa?: number;
  productId?: string;
  time: string;
  status?: 'pending' | 'accepted' | 'declined';
}

export interface LiveShoppingJitsiEngineProps {
  /** Nom de la salle Jitsi WebRTC (unique ou basé sur liveId) */
  roomName?: string;
  /** Domaine Jitsi (par défaut: meet.jit.si) */
  jitsiDomain?: string;
  /** Titre de la session Live Shopping */
  title?: string;
  /** Nom du vendeur ou de la boutique */
  sellerName?: string;
  sellerHandle?: string;
  sellerAvatar?: string;
  /** Rôle de l'utilisateur : Vendeur (Host) ou Spectateur */
  isSeller?: boolean;
  /** Nombre initial de spectateurs connectés */
  initialViewers?: number;
  /** Liste des produits / lots mis en vente pendant le live */
  productLots?: LiveProductLot[];
  /** Visibilité du composant */
  isOpen?: boolean;
  /** Callback lors de la fermeture */
  onClose?: () => void;
  className?: string;
}

// ─── Lots Produits par défaut ────────────────────────────────────────────────
const DEFAULT_PRODUCT_LOTS: LiveProductLot[] = [
  {
    id: 'lot-1',
    title: 'Lot #1 : Coffret Karité Royal Or 100% Bio & Baumes Précieux',
    shortTitle: 'Coffret Karité Royal Or',
    category: 'Mode & Beauté',
    price: 18500,
    originalPrice: 28000,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-0e6d526a6c58?w=500&auto=format&fit=crop&q=80',
    stockLeft: 3,
    badge: '🔥 -34% EN DIRECT',
    description: 'Soin complet corporel karité pur artisanal certifié Bio.'
  },
  {
    id: 'lot-2',
    title: 'Lot #2 : Kit Studio Ring Light Pro 18" + Trépied Téléscopique 2m',
    shortTitle: 'Kit Ring Light Pro 18"',
    category: 'Tech & Créateurs',
    price: 22000,
    originalPrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80',
    stockLeft: 5,
    badge: '📦 LIVRAISON OUAGA EXPRESS',
    description: 'Éclairage bicolore avec télécommande sans fil et support 3 smartphones.'
  },
  {
    id: 'lot-3',
    title: 'Lot #3 : Robe Bazin Riche Broderie Dorée Royale (Taille L/XL)',
    shortTitle: 'Robe Bazin Riche Broderie',
    category: 'Haute Couture',
    price: 32000,
    originalPrice: 48000,
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    stockLeft: 2,
    badge: '👑 ÉDITION LIMITÉE',
    description: 'Tissu Bazin d’importation teinté à la main avec finitions or.'
  }
];

const INITIAL_SALE_MESSAGES: LiveSaleMessage[] = [
  {
    id: 'm-1',
    type: 'chat',
    senderName: 'Fatou Traoré',
    senderAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80',
    text: 'Est-ce que le coffret karité est disponible en livraison à Zone 4 ?',
    time: '19:40'
  },
  {
    id: 'm-2',
    type: 'purchase',
    senderName: 'Mamadou K.',
    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    text: 'A acheté 1 Lot #1 en 1-Clic Wameet ! 🎉',
    amountFcfa: 18500,
    productId: 'lot-1',
    time: '19:41'
  },
  {
    id: 'm-3',
    type: 'farotage',
    senderName: 'Aminata Bamba',
    senderAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    text: 'A faroté 2 000 FCFA pour soutenir la boutique ! 💸',
    amountFcfa: 2000,
    time: '19:42'
  }
];

/**
 * COMPOSANT LiveShoppingJitsiEngine (Prompt 51 : L'Intégration Jitsi Meet WebRTC Temps Réel)
 *
 * Directives Techniques et UI/UX :
 * 1. Moteur Vidéo Jitsi (Headless / Mode Fantôme) :
 *    - Désactivation totale de l'interface native de Jitsi (zéro bouton Jitsi, zéro logo, zéro filigrane).
 *    - Flux vidéo plein écran w-screen h-screen object-cover z-0.
 * 2. La Surcouche Wameet (z-40, z-50) :
 *    - PhygitalScarcityAlert (Alerte Rareté Magasin physique & Décompte stock).
 *    - RelayShareButton (Affiliation virale 5%).
 *    - Chat de vente interactif & Bulles de commande.
 *    - Bouton "Acheter en 1 Clic via Wameet" et "Marchander".
 * 3. Gestion des Rôles (Vendeur vs Spectateur) :
 *    - Si Vendeur : Contrôles de diffusion caméra/micro (api.executeCommand('toggleAudio'/'toggleVideo')),
 *      sélecteur de lot produit à mettre en avant, déclencheur d'alerte rareté.
 *    - Si Spectateur : Contrôles de diffusion masqués, boutons d'achat impulsif, marchandage et farotage actifs.
 */
export const LiveShoppingJitsiEngine: React.FC<LiveShoppingJitsiEngineProps> = ({
  roomName = 'wameet-live-shopping-studio-1',
  jitsiDomain = 'meet.jit.si',
  title = '🔥 Grande Vente Flash & Direct Live Shopping Wameet',
  sellerName = 'Aïcha Fashion & Bio Cosmetics',
  sellerHandle = '@aicha.fashion.ci',
  sellerAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  isSeller: initialIsSeller = false,
  initialViewers = 1840,
  productLots = DEFAULT_PRODUCT_LOTS,
  isOpen = true,
  onClose,
  className = ''
}) => {
  // ─── Rôle Actuel (avec switch pour tester facilement en direct) ───────────
  const [isSeller, setIsSeller] = useState<boolean>(initialIsSeller);

  // ─── États Vidéo / WebRTC ─────────────────────────────────────────────────
  const [isApiReady, setIsApiReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(!initialIsSeller);
  const [isCamMuted, setIsCamMuted] = useState(!initialIsSeller);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  // ─── États E-Commerce Live ────────────────────────────────────────────────
  const [activeLotIndex, setActiveLotIndex] = useState(0);
  const activeProduct = productLots[activeLotIndex] || productLots[0];

  // ─── États d'Interactivité & Modales ───────────────────────────────────────
  const [viewersCount, setViewersCount] = useState(initialViewers);
  const [likesCount, setLikesCount] = useState(4820);
  const [hasLiked, setHasLiked] = useState(false);
  const [messages, setMessages] = useState<LiveSaleMessage[]>(INITIAL_SALE_MESSAGES);
  const [chatInputText, setChatInputText] = useState('');

  // Modales
  const [isHagglingOpen, setIsHagglingOpen] = useState(false);
  const [isOneClickBuyOpen, setIsOneClickBuyOpen] = useState(false);
  const [isFarotageOpen, setIsFarotageOpen] = useState(false);
  const [isLotSelectorOpen, setIsLotSelectorOpen] = useState(false);

  // Alerte Phygitale (Prompt 13 / Prompt 51)
  const [isScarcityAlertOpen, setIsScarcityAlertOpen] = useState(false);
  const [scarcityStock, setScarcityStock] = useState(activeProduct.stockLeft);

  // Toast Commission Micro-Relais (Prompt 14)
  const [commissionToast, setCommissionToast] = useState<{
    isOpen: boolean;
    amount: number;
    currency: string;
    buyerName: string;
    productName: string;
  }>({
    isOpen: false,
    amount: 0,
    currency: 'FCFA',
    buyerName: '',
    productName: ''
  });

  // États Formulaires Modales
  const [hagglingOfferPrice, setHagglingOfferPrice] = useState(Math.round(activeProduct.price * 0.85));
  const [hagglingMessage, setHagglingMessage] = useState('Je prends immédiatement si vous validez ce tarif !');
  const [buyerPhone, setBuyerPhone] = useState('+226 70 00 11 22');
  const [selectedMobileMoney, setSelectedMobileMoney] = useState<'orange' | 'wave' | 'moov' | 'mtn'>('orange');
  const [isProcessingBuy, setIsProcessingBuy] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  // Références
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ─── 1. Chargement Dynamique du Script Jitsi External API ─────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).JitsiMeetExternalAPI) {
      setIsApiReady(true);
      return;
    }

    const scriptId = 'jitsi-external-api-script';
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener('load', () => setIsApiReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://${jitsiDomain}/external_api.js`;
    script.async = true;
    script.onload = () => setIsApiReady(true);
    script.onerror = () => {
      console.warn('[JITSI ENGINE] Chargement external_api.js en échec, bascule iframe headless.');
      setUseIframeFallback(true);
    };
    document.body.appendChild(script);
  }, [jitsiDomain]);

  // ─── 2. Initialisation Headless Strict (Aucune barre Jitsi) ────────────────
  useEffect(() => {
    if (!isApiReady || !jitsiContainerRef.current || useIframeFallback) return;

    try {
      // Configuration stricte pour effacer 100% de l'UI Jitsi Meet
      const options = {
        roomName: roomName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: !isSeller,
          startWithVideoMuted: !isSeller,
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
          disableInviteFunctions: true,
          doNotStoreRoom: true,
          toolbarButtons: [], // AUCUN BOUTON JITSI
          notifications: [],
          hideConferenceSubject: true,
          hideConferenceTimer: true,
          hideRecordingLabel: true,
          hideParticipantsStats: true,
          disablePolls: true,
          disableReactions: true,
          disableSelfView: false,
          filmstrip: { enabled: false }
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [], // Vide strict
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          SHOW_POWERED_BY: false,
          DEFAULT_BACKGROUND: '#050b14',
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          FILM_STRIP_MAX_HEIGHT: 0,
          DISABLE_RINGING: true,
          SETTINGS_SECTIONS: []
        },
        userInfo: {
          displayName: isSeller ? `${sellerName} (Vendeur)` : 'Spectateur Wameet'
        }
      };

      const api = new (window as any).JitsiMeetExternalAPI(jitsiDomain, options);
      jitsiApiRef.current = api;

      api.addEventListener('videoConferenceJoined', () => {
        setIsConnected(true);
      });

      api.addEventListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
        setIsMicMuted(muted);
      });

      api.addEventListener('videoMuteStatusChanged', ({ muted }: { muted: boolean }) => {
        setIsCamMuted(muted);
      });

      api.addEventListener('readyToClose', () => {
        if (onClose) onClose();
      });

      return () => {
        try {
          api.dispose();
          jitsiApiRef.current = null;
        } catch (e) {
          console.warn('[JITSI ENGINE] Dispose warning :', e);
        }
      };
    } catch (err) {
      console.warn('[JITSI ENGINE] Init API error, bascule fallback iframe :', err);
      setUseIframeFallback(true);
    }
  }, [isApiReady, roomName, jitsiDomain, isSeller, useIframeFallback, onClose, sellerName]);

  // URL Iframe Fallback Headless
  const iframeFallbackSrc = useMemo(() => {
    const cleanRoom = roomName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const hash = [
      'config.prejoinPageEnabled=false',
      'config.disableDeepLinking=true',
      `config.startWithAudioMuted=${!isSeller}`,
      `config.startWithVideoMuted=${!isSeller}`,
      'config.toolbarButtons=[]',
      'interfaceConfig.TOOLBAR_BUTTONS=[]',
      'interfaceConfig.SHOW_JITSI_WATERMARK=false',
      'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
      'interfaceConfig.SHOW_BRAND_WATERMARK=false',
      'interfaceConfig.SHOW_POWERED_BY=false',
      'interfaceConfig.MOBILE_APP_PROMO=false'
    ].join('&');
    return `https://${jitsiDomain}/${cleanRoom}#${hash}`;
  }, [jitsiDomain, roomName, isSeller]);

  // ─── Commandes Vendeur (Contrôles Jitsi WebRTC) ───────────────────────────

  const toggleMic = useCallback(() => {
    playTapBeep();
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
    setIsMicMuted((prev) => !prev);
  }, []);

  const toggleCam = useCallback(() => {
    playTapBeep();
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
    setIsCamMuted((prev) => !prev);
  }, []);

  const flipCamera = useCallback(() => {
    playTapBeep();
    if (jitsiApiRef.current) {
      // Commande native Jitsi pour basculer avant/arrière caméra sur mobile
      jitsiApiRef.current.executeCommand('toggleCamera');
    }
  }, []);

  // Déclencher Alerte Rareté Caisse Magasin
  const triggerScarcityAlert = useCallback(() => {
    playCancelSound();
    setScarcityStock((prev) => Math.max(1, prev - 1));
    setIsScarcityAlertOpen(true);
  }, []);

  // Changer de Lot Produit en Direct
  const handleSelectProductLot = useCallback((index: number) => {
    playValidationBeep();
    setActiveLotIndex(index);
    const chosen = productLots[index];
    setHagglingOfferPrice(Math.round(chosen.price * 0.85));
    setScarcityStock(chosen.stockLeft);
    setIsLotSelectorOpen(false);

    // Annonce dans le chat
    const alertMsg: LiveSaleMessage = {
      id: `announce-${Date.now()}`,
      type: 'chat',
      senderName: sellerName,
      senderAvatar: sellerAvatar,
      text: `📢 LE VENDEUR MET EN AVANT : "${chosen.shortTitle}" à seulement ${chosen.price.toLocaleString('fr-FR')} FCFA !`,
      productId: chosen.id,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, alertMsg]);
  }, [productLots, sellerName, sellerAvatar]);

  // Envoi d'un message spectateur
  const handleSendMessage = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim()) return;

    playTapBeep();
    const newMsg: LiveSaleMessage = {
      id: `msg-${Date.now()}`,
      type: 'chat',
      senderName: isSeller ? sellerName : 'Moi (Spectateur)',
      senderAvatar: isSeller
        ? sellerAvatar
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: chatInputText.trim(),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, newMsg]);
    setChatInputText('');
  }, [chatInputText, isSeller, sellerName, sellerAvatar]);

  // Soumettre une proposition de marchandage
  const handleSubmitHaggling = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    playCashChime();
    setIsHagglingOpen(false);

    const hagglingMsg: LiveSaleMessage = {
      id: `haggle-${Date.now()}`,
      type: 'haggling',
      senderName: 'Client Négociateur',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      text: `🤝 Proposition : ${hagglingOfferPrice.toLocaleString('fr-FR')} FCFA pour ${activeProduct.shortTitle} ("${hagglingMessage}")`,
      amountFcfa: hagglingOfferPrice,
      productId: activeProduct.id,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      status: 'pending'
    };
    setMessages((prev) => [...prev, hagglingMsg]);
  }, [activeProduct, hagglingOfferPrice, hagglingMessage]);

  // Confirmer Achat en 1 Clic Wameet
  const handleConfirmOneClickBuy = useCallback(() => {
    setIsProcessingBuy(true);
    playTapBeep();

    setTimeout(() => {
      setIsProcessingBuy(false);
      setOrderConfirmed(true);
      playValidationBeep();
      playCashChime();

      // Décompte de stock
      setScarcityStock((prev) => Math.max(0, prev - 1));

      // Notification Cha-Ching Micro-Relais (5%)
      const commission = Math.round(activeProduct.price * 0.05);
      setCommissionToast({
        isOpen: true,
        amount: commission,
        currency: 'FCFA',
        buyerName: 'Achat Express Wameet',
        productName: activeProduct.shortTitle
      });

      // Bulle de commande dans le live
      const purchaseMsg: LiveSaleMessage = {
        id: `buy-${Date.now()}`,
        type: 'purchase',
        senderName: 'Client VIP',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        text: `⚡ Acheté en 1-Clic via Wameet Escrow : ${activeProduct.shortTitle} ! 🚀`,
        amountFcfa: activeProduct.price,
        productId: activeProduct.id,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, purchaseMsg]);

      setTimeout(() => {
        setIsOneClickBuyOpen(false);
        setOrderConfirmed(false);
      }, 1800);
    }, 900);
  }, [activeProduct]);

  // Farotage en Direct
  const handleFaroter = useCallback((amount: number) => {
    playCashChime();
    setIsFarotageOpen(false);
    const farotageMsg: LiveSaleMessage = {
      id: `farot-${Date.now()}`,
      type: 'farotage',
      senderName: 'Faroteur Généreux',
      senderAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      text: `💸 A faroté ${amount.toLocaleString('fr-FR')} FCFA en direct au vendeur ! 🎉`,
      amountFcfa: amount,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, farotageMsg]);
  }, []);

  // Défilement automatique du chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 w-screen h-screen overflow-hidden bg-black z-50 select-none ${className}`}>
      {/* =====================================================================
          1. LE MOTEUR VIDÉO JITSI (HEADLESS / MODE FANTÔME) : z-0
          Désactivation 100% de la barre Jitsi, logos, et filigranes.
          w-screen h-screen object-cover z-0.
         ===================================================================== */}
      <div className="absolute inset-0 w-screen h-screen overflow-hidden bg-slate-950 z-0">
        {useIframeFallback ? (
          <iframe
            src={iframeFallbackSrc}
            title="Wameet Jitsi WebRTC Stream"
            className="w-screen h-screen border-0 pointer-events-auto"
            allow="camera; microphone; display-capture; autoplay; clipboard-run; fullscreen"
            allowFullScreen
          />
        ) : (
          <div
            ref={jitsiContainerRef}
            className="w-screen h-screen overflow-hidden pointer-events-auto [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0"
          />
        )}

        {/* Backdrop de connexion WebRTC avec signal de latence < 1s */}
        {!isConnected && !useIframeFallback && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white gap-3 z-10">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <div className="text-center space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Connexion WebRTC Ultra Faible Latence (&lt; 1s)...</span>
              </span>
              <p className="text-[11px] text-slate-400">Canal vidéo direct Jitsi sécurisé</p>
            </div>
          </div>
        )}
      </div>

      {/* Gradients sombres pour le contraste HUD */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />

      {/* =====================================================================
          2. LA SURCOUCHE WAMEET (L'INTERFACE PROPRIÉTAIRE) : z-40 / z-50
         ===================================================================== */}

      {/* ─── A. EN-TÊTE SUPÉRIEUR DU LIVE (z-40) ─────────────────────────── */}
      <header className="absolute top-0 inset-x-0 pt-3 px-4 flex items-center justify-between z-40 pointer-events-auto">
        {/* Profil Vendeur & Badges */}
        <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/15">
          <img
            src={sellerAvatar}
            alt={sellerName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500"
          />
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">{sellerName}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>WEBRTC &lt; 1S</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-emerald-300 font-bold">
              <span>{sellerHandle}</span>
              <span className="text-white/40">•</span>
              <span className="text-amber-300 flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5 fill-amber-300" />
                <span>380ms</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions Droite : Rôle Toggle, Spectateurs, Fermer */}
        <div className="flex items-center gap-2">
          {/* Switch Vendeur/Spectateur pour tester en 1 clic */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsSeller((prev) => !prev);
            }}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition border cursor-pointer active:scale-95 ${
              isSeller
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30'
                : 'bg-white/15 text-white border-white/20 hover:bg-white/25'
            }`}
            title="Basculer entre vue Vendeur et vue Spectateur"
          >
            {isSeller ? '🎬 Vendeur' : '👀 Spectateur'}
          </button>

          {/* Bouton d'Enregistrement d'Écran Local (Prompt 52) */}
          <ScreenRecordButton
            sessionTitle={title}
            variant="pill"
          />

          {/* Compteur Spectateurs */}
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xl px-2.5 py-1 rounded-full border border-white/15 text-white text-[11px] font-bold">
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span>{viewersCount.toLocaleString('fr-FR')}</span>
          </div>

          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (onClose) onClose();
            }}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition cursor-pointer"
            title="Quitter le live"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── B. ALERTE PHYGITALE DE RARETÉ (Prompt 13 & 51) : z-50 ───────── */}
      <PhygitalScarcityAlert
        isOpen={isScarcityAlertOpen}
        productName={activeProduct.shortTitle}
        remainingStock={scarcityStock}
        location="Boutique Physique Ouaga Centre"
        durationMs={5000}
        onClose={() => setIsScarcityAlertOpen(false)}
      />

      {/* ─── C. NOTIFICATION COMMISSION MICRO-RELAIS : z-50 ───────────────── */}
      <CommissionToast
        isOpen={commissionToast.isOpen}
        amount={commissionToast.amount}
        currency={commissionToast.currency}
        buyerName={commissionToast.buyerName}
        productName={commissionToast.productName}
        onClose={() => setCommissionToast((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ─── D. BARRE D'ACTIONS LATÉRALE DROITE (z-40) ─────────────────────── */}
      <div className="absolute right-3.5 bottom-28 flex flex-col items-center gap-3.5 z-40 pointer-events-auto">
        {/* Like Coeurs */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            setLikesCount((p) => p + 1);
            setHasLiked(true);
          }}
          className="flex flex-col items-center gap-1 cursor-pointer active:scale-125 transition"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center border transition ${
              hasLiked
                ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/50'
                : 'bg-black/55 text-white border-white/20 backdrop-blur-xl hover:bg-white/20'
            }`}
          >
            <Heart className={`w-5 h-5 ${hasLiked ? 'fill-white' : ''}`} />
          </div>
          <span className="text-[10px] font-black text-white drop-shadow">
            {likesCount.toLocaleString('fr-FR')}
          </span>
        </button>

        {/* Bouton Viral Micro-Relais (Prompt 14 & 51) */}
        <div className="flex flex-col items-center">
          <RelayShareButton
            liveId={roomName}
            title={title}
            commissionPercentage={5}
            variant="compact"
            className="shadow-xl shadow-emerald-500/30 ring-1 ring-yellow-400/40"
          />
        </div>

        {/* Bouton Farotage (Spectateur) */}
        {!isSeller && (
          <button
            type="button"
            onClick={() => {
              playCashChime();
              setIsFarotageOpen(true);
            }}
            className="flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition"
            title="Faroter le vendeur"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center border border-yellow-200 shadow-lg shadow-amber-500/30">
              <Gift className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-amber-300 drop-shadow">Faroter</span>
          </button>
        )}
      </div>

      {/* ─── E. COCKPIT VENDEUR FLOTTANT (SI HOST) : z-50 ─────────────────── */}
      {isSeller && (
        <div className="absolute top-16 inset-x-4 z-40 flex items-center justify-between gap-2 pointer-events-auto">
          {/* Contrôles Média Vendeur (Caméra & Micro pilotant Jitsi via executeCommand) */}
          <div className="flex items-center gap-2 bg-black/75 backdrop-blur-xl p-1.5 rounded-2xl border border-white/20 shadow-2xl">
            {/* Toggle Micro */}
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2 rounded-xl transition cursor-pointer active:scale-95 ${
                isMicMuted ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
              }`}
              title={isMicMuted ? 'Activer Micro' : 'Couper Micro'}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Toggle Caméra */}
            <button
              type="button"
              onClick={toggleCam}
              className={`p-2 rounded-xl transition cursor-pointer active:scale-95 ${
                isCamMuted ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
              }`}
              title={isCamMuted ? 'Activer Caméra' : 'Couper Caméra'}
            >
              {isCamMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>

            {/* Flip Caméra Avant/Arrière */}
            <button
              type="button"
              onClick={flipCamera}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer active:scale-95"
              title="Changer de caméra (avant/arrière)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Outils Commerciaux Vendeur : Sélecteur de lot & Alerte Rareté Caisse */}
          <div className="flex items-center gap-2">
            {/* Bouton Changer de Lot */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsLotSelectorOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Changer de Lot ({activeLotIndex + 1}/{productLots.length})</span>
            </button>

            {/* Déclencheur Alerte Rareté */}
            <button
              type="button"
              onClick={triggerScarcityAlert}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer active:scale-95"
              title="Simuler une vente en caisse physique"
            >
              <Flame className="w-3.5 h-3.5 fill-amber-300" />
              <span>Alerte Caisse</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── F. ZONE INFÉRIEURE : CHAT EN TEMPS RÉEL + PRODUIT ACTIF + ACHAT 1-CLIC & MARCHANDER : z-40 ── */}
      <div className="absolute bottom-2 inset-x-4 z-40 flex flex-col gap-2.5 max-w-lg pointer-events-auto">
        {/* 1. CHAT DE VENTE INTERACTIF AVEC BULLES DE COMMANDE */}
        <div className="h-36 overflow-y-auto space-y-1.5 pr-2 mask-linear-fade scrollbar-none">
          {messages.map((msg) => {
            if (msg.type === 'purchase') {
              return (
                <div
                  key={msg.id}
                  className="bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-200 text-xs flex items-center gap-2 shadow-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5 fill-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-white mr-1.5">{msg.senderName}</span>
                    <span className="text-[11px]">{msg.text}</span>
                  </div>
                </div>
              );
            }

            if (msg.type === 'haggling') {
              return (
                <div
                  key={msg.id}
                  className="bg-amber-950/80 backdrop-blur-md border border-amber-500/40 px-3 py-1.5 rounded-xl text-amber-200 text-xs flex items-center justify-between gap-2 shadow-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-white mr-1.5">{msg.senderName}</span>
                      <span className="text-[11px] truncate block">{msg.text}</span>
                    </div>
                  </div>
                  {isSeller && (
                    <button
                      type="button"
                      onClick={() => {
                        playCashChime();
                        setMessages((prev) =>
                          prev.map((m) => (m.id === msg.id ? { ...m, status: 'accepted' } : m))
                        );
                      }}
                      className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-black shrink-0 cursor-pointer"
                    >
                      {msg.status === 'accepted' ? '✓ Accepté' : 'Accepter'}
                    </button>
                  )}
                </div>
              );
            }

            if (msg.type === 'farotage') {
              return (
                <div
                  key={msg.id}
                  className="bg-yellow-950/80 backdrop-blur-md border border-yellow-500/40 px-3 py-1.5 rounded-xl text-yellow-200 text-xs flex items-center gap-2 shadow-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center shrink-0">
                    <Gift className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-yellow-300 mr-1.5">{msg.senderName}</span>
                    <span className="text-[11px]">{msg.text}</span>
                  </div>
                </div>
              );
            }

            // Message de chat standard
            return (
              <div
                key={msg.id}
                className="bg-black/55 backdrop-blur-md border border-white/10 px-3 py-1 rounded-xl text-white text-xs flex items-start gap-2"
              >
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderName}
                  className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <span className="font-bold text-slate-300 mr-1.5">{msg.senderName} :</span>
                  <span className="text-white/90">{msg.text}</span>
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Barre d'envoi Chat Rapide */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={chatInputText}
            onChange={(e) => setChatInputText(e.target.value)}
            placeholder="Poser une question en direct..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/20 text-white text-xs placeholder:text-white/50 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95 transition"
            title="Envoyer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* 2. CARTE PRODUIT VEDETTE ÉPINGLÉE AVEC ACHAT 1-CLIC ET MARCHANDER */}
        <div className="bg-slate-900/90 backdrop-blur-2xl p-3 rounded-2xl border border-white/20 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Image et Infos Produit */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/20">
                <img
                  src={activeProduct.imageUrl}
                  alt={activeProduct.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 inset-x-0 bg-red-600 text-white text-[8px] font-black text-center py-0.5">
                  Restant : {scarcityStock}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-black uppercase">
                    EN DIRECT
                  </span>
                  <span className="text-[10px] text-slate-300 font-bold truncate">
                    {activeProduct.category}
                  </span>
                </div>
                <h4 className="text-xs font-black text-white truncate">{activeProduct.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-emerald-400">
                    {activeProduct.price.toLocaleString('fr-FR')} FCFA
                  </span>
                  <span className="text-[10px] text-slate-400 line-through">
                    {activeProduct.originalPrice.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Micro-sélecteur si vendeur */}
            {isSeller && (
              <button
                type="button"
                onClick={() => setIsLotSelectorOpen(true)}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 underline shrink-0 cursor-pointer"
              >
                Changer de lot
              </button>
            )}
          </div>

          {/* 3. LES DEUX BOUTONS CLÉS : ACHETER EN 1 CLIC (WAMEET) & MARCHANDER */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
            {/* Bouton Marchander */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsHagglingOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>🤝 Marchander</span>
            </button>

            {/* Bouton Acheter en 1 Clic Wameet */}
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                setIsOneClickBuyOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/30"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>⚡ Acheter en 1 Clic</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. MODALE "MARCHANDER" (PROPOSITION DE CONTRE-OFFRE DIRECTE)
         ===================================================================== */}
      <AnimatePresence>
        {isHagglingOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Marchander en Direct</h3>
                    <p className="text-[10px] text-slate-500">Proposez votre offre au vendeur en temps réel</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHagglingOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Produit ciblé */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-900">{activeProduct.shortTitle}</div>
                  <div className="text-[10px] text-slate-500">Prix affiché : {activeProduct.price.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <span className="text-xs font-black text-emerald-600">
                  {hagglingOfferPrice.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {/* Slider de proposition */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Votre proposition :</span>
                  <span className="text-amber-600 font-black">{hagglingOfferPrice.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <input
                  type="range"
                  min={Math.round(activeProduct.price * 0.6)}
                  max={activeProduct.price}
                  step={500}
                  value={hagglingOfferPrice}
                  onChange={(e) => setHagglingOfferPrice(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Min : {Math.round(activeProduct.price * 0.6).toLocaleString('fr-FR')} F</span>
                  <span>Prix Live : {activeProduct.price.toLocaleString('fr-FR')} F</span>
                </div>
              </div>

              {/* Message au vendeur */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Petit mot pour convaincre le vendeur :
                </label>
                <input
                  type="text"
                  value={hagglingMessage}
                  onChange={(e) => setHagglingMessage(e.target.value)}
                  placeholder="Ex: Je prends 2 exemplaires si vous validez !"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmitHaggling}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Envoyer ma proposition ({hagglingOfferPrice.toLocaleString('fr-FR')} F)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          4. MODALE "ACHETER EN 1 CLIC VIA WAMEET" (ESCROW 50% OU 100%)
         ===================================================================== */}
      <AnimatePresence>
        {isOneClickBuyOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-emerald-800" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Achat Express 1-Clic Wameet</h3>
                    <p className="text-[10px] text-slate-500">Paiement Mobile Money instantané sous séquestre</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOneClickBuyOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {orderConfirmed ? (
                <div className="py-6 text-center space-y-2 animate-in zoom-in-95">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900">Commande Confirmée !</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Votre achat de <span className="font-bold text-slate-800">{activeProduct.shortTitle}</span> est garanti sous séquestre Wameet.
                  </p>
                </div>
              ) : (
                <>
                  {/* Récapitulatif du produit */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <img
                      src={activeProduct.imageUrl}
                      alt={activeProduct.shortTitle}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-900 truncate">{activeProduct.title}</div>
                      <div className="text-xs font-black text-emerald-600 mt-0.5">
                        {activeProduct.price.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  </div>

                  {/* Choix Mobile Money */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      Payer avec votre portefeuille Mobile Money :
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['orange', 'wave', 'moov', 'mtn'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setSelectedMobileMoney(method);
                          }}
                          className={`py-2 px-1 rounded-xl text-center border text-[11px] font-bold uppercase transition cursor-pointer ${
                            selectedMobileMoney === method
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Numéro de Téléphone */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Numéro de débit Mobile Money :
                    </label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="+226 70 00 11 22"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Rassurance Wameet Escrow */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[10px] text-emerald-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Séquestre Wameet : Les fonds ne sont libérés au vendeur qu’à la réception du colis.</span>
                  </div>

                  {/* Bouton de confirmation */}
                  <button
                    type="button"
                    disabled={isProcessingBuy}
                    onClick={handleConfirmOneClickBuy}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingBuy ? (
                      <span>Sécurisation du paiement...</span>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-white" />
                        <span>Confirmer l'Achat ({activeProduct.price.toLocaleString('fr-FR')} FCFA)</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          5. MODALE SÉLECTEUR DE LOT PRODUIT (POUR LE VENDEUR)
         ===================================================================== */}
      <AnimatePresence>
        {isLotSelectorOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-3.5 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Catalogue Live Shopping</h3>
                    <p className="text-[10px] text-slate-500">Sélectionnez le lot à propulser à l'écran</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLotSelectorOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {productLots.map((lot, idx) => (
                  <button
                    key={lot.id}
                    type="button"
                    onClick={() => handleSelectProductLot(idx)}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer active:scale-95 ${
                      activeLotIndex === idx
                        ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <img
                      src={lot.imageUrl}
                      alt={lot.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-900 truncate">{lot.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-black text-emerald-600">
                          {lot.price.toLocaleString('fr-FR')} FCFA
                        </span>
                        <span className="text-[10px] text-slate-400">Stock : {lot.stockLeft}</span>
                      </div>
                    </div>
                    {activeLotIndex === idx && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black shrink-0">
                        ACTIF
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          6. MODALE FAROTAGE RAPIDE
         ===================================================================== */}
      <AnimatePresence>
        {isFarotageOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Faroter en Direct 💸</h3>
                    <p className="text-[10px] text-slate-500">Envoyez une pluie de bénédictions au live</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFarotageOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2000, 5000, 10000, 25000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleFaroter(amt)}
                    className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 font-black text-xs transition cursor-pointer active:scale-95"
                  >
                    +{amt.toLocaleString('fr-FR')} F
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveShoppingJitsiEngine;
