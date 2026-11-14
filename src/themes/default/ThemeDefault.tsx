import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, Search, X, ChevronLeft, ChevronRight, Upload, Plus, 
  Edit3, Trash2, Zap, Star, PhoneCall, Truck, CreditCard, ShieldCheck, 
  Flame, Camera, Eye, Sparkles, Radio, Share2, Copy, Store
} from 'lucide-react';
import { StoreThemeProps } from '../../types/theme';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { Interactive3dLoupeImage } from '../../components/storeBuilder/Interactive3dLoupeImage';
import { formatCFA, playTapBeep } from '../../utils/audio';
import { buildPublicShopUrl } from '../../config/domains';
import { AdminSectionEditTrigger } from '../../components/storeBuilder/AdminSectionEditTrigger';
import { AdminProductQuickBar } from '../../components/storeBuilder/AdminProductQuickBar';
import { AdaptiveHeaderEngine } from '../../components/storeBuilder/headers/AdaptiveHeaderEngine';
import { AdaptiveFooterEngine } from '../../components/storeBuilder/footers/AdaptiveFooterEngine';
import { LiveEditable } from '../../components/storeBuilder/LiveEditable';


const DEFAULT_PAYMENT_TICKER = "⚡ PROMO FLASH : LIVRAISON OFFERTE DÈS 10 000 F CFA AUJOURD'HUI ! • PAIEMENT À LA RÉCEPTION (WAVE / ORANGE MONEY / CASH) • COMMANDE RAPIDE EN 1 CLIC SUR WHATSAPP • SERVICE CLIENT 7J/7";

export const ThemeDefault: React.FC<StoreThemeProps> = (props) => {
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
    onSelectProduct,
    onAddToCart,
    onBuyNow,
    getProductWhatsAppUrl,
    isPublicView = false,
    isStoreAdmin,
    isProductEditor,
    canDelete,
    displayBanners,
    bannerIndex,
    bannerScrollRef,
    onScrollBanner,
    logoFileInputRef,
    bannerFileInputRef,
    promoFileInputRef,
    carouselProducts = [],
    carouselColumnCount = 0,
    carouselTopRow = [],
    carouselBottomRow = [],
    promoShelfScrollRef,
    onOpenEditProduct,
    onEditProduct,
    onPreviewFunnel,
    onSelectCustomizerSection,
    onOpenFunnel,
    onOpenTunnel,
    onRemoveProduct,
    onToggleLiveDemo,
    onShareProduct,
    onOpenAddProduct,
    onOpenTickerModal,
    onOpenMarketingAiModal,
    onOpenWebinarModal,
    customConfig
  } = props;
  const [copiedFunnelProdId, setCopiedFunnelProdId] = useState<string | null>(null);
  const [copiedStoreToast, setCopiedStoreToast] = useState(false);

  const handleShareStore = async () => {
    playTapBeep();
    const storeSlug = (storeConfig.slug || storeConfig.storeName || 'boutique').replace(/^store-/, '');
    const url = buildPublicShopUrl(storeSlug);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedStoreToast(true);
      setTimeout(() => setCopiedStoreToast(false), 2500);
    } catch {}
  };

  const handleCopyFunnelLink = (prod: StoreProductItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!prod.linkedFunnelId) return;
    playTapBeep();
    const storeSlug = (storeConfig.slug || storeConfig.storeName || 'boutique').replace(/^store-/, '');
    const url = buildPublicShopUrl(storeSlug, { funnelSlugOrId: prod.linkedFunnelId });
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {}
    setCopiedFunnelProdId(prod.id);
    setTimeout(() => setCopiedFunnelProdId(null), 2500);
  };

  // Produit Vedette / Offre Flash Épinglée (customConfig.specialOfferProductId)
  const specialOfferProduct = useMemo(() => {
    if (customConfig?.specialOfferProductId) {
      const picked = (allProducts || []).find(p => p.id === customConfig.specialOfferProductId);
      if (picked) return picked;
    }
    return (allProducts || []).find(p => p.originalPrice && p.originalPrice > p.price) || null;
  }, [allProducts, customConfig?.specialOfferProductId]);

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto p-2 sm:p-4 space-y-4">
      {/* -----------------------------------------------------------------------
          EN-TÊTE DU THÈME STANDARD ÉLITE (Complet, Isolé ou Adaptatif)
         ----------------------------------------------------------------------- */}
      {customConfig?.headerStyle && customConfig.headerStyle !== 'none' ? (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier l'En-Tête & Logo ⚡"
            targetAccordion={1}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <AdaptiveHeaderEngine
            config={customConfig}
            products={allProducts}
            categories={categories}
            storeSlug={storeConfig?.slug || storeConfig?.storeName || 'boutique'}
            onOpenFunnel={onOpenFunnel || onOpenTunnel}
            onSelectProduct={onSelectProduct}
            onResetToHome={() => {
              if (onSelectCategory) onSelectCategory('Tous');
            }}
            onSelectCategory={onSelectCategory}
            onSearch={onSearchChange}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier l'En-Tête & Logo ⚡"
            targetAccordion={1}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <header
            className="sticky top-0 z-30 bg-card/95 border border-theme text-body shadow-md backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-2xl flex items-center justify-between gap-2 transition-colors duration-200"
            style={customConfig?.headerBgColor ? { backgroundColor: customConfig.headerBgColor } : undefined}
          >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          {(customConfig?.logoUrl || storeConfig.logoUrl) ? (
            <img 
              src={customConfig?.logoUrl || storeConfig.logoUrl} 
              alt={customConfig?.storeName || storeConfig.storeName || 'Logo'} 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0" 
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-md border-2 border-emerald-400/40 shrink-0">
              <Store className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <h1 className="font-extrabold text-xs sm:text-sm tracking-tight leading-tight truncate text-body">
                {customConfig?.storeName || storeConfig.storeName || 'Ma Boutique'}
              </h1>
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-emerald-500/40 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>CERTIFIÉE ✓</span>
              </span>
            </div>
            {(customConfig?.storeTagline || customConfig?.whatsappNumber || storeConfig.whatsappPhone) && (
              <p className="text-[10px] truncate text-muted font-medium">
                {customConfig?.storeTagline || customConfig?.whatsappNumber || storeConfig.whatsappPhone}
              </p>
            )}
          </div>
        </div>

        {/* Droite : Partager la boutique & Panier */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleShareStore}
            className="flex items-center gap-1 bg-secondary hover:bg-card-hover active:scale-95 text-body px-2.5 py-1.5 rounded-xl font-bold text-xs transition border border-theme cursor-pointer shadow-sm"
            title="Copier le lien officiel de la boutique (nsore.shop)"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">{copiedStoreToast ? '✓ Copié !' : 'Partager'}</span>
          </button>

          <button
            id="btn-store-cart"
            type="button"
            onClick={() => {
              playTapBeep();
              // Déclenche l'ouverture du tiroir de caisse/panier dans le composant parent
              const globalCartBtn = document.querySelector('button[title*="panier"], button[title*="Panier"]') as HTMLButtonElement;
              if (globalCartBtn) globalCartBtn.click();
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-xl font-bold text-xs transition border border-emerald-500 cursor-pointer shadow-sm active:scale-95"
            title="Consulter le panier"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Panier</span>
          </button>
        </div>
      </header>
      </div>
      )}

      {/* -----------------------------------------------------------------------
          SECTION 1 : VRAI CARROUSEL DÉFILANT D'AFFICHES & PROMOTIONS (SNAP-X)
         ----------------------------------------------------------------------- */}
      <section className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 group">
        <AdminSectionEditTrigger
          label="✏️ Personnaliser le Hero (Titre & Bannières) ⚡"
          targetAccordion={2}
          onSelectSection={onSelectCustomizerSection}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
          position="top-right"
        />
        {/* Conteneur Défilant Horizontal */}
        <div 
          ref={bannerScrollRef}
          className="flex w-full overflow-x-auto scroll-smooth scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {displayBanners.map((banner, index) => {
            const effectiveImage = index === 0 && customConfig?.heroBannerImageUrl ? customConfig.heroBannerImageUrl : banner.image;
            const effectiveBadge = index === 0 && customConfig?.heroSubtitle ? customConfig.heroSubtitle : (banner.badge || "🔥 OFFRE SPÉCIALE");
            const effectiveTitle = index === 0 && customConfig?.heroTitle ? customConfig.heroTitle : (banner.title || customConfig?.storeName || storeConfig.storeName);
            const effectiveSubtitle = index === 0 && customConfig?.heroDescription ? customConfig.heroDescription : (banner.subtitle || storeConfig.welcomeText);

            return (
              <div 
                key={index}
                className="w-full shrink-0 snap-center relative min-h-[220px] sm:min-h-[280px] flex flex-col justify-end p-4 sm:p-6"
              >
                {/* Vidéo ou Image de fond avec filtre et dégradé chaleureux */}
                {index === 0 && customConfig?.heroVideoUrl ? (
                  <video
                    src={customConfig.heroVideoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={effectiveImage}
                    className="absolute inset-0 w-full h-full object-cover select-none"
                  />
                ) : (
                  <img 
                    src={effectiveImage} 
                    alt={effectiveTitle || 'Bannière'} 
                    className="absolute inset-0 w-full h-full object-cover select-none"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                {/* Contenu textuel avec badge et boutons d'action rapide */}
                <div className="relative z-10 space-y-1.5 max-w-md">
                  <LiveEditable
                    label="Badge Bannière Hero"
                    field="heroSubtitle"
                    value={effectiveBadge}
                    targetAccordion={2}
                    isAdminPreview={isAdminPreview}
                    isInline={true}
                  >
                    <span className="inline-block bg-emerald-500 text-slate-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                      {effectiveBadge}
                    </span>
                  </LiveEditable>
                  <LiveEditable
                    label="Titre Bannière Hero"
                    field="heroTitle"
                    value={effectiveTitle}
                    targetAccordion={2}
                    isAdminPreview={isAdminPreview}
                  >
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                      {effectiveTitle}
                    </h2>
                  </LiveEditable>
                  <LiveEditable
                    label="Description Bannière Hero"
                    field="heroDescription"
                    value={effectiveSubtitle}
                    type="textarea"
                    targetAccordion={2}
                    isAdminPreview={isAdminPreview}
                  >
                    <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 drop-shadow">
                      {effectiveSubtitle}
                    </p>
                  </LiveEditable>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flèches de navigation manuelle du Carrousel (Visibles au survol sur Desktop) */}
        {displayBanners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onScrollBanner('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs border border-white/20 cursor-pointer shadow-lg"
              title="Affiche précédente"
              aria-label="Affiche précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onScrollBanner('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs border border-white/20 cursor-pointer shadow-lg"
              title="Affiche suivante"
              aria-label="Affiche suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicateurs de pagination (Petits points en bas au centre) */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/60 backdrop-blur-xs border border-white/10">
              {displayBanners.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    bannerIndex === dotIdx 
                      ? 'w-5 bg-emerald-400' 
                      : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Boutons Flottants Discrets : Changer la bannière, Ajouter affiche & Logo (Commerçant uniquement) */}
        {!isPublicView && isStoreAdmin && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                logoFileInputRef?.current?.click();
              }}
              className="bg-slate-950/80 hover:bg-slate-950 active:scale-95 text-emerald-300 text-[10.5px] font-extrabold px-2.5 py-1.5 rounded-xl backdrop-blur-md border border-emerald-400/30 flex items-center gap-1 shadow-lg transition cursor-pointer"
              title="Changer le logo de la boutique"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>📷 Logo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                bannerFileInputRef?.current?.click();
              }}
              className="bg-slate-950/80 hover:bg-slate-950 active:scale-95 text-white text-[10.5px] font-extrabold px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              title="Remplacer la bannière avec compression Canvas"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bannière</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                promoFileInputRef?.current?.click();
              }}
              className="bg-slate-950/80 hover:bg-slate-950 active:scale-95 text-amber-300 text-[10.5px] font-extrabold px-2.5 py-1.5 rounded-xl backdrop-blur-md border border-amber-400/30 flex items-center gap-1 shadow-lg transition cursor-pointer"
              title="Ajouter une affiche promotionnelle"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Affiche promo</span>
            </button>
          </div>
        )}
      </section>

      {/* -----------------------------------------------------------------------
          BANDEAU D'ANNONCE DÉFILANT (TICKER MARQUEE PROMO FLASH & PAIEMENT)
         ----------------------------------------------------------------------- */}
      {(customConfig?.announcementBarEnabled ?? (storeConfig.showPaymentTicker !== false)) && (
        <div className="relative group">
          <div 
            onClick={(!isPublicView && isStoreAdmin) ? () => { playTapBeep(); onOpenTickerModal?.(); } : undefined}
            className={`bg-gradient-to-r ${storeConfig.tickerBgGradient || "from-amber-600 via-orange-600 to-amber-600"} rounded-2xl p-2 sm:p-2.5 text-white text-xs font-black shadow-md overflow-hidden whitespace-nowrap flex items-center gap-2 transition ${(!isPublicView && isStoreAdmin) ? 'cursor-pointer hover:opacity-95' : ''}`}
            title={(!isPublicView && isStoreAdmin) ? "Cliquer pour modifier le texte et les moyens de paiement du bandeau" : undefined}
          >
            <Zap className="w-4 h-4 text-amber-200 shrink-0 ml-1 animate-pulse" />
            <div className="inline-block animate-marquee uppercase tracking-wider font-extrabold text-[11px] pr-6">
              {customConfig?.announcementBarText || storeConfig.paymentTickerText || DEFAULT_PAYMENT_TICKER} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; {customConfig?.announcementBarText || storeConfig.paymentTickerText || DEFAULT_PAYMENT_TICKER}
            </div>

            {!isPublicView && isStoreAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playTapBeep();
                  onOpenTickerModal?.();
                }}
                className="ml-auto shrink-0 bg-slate-950/75 hover:bg-slate-950 active:scale-95 text-white text-[10.5px] font-bold px-2.5 py-1 rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-1 shadow-sm transition cursor-pointer"
                title="Modifier le bandeau de promotion et de paiement"
              >
                <Edit3 className="w-3 h-3 text-amber-300" />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* SOUS-BANNIÈRES SECONDAIRES EMPILÉES (subBanner1 & subBanner2) */}
      {(customConfig?.subBanner1Title || customConfig?.subBanner1Image || customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {(customConfig?.subBanner1Title || customConfig?.subBanner1Image) && (
            <div
              onClick={() => {
                playTapBeep();
                const gridEl = document.getElementById('standard-catalog-grid');
                if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:shadow-lg transition-all group border border-emerald-500/30"
            >
              <div className="space-y-1 z-10">
                {customConfig?.subBanner1Badge && (
                  <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-emerald-800 inline-block">
                    {customConfig.subBanner1Badge}
                  </span>
                )}
                <h4 className="text-base font-black leading-tight text-white group-hover:text-amber-200 transition-colors">
                  {customConfig.subBanner1Title}
                </h4>
                {customConfig?.subBanner1Subtitle && (
                  <p className="text-[11px] text-emerald-100 max-w-xs">{customConfig.subBanner1Subtitle}</p>
                )}
                {customConfig?.subBanner1CtaText && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-200 pt-1">
                    <span>{customConfig.subBanner1CtaText}</span>
                    <span className="group-hover:translate-x-1 transition-transform">›</span>
                  </span>
                )}
              </div>
              {customConfig?.subBanner1Image && (
                <img
                  src={customConfig.subBanner1Image}
                  alt={customConfig.subBanner1Title || 'Bannière'}
                  className="w-20 sm:w-24 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                />
              )}
            </div>
          )}
          {(customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
            <div
              onClick={() => {
                playTapBeep();
                const gridEl = document.getElementById('standard-catalog-grid');
                if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:shadow-lg transition-all group border border-slate-700"
            >
              <div className="space-y-1 z-10">
                {customConfig?.subBanner2Badge && (
                  <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 inline-block">
                    {customConfig.subBanner2Badge}
                  </span>
                )}
                <h4 className="text-base font-black leading-tight text-white group-hover:text-amber-300 transition-colors">
                  {customConfig.subBanner2Title}
                </h4>
                {customConfig?.subBanner2Subtitle && (
                  <p className="text-[11px] text-slate-300 max-w-xs">{customConfig.subBanner2Subtitle}</p>
                )}
                {customConfig?.subBanner2CtaText && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 pt-1">
                    <span>{customConfig.subBanner2CtaText}</span>
                    <span className="group-hover:translate-x-1 transition-transform">›</span>
                  </span>
                )}
              </div>
              {customConfig?.subBanner2Image && (
                <img
                  src={customConfig.subBanner2Image}
                  alt={customConfig.subBanner2Title || 'Bannière'}
                  className="w-20 sm:w-24 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* OFFRE VEDETTE / PROMO FLASH (specialOfferProductId) */}
      {specialOfferProduct && (
        <div className="pt-2">
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-50/50 via-card to-teal-50/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-card border border-theme p-1.5 flex items-center justify-center shrink-0">
                <img
                  src={specialOfferProduct.image}
                  alt={specialOfferProduct.name}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[9.5px] uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span>Offre Vedette</span>
                  </span>
                  {specialOfferProduct.originalPrice && specialOfferProduct.originalPrice > specialOfferProduct.price && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-black text-[9.5px]">
                      -{Math.round(((specialOfferProduct.originalPrice - specialOfferProduct.price) / specialOfferProduct.originalPrice) * 100)}%
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-body tracking-tight line-clamp-1">
                  {specialOfferProduct.name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-emerald-600">
                    {formatCFA(specialOfferProduct.price)}
                  </span>
                  {specialOfferProduct.originalPrice && specialOfferProduct.originalPrice > specialOfferProduct.price && (
                    <span className="text-xs text-muted line-through">
                      {formatCFA(specialOfferProduct.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onSelectProduct?.(specialOfferProduct)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-secondary hover:bg-card-hover text-body font-bold text-xs border border-theme transition cursor-pointer"
              >
                Détails
              </button>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (onBuyNow) {
                    onBuyNow(specialOfferProduct, 1);
                  } else {
                    onAddToCart?.(specialOfferProduct, 1);
                  }
                }}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                Commander
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          SECTION 2 : RAYON 1 -> "PROMOTIONS & NOUVEAUTÉS" (DÉFILANT SOUS LE POUCE)
         ----------------------------------------------------------------------- */}
      <section className="space-y-2.5 pt-2 relative group">
        <AdminSectionEditTrigger
          label="✏️ Modifier la Grille & Titres ⚡"
          targetAccordion={3}
          onSelectSection={onSelectCustomizerSection}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
          position="top-right"
        />
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-1.5 text-body">
                Promotions & Nouveautés
                <span className="bg-orange-500 text-slate-950 text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase">
                  -20% cette semaine
                </span>
              </h3>
              <p className="text-[10px] text-muted">
                Faites glisser sous le pouce vers la droite 👉
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPublicView && isStoreAdmin && (
              <button
                type="button"
                onClick={() => { 
                  playTapBeep(); 
                  onOpenMarketingAiModal?.();
                }}
                className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-amber-300 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Rédiger du contenu de vente avec l'Assistant Marketing IA"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Marketing Pro</span>
              </button>
            )}

            {!isPublicView && isStoreAdmin && (
              <button
                id="btn-store-live"
                type="button"
                onClick={() => { 
                  playTapBeep(); 
                  onOpenWebinarModal?.();
                }}
                className="bg-gradient-to-r from-rose-600/20 to-blue-600/20 hover:from-rose-600/30 hover:to-blue-600/30 border border-rose-500/30 text-rose-300 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Organiser un Live Shopping ou Webinaire"
              >
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Live Shopping</span>
              </button>
            )}

            {!isPublicView && isStoreAdmin && (
              <button
                id="btn-store-add-product"
                type="button"
                onClick={() => { 
                  playTapBeep(); 
                  onOpenAddProduct?.();
                }}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                title="Ajouter un nouvel article au catalogue"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ajouter un produit</span>
              </button>
            )}
            <span className="text-[11px] text-blue-500 font-bold hidden sm:inline">{carouselProducts.length} offres</span>
          </div>
        </div>

        {/* Carrousel Horizontal Fluide sous le pouce (2 rangées de 5 produits, max 10 produits) */}
        <div 
          ref={promoShelfScrollRef}
          className="flex gap-2.5 overflow-x-auto scroll-smooth scrollbar-none pb-2 pt-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {Array.from({ length: carouselColumnCount }).map((_, colIdx) => {
            const topProd = carouselTopRow[colIdx];
            const bottomProd = carouselBottomRow[colIdx];

            const renderCarouselCard = (prod: StoreProductItem, position: 'top' | 'bottom') => {
              const discount = prod.originalPrice && prod.originalPrice > prod.price
                ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={`carousel-${position}-${prod.id}-${colIdx}`}
                  onClick={() => {
                    playTapBeep();
                    onSelectProduct(prod);
                  }}
                  className="w-full rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:z-30 group relative bg-card border border-theme hover:border-emerald-500 shadow-xs hover:shadow-md"
                >
                  <AdminProductQuickBar
                    product={prod}
                    isPublicView={isPublicView}
                    isAdminPreview={isAdminPreview}
                    storeSlug={storeConfig.slug || storeConfig.storeName}
                    onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
                    onPreviewFunnel={onPreviewFunnel}
                  />
                  <Interactive3dLoupeImage
                    src={prod.image}
                    alt={prod.name}
                    containerClassName="w-full h-24 sm:h-28 rounded-xl mb-1.5 bg-secondary"
                    className="w-full h-full object-cover"
                    borderRadius="0.75rem"
                    maxScale={1.42}
                    maxRotate={15}
                  >
                    {discount > 0 ? (
                      <span className="absolute top-1 left-1 bg-rose-600 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded-md shadow-md uppercase tracking-tight z-10 pointer-events-none">
                        -{discount}%
                      </span>
                    ) : prod.badge ? (
                      <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 text-[8.5px] font-black px-1.5 py-0.5 rounded-md shadow-md uppercase z-10 pointer-events-none">
                        {prod.badge}
                      </span>
                    ) : null}

                    <div className="absolute top-1 right-1 backdrop-blur-xs text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 z-10 pointer-events-none bg-card/90 text-emerald-500 border border-theme/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      En stock
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapBeep();
                        onSelectProduct(prod);
                      }}
                      className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-bold backdrop-blur-xs border shadow-xs flex items-center gap-1 transition-all z-20 cursor-pointer pointer-events-auto bg-card/90 text-body hover:bg-emerald-600 hover:text-white border-theme"
                      title={`Aperçu rapide : ${prod.name}`}
                    >
                      <Eye className="w-2.5 h-2.5 text-emerald-500" />
                      <span>Aperçu</span>
                    </button>
                  </Interactive3dLoupeImage>

                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider block text-muted">
                      {prod.category}
                    </span>
                    <h4 className="text-[11px] font-bold line-clamp-1 leading-tight transition text-body group-hover:text-emerald-500">
                      {prod.name}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[9.5px]">
                      <div className="flex items-center text-amber-400">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold ml-0.5 text-body">
                          {prod.rating ? prod.rating.toFixed(1) : '4.8'}
                        </span>
                      </div>
                      <span className="text-muted opacity-60">•</span>
                      <span className="font-medium text-muted">
                        +{prod.salesCount || (prod.price > 10000 ? 65 : 120)} vendus
                      </span>
                    </div>

                    <div className="flex items-baseline flex-wrap gap-1">
                      <span className="text-xs font-black text-emerald-500">
                        {formatCFA(prod.price)}
                      </span>
                      {prod.originalPrice && prod.originalPrice > prod.price && (
                        <span className="text-[9.5px] line-through text-muted">
                          {formatCFA(prod.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {isPublicView ? (
                    <div className="mt-2 pt-1.5 border-t border-theme flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyNow(prod, 1);
                        }}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-sm transition cursor-pointer"
                        title="Acheter maintenant via Nanasore Pay"
                      >
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        <span>Acheter</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(prod, 1);
                        }}
                        className={`p-1.5 rounded-lg border active:scale-95 transition cursor-pointer shrink-0 ${
                          storeTheme === 'light'
                            ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                            : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-300'
                        }`}
                        title="Ajouter au panier"
                        aria-label="Ajouter au panier"
                      >
                        <ShoppingBag className="w-3 h-3" />
                      </button>

                      <a
                        href={getProductWhatsAppUrl(prod)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTapBeep();
                        }}
                        className="p-1.5 rounded-lg border border-theme bg-card hover:bg-card-hover text-emerald-500 active:scale-95 transition shrink-0"
                        title="Commander sur WhatsApp"
                      >
                        <PhoneCall className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            onOpenEditProduct?.(prod);
                          }}
                          className="flex-1 py-1 px-1.5 rounded-lg border border-theme bg-card hover:bg-card-hover text-body font-bold text-[9.5px] flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                          title="Modifier ce produit"
                        >
                          <Edit3 className="w-2.5 h-2.5 text-blue-600" />
                          <span>Modifier</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => onOpenFunnel?.(prod, e)}
                          className="py-1 px-1.5 rounded-lg border border-theme bg-card hover:bg-card-hover text-body font-black text-[9.5px] flex items-center justify-center gap-0.5 transition cursor-pointer active:scale-95"
                          title="Créer / modifier le tunnel de vente pour ce produit"
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          <span>Funnel</span>
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => onRemoveProduct?.(prod.id, prod.name, e)}
                            className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-600 border border-rose-500/20 active:scale-95 transition cursor-pointer"
                            title="Retirer ce produit de la vitrine"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => onToggleLiveDemo?.(prod, e)}
                          className={`flex-1 py-1 px-1.5 rounded-lg border font-bold text-[9px] flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                            prod.hasLiveDemo
                              ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border-rose-500/30'
                              : 'bg-card hover:bg-card-hover text-muted border-theme'
                          }`}
                          title="Activer ou désactiver le bouton Voir en Direct pour ce produit"
                        >
                          <span className={`w-2 h-2 rounded-full ${prod.hasLiveDemo ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
                          <span>{prod.hasLiveDemo ? 'Live Actif' : 'Activer Live'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => onShareProduct?.(prod, e)}
                          className="p-1 rounded-lg border border-theme bg-card hover:bg-card-hover text-body active:scale-95 transition cursor-pointer"
                          title="Partager le lien de ce produit"
                        >
                          <Share2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div key={`carousel-col-${colIdx}`} className="flex flex-col gap-2.5 shrink-0 snap-start w-44 sm:w-48">
                {topProd && renderCarouselCard(topProd, 'top')}
                {bottomProd && renderCarouselCard(bottomProd, 'bottom')}
              </div>
            );
          })}
        </div>
      </section>

      {/* -----------------------------------------------------------------------
          SECTION 3 : RAYON 2 -> "TOUS NOS ARTICLES" (GRILLE À 2 COLONNES)
         ----------------------------------------------------------------------- */}
      <section className="space-y-3 pt-4 border-t border-theme">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm flex items-center gap-2 text-body">
              <ShoppingBag className="w-4 h-4 text-emerald-500" />
              Tous nos articles en rayon
            </h3>
            <div className="flex items-center gap-2">
              {!isPublicView && isStoreAdmin && (
                <button
                  type="button"
                  onClick={() => { 
                    playTapBeep(); 
                    onOpenAddProduct?.();
                  }}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 active:scale-95 text-emerald-500 border border-emerald-500/40 font-extrabold text-xs px-2.5 py-1 rounded-xl flex items-center gap-1 transition cursor-pointer"
                  title="Ajouter un article au catalogue"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Ajouter</span>
                </button>
              )}
              <span className="text-xs font-bold text-muted">
                {filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Barre de Recherche Intuitive */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un produit (ex: riz, lait, huile, savon)..."
              className="w-full rounded-2xl pl-9 pr-8 py-2.5 text-xs transition shadow-xs focus:outline-none bg-input border border-theme text-body placeholder:text-muted focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body cursor-pointer p-0.5"
                title="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtres par Catégories sous forme de pilules cliquables */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  playTapBeep();
                  onSelectCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-card text-muted hover:text-body border border-theme shadow-xs'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grille Claire à 2 Colonnes (Mobile) et 3/4 colonnes (Écrans larges) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
          {filteredProducts.map((prod, idx) => {
            const discount = prod.originalPrice && prod.originalPrice > prod.price
              ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
              : 0;

            return (
              <div
                key={`shelf-${prod.id}-${idx}`}
                onClick={() => {
                  playTapBeep();
                  onSelectProduct(prod);
                }}
                className="rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:z-30 group relative bg-card border border-theme hover:border-emerald-500 shadow-xs hover:shadow-lg"
              >
                <AdminProductQuickBar
                  product={prod}
                  isPublicView={isPublicView}
                  isAdminPreview={isAdminPreview}
                  storeSlug={storeConfig.slug || storeConfig.storeName}
                  onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
                  onPreviewFunnel={onPreviewFunnel}
                />
                <Interactive3dLoupeImage
                  src={prod.image}
                  alt={prod.name}
                  containerClassName="w-full h-32 sm:h-36 rounded-xl mb-2 bg-secondary"
                  className="w-full h-full object-cover"
                  borderRadius="0.75rem"
                  maxScale={1.42}
                  maxRotate={15}
                >

                  {discount > 0 ? (
                    <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none bg-rose-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-lg shadow-md uppercase tracking-tight">
                      -{discount}%
                    </div>
                  ) : prod.badge ? (
                    <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none bg-amber-500 text-slate-950 text-[9.5px] font-black px-2 py-0.5 rounded-lg shadow-md uppercase">
                      {prod.badge}
                    </div>
                  ) : null}

                  <div className="absolute top-1.5 right-1.5 backdrop-blur-xs text-[8.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 z-10 pointer-events-none bg-card/90 text-emerald-500 border border-theme/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    En stock
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapBeep();
                      onSelectProduct(prod);
                    }}
                    className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg text-[9px] sm:text-[9.5px] font-bold backdrop-blur-xs border shadow-xs flex items-center gap-1 transition-all z-20 cursor-pointer group/qv pointer-events-auto bg-card/90 text-body hover:bg-emerald-600 hover:text-white border-theme"
                    title={`Aperçu rapide : ${prod.name}`}
                    aria-label={`Aperçu rapide : ${prod.name}`}
                  >
                    <Eye className="w-3 h-3 text-emerald-500 group-hover/qv:text-white shrink-0" />
                    <span>Aperçu</span>
                  </button>
                </Interactive3dLoupeImage>

                <div className="space-y-1">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider block text-muted">
                    {prod.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold line-clamp-2 leading-snug transition text-body group-hover:text-emerald-500">
                    {prod.name}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] pt-0.5">
                    <div className="flex items-center text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-bold ml-1 text-body">
                        {prod.rating ? prod.rating.toFixed(1) : '4.8'}
                      </span>
                    </div>
                    <span className="text-muted opacity-60">•</span>
                    <span className="font-medium text-muted">
                      +{prod.salesCount || (prod.price > 10000 ? 85 : 140)} vendus
                    </span>
                  </div>

                  <div className="flex items-baseline flex-wrap gap-1.5 pt-1">
                    <span className="text-sm sm:text-base font-black text-emerald-500">
                      {formatCFA(prod.price)}
                    </span>
                    {prod.originalPrice && prod.originalPrice > prod.price ? (
                      <>
                        <span className="text-[10.5px] sm:text-xs line-through text-muted">
                          {formatCFA(prod.originalPrice)}
                        </span>
                        <span className="text-[9px] font-black bg-rose-500/15 text-rose-600 border border-rose-500/30 px-1 py-0.2 rounded font-mono">
                          -{discount}%
                        </span>
                      </>
                    ) : (
                      <span className="text-[9.5px] font-medium text-muted">
                        Prix direct
                      </span>
                    )}
                  </div>
                </div>

                {isPublicView ? (
                  <div className="mt-2.5 pt-2 border-t border-theme flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBuyNow(prod, 1);
                      }}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                      title="Acheter maintenant via Nanasore Pay"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Acheter</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(prod, 1);
                      }}
                      className={`p-2 rounded-xl border active:scale-95 transition cursor-pointer shrink-0 ${
                        storeTheme === 'light'
                          ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                          : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-300'
                      }`}
                      title="Ajouter au panier"
                      aria-label="Ajouter au panier"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>

                    {Boolean(prod.linkedFunnelId) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTapBeep();
                          onOpenTunnel?.(prod);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs active:scale-95 transition cursor-pointer flex items-center gap-1 shrink-0"
                        title="Voir le tunnel de vente connecté"
                      >
                        <span>Voir tunnel</span>
                      </button>
                    )}

                    <a
                      href={getProductWhatsAppUrl(prod)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapBeep();
                      }}
                      className="p-2 rounded-xl border border-theme bg-card hover:bg-card-hover text-emerald-500 active:scale-95 transition shrink-0"
                      title="Commander sur WhatsApp"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTapBeep();
                          onOpenEditProduct?.(prod);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl border border-theme bg-card hover:bg-card-hover text-body font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
                        title="Modifier ce produit"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Modifier</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => onOpenFunnel?.(prod, e)}
                        className="py-1.5 px-2.5 rounded-xl border border-theme bg-card hover:bg-card-hover text-body font-black text-xs flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 shadow-xs"
                        title="Créer / modifier le tunnel de vente pour ce produit"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Funnel Builder</span>
                      </button>

                      {Boolean(prod.linkedFunnelId) && (
                        <button
                          type="button"
                          onClick={(e) => handleCopyFunnelLink(prod, e)}
                          className="py-1.5 px-2 rounded-xl border border-blue-500/40 bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 shadow-xs shrink-0"
                          title="Copier le lien direct du Tunnel (?f=...) pour vos pubs Facebook et WhatsApp"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedFunnelProdId === prod.id ? '✓ Copié !' : 'Lien pub'}</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => onRemoveProduct?.(prod.id, prod.name, e)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-600 border border-rose-500/20 active:scale-95 transition cursor-pointer shrink-0"
                          title="Retirer ce produit de la vitrine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => onToggleLiveDemo?.(prod, e)}
                        className={`flex-1 py-1 px-2 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                          prod.hasLiveDemo
                            ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border-rose-500/30'
                            : 'bg-card hover:bg-card-hover text-muted border-theme'
                        }`}
                        title="Activer ou désactiver le bouton Voir en Direct pour ce produit"
                      >
                        <span className={`w-2 h-2 rounded-full ${prod.hasLiveDemo ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{prod.hasLiveDemo ? '🔴 Live Actif sur fiche' : '⚪ Activer Voir en Direct'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => onShareProduct?.(prod, e)}
                        className="p-1.5 rounded-xl border border-theme bg-card hover:bg-card-hover text-body active:scale-95 transition cursor-pointer shrink-0"
                        title="Partager le lien de ce produit"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 rounded-3xl p-6 space-y-2 border border-theme bg-card text-body shadow-xs">
            <p className="font-extrabold text-sm">
              Aucun produit trouvé dans cette catégorie ou recherche
            </p>
            <p className="text-xs text-muted">
              Essayez un autre mot-clé ou sélectionnez "TOUS" dans les rayons.
            </p>
            <button
              type="button"
              onClick={() => {
                onClearSearch();
                onSelectCategory('TOUS');
              }}
              className="mt-2 text-xs font-bold px-4 py-2 rounded-xl transition bg-input hover:bg-card-hover text-body border border-theme cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </section>

      {/* -----------------------------------------------------------------------
          SECTION 4 : RÉASSURANCE VISUELLE COMMERÇANTE (ICÔNES COLORÉES)
         ----------------------------------------------------------------------- */}
      <section className="rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border border-theme bg-card shadow-xs relative group">
        <AdminSectionEditTrigger
          label="✏️ Modifier la Réassurance & Garanties ⚡"
          targetAccordion={4}
          onSelectSection={onSelectCustomizerSection}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
          position="top-right"
        />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-body">{customConfig?.reassurance1Title || 'Livraison en 30 min'}</div>
            <div className="text-[10px] text-muted">{customConfig?.reassurance1Desc || 'À domicile ou au bureau'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-body">{customConfig?.reassurance2Title || 'Paiement à la réception'}</div>
            <div className="text-[10px] text-muted">{customConfig?.reassurance2Desc || 'Wave, Orange Money ou Cash'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-body">{customConfig?.reassurance3Title || 'Fraîcheur 100% garantie'}</div>
            <div className="text-[10px] text-muted">{customConfig?.reassurance3Desc || 'Service client 7j/7 disponible'}</div>
          </div>
        </div>
      </section>

      {/* Pied de page Adaptatif ou Marque Blanche (White Label) */}
      {customConfig?.footerStyle && customConfig.footerStyle !== 'none' ? (
        <div className="mt-10 mb-20 relative group/footer-section">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Coordonnées ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <AdaptiveFooterEngine
            config={customConfig}
            products={allProducts}
            storeSlug={storeConfig?.slug || storeConfig?.storeName || 'boutique'}
            categories={categories}
            onOpenFunnel={onOpenFunnel || onOpenTunnel}
            onSelectProduct={onSelectProduct}
            onResetToHome={() => {
              if (onSelectCategory) onSelectCategory('Tous');
            }}
            onSelectCategory={onSelectCategory}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <footer className="mt-10 mb-20 pt-6 pb-4 border-t border-theme text-center text-xs text-muted space-y-2 relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Coordonnées ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          {customConfig?.footerAboutText && (
            <p className="text-xs text-muted max-w-xl mx-auto">
              {customConfig.footerAboutText}
            </p>
          )}
          {customConfig?.footerAddress && (
            <p className="text-[11px] font-medium text-body">
              📍 {customConfig.footerAddress}
            </p>
          )}
          <p className="font-semibold text-body">
            {customConfig?.copyrightText || whiteLabelConfig?.customFooterText || `© ${new Date().getFullYear()} ${customConfig?.storeName || storeConfig.storeName || 'Boutique en ligne'}. Tous droits réservés.`}
          </p>
          {!whiteLabelConfig?.hidePoweredBy && (
            <p className="text-[10px] text-muted mt-1.5 font-medium">
              Propulsé par <span className="text-body font-bold">Nanasore</span>
            </p>
          )}
        </footer>
      )}
    </main>
  );
};
