import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Copy,
  Zap,
  SlidersHorizontal,
  Coins,
  CheckCircle2,
  RefreshCw,
  Server,
  Layers,
  Sparkles,
  Info,
  Lock,
  PlusCircle,
  X
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import type { NanaMerchantApp } from '../nanaSwitch/NanaSwitchApp';

export interface DeveloperTabProps {
  app: NanaMerchantApp;
  copyToClipboard: (text?: string, label?: string) => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
  onUpdateApp?: (updatedApp: NanaMerchantApp) => void;
}

const PAYMENT_API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:10000'
  : 'https://nana-payment-api.onrender.com';

export const DeveloperTab: React.FC<DeveloperTabProps> = ({
  app,
  copyToClipboard,
  showToast,
  onUpdateApp
}) => {
  // Mode selection state: 'AGREGATED' vs 'BYOK'
  const initialMode = app.integration_config?.mode || app.integration_mode || 'AGREGATED';
  const [mode, setMode] = useState<'AGREGATED' | 'BYOK'>(initialMode);

  // NanaSwitch Cloud Keys visibility
  const [showSk, setShowSk] = useState(false);

  // BYOK Custom Credentials state
  const existingCredentials = app.integration_config?.custom_credentials || app.custom_credentials || {};
  const [saspayApiKey, setSaspayApiKey] = useState(existingCredentials.saspay?.api_key || '');
  const [sebpayPublicKey, setSebpayPublicKey] = useState(existingCredentials.sebpay?.public_key || '');
  const [sebpaySecretKey, setSebpaySecretKey] = useState(existingCredentials.sebpay?.secret_key || '');

  // BYOK Password toggles
  const [showSaspayKey, setShowSaspayKey] = useState(false);
  const [showSebpaySecret, setShowSebpaySecret] = useState(false);

  // Loading & Action States
  const [isSaving, setIsSaving] = useState(false);
  const [isRecharging, setIsRecharging] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargePack, setRechargePack] = useState<number>(50000);

  // API Credits balance
  const currentCredits = app.api_pricing_config?.api_credits_balance ?? app.api_credits_balance ?? 5000;

  // Handle Mode Change (Persist + reactive update)
  const handleModeSwitch = async (newMode: 'AGREGATED' | 'BYOK') => {
    setMode(newMode);
    await persistModeAndCredentials(newMode, saspayApiKey, sebpayPublicKey, sebpaySecretKey);
  };

  // Handle Save BYOK Credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistModeAndCredentials(mode, saspayApiKey, sebpayPublicKey, sebpaySecretKey);
  };

  // Common persistence logic: Firestore + Backend API + React State
  const persistModeAndCredentials = async (
    targetMode: 'AGREGATED' | 'BYOK',
    sasKey: string,
    sebPk: string,
    sebSk: string
  ) => {
    setIsSaving(true);
    const cleanSasKey = sasKey.replace(/\s+/g, '').trim();
    const cleanSebPk = sebPk.trim();
    const cleanSebSk = sebSk.trim();

    const updatedCustomCreds = {
      saspay: { api_key: cleanSasKey },
      sebpay: { public_key: cleanSebPk, secret_key: cleanSebSk }
    };

    const updatedApp: NanaMerchantApp = {
      ...app,
      integration_mode: targetMode,
      integration_config: {
        mode: targetMode,
        custom_credentials: updatedCustomCreds
      },
      custom_credentials: updatedCustomCreds
    };

    // 1. Mise à jour de l'état réactif local (zéro rechargement de page)
    if (onUpdateApp) {
      onUpdateApp(updatedApp);
    }

    try {
      // 2. Synchronisation Backend Admin SDK (Prioritaire pour contourner toute restriction de règle client)
      try {
        await fetch(`${PAYMENT_API_BASE}/v1/switch/merchant/integration-mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: app.id,
            mode: targetMode,
            customCredentials: updatedCustomCreds
          })
        });
      } catch (backendErr) {
        console.warn('[BACKEND MODE SYNC SILENT NOTICE]', (backendErr as Error).message);
      }

      // 3. Mise à jour directe Firestore côté client si disponible
      if (db && app.id) {
        try {
          await updateDoc(doc(db, 'merchants', app.id), {
            integration_mode: targetMode,
            'integration_config.mode': targetMode,
            'integration_config.custom_credentials': updatedCustomCreds,
            custom_credentials: updatedCustomCreds,
            updated_at: serverTimestamp()
          });
        } catch (rulesErr) {
          console.warn('[storage CLIENT UPDATE NOTICE]', (rulesErr as Error).message);
        }
      }

      showToast(
        targetMode === 'BYOK'
          ? 'Mode BYOK activé et clés passerelles enregistrées avec succès !'
          : 'Mode Simplifié (Agrégé) activé avec succès !',
        'success'
      );
    } catch (err) {
      showToast('Erreur lors de la mise à jour des paramètres : ' + (err as Error).message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Credits Recharge (Simulation + Backend / Firestore update)
  const handleRechargeCredits = async () => {
    setIsRecharging(true);
    const addedCredits = rechargePack;
    const newTotal = currentCredits + addedCredits;

    const updatedApp: NanaMerchantApp = {
      ...app,
      api_credits_balance: newTotal,
      api_pricing_config: {
        cost_per_request_xof: 0.02,
        api_credits_balance: newTotal,
        low_balance_threshold: 500
      }
    };

    if (onUpdateApp) {
      onUpdateApp(updatedApp);
    }

    try {
      // Backend recharge call
      try {
        await fetch(`${PAYMENT_API_BASE}/v1/switch/merchant/credits/recharge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: app.id,
            creditsAmount: addedCredits
          })
        });
      } catch (beErr) {
        console.warn('[RECHARGE BE NOTICE]', (beErr as Error).message);
      }

      // Firestore direct client update
      if (db && app.id) {
        try {
          await updateDoc(doc(db, 'merchants', app.id), {
            'api_pricing_config.api_credits_balance': newTotal,
            api_credits_balance: newTotal,
            updated_at: serverTimestamp()
          });
        } catch (fsErr) {
          console.warn('[RECHARGE storage CLIENT NOTICE]', (fsErr as Error).message);
        }
      }

      showToast(`+${addedCredits.toLocaleString()} crédits API ajoutés avec succès !`, 'success');
      setIsRechargeModalOpen(false);
    } catch (err) {
      showToast('Erreur lors de la recharge de crédits : ' + (err as Error).message, 'error');
    } finally {
      setIsRecharging(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <KeyRound className="w-7 h-7 text-[#1E40AF]" />
            Développeur & Clés API
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gérez votre mode d'intégration, vos clés d'authentification Zero-Trust et vos passerelles directes.
          </p>
        </div>

        {/* Current Active Mode Badge */}
        <div>
          {mode === 'AGREGATED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-[#1E40AF] border border-blue-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Mode Simplifié (Agrégé)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Mode BYOK (SaaS / API Router)
            </span>
          )}
        </div>
      </div>

      {/* 2. Interactive Mode Switcher (Segmented Control) */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-1.5">
        
        {/* AGREGATED BUTTON */}
        <button
          type="button"
          onClick={() => handleModeSwitch('AGREGATED')}
          disabled={isSaving}
          className={`flex items-start gap-3.5 p-4 rounded-xl text-left transition-all ${
            mode === 'AGREGATED'
              ? 'bg-white shadow-md border border-blue-200 text-slate-900 ring-2 ring-[#1E40AF]/10'
              : 'hover:bg-white/60 text-slate-600'
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${
            mode === 'AGREGATED' ? 'bg-[#1E40AF] text-white shadow-sm' : 'bg-slate-200 text-slate-600'
          }`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Mode Simplifié (Agrégé)</span>
              {mode === 'AGREGATED' && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-800">
                  Actif
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Compte Maître NanaSwitch Cloud. Aucune configuration passerelle requise. Marge retenue : +1.5%.
            </p>
          </div>
        </button>

        {/* BYOK BUTTON */}
        <button
          type="button"
          onClick={() => handleModeSwitch('BYOK')}
          disabled={isSaving}
          className={`flex items-start gap-3.5 p-4 rounded-xl text-left transition-all ${
            mode === 'BYOK'
              ? 'bg-white shadow-md border border-amber-300 text-slate-900 ring-2 ring-amber-500/10'
              : 'hover:bg-white/60 text-slate-600'
          }`}
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${
            mode === 'BYOK' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
          }`}>
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Mode BYOK (SaaS / API Router)</span>
              {mode === 'BYOK' && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-100 text-amber-800">
                  Actif
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Routeur direct avec vos propres clés SasPay & Sebpay. Marge commission : 0%. Débit : 0,02 XOF / requête.
            </p>
          </div>
        </button>
      </div>

      {/* 3. CONDITIONAL VIEW: AGREGATED MODE */}
      {mode === 'AGREGATED' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Explanatory Note Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-3xl p-5 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="p-2 bg-[#1E40AF] text-white rounded-xl shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-[#1E40AF]">
                  Transactions gérées via le compte maître NanaSwitch
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Les transactions sont traitées via le compte maître NanaSwitch. Marge retenue : <strong className="text-slate-900 font-bold">+1.5%</strong>.
                  Vous n'avez pas besoin de souscrire de contrats individuels avec les opérateurs télécoms ou agrégateurs tiers : NanaSwitch centralise la collecte et crédite instantanément votre compte marchand.
                </p>
              </div>
            </div>
          </div>

          {/* Master API Credentials Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
            
            {/* Warning Alert Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-bold">Protégez votre Clé Secrète (ns_live_sk_...)</p>
                <p className="text-amber-800 leading-relaxed font-medium">
                  Ne partagez jamais votre clé secrète dans un code côté client (frontend React, app mobile). Seul son hash SHA-256 / Bcrypt est vérifié par nos passerelles.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Public Key */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Clé Publique NanaSwitch (Public Key)
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={app.keys?.pk || 'ns_live_pk_8f93a2e1c4b70129a007b'}
                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-800 select-all"
                  />
                  <button 
                    onClick={() => copyToClipboard(app.keys?.pk || 'ns_live_pk_8f93a2e1c4b70129a007b', 'Clé Publique')} 
                    className="px-5 py-3 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copier
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Utilisée pour identifier votre marchand dans les scripts SDK ou le widget de paiement.</p>
              </div>

              {/* Secret Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Clé Secrète NanaSwitch (Secret Key)
                  </label>
                  {app.keys?.rawSk && (
                    <button 
                      onClick={() => setShowSk(!showSk)} 
                      className="text-[11px] text-[#1E40AF] hover:underline font-bold flex items-center gap-1"
                    >
                      {showSk ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showSk ? 'Masquer' : 'Afficher'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type={showSk ? 'text' : 'password'} 
                    readOnly 
                    value={app.keys?.rawSk || app.keys?.skHash || '$2a$10$e89abF...hidden'}
                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-600 font-semibold select-all"
                  />
                  {app.keys?.rawSk && (
                    <button 
                      onClick={() => copyToClipboard(app.keys?.rawSk, 'Clé Secrète')} 
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Nécessaire pour signer vos requêtes HTTP sécurisées côté serveur (Header <code>Authorization: Bearer ns_live_sk_...</code>).</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. CONDITIONAL VIEW: BYOK MODE */}
      {mode === 'BYOK' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* API Credits Metering Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-purple-500/10 border border-amber-300 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                    <Coins className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Solde du Portefeuille Crédits API SaaS
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Facturation à la consommation : <strong className="text-amber-900 font-bold">0,02 XOF par requête / transaction</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    {currentCredits.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Crédits restants
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    Opérationnel
                  </span>
                </div>
              </div>

              {/* Action Button: Recharge Credits */}
              <button
                type="button"
                onClick={() => setIsRechargeModalOpen(true)}
                className="px-5 py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-extrabold rounded-2xl text-xs transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                Recharger mon portefeuille de crédits API (0.02 XOF / requête)
              </button>
            </div>
          </div>

          {/* Direct Pass-Through Explanatory Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
            
            <div className="flex items-start gap-3.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-900">Routage Direct et Indépendance Bancaire</p>
                <p className="leading-relaxed">
                  Vos transactions transitent directement par vos propres comptes SasPay/Sebpay sans commission de switch. Facturation à l'usage : 0,02 XOF par transaction (décompté de votre solde de crédits).
                </p>
              </div>
            </div>

            {/* Custom Gateway Credentials Form */}
            <form onSubmit={handleSaveCredentials} className="space-y-6">
              
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                  <Server className="w-4 h-4 text-amber-600" />
                  1. Passerelle SasPay (Orange BF, Moov BF, Wave)
                </h4>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      SasPay API Key (Clé Maîtresse)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSaspayKey(!showSaspayKey)}
                      className="text-[11px] text-amber-700 hover:underline font-bold flex items-center gap-1"
                    >
                      {showSaspayKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showSaspayKey ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                  <input
                    type={showSaspayKey ? 'text' : 'password'}
                    value={saspayApiKey}
                    onChange={(e) => setSaspayApiKey(e.target.value)}
                    placeholder="sas_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Générée depuis votre console SasPay Dashboard. Les espaces superflus sont automatiquement nettoyés.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                  <Server className="w-4 h-4 text-purple-600" />
                  2. Passerelle Sebpay (LigdiCash, Bénin, Côte d'Ivoire, Hosted Checkout)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Sebpay Public Key
                    </label>
                    <input
                      type="text"
                      value={sebpayPublicKey}
                      onChange={(e) => setSebpayPublicKey(e.target.value)}
                      placeholder="seb_pk_live_xxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Sebpay Secret Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSebpaySecret(!showSebpaySecret)}
                        className="text-[11px] text-purple-700 hover:underline font-bold flex items-center gap-1"
                      >
                        {showSebpaySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showSebpaySecret ? 'Masquer' : 'Afficher'}
                      </button>
                    </div>
                    <input
                      type={showSebpaySecret ? 'text' : 'password'}
                      value={sebpaySecretKey}
                      onChange={(e) => setSebpaySecretKey(e.target.value)}
                      placeholder="seb_sk_live_xxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Requis pour l'initialisation des Hosted Sessions Checkout Sebpay et l'API v1 Collections.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Enregistrement en cours...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Enregistrer mes clés privées
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>

        </div>
      )}

      {/* 5. MODAL: RECHARGE CREDITS API */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Recharger les Crédits API</h3>
                  <p className="text-xs text-slate-500 font-medium">Tarif fixe : 0,02 XOF par requête API</p>
                </div>
              </div>
              <button
                onClick={() => setIsRechargeModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Packs Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Choisissez un pack de requêtes :</label>

              {[
                { credits: 5000, price: '100 XOF', label: 'Starter' },
                { credits: 50000, price: '1 000 XOF', label: 'Pro Business (Recommandé)', popular: true },
                { credits: 500000, price: '10 000 XOF', label: 'Scale Enterprise' }
              ].map((pack) => (
                <button
                  key={pack.credits}
                  type="button"
                  onClick={() => setRechargePack(pack.credits)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    rechargePack === pack.credits
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm font-mono">
                        {pack.credits.toLocaleString()} requêtes
                      </span>
                      {pack.popular && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-200 text-amber-900">
                          Populaire
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{pack.label}</span>
                  </div>
                  <span className="font-extrabold text-amber-900 text-sm">{pack.price}</span>
                </button>
              ))}
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Confirmation de commande</p>
              <p>Solde actuel : <strong className="font-mono text-slate-900">{currentCredits.toLocaleString()}</strong></p>
              <p>Nouveau solde après recharge : <strong className="font-mono text-emerald-700 font-bold">{(currentCredits + rechargePack).toLocaleString()} crédits</strong></p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRechargeModalOpen(false)}
                className="px-5 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRechargeCredits}
                disabled={isRecharging}
                className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2"
              >
                {isRecharging ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Recharge en cours...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Valider la recharge
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
export default DeveloperTab;
