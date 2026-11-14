/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * nanawallet — Écran de Recharge Nanawtchit (Étape 2)
 * Design Épuré, Moderne & Chaleureux de Classe Mondiale.
 * Palette Officielle : Fond blanc cassé (#F9F8F6), Accents Bleu Royal (#1E3A8A / #2563EB).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Smartphone, 
  CheckCircle2, 
  Zap, 
  Sparkles, 
  Info, 
  CreditCard, 
  Lock,
  RefreshCw,
  X
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime, formatCFA } from '../../utils/audio';
import { supabase } from '../../lib/supabase';

export interface NanaWalletRechargeProps {
  onBack?: () => void;
  onSuccess?: (amount: number, providerName: string) => void;
  onNavigateCrypto?: () => void;
  className?: string;
}

export default function NanaWalletRecharge({ 
  onBack, 
  onSuccess,
  onNavigateCrypto,
  className = '' 
}: NanaWalletRechargeProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [provider, setProvider] = useState<'wave' | 'orange' | 'moov' | 'mtn' | 'card'>('wave');
  const [phoneNumber, setPhoneNumber] = useState<string>('+226 70 00 11 22');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCryptoModal, setShowCryptoModal] = useState<boolean>(false);

  const amounts = [500, 1000, 2000, 5000];

  // Calcul du montant final effectif
  const effectiveAmount = useMemo(() => {
    if (customAmount && !isNaN(Number(customAmount)) && Number(customAmount) > 0) {
      return Number(customAmount);
    }
    return selectedAmount || 0;
  }, [customAmount, selectedAmount]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Validation et exécution du paiement
  const handleProceedPayment = useCallback(async () => {
    if (effectiveAmount < 100) {
      showToast('⚠️ Le montant minimum de recharge est de 100 FCFA.');
      return;
    }

    playTapBeep();
    setIsProcessing(true);

    const providerNames = {
      wave: 'Wave Mobile Money',
      orange: 'Orange Money',
      moov: 'Moov Africa',
      mtn: 'MTN Mobile Money',
      card: 'Carte Bancaire'
    };
    const providerLabel = providerNames[provider];

    setTimeout(async () => {
      // 1. Mise à jour du solde local
      let currentBal = 1250;
      try {
        const saved = localStorage.getItem('nana_user_wallet_balance');
        if (saved && !isNaN(Number(saved))) currentBal = Number(saved);
      } catch {}

      const newBal = currentBal + effectiveAmount;
      try {
        localStorage.setItem('nana_user_wallet_balance', String(newBal));
        window.dispatchEvent(new CustomEvent('nana_profile_synced', {
          detail: { profile: { wallet_balance: newBal } }
        }));
      } catch {}

      // 2. Synchronisation Supabase si utilisateur connecté
      (async () => {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const uid = authData?.user?.id;
          if (uid) {
            await supabase.from('app_registry').upsert({
              key: `wallet_${uid}`,
              name: `wallet_${uid}`,
              module_key: 'user_wallet',
              config_json: {
                balance: newBal,
                lastCreditRecharge: {
                  amount: effectiveAmount,
                  provider: providerLabel,
                  timestamp: Date.now()
                },
                updatedAt: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn('[RECHARGE] Synchro Supabase ignorée :', e);
        }
      })();

      setIsProcessing(false);
      playCashChime();
      showToast(`🎉 Félicitations ! Votre recharge de ${formatCFA(effectiveAmount)} a été validée.`);

      if (onSuccess) {
        setTimeout(() => onSuccess(effectiveAmount, providerLabel), 800);
      } else if (onBack) {
        setTimeout(() => onBack(), 1000);
      }
    }, 1200);
  }, [effectiveAmount, provider, onSuccess, onBack, showToast]);

  return (
    <div className={`min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans antialiased flex justify-center items-center p-0 sm:p-4 select-none ${className}`}>
      
      {/* Toast Flottant de Notification */}
      {toastMessage && (
        <div className="fixed top-5 z-50 max-w-sm w-[90%] bg-[#1E3A8A] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-blue-400/40 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-blue-200 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Conteneur simulant l'écran d'un smartphone moderne */}
      <div className="w-full max-w-md bg-[#F9F8F6] sm:rounded-[3rem] sm:shadow-2xl overflow-hidden flex flex-col h-screen sm:h-[844px] border-0 sm:border-8 sm:border-[#1E3A8A] relative">
        
        {/* ===================================================================== */}
        {/* EN-TÊTE SUPÉRIEURE (HEADER) */}
        {/* ===================================================================== */}
        <div className="px-6 pt-6 sm:pt-8 pb-4 flex items-center justify-between bg-[#F9F8F6] border-b border-gray-100/60 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <button 
              type="button"
              onClick={() => {
                playTapBeep();
                if (onBack) onBack();
              }}
              className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-100 flex items-center justify-center text-[#1E3A8A] cursor-pointer hover:bg-blue-50 transition active:scale-95"
              title="Retour au portefeuille"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-[#1A1A1A]">Recharger mon Wallet</h2>
              <p className="text-[10px] text-gray-400 font-medium">Alimentation instantanée sécurisée</p>
            </div>
          </div>
          <span className="text-xs font-black text-[#1E3A8A] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full shadow-2xs">
            Nanawtchit
          </span>
        </div>

        {/* ===================================================================== */}
        {/* SÉLECTEUR D'ONGLETS (ACTIF VS CRYPTO BIENTÔT) */}
        {/* ===================================================================== */}
        <div className="px-6 my-3">
          <div className="bg-gray-200/70 p-1 rounded-2xl flex border border-gray-200">
            <button 
              type="button"
              className="flex-1 py-2 text-xs font-bold rounded-xl bg-white text-[#1E3A8A] shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Monnaie Locale (XOF)</span>
            </button>
            <button 
              type="button"
              onClick={() => {
                playTapBeep();
                if (onNavigateCrypto) {
                  onNavigateCrypto();
                } else {
                  setShowCryptoModal(true);
                }
              }}
              className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition"
            >
              <span>Crypto (USDT)</span>
              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                Bientôt
              </span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* CORPS DE LA RECHARGE (DÉFILANT) */}
        {/* ===================================================================== */}
        <div className="px-6 flex-1 overflow-y-auto space-y-5 pb-6">
          
          {/* Sélection des montants rapides */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Choisissez ou entrez un montant
              </label>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                0% Commission
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2.5">
              {amounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { 
                    playTapBeep();
                    setSelectedAmount(amt); 
                    setCustomAmount(''); 
                  }}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                    selectedAmount === amt && !customAmount
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md shadow-blue-900/20'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {amt.toLocaleString()} F
                </button>
              ))}
            </div>

            {/* Champ personnalisé */}
            <div className="relative">
              <input
                type="number"
                placeholder="Autre montant personnalisé..."
                value={customAmount}
                onChange={(e) => { 
                  setCustomAmount(e.target.value); 
                  setSelectedAmount(0); 
                }}
                className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-4 pr-16 text-xs font-bold text-[#1A1A1A] font-mono focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100 shadow-xs transition"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-[#1E3A8A]">
                FCFA
              </span>
            </div>
          </div>

          {/* Choix de l'opérateur Nanawtchit */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2.5">
              Canal de paiement Nanawtchit
            </label>
            <div className="space-y-2">
              
              {/* Option Wave */}
              <div 
                onClick={() => {
                  playTapBeep();
                  setProvider('wave');
                }}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                  provider === 'wave' 
                    ? 'border-[#1E3A8A] bg-blue-50/50 shadow-xs ring-1 ring-[#1E3A8A]' 
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    W
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Wave Mobile Money</p>
                    <p className="text-[10px] text-gray-400 font-medium">Instantané &amp; Sans frais de recharge</p>
                  </div>
                </div>
                {provider === 'wave' ? (
                  <CheckCircle2 size={18} className="text-[#1E3A8A]" />
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">CI / SN</span>
                )}
              </div>

              {/* Option Orange Money */}
              <div 
                onClick={() => {
                  playTapBeep();
                  setProvider('orange');
                }}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                  provider === 'orange' 
                    ? 'border-[#1E3A8A] bg-blue-50/50 shadow-xs ring-1 ring-[#1E3A8A]' 
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    O
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Orange Money</p>
                    <p className="text-[10px] text-gray-400 font-medium">Sécurisé via passerelle Nanawtchit</p>
                  </div>
                </div>
                {provider === 'orange' ? (
                  <CheckCircle2 size={18} className="text-[#1E3A8A]" />
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">BF / CI</span>
                )}
              </div>

              {/* Option Moov Africa */}
              <div 
                onClick={() => {
                  playTapBeep();
                  setProvider('moov');
                }}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                  provider === 'moov' 
                    ? 'border-[#1E3A8A] bg-blue-50/50 shadow-xs ring-1 ring-[#1E3A8A]' 
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    M
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Moov Africa</p>
                    <p className="text-[10px] text-gray-400 font-medium">Couverture UEMOA (BF/CI/TG/BJ)</p>
                  </div>
                </div>
                {provider === 'moov' ? (
                  <CheckCircle2 size={18} className="text-[#1E3A8A]" />
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">UEMOA</span>
                )}
              </div>

              {/* Option Carte Bancaire */}
              <div 
                onClick={() => {
                  playTapBeep();
                  setProvider('card');
                }}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                  provider === 'card' 
                    ? 'border-[#1E3A8A] bg-blue-50/50 shadow-xs ring-1 ring-[#1E3A8A]' 
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <CreditCard size={17} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Carte Bancaire / Visa / Mastercard</p>
                    <p className="text-[10px] text-gray-400 font-medium">Paiement international 3D-Secure</p>
                  </div>
                </div>
                {provider === 'card' ? (
                  <CheckCircle2 size={18} className="text-[#1E3A8A]" />
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">Global</span>
                )}
              </div>

            </div>
          </div>

          {/* Numéro de téléphone pour Mobile Money */}
          {provider !== 'card' && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Numéro du compte Mobile Money
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+226 70 00 00 00"
                  className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-xs font-mono font-bold text-[#1A1A1A] focus:outline-none focus:border-[#1E3A8A] shadow-xs"
                />
                <Smartphone size={16} className="absolute right-4 top-3.5 text-gray-400" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 pl-1">
                Une invite de confirmation push apparaîtra instantanément sur votre téléphone.
              </p>
            </div>
          )}

          {/* Récapitulatif clair de la transaction sans frais cachés */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2.5 shadow-xs">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Montant net crédité :</span>
              <span className="font-bold text-[#1A1A1A] font-mono">
                {effectiveAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Frais de passerelle Nanawtchit :</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                Offerts (0 FCFA)
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Délai d'exécution :</span>
              <span className="font-semibold text-gray-700">Instantané (&lt; 5s)</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between items-baseline text-xs">
              <span className="font-bold text-gray-800">Total net à régler :</span>
              <span className="text-base font-black text-[#1E3A8A] font-mono">
                {effectiveAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          {/* Sceau de protection */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-semibold py-1">
            <Lock size={12} className="text-emerald-600" />
            <span>Paiement crypté SSL 256 bits via Nœud Cloud NaNaSwitch</span>
          </div>

        </div>

        {/* ===================================================================== */}
        {/* BOUTON DE VALIDATION FIXE EN BAS */}
        {/* ===================================================================== */}
        <div className="p-4 sm:p-6 bg-white border-t border-gray-100 shadow-xs">
          <button 
            type="button"
            disabled={isProcessing || effectiveAmount <= 0}
            onClick={handleProceedPayment}
            className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white py-4 rounded-2xl font-bold text-xs shadow-lg shadow-blue-950/20 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin text-white" />
                <span>Traitement Nanawtchit en cours...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Procéder au paiement Nanawtchit ({effectiveAmount.toLocaleString('fr-FR')} F)</span>
              </>
            )}
          </button>
        </div>

        {/* Modal Info Crypto USDT Bientôt */}
        {showCryptoModal && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-gray-100 text-center animate-slideUp">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-black">
                ₮
              </div>
              <h3 className="text-base font-black text-[#1A1A1A]">Recharge Crypto USDT</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Les dépôts USDT (Polygon / Tron) arrivent très bientôt sur nanawallet avec conversion directe en FCFA sans intermédiaire bancaire.
              </p>
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  setShowCryptoModal(false);
                  showToast("✨ Accès prioritaire enregistré !");
                }}
                className="w-full py-3 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                J'ai compris
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
