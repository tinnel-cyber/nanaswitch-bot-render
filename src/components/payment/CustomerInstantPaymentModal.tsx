'use client';

import React from 'react';
import { useRealtimePayment } from '@/hooks/useRealtimePayment';

interface CustomerInstantPaymentModalProps {
  orderId: string;
  amount: number;
  provider: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function CustomerInstantPaymentModal({
  orderId,
  amount,
  provider,
  onSuccess,
  onClose
}: CustomerInstantPaymentModalProps) {
  const { isCompleted, loading } = useRealtimePayment(orderId);

  // Dès que le Webhook Supabase bascule l'ordre en completed, déclencher le callback de succès
  React.useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        onSuccess();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {isCompleted ? (
          <div className="space-y-3 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-black animate-bounce">
              ✓
            </div>
            <h3 className="text-xl font-black text-slate-900">Paiement Reçu !</h3>
            <p className="text-xs text-slate-500">Votre commande a été validée avec succès. Redirection en cours...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold animate-pulse">
              📱
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Validation {provider}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Veuillez valider le débit de <strong className="text-slate-900">{amount.toLocaleString()} FCFA</strong> sur votre téléphone en saisissant votre code secret.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-3">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-700">Détection automatique 0ms en direct...</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold transition cursor-pointer"
            >
              Annuler ou changer de moyen de paiement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerInstantPaymentModal;
