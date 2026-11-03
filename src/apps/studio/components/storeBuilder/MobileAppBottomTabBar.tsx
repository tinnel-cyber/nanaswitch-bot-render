import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Home, 
  Layers, 
  Radio, 
  ShoppingBag, 
  MessageCircle, 
  Search, 
  X, 
  ChevronRight, 
  Sparkles,
  Play
} from 'lucide-react';
import { StoreProductItem } from './types';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { openSmartCart } from './SmartSlideOutCartDrawer';

export interface MobileAppBottomTabBarProps {
  storeName?: string;
  whatsappNumber?: string;
  allProducts?: StoreProductItem[];
  categories?: string[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onResetToHome?: () => void;
  onOpenCart?: () => void;
  onOpenLive?: () => void;
  cartCount?: number;
  isSimulatedMobile?: boolean;
  className?: string;
}

export const MobileAppBottomTabBar: React.FC<MobileAppBottomTabBarProps> = ({
  storeName = 'Boutique',
  whatsappNumber = '+225 07 00 00 00',
  allProducts = [],
  categories = [],
  selectedCategory = 'Tous les produits',
  onSelectCategory,
  onResetToHome,
  onOpenCart,
  onOpenLive,
  cartCount: propCartCount,
  isSimulatedMobile = false,
  className = ''
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'live' | 'cart' | 'whatsapp'>('home');
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState<boolean>(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [localCartCount, setLocalCartCount] = useState<number>(propCartCount || 0);

  // Synchronisation avec propCartCount
  useEffect(() => {
    if (propCartCount !== undefined) {
      setLocalCartCount(propCartCount);
    }
  }, [propCartCount]);

  // Écoute de l'événement global nana:cart_updated
  useEffect(() => {
    const handleCartUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<{ count: number }>;
      if (customEvt.detail && typeof customEvt.detail.count === 'number') {
        setLocalCartCount(customEvt.detail.count);
      }
    };
    window.addEventListener('nana:cart_updated', handleCartUpdate);
    return () => window.removeEventListener('nana:cart_updated', handleCartUpdate);
  }, []);

  // Nettoyage du numéro WhatsApp
  const cleanPhone = useMemo(() => {
    return (whatsappNumber || '+225 07 00 00 00').replace(/[^0-9]/g, '');
  }, [whatsappNumber]);

  // Liste enrichie des catégories avec comptage et première image
  const enrichedCategories = useMemo(() => {
    const uniqueCats = Array.from(new Set(categories.length > 0 ? categories : ['Tous les produits']));
    if (!uniqueCats.includes('Tous les produits')) {
      uniqueCats.unshift('Tous les produits');
    }

    return uniqueCats.map(cat => {
      const isAll = cat === 'Tous les produits';
      const prodsInCat = isAll 
        ? allProducts 
        : allProducts.filter(p => p.category?.toLowerCase() === cat.toLowerCase());
      
      const firstImage = prodsInCat.find(p => p.image)?.image || 
        (allProducts.length > 0 ? allProducts[0].image : undefined);

      return {
        name: cat,
        count: prodsInCat.length,
        thumbnail: firstImage,
        isAll
      };
    });
  }, [categories, allProducts]);

  // Filtrage des catégories par le champ de recherche du tiroir
  const filteredCategoriesList = useMemo(() => {
    if (!categorySearchQuery.trim()) return enrichedCategories;
    const query = categorySearchQuery.toLowerCase().trim();
    return enrichedCategories.filter(c => 
      c.name.toLowerCase().includes(query) ||
      allProducts.some(p => p.category?.toLowerCase() === c.name.toLowerCase() && p.name.toLowerCase().includes(query))
    );
  }, [enrichedCategories, categorySearchQuery, allProducts]);

  // Action : 🏠 Onglet 1 - Accueil
  const handleHomeClick = useCallback(() => {
    playTapBeep();
    setActiveTab('home');
    setIsCategorySheetOpen(false);

    if (onSelectCategory) {
      onSelectCategory('all');
    }
    if (onResetToHome) {
      onResetToHome();
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [onSelectCategory, onResetToHome]);

  // Action : 🗂️ Onglet 2 - Catégories (Ouvre la feuille du bas)
  const handleCategoriesClick = useCallback(() => {
    playTapBeep();
    setActiveTab('categories');
    setIsCategorySheetOpen(prev => !prev);
  }, []);

  // Action : 🔴 Onglet 3 - Live / Vidéos (Bouton central)
  const handleLiveClick = useCallback(() => {
    playTapBeep();
    setActiveTab('live');
    setIsCategorySheetOpen(false);

    if (onOpenLive) {
      onOpenLive();
      return;
    }

    if (typeof window !== 'undefined') {
      const liveSec = document.querySelector('[data-section-type="omni_live_studio"]') ||
                      document.getElementById('omni-live-studio') ||
                      document.querySelector('[data-section-type="video_story_carousel"]') ||
                      document.querySelector('[data-section-type="flash_deal_vault"]');
      if (liveSec) {
        liveSec.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Déclenche l'événement global pour les sessions Live interactives
        window.dispatchEvent(new CustomEvent('nana:open_live'));
        window.scrollTo({ top: 380, behavior: 'smooth' });
      }
    }
  }, [onOpenLive]);

  // Action : 🛒 Onglet 4 - Panier
  const handleCartClick = useCallback(() => {
    playValidationBeep();
    setActiveTab('cart');
    setIsCategorySheetOpen(false);

    if (onOpenCart) {
      onOpenCart();
    } else {
      openSmartCart();
    }
  }, [onOpenCart]);

  // Action : 💬 Onglet 5 - WhatsApp
  const handleWhatsAppClick = useCallback(() => {
    playTapBeep();
    setActiveTab('whatsapp');
    setIsCategorySheetOpen(false);

    const defaultMsg = `Bonjour ${storeName} ! Je visite votre boutique en ligne et je souhaite avoir des informations / commander.`;
    const targetUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(defaultMsg)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }, [cleanPhone, storeName]);

  // Action : Sélection d'une catégorie dans la feuille du bas
  const handleSelectCategoryFromSheet = useCallback((catName: string) => {
    playTapBeep();
    setIsCategorySheetOpen(false);
    if (onSelectCategory) {
      onSelectCategory(catName);
    }

    if (typeof window !== 'undefined') {
      const gridSec = document.querySelector('[data-section-type="smart_masonry_grid"]') ||
                      document.querySelector('[data-section-type="glowing_cosmetics_grid"]') ||
                      document.querySelector('[data-section-type="digital_square_grid"]') ||
                      document.querySelector('.product-grid-section');
      if (gridSec) {
        gridSec.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [onSelectCategory]);

  // =========================================================================
  // 2. RENDU VISUEL : DOCK STYLE IOS / ANDROID EN BLEU ROYAL & BLANC PUR
  // =========================================================================

  const containerPositionClasses = isSimulatedMobile
    ? 'sticky bottom-0 inset-x-0 z-40'
    : 'fixed bottom-0 left-0 right-0 z-40 md:hidden';

  return (
    <>
      {/* ===================================================================== */}
      {/* A. MOBILE CATEGORY BOTTOM SHEET (Tiroir Glissant des Catégories)     */}
      {/* ===================================================================== */}
      {isCategorySheetOpen && (
        <div 
          className={`fixed inset-0 z-50 overflow-hidden flex items-end justify-center ${isSimulatedMobile ? '' : 'md:hidden'}`}
          role="dialog"
          aria-modal="true"
          aria-label="Rayons et Catégories"
        >
          {/* Backdrop sombre avec flou */}
          <div 
            onClick={() => setIsCategorySheetOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Feuille Glissante en Blanc Pur & Bleu Royal */}
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl border-t-2 border-blue-600 shadow-2xl p-5 max-h-[78vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-300">
            {/* Barre de préhension supérieure */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 shrink-0" />

            {/* En-tête du tiroir avec Titre & Croix de Fermeture */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm">
                  🗂️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                    Rayons & Catégories
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {enrichedCategories.length} catégories disponibles
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsCategorySheetOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-600 flex items-center justify-center transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Champ de recherche rapide */}
            <div className="relative mt-3 mb-4 shrink-0">
              <Search className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                placeholder="🔍 Rechercher un produit ou un rayon..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-blue-100 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
              {categorySearchQuery && (
                <button
                  type="button"
                  onClick={() => setCategorySearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grille des Catégories Défilante */}
            <div className="overflow-y-auto space-y-2 pr-1 pb-6 overscroll-contain">
              {filteredCategoriesList.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase() || 
                  (cat.isAll && (selectedCategory === 'Tous les produits' || selectedCategory === 'all'));

                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => handleSelectCategoryFromSheet(cat.name)}
                    className={`w-full p-2.5 rounded-2xl border transition flex items-center justify-between text-left active:scale-[0.98] cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-600 shadow-sm ring-1 ring-blue-500'
                        : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Miniature visuelle ou icône */}
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                        {cat.thumbnail ? (
                          <img
                            src={cat.thumbnail}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <Layers className="w-5 h-5 text-blue-600" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-extrabold ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>
                            {cat.name}
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {cat.count} produit{cat.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        isSelected 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isSelected ? 'Actif' : 'Voir'}
                      </span>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>
                  </button>
                );
              })}

              {filteredCategoriesList.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-semibold">Aucun rayon trouvé pour "{categorySearchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* B. BARRE DE NAVIGATION BASSE STYLE APP (Dock 5 Onglets au Pouce)      */}
      {/* ===================================================================== */}
      <nav 
        aria-label="Barre de navigation mobile"
        className={`${containerPositionClasses} bg-white/95 backdrop-blur-xl border-t border-blue-100 shadow-[0_-8px_30px_rgba(37,99,235,0.10)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none ${className}`}
      >
        <div className="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto relative">
          
          {/* 1️⃣ ONGLET 1 : 🏠 ACCUEIL */}
          <button
            type="button"
            onClick={handleHomeClick}
            className="flex flex-col items-center justify-center py-1 w-full text-center active:scale-90 transition-all duration-200 cursor-pointer group relative"
          >
            {/* Barre lumineuse bleue indicatrice au-dessus */}
            {activeTab === 'home' && (
              <span className="w-6 h-1 bg-blue-600 rounded-full absolute -top-1 animate-in zoom-in duration-150" />
            )}
            <Home className={`w-5 h-5 transition-colors ${
              activeTab === 'home' ? 'text-blue-600 stroke-[2.5]' : 'text-slate-600 group-hover:text-blue-600'
            }`} />
            <span className={`text-[10px] font-bold tracking-tight mt-0.5 ${
              activeTab === 'home' ? 'text-blue-600 font-extrabold' : 'text-slate-600 group-hover:text-blue-600'
            }`}>
              Accueil
            </span>
          </button>

          {/* 2️⃣ ONGLET 2 : 🗂️ CATÉGORIES (AVEC TIROIR BOTTOM SHEET) */}
          <button
            type="button"
            onClick={handleCategoriesClick}
            className="flex flex-col items-center justify-center py-1 w-full text-center active:scale-90 transition-all duration-200 cursor-pointer group relative"
          >
            {isCategorySheetOpen && (
              <span className="w-6 h-1 bg-blue-600 rounded-full absolute -top-1 animate-in zoom-in duration-150" />
            )}
            <Layers className={`w-5 h-5 transition-colors ${
              isCategorySheetOpen || activeTab === 'categories' ? 'text-blue-600 stroke-[2.5]' : 'text-slate-600 group-hover:text-blue-600'
            }`} />
            <span className={`text-[10px] font-bold tracking-tight mt-0.5 ${
              isCategorySheetOpen || activeTab === 'categories' ? 'text-blue-600 font-extrabold' : 'text-slate-600 group-hover:text-blue-600'
            }`}>
              Rayons
            </span>
          </button>

          {/* 3️⃣ ONGLET 3 : 🔴 LIVE / VIDÉOS (BOUTON CENTRAL SURÉLEVÉ) */}
          <button
            type="button"
            onClick={handleLiveClick}
            className="flex flex-col items-center justify-center w-full text-center active:scale-90 transition-all duration-200 cursor-pointer relative group"
            title="Accéder au Live & Démonstrations Vidéos"
          >
            {/* Bouton rond surélevé en Bleu Royal */}
            <div className="w-11 h-11 -mt-4 rounded-full bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-lg shadow-blue-600/30 border-2 border-white flex items-center justify-center relative transform group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 text-white" />
              {/* Point rouge/blanc pulsant */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white" />
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 tracking-tight mt-0.5">
              Live / Vidéos
            </span>
          </button>

          {/* 4️⃣ ONGLET 4 : 🛒 PANIER ({cartCount}) */}
          <button
            type="button"
            onClick={handleCartClick}
            className="flex flex-col items-center justify-center py-1 w-full text-center active:scale-90 transition-all duration-200 cursor-pointer group relative"
          >
            {activeTab === 'cart' && (
              <span className="w-6 h-1 bg-blue-600 rounded-full absolute -top-1 animate-in zoom-in duration-150" />
            )}
            <div className="relative">
              <ShoppingBag className={`w-5 h-5 transition-colors ${
                activeTab === 'cart' ? 'text-blue-600 stroke-[2.5]' : 'text-slate-600 group-hover:text-blue-600'
              }`} />
              {/* Badge Compteur Dynamique en Bleu Royal */}
              {localCartCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full border-2 border-white absolute -top-1.5 -right-2 flex items-center justify-center animate-bounce shadow-sm">
                  {localCartCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold tracking-tight mt-0.5 ${
              activeTab === 'cart' ? 'text-blue-600 font-extrabold' : 'text-slate-600 group-hover:text-blue-600'
            }`}>
              Panier {localCartCount > 0 ? `(${localCartCount})` : ''}
            </span>
          </button>

          {/* 5️⃣ ONGLET 5 : 💬 WHATSAPP */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="flex flex-col items-center justify-center py-1 w-full text-center active:scale-90 transition-all duration-200 cursor-pointer group relative"
            title="Discuter directement sur WhatsApp"
          >
            <div className="bg-emerald-50 text-emerald-600 rounded-xl p-1 relative">
              <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-100" />
              {/* Point vert en ligne */}
              <span className="w-2 h-2 bg-emerald-500 rounded-full absolute top-0 right-0 ring-1 ring-white" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 tracking-tight mt-0.5">
              WhatsApp
            </span>
          </button>

        </div>
      </nav>
    </>
  );
};

export default MobileAppBottomTabBar;
