import React, { useState, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Search, X, ChevronRight, Check, Star, 
  ShieldCheck, Zap, MessageCircle, ArrowLeft, Laptop, 
  BookOpen, Sparkles, Download, Layers, Play, Eye, 
  Edit3, Trash2, Share2, Plus, Minus, Lock, CheckCircle2,
  Palette, ShoppingCart, Copy, GraduationCap, User, Flame, ArrowRight
} from 'lucide-react';
import { StudentAuthModal } from '../../components/lms/student/StudentAuthModal';
import { getCurrentStudent, navigateToStudentDashboard } from '../../services/studentAuthService';
import { StoreThemeProps } from '../../types/theme';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { buildPublicShopUrl } from '../../config/domains';
import { AdminSectionEditTrigger } from '../../components/storeBuilder/AdminSectionEditTrigger';
import { AdminProductQuickBar } from '../../components/storeBuilder/AdminProductQuickBar';
import { DigitalWideProductView } from '../../components/storeBuilder/DigitalWideProductView';
import { AdaptiveHeaderEngine } from '../../components/storeBuilder/headers/AdaptiveHeaderEngine';
import { AdaptiveFooterEngine } from '../../components/storeBuilder/footers/AdaptiveFooterEngine';
import { LiveEditable } from '../../components/storeBuilder/LiveEditable';


// =========================================================================
// COUVERTURES VECTORIELLES HD DES PRODUITS DE RÉFÉRENCE (STYLE APPLE / STRIPE)
// Garantit un affichage 100% fidèle au mockup (Image 1 & 2), ultra-net, sans dépendance externe
// =========================================================================

const EBOOK_COVER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bgEbook" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23EEF2FF"/>
      <stop offset="50%" stop-color="%23E0E7FF"/>
      <stop offset="100%" stop-color="%23D8B4FE"/>
    </linearGradient>
    <linearGradient id="coverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%231E3A8A"/>
      <stop offset="50%" stop-color="%232563EB"/>
      <stop offset="100%" stop-color="%231D4ED8"/>
    </linearGradient>
    <filter id="bookShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="8" dy="24" stdDeviation="24" flood-color="%231E1B4B" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="url(%23bgEbook)"/>
  <g transform="translate(295, 35)" filter="url(%23bookShadow)">
    <path d="M-18,14 L0,0 L210,0 L192,14 Z" fill="%233B82F6"/>
    <path d="M-18,14 L0,0 L0,335 L-18,349 Z" fill="%231E3A8A"/>
    <rect x="0" y="0" width="210" height="335" rx="6" fill="url(%23coverGrad)"/>
    <rect x="14" y="14" width="182" height="307" rx="4" fill="%231E40AF"/>
    <text x="105" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="%2393C5FD" letter-spacing="3" text-anchor="middle">BEST-SELLER AFRIQUE</text>
    <rect x="35" y="58" width="140" height="2" fill="%2360A5FA"/>
    <text x="105" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="900" fill="%23FFFFFF" text-anchor="middle">E-BOOK OFFICIEL</text>
    <text x="105" y="122" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="%23FDE047" text-anchor="middle">RÉUSSIR SON</text>
    <text x="105" y="150" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" fill="%23FFFFFF" text-anchor="middle">BUSINESS</text>
    <text x="105" y="176" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="800" fill="%2393C5FD" text-anchor="middle">EN AFRIQUE</text>
    <g transform="translate(60, 200)">
      <circle cx="45" cy="40" r="34" fill="%23F97316"/>
      <path d="M25,55 L45,15 L65,55 Z" fill="%23FBBF24"/>
      <circle cx="45" cy="40" r="16" fill="%2310B981"/>
    </g>
    <rect x="30" y="292" width="150" height="18" rx="9" fill="%230F172A"/>
    <text x="105" y="304" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" fill="%23FFFFFF" text-anchor="middle">TÉLÉCHARGEMENT IMMÉDIAT</text>
  </g>
</svg>`;

const MASTERCLASS_COVER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bgMaster" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23020617"/>
      <stop offset="60%" stop-color="%230F172A"/>
      <stop offset="100%" stop-color="%231E293B"/>
    </linearGradient>
    <filter id="lapShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="25" stdDeviation="30" flood-color="%23000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="url(%23bgMaster)"/>
  <g transform="translate(160, 40)" filter="url(%23lapShadow)">
    <rect x="40" y="10" width="400" height="250" rx="16" fill="%230F172A" stroke="%23334155" stroke-width="3"/>
    <circle cx="240" cy="22" r="3.5" fill="%2364748B"/>
    <rect x="52" y="32" width="376" height="216" rx="8" fill="%23020617"/>
    <rect x="68" y="46" width="220" height="144" rx="8" fill="%231E293B"/>
    <circle cx="178" cy="118" r="26" fill="%230056D2"/>
    <polygon points="172,106 190,118 172,130" fill="%23FFFFFF"/>
    <text x="68" y="210" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="%23FFFFFF">Formation : Masterclass E-commerce</text>
    <text x="68" y="228" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="600" fill="%2338BDF8">Module 01 • Lancement & Paiement Mobile Money</text>
    <rect x="300" y="46" width="116" height="170" rx="8" fill="%230F172A" stroke="%231E293B" stroke-width="1.5"/>
    <rect x="310" y="58" width="96" height="10" rx="5" fill="%2338BDF8"/>
    <rect x="310" y="76" width="96" height="6" rx="3" fill="%23475569"/>
    <rect x="310" y="88" width="70" height="6" rx="3" fill="%23475569"/>
    <rect x="310" y="106" width="96" height="28" rx="6" fill="%230056D2"/>
    <text x="358" y="124" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" fill="%23FFFFFF" text-anchor="middle">ACCÈS À VIE</text>
    <rect x="310" y="146" width="96" height="6" rx="3" fill="%23334155"/>
    <rect x="310" y="158" width="80" height="6" rx="3" fill="%23334155"/>
    <rect x="310" y="170" width="50" height="6" rx="3" fill="%23334155"/>
    <path d="M0,260 L480,260 L445,286 L35,286 Z" fill="%2364748B"/>
    <path d="M195,262 L285,262 L280,268 L200,268 Z" fill="%23475569"/>
  </g>
</svg>`;

const CANVA_COVER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bgCanva" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%236B21A8"/>
      <stop offset="45%" stop-color="%231D4ED8"/>
      <stop offset="100%" stop-color="%230284C7"/>
    </linearGradient>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="%23000000" flood-opacity="0.30"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="url(%23bgCanva)"/>
  <g transform="translate(160, 45)" filter="url(%23cardShadow)">
    <g transform="translate(10, 30) rotate(-6)">
      <rect x="0" y="0" width="130" height="190" rx="12" fill="%23FBBF24"/>
      <rect x="12" y="12" width="106" height="90" rx="8" fill="%23F59E0B"/>
      <rect x="15" y="116" width="90" height="10" rx="5" fill="%2378350F"/>
      <rect x="15" y="134" width="65" height="8" rx="4" fill="%2392400E"/>
    </g>
    <g transform="translate(340, 25) rotate(8)">
      <rect x="0" y="0" width="130" height="190" rx="12" fill="%23EC4899"/>
      <rect x="12" y="12" width="106" height="90" rx="8" fill="%23DB2777"/>
      <rect x="15" y="116" width="90" height="10" rx="5" fill="%23831843"/>
      <rect x="15" y="134" width="70" height="8" rx="4" fill="%239D174D"/>
    </g>
    <rect x="120" y="10" width="240" height="300" rx="18" fill="%23FFFFFF"/>
    <rect x="135" y="25" width="210" height="145" rx="12" fill="%23EEF2FF"/>
    <circle cx="240" cy="95" r="32" fill="%2300C4CC"/>
    <text x="240" y="106" font-family="Georgia, serif" font-size="34" font-weight="900" fill="%23FFFFFF" text-anchor="middle">C</text>
    <text x="240" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" fill="%230F172A" text-anchor="middle">PACK DE TEMPLATES</text>
    <text x="240" y="226" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="%237C3AED" text-anchor="middle">CANVA PRO (300+ VISUELS)</text>
    <text x="240" y="248" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="600" fill="%2364748B" text-anchor="middle">Stories • Posts • Flyers • Bannières</text>
    <rect x="165" y="265" width="150" height="26" rx="13" fill="%237C3AED"/>
    <text x="240" y="282" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="%23FFFFFF" text-anchor="middle">CLIQUEZ %26 ÉDITEZ</text>
  </g>
</svg>`;

const GUIDE_COVER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bgGuide" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23F8FAFC"/>
      <stop offset="50%" stop-color="%23F1F5F9"/>
      <stop offset="100%" stop-color="%23E2E8F0"/>
    </linearGradient>
    <filter id="guideShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="6" dy="22" stdDeviation="24" flood-color="%230F172A" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="url(%23bgGuide)"/>
  <g transform="translate(295, 35)" filter="url(%23guideShadow)">
    <path d="M-16,12 L0,0 L210,0 L194,12 Z" fill="%23CBD5E1"/>
    <path d="M-16,12 L0,0 L0,335 L-16,347 Z" fill="%2394A3B8"/>
    <rect x="0" y="0" width="210" height="335" rx="6" fill="%23FFFFFF" stroke="%23E2E8F0" stroke-width="1.5"/>
    <rect x="25" y="40" width="35" height="4" rx="2" fill="%230056D2"/>
    <text x="25" y="75" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="%2364748B" letter-spacing="2">RAPPORT 2026</text>
    <text x="25" y="115" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="%230F172A">GUIDE COMPLET</text>
    <text x="25" y="145" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" fill="%230056D2">STRATÉGIE</text>
    <text x="25" y="175" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" fill="%230F172A">MARKETING</text>
    <text x="25" y="202" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="%2364748B">DIGITAL</text>
    <path d="M25,250 L65,225 L105,238 L145,190 L180,205" fill="none" stroke="%230056D2" stroke-width="3" stroke-linecap="round"/>
    <circle cx="145" cy="190" r="4.5" fill="%230056D2"/>
    <text x="25" y="285" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="%2394A3B8">ADS • FUNNELS • ROI +420%</text>
    <rect x="25" y="300" width="160" height="16" rx="8" fill="%23F8FAFC" stroke="%23E2E8F0" stroke-width="1"/>
    <text x="105" y="311" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="800" fill="%230056D2" text-anchor="middle">FORMAT PDF INCLUS</text>
  </g>
</svg>`;

// Produits de démonstration par défaut fidèles à l'Image 1
const DEMO_DIGITAL_PRODUCTS: StoreProductItem[] = [
  {
    id: 'demo-ebook-business-afrique',
    name: 'E-book : Réussir son Business en Afrique',
    price: 5000,
    originalPrice: 12000,
    category: 'E-books',
    badge: 'Téléchargement immédiat',
    stock: 999,
    rating: 4.9,
    reviewCount: 36,
    salesCount: 285,
    image: EBOOK_COVER_SVG,
    description: 'Le guide stratégique de 180 pages décryptant les modèles économiques les plus rentables du continent africain avec cas pratiques et contrats prêts à l\'emploi.'
  },
  {
    id: 'demo-masterclass-ecommerce',
    name: 'Formation : Masterclass E-commerce',
    price: 15000,
    originalPrice: 35000,
    category: 'Nos Formations',
    badge: 'Accès à vie',
    stock: 999,
    rating: 5.0,
    reviewCount: 48,
    salesCount: 142,
    image: MASTERCLASS_COVER_SVG,
    description: 'Programme complet pas-à-pas pour lancer et scaler votre boutique en ligne en Afrique avec paiement Mobile Money automatisé et tunnels de conversion sans friction.'
  },
  {
    id: 'demo-templates-canva-pro',
    name: 'Pack de Templates Canva Pro',
    price: 2500,
    originalPrice: 7500,
    category: 'Templates',
    badge: 'Fichiers inclus',
    stock: 999,
    rating: 4.8,
    reviewCount: 52,
    salesCount: 310,
    image: CANVA_COVER_SVG,
    description: '+300 visuels prêts à l\'emploi pour vos réseaux sociaux, stories Instagram, affiches promotionnelles et carrousels publicitaires à fort taux de clic.'
  },
  {
    id: 'demo-guide-marketing-digital',
    name: 'Guide : Stratégie Marketing Digital',
    price: 4000,
    originalPrice: 10000,
    category: 'Guides',
    badge: 'PDF inclus',
    stock: 999,
    rating: 4.9,
    reviewCount: 29,
    salesCount: 174,
    image: GUIDE_COVER_SVG,
    description: 'Méthode pas-à-pas pour acquérir des prospects qualifiés à coût réduit grâce aux publicités Facebook, TikTok et WhatsApp Business.'
  }
];

export const ThemeDigitalPro: React.FC<StoreThemeProps> = (props) => {
  // S'assurer que isAdminPreview est défini (par défaut false si non fourni)
  const isAdminPreview = Boolean(
    props.isAdminPreview ??
    (typeof window !== 'undefined' && ((window as any).isAdminPreview || (window as any).__isAdminPreview)) ??
    false
  );

  const {
    storeConfig,
    storeTheme,
    whiteLabelConfig,
    allProducts,
    filteredProducts,
    categories,
    selectedCategory,
    onSelectCategory,
    searchQuery,
    onSearchChange,
    onClearSearch,
    selectedProduct,
    onSelectProduct,
    onAddToCart,
    onBuyNow,
    getProductWhatsAppUrl,
    isPublicView = false,
    isStoreAdmin,
    isProductEditor,
    canDelete,
    onOpenEditProduct,
    onEditProduct,
    onPreviewFunnel,
    onSelectCustomizerSection,
    onOpenFunnel,
    onRemoveProduct,
    onShareProduct,
    onOpenAddProduct,
    onOpenThemeSelector,
    customConfig
  } = props;
  // État local pour le tunnel produit (60/40)
  const [tunnelProductState, setTunnelProductState] = useState<StoreProductItem | null>(null);
  const [tunnelQuantity, setTunnelQuantity] = useState<number>(1);
  const [activeThumbnailIndex, setActiveThumbnailIndex] = useState<number>(0);
  const [copyFunnelToast, setCopyFunnelToast] = useState(false);
  const [isStudentAuthOpen, setIsStudentAuthOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleCopyTunnelLink = (prod: StoreProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!prod.linkedFunnelId) return;
    playTapBeep();
    const storeSlug = (storeConfig.slug || 'boutique').replace(/^store-/, '');
    const url = buildPublicShopUrl(storeSlug, { funnelSlugOrId: prod.linkedFunnelId });

    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {}
    setCopyFunnelToast(true);
    setTimeout(() => setCopyFunnelToast(false), 2500);
  };

  // Le produit affiché en mode tunnel est soit l'état local, soit le selectedProduct transmis par les props
  const activeTunnel = tunnelProductState || selectedProduct;

  // Si le catalogue vendeur est vide, on injecte les produits digitaux de référence pour garantir l'expérience de démonstration
  const displayProducts = useMemo(() => {
    if (allProducts && allProducts.length > 0) {
      return filteredProducts.length > 0 ? filteredProducts : allProducts;
    }
    return DEMO_DIGITAL_PRODUCTS;
  }, [allProducts, filteredProducts]);

  // Détermination intelligente du badge dynamique anti-débordement
  const getProductBadge = (prod: StoreProductItem): string => {
    if (prod.badge && prod.badge.trim().length > 0) {
      return prod.badge.trim();
    }
    const cat = (prod.category || '').toLowerCase();
    const title = (prod.name || '').toLowerCase();
    if (cat.includes('formation') || title.includes('formation') || title.includes('cours') || title.includes('masterclass')) {
      return 'Accès à vie';
    }
    if (cat.includes('ebook') || cat.includes('livre') || title.includes('ebook') || title.includes('guide') || title.includes('pdf')) {
      return 'PDF Inclus';
    }
    if (cat.includes('template') || cat.includes('logiciel') || title.includes('pack') || title.includes('template')) {
      return 'Fichiers inclus';
    }
    return 'Téléchargement immédiat';
  };

  const handleOpenTunnel = (prod: StoreProductItem) => {
    playTapBeep();
    if (prod.linkedFunnelId && onOpenFunnel) {
      onOpenFunnel(prod);
      return;
    }
    setTunnelQuantity(1);
    setActiveThumbnailIndex(0);
    setTunnelProductState(prod);
    onSelectProduct(prod);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseTunnel = () => {
    playTapBeep();
    setTunnelProductState(null);
    onSelectProduct(null as any);
  };

  // Produit Vedette / Offre Numérique Spéciale (customConfig.specialOfferProductId)
  const specialOfferProduct = useMemo(() => {
    if (customConfig?.specialOfferProductId) {
      const picked = displayProducts.find(p => p.id === customConfig.specialOfferProductId);
      if (picked) return picked;
    }
    return displayProducts.find(p => p.originalPrice && p.originalPrice > p.price) || null;
  }, [displayProducts, customConfig?.specialOfferProductId]);

  const handleExecuteBuyNow = (prod: StoreProductItem, qty: number = 1) => {
    playTapBeep();
    onBuyNow(prod, qty);
  };

  const handleFocusSearch = () => {
    playTapBeep();
    if (activeTunnel) handleCloseTunnel();
    const searchEl = document.getElementById('digital-search-bar');
    if (searchEl) {
      searchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchInputRef.current?.focus();
    }
  };

  return (
    <div 
      className="theme-digital-pro min-h-screen w-full bg-[#FFFFFF] text-[#0F172A] flex flex-col font-sans selection:bg-[#0056D2] selection:text-white"
      style={{
        // Variables CSS strictes du Thème Digital Pro
        // @ts-ignore
        '--digital-accent': '#0056D2',
        '--digital-accent-hover': '#0046AB',
        '--digital-bg': '#FFFFFF',
        '--digital-card-bg': '#FFFFFF',
        '--digital-radius': '16px',
        '--digital-shadow': '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
        '--digital-shadow-hover': '0 20px 35px -5px rgba(0, 86, 210, 0.12)',
        '--digital-gray-light': '#F8F9FA'
      }}
    >
      <style>{`
        /* =========================================================================
           DESIGN SYSTEM CONTRAINT (ANTI-ERREUR & ANTI-DÉBORDEMENT)
           La règle absolue : Même avec une mauvaise image et un texte trop long,
           le CSS force un rendu visuel luxueux, digne d'Apple ou de Stripe.
           ========================================================================= */
        .digital-card {
          border-radius: 16px !important;
          background-color: #FFFFFF !important;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05) !important;
          border: none !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .digital-card:hover {
          box-shadow: 0 20px 35px -5px rgba(0, 86, 210, 0.12) !important;
          transform: translateY(-4px) !important;
        }
        /* 1. Le conteneur de l'image force le carré parfait (Format Facebook / Insta Ads 1080x1080) */
        .product-image-container,
        .digital-img-container {
          width: 100% !important;
          aspect-ratio: 1 / 1 !important; /* Le fameux format carré Facebook Ads */
          overflow: hidden !important;
          border-radius: 12px 12px 0 0 !important; /* Garde l'arrondi premium juste en haut */
          background-color: #F8F9FA !important; /* Fond léger au cas où l'image a un fond transparent */
          position: relative !important;
        }

        /* 2. L'image remplit le conteneur sans se déformer */
        .product-image-container img,
        .digital-img-container img,
        .digital-img-contain {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important; /* Essentiel : remplit tout le carré proprement */
          display: block !important;
        }
        .digital-title-clamped {
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          line-height: 1.35 !important;
        }
        @keyframes digitalFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .digital-float {
          animation: digitalFloat 5s ease-in-out infinite;
        }
      `}</style>

      {/* =========================================================================
          1. NAVIGATION HEADER ADAPTATIF OU ÉPURÉE
         ========================================================================= */}
      {customConfig?.headerStyle && customConfig.headerStyle !== 'none' ? (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier l'En-Tête & Navigation ⚡"
            targetAccordion={1}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <AdaptiveHeaderEngine
            config={customConfig}
            products={displayProducts}
            categories={categories}
            storeSlug={storeConfig?.slug || storeConfig?.storeName || 'boutique'}
            onOpenFunnel={onOpenFunnel}
            onSelectProduct={handleOpenTunnel}
            onResetToHome={() => {
              if (activeTunnel) handleCloseTunnel();
              if (onSelectCategory) onSelectCategory('Tous');
            }}
            onSelectCategory={onSelectCategory}
            onSearch={onSearchChange}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <>
          {(customConfig?.announcementBarEnabled ?? true) && customConfig?.announcementBarText && (
            <div
              className="w-full py-2 px-4 text-center text-[11px] font-extrabold uppercase tracking-wider text-white"
              style={{ backgroundColor: customConfig?.primaryAccentColor || '#0056D2' }}
            >
              {customConfig.announcementBarText}
            </div>
          )}
          <div className="relative group">
        <AdminSectionEditTrigger
          label="✏️ Modifier l'En-Tête & Navigation ⚡"
          targetAccordion={1}
          onSelectSection={onSelectCustomizerSection}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
          position="top-right"
        />
        <header
          className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all"
          style={customConfig?.headerBgColor ? { backgroundColor: customConfig.headerBgColor } : undefined}
        >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo & Identité du Vendeur */}
          <div 
            onClick={() => {
              if (activeTunnel) handleCloseTunnel();
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {(customConfig?.logoUrl || storeConfig.logoUrl) ? (
              <img 
                src={customConfig?.logoUrl || storeConfig.logoUrl} 
                alt={customConfig?.storeName || storeConfig.storeName} 
                className="h-10 w-auto max-w-[140px] object-contain rounded-xl"
              />
            ) : (
              <div className="flex items-center">
                <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                  {customConfig?.storeName || storeConfig.storeName || 'Nanasore'}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#0056D2] leading-none">.</span>
              </div>
            )}
          </div>

          {/* Liens de Navigation Centraux (Boutique, Produits, Nos Formations, Abonnements, Contact) */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (activeTunnel) handleCloseTunnel();
                onSelectCategory('Tous');
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                !activeTunnel && (selectedCategory === 'Tous' || !selectedCategory)
                  ? 'bg-[#EBF3FC] text-[#0056D2]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Boutique
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (activeTunnel) handleCloseTunnel();
                const gridEl = document.getElementById('digital-products-grid');
                if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Produits</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (activeTunnel) handleCloseTunnel();
                onSelectCategory('Nos Formations');
                const gridEl = document.getElementById('digital-products-grid');
                if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                !activeTunnel && selectedCategory === 'Nos Formations'
                  ? 'bg-[#EBF3FC] text-[#0056D2]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Nos Formations
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (activeTunnel) handleCloseTunnel();
                onSelectCategory('Abonnements');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                !activeTunnel && selectedCategory === 'Abonnements'
                  ? 'bg-[#EBF3FC] text-[#0056D2]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Abonnements
            </button>

            {storeConfig.whatsappPhone && (
              <a
                href={`https://wa.me/${storeConfig.whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, je souhaite des informations sur votre catalogue digital ${storeConfig.storeName}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-1.5"
              >
                <span>Contact</span>
              </a>
            )}

            {/* Raccourci Galerie de Thèmes (Connecté au Sélecteur) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenThemeSelector?.();
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#0056D2] bg-blue-50/70 hover:bg-blue-100/70 transition-all flex items-center gap-1.5 cursor-pointer ml-1"
              title="Changer de thème visuel (Galerie Multi-Layouts)"
            >
              <Palette className="w-3.5 h-3.5 text-[#0056D2]" />
              <span>Thèmes</span>
            </button>
          </nav>

          {/* Actions Droite : Recherche Rapide, Panier & Espace Élève */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleFocusSearch}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Rechercher"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (displayProducts[0]) handleOpenTunnel(displayProducts[0]);
              }}
              className="flex items-center gap-1.5 p-2 text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Panier"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-bold text-slate-900">0</span>
            </button>

            {!isPublicView && isStoreAdmin && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenAddProduct?.();
                }}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs transition cursor-pointer"
                title="Ajouter un produit digital"
              >
                <Plus className="w-3.5 h-3.5 text-[#0056D2]" />
                <span>Nouveau produit</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                const student = getCurrentStudent();
                if (student) {
                  navigateToStudentDashboard();
                } else {
                  setIsStudentAuthOpen(true);
                }
              }}
              className="bg-[#0056D2] hover:bg-[#0046AB] text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm hover:shadow active:scale-95 flex items-center gap-2 cursor-pointer"
              title="Accéder à mon espace étudiant & formations"
            >
              <GraduationCap className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Se connecter / Espace Élève</span>
              <span className="sm:hidden">Espace Élève</span>
            </button>
          </div>
        </div>
      </header>
      </div>
      </>
      )}

      {/* =========================================================================
          VUE 1 : PAGE DÉTAIL PRODUIT & TUNNEL DE VENTE 60/40 (SI PRODUIT SÉLECTIONNÉ)
         ========================================================================= */}
      {activeTunnel ? (
        <DigitalWideProductView
          product={activeTunnel}
          allProducts={displayProducts}
          categories={categories}
          storeName={storeConfig.storeName || 'Nanasore'}
          whatsappPhone={storeConfig.whatsappPhone || ''}
          onBack={handleCloseTunnel}
          onSelectProduct={(prod) => {
            handleOpenTunnel(prod);
          }}
          onAddToCart={(prod, qty) => {
            playValidationBeep();
            onAddToCart(prod, qty);
          }}
          onBuyNow={(prod, qty) => {
            handleExecuteBuyNow(prod, qty);
          }}
          isPublicView={isPublicView}
          isAdminPreview={isAdminPreview}
        />
      ) : (

        /* =========================================================================
            VUE 2 : PAGE D'ACCUEIL & CATALOGUE "INDESTRUCTIBLE"
           ========================================================================= */
        <main className="flex-1 w-full flex flex-col space-y-12">
          
          {/* -----------------------------------------------------------------------
              2. LE HERO HEADER (50/50 Desktop, 100% Mobile)
              Fond : Subtil dégradé radial bleu très clair (#F0F7FF) vers blanc (#FFFFFF)
             ----------------------------------------------------------------------- */}
          <section 
            className="w-full relative overflow-hidden py-12 sm:py-20 px-4 sm:px-6 lg:px-8 group"
            style={{
              background: 'radial-gradient(circle at 75% 30%, #F0F7FF 0%, #FFFFFF 70%)'
            }}
          >
            <AdminSectionEditTrigger
              label="✏️ Personnaliser le Hero (Titre & Textes) ⚡"
              targetAccordion={2}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              
              {/* Colonne Gauche (50%) : Titre Massif, Sous-Titre & Barre de Recherche */}
              <div className="lg:col-span-6 space-y-6 text-left">
                
                <LiveEditable
                  label="Badge Hero"
                  field="heroSubtitle"
                  value={customConfig?.heroSubtitle || 'E-learning & Produits Digitaux'}
                  targetAccordion={2}
                  isAdminPreview={isAdminPreview}
                  isInline={true}
                >
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF3FC] text-[#0056D2] text-xs font-black uppercase tracking-wider">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{customConfig?.heroSubtitle || 'E-learning & Produits Digitaux'}</span>
                  </div>
                </LiveEditable>

                <LiveEditable
                  label="Titre Principal Hero"
                  field="heroTitle"
                  value={customConfig?.heroTitle || (storeConfig.welcomeText && storeConfig.welcomeText.length > 5 ? storeConfig.welcomeText : 'Boostez vos compétences avec nos ressources digitales.')}
                  targetAccordion={2}
                  isAdminPreview={isAdminPreview}
                >
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.15]">
                    {customConfig?.heroTitle ||
                      (storeConfig.welcomeText && storeConfig.welcomeText.length > 5
                        ? storeConfig.welcomeText
                        : 'Boostez vos compétences avec nos ressources digitales.')}
                  </h1>
                </LiveEditable>

                <LiveEditable
                  label="Description Hero"
                  field="heroDescription"
                  value={customConfig?.heroDescription || 'Accédez instantanément à nos meilleures formations, e-books et outils indispensables pour accélérer votre business.'}
                  type="textarea"
                  targetAccordion={2}
                  isAdminPreview={isAdminPreview}
                >
                  <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-xl">
                    {customConfig?.heroDescription ||
                      'Accédez instantanément à nos meilleures formations, e-books et outils indispensables pour accélérer votre business.'}
                  </p>
                </LiveEditable>

                {/* Barre de Recherche Intuitive avec gros bouton bleu */}
                <div 
                  id="digital-search-bar"
                  className="p-1.5 sm:p-2 rounded-2xl bg-white flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl transition-all"
                  style={{
                    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div className="relative flex-1 flex items-center pl-3">
                    <Search className="w-5 h-5 text-slate-400 shrink-0" />
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder="Recherche..."
                      className="w-full bg-transparent border-none py-2.5 px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={onClearSearch}
                        className="p-1 text-slate-400 hover:text-slate-600 mr-2 cursor-pointer"
                        title="Effacer la recherche"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <LiveEditable
                    label="Bouton CTA Hero"
                    field="heroCtaText"
                    value={customConfig?.heroCtaText || 'Découvrir la sélection'}
                    targetAccordion={2}
                    isAdminPreview={isAdminPreview}
                    isInline={true}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (customConfig?.heroLinkedProductId) {
                          const targetProd = displayProducts.find(p => p.id === customConfig.heroLinkedProductId);
                          if (targetProd) {
                            handleOpenTunnel(targetProd);
                            return;
                          }
                        }
                        const gridEl = document.getElementById('digital-products-grid');
                        if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-[#0056D2] hover:bg-[#0046AB] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg cursor-pointer shrink-0"
                    >
                      {customConfig?.heroCtaText || 'Découvrir la sélection'}
                    </button>
                  </LiveEditable>
                </div>

                {/* Preuves de Confiance sous la recherche */}
                <div className="flex items-center gap-5 pt-2 text-xs text-slate-500 font-medium">
                  <LiveEditable
                    label="Garantie 1"
                    field="reassurance1Title"
                    value={customConfig?.reassurance1Title || 'Téléchargement immédiat'}
                    targetAccordion={4}
                    isAdminPreview={isAdminPreview}
                    isInline={true}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0056D2]" />
                      <span>{customConfig?.reassurance1Title || 'Téléchargement immédiat'}</span>
                    </div>
                  </LiveEditable>
                  <LiveEditable
                    label="Garantie 2"
                    field="reassurance2Title"
                    value={customConfig?.reassurance2Title || 'Paiement Mobile Money'}
                    targetAccordion={4}
                    isAdminPreview={isAdminPreview}
                    isInline={true}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0056D2]" />
                      <span>{customConfig?.reassurance2Title || 'Paiement Mobile Money'}</span>
                    </div>
                  </LiveEditable>
                </div>

              </div>

              {/* Colonne Droite (50%) : Couverture Vendeur Flottante avec Drop-Shadow */}
              <div className="lg:col-span-6 flex justify-center lg:justify-end">
                <div 
                  className="digital-float relative max-w-lg w-full"
                  style={{
                    filter: 'drop-shadow(0 20px 35px rgba(0, 86, 210, 0.12))'
                  }}
                >
                  {/* Visuel 3D immersif ou image de couverture du commerçant */}
                  {customConfig?.heroVideoUrl ? (
                    <div className="rounded-3xl overflow-hidden bg-white p-3 shadow-2xl">
                      <video
                        src={customConfig.heroVideoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        poster={customConfig?.heroBannerImageUrl || storeConfig.bannerImage}
                        className="w-full h-auto aspect-[16/10] object-cover rounded-2xl"
                      />
                    </div>
                  ) : (customConfig?.heroBannerImageUrl || storeConfig.bannerImage) ? (
                    <div className="rounded-3xl overflow-hidden bg-white p-3 shadow-2xl">
                      <img 
                        src={customConfig?.heroBannerImageUrl || storeConfig.bannerImage} 
                        alt={customConfig?.storeName || storeConfig.storeName}
                        className="w-full h-auto aspect-[16/10] object-cover rounded-2xl"
                      />
                    </div>
                  ) : (
                    /* Mockup Digital Pro Référence (Exacte composition de l'Image 1) */
                    <div className="relative w-full aspect-[16/10] flex items-center justify-center select-none">
                      
                      {/* Écran Central Desktop / iMac Style */}
                      <div className="relative w-[78%] h-[82%] rounded-2xl bg-slate-900 border-2 border-slate-700/80 p-2 shadow-2xl flex flex-col justify-between overflow-hidden z-10">
                        {/* Caméra & barre supérieure */}
                        <div className="flex items-center justify-between pb-1 px-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                            <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                          </div>
                          <span className="text-[9px] font-black uppercase text-blue-300">
                            Masterclass E-Formation
                          </span>
                        </div>

                        {/* Écran avec Formateur et cours */}
                        <div className="flex-1 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950/80 p-3 flex flex-col justify-center items-center text-center relative overflow-hidden">
                          <div className="w-12 h-12 rounded-full bg-blue-600/30 border border-blue-400/50 flex items-center justify-center mb-2 shadow-lg">
                            <Play className="w-5 h-5 ml-0.5 fill-[#38BDF8] text-[#38BDF8]" />
                          </div>
                          <div className="text-xs sm:text-sm font-black text-white">
                            Masterclass E-Formation
                          </div>
                          <div className="text-[10px] text-blue-200 mt-0.5">
                            Vidéos • E-books • Templates Inclus
                          </div>
                          <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 font-black text-[8px] px-2 py-0.5 rounded-full">
                            100% Validé
                          </div>
                        </div>

                        {/* Pied Aluminium Stand */}
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-400/60 rounded-b-md" />
                      </div>

                      {/* 3D E-book "Réussir son Business en Afrique" à Gauche */}
                      <div 
                        className="absolute left-0 bottom-4 w-[34%] h-[74%] rounded-xl bg-gradient-to-br from-blue-900 to-indigo-950 border border-blue-400/40 p-2 shadow-2xl z-20 transition-transform hover:scale-105"
                        style={{
                          transform: 'rotate(-6deg)'
                        }}
                      >
                        <div className="w-full h-full rounded-lg bg-blue-800 p-2 flex flex-col justify-between text-white">
                          <div className="text-[8px] font-black tracking-wider text-amber-300 uppercase">
                            E-book
                          </div>
                          <div className="text-[10px] font-black leading-tight">
                            Réussir son Business en Afrique
                          </div>
                          <div className="text-[7.5px] text-blue-200 bg-blue-950/60 p-1 rounded font-bold">
                            PDF Téléchargeable
                          </div>
                        </div>
                      </div>

                      {/* 3D Guide "Stratégie Marketing Digital" à Droite */}
                      <div 
                        className="absolute right-0 bottom-4 w-[32%] h-[72%] rounded-xl bg-white border border-slate-200 p-2 shadow-2xl z-20 transition-transform hover:scale-105"
                        style={{
                          transform: 'rotate(6deg)'
                        }}
                      >
                        <div className="w-full h-full rounded-lg bg-slate-50 p-2 flex flex-col justify-between text-slate-900">
                          <div className="text-[8px] font-black tracking-wider text-[#0056D2] uppercase">
                            Guide
                          </div>
                          <div className="text-[10px] font-black leading-tight">
                            Stratégie Marketing Digital
                          </div>
                          <div className="text-[7.5px] text-slate-500 bg-white p-1 rounded font-bold border border-slate-100">
                            Fichiers Inclus
                          </div>
                        </div>
                      </div>

                      {/* Badge Canva Pro Flottant en haut */}
                      <div className="absolute -top-3 left-10 z-30 bg-[#00C4CC] text-white p-2 rounded-2xl shadow-xl flex items-center gap-1.5 animate-bounce">
                        <span className="font-serif font-black text-xs">C</span>
                        <span className="text-[9px] font-black tracking-tight">Canva Pro</span>
                      </div>

                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* =======================================================================
              SOUS-BANNIÈRES SECONDAIRES FORMATIONS & RESSOURCES (subBanner1 & subBanner2)
             ======================================================================= */}
          {(customConfig?.subBanner1Title || customConfig?.subBanner1Image || customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
            <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(customConfig?.subBanner1Title || customConfig?.subBanner1Image) && (
                  <div
                    onClick={() => {
                      playTapBeep();
                      const gridEl = document.getElementById('digital-products-grid');
                      if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 sm:p-7 flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition-all group"
                  >
                    <div className="space-y-2 z-10">
                      {customConfig?.subBanner1Badge && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-blue-500 text-white inline-block">
                          {customConfig.subBanner1Badge}
                        </span>
                      )}
                      <h3 className="text-xl sm:text-2xl font-black leading-tight text-white group-hover:text-blue-300 transition-colors">
                        {customConfig.subBanner1Title}
                      </h3>
                      {customConfig?.subBanner1Subtitle && (
                        <p className="text-xs text-blue-100 max-w-xs">{customConfig.subBanner1Subtitle}</p>
                      )}
                      {customConfig?.subBanner1CtaText && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 pt-1">
                          <span>{customConfig.subBanner1CtaText}</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </div>
                    {customConfig?.subBanner1Image && (
                      <img
                        src={customConfig.subBanner1Image}
                        alt={customConfig.subBanner1Title || 'Bannière'}
                        className="w-24 sm:w-32 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                      />
                    )}
                  </div>
                )}
                {(customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
                  <div
                    onClick={() => {
                      playTapBeep();
                      const gridEl = document.getElementById('digital-products-grid');
                      if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-7 flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition-all group"
                  >
                    <div className="space-y-2 z-10">
                      {customConfig?.subBanner2Badge && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-amber-400 text-slate-950 inline-block">
                          {customConfig.subBanner2Badge}
                        </span>
                      )}
                      <h3 className="text-xl sm:text-2xl font-black leading-tight text-white group-hover:text-amber-300 transition-colors">
                        {customConfig.subBanner2Title}
                      </h3>
                      {customConfig?.subBanner2Subtitle && (
                        <p className="text-xs text-slate-300 max-w-xs">{customConfig.subBanner2Subtitle}</p>
                      )}
                      {customConfig?.subBanner2CtaText && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 pt-1">
                          <span>{customConfig.subBanner2CtaText}</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </div>
                    {customConfig?.subBanner2Image && (
                      <img
                        src={customConfig.subBanner2Image}
                        alt={customConfig.subBanner2Title || 'Bannière'}
                        className="w-24 sm:w-32 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                      />
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* =======================================================================
              OFFRE SPÉCIALE NUMÉRIQUE VEDETTE (specialOfferProductId)
             ======================================================================= */}
          {specialOfferProduct && (
            <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
              <div className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-r from-blue-50/60 via-white to-indigo-50/50 p-6 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white border border-slate-200/80 p-2 flex items-center justify-center shrink-0">
                    <img
                      src={specialOfferProduct.image || EBOOK_COVER_SVG}
                      alt={specialOfferProduct.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0056D2] font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-blue-500 text-blue-500" />
                        <span>Offre Numérique Phare</span>
                      </span>
                      {specialOfferProduct.originalPrice && specialOfferProduct.originalPrice > specialOfferProduct.price && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px]">
                          -{Math.round(((specialOfferProduct.originalPrice - specialOfferProduct.price) / specialOfferProduct.originalPrice) * 100)}%
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-[#0F172A] tracking-tight">
                      {specialOfferProduct.name}
                    </h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-black text-[#0056D2]">
                        {formatCFA(specialOfferProduct.price)}
                      </span>
                      {specialOfferProduct.originalPrice && specialOfferProduct.originalPrice > specialOfferProduct.price && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatCFA(specialOfferProduct.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => handleOpenTunnel(specialOfferProduct)}
                    className="flex-1 md:flex-initial px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer shadow-xs"
                  >
                    Voir le programme
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecuteBuyNow(specialOfferProduct, 1)}
                    className="flex-1 md:flex-initial px-6 py-3 rounded-xl bg-[#0056D2] hover:bg-[#0046AB] text-white font-bold text-xs transition cursor-pointer shadow-md"
                  >
                    Accéder maintenant
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* -----------------------------------------------------------------------
              3. LES CARTES PRODUITS "INDESTRUCTIBLES" (LE CŒUR DU THÈME)
              Design System Contraint : 
              - Format carré 1:1 Facebook/Instagram Ads (1080x1080)
              - object-fit: cover (anti-déformation strict)
              - display: -webkit-box; -webkit-line-clamp: 2 (anti-débordement)
              - border-radius: 12px 12px 0 0 sur le conteneur d'image, 16px sur la carte
              - box-shadow douce, aucune bordure dure
             ----------------------------------------------------------------------- */}
          <section id="digital-products-grid" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6 relative group">
            <AdminSectionEditTrigger
              label="✏️ Modifier la Grille & Titres ⚡"
              targetAccordion={3}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            
            {/* En-tête de section avec Titre et Filtres par Catégories */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                  {customConfig?.catalogTitle || "Produits populaires (Prêt à l'achat)"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {customConfig?.catalogSubtitle || "Sélectionnez un article pour ouvrir son tunnel de vente ou achetez directement."}
                </p>
              </div>

              {/* Pilules de Filtrage */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onSelectCategory('Tous');
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    selectedCategory === 'Tous' || !selectedCategory
                      ? 'bg-[#0056D2] text-white shadow-sm'
                      : 'bg-[#F8F9FA] text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tous ({displayProducts.length})
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      onSelectCategory(cat);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#0056D2] text-white shadow-sm'
                        : 'bg-[#F8F9FA] text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grille de Produits Indestructible (1 col mobile, 2 sm, 4 lg) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayProducts.map((prod, idx) => {
                const badgeText = getProductBadge(prod);

                return (
                  <div
                    key={`${prod.id}-${idx}`}
                    className="digital-card overflow-hidden rounded-2xl flex flex-col justify-between group cursor-pointer bg-white border border-slate-100/80 hover:border-blue-500/20 shadow-sm hover:shadow-xl transition-all relative"
                    onClick={() => handleOpenTunnel(prod)}
                  >
                    <AdminProductQuickBar
                      product={prod}
                      isPublicView={isPublicView}
                      isAdminPreview={isAdminPreview}
                      storeSlug={storeConfig.slug || storeConfig.storeName}
                      onEditProduct={onEditProduct || ((p, opts) => onOpenEditProduct?.(p))}
                      onPreviewFunnel={onPreviewFunnel}
                    />
                    <div>
                      {/* 1. Conteneur d'Image Strict Carré 1:1 (Facebook/Insta Ads 1080x1080) */}
                      <div className="product-image-container relative">
                        <img 
                          src={prod.image || EBOOK_COVER_SVG} 
                          alt={prod.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = EBOOK_COVER_SVG;
                          }}
                          className="transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Badges Dynamiques en absolute en haut à droite (fond beige clair, texte noir) */}
                        <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
                          <span className="bg-[#FFFBEB] text-[#0F172A] text-[10px] sm:text-[11px] font-extrabold px-3 py-1 rounded-full shadow-sm tracking-tight border border-amber-200/50">
                            {badgeText}
                          </span>
                        </div>

                        {/* Actions commerçant discrètes en hover (si connecté admin) */}
                        {!isPublicView && isProductEditor && (
                          <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playTapBeep();
                                onOpenEditProduct?.(prod);
                              }}
                              className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-[#0056D2] shadow-sm cursor-pointer"
                              title="Modifier ce produit"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            {canDelete && onRemoveProduct && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playTapBeep();
                                  onRemoveProduct(prod.id, prod.name, e);
                                }}
                                className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-rose-600 shadow-sm cursor-pointer"
                                title="Supprimer ce produit"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Titre Anti-débordement (Bridé strictement à 2 lignes avec line-clamp) */}
                      <div className="p-3.5 sm:p-4 pb-1">
                        <h3 
                          className="digital-title-clamped font-extrabold text-sm sm:text-base text-[#0F172A] group-hover:text-[#0056D2] transition-colors leading-snug"
                          title={prod.name}
                        >
                          {prod.name}
                        </h3>
                      </div>
                    </div>

                    {/* Footer de la Carte : Prix en gras à gauche, 2 boutons à droite (Sans bordure dure) */}
                    <div className="p-3.5 sm:p-4 pt-1 flex items-end justify-between gap-2">
                      {/* Prix à Gauche */}
                      <div>
                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          Prix
                        </div>
                        <div className="font-extrabold text-base sm:text-lg text-[#0F172A] tracking-tight">
                          {formatCFA(prod.price)}
                        </div>
                      </div>

                      {/* 2 Boutons à Droite : Petit "Voir tunnel" (outline) et "Acheter" (plein bleu) */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTunnel(prod);
                          }}
                          className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#0056D2] text-[#0056D2] hover:bg-[#F0F7FF] text-xs font-bold transition-colors cursor-pointer"
                          title="Voir le tunnel de vente complet"
                        >
                          Voir tunnel
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteBuyNow(prod, 1);
                          }}
                          className="px-3 sm:px-4 py-1.5 rounded-xl bg-[#0056D2] hover:bg-[#0046AB] text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
                          title="Acheter immédiatement via Sebpay"
                        >
                          Acheter
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </section>

          {/* -----------------------------------------------------------------------
              4. LA BARRE DE RÉASSURANCE UNIVERSELLE
              Intègre une barre discrète avec un fond gris ultra-clair (#F8F9FA).
              Texte centré avec icônes :
              ⚡ Accès instantané après paiement • 🔒 Paiement 100% Sécurisé Mobile Money & Cartes • 💬 Assistance 24/7 via WhatsApp
             ----------------------------------------------------------------------- */}
          <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10 relative group">
            <AdminSectionEditTrigger
              label="✏️ Modifier la Réassurance & Garanties ⚡"
              targetAccordion={4}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FA] text-center shadow-xs">
              <p className="text-xs sm:text-sm font-semibold text-slate-700 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {customConfig?.reassurance1Title || 'Accès instantané après paiement'}
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {customConfig?.reassurance2Title || 'Paiement 100% Sécurisé Mobile Money & Cartes'}
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#0056D2]" />
                  {customConfig?.reassurance3Title || 'Assistance 24/7 via WhatsApp'}
                </span>
              </p>
            </div>
          </section>

        </main>
      )}

      {/* =========================================================================
          FOOTER ADAPTATIF OU DISCRET & SÉCURITÉ DE MARQUE
         ========================================================================= */}
      {customConfig?.footerStyle && customConfig.footerStyle !== 'none' ? (
        <div className="relative group/footer-section">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Coordonnées ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <AdaptiveFooterEngine
            config={customConfig}
            products={displayProducts}
            storeSlug={storeConfig?.slug || storeConfig?.storeName || 'boutique'}
            categories={categories}
            onOpenFunnel={onOpenFunnel}
            onSelectProduct={handleOpenTunnel}
            onResetToHome={() => {
              if (activeTunnel) handleCloseTunnel();
              if (onSelectCategory) onSelectCategory('Tous');
            }}
            onSelectCategory={onSelectCategory}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <footer className="w-full bg-[#FFFFFF] border-t border-slate-100 py-6 px-4 text-center text-xs text-slate-400 relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Coordonnées ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {customConfig?.copyrightText || `© ${new Date().getFullYear()} ${customConfig?.storeName || storeConfig.storeName || 'Nanasore'}. Tous droits réservés.`}
            </div>
            <div className="flex items-center gap-4 text-slate-500 font-medium">
              <span>{customConfig?.storeTagline || 'Formations & E-learning'}</span>
              <span>•</span>
              <span>{customConfig?.footerAddress || 'Produits Numériques'}</span>
              <span>•</span>
              <span>{customConfig?.footerAboutText || 'Propulsé par Sebpay & NaNa'}</span>
            </div>
          </div>
        </footer>
      )}

      {/* Modal d'Authentification Élève (Connexion & Inscription) */}
      <StudentAuthModal
        isOpen={isStudentAuthOpen}
        onClose={() => setIsStudentAuthOpen(false)}
      />
    </div>
  );
};
