import React, { useState, useMemo, useCallback } from 'react';
import { 
  Mail, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Clock, 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  Copy,
  Check,
  Navigation,
  Plus,
  Minus
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../../types';
import { StoreProductItem } from '../types';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';
import { openStoreLegalModal } from '../StoreLegalAndTrackingModals';

export interface EditorialPrestigeFooterProps {
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

// Coordonnées GPS des principales métropoles africaines
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

export const EditorialPrestigeFooter: React.FC<EditorialPrestigeFooterProps> = ({
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

  // Formulaire Newsletter Privilège
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [promoCodeCopied, setPromoCodeCopied] = useState<boolean>(false);

  // Zoom interactif de la Mini-Map Showroom
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Nom de la boutique / maison
  const storeName = useMemo(() => {
    return config.storeName || 'Maison Officielle Nanasore';
  }, [config.storeName]);

  // Numéro WhatsApp pour conciergerie
  const cleanPhone = useMemo(() => {
    const raw = config.whatsappNumber || config.supportPhone || '+225 07 00 00 00 00';
    return raw.replace(/[^0-9]/g, '');
  }, [config.whatsappNumber, config.supportPhone]);

  // Numéro Hotline affiché
  const phoneDisplay = useMemo(() => {
    return config.supportPhone || config.whatsappNumber || '+226 / +225 Service Client';
  }, [config.supportPhone, config.whatsappNumber]);

  // Adresse showroom / boutique
  const sellerAddress = useMemo(() => {
    return config.footerAddress || config.footerMapCity || 'Boutique Showroom, Centre-Ville & Expéditions Express';
  }, [config.footerAddress, config.footerMapCity]);

  // Liens Réseaux Sociaux Cerclés
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

  // Coordonnées GPS pour le showroom
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

  // Extraction dynamique des catégories
  const dynamicCategories = useMemo(() => {
    const catsSet = new Set<string>();
    (categories || []).forEach(c => {
      if (c && c.trim()) catsSet.add(c.trim());
    });
    (products || []).forEach(p => {
      if (p.category && p.category.trim()) catsSet.add(p.category.trim());
    });

    const list: string[] = ['Tous les produits', 'Nouveautés & Arrivages', 'Sélection Vedette'];
    catsSet.forEach(cat => {
      if (!list.includes(cat)) {
        list.push(cat);
      }
    });

    return list;
  }, [categories, products]);

  // Soumission Newsletter
  const handleNewsletterSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;

    playValidationBeep();
    setIsSubscribed(true);

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nana_newsletter_subscribers');
        const list = stored ? JSON.parse(stored) : [];
        list.push({ email: newsletterEmail, source: 'editorial_vip', date: new Date().toISOString() });
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

  // Clic sur catégorie
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

  return (
    <footer className={`w-full bg-white text-slate-900 border-t border-blue-100 select-none ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. BANDEAU SUPÉRIEUR CENTRÉ : LA BARRE D'E-MAILING "CLUB PRIVILÈGE" */}
      {/* ========================================================================= */}
      <div className="bg-white border-y border-blue-100 py-12 sm:py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-3">
          
          {/* Sur-titre en lettres espacées Bleues */}
          <span className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 block">
            ✨ REJOIGNEZ LA COMMUNAUTÉ {storeName.toUpperCase()}
          </span>

          {/* Grand Titre Éditorial */}
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            {config.footerNewsletterTitle || 'Inscrivez-vous à notre Newsletter Privée'}
          </h3>

          {/* Sous-titre */}
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed font-medium">
            {config.footerNewsletterSubtitle || 'Soyez informé(e) en premier de nos nouveaux arrivages, ventes privées et conseils exclusifs.'}
          </p>

          {/* Barre de Souscription Minimaliste & Chic */}
          {!isSubscribed ? (
            <form onSubmit={handleNewsletterSubmit} className="max-w-lg mx-auto mt-6 pt-2">
              <div className="flex items-center border-b-2 border-blue-600 pb-2 transition-colors focus-within:border-blue-700">
                <Mail className="w-5 h-5 text-blue-600 shrink-0 ml-1" />
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Votre adresse e-mail personnelle..."
                  required
                  className="flex-1 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-transparent font-medium"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] sm:text-xs font-extrabold tracking-widest uppercase px-5 sm:px-7 py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/20 shrink-0"
                >
                  S'INSCRIRE →
                </button>
              </div>
              <span className="text-[10px] text-slate-400 block text-left mt-2 pl-1">
                🔒 Vos informations sont strictement confidentielles. Zéro spam garanti.
              </span>
            </form>
          ) : (
            <div className="max-w-lg mx-auto mt-6 p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-left animate-in fade-in space-y-2">
              <div className="flex items-center gap-2 text-blue-800">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="text-xs sm:text-sm font-black">
                  🎉 Bienvenue dans le Club Privé {storeName} !
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Profitez immédiatement de votre privilège d'accueil :
              </p>
              <div className="flex items-center justify-between gap-2 bg-white rounded-xl p-2.5 border border-blue-200">
                <span className="text-xs font-black text-blue-700 tracking-wider">
                  🎁 CODE PRIVILÈGE : VIP15 (-15%)
                </span>
                <button
                  type="button"
                  onClick={handleCopyPromoCode}
                  className="text-[11px] font-bold px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  {promoCodeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{promoCodeCopied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LE CORPS ÉDITORIAL EN 4 COLONNES (INFOS, CATÉGORIES, INFOS & SHOWROOM) */}
      {/* ========================================================================= */}
      <div className="max-w-[1380px] mx-auto py-14 px-4 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
        
        {/* COLONNE 1 (lg:col-span-4) — INFOS DU VENDEUR & RÉSEAUX SOCIAUX */}
        <div className="lg:col-span-4 space-y-6 text-left">
          
          {/* En-tête : Grand Logo ou Nom en capitales espacées */}
          <div className="space-y-2">
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
              <div>
                <h4 className="text-base sm:text-lg font-black uppercase tracking-[0.18em] text-slate-900 leading-tight">
                  {storeName}
                </h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 mt-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  <span>Maison Officielle Vérifiée</span>
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed pt-2">
              {config.footerAboutText || 'Maison de commerce d\'excellence dédiée à l\'authenticité et au raffinement. Sélection exclusive de produits certifiés originaux, conseils personnalisés et livraison sécurisée partout en Afrique de l\'Ouest.'}
            </p>
          </div>

          {/* Coordonnées Directes */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
            <div className="flex items-start gap-2.5 text-slate-600">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="font-medium">{sellerAddress}</span>
            </div>

            <a
              href={`tel:${cleanPhone}`}
              onClick={() => playTapBeep()}
              className="flex items-center gap-2.5 text-slate-700 hover:text-blue-600 transition font-bold"
            >
              <Phone className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Service Client : {phoneDisplay}</span>
            </a>

            <a
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playTapBeep()}
              className="inline-flex items-center gap-2 font-black text-emerald-600 hover:text-emerald-700 transition pt-1"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>💬 Conciergerie WhatsApp Privée →</span>
            </a>
          </div>

          {/* Rangée des Icônes Réseaux Sociaux Cerclées */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">
              Suivez notre actualité :
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Facebook */}
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTapBeep()}
                title="Facebook"
                className="w-10 h-10 rounded-full border border-blue-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
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
                className="w-10 h-10 rounded-full border border-blue-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
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
                className="w-10 h-10 rounded-full border border-blue-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.16 1.18 2.09 2.35 2.28.84.14 1.73-.04 2.44-.54.67-.47 1.09-1.22 1.17-2.03.04-1.48.01-2.96.02-4.44V.02z"/>
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href={socialLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTapBeep()}
                title="WhatsApp"
                className="w-10 h-10 rounded-full border border-blue-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTapBeep()}
                title="YouTube"
                className="w-10 h-10 rounded-full border border-blue-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>

        </div>

        {/* COLONNE 2 (lg:col-span-2) — LISTE DYNAMIQUE DES CATÉGORIES */}
        <div className="lg:col-span-2 text-left space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 pb-2 border-b border-blue-100 flex items-center justify-between">
            <span>CATÉGORIES</span>
            <span className="text-[10px] text-blue-600 font-bold">({dynamicCategories.length})</span>
          </h4>

          <ul className="space-y-2 pt-1">
            {dynamicCategories.map((cat, idx) => (
              <li key={`${cat}_${idx}`}>
                <button
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className="w-full text-left py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:translate-x-1 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <span className="truncate">{cat}</span>
                  <span className="text-[11px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* COLONNE 3 (lg:col-span-2) — SERVICE CLIENT, GARANTIES & SUIVI */}
        <div className="lg:col-span-2 text-left space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 pb-2 border-b border-blue-100">
            INFORMATIONS
          </h4>

          <ul className="space-y-2.5 pt-1 text-xs text-slate-600 font-medium">
            <li>
              <button
                type="button"
                onClick={() => openStoreLegalModal('shipping')}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition cursor-pointer text-left w-full"
              >
                <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Livraison &amp; Retours</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => openStoreLegalModal('terms')}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition cursor-pointer text-left w-full"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Garanties &amp; CGV</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => openStoreLegalModal('privacy')}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition cursor-pointer text-left w-full"
              >
                <span className="text-sm">🔒</span>
                <span>Paiements Sécurisés</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => openStoreLegalModal('tracking')}
                className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 transition cursor-pointer text-left w-full"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>📦 Suivre ma Commande</span>
              </button>
            </li>
            <li className="flex items-center gap-2 text-slate-500 pt-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Assistance VIP 7j/7</span>
            </li>
          </ul>
        </div>

        {/* COLONNE 4 (lg:col-span-4) — NOTRE BOUTIQUE & MINI-MAP ZOOM */}
        <div className="lg:col-span-4 text-left space-y-4">
          <h4 className="text-xs font-extrabold tracking-widest uppercase text-slate-900 mb-4 pb-2 border-b border-blue-100 flex items-center justify-between">
            <span>📍 NOTRE BOUTIQUE & POINT D'EXPÉDITION</span>
            <span className="text-[10px] text-blue-600 font-bold">SHOWROOM</span>
          </h4>

          {/* Cadre Mini-Map avec Zoom Interactif */}
          <div className="rounded-2xl overflow-hidden border-2 border-blue-100 shadow-md relative h-48 bg-slate-100 group">
            {/* Carte OpenStreetMap */}
            <iframe
              title="Showroom Galerie de la Boutique"
              src={osmEmbedUrl}
              className="w-full h-full border-0 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity"
              loading="lazy"
            />

            {/* Repère Bleu Royal (#2563EB) au centre */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-white text-slate-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg border border-blue-200 flex items-center gap-1.5 -translate-y-1 animate-bounce">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span className="max-w-[130px] truncate">{storeName}</span>
              </div>
              <div className="relative flex items-center justify-center mt-0.5">
                <span className="absolute w-6 h-6 rounded-full bg-blue-500 opacity-60 animate-ping" />
                <span className="relative w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
              </div>
            </div>

            {/* Contrôles de Zoom en direct (+ Zoom In / - Zoom Out) flottants en bas à droite */}
            <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur shadow rounded-lg border border-blue-200 flex flex-col overflow-hidden z-10">
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={mapZoom >= 18}
                className="w-7 h-7 bg-white hover:bg-blue-600 text-slate-800 hover:text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors border-b border-blue-100 disabled:opacity-40"
                title="Zoom avant (+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={mapZoom <= 10}
                className="w-7 h-7 bg-white hover:bg-blue-600 text-slate-800 hover:text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40"
                title="Zoom arrière (-)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pastille niveau de zoom en haut à gauche */}
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-[9px] font-bold text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 pointer-events-none">
              Zoom: {mapZoom}x
            </div>
          </div>

          {/* Bandeau inférieur sur la carte : Adresse du vendeur + bouton 📍 Itinéraire */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-slate-700 font-medium truncate">{sellerAddress}</span>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playTapBeep()}
              className="font-bold text-blue-600 hover:underline shrink-0 flex items-center gap-1"
            >
              <span>📍 Itinéraire</span>
              <span className="text-blue-500">→</span>
            </a>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. PIED DE PAGE INFÉRIEUR : LOGOS DES MOYENS DE PAIEMENT & COPYRIGHT */}
      {/* ========================================================================= */}
      <div className="border-t border-slate-100 py-6 px-4 lg:px-8 max-w-[1380px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* À gauche : Copyright & Badge Sécurisé */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
          <span>
            {config.copyrightText || (
              <>© {new Date().getFullYear()} <strong className="text-slate-800 font-bold">{storeName}</strong>. Tous droits réservés.</>
            )}
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>🔒 Boutique Sécurisée</span>
          </span>
        </div>

        {/* Au centre / À droite : Moyens de Paiement */}
        {config.paymentIconsVisible !== false && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1 hidden sm:inline">
            Moyens de paiement acceptés :
          </span>

          {/* Orange Money */}
          <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#FF7900] to-[#E06000] text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Orange Money</span>
          </div>

          {/* Wave Mobile Money */}
          <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#1DA1F2] to-[#0088CC] text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="text-[10px]">🌊</span>
            <span>Wave</span>
          </div>

          {/* MTN MoMo / Moov Money */}
          <div className="px-2.5 py-1 rounded-lg bg-[#FFCC00] text-slate-900 text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            <span>MTN / Moov</span>
          </div>

          {/* Paiement Cash à la Livraison (COD) */}
          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span>💵</span>
            <span>Cash à la Livraison</span>
          </div>

          {/* Visa / Mastercard */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default">
            <span className="text-blue-400 font-extrabold italic text-[10px]">VISA</span>
            <span className="text-slate-400">/</span>
            <span className="text-rose-400 font-extrabold text-[10px]">Mastercard</span>
          </div>
        </div>
        )}

      </div>

    </footer>
  );
};

export default EditorialPrestigeFooter;
