import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  ShoppingBag, 
  ShoppingCart, 
  Phone, 
  MapPin, 
  Menu,
  ChevronRight,
  Sparkles,
  Tag,
  Zap,
  MessageCircle,
  X,
  Check,
  Star,
  Minus,
  Plus,
  Gem,
  Info,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Truck,
  Eye
} from 'lucide-react';
import { StoreProductItem } from './types';
import { BuyerLiveCallButton } from '../../../../components/live/BuyerLiveCallButton';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { triggerOpenFunnel } from '../../../../themes/themeUtils';
import { addToSmartCart } from './SmartSlideOutCartDrawer';
import { openStoreLegalModal } from './StoreLegalAndTrackingModals';
import { triggerOrderConfirmationVault } from './OrderConfirmationVaultModal';
import { trackViewContent, trackInitiateCheckout, trackWLead } from '../../../../utils/pixelTrackingEngine';
import { recordWLeadOrder } from '../../../../utils/firestoreService';
import { 
  getSmartShortDescription, 
  getSmartRichDescription, 
  AdaptiveProductRichText 
} from './AdaptiveProductRichText';

export interface ShopifyWideProductViewProps {
  product: StoreProductItem;
  allProducts?: StoreProductItem[];
  categories?: string[];
  storeName?: string;
  wPhone?: string;
  wNumber?: string;
  onBack: () => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onAddToCart?: (product: StoreProductItem, quantity?: number) => void;
  onBuyNow?: (product: StoreProductItem, quantity?: number) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
}

// Catégories de référence Shopify "You&Me Shop"
const DEFAULT_SHOPIFY_CATEGORIES = [
  'Shop Layout',
  'Mother & Baby',
  'Health & Beauty',
  'Electronics',
  'Home, Garden',
  'Kitchen Utensils',
  'Clothing & Shoes',
  'Laptop & Macbook',
  'Books - Gifts',
  'Outdoors',
  'Pet Supplies',
  'Furniture'
];

// Fallback images haute qualité pour enrichir la galerie centrale si le produit n'a qu'une seule image
const FALLBACK_GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&auto=format&fit=crop&q=80'
];

export const ShopifyWideProductView: React.FC<ShopifyWideProductViewProps> = ({
  product,
  allProducts = [],
  categories = [],
  storeName = 'You&Me Shop',
  wPhone = '1900 - 6789',
  wNumber = '',
  onBack,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  isPublicView = false,
  isAdminPreview = false
}) => {
  const effectiveWPhone = wPhone || wNumber;
  // =========================================================================
  // HOOKS REACT STRICTEMENT AU DESSUS (Règle React #310 Zéro Erreur)
  // =========================================================================
  const [currentProduct, setCurrentProduct] = useState<StoreProductItem>(product);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState<boolean>(true);
  const [isBestSaleOpen, setIsBestSaleOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');

  // États Prompt 2/4 : Variantes, Quantité, Modales & Notifications
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<{ id: string; name: string; hex: string; border?: boolean } | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('S');
  const [showRewardInfo, setShowRewardInfo] = useState<boolean>(false);
  const [showSizeChartModal, setShowSizeChartModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewAuthor, setReviewAuthor] = useState<string>('');
  const [reviewContent, setReviewContent] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);
  const [addedToCartToast, setAddedToCartToast] = useState<boolean>(false);

  // Nouveaux états Prompt 3/4 : CGV, Compte à rebours, Questions & Preuve Sociale
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);

  // Synchronisation automatique : quand l'utilisateur accepte les CGV dans la modale, cocher la case
  useEffect(() => {
    const handleAcceptTerms = () => {
      setAgreedToTerms(true);
    };
    window.addEventListener('nana:accept_terms', handleAcceptTerms);
    return () => window.removeEventListener('nana:accept_terms', handleAcceptTerms);
  }, []);

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 14,
    minutes: 28,
    seconds: 45
  });
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showAskQuestionModal, setShowAskQuestionModal] = useState<boolean>(false);
  const [askQuestionText, setAskQuestionText] = useState<string>('');
  const [showSocialProof, setShowSocialProof] = useState<boolean>(true);
  const [socialProofIndex, setSocialProofIndex] = useState<number>(0);

  // État Onglets Bas de Page Prompt 4/4 : Description, Spécifications & Avis Clients
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');

  // État Wishlist et Toast personnalisé (You May Also Like)
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [customToastMessage, setCustomToastMessage] = useState<string | null>(null);

  // État Barre Collante (Sticky Bottom Bar) au scroll
  const [showStickyBar, setShowStickyBar] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

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

  // Synchronisation si la prop product change depuis le parent
  useEffect(() => {
    if (product) {
      setCurrentProduct(product);
      setActiveImageIndex(0);
      setQuantity(1);
    }
  }, [product]);

  // Compte à rebours de livraison dynamique (qui décrémente chaque seconde)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return { days: 0, hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Date de livraison estimée à J+2
  const estimatedDeliveryDateString = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dayName} ${dd}/${mm}/${yyyy}`;
  }, []);

  // Liste des catégories effectives (celles de la boutique + fallbacks Shopify)
  const effectiveCategories = useMemo(() => {
    const list: string[] = [];
    if (categories && categories.length > 0) {
      categories.forEach(c => {
        if (c && !list.includes(c)) list.push(c);
      });
    }
    DEFAULT_SHOPIFY_CATEGORIES.forEach(c => {
      if (!list.includes(c)) list.push(c);
    });
    return list;
  }, [categories]);

  // Produits Best Sale (3 à 4 produits)
  const bestSaleProducts = useMemo(() => {
    const others = allProducts.filter(p => p.id !== currentProduct?.id);
    if (others.length >= 3) {
      return others.slice(0, 4);
    }

    const fallbackBestsellers: StoreProductItem[] = [
      {
        id: 'bs-headset-01',
        name: 'Wireless Headset Noise Cancelling Pro',
        price: 200,
        originalPrice: 300,
        category: 'Electronics',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80',
        stock: 15
      },
      {
        id: 'bs-gamepad-02',
        name: 'Gamepad Wireless Controller Edition',
        price: 85,
        originalPrice: 120,
        category: 'Electronics',
        image: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=500&auto=format&fit=crop&q=80',
        stock: 22
      },
      {
        id: 'bs-watch-03',
        name: 'Smartwatch Series 8 Waterproof OLED',
        price: 150,
        originalPrice: 220,
        category: 'Electronics',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
        stock: 18
      },
      {
        id: 'bs-stand-04',
        name: 'Ergonomic Aluminum Laptop Stand',
        price: 45,
        originalPrice: 70,
        category: 'Laptop & Macbook',
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=80',
        stock: 30
      }
    ];

    const merged = [...others];
    fallbackBestsellers.forEach(fb => {
      if (merged.length < 4 && !merged.some(m => m.id === fb.id)) {
        merged.push(fb);
      }
    });
    return merged.slice(0, 4);
  }, [allProducts, currentProduct]);

  // Candidats pour la preuve sociale "Other customer are viewing"
  const socialProofCandidates = useMemo(() => {
    const list = allProducts.filter(p => p.id !== currentProduct?.id);
    if (list.length > 0) return list;
    return bestSaleProducts;
  }, [allProducts, currentProduct?.id, bestSaleProducts]);

  // Alternance automatique du produit dans le popup flottant toutes les 10 secondes
  useEffect(() => {
    if (socialProofCandidates.length <= 1) return;
    const interval = setInterval(() => {
      setSocialProofIndex(prev => (prev + 1) % socialProofCandidates.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [socialProofCandidates.length]);

  const currentSocialProofProduct = useMemo(() => {
    return socialProofCandidates[socialProofIndex] || socialProofCandidates[0] || null;
  }, [socialProofCandidates, socialProofIndex]);

  // Produits recommandés pour "You May Also Like" :
  // Priorise la même catégorie que le produit affiché, puis les autres produits de la boutique,
  // et complète avec les fallbacks si la boutique a moins de 4 produits.
  const youMayAlsoLikeProducts = useMemo(() => {
    const currentId = currentProduct?.id;
    const currentCat = (currentProduct?.category || '').trim().toLowerCase();

    // 1. Même catégorie (excluant le produit actuel)
    const sameCategory = allProducts.filter(
      p => p.id !== currentId && p.category && p.category.trim().toLowerCase() === currentCat
    );

    // 2. Autres catégories (excluant le produit actuel)
    const otherProducts = allProducts.filter(
      p => p.id !== currentId && (!p.category || p.category.trim().toLowerCase() !== currentCat)
    );

    const merged = [...sameCategory, ...otherProducts];

    // Fallbacks si le catalogue compte moins de 4 produits
    const fallbackList: StoreProductItem[] = [
      {
        id: 'rec-sound-01',
        name: 'Wireless Bluetooth Noise Cancelling Headphones',
        price: 180,
        originalPrice: 240,
        badge: 'Sale',
        category: currentProduct?.category || 'Electronics',
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
        images: [
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
        ],
        stock: 19
      },
      {
        id: 'rec-watch-02',
        name: 'Smart Fitness Tracker Water Resistant OLED',
        price: 95,
        badge: 'New',
        isNew: true,
        category: currentProduct?.category || 'Electronics',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
        images: [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80'
        ],
        stock: 24
      },
      {
        id: 'rec-speaker-03',
        name: 'Portable High Bass Surround Sound Speaker',
        price: 65,
        originalPrice: 99,
        badge: 'Sale',
        category: currentProduct?.category || 'Electronics',
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
        images: [
          'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1608248597359-335606443657?w=800&auto=format&fit=crop&q=80'
        ],
        stock: 12
      },
      {
        id: 'rec-mouse-04',
        name: 'Precision Wireless Ergonomic Gaming Mouse RGB',
        price: 49,
        category: currentProduct?.category || 'Electronics',
        image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
        images: [
          'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80'
        ],
        stock: 35
      }
    ];

    fallbackList.forEach(fb => {
      if (merged.length < 4 && !merged.some(p => p.id === fb.id) && fb.id !== currentId) {
        merged.push(fb);
      }
    });

    return merged.slice(0, 4);
  }, [allProducts, currentProduct?.id, currentProduct?.category]);

  // Galerie d'images multi-angles pour le produit actif (au moins 4 miniatures garanties)
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (currentProduct?.image) {
      list.push(currentProduct.image);
    }
    if ((currentProduct as any)?.galleryImages && Array.isArray((currentProduct as any).galleryImages)) {
      (currentProduct as any).galleryImages.forEach((img: string) => {
        if (img && !list.includes(img)) list.push(img);
      });
    }

    let fallbackIdx = 0;
    while (list.length < 4) {
      const fb = FALLBACK_GALLERY_IMAGES[fallbackIdx % FALLBACK_GALLERY_IMAGES.length];
      if (!list.includes(fb)) {
        list.push(fb);
      } else {
        list.push(`${fb}&variation=${list.length}`);
      }
      fallbackIdx++;
    }

    return list;
  }, [currentProduct]);

  // Image active actuelle en haute définition
  const activeImageUrl = useMemo(() => {
    return galleryImages[activeImageIndex] || galleryImages[0] || currentProduct?.image || '';
  }, [galleryImages, activeImageIndex, currentProduct]);

  // Pastilles de Couleurs par défaut (si product.colorSwatches est vide)
  const defaultColorSwatches = useMemo(() => [
    { id: 'black', name: 'Black', hex: '#000000' },
    { id: 'red', name: 'Red', hex: '#EF4444' },
    { id: 'white', name: 'White', hex: '#FFFFFF', border: true }
  ], []);

  // Pastilles de Couleurs effectives
  const effectiveColorSwatches = useMemo(() => {
    if (currentProduct?.colorSwatches && currentProduct.colorSwatches.length > 0) {
      return currentProduct.colorSwatches.map((c, i) => ({
        id: `swatch-${i}`,
        name: c.name || `Couleur ${i + 1}`,
        hex: c.hex,
        border: (c.hex || '').toLowerCase() === '#ffffff'
      }));
    }
    return defaultColorSwatches;
  }, [currentProduct?.colorSwatches, defaultColorSwatches]);

  // Options de Tailles effectives
  const effectiveSizeOptions = useMemo(() => {
    if (currentProduct?.sizeOptions && currentProduct.sizeOptions.length > 0) {
      return currentProduct.sizeOptions;
    }
    return ['S', 'M', 'XL'];
  }, [currentProduct?.sizeOptions]);

  // Calcul des Points de Fidélité
  const rewardPoints = useMemo(() => {
    const rawPrice = currentProduct?.price || 0;
    return Math.max(10, Math.round(rawPrice / 100));
  }, [currentProduct?.price]);

  // Synchronisation des variantes initiales
  useEffect(() => {
    if (effectiveColorSwatches.length > 0) {
      setSelectedColor(effectiveColorSwatches[0]);
    }
  }, [effectiveColorSwatches]);

  useEffect(() => {
    if (effectiveSizeOptions.length > 0) {
      setSelectedSize(effectiveSizeOptions[0]);
    }
  }, [effectiveSizeOptions]);

  // Gestion des clics / navigation
  const handleSelectProduct = useCallback((newProd: StoreProductItem) => {
    playTapBeep();
    setCurrentProduct(newProd);
    setActiveImageIndex(0);
    setQuantity(1);
    if (onSelectProduct) {
      onSelectProduct(newProd);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [onSelectProduct]);

  const showCustomToast = useCallback((msg: string) => {
    setCustomToastMessage(msg);
    setTimeout(() => setCustomToastMessage(null), 2500);
  }, []);

  const handlePrevImage = useCallback(() => {
    playTapBeep();
    setActiveImageIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1));
  }, [galleryImages.length]);

  const handleNextImage = useCallback(() => {
    playTapBeep();
    setActiveImageIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0));
  }, [galleryImages.length]);

  const handleCategoryClick = useCallback((catName: string) => {
    playTapBeep();
    setSelectedCategory(catName);
    const found = allProducts.find(p => p.category?.toLowerCase() === catName.toLowerCase());
    if (found) {
      handleSelectProduct(found);
    }
  }, [allProducts, handleSelectProduct]);

  // Actions de conversion Nanasore
  const handleBuyNowDirect = useCallback(() => {
    playValidationBeep();
    trackInitiateCheckout(currentProduct, 'direct');
    if (onBuyNow) {
      onBuyNow(currentProduct, quantity);
    }
  }, [currentProduct, quantity, onBuyNow]);

  const handleOpenDirectTunnel = useCallback(() => {
    playValidationBeep();
    trackInitiateCheckout(currentProduct, 'tunnel');
    triggerOpenFunnel(currentProduct.linkedFunnelId || currentProduct.slug || currentProduct.id, currentProduct.name, currentProduct);
  }, [currentProduct]);

  const handleAddToCartAction = useCallback(() => {
    playValidationBeep();
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2500);

    addToSmartCart({
      ...currentProduct,
      selectedColor: selectedColor?.name,
      selectedSize
    } as any, quantity, selectedColor?.name, selectedSize);

    if (onAddToCart) {
      onAddToCart({
        ...currentProduct,
        selectedColor: selectedColor?.name,
        selectedSize
      } as any, quantity);
    }
  }, [currentProduct, selectedColor, selectedSize, quantity, onAddToCart]);

  const handleWOrder = useCallback(() => {
    playTapBeep();
    const cleanPhone = (effectiveWPhone || '2250700000000').replace(/[^0-9]/g, '');
    const totalAmount = (currentProduct.price || 0) * quantity;
    const colorTxt = selectedColor?.name || 'Standard';
    const sizeTxt = selectedSize || 'Standard';
    const orderNum = `CMD-${Date.now().toString().slice(-6)}`;

    // Tracking Pixel : Déclenchement automatique Lead Wameet
    trackWLead(currentProduct, totalAmount);

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
      totalAmount,
      sourceModule: 'shopify_wide_view'
    });

    // Ouverture automatique du Coffre de Confirmation Post-Achat Nanasore
    triggerOrderConfirmationVault({
      orderId: orderNum,
      orderNumber: orderNum,
      storeName,
      wNumber: cleanPhone,
      items: [{
        name: currentProduct.name,
        price: currentProduct.price || 0,
        quantity,
        category: currentProduct.category,
        color: selectedColor?.name,
        size: selectedSize,
        image: currentProduct.image
      }],
      subtotal: totalAmount,
      total: totalAmount,
      isDigitalOrder: false
    });

    const message = `Bonjour ! Je souhaite commander : ${currentProduct.name} (Couleur: ${colorTxt}, Taille: ${sizeTxt}, Quantité: ${quantity}) au prix de ${totalAmount.toLocaleString('fr-FR')} FCFA. Réf: #${orderNum}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }, [effectiveWPhone, currentProduct, quantity, selectedColor, selectedSize, storeName]);

  // Partage réseaux sociaux avec deep-linking URL ?product=slug
  const handleShare = useCallback((platform: 'f' | 'w' | 'copy' | 'twitter' | 'pinterest') => {
    playTapBeep();
    if (typeof window === 'undefined') return;
    const prodSlug = currentProduct.slug || currentProduct.productSlug || currentProduct.id;
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(prodSlug)}`;
    const title = encodeURIComponent(`Découvrez ${currentProduct.name} sur ${storeName} !`);

    if (platform === 'f') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer,width=600,height=450');
    } else if (platform === 'w') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`Regardez ce produit : ${currentProduct.name} 👉 ${shareUrl}`)}`, '_blank');
    } else if (platform === 'copy') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${title}`, '_blank', 'noopener,noreferrer,width=600,height=450');
    } else if (platform === 'pinterest') {
      window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(activeImageUrl)}&description=${title}`, '_blank', 'noopener,noreferrer,width=600,height=450');
    }
  }, [currentProduct.slug, currentProduct.productSlug, currentProduct.id, currentProduct.name, storeName, activeImageUrl]);

  // Envoi de question via Wameet Direct
  const handleSendQuestionW = useCallback(() => {
    playTapBeep();
    const cleanPhone = (effectiveWPhone || '2250700000000').replace(/[^0-9]/g, '');
    const msg = `Bonjour ! J'ai une question concernant le produit "${currentProduct.name}" : ${askQuestionText || "Pouvez-vous me donner plus de précisions sur ce produit ?"}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setShowAskQuestionModal(false);
    setAskQuestionText('');
  }, [effectiveWPhone, currentProduct.name, askQuestionText]);

  // Formatage du prix
  const formatPrice = (amount?: number) => {
    if (amount === undefined || amount === null) return '$0.00';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // =========================================================================
  // RENDU DU COMPOSANT
  // =========================================================================
  return (
    <div className="w-full bg-white text-slate-900 border-t border-slate-100 min-h-screen relative">
      {/* -------------------------------------------------------------------
          BARRE SUPÉRIEURE E-COMMERCE STYLE SHOPIFY "YOU&ME SHOP"
          ------------------------------------------------------------------- */}
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Marque */}
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 group cursor-pointer text-left"
              title="Retour à la boutique"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-blue-900 leading-none">
                  {storeName}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  Shopify Experience
                </span>
              </div>
            </button>
          </div>

          {/* Barre de Recherche Centrale avec Dropdown Catégories & Bouton Bleu */}
          <div className="flex-1 max-w-xl mx-auto hidden md:flex items-center border-2 border-blue-600 rounded-lg overflow-hidden bg-white shadow-xs">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-r border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 shrink-0">
              <Menu className="w-3.5 h-3.5 text-slate-500" />
              <span className="line-clamp-1 max-w-[110px]">{selectedCategory}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 px-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none"
            />
            <button 
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 flex items-center justify-center transition cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Raccourcis Droite : Localisation, Hotline, Panier */}
          <div className="flex items-center gap-5 sm:gap-7 shrink-0">
            {/* Select location */}
            <div className="hidden lg:flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-slate-500" />
              <div className="text-left text-xs leading-tight">
                <span className="text-[10px] text-slate-400 block font-normal">Select location</span>
                <span className="font-bold text-slate-800">United States</span>
              </div>
            </div>

            {/* Hotline */}
            <div className="hidden sm:flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-slate-500" />
              <div className="text-left text-xs leading-tight">
                <span className="text-[10px] text-slate-400 block font-normal">Hotline</span>
                <span className="font-bold text-slate-800">{effectiveWPhone}</span>
              </div>
            </div>

            {/* CART (0) */}
            <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-slate-800" />
                <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  0
                </span>
              </div>
              <div className="text-left text-xs leading-tight hidden xs:block">
                <span className="text-[10px] font-bold text-slate-700 block">CART (0)</span>
                <span className="font-bold text-slate-900">$0.00 USD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------
          CONTENEUR PRINCIPAL PLEINE LARGEUR (max-w-[1440px])
          ------------------------------------------------------------------- */}
      <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
        {/* Fil d'Ariane (Breadcrumb) & Bouton Retour Direct à la boutique */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 text-sm">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-slate-500">
            <button
              type="button"
              onClick={onBack}
              className="text-slate-600 hover:text-blue-600 font-medium cursor-pointer transition-colors"
            >
              Home
            </button>
            <span className="text-slate-300 font-normal">&gt;</span>
            <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
              {currentProduct?.name || 'Détails du produit'}
            </span>
          </nav>

          {/* Bouton de fermeture / retour direct au module grid */}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Retour à la boutique (Home)</span>
          </button>
        </div>

        {/* -------------------------------------------------------------------
            GRILLE PRINCIPALE PLEINE LARGEUR EN 3 COLONNES (3 / 5 / 4)
            ------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">
          
          {/* =================================================================
              1. COLONNE GAUCHE (lg:col-span-3 — Accordéons Categories & Best Sale)
              ================================================================= */}
          <aside className="lg:col-span-3 w-full space-y-6">
            
            {/* SECTION 1 : CATEGORIES ^ (Accordéon ouvert par défaut) */}
            <div className="border-b border-slate-200 pb-6">
              <div 
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                className="text-lg font-medium text-blue-600 flex items-center justify-between cursor-pointer select-none py-1 group"
              >
                <span className="group-hover:underline">Categories</span>
                <span className="text-blue-600 p-1">
                  {isCategoriesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </span>
              </div>

              {isCategoriesOpen && (
                <ul className="mt-3 space-y-0.5">
                  {effectiveCategories.map((cat, idx) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => handleCategoryClick(cat)}
                          className={`w-full text-left py-1.5 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                            isSelected 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-slate-700 hover:text-blue-600'
                          }`}
                        >
                          <span>{cat}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* SECTION 2 : BEST SALE ^ (Accordéon ouvert par défaut) */}
            <div>
              <div 
                onClick={() => setIsBestSaleOpen(!isBestSaleOpen)}
                className="text-lg font-medium text-blue-600 flex items-center justify-between cursor-pointer mb-4 select-none group"
              >
                <span className="group-hover:underline">Best Sale</span>
                <span className="text-blue-600 p-1">
                  {isBestSaleOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </span>
              </div>

              {isBestSaleOpen && (
                <div className="space-y-4">
                  {bestSaleProducts.map((item) => {
                    const isCurrent = item.id === currentProduct?.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectProduct(item)}
                        className={`flex items-center gap-3.5 p-2 rounded-xl transition cursor-pointer group ${
                          isCurrent 
                            ? 'bg-blue-50/70 ring-1 ring-blue-300' 
                            : 'hover:bg-slate-50'
                        }`}
                        title={`Afficher ${item.name}`}
                      >
                        {/* Miniature carrée */}
                        <div className="w-16 h-16 rounded border border-slate-200 overflow-hidden shrink-0 bg-white flex items-center justify-center">
                          <img
                            src={item.image || FALLBACK_GALLERY_IMAGES[0]}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Informations Produit */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </h4>
                          <span className="text-[11px] font-medium text-blue-500 block mt-0.5">
                            From
                          </span>
                          <div className="flex items-center mt-0.5">
                            <span className="text-sm font-bold text-blue-600">
                              {formatPrice(item.price)}
                            </span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-xs text-slate-400 line-through ml-1.5 font-normal">
                                {formatPrice(item.originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </aside>

          {/* =================================================================
              2. COLONNE CENTRALE (lg:col-span-5 — Galerie Photo Shopify You&Me)
              ================================================================= */}
          <main className="lg:col-span-5 w-full flex flex-col items-center">
            
            {/* Grand Cadre Photo Principal */}
            <div className="w-full aspect-square bg-white border border-slate-100 rounded-none lg:rounded-md p-4 flex items-center justify-center overflow-hidden relative group shadow-xs">
              <img
                src={activeImageUrl}
                alt={currentProduct?.name || 'Vue produit'}
                className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-105 select-none"
              />

              {/* Badge éventuel */}
              {currentProduct?.badge && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-[11px] uppercase tracking-wider shadow-sm">
                    {currentProduct.badge}
                  </span>
                </div>
              )}
            </div>

            {/* Pastilles de Pagination (Dots) centrées sous la grande image */}
            <div className="flex items-center justify-center gap-2 my-4">
              {galleryImages.map((_, idx) => {
                const isActive = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveImageIndex(idx);
                    }}
                    aria-label={`Aller à la photo ${idx + 1}`}
                    className={`transition-all duration-300 ${
                      isActive 
                        ? 'w-4 h-2 rounded-full bg-blue-500' 
                        : 'w-2 h-2 rounded-full bg-slate-300 hover:bg-slate-400 cursor-pointer'
                    }`}
                  />
                );
              })}
            </div>

            {/* Carrousel de Miniatures Encadrées avec Flèches < et > */}
            <div className="w-full flex items-center gap-2 select-none">
              {/* Flèche Gauche < */}
              <button
                type="button"
                onClick={handlePrevImage}
                className="text-slate-400 hover:text-slate-800 text-2xl px-1 cursor-pointer transition-colors p-1 flex items-center justify-center disabled:opacity-30"
                aria-label="Image précédente"
              >
                ‹
              </button>

              {/* 4 Cadres de miniatures carrées */}
              <div className="grid grid-cols-4 gap-3 flex-1">
                {galleryImages.slice(0, 4).map((imgUrl, idx) => {
                  const isSelected = activeImageIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setActiveImageIndex(idx);
                      }}
                      className={`aspect-square border p-1 cursor-pointer bg-white rounded-sm flex items-center justify-center overflow-hidden transition-all ${
                        isSelected 
                          ? 'border-2 border-blue-600 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Miniature ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>

              {/* Flèche Droite > */}
              <button
                type="button"
                onClick={handleNextImage}
                className="text-slate-400 hover:text-slate-800 text-2xl px-1 cursor-pointer transition-colors p-1 flex items-center justify-center disabled:opacity-30"
                aria-label="Image suivante"
              >
                ›
              </button>
            </div>

          </main>

          {/* =================================================================
              3. COLONNE DROITE (lg:col-span-4 — PROMPTS 2/4 & 3/4 : TITRE, PRIX,
                 POINTS, VARIANTES, BOUTONS, DÉTAILS, SHARE & SAFE CHECKOUT)
              ================================================================= */}
          <div className="lg:col-span-4 w-full">
            <div className="bg-white">
              
              {/* 1. Grand Titre du Produit */}
              <h1 className="text-2xl lg:text-[28px] font-bold text-slate-900 leading-tight">
                {currentProduct?.name}
              </h1>

              {/* 2. Prix en Rouge Vif + Prix Barré & Lien Write a Review */}
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-2xl font-bold text-red-600">
                  {formatPrice(currentProduct?.price)}
                </span>
                {currentProduct?.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                  <span className="text-base text-slate-400 line-through font-normal">
                    {formatPrice(currentProduct.originalPrice)}
                  </span>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowReviewModal(true);
                  }}
                  className="text-sm text-blue-600 hover:underline inline-block mt-1 mb-4 cursor-pointer"
                >
                  Write a Review
                </button>
              </div>

              {/* 3. Barre des Points de Fidélité (border-y border-slate-200 py-3 my-4) */}
              <div className="border-y border-slate-200 py-3 my-4">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">💎</span>
                    <span>
                      Earn <strong className="text-slate-900 font-semibold">{rewardPoints}</strong> Reward Points.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setShowRewardInfo(!showRewardInfo);
                    }}
                    className="text-slate-500 hover:text-blue-600 font-medium underline cursor-pointer text-xs"
                  >
                    Learn More...
                  </button>
                </div>

                {/* Infobulle explicative de l'avantage fidélité */}
                {showRewardInfo && (
                  <div className="mt-2.5 p-3 rounded-lg bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 leading-relaxed animate-in fade-in duration-200">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">Programme Privilège You&Me :</strong>
                        Chaque tranche de 100 $ dépensée vous rapporte 1 point fidélité convertible en bon d&apos;achat déductible dès votre prochaine commande !
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Courte Description Synthétique sous la barre fidélité */}
              {getSmartShortDescription(currentProduct, 160) && (
                <p className="text-sm text-slate-600 leading-relaxed my-3 line-clamp-3">
                  {getSmartShortDescription(currentProduct, 160)}
                </p>
              )}

              {/* 4. Sélecteur de Couleurs (Color: {selectedColorName}) */}
              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-2">
                  Color: <span className="text-slate-900 font-medium">{selectedColor?.name || 'Standard'}</span>
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
                        className={`w-12 h-7 rounded-full cursor-pointer border-2 transition-all ${
                          isSelected 
                            ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' 
                            : 'hover:scale-105'
                        } ${swatch.border ? 'border-slate-300' : 'border-transparent'}`}
                        style={{ backgroundColor: swatch.hex }}
                        title={swatch.name}
                        aria-label={`Choisir la couleur ${swatch.name}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 5. Sélecteur de Tailles (Size: {selectedSize}) + Lien View Size Chart */}
              <div className="mb-4">
                <p className="text-sm text-slate-500 mt-4 mb-2">
                  Size: <span className="text-slate-900 font-medium">{selectedSize}</span>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {effectiveSizeOptions.map((sz, idx) => {
                    const isSelected = selectedSize === sz;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedSize(sz);
                        }}
                        className={`px-5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-blue-600 text-blue-600 bg-blue-50/30 ring-1 ring-blue-600/30' 
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setShowSizeChartModal(true);
                    }}
                    className="text-sm font-bold text-slate-900 underline mt-3 inline-block cursor-pointer hover:text-blue-600 transition"
                  >
                    View Size Chart
                  </button>
                </div>
              </div>

              {/* 6. Barre de Quantité */}
              <div className="w-full max-w-[200px] border border-slate-300 rounded flex items-center justify-between px-3 py-2 mt-5 bg-white select-none">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setQuantity(q => Math.max(1, q - 1));
                  }}
                  className="text-slate-500 hover:text-slate-900 font-bold px-2 py-0.5 text-base cursor-pointer disabled:opacity-30"
                  aria-label="Diminuer la quantité"
                >
                  −
                </button>
                <span className="font-bold text-sm text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setQuantity(q => q + 1);
                  }}
                  className="text-slate-500 hover:text-slate-900 font-bold px-2 py-0.5 text-base cursor-pointer"
                  aria-label="Augmenter la quantité"
                >
                  +
                </button>
              </div>

              {/* 7. 🔥 LES BOUTONS D'ACTION NANASORE (Le Cœur de la Conversion) */}
              
              {/* Ligne 1 : Bouton Acheter Direct (Caisse Sebpay) */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleBuyNowDirect}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm py-4 px-4 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  title="Ouvrir la caisse Checkout principale Sebpay"
                >
                  <CreditCard className="w-5 h-5 text-white" />
                  <span>Acheter maintenant (Caisse Sebpay)</span>
                </button>
              </div>

              {/* Ligne 2 : Deux Boutons Côte à Côte : Voir Tunnel & Ajouter au Panier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {/* Bouton Gauche : ⚡ Voir le Tunnel */}
                <button
                  type="button"
                  onClick={handleOpenDirectTunnel}
                  className="bg-white hover:bg-blue-50 text-[#0B4F9F] border-2 border-[#0B4F9F] font-bold text-sm py-3.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  title="Voir le tunnel de vente interactif"
                >
                  <Zap className="w-4 h-4 fill-amber-400 text-amber-500" />
                  <span>Voir le tunnel</span>
                </button>

                {/* Bouton Droite : 🛒 Ajouter au panier */}
                <button
                  type="button"
                  onClick={handleAddToCartAction}
                  className="bg-[#0B4F9F] hover:bg-blue-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Ajouter au panier</span>
                </button>
              </div>

              {/* Ligne 2 : Le Grand Bouton Pleine Largeur 💬 Acheter sur Wameet Direct */}
              <button
                type="button"
                onClick={handleWOrder}
                className="w-full mt-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-sm py-3.5 px-6 rounded border border-emerald-600 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Acheter sur Wameet Direct</span>
              </button>

              {/* Ligne 3 : Voir en Direct / Live Shopping (WebRTC Daily.co) */}
              <div className="w-full mt-2.5">
                <BuyerLiveCallButton
                  productId={currentProduct.id}
                  productName={currentProduct.name}
                  sellerId={merchantId}
                  buttonText="📹 Voir en Direct • Live Shopping (Daily.co)"
                  className="w-full py-3 bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm rounded shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 border border-white/20"
                />
              </div>

              {/* =================================================================
                  8. SUITE COLONNE DROITE (PROMPT 3/4 : LES 6 BLOCS EXACTS CAPTURE 226)
                  ================================================================= */}

              {/* Bloc 1 : Checkbox I agree with the Terms & conditions */}
              <div className="mt-4 flex items-center gap-2 select-none">
                <input 
                  type="checkbox" 
                  id="terms-checkbox"
                  checked={agreedToTerms} 
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="terms-checkbox" className="text-sm text-slate-500 cursor-pointer">
                  I agree with the{' '}
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      openStoreLegalModal('terms', true);
                    }}
                    className="underline text-slate-900 font-medium hover:text-blue-600 cursor-pointer"
                  >
                    Terms &amp; conditions
                  </button>
                </label>
              </div>

              {/* Bloc 2 : Compteur de Livraison Dynamique */}
              <div className="mt-3 text-sm text-slate-600 leading-relaxed">
                <span>Order in the next </span>
                <span className="text-blue-700 font-bold">
                  {String(timeLeft.days).padStart(2, '0')}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
                <span> to get it by </span>
                <span className="text-blue-700 font-bold underline">
                  {estimatedDeliveryDateString}
                </span>
              </div>

              {/* Bloc 3 : Lien Majuscule ASK US ANY QUESTION */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowAskQuestionModal(true);
                  }}
                  className="text-xs font-extrabold tracking-wide text-slate-900 underline uppercase mt-5 inline-block cursor-pointer hover:text-blue-600 transition"
                >
                  ASK US ANY QUESTION
                </button>
              </div>

              {/* Bloc 4 : DETAILS (Liste à 4 puces structurée) */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase mb-2">
                  DETAILS
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800">
                  <li>
                    <span className="font-semibold text-slate-900">SKU:</span>{' '}
                    <span className="text-slate-600 font-normal">
                      {(currentProduct as any).sku || `#${(currentProduct.id || 'PRO01').slice(0, 6).toUpperCase()}`}
                    </span>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Brand:</span>{' '}
                    <span className="text-slate-600 font-normal">
                      {storeName || 'Vendor 2'}
                    </span>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Type:</span>{' '}
                    <span className="text-slate-600 font-normal">
                      {currentProduct.category || 'Hoodies Wear'}
                    </span>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Availability:</span>{' '}
                    <span className="text-slate-600 font-normal">
                      {currentProduct.stock !== 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </li>
                </ul>

                {/* Si le produit a des keyFeatures */}
                {currentProduct.keyFeatures && currentProduct.keyFeatures.length > 0 && (
                  <div className="mt-3 space-y-1 pl-1">
                    {currentProduct.keyFeatures.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-xs text-slate-700">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bloc 5 : SHARE (Boutons de partage direct ?product=slug) */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase mb-3">
                  SHARE
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleShare('f')}
                    className="bg-[#3b5998] hover:opacity-90 text-white text-xs font-medium px-4 py-2 rounded flex items-center gap-2 cursor-pointer transition shadow-xs"
                  >
                    <span className="font-bold text-sm leading-none">f</span>
                    <span>Partager F</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare('w')}
                    className="bg-[#25D366] hover:opacity-90 text-white text-xs font-medium px-4 py-2 rounded flex items-center gap-2 cursor-pointer transition shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    <span>Partager W</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare('copy')}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded flex items-center gap-2 cursor-pointer transition shadow-xs"
                  >
                    <span>{linkCopied ? '✓' : '🔗'}</span>
                    <span>{linkCopied ? 'Lien copié !' : 'Copier le lien'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare('twitter')}
                    className="bg-[#1da1f2] hover:opacity-90 text-white text-xs font-medium px-4 py-2 rounded flex items-center gap-2 cursor-pointer transition shadow-xs"
                  >
                    <span>🐦</span>
                    <span>Twitter</span>
                  </button>
                </div>
              </div>

              {/* Bloc 6 : Encadré GUARANTEE SAFE CHECKOUT */}
              <div className="border border-slate-200 rounded p-4 mt-8 relative text-center">
                <div className="text-[11px] font-extrabold tracking-wider text-slate-900 uppercase bg-white px-3 -mt-6 mx-auto w-fit">
                  GUARANTEE SAFE CHECKOUT
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  {/* Wave */}
                  <div className="px-2.5 py-1.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-black flex items-center gap-1 shadow-xs">
                    <span>🌊</span>
                    <span>Wave</span>
                  </div>

                  {/* Orange Money */}
                  <div className="px-2.5 py-1.5 rounded bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-black flex items-center gap-1 shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                    <span>Orange Money</span>
                  </div>

                  {/* MTN • Moov */}
                  <div className="px-2.5 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black flex items-center gap-1 shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span>MTN • Moov</span>
                  </div>

                  {/* Visa • Mastercard */}
                  <div className="px-2.5 py-1.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                    <span>💳</span>
                    <span>Visa • Mastercard</span>
                  </div>

                  {/* Cash à la livraison */}
                  <div className="px-2.5 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black flex items-center gap-1 shadow-xs">
                    <span>💵</span>
                    <span>Cash Livraison</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* =================================================================
            SECTION BASSE SHOPIFY : ONGLETS DESCRIPTION, SPÉCIFICATIONS & AVIS
            (Haute Fidélité Structure You&Me Shop)
            ================================================================= */}
        <section className="mt-14 pt-8 border-t border-slate-200">
          {/* Barre de navigation des onglets */}
          <div className="flex items-center gap-8 sm:gap-12 border-b border-slate-200 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('description');
              }}
              className={`pb-3.5 text-sm sm:text-base tracking-wider uppercase transition-all relative cursor-pointer shrink-0 ${
                activeTab === 'description'
                  ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-semibold border-b-2 border-transparent'
              }`}
            >
              Description
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('specifications');
              }}
              className={`pb-3.5 text-sm sm:text-base tracking-wider uppercase transition-all relative cursor-pointer shrink-0 ${
                activeTab === 'specifications'
                  ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-semibold border-b-2 border-transparent'
              }`}
            >
              Spécifications
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('reviews');
              }}
              className={`pb-3.5 text-sm sm:text-base tracking-wider uppercase transition-all relative cursor-pointer shrink-0 flex items-center gap-2 ${
                activeTab === 'reviews'
                  ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-semibold border-b-2 border-transparent'
              }`}
            >
              <span>Avis Clients</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-bold">
                28
              </span>
            </button>
          </div>

          {/* Contenu de l'onglet sélectionné */}
          <div className="py-8">
            {/* 1. ONGLET DESCRIPTION */}
            {activeTab === 'description' && (
              <div className="max-w-4xl mx-auto">
                <AdaptiveProductRichText 
                  html={getSmartRichDescription(currentProduct)} 
                  themeVariant="shopify"
                />
              </div>
            )}

            {/* 2. ONGLET SPÉCIFICATIONS */}
            {activeTab === 'specifications' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left text-sm border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-slate-50/70">
                        <td className="py-3.5 px-5 font-bold text-slate-600 w-1/3">SKU / Référence</td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                          {currentProduct.sku || `#${(currentProduct.id || 'PRO01').slice(0, 8).toUpperCase()}`}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-5 font-bold text-slate-600">Marque & Boutique</td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900">{storeName}</td>
                      </tr>
                      <tr className="bg-slate-50/70">
                        <td className="py-3.5 px-5 font-bold text-slate-600">Catégorie</td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                          {currentProduct.category || 'Collection Officielle'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-5 font-bold text-slate-600">Disponibilité</td>
                        <td className="py-3.5 px-5 font-semibold text-emerald-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          <span>{currentProduct.stock !== 0 ? 'En Stock (Expédition en 24h)' : 'Sur commande'}</span>
                        </td>
                      </tr>
                      {effectiveColorSwatches.length > 0 && (
                        <tr className="bg-slate-50/70">
                          <td className="py-3.5 px-5 font-bold text-slate-600">Coloris Disponibles</td>
                          <td className="py-3.5 px-5 font-semibold text-slate-900">
                            {effectiveColorSwatches.map(c => c.name).join(' • ')}
                          </td>
                        </tr>
                      )}
                      {effectiveSizeOptions.length > 0 && (
                        <tr>
                          <td className="py-3.5 px-5 font-bold text-slate-600">Tailles / Formats</td>
                          <td className="py-3.5 px-5 font-semibold text-slate-900">
                            {effectiveSizeOptions.join(' • ')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Caractéristiques Clés (Key Features) */}
                {currentProduct.keyFeatures && currentProduct.keyFeatures.length > 0 && (
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Atouts & Spécificités Techniques :
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentProduct.keyFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">✓</span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. ONGLET AVIS CLIENTS */}
            {activeTab === 'reviews' && (
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Synthèse des notes */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left space-y-1">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="text-4xl font-black text-slate-900">4.9</span>
                      <span className="text-lg text-slate-400 font-bold">/ 5</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Basé sur 28 retours d&apos;acheteurs vérifiés
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setShowReviewModal(true);
                    }}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    ✍️ Écrire un Avis
                  </button>
                </div>

                {/* Liste des avis clients */}
                <div className="space-y-4">
                  {[
                    {
                      author: 'Aminata D.',
                      date: 'Il y a 3 jours',
                      rating: 5,
                      comment: 'Qualité irréprochable et livraison très rapide à Dakar. Exactement conforme à la description et aux photos !'
                    },
                    {
                      author: 'Koffi M.',
                      date: 'Il y a 1 semaine',
                      rating: 5,
                      comment: 'Très satisfait de mon achat. Le produit fonctionne à merveille et le support Wameet Direct a été très réactif.'
                    },
                    {
                      author: 'Sarah B.',
                      date: 'Il y a 2 semaines',
                      rating: 4,
                      comment: 'Bonne finition, belle couleur et emballage soigné. Je recommande sans hésitation.'
                    }
                  ].map((rev, rIdx) => (
                    <div key={rIdx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                            {rev.author.charAt(0)}
                          </span>
                          <span className="font-bold text-xs text-slate-900">{rev.author}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ Achat vérifié
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{rev.date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SECTION YOU MAY ALSO LIKE (Grille de 4 Produits Recommandés)
            ------------------------------------------------------------------- */}
        <section className="mt-16 mb-12 border-t border-slate-200 pt-12">
          {/* Titre Centré */}
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 text-center mb-10 tracking-tight">
            You May Also Like
          </h2>

          {/* Grille de 4 Produits Recommandés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {youMayAlsoLikeProducts.map((relProd) => {
              const hasRelDiscount = Boolean(relProd.originalPrice && relProd.originalPrice > relProd.price);
              const isRelNew = Boolean(
                relProd.isNew || 
                (relProd.badge && relProd.badge.toLowerCase() === 'new') ||
                (relProd.badge && relProd.badge.toLowerCase().includes('nouveau'))
              );
              const isRelSale = Boolean(
                hasRelDiscount || 
                (relProd.badge && relProd.badge.toLowerCase() === 'sale') ||
                (relProd.badge && relProd.badge.toLowerCase().includes('promo'))
              );

              const primaryRelImage = relProd.image || relProd.photoUrl || (relProd.images && relProd.images[0]) || FALLBACK_GALLERY_IMAGES[0];
              const secondaryRelImage = (relProd.images && relProd.images[1]) || null;
              const hasSecondRelImage = Boolean(secondaryRelImage && secondaryRelImage !== primaryRelImage);

              return (
                <div 
                  key={relProd.id}
                  className="group flex flex-col items-center select-none"
                >
                  {/* Cadre Image (aspect-[3/4] bg-[#F7F7F7] relative overflow-hidden) */}
                  <div
                    onClick={() => handleSelectProduct(relProd)}
                    className="w-full aspect-[3/4] bg-[#F7F7F7] border border-slate-100 rounded-sm relative overflow-hidden cursor-pointer flex items-center justify-center transition-all duration-300 group-hover:shadow-md"
                  >
                    {/* Badges Sale / New en haut à gauche */}
                    <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start pointer-events-none">
                      {isRelSale && (
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                          Sale
                        </span>
                      )}
                      {isRelNew && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                          New
                        </span>
                      )}
                      {!isRelSale && !isRelNew && relProd.badge && (
                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                          {relProd.badge}
                        </span>
                      )}
                    </div>

                    {/* Image avec Effet Changement / Zoom au Survol */}
                    <div className="w-full h-full p-4 sm:p-6 flex items-center justify-center relative">
                      <img
                        src={primaryRelImage}
                        alt={relProd.name}
                        className={`w-full h-full object-contain transition-all duration-500 ease-out ${
                          hasSecondRelImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'
                        }`}
                        loading="lazy"
                      />
                      {hasSecondRelImage && (
                        <img
                          src={secondaryRelImage!}
                          alt={`${relProd.name} vue alternative`}
                          className="absolute inset-0 w-full h-full object-contain p-4 sm:p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"
                          loading="lazy"
                        />
                      )}
                    </div>

                    {/* Boutons d'Action Rapides au Survol (⚡ Tunnel, 👁️ Quick View, ☆ Wishlist) */}
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-auto"
                    >
                      {/* ⚡ Voir le tunnel */}
                      <button
                        type="button"
                        onClick={() => {
                          playValidationBeep();
                          triggerOpenFunnel(relProd.linkedFunnelId || relProd.id, relProd.name, relProd);
                        }}
                        className="w-9 h-9 rounded-full bg-white text-slate-900 hover:bg-blue-600 hover:text-white shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer"
                        aria-label="Voir le tunnel"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        <span className="absolute -top-8 px-2 py-0.5 bg-black text-white text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg">
                          Tunnel
                        </span>
                      </button>

                      {/* 👁️ Quick View */}
                      <button
                        type="button"
                        onClick={() => handleSelectProduct(relProd)}
                        className="w-9 h-9 rounded-full bg-white text-slate-900 hover:bg-blue-600 hover:text-white shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer"
                        aria-label="Aperçu rapide"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="absolute -top-8 px-2 py-0.5 bg-black text-white text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg">
                          Voir
                        </span>
                      </button>

                      {/* ☆ Wishlist */}
                      <button
                        type="button"
                        onClick={() => {
                          playValidationBeep();
                          setWishlist(prev => {
                            const exists = prev.includes(relProd.id);
                            const next = exists ? prev.filter(id => id !== relProd.id) : [...prev, relProd.id];
                            showCustomToast(exists ? 'Retiré de vos favoris' : `✨ ${relProd.name} ajouté aux favoris !`);
                            return next;
                          });
                        }}
                        className={`w-9 h-9 rounded-full shadow-md flex items-center justify-center relative group/btn transition-colors cursor-pointer ${
                          wishlist.includes(relProd.id)
                            ? 'bg-blue-600 text-amber-300'
                            : 'bg-white text-slate-900 hover:bg-blue-600 hover:text-white'
                        }`}
                        aria-label="Ajouter aux favoris"
                      >
                        <Star className={`w-4 h-4 ${wishlist.includes(relProd.id) ? 'fill-amber-300' : ''}`} />
                        <span className="absolute -top-8 px-2 py-0.5 bg-black text-white text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg">
                          {wishlist.includes(relProd.id) ? 'Favori' : 'Wishlist'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* En Dessous : Prix (avec prix barré si promo) et Titre du Produit */}
                  <div className="w-full text-center pt-3 flex flex-col items-center">
                    {/* Ligne Prix */}
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-red-600 font-bold text-base">
                        {formatPrice(relProd.price)}
                      </span>
                      {hasRelDiscount && (
                        <span className="text-slate-400 line-through text-xs font-normal">
                          {formatPrice(relProd.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Titre du Produit */}
                    <h3
                      onClick={() => handleSelectProduct(relProd)}
                      className="text-xs sm:text-sm font-semibold text-slate-800 hover:text-blue-600 mt-1 transition-colors cursor-pointer line-clamp-1 max-w-full"
                      title={relProd.name}
                    >
                      {relProd.name}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* -------------------------------------------------------------------
          BARRE COLLANTE EN BAS D'ÉCRAN (STICKY BOTTOM BAR AU SCROLL)
          ------------------------------------------------------------------- */}
      <aside
        aria-label="Barre d'achat rapide collante"
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl py-2.5 px-3 sm:px-6 transition-all duration-300 ease-in-out ${
          showStickyBar 
            ? 'translate-y-0 opacity-100 pointer-events-auto' 
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* Gauche : Miniature + Titre + Prix */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={activeImageUrl}
              alt={currentProduct.name}
              className="w-11 h-11 object-contain bg-slate-50 border border-slate-200 rounded-sm shrink-0"
            />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                {currentProduct.name}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-red-600">
                  {formatPrice(currentProduct.price)}
                </span>
                {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                  <span className="text-[11px] text-slate-400 line-through">
                    {formatPrice(currentProduct.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Droite : Sélecteur de Variante / Quantité + Boutons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Rappel Variante Couleur active (desktop) */}
            {selectedColor && (
              <div className="hidden lg:flex items-center gap-1.5 border border-slate-200 px-2.5 py-1.5 rounded-sm text-xs bg-slate-50">
                <span
                  className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <span className="text-slate-600 font-medium">{selectedColor.name}</span>
              </div>
            )}

            {/* Stepper Quantité */}
            <div className="hidden sm:flex items-center border border-slate-300 rounded-sm h-9 w-24">
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

            {/* Bouton Acheter (Caisse Sebpay) */}
            <button
              type="button"
              onClick={handleBuyNowDirect}
              className="h-9 sm:h-10 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              title="Acheter via la caisse principale Sebpay"
            >
              <CreditCard className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="whitespace-nowrap">Acheter</span>
            </button>

            {/* Bouton 1 : ⚡ Voir le tunnel */}
            <button
              type="button"
              onClick={handleOpenDirectTunnel}
              className="h-9 sm:h-10 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              title="Ouvrir le tunnel de vente"
            >
              <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
              <span className="whitespace-nowrap">Tunnel</span>
            </button>

            {/* Bouton 2 : 💬 Acheter via Wameet Direct */}
            <button
              type="button"
              onClick={handleWOrder}
              className="h-9 sm:h-10 px-3 sm:px-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-xs sm:text-sm rounded-sm flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              title="Commander sur Wameet Direct"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Wameet Direct</span>
            </button>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------------
          WIDGET FLOTTANT EN BAS À GAUCHE : "Other customer are viewing"
          (Preuve Sociale Active - Captures 224 & 226)
          ------------------------------------------------------------------- */}
      {showSocialProof && currentSocialProofProduct && (
        <aside
          aria-label="Preuve sociale produit consulté"
          onClick={() => handleSelectProduct(currentSocialProofProduct)}
          className={`fixed ${showStickyBar ? 'bottom-20' : 'bottom-4'} left-4 z-40 bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-md p-3 flex items-center gap-3.5 w-[280px] sm:w-[310px] cursor-pointer hover:shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-4 group select-none`}
        >
          {/* Petite croix rouge ✕ pour fermer */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSocialProof(false);
            }}
            className="text-red-400 hover:text-red-600 text-xs absolute top-2 right-2.5 cursor-pointer p-0.5"
            title="Fermer la notification"
            aria-label="Fermer"
          >
            ✕
          </button>

          {/* Miniature carrée / verticale à gauche */}
          <img
            src={currentSocialProofProduct.image || FALLBACK_GALLERY_IMAGES[0]}
            alt={currentSocialProofProduct.name}
            className="w-14 h-16 object-cover rounded-sm shrink-0 bg-slate-50 group-hover:scale-105 transition-transform"
          />

          {/* Informations à droite */}
          <div className="flex-1 min-w-0 pr-3">
            <span className="text-[11px] text-slate-400 underline mb-0.5 block">
              Other customer are viewing
            </span>
            <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
              {currentSocialProofProduct.name}
            </h4>
            <span className="text-xs font-bold text-blue-600 mt-1 block">
              {formatPrice(currentSocialProofProduct.price)}
            </span>
          </div>
        </aside>
      )}

      {/* -------------------------------------------------------------------
          MODALE SIZE CHART (Guide des Tailles)
          ------------------------------------------------------------------- */}
      {showSizeChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Guide des Tailles &amp; Caractéristiques
              </h3>
              <button
                type="button"
                onClick={() => setShowSizeChartModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed space-y-3">
              <p>
                Consultez les mensurations recommandées en centimètres (cm) pour choisir la coupe parfaite adaptée à votre morphologie.
              </p>
              
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-2.5">Taille</th>
                      <th className="p-2.5">Tour de Poitrine</th>
                      <th className="p-2.5">Longueur</th>
                      <th className="p-2.5">Épaules</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2.5 font-bold text-blue-600">S</td>
                      <td className="p-2.5">88 - 94 cm</td>
                      <td className="p-2.5">68 cm</td>
                      <td className="p-2.5">42 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-blue-600">M</td>
                      <td className="p-2.5">95 - 102 cm</td>
                      <td className="p-2.5">70 cm</td>
                      <td className="p-2.5">44 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-blue-600">XL</td>
                      <td className="p-2.5">103 - 112 cm</td>
                      <td className="p-2.5">74 cm</td>
                      <td className="p-2.5">48 cm</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-blue-800 text-[11px]">
                💡 <strong>Astuce :</strong> En cas de doute entre deux tailles, nous vous conseillons de privilégier la taille supérieure pour un confort optimal.
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowSizeChartModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          MODALE TERMS & CONDITIONS (Conditions Générales)
          ------------------------------------------------------------------- */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Conditions Générales de Vente
              </h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <p>✓ <strong>Garantie Satisfait ou Remboursé :</strong> Vous bénéficiez d&apos;un délai de rétractation de 14 jours à compter de la réception de votre colis.</p>
              <p>✓ <strong>Paiement à la livraison &amp; Mobile Money :</strong> Règlement direct en toute sécurité lors de la remise en main propre ou par transfert sécurisé.</p>
              <p>✓ <strong>Protection des données :</strong> Vos informations personnelles ne sont ni partagées ni revendues.</p>
            </div>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
              >
                J&apos;ai compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          MODALE ASK US ANY QUESTION (Poser une Question)
          ------------------------------------------------------------------- */}
      {showAskQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Une question sur ce produit ?
              </h3>
              <button
                type="button"
                onClick={() => setShowAskQuestionModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                Vous souhaitez un renseignement rapide sur <strong>{currentProduct.name}</strong> ? Nos conseillers vous répondent instantanément sur Wameet Direct.
              </p>
              <textarea
                rows={3}
                value={askQuestionText}
                onChange={(e) => setAskQuestionText(e.target.value)}
                placeholder="Écrivez votre question ici (ex: disponibilité, coloris, délai express...)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAskQuestionModal(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendQuestionW}
                className="px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Envoyer sur Wameet Direct</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          MODALE WRITE A REVIEW (Écrire un Avis)
          ------------------------------------------------------------------- */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Laisser un Avis Vérifié
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewSubmitted(false);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewSubmitted ? (
              <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">
                  Merci pour votre retour !
                </h4>
                <p className="text-xs text-slate-500">
                  Votre avis a été soumis avec succès et apparaîtra dès validation par l&apos;équipe.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewSubmitted(false);
                  }}
                  className="mt-3 px-5 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
                >
                  Retour au produit
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  playValidationBeep();
                  setReviewSubmitted(true);
                }}
                className="space-y-3.5 text-xs"
              >
                {/* Note par étoiles */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Votre note globale :
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= reviewRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">
                      {reviewRating} / 5
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Votre Nom ou Prénom :
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    placeholder="Ex: Fatou K."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Votre Avis d&apos;acheteur :
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="Décrivez votre expérience avec ce produit..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition shadow-sm"
                  >
                    Publier mon avis
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          TOAST FEEDBACK AJOUT AU PANIER
          ------------------------------------------------------------------- */}
      {addedToCartToast && (
        <aside
          aria-label="Notification d'ajout au panier"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-xs animate-in slide-in-from-bottom-5 duration-300 border border-slate-700"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <div>
            <span>Produit ajouté au panier ({quantity}x) !</span>
          </div>
        </aside>
      )}

      {/* -------------------------------------------------------------------
          TOAST FEEDBACK GÉNÉRIQUE / WISHLIST
          ------------------------------------------------------------------- */}
      {customToastMessage && (
        <aside
          aria-label="Notification de confirmation"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-bold text-xs animate-in slide-in-from-bottom-5 duration-300 border border-slate-700 select-none"
        >
          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
          <span>{customToastMessage}</span>
        </aside>
      )}

    </div>
  );
};

export default ShopifyWideProductView;
