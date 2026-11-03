import React from 'react';
import { ShoppingBag, Zap, Tag, ShieldCheck } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface ReelProductData {
  id: string;
  name: string;
  priceFcfa: number;
  imageUrl: string;
  sellerName?: string;
  sellerHandle?: string;
  badge?: string;
}

export interface ReelProductCardProps {
  product: ReelProductData;
  onBuy: (product: ReelProductData) => void;
  className?: string;
}

/**
 * ReelProductCard - Composant flottant E-Commerce (Le Pont E-Commerce Nanasore)
 * Superposé en bas de la vidéo avec Nom, Prix en FCFA et Bouton "Acheter" Zero-Friction
 */
export const ReelProductCard: React.FC<ReelProductCardProps> = ({
  product,
  onBuy,
  className = ''
}) => {
  return (
    <div
      onClick={e => e.stopPropagation()}
      className={`rounded-2xl border-2 border-blue-500/80 bg-slate-950/85 backdrop-blur-xl p-2.5 sm:p-3 text-white shadow-[0_10px_35px_-5px_rgba(37,99,235,0.4)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ring-1 ring-white/20 select-none ${className}`}
    >
      {/* Visuel du produit avec Badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-blue-400/40 shrink-0 bg-slate-900 group">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
          <span className="absolute top-0.5 left-0.5 text-[8px] bg-[#2563EB] text-white px-1 py-0.2 rounded font-black tracking-wider flex items-center gap-0.5 shadow-sm">
            <ShoppingBag className="w-2.5 h-2.5 inline" />
          </span>
        </div>

        {/* Détails : Nom, Prix & Vendeur */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5" />
              <span>Boutique Nanasore</span>
            </span>
            {product.sellerName && (
              <span className="text-[9px] text-slate-400 truncate max-w-[90px]">
                • {product.sellerName}
              </span>
            )}
          </div>

          <h4 className="text-xs font-black text-white truncate max-w-[170px] sm:max-w-[200px]" title={product.name}>
            {product.name}
          </h4>

          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs sm:text-sm font-black text-amber-400 font-mono tracking-tight">
              {product.priceFcfa.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>
      </div>

      {/* Bouton d'Achat Instantané (Déclencheur du Tiroir Zero-Friction) */}
      <button
        type="button"
        onClick={() => {
          playValidationBeep();
          onBuy(product);
        }}
        className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-blue-600/30 ring-2 ring-white/40 shrink-0 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
        title="Acheter ce produit sans quitter la vidéo"
      >
        <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300 animate-pulse" />
        <span className="tracking-wide">Acheter</span>
      </button>
    </div>
  );
};
export default ReelProductCard;
