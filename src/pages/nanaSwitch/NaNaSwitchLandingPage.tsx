import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Zap, 
  Server, 
  ShieldCheck, 
  Globe, 
  Key, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  Terminal, 
  Copy, 
  Check, 
  Layers, 
  Lock, 
  Activity, 
  Wifi, 
  ExternalLink, 
  ChevronRight, 
  RefreshCw, 
  Sparkles, 
  Boxes, 
  Code2, 
  Puzzle, 
  ShieldAlert, 
  CheckCircle,
  Clock,
  ArrowUpRight,
  LayoutDashboard,
  Store,
  ShoppingBag
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import { auth } from '../../firebase';
import { NaNaSwitchLogo } from '../../components/nanaSwitch/NaNaSwitchLogo';

export interface NaNaSwitchLandingPageProps {
  onNavigateToConsole?: () => void;
  onNavigateToExtension?: () => void;
  onNavigate?: (path: string) => void;
}

interface CountryRouteDemo {
  code: string;
  name: string;
  flag: string;
  activeConnector: string;
  backupConnector: string;
  methods: string[];
  latency: string;
  status: 'optimal' | 'active';
}

const DEMO_COUNTRIES: CountryRouteDemo[] = [
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    flag: '🇨🇮',
    activeConnector: 'CinetPay (Nœud 01)',
    backupConnector: 'Wave Direct API',
    methods: ['Wave', 'Orange Money', 'MTN MoMo'],
    latency: '11ms',
    status: 'optimal'
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    flag: '🇧🇫',
    activeConnector: 'LigdiCash (Nœud 02)',
    backupConnector: 'SebPay Cloud',
    methods: ['Orange Money', 'Moov Money'],
    latency: '14ms',
    status: 'optimal'
  },
  {
    code: 'SN',
    name: 'Sénégal',
    flag: '🇸🇳',
    activeConnector: 'PayDunya (Nœud 03)',
    backupConnector: 'Wave Direct API',
    methods: ['Wave', 'Orange Money', 'Free Money'],
    latency: '12ms',
    status: 'optimal'
  },
  {
    code: 'BJ',
    name: 'Bénin',
    flag: '🇧🇯',
    activeConnector: 'FedaPay (Nœud 04)',
    backupConnector: 'SebPay Cloud',
    methods: ['MTN MoMo', 'Moov Money'],
    latency: '15ms',
    status: 'optimal'
  },
  {
    code: 'TG',
    name: 'Togo',
    flag: '🇹🇬',
    activeConnector: 'FedaPay (Nœud 04)',
    backupConnector: 'CinetPay (Nœud 01)',
    methods: ['T-Money', 'Moov Money'],
    latency: '16ms',
    status: 'optimal'
  },
  {
    code: 'INT',
    name: 'International (15+ Pays)',
    flag: '🌍',
    activeConnector: 'Moneroo & Pawapay',
    backupConnector: 'Carte Bancaire / Stripe',
    methods: ['Visa / Mastercard', 'Multi-Devises'],
    latency: '18ms',
    status: 'optimal'
  }
];

export const NaNaSwitchLandingPage: React.FC<NaNaSwitchLandingPageProps> = ({
  onNavigateToConsole,
  onNavigateToExtension,
  onNavigate
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('CI');
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'nodejs' | 'python' | 'php'>('curl');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [simulatedDispatchPulse, setSimulatedDispatchPulse] = useState<boolean>(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'recharge'>('recharge');

  // Animation réactive d'aiguillage lors du changement de pays
  const handleSelectCountry = useCallback((code: string) => {
    playTapBeep();
    setSelectedCountryCode(code);
    setSimulatedDispatchPulse(true);
    const timer = setTimeout(() => setSimulatedDispatchPulse(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const activeCountry = useMemo(() => {
    return DEMO_COUNTRIES.find(c => c.code === selectedCountryCode) || DEMO_COUNTRIES[0];
  }, [selectedCountryCode]);

  // 1. CHEMIN 1 : ESPACE BYOK (Ceux qui ont leur propre client API & parcours d'insertion des clés)
  const handleGoToByok = useCallback(() => {
    playValidationBeep();
    const target = '/nana-switch/connectors';
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nanaswitch_auth_redirect', target);
    }
    const destination = auth.currentUser ? target : '/nana-switch/auth';
    if (onNavigate) {
      onNavigate(destination);
    } else if (onNavigateToConsole) {
      onNavigateToConsole();
    } else if (typeof window !== 'undefined') {
      window.location.href = destination;
    }
  }, [onNavigateToConsole, onNavigate]);

  // 2. CHEMIN 2 : ESPACE MARCHAND (Tableau de bord & création de l'application boutique)
  const handleGoToMerchant = useCallback(() => {
    playTapBeep();
    const destination = '/dashboard';
    if (onNavigate) {
      onNavigate(destination);
    } else if (typeof window !== 'undefined') {
      window.location.href = destination;
    }
  }, [onNavigate]);

  // Redirection générique vers la console (alias BYOK)
  const handleGoToConsole = handleGoToByok;

  const handleGoToAuth = useCallback(() => {
    playTapBeep();
    const destination = '/nana-switch/auth';
    if (onNavigate) {
      onNavigate(destination);
    } else if (typeof window !== 'undefined') {
      window.location.href = destination;
    }
  }, [onNavigate]);

  const handleGoToExtension = useCallback(() => {
    playTapBeep();
    if (onNavigateToExtension) {
      onNavigateToExtension();
    } else if (onNavigate) {
      onNavigate('/nana-switch/extension');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/nana-switch/extension';
    }
  }, [onNavigateToExtension, onNavigate]);

  // Copie de code SDK
  const handleCopyCode = useCallback((codeText: string) => {
    playTapBeep();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(codeText);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    }
  }, []);

  // Snippets de code multi-langages
  const codeSnippets = useMemo(() => {
    return {
      curl: `curl -X POST https://api.nanaswitch.cloud/v1/dispatch \\
  -H "Authorization: Bearer nana_sw_live_sec_9841af82b" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 15000,
    "currency": "XOF",
    "country": "${activeCountry.code}",
    "customer": {
      "name": "Amadou Traoré",
      "phone": "+2250700000000"
    },
    "metadata": {
      "order_id": "ORD-94819"
    }
  }'`,
      nodejs: `import { NaNaSwitchCloud } from '@nanaswitch/cloud-sdk';

const router = new NaNaSwitchCloud({
  apiKey: 'nana_sw_live_sec_9841af82b',
  failoverEnabled: true
});

const dispatch = await router.dispatch({
  amount: 15000,
  currency: 'XOF',
  country: '${activeCountry.code}',
  customer: { phone: '+2250700000000' }
});

console.log('Aiguillé via:', dispatch.routedConnector);
console.log('Session URL:', dispatch.sessionUrl);`,
      python: `from nanaswitch import NaNaSwitchCloud

client = NaNaSwitchCloud(api_key="nana_sw_live_sec_9841af82b")

response = client.dispatch(
    amount=15000,
    currency="XOF",
    country="${activeCountry.code}",
    customer={"phone": "+2250700000000"}
)

print(f"Routé avec succès vers: {response.routed_connector}")`,
      php: `<?php
require_once 'vendor/autoload.php';

$nanaSwitch = new \\NaNaSwitch\\CloudRouter('nana_sw_live_sec_9841af82b');

$session = $nanaSwitch->dispatch([
    'amount' => 15000,
    'currency' => 'XOF',
    'country' => '${activeCountry.code}',
    'customer' => ['phone' => '+2250700000000']
]);

header('Location: ' . $session->checkoutUrl);
exit;`
    };
  }, [activeCountry.code]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* ========================================================================= */}
      {/* 1. EN-TÊTE (NAVBAR) DE NANASWITCH CLOUD */}
      {/* ========================================================================= */}
      <header className="bg-white/95 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo & Badge Cloud ("Le Cœur de Routage") */}
          <div className="flex items-center shrink-0">
            <div className="sm:hidden">
              <NaNaSwitchLogo variant="mobile-header" theme="light" />
            </div>
            <div className="hidden sm:block">
              <NaNaSwitchLogo variant="full" size="md" theme="light" />
            </div>
          </div>

          {/* Liens d'ancrage centraux */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition">
              Fonctionnement
            </a>
            <a href="#connectors" className="hover:text-blue-600 transition">
              Connecteurs API
            </a>
            <a href="#routing" className="hover:text-blue-600 transition">
              Routage Intelligent
            </a>
            <a href="#extension" className="hover:text-blue-600 transition">
              Extension Isolée
            </a>
            <a href="#pricing" className="hover:text-blue-600 transition">
              Tarifs Crédits
            </a>
          </nav>

          {/* Boutons d'Action Droite : 2 Chemins Majeurs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleGoToMerchant}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/50 text-slate-800 hover:text-emerald-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Ouvrir l'Espace Marchand et le tableau de bord"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Espace Marchand</span>
            </button>

            <button
              type="button"
              onClick={handleGoToByok}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/25 transition cursor-pointer active:scale-95 flex items-center gap-1.5"
              title="Espace BYOK : Insertion des clés API et console Cloud"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Espace BYOK</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION : ROUTEUR CLOUD INTELLIGENT */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-white">
        
        {/* Cercles diffus décoratifs Bleu Royal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="max-w-4xl mx-auto text-center space-y-6">
            
            {/* Badge supérieur officiel */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
              <span>INFRASTRUCTURE CLOUD INTELLIGENTE &amp; ROUTEUR D&apos;API MULTI-PAYS</span>
            </div>

            {/* Grand Titre H1 */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Branchez vos API de production.{' '}
              <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                Étendez votre couverture
              </span>{' '}
              dans 15+ pays en un éclair.
            </h1>

            {/* Sous-titre exact selon le positionnement sémantique */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
              NaNaSwitch Cloud est le routeur SaaS intelligent qui permet aux entrepreneurs et développeurs de connecter leurs propres clés d&apos;agrégateurs et services externes sur un Nœud Cloud à IP Fixe, avec bascule anti-panne en 0ms et Extension Isolée.
            </p>

            {/* 2 CHEMINS MAJEURS : ESPACE BYOK & ESPACE MARCHAND */}
            <div className="pt-4 max-w-4xl mx-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                
                {/* CHEMIN 1 : ESPACE BYOK */}
                <div 
                  onClick={handleGoToByok}
                  className="group relative p-6 rounded-2xl bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white border-2 border-blue-500/50 hover:border-blue-400 shadow-xl shadow-blue-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-blue-500/20 text-cyan-300 border border-blue-400/40">
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      Chemin 1 • Clients Autonomes
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                  <h3 className="text-xl font-black text-white group-hover:text-cyan-200 transition-colors flex items-center gap-2">
                    <span>Espace BYOK</span>
                    <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1.5 transition-transform" />
                  </h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed mt-2">
                    Pour ceux qui ont déjà leur propre compte client agrégateurs (CinetPay, Wave, Orange, LigdiCash...). Entrez directement dans la console pour le parcours d&apos;insertion de vos clés API.
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleGoToByok(); }}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Key className="w-4 h-4" />
                      <span>Accéder à l&apos;Espace BYOK (Clés API) →</span>
                    </button>
                  </div>
                </div>

                {/* CHEMIN 2 : ESPACE MARCHAND */}
                <div 
                  onClick={handleGoToMerchant}
                  className="group relative p-6 rounded-2xl bg-white text-slate-900 border-2 border-emerald-500/40 hover:border-emerald-500 shadow-xl shadow-emerald-500/5 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      Chemin 2 • Vente &amp; E-Commerce
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                    <span>Espace Marchand</span>
                    <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1.5 transition-transform" />
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2">
                    Ouvrez l&apos;espace de création de votre application et accédez directement à votre tableau de bord marchand tout-en-un (caisse POS, stocks, boutique et encaissement).
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleGoToMerchant(); }}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Ouvrir l&apos;Espace Marchand (Dashboard) →</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Raccourci secondaire Extension */}
              <div className="flex items-center justify-center gap-3 pt-2 text-xs font-bold text-slate-500">
                <span>Besoin d&apos;intégrer NaNaSwitch dans un site existant ?</span>
                <button
                  type="button"
                  onClick={handleGoToExtension}
                  className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Puzzle className="w-3.5 h-3.5" />
                  <span>Voir l&apos;Extension Isolée →</span>
                </button>
              </div>
            </div>

            {/* Badges de Réassurance en Ligne */}
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 pt-4 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Chiffrement Cloud AES-256</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>IP Fixe Cloud Sortante</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Bascule Anti-Panne 0ms</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zéro Dépendance Bancaire</span>
              </span>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* SCHÉMA VISUEL ANIMÉ (INTERACTIVE CLOUD ROUTING DIAGRAM) */}
          {/* ========================================================================= */}
          <div className="mt-14 max-w-5xl mx-auto">
            
            <div className="bg-white rounded-3xl border-2 border-blue-200/80 shadow-2xl p-5 sm:p-8 relative overflow-hidden">
              
              {/* En-tête du simulateur */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                    Simulateur d&apos;Aiguillage Cloud en Direct (0ms)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>IP Cloud Fixe : <strong>194.163.148.22</strong></span>
                </div>
              </div>

              {/* Sélecteur de pays d'essai */}
              <div className="pt-5 pb-3">
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Sélectionnez un pays pour observer la bascule intelligente du routeur :
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEMO_COUNTRIES.map((cty) => (
                    <button
                      key={cty.code}
                      type="button"
                      onClick={() => handleSelectCountry(cty.code)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        selectedCountryCode === cty.code
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black scale-102'
                          : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className="text-base">{cty.flag}</span>
                      <span>{cty.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Schéma de flux 3 blocs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4 items-center">
                
                {/* Bloc 1 : Votre Boutique / Extension */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Émetteur
                    </span>
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                      SDK / Webhook
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-blue-600" />
                    <span>Votre Site / Boutique / Extension</span>
                  </h4>
                  <div className="p-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-mono truncate">
                    <span className="text-blue-400">auth:</span> nana_sw_live_sec_9841a...
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Requête universelle unique, indépendante des protocoles spécifiques.
                  </p>
                </div>

                {/* Bloc 2 : Cœur NaNaSwitch Cloud */}
                <div className={`p-6 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-600/25 space-y-3 relative overflow-hidden transition-all duration-300 ${simulatedDispatchPulse ? 'ring-4 ring-blue-300 scale-102' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                      Cœur Nœud Cloud
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-300">
                      <Wifi className="w-3 h-3" />
                      <span>{activeCountry.latency}</span>
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 fill-white" />
                      <span>NaNaSwitch Cloud</span>
                    </h4>
                    <p className="text-xs text-blue-100 mt-0.5">
                      Aiguillage géolocalisé &amp; Sécurité AES-256
                    </p>
                  </div>
                  <div className="space-y-1.5 pt-1 text-[11px]">
                    <div className="flex items-center justify-between bg-white/10 px-2.5 py-1 rounded-lg">
                      <span>Pays détecté :</span>
                      <strong className="font-bold">{activeCountry.flag} {activeCountry.name}</strong>
                    </div>
                    <div className="flex items-center justify-between bg-white/10 px-2.5 py-1 rounded-lg">
                      <span>Bascule Anti-Panne :</span>
                      <strong className="text-emerald-300 font-bold">0ms Prête</strong>
                    </div>
                  </div>
                </div>

                {/* Bloc 3 : Connecteur Actif Sélectionné */}
                <div className="p-5 rounded-2xl bg-blue-50/70 border-2 border-blue-300 space-y-2.5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      Aiguillé Automatiquement
                    </span>
                    <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Connecté</span>
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      {activeCountry.activeConnector}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Secours automatique : <strong>{activeCountry.backupConnector}</strong>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeCountry.methods.map((m, idx) => (
                      <span key={idx} className="text-[10px] font-bold bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md shadow-2xs">
                        {m}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Vos propres clés d&apos;agrégateurs de production sont injectées en mémoire sécurisée.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 3. SECTION DES 4 PILIERS TECHNOLOGIQUES (GRILLE BENTO) */}
      {/* ========================================================================= */}
      <section id="features" className="py-20 lg:py-28 bg-white border-t border-slate-100">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              ARCHITECTURE ROUTEUR SAAS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              4 Piliers Conçus pour la Haute Disponibilité et l&apos;Étendue Géographique
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Découvrez comment NaNaSwitch Cloud résout définitivement les pannes d&apos;agrégateurs et l&apos;exposition risquée des identifiants API.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Pilier 1 : Coffre Multi-Connecteurs BYOK */}
            <div className="bg-white rounded-3xl border border-blue-100 p-8 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all space-y-5 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center group-hover:scale-105 transition">
                  <Key className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-blue-600 tracking-wider">
                    SÉCURITÉ ZERO-KNOWLEDGE
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    1. Coffre Multi-Connecteurs (BYOK - Bring Your Own Keys)
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Branchez vos propres identifiants API de production en 30 secondes. Vos clés secrètes sont chiffrées en AES-256 dans notre Cloud et ne sont jamais exposées côté client ni stockées en clair.
                </p>
              </div>

              {/* Visuel Technique Mockup */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white font-mono text-xs space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Coffre Chiffré AES-256</span>
                  <span className="text-emerald-400 font-bold">Verrouillé ✓</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">CinetPay API Key:</span>
                  <span className="text-blue-400">cnet_prod_••••••••9102</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Wave Secret Token:</span>
                  <span className="text-blue-400">wave_sec_••••••••8421</span>
                </div>
              </div>
            </div>

            {/* Pilier 2 : Routage Géographique Intelligent */}
            <div id="routing" className="bg-white rounded-3xl border border-blue-100 p-8 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all space-y-5 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center group-hover:scale-105 transition">
                  <Globe className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-blue-600 tracking-wider">
                    GÉO-AIGUILLAGE AUTOMATIQUE
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    2. Routage Géographique Intelligent par Pays
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Définissez quel connecteur API s&apos;active automatiquement selon le pays de votre utilisateur (🇧🇫 Burkina Faso, 🇨🇮 Côte d&apos;Ivoire, 🇸🇳 Sénégal, 🇲🇱 Mali, 🇧🇯 Bénin, 🇹🇬 Togo, 🇨🇲 Cameroun, 🌍 International).
                </p>
              </div>

              {/* Visuel Matrice de Routage */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>Règle Pays</span>
                  <span>Connecteur Activé</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between font-bold">
                  <span>🇧🇫 BF (Burkina Faso)</span>
                  <span className="text-blue-600">➡️ LigdiCash + SebPay</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between font-bold">
                  <span>🇨🇮 CI (Côte d&apos;Ivoire)</span>
                  <span className="text-blue-600">➡️ CinetPay + Wave Direct</span>
                </div>
              </div>
            </div>

            {/* Pilier 3 : IP Fixe Cloud & Bascule Anti-Panne */}
            <div className="bg-white rounded-3xl border border-blue-100 p-8 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all space-y-5 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center group-hover:scale-105 transition">
                  <Activity className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-blue-600 tracking-wider">
                    AUTO-FAILOVER HAUTE DISPONIBILITÉ
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    3. IP Fixe Cloud &amp; Bascule Anti-Panne (0ms)
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Bénéficiez d&apos;une IP Cloud sortante fixe pour vos whitelists API et d&apos;un basculement automatique sur votre 2ème connecteur si le premier ne répond pas ou renvoie une erreur 50x.
                </p>
              </div>

              {/* Visuel Moniteur de Santé */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs space-y-2 font-mono border border-slate-800">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>Status Nœud : ONLINE</span>
                  <span>SLA : 99.99%</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                  <span>IP Dédiée Whitelist : </span>
                  <strong className="text-blue-400">194.163.148.22/32</strong>
                </div>
              </div>
            </div>

            {/* Pilier 4 : Extension Isolée & SDK 1-Ligne */}
            <div id="extension" className="bg-white rounded-3xl border border-blue-100 p-8 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all space-y-5 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center group-hover:scale-105 transition">
                  <Puzzle className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-blue-600 tracking-wider">
                    INTÉGRATION UNIVERSELLE
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    4. Extension Isolée &amp; SDK Universel 1-Ligne
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Pilotez et connectez vos flux depuis n&apos;importe quelle application externe sans jamais exposer votre infrastructure mère. Compatible avec tout CMS, framework ou solution sur-mesure.
                </p>
              </div>

              {/* Visuel Callout Extension */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-slate-900 block">Extension Isolée Nœud Cloud</span>
                  <span className="text-slate-600 text-[11px]">Installation directe en 1-clic</span>
                </div>
                <button
                  type="button"
                  onClick={handleGoToExtension}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-sm"
                >
                  <span>Installer</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 4. SECTION CONNECTEURS API DE PRODUCTION (BYOK) */}
      {/* ========================================================================= */}
      <section id="connectors" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-black uppercase text-blue-600 tracking-widest bg-blue-100/70 px-3 py-1 rounded-full">
              ÉCOSYSTÈME DE PRODUCTION OUVERT
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Toutes vos API d&apos;Agrégateurs Prêtes à l&apos;Emploi
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              NaNaSwitch Cloud ne retient aucun fonds : vous injectez vos propres identifiants marchands et recevez vos liquidités directement sur vos comptes officiels.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'CinetPay', tag: '8 Pays', color: 'border-blue-200 bg-white' },
              { name: 'Wave Direct', tag: 'CI & SN', color: 'border-sky-200 bg-white' },
              { name: 'PayDunya', tag: 'Sénégal', color: 'border-emerald-200 bg-white' },
              { name: 'FedaPay', tag: 'Bénin & Togo', color: 'border-amber-200 bg-white' },
              { name: 'LigdiCash', tag: 'Burkina Faso', color: 'border-indigo-200 bg-white' },
              { name: 'SebPay Cloud', tag: 'Multi-Nœuds', color: 'border-blue-300 bg-white' },
              { name: 'Pawapay', tag: 'Pan-Africain', color: 'border-purple-200 bg-white' },
              { name: 'Moneroo', tag: 'Global', color: 'border-slate-300 bg-white' },
              { name: 'Orange Money', tag: 'API Marchand', color: 'border-orange-200 bg-white' },
              { name: 'MTN MoMo', tag: 'Developer API', color: 'border-yellow-200 bg-white' },
              { name: 'Moov Money', tag: 'Afrique de l\'Ouest', color: 'border-blue-200 bg-white' },
              { name: 'Cartes Visa/MC', tag: 'International', color: 'border-blue-200 bg-white' }
            ].map((conn, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-2xl border ${conn.color} shadow-2xs hover:shadow-md transition text-center space-y-1`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xs font-black">
                  ⚡
                </div>
                <h4 className="font-extrabold text-xs text-slate-900 mt-1">
                  {conn.name}
                </h4>
                <span className="text-[10px] text-slate-500 block font-medium">
                  {conn.tag}
                </span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SECTION DÉMONSTRATION TECHNIQUE SDK 1-LIGNE (BLEU NUIT #0F172A) */}
      {/* ========================================================================= */}
      <section className="py-20 lg:py-28 bg-[#0F172A] text-white relative overflow-hidden">
        
        {/* Glow Bleu Royal décoratif */}
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800">
                DÉVELOPPEURS &amp; INTÉGRATEURS
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Une seule intégration.{' '}
                <span className="text-blue-400">
                  Des dizaines de connecteurs
                </span>{' '}
                instantanément pilotés.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Ne perdez plus des semaines à coder les subtilités d&apos;API de chaque opérateur. Appelez simplement l&apos;endpoint unifié de NaNaSwitch Cloud et laissez notre moteur appliquer les règles de routage et de bascule automatique.
              </p>

              <div className="space-y-3 pt-2 text-xs font-bold text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Payload unifié normalisé pour tous les pays</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Webhooks instantanés avec signature HMAC SHA-256</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mode Sandbox sans aucun frais pour vos tests</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGoToConsole}
                  className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  <span>Générer mes clés de test Sandbox →</span>
                </button>
              </div>
            </div>

            {/* Terminal de code */}
            <div className="lg:col-span-7">
              <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
                
                {/* Barre de commande du terminal */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="text-xs font-mono text-slate-400 ml-2">api.nanaswitch.cloud</span>
                  </div>

                  {/* Onglets de langages */}
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    {(['curl', 'nodejs', 'python', 'php'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setActiveCodeTab(tab);
                        }}
                        className={`px-2.5 py-1 rounded-lg uppercase transition cursor-pointer ${
                          activeCodeTab === tab
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {tab === 'nodejs' ? 'Node.js' : tab}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleCopyCode(codeSnippets[activeCodeTab])}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-2 transition cursor-pointer"
                      title="Copier le code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Bloc de code */}
                <div className="p-5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
                  <pre className="whitespace-pre">
                    <code>{codeSnippets[activeCodeTab]}</code>
                  </pre>
                </div>

              </div>
            </div>

          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 6. SECTION TARIFICATION PAR PORTEFEUILLE DE CRÉDITS & PLANS SAAS */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 lg:py-28 bg-white border-t border-slate-200">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              TARIFICATION TRANSPARENTE
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Payez uniquement ce que vous acheminez
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Zéro pourcentage sur votre chiffre d&apos;affaires. Vous achetez des crédits d&apos;appels de routage pour votre Nœud Cloud, sans engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            
            {/* Plan 1 : Starter Sandbox */}
            <div className="rounded-3xl border border-slate-200 p-8 space-y-6 flex flex-col justify-between hover:shadow-lg transition-all bg-white">
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  DÉMARRAGE RAPIDE
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Starter Sandbox
                </h3>
                <div className="pt-2">
                  <span className="text-4xl font-black text-slate-900">0 FCFA</span>
                  <span className="text-xs text-slate-500 block mt-1">Gratuit pour toujours</span>
                </div>
                <p className="text-xs text-slate-600">
                  Idéal pour tester vos flux API et configurer vos premiers connecteurs en environnement de test.
                </p>

                <div className="border-t border-slate-100 pt-4 space-y-3 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>50 requêtes de routage de test / mois</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Simulation multi-pays dans 15+ pays</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1 Connecteur actif configuré</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Documentation &amp; SDK universels</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoToConsole}
                className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-300 hover:border-blue-600 hover:text-blue-600 font-extrabold text-xs transition cursor-pointer"
              >
                Tester en Sandbox
              </button>
            </div>

            {/* Plan 2 : Cloud Pro Pay-As-You-Go (Recommandé) */}
            <div className="rounded-3xl border-2 border-blue-600 p-8 space-y-6 flex flex-col justify-between shadow-xl shadow-blue-600/15 bg-white relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                LE PLUS POPULAIRE
              </div>

              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-blue-600">
                  PRODUCTION INDÉPENDANTE
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Cloud Pro (Pay-As-You-Go)
                </h3>
                <div className="pt-2">
                  <span className="text-4xl font-black text-blue-600">15 000 FCFA</span>
                  <span className="text-xs text-slate-500 block mt-1">Recharge de 1 000 crédits d&apos;appels</span>
                </div>
                <p className="text-xs text-slate-600">
                  La formule standard pour les commerçants et développeurs en production avec connecteurs illimités.
                </p>

                <div className="border-t border-slate-100 pt-4 space-y-3 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Connecteurs API illimités (BYOK)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Bascule Anti-Panne automatique (0ms)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>IP Cloud Fixe Sortante dédiée</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Routage géographique par pays</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Webhooks &amp; alertes WhatsApp de santé</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoToConsole}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 transition cursor-pointer active:scale-95"
              >
                Démarrer avec Cloud Pro →
              </button>
            </div>

            {/* Plan 3 : Enterprise & Agences */}
            <div className="rounded-3xl border border-slate-200 p-8 space-y-6 flex flex-col justify-between hover:shadow-lg transition-all bg-white">
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  HAUTE PERFORMANCE
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Enterprise &amp; Agences
                </h3>
                <div className="pt-2">
                  <span className="text-4xl font-black text-slate-900">50 000 FCFA</span>
                  <span className="text-xs text-slate-500 block mt-1">/ mois (Multi-Projets)</span>
                </div>
                <p className="text-xs text-slate-600">
                  Pour les plateformes à fort volume, les agences web et les franchises multi-boutiques.
                </p>

                <div className="border-t border-slate-100 pt-4 space-y-3 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Projets &amp; Domaines illimités</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Extension Isolée Marque Blanche</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>SLA Contractuel garanti 99.99%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Support Ingénieur Dédié WhatsApp VIP</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoToConsole}
                className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-300 hover:border-blue-600 hover:text-blue-600 font-extrabold text-xs transition cursor-pointer"
              >
                Accès Cockpit Enterprise
              </button>
            </div>

          </div>

          {/* Bannière de conclusion CTA */}
          <div className="mt-16 p-8 rounded-3xl bg-blue-50/80 border border-blue-200 text-center max-w-4xl mx-auto space-y-4">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Prêt à connecter vos API sur NaNaSwitch Cloud ?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto">
              Configurez votre premier connecteur en 2 minutes chrono dans le Cockpit Central. Aucune carte bancaire requise pour débuter.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleGoToByok}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/25 transition cursor-pointer active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Espace BYOK (Insertion Clés) →</span>
              </button>

              <button
                type="button"
                onClick={handleGoToMerchant}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 border-2 border-emerald-400 font-extrabold text-xs sm:text-sm transition cursor-pointer active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                <span>Espace Marchand (Dashboard) →</span>
              </button>
            </div>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 7. FOOTER NANASWITCH CLOUD */}
      {/* ========================================================================= */}
      <footer className="bg-slate-900 text-white py-14 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            
            {/* Marque */}
            <div className="space-y-3">
              <div>
                <NaNaSwitchLogo variant="full" size="sm" theme="dark" />
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Routeur Cloud Intelligent &amp; SaaS d&apos;Aiguillage d&apos;API Multi-Connecteurs pour l&apos;Afrique et l&apos;International.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tous les Nœuds Cloud Opérationnels</span>
              </div>
            </div>

            {/* Liens Produit */}
            <div className="space-y-2.5">
              <h5 className="font-black text-white uppercase text-[11px] tracking-wider">
                Produit
              </h5>
              <ul className="space-y-1.5 text-slate-400">
                <li><a href="#features" className="hover:text-white transition">Fonctionnalités Cloud</a></li>
                <li><a href="#connectors" className="hover:text-white transition">Connecteurs BYOK</a></li>
                <li><a href="#routing" className="hover:text-white transition">Routage Intelligent</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Tarifs Crédits</a></li>
              </ul>
            </div>

            {/* Outils & Accès */}
            <div className="space-y-2.5">
              <h5 className="font-black text-white uppercase text-[11px] tracking-wider">
                Console &amp; Outils
              </h5>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <button type="button" onClick={handleGoToConsole} className="hover:text-white transition cursor-pointer text-left">
                    Cockpit Central (/overview)
                  </button>
                </li>
                <li>
                  <button type="button" onClick={handleGoToExtension} className="hover:text-white transition cursor-pointer text-left">
                    Extension Isolée (/extension)
                  </button>
                </li>
                <li>
                  <span className="text-slate-500">IP Fixe : 194.163.148.22</span>
                </li>
                <li>
                  <span className="text-slate-500">Chiffrement AES-256</span>
                </li>
              </ul>
            </div>

            {/* Sécurité & Législation */}
            <div className="space-y-2.5">
              <h5 className="font-black text-white uppercase text-[11px] tracking-wider">
                Engagement SaaS
              </h5>
              <p className="text-slate-400 text-xs leading-relaxed">
                NaNaSwitch Cloud est un outil d&apos;aiguillage technique logiciel (SaaS Router). Aucun fonds client n&apos;est séquestré ni conservé sur nos serveurs.
              </p>
              <div className="text-[11px] text-slate-500 pt-1">
                Conformité BYOK &amp; Confidentialité Totale
              </div>
            </div>

          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
            <div>
              © {new Date().getFullYear()} NaNaSwitch Cloud. Tous droits réservés.
            </div>
            <div className="flex items-center gap-4">
              <span>Smart Cloud Router &amp; Intelligent API SaaS</span>
              <span>•</span>
              <span>Architecture Haute Disponibilité</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default NaNaSwitchLandingPage;
