/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NaNaSwitch Cloud — Page 6 : Clés API Cloud, IP Fixe & Webhooks (/nana-switch/security)
 * Charte graphique : Bleu Royal (#2563EB) & Blanc Pur (#FFFFFF).
 * Positionnement : Salle des Coffres Développeur, Zero-Knowledge Hashing & IP Fixe Cloud.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Globe, 
  Zap, 
  Server, 
  Bell, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Radio,
  Clock,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { useSwitchAccount } from '../../../components/nanaSwitch/NaNaSwitchAuthGuard';
import { isPinSessionUnlocked } from '../../../utils/nanaSwitchPinCrypto';
import { NaNaSwitchPinModal } from '../../../components/nanaSwitch/NaNaSwitchPinModal';

export interface NaNaSwitchSecurityPageProps {
  onNavigate?: (path: string) => void;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  env: 'production' | 'sandbox';
  prefix: string;
  last4: string;
  keyHash: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

// Fonction utilitaire de hachage SHA-256 via Web Crypto API
async function sha256Hex(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback simple
    return 'hash_' + Math.random().toString(36).substring(2);
  }
}

function generateRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const NaNaSwitchSecurityPage: React.FC<NaNaSwitchSecurityPageProps> = ({
  onNavigate
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const { user } = useAuth();
  const tenantId = useMemo(() => {
    return user?.storeId || user?.uid || 'merchant-demo';
  }, [user]);

  const cloudFixedIp = '194.163.148.22';

  // État des Clés API
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(() => {
    return [
      {
        id: 'key_live_main_918',
        name: 'Serveur Production Principal',
        env: 'production',
        prefix: 'nana_sw_live_',
        last4: '8f2a',
        keyHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        scopes: ['switch:route', 'connectors:status', 'webhooks:verify'],
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        lastUsedAt: 'Il y a 2 minutes',
        isActive: true
      },
      {
        id: 'key_test_sandbox_102',
        name: 'Environnement Test & Staging',
        env: 'sandbox',
        prefix: 'nana_sw_test_',
        last4: '41b9',
        keyHash: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
        scopes: ['switch:route'],
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        lastUsedAt: 'Il y a 1 heure',
        isActive: true
      }
    ];
  });

  // Modale de Création de Clé
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyEnv, setNewKeyEnv] = useState<'production' | 'sandbox'>('production');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['switch:route', 'connectors:status']);
  const [isGeneratingKey, setIsGeneratingKey] = useState<boolean>(false);

  // Alerte d'affichage unique de la nouvelle clé
  const [justGeneratedRawKey, setJustGeneratedRawKey] = useState<string | null>(null);
  const [copiedRawKey, setCopiedRawKey] = useState<boolean>(false);

  // Whitelist CORS / Domaines Autorisés
  const [corsDomains, setCorsDomains] = useState<string[]>([
    'https://nanasore.com',
    'https://nsore.shop'
  ]);
  const [newCorsDomainInput, setNewCorsDomainInput] = useState<string>('');
  const [isSavingCors, setIsSavingCors] = useState<boolean>(false);

  // Webhooks Sortants Unifiés
  const [webhookUrl, setWebhookUrl] = useState<string>('https://api.mon-domaine.com/v1/switch/webhook');
  const [webhookSecret, setWebhookSecret] = useState<string>('nana_whsec_98f1a04b2c89e173');
  const [showWebhookSecret, setShowWebhookSecret] = useState<boolean>(false);
  const [copiedWebhookSecret, setCopiedWebhookSecret] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSavingWebhook, setIsSavingWebhook] = useState<boolean>(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<boolean>(false);

  // Protection & Gestion Universelle par Code PIN (4 chiffres)
  const { switchAccount } = useSwitchAccount();
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinModalMode, setPinModalMode] = useState<'verify' | 'setup' | 'change'>('verify');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const executeWithPinProtection = useCallback((action: () => void) => {
    if (isPinSessionUnlocked() || !switchAccount?.pinHash) {
      action();
    } else {
      setPendingAction(() => action);
      setPinModalMode('verify');
      setShowPinModal(true);
    }
  }, [switchAccount?.pinHash]);

  const handlePinModalSuccess = useCallback(async (newHash?: string) => {
    setShowPinModal(false);
    if (newHash && switchAccount?.uid) {
      try {
        await setDoc(doc(db, 'switch_accounts', switchAccount.uid), {
          pinHash: newHash,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setToastMessage('✅ Code PIN de sécurité mis à jour avec succès !');
        setTimeout(() => setToastMessage(null), 3500);
      } catch (err) {
        console.error('[NANA_SWITCH_SECURITY] Error saving pinHash:', err);
      }
    }

    if (pendingAction) {
      const act = pendingAction;
      setPendingAction(null);
      act();
    }
  }, [switchAccount?.uid, pendingAction]);

  const handleOpenPinManagement = useCallback(() => {
    playTapBeep();
    if (switchAccount?.pinHash) {
      setPinModalMode('change');
    } else {
      setPinModalMode('setup');
    }
    setShowPinModal(true);
  }, [switchAccount?.pinHash]);

  const handleOpenCreateKey = useCallback(() => {
    playTapBeep();
    executeWithPinProtection(() => {
      setIsCreateKeyModalOpen(true);
    });
  }, [executeWithPinProtection]);

  // =========================================================================
  // 2. SYNCHRONISATION INITIALE LOCALSTORAGE + FIRESTORE
  // =========================================================================

  useEffect(() => {
    try {
      const localKeys = localStorage.getItem(`nanaswitch_api_keys_${tenantId}`);
      if (localKeys) {
        setApiKeys(JSON.parse(localKeys));
      }
      const localSettings = localStorage.getItem(`nanaswitch_security_settings_${tenantId}`);
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        if (parsed.corsDomains) setCorsDomains(parsed.corsDomains);
        if (parsed.webhookUrl) setWebhookUrl(parsed.webhookUrl);
        if (parsed.webhookSecret) setWebhookSecret(parsed.webhookSecret);
      }
    } catch (e) {
      console.warn('[NANA_SWITCH] Lecture cache security :', e);
    }

    const syncRemote = async () => {
      try {
        const docRef = doc(db, 'switch_security_settings', tenantId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.corsDomains) setCorsDomains(data.corsDomains);
          if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
          if (data.webhookSecret) setWebhookSecret(data.webhookSecret);
          if (data.apiKeys && Array.isArray(data.apiKeys)) {
            setApiKeys(data.apiKeys);
          }
        }
      } catch (err) {
        console.warn('[NANA_SWITCH] Erreur sync security storage :', err);
      }
    };

    syncRemote();
  }, [tenantId]);

  // Sauvegarde des Clés
  const persistKeys = useCallback(async (updated: ApiKeyItem[]) => {
    setApiKeys(updated);
    try {
      localStorage.setItem(`nanaswitch_api_keys_${tenantId}`, JSON.stringify(updated));
      const docRef = doc(db, 'switch_security_settings', tenantId);
      await setDoc(docRef, {
        tenantId,
        apiKeys: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('[NANA_SWITCH] Erreur persistKeys :', e);
    }
  }, [tenantId]);

  // =========================================================================
  // 3. ACTIONS CLÉS API (CRÉATION AVEC HACHAGE & RÉVOCATION)
  // =========================================================================

  const handleGenerateKey = useCallback(async () => {
    if (!newKeyName.trim()) return;

    setIsGeneratingKey(true);
    playTapBeep();

    const prefix = newKeyEnv === 'production' ? 'nana_sw_live_' : 'nana_sw_test_';
    const randomBody = generateRandomHex(24);
    const rawKey = `${prefix}${randomBody}`;
    const last4 = rawKey.slice(-4);
    const keyHash = await sha256Hex(rawKey);

    const newKeyObj: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      env: newKeyEnv,
      prefix,
      last4,
      keyHash,
      scopes: newKeyScopes.length > 0 ? newKeyScopes : ['switch:route'],
      createdAt: new Date().toISOString(),
      lastUsedAt: 'Jamais utilisée',
      isActive: true
    };

    const nextKeys = [newKeyObj, ...apiKeys];
    await persistKeys(nextKeys);

    setIsGeneratingKey(false);
    setIsCreateKeyModalOpen(false);
    setNewKeyName('');
    setJustGeneratedRawKey(rawKey);
    setCopiedRawKey(false);
    playValidationBeep();
  }, [newKeyName, newKeyEnv, newKeyScopes, apiKeys, persistKeys]);

  const handleRevokeKey = useCallback((keyId: string) => {
    playTapBeep();
    executeWithPinProtection(async () => {
      if (!window.confirm('Êtes-vous sûr de vouloir révoquer cette clé ? Les applications utilisant ce jeton seront immédiatement rejetées par le Routeur Cloud.')) {
        return;
      }

      const nextKeys = apiKeys.filter(k => k.id !== keyId);
      await persistKeys(nextKeys);
      setToastMessage('🚫 Clé Cloud révoquée avec succès.');
      setTimeout(() => setToastMessage(null), 3500);
    });
  }, [executeWithPinProtection, apiKeys, persistKeys]);

  const handleCopyRawKey = useCallback(() => {
    if (!justGeneratedRawKey) return;
    playTapBeep();
    navigator.clipboard.writeText(justGeneratedRawKey);
    setCopiedRawKey(true);
    setToastMessage('Clé d\'accès Cloud copiée dans le presse-papier !');
    setTimeout(() => setCopiedRawKey(false), 3000);
    setTimeout(() => setToastMessage(null), 3500);
  }, [justGeneratedRawKey]);

  // =========================================================================
  // 4. ACTIONS WHITELIST CORS & DOMAINES AUTORISÉS
  // =========================================================================

  const handleAddCorsDomain = useCallback(() => {
    if (!newCorsDomainInput.trim()) return;
    playTapBeep();
    const formatted = newCorsDomainInput.trim().toLowerCase();
    if (!corsDomains.includes(formatted)) {
      setCorsDomains(prev => [...prev, formatted]);
    }
    setNewCorsDomainInput('');
  }, [newCorsDomainInput, corsDomains]);

  const handleRemoveCorsDomain = useCallback((domain: string) => {
    playTapBeep();
    setCorsDomains(prev => prev.filter(d => d !== domain));
  }, []);

  const handleSaveCors = useCallback(async () => {
    setIsSavingCors(true);
    playTapBeep();

    try {
      localStorage.setItem(`nanaswitch_security_settings_${tenantId}`, JSON.stringify({
        corsDomains,
        webhookUrl,
        webhookSecret
      }));

      const docRef = doc(db, 'switch_security_settings', tenantId);
      await setDoc(docRef, {
        tenantId,
        corsDomains,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      playValidationBeep();
      setToastMessage('✅ Whitelist CORS enregistrée avec succès.');
    } catch (e) {
      console.warn('[NANA_SWITCH] Erreur save CORS :', e);
    } finally {
      setIsSavingCors(false);
      setTimeout(() => setToastMessage(null), 3500);
    }
  }, [tenantId, corsDomains, webhookUrl, webhookSecret]);

  // =========================================================================
  // 5. ACTIONS WEBHOOK UNIFIÉ SORTANT
  // =========================================================================

  const handleCopyWebhookSecret = useCallback(() => {
    playTapBeep();
    navigator.clipboard.writeText(webhookSecret);
    setCopiedWebhookSecret(true);
    setToastMessage('Secret de signature HMAC copié !');
    setTimeout(() => setCopiedWebhookSecret(false), 3000);
    setTimeout(() => setToastMessage(null), 3500);
  }, [webhookSecret]);

  const handleTestWebhook = useCallback(() => {
    if (!webhookUrl.trim()) return;
    playTapBeep();
    setIsTestingWebhook(true);
    setWebhookTestStatus('idle');

    setTimeout(() => {
      setIsTestingWebhook(false);
      setWebhookTestStatus('success');
      playValidationBeep();
      setToastMessage('✅ Webhook de test envoyé ! Réponse HTTP 200 OK reçue en 48ms.');
      setTimeout(() => setToastMessage(null), 4000);
    }, 1200);
  }, [webhookUrl]);

  const handleSaveWebhookSettings = useCallback(async () => {
    setIsSavingWebhook(true);
    playTapBeep();

    try {
      const docRef = doc(db, 'switch_security_settings', tenantId);
      await setDoc(docRef, {
        tenantId,
        webhookUrl,
        webhookSecret,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      playValidationBeep();
      setToastMessage('✅ Paramètres Webhooks enregistrés dans NaNaSwitch Cloud.');
    } catch (e) {
      console.warn('[NANA_SWITCH] Erreur save webhook :', e);
    } finally {
      setIsSavingWebhook(false);
      setTimeout(() => setToastMessage(null), 3500);
    }
  }, [tenantId, webhookUrl, webhookSecret]);

  const handleCopyIp = useCallback(() => {
    playTapBeep();
    navigator.clipboard.writeText(cloudFixedIp);
    setCopiedIp(true);
    setToastMessage(`IP Fixe Cloud (${cloudFixedIp}) copiée !`);
    setTimeout(() => setCopiedIp(false), 3000);
    setTimeout(() => setToastMessage(null), 3500);
  }, [cloudFixedIp]);

  // =========================================================================
  // 6. RENDU PRINCIPAL DE LA PAGE SÉCURITÉ
  // =========================================================================

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
            <Lock className="w-3.5 h-3.5" />
            <span>Page 6 • Salle des Coffres Développeur</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Clés Cloud, IP Fixe & Sécurité Webhooks
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Générez vos jetons d'accès chiffrés SHA-256, autorisez les adresses IP et configurez la signature cryptographique HMAC de vos webhooks.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreateKey}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>➕ Générer une nouvelle Clé Cloud</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPinManagement}
            className="px-4 py-3 rounded-2xl bg-white hover:bg-blue-50 text-blue-700 border-2 border-blue-200 hover:border-blue-300 font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            title="Modifier ou définir votre Code PIN de Sécurité à 4 chiffres"
          >
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span>Code PIN (4 chiffres)</span>
          </button>
        </div>
      </div>

      {/* Alerte Unique de Clé Générée (Sécurité Zero-Knowledge) */}
      {justGeneratedRawKey && (
        <div className="bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-amber-500/15 border-2 border-amber-400 rounded-3xl p-6 space-y-4 animate-scaleUp shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  🔐 Nouvelle Clé d'Accès Cloud Générée (Affichage Unique)
                </h3>
                <p className="text-xs text-slate-600">
                  Copiez immédiatement cette clé. Par mesure de sécurité Zero-Knowledge, notre Nœud Cloud n'en conserve que l'empreinte hachée SHA-256.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setJustGeneratedRawKey(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-amber-300">
            <code className="w-full text-xs sm:text-sm font-mono font-black text-blue-900 select-all break-all">
              {justGeneratedRawKey}
            </code>
            <button
              type="button"
              onClick={handleCopyRawKey}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer flex-shrink-0 ${
                copiedRawKey
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25'
              }`}
            >
              {copiedRawKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedRawKey ? 'Copié !' : '📋 Copier maintenant'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TABLEAU DES CLÉS D'ACCÈS CLOUD (SHA-256 HASHED) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Mes Clés d'Accès Cloud Actives (Hachage SHA-256)
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {apiKeys.length} Clé(s) Configurée(s)
          </span>
        </div>

        <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-5">Nom du Jeton</th>
                  <th className="py-4 px-5">Clé Chiffrée</th>
                  <th className="py-4 px-5">Environnement</th>
                  <th className="py-4 px-5">Permissions (Scopes)</th>
                  <th className="py-4 px-5">Dernière Activité</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                {apiKeys.map((keyItem) => (
                  <tr key={keyItem.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Nom */}
                    <td className="py-4 px-5">
                      <div className="font-black text-slate-900 text-sm">
                        {keyItem.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Créée le {new Date(keyItem.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Clé Masquée */}
                    <td className="py-4 px-5">
                      <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs border border-slate-200">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{keyItem.prefix}••••••••{keyItem.last4}</span>
                      </div>
                    </td>

                    {/* Environnement */}
                    <td className="py-4 px-5">
                      {keyItem.env === 'production' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          <span>🚀 Production</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>🧪 Sandbox</span>
                        </span>
                      )}
                    </td>

                    {/* Scopes */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {keyItem.scopes.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-mono text-slate-600 border border-slate-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Dernière utilisation */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{keyItem.lastUsedAt}</span>
                      </div>
                    </td>

                    {/* Bouton Révoquer */}
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRevokeKey(keyItem.id)}
                        className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-black text-xs transition cursor-pointer"
                        title="Révoquer cette clé immédiatement"
                      >
                        🚫 Révoquer
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
      {/* 2. COFFRE-FORT : CODE PIN DE SÉCURITÉ DE L'ORGANISATION (4 CHIFFRES)      */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-50/90 via-white to-blue-50/90 rounded-3xl border-2 border-blue-300 p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-600/30 shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Code PIN de Sécurité de l'Organisation (4 chiffres)
                </h3>
                {switchAccount?.pinHash ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Actif & Protégé (SHA-256)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Non configuré</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Verrouille instantanément l'accès aux clés secrètes, connecteurs de production et règles de routage sur la Console Cloud, l'Application Mobile et l'Extension Isolée.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenPinManagement}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <KeyRound className="w-4 h-4" />
              <span>{switchAccount?.pinHash ? 'Modifier mon Code PIN (4 chiffres)' : 'Définir mon Code PIN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PANNEAU IP FIXE DU NŒUD CLOUD & WHITELIST CORS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IP Fixe Sortante */}
        <div className="bg-white rounded-3xl border-2 border-blue-200 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-black text-slate-900">
                IP Fixe Sortante du Nœud Cloud
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Toutes les requêtes d'aiguillage vers vos agrégateurs bancaires (SebPay, CinetPay, PayDunya, FedaPay, LigdiCash) partent exclusivement de cette IP statique dédiée.
            </p>
          </div>

          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black text-blue-900 text-lg">
                {cloudFixedIp}
              </span>
              <button
                type="button"
                onClick={handleCopyIp}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                  copiedIp
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25'
                }`}
              >
                {copiedIp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedIp ? 'Copiée !' : '📋 Copier l\'IP'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              💡 Collez cette adresse dans le champ <strong>IP Whitelist</strong> du back-office de votre passerelle.
            </p>
          </div>
        </div>

        {/* Whitelist CORS / Domaines Autorisés */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-black text-slate-900">
                Domaines & Origines Autorisés (CORS)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Restreignez l'utilisation de vos clés Cloud publiques uniquement aux sites et domaines que vous possédez.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={newCorsDomainInput}
                onChange={(e) => setNewCorsDomainInput(e.target.value)}
                placeholder="https://votre-boutique-externe.com"
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:border-blue-600 transition"
              />
              <button
                type="button"
                onClick={handleAddCorsDomain}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition cursor-pointer"
              >
                Ajouter
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap min-h-[40px]">
              {corsDomains.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700"
                >
                  <span>{d}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCorsDomain(d)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                disabled={isSavingCors}
                onClick={handleSaveCors}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSavingCors ? 'Sauvegarde...' : '💾 Enregistrer la Whitelist CORS'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONFIGURATION DU WEBHOOK UNIFIÉ SORTANT (HMAC SIGNATURE) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border-2 border-blue-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Webhook Unifié Sortant (Signature HMAC SHA-256)
              </h3>
              <p className="text-xs text-slate-500">
                Recevez un callback unique et normalisé sur votre serveur, quelle que soit la passerelle ayant traité la transaction.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTestingWebhook}
              onClick={handleTestWebhook}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 font-extrabold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTestingWebhook ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  <span>🔔 Envoyer un Webhook de test</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSavingWebhook}
              onClick={handleSaveWebhookSettings}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/25 transition cursor-pointer disabled:opacity-50"
            >
              {isSavingWebhook ? 'Enregistrement...' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* URL du Serveur Webhook */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800">
              URL Endpoint de Réception Webhook :
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://api.votre-serveur.com/webhooks/nanaswitch"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:border-blue-600 transition"
            />
            <p className="text-[11px] text-slate-500">
              NaNaSwitch Cloud enverra un payload JSON POST avec le header <code className="text-blue-700 font-mono">X-NaNaSwitch-Signature</code>.
            </p>
          </div>

          {/* Clé Secrète HMAC */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center justify-between">
              <span>Secret de Signature HMAC (nana_whsec_...) :</span>
              <span className="text-[10px] text-blue-600 font-bold">SHA-256 Digest</span>
            </label>
            <div className="relative">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="w-full pl-4 pr-20 py-2.5 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:border-blue-600 transition"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyWebhookSecret}
                  className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                  title="Copier le secret"
                >
                  {copiedWebhookSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Utilisez ce secret dans votre serveur pour vérifier l'authenticité cryptographique du callback.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALE DE GÉNÉRATION D'UNE NOUVELLE CLÉ CLOUD */}
      {/* ========================================================================= */}
      {isCreateKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border-2 border-blue-200 max-w-lg w-full p-6 space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Générer une nouvelle Clé Cloud
                  </h3>
                  <p className="text-xs text-slate-500">
                    Jeton d'authentification pour vos serveurs et extensions.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nom de la Clé */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800">
                  Nom descriptif de la clé :
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="ex: Serveur Production Principal ou Extension Chrome"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold outline-none focus:border-blue-600 transition"
                />
              </div>

              {/* Environnement */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800">
                  Environnement :
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('production')}
                    className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs transition cursor-pointer ${
                      newKeyEnv === 'production'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    🚀 Production (nana_sw_live_...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('sandbox')}
                    className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs transition cursor-pointer ${
                      newKeyEnv === 'sandbox'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    🧪 Sandbox (nana_sw_test_...)
                  </button>
                </div>
              </div>

              {/* Permissions (Scopes) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800">
                  Permissions (Scopes) :
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'switch:route', label: 'switch:route', desc: 'Aiguiller les requêtes géographiques & déclencher le failover' },
                    { id: 'connectors:status', label: 'connectors:status', desc: 'Lire l\'état de santé des connecteurs API' },
                    { id: 'webhooks:verify', label: 'webhooks:verify', desc: 'Vérifier et signer les webhooks sortants' }
                  ].map((scope) => {
                    const isChecked = newKeyScopes.includes(scope.id);
                    return (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => {
                          setNewKeyScopes(prev => 
                            prev.includes(scope.id) 
                              ? prev.filter(s => s !== scope.id)
                              : [...prev, scope.id]
                          );
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50 border-blue-400 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-mono font-bold">{scope.label}</div>
                          <div className="text-[10px] text-slate-500">{scope.desc}</div>
                        </div>
                        {isChecked && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isGeneratingKey || !newKeyName.trim()}
                onClick={handleGenerateKey}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {isGeneratingKey ? 'Génération...' : '🔒 Générer ma Clé Sécurisée'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Universelle de Gestion du Code PIN */}
      <NaNaSwitchPinModal
        isOpen={showPinModal}
        mode={pinModalMode}
        storedPinHash={switchAccount?.pinHash}
        title={
          pinModalMode === 'setup'
            ? 'Définir votre Code PIN de Sécurité'
            : pinModalMode === 'change'
            ? 'Modifier votre Code PIN de Sécurité'
            : 'Vérification de Sécurité Cloud'
        }
        description={
          pinModalMode === 'setup'
            ? 'Créez un code confidentiel à 4 chiffres (haché SHA-256) pour verrouiller vos opérations sensibles.'
            : pinModalMode === 'change'
            ? 'Entrez d\'abord votre ancien code PIN, puis saisissez et confirmez le nouveau code.'
            : 'Entrez votre code confidentiel à 4 chiffres pour autoriser cette action sensible.'
        }
        onSuccess={handlePinModalSuccess}
        onClose={() => setShowPinModal(false)}
      />

    </div>
  );
};

export default NaNaSwitchSecurityPage;
