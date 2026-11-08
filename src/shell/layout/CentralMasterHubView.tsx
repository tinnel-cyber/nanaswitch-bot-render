import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Megaphone,
  PlaySquare,
  Wand2,
  ShoppingBag,
  Store,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  CreditCard,
  Users,
  Database,
  BarChart3,
  Bot,
  FileBadge,
  Radio,
  Share2,
  Plug,
  ShieldCheck,
  Settings,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lock,
  Boxes,
  PhoneCall,
  DollarSign,
  Wallet,
  Zap,
  Globe,
  Sliders,
  Check,
  X,
  Printer,
  Calendar,
  Layers,
  Flame,
  LayoutGrid,
  User,
  Mail,
  Building,
  UploadCloud,
  Camera,
  Image as ImageIcon,
  ShieldAlert,
  BadgeCheck,
  Loader2,
  MapPin,
  FileCheck,
  Award,
  UserCheck,
  Building2,
  FileCheck2,
  Fingerprint,
  CheckCheck,
  GraduationCap,
  Gift,
  PlusCircle,
  Palette,
  MoreVertical
} from 'lucide-react';
import { 
  StoreUser, 
  StoreSubscription, 
  SellerMode,
  CompletedSale, 
  InventoryProduct, 
  DebtCustomer, 
  CustomerOrder,
  KycSubmission,
  KycStatus,
  KycDocumentType,
  IdentificationChain,
  IndividualKycData,
  BusinessKycData,
  IdentificationStepStatus
} from '../../types';
import { 
  submitKycRequest, 
  getStoreKycRequest, 
  compressImageToBase64,
  DEFAULT_NANASORE_CHAIN,
  saveIdentificationChain,
  getIdentificationChain,
  submitKycSubmission
} from '../../utils/kycService';
import { MerchantIdentificationChainView } from '../../components/kyc/MerchantIdentificationChainView';
import { checkAndBlockDemoAction } from '../../utils/demoSecurityGuard';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';
import { DashboardQuotaMonitorSwitch } from '../../components/quotas';
import { HybridAnalyticsCardsGrid } from '../../components/dashboard/HybridAnalyticsCardsGrid';
import { Crown } from 'lucide-react';
import { AppSidebar } from '../../components/common/AppSidebar';
import { getSafeStoreSlug } from '../../utils/slugEngine';
import { ensureAndPersistTenantSlug } from '../../utils/slugService';
import { UpsellModal } from '../../components/quotas/UpsellModal';
import { ProFeaturesModal, ProFeatureTab } from '../../components/ProFeaturesModal';
import { CertificatePreviewModal } from '../../components/lms/CertificatePreviewModal';
import { 
  isFreePlan, 
  resolveVendorType, 
  resolveSellerMode,
  persistSellerModeLocally,
  triggerProFeatureUpsell, 
  ProFeatureKey 
} from '../../utils/planFeatures';
import { updateSellerModeInFirestore } from '../../utils/firestoreService';
import { WameetLogo, WameetSquircleIcon } from '../../components/wameet/WameetLogo';
import { NanasoreLogo, NanasorePasserelleIcon } from '../../components/common/NanasoreLogo';
import { AppOmnibar } from '../../components/dashboard/AppOmnibar';
import { getTaxonomyBadge, ExpandableModuleDescription } from '../../components/CentralHubOmnibar';
import { APPS_REGISTRY, AppRegistryItem } from '../../data/appsRegistry';
import { useActiveOmnibarApps } from '../../hooks/useActiveOmnibarApps';
import { toggleModuleStatus } from '../../services/moduleActivationService';
import { OFFICIAL_MODULES } from '../../appRegistry';
import { ALL_SOLUTIONS_CATALOG, CatalogItem, TaxonomyType } from '../../components/common/AppSidebar';
import { 
  listenToTenantApps, 
  resolveCurrentTenantId, 
  InstalledAppData, 
  DEFAULT_PINNED_APPS 
} from '../../services/appActivationService';
import { BrevoEmailComposerModal } from '../../components/email/BrevoEmailComposerModal';
import { GrowthDirectorAssistant } from '../../components/tenant/GrowthDirectorAssistant';

export type MasterHubCategory = 
  | 'ALL'
  | 'COMMERCE'
  | 'FINANCE'
  | 'AI'
  | 'MARKETING'
  | 'TECH';

export interface GeneralSettingsData {
  companyName: string;
  storeName: string;
  managerFullName: string;
  email: string;
  whatsappPhone: string;
  address: string;
  ifuNumber: string;
  rccmNumber: string;
  countryCode: string;
  currencySymbol: string;
  logoUrl?: string;
  bannerUrl?: string;
  isStoreOpen: boolean;
  autoPrintReceipts: boolean;
  enableCreditSales: boolean;
  taxRate: number; // 0 ou 18%
  acceptedPayments: {
    cash: boolean;
    orangeMoney: boolean;
    moovMoney: boolean;
    wave: boolean;
    mtn: boolean;
    crypto: boolean;
  };
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettingsData = {
  companyName: "NANASORE",
  storeName: "NANASORE BOUTIQUE",
  managerFullName: "Gérant Boutique",
  email: "contact@nanasore.com",
  whatsappPhone: "+226 70 00 00 00",
  address: "Avenue Kwamé N'Krumah, Ouagadougou, Burkina Faso",
  ifuNumber: "00123456B",
  rccmNumber: "BF-OUA-01-2024-B12-0042",
  countryCode: "BF",
  currencySymbol: "F CFA",
  logoUrl: "/nanasore-icon.svg?v=nanasore_arrow_v3",
  bannerUrl: "",
  isStoreOpen: true,
  autoPrintReceipts: false,
  enableCreditSales: true,
  taxRate: 0,
  acceptedPayments: {
    cash: true,
    orangeMoney: true,
    moovMoney: true,
    wave: true,
    mtn: false,
    crypto: false,
  }
};

export interface CentralMasterHubViewProps {
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  sales?: CompletedSale[];
  inventory?: InventoryProduct[];
  customers?: DebtCustomer[];
  customerOrders?: CustomerOrder[];
  onNavigate: (view: any) => void;
  onOpenGeneralSettings?: () => void;
  onOpenExcelImporter?: () => void;
  onOpenWebinarModal?: () => void;
  onOpenMarketingAi?: (product?: any) => void;
  onOpenAffiliation?: () => void;
  onOpenAdmin?: () => void;
  onOpenSaasAdmin?: () => void;
  onOpenSecretAdminModal?: () => void;
  onOpenDocuSign?: (title?: string) => void;
  onLockSession?: () => void;
  onNavigateToCatalog?: () => void;
  onOpenUpgrade?: () => void;
  onOpenAcademy?: () => void;
}

export const CentralMasterHubView: React.FC<CentralMasterHubViewProps> = ({
  currentUser,
  subscription,
  sales = [],
  inventory = [],
  customers = [],
  customerOrders = [],
  onNavigate,
  onOpenGeneralSettings,
  onOpenExcelImporter,
  onOpenWebinarModal,
  onOpenMarketingAi,
  onOpenAffiliation,
  onOpenAdmin,
  onOpenSaasAdmin,
  onOpenSecretAdminModal,
  onOpenDocuSign,
  onLockSession,
  onNavigateToCatalog,
  onOpenUpgrade,
  onOpenAcademy
}) => {
  const isFree = isFreePlan(subscription);

  const [sellerMode, setSellerMode] = useState<SellerMode>(() => resolveSellerMode(currentUser));
  const [showSecondaryPosTools, setShowSecondaryPosTools] = useState<boolean>(false);

  useEffect(() => {
    setSellerMode(resolveSellerMode(currentUser));
  }, [currentUser?.sellerMode, currentUser?.vendorType]);

  useEffect(() => {
    const handleModeChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ sellerMode?: SellerMode }>;
      if (customEvent.detail?.sellerMode) {
        setSellerMode(customEvent.detail.sellerMode);
      } else {
        setSellerMode(resolveSellerMode(currentUser));
      }
    };
    window.addEventListener('nanasore_seller_mode_changed', handleModeChanged);
    return () => window.removeEventListener('nanasore_seller_mode_changed', handleModeChanged);
  }, [currentUser]);

  const handleSelectSellerMode = (mode: SellerMode) => {
    playTapBeep();
    setSellerMode(mode);
    persistSellerModeLocally(mode);
    updateSellerModeInFirestore(mode, currentUser?.id, currentUser?.storeId).catch(() => {});
  };

  const vendorType = sellerMode === 'creator_trainer' ? 'elearning' : 'ecommerce';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Déclencheur secret Super Admin (5 clics sur le logo)
  const [logoTapCount, setLogoTapCount] = useState(0);
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
        if (onOpenSecretAdminModal) {
          onOpenSecretAdminModal();
        } else if (onOpenSaasAdmin) {
          onOpenSaasAdmin();
        }
        return 0;
      }
      logoTapTimerRef.current = setTimeout(() => setLogoTapCount(0), 1500);
      return next;
    });
  };

  // 1. Paramètres Généraux & Persistance Locale
  const [settings, setSettings] = useState<GeneralSettingsData>(() => {
    try {
      const saved = localStorage.getItem('nana_merchant_general_settings') || localStorage.getItem('nana_konkobo_general_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_GENERAL_SETTINGS,
          ...parsed,
          managerFullName: parsed.managerFullName || currentUser?.name || DEFAULT_GENERAL_SETTINGS.managerFullName,
          email: parsed.email || currentUser?.email || DEFAULT_GENERAL_SETTINGS.email,
          whatsappPhone: parsed.whatsappPhone || currentUser?.phone || DEFAULT_GENERAL_SETTINGS.whatsappPhone,
          companyName: (!parsed.companyName || parsed.companyName.includes("KONKOBO") ? "NANASORE" : parsed.companyName) || DEFAULT_GENERAL_SETTINGS.companyName,
          storeName: parsed.storeName || currentUser?.storeName || DEFAULT_GENERAL_SETTINGS.storeName,
          logoUrl: parsed.logoUrl || currentUser?.avatarUrl || DEFAULT_GENERAL_SETTINGS.logoUrl,
          bannerUrl: parsed.bannerUrl || DEFAULT_GENERAL_SETTINGS.bannerUrl,
        };
      }
    } catch (e) {}
    return {
      ...DEFAULT_GENERAL_SETTINGS,
      managerFullName: currentUser?.name || DEFAULT_GENERAL_SETTINGS.managerFullName,
      email: currentUser?.email || DEFAULT_GENERAL_SETTINGS.email,
      whatsappPhone: currentUser?.phone || DEFAULT_GENERAL_SETTINGS.whatsappPhone,
      storeName: currentUser?.storeName || DEFAULT_GENERAL_SETTINGS.storeName,
      logoUrl: currentUser?.avatarUrl || DEFAULT_GENERAL_SETTINGS.logoUrl,
    };
  });

  const storeSlug = getSafeStoreSlug(settings as any, currentUser as any) || currentUser?.storeId || currentUser?.uid || 'ma-boutique';
  useEffect(() => {
    if (typeof window !== 'undefined' && storeSlug) {
      (window as any).storeSlug = storeSlug;
    }
    // Enregistrement stable du slug dans Firestore pour ce tenant
    const effectiveStoreId = currentUser?.storeId || currentUser?.uid;
    if (effectiveStoreId) {
      ensureAndPersistTenantSlug(effectiveStoreId, settings, currentUser?.uid).catch((err) => {
        console.warn('[SLUG AUTO-HEAL] Erreur persistance auto du slug tenant :', err);
      });
    }
  }, [storeSlug, currentUser?.storeId, currentUser?.uid]);

  const handleModuleClick = (targetView: string, pathOverride?: string) => {
    const effectiveStoreId = currentUser?.storeId || currentUser?.uid;
    if (effectiveStoreId) {
      ensureAndPersistTenantSlug(effectiveStoreId, settings, currentUser?.uid).catch(() => {});
    }
    if (pathOverride && typeof window !== 'undefined') {
      window.history.pushState({}, '', pathOverride);
    }
    onNavigate(targetView as any);
  };

  const handleOpenAppFromOmnibar = async (app: AppRegistryItem | any) => {
    if (app?.id) {
      // Synchronisation immédiate avec Firebase Realtime Database
      try {
        await toggleModuleStatus(app.id, true, tenantId);
      } catch (err) {
        console.warn('[HUB] Erreur synchronisation activation module RTDB :', err);
      }
    }
    if (app.id === 'nanagenerator' || app.id === 'studio-ia') {
      if (onOpenMarketingAi) {
        onOpenMarketingAi();
      } else {
        handleModuleClick('AI_STUDIO', app.route);
      }
      return;
    }
    if (app.isPro && app.proKey) {
      openProFeature(app.proKey as ProFeatureTab);
      return;
    }
    const appId = (app.id || '').toLowerCase();
    const appTitle = ((app as any).title || (app as any).name || '').toLowerCase();
    const appRoute = (app.route || (app as any).routeUrl || '').toLowerCase();

    // Protection des modules en construction (ne répondent pas à l'appel)
    if (appId === 'nana-switch' || appId === 'wameet' || appId === 'srv-nana-switch' || appId === 'app-wameet' || app.isUnderConstruction) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nana_show_toast', {
          detail: {
            title: 'Module en construction',
            message: `Le module "${(app as any).title || (app as any).name || 'Sélectionné'}" est actuellement en cours de finalisation et ne répond pas aux appels.`,
            type: 'info'
          }
        }));
      }
      return;
    }

    // Protection stricte de CRM et Automation : module réservé exclusivement au Super Administrateur
    if (appId === 'crm-automation' || appId === 'srv-crm-automation' || appTitle.includes('crm et automation') || appRoute.includes('connecteurs')) {
      if (!isSuperAdminLocally(currentUser)) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nana_show_toast', {
            detail: {
              title: 'Accès Réservé Super Admin',
              message: 'Le module "CRM et Automation / Connecteurs" est un module d’infrastructure réservé exclusivement au Super Administrateur.',
              type: 'warning'
            }
          }));
        }
        return;
      }
      handleModuleClick('SETTINGS_EXTENSIONS', '/dashboard/connecteurs');
      return;
    }

    // Routage direct pour l'Application CV Pro
    if (appId === 'cvpro' || appId === 'mod-cvpro' || appId === 'app-cvpro' || appTitle.includes('cvpro') || appTitle.includes('cv pro')) {
      handleModuleClick('CV_CREATOR', '/dashboard/cv');
      return;
    }
      if (!settings.isStoreOpen) {
        setShowStoreClosedPrompt(true);
        return;
      }
      handleModuleClick('POS', app.route || '/pos');
      return;
    }
    if (appTitle.includes('stock') || appTitle.includes('inventaire') || appRoute.includes('inventory') || appId.includes('inventory')) {
      handleModuleClick('INVENTORY', app.route || '/inventory');
      return;
    }
    if (appTitle.includes('factur') || appTitle.includes('devis') || appRoute.includes('invoice') || appId.includes('invoice')) {
      handleModuleClick('INVOICES', app.route || '/invoices');
      return;
    }
    if (appTitle.includes('dette') || appTitle.includes('crédit') || appTitle.includes('credit') || appRoute.includes('debt') || appId.includes('debt')) {
      handleModuleClick('CUSTOMERS', app.route || '/debts');
      return;
    }
    if (appTitle.includes('crm et automation') || appTitle.includes('crm & automation') || appId.includes('crm-automation') || appRoute.includes('connecteurs')) {
      handleModuleClick('SETTINGS_EXTENSIONS', '/dashboard/connecteurs');
      return;
    }
    if (appTitle.includes('crm') || appRoute.includes('crm') || appId.includes('crm')) {
      handleModuleClick('CRM', app.route || '/crm');
      return;
    }
    if (app.id === 'excel-importer' && onOpenExcelImporter) {
      onOpenExcelImporter();
      return;
    }
    if (app.id === 'live-webinar' && onOpenWebinarModal) {
      onOpenWebinarModal();
      return;
    }
    if (app.id === 'partners-affiliate' && onOpenAffiliation) {
      onOpenAffiliation();
      return;
    }
    if (app.id === 'docusign-hub' && onOpenDocuSign) {
      onOpenDocuSign();
      return;
    }
    if (app.id === 'nana-academy' && onOpenAcademy) {
      onOpenAcademy();
      return;
    }
    if (app.targetView) {
      handleModuleClick(app.targetView, app.route);
    } else {
      handleModuleClick('MASTER_HUB', app.route);
    }
  };

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<'PROFILE' | 'CURRENCY' | 'PAYMENTS' | 'INVOICING'>('PROFILE');
  const [isKycChainWizardOpen, setIsKycChainWizardOpen] = useState(false);
  const [kycWizardInitialType, setKycWizardInitialType] = useState<'particulier' | 'entreprise'>('particulier');
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalTab, setProModalTab] = useState<ProFeatureTab>('CUSTOM_DOMAIN');
  const [showStoreClosedPrompt, setShowStoreClosedPrompt] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [composerRecipient, setComposerRecipient] = useState('');
  const [composerSubject, setComposerSubject] = useState('');

  const openProFeature = (tab: ProFeatureTab) => {
    playTapBeep();
    setProModalTab(tab);
    setIsProModalOpen(true);
  };

  // Chaîne d'identification séquentielle (Partie 1 Individuel + Partie 2 Entreprise)
  const [idChain, setIdChain] = useState<IdentificationChain>(() => {
    const sId = currentUser?.storeId || 'store-nanasore-main';
    try {
      const local = localStorage.getItem(`nana_id_chain_${sId}`);
      if (local) return JSON.parse(local);
    } catch (e) {}
    return { ...DEFAULT_NANASORE_CHAIN, storeId: sId };
  });

  // Synchronisation dynamique avec Firestore et les événements locaux
  useEffect(() => {
    const sId = currentUser?.storeId || 'store-nanasore-main';
    getIdentificationChain(sId).then(chain => {
      if (chain) setIdChain(chain);
    });

    const handleChainUpdated = (e: any) => {
      if (e.detail?.chain) {
        setIdChain(e.detail.chain);
      } else {
        getIdentificationChain(sId).then(chain => {
          if (chain) setIdChain(chain);
        });
      }
    };
    window.addEventListener('nana_id_chain_updated', handleChainUpdated);
    const handleOpenKycModal = (e: any) => {
      const type = e.detail?.step === 2 || e.detail?.type === 'entreprise' ? 'entreprise' : 'particulier';
      setKycWizardInitialType(type);
      setIsKycChainWizardOpen(true);
    };
    window.addEventListener('nanasore_open_kyc', handleOpenKycModal);

    const handleOpenSubPlans = () => {
      if (onOpenUpgrade) onOpenUpgrade();
      else setIsProModalOpen(true);
    };
    window.addEventListener('nanasore_open_subscription_plans', handleOpenSubPlans);

    return () => {
      window.removeEventListener('nana_id_chain_updated', handleChainUpdated);
      window.removeEventListener('nanasore_open_kyc', handleOpenKycModal);
      window.removeEventListener('nanasore_open_subscription_plans', handleOpenSubPlans);
    };
  }, [currentUser?.storeId, onOpenUpgrade]);

  // Détection du Modèle Abonnement vs Commission
  const isSubscriptionModel = useMemo(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('nana_merchant_pricing_model') : null;
    return (
      stored === 'subscription' ||
      currentUser?.pricing_model === 'subscription' ||
      idChain?.monetizationModel === 'subscription' ||
      idChain?.pricingModel === 'subscription'
    );
  }, [currentUser?.pricing_model, idChain]);

  const isSubscriptionActive = useMemo(() => {
    return subscription?.status === 'ACTIVE' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  }, [subscription?.status, currentUser?.role]);

  // Si le marchand a opté pour l'abonnement et n'a pas encore souscrit
  const isSubscriptionPending = isSubscriptionModel && !isSubscriptionActive;

  const openSettingsWithTab = (tab: 'PROFILE' | 'CURRENCY' | 'PAYMENTS' | 'INVOICING' = 'PROFILE') => {
    playTapBeep();
    setSettingsModalTab(tab);
    setIsSettingsModalOpen(true);
  };

  // État du tiroir des solutions activées (ouvert par les 3 tirets / points carrément en haut à droite)
  const [isActiveSolutionsDrawerOpen, setIsActiveSolutionsDrawerOpen] = useState(false);

  // État de la modale / liste complète des 36 solutions (ouvert par le bouton icône Layers)
  const [isSolutionsCatalogOpen, setIsSolutionsCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTaxonomyFilter, setCatalogTaxonomyFilter] = useState<'ALL' | TaxonomyType>('ALL');

  // Synchronisation temps réel des solutions activées pour le marchand
  const tenantId = useMemo(() => resolveCurrentTenantId(currentUser), [currentUser]);
  const {
    isModuleActive: isOmnibarModuleActive,
    modules: omnibarOfficialModules
  } = useActiveOmnibarApps(tenantId);
  const [installedAppsMap, setInstalledAppsMap] = useState<Record<string, InstalledAppData>>(() => DEFAULT_PINNED_APPS);

  useEffect(() => {
    const unsubscribe = listenToTenantApps(tenantId, (apps) => {
      if (apps && Object.keys(apps).length > 0) {
        setInstalledAppsMap(apps);
      }
    });
    return unsubscribe;
  }, [tenantId]);

  // Liste des applications activées avec logos vectoriels et métadonnées
  const activePinnedApps = useMemo(() => {
    const list: { app: AppRegistryItem; data: InstalledAppData }[] = [];
    const addedIds = new Set<string>();

    // 1. Modules officiels activés en temps réel via Firebase RTDB (/tenants/{tenantId}/modules)
    omnibarOfficialModules.forEach((mod) => {
      if (mod.enabled) {
        addedIds.add(mod.id);
        if (mod.aliases) mod.aliases.forEach((a) => addedIds.add(a));
        list.push({
          app: {
            id: mod.id,
            appName: mod.name,
            appLogo: '/assets/icons/apps/caisse.svg',
            shortDescription: mod.description,
            category: mod.category,
            keywords: mod.keywords || [],
            route: mod.route,
            installationType: 'installed',
            trialType: 'freemium',
            priceMonthly: 0,
            palmares: '✅ Module Actif',
            badge: mod.taxonomy,
            taxonomyType: mod.taxonomy === 'APPLICATION' ? 'Application' : mod.taxonomy === 'SERVICE' ? 'Service' : mod.taxonomy === 'MODULE' ? 'Module' : 'Outil',
            targetView: mod.view || mod.targetView
          },
          data: {
            status: 'active',
            activatedAt: mod.updatedAt || Date.now(),
            expiresAt: null,
            pinnedToSidebar: true
          }
        });
      }
    });

    // 2. Apps installées dans installedAppsMap
    Object.entries(installedAppsMap).forEach(([appId, data]) => {
      if (addedIds.has(appId)) return;
      if (data.pinnedToSidebar || data.status === 'active' || data.status === 'trial') {
        const found = APPS_REGISTRY.find((a) => a.id === appId);
        if (found) {
          addedIds.add(found.id);
          list.push({ app: found, data });
        }
      }
    });

    if (list.length === 0) {
      Object.keys(DEFAULT_PINNED_APPS).forEach((appId) => {
        const found = APPS_REGISTRY.find((a) => a.id === appId);
        if (found && !addedIds.has(found.id)) {
          list.push({ app: found, data: DEFAULT_PINNED_APPS[appId] });
        }
      });
    }
    return list;
  }, [installedAppsMap, omnibarOfficialModules]);

  // Filtrage dynamique du catalogue des 36 solutions
  const filteredSolutionsCatalog = useMemo(() => {
    return ALL_SOLUTIONS_CATALOG.filter((item) => {
      if (catalogTaxonomyFilter !== 'ALL' && item.taxonomy !== catalogTaxonomyFilter) {
        return false;
      }
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.taxonomy.toLowerCase().includes(q)
      );
    });
  }, [catalogSearch, catalogTaxonomyFilter]);

  const handleCatalogItemClick = (item: CatalogItem) => {
    playTapBeep();
    setIsSolutionsCatalogOpen(false);
    if (item.actionId === 'EMPLOYEE_MANAGEMENT') {
      openProFeature('EMPLOYEE_MANAGEMENT');
      return;
    }
    if (item.actionId === 'SOVEREIGN_GATEWAY') {
      openProFeature('SOVEREIGN_GATEWAY');
      return;
    }
    if (item.actionId === 'TRACKING_PIXELS_CRM') {
      openProFeature('TRACKING_PIXELS_CRM');
      return;
    }
    if (item.route && typeof window !== 'undefined') {
      window.history.pushState({}, '', item.route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    if (item.view) {
      onNavigate(item.view);
    }
  };

  const getCatalogBadgeStyle = (tax: TaxonomyType) => {
    switch (tax) {
      case 'APPLICATION':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]';
      case 'SERVICE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
      case 'MODULE':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-[0_0_8px_rgba(168,85,247,0.3)]';
      case 'OUTIL':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
    }
  };

  const getCatalogBadgeLabel = (tax: TaxonomyType) => {
    switch (tax) {
      case 'APPLICATION': return 'Application';
      case 'SERVICE': return 'Service';
      case 'MODULE': return 'Module';
      case 'OUTIL': return 'Outil';
    }
  };

  const [activeCategory, setActiveCategory] = useState<MasterHubCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChartPeriod, setActiveChartPeriod] = useState<'7D' | '30D' | 'TODAY'>('7D');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // État de repliement / dépliement des sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    commerce: false,
    finance: false,
    ai: false,
    marketing: false,
    tech: false
  });

  const toggleSection = (sectionKey: string) => {
    playTapBeep();
    setCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Horloge en temps réel pour le statut du shift
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sauvegarde des paramètres généraux
  const handleSaveSettings = (newSettings: GeneralSettingsData) => {
    playValidationBeep();
    setSettings(newSettings);
    try {
      localStorage.setItem('nana_merchant_general_settings', JSON.stringify(newSettings));
    } catch (e) {}
    setIsSettingsModalOpen(false);
  };

  // Toggle rapide Ouvert / Fermé du magasin
  const handleToggleStoreStatus = () => {
    playTapBeep();
    const newStatus = !settings.isStoreOpen;
    const updated = { ...settings, isStoreOpen: newStatus };
    setSettings(updated);
    try {
      localStorage.setItem('nana_merchant_general_settings', JSON.stringify(updated));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('nana_store_status_changed', { detail: { isStoreOpen: newStatus } }));
  };

  // =========================================================================
  // 2. CALCULS EN TEMPS RÉEL DES INDICATEURS CLÉS (ANALYTIQUE & GAINS)
  // =========================================================================
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Ventes du jour
    const todaySales = sales.filter(s => s.date?.startsWith(todayStr));
    const todayTotal = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);
    const todayCount = todaySales.length;

    // Total de toutes les ventes récentes
    const allSalesTotal = sales.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalTransactions = sales.length;

    // Calcul créances clients en souffrance
    const totalDebt = customers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
    const customersWithDebt = customers.filter(c => c.totalDebt > 0).length;

    // Commandes en attente
    const pendingOrders = customerOrders.filter(o => o.status === 'EN_ATTENTE').length;

    // Marge nette estimée (26% moyenne pondérée commerce télécom / électronique)
    const estimatedMargin = Math.round(todayTotal * 0.26);

    // Produits en alerte stock
    const lowStockCount = inventory.filter(p => p.stock <= 3).length;

    return {
      todayTotal,
      todayCount,
      allSalesTotal,
      totalTransactions,
      totalDebt,
      customersWithDebt,
      pendingOrders,
      estimatedMargin,
      lowStockCount
    };
  }, [sales, customers, customerOrders, inventory]);

  // =========================================================================
  // 3. DONNÉES DE LA COURBE DES GAINS (SYNCHRONISATION VENTES RÉELLES)
  // =========================================================================
  const chartData = useMemo(() => {
    const now = new Date();

    if (activeChartPeriod === 'TODAY') {
      const slots = ['08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];
      const todayStr = now.toISOString().split('T')[0];
      const todaySales = sales.filter(s => s.date?.startsWith(todayStr));
      return slots.map((slot, idx) => {
        const hourStart = 8 + idx * 2;
        const hourEnd = hourStart + 2;
        const slotSales = todaySales.filter(s => {
          if (!s.date) return false;
          try {
            const h = new Date(s.date).getHours();
            return h >= hourStart && h < hourEnd;
          } catch (e) {
            return false;
          }
        });
        const amount = slotSales.reduce((sum, s) => sum + (s.total || 0), 0);
        return {
          label: slot,
          dateFormatted: `Aujourd'hui ${slot}`,
          amount,
          count: slotSales.length
        };
      });
    }

    if (activeChartPeriod === '30D') {
      return [
        { label: 'Sem 1', daysBackStart: 28, daysBackEnd: 21 },
        { label: 'Sem 2', daysBackStart: 21, daysBackEnd: 14 },
        { label: 'Sem 3', daysBackStart: 14, daysBackEnd: 7 },
        { label: 'Sem 4', daysBackStart: 7, daysBackEnd: 0 }
      ].map((w) => {
        const dStart = new Date(now.getTime() - w.daysBackStart * 24 * 3600 * 1000);
        const dEnd = new Date(now.getTime() - w.daysBackEnd * 24 * 3600 * 1000);
        const periodSales = sales.filter(s => {
          if (!s.date) return false;
          const t = new Date(s.date).getTime();
          return t >= dStart.getTime() && t <= dEnd.getTime();
        });
        const amount = periodSales.reduce((sum, s) => sum + (s.total || 0), 0);
        return {
          label: w.label,
          dateFormatted: `${dStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${dEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`,
          amount,
          count: periodSales.length
        };
      });
    }

    // Période par défaut 7 Jours
    const daysLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return daysLabels.map((day, idx) => {
      const targetDay = new Date(now);
      targetDay.setDate(now.getDate() - (6 - idx));
      const dateKey = targetDay.toISOString().split('T')[0];
      
      const daySales = sales.filter(s => s.date?.startsWith(dateKey));
      const amount = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
      const count = daySales.length;

      return {
        label: day,
        dateFormatted: targetDay.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        amount,
        count
      };
    });
  }, [sales, activeChartPeriod]);

  const hasRealSales = useMemo(() => chartData.some(d => d.amount > 0), [chartData]);

  const maxChartAmount = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.amount), 0);
    return max > 0 ? Math.ceil(max * 1.15) : 100000;
  }, [chartData]);

  // Génération du chemin SVG pour la courbe lissée (Cubic Bézier)
  const svgPath = useMemo(() => {
    const width = 600;
    const height = 180;
    const padding = 20;

    const points = chartData.map((d, i) => {
      const x = padding + (i / (chartData.length - 1)) * (width - padding * 2);
      const y = hasRealSales 
        ? height - padding - (d.amount / maxChartAmount) * (height - padding * 2)
        : height - padding - 10; // Ligne subtile en bas si 0 vente
      return { x, y };
    });

    if (points.length === 0) return { path: '', area: '', points: [] };

    // Construction d'une courbe de Bézier continue
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }

    const area = `${path} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

    return { path, area, points };
  }, [chartData, maxChartAmount, hasRealSales]);

  // =========================================================================
  // 4. DÉFINITION DES CARTES MODULAIRES DU MASTER HUB
  // =========================================================================
  const modulesList = useMemo(() => [
    // --- SECTION 1 : COMMERCE & VENTES ---
    {
      id: 'mod-pos',
      category: 'COMMERCE',
      title: settings.isStoreOpen ? 'Caisse Tactile (POS)' : 'Caisse Fermée',
      badge: settings.isStoreOpen ? 'Cœur Ventes' : 'Caisse Fermée',
      badgeColor: settings.isStoreOpen ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: settings.isStoreOpen
        ? 'Encaissement ultra-rapide, tickets thermiques, scanner selfie et double affichage tablette.'
        : 'La boutique est actuellement configurée comme Fermée. La caisse est verrouillée.',
      icon: settings.isStoreOpen ? ShoppingBag : Lock,
      iconColor: settings.isStoreOpen ? 'text-emerald-400' : 'text-amber-400',
      iconBg: settings.isStoreOpen ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30',
      actionText: settings.isStoreOpen ? 'Ouvrir la Caisse' : 'Caisse Fermée (Verrouillée)',
      action: () => {
        if (!settings.isStoreOpen) {
          setShowStoreClosedPrompt(true);
        } else {
          handleModuleClick('POS', '/dashboard/pos');
        }
      },
      hotkey: 'F1',
      softGuidance: vendorType === 'ecommerce',
      guidanceLabel: 'Commencez ici'
    },
    {
      id: 'mod-vitrine',
      category: 'COMMERCE',
      title: 'Vitrine en Ligne (E-Shop)',
      badge: 'Web & WhatsApp',
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      description: 'Catalogue produits interactif, choix de thèmes et personnalisation de votre vitrine en ligne.',
      icon: Store,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/30',
      actionText: 'Choisir le Thème & Gérer',
      action: () => handleModuleClick('STUDIO', `/dashboard/vitrine/${storeSlug}`),
      hotkey: 'F2'
    },
    {
      id: 'mod-theme-builder-studio',
      category: 'COMMERCE',
      title: 'Studio de Choix et Construction de Thème',
      badge: 'Service',
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      description: 'Sélectionnez, prévisualisez et construisez le thème sur-mesure pour votre vitrine e-commerce.',
      icon: Palette,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/30',
      actionText: 'Construire le Thème',
      action: () => handleModuleClick('STUDIO', `/dashboard/vitrine/${storeSlug}`),
      taxonomyType: 'Service'
    },
    {
      id: 'mod-market-directory',
      category: 'COMMERCE',
      title: 'NaNa Market (Annuaire B2B2C)',
      badge: 'Centre Commercial',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      description: 'Annuaire public des boutiques et marchands. Vos clients finaux découvrent vos boutiques classées par catégorie, ville et quartier.',
      icon: Globe,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30',
      actionText: 'Ouvrir l\'Annuaire',
      action: () => handleModuleClick('MARKET_DIRECTORY', '/dashboard/market'),
      hotkey: 'F4'
    },
    {
      id: 'mod-ultimate-funnel',
      category: 'COMMERCE',
      title: 'Ultimate Funnel Builder',
      badge: 'Application',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Constructeur de tunnels haute conversion avec upsells, order bumps et paiements express.',
      icon: Layers,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/30',
      actionText: 'Ultimate Builder',
      action: () => handleModuleClick('ULTIMATE_FUNNEL', '/dashboard/funnel/ultimate'),
      taxonomyType: 'Application',
      hotkey: 'F3'
    },
    {
      id: 'mod-modular-funnel',
      category: 'COMMERCE',
      title: 'Funnel Builder Modulaire',
      badge: 'Application',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      description: 'Constructeur modulaire par blocs drag & drop pour tunnels de conversion sur mesure.',
      icon: Layers,
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-500/10 border-orange-500/30',
      actionText: 'Builder Modulaire',
      action: () => handleModuleClick('MODULAR_FUNNEL', '/dashboard/funnel/modular'),
      taxonomyType: 'Application'
    },
    {
      id: 'mod-public-deal-builder',
      category: 'COMMERCE',
      title: 'Public Deal Page Builder',
      badge: 'Application',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      description: 'Créateur de pages d\'offres flash et de deals publics physiques avec paiement direct.',
      icon: Layers,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/30',
      actionText: 'Deal Page Builder',
      action: () => handleModuleClick('PHYSICAL_FUNNEL', '/dashboard/funnel/physical'),
      taxonomyType: 'Application'
    },
    {
      id: 'mod-excel',
      category: 'COMMERCE',
      title: 'Import de Fichiers Excel',
      badge: 'Smart SheetJS',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      description: 'Importeur intelligent XLSX/CSV sans latence avec auto-mapping dynamique des colonnes.',
      icon: FileSpreadsheet,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10 border-blue-500/30',
      actionText: 'Importer Excel',
      action: () => {
        if (onOpenExcelImporter) {
          handleModuleClick('INVENTORY', '/dashboard/inventaire/excel');
          onOpenExcelImporter();
        } else {
          handleModuleClick('INVENTORY', '/dashboard/inventaire');
        }
      }
    },
    {
      id: 'mod-orders-quotes',
      category: 'COMMERCE',
      title: 'Bons de Commande & Devis/Projets',
      badge: metrics.pendingOrders > 0 ? `${metrics.pendingOrders} en attente` : 'Proforma & Tiers',
      badgeColor: metrics.pendingOrders > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      description: 'Émission de factures proforma, devis sous séquestre garanti et gestion des commandes passées en ligne.',
      icon: FileText,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 border-cyan-500/30',
      actionText: 'Bons & Devis',
      action: () => handleModuleClick('CUSTOMER_ORDERS', '/dashboard/commandes')
    },

    // --- SECTION 2 : FINANCES & TRÉSORERIE ---
    {
      id: 'mod-reports',
      category: 'FINANCE',
      title: 'Analytique & Courbe des Gains',
      badge: 'Comptabilité',
      badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      description: 'Suivi journalier du chiffre d’affaires, calcul des marges nettes réelles et export comptable officiel.',
      icon: TrendingUp,
      iconColor: 'text-teal-400',
      iconBg: 'bg-teal-500/10 border-teal-500/30',
      actionText: 'Voir les Rapports',
      action: () => handleModuleClick('REPORTS', '/dashboard/rapports')
    },
    {
      id: 'mod-debt',
      category: 'FINANCE',
      title: 'Gestion des Dettes (Ardoises clients)',
      badge: metrics.customersWithDebt > 0 ? `${formatCFA(metrics.totalDebt)}` : 'À jour',
      badgeColor: metrics.customersWithDebt > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      description: 'Carnet de crédit digitalisé, relances automatiques par SMS/WhatsApp et suivi des échéances.',
      icon: CreditCard,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/30',
      actionText: 'Cahier de Dettes',
      action: () => handleModuleClick('DEBT_BOOK', '/dashboard/dettes')
    },
    {
      id: 'mod-partners',
      category: 'FINANCE',
      title: 'Espace Partenaire',
      badge: 'Programme Partenaire 20%',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'Recommandez NaNa et touchez 15% à 20% de commissions récurrentes à vie avec retraits instantanés par Mobile Money.',
      icon: Gift,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30',
      actionText: 'Ouvrir l\'Espace Partenaire',
      action: () => {
        if (onOpenAffiliation) {
          handleModuleClick('PARTNER', '/dashboard/partenaire');
          onOpenAffiliation();
        } else {
          handleModuleClick('PARTNER', '/dashboard/partenaire');
        }
      }
    },

    // --- SECTION 3 : INTELLIGENCE ARTIFICIELLE & AUTOMATISATION ---
    {
      id: 'mod-studio-ia',
      category: 'AI',
      title: 'Studio IA 👑 (Vidéos, Images & Textes)',
      badge: 'Multimodal',
      badgeColor: 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border-amber-500/40',
      description: 'Génération neuronale de vidéos d\'avatars, visuels produits 4K et argumentaires commerciaux persuasifs.',
      icon: Wand2,
      iconColor: 'text-amber-400',
      iconBg: 'bg-gradient-to-tr from-amber-500/20 to-purple-500/20 border-amber-500/40',
      actionText: 'Ouvrir le Studio IA',
      action: () => handleModuleClick('AI_STUDIO', '/dashboard/ai-studio')
    },
    {
      id: 'mod-ai-gemini',
      category: 'AI',
      title: 'Gemini & Agent IA (NaNa AI Studio)',
      badge: 'Gemini 3.8 Flash',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      description: 'Assistant décisionnel intelligent, prédictions de rupture de stock et conseils juridiques / fiscaux certifiés.',
      icon: Bot,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/30',
      actionText: 'Ouvrir l’Agent IA',
      action: () => handleModuleClick('AI_ADVISOR', '/dashboard/ai-advisor')
    },
    {
      id: 'mod-cv-video',
      category: 'AI',
      title: 'CVPro & Création Documentaire',
      badge: 'APPLICATION',
      badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
      description: 'Application officielle de création de CV professionnels haute définition, fiches techniques et attestations de service certifiées.',
      icon: FileBadge,
      iconColor: 'text-fuchsia-400',
      iconBg: 'bg-fuchsia-500/10 border-fuchsia-500/30',
      actionText: 'Lancer l’Application CVPro',
      action: () => handleModuleClick('CV_CREATOR', '/dashboard/cv')
    },

    // --- SECTION 4 : MARKETING & COMMUNICATION ---
    {
      id: 'mod-marketing',
      category: 'MARKETING',
      title: 'Marketing & Campagnes',
      badge: 'Copywriting IA',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Rédacteur automatique d’annonces de vente, campagnes ciblées WhatsApp et affiches promotionnelles.',
      icon: Megaphone,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/30',
      actionText: 'Créer une Campagne',
      action: () => {
        handleModuleClick('BOUTIQUE', '/dashboard/marketing');
        if (onOpenMarketingAi) onOpenMarketingAi();
      }
    },
    {
      id: 'mod-live-webinar',
      category: 'MARKETING',
      title: 'Studio de Génération de Live et Webinaire',
      badge: 'Application',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      description: 'Studio de Live Shopping multi-plateforme (NaNa Live, TikTok, Facebook, Instagram) avec landing page instantanée.',
      icon: Radio,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/30',
      actionText: 'Lancer un Live',
      action: () => {
        handleModuleClick('BOUTIQUE', '/dashboard/lives');
        if (onOpenWebinarModal) onOpenWebinarModal();
      },
      taxonomyType: 'Application'
    },
    {
      id: 'mod-wameet-supra',
      category: 'MARKETING',
      title: 'Wameet',
      badge: 'Application',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      description: 'Réseau social professionnel, salons vidéo & visio HD.',
      icon: Globe,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/30',
      actionText: 'Ouvrir Wameet',
      action: () => handleModuleClick('WAMEET', '/dashboard/wameet'),
      taxonomyType: 'Application'
    },
    {
      id: 'mod-nanawallet',
      category: 'COMMERCE',
      title: 'nanawallet',
      badge: 'Application',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      description: 'Portefeuille mobile hybride : Solde XOF, recharges Mobile Money & crypto USDT.',
      icon: Wallet,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10 border-blue-500/30',
      actionText: 'Ouvrir nanawallet',
      action: () => handleModuleClick('WALLET', '/wallet'),
      taxonomyType: 'Application'
    },
    {
      id: 'mod-lms-academy',
      category: 'MARKETING',
      title: 'Centre de Formation et D\'Accompagnement',
      badge: 'Service',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: 'Masterclasses pratiques, devoirs et accompagnement certifié des apprenants.',
      icon: GraduationCap,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/30',
      actionText: 'Accéder au Centre',
      action: () => {
        handleModuleClick('CAMPUS', '/dashboard/campus');
      },
      softGuidance: vendorType === 'elearning',
      guidanceLabel: 'Commencez ici',
      taxonomyType: 'Service'
    },
    {
      id: 'mod-cours-forge',
      category: 'MARKETING',
      title: 'Cours Forge',
      badge: 'Application',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      description: 'Atelier complet de conception et structuration de cours : leçons, vidéos, quiz et devoirs.',
      icon: PlusCircle,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30',
      actionText: 'Ouvrir Cours Forge',
      action: () => handleModuleClick('COURSE_CREATE', '/dashboard/courses/create'),
      taxonomyType: 'Application'
    },
    {
      id: 'mod-lms-marketplace',
      category: 'MARKETING',
      title: 'Next-Gen LMS Marketplace',
      badge: 'Netflix Storefront',
      badgeColor: 'bg-gradient-to-r from-rose-500/20 to-indigo-500/20 text-rose-300 border-rose-500/40',
      description: 'Vitrine immersive style Netflix, carrousels swipeables, aperçus vidéo directs et souscription Mobile Money 1-clic.',
      icon: PlaySquare,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/30',
      actionText: 'Explorer le Catalogue',
      action: () => {
        handleModuleClick('CATALOG', '/dashboard/marketplace');
        if (onNavigateToCatalog) onNavigateToCatalog();
      }
    },
    {
      id: 'mod-instructor-hub',
      category: 'MARKETING',
      title: 'Centre de Création de Cours, et De Formation',
      badge: 'Service',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      description: 'Correction des devoirs étudiants, notation, gestion pédagogique et validation des cohortes.',
      icon: Award,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/30',
      actionText: 'Gérer la Formation',
      action: () => {
        handleModuleClick('INSTRUCTOR', '/dashboard/formateur');
      },
      taxonomyType: 'Service'
    },

    // --- SECTION 5 : EXTENSIONS & PARAMÈTRES TECHNIQUES ---
    {
      id: 'mod-crm-automation',
      category: 'TECH',
      title: 'CRM et Automation (Super Admin)',
      badge: 'SUPER ADMIN',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      description: 'Module d’infrastructure réservé au Super Administrateur (WooCommerce, Passerelle SMS / OTP, Emailing Pro & connecteurs système).',
      icon: Plug,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/30',
      actionText: 'Accès Super Admin',
      action: () => {
        if (!isSuperAdminLocally(currentUser)) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nana_show_toast', {
              detail: {
                title: 'Accès Réservé Super Admin',
                message: 'Le module "CRM et Automation" est un module d’infrastructure technique réservé exclusivement au Super Administrateur.',
                type: 'warning'
              }
            }));
          }
          return;
        }
        handleModuleClick('SETTINGS_EXTENSIONS', '/dashboard/connecteurs');
      },
      taxonomyType: 'Service'
    },
    {
      id: 'mod-nana-switch',
      category: 'TECH',
      title: 'NaNa Switch Cloud (Multi-Comptes)',
      badge: 'EN CONSTRUCTION',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: 'Basculez instantanément entre vos boutiques et comptes sans vous reconnecter (En cours de finalisation).',
      icon: ShieldCheck,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/30',
      actionText: '🚧 En Construction',
      action: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nana_show_toast', {
            detail: {
              title: 'Module en construction',
              message: 'Le module NaNa Switch est en cours de développement et sera disponible prochainement.',
              type: 'info'
            }
          }));
        }
      },
      taxonomyType: 'Service'
    },
    {
      id: 'mod-docusign',
      category: 'TECH',
      title: 'Sécurité & Signatures Certifiées',
      badge: 'DocuSign Hub',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      description: 'Signature électronique probante, journal d’audit cryptographique et verrouillage sécurisé par code PIN.',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30',
      actionText: 'Signatures & Audit',
      action: () => {
        handleModuleClick('DOCUSIGN', '/dashboard/docusign');
        if (onOpenDocuSign) onOpenDocuSign();
      }
    },
    {
      id: 'mod-kyc-chain',
      category: 'TECH',
      title: 'Chaîne d’Identification KYC Marchand',
      badge: idChain.overallStatus === 'FULLY_VERIFIED' ? 'Certifié 100%' : 'Partie 1 & 2',
      badgeColor: idChain.overallStatus === 'FULLY_VERIFIED' 
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      description: 'Processus souverain en 2 étapes : Partie 1 Individuel (CNI / Passeport) + Partie 2 Entreprise (RCCM & IFU). Plafonds illimités.',
      icon: Award,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30',
      actionText: 'Gérer l’Identification',
      action: () => {
        handleModuleClick('SETTINGS', '/dashboard/kyc');
        setKycWizardInitialType(idChain.part1Individual.status === 'VALIDATED' ? 'entreprise' : 'particulier');
        setIsKycChainWizardOpen(true);
      }
    },

    // --- SECTION 6 : FONCTIONNALITÉS STRICTEMENT PRO (Couronne dorée 👑) ---
    {
      id: 'mod-custom-domain',
      category: 'COMMERCE',
      title: 'Domaine Personnalisé',
      badge: isSubscriptionPending ? 'ABONNEMENT REQUIS' : 'PRO',
      badgeColor: isSubscriptionPending ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 border-indigo-400/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: isSubscriptionPending ? 'Souscrire à un abonnement pour débloquer tous les services, applications, modules et outils concernés.' : 'Liez votre propre domaine .com ou .ci pour un branding 100% professionnel et indépendant.',
      icon: Globe,
      iconColor: isSubscriptionPending ? 'text-indigo-400' : 'text-amber-400',
      iconBg: isSubscriptionPending ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-amber-500/10 border-amber-500/30',
      actionText: isSubscriptionPending ? 'Souscrire à un abonnement' : 'Connecter Domaine',
      action: () => isSubscriptionPending && onOpenUpgrade ? onOpenUpgrade() : openProFeature('CUSTOM_DOMAIN'),
      isPro: true,
      proKey: 'CUSTOM_DOMAIN' as ProFeatureKey
    },
    {
      id: 'mod-sovereign-gateway',
      category: 'FINANCE',
      title: 'Passerelle Souveraine / Connecter API',
      badge: isSubscriptionPending ? 'ABONNEMENT REQUIS' : 'PRO',
      badgeColor: isSubscriptionPending ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 border-indigo-400/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: isSubscriptionPending ? 'Souscrire à un abonnement pour débloquer tous les services, applications, modules et outils concernés.' : 'Encaisser directement sur vos propres clés API FedaPay, LigdiCash ou Stripe avec 0% de commission.',
      icon: Zap,
      iconColor: isSubscriptionPending ? 'text-indigo-400' : 'text-amber-400',
      iconBg: isSubscriptionPending ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-amber-500/10 border-amber-500/30',
      actionText: isSubscriptionPending ? 'Souscrire à un abonnement' : 'Connecter API',
      action: () => isSubscriptionPending && onOpenUpgrade ? onOpenUpgrade() : openProFeature('SOVEREIGN_GATEWAY'),
      isPro: true,
      proKey: 'SOVEREIGN_GATEWAY' as ProFeatureKey
    },
    {
      id: 'mod-team-employees',
      category: 'COMMERCE',
      title: 'Gestion des Employés / Caissiers',
      badge: isSubscriptionPending ? 'ABONNEMENT REQUIS' : (isFree ? '1 inclus' : 'PRO'),
      badgeColor: isSubscriptionPending ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 border-indigo-400/50' : (isFree ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'),
      description: isSubscriptionPending ? 'Souscrire à un abonnement pour débloquer tous les services, applications, modules et outils concernés.' : 'Attribuez des accès caissiers sécurisés par code PIN et suivez les encaissements de chaque membre.',
      icon: Users,
      iconColor: isSubscriptionPending ? 'text-indigo-400' : (isFree ? 'text-emerald-400' : 'text-amber-400'),
      iconBg: isSubscriptionPending ? 'bg-indigo-500/10 border-indigo-500/30' : (isFree ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'),
      actionText: isSubscriptionPending ? 'Souscrire à un abonnement' : 'Gérer l\'Équipe',
      action: () => isSubscriptionPending && onOpenUpgrade ? onOpenUpgrade() : openProFeature('EMPLOYEE_MANAGEMENT'),
      isPro: true,
      proKey: 'EMPLOYEE_MANAGEMENT' as ProFeatureKey
    },
    {
      id: 'mod-pixels-crm',
      category: 'MARKETING',
      title: 'Pixels de Tracking / CRM Avancé',
      badge: isSubscriptionPending ? 'ABONNEMENT REQUIS' : 'PRO',
      badgeColor: isSubscriptionPending ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 border-indigo-400/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: isSubscriptionPending ? 'Souscrire à un abonnement pour débloquer tous les services, applications, modules et outils concernés.' : 'Pilotez vos campagnes Meta Ads & TikTok avec synchronisation temps réel des événements de conversion.',
      icon: BarChart3,
      iconColor: isSubscriptionPending ? 'text-indigo-400' : 'text-amber-400',
      iconBg: isSubscriptionPending ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-amber-500/10 border-amber-500/30',
      actionText: isSubscriptionPending ? 'Souscrire à un abonnement' : 'Activer Tracking',
      action: () => isSubscriptionPending && onOpenUpgrade ? onOpenUpgrade() : openProFeature('TRACKING_PIXELS_CRM'),
      isPro: true,
      proKey: 'TRACKING_PIXELS_CRM' as ProFeatureKey
    },
    {
      id: 'mod-white-label',
      category: 'TECH',
      title: 'Marque Blanche / Retirer le logo Nanasore',
      badge: isSubscriptionPending ? 'ABONNEMENT REQUIS' : 'PRO',
      badgeColor: isSubscriptionPending ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 border-indigo-400/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: isSubscriptionPending ? 'Souscrire à un abonnement pour débloquer tous les services, applications, modules et outils concernés.' : 'Masquez tout branding NaNa sur vos vitrines, factures et campus pour mettre votre enseigne au premier plan.',
      icon: Palette,
      iconColor: isSubscriptionPending ? 'text-indigo-400' : 'text-amber-400',
      iconBg: isSubscriptionPending ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-amber-500/10 border-amber-500/30',
      actionText: isSubscriptionPending ? 'Souscrire à un abonnement' : 'Marque Blanche',
      action: () => isSubscriptionPending && onOpenUpgrade ? onOpenUpgrade() : openProFeature('WHITE_LABEL'),
      isPro: true,
      proKey: 'WHITE_LABEL' as ProFeatureKey
    },
    {
      id: 'mod-nana-academy',
      category: 'TECH',
      title: 'NaNa Académie (Centre de Tutoriels)',
      badge: 'GUIDE',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      description: 'Formations interactives pas à pas : Caisse, Stock, Vitrine, Passerelle SMS, Studio IA & Live Shopping.',
      icon: GraduationCap,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/30',
      actionText: 'Ouvrir Académie',
      action: () => {
        if (onOpenAcademy) onOpenAcademy();
      },
      isPro: false
    },
    {
      id: 'mod-certificate',
      category: 'TECH',
      title: 'Certificats Officiels & QR Code',
      badge: 'HOMOLOGUÉ',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: 'Génération et vérification de diplômes d\'aptitude avec QR code dynamique d\'authenticité, signatures et téléchargement PDF/Image HD.',
      icon: Award,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/30',
      actionText: 'Consulter / Prévisualiser',
      action: () => {
        playTapBeep();
        if (onNavigate) {
          onNavigate('CERTIFICATE');
        } else if (typeof window !== 'undefined') {
          window.history.pushState({}, '', '/certificat');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      },
      isPro: false
    }
  ], [metrics, idChain, isFree, vendorType, settings.isStoreOpen, isSubscriptionPending, isSubscriptionModel, onNavigate, onOpenExcelImporter, onOpenWebinarModal, onOpenMarketingAi, onOpenAffiliation, onOpenDocuSign, onOpenSaasAdmin, onOpenAdmin, onOpenAcademy]);

  // Filtrage dynamique selon la recherche, la catégorie active et le mode Caméléon
  const filteredModules = useMemo(() => {
    return modulesList.filter(mod => {
      if (sellerMode === 'creator_trainer' && mod.id === 'mod-pos') return false;
      const matchCat = activeCategory === 'ALL' || mod.category === activeCategory;
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        mod.title.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.badge.toLowerCase().includes(q)
      );
    });
  }, [modulesList, activeCategory, searchQuery, sellerMode]);

  // Catégories avec compteur
  const categoriesList = [
    { id: 'ALL' as MasterHubCategory, label: 'Tous les Modules', count: modulesList.length },
    { id: 'COMMERCE' as MasterHubCategory, label: 'Commerce & Ventes', count: modulesList.filter(m => m.category === 'COMMERCE').length },
    { id: 'FINANCE' as MasterHubCategory, label: 'Finances & Trésorerie', count: modulesList.filter(m => m.category === 'FINANCE').length },
    { id: 'AI' as MasterHubCategory, label: 'Intelligence IA', count: modulesList.filter(m => m.category === 'AI').length },
    { id: 'MARKETING' as MasterHubCategory, label: 'Marketing & Lives', count: modulesList.filter(m => m.category === 'MARKETING').length },
    { id: 'TECH' as MasterHubCategory, label: 'Extensions & Admin', count: modulesList.filter(m => m.category === 'TECH').length },
  ];

  // Taille adaptative des écritures en fonction de la longueur du nom de l'entreprise (nom long)
  const companyNameFontSize = useMemo(() => {
    const name = (settings.companyName || '').trim();
    const len = name.length;
    if (len > 35) return 'text-[10px] sm:text-xs md:text-sm font-black';
    if (len > 24) return 'text-[11px] sm:text-xs md:text-sm font-black';
    if (len > 16) return 'text-xs sm:text-sm md:text-base font-black';
    return 'text-xs sm:text-sm md:text-base font-black';
  }, [settings.companyName]);

  return (
    <div className="w-full h-full min-h-0 flex-1 bg-[#0B1E48] text-slate-100 flex font-sans select-none overflow-hidden">
      {/* SaaS Sidebar avec Couronnes Dorées 👑 et Guidage Doux */}
      <AppSidebar
        currentUser={currentUser}
        subscription={subscription}
        currentView="MASTER_HUB"
        isStoreOpen={settings.isStoreOpen}
        onNavigate={onNavigate}
        onOpenPaywall={onOpenUpgrade}
        onOpenSettings={() => openSettingsWithTab('PROFILE')}
        onOpenEmployeeManagement={() => openProFeature('EMPLOYEE_MANAGEMENT')}
        onOpenSovereignGateway={() => openProFeature('SOVEREIGN_GATEWAY')}
        onOpenCustomDomain={() => openProFeature('CUSTOM_DOMAIN')}
        onOpenTrackingCrm={() => openProFeature('TRACKING_PIXELS_CRM')}
        onOpenWhiteLabel={() => openProFeature('WHITE_LABEL')}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        className="hidden md:flex"
      />

      {/* Conteneur de Défilement Principal */}
      <div 
        className="flex-1 min-w-0 h-full flex flex-col overflow-y-auto scroll-smooth pb-28"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* =========================================================================
            1. HEADER PRINCIPAL MASTER HUB : ENTREPRISE
           ========================================================================= */}
        <header className="sticky top-0 z-40 bg-[#08183D]/95 backdrop-blur-md border-b-2 border-[#2563EB]/40 px-3 sm:px-6 py-2.5 sm:py-3 shadow-xl relative">
          {/* Bouton 3 Points / Tirets Carrément en haut à droite : Liste des Services / Apps / Modules / Outils ACTIVÉS */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsActiveSolutionsDrawerOpen(true);
            }}
            className="absolute top-2.5 right-3 sm:top-3 sm:right-6 p-2 rounded-xl bg-[#0F2860]/95 hover:bg-[#1E3A8A] text-cyan-300 hover:text-white border border-cyan-500/50 shadow-md shadow-blue-950/60 cursor-pointer flex items-center justify-center active:scale-95 shrink-0 transition z-50 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px]"
            title="Mes Services, Apps, Modules et Outils Activés (📌)"
            aria-label="Mes Solutions Activées"
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              <span className="w-3.5 h-0.5 bg-cyan-300 rounded-full"></span>
              <span className="w-3.5 h-0.5 bg-cyan-300 rounded-full"></span>
              <span className="w-3.5 h-0.5 bg-cyan-300 rounded-full"></span>
            </div>
            {/* Pastille verte discrète indiquant des solutions actives */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#08183D] animate-pulse" />
          </button>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Identité Entreprise & Logo Officiel Nanasore — La Passerelle de la Fluidité */}
          <div className="flex flex-row items-center gap-2.5 sm:gap-3 shrink-0 min-w-0 w-auto max-w-xs sm:max-w-sm md:max-w-md pr-12 md:pr-0">
            <div 
              onClick={handleLogoTap}
              className="shrink-0 cursor-pointer active:scale-95 transition-transform flex items-center justify-center"
              title="Nanasore"
            >
              {settings.logoUrl && !settings.logoUrl.includes('images.unsplash.com/photo-1618005182384') && !settings.logoUrl.includes('nanasore-icon.svg') ? (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-900/30 overflow-hidden">
                  <img 
                    src={settings.logoUrl} 
                    alt={settings.companyName} 
                    className="w-full h-full object-cover rounded-[10px] sm:rounded-[14px]"
                  />
                </div>
              ) : (
                <NanasorePasserelleIcon pixelSize={42} />
              )}
            </div>

            <div className="min-w-0 flex flex-col justify-center">
              {/* Ligne 1 : Brand + Nom de l'Entreprise en ligne sans cassure verticale */}
              <div className="flex flex-row items-center gap-1.5 sm:gap-2 whitespace-nowrap min-w-0">
                <span className="text-sm sm:text-base font-black tracking-tight flex items-baseline shrink-0">
                  <span className="text-white">Nana</span>
                  <span className="text-[#22D3EE]">sore</span>
                </span>
                <span className="text-slate-600 shrink-0">•</span>
                <h1 
                  className="whitespace-nowrap flex items-center text-sm font-bold text-slate-200 tracking-tight uppercase overflow-hidden text-ellipsis"
                  title={settings.companyName}
                >
                  {settings.companyName}
                </h1>
                <span className="bg-[#2563EB] text-white border border-blue-400/40 text-[8.5px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                  <span className="xs:hidden">QG</span>
                  <span className="hidden xs:inline">QG CAMÉLÉON</span>
                </span>
              </div>

              {/* Ligne 2 : Badges de la Chaîne d'Identification KYC */}
              <div className="flex flex-row items-center gap-1.5 whitespace-nowrap mt-1">
                {/* Badge Partie 1 : Individuel Validé */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setKycWizardInitialType('particulier');
                    setIsKycChainWizardOpen(true);
                  }}
                  className={`text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 border cursor-pointer transition hover:scale-105 active:scale-95 shadow-xs whitespace-nowrap ${
                    idChain.part1Individual.status === 'VALIDATED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                  title="Partie 1 : Identification Individuelle du Gérant (Cliquer pour ouvrir)"
                >
                  <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">
                    P1 : {idChain.part1Individual.status === 'VALIDATED' ? 'INDIVIDUEL VALIDÉ ✓' : 'EN ATTENTE'}
                  </span>
                  <span className="sm:hidden">
                    P1 : {idChain.part1Individual.status === 'VALIDATED' ? 'INDIVIDUEL ✓' : 'ATTENTE'}
                  </span>
                </button>

                {/* Badge Partie 2 : Entreprise Validée */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setKycWizardInitialType('entreprise');
                    setIsKycChainWizardOpen(true);
                  }}
                  className={`text-[8.5px] sm:text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 border cursor-pointer transition hover:scale-105 active:scale-95 shadow-xs whitespace-nowrap ${
                    idChain.part2Business.status === 'VALIDATED'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  }`}
                  title="Partie 2 : Identification Entreprise (Cliquer pour ouvrir)"
                >
                  <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="hidden sm:inline">
                    P2 : {idChain.part2Business.status === 'VALIDATED' ? 'ENTREPRISE VALIDÉE ✓' : 'EN ATTENTE'}
                  </span>
                  <span className="sm:hidden">
                    P2 : {idChain.part2Business.status === 'VALIDATED' ? 'ENTREPRISE ✓' : 'ATTENTE'}
                  </span>
                </button>
              </div>

              {/* Ligne 3 : Métadonnées */}
              <p className="text-[10px] sm:text-[11px] text-slate-400 flex flex-row items-center gap-1.5 sm:gap-2 whitespace-nowrap mt-1 overflow-hidden truncate">
                <span className="font-semibold text-slate-300">Siège : Ouagadougou</span>
                <span>•</span>
                <span>Devise : <strong className="text-emerald-400">{settings.currencySymbol}</strong></span>
                <span>•</span>
                <span className="truncate max-w-[120px] sm:max-w-none">Dirigeant : <strong className="text-blue-300">{settings.managerFullName}</strong></span>
                <span>•</span>
                <span>Horloge : <strong className="text-slate-300 font-mono">{currentTime}</strong></span>
              </p>
            </div>
          </div>

          {/* 2. Omnibar Centrale Fixe (<AppOmnibar />) avec Overlay Flouté & Registre Apps */}
          <div className="w-full md:flex-1 md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto md:mx-4 order-3 md:order-2">
            <AppOmnibar 
              onOpenApp={handleOpenAppFromOmnibar}
              onNavigate={(v) => {
                if (v === 'POS' && !settings.isStoreOpen) {
                  setShowStoreClosedPrompt(true);
                  return;
                }
                onNavigate(v);
              }}
            />
          </div>

          {/* Contrôles Rapides & Statut Boutique (Tous 100% visibles sur mobile grâce au flex-wrap et tailles ajustées) */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto flex-wrap md:flex-nowrap justify-start sm:justify-end shrink-0 pt-1 md:pt-0 border-t border-slate-800/80 md:border-t-0 order-2 md:order-3 pr-12 md:pr-14">
            {/* Bouton Toggle Statut Boutique Ouverte / Fermée */}
            <button
              type="button"
              onClick={handleToggleStoreStatus}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer border active:scale-95 shadow-sm min-h-[36px] sm:min-h-[40px] shrink-0 ${
                settings.isStoreOpen 
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50' 
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900/50'
              }`}
              title="Cliquer pour changer le statut opérationnel du magasin"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${settings.isStoreOpen ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
              <span className="hidden xs:inline">{settings.isStoreOpen ? 'Boutique Ouverte' : 'Boutique Fermée'}</span>
              <span className="xs:hidden">{settings.isStoreOpen ? 'Ouverte' : 'Fermée'}</span>
            </button>

            {/* Bouton Passer à la Formule Pro : Appelle les Tarifs & l'Ouverture de Compte */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                // 1. Déclencher l'ouverture de la grille tarifaire des forfaits
                if (onOpenUpgrade) {
                  onOpenUpgrade();
                } else {
                  window.dispatchEvent(new CustomEvent('nana_open_paywall_modal', { detail: { targetPlanId: 'pro', reason: 'UPGRADE_PRO' } }));
                }
                window.dispatchEvent(new CustomEvent('nanasore_open_subscription_plans'));
                // 2. Si pas de compte ouvert ou gérant invité, orienter vers l'ouverture de compte / KYC
                const isNoAccount = !currentUser || !currentUser.id || currentUser.id === 'user_default' || !currentUser.email;
                if (isNoAccount) {
                  setKycWizardInitialType('particulier');
                  setIsKycChainWizardOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-[11px] sm:text-xs shadow-md shadow-indigo-950/40 border border-amber-300/40 active:scale-95 transition cursor-pointer min-h-[36px] sm:min-h-[40px] shrink-0"
              title="Passer à la Formule Pro — Découvrir les tarifs, ouvrir son compte et souscrire"
            >
              <Crown className="w-3.5 h-3.5 text-amber-200 fill-amber-200 shrink-0" />
              <span className="hidden xs:inline">Passer à la Formule Pro</span>
              <span className="xs:hidden">Formule Pro</span>
            </button>

            {/* Bouton Accès Direct Caisse POS (Masqué en mode Formateur) */}
            {sellerMode !== 'creator_trainer' && (
              <button
                type="button"
                onClick={() => { 
                  playTapBeep(); 
                  if (!settings.isStoreOpen) {
                    setShowStoreClosedPrompt(true);
                    return;
                  }
                  onNavigate('POS'); 
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl font-black text-[11px] sm:text-xs transition shadow-md min-h-[36px] sm:min-h-[40px] cursor-pointer active:scale-95 shrink-0 ${
                  settings.isStoreOpen
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-emerald-950/40'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-400 border border-slate-700/80 shadow-slate-950/40'
                }`}
                title={settings.isStoreOpen ? "📠 Ouvrir la Caisse Physique en Magasin (POS)" : "Caisse Fermée — Réouvrez la boutique pour activer la caisse"}
              >
                {settings.isStoreOpen ? (
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span>
                  {settings.isStoreOpen ? 'Caisse (POS)' : 'Caisse'}
                </span>
              </button>
            )}

            {/* Bouton Accès Direct Espace Partenaire */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onOpenAffiliation) onOpenAffiliation();
                else onNavigate('PARTNER');
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 active:scale-95 text-[11px] sm:text-xs font-bold transition shadow-sm cursor-pointer min-h-[36px] sm:min-h-[40px] shrink-0"
              title="Accéder à l'Espace Partenaire (Commissions 15% à 20%)"
            >
              <Gift className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Partenaire</span>
              <span className="hidden sm:inline px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-black">20%</span>
            </button>

            {/* Bouton NaNa Académie */}
            {onOpenAcademy && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onOpenAcademy();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-900/80 to-purple-900/80 hover:from-indigo-800 hover:to-purple-800 text-indigo-200 hover:text-white border border-indigo-500/40 active:scale-95 text-[11px] sm:text-xs font-black transition shadow-md shadow-indigo-950/40 cursor-pointer min-h-[36px] sm:min-h-[40px] shrink-0"
                title="NaNa Académie — Formations micro-learning & tutoriels"
              >
                <GraduationCap className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span className="hidden xs:inline">🎓 Académie</span>
                <span className="xs:hidden">🎓 Tutos</span>
              </button>
            )}

            {/* Bouton Directeur de Croissance IA (Agent Nsore) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                const el = document.getElementById('growth-director-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-700/80 to-indigo-700/80 hover:from-blue-600 hover:to-indigo-600 text-white border border-blue-400/50 active:scale-95 text-[11px] sm:text-xs font-black transition shadow-sm cursor-pointer min-h-[36px] sm:min-h-[40px] shrink-0"
              title="Consulter l'Agent Nsore (Directeur de la Croissance • IA)"
            >
              <Bot className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span className="hidden xs:inline">Directeur Croissance</span>
              <span className="xs:hidden">IA</span>
            </button>

            {/* Bouton Tester Certificat */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onNavigate) {
                  onNavigate('CERTIFICATE');
                } else if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/certificat');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 active:scale-95 text-[11px] sm:text-xs font-bold transition shadow-sm cursor-pointer min-h-[36px] sm:min-h-[40px] shrink-0"
              title="Consulter le Certificat Officiel avec QR Code & Téléchargement"
            >
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden xs:inline sm:inline">Certificat</span>
            </button>

            {/* Verrouiller Session */}
            {onLockSession && (
              <button
                type="button"
                onClick={() => { playTapBeep(); onLockSession(); }}
                className="p-2 rounded-xl bg-[#0D245A] hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 transition border border-[#2563EB]/40 cursor-pointer min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] shrink-0 flex items-center justify-center active:scale-95"
                title="Verrouiller la session (Code PIN requis)"
              >
                <Lock className="w-4 h-4 text-amber-400" />
              </button>
            )}

            {/* Bouton Paramètres (Icône de même taille pour paramètres) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onOpenGeneralSettings) onOpenGeneralSettings();
                else openSettingsWithTab('PROFILE');
              }}
              className="p-2 rounded-xl bg-[#0D245A] hover:bg-blue-900/60 text-slate-300 hover:text-white transition border border-[#2563EB]/40 cursor-pointer min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] shrink-0 flex items-center justify-center active:scale-95"
              title="Paramètres de la Boutique & Configuration Générale"
              aria-label="Paramètres"
            >
              <Settings className="w-4 h-4 text-slate-300 hover:text-white" />
            </button>

            {/* Bouton Liste des Services, Applications, Modules et Outils (Icône de même taille) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsSolutionsCatalogOpen(true);
              }}
              className="p-2 rounded-xl bg-[#0D245A] hover:bg-blue-900/60 text-cyan-300 hover:text-white transition border border-[#2563EB]/40 cursor-pointer min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] shrink-0 flex items-center justify-center active:scale-95"
              title="Liste de nos Services, Applications, Modules et Outils"
              aria-label="Catalogue des Solutions"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          CONTENU DU DASHBOARD CENTRAL MASTER HUB (TABLEAU DE BORD CAMÉLÉON)
         ========================================================================= */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 space-y-5">

        {/* BANNIÈRE MODÈLE ABONNEMENT EN ATTENTE DE SOUSCRIPTION */}
        {isSubscriptionPending && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 border-2 border-indigo-500/50 p-5 sm:p-6 text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[11px] font-black uppercase tracking-wider mb-1 border border-indigo-400/30">
                    <span>👑 Modèle Abonnement Sélectionné</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Souscrivez à un abonnement pour débloquer tous les services, applications, modules et outils concernés
                  </h3>
                  <p className="text-xs sm:text-sm text-indigo-200/90 font-medium max-w-2xl mt-1">
                    Votre identification KYC est enregistrée sous le modèle forfaitaire. Activez votre plan d’abonnement pour lever immédiatement les restrictions et profiter de l’écosystème à 0% de commission additionnelle.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    if (onOpenUpgrade) {
                      onOpenUpgrade();
                    } else {
                      setIsProModalOpen(true);
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-500/30 border border-purple-400/30 flex items-center justify-center gap-2 transition transform active:scale-95 cursor-pointer"
                >
                  <span>Souscrire à un abonnement</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================================
            0. SÉLECTEUR DE MODE CAMÉLÉON 1-CLIC & QUARTIER GÉNÉRAL ADAPTATIF
               (Bleu Royal #2563EB & Blanc Pur #FFFFFF)
           ======================================================================= */}
        

        <section className="rounded-3xl bg-[#FFFFFF] border-2 border-[#2563EB] p-4 sm:p-6 shadow-2xl space-y-5 text-slate-900">
          {/* Barre supérieure : Titre + Sélecteur 1-Clic en Bleu Royal (#2563EB) et Blanc Pur (#FFFFFF) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-blue-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB] text-[#FFFFFF] text-[11px] font-black uppercase tracking-wider shadow-sm">
                <span>🎯 Tableau de Bord Caméléon • Quartier Général</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 tracking-tight">
                {sellerMode === 'creator_trainer'
                  ? '🎓 Espace Formateur, Infopreneur & Produits Digitaux'
                  : sellerMode === 'hybrid_all'
                  ? '🚀 Vue Hybride Complète (Commerçant E-Shop + Académie & Formations)'
                  : '🛍️ Espace Commerçant, Boutique E-Commerce & Vente Omnicanal'}
              </h2>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Basculez d'un mode à l'autre en 1 clic à tout moment. Votre interface s'adapte instantanément à votre activité.
              </p>
            </div>

            {/* Sélecteur de Mode Caméléon en 1 Clic */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-blue-50/80 p-1.5 rounded-2xl border-2 border-[#2563EB]/30 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectSellerMode('creator_trainer')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  sellerMode === 'creator_trainer'
                    ? 'bg-[#2563EB] text-[#FFFFFF] shadow-md shadow-blue-600/30 scale-[1.01]'
                    : 'bg-[#FFFFFF] text-[#2563EB] border border-[#2563EB]/20 hover:bg-blue-50'
                }`}
              >
                <span>🎓 Espace Formateur & Digital</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSellerMode('merchant_ecommerce')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  sellerMode === 'merchant_ecommerce'
                    ? 'bg-[#2563EB] text-[#FFFFFF] shadow-md shadow-blue-600/30 scale-[1.01]'
                    : 'bg-[#FFFFFF] text-[#2563EB] border border-[#2563EB]/20 hover:bg-blue-50'
                }`}
              >
                <span>🛍️ Espace Commerçant & E-Shop</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSellerMode('hybrid_all')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  sellerMode === 'hybrid_all'
                    ? 'bg-[#2563EB] text-[#FFFFFF] shadow-md shadow-blue-600/30 scale-[1.01]'
                    : 'bg-[#FFFFFF] text-[#2563EB] border border-[#2563EB]/20 hover:bg-blue-50'
                }`}
              >
                <span>🚀 Vue Hybride Complète</span>
              </button>
            </div>
          </div>

          {/* A. QUAND LE VENDEUR EST EN 🎓 MODE FORMATEUR (creator_trainer) */}
          {sellerMode === 'creator_trainer' && (
            <div className="space-y-4">
              {/* 4 Actions Prioritaires Formateur */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onNavigate('COURSE_CREATE');
                  }}
                  className="p-4 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-[#FFFFFF] text-left transition-all shadow-lg shadow-blue-600/20 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">➕</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                      Format 1080×1080
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-black text-sm leading-snug">
                      ➕ Créer une Formation / Ebook / Produit Digital (1080×1080)
                    </div>
                    <p className="text-[11px] text-blue-100 mt-1 font-medium">
                      Publiez vos cours vidéo, PDF, Ebooks et masterclass en quelques clics.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    if (onOpenWebinarModal) onOpenWebinarModal();
                    else onNavigate('LIVE_ROOM');
                  }}
                  className="p-4 rounded-2xl bg-[#FFFFFF] hover:bg-blue-50 text-slate-900 border-2 border-[#2563EB] text-left transition-all shadow-sm cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🔴</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                      Nanasore Live OS
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-black text-sm text-[#2563EB] leading-snug">
                      🔴 Lancer un Cours ou Webinaire en Direct
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 font-medium">
                      Nanasore Live OS : Quiz interactifs, Devoirs PDF & Coaching 1-to-1.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onNavigate('MODULAR_FUNNEL');
                  }}
                  className="p-4 rounded-2xl bg-[#FFFFFF] hover:bg-blue-50 text-slate-900 border-2 border-[#2563EB] text-left transition-all shadow-sm cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">⚡</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#2563EB]">
                      12 Blocs Pro
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-black text-sm text-[#2563EB] leading-snug">
                      ⚡ Funnel Builder Modulaire (12 Blocs Haute Conversion)
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 font-medium">
                      Page de capture, vidéo VSL, témoignages et paiement Mobile Money 1-clic.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onNavigate('STUDIO');
                  }}
                  className="p-4 rounded-2xl bg-[#FFFFFF] hover:bg-blue-50 text-slate-900 border-2 border-[#2563EB] text-left transition-all shadow-sm cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🎨</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#2563EB]">
                      Design Studio
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-black text-sm text-[#2563EB] leading-snug">
                      🎨 Personnaliser mon Académie / Boutique en Ligne (Studio)
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 font-medium">
                      Personnalisez votre vitrine académique, couleurs et bannières HD.
                    </p>
                  </div>
                </button>
              </div>

              {/* KPIs Formateur */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-[#2563EB]/25 flex flex-col justify-between">
                  <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider">
                    Ventes Formations & Digitaux
                  </span>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-lg sm:text-xl font-black text-slate-900">
                      {formatCFA(metrics.todayTotal)}
                    </span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      +18%
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-[#2563EB]/25 flex flex-col justify-between">
                  <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider">
                    Élèves Inscrits
                  </span>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-lg sm:text-xl font-black text-slate-900">
                      {customers.length} élève{customers.length > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('INSTRUCTOR')}
                      className="text-[10px] font-black text-[#2563EB] underline cursor-pointer"
                    >
                      Voir cohortes →
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-[#2563EB]/25 flex flex-col justify-between">
                  <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider">
                    Devoirs PDF Reçus
                  </span>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-lg sm:text-xl font-black text-slate-900">
                      {customers.length > 0 ? `${customers.length} devoirs` : "0 à corriger"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('INSTRUCTOR')}
                      className="text-[10px] font-black text-[#2563EB] underline cursor-pointer"
                    >
                      Ouvrir correction →
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-[#2563EB]/25 flex flex-col justify-between">
                  <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider">
                    Revenus Tunnels & Lives
                  </span>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-lg sm:text-xl font-black text-slate-900">
                      {formatCFA(metrics.allSalesTotal)}
                    </span>
                    <span className="text-[10px] font-black text-[#2563EB] bg-blue-100 px-2 py-0.5 rounded-full">
                      Tunnels Actifs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. QUAND LE VENDEUR EST EN 🛍️ MODE COMMERÇANT (merchant_ecommerce) OU 🚀 HYBRIDE (hybrid_all) */}
          {(sellerMode === 'merchant_ecommerce' || sellerMode === 'hybrid_all') && (
            <div className="space-y-4">
              <HybridAnalyticsCardsGrid
                metrics={metrics}
                inventory={inventory}
                customerOrders={customerOrders}
                customers={customers}
                sales={sales}
                settings={settings}
                sellerMode={sellerMode}
                onNavigate={onNavigate}
                onOpenWebinarModal={onOpenWebinarModal}
                onOpenAffiliation={onOpenAffiliation}
                onOpenMarketingAi={onOpenMarketingAi}
                onOpenExcelImporter={onOpenExcelImporter}
                onStoreClosedPrompt={() => setShowStoreClosedPrompt(true)}
              />

              {/* Si Mode Hybride : barre d'accès rapide supplémentaire aux outils Formateur & Académie */}
              {sellerMode === 'hybrid_all' && (
                <div className="p-3.5 rounded-md bg-blue-50 border-2 border-blue-200/80 shadow-[0_2px_0_rgba(29,78,216,0.1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🎓</span>
                    <div>
                      <div className="text-xs font-black text-[#2563EB] uppercase tracking-wide">
                        Extension Hybride Active : Académie, Formations & Lives OS
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Vos outils de formation digitale (1080×1080) et de webinaire en direct sont activés aux côtés de votre boutique physique & E-Shop.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate('COURSE_CREATE')}
                      className="px-3.5 py-2 rounded-sm bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer shadow-xs active:translate-y-0.5"
                    >
                      ➕ Créer Formation (1080×1080)
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('INSTRUCTOR')}
                      className="px-3.5 py-2 rounded-sm bg-white hover:bg-blue-100 text-[#2563EB] border-2 border-[#2563EB] text-xs font-black transition cursor-pointer active:translate-y-0.5"
                    >
                      🎓 Centre de Création de Cours, et De Formation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        
        {/* =======================================================================
            1. SÉPARATION ARCHITECTURALE SAAS MULTI-TENANT : QUOTAS (GÉRANT) OU MONITORING (SUPER ADMIN)
           ======================================================================= */}
        <DashboardQuotaMonitorSwitch
          currentUser={currentUser}
          subscription={subscription}
          onOpenUpgrade={onOpenUpgrade}
          sales={sales}
          inventory={inventory}
          onNavigate={onNavigate}
        />

        {/* =======================================================================
            DIRECTEUR DE LA CROISSANCE & STRATÉGIE COMMERCIALE (AGENT NSORE)
           ======================================================================= */}
        <div id="growth-director-section">
          <GrowthDirectorAssistant
            userFullName={settings?.managerFullName || currentUser?.name}
            userName={currentUser?.name}
            storeName={settings?.companyName || currentUser?.storeName || 'Mon Entreprise Nanasore'}
            currency={settings?.currencySymbol || 'FCFA'}
            sellerMode={sellerMode}
            isNewUser={!subscription || subscription?.plan === 'FREE' || (!sales?.length && !inventory?.length)}
            salesCount={sales?.length || 0}
            productsCount={inventory?.length || 0}
            currentPlan={subscription?.plan || 'Gratuit'}
          />
        </div>

        {/* =======================================================================
            2. SECTION ANALYTIQUE EN TEMPS RÉEL & COURBE DES GAINS
           ======================================================================= */}
        <section className="rounded-3xl bg-[#FFFFFF] border-2 border-[#2563EB] p-4 sm:p-6 shadow-2xl space-y-4 text-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#2563EB] border border-[#2563EB]/25 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Courbe des Gains & Performance Financière
                </h2>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                Suivi dynamique des recettes, de la rentabilité et du volume de transactions
              </p>
            </div>

            {/* Sélecteur de période */}
            <div className="flex items-center gap-1 bg-blue-50/80 p-1 rounded-xl border border-blue-200 shrink-0">
              <button
                type="button"
                onClick={() => { playTapBeep(); setActiveChartPeriod('TODAY'); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeChartPeriod === 'TODAY' 
                    ? 'bg-[#2563EB] text-[#FFFFFF] shadow-sm' 
                    : 'text-slate-600 hover:text-[#2563EB]'
                }`}
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => { playTapBeep(); setActiveChartPeriod('7D'); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeChartPeriod === '7D' 
                    ? 'bg-[#2563EB] text-[#FFFFFF] shadow-sm' 
                    : 'text-slate-600 hover:text-[#2563EB]'
                }`}
              >
                7 Jours
              </button>
              <button
                type="button"
                onClick={() => { playTapBeep(); setActiveChartPeriod('30D'); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeChartPeriod === '30D' 
                    ? 'bg-[#2563EB] text-[#FFFFFF] shadow-sm' 
                    : 'text-slate-600 hover:text-[#2563EB]'
                }`}
              >
                30 Jours
              </button>
            </div>
          </div>

          {/* Grille des 4 KPIs Rapides */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* KPI 1 : Recette du Jour */}
            <div className="bg-blue-50/70 border-2 border-[#2563EB]/25 hover:border-[#2563EB] rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between transition-colors shadow-xs">
              <div className="flex items-center justify-between text-slate-600 text-[11px] font-bold">
                <span>Recette du Jour</span>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] px-1.5 py-0.2 rounded-md font-extrabold">Aujourd'hui</span>
              </div>
              <div className="mt-1">
                <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {formatCFA(metrics.todayTotal)}
                </span>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{metrics.todayCount} tickets enregistrés</p>
              </div>
            </div>

            {/* KPI 2 : Marge Nette Estimée */}
            <div className="bg-blue-50/70 border-2 border-[#2563EB]/25 hover:border-[#2563EB] rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between transition-colors shadow-xs">
              <div className="flex items-center justify-between text-slate-600 text-[11px] font-bold">
                <span>Marge Nette (26%)</span>
                <span className="bg-blue-100 text-[#2563EB] border border-blue-300 text-[9px] px-1.5 py-0.2 rounded-md font-extrabold">Bénéfice</span>
              </div>
              <div className="mt-1">
                <span className="text-lg sm:text-xl font-black text-emerald-700 tracking-tight">
                  {formatCFA(metrics.estimatedMargin)}
                </span>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Rentabilité nette estimée</p>
              </div>
            </div>

            {/* KPI 3 : Créances Clients (Dettes) */}
            <div className="bg-blue-50/70 border-2 border-[#2563EB]/25 hover:border-[#2563EB] rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between transition-colors shadow-xs">
              <div className="flex items-center justify-between text-slate-600 text-[11px] font-bold">
                <span>Créances à Recouvrer</span>
                <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[9px] px-1.5 py-0.2 rounded-md font-extrabold">
                  {metrics.customersWithDebt} clients
                </span>
              </div>
              <div className="mt-1">
                <span className="text-lg sm:text-xl font-black text-rose-600 tracking-tight">
                  {formatCFA(metrics.totalDebt)}
                </span>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Carnet de dettes actif</p>
              </div>
            </div>

            {/* KPI 4 : Stock & Alertes */}
            <div className="bg-blue-50/70 border-2 border-[#2563EB]/25 hover:border-[#2563EB] rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between transition-colors shadow-xs">
              <div className="flex items-center justify-between text-slate-600 text-[11px] font-bold">
                <span>Articles Référencés</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-extrabold border ${
                  metrics.lowStockCount > 0 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-blue-100 text-[#2563EB] border-blue-200'
                }`}>
                  {metrics.lowStockCount > 0 ? `${metrics.lowStockCount} alertes` : 'Stock Sain'}
                </span>
              </div>
              <div className="mt-1">
                <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {inventory.length} produits
                </span>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Catalogue POS & E-Shop</p>
              </div>
            </div>
          </div>

          {/* Graphique SVG Interactif & Réactif (Zero Lag sur Infinix/Android) */}
          <div className="relative pt-2">
            <div className="w-full h-44 sm:h-48 overflow-hidden relative bg-blue-50/40 rounded-2xl border border-blue-100 p-2">
              <svg 
                viewBox="0 0 600 180" 
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="earningsGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grille horizontale de fond */}
                <line x1="20" y1="30" x2="580" y2="30" stroke="#CBD5E1" strokeDasharray="3 3" />
                <line x1="20" y1="80" x2="580" y2="80" stroke="#CBD5E1" strokeDasharray="3 3" />
                <line x1="20" y1="130" x2="580" y2="130" stroke="#CBD5E1" strokeDasharray="3 3" />

                {/* Surface sous la courbe */}
                {hasRealSales && <path d={svgPath.area} fill="url(#earningsGlow)" />}

                {/* Ligne principale lissée */}
                <path 
                  d={svgPath.path} 
                  fill="none" 
                  stroke={hasRealSales ? '#2563eb' : '#94a3b8'} 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Points interactifs */}
                {hasRealSales && svgPath.points.map((pt, idx) => (
                  <g key={`pt-${idx}`}>
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r={hoveredPointIndex === idx ? 6.5 : 4} 
                      className="fill-white stroke-[#2563eb] transition-all cursor-pointer"
                      strokeWidth="3"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onTouchStart={() => setHoveredPointIndex(idx)}
                    />
                  </g>
                ))}
              </svg>

              {/* État vide élégant & motivant si 0 vente */}
              {!hasRealSales && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-white/80 backdrop-blur-[2px] rounded-2xl border border-blue-200">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#2563EB] flex items-center justify-center mb-2 border border-blue-300">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 max-w-sm">
                    Vos futures ventes apparaîtront ici.
                  </p>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs font-medium">
                    Enregistrez votre première vente en caisse ou partagez votre boutique en ligne !
                  </p>
                </div>
              )}

              {/* Tooltip flottant au survol / toucher */}
              {hasRealSales && hoveredPointIndex !== null && chartData[hoveredPointIndex] && (
                <div 
                  className="absolute z-20 bg-[#FFFFFF] border-2 border-[#2563EB] rounded-xl px-3 py-1.5 text-xs shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full text-slate-900"
                  style={{ 
                    left: `${(svgPath.points[hoveredPointIndex].x / 600) * 100}%`,
                    top: `${(svgPath.points[hoveredPointIndex].y / 180) * 100 - 8}%`
                  }}
                >
                  <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>{chartData[hoveredPointIndex].label}</span>
                    <span className="text-[10px] text-slate-500">({chartData[hoveredPointIndex].dateFormatted})</span>
                  </div>
                  <div className="text-[#2563EB] font-black">
                    {formatCFA(chartData[hoveredPointIndex].amount)}
                  </div>
                  <div className="text-[10px] text-slate-600 font-medium">
                    {chartData[hoveredPointIndex].count} tickets de caisse
                  </div>
                </div>
              )}
            </div>

            {/* Étiquettes sous la courbe */}
            <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] font-bold text-slate-600">
              {chartData.map((d, i) => (
                <span 
                  key={`lbl-${i}`}
                  onClick={() => setHoveredPointIndex(i)}
                  className={`cursor-pointer transition ${hoveredPointIndex === i ? 'text-[#2563EB] font-black scale-110' : 'hover:text-slate-900'}`}
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* =======================================================================
            3. ACCÈS RAPIDE CATALOGUE INTÉGRÉ SANS CARTES ENCOMBRANTES
           ======================================================================= */}
        <div className="p-4 rounded-2xl bg-[#09152e]/80 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-300 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center shrink-0 shadow-sm">
              <LayoutGrid className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <div className="text-xs font-black text-white">
                Catalogue Intégré : 27 Services, Applications, Modules et Outils
              </div>
              <p className="text-[11px] text-slate-400">
                Accédez instantanément à chaque outil via le bouton <span className="text-cyan-300 font-bold">« Liste de nos Services, Applications, Modules et Outils »</span> du menu ou l'Omnibar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              window.dispatchEvent(new CustomEvent('nanasore_open_omnibar'));
            }}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition shadow-md cursor-pointer shrink-0"
          >
            🔍 Ouvrir l'Omnibar
          </button>
        </div>
      </main>

        {/* Footer Discret & Accès Sécurisé */}
        <footer className="mt-auto py-6 border-t border-blue-900/40 text-center text-xs text-blue-200/70">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 Nanasore • Tous droits réservés</span>
            <button 
              type="button"
              onClick={() => {
                playTapBeep();
                if (onOpenSecretAdminModal) onOpenSecretAdminModal();
                else if (onOpenSaasAdmin) onOpenSaasAdmin();
              }}
              className="font-mono text-[10px] text-blue-300/70 hover:text-white cursor-pointer select-none transition"
              title="Système sécurisé"
            >
              v2.4 • Sécurité & Intégrité
            </button>
          </div>
        </footer>
      </div>

      {/* =========================================================================
          MODALE COMPLÈTE : PARAMÈTRES GÉNÉRAUX & SÉLECTEUR DE DEVISE / PAYS
         ========================================================================= */}
      {isSettingsModalOpen && (
        <GeneralSettingsModal
          initialSettings={settings}
          currentUser={currentUser}
          storeId={currentUser?.storeId || 'store-nanasore-main'}
          initialTab={settingsModalTab}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsModalOpen(false)}
          onOpenKycChain={() => setIsKycChainWizardOpen(true)}
        />
      )}

      {/* =========================================================================
          NOUVELLE PAGE / VUE DÉDIÉE : CHAÎNE D'IDENTIFICATION KYC MARCHAND
         ========================================================================= */}
      <MerchantIdentificationChainView
        isOpen={isKycChainWizardOpen}
        onClose={() => setIsKycChainWizardOpen(false)}
        storeId={currentUser?.storeId || 'store-nanasore-main'}
        initialType={kycWizardInitialType}
        onSuccess={() => {
          getIdentificationChain(currentUser?.storeId || 'store-nanasore-main').then(chain => {
            if (chain) setIdChain(chain);
          });
        }}
      />

      {/* Modale des Fonctionnalités PRO & Exclusives */}
      {isProModalOpen && (
        <ProFeaturesModal
          isOpen={isProModalOpen}
          initialTab={proModalTab}
          currentUser={currentUser}
          subscription={subscription}
          onClose={() => setIsProModalOpen(false)}
          onUpgrade={onOpenUpgrade}
          onNavigateToCrm={() => {
            setIsProModalOpen(false);
            onNavigate('CRM_DASHBOARD');
          }}
        />
      )}

      {/* Modale d'avertissement Caisse Fermée */}
      {showStoreClosedPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                Boutique &amp; Caisse Fermées
              </span>
              <h3 className="text-base font-black text-white mt-1">La caisse est actuellement verrouillée</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Votre boutique est actuellement fermée. Pour utiliser la Caisse Tactile et enregistrer des paiements, veuillez réouvrir la boutique.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowStoreClosedPrompt(false);
                  handleToggleStoreStatus();
                  onNavigate('POS');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Store className="w-4 h-4" />
                🟢 Réouvrir la Boutique &amp; Aller à la Caisse
              </button>
              <button
                type="button"
                onClick={() => setShowStoreClosedPrompt(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLG Upsell Modal (Verrouillages Pro 👑 & Quotas Dépassés 🚧) */}
      <UpsellModal onUpgrade={onOpenUpgrade} />

      {/* Modale de Test & Prévisualisation du Certificat Officiel */}
      <CertificatePreviewModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
      />

      {/* Rédacteur d'E-mails & Notifications Brevo API v3 (@nanasore.com) */}
      <BrevoEmailComposerModal
        isOpen={isEmailComposerOpen}
        onClose={() => setIsEmailComposerOpen(false)}
        currentUser={currentUser}
        defaultRecipient={composerRecipient}
        defaultSubject={composerSubject}
      />

      {/* =========================================================================
          TIROIR LATÉRAL : MES SERVICES, APPS, MODULES & OUTILS ACTIVÉS
          (Déclenché par les 3 points / tirets carrément en haut à droite)
         ========================================================================= */}
      {isActiveSolutionsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay flou d'arrière-plan */}
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsActiveSolutionsDrawerOpen(false)}
          />

          {/* Panneau Glissant depuis la Droite */}
          <div className="relative w-full max-w-sm sm:max-w-md h-full bg-[#081533] border-l-2 border-[#2563EB]/50 shadow-2xl flex flex-col z-50 text-slate-100 animate-in slide-in-from-right duration-200">
            {/* Header du Tiroir */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#061026]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>📌 Mes Solutions Activées</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {activePinnedApps.length} active{activePinnedApps.length > 1 ? 's' : ''}
                    </span>
                  </h3>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    Applications, services, modules & outils actifs
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsActiveSolutionsDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps du Tiroir : Liste Déroulante avec Logo, Badges et Pastille Active */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {activePinnedApps.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center space-y-3 my-8">
                  <p className="text-sm text-slate-300 font-bold">Aucune solution épinglée</p>
                  <p className="text-xs text-slate-400">
                    Ajoutez vos applications préférées pour les retrouver ici en un clic.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsActiveSolutionsDrawerOpen(false);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('nanasore_open_omnibar'));
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Ajouter une application</span>
                  </button>
                </div>
              ) : (
                activePinnedApps.map(({ app, data }) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      playTapBeep();
                      setIsActiveSolutionsDrawerOpen(false);
                      if (app.route && typeof window !== 'undefined') {
                        window.history.pushState({}, '', app.route);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                      if (app.targetView) onNavigate(app.targetView);
                    }}
                    className="p-3 rounded-xl bg-[#0D1D42]/80 hover:bg-blue-900/40 border border-white/[0.08] hover:border-blue-400/50 transition-all cursor-pointer group flex items-center justify-between gap-3 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Logo vectoriel miniature dans son conteneur */}
                      <div className="w-9 h-9 rounded-xl bg-white/[0.08] p-1.5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                        {app.appLogo ? (
                          <img src={app.appLogo} alt={app.appName} className="w-full h-full object-contain" />
                        ) : (
                          <Box className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            className="text-xs sm:text-sm font-black text-blue-400 group-hover:text-blue-200 transition-colors truncate"
                            style={{ textShadow: '0 0 8px rgba(59, 130, 246, 0.7)' }}
                          >
                            {app.appName}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider border ${
                            app.taxonomy === 'SERVICE' || app.taxonomyType === 'Service'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                              : app.taxonomy === 'OUTIL' || app.taxonomyType === 'Outil'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                              : app.taxonomy === 'MODULE' || app.taxonomyType === 'Module'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                          }`}>
                            [{app.taxonomyType || app.taxonomy || 'Application'}]
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {app.shortDescription || app.category}
                        </p>
                      </div>
                    </div>

                    {/* Pastille verte active & Flèche */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span 
                        className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" 
                        title="Solution activée"
                      />
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pied du Tiroir */}
            <div className="p-3 border-t border-white/[0.08] bg-[#061026] space-y-2">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsActiveSolutionsDrawerOpen(false);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('nanasore_open_omnibar'));
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-900/40 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Ajouter une application (Omnibar)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsActiveSolutionsDrawerOpen(false);
                  setIsSolutionsCatalogOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Explorer tout le Catalogue (36 Solutions)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALE DU CATALOGUE DES 36 SOLUTIONS (SERVICES, APPS, MODULES & OUTILS)
          (Déclenchée par le bouton icône Layers à côté de Certificat / Cadenas)
         ========================================================================= */}
      {isSolutionsCatalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop Flouté */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsSolutionsCatalogOpen(false)}
          />

          {/* Fenêtre Modale */}
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#081533] border-2 border-[#2563EB]/50 rounded-3xl shadow-2xl flex flex-col z-50 text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header de la Modale */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#061026] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-900/30 flex items-center justify-center">
                  <div className="w-full h-full bg-[#081533] rounded-[14px] flex items-center justify-center">
                    <Layers className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Catalogue de nos Solutions</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                      36 au total
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Applications, Services, Modules et Outils professionnels Nanasore
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSolutionsCatalogOpen(false)}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre de Recherche & Filtres Taxonomie */}
            <div className="p-4 border-b border-white/[0.06] bg-[#07132e] space-y-3">
              {/* Champ Recherche */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Rechercher un service, une application, un module ou un outil..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 transition"
                  autoFocus
                />
                {catalogSearch && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Onglets Taxonomie */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setCatalogTaxonomyFilter('ALL'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    catalogTaxonomyFilter === 'ALL'
                      ? 'bg-[#2563EB] text-white shadow-md'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  Tous ({ALL_SOLUTIONS_CATALOG.length})
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setCatalogTaxonomyFilter('APPLICATION'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    catalogTaxonomyFilter === 'APPLICATION'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                  }`}
                >
                  [Application] (14)
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setCatalogTaxonomyFilter('SERVICE'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    catalogTaxonomyFilter === 'SERVICE'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
                >
                  [Service] (8)
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setCatalogTaxonomyFilter('MODULE'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    catalogTaxonomyFilter === 'MODULE'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                  }`}
                >
                  [Module] (8)
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setCatalogTaxonomyFilter('OUTIL'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    catalogTaxonomyFilter === 'OUTIL'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  }`}
                >
                  [Outil] (6)
                </button>
              </div>
            </div>

            {/* Grille des Solutions */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 scrollbar-thin">
              {filteredSolutionsCatalog.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                  <p className="text-sm font-semibold">Aucune solution ne correspond à votre recherche.</p>
                  <button
                    type="button"
                    onClick={() => { setCatalogSearch(''); setCatalogTaxonomyFilter('ALL'); }}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                filteredSolutionsCatalog.map((item) => {
                  const isTool = item.taxonomy === 'OUTIL';
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleCatalogItemClick(item)}
                      className="p-3.5 rounded-2xl bg-[#0D1D42]/80 hover:bg-blue-900/40 border border-white/[0.08] hover:border-blue-400/50 transition-all cursor-pointer group flex flex-col justify-between gap-2.5 active:scale-[0.99]"
                    >
                      <div>
                        {/* En-tête : Titre Allumant Bleu & Badge Taxonomie */}
                        <div className="flex items-center justify-between gap-2">
                          <span 
                            className="text-sm font-black text-blue-400 group-hover:text-blue-200 transition-colors"
                            style={{ textShadow: '0 0 10px rgba(59, 130, 246, 0.8)' }}
                          >
                            {item.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${getCatalogBadgeStyle(item.taxonomy)}`}>
                            [{getCatalogBadgeLabel(item.taxonomy)}]
                          </span>
                        </div>

                        <ExpandableModuleDescription
                          id={item.id}
                          description={item.description}
                          defaultClamped="line-clamp-2"
                        />
                      </div>

                      {/* Pied de Carte : Catégorie & Bouton d'Action */}
                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400 font-medium">
                          • {item.category}
                        </span>

                        {/* Bouton Remplacé par "Acheter" pour les Outils */}
                        <div className={`flex items-center gap-1 font-bold text-xs ${
                          isTool ? 'text-amber-400' : 'text-blue-400 group-hover:text-cyan-300'
                        }`}>
                          <span>{isTool ? '🛒 Acheter' : 'Accéder'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pied de Modale */}
            <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#061026] flex items-center justify-between text-xs text-slate-400">
              <span className="text-cyan-300/90 font-semibold">
                ✨ {filteredSolutionsCatalog.length} / 36 éléments affichés
              </span>
              <button
                type="button"
                onClick={() => setIsSolutionsCatalogOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 font-bold transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// COMPOSANT SOUS-JACENT : CARTE DE MODULE HAUTE DÉFINITION (ENTERPRISE SAAS)
// ===========================================================================
interface ModuleCardProps {
  module: {
    id: string;
    title: string;
    badge: string;
    badgeColor: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    iconBg: string;
    actionText: string;
    action: () => void;
    hotkey?: string;
    isPro?: boolean;
    proKey?: ProFeatureKey;
    softGuidance?: boolean;
    guidanceLabel?: string;
  };
  isFreeAccount?: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = React.memo(({ module, isFreeAccount = false }) => {
  const IconComponent = module.icon;
  const isLockedPro = Boolean(module.isPro && isFreeAccount);

  const handleClick = () => {
    playTapBeep();
    if (isLockedPro && module.proKey) {
      triggerProFeatureUpsell(module.proKey);
    } else {
      module.action();
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`bg-[#12224c]/70 hover:bg-[#182c61]/80 border rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-[0.99] relative overflow-hidden text-slate-100 ${
        isLockedPro 
          ? 'border-amber-400/50 hover:border-amber-400' 
          : module.softGuidance 
          ? 'border-emerald-500/50 hover:border-emerald-500' 
          : 'border-blue-500/30 hover:border-blue-400/60'
      }`}
    >
      {/* Halo discret en arrière-plan au survol */}
      <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-xl transition-all duration-300 pointer-events-none ${
        isLockedPro 
          ? 'bg-amber-400/10 group-hover:bg-amber-400/20' 
          : 'bg-[#2563EB]/10 group-hover:bg-[#2563EB]/20'
      }`} />

      <div>
        {/* En-tête : Icône & Badge */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105 ${
            isLockedPro ? 'bg-amber-500/10 border-amber-400/30 text-amber-400' : `${module.iconBg} ${module.iconColor}`
          }`}>
            {module.id === 'mod-wameet-supra' ? (
              <WameetSquircleIcon pixelSize={32} />
            ) : (
              <IconComponent className="w-4 h-4" />
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {module.softGuidance && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-300" />
                <span>{module.guidanceLabel || 'Commencez ici'}</span>
              </span>
            )}
            {module.hotkey && (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[9px] font-mono text-slate-300 font-bold">
                {module.hotkey}
              </span>
            )}
            {isLockedPro ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400/40 bg-amber-500/15 text-amber-300 shadow-xs">
                <Crown className="w-3 h-3 text-amber-400 fill-amber-400/40 animate-pulse" />
                <span>{module.badge}</span>
              </span>
            ) : (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shadow-xs ${module.badgeColor}`}>
                {module.badge}
              </span>
            )}
          </div>
        </div>

        {/* Titre = Lien Allumant Bleu + Badge de Taxonomie */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleClick();
            }}
            className="text-sm font-black text-blue-400 hover:text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.85)] hover:underline inline-flex items-center gap-1.5 transition-all cursor-pointer"
            style={{ textShadow: '0 0 8px rgba(59, 130, 246, 0.75)' }}
          >
            <span>{module.title}</span>
            <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          </a>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider bg-blue-500/15 text-blue-300 border border-blue-400/30 shadow-xs shrink-0">
            [{getTaxonomyBadge(module)}]
          </span>
        </div>
        <ExpandableModuleDescription
          id={module.id}
          description={module.description}
          defaultClamped="line-clamp-2"
        />
      </div>

      {/* Bouton d'action en bas */}
      <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-300 group-hover:text-blue-300">
        <span className={`font-extrabold flex items-center gap-1 ${isLockedPro ? 'text-amber-400' : ''}`}>
          {isLockedPro 
            ? 'Débloquer (Pro)' 
            : (getTaxonomyBadge(module) === 'Outil' && (module.actionText?.toLowerCase().includes('activer') || module.id.includes('tool')))
            ? '🛒 Acheter'
            : module.actionText}
        </span>
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
          isLockedPro 
            ? 'bg-amber-500/20 border border-amber-400/40 group-hover:bg-amber-500 group-hover:text-white text-amber-300' 
            : 'bg-blue-500/20 border border-blue-400/40 group-hover:bg-[#2563EB] group-hover:text-white text-blue-300'
        }`}>
          {isLockedPro ? (
            <Crown className="w-3.5 h-3.5" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          )}
        </div>
      </div>
    </div>
  );
});

// ===========================================================================
// MODALE INTÉGRÉE : PARAMÈTRES GÉNÉRAUX & SÉLECTEUR PAYS / DEVISE
// ===========================================================================
interface GeneralSettingsModalProps {
  initialSettings: GeneralSettingsData;
  currentUser?: StoreUser | null;
  storeId?: string;
  initialTab?: 'PROFILE' | 'CURRENCY' | 'PAYMENTS' | 'INVOICING';
  onSave: (settings: GeneralSettingsData) => void;
  onClose: () => void;
  onOpenKycChain?: () => void;
}

const GeneralSettingsModal: React.FC<GeneralSettingsModalProps> = ({
  initialSettings,
  currentUser,
  storeId = 'store-nanasore-main',
  initialTab = 'PROFILE',
  onSave,
  onClose,
  onOpenKycChain
}) => {
  const [formData, setFormData] = useState<GeneralSettingsData>(initialSettings);
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'CURRENCY' | 'PAYMENTS' | 'INVOICING'>(
    initialTab === ('ID_CHAIN' as any) ? 'PROFILE' : initialTab
  );

  // Chaîne d'identification séquentielle (Partie 1 Individuel + Partie 2 Entreprise)
  const [idChain, setIdChain] = useState<IdentificationChain>(() => {
    const resolvedStoreId = currentUser?.storeId || storeId;
    try {
      const local = localStorage.getItem(`nana_id_chain_${resolvedStoreId}`);
      if (local) return JSON.parse(local);
    } catch (e) {}
    return { ...DEFAULT_NANASORE_CHAIN, storeId: resolvedStoreId };
  });

  // Synchronisation dynamique si modifiée ailleurs
  useEffect(() => {
    const resolvedStoreId = currentUser?.storeId || storeId;
    getIdentificationChain(resolvedStoreId).then(chain => {
      if (chain) setIdChain(chain);
    });
  }, [currentUser?.storeId, storeId]);

  const countryOptions = [
    { code: 'BF', name: 'Burkina Faso', currency: 'F CFA', symbol: 'XOF', flag: '🇧🇫' },
    { code: 'CI', name: 'Côte d’Ivoire', currency: 'F CFA', symbol: 'XOF', flag: '🇨🇮' },
    { code: 'SN', name: 'Sénégal', currency: 'F CFA', symbol: 'XOF', flag: '🇸🇳' },
    { code: 'ML', name: 'Mali', currency: 'F CFA', symbol: 'XOF', flag: '🇲🇱' },
    { code: 'GN', name: 'Guinée Conakry', currency: 'Franc Guinéen', symbol: 'GNF', flag: '🇬🇳' },
    { code: 'BJ', name: 'Bénin', currency: 'F CFA', symbol: 'XOF', flag: '🇧🇯' },
    { code: 'TG', name: 'Togo', currency: 'F CFA', symbol: 'XOF', flag: '🇹🇬' },
    { code: 'NE', name: 'Niger', currency: 'F CFA', symbol: 'XOF', flag: '🇳🇪' },
    { code: 'INT_USD', name: 'International (USD)', currency: 'Dollar US', symbol: '$', flag: '🌐' },
    { code: 'INT_EUR', name: 'International (Euro)', currency: 'Euro', symbol: '€', flag: '🇪🇺' },
  ];

  const handleCountryChange = (code: string) => {
    playTapBeep();
    const found = countryOptions.find(c => c.code === code);
    if (found) {
      setFormData(prev => ({
        ...prev,
        countryCode: found.code,
        currencySymbol: found.currency
      }));
    }
  };

  // Upload Photo Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file, 400, 0.85);
      setFormData(prev => ({ ...prev, logoUrl: compressed }));
      playValidationBeep();
    } catch (err) {
      console.error("Erreur logo", err);
    }
  };

  // Upload Bannière Boutique
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file, 1200, 0.80);
      setFormData(prev => ({ ...prev, bannerUrl: compressed }));
      playValidationBeep();
    } catch (err) {
      console.error("Erreur bannière", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAndBlockDemoAction(currentUser)) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  Paramètres Généraux & KYC
                </h3>
                <span className="bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[9px] font-black px-2 py-0.5 rounded-full">
                  NANASORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Profil dirigeant, coordonnées légales, identité visuelle et conformité financière
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { playTapBeep(); onClose(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Onglets internes de configuration */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`px-3 py-2 text-xs font-black border-b-2 transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'PROFILE' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profil & Entreprise</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CURRENCY')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'CURRENCY' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Pays & Devise</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'PAYMENTS' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Modes de Paiement</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INVOICING')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'INVOICING' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Facturation & Caisse</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
              if (onOpenKycChain) onOpenKycChain();
            }}
            className="ml-auto px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95 shrink-0"
            title="Ouvrir la Chaîne d'Identification KYC"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
            <span>Chaîne d'Identification KYC →</span>
          </button>
        </div>

        {/* Corps défilable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* =========================================================================
              1. SECTION PROFIL COMPLET (USER & BUSINESS PROFILE) - EN HAUT
             ========================================================================= */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Bannière d'accès vers la Chaîne d'Identification KYC */}
              <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-white">Chaîne d'Identification KYC Marchand</h4>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {idChain.overallStatus === 'FULLY_VERIFIED' ? '2/2 Validé ✓' : 'Partie 1 & 2'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Processus d'identification souverain en chaîne pour sécuriser vos encaissements réels et débloquer les plafonds.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    onClose();
                    if (onOpenKycChain) onOpenKycChain();
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{idChain.overallStatus === 'FULLY_VERIFIED' ? 'Gérer mon Identification' : 'Commencer l\'Identification →'}</span>
                </button>
              </div>

              {/* Carte Branding : Bannière & Logo */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    Identité Visuelle & Image de Marque
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Bannière & Logo synchronisés</span>
                </div>

                {/* Bannière d'en-tête */}
                <div className="h-32 sm:h-36 w-full rounded-2xl relative overflow-hidden bg-slate-900 border border-slate-800 group">
                  {formData.bannerUrl ? (
                    <img 
                      src={formData.bannerUrl} 
                      alt="Bannière Boutique" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-900/50 via-slate-900 to-indigo-950/50 flex items-center justify-center text-slate-500 text-xs font-bold">
                      Aucune bannière configurée
                    </div>
                  )}

                  {/* Bouton Téléverser Bannière */}
                  <label className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-lg backdrop-blur-xs transition">
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    <span>Modifier la Bannière</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleBannerUpload} 
                      className="hidden" 
                    />
                  </label>

                  {/* Logo flottant en bas à gauche */}
                  <div className="absolute bottom-2 left-3 sm:left-4 flex items-end gap-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-blue-500/80 bg-slate-950 shadow-2xl overflow-hidden relative group/logo shrink-0">
                      {formData.logoUrl ? (
                        <img 
                          src={formData.logoUrl} 
                          alt="Logo Entreprise" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-400 bg-slate-900">
                          <Building className="w-7 h-7" />
                        </div>
                      )}

                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-bold cursor-pointer transition">
                        <UploadCloud className="w-4 h-4 text-blue-300 mb-0.5" />
                        <span>Changer</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                          className="hidden" 
                        />
                      </label>
                    </div>

                    <div className="mb-1">
                      <div className="text-xs font-black text-white drop-shadow-md">
                        {formData.storeName || "NANASORE BOUTIQUE"}
                      </div>
                      <div className="text-[10px] text-blue-300 font-bold drop-shadow-md">
                        Dirigeant : {formData.managerFullName || "Gérant Boutique"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Saisie manuelle d'URL optionnelle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-800/80">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">URL Directe du Logo</label>
                    <input 
                      type="text" 
                      value={formData.logoUrl || ''} 
                      onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">URL Directe de la Bannière</label>
                    <input 
                      type="text" 
                      value={formData.bannerUrl || ''} 
                      onChange={e => setFormData({ ...formData, bannerUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Informations du Dirigeant (Identité Personnelle) */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    Direction & Identité du Dirigeant
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold">
                    Fondateur & Directeur Général
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nom Légal Complet du Dirigeant
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={formData.managerFullName}
                        onChange={e => setFormData({ ...formData, managerFullName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none font-bold"
                        required
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Adresse Email Officielle
                    </label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none font-medium"
                        required
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Téléphone Principal & Ligne WhatsApp
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.whatsappPhone}
                      onChange={e => setFormData({ ...formData, whatsappPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none font-bold text-emerald-400"
                      required
                    />
                    <PhoneCall className="w-4 h-4 text-emerald-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Utilisé pour les réceptions de commandes clients en direct et l'envoi de tickets thermiques dématérialisés.
                  </p>
                </div>
              </div>

              {/* Informations Légales de l'Entreprise */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    Identité Juridique & Fiscale de l’Entreprise
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">BCEAO / OHADA</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Raison Sociale Officielle</label>
                    <input 
                      type="text" 
                      value={formData.companyName}
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Nom Commercial de l’Établissement</label>
                    <input 
                      type="text" 
                      value={formData.storeName}
                      onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none font-bold text-blue-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Numéro IFU (Identifiant Fiscal Unique)</label>
                    <input 
                      type="text" 
                      value={formData.ifuNumber}
                      onChange={e => setFormData({ ...formData, ifuNumber: e.target.value })}
                      placeholder="00123456B"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Numéro RCCM (Registre du Commerce)</label>
                    <input 
                      type="text" 
                      value={formData.rccmNumber}
                      onChange={e => setFormData({ ...formData, rccmNumber: e.target.value })}
                      placeholder="BF-OUA-01-2024-B12-0042"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Adresse Physique & Siège Social</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 : Pays & Devise */}
          {activeTab === 'CURRENCY' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Sélectionnez le pays d’opération principal :</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {countryOptions.map(c => (
                    <div
                      key={c.code}
                      onClick={() => handleCountryChange(c.code)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        formData.countryCode === c.code 
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-900/20' 
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{c.flag}</span>
                        <div>
                          <div className="text-xs font-extrabold">{c.name}</div>
                          <div className="text-[10px] text-slate-400">{c.currency} ({c.symbol})</div>
                        </div>
                      </div>
                      {formData.countryCode === c.code && (
                        <Check className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Symbole ou Libellé de Devise affiché</label>
                <input 
                  type="text" 
                  value={formData.currencySymbol}
                  onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none font-bold text-emerald-400"
                  required
                />
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Ce symbole est automatiquement utilisé sur les tickets de caisse, fiches produits et rapports financiers.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3 : Modes de Paiement */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs text-slate-400">
                Activez ou désactivez les moyens d'encaissement disponibles lors des ventes en caisse et sur la vitrine :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'cash', label: 'Espèces (Cash)', desc: 'Encaissement liquide au comptoir' },
                  { key: 'orangeMoney', label: 'Orange Money', desc: 'Code marchand & push USSD' },
                  { key: 'moovMoney', label: 'Moov Money', desc: 'Passerelle Mobile Money' },
                  { key: 'wave', label: 'Wave Money', desc: 'Code QR & lien direct' },
                  { key: 'mtn', label: 'MTN Mobile Money', desc: 'Passerelle Afrique de l’Ouest' },
                  { key: 'crypto', label: 'USDT Crypto (TRC20)', desc: 'Règlement Web3 & Tiers' },
                ].map(opt => (
                  <label 
                    key={opt.key}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{opt.label}</span>
                      <span className="text-[10.5px] text-slate-400">{opt.desc}</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={(formData.acceptedPayments as any)[opt.key]}
                      onChange={e => setFormData({
                        ...formData,
                        acceptedPayments: {
                          ...formData.acceptedPayments,
                          [opt.key]: e.target.checked
                        }
                      })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4 : Facturation & Caisse */}
          {activeTab === 'INVOICING' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <label className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition">
                <div>
                  <span className="text-xs font-bold text-white block">Impression automatique du ticket de caisse</span>
                  <span className="text-[10.5px] text-slate-400">Lance la boîte d'impression thermique dès la validation de la vente</span>
                </div>
                <input 
                  type="checkbox"
                  checked={formData.autoPrintReceipts}
                  onChange={e => setFormData({ ...formData, autoPrintReceipts: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                />
              </label>

              <label className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition">
                <div>
                  <span className="text-xs font-bold text-white block">Autoriser les ventes à crédit (Carnet d’Ardoise)</span>
                  <span className="text-[10.5px] text-slate-400">Permet d'affecter un montant restant dû à un client régulier</span>
                </div>
                <input 
                  type="checkbox"
                  checked={formData.enableCreditSales}
                  onChange={e => setFormData({ ...formData, enableCreditSales: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                />
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Taux de TVA appliqué par défaut</label>
                <select
                  value={formData.taxRate}
                  onChange={e => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value={0}>0% (Franchise en base / Régime Micro-Entreprise)</option>
                  <option value={18}>18% (TVA Standard 18%)</option>
                </select>
              </div>
            </div>
          )}

          {/* Boutons d'enregistrement des paramètres généraux */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => { playTapBeep(); onClose(); }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-extrabold transition shadow-lg shadow-blue-900/40 cursor-pointer flex items-center gap-1.5 min-h-[44px]"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer tous les Paramètres</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CentralMasterHubView;

