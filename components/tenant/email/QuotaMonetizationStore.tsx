'use client';

import React from 'react';
import { CreditCard, Zap, CheckCircle2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export interface QuotaMonetizationStoreProps {
  onRecharge: (amount: number, packName: string) => void;
  currentCredits?: number;
}

export function QuotaMonetizationStore({ onRecharge, currentCredits }: QuotaMonetizationStoreProps) {
  const packs = [
    { id: 'starter', name: 'Pack Starter', credits: 500, price: '2 500 FCFA', badge: 'Idéal Débutant' },
    { id: 'pro', name: 'Pack Business Pro 🚀', credits: 2500, price: '10 000 FCFA', badge: 'Le plus populaire', popular: true },
    { id: 'enterprise', name: 'Pack Enterprise', credits: 10000, price: '35 000 FCFA', badge: 'Grandes Campagnes' }
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Boutique de Recharge & Quotas</h2>
        </div>

        <div className="flex items-center gap-3">
          {typeof currentCredits === 'number' && (
            <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Solde : {currentCredits.toLocaleString('fr-FR')} crédits
            </span>
          )}
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Paiement Sécurisé Mobile Money / Carte
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
        En tant que marchand Nanasore, achetez des volumes de crédits d'envoi d'e-mails supplémentaires à la demande pour alimenter vos campagnes marketing et relances clients.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packs.map((pack) => (
          <div 
            key={pack.id}
            className={`rounded-2xl border-2 p-6 flex flex-col justify-between transition-all relative ${
              pack.popular 
                ? 'border-blue-600 bg-blue-50/20 shadow-lg ring-2 ring-blue-600/10' 
                : 'border-slate-200 bg-[#FBF9F5] hover:border-slate-300 hover:bg-white'
            }`}
          >
            {pack.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white font-extrabold text-[10px] uppercase rounded-full tracking-wider shadow">
                {pack.badge}
              </span>
            )}

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{pack.badge}</span>
              <h3 className="text-xl font-black text-slate-900">{pack.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-600">{pack.credits.toLocaleString('fr-FR')}</span>
                <span className="text-xs font-semibold text-slate-500">crédits e-mails</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200/60 mt-6 flex items-center justify-between">
              <span className="text-base font-extrabold text-slate-900">{pack.price}</span>
              <button
                type="button"
                onClick={() => onRecharge(pack.credits, pack.name)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                Acheter <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
