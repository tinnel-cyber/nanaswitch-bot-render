import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Zap, 
  LayoutDashboard, 
  Key, 
  Globe, 
  Puzzle, 
  ShieldCheck, 
  Terminal, 
  CreditCard, 
  ExternalLink, 
  Menu, 
  X, 
  Plus, 
  Sparkles, 
  Activity, 
  CheckCircle2, 
  Wifi, 
  RefreshCw, 
  ArrowRight,
  Sliders,
  Database,
  Lock,
  Layers,
  ChevronRight,
  Server,
  Smartphone,
  Building2,
  LogOut,
  Unlock,
  KeyRound
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { useSwitchAccount } from './NaNaSwitchAuthGuard';
import { db } from '../../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { supabase } from '@/lib/supabase';
import { isPinSessionUnlocked, lockPinSession, grantPinSession } from '../../../utils/nanaSwitchPinCrypto';
import { NaNaSwitchPinModal } from './NaNaSwitchPinModal';
import { NaNaSwitchLogo } from './NaNaSwitchLogo';

export type NaNaSwitchPageKey = 
  | 'landing' 
  | 'overview' 
  | 'connectors' 
  | 'routing' 
  | 'extension' 
  | 'security' 
  | 'logs' 
  | 'billing'
  | 'pocket'
  | 'auth';

export interface NaNaSwitchNavItem {
  id: NaNaSwitchPageKey;
  label: string;
  path: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

export const NANASWITCH_NAV_ITEMS: NaNaSwitchNavItem[] = [
  {
    id: 'landing',
    label: 'Présentation Cloud',
    path: '/nana-switch',
    icon: Sparkles
  },
  {
    id: 'overview',
    label: 'Cockpit & Télémétrie',
    path: '/nana-switch/overview',
    icon: LayoutDashboard,
    badge: 'LIVE',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    id: 'connectors',
    label: 'Coffre Connecteurs API',
    path: '/nana-switch/connectors',
    icon: Key,
    badge: 'BYOK',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  {
    id: 'routing',
    label: 'Règles & Routage Pays',
    path: '/nana-switch/routing',
    icon: Globe,
    badge: '15+ Pays',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300'
  },
  {
    id: 'extension',
    label: 'Extension Isolée & SDK',
    path: '/nana-switch/extension',
    icon: Puzzle
  },
  {
    id: 'pocket',
    label: 'NaNaSwitch Cloud Mobile',
    path: '/nana-switch/app',
    icon: Smartphone,
    badge: 'iOS & Android',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    id: 'security',
    label: 'Clés Cloud & IP Fixe',
    path: '/nana-switch/security',
    icon: ShieldCheck
  },
  {
    id: 'logs',
    label: 'Sandbox & Logs Directs',
    path: '/nana-switch/logs',
    icon: Terminal
  },
  {
    id: 'billing',
    label: 'Crédits & Facturation',
    path: '/nana-switch/billing',
    icon: CreditCard
  }
];

export interface NaNaSwitchLayoutProps {
  activePage: NaNaSwitchPageKey;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const NaNaSwitchLayout: React.FC<NaNaSwitchLayoutProps> = ({
  activePage,
  onNavigate,
  children
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const { switchAccount, signOutSwitch } = useSwitchAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  // Basculeur d'Environnement Global : Sandbox (Test) ↔ Production (Live)
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nanaswitch_cloud_env');
      if (stored === 'sandbox' || stored === 'production') return stored;
    }
    return 'production';
  });

  // Solde de crédits Cloud
  const [creditsBalance, setCreditsBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nanaswitch_cloud_credits');
      if (stored) return parseInt(stored, 10) || 100;
    }
    return 100;
  });

  // Synchronisation temps réel du portefeuille via Supabase Realtime
  useEffect(() => {
    if (!switchAccount?.uid) return;
    try {
      const channelName = `switch_wallet_${switchAccount.uid}_${Math.random().toString(36).substring(7)}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${switchAccount.uid}`,
          },
          (payload) => {
            if (payload.new) {
              const data = payload.new as any;
              if (typeof data.credits === 'number') {
                setCreditsBalance(data.credits);
                localStorage.setItem('nanaswitch_cloud_credits', String(data.credits));
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('[NANA_SWITCH_LAYOUT] Sync wallet error :', e);
    }
  }, [switchAccount?.uid]);

  // Latence dynamique simulée
  const [nodeLatency, setNodeLatency] = useState<number>(34);

  useEffect(() => {
    const interval = setInterval(() => {
      setNodeLatency(prev => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const next = Math.max(26, Math.min(42, prev + delta));
        return next;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleEnvironment = useCallback(() => {
    playValidationBeep();
    setEnvironment(prev => {
      const next = prev === 'production' ? 'sandbox' : 'production';
      if (typeof window !== 'undefined') {
        localStorage.setItem('nanaswitch_cloud_env', next);
      }
      return next;
    });
  }, []);

  const handleNavClick = useCallback((item: NaNaSwitchNavItem) => {
    playTapBeep();
    setMobileMenuOpen(false);
    onNavigate(item.path);
  }, [onNavigate]);

  // État de verrouillage PIN de la console
  const [isSessionUnlocked, setIsSessionUnlocked] = useState<boolean>(() => isPinSessionUnlocked());
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinModalMode, setPinModalMode] = useState<'verify' | 'setup'>('verify');

  // Synchronisation de l'état de session déverrouillée
  useEffect(() => {
    const checkState = () => {
      setIsSessionUnlocked(isPinSessionUnlocked());
    };
    window.addEventListener('focus', checkState);
    const interval = setInterval(checkState, 3000);
    return () => {
      window.removeEventListener('focus', checkState);
      clearInterval(interval);
    };
  }, []);

  const handleTogglePinLock = useCallback(() => {
    playTapBeep();
    if (isPinSessionUnlocked()) {
      lockPinSession();
      setIsSessionUnlocked(false);
    } else {
      if (switchAccount?.pinHash) {
        setPinModalMode('verify');
        setShowPinModal(true);
      } else {
        setPinModalMode('setup');
        setShowPinModal(true);
      }
    }
  }, [switchAccount?.pinHash]);

  const handlePinSuccess = useCallback(async (newHash?: string) => {
    setIsSessionUnlocked(true);
    setShowPinModal(false);
    if (newHash && switchAccount?.uid) {
      try {
        await setDoc(doc(db, 'switch_accounts', switchAccount.uid), {
          pinHash: newHash,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error('[NANA_SWITCH_LAYOUT] Error updating pinHash:', err);
      }
    }
  }, [switchAccount?.uid]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* ========================================================================= */}
      {/* BARRE SUPÉRIEURE (TOPBAR) NANASWITCH CLOUD */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100 h-16 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
        
        {/* Gauche : Logo & Bouton Mobile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div 
            onClick={() => onNavigate('/nana-switch')}
            className="flex items-center cursor-pointer select-none shrink-0"
          >
            {/* En-tête Téléphone (< sm) : Version ultra-compacte "mobile-header" sans déborder */}
            <div className="sm:hidden">
              <NaNaSwitchLogo variant="mobile-header" theme="light" />
            </div>
            {/* En-tête Ordinateur (>= sm) : Version complète "full" */}
            <div className="hidden sm:block">
              <NaNaSwitchLogo variant="full" size="md" theme="light" />
            </div>
          </div>
        </div>

        {/* Centre / Droite : Statut Nœud Cloud, Basculeur d'Environnement & Crédits */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          
          {/* Statut du Nœud Cloud en direct */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>NaNaSwitch Cloud Node :</span>
            <span className="text-emerald-700 font-black">Opérationnel</span>
            <span className="text-slate-400 font-mono text-[11px]">({nodeLatency}ms)</span>
          </div>

          {/* Basculeur d'Environnement Global : Sandbox (Test) ↔ Production (Live) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={handleToggleEnvironment}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                environment === 'production'
                  ? 'bg-blue-600 text-white shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🚀 Live</span>
            </button>
            <button
              type="button"
              onClick={handleToggleEnvironment}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                environment === 'sandbox'
                  ? 'bg-amber-500 text-white shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🧪 Sandbox</span>
            </button>
          </div>

          {/* Solde de Crédits Cloud & Bouton Recharger */}
          <div className="flex items-center gap-1.5 pl-1 sm:pl-2">
            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-black text-blue-900 flex items-center gap-1.5 shadow-2xs">
              <span className="text-sm">🪙</span>
              <span>{creditsBalance.toLocaleString('fr-FR')}</span>
              <span className="text-[10px] text-blue-600 font-medium hidden sm:inline">crédits</span>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onNavigate('/nana-switch/billing');
              }}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition cursor-pointer shadow-sm flex items-center gap-1 active:scale-95"
              title="Recharger des crédits"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Recharger</span>
            </button>
          </div>

          {/* Bouton de Commutation Inter-Applications : Vers le Dashboard Marchand Agrégé */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-200">
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                try {
                  window.history.pushState({}, '', '/app/nanaswitch');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                } catch {
                  window.location.href = '/app/nanaswitch';
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-700 to-[#1E40AF] hover:from-blue-800 hover:to-[#1E3A8A] text-white shadow-sm border border-blue-500/30 transition cursor-pointer active:scale-95"
              title="Basculer vers le Dashboard Marchand Agrégé (Multi-comptes, 14+ modules & KYC)"
            >
              <Layers className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span className="hidden md:inline font-extrabold">Dashboard Marchand</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-200" />
            </button>
          </div>

          {/* Verrouillage Rapide par Code PIN de Sécurité */}
          <div className="flex items-center gap-1.5 pl-1 sm:pl-2">
            {!switchAccount?.pinHash ? (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setPinModalMode('setup');
                  setShowPinModal(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs animate-pulse"
                title="Définir votre Code PIN de Sécurité (4 chiffres)"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline font-extrabold">Créer mon PIN</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTogglePinLock}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isSessionUnlocked
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
                    : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                }`}
                title={isSessionUnlocked ? "Session sécurisée active (10 min) — Cliquer pour verrouiller" : "Session verrouillée — Cliquer pour déverrouiller"}
              >
                {isSessionUnlocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden md:inline font-black">Déverrouillé</span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">|</span>
                    <span className="text-[11px] font-bold text-slate-500 hover:text-rose-600">Verrouiller</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-black">Verrouillé</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </header>

      {/* ========================================================================= */}
      {/* CORPS PRINCIPAL : SIDEBAR GAUCHE + CONTENU DE LA PAGE */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* ========================================================================= */}
        {/* SIDEBAR GAUCHE (W-64) BLANC PUR & BLEU ROYAL */}
        {/* ========================================================================= */}
        <aside 
          className={`
            fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-blue-100 flex flex-col justify-between transition-transform duration-200 ease-in-out
            ${mobileMenuOpen ? 'translate-x-0 top-16 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Navigation supérieure */}
          <div className="p-4 space-y-5 overflow-y-auto">
            
            {/* En-tête Logo Complet NaNaSwitch Cloud dans la Sidebar PC/Tiroir */}
            <div
              onClick={() => onNavigate('/nana-switch')}
              className="px-2 pt-1 pb-2 border-b border-blue-100 cursor-pointer"
            >
              <NaNaSwitchLogo variant="full" size="sm" theme="light" />
            </div>

            {/* Identité de l'Organisation Cloud Isolée */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200 space-y-2">
              <div className="flex items-center gap-2.5">
                <NaNaSwitchLogo variant="mark" size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-900 truncate" title={switchAccount?.organizationName}>
                    {switchAccount?.organizationName || 'Organisation Cloud'}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-blue-700">
                    {switchAccount?.switchTenantId || 'sw_cloud'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-blue-200/60 text-[10px]">
                <span className="font-bold text-slate-500">Profil Cloud :</span>
                <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                  {switchAccount?.profileType === 'developer'
                    ? '👨‍💻 Développeur'
                    : switchAccount?.profileType === 'agency'
                    ? '🏦 Agence'
                    : '🏢 Entreprise'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Menu NaNaSwitch Cloud
              </div>

              <nav className="space-y-1">
                {NANASWITCH_NAV_ITEMS.map((item) => {
                  const isActive = activePage === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-black' 
                          : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/70'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Encadré d'Aide & IP Fixe Cloud */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-black text-blue-900 text-[11px] uppercase tracking-wide">
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>Nœud Cloud Actif</span>
              </div>
              <div className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-blue-100 flex items-center justify-between">
                <span>IP Sortante :</span>
                <strong className="text-blue-600">194.163.148.22</strong>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Whiteliste automatique certifiée pour tous vos agrégateurs partenaires.
              </p>
            </div>

          </div>

          {/* Pied de la Sidebar : Identité & Déconnexion Cloud Indépendante */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-700 font-bold">
                <span className="truncate">{switchAccount?.contactName || 'Responsable Cloud'}</span>
                <span className="text-[10px] text-emerald-600 font-black">99.98% SLA</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {switchAccount?.email || 'session-cloud'}
              </div>
            </div>

            {/* Bouton Déconnexion Cloud Dédié (ramène vers /nana-switch/auth) */}
            <button
              type="button"
              onClick={signOutSwitch}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-700 text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
              title="Se déconnecter de NaNaSwitch Cloud"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Déconnexion Cloud</span>
            </button>
          </div>
        </aside>

        {/* Overlay pour mobile */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-20 lg:hidden"
          />
        )}

        {/* ========================================================================= */}
        {/* CONTENU PRINCIPAL DE LA PAGE */}
        {/* ========================================================================= */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

      </div>

      {/* Modale de Saisie / Configuration du Code PIN de Sécurité */}
      <NaNaSwitchPinModal
        isOpen={showPinModal}
        mode={pinModalMode}
        storedPinHash={switchAccount?.pinHash}
        title={pinModalMode === 'setup' ? 'Définir votre Code PIN de Sécurité' : 'Déverrouillage Console Cloud'}
        description={
          pinModalMode === 'setup'
            ? 'Définissez un code confidentiel à 4 chiffres (haché SHA-256) pour sécuriser vos clés de production et vos connecteurs.'
            : 'Entrez votre code secret à 4 chiffres pour accéder aux opérations sensibles de la console.'
        }
        onSuccess={handlePinSuccess}
        onClose={() => setShowPinModal(false)}
      />

    </div>
  );
};

export default NaNaSwitchLayout;
