import React, { useState, useMemo } from 'react';
import { Package, Plus, Trash2, Gift, Sparkles, ShoppingBag, ArrowRight, Check, CheckCircle2, Zap } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { triggerOpenFunnel } from '../../themeUtils';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../utils/audio';

export interface InteractiveBundleLabModuleProps {
  section: CustomSectionInstance;
  moodStyle: MoodStyleConfig;
  buttonRadiusClass: string;
  products: StoreProductItem[];
  storeSlug?: string;
  onOpenTunnel?: (product: StoreProductItem) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

export const InteractiveBundleLabModule: React.FC<InteractiveBundleLabModuleProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  products = [],
  onOpenTunnel,
  onPreviewFunnel,
  onSelectProduct
}) => {
  const cfg = section.settings || section.config || {};
  const title = section.title || cfg.title || "🧪 Composez Votre Box Sur-Mesure";
  const subtitle = section.subtitle || cfg.subtitle || "RÉDUCTION PROGRESSIVE EN DIRECT : JUSQU'À -20% + CADEAU VIP";

  const discountTier2 = Number(cfg.discountTier2) || 10; // -10% pour 2 articles
  const discountTier3 = Number(cfg.discountTier3) || 20; // -20% pour 3 articles
  const giftLabel = cfg.giftLabel || "🎁 Cadeau Surprise VIP Offert (Échantillon / Accessoire)";

  // État des produits sélectionnés dans les 3 slots (max 3)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    // Par défaut, présélectionne 2 produits pour montrer immédiatement la valeur
    return products.slice(0, 2).map(p => p.id);
  });

  const selectedProducts = useMemo(() => {
    return selectedProductIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as StoreProductItem[];
  }, [selectedProductIds, products]);

  const count = selectedProducts.length;

  // Calcul du taux de remise actif
  const currentDiscountPercent = count >= 3 ? discountTier3 : count === 2 ? discountTier2 : 0;
  const isGiftUnlocked = count >= 3;

  // Calcul financier
  const subtotal = useMemo(() => {
    return selectedProducts.reduce((acc, p) => acc + p.price, 0);
  }, [selectedProducts]);

  const discountAmount = Math.round((subtotal * currentDiscountPercent) / 100);
  const finalPrice = subtotal - discountAmount;

  const handleToggleProduct = (product: StoreProductItem) => {
    const isAlreadySelected = selectedProductIds.includes(product.id);
    if (isAlreadySelected) {
      playTapBeep();
      setSelectedProductIds(prev => prev.filter(id => id !== product.id));
    } else {
      if (selectedProductIds.length >= 3) {
        playTapBeep();
        // Remplace le dernier
        const next = [...selectedProductIds.slice(0, 2), product.id];
        setSelectedProductIds(next);
      } else {
        if (selectedProductIds.length === 1) {
          playValidationBeep();
        } else if (selectedProductIds.length === 2) {
          playCashChime();
        } else {
          playTapBeep();
        }
        setSelectedProductIds(prev => [...prev, product.id]);
      }
    }
  };

  const handleRemoveSlot = (index: number) => {
    playTapBeep();
    setSelectedProductIds(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleOrderBox = () => {
    if (selectedProducts.length === 0) return;
    playCashChime();

    // Crée l'item Box virtuel pour le tunnel
    const bundleItem: StoreProductItem = {
      id: `box_custom_${Date.now()}`,
      name: `Box Sur-Mesure (${selectedProducts.length} articles)${isGiftUnlocked ? ' + Cadeau VIP' : ''}`,
      price: finalPrice,
      originalPrice: subtotal,
      image: selectedProducts[0]?.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
      category: 'Box & Packs',
      stock: 10,
      description: `Composée de : ${selectedProducts.map(p => p.name).join(' + ')}`,
      badge: `-${currentDiscountPercent}% ÉCONOMISÉS`
    };

    if (onOpenTunnel) {
      onOpenTunnel(bundleItem);
    } else if (onPreviewFunnel) {
      onPreviewFunnel(bundleItem);
    } else {
      triggerOpenFunnel(selectedProducts[0]?.linkedFunnelId || bundleItem.id, bundleItem.name);
    }

    if (onSelectProduct) {
      onSelectProduct(bundleItem);
    }
  };

  return (
    <section className={`relative py-14 sm:py-20 ${moodStyle.sectionBg} border-b border-black/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
            <Package className="w-3.5 h-3.5" />
            <span>{subtitle}</span>
          </span>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${moodStyle.textPrimary}`}>
            {title}
          </h2>
          <p className={`text-xs sm:text-sm ${moodStyle.textSecondary}`}>
            Sélectionnez 2 ou 3 articles dans la liste ci-dessous pour débloquer automatiquement vos remises et votre cadeau VIP !
          </p>
        </div>

        {/* JAUGE LUMINEUSE DE PROGRESSION */}
        <div className="max-w-4xl mx-auto mb-10 p-5 rounded-3xl bg-slate-900 text-white shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Package className="w-4 h-4 text-blue-400" />
              <span>Votre progression : {count} / 3 articles</span>
            </span>
            <span className="font-mono text-amber-300 font-black">
              {count === 0 && "Ajoutez un 1er article"}
              {count === 1 && "Plus que 1 article pour -10% !"}
              {count === 2 && "🔓 -10% DÉBLOQUÉ ! Ajoutez 1 article pour -20% + Cadeau !"}
              {count >= 3 && "🎉 PACK ULTIME : -20% + CADEAU VIP DÉBLOQUÉS !"}
            </span>
          </div>

          {/* Barre visuelle à 3 paliers */}
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex p-0.5 gap-1">
            <div className={`flex-1 rounded-full transition-all duration-300 ${count >= 1 ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-700'}`} />
            <div className={`flex-1 rounded-full transition-all duration-300 ${count >= 2 ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-slate-700'}`} />
            <div className={`flex-1 rounded-full transition-all duration-300 ${count >= 3 ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-700'}`} />
          </div>

          <div className="grid grid-cols-3 text-center text-[11px] font-bold text-slate-400 pt-1">
            <span className={count >= 1 ? 'text-white' : ''}>1 Article (Tarif Normal)</span>
            <span className={count >= 2 ? 'text-amber-300' : ''}>2 Articles (-10% Immédiat)</span>
            <span className={count >= 3 ? 'text-emerald-300' : ''}>3 Articles (-20% + Cadeau VIP 🎁)</span>
          </div>
        </div>

        {/* GRILLE CENTRALE : CHOIX DES PRODUITS & BOX VISUELLE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Colonne Gauche (7 cols) : Sélection des Articles */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/5">
              <h3 className={`text-base font-black ${moodStyle.textPrimary}`}>
                Articles Disponibles pour Votre Box :
              </h3>
              <span className="text-xs text-slate-400 font-bold">
                Cliquez pour ajouter ou retirer
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.slice(0, 6).map((product) => {
                const isSelected = selectedProductIds.includes(product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => handleToggleProduct(product)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500 shadow-md'
                        : `${moodStyle.cardBg} border-black/10 hover:border-blue-400`
                    }`}
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-600/80 flex items-center justify-center text-white">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <h4 className={`text-xs font-black line-clamp-1 ${moodStyle.textPrimary}`}>
                        {product.name}
                      </h4>
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                        {product.price.toLocaleString('fr-FR')} FCFA
                      </p>
                      <span className={`inline-block text-[10px] font-bold mt-1 ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-400'}`}>
                        {isSelected ? '✓ Inclus dans la Box' : '+ Ajouter'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Colonne Droite (5 cols) : La Box Visuelle & Calculateur */}
          <div className="lg:col-span-5 sticky top-24">
            <div className={`p-6 sm:p-7 rounded-3xl ${moodStyle.cardBg} border border-black/10 shadow-2xl space-y-5 text-left`}>
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h3 className={`text-base font-black ${moodStyle.textPrimary}`}>
                    Votre Box Personnalisée
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {count} / 3 slots
                </span>
              </div>

              {/* 3 SLOTS VISUELS */}
              <div className="space-y-2.5">
                {[0, 1, 2].map((slotIdx) => {
                  const item = selectedProducts[slotIdx];
                  if (item) {
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-black/5 flex items-center justify-between gap-3 shadow-xs animate-in fade-in"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={item.image} alt={item.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 block">Slot #{slotIdx + 1}</span>
                            <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{item.name}</p>
                            <span className="text-xs font-black text-blue-600">{item.price.toLocaleString('fr-FR')} F</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(slotIdx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition"
                          title="Retirer ce produit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slotIdx}
                      className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2 text-xs font-bold text-slate-400"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Emplacement #{slotIdx + 1} libre (Cliquez sur un article)</span>
                    </div>
                  );
                })}
              </div>

              {/* CADEAU VIP ACCORDÉ SI 3 ARTICLES */}
              {isGiftUnlocked && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                  <Gift className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
                  <span>{giftLabel}</span>
                </div>
              )}

              {/* RÉCAPITULATIF FINANCIER EN DIRECT */}
              <div className="pt-4 border-t border-black/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Sous-total normal :</span>
                  <span className="font-bold">{subtotal.toLocaleString('fr-FR')} FCFA</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Remise Box débloquée (-{currentDiscountPercent}%) :</span>
                    <span>-{discountAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  <span>Total Box :</span>
                  <span className="text-xl sm:text-2xl text-blue-600 dark:text-blue-400">
                    {finalPrice.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* BOUTON D'ACHAT GROUPÉ */}
              <button
                type="button"
                disabled={count === 0}
                onClick={handleOrderBox}
                className={`w-full py-4.5 ${
                  count === 0
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                    : `${moodStyle.accentButton} shadow-xl shadow-blue-600/30 cursor-pointer active:scale-95`
                } ${buttonRadiusClass} font-black text-sm flex items-center justify-center gap-2.5 transition-transform`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {count === 0
                    ? "Sélectionnez au moins 1 article"
                    : `Commander ma Box (${finalPrice.toLocaleString('fr-FR')} F)`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-center text-slate-400">
                📦 Box emballée avec soin • Vérification du contenu avant paiement
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
