import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Share2,
  GraduationCap,
  ShoppingBag,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  Lock,
  Mic,
  PhoneOff,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LiveSession, HandRaisedUser } from '../../../types/liveSession';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { StoreUser } from '../../../types';
import {
  getLiveSessionBySlug,
  subscribeLiveSession,
  updatePinnedProduct,
  getSavedLiveRoomConfig,
  updateLiveRoomConfig,
  subscribeLiveRoomConfig,
  hasLocalLiveEnrollment,
  FALLBACK_LIVE_SESSION,
} from '../../../services/liveSessionService';
import {
  createLiveStageSpeechChannel,
  type StageSpeechInvite,
} from '../../../services/liveStageSpeechService';
import {
  createLiveAuctionChannel,
  getSavedLiveAuction,
  type LiveAuctionState,
  type LiveAuctionBid,
} from '../../../services/liveAuctionService';
import {
  captureAffiliateReferralFromUrl,
  type AffiliateAttribution,
} from '../../../services/liveAffiliateService';
import { NanasoreOmniPlayer } from '../../../components/live/NanasoreOmniPlayer';
import { WhipLiveBroadcaster } from '../../../components/live/WhipLiveBroadcaster';
import { NanasoreLiveCommerceOverlay } from '../../../components/live/NanasoreLiveCommerceOverlay';
import { LiveProductCarousel } from '../../../components/live/LiveProductCarousel';
import { LiveClassroomInteractivePanel, LivePanelTab } from '../../../components/live/LiveClassroomInteractivePanel';
import { LiveInstructorControlBar } from '../../../components/live/LiveInstructorControlBar';
import { LiveShareModal } from '../../../components/live/LiveShareModal';
import { LiveMultistreamStudioModal } from '../../../components/live/LiveMultistreamStudioModal';
import { LiveSubscribeButton } from '../../../components/live/LiveSubscribeButton';
import { Live1to1BookingModal } from '../components/live/Live1to1BookingModal';
import { LiveAccessGate } from '../components/live/LiveAccessGate';
import { LiveAuctionWidget } from '../components/live/LiveAuctionWidget';
import { LiveAffiliatePayoutModal } from '../components/live/LiveAffiliatePayoutModal';
import { NativeCoaching1to1Room } from '../components/live/NativeCoaching1to1Room';
import { SlideOutFunnelDrawer } from '../../../components/SlideOutFunnelDrawer';
import { loadStoreMultistreamConfig } from '../../../services/liveMultistreamService';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface PublicLiveSessionPageProps {
  sessionSlug?: string;
  initialSession?: LiveSession;
  isHost?: boolean;
  currentUser?: StoreUser | null;
  onBackToStore?: () => void;
}

export const PublicLiveSessionPage: React.FC<PublicLiveSessionPageProps> = ({
  sessionSlug,
  initialSession,
  isHost: initialIsHost = false,
  currentUser,
  onBackToStore,
}) => {
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (ZÉRO ERREUR #310)
  const resolvedSlug = useMemo(() => {
    if (sessionSlug) return sessionSlug;
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/live/')) {
        const parts = pathname.split('/live/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('live') || params.get('session') || 'masterclass-direct';
    }
    return 'masterclass-direct';
  }, [sessionSlug]);

  const [session, setSession] = useState<LiveSession>(initialSession || FALLBACK_LIVE_SESSION);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState<string>('');
  const [hasUnlockedPaidAccess, setHasUnlockedPaidAccess] = useState<boolean>(() =>
    hasLocalLiveEnrollment(initialSession?.id || resolvedSlug)
  );

  // Affiliation : capture automatique du lien de parrainage (?ref=CODE)
  const [affiliateAttribution, setAffiliateAttribution] = useState<AffiliateAttribution | null>(null);

  // Prise de parole Audio/Visio WebRTC native
  const [pendingStageInvite, setPendingStageInvite] = useState<StageSpeechInvite | null>(null);
  const [activeStageRoom, setActiveStageRoom] = useState<{
    roomId: string;
    label: string;
    mode: 'audio' | 'video';
  } | null>(null);
  const stageChannelRef = useRef<ReturnType<typeof createLiveStageSpeechChannel> | null>(null);

  // Vente aux Enchères en Direct (Mode Live Shopping)
  const [activeAuction, setActiveAuction] = useState<LiveAuctionState | null>(null);
  const auctionChannelRef = useRef<ReturnType<typeof createLiveAuctionChannel> | null>(null);
  const activeAuctionRef = useRef<LiveAuctionState | null>(null);

  // Identifiant unique du spectateur/enchérisseur courant
  const viewerClientId = useMemo(() => {
    if (currentUser?.id) return currentUser.id;
    if (typeof window !== 'undefined') {
      const key = 'nana_live_viewer_uid';
      let id = sessionStorage.getItem(key);
      if (!id) {
        id = `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        sessionStorage.setItem(key, id);
      }
      return id;
    }
    return 'viewer_anon';
  }, [currentUser?.id]);

  useEffect(() => {
    activeAuctionRef.current = activeAuction;
  }, [activeAuction]);

  useEffect(() => {
    const attr = captureAffiliateReferralFromUrl(resolvedSlug);
    setAffiliateAttribution(attr);
  }, [resolvedSlug]);

  // Vérification de session Supabase Auth en arrière-plan
  useEffect(() => {
    let isMounted = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (isMounted && data?.user) {
          setSupabaseUser(data.user);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Séparation stricte des domaines :
  // - nsore.shop => STRICTEMENT réservé aux spectateurs / acheteurs / étudiants (jamais de console studio)
  // - nanasore.com => réservé aux formateurs / animateurs / vendeurs authentifiés
  const isPublicSpectatorDomain = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname.toLowerCase();
    return h === 'nsore.shop' || h.endsWith('.nsore.shop');
  }, []);

  const isVerifiedHost = useMemo(() => {
    if (isPublicSpectatorDomain) return false;
    if (initialIsHost) return true;
    const ownerStoreId = session.storeId || '';
    if (currentUser) {
      if (currentUser.role === 'SUPER_ADMIN') return true;
      if (ownerStoreId && (currentUser.id === ownerStoreId || currentUser.storeId === ownerStoreId)) return true;
    }
    if (supabaseUser) {
      const meta = supabaseUser.user_metadata || {};
      if (meta.role === 'SUPER_ADMIN') return true;
      if (
        ownerStoreId &&
        (supabaseUser.id === ownerStoreId ||
          meta.tenant_id === ownerStoreId ||
          meta.store_id === ownerStoreId)
      ) {
        return true;
      }
    }
    return false;
  }, [isPublicSpectatorDomain, initialIsHost, currentUser, supabaseUser, session.storeId]);

  const [isPreviewingAsSpectator, setIsPreviewingAsSpectator] = useState<boolean>(false);
  const isHostMode = isVerifiedHost && !isPreviewingAsSpectator;

  const [activeClassroomTab, setActiveClassroomTab] = useState<LivePanelTab>('chat');
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isHostBroadcasterActive, setIsHostBroadcasterActive] = useState<boolean>(false);
  const [isMultistreamModalOpen, setIsMultistreamModalOpen] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isAffiliatePayoutModalOpen, setIsAffiliatePayoutModalOpen] = useState<boolean>(false);

  // Mode visuel de la salle : 'classroom' (Salle de Cours épurée) ou 'live_shopping' (Produits Physiques)
  const roomMode: 'classroom' | 'live_shopping' =
    session.sessionMode === 'live_shopping' ? 'live_shopping' : 'classroom';

  const liveStreamSlug = useMemo(
    () => resolvedSlug || session.sessionSlug || session.storeId || session.id,
    [resolvedSlug, session.sessionSlug, session.storeId, session.id]
  );

  const resolvedWhatsAppJoinHref = useMemo(() => {
    const raw = (whatsappChannelUrl || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const digits = raw.replace(/[^0-9]/g, '');
    return digits ? `https://wa.me/${digits}` : '';
  }, [whatsappChannelUrl]);

  // Chargement de la session + préférences runtime (mode salle, sas payant & enchère)
  useEffect(() => {
    let isMounted = true;
    getLiveSessionBySlug(resolvedSlug).then((res) => {
      if (isMounted && res) {
        const savedCfg = getSavedLiveRoomConfig(res.id);
        setSession({ ...res, ...savedCfg });
        setHasUnlockedPaidAccess(hasLocalLiveEnrollment(res.id));
        const savedAuction = getSavedLiveAuction(res.id);
        if (savedAuction) setActiveAuction(savedAuction);
      }
    });

    loadStoreMultistreamConfig(resolvedSlug)
      .then((cfg) => {
        if (isMounted && cfg?.whatsappChannelUrl) {
          setWhatsappChannelUrl(cfg.whatsappChannelUrl);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [resolvedSlug]);

  // Balises OpenGraph dynamiques
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const ogTitle = `EN DIRECT — ${session.storeName} | ${session.title}`;
    document.title = ogTitle;
    const setMeta = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', prop);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('og:title', ogTitle);
    setMeta(
      'og:description',
      session.description || `Suivez la session en direct de ${session.storeName} sur Nanasore.`
    );
    if (session.posterUrl) setMeta('og:image', session.posterUrl);
    setMeta('og:type', 'video.other');
  }, [session.storeName, session.title, session.description, session.posterUrl]);

  // Abonnements temps réel : Session, Config salle, Prise de parole Audio/Visio, Enchères
  useEffect(() => {
    if (!session?.id) return;

    const unsubSession = subscribeLiveSession(session.id, (updated) => {
      setSession((prev) => ({ ...prev, ...updated }));
    });
    const unsubCfg = subscribeLiveRoomConfig(session.id, (cfg) => {
      setSession((prev) => ({ ...prev, ...cfg }));
    });

    const stageChannel = createLiveStageSpeechChannel(session.id, {
      onInvite: (invite) => {
        if (isHostMode) return;
        const myName =
          (typeof window !== 'undefined' && localStorage.getItem('nana_live_participant_name')) || '';
        const normTarget = (invite.targetName || '').trim().toLowerCase();
        const normMe = myName.trim().toLowerCase();
        if (!normTarget || !normMe || normTarget === normMe) {
          playValidationBeep();
          setPendingStageInvite(invite);
        }
      },
      onStageEnded: ({ roomId }) => {
        setActiveStageRoom((prev) => (prev?.roomId === roomId ? null : prev));
        setPendingStageInvite((prev) => (prev?.roomId === roomId ? null : prev));
      },
    });
    stageChannelRef.current = stageChannel;

    const auctionChannel = createLiveAuctionChannel(session.id, {
      onAuctionSync: (auction) => {
        setActiveAuction(auction);
      },
      onBidPlaced: (bid) => {
        setActiveAuction((prev) => {
          if (!prev || prev.id !== bid.auctionId || prev.status !== 'active') return prev;
          if (bid.amount <= prev.currentPrice && prev.bidsCount > 0) return prev;
          const updated: LiveAuctionState = {
            ...prev,
            currentPrice: bid.amount,
            highestBidderId: bid.bidderId,
            highestBidderName: bid.bidderName,
            bidsCount: prev.bidsCount + 1,
            recentBids: [bid, ...(prev.recentBids || [])].slice(0, 10),
          };
          return updated;
        });
      },
    });
    auctionChannelRef.current = auctionChannel;

    return () => {
      unsubSession();
      unsubCfg();
      stageChannel.cleanup();
      stageChannelRef.current = null;
      auctionChannel.cleanup();
      auctionChannelRef.current = null;
    };
  }, [session?.id, isHostMode]);

  // Bascule 1-Clic Mode Salle de Cours <-> Live Shopping Produits Physiques
  const handleChangeRoomMode = useCallback(
    async (mode: 'classroom' | 'live_shopping') => {
      if (!isVerifiedHost) return;
      const nextSessionMode = mode === 'live_shopping' ? 'live_shopping' : 'interactive_class';
      setSession((prev) => ({ ...prev, sessionMode: nextSessionMode }));
      await updateLiveRoomConfig(session.id, { sessionMode: nextSessionMode });
    },
    [isVerifiedHost, session.id]
  );

  // Mise à jour du Sas Payant / Adhésion VIP par le formateur
  const handleUpdateAccessGate = useCallback(
    async (cfg: { isPaid: boolean; accessPrice: number; accessLabel: string }) => {
      if (!isVerifiedHost) return;
      setSession((prev) => ({ ...prev, ...cfg }));
      await updateLiveRoomConfig(session.id, cfg);
    },
    [isVerifiedHost, session.id]
  );

  // Formateur donne la parole (Audio / Visio WebRTC natif) à un étudiant ayant levé la main
  const handleGrantStageSpeech = useCallback(
    async (user: HandRaisedUser, mode: 'audio' | 'video') => {
      if (!isVerifiedHost) return;
      const roomId = `stage-${session.id.slice(0, 12)}-${Date.now().toString(36)}`;
      const invite: StageSpeechInvite = {
        inviteId: `inv_${Date.now()}`,
        sessionId: session.id,
        roomId,
        targetUserId: user.id,
        targetName: user.name,
        hostName: session.hostName || session.storeName,
        mode,
        createdAt: Date.now(),
      };
      await stageChannelRef.current?.sendInvite(invite);
      setActiveStageRoom({
        roomId,
        label: `Intervention en direct avec ${user.name}`,
        mode,
      });
    },
    [isVerifiedHost, session.id, session.hostName, session.storeName]
  );

  // Vendeur lance une vente aux enchères en direct
  const handleLaunchAuction = useCallback(
    async (params: {
      productId?: string;
      productName: string;
      productImage?: string;
      startingPrice: number;
      minStep: number;
      durationSeconds: number;
    }) => {
      if (!isVerifiedHost) return;
      const newAuction: LiveAuctionState = {
        id: `auc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sessionId: session.id,
        productId: params.productId,
        productName: params.productName,
        productImage: params.productImage,
        startingPrice: params.startingPrice,
        currentPrice: params.startingPrice,
        minStep: params.minStep,
        bidsCount: 0,
        recentBids: [],
        status: 'active',
        endsAt: Date.now() + params.durationSeconds * 1000,
        createdAt: Date.now(),
      };
      setActiveAuction(newAuction);
      await auctionChannelRef.current?.broadcastAuction(newAuction);
    },
    [isVerifiedHost, session.id]
  );

  const handlePlaceAuctionBid = useCallback(
    async (amount: number) => {
      const current = activeAuctionRef.current;
      if (!current || current.status !== 'active') return;

      const storedName =
        (typeof window !== 'undefined' && localStorage.getItem('nana_live_participant_name')) ||
        currentUser?.name ||
        'Acheteur Live';

      const bid: LiveAuctionBid = {
        id: `bid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        auctionId: current.id,
        bidderId: viewerClientId,
        bidderName: storedName,
        amount,
        createdAt: Date.now(),
      };

      const nextState: LiveAuctionState = {
        ...current,
        currentPrice: amount,
        highestBidderId: viewerClientId,
        highestBidderName: storedName,
        bidsCount: current.bidsCount + 1,
        recentBids: [bid, ...(current.recentBids || [])].slice(0, 10),
      };

      setActiveAuction(nextState);
      await auctionChannelRef.current?.broadcastBid(bid);
      await auctionChannelRef.current?.broadcastAuction(nextState);
    },
    [viewerClientId, currentUser?.name]
  );

  const handleEndAuction = useCallback(async () => {
    const current = activeAuctionRef.current;
    if (!current || current.status === 'ended') return;
    const endedState: LiveAuctionState = { ...current, status: 'ended' };
    setActiveAuction(endedState);
    await auctionChannelRef.current?.broadcastAuction(endedState);
  }, []);

  const handleDismissAuction = useCallback(async () => {
    setActiveAuction(null);
    await auctionChannelRef.current?.broadcastAuction(null);
  }, []);

  // Épingler / Désépingler un produit en direct (Hôte vérifié uniquement)
  const handlePinProduct = useCallback(
    async (product: StoreProductItem) => {
      if (!isVerifiedHost) return;
      playValidationBeep();
      setSession((prev) => ({
        ...prev,
        pinnedProductId: product.id,
        pinnedProduct: product,
      }));
      await updatePinnedProduct(session.id, product);
    },
    [session.id, isVerifiedHost]
  );

  const handleUnpinProduct = useCallback(async () => {
    if (!isVerifiedHost) return;
    playTapBeep();
    setSession((prev) => ({
      ...prev,
      pinnedProductId: null,
      pinnedProduct: null,
    }));
    await updatePinnedProduct(session.id, null);
  }, [session.id, isVerifiedHost]);

  const handleOpenFunnel = useCallback((product: StoreProductItem) => {
    playValidationBeep();
    setSelectedFunnelProduct(product);
  }, []);

  const handleBuyWhatsApp = useCallback(
    (product: StoreProductItem) => {
      playTapBeep();
      const phone = (session.whatsappPhone || '').replace(/[^0-9]/g, '');
      const priceFormatted = new Intl.NumberFormat('fr-FR').format(product.price) + ' F CFA';
      const refNote = affiliateAttribution?.referrerCode
        ? ` (Réf affilié : ${affiliateAttribution.referrerCode})`
        : '';
      const msg = `Bonjour ${session.storeName}, je suis sur votre session en direct et je souhaite commander : *${product.name}* (${priceFormatted})${refNote}. Pouvez-vous m'envoyer le lien de paiement ?`;
      const url = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    },
    [session.whatsappPhone, session.storeName, affiliateAttribution?.referrerCode]
  );

  const handleBack = () => {
    playTapBeep();
    if (onBackToStore) {
      onBackToStore();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  // Contrôle d'accès Cours / Adhésion Payante côté étudiant / spectateur
  const isAccessLockedForViewer =
    !isHostMode &&
    Boolean(session.isPaid) &&
    Number(session.accessPrice || 0) > 0 &&
    !hasUnlockedPaidAccess;

  const auctionLinkedProduct = useMemo(
    () => session.products?.find((p) => p.id === activeAuction?.productId),
    [session.products, activeAuction?.productId]
  );

  const viewerDisplayName =
    (typeof window !== 'undefined' && localStorage.getItem('nana_live_participant_name')) ||
    currentUser?.name ||
    'Participant';

  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-[#F5F7FB] text-slate-900 selection:bg-[#1D4ED8] selection:text-white">
      {/* =====================================================================
          1. BARRE SUPÉRIEURE ÉPURÉE — PALETTE NANASORE BLANC PUR & BLEU ROYAL
         ===================================================================== */}
      <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-xl bg-[#F5F7FB] hover:bg-blue-50 text-slate-600 hover:text-[#1D4ED8] border border-slate-200/80 transition cursor-pointer shrink-0"
            title="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 rounded-xl bg-[#1D4ED8] text-white font-black text-sm flex items-center justify-center shadow-sm shadow-blue-700/25 shrink-0">
            {session.storeName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 truncate max-w-[150px] sm:max-w-[260px]">
                {session.storeName}
              </span>

              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Direct
              </span>

              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#1D4ED8] text-[10px] font-extrabold uppercase tracking-wide shrink-0">
                {roomMode === 'live_shopping' ? (
                  <>
                    <ShoppingBag className="w-3 h-3" />
                    <span>Live Shopping</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-3 h-3" />
                    <span>Salle de Cours</span>
                  </>
                )}
              </span>

              {isHostMode && (
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wide shrink-0">
                  Régie Studio
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isVerifiedHost && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsPreviewingAsSpectator(!isPreviewingAsSpectator);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                isHostMode
                  ? 'bg-[#F5F7FB] hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] border-slate-200'
                  : 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-sm'
              }`}
              title="Basculer entre votre Régie Studio et la vue Étudiant / Spectateur"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isHostMode ? 'Vue Étudiant' : 'Retour Régie'}
              </span>
            </button>
          )}

          {!isHostMode && !isAccessLockedForViewer && (
            <>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsBookingModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#F5F7FB] hover:bg-blue-50 text-[#1D4ED8] border border-blue-200/80 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Réserver une séance de coaching 1-to-1"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">RDV 1-to-1</span>
              </button>

              <LiveSubscribeButton
                storeSlug={liveStreamSlug}
                storeName={session.storeName}
                variant="outline"
                className="hidden md:flex"
              />
            </>
          )}

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsShareModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-700/20 transition cursor-pointer active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Partager</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. SAS D'ACCÈS COURS PAYANT / ADHÉSION VIP (SI ACTIVÉ POUR LE SPECTATEUR)
         ===================================================================== */}
      {isAccessLockedForViewer ? (
        <LiveAccessGate
          session={session}
          onAccessGranted={() => setHasUnlockedPaidAccess(true)}
        />
      ) : (
        /* =====================================================================
            3. VRAIE SALLE STRUCTURÉE : BARRE STUDIO UNIFIÉE + SCÈNE + CHAT PRO
           ===================================================================== */
        <main className="flex-1 max-w-[1560px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 sm:py-4 space-y-3.5">
          {/* UNE SEULE BARRE RÉGIE STUDIO UNIFIÉE (Formateur / Vendeur vérifié uniquement) */}
          {isHostMode && (
            <LiveInstructorControlBar
              session={session}
              roomMode={roomMode}
              onChangeRoomMode={handleChangeRoomMode}
              isBroadcasterActive={isHostBroadcasterActive}
              onToggleBroadcaster={() => setIsHostBroadcasterActive((prev) => !prev)}
              onOpenMultistream={() => setIsMultistreamModalOpen(true)}
              onOpenBookingModal={() => setIsBookingModalOpen(true)}
              onUpdateAccessGate={handleUpdateAccessGate}
              onGrantStageSpeech={handleGrantStageSpeech}
              onLaunchAuction={handleLaunchAuction}
              onOpenAffiliatePayouts={() => setIsAffiliatePayoutModalOpen(true)}
              onSelectTab={(tab) => setActiveClassroomTab(tab)}
            />
          )}

          {/* INVITATION PRISE DE PAROLE AUDIO / VISIO POUR L'ÉTUDIANT */}
          {!isHostMode && pendingStageInvite && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#1E40AF] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 text-amber-300 animate-bounce" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-100">
                    Prise de parole en direct
                  </p>
                  <p className="text-sm font-black">
                    {pendingStageInvite.hostName} vous donne la parole ({pendingStageInvite.mode === 'audio' ? 'Audio' : 'Vidéo'}) !
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    stageChannelRef.current?.sendResponse({
                      inviteId: pendingStageInvite.inviteId,
                      roomId: pendingStageInvite.roomId,
                      accepted: false,
                      participantName: viewerDisplayName,
                      timestamp: Date.now(),
                    });
                    setPendingStageInvite(null);
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                >
                  Décliner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playValidationBeep();
                    stageChannelRef.current?.sendResponse({
                      inviteId: pendingStageInvite.inviteId,
                      roomId: pendingStageInvite.roomId,
                      accepted: true,
                      participantName: viewerDisplayName,
                      timestamp: Date.now(),
                    });
                    setActiveStageRoom({
                      roomId: pendingStageInvite.roomId,
                      label: `Votre intervention en direct avec ${pendingStageInvite.hostName}`,
                      mode: pendingStageInvite.mode,
                    });
                    setPendingStageInvite(null);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white text-[#1D4ED8] hover:bg-blue-50 text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Prendre la parole</span>
                </button>
              </div>
            </div>
          )}

          {/* Notifications interactives compactes (Quiz ou Devoir lancé en direct) */}
          {session.activeQuiz?.isActive && (
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                setActiveClassroomTab('quiz');
              }}
              className="w-full px-4 py-2.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-300/90 text-slate-900 rounded-2xl flex items-center justify-between gap-3 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-extrabold truncate">
                  Quiz en direct : {session.activeQuiz.question}
                </span>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-500 text-white text-[11px] font-black shrink-0 flex items-center gap-1">
                Répondre <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </button>
          )}

          {session.activeAssignment?.isActive && (
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                setActiveClassroomTab('assignment');
              }}
              className="w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100/70 border border-blue-200 text-slate-900 rounded-2xl flex items-center justify-between gap-3 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8] animate-ping shrink-0" />
                <FileText className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                <span className="text-xs font-extrabold truncate">
                  Devoir &amp; Support PDF : {session.activeAssignment.title}
                </span>
              </div>
              <span className="px-3 py-1 rounded-xl bg-[#1D4ED8] text-white text-[11px] font-black shrink-0 flex items-center gap-1">
                Ouvrir <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </button>
          )}

          {/* GRILLE PRINCIPALE : SCÈNE VIDÉO (8 COLS) + SALLE INTERACTIVE PRO (4 COLS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
            {/* COLONNE GAUCHE : SCÈNE VIDÉO + ENCHÈRE (LIVE SHOPPING) + INFOS + PRODUITS */}
            <div className="lg:col-span-8 space-y-4">
              {/* Scène Vidéo Principale (Lecteur Caméléon / YouTube Furtif / HLS / Caméra WHIP) */}
              <div className="rounded-3xl overflow-hidden shadow-xl shadow-blue-950/10 bg-slate-950 relative ring-1 ring-slate-200">
                {isHostMode && isHostBroadcasterActive ? (
                  <WhipLiveBroadcaster
                    storeSlug={liveStreamSlug}
                    storeName={session.storeName}
                    onLiveStopped={() => setIsHostBroadcasterActive(false)}
                  />
                ) : (
                  <NanasoreOmniPlayer
                    session={session}
                    isHost={isHostMode}
                    onOpenFunnel={handleOpenFunnel}
                    onBuyWhatsApp={handleBuyWhatsApp}
                    onShareClick={() => setIsShareModalOpen(true)}
                    onUnpinProduct={isHostMode ? handleUnpinProduct : undefined}
                  />
                )}

                {/* Overlay Commerce en Direct (activé en mode Live Shopping) */}
                {roomMode === 'live_shopping' && (
                  <NanasoreLiveCommerceOverlay
                    liveId={liveStreamSlug}
                    isHost={isHostMode}
                    availableProducts={session.products?.map((p) => ({
                      id: p.id,
                      title: p.name,
                      shortTitle: p.name,
                      price: p.price,
                      originalPrice: p.compareAtPrice,
                      imageUrl: p.imageUrl,
                      stockCount: p.inventoryQuantity,
                      operatorBadge: 'Wave & Orange Money',
                    }))}
                  />
                )}
              </div>

              {/* MODULE VENTE AUX ENCHÈRES EN DIRECT (MODE LIVE SHOPPING) */}
              {roomMode === 'live_shopping' && activeAuction && (
                <LiveAuctionWidget
                  auction={activeAuction}
                  isHost={isHostMode}
                  storeId={session.storeId || liveStreamSlug}
                  storeName={session.storeName}
                  whatsappPhone={session.whatsappPhone}
                  affiliateEnabled={auctionLinkedProduct?.affiliateEnabled !== false}
                  affiliateCommissionPercent={auctionLinkedProduct?.affiliateCommissionPercent || 10}
                  currentBidderId={viewerClientId}
                  currentBidderName={viewerDisplayName}
                  onPlaceBid={handlePlaceAuctionBid}
                  onEndAuction={handleEndAuction}
                  onDismissAuction={handleDismissAuction}
                />
              )}

              {/* Cartouche d'information épuré (Blanc pur + Bleu Royal) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-[#1D4ED8] border border-blue-200/70">
                      {roomMode === 'live_shopping' ? 'Live Shopping Produits' : 'Cours & Masterclass'}
                    </span>
                    {session.isPaid && (session.accessPrice || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Accès VIP vérifié</span>
                      </span>
                    )}
                    {affiliateAttribution?.referrerCode && !isHostMode && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200">
                        <Users className="w-2.5 h-2.5" />
                        <span>Invité par {affiliateAttribution.referrerCode}</span>
                      </span>
                    )}
                    {session.hostName && (
                      <span className="text-xs font-medium text-slate-500">
                        Animé par <strong className="text-slate-900">{session.hostName}</strong>
                      </span>
                    )}
                  </div>

                  {resolvedWhatsAppJoinHref && (
                    <a
                      href={resolvedWhatsAppJoinHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={playTapBeep}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Rejoindre WhatsApp</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  )}
                </div>

                <h1 className="text-base sm:text-xl font-black text-slate-900 leading-snug">
                  {session.title}
                </h1>
                {session.description && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {session.description}
                  </p>
                )}
              </div>

              {/* VITRINE PRODUITS PHYSIQUES EN DIRECT — AFFICHÉE UNIQUEMENT EN MODE LIVE SHOPPING */}
              {roomMode === 'live_shopping' && (
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </span>
                      <span>Produits Physiques Présentés en Direct</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {isHostMode
                        ? 'Épinglez un produit pour le pousser sur les écrans'
                        : 'Commandez en popup sans couper la vidéo'}
                    </span>
                  </div>
                  <LiveProductCarousel
                    products={session.products || []}
                    pinnedProductId={session.pinnedProductId}
                    whatsappPhone={session.whatsappPhone}
                    isHost={isHostMode}
                    onOpenFunnel={handleOpenFunnel}
                    onPinProduct={isHostMode ? handlePinProduct : undefined}
                    onUnpinProduct={isHostMode ? handleUnpinProduct : undefined}
                  />
                </div>
              )}
            </div>

            {/* COLONNE DROITE : CHAT PRO, Q&A, QUIZ, DEVOIRS & OFFRES (PLEINE HAUTEUR PROPRE) */}
            <div className="lg:col-span-4 lg:sticky lg:top-[4.25rem]">
              <LiveClassroomInteractivePanel
                session={session}
                isHost={isHostMode}
                roomMode={roomMode}
                activeTabOverride={activeClassroomTab}
                onTabChange={setActiveClassroomTab}
                onOpenFunnel={handleOpenFunnel}
                onPinProduct={isHostMode ? handlePinProduct : undefined}
                onUnpinProduct={isHostMode ? handleUnpinProduct : undefined}
                className="h-[580px] lg:h-[calc(100vh-5.5rem)]"
              />
            </div>
          </div>
        </main>
      )}

      {/* SALLE DE PRISE DE PAROLE AUDIO / VISIO WEBRTC NATIVE EN OVERLAY */}
      {activeStageRoom && (
        <div className="fixed inset-0 z-[9998] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6">
          <div className="w-full max-w-4xl h-[82vh] bg-slate-950 border border-blue-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-4 py-3 bg-[#1D4ED8] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Mic className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-black truncate">
                  {activeStageRoom.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  stageChannelRef.current?.sendStageEnded(
                    activeStageRoom.roomId,
                    isHostMode ? 'host' : 'participant'
                  );
                  setActiveStageRoom(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Couper la parole</span>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <NativeCoaching1to1Room
                roomId={activeStageRoom.roomId}
                storeSlug={liveStreamSlug}
                storeName={session.storeName}
                isHost={isHostMode}
                onCallEnded={() => {
                  stageChannelRef.current?.sendStageEnded(
                    activeStageRoom.roomId,
                    isHostMode ? 'host' : 'participant'
                  );
                  setActiveStageRoom(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE PARTAGE MULTI-RÉSEAUX + GÉNÉRATEUR LIEN AFFILIÉ */}
      <LiveShareModal
        sessionSlug={liveStreamSlug}
        title={session.title}
        storeName={session.storeName}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* CONSOLE DE MULTISTREAMING & CLÉS RTMP / LIENS — PROPRIÉTAIRE VÉRIFIÉ UNIQUEMENT */}
      {isVerifiedHost && (
        <LiveMultistreamStudioModal
          isOpen={isMultistreamModalOpen}
          storeSlug={liveStreamSlug}
          storeName={session.storeName}
          liveTitle={session.title}
          onClose={() => setIsMultistreamModalOpen(false)}
        />
      )}

      {/* MODALE PAIEMENT & SUIVI DES COMMISSIONS AFFILIÉS — VENDEUR VÉRIFIÉ UNIQUEMENT */}
      {isVerifiedHost && (
        <LiveAffiliatePayoutModal
          isOpen={isAffiliatePayoutModalOpen}
          onClose={() => setIsAffiliatePayoutModalOpen(false)}
          merchantId={session.storeId || liveStreamSlug}
          storeName={session.storeName}
        />
      )}

      {/* MODALE PRISE DE RENDEZ-VOUS & VISIO COACHING 1-TO-1 (100 % SUPABASE + WEBRTC NATIF) */}
      <Live1to1BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        sessionId={session.id}
        storeSlug={liveStreamSlug}
        coachName={session.hostName || session.storeName}
        isHost={isHostMode}
        defaultRoomUrl={session.coachingRoomUrl}
      />

      {/* TIROIR TUNNEL (12 BLOCS) PAR-DESSUS SANS COUPER LA VIDÉO */}
      {selectedFunnelProduct && (
        <SlideOutFunnelDrawer
          funnelId={selectedFunnelProduct.linkedFunnelId || selectedFunnelProduct.id}
          isOpen={Boolean(selectedFunnelProduct)}
          onClose={() => setSelectedFunnelProduct(null)}
          renderMode="component"
        />
      )}
    </div>
  );
};

export default PublicLiveSessionPage;
