import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Send,
  Users,
  Wallet,
  Sparkles,
} from 'lucide-react';
import {
  buildAffiliateLiveLink,
  getSavedAffiliateProfile,
  saveAffiliateProfile,
} from '../../../../services/liveAffiliateService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface LiveShareModalProps {
  sessionSlug: string;
  title: string;
  storeName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const LiveShareModal: React.FC<LiveShareModalProps> = ({
  sessionSlug,
  title,
  storeName = 'Boutique Nanasore',
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [useAffiliateLink, setUseAffiliateLink] = useState<boolean>(false);
  const [affiliateCode, setAffiliateCode] = useState<string>(() => getSavedAffiliateProfile().code);
  const [affiliatePhone, setAffiliatePhone] = useState<string>(() => getSavedAffiliateProfile().phone);

  if (!isOpen) return null;

  const cleanSlug = (sessionSlug || 'direct').trim();
  const effectiveUrl =
    useAffiliateLink && affiliateCode.trim()
      ? buildAffiliateLiveLink(cleanSlug, affiliateCode, affiliatePhone)
      : `https://nsore.shop/live/${encodeURIComponent(cleanSlug)}`;

  const shareMessage = `🔴 EN DIRECT chez ${storeName} : ${title}\nRejoignez la salle maintenant 👉 ${effectiveUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(effectiveUrl)}&text=${encodeURIComponent(`🔴 EN DIRECT — ${title}`)}`;

  const handleSaveAffiliateInputs = (nextCode: string, nextPhone: string) => {
    setAffiliateCode(nextCode);
    setAffiliatePhone(nextPhone);
    saveAffiliateProfile(nextCode, nextPhone);
  };

  const handleCopyLink = () => {
    playValidationBeep();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(effectiveUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
      >
        {/* En-tête Bleu Royal Nanasore */}
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#1E40AF] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Partager &amp; Inviter des Amis
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Partagez le lien public ou votre lien affilié rémunéré
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de la modale */}
        <div className="p-5 space-y-4">
          {/* Bascule Lien Affilié */}
          <div className="p-3.5 rounded-2xl bg-[#F5F7FB] border border-blue-200/80 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    Partager avec mon lien Affilié
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Touchez une commission sur chaque ami qui achète
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={useAffiliateLink}
                onChange={(e) => {
                  playTapBeep();
                  setUseAffiliateLink(e.target.checked);
                }}
                className="w-4 h-4 rounded text-[#1D4ED8] focus:ring-[#1D4ED8]"
              />
            </label>

            {useAffiliateLink && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Votre Code / Pseudo Affilié *
                  </label>
                  <input
                    type="text"
                    value={affiliateCode}
                    onChange={(e) => handleSaveAffiliateInputs(e.target.value, affiliatePhone)}
                    placeholder="Ex: MOUSSA226"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold uppercase focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Téléphone Mobile Money (Paiement)
                  </label>
                  <input
                    type="tel"
                    value={affiliatePhone}
                    onChange={(e) => handleSaveAffiliateInputs(affiliateCode, e.target.value)}
                    placeholder="Ex: 70000000"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bloc Lien & Copie */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>
                {useAffiliateLink && affiliateCode.trim()
                  ? 'Votre Lien Affilié Personnalisé :'
                  : 'Lien Direct de la Salle (nsore.shop) :'}
              </span>
            </label>
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#F5F7FB] border border-slate-200">
              <input
                type="text"
                readOnly
                value={effectiveUrl}
                className="flex-1 bg-transparent text-xs font-mono text-slate-700 px-2 focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#1D4ED8] hover:bg-[#1E40AF] text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* Partage 1-Clic WhatsApp & Telegram */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={playTapBeep}
              className="py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Inviter sur WhatsApp</span>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={playTapBeep}
              className="py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Send className="w-4 h-4" />
              <span>Telegram</span>
            </a>
          </div>

          {useAffiliateLink && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
              <Users className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
              <span>
                Vos amis sont reconnus automatiquement pendant 30 jours sur tous les produits avec affiliation activée.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveShareModal;
