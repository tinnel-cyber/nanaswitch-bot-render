import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  StoreUser, 
  StoreSubscription, 
  PlatformSubscriptionConfig,
  SubscriptionFunnelStep,
  SubscriptionAddonOption,
} from '../../types';
import { supabase } from '../../lib/supabase';
import { 
  updateStoreSubscription,
  subscribeToPlatformSubscriptions,
  DEFAULT_PLATFORM_SUBSCRIPTIONS,
  sanitizePlatformSubscriptions,
} from '../../utils/firestoreService';
import { getSuperAdminPlatformConfig, isSuperAdminLocally } from '../../services/superAdminService';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';
import { SPaymentGateway, PaymentSuccessDetails } from '../../services/nana-switch/payment/SPaymentGateway';
import { PricingComparisonMatrix } from './pricing/PricingComparisonMatrix';
import { calculateModularPrice, MODULAR_PILLARS } from '../../utils/planFeatures';
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  X,
  Lock,
  ArrowRight,
  RefreshCw,
  Gift,
  Check,
  ChevronRight,
  ArrowLeft,
  Tag,
  Flame,
  Store,
  ShoppingBag,
  GraduationCap,
} from 'lucide-react';

interface SubscriptionPaywallModalProps {
  currentUser?: StoreUser | null;
  storeId?: string;
  storeName?: string;
  subscription?: StoreSubscription | null;
  currentSubscription?: StoreSubscription | null;
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionUpdated?: (newSub: StoreSubscription) => void;
  isMandatoryBlock?: boolean;
  initialPlanId?: string;
}

// Options d'upsell SaaS dynamiques
const SAAS_ADDONS: SubscriptionAddonOption[] = [
  {
    id: 'addon_multi_device',
    name: 'Pack Multi-Appareils & Caisses Illimitées',
    price: 3000,
    description: 'Connectez smartphones, tablettes et PC en temps réel avec synchronisation instantanée.',
    badge: 'Populaire'
  },
  {
    id: 'addon_vip_backup',
    name: 'Sauvegarde Cloud VIP & Support Dédié 24/7',
    price: 2000,
    description: 'Sauvegardes chiffrées automatiques + assistance prioritaire par nos techniciens sur WhatsApp.',
    badge: 'Recommandé'
  }
];

export const SubscriptionPaywallModal: React.FC<SubscriptionPaywallModalProps> = ({
  currentUser,
  storeId,
  storeName,
  subscription,
  currentSubscription,
  isOpen,
  onClose,
  onSubscriptionUpdated,
  isMandatoryBlock = false,
  initialPlanId,
}) => {
  // Seul le blocage forcé automatique (isMandatoryBlock) est contourné pour le Super Admin.
  // Quand la modale est appelée pour consulter les tarifs ou souscrire, elle doit TOUJOURS s'ouvrir.
  if (isMandatoryBlock && isSuperAdminLocally(currentUser)) {
    return null;
  }
  const safeUser: StoreUser = currentUser || {
    id: 'user_default',
    name: 'Gérant',
    email: 'contact@nanasore.com',
    role: 'ADMIN',
    storeId: storeId || 'store-nana-1',
    storeName: storeName || 'Boutique',
    phone: '',
    country: 'Burkina Faso',
    city: 'Ouagadougou',
    currency: 'XOF',
    defaultCreditLimit: 0,
    loginProvider: 'demo',
    createdAt: new Date().toISOString(),
  };

  const effectiveStoreId = storeId || safeUser.storeId || 'store-nana-1';
  const effectiveStoreName = storeName || safeUser.storeName || 'Boutique';

  const effectiveSubscription: StoreSubscription = subscription || currentSubscription || {
    status: 'TRIAL',
    plan: 'FREE_TRIAL',
    expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
    startedAt: Date.now(),
    lastPaymentMethod: 'TRIAL',
    lastAmountPaid: 0,
  };

  // Normalise l'ID de plan canonique (Plan Pro = 'starter' à 15 000 F CFA)
  const resolveCanonicalPlanId = (id?: string) => {
    if (!id) return 'starter';
    const norm = id.toLowerCase().trim();
    if (norm === 'pro' || norm === 'starter' || norm === 'plan-pro') return 'starter';
    if (norm === 'business' || norm === 'plan-business') return 'pro';
    if (norm === 'enterprise' || norm === 'elite' || norm === 'plan-enterprise') return 'elite';
    if (norm === 'free' || norm === 'zero' || norm === 'freemium') return 'free';
    return norm;
  };

  // État du tunnel de conversion (Funnel State Machine)
  const [funnelStep, setFunnelStep] = useState<SubscriptionFunnelStep>('PLAN_SELECTION');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [downsellAccepted, setDownsellAccepted] = useState<boolean>(false);

  // Configuration dynamique des formules strictement assainie avec les normes officielles
  const [platformConfig, setPlatformConfig] = useState<PlatformSubscriptionConfig>(() => 
    sanitizePlatformSubscriptions(getSuperAdminPlatformConfig())
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => resolveCanonicalPlanId(initialPlanId));

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    transactionId: string;
    amount: number;
    method: string;
  } | null>(null);

  // Écouteur temps réel sur platform_settings/subscriptions
  useEffect(() => {
    const unsub = subscribeToPlatformSubscriptions((config) => {
      const sanitized = sanitizePlatformSubscriptions(config);
      setPlatformConfig(sanitized);
      if (sanitized.plans && sanitized.plans.length > 0) {
        if (!sanitized.plans.some(p => p.id === selectedPlanId)) {
          setSelectedPlanId(resolveCanonicalPlanId(initialPlanId) || sanitized.plans[0].id);
        }
      }
    });
    return () => unsub();
  }, [selectedPlanId, initialPlanId]);

  // Écouteur direct des mises à jour Super Admin en temps réel
  useEffect(() => {
    const handleSuperAdminUpdate = () => {
      const cfg = sanitizePlatformSubscriptions(getSuperAdminPlatformConfig());
      setPlatformConfig(cfg);
    };
    window.addEventListener('superAdminUpdated', handleSuperAdminUpdate);
    return () => window.removeEventListener('superAdminUpdated', handleSuperAdminUpdate);
  }, []);

  // Référence d'horodatage pour isoler les transactions de la session courante
  const modalOpenedTimestampRef = React.useRef<number>(Date.now());

  // État du choix modulaire des piliers (Caisse, Vitrine, Formateur)
  const [selectedPillars, setSelectedPillars] = useState<Array<'caisse_pos' | 'vitrine_web' | 'formateur_lms'>>([
    'caisse_pos',
    'vitrine_web',
    'formateur_lms',
  ]);

  const isAllPillarsSelected = selectedPillars.length === 3;

  const handleToggleAllPillars = () => {
    playTapBeep();
    if (isAllPillarsSelected) {
      setSelectedPillars(['caisse_pos']);
    } else {
      setSelectedPillars(['caisse_pos', 'vitrine_web', 'formateur_lms']);
    }
  };

  const handleTogglePillar = (pillarId: 'caisse_pos' | 'vitrine_web' | 'formateur_lms') => {
    playTapBeep();
    setSelectedPillars(prev => {
      if (prev.includes(pillarId)) {
        if (prev.length === 1) return prev; // Au moins un pilier obligatoire
        return prev.filter(p => p !== pillarId);
      } else {
        return [...prev, pillarId];
      }
    });
  };

  // Réinitialiser strictement le tunnel à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      modalOpenedTimestampRef.current = Date.now();
      if (initialPlanId) {
        setSelectedPlanId(resolveCanonicalPlanId(initialPlanId));
      }
      setSelectedPillars(['caisse_pos', 'vitrine_web', 'formateur_lms']);
      setFunnelStep('PLAN_SELECTION');
      setPaymentSuccess(false);
      setPaymentResult(null);
      setIsProcessing(false);
      setSelectedAddonIds([]);
      setDownsellAccepted(false);
    }
  }, [isOpen, initialPlanId]);

  // Fermeture définitive avec réinitialisation complète des états
  const handleCloseModal = useCallback(() => {
    setFunnelStep('PLAN_SELECTION');
    setPaymentSuccess(false);
    setPaymentResult(null);
    setIsProcessing(false);
    setSelectedAddonIds([]);
    setDownsellAccepted(false);

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nana_pending_checkout_plan');
        localStorage.removeItem('nana_pending_partner_intent');
      } catch (e) {}
    }

    onClose();
  }, [onClose]);

  const currentPlan = platformConfig.plans.find(p => p.id === selectedPlanId) || platformConfig.plans[0];

  // Calcul dynamique du prix selon les piliers modulaires cochés
  const isBusinessTier = selectedPlanId === 'business' || selectedPlanId === 'pro';
  const isEliteTier = selectedPlanId === 'elite' || selectedPlanId === 'enterprise';
  const modularCaissePrice = isEliteTier ? 20000 : isBusinessTier ? 10000 : 5000;
  const modularVitrinePrice = isEliteTier ? 20000 : isBusinessTier ? 10000 : 5000;
  const modularFormateurPrice = isEliteTier ? 40000 : isBusinessTier ? 20000 : 10000;
  const modularBundleSavings = isEliteTier ? 20000 : isBusinessTier ? 10000 : 5000;

  const modularCalculation = useMemo(() => {
    if (currentPlan.price === 0 || currentPlan.id === 'free') {
      return {
        totalPrice: 0,
        isAllInclusive: true,
        savings: 0,
        modulesIncluded: ['caisse', 'stock', 'catalogue']
      };
    }
    return calculateModularPrice(currentPlan.id, selectedPillars);
  }, [currentPlan.id, currentPlan.price, selectedPillars]);

  // Calcul dynamique du Montant Total avec Add-ons et Remise Downsell
  const addonsTotal = selectedAddonIds.reduce((sum, id) => {
    const addon = SAAS_ADDONS.find(a => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);

  const downsellDiscountAmount = downsellAccepted ? 2000 : 0;
  const isFreePlan = (currentPlan?.price === 0 || currentPlan?.id === 'free') && addonsTotal === 0;
  const rawTotal = (isFreePlan ? 0 : modularCalculation.totalPrice) + addonsTotal - downsellDiscountAmount;
  const montantTotal = isFreePlan ? 0 : Math.max(1000, rawTotal);

  // Écouteur temps réel Supabase Realtime sur les abonnements
  // Ne déclenche JAMAIS l'écran de succès par défaut sur un abonnement déjà actif
  useEffect(() => {
    if (!isOpen || !effectiveStoreId) return;

    const channelName = `paywall_sub_${effectiveStoreId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `tenant_id=eq.${effectiveStoreId}`,
        },
        (payload) => {
          if (payload.new) {
            const row = payload.new as any;
            const storeSub: StoreSubscription = {
              status: row.status || 'ACTIVE',
              plan: row.plan || 'free',
              expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : Date.now() + 30 * 86400000,
              startedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
              lastPaymentMethod: row.payment_method || 'Nanasore Pay',
              lastAmountPaid: row.amount_paid || montantTotal,
              transactionRef: row.id,
            };

            if (onSubscriptionUpdated && storeSub.status === 'ACTIVE') {
              onSubscriptionUpdated(storeSub);
            }

            if (
              funnelStep === 'PAYMENT' &&
              storeSub.status === 'ACTIVE' &&
              storeSub.expiresAt > Date.now() &&
              storeSub.startedAt &&
              storeSub.startedAt >= modalOpenedTimestampRef.current
            ) {
              playCashChime();
              setPaymentResult({
                transactionId: storeSub.transactionRef || `TX-${Date.now().toString(36).toUpperCase()}`,
                amount: storeSub.lastAmountPaid || montantTotal,
                method: storeSub.lastPaymentMethod || 'Nanasore Pay',
              });
              setPaymentSuccess(true);
              setFunnelStep('SUCCESS');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, effectiveStoreId, funnelStep, montantTotal, onSubscriptionUpdated]);

  if (!isOpen) return null;

  // Calcul du temps d'essai restant
  const now = Date.now();
  const isTrial = effectiveSubscription.status === 'TRIAL';
  const isExpired = effectiveSubscription.expiresAt <= now;
  const trialDaysLeft = Math.max(0, Math.ceil((effectiveSubscription.expiresAt - now) / (24 * 60 * 60 * 1000)));

  // Activation immédiate en 1 clic pour le Plan Gratuit Freemium PLG
  const handleActivateFreePlan = async () => {
    playTapBeep();
    setIsProcessing(true);

    const txRef = `FREE-PLG-${Date.now().toString(36).toUpperCase()}`;
    const newExpiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 an d'accès renouvelable

    const newSub: StoreSubscription = {
      status: 'ACTIVE',
      plan: 'free',
      expiresAt: newExpiresAt,
      startedAt: Date.now(),
      lastPaymentMethod: 'FREE_PLG',
      lastAmountPaid: 0,
      transactionRef: txRef,
    };

    setPaymentResult({
      transactionId: txRef,
      amount: 0,
      method: 'Plan Freemium PLG',
    });

    try {
      await updateStoreSubscription(effectiveStoreId, newSub, safeUser.id, txRef);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nana_user_plan', 'free');
        localStorage.setItem('nana_store_plan', 'free');
        localStorage.setItem('nana_store_sub', JSON.stringify(newSub));
      }
    } catch (err) {
      console.warn('Erreur activation Plan Gratuit storage :', err);
    }

    playCashChime();
    setPaymentSuccess(true);
    setFunnelStep('SUCCESS');

    if (onSubscriptionUpdated) {
      onSubscriptionUpdated(newSub);
    }
    setIsProcessing(false);
  };

  // Callback de succès du composant SPaymentGateway
  const handleGatewaySuccess = async (details: PaymentSuccessDetails) => {
    playCashChime();
    setIsProcessing(true);

    const durationDays = currentPlan.period === 'an' ? 365 : currentPlan.period === 'trimestre' ? 90 : 30;
    const durationMs = durationDays * 24 * 60 * 60 * 1000;
    const baseDate = Math.max(Date.now(), effectiveSubscription.expiresAt);
    const newExpiresAt = baseDate + durationMs;

    const paymentMethodName = details.operator?.name || details.paymentMethod || 'MOBILE_MONEY';

    const newSub: StoreSubscription = {
      status: 'ACTIVE',
      plan: currentPlan.id,
      expiresAt: newExpiresAt,
      startedAt: Date.now(),
      lastPaymentMethod: paymentMethodName as any,
      lastAmountPaid: details.amount || montantTotal,
      transactionRef: details.transactionId,
      // Piliers modulaires sélectionnés (Caisse, Vitrine, Formateur)
      selectedPillars: selectedPillars as any,
      isAllInclusive: isAllPillarsSelected,
      customMonthlyAmount: montantTotal,
    };

    setPaymentResult({
      transactionId: details.transactionId,
      amount: details.amount || montantTotal,
      method: paymentMethodName,
    });

    try {
      await updateStoreSubscription(effectiveStoreId, newSub, safeUser.id, details.transactionId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nana_user_plan', currentPlan.id);
        localStorage.setItem('nana_store_plan', currentPlan.id);
        localStorage.setItem('nana_selected_pillars', JSON.stringify(selectedPillars));
        localStorage.setItem('nana_store_sub', JSON.stringify(newSub));
        const savedUserStr = localStorage.getItem('nana_store_auth_user');
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            parsed.plan = currentPlan.id;
            parsed.subscriptionPlan = currentPlan.id;
            parsed.subscriptionStatus = 'ACTIVE';
            parsed.subscription = newSub;
            parsed.quotas = {
              maxCourses: (currentPlan.id === 'pro' || currentPlan.id === 'elite') ? -1 : (currentPlan.id === 'starter' ? 5 : 1),
              unlimitedCourses: (currentPlan.id === 'pro' || currentPlan.id === 'elite'),
            };
            localStorage.setItem('nana_store_auth_user', JSON.stringify(parsed));
          } catch {}
        }
        window.dispatchEvent(
          new CustomEvent('nana_subscription_updated', {
            detail: {
              subscription: newSub,
              plan: currentPlan.id,
            }
          })
        );
      }
    } catch (err) {
      console.warn('Erreur mise à jour abonnement storage :', err);
    }

    setPaymentSuccess(true);
    setFunnelStep('SUCCESS');

    if (onSubscriptionUpdated) {
      onSubscriptionUpdated(newSub);
    }
    setIsProcessing(false);
  };

  // Basculer un add-on upsell
  const toggleAddon = (addonId: string) => {
    playTapBeep();
    setSelectedAddonIds(prev => 
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div 
        className="w-full max-w-2xl lg:max-w-3xl max-h-[92vh] overflow-y-auto overscroll-y-contain bg-slate-900 border border-slate-700/80 rounded-3xl px-5 sm:px-8 pt-6 pb-24 sm:pb-16 shadow-2xl text-slate-100 relative my-auto sm:my-6"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        
        {/* Bouton de fermeture */}
        {!isMandatoryBlock && (
          <button
            type="button"
            onClick={handleCloseModal}
            className="absolute top-4 right-4 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition cursor-pointer active:scale-95 touch-manipulation z-10"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Indicateur d'étape du tunnel (Funnel Breadcrumbs) */}
        <div className="flex items-center justify-between gap-1 mb-5 pb-2.5 border-b border-slate-800 text-[10px] sm:text-xs font-bold text-slate-400">
          <span className={funnelStep === 'PLAN_SELECTION' ? 'text-blue-400 flex items-center gap-1 font-black' : 'text-slate-500'}>
            1. Formule
          </span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className={funnelStep === 'UPSELL' ? 'text-amber-400 flex items-center gap-1 font-black' : 'text-slate-500'}>
            2. Options
          </span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className={funnelStep === 'PAYMENT' ? 'text-emerald-400 flex items-center gap-1 font-black' : 'text-slate-500'}>
            3. Règlement
          </span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className={funnelStep === 'SUCCESS' ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}>
            4. Validation
          </span>
        </div>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          {isExpired ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              Abonnement Expiré
            </span>
          ) : isTrial ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              Période d'Essai : {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant{trialDaysLeft > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Abonnement Actif
            </span>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ÉTAPE 1 : SÉLECTION DE LA FORMULE (4 PLANS PLG : GRATUIT, STARTER, PRO, ELITE) */}
        {/* ========================================================================= */}
        {funnelStep === 'PLAN_SELECTION' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {isExpired ? 'Rechargez votre Accès Nanasore' : 'Activer ou Prolonger votre Accès SaaS Nanasore'}
              </h2>
              <p className="text-xs text-slate-400">
                Activez le plan adapté à votre activité pour débloquer l'ensemble des modules, synchroniser vos stocks et encaisser sans friction.
              </p>
            </div>

            {/* Bannière Nouveau Marchand / Ouverture de Compte & KYC */}
            {(!currentUser || !currentUser.id || currentUser.id === 'user_default' || !currentUser.email) && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">✨</span>
                  <div>
                    <strong className="text-white block font-bold">Nouveau sur Nanasore ?</strong>
                    <span className="text-blue-200">Ouvrez votre compte et démarrez votre identification KYC pour sécuriser votre activité.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onClose();
                    window.dispatchEvent(new CustomEvent('nanasore_open_kyc', { detail: { type: 'particulier' } }));
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-500 text-white font-black text-xs shrink-0 cursor-pointer transition shadow-md flex items-center gap-1.5"
                >
                  <span>Ouvrir mon compte →</span>
                </button>
              </div>
            )}

            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Choisissez votre formule :
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {platformConfig.plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const isPlanFree = plan.price === 0 || plan.id === 'free';
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setSelectedPlanId(plan.id);
                      }}
                      className={`relative p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-900/30 ring-2 ring-blue-400'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {plan.badge && (
                        <span className={`absolute -top-2.5 right-3 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide shadow-xs ${
                          isPlanFree ? 'bg-emerald-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                        }`}>
                          {plan.badge}
                        </span>
                      )}
                      <div>
                        <div className="text-xs font-black text-white">{plan.name}</div>
                        <div className={`text-base font-black mt-1 ${isPlanFree ? 'text-emerald-400' : 'text-amber-300'}`}>
                          {isPlanFree ? '0 F CFA' : formatCFA(plan.price)}
                          <span className="text-[10px] text-slate-400 font-normal"> / {isPlanFree ? 'permanent' : plan.period}</span>
                        </div>
                        {plan.description && (
                          <p className="text-[10.5px] text-slate-400 mt-1 leading-snug line-clamp-2">
                            {plan.description}
                          </p>
                        )}

                        {/* Limites PLG dynamiques */}
                        {plan.limits && (
                          <div className="mt-2.5 py-1.5 px-2 bg-slate-950/60 rounded-lg border border-slate-800 text-[10px] space-y-0.5 font-medium text-slate-300">
                            <div>• {plan.limits.maxProducts === -1 || plan.limits.maxProducts === 9999 ? 'Produits illimités' : `${plan.limits.maxProducts} produits max`}</div>
                            <div>• {plan.limits.maxCashiers === -1 ? 'Caissiers illimités' : `${plan.limits.maxCashiers ?? (plan.id === 'free' ? 1 : 2)} caissier${(plan.limits.maxCashiers ?? (plan.id === 'free' ? 1 : 2)) > 1 ? 's' : ''} max`}</div>
                            <div>• {plan.limits.maxFunnels === -1 ? 'Funnels illimités' : `${plan.limits.maxFunnels} funnel${plan.limits.maxFunnels > 1 ? 's' : ''}`}</div>
                            {plan.limits.customDomainAllowed ? (
                              <div className="text-emerald-400 font-bold">• Domaine personnalisé</div>
                            ) : (
                              <div className="text-slate-400">• Sous-domaine gratuit</div>
                            )}
                          </div>
                        )}
                      </div>

                      {plan.features && plan.features.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-700/60 space-y-1">
                          {plan.features.slice(0, 2).map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{feat}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SÉLECTEUR MODULAIRE GRANULAIRE À LA CARTE */}
            {currentPlan.price > 0 && currentPlan.id !== 'free' && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-3.5">
                {/* En-tête avec case "Tout sélectionner" */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        Personnalisation Modulaire à la Carte
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cochez uniquement les volets dont vous avez besoin, ou gardez le Pack Complet pour faire des économies.
                    </p>
                  </div>

                  {/* Case "Tout sélectionner" en haut (activée par défaut) */}
                  <button
                    type="button"
                    onClick={handleToggleAllPillars}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer border ${
                      isAllPillarsSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center text-xs font-bold ${
                      isAllPillarsSelected ? 'bg-emerald-500 text-slate-950' : 'border border-slate-500'
                    }`}>
                      {isAllPillarsSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>Tout sélectionner (Pack Complet)</span>
                  </button>
                </div>

                {/* Les 3 Cases à cocher modulaires */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* 1. La Caisse et ses modules uniquement */}
                  <button
                    type="button"
                    onClick={() => handleTogglePillar('caisse_pos')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      selectedPillars.includes('caisse_pos')
                        ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center ${
                          selectedPillars.includes('caisse_pos') ? 'bg-blue-500 text-white' : 'border border-slate-600'
                        }`}>
                          {selectedPillars.includes('caisse_pos') && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold text-white">🏪 La Caisse et ses modules uniquement</span>
                      </div>
                      <span className="text-[11px] font-black text-amber-300">
                        {formatCFA(modularCaissePrice)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      Caisse tactile, impression tickets thermiques, clôture Z, gestion du fond et créances clients.
                    </p>
                  </button>

                  {/* 2. La Vitrine et ses modules uniquement */}
                  <button
                    type="button"
                    onClick={() => handleTogglePillar('vitrine_web')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      selectedPillars.includes('vitrine_web')
                        ? 'bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center ${
                          selectedPillars.includes('vitrine_web') ? 'bg-indigo-500 text-white' : 'border border-slate-600'
                        }`}>
                          {selectedPillars.includes('vitrine_web') && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold text-white">🌐 La Vitrine et ses modules uniquement</span>
                      </div>
                      <span className="text-[11px] font-black text-amber-300">
                        {formatCFA(modularVitrinePrice)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      Boutique nsore.shop, panier WhatsApp, commandes clients, Pixels Meta & TikTok intégrés.
                    </p>
                  </button>

                  {/* 3. Formateur et ses modules uniquement */}
                  <button
                    type="button"
                    onClick={() => handleTogglePillar('formateur_lms')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      selectedPillars.includes('formateur_lms')
                        ? 'bg-purple-600/15 border-purple-500 text-white ring-1 ring-purple-500'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center ${
                          selectedPillars.includes('formateur_lms') ? 'bg-purple-500 text-white' : 'border border-slate-600'
                        }`}>
                          {selectedPillars.includes('formateur_lms') && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold text-white">🎓 Formateur et ses modules uniquement</span>
                      </div>
                      <span className="text-[11px] font-black text-amber-300">
                        {formatCFA(modularFormateurPrice)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      Vidéos illimitées, masterclasses Wameet, examens, diplômes QR-Code et séquestre Escrow.
                    </p>
                  </button>
                </div>

                {/* Boîte de résumé dynamique en direct */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <span>Résumé de sélection :</span>
                      <span className="text-emerald-400 font-extrabold">
                        {selectedPillars.length} volet{selectedPillars.length > 1 ? 's' : ''} actif{selectedPillars.length > 1 ? 's' : ''}
                      </span>
                      {isAllPillarsSelected && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                          Bundle Complet (Économie {formatCFA(modularBundleSavings)})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedPillars.length === 1 && selectedPillars[0] === 'caisse_pos' && 'Modules Caisse physique et gestion de caisse activés.'}
                      {selectedPillars.length === 1 && selectedPillars[0] === 'vitrine_web' && 'Modules Boutique en ligne et commandes WhatsApp activés.'}
                      {selectedPillars.length === 1 && selectedPillars[0] === 'formateur_lms' && 'Modules Académie en ligne, cours vidéo et certificats QR activés.'}
                      {selectedPillars.length === 2 && 'Les deux volets cochés sont combinés au tarif cumulé exact.'}
                      {selectedPillars.length === 3 && 'Accès complet aux modules sélectionnés pour votre activité.'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">Tarif mensuel calculé :</span>
                    <span className="text-lg font-black text-amber-300 font-mono">
                      {formatCFA(modularCalculation.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Matrice de Comparaison Détaillée Déployable */}
            <PricingComparisonMatrix
              selectedPlanId={selectedPlanId}
              onSelectPlan={(planId) => {
                playTapBeep();
                setSelectedPlanId(planId);
              }}
              className="my-1"
            />

            {/* Bouton CTA selon le plan sélectionné */}
            {currentPlan.price === 0 || currentPlan.id === 'free' ? (
              <button
                type="button"
                onClick={handleActivateFreePlan}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Activation du plan gratuit en cours...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>Activer mon Plan Gratuit (0 F CFA) & Accéder à la Caisse</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setFunnelStep('UPSELL');
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition active:scale-98 cursor-pointer"
              >
                <span>Continuer vers les options ({formatCFA(modularCalculation.totalPrice)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 2 : UPSELL (OPTIONS COMPLÉMENTAIRES SAAS)                           */}
        {/* ========================================================================= */}
        {funnelStep === 'UPSELL' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { playTapBeep(); setFunnelStep('PLAN_SELECTION'); }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Boostez votre Écosystème Nanasore
                </h2>
                <p className="text-xs text-slate-400">
                  Ajoutez les modules premium recommandés pour décupler votre activité.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {SAAS_ADDONS.map((addon) => {
                const isSelected = selectedAddonIds.includes(addon.id);
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-400 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{addon.name}</span>
                        {addon.badge && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-400 text-slate-950 uppercase tracking-wide">
                            {addon.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {addon.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-black text-amber-300">
                        +{formatCFA(addon.price)}
                      </span>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                        isSelected ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold' : 'border-slate-600 bg-slate-900'
                      }`}>
                        {isSelected ? <Check className="w-4 h-4" /> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Formule + Options :</span>
              <strong className="text-amber-300 font-mono text-sm font-black">
                {formatCFA((currentPlan?.price || 0) + addonsTotal)}
              </strong>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setFunnelStep('PAYMENT');
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition active:scale-98 cursor-pointer"
              >
                <span>Continuer vers le paiement ({formatCFA((currentPlan?.price || 0) + addonsTotal)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setFunnelStep('DOWNSELL');
                }}
                className="w-full py-2 px-3 text-slate-400 hover:text-slate-200 text-xs font-semibold text-center cursor-pointer transition"
              >
                Passer cette étape & continuer sans option
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 3 : DOWNSELL (OFFRE DE RÉDUCTION SPÉCIALE DÉSTOCKAGE)                */}
        {/* ========================================================================= */}
        {funnelStep === 'DOWNSELL' && (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { playTapBeep(); setFunnelStep('UPSELL'); }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider inline-flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" />
                  Offre Spéciale Démarrage
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                  Profitez de 2 000 F CFA de Remise Immédiate !
                </h2>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/30 border border-rose-500/40 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">Coupon de Bienvenue Nanasore</h3>
                  <p className="text-[11px] text-slate-300">
                    Activez votre caisse aujourd'hui et déduisez directement 2 000 F CFA de votre première facture.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Prix initial {currentPlan.name} :</span>
                  <span className="line-through">{formatCFA(currentPlan.price)}</span>
                </div>
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Remise immédiate appliquée :</span>
                  <span>- 2 000 F CFA</span>
                </div>
                <div className="pt-1.5 border-t border-slate-800 flex justify-between font-black text-sm">
                  <span className="text-white">Nouveau total à régler :</span>
                  <span className="text-emerald-400 font-mono">
                    {formatCFA(Math.max(1000, currentPlan.price - 2000))}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setDownsellAccepted(true);
                  setFunnelStep('PAYMENT');
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition active:scale-98 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Activer ma remise de 2 000 F CFA & Passer au règlement</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setDownsellAccepted(false);
                  setFunnelStep('PAYMENT');
                }}
                className="w-full py-2 px-3 text-slate-400 hover:text-slate-200 text-xs font-semibold text-center cursor-pointer transition"
              >
                Continuer au tarif standard sans la remise
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 4 : RÈGLEMENT HYBRIDE VIA NANASORE PAYMENT GATEWAY                  */}
        {/* ========================================================================= */}
        {funnelStep === 'PAYMENT' && !paymentSuccess && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Barre de retour et récapitulatif */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <button
                type="button"
                onClick={() => { playTapBeep(); setFunnelStep('PLAN_SELECTION'); }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs cursor-pointer transition active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Modifier formule</span>
              </button>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Formule choisie :</span>
                <span className="text-xs font-black text-amber-300 font-mono">
                  {currentPlan.name} • {formatCFA(montantTotal)}
                </span>
              </div>
            </div>

            {/* Passerelle de paiement 100% automatique S */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-1 sm:p-3 overflow-hidden">
              <SPaymentGateway
                isModal={false}
                productType="subscription"
                amount={montantTotal}
                currency="FCFA"
                orderDescription={`Abonnement SaaS Nanasore - ${currentPlan.name}`}
                orderId={`SUB-${effectiveStoreId}-${Date.now().toString(36).toUpperCase()}`}
                defaultPhone={safeUser.phone || ''}
                onSuccess={handleGatewaySuccess}
                onCancel={() => {
                  playTapBeep();
                  setFunnelStep('PLAN_SELECTION');
                }}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 5 : CONFIRMATION & SUCCÈS ZERO-TOUCH (100% Dynamique selon le plan) */}
        {/* ========================================================================= */}
        {funnelStep === 'SUCCESS' && paymentSuccess && (() => {
          const isFreeActivation = currentPlan.price === 0 || currentPlan.id === 'free';
          const planDisplayName = currentPlan.name || (isFreeActivation ? 'Plan Gratuit' : currentPlan.id);
          const confirmedAmount = paymentResult?.amount !== undefined ? paymentResult.amount : montantTotal;
          const hasTransactionData = !isFreeActivation && Boolean(paymentResult?.transactionId);

          return (
            <div className="p-6 text-center space-y-4 bg-emerald-950/50 border border-emerald-500/50 rounded-2xl animate-in zoom-in-95 duration-200">
              {/* Icône de succès */}
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              {/* Titre & message dynamiques selon le plan */}
              <div className="space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                  {isFreeActivation ? 'Compte Créé avec Succès' : 'Abonnement Activé avec Succès'}
                </span>

                {isFreeActivation ? (
                  <>
                    <h3 className="text-xl font-extrabold text-white">
                      Bienvenue sur le Plan Starter !
                    </h3>
                    <p className="text-xs text-emerald-300 max-w-sm mx-auto">
                      Votre compte est prêt. Configurez votre boutique ou votre académie et commencez à vendre dès maintenant — gratuitement.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-extrabold text-white">
                      Abonnement {planDisplayName} Opérationnel !
                    </h3>
                    <p className="text-xs text-emerald-300 max-w-sm mx-auto">
                      {hasTransactionData
                        ? `Votre paiement de ${formatCFA(confirmedAmount)} a été confirmé. Toutes les fonctionnalités ${planDisplayName} sont maintenant débloquées.`
                        : `Votre plan ${planDisplayName} a été activé avec succès. Votre caisse tactile est débloquée.`}
                    </p>
                  </>
                )}
              </div>

              {/* Récapitulatif — Plan gratuit : infos minimales, Plan payant : transaction complète */}
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan activé :</span>
                  <strong className="text-white">{planDisplayName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Statut du compte :</span>
                  <strong className="text-emerald-400">Actif ✓</strong>
                </div>

                {/* Lignes transaction uniquement pour les plans payants avec paiement confirmé */}
                {!isFreeActivation && (
                  <>
                    <div className="flex justify-between border-t border-slate-800 pt-1.5">
                      <span className="text-slate-400">Montant réglé :</span>
                      <strong className="text-emerald-400 font-mono">
                        {formatCFA(confirmedAmount)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mode de paiement :</span>
                      <strong className="text-white font-medium">
                        {paymentResult?.method || 'Nanasore Pay'}
                      </strong>
                    </div>
                    {hasTransactionData && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Réf. Transaction :</span>
                        <strong className="text-amber-300 font-mono truncate max-w-[120px]">
                          {paymentResult?.transactionId}
                        </strong>
                      </div>
                    )}
                  </>
                )}

                {/* Pour le plan gratuit : invitation à configurer */}
                {isFreeActivation && (
                  <div className="flex justify-between border-t border-slate-800 pt-1.5">
                    <span className="text-slate-400">Prochaine étape :</span>
                    <strong className="text-blue-300 font-medium">Configurer ma boutique</strong>
                  </div>
                )}
              </div>

              {/* CTA dynamique avec fermeture définitive */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-98 cursor-pointer"
              >
                <span>
                  {isFreeActivation
                    ? 'Configurer ma boutique →'
                    : 'Accéder à mon Espace Nanasore'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })()}

      </div>
    </div>
  );
};

export default SubscriptionPaywallModal;
