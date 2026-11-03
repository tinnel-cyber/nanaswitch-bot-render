import React, { useState, useMemo } from 'react';
import { 
  Eye, 
  Play, 
  Sparkles, 
  Check, 
  ArrowRight,
  Video,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { CustomSectionInstance } from '../../../../types';
import { StoreProductItem } from './types';
import { MoodStyleConfig } from '../../../../themes/blankCustom/moodStyles';
import { AdminProductQuickBar } from './AdminProductQuickBar';
import { getSmartShortDescription } from './AdaptiveProductRichText';
import { playTapBeep } from '../../../../utils/audio';

export interface DigitalSquareGridProps {
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

// Couvertures Vectorielles 1080x1080 Haute Définition pour Produits Numériques & Formations
const EBOOK_SQUARE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%231E3A8A"/>
      <stop offset="50%" stop-color="%232563EB"/>
      <stop offset="100%" stop-color="%230F172A"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23FDE047"/>
      <stop offset="100%" stop-color="%23F59E0B"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="30" stdDeviation="35" flood-color="%23000000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(%23bgGrad)"/>
  <circle cx="540" cy="540" r="480" fill="none" stroke="%233B82F6" stroke-width="2" opacity="0.3"/>
  <circle cx="540" cy="540" r="420" fill="none" stroke="%2360A5FA" stroke-width="1.5" stroke-dasharray="10 15" opacity="0.4"/>
  <g transform="translate(340, 180)" filter="url(%23shadow)">
    <rect x="0" y="0" width="400" height="620" rx="16" fill="%23FFFFFF"/>
    <rect x="20" y="20" width="360" height="580" rx="12" fill="%230F172A"/>
    <rect x="50" y="60" width="300" height="28" rx="6" fill="%232563EB"/>
    <text x="200" y="80" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="%23FFFFFF" letter-spacing="4" text-anchor="middle">BEST-SELLER AFRIQUE</text>
    <text x="200" y="160" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="%2393C5FD" text-anchor="middle">E-BOOK OFFICIEL</text>
    <text x="200" y="215" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="url(%23goldGrad)" text-anchor="middle">RÉUSSIR SON</text>
    <text x="200" y="265" font-family="system-ui, sans-serif" font-size="40" font-weight="900" fill="%23FFFFFF" text-anchor="middle">BUSINESS</text>
    <text x="200" y="315" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="%2360A5FA" text-anchor="middle">EN AFRIQUE</text>
    <circle cx="200" cy="420" r="60" fill="%231E3A8A"/>
    <text x="200" y="428" font-family="system-ui, sans-serif" font-size="32" font-weight="900" fill="%23FFFFFF" text-anchor="middle">100%</text>
    <text x="200" y="450" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="%2393C5FD" text-anchor="middle">PRATIQUE</text>
    <rect x="60" y="520" width="280" height="40" rx="20" fill="%232563EB"/>
    <text x="200" y="546" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="%23FFFFFF" text-anchor="middle">TÉLÉCHARGEMENT IMMÉDIAT</text>
  </g>
  <text x="540" y="940" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="%2393C5FD" text-anchor="middle" letter-spacing="2">ACADÉMIE NANASORE • ACCÈS À VIE</text>
</svg>`;

const MASTERCLASS_SQUARE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgMaster" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23020617"/>
      <stop offset="60%" stop-color="%230F172A"/>
      <stop offset="100%" stop-color="%231E3A8A"/>
    </linearGradient>
    <filter id="lapShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="30" stdDeviation="35" flood-color="%23000000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(%23bgMaster)"/>
  <rect x="60" y="60" width="960" height="960" rx="36" fill="none" stroke="%232563EB" stroke-width="4" opacity="0.3"/>
  <g transform="translate(190, 200)" filter="url(%23lapShadow)">
    <rect x="0" y="0" width="700" height="440" rx="28" fill="%230F172A" stroke="%23334155" stroke-width="5"/>
    <circle cx="350" cy="22" r="6" fill="%2364748B"/>
    <rect x="25" y="45" width="650" height="365" rx="16" fill="%23020617"/>
    <rect x="50" y="70" width="380" height="240" rx="12" fill="%231E293B"/>
    <circle cx="240" cy="190" r="42" fill="%232563EB"/>
    <polygon points="230,172 260,190 230,208" fill="%23FFFFFF"/>
    <text x="50" y="340" font-family="system-ui, sans-serif" font-size="20" font-weight="900" fill="%23FFFFFF">MASTERCLASS E-COMMERCE &amp; VENTE</text>
    <text x="50" y="375" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="%2338BDF8">Module 01 • Lancement &amp; Mobile Money Cash</text>
    <rect x="450" y="70" width="200" height="290" rx="12" fill="%230F172A" stroke="%231E293B" stroke-width="2"/>
    <rect x="470" y="90" width="160" height="18" rx="9" fill="%2338BDF8"/>
    <rect x="470" y="125" width="160" height="10" rx="5" fill="%23475569"/>
    <rect x="470" y="145" width="120" height="10" rx="5" fill="%23475569"/>
    <rect x="470" y="180" width="160" height="50" rx="12" fill="%232563EB"/>
    <text x="550" y="212" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="%23FFFFFF" text-anchor="middle">ACCÈS À VIE</text>
    <path d="M-60,450 L760,450 L700,500 L0,500 Z" fill="%23475569"/>
    <rect x="260" y="455" width="180" height="10" rx="5" fill="%23334155"/>
  </g>
  <text x="540" y="870" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="%23FFFFFF" text-anchor="middle">FORMATION 100% VIDÉO HD</text>
  <text x="540" y="920" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="%2360A5FA" text-anchor="middle">12 Modules Pratiques • Certificat Officiel</text>
</svg>`;

const WEBINAR_SQUARE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgWebinar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%231E1B4B"/>
      <stop offset="50%" stop-color="%231D4ED8"/>
      <stop offset="100%" stop-color="%230284C7"/>
    </linearGradient>
    <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="25" stdDeviation="30" flood-color="%23000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(%23bgWebinar)"/>
  <g transform="translate(140, 140)" filter="url(%23cardGlow)">
    <rect x="0" y="0" width="800" height="800" rx="36" fill="%230F172A" stroke="%2338BDF8" stroke-width="4"/>
    <rect x="40" y="40" width="720" height="110" rx="20" fill="%23DC2626"/>
    <circle cx="100" cy="95" r="16" fill="%23FFFFFF"/>
    <text x="140" y="103" font-family="system-ui, sans-serif" font-size="36" font-weight="900" fill="%23FFFFFF">EN DIRECT : LIVE &amp; WEBINAIRE EXCLUSIF</text>
    <text x="400" y="240" font-family="system-ui, sans-serif" font-size="44" font-weight="900" fill="%23FFFFFF" text-anchor="middle">TUNNEL DE VENTE IA</text>
    <text x="400" y="300" font-family="system-ui, sans-serif" font-size="38" font-weight="900" fill="%23FDE047" text-anchor="middle">&amp; MOBILE MONEY AFRIQUE</text>
    <rect x="100" y="360" width="600" height="260" rx="20" fill="%231E293B"/>
    <circle cx="400" cy="490" r="55" fill="%232563EB"/>
    <polygon points="388,465 425,490 388,515" fill="%23FFFFFF"/>
    <rect x="80" y="660" width="640" height="80" rx="24" fill="%232563EB"/>
    <text x="400" y="712" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="%23FFFFFF" text-anchor="middle">REJOINDRE LA SESSION EN 1 CLIC</text>
  </g>
</svg>`;

const CANVA_PACK_SQUARE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgCanvaPack" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23312E81"/>
      <stop offset="50%" stop-color="%232563EB"/>
      <stop offset="100%" stop-color="%230D9488"/>
    </linearGradient>
    <filter id="packShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="30" stdDeviation="35" flood-color="%23000000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(%23bgCanvaPack)"/>
  <g transform="translate(190, 160)" filter="url(%23packShadow)">
    <rect x="0" y="0" width="700" height="760" rx="36" fill="%23FFFFFF"/>
    <rect x="25" y="25" width="650" height="710" rx="24" fill="%230F172A"/>
    <rect x="60" y="60" width="580" height="50" rx="12" fill="%230D9488"/>
    <text x="350" y="95" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="%23FFFFFF" text-anchor="middle">PACK RESSOURCES &amp; LOGICIELS</text>
    <text x="350" y="210" font-family="system-ui, sans-serif" font-size="52" font-weight="900" fill="%2338BDF8" text-anchor="middle">50+ TEMPLATES</text>
    <text x="350" y="275" font-family="system-ui, sans-serif" font-size="44" font-weight="900" fill="%23FBBF24" text-anchor="middle">CANVA &amp; NOTION PRO</text>
    <text x="350" y="335" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="%23E2E8F0" text-anchor="middle">Posts, Story, Affiches &amp; Tableaux de bord</text>
    <g transform="translate(110, 390)">
      <rect x="0" y="0" width="220" height="180" rx="16" fill="%231E293B" stroke="%2338BDF8" stroke-width="2"/>
      <text x="110" y="80" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="%23FFFFFF" text-anchor="middle">CANVA</text>
      <text x="110" y="120" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="%2338BDF8" text-anchor="middle">Prêt à l'emploi</text>
      <rect x="260" y="0" width="220" height="180" rx="16" fill="%231E293B" stroke="%23FBBF24" stroke-width="2"/>
      <text x="370" y="80" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="%23FFFFFF" text-anchor="middle">NOTION</text>
      <text x="370" y="120" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="%23FBBF24" text-anchor="middle">E-commerce OS</text>
    </g>
    <rect x="60" y="615" width="580" height="70" rx="20" fill="%232563EB"/>
    <text x="350" y="660" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="%23FFFFFF" text-anchor="middle">TÉLÉCHARGER LE PACK COMPLET</text>
  </g>
</svg>`;

// 4 Produits numériques par défaut de qualité professionnelle (1080x1080 carrés)
const FALLBACK_DIGITAL_PRODUCTS: StoreProductItem[] = [
  {
    id: 'dig-ebook-01',
    name: 'E-Book Officiel : Réussir son Business & E-commerce en Afrique',
    price: 15000,
    originalPrice: 35000,
    badge: 'Best-Seller',
    category: 'E-Books & Guides',
    image: EBOOK_SQUARE_SVG,
    images: [EBOOK_SQUARE_SVG, MASTERCLASS_SQUARE_SVG],
    stock: 999,
    shortDescription: 'Le guide complet de 180 pages pour créer, lancer et rentabiliser votre activité en Afrique subsaharienne.',
    keyFeatures: [
      'Téléchargement immédiat en PDF haute définition',
      'Exemples concrets & cas d\'études locaux (Côte d\'Ivoire, Sénégal, Cameroun)',
      'Guide pas-à-pas de négociation avec les fournisseurs',
      'Fiches pratiques et simulateur de rentabilité inclus'
    ]
  },
  {
    id: 'dig-masterclass-02',
    name: 'Masterclass Vidéo : Vente & Live Shopping Pro 2026',
    price: 45000,
    originalPrice: 90000,
    badge: 'Formation Vidéo',
    category: 'Formations & Cours',
    image: MASTERCLASS_SQUARE_SVG,
    images: [MASTERCLASS_SQUARE_SVG, WEBINAR_SQUARE_SVG],
    stock: 999,
    shortDescription: '12 heures de formation vidéo pour maîtriser les lives shopping, la conversion rapide et la fidélisation.',
    keyFeatures: [
      'Accès illimité à vie sur mobile, tablette et PC',
      '12 modules vidéo ultra-pratiques et concrets',
      'Certificat d\'achèvement avec vérification QR Code',
      'Accès au groupe privé VIP d\'entraide WhatsApp'
    ]
  },
  {
    id: 'dig-webinar-03',
    name: 'Webinaire Live : Tunnels de Vente IA & Mobile Money 1-to-1',
    price: 25000,
    originalPrice: 50000,
    badge: '🔴 Live Shopping',
    category: 'Webinaires & Lives',
    image: WEBINAR_SQUARE_SVG,
    images: [WEBINAR_SQUARE_SVG, CANVA_PACK_SQUARE_SVG],
    stock: 50,
    shortDescription: 'Session interactive en direct de 3 heures avec session Q&A et audit personnalisé de votre boutique en direct.',
    keyFeatures: [
      'Lien de connexion direct envoyé immédiatement par SMS & Email',
      'Replay intégral disponible 24h/24 après la session',
      'Audit en direct de votre offre par notre formateur expert',
      'Support de présentation complet téléchargeable'
    ]
  },
  {
    id: 'dig-pack-canva-04',
    name: 'Pack VIP : 50+ Templates Canva & Notion E-Commerce OS',
    price: 20000,
    originalPrice: 40000,
    badge: 'Logiciels & Outils',
    category: 'Logiciels & E-Books',
    image: CANVA_PACK_SQUARE_SVG,
    images: [CANVA_PACK_SQUARE_SVG, EBOOK_SQUARE_SVG],
    stock: 999,
    shortDescription: 'La boîte à outils graphique ultime pour créer des visuels percutants et gérer vos stocks sans compétences techniques.',
    keyFeatures: [
      'Templates Canva 100% modifiables en 1 clic',
      'Modèle Notion complet de gestion de stock et caisse',
      'Scripts de vente WhatsApp prêts à copier-coller',
      'Mises à jour gratuites à vie de la bibliothèque'
    ]
  }
];

export const DigitalSquareGrid: React.FC<DigitalSquareGridProps> = ({
  section,
  moodStyle,
  buttonRadiusClass = 'rounded-xl',
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
  // 1. Déclaration stricte de tous les hooks en haut du composant
  const cfg = section.settings || section.config || {};
  const title = section.title || cfg.title || '🎓 Nos Formations, Webinaires & Produits Numériques';
  const subtitle = section.subtitle || cfg.subtitle || 'Accédez immédiatement à nos masterclasses, affiches de lives et e-books exclusifs';
  const columns = Number(cfg.columns) || 3;
  const enableCounterCarousel = cfg.enableCounterCarousel !== false;

  const [activeCategory, setActiveCategory] = useState<string>(cfg.category || 'Tous les produits');

  const displayProducts = useMemo(() => {
    let list: StoreProductItem[] = [];
    if (products && products.length > 0) {
      list = products.filter(p => {
        if (!activeCategory || activeCategory === 'Tous les produits') return true;
        return p.category === activeCategory;
      });
    }

    if (list.length === 0) {
      list = FALLBACK_DIGITAL_PRODUCTS.filter(p => {
        if (!activeCategory || activeCategory === 'Tous les produits') return true;
        return p.category === activeCategory;
      });
    }

    if (list.length === 0) {
      list = FALLBACK_DIGITAL_PRODUCTS;
    }

    return list;
  }, [products, activeCategory]);

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
  }, [displayProducts, cfg.carouselRowsCount]);

  const gridColsClass = useMemo(() => {
    if (columns === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (columns === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  }, [columns]);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('fr-FR').format(p) + ' F CFA';
  };

  // Résolution du badge de nature numérique
  const resolveProductBadge = (product: StoreProductItem) => {
    if (product.badge && product.badge.trim()) {
      return product.badge;
    }
    if (product.originalPrice && product.originalPrice > product.price) {
      const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
      return `-${discount}% Promo`;
    }
    const cat = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    if (cat.includes('formation') || name.includes('formation') || name.includes('masterclass')) {
      return '🎓 Formation / Masterclass';
    }
    if (cat.includes('live') || name.includes('live') || name.includes('webinaire')) {
      return '🔴 Live Shopping';
    }
    if (cat.includes('book') || name.includes('book') || cat.includes('logiciel') || name.includes('logiciel')) {
      return '💻 Logiciel / E-book';
    }
    return '🎓 Formation / Webinaire';
  };

  const handleCardClick = (product: StoreProductItem) => {
    playTapBeep();
    if (onProductClick) {
      onProductClick(product);
    } else if (onSelectProduct) {
      onSelectProduct(product);
    } else if (onOpenTunnel) {
      onOpenTunnel(product);
    } else if (onPreviewFunnel) {
      onPreviewFunnel(product);
    }
  };

  // Rendu unitaire d'une carte d'affiche 1080 x 1080
  const renderDigitalCard = (product: StoreProductItem, keyIndex: string | number, isCarousel: boolean = false) => {
    const badgeText = resolveProductBadge(product);
    const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);

    return (
      <div
        key={keyIndex}
        className={`bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 relative group flex flex-col justify-between ${
          isCarousel ? 'w-[280px] sm:w-[320px] shrink-0' : 'w-full'
        }`}
      >
        {/* Barre admin studio */}
        <AdminProductQuickBar
          product={product}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
          onEditProduct={onEditProduct}
        />

        {/* 1. Cadre Strict 1080 x 1080 (Aspect Square) de l'Affiche */}
        <div 
          onClick={() => handleCardClick(product)}
          className="aspect-square w-full bg-slate-50 relative overflow-hidden flex items-center justify-center cursor-pointer select-none"
        >
          {/* Affiche Haute Définition */}
          <img
            src={product.image || EBOOK_SQUARE_SVG}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />

          {/* Badge Bleu & Blanc en Haut à Gauche */}
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <span>{badgeText}</span>
            </span>
          </div>

          {/* Icône Play Vidéo au Survol (Aperçu Vidéo) */}
          <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white border-2 border-white shadow-xl flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 fill-white ml-0.5" />
            </div>
            <span className="text-[11px] font-bold text-white bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow">
              ▶️ Aperçu Vidéo &amp; Détails
            </span>
          </div>
        </div>

        {/* 2. Bas de l'Affiche (Informations & Action Directe) */}
        <div className="p-4 bg-white border-t border-blue-50 flex-1 flex flex-col justify-between">
          <div>
            {/* Titre du Produit */}
            <h3 
              onClick={() => handleCardClick(product)}
              className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer"
              title={product.name}
            >
              {product.name}
            </h3>

            {/* Courte Description */}
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
              {getSmartShortDescription(product, 90)}
            </p>

            {/* Prix en Bleu Royal Gras */}
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-lg font-extrabold text-blue-600">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(product.originalPrice!)}
                </span>
              )}
            </div>
          </div>

          {/* Bouton Pleine Largeur : 👁️ Voir & Acheter */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick(product);
            }}
            className={`w-full mt-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm py-3 px-4 ${buttonRadiusClass} shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer`}
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>Voir &amp; Acheter</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="w-full py-10 sm:py-14 bg-white text-slate-900 overflow-hidden relative">
      <style>{`
        @keyframes nanaDigitalScrollLeft {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes nanaDigitalScrollRight {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .nana-digital-track-left {
          animation: nanaDigitalScrollLeft var(--nana-digital-duration, 40s) linear infinite;
          will-change: transform;
        }
        .nana-digital-track-right {
          animation: nanaDigitalScrollRight var(--nana-digital-duration, 40s) linear infinite;
          will-change: transform;
        }
        .nana-digital-track-left:hover,
        .nana-digital-track-right:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête Centré de la Grille Numérique */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3 shadow-xs">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>FORMATION, WEBINAIRES &amp; LOGICIELS 1080×1080</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h2>

          {subtitle && (
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              {subtitle}
            </p>
          )}

          {/* Filtres par Catégorie si disponibles */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {['Tous les produits', ...categories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveCategory(cat);
                  }}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CONTENU : SOIT LE DOUBLE / MULTI-CARROUSEL INFINI À SENS CONTRAIRE (PAR COUCHES DE 5) */}
        {enableCounterCarousel && carouselRows.length > 0 ? (
          <div 
            className="space-y-6 sm:space-y-8 overflow-hidden select-none"
            style={{ '--nana-digital-duration': carouselDuration } as React.CSSProperties}
          >
            {carouselRows.map((rowProducts, rowIdx) => {
              const isEven = rowIdx % 2 === 1; // 0 = impair (gauche), 1 = pair (droite)
              const duplicatedItems = [...rowProducts, ...rowProducts];

              return (
                <div key={rowIdx} className="overflow-hidden w-full py-1">
                  <div
                    className={`flex gap-6 w-max ${
                      isEven ? 'nana-digital-track-right' : 'nana-digital-track-left'
                    }`}
                  >
                    {duplicatedItems.map((prod, itemIdx) =>
                      renderDigitalCard(prod, `row-${rowIdx}-item-${itemIdx}-${prod.id}`, true)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* SOIT LA GRILLE STATIQUE RESPONSIVE CLASSIQUE */
          <div className={`grid gap-6 ${gridColsClass}`}>
            {displayProducts.map((prod, idx) =>
              renderDigitalCard(prod, `static-${prod.id}-${idx}`, false)
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default DigitalSquareGrid;
