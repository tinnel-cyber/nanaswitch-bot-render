import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  Building2, 
  User, 
  CheckCircle2, 
  Sparkles,
  Info
} from 'lucide-react';
import type { NanaMerchantApp } from '../nanaSwitch/NanaSwitchApp';

export interface KycVolumeLimitCardProps {
  app: NanaMerchantApp;
  onUpgradeClick?: () => void;
  className?: string;
}

export const KycVolumeLimitCard: React.FC<KycVolumeLimitCardProps> = ({
  app,
  onUpgradeClick,
  className = ''
}) => {
  // Détermination stricte du profil KYC : Particulier (1 000 000 XOF) vs Entreprise (5 000 000 XOF)
  const isParticulier = 
    app.type === 'particulier' || 
    (app as any).accountType === 'particulier' || 
    app.kyc?.accountType === 'particulier' || 
    (app.kyc as any)?.type === 'particulier' ||
    app.kyc_limits?.tier === 'INDIVIDUAL';

  const isEnterprise = !isParticulier && (
    app.type === 'entreprise' || 
    app.type === 'business' || 
    (app as any).accountType === 'entreprise' ||
    app.kyc?.accountType === 'entreprise' ||
    app.kyc_limits?.tier === 'ENTERPRISE'
  );

  // Plafond mensuel légal strict en XOF :
  // - Particulier : 1 000 000 XOF / mois
  // - Entreprise : 5 000 000 XOF / mois (ou extension Super Admin validée)
  const maxLimit = isParticulier
    ? 1000000
    : (app.custom_monthly_limit_xof || (app.kyc_limits?.max_monthly_volume_xof ?? 5000000));

  // Volume réel consommé pour le mois civil en cours (100% réel, zéro mock)
  const currentVolume = Number(app.monthly_usage?.volume_xof) || 0;
  const remainingVolume = Math.max(0, maxLimit - currentVolume);
  const percentage = Math.min(100, Math.round((currentVolume / maxLimit) * 100));

  // Mois civil actuel en texte
  const currentMonthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date());
  const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  // Seuil d'alerte incitative (> 80%)
  const isNearLimit = percentage >= 80;
  const isCritical = percentage >= 95;

  return (
    <div className={`bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 ${className}`}>
      
      {/* 1. Header with Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-2xl shrink-0 ${
            isNearLimit ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-[#1E40AF]'
          }`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Plafond Mensuel de Transactions (KYC)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Période civile : <span className="font-semibold text-slate-700">{capitalizedMonth}</span>
            </p>
          </div>
        </div>

        {/* Profile Tier Badge */}
        <div>
          {isEnterprise ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#1E40AF] border border-blue-200">
              <Building2 className="w-3.5 h-3.5" />
              Compte Entreprise (5 000 000 XOF/mois)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
              <User className="w-3.5 h-3.5" />
              Compte Particulier (1 000 000 XOF/mois)
            </span>
          )}
        </div>
      </div>

      {/* 2. Numeric Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            Volume Consommé
          </span>
          <p className="text-lg font-black text-slate-900 mt-0.5 tracking-tight font-mono">
            {currentVolume.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-500 font-sans">XOF</span>
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            Plafond Mensuel
          </span>
          <p className="text-lg font-black text-slate-900 mt-0.5 tracking-tight font-mono">
            {maxLimit.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-500 font-sans">XOF</span>
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            Volume Restant
          </span>
          <p className={`text-lg font-black mt-0.5 tracking-tight font-mono ${
            isNearLimit ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'
          }`}>
            {remainingVolume.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-500 font-sans">XOF</span>
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            Consommation
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-lg font-black font-mono ${
              isCritical ? 'text-rose-600' : isNearLimit ? 'text-amber-600' : 'text-[#1E40AF]'
            }`}>
              {percentage}%
            </span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
              isNearLimit ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-[#1E40AF]'
            }`}>
              {isNearLimit ? 'Alerte' : 'Normal'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Visual Progress Bar (Jauge Visuelle) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Progression du mois civil</span>
          <span className="font-mono text-slate-500">
            {currentVolume.toLocaleString('fr-FR')} / {maxLimit.toLocaleString('fr-FR')} XOF
          </span>
        </div>

        {/* Outer bar container */}
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isCritical
                ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-sm animate-pulse'
                : isNearLimit
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm'
                : 'bg-gradient-to-r from-[#1E40AF] to-blue-500 shadow-sm'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 4. Incitative Upgrade Banner if percentage >= 80% */}
      {isNearLimit && (
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300 ${
          isCritical 
            ? 'bg-rose-50 border-rose-200 text-rose-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isCritical ? 'text-rose-600' : 'text-amber-600'}`} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold">
                {isEnterprise 
                  ? `Attention : ${percentage}% du plafond d'Entreprise atteint (${currentVolume.toLocaleString('fr-FR')} / ${maxLimit.toLocaleString('fr-FR')} XOF) !`
                  : `Attention : Vous avez consommé ${percentage}% de votre plafond Particulier (1 000 000 XOF) !`
                }
              </h4>
              <p className="text-[11px] leading-relaxed text-slate-700">
                {isEnterprise
                  ? "Pour éviter le rejet automatique de vos transactions (Erreur 403), demandez une extension de quota personnalisée auprès du Super Admin."
                  : "Les transactions qui dépassent 1 000 000 XOF seront rejetées (HTTP 403). Passez au compte Entreprise en fournissant votre RCCM & IFU pour débloquer 5 000 000 XOF/mois."
                }
              </p>
            </div>
          </div>

          {/* Action Button */}
          {onUpgradeClick && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition shadow-sm flex items-center justify-center gap-1.5 shrink-0 ${
                isEnterprise
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-blue-700/20'
              }`}
            >
              {isEnterprise ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Demander une extension Super Admin
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Débloquer le Plafond Entreprise (5 000 000 XOF)
                </>
              )}
            </button>
          )}

        </div>
      )}

    </div>
  );
};
export default KycVolumeLimitCard;
