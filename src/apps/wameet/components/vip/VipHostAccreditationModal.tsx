import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Crown,
  Award,
  ShieldCheck,
  TrendingUp,
  Users,
  GraduationCap,
  Share2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { UltimateCheckout } from '../../../../components/payment/UltimateCheckout';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';

interface SectorScore {
  id: string;
  label: string;
  points: number;
  maxPoints: number;
  badgeName: string;
  badgeEarned: boolean;
  details: string;
}

interface EligibilityData {
  scoring: {
    totalScore: number;
    grade: 'NON_ELIGIBLE' | 'PRESTIGE' | 'SOUVERAIN' | 'IMPERIAL';
    badges: string[];
    sectors: SectorScore[];
    meetsMinimumPaymentCriteria: boolean;
    failureReasons: string[];
  };
  pricing: {
    activationCount: number;
    tierSteps: number;
    baseActivationPriceXof: number;
    currentActivationPriceXof: number;
    nextActivationPriceXof: number;
    monthlyFeeXof: number;
    totalFirstActivationXof: number;
    remainingInCurrentTier: number;
  };
  isActiveHost: boolean;
  multiStreamingUnlocked: boolean;
}

export interface VipHostAccreditationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onAccredited?: () => void;
}

const GRADE_STYLES: Record<string, { label: string; bg: string; border: string; text: string }> = {
  NON_ELIGIBLE: {
    label: 'En Qualification',
    bg: 'bg-slate-800/80',
    border: 'border-slate-600',
    text: 'text-slate-300',
  },
  PRESTIGE: {
    label: 'Grade Prestige (Silver)',
    bg: 'bg-slate-700/60',
    border: 'border-slate-300/60',
    text: 'text-slate-100',
  },
  SOUVERAIN: {
    label: 'Grade Souverain (Gold)',
    bg: 'bg-amber-500/20',
    border: 'border-amber-400/60',
    text: 'text-amber-300',
  },
  IMPERIAL: {
    label: 'Cercle Impérial (Élite)',
    bg: 'bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/25',
    border: 'border-amber-400',
    text: 'text-amber-200',
  },
};

export const VipHostAccreditationModal: React.FC<VipHostAccreditationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAccredited,
}) => {
  const [data, setData] = useState<EligibilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const collectLocalMetrics = useCallback(() => {
    let userObj = currentUser;
    let productsCount = 0;
    let coursesCount = 0;
    let studentsCount = 0;
    let affiliatesCount = 0;
    let affiliateVolumeXof = 0;
    let revenueXof = 0;
    let walletBalanceXof = 0;
    let liveSessionsCount = 0;
    let audienceCount = 0;

    try {
      if (!userObj) {
        userObj = JSON.parse(localStorage.getItem('nana_store_auth_user') || 'null');
      }
      const storeId = userObj?.storeId || userObj?.uid || userObj?.id || 'default';
      walletBalanceXof = Number(userObj?.walletBalance || localStorage.getItem(`nana_wallet_bal_${storeId}`) || 0) || 0;
      revenueXof = Number(userObj?.totalRevenue || userObj?.salesTotal || 0) || 0;

      const productsRaw = JSON.parse(localStorage.getItem(`nana_products_${storeId}`) || localStorage.getItem('nana_products') || '[]');
      if (Array.isArray(productsRaw)) productsCount = productsRaw.length;

      const coursesRaw = JSON.parse(localStorage.getItem('nana_lms_courses') || '[]');
      if (Array.isArray(coursesRaw)) {
        coursesCount = coursesRaw.length;
        studentsCount = coursesRaw.reduce((acc: number, c: any) => acc + (Number(c?.studentsCount || 0) || 0), 0);
      }

      const affRaw = JSON.parse(localStorage.getItem('nana_affiliate_referrals') || localStorage.getItem(`nana_affiliates_${storeId}`) || '[]');
      if (Array.isArray(affRaw)) {
        affiliatesCount = affRaw.length;
        affiliateVolumeXof = affRaw.reduce((acc: number, a: any) => acc + (Number(a?.commissionXof || a?.volume || 0) || 0), 0);
      }

      const livesRaw = JSON.parse(localStorage.getItem('nana_live_sessions') || '[]');
      if (Array.isArray(livesRaw)) {
        liveSessionsCount = livesRaw.length;
        audienceCount = livesRaw.reduce((acc: number, l: any) => acc + (Number(l?.viewersCount || 0) || 0), 0);
      }
    } catch {}

    const kycVerified = Boolean(
      userObj?.kycStatus === 'verified' ||
      userObj?.kyc_status === 'verified' ||
      userObj?.isVerified ||
      userObj?.role === 'super_admin' ||
      userObj?.role === 'SUPER_ADMIN'
    );

    return {
      userId: userObj?.id || userObj?.uid || '',
      universeId: userObj?.storeId || userObj?.id || '',
      email: userObj?.email || '',
      fullName: userObj?.name || userObj?.storeName || '',
      isSuperAdmin: userObj?.role === 'super_admin' || userObj?.role === 'SUPER_ADMIN',
      revenueXof,
      walletBalanceXof,
      productsCount,
      coursesCount,
      studentsCount,
      liveSessionsCount,
      audienceCount,
      affiliatesCount,
      affiliateVolumeXof,
      kycVerified,
      openDisputesCount: 0,
    };
  }, [currentUser]);

  const fetchEligibility = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const m = collectLocalMetrics();
      const params = new URLSearchParams();
      Object.entries(m).forEach(([k, v]) => params.set(k, String(v)));
      const res = await fetch(`/api/vip/host/eligibility?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Impossible de charger votre score VIP.');
      }
      setData(json);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur de vérification.');
    } finally {
      setIsLoading(false);
    }
  }, [collectLocalMetrics]);

  useEffect(() => {
    if (isOpen) {
      fetchEligibility();
    }
  }, [isOpen, fetchEligibility]);

  if (!isOpen) return null;

  const gradeInfo = GRADE_STYLES[data?.scoring?.grade || 'NON_ELIGIBLE'] || GRADE_STYLES.NON_ELIGIBLE;
  const sectorIcons: Record<string, React.ReactNode> = {
    commerce: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    knowledge: <GraduationCap className="w-4 h-4 text-blue-400" />,
    audience: <Users className="w-4 h-4 text-rose-400" />,
    affiliate: <Share2 className="w-4 h-4 text-amber-400" />,
    trust: <ShieldCheck className="w-4 h-4 text-teal-400" />,
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-slate-900 border border-amber-500/35 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 my-auto max-h-[92dvh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center shadow-lg shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                Accréditation &amp; Ouverture Salon VIP Élite
              </h2>
              <p className="text-xs text-slate-400">
                Collecte d&apos;atouts multi-secteurs (Commerce, Savoir, Audience, Affiliation &amp; Confiance)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <span className="text-xs font-semibold">Analyse de vos atouts &amp; points de gradation...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
            {errorMsg}
          </div>
        ) : data ? (
          <>
            {/* Score + Grade Banner */}
            <div className={`p-4 rounded-2xl border ${gradeInfo.bg} ${gradeInfo.border} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider ${gradeInfo.text}`}>
                    {gradeInfo.label}
                  </span>
                  {data.isActiveHost && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black">
                      ✓ HÔTE ACTIF
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{data.scoring.totalScore}</span>
                  <span className="text-xs text-slate-400 font-bold">/ 100 Points d&apos;Atouts</span>
                </div>
                <div className="w-full sm:w-64 h-2 rounded-full bg-slate-950/70 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, data.scoring.totalScore)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1.5 text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/60 border border-white/10">
                  <Radio className={`w-3.5 h-3.5 ${data.multiStreamingUnlocked ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={data.multiStreamingUnlocked ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                    Multi-Streaming : {data.multiStreamingUnlocked ? 'Débloqué (Souverain+)' : 'Grade Souverain requis (60+ pts)'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {data.scoring.badges.length} / 5 Badges d&apos;élite collectés
                </span>
              </div>
            </div>

            {/* Grille des 5 secteurs & Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.scoring.sectors.map((sec) => (
                <div
                  key={sec.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    sec.badgeEarned
                      ? 'bg-slate-800/80 border-amber-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {sectorIcons[sec.id] || <Award className="w-4 h-4 text-amber-400" />}
                      <span className="text-xs font-extrabold text-white">{sec.label}</span>
                    </div>
                    <span className="text-xs font-black text-amber-300">
                      {sec.points}/{sec.maxPoints} pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{sec.details}</p>
                  <div className="flex items-center gap-1.5">
                    {sec.badgeEarned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Badge : {sec.badgeName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-semibold">
                        <Lock className="w-3 h-3" />
                        Badge verrouillé : {sec.badgeName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bloc Tarification Dynamique (+5% tous les 5 activés) & Activation par Paiement */}
            {!data.isActiveHost && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Activation du Statut Hôte VIP par Paiement
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Soumis à la validation des critères minimaux • Augmentation automatique de +5% tous les 5 hôtes activés
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-black shrink-0">
                    {data.pricing.remainingInCurrentTier} place(s) avant +5% ({formatCFA(data.pricing.nextActivationPriceXof)})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Activation unique (palier actuel)</span>
                    <strong className="text-base font-black text-amber-300">
                      {formatCFA(data.pricing.currentActivationPriceXof)}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Abonnement mensuel Salon VIP</span>
                    <strong className="text-base font-black text-white">
                      {formatCFA(data.pricing.monthlyFeeXof)} / mois
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40">
                    <span className="text-[10px] text-amber-200 block">Total 1re activation (1er mois inclus)</span>
                    <strong className="text-base font-black text-amber-300">
                      {formatCFA(data.pricing.totalFirstActivationXof)}
                    </strong>
                  </div>
                </div>

                {!data.scoring.meetsMinimumPaymentCriteria ? (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Critères minimaux requis avant d&apos;activer par paiement :</span>
                    </div>
                    <ul className="list-disc pl-5 text-[11px] text-rose-200/90 space-y-0.5">
                      {data.scoring.failureReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition"
                  >
                    <Crown className="w-4 h-4" />
                    <span>
                      Valider mes critères &amp; Activer mon Salon VIP ({formatCFA(data.pricing.totalFirstActivationXof)})
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {data.isActiveHost && (
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  onClose();
                  onAccredited?.();
                }}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Statut Hôte VIP Actif — Ouvrir / Créer une Salle VIP</span>
              </button>
            )}
          </>
        ) : null}
      </div>

      {isCheckoutOpen && data && (
        <div className="fixed inset-0 z-[10000]">
          <UltimateCheckout
            isModal={true}
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onCancel={() => setIsCheckoutOpen(false)}
            merchantId="nanasore_platform"
            storeName="Nanasore Salons VIP Élite"
            product={{
              id: 'vip-host-accreditation',
              name: `Accréditation Hôte VIP (${formatCFA(data.pricing.currentActivationPriceXof)} + ${formatCFA(data.pricing.monthlyFeeXof)}/mois)`,
              price: data.pricing.totalFirstActivationXof,
              quantity: 1,
            }}
            amount={data.pricing.totalFirstActivationXof}
            defaultPhone={currentUser?.phone || ''}
            defaultCustomerName={currentUser?.name || currentUser?.storeName || ''}
            defaultEmail={currentUser?.email || ''}
            onSuccess={async (details) => {
              setIsCheckoutOpen(false);
              const m = collectLocalMetrics();
              const actRes = await fetch('/api/vip/host/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: m.userId,
                  universeId: m.universeId,
                  email: m.email,
                  fullName: m.fullName,
                  transactionId: details.transactionId,
                  amountPaidXof: details.amount || data.pricing.totalFirstActivationXof,
                  metrics: m,
                }),
              });
              const actJson = await actRes.json().catch(() => null);
              if (!actRes.ok || !actJson?.success) {
                setErrorMsg(actJson?.error || 'Erreur activation Hôte VIP.');
                return;
              }
              playValidationBeep();
              await fetchEligibility();
              onAccredited?.();
            }}
          />
        </div>
      )}
    </div>
  );
};

export default VipHostAccreditationModal;
