import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  Gift, 
  Sparkles, 
  CheckCircle2, 
  MessageCircle, 
  Zap, 
  Search, 
  ArrowRight, 
  Check, 
  Flame,
  Star,
  Plus,
  Minus,
  ShieldCheck,
  X
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../../types';
import { StoreProductItem } from '../types';
import { SlideOutFunnelDrawer } from '../../../../../components/SlideOutFunnelDrawer';
import { DigitalWideProductView } from '../DigitalWideProductView';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface SmartRewardHeaderProps {
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

export const SmartRewardHeader: React.FC<SmartRewardHeaderProps> = ({
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
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (ZÉRO ERREUR #310)
  // =========================================================================

  // Nombre d'articles panier (avec persistance locale)
  const [cartCount, setCartCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_marketplace_cart');
        if (stored) {
          const items = JSON.parse(stored);
          if (Array.isArray(items)) {
            return items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
          }
        }
      } catch (e) {
        return 0;
      }
    }
    return 0;
  });

  // Montant total du panier en FCFA
  const [cartTotal, setCartTotal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_marketplace_cart');
        if (stored) {
          const items = JSON.parse(stored);
          if (Array.isArray(items)) {
            return items.reduce((sum: number, it: any) => sum + ((it.product?.price || 0) * (it.quantity || 1)), 0);
          }
        }
      } catch (e) {
        return 0;
      }
    }
    return 0;
  });

  // Tiroir Tunnel d'achat intégré en 0ms
  const [selectedFunnelProduct, setSelectedFunnelProduct] = useState<StoreProductItem | null>(null);

  // Recherche prédictive instantanée
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Popover / Tiroir Récapitulatif Panier & Récompenses
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

  // Modal / Vue Produit Pleine Largeur
  const [isDigitalViewOpen, setIsDigitalViewOpen] = useState<boolean>(false);

  // Références conteneurs pour fermeture au clic extérieur
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
  const cartDrawerRef = useRef<HTMLDivElement | null>(null);
  const offerDropdownRef = useRef<HTMLDivElement | null>(null);

  // Nom et accroche boutique
  const storeName = useMemo(() => {
    return config.storeName || 'Nanasore Smart Store';
  }, [config.storeName]);

  const storeTagline = useMemo(() => {
    return config.storeTagline || 'Boutique Officielle Certifiée & Avantages VIP';
  }, [config.storeTagline]);

  // Numéro WhatsApp vendeur
  const cleanPhone = useMemo(() => {
    const raw = config.whatsappNumber || config.supportPhone || '+225 07 00 00 00 00';
    return raw.replace(/[^0-9]/g, '');
  }, [config.whatsappNumber, config.supportPhone]);

  // Produit vedette du jour
  const featuredProduct = useMemo(() => {
    return products[0] || null;
  }, [products]);

  // Calcul du pourcentage de progression sur la jauge à 2 paliers
  const progressPercent = useMemo(() => {
    if (cartCount === 0) return 10;
    if (cartCount === 1) return 50;
    return 100;
  }, [cartCount]);

  // Message d'incitation psychologique dynamique
  const rewardMessage = useMemo(() => {
    if (cartCount === 0) {
      return '⚡ Commandez aujourd\'hui pour débloquer la Livraison Prioritaire + votre Avantage VIP !';
    }
    if (cartCount === 1) {
      return '🔥 Bravo ! Livraison Prioritaire activée — Ajoutez 1 article pour débloquer votre Cadeau VIP 🎁 !';
    }
    return '🎉 FÉLICITATIONS ! Tous vos avantages VIP (Livraison + Bonus) sont débloqués !';
  }, [cartCount]);

  // Résultats de la recherche prédictive (0ms dès 1 caractère)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [searchQuery, products]);

  // URL WhatsApp pour valider la commande avec les récompenses
  const whatsappCartUrl = useMemo(() => {
    let msg = `Bonjour ${storeName},\nJe souhaite commander avec mes avantages VIP Nanasore !\n\n`;
    if (cartCount >= 1) msg += `✅ Livraison Prioritaire Offerte Débloquée\n`;
    if (cartCount >= 2) msg += `🎁 Cadeau VIP Secret + Remise -15% Débloqués !\n`;
    msg += `\nArticles au panier : ${cartCount}\n`;
    if (cartTotal > 0) msg += `Total estimé : ${cartTotal.toLocaleString()} FCFA\n`;
    msg += `\nPouvez-vous valider ma commande immédiatement ? Merci !`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  }, [storeName, cartCount, cartTotal, cleanPhone]);

  // Fermeture des menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (cartDrawerRef.current && !cartDrawerRef.current.contains(e.target as Node)) {
        setIsCartDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Déclencheur Tunnel d'achat
  const handleOpenTunnel = useCallback((product: StoreProductItem) => {
    playTapBeep();
    if (onOpenFunnel) {
      onOpenFunnel(product);
    } else {
      setSelectedFunnelProduct(product);
    }
  }, [onOpenFunnel]);

  // Clic Logo
  const handleLogoClick = useCallback(() => {
    playTapBeep();
    if (onResetToHome) {
      onResetToHome();
    }
  }, [onResetToHome]);

  // Simulation interactive d'ajout / retrait d'article pour tester la jauge
  const handleSimulateCartChange = useCallback((delta: number) => {
    playValidationBeep();
    setCartCount(prev => Math.max(0, prev + delta));
  }, []);

  return (
    <header className={`w-full bg-white border-b-2 border-blue-100 sticky top-0 z-40 select-none transition-all shadow-sm ${className}`}>
      
      {/* ========================================================================= */}
      {/* ÉTAGE 1 : LA JAUGE DYNAMIQUE À 2 PALIERS (LIVRAISON ➡️ CADEAU VIP) */}
      {/* ========================================================================= */}
      <div className="w-full bg-white border-b border-blue-100 py-2 sm:py-2.5 px-3 sm:px-4 lg:px-8">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          
          {/* Message d'incitation centré en gras */}
          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-black text-slate-900 tracking-tight transition-all">
            <span>{rewardMessage}</span>
          </div>

          {/* Conteneur de la Jauge de Progression */}
          <div className="w-full max-w-lg mx-auto mt-1.5 sm:mt-2 relative">
            
            {/* Barre de Progression Visuelle Bleu Royal (#2563EB) */}
            <div className="w-full h-2.5 bg-blue-50 rounded-full overflow-hidden relative border border-blue-200/80 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Les 2 Paliers avec Icônes Étapes (🚚 à 50% et 🎁 à 100%) */}
            <div className="flex items-center justify-between text-[11px] font-bold mt-1.5 px-1">
              
              <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
                0 article
              </span>

              {/* Palier 1 : 50% - Livraison Prioritaire */}
              <div className={`flex items-center gap-1 transition-colors ${
                cartCount >= 1 ? 'text-blue-700 font-black' : 'text-slate-400 font-medium'
              }`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  cartCount >= 1 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                }`}>
                  <Truck className="w-2.5 h-2.5" />
                </div>
                <span>Livraison Prioritaire {cartCount >= 1 ? '✓' : '(1 art.)'}</span>
              </div>

              {/* Palier 2 : 100% - Cadeau VIP & -15% */}
              <div className={`flex items-center gap-1 transition-colors ${
                cartCount >= 2 ? 'text-blue-700 font-black' : 'text-slate-400 font-medium'
              }`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  cartCount >= 2 ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs animate-bounce' : 'bg-slate-200 text-slate-500'
                }`}>
                  <Gift className="w-2.5 h-2.5" />
                </div>
                <span>Cadeau VIP + Remise -15% {cartCount >= 2 ? '🎉' : '(2 art.)'}</span>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÉTAGE 2 : LE CŒUR DE L'EN-TÊTE DE CONVERSION */}
      {/* Logo + Sélecteur d'Offre Express & Recherche + WhatsApp Conseiller + Panier */}
      {/* ========================================================================= */}
      <div className="w-full bg-white px-3 sm:px-4 lg:px-8 py-3 sm:py-3.5 border-b border-slate-100">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 lg:gap-5">
          
          {/* SECTION GAUCHE : LOGO & BADGE GARANTIE QUALITÉ 100% */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
            title="Retour à l'accueil"
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={storeName}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-blue-200 object-cover shadow-xs group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-600 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-md shadow-blue-600/30 border border-blue-200 group-hover:scale-105 transition-transform shrink-0">
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight group-hover:text-blue-600 transition-colors truncate max-w-[130px] sm:max-w-none">
                  {storeName}
                </span>
                
                {/* Pilule bleue 🛡️ Garantie Qualité 100% */}
                <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                  🛡️ Garantie 100%
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight mt-0.5 max-w-[140px] sm:max-w-[200px] truncate">
                {storeTagline}
              </span>
            </div>
          </div>

          {/* SECTION CENTRALE : LE SÉLECTEUR D'OFFRE EXPRESS + RECHERCHE COMBINÉE */}
          <div className="hidden md:flex items-center bg-slate-50 border border-blue-200 rounded-xl p-1 max-w-xl w-full relative">
            
            {/* Bouton en Bleu Royal : ⚡ Offre Vedette du Jour */}
            <div ref={offerDropdownRef} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  if (featuredProduct) {
                    handleOpenTunnel(featuredProduct);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs transition-all active:scale-95 whitespace-nowrap"
                title="Découvrir l'offre phare du jour et commander en 1-clic"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
                <span>⚡ Offre Vedette du Jour</span>
              </button>
            </div>

            {/* Champ de recherche rapide instantané */}
            <div className="relative flex-1 flex items-center ml-2">
              <Search className="w-4 h-4 text-blue-500 absolute left-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (onSearch) onSearch(e.target.value);
                }}
                placeholder="Rechercher parmi les offres VIP..."
                className="w-full pl-8 pr-7 py-1.5 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    if (onSearch) onSearch('');
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold mr-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Résultats de recherche prédictive instantanée (0ms) */}
            {searchQuery.trim().length > 0 && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 border-blue-600 p-2 z-50 animate-in fade-in max-h-80 overflow-y-auto">
                <div className="text-[10px] font-black text-blue-900 uppercase tracking-wider px-2 py-1">
                  Offres correspondantes ({searchResults.length})
                </div>
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      playTapBeep();
                      setSearchQuery('');
                      if (onSelectProduct) onSelectProduct(p);
                      else handleOpenTunnel(p);
                    }}
                    className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <img 
                      src={p.image || ''} 
                      alt={p.name} 
                      className="w-9 h-9 rounded-lg object-cover border border-blue-100" 
                    />
                    <div className="flex-1 text-left">
                      <span className="text-xs font-bold text-slate-900 block truncate">{p.name}</span>
                      <span className="text-[11px] font-extrabold text-blue-600">{p.price.toLocaleString()} FCFA</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      Commander →
                    </span>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* SECTION DROITE : CONSEILLER WHATSAPP & BOUTON PANIER CADEAU */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* CARTE CONSEILLER WHATSAPP EN LIGNE (RÉPONSE EN 1 MIN) */}
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${storeName}, j'aimerais échanger avec un conseiller en ligne pour profiter des avantages VIP.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playTapBeep()}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-2.5 sm:px-3 py-1.5 flex items-center gap-2 sm:gap-2.5 cursor-pointer transition-all active:scale-95 shadow-2xs group"
              title="Conseiller WhatsApp en ligne"
            >
              {/* Avatar avec pastille verte pulsante */}
              <div className="relative w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs border border-white">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="Conseiller" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>👨‍💼</span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                </span>
              </div>

              {/* Libellés sur 2 lignes */}
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold text-emerald-900 leading-tight group-hover:text-emerald-950 transition-colors">
                  💬 Commander sur WhatsApp
                </span>
                <span className="text-[10px] text-emerald-700 font-medium leading-tight mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Conseiller en ligne • Réponse 1 min
                </span>
              </div>
            </a>

            {/* BOUTON PANIER & RÉCOMPENSE (AVEC TIROIR POPUP) */}
            <div className="relative" ref={cartDrawerRef}>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsCartDrawerOpen(!isCartDrawerOpen);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer transition-all whitespace-nowrap"
                title="Voir mon panier et mes récompenses débloquées"
              >
                <Gift className={`w-4 h-4 ${cartCount >= 2 ? 'animate-bounce text-amber-300' : ''}`} />
                <span>🎁 Panier ({cartCount})</span>
              </button>

              {/* POPOVER RÉCAPITULATIF CADEAU & PANIER */}
              {isCartDrawerOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border-2 border-blue-600 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                  
                  {/* Entête */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-black text-slate-900 uppercase">Vos Récompenses VIP</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCartDrawerOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Paliers débloqués */}
                  <div className="my-3 space-y-2">
                    <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                      cartCount >= 1 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                        cartCount >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                      }`}>
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-xs font-bold block">Palier 1 : Livraison Prioritaire Offerte</span>
                        <span className="text-[10px] block opacity-80">
                          {cartCount >= 1 ? '✓ Avantage débloqué et actif !' : 'Ajoutez 1 article pour débloquer'}
                        </span>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                      cartCount >= 2 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                        cartCount >= 2 ? 'bg-amber-500 text-white animate-bounce' : 'bg-slate-300 text-slate-600'
                      }`}>
                        <Gift className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-xs font-bold block">Palier 2 : Cadeau VIP Secret + -15%</span>
                        <span className="text-[10px] block opacity-80">
                          {cartCount >= 2 ? '🎉 Cadeau VIP ajouté à votre colis !' : 'Ajoutez 2 articles pour débloquer'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Résumé articles & total */}
                  <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100 text-left mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Articles au panier :</span>
                      <span className="font-extrabold text-blue-900">{cartCount} article(s)</span>
                    </div>
                    {cartTotal > 0 && (
                      <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-blue-200/50">
                        <span className="text-slate-600 font-semibold">Total estimé :</span>
                        <span className="font-black text-blue-700 text-sm">{cartTotal.toLocaleString()} FCFA</span>
                      </div>
                    )}
                  </div>

                  {/* 2 Boutons Stratégiques de Conversion */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartDrawerOpen(false);
                        if (featuredProduct) handleOpenTunnel(featuredProduct);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>⚡ Voir Tunnel &amp; Commander Immédiatement</span>
                    </button>

                    <a
                      href={whatsappCartUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        playTapBeep();
                        setIsCartDrawerOpen(false);
                      }}
                      className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>💬 Acheter via WhatsApp avec mes Avantages</span>
                    </a>
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>

        {/* RECHERCHE RAPIDE MOBILE (< 768px) */}
        <div className="md:hidden mt-2.5">
          <div className="flex items-center bg-slate-50 border border-blue-200 rounded-xl p-1 w-full">
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                if (featuredProduct) handleOpenTunnel(featuredProduct);
              }}
              className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shrink-0 flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-300 fill-current" />
              <span>⚡ Offre du Jour</span>
            </button>
            <div className="relative flex-1 flex items-center ml-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (onSearch) onSearch(e.target.value);
                }}
                placeholder="Rechercher une offre VIP..."
                className="w-full py-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 text-xs font-bold mr-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* TIROIR TUNNEL D'ACHAT DIRECT EN 0MS */}
      {/* ========================================================================= */}
      {selectedFunnelProduct && (
        <SlideOutFunnelDrawer
          funnelId={selectedFunnelProduct.linkedFunnelId || selectedFunnelProduct.id}
          isOpen={Boolean(selectedFunnelProduct)}
          onClose={() => setSelectedFunnelProduct(null)}
          renderMode="component"
        />
      )}

      {/* ========================================================================= */}
      {/* VUE NUMÉRIQUE PLEINE LARGEUR DU PRODUIT PHARE */}
      {/* ========================================================================= */}
      {isDigitalViewOpen && featuredProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md overflow-y-auto flex flex-col p-2 sm:p-6 animate-in fade-in">
          <div className="max-w-7xl mx-auto w-full relative">
            <button
              type="button"
              onClick={() => setIsDigitalViewOpen(false)}
              className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all cursor-pointer"
              title="Fermer la vue"
            >
              <X className="w-5 h-5" />
            </button>

            <DigitalWideProductView
              product={featuredProduct}
              allProducts={products}
              categories={categories}
              storeName={storeName}
              whatsappPhone={cleanPhone}
              onBack={() => setIsDigitalViewOpen(false)}
              onSelectProduct={(p) => {
                setIsDigitalViewOpen(false);
                if (onSelectProduct) onSelectProduct(p);
              }}
              onBuyNow={(p) => {
                setIsDigitalViewOpen(false);
                handleOpenTunnel(p);
              }}
              isPublicView={isPublicView}
              isAdminPreview={isAdminPreview}
            />
          </div>
        </div>
      )}

    </header>
  );
};

export default SmartRewardHeader;
