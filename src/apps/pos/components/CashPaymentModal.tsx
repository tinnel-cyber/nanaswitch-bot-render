import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { formatCFA, playCashChime, playValidationBeep, playTapBeep } from '../../../utils/audio';
import { CartItem, SellerUser } from '../../../types';
import {
  Banknote,
  CheckCircle,
  X,
  ArrowRight,
  Printer,
  FileDown,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface CashPaymentModalProps {
  total: number;
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: (amountGiven: number, change: number) => void;
  onPrintReceipt?: (amountGiven: number, change: number) => void;
  onDownloadPdf?: (amountGiven: number, change: number) => void;
  activeSeller?: SellerUser | null;
  onOpenSellerSwitch?: () => void;
}

const COMMON_DENOMINATIONS = [500, 1000, 2000, 5000, 10000];

export const CashPaymentModal: React.FC<CashPaymentModalProps> = ({
  total,
  cart,
  isOpen,
  onClose,
  onConfirmPayment,
  onPrintReceipt,
  onDownloadPdf,
  activeSeller,
  onOpenSellerSwitch,
}) => {
  const [givenAmount, setGivenAmount] = useState<number>(total);

  if (!isOpen) return null;

  const change = Math.max(0, givenAmount - total);
  const remaining = Math.max(0, total - givenAmount);
  const isSellerValid = !!activeSeller;

  const handleQuickAmount = (val: number) => {
    setGivenAmount(val);
  };

  const handleAddAmount = (val: number) => {
    setGivenAmount((prev) => prev + val);
  };

  const handleValidate = () => {
    if (!isSellerValid) {
      if (onOpenSellerSwitch) onOpenSellerSwitch();
      return;
    }
    playCashChime();
    onConfirmPayment(givenAmount, change);
  };

  const handlePrint = () => {
    if (!isSellerValid) {
      if (onOpenSellerSwitch) onOpenSellerSwitch();
      return;
    }
    playValidationBeep();
    if (onPrintReceipt) {
      onPrintReceipt(givenAmount, change);
    }
  };

  const handlePdf = () => {
    if (!isSellerValid) {
      if (onOpenSellerSwitch) onOpenSellerSwitch();
      return;
    }
    playValidationBeep();
    if (onDownloadPdf) {
      onDownloadPdf(givenAmount, change);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Règlement Espèces</h3>
              <p className="text-[11px] text-slate-400">Calcul automatique & signature ticket</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-800 cursor-pointer active:scale-95 touch-manipulation"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Seller Badge / Warning if no seller */}
        <div className="mt-2.5">
          {activeSeller ? (
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 font-bold text-[11px] flex items-center justify-center border border-emerald-500/40 shrink-0">
                  {activeSeller.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white truncate flex items-center gap-1.5">
                    <span>{activeSeller.name}</span>
                    <span className="text-[9px] font-mono text-emerald-400">
                      ({activeSeller.signatureCode})
                    </span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Signature automatique prête</span>
                  </div>
                </div>
              </div>
              {onOpenSellerSwitch && (
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onOpenSellerSwitch();
                  }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold underline shrink-0 cursor-pointer"
                >
                  Changer
                </button>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                <div className="text-[11px] text-rose-300 font-bold">
                  Aucun vendeur actif ! Vente bloquée.
                </div>
              </div>
              {onOpenSellerSwitch && (
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onOpenSellerSwitch();
                  }}
                  className="px-2 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold shadow cursor-pointer shrink-0"
                >
                  Choisir Vendeur
                </button>
              )}
            </div>
          )}
        </div>

        {/* Total & Change Section */}
        <div className="py-2.5">
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center space-y-2">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total à Encaisser
              </span>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {formatCFA(total)}
              </div>
            </div>

            {/* Change or remaining */}
            <div className="pt-2 border-t border-slate-800/80">
              {givenAmount >= total ? (
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Monnaie à Rendre</span>
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                    {formatCFA(change)}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Montant Insuffisant (Manque)
                  </span>
                  <div className="text-xl font-bold text-amber-400 font-mono">
                    {formatCFA(remaining)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Given Amount Input */}
          <div className="mt-2.5">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Montant reçu du client :
            </label>
            <div className="relative">
              <input
                type="number"
                value={givenAmount || ''}
                onChange={(e) => setGivenAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-lg focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="0"
                min={0}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                F CFA
              </span>
            </div>
          </div>

          {/* Quick Amount Pills */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickAmount(total)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold font-mono transition-colors cursor-pointer border border-emerald-500/30"
            >
              Exact ({formatCFA(total)})
            </button>
            {COMMON_DENOMINATIONS.filter((d) => d >= total).map((denom) => (
              <button
                key={denom}
                type="button"
                onClick={() => handleQuickAmount(denom)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono transition-colors cursor-pointer"
              >
                {denom.toLocaleString('fr-FR')} F
              </button>
            ))}
          </div>

          {/* Add quick delta buttons */}
          <div className="mt-2 flex gap-1.5">
            {[100, 200, 500, 1000].map((add) => (
              <button
                key={add}
                type="button"
                onClick={() => handleAddAmount(add)}
                className="flex-1 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold font-mono transition-colors cursor-pointer"
              >
                +{add} F
              </button>
            ))}
          </div>
        </div>

        {/* Quick Print / PDF Bar for Cash Payment */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex gap-1.5">
            <button
              id="btn-print-from-cash-modal"
              type="button"
              disabled={!isSellerValid}
              onClick={handlePrint}
              className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isSellerValid
                  ? 'bg-slate-800 hover:bg-slate-750 text-blue-300 border-blue-500/30 active:scale-95 cursor-pointer'
                  : 'bg-slate-850 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
              }`}
              title="Ouvrir l'impression thermique formatée (80mm / 58mm)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
            <button
              id="btn-pdf-from-cash-modal"
              type="button"
              disabled={!isSellerValid}
              onClick={handlePdf}
              className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isSellerValid
                  ? 'bg-slate-800 hover:bg-slate-750 text-emerald-300 border-emerald-500/30 active:scale-95 cursor-pointer'
                  : 'bg-slate-850 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
              }`}
              title="Télécharger la facture en PDF (jsPDF)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Facture PDF</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Retour
            </button>
            <button
              id="btn-valider-cash-final"
              type="button"
              disabled={!isSellerValid}
              onClick={handleValidate}
              className={`flex-[2] py-3 rounded-xl font-extrabold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSellerValid
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/30 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
              }`}
            >
              <span>{isSellerValid ? 'Valider Vente' : 'Vendeur Requis'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashPaymentModal;
