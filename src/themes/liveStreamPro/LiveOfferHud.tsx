import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Flame, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { LiveProductItem } from './liveStreamAssets';
import { formatCFA, playTapBeep } from '../../utils/audio';

interface LiveOfferHudProps {
  product: LiveProductItem;
  onOpenOffer: (product: LiveProductItem) => void;
}

export const LiveOfferHud: React.FC<LiveOfferHudProps> = ({
  product,
  onOpenOffer
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(268); // ~4min 28s
  const [currentStock, setCurrentStock] = useState(product.stockLeft || 4);

  // Décompte fluide du compte à rebours de l'offre flash
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTapBeep();
    onOpenOffer(product);
  };

  return (
    <div 
      className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 max-w-[calc(100%-24px)] sm:max-w-[340px] md:max-w-[370px] transition-all duration-300"
      role="region"
      aria-label="Offre épinglée du moment"
    >
      <div className="relative rounded-[14px] p-3 live-glass-overlay shadow-2xl shadow-black/80 text-white border border-white/20 backdrop-blur-[12px] bg-[#090A0F]/80">
        
        {/* Header de l'offre : Badge Épinglé & Toggle Réduire */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F59E0B] flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#F59E0B]" />
              Offre Épinglée du Moment
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Décompte flash */}
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-white/[0.08] px-2 py-0.5 rounded-full tabular-nums">
              <Clock className="w-2.5 h-2.5 text-[#FF2A54]" />
              <span>{formattedCountdown}</span>
            </div>

            {/* Bouton minimiser */}
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
              title={isMinimized ? "Agrandir l'offre" : "Minimiser l'offre"}
              aria-label="Minimiser l'offre"
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Contenu rétractable ou développé */}
        {!isMinimized ? (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            {/* Rangée Principale : Miniature + Détails Prix */}
            <div className="flex items-start gap-2.5 sm:gap-3">
              {/* Miniature carrée */}
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 p-1 flex items-center justify-center">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-contain"
                />
                {discountPercent && (
                  <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-[#FF2A54] text-white text-[9px] font-black tracking-tight shadow">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              {/* Titre & Prix */}
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                  {product.name}
                </h4>

                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-[#F59E0B] tracking-tight tabular-nums">
                    {formatCFA(product.price)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-[11px] line-through text-slate-400 tabular-nums">
                      {formatCFA(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Jauge d'Urgence : 🔥 Plus que X places/unités à ce tarif */}
            <div className="space-y-1 bg-black/40 p-2 rounded-xl border border-white/[0.06]">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1 text-[#FF2A54]">
                  <Flame className="w-3.5 h-3.5 fill-[#FF2A54] animate-pulse" />
                  Plus que {currentStock} places/unités à ce tarif
                </span>
                <span className="text-slate-400 text-[10px]">80% vendu</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#FF2A54] via-[#F59E0B] to-[#10B981] transition-all duration-500"
                  style={{ width: `${Math.max(15, (currentStock / 10) * 100)}%` }}
                />
              </div>
            </div>

            {/* Bouton Lumineux : ⚡ Saisir l'offre maintenant */}
            <button
              type="button"
              onClick={handleCtaClick}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 live-btn-accent cursor-pointer group shadow-lg active:scale-98 tracking-wide"
            >
              <Zap className="w-4 h-4 fill-white group-hover:scale-110 transition-transform text-amber-300" />
              <span>⚡ Saisir l'offre maintenant</span>
            </button>
          </div>
        ) : (
          /* Vue minimisée compacte */
          <div 
            onClick={() => setIsMinimized(false)}
            className="flex items-center justify-between gap-3 cursor-pointer pt-1"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white truncate max-w-[170px]">
                {product.name}
              </span>
              <span className="text-xs font-black text-[#F59E0B] tabular-nums">
                {formatCFA(product.price)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCtaClick}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Voir</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
