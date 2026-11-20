'use client';

import React, { useState } from 'react';
import { CreditCard, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import { UltimateCheckout } from '../../../src/components/payment/UltimateCheckout';

export interface EmailQuotaPack {
  id: string;
  name: string;
  credits: number;
  priceAmount: number;
  priceLabel: string;
  badge: string;
  popular?: boolean;
}

export interface QuotaMonetizationStoreProps {
  onRecharge: (amount: number, packName: string, paymentMeta?: { transactionId?: string; paymentMethod?: string; amountPaid?: number }) => void;
  currentCredits?: number;
  tenantId?: string;
  storeName?: string;
}

const QUOTA_PACKS: EmailQuotaPack[] = [
  { id: 'email_pack_starter', name: 'Pack Starter', credits: 500, priceAmount: 2500, priceLabel: '2 500 FCFA', badge: 'Idéal Débutant' },
  { id: 'email_pack_pro', name: 'Pack Business Pro', credits: 2500, priceAmount: 10000, priceLabel: '10 000 FCFA', badge: 'Le plus populaire', popular: true },
  { id: 'email_pack_enterprise', name: 'Pack Enterprise', credits: 10000, priceAmount: 35000, priceLabel: '35 000 FCFA', badge: 'Grandes Campagnes' }
];

export function QuotaMonetizationStore({
  onRecharge,
  currentCredits,
  tenantId = 'nanasore_central_hub',
  storeName = 'Nanasore E-mailing Pro',
}: QuotaMonetizationStoreProps) {
  const [selectedPack, setSelectedPack] = useState<EmailQuotaPack | null>(null);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Boutique de Recharge &amp; Quotas</h2>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {typeof currentCredits === 'number' && (
            <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Solde : {currentCredits.toLocaleString('fr-FR')} crédits
            </span>
          )}
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Paiement Réel UltimateCheckout (Mobile Money / Carte)
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
        Achetez des volumes de crédits d'envoi d'e-mails à la demande. Votre solde Supabase est crédité immédiatement après validation réelle du paiement via UltimateCheckout.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {QUOTA_PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`rounded-2xl border-2 p-5 sm:p-6 flex flex-col justify-between transition-all relative ${
              pack.popular
                ? 'border-blue-600 bg-blue-50/20 shadow-lg ring-2 ring-blue-600/10'
                : 'border-slate-200 bg-[#FBF9F5] hover:border-slate-300 hover:bg-white'
            }`}
          >
            {pack.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white font-extrabold text-[10px] uppercase rounded-full tracking-wider shadow whitespace-nowrap">
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
              <p className="text-[11px] text-slate-500">
                ≈ {Math.round(pack.priceAmount / pack.credits)} FCFA / e-mail délivré via Brevo Pro
              </p>
            </div>

            <div className="pt-5 border-t border-slate-200/60 mt-6 flex items-center justify-between gap-2">
              <span className="text-base font-extrabold text-slate-900">{pack.priceLabel}</span>
              <button
                type="button"
                onClick={() => setSelectedPack(pack)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer hover:shadow-md active:scale-95"
              >
                Payer <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Paiement Réel via UltimateCheckout (Mobile Money / Carte Bancaire) */}
      {selectedPack && (
        <div className="fixed inset-0 z-[10000]">
          <UltimateCheckout
            isModal={true}
            isOpen={Boolean(selectedPack)}
            onClose={() => setSelectedPack(null)}
            onCancel={() => setSelectedPack(null)}
            product={{
              id: selectedPack.id,
              name: `${selectedPack.name} — ${selectedPack.credits.toLocaleString('fr-FR')} crédits e-mails`,
              price: selectedPack.priceAmount,
              quantity: 1,
            }}
            amount={selectedPack.priceAmount}
            storeName={storeName}
            merchantId={tenantId}
            onSuccess={(details) => {
              const purchasedPack = selectedPack;
              setSelectedPack(null);
              onRecharge(purchasedPack.credits, purchasedPack.name, {
                transactionId: details?.transactionId,
                paymentMethod: details?.paymentMethod,
                amountPaid: details?.amount || purchasedPack.priceAmount,
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
