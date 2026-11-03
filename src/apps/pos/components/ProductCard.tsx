import React from 'react';
import { StoreProductItem } from '../../../types/theme';

export interface ProductCardProps {
  product: StoreProductItem;
  onOpenTunnel?: (product: StoreProductItem) => void;
  onBuyNow?: (product: StoreProductItem) => void;
  badgeText?: string;
  className?: string;
  isPublicView?: boolean;
  isProductEditor?: boolean;
  canDelete?: boolean;
  onOpenEditProduct?: (product: StoreProductItem) => void;
  onRemoveProduct?: (id: string, name: string, event: React.MouseEvent) => void;
}

/**
 * ProductCard - Composant Carte Produit Digital au format Carré 1:1 (Facebook/Instagram Ads)
 * Standard absolu 1080x1080 pour préserver les affiches publicitaires sans déformation.
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenTunnel,
  onBuyNow,
  badgeText = 'Digital',
  className = '',
  isPublicView = true,
  isProductEditor = false,
  canDelete = false,
  onOpenEditProduct,
  onRemoveProduct
}) => {
  return (
    <div
      className={`digital-card overflow-hidden flex flex-col justify-between group cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all ${className}`}
      onClick={() => onOpenTunnel?.(product)}
    >
      <div>
        {/* 1. Le conteneur de l'image force le carré parfait (Facebook/Insta Ads 1080x1080) */}
        <div className="product-image-container relative">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1080&auto=format&fit=crop&q=80'}
            alt={product.name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1080&auto=format&fit=crop&q=80';
            }}
            className="transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Badges Dynamiques en absolute en haut à droite */}
          {badgeText && (
            <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
              <span className="bg-[#FFFBEB] text-[#0F172A] text-[10px] sm:text-[11px] font-extrabold px-3 py-1 rounded-full shadow-sm tracking-tight border border-amber-200/50">
                {badgeText}
              </span>
            </div>
          )}
        </div>

        {/* Titre et détails bridés à 2 lignes */}
        <div className="p-3.5 sm:p-4 pb-1">
          <h3
            className="digital-title-clamped font-extrabold text-sm sm:text-base text-[#0F172A] group-hover:text-[#0056D2] transition-colors"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>
      </div>

      {/* Footer Prix et Actions */}
      <div className="p-3.5 sm:p-4 pt-1 flex items-end justify-between gap-2">
        <div>
          <div className="text-[10.5px] font-medium text-slate-400">Prix</div>
          <div className="font-extrabold text-base sm:text-lg text-[#0F172A] tracking-tight">
            {typeof product.price === 'number' ? `${product.price.toLocaleString('fr-FR')} FCFA` : product.price}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {Boolean(product.linkedFunnelId || onOpenTunnel) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTunnel?.(product);
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#0056D2] text-[#0056D2] hover:bg-[#F0F7FF] text-xs font-bold transition-colors cursor-pointer"
            >
              Voir tunnel
            </button>
          )}
          {onBuyNow && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBuyNow(product);
              }}
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-[#0056D2] hover:bg-[#0046AB] text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
            >
              Acheter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
