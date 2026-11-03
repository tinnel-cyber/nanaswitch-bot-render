import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Zap, 
  ChevronDown, 
  Check, 
  Search, 
  ShoppingCart, 
  ShoppingBag, 
  User, 
  Heart, 
  Menu, 
  MessageCircle, 
  Sparkles,
  Eye,
  ArrowRight,
  X,
  Flame,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  TrendingUp,
  Tag
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../../types';
import { StoreProductItem } from '../types';
import { SlideOutFunnelDrawer } from '../../../../../components/SlideOutFunnelDrawer';
import { triggerOpenFunnel } from '../../../../../themes/themeUtils';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface CartItem {
  product: StoreProductItem;
  quantity: number;
}

export interface MegaHubMarketplaceHeaderProps {
  config: ThemeCustomizationConfig;
  products?: StoreProductItem[];
  categories?: string[];
  storeSlug?: string;
  onOpenFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onResetToHome?: () => void;
  onSelectCategory?: (category: string) => void;
  onSearch?: (query: string) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  className?: string;
}

// Villes clés d'Afrique de l'Ouest & Centrale
const AFRICAN_CITIES = [
  { id: 'ouaga', name: 'Ouagadougou', country: 'Burkina Faso', flag: '🇧🇫' },
  { id: 'bobo', name: 'Bobo-Dioulasso', country: 'Burkina Faso', flag: '🇧🇫' },
  { id: 'abidjan', name: 'Abidjan', country: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', flag: '🇸🇳' },
  { id: 'bamako', name: 'Bamako', country: 'Mali', flag: '🇲🇱' },
  { id: 'cotonou', name: 'Cotonou', country: 'Bénin', flag: '🇧🇯' },
  { id: 'lome', name: 'Lomé', country: 'Togo', flag: '🇹🇬' },
  { id: 'niamey', name: 'Niamey', country: 'Niger', flag: '🇳🇪' },
  { id: 'conakry', name: 'Conakry', country: 'Guinée', flag: '🇬🇳' },
  { id: 'douala', name: 'Douala', country: 'Cameroun', flag: '🇨🇲' },
  { id: 'yaounde', name: 'Yaoundé', country: 'Cameroun', flag: '🇨🇲' },
  { id: 'libreville', name: 'Libreville', country: 'Gabon', flag: '🇬🇦' },
  { id: 'kinshasa', name: 'Kinshasa', country: 'RDC', flag: '🇨🇩' },
  { id: 'autre', name: 'Autre ville...', country: '', flag: '🌍' }
];

export const MegaHubMarketplaceHeader: React.FC<MegaHubMarketplaceHeaderProps> = ({
  config,
  products = [],
  categories = [],
  storeSlug = 'boutique',
  onOpenFunnel,
  onSelectProduct,
  onResetToHome,
  onSelectCategory,
  onSearch,
  isPublicView = false,
  isAdminPreview = false,
  className = ''
}) => {
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET DU COMPOSANT (ZÉRO ERREUR #310)
  
  // Ville sélectionnée avec persistance locale
  const [selectedCityId, setSelectedCityId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nana_selected_delivery_city') || 'abidjan';
    }
    return 'abidjan';
  });
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState<boolean>(false);

  // Compte à rebours de la barre d'annonce flash (4h 12m 30s)
  const [flashCountdown, setFlashCountdown] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 4,
    minutes: 12,
    seconds: 30
  });

  // Mega-menu "All Categories"
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState<boolean>(false);
  const [hoveredCategory, setHoveredCategory] = useState<string>('');
  const megaMenuRef = useRef<HTMLDivElement>(null);

  // Barre de recherche prédictive
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Panier Local & Persistant
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_marketplace_cart');
        if (stored) return JSON.parse(stored);
      } catch (err) {
        console.warn('Error reading cart from localStorage', err);
      }
    }
    return [];
  });
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

  // Favoris / Wishlist
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_marketplace_wishlist');
        if (stored) return JSON.parse(stored);
      } catch (err) {
        console.warn('Error reading wishlist', err);
      }
    }
    return [];
  });

  // Catégorie ou rayon pilule active
  const [activePill, setActivePill] = useState<string>('all_deals');

  // Tiroir Tunnel d'achat intégré
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);

  // Menu mobile dépliable
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Sauvegarde panier dans localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nana_marketplace_cart', JSON.stringify(cartItems));
      } catch (err) {
        console.warn('Error saving cart', err);
      }
    }
  }, [cartItems]);

  // Sauvegarde favoris dans localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nana_marketplace_wishlist', JSON.stringify(wishlistIds));
      } catch (err) {
        console.warn('Error saving wishlist', err);
      }
    }
  }, [wishlistIds]);

  // Ticker du chrono chaque seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setFlashCountdown(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 5, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fermeture des menus au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setIsMegaMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Liste effective des catégories déduites des produits
  const effectiveCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const fromProds = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return fromProds.length > 0 ? fromProds : ['Électronique', 'Mode & Beauté', 'Maison & Déco', 'Santé', 'Formations'];
  }, [categories, products]);

  // Catégorie activement survolée dans le mega-menu
  const activeHoverCategory = useMemo(() => {
    return hoveredCategory || effectiveCategories[0] || '';
  }, [hoveredCategory, effectiveCategories]);

  // Produit phare pour la catégorie survolée dans le mega-menu
  const categoryFeaturedProduct = useMemo(() => {
    if (!activeHoverCategory) return products[0] || null;
    const match = products.find(p => p.category === activeHoverCategory);
    return match || products[0] || null;
  }, [activeHoverCategory, products]);

  // Nombre de produits par catégorie
  const categoryCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Résultats de la recherche prédictive (0ms dès 1 lettre tapée !)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p => {
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      const matchDesc = (p.shortDescription || p.description || '').toLowerCase().includes(q);
      return matchName || matchCat || matchDesc;
    }).slice(0, 8);
  }, [searchQuery, products]);

  // Total Panier
  const cartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cartItems]);

  // Objet ville sélectionnée
  const activeCity = useMemo(() => {
    return AFRICAN_CITIES.find(c => c.id === selectedCityId) || AFRICAN_CITIES[2];
  }, [selectedCityId]);

  // Hotline WhatsApp
  const hotlinePhone = useMemo(() => {
    return config.whatsappNumber || config.supportPhone || '+225 07 00 00 00 00';
  }, [config.whatsappNumber, config.supportPhone]);

  const cleanPhone = useMemo(() => {
    return hotlinePhone.replace(/[^0-9]/g, '');
  }, [hotlinePhone]);

  const announcementText = useMemo(() => {
    return (
      config.announcementBarText ||
      '⚡ LIVRAISON EXPRESS & PAIEMENT MOBILE MONEY / CASH À LA LIVRAISON DISPONIBLE'
    );
  }, [config.announcementBarText]);

  // URL WhatsApp pour contact général
  const whatsappUrl = useMemo(() => {
    const msg = encodeURIComponent(
      `Bonjour ${config.storeName || 'le service client'}, j'ai une question concernant les livraisons à ${activeCity.name}. Pouvez-vous m'assister ?`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  }, [config.storeName, activeCity.name, cleanPhone]);

  // URL WhatsApp pour commander tout le panier groupé
  const whatsappCartOrderUrl = useMemo(() => {
    if (cartItems.length === 0) return `https://wa.me/${cleanPhone}`;
    let message = `🛒 *NOUVELLE COMMANDE SUR ${config.storeName?.toUpperCase() || 'NANASORE'}* 🛒\n\n`;
    message += `📍 *Ville de livraison :* ${activeCity.name} (${activeCity.country})\n\n`;
    message += `*Détail des articles :*\n`;
    cartItems.forEach((item, idx) => {
      const priceFormatted = item.product.price.toLocaleString() + ' FCFA';
      const subtotal = (item.product.price * item.quantity).toLocaleString() + ' FCFA';
      message += `${idx + 1}. *${item.product.name}*\n   ↳ Quantité: ${item.quantity} x ${priceFormatted} = ${subtotal}\n`;
    });
    message += `\n💰 *MONTANT TOTAL :* ${cartTotal.toLocaleString()} FCFA\n`;
    message += `\n⚡ Merci de me confirmer la disponibilité et le délai de livraison !`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }, [cartItems, cartTotal, activeCity, config.storeName, cleanPhone]);

  // Actions Panier
  const handleAddToCart = useCallback((product: StoreProductItem, qty: number = 1) => {
    playValidationBeep();
    setCartItems(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id);
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += qty;
        return copy;
      }
      return [...prev, { product, quantity: qty }];
    });
    setIsCartDrawerOpen(true);
  }, []);

  const handleUpdateQuantity = useCallback((productId: string, newQty: number) => {
    playTapBeep();
    if (newQty <= 0) {
      setCartItems(prev => prev.filter(i => i.product.id !== productId));
    } else {
      setCartItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
    }
  }, []);

  const handleRemoveFromCart = useCallback((productId: string) => {
    playTapBeep();
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const handleClearCart = useCallback(() => {
    playTapBeep();
    setCartItems([]);
  }, []);

  // Déclenchement de l'ouverture du tunnel d'achat
  const handleOpenTunnel = useCallback((product: StoreProductItem) => {
    playValidationBeep();
    setSelectedFunnelProduct(product);
    setIsSearchFocused(false);
    setIsMegaMenuOpen(false);
    setIsCartDrawerOpen(false);
    if (onOpenFunnel) {
      onOpenFunnel(product);
    } else {
      triggerOpenFunnel(product);
    }
  }, [onOpenFunnel]);

  // Consultation du produit (ouvre la grande vue produit)
  const handleViewProduct = useCallback((product: StoreProductItem) => {
    playTapBeep();
    setIsSearchFocused(false);
    setIsMegaMenuOpen(false);
    setIsCartDrawerOpen(false);
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  }, [onSelectProduct]);

  // Clic Logo pour retour accueil
  const handleLogoClick = useCallback(() => {
    playTapBeep();
    if (onResetToHome) {
      onResetToHome();
    }
  }, [onResetToHome]);

  // Sélection de ville
  const handleSelectCity = useCallback((cityId: string) => {
    playValidationBeep();
    setSelectedCityId(cityId);
    setIsCityDropdownOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nana_selected_delivery_city', cityId);
    }
  }, []);

  return (
    <header className={`w-full bg-white text-slate-800 shadow-md border-b border-slate-200 select-none z-40 relative ${className}`}>
      
      {/* ========================================================================= */}
      {/* ÉTAGE 1A : LE RUBAN D'ANNONCE DYNAMIQUE EN BLEU ROYAL (#2563EB) */}
      {/* ========================================================================= */}
      {config.announcementBarEnabled !== false && (
        <div className="w-full bg-blue-600 text-white py-2 px-3 sm:px-6 text-xs font-semibold shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
            
            {/* Gauche : Message Défilant Doux / Annonce */}
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping shrink-0" />
              <span className="tracking-wide text-[11px] sm:text-xs font-extrabold uppercase line-clamp-1">
                {announcementText}
              </span>
            </div>

            {/* Centre : Mini Compte à Rebours en Direct (Pilule Blanche sur Bleu) */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-100 hidden sm:inline">
                ⏳ Fin des offres flash dans :
              </span>
              <div className="bg-white text-blue-600 font-black px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs shadow-sm flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>
                  {String(flashCountdown.hours).padStart(2, '0')}h{' '}
                  {String(flashCountdown.minutes).padStart(2, '0')}m{' '}
                  {String(flashCountdown.seconds).padStart(2, '0')}s
                </span>
              </div>
            </div>

            {/* Droite : Badge de Confiance Officiel Nanasore */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-blue-100 font-bold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Boutique 100% Vérifiée Nanasore</span>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAGE 1B : LA BARRE UTILITAIRE DE LOCALISATION & CONTACT DIRECT */}
      {/* ========================================================================= */}
      <div className="w-full bg-white border-b border-slate-100 py-1.5 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          
          {/* 📍 Sélecteur Interactif de Ville / Localisation */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-slate-400 font-medium leading-none">
                  Livrer à :
                </span>
                
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsCityDropdownOpen(!isCityDropdownOpen);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-black text-slate-900 hover:text-blue-600 transition cursor-pointer mt-0.5"
                >
                  <span className="mr-0.5">{activeCity.flag}</span>
                  <span>{activeCity.name}</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isCityDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </button>
              </div>

              {/* Badge Rassurant de Livraison Immédiate */}
              <div className="hidden sm:inline-flex items-center gap-1 ml-2 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                <span>Livraison rapide disponible à {activeCity.name}</span>
              </div>
            </div>

            {/* Menu Déroulant des Villes */}
            {isCityDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 border-b border-slate-100 mb-1">
                  <p className="text-[11px] font-bold text-slate-700">
                    Choisissez votre ville de livraison :
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Délais et frais calculés automatiquement
                  </p>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {AFRICAN_CITIES.map((city) => {
                    const isSelected = city.id === selectedCityId;
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleSelectCity(city.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-extrabold border border-blue-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{city.flag}</span>
                          <span>{city.name}</span>
                          {city.country && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({city.country})
                            </span>
                          )}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 📞 Bloc Hotline / Service Client WhatsApp Direct */}
          <div className="flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group"
              title="Discuter directement sur WhatsApp"
            >
              <div className="relative">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Phone className="w-3 h-3" />
                </div>
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                  Hotline WhatsApp
                </span>
                <span className="text-[11px] font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors mt-0.5">
                  {hotlinePhone}
                </span>
              </div>
            </a>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÉTAGE 2 : LE CŒUR DU MEGA-HUB MARKETPLACE */}
      {/* Logo + Bouton ☰ All Categories + Recherche + Favoris + Bloc CART (X) */}
      {/* ========================================================================= */}
      <div className="w-full bg-white py-3 px-3 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 lg:gap-6">
          
          {/* Ligne 1 sur Mobile / Partie Gauche sur Desktop : Logo + All Categories + Actions rapides Mobile */}
          <div className="flex items-center justify-between gap-3 shrink-0">
            {/* Logo & Identité cliquable */}
            <div 
              onClick={handleLogoClick}
              className="cursor-pointer flex items-center gap-2.5 group"
              title="Retour à l'accueil"
            >
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.storeName || 'Logo'}
                  className="h-9 sm:h-11 object-contain max-w-[150px] group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                    {(config.storeName || 'N').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                        {config.storeName || 'Nanasore Mega-Hub'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                        CERTIFIÉ
                      </span>
                    </div>
                    {config.storeTagline && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {config.storeTagline}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 🗂️ Bouton Encadré ☰ All Categories / Tous les Rayons (Desktop) */}
            <div className="relative hidden lg:block" ref={megaMenuRef}>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsMegaMenuOpen(!isMegaMenuOpen);
                }}
                className={`border bg-white px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  isMegaMenuOpen
                    ? 'border-blue-600 text-blue-600 ring-2 ring-blue-500/20'
                    : 'border-slate-200 text-slate-700 hover:border-blue-600 hover:text-blue-600'
                }`}
              >
                <Menu className="w-4 h-4 text-blue-600" />
                <span>Toutes les Catégories</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
              </button>

              {/* 🌟 LE MEGA-MENU DÉROULANT AU CLIC / SURVOL (2 COLONNES) */}
              {isMegaMenuOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 w-[320px] sm:w-[560px] z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Colonne Gauche : Liste des Catégories avec compteur (X) */}
                    <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                      <div className="px-2 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                        Rayons du Catalogue
                      </div>

                      {effectiveCategories.map((cat) => {
                        const isHovered = (activeHoverCategory === cat);
                        const count = categoryCountMap[cat] || 0;

                        return (
                          <button
                            key={cat}
                            type="button"
                            onMouseEnter={() => setHoveredCategory(cat)}
                            onClick={() => {
                              playTapBeep();
                              if (onSelectCategory) onSelectCategory(cat);
                              setIsMegaMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                              isHovered
                                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">{cat}</span>
                            <span className="text-[10px] text-slate-400 font-semibold ml-2">
                              ({count})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Colonne Droite : "🔥 Produit Phare du Rayon" avec Bouton Tunnel Direct */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between">
                      {categoryFeaturedProduct ? (
                        <>
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                <Flame className="w-3 h-3 text-rose-600" /> Produit Phare
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium truncate">
                                {categoryFeaturedProduct.category}
                              </span>
                            </div>

                            {/* Image Produit */}
                            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-white border border-slate-200 mb-2 relative group">
                              <img
                                src={categoryFeaturedProduct.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&auto=format&fit=crop&q=80'}
                                alt={categoryFeaturedProduct.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            {/* Titre & Prix */}
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                              {categoryFeaturedProduct.name}
                            </h4>
                            <div className="flex items-baseline gap-2 mb-3">
                              <span className="text-sm font-black text-blue-600">
                                {categoryFeaturedProduct.price?.toLocaleString()} FCFA
                              </span>
                              {categoryFeaturedProduct.originalPrice && (
                                <span className="text-[10px] text-slate-400 line-through">
                                  {categoryFeaturedProduct.originalPrice.toLocaleString()} FCFA
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bouton direct "⚡ Voir Tunnel & Acheter" */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => handleViewProduct(categoryFeaturedProduct)}
                              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-400 text-xs font-bold transition shadow-xs"
                              title="Voir la fiche produit"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenTunnel(categoryFeaturedProduct)}
                              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/25 transition active:scale-95"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                              <span>Voir Tunnel & Acheter</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                          <ShoppingBag className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
                          <p className="text-xs font-medium">Aucun produit dans ce rayon.</p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Actions Rapides Droite sur Mobile (< 1024px) : WhatsApp + Panier compact */}
            <div className="flex items-center gap-2 lg:hidden">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200"
                title="WhatsApp Direct"
              >
                <Phone className="w-4 h-4" />
              </a>

              {/* Bouton CART Mobile */}
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  setIsCartDrawerOpen(true);
                }}
                className="relative p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 2. ZONE CENTRALE : LA GRANDE BARRE DE RECHERCHE PRÉDICTIVE INSTANTANÉE */}
          <div className="flex-1 max-w-2xl relative" ref={searchContainerRef}>
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                  if (onSearch) onSearch(e.target.value);
                }}
                placeholder="Rechercher un produit, une offre, une catégorie..."
                className="w-full pl-4 pr-14 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all shadow-inner"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-13 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Bouton Loupe Bleu Royal Nanasore */}
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsSearchFocused(true);
                }}
                className="absolute right-0 top-0 bottom-0 px-4 rounded-r-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition cursor-pointer"
                title="Lancer la recherche"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 🔍 PANNEAU DE RÉSULTATS PRÉDICTIFS EN TEMPS RÉEL (0ms) */}
            {isSearchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-blue-100 rounded-2xl shadow-2xl p-3 z-50 max-h-[420px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 px-1">
                  <span className="text-[11px] font-bold text-slate-500">
                    {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} pour "{searchQuery}"
                  </span>
                  <span className="text-[10px] text-blue-600 font-extrabold uppercase">
                    Résultats en Direct
                  </span>
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <Search className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
                    <p className="text-xs font-semibold text-slate-700">
                      Aucun produit ne correspond à "{searchQuery}"
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Suggestions : Vérifiez l'orthographe ou explorez nos rayons populaires :
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                      {effectiveCategories.slice(0, 4).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSearchQuery(c);
                            if (onSelectCategory) onSelectCategory(c);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {searchResults.map((prod) => (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group"
                      >
                        <div 
                          onClick={() => handleViewProduct(prod)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <img
                            src={prod.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=100&auto=format&fit=crop&q=80'}
                            alt={prod.name}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-slate-400 font-medium block truncate">
                              {prod.category}
                            </span>
                            <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {prod.name}
                            </h5>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span className="text-xs font-black text-blue-600">
                                {prod.price?.toLocaleString()} FCFA
                              </span>
                              {prod.originalPrice && (
                                <span className="text-[10px] text-slate-400 line-through">
                                  {prod.originalPrice.toLocaleString()} FCFA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2 Boutons Rapides : 👁️ Voir + ⚡ Acheter */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewProduct(prod)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                            title="Voir la grande fiche produit"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Voir</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenTunnel(prod)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1 shadow-sm transition active:scale-95"
                            title="Ouvrir le tunnel de commande en 0ms"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                            <span>Acheter</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. ZONE DROITE DESKTOP : FAVORIS + BOUTON WHATSAPP + LE BLOC 🛒 CART (X) */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {/* Bouton Favoris (Heart) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
              }}
              className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
              title="Mes Favoris"
            >
              <Heart className="w-5 h-5" />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            {/* Bouton Rapide WhatsApp Direct */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition shadow-xs"
              title="Commander ou demander conseil sur WhatsApp"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            {/* 🔥 LE BLOC 🛒 CART (X) & MONTANT TOTAL (FIDÈLE À CAPTURE 224) */}
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                setIsCartDrawerOpen(true);
              }}
              className="flex items-center gap-3 p-2 pl-3 rounded-2xl border border-blue-200 hover:border-blue-600 bg-white hover:bg-blue-50/50 shadow-sm transition-all cursor-pointer group"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                </div>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                    {cartCount}
                  </span>
                )}
              </div>

              <div className="text-left leading-tight">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                  CART ({cartCount})
                </span>
                <span className="text-xs font-extrabold text-blue-600 block">
                  {cartTotal.toLocaleString()} FCFA
                </span>
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÉTAGE 3 : BARRE INFÉRIEURE DE NAVIGATION RAPIDE PAR RAYONS (PILLS NAV) */}
      {/* ========================================================================= */}
      <nav className="w-full bg-white border-t border-slate-100 py-2.5 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Liste des Rayons Défilable au Pouce (No-Scrollbar) */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap text-xs font-bold text-slate-700">
            
            {/* Pilule : 🔥 Toutes les Offres */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActivePill('all_deals');
                if (onResetToHome) onResetToHome();
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer shrink-0 ${
                activePill === 'all_deals'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Toutes les Offres</span>
            </button>

            {/* Pilule : ⚡ Meilleures Ventes */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActivePill('best_sale');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer shrink-0 ${
                activePill === 'best_sale'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Meilleures Ventes</span>
            </button>

            {/* Pilules des Catégories de la Boutique */}
            {effectiveCategories.map((cat) => {
              const isSelected = activePill === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActivePill(cat);
                    if (onSelectCategory) onSelectCategory(cat);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Badge Droite : 💬 Commander sur WhatsApp en 1 clic */}
          <div className="hidden md:flex items-center shrink-0">
            <a
              href={whatsappCartOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-200 transition shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>💬 Commander sur WhatsApp en 1 clic</span>
            </a>
          </div>

        </div>
      </nav>

      {/* ========================================================================= */}
      {/* MINI-TIROIR PANIER BLEU & BLANC (CART DRAWER INTERACTIF) */}
      {/* ========================================================================= */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
            
            {/* En-Tête du Panier */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Mon Panier Nanasore
                  </h3>
                  <span className="text-xs text-blue-600 font-bold">
                    {cartCount} article{cartCount > 1 ? 's' : ''} sélectionné{cartCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps du Panier : Liste des Produits */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-200 stroke-1" />
                  <p className="text-sm font-bold text-slate-700">Votre panier est vide</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Parcourez nos rayons ou utilisez la barre de recherche pour ajouter des articles !
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCartDrawerOpen(false)}
                    className="mt-2 py-2 px-5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    Découvrir nos produits
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3"
                  >
                    <img
                      src={item.product.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=120&auto=format&fit=crop&q=80'}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.product.name}
                      </h4>
                      <span className="text-xs font-black text-blue-600 block mt-0.5">
                        {item.product.price.toLocaleString()} FCFA
                      </span>

                      {/* Sélecteur de Quantité [- 1 +] */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-slate-900 w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.product.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition"
                      title="Supprimer du panier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Pied du Panier : Total + 2 Boutons d'Action (Tunnel & WhatsApp) */}
            {cartItems.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Total à payer :</span>
                  <span className="text-base font-black text-blue-600">
                    {cartTotal.toLocaleString()} FCFA
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Option 1 : Voir Tunnel & Acheter en 0ms */}
                  <button
                    type="button"
                    onClick={() => {
                      if (cartItems[0]) {
                        handleOpenTunnel(cartItems[0].product);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current text-yellow-300" />
                    <span>⚡ Voir Tunnel & Acheter ({cartTotal.toLocaleString()} FCFA)</span>
                  </button>

                  {/* Option 2 : Commander Tout le Panier via WhatsApp */}
                  <a
                    href={whatsappCartOrderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer text-center"
                  >
                    <Phone className="w-4 h-4" />
                    <span>💬 Acheter tout le panier via WhatsApp</span>
                  </a>
                </div>

                <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="hover:text-rose-600 underline cursor-pointer"
                  >
                    Vider le panier
                  </button>
                  <span>Paiement sécurisé à la livraison</span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TIROIR TUNNEL D'ACHAT DIRECT DÉPLOYÉ EN 0MS SANS QUITTER LA PAGE */}
      {/* ========================================================================= */}
      {selectedFunnelProduct && (
        <SlideOutFunnelDrawer
          funnelId={selectedFunnelProduct.linkedFunnelId || selectedFunnelProduct.id}
          isOpen={Boolean(selectedFunnelProduct)}
          onClose={() => setSelectedFunnelProduct(null)}
          renderMode="component"
        />
      )}

    </header>
  );
};

export default MegaHubMarketplaceHeader;
