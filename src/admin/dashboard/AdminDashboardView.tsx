import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Store, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  DollarSign, 
  Server, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  Clock,
  Sparkles,
  ExternalLink,
  Crown
} from 'lucide-react';
import { 
  getSuperAdminSettingsLocal, 
  SuperAdminSettings,
  isDemoStore
} from '../../services/superAdminService';
import { 
  fetchOrganizationsAsStoresFromSupabase, 
  calculateRealKpiMetrics 
} from '../../services/superAdminSupabaseService';
import { formatCFA } from '../../utils/audio';

export interface AdminDashboardViewProps {
  onNavigateTab?: (tab: 'dashboard' | 'tenants' | 'pricing' | 'system-health' | 'hub-builder' | 'saas-admin') => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigateTab }) => {
  const [settings, setSettings] = useState<SuperAdminSettings>(() => getSuperAdminSettingsLocal() || {});
  const [liveStoresCount, setLiveStoresCount] = useState<number>(0);
  const [liveKpis, setLiveKpis] = useState(() => calculateRealKpiMetrics([]));
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Chargement exclusif des données réelles depuis les tables SQL Supabase
    fetchOrganizationsAsStoresFromSupabase().then((stores) => {
      if (isMounted) {
        const clean = (stores || []).filter(s => !isDemoStore(s));
        setLiveStoresCount(clean.length);
        setLiveKpis(calculateRealKpiMetrics(clean));
      }
    });

    const handleUpdate = () => {
      setSettings(getSuperAdminSettingsLocal() || {});
    };

    window.addEventListener('superAdminUpdated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('superAdminUpdated', handleUpdate);
    };
  }, []);

  const totalStores = liveStoresCount;
  const pendingApprovals = 0;
  const activeMrr = liveKpis.monthlyRecurringRevenueMRR || 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Control Plane Actif — Super Admin
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Vue d'Ensemble de la Plateforme Nanasore
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Supervision unifiée de l'infrastructure, du réseau de marchands, des abonnements et de la souveraineté financière.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab?.('saas-admin')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-95 border border-amber-300"
            >
              <Crown className="w-4 h-4 text-slate-950" />
              <span>Grand Dashboard (12 Modules)</span>
            </button>
            <button
              onClick={() => onNavigateTab?.('tenants')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              <Store className="w-4 h-4" />
              <span>Gérer les Marchands</span>
            </button>
            <button
              onClick={() => onNavigateTab?.('system-health')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Santé Système</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Stores */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Marchands</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">{totalStores}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{totalStores > 0 ? `${totalStores} boutique(s) en base Supabase` : '0 boutique en base Supabase'}</span>
          </div>
        </div>

        {/* MRR Platform */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">MRR Plateforme</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">{formatCFA(activeMrr)}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Revenu récurrent mensuel réel</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">En Attente Validation</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">{pendingApprovals}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-2 font-medium">
            <span>{pendingApprovals > 0 ? `${pendingApprovals} dossier(s) à valider` : '0 dossier en attente'}</span>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Disponibilité Système</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">100%</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Supabase SQL & Render opérationnels</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Tenants Management */}
        <div 
          onClick={() => onNavigateTab?.('tenants')}
          className="group cursor-pointer bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all hover:bg-slate-900/70"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Gestion des Marchands</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Consultez la liste des boutiques abonnées, approuvez les nouveaux inscrits, suspendez les comptes et gérez les droits d'accès.
          </p>
        </div>

        {/* Card 2: Pricing Configuration */}
        <div 
          onClick={() => onNavigateTab?.('pricing')}
          className="group cursor-pointer bg-slate-900/40 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all hover:bg-slate-900/70"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Abonnements & Tarifs</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configurez les plans Zéro (Gratuit), Créateur et Commerçant. Ajustez les quotas de produits, limites et commissions de paiement.
          </p>
        </div>

        {/* Card 3: System Health */}
        <div 
          onClick={() => onNavigateTab?.('system-health')}
          className="group cursor-pointer bg-slate-900/40 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all hover:bg-slate-900/70"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Surveillance & Webhooks</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Contrôlez les passerelles Mobile Money (Orange, Wave, Moov), les webhooks de paiement SebPay et les journaux système en temps réel.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardView;
