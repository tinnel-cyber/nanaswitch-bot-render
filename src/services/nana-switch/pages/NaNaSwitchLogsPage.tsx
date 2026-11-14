/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NaNaSwitch Cloud — Page 7 : Simulateur Sandbox & Terminal d'Audit Temps Réel (/nana-switch/logs)
 * Charte graphique : Bleu Royal (#2563EB) & Blanc Pur (#FFFFFF).
 * Positionnement : Routeur SaaS Cloud Intelligent & Live Request Inspector.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Terminal, 
  Key, 
  ShieldCheck, 
  Zap, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  ArrowRight, 
  Filter, 
  Clock, 
  Radio, 
  FileCode, 
  X, 
  ChevronRight, 
  Server, 
  Code,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface NaNaSwitchLogsPageProps {
  onNavigate?: (path: string) => void;
}

export interface RouteLogItem {
  id: string;
  timestamp: string;
  countryCode: string;
  countryFlag: string;
  countryName: string;
  amount: number;
  currency: string;
  primaryConnector: string;
  executedConnector: string;
  isFailover: boolean;
  statusCode: number;
  statusLabel: string;
  latencyMs: number;
  requestPayload: any;
  cloudDecision: any;
  normalizedResponse: any;
}

const INITIAL_LOGS: RouteLogItem[] = [
  {
    id: 'req_sw_984102',
    timestamp: '16:42:09',
    countryCode: 'BF',
    countryFlag: '🇧🇫',
    countryName: 'Burkina Faso',
    amount: 15000,
    currency: 'XOF',
    primaryConnector: 'SebPay API',
    executedConnector: 'SebPay Direct',
    isFailover: false,
    statusCode: 200,
    statusLabel: '200 OK',
    latencyMs: 38,
    requestPayload: {
      amount: 15000,
      currency: 'XOF',
      country: 'BF',
      customer: { phone: '+22670123456', name: 'Alassane Sawadogo' },
      metadata: { orderId: 'CMD_BF_99182' }
    },
    cloudDecision: {
      clientIp: '197.239.84.12',
      detectedCountry: 'BF',
      resolvedRule: 'RULE_BF_PRIMARY',
      primaryTarget: 'sebpay',
      failoverActive: true,
      failoverFallback: 'cinetpay',
      dispatchNode: '194.163.148.22'
    },
    normalizedResponse: {
      status: 'SUCCESS',
      transactionId: 'tx_sebpay_884910',
      routedVia: 'SebPay Direct',
      gatewayResponse: 'HTTP 200 OK',
      authCode: 'AUTH_OM_849204',
      switchLatencyMs: 38
    }
  },
  {
    id: 'req_sw_984099',
    timestamp: '16:41:45',
    countryCode: 'CI',
    countryFlag: '🇨🇮',
    countryName: 'Côte d’Ivoire',
    amount: 25000,
    currency: 'XOF',
    primaryConnector: 'CinetPay Hub',
    executedConnector: 'PayDunya Core (Secours Auto-Failover)',
    isFailover: true,
    statusCode: 200,
    statusLabel: '200 Failover Recovered',
    latencyMs: 142,
    requestPayload: {
      amount: 25000,
      currency: 'XOF',
      country: 'CI',
      customer: { phone: '+22507012345', name: 'Fatou Bamba' },
      metadata: { orderId: 'CMD_CI_88301' }
    },
    cloudDecision: {
      clientIp: '41.207.24.18',
      detectedCountry: 'CI',
      resolvedRule: 'RULE_CI_PRIMARY',
      primaryTarget: 'cinetpay',
      primaryError: '504 Gateway Timeout (CinetPay node latency > 5s)',
      failoverTriggered: true,
      failoverTarget: 'paydunya',
      dispatchNode: '194.163.148.22'
    },
    normalizedResponse: {
      status: 'SUCCESS',
      transactionId: 'tx_paydunya_77491',
      routedVia: 'PayDunya Core (Auto-Failover 0ms)',
      gatewayResponse: 'HTTP 200 OK',
      authCode: 'AUTH_WAVE_9931',
      switchLatencyMs: 142,
      recoveredByFailover: true
    }
  },
  {
    id: 'req_sw_984088',
    timestamp: '16:40:12',
    countryCode: 'SN',
    countryFlag: '🇸🇳',
    countryName: 'Sénégal',
    amount: 10000,
    currency: 'XOF',
    primaryConnector: 'PayDunya Core',
    executedConnector: 'PayDunya Core',
    isFailover: false,
    statusCode: 200,
    statusLabel: '200 OK',
    latencyMs: 44,
    requestPayload: {
      amount: 10000,
      currency: 'XOF',
      country: 'SN',
      customer: { phone: '+221770001122', email: 'dakar@client.sn' },
      metadata: { orderId: 'CMD_SN_7721' }
    },
    cloudDecision: {
      clientIp: '154.124.62.9',
      detectedCountry: 'SN',
      resolvedRule: 'RULE_SN_PRIMARY',
      primaryTarget: 'paydunya',
      dispatchNode: '194.163.148.22'
    },
    normalizedResponse: {
      status: 'SUCCESS',
      transactionId: 'tx_pd_663189',
      routedVia: 'PayDunya Core',
      gatewayResponse: 'HTTP 200 OK',
      switchLatencyMs: 44
    }
  },
  {
    id: 'req_sw_984074',
    timestamp: '16:38:50',
    countryCode: 'INT',
    countryFlag: '🌍',
    countryName: 'International / Diaspora',
    amount: 50,
    currency: 'EUR',
    primaryConnector: 'Stripe Global',
    executedConnector: 'Stripe Global (Visa 3D-Secure)',
    isFailover: false,
    statusCode: 200,
    statusLabel: '200 OK',
    latencyMs: 65,
    requestPayload: {
      amount: 50,
      currency: 'EUR',
      country: 'INT',
      customer: { email: 'diaspora.paris@gmail.com' },
      metadata: { orderId: 'CMD_INT_0094' }
    },
    cloudDecision: {
      clientIp: '82.64.12.90',
      detectedCountry: 'FR',
      resolvedRule: 'RULE_INT_GLOBAL',
      primaryTarget: 'stripe',
      dispatchNode: '194.163.148.22'
    },
    normalizedResponse: {
      status: 'SUCCESS',
      transactionId: 'ch_stripe_3N9A1b2',
      routedVia: 'Stripe Global (Visa/Mastercard)',
      gatewayResponse: 'HTTP 200 OK',
      switchLatencyMs: 65
    }
  }
];

export const NaNaSwitchLogsPage: React.FC<NaNaSwitchLogsPageProps> = ({
  onNavigate
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const { user } = useAuth();
  const tenantId = useMemo(() => {
    return user?.storeId || user?.uid || 'merchant-demo';
  }, [user]);

  // État des Logs
  const [logs, setLogs] = useState<RouteLogItem[]>(INITIAL_LOGS);
  const [selectedLog, setSelectedLog] = useState<RouteLogItem | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'success' | 'failover'>('all');

  // État du Simulateur en direct
  const [simCountry, setSimCountry] = useState<string>('BF');
  const [simAmount, setSimAmount] = useState<number>(15000);
  const [simScenario, setSimScenario] = useState<'normal' | 'failover'>('normal');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

  // Copie JSON
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // =========================================================================
  // 2. SYNCHRONISATION LOCALSTORAGE & FIRESTORE
  // =========================================================================

  useEffect(() => {
    try {
      const local = localStorage.getItem(`nanaswitch_logs_${tenantId}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs(parsed);
          setSelectedLog(parsed[0]);
          return;
        }
      }
    } catch (e) {
      console.warn('[NANA_SWITCH] Lecture cache logs :', e);
    }

    setSelectedLog(INITIAL_LOGS[0]);
  }, [tenantId]);

  const saveLogs = useCallback(async (updated: RouteLogItem[]) => {
    setLogs(updated);
    try {
      localStorage.setItem(`nanaswitch_logs_${tenantId}`, JSON.stringify(updated));
      const docRef = doc(db, 'switch_logs', tenantId);
      await setDoc(docRef, {
        tenantId,
        logs: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('[NANA_SWITCH] Sauvegarde logs storage :', e);
    }
  }, [tenantId]);

  // =========================================================================
  // 3. ENVOI DE LA REQUÊTE TEST DANS LE ROUTEUR CLOUD
  // =========================================================================

  const handleSendTestRequest = useCallback(async () => {
    playTapBeep();
    setIsSimulating(true);
    setSimulationMessage('1/3 Handshake TLS avec le Nœud Cloud isolé (194.163.148.22)...');

    const countryMeta: Record<string, { name: string; flag: string; primary: string; fallback: string }> = {
      BF: { name: 'Burkina Faso', flag: '🇧🇫', primary: 'SebPay API', fallback: 'CinetPay Hub' },
      CI: { name: 'Côte d’Ivoire', flag: '🇨🇮', primary: 'CinetPay Hub', fallback: 'PayDunya Core' },
      SN: { name: 'Sénégal', flag: '🇸🇳', primary: 'PayDunya Core', fallback: 'CinetPay Hub' },
      ML: { name: 'Mali', flag: '🇲🇱', primary: 'CinetPay Hub', fallback: 'SebPay API' },
      BJ: { name: 'Bénin', flag: '🇧🇯', primary: 'FedaPay Gateway', fallback: 'CinetPay Hub' },
      TG: { name: 'Togo', flag: '🇹🇬', primary: 'FedaPay Gateway', fallback: 'CinetPay Hub' },
      INT: { name: 'International / Diaspora', flag: '🌍', primary: 'Stripe Global', fallback: 'CinetPay Hub' }
    };

    const currentMeta = countryMeta[simCountry] || countryMeta.BF;

    setTimeout(() => {
      setSimulationMessage(`2/3 Résolution géo ${currentMeta.flag} ${currentMeta.name}... Analyse des règles de routage.`);

      setTimeout(async () => {
        const isFail = simScenario === 'failover';
        const latency = isFail ? Math.floor(Math.random() * 20) + 130 : Math.floor(Math.random() * 15) + 35;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const newReqId = `req_sw_${Math.floor(100000 + Math.random() * 900000)}`;

        const newLog: RouteLogItem = {
          id: newReqId,
          timestamp: timeStr,
          countryCode: simCountry,
          countryFlag: currentMeta.flag,
          countryName: currentMeta.name,
          amount: simAmount,
          currency: simCountry === 'INT' ? 'EUR' : 'XOF',
          primaryConnector: currentMeta.primary,
          executedConnector: isFail ? `${currentMeta.fallback} (Secours Auto-Failover)` : currentMeta.primary,
          isFailover: isFail,
          statusCode: 200,
          statusLabel: isFail ? '200 Failover Recovered' : '200 OK',
          latencyMs: latency,
          requestPayload: {
            amount: simAmount,
            currency: simCountry === 'INT' ? 'EUR' : 'XOF',
            country: simCountry,
            customer: { phone: '+22670000000', name: 'Simulateur Dev VIP' },
            metadata: { simulation: true, testId: newReqId }
          },
          cloudDecision: {
            clientIp: '194.163.148.22',
            detectedCountry: simCountry,
            resolvedRule: `RULE_${simCountry}_PRIMARY`,
            primaryTarget: currentMeta.primary,
            failoverTriggered: isFail,
            failoverFallback: isFail ? currentMeta.fallback : undefined,
            dispatchNode: '194.163.148.22'
          },
          normalizedResponse: {
            status: 'SUCCESS',
            transactionId: `tx_live_${Math.floor(100000 + Math.random() * 900000)}`,
            routedVia: isFail ? `${currentMeta.fallback} (Bascule 0ms)` : currentMeta.primary,
            gatewayResponse: 'HTTP 200 OK',
            switchLatencyMs: latency,
            recoveredByFailover: isFail
          }
        };

        const updated = [newLog, ...logs.slice(0, 19)];
        await saveLogs(updated);
        setSelectedLog(newLog);

        // Décompte de crédit dans le portefeuille
        try {
          const wKey = `nanaswitch_wallet_${tenantId}`;
          const currentBal = Number(localStorage.getItem(wKey) || '250');
          if (currentBal > 0) {
            localStorage.setItem(wKey, String(currentBal - 1));
          }
        } catch {}

        setIsSimulating(false);
        setSimulationMessage(null);
        playValidationBeep();
        setToastMessage(`✅ Requête ${newReqId} routée avec succès (${latency}ms) !`);
        setTimeout(() => setToastMessage(null), 3500);
      }, 700);
    }, 600);
  }, [simCountry, simAmount, simScenario, logs, saveLogs, tenantId]);

  // =========================================================================
  // 4. FILTRAGE DES LOGS
  // =========================================================================

  const filteredLogs = useMemo(() => {
    if (filterType === 'success') return logs.filter(l => !l.isFailover);
    if (filterType === 'failover') return logs.filter(l => l.isFailover);
    return logs;
  }, [logs, filterType]);

  const handleCopyJson = useCallback(() => {
    if (!selectedLog) return;
    playTapBeep();
    const fullJson = JSON.stringify({
      request: selectedLog.requestPayload,
      cloudDecision: selectedLog.cloudDecision,
      response: selectedLog.normalizedResponse
    }, null, 2);
    navigator.clipboard.writeText(fullJson);
    setCopiedJson(true);
    setToastMessage('Inspecteur JSON copié dans le presse-papier !');
    setTimeout(() => setCopiedJson(false), 2500);
    setTimeout(() => setToastMessage(null), 3000);
  }, [selectedLog]);

  // =========================================================================
  // 5. RENDU PRINCIPAL DU TERMINAL DE LOGS & SIMULATEUR
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
            <Terminal className="w-3.5 h-3.5" />
            <span>Page 7 • Simulateur Sandbox & Terminal d'Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Simulateur de Requête Cloud & Inspecteur de Logs Temps Réel
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Injectez des requêtes d'achat tests, observez le trajet à travers le Nœud Cloud en millisecondes et inspectez les payloads JSON d'aiguillage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/nana-switch/billing')}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Zap className="w-4 h-4" />
            <span>Portefeuille de Crédits (Page 8)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LE SIMULATEUR DE REQUÊTE CLOUD ("LIVE ROUTE SIMULATOR") */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border-2 border-blue-600 p-6 sm:p-8 space-y-6 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                ⚡ Simulateur de Requête Cloud en Direct (Live Route Simulator)
              </h2>
              <p className="text-xs text-slate-500">
                Générez une transaction test et déclenchez l'algorithme de routage du Nœud Cloud.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200">
            <Server className="w-4 h-4 text-blue-600" />
            <span>Nœud Cloud : 194.163.148.22</span>
          </div>
        </div>

        {/* Formulaire du Simulateur */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Sélection du Pays Simulé */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              1. Pays du Client :
            </label>
            <select
              value={simCountry}
              onChange={(e) => setSimCountry(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-bold py-3 px-3.5 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition cursor-pointer"
            >
              <option value="BF">🇧🇫 Burkina Faso (SebPay)</option>
              <option value="CI">🇨🇮 Côte d’Ivoire (CinetPay / Wave)</option>
              <option value="SN">🇸🇳 Sénégal (PayDunya / Wave)</option>
              <option value="ML">🇲🇱 Mali (CinetPay / Orange)</option>
              <option value="BJ">🇧🇯 Bénin (FedaPay / MTN)</option>
              <option value="TG">🇹🇬 Togo (FedaPay / Moov)</option>
              <option value="INT">🌍 International / Diaspora (Stripe)</option>
            </select>
          </div>

          {/* 2. Montant Test */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              2. Montant / Payload :
            </label>
            <div className="relative">
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-mono font-bold py-3 pl-3.5 pr-14 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                {simCountry === 'INT' ? 'EUR' : 'XOF'}
              </span>
            </div>
          </div>

          {/* 3. Scénario d'Exécution */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              3. Scénario de Test :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { playTapBeep(); setSimScenario('normal'); }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  simScenario === 'normal'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                ✅ Réponse Normale
              </button>
              <button
                type="button"
                onClick={() => { playTapBeep(); setSimScenario('failover'); }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  simScenario === 'failover'
                    ? 'bg-amber-50 text-amber-800 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                ⚡ Simuler Panne
              </button>
            </div>
          </div>
        </div>

        {/* Bouton de Lancement & Animation de Trajet */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {simulationMessage ? (
              <span className="text-blue-700 font-bold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                {simulationMessage}
              </span>
            ) : (
              <span>💡 Chaque simulation consomme 1 crédit test et trace l'aiguillage en temps réel.</span>
            )}
          </div>

          <button
            type="button"
            disabled={isSimulating}
            onClick={handleSendTestRequest}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Routage en cours...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>🚀 Envoyer la Requête Test dans le Routeur Cloud !</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LE TERMINAL D'AUDIT & LOGS TEMPS RÉEL (LIVE REQUEST INSPECTOR) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Journal d'Audit des Requêtes Aiguillées (Live Stream)
            </h3>
          </div>

          {/* Filtres Rapides */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => { playTapBeep(); setFilterType('all'); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Tous ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => { playTapBeep(); setFilterType('success'); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'success' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              200 Normal
            </button>
            <button
              type="button"
              onClick={() => { playTapBeep(); setFilterType('failover'); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'failover' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Failover Récupéré
            </button>
          </div>
        </div>

        {/* Disposition Deux Colonnes : Table des Logs à Gauche + Inspecteur JSON à Droite */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Table des Logs (7/12) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Heure</th>
                    <th className="py-3 px-4">Requête</th>
                    <th className="py-3 px-4">Zone</th>
                    <th className="py-3 px-4">Connecteur Routé</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Latence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                  {filteredLogs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => {
                          playTapBeep();
                          setSelectedLog(log);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 font-bold border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {log.timestamp}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-blue-700 font-bold">
                          {log.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                            <span>{log.countryFlag}</span>
                            <span className="font-bold">{log.countryCode}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="truncate max-w-[140px]" title={log.executedConnector}>
                            {log.executedConnector}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {log.isFailover ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                              <span>⚡ Failover</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>200 OK</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-700">
                          {log.latencyMs}ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inspecteur JSON Haute Précision à Droite (5/12) */}
          <div className="lg:col-span-5 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-5 text-blue-100 font-mono text-xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">Inspecteur JSON : {selectedLog?.id}</span>
              </div>

              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copié' : 'Copier JSON'}</span>
              </button>
            </div>

            {selectedLog ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {/* 1. Payload Entrant */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider">
                    1. Payload Entrant (Client POST /v1/switch/route) :
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto text-[11px] text-slate-300">
                    {JSON.stringify(selectedLog.requestPayload, null, 2)}
                  </pre>
                </div>

                {/* 2. Transformation & Décision Cloud */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                    2. Résolution Cloud & Politique de Routage :
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto text-[11px] text-amber-200">
                    {JSON.stringify(selectedLog.cloudDecision, null, 2)}
                  </pre>
                </div>

                {/* 3. Réponse Normalisée */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                    3. Réponse Normalisée Retournée au Client :
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto text-[11px] text-emerald-200">
                    {JSON.stringify(selectedLog.normalizedResponse, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Sélectionnez une requête à gauche pour inspecter son flux JSON.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NaNaSwitchLogsPage;
