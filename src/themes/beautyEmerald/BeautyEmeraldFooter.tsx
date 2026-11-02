import React from 'react';
import { 
  MapPin, Phone, Mail, Instagram, Facebook, 
  MessageCircle, ShieldCheck, Heart, ArrowUpRight,
  ExternalLink, Sparkles, CheckCircle2
} from 'lucide-react';
import { StoreConfig, WhiteLabelConfig } from '../../types/theme';
import { ThemeCustomizationConfig } from '../../types';
import { 
  BEAUTY_MARBLE_DARK_PATTERN_SVG,
  BEAUTY_FOOTER_BOTANICAL_CORNER_SVG 
} from './beautyEmeraldAssets';

export interface BeautyEmeraldFooterProps {
  storeConfig?: StoreConfig;
  customConfig?: ThemeCustomizationConfig;
  whiteLabelConfig?: WhiteLabelConfig;
  onNavigateCategory?: (category: string) => void;
}

export const BeautyEmeraldFooter: React.FC<BeautyEmeraldFooterProps> = ({
  storeConfig,
  customConfig,
  whiteLabelConfig,
  onNavigateCategory
}) => {
  const storeName = customConfig?.storeName || storeConfig?.storeName || storeConfig?.name || 'Glow';
  const logoUrl = customConfig?.logoUrl || storeConfig?.logoUrl || storeConfig?.logo_url;
  const currentYear = new Date().getFullYear();
  const addressText = customConfig?.customization?.footer?.address || customConfig?.footerAddress || storeConfig?.description || 'Boulevard Hassan II, Cocody Ambassades';
  const whatsappPhone = customConfig?.customization?.footer?.contactPhone || customConfig?.whatsappNumber || storeConfig?.whatsappPhone || '+225 07 00 00 00 00';
  const supportPhone = customConfig?.supportPhone || '05 00 00 00 00';
  const cleanWaDigits = whatsappPhone.replace(/\D/g, '') || '2250700000000';
  const emailAddr = customConfig?.customization?.footer?.email || customConfig?.footerEmail || `contact@${storeName.toLowerCase().replace(/\s+/g, '')}.com`;
  const aboutTitle = customConfig?.storeTagline || 'Haute Cosmétique Botanique & Rituels Purs';
  const aboutText = customConfig?.customization?.footer?.aboutText || customConfig?.footerAboutText || "Formulés à partir d'extraits végétaux rares et testés dermatologiquement, nos soins subliment l'équilibre naturel de votre peau pour révéler un éclat sans compromis.";
  const showPaymentIcons = customConfig?.paymentIconsVisible !== false;
  const copyrightText = customConfig?.customization?.footer?.copyright || customConfig?.copyrightText || whiteLabelConfig?.customFooterText || `© ${currentYear} ${storeName}. Tous droits réservés. Écrin Haute Cosmétique Botanique.`;

  return (
    <footer className="beauty-emerald-footer relative bg-[#111C18] text-white overflow-hidden border-t border-[#C59B27]/30">
      {/* Texture Marbre Noir & Lignes Obliques Subtiles en Arrière-Plan */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.06] bg-repeat"
        style={{ backgroundImage: `url("${BEAUTY_MARBLE_DARK_PATTERN_SVG}")` }}
      />

      {/* Rameaux botaniques dorés dans les coins supérieurs */}
      <div className="absolute top-0 left-0 w-36 h-36 pointer-events-none opacity-30">
        <img src={BEAUTY_FOOTER_BOTANICAL_CORNER_SVG} alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-0 right-0 w-36 h-36 pointer-events-none opacity-30 transform scale-x-[-1]">
        <img src={BEAUTY_FOOTER_BOTANICAL_CORNER_SVG} alt="" className="w-full h-full object-contain" />
      </div>

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12">
        {/* Les 3 Colonnes Séparées par de Fines Bordures Verticales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10 gap-10 lg:gap-0 pb-16">
          
          {/* ================= COLONNE GAUCHE : LOCALISATION & CONTACT ================= */}
          <div className="space-y-8 lg:pr-10">
            <div>
              <span className="font-['Outfit'] text-[11px] font-bold uppercase tracking-[2px] text-[#C59B27] block mb-3">
                LOCALISATION
              </span>
              <div className="flex items-start gap-3.5 group">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#C59B27] transition-colors">
                  <MapPin className="w-4 h-4 text-[#C59B27]" />
                </div>
                <div>
                  <h4 className="font-['Syne'] font-bold text-sm text-white">
                    Maison {storeName}
                  </h4>
                  <p className="font-['Outfit'] text-xs sm:text-sm text-[#B0B8B4] mt-0.5 leading-relaxed">
                    {addressText}<br />
                    {customConfig?.footerMapCity || "Abidjan, Côte d'Ivoire & Livraison Afrique de l'Ouest"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <span className="font-['Outfit'] text-[11px] font-bold uppercase tracking-[2px] text-[#C59B27] block">
                CONTACTEZ-NOUS
              </span>

              {/* Téléphone / WhatsApp Direct */}
              <div className="flex items-center gap-3.5 group">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#0F4C3A] transition-colors">
                  <Phone className="w-4 h-4 text-[#C59B27]" />
                </div>
                <div>
                  <span className="font-['Outfit'] text-[11px] text-[#B0B8B4] block">Assistance Téléphonique & WhatsApp</span>
                  <a 
                    href={`https://wa.me/${cleanWaDigits}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="font-['Outfit'] font-semibold text-sm text-white hover:text-[#C59B27] transition-colors"
                  >
                    {whatsappPhone} {supportPhone ? `/ ${supportPhone}` : ''}
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3.5 group">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#C59B27] transition-colors">
                  <Mail className="w-4 h-4 text-[#C59B27]" />
                </div>
                <div>
                  <span className="font-['Outfit'] text-[11px] text-[#B0B8B4] block">Service Client & Commandes Spéciales</span>
                  <a 
                    href={`mailto:${emailAddr}`}
                    className="font-['Outfit'] font-semibold text-sm text-white hover:text-[#C59B27] transition-colors"
                  >
                    {emailAddr}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ================= COLONNE CENTRALE : LOGO, MISSION & RÉSEAUX SOCIAUX ================= */}
          <div className="flex flex-col items-center text-center justify-center space-y-6 lg:px-10 pt-10 lg:pt-0">
            {/* Logo en Syne 800 avec point Or Champagne */}
            <div className="flex items-center justify-center gap-1.5">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-12 w-auto max-w-[180px] object-contain" />
              ) : (
                <>
                  <span className="font-['Syne'] font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                    {storeName}
                  </span>
                  <span className="w-3 h-3 rounded-full bg-[#C59B27] shadow-sm shadow-[#C59B27]/50" />
                </>
              )}
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="font-['Bodoni_Moda'] italic text-[#C59B27] font-semibold text-lg">
                {aboutTitle}
              </h3>
              <p className="font-['Outfit'] text-xs sm:text-sm text-[#B0B8B4] leading-relaxed">
                {aboutText}
              </p>
            </div>

            {/* Rangée d'icônes réseaux sociaux carrées 36px x 36px */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {/* Facebook */}
              <a
                href={customConfig?.socialLinks?.facebook || '#facebook'}
                target={customConfig?.socialLinks?.facebook ? '_blank' : undefined}
                rel="noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-md bg-[#3b5998]/20 border border-white/10 hover:border-[#3b5998] hover:bg-[#3b5998] text-white flex items-center justify-center transition-all hover:scale-110"
              >
                <Facebook className="w-4 h-4 fill-current" />
              </a>

              {/* TikTok / X */}
              <a
                href={customConfig?.socialLinks?.tiktok || '#tiktok'}
                target={customConfig?.socialLinks?.tiktok ? '_blank' : undefined}
                rel="noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 rounded-md bg-white/5 border border-white/10 hover:border-white hover:bg-white hover:text-black text-white flex items-center justify-center transition-all hover:scale-110 font-black text-xs font-['Outfit']"
              >
                𝕏
              </a>

              {/* Instagram */}
              <a
                href={customConfig?.socialLinks?.instagram || '#instagram'}
                target={customConfig?.socialLinks?.instagram ? '_blank' : undefined}
                rel="noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-md bg-[#E1306C]/20 border border-white/10 hover:border-[#E1306C] hover:bg-[#E1306C] text-white flex items-center justify-center transition-all hover:scale-110"
              >
                <Instagram className="w-4 h-4" />
              </a>

              {/* YouTube */}
              <a
                href={customConfig?.socialLinks?.youtube || '#youtube'}
                target={customConfig?.socialLinks?.youtube ? '_blank' : undefined}
                rel="noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-md bg-[#BD081C]/20 border border-white/10 hover:border-[#BD081C] hover:bg-[#BD081C] text-white flex items-center justify-center transition-all hover:scale-110 font-bold text-xs"
              >
                ▶
              </a>

              {/* WhatsApp */}
              <a
                href={customConfig?.socialLinks?.whatsapp ? (customConfig.socialLinks.whatsapp.startsWith('http') ? customConfig.socialLinks.whatsapp : `https://wa.me/${customConfig.socialLinks.whatsapp.replace(/\D/g, '')}`) : `https://wa.me/${cleanWaDigits}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-md bg-[#25D366]/20 border border-white/10 hover:border-[#25D366] hover:bg-[#25D366] text-white flex items-center justify-center transition-all hover:scale-110"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#C59B27] font-['Outfit'] font-semibold tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{customConfig?.reassurance3Title || 'Garantie Authenticité & Fraîcheur Botanique'}</span>
            </div>
          </div>

          {/* ================= COLONNE DROITE : VOTRE COMPTE & LIENS ================= */}
          <div className="space-y-6 lg:pl-10 pt-10 lg:pt-0">
            <div>
              <span className="font-['Outfit'] text-[11px] font-bold uppercase tracking-[2px] text-[#C59B27] block mb-3">
                VOTRE COMPTE
              </span>
              <ul className="space-y-2.5 font-['Outfit'] text-xs sm:text-sm text-[#B0B8B4]">
                <li>
                  <a href="#account" className="hover:text-white transition-colors flex items-center justify-between group">
                    <span>Mon Compte Client</span>
                    <span className="text-white/30 group-hover:text-[#C59B27] transition-colors">→</span>
                  </a>
                </li>
                <li>
                  <a href="#wishlist" className="hover:text-white transition-colors flex items-center justify-between group">
                    <span>Mes Favoris & Rituels Enregistrés</span>
                    <span className="text-white/30 group-hover:text-[#C59B27] transition-colors">→</span>
                  </a>
                </li>
                <li>
                  <a href="#orders" className="hover:text-white transition-colors flex items-center justify-between group">
                    <span>Suivi de Commande en Temps Réel</span>
                    <span className="text-white/30 group-hover:text-[#C59B27] transition-colors">→</span>
                  </a>
                </li>
                <li>
                  <a href="#returns" className="hover:text-white transition-colors flex items-center justify-between group">
                    <span>Politique de Retour sous 14 jours</span>
                    <span className="text-white/30 group-hover:text-[#C59B27] transition-colors">→</span>
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors flex items-center justify-between group">
                    <span>Foire Aux Questions (FAQ) & Conseils</span>
                    <span className="text-white/30 group-hover:text-[#C59B27] transition-colors">→</span>
                  </a>
                </li>
              </ul>
            </div>

            {showPaymentIcons && (
              <div className="pt-2">
                <span className="font-['Outfit'] text-[11px] font-bold uppercase tracking-[2px] text-[#C59B27] block mb-2">
                  PAIEMENTS SÉCURISÉS EN AFRIQUE
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-white font-['Outfit']">
                    Wave
                  </span>
                  <span className="px-2 py-1 rounded bg-[#FF6600]/20 border border-[#FF6600]/40 text-[10px] font-bold text-[#FF9933] font-['Outfit']">
                    Orange Money
                  </span>
                  <span className="px-2 py-1 rounded bg-[#FFCC00]/20 border border-[#FFCC00]/40 text-[10px] font-bold text-[#FFCC00] font-['Outfit']">
                    MTN MoMo
                  </span>
                  <span className="px-2 py-1 rounded bg-[#005CA9]/20 border border-[#005CA9]/40 text-[10px] font-bold text-[#66B2FF] font-['Outfit']">
                    Moov Money
                  </span>
                  <span className="px-2 py-1 rounded bg-white/10 border border-white/20 text-[10px] font-bold text-white font-['Outfit']">
                    Paiement à la Livraison
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Barre de Copyright Inférieure */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-['Outfit'] text-[#88908C]">
          <p>
            {copyrightText}
          </p>

          <div className="flex items-center gap-6 text-[11px]">
            <a href="#privacy" className="hover:text-white transition-colors">Confidentialité</a>
            <span className="text-white/20">•</span>
            <a href="#terms" className="hover:text-white transition-colors">Conditions Générales de Vente</a>
            <span className="text-white/20">•</span>
            <span className="text-[#C59B27] font-semibold">100% Satisfait ou Échangé</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
