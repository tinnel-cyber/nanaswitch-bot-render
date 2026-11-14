/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NaNaSwitch Cloud — Page 8 : Portefeuille de Crédits Cloud & Facturation SaaS (/nana-switch/billing)
 * Charte graphique : Bleu Royal (#2563EB) & Blanc Pur (#FFFFFF).
 * Positionnement : Moteur Économique SaaS & Coupe-Circuit Automatique.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CreditCard, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Check, 
  X, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  FileText, 
  Clock, 
  Plus, 
  CheckCircle,
  TrendingUp,
  Server,
  Activity
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface NaNaSwitchBillingPageProps {
  onNavigate?: (path: string) => void;
}

export interface CreditPack {
  id: string;
  name: string;
  badge?: string;
  isPopular?: boolean;
  priceFcfa: number;
  credits: number;
  costPerCredit: string;
  features: string[];
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_starter',
    name: 'Pack Cloud Starter',
    badge: 'Démarrage Pro',
    priceFcfa: 5000,
    credits: 500,
    costPerCredit: '10 FCFA / requête',
    features: [
      '500 Crédits d\'Aiguillage API Multi-Pays',
      'IP Fixe Cloud Dédiée (194.163.148.22)',
      'Accès aux 8 Connecteurs Pré-Câblés',
      'Support UEMOA & Mobile Money Standard'
    ]
  },
  {
    id: 'pack_growth',
    name: 'Pack Cloud Growth',
    badge: '⭐ Le Plus Populaire',
    isPopular: true,
    priceFcfa: 15000,
    credits: 2000,
    costPerCredit: '7.5 FCFA / requête',
    features: [
      '2 000 Crédits d\'Aiguillage API Multi-Pays',
      'Auto-Failover Prioritaire 0ms Garanti',
      'Webhooks Sortants Illimités (HMAC SHA-256)',
      'Inspecteur de Requêtes en Direct (Logs)',
      'Support Prioritaire WhatsApp Développeur'
    ]
  },
  {
    id: 'pack_enterprise',
    name: 'Pack Cloud Enterprise / Agence',
    badge: 'Haute Disponibilité',
    priceFcfa: 45000,
    credits: 10000,
    costPerCredit: '4.5 FCFA / requête',
    features: [
      '10 000 Crédits d\'Aiguillage API Multi-Pays',
      'Multi-Projets & Clés Illimitées (nana_sw_live_...)',
      'Webhooks Haute Fréquence & Zero-Drop',
      'SLA Garanti 99.99% Disponibilité',
      'Accompagnement Technique & Intégration sur-mesure'
    ]
  }
];

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  packName: string;
  amountFcfa: number;
  creditsAdded: number;
  paymentMethod: string;
  status: 'PAID';
}

export const NaNaSwitchBillingPage: React.FC<NaNaSwitchBillingPageProps> = ({
  onNavigate
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const { user } = useAuth();
  const tenantId = useMemo(() => {
    return user?.storeId || user?.uid || 'merchant-demo';
  }, [user]);

  // Portefeuille de crédits
  const [creditsBalance, setCreditsBalance] = useState<number>(250);
  const [lowThresholdAlert, setLowThresholdAlert] = useState<boolean>(true);
  const lowThresholdValue = 50;

  // Modale de Recharge
  const [selectedPackForModal, setSelectedPackForModal] = useState<CreditPack | null>(null);
  const [rechargePaymentMethod, setRechargePaymentMethod] = useState<'orange' | 'moov' | 'wave' | 'card'>('orange');
  const [phoneNumber, setPhoneNumber] = useState<string>('+226 70 00 00 00');
  const [isProcessingRecharge, setIsProcessingRecharge] = useState<boolean>(false);

  // Historique des Factures
  const [invoices, setInvoices] = useState<InvoiceItem[]>([
    {
      id: 'inv_1092',
      invoiceNumber: 'INV-SW-2026-001',
      date: '12 Octobre 2026',
      packName: 'Pack Cloud Starter (500 Crédits)',
      amountFcfa: 5000,
      creditsAdded: 500,
      paymentMethod: 'Orange Money BF',
      status: 'PAID'
    },
    {
      id: 'inv_1084',
      invoiceNumber: 'INV-SW-2026-000',
      date: '05 Octobre 2026',
      packName: 'Bonus de Bienvenue Cloud (100 Crédits)',
      amountFcfa: 0,
      creditsAdded: 100,
      paymentMethod: 'Offert à l\'Ouverture',
      status: 'PAID'
    }
  ]);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // =========================================================================
  // 2. SYNCHRONISATION LOCALSTORAGE ET FIRESTORE
  // =========================================================================

  useEffect(() => {
    try {
      const localBal = localStorage.getItem(`nanaswitch_wallet_${tenantId}`);
      if (localBal !== null) {
        setCreditsBalance(Number(localBal));
      }
      const localInvoices = localStorage.getItem(`nanaswitch_invoices_${tenantId}`);
      if (localInvoices) {
        setInvoices(JSON.parse(localInvoices));
      }
    } catch (e) {
      console.warn('[NANA_SWITCH] Lecture cache billing :', e);
    }

    const syncRemote = async () => {
      try {
        const docRef = doc(db, 'switch_wallets', tenantId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.creditsBalance === 'number') {
            setCreditsBalance(data.creditsBalance);
          }
          if (Array.isArray(data.invoices)) {
            setInvoices(data.invoices);
          }
        } else {
          // Initialisation du portefeuille avec 250 crédits offerts
          await setDoc(docRef, {
            tenantId,
            creditsBalance: 250,
            circuitBreakerActive: false,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.warn('[NANA_SWITCH] Erreur sync wallet storage :', err);
      }
    };

    syncRemote();
  }, [tenantId]);

  const updateBalanceState = useCallback(async (newBalance: number, newInvoicesList?: InvoiceItem[]) => {
    setCreditsBalance(newBalance);
    try {
      localStorage.setItem(`nanaswitch_wallet_${tenantId}`, String(newBalance));
      if (newInvoicesList) {
        localStorage.setItem(`nanaswitch_invoices_${tenantId}`, JSON.stringify(newInvoicesList));
      }

      const docRef = doc(db, 'switch_wallets', tenantId);
      await setDoc(docRef, {
        tenantId,
        creditsBalance: newBalance,
        circuitBreakerActive: newBalance <= 0,
        ...(newInvoicesList ? { invoices: newInvoicesList } : {}),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('[NANA_SWITCH] Erreur update wallet :', e);
    }
  }, [tenantId]);

  // =========================================================================
  // 3. ACTIONS DE RECHARGE ET SIMULATION DE CONSOMMATION
  // =========================================================================

  const handleSimulateCreditConsumption = useCallback(() => {
    if (creditsBalance <= 0) {
      playTapBeep();
      setToastMessage('🔴 Coupe-circuit actif ! Vous n\'avez plus de crédits pour aiguiller.');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    playTapBeep();
    const next = creditsBalance - 1;
    updateBalanceState(next);
    setToastMessage(`⚡ 1 crédit consommé par le Nœud Cloud. Solde restant : ${next}`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [creditsBalance, updateBalanceState]);

  const handleConfirmRecharge = useCallback(async () => {
    if (!selectedPackForModal) return;

    playTapBeep();
    setIsProcessingRecharge(true);

    setTimeout(async () => {
      const addedCredits = selectedPackForModal.credits;
      const nextBalance = creditsBalance + addedCredits;

      const newInv: InvoiceItem = {
        id: `inv_${Date.now()}`,
        invoiceNumber: `INV-SW-2026-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
        packName: `${selectedPackForModal.name} (${addedCredits} Crédits)`,
        amountFcfa: selectedPackForModal.priceFcfa,
        creditsAdded: addedCredits,
        paymentMethod: rechargePaymentMethod.toUpperCase(),
        status: 'PAID'
      };

      const nextInvoices = [newInv, ...invoices];
      setInvoices(nextInvoices);
      await updateBalanceState(nextBalance, nextInvoices);

      setIsProcessingRecharge(false);
      setSelectedPackForModal(null);
      playValidationBeep();
      setToastMessage(`🎉 Recharge réussie ! +${addedCredits} Crédits Cloud ajoutés avec succès !`);
      setTimeout(() => setToastMessage(null), 4000);
    }, 1200);
  }, [selectedPackForModal, rechargePaymentMethod, creditsBalance, invoices, updateBalanceState]);

  // Télécharger la Facture PDF B2B
  const handleDownloadInvoice = useCallback((inv: InvoiceItem) => {
    playTapBeep();
    // Génération d'une facture imprimable / PDF en HTML Blob
    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Facture ${inv.invoiceNumber} — NaNaSwitch Cloud</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 40px; color: #0f172a; max-width: 700px; margin: auto; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: 900; color: #2563eb; }
    .badge { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 999px; font-weight: 800; font-size: 12px; }
    .details { margin: 30px 0; display: flex; justify-content: space-between; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 800; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .total { text-align: right; font-size: 18px; font-weight: 900; color: #2563eb; margin-top: 20px; }
    .footer { margin-top: 50px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">⚡ NaNaSwitch Cloud</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">SaaS de Routage d'API Multi-Pays & Haute Disponibilité</div>
    </div>
    <div style="text-align: right;">
      <span class="badge">FACTURE ACQUITTÉE ✅</span>
      <div style="font-size: 14px; font-weight: 800; margin-top: 8px;">${inv.invoiceNumber}</div>
    </div>
  </div>

  <div class="details">
    <div>
      <strong>Client :</strong><br>
      Tenant ID : ${tenantId}<br>
      Date d'émission : ${inv.date}
    </div>
    <div style="text-align: right;">
      <strong>Fournisseur :</strong><br>
      NaNaSwitch Cloud Infrastructure<br>
      Nœud Cloud IP Fixe : 194.163.148.22
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description du Service</th>
        <th>Crédits Rechargés</th>
        <th style="text-align: right;">Montant Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${inv.packName}</td>
        <td>+${inv.creditsAdded} crédits API</td>
        <td style="text-align: right; font-weight: 800;">${inv.amountFcfa.toLocaleString()} FCFA</td>
      </tr>
    </tbody>
  </table>

  <div class="total">
    Total Réglé : ${inv.amountFcfa.toLocaleString()} FCFA
  </div>

  <div class="footer">
    Facture électronique générée par NaNaSwitch Cloud (nanasore.com). TVA acquittée selon la réglementation en vigueur.
  </div>
  <script>window.print();</script>
</body>
</html>`;

    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) w.focus();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [tenantId]);

  // =========================================================================
  // 4. RENDU PRINCIPAL DU PORTEFEUILLE DE CRÉDITS & FACTURATION
  // =========================================================================

  const isCircuitBreakerTripped = creditsBalance <= 0;
  const isLowBalance = creditsBalance > 0 && creditsBalance <= lowThresholdValue;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Toast Notification Flottante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl shadow-2xl border border-blue-500/40 flex items-center gap-3 animate-slideUp">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Titre & Sous-titre de la Page */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-2">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Page 8 • Portefeuille de Crédits Cloud & Monétisation SaaS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Portefeuille de Crédits & Facturation SaaS
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Alimentez votre compte en crédits d'aiguillage API. Le coupe-circuit automatique protège votre entreprise contre les dépassements inattendus.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSimulateCreditConsumption}
            className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-extrabold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            title="Tester le décompte en temps réel"
          >
            <Zap className="w-4 h-4 text-blue-600" />
            <span>⚡ Tester Consommation (-1 Crédit)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. JAUGE PRINCIPALE DU PORTEFEUILLE DE CRÉDITS CLOUD */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-600/20 relative overflow-hidden space-y-6">
        {/* Motif lumineux de fond */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-blue-100">
                Solde de Routage Actif
              </span>
              <span className="text-xs font-bold bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-full">
                🎁 100 Crédits Offerts à l'Ouverture
              </span>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tight">
                {creditsBalance.toLocaleString()}
              </span>
              <span className="text-lg sm:text-xl font-bold text-blue-200">
                Crédits Cloud Disponibles
              </span>
            </div>

            <p className="text-xs sm:text-sm text-blue-100/80 max-w-xl">
              1 requête de routage réussie ou basculée en failover consomme 1 crédit cloud. Zéro commission prélevée sur vos flux d'argent.
            </p>
          </div>

          {/* État du Coupe-Circuit */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 w-full lg:w-auto flex-shrink-0 space-y-2 text-center lg:text-left">
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-200">
              État du Coupe-Circuit Automatique :
            </div>
            {isCircuitBreakerTripped ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500 text-white font-black text-xs shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>🔴 Routage Suspendu — Rechargez vos crédits</span>
              </div>
            ) : isLowBalance ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-black text-xs shadow-md">
                <span className="w-2 h-2 rounded-full bg-amber-950 animate-pulse" />
                <span>⚠️ Seuil Bas (&lt; 50 crédits)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>🟢 Routage Cloud Actif (Haute Disponibilité)</span>
              </div>
            )}
            <div className="text-[11px] text-blue-200/80">
              {lowThresholdAlert ? 'Alerte e-mail armée à 50 crédits' : 'Alertes désactivées'}
            </div>
          </div>
        </div>

        {/* Barre de Progression de Réserve */}
        <div className="space-y-1.5 relative z-10 pt-2 border-t border-white/15">
          <div className="flex justify-between text-xs font-semibold text-blue-200">
            <span>Niveau de Réserve Opérationnelle</span>
            <span>{Math.min(100, Math.round((creditsBalance / 1000) * 100))}% de capacité mensuelle</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isCircuitBreakerTripped ? 'bg-rose-400 w-0' : isLowBalance ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, Math.round((creditsBalance / 1000) * 100)))}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LES 3 PACKS DE RECHARGE DE CRÉDITS (BLEU ROYAL & BLANC PUR) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <span>Recharger vos Crédits de Routage & Passerelles</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choisissez le pack adapté à votre volume de transactions. Vos crédits n'expirent jamais.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`bg-white rounded-3xl border-2 p-6 sm:p-7 flex flex-col justify-between transition-all shadow-sm hover:shadow-lg relative ${
                pack.isPopular
                  ? 'border-blue-600 ring-4 ring-blue-500/10'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {pack.badge && (
                <div className="absolute -top-3 left-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                    pack.isPopular ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {pack.badge}
                  </span>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-lg font-black text-slate-900">{pack.name}</h4>
                  <div className="text-[11px] font-mono text-blue-600 font-bold mt-0.5">
                    {pack.costPerCredit}
                  </div>
                </div>

                <div className="flex items-baseline gap-2 pb-2 border-b border-slate-100">
                  <span className="text-3xl font-black text-slate-900">
                    {pack.priceFcfa.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-500">FCFA</span>
                  <span className="text-xs font-bold text-blue-600 ml-auto bg-blue-50 px-2.5 py-1 rounded-lg">
                    +{pack.credits.toLocaleString()} Crédits
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-600">
                  {pack.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSelectedPackForModal(pack);
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                    pack.isPopular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ Recharger {pack.credits.toLocaleString()} Crédits</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HISTORIQUE DES FACTURES PDF B2B TÉLÉCHARGEABLES */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Historique des Factures & Recharges Acquittées
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {invoices.length} Facture(s) B2B
          </span>
        </div>

        <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">N° Facture</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Pack & Crédits</th>
                  <th className="py-3 px-5">Moyen de Paiement</th>
                  <th className="py-3 px-5">Montant Réglé</th>
                  <th className="py-3 px-5 text-right">Téléchargement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs text-blue-700 font-bold">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {inv.date}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{inv.packName}</div>
                      <div className="text-[10px] text-emerald-600">+{inv.creditsAdded} crédits ajoutés</div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {inv.paymentMethod}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      {inv.amountFcfa === 0 ? 'Offert' : `${inv.amountFcfa.toLocaleString()} FCFA`}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(inv)}
                        className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                        title="Télécharger la facture officielle"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALE DE PAIEMENT & RECHARGE INSTANTANÉE */}
      {/* ========================================================================= */}
      {selectedPackForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border-2 border-blue-200 max-w-lg w-full p-6 space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Recharger {selectedPackForModal.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    +{selectedPackForModal.credits.toLocaleString()} Crédits d'Aiguillage Cloud
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPackForModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Montant Récapitulatif */}
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-700">Montant Total à Régler :</div>
                  <div className="text-2xl font-black text-blue-900">
                    {selectedPackForModal.priceFcfa.toLocaleString()} FCFA
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Crédits ajoutés :</div>
                  <div className="text-base font-bold text-emerald-600 font-mono">
                    +{selectedPackForModal.credits} crédits
                  </div>
                </div>
              </div>

              {/* Sélection du Moyen de Paiement */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Moyen de Paiement :
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'orange', label: 'Orange Money (BF/CI/SN)', badge: 'OM' },
                    { id: 'moov', label: 'Moov Africa (BF/CI/TG/BJ)', badge: 'MOOV' },
                    { id: 'wave', label: 'Wave (CI / SN)', badge: 'WAVE' },
                    { id: 'card', label: 'Carte Bancaire / Visa', badge: 'CARD' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setRechargePaymentMethod(m.id as any);
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        rechargePaymentMethod === m.id
                          ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="text-xs">{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Numéro de Téléphone */}
              {rechargePaymentMethod !== 'card' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800">
                    Numéro Mobile Money pour validation :
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold outline-none focus:border-blue-600 transition"
                  />
                  <p className="text-[10px] text-slate-500">
                    Vous recevrez une invite de confirmation de prélèvement sur votre mobile.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPackForModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isProcessingRecharge}
                onClick={handleConfirmRecharge}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isProcessingRecharge ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Validation en cours...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Valider & Créditer (+{selectedPackForModal.credits})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NaNaSwitchBillingPage;
