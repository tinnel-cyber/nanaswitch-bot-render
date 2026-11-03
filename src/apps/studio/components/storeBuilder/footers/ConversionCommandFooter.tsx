import React, { useState, useMemo, useCallback } from 'react';
import { 
  Mail, 
  MapPin, 
  Zap, 
  MessageCircle, 
  Plus, 
  Minus, 
  Crosshair, 
  Navigation, 
  CheckCircle2, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  Bell, 
  ArrowRight,
  Share2,
  Phone,
  QrCode,
  Tag,
  Layers,
  ExternalLink
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../../types';
import { StoreProductItem } from '../types';
import { triggerOpenFunnel } from '../../../../../themes/themeUtils';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';
import { openStoreLegalModal } from '../StoreLegalAndTrackingModals';

export interface ConversionCommandFooterProps {
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

// Coordonnées GPS des principales villes
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

export const ConversionCommandFooter: React.FC<ConversionCommandFooterProps> = ({
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
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  // État de l'abonnement e-mailing express
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [promoCodeCopied, setPromoCodeCopied] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Zoom interactif de la Mini-Map Radar (10 à 18)
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Nom de la boutique
  const storeName = useMemo(() => {
    return config.storeName || 'Boutique Officielle Nanasore';
  }, [config.storeName]);

  // Numéro WhatsApp vendeur
  const cleanPhone = useMemo(() => {
    const raw = config.whatsappNumber || config.supportPhone || '+225 07 00 00 00 00';
    return raw.replace(/[^0-9]/g, '');
  }, [config.whatsappNumber, config.supportPhone]);

  // Numéro Hotline
  const phoneDisplay = useMemo(() => {
    return config.supportPhone || config.whatsappNumber || '+226 / +225 Service Client';
  }, [config.supportPhone, config.whatsappNumber]);

  // Adresse du vendeur
  const sellerAddress = useMemo(() => {
    return config.footerAddress || config.footerMapCity || 'Entrepôt Central & Expédition Express';
  }, [config.footerAddress, config.footerMapCity]);

  // URL publique de la boutique pour le QR Code et le partage
  const storePublicUrl = useMemo(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}/store/${storeSlug}`;
    }
    return `https://${storeSlug}.nsore.shop`;
  }, [storeSlug]);

  // URL du QR Code haute résolution
  const qrCodeImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(storePublicUrl)}&color=2563EB&bgcolor=FFFFFF`;
  }, [storePublicUrl]);

  // Liens Réseaux Sociaux
  const socialLinks = useMemo(() => {
    const custom = config.socialLinks || {};
    return {
      facebook: custom.facebook || '#',
      instagram: custom.instagram || '#',
      tiktok: custom.tiktok || '#',
      whatsapp: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${storeName}, je vous contacte depuis votre boutique en ligne.`)}`,
      youtube: custom.youtube || '#'
    };
  }, [config.socialLinks, cleanPhone, storeName]);

  // Produit vedette pour l'ouverture du Tunnel
  const featuredProduct = useMemo(() => {
    if (products.length === 0) return null;
    return products.find(p => (p as any).isFeatured || (p as any).badge) || products[0];
  }, [products]);

  // Coordonnées GPS pour le radar
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
    return { lat: 11.1771, lng: -4.2979, label: 'Bobo-Dioulasso, Burkina Faso' };
  }, [config.footerMapCoordinates, sellerAddress]);

  // OSM Embed URL
  const osmEmbedUrl = useMemo(() => {
    const delta = 0.05 / Math.pow(2, mapZoom - 12);
    const left = (gpsCoords.lng - delta).toFixed(4);
    const bottom = (gpsCoords.lat - delta).toFixed(4);
    const right = (gpsCoords.lng + delta).toFixed(4);
    const top = (gpsCoords.lat + delta).toFixed(4);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${gpsCoords.lat}%2C${gpsCoords.lng}`;
  }, [gpsCoords, mapZoom]);

  // Lien direct Google Maps
  const googleMapsUrl = useMemo(() => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sellerAddress || `${gpsCoords.lat},${gpsCoords.lng}`)}`;
  }, [sellerAddress, gpsCoords]);

  // Nuage dynamique des catégories sous forme de pilules
  const dynamicCategories = useMemo(() => {
    const catsSet = new Set<string>();
    (categories || []).forEach(c => {
      if (c && c.trim()) catsSet.add(c.trim());
    });
    (products || []).forEach(p => {
      if (p.category && p.category.trim()) catsSet.add(p.category.trim());
    });

    const list: { name: string; icon: string; count?: number }[] = [
      { name: '🌟 Tout le Catalogue', icon: '🌟', count: products.length },
      { name: '⚡ Ventes Flash', icon: '⚡', count: products.filter(p => p.originalPrice && p.originalPrice > p.price).length || 3 },
      { name: '🔥 Tops Ventes', icon: '🔥', count: Math.min(products.length, 6) || 5 }
    ];

    catsSet.forEach(cat => {
      if (cat !== '🌟 Tout le Catalogue' && cat !== '⚡ Ventes Flash' && cat !== '🔥 Tops Ventes') {
        const count = products.filter(p => p.category === cat).length;
        list.push({ name: cat, icon: '🏷️', count: count || 1 });
      }
    });

    return list;
  }, [categories, products]);

  // Soumission Newsletter Express
  const handleNewsletterSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;

    playValidationBeep();
    setIsSubscribed(true);

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_newsletter_subscribers');
        const list = stored ? JSON.parse(stored) : [];
        list.push({ email: newsletterEmail, source: 'conversion_dock', date: new Date().toISOString() });
        localStorage.setItem('nana_newsletter_subscribers', JSON.stringify(list));
      } catch (err) {}
    }
  }, [newsletterEmail]);

  // Copie code promo VIP
  const handleCopyPromoCode = useCallback(() => {
    playTapBeep();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('VIP15');
      setPromoCodeCopied(true);
      setTimeout(() => setPromoCodeCopied(false), 2500);
    }
  }, []);

  // Copie du lien de la boutique
  const handleCopyStoreLink = useCallback(() => {
    playTapBeep();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(storePublicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  }, [storePublicUrl]);

  // Clic sur une catégorie
  const handleCategoryClick = useCallback((catName: string) => {
    playTapBeep();
    const cleanName = catName.replace(/^[🌟⚡🔥🏷️]\s*/, '');
    if (onSelectCategory) {
      onSelectCategory(cleanName);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nana_filter_category', { detail: { category: cleanName } }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [onSelectCategory]);

  // Déclencheur du Tunnel d'achat
  const handleOpenTunnel = useCallback(() => {
    playValidationBeep();
    if (featuredProduct && onOpenFunnel) {
      onOpenFunnel(featuredProduct);
    } else if (featuredProduct) {
      triggerOpenFunnel((featuredProduct as any).linkedFunnelId || featuredProduct.id, featuredProduct.name);
    } else if (products.length > 0) {
      const p = products[0];
      if (onOpenFunnel) onOpenFunnel(p);
      else triggerOpenFunnel((p as any).linkedFunnelId || p.id, p.name);
    } else {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [featuredProduct, onOpenFunnel, products]);

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

  // Recenter (Reset à 14x)
  const handleResetZoom = useCallback(() => {
    playValidationBeep();
    setMapZoom(14);
  }, []);

  return (
    <footer className={`w-full bg-slate-900 text-white border-t-2 border-blue-600 select-none ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. LE DOUBLE DOCK SUPÉRIEUR : E-MAILING + RACCOURCI TUNNEL & WHATSAPP */}
      {/* ========================================================================= */}
      <div className="max-w-[1380px] mx-auto px-4 lg:px-8 pt-10 sm:pt-14 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* BLOC GAUCHE (lg:col-span-7) — BARRE DE SOUSCRIPTION E-MAILING EXPRESS */}
        <div className="lg:col-span-7 bg-white text-slate-900 border-2 border-blue-600 rounded-3xl p-6 sm:p-7 shadow-xl shadow-blue-600/10 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 inline-flex items-center gap-1.5 w-fit">
              <Mail className="w-3.5 h-3.5" />
              <span>ALERTE NOUVEAUTÉS &amp; PROMOS FLASH</span>
            </span>

            <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 leading-snug">
              Ne manquez aucune baisse de prix sur <span className="text-blue-600">{storeName}</span> !
            </h3>

            <p className="text-xs text-slate-500 font-medium">
              Soyez prévenu(e) en temps réel par e-mail dès qu'une offre flash ou un arrivage exclusif est disponible.
            </p>
          </div>

          {!isSubscribed ? (
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2.5 mt-2">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Votre adresse e-mail personnelle..."
                required
                className="flex-1 bg-slate-50 border border-blue-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 font-medium"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-600/25 cursor-pointer transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Bell className="w-4 h-4" />
                <span>M'alerter par E-mail</span>
              </button>
            </form>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-blue-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs sm:text-sm font-black">
                  🎉 Alerte activée ! Code secret : VIP15 (-15%)
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPromoCode}
                className="text-[11px] font-bold px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                {promoCodeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{promoCodeCopied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          )}
        </div>

        {/* BLOC DROITE (lg:col-span-5) — RACCOURCI DIRECT TUNNEL & WHATSAPP */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-blue-600/20 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 bg-white/15 px-2.5 py-1 rounded-full border border-white/20 inline-flex items-center gap-1.5 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>COMMANDER SANS ATTENDRE</span>
            </span>

            <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
              ⚡ Prêt à commander maintenant ?
            </h3>

            <p className="text-xs text-blue-100 font-medium leading-relaxed">
              Commandez en 30 secondes via notre tunnel rapide ou directement avec le vendeur sur WhatsApp.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
            {/* Bouton Voir Tunnel */}
            <button
              type="button"
              onClick={handleOpenTunnel}
              className="bg-white hover:bg-blue-50 text-blue-600 font-black text-xs py-3 px-4 rounded-xl shadow-md flex-1 text-center cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-current text-blue-600" />
              <span>⚡ Voir Tunnel &amp; Acheter</span>
            </button>

            {/* Bouton Acheter via WhatsApp */}
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${storeName}, je souhaite passer commande immédiatement.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playTapBeep()}
              className="bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-xs py-3 px-4 rounded-xl shadow-md flex-1 text-center cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>💬 Acheter via WhatsApp</span>
            </a>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. GRILLE PRINCIPALE EN 3 COLONNES (INFOS + QR, RADAR MAP, PILULES RAYONS) */}
      {/* ========================================================================= */}
      <div className="max-w-[1380px] mx-auto px-4 lg:px-8 pb-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNE 1 (lg:col-span-4) — INFOS DU VENDEUR & QR CODE BOUTIQUE */}
        <div className="lg:col-span-4 bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-5 text-left">
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {config.logoUrl ? (
                <img 
                  src={config.logoUrl} 
                  alt={storeName} 
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-sm shrink-0" 
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
                  {storeName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-sm font-black text-white truncate">
                  {storeName}
                </h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Commerçant Certifié</span>
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {config.footerAboutText || 'Boutique officielle certifiée Nanasore. Produits 100% originaux avec livraison express et paiement sécurisé à la réception.'}
            </p>
          </div>

          {/* Coordonnées & Hotline */}
          <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
            <a
              href={`tel:${cleanPhone}`}
              onClick={() => playTapBeep()}
              className="flex items-center gap-2.5 text-slate-300 hover:text-blue-400 transition font-bold"
            >
              <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Hotline : {phoneDisplay}</span>
            </a>

            <div className="flex items-center gap-2.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Commandes 24h/24 • Réponse rapide WhatsApp</span>
            </div>
          </div>

          {/* ENCADRÉ QR CODE / SCAN BOUTIQUE MOBILE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl shrink-0 shadow-sm">
              <img 
                src={qrCodeImageUrl} 
                alt={`QR Code ${storeName}`} 
                className="w-16 h-16 object-contain"
                loading="lazy"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-[11px] font-black text-white block truncate flex items-center gap-1">
                <QrCode className="w-3 h-3 text-blue-400 inline" />
                <span>Scanner la Boutique</span>
              </span>
              <p className="text-[10px] text-slate-400 leading-tight">
                Scannez avec votre mobile pour commander ou partager à un ami.
              </p>
              <button
                type="button"
                onClick={handleCopyStoreLink}
                className="text-[10px] font-extrabold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition cursor-pointer pt-0.5"
              >
                {linkCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{linkCopied ? 'Lien copié !' : 'Copier le lien'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* COLONNE 2 (lg:col-span-4) — LA MINI-MAP RADAR VENDEUR AVEC ZOOM */}
        <div className="lg:col-span-4 bg-slate-850 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col justify-between space-y-3 text-left">
          
          {/* En-tête avec pastille verte pulsante */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <h4 className="text-xs font-black text-white uppercase tracking-wide">
                  Radar Expédition &amp; Point Relais
                </h4>
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-snug">
              Expédition depuis {sellerAddress}
            </p>
          </div>

          {/* Cadre Mini-Map Interactive avec Radar */}
          <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-blue-900/60 bg-slate-900 group">
            {/* Carte OSM */}
            <iframe
              title="Radar Vendeur de la Boutique"
              src={osmEmbedUrl}
              className="w-full h-full border-0 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity"
              loading="lazy"
            />

            {/* MARQUEUR RADAR SONAR BLEU ROYAL (#2563EB) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-xl border border-blue-500 flex items-center gap-1.5 -translate-y-1 animate-bounce">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="max-w-[130px] truncate">{storeName}</span>
              </div>

              <div className="relative flex items-center justify-center mt-0.5">
                <span className="absolute w-12 h-12 rounded-full bg-blue-500 opacity-30 animate-ping" />
                <span className="absolute w-7 h-7 rounded-full bg-blue-600 opacity-50 animate-ping" />
                <span className="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
              </div>
            </div>

            {/* CONTRÔLES DE ZOOM & RECENTER (+ / - / 🎯) */}
            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-10 bg-slate-900/90 backdrop-blur-md rounded-xl p-1 border border-slate-700 shadow-xl">
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={mapZoom >= 18}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-blue-600 text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30"
                title="Zoom avant (+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={mapZoom <= 10}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-blue-600 text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30"
                title="Zoom arrière (-)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-blue-600 text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
                title="Recentrer le radar (14x)"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur-xs text-[9px] font-mono text-blue-400 px-2 py-0.5 rounded-md border border-slate-700 pointer-events-none">
              Zoom: {mapZoom}x • Radar Actif
            </div>
          </div>

          {/* Bouton d'Itinéraire */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapBeep()}
            className="w-full bg-slate-800 hover:bg-blue-600 text-white font-extrabold text-xs py-2 px-3 rounded-xl border border-slate-700 hover:border-blue-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
            <span>🧭 Ouvrir l'itinéraire GPS</span>
          </a>

        </div>

        {/* COLONNE 3 (lg:col-span-4) — NUAGE DE CATÉGORIES EN PILULES BLEUES & BLANCHES */}
        <div className="lg:col-span-4 bg-slate-850 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4 text-left">
          
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wide">
                  🗂️ Explorer nos Rayons
                </h4>
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                Accès Immédiat
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium pl-9 leading-snug">
              Cliquez sur un univers pour filtrer la boutique en 0ms
            </p>
          </div>

          {/* Nuage de Pilules Bleues & Blanches */}
          <div className="flex flex-wrap gap-2 max-h-[260px] overflow-y-auto pr-1">
            {dynamicCategories.map((cat, idx) => (
              <button
                key={`${cat.name}_${idx}`}
                type="button"
                onClick={() => handleCategoryClick(cat.name)}
                className="bg-white hover:bg-blue-600 text-slate-800 hover:text-white border border-blue-200 hover:border-blue-600 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 group shrink-0"
              >
                <span>{cat.icon}</span>
                <span className="font-extrabold">{cat.name.replace(/^[🌟⚡🔥🏷️]\s*/, '')}</span>
                {cat.count !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 group-hover:bg-blue-700 text-slate-600 group-hover:text-white font-mono">
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Garanties Bas de Colonne */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>Livraison Partout en 24h</span>
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Colis Vérifié</span>
            </span>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. BARRE INFÉRIEURE : RÉSEAUX SOCIAUX & LOGOS DES MOYENS DE PAIEMENT */}
      {/* ========================================================================= */}
      <div className="border-t border-slate-800 py-8 px-4 lg:px-8 max-w-[1380px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 text-xs">
        
        {/* RANGÉE DES RÉSEAUX SOCIAUX AVEC LABELS */}
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
          {/* WhatsApp */}
          <a
            href={socialLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapBeep()}
            className="px-3 py-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>WhatsApp Direct</span>
          </a>

          {/* TikTok */}
          <a
            href={socialLinks.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapBeep()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>🎵</span>
            <span>TikTok</span>
          </a>

          {/* Facebook */}
          <a
            href={socialLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapBeep()}
            className="px-3 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-800/80 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>👥</span>
            <span>Facebook</span>
          </a>

          {/* Instagram */}
          <a
            href={socialLinks.instagram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapBeep()}
            className="px-3 py-1.5 rounded-xl bg-pink-950/60 hover:bg-pink-600 text-pink-400 hover:text-white border border-pink-800/80 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>📸</span>
            <span>Instagram</span>
          </a>

          {/* YouTube */}
          <a
            href={socialLinks.youtube}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapBeep()}
            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-800/80 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>▶️</span>
            <span>YouTube</span>
          </a>
        </div>

        {/* BANDEAU COMPLET DES LOGOS DES MOYENS DE PAIEMENT */}
        {config.paymentIconsVisible !== false && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Orange Money */}
          <div className="px-2.5 py-1 rounded-lg bg-[#FF7900] text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Orange Money</span>
          </div>

          {/* Wave Mobile Money */}
          <div className="px-2.5 py-1 rounded-lg bg-[#1DA1F2] text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="text-[10px]">🌊</span>
            <span>Wave</span>
          </div>

          {/* MTN MoMo / Moov Money */}
          <div className="px-2.5 py-1 rounded-lg bg-[#FFCC00] text-slate-900 text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            <span>MTN / Moov</span>
          </div>

          {/* Paiement Cash à la Livraison (COD) */}
          <div className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span>💵</span>
            <span>Cash à la Livraison</span>
          </div>

          {/* Visa / Mastercard */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-950 text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default border border-slate-800">
            <span className="text-blue-400 font-extrabold italic text-[10px]">VISA</span>
            <span className="text-slate-400">/</span>
            <span className="text-rose-400 font-extrabold text-[10px]">Mastercard</span>
          </div>
        </div>
        )}

      </div>

      {/* LIENS LÉGAUX & SUIVI DE COMMANDE DANS LE COCKPIT */}
      <div className="border-t border-slate-850/80 py-3.5 px-4 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs text-slate-400 font-bold">
        <button
          type="button"
          onClick={() => openStoreLegalModal('terms')}
          className="hover:text-blue-400 transition cursor-pointer"
        >
          📋 Conditions Générales
        </button>
        <span className="text-slate-700">•</span>
        <button
          type="button"
          onClick={() => openStoreLegalModal('shipping')}
          className="hover:text-blue-400 transition cursor-pointer"
        >
          🚚 Expédition &amp; Retours
        </button>
        <span className="text-slate-700">•</span>
        <button
          type="button"
          onClick={() => openStoreLegalModal('privacy')}
          className="hover:text-blue-400 transition cursor-pointer"
        >
          🔒 Confidentialité
        </button>
        <span className="text-slate-700">•</span>
        <button
          type="button"
          onClick={() => openStoreLegalModal('tracking')}
          className="text-blue-400 hover:text-blue-300 font-black transition cursor-pointer flex items-center gap-1"
        >
          <span>📦 Suivre ma Commande</span>
        </button>
      </div>

      {/* COPYRIGHT OFFICIEL */}
      <div className="border-t border-slate-850 py-4 px-4 text-center text-xs text-slate-500 font-medium">
        {config.copyrightText || (
          <>© {new Date().getFullYear()} <strong className="text-slate-300">{storeName}</strong>. Tous droits réservés • Propulsé avec sécurité par <strong className="text-blue-400 font-black">Nanasore™ OS</strong></>
        )}
      </div>

    </footer>
  );
};

export default ConversionCommandFooter;
