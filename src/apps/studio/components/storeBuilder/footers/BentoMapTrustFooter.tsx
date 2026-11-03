import React, { useState, useMemo, useCallback } from 'react';
import { 
  MapPin, 
  Plus, 
  Minus, 
  Navigation, 
  Mail, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Phone, 
  MessageCircle, 
  Truck, 
  Gift, 
  ArrowRight,
  Copy, 
  Check,
  Layers
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../../types';
import { StoreProductItem } from '../types';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';
import { openStoreLegalModal } from '../StoreLegalAndTrackingModals';

export interface BentoMapTrustFooterProps {
  config: ThemeCustomizationConfig;
  products?: StoreProductItem[];
  categories?: string[];
  storeSlug?: string;
  onOpenFunnel?: (product: StoreProductItem) => void;
  onSelectProduct?: (product: StoreProductItem) => void;
  onResetToHome?: () => void;
  onSelectCategory?: (category: string) => void;
  isPublicView?: boolean;
  isAdminPreview?: boolean;
  className?: string;
}

// Coordonnées GPS des principales métropoles ouest & centre-africaines
const CITY_COORDINATES: Record<string, { lat: number; lng: number; label: string }> = {
  'bobo': { lat: 11.1771, lng: -4.2979, label: 'Bobo-Dioulasso, Burkina Faso' },
  'bobo-dioulasso': { lat: 11.1771, lng: -4.2979, label: 'Bobo-Dioulasso, Burkina Faso' },
  'ouaga': { lat: 12.3714, lng: -1.5197, label: 'Ouagadougou, Burkina Faso' },
  'ouagadougou': { lat: 12.3714, lng: -1.5197, label: 'Ouagadougou, Burkina Faso' },
  'abidjan': { lat: 5.3600, lng: -4.0083, label: 'Abidjan, Côte d\'Ivoire' },
  'dakar': { lat: 14.7167, lng: -17.4677, label: 'Dakar, Sénégal' },
  'bamako': { lat: 12.6392, lng: -8.0029, label: 'Bamako, Mali' },
  'lome': { lat: 6.1375, lng: 1.2123, label: 'Lomé, Togo' },
  'cotonou': { lat: 6.3654, lng: 2.4183, label: 'Cotonou, Bénin' }
};

export const BentoMapTrustFooter: React.FC<BentoMapTrustFooterProps> = ({
  config,
  products = [],
  categories = [],
  storeSlug = 'boutique',
  onOpenFunnel,
  onSelectProduct,
  onResetToHome,
  onSelectCategory,
  isPublicView = false,
  isAdminPreview = false,
  className = ''
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (ZÉRO ERREUR #310)
  // =========================================================================

  // État du formulaire de newsletter
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [promoCodeCopied, setPromoCodeCopied] = useState<boolean>(false);

  // Niveau de zoom interactif de la Mini-Map (10 à 18)
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Nom et marque boutique
  const storeName = useMemo(() => {
    return config.storeName || 'Boutique Officielle Nanasore';
  }, [config.storeName]);

  // Numéro WhatsApp vendeur nettoyé pour liens wa.me et tel:
  const cleanPhone = useMemo(() => {
    const raw = config.whatsappNumber || config.supportPhone || '+225 07 00 00 00 00';
    return raw.replace(/[^0-9]/g, '');
  }, [config.whatsappNumber, config.supportPhone]);

  // Numéro Hotline affiché
  const phoneDisplay = useMemo(() => {
    return config.supportPhone || config.whatsappNumber || '+226 / +225 Service Client';
  }, [config.supportPhone, config.whatsappNumber]);

  // Adresse ou ville du vendeur
  const sellerAddress = useMemo(() => {
    return config.footerAddress || config.footerMapCity || 'Centre-Ville, Bobo-Dioulasso / Livraison Nationale';
  }, [config.footerAddress, config.footerMapCity]);

  // Liens Réseaux Sociaux
  const socialLinks = useMemo(() => {
    const custom = config.socialLinks || {};
    return {
      facebook: custom.facebook || '#',
      instagram: custom.instagram || '#',
      tiktok: custom.tiktok || '#',
      whatsapp: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${storeName}, je vous contacte depuis votre boutique en ligne.`)}`,
      youtube: custom.youtube || '#',
      telegram: (custom as any).telegram || '#'
    };
  }, [config.socialLinks, cleanPhone, storeName]);

  // Détermination des coordonnées GPS de la boutique
  const gpsCoords = useMemo(() => {
    if (config.footerMapCoordinates?.lat && config.footerMapCoordinates?.lng) {
      return config.footerMapCoordinates;
    }
    const lowerAddr = sellerAddress.toLowerCase();
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
      if (lowerAddr.includes(key)) {
        return coords;
      }
    }
    // Par défaut : Bobo-Dioulasso
    return { lat: 11.1771, lng: -4.2979, label: 'Bobo-Dioulasso, Burkina Faso' };
  }, [config.footerMapCoordinates, sellerAddress]);

  // Calcul dynamique de la boîte englobante OpenStreetMap basée sur le niveau de zoom
  const osmEmbedUrl = useMemo(() => {
    const delta = 0.05 / Math.pow(2, mapZoom - 12);
    const left = (gpsCoords.lng - delta).toFixed(4);
    const bottom = (gpsCoords.lat - delta).toFixed(4);
    const right = (gpsCoords.lng + delta).toFixed(4);
    const top = (gpsCoords.lat + delta).toFixed(4);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${gpsCoords.lat}%2C${gpsCoords.lng}`;
  }, [gpsCoords, mapZoom]);

  // Lien direct Google Maps pour itinéraire
  const googleMapsUrl = useMemo(() => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sellerAddress || `${gpsCoords.lat},${gpsCoords.lng}`)}`;
  }, [sellerAddress, gpsCoords]);

  // Extraction dynamique des catégories avec compte d'articles
  const dynamicCategories = useMemo(() => {
    const catsMap = new Map<string, number>();

    // Initialisation avec les catégories existantes
    (categories || []).forEach(c => {
      if (c && c.trim()) catsMap.set(c.trim(), 0);
    });

    // Comptage des produits par catégorie
    (products || []).forEach(p => {
      if (p.category && p.category.trim()) {
        const cat = p.category.trim();
        catsMap.set(cat, (catsMap.get(cat) || 0) + 1);
      }
    });

    const list: { name: string; count: number; icon: string }[] = [];

    // Rayons spéciaux de base
    list.push({ 
      name: 'Tous les produits', 
      count: products.length, 
      icon: '🌟'
    });
    list.push({ 
      name: 'Promotions Flash', 
      count: products.filter(p => p.originalPrice && p.originalPrice > p.price).length || Math.min(products.length, 4), 
      icon: '⚡'
    });
    list.push({ 
      name: 'Meilleures Ventes', 
      count: Math.min(products.length, 6) || Math.min(products.length, 8), 
      icon: '🔥'
    });

    // Catégories réelles de la boutique
    catsMap.forEach((count, cat) => {
      if (cat !== 'Tous les produits' && cat !== 'Promotions Flash' && cat !== 'Meilleures Ventes') {
        list.push({ 
          name: cat, 
          count: count || 1, 
          icon: '📁' 
        });
      }
    });

    return list;
  }, [categories, products]);

  // Soumission de la newsletter
  const handleNewsletterSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;

    playValidationBeep();
    setIsSubscribed(true);

    // Sauvegarde locale discrète
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_newsletter_subscribers');
        const list = stored ? JSON.parse(stored) : [];
        list.push({ email: newsletterEmail, date: new Date().toISOString() });
        localStorage.setItem('nana_newsletter_subscribers', JSON.stringify(list));
      } catch (err) {}
    }
  }, [newsletterEmail]);

  // Copie du code promo de bienvenue
  const handleCopyPromoCode = useCallback(() => {
    playTapBeep();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('VIP15');
      setPromoCodeCopied(true);
      setTimeout(() => setPromoCodeCopied(false), 2500);
    }
  }, []);

  // Zoom avant (+1)
  const handleZoomIn = useCallback(() => {
    playTapBeep();
    setMapZoom(z => Math.min(18, z + 1));
  }, []);

  // Zoom arrière (-1)
  const handleZoomOut = useCallback(() => {
    playTapBeep();
    setMapZoom(z => Math.max(10, z - 1));
  }, []);

  // Clic sur une catégorie
  const handleCategoryClick = useCallback((catName: string) => {
    playTapBeep();
    if (onSelectCategory) {
      onSelectCategory(catName);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nana_filter_category', { detail: { category: catName } }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [onSelectCategory]);

  return (
    <footer className={`w-full bg-slate-50 border-t-2 border-blue-100 pt-12 sm:pt-16 pb-8 px-4 lg:px-8 text-slate-900 select-none ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. LA GRANDE BARRE BENTO DE SOUSCRIPTION E-MAILING VIP */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl shadow-blue-600/15 mb-10 sm:mb-12 max-w-[1380px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
        
        {/* Partie Gauche : Titre & Avantages VIP */}
        <div className="max-w-xl text-left space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-sm">
            <Mail className="w-3.5 h-3.5" />
            <span>📧 CLUB PRIVILÈGE &amp; ALERTES PROMOS</span>
          </div>

          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
            {config.footerNewsletterTitle || 'Recevez nos offres secrètes & codes promos en avant-première !'}
          </h3>

          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed font-medium">
            {config.footerNewsletterSubtitle || 'Inscrivez votre adresse e-mail pour débloquer vos avantages VIP et suivre nos nouveautés exclusives.'}
          </p>
        </div>

        {/* Partie Droite : Formulaire ou État de Confirmation avec Code Promo */}
        <div className="w-full lg:max-w-md shrink-0">
          {!isSubscribed ? (
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <div className="bg-white text-slate-900 rounded-2xl p-1.5 flex items-center w-full shadow-inner border border-blue-200">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Entrez votre adresse e-mail..."
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium bg-transparent"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-xl shrink-0 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                >
                  S'abonner →
                </button>
              </div>
              <span className="text-[10px] text-blue-200 block text-left pl-2">
                🔒 Zéro spam. Désinscription possible à tout moment en 1 clic.
              </span>
            </form>
          ) : (
            <div className="bg-white/15 border border-white/30 rounded-2xl p-4 text-white text-left animate-in fade-in space-y-2 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-xs sm:text-sm font-black">
                  🎉 Inscription confirmée avec succès !
                </span>
              </div>
              <p className="text-[11px] text-blue-100">
                Voici votre avantage VIP exclusif réservé aux membres :
              </p>
              <div className="flex items-center justify-between gap-2 bg-white text-slate-900 rounded-xl px-3 py-2">
                <span className="text-xs font-black text-blue-700 tracking-wider">
                  🎁 CODE : VIP15 (-15% IMMÉDIAT)
                </span>
                <button
                  type="button"
                  onClick={handleCopyPromoCode}
                  className="text-[11px] font-bold px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  {promoCodeCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{promoCodeCopied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. GRILLE BENTO INFÉRIEURE : 3 GRANDES CARTES (MINI-MAP, VENDEUR, RAYONS) */}
      {/* ========================================================================= */}
      <div className="max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CARTE BENTO 1 (lg:col-span-4) : LA MINI-MAP INTERACTIVE AVEC ZOOM (+ / -) */}
        <div className="lg:col-span-4 bg-white border border-blue-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          
          {/* En-tête de la Mini-Map */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 fill-current" />
              </div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Localisation de la Boutique
              </h4>
            </div>
            <p className="text-xs text-slate-500 font-medium pl-9 leading-snug">
              {sellerAddress}
            </p>
          </div>

          {/* Cadre de la Mini-Map avec Contrôle de Zoom Interactif */}
          <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-blue-200/80 bg-blue-50/50 group">
            
            {/* Carte OpenStreetMap Iframe réactive au zoom */}
            <iframe
              title="Localisation de la Boutique"
              src={osmEmbedUrl}
              className="w-full h-full border-0 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity"
              loading="lazy"
            />

            {/* MARQUEUR GPS PULSANT EN BLEU ROYAL NANASORE (#2563EB) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              
              {/* Bulle blanche affichant le nom de la boutique */}
              <div className="bg-white text-slate-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg border border-blue-200 flex items-center gap-1.5 -translate-y-1 animate-bounce">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span className="max-w-[130px] truncate">{storeName}</span>
              </div>

              {/* Point de repère GPS avec onde de pulsation */}
              <div className="relative flex items-center justify-center mt-0.5">
                <span className="absolute w-6 h-6 rounded-full bg-blue-500 opacity-60 animate-ping" />
                <span className="relative w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
              </div>
            </div>

            {/* BOUTONS DE ZOOM INTERACTIFS (+ et -) EN HAUT À DROITE */}
            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={mapZoom >= 18}
                className="w-8 h-8 bg-white hover:bg-blue-600 text-slate-900 hover:text-white border border-blue-200 rounded-lg shadow-md font-black text-sm flex items-center justify-center cursor-pointer transition-colors active:scale-95 disabled:opacity-40"
                title="Zoom avant (+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={mapZoom <= 10}
                className="w-8 h-8 bg-white hover:bg-blue-600 text-slate-900 hover:text-white border border-blue-200 rounded-lg shadow-md font-black text-sm flex items-center justify-center cursor-pointer transition-colors active:scale-95 disabled:opacity-40"
                title="Zoom arrière (-)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Indicateur discret du niveau de zoom */}
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs text-[9px] font-bold text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 pointer-events-none">
              Zoom: {mapZoom}x
            </div>

          </div>

          {/* Bouton d'Itinéraire Google Maps */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapBeep()}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>🧭 Ouvrir l'itinéraire Google Maps / Nous trouver</span>
          </a>

        </div>

        {/* CARTE BENTO 2 (lg:col-span-4) : INFOS DU VENDEUR & RÉSEAUX SOCIAUX */}
        <div className="lg:col-span-4 bg-white border border-blue-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          
          {/* Identité & À Propos du Vendeur */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {config.logoUrl ? (
                <img 
                  src={config.logoUrl} 
                  alt={storeName} 
                  className="w-12 h-12 rounded-2xl object-cover border border-blue-100 shadow-sm shrink-0" 
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                  {storeName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {storeName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black inline-flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    <span>Commerçant Vérifié</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold block truncate">
                  Boutique officielle Nanasore
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {config.footerAboutText || 'Votre boutique officielle de confiance. Produits authentiques, expédition rapide et service client réactif 7j/7.'}
            </p>
          </div>

          {/* Coordonnées Directes du Vendeur */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            {/* Téléphone Hotline */}
            <a
              href={`tel:${cleanPhone}`}
              onClick={() => playTapBeep()}
              className="flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 border border-blue-100 flex items-center justify-center transition-all shrink-0">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block font-normal leading-none mb-0.5">Hotline Service Client</span>
                <span className="text-xs font-black text-slate-900 group-hover:text-blue-600">{phoneDisplay}</span>
              </div>
            </a>

            {/* Horaires d'ouverture */}
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-normal leading-none mb-0.5">Disponibilité</span>
                <span className="text-xs font-extrabold text-slate-800">Commandes 24h/24 • Support 7j/7</span>
              </div>
            </div>

            {/* Bouton Rapide WhatsApp */}
            <a
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playTapBeep()}
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer mt-1"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Discuter avec le Vendeur sur WhatsApp</span>
            </a>
          </div>

          {/* Rangée des Icônes Réseaux Sociaux Modernes */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
              Rejoignez notre communauté :
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Facebook */}
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTapBeep()}
                title="Facebook"
                className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 flex items-center justify-center transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTapBeep()}
                title="Instagram"
                className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 flex items-center justify-center transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* TikTok */}
              <a
                href={socialLinks.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTapBeep()}
                title="TikTok"
                className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 flex items-center justify-center transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.16 1.18 2.09 2.35 2.28.84.14 1.73-.04 2.44-.54.67-.47 1.09-1.22 1.17-2.03.04-1.48.01-2.96.02-4.44V.02z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTapBeep()}
                title="YouTube"
                className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 flex items-center justify-center transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>

              {/* Telegram */}
              <a
                href={socialLinks.telegram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTapBeep()}
                title="Telegram"
                className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 flex items-center justify-center transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z"/>
                </svg>
              </a>
            </div>
          </div>

        </div>

        {/* CARTE BENTO 3 (lg:col-span-4) : LISTE DYNAMIQUE DES CATÉGORIES & ACCÈS RAPIDES */}
        <div className="lg:col-span-4 bg-white border border-blue-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          
          {/* En-tête de la carte */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Nos Catégories &amp; Rayons
                </h4>
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                Catalogue
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium pl-9 leading-snug">
              Accédez directement à vos univers favoris en 1 clic
            </p>
          </div>

          {/* Grille / Liste Dynamique des Catégories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {dynamicCategories.map((cat, idx) => (
              <button
                key={`${cat.name}_${idx}`}
                type="button"
                onClick={() => handleCategoryClick(cat.name)}
                className="w-full text-left p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-150 hover:border-blue-200 text-slate-800 hover:text-blue-700 transition flex items-center justify-between gap-2 cursor-pointer group active:scale-98"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{cat.icon}</span>
                  <span className="text-xs font-bold truncate group-hover:text-blue-600">
                    {cat.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white border border-slate-200 group-hover:border-blue-200 text-slate-500 group-hover:text-blue-600">
                    {cat.count}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>

          {/* Badge de réassurance bas de carte */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Mise à jour en temps réel</span>
            </span>
            <span className="font-bold text-blue-600">
              {products.length} articles disponibles
            </span>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. BARRE INFÉRIEURE : LOGOS DES MOYENS DE PAIEMENT & COPYRIGHT OFFICIEL */}
      {/* ========================================================================= */}
      <div className="max-w-[1380px] mx-auto mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Badges Visuels Colorés & Nets de Nos Moyens de Paiement */}
        {config.paymentIconsVisible !== false && (
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-2.5">
          {/* Orange Money */}
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF7900] to-[#E06000] text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Orange Money</span>
          </div>

          {/* Wave Mobile Money */}
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#1DA1F2] to-[#0088CC] text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="text-xs">🌊</span>
            <span>Wave</span>
          </div>

          {/* MTN MoMo / Moov Money */}
          <div className="px-3 py-1.5 rounded-xl bg-[#FFCC00] text-slate-900 text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <span>MTN MoMo / Moov</span>
          </div>

          {/* Paiement Cash à la Livraison (COD) */}
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span>💵</span>
            <span>Paiement à la Livraison</span>
          </div>

          {/* Visa / Mastercard */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="text-blue-400 font-extrabold italic">VISA</span>
            <span className="text-slate-400">/</span>
            <span className="text-rose-400 font-extrabold">Mastercard</span>
          </div>
        </div>
        )}

        {/* Liens Légaux & Suivi de Commande */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => openStoreLegalModal('terms')}
            className="hover:text-blue-600 transition cursor-pointer"
          >
            📋 Conditions Générales
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={() => openStoreLegalModal('shipping')}
            className="hover:text-blue-600 transition cursor-pointer"
          >
            🚚 Livraison &amp; Retours
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={() => openStoreLegalModal('privacy')}
            className="hover:text-blue-600 transition cursor-pointer"
          >
            🔒 Confidentialité
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={() => openStoreLegalModal('tracking')}
            className="text-blue-600 hover:text-blue-700 font-black transition cursor-pointer flex items-center gap-1"
          >
            <span>📦 Suivre ma Commande</span>
          </button>
        </div>

        {/* Copyright & Signature Officielle */}
        <div className="text-center md:text-right space-y-1">
          <p className="text-xs text-slate-500 font-medium">
            {config.copyrightText || (
              <>© {new Date().getFullYear()} <strong className="text-slate-800">{storeName}</strong>. Tous droits réservés.</>
            )}
          </p>
          <p className="text-[11px] text-slate-400 flex items-center justify-center md:justify-end gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 inline" />
            <span>Propulsé avec sécurité par</span>
            <strong className="text-blue-600 font-black">Nanasore™ OS</strong>
          </p>
        </div>

      </div>

    </footer>
  );
};

export default BentoMapTrustFooter;
