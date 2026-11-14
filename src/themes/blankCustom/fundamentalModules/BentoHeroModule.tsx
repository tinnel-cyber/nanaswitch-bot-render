import React from 'react';
import { ShoppingBag, ArrowRight, Sparkles, ShieldCheck, Flame, Zap } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { AdminProductQuickBar } from '../../../components/storeBuilder/AdminProductQuickBar';
import { LiveEditable } from '../../../components/storeBuilder/LiveEditable';
import { triggerOpenFunnel } from '../../themeUtils';
import { playTapBeep } from '../../../utils/audio';

export interface BentoHeroModuleProps {
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

export const BentoHeroModule: React.FC<BentoHeroModuleProps> = ({
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
  const layout = cfg.layout || 'bento_3_cards'; // 'bento_3_cards' | 'split_cinema' | 'center_minimal'

const DEMO_BENTO_MAIN: StoreProductItem = {
  id: 'demo-bento-1',
  name: "Édition Privée d'Exception",
  price: 25000,
  originalPrice: 35000,
  category: "Sélection",
  image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
  stock: 12,
  description: "Conçu pour apporter un résultat immédiat avec garantie satisfaction et livraison express.",
  badge: "Bestseller"
};

const DEMO_BENTO_SIDE1: StoreProductItem = {
  id: 'demo-bento-2',
  name: "Accessoire Signature",
  price: 12000,
  originalPrice: 16000,
  category: "Accessoires",
  image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
  stock: 8,
  description: "Le complément idéal testé et approuvé par nos clients fidèles.",
  badge: "Nouveau"
};

const DEMO_BENTO_SIDE2: StoreProductItem = {
  id: 'demo-bento-3',
  name: "Coffret Rituel Complice",
  price: 18500,
  originalPrice: 24000,
  category: "Coffrets",
  image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80",
  stock: 5,
  description: "Pack exclusif à tarif avantageux garanti jusqu'à épuisement.",
  badge: "Flash"
};

  // Produits vedettes
  const mainProduct = products.find(p => p.id === cfg.productId) || products[0] || DEMO_BENTO_MAIN;
  const sideProduct1 = products.find(p => p.id === cfg.sideProductId1) || products[1] || products[0] || DEMO_BENTO_SIDE1;
  const sideProduct2 = products.find(p => p.id === cfg.sideProductId2) || products[2] || products[0] || DEMO_BENTO_SIDE2;

  const title = section.title || cfg.heroTitle || "La Révolution de Votre Quotidien";
  const subtitle = section.subtitle || cfg.heroSubtitle || "ÉDITION LIMITÉE • DISPONIBLE EN 24H";
  const description = cfg.description || "Des produits d'exception conçus pour vous apporter un résultat immédiat avec garantie satisfaction et livraison express partout en Côte d'Ivoire.";
  const ctaText = cfg.ctaText || "Commander maintenant";
  const priceHighlight = cfg.priceHighlight || (mainProduct ? `${mainProduct.price.toLocaleString('fr-FR')} FCFA` : "À partir de 15 000 FCFA");
  const heroImageUrl = cfg.imageUrl || mainProduct?.image || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80";

  const handleProductClick = (product?: StoreProductItem) => {
    if (!product) return;
    playTapBeep();
    if (onOpenTunnel) {
      onOpenTunnel(product);
    } else if (onPreviewFunnel) {
      onPreviewFunnel(product);
    } else {
      triggerOpenFunnel(product.linkedFunnelId || product.id, product.name);
    }
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  return (
    <section className={`relative py-8 sm:py-14 ${moodStyle.sectionBg} border-b border-black/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* LAYOUT 1 : BENTO 3 CARDS (Apple / Linear Asymétrique : 70% + 30%) */}
        {layout === 'bento_3_cards' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Grande Carte Principale (70% - 8 cols sur 12) */}
            <div className={`lg:col-span-8 relative rounded-3xl overflow-hidden p-6 sm:p-10 lg:p-12 shadow-2xl flex flex-col justify-between min-h-[440px] sm:min-h-[500px] border border-black/10 group ${moodStyle.cardBg}`}>
              {/* Image de fond avec overlay dégradé */}
              <div className="absolute inset-0 z-0">
                <LiveEditable
                  label="Image Fond Bento"
                  sectionId={section.id}
                  sectionField="imageUrl"
                  value={heroImageUrl}
                  type="image"
                  isAdminPreview={isAdminPreview}
                >
                  <img
                    src={heroImageUrl}
                    alt={title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                </LiveEditable>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-slate-950/30 backdrop-blur-[0.5px] pointer-events-none" />
              </div>

              {/* Barre admin si produit principal lié */}
              {mainProduct && (
                <div className="relative z-20">
                  <AdminProductQuickBar
                    product={mainProduct}
                    storeSlug={storeSlug}
                    onEditProduct={onEditProduct}
                    onPreviewFunnel={onPreviewFunnel}
                    isPublicView={isPublicView}
                    isAdminPreview={isAdminPreview}
                  />
                </div>
              )}

              {/* Haut : Badges de Réassurance Animés */}
              <div className="relative z-10 flex flex-wrap items-center gap-2">
                <LiveEditable
                  label="Badge Hero Bento"
                  sectionId={section.id}
                  sectionField="subtitle"
                  value={subtitle}
                  isAdminPreview={isAdminPreview}
                  isInline={true}
                >
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-md flex items-center gap-1.5 animate-pulse">
                    <Flame className="w-3.5 h-3.5 text-amber-300" />
                    <span>{subtitle}</span>
                  </span>
                </LiveEditable>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20 hidden sm:inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Paiement à la livraison</span>
                </span>
              </div>

              {/* Bas : Titre H1, Description, Prix & CTA */}
              <div className="relative z-10 space-y-4 pt-12 text-white">
                <LiveEditable
                  label="Titre Principal Bento"
                  sectionId={section.id}
                  sectionField="title"
                  value={title}
                  isAdminPreview={isAdminPreview}
                >
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white drop-shadow-md">
                    {title}
                  </h1>
                </LiveEditable>

                <LiveEditable
                  label="Description Bento"
                  sectionId={section.id}
                  sectionField="description"
                  value={description}
                  type="textarea"
                  isAdminPreview={isAdminPreview}
                >
                  <p className="text-xs sm:text-base text-slate-200 max-w-xl leading-relaxed drop-shadow-xs">
                    {description}
                  </p>
                </LiveEditable>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <LiveEditable
                    label="Bouton CTA Bento"
                    sectionId={section.id}
                    sectionField="ctaText"
                    value={ctaText}
                    isAdminPreview={isAdminPreview}
                    isInline={true}
                  >
                    <button
                      type="button"
                      onClick={() => handleProductClick(mainProduct)}
                      className={`px-8 py-4 ${moodStyle.accentButton} ${buttonRadiusClass} font-black text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer shadow-xl active:scale-95 transition-transform`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{ctaText}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </LiveEditable>

                  {priceHighlight && (
                    <LiveEditable
                      label="Prix Mis en Avant"
                      sectionId={section.id}
                      sectionField="priceHighlight"
                      value={priceHighlight}
                      isAdminPreview={isAdminPreview}
                      isInline={true}
                    >
                      <div className="px-4 py-3.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-black text-amber-300 flex items-center justify-center gap-1.5">
                        <span>🏷️</span>
                        <span>{priceHighlight}</span>
                      </div>
                    </LiveEditable>
                  )}
                </div>
              </div>
            </div>

            {/* 2 Cartes Empilées à Droite (30% - 4 cols sur 12) */}
            <div className="lg:col-span-4 flex flex-col gap-5 sm:gap-6">
              {[sideProduct1, sideProduct2].map((prod, pIdx) => {
                if (!prod) return null;
                const hasDiscount = prod.originalPrice && prod.originalPrice > prod.price;
                const discountPercent = hasDiscount 
                  ? Math.round(((prod.originalPrice! - prod.price) / prod.originalPrice!) * 100) 
                  : 15;

                return (
                  <div
                    key={prod.id || pIdx}
                    onClick={() => handleProductClick(prod)}
                    className={`flex-1 relative rounded-3xl p-5 border border-black/10 shadow-lg flex flex-col justify-between cursor-pointer group/card transition-all duration-300 hover:shadow-2xl ${moodStyle.cardBg}`}
                  >
                    <AdminProductQuickBar
                      product={prod}
                      storeSlug={storeSlug}
                      onEditProduct={onEditProduct}
                      onPreviewFunnel={onPreviewFunnel}
                      isPublicView={isPublicView}
                      isAdminPreview={isAdminPreview}
                    />

                    <div className="flex items-center gap-4">
                      {/* Miniature Produit avec Zoom */}
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-black/5">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover transform group-hover/card:scale-108 transition-transform duration-500"
                        />
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] shadow">
                          -{discountPercent}%
                        </span>
                      </div>

                      {/* Infos Produit */}
                      <div className="min-w-0 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                          Coup de Cœur #{pIdx + 1}
                        </span>
                        <h3 className={`text-xs sm:text-sm font-bold line-clamp-2 ${moodStyle.textPrimary} group-hover/card:text-blue-600 transition-colors`}>
                          {prod.name}
                        </h3>
                        <div className="pt-0.5">
                          <span className={`text-sm sm:text-base font-black ${moodStyle.textPrimary}`}>
                            {prod.price.toLocaleString('fr-FR')} F
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] text-slate-400 line-through ml-1.5">
                              {prod.originalPrice?.toLocaleString('fr-FR')} F
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bouton d'Achat Direct en Bas de Carte */}
                    <div className="pt-3 mt-3 border-t border-black/5 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Stock direct
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(prod);
                        }}
                        className={`px-3.5 py-1.5 ${moodStyle.accentButton} ${buttonRadiusClass} font-bold text-xs flex items-center gap-1 shadow-sm`}
                      >
                        <span>Commander</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LAYOUT 2 : SPLIT CINEMA 50/50 */}
        {layout === 'split_cinema' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6 text-left">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
                {subtitle}
              </span>
              <h1 className={`text-3xl sm:text-5xl font-black tracking-tight leading-tight ${moodStyle.textPrimary}`}>
                {title}
              </h1>
              <p className={`text-sm sm:text-base leading-relaxed ${moodStyle.textSecondary}`}>
                {description}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleProductClick(mainProduct)}
                  className={`px-8 py-4 ${moodStyle.accentButton} ${buttonRadiusClass} font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{ctaText}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
                {priceHighlight && (
                  <div className={`px-4 py-3.5 ${buttonRadiusClass} border border-slate-200/80 bg-slate-50 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 ${moodStyle.textPrimary}`}>
                    <span>🏷️</span>
                    <span>{priceHighlight}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div 
                onClick={() => handleProductClick(mainProduct)}
                className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] sm:aspect-square bg-slate-100 cursor-pointer group"
              >
                <img
                  src={heroImageUrl}
                  alt={title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                {mainProduct && (
                  <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-black/75 backdrop-blur-md text-white flex items-center justify-between border border-white/20">
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{mainProduct.name}</p>
                      <p className="text-xs font-black text-amber-300">{mainProduct.price.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shrink-0">Acheter</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT 3 : CENTER MINIMAL */}
        {layout === 'center_minimal' && (
          <div className="text-center max-w-3xl mx-auto py-8 sm:py-16 space-y-6">
            <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
              {subtitle}
            </span>
            <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight ${moodStyle.textPrimary}`}>
              {title}
            </h1>
            <p className={`text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto ${moodStyle.textSecondary}`}>
              {description}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => handleProductClick(mainProduct)}
                className={`w-full sm:w-auto px-8 py-4 ${moodStyle.accentButton} ${buttonRadiusClass} font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
              {priceHighlight && (
                <div className={`px-5 py-3.5 ${buttonRadiusClass} border border-slate-200/80 bg-slate-50 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 ${moodStyle.textPrimary}`}>
                  <span>🏷️</span>
                  <span>{priceHighlight}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default BentoHeroModule;
