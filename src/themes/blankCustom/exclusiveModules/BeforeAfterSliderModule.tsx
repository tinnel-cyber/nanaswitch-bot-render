import React, { useState, useRef } from 'react';
import { Sparkles, ShoppingBag, ArrowRight, CheckCircle2, ShieldCheck, Flame, Zap } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { AdminProductQuickBar } from '../../../components/storeBuilder/AdminProductQuickBar';
import { triggerOpenFunnel } from '../../themeUtils';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface BeforeAfterSliderModuleProps {
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

export const BeforeAfterSliderModule: React.FC<BeforeAfterSliderModuleProps> = ({
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
  const cfg = (section.settings || (section as any).config || {}) as any;
  const DEMO_TRANSFORMATION_PRODUCT: StoreProductItem = {
  id: 'demo-transformation-product',
  name: "Sérum Révélateur d'Éclat",
  price: 17500,
  originalPrice: 22000,
  category: "Soins & Éclat",
  image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80",
  stock: 8,
  description: "La formule testée et validée par nos clients qui produit la transformation visible dès les premières applications.",
  badge: "Résultat Prouvé"
};

  const targetProduct = products.find(p => p.id === cfg.productId) || products[0] || DEMO_TRANSFORMATION_PRODUCT;

  const title = section.title || cfg.title || "La Preuve en Image : Avant vs Après";
  const subtitle = section.subtitle || cfg.subtitle || "RÉSULTATS VISIBLES • GLISSEZ POUR COMPARER";

  const beforeImage = cfg.beforeImage || "https://images.unsplash.com/photo-1512290900672-1f02e1b1d7d0?w=800&auto=format&fit=crop&q=80";
  const afterImage = cfg.afterImage || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80";
  const beforeLabel = cfg.beforeLabel || "AVANT (Sans le produit)";
  const afterLabel = cfg.afterLabel || "APRÈS (Résultat visible)";

  // Position du slider en % (0 - 100)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons === 1) { // Click gauche maintenu
      handleSliderMove(e.clientX);
    }
  };

  const handleOrder = () => {
    if (!targetProduct) return;
    playValidationBeep();
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
        {/* En-tête */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{subtitle}</span>
          </span>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${moodStyle.textPrimary}`}>
            {title}
          </h2>
          <p className={`text-xs sm:text-sm ${moodStyle.textSecondary}`}>
            Faites glisser la poignée centrale pour révéler la différence spectaculaire.
          </p>
        </div>

        {/* Grille : Comparateur Tactile + Fiche Produit */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
          {/* COMPARATEUR SLIDER INTERACTIF (7 colonnes) */}
          <div className="lg:col-span-7">
            <div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              onClick={(e) => handleSliderMove(e.clientX)}
              className="relative aspect-4/3 sm:aspect-16/10 rounded-3xl overflow-hidden shadow-2xl border border-black/10 select-none cursor-ew-resize group"
            >
              {/* IMAGE APRÈS (Fond complet) */}
              <img
                src={afterImage}
                alt={afterLabel}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white font-black text-xs uppercase shadow-md pointer-events-none">
                {afterLabel}
              </div>

              {/* IMAGE AVANT (Superposée et découpée selon sliderPos) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={beforeImage}
                  alt={beforeLabel}
                  className="absolute inset-0 w-full h-full object-cover max-w-none"
                  style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
                />
                <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md text-slate-200 font-black text-xs uppercase shadow-md">
                  {beforeLabel}
                </div>
              </div>

              {/* LIGNE & POIGNÉE TACTILE CENTRALE */}
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none flex items-center justify-center -translate-x-1/2"
                style={{ left: `${sliderPos}%` }}
              >
                {/* Ligne blanche verticale */}
                <div className="w-1 h-full bg-white shadow-2xl shadow-black/80" />

                {/* Poignée centrale circulaire ↔️ */}
                <div className="absolute w-11 h-11 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center font-black text-xs ring-4 ring-black/20 transform group-hover:scale-110 transition-transform">
                  ↔️
                </div>
              </div>

              {/* Guide d'interaction au bas */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold pointer-events-none">
                ↔️ Glissez pour comparer
              </div>
            </div>

            {/* Input range natif accessible pour le contrôle au doigt */}
            <div className="mt-3 px-2">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-ew-resize"
                aria-label="Contrôle du comparateur avant après"
              />
            </div>
          </div>

          {/* FICHE DU PRODUIT RESPONSABLE DU RÉSULTAT (5 colonnes) */}
          {targetProduct && (
            <div className={`lg:col-span-5 p-6 sm:p-8 rounded-3xl ${moodStyle.cardBg} border border-black/10 shadow-2xl space-y-5 text-left relative`}>
              <AdminProductQuickBar
                product={targetProduct}
                storeSlug={storeSlug}
                onEditProduct={onEditProduct}
                onPreviewFunnel={onPreviewFunnel}
                isPublicView={isPublicView}
                isAdminPreview={isAdminPreview}
              />

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black uppercase flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Le Secret du Résultat</span>
                </span>
              </div>

              <div className="space-y-2">
                <h3 className={`text-xl sm:text-2xl font-black ${moodStyle.textPrimary}`}>
                  {targetProduct.name}
                </h3>
                <p className={`text-xs sm:text-sm ${moodStyle.textSecondary} leading-relaxed`}>
                  {targetProduct.description || "La formule testée et validée par nos clients qui produit la transformation visible ci-contre dès les premières applications."}
                </p>
              </div>

              {/* Bénéfices immédiats */}
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Résultat garanti ou produit échangé sous 7 jours</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Paiement à la livraison après inspection du colis</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Expédition prioritaire partout en Côte d'Ivoire & sous-région</span>
                </p>
              </div>

              {/* Prix & Bouton CTA */}
              <div className="pt-4 border-t border-black/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tarif Exclusif</span>
                    <span className={`text-2xl font-black ${moodStyle.textPrimary}`}>
                      {targetProduct.price.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  {targetProduct.originalPrice && targetProduct.originalPrice > targetProduct.price && (
                    <span className="text-xs line-through text-slate-400">
                      {targetProduct.originalPrice.toLocaleString('fr-FR')} FCFA
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOrder}
                  className={`w-full py-4.5 ${moodStyle.accentButton} ${buttonRadiusClass} font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-blue-600/30 active:scale-95 transition-transform`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Obtenir ce résultat dès aujourd'hui</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
