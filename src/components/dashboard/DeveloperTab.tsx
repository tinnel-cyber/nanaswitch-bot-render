import React, { useState, Suspense } from 'react';
const UltimateCheckout = React.lazy<React.ComponentType<any>>(() =>
  import('../payment/UltimateCheckout').then((m) => ({ default: (m as any).UltimateCheckout || m.default }))
);
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
  Terminal,
  Info,
  Lock,
  PlusCircle,
  X
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { supabase } from '../../lib/supabase';
import type { NanaMerchantApp } from '../nanaSwitch/NanaSwitchApp';

export interface DeveloperTabProps {
  app: NanaMerchantApp;
  copyToClipboard: (text?: string, label?: string) => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
  onUpdateApp?: (updatedApp: NanaMerchantApp) => void;
}

const PAYMENT_API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:10000'
  : ((import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_PAYMENT_API_URL || 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run');

export const DeveloperTab: React.FC<DeveloperTabProps> = ({
  app,
  copyToClipboard,
  showToast,
  onUpdateApp
}) => {
  // Mode selection state: 'AGREGATED' vs 'BYOK'
  const initialMode = app.integration_config?.mode || app.integration_mode || 'AGREGATED';
  const [mode, setMode] = useState<'AGREGATED' | 'BYOK'>(initialMode);

  // NanaSwitch Cloud Keys visibility & generation
  const [showSk, setShowSk] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [justGeneratedSk, setJustGeneratedSk] = useState<string>('');

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

  const getBearerToken = async (): Promise<string> => {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || '';
    } catch {
      return '';
    }
  };

  // Génération / Rotation cryptographique réelle des clés API connectée au Routeur
  const handleGenerateKeys = async () => {
    if (!app.id) return;
    setIsGeneratingKeys(true);
    try {
      const token = await getBearerToken();
      if (!token) {
        showToast('Session expirée : reconnectez-vous pour générer vos clés API.', 'error');
        return;
      }
      const res = await fetch('/api/merchant/keys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ merchantId: app.id, mode: 'live' })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        showToast(json.error || 'Échec de la génération des clés API.', 'error');
        return;
      }
      setJustGeneratedSk(json.secretKey || '');
      const updatedKeys = {
        ...(app.keys || {}),
        pk: json.publicKey,
        publicKey: json.publicKey,
        skHash: json.skHash,
        rawSk: json.secretKey,
        whSecret: json.webhookSecret
      };
      if (onUpdateApp) {
        onUpdateApp({ ...app, keys: updatedKeys as any });
      }
      showToast('Nouvelle paire de clés API générée et synchronisée avec le routeur ! Copiez la clé secrète maintenant.', 'success');
    } catch (err) {
      showToast('Erreur réseau lors de la génération des clés : ' + (err as Error).message, 'error');
    } finally {
      setIsGeneratingKeys(false);
    }
  };

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

  // Common persistence logic: Backend Router API (Supabase merchants + universes + nanaswitch_merchants) + React State
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
      // 2. Synchronisation Routeur authentifiée par JWT Bearer (merchants + universes + nanaswitch_merchants)
      const token = await getBearerToken();
      if (token && app.id) {
        const routerRes = await fetch('/api/merchant/integration-mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            merchantId: app.id,
            mode: targetMode,
            customCredentials: updatedCustomCreds
          })
        });
        if (!routerRes.ok) {
          console.warn('[ROUTER MODE SYNC HTTP]', routerRes.status);
        }
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
          ? 'Mode BYOK activé et synchronisé avec le routeur !'
          : 'Mode Simplifié (Agrégé) activé et synchronisé avec le routeur !',
        'success'
      );
    } catch (err) {
      showToast('Erreur lors de la mise à jour des paramètres : ' + (err as Error).message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const RECHARGE_PACKS = [
    { credits: 5000, amountXof: 100, price: '100 XOF', label: 'Starter' },
    { credits: 50000, amountXof: 1000, price: '1 000 XOF', label: 'Pro Business (Recommandé)', popular: true },
    { credits: 500000, amountXof: 10000, price: '10 000 XOF', label: 'Scale Enterprise' }
  ];
  const selectedPackObj = RECHARGE_PACKS.find(p => p.credits === rechargePack) || RECHARGE_PACKS[1];

  // Ouvre le vrai tunnel de paiement UltimateCheckout avant tout crédit API (zéro crédit gratuit)
  const handleStartPaidRecharge = () => {
    setShowCheckoutModal(true);
  };

  // Crédit effectif UNIQUEMENT après confirmation de paiement réelle (onSuccess)
  const handlePaymentConfirmed = async (paymentDetails?: any) => {
    setIsRecharging(true);
    const addedCredits = selectedPackObj.credits;
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
      const authToken = typeof window !== 'undefined' ? (localStorage.getItem('nana_auth_token') || '') : '';
      try {
        await fetch(`${PAYMENT_API_BASE}/v1/switch/merchant/credits/recharge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify({
            merchantId: app.id,
            creditsAmount: addedCredits,
            transactionId: paymentDetails?.transactionId || `tx_${Date.now()}`,
            amountPaid: selectedPackObj.amountXof
          })
        });
      } catch (beErr) {
        console.warn('[RECHARGE BE NOTICE]', (beErr as Error).message);
      }

      if (db && app.id) {
        try {
          await updateDoc(doc(db, 'merchants', app.id), {
            api_credits_balance: newTotal,
            api_pricing_config: updatedApp.api_pricing_config,
            updated_at: serverTimestamp()
          });
        } catch (fsErr) {
          console.warn('[RECHARGE storage CLIENT NOTICE]', (fsErr as Error).message);
        }
      }

      showToast(`Paiement confirmé ! +${addedCredits.toLocaleString()} crédits API ajoutés à votre compte.`, 'success');
      setShowCheckoutModal(false);
      setIsRechargeModalOpen(false);
    } catch (err) {
      showToast('Erreur lors de la mise à jour des crédits : ' + (err as Error).message, 'error');
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
            Intégrations & Développeur
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
              Routeur direct avec le Routeur Dynamique Nanasore Engine. Marge commission : 0%. Débit : 0,02 XOF / requête.
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Clés API NanaSwitch connectées au Routeur</h3>
                <p className="text-[11px] text-slate-500">
                  Chaque paire de clés est enregistrée dans le routeur NanaSwitch pour l'univers <strong>{app.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                disabled={isGeneratingKeys}
                onClick={handleGenerateKeys}
                className="px-4 py-2.5 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingKeys ? 'animate-spin' : ''}`} />
                <span>{isGeneratingKeys ? 'Génération...' : (app.keys?.pk ? 'Régénérer les Clés API' : 'Générer mes Clés API')}</span>
              </button>
            </div>
            
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
                    value={app.keys?.pk || 'Aucune clé générée — cliquez sur "Générer mes Clés API"'}
                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-800 select-all"
                  />
                  {app.keys?.pk && (
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(app.keys?.pk, 'Clé Publique')} 
                      className="px-5 py-3 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Identifiant public utilisé pour initialiser le SDK ou le widget de paiement côté client.</p>
              </div>

              {/* Secret Key - Sécurisée & Accessible par commande sans affichage en clair */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Clé Secrète NanaSwitch (Secret Key)</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Chiffrée Zero-Trust (SHA-256)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input 
                      type={showSk && (justGeneratedSk || app.keys?.rawSk) ? 'text' : 'password'}
                      readOnly 
                      value={justGeneratedSk || app.keys?.rawSk || app.keys?.skHash || 'ns_live_sk_••••••••••••••••••••••••••••••••'}
                      className="w-full bg-slate-100/80 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 font-semibold"
                    />
                  </div>
                  {(justGeneratedSk || app.keys?.rawSk) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowSk((v) => !v)}
                        className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 cursor-pointer shrink-0"
                        title={showSk ? 'Masquer' : 'Afficher temporairement'}
                      >
                        {showSk ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button 
                        type="button"
                        onClick={() => copyToClipboard(justGeneratedSk || app.keys?.rawSk, 'Clé Secrète')} 
                        className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                        title="Copier la clé secrète dans le presse-papier"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copier Clé
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Par mesure de sécurité stricte, la clé secrète n'est jamais affichée en clair sur l'écran. Utilisez les commandes sécurisées ci-dessous pour l'intégrer à votre serveur.
                </p>

                {/* Commandes d'accès sécurisées pour le terminal et serveur */}
                <div className="mt-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span>Accès Sécurisé par Commande CLI / Terminal</span>
                    </div>
                  </div>

                  {/* Commande 1 : Export de variable d'environnement */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>1. Définir la variable d'environnement serveur :</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`export NANASWITCH_SECRET_KEY="${app.keys?.rawSk || 'ns_live_sk_...'}"`, 'Commande Export')}
                        className="text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        Copier commande
                      </button>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto select-all border border-slate-800">
                      export NANASWITCH_SECRET_KEY="{app.keys?.rawSk ? '••••••••••••••••••••••••••••••••' : '$VOTRE_CLE_SECRETE'}"
                    </div>
                  </div>

                  {/* Commande 2 : Requête cURL API d'exemple */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>2. Tester l'authentification avec cURL :</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`curl -X POST https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/v1/switch/session/initialize \\\n  -H "Authorization: Bearer ${app.keys?.rawSk || '$NANASWITCH_SECRET_KEY'}" \\\n  -H "x-nanaswitch-key: ${app.keys?.pk || (app.id ? `ns_live_pk_${app.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}` : '')}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount": 5000, "currency": "XOF", "merchant_id": "${app.id}"}'`, 'Commande cURL')}
                        className="text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        Copier cURL
                      </button>
                    </div>
                    <pre className="bg-slate-900 p-2.5 rounded-lg font-mono text-[10px] text-slate-300 overflow-x-auto select-all border border-slate-800 leading-relaxed">
{`curl -X POST https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/v1/switch/session/initialize \\
  -H "Authorization: Bearer \${NANASWITCH_SECRET_KEY}" \\
  -H "x-nanaswitch-key: ${app.keys?.pk ? app.keys.pk.slice(0, 16) + '...' : 'ns_live_pk_...'}" \\
  -H "Content-Type: application/json"`}
                    </pre>
                  </div>
                </div>
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
                  Vos transactions transitent directement par le Routeur Dynamique Nanasore Engine sans commission de switch. Facturation à l'usage : 0,02 XOF par transaction (décompté de votre solde de crédits).
                </p>
              </div>
            </div>

            {/* Custom Gateway Credentials Form */}
            <form onSubmit={handleSaveCredentials} className="space-y-6">
              
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                  <Server className="w-4 h-4 text-amber-600" />
                  1. Routeur Dynamique Nanasore Engine - Passerelle Principale (Mobile Money BF, Wave, etc.)
                </h4>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Clé d'API Passerelle Principale (Live Key)
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
                    placeholder="live_key_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Générée depuis votre console de routage. Les espaces superflus sont automatiquement nettoyés.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                  <Server className="w-4 h-4 text-purple-600" />
                  2. Routeur Dynamique Nanasore Engine - Passerelle Secondaire (Zone UEMOA & Hosted Checkout)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Clé Publique Passerelle Secondaire (Public Key)
                    </label>
                    <input
                      type="text"
                      value={sebpayPublicKey}
                      onChange={(e) => setSebpayPublicKey(e.target.value)}
                      placeholder="pk_live_xxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Clé Secrète Passerelle Secondaire (Secret Key)
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
                      placeholder="sk_live_xxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Requis pour l'initialisation des Hosted Sessions Checkout et l'API v1 Collections du Routeur Dynamique Nanasore Engine.
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
                onClick={handleStartPaidRecharge}
                disabled={isRecharging}
                className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isRecharging ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validation en cours...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Payer {selectedPackObj.price} & Recharger
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {showCheckoutModal && (
        <Suspense fallback={null}>
          <UltimateCheckout
            isModal={true}
            isOpen={showCheckoutModal}
            onClose={() => setShowCheckoutModal(false)}
            onCancel={() => setShowCheckoutModal(false)}
            amount={selectedPackObj.amountXof}
            currency="FCFA"
            orderDescription={`Recharge ${selectedPackObj.credits.toLocaleString()} crédits API (${selectedPackObj.label})`}
            storeName={app?.name || 'Nanasore API'}
            merchantId={app?.id}
            onSuccess={handlePaymentConfirmed}
          />
        </Suspense>
      )}

    </div>
  );
};
export default DeveloperTab;
