import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause,
  RotateCcw,
  Volume2, 
  VolumeX,
  Zap, 
  Check, 
  MessageCircle, 
  ShoppingCart, 
  ShieldCheck, 
  ChevronRight, 
  Share2, 
  Download, 
  Clock, 
  GraduationCap,
  Sparkles,
  FileText,
  Lock,
  Layers,
  CreditCard
} from 'lucide-react';
import { StoreProductItem } from './types';
import { BuyerLiveCallButton } from '../../../../components/live/BuyerLiveCallButton';
import { 
  getSmartShortDescription, 
  getSmartRichDescription, 
  AdaptiveProductRichText 
} from './AdaptiveProductRichText';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { triggerOpenFunnel } from '../../../../themes/themeUtils';
import { addToSmartCart } from './SmartSlideOutCartDrawer';
import { openStoreLegalModal } from './StoreLegalAndTrackingModals';
import { triggerOrderConfirmationVault } from './OrderConfirmationVaultModal';
import { trackViewContent, trackInitiateCheckout, trackWLead } from '../../../../utils/pixelTrackingEngine';
import { recordWLeadOrder } from '../../../../utils/firestoreService';

export interface DigitalWideProductViewProps {
  product: StoreProductItem;
  allProducts?: StoreProductItem[];
  categories?: string[];
  storeName?: string;
  wPhone?: string;
  whatsappPhone?: string;
  countdownTitle?: string;
  countdownHours?: number;
  onBack: () => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onAddToCart?: (product: StoreProductItem, quantity?: number) => void;
  onBuyNow?: (product: StoreProductItem, quantity?: number) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

// Couvertures Vectorielles 1080x1080 de Démonstration
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
  <g transform="translate(340, 180)" filter="url(%23shadow)">
    <rect x="0" y="0" width="400" height="620" rx="16" fill="%23FFFFFF"/>
    <rect x="20" y="20" width="360" height="580" rx="12" fill="%230F172A"/>
    <rect x="50" y="60" width="300" height="28" rx="6" fill="%232563EB"/>
    <text x="200" y="80" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="%23FFFFFF" letter-spacing="4" text-anchor="middle">BEST-SELLER AFRIQUE</text>
    <text x="200" y="160" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="%2393C5FD" text-anchor="middle">E-BOOK OFFICIEL</text>
    <text x="200" y="215" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="url(%23goldGrad)" text-anchor="middle">RÉUSSIR SON</text>
    <text x="200" y="265" font-family="system-ui, sans-serif" font-size="40" font-weight="900" fill="%23FFFFFF" text-anchor="middle">BUSINESS</text>
    <text x="200" y="315" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="%2360A5FA" text-anchor="middle">EN AFRIQUE</text>
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
    <rect x="25" y="45" width="650" height="365" rx="16" fill="%23020617"/>
    <rect x="50" y="70" width="380" height="240" rx="12" fill="%231E293B"/>
    <circle cx="240" cy="190" r="42" fill="%232563EB"/>
    <polygon points="230,172 260,190 230,208" fill="%23FFFFFF"/>
    <text x="50" y="340" font-family="system-ui, sans-serif" font-size="20" font-weight="900" fill="%23FFFFFF">MASTERCLASS E-COMMERCE &amp; VENTE</text>
    <text x="50" y="375" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="%2338BDF8">Module 01 • Lancement &amp; Mobile Money Cash</text>
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
  </defs>
  <rect width="1080" height="1080" fill="url(%23bgWebinar)"/>
  <rect x="140" y="140" width="800" height="800" rx="36" fill="%230F172A" stroke="%2338BDF8" stroke-width="4"/>
  <rect x="180" y="180" width="720" height="110" rx="20" fill="%23DC2626"/>
  <circle cx="240" cy="235" r="16" fill="%23FFFFFF"/>
  <text x="280" y="243" font-family="system-ui, sans-serif" font-size="36" font-weight="900" fill="%23FFFFFF">EN DIRECT : LIVE &amp; WEBINAIRE EXCLUSIF</text>
  <text x="540" y="380" font-family="system-ui, sans-serif" font-size="44" font-weight="900" fill="%23FFFFFF" text-anchor="middle">TUNNEL DE VENTE IA</text>
  <text x="540" y="440" font-family="system-ui, sans-serif" font-size="38" font-weight="900" fill="%23FDE047" text-anchor="middle">&amp; MOBILE MONEY AFRIQUE</text>
  <circle cx="540" cy="620" r="55" fill="%232563EB"/>
  <polygon points="528,595 565,620 528,645" fill="%23FFFFFF"/>
</svg>`;

const CANVA_PACK_SQUARE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgCanvaPack" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23312E81"/>
      <stop offset="50%" stop-color="%232563EB"/>
      <stop offset="100%" stop-color="%230D9488"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(%23bgCanvaPack)"/>
  <rect x="190" y="160" width="700" height="760" rx="36" fill="%230F172A" stroke="%2338BDF8" stroke-width="4"/>
  <text x="540" y="250" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="%23FFFFFF" text-anchor="middle">PACK RESSOURCES &amp; LOGICIELS</text>
  <text x="540" y="350" font-family="system-ui, sans-serif" font-size="52" font-weight="900" fill="%2338BDF8" text-anchor="middle">50+ TEMPLATES</text>
  <text x="540" y="415" font-family="system-ui, sans-serif" font-size="44" font-weight="900" fill="%23FBBF24" text-anchor="middle">CANVA &amp; NOTION PRO</text>
</svg>`;

// Fallbacks pour les produits recommandés (You May Also Like)
const FALLBACK_DIGITAL_RECOMMENDED: StoreProductItem[] = [
  {
    id: 'rec-ebook-01',
    name: 'E-Book Officiel : Réussir son Business en Afrique',
    price: 15000,
    originalPrice: 35000,
    badge: 'Best-Seller',
    category: 'E-Books & Guides',
    image: EBOOK_SQUARE_SVG,
    stock: 999
  },
  {
    id: 'rec-master-02',
    name: 'Masterclass Vidéo : Vente & Live Shopping Pro',
    price: 45000,
    originalPrice: 90000,
    badge: 'Formation Vidéo',
    category: 'Formations & Cours',
    image: MASTERCLASS_SQUARE_SVG,
    stock: 999
  },
  {
    id: 'rec-webinar-03',
    name: 'Webinaire Live : Tunnels de Vente IA & Mobile Money',
    price: 25000,
    originalPrice: 50000,
    badge: '🔴 Live Shopping',
    category: 'Webinaires & Lives',
    image: WEBINAR_SQUARE_SVG,
    stock: 50
  },
  {
    id: 'rec-pack-04',
    name: 'Pack VIP : 50+ Templates Canva & Notion Pro',
    price: 20000,
    originalPrice: 40000,
    badge: 'Logiciels & Outils',
    category: 'Logiciels & E-Books',
    image: CANVA_PACK_SQUARE_SVG,
    stock: 999
  }
];

export const DigitalWideProductView: React.FC<DigitalWideProductViewProps> = ({
  product,
  allProducts = [],
  categories = [],
  storeName = 'Académie Nanasore',
  wPhone = '',
  whatsappPhone = '',
  countdownTitle = '⏳ Offre & Accès Prioritaire expirent dans :',
  countdownHours = 24,
  onBack,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  isPublicView = false,
  isAdminPreview = false
}) => {
  const effectiveWPhone = wPhone || whatsappPhone;
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET DU COMPOSANT (ZÉRO ERREUR #310)
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'license'>('curriculum');
  const [selectedImage, setSelectedImage] = useState<string>(product.image || EBOOK_SQUARE_SVG);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [showStickyBar, setShowStickyBar] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [presentationProgress, setPresentationProgress] = useState<number>(0);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Moteur Pixels Publicitaires (F, T, Google) : ViewContent automatique
  useEffect(() => {
    if (product) {
      trackViewContent(product);
    }
  }, [product?.id]);

  // État du Compte à Rebours (Jours, Heures, Minutes, Secondes)
  const initialDurationSeconds = useMemo(() => {
    return Math.max(3600, (countdownHours || 24) * 3600);
  }, [countdownHours]);

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>(() => {
    const total = initialDurationSeconds;
    const days = Math.floor(total / (3600 * 24));
    const hours = Math.floor((total % (3600 * 24)) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return { days, hours, minutes, seconds };
  });

  // Décompte chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return { days: 0, hours: 2, minutes: 45, seconds: 18 }; // Relance élégante
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Défilement de l'animation de présentation si pas de lien vidéo direct
  useEffect(() => {
    if (!isPlayingVideo) return;
    const timer = setInterval(() => {
      setPresentationProgress(p => (p >= 100 ? 0 : p + 1));
    }, 200);
    return () => clearInterval(timer);
  }, [isPlayingVideo]);

  // Listener de Scroll pour la Sticky Bottom Bar
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowStickyBar(window.scrollY > 450);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Maintien de l'image sélectionnée à jour lors du changement de produit
  useEffect(() => {
    setSelectedImage(product.image || EBOOK_SQUARE_SVG);
    setIsPlayingVideo(false);
    setPresentationProgress(0);
  }, [product]);

  // Galerie d'images / affiches carrées 1080x1080
  const posterGallery = useMemo(() => {
    const list: string[] = [];
    if (product.image) list.push(product.image);
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    if (list.length === 0) {
      list.push(EBOOK_SQUARE_SVG, MASTERCLASS_SQUARE_SVG);
    }
    return list;
  }, [product]);

  // Résolution de l'URL vidéo (YouTube, Vimeo, MP4)
  const videoSource = useMemo(() => {
    const candidate = product.routineVideoUrls?.[0] || product.videoUrl || '';
    if (!candidate) return null;

    // Détection YouTube
    const ytMatch = candidate.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return { type: 'youtube', url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0` };
    }

    // Détection Vimeo
    const vimeoMatch = candidate.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return { type: 'vimeo', url: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };
    }

    // MP4 ou direct video
    return { type: 'mp4', url: candidate };
  }, [product.routineVideoUrls, product.videoUrl]);

  // Produits recommandés pour la section "You May Also Like"
  const relatedProducts = useMemo(() => {
    const others = allProducts.filter(p => p.id !== product.id);
    if (others.length >= 4) {
      return others.slice(0, 4);
    }
    if (others.length > 0) {
      const merged = [...others];
      for (const fallback of FALLBACK_DIGITAL_RECOMMENDED) {
        if (merged.length >= 4) break;
        if (!merged.some(m => m.id === fallback.id)) {
          merged.push(fallback);
        }
      }
      return merged.slice(0, 4);
    }
    return FALLBACK_DIGITAL_RECOMMENDED;
  }, [allProducts, product.id]);

  // Points clés par défaut pour formations et programmes digitaux
  const effectiveKeyFeatures = useMemo(() => {
    if (product.keyFeatures && product.keyFeatures.length > 0) {
      return product.keyFeatures;
    }
    return [
      '⚡ Accès immédiat & illimité 24h/24 à vie dès validation',
      '📚 Supports pédagogiques complets (PDF & Fiches pratiques inclus)',
      '🎓 Certificat d\'achèvement officiel avec vérification QR Code',
      '💬 Accès au groupe privé VIP d\'entraide Wameet Direct & communauté',
      '📱 100% Compatible smartphone, tablette et ordinateur'
    ];
  }, [product.keyFeatures]);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('fr-FR').format(p) + ' F CFA';
  };

  const discountPercent = useMemo(() => {
    if (product.originalPrice && product.originalPrice > product.price) {
      return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    }
    return 0;
  }, [product.originalPrice, product.price]);

  // Actions
  const handleDirectBuyClick = () => {
    playValidationBeep();
    trackInitiateCheckout(product, 'direct');
    if (onBuyNow) {
      onBuyNow(product, quantity);
    }
  };

  const handleOpenTunnelClick = () => {
    playValidationBeep();
    trackInitiateCheckout(product, 'tunnel');
    triggerOpenFunnel(product.linkedFunnelId || product.slug || product.id, product.name, product);
  };

  const handleWClick = () => {
    playTapBeep();
    const cleanNumber = (effectiveWPhone || '').replace(/[^0-9]/g, '');
    const orderNum = `CMD-${Date.now().toString().slice(-6)}`;
    const totalAmount = (product.price || 0) * quantity;

    // Tracking Pixel : Déclenchement automatique Lead Wameet
    trackWLead(product, totalAmount);

    // Enregistrement asynchrone 0ms de l'intention d'achat Wameet pour le Dashboard vendeur
    recordWLeadOrder({
      storeId: storeName || 'boutique',
      storeName,
      product: {
        id: product.id,
        name: product.name,
        price: product.price || 0,
        category: product.category,
        image: product.image
      },
      quantity,
      totalAmount,
      sourceModule: 'digital_1080_view'
    });

    // Déclenchement automatique du Coffre de Confirmation Post-Achat Nanasore (CAS B : Produit Numérique)
    triggerOrderConfirmationVault({
      orderId: orderNum,
      orderNumber: orderNum,
      storeName,
      whatsappNumber: cleanNumber || '+225 07 00 00 00',
      items: [{
        name: product.name,
        price: product.price || 0,
        quantity,
        category: product.category || 'Formation & Produit Numérique',
        image: product.image,
        isDigital: true,
        downloadUrl: product.digitalFileUrl || product.formationPdfUrl || '#',
        liveSessionSlug: product.liveSessionSlug || 'live-masterclass-vip'
      }],
      subtotal: totalAmount,
      total: totalAmount,
      isDigitalOrder: true,
      downloadUrl: product.digitalFileUrl || product.formationPdfUrl || '#',
      liveSessionSlug: product.liveSessionSlug || 'live-masterclass-vip',
      digitalCoverUrl: product.image
    });

    const defaultMsg = `Bonjour ${storeName}, je souhaite commander / réserver la formation : *${product.name}* (${formatPrice(product.price)}). Réf : #${orderNum}. Pouvez-vous m'envoyer le lien d'accès direct ?`;
    const targetUrl = cleanNumber
      ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(defaultMsg)}`;
    window.open(targetUrl, '_blank');
  };

  const handleAddToCartClick = () => {
    playValidationBeep();
    addToSmartCart(product, quantity);
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
  };

  const handleShare = (platform: 'facebook' | 'whatsapp' | 'f' | 'w' | 'copy' | 'twitter') => {
    playTapBeep();
    if (typeof window === 'undefined') return;
    const prodSlug = product.slug || product.productSlug || product.id;
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(prodSlug)}`;
    const title = encodeURIComponent(`Découvrez ${product.name} sur ${storeName} !`);

    if (platform === 'facebook' || platform === 'f') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer,width=600,height=450');
    } else if (platform === 'whatsapp' || platform === 'w') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`Regardez ce programme : ${product.name} 👉 ${shareUrl}`)}`, '_blank');
    } else if (platform === 'copy') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${title}`, '_blank', 'noopener,noreferrer,width=600,height=450');
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-slate-900 pb-28 pt-2 select-text">
      {/* 1. FIL D'ARIANE BLEU & BLANC */}
      <div className="max-w-[1380px] mx-auto px-4 lg:px-8 py-3.5 mb-4 border-b border-blue-50 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onBack();
          }}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Retour au catalogue</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>{storeName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-blue-300" />
          <span className="text-blue-600 font-semibold">{product.category || 'Formations & Digital'}</span>
          <ChevronRight className="w-3.5 h-3.5 text-blue-300" />
          <span className="font-bold text-slate-800 line-clamp-1 max-w-[240px]">{product.name}</span>
        </div>
      </div>

      <div className="max-w-[1380px] mx-auto px-4 lg:px-8">
        {/* 2. GRILLE LARGE EN 2 GRANDES COLONNES (VIDÉO & INFORMATIONS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* =========================================================================
              COLONNE GAUCHE (lg:col-span-6) : COMPTE À REBOURS + GRANDE VIDÉO 1080x1080
             ========================================================================= */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* ⏱️ LE MAGNIFIQUE COMPTE À REBOURS MOYEN (BLEU & BLANC) */}
            <div className="w-full bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 text-white rounded-2xl p-4 shadow-lg shadow-blue-600/15 flex flex-col sm:flex-row items-center justify-between gap-3 border border-blue-500">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
                </div>
                <div className="text-left">
                  <span className="text-xs sm:text-sm font-black tracking-wide block leading-snug">
                    {countdownTitle}
                  </span>
                  <span className="text-[10px] text-blue-100 font-medium">
                    Tarif préférentiel &amp; bonus limités
                  </span>
                </div>
              </div>

              {/* 4 Blocs Chiffres Blancs sur Fond Bleu */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="bg-white text-blue-600 font-black text-sm sm:text-base px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs min-w-[46px] text-center">
                  <span>{String(timeLeft.days).padStart(2, '0')}</span>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Jours</span>
                </div>
                <span className="font-black text-white text-sm">:</span>
                <div className="bg-white text-blue-600 font-black text-sm sm:text-base px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs min-w-[46px] text-center">
                  <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Heures</span>
                </div>
                <span className="font-black text-white text-sm">:</span>
                <div className="bg-white text-blue-600 font-black text-sm sm:text-base px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs min-w-[46px] text-center">
                  <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Mins</span>
                </div>
                <span className="font-black text-white text-sm">:</span>
                <div className="bg-white text-blue-600 font-black text-sm sm:text-base px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs min-w-[46px] text-center">
                  <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Secs</span>
                </div>
              </div>
            </div>

            {/* 🎬 GRANDE VIDÉO AVEC THUMBNAIL INTERNE = IMAGE DE L'AFFICHE 1080x1080 */}
            <div className="w-full rounded-2xl overflow-hidden border-2 border-blue-100 shadow-xl bg-slate-950 relative aspect-square max-h-[560px] flex items-center justify-center select-none group">
              {isPlayingVideo ? (
                /* ÉTAT VIDÉO EN COURS DE LECTURE */
                <div className="w-full h-full relative bg-slate-950 flex items-center justify-center">
                  {videoSource?.type === 'youtube' ? (
                    <iframe
                      src={videoSource.url}
                      title={product.name}
                      className="w-full h-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : videoSource?.type === 'vimeo' ? (
                    <iframe
                      src={videoSource.url}
                      title={product.name}
                      className="w-full h-full border-none"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : videoSource?.type === 'mp4' ? (
                    <video
                      src={videoSource.url}
                      autoPlay
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* MODE PRÉSENTATION IMMERSIVE DE L'AFFICHE (ZÉRO ÉCRAN NOIR) */
                    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
                      <img
                        src={selectedImage}
                        alt={product.name}
                        className="w-full h-full object-cover transform scale-110 transition-transform duration-1000 ease-out filter brightness-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-between p-6">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/90 text-white text-xs font-bold backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            Présentation Interactive
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAudioMuted(!isAudioMuted)}
                            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition"
                          >
                            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* Égaliseur Sonore Animé */}
                          <div className="flex items-end gap-1.5 h-6">
                            {[16, 24, 12, 28, 20, 32, 18, 26, 14, 22].map((h, i) => (
                              <div
                                key={i}
                                className="w-1.5 bg-blue-400 rounded-full animate-pulse"
                                style={{
                                  height: `${(h * (1 + (i % 3) * 0.2))}px`,
                                  animationDelay: `${i * 120}ms`
                                }}
                              />
                            ))}
                          </div>
                          {/* Barre de progression */}
                          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-200"
                              style={{ width: `${presentationProgress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Aperçu de la formation en direct</span>
                            <button
                              type="button"
                              onClick={() => setIsPlayingVideo(false)}
                              className="text-white hover:text-blue-300 underline font-semibold cursor-pointer"
                            >
                              Revenir à l'affiche
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* 🔥 THUMBNAIL INTERNE : POSTER = AFFICHE DU PRODUIT */
                <div 
                  onClick={() => {
                    playTapBeep();
                    setIsPlayingVideo(true);
                  }}
                  className="w-full h-full relative cursor-pointer flex items-center justify-center"
                >
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Gradient Sombre Léger */}
                  <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/35 transition-colors" />

                  {/* Bouton Play Central Bleu & Blanc avec Onde Lumineuse */}
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="relative">
                      <span className="absolute -inset-2 rounded-full bg-blue-500 opacity-60 animate-ping pointer-events-none" />
                      <div className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-500 text-white border-4 border-white shadow-2xl flex items-center justify-center transition-transform hover:scale-110 cursor-pointer">
                        <Play className="w-8 h-8 fill-white ml-1" />
                      </div>
                    </div>

                    <div className="bg-slate-900/85 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-white/20 shadow-lg flex items-center gap-2">
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Regarder la vidéo de présentation</span>
                    </div>
                  </div>

                  {/* Badge en haut à droite */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{product.badge || 'Certifié Nanasore'}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Rangée de Miniatures Carrées 1080x1080 sous la vidéo */}
            {posterGallery.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                {posterGallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSelectedImage(img);
                      setIsPlayingVideo(false);
                    }}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer relative ${
                      selectedImage === img && !isPlayingVideo
                        ? 'border-blue-600 ring-2 ring-blue-600/30 shadow-md'
                        : 'border-slate-200 hover:border-blue-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Miniature ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* =========================================================================
              COLONNE DROITE (lg:col-span-6) : INFORMATIONS, PROGRAMME & BOUTONS D'ACTION
             ========================================================================= */}
          <div className="lg:col-span-6 space-y-5">
            
            {/* Badges de Réassurance Numérique */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span>Accès Immédiat 24h/24</span>
              </span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span>Formation / Produit Certifié</span>
              </span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Paiement Mobile Money Sécurisé</span>
              </span>
            </div>

            {/* Grand Titre du Produit / Webinaire */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
              {product.name}
            </h1>

            {/* Bloc Prix en Bleu Royal (#2563EB) */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-3xl sm:text-4xl font-black text-blue-600 tracking-tight">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-lg sm:text-xl text-slate-400 line-through font-semibold">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className="bg-blue-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-md shadow-xs">
                    -{discountPercent}% Économie
                  </span>
                </>
              )}
            </div>

            {/* Courte Description d'Accroche */}
            <div className="bg-blue-50/60 border-l-4 border-blue-600 p-4 rounded-r-xl text-sm text-slate-700 font-medium leading-relaxed">
              {getSmartShortDescription(product, 180)}
            </div>

            {/* Points Clés du Programme / Ce qui est inclus */}
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Ce qui est inclus dans votre accès :
              </span>
              <div className="space-y-2">
                {effectiveKeyFeatures.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 🔥 LES GRANDS BOUTONS D'ACTION (ADN BLEU & BLANC + WHATSAPP) */}
            <div className="space-y-3 pt-4 border-t border-blue-100">
              {/* Bouton Acheter Principal : Caisse Sebpay */}
              <button
                type="button"
                onClick={handleDirectBuyClick}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-base py-4 px-6 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                title="Ouvrir la caisse principale Sebpay"
              >
                <Zap className="w-5 h-5 fill-white" />
                <span>Acheter maintenant (Caisse Sebpay)</span>
              </button>

              {/* Bouton Voir le Tunnel */}
              <button
                type="button"
                onClick={handleOpenTunnelClick}
                className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 active:scale-98 font-bold text-sm py-3 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                title="Ouvrir le tunnel de vente interactif"
              >
                <span>Voir le tunnel de vente</span>
              </button>

              {/* Bouton 2 (Pleine Largeur) : 💬 Acheter / Réserver sur Wameet Direct */}
              <button
                type="button"
                onClick={handleWClick}
                className="w-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-98 text-white font-bold text-sm py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Acheter / Réserver sur Wameet Direct</span>
              </button>

              {/* Bouton 2b : 📹 Voir en Direct / Live Shopping (Daily.co) */}
              <div className="w-full">
                <BuyerLiveCallButton
                  productId={product.id}
                  productName={product.name}
                  sellerId={merchantId}
                  buttonText="📹 Voir en Direct • Live Shopping"
                  className="w-full py-3 bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 border border-white/20"
                />
              </div>

              {/* Bouton 3 : 🛒 Ajouter au panier */}
              <button
                type="button"
                onClick={handleAddToCartClick}
                className="w-full bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600 font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Ajouter au panier</span>
              </button>
            </div>

            {/* Encadré des Moyens de Paiement Locaux Nanasore */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-blue-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <button
                  type="button"
                  onClick={() => openStoreLegalModal('privacy')}
                  className="flex items-center gap-1.5 hover:text-blue-600 transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Paiements Instantanés &amp; Sécurisés :</span>
                </button>
                <button
                  type="button"
                  onClick={() => openStoreLegalModal('terms', true)}
                  className="text-blue-600 hover:underline text-[11px] font-black cursor-pointer"
                >
                  Garanties &amp; CGV
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold text-slate-600">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">🟠 Orange Money</span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">🌊 Wave</span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">🟡 MTN / Moov Money</span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">💳 Carte Visa</span>
              </div>
            </div>

            {/* Boutons de Partage Direct ?product=slug */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-2">
                Partager cette formation :
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleShare('f')}
                  className="bg-[#3b5998] hover:opacity-90 text-white text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <span className="font-bold text-xs leading-none">f</span>
                  <span>Partager F</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare('w')}
                  className="bg-[#25D366] hover:opacity-90 text-white text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>Partager W</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare('copy')}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <span>{linkCopied ? '✓' : '🔗'}</span>
                  <span>{linkCopied ? 'Lien copié !' : 'Copier le lien'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare('twitter')}
                  className="bg-[#1da1f2] hover:opacity-90 text-white text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <span>🐦</span>
                  <span>Twitter</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* =========================================================================
            3. SECTION DES GRANDS ONGLETS CENTRÉS : PROGRAMME & DESCRIPTION / LICENCE
           ========================================================================= */}
        <div className="mt-16 pt-10 border-t border-slate-200 max-w-[1000px] mx-auto">
          {/* En-tête des Onglets */}
          <div className="flex items-center justify-center gap-8 mb-8 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('curriculum');
              }}
              className={`text-lg sm:text-2xl font-bold pb-2 transition-colors cursor-pointer relative ${
                activeTab === 'curriculum'
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>📖 Programme &amp; Description Complète</span>
              {activeTab === 'curriculum' && (
                <span className="absolute bottom-[-13px] left-0 right-0 h-1 bg-blue-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('license');
              }}
              className={`text-lg sm:text-2xl font-bold pb-2 transition-colors cursor-pointer relative ${
                activeTab === 'license'
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>🛡️ Accès, Licence &amp; Garantie</span>
              {activeTab === 'license' && (
                <span className="absolute bottom-[-13px] left-0 right-0 h-1 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>

          {/* Contenu de l'Onglet Actif */}
          <div className="py-4">
            {activeTab === 'curriculum' ? (
              <div className="bg-slate-50/60 p-6 sm:p-8 rounded-2xl border border-blue-50">
                <AdaptiveProductRichText
                  html={getSmartRichDescription(product)}
                  themeVariant="digital"
                />
              </div>
            ) : (
              <div className="bg-slate-50/60 p-6 sm:p-8 rounded-2xl border border-blue-50 space-y-6 text-sm text-slate-700 leading-relaxed">
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Délivrance Immédiate de vos Accès</span>
                  </h3>
                  <p>
                    Dès confirmation de votre paiement Mobile Money ou Carte Bancaire, vous recevez instantanément vos identifiants et votre lien de téléchargement direct par Wameet Direct et Email. Aucun délai d'attente.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Garantie Satisfait ou Accompagné</span>
                  </h3>
                  <p>
                    Chaque formation et produit numérique Nanasore bénéficie de notre garantie d'assistance : en cas de question ou de difficulté technique, notre équipe de support et l'instructeur sont joignables directement 7j/7.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>Licence d'Utilisation Personnelle &amp; Professionnelle</span>
                  </h3>
                  <p>
                    Les templates, documents et vidéos sont autorisés pour un usage au sein de votre entreprise ou projet. La revente non autorisée des fichiers sources bruts est strictement encadrée par nos CGV.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            4. SECTION YOU MAY ALSO LIKE (1080x1080)
           ========================================================================= */}
        <div className="mt-20 pt-12 border-t border-slate-200">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Vous Aimerez Aussi : Autres Formations &amp; Programmes
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Complétez vos compétences avec nos ressources recommandées
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relProd, idx) => (
              <div
                key={`${relProd.id}-${idx}`}
                onClick={() => {
                  playTapBeep();
                  if (onSelectProduct) {
                    onSelectProduct(relProd);
                  }
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between"
              >
                {/* Cadre 1080x1080 */}
                <div className="aspect-square w-full bg-slate-50 relative overflow-hidden flex items-center justify-center">
                  <img
                    src={relProd.image || EBOOK_SQUARE_SVG}
                    alt={relProd.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {relProd.badge && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
                        {relProd.badge}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bas de carte */}
                <div className="p-4 bg-white border-t border-blue-50 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {relProd.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {getSmartShortDescription(relProd, 70)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-sm font-black text-blue-600">
                      {formatPrice(relProd.price)}
                    </span>
                    <span className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <span>Découvrir</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* =========================================================================
          5. STICKY BOTTOM BAR BLEU & BLANC AU SCROLL
         ========================================================================= */}
      {showStickyBar && (
        <aside 
          aria-label="Barre d'achat rapide"
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-blue-100 shadow-2xl py-3 px-4 animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-4">
            {/* Info Produit Gauche */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-blue-100 shrink-0 bg-slate-50">
                <img
                  src={product.image || EBOOK_SQUARE_SVG}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                  {product.name}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="font-black text-blue-600 text-sm">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    ⚡ Accès Immédiat
                  </span>
                </div>
              </div>
            </div>

            {/* Boutons d'Action Droite */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleWClick}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-xs py-2.5 px-3.5 rounded-xl shadow transition cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Wameet Direct</span>
              </button>

              <button
                type="button"
                onClick={handleDirectBuyClick}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
                title="Acheter via la caisse principale Sebpay"
              >
                <span>Acheter</span>
              </button>

              <button
                type="button"
                onClick={handleOpenTunnelClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
                title="Voir le tunnel de vente"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Tunnel</span>
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export default DigitalWideProductView;
