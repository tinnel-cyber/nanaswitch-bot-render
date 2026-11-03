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
  ChevronRight
} from 'lucide-react';
import { LiveSession } from '../../../types/liveSession';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { 
  getLiveSessionBySlug, 
  subscribeLiveSession, 
  updatePinnedProduct, 
  FALLBACK_LIVE_SESSION 
} from '../../../services/liveSessionService';
import { NanasoreOmniPlayer } from '../../../components/live/NanasoreOmniPlayer';
import { NanasoreLiveCommerceOverlay } from '../../../components/live/NanasoreLiveCommerceOverlay';
import { LiveProductCarousel } from '../../../components/live/LiveProductCarousel';
import { LiveClassroomInteractivePanel, LivePanelTab } from '../../../components/live/LiveClassroomInteractivePanel';
import { LiveInstructorControlBar } from '../../../components/live/LiveInstructorControlBar';
import { LiveShareModal } from '../../../components/live/LiveShareModal';
import { SlideOutFunnelDrawer } from '../../../components/SlideOutFunnelDrawer';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface PublicLiveSessionPageProps {
  sessionSlug?: string;
  initialSession?: LiveSession;
  isHost?: boolean;
  onBackToStore?: () => void;
}

export const PublicLiveSessionPage: React.FC<PublicLiveSessionPageProps> = ({
  sessionSlug,
  initialSession,
  isHost: initialIsHost = false,
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
  const [isHostMode, setIsHostMode] = useState<boolean>(initialIsHost);
  const [activeClassroomTab, setActiveClassroomTab] = useState<LivePanelTab>('chat');
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!initialSession);

  // Chargement de la session depuis Firestore
  useEffect(() => {
    let isMounted = true;
    getLiveSessionBySlug(resolvedSlug).then(res => {
      if (isMounted && res) {
        setSession(res);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [resolvedSlug]);

  // Abonnement temps réel aux mises à jour (produit épinglé, quiz actif, devoir, etc.)
  useEffect(() => {
    if (!session?.id) return;
    const unsubscribe = subscribeLiveSession(session.id, (updated) => {
      setSession(prev => ({ ...prev, ...updated }));
    });
    return () => unsubscribe();
  }, [session?.id]);

  // Épingler un produit en direct
  const handlePinProduct = useCallback(async (product: StoreProductItem) => {
    playValidationBeep();
    setSession(prev => ({
      ...prev,
      pinnedProductId: product.id,
      pinnedProduct: product
    }));
    await updatePinnedProduct(session.id, product);
  }, [session.id]);

  // Désépingler le produit
  const handleUnpinProduct = useCallback(async () => {
    playTapBeep();
    setSession(prev => ({
      ...prev,
      pinnedProductId: null,
      pinnedProduct: null
    }));
    await updatePinnedProduct(session.id, null);
  }, [session.id]);

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
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. BARRE DE NAVIGATION SUPÉRIEURE : ADN BLEU ROYAL (#2563EB) & BLANC */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Identité Boutique & Retour */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
            title="Retour à la boutique"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/30">
              {session.storeName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-extrabold text-sm text-white line-clamp-1 block leading-tight">
                {session.storeName}
              </span>
              <span className="text-[10px] text-blue-400 font-bold block">
                Nanasore Live Studio OS
              </span>
            </div>
          </div>
        </div>

        {/* Actions Droite : Bascule Mode Formateur & Partage */}
        <div className="flex items-center gap-2">
          {/* Bascule Mode Formateur / Vue Élève */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsHostMode(!isHostMode);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              isHostMode
                ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Activer ou désactiver la console de contrôle formateur"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isHostMode ? 'Console Formateur Active' : 'Mode Formateur'}</span>
          </button>

          {/* Action Droite : Bouton 1-Clic "📲 Partager ce Live" */}
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
        
        {/* Console Formateur / Coach Flottante Supérieure (Si Mode Formateur Activé) */}
        {isHostMode && (
          <div className="mb-2">
            <LiveInstructorControlBar
              session={session}
              onSelectTab={(tab) => {
                setActiveClassroomTab(tab);
              }}
            />
          </div>
        )}

        {/* Bannières d'Alerte Intelligentes Surgissant Instantanément chez les élèves */}
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
                  📝 Travaux Pratiques / Support PDF en Direct
                </span>
                <span className="text-sm font-black line-clamp-1">
                  {session.activeAssignment.title}
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-white text-blue-700 text-xs font-black shrink-0 flex items-center gap-1 shadow-sm">
              Voir & Soumettre <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        )}

        {/* Layout en 2 Colonnes Grandes Écrans */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Colonne Gauche (lg:col-span-8) : Lecteur Vidéo + Titre + Carrousel Produits */}
          <div className="lg:col-span-8 space-y-5">
            {/* Lecteur Caméléon */}
            <div className="rounded-3xl overflow-hidden shadow-2xl bg-black relative">
              <NanasoreOmniPlayer
                session={session}
                isHost={isHostMode}
                onOpenFunnel={handleOpenFunnel}
                onBuyWhatsApp={handleBuyWhatsApp}
                onShareClick={() => setIsShareModalOpen(true)}
                onUnpinProduct={handleUnpinProduct}
              />

              {/* Moteur E-Commerce & Le Tiroir Nanasore (Firebase Live Sync) */}
              <NanasoreLiveCommerceOverlay
                liveId={session.id || resolvedSlug}
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

            {/* Titre et Détails de la Session */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase">
                  {session.sessionMode.replace('_', ' ')}
                </span>
                {session.hostName && (
                  <span className="text-xs text-slate-400 font-semibold">
                    Animé par <strong className="text-white">{session.hostName}</strong>
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white leading-tight">
                {session.title}
              </h1>
              {session.description && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {session.description}
                </p>
              )}
            </div>

            {/* Carrousel Produits Incitatif Défilant en Continu sous la Vidéo */}
            <div className="bg-white text-slate-900 rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                  Produits & Offres Présentés en Direct
                </h3>
                <span className="text-[11px] text-slate-500">
                  Commandez sans couper la vidéo
                </span>
              </div>
              <LiveProductCarousel
                products={session.products || []}
                pinnedProductId={session.pinnedProductId}
                whatsappPhone={session.whatsappPhone}
                isHost={isHostMode}
                onOpenFunnel={handleOpenFunnel}
                onPinProduct={handlePinProduct}
                onUnpinProduct={handleUnpinProduct}
              />
            </div>
          </div>

          {/* Colonne Droite (lg:col-span-4) : Salle de Classe & Coaching Interactive Panel */}
          <div className="lg:col-span-4 sticky top-20">
            <LiveClassroomInteractivePanel
              session={session}
              isHost={isHostMode}
              activeTabOverride={activeClassroomTab}
              onTabChange={setActiveClassroomTab}
              onOpenFunnel={handleOpenFunnel}
              onPinProduct={handlePinProduct}
              onUnpinProduct={handleUnpinProduct}
              className="h-[680px] lg:h-[740px]"
            />
          </div>

        </div>

      </main>

      {/* 3. MODALE DE PARTAGE MULTI-RÉSEAUX 1-CLIC */}
      <LiveShareModal
        sessionSlug={session.sessionSlug}
        title={session.title}
        storeName={session.storeName}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
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
