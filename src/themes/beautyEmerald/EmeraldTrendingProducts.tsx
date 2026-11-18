import React, { useState, useMemo } from 'react';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { EmeraldProductCard, BeautyColorSwatch } from './EmeraldProductCard';
import { playTapBeep } from '../../utils/audio';
import {
  BEAUTY_SPRAY_SAGE_SVG,
  BEAUTY_SPRAY_BLUE_SVG,
  BEAUTY_SPRAY_ROSE_SVG,
  BEAUTY_SPRAY_PEACH_SVG,
  BEAUTY_FLACON_SERUM_SVG,
  BEAUTY_FLACON_CREAM_SVG,
  BEAUTY_FLACON_PARFUM_SVG,
  BEAUTY_HERO_PODIUM_FLACONS_SVG
} from './beautyEmeraldAssets';

export type TrendingTabType = 'new' | 'bestsellers' | 'sale';

interface TrendingProductExtended extends StoreProductItem {
  tabTypes?: TrendingTabType[];
  colorSwatches?: BeautyColorSwatch[];
}

// 4 Flacons exacts de la maquette Image 1 & 2 + 4 soins haute couture pour une grille 4 colonnes parfaite
export const DEFAULT_TRENDING_BEAUTY_PRODUCTS: TrendingProductExtended[] = [
  {
    id: 'trending-smooth-essen',
    name: 'Smooth Essen',
    price: 16000,
    originalPrice: undefined,
    category: 'Brume & Soin',
    image: BEAUTY_SPRAY_SAGE_SVG,
    rating: 5.0,
    reviewCount: 42,
    stock: 28,
    tabTypes: ['new', 'bestsellers'],
    colorSwatches: [
      { id: 'se-1', name: 'Rouge Écarlate', hex: '#D9381E' },
      { id: 'se-2', name: 'Noir Carbone', hex: '#111C18' },
      { id: 'se-3', name: 'Jaune Solaire', hex: '#F2B84B' },
      { id: 'se-4', name: 'Nude Poudré', hex: '#E5D0C0' }
    ]
  },
  {
    id: 'trending-urban-decay',
    name: 'Urban Decay',
    price: 20000,
    originalPrice: undefined,
    category: 'Fixateur Minéral',
    image: BEAUTY_SPRAY_BLUE_SVG,
    rating: 5.0,
    reviewCount: 35,
    stock: 15,
    tabTypes: ['new', 'bestsellers'],
    colorSwatches: [
      { id: 'ud-1', name: 'Noir Ébène', hex: '#111C18' },
      { id: 'ud-2', name: 'Jaune Citron', hex: '#F7E247' },
      { id: 'ud-3', name: 'Bleu Royal', hex: '#1E56A0' }
    ]
  },
  {
    id: 'trending-smoothing-essence',
    name: 'Smoothing Essence',
    price: 27000,
    originalPrice: 28500,
    category: 'Essence Lissante',
    image: BEAUTY_SPRAY_ROSE_SVG,
    rating: 5.0,
    reviewCount: 49,
    stock: 8,
    tabTypes: ['bestsellers', 'sale'],
    colorSwatches: [
      { id: 'se2-1', name: 'Rose Poudré', hex: '#BD868D' },
      { id: 'se2-2', name: 'Blanc Soie', hex: '#FFFFFF' },
      { id: 'se2-3', name: 'Or Champagne', hex: '#C59B27' }
    ]
  },
  {
    id: 'trending-red-lipstick',
    name: 'Red Lipstick',
    price: 19500,
    originalPrice: undefined,
    category: 'Teint & Lèvres',
    image: BEAUTY_SPRAY_PEACH_SVG,
    rating: 5.0,
    reviewCount: 29,
    stock: 22,
    tabTypes: ['new', 'bestsellers'],
    colorSwatches: [
      { id: 'rl-1', name: 'Pêche Veloutée', hex: '#DF956C' },
      { id: 'rl-2', name: 'Corail Doux', hex: '#E56B55' },
      { id: 'rl-3', name: 'Rouge Rubis', hex: '#B82B38' },
      { id: 'rl-4', name: 'Bordeaux Mystique', hex: '#6A1D2F' }
    ]
  },
  {
    id: 'trending-serum-c',
    name: 'Sérum C+ Éclat Pur',
    price: 18500,
    originalPrice: 24000,
    category: 'Sérums',
    image: BEAUTY_FLACON_SERUM_SVG,
    rating: 5.0,
    reviewCount: 38,
    stock: 19,
    tabTypes: ['new', 'sale'],
    colorSwatches: [
      { id: 'sc-1', name: 'Émeraude Végétal', hex: '#0F4C3A' },
      { id: 'sc-2', name: 'Or Pur', hex: '#C59B27' }
    ]
  },
  {
    id: 'trending-creme-royale',
    name: 'Crème Royale Nuit',
    price: 22000,
    originalPrice: 28000,
    category: 'Soins Visage',
    image: BEAUTY_FLACON_CREAM_SVG,
    rating: 4.9,
    reviewCount: 52,
    stock: 14,
    tabTypes: ['bestsellers', 'sale'],
    colorSwatches: [
      { id: 'cr-1', name: 'Porcelaine Chaude', hex: '#EFECE6' },
      { id: 'cr-2', name: 'Bronze Satin', hex: '#5C4B41' }
    ]
  },
  {
    id: 'trending-extrait-oud',
    name: 'Extrait Pur Oud & Rose',
    price: 35000,
    originalPrice: 45000,
    category: 'Parfums',
    image: BEAUTY_FLACON_PARFUM_SVG,
    rating: 5.0,
    reviewCount: 31,
    stock: 6,
    tabTypes: ['new', 'bestsellers', 'sale'],
    colorSwatches: [
      { id: 'eo-1', name: 'Ambre Doré', hex: '#D7BA6B' },
      { id: 'eo-2', name: 'Cristal Givré', hex: '#EAF1ED' }
    ]
  },
  {
    id: 'trending-face-cleanser',
    name: 'Nettoyant Fleur d\'Oranger',
    price: 12500,
    originalPrice: 16000,
    category: 'Soins Visage',
    image: BEAUTY_HERO_PODIUM_FLACONS_SVG,
    rating: 4.8,
    reviewCount: 44,
    stock: 35,
    tabTypes: ['new', 'sale'],
    colorSwatches: [
      { id: 'fc-1', name: 'Vert Forêt', hex: '#0F4C3A' },
      { id: 'fc-2', name: 'Crème Vanille', hex: '#EFECE6' }
    ]
  }
];

interface EmeraldTrendingProductsProps {
  realProducts?: StoreProductItem[];
  catalogSubtitle?: string;
  catalogTitle?: string;
  onSelectProduct: (product: StoreProductItem) => void;
  onAddToCart: (product: StoreProductItem, quantity: number) => void;
  onBuyNow?: (product: StoreProductItem, quantity: number) => void;
  onOpenFunnel?: (product: StoreProductItem, e: React.MouseEvent) => void;
  onToggleWishlist?: (product: StoreProductItem, e: React.MouseEvent) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  storeSlug?: string;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
}

export const EmeraldTrendingProducts: React.FC<EmeraldTrendingProductsProps> = ({
  realProducts,
  catalogSubtitle,
  catalogTitle,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onOpenFunnel,
  onToggleWishlist,
  isPublicView,
  isAdminPreview,
  storeSlug,
  onEditProduct,
  onPreviewFunnel
}) => {
  const [activeTab, setActiveTab] = useState<TrendingTabType>('new');

  // Détermine la liste source de produits
  const sourceProducts: TrendingProductExtended[] = useMemo(() => {
    if (realProducts && realProducts.length > 0) {
      return realProducts.map((p, index) => {
        const hasDiscount = Boolean(p.originalPrice && p.originalPrice > p.price);
        const mappedSwatches: BeautyColorSwatch[] | undefined = p.colorSwatches
          ? p.colorSwatches.map((s, sIdx) => ({
              id: (s as any).id || `swatch-${p.id}-${sIdx}`,
              name: s.name,
              hex: s.hex
            }))
          : undefined;
        return {
          ...p,
          colorSwatches: mappedSwatches,
          tabTypes: hasDiscount 
            ? ['sale', 'new'] 
            : index % 2 === 0 
            ? ['new', 'bestsellers'] 
            : ['bestsellers']
        };
      });
    }
    return DEFAULT_TRENDING_BEAUTY_PRODUCTS;
  }, [realProducts]);

  // Filtrage selon l'onglet actif
  const displayedProducts = useMemo(() => {
    return sourceProducts.filter(p => {
      if (activeTab === 'new') return p.tabTypes?.includes('new') || !p.tabTypes;
      if (activeTab === 'bestsellers') return p.tabTypes?.includes('bestsellers') || !p.tabTypes;
      if (activeTab === 'sale') return p.tabTypes?.includes('sale') || Boolean(p.originalPrice && p.originalPrice > p.price);
      return true;
    });
  }, [sourceProducts, activeTab]);

  const handleTabChange = (tab: TrendingTabType) => {
    playTapBeep();
    setActiveTab(tab);
  };

  return (
    <section className="beauty-trending-section" aria-label="Produits Tendances">
      
      {/* ================= 1. EN-TÊTE DE SECTION & ONGLETS MINIMALISTES ================= */}
      <div className="beauty-trending-header">
        
        {/* Accroche : Bodoni Moda italique Or Champagne (#C59B27) */}
        <span className="emerald-eyebrow">
          {catalogSubtitle || 'Nouvelle Saison'}
        </span>

        {/* Grand Titre : Syne 800 (36px, #111C18) */}
        <h2 className="beauty-trending-title">
          {catalogTitle || 'Produits Tendances'}<span className="text-[#C59B27]">.</span>
        </h2>

        {/* Barre de 3 onglets centrés en Outfit (16px) séparés par | (#DDD) */}
        <nav aria-label="Filtres de tendances">
          <ul className="beauty-trending-tabs">
            {/* Onglet 1 : Nouveautés */}
            <li>
              <button
                type="button"
                onClick={() => handleTabChange('new')}
                className={`beauty-trending-tab-btn ${activeTab === 'new' ? 'active' : ''}`}
              >
                Nouveautés
              </button>
            </li>

            <li className="beauty-trending-tab-separator" aria-hidden="true">|</li>

            {/* Onglet 2 : Meilleures Ventes */}
            <li>
              <button
                type="button"
                onClick={() => handleTabChange('bestsellers')}
                className={`beauty-trending-tab-btn ${activeTab === 'bestsellers' ? 'active' : ''}`}
              >
                Meilleures Ventes
              </button>
            </li>

            <li className="beauty-trending-tab-separator" aria-hidden="true">|</li>

            {/* Onglet 3 : En Promotion */}
            <li>
              <button
                type="button"
                onClick={() => handleTabChange('sale')}
                className={`beauty-trending-tab-btn ${activeTab === 'sale' ? 'active' : ''}`}
              >
                En Promotion
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* ================= 2. LA GRILLE DE PRODUITS (4 Colonnes Desktop, 2 Mobile) ================= */}
      <div className="beauty-products-grid">
        {displayedProducts.map((product) => (
          <EmeraldProductCard
            key={product.id}
            product={product}
            swatches={product.colorSwatches}
            onSelectProduct={onSelectProduct}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
            onOpenFunnel={onOpenFunnel}
            onToggleWishlist={onToggleWishlist}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            storeSlug={storeSlug}
            onEditProduct={onEditProduct}
            onPreviewFunnel={onPreviewFunnel}
          />
        ))}
      </div>

    </section>
  );
};
