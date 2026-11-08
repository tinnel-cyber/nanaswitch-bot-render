import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Zap,
  Flame,
  AlertTriangle,
  Lock,
  ArrowUpRight,
  Radio,
  Sparkles,
  Package,
  FileCheck2,
  MessageSquare,
  ShieldAlert,
  Crown,
  ChevronRight,
  TrendingUp,
  HardDrive
} from 'lucide-react';
import {
  TenantQuotaItem,
  StoreUser,
  StoreSubscription,
  CompletedSale,
  InventoryProduct
} from '../../types';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { computeDynamicTenantQuotas } from '../../utils/planFeatures';
import { getStorageUsageEstimate } from '../../utils/storageManager';
import { getMarketingQuota } from '../../services/marketingAiService';

export interface QuotaWidgetProps {
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onOpenUpgrade?: () => void;
  className?: string;
  quotasOverride?: TenantQuotaItem[];
  sales?: CompletedSale[];
  inventory?: InventoryProduct[];
  onNavigate?: (view: any) => void;
}

/**
 * Quotas initiaux par défaut propres à 0 (aucun mock data)
 */
export const DEFAULT_TENANT_QUOTAS: TenantQuotaItem[] = [
  {
    id: 'quota-sales',
    name: 'Chiffre d\'Affaires & Ventes Réalisées',
    current: 0,
    max: 100000,
    unit: 'FCFA',
    category: 'sales',
    resetPeriod: 'Palier 100 000 FCFA',
    emptyStateActionLabel: '0 FCFA générés sur 100 000 FCFA — Enregistrez votre 1ère vente ! 🚀',
    targetAction: 'POS'
  },
  {
    id: 'quota-inventory',
    name: 'Produits au Catalogue & Vitrine',
    current: 0,
    max: 3,
    unit: 'articles',
    category: 'inventory',
    resetPeriod: 'Limite active',
    emptyStateActionLabel: '0 produit créé sur 3 — Ajoutez votre premier article ! 📦',
    targetAction: 'INVENTORY'
  },
  {
    id: 'quota-storage',
    name: 'Espace Disque & Médias Cloud',
    current: 0,
    max: 50,
    unit: 'Mo',
    category: 'storage',
    resetPeriod: 'Stockage Cloud Sécurisé',
    emptyStateActionLabel: '0 Mo utilisés sur 50 Mo — Prêt pour vos photos et vidéos ! 💾',
    targetAction: 'INVENTORY'
  },
  {
    id: 'quota-live',
    name: 'Live Flash & Webinaires Commerciaux',
    current: 0,
    max: 3,
    unit: 'diffusions',
    category: 'live',
    resetPeriod: 'Ce mois-ci',
    emptyStateActionLabel: '0 diffusion sur 3 ce mois-ci — Lancez votre 1ère vente en direct ! 🎥',
    targetAction: 'BOUTIQUE'
  },
  {
    id: 'quota-ai',
    name: 'Assistant IA Marketing & Copywriting',
    current: 0,
    max: 5,
    unit: 'requêtes IA',
    category: 'marketing',
    resetPeriod: 'Ce mois-ci',
    emptyStateActionLabel: '0 requête utilisée sur 5 — Rédigez avec Gemini IA ! ✨',
    targetAction: 'AI_STUDIO'
  },
  {
    id: 'quota-invoicing',
    name: 'Devis & Factures Sécurisées DocuSign',
    current: 0,
    max: 1,
    unit: 'documents',
    category: 'invoicing',
    resetPeriod: 'Ce mois-ci',
    emptyStateActionLabel: '0 document généré sur 1 — Créez et signez votre premier devis ! 📑',
    targetAction: 'DEVIS'
  }
];

export const QuotaWidget: React.FC<QuotaWidgetProps> = ({
  currentUser,
  subscription,
  onOpenUpgrade,
  className = '',
  quotasOverride,
  sales = [],
  inventory = [],
  onNavigate
}) => {
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [marketingAiUsed, setMarketingAiUsed] = useState<number>(0);

  // Estimation dynamique de l'espace disque et quota IA réel du compte
  useEffect(() => {
    let mounted = true;
    getStorageUsageEstimate().then((res) => {
      if (mounted && res?.usage) {
        setStorageBytes(res.usage);
      }
    });

    const effUid = currentUser?.id || currentUser?.storeId;
    if (effUid) {
      getMarketingQuota(effUid, subscription).then((info) => {
        if (mounted && typeof info?.used === 'number') {
          setMarketingAiUsed(info.used);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [currentUser?.id, currentUser?.storeId, subscription]);

  // Calcul 100% dynamique connecté aux statistiques réelles du compte utilisateur
  const dynamicQuotas = useMemo(() => {
    if (quotasOverride && quotasOverride.length > 0) {
      return quotasOverride;
    }
    return computeDynamicTenantQuotas({
      currentUser,
      subscription,
      sales,
      inventory,
      storageBytesUsed: storageBytes,
      marketingAiUsed
    });
  }, [quotasOverride, currentUser, subscription, sales, inventory, storageBytes, marketingAiUsed]);

  const quotas = dynamicQuotas;

  // Calcul du nombre de quotas critiques (>= 80%) et saturés (100%) - avec protection stricte contre les faux positifs
  const saturatedCount = quotas.filter(q => q.max > 0 && q.current >= q.max).length;
  const criticalCount = quotas.filter(q => q.max > 0 && (q.current / q.max) >= 0.8 && q.current < q.max).length;

  const handleUpgradeClick = () => {
    playValidationBeep();
    // 1. Déclencher l'appel direct des tarifs d'abonnements
    if (onOpenUpgrade) {
      onOpenUpgrade();
    }
    window.dispatchEvent(new CustomEvent('nana_open_paywall_modal', { detail: { targetPlanId: 'pro', reason: 'UPGRADE_PRO' } }));
    window.dispatchEvent(new CustomEvent('nanasore_open_subscription_plans'));

    // 2. Si pas de compte ouvert ou gérant invité, orienter vers l'ouverture de compte / KYC
    const isNoAccount = !currentUser || !currentUser.id || currentUser.id === 'user_default' || !currentUser.email;
    if (isNoAccount) {
      window.dispatchEvent(new CustomEvent('nanasore_open_kyc', { detail: { type: 'particulier' } }));
    }
  };

  const getQuotaIcon = (cat: TenantQuotaItem['category']) => {
    switch (cat) {
      case 'sales':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'storage':
        return <HardDrive className="w-4 h-4 text-cyan-400" />;
      case 'live':
        return <Radio className="w-4 h-4 text-rose-400" />;
      case 'inventory':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'marketing':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'invoicing':
        return <FileCheck2 className="w-4 h-4 text-cyan-400" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      default:
        return <Zap className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className={`w-full bg-[#FFFFFF] border-2 border-[#2563EB] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden group ${className}`}>
      {/* Halo d'ambiance en arrière-plan */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* ── En-tête : Identification du Plan & Alertes Réelles ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5 relative z-10">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border-2 border-[#2563EB]/30 text-[#2563EB] flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Utilisation & Quotas du Compte
              </h2>
              <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-[#2563EB]/40 text-[#2563EB] font-extrabold text-[10px] uppercase tracking-wider">
                Plan Actuel : {subscription?.plan ? String(subscription.plan).toUpperCase() : 'GRATUIT'}
              </span>
              {saturatedCount > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-600 font-extrabold text-[10px] flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  {saturatedCount} Quota Saturé (100%)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Consommation réelle de vos ressources. Débloquez la vitesse supérieure pour votre boutique.
            </p>
          </div>
        </div>

        {/* Bouton d'Upsell Haut de Gamme */}
        <button
          type="button"
          onClick={handleUpgradeClick}
          className="self-start sm:self-center px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:via-rose-400 hover:to-indigo-500 active:scale-95 text-white font-black text-xs transition-all shadow-xl shadow-rose-950/20 flex items-center gap-2 cursor-pointer border border-rose-300/30 shrink-0"
        >
          <Crown className="w-4 h-4 text-amber-200 fill-amber-200" />
          <span>Passer à la Formule Pro 🚀</span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
        </button>
      </div>

      {/* ── Bannière de Friction Commerciale (affichée UNIQUEMENT si un quota est réellement saturé) ── */}
      {saturatedCount > 0 && (
        <div className="bg-gradient-to-r from-rose-950/80 via-red-950/50 to-slate-900 border border-rose-500/50 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden shadow-lg animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-200 flex items-center gap-1.5">
                <span>⚠️ Limite de compte atteinte sur votre formule actuelle !</span>
              </p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Ne manquez aucune opportunité : le Plan Pro supprime immédiatement tous les plafonds de streaming, d'inventaire et de stockage.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpgradeClick}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-[11px] transition shadow-md shadow-rose-950/40 flex items-center gap-1.5 cursor-pointer shrink-0 self-end sm:self-center"
          >
            <span>Débloquer Tout</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Grille des Barres de Progression des Quotas (Calcul Dynamique & État Zéro Parfait) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {quotas.map((quota) => {
          const isUnlimited = quota.max === -1;
          const isZero = (quota.current || 0) <= 0;
          const safeMax = isUnlimited ? 100 : Math.max(quota.max || 1, 1);
          const safeCurrent = Math.max(quota.current || 0, 0);

          // Règle stricte : État de départ à 0 donne strictement 0% de largeur sans erreur NaN
          const percentage = isUnlimited
            ? (safeCurrent > 0 ? Math.min(100, safeCurrent * 5) : 0)
            : (isZero ? 0 : Math.min(100, Math.max(0, Math.round((safeCurrent / safeMax) * 100))));

          const isSaturated = !isUnlimited && safeMax > 0 && safeCurrent >= safeMax;
          const isCritical = !isUnlimited && percentage >= 80 && !isSaturated;

          // Détermination dynamique des teintes
          let barGradient = 'from-emerald-500 to-teal-400';
          let textColor = 'text-emerald-400';
          let badgeBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
          let statusText = `${percentage}% utilisé`;

          if (isSaturated) {
            barGradient = 'from-rose-600 to-red-500 animate-pulse';
            textColor = 'text-rose-400 font-black';
            badgeBg = 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse font-black';
            statusText = '100% SATURÉ';
          } else if (isCritical) {
            barGradient = 'from-amber-500 to-orange-500';
            textColor = 'text-amber-400 font-bold';
            badgeBg = 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold';
            statusText = `${percentage}% (Limite Proche)`;
          } else if (isZero) {
            barGradient = 'from-slate-700 to-slate-600';
            textColor = 'text-slate-400 font-semibold';
            badgeBg = 'bg-blue-500/10 border-blue-500/30 text-blue-400 font-bold';
            statusText = '0% • À DÉMARRER';
          } else if (isUnlimited) {
            barGradient = 'from-indigo-500 to-cyan-400';
            textColor = 'text-indigo-400 font-bold';
            badgeBg = 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-bold';
            statusText = 'ILLIMITÉ 👑';
          }

          // Formatage de la valeur numérique
          let displayCurrent = String(safeCurrent);
          let displayMax = `/ ${quota.max} ${quota.unit}`;

          if (quota.category === 'sales') {
            displayCurrent = formatCFA(safeCurrent);
            displayMax = `/ ${formatCFA(quota.max)}`;
          } else if (isUnlimited) {
            displayCurrent = `${safeCurrent} ${quota.unit}`;
            displayMax = '(Illimité)';
          } else if (quota.category === 'storage') {
            displayCurrent = `${safeCurrent} Mo`;
            displayMax = `/ ${quota.max} Mo`;
          }

          return (
            <div
              key={quota.id}
              className={`p-3.5 rounded-2xl border-2 transition-all relative overflow-hidden flex flex-col justify-between ${
                isSaturated
                  ? 'bg-rose-50 border-rose-300 hover:border-rose-500 shadow-md shadow-rose-900/10'
                  : isCritical
                  ? 'bg-amber-50 border-amber-300 hover:border-amber-500'
                  : isZero
                  ? 'bg-white border-[#2563EB]/20 hover:border-[#2563EB]/60'
                  : 'bg-blue-50/60 border-[#2563EB]/25 hover:border-[#2563EB]'
              }`}
            >
              <div>
                {/* En-tête de la métrique */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                      {getQuotaIcon(quota.category)}
                    </div>
                    <span className="text-xs font-bold text-slate-800 line-clamp-1" title={quota.name}>
                      {quota.name}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-wide shrink-0 ${badgeBg}`}>
                    {statusText}
                  </span>
                </div>

                {/* Valeurs numériques réelles */}
                <div className="flex items-baseline justify-between mt-1 text-xs">
                  <span className="text-slate-500 text-[11px]">
                    {quota.category === 'sales' ? 'Total Réalisé' : 'Consommation'}
                  </span>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className={`text-sm ${textColor}`}>
                      {displayCurrent}
                    </span>
                    <span className="text-slate-500 text-[11px]">{displayMax}</span>
                  </div>
                </div>

                {/* Barre de progression dynamique (largeur 0% garantie sans NaN) */}
                <div className="w-full h-2.5 bg-slate-200 rounded-full mt-2.5 overflow-hidden border border-slate-300/80 p-0.5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500 shadow-sm`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Micro-copie de motivation lorsque la jauge est à 0 */}
                {isZero && quota.emptyStateActionLabel && (
                  <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-[10.5px] text-blue-900 flex items-center justify-between gap-1.5">
                    <span className="truncate">{quota.emptyStateActionLabel}</span>
                    {onNavigate && quota.targetAction && (
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          onNavigate(quota.targetAction);
                        }}
                        className="text-[10px] text-[#2563EB] hover:text-blue-800 font-extrabold flex items-center gap-0.5 shrink-0 underline cursor-pointer active:scale-95 transition"
                      >
                        <span>Action</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Pied de carte contextuel */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10.5px]">
                <span className="text-slate-500 truncate">
                  {quota.resetPeriod || 'Cycle mensuel'}
                </span>
                {isSaturated ? (
                  <button
                    type="button"
                    onClick={handleUpgradeClick}
                    className="text-rose-600 hover:text-rose-700 font-extrabold flex items-center gap-0.5 active:scale-95 cursor-pointer underline underline-offset-2"
                  >
                    <span>Débloquer</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                ) : isCritical ? (
                  <button
                    type="button"
                    onClick={handleUpgradeClick}
                    className="text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-0.5 active:scale-95 cursor-pointer"
                  >
                    <span>Augmenter</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                ) : isZero ? (
                  <span className="text-[#2563EB] font-medium">Prêt à l'emploi</span>
                ) : (
                  <span className="text-emerald-600 font-medium">Quota OK</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer d'incitation commerciale transparente ── */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
        <p className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Le Plan Pro supprime les plafonds d'inventaire et débloque l'IA pour <strong>12 000 F CFA/mois</strong> sans engagement.</span>
        </p>
        <button
          type="button"
          onClick={handleUpgradeClick}
          className="text-[#2563EB] hover:text-blue-800 font-bold underline cursor-pointer self-start sm:self-auto"
        >
          Comparer les fonctionnalités de chaque formule →
        </button>
      </div>
    </div>
  );
};

export default QuotaWidget;
