import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Check, ArrowRight, X, ShieldCheck } from 'lucide-react';
import { OmniFunnelOrder, FunnelProductItem } from '../../../types/omniFunnel';
import { purchaseDownsellItem } from '../../../services/omniFunnelService';
import { formatCFA, playCashChime, playTapBeep, playValidationBeep } from '../../../utils/audio';

interface DownsellOfferProps {
  order: OmniFunnelOrder;
  onAcceptDownsell: (updatedOrder: OmniFunnelOrder) => void;
  onDeclineDownsell: () => void;
}

export const DownsellOffer: React.FC<DownsellOfferProps> = ({
  order,
  onAcceptDownsell,
  onDeclineDownsell
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const downsellProduct: FunnelProductItem = {
    id: 'downsell-care-kit',
    name: 'Kit Entretien Cuir & Chiffon Microfibre Haute Densité',
    price: 3500,
    originalPrice: 7500,
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
    itemType: 'physical',
    sku: 'CARE-KIT-01'
  };

  const handleAccept = async () => {
    playValidationBeep();
    setIsProcessing(true);

    await purchaseDownsellItem(order.orderId, downsellProduct, downsellProduct.price);

    playCashChime();
    setIsProcessing(false);

    const updatedOrder: OmniFunnelOrder = {
      ...order,
      downsell: {
        downsellId: downsellProduct.id,
        title: downsellProduct.name,
        price: downsellProduct.price,
        purchased: true,
        purchasedAt: Date.now()
      },
      payment: {
        ...order.payment,
        downsellAmount: downsellProduct.price,
        grandTotal: order.payment.grandTotal + downsellProduct.price
      }
    };

    onAcceptDownsell(updatedOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-indigo-500/50 shadow-2xl p-5 sm:p-7 space-y-5 text-slate-100 relative text-center my-auto"
      >
        <button
          type="button"
          onClick={() => { playTapBeep(); onDeclineDownsell(); }}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badge Attente */}
        <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10.5px] font-black border border-indigo-500/40 inline-flex items-center gap-1">
          <Tag className="w-3 h-3" />
          <span>DERNIÈRE OPPORTUNITÉ SPÉCIALE</span>
        </span>

        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
            Gardez votre article comme neuf pour seulement 3 500 F CFA !
          </h2>
          <p className="text-xs text-slate-300">
            Notre baume protecteur professionnel préserve l'éclat et la souplesse de votre achat pendant 3 ans.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 max-h-[160px] mx-auto shadow-lg">
          <img src={downsellProduct.imageUrl} alt={downsellProduct.name} className="w-full h-full object-cover" />
        </div>

        {/* Prix Downsell */}
        <div className="flex items-baseline justify-center gap-3">
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            +{formatCFA(downsellProduct.price)}
          </span>
          <span className="text-xs text-slate-500 line-through font-mono">
            {formatCFA(downsellProduct.originalPrice || 7500)}
          </span>
          <span className="text-xs font-black text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            -53% RÉDUCTION
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isProcessing}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-indigo-950/60 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            {isProcessing ? (
              <span>Ajout en cours...</span>
            ) : (
              <>
                <span>Ajouter à mon colis pour 3 500 F CFA</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => { playTapBeep(); onDeclineDownsell(); }}
            className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer block mx-auto"
          >
            Non merci, finaliser ma commande sans le kit de soin.
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DownsellOffer;
