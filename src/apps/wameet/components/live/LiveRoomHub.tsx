import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../../../../firebaseConfig';
import { 
  doc, getDoc, updateDoc, onSnapshot, collection, addDoc, query, orderBy, limit 
} from 'firebase/firestore';
import { 
  LiveWebinar, LivePlatform, LiveRoomMode, LiveRoomStatus, 
  LiveChatMessage, LivePinnedProduct, InventoryProduct, StoreUser, StoreSubscription 
} from '../../../../types';
import { SmartWaitingRoom } from './SmartWaitingRoom';
import { VideoPlayerWrapper } from './VideoPlayerWrapper';
import { useSubscriptionTimeLimit } from '../../../../hooks/useSubscriptionTimeLimit';
import { SubscriptionPaywallModal } from '../../../../components/SubscriptionPaywallModal';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { 
  Radio, Video, Mic, MicOff, Users, ShoppingBag, MessageSquare, 
  Share2, Heart, Flame, Check, ArrowLeft, ExternalLink, Sparkles, 
  Clock, ShieldCheck, PhoneCall, Send, Pin, PinOff, AlertCircle, 
  RefreshCw, X, ChevronRight, CreditCard, Smartphone, Store,
  Zap, Award, AlertTriangle, Eye, ThumbsUp
} from 'lucide-react';
import { NanasorePaymentGateway, PaymentSuccessDetails } from '../../../../components/payment/NanasorePaymentGateway';

export interface LiveRoomHubProps {
  webinarId: string;
  initialWebinar?: LiveWebinar;
  inventory?: InventoryProduct[];
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onBackToStore?: () => void;
  onOpenNanaGenerator?: () => void;
  className?: string;
}

interface FloatingHeart {
  id: number;
  icon: string;
  x: number; // percentage left
}

export const LiveRoomHub: React.FC<LiveRoomHubProps> = ({
  webinarId,
  initialWebinar,
  inventory = [],
  currentUser,
  subscription,
  onBackToStore,
  onOpenNanaGenerator,
  className = ''
}) => {
  const [webinar, setWebinar] = useState<LiveWebinar | null>(initialWebinar || null);
  const [loading, setLoading] = useState(!initialWebinar);
  const [error, setError] = useState<string | null>(null);

  // Étape de la session : 'WAITING' | 'LIVE' | 'ENDED'
  const [stage, setStage] = useState<'WAITING' | 'LIVE' | 'ENDED'>('WAITING');

  // Onglet interactif inférieur : Shopping direct vs Chat vs Infos
  const [activeTab, setActiveTab] = useState<'SHOPPING' | 'CHAT' | 'INFO'>('SHOPPING');

  // Produit épinglé actuellement à l'écran
  const [pinnedProduct, setPinnedProduct] = useState<LivePinnedProduct | null>(
    initialWebinar?.pinnedProduct || null
  );

  // Messages de chat en direct
  const [messages, setMessages] = useState<LiveChatMessage[]>([
    {
      id: 'm1',
      webinarId,
      senderName: 'Ibrahim Pousbila Konkobo',
      isHost: true,
      message: 'Bienvenue à tous sur notre direct commercial ! Posez vos questions et découvrez les offres exclusives ci-dessous.',
      timestamp: Date.now() - 1000 * 60 * 3,
      type: 'CHAT'
    },
    {
      id: 'm2',
      webinarId,
      senderName: 'Fatoumata D.',
      message: 'Bonjour ! Le stock est-il disponible immédiatement pour livraison à Ouaga ?',
      timestamp: Date.now() - 1000 * 60 * 1,
      type: 'CHAT'
    }
  ]);
  const [newMessageText, setNewMessageText] = useState('');
  const [chatUserName, setChatUserName] = useState(
    currentUser?.name || currentUser?.email?.split('@')[0] || ''
  );

  // Cœurs et réactions flottantes
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  // Modale de commande rapide en direct
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<InventoryProduct | LivePinnedProduct | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);
  const [isNanasoreLivePayOpen, setIsNanasoreLivePayOpen] = useState(false);

  // Copie de lien
  const [copiedLink, setCopiedLink] = useState(false);

  // Détecte si l'utilisateur est l'animateur (Gérant / Admin de la boutique)
  const isHost = useMemo(() => {
    if (!currentUser) return false;
    if (webinar && webinar.merchantId && currentUser.id === webinar.merchantId) return true;
    return (
      currentUser.role === 'GERANT' || 
      currentUser.role === 'ADMIN' || 
      currentUser.role === 'SUPER_ADMIN'
    );
  }, [currentUser, webinar]);

  // Hook de limitation d'abonnement (20 minutes pour les commerçants en version d'essai)
  const timeLimit = useSubscriptionTimeLimit({
    merchantId: webinar?.merchantId || currentUser?.id,
    storeId: webinar?.storeId,
    isHost,
    overrideMaxMinutes: webinar?.maxDurationMinutes || 20,
    onGracefulCutoff: () => {
      setStage('ENDED');
    }
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 1. Abonnement en temps réel aux données du webinaire Firestore
  useEffect(() => {
    if (!webinarId) return;

    let isMounted = true;
    const docRef = doc(db, 'webinars', webinarId);

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = { id: snap.id, ...(snap.data() as any) } as LiveWebinar;
        setWebinar(data);
        if (data.pinnedProduct) {
          setPinnedProduct(data.pinnedProduct);
        }
        if (data.status === 'live') {
          setStage('LIVE');
        } else if (data.status === 'ended') {
          setStage('ENDED');
        }
        setError(null);
      } else {
        // Si document non présent dans Firestore, on utilise un modèle local de secours
        if (!initialWebinar) {
          const fallbackWebinar: LiveWebinar = {
            id: webinarId,
            merchantId: currentUser?.id || 'demo-merchant',
            storeName: 'ENTREPRISE KONKOBO POUSBILA',
            hostName: 'Ibrahim Pousbila Konkobo',
            hostPhone: '+226 70 00 00 00',
            title: 'Vente Flash Live & Déballage Nouveautés',
            description: 'Session interactive en direct : réductions exclusives, présentation des produits et commandes 1-clic par Mobile Money & WhatsApp.',
            date: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
            platform: 'daily',
            roomMode: 'WEBINAR',
            status: 'scheduled',
            createdAt: Date.now()
          };
          setWebinar(fallbackWebinar);
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn("Info connexion Firestore Live:", err);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [webinarId, initialWebinar, currentUser?.id]);

  // Auto-scroll du chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  // Gestion de la transition vers le Live (Verrouillage souverain Nanasore Pay)
  const handleEnterLive = () => {
    if (!isHost && webinar?.isPaid && webinar?.price && webinar.price > 0) {
      const hasPaid = !!localStorage.getItem('nana_paid_webinar_' + webinarId);
      if (!hasPaid) {
        alert("Ce webinaire est payant. Veuillez régler vos frais d'accès via Nanasore Payment Gateway pour entrer.");
        return;
      }
    }
    playValidationBeep();
    setStage('LIVE');
  };

  const handleStartBroadcast = async () => {
    playValidationBeep();
    setStage('LIVE');
    if (webinarId) {
      try {
        await updateDoc(doc(db, 'webinars', webinarId), {
          status: 'live',
          startedAt: Date.now()
        });
      } catch (e) {
        console.warn("Mise à jour Firestore de démarrage live:", e);
      }
    }
  };

  const handleEndBroadcast = async () => {
    const confirmEnd = window.confirm("Êtes-vous sûr de vouloir clôturer ce live pour tous les participants ?");
    if (!confirmEnd) return;

    playTapBeep();
    setStage('ENDED');
    if (webinarId) {
      try {
        await updateDoc(doc(db, 'webinars', webinarId), {
          status: 'ended',
          endedAt: Date.now()
        });
      } catch (e) {
        console.warn("Mise à jour Firestore de fin de live:", e);
      }
    }
  };

  // Épingler / Désépingler un produit à l'écran
  const handleTogglePinProduct = async (product: InventoryProduct | LivePinnedProduct) => {
    playTapBeep();
    const isAlreadyPinned = pinnedProduct?.id === product.id;
    const newPinned: LivePinnedProduct | null = isAlreadyPinned ? null : {
      id: product.id,
      name: product.name,
      price: 'sellingPrice' in product ? product.sellingPrice : product.price,
      photoUrl: product.photoUrl,
      storeId: product.storeId,
    };

    setPinnedProduct(newPinned);

    if (webinarId) {
      try {
        await updateDoc(doc(db, 'webinars', webinarId), {
          pinnedProduct: newPinned
        });
      } catch (e) {
        console.warn("Sync Firestore pinned product:", e);
      }
    }
  };

  // Envoi de message dans le chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    playTapBeep();

    const author = chatUserName.trim() || (isHost ? 'Animateur' : 'Spectateur');
    const msg: LiveChatMessage = {
      id: `msg-${Date.now()}`,
      webinarId,
      senderName: author,
      isHost,
      message: newMessageText.trim(),
      timestamp: Date.now(),
      type: 'CHAT'
    };

    setMessages(prev => [...prev, msg]);
    setNewMessageText('');
  };

  // Envoi d'une réaction flottante (Cœur, Flamme, etc.)
  const handleSendReaction = (icon: string = '❤️') => {
    playTapBeep();
    const id = Date.now() + Math.random();
    const x = Math.floor(Math.random() * 60) + 20; // 20% à 80% horizontal
    setFloatingHearts(prev => [...prev, { id, icon, x }]);

    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 2400);
  };

  // Copie de lien de partage
  const handleCopyLink = async () => {
    playTapBeep();
    const url = typeof window !== 'undefined' ? window.location.href : `https://nanasore.com/live/${webinarId}`;
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: webinar?.title || 'Nanasore Live Shopping',
          url: url,
        });
        return;
      } catch (err) {}
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Initialisation de la commande rapide
  const handleOpenOrder = (product: InventoryProduct | LivePinnedProduct) => {
    playTapBeep();
    setSelectedProductForOrder(product);
    setOrderQuantity(1);
    setOrderSuccessMessage(null);
  };

  const handleConfirmOrderWhatsApp = () => {
    if (!selectedProductForOrder) return;
    playValidationBeep();

    const price = 'sellingPrice' in selectedProductForOrder 
      ? selectedProductForOrder.sellingPrice 
      : selectedProductForOrder.price;
    const total = price * orderQuantity;

    const phone = webinar?.hostPhone || '+22670000000';
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const text = `👋 *COMMANDE EN DIRECT LIVE SHOPPING*\n` +
      `--------------------------------\n` +
      `📦 Produit : *${selectedProductForOrder.name}*\n` +
      `🔢 Quantité : *${orderQuantity}*\n` +
      `💰 Total : *${formatCFA(total)}*\n` +
      `🎥 Événement : ${webinar?.title || 'Live Nana'}\n` +
      `--------------------------------\n` +
      `Merci de confirmer ma commande et mes modalités de livraison.`;

    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');

    setOrderSuccessMessage("Redirection vers WhatsApp pour validation de votre commande...");
    setTimeout(() => {
      setSelectedProductForOrder(null);
      setOrderSuccessMessage(null);
    }, 3000);
  };

  // Produits disponibles pour le live (inventaire ou fallback démo)
  const displayProducts: (InventoryProduct | LivePinnedProduct)[] = useMemo(() => {
    if (inventory && inventory.length > 0) return inventory;
    return [
      {
        id: 'prod-live-1',
        name: 'Smartphone Infinix Hot 40 Pro (128GB)',
        price: 95000,
        photoUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=400&q=80',
        description: 'Écran 90Hz, 8GB RAM étendue, Caméra 50MP avec garantie constructeur.',
      },
      {
        id: 'prod-live-2',
        name: 'Écouteurs Sans-Fil TWS Bass Pro',
        price: 15000,
        photoUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=400&q=80',
        description: 'Réduction de bruit passive, autonomie 24h avec boîtier rechargeable.',
      },
      {
        id: 'prod-live-3',
        name: 'Powerbank Solaire 20 000 mAh Ultra-Charge',
        price: 22000,
        photoUrl: 'https://images.unsplash.com/photo-1609592424075-8164b38d3ca2?auto=format&fit=crop&w=400&q=80',
        description: 'Lampe torche intégrée, résistant aux chocs et double port USB Fast Charge.',
      }
    ];
  }, [inventory]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#070b14] flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-12 h-12 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">Connexion au Hub Live...</p>
      </div>
    );
  }

  if (error || !webinar) {
    return (
      <div className="min-h-screen w-full bg-[#070b14] flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Live indisponible</h2>
          <p className="text-xs text-slate-400">{error || "Cet événement n'existe pas ou a expiré."}</p>
          {onBackToStore && (
            <button
              type="button"
              onClick={onBackToStore}
              className="mt-4 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
            >
              Retour à la boutique
            </button>
          )}
        </div>
      </div>
    );
  }

  // Si on est en salle d'attente
  if (stage === 'WAITING') {
    return (
      <div className={`min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col ${className}`}>
        {/* Navigation supérieure de la salle d'attente */}
        <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBackToStore && (
              <button
                type="button"
                onClick={() => { playTapBeep(); onBackToStore(); }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Boutique</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <Store className="w-4 h-4 text-indigo-400" />
              <span>{webinar.storeName || 'ENTREPRISE KONKOBO POUSBILA'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-700 min-h-[44px]"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{copiedLink ? "Lien copié !" : "Partager"}</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <SmartWaitingRoom
            webinarId={webinarId}
            title={webinar.title}
            description={webinar.description}
            date={webinar.date}
            status={webinar.status}
            roomMode={webinar.roomMode || 'WEBINAR'}
            hostName={webinar.hostName || 'Ibrahim Pousbila Konkobo'}
            storeName={webinar.storeName || 'ENTREPRISE KONKOBO POUSBILA'}
            hostPhone={webinar.hostPhone || '+226 70 00 00 00'}
            hostAvatarUrl={webinar.hostAvatarUrl}
            isHost={isHost}
            isPaid={webinar.isPaid}
            price={webinar.price}
            currency={webinar.currency}
            platform={webinar.platform}
            meetingUrl={webinar.meetingUrl}
            onEnterLive={handleEnterLive}
            onStartBroadcast={handleStartBroadcast}
            onShareLink={handleCopyLink}
          />
        </main>
      </div>
    );
  }

  // Si le live est clôturé
  if (stage === 'ENDED' || timeLimit.isCutoff) {
    return (
      <div className={`min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 ${className}`}>
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">Diffusion terminée</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {timeLimit.isCutoff 
                ? "La session de démonstration gratuite de 20 minutes est arrivée à son terme."
                : "Merci d'avoir participé à ce live shopping avec nous !"}
            </p>
          </div>

          {timeLimit.isCutoff && isHost && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/30 text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                <Zap className="w-4 h-4" />
                <span>Passez au Forfait Pro / Illimité</span>
              </div>
              <p className="text-xs text-slate-300">
                Diffusez sans aucune limite de temps, avec multi-caméras et encaissement direct Mobile Money.
              </p>
              <button
                type="button"
                onClick={() => timeLimit.setShowUpgradePaywall(true)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg"
              >
                Activer le Forfait Pro
              </button>
            </div>
          )}

          <div className="pt-2 space-y-2">
            {onBackToStore && (
              <button
                type="button"
                onClick={onBackToStore}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl transition cursor-pointer min-h-[44px]"
              >
                Visiter le catalogue de la boutique
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-2xl transition"
            >
              {copiedLink ? "Lien copié !" : "Partager la boutique"}
            </button>
          </div>
        </div>

        {/* Modal d'abonnement / Paywall */}
        {timeLimit.showUpgradePaywall && (
          <SubscriptionPaywallModal
            isOpen={timeLimit.showUpgradePaywall}
            onClose={() => timeLimit.setShowUpgradePaywall(false)}
            currentUser={currentUser}
            storeId={webinar?.storeId}
            storeName={webinar?.storeName}
            subscription={subscription}
          />
        )}
      </div>
    );
  }

  // STAGE : 'LIVE' (Diffusion Active en Plein Écran / Grille Responsive)
  return (
    <div className={`min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col font-sans select-none overflow-hidden ${className}`}>
      {/* 1. Barre Supérieure Blottie & Épurée (100% White-Label, Zéro Logo Tiers) */}
      <header className="shrink-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 py-2.5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          {onBackToStore && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onBackToStore(); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold min-h-[40px]"
              title="Retour à la boutique"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Boutique</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[11px] font-black tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>EN DIRECT</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-white">
              <span className="text-slate-400">|</span>
              <span className="truncate max-w-[200px]">{webinar.title}</span>
            </div>
          </div>
        </div>

        {/* Indicateurs : Spectateurs, Chrono d'abonnement & Actions Hôte */}
        <div className="flex items-center gap-2">
          {/* Compteur de spectateurs */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 rounded-full text-xs font-bold text-slate-300">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>{webinar.viewerCount || 42}</span>
          </div>

          {/* Badge temps restant abonnement */}
          {!timeLimit.isUnlimited && (
            <div 
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border transition ${
                timeLimit.isWarning1Min 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                  : timeLimit.isWarning5Min 
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
              title="Temps de live restant pour ce créneau"
            >
              <Clock className="w-3 h-3" />
              <span>{timeLimit.formattedRemaining}</span>
            </div>
          )}

          {/* Action pour l'Hôte : Clôturer le live */}
          {isHost && (
            <button
              type="button"
              onClick={handleEndBroadcast}
              className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-extrabold transition cursor-pointer min-h-[38px] flex items-center gap-1"
            >
              <span>Terminer</span>
            </button>
          )}

          {/* Bouton Partager */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition border border-slate-700 min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Partager le direct"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </header>

      {/* Avertissement d'abonnement flottant (5 min et 1 min) */}
      {(timeLimit.isWarning5Min || timeLimit.isWarning1Min) && !timeLimit.isCutoff && (
        <div className={`px-4 py-2 text-xs font-black text-center flex items-center justify-between shrink-0 z-20 ${
          timeLimit.isWarning1Min ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
        }`}>
          <div className="flex items-center gap-2 mx-auto">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {timeLimit.isWarning1Min 
                ? `Attention : Plus que ${timeLimit.formattedRemaining} avant la fin de la session d'essai gratuite !` 
                : `Rappel : Il reste ${timeLimit.formattedRemaining} sur cette session de démonstration.`}
            </span>
          </div>
          {isHost && (
            <button
              type="button"
              onClick={() => timeLimit.setShowUpgradePaywall(true)}
              className="ml-2 underline font-extrabold text-[11px] uppercase shrink-0"
            >
              Passer Pro
            </button>
          )}
        </div>
      )}

      {/* 2. Cœur de l'application : Grille Vidéo + Panneau Commerce & Chat */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Colonne Gauche (Mobile : Haut) : Le Lecteur Vidéo */}
        <div className="w-full lg:w-3/5 xl:w-2/3 flex flex-col bg-black justify-center relative shrink-0 lg:shrink">
          <div className="w-full relative">
            <VideoPlayerWrapper
              platform={webinar.platform}
              streamUrl={webinar.meetingUrl || webinar.socialStreamUrl}
              dailyRoomUrl={webinar.dailyRoomUrl}
              isHost={isHost}
              userName={currentUser?.name || 'Spectateur'}
              pinnedProduct={pinnedProduct}
              onOrderPinnedProduct={handleOpenOrder}
              onLeaveLive={onBackToStore}
              isCutoff={timeLimit.isCutoff}
              aspectRatio={webinar.aspectRatio || '16:9'}
              resolution={webinar.resolution || '720p'}
            />

            {/* Réactions Flottantes animées (Burst de cœurs) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              {floatingHearts.map((h) => (
                <div
                  key={h.id}
                  className="absolute bottom-12 text-2xl sm:text-3xl animate-bounce"
                  style={{
                    left: `${h.x}%`,
                    animation: 'floatUp 2.2s ease-out forwards',
                  }}
                >
                  {h.icon}
                </div>
              ))}
            </div>

            {/* Bouton Réaction Flottante mobile */}
            <button
              type="button"
              onClick={() => handleSendReaction('❤️')}
              className="absolute bottom-4 right-4 z-20 w-11 h-11 rounded-full bg-rose-600/80 hover:bg-rose-500 backdrop-blur-md text-white shadow-xl flex items-center justify-center active:scale-125 transition cursor-pointer"
              title="Envoyer un cœur"
            >
              <Heart className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>

        {/* Colonne Droite (Mobile : Bas) : Le Hub d'Interaction (Shopping, Chat, Infos) */}
        <div className="flex-1 flex flex-col bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 overflow-hidden">
          {/* Navigation des Onglets */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950/60 shrink-0">
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('SHOPPING'); }}
              className={`flex-1 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] ${
                activeTab === 'SHOPPING'
                  ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Offres Live</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {displayProducts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('CHAT'); }}
              className={`flex-1 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] ${
                activeTab === 'CHAT'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat & Q&A</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {messages.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveTab('INFO'); }}
              className={`py-3 px-4 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer min-h-[44px] ${
                activeTab === 'INFO'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Infos</span>
            </button>
          </div>

          {/* Contenu Onglet 1 : Catalogue & Offres Directes */}
          {activeTab === 'SHOPPING' && (
            <div className="flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-4 space-y-3">
              {/* Bannière Produit en vedette si épinglé */}
              {pinnedProduct && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/50 via-slate-900 to-indigo-950/50 border-2 border-rose-500/60 shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                      <Flame className="w-3 h-3" />
                      Offre Actuellement en Direct
                    </span>
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => handleTogglePinProduct(pinnedProduct)}
                        className="text-[11px] font-bold text-rose-400 hover:underline flex items-center gap-1"
                      >
                        <PinOff className="w-3 h-3" />
                        <span>Désépingler</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {pinnedProduct.photoUrl && (
                      <img 
                        src={pinnedProduct.photoUrl} 
                        alt={pinnedProduct.name} 
                        className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0" 
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {pinnedProduct.name}
                      </h4>
                      <p className="text-sm sm:text-base font-black text-rose-400">
                        {formatCFA(pinnedProduct.price)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenOrder(pinnedProduct)}
                    className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer min-h-[44px]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Commander en Direct (WhatsApp / Mobile Money)</span>
                  </button>
                </div>
              )}

              {/* Liste de tous les produits du catalogue live */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                  Articles présentés pendant l'émission ({displayProducts.length})
                </p>

                {displayProducts.map((prod) => {
                  const price = 'sellingPrice' in prod ? prod.sellingPrice : prod.price;
                  const isThisPinned = pinnedProduct?.id === prod.id;

                  return (
                    <div
                      key={prod.id}
                      className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {prod.photoUrl ? (
                          <img 
                            src={prod.photoUrl} 
                            alt={prod.name} 
                            className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0" 
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{prod.name}</h4>
                          <p className="text-xs font-black text-emerald-400">{formatCFA(price)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isHost && (
                          <button
                            type="button"
                            onClick={() => handleTogglePinProduct(prod)}
                            className={`p-2 rounded-xl border transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
                              isThisPinned 
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title={isThisPinned ? "Retirer de l'écran" : "Épingler à l'écran"}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenOrder(prod)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1 transition cursor-pointer min-h-[40px]"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Acheter</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contenu Onglet 2 : Chat en Direct & Q&A */}
          {activeTab === 'CHAT' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Flux de messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-300">{m.senderName}</span>
                      {m.isHost && (
                        <span className="px-1.5 py-0.2 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[9px] font-black uppercase">
                          Hôte
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 leading-relaxed">
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Barre de réactions rapides */}
              <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-around">
                {['❤️', '🔥', '👏', '💰', '🚀', '😍'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="p-1 hover:scale-125 active:scale-95 transition text-lg cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Saisie de message */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Écrivez un message ou posez une question..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none min-h-[44px]"
                />
                <button
                  type="submit"
                  className="px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center min-h-[44px] cursor-pointer"
                  title="Envoyer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Contenu Onglet 3 : Infos & Présentation */}
          {activeTab === 'INFO' && (
            <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                  <Store className="w-4 h-4" />
                  <span>Organisé par</span>
                </div>
                <h3 className="text-base font-black text-white">{webinar.storeName || 'ENTREPRISE KONKOBO POUSBILA'}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{webinar.description}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Animateur Certifié</span>
                </div>
                <p className="text-xs text-white font-bold">{webinar.hostName || 'Ibrahim Pousbila Konkobo'}</p>
                <a
                  href={`https://api.whatsapp.com/send?phone=${encodeURIComponent((webinar.hostPhone || '+22670000000').replace(/[^0-9]/g, ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  <span>Contacter sur WhatsApp Direct</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modale / Tiroir de Commande Rapide en Direct */}
      {selectedProductForOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white">Commander en Direct</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForOrder(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {orderSuccessMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-emerald-300">{orderSuccessMessage}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  {selectedProductForOrder.photoUrl && (
                    <img 
                      src={selectedProductForOrder.photoUrl} 
                      alt={selectedProductForOrder.name} 
                      className="w-14 h-14 rounded-xl object-cover shrink-0" 
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-extrabold text-white truncate">{selectedProductForOrder.name}</h4>
                    <p className="text-sm font-black text-emerald-400">
                      {formatCFA('sellingPrice' in selectedProductForOrder ? selectedProductForOrder.sellingPrice : selectedProductForOrder.price)}
                    </p>
                  </div>
                </div>

                {/* Sélecteur de Quantité */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Quantité</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                      className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center min-h-[32px]"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-white w-6 text-center">{orderQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setOrderQuantity(orderQuantity + 1)}
                      className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center min-h-[32px]"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-300">
                  <span>Total à régler :</span>
                  <span className="text-base font-black text-emerald-400">
                    {formatCFA(
                      ('sellingPrice' in selectedProductForOrder ? selectedProductForOrder.sellingPrice : selectedProductForOrder.price) * orderQuantity
                    )}
                  </span>
                </div>

                {/* Options d'encaissement direct */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmOrderWhatsApp}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 transition cursor-pointer min-h-[48px]"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Valider la Commande via WhatsApp Direct</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setIsNanasoreLivePayOpen(true); }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 transition cursor-pointer min-h-[44px]"
                  >
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span>Payer par Mobile Money (Orange / Moov / Wave / MTN)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. Modale de mise à niveau Forfait Pro (en cas d'expiration du quota démo de 20 min) */}
      {timeLimit.showUpgradePaywall && (
        <SubscriptionPaywallModal
          isOpen={timeLimit.showUpgradePaywall}
          onClose={() => timeLimit.setShowUpgradePaywall(false)}
          currentUser={currentUser}
          storeId={webinar?.storeId}
          storeName={webinar?.storeName}
          subscription={subscription}
        />
      )}

      {/* 5. Passerelle de Paiement Universelle Nanasore Pay pour Live / Webinaires (Règle 3) */}
      {isNanasoreLivePayOpen && selectedProductForOrder && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[95vh] overflow-y-auto bg-white rounded-3xl shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsNanasoreLivePayOpen(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <NanasorePaymentGateway
              amount={('sellingPrice' in selectedProductForOrder ? selectedProductForOrder.sellingPrice : selectedProductForOrder.price) * orderQuantity}
              productType="physical"
              currency="FCFA"
              orderDescription={`Commande Live : ${selectedProductForOrder.name} (x${orderQuantity})`}
              isModal={true}
              onSuccess={(details) => {
                playValidationBeep();
                setOrderSuccessMessage(`🎉 Paiement validé par SMS (${details.transactionId}) ! Votre commande a été validée avec succès.`);
                setIsNanasoreLivePayOpen(false);
              }}
              onCancel={() => setIsNanasoreLivePayOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Bouton d'édition rapide Funnel Builder / NaNaGénérateur pour Animateur / Gérant */}
      <button
        type="button"
        onClick={() => {
          playTapBeep();
          if (onOpenNanaGenerator) {
            onOpenNanaGenerator();
          } else if (typeof window !== 'undefined') {
            window.location.href = '/ai-studio?source=live&edit=live-room';
          }
        }}
        className="fixed bottom-4 right-4 z-50 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-2xl shadow-purple-500/40 border border-purple-400/40 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
        title="Ouvrir NaNaGénérateur & Funnel Builder"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span>NaNaGénérateur (Funnel Builder)</span>
      </button>
    </div>
  );
};

export default LiveRoomHub;
