/**
 * HÔTE MODULAIRE D'APPLICATION INDÉPENDANTE (PWA Standalone Host)
 * Isole chaque application sous la route /dashboard/apps/:appId
 * Prêt pour export futur en paquets PWA / APK individuels installables.
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Sparkles, 
  Pin, 
  PinOff, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { APPS_REGISTRY, AppRegistryItem } from '../../data/appsRegistry';
import { 
  isAppPinnedToSidebar, 
  togglePinApp, 
  isAppActivated, 
  activateApp 
} from '../../services/appActivationService';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

// Lazy imports isolés des modules principaux
const NanaGeneratorModal = lazyWithRetry(() => import('../NanaGeneratorModal').then(m => ({ default: m.NanaGeneratorModal })));
const StoreStudioPage = lazyWithRetry(() => import('../../pages/StoreStudioPage'));
const CustomerOrdersView = lazy(() => import('../CustomerOrdersView').then(m => ({ default: m.CustomerOrdersView })));
const InventoryView = lazy(() => import('../InventoryView').then(m => ({ default: m.InventoryView })));
const ReportsView = lazy(() => import('../ReportsView').then(m => ({ default: m.ReportsView })));
const AiAdvisorView = lazy(() => import('../AiAdvisorView').then(m => ({ default: m.AiAdvisorView })));
const AffiliateDashboardModal = lazy(() => import('../AffiliateDashboardModal').then(m => ({ default: m.AffiliateDashboardModal })));
const MarketDirectory = lazy(() => import('../directory/MarketDirectory'));
const DocuSignHub = lazy(() => import('../DocuSignHub').then(m => ({ default: m.DocuSignHub })));
const SettingsExtensionsView = lazy(() => import('../SettingsExtensionsView').then(m => ({ default: m.SettingsExtensionsView })));
const NanaSwitchApp = lazy(() => import('../nanaSwitch/NanaSwitchApp').then(m => ({ default: m.NanaSwitchApp || m.default })));

export interface StandaloneAppHostProps {
  appId: string;
  onNavigate: (view: string) => void;
  currentUser?: any;
  subscription?: any;
  sales?: any[];
  inventory?: any[];
  customers?: any[];
  customerOrders?: any[];
}

export const StandaloneAppHost: React.FC<StandaloneAppHostProps> = ({
  appId,
  onNavigate,
  currentUser,
  subscription,
  sales = [],
  inventory = [],
  customers = [],
  customerOrders = []
}) => {
  const [app, setApp] = useState<AppRegistryItem | null>(null);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  // Résolution de l'application
  useEffect(() => {
    const cleanId = appId.toLowerCase().trim();
    const matched = APPS_REGISTRY.find(
      (a) => a.id === cleanId || a.id.replace('-', '') === cleanId.replace('-', '')
    ) || APPS_REGISTRY[0];

    setApp(matched);
    setIsPinned(isAppPinnedToSidebar(matched.id));

    // Si l'application n'est pas encore enregistrée comme active, l'activer automatiquement
    if (!isAppActivated(matched.id)) {
      activateApp(matched.id, matched.trialType);
    }

    // Mise à jour du titre de document PWA
    if (typeof document !== 'undefined') {
      document.title = `${matched.appName} — Nanasore Apps`;
    }
  }, [appId]);

  // Capture de l'événement PWA 'beforeinstallprompt'
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Bascule Épinglé / Désépinglé
  const handleTogglePin = async () => {
    if (!app) return;
    playTapBeep();
    const newStatus = await togglePinApp(app.id);
    setIsPinned(newStatus);
  };

  // Déclencheur d'installation PWA indépendante
  const handleInstallPwa = async () => {
    if (!deferredInstallPrompt) {
      alert(`Pour installer "${app?.appName}" sur votre écran d'accueil :\n- Sur Chrome/Android : Menu ⋮ puis "Ajouter à l'écran d'accueil"\n- Sur Safari/iOS : Bouton Partager ⎋ puis "Sur l'écran d'accueil"`);
      return;
    }
    playValidationBeep();
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredInstallPrompt(null);
    }
  };

  // Plein écran PWA Zen
  const handleToggleFullscreen = () => {
    playTapBeep();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!app) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#071329] text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-screen bg-[#071329] text-white flex flex-col overflow-hidden font-sans">
      
      {/* =========================================================================
          1. HEADER ISOLÉ PWA (Contrôles Standalone, Retour, Pin, Installation)
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#091A3A]/95 backdrop-blur-md border-b-2 border-blue-600/30 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        {/* Gauche : Retour Tableau de bord + Identité de la Mini-App */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onNavigate('NANA_SWITCH_APP');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/dashboard');
              }
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Retour au Tableau de Bord Central"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-bold">Tableau de Bord</span>
          </button>

          <div className="h-5 w-px bg-slate-700 shrink-0 hidden sm:block" />

          {/* Logo + Nom de l'App */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/80 p-1 flex items-center justify-center shadow-xs overflow-hidden">
              {app.appLogo ? (
                <img src={app.appLogo} alt={app.appName} className="w-full h-full object-contain" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-sm font-black text-white truncate tracking-tight">
                  {app.appName}
                </h1>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hidden xs:inline">
                  {app.category}
                </span>
              </div>
              <p className="text-[10px] text-emerald-400 font-medium truncate hidden md:block">
                ● Module Autonome PWA • Données synchronisées
              </p>
            </div>
          </div>
        </div>

        {/* Droite : Boutons d'Action (Épingler, Installer PWA, Zen Plein Écran) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Bouton Épingler à la Sidebar */}
          <button
            type="button"
            onClick={handleTogglePin}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
              isPinned
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 hover:bg-blue-600/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:bg-slate-700 hover:text-white'
            }`}
            title={isPinned ? "Désépingler de la barre latérale" : "Épingler à la barre latérale"}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5 text-blue-400" /> : <Pin className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isPinned ? 'Épinglée' : 'Épingler'}</span>
          </button>

          {/* Bouton Installer PWA sur Appareil */}
          <button
            type="button"
            onClick={handleInstallPwa}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95"
            title="Installer cette application sur votre bureau ou téléphone (PWA indépendante)"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden xs:inline">Installer l'App</span>
          </button>

          {/* Plein Écran Zen */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition cursor-pointer"
            title={isFullscreen ? "Quitter le plein écran" : "Mode Zen Plein Écran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. ZONE DE RENDU ISOLÉE DE L'APPLICATION
         ========================================================================= */}
      <main className="flex-1 overflow-y-auto relative w-full h-full bg-[#0B1E48]">
        <Suspense fallback={
          <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold">Chargement du module {app.appName}...</span>
          </div>
        }>
          {(() => {
            const id = app.id.toLowerCase();
            
            // Nanagénérateur & Studio IA
            if (id === 'nanagenerator' || id === 'studio-ia') {
              return (
                <div className="p-3 sm:p-6 max-w-7xl mx-auto h-full">
                  <NanaGeneratorModal
                    isOpen={true}
                    onClose={() => onNavigate('NANA_SWITCH_APP')}
                    isModal={false}
                  />
                </div>
              );
            }

            // Commandes & Devis
            if (id === 'orders-quotes') {
              return (
                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                  <CustomerOrdersView
                    orders={customerOrders}
                    onClose={() => onNavigate('NANA_SWITCH_APP')}
                  />
                </div>
              );
            }

            // Inventaire & Stock
            if (id === 'inventory-stock' || id === 'excel-importer') {
              return (
                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                  <InventoryView
                    inventory={inventory}
                    onClose={() => onNavigate('NANA_SWITCH_APP')}
                  />
                </div>
              );
            }

            // Analytique & Rapports
            if (id === 'reports-analytics') {
              return (
                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                  <ReportsView
                    sales={sales}
                    inventory={inventory}
                    onClose={() => onNavigate('NANA_SWITCH_APP')}
                  />
                </div>
              );
            }

            // Gemini & Agent IA
            if (id === 'ai-gemini') {
              return (
                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                  <AiAdvisorView
                    inventory={inventory}
                    sales={sales}
                    onClose={() => onNavigate('NANA_SWITCH_APP')}
                  />
                </div>
              );
            }

            // Espace Partenaire
            if (id === 'partners-affiliate') {
              return (
                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                  <AffiliateDashboardModal
                    isOpen={true}
                    onClose={() => onNavigate('NANA_SWITCH_APP')}
                  />
                </div>
              );
            }

            // NaNa Market (Annuaire B2B2C)
            if (id === 'nana-market') {
              return (
                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                  <MarketDirectory
                    onSelectBoutique={(storeId) => {
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', `/boutique/${storeId}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                    }}
                    onClose={() => onNavigate('NANA_SWITCH_APP')}
                  />
                </div>
              );
            }

            // DocuSign & Signatures
            if (id === 'docusign-hub') {
              return (
                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                  <DocuSignHub
                    isOpen={true}
                    onClose={() => onNavigate('NANA_SWITCH_APP')}
                  />
                </div>
              );
            }

            // Connecteurs & Passerelles
            if (id === 'connectors-webhooks') {
              return (
                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                  <SettingsExtensionsView
                    currentUser={currentUser}
                    onClose={() => onNavigate('NANA_SWITCH_APP')}
                  />
                </div>
              );
            }

            // NaNaSwitch Partenaires B2B App
            if (id === 'nana-switch-app' || id === 'nanaswitch' || id === 'nanaswitch-app') {
              return (
                <div className="w-full">
                  <NanaSwitchApp
                    slug={id}
                    embedded={true}
                    onBack={() => onNavigate('NANA_SWITCH_APP')}
                  />
                </div>
              );
            }

            // Si application standard avec route ou cible définie
            if (app.targetView) {
              return (
                <div className="p-6 text-center text-slate-300 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">{app.appName}</h2>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    {app.shortDescription}
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate(app.targetView!)}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-900/50 cursor-pointer"
                  >
                    Ouvrir dans l'interface complète →
                  </button>
                </div>
              );
            }

            return null;
          })()}
        </Suspense>
      </main>

    </div>
  );
};
