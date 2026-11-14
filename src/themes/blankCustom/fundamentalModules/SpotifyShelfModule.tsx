import React, { useRef, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Play, ShoppingBag, Flame, Sparkles, Zap } from 'lucide-react';
import { CustomSectionInstance } from '../../../types';
import { StoreProductItem } from '../../../components/storeBuilder/types';
import { MoodStyleConfig } from '../moodStyles';
import { AdminProductQuickBar } from '../../../components/storeBuilder/AdminProductQuickBar';
import { LiveEditable } from '../../../components/storeBuilder/LiveEditable';
import { triggerOpenFunnel } from '../../themeUtils';
import { playTapBeep } from '../../../utils/audio';

export interface SpotifyShelfModuleProps {
  section: CustomSectionInstance;
  moodStyle: MoodStyleConfig;
  buttonRadiusClass: string;
  products: StoreProductItem[];
  categories?: string[];
  storeSlug?: string;
  onOpenTunnel?: (product: StoreProductItem) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

export const SpotifyShelfModule: React.FC<SpotifyShelfModuleProps> = ({
  section,
  moodStyle,
  buttonRadiusClass,
  products = [],
  categories = [],
  storeSlug = 'boutique',
  onOpenTunnel,
  onPreviewFunnel,
  onSelectProduct,
  onEditProduct,
  isPublicView = false,
  isAdminPreview = false
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cfg = section.settings || section.config || {};

  const title = section.title || cfg.title || "🎧 Les Incontournables du Moment";
  const subtitle = section.subtitle || cfg.subtitle || "Nos meilleures ventes à portée de main façon playlist Spotify";
  const defaultCategory = cfg.category || 'Tous les produits';

  const [activeCategory, setActiveCategory] = useState<string>(defaultCategory);

  const effectiveCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const set = new Set<string>(['Tous les produits']);
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [categories, products]);

const DEMO_SHELF_PRODUCTS: StoreProductItem[] = [
  {
    id: 'shelf-p1',
    name: "Sérum Botanique Éclat 50ml",
    price: 18500,
    originalPrice: 22000,
    category: "Soins Visage",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
    stock: 15,
    badge: "Bestseller"
  },
  {
    id: 'shelf-p2',
    name: "Huile Précieuse Régénérante",
    price: 14000,
    originalPrice: 17500,
    category: "Sérums",
    image: "https://images.unsplash.com/photo-1608248597359-e93574c8b056?w=600&auto=format&fit=crop&q=80",
    stock: 12,
    badge: "Bio 100%"
  },
  {
    id: 'shelf-p3',
    name: "Crème Hydratante Velours 24h",
    price: 12500,
    originalPrice: 15000,
    category: "Corps",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
    stock: 20,
    badge: "Nouveau"
  },
  {
    id: 'shelf-p4',
    name: "Coffret Spa Prestige 4-en-1",
    price: 35000,
    originalPrice: 45000,
    category: "Coffrets",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80",
    stock: 8,
    badge: "Promo Flash"
  }
];

  const displayProducts = useMemo(() => {
    if (products.length === 0) return DEMO_SHELF_PRODUCTS;
    const list = products.filter(p => {
      if (activeCategory === 'Tous les produits') return true;
      return p.category === activeCategory;
    });
    return list.length > 0 ? list : products.slice(0, 8);
  }, [products, activeCategory]);

  const scroll = (direction: 'left' | 'right') => {
    playTapBeep();
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleProductClick = (product: StoreProductItem) => {
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
    <section className={`relative py-12 sm:py-16 ${moodStyle.sectionBg} border-b border-black/5`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête de la Playlist façon Spotify */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${moodStyle.accentBadge}`}>
                PLAYLIST ÉPINGLÉE • SPOTIFY STYLE
              </span>
            </div>
            <LiveEditable
              label="Titre Rayon Spotify"
              sectionId={section.id}
              sectionField="title"
              value={title}
              isAdminPreview={isAdminPreview}
            >
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${moodStyle.textPrimary}`}>
                {title}
              </h2>
            </LiveEditable>
            <LiveEditable
              label="Sous-titre Rayon Spotify"
              sectionId={section.id}
              sectionField="subtitle"
              value={subtitle}
              isAdminPreview={isAdminPreview}
            >
              <p className={`text-xs sm:text-sm ${moodStyle.textSecondary}`}>
                {subtitle}
              </p>
            </LiveEditable>
          </div>

          {/* Pilules de Catégories Rapides & Flèches en verre dépoli */}
          <div className="flex items-center gap-3">
            {effectiveCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {effectiveCategories.slice(0, 4).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveCategory(cat);
                    }}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                      activeCategory === cat
                        ? `${moodStyle.accentButton} shadow-sm`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Flèches en Verre Dépoli */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="w-9 h-9 rounded-full bg-white/70 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white transition cursor-pointer shadow-sm active:scale-90"
                aria-label="Précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="w-9 h-9 rounded-full bg-white/70 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white transition cursor-pointer shadow-sm active:scale-90"
                aria-label="Suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Rail Horizontal Fluide Défilant */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-5 scrollbar-none snap-x snap-mandatory focus:outline-none -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayProducts.map((product, pIdx) => {
            const hasDiscount = product.originalPrice && product.originalPrice > product.price;
            const discountPercent = hasDiscount 
              ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
              : 0;

            return (
              <div
                key={product.id || pIdx}
                className={`relative shrink-0 w-[230px] sm:w-[250px] snap-start rounded-2xl p-3.5 transition-all duration-300 group ${moodStyle.cardBg} flex flex-col justify-between`}
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
                  {/* Jaquette Album Carrée avec Zoom Doux & Bouton Play Flottant */}
                  <div 
                    onClick={() => handleProductClick(product)}
                    className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer mb-3 group/cover"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transform group-hover/cover:scale-108 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                    />

                    {/* Badge Promo / Bestseller */}
                    {hasDiscount ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] shadow-sm">
                        -{discountPercent}%
                      </span>
                    ) : product.badge ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] shadow-sm">
                        {product.badge}
                      </span>
                    ) : null}

                    {/* Bouton Flottant "▶️ / ⚡ Ouvrir l'Offre" façon Spotify Play Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product);
                      }}
                      className={`absolute bottom-3 right-3 w-11 h-11 ${moodStyle.accentButton} rounded-full shadow-2xl flex items-center justify-center transform translate-y-3 opacity-0 group-hover/cover:translate-y-0 group-hover/cover:opacity-100 transition-all duration-200 cursor-pointer active:scale-90`}
                      title="⚡ Ouvrir l'offre immédiatement"
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </button>
                  </div>

                  {/* Infos Titre, Catégorie & Pastilles */}
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${moodStyle.textMuted}`}>
                      {product.category || 'Rayon Vedette'}
                    </span>
                    <h3 
                      onClick={() => handleProductClick(product)}
                      className={`text-sm font-bold line-clamp-1 group-hover:text-blue-600 transition cursor-pointer ${moodStyle.textPrimary}`}
                      title={product.name}
                    >
                      {product.name}
                    </h3>
                  </div>
                </div>

                {/* Prix & Bouton Achat Direct */}
                <div className="pt-3 mt-2 border-t border-black/5 flex items-center justify-between gap-2">
                  <div>
                    <span className={`text-sm font-black ${moodStyle.textPrimary}`}>
                      {product.price.toLocaleString('fr-FR')} F
                    </span>
                    {hasDiscount && (
                      <span className="text-[10px] text-slate-400 line-through ml-1.5 font-semibold">
                        {product.originalPrice?.toLocaleString('fr-FR')} F
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleProductClick(product)}
                    className={`px-3 py-1.5 ${moodStyle.accentButton} ${buttonRadiusClass} font-bold text-[11px] shrink-0 cursor-pointer flex items-center gap-1 shadow-xs`}
                  >
                    <span>Commander</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SpotifyShelfModule;
