import React, { useState, useEffect, useMemo } from 'react';
import {
  Gavel,
  Clock,
  Trophy,
  Zap,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  LiveAuctionState,
  LiveAuctionBid,
} from '../../../../services/liveAuctionService';
import { recordAffiliateSaleCommission } from '../../../../services/liveAffiliateService';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { UltimateCheckout } from '../../../../components/payment/UltimateCheckout';

export interface LiveAuctionWidgetProps {
  auction: LiveAuctionState;
  isHost: boolean;
  storeId: string;
  storeName: string;
  whatsappPhone?: string;
  affiliateEnabled?: boolean;
  affiliateCommissionPercent?: number;
  currentBidderId: string;
  currentBidderName: string;
  onPlaceBid: (amount: number) => void;
  onEndAuction: () => void;
  onDismissAuction: () => void;
}

export const LiveAuctionWidget: React.FC<LiveAuctionWidgetProps> = ({
  auction,
  isHost,
  storeId,
  storeName,
  whatsappPhone,
  affiliateEnabled = true,
  affiliateCommissionPercent = 10,
  currentBidderId,
  currentBidderName,
  onPlaceBid,
  onEndAuction,
  onDismissAuction,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor((auction.endsAt - Date.now()) / 1000))
  );
  const [customBid, setCustomBid] = useState<string>('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [winnerPaid, setWinnerPaid] = useState<boolean>(false);

  useEffect(() => {
    const updateClock = () => {
      const rem = Math.max(0, Math.floor((auction.endsAt - Date.now()) / 1000));
      setSecondsLeft(rem);
      if (rem === 0 && auction.status === 'active' && isHost) {
        onEndAuction();
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [auction.endsAt, auction.status, isHost, onEndAuction]);

  const isEnded = auction.status === 'ended' || secondsLeft === 0;
  const isWinner =
    isEnded &&
    Boolean(auction.highestBidderId) &&
    auction.highestBidderId === currentBidderId;

  const minNextBid = auction.bidsCount === 0
    ? auction.startingPrice
    : auction.currentPrice + auction.minStep;

  const formattedClock = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  const handleQuickBid = (increment: number) => {
    if (isEnded || isHost) return;
    const target = auction.bidsCount === 0 ? auction.startingPrice : auction.currentPrice + increment;
    playValidationBeep();
    onPlaceBid(target);
  };

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(customBid);
    if (!val || val < minNextBid) {
      alert(`Votre offre doit être d'au moins ${formatCFA(minNextBid)}.`);
      return;
    }
    playValidationBeep();
    onPlaceBid(val);
    setCustomBid('');
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-[#1D4ED8]/30 shadow-lg shadow-blue-950/5 overflow-hidden">
      {/* En-tête Enchère Bleu Royal */}
      <div className="bg-gradient-to-r from-[#1D4ED8] to-[#1E40AF] text-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Gavel className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">
                {isEnded ? 'Enchère Clôturée • Adjugé !' : 'Vente aux Enchères en Direct'}
              </span>
              {!isEnded && (
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              )}
            </div>
            <p className="text-[11px] text-blue-100">
              {auction.bidsCount} offre{auction.bidsCount > 1 ? 's' : ''} • Palier min. +{formatCFA(auction.minStep)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
              isEnded
                ? 'bg-emerald-500 text-slate-950'
                : secondsLeft <= 15
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-white/15 text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isEnded ? 'TERMINÉ' : formattedClock}</span>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={onDismissAuction}
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white cursor-pointer"
              title="Masquer l'enchère"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Corps de l'Enchère */}
      <div className="p-4 space-y-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F7FB] border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
            {auction.productImage ? (
              <img
                src={auction.productImage}
                alt={auction.productName}
                className="w-full h-full object-cover"
              />
            ) : (
              <ShoppingBag className="w-7 h-7 text-[#1D4ED8]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-slate-900 truncate">
              {auction.productName}
            </h4>
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <span className="text-xl font-black text-[#1D4ED8]">
                {formatCFA(auction.currentPrice)}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                (Départ : {formatCFA(auction.startingPrice)})
              </span>
            </div>
            {auction.highestBidderName ? (
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">
                  {isEnded ? 'Gagnant : ' : 'En tête : '}
                  {auction.highestBidderName}
                </span>
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">
                Soyez le premier à placer une offre !
              </p>
            )}
          </div>
        </div>

        {/* Historique rapide des 3 dernières enchères */}
        {auction.recentBids && auction.recentBids.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {auction.recentBids.slice(0, 3).map((b: LiveAuctionBid, idx: number) => (
              <span
                key={b.id}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  idx === 0
                    ? 'bg-blue-50 border-blue-200 text-[#1D4ED8]'
                    : 'bg-[#F5F7FB] border-slate-200 text-slate-600'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>{b.bidderName}</span>
                <span>• {formatCFA(b.amount)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Zone d'actions : Acheteur vs Hôte */}
        {!isEnded ? (
          isHost ? (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Les spectateurs peuvent enchérir en temps réel.
              </span>
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  onEndAuction();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>Adjuger maintenant</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1 border-t border-slate-100">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map((mult) => {
                  const inc = auction.minStep * mult;
                  const target = auction.bidsCount === 0 && mult === 1
                    ? auction.startingPrice
                    : auction.currentPrice + inc;
                  return (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => handleQuickBid(inc)}
                      className="py-2.5 px-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-95 text-white font-black text-xs shadow-sm transition cursor-pointer flex flex-col items-center justify-center"
                    >
                      <span>{auction.bidsCount === 0 && mult === 1 ? 'Enchérir' : `+${formatCFA(inc)}`}</span>
                      <span className="text-[10px] font-semibold text-blue-100">
                        {formatCFA(target)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleCustomBidSubmit} className="flex items-center gap-2">
                <input
                  type="number"
                  min={minNextBid}
                  step={500}
                  value={customBid}
                  onChange={(e) => setCustomBid(e.target.value)}
                  placeholder={`Autre offre (min ${formatCFA(minNextBid)})`}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 bg-[#F5F7FB] focus:bg-white focus:outline-none focus:border-[#1D4ED8]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shrink-0"
                >
                  Placer
                </button>
              </form>
            </div>
          )
        ) : (
          /* Enchère terminée */
          <div className="pt-2 border-t border-slate-100">
            {isWinner ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-6 h-6 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-emerald-900">
                      Félicitations {currentBidderName} ! Vous avez remporté l&apos;enchère !
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Prix adjugé : <strong>{formatCFA(auction.currentPrice)}</strong>
                    </p>
                  </div>
                </div>
                {winnerPaid ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commande validée</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Payer &amp; Valider ({formatCFA(auction.currentPrice)})</span>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-600 text-center py-1">
                {auction.highestBidderName
                  ? `Adjugé à ${auction.highestBidderName} pour ${formatCFA(auction.currentPrice)}.`
                  : 'Enchère terminée sans offre.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Checkout Popup pour le gagnant de l'enchère (avec reconnaissance & commission affilié) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[10000]">
          <UltimateCheckout
            isModal={true}
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onCancel={() => setIsCheckoutOpen(false)}
            product={{
              id: auction.productId || auction.id,
              name: `[Enchère Adjugée] ${auction.productName}`,
              price: auction.currentPrice,
              imageUrl: auction.productImage,
              quantity: 1,
            }}
            amount={auction.currentPrice}
            storeName={storeName}
            whatsappPhone={whatsappPhone}
            merchantId={storeId}
            onSuccess={async (details) => {
              setWinnerPaid(true);
              setIsCheckoutOpen(false);
              if (affiliateEnabled) {
                await recordAffiliateSaleCommission({
                  merchantId: storeId,
                  sessionId: auction.sessionId,
                  productId: auction.productId || auction.id,
                  productName: auction.productName,
                  orderAmount: details.amount || auction.currentPrice,
                  commissionPercent: affiliateCommissionPercent,
                  buyerName: details.customerName || currentBidderName,
                  buyerContact: details.phoneNumber || details.customerEmail,
                  transactionId: details.transactionId,
                });
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LiveAuctionWidget;
