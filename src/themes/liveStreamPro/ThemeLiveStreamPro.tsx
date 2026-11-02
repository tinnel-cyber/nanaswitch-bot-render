import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, Search, Radio, Zap, ShieldCheck, 
  HelpCircle, Eye, ExternalLink, Play, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { StoreThemeProps } from '../../types/theme';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { LiveBroadcastHeader } from './LiveBroadcastHeader';
import { LiveStage } from './LiveStage';
import { LiveDropSection } from './LiveDropSection';
import { LiveWebinarsSection } from './LiveWebinarsSection';
import { LiveAlertModal } from './LiveAlertModal';
import { LiveHighTicketDetailModal } from './LiveHighTicketDetailModal';
import { 
  DEMO_LIVE_PRODUCTS, 
  DEMO_LIVE_WEBINARS,
  LiveProductItem,
  LiveWebinarItem 
} from './liveStreamAssets';
import { triggerOpenFunnel } from '../themeUtils';
import { AdminSectionEditTrigger } from '../../components/storeBuilder/AdminSectionEditTrigger';
import './liveStreamTheme.css';

export const ThemeLiveStreamPro: React.FC<StoreThemeProps> = (props) => {
  // S'assurer que isAdminPreview est défini (par défaut false si non fourni)
  const isAdminPreview = Boolean(
    props.isAdminPreview ??
    (typeof window !== 'undefined' && ((window as any).isAdminPreview || (window as any).__isAdminPreview)) ??
    false
  );

  const {
    storeConfig,
    storeTheme,
    whiteLabelConfig,
    allProducts,
    filteredProducts,
    categories,
    selectedCategory,
    onSelectCategory,
    searchQuery,
    onSearchChange,
    onClearSearch,
    selectedProduct,
    onSelectProduct,
    onAddToCart,
    onBuyNow,
    getProductWhatsAppUrl,
    isPublicView = false,
    isStoreAdmin,
    isProductEditor,
    canDelete,
    onOpenEditProduct,
    onEditProduct,
    onPreviewFunnel,
    onSelectCustomizerSection,
    onOpenTunnel,
    onOpenFunnel,
    customConfig
  } = props;
  const [localCartCount, setLocalCartCount] = useState(0);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [highTicketProduct, setHighTicketProduct] = useState<LiveProductItem | null>(null);

  // Synchronisation avec selectedProduct transmis depuis l'extérieur (ex: URL ou modal parente)
  useEffect(() => {
    if (selectedProduct) {
      setHighTicketProduct(selectedProduct as LiveProductItem);
    }
  }, [selectedProduct]);

  // Préparation des produits du direct (produits de la boutique ou démo live complète)
  const effectiveLiveProducts = useMemo<LiveProductItem[]>(() => {
    const baseList = (filteredProducts && filteredProducts.length > 0)
      ? filteredProducts
      : (allProducts && allProducts.length > 0)
      ? allProducts
      : DEMO_LIVE_PRODUCTS;

    return baseList.map((p, idx) => {
      // Préserve les métadonnées de live si déjà présentes
      const asLive = p as LiveProductItem;
      return {
        ...p,
        isPinnedOffer: asLive.isPinnedOffer ?? (idx === 0),
        timestampPresentation: asLive.timestampPresentation || (idx === 0 ? 'En cours (08:24)' : `Présenté à ${10 + idx * 8}:15`),
        stockLeft: asLive.stockLeft || Math.max(2, (p.stock || 8) - idx * 2)
      };
    });
  }, [filteredProducts, allProducts]);

  // Offre épinglée du moment (première offre épinglée ou premier produit)
  const pinnedProduct = useMemo<LiveProductItem>(() => {
    if (customConfig?.specialOfferProductId) {
      const matched = effectiveLiveProducts.find((p) => p.id === customConfig.specialOfferProductId);
      if (matched) return matched;
    }
    const found = effectiveLiveProducts.find((p) => p.isPinnedOffer);
    return found || effectiveLiveProducts[0] || DEMO_LIVE_PRODUCTS[0];
  }, [effectiveLiveProducts, customConfig?.specialOfferProductId]);

  // Gestionnaire d'ajout au panier
  const handleAddToCart = (product: LiveProductItem) => {
    playValidationBeep();
    setLocalCartCount((prev) => prev + 1);
    if (onAddToCart) {
      onAddToCart(product, 1);
    }
  };

  // Magie UX (Picture-in-Picture) : Ouverture du Tunnel Dépliable sans couper la vidéo
  const handleOpenOfferInSlideOut = (product: LiveProductItem) => {
    playValidationBeep();
    
    // Déclenche l'ouverture du SlideOutFunnelDrawer via l'écouteur universel nana:open_funnel
    const targetFunnelId = product.linkedFunnelId || 'funnel-kit-live-4k';
    triggerOpenFunnel(targetFunnelId, product.name);

    if (onOpenTunnel) {
      onOpenTunnel(product);
    }
  };

  // Ouverture du tunnel pour une session Masterclass / Replay VIP
  const handleOpenWebinarFunnel = (webinar: LiveWebinarItem) => {
    playValidationBeep();
    const targetFunnelId = webinar.linkedFunnelId || 'funnel-webinar-vip';
    triggerOpenFunnel(targetFunnelId, webinar.title);

    if (onOpenTunnel) {
      onOpenTunnel({
        id: webinar.id,
        name: webinar.title,
        price: webinar.price || 0,
        originalPrice: webinar.originalPrice,
        category: webinar.category,
        stock: 50,
        linkedFunnelId: targetFunnelId
      } as any);
    }
  };

  return (
    <div className="live-stream-root min-h-screen flex flex-col w-full selection:bg-[#6366F1]/30 selection:text-white relative">
      
      {/* ================= 1. HEADER "BROADCAST" (75px, STICKY, GLASSMORPHISM) ================= */}
      <div className="relative group">
        <AdminSectionEditTrigger
          label="✏️ Modifier l'En-Tête Broadcast ⚡"
          targetAccordion={1}
          onSelectSection={onSelectCustomizerSection}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
          position="top-right"
        />
        <LiveBroadcastHeader
          storeConfig={storeConfig}
          cartCount={localCartCount}
          onOpenCart={() => playTapBeep()}
          onOpenAlertModal={() => {
            playTapBeep();
            setIsAlertModalOpen(true);
          }}
          customConfig={customConfig}
        />
      </div>

      {/* ================= 2. LA "SCÈNE PRINCIPALE" (LIVE STAGE 70% / 30%) ================= */}
      <main className="flex-1 w-full">
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Configurer le Live Shopping & Liens ⚡"
            targetAccordion={4}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <LiveStage
            streamUrl={customConfig?.heroVideoUrl || customConfig?.liveStreamVideoUrl || storeConfig.webinar_url || undefined}
            products={effectiveLiveProducts}
            pinnedProduct={pinnedProduct}
            onOpenOffer={handleOpenOfferInSlideOut}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* ================= 3. LA "DROP ZONE" (VENTES FLASH DU DIRECT & GRILLE 4 COLONNES) ================= */}
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier la Grille & Drop Zone ⚡"
            targetAccordion={3}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <LiveDropSection
            products={effectiveLiveProducts}
            onOpenTunnel={(prod) => setHighTicketProduct(prod)}
            onAddToCart={handleAddToCart}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            storeSlug={storeConfig.slug || storeConfig.storeName}
            onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
            onPreviewFunnel={onPreviewFunnel}
            customConfig={customConfig}
          />
        </div>

        {/* ================= 4. SESSIONS MASTERCLASS & REPLAYS VIP (GRILLE 3 COLONNES) ================= */}
        <LiveWebinarsSection
          webinars={DEMO_LIVE_WEBINARS}
          onOpenWebinarFunnel={handleOpenWebinarFunnel}
        />

        {/* ================= 5. BANDEAU DE RÉASSURANCE CINEMA GLASS ================= */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier la Réassurance Cinema ⚡"
            targetAccordion={4}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <div className="p-6 rounded-2xl live-glass-card grid grid-cols-1 md:grid-cols-3 gap-6 text-center border border-white/[0.08]">
            <div className="flex flex-col items-center space-y-2">
              <span className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400" />
              </span>
              <h4 className="font-extrabold text-sm text-white">{customConfig?.reassurance1Title || 'Tunnel Dépliable 1-Clic'}</h4>
              <p className="text-xs text-[#94A3B8]">{customConfig?.reassurance1Desc || 'Commandez instantanément sans quitter ni interrompre le direct vidéo'}</p>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </span>
              <h4 className="font-extrabold text-sm text-white">{customConfig?.reassurance2Title || 'Paiement Mobile Money Sécurisé'}</h4>
              <p className="text-xs text-[#94A3B8]">{customConfig?.reassurance2Desc || 'Encaissement automatisé Wave, Orange Money, Moov, MTN & Cartes'}</p>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <span className="w-10 h-10 rounded-2xl bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center justify-center">
                <Radio className="w-5 h-5 text-[#F59E0B]" />
              </span>
              <h4 className="font-extrabold text-sm text-white">{customConfig?.reassurance3Title || 'Multistreaming Haute Qualité'}</h4>
              <p className="text-xs text-[#94A3B8]">{customConfig?.reassurance3Desc || 'Diffusion simultanée synchronisée sur Facebook, TikTok, YouTube & Instagram'}</p>
            </div>
          </div>
        </section>
      </main>

      {/* ================= 4. FOOTER "BROADCAST STUDIO" ================= */}
      <footer className="w-full border-t border-white/[0.08] bg-[#06070A] py-8 text-center text-xs text-[#94A3B8] px-4 relative group">
        <AdminSectionEditTrigger
          label="✏️ Modifier le Footer Broadcast ⚡"
          targetAccordion={5}
          onSelectSection={onSelectCustomizerSection}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
          position="top-right"
        />
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF2A54] live-pulse-dot" />
            <span className="font-bold text-white">{customConfig?.storeName || storeConfig.name || 'Studio Broadcast Live'}</span>
            <span className="text-slate-500">• {customConfig?.copyrightText || customConfig?.footerAboutText || 'Propulsé par Nanasore Live Commerce'}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>🔴 Multi-Plateformes</span>
            <span>⚡ Tunnels Dépliables</span>
            <span>🔒 Paiement Sécurisé</span>
          </div>
        </div>
      </footer>

      {/* ================= MODAL D'ALERTE DU PROCHAIN LIVE ================= */}
      <LiveAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        storeName={storeConfig.name}
      />

      {/* ================= MODAL FICHE PRODUIT HIGH-TICKET & STACK DE VALEUR ================= */}
      <LiveHighTicketDetailModal
        product={highTicketProduct}
        isOpen={Boolean(highTicketProduct)}
        onClose={() => {
          setHighTicketProduct(null);
          if (onSelectProduct) {
            try { onSelectProduct(null as any); } catch (_) {}
          }
        }}
        onOpenFunnel={handleOpenOfferInSlideOut}
        onAddToCart={handleAddToCart}
        whatsappPhone={storeConfig.whatsappPhone}
      />

      {/* ================= BOUTON FLOTTANT WHATSAPP EN DIRECT DU LIVE ================= */}
      <aside aria-label="Support WhatsApp en direct" className="fixed bottom-6 right-6 z-40">
        <a
          href={`https://wa.me/${(storeConfig.whatsappPhone || '2250700000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
            `Bonjour ! Je suis actuellement connecté sur votre Live ${storeConfig.name || ''} et j'ai une question sur vos offres en direct.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 font-extrabold text-xs shadow-2xl shadow-emerald-950/60 transition transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/40 select-none"
          title="Poser une question en direct sur WhatsApp"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-900"></span>
          </span>
          <span className="hidden sm:inline">💬 Une question pendant le Live ? Écrivez-nous sur WhatsApp</span>
          <span className="sm:hidden">💬 WhatsApp Live</span>
        </a>
      </aside>

    </div>
  );
};

export default ThemeLiveStreamPro;
