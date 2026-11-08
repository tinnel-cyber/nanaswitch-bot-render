import React, { useState, useEffect } from 'react';
import {
  PhysicalFunnelConfig,
  PhysicalFunnelBlock,
  DEFAULT_PHYSICAL_FUNNEL_BLOCKS
} from '../../../types/physicalFunnel';
import { ScarcityUrgencyBlock } from '../../../components/cro/ScarcityUrgencyBlock';
import { TrustBadgesBlock } from '../../../components/cro/TrustBadgesBlock';
import { FlashLiveCtaButton } from '../../../components/cro/FlashLiveCtaButton';
import { InlineGeoCheckoutBlock } from '../../../components/cro/InlineGeoCheckoutBlock';
import { LiveSaleToast } from '../../../components/cro/LiveSaleToast';
import { SocialProofToast } from '../../../components/cro/SocialProofToast';
import { useLiveSalePulse } from '../../../hooks/useLiveSalePulse';
import { getFunnelBySlug } from '../../../services/omniFunnelService';
import { injectFunnelSeoMeta } from '../../../utils/seoMetaService';
import { formatCFA, playValidationBeep, playCashChime } from '../../../utils/audio';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Check,
  Crown,
  Play,
  Zap
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MiniMarketDrawer from '../../../components/funnel/MiniMarketDrawer';

interface PublicPhysicalFunnelViewProps {
  slug: string;
  onBackToStore?: () => void;
  className?: string;
}

export const PublicPhysicalFunnelView: React.FC<PublicPhysicalFunnelViewProps> = ({
  slug,
  onBackToStore = () => {
    if (typeof window !== 'undefined') window.location.href = '/';
  },
  className = ''
}) => {
  const [funnel, setFunnel] = useState<PhysicalFunnelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [isMiniMarketOpen, setIsMiniMarketOpen] = useState(false);
  const [miniMarketCart, setMiniMarketCart] = useState<any[]>([]);
  const [marketProducts, setMarketProducts] = useState<any[]>([
    {
      id: 'fb-1',
      name: 'Batterie Externe PowerBank 10000mAh',
      price: 7500,
      category: 'Accessoires High-Tech',
      image: 'https://images.unsplash.com/photo-1609592424364-5858066fba94?w=400&q=80',
      stock: 25,
    },
    {
      id: 'fb-2',
      name: 'Câble Charge Rapide 3-en-1 Tressé',
      price: 2500,
      category: 'Accessoires High-Tech',
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80',
      stock: 40,
    },
    {
      id: 'fb-3',
      name: 'Lingettes Microfibres Premium (Pack de 3)',
      price: 1500,
      category: 'Entretien',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',
      stock: 60,
    }
  ]);

  useEffect(() => {
    const storeId = funnel?.storeId;
    async function loadProducts() {
      try {
        let query = supabase.from('products').select('*').limit(30);
        if (storeId) {
          query = query.eq('tenant_id', storeId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          setMarketProducts(data.map((p: any) => ({
            id: String(p.id),
            name: p.title || p.name || 'Article',
            price: Number(p.price) || 0,
            category: p.category || 'Général',
            image: p.thumbnail_url || p.image_url || p.image || '/placeholder-product.png',
            stock: p.stock ?? 50
          })));
        }
      } catch (_e) {}
    }
    loadProducts();
  }, [funnel?.storeId]);

  // FOMO live sale pulse
  const { currentNotification, isVisible: isFomoVisible, dismiss: dismissFomo } = useLiveSalePulse(
    funnel?.title || 'Offre Exclusive'
  );

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const cleanSlug = (slug || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    // 1. Lecture immédiate du cache local (0ms sans attendre le réseau)
    try {
      const cachedTyped = localStorage.getItem(`nana_funnel_c-${cleanSlug}`);
      const cachedDirect = localStorage.getItem(`nana_funnel_${cleanSlug}`);
      const raw = cachedTyped || cachedDirect;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.blocks && parsed.blocks.length > 0) {
          setFunnel(parsed);
          setIsLoading(false);
        }
      }
    } catch (e) {}

    // 2. Récupération distante depuis Firestore (collections 'deals' et 'funnels')
    getFunnelBySlug(cleanSlug, 'c')
      .then((remoteData) => {
        if (isCancelled) return;
        if (remoteData && remoteData.blocks && remoteData.blocks.length > 0) {
          setFunnel(remoteData);
          try {
            localStorage.setItem(`nana_funnel_c-${cleanSlug}`, JSON.stringify(remoteData));
          } catch (e) {}
        } else if (!funnel) {
          // 3. Fallback officiel Caisse Express (Produits Physiques) avec blocs CRO
          const fallbackConfig: PhysicalFunnelConfig = {
            id: `caisse_${cleanSlug}`,
            slug: cleanSlug,
            productId: `prod_${cleanSlug}`,
            title: cleanSlug === 'vente' ? 'Offre Spéciale Exclusive & Livraison Express' : `Offre Exclusive • ${cleanSlug.toUpperCase()}`,
            brandColor: '#10b981',
            blocks: DEFAULT_PHYSICAL_FUNNEL_BLOCKS,
            merchantWhatsapp: '+225 07 00 00 00 00',
            ogMetadata: {
              title: cleanSlug === 'vente' ? 'Offre Spéciale Exclusive & Livraison Express' : `Offre Exclusive • ${cleanSlug.toUpperCase()}`,
              description: 'Vente Flash exclusive en Afrique de l\'Ouest avec paiement Wave & Orange Money.',
              imageUrl: '',
              priceAmount: 35000,
              currency: 'FCFA'
            },
            isPublished: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          setFunnel(fallbackConfig);
        }
      })
      .catch((err) => {
        console.warn('[PublicPhysicalFunnelView] Erreur réseau:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  // Détection du bloc hero actif
  const isHeroBlock = (type: string) =>
    type === 'HERO_PRODUCT' || type === 'HERO_SPLIT_LUXURY' || type === 'HERO_VSL_VIDEO' || type === 'HERO_FLASH_CARD';

  // Injection SEO meta OpenGraph
  useEffect(() => {
    if (!funnel) return;
    const heroBlock = funnel.blocks.find(b => isHeroBlock(b.type));
    const heroProps = heroBlock?.props || {};

    const cleanup = injectFunnelSeoMeta({
      title: funnel.ogMetadata?.title || funnel.title || 'Offre Exclusive Caisse Express',
      description: funnel.ogMetadata?.description || heroProps.subheadline || 'Commandez en direct au tarif promotionnel avec livraison rapide.',
      imageUrl: funnel.ogMetadata?.imageUrl || heroProps.imageUrl || '',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      type: 'product',
      price: heroProps.price || funnel.ogMetadata?.priceAmount || 35000,
      currency: funnel.ogMetadata?.currency || 'FCFA',
      siteName: 'NaNa Caisse Express'
    });

    return cleanup;
  }, [funnel]);

  if (isLoading && !funnel) {
    return (
      <div className="min-h-screen w-full bg-[#020617] flex flex-col items-center justify-center p-4 text-slate-100 font-sans select-none">
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur-lg opacity-40 animate-pulse" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-700 flex items-center justify-center shadow-xl border border-emerald-400/40">
            <ShoppingBag className="w-7 h-7 text-white animate-bounce" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-black text-slate-200 tracking-wide">
            Connexion à la Caisse Express sécurisée...
          </span>
        </div>
      </div>
    );
  }

  const activeFunnel = funnel || {
    id: `caisse_${slug}`,
    slug,
    productId: `prod_${slug}`,
    title: 'Offre Exclusive & Livraison Express',
    brandColor: '#10b981',
    blocks: DEFAULT_PHYSICAL_FUNNEL_BLOCKS,
    ogMetadata: {
      title: 'Offre Exclusive & Livraison Express',
      description: 'Vente flash avec livraison express.',
      priceAmount: 35000,
      currency: 'FCFA'
    },
    isPublished: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const brandColor = activeFunnel.brandColor || '#10b981';
  const heroBlock = activeFunnel.blocks.find(b => isHeroBlock(b.type));
  const heroProps = heroBlock?.props || {};

  return (
    <div className={`min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col font-sans select-none overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar ${className}`}>
      
      {/* 1. Header d'assurance Express */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          {onBackToStore && (
            <button
              type="button"
              onClick={onBackToStore}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs font-bold flex items-center gap-1"
              title="Retourner à la boutique"
            >
              <ArrowLeft style={{ color: brandColor }} className="w-4 h-4" />
              <span className="hidden sm:inline">Boutique</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
              className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black border"
            >
              CAISSE EXPRESS 1-CLIC
            </span>
            <span className="text-xs font-black text-white truncate max-w-[160px] sm:max-w-xs">
              {activeFunnel.title}
            </span>
          </div>
        </div>

        {activeFunnel.merchantWhatsapp && (
          <a
            href={`https://wa.me/${activeFunnel.merchantWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, je souhaite commander : ${activeFunnel.title}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: brandColor,
              boxShadow: `0 4px 15px -3px ${brandColor}50`
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-bold text-xs shadow-md transition hover:brightness-110 active:scale-95"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Support WhatsApp</span>
          </a>
        )}
      </header>

      {/* 2. Conteneur Landing Page Caisse Express (60 FPS) */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-24">
        {activeFunnel.blocks.filter(b => b.visible !== false).map((block) => {
          // 2.1 HERO PRODUCT (Design Vitrine CRO Standard)
          if (block.type === 'HERO_PRODUCT') {
            const headline = block.props.headline || activeFunnel.title;
            const subheadline = block.props.subheadline || 'Commandez en direct et recevez votre livraison express.';
            const badge = block.props.badgeText || 'VENTE FLASH EXCLUSIVE • STOCK LIMITÉ';
            const price = Number(block.props.price) || 35000;
            const originalPrice = Number(block.props.originalPrice) || 45000;
            const discount = block.props.discountBadge || '-25% AUJOURD\'HUI';
            const ctaText = block.props.ctaText || 'Commander avec Wave / Orange Money';
            const img = block.props.imageUrl;

            return (
              <section
                key={block.id}
                className="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl"
              >
                {badge && (
                  <span
                    style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
                    className="inline-block px-3 py-1 rounded-full text-xs font-black border"
                  >
                    {badge}
                  </span>
                )}

                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {headline}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  {subheadline}
                </p>

                {img && (
                  <div className="rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-800">
                    <img src={img} alt={headline} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-baseline gap-3 pt-2">
                  <span style={{ color: brandColor }} className="text-3xl sm:text-4xl font-black font-mono">
                    {formatCFA(price)}
                  </span>
                  {originalPrice > 0 && (
                    <span className="text-sm sm:text-base text-slate-500 line-through font-mono">
                      {formatCFA(originalPrice)}
                    </span>
                  )}
                  {discount && (
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-xs font-black border border-rose-500/30">
                      {discount}
                    </span>
                  )}
                </div>

                <a
                  href="#inline-checkout"
                  style={{
                    backgroundColor: brandColor,
                    boxShadow: `0 10px 30px -5px ${brandColor}60`
                  }}
                  className="w-full py-4 px-6 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 hover:brightness-110"
                >
                  <span>{ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </section>
            );
          }

          // 2.2 HERO SPLIT LUXURY 2-COLONNES
          if (block.type === 'HERO_SPLIT_LUXURY') {
            const headline = block.props.headline || activeFunnel.title || 'Collection Signature Prestige';
            const subheadline = block.props.subheadline || 'Un savoir-faire incomparable conçu pour durer toute une vie.';
            const badge = block.props.badgeText || 'COLLECTION ÉLITE • ÉDITION LIMITÉE';
            const price = Number(block.props.price) || 35000;
            const originalPrice = Number(block.props.originalPrice) || 60000;
            const discount = block.props.discountBadge || '-40% ÉLITE';
            const ctaText = block.props.ctaText || 'Réserver Mon Coffret Luxe';
            const img = block.props.imageUrl;
            const bullets = block.props.bulletPoints || [
              'Finition Haute Précision & Matériaux Nobles',
              'Garantie Privilège 24 Mois Échange à Neuf',
              'Livraison Express Sous Scellé Sécurisé'
            ];
            const rating = block.props.luxuryRating || '4.9/5 • 1 200+ Clients Privilège';

            return (
              <section
                key={block.id}
                style={{ borderColor: `${brandColor}40` }}
                className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border shadow-2xl relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
                      className="px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>{badge}</span>
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {headline}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    {subheadline}
                  </p>

                  {img && (
                    <div
                      style={{ boxShadow: `0 15px 40px -10px ${brandColor}40` }}
                      className="rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 relative"
                    >
                      <img src={img} alt={headline} className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-amber-400 font-black">★ {rating}</span>
                        <span style={{ color: brandColor }} className="font-bold text-[10.5px]">Édition Numérotée</span>
                      </div>
                    </div>
                  )}

                  {/* Puces de réassurance Prestige */}
                  <div className="space-y-2 pt-1">
                    {bullets.map((b: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <CheckCircle2 style={{ color: brandColor }} className="w-4 h-4 shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tarification */}
                  <div className="flex items-baseline gap-3 pt-2">
                    <span style={{ color: brandColor }} className="text-3xl sm:text-4xl font-black font-mono">
                      {formatCFA(price)}
                    </span>
                    {originalPrice > 0 && (
                      <span className="text-sm sm:text-base text-slate-500 line-through font-mono">
                        {formatCFA(originalPrice)}
                      </span>
                    )}
                    {discount && (
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                        {discount}
                      </span>
                    )}
                  </div>

                  <a
                    href="#inline-checkout"
                    style={{
                      backgroundColor: brandColor,
                      boxShadow: `0 10px 30px -5px ${brandColor}60`
                    }}
                    className="w-full py-4 px-6 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 hover:brightness-110"
                  >
                    <Crown className="w-4 h-4" />
                    <span>{ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </section>
            );
          }

          // 2.3 HERO VIDÉO VSL HAUTE CONVERSION
          if (block.type === 'HERO_VSL_VIDEO') {
            const headline = block.props.headline || 'Découvrez la Démonstration Complète en Vidéo';
            const subheadline = block.props.subheadline || 'Regardez la démonstration complète avant de commander.';
            const price = Number(block.props.price) || 25000;
            const originalPrice = Number(block.props.originalPrice) || 40000;
            const discount = block.props.discountBadge || '-35% OFFRE VIDÉO';
            const ctaText = block.props.ctaText || 'Commander Après Démonstration';
            const videoUrl = block.props.videoUrl;
            const viewers = block.props.viewersCount || '284';
            const liveNotice = block.props.liveNotice || '🔴 VIDÉO EXCLUSIVE • Démonstration en direct';

            return (
              <section key={block.id} className="p-5 sm:p-7 rounded-3xl bg-slate-900/95 border border-slate-800 space-y-4 shadow-2xl text-center">
                {/* Ticker Live Supérieur */}
                <div className="flex items-center justify-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                    {liveNotice} • <strong className="text-white">{viewers} personnes</strong> regardent
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {headline}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300">
                  {subheadline}
                </p>

                {/* Cadre Vidéo Player */}
                <div className="rounded-2xl overflow-hidden aspect-video bg-black border border-slate-800 relative shadow-2xl flex items-center justify-center">
                  {videoUrl && (videoUrl.includes('youtube') || videoUrl.includes('youtu.be')) ? (
                    <iframe
                      src={videoUrl.replace('watch?v=', 'embed/')}
                      title="VSL Product Video"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : videoUrl && videoUrl.endsWith('.mp4') ? (
                    <video src={videoUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 cursor-pointer group">
                      <div
                        style={{ backgroundColor: brandColor, boxShadow: `0 0 35px ${brandColor}` }}
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white transition transform group-hover:scale-110 active:scale-95"
                      >
                        <Play className="w-7 h-7 fill-white ml-1" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">
                        Cliquez pour lancer la vidéo de présentation (3 min 45 s)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Son & Haute Définition activés
                      </span>
                    </div>
                  )}
                </div>

                {/* Tarification & Bouton Sous la Vidéo */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <span style={{ color: brandColor }} className="text-3xl font-black font-mono">
                    {formatCFA(price)}
                  </span>
                  {originalPrice > 0 && (
                    <span className="text-sm text-slate-500 line-through font-mono">
                      {formatCFA(originalPrice)}
                    </span>
                  )}
                  {discount && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-xs font-black border border-rose-500/30">
                      {discount}
                    </span>
                  )}
                </div>

                <a
                  href="#inline-checkout"
                  style={{
                    backgroundColor: brandColor,
                    boxShadow: `0 12px 30px -6px ${brandColor}60`
                  }}
                  className="w-full py-4 px-6 active:scale-98 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition hover:brightness-110"
                >
                  <span>{ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </section>
            );
          }

          // 2.4 HERO FLASH DEALS CARD 3D
          if (block.type === 'HERO_FLASH_CARD') {
            const headline = block.props.headline || 'Deal Éclair 3D • Édition Chrono';
            const subheadline = block.props.subheadline || 'Profitez de la remise maximale avant la fin du compte à rebours.';
            const badge = block.props.badgeText || '⚡ DEAL ÉCLAIR DU JOUR';
            const price = Number(block.props.price) || 22000;
            const originalPrice = Number(block.props.originalPrice) || 45000;
            const discount = block.props.discountBadge || '-50% FLASH';
            const ctaText = block.props.ctaText || 'Saisir le Deal Immédiatement';
            const img = block.props.imageUrl;
            const stockLeft = block.props.stockLeft || 4;

            return (
              <section
                key={block.id}
                style={{
                  borderColor: brandColor,
                  boxShadow: `0 15px 40px -10px ${brandColor}30`
                }}
                className="p-5 sm:p-7 rounded-3xl bg-slate-900 border-2 space-y-4 relative overflow-hidden"
              >
                {/* Bandeau Supérieur Éclair */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span
                    style={{ backgroundColor: `${brandColor}20`, color: brandColor, borderColor: `${brandColor}40` }}
                    className="px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{badge}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-black border border-rose-500/30">
                    {discount}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {headline}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  {subheadline}
                </p>

                {img && (
                  <div className="rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-800">
                    <img src={img} alt={headline} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Jauge Stock Flash */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-400">Stock Flash Disponible :</span>
                    <span className="text-rose-400 font-mono">Plus que {stockLeft} unités</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(10, (stockLeft / 20) * 100)}%`, backgroundColor: brandColor }}
                      className="h-full rounded-full transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-baseline gap-3 pt-1">
                  <span style={{ color: brandColor }} className="text-3xl font-black font-mono">
                    {formatCFA(price)}
                  </span>
                  {originalPrice > 0 && (
                    <span className="text-sm text-slate-500 line-through font-mono">
                      {formatCFA(originalPrice)}
                    </span>
                  )}
                </div>

                <a
                  href="#inline-checkout"
                  style={{
                    backgroundColor: brandColor,
                    boxShadow: `0 10px 25px -5px ${brandColor}60`
                  }}
                  className="w-full py-4 px-6 active:scale-98 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition hover:brightness-110"
                >
                  <Zap className="w-4 h-4" />
                  <span>{ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </section>
            );
          }

          // 2.5 SCARCITY / JAUGE RARETÉ & COMPTE À REBOURS
          if (block.type === 'SCARCITY_URGENCY') {
            return (
              <ScarcityUrgencyBlock
                key={block.id}
                totalStock={block.props.totalStock || 30}
                remainingStock={block.props.remainingStock || 7}
                hoursLeft={block.props.hoursLeft || 3}
                urgencyText={block.props.urgencyText}
              />
            );
          }

          // 2.6 AVANTAGES CLÉS AIDA
          if (block.type === 'BENEFITS_LIST') {
            const bullets = block.props.bullets || [
              { title: 'Qualité Supérieure Certifiée', desc: 'Conçu avec des matériaux durables et résistants.' },
              { title: 'Garantie Totale 12 Mois', desc: 'Échange immédiat en cas de défaut.' },
              { title: 'Livraison Express Sécurisée', desc: 'Vérifiez votre colis avant de régler.' }
            ];

            return (
              <section key={block.id} className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
                <h3 className="text-base font-black text-white">
                  {block.props.headline || 'Pourquoi nos clients adorent ce produit :'}
                </h3>
                <div className="space-y-2.5">
                  {bullets.map((b: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                      <CheckCircle2 style={{ color: brandColor }} className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white">{b.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          // 2.7 CONCIERGE VISIO WEBRTC LIVE
          if (block.type === 'FLASH_LIVE_CTA') {
            return (
              <FlashLiveCtaButton
                key={block.id}
                buttonText={block.props.buttonText}
                badgeText={block.props.badgeText}
                merchantPhone={block.props.merchantPhone || activeFunnel.merchantWhatsapp}
              />
            );
          }

          // 2.8 BADGES DE CONFIANCE & RÉASSURANCE
          if (block.type === 'TRUST_BADGES') {
            return (
              <TrustBadgesBlock
                key={block.id}
                badges={block.props.badges}
                brandColor={brandColor}
              />
            );
          }

          // 2.9 AVIS CLIENTS VÉRIFIÉS
          if (block.type === 'CUSTOMER_REVIEWS') {
            const reviews = block.props.reviews || [
              { name: 'Kouamé Y.', city: 'Abidjan', comment: 'Livraison reçue en 4h chrono, produit conforme à 100% !' },
              { name: 'Fatou D.', city: 'Dakar', comment: 'Très bonne qualité, j\'ai pu payer par Wave à la livraison.' }
            ];

            return (
              <section key={block.id} className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white">
                    {block.props.headline || 'Avis Clients Vérifiés'}
                  </h3>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    ★ {block.props.rating || '4.9/5'}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {reviews.map((rev: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-200 mb-1">
                        <span>{rev.name} ({rev.city})</span>
                        <span style={{ color: brandColor }} className="text-[10px] font-bold">Achat Vérifié ✓</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          // 2.10 CAISSE GEO-ROUTÉE INTÉGRÉE
          if (block.type === 'INLINE_CHECKOUT') {
            return (
              <InlineGeoCheckoutBlock
                key={block.id}
                productName={activeFunnel.title}
                price={heroProps.price || 35000}
                originalPrice={heroProps.originalPrice || 45000}
                brandColor={brandColor}
                heading={block.props.heading}
                subheading={block.props.subheading}
                deliveryOptions={activeFunnel.deliveryOptions}
                orderBump={activeFunnel.orderBump}
                orderBumpEnabled={activeFunnel.orderBumpEnabled}
                acceptedProviders={activeFunnel.paymentMethods}
                onPaymentCompleted={(txData) => {
                  setCompletedOrder(txData);
                  playCashChime();
                }}
              />
            );
          }

          // 2.11 MINI-MARKET EXPRESS (AUTO-COMPOSITION)
          if (block.type === 'MINI_MARKET_DRAWER') {
            const headline = block.props.headline || 'Complétez votre commande avec le Mini-Market';
            const subheadline = block.props.subheadline || 'Ajoutez des articles complémentaires sans frais de livraison supplémentaires.';
            const buttonText = block.props.buttonText || 'Explorer le Mini-Market';
            const badgeText = block.props.badgeText || 'Auto-composition';

            return (
              <section key={block.id} className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 space-y-3 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {headline}
                        </h4>
                        {badgeText && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                            {badgeText}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {subheadline}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMiniMarketOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{buttonText}</span>
                    {miniMarketCart.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] font-black">
                        {miniMarketCart.reduce((s, i) => s + (i.quantity || 1), 0)}
                      </span>
                    )}
                  </button>
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>

      {/* Bouton Flottant Latéral Mini-Market */}
      <button
        type="button"
        onClick={() => setIsMiniMarketOpen(true)}
        className="fixed right-3 bottom-8 sm:bottom-10 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-[0_12px_30px_-5px_rgba(16,185,129,0.55)] border border-emerald-400/40 backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer text-xs"
        title="Explorer le Mini-Market"
      >
        <div className="relative flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-white" />
          {miniMarketCart.length > 0 && (
            <span className="absolute -top-2.5 -right-2.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white animate-pulse">
              {miniMarketCart.reduce((s, i) => s + (i.quantity || 1), 0)}
            </span>
          )}
        </div>
        <span className="font-bold hidden sm:inline">Mini-Market</span>
      </button>

      {/* Tiroir d'auto-composition latérale */}
      <MiniMarketDrawer
        products={marketProducts}
        isOpen={isMiniMarketOpen}
        onClose={() => setIsMiniMarketOpen(false)}
        onCheckout={(cart) => {
          setMiniMarketCart(cart);
          setIsMiniMarketOpen(false);
          try {
            localStorage.setItem('nana_checkout_cart', JSON.stringify(cart));
            window.dispatchEvent(new CustomEvent('nana_cart_updated', { detail: { cart } }));
          } catch (e) {}
        }}
      />

      {/* 3. Toast FOMO social proof connecté à Firestore (Preuve Sociale Réelle TrustPulse) */}
      <SocialProofToast
        funnelId={funnel?.id || slug}
        storeId={funnel?.storeId}
        productNameFallback={funnel?.title || 'cet article'}
      />

      {/* 4. Modale de Succès de Commande */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div
            style={{ borderColor: `${brandColor}60` }}
            className="w-full max-w-md bg-slate-900 border-2 rounded-3xl p-6 shadow-2xl text-center space-y-4"
          >
            <div
              style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
            >
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Commande Confirmée avec Succès !</h3>
              <p className="text-xs text-slate-400 mt-1">
                Merci <strong className="text-white">{completedOrder.customerName}</strong>. Notre équipe prépare votre colis pour expédition immédiate.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Réf. Commande :</span>
                <span style={{ color: brandColor }} className="font-bold">{completedOrder.transactionId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Réglé :</span>
                <span className="text-white font-bold">{formatCFA(completedOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Moyen de Paiement :</span>
                <span className="text-sky-400 font-bold">{completedOrder.provider}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCompletedOrder(null)}
              style={{ backgroundColor: brandColor }}
              className="w-full py-3 rounded-xl text-white font-bold text-xs shadow-lg transition cursor-pointer hover:brightness-110 active:scale-95"
            >
              Fermer et Suivre la Livraison
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPhysicalFunnelView;
