import React, { useState } from 'react';
import { Eye, Heart, Star, Check } from 'lucide-react';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { AdminProductQuickBar } from '../../components/storeBuilder/AdminProductQuickBar';
import { hasExplicitProductFunnel } from '../themeUtils';

export interface BeautyColorSwatch {
  id: string;
  name: string;
  hex: string;
  image?: string;
}

export interface EmeraldProductCardProps {
  product: StoreProductItem;
  onSelectProduct: (product: StoreProductItem) => void;
  onAddToCart: (product: StoreProductItem, quantity: number) => void;
  onBuyNow?: (product: StoreProductItem, quantity: number) => void;
  onOpenFunnel?: (product: StoreProductItem, e: React.MouseEvent) => void;
  onToggleWishlist?: (product: StoreProductItem, e: React.MouseEvent) => void;
  swatches?: BeautyColorSwatch[];
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  storeSlug?: string;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
}

export const EmeraldProductCard: React.FC<EmeraldProductCardProps> = ({
  product,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onOpenFunnel,
  onToggleWishlist,
  swatches,
  isPublicView,
  isAdminPreview,
  storeSlug,
  onEditProduct,
  onPreviewFunnel
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedSwatchIndex, setSelectedSwatchIndex] = useState(0);
  const [isAddedRecently, setIsAddedRecently] = useState(false);

  // Détection d'un prix barré / remise
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : null;

  // Teintes cosmétiques (soit passées en props, soit extraites des variantes, soit teintes démo de l'image 1)
  const defaultBeautySwatches: BeautyColorSwatch[] = [
    { id: 'shade-1', name: 'Rouge Grenat', hex: '#D9381E' },
    { id: 'shade-2', name: 'Noir Carbone', hex: '#111C18' },
    { id: 'shade-3', name: 'Or Ambré', hex: '#E5A93C' },
    { id: 'shade-4', name: 'Bleu Majorelle', hex: '#2A4B8D' }
  ];

  const effectiveSwatches: BeautyColorSwatch[] = swatches && swatches.length > 0
    ? swatches
    : (product as any).colorSwatches || defaultBeautySwatches;

  const visibleSwatches = effectiveSwatches.slice(0, 3);
  const remainingSwatchesCount = effectiveSwatches.length - 3;

  // Clic sur une teinte/variante
  const handleSwatchClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    setSelectedSwatchIndex(idx);
  };

  // Clic Favoris
  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    setIsWishlisted(prev => !prev);
    if (onToggleWishlist) onToggleWishlist(product, e);
  };

  // Clic Aperçu rapide (Ouvre la PDP ou le tunnel)
  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (onOpenFunnel) {
      onOpenFunnel(product, e);
    } else {
      onSelectProduct(product);
    }
  };

  // Clic Voir tunnel
  const handleTunnelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (onOpenFunnel) {
      onOpenFunnel(product, e);
    } else {
      onSelectProduct(product);
    }
  };

  // Clic Acheter
  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 1600);

    if (onBuyNow) {
      onBuyNow(product, 1);
    } else {
      onAddToCart(product, 1);
    }
  };

  return (
    <div 
      className="emerald-product-card group relative"
      onClick={() => onSelectProduct(product)}
      role="article"
      aria-label={product.name}
    >
      <AdminProductQuickBar
        product={product}
        isPublicView={isPublicView}
        isAdminPreview={isAdminPreview}
        storeSlug={storeSlug}
        onEditProduct={onEditProduct}
        onPreviewFunnel={onPreviewFunnel}
      />

      {/* ================= CONTENEUR IMAGE (FOOL-PROOF) ================= */}
      <div className="emerald-card-media">
        
        {/* Badge Promo Rond (width: 46px, height: 46px, bordure ronde, Or Champagne #C59B27) */}
        {hasDiscount && (
          <div className="emerald-round-promo-badge">
            {discountPercent ? `-${discountPercent}%` : 'Promo'}
          </div>
        )}

        {/* Icônes Flottantes au Survol (top: 15px, right: 15px) */}
        <div className="emerald-card-hover-actions">
          {/* 1. Aperçu rapide (qui ouvre le tunnel dépliable) */}
          <button
            type="button"
            onClick={handleQuickViewClick}
            className="emerald-card-action-btn"
            title="Aperçu rapide du produit"
            aria-label="Aperçu rapide"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* 2. Favoris */}
          <button
            type="button"
            onClick={handleWishlistClick}
            className={`emerald-card-action-btn ${isWishlisted ? 'active' : ''}`}
            title={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-label="Ajouter aux favoris"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#D9381E] text-[#D9381E]' : ''}`} />
          </button>
        </div>

        {/* Flacon Cosmétique avec object-fit: contain et zoom doux au survol */}
        <img
          src={product.image}
          alt={product.name}
          className="emerald-card-img"
          loading="lazy"
        />
      </div>

      {/* ================= CORPS DE LA CARTE (Centré) ================= */}
      <div className="emerald-card-body">
        
        {/* Étoiles d'avis : 5 étoiles en Or Champagne #C59B27 (14px) */}
        <div className="emerald-card-stars" aria-label="5 étoiles sur 5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="emerald-card-star" />
          ))}
        </div>

        {/* Titre du Produit : Outfit 16px, 600, #111C18 bridé strictement à 1 ligne */}
        <h3 className="emerald-card-title" title={product.name}>
          {product.name}
        </h3>

        {/* Prix : Outfit gras (18px, #0F4C3A) avec ancien prix barré en gris #888 si promo */}
        <div className="emerald-card-price-row">
          <span className="emerald-card-price">
            {formatCFA(product.price)}
          </span>
          {hasDiscount && (
            <span className="emerald-card-old-price">
              {formatCFA(product.originalPrice!)}
            </span>
          )}
        </div>

        {/* Pastilles de Variantes / Teintes (Swatches) */}
        {effectiveSwatches.length > 0 && (
          <div className="emerald-card-swatches">
            {visibleSwatches.map((swatch, idx) => {
              const isActive = selectedSwatchIndex === idx;

              return (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={(e) => handleSwatchClick(idx, e)}
                  className={`emerald-swatch-item ${isActive ? 'active' : ''}`}
                  style={{ backgroundColor: swatch.hex }}
                  aria-label={`Teinte ${swatch.name}`}
                  title={swatch.name}
                >
                  {/* Infobulle noire au survol */}
                  <span className="emerald-swatch-tooltip">
                    {swatch.name}
                  </span>
                </button>
              );
            })}

            {/* Texte +1 ou +X s'il y a plus de 3 teintes */}
            {remainingSwatchesCount > 0 && (
              <span className="emerald-swatch-more">
                +{remainingSwatchesCount}
              </span>
            )}
          </div>
        )}

        {/* Boutons d'Action Nanasore : Tunnel optionnel + Ajouter au panier */}
        <div className={`emerald-card-actions ${hasExplicitProductFunnel(product) ? 'flex items-center gap-1.5' : 'flex'}`}>
          {hasExplicitProductFunnel(product) && (
            <button
              type="button"
              onClick={handleTunnelClick}
              className="emerald-card-btn-tunnel flex-1 truncate"
              title="Voir le tunnel de vente"
            >
              Voir tunnel
            </button>
          )}

          <button
            type="button"
            onClick={handleBuyClick}
            className="emerald-card-btn-buy flex-1 truncate"
            title="Ajouter au panier"
          >
            {isAddedRecently ? (
              <span className="flex items-center justify-center gap-1">
                <Check className="w-3 h-3 text-[#C59B27]" />
                Ajouté !
              </span>
            ) : (
              hasExplicitProductFunnel(product) ? 'Panier' : 'Ajouter au panier'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
