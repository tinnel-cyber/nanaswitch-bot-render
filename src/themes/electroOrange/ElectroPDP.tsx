import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronRight, ArrowLeft, Star, Heart, ShoppingBag, 
  RefreshCw, Check, ShieldCheck, Truck, Clock, Plus, 
  Minus, ShoppingCart, Zap, CheckCircle2, ChevronLeft,
  Share2, Eye, Box, Sliders
} from 'lucide-react';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { 
  ELECTRO_HEADPHONES_HERO_SVG, 
  ELECTRO_SMARTWATCH_DUO_SVG, 
  ELECTRO_SPEAKER_OVAL_SVG,
  ELECTRO_USB_DRIVE_SVG,
  ELECTRO_VR_HEADSET_SVG,
  ELECTRO_SMARTPHONE_GOLD_SVG
} from './electroOrangeAssets';
import { ELECTRO_ADDITIONAL_PRODUCTS, ELECTRO_SHOWCASE_PRODUCTS } from './electroTechData';
import { triggerOpenFunnel, hasExplicitProductFunnel } from '../themeUtils';

interface ElectroPDPProps {
  product: StoreProductItem;
  allProducts: StoreProductItem[];
  onBack: () => void;
  onNavigate: (view: 'home' | 'shop' | 'pdp') => void;
  onAddToCart: (p: StoreProductItem, qty: number) => void;
  onBuyNow: (p: StoreProductItem, qty: number) => void;
  onOpenFunnel?: (p: StoreProductItem) => void;
  onAddToWishlist?: (p: StoreProductItem) => void;
  onAddToCompare?: (p: StoreProductItem) => void;
  onSelectProduct: (p: StoreProductItem) => void;
}

const COLOR_VARIANTS = [
  { id: 'space-black', name: 'Noir Sidéral', hex: '#1E293B' },
  { id: 'pure-white', name: 'Blanc Pur', hex: '#F8FAFC', hasBorder: true },
  { id: 'rose-gold', name: 'Rose Gold', hex: '#F472B6' },
  { id: 'electro-orange', name: 'Orange Électro', hex: '#FF6A00' }
];

export const ElectroPDP: React.FC<ElectroPDPProps> = ({
  product,
  allProducts,
  onBack,
  onNavigate,
  onAddToCart,
  onBuyNow,
  onOpenFunnel,
  onAddToWishlist,
  onAddToCompare,
  onSelectProduct
}) => {
  // Galerie d'images multi-angles
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (product.image) list.push(product.image);

    // Multi-angles de démo haute fidélité
    list.push(
      ELECTRO_HEADPHONES_HERO_SVG,
      ELECTRO_SPEAKER_OVAL_SVG,
      ELECTRO_SMARTWATCH_DUO_SVG,
      ELECTRO_USB_DRIVE_SVG
    );
    return Array.from(new Set(list)).slice(0, 4);
  }, [product]);

  const colorVariantsToDisplay = useMemo(() => {
    if (product.colorSwatches && product.colorSwatches.length > 0) {
      return product.colorSwatches.map((c, i) => ({
        id: `swatch-${i}`,
        name: c.name,
        hex: c.hex,
        hasBorder: c.hex.toLowerCase() === '#ffffff'
      }));
    }
    if (Array.isArray(product.colorSwatches) && product.colorSwatches.length === 0) {
      return [];
    }
    return COLOR_VARIANTS;
  }, [product.colorSwatches]);

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState(colorVariantsToDisplay[0] || COLOR_VARIANTS[0]);

  useEffect(() => {
    if (colorVariantsToDisplay[0]) {
      setSelectedColor(colorVariantsToDisplay[0]);
    }
  }, [colorVariantsToDisplay]);

  const [quantity, setQuantity] = useState<number>(1);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [isCompared, setIsCompared] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'bundle' | 'description' | 'specs' | 'reviews'>('bundle');

  // Produits pour le bundle (Cross-sell natif)
  const bundleAccessories = useMemo(() => {
    if (product.bundleProductIds && product.bundleProductIds.length > 0) {
      const selected = allProducts.filter(p => product.bundleProductIds!.includes(p.id));
      if (selected.length >= 2) return selected.slice(0, 2);
      if (selected.length === 1) {
        return [
          selected[0],
          ELECTRO_ADDITIONAL_PRODUCTS[0] || {
            id: 'bundle-usb-64',
            name: 'Clé USB 3.0 Métal 64 GB Haute Vitesse',
            price: 12500,
            image: ELECTRO_USB_DRIVE_SVG,
            category: 'Accessoires & Stockage'
          }
        ];
      }
    }
    // Fallback automatique: jusqu'à 2 autres produits de la boutique
    const others = allProducts.filter(p => p.id !== product.id);
    if (others.length >= 2) return others.slice(0, 2);
    if (others.length === 1) {
      return [others[0], ELECTRO_ADDITIONAL_PRODUCTS[0]];
    }

    const defaultAcc1: StoreProductItem = ELECTRO_ADDITIONAL_PRODUCTS[0] || {
      id: 'bundle-usb-64',
      name: 'Clé USB 3.0 Métal 64 GB Haute Vitesse',
      price: 12500,
      image: ELECTRO_USB_DRIVE_SVG,
      category: 'Accessoires & Stockage',
      stock: 20
    };

    const defaultAcc2: StoreProductItem = ELECTRO_ADDITIONAL_PRODUCTS[1] || {
      id: 'bundle-vr-headset',
      name: 'Adaptateur Universel & Câble Tressé Pro',
      price: 18000,
      image: ELECTRO_VR_HEADSET_SVG,
      category: 'Connectique & Câbles',
      stock: 20
    };

    return [defaultAcc1, defaultAcc2];
  }, [product.bundleProductIds, allProducts, product.id]);

  // Sélection des articles du bundle (Cases à cocher)
  const [bundleChecked, setBundleChecked] = useState<{ main: boolean; acc1: boolean; acc2: boolean }>({
    main: true,
    acc1: true,
    acc2: true
  });

  const bundleDiscountPercent = product.bundleDiscountPercent || 0;

  // Calcul dynamique du prix total combiné du bundle avec remise éventuelle
  const rawBundleTotalPrice = useMemo(() => {
    let total = 0;
    if (bundleChecked.main) total += product.price;
    if (bundleChecked.acc1 && bundleAccessories[0]) total += bundleAccessories[0].price;
    if (bundleChecked.acc2 && bundleAccessories[1]) total += bundleAccessories[1].price;
    return total;
  }, [bundleChecked, product.price, bundleAccessories]);

  const bundleTotalPrice = useMemo(() => {
    if (bundleDiscountPercent > 0) {
      return Math.round(rawBundleTotalPrice * (1 - bundleDiscountPercent / 100));
    }
    return rawBundleTotalPrice;
  }, [rawBundleTotalPrice, bundleDiscountPercent]);

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 18;

  const originalPrice = product.originalPrice || Math.round(product.price * 1.22);
  const skuCode = `EL-${product.id ? String(product.id).replace(/\D/g, '').padStart(5, '0').slice(-5) : '84210'}`;

  // Gestion de l'achat direct Sebpay vs tunnel
  const handleProceedToPurchase = () => {
    playValidationBeep();
    onBuyNow(product, quantity);
  };

  const handleOpenTunnelDirect = () => {
    playValidationBeep();
    if (onOpenFunnel) {
      onOpenFunnel(product);
    } else {
      triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
    }
  };

  // Ajout de l'ensemble du bundle au panier
  const handleAddBundleToCart = () => {
    playValidationBeep();
    let count = 0;
    if (bundleChecked.main) {
      onAddToCart(product, 1);
      count++;
    }
    if (bundleChecked.acc1 && bundleAccessories[0]) {
      onAddToCart(bundleAccessories[0], 1);
      count++;
    }
    if (bundleChecked.acc2 && bundleAccessories[1]) {
      onAddToCart(bundleAccessories[1], 1);
      count++;
    }
    alert(`Pack Accessoires : ${count} produit(s) ajoutés au panier pour un total de ${formatCFA(bundleTotalPrice)} !`);
  };

  return (
    <div className="w-full bg-[#FFFFFF] text-[#333E48]">
      
      {/* =========================================================================
          1. FIL D'ARIANE (BREADCRUMBS)
          Structure : Accueil > Accessoires > [Catégorie] > [Nom du produit]
          Chaque élément entouré d'un léger cadre gris ou séparé par >
         ========================================================================= */}
      <div className="w-full border-b border-[#EAEAEA] bg-[#FAFBFD] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between text-xs text-slate-500 overflow-x-auto">
          <nav className="flex items-center gap-1.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onNavigate('home');
              }}
              className="px-2.5 py-1 rounded bg-white border border-[#EAEAEA] hover:border-[#FF6A00] hover:text-[#FF6A00] transition cursor-pointer font-medium"
            >
              Accueil
            </button>
            <span className="text-slate-400 font-bold">&gt;</span>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onNavigate('shop');
              }}
              className="px-2.5 py-1 rounded bg-white border border-[#EAEAEA] hover:border-[#FF6A00] hover:text-[#FF6A00] transition cursor-pointer font-medium"
            >
              Accessoires & High-Tech
            </button>
            <span className="text-slate-400 font-bold">&gt;</span>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onNavigate('shop');
              }}
              className="px-2.5 py-1 rounded bg-white border border-[#EAEAEA] hover:border-[#FF6A00] hover:text-[#FF6A00] transition cursor-pointer font-medium"
            >
              {product.category || 'Casques & Écouteurs'}
            </button>
            <span className="text-slate-400 font-bold">&gt;</span>

            <span className="px-2.5 py-1 rounded bg-orange-50 border border-orange-200 text-[#FF6A00] font-bold truncate max-w-xs">
              {product.name}
            </span>
          </nav>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onBack();
            }}
            className="hidden sm:flex items-center gap-1 text-slate-500 hover:text-[#FF6A00] font-semibold text-xs transition cursor-pointer shrink-0 ml-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour au catalogue</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. STRUCTURE HAUT DE PAGE (2 COLONNES : GALERIE 45% & INFOS/ACHAT 55%)
         ========================================================================= */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* =====================================================================
              COLONNE GAUCHE : GALERIE (45% -> col-span-5)
             ===================================================================== */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Image Principale Grande Taille (aspect-ratio: 1/1, object-fit: contain) sur fond blanc */}
            <div className="relative w-full aspect-square bg-white border border-[#EAEAEA] rounded-lg p-6 flex items-center justify-center overflow-hidden shadow-xs group">
              {discountPercent > 0 && (
                <span className="absolute top-4 left-4 bg-[#FF6A00] text-white text-xs font-black px-2.5 py-1 rounded shadow-sm z-10 uppercase tracking-wider">
                  -{discountPercent}% PROMO
                </span>
              )}

              <img
                src={galleryImages[activeImageIndex] || product.image}
                alt={product.name}
                className="max-h-full max-w-full object-contain transform group-hover:scale-105 transition-transform duration-300 select-none"
              />

              {/* Badges de Réassurance Visuelle en bas de l'image */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Certifié d'origine
                </span>
              </div>
            </div>

            {/* Rangée de Miniatures Carrées sous l'image principale (border: 1px solid #EAEAEA) */}
            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((imgUrl, idx) => {
                const isActive = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveImageIndex(idx);
                    }}
                    className={`aspect-square rounded bg-white p-2 flex items-center justify-center transition-all cursor-pointer ${
                      isActive 
                        ? 'border-2 border-[#FF6A00] shadow-sm ring-2 ring-orange-100' 
                        : 'border border-[#EAEAEA] hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Miniature ${idx + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </button>
                );
              })}
            </div>

            {/* Barre de réassurance immédiate sous la galerie */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-[11.5px] text-slate-600">
              <div className="flex items-center gap-2 p-2.5 rounded bg-[#F8F9FA] border border-[#EAEAEA]">
                <Truck className="w-4 h-4 text-[#FF6A00] shrink-0" />
                <span>Expédition express 24h</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded bg-[#F8F9FA] border border-[#EAEAEA]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Garantie officielle 1 an</span>
              </div>
            </div>

          </div>

          {/* =====================================================================
              COLONNE DROITE : INFOS & ACHAT (55% -> col-span-7)
             ===================================================================== */}
          <div className="lg:col-span-7 flex flex-col space-y-5">
            
            {/* Petite catégorie grise au-dessus */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
                {product.category || 'Accessoires & Audio'}
              </span>

              {/* Grand Titre du Produit (28px) */}
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#333E48] leading-tight tracking-tight">
                {product.name}
              </h1>
            </div>

            {/* Étoiles d'avis en Orange + lien (X avis clients) & Disponibilité */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center text-[#FF6A00]">
                  <Star className="w-4 h-4 fill-[#FF6A00]" />
                  <Star className="w-4 h-4 fill-[#FF6A00]" />
                  <Star className="w-4 h-4 fill-[#FF6A00]" />
                  <Star className="w-4 h-4 fill-[#FF6A00]" />
                  <Star className="w-4 h-4 fill-[#FF6A00]" />
                </div>
                <a 
                  href="#tabs-section" 
                  onClick={() => setActiveTab('reviews')}
                  className="font-bold text-[#0062BD] hover:underline"
                >
                  (42 avis clients vérifiés)
                </a>
              </div>

              <span className="text-slate-300">|</span>

              {/* Ligne de disponibilité : En stock (en vert et gras) */}
              <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Disponibilité : En stock immédiat</span>
              </div>
            </div>

            {/* Liens Rapides ♡ Wishlist et ⇄ Compare */}
            <div className="flex items-center gap-5 pt-1 pb-2 border-b border-[#EAEAEA] text-xs font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsWishlisted(prev => !prev);
                  if (onAddToWishlist) onAddToWishlist(product);
                }}
                className={`flex items-center gap-1.5 transition cursor-pointer ${
                  isWishlisted ? 'text-[#FF6A00] font-bold' : 'hover:text-[#FF6A00]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#FF6A00] text-[#FF6A00]' : ''}`} />
                <span>{isWishlisted ? 'Ajouté aux favoris' : '♡ Ajouter aux favoris'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsCompared(prev => !prev);
                  if (onAddToCompare) onAddToCompare(product);
                }}
                className={`flex items-center gap-1.5 transition cursor-pointer ${
                  isCompared ? 'text-[#FF6A00] font-bold' : 'hover:text-[#FF6A00]'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isCompared ? 'Produit au comparateur' : '⇄ Comparer ce modèle'}</span>
              </button>
            </div>

            {/* Liste à puces (bullet points) des caractéristiques clés en gris foncé + SKU */}
            <div className="space-y-2 text-xs sm:text-[13px] text-slate-600 leading-relaxed bg-[#FAFBFD] p-4 rounded-lg border border-[#EAEAEA]">
              <ul className="space-y-1.5 list-disc pl-4 marker:text-[#FF6A00]">
                {product.keyFeatures && product.keyFeatures.length > 0 ? (
                  product.keyFeatures.map((feat, idx) => (
                    <li key={idx} className="font-semibold text-slate-800">{feat}</li>
                  ))
                ) : (
                  <>
                    <li>Acoustique calibrée de précision pour une restitution sonore cristalline et des basses profondes.</li>
                    <li>Conception ergonomique légère avec coussinets à mémoire de forme pour un confort prolongé.</li>
                    <li>Connectivité sans fil Bluetooth 5.3 ultra-faible latence et compatibilité universelle (iOS, Android, Windows, Mac).</li>
                    <li>Autonomie longue durée jusqu'à 40 heures avec charge rapide Fast-Fuel (10 min = 3 heures d'écoute).</li>
                  </>
                )}
              </ul>

              <div className="pt-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                SKU : <strong className="text-slate-700">{skuCode}</strong>
              </div>
            </div>

            {/* Le Prix : Très grand (34px, font-weight: 700) accompagné de l'ancien prix barré */}
            <div className="flex items-baseline gap-4 pt-2">
              <span className="text-3xl sm:text-[34px] font-bold text-[#333E48] font-mono leading-none tracking-tight">
                {formatCFA(product.price)}
              </span>
              <span className="text-base font-semibold text-slate-400 line-through">
                {formatCFA(originalPrice)}
              </span>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Économisez {formatCFA(originalPrice - product.price)}
              </span>
            </div>

            {/* Options de Taille / Capacité (si renseignées) */}
            {product.sizeOptions && product.sizeOptions.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-700">
                  Capacité / Format :
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizeOptions.map((sz, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1 bg-white border border-[#EAEAEA] rounded-lg text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      {sz}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Variantes : Sélecteur de couleur propre (masqué si colorSwatches est vide) */}
            {colorVariantsToDisplay.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-700">
                  Couleur : <span className="text-[#FF6A00]">{selectedColor.name}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  {colorVariantsToDisplay.map((c) => {
                    const isSelected = selectedColor.id === c.id || selectedColor.name === c.name;
                    return (
                      <button
                        key={c.id || c.name}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedColor(c);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'ring-2 ring-offset-2 ring-[#FF6A00] scale-110' 
                            : 'hover:scale-105'
                        } ${c.hasBorder ? 'border border-slate-300' : 'border border-black/10'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {isSelected && (
                          <Check className={`w-4 h-4 stroke-[3] ${c.hex.toLowerCase() === '#ffffff' ? 'text-slate-900' : 'text-white'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sélecteur de Quantité arrondi (1 - +) & Gros Bouton Pilule Orange Acheter */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              
              {/* Sélecteur de quantité arrondi (1 - +) */}
              <div className="flex items-center border border-[#EAEAEA] rounded-full bg-white h-12 px-2 shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setQuantity(prev => Math.max(1, prev - 1));
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                  title="Diminuer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="w-10 text-center font-black text-sm text-[#333E48]">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setQuantity(prev => prev + 1);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                  title="Augmenter"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bouton Acheter : Caisse Checkout Principale Sebpay */}
              <button
                type="button"
                onClick={handleProceedToPurchase}
                className="flex-1 h-12 rounded-[50px] bg-[#FF6A00] hover:bg-[#E05D00] text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md shadow-orange-500/25 cursor-pointer transform hover:-translate-y-0.5"
                title="Acheter via la caisse Checkout principale Sebpay"
              >
                <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                <span>Acheter</span>
              </button>

              {/* Bouton Voir Tunnel (uniquement si expressément activé sur le produit) */}
              {hasExplicitProductFunnel(product) && (
                <button
                  type="button"
                  onClick={handleOpenTunnelDirect}
                  className="px-4 h-12 rounded-[50px] border-2 border-[#FF6A00] text-[#FF6A00] hover:bg-orange-50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                  title="Voir le tunnel de vente 12 blocs"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Voir Tunnel</span>
                </button>
              )}

              {/* Bouton secondaire Ajouter au Panier */}
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  onAddToCart(product, quantity);
                }}
                className="h-12 px-5 rounded-[50px] bg-slate-100 hover:bg-slate-200 text-[#333E48] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                title="Ajouter au panier standard"
              >
                <ShoppingBag className="w-4 h-4 text-[#FF6A00]" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>

            </div>

            {/* Reassurance d'Achat Mobile Money & WhatsApp */}
            <div className="pt-2 flex items-center gap-4 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Paiement à la livraison accepté
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Zap className="w-4 h-4 text-amber-500" />
                Commande directe en 1 clic
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* =========================================================================
          3. LES 4 ONGLETS DE CONTENU & LE "BUNDLE" (VENTE GROUPÉE)
          Barre de 4 onglets centrés :
          Accessoires (Bundle) | Description | Spécifications | Avis
          (avec soulignement Orange sur l'onglet actif)
         ========================================================================= */}
      <section id="tabs-section" className="w-full bg-[#FAFBFD] border-t border-[#EAEAEA] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          
          {/* Barre d'onglets centrée avec trait de soulignement Orange */}
          <div className="flex justify-center border-b border-[#EAEAEA] mb-8">
            <div className="flex items-center gap-4 sm:gap-10 overflow-x-auto pb-0">
              
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveTab('bundle');
                }}
                className={`pb-3.5 text-sm sm:text-base font-extrabold uppercase tracking-wide transition cursor-pointer relative whitespace-nowrap ${
                  activeTab === 'bundle'
                    ? 'text-[#FF6A00] border-b-2 border-[#FF6A00]'
                    : 'text-slate-500 hover:text-[#333E48]'
                }`}
              >
                Accessoires (Bundle)
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveTab('description');
                }}
                className={`pb-3.5 text-sm sm:text-base font-extrabold uppercase tracking-wide transition cursor-pointer relative whitespace-nowrap ${
                  activeTab === 'description'
                    ? 'text-[#FF6A00] border-b-2 border-[#FF6A00]'
                    : 'text-slate-500 hover:text-[#333E48]'
                }`}
              >
                Description
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setActiveTab('specs');
                }}
                className={`pb-3.5 text-sm sm:text-base font-extrabold uppercase tracking-wide transition cursor-pointer relative whitespace-nowrap ${
                  activeTab === 'specs'
                    ? 'text-[#FF6A00] border-b-2 border-[#FF6A00]'
                    : 'text-slate-500 hover:text-[#333E48]'
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
                className={`pb-3.5 text-sm sm:text-base font-extrabold uppercase tracking-wide transition cursor-pointer relative whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'text-[#FF6A00] border-b-2 border-[#FF6A00]'
                    : 'text-slate-500 hover:text-[#333E48]'
                }`}
              >
                Avis (42)
              </button>

            </div>
          </div>

          {/* =====================================================================
              ONGLET 1 : ACCESSOIRES (BUNDLE / CROSS-SELL NATIF)
              3 produits côte à côte reliés par des signes +
              Cases à cocher en bas avec recalcul dynamique en temps réel
              Prix total combiné à droite + bouton pilule Orange "Tout ajouter au panier"
             ===================================================================== */}
          {activeTab === 'bundle' && (
            <div className="bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-8 shadow-xs">
              <div className="mb-6">
                <h3 className="text-lg font-black text-[#333E48] uppercase tracking-tight">
                  Fréquemment Achetés Ensemble (Pack Avantage)
                </h3>
                <p className="text-xs text-slate-500">
                  Économisez davantage en achetant ces accessoires complémentaires spécialement recommandés pour ce produit.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* 3 Produits Côte à Côte reliés par des Signes + (col-span-8) */}
                <div className="lg:col-span-8 flex flex-col sm:flex-row items-center justify-start gap-3 sm:gap-4 overflow-x-auto py-2">
                  
                  {/* Produit Principal */}
                  <div className={`p-4 rounded-lg border bg-white flex flex-col items-center text-center w-48 shrink-0 transition ${
                    bundleChecked.main ? 'border-[#FF6A00] shadow-sm' : 'border-[#EAEAEA] opacity-50'
                  }`}>
                    <div className="w-28 h-28 flex items-center justify-center p-2 mb-2 bg-[#FAFBFD] rounded">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 line-clamp-1">
                      {product.name}
                    </span>
                    <strong className="text-sm font-black text-[#333E48] font-mono mt-1">
                      {formatCFA(product.price)}
                    </strong>
                  </div>

                  {/* Signe + */}
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF6A00] font-black flex items-center justify-center shrink-0 text-lg">
                    +
                  </div>

                  {/* Accessoire 1 */}
                  <div className={`p-4 rounded-lg border bg-white flex flex-col items-center text-center w-48 shrink-0 transition ${
                    bundleChecked.acc1 ? 'border-[#FF6A00] shadow-sm' : 'border-[#EAEAEA] opacity-50'
                  }`}>
                    <div className="w-28 h-28 flex items-center justify-center p-2 mb-2 bg-[#FAFBFD] rounded">
                      <img
                        src={bundleAccessories[0].image}
                        alt={bundleAccessories[0].name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 line-clamp-1">
                      {bundleAccessories[0].name}
                    </span>
                    <strong className="text-sm font-black text-[#333E48] font-mono mt-1">
                      {formatCFA(bundleAccessories[0].price)}
                    </strong>
                  </div>

                  {/* Signe + */}
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF6A00] font-black flex items-center justify-center shrink-0 text-lg">
                    +
                  </div>

                  {/* Accessoire 2 */}
                  <div className={`p-4 rounded-lg border bg-white flex flex-col items-center text-center w-48 shrink-0 transition ${
                    bundleChecked.acc2 ? 'border-[#FF6A00] shadow-sm' : 'border-[#EAEAEA] opacity-50'
                  }`}>
                    <div className="w-28 h-28 flex items-center justify-center p-2 mb-2 bg-[#FAFBFD] rounded">
                      <img
                        src={bundleAccessories[1].image}
                        alt={bundleAccessories[1].name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 line-clamp-1">
                      {bundleAccessories[1].name}
                    </span>
                    <strong className="text-sm font-black text-[#333E48] font-mono mt-1">
                      {formatCFA(bundleAccessories[1].price)}
                    </strong>
                  </div>

                </div>

                {/* Total Combiné & Bouton Pilule Orange "Tout ajouter au panier" (col-span-4) */}
                <div className="lg:col-span-4 bg-[#FAFBFD] p-6 rounded-xl border border-[#EAEAEA] flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Prix Total Combiné
                      </span>
                      {bundleDiscountPercent > 0 && (
                        <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                          -{bundleDiscountPercent}% PACK
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2.5">
                      <div className="text-3xl font-black text-[#E52E04] font-mono">
                        {formatCFA(bundleTotalPrice)}
                      </div>
                      {bundleDiscountPercent > 0 && rawBundleTotalPrice > bundleTotalPrice && (
                        <span className="text-sm text-slate-400 line-through">
                          {formatCFA(rawBundleTotalPrice)}
                        </span>
                      )}
                    </div>
                    <span className="text-[11.5px] text-emerald-600 font-bold block">
                      ✓ Remise groupée appliquée automatiquement
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBundleToCart}
                    className="w-full h-12 rounded-[50px] bg-[#FF6A00] hover:bg-[#E05D00] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Tout ajouter au panier</span>
                  </button>
                </div>

              </div>

              {/* En bas : Liste de cases à cocher (Checkboxes) interactives */}
              <div className="mt-8 pt-6 border-t border-[#EAEAEA] space-y-3">
                <label className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundleChecked.main}
                    onChange={(e) => {
                      playTapBeep();
                      setBundleChecked(prev => ({ ...prev, main: e.target.checked }));
                    }}
                    className="w-4 h-4 text-[#FF6A00] accent-[#FF6A00] rounded cursor-pointer"
                  />
                  <span>
                    <strong>Ce produit :</strong> {product.name} — <span className="font-mono font-bold text-slate-900">{formatCFA(product.price)}</span>
                  </span>
                </label>

                <label className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundleChecked.acc1}
                    onChange={(e) => {
                      playTapBeep();
                      setBundleChecked(prev => ({ ...prev, acc1: e.target.checked }));
                    }}
                    className="w-4 h-4 text-[#FF6A00] accent-[#FF6A00] rounded cursor-pointer"
                  />
                  <span>
                    <strong>Accessoire 1 :</strong> {bundleAccessories[0].name} — <span className="font-mono font-bold text-slate-900">{formatCFA(bundleAccessories[0].price)}</span>
                  </span>
                </label>

                <label className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundleChecked.acc2}
                    onChange={(e) => {
                      playTapBeep();
                      setBundleChecked(prev => ({ ...prev, acc2: e.target.checked }));
                    }}
                    className="w-4 h-4 text-[#FF6A00] accent-[#FF6A00] rounded cursor-pointer"
                  />
                  <span>
                    <strong>Accessoire 2 :</strong> {bundleAccessories[1].name} — <span className="font-mono font-bold text-slate-900">{formatCFA(bundleAccessories[1].price)}</span>
                  </span>
                </label>
              </div>

            </div>
          )}

          {/* =====================================================================
              ONGLET 2 : DESCRIPTION (MISE EN PAGE "ZIG-ZAG" FAÇON APPLE)
              Alterne texte à gauche / image à droite, puis image à gauche / texte à droite
             ===================================================================== */}
          {activeTab === 'description' && (
            <div className="bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-12 space-y-16">
              
              {/* Bloc 1 : Texte à gauche / Image à droite */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-7 space-y-4">
                  <span className="text-xs font-black uppercase tracking-widest text-[#FF6A00] bg-orange-50 px-2.5 py-1 rounded">
                    Performance Acoustique Pure
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-extrabold text-[#333E48] tracking-tight">
                    Un son immersif haute définition conçu sans aucun compromis
                  </h4>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Découvrez une clarté spectaculaire et une dynamique sonore équilibrée grâce à notre moteur de traitement numérique de pointe. Chaque nuance, du grave le plus profond aux aigus les plus délicats, est restituée avec une fidélité digne d'un studio d'enregistrement.
                  </p>
                </div>
                <div className="md:col-span-5 flex items-center justify-center p-6 bg-[#FAFBFD] rounded-2xl border border-[#EAEAEA]">
                  <img
                    src={ELECTRO_HEADPHONES_HERO_SVG}
                    alt="Immersion sonore"
                    className="max-h-64 object-contain"
                  />
                </div>
              </div>

              {/* Bloc 2 : Image à gauche / Texte à droite */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-5 flex items-center justify-center p-6 bg-[#FAFBFD] rounded-2xl border border-[#EAEAEA] order-2 md:order-1">
                  <img
                    src={ELECTRO_SPEAKER_OVAL_SVG}
                    alt="Acoustique 360"
                    className="max-h-64 object-contain"
                  />
                </div>
                <div className="md:col-span-7 space-y-4 order-1 md:order-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#FF6A00] bg-orange-50 px-2.5 py-1 rounded">
                    Autonomie & Connectivité 360°
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-extrabold text-[#333E48] tracking-tight">
                    Jusqu'à 40 heures d'écoute continue et recharge ultra-rapide
                  </h4>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Grâce à la gestion d'énergie intelligente, profitez de plusieurs jours d'utilisation sans avoir à chercher une prise. La technologie Fast-Fuel vous redonne 3 heures d'écoute complète en seulement 10 minutes de charge par câble USB-C renforcé.
                  </p>
                </div>
              </div>

              {/* Bloc 3 : Caractéristiques détaillées */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-[#EAEAEA]">
                <div className="p-5 rounded-lg bg-[#FAFBFD] border border-[#EAEAEA] space-y-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-[#FF6A00] flex items-center justify-center font-black">
                    1
                  </div>
                  <h5 className="font-extrabold text-slate-800 text-sm">Design Ergonomique Confort</h5>
                  <p className="text-xs text-slate-500 leading-normal">
                    Arceau réglable et coussinets respirants pour une tenue idéale sans aucune pression sur les oreilles.
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-[#FAFBFD] border border-[#EAEAEA] space-y-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-[#FF6A00] flex items-center justify-center font-black">
                    2
                  </div>
                  <h5 className="font-extrabold text-slate-800 text-sm">Commandes Tactiles Intuitive</h5>
                  <p className="text-xs text-slate-500 leading-normal">
                    Contrôlez vos morceaux, ajustez le volume et prenez vos appels vocaux sans sortir votre smartphone.
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-[#FAFBFD] border border-[#EAEAEA] space-y-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-[#FF6A00] flex items-center justify-center font-black">
                    3
                  </div>
                  <h5 className="font-extrabold text-slate-800 text-sm">Microphones Anti-Bruit</h5>
                  <p className="text-xs text-slate-500 leading-normal">
                    Isolation active des bruits ambiants pour des conversations limpides même dans les environnements urbains.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* =====================================================================
              ONGLET 3 : SPÉCIFICATIONS TECHNIQUES
             ===================================================================== */}
          {activeTab === 'specs' && (
            <div className="bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-8">
              <h4 className="text-base font-black text-[#333E48] uppercase tracking-wider mb-4">
                Fiche Technique Complète
              </h4>

              <div className="divide-y divide-[#EAEAEA] border border-[#EAEAEA] rounded-lg overflow-hidden text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-[#FAFBFD]">
                  <span className="font-bold text-slate-500">Modèle & Référence</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">{product.name} ({skuCode})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-white">
                  <span className="font-bold text-slate-500">Connectivité sans fil</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">Bluetooth 5.3 Low Energy + Câble Audio 3.5mm jack</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-[#FAFBFD]">
                  <span className="font-bold text-slate-500">Autonomie de la batterie</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">Jusqu'à 40 heures (Recharge rapide USB-C Fast Fuel)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-white">
                  <span className="font-bold text-slate-500">Fréquence de réponse</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">20 Hz - 20 000 Hz (Certification Hi-Res Audio)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-[#FAFBFD]">
                  <span className="font-bold text-slate-500">Poids & Dimensions</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">215 grammes • Structure pliable compacte</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-white">
                  <span className="font-bold text-slate-500">Contenu du coffret</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">Casque, Étui rigide de transport, Câble de charge USB-C, Câble Jack 3.5mm, Manuel</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-[#FAFBFD]">
                  <span className="font-bold text-slate-500">Garantie constructeur</span>
                  <span className="sm:col-span-2 font-semibold text-emerald-600 font-bold">12 mois pièces et main d'œuvre officielle</span>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              ONGLET 4 : AVIS CLIENTS
             ===================================================================== */}
          {activeTab === 'reviews' && (
            <div className="bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-8 space-y-6">
              
              {/* Résumé de notation */}
              <div className="flex flex-col sm:flex-row items-center gap-8 pb-6 border-b border-[#EAEAEA]">
                <div className="text-center sm:text-left space-y-1">
                  <div className="text-5xl font-black text-[#333E48] font-mono leading-none">
                    4.9
                  </div>
                  <div className="flex items-center text-[#FF6A00] justify-center sm:justify-start">
                    <Star className="w-5 h-5 fill-[#FF6A00]" />
                    <Star className="w-5 h-5 fill-[#FF6A00]" />
                    <Star className="w-5 h-5 fill-[#FF6A00]" />
                    <Star className="w-5 h-5 fill-[#FF6A00]" />
                    <Star className="w-5 h-5 fill-[#FF6A00]" />
                  </div>
                  <span className="text-xs text-slate-400 font-bold block">
                    Basé sur 42 avis clients vérifiés
                  </span>
                </div>

                <div className="flex-1 w-full space-y-1.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-12 font-bold text-slate-500">5 étoiles</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF6A00] rounded-full" style={{ width: '88%' }} />
                    </div>
                    <span className="w-8 text-right font-mono font-bold text-slate-600">88%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-12 font-bold text-slate-500">4 étoiles</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF6A00] rounded-full" style={{ width: '10%' }} />
                    </div>
                    <span className="w-8 text-right font-mono font-bold text-slate-600">10%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-12 font-bold text-slate-500">3 étoiles</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF6A00] rounded-full" style={{ width: '2%' }} />
                    </div>
                    <span className="w-8 text-right font-mono font-bold text-slate-600">2%</span>
                  </div>
                </div>
              </div>

              {/* Liste de commentaires réels */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#FAFBFD] border border-[#EAEAEA] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs sm:text-sm font-bold text-slate-800">Ibrahim K.</strong>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Achat vérifié
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">Il y a 3 jours</span>
                  </div>
                  <div className="flex items-center text-[#FF6A00]">
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Qualité sonore irréprochable ! Reçu à Abidjan en 24h chrono, emballage soigné d'origine scellé. Les basses sont nettes et la batterie tient facilement toute la semaine.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#FAFBFD] border border-[#EAEAEA] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs sm:text-sm font-bold text-slate-800">Fatoumata D.</strong>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Achat vérifié
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">Il y a 1 semaine</span>
                  </div>
                  <div className="flex items-center text-[#FF6A00]">
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                    <Star className="w-3.5 h-3.5 fill-[#FF6A00]" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Très satisfaite de la finition Rose Gold, c'est encore plus beau en vrai que sur les photos. Le service client a répondu rapidement à mes questions sur WhatsApp.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </section>

    </div>
  );
};
