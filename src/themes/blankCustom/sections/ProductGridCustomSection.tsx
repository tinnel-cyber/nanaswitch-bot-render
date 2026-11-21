import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, SlidersHorizontal, Check, Star } from 'lucide-react';
import { CustomThemeSection } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { AdminProductQuickBar } from '../../../components/storeBuilder/AdminProductQuickBar';
import { triggerOpenFunnel, hasExplicitProductFunnel } from '../../themeUtils';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { addToSmartCart } from '../../../components/storeBuilder/SmartSlideOutCartDrawer';

export interface ProductGridCustomSectionProps {
  section: CustomThemeSection;
  mood: MoodStyleConfig;
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
  controlBar?: React.ReactNode;
}

export const ProductGridCustomSection: React.FC<ProductGridCustomSectionProps> = ({
  section,
  mood,
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
  isAdminPreview = false,
  controlBar
}) => {
  const cfg = section.config || {};
  const title = section.title || cfg.title || "📦 Tous Nos Produits";
  const subtitle = section.subtitle || cfg.subtitle || "Parcourez l'ensemble de notre catalogue et commandez en un clic";
  
  const columns = Number(cfg.columns) || 3; // 2, 3, or 4
  const showSearch = cfg.showSearch ?? true;
  const showCategories = cfg.showCategories ?? true;
  const cardStyle = cfg.cardStyle || 'minimal_blue'; // 'minimal_blue' | 'soft_border' | 'compact'

  const [activeCategory, setActiveCategory] = useState<string>('Tous les produits');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const effectiveCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const set = new Set<string>(['Tous les produits']);
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'Tous les produits' || p.category === activeCategory;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

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

  const gridColsClass = useMemo(() => {
    if (columns === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (columns === 4) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'; // 3 cols default
  }, [columns]);

  return (
    <section className={`relative py-14 sm:py-20 ${mood.sectionBg} border-b border-black/5`}>
      {controlBar}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Titre et Intro */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-2">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${mood.accentBadge}`}>
            CATALOGUE COMPLET
          </span>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${mood.textPrimary}`}>
            {title}
          </h2>
          <p className={`text-xs sm:text-sm ${mood.textSecondary}`}>
            {subtitle}
          </p>
        </div>

        {/* Barre de Recherche et Filtres par Catégorie */}
        {(showSearch || showCategories) && (
          <div className="mb-8 space-y-4">
            {showSearch && (
              <div className="max-w-md mx-auto relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un produit, une référence..."
                  className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200/80 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${mood.textPrimary}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Effacer
                  </button>
                )}
              </div>
            )}

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
                          ? `${mood.accentButton} shadow-md`
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
        )}

        {/* Grille des Produits */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-4xl">🔍</p>
            <p className={`text-sm font-bold ${mood.textPrimary}`}>
              Aucun produit ne correspond à votre recherche.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('Tous les produits');
              }}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className={`grid ${gridColsClass} gap-5 sm:gap-6`}>
            {filteredProducts.map((product, pIdx) => {
              const hasDiscount = product.originalPrice && product.originalPrice > product.price;
              const discountPercent = hasDiscount 
                ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
                : 0;

              return (
                <div
                  key={product.id || pIdx}
                  className={`relative rounded-3xl p-4 transition-all duration-300 group flex flex-col justify-between ${mood.cardBg}`}
                >
                  {/* Admin Quick Bar (0ms survol vendeur) */}
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
                      className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-pointer mb-3 group/pic"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transform group-hover/pic:scale-105 transition-transform duration-500"
                        loading="lazy"
                        decoding="async"
                      />

                      {/* Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
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

                    {/* Informations Titre & Catégorie */}
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${mood.textMuted}`}>
                        {product.category || 'Nouveauté'}
                      </span>
                      <h3 
                        onClick={() => handleProductClick(product)}
                        className={`text-sm sm:text-base font-bold line-clamp-2 cursor-pointer group-hover:text-blue-600 transition ${mood.textPrimary}`}
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className={`text-xs line-clamp-2 ${mood.textSecondary}`}>
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prix, Avis & Bouton Achat Direct */}
                  <div className="pt-4 mt-3 border-t border-black/5 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-base sm:text-lg font-black ${mood.textPrimary}`}>
                          {product.price.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                      {hasDiscount && (
                        <span className="text-xs text-slate-400 line-through font-semibold">
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
                        className={`px-2.5 sm:px-3 py-2 ${mood.accentButton} ${buttonRadiusClass} font-black text-[11px] sm:text-xs cursor-pointer flex items-center gap-1 shadow-md whitespace-nowrap`}
                        title="Ajouter au panier"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                        <span>{hasExplicitProductFunnel(product) ? 'Panier' : 'Ajouter au panier'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
