import React from 'react';
import {
  ShieldCheck,
  Lock,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  CreditCard,
  Building
} from 'lucide-react';
import { formatBubbleAmount } from './SmartTransactionBubble';
import { playTapBeep } from '../../../../utils/audio';

export interface EscrowPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentUrl: string | null;
  transactionId: string | null;
  amount: number;
  title: string;
  currency?: string;
  sellerName?: string;
  buyerPhone?: string;
}

export const EscrowPaymentModal: React.FC<EscrowPaymentModalProps> = ({
  isOpen,
  onClose,
  paymentUrl,
  transactionId,
  amount,
  title,
  currency = 'FCFA',
  sellerName,
  buyerPhone
}) => {
  if (!isOpen) return null;

  const handleOpenGateway = () => {
    try {
      playTapBeep();
    } catch {}
    if (paymentUrl) {
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Header avec gradient de sécurité */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Smart Escrow Nanasore</h3>
              <p className="text-[11px] text-blue-200 font-medium">Paiement 100% Sécurisé & Garanti</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps de la modale */}
        <div className="p-6 space-y-5">
          {/* Fiche récapitulative */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Commande :</span>
              <span className="text-xs font-black text-slate-900 text-right line-clamp-1">{title}</span>
            </div>
            {sellerName && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Vendeur :</span>
                <span className="text-xs font-bold text-slate-800">{sellerName}</span>
              </div>
            )}
            {transactionId && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Réf. Séquestre :</span>
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  {transactionId}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">Total à consigner :</span>
              <span className="text-xl font-black text-blue-600">
                {formatBubbleAmount(amount, currency)}
              </span>
            </div>
          </div>

          {/* Opérateurs Mobile Money supportés */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Moyens de Paiement Disponibles :
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl border border-orange-200 bg-orange-50/60 flex flex-col items-center gap-1">
                <span className="text-xs font-black text-orange-600">Orange</span>
                <span className="text-[9px] font-semibold text-slate-500">Money</span>
              </div>
              <div className="p-2 rounded-xl border border-yellow-200 bg-yellow-50/60 flex flex-col items-center gap-1">
                <span className="text-xs font-black text-yellow-700">MTN</span>
                <span className="text-[9px] font-semibold text-slate-500">MoMo</span>
              </div>
              <div className="p-2 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col items-center gap-1">
                <span className="text-xs font-black text-blue-600">Wave</span>
                <span className="text-[9px] font-semibold text-slate-500">Digital</span>
              </div>
              <div className="p-2 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col items-center gap-1">
                <span className="text-xs font-black text-emerald-700">Moov</span>
                <span className="text-[9px] font-semibold text-slate-500">Flooz</span>
              </div>
            </div>
          </div>

          {/* Explication pédagogique du séquestre */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-slate-700">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed font-medium">
              Vos fonds sont mis sous séquestre sécurisé. Le vendeur ne recevra l&apos;argent que
              lorsque vous aurez cliqué sur <strong className="font-bold text-blue-900">« Confirmer la réception »</strong> dans le chat.
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-2 pt-1">
            {paymentUrl ? (
              <button
                type="button"
                onClick={handleOpenGateway}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 active:scale-98 text-white font-black text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>Payer {formatBubbleAmount(amount, currency)}</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-3 text-center text-xs font-semibold text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                Génération du lien de paiement en cours...
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              Annuler et retourner au chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscrowPaymentModal;
