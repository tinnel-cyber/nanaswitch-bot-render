import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Eye, 
  Star, 
  ArrowLeftRight, 
  Check, 
  Sparkles,
  Heart
} from 'lucide-react';
import { CustomSectionInstance } from '../../../../types';
import { StoreProductItem } from './types';
import { MoodStyleConfig } from '../../../../themes/blankCustom/moodStyles';
import { AdminProductQuickBar } from './AdminProductQuickBar';
import { triggerOpenFunnel } from '../../../../themes/themeUtils';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface GlowingCosmeticsGridProps {
  section: CustomSectionInstance;
  moodStyle?: MoodStyleConfig;
  buttonRadiusClass?: string;
  products: StoreProductItem[];
  categories?: string[];
  storeSlug?: string;
  onOpenTunnel?: (product: StoreProductItem) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onProductClick?: (product: StoreProductItem) => void;
  onEditProduct?: (product: StoreProductItem, options?: any) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

// 4 Produits cosmétiques & soins par défaut haute fidélité (Inspirés de la maquette Shopify Glowing)
const FALLBACK_GLOWING_PRODUCTS: StoreProductItem[] = [
  {
    id: 'glow-balm-01',
    name: 'Scalp Moisturizing Cream',
    price: 29000,
    category: 'Skincare',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop&q=80'
    ],
    colorSwatches: [
      { id: 'c-black', name: 'Black', hex: '#111111', border: true },
      { id: 'c-terracotta', name: 'Terracotta', hex: '#8B4513' },
      { id: 'c-blue', name: 'Soft Blue', hex: '#87CEEB' }
    ],
    stock: 25
  },
  {
    id: 'glow-toner-02',
    name: 'Enriched Hand & Body Wash',
    price: 23000,
    badge: 'New',
    isNew: true,
    category: 'Body Care',
    image: 'https://images.unsplash.com/photo-1608248597359-335606443657?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1608248597359-335606443657?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80'
    ],
    stock: 18
  },
  {
    id: 'glow-mousse-03',
    name: 'Enriched Hand Wash',
    price: 25000,
    originalPrice: 85000,
    badge: 'Sale',
    category: 'Hand Care',
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80'
    ],
    stock: 14
  },
  {
    id: 'glow-duo-04',
    name: 'Enriched Duo',
    price: 27000,
    category: 'Sets & Duos',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'
    ],
    stock: 30
  }
];

export const GlowingCosmeticsGrid: React.FC<GlowingCosmeticsGridProps> = ({
  section,
  moodStyle,
  buttonRadiusClass = 'rounded-full',
  products = [],
  categories = [],
  storeSlug = 'boutique',
  onOpenTunnel,
  onPreviewFunnel,
  onSelectProduct,
  onProductClick,
  onEditProduct,
  isPublicView = false,
  isAdminPreview = false
}) => {
  const cfg = section.settings || section.config || {};

  const title = section.title || cfg.title || 'Our Featured Products';
  const subtitle = section.subtitle || cfg.subtitle || 'Get the skin you want to feel';
  const columns = Number(cfg.columns) || 4;
  const showBadges = cfg.showBadges !== false;
  const showColorSwatches = cfg.showColorSwatches !== false;
  const filterCategory = cfg.category || 'Tous les produits';

  // États locaux interactifs pour la Wishlist, la Comparaison et les Toasts
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Détermination des produits effectifs de la vitrine
  const displayProducts = useMemo(() => {
    let list = products.length > 0 ? [...products] : [...FALLBACK_GLOWING_PRODUCTS];

    if (filterCategory && filterCategory !== 'Tous les produits') {
      const filtered = list.filter(p => p.category?.toLowerCase() === filterCategory.toLowerCase());
      if (filtered.length > 0) list = filtered;
    }

    // Si la boutique n'a pas encore assez de produits pour remplir une belle grille, on complète avec les fallbacks
    if (list.length < 5) {
      FALLBACK_GLOWING_PRODUCTS.forEach(fb => {
        if (list.length < 5 && !list.some(p => p.id === fb.id)) {
          list.push(fb);
        }
      });
    }

    return list;
  }, [products, filterCategory]);

  const enableCounterCarousel = cfg.enableCounterCarousel !== false;

  const carouselDuration = useMemo(() => {
    const spd = cfg.carouselSpeed || 'normal';
    if (spd === 'slow') return '55s';
    if (spd === 'fast') return '28s';
    return '40s';
  }, [cfg.carouselSpeed]);

  const carouselRows = useMemo(() => {
    if (displayProducts.length === 0) return [];
    const pool = [...displayProducts];
    while (pool.length < 5) {
      pool.push(...displayProducts);
    }

    const settingRows = cfg.carouselRowsCount;
    let numRows = 2; // Par défaut 2 couches
    if (settingRows === 3) numRows = 3;
    else if (settingRows === 4) numRows = 4;
    else if (settingRows === 'auto') {
      numRows = Math.max(2, Math.min(5, Math.ceil(pool.length / 5)));
    }

    const rows: StoreProductItem[][] = [];
    for (let r = 0; r < numRows; r++) {
      const rowItems: StoreProductItem[] = [];
      const startIndex = (r * 5) % pool.length;
      for (let i = 0; i < 5; i++) {
        rowItems.push(pool[(startIndex + i) % pool.length]);
      }
      rows.push(rowItems);
    }
    return rows;
  }, [displayProducts, cfg.carouselRowsCount]);

  const gridColsClass = useMemo(() => {
    if (columns === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (columns === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  }, [columns]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleProductTrigger = (product: StoreProductItem) => {
    playTapBeep();
    if (onProductClick) {
      onProductClick(product);
    } else if (onSelectProduct) {
      onSelectProduct(product);
    } else if (onOpenTunnel) {
      onOpenTunnel(product);
    } else {
      triggerOpenFunnel(product.linkedFunnelId || product.id, product.name);
    }
  };

  const handleTunnelClick = (e: React.MouseEvent, product: StoreProductItem) => {
    e.stopPropagation();
    playValidationBeep();
    if (onOpenTunnel) {
      onOpenTunnel(product);
    } else if (onPreviewFunnel) {
      onPreviewFunnel(product);
    } else {
      triggerOpenFunnel(product.linkedFunnelId || product.id, product.name);
    }
  };

  const handleQuickViewClick = (e: React.MouseEvent, product: StoreProductItem) => {
    e.stopPropagation();
    handleProductTrigger(product);
  };

  const handleToggleWishlist = (e: React.MouseEvent, product: StoreProductItem) => {
    e.stopPropagation();
    playValidationBeep();
    setWishlist(prev => {
      const exists = prev.includes(product.id);
      if (exists) {
        showToast(`Retiré de la liste de souhaits`);
        return prev.filter(id => id !== product.id);
      } else {
        showToast(`✨ Ajouté à la liste de souhaits !`);
        return [...prev, product.id];
      }
    });
  };

  const handleToggleCompare = (e: React.MouseEvent, product: StoreProductItem) => {
    e.stopPropagation();
    playValidationBeep();
    setCompareList(prev => {
      const exists = prev.includes(product.id);
      if (exists) {
        showToast(`Retiré du comparateur`);
        return prev.filter(id => id !== product.id);
      } else {
        showToast(`⚖️ Ajouté au comparateur de soins !`);
        return [...prev, product.id];
      }
    });
  };

  const formatPrice = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 FCFA';
    // Si devise standard CFA ou format numérique
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  const renderCosmeticsCard = (product: StoreProductItem, key: string | number, isCarousel = false) => {
    const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
    const isNewBadge = Boolean(
      product.isNew || 
      (product.badge && product.badge.toLowerCase() === 'new') ||
      (product.badge && product.badge.toLowerCase().includes('nouveau'))
    );
    const isSaleBadge = Boolean(
      hasDiscount || 
      (product.badge && product.badge.toLowerCase() === 'sale') ||
      (product.badge && product.badge.toLowerCase().includes('promo'))
    );

    // Images principale et secondaire pour le Hover Swap
    const primaryImage = product.image || product.photoUrl || (product.images && product.images[0]) || FALLBACK_GLOWING_PRODUCTS[0].image;
    const secondaryImage = (product.images && product.images[1]) || (product.images && product.images.length > 1 ? product.images[1] : null);
    const hasSecondImage = Boolean(secondaryImage && secondaryImage !== primaryImage);

    const isWishlisted = wishlist.includes(product.id);
    const isCompared = compareList.includes(product.id);

    return (
      <div 
        key={key}
        className={`group flex flex-col items-center select-none ${
          isCarousel ? 'w-[260px] sm:w-[285px] shrink-0' : 'w-full'
        }`}
      >
        {/* 1. Conteneur Image Vertical (aspect-[3/4] bg-[#F7F7F7] relative overflow-hidden) */}
        <div 
          onClick={() => handleProductTrigger(product)}
          className="w-full aspect-[3/4] bg-[#F7F7F7] relative overflow-hidden rounded-none sm:rounded-xs cursor-pointer flex items-center justify-center transition-all duration-300 group-hover:shadow-xs"
        >
          {/* Badges en haut à gauche (top-3 left-3 z-20) */}
          {showBadges && (
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start pointer-events-none">
              {isNewBadge && (
                <span className="bg-[#B85D3B] text-white text-[11px] font-semibold px-3 py-1 rounded-[2px] tracking-wide shadow-xs uppercase">
                  New
                </span>
              )}
              {isSaleBadge && (
                <span className="bg-[#4E7661] text-white text-[11px] font-semibold px-3 py-1 rounded-[2px] tracking-wide shadow-xs uppercase">
                  Sale
                </span>
              )}
              {!isNewBadge && !isSaleBadge && product.badge && (
                <span className="bg-slate-900 text-white text-[11px] font-semibold px-3 py-1 rounded-[2px] tracking-wide shadow-xs uppercase">
                  {product.badge}
                </span>
              )}
            </div>
          )}

          {/* Bouton Rapide Admin Preview */}
          {isAdminPreview && onEditProduct && (
            <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <AdminProductQuickBar
                product={product}
                onEditProduct={onEditProduct}
              />
            </div>
          )}

          {/* Effet Changement d'Image au Survol (Secondary Image Hover Swap) */}
          <div className="w-full h-full p-6 sm:p-8 flex items-center justify-center relative">
            {/* Image Principale */}
            <img
              src={primaryImage}
              alt={product.name}
              className={`w-full h-full object-contain transition-all duration-700 ease-out ${
                hasSecondImage 
                  ? 'group-hover:opacity-0' 
                  : 'group-hover:scale-105'
              }`}
              loading="lazy"
              decoding="async"
            />

            {/* Image Secondaire qui apparaît en fondu au survol */}
            {hasSecondImage && (
              <img
                src={secondaryImage!}
                alt={`${product.name} vue 2`}
                className="absolute inset-0 w-full h-full object-contain p-6 sm:p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>

          {/* Rangée des 4 Boutons Ronds Flottants avec Tooltips au survol */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-2.5 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-auto"
          >
            {/* Bouton 1 : Voir le tunnel 🛍️ */}
            <button
              type="button"
              onClick={(e) => handleTunnelClick(e, product)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-slate-900 hover:bg-black hover:text-white shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer"
              aria-label="Voir le tunnel"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="absolute -top-9 px-2.5 py-1 bg-black text-white text-[11px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-black">
                Voir le tunnel
              </span>
            </button>

            {/* Bouton 2 : Quick View 👁️ */}
            <button
              type="button"
              onClick={(e) => handleQuickViewClick(e, product)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-slate-900 hover:bg-black hover:text-white shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer"
              aria-label="Aperçu rapide"
            >
              <Eye className="w-4 h-4" />
              <span className="absolute -top-9 px-2.5 py-1 bg-black text-white text-[11px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-black">
                Quick View
              </span>
            </button>

            {/* Bouton 3 : Add To Wishlist ☆ */}
            <button
              type="button"
              onClick={(e) => handleToggleWishlist(e, product)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer ${
                isWishlisted 
                  ? 'bg-black text-amber-400 hover:bg-slate-900' 
                  : 'bg-white text-slate-900 hover:bg-black hover:text-white'
              }`}
              aria-label="Ajouter aux favoris"
            >
              <Star className={`w-4 h-4 ${isWishlisted ? 'fill-amber-400' : ''}`} />
              <span className="absolute -top-9 px-2.5 py-1 bg-black text-white text-[11px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-black">
                {isWishlisted ? 'Wishlist (Actif)' : 'Add To Wishlist'}
              </span>
            </button>

            {/* Bouton 4 : Compare ⇄ */}
            <button
              type="button"
              onClick={(e) => handleToggleCompare(e, product)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer ${
                isCompared 
                  ? 'bg-black text-emerald-400 hover:bg-slate-900' 
                  : 'bg-white text-slate-900 hover:bg-black hover:text-white'
              }`}
              aria-label="Comparer ce produit"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span className="absolute -top-9 px-2.5 py-1 bg-black text-white text-[11px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-black">
                {isCompared ? 'Comparé (Actif)' : 'Compare'}
              </span>
            </button>
          </div>
        </div>

        {/* 2. Zone Texte Centrée sous l'image (text-center pt-4) */}
        <div className="w-full text-center pt-4 flex flex-col items-center">
          
          {/* Ligne Prix EN PREMIER (au-dessus du titre, référence Shopify Glowing !) */}
          <div className="flex items-center justify-center gap-2">
            {hasDiscount && (
              <span className="text-slate-400 line-through text-sm">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            <span className="text-slate-900 font-bold text-base">
              {formatPrice(product.price)}
            </span>
          </div>

          {/* Titre du Produit juste en dessous */}
          <h3 
            onClick={() => handleProductTrigger(product)}
            className="text-sm font-medium text-slate-800 hover:text-[#4E7661] mt-1 transition-colors cursor-pointer line-clamp-1 max-w-full"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Pastilles de Couleurs / Variantes si disponibles */}
          {showColorSwatches && product.colorSwatches && product.colorSwatches.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              {product.colorSwatches.map((swatch, sIdx) => (
                <span
                  key={sIdx}
                  title={swatch.name}
                  className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs cursor-pointer hover:scale-125 transition-transform"
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <section className="relative py-16 sm:py-24 bg-white text-slate-900 border-b border-slate-100">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* En-tête Centré Minimaliste & Luxueux */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14 space-y-2">
          <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight text-center font-sans">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-2 mb-10 text-center font-normal">
              {subtitle}
            </p>
          )}
        </div>

        {/* Styles d'animation CSS GPU 60 FPS du Double Carrousel Infini Sens Contraire */}
        <style>{`
          @keyframes nanaGlowScrollLeft {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          @keyframes nanaGlowScrollRight {
            0% { transform: translate3d(-50%, 0, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          .nana-glow-track-left {
            animation: nanaGlowScrollLeft var(--carousel-duration, 40s) linear infinite;
          }
          .nana-glow-track-right {
            animation: nanaGlowScrollRight var(--carousel-duration, 40s) linear infinite;
          }
          .nana-glow-track-left:hover,
          .nana-glow-track-right:hover {
            animation-play-state: paused !important;
          }
        `}</style>

        {enableCounterCarousel ? (
          /* MODE DOUBLE CARROUSEL INFINI SENS CONTRAIRE (Couches de 5 Produits ⬅️ / ➡️) */
          <div className="space-y-8 sm:space-y-10 overflow-hidden w-full py-2">
            {carouselRows.map((rowProducts, rIdx) => {
              const isGoingLeft = rIdx % 2 === 0;
              const animationClass = isGoingLeft ? 'nana-glow-track-left' : 'nana-glow-track-right';
              const duplicatedItems = [...rowProducts, ...rowProducts];

              return (
                <div key={rIdx} className="w-full overflow-hidden relative">
                  <div 
                    className={`flex gap-6 sm:gap-7 w-max will-change-transform ${animationClass}`}
                    style={{ '--carousel-duration': carouselDuration } as React.CSSProperties}
                  >
                    {duplicatedItems.map((product, pIdx) => 
                      renderCosmeticsCard(product, `${product.id}-row-${rIdx}-item-${pIdx}`, true)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODE GRILLE STATIQUE CLASSIQUE */
          <div className={`grid ${gridColsClass} gap-7 items-start`}>
            {displayProducts.map((product, pIdx) => 
              renderCosmeticsCard(product, product.id || pIdx, false)
            )}
          </div>
        )}

      </div>

      {/* Toast Feedback Temporaire */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200 border border-slate-700 select-none">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </section>
  );
};

export default GlowingCosmeticsGrid;
