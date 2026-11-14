import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, X, ChevronRight, Check, Star, ShieldCheck, 
  Zap, MessageCircle, ArrowLeft, Eye, Edit3, Trash2, 
  Share2, Plus, Minus, Lock, CheckCircle2, Palette, 
  ShoppingCart, Truck, Clock, Sparkles, RefreshCw,
  ExternalLink, SlidersHorizontal, ArrowUpRight, Flame, ArrowRight
} from 'lucide-react';
import { StoreThemeProps } from '../../types/theme';
import { StoreProductItem } from '../../components/storeBuilder/types';
import { AdminSectionEditTrigger } from '../../components/storeBuilder/AdminSectionEditTrigger';
import { AdminProductQuickBar } from '../../components/storeBuilder/AdminProductQuickBar';
import { AdaptiveHeaderEngine } from '../../components/storeBuilder/headers/AdaptiveHeaderEngine';
import { AdaptiveFooterEngine } from '../../components/storeBuilder/footers/AdaptiveFooterEngine';
import { formatCFA, playTapBeep } from '../../utils/audio';
import { sanitizeRichHtml } from '../../utils/security';
import { triggerOpenFunnel } from '../themeUtils';
import { LiveEditable } from '../../components/storeBuilder/LiveEditable';
import './electroTechTheme.css';
import { 
  HERO_SHOWCASE_SVG, 
  VR_HEADSET_SVG, 
  CURVED_MONITOR_SVG, 
  CURVED_MONITOR_THUMB2, 
  CURVED_MONITOR_THUMB3, 
  CURVED_MONITOR_THUMB4, 
  EARBUDS_ANC_SVG, 
  PROJECTOR_4K_SVG 
} from './electroAssets';

// =========================================================================
// PRODUITS DE RÉFÉRENCE HAUTE TECHNOLOGIE (EXACTS AUX MAQUETTES IMAGE 1 & 2)
// Garantit un affichage 100% fidèle au standard Apple / Samsung dès le 1er coup d'œil
// =========================================================================

interface TechProductExtended extends StoreProductItem {
  secondaryBadge?: string;
  specsSummary?: string;
  galleryImages?: string[];
  specsGrid?: { label: string; value: string }[];
  bulletPoints?: string[];
}

const DEMO_TECH_PRODUCTS: TechProductExtended[] = [
  {
    id: 'demo-electro-vr-3d',
    name: 'Casque de Réalité Virtuelle Pro 3D',
    price: 350000,
    originalPrice: 420000,
    category: 'Réalité Virtuelle',
    badge: 'Livraison express 24h',
    secondaryBadge: 'Garantie 2 ans',
    stock: 14,
    rating: 4.9,
    reviewCount: 28,
    image: VR_HEADSET_SVG,
    specsSummary: 'Immersion 3D 4K • Audio Spatial 360° • 6DoF Tracking',
    galleryImages: [VR_HEADSET_SVG, CURVED_MONITOR_THUMB3, EARBUDS_ANC_SVG, PROJECTOR_4K_SVG],
    specsGrid: [
      { label: 'Résolution', value: 'Dual 4K HDR (2160 x 2160 par œil)' },
      { label: 'Dalle', value: 'Micro-OLED 120 Hz ultra-rapide' },
      { label: 'Taux de rafraîchissement', value: '120 Hz sans rémanence' },
      { label: 'Connectique', value: 'Wi-Fi 6E & USB-C DisplayPort' }
    ],
    description: 'Une immersion visuelle absolue pour les passionnés de simulation, de réalité virtuelle et de divertissement spatial de nouvelle génération.',
    bulletPoints: [
      'Lentilles pancake nouvelle génération offrant une clarté bord-à-bord exceptionnelle.',
      'Suivi des mouvements à 6 degrés de liberté sans capteurs externes.',
      'Conception ergonomique ultra-légère avec réglage millimétrique de l\'écart pupillaire.'
    ]
  },
  {
    id: 'demo-electro-screen-34',
    name: 'Écran Gaming Incurvé Ultra-Wide - 34"',
    price: 240000,
    originalPrice: 290000,
    category: 'Écrans Gaming',
    badge: 'Garantie 2 ans',
    secondaryBadge: 'Livraison express 24h',
    stock: 22,
    rating: 5.0,
    reviewCount: 42,
    image: CURVED_MONITOR_SVG,
    specsSummary: 'Fréquence 144Hz • Temps de réponse 1ms • Courbure 1500R',
    galleryImages: [CURVED_MONITOR_SVG, CURVED_MONITOR_THUMB2, CURVED_MONITOR_THUMB3, CURVED_MONITOR_THUMB4],
    specsGrid: [
      { label: 'Résolution', value: '3440 x 1440px (UWQHD)' },
      { label: 'Dalle', value: 'VA 1500R ultra-immersive' },
      { label: 'Taux de rafraîchissement', value: '144 Hz' },
      { label: 'Connectique', value: '2x HDMI, 2x DisplayPort' }
    ],
    description: 'Plongez au cœur de l\'action avec cet écran incurvé de 34 pouces. Conçu pour les gamers et les professionnels exigeants, il offre une immersion totale grâce à sa courbure 1500R, un taux de rafraîchissement de 144Hz et un temps de réponse de 1ms pour une fluidité sans compromis.',
    bulletPoints: [
      'Profitez d\'une expérience de jeu ultime avec une courbure naturelle qui réduit la fatigue oculaire.',
      'Compatible AMD FreeSync™ Premium et NVIDIA G-Sync pour éliminer les déchirements d\'écran.',
      'Profil colorimétrique calibré d\'usine couvrant 99% du spectre sRGB.'
    ]
  },
  {
    id: 'demo-electro-earbuds-pro',
    name: 'Écouteurs Pro ANC - Sans Fil',
    price: 65000,
    originalPrice: 85000,
    category: 'Audio & Son',
    badge: 'Top Ventes',
    secondaryBadge: 'Garantie 2 ans',
    stock: 45,
    rating: 4.8,
    reviewCount: 89,
    image: EARBUDS_ANC_SVG,
    specsSummary: 'Réduction de bruit ANC • Autonomie 36h • Audio Hi-Res',
    galleryImages: [EARBUDS_ANC_SVG, VR_HEADSET_SVG, CURVED_MONITOR_THUMB3, PROJECTOR_4K_SVG],
    specsGrid: [
      { label: 'Réduction de bruit', value: 'Hybride Active (ANC -38dB)' },
      { label: 'Autonomie', value: '8h écoute / 36h avec boîtier' },
      { label: 'Connectivité', value: 'Bluetooth 5.3 Ultra-Low Latency' },
      { label: 'Étanchéité', value: 'Norme IPX5 sueur et pluie' }
    ],
    description: 'Bénéficiez d\'un silence absolu grâce à la réduction de bruit active intelligente et d\'une fidélité acoustique studio pour tous vos trajets quotidiens.',
    bulletPoints: [
      'Microphones à formation de faisceau pour des appels téléphoniques limpides même avec vent.',
      'Recharge rapide : 10 minutes offrent jusqu\'à 2 heures de musique ininterrompue.',
      'Embouts en silicone médical en 4 tailles pour un maintien parfait sans pression.'
    ]
  },
  {
    id: 'demo-electro-projector-4k',
    name: 'Vidéoprojecteur Smart 4K Ultra',
    price: 195000,
    originalPrice: 245000,
    category: 'Home Cinéma',
    badge: 'Nouvelle Version',
    secondaryBadge: 'Livraison express 24h',
    stock: 9,
    rating: 4.9,
    reviewCount: 31,
    image: PROJECTOR_4K_SVG,
    specsSummary: 'Résolution 4K UHD • 2400 ANSI Lumens • Android TV 12',
    galleryImages: [PROJECTOR_4K_SVG, CURVED_MONITOR_SVG, CURVED_MONITOR_THUMB2, VR_HEADSET_SVG],
    specsGrid: [
      { label: 'Résolution', value: '4K Ultra HD (3840 x 2160 native)' },
      { label: 'Luminosité', value: '2400 ANSI Lumens Haute brillance' },
      { label: 'Système', value: 'Android TV 12 avec Netflix & YouTube' },
      { label: 'Connectique', value: 'HDMI 2.1 eARC, USB 3.0, Wi-Fi 6' }
    ],
    description: 'Transformez votre salon en véritable salle de cinéma avec une image gigantesque jusqu\'à 200 pouces d\'une netteté cristalline même en plein jour.',
    bulletPoints: [
      'Mise au point et correction trapézoïdale automatiques instantanées.',
      'Haut-parleurs intégrés signés Dolby Audio pour un rendu immersif sans barre de son.',
      'Lampe laser longue durée garantie pour plus de 30 000 heures de divertissement.'
    ]
  }
];

export const ThemeElectroTech: React.FC<StoreThemeProps> = (props) => {
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
    onOpenFunnel,
    onRemoveProduct,
    onShareProduct,
    onOpenAddProduct,
    onOpenThemeSelector,
    onSelectCustomizerSection,
    customConfig
  } = props;
  // Gestion de la vue PDP / Tunnel produit
  const [activeProduct, setActiveProduct] = useState<StoreProductItem | null>(selectedProduct || null);
  const [pdpQuantity, setPdpQuantity] = useState<number>(1);
  const [selectedThumbIndex, setSelectedThumbIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Synchronisation avec selectedProduct transmis par les props parentes
  React.useEffect(() => {
    if (selectedProduct) {
      setActiveProduct(selectedProduct);
      setSelectedThumbIndex(0);
      setPdpQuantity(1);
    }
  }, [selectedProduct]);

  // Détection du mode vitrine démo tech (?demo=tech ou si la boutique n'a pas encore de produits)
  const isDemoTechMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('demo') === 'tech';
    } catch {
      return false;
    }
  }, []);

  // Si le vendeur a des produits dans sa base, on les affiche et on injecte les badges tech par défaut si absent
  const displayProducts = useMemo(() => {
    if (isDemoTechMode) {
      return DEMO_TECH_PRODUCTS;
    }
    if (filteredProducts && filteredProducts.length > 0) {
      return filteredProducts;
    }
    if (allProducts && allProducts.length > 0) {
      return allProducts;
    }
    // Si aucun produit en base, affichage fidèle des 4 produits phares des maquettes Image 1 & 2
    return DEMO_TECH_PRODUCTS;
  }, [filteredProducts, allProducts, isDemoTechMode]);

  // Données enrichies pour la fiche produit active (PDP)
  const currentPdpProduct = useMemo(() => {
    if (!activeProduct) return null;

    // Si c'est l'un de nos produits de démonstration
    const foundDemo = DEMO_TECH_PRODUCTS.find(p => p.id === activeProduct.id || p.name === activeProduct.name);
    if (foundDemo) {
      return foundDemo;
    }

    // Sinon, on enrichit le produit réel du vendeur avec des valeurs robustes anti-erreur
    const fallbackThumbnails = [
      activeProduct.image || CURVED_MONITOR_SVG,
      CURVED_MONITOR_THUMB2,
      CURVED_MONITOR_THUMB3,
      CURVED_MONITOR_THUMB4
    ];

    const enriched: TechProductExtended = {
      ...activeProduct,
      badge: activeProduct.badge || 'Garantie 2 ans',
      secondaryBadge: 'Livraison express 24h',
      specsSummary: activeProduct.category ? `${activeProduct.category} • Matériel certifié • Testé & Garanti` : 'High-Tech • Haute Précision • Garanti d\'origine',
      galleryImages: fallbackThumbnails,
      specsGrid: [
        { label: 'Disponibilité', value: 'En stock immédiat' },
        { label: 'Garantie', value: '2 ans constructeur' },
        { label: 'Livraison', value: 'Expédition express 24h' },
        { label: 'Paiement', value: 'Mobile Money & Cartes sécurisés' }
      ],
      bulletPoints: [
        'Produit d\'origine certifié conforme avec emballage scellé et garantie officielle.',
        'Assistance technique et service après-vente dédié 7j/7 via WhatsApp.',
        'Paiement simplifié et sécurisé à la livraison ou en ligne sans frais cachés.'
      ]
    };
    return enriched;
  }, [activeProduct]);

  // Image principale affichée dans la galerie PDP
  const activeMainImage = useMemo(() => {
    if (!currentPdpProduct) return CURVED_MONITOR_SVG;
    if (currentPdpProduct.galleryImages && currentPdpProduct.galleryImages[selectedThumbIndex]) {
      return currentPdpProduct.galleryImages[selectedThumbIndex];
    }
    return currentPdpProduct.image || CURVED_MONITOR_SVG;
  }, [currentPdpProduct, selectedThumbIndex]);

  // Ouvre la PDP pour un produit donné
  const handleOpenPdp = (product: StoreProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapBeep();
    setActiveProduct(product);
    setSelectedThumbIndex(0);
    setPdpQuantity(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ferme la PDP et revient au catalogue
  const handleClosePdp = () => {
    playTapBeep();
    setActiveProduct(null);
  };

  // Produit Offre Spéciale / Spotlight Vedette (customConfig.specialOfferProductId)
  const specialOfferProduct = useMemo(() => {
    if (customConfig?.specialOfferProductId) {
      const picked = displayProducts.find(p => p.id === customConfig.specialOfferProductId);
      if (picked) return picked;
    }
    return displayProducts.find(p => p.originalPrice && p.originalPrice > p.price) || null;
  }, [displayProducts, customConfig?.specialOfferProductId]);

  // Focus sur la recherche
  const handleFocusSearch = () => {
    playTapBeep();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Achat direct
  const handleTriggerBuy = (product: StoreProductItem, qty: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapBeep();
    onBuyNow(product, qty);
  };

  return (
    <div 
      className="theme-electro-tech min-h-screen w-full bg-[#FFFFFF] text-[#0F172A] flex flex-col font-sans selection:bg-[#0056D2] selection:text-white"
      style={{
        '--electro-primary': '#0056D2',
        '--electro-badge-bg': '#FFF7ED',
        '--electro-badge-text': '#C2410C',
        '--electro-badge-border': '#FFEDD5',
        '--electro-card-shadow': '0 8px 24px rgba(0, 0, 0, 0.04)',
        '--electro-card-radius': '12px',
        '--electro-image-radius': '16px',
        '--electro-bg-contain': '#F9F9FB',
      } as React.CSSProperties}
    >
      {/* =========================================================================
          1. NAVIGATION HEADER ÉPURÉE & PREMIUM (AVEC SUPPORT DES 6 EN-TÊTES)
         ========================================================================= */}
      {customConfig?.headerStyle && customConfig.headerStyle !== 'none' ? (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier l'En-Tête & Liens de Menu ⚡"
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
            onSelectProduct={handleOpenPdp}
            onResetToHome={() => setActiveProduct(null)}
            onSelectCategory={onSelectCategory}
            onSearch={onSearchChange}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <div className="relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier l'En-Tête & Liens de Menu ⚡"
            targetAccordion={1}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          {(customConfig?.announcementBarEnabled ?? true) && customConfig?.announcementBarText && (
            <div
              className="w-full py-2 px-4 text-center text-[11px] font-extrabold uppercase tracking-wider text-white"
              style={{ backgroundColor: customConfig?.primaryAccentColor || '#0056D2' }}
            >
              {customConfig.announcementBarText}
            </div>
          )}
          <header
            className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all"
            style={customConfig?.headerBgColor ? { backgroundColor: customConfig.headerBgColor } : undefined}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
              
              {/* Logo & Identité du Vendeur */}
              <LiveEditable
                label="Nom & Logo de la Boutique"
                field="storeName"
                value={customConfig?.storeName || storeConfig?.storeName || 'Nanasore'}
                targetAccordion={1}
                isAdminPreview={isAdminPreview}
                isInline={true}
              >
                <div 
                  onClick={() => {
                    if (activeProduct) handleClosePdp();
                  }}
                  className="flex items-center gap-3 cursor-pointer group shrink-0"
                >
                  {(customConfig?.logoUrl || storeConfig?.logoUrl) ? (
                    <img 
                      src={customConfig?.logoUrl || storeConfig?.logoUrl} 
                      alt={customConfig?.storeName || storeConfig?.storeName || 'Logo'} 
                      className="h-10 w-auto max-w-[150px] object-contain rounded-xl"
                    />
                  ) : (
                    <div className="flex items-center">
                      <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                        {customConfig?.storeName || storeConfig?.storeName || 'Nanasore'}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-[#0056D2] leading-none">.</span>
                    </div>
                  )}
                </div>
              </LiveEditable>

              {/* Onglets Centraux : Dynamiques depuis customConfig.navLinks ou Fallback standard */}
              <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
                {customConfig?.navLinks && customConfig.navLinks.length > 0 ? (
                  customConfig.navLinks.map((link, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (activeProduct) handleClosePdp();
                        if (link.category) onSelectCategory(link.category);
                        else if (link.href?.startsWith('#')) {
                          const el = document.querySelector(link.href);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        } else if (link.href) {
                          window.open(link.href, '_blank');
                        }
                      }}
                      className="px-3.5 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      {link.label}
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (activeProduct) handleClosePdp();
                        onSelectCategory('Tous');
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        !activeProduct && (selectedCategory === 'Tous' || !selectedCategory)
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
                        if (activeProduct) handleClosePdp();
                        const gridEl = document.getElementById('electro-products-grid');
                        if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-3.5 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Nos Univers</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        alert("Garantie VIP : Tous les équipements électroniques bénéficient d'une garantie constructeur de 2 ans avec échange express.");
                      }}
                      className="px-3.5 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Garantie VIP
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        alert("Suivi de commande en temps réel activé par notification WhatsApp & SMS.");
                      }}
                      className="px-3.5 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Track Your Order
                    </button>

                    {storeConfig?.whatsappPhone && (
                      <a
                        href={`https://wa.me/${storeConfig.whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, je souhaite des renseignements sur vos équipements tech ${storeConfig?.storeName || ''}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        Contact
                      </a>
                    )}
                  </>
                )}

                {/* Raccourci Galerie de Thèmes */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onOpenThemeSelector?.();
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-[#0056D2] bg-blue-50/80 hover:bg-blue-100 transition-all flex items-center gap-1.5 cursor-pointer ml-1"
                  title="Changer de thème de vitrine"
                >
                  <Palette className="w-3.5 h-3.5 text-[#0056D2]" />
                  <span>Thèmes</span>
                </button>
              </nav>

          {/* Actions Droite : Recherche, Panier & Bouton Espace Client */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleFocusSearch}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Rechercher un produit tech"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (displayProducts[0]) handleOpenPdp(displayProducts[0]);
              }}
              className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full transition cursor-pointer"
              title="Mon Panier"
            >
              <ShoppingCart className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-black text-[#0056D2] bg-blue-100/70 px-1.5 py-0.2 rounded-full">0</span>
            </button>

            {!isPublicView && isStoreAdmin && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenAddProduct?.();
                }}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs transition cursor-pointer"
                title="Ajouter un produit tech au catalogue"
              >
                <Plus className="w-3.5 h-3.5 text-[#0056D2]" />
                <span>Nouveau produit</span>
              </button>
            )}

            {storeConfig?.whatsappPhone ? (
              <a
                href={`https://wa.me/${storeConfig.whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, je souhaite accéder à mon espace client sur ${storeConfig?.storeName || ''}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#0056D2] hover:bg-[#0046AB] text-white font-bold text-xs px-3.5 sm:px-4 py-2 rounded-xl transition shadow-sm hover:shadow active:scale-95 flex items-center gap-1.5"
              >
                <span className="hidden sm:inline">Se connecter / Espace Client</span>
                <span className="sm:hidden">Espace Client</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (displayProducts[0]) handleOpenPdp(displayProducts[0]);
                }}
                className="bg-[#0056D2] hover:bg-[#0046AB] text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm hover:shadow active:scale-95"
              >
                Espace Client
              </button>
            )}
          </div>
        </div>
      </header>
        </div>
      )}

      {/* =========================================================================
          VUE 1 : PAGE DÉTAIL PRODUIT (PDP) / TUNNEL (EXACT AU MOCKUP IMAGE 2)
         ========================================================================= */}
      {activeProduct && currentPdpProduct ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-in fade-in duration-300">
          
          {/* Bouton Retour Fluide vers le catalogue */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClosePdp}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0056D2] hover:text-[#0046AB] bg-[#F0F7FF] hover:bg-[#E2F0FE] px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à tous les produits</span>
            </button>

            {/* Breadcrumb Rapide Haut de page */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 font-medium overflow-hidden">
              <span className="text-slate-400">Accueil</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600 font-medium">Électronique</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="font-bold text-[#0F172A] truncate max-w-[200px]">
                {currentPdpProduct.category || 'Équipements Tech'}
              </span>
            </div>
          </div>

          {/* Grille Desktop 50/50 : Galerie à gauche / Achat & Caractéristiques à droite */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* COLONNE GAUCHE (GALERIE D'IMAGES HAUTE DÉFINITION) */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Image Principale Géante avec Arrondi 16px & Badges Superposés */}
              <div 
                className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#F9F9FB] border border-slate-100 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
                style={{ borderRadius: '16px' }}
              >
                {/* Badges Pastel Orange Superposés en Haut à Gauche (Garantie 2 Ans, Livraison Express) */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <div className="electro-badge shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>{currentPdpProduct.badge || 'Garantie 2 Ans'}</span>
                  </div>
                  {currentPdpProduct.secondaryBadge && (
                    <div className="electro-badge shadow-sm">
                      <Truck className="w-3.5 h-3.5 text-[#C2410C]" />
                      <span>{currentPdpProduct.secondaryBadge}</span>
                    </div>
                  )}
                </div>

                {/* Visuel du Produit avec contain sécurisé et gestion des erreurs */}
                <img 
                  src={activeMainImage} 
                  alt={currentPdpProduct.name}
                  className="w-full h-full object-contain p-6 transition-all duration-300"
                  onError={(e) => {
                    // Fallback anti-erreur instantané si l'URL est cassée
                    e.currentTarget.src = CURVED_MONITOR_SVG;
                  }}
                />
              </div>

              {/* Rangée de Miniatures (Thumbnails) Cliquables */}
              <div className="grid grid-cols-4 gap-3">
                {(currentPdpProduct.galleryImages || [CURVED_MONITOR_SVG, CURVED_MONITOR_THUMB2, CURVED_MONITOR_THUMB3, CURVED_MONITOR_THUMB4]).map((thumbUrl, idx) => {
                  const isActiveThumb = selectedThumbIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setSelectedThumbIndex(idx);
                      }}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-[#F9F9FB] border p-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isActiveThumb
                          ? 'border-[#0056D2] ring-2 ring-[#0056D2]/30 opacity-100 shadow-sm'
                          : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300'
                      }`}
                      title={`Afficher la vue ${idx + 1}`}
                    >
                      <img 
                        src={thumbUrl} 
                        alt={`${currentPdpProduct.name} vue ${idx + 1}`} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = CURVED_MONITOR_SVG;
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLONNE DROITE (DÉTAILS D'ACHAT & CARACTÉRISTIQUES) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Chapelure (Breadcrumbs) Détaillée */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="hover:text-slate-800 cursor-pointer" onClick={handleClosePdp}>Accueil</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="hover:text-slate-800 cursor-pointer">Électronique</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-900 font-bold">{currentPdpProduct.category || 'Écrans Gaming'}</span>
              </div>

              {/* Titre & Spécifications Clés */}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-tight">
                  {currentPdpProduct.name}
                </h1>

                {/* Ligne de sous-caractéristiques rapides */}
                {currentPdpProduct.specsSummary && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-500">
                    {currentPdpProduct.specsSummary}
                  </p>
                )}

                {/* Étoiles d'avis & Score */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-600">
                    ({currentPdpProduct.reviewCount || 42} avis vérifiés)
                  </span>
                </div>
              </div>

              {/* Prix en TRÈS GROS + Badge Vert Clair "En Stock" */}
              <div className="flex items-center gap-4 py-1">
                <span className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
                  {formatCFA(currentPdpProduct.price)}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold shadow-xs">
                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                  <span>En Stock</span>
                </span>
              </div>

              {/* Description Rapide */}
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Description rapide
                </h3>
                {(currentPdpProduct.richDescription || currentPdpProduct.description) ? (
                  <div 
                    className="prose max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed electro-desc-clamped"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(currentPdpProduct.richDescription || currentPdpProduct.description || '') }}
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed electro-desc-clamped">
                    {currentPdpProduct.description}
                  </p>
                )}
              </div>

              {/* Grille 2x2 des Caractéristiques Rapides */}
              {currentPdpProduct.specsGrid && currentPdpProduct.specsGrid.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  {currentPdpProduct.specsGrid.map((spec, sIdx) => (
                    <div key={sIdx} className="text-xs">
                      <span className="text-slate-500 font-medium">{spec.label} : </span>
                      <strong className="text-slate-800 font-bold">{spec.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Ligne d'action : Sélecteur de Quantité (- 1 +) et Boutons Principaux */}
              <div className="pt-2 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  
                  {/* Sélecteur de Quantité */}
                  <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2.5 bg-white sm:w-32 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setPdpQuantity(prev => Math.max(1, prev - 1))}
                      className="text-slate-500 hover:text-slate-900 p-1 cursor-pointer transition disabled:opacity-30"
                      disabled={pdpQuantity <= 1}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-sm text-slate-900 px-2 select-none">
                      {pdpQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPdpQuantity(prev => prev + 1)}
                      className="text-slate-500 hover:text-slate-900 p-1 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bouton Voir tunnel (Outline / Plein Bleu selon maquette) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      if (onOpenFunnel) {
                        onOpenFunnel(currentPdpProduct, e);
                      } else {
                        handleTriggerBuy(currentPdpProduct, pdpQuantity, e);
                      }
                    }}
                    className="flex-1 py-3 px-5 rounded-xl bg-[#0056D2] hover:bg-[#0046AB] text-white font-bold text-xs sm:text-sm transition shadow-sm hover:shadow active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Voir tunnel</span>
                  </button>

                  {/* Bouton Acheter maintenant */}
                  <button
                    type="button"
                    onClick={(e) => handleTriggerBuy(currentPdpProduct, pdpQuantity, e)}
                    className="flex-1 py-3 px-5 rounded-xl bg-[#0056D2] hover:bg-[#0046AB] text-white font-bold text-xs sm:text-sm transition shadow-md shadow-blue-900/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Acheter maintenant</span>
                  </button>
                </div>
              </div>

              {/* Onglets Détaillés : Description | Caractéristiques techniques | Avis */}
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="flex items-center gap-6 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('description')}
                    className={`text-xs sm:text-sm font-bold pb-2 transition cursor-pointer relative ${
                      activeTab === 'description'
                        ? 'text-[#0056D2]'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Description
                    {activeTab === 'description' && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0056D2] rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('specs')}
                    className={`text-xs sm:text-sm font-bold pb-2 transition cursor-pointer relative ${
                      activeTab === 'specs'
                        ? 'text-[#0056D2]'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Caractéristiques techniques
                    {activeTab === 'specs' && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0056D2] rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('reviews')}
                    className={`text-xs sm:text-sm font-bold pb-2 transition cursor-pointer relative ${
                      activeTab === 'reviews'
                        ? 'text-[#0056D2]'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Avis ({currentPdpProduct.reviewCount || 42})
                    {activeTab === 'reviews' && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0056D2] rounded-full" />
                    )}
                  </button>
                </div>

                {/* Contenu de l'onglet Description */}
                {activeTab === 'description' && (
                  <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed animate-in fade-in">
                    {(currentPdpProduct.richDescription || currentPdpProduct.description) ? (
                      <div 
                        className="prose max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(currentPdpProduct.richDescription || currentPdpProduct.description || '') }}
                      />
                    ) : (
                      <p>{currentPdpProduct.description}</p>
                    )}
                    {currentPdpProduct.bulletPoints && (
                      <ul className="space-y-2 pt-1">
                        {currentPdpProduct.bulletPoints.map((bp, bpIdx) => (
                          <li key={bpIdx} className="flex items-start gap-2">
                            <span className="text-[#0056D2] font-black">•</span>
                            <span>{bp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Contenu de l'onglet Caractéristiques techniques */}
                {activeTab === 'specs' && (
                  <div className="space-y-2 text-xs sm:text-sm animate-in fade-in">
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {(currentPdpProduct.specsGrid || []).map((spec, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white">
                          <span className="text-slate-500">{spec.label}</span>
                          <span className="font-bold text-slate-800">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contenu de l'onglet Avis */}
                {activeTab === 'reviews' && (
                  <div className="space-y-3 text-xs sm:text-sm animate-in fade-in">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-black text-slate-900">4.9 / 5</div>
                        <div className="text-xs text-slate-500">Basé sur {currentPdpProduct.reviewCount || 42} retours clients vérifiés</div>
                      </div>
                      <div className="flex gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BARRE DE RÉASSURANCE UNIVERSELLE DU BAS DE PAGE PDP (EXACTE À IMAGE 2) */}
          <footer className="w-full bg-[#F8F9FA] border border-slate-200/80 rounded-2xl py-3.5 px-4 text-xs font-semibold text-slate-700 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-center mt-12">
            <div className="flex items-center gap-1.5">
              <span>🔒</span>
              <span>Paiement 100% sécurisé (Mobile Money, Carte)</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <span>🚚</span>
              <span>Livraison & Installation disponibles</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <span>💬</span>
              <span>Une question ? Discutez avec nous sur WhatsApp</span>
            </div>
          </footer>
        </main>
      ) : (
        /* =========================================================================
            VUE 2 : ACCUEIL & CATALOGUE STOREFRONT (EXACT AU MOCKUP IMAGE 1)
           ========================================================================= */
        <main className="flex-1 w-full space-y-12">
          
          {/* =======================================================================
              HERO HEADER 50/50 AVEC DÉGRADÉ RADIAL ET RECHERCHE INTÉGRÉE
             ======================================================================= */}
          <section 
            className="w-full relative overflow-hidden pt-8 pb-14 sm:py-16 border-b border-slate-100 group"
            style={{
              background: 'radial-gradient(circle at 75% 35%, #EBF4FF 0%, #F5F9FF 45%, #FFFFFF 85%)'
            }}
          >
            <AdminSectionEditTrigger
              label="✏️ Modifier le Hero (Titre, Image, Textes) ⚡"
              targetAccordion={2}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
                
                {/* Colonne Gauche : Titre Massif, Descriptif et Barre de Recherche */}
                <div className="lg:col-span-7 space-y-6">
                  
                  <div className="space-y-4">
                    {customConfig?.heroSubtitle && (
                      <LiveEditable
                        label="Badge Hero"
                        field="heroSubtitle"
                        value={customConfig.heroSubtitle}
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                        isInline={true}
                      >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0056D2] text-xs font-extrabold uppercase tracking-wider">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{customConfig.heroSubtitle}</span>
                        </div>
                      </LiveEditable>
                    )}
                    <LiveEditable
                      label="Titre Principal Hero"
                      field="heroTitle"
                      value={customConfig?.heroTitle || "Le futur de la tech, chez vous dès aujourd’hui."}
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.12]">
                        {customConfig?.heroTitle || "Le futur de la tech, chez vous dès aujourd’hui."}
                      </h1>
                    </LiveEditable>
                    
                    <LiveEditable
                      label="Description Hero"
                      field="heroDescription"
                      value={customConfig?.heroDescription || storeConfig?.description || "Découvrez notre collection exclusive d'équipements de pointe, d'accessoires de divertissement et de gaming garantis d'origine, disponibles avec livraison express."}
                      type="textarea"
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                        {customConfig?.heroDescription || storeConfig?.description || "Découvrez notre collection exclusive d'équipements de pointe, d'accessoires de divertissement et de gaming garantis d'origine, disponibles avec livraison express."}
                      </p>
                    </LiveEditable>
                  </div>

                  {/* Barre de Recherche Intégrée avec Bouton "Explorer la collection" */}
                  <div className="relative max-w-xl w-full">
                    <div className="flex items-center bg-white rounded-full p-1.5 sm:p-2 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] focus-within:border-[#0056D2] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <div className="pl-3 sm:pl-4 text-slate-400">
                        <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Rechercher un produit, une marque..."
                        className="w-full px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none font-medium"
                      />

                      {searchQuery && (
                        <button 
                          type="button"
                          onClick={onClearSearch}
                          className="p-1 mr-2 text-slate-400 hover:text-slate-600 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      <LiveEditable
                        label="Texte Bouton CTA"
                        field="heroCtaText"
                        value={customConfig?.heroCtaText || "Explorer la collection"}
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
                                handleOpenPdp(targetProd);
                                return;
                              }
                            }
                            const gridEl = document.getElementById('electro-products-grid');
                            if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="shrink-0 bg-[#0056D2] hover:bg-[#0046AB] text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-3 rounded-full transition shadow-sm active:scale-95 cursor-pointer"
                        >
                          {customConfig?.heroCtaText || "Explorer la collection"}
                        </button>
                      </LiveEditable>
                    </div>
                  </div>
                </div>

                {/* Colonne Droite : Visuel 3D Flottant (Écran incurvé, Casque VR, Enceinte) */}
                <div className="lg:col-span-5 flex items-center justify-center relative">
                  <div className="w-full max-w-lg electro-hero-floating">
                    <LiveEditable
                      label="Visuel Image / Vidéo Hero"
                      field="heroBannerImageUrl"
                      value={customConfig?.heroBannerImageUrl || storeConfig?.bannerImage || HERO_SHOWCASE_SVG}
                      type="image"
                      targetAccordion={2}
                      isAdminPreview={isAdminPreview}
                    >
                      {customConfig?.heroVideoUrl ? (
                        <video
                          src={customConfig.heroVideoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          poster={customConfig?.heroBannerImageUrl || storeConfig?.bannerImage || HERO_SHOWCASE_SVG}
                          className="w-full h-auto rounded-2xl object-cover shadow-xl"
                        />
                      ) : (
                        <img 
                          src={customConfig?.heroBannerImageUrl || storeConfig?.bannerImage || HERO_SHOWCASE_SVG} 
                          alt={customConfig?.heroTitle || "Vitrine High-Tech Flottante"} 
                          className="w-full h-auto object-contain drop-shadow-xl rounded-2xl"
                        />
                      )}
                    </LiveEditable>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =======================================================================
              SOUS-BANNIÈRES SECONDAIRES EMPILÉES (subBanner1 & subBanner2)
             ======================================================================= */}
          {(customConfig?.subBanner1Title || customConfig?.subBanner1Image || customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(customConfig?.subBanner1Title || customConfig?.subBanner1Image) && (
                  <div
                    onClick={() => {
                      playTapBeep();
                      const gridEl = document.getElementById('electro-products-grid');
                      if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition-all group"
                  >
                    <div className="space-y-2 z-10">
                      {customConfig?.subBanner1Badge && (
                        <LiveEditable
                          label="Badge Bannière 1"
                          field="subBanner1Badge"
                          value={customConfig.subBanner1Badge}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                          isInline={true}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-amber-400 text-slate-950 inline-block">
                            {customConfig.subBanner1Badge}
                          </span>
                        </LiveEditable>
                      )}
                      <LiveEditable
                        label="Titre Bannière 1"
                        field="subBanner1Title"
                        value={customConfig.subBanner1Title}
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                      >
                        <h3 className="text-xl sm:text-2xl font-black leading-tight text-white group-hover:text-amber-300 transition-colors">
                          {customConfig.subBanner1Title}
                        </h3>
                      </LiveEditable>
                      {customConfig?.subBanner1Subtitle && (
                        <LiveEditable
                          label="Sous-titre Bannière 1"
                          field="subBanner1Subtitle"
                          value={customConfig.subBanner1Subtitle}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                        >
                          <p className="text-xs text-blue-100 max-w-xs">{customConfig.subBanner1Subtitle}</p>
                        </LiveEditable>
                      )}
                      {customConfig?.subBanner1CtaText && (
                        <LiveEditable
                          label="Bouton CTA Bannière 1"
                          field="subBanner1CtaText"
                          value={customConfig.subBanner1CtaText}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                          isInline={true}
                        >
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 pt-2">
                            <span>{customConfig.subBanner1CtaText}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </LiveEditable>
                      )}
                    </div>
                    {customConfig?.subBanner1Image && (
                      <LiveEditable
                        label="Image Bannière 1"
                        field="subBanner1Image"
                        value={customConfig.subBanner1Image}
                        type="image"
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                      >
                        <img
                          src={customConfig.subBanner1Image}
                          alt={customConfig.subBanner1Title || 'Bannière'}
                          className="w-24 sm:w-32 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                        />
                      </LiveEditable>
                    )}
                  </div>
                )}
                {(customConfig?.subBanner2Title || customConfig?.subBanner2Image) && (
                  <div
                    onClick={() => {
                      playTapBeep();
                      const gridEl = document.getElementById('electro-products-grid');
                      if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-8 flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition-all group"
                  >
                    <div className="space-y-2 z-10">
                      {customConfig?.subBanner2Badge && (
                        <LiveEditable
                          label="Badge Bannière 2"
                          field="subBanner2Badge"
                          value={customConfig.subBanner2Badge}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                          isInline={true}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-emerald-400 text-slate-950 inline-block">
                            {customConfig.subBanner2Badge}
                          </span>
                        </LiveEditable>
                      )}
                      <LiveEditable
                        label="Titre Bannière 2"
                        field="subBanner2Title"
                        value={customConfig.subBanner2Title}
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                      >
                        <h3 className="text-xl sm:text-2xl font-black leading-tight text-white group-hover:text-emerald-300 transition-colors">
                          {customConfig.subBanner2Title}
                        </h3>
                      </LiveEditable>
                      {customConfig?.subBanner2Subtitle && (
                        <LiveEditable
                          label="Sous-titre Bannière 2"
                          field="subBanner2Subtitle"
                          value={customConfig.subBanner2Subtitle}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                        >
                          <p className="text-xs text-slate-300 max-w-xs">{customConfig.subBanner2Subtitle}</p>
                        </LiveEditable>
                      )}
                      {customConfig?.subBanner2CtaText && (
                        <LiveEditable
                          label="Bouton CTA Bannière 2"
                          field="subBanner2CtaText"
                          value={customConfig.subBanner2CtaText}
                          targetAccordion={2}
                          isAdminPreview={isAdminPreview}
                          isInline={true}
                        >
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 pt-2">
                            <span>{customConfig.subBanner2CtaText}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </LiveEditable>
                      )}
                    </div>
                    {customConfig?.subBanner2Image && (
                      <LiveEditable
                        label="Image Bannière 2"
                        field="subBanner2Image"
                        value={customConfig.subBanner2Image}
                        type="image"
                        targetAccordion={2}
                        isAdminPreview={isAdminPreview}
                      >
                        <img
                          src={customConfig.subBanner2Image}
                          alt={customConfig.subBanner2Title || 'Bannière'}
                          className="w-24 sm:w-32 h-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                        />
                      </LiveEditable>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* =======================================================================
              OFFRE SPÉCIALE DU MOMENT / SPOTLIGHT VEDETTE (specialOfferProductId)
             ======================================================================= */}
          {specialOfferProduct && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white border border-slate-200/80 p-2 flex items-center justify-center shrink-0">
                    <img
                      src={specialOfferProduct.image}
                      alt={specialOfferProduct.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-red-500" />
                        <span>Offre Spéciale Vedette</span>
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
                    onClick={() => handleOpenPdp(specialOfferProduct)}
                    className="electro-btn-outline flex-1 md:flex-initial px-5 py-3 text-xs"
                  >
                    Détails du produit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleTriggerBuy(specialOfferProduct, 1, e)}
                    className="electro-btn-solid flex-1 md:flex-initial px-6 py-3 text-xs"
                  >
                    Acheter maintenant
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* =======================================================================
              RAYON DES PRODUITS : "Équipements Phares (Prêts à l'achat)"
             ======================================================================= */}
          <section id="electro-products-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative group">
            <AdminSectionEditTrigger
              label="✏️ Modifier la Grille & Titres Produits ⚡"
              targetAccordion={3}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            
            {/* Titre de section fidèle à Image 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <LiveEditable
                  label="Titre du Catalogue"
                  field="catalogTitle"
                  value={customConfig?.catalogTitle || "Équipements Phares (Prêts à l'achat)"}
                  targetAccordion={3}
                  isAdminPreview={isAdminPreview}
                >
                  <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                    {customConfig?.catalogTitle || "Équipements Phares (Prêts à l'achat)"}
                  </h2>
                </LiveEditable>
                {customConfig?.catalogSubtitle && (
                  <LiveEditable
                    label="Sous-titre Catalogue"
                    field="catalogSubtitle"
                    value={customConfig.catalogSubtitle}
                    targetAccordion={3}
                    isAdminPreview={isAdminPreview}
                  >
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      {customConfig.catalogSubtitle}
                    </p>
                  </LiveEditable>
                )}
              </div>

              {/* Raccourci filtre par catégorie si disponible */}
              {categories && categories.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => onSelectCategory(cat)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition whitespace-nowrap cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#0056D2] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* GRILLE FOOL-PROOF DES CARTES PRODUITS (ASPECT-RATIO 4/3 & OBJECT-FIT CONTAIN) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {displayProducts.map((product) => {
                const productBadge = product.badge || 'Livraison express 24h';

                return (
                  <div 
                    key={product.id}
                    onClick={() => handleOpenPdp(product)}
                    className="electro-card group cursor-pointer relative"
                  >
                    {/* Barre d'administration rapide au survol du produit (Édition & Tunnel) */}
                    <AdminProductQuickBar
                      product={product}
                      isPublicView={isPublicView}
                      isAdminPreview={isAdminPreview}
                      storeSlug={storeConfig?.slug || 'sandbox'}
                      onEditProduct={props.onEditProduct || onOpenEditProduct}
                      onPreviewFunnel={onOpenFunnel}
                    />

                    {/* Conteneur d'image Strict 4:3 avec Fond Légèrement Gris #F9F9FB */}
                    <div className="electro-img-container">
                      
                      {/* Badge Pastel Orange positionné en bas à gauche de l'image (Exact Image 1) */}
                      <div className="absolute bottom-3 left-3 z-10">
                        <span className="electro-badge">
                          {productBadge}
                        </span>
                      </div>

                      {/* Image du produit avec containment strict et fallback sécurisé */}
                      <img 
                        src={product.image || CURVED_MONITOR_SVG} 
                        alt={product.name}
                        className="electro-img-contain"
                        onError={(e) => {
                          e.currentTarget.src = CURVED_MONITOR_SVG;
                        }}
                      />
                    </div>

                    {/* Contenu de la Carte : Titre Clamped, Prix Massif & Boutons Duos */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        {/* Titre bridé à 2 lignes avec points de suspension anti-casse */}
                        <h3 className="text-sm sm:text-base font-bold text-[#0F172A] electro-title-clamped group-hover:text-[#0056D2] transition-colors">
                          {product.name}
                        </h3>

                        {/* Prix affiché en gros et net */}
                        <div className="text-base sm:text-lg font-black text-[#0F172A]">
                          {formatCFA(product.price)}
                        </div>
                      </div>

                      {/* Boutons d'Action Flexbox : "Voir tunnel" (Outline) & "Acheter" (Plein Bleu) */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            if (onOpenFunnel) {
                              onOpenFunnel(product, e);
                            } else {
                              triggerOpenFunnel(product.linkedFunnelId || product.id, product.name, product);
                            }
                          }}
                          className="electro-btn-outline flex-1 py-2 text-xs"
                          title="Voir le tunnel de vente connecté"
                        >
                          Voir tunnel
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleTriggerBuy(product, 1, e)}
                          className="electro-btn-solid flex-1 py-2 text-xs"
                          title="Acheter ce produit immédiatement"
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

          {/* =======================================================================
              BARRE DE RÉASSURANCE UNIVERSELLE DU BAS DE PAGE ACCUEIL (EXACTE À IMAGE 1)
             ======================================================================= */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6 relative group">
            <AdminSectionEditTrigger
              label="✏️ Modifier les Garanties & Réassurance ⚡"
              targetAccordion={4}
              onSelectSection={onSelectCustomizerSection}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
              position="top-right"
            />
            <div className="w-full bg-[#F8F9FA] border border-slate-200/80 rounded-2xl py-3.5 px-4 text-xs font-semibold text-slate-700 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-center shadow-xs">
              <LiveEditable
                label="Garantie 1"
                field="reassurance1Title"
                value={customConfig?.reassurance1Title || 'Livraison rapide & suivie'}
                targetAccordion={4}
                isAdminPreview={isAdminPreview}
                isInline={true}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-500 font-bold">⚡</span>
                  <span>{customConfig?.reassurance1Title || 'Livraison rapide & suivie'}</span>
                </div>
              </LiveEditable>
              <span className="hidden sm:inline text-slate-300">•</span>
              <LiveEditable
                label="Garantie 2"
                field="reassurance2Title"
                value={customConfig?.reassurance2Title || 'Paiement 100% Sécurisé Mobile Money & Cartes'}
                targetAccordion={4}
                isAdminPreview={isAdminPreview}
                isInline={true}
              >
                <div className="flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>{customConfig?.reassurance2Title || 'Paiement 100% Sécurisé Mobile Money & Cartes'}</span>
                </div>
              </LiveEditable>
              <span className="hidden sm:inline text-slate-300">•</span>
              <LiveEditable
                label="Garantie 3"
                field="reassurance3Title"
                value={customConfig?.reassurance3Title || 'Assistance & SAV VIP via WhatsApp'}
                targetAccordion={4}
                isAdminPreview={isAdminPreview}
                isInline={true}
              >
                <div className="flex items-center gap-1.5">
                  <span>💬</span>
                  <span>{customConfig?.reassurance3Title || 'Assistance & SAV VIP via WhatsApp'}</span>
                </div>
              </LiveEditable>
            </div>
          </section>
        </main>
      )}

      {/* Moteur de Pied de Page Adaptatif (Footer Engine) ou Footer natif */}
      {customConfig?.footerStyle && customConfig.footerStyle !== 'none' ? (
        <div className="relative group/footer-section">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Contact ⚡"
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
            onSelectProduct={handleOpenPdp}
            onResetToHome={() => setActiveProduct(null)}
            onSelectCategory={onSelectCategory}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
          />
        </div>
      ) : (
        <footer className="w-full border-t border-slate-100 bg-white py-6 mt-auto relative group">
          <AdminSectionEditTrigger
            label="✏️ Modifier le Footer & Contact ⚡"
            targetAccordion={5}
            onSelectSection={onSelectCustomizerSection}
            isPublicView={isPublicView}
            isAdminPreview={isAdminPreview}
            position="top-right"
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <LiveEditable
              label="Copyright Footer"
              field="copyrightText"
              value={customConfig?.copyrightText || `© ${new Date().getFullYear()} ${customConfig?.storeName || storeConfig?.storeName || 'Nanasore'}. Tous droits réservés.`}
              targetAccordion={5}
              isAdminPreview={isAdminPreview}
              isInline={true}
            >
              <div>
                {customConfig?.copyrightText || `© ${new Date().getFullYear()} ${customConfig?.storeName || storeConfig?.storeName || 'Nanasore'}. Tous droits réservés.`}
              </div>
            </LiveEditable>
            <div className="flex items-center gap-4">
              <LiveEditable
                label="À Propos Footer"
                field="footerAboutText"
                value={customConfig?.footerAboutText || 'Propulsé par Nanasore Tech Storefront'}
                targetAccordion={5}
                isAdminPreview={isAdminPreview}
                isInline={true}
              >
                <span>{customConfig?.footerAboutText || 'Propulsé par Nanasore Tech Storefront'}</span>
              </LiveEditable>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
