import React, { useMemo } from 'react';
import { 
  Zap, 
  MessageCircle, 
  Pin, 
  PinOff, 
  Sparkles, 
  ShoppingBag,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { StoreProductItem } from '../../../../components/storeBuilder/types';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface LiveProductCarouselProps {
  products: StoreProductItem[];
  pinnedProductId?: string | null;
  whatsappPhone?: string;
  isHost?: boolean;
  onOpenFunnel: (product: StoreProductItem) => void;
  onPinProduct?: (product: StoreProductItem) => void;
  onUnpinProduct?: () => void;
  className?: string;
}

export const LiveProductCarousel: React.FC<LiveProductCarouselProps> = ({
  products = [],
  pinnedProductId,
  whatsappPhone = '',
  isHost = false,
  onOpenFunnel,
  onPinProduct,
  onUnpinProduct,
  className = ''
}) => {
  // Découpage et duplication pour le défilement continu sans interruption
  const carouselItems = useMemo(() => {
    if (!products || products.length === 0) return [];
    const pool = [...products];
    while (pool.length < 6) {
      pool.push(...products);
    }
    // Duplication fluide
    return [...pool, ...pool];
  }, [products]);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('fr-FR').format(p) + ' F CFA';
  };

  const handleWhatsAppClick = (product: StoreProductItem) => {
    playTapBeep();
    const cleanNumber = (whatsappPhone || '').replace(/[^0-9]/g, '');
    const defaultMsg = `Bonjour, je regarde le Live en direct et je souhaite commander : *${product.name}* (${formatPrice(product.price)}). Pouvez-vous valider ma commande immédiatement ?`;
    const targetUrl = cleanNumber
      ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(defaultMsg)}`;
    window.open(targetUrl, '_blank');
  };

  if (!products || products.length === 0) return null;

  return (
    <div className={`w-full overflow-hidden select-none py-2 ${className}`}>
      <style>{`
        @keyframes nanaLiveContinuousScroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .nana-live-scroll-track {
          animation: nanaLiveContinuousScroll 42s linear infinite;
          will-change: transform;
        }
        .nana-live-scroll-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Titre & Incitation de Conversion en Direct */}
      <div className="flex items-center justify-between px-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4169E1] animate-ping" />
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡ Offres &amp; Produits Présentés en Direct</span>
          </span>
        </div>
        <span className="text-[11px] font-bold text-[#4169E1] bg-[#4169E1]/10 px-2.5 py-0.5 rounded-full">
          Commande sans quitter le Live
        </span>
      </div>

      {/* Rail de défilement continu */}
      <div className="overflow-hidden w-full py-1">
        <div className="flex gap-4 w-max nana-live-scroll-track">
          {carouselItems.map((prod, idx) => {
            const isPinned = pinnedProductId === prod.id;

            return (
              <div
                key={`${prod.id}-${idx}`}
                className={`w-[260px] sm:w-[290px] shrink-0 bg-white rounded-2xl border transition-all duration-300 p-3 flex flex-col justify-between shadow-sm hover:shadow-xl relative group ${
                  isPinned 
                    ? 'border-2 border-[#4169E1] ring-2 ring-[#4169E1]/20 shadow-md bg-[#4169E1]/5' 
                    : 'border-slate-200 hover:border-[#4169E1]'
                }`}
              >
                {/* Badge Épinglé ou Remise */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                    <img
                      src={prod.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=300&auto=format&fit=crop&q=80'}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1 group-hover:text-[#4169E1] transition-colors" title={prod.name}>
                      {prod.name}
                    </h4>

                    {/* Prix Promo Bleu Royal */}
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-sm font-black text-[#4169E1]">
                        {formatPrice(prod.price)}
                      </span>
                      {prod.originalPrice && prod.originalPrice > prod.price && (
                        <span className="text-[10px] text-slate-400 line-through">
                          {formatPrice(prod.originalPrice)}
                        </span>
                      )}
                    </div>

                    {prod.badge && (
                      <span className="inline-block mt-0.5 text-[9px] font-bold text-[#4169E1] bg-[#4169E1]/10 px-1.5 py-0.2 rounded">
                        {prod.badge}
                      </span>
                    )}
                  </div>

                  {/* Contrôle Hôte : Bouton Épingler au direct */}
                  {isHost && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapBeep();
                        if (isPinned) {
                          onUnpinProduct?.();
                        } else {
                          onPinProduct?.(prod);
                        }
                      }}
                      className={`p-1.5 rounded-lg text-xs transition cursor-pointer shrink-0 ${
                        isPinned
                          ? 'bg-[#4169E1] text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-[#4169E1]/10 text-slate-500 hover:text-[#4169E1]'
                      }`}
                      title={isPinned ? 'Désépingler' : 'Épingler ce produit sur l\'écran'}
                    >
                      {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* LES 2 BOUTONS D'ACTION INSTANTANÉE (SANS COUPER LE LIVE) */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                  {/* Bouton 1 : Voir le Tunnel & Acheter */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playValidationBeep();
                      onOpenFunnel(prod);
                    }}
                    className="bg-[#4169E1] hover:bg-[#3154b3] active:scale-95 text-white font-extrabold text-[11px] py-2 px-2.5 rounded-xl shadow-md shadow-[#4169E1]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Zap className="w-3 h-3 fill-white shrink-0" />
                    <span className="truncate">Tunnel &amp; Achat</span>
                  </button>

                  {/* Bouton 2 : WhatsApp Direct */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWhatsAppClick(prod);
                    }}
                    className="bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white font-bold text-[11px] py-2 px-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-3 h-3 fill-white shrink-0" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LiveProductCarousel;
