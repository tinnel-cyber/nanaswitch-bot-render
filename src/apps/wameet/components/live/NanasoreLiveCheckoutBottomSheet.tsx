import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import {
  X,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Zap,
  Loader2,
  Lock,
  Plus,
  Minus,
  Sparkles
} from 'lucide-react';
import { LiveEventProduct, recordLiveOrder } from '../../../../services/nanasoreLiveSyncService';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';

export type MobileMoneyOperator = 'orange' | 'wave' | 'moov' | 'mtn';

export interface NanasoreLiveCheckoutBottomSheetProps {
  product: LiveEventProduct;
  liveId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

const OPERATORS: { id: MobileMoneyOperator; label: string; logoColor: string; badge: string }[] = [
  { id: 'orange', label: 'Orange Money', logoColor: 'bg-orange-500 text-white', badge: 'Orange' },
  { id: 'wave', label: 'Wave', logoColor: 'bg-sky-400 text-slate-900', badge: 'Wave 0% frais' },
  { id: 'moov', label: 'Moov Money', logoColor: 'bg-blue-600 text-white', badge: 'Moov' },
  { id: 'mtn', label: 'MTN MoMo', logoColor: 'bg-yellow-400 text-slate-900', badge: 'MTN' }
];

export const NanasoreLiveCheckoutBottomSheet: React.FC<NanasoreLiveCheckoutBottomSheetProps> = ({
  product,
  liveId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedOperator, setSelectedOperator] = useState<MobileMoneyOperator>('orange');
  const [quantity, setQuantity] = useState<number>(1);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalAmount = product.price * quantity;

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    playTapBeep();
    setIsProcessing(true);

    try {
      // 1. Simulation d'autorisation Mobile Money ultra-rapide (< 1s)
      await new Promise(resolve => setTimeout(resolve, 900));

      // 2. Enregistrement de la commande en base Firestore
      const res = await recordLiveOrder({
        liveId,
        productId: product.id,
        productTitle: product.title,
        amountFcfa: totalAmount,
        paymentMethod: selectedOperator,
        customerPhone: phoneNumber.trim() || '+22670000000',
        customerName: 'Spectateur Live'
      });

      // 3. Célébration & Confettis 60 FPS par-dessus la vidéo en lecture
      playCashChime();
      setIsProcessing(false);
      setIsPaidSuccess(true);

      try {
        confetti({
          particleCount: 110,
          spread: 85,
          origin: { y: 0.55 },
          colors: ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#6366F1']
        });
      } catch (e) {
        // Ignorer si bloqué
      }

      // 4. Rétractation fluide du tiroir après 1.4s pour continuer de regarder le direct
      setTimeout(() => {
        setIsPaidSuccess(false);
        if (onSuccess) onSuccess(res.orderId);
        onClose();
      }, 1500);
    } catch (err) {
      console.warn('[NANASORE LIVE CHECKOUT] Erreur paiement direct :', err);
      setIsProcessing(false);
    }
  };

  const sheetContent = (
    <>
      {/* ============================================================== */}
      {/* OVERLAY SOMBRE À 40% : LA VIDÉO CONTINUE DE TOURNER DERRIÈRE   */}
      {/* ============================================================== */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out will-change-opacity"
        aria-hidden="true"
      />

      {/* ============================================================== */}
      {/* TIROIR (BOTTOM SHEET) 50% DE HAUTEUR - 60 FPS FLUIDE          */}
      {/* ============================================================== */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 h-[50vh] min-h-[380px] max-h-[50vh] bg-white rounded-t-[32px] border-t-2 border-[#4169E1] shadow-[0_-20px_50px_rgba(0,0,0,0.25)] flex flex-col text-slate-900 transform-gpu transition-transform duration-300 ease-out will-change-transform animate-in slide-in-from-bottom duration-300"
        style={{
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased'
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Paiement direct en direct"
      >
        {/* Poignée de glissement supérieure */}
        <div className="w-full flex items-center justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* En-tête du tiroir */}
        <div className="px-5 py-2 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-[#4169E1] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#4169E1] fill-[#4169E1]" />
              <span>Commande Flash en Direct</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Fermer le tiroir"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu principal défilant (50% de hauteur totale) */}
        {isPaidSuccess ? (
          /* Écran de succès avec confettis par-dessus la vidéo */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-[#4169E1]/15 border-2 border-[#4169E1] text-[#4169E1] flex items-center justify-center shadow-lg shadow-[#4169E1]/20">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Commande Validée avec Succès !</h3>
              <p className="text-xs text-slate-500 mt-1">
                Votre reçu et confirmation ont été générés. Retour automatique au direct...
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4169E1]/10 border border-[#4169E1]/20 text-[#4169E1] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Reçu instantané par SMS / WhatsApp</span>
            </div>
          </div>
        ) : (
          /* Formulaire Récapitulatif ➡️ Choix Mobile Money ➡️ Payer maintenant */
          <form onSubmit={handlePayNow} className="flex-1 flex flex-col justify-between p-4 sm:p-5 overflow-y-auto">
            <div className="space-y-3.5">
              {/* 1. Récapitulatif commande */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {product.shortTitle || product.title}
                    </h4>
                    <span className="text-xs font-extrabold text-[#4169E1] tabular-nums">
                      {formatCFA(product.price)}
                    </span>
                  </div>
                </div>

                {/* Sélecteur de Quantité */}
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setQuantity(prev => Math.max(1, prev - 1));
                    }}
                    className="text-slate-500 hover:text-slate-900 p-0.5 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black px-1.5 tabular-nums text-slate-800">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setQuantity(prev => prev + 1);
                    }}
                    className="text-slate-500 hover:text-slate-900 p-0.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. Choix Mobile Money */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Moyen de paiement Mobile Money :</span>
                  <span className="text-[10px] text-emerald-600 font-extrabold">Sécurisé SSL 256-bit</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {OPERATORS.map(op => {
                    const isSelected = selectedOperator === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedOperator(op.id);
                        }}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-[#4169E1]/10 border-[#4169E1] text-[#4169E1] shadow-sm ring-2 ring-[#4169E1]'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${op.logoColor}`}>
                          {op.badge}
                        </span>
                        <span className="text-[10px] font-bold line-clamp-1">{op.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Numéro de téléphone Mobile Money */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-[#4169E1]" />
                  <span>Numéro Mobile Money pour confirmation :</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="Ex: 70 00 00 00 (Orange, Wave, Moov)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 4. Bouton "Payer maintenant" */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block font-semibold">Total à payer :</span>
                <span className="text-base sm:text-lg font-black text-[#4169E1] tabular-nums">
                  {formatCFA(totalAmount)}
                </span>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 max-w-[240px] py-3 px-4 rounded-xl bg-[#4169E1] hover:bg-[#3154b3] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#4169E1]/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Confirmation en direct...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-white" />
                    <span>Payer maintenant ({formatCFA(totalAmount)})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );

  if (typeof document !== 'undefined') {
    return createPortal(sheetContent, document.body);
  }

  return sheetContent;
};

export default NanasoreLiveCheckoutBottomSheet;
