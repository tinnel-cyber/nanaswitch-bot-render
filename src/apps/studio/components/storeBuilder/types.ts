export type StoreBlockType = 
  | 'hero_banner'
  | 'announcement_marquee'
  | 'promo_carousel'
  | 'products_section'
  | 'reassurance_reviews';

export interface StoreBlock {
  id: string;
  type: StoreBlockType;
  title: string;
  visible: boolean;
  content: {
    heading?: string;
    subtext?: string;
    ctaText?: string;
    marqueeText?: string;
    bgColor?: string;
    layoutMode?: 'CAROUSEL' | 'GRID';
    autoplay?: boolean;
    deliveryText?: string;
    paymentText?: string;
    satisfactionText?: string;
    [key: string]: any;
  };
}

export interface StoreProductItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  image?: string;
  stock: number;
  description?: string;
  shortDescription?: string; // Accroche courte 1 à 2 phrases
  richDescription?: string; // Description longue HTML Rich Text
  badge?: string;
  specs?: { label: string; value: string }[];
  isFlashSale?: boolean;
  flashDiscountPercent?: number;
  flashPrice?: number;
  flashEndsAt?: number;
  hasLiveDemo?: boolean;
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  linkedFunnelId?: string | null;
  funnelDisplayMode?: 'drawer' | 'page';
  // Hiérarchie de priorité des tunnels (Funnel Modulaire 12 blocs = Priorité 1, Ultimate Funnel = Priorité 2 conditionnelle)
  hasModularFunnel?: boolean;
  useUltimateFunnel?: boolean;
  modular_funnel?: any;
  ultimate_funnel?: any;
  slug?: string;
  productSlug?: string;
  // Boosters Multi-Thèmes (Metafields Nanasore)
  colorSwatches?: Array<{ name: string; hex: string }>;
  sizeOptions?: string[];
  keyFeatures?: string[];
  routineVideoUrls?: string[];
  videoUrl?: string;
  images?: string[];
  bundleProductIds?: string[];
  bundleDiscountPercent?: number;
  liveLotBadge?: string;
}

export interface StoreConfig {
  storeName: string;
  slug: string;
  customDomain: string;
  primaryColor: string;
  welcomeText: string;
  wPhone: string;
  fbPixelId: string;
  tPixelId: string;
  bannerImage: string;
  logoUrl?: string;
  paymentTickerText?: string;
  tickerBgGradient?: string;
  showPaymentTicker?: boolean;
  promoBanners: string[];
  layoutBlocks: StoreBlock[];
  theme?: 'light' | 'dark';
  // Architecture Multi-Thèmes (Layouts structurels e-commerce)
  active_theme_id?: string;
  // Annuaire Public (NaNa Market)
  isListedInDirectory?: boolean;
  merchantType?: 'physical_store' | 'digital_creator' | 'event_host';
  category?: string;
  searchTags?: string[];
  quarter?: string;
}

export const DEFAULT_LAYOUT_BLOCKS: StoreBlock[] = [
  {
    id: 'block_hero',
    type: 'hero_banner',
    title: 'Bannière Héroïque & Slogan',
    visible: true,
    content: {
      heading: 'Commandez en ligne et recevez votre livraison en 30 min !',
      subtext: 'Produits frais, épicerie fine et articles du quotidien au meilleur prix.',
      ctaText: 'Commander sur Wameet Direct',
      bgColor: '#4f46e5'
    }
  },
  {
    id: 'block_marquee',
    type: 'announcement_marquee',
    title: 'Bandeau Défilant (Annonce Flash)',
    visible: true,
    content: {
      marqueeText: '⚡ PROMO FLASH : Livraison offerte dès 10 000 F CFA aujourd\'hui ! • Nouveaux arrivages en stock ! • Paiement Wave & Orange Money acceptés.',
      bgColor: '#ea580c'
    }
  },
  {
    id: 'block_promos',
    type: 'promo_carousel',
    title: 'Carrousel d\'Affiches Publicitaires',
    visible: true,
    content: {
      autoplay: true
    }
  },
  {
    id: 'block_products',
    type: 'products_section',
    title: 'Rayons Produits & Catalogue',
    visible: true,
    content: {
      layoutMode: 'CAROUSEL', // 'CAROUSEL' ou 'GRID'
      heading: 'Nos Produits Vedettes & Promotions',
      subtext: 'Défilement fluide par catégorie'
    }
  },
  {
    id: 'block_reassurance',
    type: 'reassurance_reviews',
    title: 'Garanties & Réassurance Marchande',
    visible: true,
    content: {
      deliveryText: 'Livraison express à domicile ou au bureau sous 30 minutes',
      paymentText: 'Règlement sécurisé à la livraison : Espèces, Wave ou Orange Money',
      satisfactionText: 'Plus de 500 commerçants et familles satisfaits chaque mois'
    }
  }
];

export default DEFAULT_LAYOUT_BLOCKS;
