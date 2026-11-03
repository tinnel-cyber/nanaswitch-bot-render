import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Eye,
  Rocket, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  Check, 
  CheckCircle2, 
  ShieldCheck, 
  Store, 
  ShoppingBag, 
  CreditCard, 
  Truck, 
  GraduationCap, 
  BookOpen, 
  Award, 
  Globe, 
  Radio, 
  Video, 
  Bot, 
  Zap, 
  TrendingUp, 
  BarChart3, 
  Lock, 
  X, 
  Menu,
  Star, 
  Users, 
  Play, 
  Layers, 
  Flame,
  BadgeCheck,
  Percent,
  Cpu,
  Monitor,
  MonitorPlay,
  ArrowUpRight,
  Filter,
  GitFork,
  FileCheck,
  Plug,
  Building2,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  Send
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import { 
  LandingPageConfig, 
  DEFAULT_LANDING_PAGE_CONFIG, 
  LandingFeaturesSection, 
  LandingFeatureCard,
  LandingEliteSection, 
  LandingPricingSection, 
  LandingFooterConfig,
  PlatformLegalConfig
} from '../../types';
import { subscribeToLandingPageConfig, subscribeToPlatformSubscriptions, subscribeToPlatformLegal, DEFAULT_PLATFORM_LEGAL } from '../../utils/firestoreService';
import { Logo } from '../../components/common/Logo';
import { SubscriptionPaywallModal } from '../modals/SubscriptionPaywallModal';
import { PricingComparisonMatrix } from '../modals/pricing/PricingComparisonMatrix';
import { LegalDocModal } from '../../components/LegalDocModal';
import { OrbitalConstellationNetwork } from './OrbitalConstellationNetwork';
import { HeroAbstractFloatingBackground } from './HeroAbstractFloatingBackground';

// Mappeur d'icônes dynamiques pour les cartes de fonctionnalités du CMS
const getFeatureCardIcon = (iconName?: string) => {
  switch (iconName) {
    case 'Filter': return Filter;
    case 'GitFork': return GitFork;
    case 'Radio': return Radio;
    case 'ShieldCheck': return ShieldCheck;
    case 'Plug': return Plug;
    case 'Rocket': return Rocket;
    case 'Zap': return Zap;
    case 'Sparkles': return Sparkles;
    case 'Bot': return Bot;
    case 'Layers': return Layers;
    case 'Store': return Store;
    case 'ShoppingBag': return ShoppingBag;
    case 'CreditCard': return CreditCard;
    case 'GraduationCap': return GraduationCap;
    case 'Award': return Award;
    case 'Globe': return Globe;
    case 'Cpu': return Cpu;
    default: return Zap;
  }
};

// =============================================================================
// PROPS DE LA LANDING PAGE
// =============================================================================
export interface NaNaLandingPageProps {
  onExplore?: () => void;
  onOpenPinPad?: () => void;
  onOpenEmailAuth?: () => void;
  onOpenInstructor?: () => void;
  onOpenSecretAdmin?: () => void;
  onCheckout?: (planId: string, price: number, isAnnual?: boolean) => void;
  onOpenPartnerProgram?: () => void;
}

// =============================================================================
// 1. MODALE D'AIGUILLAGE "DÉMARRER" (COMMERÇANT VS FORMATEUR)
// =============================================================================
interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMerchant: () => void;
  onSelectInstructor: () => void;
}

const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSelectMerchant,
  onSelectInstructor
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-600/20 text-slate-900 dark:text-slate-100 overflow-hidden transform scale-100 transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Halos d'ambiance */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={() => { playTapBeep(); onClose(); }}
          className="absolute top-5 right-5 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* En-tête */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Rocket className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Aiguilleur d'Espaces Nanasore
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
              Choisissez votre univers
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
          Sélectionnez votre modèle d'affaires pour accéder à votre environnement de travail dédié.
        </p>

        {/* 2 Grandes Cartes Interactives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A : Je veux vendre des produits (E-commerce, Physique) */}
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onClose();
              onSelectMerchant();
            }}
            className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 border-2 border-slate-200/80 dark:border-slate-750 hover:border-blue-600 dark:hover:border-blue-500 transition-all duration-300 transform active:scale-98 text-left cursor-pointer shadow-sm hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <Store className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Option A • E-Commerce
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Je veux vendre des produits (E-commerce, Physique)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Gérez votre boutique, encaissez par Mobile Money / Cash et boostez vos ventes en direct par Live Shopping.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Caisse POS & Reçus Thermiques</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Jusqu'à 3 produits physiques inclus (0F)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Paiements flexibles & 0% de commission</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-black text-blue-600 dark:text-blue-400">
              <span>Commencer avec les produits (0F)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </button>

          {/* Option B : Je veux vendre mon expertise (Formations) */}
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onClose();
              onSelectInstructor();
            }}
            className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border-2 border-slate-200/80 dark:border-slate-750 hover:border-indigo-600 dark:hover:border-indigo-500 transition-all duration-300 transform active:scale-98 text-left cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-500/10"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Option B • Formations
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Je veux vendre mon expertise (Formations)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Créez votre campus en marque blanche stricte, hébergez vos cours vidéo et certifiez vos étudiants.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  <span>Campus Marque Blanche sous votre domaine</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span>1 cours vidéo inclus (0F)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Retraits instantanés & 0% de commission</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-black text-indigo-600 dark:text-indigo-400">
              <span>Commencer avec les formations (0F)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </button>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Architecture Multi-Tenant étanche et sécurisée
          </span>
          <span className="font-mono text-[10px]">Nanasore v2.4</span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// NAVBAR (STYLE VERCEL / LINEAR GLASSMORPHISM)
// =============================================================================
const LandingNavbar: React.FC<{
  onOpenModal: () => void;
  onOpenEmailAuth?: () => void;
  onOpenPartnerProgram?: () => void;
  onOpenSecretAdmin?: () => void;
}> = ({ onOpenModal, onOpenEmailAuth, onOpenPartnerProgram, onOpenSecretAdmin }) => {
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const lastLogoTapRef = useRef<number>(0);
  const logoTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = () => {
    const now = Date.now();
    const isWithinWindow = now - lastLogoTapRef.current <= 1500;
    lastLogoTapRef.current = now;

    if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);

    setLogoTapCount((prev) => {
      const next = isWithinWindow ? prev + 1 : 1;
      if (next >= 5) {
        playTapBeep();
        if (onOpenSecretAdmin) {
          onOpenSecretAdmin();
        }
        return 0;
      }
      logoTapTimerRef.current = setTimeout(() => setLogoTapCount(0), 1500);
      return next;
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 dark:bg-[#031834]/95 backdrop-blur-md border-b border-slate-800 dark:border-sky-500/20 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Logo & Badge */}
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={handleLogoTap} 
            className="flex items-center gap-3 focus:outline-none text-left cursor-pointer active:scale-95 transition-transform group"
          >
            <Logo size="lg" darkBackground={true} />
            <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/30 shadow-xs">
              SaaS Multi-Tenant
            </span>
          </button>
        </div>

        {/* Liens de navigation ancrés */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10 text-sm font-semibold text-slate-200">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/market');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 font-bold text-sm cursor-pointer"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Les Univers</span>
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-500/30">Market</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/student/dashboard');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1.5 font-bold text-sm cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <span>Apprenant</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/pos/connect');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="text-blue-300 hover:text-blue-200 transition-colors flex items-center gap-1.5 font-bold text-sm cursor-pointer"
          >
            <Monitor className="w-4 h-4 text-blue-400" />
            <span>Caissier</span>
          </button>
          <a href="#pricing" className="text-slate-200 hover:text-blue-400 transition-colors flex items-center gap-1 font-semibold">
            <span>Tarifs</span>
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-500/30">0% Com.</span>
          </a>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (onOpenPartnerProgram) {
                onOpenPartnerProgram();
              } else if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/partenaire');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="text-slate-200 hover:text-blue-400 transition-colors flex items-center gap-1 font-semibold text-sm cursor-pointer"
          >
            <span>Partenaire</span>
          </button>
        </nav>

        {/* Actions rapides façon PayDunya : Boutons Pilules */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {onOpenEmailAuth && (
            <button
              type="button"
              onClick={() => { 
                playTapBeep(); 
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/login');
                }
                onOpenEmailAuth(); 
              }}
              className="px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Se connecter</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => { playTapBeep(); onOpenModal(); }}
            className="hidden sm:flex px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all transform active:scale-95 cursor-pointer items-center gap-1.5 group shrink-0"
          >
            <Rocket className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
            <span>Créer un compte</span>
          </button>

          {/* Bouton Hamburger Menu Mobile */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-blue-400 transition cursor-pointer shrink-0"
            aria-label="Menu de navigation mobile"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Menu Déroulant Mobile Burger */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden border-t border-slate-800 bg-[#031834]/98 backdrop-blur-xl px-4 py-4 space-y-2.5 shadow-xl animate-in slide-in-from-top-2 duration-150 text-slate-200 max-h-[calc(100dvh-5rem)] overflow-y-auto pb-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {onOpenEmailAuth && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsMobileMenuOpen(false);
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/login');
                }
                onOpenEmailAuth();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-600/20 border border-blue-500/50 text-blue-300 font-bold text-left cursor-pointer transition active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-blue-400" />
                <span className="text-white font-extrabold">Se connecter</span>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                Connexion
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsMobileMenuOpen(false);
              onOpenModal();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-left cursor-pointer transition active:scale-98 shadow-md shadow-blue-600/30"
          >
            <div className="flex items-center gap-2.5">
              <Rocket className="w-4 h-4 text-amber-300" />
              <span>Créer un compte</span>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">
              0% Com.
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsMobileMenuOpen(false);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/market');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold text-left cursor-pointer transition active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Les Univers</span>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-500/20">
              Market
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsMobileMenuOpen(false);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/student/dashboard');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-950/60 border border-amber-500/30 text-amber-300 font-bold text-left cursor-pointer transition active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Apprenant</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsMobileMenuOpen(false);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/pos/connect');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-300 font-bold text-left cursor-pointer transition active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-blue-400" />
              <span>Caissier</span>
            </div>
          </button>

          <div className="flex flex-col space-y-1 text-sm font-semibold text-slate-200 pt-1">

            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-slate-800/60 text-slate-200 flex items-center justify-between transition"
            >
              <span>Tarifs</span>
              <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-500/30">0% Com.</span>
            </a>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsMobileMenuOpen(false);
                if (onOpenPartnerProgram) {
                  onOpenPartnerProgram();
                } else if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/partenaire');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="p-2.5 rounded-xl hover:bg-slate-800/60 text-slate-200 flex items-center justify-between text-left cursor-pointer transition"
            >
              <span>Partenaire</span>
              <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded-full border border-amber-500/30">20%</span>
            </button>

          </div>
        </div>
      )}
    </header>
  );
};

// =============================================================================
// =============================================================================
// SECTION 1 : HERO SECTION (TITRE ÉPURÉ & ACTION RAPIDE)
// =============================================================================
const HeroSection: React.FC<{
  onOpenModal: () => void;
  onExplore?: () => void;
}> = ({ onOpenModal }) => {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 border-b border-sky-500/20 text-white min-h-[560px] flex items-center justify-center">
      {/* 1 & 2 : Deep Ocean Animated Mesh Gradient & Abstract Floating UI (Silicon Valley Style) */}
      <HeroAbstractFloatingBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Grand Titre Majestueux Pur avec Dégradé Premium */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.14] mb-8 max-w-4xl mx-auto drop-shadow-sm">
          <span className="block bg-gradient-to-r from-white via-slate-100 to-blue-100 bg-clip-text text-transparent">
            Bâtissez votre empire.
          </span>
          <span className="block bg-gradient-to-r from-sky-300 via-blue-200 to-indigo-200 bg-clip-text text-transparent mt-1.5 sm:mt-2">
            Vendez vos produits ou votre savoir.
          </span>
        </h1>

        {/* Boutons d'Action Pilules (Style PayDunya) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mb-8">
          {/* Bouton Principal : Créer mon Business */}
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onOpenModal();
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/30 transition-all duration-200 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 group"
          >
            <Rocket className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
            <span>Créer mon Business</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Bouton Secondaire : Découvrir les Univers */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/market');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="w-full sm:w-auto px-7 py-4 rounded-full bg-white/10 hover:bg-white/20 border-2 border-white text-white font-bold text-sm sm:text-base backdrop-blur-sm transition-all duration-200 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 group"
          >
            <Globe className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
            <span>Découvrir les Univers</span>
          </button>
        </div>

        {/* Garanties et Preuves de Confiance */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm font-semibold text-white/90">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>0% de commission sur vos ventes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Multi-Tenant & Marque Blanche</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Déploiement en 60s</span>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// SECTION 2 : SECTION HYBRIDE (LES DEUX GRANDES CARTES BLANCHES)
// =============================================================================
const HybridSection: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  return (
    <section id="hybride" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto">

        {/* 2 GRANDES CARTES BLANCHES D'UNIVERS : E-COMMERCE VS FORMATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* CARTE 1 : E-COMMERCE & COMMERÇANTS (7/12) - EN BLANC PUR */}
          <div className="md:col-span-7 rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/90 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <Store className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Thème E-Commerce
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Le Commerce Hybride réinventé
              </h3>
              <p className="text-sm text-slate-600 mt-2 mb-6">
                Connectez votre caisse physique locale à une vitrine mondiale. Activez le Live Shopping 1-to-1 et encaissez par tous les moyens de paiement.
              </p>

              {/* Mockup visuel interne avec 3 mini cartes en fond blanc/slate-50 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
                
                {/* Feature A */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded">Direct</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Live Shopping 1-to-1</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Appel vidéo Daily.co pour montrer l'article et encaisser.</p>
                </div>

                {/* Feature B */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <Truck className="w-5 h-5 text-amber-500" />
                    <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Cash / Wave</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Paiements Flexibles</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Cash on Delivery, Wave, Orange Money et Cartes Visa.</p>
                </div>

                {/* Feature C */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                    <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Sync</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Gestion des Stocks</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Inventaire omnicanal, scan code-barres et alertes rupture.</p>
                </div>

              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Pour boutiques physiques & e-commerçants</span>
              <button
                type="button"
                onClick={() => { playTapBeep(); onOpenModal(); }}
                className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Découvrir la suite boutique</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARTE 2 : E-LEARNING & FORMATEURS (5/12) - EN BLANC PUR */}
          <div className="md:col-span-5 rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/90 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Thème E-Learning
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                L'Académie en Marque Blanche
              </h3>
              <p className="text-sm text-slate-600 mt-2 mb-6">
                Votre campus isolé, votre nom de domaine, vos vidéos protégées et vos certificats vérifiables par QR code.
              </p>

              <div className="space-y-3 my-6">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <Globe className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Campus Privé sous votre URL</span>
                    <span className="text-[11px] text-slate-500">ex: academie.votre-marque.com sans mention Nanasore.</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Tunnels de Vente Haute Conversion</span>
                    <span className="text-[11px] text-slate-500">Checkout 1-Clic, Order Bumps et Upsells intégrés.</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <Award className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Certificats Numériques d'Honneur</span>
                    <span className="text-[11px] text-slate-500">Délivrance automatisée dès complétion du cursus.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Pour formateurs, coachs & écoles</span>
              <button
                type="button"
                onClick={() => { playTapBeep(); onOpenModal(); }}
                className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Créer mon campus</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

// =============================================================================
// SECTION 3 : LE SIMULATEUR RÉSEAU (LA CONSTELLATION ORBITALE)
// =============================================================================
const ProductSimulatorBanner: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  return (
    <section id="simulateur" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto flex flex-col items-center justify-center">
      <div className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-r from-[#031d3d] via-[#09477e] to-[#031d3d] border border-sky-400/30 p-5 sm:p-10 md:p-14 text-center text-white shadow-2xl flex flex-col items-center justify-center">
        
        {/* Grille perspective high-tech en fond */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(56, 189, 248, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.4) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: 'perspective(400px) rotateX(45deg)',
            transformOrigin: 'bottom center'
          }}
        />

        {/* Halo lumineux central */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Le Réseau d'icônes : Constellation Orbitale parfaitement centrée */}
        <div className="relative z-10 w-full flex items-center justify-center my-4 sm:my-6">
          <OrbitalConstellationNetwork />
        </div>

        {/* Bouton Pilule : [ Configurer mon réseau >> ] */}
        <div className="relative z-10 w-full flex justify-center mt-6 sm:mt-8">
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onOpenModal();
            }}
            className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-full border-2 border-white text-white hover:bg-white hover:text-blue-900 font-bold text-xs sm:text-base transition-all duration-300 shadow-lg hover:shadow-white/20 transform active:scale-95 cursor-pointer flex items-center gap-1.5 group max-w-full"
          >
            <span>Configurer mon réseau</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 -ml-2.5 sm:-ml-3 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </section>
  );
};

// =============================================================================
// SECTION 3 : NEXT-GEN FEATURES (RUPTURE VISUELLE SOMBRE)
// =============================================================================
const NextGenDarkSection: React.FC<{
  onOpenModal: () => void;
  config?: LandingFeaturesSection;
}> = ({ onOpenModal, config }) => {
  const badgeText = config?.badgeText || "Technologie Propriétaire Nanasore v2.4";
  const title = config?.title || "L'Arsenal Technologique des Géants du Web.";
  const description = config?.description || "Profitez des innovations logicielles de pointe habituellement réservées aux leaders de la Silicon Valley, entièrement conçues pour vos marchés.";
  const ctaButtonText = config?.ctaButtonText || "Tester ces fonctionnalités en direct";
  const rawCards = config?.cards && config.cards.length > 0
    ? config.cards
    : DEFAULT_LANDING_PAGE_CONFIG.featuresSection.cards;

  // Migration et scission automatique si l'ancienne configuration à 5 cartes est détectée
  const featureCards = rawCards.some(c => c.id === 'integrations' || (c.isIntegrationsCard && rawCards.length === 5))
    ? rawCards.flatMap(c => {
        if (c.id === 'integrations' || (c.isIntegrationsCard && rawCards.length === 5)) {
          return [
            DEFAULT_LANDING_PAGE_CONFIG.featuresSection.cards[4],
            DEFAULT_LANDING_PAGE_CONFIG.featuresSection.cards[5]
          ];
        }
        return [c];
      })
    : rawCards;

  const renderFeatureCard = (card: LandingFeatureCard, keySuffix = '') => {
    const IconComponent = getFeatureCardIcon(card.iconName);
    return (
      <div
        key={`${card.id}${keySuffix}`}
        className="relative shrink-0 my-6 group flex flex-col self-stretch"
      >
        {/* Lumière bleuâtre scintillante très forte et débordante en arrière-plan */}
        <div className="absolute -inset-4 sm:-inset-6 bg-blue-500/40 rounded-[40px] blur-2xl opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none" />
        <div className="absolute -inset-2 sm:-inset-3 bg-sky-400/50 rounded-3xl blur-xl opacity-80 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />

        {/* Carte elle-même STRICTEMENT BLANCHE (bg-white) avec halo lumineux bleu et HAUTEUR 100% UNIFORME */}
        <div
          className="relative w-[340px] sm:w-[390px] h-full p-6 sm:p-7 rounded-3xl bg-white border-2 border-slate-200/90 hover:border-blue-500 shadow-[0_10px_35px_rgba(37,99,235,0.35),0_0_50px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_45px_rgba(37,99,235,0.55),0_0_70px_rgba(59,130,246,0.5)] transition-all duration-300 flex flex-col justify-between select-none hover:-translate-y-1 text-slate-900 overflow-hidden"
        >
          {/* Ligne d'accent en haut de carte */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600" />

          <div className="flex-1 flex flex-col justify-start">
            {/* En-tête de carte : Icône + Badge */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.iconGradient || 'from-blue-600 to-indigo-600 shadow-blue-500/25'} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-300 shrink-0`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${card.badgeStyle || 'text-blue-600 bg-blue-50 border-blue-200'} truncate max-w-[210px]`}>
                {card.badge}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-blue-600 transition-colors">
              {card.title}
            </h3>

            {card.isIntegrationsCard ? (
              <div className="space-y-2.5 my-2 flex-1 flex flex-col justify-start">
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mb-1 line-clamp-2">
                  {card.text}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {card.integrations?.map((item, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center gap-2 hover:bg-slate-100/70 transition-colors">
                      <span className={`w-2 h-2 rounded-full ${item.dot || 'bg-blue-500'} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 block truncate text-[11px]">{item.name}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {card.aiBadge && (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 border border-blue-100/90 flex items-center justify-between text-[11px] mt-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-bold text-slate-900 text-[11px] truncate">{card.aiBadge}</span>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-bold shrink-0 ml-1">Gemini • Claude • GPT</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-start">
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mb-3">
                  {card.text}
                </p>
                {card.highlights && card.highlights.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                    {card.highlights.map((hl, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90">
                        <span className="font-bold text-slate-900 block text-[11px]">{hl.label}</span>
                        <span className="text-[10px] text-slate-500 block">{hl.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Micro-panneau technique de bas de carte avec ancrage bas parfait */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1 mt-auto pt-3.5">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold">{card.footerStatus}</span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">{card.footerTag}</span>
            </div>
            <div className="text-slate-500 text-[10px] truncate">{card.footerSub}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="next-gen" className="relative py-28 bg-white text-slate-900 border-y border-slate-100 overflow-hidden w-full max-w-full">
      
      {/* Reflets subtils et halo pour faire rayonner la lumière bleue */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-72 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* En-tête Next-Gen centré */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm backdrop-blur-md">
          <Cpu className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>{badgeText}</span>
        </div>
        
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
          {title}
        </h2>
        
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-medium">
          {description}
        </p>
      </div>

      {/* Carrousel Défilant à l'Infini (Infinite Marquee) avec padding généreux pour le halo */}
      <div className="relative w-full max-w-full overflow-hidden py-10 sm:py-12">
        {/* Masques de fondu gauche et droite fondus dans le blanc */}
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-24 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-24 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

        <div className="flex w-max items-stretch animate-marquee-features hover:[animation-play-state:paused]">
          {/* Bloc 1 */}
          <div className="flex items-stretch gap-6 pr-6">
            {featureCards.map((card) => renderFeatureCard(card))}
          </div>

          {/* Bloc 2 (miroir pour boucle infinie sans saccade) */}
          <div className="flex items-stretch gap-6 pr-6" aria-hidden="true">
            {featureCards.map((card) => renderFeatureCard(card, '-clone'))}
          </div>
        </div>
      </div>

      {/* Call to action de bas de section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 text-center">
        <button
          type="button"
          onClick={() => { playValidationBeep(); onOpenModal(); }}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all cursor-pointer transform active:scale-95"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>{ctaButtonText}</span>
        </button>
      </div>

    </section>
  );
};

// =============================================================================


// =============================================================================
// SECTION 5 : LE PRICING (TRANSPARENCE ABSOLUE & 0% COMMISSION)
// =============================================================================
export interface PricingSectionProps {
  onOpenModal: () => void;
  onCheckout?: (planId: string, price: number, isAnnual: boolean) => void;
  config?: LandingPricingSection;
  onSelectFreePlan?: () => void;
  onOpenPartnerProgram?: () => void;
}

const PricingSection: React.FC<PricingSectionProps> = ({
  onOpenModal,
  onCheckout,
  config,
  onSelectFreePlan,
  onOpenPartnerProgram,
}) => {
  const [pricingTab, setPricingTab] = useState<'SUBSCRIPTION' | 'CREATOR' | 'PAY_AS_YOU_GO'>('SUBSCRIPTION');
  const [isAnnual, setIsAnnual] = useState(false);
  const title = config?.title || "Des tarifs simples, transparents et sans surprise.";
  const subtitle = config?.subtitle || "Choisissez le modèle adapté à votre activité : abonnement fixe 0% commission, formule créateur à la performance, ou services à l'acte sans engagement.";
  const zeroBanner = config?.zeroCommissionBanner || DEFAULT_LANDING_PAGE_CONFIG.pricingSection.zeroCommissionBanner;
  
  const rawPlans = config?.plans && config.plans.length > 0
    ? config.plans
    : DEFAULT_LANDING_PAGE_CONFIG.pricingSection.plans;

  // Garantir que le Plan Gratuit (Freemium) et les 4 plans sont toujours présents
  const plans = useMemo(() => {
    if (rawPlans.some(p => p.id === 'free')) {
      return rawPlans;
    }
    const defaultFreePlan = DEFAULT_LANDING_PAGE_CONFIG.pricingSection.plans.find(p => p.id === 'free');
    return defaultFreePlan ? [defaultFreePlan, ...rawPlans] : rawPlans;
  }, [rawPlans]);

  /**
   * Redirection spécifique Plan Gratuit vers /register (intent: 'vendor', plan: 'free')
   */
  const handleFreePlanClick = () => {
    playValidationBeep();
    if (typeof window !== 'undefined') {
      window.history.pushState({ intent: 'vendor', plan: 'free' }, '', '/register?intent=vendor&plan=free');
      window.location.href = '/register?intent=vendor&plan=free';
    }
    if (onSelectFreePlan) {
      onSelectFreePlan();
    } else if (onCheckout) {
      onCheckout('free', 0, false);
    }
  };

  /**
   * Redirection Formule Créateur / Formateur vers /register
   */
  const handleCreatorClick = () => {
    playValidationBeep();
    if (typeof window !== 'undefined') {
      window.history.pushState({ intent: 'instructor', plan: 'creator' }, '', '/register?intent=instructor&plan=creator');
      window.location.href = '/register?intent=instructor&plan=creator';
    }
  };

  /**
   * Câblage du Checkout :
   * Déclenche la fonction de paiement en transmettant le planId et le montant réel.
   */
  const handleCheckout = (planId: string, price: number) => {
    if (planId === 'free') {
      handleFreePlanClick();
      return;
    }
    playValidationBeep();
    if (onCheckout) {
      onCheckout(planId, price, isAnnual);
    } else {
      onOpenModal();
    }
  };

  return (
    <section id="pricing" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto">

        {/* En-tête de section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Architecture Tarifaire Hybride & Équitable</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* SÉLECTEUR DES 3 PILIERS TARIFAIRES */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-200/90 rounded-2xl border border-slate-300 shadow-inner">
            
            {/* Pilier 1 : Abonnements Fixes */}
            <button
              type="button"
              onClick={() => { playTapBeep(); setPricingTab('SUBSCRIPTION'); }}
              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl font-bold transition cursor-pointer text-center ${
                pricingTab === 'SUBSCRIPTION'
                  ? 'bg-white text-blue-700 shadow-md shadow-blue-900/10 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Store className="w-4 h-4 text-blue-600" />
                <span className="text-sm sm:text-base font-extrabold">Abonnements Fixes</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                0% Commission • Commerces & Formations
              </span>
            </button>

            {/* Pilier 2 : Formule Créateur / Formateur */}
            <button
              type="button"
              onClick={() => { playTapBeep(); setPricingTab('CREATOR'); }}
              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl font-bold transition cursor-pointer text-center ${
                pricingTab === 'CREATOR'
                  ? 'bg-white text-indigo-700 shadow-md shadow-indigo-900/10 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span className="text-sm sm:text-base font-extrabold">Formule Créateur</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                0 F Création • 14% Vente Sécurisée
              </span>
            </button>

            {/* Pilier 3 : Pay-As-You-Go */}
            <button
              type="button"
              onClick={() => { playTapBeep(); setPricingTab('PAY_AS_YOU_GO'); }}
              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl font-bold transition cursor-pointer text-center ${
                pricingTab === 'PAY_AS_YOU_GO'
                  ? 'bg-white text-amber-700 shadow-md shadow-amber-900/10 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm sm:text-base font-extrabold">Services à l'Acte</span>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Pay-As-You-Go • Voir Direct (100 F)
              </span>
            </button>

          </div>
        </div>

        {/* CONTENU ONGLET 1 : ABONNEMENTS FIXES (0% COMMISSION) */}
        {pricingTab === 'SUBSCRIPTION' && (
          <div>
            {/* Bannière 0% de commission */}
            <div className="mb-10 max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-600/20 border border-blue-400/40 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
                    <Percent className="w-8 h-8 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                      {zeroBanner.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-100 mt-1 leading-relaxed">
                      {zeroBanner.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 px-4 py-2 rounded-xl bg-white text-blue-900 font-black text-xs uppercase tracking-wider shadow">
                  {zeroBanner.badge}
                </div>
              </div>
            </div>

            {/* Toggle Mensuel / Annuel */}
            <div className="text-center max-w-xl mx-auto mb-8">
              <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setIsAnnual(false); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    !isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Facturation Mensuelle
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setIsAnnual(true); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isAnnual ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <span>Facturation Annuelle</span>
                  <span className="text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                    -20%
                  </span>
                </button>
              </div>
            </div>

            {/* BANNIÈRE COLORÉE EXPLICATIVE : TARIFICATION MODULAIRE À LA CARTE */}
            <div className="mb-10 max-w-5xl mx-auto rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 text-white shadow-xl shadow-orange-500/15 border border-amber-300/40 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                      <Sparkles className="w-5 h-5 text-amber-200" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                        <span>✨ Tarification Modulaire & Sur-Mesure</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black tracking-tight">
                        Ne payez que ce que vous utilisez ! Personnalisez vos modules au choix lors de l'abonnement.
                      </h4>
                    </div>
                  </div>
                  <div className="shrink-0 px-3 py-1 rounded-xl bg-white text-slate-900 font-black text-xs uppercase tracking-wider shadow">
                    Choix en 1 clic
                  </div>
                </div>

                {/* Les 4 pastilles colorées en résumé */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
                    <div className="font-extrabold text-amber-200 flex items-center gap-1.5 mb-0.5">
                      <Store className="w-3.5 h-3.5" />
                      <span>Caisse Physique Seule</span>
                    </div>
                    <div className="text-base font-black text-white">5 000 F CFA <span className="text-[10px] font-normal text-orange-100">/ mois</span></div>
                    <div className="text-[10px] text-orange-100 mt-1">Caisse tactile, tickets, clôture Z & dettes.</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
                    <div className="font-extrabold text-indigo-200 flex items-center gap-1.5 mb-0.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Vitrine Web Seule</span>
                    </div>
                    <div className="text-base font-black text-white">5 000 F CFA <span className="text-[10px] font-normal text-indigo-100">/ mois</span></div>
                    <div className="text-[10px] text-indigo-100 mt-1">Site nsore.shop, panier WhatsApp & pixels.</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
                    <div className="font-extrabold text-purple-200 flex items-center gap-1.5 mb-0.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Formateur Seul</span>
                    </div>
                    <div className="text-base font-black text-white">10 000 F CFA <span className="text-[10px] font-normal text-purple-100">/ mois</span></div>
                    <div className="text-[10px] text-purple-100 mt-1">Vidéos illimitées, diplômes QR & Wameet.</div>
                  </div>

                  <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30 ring-1 ring-white/40">
                    <div className="font-extrabold text-emerald-300 flex items-center gap-1.5 mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Pack Tout-en-Un</span>
                    </div>
                    <div className="text-base font-black text-white">15 000 F CFA <span className="text-[10px] font-normal text-emerald-100">/ mois</span></div>
                    <div className="text-[10px] text-emerald-100 mt-1">Tout inclus (économie de 5 000 F CFA).</div>
                  </div>
                </div>

                <div className="text-[11px] text-orange-100/90 mt-3 text-center sm:text-left">
                  👉 <em>Cliquez sur « Choisir ce plan » : vous pourrez cocher librement la caisse, la vitrine ou l'espace formateur selon vos besoins réels.</em>
                </div>
              </div>
            </div>

            {/* Indication visuelle mobile */}
            <div className="flex lg:hidden items-center justify-center gap-1.5 text-xs text-slate-500 mb-4 font-medium">
              <span>← Glissez horizontalement pour comparer les 4 formules →</span>
            </div>

            {/* Grille des 4 Plans */}
            <div className="flex lg:grid overflow-x-auto lg:overflow-x-visible snap-x snap-mandatory lg:snap-none gap-4 lg:gap-3 xl:gap-5 pb-6 lg:pb-0 px-4 sm:px-6 lg:px-0 -mx-4 sm:-mx-6 lg:mx-auto max-w-7xl lg:grid-cols-4 items-stretch scroll-smooth no-scrollbar">
              {plans.map((plan) => {
                const isFree = plan.id === 'free' || plan.monthlyPriceFCFA === 0;
                const isPopular = plan.isPopular || plan.id === 'pro';
                const isElite = plan.id === 'elite';
                const price = isFree ? 0 : (isAnnual ? plan.annualPriceFCFA : plan.monthlyPriceFCFA);
                const formattedPrice = isFree ? '0' : (price || 0).toLocaleString('fr-FR');

                const ctaButtonText = isFree
                  ? (plan.ctaText || "Démarrer Gratuitement (0F)")
                  : isPopular
                  ? (plan.ctaText || "Choisir le Plan Pro")
                  : isElite
                  ? (plan.ctaText || "Passer à l'Élite Enterprise")
                  : (plan.ctaText || `Choisir ${plan.name}`);

                return (
                  <div
                    key={plan.id}
                    className={`w-[85vw] sm:w-[340px] lg:w-auto shrink-0 snap-center rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative border ${
                      isPopular
                        ? 'bg-white border-blue-500 ring-2 ring-blue-500/30 shadow-xl shadow-blue-500/10 -translate-y-1'
                        : isElite
                        ? 'bg-slate-900 border-amber-500/40 text-white shadow-xl shadow-slate-950/20'
                        : isFree
                        ? 'bg-emerald-50/40 border-emerald-300/80 shadow-md shadow-emerald-500/5'
                        : 'bg-white border-slate-200 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                        {plan.badge || '⭐ Plus Populaire'}
                      </div>
                    )}
                    {isElite && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-md">
                        {plan.badge || '👑 Marque Blanche VIP'}
                      </div>
                    )}
                    {isFree && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                        {plan.badge || '🎁 100% Gratuit'}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className={`text-xl font-black ${isElite ? 'text-white' : 'text-slate-900'}`}>
                          {plan.name}
                        </h4>
                      </div>
                      <p className={`text-xs leading-relaxed min-h-[38px] mb-5 ${isElite ? 'text-slate-400' : 'text-slate-500'}`}>
                        {plan.description}
                      </p>

                      <div className="mb-6 flex items-baseline gap-1.5">
                        <span className={`text-3xl sm:text-4xl font-black tracking-tight ${isElite ? 'text-white' : 'text-slate-900'}`}>
                          {formattedPrice}
                        </span>
                        <span className={`text-xs font-bold ${isElite ? 'text-slate-400' : 'text-slate-500'}`}>
                          F CFA {isFree ? '' : '/ mois'}
                        </span>
                      </div>

                      <div className={`h-px w-full mb-6 ${isElite ? 'bg-slate-800' : 'bg-slate-100'}`} />

                      <ul className="space-y-3 mb-8 text-xs">
                        {plan.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isElite ? 'bg-amber-400/20 text-amber-400' : isFree ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span className={isElite ? 'text-slate-300' : 'text-slate-700'}>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCheckout(plan.id, price || 0)}
                      className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                        isPopular
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40'
                          : isElite
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20 font-black'
                          : isFree
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                          : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                      }`}
                    >
                      {isFree && <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />}
                      {isPopular && <Rocket className="w-4 h-4 text-amber-300 shrink-0" />}
                      <span>{ctaButtonText}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-80 shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Matrice de Comparaison Détaillée Déployable */}
            <div className="max-w-7xl mx-auto mt-8">
              <PricingComparisonMatrix
                selectedPlanId="pro"
                onSelectPlan={(planId) => {
                  const matchedPlan = plans.find(p => p.id === planId);
                  const price = planId === 'free' ? 0 : (isAnnual ? matchedPlan?.annualPriceFCFA : matchedPlan?.monthlyPriceFCFA) || 0;
                  handleCheckout(planId, price);
                }}
              />
            </div>
          </div>
        )}

        {/* CONTENU ONGLET 2 : FORMULE CRÉATEUR / FORMATEUR (14% COMMISSION) */}
        {pricingTab === 'CREATOR' && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-2xl border border-indigo-700/50 relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                    <GraduationCap className="w-4 h-4 text-indigo-300" />
                    <span>Spécial Formateurs, Coachs & Créateurs de Tout Genre</span>
                  </div>
                  <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-extrabold text-xs">
                    ✓ ZÉRO RISQUE FINANCIER • 0 F AU DÉPART
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7">
                    <h3 className="text-2xl sm:text-4xl font-black tracking-tight mb-4 leading-tight">
                      Vous transmettez votre savoir.<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-indigo-200 to-emerald-300">
                        Nous propulsons votre empire numérique.
                      </span>
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-6">
                      Que vous soyez formateur, coach, consultant, conférencier ou créateur de tout genre : 
                      lancez votre académie en ligne, hébergez vos cours vidéo, documents PDF, examens et masterclasses 
                      <strong className="text-white font-semibold"> 100% gratuitement</strong>. Aucun abonnement mensuel fixe. 
                      Nous prélevons uniquement <strong className="text-amber-300 font-bold">14% de commission</strong> sur chaque vente réussie, sous protection séquestre Escrow automatique.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-amber-300 font-black text-2xl mb-1">0 F CFA</div>
                        <div className="text-xs font-bold text-white">Création & Hébergement</div>
                        <div className="text-[11px] text-slate-400 mt-1">Cours illimités, quiz, élèves illimités et vidéos privées sans frais d'entrée.</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-emerald-400 font-black text-2xl mb-1">14%</div>
                        <div className="text-xs font-bold text-white">Commission sur Vente</div>
                        <div className="text-[11px] text-slate-400 mt-1">Prélevé uniquement quand vous encaissez. Vous conservez 86% de votre prix.</div>
                      </div>
                    </div>

                    {/* Grille des Atouts Clés Demandés */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-left mb-6 lg:mb-0">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">Thème Digital Pro</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <Rocket className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">Tunnels de Vente</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <Video className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">Live Webinaire</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">Live Shopping Numérique</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <Plug className="w-4 h-4 text-indigo-300 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">Extensions & Intégrations</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-300 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">Assistance Dédiée 7j/7</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15">
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-indigo-200 mb-4 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Inclus dans la Formule Créateur :</span>
                    </h4>
                    <ul className="space-y-3 text-xs text-slate-200 mb-6">
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Thème Digital Pro & Tunnels de Vente</strong> : Vitrine d'académie premium responsive et tunnels de conversion 1 clic.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Live Webinaire & Shopping Numérique</strong> : Masterclasses en direct Wameet et ventes interactives de formations.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Séquestre Escrow Automatisé</strong> : Paiements Wave, Orange Money, MTN, Moov et CB sécurisés jusqu'à validation.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Certificats QR-Code Authentifiés</strong> : Remise automatique de diplômes et attestations infalsifiables.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Extensions, Intégrations & Assistance</strong> : WhatsApp, Pixels Meta/TikTok, webhooks et accompagnement humain dédié.</span>
                      </li>
                    </ul>

                    <button
                      type="button"
                      onClick={handleCreatorClick}
                      className="w-full py-4 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-xl shadow-amber-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <GraduationCap className="w-5 h-5" />
                      <span>Lancer mon Académie Gratuitement (0 F)</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                    <p className="text-[11px] text-center text-slate-400 mt-2.5">
                      0 F CFA à l'inscription • Pas de carte bancaire requise • Activez en 2 minutes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENU ONGLET 3 : SERVICES EXPRESS À L'ACTE (PAY-AS-YOU-GO) */}
        {pricingTab === 'PAY_AS_YOU_GO' && (
          <div className="max-w-6xl mx-auto space-y-8">

            {/* VEDETTE MAJEURE : VOIR DIRECT (100 F CFA) */}
            <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-2xl shadow-orange-500/25 border border-amber-300/60 overflow-hidden">
              <div className="absolute -right-12 -top-12 w-56 h-56 bg-white/15 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-lg border border-white/30">
                    <Eye className="w-9 h-9 text-amber-200 animate-pulse" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-wider mb-2 border border-white/25">
                      <Flame className="w-3.5 h-3.5 text-amber-300" />
                      <span>Nouveauté Essentielle • Conversion Maximale</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                      Voir Direct & Achat Immédiat
                    </h3>
                    <p className="text-xs sm:text-sm text-orange-100 mt-1.5 max-w-2xl leading-relaxed">
                      Activez la démo vidéo en direct de votre produit : vos visiteurs visualisent l'article en temps réel et déclenchent l'achat en 1 clic sans friction. 
                      Multipliez par 3 vos ventes sans aucun abonnement préalable.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center sm:items-end text-center sm:text-right bg-white/15 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/25 w-full md:w-auto">
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    100 <span className="text-lg font-bold text-amber-200">F CFA</span>
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-orange-200 mb-3">
                    Par produit activé
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      if (typeof window !== 'undefined') {
                        window.history.pushState({ intent: 'direct_view' }, '', '/register?intent=vendor&feature=direct_view');
                        window.location.href = '/register?intent=vendor&feature=direct_view';
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-orange-900 font-extrabold text-xs hover:bg-orange-50 transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4 text-orange-600" />
                    <span>Activer la Voir Direct</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bannière explicative Pay-As-You-Go */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Zap className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Payez uniquement ce que vous consommez. Zéro abonnement.
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Idéal pour les visiteurs occasionnels ou les besoins ponctuels. Débit instantané sur votre solde Wallet.
                  </p>
                </div>
              </div>
              <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg shrink-0">
                Rechargeable dès 500 F CFA via Wave / OM
              </div>
            </div>

            {/* Grille des autres services à l'usage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              
              {/* CV Pro */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      500 F CFA
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1.5">CV Pro Moderne & IA</h5>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Génération et export PDF vectoriel haute définition de votre curriculum vitae avec modèle professionnel et lettre de motivation assistée par IA.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span>À l'export PDF unique</span>
                  <span className="text-emerald-600 font-bold">Inclus dans Plan Pro+</span>
                </div>
              </div>

              {/* DocuSign */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                      300 F CFA
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1.5">Signature Électronique Certifiée</h5>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    DocuSign sécurisé et horodatage SHA-256 de vos contrats de vente, devis ou accords commerciaux avec certificat juridique de conformité.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span>Par document signé</span>
                  <span className="text-emerald-600 font-bold">Preuve infalsifiable</span>
                </div>
              </div>

              {/* SMS Marketing */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Radio className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      25 F CFA
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1.5">Notification SMS Transactionnelle</h5>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Envoi instantané de SMS d'alerte, rappel de livraison ou confirmation de commande vers Orange, MTN, Moov et Wave avec accusé de réception.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span>Par SMS délivré</span>
                  <span className="text-slate-500 font-medium">Routage direct Afrique</span>
                </div>
              </div>

              {/* WhatsApp Automatisé */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
                      <Bot className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                      35 F CFA
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1.5">Notification WhatsApp Automatisée</h5>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Relance automatique de devis, facture avec bouton de paiement intégré et notification d'expédition envoyée directement dans le WhatsApp du client.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span>Par message WhatsApp</span>
                  <span className="text-emerald-600 font-bold">Taux d'ouverture 98%</span>
                </div>
              </div>

              {/* IA Média Studio */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      150 F CFA
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1.5">Génération IA Média Studio</h5>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Détourage haute précision, création de visuels produits publicitaires et bannières promotionnelles pour vos réseaux sociaux assistés par IA.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span>Par visuel généré</span>
                  <span className="text-slate-500 font-medium">Qualité studio 4K</span>
                </div>
              </div>

              {/* Vente Flash Live Countdown */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Flame className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      1 000 F CFA
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mb-1.5">Session Vente Flash Live</h5>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Activation d'un compte à rebours d'urgence en direct avec stock restant dynamique pour écouler vos invendus et séries limitées en temps record.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span>Par session événement</span>
                  <span className="text-amber-600 font-bold">Effet d'urgence maximal</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Micro-copie d'Incitation au Programme Partenaire / Parrainage */}
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (onOpenPartnerProgram) {
                onOpenPartnerProgram();
              } else if (typeof window !== 'undefined') {
                window.history.pushState({ intent: 'partner' }, '', '/partenaires');
                window.location.href = '/partenaires';
              }
            }}
            className="inline-flex items-center justify-center flex-wrap gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 p-2.5 rounded-2xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition cursor-pointer"
          >
            <span>💡 Rentabilisez votre activité ! Parrainez d'autres commerçants et formateurs pour toucher des commissions permanentes.</span>
            <span className="font-bold underline text-blue-600 ml-1 hover:text-blue-500">[En savoir plus sur le parrainage]</span>
          </button>
        </div>

      </div>
    </section>
  );
};


const PartnerPreFooterSection: React.FC<{
  onOpenPartnerProgram?: () => void;
}> = ({ onOpenPartnerProgram }) => {
  const handleCtaClick = () => {
    playValidationBeep();
    if (onOpenPartnerProgram) {
      onOpenPartnerProgram();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({ intent: 'partner' }, '', '/partenaires');
      window.location.href = '/partenaires';
    }
  };

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-100">
      <div className="max-w-6xl mx-auto relative rounded-3xl overflow-hidden py-12 sm:py-16 px-6 sm:px-12 lg:px-16 bg-gradient-to-r from-[#031d3d] via-[#09477e] to-[#031d3d] border border-sky-400/30 text-white shadow-2xl shadow-blue-950/20">
        {/* Halos lumineux d'ambiance */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-sky-300/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
          <div className="flex flex-col sm:flex-row items-center lg:items-start gap-5">
            <div className="w-16 h-16 rounded-3xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-xl backdrop-blur-md">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/30 text-white text-[10px] font-black uppercase tracking-wider mb-2 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-white" />
                <span>Affiliation & Apporteurs d'Affaires</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Devenez Partenaire Nanasore
              </h2>
              <p className="mt-2 text-sm sm:text-base text-white/95 max-w-2xl leading-relaxed font-medium">
                Aidez d'autres entrepreneurs à se lancer. Recommandez la plateforme et gagnez des commissions récurrentes sur chaque abonnement.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCtaClick}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-slate-50 text-blue-900 font-black text-sm sm:text-base shadow-xl shadow-blue-950/25 transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 group border border-white"
            >
              <span>Découvrir l'affiliation</span>
              <ArrowRight className="w-4 h-4 text-blue-900 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// FOOTER (ULTRA-CLEAN ET PROFESSIONNEL)
// =============================================================================
const LandingFooter: React.FC<{
  onOpenSecretAdmin?: () => void;
  onOpenEmailAuth?: () => void;
  onOpenPartnerProgram?: () => void;
  config?: LandingFooterConfig;
}> = ({ onOpenSecretAdmin, onOpenEmailAuth, onOpenPartnerProgram, config }) => {
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalDocType, setLegalDocType] = useState<'LEGAL_MENTIONS' | 'PRIVACY_POLICY'>('LEGAL_MENTIONS');
  const [legalConfig, setLegalConfig] = useState<PlatformLegalConfig>(DEFAULT_PLATFORM_LEGAL);

  useEffect(() => {
    const unsub = subscribeToPlatformLegal((cfg) => {
      setLegalConfig(cfg);
    });
    return () => unsub();
  }, []);

  const brandDescription = config?.brandDescription || "Plateforme SaaS hybride tout-en-un pour le commerce physique, le live shopping et le e-learning en marque blanche. 0% de commission.";
  const solutionsLinks = config?.solutionsLinks && config.solutionsLinks.length > 0
    ? config.solutionsLinks
    : DEFAULT_LANDING_PAGE_CONFIG.footerSection.solutionsLinks;
  const legalLinks = config?.legalLinks && config.legalLinks.length > 0
    ? config.legalLinks
    : DEFAULT_LANDING_PAGE_CONFIG.footerSection.legalLinks;
  const copyrightText = config?.copyrightText || "© 2026 Nanasore Technologies Inc. Tous droits réservés.";
  const versionText = config?.versionText || "SaaS Multi-Tenant Version 2.4 • 0% Commission";

  return (
    <footer className="bg-[#020617] text-slate-300 border-t border-slate-800/80 pt-16 pb-36 sm:pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        
        {/* Colonne 1 : Brand & Mission */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Logo size="md" darkBackground={true} accentColor="text-sky-400" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {brandDescription}
          </p>
        </div>

        {/* Colonne 2 : Solutions & Ressources */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">
            Solutions & Ressources
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            {solutionsLinks.map((item, idx) => {
              const isPartner = item.label.toLowerCase().includes('partenaire') || item.href === '/partenaires';
              if (isPartner) {
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (onOpenPartnerProgram) {
                          onOpenPartnerProgram();
                        } else if (typeof window !== 'undefined') {
                          window.history.pushState({ intent: 'partner' }, '', '/partenaires');
                          window.location.href = '/partenaires';
                        }
                      }}
                      className="text-xs text-sky-400 font-bold hover:underline transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              }
              return (
                <li key={idx}>
                  <a 
                    href={item.href || '#bento'} 
                    onClick={(e) => {
                      if (item.href?.startsWith('#')) {
                        e.preventDefault();
                        const el = document.querySelector(item.href);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    className="hover:text-sky-300 transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
            {!solutionsLinks.some(s => s.label.toLowerCase().includes('partenaire')) && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    if (onOpenPartnerProgram) {
                      onOpenPartnerProgram();
                    } else if (typeof window !== 'undefined') {
                      window.history.pushState({ intent: 'partner' }, '', '/partenaires');
                      window.location.href = '/partenaires';
                    }
                  }}
                  className="text-xs text-sky-400 font-bold hover:underline transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                  <span>Programme Partenaire</span>
                </button>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/market');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="text-xs text-emerald-400 font-bold hover:underline transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Les Univers (Annuaire)</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Colonne 3 : Légal & Conformité */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">
            Conformité & Légal
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            {legalLinks.map((item, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    if (item.label.toLowerCase().includes('confidentialité') || item.label.toLowerCase().includes('privacy')) {
                      setLegalDocType('PRIVACY_POLICY');
                    } else {
                      setLegalDocType('LEGAL_MENTIONS');
                    }
                    setLegalModalOpen(true);
                  }}
                  className="text-slate-400 hover:text-sky-300 transition-colors text-left cursor-pointer"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne 4 : Espace Compte */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">
            Espace Compte
          </h4>
          <div className="space-y-3">
            {onOpenEmailAuth && (
              <button
                type="button"
                onClick={() => { 
                  playTapBeep(); 
                  if (typeof window !== 'undefined') {
                    window.history.pushState(null, '', '/login');
                  }
                  onOpenEmailAuth(); 
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95"
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Se connecter</span>
              </button>
            )}
            {onOpenSecretAdmin && (
              <button
                type="button"
                onClick={() => { playTapBeep(); onOpenSecretAdmin(); }}
                className="w-full py-2 px-3 rounded-xl border border-slate-800/80 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                title="Accès Administrateur"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Accès Sécurisé</span>
              </button>
            )}
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-8 pb-10 sm:pb-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>{copyrightText}</span>
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            if (onOpenSecretAdmin) onOpenSecretAdmin();
          }}
          className="font-mono text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer select-none transition"
          title="Sécurité Système"
        >
          {versionText}
        </button>
      </div>

      {/* Modale d'Affichage Légal Interactif */}
      <LegalDocModal
        isOpen={legalModalOpen}
        initialDoc={legalDocType}
        onClose={() => setLegalModalOpen(false)}
        legalConfig={legalConfig}
      />
    </footer>
  );
};

// =============================================================================
// COMPOSANT MAÎTRE PRINCIPAL : NANA LANDING PAGE
// =============================================================================
export const NaNaLandingPage: React.FC<NaNaLandingPageProps> = ({
  onExplore,
  onOpenPinPad,
  onOpenEmailAuth,
  onOpenInstructor,
  onOpenSecretAdmin,
  onCheckout,
  onOpenPartnerProgram,
}) => {
  // État local de la modale de sélection d'univers
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  // Configuration dynamique du CMS synchronisée en direct avec Firestore et cache local
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG);
  // État du checkout direct déclenché depuis la grille de tarification
  const [checkoutModalState, setCheckoutModalState] = useState<{ isOpen: boolean; planId: string } | null>(null);

  useEffect(() => {
    // 1. Écouteur temps réel sur la collection platform_settings/landing (CMS)
    const unsubscribeLanding = subscribeToLandingPageConfig((config) => {
      if (config) {
        setLandingConfig(config);
      }
    });

    // 2. Écouteur temps réel sur platform_settings/subscriptions (Plans configurés par le Super Admin)
    const unsubscribePlatformSubs = subscribeToPlatformSubscriptions((platformConfig) => {
      if (platformConfig?.plans && Array.isArray(platformConfig.plans) && platformConfig.plans.length > 0) {
        setLandingConfig((prev) => {
          const currentPlans = prev.pricingSection?.plans || DEFAULT_LANDING_PAGE_CONFIG.pricingSection.plans;
          const mergedPlans = currentPlans.map((lp) => {
            const match = platformConfig.plans.find((p) => p.id?.toLowerCase() === lp.id?.toLowerCase());
            if (match) {
              return {
                ...lp,
                name: match.name || lp.name,
                monthlyPriceFCFA: match.price !== undefined ? match.price : lp.monthlyPriceFCFA,
                annualPriceFCFA: match.price !== undefined ? Math.round(match.price * 10) : lp.annualPriceFCFA,
                badge: match.badge || lp.badge,
                description: match.description || lp.description,
                features: match.features || lp.features,
              };
            }
            return lp;
          });

          return {
            ...prev,
            pricingSection: {
              ...prev.pricingSection,
              plans: mergedPlans
            }
          };
        });
      }
    });

    // 3. Écouteur événement direct de rafraîchissement d'état
    const handleSuperAdminEvent = (e: any) => {
      const detail = e.detail;
      if (detail?.platformConfig?.plans) {
        const plans = detail.platformConfig.plans;
        setLandingConfig((prev) => {
          const currentPlans = prev.pricingSection?.plans || DEFAULT_LANDING_PAGE_CONFIG.pricingSection.plans;
          const mergedPlans = currentPlans.map((lp) => {
            const match = plans.find((p: any) => p.id?.toLowerCase() === lp.id?.toLowerCase());
            if (match) {
              return {
                ...lp,
                name: match.name || lp.name,
                monthlyPriceFCFA: match.price !== undefined ? match.price : lp.monthlyPriceFCFA,
                annualPriceFCFA: match.price !== undefined ? Math.round(match.price * 10) : lp.annualPriceFCFA,
                badge: match.badge || lp.badge,
                description: match.description || lp.description,
                features: match.features || lp.features,
              };
            }
            return lp;
          });
          return {
            ...prev,
            pricingSection: {
              ...prev.pricingSection,
              plans: mergedPlans
            }
          };
        });
      }
    };
    window.addEventListener('superAdminUpdated', handleSuperAdminEvent);

    return () => {
      if (typeof unsubscribeLanding === 'function') unsubscribeLanding();
      if (typeof unsubscribePlatformSubs === 'function') unsubscribePlatformSubs();
      window.removeEventListener('superAdminUpdated', handleSuperAdminEvent);
    };
  }, []);

  return (
    <div 
      className="min-h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden font-sans selection:bg-blue-600 selection:text-white pb-32 sm:pb-20"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* 1. Barre de navigation Glassmorphism */}
      <LandingNavbar 
        onOpenModal={() => setIsWorkspaceModalOpen(true)}
        onOpenEmailAuth={onOpenEmailAuth}
        onOpenPartnerProgram={onOpenPartnerProgram}
        onOpenSecretAdmin={onOpenSecretAdmin}
      />

      {/* 1. Hero Section (Titre épuré) */}
      <HeroSection 
        onOpenModal={() => setIsWorkspaceModalOpen(true)}
        onExplore={onExplore}
      />

      {/* 2. Section Hybride (Les DEUX grandes cartes blanches : "Commerce Hybride" et "Académie") */}
      <HybridSection 
        onOpenModal={() => setIsWorkspaceModalOpen(true)}
      />

      {/* 3. Section Simulateur (La grande carte bleu foncé - Le Réseau Orbital) */}
      <ProductSimulatorBanner 
        onOpenModal={() => setIsWorkspaceModalOpen(true)}
      />

      {/* 4. Section Next-Gen Features */}
      <NextGenDarkSection 
        onOpenModal={() => setIsWorkspaceModalOpen(true)}
        config={landingConfig.featuresSection}
      />

      {/* 6. Grille de Tarifs & Bannière 0% de Commission */}
      <PricingSection 
        onOpenModal={() => setIsWorkspaceModalOpen(true)}
        onSelectFreePlan={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({ intent: 'vendor', plan: 'free' }, '', '/register?intent=vendor&plan=free');
          }
          if (onOpenEmailAuth) {
            onOpenEmailAuth();
          } else if (typeof window !== 'undefined') {
            window.location.href = '/register?intent=vendor&plan=free';
          }
        }}
        onCheckout={(planId, price, isAnnual) => {
          if (planId === 'free') {
            if (typeof window !== 'undefined') {
              window.history.pushState({ intent: 'vendor', plan: 'free' }, '', '/register?intent=vendor&plan=free');
            }
            if (onOpenEmailAuth) {
              onOpenEmailAuth();
            } else if (typeof window !== 'undefined') {
              window.location.href = '/register?intent=vendor&plan=free';
            }
            return;
          }
          if (onCheckout) {
            onCheckout(planId, price, isAnnual);
          } else {
            setCheckoutModalState({ isOpen: true, planId });
          }
        }}
        onOpenPartnerProgram={onOpenPartnerProgram}
        config={landingConfig.pricingSection}
      />

      {/* 7. Bande CTA Pré-Footer : Devenez Partenaire Nanasore */}
      <PartnerPreFooterSection 
        onOpenPartnerProgram={onOpenPartnerProgram}
      />

      {/* 8. Footer de Classe Mondiale */}
      <LandingFooter 
        onOpenSecretAdmin={onOpenSecretAdmin}
        onOpenEmailAuth={onOpenEmailAuth}
        onOpenPartnerProgram={onOpenPartnerProgram}
        config={landingConfig.footerSection}
      />

      {/* Modal de Facturation / Checkout Nanasore (Starter, Pro, Elite) */}
      {checkoutModalState?.isOpen && (
        <SubscriptionPaywallModal
          isOpen={checkoutModalState.isOpen}
          initialPlanId={checkoutModalState.planId}
          onClose={() => setCheckoutModalState(null)}
          storeName="Votre Boutique Nanasore"
          onSubscriptionUpdated={() => {
            setCheckoutModalState(null);
          }}
        />
      )}

      {/* Modale d'Aiguillage : Option A (Produits) vs Option B (Formations) */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSelectMerchant={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({ intent: 'vendor', plan: 'free', type: 'products' }, '', '/register?intent=vendor&plan=free&type=products');
          }
          if (onOpenEmailAuth) {
            onOpenEmailAuth();
          } else if (onOpenPinPad) {
            onOpenPinPad();
          } else if (typeof window !== 'undefined') {
            window.location.href = '/register?intent=vendor&plan=free&type=products';
          }
        }}
        onSelectInstructor={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({ intent: 'instructor', plan: 'free', type: 'courses' }, '', '/register?intent=instructor&plan=free&type=courses');
          }
          if (onOpenEmailAuth) {
            onOpenEmailAuth();
          } else if (onOpenInstructor) {
            onOpenInstructor();
          } else if (typeof window !== 'undefined') {
            window.location.href = '/register?intent=instructor&plan=free&type=courses';
          }
        }}
      />
    </div>
  );
};

export default NaNaLandingPage;
