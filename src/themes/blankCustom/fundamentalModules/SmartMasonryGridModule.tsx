import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, ArrowUpDown, Filter, Sparkles, Check, Star } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { AdminProductQuickBar } from '../../../components/storeBuilder/AdminProductQuickBar';
import { triggerOpenFunnel, hasExplicitProductFunnel } from '../../themeUtils';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { addToSmartCart } from '../../../components/storeBuilder/SmartSlideOutCartDrawer';
import { getSmartShortDescription } from '../../../components/storeBuilder/AdaptiveProductRichText';

export interface SmartMasonryGridModuleProps {
  section: CustomSectionInstance;
  moodStyle: MoodStyleConfig;
  buttonRadiusClass: string;
  products: StoreProductItem[];
  categories?: string[];
  storeSlug?: string;
  onBuyNow?: (product: StoreProductItem, quantity?: number) => void;
  onOpenTunnel?: (product: StoreProductItem) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

export const SmartMasonryGridModule: React.FC<SmartMasonryGridModuleProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  products = [],
  categories = [],
  storeSlug = 'boutique',
  onBuyNow,
  onOpenTunnel,
  onPreviewFunnel,
  onSelectProduct,
  onEditProduct,
  isPublicView = false,
  isAdminPreview = false
}) => {
  const cfg = section.settings || section.config || {};

  const title = section.title || cfg.title || "📦 Tout Notre Catalogue";
  const subtitle = section.subtitle || cfg.subtitle || "Parcourez l'ensemble de nos pépites et commandez en 1 clic";
  const columns = Number(cfg.columns) || 3; // 2, 3, or 4
  const cardStyle = cfg.cardStyle || 'bordered'; // 'minimal' | 'bordered' | 'glass'
  const showSearch = cfg.showSearch ?? true;
  const showCategories = cfg.showCategories ?? true;

  const [activeCategory, setActiveCategory] = useState<string>('Tous les produits');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'discount'>('default');

  const effectiveCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const set = new Set<string>(['Tous les produits']);
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [categories, products]);

  const filteredAndSortedProducts = useMemo(() => {
    let list = products.filter(p => {
      const matchCat = activeCategory === 'Tous les produits' || p.category === activeCategory;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (sortBy === 'price_asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'discount') {
      list = [...list].sort((a, b) => {
        const discA = a.originalPrice ? (a.originalPrice - a.price) : 0;
        const discB = b.originalPrice ? (b.originalPrice - b.price) : 0;
        return discB - discA;
      });
    }

    return list;
  }, [products, activeCategory, searchQuery, sortBy]);

  const gridColsClass = useMemo(() => {
    if (columns === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (columns === 4) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  }, [columns]);

  const cardStyleClass = useMemo(() => {
    if (cardStyle === 'minimal') {
      return 'bg-transparent border-none shadow-none hover:opacity-95';
    }
    if (cardStyle === 'glass') {
      return 'bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 shadow-xl';
    }
    return moodStyle.cardBg; // 'bordered' standard
  }, [cardStyle, moodStyle.cardBg]);

  const enableCounterCarousel = cfg.enableCounterCarousel !== false;

  const carouselDuration = useMemo(() => {
    const spd = cfg.carouselSpeed || 'normal';
    if (spd === 'slow') return '55s';
    if (spd === 'fast') return '28s';
    return '40s';
  }, [cfg.carouselSpeed]);

  const carouselRows = useMemo(() => {
    if (filteredAndSortedProducts.length === 0) return [];
    const pool = [...filteredAndSortedProducts];
    while (pool.length < 5) {
      pool.push(...filteredAndSortedProducts);
    }

    const settingRows = cfg.carouselRowsCount;
    let numRows = 2; // Par défaut 2 couches de 5
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
  }, [filteredAndSortedProducts, cfg.carouselRowsCount]);

  const handleProductClick = (product: StoreProductItem) => {
    playTapBeep();
    if (onSelectProduct) {
      onSelectProduct(product);
    } else if (onOpenTunnel) {
      onOpenTunnel(product);
    } else {
      triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
    }
  };

  const handleBuyClick = (product: StoreProductItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (onBuyNow) {
      onBuyNow(product, 1);
    } else {
      handleProductClick(product);
    }
  };

  const handleTunnelClick = (product: StoreProductItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    if (onOpenTunnel) {
      onOpenTunnel(product);
    } else if (onPreviewFunnel) {
      onPreviewFunnel(product);
    } else {
      triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
    }
  };

  const renderProductCard = (product: StoreProductItem, key: string | number, isCarousel = false) => {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount 
      ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
      : 0;

    return (
      <div
        key={key}
        className={`relative rounded-3xl p-4 transition-all duration-300 group flex flex-col justify-between ${cardStyleClass} ${
          isCarousel ? 'w-[270px] sm:w-[310px] shrink-0 select-none' : ''
        }`}
      >
        <AdminProductQuickBar
          product={product}
          storeSlug={storeSlug}
          onEditProduct={onEditProduct}
          onPreviewFunnel={onPreviewFunnel}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />

        <div>
          {/* Image Produit */}
          <div 
            onClick={() => handleProductClick(product)}
            className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-pointer mb-3 group/img"
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transform group-hover/img:scale-106 transition-transform duration-500"
              loading="lazy"
              decoding="async"
            />

            {/* Badges promo / bestsellers */}
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
              {hasDiscount && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] shadow">
                  -{discountPercent}%
                </span>
              )}
              {product.badge && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] shadow">
                  {product.badge}
                </span>
              )}
            </div>
          </div>

          {/* Titre & Description */}
          <div className="space-y-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${moodStyle.textMuted}`}>
              {product.category || 'Collection'}
            </span>
            <h3 
              onClick={() => handleProductClick(product)}
              className={`text-sm sm:text-base font-bold line-clamp-2 cursor-pointer group-hover:text-blue-600 transition ${moodStyle.textPrimary}`}
              title={product.name}
            >
              {product.name}
            </h3>

            {/* Courte Description (2 lignes max) */}
            {getSmartShortDescription(product, 90) && (
              <p className={`text-xs line-clamp-2 leading-relaxed ${moodStyle.textSecondary}`}>
                {getSmartShortDescription(product, 90)}
              </p>
            )}

            {/* Pastilles de Couleurs (colorSwatches Metafields Nanasore) */}
            {product.colorSwatches && product.colorSwatches.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                {product.colorSwatches.map((swatch, sIdx) => (
                  <span
                    key={sIdx}
                    title={swatch.name}
                    className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: swatch.hex }}
                  />
                ))}
                <span className="text-[10px] text-slate-400 font-medium ml-1">
                  {product.colorSwatches.length} tons
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Prix & Bouton Achat Direct */}
        <div className="pt-4 mt-3 border-t border-black/5 flex items-center justify-between gap-2">
          <div>
            <span className={`text-base sm:text-lg font-black ${moodStyle.textPrimary}`}>
              {product.price.toLocaleString('fr-FR')} F
            </span>
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through ml-1.5 font-semibold">
                {product.originalPrice?.toLocaleString('fr-FR')} F
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasExplicitProductFunnel(product) && (
              <button
                type="button"
                onClick={(e) => handleTunnelClick(product, e)}
                className={`px-2 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 ${buttonRadiusClass} font-bold text-[11px] cursor-pointer whitespace-nowrap`}
                title="Voir le tunnel de vente"
              >
                Tunnel
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playValidationBeep();
                addToSmartCart(product, 1);
              }}
              className={`px-2.5 sm:px-3 py-2 ${moodStyle.accentButton} ${buttonRadiusClass} font-black text-[11px] sm:text-xs cursor-pointer flex items-center gap-1 shadow-md whitespace-nowrap`}
              title="Ajouter au panier"
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span>{hasExplicitProductFunnel(product) ? 'Panier' : 'Ajouter au panier'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className={`relative py-14 sm:py-20 ${moodStyle.sectionBg} border-b border-black/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Titre et Intro */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-2">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
            CATALOGUE INTELLIGENT
          </span>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${moodStyle.textPrimary}`}>
            {title}
          </h2>
          <p className={`text-xs sm:text-sm ${moodStyle.textSecondary}`}>
            {subtitle}
          </p>
        </div>

        {/* Barre de Recherche, Filtres & Tri Dynamique */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 max-w-3xl mx-auto">
            {/* Barre de Recherche */}
            {showSearch && (
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, mot-clé..."
                  className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${moodStyle.textPrimary}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>
            )}

            {/* Sélecteur de Tri */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Tri :
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="default">Recommandés</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="discount">Plus fortes remises</option>
              </select>
            </div>
          </div>

          {/* Pilules de Catégories */}
          {showCategories && effectiveCategories.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {effectiveCategories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveCategory(cat);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? `${moodStyle.accentButton} shadow-md`
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Styles d'animation CSS GPU 60 FPS du Double Carrousel Infini Sens Contraire */}
        <style>{`
          @keyframes nanaScrollLeft {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          @keyframes nanaScrollRight {
            0% { transform: translate3d(-50%, 0, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          .nana-counter-track-left {
            animation: nanaScrollLeft var(--carousel-duration, 40s) linear infinite;
          }
          .nana-counter-track-right {
            animation: nanaScrollRight var(--carousel-duration, 40s) linear infinite;
          }
          .nana-counter-track-left:hover,
          .nana-counter-track-right:hover {
            animation-play-state: paused !important;
          }
        `}</style>

        {/* Grille des Produits OU Double Carrousel Infini Sens Contraire */}
        {filteredAndSortedProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <span className="text-4xl block">🔍</span>
            <p className={`text-sm font-bold ${moodStyle.textPrimary}`}>
              Aucun produit ne correspond à vos filtres.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('Tous les produits');
                setSortBy('default');
              }}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Réinitialiser la recherche
            </button>
          </div>
        ) : enableCounterCarousel ? (
          /* MODE DOUBLE CARROUSEL INFINI SENS CONTRAIRE (Couches de 5 Produits ⬅️ / ➡️) */
          <div className="space-y-6 sm:space-y-8 overflow-hidden w-full py-2">
            {carouselRows.map((rowProducts, rIdx) => {
              const isGoingLeft = rIdx % 2 === 0;
              const animationClass = isGoingLeft ? 'nana-counter-track-left' : 'nana-counter-track-right';
              const duplicatedItems = [...rowProducts, ...rowProducts];

              return (
                <div key={rIdx} className="w-full overflow-hidden relative">
                  <div 
                    className={`flex gap-5 sm:gap-6 w-max will-change-transform ${animationClass}`}
                    style={{ '--carousel-duration': carouselDuration } as React.CSSProperties}
                  >
                    {duplicatedItems.map((product, pIdx) => 
                      renderProductCard(product, `${product.id}-row-${rIdx}-item-${pIdx}`, true)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODE GRILLE STATIQUE CLASSIQUE */
          <div className={`grid ${gridColsClass} gap-5 sm:gap-6`}>
            {filteredAndSortedProducts.map((product, pIdx) => 
              renderProductCard(product, product.id || pIdx, false)
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default SmartMasonryGridModule;
