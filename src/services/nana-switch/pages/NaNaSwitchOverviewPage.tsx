import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Activity, 
  Key, 
  Globe, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Layers, 
  Radio, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Sliders, 
  Cpu, 
  FileCode, 
  Terminal,
  AlertTriangle
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface NaNaSwitchOverviewPageProps {
  onNavigate?: (path: string) => void;
}

interface TelemetryEvent {
  id: string;
  time: string;
  country: string;
  flag: string;
  amount: number;
  connector: string;
  latency: number;
  status: 'success' | 'failover_recovered';
  failoverFrom?: string;
}

const INITIAL_EVENTS: TelemetryEvent[] = [
  {
    id: 'disp_984102',
    time: 'À l\'instant',
    country: "Côte d'Ivoire",
    flag: '🇨🇮',
    amount: 18500,
    connector: 'CinetPay (Nœud 01)',
    latency: 12,
    status: 'success'
  },
  {
    id: 'disp_984101',
    time: 'Il y a 2m',
    country: 'Burkina Faso',
    flag: '🇧🇫',
    amount: 25000,
    connector: 'LigdiCash (Nœud 02)',
    latency: 14,
    status: 'success'
  },
  {
    id: 'disp_984100',
    time: 'Il y a 5m',
    country: 'Sénégal',
    flag: '🇸🇳',
    amount: 12000,
    connector: 'Wave Direct API',
    latency: 11,
    status: 'failover_recovered',
    failoverFrom: 'PayDunya (Timeout 800ms)'
  },
  {
    id: 'disp_984099',
    time: 'Il y a 9m',
    country: 'Bénin',
    flag: '🇧🇯',
    amount: 35000,
    connector: 'FedaPay (Nœud 04)',
    latency: 15,
    status: 'success'
  },
  {
    id: 'disp_984098',
    time: 'Il y a 14m',
    country: 'Mali',
    flag: '🇲🇱',
    amount: 8000,
    connector: 'SebPay Cloud',
    latency: 16,
    status: 'success'
  }
];

export const NaNaSwitchOverviewPage: React.FC<NaNaSwitchOverviewPageProps> = ({
  onNavigate
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>(INITIAL_EVENTS);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Étapes de l'onboarding checklist
  const [onboardingProgress, setOnboardingProgress] = useState<{
    step1: boolean;
    step2: boolean;
    step3: boolean;
  }>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nanaswitch_onboarding');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return { step1: true, step2: true, step3: false };
  });

  const handleNavigateTo = useCallback((path: string) => {
    playTapBeep();
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  }, [onNavigate]);

  const handleCopyApiKey = useCallback(() => {
    playTapBeep();
    const apiKey = 'nana_sw_live_sec_9841af82b82149c';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2200);
    }
  }, []);

  const handleRefreshTelemetry = useCallback(() => {
    playTapBeep();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      playValidationBeep();
    }, 400);
  }, []);

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* ========================================================================= */}
      {/* EN-TÊTE DU COCKPIT CENTRAL */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              COCKPIT CENTRAL
            </span>
            <span className="text-xs font-semibold text-slate-500">
              • Télémétrie &amp; Nœud Cloud
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Vue d&apos;Ensemble &amp; Télémétrie en Direct
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Surveillez le trafic aiguillé en temps réel, la santé de vos connecteurs de production et vos règles de bascule.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefreshTelemetry}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Rafraîchir les métriques"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigateTo('/nana-switch/security')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Gérer mes Clés Cloud</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. GUIDE DE DÉMARRAGE RAPIDE EN 3 ÉTAPES (ONBOARDING CHECKLIST) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-blue-600/20 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
              ONBOARDING ROUTEUR CLOUD
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Guide de Démarrage Rapide : Déployez votre Routeur en 3 Étapes
            </h2>
            <p className="text-xs text-blue-100">
              Suivez ce parcours pour brancher vos clés, activer le multi-pays et recevoir vos premiers flux chiffrés.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-blue-100">Progression : </span>
            <strong className="text-sm font-black text-white">2 / 3 complétées</strong>
          </div>
        </div>

        {/* Les 3 cartes d'étapes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          
          {/* Étape 1 */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-900 font-black text-xs flex items-center justify-center">
                  ✓
                </span>
                <span className="text-[10px] font-black uppercase text-emerald-300">Configuré</span>
              </div>
              <h4 className="font-black text-sm text-white pt-1">
                Étape 1 : Brancher vos clés API de production
              </h4>
              <p className="text-xs text-blue-100 leading-relaxed">
                Renseignez vos identifiants marchands dans le Coffre Cloud chiffré AES-256.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleNavigateTo('/nana-switch/connectors')}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
            >
              <span>Gérer les Connecteurs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Étape 2 */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-900 font-black text-xs flex items-center justify-center">
                  ✓
                </span>
                <span className="text-[10px] font-black uppercase text-emerald-300">Actif</span>
              </div>
              <h4 className="font-black text-sm text-white pt-1">
                Étape 2 : Activer vos règles de routage pays
              </h4>
              <p className="text-xs text-blue-100 leading-relaxed">
                Définissez quel connecteur prend la main par pays et le relais de secours automatique.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleNavigateTo('/nana-switch/routing')}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
            >
              <span>Matrice de Routage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Étape 3 */}
          <div className="bg-white/15 backdrop-blur-md border-2 border-white/40 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between ring-2 ring-white/20">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-white text-blue-600 font-black text-xs flex items-center justify-center shadow-sm">
                  3
                </span>
                <span className="text-[10px] font-black uppercase text-amber-300 animate-pulse">À finaliser</span>
              </div>
              <h4 className="font-black text-sm text-white pt-1">
                Étape 3 : Copier votre Clé Unique dans l&apos;Extension
              </h4>
              <p className="text-xs text-blue-100 leading-relaxed">
                Collez votre clé <code className="bg-white/20 px-1 rounded text-[11px]">nana_sw_live_...</code> dans votre application ou boutique.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleNavigateTo('/nana-switch/security')}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-98"
            >
              <span>Copier ma Clé Cloud</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LES 4 CARTES KPI TEMPS RÉEL */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1 : Requêtes Routées */}
        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm space-y-2.5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
              Requêtes Routées
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              14 820
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% ce mois</span>
              <span className="text-slate-400 font-normal ml-1">(24h : 842)</span>
            </div>
          </div>
        </div>

        {/* KPI 2 : Taux de Disponibilité */}
        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm space-y-2.5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
              Disponibilité Routeur
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              99.98%
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zéro coupure constatée</span>
            </div>
          </div>
        </div>

        {/* KPI 3 : Connecteurs API Actifs */}
        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm space-y-2.5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
              Connecteurs API Actifs
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              5 <span className="text-base text-slate-400 font-normal">/ 8</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-1">
              <span>CinetPay, Wave, LigdiCash...</span>
            </div>
          </div>
        </div>

        {/* KPI 4 : Pays Couverts */}
        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm space-y-2.5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
              Pays Couverts
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              8 Pays
            </div>
            <div className="flex items-center gap-1.5 text-xs pt-1">
              <span>🇧🇫</span>
              <span>🇨🇮</span>
              <span>🇸🇳</span>
              <span>🇲🇱</span>
              <span>🇧🇯</span>
              <span>🇹🇬</span>
              <span className="text-[10px] text-slate-500 font-bold">+2</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. GRAPHIQUE DE FLUX PAR PAYS & CONNECTEURS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Répartition par Pays (7 colonnes) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-blue-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Répartition du Trafic par Pays (30 derniers jours)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Volume de requêtes routées selon la géolocalisation de vos acheteurs.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              100% Routé
            </span>
          </div>

          <div className="space-y-4">
            {[
              { country: "Côte d'Ivoire", flag: '🇨🇮', pct: 42, req: '6 224 req', conn: 'CinetPay / Wave' },
              { country: 'Burkina Faso', flag: '🇧🇫', pct: 28, req: '4 149 req', conn: 'LigdiCash / SebPay' },
              { country: 'Sénégal', flag: '🇸🇳', pct: 18, req: '2 667 req', conn: 'PayDunya / Wave' },
              { country: 'Bénin & Togo', flag: '🇧🇯', pct: 8, req: '1 185 req', conn: 'FedaPay' },
              { country: 'International & Autres', flag: '🌍', pct: 4, req: '595 req', conn: 'Moneroo / Cartes' }
            ].map((row, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">{row.flag}</span>
                    <span className="text-slate-900">{row.country}</span>
                    <span className="text-slate-400 font-normal text-[11px]">({row.conn})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[11px]">{row.req}</span>
                    <span className="text-blue-600 font-black">{row.pct}%</span>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Santé des Connecteurs Actifs (5 colonnes) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-blue-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                <span>État des Nœuds Connecteurs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Surveillance de la latence de vos API marchands.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNavigateTo('/nana-switch/connectors')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Gérer →
            </button>
          </div>

          <div className="space-y-3">
            {[
              { name: 'CinetPay Production', latency: '12ms', status: 'optimal', role: 'Principal CI' },
              { name: 'LigdiCash Direct', latency: '14ms', status: 'optimal', role: 'Principal BF' },
              { name: 'Wave Direct API', latency: '11ms', status: 'optimal', role: 'Secours Failover' },
              { name: 'PayDunya Gateway', latency: '18ms', status: 'optimal', role: 'Principal SN' },
              { name: 'FedaPay Live Node', latency: '15ms', status: 'optimal', role: 'Principal BJ/TG' }
            ].map((node, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{node.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Rôle : {node.role}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {node.latency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. DERNIERS ÉVÉNEMENTS CLOUD (LIVE TELEMETRY FEED) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
        
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-base font-black text-slate-900">
                Journal de Télémétrie en Direct (Live Dispatch Stream)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Événements d&apos;aiguillage traités par votre Nœud NaNaSwitch Cloud.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigateTo('/nana-switch/logs')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Voir tous les logs détaillés</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tableau des derniers événements */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 sm:px-6">ID Requête</th>
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4">Pays Cible</th>
                <th className="py-3 px-4">Montant</th>
                <th className="py-3 px-4">Nœud Aiguillé</th>
                <th className="py-3 px-4">Latence</th>
                <th className="py-3 px-4 sm:px-6">Statut Cloud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {telemetryEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-blue-50/40 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900">
                    {evt.id}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{evt.time}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <span className="text-base">{evt.flag}</span>
                      <span>{evt.country}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {formatCFA(evt.amount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-bold text-slate-800">{evt.connector}</span>
                      {evt.failoverFrom && (
                        <span className="block text-[10px] text-amber-700 font-medium">
                          Relais depuis {evt.failoverFrom}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {evt.latency}ms
                  </td>
                  <td className="py-3.5 px-4 sm:px-6">
                    {evt.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>SUCCÈS 200</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                        <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                        <span>FAILOVER 0MS</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

export default NaNaSwitchOverviewPage;
