import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Upload, 
  Check, 
  Radio, 
  Layers, 
  Flame, 
  Video, 
  Clock, 
  Share2, 
  MessageCircle, 
  Phone, 
  Tag, 
  Save, 
  AlertCircle,
  Eye,
  Wand2,
  ExternalLink,
  Palette,
  Plus,
  Trash2,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { ThemeCustomizationConfig } from '../../../../types';
import { StoreProductItem } from './types';
import { playTapBeep } from '../../../../utils/audio';
import { SIX_PREMIUM_HEADERS } from './headers/AdaptiveHeaderEngine';
import { THREE_PREMIUM_FOOTERS } from './footers/AdaptiveFooterEngine';

export interface ThemeCustomizerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThemeCustomizationConfig;
  onChange: (updated: ThemeCustomizationConfig) => void;
  savedConfig: ThemeCustomizationConfig;
  hasUnsavedChanges: boolean;
  products: StoreProductItem[];
  onReset: () => void;
  onPublish: () => Promise<void> | void;
  isPublishing?: boolean;
  activeThemeId?: string;
  initialOpenAccordion?: number | null;
}

const PRESET_ACCENT_COLORS = [
  { name: 'Bleu Nanasore', value: '#2563EB' },
  { name: 'Émeraude Botanique', value: '#0F4C3A' },
  { name: 'Electro Orange', value: '#FF6A00' },
  { name: 'Violet Royal', value: '#7C3AED' },
  { name: 'Or Champagne', value: '#C59B27' },
  { name: 'Noir Carbone', value: '#0F172A' }
];

const ANNOUNCEMENT_SUGGESTIONS = [
  "🚚 Livraison express 24h & Paiement à la réception",
  "⚡ Vente Flash exceptionnelle aujourd'hui seulement",
  "🔒 Paiement sécurisé Wave, Orange Money & Cash"
];

export const ThemeCustomizerSidebar: React.FC<ThemeCustomizerSidebarProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  hasUnsavedChanges,
  products = [],
  onReset,
  onPublish,
  isPublishing = false,
  initialOpenAccordion
}) => {
  // Gestion de l'accordéon ouvert (1 seul à la fois pour un workflow fluide)
  const [openAccordion, setOpenAccordion] = useState<number | null>(initialOpenAccordion ?? 1);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const heroImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialOpenAccordion !== undefined && initialOpenAccordion !== null) {
      setOpenAccordion(initialOpenAccordion);
    }
  }, [initialOpenAccordion]);

  if (!isOpen) return null;

  const toggleAccordion = (index: number) => {
    playTapBeep();
    setOpenAccordion(prev => prev === index ? null : index);
  };

  const updateField = <K extends keyof ThemeCustomizationConfig>(key: K, value: ThemeCustomizationConfig[K]) => {
    onChange({
      ...config,
      [key]: value
    });
  };

  const updateSocialLink = (network: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'whatsapp', value: string) => {
    onChange({
      ...config,
      socialLinks: {
        ...(config.socialLinks || {}),
        [network]: value
      }
    });
  };

  const currentNavLinks = config.navLinks || [
    { label: 'Boutique', href: '#catalog' },
    { label: 'Garantie VIP', href: '#trust' },
    { label: 'Contact', href: '#contact' }
  ];

  const handleAddNavLink = () => {
    playTapBeep();
    const updated = [...currentNavLinks, { label: 'Nouveau lien', href: '#catalog' }];
    updateField('navLinks', updated);
  };

  const handleUpdateNavLink = (index: number, field: 'label' | 'href', value: string) => {
    const updated = currentNavLinks.map((item, i) => i === index ? { ...item, [field]: value } : item);
    updateField('navLinks', updated);
  };

  const handleRemoveNavLink = (index: number) => {
    playTapBeep();
    const updated = currentNavLinks.filter((_, i) => i !== index);
    updateField('navLinks', updated);
  };

  // Sélecteur Magique "⚡ Auto-Remplir depuis un Produit"
  const handleAutoFillFromProduct = (productId: string) => {
    playTapBeep();
    if (!productId) return;
    const selected = products.find(p => p.id === productId);
    if (!selected) return;

    onChange({
      ...config,
      heroTitle: selected.name,
      heroDescription: selected.description || "Découvrez notre produit d'exception, conçu pour une expérience unique au meilleur prix garanti.",
      heroBannerImageUrl: selected.image || config.heroBannerImageUrl,
      heroPriceHighlight: selected.price ? `${selected.price.toLocaleString('fr-FR')} FCFA` : undefined,
      heroLinkedProductId: selected.id,
      heroCtaText: "Commander maintenant"
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateField('logoUrl', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateField('heroBannerImageUrl', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <aside 
      className="w-full md:w-[360px] lg:w-[380px] shrink-0 h-[calc(100vh-64px)] bg-white border-r border-slate-200 flex flex-col shadow-2xl z-40 transition-all select-none text-slate-900 animate-in slide-in-from-left duration-200"
      aria-label="Studio de personnalisation de la vitrine"
    >
      {/* 1. En-tête du Panneau */}
      <div className="h-16 px-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-blue-100 text-blue-700">
              <Palette className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Studio de Personnalisation
            </h2>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-700">
              Modifications en temps réel (0ms)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
          title="Fermer le Customizer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Corps Scrollable structuré en Accordéons */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
        
        {/* ========================================================================= */}
        {/* SECTION 👑 : SÉLECTEUR VISUEL DES 6 EN-TÊTES PREMIUM (0ms APERÇU) */}
        {/* ========================================================================= */}
        <div className="p-4 bg-gradient-to-b from-blue-50 to-white border-b border-blue-100">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">👑</span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Style d'En-Tête (6 Modèles Premium)
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs">
              0ms APERÇU
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SIX_PREMIUM_HEADERS.map((h) => {
              const isActive = (config.headerStyle || 'mega_hub_marketplace') === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onChange({
                      ...config,
                      headerStyle: h.id
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/40'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-base">{h.icon}</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {h.badge}
                    </span>
                  </div>
                  <span className={`text-xs font-black mt-1.5 block ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {h.title}
                  </span>
                  <span className={`text-[10px] mt-0.5 leading-tight line-clamp-1 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                    {h.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ACCORDÉON 1 : 🏷️ Identité, Logo & Barre d'annonce */}
        {/* ========================================================================= */}
        <div className="bg-white">
          <button
            type="button"
            onClick={() => toggleAccordion(1)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🏷️</span>
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Identité, Logo & Barre d'annonce
                </span>
                <span className="text-[10px] text-slate-500">
                  Logo, marque, contact WhatsApp & bandeau supérieur
                </span>
              </div>
            </div>
            {openAccordion === 1 ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openAccordion === 1 && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-50 animate-in fade-in duration-150">
              {/* Toggle switch : Barre d'annonce supérieure */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    Barre d'annonce supérieure
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.announcementBarEnabled ?? true}
                      onChange={(e) => updateField('announcementBarEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {(config.announcementBarEnabled ?? true) && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Texte du bandeau défilant :
                    </label>
                    <input
                      type="text"
                      value={config.announcementBarText || ''}
                      onChange={(e) => updateField('announcementBarText', e.target.value)}
                      placeholder="🔥 Livraison Express & Paiement Mobile Money à la livraison !"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />

                    {/* Suggestions rapides cliquables */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-medium">Suggestions rapides :</span>
                      <div className="flex flex-col gap-1">
                        {ANNOUNCEMENT_SUGGESTIONS.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              updateField('announcementBarText', sug);
                            }}
                            className="text-left text-[11px] px-2 py-1 rounded bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 transition text-slate-600 truncate"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nom & Slogan de la boutique */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nom de la boutique :
                  </label>
                  <input
                    type="text"
                    value={config.storeName || ''}
                    onChange={(e) => updateField('storeName', e.target.value)}
                    placeholder="Ex: Émeraude Prestige Parfums"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Slogan / Accroche :
                  </label>
                  <input
                    type="text"
                    value={config.storeTagline || ''}
                    onChange={(e) => updateField('storeTagline', e.target.value)}
                    placeholder="Ex: Cosmétiques & Soins Haute Couture"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Logo de la boutique */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Logo de la boutique :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.logoUrl || ''}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                    placeholder="https://... ou téléversez un logo"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none truncate"
                  />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                    title="Téléverser un logo"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
                {config.logoUrl && (
                  <div className="mt-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 inline-flex items-center gap-2">
                    <img src={config.logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain bg-white border border-slate-200" />
                    <span className="text-[10px] text-slate-500">Aperçu logo actif</span>
                  </div>
                )}
              </div>

              {/* Contact WhatsApp & Support */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                    Numéro WhatsApp :
                  </label>
                  <input
                    type="tel"
                    value={config.whatsappNumber || ''}
                    onChange={(e) => updateField('whatsappNumber', e.target.value)}
                    placeholder="+225 07 00 00 00"
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-blue-600" />
                    Tél Support :
                  </label>
                  <input
                    type="tel"
                    value={config.supportPhone || ''}
                    onChange={(e) => updateField('supportPhone', e.target.value)}
                    placeholder="+225 05 00 00 00"
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Couleur d'accent principale & Fond d'en-tête */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Couleur d'accent de marque :
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    {PRESET_ACCENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          updateField('primaryAccentColor', c.value);
                        }}
                        style={{ backgroundColor: c.value }}
                        className={`w-6 h-6 rounded-full border-2 transition transform hover:scale-110 cursor-pointer ${
                          config.primaryAccentColor === c.value ? 'border-blue-600 ring-2 ring-blue-400 ring-offset-1' : 'border-white shadow-xs'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={config.primaryAccentColor || '#0F4C3A'}
                    onChange={(e) => updateField('primaryAccentColor', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    title="Choisir une couleur libre"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Couleur de fond de l'en-tête (Header Bg - optionnel) :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.headerBgColor || ''}
                    onChange={(e) => updateField('headerBgColor', e.target.value)}
                    placeholder="Par défaut du thème (ou ex: #0F4C3A / #FFFFFF)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                  <input
                    type="color"
                    value={config.headerBgColor || '#FFFFFF'}
                    onChange={(e) => updateField('headerBgColor', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    title="Couleur de fond du Header"
                  />
                  {config.headerBgColor && (
                    <button
                      type="button"
                      onClick={() => updateField('headerBgColor', '')}
                      className="text-[10px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
                    >
                      Auto
                    </button>
                  )}
                </div>
              </div>

              {/* Liens de Navigation du Menu */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Liens du Menu de Navigation ({currentNavLinks.length}) :
                  </label>
                  <button
                    type="button"
                    onClick={handleAddNavLink}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ajouter un lien</span>
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {currentNavLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => handleUpdateNavLink(idx, 'label', e.target.value)}
                        placeholder="Libellé (ex: Boutique)"
                        className="w-1/2 px-2 py-1 text-xs rounded border border-slate-200 bg-white focus:border-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        value={link.href || ''}
                        onChange={(e) => handleUpdateNavLink(idx, 'href', e.target.value)}
                        placeholder="#catalog ou URL"
                        className="w-1/2 px-2 py-1 text-xs rounded border border-slate-200 bg-white focus:border-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNavLink(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Supprimer ce lien"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ACCORDÉON 2 : 🖼️ Grande Bannière d'Accueil (Hero) */}
        {/* ========================================================================= */}
        <div className="bg-white">
          <button
            type="button"
            onClick={() => toggleAccordion(2)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🖼️</span>
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Grande Bannière d'Accueil (Hero)
                </span>
                <span className="text-[10px] text-slate-500">
                  Titre H1, visuel principal, offre vedette & bouton CTA
                </span>
              </div>
            </div>
            {openAccordion === 2 ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openAccordion === 2 && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-50 animate-in fade-in duration-150">
              {/* Sélecteur Magique "⚡ Auto-Remplir depuis un Produit" */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <Wand2 className="w-4 h-4 text-amber-600" />
                  <span>Sélecteur Magique ⚡ Auto-Remplir</span>
                </div>
                <p className="text-[10px] text-amber-800 leading-snug">
                  Choisissez un produit pour pré-remplir instantanément le titre, l'image et lier le bouton d'action :
                </p>
                <select
                  defaultValue=""
                  onChange={(e) => handleAutoFillFromProduct(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <option value="" disabled>-- Sélectionner un produit vedette --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price ? `${p.price.toLocaleString('fr-FR')} F` : '0 F'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Accroche supérieure (heroSubtitle) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Accroche Supérieure (Badge / Subtitle) :
                </label>
                <input
                  type="text"
                  value={config.heroSubtitle || ''}
                  onChange={(e) => updateField('heroSubtitle', e.target.value)}
                  placeholder="Ex: COLLECTION PRESTIGE 2026"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Grand Titre H1 (heroTitle) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Grand Titre H1 Principal :
                </label>
                <input
                  type="text"
                  value={config.heroTitle || ''}
                  onChange={(e) => updateField('heroTitle', e.target.value)}
                  placeholder="Ex: L'Excellence & Le Bien-Être au Quotidien"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-semibold"
                />
              </div>

              {/* Description du Hero (heroDescription) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description / Sous-titre :
                </label>
                <textarea
                  rows={2}
                  value={config.heroDescription || ''}
                  onChange={(e) => updateField('heroDescription', e.target.value)}
                  placeholder="Formules exclusives enrichies en actifs naturels d'Afrique de l'Ouest..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Prix mis en avant & Texte du Bouton */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Prix mis en avant :
                  </label>
                  <input
                    type="text"
                    value={config.heroPriceHighlight || ''}
                    onChange={(e) => updateField('heroPriceHighlight', e.target.value)}
                    placeholder="À partir de 15.000 F"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Texte du Bouton CTA :
                  </label>
                  <input
                    type="text"
                    value={config.heroCtaText || ''}
                    onChange={(e) => updateField('heroCtaText', e.target.value)}
                    placeholder="Découvrir l'offre"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Image de la bannière Hero */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Image de la bannière Hero :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.heroBannerImageUrl || ''}
                    onChange={(e) => updateField('heroBannerImageUrl', e.target.value)}
                    placeholder="https://... (URL de l'image)"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none truncate"
                  />
                  <input
                    ref={heroImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeroImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => heroImageInputRef.current?.click()}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                    title="Téléverser une image Hero"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
                {config.heroBannerImageUrl && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 h-24 bg-slate-100">
                    <img 
                      src={config.heroBannerImageUrl} 
                      alt="Hero preview" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                      <span className="text-[10px] text-white font-semibold truncate">
                        {config.heroTitle || 'Bannière active'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Produit cible du bouton CTA & Vidéo / Lien CTA */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Produit cible ouvert au clic sur le CTA :
                </label>
                <select
                  value={config.heroLinkedProductId || ''}
                  onChange={(e) => updateField('heroLinkedProductId', e.target.value || null)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Aucun (Défilement vers catalogue) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price ? `${p.price.toLocaleString('fr-FR')} F` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Lien URL CTA (optionnel) :
                  </label>
                  <input
                    type="text"
                    value={config.heroCtaUrl || ''}
                    onChange={(e) => updateField('heroCtaUrl', e.target.value)}
                    placeholder="#catalog ou https://..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Vidéo Hero (MP4/URL) :
                  </label>
                  <input
                    type="url"
                    value={config.heroVideoUrl || ''}
                    onChange={(e) => updateField('heroVideoUrl', e.target.value)}
                    placeholder="https://...mp4"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Sous-bannières secondaires */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="block text-[11px] font-black text-slate-800 uppercase tracking-wide">
                  Bannières Secondaires & Titres de Sections :
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={config.subBanner1Title || ''}
                    onChange={(e) => updateField('subBanner1Title', e.target.value)}
                    placeholder="Titre Sous-bannière 1"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={config.subBanner1Subtitle || ''}
                    onChange={(e) => updateField('subBanner1Subtitle', e.target.value)}
                    placeholder="Sous-titre Bannière 1"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={config.subBanner2Title || ''}
                    onChange={(e) => updateField('subBanner2Title', e.target.value)}
                    placeholder="Titre Sous-bannière 2"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={config.subBanner2Subtitle || ''}
                    onChange={(e) => updateField('subBanner2Subtitle', e.target.value)}
                    placeholder="Sous-titre Bannière 2"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ACCORDÉON 3 : 🛍️ Grille Produits & Catalogue */}
        {/* ========================================================================= */}
        <div className="bg-white">
          <button
            type="button"
            onClick={() => toggleAccordion(3)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🛍️</span>
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Grille Produits & Catalogue
                </span>
                <span className="text-[10px] text-slate-500">
                  Titres de section, produit vedette & compte à rebours
                </span>
              </div>
            </div>
            {openAccordion === 3 ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openAccordion === 3 && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-50 animate-in fade-in duration-150">
              {/* Titre et Sous-titre de la Grille Catalogue */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Titre de la section Catalogue :
                  </label>
                  <input
                    type="text"
                    value={config.catalogTitle || ''}
                    onChange={(e) => updateField('catalogTitle', e.target.value)}
                    placeholder="Ex: Notre Sélection Exclusive (ou Tous nos Produits)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sous-titre / Accroche du Catalogue :
                  </label>
                  <input
                    type="text"
                    value={config.catalogSubtitle || ''}
                    onChange={(e) => updateField('catalogSubtitle', e.target.value)}
                    placeholder="Ex: Commandez aujourd'hui et payez à la livraison"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Sélecteur du Produit Vedette */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  🎯 Produit en Offre Spéciale / Vedette :
                </label>
                <select
                  value={config.specialOfferProductId || ''}
                  onChange={(e) => updateField('specialOfferProductId', e.target.value || null)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Aucun produit vedette spécifié --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} • {p.price ? `${p.price.toLocaleString('fr-FR')} FCFA` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Durée du Compte à Rebours */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Durée du Compteur Flash :
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[6, 12, 24, 48].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        updateField('specialOfferCountdownHours', hours);
                      }}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition text-center cursor-pointer ${
                        (config.specialOfferCountdownHours ?? 24) === hours
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Texte du badge d'économie */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Badge d'économie / Réduction :
                </label>
                <input
                  type="text"
                  value={config.specialOfferSaveBadgeText || ''}
                  onChange={(e) => updateField('specialOfferSaveBadgeText', e.target.value)}
                  placeholder="Ex: Économisez 10.000 F ou -30% Aujourd'hui"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ACCORDÉON 4 : 🛡️ Réassurance, Garanties & Preuve Sociale */}
        {/* ========================================================================= */}
        <div className="bg-white">
          <button
            type="button"
            onClick={() => toggleAccordion(4)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🛡️</span>
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Réassurance, Garanties & Preuve Sociale
                </span>
                <span className="text-[10px] text-slate-500">
                  Piliers de confiance, alertes d'achat et streaming
                </span>
              </div>
            </div>
            {openAccordion === 4 ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openAccordion === 4 && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-50 animate-in fade-in duration-150">
              {/* Badges de Réassurance personnalisables */}
              <div className="space-y-2">
                <span className="block text-[11px] font-bold text-slate-700">
                  Piliers de Réassurance & Garanties (1 à 4) :
                </span>
                
                {/* Pilier 1 */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pilier 1 (Livraison)</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={config.reassurance1Title || ''}
                      onChange={(e) => updateField('reassurance1Title', e.target.value)}
                      placeholder="Titre 1 (Ex: Livraison Express 24/48h)"
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    />
                    <input
                      type="text"
                      value={config.reassurance1Desc || ''}
                      onChange={(e) => updateField('reassurance1Desc', e.target.value)}
                      placeholder="Description 1 (Ex: Partout en Côte d'Ivoire)"
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Pilier 2 */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pilier 2 (Paiement)</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={config.reassurance2Title || ''}
                      onChange={(e) => updateField('reassurance2Title', e.target.value)}
                      placeholder="Titre 2 (Ex: Paiement à la réception)"
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    />
                    <input
                      type="text"
                      value={config.reassurance2Desc || ''}
                      onChange={(e) => updateField('reassurance2Desc', e.target.value)}
                      placeholder="Description 2 (Ex: Wave, Orange Money ou Espèces)"
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Pilier 3 */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pilier 3 (Garantie / Qualité)</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={config.reassurance3Title || ''}
                      onChange={(e) => updateField('reassurance3Title', e.target.value)}
                      placeholder="Titre 3 (Ex: Garantie 100% Satisfait)"
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    />
                    <input
                      type="text"
                      value={config.reassurance3Desc || ''}
                      onChange={(e) => updateField('reassurance3Desc', e.target.value)}
                      placeholder="Description 3 (Ex: Retours faciles sous 7 jours)"
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Pilier 4 */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pilier 4 (Support Client)</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={config.reassurance4Title || ''}
                      onChange={(e) => updateField('reassurance4Title', e.target.value)}
                      placeholder="Titre 4 (Ex: Support Réactif 7j/7)"
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    />
                    <input
                      type="text"
                      value={config.reassurance4Desc || ''}
                      onChange={(e) => updateField('reassurance4Desc', e.target.value)}
                      placeholder="Description 4 (Ex: Assistance WhatsApp directe)"
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Toggle switch : Preuve sociale d'achat en direct */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">
                    Bulle de preuve sociale en direct
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Affiche des alertes "Moussa vient d'acheter..."
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableLiveSalesPopup ?? true}
                    onChange={(e) => updateField('enableLiveSalesPopup', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* URL Vidéo Live & Statut */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-rose-600" />
                  Lien Vidéo Live / Webinaire :
                </label>
                <input
                  type="url"
                  value={config.liveStreamVideoUrl || ''}
                  onChange={(e) => updateField('liveStreamVideoUrl', e.target.value)}
                  placeholder="https://youtube.com/live/... ou MP4"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />

                {/* Statut du Stream */}
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Statut de la session :
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['live', 'upcoming', 'replay'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          updateField('liveStreamStatus', st);
                        }}
                        className={`py-1.5 px-1 text-[11px] font-bold rounded-lg border transition cursor-pointer text-center ${
                          (config.liveStreamStatus || 'upcoming') === st
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st === 'live' && '🔴 En direct'}
                        {st === 'upcoming' && '🗓️ Programmé'}
                        {st === 'replay' && '▶️ Replay VIP'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ACCORDÉON 5 : ⚓ Pied de Page (Footer) & Contact */}
        {/* ========================================================================= */}
        <div className="bg-white">
          <button
            type="button"
            onClick={() => toggleAccordion(5)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">⚓</span>
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Pied de Page (Footer) & Contact
                </span>
                <span className="text-[10px] text-slate-500">
                  Modèles de footer, coordonnées, réseaux sociaux et mentions légales
                </span>
              </div>
            </div>
            {openAccordion === 5 ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openAccordion === 5 && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-50 animate-in fade-in duration-150">
              {/* SÉLECTEUR VISUEL DES 3 FOOTERS PREMIUM (0ms APERÇU) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">⚓</span>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      Modèle de Pied de Page (3 Styles)
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                    0ms APERÇU
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {THREE_PREMIUM_FOOTERS.map((f) => {
                    const isActive = (config.footerStyle || 'bento_map_trust_footer') === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          updateField('footerStyle', f.id);
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('nana_change_footer_style', { detail: { style: f.id } }));
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/40'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span className="text-base">{f.icon}</span>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded ${
                            isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {f.badge}
                          </span>
                        </div>
                        <span className={`text-xs font-black mt-1.5 block ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {f.title}
                        </span>
                        <span className={`text-[10px] mt-0.5 leading-tight line-clamp-2 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                          {f.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer : Titre E-mailing / Newsletter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Titre / Accroche Newsletter E-mail :
                </label>
                <input
                  type="text"
                  value={config.footerNewsletterTitle || ''}
                  onChange={(e) => updateField('footerNewsletterTitle', e.target.value)}
                  placeholder="Rejoignez le Cercle Privé VIP (ou Alerte Nouveautés)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Footer : Ville & Adresse */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Adresse & Ville de la boutique :
                </label>
                <input
                  type="text"
                  value={config.footerAddress || ''}
                  onChange={(e) => updateField('footerAddress', e.target.value)}
                  placeholder="Abidjan, Cocody Riviera Palmeraie"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Footer : Coordonnées de Contact */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                    WhatsApp Footer :
                  </label>
                  <input
                    type="tel"
                    value={config.whatsappNumber || ''}
                    onChange={(e) => updateField('whatsappNumber', e.target.value)}
                    placeholder="+225 07 00 00 00"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-blue-600" />
                    Support Tél Footer :
                  </label>
                  <input
                    type="tel"
                    value={config.supportPhone || ''}
                    onChange={(e) => updateField('supportPhone', e.target.value)}
                    placeholder="+225 05 00 00 00"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Footer : Texte À Propos */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Texte À Propos du Pied de Page :
                </label>
                <textarea
                  rows={2}
                  value={config.footerAboutText || ''}
                  onChange={(e) => updateField('footerAboutText', e.target.value)}
                  placeholder="Notre boutique s'engage sur l'authenticité et la satisfaction client..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Footer : Copyright & Icônes de Paiement */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Texte Copyright (Pied de page) :
                  </label>
                  <input
                    type="text"
                    value={config.copyrightText || ''}
                    onChange={(e) => updateField('copyrightText', e.target.value)}
                    placeholder={`© ${new Date().getFullYear()} ${config.storeName || 'Ma Boutique'} • Tous droits réservés`}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">
                    Afficher les badges de paiement (Wave / OM / Visa)
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.paymentIconsVisible ?? true}
                      onChange={(e) => updateField('paymentIconsVisible', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Liens Réseaux Sociaux */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="block text-[11px] font-bold text-slate-700">
                  Réseaux Sociaux :
                </span>
                <input
                  type="text"
                  value={config.socialLinks?.whatsapp || ''}
                  onChange={(e) => updateSocialLink('whatsapp', e.target.value)}
                  placeholder="Lien WhatsApp ou Numéro (+225...)"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-300 focus:border-emerald-500 outline-none bg-emerald-50/30"
                />
                <input
                  type="url"
                  value={config.socialLinks?.facebook || ''}
                  onChange={(e) => updateSocialLink('facebook', e.target.value)}
                  placeholder="Page Facebook (URL)"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                />
                <input
                  type="url"
                  value={config.socialLinks?.instagram || ''}
                  onChange={(e) => updateSocialLink('instagram', e.target.value)}
                  placeholder="Compte Instagram (URL)"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-500 outline-none"
                />
                <input
                  type="url"
                  value={config.socialLinks?.tiktok || ''}
                  onChange={(e) => updateSocialLink('tiktok', e.target.value)}
                  placeholder="Compte TikTok (URL)"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                />
                <input
                  type="url"
                  value={config.socialLinks?.youtube || ''}
                  onChange={(e) => updateSocialLink('youtube', e.target.value)}
                  placeholder="Chaîne YouTube (URL)"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Pied de Panneau Sticky */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onReset();
          }}
          disabled={!hasUnsavedChanges || isPublishing}
          className={`px-3 py-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
            hasUnsavedChanges && !isPublishing
              ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
          }`}
          title="Réinitialiser aux dernières valeurs enregistrées"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Réinitialiser</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onPublish();
          }}
          disabled={isPublishing}
          className={`flex-1 py-3 px-4 rounded-xl text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            isPublishing
              ? 'bg-blue-400 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-600/30 ring-1 ring-blue-400'
          }`}
        >
          {isPublishing ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Publication...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>💾 Publier sur nsore.shop</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default ThemeCustomizerSidebar;
