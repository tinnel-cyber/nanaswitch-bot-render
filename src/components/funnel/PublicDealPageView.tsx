import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PhysicalFunnelConfig
} from '../../types/physicalFunnel';
import { ScarcityUrgencyBlock } from '../cro/ScarcityUrgencyBlock';
import { TrustBadgesBlock } from '../cro/TrustBadgesBlock';
import { FlashLiveCtaButton } from '../cro/FlashLiveCtaButton';
import { FlashLiveButton } from '../flashLive/FlashLiveButton';
import { InlineGeoCheckoutBlock } from '../cro/InlineGeoCheckoutBlock';
import { LiveSaleToast } from '../cro/LiveSaleToast';
import { SocialProofToast } from '../cro/SocialProofToast';
import { useLiveSalePulse } from '../../hooks/useLiveSalePulse';
import { UpsellOffer } from './UpsellOffer';
import { DownsellOffer } from './DownsellOffer';
import { FunnelSuccessView } from './FunnelSuccessView';
import { formatCFA, playValidationBeep } from '../../utils/audio';
import { ArrowRight, ShieldCheck, Check, HelpCircle, Award, BookOpen, Clock, Flame, Zap } from 'lucide-react';
import { FunnelStep, OmniFunnelOrder } from '../../types/omniFunnel';
import { getFunnelBySlug } from '../../services/omniFunnelService';
import { injectFunnelSeoMeta } from '../../utils/seoMetaService';
import { PublicPhysicalFunnelView } from './PublicPhysicalFunnelView';

const PublicModularTunnelView = React.lazy(() =>
  import('./PublicModularTunnelView').then((m) => ({ default: m.PublicModularTunnelView || m.default }))
);

interface PublicDealPageViewProps {
  slug: string;
  funnelType?: 'f' | 'c' | 't' | 'ultimate' | 'checkout' | 'modular' | string;
  onBackToStore?: () => void;
  className?: string;
}

export const PublicDealPageView: React.FC<PublicDealPageViewProps> = ({
  slug,
  funnelType,
  onBackToStore,
  className = ''
}) => {
  // Délégation exclusive vers le moteur CRO Caisse Express (Produits Physiques)
  if (funnelType === 'c' || funnelType === 'checkout' || funnelType === 'cro_express') {
    return (
      <PublicPhysicalFunnelView
        slug={slug}
        onBackToStore={onBackToStore}
        className={className}
      />
    );
  }

  // Délégation exclusive vers le moteur Modulaire 12 Blocs (Nana Studio 3.0 / Divi)
  if (funnelType === 't' || funnelType === 'modular' || funnelType === 'modular_funnel' || funnelType === 'nana_studio_3' || funnelType === 'divi') {
    return (
      <React.Suspense fallback={<div className="min-h-screen w-full bg-[#030610]" />}>
        <PublicModularTunnelView
          slug={slug}
          onBackToStore={onBackToStore}
          className={className}
        />
      </React.Suspense>
    );
  }

  const [funnel, setFunnel] = useState<PhysicalFunnelConfig | null>(null);
  const [funnelStep, setFunnelStep] = useState<FunnelStep>('CHECKOUT');
  const [activeOrder, setActiveOrder] = useState<OmniFunnelOrder | null>(null);

  // FOMO social proof toast
  const { currentNotification, isVisible: isFomoVisible, dismiss: dismissFomo } = useLiveSalePulse(funnel?.title || 'cet article');

  useEffect(() => {
    let isCancelled = false;

    // 1. Nettoyage immédiat des caches locaux obsolètes ou corrompus
    const cacheKey = funnelType ? `nana_funnel_${funnelType}_${slug}` : `nana_funnel_${slug}`;
    const saved = localStorage.getItem(cacheKey) || localStorage.getItem(`nana_funnel_${slug}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const str = JSON.stringify(parsed).toLowerCase();
        // Si le cache local contient l'ancien mock ou un état non-fini sans blocs, on le purge
        if (
          str.includes('montre') ||
          str.includes('chronographe') ||
          str.includes('523275335684') ||
          str.includes('pousbila telecom - offre exclusive') ||
          !parsed.blocks ||
          parsed.blocks.length <= 2
        ) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`nana_funnel_${slug}`);
          localStorage.removeItem(`nana_funnel_pous`);
          localStorage.removeItem(`nana_funnel_pous.nanasore.com`);
        } else if (parsed && parsed.blocks && parsed.blocks.length > 2) {
          setFunnel(parsed);
        }
      } catch {}
    }

    // 2. Récupération asynchrone Firestore PRIORITAIRE (Network-First)
    getFunnelBySlug(slug, funnelType).then((remoteFunnel) => {
      if (isCancelled) return;
      if (remoteFunnel) {
        const str = JSON.stringify(remoteFunnel).toLowerCase();
        if (!str.includes('montre') && !str.includes('523275335684')) {
          setFunnel(remoteFunnel);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(remoteFunnel));
          } catch {}
        }
      }
    }).catch(console.warn);

    return () => {
      isCancelled = true;
    };
  }, [slug, funnelType]);

  // 3. Injection dynamique des balises <meta> Open Graph & Twitter Card pour réseaux sociaux
  useEffect(() => {
    if (!funnel) return;

    const heroBlock = funnel.blocks?.find(b => b.type === 'HERO_PRODUCT' || b.type === 'hero_live_masterclass' || b.type === 'hero');
    const heroProps = heroBlock?.props || heroBlock?.data || {};

    const cleanupMeta = injectFunnelSeoMeta({
      title: funnel.ogMetadata?.title || funnel.title || (funnel as any).funnelTitle || 'Tunnel de Vente Flash Live Shopping',
      description: funnel.ogMetadata?.description || (funnel as any).subtitle || 'Session interactive en direct avec offres flash et bonus VIP réservés aux participants.',
      imageUrl: funnel.ogMetadata?.imageUrl || heroProps?.imageUrl || heroProps?.image || (funnel as any).image || (funnel as any).ogImageUrl,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      type: 'product',
      price: funnel.ogMetadata?.priceAmount || (funnel as any).salePrice || 35000,
      currency: funnel.ogMetadata?.currency || 'FCFA',
      siteName: 'Nanasore Funnels'
    });

    return () => {
      cleanupMeta();
    };
  }, [funnel]);

  const normalizedFunnel = useMemo(() => {
    if (!funnel) return null;
    const title = funnel.title || (funnel as any).funnelTitle || (funnel as any).name || 'Tunnel de Vente Flash Live Shopping';
    const price = Number((funnel as any).salePrice) || Number((funnel as any).price) || 35000;
    const originalPrice = Number((funnel as any).originalPrice) || 25000;
    const imageUrl = (funnel as any).ogImageUrl || (funnel as any).image || (funnel as any).imageUrl || '';
    const description = (funnel as any).subtitle || (funnel as any).description || 'Session interactive en direct avec offres flash et bonus VIP réservés aux participants.';

    let blocks: any[] = [];
    if (Array.isArray(funnel.blocks) && funnel.blocks.length > 0) {
      blocks = funnel.blocks;
    } else if ((funnel as any).steps) {
      const steps = (funnel as any).steps;
      blocks = steps.sales || steps.masterclass || steps['page-vente'] || steps.optin || Object.values(steps)[0] || [];
    }

    // Si le tunnel n'a pas encore de blocs enregistrés, génération dynamique du gabarit complet Ultimate Funnel
    if (!blocks || blocks.length <= 2) {
      blocks = [
        {
          id: 's-hero',
          type: 'hero_live_masterclass',
          title: 'Hero 3D Live & Masterclass',
          visible: true,
          data: {
            headline: title,
            subheadline: description,
            promoBadge: (funnel as any).promoBadge || (funnel as any).discountBadge || '-53% OFFRE LIMITÉE',
            instructorName: (funnel as any).instructorName || (funnel as any).category || 'Nsore • Live / Webinaire Haute Fréquence',
            buttonText: `Rejoindre le Programme • ${formatCFA(price)} 🚀`,
            price,
            originalPrice,
            image: imageUrl,
            btnBgColor: '#f59e0b'
          }
        },
        {
          id: 's-timer',
          type: 'countdown_timer',
          title: 'Minuteur Urgence Défilant (FOMO)',
          visible: true,
          data: {
            title: '🚨 CETTE OFFRE SPÉCIALE PREND FIN DANS :',
            initialHours: 18,
            initialMinutes: 30,
            initialSeconds: 45
          }
        },
        {
          id: 's-seats',
          type: 'seats_progress_bar',
          title: 'Jauge de Rareté des Places en Direct',
          visible: true,
          data: {
            text: 'Dernières places disponibles avant clôture définitive !',
            percentage: 84
          }
        },
        {
          id: 's-syllabus',
          type: 'syllabus_modules',
          title: 'Programme & Spécifications',
          visible: true,
          data: {
            headline: 'Le Programme & Spécifications Clés',
            subheadline: 'Tout ce qui est inclus dans cette offre d’exception :',
            modules: [
              { title: 'Autonomie Record 50 Heures & Charge Rapide', lessons: '3 min = 1h30 d\'écoute', duration: 'Inclus' },
              { title: 'Connexion Multipoint Bluetooth 5.2', lessons: 'Bascule fluide PC / Smartphone', duration: 'HD 5.2' },
              { title: 'Microphone Intégré avec Réduction de Bruit', lessons: 'Appels mains-libres cristallins', duration: 'Certifié' }
            ]
          }
        },
        {
          id: 's-bio',
          type: 'instructor_bio',
          title: 'Fiche Formateur & Distinctions',
          visible: true,
          data: {
            name: (funnel as any).instructorName || 'Nsore • Live Haute Fréquence',
            title: 'Expert Certifié • NaNa Store Pro',
            bio: 'Spécialiste de la vente directe et des offres exclusives en direct pour l’Afrique de l’Ouest.',
            avatar: (funnel as any).instructorAvatar || imageUrl,
            badges: ['Note Clients 4.9/5', 'Certifié NaNa Pro', 'Support Direct WhatsApp']
          }
        },
        {
          id: 's-cta',
          type: 'neon_pulse_cta',
          title: 'Bouton Géant Pulse Néon 3D',
          visible: true,
          data: {
            buttonText: `COMMANDER EN 1-CLIC (${formatCFA(price)}) 🚀`,
            subtext: '🔒 Garantie satisfait ou échangé • Règlement Wave & Orange Money',
            btnBgColor: '#f59e0b',
            btnTextColor: '#000000'
          }
        },
        {
          id: 'block-checkout',
          type: 'INLINE_CHECKOUT',
          title: 'Caisse Sécurisée 1-Clic',
          visible: true,
          data: {
            productName: title,
            price,
            originalPrice
          }
        },
        {
          id: 's-faq',
          type: 'faq_webinar',
          title: 'FAQ Levée des Objections',
          visible: true,
          data: {
            headline: 'Questions Fréquentes sur la Commande',
            items: [
              { q: 'Comment s’effectue le règlement ?', a: 'Vous pouvez régler instantanément par Wave, Orange Money ou Moov Money en 1 clic.' },
              { q: 'Quels sont les délais de livraison ?', a: 'Livraison express sécurisée avec vérification de l\'article en main propre avant validation.' },
              { q: 'Le produit est-il garanti ?', a: 'Oui, bénéficiez de la garantie de conformité et du service client dédié NaNa.' }
            ]
          }
        },
        {
          id: 's-trust',
          type: 'trust_badges_edu',
          title: 'Sceaux Accréditation & Paiement Sécurisé',
          visible: true,
          data: {
            text: 'Plateforme certifiée • Transactions 100% sécurisées • Accréditation NaNa Pro',
            badges: ['Cryptage SSL 256-Bit', 'Paiement Wave Direct', 'Orange Money Agréé', 'Garantie Totale']
          }
        }
      ];
    }

    return {
      ...funnel,
      title,
      blocks
    };
  }, [funnel, slug]);

  if (!normalizedFunnel) {
    return (
      <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const heroBlock = normalizedFunnel.blocks.find((b: any) => b.type === 'HERO_PRODUCT' || b.type === 'hero_live_masterclass' || b.type === 'hero') || normalizedFunnel.blocks[0];
  const heroProps = heroBlock?.props || heroBlock?.data || {};

  // Étape 2 : Post-Purchase OTO Upsell
  if (funnelStep === 'UPSELL' && activeOrder) {
    return (
      <UpsellOffer
        order={activeOrder}
        onAcceptUpsell={(updatedOrder) => {
          setActiveOrder(updatedOrder);
          setFunnelStep('SUCCESS');
        }}
        onDeclineUpsell={() => {
          setFunnelStep('DOWNSELL');
        }}
      />
    );
  }

  // Étape 3 : Post-Purchase Downsell
  if (funnelStep === 'DOWNSELL' && activeOrder) {
    return (
      <DownsellOffer
        order={activeOrder}
        onAcceptDownsell={(updatedOrder) => {
          setActiveOrder(updatedOrder);
          setFunnelStep('SUCCESS');
        }}
        onDeclineDownsell={() => {
          setFunnelStep('SUCCESS');
        }}
      />
    );
  }

  // Étape 4 : Confirmation Finale
  if (funnelStep === 'SUCCESS' && activeOrder) {
    return <FunnelSuccessView order={activeOrder} />;
  }

  // Auto-délégation : Si les données chargées indiquent un tunnel Modulaire (12 Blocs Nana Studio 3.0)
  if (funnel && (funnel.funnelType === 'modular' || (funnel as any).funnelStudio === 'nana_studio_3' || (funnel as any).linkPrefix === 't' || (Array.isArray((funnel as any).pages) && (funnel as any).pages.length > 0))) {
    return (
      <React.Suspense fallback={<div className="min-h-screen w-full bg-[#030610]" />}>
        <PublicModularTunnelView
          slug={slug}
          onBackToStore={onBackToStore}
          className={className}
        />
      </React.Suspense>
    );
  }

  return (
    <div className={`min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col font-sans select-none overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar ${className}`}>
      {/* Barre d'Annonce Flash Supérieure (Affichée uniquement si configurée) */}
      {Boolean(normalizedFunnel.announcementBar || (normalizedFunnel as any).topBannerText) && (
        <div className="sticky top-0 z-40 bg-emerald-950/95 backdrop-blur-md border-b border-emerald-500/30 px-3 py-2 text-center text-xs font-black text-emerald-300 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{normalizedFunnel.announcementBar || (normalizedFunnel as any).topBannerText}</span>
        </div>
      )}

      {/* Conteneur de Page Haute Vitesse 60 FPS */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-20">
        {normalizedFunnel.blocks.filter((b: any) => b.visible !== false).map((block: any) => {
          const blockProps = block.props || block.data || {};
          const isHero = block.type === 'HERO_PRODUCT' || block.type === 'hero' || block.type === 'hero_live_masterclass' || block.type === 'hero_3d_product' || block.type === 'hero_vsl';
          const isScarcity = block.type === 'SCARCITY_URGENCY' || block.type === 'urgency';
          const isCountdownTimer = block.type === 'countdown_timer';
          const isSeatsBar = block.type === 'seats_progress_bar';
          const isFlashLive = block.type === 'FLASH_LIVE_CTA' || block.type === 'live';
          const isBenefits = block.type === 'BENEFITS_LIST' || block.type === 'benefits' || block.type === 'features';
          const isSyllabus = block.type === 'syllabus_modules';
          const isInstructor = block.type === 'instructor_bio';
          const isFaq = block.type === 'faq_webinar' || block.type === 'faq';
          const isCtaButton = block.type === 'neon_pulse_cta' || block.type === 'dual_action_cta';
          const isTrustBadges = block.type === 'TRUST_BADGES' || block.type === 'badges' || block.type === 'trust_badges_edu';
          const isCheckout = block.type === 'INLINE_CHECKOUT' || block.type === 'checkout' || block.type === 'checkout_1click_course' || block.type === 'pricing_checkout_cta';

          if (isHero) {
            const badge = blockProps.promoBadge || blockProps.badgeText || blockProps.badge;
            const headline = blockProps.headline || blockProps.title || normalizedFunnel.title;
            const subheadline = blockProps.subheadline || blockProps.subtitle || (normalizedFunnel as any).subtitle;
            const instructorTag = blockProps.instructorName || blockProps.tag;
            const img = blockProps.image || blockProps.imageUrl || (normalizedFunnel as any).ogImageUrl || (normalizedFunnel as any).image;
            const price = Number(blockProps.price) || Number((normalizedFunnel as any).salePrice) || 35000;
            const origPrice = Number(blockProps.originalPrice) || Number((normalizedFunnel as any).originalPrice);
            const buttonText = blockProps.buttonText || blockProps.ctaText || `Rejoindre le Programme • ${formatCFA(price)} 🚀`;
            const btnBg = blockProps.btnBgColor || '#f59e0b';

            return (
              <section key={block.id} className="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl flex flex-col items-center text-center">
                {badge && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>{badge}</span>
                  </div>
                )}

                <h1 className="text-xl sm:text-3xl font-black text-white leading-tight tracking-tight max-w-2xl">
                  {headline}
                </h1>

                {subheadline && (
                  <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
                    {subheadline}
                  </p>
                )}

                {instructorTag && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-bold text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>{instructorTag}</span>
                    {blockProps.instructorRole && (
                      <span className="text-[10px] text-slate-400">• {blockProps.instructorRole}</span>
                    )}
                  </div>
                )}

                {img && (
                  <div className="my-4 relative w-64 sm:w-80 flex flex-col items-center">
                    <div className="absolute -inset-4 rounded-full blur-2xl opacity-25 bg-amber-500 pointer-events-none" />
                    <motion.div
                      animate={{
                        y: [0, -12, 0],
                        rotate: [0, 1.2, -1.2, 0]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      className="relative z-10 w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-950/80 flex items-center justify-center p-3 aspect-square sm:aspect-video"
                    >
                      <img
                        src={img}
                        alt={headline}
                        className="max-h-full max-w-full object-contain drop-shadow-2xl"
                      />
                    </motion.div>
                    <motion.div
                      animate={{
                        scale: [1, 0.85, 1],
                        opacity: [0.35, 0.18, 0.35]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      className="w-3/4 h-3.5 bg-black blur-md rounded-full mt-3"
                    />
                  </div>
                )}

                <div className="flex items-baseline justify-center gap-3 pt-2">
                  <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                    {formatCFA(price)}
                  </span>
                  {origPrice && origPrice > 0 && (
                    <span className="text-sm sm:text-base text-slate-500 line-through font-mono">
                      {formatCFA(origPrice)}
                    </span>
                  )}
                  {(blockProps.discountBadge || blockProps.discount) && (
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-xs font-black border border-rose-500/30">
                      {blockProps.discountBadge || blockProps.discount}
                    </span>
                  )}
                </div>

                <div className="w-full max-w-md pt-2">
                  <a
                    href="#inline-checkout"
                    className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 active:scale-98 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 cursor-pointer transition"
                    style={{ backgroundColor: btnBg, color: '#000000' }}
                  >
                    <span>{buttonText}</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </a>
                </div>
              </section>
            );
          }

          if (isCountdownTimer) {
            return (
              <div key={block.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center max-w-md mx-auto w-full space-y-2">
                <div className="text-[11px] font-black text-amber-400 tracking-wider flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{blockProps.title || '🚨 CETTE OFFRE SPÉCIALE PREND FIN DANS :'}</span>
                </div>
                <div className="flex items-center justify-center gap-3 font-mono font-black text-lg text-white">
                  <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    {String(blockProps.initialHours || 18).padStart(2, '0')}<span className="text-[10px] block text-slate-500 font-sans">HEURES</span>
                  </div>
                  <span>:</span>
                  <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-amber-400">
                    {String(blockProps.initialMinutes || 30).padStart(2, '0')}<span className="text-[10px] block text-slate-500 font-sans">MINUTES</span>
                  </div>
                  <span>:</span>
                  <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-rose-400">
                    {String(blockProps.initialSeconds || 45).padStart(2, '0')}<span className="text-[10px] block text-slate-500 font-sans">SECONDES</span>
                  </div>
                </div>
              </div>
            );
          }

          if (isSeatsBar) {
            return (
              <div key={block.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 max-w-md mx-auto w-full space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{blockProps.text || 'Dernières places disponibles avant clôture définitive !'}</span>
                  </span>
                  <span className="text-slate-400 font-mono">{blockProps.percentage || 84}% Réservé</span>
                </div>
                <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all" style={{ width: `${blockProps.percentage || 84}%` }} />
                </div>
              </div>
            );
          }

          if (isSyllabus) {
            return (
              <div key={block.id} className="space-y-4 py-2 text-left max-w-2xl mx-auto w-full">
                <div className="text-center">
                  <h3 className="text-base font-black text-white">{blockProps.headline || 'Le Programme Structuré pour Réussir'}</h3>
                  {blockProps.subheadline && <p className="text-xs text-slate-400 mt-1">{blockProps.subheadline}</p>}
                </div>
                <div className="space-y-2.5 max-w-2xl mx-auto">
                  {(blockProps.modules || []).map((m: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-black">
                          0{i + 1}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white">{m.title}</h5>
                          <span className="text-[10px] text-slate-400">{m.lessons}</span>
                        </div>
                      </div>
                      {m.duration && (
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {m.duration}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (isInstructor) {
            return (
              <div key={block.id} className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full">
                {blockProps.avatar && (
                  <img src={blockProps.avatar} alt={blockProps.name} className="w-16 h-16 rounded-2xl object-cover border border-amber-500/30 shrink-0" />
                )}
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white">{blockProps.name || 'Instructeur'}</h4>
                  <p className="text-xs text-amber-400 font-medium">{blockProps.title || 'Expert Agréé • NaNa Pro'}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{blockProps.bio}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1 justify-center sm:justify-start">
                    {(blockProps.badges || ['Note 4.9/5', 'Certifié Pro', 'Support WhatsApp']).map((b: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          if (isFaq) {
            return (
              <div key={block.id} className="space-y-3 py-2 max-w-2xl mx-auto text-left w-full">
                <h4 className="text-sm font-black text-white text-center mb-3">{blockProps.headline || 'Questions Fréquentes'}</h4>
                {(blockProps.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="text-amber-400 font-black">Q :</span> {item.q || item.question}
                    </h5>
                    <p className="text-xs text-slate-400 pl-4">{item.a || item.answer}</p>
                  </div>
                ))}
              </div>
            );
          }

          if (isCtaButton) {
            return (
              <div key={block.id} className="text-center py-4 space-y-2 max-w-md mx-auto w-full">
                <a
                  href="#inline-checkout"
                  className="w-full py-4 px-6 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: blockProps.btnBgColor || '#f59e0b',
                    color: blockProps.btnTextColor || '#000000',
                    boxShadow: blockProps.glowColor ? `0 0 35px ${blockProps.glowColor}` : '0 0 30px rgba(245, 158, 11, 0.45)'
                  }}
                >
                  <span>{blockProps.buttonText || blockProps.primaryText || 'VALIDER MON ACCÈS EN 1-CLIC 🚀'}</span>
                  <Zap className="w-4 h-4 text-slate-950" />
                </a>
                {blockProps.subtext && <p className="text-[10.5px] text-slate-400 font-medium">{blockProps.subtext}</p>}
              </div>
            );
          }

          if (isScarcity) {
            return (
              <ScarcityUrgencyBlock
                key={block.id}
                totalStock={blockProps.totalStock || 30}
                remainingStock={blockProps.remainingStock || blockProps.stockRemaining || 5}
                hoursLeft={blockProps.hoursLeft || 3}
                urgencyText={blockProps.urgencyText || blockProps.urgencyHeadline || 'Offre limitée'}
              />
            );
          }

          if (isFlashLive) {
            return (
              <div key={block.id} className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>{blockProps.badgeText || 'VENDEUR CONNECTÉ EN DIRECT'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Live HD 5 min
                  </span>
                </div>
                <FlashLiveButton
                  product={{
                    id: (normalizedFunnel as any).productId || normalizedFunnel.id,
                    name: normalizedFunnel.title,
                    price: heroProps.price || (normalizedFunnel as any).salePrice || 35000,
                    image: heroProps.imageUrl || (normalizedFunnel as any).ogImageUrl || (normalizedFunnel as any).image
                  }}
                  className="w-full"
                />
                <p className="text-[10.5px] text-slate-400 text-center">
                  Présentation vidéo privée instantanée sans engagement • Vérifiez l'article physique avant de payer
                </p>
              </div>
            );
          }

          if (isBenefits) {
            const bullets = blockProps.bullets || blockProps.items || [
              { title: 'Qualité Supérieure Certifiée', desc: 'Matériaux nobles garantis contre l\'usure.' },
              { title: 'Livraison Express Sécurisée', desc: 'Reçu en main propre avant de régler.' },
              { title: 'Garantie Totale NaNa', desc: 'Échange immédiat en cas de défaut.' }
            ];

            return (
              <div key={block.id} className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h3 className="text-sm font-black text-white">{blockProps.headline || blockProps.sectionTitle || 'Avantages Clés :'}</h3>
                <div className="space-y-2">
                  {bullets.map((b: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white">{b.title || b.headline || b.name}</p>
                        <p className="text-[11px] text-slate-400">{b.desc || b.description || b.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (isTrustBadges) {
            if (block.type === 'trust_badges_edu') {
              return (
                <div key={block.id} className="py-2 text-center space-y-2 max-w-2xl mx-auto w-full">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {(blockProps.badges || ['Cryptage SSL 256-Bit', 'Paiement Wave Direct', 'Orange Money Agréé', 'Garantie Totale']).map((badge: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>{badge}</span>
                      </span>
                    ))}
                  </div>
                  {blockProps.text && <p className="text-[10px] text-slate-500">{blockProps.text}</p>}
                </div>
              );
            }
            return <TrustBadgesBlock key={block.id} badges={blockProps.badges} />;
          }

          if (isCheckout) {
            return (
              <div id="inline-checkout" key={block.id} className="scroll-mt-6">
                <InlineGeoCheckoutBlock
                  productName={normalizedFunnel.title}
                  price={heroProps.price || (normalizedFunnel as any).salePrice || 35000}
                  originalPrice={heroProps.originalPrice || (normalizedFunnel as any).originalPrice}
                  onPaymentCompleted={(txData) => {
                    playValidationBeep();
                    const fakeOrder: OmniFunnelOrder = {
                      orderId: txData.transactionId || `ord_${Date.now()}`,
                      status: 'PROCESSING',
                      itemType: 'physical',
                      primaryProduct: {
                        id: (normalizedFunnel as any).productId || normalizedFunnel.id,
                        name: normalizedFunnel.title,
                        price: heroProps.price || (normalizedFunnel as any).salePrice || 35000,
                        imageUrl: heroProps.imageUrl || (normalizedFunnel as any).ogImageUrl,
                        itemType: 'physical'
                      },
                      customer: {
                        fullName: txData.customerName,
                        phoneNumber: txData.phoneNumber
                      },
                      payment: {
                        provider: txData.provider,
                        transactionId: txData.transactionId,
                        primaryAmount: heroProps.price || (normalizedFunnel as any).salePrice || 35000,
                        bumpAmount: txData.orderBumpAccepted ? 1000 : 0,
                        shippingAmount: txData.delivery?.price || 1500,
                        upsellAmount: 0,
                        downsellAmount: 0,
                        grandTotal: txData.totalAmount,
                        currency: 'FCFA',
                        paidAt: Date.now()
                      },
                      utm: {},
                      createdAt: Date.now(),
                      updatedAt: Date.now()
                    };

                    setActiveOrder(fakeOrder);
                    // Déclenchement immédiat de l'étape Post-Purchase OTO !
                    setFunnelStep('UPSELL');
                  }}
                />
              </div>
            );
          }

          return null;
        })}
      </main>

      {/* FOMO Live Sale Toast connecté à Firestore (Preuve Sociale Réelle TrustPulse) */}
      <SocialProofToast
        funnelId={funnel?.id || slug}
        storeId={funnel?.storeId}
        productNameFallback={funnel?.title || 'cet article'}
      />
    </div>
  );
};
