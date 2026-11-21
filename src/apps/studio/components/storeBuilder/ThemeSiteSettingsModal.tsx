import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Globe,
  Search,
  Mail,
  Activity,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Save,
  Sparkles,
  Megaphone,
  ExternalLink,
  Eye,
  Code2,
  FileText,
  Lock
} from 'lucide-react';
import { ThemeCustomizationConfig, ThemeSiteSettings } from '../../../../types';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface ThemeSiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThemeCustomizationConfig;
  storeName: string;
  storeSlug: string;
  onSave: (updatedConfig: ThemeCustomizationConfig) => void;
}

type SettingsTabId = 'general' | 'seo' | 'emailing' | 'tracking' | 'domain_social' | 'legal';

const TABS: { id: SettingsTabId; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
  { id: 'general', label: 'Infos & Contact', icon: Settings, desc: 'Identité, contact, devise, annonce' },
  { id: 'seo', label: 'SEO & Google', icon: Search, desc: 'Meta title, description, OpenGraph' },
  { id: 'emailing', label: 'Collecte Emailing', icon: Mail, desc: 'Newsletter, popup capture & promo' },
  { id: 'tracking', label: 'Pixels & Analytics', icon: Activity, desc: 'Meta, TikTok, GA4, GTM' },
  { id: 'domain_social', label: 'Domaine & Réseaux', icon: Share2, desc: 'Domaine pro & liens sociaux' },
  { id: 'legal', label: 'Légal & Politiques', icon: ShieldCheck, desc: 'CGV, RGPD, retours & cookies' },
];

export const ThemeSiteSettingsModal: React.FC<ThemeSiteSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  storeName,
  storeSlug,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [savedFeedback, setSavedFeedback] = useState(false);

  // État local synchronisé avec config + config.siteSettings
  const [site, setSite] = useState<ThemeSiteSettings>({});
  const [brandName, setBrandName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [footerAddress, setFooterAddress] = useState('');
  const [footerMapCity, setFooterMapCity] = useState('');
  const [copyrightText, setCopyrightText] = useState('');
  const [metaPixelId, setMetaPixelId] = useState('');
  const [tiktokPixelId, setTiktokPixelId] = useState('');
  const [googleTagId, setGoogleTagId] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    whatsapp: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    const s = config.siteSettings || {};
    setBrandName(config.brandName || storeName || '');
    setWhatsappNumber(config.whatsappNumber || '');
    setFooterAddress(config.footerAddress || '');
    setFooterMapCity(config.footerMapCity || '');
    setCopyrightText(config.copyrightText || `© ${new Date().getFullYear()} ${config.brandName || storeName || 'Ma Boutique'}. Tous droits réservés.`);
    setMetaPixelId(config.metaPixelId || '');
    setTiktokPixelId(config.tiktokPixelId || '');
    setGoogleTagId(config.googleTagId || '');
    setSocialLinks({
      facebook: config.socialLinks?.facebook || '',
      instagram: config.socialLinks?.instagram || '',
      tiktok: config.socialLinks?.tiktok || '',
      youtube: config.socialLinks?.youtube || '',
      whatsapp: config.socialLinks?.whatsapp || config.whatsappNumber || '',
    });
    setSite({
      tagline: s.tagline || config.heroSubtitle || '',
      faviconUrl: s.faviconUrl || config.logoUrl || '',
      contactEmail: s.contactEmail || config.footerEmail || '',
      supportPhone: s.supportPhone || config.whatsappNumber || '',
      businessHours: s.businessHours || 'Lun - Sam : 08h00 - 19h00',
      currency: s.currency || 'FCFA',
      announcementEnabled: Boolean(s.announcementEnabled),
      announcementText: s.announcementText || '🚚 Livraison rapide partout • Paiement sécurisé Mobile Money & Cash',

      seoTitle: s.seoTitle || `${config.brandName || storeName || 'Ma Boutique'} — Boutique Officielle`,
      seoDescription: s.seoDescription || config.footerAboutText || 'Découvrez nos meilleurs produits et commandez en ligne en toute sécurité avec livraison rapide.',
      seoKeywords: s.seoKeywords || 'boutique en ligne, achat rapide, livraison, qualité',
      ogImageUrl: s.ogImageUrl || config.heroImageUrl || config.logoUrl || '',
      siteLanguage: s.siteLanguage || 'fr',
      allowIndexing: s.allowIndexing !== false,
      googleSiteVerification: s.googleSiteVerification || '',

      emailCollectionEnabled: s.emailCollectionEnabled !== false,
      emailCollectionTitle: s.emailCollectionTitle || config.footerNewsletterTitle || 'Rejoignez notre Club VIP',
      emailCollectionSubtitle: s.emailCollectionSubtitle || config.footerNewsletterSubtitle || 'Recevez nos offres exclusives, nouveautés et codes promos directement par e-mail.',
      emailCollectionButtonText: s.emailCollectionButtonText || 'S’inscrire gratuitement',
      emailCollectionSuccessMsg: s.emailCollectionSuccessMsg || 'Merci ! Votre inscription est confirmée.',
      emailCollectionPromoCode: s.emailCollectionPromoCode || '',
      emailPopupEnabled: Boolean(s.emailPopupEnabled),
      emailPopupDelaySeconds: typeof s.emailPopupDelaySeconds === 'number' ? s.emailPopupDelaySeconds : 8,
      emailTargetList: s.emailTargetList || 'Newsletter Site Web',

      gtmId: s.gtmId || '',
      customHeadScripts: s.customHeadScripts || '',

      customDomain: s.customDomain || '',
      linkedinUrl: s.linkedinUrl || '',
      twitterUrl: s.twitterUrl || '',

      companyLegalName: s.companyLegalName || config.brandName || storeName || '',
      rccmOrTaxId: s.rccmOrTaxId || '',
      termsText: s.termsText || '',
      privacyPolicyText: s.privacyPolicyText || '',
      shippingReturnPolicyText: s.shippingReturnPolicyText || '',
      cookieBannerEnabled: Boolean(s.cookieBannerEnabled),
    });
  }, [isOpen, config, storeName]);

  if (!isOpen) return null;

  const updateSite = <K extends keyof ThemeSiteSettings>(key: K, value: ThemeSiteSettings[K]) => {
    setSite((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = () => {
    playValidationBeep();
    const updated: ThemeCustomizationConfig = {
      ...config,
      brandName: brandName.trim() || config.brandName,
      whatsappNumber: whatsappNumber.trim(),
      footerEmail: site.contactEmail?.trim() || config.footerEmail,
      footerAddress: footerAddress.trim(),
      footerMapCity: footerMapCity.trim(),
      copyrightText: copyrightText.trim(),
      footerNewsletterTitle: site.emailCollectionTitle?.trim() || config.footerNewsletterTitle,
      footerNewsletterSubtitle: site.emailCollectionSubtitle?.trim() || config.footerNewsletterSubtitle,
      metaPixelId: metaPixelId.trim(),
      tiktokPixelId: tiktokPixelId.trim(),
      googleTagId: googleTagId.trim(),
      socialLinks: {
        ...(config.socialLinks || {}),
        ...socialLinks,
      },
      siteSettings: {
        ...site,
        seoTitle: site.seoTitle?.trim(),
        seoDescription: site.seoDescription?.trim(),
        seoKeywords: site.seoKeywords?.trim(),
        contactEmail: site.contactEmail?.trim(),
        customDomain: site.customDomain?.trim(),
      },
    };
    onSave(updated);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onClose();
    }, 650);
  };

  const seoTitleLen = (site.seoTitle || '').length;
  const seoDescLen = (site.seoDescription || '').length;
  const previewDomain = site.customDomain?.trim() || `nsore.shop/${storeSlug || 'ma-boutique'}`;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                Paramètres du Site Professionnel
              </h2>
              <p className="text-xs text-slate-400 truncate">
                SEO Google, collecte emailing, pixels publicitaires, domaine, contact & mentions légales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body : Navigation gauche + Contenu droite */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar Onglets */}
          <aside className="md:w-64 shrink-0 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800 p-2 sm:p-3 overflow-x-auto md:overflow-y-auto flex md:flex-col gap-1.5 no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all shrink-0 md:w-full cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold leading-tight whitespace-nowrap md:whitespace-normal">
                      {tab.label}
                    </div>
                    <div className={`hidden md:block text-[10px] mt-0.5 truncate ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {tab.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Panneau de contenu */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* ONGLET 1 : INFOS & CONTACT */}
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-400" />
                    Identité & Coordonnées du Site
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Ces informations s’affichent dans l’en-tête, le pied de page, les fiches contact et les factures clients.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Nom officiel du site / boutique</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Ex: Maison Élégance Dakar"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Slogan / Tagline</label>
                    <input
                      type="text"
                      value={site.tagline || ''}
                      onChange={(e) => updateSite('tagline', e.target.value)}
                      placeholder="Ex: Mode & Luxe livré en 24h"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">E-mail professionnel de contact</label>
                    <input
                      type="email"
                      value={site.contactEmail || ''}
                      onChange={(e) => updateSite('contactEmail', e.target.value)}
                      placeholder="contact@maboutique.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">WhatsApp Business (avec indicatif)</label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+226 70 00 00 00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Téléphone Support Client</label>
                    <input
                      type="text"
                      value={site.supportPhone || ''}
                      onChange={(e) => updateSite('supportPhone', e.target.value)}
                      placeholder="+226 25 00 00 00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Devise principale affichée</label>
                    <select
                      value={site.currency || 'FCFA'}
                      onChange={(e) => updateSite('currency', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="FCFA">FCFA (XOF — Afrique de l'Ouest)</option>
                      <option value="XAF">FCFA (XAF — Afrique Centrale)</option>
                      <option value="EUR">EUR (€ — Euro)</option>
                      <option value="USD">USD ($ — Dollar US)</option>
                      <option value="GNF">GNF (Franc Guinéen)</option>
                      <option value="MAD">MAD (Dirham Marocain)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Adresse physique</label>
                    <input
                      type="text"
                      value={footerAddress}
                      onChange={(e) => setFooterAddress(e.target.value)}
                      placeholder="Ex: Avenue Kwamé N'Krumah, Ouagadougou"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Ville / Pays</label>
                    <input
                      type="text"
                      value={footerMapCity}
                      onChange={(e) => setFooterMapCity(e.target.value)}
                      placeholder="Ex: Ouagadougou, Burkina Faso"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Horaires d'ouverture</label>
                    <input
                      type="text"
                      value={site.businessHours || ''}
                      onChange={(e) => updateSite('businessHours', e.target.value)}
                      placeholder="Lun - Sam : 08h00 - 19h00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">URL du Favicon (icône onglet navigateur)</label>
                    <input
                      type="url"
                      value={site.faviconUrl || ''}
                      onChange={(e) => updateSite('faviconUrl', e.target.value)}
                      placeholder="https://.../favicon.png"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Barre d'annonce globale */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Barre d'annonce globale en haut du site</div>
                        <div className="text-[11px] text-slate-400">Idéal pour afficher une promo flash ou livraison gratuite</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(site.announcementEnabled)}
                      onChange={(e) => updateSite('announcementEnabled', e.target.checked)}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                  </div>
                  {site.announcementEnabled && (
                    <input
                      type="text"
                      value={site.announcementText || ''}
                      onChange={(e) => updateSite('announcementText', e.target.value)}
                      placeholder="Ex: 🔥 -20% sur toute la boutique jusqu'à dimanche !"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>
            )}

            {/* ONGLET 2 : SEO & GOOGLE */}
            {activeTab === 'seo' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4 text-emerald-400" />
                    Référencement Naturel (SEO) & Aperçu Google / WhatsApp
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Optimisez le titre, la description et l’image qui apparaissent sur Google, WhatsApp, Facebook et LinkedIn.
                  </p>
                </div>

                {/* Aperçu Google SERP en direct */}
                <div className="p-4 rounded-xl bg-white text-slate-900 border border-slate-200 shadow-inner space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span className="truncate font-medium">https://{previewDomain}</span>
                  </div>
                  <div className="text-base font-bold text-[#1a0dab] leading-snug truncate">
                    {site.seoTitle || `${brandName || storeName || 'Ma Boutique'} — Boutique Officielle`}
                  </div>
                  <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                    {site.seoDescription || 'Décrivez votre activité en 150 caractères pour attirer plus de clics sur Google.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300">Meta Title (Titre Google)</label>
                      <span className={`text-[11px] font-mono ${seoTitleLen > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {seoTitleLen} / 60 car.
                      </span>
                    </div>
                    <input
                      type="text"
                      value={site.seoTitle || ''}
                      onChange={(e) => updateSite('seoTitle', e.target.value)}
                      placeholder="Ex: Maison Élégance — Vêtements & Accessoires Haut de Gamme"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300">Meta Description (Description Google & WhatsApp)</label>
                      <span className={`text-[11px] font-mono ${seoDescLen > 160 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {seoDescLen} / 160 car.
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={site.seoDescription || ''}
                      onChange={(e) => updateSite('seoDescription', e.target.value)}
                      placeholder="Décrivez vos produits, vos avantages et votre zone de livraison..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Mots-clés SEO (séparés par des virgules)</label>
                      <input
                        type="text"
                        value={site.seoKeywords || ''}
                        onChange={(e) => updateSite('seoKeywords', e.target.value)}
                        placeholder="mode, chaussures, livraison rapide, Abidjan, Ouaga"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Image de partage social (OpenGraph 1200×630)</label>
                      <input
                        type="url"
                        value={site.ogImageUrl || ''}
                        onChange={(e) => updateSite('ogImageUrl', e.target.value)}
                        placeholder="https://.../banniere-partage.jpg"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Langue principale du site</label>
                      <select
                        value={site.siteLanguage || 'fr'}
                        onChange={(e) => updateSite('siteLanguage', e.target.value as 'fr' | 'en' | 'ar')}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="fr">Français (fr)</option>
                        <option value="en">English (en)</option>
                        <option value="ar">العربية (ar)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Code Google Search Console (optionnel)</label>
                      <input
                        type="text"
                        value={site.googleSiteVerification || ''}
                        onChange={(e) => updateSite('googleSiteVerification', e.target.value)}
                        placeholder="Ex: abc123XYZ_google_verification_token"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">Autoriser l'indexation sur Google (robots: index, follow)</div>
                      <div className="text-[11px] text-slate-400">Désactivez uniquement si votre site est encore en construction</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={site.allowIndexing !== false}
                      onChange={(e) => updateSite('allowIndexing', e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 3 : COLLECTE EMAILING & NEWSLETTER */}
            {activeTab === 'emailing' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" />
                    Collecte d'E-mails, Newsletter & Popup Capture
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Capturez automatiquement les e-mails de vos visiteurs et synchronisez-les directement vers votre <strong>Studio Emailing</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      Activer la collecte d'e-mails sur le site
                    </div>
                    <div className="text-[11px] text-blue-200/80 mt-0.5">
                      Les abonnés inscrits sont enregistrés dans votre base contacts Supabase pour vos campagnes Brevo.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={site.emailCollectionEnabled !== false}
                    onChange={(e) => updateSite('emailCollectionEnabled', e.target.checked)}
                    className="w-5 h-5 accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Titre du bloc Newsletter / Capture</label>
                    <input
                      type="text"
                      value={site.emailCollectionTitle || ''}
                      onChange={(e) => updateSite('emailCollectionTitle', e.target.value)}
                      placeholder="Ex: Rejoignez notre Club VIP (-10%)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Texte du bouton d'inscription</label>
                    <input
                      type="text"
                      value={site.emailCollectionButtonText || ''}
                      onChange={(e) => updateSite('emailCollectionButtonText', e.target.value)}
                      placeholder="Ex: Recevoir mon cadeau"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Sous-titre / Promesse de valeur</label>
                    <input
                      type="text"
                      value={site.emailCollectionSubtitle || ''}
                      onChange={(e) => updateSite('emailCollectionSubtitle', e.target.value)}
                      placeholder="Recevez nos nouveautés et offres privées en avant-première..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Code promo de bienvenue offert (optionnel)</label>
                    <input
                      type="text"
                      value={site.emailCollectionPromoCode || ''}
                      onChange={(e) => updateSite('emailCollectionPromoCode', e.target.value.toUpperCase())}
                      placeholder="Ex: BIENVENUE10"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Liste / Tag cible (Studio Emailing)</label>
                    <input
                      type="text"
                      value={site.emailTargetList || ''}
                      onChange={(e) => updateSite('emailTargetList', e.target.value)}
                      placeholder="Newsletter Site Web"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Message de confirmation après inscription</label>
                    <input
                      type="text"
                      value={site.emailCollectionSuccessMsg || ''}
                      onChange={(e) => updateSite('emailCollectionSuccessMsg', e.target.value)}
                      placeholder="Merci ! Vérifiez votre boîte mail."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Popup Capture */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">Afficher une Popup de capture d'e-mail aux nouveaux visiteurs</div>
                      <div className="text-[11px] text-slate-400">S'affiche une seule fois par visiteur après quelques secondes</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(site.emailPopupEnabled)}
                      onChange={(e) => updateSite('emailPopupEnabled', e.target.checked)}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                  </div>
                  {site.emailPopupEnabled && (
                    <div className="flex items-center gap-3 pt-1">
                      <label className="text-xs text-slate-300 font-medium">Délai d'apparition (secondes) :</label>
                      <input
                        type="number"
                        min={2}
                        max={60}
                        value={site.emailPopupDelaySeconds ?? 8}
                        onChange={(e) => updateSite('emailPopupDelaySeconds', Math.max(2, Number(e.target.value) || 8))}
                        className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ONGLET 4 : PIXELS & ANALYTICS */}
            {activeTab === 'tracking' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    Pixels Publicitaires & Suivi Analytics
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Connectez vos identifiants Meta, TikTok et Google pour suivre vos visites, ajouts au panier et ventes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Meta / Facebook Pixel ID</label>
                    <input
                      type="text"
                      value={metaPixelId}
                      onChange={(e) => setMetaPixelId(e.target.value)}
                      placeholder="Ex: 123456789012345"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">TikTok Pixel ID</label>
                    <input
                      type="text"
                      value={tiktokPixelId}
                      onChange={(e) => setTiktokPixelId(e.target.value)}
                      placeholder="Ex: CXXXXXXXXXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Google Analytics 4 (Measurement ID)</label>
                    <input
                      type="text"
                      value={googleTagId}
                      onChange={(e) => setGoogleTagId(e.target.value)}
                      placeholder="Ex: G-XXXXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Google Tag Manager (GTM ID)</label>
                    <input
                      type="text"
                      value={site.gtmId || ''}
                      onChange={(e) => updateSite('gtmId', e.target.value)}
                      placeholder="Ex: GTM-XXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-slate-400" />
                    Notes / Scripts personnalisés avancés (optionnel)
                  </label>
                  <textarea
                    rows={3}
                    value={site.customHeadScripts || ''}
                    onChange={(e) => updateSite('customHeadScripts', e.target.value)}
                    placeholder="Ex: Balise de vérification Pinterest / Crisp Chat ID..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ONGLET 5 : DOMAINE & RÉSEAUX SOCIAUX */}
            {activeTab === 'domain_social' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    Nom de Domaine & Réseaux Sociaux
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Configurez votre nom de domaine professionnel et centralisez tous vos liens officiels.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300">Lien officiel gratuit inclus :</div>
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <Globe className="w-4 h-4 shrink-0" />
                    <span>https://nsore.shop/{storeSlug || 'ma-boutique'}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Domaine personnalisé (ex: maboutique.com)</label>
                    <input
                      type="text"
                      value={site.customDomain || ''}
                      onChange={(e) => updateSite('customDomain', e.target.value)}
                      placeholder="maboutique.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Facebook</label>
                    <input
                      type="url"
                      value={socialLinks.facebook}
                      onChange={(e) => setSocialLinks((p) => ({ ...p, facebook: e.target.value }))}
                      placeholder="https://facebook.com/maboutique"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Instagram</label>
                    <input
                      type="url"
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks((p) => ({ ...p, instagram: e.target.value }))}
                      placeholder="https://instagram.com/maboutique"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">TikTok</label>
                    <input
                      type="url"
                      value={socialLinks.tiktok}
                      onChange={(e) => setSocialLinks((p) => ({ ...p, tiktok: e.target.value }))}
                      placeholder="https://tiktok.com/@maboutique"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">YouTube</label>
                    <input
                      type="url"
                      value={socialLinks.youtube}
                      onChange={(e) => setSocialLinks((p) => ({ ...p, youtube: e.target.value }))}
                      placeholder="https://youtube.com/@maboutique"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">LinkedIn</label>
                    <input
                      type="url"
                      value={site.linkedinUrl || ''}
                      onChange={(e) => updateSite('linkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/company/maboutique"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">X / Twitter</label>
                    <input
                      type="url"
                      value={site.twitterUrl || ''}
                      onChange={(e) => updateSite('twitterUrl', e.target.value)}
                      placeholder="https://x.com/maboutique"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 6 : MENTIONS LÉGALES & POLITIQUES */}
            {activeTab === 'legal' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Mentions Légales, CGV & Conformité RGPD
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Rassurez vos clients et respectez les normes légales avec des mentions claires.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Raison sociale / Entreprise</label>
                    <input
                      type="text"
                      value={site.companyLegalName || ''}
                      onChange={(e) => updateSite('companyLegalName', e.target.value)}
                      placeholder="Ex: SARL Maison Élégance"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">RCCM / IFU / NINEA / SIRET (optionnel)</label>
                    <input
                      type="text"
                      value={site.rccmOrTaxId || ''}
                      onChange={(e) => updateSite('rccmOrTaxId', e.target.value)}
                      placeholder="Ex: BF-OUA-2026-B-1234"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Texte Copyright (pied de page)</label>
                    <input
                      type="text"
                      value={copyrightText}
                      onChange={(e) => setCopyrightText(e.target.value)}
                      placeholder="© 2026 Ma Boutique. Tous droits réservés."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Conditions Générales de Vente (CGV personnalisées)
                    </label>
                    <textarea
                      rows={3}
                      value={site.termsText || ''}
                      onChange={(e) => updateSite('termsText', e.target.value)}
                      placeholder="Laissez vide pour utiliser les CGV professionnelles par défaut de Nanasore..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      Politique de confidentialité & données personnelles
                    </label>
                    <textarea
                      rows={3}
                      value={site.privacyPolicyText || ''}
                      onChange={(e) => updateSite('privacyPolicyText', e.target.value)}
                      placeholder="Laissez vide pour utiliser la politique RGPD par défaut..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      Politique de livraison & retours
                    </label>
                    <textarea
                      rows={2}
                      value={site.shippingReturnPolicyText || ''}
                      onChange={(e) => updateSite('shippingReturnPolicyText', e.target.value)}
                      placeholder="Ex: Livraison en 24h-48h, échange gratuit sous 7 jours..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white">Afficher un bandeau de consentement Cookies (RGPD)</div>
                    <div className="text-[11px] text-slate-400">Recommandé si vous activez Meta Pixel, TikTok Pixel ou Google Analytics</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(site.cookieBannerEnabled)}
                    onChange={(e) => updateSite('cookieBannerEnabled', e.target.checked)}
                    className="w-5 h-5 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 hidden sm:block">
            Les paramètres sont synchronisés avec votre brouillon et publiés avec votre thème.
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-blue-600/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              {savedFeedback ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Enregistrer les paramètres</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSiteSettingsModal;
