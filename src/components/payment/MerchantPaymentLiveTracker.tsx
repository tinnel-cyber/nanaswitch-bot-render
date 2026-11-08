'use client';

import React from 'react';
import { useRealtimePayment } from '@/hooks/useRealtimePayment';

interface PaymentLiveTrackerProps {
  orderId: string;
  expectedAmount: number;
  customerName?: string;
}

export function MerchantPaymentLiveTracker({ orderId, expectedAmount, customerName }: PaymentLiveTrackerProps) {
  const { paymentStatus, isCompleted, loading } = useRealtimePayment(orderId);

  return (
    <div className={`p-6 rounded-3xl border transition-all duration-500 ${
      isCompleted 
        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900' 
        : 'bg-white border-slate-200 text-slate-800'
    } shadow-lg space-y-4`}>
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Écran Caisse Temps Réel</span>
          <h3 className="text-lg font-black">{customerName || 'Client Comptoir'}</h3>
        </div>
        <div className="text-right">
          <span className="text-xl font-black">{expectedAmount.toLocaleString()} FCFA</span>
          <span className="block text-[10px] font-mono text-slate-400">Réf: {orderId.slice(0, 8)}</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/60 flex items-center gap-3">
        {loading ? (
          <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        ) : isCompleted ? (
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs animate-pulse">⏳</div>
        )}
        <div className="flex-1">
          <p className="text-xs font-bold">
            {isCompleted ? 'Paiement Confirmé avec Succès !' : 'En attente de validation Mobile Money...'}
          </p>
          <p className="text-[11px] text-slate-500">
            {isCompleted ? 'Ticket de caisse débloqué et stock décrémenté.' : 'Le client effectue le code secret sur son téléphone.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default MerchantPaymentLiveTracker;
