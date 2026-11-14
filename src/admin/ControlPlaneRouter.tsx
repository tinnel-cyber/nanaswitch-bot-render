import React, { useState, useEffect } from 'react';
import { 
  Mail,
  ShieldCheck, 
  Store, 
  DollarSign, 
  Activity, 
  Layers, 
  ArrowLeft, 
  Crown, 
  Sliders,
  ExternalLink,
  Lock
} from 'lucide-react';
import { SuperAdminGuard } from './guards/SuperAdminGuard';
import { AdminDashboardView } from './dashboard/AdminDashboardView';
import { TenantsManagementView } from './tenants/TenantsManagementView';
import { PricingConfigView } from './pricing/PricingConfigView';
import { SystemHealthView } from './system-health/SystemHealthView';
import { KycValidationControlPlaneView } from './kyc/KycValidationControlPlaneView';
import { NanasoreLogo } from '../components/common/NanasoreLogo';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';

// Import dynamique du Hub Builder pour ne charger les éditeurs lourds que si nécessaire
const HubBuilderPage = React.lazy(() => import('../pages/admin/HubBuilder'));

// Import dynamique du Grand Tableau de Bord Super Admin (12 modules complets)
const SaasAdminDashboard = React.lazy(() => import('./legacy/SaasAdminDashboard').then(m => ({ default: m.SaasAdminDashboard || m.default })));

import { StoreUser } from '../types';

export type ControlPlaneTab = 'dashboard' | 'tenants' | 'kyc' | 'pricing' | 'system-health' | 'hub-builder' | 'saas-admin';

export interface ControlPlaneRouterProps {
  initialTab?: ControlPlaneTab;
  onExitToMerchant?: () => void;
  currentUser?: StoreUser | null;
}

/**
 * ============================================================================
 * CONTROL PLANE ROUTER — ESPACE DÉDIÉ SUPER ADMIN & FONDATEUR
 * ============================================================================
 * Totalement isolé des 27 modules marchands.
 * Protégé par SuperAdminGuard.
 */
export const ControlPlaneRouter: React.FC<ControlPlaneRouterProps> = ({
  initialTab = 'dashboard',
  onExitToMerchant,
  currentUser
}) => {
  const [currentTab, setCurrentTab] = useState<ControlPlaneTab>(initialTab);

  // Synchronisation avec l'URL navigateur
  useEffect(() => {
    const handleUrlSync = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/admin/kyc') || path.includes('/admin/conformite') || path.includes('/admin/identification')) {
        setCurrentTab('kyc');
      } else if (path.includes('/admin/tenants')) {
        setCurrentTab('tenants');
      } else if (path.includes('/admin/pricing') || path.includes('/admin/tarifs')) {
        setCurrentTab('pricing');
      } else if (path.includes('/admin/system-health') || path.includes('/admin/health')) {
        setCurrentTab('system-health');
      } else if (path.includes('/admin/hub-builder') || path.includes('/admin/hubbuilder')) {
        setCurrentTab('hub-builder');
      } else if (path.includes('/admin/saas') || path.includes('/admin/legacy') || path.includes('/admin/modules') || path.includes('/admin/mega')) {
        setCurrentTab('saas-admin');
      } else if (path === '/admin' || path === '/admin/' || path.includes('/admin/dashboard')) {
        setCurrentTab('dashboard');
      }
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, []);

  const navigateToTab = (tab: ControlPlaneTab) => {
    setCurrentTab(tab);
    const newPath = tab === 'dashboard' ? '/admin' : `/admin/${tab}`;
    window.history.pushState({}, '', newPath);
  };

  const handleReturnToMerchant = () => {
    if (onExitToMerchant) {
      onExitToMerchant();
    } else {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <SuperAdminGuard onRedirect={handleReturnToMerchant} currentUser={currentUser}>
      <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col font-sans select-none">
        {/* Control Plane Global Header */}
        <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <NanasoreLogo variant="compact" size="sm" theme="dark" />
              <div className="h-5 w-[1px] bg-slate-800" />
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                <Crown className="w-3 h-3 text-amber-400" />
                Control Plane
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 border border-slate-800/60 p-1 rounded-xl">
              <button
                onClick={() => navigateToTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vue d'Ensemble
              </button>
              <button
                onClick={() => navigateToTab('tenants')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentTab === 'tenants'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Marchands & Boutiques
              </button>
              <button
                onClick={() => navigateToTab('kyc')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentTab === 'kyc'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Validations KYC</span>
              </button>
              <button
                onClick={() => navigateToTab('pricing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentTab === 'pricing'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Abonnements & Tarifs
              </button>
              <button
                onClick={() => navigateToTab('system-health')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentTab === 'system-health'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Santé Système
              </button>
              <button
                onClick={() => navigateToTab('hub-builder')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentTab === 'hub-builder'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hub Builder
              </button>
              <button
                onClick={() => navigateToTab('saas-admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border ${
                  currentTab === 'saas-admin'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Grand Dashboard (12 Modules)</span>
              </button>
              <a
                href="/dashboard/marketing/emailing"
                className="px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600 hover:text-white"
                title="Accéder au Moteur de Campagnes E-mailing & Quotas Pro"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Campagnes E-mailing</span>
              </a>
            </nav>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReturnToMerchant}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Espace Marchand</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-bold">
          <button
            onClick={() => navigateToTab('dashboard')}
            className={`px-3 py-1 rounded-lg shrink-0 ${currentTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Vue d'Ensemble
          </button>
          <button
            onClick={() => navigateToTab('tenants')}
            className={`px-3 py-1 rounded-lg shrink-0 ${currentTab === 'tenants' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Marchands
          </button>
          <button
            onClick={() => navigateToTab('kyc')}
            className={`px-3 py-1 rounded-lg shrink-0 flex items-center gap-1 ${currentTab === 'kyc' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Validations KYC</span>
          </button>
          <button
            onClick={() => navigateToTab('pricing')}
            className={`px-3 py-1 rounded-lg shrink-0 ${currentTab === 'pricing' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Tarifs
          </button>
          <button
            onClick={() => navigateToTab('system-health')}
            className={`px-3 py-1 rounded-lg shrink-0 ${currentTab === 'system-health' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Santé
          </button>
          <button
            onClick={() => navigateToTab('hub-builder')}
            className={`px-3 py-1 rounded-lg shrink-0 ${currentTab === 'hub-builder' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Hub Builder
          </button>
          <button
            onClick={() => navigateToTab('saas-admin')}
            className={`px-3 py-1 rounded-lg shrink-0 font-bold ${currentTab === 'saas-admin' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}
          >
            Grand Dashboard (12 Modules)
          </button>
        </div>

        {/* Content View */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          {currentTab === 'dashboard' && <AdminDashboardView onNavigateTab={navigateToTab} />}
          {currentTab === 'tenants' && <TenantsManagementView />}
          {currentTab === 'kyc' && <KycValidationControlPlaneView />}
          {currentTab === 'pricing' && <PricingConfigView />}
          {currentTab === 'system-health' && <SystemHealthView />}
          {currentTab === 'hub-builder' && (
            <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement Hub Builder...</div>}>
              <HubBuilderPage />
            </React.Suspense>
          )}
          {currentTab === 'saas-admin' && (
            <ModuleErrorBoundary moduleName="Grand Dashboard Super Admin">
              <React.Suspense fallback={<div className="p-12 text-center text-slate-400 animate-pulse">Chargement du Grand Tableau de Bord Fondateur (12 Modules)...</div>}>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-2xl">
                  <SaasAdminDashboard onBackToPOS={() => navigateToTab('dashboard')} currentUser={currentUser} />
                </div>
              </React.Suspense>
            </ModuleErrorBoundary>
          )}
        </main>
      </div>
    </SuperAdminGuard>
  );
};

export default ControlPlaneRouter;
