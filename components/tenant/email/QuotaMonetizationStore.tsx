'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Smartphone,
  Check,
  Lock,
  Gift,
  HelpCircle,
  RefreshCw
} from 'lucide-react';

export interface QuotaMonetizationStoreProps {
  currentCredits: number;
  onRecharge: (credits: number, packName: string) => void;
}

interface PackOption {
  id: string;
  name: string;
  tagline: string;
  credits: number;
  priceCFA: number;
  pricePerEmail: string;
  popular?: boolean;
  features: string[];
}

export function QuotaMonetizationStore({ currentCredits, onRecharge }: QuotaMonetizationStoreProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>('business');
  const [paymentMethod, setPaymentMethod] = useState<'orange' | 'wave' | 'moov' | 'mtn' | 'card'>('orange');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ packName: string; credits: number } | null>(null);

  const packs: PackOption[] = [
    {
      id: 'starter',
      name: 'Pack Starter',
      tagline: 'Idéal pour amorcer vos premières campagnes et relancer les paniers abandonnés.',
      credits: 500,
      priceCFA: 2500,
      pricePerEmail: '5 FCFA / e-mail',
      features: [
        '500 crédits e-mails certifiés',
        'Délivrabilité Brevo SMTP Standard',
        'Validité illimitée sans expiration',
        'Statistiques d\'ouverture et clics'
      ]
    },
    {
      id: 'business',
      name: 'Pack Business Pro 🚀',
      tagline: 'Le choix préféré des boutiques en forte croissance pour doubler leurs ventes.',
      credits: 2500,
      priceCFA: 10000,
      pricePerEmail: '4 FCFA / e-mail',
      popular: true,
      features: [
        '2 500 crédits e-mails certifiés',
        'Délivrabilité Haute Priorité Brevo',
        'Variables dynamiques {{FIRSTNAME}} illimitées',
        'Support prioritaire & optimisation anti-spam',
        'Segmentation automatique des clients VIP'
      ]
    },
    {
      id: 'enterprise',
      name: 'Pack Entreprise Élite',
      tagline: 'Pour les enseignes multi-points de vente et les opérations flash à grand volume.',
      credits: 10000,
      priceCFA: 35000,
      pricePerEmail: '3.5 FCFA / e-mail',
      features: [
        '10 000 crédits e-mails certifiés',
        'Canal Brevo Dédié ultra-rapide',
        'Accompagnement copywriting marketing',
        'Rapports d\'impact sur le Chiffre d\'Affaires',
        'Garantie boîte de réception à 99.8%'
      ]
    }
  ];

  const currentPack = packs.find(p => p.id === selectedPackId) || packs[1];

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPurchaseSuccess(null);

    // Simulation de validation de paiement Mobile Money sécurisé
    setTimeout(() => {
      setIsProcessing(false);
      onRecharge(currentPack.credits, currentPack.name);
      setPurchaseSuccess({
        packName: currentPack.name,
        credits: currentPack.credits
      });
    }, 1200);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 lg:p-8 space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Recharge Directe & Souveraine
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Boutique de Quotas & Crédits E-mails
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Achetez des packs d'e-mails sans abonnement contraignant. Vos crédits n'expirent jamais.
          </p>
        </div>

        {/* Badge solde actuel */}
        <div className="flex items-center gap-3 bg-[#FBF9F5] border border-blue-200/80 rounded-2xl p-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Solde Actuel</p>
            <p className="text-lg font-black text-slate-900 leading-none mt-0.5">
              {currentCredits.toLocaleString('fr-FR')} <span className="text-xs font-bold text-blue-600">crédits</span>
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation d'achat avec succès */}
      {purchaseSuccess && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-start gap-3 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-sm">
              Recharge validée avec succès ! +{purchaseSuccess.credits.toLocaleString('fr-FR')} crédits ajoutés à votre compte.
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Votre solde est actualisé immédiatement et disponible pour diffusion dans votre onglet Campagnes.
            </p>
          </div>
        </div>
      )}

      {/* Grille des 3 packs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packs.map((pack) => {
          const isSelected = selectedPackId === pack.id;
          return (
            <div
              key={pack.id}
              onClick={() => setSelectedPackId(pack.id)}
              className={`relative rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-2 border-blue-600 bg-blue-50/20 shadow-xl shadow-blue-600/10 ring-2 ring-blue-500/10'
                  : 'border border-slate-200 bg-[#FBF9F5]/40 hover:border-slate-300 hover:bg-white hover:shadow-md'
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-md shadow-blue-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Choix Recommandé
                </div>
              )}

              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-black text-slate-900">{pack.name}</h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                    {pack.pricePerEmail}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed min-h-[36px]">{pack.tagline}</p>

                {/* Chiffres clés */}
                <div className="mt-5 pb-5 border-b border-slate-100">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {pack.credits.toLocaleString('fr-FR')}{' '}
                    <span className="text-sm font-bold text-blue-600">crédits</span>
                  </div>
                  <div className="text-lg font-black text-blue-600 mt-1">
                    {pack.priceCFA.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">FCFA</span>
                  </div>
                </div>

                {/* Avantages listés */}
                <ul className="mt-5 space-y-2.5">
                  {pack.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`w-full py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? 'Pack Sélectionné' : 'Sélectionner ce Pack'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formulaire de Règlement Mobile Money & Paiement */}
      <div className="bg-[#FBF9F5] border border-slate-200 rounded-3xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              Mode de Règlement Direct pour {currentPack.name}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Montant total à régler : <span className="font-black text-slate-900">{currentPack.priceCFA.toLocaleString('fr-FR')} FCFA</span> (crédités instantanément)
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paiement 100% Sécurisé SSL</span>
          </div>
        </div>

        <form onSubmit={handleBuy} className="space-y-6">
          {/* Sélection opérateur */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2.5">
              Choisissez votre passerelle de règlement
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: 'orange', name: 'Orange Money', color: 'border-orange-500 text-orange-600' },
                { id: 'wave', name: 'Wave Digital', color: 'border-cyan-500 text-cyan-600' },
                { id: 'moov', name: 'Moov Money', color: 'border-blue-500 text-blue-600' },
                { id: 'mtn', name: 'MTN MoMo', color: 'border-yellow-500 text-yellow-600' },
                { id: 'card', name: 'Carte Bancaire', color: 'border-slate-500 text-slate-700' }
              ].map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setPaymentMethod(op.id as any)}
                  className={`p-3 rounded-2xl border-2 text-xs font-black transition-all text-center cursor-pointer ${
                    paymentMethod === op.id
                      ? 'border-blue-600 bg-white text-blue-600 shadow-sm ring-2 ring-blue-500/10'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {op.name}
                </button>
              ))}
            </div>
          </div>

          {/* Numéro pour le push paiement */}
          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Numéro de téléphone du compte ({paymentMethod.toUpperCase()})
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+226 XX XX XX XX / +225 XX XX XX XX"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Vous recevrez une notification de validation USSD sur votre téléphone pour autoriser le débit.
            </p>
          </div>

          {/* Bouton de confirmation */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Activation immédiate des crédits par webhook sécurisé.</span>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isProcessing ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Validation du paiement...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Régler {currentPack.priceCFA.toLocaleString('fr-FR')} FCFA & Activer {currentPack.credits} Crédits
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
