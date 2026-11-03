import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Send, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import { generateLiveShareLinks } from '../../../../services/liveSessionService';
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
  onClose
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const shareLinks = generateLiveShareLinks(sessionSlug, title, storeName);

  const handleCopyLink = () => {
    playValidationBeep();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareLinks.liveUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200"
      >
        {/* En-tête Bleu & Blanc */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Envoyer le Live Partout 📲
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Partagez l'accès en 1 clic sur vos réseaux
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
        <div className="p-6 space-y-5">
          {/* Bloc Lien Unique & Copie */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">
              Lien Direct de la Session Live :
            </label>
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-50 border border-blue-200">
              <input
                type="text"
                readOnly
                value={shareLinks.liveUrl}
                className="w-full px-3 py-1.5 bg-transparent text-xs text-slate-800 font-mono font-medium outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* Grille des Boutons 1-Clic Multi-Réseaux */}
          <div className="space-y-2.5">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              Partage Direct en 1 Clic :
            </span>

            {/* 1. WhatsApp Statut & Groupes */}
            <a
              href={shareLinks.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={playTapBeep}
              className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-xs flex items-center justify-between transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Statut WhatsApp &amp; Groupes</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            {/* 2. Facebook */}
            <a
              href={shareLinks.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={playTapBeep}
              className="w-full py-3 px-4 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs flex items-center justify-between transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-black text-sm">f</span>
                <span>Partager sur Facebook</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            {/* 3. Telegram */}
            <a
              href={shareLinks.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={playTapBeep}
              className="w-full py-3 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1f8fc4] text-white font-bold text-xs flex items-center justify-between transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4" />
                <span>Canal &amp; Groupe Telegram</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            {/* 4. TikTok Bio / Live */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-between transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-black">🎵</span>
                <span>Copier pour Bio TikTok / Description</span>
              </div>
              <Copy className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveShareModal;
