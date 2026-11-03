import React from 'react';
import { Video, Radio, Sparkles, PhoneCall } from 'lucide-react';
import { playTapBeep } from '../../../utils/audio';

interface FlashLiveCtaButtonProps {
  buttonText?: string;
  badgeText?: string;
  merchantPhone?: string;
  onConnectLive?: () => void;
  className?: string;
}

export const FlashLiveCtaButton: React.FC<FlashLiveCtaButtonProps> = ({
  buttonText = '👁️ Voir le produit en direct (Visio 5 min)',
  badgeText = 'VENDEUR CONNECTÉ EN BOUTIQUE',
  merchantPhone = '+22670000000',
  onConnectLive,
  className = ''
}) => {
  const handleClick = () => {
    playTapBeep();
    if (onConnectLive) {
      onConnectLive();
    } else {
      // Ouvre WhatsApp visio ou numéro direct du marchand
      const clean = merchantPhone.replace(/[^0-9]/g, '');
      const msg = encodeURIComponent('Bonjour ! Je souhaite voir le produit en direct en appel vidéo rapide (5 min).');
      window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
    }
  };

  return (
    <div className={`w-full p-3 rounded-2xl bg-gradient-to-r from-rose-950/40 via-indigo-950/30 to-slate-900/60 border border-rose-500/30 text-center space-y-2 relative overflow-hidden group ${className}`}>
      {/* Halo lumineux de fond */}
      <div className="absolute -top-12 -left-12 w-28 h-28 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
        <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-300">
          {badgeText}
        </span>
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 transition cursor-pointer"
      >
        <Radio className="w-4 h-4 text-amber-300 animate-pulse" />
        <span>{buttonText}</span>
      </button>

      <p className="text-[10px] text-slate-400">
        Présentation vidéo privée instantanée sans engagement • Vérifiez l'article avant de payer
      </p>
    </div>
  );
};
