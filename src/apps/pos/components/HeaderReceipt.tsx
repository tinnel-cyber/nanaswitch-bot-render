import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { CartItem, StoreUser, SellerUser, StoreSubscription } from '../../../types';
import { formatCFA, playValidationBeep, playTapBeep } from '../../../utils/audio';
import { auth } from '../../../firebase';
import { NetworkStatusBadge } from '../../../components/NetworkStatusBadge';
import { PWAInstallBanner } from '../../../components/PWAInstallBanner';
import { 
  ArrowLeft,
  Plus, 
  Minus, 
  Trash2, 
  Banknote, 
  BookOpen, 
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Mic,
  Boxes,
  UserCheck,
  ShieldAlert,
  Sliders,
  Printer,
  FileDown,
  Users,
  KeyRound,
  ShieldCheck,
  FileText,
  Gift,
  Lock,
  Zap,
  PenTool,
  ChevronDown,
  FolderKanban,
  FileBadge,
  Scale,
  CreditCard,
  Tag,
  Store,
  Camera,
  Menu,
  GraduationCap,
  Package,
  Globe,
  Bot,
  Wand2,
  LayoutGrid,
  Search
} from 'lucide-react';
import { isFreePlan } from '../../../utils/planFeatures';
import { ProCrownIcon } from '../../../components/common/ProFeatureGuard';
import { ThemeSwitcher } from '../../../shell/layout/ThemeSwitcher';
import { NanasoreLogo } from '../../../components/common/NanasoreLogo';

interface HeaderReceiptProps {
  onBackToHome?: () => void;
  cart: CartItem[];
  total: number;
  itemCount: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onOpenCashPayment: () => void;
  onQuickCashCheckout: () => void;
  onOpenDebtBook: () => void;
  onOpenCustomerOrders?: () => void;
  pendingOrdersCount?: number;
  onOpenDocuSign?: () => void;
  onOpenQuotesProjects?: () => void;
  onOpenCvCreator?: () => void;
  onOpenReports?: () => void;
  onOpenCompta?: () => void;
  onOpenInventory?: () => void;
  onOpenVoiceTest?: () => void;
  onOpenAiAdvisor?: () => void;
  onOpenAdmin?: () => void;
  onOpenSaasAdmin?: () => void;
  onOpenSecretAdminModal?: () => void;
  onOpenSettings?: () => void;
  onOpenPrintReceipt?: () => void;
  onDownloadPdfReceipt?: () => void;
  onOpenPaywall?: () => void;
  onOpenAffiliation?: () => void;
  onOpenMarketingAI?: () => void;
  onOpenLegalAi?: () => void;
  subscription?: StoreSubscription | null;
  currentUser?: StoreUser | null;
  debtCustomerCount: number;
  totalDebtAmount: number;
  activeSeller?: SellerUser | null;
  onOpenSellerSwitch?: () => void;
  onLockManual?: () => void;
  hideTicketOnDesktop?: boolean;
  isCashierMode?: boolean;
  onRequireManagerAuth?: (action: () => void, title: string, badge?: string) => void;
  onOpenAcademy?: () => void;
  // Options de personnalisation dynamique de l'apparence (Module d'en-tête)
  customAvatarUrl?: string;
  showPersonalAvatar?: boolean;
  headerVariant?: 'default' | 'funnel' | 'creator' | 'minimal';
  customBrandTitle?: string;
  customSubtitle?: string;
}

export const HeaderReceipt: React.FC<HeaderReceiptProps> = ({
  onBackToHome,
  cart,
  total,
  itemCount,
  onUpdateQuantity,
  onRemoveItem,
  onOpenCashPayment,
  onQuickCashCheckout,
  onOpenDebtBook,
  onOpenCustomerOrders,
  pendingOrdersCount = 0,
  onOpenDocuSign,
  onOpenQuotesProjects,
  onOpenCvCreator,
  onOpenReports,
  onOpenCompta,
  onOpenInventory,
  onOpenVoiceTest,
  onOpenAiAdvisor,
  onOpenMarketingAI,
  onOpenLegalAi,
  onOpenAdmin,
  onOpenSaasAdmin,
  onOpenSecretAdminModal,
  onOpenSettings,
  onOpenPrintReceipt,
  onDownloadPdfReceipt,
  onOpenPaywall,
  onOpenAffiliation,
  subscription,
  currentUser,
  debtCustomerCount,
  totalDebtAmount,
  activeSeller,
  onOpenSellerSwitch,
  onLockManual,
  hideTicketOnDesktop = false,
  isCashierMode = false,
  onRequireManagerAuth,
  onOpenAcademy,
  customAvatarUrl,
  showPersonalAvatar = false,
  headerVariant = 'default',
  customBrandTitle,
  customSubtitle,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const isFreeAccount = isFreePlan(subscription);

  // Fermer la liste déroulante lors d'un clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
    };
    if (isToolsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsDropdownOpen]);

  // Nettoyage du timer de tapotement lors du démontage
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  // Déclencheur secret Super Admin (5 tapotements espacés de moins de 1,5s)
  const handleLogoTap = () => {
    const now = Date.now();
    const isWithinWindow = now - lastTapTimeRef.current <= 1500;
    lastTapTimeRef.current = now;

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    setTapCount((prev) => {
      const next = isWithinWindow ? prev + 1 : 1;

      if (next >= 5) {
        const isAuthorizedEmail =
          auth.currentUser?.email?.toLowerCase() === 'pousbila36@gmail.com' ||
          currentUser?.email?.toLowerCase() === 'pousbila36@gmail.com' ||
          auth.currentUser?.email?.toLowerCase() === 'pousbila04@gmail.com' ||
          currentUser?.email?.toLowerCase() === 'pousbila04@gmail.com' ||
          auth.currentUser?.email?.toLowerCase() === 'admin@nanasore.com' ||
          currentUser?.email?.toLowerCase() === 'admin@nanasore.com' ||
          currentUser?.role === 'SUPER_ADMIN';

        if (isAuthorizedEmail) {
          playValidationBeep();
          if (onOpenSaasAdmin) {
            onOpenSaasAdmin();
          }
        } else {
          // Afficher la modale de saisie du code secret
          playTapBeep();
          if (onOpenSecretAdminModal) {
            onOpenSecretAdminModal();
          }
        }
        return 0;
      }

      // Réinitialiser le compteur après 1,5 seconde d'inactivité
      tapTimerRef.current = setTimeout(() => {
        setTapCount(0);
      }, 1500);

      return next;
    });
  };

  // Auto-scroll when new items arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cart.length, cart]);

  // Subscription calculation
  const now = Date.now();
  const isTrial = subscription?.status === 'TRIAL';
  const isExpired = subscription ? subscription.expiresAt <= now : false;
  const daysLeft = subscription
    ? Math.max(0, Math.ceil((subscription.expiresAt - now) / (24 * 60 * 60 * 1000)))
    : 5;

  // Gestion du Marquee (Auto-scroll infini continu)
  const marqueeContainerRef = useRef<HTMLDivElement>(null);
  const marqueeContentRef = useRef<HTMLDivElement>(null);
  const isMarqueePausedRef = useRef<boolean>(false);
  const resumeMarqueeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startScrollLeftRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);

  // Moteur d'auto-scroll infini continu fluide
  useEffect(() => {
    let animId: number;
    // Défilement doux (~33px / seconde à 60fps)
    const speed = 0.55;

    const tick = () => {
      const container = marqueeContainerRef.current;
      const content = marqueeContentRef.current;

      if (container && content && !isMarqueePausedRef.current && !isDraggingRef.current) {
        const singleSetWidth = content.offsetWidth;
        if (singleSetWidth > 0) {
          container.scrollLeft += speed;
          // Bouclage continu sans saccade dès qu'un set complet est dépassé
          if (container.scrollLeft >= singleSetWidth) {
            container.scrollLeft -= singleSetWidth;
          }
        }
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      if (resumeMarqueeTimerRef.current) {
        clearTimeout(resumeMarqueeTimerRef.current);
      }
    };
  }, []);

  const handleMarqueePause = () => {
    if (resumeMarqueeTimerRef.current) {
      clearTimeout(resumeMarqueeTimerRef.current);
      resumeMarqueeTimerRef.current = null;
    }
    isMarqueePausedRef.current = true;
  };

  const handleMarqueeResume = (delayMs = 1500) => {
    if (resumeMarqueeTimerRef.current) {
      clearTimeout(resumeMarqueeTimerRef.current);
    }
    resumeMarqueeTimerRef.current = setTimeout(() => {
      isMarqueePausedRef.current = false;
    }, delayMs);
  };

  const handleScroll = () => {
    const container = marqueeContainerRef.current;
    const content = marqueeContentRef.current;
    if (container && content && content.offsetWidth > 0) {
      if (container.scrollLeft >= content.offsetWidth) {
        container.scrollLeft -= content.offsetWidth;
      } else if (container.scrollLeft <= 0) {
        container.scrollLeft += content.offsetWidth;
      }
    }
  };

  // Interception de navigation en mode Caissier via Master PIN
  const handleGuardedNav = (action: (() => void) | undefined, label: string, badge?: string) => {
    if (!action) return;
    if (hasDraggedRef.current) return;
    playTapBeep();
    if (isCashierMode && onRequireManagerAuth) {
      onRequireManagerAuth(action, `Accès au module : ${label}`, badge || label);
    } else {
      action();
    }
  };

  // Raccourci Direct Caméra & Sécurité (Surveillance Vidéo Magasin)
  const handleOpenStoreCam = () => {
    setIsToolsDropdownOpen(false);
    playTapBeep();
    const isAndroid = /Android/i.test(navigator.userAgent);
    const appPackage = "com.tuya.smartlife";
    if (isAndroid) {
      window.location.href = `intent://#Intent;package=${appPackage};scheme=smartlife;end;`;
      setTimeout(() => {
        window.location.href = `https://play.google.com/store/apps/details?id=${appPackage}`;
      }, 1500);
    } else {
      window.open(`https://play.google.com/store/apps/details?id=${appPackage}`, "_blank");
    }
  };

  // Rendu unifié des boutons de navigation pour les sets du marquee
  const renderNavButtons = (prefix: string) => (
    <div
      key={prefix}
      ref={prefix === 'set-1' ? marqueeContentRef : undefined}
      className="flex items-center gap-1.5 shrink-0 pr-1.5"
    >
      {/* 1. BOUTON TARIFS (OBLIGATOIRE - HAUTE VISIBILITÉ DANS LA BOUCLE) */}
      {onOpenPaywall && (
        <button
          id={`${prefix}-btn-tarifs`}
          type="button"
          onClick={() => handleGuardedNav(onOpenPaywall, 'Tarifs & Abonnements', 'Tarifs')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/25 hover:from-amber-500/40 hover:to-amber-600/40 text-amber-300 border border-amber-400/60 shadow-sm shadow-amber-500/20 active:scale-95 transition-all text-[11px] font-extrabold cursor-pointer shrink-0"
          title="Tarifs & Abonnements NaNa POS (Paiement Mobile Money, CB, Licences)"
        >
          <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span>Tarifs</span>
          {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
          {isExpired ? (
            <span className="px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 text-[9px] font-bold border border-rose-400/40">
              Expiré
            </span>
          ) : isTrial ? (
            <span className="px-1 py-0.2 rounded bg-amber-400/30 text-amber-200 text-[9px] font-bold border border-amber-400/40">
              {daysLeft}j
            </span>
          ) : (
            <span className="px-1 py-0.2 rounded bg-emerald-400/30 text-emerald-200 text-[9px] font-bold border border-emerald-400/40">
              Actif
            </span>
          )}
        </button>
      )}

      {/* 2. BOUTON CAISSE (MULTI-VENDEURS & PIN) */}
      {onOpenSellerSwitch && (
        <button
          id={`${prefix}-btn-caisse`}
          type="button"
          onClick={() => {
            if (hasDraggedRef.current) return;
            onOpenSellerSwitch();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-left transition-all active:scale-95 cursor-pointer shadow-sm shrink-0 ${
            activeSeller
              ? 'bg-blue-950/80 hover:bg-blue-900 border-blue-500/50 text-blue-200'
              : 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/60 text-rose-300 animate-pulse'
          }`}
          title="Basculer rapidement de vendeur / Déverrouiller caisse avec code PIN"
        >
          <Store className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[11px] font-bold leading-tight flex items-center gap-1">
            <span>Caisse: {activeSeller ? activeSeller.name.split(' ')[0] : 'PIN'}</span>
            {isFreeAccount && <ProCrownIcon size="xs" />}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              activeSeller ? 'bg-emerald-400' : 'bg-rose-500'
            }`}
          />
        </button>
      )}

      {/* 3. TABLEAU DE BORD */}
      {onOpenReports && (
        <button
          id={`${prefix}-btn-tableau-bord`}
          type="button"
          onClick={() => handleGuardedNav(onOpenReports, 'Tableau de Bord', 'Tableau de Bord')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/40 active:scale-95 transition-all text-[11px] font-bold cursor-pointer shadow-sm shrink-0"
          title="Tableau de Bord Principal"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Tableau de Bord</span>
          {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
        </button>
      )}

      {/* 4. STOCK & INVENTAIRE */}
      {onOpenInventory && (
        <button
          id={`${prefix}-btn-stock`}
          type="button"
          onClick={() => handleGuardedNav(onOpenInventory, 'Stock & Inventaire', 'Stock')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 active:scale-95 transition-all text-[11px] font-semibold cursor-pointer shrink-0"
          title="Inventaire & Gestion de Stock"
        >
          <Boxes className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Stock</span>
          {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
        </button>
      )}

      {/* 5. BONS & COMMANDES CLIENTS */}
      {onOpenCustomerOrders && (
        <button
          id={`${prefix}-btn-bons`}
          type="button"
          onClick={() => handleGuardedNav(onOpenCustomerOrders, 'Commandes & Livraisons', 'Commandes')}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950 to-rose-950 hover:from-amber-900 hover:to-rose-900 text-amber-200 border border-amber-500/50 active:scale-95 transition-all text-xs font-black cursor-pointer shrink-0 shadow-sm"
          title="Commandes clients & livraisons"
        >
          <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>📦 Commandes</span>
          {pendingOrdersCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse shadow leading-none">
              {pendingOrdersCount}
            </span>
          )}
          {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
        </button>
      )}

      {/* 6. CAHIER DE DETTES */}
      {onOpenDebtBook && (
        <button
          id={`${prefix}-btn-dettes`}
          type="button"
          onClick={() => handleGuardedNav(onOpenDebtBook, 'Cahier de Dettes', 'Dettes')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 active:scale-95 transition-all text-[11px] font-semibold cursor-pointer shrink-0"
          title="Cahier de dettes & créances clients"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Dettes</span>
          {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
          {debtCustomerCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-red-500/25 text-red-300 font-bold text-[9px] border border-red-500/40">
              {debtCustomerCount}
            </span>
          )}
        </button>
      )}

      {/* 7. COMPTABILITÉ & RAPPORTS */}
      {onOpenCompta && (
        <button
          id={`${prefix}-btn-compta`}
          type="button"
          onClick={() => handleGuardedNav(onOpenCompta, 'Comptabilité & Rapports', 'Compta')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 active:scale-95 transition-all text-[11px] font-bold cursor-pointer shadow-sm shrink-0"
          title="Comptabilité & Rapports Journaliers"
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Compta</span>
          {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
        </button>
      )}

      {/* 8. CONSEILS VENDEUR (IA) */}
      {onOpenAiAdvisor && (
        <button
          id={`${prefix}-btn-ia`}
          type="button"
          onClick={() => handleGuardedNav(onOpenAiAdvisor, 'Conseiller IA', 'Conseiller IA')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800/80 hover:to-purple-800/80 text-indigo-200 border border-indigo-500/40 active:scale-95 transition-all text-[11px] font-bold cursor-pointer shrink-0"
          title="Conseils & Analyse Proactive du Catalogue"
        >
          <Bot className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
          <span>Conseiller IA</span>
          {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
        </button>
      )}
    </div>
  );

  return (
    <div className={`${hideTicketOnDesktop ? 'min-h-[190px] max-h-[42vh] sm:max-h-[260px] md:h-auto' : 'min-h-[190px] max-h-[42vh] sm:max-h-[260px]'} shrink-0 flex flex-col bg-secondary border-b border-theme text-body transition-colors duration-200 backdrop-blur-md relative ${isToolsDropdownOpen ? 'z-[9999]' : 'z-20'} px-2 sm:px-3 py-1.5 sm:py-2 select-none w-full max-w-full overflow-x-hidden`}>
      {/* Top micro bar: Logo + Boutiquier Profile + Quick Tools (Réseau, PWA, Cadenas, ThemeSwitcher, Menu Hamburger) */}
      <div className={`flex items-center justify-between gap-1 sm:gap-2 pb-1 relative z-30 w-full max-w-full ${isToolsDropdownOpen ? 'overflow-visible' : 'overflow-x-hidden'}`}>
        {/* Section Gauche : Bouton Retour Accueil + Logo NaNa & Boutique */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Bouton Retour à l'accueil (vers la Landing Page) */}
          {onBackToHome && (
            <button
              id="btn-header-back-home"
              type="button"
              onClick={() => {
                playTapBeep();
                onBackToHome();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card hover:bg-card-hover text-body border border-theme transition-all duration-200 active:scale-95 cursor-pointer text-xs font-bold shrink-0 shadow-sm group"
              title="Retour à la page d'accueil principale"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
              <span className="hidden sm:inline">Accueil</span>
            </button>
          )}

          <div
            onClick={handleLogoTap}
            className="flex items-center gap-1.5 cursor-pointer select-none active:scale-95 transition-transform shrink-0"
            title="Nanasore — La Voie Facile"
          >
            <NanasoreLogo variant="compact" size="sm" theme="dark" />
          </div>

          {/* Visage Personnel / Avatar Personnalisable Dynamique (Module d'en-tête) */}
          {(showPersonalAvatar || customAvatarUrl) && (
            <div 
              className={`flex items-center gap-2 pl-2 border-l border-slate-700/60 shrink-0 ${
                headerVariant === 'creator' ? 'bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-500/30' : ''
              }`}
              title="Visage du créateur / profil personnalisé"
            >
              <div className="relative group shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 shadow-md">
                  {customAvatarUrl ? (
                    <img
                      src={customAvatarUrl}
                      alt="Avatar personnel"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-black text-amber-400">
                      👤
                    </div>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
              </div>
              {(customBrandTitle || customSubtitle) && (
                <div className="hidden md:flex flex-col text-left leading-tight max-w-[130px]">
                  {customBrandTitle && (
                    <span className="text-xs font-black text-white tracking-tight truncate">
                      {customBrandTitle}
                    </span>
                  )}
                  {customSubtitle && (
                    <span className="text-[10px] font-bold text-amber-300 truncate">
                      {customSubtitle}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Boutiquier Profile Chip */}
          {currentUser && onOpenAdmin && !showPersonalAvatar && (
            <button
              id="btn-open-boutique-admin"
              type="button"
              onClick={onOpenAdmin}
              className="flex items-center gap-1 sm:gap-1.5 p-1 sm:px-2 sm:py-0.5 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-left transition-all active:scale-95 cursor-pointer max-w-[40px] sm:max-w-[170px] shrink-0"
              title={`Boutique : ${currentUser.storeName} • ID Tenant : ${currentUser.storeId} (Cliquer pour gérer)`}
            >
              <div className="relative shrink-0">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    loading="lazy"
                    decoding="async"
                    className="w-5 h-5 sm:w-4 sm:h-4 rounded-full object-cover border border-amber-400"
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="truncate hidden sm:flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-300 truncate leading-tight">
                  {currentUser.storeName}
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Section Centrale : Défilement Automatique Continu en Boucle (Auto-scroll infini / Marquee) */}
        <div className="relative flex-1 min-w-0 mx-1 sm:mx-2 overflow-hidden">
          {/* Masques de dégradé sur les bords gauche et droite pour un effet visuel soigné */}
          <div className="absolute left-0 top-0 bottom-0 w-3 sm:w-6 bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-3 sm:w-6 bg-gradient-to-l from-[var(--bg-secondary)] via-[var(--bg-secondary)]/80 to-transparent z-10 pointer-events-none" />

          <div
            ref={marqueeContainerRef}
            onMouseEnter={handleMarqueePause}
            onMouseLeave={() => {
              if (isDraggingRef.current) isDraggingRef.current = false;
              handleMarqueeResume(1500);
            }}
            onTouchStart={handleMarqueePause}
            onTouchEnd={() => handleMarqueeResume(1500)}
            onTouchCancel={() => handleMarqueeResume(1500)}
            onWheel={() => {
              handleMarqueePause();
              handleMarqueeResume(1500);
            }}
            onMouseDown={(e) => {
              isDraggingRef.current = true;
              hasDraggedRef.current = false;
              startXRef.current = e.pageX;
              startScrollLeftRef.current = marqueeContainerRef.current?.scrollLeft || 0;
              handleMarqueePause();
            }}
            onMouseMove={(e) => {
              if (!isDraggingRef.current || !marqueeContainerRef.current) return;
              const delta = e.pageX - startXRef.current;
              if (Math.abs(delta) > 5) {
                hasDraggedRef.current = true;
              }
              marqueeContainerRef.current.scrollLeft = startScrollLeftRef.current - delta;
              const content = marqueeContentRef.current;
              if (content && content.offsetWidth > 0) {
                if (marqueeContainerRef.current.scrollLeft >= content.offsetWidth) {
                  marqueeContainerRef.current.scrollLeft -= content.offsetWidth;
                  startScrollLeftRef.current -= content.offsetWidth;
                } else if (marqueeContainerRef.current.scrollLeft <= 0) {
                  marqueeContainerRef.current.scrollLeft += content.offsetWidth;
                  startScrollLeftRef.current += content.offsetWidth;
                }
              }
            }}
            onMouseUp={() => {
              if (isDraggingRef.current) {
                isDraggingRef.current = false;
                setTimeout(() => {
                  hasDraggedRef.current = false;
                }, 100);
                handleMarqueeResume(1500);
              }
            }}
            onScroll={handleScroll}
            className="flex items-center overflow-x-auto scrollbar-none select-none cursor-grab active:cursor-grabbing py-0.5"
            style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {renderNavButtons('set-1')}
            {renderNavButtons('set-2')}
            {renderNavButtons('set-3')}
          </div>
        </div>

        {/* Section Droite : Verrouillage PIN, Statut Réseau, PWA & Menu Déroulant Outils (Hamburger) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Bouton Accès Rapide Central Hub Omnibar */}
          <button
            id="btn-header-open-hub-omnibar"
            type="button"
            onClick={() => {
              playTapBeep();
              window.dispatchEvent(new CustomEvent('nanasore_open_omnibar'));
            }}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1 rounded-xl bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 hover:text-white border border-blue-500/40 active:scale-95 transition-all text-xs font-bold cursor-pointer shrink-0 shadow-sm"
            title="Ouvrir le Hub Central Omnibar (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="hidden md:inline">Hub Central</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 text-[9px] font-mono text-blue-300 bg-blue-950/80 rounded border border-blue-700/50">
              Ctrl K
            </kbd>
          </button>

          {/* Bouton Verrouillage Manuel PIN (Cadenas) */}
          {onLockManual && (
            <button
              id="btn-nav-lock-pos"
              type="button"
              onClick={onLockManual}
              className="flex items-center justify-center min-h-[44px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-2 py-2 sm:px-1.5 sm:py-1 rounded-xl sm:rounded-lg bg-card hover:bg-card-hover text-body hover:text-amber-400 border border-theme active:scale-95 transition-all text-[11px] font-semibold cursor-pointer shrink-0"
              title="Verrouiller la caisse (Code PIN)"
            >
              <Lock className="w-4 h-4 sm:w-3 sm:h-3 text-amber-400" />
            </button>
          )}

          {/* Bouton Installer PWA */}
          <PWAInstallBanner variant="button" />

          {/* Badge Statut Réseau / Hors-Ligne Firestore */}
          <NetworkStatusBadge />

          {/* Theme Switcher Robuste Multi-Thème (Dark, Pur Blanc, Pur Bleu) */}
          <ThemeSwitcher variant="dropdown" showLabels={false} />

          {/* Liste déroulante des boutons avec icônes (Menu Hamburger / Outils) */}
          <div className={`relative shrink-0 ${isToolsDropdownOpen ? 'z-[9999]' : 'z-20'}`} ref={dropdownMenuRef}>
            <button
              id="btn-dropdown-tools-menu"
              type="button"
              onClick={() => setIsToolsDropdownOpen((prev) => !prev)}
              className={`flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-2.5 sm:px-1.5 sm:py-1 rounded-xl sm:rounded-lg border active:scale-95 transition-all text-[11px] font-semibold cursor-pointer ${
                isToolsDropdownOpen
                  ? 'bg-indigo-900 text-white border-indigo-400 shadow-md'
                  : 'bg-card hover:bg-card-hover text-body border-theme shadow-xs'
              }`}
              title="Menu complet des boutons et actions (Hamburger)"
              aria-label="Menu des outils et navigation"
            >
              <Menu className="w-5 h-5 sm:hidden text-indigo-400" />
              <Sliders className="hidden sm:inline w-3.5 h-3.5 text-indigo-400" />
              <ChevronDown className={`hidden sm:inline w-3 h-3 transition-transform duration-200 ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolsDropdownOpen && (
              <div
                id="dropdown-tools-menu-list"
                className="absolute right-0 top-full mt-2 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-card border border-theme rounded-2xl shadow-2xl py-2 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150 overflow-y-auto text-body"
                style={{
                  maxHeight: 'calc(100vh - 120px)',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-theme flex items-center justify-between">
                  <span>Actions & Outils</span>
                </div>

                {/* ENTRÉE PRIORITAIRE : TARIFS & ABONNEMENTS */}
                {/* TARIFS & ABONNEMENTS */}
                {onOpenPaywall && (
                  <button
                    id="dropdown-item-pricing"
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      handleGuardedNav(onOpenPaywall, 'Tarifs & Abonnements', 'Abonnement');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-950/80 text-amber-700 dark:text-amber-300 transition-all cursor-pointer font-bold group border-b border-slate-100 dark:border-slate-800/60"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 group-hover:bg-amber-500/30">
                      <CreditCard className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold leading-none text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Tarifs & Abonnements</span>
                        {isExpired ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:bg-rose-500/30 dark:text-rose-300 font-normal">Expiré</span>
                        ) : isTrial ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200 font-normal">{daysLeft}j</span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200 font-normal">Actif</span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">Offres Pro, Illimité & Mobile Money</div>
                    </div>
                    {isCashierMode && <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 ml-auto" />}
                  </button>
                )}

                {/* DIRECT CAMÉRA & SÉCURITÉ (SURVEILLANCE VIDÉO MAGASIN) */}
                <button
                  id="dropdown-item-camera-surveillance"
                  type="button"
                  onClick={handleOpenStoreCam}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-cyan-50 dark:hover:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 transition-all cursor-pointer font-bold group border-b border-slate-100 dark:border-slate-800/60"
                >
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/30">
                    <Camera className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold leading-none text-slate-900 dark:text-white">Surveillance Vidéo Magasin</div>
                    <div className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">Direct Caméra & Sécurité</div>
                  </div>
                </button>

                {/* 1. TABLEAU DE BORD */}
                {onOpenReports && (
                  <button
                    id="dropdown-item-reports"
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      handleGuardedNav(onOpenReports, 'Tableau de Bord', 'Tableau de Bord');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-white transition-all cursor-pointer font-semibold"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span className="text-xs">Tableau de Bord</span>
                    {isCashierMode && <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 ml-auto" />}
                  </button>
                )}

                {/* 2. STOCK & INVENTAIRE */}
                {onOpenInventory && (
                  <button
                    id="dropdown-item-inventory"
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      handleGuardedNav(onOpenInventory, 'Stock & Inventaire', 'Stock');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-white transition-all cursor-pointer font-semibold"
                  >
                    <Boxes className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span className="text-xs">Stock & Inventaire</span>
                    {isCashierMode && <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 ml-auto" />}
                  </button>
                )}

                {onOpenCustomerOrders && (
                  <button
                    id="dropdown-item-bons"
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      handleGuardedNav(onOpenCustomerOrders, 'Commandes & Livraisons', 'Commandes');
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-white transition-all cursor-pointer font-semibold"
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="text-xs">📦 Commandes & Livraisons</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {pendingOrdersCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                          {pendingOrdersCount}
                        </span>
                      )}
                      {isCashierMode && <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />}
                    </div>
                  </button>
                )}

                {/* 4. CAHIER DE DETTES */}
                {onOpenDebtBook && (
                  <button
                    id="dropdown-item-debts"
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      handleGuardedNav(onOpenDebtBook, 'Cahier de Dettes', 'Dettes');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-300 hover:text-rose-800 dark:hover:text-white transition-all cursor-pointer font-semibold"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                    <span className="text-xs">Cahier de Dettes</span>
                    {debtCustomerCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-600 dark:text-red-300 text-[10px] font-bold">
                        {debtCustomerCount}
                      </span>
                    )}
                    {isCashierMode && <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 ml-auto" />}
                  </button>
                )}

                {/* 5. COMPTABILITÉ & RAPPORTS */}
                {onOpenCompta && (
                  <button
                    id="dropdown-item-compta"
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      handleGuardedNav(onOpenCompta, 'Comptabilité & Rapports', 'Compta');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-white transition-all cursor-pointer font-semibold"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs">Comptabilité & Rapports</span>
                    {isCashierMode && <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 ml-auto" />}
                  </button>
                )}

                {/* 6. CONSEILLER IA */}
                {onOpenAiAdvisor && (
                  <button
                    id="dropdown-item-ai"
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      handleGuardedNav(onOpenAiAdvisor, 'Conseiller IA', 'Conseiller IA');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-white transition-all cursor-pointer font-semibold"
                  >
                    <Bot className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs">Conseiller IA</span>
                    {isCashierMode && <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 ml-auto" />}
                  </button>
                )}

                {onOpenSettings && (
                  <button
                    id="dropdown-item-settings"
                    type="button"
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      handleGuardedNav(onOpenSettings, 'Paramètres & Modules', 'Paramètres');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer font-semibold border-t border-slate-800 mt-1 pt-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs flex items-center gap-1.5">
                      <span>Paramètres & Modules</span>
                      {isFreeAccount && <ProCrownIcon size="xs" />}
                    </span>
                    {isCashierMode && <Lock className="w-3 h-3 text-amber-400 shrink-0 ml-auto" />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket en temps réel (Liste défilante) */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto min-h-0 py-1.5 space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700 relative z-10 ${hideTicketOnDesktop ? 'md:hidden' : ''}`}
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-2 text-center">
            <ShoppingBag className="w-5 h-5 text-blue-400/40 mb-1" />
            <p className="font-medium text-slate-300">Ticket en attente</p>
            <p className="text-[11px] text-slate-500">Touchez un article ou maintenez le micro</p>
          </div>
        ) : (
          cart.map((item) => {
            const lineTotal = item.price * item.quantity;
            return (
              <div
                key={item.id}
                className="relative z-10 overflow-visible flex items-center justify-between bg-card hover:bg-card-hover rounded-xl p-2 sm:p-2.5 border border-theme shadow-sm transition-all gap-1.5 sm:gap-2 text-body"
              >
                {/* Information Produit */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Photo ou Vignette Produit */}
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-input border border-theme shrink-0 overflow-hidden flex items-center justify-center">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-[11px] font-black text-blue-400">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Nom & Prix Unitaire */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-body text-xs sm:text-sm truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted font-mono flex items-center gap-1.5">
                      <span className="text-body font-semibold">{formatCFA(item.price)}</span>
                      <span className="text-muted">/u</span>
                      {item.barcode && (
                        <span className="text-[9px] text-amber-500/80 truncate hidden xs:inline">
                          • {item.barcode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contrôles de Quantité Ergonomiques (+ / -) & Total de la Ligne */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative z-20 overflow-visible">
                  {/* Stepper tactile compact foregrounded [-] [Qty] [+] */}
                  <div className="flex items-center bg-input rounded-xl border border-theme p-0.5 shadow-sm shrink-0 relative z-20 overflow-visible">
                    {/* Bouton [-] : Décrémenter ou Supprimer proprement à 1 */}
                    <button
                      id={`btn-cart-minus-${item.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapBeep();
                        if (item.quantity <= 1) {
                          onRemoveItem(item.id);
                        } else {
                          onUpdateQuantity(item.id, -1);
                        }
                      }}
                      className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg active:scale-90 transition-all cursor-pointer touch-manipulation select-none relative z-30 ${
                        item.quantity <= 1
                          ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-500/60 shadow-xs'
                          : 'bg-card hover:bg-card-hover text-body border border-theme'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                      title={item.quantity <= 1 ? "Supprimer le produit du panier" : "Diminuer la quantité (-1)"}
                      aria-label="Diminuer la quantité"
                    >
                      {item.quantity <= 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Minus className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </button>

                    {/* Affichage Quantité Centrale */}
                    <span
                      id={`cart-item-qty-${item.id}`}
                      className="min-w-[28px] sm:min-w-[32px] text-center font-black text-xs sm:text-sm text-amber-400 font-mono select-none px-1 relative z-20"
                      title={`Quantité actuelle : ${item.quantity}`}
                    >
                      {item.quantity}
                    </span>

                    {/* Bouton [+] : Incrémenter la quantité */}
                    <button
                      id={`btn-cart-plus-${item.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapBeep();
                        onUpdateQuantity(item.id, 1);
                      }}
                      className="w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black active:scale-90 transition-all cursor-pointer border border-blue-400/50 shadow-md shadow-blue-500/30 touch-manipulation select-none relative z-30"
                      style={{ touchAction: 'manipulation' }}
                      title="Augmenter la quantité (+1)"
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Total de la Ligne (Prix unitaire x Quantité) */}
                  <div className="hidden xs:block min-w-[55px] sm:min-w-[70px] text-right font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-300 font-mono tracking-tight shrink-0">
                    {formatCFA(lineTotal)}
                  </div>

                  {/* Bouton Poubelle / Retirer direct */}
                  <button
                    id={`btn-cart-delete-${item.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapBeep();
                      onRemoveItem(item.id);
                    }}
                    className="p-1.5 sm:p-2 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all cursor-pointer touch-manipulation shrink-0 relative z-20"
                    title="Retirer / Supprimer l'article du panier"
                    aria-label="Supprimer l'article"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom of Receipt: Total en TRES GROS CARACTERES + Bouton Paiement Cash */}
      <div className={`pt-1.5 mt-auto border-t border-theme flex items-center justify-between gap-3 ${hideTicketOnDesktop ? 'md:hidden' : ''}`}>
        <div>
          <div className="text-[11px] text-muted font-medium uppercase tracking-wider flex items-center gap-1">
            <span>Total Ticket</span>
            {itemCount > 0 && (
              <span className="text-blue-500 dark:text-blue-400 font-bold">({itemCount} art.)</span>
            )}
          </div>
          {/* TOTAL EN TRES GROS CARACTERES (ex: 1 500 F CFA) */}
          <div
            id="ticket-grand-total"
            className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-body font-mono leading-none drop-shadow-[0_2px_10px_rgba(37,99,235,0.15)]"
          >
            {formatCFA(total)}
          </div>
        </div>

        {/* Actions Caisse: Imprimer, PDF & Paiement Cash */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
          {/* Bouton Télécharger Facture PDF */}
          {onDownloadPdfReceipt && (
            <button
              id="btn-pdf-ticket-caisse"
              type="button"
              disabled={cart.length === 0}
              onClick={onDownloadPdfReceipt}
              className={`p-2.5 sm:py-3 sm:px-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 border transition-all cursor-pointer active:scale-95 ${
                cart.length > 0
                  ? 'bg-card hover:bg-card-hover text-emerald-600 dark:text-emerald-300 border-theme shadow-xs'
                  : 'bg-input text-muted border-theme cursor-not-allowed opacity-50'
              }`}
              title="Télécharger la facture sous format PDF (jsPDF)"
            >
              <FileDown className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}

          {/* Double Option d'Encaissement */}
          <div className="flex flex-1 sm:flex-none items-center gap-1.5">
            {/* 1. Validation Rapide Cash */}
            <button
              id="btn-validation-rapide"
              type="button"
              onClick={onQuickCashCheckout}
              disabled={total === 0}
              className={`flex-1 sm:flex-none px-3 py-2.5 sm:py-3 rounded-xl font-black text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 ${
                total > 0
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:brightness-110 text-white border border-emerald-400/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
              }`}
              title="Validation Rapide Cash (1-clic direct dans Firestore)"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-100" />
              <span className="tracking-tight whitespace-nowrap text-center leading-tight">
                Rapide<br className="sm:hidden" /> Cash
              </span>
            </button>

            {/* 2. Finaliser & Reçu */}
            <button
              id="btn-paiement-cash"
              type="button"
              disabled={total === 0}
              onClick={onOpenCashPayment}
              className={`flex-1 sm:flex-none px-3 py-2.5 sm:py-3 rounded-xl font-black text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 ${
                total > 0
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:brightness-110 text-white shadow-blue-500/25 border border-blue-400/40 ring-1 ring-blue-400/20 animate-pulse'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
              }`}
            >
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="tracking-tight uppercase whitespace-nowrap text-center leading-tight">
                Finaliser<br className="sm:hidden" /> & Reçu
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default HeaderReceipt;
