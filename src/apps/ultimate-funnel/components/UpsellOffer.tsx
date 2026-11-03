import React, { useState, useEffect, useCallback } from 'react';
import { Flame, Clock, ShieldCheck, Check, ArrowRight, X, AlertTriangle } from 'lucide-react';
import { OmniFunnelOrder, FunnelProductItem } from '../../../types/omniFunnel';
import { purchaseUpsellItem, checkProductInventory } from '../../../services/omniFunnelService';
import { formatCFA, playCashChime, playTapBeep, playValidationBeep } from '../../../utils/audio';

interface UpsellOfferProps {
  order: OmniFunnelOrder;
  onAcceptUpsell: (updatedOrder: OmniFunnelOrder) => void;
  onDeclineUpsell: () => void;
}

export const UpsellOffer: React.FC<UpsellOfferProps> = ({
  order,
  onAcceptUpsell,
  onDeclineUpsell
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(180); // 3 minutes
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInStock, setIsInStock] = useState(true);

  const upsellProduct: FunnelProductItem = {
    id: 'upsell-belt-leather',
    name: 'Ceinture Assortie Cuir Pleine Fleur (Boucle Or Satiné)',
    price: 9500,
    originalPrice: 18000,
    imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&auto=format&fit=crop&q=80',
    itemType: 'physical',
    sku: 'BELT-GOLD-LEATHER-01'
  };

  // Compte à rebours pulsatile 3 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDeclineUpsell();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onDeclineUpsell]);

  // Vérification de stock en temps réel
  useEffect(() => {
    checkProductInventory(upsellProduct.id).then(res => {
      setIsInStock(res.inStock);
    });
  }, [upsellProduct.id]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  const handleAccept = async () => {
    playValidationBeep();
    setIsProcessing(true);

    await purchaseUpsellItem(order.orderId, upsellProduct, upsellProduct.price);

    playCashChime();
    setIsProcessing(false);

    const updatedOrder: OmniFunnelOrder = {
      ...order,
      upsell: {
        upsellId: upsellProduct.id,
        title: upsellProduct.name,
        price: upsellProduct.price,
        purchased: true,
        purchasedAt: Date.now()
      },
      payment: {
        ...order.payment,
        upsellAmount: upsellProduct.price,
        grandTotal: order.payment.grandTotal + upsellProduct.price
      }
    };

    onAcceptUpsell(updatedOrder);
  };

  if (!isInStock) {
    // Si en rupture de stock, redirection immédiate sans bloquer l'acheteur
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-4 select-none overflow-y-auto">
      {/* Bannière de Sécurité Supérieure */}
      <div className="w-full max-w-xl bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-center mb-4 space-y-1">
        <span className="text-[11px] font-black text-amber-300 uppercase tracking-wide">
          ATTENDEZ ! VOTRE COMMANDE N'EST PAS ENCORE COMPLÈTE
        </span>
        <p className="text-xs text-slate-300">
          Cette offre exclusive ne vous sera plus JAMAIS présentée après cette page.
        </p>
      </div>

      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border-2 border-amber-500/40 shadow-2xl p-5 sm:p-7 space-y-5 text-center relative overflow-hidden">
        {/* Compte à rebours pulsatile 3 min */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-rose-500/50 text-xs font-black text-rose-400 mx-auto shadow-lg">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          <span>Offre Spéciale Expire Dans :</span>
          <span className="font-mono text-white text-sm font-black">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Titre & Accroche */}
        <div className="space-y-1.5">
          <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
            OFFRE COMPLÉMENTAIRE RECOMMANDÉE
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">
            Complétez votre look avec la Ceinture Cuir Assortie (-50%) !
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Spécialement conçue pour matcher parfaitement avec votre article commandé.
          </p>
        </div>

        {/* Photo de l'article Upsell */}
        <div className="rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 shadow-xl max-h-[220px] mx-auto">
          <img src={upsellProduct.imageUrl} alt={upsellProduct.name} className="w-full h-full object-cover" />
        </div>

        {/* Avantages Clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-xs text-slate-300">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cuir pleine fleur italien</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Boucle dorée inoxydable</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Livré dans le même colis</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zéro frais de port supplémentaire</span>
          </div>
        </div>

        {/* Tarif Upsell */}
        <div className="flex items-baseline justify-center gap-3 pt-2">
          <span className="text-2xl sm:text-3xl font-black text-white font-mono">
            +{formatCFA(upsellProduct.price)}
          </span>
          <span className="text-sm text-slate-500 line-through font-mono">
            {formatCFA(upsellProduct.originalPrice || 18000)}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/30">
            ÉCONOMISEZ 8 500 F CFA
          </span>
        </div>

        {/* Actions OTO */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isProcessing}
            className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-600 hover:from-amber-400 hover:to-emerald-400 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Ajout à ma commande...</span>
              </span>
            ) : (
              <>
                <span>OUI ! Ajouter cette ceinture à ma commande ({formatCFA(upsellProduct.price)})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Déclinaison de l'Upsell -> Déclenche le Downsell */}
          <button
            type="button"
            onClick={() => { playTapBeep(); onDeclineUpsell(); }}
            className="text-xs text-slate-400 hover:text-slate-300 underline cursor-pointer transition block mx-auto pt-1"
          >
            Non merci, je refuse cette offre unique et je préfère payer le prix fort plus tard.
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpsellOffer;
