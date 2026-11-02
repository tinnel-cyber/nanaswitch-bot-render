import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronRight, ArrowLeft, Star, Heart, ShoppingCart, Zap, 
  ShieldCheck, Truck, RefreshCw, Check, Share2, Facebook, 
  Twitter, MessageCircle, ChevronDown, ChevronUp, Eye, Sparkles,
  HelpCircle, CheckCircle2, ChevronLeft, Award
} from 'lucide-react';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { sanitizeRichHtml } from '../../utils/security';
import { MEGA_CATEGORIES } from './megaStoreCategoriesData';
import { 
  HEADSET_IMG_1, HEADSET_IMG_2, 
  CAMERA_IMG_1, CAMERA_IMG_2,
  CONTROLLER_IMG_1, CONTROLLER_IMG_2,
  MINT_PHONE_IMG_1, MINT_PHONE_IMG_2,
  WATCH_IMG_1, WATCH_IMG_2
} from './megaStoreAssets';

interface MegaStorePDPProps {
  product: StoreProductItem;
  allProducts: StoreProductItem[];
  onBack: () => void;
  onAddToCart: (product: StoreProductItem, qty?: number) => void;
  onBuyNow: (product: StoreProductItem, qty: number) => void;
  onSelectProduct: (product: StoreProductItem) => void;
  whatsappPhone?: string;
}

const COLOR_SWATCHES = [
  { id: 'black', name: 'Noir Ébène', hex: '#111827' },
  { id: 'red', name: 'Rouge Passion', hex: '#DC2626' },
  { id: 'white', name: 'Blanc Céramique', hex: '#F8FAFC', border: true },
  { id: 'blue', name: 'Bleu Royal', hex: '#2563EB' },
  { id: 'green', name: 'Vert Menthe', hex: '#10B981' }
];

const SIZE_SWATCHES = ['S', 'M', 'L', 'XL', 'XXL'];

export const MegaStorePDP: React.FC<MegaStorePDPProps> = ({
  product,
  allProducts,
  onBack,
  onAddToCart,
  onBuyNow,
  onSelectProduct,
  whatsappPhone
}) => {
  // Galerie d'images multi-angles
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (product.image) list.push(product.image);
    
    // Ajout d'images alternatives selon la catégorie
    const cat = (product.category || '').toLowerCase();
    if (cat.includes('audio') || cat.includes('casque')) {
      list.push(HEADSET_IMG_1, HEADSET_IMG_2);
    } else if (cat.includes('caméra') || cat.includes('sécurité')) {
      list.push(CAMERA_IMG_1, CAMERA_IMG_2);
    } else if (cat.includes('gaming') || cat.includes('manette')) {
      list.push(CONTROLLER_IMG_1, CONTROLLER_IMG_2);
    } else if (cat.includes('phone') || cat.includes('smart')) {
      list.push(MINT_PHONE_IMG_1, MINT_PHONE_IMG_2);
    } else if (cat.includes('montre') || cat.includes('watch')) {
      list.push(WATCH_IMG_1, WATCH_IMG_2);
    } else {
      list.push(HEADSET_IMG_1, MINT_PHONE_IMG_1, WATCH_IMG_1);
    }

    return Array.from(new Set(list)).slice(0, 5);
  }, [product]);

  const activeColorSwatches = useMemo(() => {
    if (product.colorSwatches && product.colorSwatches.length > 0) {
      return product.colorSwatches.map((c, i) => ({
        id: `swatch-${i}`,
        name: c.name,
        hex: c.hex,
        border: c.hex.toLowerCase() === '#ffffff'
      }));
    }
    if (Array.isArray(product.colorSwatches) && product.colorSwatches.length === 0) {
      return [];
    }
    return COLOR_SWATCHES;
  }, [product.colorSwatches]);

  const activeSizes = useMemo(() => {
    if (product.sizeOptions && product.sizeOptions.length > 0) {
      return product.sizeOptions;
    }
    return SIZE_SWATCHES;
  }, [product.sizeOptions]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(activeColorSwatches[0] || COLOR_SWATCHES[0]);
  const [selectedSize, setSelectedSize] = useState(activeSizes[0] || SIZE_SWATCHES[1]);

  useEffect(() => {
    if (activeColorSwatches[0]) setSelectedColor(activeColorSwatches[0]);
  }, [activeColorSwatches]);

  useEffect(() => {
    if (activeSizes[0]) setSelectedSize(activeSizes[0]);
  }, [activeSizes]);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'shipping'>('description');
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [isBestSaleOpen, setIsBestSaleOpen] = useState(true);

  // Produits pour le bloc Best Sale de la barre latérale
  const bestSaleProducts = useMemo(() => {
    return allProducts.filter(p => p.id !== product.id).slice(0, 4);
  }, [allProducts, product.id]);

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 15;

  const originalPrice = product.originalPrice || Math.round(product.price * 1.25);

  const handlePrevImage = () => {
    playTapBeep();
    setActiveImageIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    playTapBeep();
    setActiveImageIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCart = () => {
    playValidationBeep();
    onAddToCart(product, quantity);
  };

  const handleBuyNow = () => {
    playValidationBeep();
    onBuyNow(product, quantity);
  };

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#1E293B]">
      
      {/* 1. FIL D'ARIANE (BREADCRUMB & RETOUR CATALOGUE) */}
      <div className="w-full bg-[#F8F9FA] border-b border-[#EBEBEB] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
            <button 
              type="button" 
              onClick={onBack}
              className="text-[#0056D2] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Accueil</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-600 font-semibold">{product.category || 'Rayon Mega-Store'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-900 font-bold truncate max-w-[220px] sm:max-w-md">{product.name}</span>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-[#0056D2] hover:text-[#0046AB] font-bold text-xs cursor-pointer shrink-0 ml-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour au catalogue</span>
          </button>
        </div>
      </div>

      {/* 2. CONTENU PRINCIPAL DE LA PDP (SIDEBAR + GALERIE + FICHE DE VENTE) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* =======================================================================
              A. COLONNE GAUCHE (SIDEBAR RETRAIL : CATÉGORIES & MEILLEURES VENTES)
             ======================================================================= */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6">
            
            {/* Accordéon Catégories */}
            <div className="border border-[#EBEBEB] rounded bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                className="w-full p-3.5 flex items-center justify-between bg-slate-50 border-b border-[#EBEBEB] text-slate-900 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                <span>Rayons & Catégories</span>
                {isCategoriesOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {isCategoriesOpen && (
                <div className="p-2 space-y-1">
                  {MEGA_CATEGORIES.map((cat) => {
                    const isCatActive = (product.category || '').toLowerCase() === cat.name.toLowerCase();
                    return (
                      <div
                        key={cat.id}
                        onClick={onBack}
                        className={`p-2 rounded text-xs flex items-center justify-between cursor-pointer transition ${
                          isCatActive ? 'bg-blue-50 text-[#0056D2] font-bold' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        {cat.badge && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                            {cat.badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Accordéon Meilleures Ventes (Best Sale) */}
            <div className="border border-[#EBEBEB] rounded bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setIsBestSaleOpen(!isBestSaleOpen)}
                className="w-full p-3.5 flex items-center justify-between bg-slate-50 border-b border-[#EBEBEB] text-slate-900 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                <span>Meilleures Ventes</span>
                {isBestSaleOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {isBestSaleOpen && (
                <div className="p-3 space-y-3">
                  {bestSaleProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        playTapBeep();
                        onSelectProduct(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded cursor-pointer transition group"
                    >
                      <div className="w-12 h-12 rounded bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        <img 
                          src={p.image || HEADSET_IMG_1} 
                          alt={p.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[11.5px] font-bold text-slate-800 truncate group-hover:text-[#0056D2] transition-colors">
                          {p.name}
                        </h5>
                        <div className="text-xs font-black text-[#0056D2]">
                          {formatCFA(p.price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* =======================================================================
              B. COLONNE CENTRALE : GALERIE MULTI-ANGLES AVEC MINIATURES
             ======================================================================= */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Image Principale Agrandie */}
            <div className="w-full aspect-square bg-[#FFFFFF] rounded border border-[#EBEBEB] relative flex items-center justify-center p-6 shadow-xs overflow-hidden group">
              
              {/* Badge Remise en haut à gauche */}
              {discountPercent > 0 && (
                <span className="absolute top-4 left-4 z-10 px-2.5 py-1 bg-[#0056D2] text-white text-xs font-black rounded-xs shadow-sm">
                  -{discountPercent}%
                </span>
              )}

              {/* Badge Disponibilité en haut à droite */}
              <span className="absolute top-4 right-4 z-10 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-extrabold uppercase rounded-xs">
                En Stock
              </span>

              {/* Image Actuelle */}
              <img 
                src={galleryImages[activeImageIndex] || product.image || HEADSET_IMG_1} 
                alt={product.name}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />

              {/* Flèches de Défilement Rapide */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow flex items-center justify-center border border-slate-200 transition cursor-pointer"
                    title="Image précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow flex items-center justify-center border border-slate-200 transition cursor-pointer"
                    title="Image suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Rangée de Miniatures Cliquables (Thumbnails) */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveImageIndex(idx);
                    }}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded border-2 p-1 bg-white cursor-pointer transition shrink-0 ${
                      activeImageIndex === idx 
                        ? 'border-[#0056D2] shadow-sm' 
                        : 'border-[#EBEBEB] hover:border-slate-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`Miniature ${idx + 1}`} 
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* =======================================================================
              C. COLONNE DROITE : FICHE D'ACHAT, SWATCHES & DOUBLE BOUTON
             ======================================================================= */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Titre & Évaluations */}
            <div className="space-y-2 border-b border-[#EBEBEB] pb-4">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {product.name}
              </h1>

              {/* Prix en Grand Format */}
              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#DC2626]">
                  {formatCFA(product.price)}
                </span>
                {originalPrice > product.price && (
                  <span className="text-sm text-slate-400 line-through font-semibold">
                    {formatCFA(originalPrice)}
                  </span>
                )}
              </div>

              {/* Étoiles d'Avis & Note */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs text-slate-500 font-semibold">(18 avis clients)</span>
                <span className="text-slate-300">•</span>
                <button 
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="text-xs text-[#0056D2] hover:underline font-bold cursor-pointer"
                >
                  Donner un avis
                </button>
              </div>

              {/* Points Fidélité Récompense */}
              <div className="p-2 rounded bg-amber-50 border border-amber-200/60 flex items-center gap-2 text-xs text-amber-900 font-bold">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Gagnez 135 Points Nanasore sur cet achat.</span>
              </div>

              {/* Points Clés Techniques (keyFeatures) si renseignés */}
              {product.keyFeatures && product.keyFeatures.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  {product.keyFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SÉLECTEURS VISUELS DE VARIANTES (SWATCHES COULEUR & TAILLE) */}
            <div className="space-y-4 border-b border-[#EBEBEB] pb-5">
              
              {/* 1. Sélecteur de Couleur (masqué si vide) */}
              {activeColorSwatches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Couleur : <strong className="text-slate-950 font-black">{selectedColor.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {activeColorSwatches.map((color) => {
                      const isSelected = selectedColor.id === color.id || selectedColor.name === color.name;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setSelectedColor(color);
                          }}
                          style={{ backgroundColor: color.hex }}
                          className={`w-7 h-7 rounded-full cursor-pointer transition-all transform ${
                            isSelected 
                              ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm' 
                              : 'hover:scale-105 opacity-90'
                          } ${color.border ? 'border border-slate-300' : ''}`}
                          title={color.name}
                          aria-label={color.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Sélecteur de Taille (Carrés cliquables) */}
              {activeSizes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Taille : <strong className="text-slate-950 font-black">{selectedSize}</strong></span>
                    <button 
                      type="button" 
                      onClick={() => alert("Guide des tailles : S (36-38), M (39-41), L (42-44), XL (45-47).")}
                      className="text-[#0056D2] hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      Guide des tailles
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSizes.map((size) => {
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setSelectedSize(size);
                          }}
                          className={`min-w-[40px] h-9 px-2 rounded-xs font-black text-xs cursor-pointer transition border ${
                            isSelected 
                              ? 'border-slate-950 bg-slate-950 text-white shadow-xs' 
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Sélecteur de Quantité */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Quantité :</span>
                <div className="flex items-center border border-slate-300 rounded-xs w-32 h-10 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setQuantity(prev => Math.max(1, prev - 1));
                    }}
                    className="w-10 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 h-full text-center font-black text-xs text-slate-900 border-none outline-none"
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setQuantity(prev => prev + 1);
                    }}
                    className="w-10 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* DOUBLE BOUTON D'ACHAT & WISHLIST */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {/* Bouton Ajouter au Panier (Outline Bleu) */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 py-3 px-4 bg-white hover:bg-blue-50 text-[#0056D2] border-2 border-[#0056D2] font-black text-xs uppercase tracking-wider rounded-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                  <span>Ajouter au panier</span>
                </button>

                {/* Bouton Wishlist */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsWishlisted(!isWishlisted);
                  }}
                  className={`p-3 rounded-xs border transition cursor-pointer ${
                    isWishlisted 
                      ? 'bg-rose-50 border-rose-300 text-rose-600' 
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Ajouter à la liste d'envies"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                </button>
              </div>

              {/* Grand Bouton Acheter Maintenant (Plein Bleu) */}
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full py-3.5 px-6 bg-[#0056D2] hover:bg-[#0046AB] text-white font-black text-sm uppercase tracking-wider rounded-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Acheter maintenant</span>
              </button>

              {/* Case Conditions Générales de Vente */}
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="rounded text-[#0056D2] focus:ring-[#0056D2]"
                />
                <span>J'accepte les Conditions Générales de Vente & politique de retour</span>
              </label>

              {/* Compteur Urgence Livraison */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Truck className="w-4 h-4 text-[#0056D2]" />
                  <span>Commandez dans les <strong>04h 25m</strong> pour être livré d'ici Jeudi !</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Expédition express sécurisée avec suivi par SMS et WhatsApp.
                </p>
              </div>
            </div>

            {/* DÉTAILS TECHNIQUES & RÉASSURANCE PAIEMENT */}
            <div className="space-y-3 pt-2 border-t border-[#EBEBEB] text-xs">
              <div className="space-y-1.5 text-slate-600">
                <div>SKU : <strong className="text-slate-900 font-bold">SKU-89241-{product.id.slice(-4)}</strong></div>
                <div>Marque : <strong className="text-slate-900 font-bold">Vendor Officiel Nanasore</strong></div>
                <div>Catégorie : <strong className="text-slate-900 font-bold">{product.category || 'Électronique'}</strong></div>
                <div>Disponibilité : <strong className="text-emerald-700 font-bold">En Stock (24 exemplaires)</strong></div>
              </div>

              {/* Partage Social */}
              <div className="pt-2 flex items-center gap-2">
                <span className="font-bold text-slate-700">Partager :</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    type="button" 
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                    className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" 
                    title="Partager sur Facebook"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(product.name)}&url=${encodeURIComponent(window.location.href)}`, '_blank')}
                    className="p-1.5 rounded bg-sky-500 text-white hover:bg-sky-600 cursor-pointer" 
                    title="Partager sur Twitter"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (whatsappPhone) {
                        window.open(`https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=Bonjour, je souhaite commander le produit ${encodeURIComponent(product.name)}`, '_blank');
                      }
                    }}
                    className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer" 
                    title="Commander via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Réassurance de Paiement Sécurisé */}
              <div className="pt-2 border-t border-[#EBEBEB]">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-2">
                  Paiements Sécurisés Garantis :
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded bg-slate-100 font-black text-slate-700 text-[10px]">VISA</span>
                  <span className="px-2.5 py-1 rounded bg-slate-100 font-black text-slate-700 text-[10px]">MASTERCARD</span>
                  <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 font-black text-[10px]">WAVE MONEY</span>
                  <span className="px-2.5 py-1 rounded bg-orange-100 text-orange-800 font-black text-[10px]">ORANGE MONEY</span>
                  <span className="px-2.5 py-1 rounded bg-yellow-100 text-yellow-800 font-black text-[10px]">MTN MOMO</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================================
            3. SYSTÈME D'ONGLETS INFÉRIEUR : DESCRIPTION | AVIS CLIENTS | GARANTIE
           ======================================================================= */}
        <div className="mt-12 border border-[#EBEBEB] rounded bg-white overflow-hidden shadow-xs">
          
          {/* En-tête des Onglets */}
          <div className="flex items-center border-b border-[#EBEBEB] bg-slate-50 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('description')}
              className={`py-3.5 px-6 font-black text-xs uppercase tracking-wider cursor-pointer border-b-2 transition ${
                activeTab === 'description' 
                  ? 'bg-white text-[#0056D2] border-[#0056D2]' 
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Description Détaillée
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`py-3.5 px-6 font-black text-xs uppercase tracking-wider cursor-pointer border-b-2 transition ${
                activeTab === 'reviews' 
                  ? 'bg-white text-[#0056D2] border-[#0056D2]' 
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Avis Clients (18)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shipping')}
              className={`py-3.5 px-6 font-black text-xs uppercase tracking-wider cursor-pointer border-b-2 transition ${
                activeTab === 'shipping' 
                  ? 'bg-white text-[#0056D2] border-[#0056D2]' 
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Livraison & Garanties
            </button>
          </div>

          {/* Contenu des Onglets */}
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="space-y-4 text-sm text-slate-700 leading-relaxed max-w-3xl">
                <h3 className="text-base font-black text-slate-900">
                  Caractéristiques et Avantages Clés
                </h3>
                {product.richDescription || product.description ? (
                  <div 
                    className="prose max-w-none text-slate-700 leading-relaxed text-sm [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:font-bold [&_h3]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.richDescription || product.description || '') }}
                  />
                ) : (
                  <p>
                    Le produit {product.name} est conçu selon les standards les plus exigeants de la grande distribution internationale. Fabriqué avec des matériaux durables et certifiés, il combine performance, ergonomie et design moderne.
                  </p>
                )}
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li>Finitions haut de gamme résistantes aux rayures et à l'usage quotidien.</li>
                  <li>Compatibilité universelle et conformité avec les normes internationales.</li>
                  <li>Garantie officielle constructeur de 12 mois incluse.</li>
                  <li>Support technique dédié accessible 7j/7 via WhatsApp.</li>
                </ul>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6 max-w-3xl">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                  <div className="text-center">
                    <span className="text-4xl font-black text-slate-900">4.9</span>
                    <span className="text-xs text-slate-500 block">sur 5 étoiles</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-slate-600 font-bold block pt-1">
                      100% de nos acheteurs recommandent cet article.
                    </span>
                  </div>
                </div>

                {/* Avis d'acheteurs vérifiés */}
                <div className="space-y-4">
                  {[
                    { author: 'Amadou D.', city: 'Dakar', comment: 'Livraison reçue en moins de 24h à Almadies. La qualité est conforme à la description, très satisfait !', rating: 5 },
                    { author: 'Koffi M.', city: 'Abidjan', comment: 'Emballage soigné, paiement sécurisé par Wave sans souci. Je recommande cette boutique.', rating: 5 }
                  ].map((rev, rIdx) => (
                    <div key={rIdx} className="border-b border-slate-100 pb-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <strong className="text-slate-900">{rev.author} ({rev.city})</strong>
                        <span className="text-emerald-700 font-bold">Achat vérifié ✓</span>
                      </div>
                      <p className="text-xs text-slate-600">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-4 text-sm text-slate-700 max-w-3xl leading-relaxed">
                <h3 className="text-base font-black text-slate-900">
                  Modalités d'Expédition & Engagements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-3 rounded bg-blue-50 border border-blue-100 space-y-1">
                    <strong className="text-xs font-black text-[#0056D2] block uppercase">Livraison 24h</strong>
                    <p className="text-xs text-slate-600">Expédié le jour même pour toute commande passée avant 14h.</p>
                  </div>
                  <div className="p-3 rounded bg-emerald-50 border border-emerald-100 space-y-1">
                    <strong className="text-xs font-black text-emerald-800 block uppercase">Paiement Mobile</strong>
                    <p className="text-xs text-slate-600">Paiement à la livraison ou sécurisé via Wave & Orange Money.</p>
                  </div>
                  <div className="p-3 rounded bg-amber-50 border border-amber-100 space-y-1">
                    <strong className="text-xs font-black text-amber-800 block uppercase">Retour 14 Jours</strong>
                    <p className="text-xs text-slate-600">Satisfait ou remboursé sous 14 jours en cas de non-conformité.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
