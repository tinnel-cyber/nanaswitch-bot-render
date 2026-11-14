import React, { useState, useEffect } from 'react';
import { Flame, Clock, Check, ShoppingBag, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { AdminProductQuickBar } from '../../../components/storeBuilder/AdminProductQuickBar';
import { LiveEditable } from '../../../components/storeBuilder/LiveEditable';
import { triggerOpenFunnel } from '../../themeUtils';
import { playTapBeep } from '../../../utils/audio';

export interface FlashDealVaultModuleProps {
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

export const FlashDealVaultModule: React.FC<FlashDealVaultModuleProps> = ({
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
  const cfg = section.settings || section.config || {};

const DEMO_FLASH_PRODUCT: StoreProductItem = {
  id: 'demo-flash-deal',
  name: "Offre Flash du Moment",
  price: 18500,
  originalPrice: 25000,
  category: "Exclusivité",
  image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
  stock: 5,
  description: "Sélection spéciale à tarif préférentiel garanti pour une durée limitée.",
  badge: "Vente Flash"
};

  // Sélectionne le produit configuré ou celui qui a la plus forte remise
  const targetProduct = React.useMemo(() => {
    if (cfg.productId) {
      const found = products.find(p => p.id === cfg.productId);
      if (found) return found;
    }
    const withDiscount = [...products].sort((a, b) => {
      const discA = a.originalPrice ? (a.originalPrice - a.price) : 0;
      const discB = b.originalPrice ? (b.originalPrice - b.price) : 0;
      return discB - discA;
    });
    return withDiscount[0] || products[0] || DEMO_FLASH_PRODUCT;
  }, [products, cfg.productId]);

  const title = section.title || cfg.title || "⚡ Vente Flash Exclusive du Jour";
  const subtitle = section.subtitle || cfg.subtitle || "Stock ultra-limité : Tarif promotionnel garanti jusqu'à épuisement";
  const countdownHours = Number(cfg.countdownHours) || 12;
  const stockLeft = Number(cfg.stockLeft) || (targetProduct?.stock ? Math.min(targetProduct.stock, 7) : 5);

  // Compte à rebours dynamique en temps réel
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>(() => ({
    hours: countdownHours,
    minutes: 47,
    seconds: 23
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: countdownHours, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownHours]);

  if (!targetProduct) return null;

  const hasDiscount = targetProduct.originalPrice && targetProduct.originalPrice > targetProduct.price;
  const savings = hasDiscount ? (targetProduct.originalPrice! - targetProduct.price) : 5000;

  const features = cfg.features || targetProduct.keyFeatures || [
    "Produit 100% original certifié avec contrôle qualité à l'expédition",
    "Paiement sécurisé à la livraison en espèces ou Mobile Money",
    "Assistance & support Wameet disponible 7j/7 pour vous guider"
  ];

  const handleCtaClick = () => {
    playTapBeep();
    if (onOpenTunnel) {
      onOpenTunnel(targetProduct);
    } else if (onPreviewFunnel) {
      onPreviewFunnel(targetProduct);
    } else {
      triggerOpenFunnel(targetProduct.linkedFunnelId || targetProduct.id, targetProduct.name);
    }
    if (onSelectProduct) {
      onSelectProduct(targetProduct);
    }
  };

  return (
    <section className={`relative py-14 sm:py-20 ${moodStyle.sectionAltBg} border-b border-black/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`relative rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl border border-black/5 ${moodStyle.cardBg} overflow-hidden`}>
          <AdminProductQuickBar
            product={targetProduct}
            storeSlug={storeSlug}
            onEditProduct={onEditProduct}
            onPreviewFunnel={onPreviewFunnel}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Colonne Gauche : Image Grand Format avec Badge Géant d'Économie */}
            <div className="lg:col-span-5 relative">
              <div 
                onClick={handleCtaClick}
                className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-square shadow-xl cursor-pointer group"
              >
                <img
                  src={targetProduct.image}
                  alt={targetProduct.name}
                  className="w-full h-full object-cover transform group-hover:scale-106 transition-transform duration-500"
                />

                {/* Badge Promo Flash Pulsant */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-lg animate-pulse">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>VENTE FLASH DU JOUR</span>
                </div>

                {/* Badge Géant d'Économie en Bas de l'Image */}
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-950/85 backdrop-blur-md text-amber-300 font-black text-xs border border-white/20 flex items-center justify-between">
                  <span>ÉCONOMIE IMMÉDIATE :</span>
                  <span className="text-sm font-black text-white">-{savings.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Offre, Compte à Rebours, Jauge & Conversion */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="space-y-2">
                <LiveEditable
                  label="Badge Vente Flash"
                  sectionId={section.id}
                  sectionField="subtitle"
                  value={subtitle}
                  isAdminPreview={isAdminPreview}
                  isInline={true}
                >
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
                    <Zap className="w-3.5 h-3.5" />
                    <span>{subtitle}</span>
                  </span>
                </LiveEditable>
                <LiveEditable
                  label="Titre Vente Flash"
                  sectionId={section.id}
                  sectionField="title"
                  value={title}
                  isAdminPreview={isAdminPreview}
                >
                  <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${moodStyle.textPrimary}`}>
                    {title}
                  </h2>
                </LiveEditable>
                <h3 className="text-lg sm:text-xl font-bold text-blue-600">
                  {targetProduct.name}
                </h3>
              </div>

              {/* Compte à Rebours Dynamique Animé en Direct */}
              <div className="p-4 rounded-2xl bg-slate-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 shadow-inner">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Clock className="w-4 h-4 animate-spin text-amber-400" style={{ animationDuration: '6s' }} />
                  <span>Offre garantie encore pendant :</span>
                </div>

                <div className="flex items-center gap-2 text-center font-mono">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700">
                    <span className="text-xl font-black text-white">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="block text-[9px] uppercase text-slate-400">Heures</span>
                  </div>
                  <span className="font-bold text-slate-500">:</span>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700">
                    <span className="text-xl font-black text-white">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="block text-[9px] uppercase text-slate-400">Minutes</span>
                  </div>
                  <span className="font-bold text-slate-500">:</span>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700">
                    <span className="text-xl font-black text-rose-400 animate-pulse">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="block text-[9px] uppercase text-slate-400">Secondes</span>
                  </div>
                </div>
              </div>

              {/* Jauge d'Urgence du Stock Restant */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-rose-600 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 fill-current animate-bounce" />
                    Attention : Plus que {stockLeft} exemplaires à ce tarif !
                  </span>
                  <span className={`text-[11px] ${moodStyle.textMuted}`}>
                    88% du stock réservé
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 rounded-full w-[88%] animate-pulse" />
                </div>
              </div>

              {/* Liste de 3 KeyFeatures (✓) */}
              <div className="space-y-2 pt-1">
                {features.map((feat: string, fIdx: number) => (
                  <div key={fIdx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className={moodStyle.textSecondary}>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Prix & Bouton Commande Directe Massif Animé */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-black ${moodStyle.textPrimary}`}>
                      {targetProduct.price.toLocaleString('fr-FR')} FCFA
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-slate-400 line-through font-semibold">
                        {targetProduct.originalPrice?.toLocaleString('fr-FR')} FCFA
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Paiement à la réception après contrôle
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCtaClick}
                  className={`flex-1 px-8 py-4 ${moodStyle.accentButton} ${buttonRadiusClass} font-black text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer shadow-xl active:scale-95 transition-transform`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Profiter de l'offre flash</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlashDealVaultModule;
