'use client';

import React, { useState, Suspense } from 'react';
import { CreditCard, Zap, ShieldCheck, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

// Chargement paresseux (React.lazy) pour éviter tout cycle de chunks Rollup/Vite (erreur TDZ)
const LazyUltimateCheckout = React.lazy(() =>
  import('../../../src/services/nana-switch/payment/UltimateCheckout').then((m) => ({
    default: m.UltimateCheckout || m.default,
  }))
);

export interface EmailQuotaPack {
  id: string;
  name: string;
  credits: number;
  priceAmount: number;
  priceLabel: string;
  badge: string;
  popular?: boolean;
  features: string[];
}

export interface QuotaMonetizationStoreProps {
  onRecharge: (
    amount: number,
    packName: string,
    paymentMeta?: { transactionId?: string; paymentMethod?: string; amountPaid?: number }
  ) => void;
  currentCredits?: number;
  tenantId?: string;
  storeName?: string;
}

const QUOTA_PACKS: EmailQuotaPack[] = [
  {
    id: 'email_pack_starter',
    name: 'Pack Starter',
    credits: 500,
    priceAmount: 2500,
    priceLabel: '2 500 FCFA',
    badge: 'Idéal Débutant',
    features: ['500 e-mails via Brevo Pro', 'Désinscription 1-clic RGPD', 'Tracking ouvertures & clics'],
  },
  {
    id: 'email_pack_pro',
    name: 'Pack Business Pro',
    credits: 2500,
    priceAmount: 10000,
    priceLabel: '10 000 FCFA',
    badge: 'Le plus populaire',
    popular: true,
    features: ['2 500 e-mails via Brevo Pro', 'A/B Testing & Planification', 'Domaine SPF/DKIM personnalisé'],
  },
  {
    id: 'email_pack_enterprise',
    name: 'Pack Enterprise',
    credits: 10000,
    priceAmount: 35000,
    priceLabel: '35 000 FCFA',
    badge: 'Grandes Campagnes',
    features: ['10 000 e-mails par lots rapides', 'Anti-bounce & liste suppression', 'Support prioritaire délivrabilité'],
  },
];

export function QuotaMonetizationStore({
  onRecharge,
  currentCredits,
  tenantId = 'nanasore_central_hub',
  storeName = 'Nanasore E-mailing Pro',
}: QuotaMonetizationStoreProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>('email_pack_pro');
  const [checkoutPack, setCheckoutPack] = useState<EmailQuotaPack | null>(null);

  const activePack = QUOTA_PACKS.find((p) => p.id === selectedPackId) || QUOTA_PACKS[1];

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
        Cliquez sur le pack de crédits de votre choix puis validez le paiement via <strong>UltimateCheckout</strong>. Votre solde Supabase est crédité immédiatement après confirmation.
      </p>

      {/* Grille sélectionnable des 3 packs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {QUOTA_PACKS.map((pack) => {
          const isSelected = selectedPackId === pack.id;
          return (
            <div
              key={pack.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPackId(pack.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedPackId(pack.id);
                }
              }}
              className={`rounded-2xl border-2 p-5 sm:p-6 flex flex-col justify-between transition-all relative cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/35 shadow-lg ring-4 ring-blue-600/15'
                  : 'border-slate-200 bg-[#FBF9F5] hover:border-blue-300 hover:bg-white'
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white font-extrabold text-[10px] uppercase rounded-full tracking-wider shadow whitespace-nowrap">
                  {pack.badge}
                </span>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{pack.badge}</span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                      <CheckCircle2 className="w-3 h-3" /> Sélectionné
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-black text-slate-900">{pack.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-blue-600">{pack.credits.toLocaleString('fr-FR')}</span>
                  <span className="text-xs font-semibold text-slate-500">crédits e-mails</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  ≈ {Math.round(pack.priceAmount / pack.credits)} FCFA / e-mail délivré via Brevo Pro
                </p>

                <ul className="space-y-1.5 pt-2">
                  {pack.features.map((feat) => (
                    <li key={feat} className="text-[11px] text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-5 border-t border-slate-200/60 mt-6 flex items-center justify-between gap-2">
                <span className="text-base font-extrabold text-slate-900">{pack.priceLabel}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPackId(pack.id);
                    setCheckoutPack(pack);
                  }}
                  className={`px-4 py-2.5 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-900 hover:bg-blue-600 text-white'
                  }`}
                >
                  Choisir &amp; Payer <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre récapitulative du plan sélectionné */}
      <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-blue-700">Plan de quota sélectionné</p>
          <p className="text-sm font-black text-slate-900">
            {activePack.name} — {activePack.credits.toLocaleString('fr-FR')} crédits ({activePack.priceLabel})
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCheckoutPack(activePack)}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <CreditCard className="w-4 h-4" />
          <span>Payer {activePack.priceLabel} via UltimateCheckout</span>
        </button>
      </div>

      {/* Paiement Réel via UltimateCheckout (chargé en lazy pour zéro cycle Rollup) */}
      {checkoutPack && (
        <div className="fixed inset-0 z-[10000]">
          <Suspense
            fallback={
              <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center">
                <div className="bg-white rounded-2xl px-5 py-4 flex items-center gap-2.5 text-xs font-bold text-slate-800 shadow-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Ouverture du paiement sécurisé UltimateCheckout...</span>
                </div>
              </div>
            }
          >
            <LazyUltimateCheckout
              isModal={true}
              isOpen={Boolean(checkoutPack)}
              onClose={() => setCheckoutPack(null)}
              onCancel={() => setCheckoutPack(null)}
              product={{
                id: checkoutPack.id,
                name: `${checkoutPack.name} — ${checkoutPack.credits.toLocaleString('fr-FR')} crédits e-mails`,
                price: checkoutPack.priceAmount,
                quantity: 1,
              }}
              amount={checkoutPack.priceAmount}
              storeName={storeName}
              merchantId={tenantId}
              onSuccess={(details: any) => {
                const purchasedPack = checkoutPack;
                setCheckoutPack(null);
                onRecharge(purchasedPack.credits, purchasedPack.name, {
                  transactionId: details?.transactionId,
                  paymentMethod: details?.paymentMethod,
                  amountPaid: details?.amount || purchasedPack.priceAmount,
                });
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
