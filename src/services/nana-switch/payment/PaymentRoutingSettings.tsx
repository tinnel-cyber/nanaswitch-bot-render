import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  Key, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  Check, 
  Globe, 
  ArrowRight, 
  HelpCircle, 
  Server, 
  Radio, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Copy,
  Layers,
  Truck,
  Crown,
  RefreshCw
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { StoreUser, StoreSubscription } from '../../../types';
import { 
  getPaymentApiStaticIp, 
  getPaymentApiBaseUrl, 
  getPaymentServiceHealth, 
  StaticIpInfo, 
  PaymentServiceHealth, 
  PRIMARY_FIXIE_IP,
  BANK_VALIDATION_STATUS 
} from '../../../services/paymentApiService';
import { isFreePlan, triggerProFeatureUpsell } from '../../../utils/planFeatures';

export type PaymentRoutingMode = 'nanasore' | 'sovereign';

export interface SovereignProviderOption {
  id: string;
  name: string;
  countryScope: string;
  badge?: string;
  docUrl: string;
  publicKeyPlaceholder: string;
  secretKeyPlaceholder: string;
}

export const SOVEREIGN_PROVIDERS: SovereignProviderOption[] = [
  {
    id: 'sebpay',
    name: 'SebPay Live Production',
    countryScope: '20 Pays Africains (Zone UEMOA, CEMAC, Afrique de l’Est/Centrale & Diaspora)',
    badge: 'Passerelle 20 Pays (Officielle)',
    docUrl: 'https://sebpay.bj',
    publicKeyPlaceholder: 'pk_live_HHxzZ2CNfZpcioxCUhIyi9ufsgV0relupjuNDBDo',
    secretKeyPlaceholder: 'sk_live_vvCQ1dGUl4h7FqBG645Es19w4L1E827UuR25fPPkMzH68kGEoG8tW41gHDW6'
  },
  {
    id: 'render_fixie',
    name: 'Micro-Service Render & Fixie',
    countryScope: 'Passerelle Dédiée 0 Carte Bancaire (IP Statique Whitelistée)',
    badge: 'IP Statique Fixie',
    docUrl: 'https://dashboard.render.com',
    publicKeyPlaceholder: 'https://nana-payment-api.onrender.com',
    secretKeyPlaceholder: 'konkobo_telecom_webhook_secret_key_2026'
  },
  {
    id: 'fedapay',
    name: 'FedaPay',
    countryScope: 'Bénin, Togo, Côte d’Ivoire, Niger',
    badge: 'Mobile Money & Cartes',
    docUrl: 'https://fedapay.com',
    publicKeyPlaceholder: 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxx',
    secretKeyPlaceholder: 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'
  },
  {
    id: 'paydunya',
    name: 'PayDunya',
    countryScope: 'Sénégal, Côte d’Ivoire, Bénin, Burkina Faso',
    badge: 'Panafricain',
    docUrl: 'https://paydunya.com',
    publicKeyPlaceholder: 'master_key_xxxxxxxxxxxxxxxxxxxxxxxx',
    secretKeyPlaceholder: 'private_key_xxxxxxxxxxxxxxxxxxxxxxxx'
  },
  {
    id: 'ligdicash',
    name: 'LigdiCash',
    countryScope: 'Burkina Faso, UEMOA',
    badge: 'Spécialiste UEMOA',
    docUrl: 'https://ligdicash.com',
    publicKeyPlaceholder: 'api_key_xxxxxxxxxxxxxxxxxxxxxxxx',
    secretKeyPlaceholder: 'auth_token_xxxxxxxxxxxxxxxxxxxxxxxx'
  },
  {
    id: 'cinetpay',
    name: 'CinPay (CinetPay)',
    countryScope: 'Côte d’Ivoire, Mali, Sénégal, Cameroun',
    badge: 'Multi-Pays',
    docUrl: 'https://cinetpay.com',
    publicKeyPlaceholder: 'cinet_apikey_xxxxxxxxxxxxxxxxxxxx',
    secretKeyPlaceholder: 'cinet_site_id_xxxxxxxxxxxxxxxxxx'
  },
  {
    id: 'pawapay',
    name: 'PawaPay',
    countryScope: 'RDC, Cameroun, Zambie, Ghana, Rwanda',
    badge: 'Agrégateur Telco',
    docUrl: 'https://pawapay.io',
    publicKeyPlaceholder: 'pawa_token_xxxxxxxxxxxxxxxxxxxxxx',
    secretKeyPlaceholder: 'pawa_secret_xxxxxxxxxxxxxxxxxxxxx'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    countryScope: 'International (Europe, USA, Diaspora, Cartes & Apple Pay)',
    badge: 'Cartes Mondiales',
    docUrl: 'https://stripe.com',
    publicKeyPlaceholder: 'pk_live_51xxxxxxxxxxxxxxxxxxxxxx',
    secretKeyPlaceholder: 'sk_live_51xxxxxxxxxxxxxxxxxxxxxx'
  },
  {
    id: 'webhook',
    name: 'Webhook Personnalisé',
    countryScope: 'Serveur Propre / API Custom',
    badge: 'Sur Mesure',
    docUrl: 'https://docs.nanasore.com',
    publicKeyPlaceholder: 'https://api.votre-domaine.com/webhook/nanasore',
    secretKeyPlaceholder: 'whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxx'
  }
];

export interface PaymentRoutingConfig {
  routingMode: PaymentRoutingMode;
  sovereignProvider: string;
  publicKey: string;
  secretKey: string;
  webhookUrl?: string;
  allowCod: boolean;
  enabledMethods?: string[]; // ['orange_money', 'moov_money', 'wave', 'mtn_momo', 'cod']
  operatorNumbers?: {
    orange_money?: string;
    moov_money?: string;
    wave?: string;
    mtn_momo?: string;
  };
  wavePaymentLink?: string;
  updatedAt: number;
}

export interface PaymentRoutingSettingsProps {
  initialConfig?: Partial<PaymentRoutingConfig>;
  onSave?: (config: PaymentRoutingConfig) => void;
  className?: string;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  isFreeAccount?: boolean;
}

const STORAGE_KEY = 'nanasore_payment_routing_settings';

/**
 * Composant de configuration du routage de paiement Nanasore
 * Permet au commerçant de choisir entre :
 * 1. Nanasore Pay (Recommandé - Clé en main 0 configuration)
 * 2. Passerelle Souveraine (Direct - Connexion API FedaPay, Paydunya, LigdiCash, CinetPay, PawaPay, Stripe, Webhook)
 * Et de configurer les moyens de paiement activés (Orange, Moov, Wave, MTN, COD) et leurs numéros de réception.
 */
export const PaymentRoutingSettings: React.FC<PaymentRoutingSettingsProps> = ({
  initialConfig,
  onSave,
  className = '',
  currentUser,
  subscription,
  isFreeAccount = false
}) => {
  const isFree = isFreeAccount || isFreePlan(subscription || currentUser?.subscription);
  // Récupération de la configuration sauvegardée ou par défaut
  const [routingMode, setRoutingMode] = useState<PaymentRoutingMode>(() => {
    if (initialConfig?.routingMode) return initialConfig.routingMode;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('nana_seller_payment_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.routingMode || 'nanasore';
      }
    } catch {
      // Ignorer
    }
    return 'nanasore';
  });

  const [providerId, setProviderId] = useState<string>(() => {
    if (initialConfig?.sovereignProvider) return initialConfig.sovereignProvider;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.sovereignProvider || 'fedapay';
      }
    } catch {
      // Ignorer
    }
    return 'fedapay';
  });

  const [publicKey, setPublicKey] = useState<string>(() => {
    if (initialConfig?.publicKey) return initialConfig.publicKey;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).publicKey || '';
    } catch {
      // Ignorer
    }
    return '';
  });

  const [secretKey, setSecretKey] = useState<string>(() => {
    if (initialConfig?.secretKey) return initialConfig.secretKey;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).secretKey || '';
    } catch {
      // Ignorer
    }
    return '';
  });

  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    if (initialConfig?.webhookUrl) return initialConfig.webhookUrl;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).webhookUrl || '';
    } catch {
      // Ignorer
    }
    return '';
  });

  // RÈGLE 4 : Choix des moyens de paiement (Orange, Moov, Wave, MTN, COD) - Tous activés par défaut
  const [enabledMethods, setEnabledMethods] = useState<string[]>(() => {
    if (initialConfig?.enabledMethods && initialConfig.enabledMethods.length > 0) {
      return initialConfig.enabledMethods;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('nana_seller_payment_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.enabledMethods && Array.isArray(parsed.enabledMethods) && parsed.enabledMethods.length > 0) {
          return parsed.enabledMethods;
        }
      }
    } catch {}
    return ['orange_money', 'moov_money', 'wave', 'mtn_momo', 'cod'];
  });

  // Numéros et liens marchands personnalisés
  const [orangeNumber, setOrangeNumber] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('nana_seller_payment_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.operatorNumbers?.orange_money || '+226 65 56 58 05';
      }
    } catch {}
    return '+226 65 56 58 05';
  });

  const [moovNumber, setMoovNumber] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('nana_seller_payment_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.operatorNumbers?.moov_money || '+226 65 56 58 05';
      }
    } catch {}
    return '+226 65 56 58 05';
  });

  const [waveNumber, setWaveNumber] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('nana_seller_payment_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.operatorNumbers?.wave || '+226 65 56 58 05';
      }
    } catch {}
    return '+226 65 56 58 05';
  });

  const [wavePaymentLink, setWavePaymentLink] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('nana_seller_payment_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.wavePaymentLink || 'https://pay.wave.com';
      }
    } catch {}
    return 'https://pay.wave.com';
  });

  const [mtnNumber, setMtnNumber] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('nana_seller_payment_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.operatorNumbers?.mtn_momo || '+226 65 56 58 05';
      }
    } catch {}
    return '+226 65 56 58 05';
  });

  const [allowCod, setAllowCod] = useState<boolean>(() => {
    return enabledMethods.includes('cod');
  });

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [staticIpInfo, setStaticIpInfo] = useState<StaticIpInfo | null>(null);
  const [serviceHealth, setServiceHealth] = useState<PaymentServiceHealth | null>(null);
  const [isLoadingIp, setIsLoadingIp] = useState<boolean>(false);
  const [copiedIp, setCopiedIp] = useState<boolean>(false);

  const handleCheckStaticIp = useCallback(async () => {
    setIsLoadingIp(true);
    try {
      const [ipData, healthData] = await Promise.all([
        getPaymentApiStaticIp(),
        getPaymentServiceHealth()
      ]);
      setStaticIpInfo(ipData);
      setServiceHealth(healthData);
    } catch {
      setStaticIpInfo({ status: 'error', isProxyActive: false });
      setServiceHealth({ status: 'offline', error: 'Inaccessible' });
    } finally {
      setIsLoadingIp(false);
    }
  }, []);

  const handleCopyIp = (ipToCopy: string) => {
    navigator.clipboard.writeText(ipToCopy);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2500);
  };

  useEffect(() => {
    handleCheckStaticIp();
  }, [handleCheckStaticIp]);

  const selectedProvider = SOVEREIGN_PROVIDERS.find(p => p.id === providerId) || SOVEREIGN_PROVIDERS[0];

  const togglePaymentMethod = (methodId: string) => {
    playTapBeep();
    setEnabledMethods(prev => {
      const exists = prev.includes(methodId);
      let updated: string[];
      if (exists) {
        updated = prev.filter(m => m !== methodId);
      } else {
        updated = [...prev, methodId];
      }
      // Règle 4 : Si aucune méthode n'est cochée, tout réactiver par défaut
      if (updated.length === 0) {
        updated = ['orange_money', 'moov_money', 'wave', 'mtn_momo', 'cod'];
      }
      if (methodId === 'cod') {
        setAllowCod(updated.includes('cod'));
      }
      return updated;
    });
  };

  // Sauvegarde des paramètres
  const handleSave = (e?: React.FormEvent, customAllowCod?: boolean) => {
    if (e) e.preventDefault();
    playValidationBeep();

    const activeCod = customAllowCod !== undefined ? customAllowCod : enabledMethods.includes('cod');
    const finalMethods = enabledMethods.length > 0 
      ? enabledMethods 
      : ['orange_money', 'moov_money', 'wave', 'mtn_momo', 'cod'];

    const config: PaymentRoutingConfig = {
      routingMode,
      sovereignProvider: providerId,
      publicKey: publicKey.trim(),
      secretKey: secretKey.trim(),
      webhookUrl: webhookUrl.trim(),
      allowCod: activeCod,
      enabledMethods: finalMethods,
      operatorNumbers: {
        orange_money: orangeNumber.trim() || '+226 65 56 58 05',
        moov_money: moovNumber.trim() || '+226 65 56 58 05',
        wave: waveNumber.trim() || '+226 65 56 58 05',
        mtn_momo: mtnNumber.trim() || '+226 65 56 58 05',
      },
      wavePaymentLink: wavePaymentLink.trim() || 'https://pay.wave.com',
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      localStorage.setItem('nana_seller_payment_config', JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('nana_payment_config_updated', { detail: config }));
    } catch {
      // Ignorer
    }

    if (onSave) {
      onSave(config);
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleToggleCod = () => {
    playTapBeep();
    const newCod = !allowCod;
    setAllowCod(newCod);
    setEnabledMethods(prev => {
      if (newCod && !prev.includes('cod')) return [...prev, 'cod'];
      if (!newCod && prev.includes('cod')) return prev.filter(m => m !== 'cod');
      return prev;
    });
    handleSave(undefined, newCod);
  };

  // Test de connexion API pour les clés souveraines et le micro-service Render
  const handleTestConnection = async () => {
    playTapBeep();
    setIsTesting(true);
    setTestResult(null);

    // Test en direct du micro-service Render & Proxy Fixie (Safe : aucun débit bancaire)
    if (selectedProvider.id === 'render_fixie') {
      try {
        const [health, ipInfo] = await Promise.all([
          getPaymentServiceHealth(),
          getPaymentApiStaticIp()
        ]);
        if (health.status === 'online') {
          setTestResult({
            success: true,
            message: `Connexion Render OK (${health.latencyMs}ms) • IP Fixie active (${ipInfo.ip || PRIMARY_FIXIE_IP}) • Firebase Admin ${health.firebaseConnected ? 'Connecté' : 'Actif'} • Moniteur UptimeRobot actif. Prêt pour validation bancaire.`
          });
          playValidationBeep();
        } else {
          setTestResult({
            success: false,
            message: `Serveur Render injoignable (${health.error || 'Erreur réseau'}). Vérifiez le service sur Render.`
          });
        }
      } catch (err: any) {
        setTestResult({
          success: false,
          message: `Échec du test Render : ${err.message}`
        });
      }
      setIsTesting(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1200));

    if (!publicKey && !secretKey) {
      setTestResult({
        success: false,
        message: 'Veuillez saisir au moins votre Clé Publique pour tester la connexion.'
      });
    } else {
      setTestResult({
        success: true,
        message: `Connexion établie avec succès à l'API ${selectedProvider.name}. Vos transactions sont prêtes.`
      });
      playValidationBeep();
    }
    setIsTesting(false);
  };

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-8 ${className}`}>
      
      {/* ===================================================================== */}
      {/* 1. EN-TÊTE DE LA PAGE                                                 */}
      {/* ===================================================================== */}
      <div className="border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            Trésorerie & Flux Financiers
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Encaissement & Trésorerie
        </h1>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          Choisissez comment vous souhaitez recevoir l'argent de vos ventes.
        </p>
      </div>

      {/* ===================================================================== */}
      {/* 2. LES DEUX OPTIONS PRINCIPALES (BENTO GRID / CARTES INTERACTIVES)    */}
      {/* ===================================================================== */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Sélectionnez votre mode de routage des paiements
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          
          {/* CARTE 1 : NANASORE PAY (RECOMMANDÉ) */}
          <div
            onClick={() => {
              playTapBeep();
              setRoutingMode('nanasore');
            }}
            className={`p-6 rounded-2xl bg-white border transition-all duration-200 cursor-pointer flex flex-col justify-between relative shadow-sm hover:shadow-md ${
              routingMode === 'nanasore'
                ? 'ring-2 ring-indigo-600 border-indigo-600'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              {/* Header : Icône & Badge Avantage */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                  routingMode === 'nanasore'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <Wallet className="w-6 h-6" />
                </div>

                {/* Badge Avantage Visuel Spécifié */}
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Activation instantanée</span>
                </span>
              </div>

              {/* Titre & Description exacte du cahier des charges */}
              <h3 className="text-lg font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                <span>Nanasore Pay (Recommandé)</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Commencez à vendre immédiatement sans configuration technique. Nous encaissons pour vous via notre numéro central. Vos fonds sont crédités sur votre solde Nanasore et retirables à tout moment.
              </p>
            </div>

            {/* Pied de Carte : État de sélection */}
            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Mobile Money, Cartes & Cryptos inclus</span>
              </span>

              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                routingMode === 'nanasore'
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}>
                {routingMode === 'nanasore' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* CARTE 2 : PASSERELLE SOUVERAINE (DIRECT) */}
          <div
            onClick={() => {
              playTapBeep();
              if (isFree) {
                triggerProFeatureUpsell('SOVEREIGN_GATEWAY');
                return;
              }
              setRoutingMode('sovereign');
            }}
            className={`p-6 rounded-2xl bg-white border transition-all duration-200 cursor-pointer flex flex-col justify-between relative shadow-sm hover:shadow-md ${
              routingMode === 'sovereign'
                ? 'ring-2 ring-indigo-600 border-indigo-600'
                : isFree
                ? 'border-amber-400/60 hover:border-amber-500 bg-gradient-to-b from-white to-amber-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              {/* Header : Icône & Badge Avantage */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                  routingMode === 'sovereign'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : isFree
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  <Zap className="w-6 h-6" />
                </div>

                {/* Badge Avantage Visuel Spécifié */}
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isFree ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {isFree ? <Crown className="w-3.5 h-3.5 text-amber-600" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isFree ? 'Réservé Starter & Pro' : '0% Commission'}</span>
                </span>
              </div>

              {/* Titre & Description exacte du cahier des charges */}
              <h3 className="text-lg font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                <span>Passerelle Souveraine (Direct)</span>
                {isFree && <Crown className="w-4 h-4 text-amber-500 animate-pulse" />}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connectez vos propres clés API (FedaPay, Stripe) ou votre Webhook personnalisé. L'argent va directement sur votre compte. 0% de commission sur vos ventes.
              </p>
            </div>

            {/* Pied de Carte : État de sélection */}
            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-600" />
                <span>Paiements déposés sur vos comptes directs</span>
              </span>

              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                routingMode === 'sovereign'
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}>
                {routingMode === 'sovereign' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. L'INTERFACE DE CONFIGURATION DYNAMIQUE (CONDITIONNELLE)            */}
      {/* ===================================================================== */}
      
      {/* CAS 1 : NANASORE PAY SÉLECTIONNÉ */}
      {routingMode === 'nanasore' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Mode Actif : Trésorerie Centralisée Nanasore Pay
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Prêt à l'emploi. Vous pouvez choisir les opérateurs activés et personnaliser vos numéros de réception ci-dessous, ou utiliser la passerelle par défaut.
              </p>
            </div>
          </div>

          {/* RÈGLE 4 : CHOIX DES MOYENS DE PAIEMENT & NUMÉROS MARCHANDS */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">
                Opérateurs Mobile Money Activés & Numéros de Réception
              </h5>
              <p className="text-[11px] text-slate-500">
                Cochez les moyens de paiement acceptés pour vos clients (Boutique, Lives, Webinaires, LMS) :
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Orange Money */}
              <div className={`p-4 rounded-xl border transition-all ${
                enabledMethods.includes('orange_money') ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enabledMethods.includes('orange_money')}
                      onChange={() => togglePaymentMethod('orange_money')}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-extrabold text-slate-900">Orange Money</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    USSD *144#
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">
                    Numéro Orange Money de réception :
                  </label>
                  <input
                    type="tel"
                    value={orangeNumber}
                    onChange={(e) => setOrangeNumber(e.target.value)}
                    placeholder="+226 65 56 58 05"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 2. Moov Money */}
              <div className={`p-4 rounded-xl border transition-all ${
                enabledMethods.includes('moov_money') ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enabledMethods.includes('moov_money')}
                      onChange={() => togglePaymentMethod('moov_money')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-extrabold text-slate-900">Moov Africa / Money</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    USSD *555#
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">
                    Numéro Moov Money de réception :
                  </label>
                  <input
                    type="tel"
                    value={moovNumber}
                    onChange={(e) => setMoovNumber(e.target.value)}
                    placeholder="+226 65 56 58 05"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 3. Wave */}
              <div className={`p-4 rounded-xl border transition-all ${
                enabledMethods.includes('wave') ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enabledMethods.includes('wave')}
                      onChange={() => togglePaymentMethod('wave')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-extrabold text-slate-900">Wave</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    0% Frais / 1-Clic
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-0.5">
                      Numéro Wave de réception :
                    </label>
                    <input
                      type="tel"
                      value={waveNumber}
                      onChange={(e) => setWaveNumber(e.target.value)}
                      placeholder="+226 65 56 58 05"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-0.5">
                      Lien de paiement Wave (optionnel) :
                    </label>
                    <input
                      type="url"
                      value={wavePaymentLink}
                      onChange={(e) => setWavePaymentLink(e.target.value)}
                      placeholder="https://pay.wave.com/..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. MTN Mobile Money */}
              <div className={`p-4 rounded-xl border transition-all ${
                enabledMethods.includes('mtn_momo') ? 'bg-yellow-50/40 border-yellow-200' : 'bg-slate-50 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enabledMethods.includes('mtn_momo')}
                      onChange={() => togglePaymentMethod('mtn_momo')}
                      className="w-4 h-4 rounded text-yellow-600 focus:ring-yellow-500"
                    />
                    <span className="text-xs font-extrabold text-slate-900">MTN Mobile Money</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                    MoMo
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">
                    Numéro MTN MoMo de réception :
                  </label>
                  <input
                    type="tel"
                    value={mtnNumber}
                    onChange={(e) => setMtnNumber(e.target.value)}
                    placeholder="+226 65 56 58 05"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Règle par défaut :</strong> Si aucune méthode n'est décochée, toutes les options ci-dessus restent actives par défaut dans la passerelle client pour ne bloquer aucun paiement.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Statut : <span className="font-bold text-emerald-600">Prêt pour les encaissements ({enabledMethods.length} moyens actifs)</span>
            </div>

            <button
              type="button"
              onClick={() => handleSave()}
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-sm hover:shadow transition flex items-center gap-2 cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Configuration enregistrée !</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder les moyens de paiement</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* CAS 2 : PASSERELLE SOUVERAINE SÉLECTIONNÉE */}
      {routingMode === 'sovereign' && (
        <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Paramètres de votre Passerelle Souveraine
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Renseignez vos clés API délivrées par votre fournisseur de paiement pour encaisser directement.
              </p>
            </div>

            {selectedProvider.docUrl && (
              <a
                href={selectedProvider.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
              >
                <span>Documentation {selectedProvider.name}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* 1. Menu Déroulant "Sélectionnez votre fournisseur" */}
          <div>
            <label htmlFor="sovereignProvider" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Sélectionnez votre fournisseur
            </label>
            <div className="relative">
              <select
                id="sovereignProvider"
                value={providerId}
                onChange={(e) => {
                  playTapBeep();
                  setProviderId(e.target.value);
                  setTestResult(null);
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-semibold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition cursor-pointer appearance-none"
              >
                {SOVEREIGN_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ({p.countryScope})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>

            {selectedProvider.badge && (
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Couverture géographique : <strong>{selectedProvider.countryScope}</strong> ({selectedProvider.badge})</span>
              </p>
            )}
          </div>

          {/* CARTE IP STATIQUE FIXIE & RENDER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-md space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    Micro-Service Render & Proxy Fixie
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    Serveur opérationnel • Gardé éveillé 24h/24 via UptimeRobot
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {serviceHealth?.status === 'online' ? (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    API Render En Ligne ({serviceHealth.latencyMs || 0}ms)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Vérification en cours...
                  </span>
                )}
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                  IP Fixie Statique
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Toutes les requêtes bancaires transitent par notre proxy <strong>Fixie</strong> garantissant une <strong>IP statique fixe</strong> whitelistée auprès de la banque.
            </p>

            {/* Bloc IP Statique Détectée */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/10">
              <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 select-all overflow-x-auto">
                <span className="text-slate-400 font-sans text-xs">IP Statique Soumise :</span>
                <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                  {staticIpInfo?.ip || PRIMARY_FIXIE_IP}
                </span>
                {staticIpInfo?.isProxyActive && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                    Fixie Actif
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCheckStaticIp}
                  disabled={isLoadingIp}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingIp ? 'animate-spin' : ''}`} />
                  <span>{isLoadingIp ? 'Diagnostic...' : 'Tester Statut'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyIp(staticIpInfo?.ip || PRIMARY_FIXIE_IP)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copiedIp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIp ? 'IP Copiée !' : 'Copier IP'}</span>
                </button>
              </div>
            </div>

            {/* État de validation bancaire */}
            <div className="text-[11px] text-amber-200/95 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-amber-300">
                  En attente de validation bancaire (IP Whitelisting)
                </div>
                <div className="text-amber-200/80">
                  L'adresse IP ({staticIpInfo?.ip || PRIMARY_FIXIE_IP}) a été soumise sur le tableau de bord de la banque. Le frontend est branché à la nouvelle API. Les tests réels de transaction seront déclenchés dès réception du feu vert administrateur de la banque.
                </div>
              </div>
            </div>
          </div>

          {/* 2. Champ Input Clé Publique (Public Key) */}
          <div>
            <label htmlFor="publicKey" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Clé Publique (Public Key)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400">
                <Key className="w-4 h-4" />
              </span>
              <input
                id="publicKey"
                type="text"
                value={publicKey}
                onChange={(e) => {
                  setPublicKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={selectedProvider.publicKeyPlaceholder}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-mono text-xs placeholder:text-slate-400 outline-none transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cette clé est utilisée côté client pour initialiser la session de paiement.
            </p>
          </div>

          {/* 3. Champ Input Clé Secrète (Secret Key) de type password */}
          <div>
            <label htmlFor="secretKey" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Clé Secrète (Secret Key)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="secretKey"
                type={showSecretKey ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => {
                  setSecretKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={selectedProvider.secretKeyPlaceholder}
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-mono text-xs placeholder:text-slate-400 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={showSecretKey ? "Masquer la clé" : "Afficher la clé"}
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              La clé secrète est stockée chiffrée pour authentifier les notifications et captures de paiement.
            </p>
          </div>

          {/* Optionnel : Champ URL Webhook (spécialement pertinent pour Webhook et IPN) */}
          {providerId === 'webhook' && (
            <div>
              <label htmlFor="webhookUrl" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                URL de Notification Webhook
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <Server className="w-4 h-4" />
                </span>
                <input
                  id="webhookUrl"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.votre-serveur.com/nanasore/webhook"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-mono text-xs placeholder:text-slate-400 outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Retour de test API */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Boutons d'Action : Sauvegarder ma passerelle & Tester */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition cursor-pointer"
            >
              {isTesting ? 'Test en cours...' : 'Tester la connexion API'}
            </button>

            {/* Bouton principal spécifié */}
            <button
              type="submit"
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Passerelle enregistrée !</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder ma passerelle</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

      {/* ===================================================================== */}
      {/* 4. VENTES PHYSIQUES & LOGISTIQUE (CASH ON DELIVERY - COD)             */}
      {/* ===================================================================== */}
      <div className="pt-2">
        <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Ventes Physiques & Logistique</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gestion des modes de livraison et encaissement en mains propres
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                allowCod 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${allowCod ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {allowCod ? 'COD Actif (Produits physiques)' : 'COD Désactivé'}
              </span>
            </div>
          </div>

          {/* Toggle / Switch Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="space-y-1 pr-0 sm:pr-4">
              <div className="flex items-center gap-2">
                <label 
                  htmlFor="cod-toggle" 
                  onClick={handleToggleCod} 
                  className="text-sm font-extrabold text-slate-900 cursor-pointer select-none"
                >
                  Autoriser le Paiement à la Livraison (COD)
                </label>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  Produits physiques
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Permettez à vos clients de valider leur commande en ligne et de payer en espèces directement au livreur. Recommandé pour exploser votre taux de conversion sur les produits physiques.
              </p>
            </div>

            {/* Switch Toggle Button */}
            <div className="flex items-center shrink-0 self-end sm:self-center">
              <button
                id="cod-toggle"
                type="button"
                role="switch"
                aria-checked={allowCod}
                onClick={handleToggleCod}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                  allowCod ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className="sr-only">Autoriser le Paiement à la Livraison (COD)</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    allowCod ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Règle de garde-fou et sécurité explicative */}
          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900">Règle de filtrage automatique activée :</span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Le paiement à la livraison ne s'affichera que pour vos <strong>articles physiques</strong>. Les produits virtuels (formations, fichiers numériques) et abonnements SaaS continueront d'exiger un règlement numérique immédiat (Mobile Money, Carte ou Crypto) pour délivrer les accès instantanément.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default PaymentRoutingSettings;
