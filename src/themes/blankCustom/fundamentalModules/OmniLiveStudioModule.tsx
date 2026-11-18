import React, { useState, useMemo, useCallback } from 'react';
import { Radio, Share2, Sparkles, ExternalLink } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { LiveSession, LiveAspectRatio, LiveSessionMode, LiveSourceType } from '../../../types/liveSession';
import { NanasoreOmniPlayer } from '../../../components/live/NanasoreOmniPlayer';
import { LiveProductCarousel } from '../../../components/live/LiveProductCarousel';
import { LiveClassroomInteractivePanel } from '../../../components/live/LiveClassroomInteractivePanel';
import { LiveShareModal } from '../../../components/live/LiveShareModal';
import { SlideOutFunnelDrawer } from '../../../components/SlideOutFunnelDrawer';
import { triggerOpenFunnel } from '../../themeUtils';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface OmniLiveStudioModuleProps {
  section: CustomSectionInstance;
  moodStyle: MoodStyleConfig;
  buttonRadiusClass: string;
  products: StoreProductItem[];
  storeSlug?: string;
  onOpenTunnel?: (product: StoreProductItem) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

export const OmniLiveStudioModule: React.FC<OmniLiveStudioModuleProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  products = [],
  storeSlug = 'boutique',
  onOpenTunnel,
  onPreviewFunnel,
  onSelectProduct,
  onEditProduct,
  isPublicView = false,
  isAdminPreview = false
}) => {
  // 1. TOUS LES HOOKS AU SOMMET
  const cfg = section.settings || section.config || {};
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [pinnedProductId, setPinnedProductId] = useState<string>(cfg.pinnedProductId || '');

  const effectiveAspectRatio: LiveAspectRatio = (cfg.aspectRatio as LiveAspectRatio) || '16:9';
  const effectiveSessionMode: LiveSessionMode = (cfg.sessionMode as LiveSessionMode) || 'live_shopping';
  const effectiveSourceType: LiveSourceType = (cfg.sourceType as LiveSourceType) || 'youtube';

  const pinnedProduct = useMemo(() => {
    if (!pinnedProductId) return undefined;
    return products.find(p => p.id === pinnedProductId);
  }, [products, pinnedProductId]);

  const liveSessionObj: LiveSession = useMemo(() => {
    const slug = cfg.sessionSlug || 'masterclass-direct';
    return {
      id: section.id || 'studio-live',
      storeId: cfg.storeId || storeSlug || 'boutique',
      storeName: cfg.storeName || 'Studio Live',
      sessionSlug: slug,
      title: cfg.title || 'Masterclass & Live Shopping Nanasore',
      subtitle: cfg.subtitle || 'Découvrez nos offres exclusives en direct et interagissez sans interruption.',
      description: cfg.description || '',
      sessionMode: effectiveSessionMode,
      sourceType: effectiveSourceType,
      aspectRatio: effectiveAspectRatio,
      status: cfg.isLive !== false ? 'live' : 'scheduled',
      streamUrl: cfg.streamUrl || 'https://www.youtube.com/watch?v=live_stream',
      posterUrl: cfg.posterUrl || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1080&h=1080&q=80',
      viewerCount: cfg.viewerCount || 142,
      scheduledAt: cfg.countdownTargetDate,
      pinnedProductId: pinnedProduct?.id,
      pinnedProduct: pinnedProduct,
      products: products,
      allowChat: true,
      handRaisedUsers: []
    };
  }, [section.id, cfg, effectiveSessionMode, effectiveSourceType, effectiveAspectRatio, pinnedProduct, products, storeSlug]);

  const handleOpenFunnel = useCallback((product: StoreProductItem) => {
    playValidationBeep();
    setSelectedFunnelProduct(product);
    if (onOpenTunnel) {
      onOpenTunnel(product);
    } else {
      triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
    }
  }, [onOpenTunnel]);

  const handlePin = useCallback((product: StoreProductItem) => {
    playValidationBeep();
    setPinnedProductId(product.id);
  }, []);

  const handleUnpin = useCallback(() => {
    playTapBeep();
    setPinnedProductId('');
  }, []);

  return (
    <section className="w-full py-10 lg:py-16 bg-white relative overflow-hidden">
      {/* En-tête du module Studio */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              {cfg.badgeText || 'Studio Live & Direct Vidéo'}
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {cfg.title || 'Événement en Direct & Présentation Produit'}
            </h2>
            {cfg.subtitle && (
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                {cfg.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Partager l'événement
            </button>
            <a
              href={`/live/${liveSessionObj.sessionSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all hover:scale-105"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir la salle 100%
            </a>
          </div>
        </div>
      </div>

      {/* Lecteur Caméléon & Panneau Interactif */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Lecteur & Carrousel */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <div className="shadow-2xl rounded-2xl overflow-hidden border border-slate-200/80 bg-black">
              <NanasoreOmniPlayer
                session={liveSessionObj}
                isHost={!isPublicView}
                onOpenFunnel={handleOpenFunnel}
                onShareClick={() => setIsShareModalOpen(true)}
              />
            </div>

            <div className="pt-2">
              <LiveProductCarousel
                products={products}
                pinnedProductId={pinnedProductId}
                onOpenFunnel={handleOpenFunnel}
                onPinProduct={!isPublicView ? handlePin : undefined}
                onUnpinProduct={!isPublicView ? handleUnpin : undefined}
                isHost={!isPublicView}
              />
            </div>
          </div>

          {/* Panneau Interactif de la Classe (Chat, Quiz, Devoir PDF, Offres) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <LiveClassroomInteractivePanel
              session={liveSessionObj}
              isHost={!isPublicView}
              onOpenFunnel={handleOpenFunnel}
              onPinProduct={handlePin}
              onUnpinProduct={handleUnpin}
              className="h-[580px] lg:h-[650px]"
            />
          </div>
        </div>
      </div>

      {/* Modal de partage */}
      <LiveShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        sessionSlug={liveSessionObj.sessionSlug}
        title={liveSessionObj.title}
        storeName={liveSessionObj.storeName}
      />

      {/* Tiroir Tunnel d'Achat Overlay sans couper le son ni l'image du direct */}
      {selectedFunnelProduct && (
        <SlideOutFunnelDrawer
          isOpen={Boolean(selectedFunnelProduct)}
          onClose={() => setSelectedFunnelProduct(null)}
          product={selectedFunnelProduct}
          funnelId={selectedFunnelProduct.linkedFunnelId || null}
        />
      )}
    </section>
  );
};
