import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Star, Heart, ArrowLeft, ChevronLeft, ChevronRight, 
  Clock, Truck, ShieldCheck, Check, Play, 
  Plus, Minus, X, CheckCircle2, MessageCircle, Ruler,
  Flame, ShoppingBag, Eye, RefreshCw, ChevronDown
} from 'lucide-react';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import {
  BEAUTY_SPRAY_SAGE_SVG,
  BEAUTY_SPRAY_BLUE_SVG,
  BEAUTY_SPRAY_ROSE_SVG,
  BEAUTY_SPRAY_PEACH_SVG,
  BEAUTY_FLACON_SERUM_SVG,
  BEAUTY_FLACON_CREAM_SVG,
  BEAUTY_FLACON_PARFUM_SVG,
  BEAUTY_HERO_PODIUM_FLACONS_SVG,
  BEAUTY_ROUTINE_SERUM_REEL_SVG,
  BEAUTY_ROUTINE_MASSAGE_REEL_SVG,
  BEAUTY_ROUTINE_MIST_REEL_SVG
} from './beautyEmeraldAssets';
import { EmeraldProductCard, BeautyColorSwatch } from './EmeraldProductCard';
import { BeautyTestimonialsSection } from './BeautyTestimonialsSection';
import { sanitizeRichHtml } from '../../utils/security';
import { triggerOpenFunnel } from '../themeUtils';

export interface BeautyPDPProps {
  product: StoreProductItem;
  allProducts: StoreProductItem[];
  onBack: () => void;
  onSelectProduct: (p: StoreProductItem) => void;
  onAddToCart: (p: StoreProductItem, qty: number) => void;
  onBuyNow: (p: StoreProductItem, qty: number) => void;
  onOpenFunnel?: (p: StoreProductItem, e: React.MouseEvent) => void;
}

export const BeautyPDP: React.FC<BeautyPDPProps> = ({
  product,
  allProducts,
  onBack,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onOpenFunnel
}) => {
  // Galerie multi-angles de flacons
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (product.image) list.push(product.image);

    // Multi-angles de démo haute fidélité
    list.push(
      BEAUTY_SPRAY_BLUE_SVG,
      BEAUTY_SPRAY_ROSE_SVG,
      BEAUTY_SPRAY_PEACH_SVG,
      BEAUTY_FLACON_SERUM_SVG
    );
    return Array.from(new Set(list)).slice(0, 4);
  }, [product]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('50ml');
  const [selectedSwatchIndex, setSelectedSwatchIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddedToast, setIsAddedToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews' | 'shipping' | 'usage'>('desc');
  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null);

  // Loupe / Zoom interactif qui suit le pointeur de la souris
  const [isZooming, setIsZooming] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomCoords({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  // Teintes (masquées proprement si non définies)
  const swatches: BeautyColorSwatch[] = useMemo(() => {
    if (product.colorSwatches && product.colorSwatches.length > 0) {
      return product.colorSwatches.map((s, idx) => ({
        id: `swatch-${idx}`,
        name: s.name,
        hex: s.hex
      }));
    }
    return [];
  }, [product.colorSwatches]);

  // Contenances / Tailles
  const sizesToDisplay = useMemo(() => {
    if (product.sizeOptions && product.sizeOptions.length > 0) {
      return product.sizeOptions;
    }
    return ['30ml', '50ml', '100ml'];
  }, [product.sizeOptions]);

  // Produits pour la Featured Collection de la Sidebar
  const sidebarFeaturedProducts = useMemo(() => {
    const others = allProducts.filter(p => p.id !== product.id);
    return others.slice(0, 3);
  }, [allProducts, product.id]);

  // Booster 2 : Produits "Acheter avec (Buy It With)"
  const buyWithProducts = useMemo(() => {
    return [
      {
        id: 'buywith-creme',
        name: 'Crème Royale Régénérante Nuit',
        price: 22000,
        originalPrice: 28000,
        image: BEAUTY_FLACON_CREAM_SVG,
        category: 'Soins Visage'
      },
      {
        id: 'buywith-serum',
        name: 'Sérum C+ Éclat Pur Botanique',
        price: 18500,
        originalPrice: 24000,
        image: BEAUTY_FLACON_SERUM_SVG,
        category: 'Sérums'
      }
    ];
  }, []);

  const [addedBuyWithIds, setAddedBuyWithIds] = useState<string[]>([]);

  const handleAddBuyWith = (item: any) => {
    playValidationBeep();
    setAddedBuyWithIds(prev => [...prev, item.id]);
    onAddToCart(item, 1);
  };

  // Booster 3 : "Fréquemment achetés ensemble" (Pack Routine Complet)
  const bundleItems = useMemo(() => {
    const mainItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      isChecked: true
    };

    let complementary: any[] = [];
    if (product.bundleProductIds && product.bundleProductIds.length > 0) {
      complementary = allProducts.filter(p => product.bundleProductIds!.includes(p.id)).slice(0, 2);
    }

    if (complementary.length === 0) {
      const others = allProducts.filter(p => p.id !== product.id);
      if (others.length >= 2) {
        complementary = others.slice(0, 2);
      } else if (others.length === 1) {
        complementary = [
          others[0],
          {
            id: 'bundle-fallback-2',
            name: 'Crème Hydratante Royale Nuit',
            price: 22000,
            image: BEAUTY_FLACON_CREAM_SVG
          }
        ];
      } else {
        complementary = [
          {
            id: 'bundle-2',
            name: 'Crème Hydratante Royale Nuit',
            price: 22000,
            image: BEAUTY_FLACON_CREAM_SVG
          },
          {
            id: 'bundle-3',
            name: 'Extrait Pur Oud & Rose Précieuse',
            price: 35000,
            image: BEAUTY_FLACON_PARFUM_SVG
          }
        ];
      }
    }

    return [
      mainItem,
      ...complementary.map((c: any) => ({
        id: c.id,
        name: c.name,
        price: c.price || c.sellingPrice || 15000,
        image: c.image || c.photoUrl || BEAUTY_FLACON_CREAM_SVG,
        isChecked: true
      }))
    ];
  }, [product, allProducts]);

  const [bundleChecked, setBundleChecked] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const initial: { [key: string]: boolean } = {};
    bundleItems.forEach(b => { initial[b.id] = true; });
    setBundleChecked(initial);
  }, [bundleItems]);

  const toggleBundleItem = (id: string) => {
    playTapBeep();
    setBundleChecked(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const bundleDiscountPercent = product.bundleDiscountPercent || 0;

  const rawBundleTotal = useMemo(() => {
    return bundleItems.reduce((acc, item) => {
      return bundleChecked[item.id] ? acc + item.price : acc;
    }, 0);
  }, [bundleItems, bundleChecked]);

  const bundleTotal = useMemo(() => {
    if (bundleDiscountPercent > 0) {
      return Math.round(rawBundleTotal * (1 - bundleDiscountPercent / 100));
    }
    return rawBundleTotal;
  }, [rawBundleTotal, bundleDiscountPercent]);

  const handleAddBundleToCart = () => {
    playValidationBeep();
    bundleItems.forEach(item => {
      if (bundleChecked[item.id]) {
        onAddToCart(item as any, 1);
      }
    });
    setIsAddedToast(true);
    setTimeout(() => setIsAddedToast(false), 2500);
  };

  // Produits Similaires (Related Products) : 4 cartes garanties
  const relatedProducts = useMemo(() => {
    const list = allProducts.filter(p => p.id !== product.id);
    if (list.length >= 4) return list.slice(0, 4);

    const fallbacks: StoreProductItem[] = [
      {
        id: 'rel-serum',
        name: 'Sérum Éclat Botanique C+',
        price: 18500,
        originalPrice: 24000,
        category: 'Sérums',
        image: BEAUTY_FLACON_SERUM_SVG,
        description: 'Concentré actif en vitamine C stabilisée et acide hyaluronique végétal.',
        stock: 15,
        rating: 5.0,
        reviewCount: 38,
        badge: 'Nouveau'
      },
      {
        id: 'rel-cream',
        name: 'Crème Royale Régénérante Nuit',
        price: 22000,
        originalPrice: 28000,
        category: 'Soins Visage',
        image: BEAUTY_FLACON_CREAM_SVG,
        description: 'Texture onctueuse infusée au beurre de karité bio.',
        stock: 19,
        rating: 4.9,
        reviewCount: 52,
        badge: 'Best-Seller'
      },
      {
        id: 'rel-parfum',
        name: 'Extrait Pur - Oud & Rose Précieuse',
        price: 35000,
        originalPrice: 45000,
        category: 'Parfums',
        image: BEAUTY_FLACON_PARFUM_SVG,
        description: 'Une eau de parfum envoûtante aux accords boisés précieux.',
        stock: 12,
        rating: 5.0,
        reviewCount: 29,
        badge: 'Édition Privée'
      },
      {
        id: 'rel-cleanser',
        name: 'Nettoyant Purifiant Fleur d\'Oranger',
        price: 12500,
        originalPrice: 16000,
        category: 'Soins Visage',
        image: BEAUTY_HERO_PODIUM_FLACONS_SVG,
        description: 'Gelée nettoyante moussante douce.',
        stock: 35,
        rating: 4.8,
        reviewCount: 19,
        badge: 'Essentiel'
      }
    ];

    const merged = [...list, ...fallbacks.filter(f => f.id !== product.id && !list.some(l => l.id === f.id))];
    return merged.slice(0, 4);
  }, [allProducts, product]);

  // Clic Acheter Direct (Caisse Sebpay)
  const handleMainCta = (e: React.MouseEvent) => {
    playValidationBeep();
    onBuyNow(product, quantity);
  };

  // Clic Voir Tunnel Dépliable
  const handleOpenTunnel = (e: React.MouseEvent) => {
    playValidationBeep();
    if (onOpenFunnel) {
      onOpenFunnel(product, e);
    } else {
      triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
    }
  };

  // Vidéos UGC Routine
  const ugcReels = useMemo(() => {
    if (product.routineVideoUrls && product.routineVideoUrls.length > 0) {
      return product.routineVideoUrls.map((url, idx) => ({
        id: `routine-vid-${idx}`,
        title: `Démonstration Routine #${idx + 1}`,
        subtitle: product.name,
        cover: idx === 0 ? BEAUTY_ROUTINE_SERUM_REEL_SVG : idx === 1 ? BEAUTY_ROUTINE_MASSAGE_REEL_SVG : BEAUTY_ROUTINE_MIST_REEL_SVG,
        url
      }));
    }
    if (Array.isArray(product.routineVideoUrls) && product.routineVideoUrls.length === 0) {
      return [];
    }
    return [
      {
        id: 'reel-1',
        title: 'Rituel Éclat Matin (30s)',
        subtitle: 'Application du sérum sur peau nettoyée',
        cover: BEAUTY_ROUTINE_SERUM_REEL_SVG
      },
      {
        id: 'reel-2',
        title: 'Massage Gua Sha (45s)',
        subtitle: 'Drainage lymphatique & contouring',
        cover: BEAUTY_ROUTINE_MASSAGE_REEL_SVG
      },
      {
        id: 'reel-3',
        title: 'Brume & Nuage Botanique (25s)',
        subtitle: 'Fixation du maquillage & hydratation',
        cover: BEAUTY_ROUTINE_MIST_REEL_SVG
      }
    ];
  }, [product.routineVideoUrls, product.name]);

  return (
    <div className="beauty-pdp-wrapper animate-in fade-in duration-200">
      
      {/* Fil d'Ariane / Breadcrumb */}
      <nav className="beauty-pdp-breadcrumb" aria-label="Fil d'Ariane">
        <button type="button" onClick={onBack} className="flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          <span>Boutique</span>
        </button>
        <span aria-hidden="true">/</span>
        <span>{product.category || 'Cosmétiques'}</span>
        <span aria-hidden="true">/</span>
        <span className="beauty-pdp-breadcrumb-active">{product.name}</span>
      </nav>

      {/* ================= LAYOUT GLOBAL (270px | 1fr) ================= */}
      <div className="beauty-pdp-layout">
        
        {/* ================= A. COLONNE GAUCHE (SIDEBAR 270PX) ================= */}
        <aside className="beauty-pdp-sidebar" aria-label="Menu latéral de la boutique">
          
          {/* 1. Bloc "Parcourir par Catégories" */}
          <div className="beauty-sidebar-box">
            <h3 className="beauty-sidebar-title">Catégories</h3>
            <ul className="beauty-category-accordion-list">
              <li>
                <button type="button" className="beauty-category-accordion-btn active">
                  <span>Parfumerie Rare</span>
                  <span className="text-xs text-[#0F4C3A] font-bold">12</span>
                </button>
              </li>
              <li>
                <button type="button" className="beauty-category-accordion-btn">
                  <span>Maquillage & Teint</span>
                  <span className="text-xs text-slate-400">18</span>
                </button>
              </li>
              <li>
                <button type="button" className="beauty-category-accordion-btn">
                  <span>Soins Visage & Rituels</span>
                  <span className="text-xs text-slate-400">24</span>
                </button>
              </li>
              <li>
                <button type="button" className="beauty-category-accordion-btn">
                  <span>Corps & Bains Botaniques</span>
                  <span className="text-xs text-slate-400">9</span>
                </button>
              </li>
            </ul>
          </div>

          {/* 2. Bloc "Collection Vedette" (Featured Collection) */}
          <div className="beauty-sidebar-box">
            <h3 className="beauty-sidebar-title">Collection Vedette</h3>
            <div className="beauty-featured-list">
              {sidebarFeaturedProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => {
                    playTapBeep();
                    onSelectProduct(p);
                  }}
                  className="beauty-featured-item"
                >
                  <div className="beauty-featured-thumb">
                    <img src={p.image || BEAUTY_SPRAY_SAGE_SVG} alt={p.name} />
                  </div>
                  <div className="beauty-featured-info">
                    <span className="beauty-featured-item-title">{p.name}</span>
                    <span className="beauty-featured-item-price">{formatCFA(p.price)}</span>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-2.5 h-2.5 fill-[#C59B27] text-[#C59B27]" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onBack}
              className="beauty-sidebar-view-all"
            >
              <span>VOIR TOUS LES PRODUITS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Carte Promo Verticale */}
          <div className="beauty-sidebar-promo-card">
            <span className="font-['Bodoni_Moda'] italic font-semibold text-[#C59B27] text-lg">
              Édition Prestige
            </span>
            <h4 className="font-['Syne'] font-extrabold text-lg text-[#111C18] leading-tight">
              Coffret Rituel Botanique
            </h4>
            <p className="font-['Outfit'] text-xs text-slate-600 line-clamp-3">
              Recevez notre trousse haute couture en lin pour toute commande supérieure à 45 000 FCFA.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 px-4 bg-[#0F4C3A] hover:bg-[#093326] text-white text-xs uppercase font-bold tracking-widest font-['Outfit'] transition-colors"
            >
              Découvrir l'offre
            </button>
          </div>

        </aside>

        {/* ================= B. COLONNE DROITE : FICHE PRODUIT ================= */}
        <main className="w-full">
          
          {/* Haut : Fiche Produit en 2 sous-colonnes 50/50 */}
          <div className="beauty-pdp-main-grid">
            
            {/* Sous-colonne Galerie (Gauche) */}
            <div className="beauty-gallery-col">
              
              {/* Grande image principale avec effet Zoom au survol */}
              <div 
                ref={imageContainerRef}
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleMouseMove}
                className="beauty-main-image-container group"
              >
                <img
                  src={galleryImages[activeImageIndex] || product.image}
                  alt={product.name}
                  className={`beauty-main-image ${isZooming ? 'zoomed' : ''}`}
                  style={{
                    transformOrigin: isZooming ? `${zoomCoords.x}% ${zoomCoords.y}%` : 'center center'
                  }}
                />

                {/* Badge loupe discret */}
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-[#111C18] flex items-center gap-1 shadow-xs pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-3.5 h-3.5 text-[#0F4C3A]" />
                  <span>Survoler pour zoomer</span>
                </div>
              </div>

              {/* Carrousel horizontal de 4 miniatures carrées */}
              <div className="beauty-thumbnails-bar">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveImageIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
                  }}
                  className="beauty-thumb-nav-btn"
                  aria-label="Image précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setActiveImageIndex(idx);
                    }}
                    className={`beauty-thumb-btn ${activeImageIndex === idx ? 'active' : ''}`}
                  >
                    <img src={img} alt={`Miniature ${idx + 1}`} />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveImageIndex(prev => (prev + 1) % galleryImages.length);
                  }}
                  className="beauty-thumb-nav-btn"
                  aria-label="Image suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Sous-colonne Achat (Droite) */}
            <div className="beauty-buy-col">
              
              {/* Étoiles d'avis en Or Champagne #C59B27 */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#C59B27] text-[#C59B27]" />
                  ))}
                </div>
                <span className="font-['Outfit'] text-xs font-semibold text-slate-500">
                  (42 avis vérifiés)
                </span>
              </div>

              {/* Titre du Produit en Syne 800 (28px, #111C18) */}
              <h1 className="beauty-buy-title">
                {product.name}
              </h1>

              {/* Prix géant en Outfit (26px, #0F4C3A) */}
              <div className="beauty-buy-price-row">
                <span className="beauty-buy-price">
                  {formatCFA(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="beauty-buy-old-price">
                    {formatCFA(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Métadonnées & Liens rapides */}
              <div className="beauty-meta-row">
                <span>Marque : <strong className="text-[#111C18]">glow-ishi</strong></span>
                <span>Type : <strong className="text-[#111C18]">{product.category || 'glow'}</strong></span>
                
                <div className="flex items-center gap-4 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsWishlisted(prev => !prev);
                    }}
                    className="beauty-quick-link"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-[#D9381E] text-[#D9381E]' : ''}`} />
                    <span>Favoris</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => alert("Guide d'application : vaporiser délicatement à 20cm du visage sur peau propre.")}
                    className="beauty-quick-link"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Guide d'utilisation</span>
                  </button>
                </div>
              </div>

              {/* Points Clés Techniques (keyFeatures) */}
              {product.keyFeatures && product.keyFeatures.length > 0 && (
                <div className="my-2.5 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-1.5">
                  {product.keyFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-[#0F4C3A]">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center text-[10px] shrink-0 font-black">
                        ✓
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Jauge d'Urgence Stock */}
              <div className="beauty-stock-urgency-box">
                <div className="flex items-center gap-2 text-xs font-semibold font-['Outfit'] text-[#111C18]">
                  <Flame className="w-4 h-4 text-[#D9381E] animate-pulse" />
                  <span>
                    Vite ! Plus que <strong className="text-[#D9381E] font-extrabold text-sm">{product.stock || 2}</strong> unités en stock !
                  </span>
                </div>
                <div className="beauty-stock-gauge-bar">
                  <div className="beauty-stock-gauge-fill" style={{ width: '25%' }} />
                </div>
              </div>

              {/* Sélecteurs de Variantes : Taille / Contenance (42px x 42px) */}
              {sizesToDisplay.length > 0 && (
                <div className="space-y-1.5 mt-1">
                  <label className="font-['Outfit'] text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Contenance : {selectedSize}
                  </label>
                  <div className="beauty-variant-grid">
                    {sizesToDisplay.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedSize(size);
                        }}
                        className={`beauty-size-btn ${selectedSize === size ? 'active' : ''}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sélecteur de Teintes (masqué proprement si vide) */}
              {swatches.length > 0 && (
                <div className="space-y-1.5 mt-1">
                  <label className="font-['Outfit'] text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Teinte : {swatches[selectedSwatchIndex]?.name}
                  </label>
                  <div className="flex items-center gap-2">
                    {swatches.map((swatch, idx) => (
                      <button
                        key={swatch.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedSwatchIndex(idx);
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          selectedSwatchIndex === idx ? 'scale-110 border-[#0F4C3A] ring-2 ring-offset-2 ring-[#0F4C3A]' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                        title={swatch.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quantité & Bouton Principal Pleine Largeur */}
              <div className="beauty-cta-row">
                <div className="beauty-qty-selector">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setQuantity(prev => Math.max(1, prev - 1));
                    }}
                    className="beauty-qty-btn"
                    aria-label="Diminuer la quantité"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="beauty-qty-display">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setQuantity(prev => prev + 1);
                    }}
                    className="beauty-qty-btn"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bouton Acheter : Caisse Sebpay Principale */}
                <button
                  type="button"
                  onClick={handleMainCta}
                  className="beauty-btn-order-full"
                  title="Acheter via la caisse Checkout principale Sebpay"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>COMMANDER</span>
                </button>

                {/* Bouton Voir Tunnel */}
                <button
                  type="button"
                  onClick={handleOpenTunnel}
                  className="px-4 h-[52px] border-2 border-[#0F4C3A] text-[#0F4C3A] hover:bg-emerald-50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Voir le tunnel de vente 12 blocs"
                >
                  <Eye className="w-4 h-4" />
                  <span>VOIR LE TUNNEL</span>
                </button>
              </div>

              {/* Message d'expédition dynamique */}
              <div className="beauty-dispatch-note">
                <Clock className="w-4 h-4 text-[#0F4C3A] shrink-0" />
                <span>
                  Expédition prévue aujourd'hui si vous commandez dans les prochaines <strong className="text-[#D9381E] font-bold">9h 44m</strong>.
                </span>
              </div>

              {/* Grille de Réassurance (2x2) */}
              <div className="beauty-reassurance-grid-2x2">
                <div className="beauty-reassurance-item">
                  <div className="beauty-reassurance-item-icon">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-['Syne'] font-bold text-xs text-[#111C18]">Livraison Rapide</h5>
                    <p className="font-['Outfit'] text-[11px] text-slate-500">Expédié sous 24h à 48h</p>
                  </div>
                </div>

                <div className="beauty-reassurance-item">
                  <div className="beauty-reassurance-item-icon">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-['Syne'] font-bold text-xs text-[#111C18]">Mobile Money & Carte</h5>
                    <p className="font-['Outfit'] text-[11px] text-slate-500">Orange, Wave, Moov, Visa</p>
                  </div>
                </div>

                <div className="beauty-reassurance-item">
                  <div className="beauty-reassurance-item-icon">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-['Syne'] font-bold text-xs text-[#111C18]">Support VIP 7j/7</h5>
                    <p className="font-['Outfit'] text-[11px] text-slate-500">Conseil direct sur WhatsApp</p>
                  </div>
                </div>

                <div className="beauty-reassurance-item">
                  <div className="beauty-reassurance-item-icon">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-['Syne'] font-bold text-xs text-[#111C18]">Garantie Qualité</h5>
                    <p className="font-['Outfit'] text-[11px] text-slate-500">100% Formules Pures</p>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* ================= C. LES 3 BOOSTERS DE CONVERSION ================= */}
          <div className="beauty-boosters-wrapper">
            
            {/* 1. Booster : "Complétez votre routine" (Mini-Vidéos UGC masquées si non définies) */}
            {ugcReels.length > 0 && (
              <div>
                <span className="font-['Bodoni_Moda'] italic text-[#C59B27] font-semibold text-lg block">
                  Rituels & Démonstrations
                </span>
                <h3 className="font-['Syne'] font-bold text-lg text-[#111C18] mt-0.5">
                  Complétez votre routine
                </h3>

                <div className="beauty-video-reels-grid">
                  {ugcReels.map((reel) => (
                    <div 
                      key={reel.id}
                      onClick={() => setActiveVideoModal(reel.title)}
                      className="beauty-reel-card group"
                    >
                      <img src={reel.cover} alt={reel.title} className="beauty-reel-cover" />
                      <div className="beauty-reel-play-btn">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                      <div className="beauty-reel-caption">
                        <div>{reel.title}</div>
                        <div className="text-[10px] opacity-80 font-normal">{reel.subtitle}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Booster : "Acheter avec (Buy It With)" */}
            <div>
              <h3 className="font-['Syne'] font-bold text-lg text-[#111C18]">
                Acheter avec (Buy It With)
              </h3>
              
              <div className="beauty-buy-with-list">
                {buyWithProducts.map((item) => {
                  const isAdded = addedBuyWithIds.includes(item.id);

                  return (
                    <div key={item.id} className="beauty-buy-with-card">
                      <div className="flex items-center gap-3">
                        <div className="beauty-buy-with-thumb">
                          <img src={item.image} alt={item.name} />
                        </div>
                        <div>
                          <h4 className="font-['Outfit'] font-semibold text-sm text-[#111C18]">
                            {item.name}
                          </h4>
                          <span className="font-['Outfit'] font-bold text-sm text-[#0F4C3A]">
                            {formatCFA(item.price)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddBuyWith(item)}
                        className="beauty-btn-add-gold"
                      >
                        {isAdded ? '✓ AJOUTÉ' : '+ AJOUTER'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Booster : "Fréquemment achetés ensemble" (Pack Routine Complet) */}
            <div className="beauty-frequently-bundle-box">
              <span className="font-['Bodoni_Moda'] italic text-[#C59B27] font-semibold text-base block">
                Offre Duo & Trio Signature
              </span>
              <h3 className="font-['Syne'] font-extrabold text-lg text-[#111C18]">
                Fréquemment achetés ensemble
              </h3>

              <div className="beauty-bundle-visual-row">
                {bundleItems.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <div className={`beauty-bundle-product-thumb ${!bundleChecked[item.id] ? 'opacity-40' : ''}`}>
                      <img src={item.image} alt={item.name} />
                    </div>
                    {idx < bundleItems.length - 1 && (
                      <span className="beauty-bundle-plus-sign">+</span>
                    )}
                  </React.Fragment>
                ))}

                <div className="beauty-bundle-total-panel">
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Outfit'] text-xs text-slate-500 uppercase tracking-wider">
                      Prix Total Pack :
                    </span>
                    {bundleDiscountPercent > 0 && (
                      <span className="text-[10px] font-black bg-[#C59B27] text-white px-2 py-0.5 rounded-full">
                        -{bundleDiscountPercent}% PACK
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-['Outfit'] font-extrabold text-xl text-[#0F4C3A]">
                      {formatCFA(bundleTotal)}
                    </span>
                    {bundleDiscountPercent > 0 && rawBundleTotal > bundleTotal && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatCFA(rawBundleTotal)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBundleToCart}
                    className="py-2.5 px-4 bg-[#0F4C3A] hover:bg-[#093326] text-white text-xs uppercase font-bold tracking-widest font-['Outfit'] transition-all shadow-sm"
                  >
                    AJOUTER LA SÉLECTION
                  </button>
                </div>
              </div>

              {/* Checkboxes de sélection des éléments du pack */}
              <div className="beauty-bundle-checkboxes">
                {bundleItems.map((item) => (
                  <label key={item.id} className="beauty-bundle-checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(bundleChecked[item.id])}
                      onChange={() => toggleBundleItem(item.id)}
                      className="w-4 h-4 accent-[#0F4C3A] rounded cursor-pointer"
                    />
                    <span>
                      <strong>Ce produit :</strong> {item.name} — <strong className="text-[#0F4C3A]">{formatCFA(item.price)}</strong>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* ================= 4 ONGLETS RECTANGULAIRES HAUTE COUTURE ================= */}
            <div className="pt-12 border-t border-slate-200 w-full">
              {/* Barre de 4 boutons rectangulaires centrés */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setActiveTab('desc'); }}
                  className={`beauty-tab-btn ${activeTab === 'desc' ? 'active' : ''}`}
                >
                  DESCRIPTION
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setActiveTab('reviews'); }}
                  className={`beauty-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
                >
                  AVIS CLIENTS
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setActiveTab('shipping'); }}
                  className={`beauty-tab-btn ${activeTab === 'shipping' ? 'active' : ''}`}
                >
                  LIVRAISON & RETOURS
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setActiveTab('usage'); }}
                  className={`beauty-tab-btn ${activeTab === 'usage' ? 'active' : ''}`}
                >
                  CONSEILS D'UTILISATION
                </button>
              </div>

              {/* Contenu des onglets */}
              <div className="p-6 sm:p-8 bg-white border border-slate-200/80 rounded-none font-['Outfit'] text-sm text-slate-700 leading-relaxed shadow-xs">
                {activeTab === 'desc' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-['Syne'] font-bold text-base text-[#111C18] mb-2">
                        Présentation de la Formule Botanique
                      </h4>
                      {product.richDescription || product.description ? (
                        <div 
                          className="prose max-w-none text-slate-600 leading-relaxed text-sm [&_h2]:font-bold [&_h2]:text-[#111C18] [&_h3]:font-bold [&_h3]:text-[#111C18] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.richDescription || product.description || '') }}
                        />
                      ) : (
                        <p className="text-slate-600">
                          Un soin d'exception conçu avec une rigueur dermatologique absolue. Notre complexe synergique aux extraits botaniques bio régénère la barrière cutanée, neutralise le stress oxydatif et sublime l'éclat sans fini gras.
                        </p>
                      )}
                    </div>

                    <div>
                      <h5 className="font-['Syne'] font-bold text-sm text-[#111C18] mb-3">
                        Bénéfices Botaniques Prouvés :
                      </h5>
                      <ul className="list-disc pl-5 space-y-2 text-slate-600">
                        <li>Hydratation intense continue 24 heures testée sous contrôle clinique.</li>
                        <li>Bouclier antioxydant contre la pollution urbaine et les agressions UV.</li>
                        <li>Atténuation visible des taches et uniformisation du grain de peau en 14 jours.</li>
                        <li>Texture fluide micro-pénétrante compatible avec le maquillage.</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-[#F4F7F4] border-l-4 border-[#0F4C3A]">
                      <span className="font-bold text-[#0F4C3A] block mb-1">
                        Formule 100% Propre & Éthique :
                      </span>
                      <p className="text-xs text-slate-600">
                        Garanti sans parabènes, sans sulfates, sans silicones occlusifs, sans phtalates. Non testé sur les animaux. Flacon en verre recyclable traité anti-oxydation UV.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#F4F7F4] border border-[#0F4C3A]/20">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-['Syne'] font-extrabold text-3xl text-[#111C18]">4.9</span>
                          <div>
                            <div className="flex items-center gap-1 text-[#C59B27]">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-current" />
                              ))}
                            </div>
                            <span className="text-xs text-slate-500 font-['Outfit']">Basé sur 48 avis clientes vérifiés</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#0F4C3A] font-['Outfit'] px-3 py-1.5 bg-white border border-[#0F4C3A]/30">
                        ✓ 98% de Recommandation
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-white border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#111C18] text-sm font-['Outfit']">Aïcha K. (Abidjan)</span>
                          <span className="text-xs text-slate-400">Il y a 3 jours</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#C59B27]">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600">
                          "Résultat impressionnant ! Mon teint est lumineux et sans aucune brillance grasse tout au long de la journée."
                        </p>
                      </div>

                      <div className="p-4 bg-white border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#111C18] text-sm font-['Outfit']">Bintou D. (Dakar)</span>
                          <span className="text-xs text-slate-400">Il y a 1 semaine</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#C59B27]">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600">
                          "Flacon d'une élégance rare et formule très douce. Mes rougeurs ont disparu en quelques applications."
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#F4F7F4] border border-slate-200">
                        <h5 className="font-['Syne'] font-bold text-sm text-[#111C18] mb-1">
                          Livraison Express Abidjan (24h)
                        </h5>
                        <p className="text-xs text-slate-600">
                          Livraison par coursier sécurisé à domicile ou au bureau sous 24h ouvrées. Suivi SMS en direct.
                        </p>
                      </div>

                      <div className="p-4 bg-[#F4F7F4] border border-slate-200">
                        <h5 className="font-['Syne'] font-bold text-sm text-[#111C18] mb-1">
                          Expédition Intérieur & Sous-Région (48h-72h)
                        </h5>
                        <p className="text-xs text-slate-600">
                          Expédition soignée en Côte d'Ivoire, Sénégal, Mali, Bénin, Togo et Burkina Faso sous emballage protecteur.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-['Syne'] font-bold text-sm text-[#111C18]">
                        Moyens de Paiement Flexibles :
                      </h5>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Paiements Mobile Money (Wave, Orange Money, MTN MoMo, Moov Money), cartes bancaires (Visa/Mastercard) ainsi que le <strong>Paiement à la Livraison (Cash on Delivery)</strong> à Abidjan.
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
                      <strong>Garantie Sérénité 14 Jours :</strong> Vous disposez de 14 jours pour retourner votre article non ouvert dans son emballage scellé d'origine pour un remboursement ou un échange complet.
                    </div>
                  </div>
                )}

                {activeTab === 'usage' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-['Syne'] font-bold text-base text-[#111C18] mb-2">
                        Rituel d'Application Étape par Étape
                      </h4>
                      <p className="text-slate-600 text-xs sm:text-sm">
                        Pour maximiser la biodisponibilité des actifs et révéler un teint repulpé et lumineux, appliquez selon le protocole de nos facialistes :
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                        <div>
                          <strong className="text-[#111C18] text-xs sm:text-sm">Nettoyage Préparatoire :</strong>
                          <p className="text-xs text-slate-600 mt-0.5">Nettoyez votre visage avec une eau florale ou un nettoyant doux pour ouvrir les pores.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                        <div>
                          <strong className="text-[#111C18] text-xs sm:text-sm">Application Ciblée :</strong>
                          <p className="text-xs text-slate-600 mt-0.5">Déposez 3 à 4 gouttes au creux de vos mains chauffées ou directement sur les joues et le front.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                        <div>
                          <strong className="text-[#111C18] text-xs sm:text-sm">Massage Drainant :</strong>
                          <p className="text-xs text-slate-600 mt-0.5">Lissez du centre vers l'extérieur du visage par mouvements ascendants avec le plat des doigts ou une pierre Gua Sha.</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 italic">
                      Conservation : À conserver à l'abri de la lumière directe et de l'humidité. Usage externe uniquement.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ================= SECTION PRODUITS SIMILAIRES (RELATED PRODUCTS) ================= */}
            <div className="mt-16 pt-12 border-t border-slate-200 w-full">
              <div className="text-center mb-10">
                <span className="font-['Bodoni_Moda'] italic text-[#C59B27] font-semibold text-xl sm:text-2xl block tracking-wide">
                  Nouvelle Saison
                </span>
                <h2 className="font-['Syne'] font-extrabold text-2xl sm:text-3xl text-[#111C18] mt-1 tracking-tight">
                  Produits Associés
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {relatedProducts.map((relProduct) => (
                  <EmeraldProductCard
                    key={relProduct.id}
                    product={relProduct}
                    onSelectProduct={onSelectProduct}
                    onAddToCart={onAddToCart}
                    onBuyNow={onBuyNow}
                    onOpenFunnel={onOpenFunnel}
                  />
                ))}
              </div>
            </div>

          </div>

        </main>

      </div>

      {/* ================= SECTION TÉMOIGNAGES IMMERSIFS (50/50 AVANT/APRÈS) ================= */}
      <div className="w-full bg-[#F4F7F4]/60 border-t border-slate-200/60 mt-12">
        <BeautyTestimonialsSection
          title="Ce que disent nos clientes sur ce soin"
          subtitle="Preuves Visibles & Rituels"
        />
      </div>

      {/* Modal Démonstration Vidéo Interactive */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#FFFFFF] p-6 max-w-md w-full shadow-2xl relative border border-[#C59B27]/40">
            <button
              type="button"
              onClick={() => setActiveVideoModal(null)}
              className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="font-['Bodoni_Moda'] italic text-[#C59B27] font-semibold text-sm">
              Rituel Beauté en Direct
            </span>
            <h4 className="font-['Syne'] font-extrabold text-lg text-[#111C18] mt-1 mb-4">
              {activeVideoModal}
            </h4>
            <div className="aspect-[9/16] bg-[#111C18] flex flex-col items-center justify-center text-white p-6 text-center relative overflow-hidden">
              <Play className="w-12 h-12 text-[#C59B27] mb-3 animate-pulse" />
              <p className="font-['Outfit'] text-xs text-slate-300">
                Lecture de la démonstration d'application du soin en haute définition.
              </p>
              <span className="text-[10px] text-[#C59B27] mt-3 uppercase tracking-widest font-bold">
                100% Recommandé par nos esthéticiennes
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Toast d'ajout au panier */}
      {isAddedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F4C3A] text-white px-5 py-3 rounded-none shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-[#C59B27]" />
          <span className="font-['Outfit'] text-xs font-bold uppercase tracking-wider">
            Sélection ajoutée à votre panier !
          </span>
        </div>
      )}

    </div>
  );
};
