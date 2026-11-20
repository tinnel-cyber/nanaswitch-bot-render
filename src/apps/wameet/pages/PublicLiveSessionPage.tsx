import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  Radio, 
  Sparkles, 
  GraduationCap, 
  ShoppingBag, 
  Users, 
  ShieldCheck, 
  Zap,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LiveSession } from '../../../types/liveSession';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { StoreUser } from '../../../types';
import { 
  getLiveSessionBySlug, 
  subscribeLiveSession, 
  updatePinnedProduct, 
  FALLBACK_LIVE_SESSION 
} from '../../../services/liveSessionService';
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
  onBackToStore
}) => {
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET DU COMPOSANT (ZÉRO ERREUR #310)
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

  // Vérification de session Supabase Auth en arrière-plan
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (isMounted && data?.user) {
        setSupabaseUser(data.user);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Séparation stricte des domaines :
  // - nsore.shop => STRICTEMENT réservé aux spectateurs / acheteurs / étudiants (jamais de console studio)
  // - nanasore.com => réservé aux formateurs / animateurs / vendeurs authentifiés
  const isPublicSpectatorDomain = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname.toLowerCase();
    return h === 'nsore.shop' || h.endsWith('.nsore.shop');
  }, []);

  // Détection STRICTEMENT sécurisée du propriétaire Vendeur / Formateur (ZÉRO contournement URL ?host=true)
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

  // Seul le propriétaire vérifié peut basculer en aperçu spectateur ; un spectateur ne peut JAMAIS activer la régie
  const [isPreviewingAsSpectator, setIsPreviewingAsSpectator] = useState<boolean>(false);
  const isHostMode = isVerifiedHost && !isPreviewingAsSpectator;

  const [activeClassroomTab, setActiveClassroomTab] = useState<LivePanelTab>('chat');
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isHostBroadcasterActive, setIsHostBroadcasterActive] = useState<boolean>(false);
  const [isMultistreamModalOpen, setIsMultistreamModalOpen] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!initialSession);

  // Slug canonique unifié entre WHIP (caméra vendeur), HLS (lecteur acheteur) et FFmpeg (multistream)
  const liveStreamSlug = useMemo(
    () => resolvedSlug || session.sessionSlug || session.storeId || session.id,
    [resolvedSlug, session.sessionSlug, session.storeId, session.id]
  );

  // Lien cliquable normalisé vers le groupe / chaîne / numéro WhatsApp du vendeur
  const resolvedWhatsAppJoinHref = useMemo(() => {
    const raw = (whatsappChannelUrl || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const digits = raw.replace(/[^0-9]/g, '');
    return digits ? `https://wa.me/${digits}` : '';
  }, [whatsappChannelUrl]);

  // Chargement de la session depuis Supabase / cache local
  useEffect(() => {
    let isMounted = true;
    getLiveSessionBySlug(resolvedSlug).then(res => {
      if (isMounted && res) {
        setSession(res);
        setLoading(false);
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

  // Mise à jour dynamique des balises OpenGraph côté navigateur
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const ogTitle = `🔴 EN DIRECT — ${session.storeName} | ${session.title}`;
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
    setMeta('og:description', session.description || `Suivez le Live Shopping de ${session.storeName} en direct sur Nanasore.`);
    if (session.posterUrl) setMeta('og:image', session.posterUrl);
    setMeta('og:type', 'video.other');
  }, [session.storeName, session.title, session.description, session.posterUrl]);

  // Abonnement temps réel aux mises à jour (produit épinglé, quiz actif, devoir, etc.)
  useEffect(() => {
    if (!session?.id) return;
    const unsubscribe = subscribeLiveSession(session.id, (updated) => {
      setSession(prev => ({ ...prev, ...updated }));
    });
    return () => unsubscribe();
  }, [session?.id]);

  // Épingler un produit en direct (strictement réservé à l'hôte vérifié)
  const handlePinProduct = useCallback(async (product: StoreProductItem) => {
    if (!isVerifiedHost) return;
    playValidationBeep();
    setSession(prev => ({
      ...prev,
      pinnedProductId: product.id,
      pinnedProduct: product
    }));
    await updatePinnedProduct(session.id, product);
  }, [session.id, isVerifiedHost]);

  // Désépingler le produit (strictement réservé à l'hôte vérifié)
  const handleUnpinProduct = useCallback(async () => {
    if (!isVerifiedHost) return;
    playTapBeep();
    setSession(prev => ({
      ...prev,
      pinnedProductId: null,
      pinnedProduct: null
    }));
    await updatePinnedProduct(session.id, null);
  }, [session.id, isVerifiedHost]);

  // Ouvrir le tiroir tunnel sans couper la vidéo
  const handleOpenFunnel = useCallback((product: StoreProductItem) => {
    playValidationBeep();
    setSelectedFunnelProduct(product);
  }, []);

  // WhatsApp direct
  const handleBuyWhatsApp = useCallback((product: StoreProductItem) => {
    playTapBeep();
    const phone = (session.whatsappPhone || '').replace(/[^0-9]/g, '');
    const priceFormatted = new Intl.NumberFormat('fr-FR').format(product.price) + ' F CFA';
    const msg = `Bonjour ${session.storeName}, je suis sur votre session en direct et je souhaite commander : *${product.name}* (${priceFormatted}). Pouvez-vous m'envoyer le lien de paiement ?`;
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }, [session.whatsappPhone, session.storeName]);

  const handleBack = () => {
    playTapBeep();
    if (onBackToStore) {
      onBackToStore();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-sans selection:bg-blue-600 selection:text-white ${
        isHostMode
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* 1. BARRE DE NAVIGATION SUPÉRIEURE — THÈME DISTINCT RÉGIE STUDIO vs SALLE SPECTATEUR */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-4 ${
          isHostMode
            ? 'bg-slate-950/95 border-indigo-500/40'
            : 'bg-white/95 border-slate-200 shadow-xs'
        }`}
      >
        {/* Identité Boutique & Retour */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isHostMode
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border-slate-200'
            }`}
            title="Retour à la boutique"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/30">
              {session.storeName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-extrabold text-sm line-clamp-1 leading-tight ${isHostMode ? 'text-white' : 'text-slate-900'}`}>
                  {session.storeName}
                </span>
                {isHostMode ? (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase tracking-wide">
                    🎬 Régie Studio
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    En direct
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold block ${isHostMode ? 'text-indigo-400' : 'text-slate-500'}`}>
                {isHostMode
                  ? 'Console Vendeur & Formateur • Administration du Direct'
                  : 'Salle Directe • Acheteurs & Étudiants'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Droite */}
        <div className="flex items-center gap-2">
          {/* Bascule Aperçu Spectateur / Retour Régie — STRICTEMENT VISIBLE PAR LE PROPRIÉTAIRE VÉRIFIÉ UNIQUEMENT */}
          {isVerifiedHost && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsPreviewingAsSpectator(!isPreviewingAsSpectator);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                isHostMode
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800'
              }`}
              title="Basculer entre votre Régie Studio et l'aperçu spectateur"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isHostMode ? 'Aperçu Spectateur' : 'Retour Régie Studio'}
              </span>
            </button>
          )}

          {/* Bouton Prendre RDV Coaching 1-to-1 pour les spectateurs / étudiants */}
          {!isHostMode && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsBookingModalOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
              title="Réserver une séance de coaching 1-to-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RDV 1-to-1</span>
            </button>
          )}

          {/* Bouton d'abonnement aux notifications Push de la boutique pour les acheteurs / étudiants */}
          {!isHostMode && (
            <LiveSubscribeButton
              storeSlug={liveStreamSlug}
              storeName={session.storeName}
              variant="outline"
              className="hidden sm:flex"
            />
          )}

          {/* Bouton 1-Clic "Partager ce Live" */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsShareModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition cursor-pointer active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Partager ce Live</span>
            <span className="sm:hidden">Partager</span>
          </button>
        </div>
      </header>

      {/* 2. ZONE CENTRALE : LAYOUT SPLIT ÉCRAN (LECTEUR À GAUCHE + SALLE INTERACTIVE À DROITE) */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        
        {/* CONSOLE & PANNEAUX D'ADMINISTRATION — STRICTEMENT RÉSERVÉS AU VENDEUR / FORMATEUR VÉRIFIÉ */}
        {isHostMode && (
          <div className="mb-2 space-y-2.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/40 shadow-xl">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                <div>
                  <span className="text-xs font-black text-white block">Console Studio Vendeur / Formateur</span>
                  <span className="text-[11px] text-slate-300">Pilotez votre caméra WHIP, la multidiffusion réseaux sociaux, les quiz, devoirs et produits épinglés</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsBookingModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-extrabold text-xs flex items-center gap-1.5 border border-slate-700 transition active:scale-95 cursor-pointer shadow-md"
                  title="Consulter les demandes de rendez-vous Coaching 1-to-1"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Demandes RDV 1-to-1</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsMultistreamModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-extrabold text-xs flex items-center gap-1.5 border border-slate-700 transition active:scale-95 cursor-pointer shadow-md"
                  title="Configurer le relais simultané vers YouTube, Facebook, TikTok..."
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Multistreaming</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsHostBroadcasterActive(!isHostBroadcasterActive);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-950 transition active:scale-95 cursor-pointer border border-blue-400/30"
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>{isHostBroadcasterActive ? "👁️ Voir le Retour Lecteur" : "📹 Lancer ma Caméra (WHIP Direct)"}</span>
                </button>
              </div>
            </div>

            <LiveInstructorControlBar
              session={session}
              onSelectTab={(tab) => {
                setActiveClassroomTab(tab);
              }}
            />
          </div>
        )}

        {/* Bannières d'Alerte Intelligentes (Quiz & Devoirs à traiter / soumettre par les étudiants) */}
        {session.activeQuiz?.isActive && (
          <div 
            onClick={() => {
              playValidationBeep();
              setActiveClassroomTab('quiz');
            }}
            className="p-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold rounded-2xl flex items-center justify-between gap-3 shadow-lg cursor-pointer hover:opacity-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
              <HelpCircle className="w-5 h-5 shrink-0" />
              <div>
                <span className="text-xs uppercase tracking-wider block text-amber-950 font-black">
                  📌 Quiz en Direct Lancé par le Formateur !
                </span>
                <span className="text-sm font-black line-clamp-1">
                  {session.activeQuiz.question}
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-white text-xs font-black shrink-0 flex items-center gap-1 shadow-sm">
              Répondre maintenant <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        )}

        {session.activeAssignment?.isActive && (
          <div 
            onClick={() => {
              playValidationBeep();
              setActiveClassroomTab('assignment');
            }}
            className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl flex items-center justify-between gap-3 shadow-lg cursor-pointer hover:opacity-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 animate-ping shrink-0" />
              <FileText className="w-5 h-5 shrink-0" />
              <div>
                <span className="text-xs uppercase tracking-wider block text-blue-200 font-black">
                  📝 Travaux Pratiques / Devoir en Direct
                </span>
                <span className="text-sm font-black line-clamp-1">
                  {session.activeAssignment.title}
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-white text-blue-700 text-xs font-black shrink-0 flex items-center gap-1 shadow-sm">
              Traiter & Soumettre <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        )}

        {/* Layout en 2 Colonnes Grandes Écrans */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Colonne Gauche (lg:col-span-8) : Lecteur Vidéo + Titre + Carrousel Produits */}
          <div className="lg:col-span-8 space-y-5">
            {/* Lecteur Caméléon (Spectateur) ou Studio Caméra WHIP (Hôte vérifié uniquement) */}
            <div className={`rounded-3xl overflow-hidden shadow-2xl bg-black relative ${isHostMode ? 'ring-2 ring-indigo-500/40' : 'ring-1 ring-slate-200'}`}>
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

              {/* Moteur E-Commerce & Le Tiroir Nanasore (Supabase Live Sync) */}
              <NanasoreLiveCommerceOverlay
                liveId={liveStreamSlug}
                isHost={isHostMode}
                availableProducts={session.products?.map(p => ({
                  id: p.id,
                  title: p.name,
                  shortTitle: p.name,
                  price: p.price,
                  originalPrice: p.compareAtPrice,
                  imageUrl: p.imageUrl,
                  stockCount: p.inventoryQuantity,
                  operatorBadge: 'Wave & Orange Money'
                }))}
              />
            </div>

            {/* Titre et Détails de la Session — Style adapté au thème */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${
                isHostMode
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      isHostMode
                        ? 'bg-blue-600/30 text-blue-400 border-blue-500/30'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {session.sessionMode.replace('_', ' ')}
                  </span>
                  {session.hostName && (
                    <span className={`text-xs font-semibold ${isHostMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Animé par <strong className={isHostMode ? 'text-white' : 'text-slate-900'}>{session.hostName}</strong>
                    </span>
                  )}
                </div>
                {resolvedWhatsAppJoinHref && (
                  <a
                    href={resolvedWhatsAppJoinHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={playTapBeep}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Rejoindre la chaîne WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                )}
              </div>
              <h1 className={`text-lg sm:text-2xl font-black leading-tight ${isHostMode ? 'text-white' : 'text-slate-900'}`}>
                {session.title}
              </h1>
              {session.description && (
                <p className={`text-xs sm:text-sm leading-relaxed ${isHostMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {session.description}
                </p>
              )}
            </div>

            {/* Bannière Abonnement Alertes Live pour Acheteurs & Étudiants */}
            {!isHostMode && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-blue-600/20">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
                    Ne manquez aucun direct de {session.storeName}
                  </span>
                  <p className="text-[11px] text-blue-100">
                    Soyez prévenu instantanément sur votre téléphone dès le lancement du prochain Live.
                  </p>
                </div>
                <LiveSubscribeButton
                  storeSlug={liveStreamSlug}
                  storeName={session.storeName}
                  variant="solid"
                  className="w-full sm:w-auto shrink-0 justify-center"
                />
              </div>
            )}

            {/* Carrousel Produits Incitatif Défilant en Continu sous la Vidéo */}
            <div className="bg-white text-slate-900 rounded-3xl p-4 sm:p-5 shadow-md border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                  Produits & Offres Présentés en Direct
                </h3>
                <span className="text-[11px] text-slate-500">
                  {isHostMode ? 'Cliquez sur Épingler pour pousser en direct' : 'Commandez sans couper la vidéo'}
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
          </div>

          {/* Colonne Droite (lg:col-span-4) : Salle Interactive (Chat, Quiz, Devoirs à traiter & soumettre) */}
          <div className="lg:col-span-4 sticky top-20">
            <LiveClassroomInteractivePanel
              session={session}
              isHost={isHostMode}
              activeTabOverride={activeClassroomTab}
              onTabChange={setActiveClassroomTab}
              onOpenFunnel={handleOpenFunnel}
              onPinProduct={isHostMode ? handlePinProduct : undefined}
              onUnpinProduct={isHostMode ? handleUnpinProduct : undefined}
              className="h-[680px] lg:h-[740px]"
            />
          </div>

        </div>

      </main>

      {/* 3. MODALE DE PARTAGE MULTI-RÉSEAUX 1-CLIC */}
      <LiveShareModal
        sessionSlug={liveStreamSlug}
        title={session.title}
        storeName={session.storeName}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* 3.B. CONSOLE DE MULTISTREAMING RÉEL — MONTÉE UNIQUEMENT POUR LE PROPRIÉTAIRE VÉRIFIÉ */}
      {isVerifiedHost && (
        <LiveMultistreamStudioModal
          isOpen={isMultistreamModalOpen}
          storeSlug={liveStreamSlug}
          storeName={session.storeName}
          liveTitle={session.title}
          onClose={() => setIsMultistreamModalOpen(false)}
        />
      )}

      {/* 3.C. MODALE PRISE DE RENDEZ-VOUS COACHING 1-TO-1 (100 % SUPABASE) */}
      <Live1to1BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        sessionId={session.id}
        storeSlug={liveStreamSlug}
        coachName={session.hostName || session.storeName}
        isHost={isHostMode}
        defaultRoomUrl={session.coachingRoomUrl}
      />

      {/* 4. TIROIR TUNNEL (12 BLOCS) DÉPLOYÉ PAR-DESSUS SANS COUPER LE SON NI LA VIDÉO DU LIVE */}
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
