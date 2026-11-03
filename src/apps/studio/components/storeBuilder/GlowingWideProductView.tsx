import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Eye, 
  Star, 
  ArrowLeftRight, 
  Share2, 
  ShoppingBag, 
  MessageCircle, 
  X, 
  Check, 
  Minus, 
  Plus, 
  Truck, 
  Package, 
  ShieldCheck, 
  ChevronRight,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { StoreProductItem } from './types';
import { 
  getSmartShortDescription, 
  getSmartRichDescription, 
  AdaptiveProductRichText 
} from './AdaptiveProductRichText';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { triggerOpenFunnel } from '../../../../themes/themeUtils';
import { addToSmartCart } from './SmartSlideOutCartDrawer';
import { BuyerLiveCallButton } from '../../../../components/live/BuyerLiveCallButton';
import { openStoreLegalModal } from './StoreLegalAndTrackingModals';
import { triggerOrderConfirmationVault } from './OrderConfirmationVaultModal';
import { trackViewContent, trackInitiateCheckout, trackWLead } from '../../../../utils/pixelTrackingEngine';
import { recordWLeadOrder } from '../../../../utils/firestoreService';

export interface GlowingWideProductViewProps {
  product: StoreProductItem;
  allProducts?: StoreProductItem[];
  categories?: string[];
  storeName?: string;
  wPhone?: string;
  whatsappPhone?: string;
  onBack: () => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onAddToCart?: (product: StoreProductItem, quantity?: number) => void;
  onBuyNow?: (product: StoreProductItem, quantity?: number) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

// 4 Images cosmétiques de démonstration haute définition (flacon, vue arrière ingrédients, texture crème)
const FALLBACK_GLOWING_GALLERY = [
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1000&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1000&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1608248597359-335606443657?w=1000&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=1000&auto=format&fit=crop&q=85'
];

// Produits de démonstration pour la section "You May Also Like"
const FALLBACK_RELATED_PRODUCTS: StoreProductItem[] = [
  {
    id: 'rel-glow-01',
    name: 'Scalp Moisturizing Cream',
    price: 29000,
    category: 'Skincare',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop&q=80'
    ],
    stock: 25
  },
  {
    id: 'rel-glow-02',
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
    id: 'rel-glow-03',
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
    id: 'rel-glow-04',
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

export const GlowingWideProductView: React.FC<GlowingWideProductViewProps> = ({
  product,
  allProducts = [],
  categories = [],
  storeName = 'Vendor 4',
  wPhone = '',
  whatsappPhone = '2250700000000',
  onBack,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  isPublicView = false,
  isAdminPreview = false
}) => {
  const effectiveWPhone = wPhone || whatsappPhone;
  // =========================================================================
  // HOOKS REACT STRICTEMENT AU DESSUS (Règle React #310 Zéro Erreur)
  // =========================================================================
  const [currentProduct, setCurrentProduct] = useState<StoreProductItem>(product);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<{ id: string; name: string; hex: string; border?: boolean } | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('200 ml');
  const [isHoveringLens, setIsHoveringLens] = useState<boolean>(false);
  const [lensPos, setLensPos] = useState<{ x: number; y: number; xPercent: number; yPercent: number }>({
    x: 0,
    y: 0,
    xPercent: 50,
    yPercent: 50
  });
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [isCompared, setIsCompared] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // État onglet actif (Prompt 3/3 : Description | Shipping & Return)
  const [activeTab, setActiveTab] = useState<'description' | 'shipping_return'>('description');

  // Barre collante en bas (Sticky Bottom Bar) au scroll
  const [showStickyBar, setShowStickyBar] = useState<boolean>(false);

  // Moteur Pixels Publicitaires (F, T, Google) : ViewContent automatique
  useEffect(() => {
    if (currentProduct) {
      trackViewContent(currentProduct);
    }
  }, [currentProduct?.id]);

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowStickyBar(window.scrollY > 350);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Synchronisation lorsque le produit change depuis le parent
  useEffect(() => {
    if (product) {
      setCurrentProduct(product);
      setActiveImageIndex(0);
      setQuantity(1);
      if (product.colorSwatches && product.colorSwatches.length > 0) {
        setSelectedColor(product.colorSwatches[0]);
      } else {
        setSelectedColor({ id: 'c-black', name: 'Black', hex: '#111111', border: true });
      }
      if (product.sizeOptions && product.sizeOptions.length > 0) {
        setSelectedSize(product.sizeOptions[0]);
      } else {
        setSelectedSize('200 ml');
      }
    }
  }, [product]);

  // Initialisation par défaut de la variante de couleur si présente
  useEffect(() => {
    if (!selectedColor) {
      if (currentProduct.colorSwatches && currentProduct.colorSwatches.length > 0) {
        setSelectedColor(currentProduct.colorSwatches[0]);
      } else {
        setSelectedColor({ id: 'c-black', name: 'Black', hex: '#111111', border: true });
      }
    }
  }, [currentProduct, selectedColor]);

  // Calcul dynamique de la plage de livraison J+1 à J+3
  const deliveryRangeString = useMemo(() => {
    const d1 = new Date();
    d1.setDate(d1.getDate() + 1);
    const d3 = new Date();
    d3.setDate(d3.getDate() + 3);

    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const d1Day = d1.getDate();
    const d3Day = d3.getDate();
    const month = monthNames[d3.getMonth()];

    return `${d1Day} ${month} - ${d3Day} ${month}`;
  }, []);

  // Galerie des 4 images de haute qualité
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (currentProduct.image) list.push(currentProduct.image);
    if (currentProduct.photoUrl && !list.includes(currentProduct.photoUrl)) list.push(currentProduct.photoUrl);
    if (currentProduct.images && Array.isArray(currentProduct.images)) {
      currentProduct.images.forEach(img => {
        if (img && !list.includes(img)) list.push(img);
      });
    }

    // Compléter jusqu'à 4 images avec les fallbacks haute définition
    FALLBACK_GLOWING_GALLERY.forEach(fb => {
      if (list.length < 4 && !list.includes(fb)) {
        list.push(fb);
      }
    });

    return list.slice(0, 4);
  }, [currentProduct]);

  const activeImageUrl = galleryImages[activeImageIndex] || galleryImages[0];

  // Variantes de couleurs effectives (celles du produit ou fallbacks exacts de Glowing : Black, Brown, Sky)
  const effectiveColorSwatches = useMemo(() => {
    if (currentProduct.colorSwatches && currentProduct.colorSwatches.length > 0) {
      return currentProduct.colorSwatches;
    }
    return [
      { id: 'c-black', name: 'Black', hex: '#111111', border: true },
      { id: 'c-brown', name: 'Brown', hex: '#8B4513' },
      { id: 'c-sky', name: 'Sky', hex: '#87CEEB' }
    ];
  }, [currentProduct.colorSwatches]);

  // Contenances disponibles (ex: 50 ml, 100 ml, 200 ml)
  const effectiveSizeOptions = useMemo(() => {
    if (currentProduct.sizeOptions && currentProduct.sizeOptions.length > 0) {
      return currentProduct.sizeOptions;
    }
    return ['50 ml', '100 ml', '200 ml'];
  }, [currentProduct.sizeOptions]);

  // Produits recommandés pour la section "You May Also Like"
  const relatedProducts = useMemo(() => {
    const others = allProducts.filter(p => p.id !== currentProduct.id);
    if (others.length >= 4) {
      return others.slice(0, 4);
    }
    const combined = [...others];
    FALLBACK_RELATED_PRODUCTS.forEach(fb => {
      if (combined.length < 4 && !combined.some(p => p.id === fb.id) && fb.id !== currentProduct.id) {
        combined.push(fb);
      }
    });
    return combined.slice(0, 4);
  }, [allProducts, currentProduct.id]);

  const handleSelectRelatedProduct = (p: StoreProductItem) => {
    playTapBeep();
    setCurrentProduct(p);
    setActiveImageIndex(0);
    setQuantity(1);
    if (p.colorSwatches && p.colorSwatches.length > 0) {
      setSelectedColor(p.colorSwatches[0]);
    } else {
      setSelectedColor({ id: 'c-black', name: 'Black', hex: '#111111', border: true });
    }
    if (p.sizeOptions && p.sizeOptions.length > 0) {
      setSelectedSize(p.sizeOptions[0]);
    } else {
      setSelectedSize('200 ml');
    }
    if (onSelectProduct) {
      onSelectProduct(p);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Gestion du Toast Feedback
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Gestion de la Loupe Circulaire Interactive
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));
    setLensPos({ x, y, xPercent, yPercent });
  };

  // Actions
  const handleDirectBuy = () => {
    playValidationBeep();
    trackInitiateCheckout(currentProduct, 'direct');
    if (onBuyNow) {
      onBuyNow(currentProduct, quantity);
    }
  };

  const handleBuyWithFunnel = () => {
    playValidationBeep();
    trackInitiateCheckout(currentProduct, 'tunnel');
    triggerOpenFunnel(currentProduct.linkedFunnelId || currentProduct.slug || currentProduct.id, currentProduct.name, currentProduct);
  };

  const handleBuyWithW = () => {
    playValidationBeep();
    const cleanPhone = (effectiveWPhone || '').replace(/[^0-9]/g, '');
    const colorInfo = selectedColor ? ` • Teinte/Couleur: ${selectedColor.name}` : '';
    const sizeInfo = selectedSize ? ` • Format: ${selectedSize}` : '';
    const rawTotal = (currentProduct.price || 0) * quantity;
    const totalAmount = rawTotal.toLocaleString('fr-FR');
    const orderNum = `CMD-${Date.now().toString().slice(-6)}`;

    // Tracking Pixel : Déclenchement automatique Lead Wameet
    trackWLead(currentProduct, rawTotal);

    // Enregistrement asynchrone 0ms de l'intention d'achat Wameet pour le Dashboard vendeur
    recordWLeadOrder({
      storeId: storeName || 'boutique',
      storeName,
      product: {
        id: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price || 0,
        category: currentProduct.category,
        image: currentProduct.image,
        selectedColor: selectedColor?.name,
        selectedSize
      },
      quantity,
      totalAmount: rawTotal,
      sourceModule: 'glowing_cosmetics_view'
    });

    // Ouverture automatique du Coffre de Confirmation Post-Achat Nanasore
    triggerOrderConfirmationVault({
      orderId: orderNum,
      orderNumber: orderNum,
      storeName,
      whatsappNumber: cleanPhone || '2250700000000',
      items: [{
        name: currentProduct.name,
        price: currentProduct.price || 0,
        quantity,
        category: currentProduct.category,
        color: selectedColor?.name,
        size: selectedSize,
        image: currentProduct.image
      }],
      subtotal: rawTotal,
      total: rawTotal,
      isDigitalOrder: false
    });

    const msg = `Bonjour ! Je souhaite commander sur votre boutique :\n- Produit : ${currentProduct.name}${colorInfo}${sizeInfo}\n- Quantité : ${quantity}\n- Montant Total : ${totalAmount} FCFA\n- Réf : #${orderNum}\n\nMerci de m'indiquer la disponibilité et les modalités de livraison !`;

    const targetUrl = `https://wa.me/${cleanPhone || '2250700000000'}?text=${encodeURIComponent(msg)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleToggleWishlist = () => {
    playValidationBeep();
    setIsWishlisted(prev => {
      const next = !prev;
      showToast(next ? '✨ Ajouté à votre liste de souhaits !' : 'Retiré de votre liste de souhaits');
      return next;
    });
  };

  const handleToggleCompare = () => {
    playValidationBeep();
    setIsCompared(prev => {
      const next = !prev;
      showToast(next ? '⚖️ Ajouté au comparateur de soins !' : 'Retiré du comparateur');
      return next;
    });
  };

  const handleAddToCartAction = () => {
    playValidationBeep();
    showToast('🛒 Produit ajouté au panier !');
    addToSmartCart({
      ...currentProduct,
      selectedColor: selectedColor?.name,
      selectedSize
    } as any, quantity, selectedColor?.name, selectedSize);
    if (onAddToCart) {
      onAddToCart(currentProduct, quantity);
    }
  };

  const handleShare = () => {
    playTapBeep();
    const prodSlug = currentProduct.slug || currentProduct.productSlug || currentProduct.id;
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(prodSlug)}`;
    if (navigator.share) {
      navigator.share({
        title: currentProduct.name,
        text: `Découvrez ${currentProduct.name} sur notre boutique !`,
        url: shareUrl
      }).catch(() => {});
    } else {
      setShowShareModal(true);
    }
  };

  const formatPrice = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 FCFA';
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  return (
    <div className="w-full bg-white text-slate-900 min-h-screen selection:bg-[#4E7661]/20 selection:text-[#4E7661] pb-20">
      
      {/* -------------------------------------------------------------------
          1. BANDEAU DE FIL D'ARIANE CENTRÉ (Breadcrumb Header)
          ------------------------------------------------------------------- */}
      <nav 
        aria-label="Fil d'Ariane"
        className="w-full bg-[#F5F5F5] py-3.5 px-4 mb-10 text-center text-xs text-slate-500 flex items-center justify-center gap-3 border-b border-slate-200/60"
      >
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onBack();
          }}
          className="text-slate-700 hover:text-black font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home (← Retour à la boutique)</span>
        </button>
        <span className="text-slate-300">—</span>
        <span className="text-slate-600 font-medium">
          {currentProduct.category || 'Santé & Cosmétique'}
        </span>
        <span className="text-slate-300">—</span>
        <span className="text-slate-900 font-semibold line-clamp-1 max-w-[280px] sm:max-w-md">
          {currentProduct.name}
        </span>
      </nav>

      {/* -------------------------------------------------------------------
          2. GRILLE PRINCIPALE LARGE À 2 GRANDES COLONNES
          ------------------------------------------------------------------- */}
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">

        {/* =================================================================
            COLONNE GAUCHE (lg:col-span-6 — GALERIE + LOUPE CIRCULAIRE)
            ================================================================= */}
        <div className="lg:col-span-6 w-full flex flex-col items-center">
          
          {/* Grand Cadre Image Principal avec Loupe Circulaire Interactive */}
          <div
            onMouseEnter={() => setIsHoveringLens(true)}
            onMouseLeave={() => setIsHoveringLens(false)}
            onMouseMove={handleMouseMove}
            className="w-full aspect-[4/5] bg-[#F7F7F7] relative overflow-hidden rounded-xs cursor-crosshair select-none flex items-center justify-center group"
          >
            {/* Bouton rond blanc avec loupe en haut à droite pour plein écran */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsLightboxOpen(true);
              }}
              title="Agrandir en plein écran"
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-700 hover:text-black hover:scale-105 transition-all cursor-pointer"
              aria-label="Agrandir l'image"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Image Active Principale */}
            <img
              src={activeImageUrl}
              alt={currentProduct.name}
              className="w-full h-full object-contain p-8 sm:p-12 transition-transform duration-300"
              loading="eager"
            />

            {/* 🔥 LA LOUPE CIRCULAIRE INTERACTIVE (Magnifying Glass Lens — 00:47 à 00:54) */}
            {isHoveringLens && (
              <div
                className="w-52 h-52 rounded-full border-2 border-white shadow-[0_15px_35px_rgba(0,0,0,0.35)] pointer-events-none absolute z-30 bg-no-repeat transition-opacity duration-75 hidden sm:block ring-1 ring-black/10"
                style={{
                  left: `${lensPos.x - 104}px`,
                  top: `${lensPos.y - 104}px`,
                  backgroundImage: `url(${activeImageUrl})`,
                  backgroundSize: '220%',
                  backgroundPosition: `${lensPos.xPercent}% ${lensPos.yPercent}%`
                }}
              />
            )}
          </div>

          {/* Rangée de 4 Miniatures Carrées en dessous */}
          <div className="w-full grid grid-cols-4 gap-3.5 sm:gap-4 mt-4 select-none">
            {galleryImages.map((imgUrl, idx) => {
              const isActive = activeImageIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    playTapBeep();
                    setActiveImageIndex(idx);
                  }}
                  className={`aspect-square bg-[#F7F7F7] cursor-pointer overflow-hidden rounded-xs border transition-all flex items-center justify-center p-2.5 ${
                    isActive 
                      ? 'border-black ring-1 ring-black/20 shadow-xs' 
                      : 'border-transparent opacity-75 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Miniature ${idx + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              );
            })}
          </div>

        </div>

        {/* =================================================================
            COLONNE DROITE (lg:col-span-6 — DÉTAILS, VARIANTES & BOUTONS)
            ================================================================= */}
        <div className="lg:col-span-6 w-full flex flex-col justify-start">
          
          {/* 1. Prix EN HAUT (Au-dessus du titre, référence vidéo Glowing) */}
          <div className="flex items-baseline gap-3 mb-1">
            {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
              <span className="text-slate-400 line-through text-base font-normal">
                {formatPrice(currentProduct.originalPrice)}
              </span>
            )}
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatPrice(currentProduct.price)}
            </span>
          </div>

          {/* 2. Grand Titre du Produit */}
          <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 tracking-tight mb-3">
            {currentProduct.name}
          </h1>

          {/* 3. Courte Description d'Accroche */}
          <p className="text-sm text-slate-600 leading-relaxed mb-6 font-normal">
            {getSmartShortDescription(currentProduct, 180)}
          </p>

          {/* 4. Sélecteur de Couleurs / Variantes avec Tooltips Noirs (00:55 - 00:59) */}
          <div className="mb-5">
            <p className="text-sm font-medium text-slate-800 mb-2.5">
              Color: <span className="text-slate-900 font-semibold">{selectedColor?.name || 'Standard'}</span>
            </p>
            <div className="flex items-center gap-3">
              {effectiveColorSwatches.map((swatch, idx) => {
                const isSelected = selectedColor?.id === swatch.id;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setSelectedColor(swatch);
                    }}
                    className={`w-7 h-7 rounded-full cursor-pointer relative group/swatch flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'ring-1 ring-offset-2 ring-black scale-105' 
                        : 'hover:scale-110'
                    } ${swatch.border ? 'border border-slate-300' : ''}`}
                    style={{ backgroundColor: swatch.hex }}
                    aria-label={`Choisir la teinte ${swatch.name}`}
                  >
                    {/* Tooltip noir au survol */}
                    <span className="absolute -top-8 px-2 py-0.5 bg-black text-white text-[11px] font-medium rounded whitespace-nowrap opacity-0 group-hover/swatch:opacity-100 pointer-events-none transition-opacity shadow-sm after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-black">
                      {swatch.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4B. Sélecteur de Formats / Contenances */}
          {effectiveSizeOptions.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Contenance / Format :
              </p>
              <div className="flex items-center gap-2">
                {effectiveSizeOptions.map((sz, sIdx) => {
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setSelectedSize(sz);
                      }}
                      className={`px-3.5 py-1.5 rounded-xs border text-xs font-medium transition cursor-pointer ${
                        isSelected 
                          ? 'border-black bg-black text-white' 
                          : 'border-slate-300 text-slate-700 hover:border-slate-800'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Label Quantity + Ligne Combinée Quantité & Bouton 1 */}
          <div className="mt-2 mb-3.5">
            <label className="text-sm font-medium text-slate-800 block mb-2">
              Quantity
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              {/* Sélecteur de quantité gris très clair à gauche */}
              <div className="w-full sm:w-36 bg-[#F5F5F5] h-12 px-4 flex items-center justify-between text-slate-900 font-medium rounded-xs select-none border border-transparent">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setQuantity(prev => Math.max(1, prev - 1));
                  }}
                  className="w-8 h-full flex items-center justify-center text-slate-500 hover:text-black cursor-pointer text-base"
                  aria-label="Diminuer la quantité"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setQuantity(prev => prev + 1);
                  }}
                  className="w-8 h-full flex items-center justify-center text-slate-500 hover:text-black cursor-pointer text-base"
                  aria-label="Augmenter la quantité"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* BOUTON ACHETER : Caisse Sebpay Principale */}
              <button
                type="button"
                onClick={handleDirectBuy}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-colors rounded-xs flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99]"
                title="Acheter directement via la caisse Checkout Sebpay"
              >
                <span>Acheter (Caisse Sebpay)</span>
              </button>
            </div>

            {/* BOUTON VOIR LE TUNNEL */}
            <button
              type="button"
              onClick={handleBuyWithFunnel}
              className="w-full h-11 mt-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-900 font-semibold text-xs uppercase tracking-wider transition-colors rounded-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
              title="Voir le tunnel de vente 12 blocs"
            >
              <span>⚡ Voir le tunnel</span>
            </button>
          </div>

          {/* BOUTON 🛒 : Ajouter au Panier */}
          <button
            type="button"
            onClick={handleAddToCartAction}
            className="w-full h-12 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors rounded-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>🛒 Ajouter au panier</span>
          </button>

          {/* 🔥 6. BOUTON 2 PLEINE LARGEUR : 💬 Acheter sur Wameet Direct (Noir au repos -> Vert Sauge/Émeraude #4E7661 au survol) */}
          <button
            type="button"
            onClick={handleBuyWithW}
            className="w-full h-12 mt-1 bg-black hover:bg-[#4E7661] text-white font-semibold text-sm transition-colors duration-300 rounded-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <MessageCircle className="w-4 h-4 fill-white shrink-0" />
            <span>💬 Acheter sur Wameet Direct</span>
          </button>

          {/* 6b. BOUTON LIVE SHOPPING : 🔴 Voir en Direct (WebRTC Daily.co) */}
          <div className="w-full mt-2">
            <BuyerLiveCallButton
              productId={currentProduct.id}
              productName={currentProduct.name}
              sellerId={merchantId}
              buttonText="📹 Voir en Direct • Live Shopping"
              className="w-full h-12 bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm rounded-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
            />
          </div>

          {/* 7. Barre des 3 Liens d'Action (⇄ Compare | ☆ Add To Wishlist | 🔗 Share) */}
          <div className="flex items-center gap-6 py-4 mt-4 border-b border-slate-200 text-xs sm:text-sm text-slate-700 select-none">
            {/* Compare */}
            <button
              type="button"
              onClick={handleToggleCompare}
              className={`flex items-center gap-1.5 transition cursor-pointer ${
                isCompared ? 'text-emerald-700 font-semibold' : 'hover:text-black'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>{isCompared ? 'Comparé (✓)' : 'Compare'}</span>
            </button>

            {/* Wishlist */}
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`flex items-center gap-1.5 transition cursor-pointer ${
                isWishlisted ? 'text-amber-600 font-semibold' : 'hover:text-black'
              }`}
            >
              <Star className={`w-4 h-4 ${isWishlisted ? 'fill-amber-400 text-amber-500' : ''}`} />
              <span>{isWishlisted ? 'Wishlist (✓)' : 'Add To Wishlist'}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 hover:text-black transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>

          {/* 8. Infos de Livraison & Retours (01:03) */}
          <div className="py-4 space-y-2 text-xs text-slate-600 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                openStoreLegalModal('shipping');
              }}
              className="flex items-center gap-2 hover:text-blue-700 transition cursor-pointer text-left w-full"
            >
              <Truck className="w-4 h-4 text-slate-700 shrink-0" />
              <span>
                <strong>Estimated Delivery:</strong> {deliveryRangeString}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                openStoreLegalModal('shipping');
              }}
              className="flex items-center gap-2 hover:text-blue-700 transition cursor-pointer text-left w-full"
            >
              <Package className="w-4 h-4 text-slate-700 shrink-0" />
              <span>
                <strong>Free Shipping &amp; Returns:</strong> Livraison rapide &amp; Contrôle qualité avant paiement
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                openStoreLegalModal('terms', true);
              }}
              className="flex items-center gap-2 hover:text-blue-700 transition cursor-pointer text-left w-full"
            >
              <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0" />
              <span>
                <strong>Terms &amp; Conditions:</strong> Garanties &amp; Protection Acheteur 100%
              </span>
            </button>
          </div>

          {/* 9. Boîte Grise des Moyens de Paiement Locaux (Guarantee safe & secure checkout) */}
          <div className="bg-[#F7F7F7] p-5 mt-5 text-center rounded-xs border border-slate-200/70">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              {/* Wave */}
              <div className="px-2.5 py-1 rounded bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-black flex items-center gap-1 shadow-2xs">
                <span>🌊</span>
                <span>Wave</span>
              </div>

              {/* Orange Money */}
              <div className="px-2.5 py-1 rounded bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-black flex items-center gap-1 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                <span>Orange Money</span>
              </div>

              {/* MTN / Moov */}
              <div className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black flex items-center gap-1 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>MTN • Moov</span>
              </div>

              {/* Cash à la livraison */}
              <div className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black flex items-center gap-1 shadow-2xs">
                <span>💵</span>
                <span>Cash Livraison</span>
              </div>

              {/* Carte Visa */}
              <div className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                <span>💳</span>
                <span>Visa • Mastercard</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3 font-normal">
              Guarantee safe &amp; secure checkout
            </p>
          </div>

          {/* 10. Métadonnées Produit (Vendor, Collections, Sku) */}
          <div className="mt-5 space-y-1.5 text-xs text-slate-500">
            <p>
              <strong className="text-slate-800 font-medium">Vendor:</strong>{' '}
              <span className="text-slate-600">{storeName}</span>
            </p>
            <p>
              <strong className="text-slate-800 font-medium">Collections:</strong>{' '}
              <span className="text-slate-600">{currentProduct.category || 'Beauty & Cosmetics, Bestseller, Skincare'}</span>
            </p>
            <p>
              <strong className="text-slate-800 font-medium">Sku:</strong>{' '}
              <span className="text-slate-600">{currentProduct.sku || `#${(currentProduct.id || '501').slice(0, 4).toUpperCase()}`}</span>
            </p>
          </div>

        </div>

      </div>

      {/* -------------------------------------------------------------------
          PROMPT 3 SUR 3 : SECTION 1 - GRANDS ONGLETS CENTRÉS
          (Description Rich Text & Shipping & Return - 01:07 à 01:12)
          ------------------------------------------------------------------- */}
      <section className="mt-16 pt-12 border-t border-slate-200 max-w-[1000px] mx-auto px-4">
        {/* En-tête des 2 Onglets Centrés */}
        <div className="flex items-center justify-center gap-10 sm:gap-14 mb-10 border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('description');
            }}
            className={`text-2xl sm:text-[28px] font-semibold tracking-tight transition-colors cursor-pointer relative py-2 ${
              activeTab === 'description'
                ? 'text-slate-900 border-b-2 border-slate-900 -mb-[18px]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Description
          </button>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('shipping_return');
            }}
            className={`text-2xl sm:text-[28px] font-semibold tracking-tight transition-colors cursor-pointer relative py-2 ${
              activeTab === 'shipping_return'
                ? 'text-slate-900 border-b-2 border-slate-900 -mb-[18px]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Shipping &amp; Return
          </button>
        </div>

        {/* Contenu : Onglet Description */}
        {activeTab === 'description' && (
          <div className="animate-in fade-in duration-300">
            {/* Longue Description Rich Text Universelle */}
            <AdaptiveProductRichText 
              html={getSmartRichDescription(currentProduct)} 
              themeVariant="emerald" 
            />

            {/* Bénéfices & Actifs Clés avec puces • */}
            <div className="mt-10 pt-8 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">
                Bénéfices &amp; Actifs Clés
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                {(currentProduct.keyFeatures && currentProduct.keyFeatures.length > 0 ? currentProduct.keyFeatures : [
                  'Hydratation profonde et restauration de la barrière cutanée naturelle',
                  'Formule concentrée en extraits botaniques bio et antioxydants protecteurs',
                  'Texture soyeuse, absorption instantanée sans fini gras ou collant',
                  'Convient parfaitement à tous les types de peaux, y compris sensibles',
                  'Testé sous contrôle dermatologique, certifié sans parabènes ni sulfates'
                ]).map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-[#4E7661] font-bold text-xl leading-none select-none">•</span>
                    <span className="leading-relaxed">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Contenu : Onglet Shipping & Return */}
        {activeTab === 'shipping_return' && (
          <div className="animate-in fade-in duration-300 space-y-8 text-slate-600 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 p-6 sm:p-8 rounded-2xl border border-slate-100">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-[#4E7661]">
                  <Truck className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-slate-900 text-base">
                  Expédition &amp; Livraison Express
                </h4>
                <p className="text-slate-500 leading-relaxed text-xs sm:text-sm">
                  Toutes les commandes sont emballées avec le plus grand soin et expédiées sous 24h à 48h ouvrées. Suivi de colis en direct par SMS et Wameet Direct dès la prise en charge par le coursier.
                </p>
                <div className="text-xs text-[#4E7661] font-medium pt-1">
                  ✓ Livraison estimée : {deliveryRangeString}
                </div>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-[#B85D3B]">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-slate-900 text-base">
                  Politique de Retours &amp; Échanges
                </h4>
                <p className="text-slate-500 leading-relaxed text-xs sm:text-sm">
                  Vous disposez d'un délai de 14 jours francs après réception pour effectuer un retour si le soin ne convient pas. Le produit doit être dans son emballage d'origine non ouvert.
                </p>
                <div className="text-xs text-[#B85D3B] font-medium pt-1">
                  ✓ Retour garanti et remboursement rapide
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-6">
              <h4 className="font-semibold text-slate-900 text-base">
                Charte Fraîcheur &amp; Rassurance Beauté
              </h4>
              <p className="leading-relaxed">
                Nos flacons et crèmes sont stockés à l'abri de la lumière et de la chaleur dans des conditions rigoureuses pour préserver l'efficacité biologique de chaque principe actif.
              </p>
              <p className="text-xs text-slate-400">
                Pour toute question spécifique sur votre livraison ou une recommandation d'utilisation personnalisée, notre équipe est à votre écoute par message direct.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* -------------------------------------------------------------------
          PROMPT 3 SUR 3 : SECTION 2 - YOU MAY ALSO LIKE
          (4 Cartes Produits Recommandés Cosmétiques - 01:13 à 01:25)
          ------------------------------------------------------------------- */}
      <section className="mt-20 mb-28 max-w-[1360px] mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            You May Also Like
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Complétez votre rituel beauté avec nos soins les plus appréciés
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
          {relatedProducts.map((relProduct) => {
            const hasRelDiscount = Boolean(relProduct.originalPrice && relProduct.originalPrice > relProduct.price);
            const isRelNew = Boolean(
              relProduct.isNew || 
              (relProduct.badge && relProduct.badge.toLowerCase() === 'new') ||
              (relProduct.badge && relProduct.badge.toLowerCase().includes('nouveau'))
            );
            const isRelSale = Boolean(
              hasRelDiscount || 
              (relProduct.badge && relProduct.badge.toLowerCase() === 'sale') ||
              (relProduct.badge && relProduct.badge.toLowerCase().includes('promo'))
            );

            const relPrimaryImage = relProduct.image || relProduct.photoUrl || (relProduct.images && relProduct.images[0]) || FALLBACK_GLOWING_GALLERY[0];
            const relSecondaryImage = (relProduct.images && relProduct.images[1]) || (relProduct.images && relProduct.images.length > 1 ? relProduct.images[1] : null);
            const hasRelSecondImage = Boolean(relSecondaryImage && relSecondaryImage !== relPrimaryImage);

            return (
              <div 
                key={relProduct.id} 
                className="group flex flex-col items-center select-none"
              >
                {/* 1. Cadre Image avec Hover Swap & 4 Boutons Ronds Flottants */}
                <div 
                  onClick={() => handleSelectRelatedProduct(relProduct)}
                  className="w-full aspect-[3/4] bg-[#F7F7F7] relative overflow-hidden rounded-xs cursor-pointer flex items-center justify-center"
                >
                  {/* Badges New / Sale */}
                  <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start pointer-events-none">
                    {isRelNew && (
                      <span className="bg-[#B85D3B] text-white text-[10px] font-semibold px-2 py-0.5 rounded-[2px] tracking-wide uppercase">
                        New
                      </span>
                    )}
                    {isRelSale && (
                      <span className="bg-[#4E7661] text-white text-[10px] font-semibold px-2 py-0.5 rounded-[2px] tracking-wide uppercase">
                        Sale
                      </span>
                    )}
                    {!isRelNew && !isRelSale && relProduct.badge && (
                      <span className="bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-[2px] tracking-wide uppercase">
                        {relProduct.badge}
                      </span>
                    )}
                  </div>

                  {/* Images avec Hover Swap */}
                  <div className="w-full h-full p-4 sm:p-6 flex items-center justify-center relative">
                    <img
                      src={relPrimaryImage}
                      alt={relProduct.name}
                      className={`w-full h-full object-contain transition-all duration-700 ease-out ${
                        hasRelSecondImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'
                      }`}
                      loading="lazy"
                    />
                    {hasRelSecondImage && (
                      <img
                        src={relSecondaryImage!}
                        alt={`${relProduct.name} vue alternative`}
                        className="absolute inset-0 w-full h-full object-contain p-4 sm:p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* 4 Boutons Ronds Flottants au Survol */}
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-auto"
                  >
                    {/* Tunnel */}
                    <button
                      type="button"
                      onClick={() => {
                        playValidationBeep();
                        triggerOpenFunnel(relProduct.linkedFunnelId || relProduct.id, relProduct.name, relProduct);
                      }}
                      className="w-9 h-9 rounded-full bg-white text-slate-900 hover:bg-black hover:text-white shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer"
                      title="Voir le tunnel"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span className="absolute -top-8 px-2 py-0.5 bg-black text-white text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        Tunnel
                      </span>
                    </button>

                    {/* Quick View */}
                    <button
                      type="button"
                      onClick={() => handleSelectRelatedProduct(relProduct)}
                      className="w-9 h-9 rounded-full bg-white text-slate-900 hover:bg-black hover:text-white shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer"
                      title="Quick View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="absolute -top-8 px-2 py-0.5 bg-black text-white text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        Voir
                      </span>
                    </button>

                    {/* Wishlist */}
                    <button
                      type="button"
                      onClick={() => {
                        playValidationBeep();
                        showToast(`✨ ${relProduct.name} ajouté aux favoris !`);
                      }}
                      className="w-9 h-9 rounded-full bg-white text-slate-900 hover:bg-black hover:text-white shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer"
                      title="Favoris"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span className="absolute -top-8 px-2 py-0.5 bg-black text-white text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        Favoris
                      </span>
                    </button>

                    {/* Compare */}
                    <button
                      type="button"
                      onClick={() => {
                        playValidationBeep();
                        showToast(`⚖️ ${relProduct.name} ajouté au comparateur !`);
                      }}
                      className="w-9 h-9 rounded-full bg-white text-slate-900 hover:bg-black hover:text-white shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer"
                      title="Comparer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span className="absolute -top-8 px-2 py-0.5 bg-black text-white text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        Comparer
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Texte : Prix AU-DESSUS du Titre (Style Shopify Glowing) */}
                <div className="w-full text-center pt-3 flex flex-col items-center">
                  <div className="flex items-center justify-center gap-2">
                    {hasRelDiscount && (
                      <span className="text-slate-400 line-through text-xs">
                        {relProduct.originalPrice?.toLocaleString('fr-FR')} FCFA
                      </span>
                    )}
                    <span className="text-slate-900 font-bold text-sm">
                      {relProduct.price.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  <h3 
                    onClick={() => handleSelectRelatedProduct(relProduct)}
                    className="text-xs sm:text-sm font-medium text-slate-800 hover:text-[#4E7661] mt-1 transition-colors cursor-pointer line-clamp-1 max-w-full"
                    title={relProduct.name}
                  >
                    {relProduct.name}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------------------
          PROMPT 3 SUR 3 : SECTION 3 - BARRE COLLANTE EN BAS D'ÉCRAN
          (Sticky Bottom Bar au scroll - 01:26 à 01:37)
          ------------------------------------------------------------------- */}
      <aside 
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-2.5 px-3 sm:px-6 transition-all duration-300 ease-in-out ${
          showStickyBar 
            ? 'translate-y-0 opacity-100 pointer-events-auto' 
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* Gauche : Miniature + Titre + Prix */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={activeImageUrl}
              alt={currentProduct.name}
              className="w-11 h-11 object-contain bg-[#F7F7F7] border border-slate-200 rounded-xs shrink-0"
            />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                {currentProduct.name}
              </h4>
              <div className="flex items-center gap-2">
                {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                  <span className="text-[11px] text-slate-400 line-through">
                    {currentProduct.originalPrice.toLocaleString('fr-FR')} FCFA
                  </span>
                )}
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {currentProduct.price.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          </div>

          {/* Centre / Droite : Variantes, Stepper Quantité & Boutons d'Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Pastille de variante active (desktop) */}
            {selectedColor && (
              <div className="hidden lg:flex items-center gap-1.5 border border-slate-200 px-2.5 py-1.5 rounded-xs text-xs">
                <span 
                  className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <span className="text-slate-600 font-medium">{selectedColor.name}</span>
              </div>
            )}

            {/* Stepper Quantité */}
            <div className="hidden sm:flex items-center border border-slate-300 rounded-xs h-9 w-24">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setQuantity(q => Math.max(1, q - 1));
                }}
                className="w-7 h-full flex items-center justify-center text-slate-500 hover:text-black cursor-pointer"
                aria-label="Diminuer la quantité"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="flex-1 text-center font-bold text-xs text-slate-900">{quantity}</span>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setQuantity(q => q + 1);
                }}
                className="w-7 h-full flex items-center justify-center text-slate-500 hover:text-black cursor-pointer"
                aria-label="Augmenter la quantité"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* BOUTON ACHETER : Caisse Sebpay */}
            <button
              type="button"
              onClick={handleDirectBuy}
              className="h-9 sm:h-10 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              title="Acheter via la caisse Sebpay"
            >
              <span>Acheter</span>
            </button>

            {/* BOUTON NOIR : ⚡ Voir le tunnel */}
            <button
              type="button"
              onClick={handleBuyWithFunnel}
              className="h-9 sm:h-10 px-3 sm:px-4 bg-black hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              title="Voir le tunnel"
            >
              <span className="whitespace-nowrap">⚡ Tunnel</span>
            </button>

            {/* BOUTON VERT : 💬 Wameet Direct */}
            <button
              type="button"
              onClick={handleBuyWithW}
              className="h-9 sm:h-10 px-3 sm:px-4 bg-[#4E7661] hover:bg-[#3D5E4D] text-white font-medium text-xs sm:text-sm rounded-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              title="Acheter sur Wameet Direct"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Wameet Direct</span>
            </button>

            {/* Boutons Secondaires Wishlist & Comparer */}
            <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={handleToggleWishlist}
                className={`p-2 rounded-full hover:bg-slate-100 transition cursor-pointer ${
                  isWishlisted ? 'text-amber-500' : 'text-slate-400 hover:text-black'
                }`}
                title="Favoris"
              >
                <Star className={`w-4 h-4 ${isWishlisted ? 'fill-amber-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleToggleCompare}
                className={`p-2 rounded-full hover:bg-slate-100 transition cursor-pointer ${
                  isCompared ? 'text-emerald-600' : 'text-slate-400 hover:text-black'
                }`}
                title="Comparer"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------------
          MODALE LIGHTBOX PLEIN ÉCRAN POUR L'IMAGE
          ------------------------------------------------------------------- */}
      {isLightboxOpen && (
        <div 
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
            aria-label="Fermer la vue plein écran"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeImageUrl}
            alt={currentProduct.name}
            className="max-h-[90vh] max-w-[90vw] object-contain select-none shadow-2xl"
          />
        </div>
      )}

      {/* -------------------------------------------------------------------
          MODALE DE PARTAGE RAPIDE
          ------------------------------------------------------------------- */}
      {showShareModal && (
        <div 
          onClick={() => setShowShareModal(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold text-sm text-slate-900">Partager ce soin</h3>
              <button 
                type="button" 
                onClick={() => setShowShareModal(false)} 
                className="text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(currentProduct.slug || currentProduct.productSlug || currentProduct.id)}` : ''}
                className="w-full px-3 py-2 bg-slate-100 rounded text-xs text-slate-700 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined') {
                    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(currentProduct.slug || currentProduct.productSlug || currentProduct.id)}`;
                    navigator.clipboard.writeText(shareUrl);
                    showToast('Lien direct produit copié !');
                    setShowShareModal(false);
                  }
                }}
                className="px-3 py-2 bg-black text-white text-xs font-semibold rounded shrink-0 cursor-pointer hover:bg-slate-800"
              >
                Copier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          TOAST FEEDBACK TEMPORAIRE
          ------------------------------------------------------------------- */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200 border border-slate-700 select-none">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

export default GlowingWideProductView;
