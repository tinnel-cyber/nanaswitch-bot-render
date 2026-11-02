import React from 'react';
import { ArrowRight, ShoppingBag, Sparkles, ShieldCheck } from 'lucide-react';
import { CustomThemeSection } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { triggerOpenFunnel } from '../../themeUtils';
import { playTapBeep } from '../../../utils/audio';

export interface HeroSplitBannerSectionProps {
  section: CustomThemeSection;
  mood: MoodStyleConfig;
  buttonRadiusClass: string;
  products: StoreProductItem[];
  onOpenTunnel?: (product: StoreProductItem) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  controlBar?: React.ReactNode;
}

export const HeroSplitBannerSection: React.FC<HeroSplitBannerSectionProps> = ({
  section,
  mood,
  buttonRadiusClass,
  products = [],
  onOpenTunnel,
  onPreviewFunnel,
  onSelectProduct,
  controlBar
}) => {
  const cfg = section.config || {};
  const layout = cfg.layout || 'split'; // 'split' | 'centered' | 'compact'
  
  const title = section.title || cfg.heroTitle || "La Nouvelle Collection Nanasore";
  const subtitle = section.subtitle || cfg.heroSubtitle || "OFFRE EXCLUSIVE • LIVRAISON 24H";
  const description = cfg.description || "Des produits d'exception conçus pour vous offrir un rapport qualité-prix inégalé. Paiement sécurisé à la livraison partout en Côte d'Ivoire & Afrique de l'Ouest.";
  const priceHighlight = cfg.priceHighlight || "À partir de 12.500 FCFA";
  const ctaText = cfg.ctaText || "Commander maintenant";
  const imageUrl = cfg.imageUrl || cfg.heroBannerImageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80";
  
  const linkedProduct = products.find(p => p.id === cfg.linkedProductId) || products[0];

  const handleCtaClick = () => {
    playTapBeep();
    if (linkedProduct) {
      if (onOpenTunnel) {
        onOpenTunnel(linkedProduct);
      } else if (onPreviewFunnel) {
        onPreviewFunnel(linkedProduct);
      } else {
        triggerOpenFunnel(linkedProduct.linkedFunnelId || linkedProduct.id, linkedProduct.name);
      }
      if (onSelectProduct) {
        onSelectProduct(linkedProduct);
      }
    }
  };

  return (
    <section className={`relative overflow-hidden ${mood.sectionBg} border-b border-black/5`}>
      {controlBar}

      {layout === 'centered' ? (
        // Layout 1: Plein écran centré avec fond immersif
        <div className="relative min-h-[460px] md:min-h-[540px] flex items-center justify-center text-center px-6 py-20">
          <div className="absolute inset-0 z-0">
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 backdrop-blur-[1px]" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto space-y-6 text-white animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-black tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>{subtitle}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
              {title}
            </h1>

            <p className="text-sm sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleCtaClick}
                className={`w-full sm:w-auto px-8 py-4 ${mood.accentButton} ${buttonRadiusClass} font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              {priceHighlight && (
                <div className="px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold text-amber-300">
                  {priceHighlight}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : layout === 'compact' ? (
        // Layout 2: Format Compact (Bannière discrète et percutante)
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className={`rounded-3xl p-6 sm:p-10 ${mood.cardBg} flex flex-col md:flex-row items-center justify-between gap-6`}>
            <div className="space-y-3 max-w-xl">
              <span className={`inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${mood.accentBadge}`}>
                {subtitle}
              </span>
              <h2 className={`text-2xl sm:text-3xl font-black ${mood.textPrimary}`}>
                {title}
              </h2>
              <p className={`text-xs sm:text-sm ${mood.textSecondary}`}>
                {description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCtaClick}
                className={`px-6 py-3.5 ${mood.accentButton} ${buttonRadiusClass} font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer`}
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Layout 3 (Défaut) : Split 50/50 Texte à gauche, Grande image à droite (Style Apple & Shopify)
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Colonne Gauche : Texte & Conversion */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase">
                <span className={`px-3 py-1 rounded-full ${mood.accentBadge}`}>
                  {subtitle}
                </span>
              </div>

              <h1 className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] ${mood.textPrimary}`}>
                {title}
              </h1>

              <p className={`text-sm sm:text-base lg:text-lg leading-relaxed ${mood.textSecondary} max-w-xl`}>
                {description}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  type="button"
                  onClick={handleCtaClick}
                  className={`px-8 py-4 ${mood.accentButton} ${buttonRadiusClass} font-black text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {priceHighlight && (
                  <div className={`px-4 py-3 ${buttonRadiusClass} border border-slate-200/80 bg-slate-50/80 dark:bg-slate-900/40 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 ${mood.textPrimary}`}>
                    <span>🏷️</span>
                    <span>{priceHighlight}</span>
                  </div>
                )}
              </div>

              {/* Micro-badges de réassurance sous le CTA */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Paiement à la livraison</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Expédition sous 24h</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>⭐</span>
                  <span>Produit 100% garanti</span>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Image Produit Immersive */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-black/5 aspect-[4/3] sm:aspect-square group">
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                
                {linkedProduct && (
                  <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{linkedProduct.name}</p>
                      <p className="text-[11px] font-black text-amber-300">
                        {linkedProduct.price.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCtaClick}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                    >
                      Voir l'offre
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
