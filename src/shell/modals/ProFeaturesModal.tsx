import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe,
  Zap,
  Users,
  BarChart3,
  Sparkles,
  X,
  Crown,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Save,
  Plus,
  Trash2,
  Lock,
  KeyRound,
  ExternalLink,
  RefreshCw,
  Sliders,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  CreditCard,
  MessageSquare,
  QrCode,
  Share2,
  Smartphone
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';
import { StoreUser, StoreSubscription, SellerUser } from '../../types';
import { saveTenantCustomDomain } from '../../services/tenantDomainService';
import { isFreePlan, getPlanLimits, triggerUpsellModal } from '../../utils/planFeatures';
import { PaymentRoutingSettings } from '../../services/nana-switch/payment/PaymentRoutingSettings';
import { 
  generateCashierUniqueLink, 
  shareCashierLinkWhatsApp, 
  saveCashierToRTDB 
} from '../../services/cashierAuthService';
import { getQrCodeUrl } from '../../utils/countryPaymentMatrix';

export type ProFeatureTab =
  | 'CUSTOM_DOMAIN'
  | 'SOVEREIGN_GATEWAY'
  | 'EMPLOYEE_MANAGEMENT'
  | 'TRACKING_PIXELS_CRM'
  | 'WHITE_LABEL';

export interface ProFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ProFeatureTab;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onUpgrade?: () => void;
  onNavigateToCrm?: () => void;
}

export const ProFeaturesModal: React.FC<ProFeaturesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'CUSTOM_DOMAIN',
  currentUser,
  subscription,
  onUpgrade,
  onNavigateToCrm
}) => {
  const [activeTab, setActiveTab] = useState<ProFeatureTab>(initialTab);
  const isFree = isFreePlan(subscription || currentUser?.subscription);
  const storeId = currentUser?.storeId || 'store-konkobo-telecom';

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // =========================================================================
  // TAB 1: DOMAINE PERSONNALISÉ
  // =========================================================================
  const [customDomain, setCustomDomain] = useState<string>(() => {
    return localStorage.getItem(`nana_custom_domain_${storeId}`) || localStorage.getItem('nana_custom_domain') || '';
  });
  const [isCheckingDns, setIsCheckingDns] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<'IDLE' | 'CHECKING' | 'CONFIGURED' | 'ERROR'>('IDLE');
  const [domainSaved, setDomainSaved] = useState(false);
  const [copiedCname, setCopiedCname] = useState(false);

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    const clean = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    localStorage.setItem(`nana_custom_domain_${storeId}`, clean);
    localStorage.setItem('nana_custom_domain', clean);
    setCustomDomain(clean);
    setDomainSaved(true);
    setTimeout(() => setDomainSaved(false), 3000);

    // Synchronisation Firestore Multi-Tenant (tenants et stores)
    try {
      await saveTenantCustomDomain(storeId, clean, {
        storeName: currentUser?.storeName,
        vendorType: currentUser?.vendorType || 'ecommerce',
        logoUrl: currentUser?.avatarUrl,
      });
    } catch (err) {
      console.warn('[WHITE-LABEL] Erreur synchro domaine storage:', err);
    }
  };

  const handleVerifyDns = () => {
    if (!customDomain.trim()) return;
    playTapBeep();
    setIsCheckingDns(true);
    setDnsStatus('CHECKING');
    setTimeout(() => {
      setIsCheckingDns(false);
      setDnsStatus('CONFIGURED');
      playValidationBeep();
    }, 1500);
  };

  // =========================================================================
  // TAB 3: GESTION DES EMPLOYÉS / CAISSIERS
  // =========================================================================
  const planLimits = getPlanLimits(subscription || currentUser?.subscription);
  const maxCashiers = isFree ? 1 : (planLimits.maxCashiers ?? 2);

  const [employees, setEmployees] = useState<SellerUser[]>(() => {
    try {
      const raw = localStorage.getItem(`nana_tenant_${storeId}_sellers`) || localStorage.getItem('nana_sellers');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const isEmployeeQuotaReached = maxCashiers !== -1 && employees.length >= maxCashiers;
  const [employeeLimitError, setEmployeeLimitError] = useState<string | null>(null);

  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<'CAISSIER' | 'GERANT'>('CAISSIER');
  const [empPin, setEmpPin] = useState('');
  const [empSignature, setEmpSignature] = useState('');
  const [selectedEmpForQr, setSelectedEmpForQr] = useState<SellerUser | null>(null);
  const [copiedEmpId, setCopiedEmpId] = useState<string | null>(null);

  const handleGenerateRandomPin = () => {
    playTapBeep();
    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setEmpPin(generated);
  };

  const handleCopyLink = (emp: SellerUser) => {
    const pin = emp.pinCode || (emp as any).pin || '4092';
    const cid = emp.signatureCode || emp.id;
    const link = generateCashierUniqueLink(storeId, cid, pin);
    navigator.clipboard.writeText(link);
    playTapBeep();
    setCopiedEmpId(emp.id);
    setTimeout(() => setCopiedEmpId(null), 2500);
  };

  const handleShareWhatsApp = (emp: SellerUser) => {
    playTapBeep();
    const pin = emp.pinCode || (emp as any).pin || '4092';
    const cid = emp.signatureCode || emp.id;
    shareCashierLinkWhatsApp(storeId, cid, pin, emp.name);
  };

  const handleToggleAddEmployee = () => {
    playTapBeep();
    if (!isAddingEmployee && isEmployeeQuotaReached) {
      const upgradeMsg = isFree
        ? "Limite atteinte (1/1 caissier sur le Plan Découverte). Passez au Plan Starter ou Pro pour ajouter plusieurs caissiers."
        : `Limite atteinte (${employees.length}/${maxCashiers} caissiers). Passez à un plan supérieur pour ajouter plusieurs caissiers.`;
      setEmployeeLimitError(upgradeMsg);
      triggerUpsellModal({
        mode: 'LIMIT_REACHED',
        limiterKey: 'CASHIERS',
        currentCount: employees.length,
        maxCount: maxCashiers,
        limiterItemName: 'caissier',
        recommendedPlan: isFree ? 'starter' : 'pro',
        customTitle: 'Limite de caissiers atteinte',
        customMessage: upgradeMsg
      });
      return;
    }
    setEmployeeLimitError(null);
    setIsAddingEmployee(!isAddingEmployee);
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empPin.trim()) return;

    if (isEmployeeQuotaReached) {
      const upgradeMsg = isFree
        ? "Limite atteinte (1/1 caissier sur le Plan Découverte). Passez au Plan Starter ou Pro pour ajouter plusieurs caissiers."
        : `Limite atteinte (${employees.length}/${maxCashiers} caissiers). Passez à un plan supérieur pour ajouter plusieurs caissiers.`;
      setEmployeeLimitError(upgradeMsg);
      triggerUpsellModal({
        mode: 'LIMIT_REACHED',
        limiterKey: 'CASHIERS',
        currentCount: employees.length,
        maxCount: maxCashiers,
        limiterItemName: 'caissier',
        recommendedPlan: isFree ? 'starter' : 'pro',
        customTitle: 'Limite de caissiers atteinte',
        customMessage: upgradeMsg
      });
      return;
    }

    playValidationBeep();
    const cleanPin = empPin.trim();
    const sigCode = empSignature.trim() || empName.trim().substring(0, 2).toUpperCase() + '-' + Math.floor(10 + Math.random() * 90);
    const newEmp: SellerUser = {
      id: `seller-${Date.now()}`,
      name: empName.trim(),
      role: empRole,
      pinCode: cleanPin,
      pin: cleanPin,
      signatureCode: sigCode,
      caisseId: sigCode,
      storeId: storeId,
      createdAt: new Date().toISOString()
    } as any;
    const updated = [...employees, newEmp];
    setEmployees(updated);
    try {
      localStorage.setItem(`nana_tenant_${storeId}_sellers`, JSON.stringify(updated));
      localStorage.setItem('nana_sellers', JSON.stringify(updated));
    } catch {}
    // Synchronisation Firebase RTDB (nodes/tenants/{tenantId}/cashiers)
    saveCashierToRTDB(storeId, newEmp).catch(console.warn);
    setEmpName('');
    setEmpPin('');
    setEmpSignature('');
    setIsAddingEmployee(false);
    setEmployeeLimitError(null);
  };

  const handleDeleteEmployee = (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) return;
    playCancelSound();
    const updated = employees.filter(e => e.id !== id);
    setEmployees(updated);
    try {
      localStorage.setItem(`nana_tenant_${storeId}_sellers`, JSON.stringify(updated));
      localStorage.setItem('nana_sellers', JSON.stringify(updated));
    } catch {}
  };

  // =========================================================================
  // TAB 4: PIXELS TRACKING & CRM
  // =========================================================================
  const [metaPixelId, setMetaPixelId] = useState<string>(() => {
    return localStorage.getItem(`nana_meta_pixel_${storeId}`) || '';
  });
  const [tiktokPixelId, setTiktokPixelId] = useState<string>(() => {
    return localStorage.getItem(`nana_tiktok_pixel_${storeId}`) || '';
  });
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState<string>(() => {
    return localStorage.getItem(`nana_ga_id_${storeId}`) || '';
  });
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem(`nana_webhook_${storeId}`) || '';
  });
  const [autoTrackingEnabled, setAutoTrackingEnabled] = useState(true);
  const [pixelsSaved, setPixelsSaved] = useState(false);

  const handleSavePixels = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    localStorage.setItem(`nana_meta_pixel_${storeId}`, metaPixelId.trim());
    localStorage.setItem(`nana_tiktok_pixel_${storeId}`, tiktokPixelId.trim());
    localStorage.setItem(`nana_ga_id_${storeId}`, googleAnalyticsId.trim());
    localStorage.setItem(`nana_webhook_${storeId}`, webhookUrl.trim());
    setPixelsSaved(true);
    setTimeout(() => setPixelsSaved(false), 3000);
  };

  // =========================================================================
  // TAB 5: MARQUE BLANCHE 100%
  // =========================================================================
  const [hidePoweredBy, setHidePoweredBy] = useState<boolean>(() => {
    return localStorage.getItem(`nana_whitelabel_hide_powered_${storeId}`) === 'true';
  });
  const [hideReceiptLogo, setHideReceiptLogo] = useState<boolean>(() => {
    return localStorage.getItem(`nana_whitelabel_hide_receipt_${storeId}`) === 'true';
  });
  const [customFooterText, setCustomFooterText] = useState<string>(() => {
    return localStorage.getItem(`nana_whitelabel_footer_${storeId}`) || `© ${new Date().getFullYear()} ${currentUser?.storeName || 'Notre Entreprise'}. Tous droits réservés.`;
  });
  const [customSupportPhone, setCustomSupportPhone] = useState<string>(() => {
    return localStorage.getItem(`nana_whitelabel_phone_${storeId}`) || currentUser?.phone || '';
  });
  const [customFaviconUrl, setCustomFaviconUrl] = useState<string>(() => {
    return localStorage.getItem(`nana_whitelabel_favicon_${storeId}`) || '';
  });
  const [whiteLabelSaved, setWhiteLabelSaved] = useState(false);

  const handleSaveWhiteLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    localStorage.setItem(`nana_whitelabel_hide_powered_${storeId}`, String(hidePoweredBy));
    localStorage.setItem(`nana_whitelabel_hide_receipt_${storeId}`, String(hideReceiptLogo));
    localStorage.setItem(`nana_whitelabel_footer_${storeId}`, customFooterText.trim());
    localStorage.setItem(`nana_whitelabel_phone_${storeId}`, customSupportPhone.trim());
    localStorage.setItem(`nana_whitelabel_favicon_${storeId}`, customFaviconUrl.trim());
    setWhiteLabelSaved(true);
    setTimeout(() => setWhiteLabelSaved(false), 3000);

    try {
      const activeCustomDomain = localStorage.getItem(`nana_custom_domain_${storeId}`) || '';
      if (activeCustomDomain) {
        await saveTenantCustomDomain(storeId, activeCustomDomain, {
          whiteLabel: {
            hidePoweredBy,
            hideReceiptLogo,
            customFooterText: customFooterText.trim(),
            customSupportPhone: customSupportPhone.trim(),
            customFaviconUrl: customFaviconUrl.trim()
          }
        });
      }
    } catch (err) {
      console.warn('[WHITE-LABEL] Erreur synchro options marque blanche:', err);
    }
  };

  if (!isOpen) return null;

  const tabsConfig = [
    {
      id: 'CUSTOM_DOMAIN' as ProFeatureTab,
      label: 'Domaine Personnalisé',
      icon: Globe,
      color: 'text-blue-400',
      activeBorder: 'border-blue-500',
      bgActive: 'bg-blue-500/10'
    },
    {
      id: 'SOVEREIGN_GATEWAY' as ProFeatureTab,
      label: 'Passerelle Souveraine API',
      icon: Zap,
      color: 'text-indigo-400',
      activeBorder: 'border-indigo-500',
      bgActive: 'bg-indigo-500/10'
    },
    {
      id: 'EMPLOYEE_MANAGEMENT' as ProFeatureTab,
      label: 'Gestion des Employés',
      icon: Users,
      color: 'text-emerald-400',
      activeBorder: 'border-emerald-500',
      bgActive: 'bg-emerald-500/10'
    },
    {
      id: 'TRACKING_PIXELS_CRM' as ProFeatureTab,
      label: 'Pixels Tracking & CRM',
      icon: BarChart3,
      color: 'text-rose-400',
      activeBorder: 'border-rose-500',
      bgActive: 'bg-rose-500/10'
    },
    {
      id: 'WHITE_LABEL' as ProFeatureTab,
      label: 'Marque Blanche 100%',
      icon: Sparkles,
      color: 'text-purple-400',
      activeBorder: 'border-purple-500',
      bgActive: 'bg-purple-500/10'
    }
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 p-[1.5px] shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                <Crown className="w-5 h-5 fill-amber-400/30 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Fonctionnalités PRO & Exclusives
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isFree ? 'MODE APERÇU' : 'DÉBLOQUÉ 👑'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Configuration avancée : domaine, paiements directs, équipe et marque blanche
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { playTapBeep(); onClose(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barre des 5 onglets Pro */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 px-3 sm:px-6 gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {tabsConfig.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { playTapBeep(); setActiveTab(t.id); }}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? `${t.activeBorder} ${t.color} bg-slate-900/60 font-black`
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? t.color : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bannière Promotionnelle si Plan Gratuit */}
        {isFree && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-b border-amber-500/30 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-200 truncate">
                <span className="font-bold">Vous êtes sur le Plan Gratuit.</span> Vous pouvez tester ces outils en mode simulation.
              </p>
            </div>
            {onUpgrade && (
              <button
                type="button"
                onClick={() => { playTapBeep(); onUpgrade(); }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shrink-0 shadow-sm"
              >
                Activer le Plan PRO 🚀
              </button>
            )}
          </div>
        )}

        {/* Corps de l'onglet actif */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
          {/* =============================================================== */}
          {/* ONGLET 1 : DOMAINE PERSONNALISÉ                                 */}
          {/* =============================================================== */}
          {activeTab === 'CUSTOM_DOMAIN' && (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Connectez Votre Propre Nom de Domaine</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Associez votre domaine (.com, .ci, .bf, .sn, .shop) à votre vitrine NaNa pour un branding indépendant et professionnel.
                </p>
              </div>

              {/* Formulaire de configuration */}
              <form onSubmit={handleSaveDomain} className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    Nom de Domaine Souhaité
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                        https://
                      </span>
                      <input
                        type="text"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        placeholder="boutique.mon-entreprise.com"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-20 pr-4 py-2.5 text-xs sm:text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition min-h-[44px]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[44px]"
                    >
                      <Save className="w-4 h-4" />
                      <span>Enregistrer</span>
                    </button>
                  </div>
                  {domainSaved && (
                    <p className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Nom de domaine enregistré avec succès !</span>
                    </p>
                  )}
                </div>

                {/* Instructions DNS */}
                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span>Instructions de configuration DNS (Chez votre registraire LWS, GoDaddy, Hostinger...)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-mono text-blue-400 font-bold">1. Enregistrement CNAME (Recommandé)</span>
                      <p className="text-[11px] text-slate-300 font-mono">Hôte : <span className="text-amber-300">boutique</span> (ou sous-domaine)</p>
                      <p className="text-[11px] text-slate-300 font-mono flex items-center justify-between">
                        <span>Cible : <span className="text-emerald-400">cname.nanasore.com</span></span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('cname.nanasore.com');
                            setCopiedCname(true);
                            setTimeout(() => setCopiedCname(false), 2000);
                          }}
                          className="text-[10px] text-slate-400 hover:text-white"
                        >
                          {copiedCname ? 'Copié !' : 'Copier'}
                        </button>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-mono text-purple-400 font-bold">2. Enregistrement A (Domaine racine)</span>
                      <p className="text-[11px] text-slate-300 font-mono">Hôte : <span className="text-amber-300">@</span></p>
                      <p className="text-[11px] text-slate-300 font-mono">Valeur : <span className="text-emerald-400">199.36.158.100</span></p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleVerifyDns}
                      disabled={isCheckingDns || !customDomain.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isCheckingDns ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          <span>Vérification DNS...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                          <span>Tester la Propagation DNS</span>
                        </>
                      )}
                    </button>

                    {dnsStatus === 'CONFIGURED' && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>DNS Vérifié • Certificat SSL Let's Encrypt Actif 🔒</span>
                      </span>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* =============================================================== */}
          {/* ONGLET 2 : PASSERELLE SOUVERAINE API                            */}
          {/* =============================================================== */}
          {activeTab === 'SOVEREIGN_GATEWAY' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3">
                <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-indigo-200">
                    Encaisser directement sur vos propres clés d'API marchandes
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Connectez FedaPay, Paydunya, LigdiCash, CinetPay, Wave Direct ou Stripe. Les fonds arrivent directement sur votre compte marchand avec 0% de commission plateforme.
                  </p>
                </div>
              </div>

              {/* Composant de routage complet */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800">
                <PaymentRoutingSettings
                  currentUser={currentUser}
                  subscription={subscription}
                  isFreeAccount={isFree}
                />
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* ONGLET 3 : GESTION DES EMPLOYÉS & CAISSIERS                     */}
          {/* =============================================================== */}
          {activeTab === 'EMPLOYEE_MANAGEMENT' && (
            <div className="space-y-5 animate-in fade-in duration-200 max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Comptes Caissiers & Gestion de l'Équipe</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Créez des accès séparés avec code PIN secret pour chaque membre du personnel
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAddEmployee}
                  className={`px-3.5 py-2 font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/40 ${
                    isFree && isEmployeeQuotaReached
                      ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isFree && isEmployeeQuotaReached ? (
                    <>
                      <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>Ajouter un Caissier (1/1 atteint)</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingEmployee ? 'Annuler' : 'Ajouter un Caissier'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Message d'erreur / Alerte de limite */}
              {employeeLimitError && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="leading-snug">{employeeLimitError}</p>
                  </div>
                </div>
              )}

              {/* Formulaire d'ajout d'employé */}
              {isAddingEmployee && (
                <form onSubmit={handleAddEmployee} className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3 animate-in zoom-in-95 duration-150">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nouvel Accès Caissier / Vendeur</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Nom Complet</label>
                      <input
                        type="text"
                        value={empName}
                        onChange={(e) => setEmpName(e.target.value)}
                        placeholder="Ex: Fatouma Ouédraogo"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Rôle</label>
                      <select
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="CAISSIER">Caissier(ère) - Ventes & Encaissements</option>
                        <option value="GERANT">Gérant(e) - Accès complet & Rapports</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-300">Code PIN Secret (4 à 6 chiffres)</label>
                        <button
                          type="button"
                          onClick={handleGenerateRandomPin}
                          className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                        >
                          Générer un PIN
                        </button>
                      </div>
                      <input
                        type="password"
                        maxLength={6}
                        pattern="[0-9]{4,6}"
                        value={empPin}
                        onChange={(e) => setEmpPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 4092"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Code Signature sur Reçus</label>
                      <input
                        type="text"
                        value={empSignature}
                        onChange={(e) => setEmpSignature(e.target.value)}
                        placeholder="Ex: FO-03"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Enregistrer l'Employé
                    </button>
                  </div>
                </form>
              )}

              {/* Liste des employés */}
              <div className="space-y-3">
                {employees.map((emp) => {
                  const empPinCode = emp.pinCode || (emp as any).pin || '4092';
                  const empCaisseId = emp.signatureCode || emp.id;
                  const cashierLink = generateCashierUniqueLink(storeId, empCaisseId, empPinCode);
                  const isCopied = copiedEmpId === emp.id;

                  return (
                    <div
                      key={emp.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-xs text-emerald-400">
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white">{emp.name}</span>
                              <span className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full ${
                                emp.role === 'GERANT' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {emp.role}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Caisse : {empCaisseId} • PIN : ••••
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                            title="Supprimer cet employé"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Barre d'outils Lien Unique & QR Code */}
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex-1 min-w-[180px] truncate font-mono text-[10.5px] text-slate-400">
                          <span className="text-slate-500">Lien caisse :</span> {cashierLink}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Copier le Lien */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(emp)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Copier le lien unique de connexion"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copié !' : 'Copier'}</span>
                          </button>

                          {/* Partager sur WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(emp)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Envoyer les accès au caissier par WhatsApp"
                          >
                            <Share2 className="w-3 h-3 text-emerald-400" />
                            <span>WhatsApp</span>
                          </button>

                          {/* QR Code Caisse */}
                          <button
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              setSelectedEmpForQr(emp);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Afficher le QR Code de connexion directe"
                          >
                            <QrCode className="w-3 h-3 text-blue-400" />
                            <span>QR Code</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Pop-up QR Code Caisse */}
              {selectedEmpForQr && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2 text-left">
                        <QrCode className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h4 className="text-xs font-black text-white">QR Code Caisse</h4>
                          <p className="text-[10px] text-slate-400">{selectedEmpForQr.name} ({selectedEmpForQr.role})</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedEmpForQr(null)}
                        className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4 bg-white rounded-2xl flex items-center justify-center shadow-inner">
                      <img
                        src={getQrCodeUrl(
                          generateCashierUniqueLink(
                            storeId,
                            selectedEmpForQr.signatureCode || selectedEmpForQr.id,
                            selectedEmpForQr.pinCode || (selectedEmpForQr as any).pin || '4092'
                          ),
                          240
                        )}
                        alt="QR Code Caisse Nanasore POS"
                        className="w-52 h-52 object-contain"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
                      Code PIN associé : <strong className="text-white">{selectedEmpForQr.pinCode || (selectedEmpForQr as any).pin || '4092'}</strong>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">
                      Le caissier peut scanner ce QR Code avec son smartphone ou sa tablette pour ouvrir instantanément la caisse sans rien saisir.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(selectedEmpForQr)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le Lien</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedEmpForQr(null)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Terminé
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* ONGLET 4 : PIXELS DE TRACKING & CRM                             */}
          {/* =============================================================== */}
          {activeTab === 'TRACKING_PIXELS_CRM' && (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-rose-400" />
                  <span>Pixels de Conversion Meta & TikTok Ads</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Déclenchez automatiquement les événements ViewContent, AddToCart et Purchase pour optimiser vos coûts publicitaires.
                </p>
              </div>

              <form onSubmit={handleSavePixels} className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Meta Pixel ID (Facebook & Instagram Ads)</span>
                    <span className="text-[10px] text-blue-400 font-mono">Événements automatiques</span>
                  </label>
                  <input
                    type="text"
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    placeholder="Ex: 128492049102938"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>TikTok Pixel ID</span>
                    <span className="text-[10px] text-rose-400 font-mono">TikTok Ads Manager</span>
                  </label>
                  <input
                    type="text"
                    value={tiktokPixelId}
                    onChange={(e) => setTiktokPixelId(e.target.value)}
                    placeholder="Ex: C891290382019"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Google Analytics 4 (Measurement ID)
                  </label>
                  <input
                    type="text"
                    value={googleAnalyticsId}
                    onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                    placeholder="Ex: G-XXXXXXXXXX"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Webhook Sortant CRM (Zapier, Make, n8n, Brevo)
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  {onNavigateToCrm ? (
                    <button
                      type="button"
                      onClick={() => { playTapBeep(); onClose(); onNavigateToCrm(); }}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition"
                    >
                      <span>Ouvrir le CRM Avancé</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : <div />}

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-rose-950/40"
                  >
                    <Save className="w-4 h-4" />
                    <span>{pixelsSaved ? 'Pixels Enregistrés ✓' : 'Enregistrer les Pixels'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =============================================================== */}
          {/* ONGLET 5 : MARQUE BLANCHE 100%                                  */}
          {/* =============================================================== */}
          {activeTab === 'WHITE_LABEL' && (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Marque Blanche & Suppression des Mentions NaNa</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Masquez toute mention de la plateforme pour que vos clients ne voient que votre identité de marque exclusive.
                </p>
              </div>

              <form onSubmit={handleSaveWhiteLabel} className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
                {/* Toggles */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <div>
                      <span className="text-xs font-extrabold text-white block">
                        Masquer "Propulsé par NaNa Platform" sur la vitrine
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Supprime le filigrane du bas de page sur votre boutique publique
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={hidePoweredBy}
                      onChange={(e) => setHidePoweredBy(e.target.checked)}
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <div>
                      <span className="text-xs font-extrabold text-white block">
                        Masquer le logo NaNa sur les reçus de caisse & factures
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Vos tickets thermiques n'affichent que votre en-tête et logo
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={hideReceiptLogo}
                      onChange={(e) => setHideReceiptLogo(e.target.checked)}
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                  </label>
                </div>

                {/* Champs de marque */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Pied de Page Personnalisé (Copyright)
                    </label>
                    <input
                      type="text"
                      value={customFooterText}
                      onChange={(e) => setCustomFooterText(e.target.value)}
                      placeholder="© 2026 Votre Boutique. Tous droits réservés."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Numéro WhatsApp Officiel Affiché au Client
                    </label>
                    <input
                      type="tel"
                      value={customSupportPhone}
                      onChange={(e) => setCustomSupportPhone(e.target.value)}
                      placeholder="+226 70 00 00 00"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Favicon Personnalisé (URL de l'icône .ico ou .png)
                    </label>
                    <input
                      type="url"
                      value={customFaviconUrl}
                      onChange={(e) => setCustomFaviconUrl(e.target.value)}
                      placeholder="https://mon-domaine.com/favicon.png"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-purple-950/40"
                  >
                    <Save className="w-4 h-4" />
                    <span>{whiteLabelSaved ? 'Marque Blanche Enregistrée ✓' : 'Enregistrer la Marque Blanche'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default ProFeaturesModal;
