/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NaNaSwitch Cloud — Page 4 : Le Moteur de Routage Intelligent par Pays & Bascule Anti-Panne (/nana-switch/routing)
 * Charte graphique : Bleu Royal (#2563EB) & Blanc Pur (#FFFFFF).
 * Positionnement : Routeur SaaS Cloud Intelligent & Nœud Cloud Haute Disponibilité.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Globe, 
  Key, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  Server, 
  Check, 
  ChevronRight, 
  Clock, 
  Sparkles, 
  Radio, 
  Layers, 
  Lock, 
  Play, 
  ArrowDown, 
  HelpCircle, 
  X, 
  Info,
  ShieldAlert,
  Flame,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { PRESET_CONNECTORS, ConnectorDefinition } from './NaNaSwitchConnectorsPage';
import { useSwitchAccount } from '../../../components/nanaSwitch/NaNaSwitchAuthGuard';
import { isPinSessionUnlocked } from '../../../utils/nanaSwitchPinCrypto';
import { NaNaSwitchPinModal } from '../../../components/nanaSwitch/NaNaSwitchPinModal';

export interface NaNaSwitchRoutingPageProps {
  onNavigate?: (path: string) => void;
}

export interface CountryRoutingRule {
  countryCode: string;
  countryName: string;
  flag: string;
  subRegion: string;
  primaryConnectorId: string;
  fallbackConnectorId: string; // 'none' ou ID du connecteur
  failoverTimeoutSec: number; // 3, 5, 8
  isActive: boolean;
  estimatedSuccessRate: number;
}

export const INITIAL_ROUTING_RULES: CountryRoutingRule[] = [
  {
    countryCode: 'BF',
    countryName: 'Burkina Faso',
    flag: '🇧🇫',
    subRegion: 'UEMOA • Orange Money & Moov Money',
    primaryConnectorId: 'sebpay',
    fallbackConnectorId: 'cinetpay',
    failoverTimeoutSec: 5,
    isActive: true,
    estimatedSuccessRate: 99.95
  },
  {
    countryCode: 'CI',
    countryName: 'Côte d’Ivoire',
    flag: '🇨🇮',
    subRegion: 'UEMOA • Wave CI, Orange, MTN, Moov',
    primaryConnectorId: 'cinetpay',
    fallbackConnectorId: 'paydunya',
    failoverTimeoutSec: 5,
    isActive: true,
    estimatedSuccessRate: 99.98
  },
  {
    countryCode: 'SN',
    countryName: 'Sénégal',
    flag: '🇸🇳',
    subRegion: 'UEMOA • Wave Sénégal, Orange, Free',
    primaryConnectorId: 'paydunya',
    fallbackConnectorId: 'cinetpay',
    failoverTimeoutSec: 5,
    isActive: true,
    estimatedSuccessRate: 99.94
  },
  {
    countryCode: 'ML',
    countryName: 'Mali',
    flag: '🇲🇱',
    subRegion: 'UEMOA • Orange Mali & Moov Africa',
    primaryConnectorId: 'cinetpay',
    fallbackConnectorId: 'sebpay',
    failoverTimeoutSec: 5,
    isActive: true,
    estimatedSuccessRate: 99.89
  },
  {
    countryCode: 'BJ_TG',
    countryName: 'Bénin & Togo',
    flag: '🇧🇯 🇹🇬',
    subRegion: 'UEMOA • MTN Bénin, Moov Togo, T-Money',
    primaryConnectorId: 'fedapay',
    fallbackConnectorId: 'cinetpay',
    failoverTimeoutSec: 5,
    isActive: true,
    estimatedSuccessRate: 99.92
  },
  {
    countryCode: 'CM',
    countryName: 'Cameroun & CEMAC',
    flag: '🇨🇲',
    subRegion: 'Afrique Centrale • MTN Cam & Orange',
    primaryConnectorId: 'cinetpay',
    fallbackConnectorId: 'pawapay',
    failoverTimeoutSec: 5,
    isActive: true,
    estimatedSuccessRate: 99.87
  },
  {
    countryCode: 'INT',
    countryName: 'International / Diaspora',
    flag: '🌍',
    subRegion: 'Europe, USA & Monde • Visa, MC, Apple Pay',
    primaryConnectorId: 'stripe',
    fallbackConnectorId: 'cinetpay',
    failoverTimeoutSec: 5,
    isActive: true,
    estimatedSuccessRate: 99.99
  }
];

export const NaNaSwitchRoutingPage: React.FC<NaNaSwitchRoutingPageProps> = ({
  onNavigate
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const { user } = useAuth();
  const tenantId = useMemo(() => {
    return user?.storeId || user?.uid || 'merchant-demo';
  }, [user]);

  // État des règles de routage
  const [rules, setRules] = useState<CountryRoutingRule[]>(INITIAL_ROUTING_RULES);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // État du simulateur d'aiguillage
  const [simCountryCode, setSimCountryCode] = useState<string>('BF');
  const [simScenario, setSimScenario] = useState<'nominal' | 'failover'>('failover');
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    finalConnector: string;
    totalLatencyMs: number;
    recoveredByFailover: boolean;
  } | null>(null);

  // Protection Universelle par Code PIN de Sécurité (4 chiffres)
  const { switchAccount } = useSwitchAccount();
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const executeProtectedAction = useCallback((action: () => void) => {
    if (isPinSessionUnlocked() || !switchAccount?.pinHash) {
      action();
    } else {
      setPendingAction(() => action);
      setShowPinModal(true);
    }
  }, [switchAccount?.pinHash]);

  const handlePinSuccess = useCallback(() => {
    setShowPinModal(false);
    if (pendingAction) {
      const act = pendingAction;
      setPendingAction(null);
      act();
    }
  }, [pendingAction]);

  // =========================================================================
  // 2. CHARGEMENT ET SYNCHRONISATION LOCALSTORAGE + FIRESTORE
  // =========================================================================

  const loadRules = useCallback((tid: string) => {
    try {
      const localKey = `nanaswitch_routing_rules_${tid}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRules(parsed);
          return true;
        }
      }
    } catch (e) {
      console.warn('[NANA_SWITCH] Erreur lecture règles locales :', e);
    }
    return false;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const hasLocal = loadRules(tenantId);

    const syncFirestore = async () => {
      try {
        const docRef = doc(db, 'switch_routing_rules', tenantId);
        const snap = await getDoc(docRef);
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data && Array.isArray(data.rules)) {
            setRules(data.rules);
            localStorage.setItem(`nanaswitch_routing_rules_${tenantId}`, JSON.stringify(data.rules));
          }
        } else if (!hasLocal && isMounted) {
          localStorage.setItem(`nanaswitch_routing_rules_${tenantId}`, JSON.stringify(INITIAL_ROUTING_RULES));
        }
      } catch (err) {
        console.warn('[NANA_SWITCH] Erreur sync Firestore routing_rules :', err);
      }
    };

    syncFirestore();

    return () => {
      isMounted = false;
    };
  }, [tenantId, loadRules]);

  // =========================================================================
  // 3. ACTIONS DE MODIFICATION DE LA MATRICE
  // =========================================================================

  const handleUpdatePrimary = useCallback((countryCode: string, newPrimaryId: string) => {
    playTapBeep();
    setRules(prev => prev.map(r => {
      if (r.countryCode === countryCode) {
        // Si le primaire devient identique au fallback, réinitialiser le fallback
        const fallback = r.fallbackConnectorId === newPrimaryId ? 'none' : r.fallbackConnectorId;
        return { ...r, primaryConnectorId: newPrimaryId, fallbackConnectorId: fallback };
      }
      return r;
    }));
  }, []);

  const handleUpdateFallback = useCallback((countryCode: string, newFallbackId: string) => {
    playTapBeep();
    setRules(prev => prev.map(r => {
      if (r.countryCode === countryCode) {
        return { ...r, fallbackConnectorId: newFallbackId };
      }
      return r;
    }));
  }, []);

  const handleUpdateTimeout = useCallback((countryCode: string, timeoutSec: number) => {
    playTapBeep();
    setRules(prev => prev.map(r => {
      if (r.countryCode === countryCode) {
        return { ...r, failoverTimeoutSec: timeoutSec };
      }
      return r;
    }));
  }, []);

  const handleToggleRuleActive = useCallback((countryCode: string) => {
    playTapBeep();
    setRules(prev => prev.map(r => {
      if (r.countryCode === countryCode) {
        return { ...r, isActive: !r.isActive };
      }
      return r;
    }));
  }, []);

  // Sauvegarde des Règles Cloud dans Firestore (Protégé par PIN)
  const handleSaveRulesInternal = useCallback(async () => {
    setIsSaving(true);
    playTapBeep();

    try {
      // 1. Sauvegarde locale 0ms
      const localKey = `nanaswitch_routing_rules_${tenantId}`;
      localStorage.setItem(localKey, JSON.stringify(rules));

      // 2. Synchronisation dans le coffre isolé Firestore
      const docRef = doc(db, 'switch_routing_rules', tenantId);
      await setDoc(docRef, {
        tenantId,
        updatedAt: new Date().toISOString(),
        rules
      }, { merge: true });

      playValidationBeep();
      setToastMessage('✅ Règles de Routage Cloud enregistrées et synchronisées en production !');
    } catch (e) {
      console.error('[NANA_SWITCH] Erreur sauvegarde règles :', e);
      setToastMessage('⚠️ Erreur lors de la sauvegarde dans le cloud. Vos règles restent sauvegardées localement.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  }, [tenantId, rules]);

  const handleSaveRules = useCallback(() => {
    executeProtectedAction(() => {
      handleSaveRulesInternal();
    });
  }, [executeProtectedAction, handleSaveRulesInternal]);

  // =========================================================================
  // 4. SIMULATEUR D'AIGUILLAGE INTELLIGENT EN DIRECT
  // =========================================================================

  const selectedSimRule = useMemo(() => {
    return rules.find(r => r.countryCode === simCountryCode) || rules[0];
  }, [rules, simCountryCode]);

  const primaryConnectorName = useMemo(() => {
    const found = PRESET_CONNECTORS.find(c => c.id === selectedSimRule.primaryConnectorId);
    return found ? found.name : selectedSimRule.primaryConnectorId;
  }, [selectedSimRule]);

  const fallbackConnectorName = useMemo(() => {
    if (selectedSimRule.fallbackConnectorId === 'none') return 'Aucun secours configuré';
    const found = PRESET_CONNECTORS.find(c => c.id === selectedSimRule.fallbackConnectorId);
    return found ? found.name : selectedSimRule.fallbackConnectorId;
  }, [selectedSimRule]);

  const runSimulation = useCallback(() => {
    playTapBeep();
    setIsSimulating(true);
    setSimStep(1);
    setSimResult(null);

    // Étape 1 : Réception de la requête dans le Routeur Cloud
    setTimeout(() => {
      setSimStep(2); // Analyse géo et détection du pays

      setTimeout(() => {
        setSimStep(3); // Appel Connecteur Primaire

        setTimeout(() => {
          if (simScenario === 'nominal') {
            // Succès immédiat sur le primaire
            setSimStep(5);
            setSimResult({
              success: true,
              finalConnector: primaryConnectorName,
              totalLatencyMs: 41,
              recoveredByFailover: false
            });
            setIsSimulating(false);
            playValidationBeep();
          } else {
            // Échec primaire -> Déclenchement Failover
            setSimStep(4);

            setTimeout(() => {
              setSimStep(5);
              setSimResult({
                success: true,
                finalConnector: fallbackConnectorName,
                totalLatencyMs: 148,
                recoveredByFailover: true
              });
              setIsSimulating(false);
              playValidationBeep();
            }, 900);
          }
        }, 800);
      }, 700);
    }, 600);
  }, [simScenario, primaryConnectorName, fallbackConnectorName]);

  // =========================================================================
  // 5. RENDU PRINCIPAL DE LA PAGE
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
            <Globe className="w-3.5 h-3.5" />
            <span>Page 4 • Moteur de Routage Intelligent & Failover</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Matrice de Routage par Pays & Bascule Anti-Panne 0ms
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Définissez quel connecteur traite les paiements pour chaque pays et programmez le basculement automatique instantané (Auto-Failover) en cas d’indisponibilité opérateur.
          </p>
        </div>

        {/* Bouton de Sauvegarde Principal */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/nana-switch/connectors')}
            className="px-4 py-3 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Key className="w-4 h-4 text-blue-600" />
            <span>Voir le Coffre Connecteurs (Page 3)</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveRules}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Enregistrement Cloud...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>💾 Enregistrer mes Règles de Routage Cloud</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bannière de Principe Intelligent */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-blue-600/15 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-black uppercase tracking-wider text-blue-100">
            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>Tolérance Zéro Panne • 99.99% Résilience</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Aiguillage Géographique Dynamique + Secours Instantané
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Si votre opérateur de paiement principal subit un ralentissement (&gt; 5s) ou une coupure réseau, notre Nœud Cloud réoriente la transaction en 0ms vers votre 2ème passerelle de secours sans recharger la page client.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full lg:w-auto flex-shrink-0">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center">
            <div className="text-2xl font-black text-white">0 ms</div>
            <div className="text-[11px] text-blue-100 font-semibold">Temps de Bascule Auto</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center">
            <div className="text-2xl font-black text-amber-300">99.98%</div>
            <div className="text-[11px] text-blue-100 font-semibold">Taux d'Aboutissement</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LA MATRICE VISUELLE D'AIGUILLAGE PAR PAYS (ROUTING TABLE) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Matrice d'Aiguillage des Flux par Zone Géographique
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {rules.filter(r => r.isActive).length} / {rules.length} Zones Activées
          </span>
        </div>

        <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-5">Zone / Pays</th>
                  <th className="py-4 px-5">🥇 Connecteur Primaire (N°1)</th>
                  <th className="py-4 px-5">🛡️ Connecteur de Secours (Auto-Failover N°2)</th>
                  <th className="py-4 px-5">⏱️ Seuil Bascule</th>
                  <th className="py-4 px-5 text-center">État Routage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                {rules.map((rule) => {
                  return (
                    <tr 
                      key={rule.countryCode}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        !rule.isActive ? 'opacity-60 bg-slate-50/50' : ''
                      }`}
                    >
                      {/* 1. Zone & Pays */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl flex-shrink-0">{rule.flag}</span>
                          <div>
                            <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                              <span>{rule.countryName}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">({rule.countryCode})</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {rule.subRegion}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Connecteur Primaire (Menu Déroulant) */}
                      <td className="py-4 px-5">
                        <div className="relative min-w-[200px]">
                          <select
                            disabled={!rule.isActive}
                            value={rule.primaryConnectorId}
                            onChange={(e) => handleUpdatePrimary(rule.countryCode, e.target.value)}
                            className="w-full bg-blue-50/70 border border-blue-200 text-blue-900 text-xs font-bold py-2.5 px-3 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition cursor-pointer disabled:opacity-50"
                          >
                            {PRESET_CONNECTORS.map(conn => (
                              <option key={conn.id} value={conn.id}>
                                {conn.name} ({conn.badge})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 3. Connecteur de Secours Auto-Failover (Menu Déroulant) */}
                      <td className="py-4 px-5">
                        <div className="relative min-w-[220px]">
                          <select
                            disabled={!rule.isActive}
                            value={rule.fallbackConnectorId}
                            onChange={(e) => handleUpdateFallback(rule.countryCode, e.target.value)}
                            className={`w-full text-xs font-bold py-2.5 px-3 rounded-xl border focus:ring-2 outline-none transition cursor-pointer disabled:opacity-50 ${
                              rule.fallbackConnectorId !== 'none'
                                ? 'bg-amber-50/70 border-amber-300 text-amber-900 focus:ring-amber-500/20 focus:border-amber-500'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            <option value="none">⚪ Aucun secours (Désactivé)</option>
                            {PRESET_CONNECTORS.map(conn => (
                              <option 
                                key={conn.id} 
                                value={conn.id}
                                disabled={conn.id === rule.primaryConnectorId}
                              >
                                {conn.name} {conn.id === rule.primaryConnectorId ? '(Déjà Primaire)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 4. Seuil de Bascule (Timeout) */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <select
                            disabled={!rule.isActive || rule.fallbackConnectorId === 'none'}
                            value={rule.failoverTimeoutSec}
                            onChange={(e) => handleUpdateTimeout(rule.countryCode, Number(e.target.value))}
                            className="bg-white border border-slate-300 text-slate-800 text-xs font-mono font-bold py-1.5 px-2.5 rounded-lg outline-none focus:border-blue-600 transition disabled:opacity-50"
                          >
                            <option value={3}>3 sec</option>
                            <option value={5}>5 sec (Recommandé)</option>
                            <option value={8}>8 sec</option>
                          </select>
                        </div>
                      </td>

                      {/* 5. Interrupteur d'État */}
                      <td className="py-4 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRuleActive(rule.countryCode)}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer inline-flex items-center ${
                            rule.isActive ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                          }`}
                          title={rule.isActive ? 'Désactiver cette règle' : 'Activer cette règle'}
                        >
                          <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SIMULATEUR VISUEL D'AIGUILLAGE ("TESTER MA RÈGLE DE ROUTAGE") */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border-2 border-blue-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⚡ Tester l'Aiguillage Intelligent en Direct
              </h3>
              <p className="text-xs text-slate-500">
                Simulez une requête de paiement réelle et observez le cheminement tracé par le Routeur Cloud.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSimulating}
              onClick={runSimulation}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Aiguillage en cours...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Lancer le Test de Routage</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Contrôles du Simulateur : Pays & Scénario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
          {/* Sélection du Pays de Test */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              1. Sélectionner le Pays du Client Test :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {rules.map((r) => (
                <button
                  key={r.countryCode}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSimCountryCode(r.countryCode);
                    setSimStep(0);
                    setSimResult(null);
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                    simCountryCode === r.countryCode
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-base">{r.flag}</span>
                  <span className="text-[11px] font-bold truncate">{r.countryCode}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sélection du Scénario (Nominal vs Panne) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              2. Scénario de Simulation Opérateur :
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setSimScenario('nominal');
                  setSimStep(0);
                  setSimResult(null);
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  simScenario === 'nominal'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>🟢 Fonctionnement Normal</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-tight">
                  Le connecteur primaire ({primaryConnectorName}) répond en 41ms.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setSimScenario('failover');
                  setSimStep(0);
                  setSimResult(null);
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  simScenario === 'failover'
                    ? 'bg-amber-50 text-amber-900 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>🔴 Simuler une Panne / Timeout</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-tight">
                  Le primaire échoue ➡️ Bascule immédiate sur {fallbackConnectorName}.
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Tracé Visuel en Direct du Cheminement de la Requête */}
        <div className="space-y-4 pt-2">
          <div className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>Tracé du Flux en Temps Réel à travers NaNaSwitch Cloud :</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Étape 1 : Entrée Cloud */}
            <div className={`p-4 rounded-2xl border-2 transition-all ${
              simStep >= 1
                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-black">ÉTAPE 1</span>
                {simStep >= 1 && <Check className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="font-black text-sm text-slate-900">🌐 Requête Entrante</div>
              <p className="text-[11px] text-slate-600 mt-1">
                Payload reçu sur le Nœud Cloud isolé (194.163.148.22).
              </p>
            </div>

            {/* Étape 2 : Analyse Géo */}
            <div className={`p-4 rounded-2xl border-2 transition-all ${
              simStep >= 2
                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-black">ÉTAPE 2</span>
                {simStep >= 2 && <Check className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="font-black text-sm text-slate-900">
                {selectedSimRule.flag} Détection Zone
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                Résolution : {selectedSimRule.countryName}. Règle N°1 appliquée.
              </p>
            </div>

            {/* Étape 3 : Tentative Primaire */}
            <div className={`p-4 rounded-2xl border-2 transition-all ${
              simStep >= 3
                ? simScenario === 'failover'
                  ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm'
                  : 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-black">ÉTAPE 3</span>
                {simStep >= 3 && (
                  simScenario === 'failover' 
                    ? <AlertTriangle className="w-4 h-4 text-rose-600" />
                    : <Check className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <div className="font-black text-sm text-slate-900">
                🥇 {primaryConnectorName}
              </div>
              <p className="text-[11px] mt-1">
                {simStep < 3 && 'En attente d’exécution...'}
                {simStep >= 3 && simScenario === 'nominal' && '✅ Réponse 200 OK reçue en 41ms !'}
                {simStep >= 3 && simScenario === 'failover' && '⚠️ Timeout / 504 Gateway Error !'}
              </p>
            </div>

            {/* Étape 4 : Secours Auto-Failover */}
            <div className={`p-4 rounded-2xl border-2 transition-all ${
              simStep >= 4
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className={`font-black ${simStep >= 4 ? 'text-blue-100' : ''}`}>ÉTAPE 4</span>
                {simStep >= 4 && <Check className="w-4 h-4 text-white" />}
              </div>
              <div className={`font-black text-sm ${simStep >= 4 ? 'text-white' : 'text-slate-900'}`}>
                🛡️ {simScenario === 'nominal' ? 'Secours Inactif (Non Requis)' : 'Bascule Auto-Failover'}
              </div>
              <p className={`text-[11px] mt-1 ${simStep >= 4 ? 'text-blue-100' : 'text-slate-600'}`}>
                {simScenario === 'nominal' && 'Transaction déjà finalisée avec succès sur le primaire.'}
                {simScenario === 'failover' && simStep < 4 && 'Armé en attente de panne...'}
                {simScenario === 'failover' && simStep >= 4 && `⚡ Bascule 0ms vers ${fallbackConnectorName} ! Récupération 100% réussie.`}
              </p>
            </div>
          </div>

          {/* Résumé du Test Terminé */}
          {simResult && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-scaleUp">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">
                    {simResult.recoveredByFailover
                      ? '🎉 Transaction Sauvée par l\'Auto-Failover 0ms !'
                      : '✅ Transaction Finalisée avec Succès sur le Connecteur Primaire !'}
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Connecteur final exécuté : <strong className="font-black text-emerald-950">{simResult.finalConnector}</strong> • Latence totale : <span className="font-mono">{simResult.totalLatencyMs}ms</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-900">
                  Zéro Perte Client • 0ms d’Abandon
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modale de Protection par Code PIN */}
      <NaNaSwitchPinModal
        isOpen={showPinModal}
        mode="verify"
        storedPinHash={switchAccount?.pinHash}
        title="Sauvegarde Sécurisée du Routage"
        description="Entrez votre Code PIN à 4 chiffres pour appliquer et publier ces règles d'aiguillage en production."
        onSuccess={handlePinSuccess}
        onClose={() => setShowPinModal(false)}
      />

    </div>
  );
};

export default NaNaSwitchRoutingPage;
