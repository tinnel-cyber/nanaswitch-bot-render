import React, { useState, useCallback } from 'react';
import { 
  Share2, Copy, Check, MessageCircle, Facebook, 
  Linkedin, Twitter, Send, ExternalLink, QrCode, 
  Sparkles, TrendingUp, Eye, DollarSign, Award, AlertCircle 
} from 'lucide-react';
import { motion } from 'motion/react';
import { PromoCampaign } from '../../../../../types/campaign';
import { generateSocialShareData } from '../../../../../services/campaignService';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

interface SocialBlastHubProps {
  campaign: PromoCampaign;
  onClose?: () => void;
  onNavigateToFunnel?: (campaignId: string) => void;
  className?: string;
}

export const SocialBlastHub: React.FC<SocialBlastHubProps> = ({
  campaign,
  onClose,
  onNavigateToFunnel,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [previewTab, setPreviewTab] = useState<'WHATSAPP' | 'CARD'>('WHATSAPP');

  const shareData = generateSocialShareData(campaign);
  const discountPercent = Math.round(
    ((campaign.originalPrice - campaign.discountPrice) / campaign.originalPrice) * 100
  );

  const handleCopyLink = () => {
    playValidationBeep();
    navigator.clipboard.writeText(shareData.promoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenSocial = (url: string) => {
    playTapBeep();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // QR Code URL via service sécurisé d'image QR (ou SVG fallback)
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareData.promoUrl)}&color=10b981&bgcolor=020617`;

  return (
    <div className={`space-y-6 overflow-y-auto overscroll-contain scrollbar-hide touch-pan-y ${className}`}>
      {/* 1. Entête du Hub de Diffusion */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              FUNNEL GÉNÉRÉ & PRÊT À DIFFUSER
            </span>
            <span className="text-xs text-slate-400">ID: {campaign.id}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">
            Hub de Diffusion Virale & Neuro-Marketing
          </h2>
        </div>

        {onNavigateToFunnel && (
          <button
            type="button"
            onClick={() => onNavigateToFunnel(campaign.id)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer min-h-[40px]"
          >
            <span>Voir le Funnel en Direct</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Barre du Lien Tracké Unique */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-emerald-400" />
            Lien de Campagne Tracké (Isolation Totale sans Barre de Menu)
          </span>
          <span className="text-[11px] text-emerald-400 font-extrabold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Tracking Pixel Actif
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareData.promoUrl}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300 font-mono focus:outline-none select-all min-h-[42px]"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer whitespace-nowrap min-h-[42px] ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copier</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => { playTapBeep(); setShowQrCode(!showQrCode); }}
            className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center cursor-pointer min-h-[42px] min-w-[42px] ${
              showQrCode
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Générer QR Code pour affiches & statuts"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>

        {/* Panneau QR Code Toggle */}
        {showQrCode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-2 flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800"
          >
            <img
              src={qrCodeImageUrl}
              alt="QR Code de la campagne"
              className="w-28 h-28 rounded-lg border border-emerald-500/30 p-1 bg-slate-900 shadow-md"
            />
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-xs font-black text-white">QR Code Prêt pour Affiches & Statuts</p>
              <p className="text-[11px] text-slate-400">
                Scannez pour ouvrir directement le tunnel de vente optimisé sur smartphone. Idéal pour les présentations en salle et vos stories WhatsApp/Instagram.
              </p>
              <a
                href={qrCodeImageUrl}
                download={`qrcode_${campaign.id}.png`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-[11px] font-bold text-emerald-400 hover:underline pt-1"
              >
                Télécharger l'image PNG
              </a>
            </div>
          </motion.div>
        )}
      </div>

      {/* 3. Boutons d'Action "Social Blast" 1-Clic */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Diffuser en 1 Clic sur vos Réseaux (Viral Blast)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* WhatsApp Blast (Bouton Prioritaire) */}
          <button
            type="button"
            onClick={() => handleOpenSocial(shareData.whatsappDeepLink)}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/60 transition group cursor-pointer sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black">Diffuser sur WhatsApp</div>
                <div className="text-[10px] text-emerald-100 font-medium">Groupes, Statuts & Contacts</div>
              </div>
            </div>
            <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={() => handleOpenSocial(shareData.facebookLink)}
            className="p-3.5 rounded-2xl bg-[#1877F2]/20 hover:bg-[#1877F2]/30 border border-[#1877F2]/40 text-blue-300 font-black text-xs flex items-center justify-between gap-3 transition group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1877F2] text-white flex items-center justify-center">
                <Facebook className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Partager sur Facebook</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* LinkedIn */}
          <button
            type="button"
            onClick={() => handleOpenSocial(shareData.linkedinLink)}
            className="p-3.5 rounded-2xl bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 border border-[#0A66C2]/40 text-sky-300 font-black text-xs flex items-center justify-between gap-3 transition group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center">
                <Linkedin className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Publier sur LinkedIn</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Twitter / X */}
          <button
            type="button"
            onClick={() => handleOpenSocial(shareData.twitterLink)}
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-black text-xs flex items-center justify-between gap-3 transition group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                <Twitter className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Poster sur X (Twitter)</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Telegram */}
          <button
            type="button"
            onClick={() => handleOpenSocial(shareData.telegramLink)}
            className="p-3.5 rounded-2xl bg-[#229ED9]/20 hover:bg-[#229ED9]/30 border border-[#229ED9]/40 text-cyan-300 font-black text-xs flex items-center justify-between gap-3 transition group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#229ED9] text-white flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Canaux Telegram</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* 4. Aperçu du Message & Rich-Preview Card Injectée (Open Graph Simulator) */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">
              Aperçu du Rendu Social & Balises Open Graph
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              OG:IMAGE & OG:TITLE INJECTÉS
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewTab('WHATSAPP')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                previewTab === 'WHATSAPP'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Message WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('CARD')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                previewTab === 'CARD'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Carte Rich-Preview
            </button>
          </div>
        </div>

        {/* Tab 1 : Simulation Message WhatsApp */}
        {previewTab === 'WHATSAPP' ? (
          <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#1f2c34] font-sans text-xs space-y-2 text-slate-100 max-w-xl mx-auto shadow-inner relative">
            <div className="text-[10.5px] font-bold text-emerald-400 flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span>Simulation Message Prêt-à-l'Emploi WhatsApp</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareData.whatsappMessage);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Copier le texte seul
              </button>
            </div>

            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-200">
              {shareData.whatsappMessage}
            </pre>
          </div>
        ) : (
          /* Tab 2 : Carte Rich Preview (ce qui apparaît quand le lien est collé sur Facebook, WhatsApp, LinkedIn) */
          <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl space-y-0">
            <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
              <img
                src={campaign.courseCoverImage}
                alt={campaign.courseTitle}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-lg">
                -{discountPercent}% OFF
              </div>
            </div>
            <div className="p-3.5 space-y-1.5 bg-slate-900/90">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                NANA-ACADEMY.TELECOM • PROMO FLASH
              </span>
              <h4 className="text-xs font-black text-white line-clamp-1">
                {campaign.campaignName}
              </h4>
              <p className="text-[11px] text-slate-300 line-clamp-2">
                {campaign.headline}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. Métriques en Temps Réel du Funnel */}
      <div className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Performance & Taux de Conversion de ce Funnel
          </span>
          <span className="text-[11px] text-slate-400">Actualisation en temps réel</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Visites Uniques
            </div>
            <div className="text-xl font-black text-white mt-1">
              {campaign.stats?.viewsCount || 0}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              Clics CTA
            </div>
            <div className="text-xl font-black text-white mt-1">
              {campaign.stats?.clicksCount || 0}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10.5px] font-bold text-emerald-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Inscriptions
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {campaign.stats?.conversionsCount || 0}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10.5px] font-bold text-amber-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              Chiffre d'Affaires
            </div>
            <div className="text-base sm:text-lg font-black text-amber-300 mt-1 truncate">
              {(campaign.stats?.totalRevenueCFA || 0).toLocaleString('fr-FR')} F
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialBlastHub;
