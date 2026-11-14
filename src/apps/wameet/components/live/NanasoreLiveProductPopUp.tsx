import React from 'react';
import { ShoppingBag, Zap, X, Sparkles, Flame } from 'lucide-react';
import { LiveEventProduct } from '../../../../services/nanasoreLiveSyncService';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface NanasoreLiveProductPopUpProps {
  product: LiveEventProduct;
  onBuyClick: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const NanasoreLiveProductPopUp: React.FC<NanasoreLiveProductPopUpProps> = ({
  product,
  onBuyClick,
  onDismiss,
  className = ''
}) => {
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    onBuyClick();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (onDismiss) onDismiss();
  };

  return (
    <div
      role="region"
      aria-label="Produit présenté en direct"
      className={`relative z-40 transform-gpu transition-all duration-300 ease-out animate-in slide-in-from-bottom-6 fade-in duration-300 will-change-transform ${className}`}
      style={{
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      {/* Carte Glassmorphism ultra-compacte et élégante : Blanc Pur (#FFFFFF) & Bleu Royal (#4169E1) */}
      <div className="relative rounded-[24px] p-3 sm:p-3.5 bg-white border-2 border-[#4169E1]/30 shadow-[0_16px_40px_-10px_rgba(65,105,225,0.25)] ring-2 ring-[#4169E1]/15 text-slate-900 min-w-[285px] max-w-[340px] sm:max-w-[360px] overflow-hidden">
        {/* Header : Badge "Offre en direct" & Bouton fermer */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Présenté en Direct</span>
            </span>
            {product.badge && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#4169E1] text-[9px] font-bold border border-[#4169E1]/20">
                {product.badge}
              </span>
            )}
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              title="Masquer la pop-up"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Corps de la carte : Miniature + Titre Court + Prix + Bouton vibrant Bleu Royal */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Miniature du produit */}
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-xs">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover transform-gpu hover:scale-105 transition-transform duration-300"
              loading="eager"
            />
            {discountPercent && (
              <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded-md bg-rose-600 text-white text-[9px] font-black tracking-tight shadow">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Informations produit */}
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 line-clamp-1 leading-snug">
              {product.shortTitle || product.title}
            </h4>

            {/* Tarifs : Prix actuel en Bleu Royal */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm sm:text-base font-black text-[#4169E1] tabular-nums tracking-tight">
                  {formatCFA(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-[11px] line-through text-slate-400 tabular-nums font-semibold">
                    {formatCFA(product.originalPrice)}
                  </span>
                )}
              </div>

              {typeof product.stockLeft === 'number' && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  product.stockLeft <= 0
                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                    : product.stockLeft <= 3
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {product.stockLeft <= 0 ? '🚫 Rupture Caisse' : `⚡ ${product.stockLeft} en stock`}
                </span>
              )}
            </div>

            {/* Bouton Acheter : Bleu Royal (#4169E1) ou Verrouillé si Rupture */}
            <button
              type="button"
              disabled={typeof product.stockLeft === 'number' && product.stockLeft <= 0}
              onClick={handleBuy}
              className={`w-full mt-1 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all relative overflow-hidden group ${
                typeof product.stockLeft === 'number' && product.stockLeft <= 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-[#4169E1] hover:bg-[#3154b3] active:scale-95 text-white shadow-[#4169E1]/30 border border-blue-400/30 cursor-pointer'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-white fill-white group-hover:scale-110 transition-transform" />
              <span className="relative z-10 tracking-wide">
                {typeof product.stockLeft === 'number' && product.stockLeft <= 0
                  ? 'Épuisé en Boutique Physique'
                  : 'Acheter en 1 Clic'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NanasoreLiveProductPopUp;
