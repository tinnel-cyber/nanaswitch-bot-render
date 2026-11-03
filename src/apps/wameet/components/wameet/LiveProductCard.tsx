import React, { useEffect, useState } from 'react';
import { ShoppingBag, Zap, X, Sparkles, Flame, Clock } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface LiveProductItem {
  id: string;
  title: string;
  price: number; // Prix promo en FCFA
  originalPrice?: number;
  imageUrl: string;
  badge?: string; // ex: "OFFRE FLASH -30%"
  stockRemaining?: number;
  salesCount?: number;
}

export interface LiveProductCardProps {
  product: LiveProductItem;
  onBuyClick: (product: LiveProductItem) => void;
  onDismiss?: () => void;
  autoDismissSeconds?: number; // ex: 20 secondes
  className?: string;
}

/**
 * Formate un montant en Francs CFA (FCFA)
 */
export function formatLivePrice(amount?: number): string {
  if (amount == null) return '0 FCFA';
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

/**
 * Composant LiveProductCard (Wameet Flash Live Shopping)
 * Apparaît en surimpression temporaire (toast / sticky bottom) au-dessus du flux de chat
 * lorsque le vendeur pousse un article en direct.
 */
export const LiveProductCard: React.FC<LiveProductCardProps> = ({
  product,
  onBuyClick,
  onDismiss,
  autoDismissSeconds = 25,
  className = ''
}) => {
  const [progress, setProgress] = useState<number>(100);

  // Calcul du pourcentage de réduction
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  // Compte à rebours visuel pour le décompte de l'offre
  useEffect(() => {
    if (!autoDismissSeconds || autoDismissSeconds <= 0) return;

    const intervalTime = 100;
    const totalSteps = (autoDismissSeconds * 1000) / intervalTime;
    const stepDecrement = 100 / totalSteps;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= stepDecrement) {
          clearInterval(timer);
          if (onDismiss) onDismiss();
          return 0;
        }
        return prev - stepDecrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [autoDismissSeconds, onDismiss]);

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      playValidationBeep();
    } catch {}
    onBuyClick(product);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      playTapBeep();
    } catch {}
    if (onDismiss) onDismiss();
  };

  return (
    <div
      role="region"
      aria-label="Produit poussé par le vendeur"
      className={`relative z-30 w-full transform-gpu transition-all duration-300 ease-out animate-in slide-in-from-bottom-5 fade-in ${className}`}
    >
      {/* Conteneur Glassmorphism Premium avec lueur néon */}
      <div className="relative rounded-2xl p-3 bg-slate-950/92 backdrop-blur-xl border border-white/20 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.85)] ring-1 ring-blue-500/30 text-white overflow-hidden">
        {/* Ligne de décompte d'expiration de l'offre */}
        {autoDismissSeconds > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-[#0084FF] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Halo lumineux d'arrière-plan */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#0084FF]/20 rounded-full blur-2xl pointer-events-none" />

        {/* 1. En-tête : Badge "Flash Deal" & Bouton fermer */}
        <div className="flex items-center justify-between gap-2 mb-2 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1 truncate">
              <Flame className="w-3 h-3 text-rose-500 shrink-0" />
              <span>{product.badge || 'Offre Flash en Direct 🔥'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {product.stockRemaining != null && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Plus que {product.stockRemaining} en stock !
              </span>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Masquer l'offre"
                aria-label="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Corps : Image + Titre + Prix & Réduction */}
        <div className="flex items-center gap-3">
          {/* Miniature du produit */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/60 border border-white/15 shrink-0 shadow-md">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
            {discountPercent && (
              <span className="absolute top-1 left-1 px-1 py-0.2 rounded-md bg-rose-600 text-white text-[9px] font-black tracking-tight shadow">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Informations produit & Prix */}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-extrabold text-white line-clamp-1 leading-snug">
              {product.title}
            </h4>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-sm font-black text-emerald-400">
                {formatLivePrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-[10px] text-slate-400 line-through">
                  {formatLivePrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* 3. Bouton Principal : "Acheter en 1 clic" */}
            <div className="mt-2">
              <button
                type="button"
                onClick={handleBuy}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#0084FF] via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98] text-white text-xs font-black shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current stroke-none" />
                <span>Acheter en 1 clic</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveProductCard;
