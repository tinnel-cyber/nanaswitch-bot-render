/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import './initGlobalReact';
import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';

// Sécurité globale anti-crash : Exposition des hooks React au scope global
if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, { React, useState, useEffect, useCallback, useMemo, useRef, useContext });
}
if (typeof window !== 'undefined') {
  Object.assign(window, { React, useState, useEffect, useCallback, useMemo, useRef, useContext });
}

import { autoCleanSmsDatabase } from './services/smsCleanerService';
import { initSuperAdminSync } from './services/superAdminService';
import {
  CartItem,
  FastSaleProduct,
  DebtCustomer,
  CompletedSale,
  InventoryProduct,
  LossRecord,
  StockMovement,
  StoreUser,
  SellerUser,
  CustomerOrder,
  VoiceSimulationScenarioConfig
} from './types';
import {
  FAST_SALE_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_INVENTORY,
  INITIAL_LOSSES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SELLERS
} from './data/initialData';
import { HeaderReceipt } from './components/HeaderReceipt';
import { DesktopPosRegister } from './components/DesktopPosRegister';
import { QuickCustomerDebtRow } from './components/QuickCustomerDebtRow';
import { FastSaleGrid } from './components/FastSaleGrid';
import { BottomControls } from './components/BottomControls';
import { CashPaymentModal } from './components/CashPaymentModal';
import { CreditModal } from './components/CreditModal';
import { SellerSwitchModal } from './components/SellerSwitchModal';
import { PosSearchBar } from './components/PosSearchBar';
import { PinKeypadModal } from './components/PinKeypadModal';
import { ManagerAuthModal } from './components/ManagerAuthModal';
import { isCashierSession } from './utils/managerSecurityService';
import { auth, logoutUser, onSupabaseAuthStateChange } from './firebase';
import { GoogleFlowToast } from './components/GoogleFlowToast';
import { ClassroomErrorBoundary } from './components/lms/ClassroomErrorBoundary';
import { ModuleErrorBoundary } from './components/ModuleErrorBoundary';
import { NanaAcademyDrawer } from './components/NanaAcademyDrawer';
import { MiniVideoPlayer } from './components/MiniVideoPlayer';
import { TutorialItem, toggleTutorialCompleted, getCompletedTutorialIds } from './services/tutorialService';
import { NanasoreAssistantBubble } from './components/assistant/NanasoreAssistantBubble';

// Modules Métiers Secondaires & Modales Lourdes (Chargement différé React.lazy pour alléger le bundle principal au démarrage)
const DebtBookView = React.lazy(() => import('./components/DebtBookView').then(m => ({ default: m.DebtBookView })));
const ReportsView = React.lazy(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView })));
const VoiceTestComponent = React.lazy(() => import('./components/VoiceTestComponent').then(m => ({ default: m.VoiceTestComponent })));
const InventoryView = React.lazy(() => import('./components/InventoryView').then(m => ({ default: m.InventoryView })));
const CustomerOrdersView = React.lazy(() => import('./components/CustomerOrdersView').then(m => ({ default: m.CustomerOrdersView })));
const SettingsExtensionsView = React.lazy(() => import('./components/SettingsExtensionsView').then(m => ({ default: m.SettingsExtensionsView })));
const DashboardView = React.lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const BoutiqueAdminModal = React.lazy(() => import('./components/BoutiqueAdminModal').then(m => ({ default: m.BoutiqueAdminModal })));
const ThermalReceiptModal = React.lazy(() => import('./components/ThermalReceiptModal').then(m => ({ default: m.ThermalReceiptModal })));
const BarcodeSelfieScanner = React.lazy(() => import('./components/BarcodeSelfieScanner').then(m => ({ default: m.BarcodeSelfieScanner })));
const PrivacyPolicyModal = React.lazy(() => import('./components/PrivacyPolicyModal').then(m => ({ default: m.PrivacyPolicyModal })));
const SecretAdminAccessModal = React.lazy(() => import('./components/SecretAdminAccessModal').then(m => ({ default: m.SecretAdminAccessModal })));
const LegalAiAdvisorWidget = React.lazy(() => import('./components/LegalAiAdvisorWidget').then(m => ({ default: m.LegalAiAdvisorWidget })));
const EscrowQuotesView = React.lazy(() => import('./components/quotes/EscrowQuotesView'));
const PublicEscrowProjectView = React.lazy(() => import('./components/quotes/PublicEscrowProjectView'));
const ResumeBuilderView = React.lazy(() => import('./components/resume/ResumeBuilderView'));
const SaasAdminDashboard = React.lazy(() => import('./components/SaasAdminDashboard').then(m => ({ default: m.SaasAdminDashboard })));
const ControlPlaneRouter = React.lazy(() => import('./admin/ControlPlaneRouter'));
const DocuSignHub = React.lazy(() => import('./components/DocuSignHub'));
const MarketingAIAssistantModal = React.lazy(() => import('./components/MarketingAIAssistantModal').then(m => ({ default: m.MarketingAIAssistantModal })));
const AiAdvisorView = React.lazy(() => import('./components/AiAdvisorView').then(m => ({ default: m.AiAdvisorView })));
const SubscriptionPaywallModal = React.lazy(() => import('./components/SubscriptionPaywallModal').then(m => ({ default: m.SubscriptionPaywallModal })));
const AffiliateDashboardModal = React.lazy(() => import('./components/AffiliateDashboardModal').then(m => ({ default: m.AffiliateDashboardModal })));
const PartnerProgramLandingView = React.lazy(() => import('./components/partner/PartnerProgramLandingView').then(m => ({ default: m.PartnerProgramLandingView })));
const PublicWebinarLandingView = React.lazy(() => import('./components/PublicWebinarLandingView').then(m => ({ default: m.PublicWebinarLandingView })));
const PublicLiveSessionPage = React.lazy(() => import('./pages/PublicLiveSessionPage').then(m => ({ default: m.PublicLiveSessionPage })));
const CourseLandingPageView = React.lazy(() => import('./components/lms/CourseLandingPageView').then(m => ({ default: m.CourseLandingPageView })));
const MarketplaceDiscoveryHub = React.lazy(() => import('./components/lms/marketplace/MarketplaceDiscoveryHub').then(m => ({ default: m.MarketplaceDiscoveryHub })));
const CourseDetailPage = React.lazy(() => import('./components/lms/marketplace/CourseDetailPage').then(m => ({ default: m.CourseDetailPage })));
const VirtualCampusView = React.lazy(() => import('./components/lms/VirtualCampusView').then(m => ({ default: m.default || m.VirtualCampusView })));
const InstructorHubView = React.lazy(() => import('./components/lms/InstructorHubView').then(m => ({ default: m.InstructorHubView })));
const InstructorDashboardView = React.lazy(() => import('./components/lms/InstructorDashboardView').then(m => ({ default: m.InstructorDashboardView })));
const HighTechFunnelPage = React.lazy(() => import('./components/lms/promo/HighTechFunnelPage').then(m => ({ default: m.HighTechFunnelPage })));
const CentralMasterHubView = React.lazy(() => import('./components/CentralMasterHubView').then(m => ({ default: m.CentralMasterHubView })));
const HubBuilderPage = React.lazy(() => import('./pages/admin/HubBuilder').then(m => ({ default: m.HubBuilderPage || m.default })));
const UltimateFunnelBuilder = React.lazy(() => import('./components/storeBuilder/UltimateFunnelBuilder').then(m => ({ default: m.UltimateFunnelBuilder || m.default })));
const PhysicalFunnelBuilder = React.lazy(() => import('./components/storeBuilder/PhysicalFunnelBuilder').then(m => ({ default: m.PhysicalFunnelBuilder || m.default })));
const FunnelBuilder = React.lazy(() => import('./components/storeBuilder/FunnelBuilder').then(m => ({ default: m.FunnelBuilder || m.default })));
const CreateWebinarModal = React.lazy(() => import('./components/CreateWebinarModal').then(m => ({ default: m.CreateWebinarModal })));
const ExcelImporterModal = React.lazy(() => import('./components/inventory/ExcelImporterModal').then(m => ({ default: m.ExcelImporterModal })));
const MerchantFlashAlert = React.lazy(() => import('./components/flashLive/MerchantFlashAlert').then(m => ({ default: m.MerchantFlashAlert })));
const LiveIncomingCallAlert = React.lazy(() => import('./components/live/LiveIncomingCallAlert').then(m => ({ default: m.LiveIncomingCallAlert })));
const SmartCheckoutPage = React.lazy(() => import('./components/funnel/SmartCheckoutPage').then(m => ({ default: m.SmartCheckoutPage })));
const PublicDealPageView = React.lazy(() => import('./components/funnel/PublicDealPageView').then(m => ({ default: m.PublicDealPageView })));
const PublicPhysicalFunnelView = React.lazy(() => import('./components/funnel/PublicPhysicalFunnelView').then(m => ({ default: m.PublicPhysicalFunnelView || m.default })));
const PublicModularTunnelView = React.lazy(() => import('./components/funnel/PublicModularTunnelView').then(m => ({ default: m.PublicModularTunnelView || m.default })));
const WelcomeShowcaseScreen = React.lazy(() => import('./components/WelcomeShowcaseScreen'));
const WelcomeAuthScreen = React.lazy(() => import('./components/WelcomeAuthScreen').then(m => ({ default: m.WelcomeAuthScreen })));
const StorePendingApprovalScreen = React.lazy(() => import('./components/StorePendingApprovalScreen').then(m => ({ default: m.StorePendingApprovalScreen })));
const VoiceSimulationArena = React.lazy(() => import('./components/lms/arena/VoiceSimulationArena').then(m => ({ default: m.VoiceSimulationArena })));
const CRMDashboard = React.lazy(() => import('./components/CRMDashboard').then(m => ({ default: m.CRMDashboard || m.default })));
const AuthScreen = React.lazy(() => import('./components/auth/AuthScreen').then(m => ({ default: m.AuthScreen })));
const UpsellModal = React.lazy(() => import('./components/quotas/UpsellModal').then(m => ({ default: m.UpsellModal })));
const AiStudioView = React.lazy(() => import('./components/ai/AiStudioView').then(m => ({ default: m.AiStudioView })));
const NanaGeneratorModal = React.lazy(() => import('./components/NanaGeneratorModal').then(m => ({ default: m.NanaGeneratorModal })));
const KycVerificationModal = React.lazy(() => import('./components/storeBuilder/KycVerificationModal').then(m => ({ default: m.KycVerificationModal })));
import { lazyWithRetry } from './utils/lazyWithRetry';
const MarketDirectory = lazyWithRetry(() => import('./components/directory/MarketDirectory'));
const StoreStudioPage = lazyWithRetry(() => import('./pages/StoreStudioPage'));
const PublicStorefrontPage = lazyWithRetry(() => import('./pages/PublicStorefrontPage'));
const NaNaSwitchAppPage = React.lazy(() => import('./pages/nanaSwitch/NaNaSwitchAppPage').then(m => ({ default: m.NaNaSwitchAppPage || m.default })));
const NaNaSwitchDocsPage = React.lazy(() => import('./pages/nanaSwitch/NaNaSwitchDocsPage').then(m => ({ default: m.NaNaSwitchDocsPage || m.default })));
const NaNaSwitchLandingPage = React.lazy(() => import('./pages/nanaSwitch/NaNaSwitchLandingPage').then(m => ({ default: m.NaNaSwitchLandingPage || m.default })));
const NanaSwitchApp = React.lazy(() => import('./components/nanaSwitch/NanaSwitchApp').then(m => ({ default: m.NanaSwitchApp || m.default })));
const NanaWalletHome = React.lazy(() => import('./apps/wallet/NanaWalletHome'));
const WameetSupraApp = React.lazy(() => import('./pages/wameet/WameetSupraApp').then(m => ({ default: m.WameetSupraApp || m.default })));
const SallesVipDiscoveryScreen = React.lazy(() => import('./components/vip/SallesVipDiscoveryScreen').then(m => ({ default: m.SallesVipDiscoveryScreen || m.default })));
const SalleVipRoomView = React.lazy(() => import('./components/vip/SalleVipRoomView').then(m => ({ default: m.SalleVipRoomView || m.default })));
const WameetRoomView = React.lazy(() => import('./components/wameet/WameetRoomView').then(m => ({ default: m.WameetRoomView || m.default })));
const CertificatePage = React.lazy(() => import('./pages/CertificatePage').then(m => ({ default: m.CertificatePage || m.default })));
const StudentDashboardPage = React.lazy(() => import('./pages/StudentDashboardPage').then(m => ({ default: m.StudentDashboardPage || m.default })));
const CashierConnectPage = React.lazy(() => import('./pages/CashierConnectPage').then(m => ({ default: m.CashierConnectPage || m.default })));
const StandaloneAppHost = React.lazy(() => import('./components/apps/StandaloneAppHost').then(m => ({ default: m.StandaloneAppHost })));
const CheckoutReturnView = React.lazy(() => import('./components/payment/CheckoutReturnView').then(m => ({ default: m.CheckoutReturnView || m.default })));
const TestSupabaseScreen = React.lazy(() => import('./components/TestSupabaseScreen'));
const ProductsScreen = React.lazy(() => import('./components/ProductsScreen'));
const TenantEmailingDashboardPage = React.lazy(() => import('../app/dashboard/marketing/emailing/page'));
import { getMarketplaceCourseById } from './services/marketplaceService';
import { AuthProvider } from './context/AuthContext';
import { useTenant } from './context/TenantContext';
import { CustomDomainNotFoundScreen } from './components/common/CustomDomainNotFoundScreen';
import { StorefrontNeutralLoader } from './components/common/StorefrontNeutralLoader';
import { isNativeDomain, extractSubdomain } from './services/tenantDomainService';
import { saveFunnelConfig } from './services/omniFunnelService';
import { getSafeStoreSlug } from './utils/slugEngine';
import { ensureAndPersistTenantSlug } from './utils/slugService';
import { THEME_PREFIX_REGEX, extractPublicStoreRouteParams } from './utils/themeRoutePrefix';
import { NanasoreLogo } from './components/common/NanasoreLogo';

// 3. LoadingScreen ultra-léger et Cyber-Premium pour transition fluide en Code Splitting / Lazy Loading
export const LoadingScreen: React.FC<{ message?: string; label?: string }> = ({ message, label }) => {
  const displayLabel = message || label || 'Chargement de Nanasore...';
  return (
    <div className="min-h-screen w-full bg-[#020B1E] flex flex-col items-center justify-center p-4 text-slate-100 font-sans select-none">
      <div className="relative flex flex-col items-center justify-center mb-5">
        <NanasoreLogo variant="full" size="lg" theme="dark" />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-xs font-black text-slate-200 tracking-wide">{displayLabel}</span>
      </div>
    </div>
  );
};

const LazyModuleFallback = LoadingScreen;

const LazyModalFallback: React.FC<{ label?: string }> = ({ label = 'Chargement...' }) => (
  <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-slate-100">
    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
    <span className="text-xs font-bold text-slate-300">{label}</span>
  </div>
);

import {
  StoreSubscription,
  StoreApprovalStatus,
  CasierSession
} from './types';
import { getOrCreateTabCasierSession } from './services/casierSessionService';
import {
  ReceiptData,
  buildReceiptFromCart,
  buildReceiptFromSale,
  downloadReceiptPdf,
} from './utils/receiptGenerator';
import {
  generateSaleIntegrityHash,
  persistCompletedSale,
  persistInventoryProduct,
  persistCustomer,
  persistLoss,
  persistStockMovement,
  persistSeller,
  persistCustomerOrder,
  deleteCustomerOrder,
  subscribeToStoreCollection,
  getStoreSubscription,
  subscribeToStoreSubscription,
  subscribeToUserProfile,
  pruneStaleStorageCaches,
  updateSellerModeInFirestore,
} from './utils/firestoreService';
import { queuePosSaleBatch } from './services/offlineSyncService';
import { runAutomatedStorageGC, safeSetItem, safeGetItem, safeRemoveItem } from './utils/storageManager';
import { playTapBeep, playValidationBeep, playCashChime, playCancelSound, formatCFA } from './utils/audio';
import { isLimitReached, triggerLimitReachedUpsell, triggerProFeatureUpsell, isFreePlan, normalizePlanId, getPlanLimits, triggerUpsellModal, resolveSellerMode, persistSellerModeLocally } from './utils/planFeatures';
import {
  CheckCircle2,
  History,
  RotateCcw,
  Sparkles,
  TrendingUp,
  BookOpen,
  ShoppingBag,
  Mic,
  Store,
  Boxes,
  Bot,
  Wand2,
  Printer,
  FileDown,
  FileText,
  Barcode,
  Camera,
  Users,
  Gift,
  FolderKanban,
  FileBadge,
  Lock,
  LayoutGrid,
  GraduationCap,
  ArrowLeft,
  X,
  Package,
  Bell,
  ShieldAlert
} from 'lucide-react';
import { StoreCustomerOrder, startOrderRealtimeSync } from './services/orderSyncService';
import { LiveOrderNotificationBanner } from './components/LiveOrderNotificationBanner';
import { 
  isSuperAdminLocally, 
  verifySuperAdminPrivileges, 
  KNOWN_SUPERADMIN_UIDS, 
  KNOWN_SUPERADMIN_EMAILS 
} from './services/superAdminService';

const SUPERADMIN_EMAILS = KNOWN_SUPERADMIN_EMAILS;

export type AppView =
  | 'EMAILING'
  | 'emailing' 
  | 'HOME'
  | 'home'
  | 'LANDING'
  | 'landing'
  | 'MASTER_HUB'
  | 'POS' 
  | 'POS_CONNECT'
  | 'pos_connect'
  | 'INVENTORY' 
  | 'BOUTIQUE' 
  | 'DOCUSIGN' 
  | 'DEVIS' 
  | 'ORDERS' 
  | 'SUPERADMIN' 
  | 'TARIFS' 
  | 'AI_LEGAL' 
  | 'AI_ADVISOR' 
  | 'REPORTS' 
  | 'DEBT_BOOK' 
  | 'VOICE_TEST' 
  | 'SAAS_ADMIN' 
  | 'HUB_BUILDER'
  | 'hub_builder'
  | 'CRM_DASHBOARD'
  | 'CRM'
  | 'SETTINGS_EXTENSIONS' 
  | 'CUSTOMER_ORDERS' 
  | 'DASHBOARD' 
  | 'QUOTES_PROJECTS' 
  | 'CV_CREATOR'
  | 'auth_teacher'
  | 'AUTH_TEACHER'
  | 'teacher_dashboard'
  | 'TEACHER_DASHBOARD'
  | 'auth_merchant'
  | 'AUTH_MERCHANT'
  | 'PARTNER'
  | 'partner'
  | 'PARTNERS'
  | 'partners'
  | 'AFFILIATE'
  | 'affiliate'
  | 'AI_STUDIO'
  | 'ai_studio'
  | 'COURSE_CREATE'
  | 'course_create'
  | 'INSTRUCTOR'
  | 'instructor'
  | 'CAMPUS'
  | 'campus'
  | 'CATALOG'
  | 'catalog'
  | 'FUNNEL'
  | 'funnel'
  | 'TUNNEL'
  | 'tunnel'
  | 'ULTIMATE_FUNNEL'
  | 'ultimate_funnel'
  | 'PHYSICAL_FUNNEL'
  | 'physical_funnel'
  | 'CHECKOUT_FUNNEL'
  | 'checkout_funnel'
  | 'MODULAR_FUNNEL'
  | 'modular_funnel'
  | 'NANA_STUDIO'
  | 'nana_studio'
  | 'STUDIO'
  | 'studio'
  | 'MARKET_DIRECTORY'
  | 'market_directory'
  | 'INTERNATIONAL'
  | 'international'
  | 'PAYS_COUVERTS'
  | 'pays_couverts'
  | 'NANA_SWITCH_DOCS'
  | 'nana_switch_docs'
  | 'NANA_SWITCH'
  | 'nana_switch'
  | 'WAMEET'
  | 'wameet'
  | 'SALLES_VIP'
  | 'salles_vip'
  | 'SALLE_VIP'
  | 'salle_vip'
  | 'VIP'
  | 'vip'
  | 'TEST_SUPABASE'
  | 'test_supabase'
  | 'PRODUCTS'
  | 'products'
  | 'STANDALONE_APP'
  | 'standalone_app'
  | 'WALLET'
  | 'wallet'
  | 'NANA_WALLET'
  | 'nanawallet';
export default function App() {
  // Détection & Résolution Multi-Tenant Marque Blanche (Custom Domains)
  const { 
    isCustomDomain, 
    isNative, 
    hostname: customHostname, 
    tenant: customTenant, 
    isLoadingTenant, 
    tenantError, 
    refreshTenant 
  } = useTenant();

  // Détection URL publique Boutique ou Fiche Produit (/boutique/[id]/p/[productId], /shop/[id], /boutique/[id], ?store=id, etc.)
  const [publicBoutiqueParams, setPublicBoutiqueParams] = useState<{
    isBoutique: boolean;
    targetStoreId: string | null;
    targetProductId: string | null;
  }>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      if (pathname === '/dashboard/marketing/emailing' || pathname.startsWith('/dashboard/marketing/emailing') || pathname === '/marketing/emailing' || pathname === '/emailing' || urlParams.get('view') === 'emailing' || urlParams.get('page') === 'emailing') {
        return 'EMAILING';
      }
      if (
        pathname === '/test-supabase' ||
        pathname.startsWith('/test-supabase') ||
        pathname === '/products' ||
        pathname.startsWith('/products') ||
        pathname === '/pos' ||
        pathname.startsWith('/pos') ||
        pathname === '/dashboard' ||
        pathname.startsWith('/dashboard') ||
        pathname === '/auth/callback' ||
        pathname.startsWith('/auth/callback') ||
        pathname === '/admin' ||
        pathname.startsWith('/admin')
      ) {
        return { isBoutique: false, targetStoreId: null, targetProductId: null };
      }
      const params = new URLSearchParams(window.location.search);
      const isCustomHost = !isNativeDomain(window.location.hostname);

      let storeIdFromPath: string | null = null;
      let productIdFromPath: string | null = null;
      const isShopDomain = window.location.hostname.includes('nsore.shop');

      // Détection des URL propres (préfixes de thèmes, /s/:store, /boutique/:store, fiches produits, etc.)
      const routeParams = extractPublicStoreRouteParams(pathname);
      storeIdFromPath = routeParams.storeIdFromPath;
      productIdFromPath = routeParams.productIdFromPath;

      const isBoutiquePath =
        pathname === '/s' ||
        pathname.startsWith('/s/') ||
        pathname === '/shop' ||
        pathname.startsWith('/shop/') ||
        pathname === '/boutique' ||
        pathname.startsWith('/boutique/') ||
        pathname === '/store' ||
        pathname.startsWith('/store/') ||
        pathname === '/vitrine' ||
        pathname.startsWith('/vitrine/') ||
        pathname.startsWith('/p/') ||
        Boolean(storeIdFromPath);

      const pageParam = params.get('page');
      const isBoutiqueQuery = pageParam === 'boutique' || pageParam === 'store' || pageParam === 'shop' || pageParam === 'vitrine';
      const storeIdFromQuery =
        params.get('store') ||
        params.get('storeId') ||
        params.get('merchant') ||
        params.get('merchantId') ||
        params.get('boutique') ||
        params.get('shop') ||
        params.get('vitrine');
      const productId = productIdFromPath || params.get('produit') || params.get('product') || params.get('id');

      const isBoutique = isShopDomain || isCustomHost || isBoutiquePath || isBoutiqueQuery || !!storeIdFromQuery || !!productId;
      const targetStoreId = storeIdFromPath || storeIdFromQuery || null;

      if (isBoutique) {
        return {
          isBoutique: true,
          targetStoreId,
          targetProductId: productId || null,
        };
      }
    }
    return { isBoutique: false, targetStoreId: null, targetProductId: null };
  });

  // Current view: 'POS', 'INVENTORY', 'REPORTS', 'DEBT_BOOK', or 'VOICE_TEST'
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname === '/test-supabase' || pathname.startsWith('/test-supabase')) {
        return 'TEST_SUPABASE';
      }
      if (pathname === '/products' || pathname.startsWith('/products')) {
        return 'PRODUCTS';
      }
      if (pathname === '/pos' || pathname.startsWith('/pos')) {
        return 'POS';
      }
      const params = new URLSearchParams(window.location.search);
      const isBoutiquePath =
        pathname === '/s' ||
        pathname.startsWith('/s/') ||
        pathname === '/shop' ||
        pathname.startsWith('/shop/') ||
        pathname === '/boutique' ||
        pathname.startsWith('/boutique/') ||
        pathname === '/store' ||
        pathname.startsWith('/store/') ||
        pathname === '/vitrine' ||
        pathname.startsWith('/vitrine/');
      const pageParam = params.get('page');
      const isBoutiqueQuery = pageParam === 'boutique' || pageParam === 'store' || pageParam === 'shop';
      const storeIdFromQuery =
        params.get('store') ||
        params.get('storeId') ||
        params.get('merchant') ||
        params.get('merchantId') ||
        params.get('boutique') ||
        params.get('shop');
      const productId = params.get('produit') || params.get('product') || params.get('id');
      if (
        pathname === '/studio' ||
        pathname.startsWith('/studio/') ||
        pathname === '/store-studio' ||
        pathname === '/vitrine' ||
        params.get('view') === 'studio' ||
        params.get('page') === 'studio'
      ) {
        return 'STUDIO';
      }
      if (isBoutiquePath || isBoutiqueQuery || storeIdFromQuery || productId) {
        return 'STUDIO';
      }
      if (
        pathname === '/hub' ||
        pathname.startsWith('/hub') ||
        pathname === '/central-hub' ||
        pathname === '/master-hub' ||
        params.get('view') === 'hub' ||
        params.get('view') === 'master_hub'
      ) {
        return 'MASTER_HUB';
      }
      if (
        pathname === '/dashboard' ||
        pathname === '/dashboard/' ||
        pathname === '/dashboard/nanaswitch' ||
        pathname === '/dashboard/switch' ||
        params.get('view') === 'switch' ||
        params.get('view') === 'nanaswitch' ||
        params.get('view') === 'dashboard' ||
        params.get('page') === 'dashboard'
      ) {
        return 'NANA_SWITCH_APP';
      }

      // Logique Officielle des Modules & Slugs du Dashboard (/dashboard/{nom-du-module}/{nom-du-sous-module})
      if (pathname.startsWith('/dashboard/')) {
        const afterDash = pathname.replace(/^\/dashboard\/?/, '');
        const segments = afterDash.split('/').filter(Boolean);
        const modName = segments[0]?.toLowerCase();
        const subMod = segments[1]?.toLowerCase();

        if (modName === 'apps' && subMod) {
          if (subMod === 'nanagenerator' || subMod === 'nanagenerateur' || subMod === 'studio-ia') return 'AI_STUDIO';
          if (subMod === 'caisse-pos' || subMod === 'pos' || subMod === 'caisse') return 'POS';
          if (subMod === 'vitrine-eshop' || subMod === 'vitrine' || subMod === 'eshop' || subMod === 'boutique') return 'STUDIO';
          if (subMod === 'nana-market' || subMod === 'market') return 'MARKET_DIRECTORY';
          if (subMod === 'funnel-builder' || subMod === 'funnel') return 'MODULAR_FUNNEL';
          if (subMod === 'inventory-stock' || subMod === 'inventaire' || subMod === 'stock' || subMod === 'excel-importer') return 'INVENTORY';
          if (subMod === 'orders-quotes' || subMod === 'commandes') return 'CUSTOMER_ORDERS';
          if (subMod === 'reports-analytics' || subMod === 'rapports') return 'REPORTS';
          if (subMod === 'debt-book' || subMod === 'dettes') return 'DEBT_BOOK';
          if (subMod === 'partners-affiliate' || subMod === 'partenaire') return 'PARTNER';
          if (subMod === 'ai-gemini' || subMod === 'gemini') return 'AI_ADVISOR';
          if (subMod === 'cv-pro' || subMod === 'cv') return 'CV_CREATOR';
          if (subMod === 'lms-academy' || subMod === 'campus') return 'CAMPUS';
          if (subMod === 'lms-marketplace' || subMod === 'marketplace') return 'CATALOG';
          if (subMod === 'instructor-hub' || subMod === 'formateur') return 'INSTRUCTOR';
          if (subMod === 'certificate-hub' || subMod === 'certificats') return 'CERTIFICATE';
          if (subMod === 'wameet-network' || subMod === 'wameet') return 'WAMEET';
          if (subMod === 'salles-vip' || subMod === 'vip') return 'SALLES_VIP';
          if (subMod === 'nana-switch-app' || subMod === 'nanaswitch' || subMod === 'nanaswitch-app' || subMod === 'switch' || subMod === 'nana-switch') return 'NANA_SWITCH_APP';
          if (subMod === 'docusign-hub' || subMod === 'docusign') return 'DOCUSIGN';
          if (subMod === 'connectors-webhooks' || subMod === 'connecteurs') return 'SETTINGS_EXTENSIONS';
          if (subMod === 'saas-admin' || subMod === 'admin') return 'SAAS_ADMIN';
          return 'AI_STUDIO';
        }
        if (modName === 'nanagenerator' || modName === 'nanagenerateur') {
          return 'AI_STUDIO';
        }

        if (modName === 'pos' || modName === 'caisse') {
          if (subMod === 'connect') return 'POS_CONNECT';
          return 'POS';
        }
        if (modName === 'crm' || modName === 'crm-dashboard') {
          return 'CRM_DASHBOARD';
        }
        if (modName === 'vitrine' || modName === 'boutique' || modName === 'studio') {
          return 'STUDIO';
        }
        if (modName === 'funnel' || modName === 'funnels' || modName === 'tunnels' || modName === 'tunnel') {
          if (subMod === 'physical' || subMod === 'checkout') return 'PHYSICAL_FUNNEL';
          if (subMod === 'ultimate') return 'ULTIMATE_FUNNEL';
          return 'MODULAR_FUNNEL';
        }
        if (modName === 'inventaire' || modName === 'stock' || modName === 'excel') {
          return 'INVENTORY';
        }
        if (modName === 'commandes' || modName === 'devis' || modName === 'orders') {
          return 'CUSTOMER_ORDERS';
        }
        if (modName === 'rapports' || modName === 'finances' || modName === 'analytics') {
          return 'REPORTS';
        }
        if (modName === 'dettes' || modName === 'debt') {
          return 'DEBT_BOOK';
        }
        if (modName === 'partenaire' || modName === 'partenaires' || modName === 'affiliation' || modName === 'affiliate') {
          return 'PARTNER';
        }
        if (modName === 'ai-studio' || modName === 'studio-ia') {
          return 'AI_STUDIO';
        }
        if (modName === 'ai-advisor' || modName === 'gemini') {
          return 'AI_ADVISOR';
        }
        if (modName === 'cv' || modName === 'cvpro') {
          return 'CV_CREATOR';
        }
        if (modName === 'marketing' || modName === 'lives' || modName === 'webinaires') {
          return 'STUDIO';
        }
        if (modName === 'courses' && (subMod === 'create' || subMod === 'new')) {
          return 'COURSE_CREATE';
        }
        if (modName === 'formateur' || modName === 'instructor') {
          if (subMod === 'create' || subMod === 'nouveau') return 'COURSE_CREATE';
          return 'teacher_dashboard';
        }
        if (modName === 'connecteurs' || modName === 'passerelles' || modName === 'extensions') {
          return 'SETTINGS_EXTENSIONS';
        }
        if (modName === 'docusign' || modName === 'signatures') {
          return 'DOCUSIGN';
        }
        if (modName === 'admin' || modName === 'saas-admin' || modName === 'superadmin') {
          return 'SAAS_ADMIN';
        }
        if (modName === 'wameet') {
          return 'WAMEET';
        }
        if (modName === 'salles-vip' || modName === 'vip') {
          return 'SALLES_VIP';
        }
        if (modName === 'market' || modName === 'market-directory' || modName === 'annuaire') {
          return 'MARKET_DIRECTORY';
        }
        if (modName === 'nana-switch-app' || modName === 'nanaswitch-app' || modName === 'nana-switch' || modName === 'nanaswitch' || modName === 'switch') {
          return 'NANA_SWITCH_APP';
        }
      }
      const viewParam = params.get('view');
      if (
        pathname === '/admin/hub-builder' ||
        pathname === '/admin/hubbuilder' ||
        pathname === '/hub-builder' ||
        viewParam === 'hub_builder' ||
        viewParam === 'hub-builder' ||
        params.get('admin') === 'hub-builder'
      ) {
        return 'HUB_BUILDER';
      }
      if (
        pathname === '/admin' ||
        pathname.startsWith('/admin/') ||
        pathname === '/saas-admin' ||
        pathname === '/superadmin' ||
        viewParam === 'admin' ||
        viewParam === 'saas_admin' ||
        viewParam === 'superadmin' ||
        params.get('admin') === 'saas'
      ) {
        return 'SAAS_ADMIN';
      }
      if (
        pathname === '/pos/connect' ||
        pathname.startsWith('/pos/connect') ||
        viewParam === 'pos_connect' ||
        viewParam === 'pos-connect'
      ) {
        return 'POS_CONNECT';
      }
      if (
        pathname === '/pos/terminal' ||
        pathname === '/pos' ||
        pathname.startsWith('/pos/terminal') ||
        viewParam === 'pos'
      ) {
        return 'POS';
      }
      if (pathname === '/auth/teacher' || viewParam === 'auth_teacher' || params.get('auth') === 'teacher') return 'auth_teacher';
      if (pathname === '/auth/merchant' || viewParam === 'auth_merchant' || params.get('auth') === 'merchant') return 'auth_merchant';
      if (pathname === '/teacher-dashboard' || viewParam === 'teacher_dashboard') return 'teacher_dashboard';
      if (
        pathname === '/partenaire' ||
        pathname === '/partenaires' ||
        pathname === '/affiliate' ||
        pathname === '/affiliation' ||
        pathname === '/dashboard/partenaire' ||
        params.get('page') === 'partenaire' ||
        params.get('page') === 'partenaires' ||
        params.get('view') === 'partenaire' ||
        params.get('view') === 'partenaires' ||
        params.get('view') === 'affiliate' ||
        params.get('partner') === 'true'
      ) {
        return 'PARTNER';
      }
      if (
        pathname === '/dashboard/ai-studio' ||
        pathname === '/ai-studio' ||
        pathname === '/aistudio' ||
        pathname === '/generateur' ||
        pathname === '/generator' ||
        pathname === '/nana-generateur' ||
        pathname === '/builder' ||
        pathname.startsWith('/builder') ||
        pathname === '/funnel-builder' ||
        params.get('view') === 'ai-studio' ||
        params.get('page') === 'ai-studio' ||
        params.get('view') === 'generateur' ||
        params.get('view') === 'generator' ||
        params.get('view') === 'builder' ||
        params.get('view') === 'funnel-builder' ||
        params.has('builder')
      ) {
        return 'AI_STUDIO';
      }
      if (
        pathname === '/dashboard/courses/create' ||
        pathname === '/dashboard/courses/new' ||
        pathname === '/courses/create' ||
        pathname === '/courses/new' ||
        pathname === '/instructor/courses/new' ||
        pathname === '/instructor/courses/create' ||
        params.get('view') === 'course_create' ||
        params.get('view') === 'course-create' ||
        params.get('create_course') === 'true'
      ) {
        return 'COURSE_CREATE';
      }
      if (
        pathname === '/market' ||
        pathname === '/market-directory' ||
        pathname === '/directory' ||
        pathname === '/annuaire' ||
        pathname.startsWith('/market') ||
        pathname.startsWith('/directory') ||
        pathname.startsWith('/annuaire') ||
        params.get('view') === 'market' ||
        params.get('view') === 'market_directory' ||
        params.get('view') === 'directory' ||
        params.get('view') === 'annuaire' ||
        params.get('page') === 'market' ||
        params.get('page') === 'annuaire'
      ) {
        return 'MARKET_DIRECTORY';
      }
      if (
        pathname === '/app/nanaswitch' ||
        pathname === '/apps/nanaswitch' ||
        pathname === '/nana-switch-app' ||
        pathname === '/nana-switch-apppage' ||
        pathname === '/nanaswitch-app' ||
        pathname === '/nanaswitch-apppage' ||
        pathname === '/dashboard/nanaswitch' ||
        pathname === '/dashboard/apps/nana-switch-app' ||
        params.get('app') === 'nanaswitch' ||
        params.get('slug') === 'nanaswitch' ||
        params.get('view') === 'nanaswitch_app' ||
        params.get('view') === 'nana-switch-app'
      ) {
        return 'NANA_SWITCH_APP';
      }
      // Documentation Développeur Publique Autonome (100% Hors Application Protégée)
      if (
        pathname === '/docs' ||
        pathname.startsWith('/docs') ||
        pathname === '/documentation' ||
        pathname.startsWith('/documentation') ||
        pathname === '/nana-switch/docs' ||
        pathname === '/nanaswitch/docs' ||
        pathname === '/nanaswitch-docs' ||
        params.get('view') === 'docs' ||
        params.get('view') === 'documentation' ||
        params.get('page') === 'docs' ||
        params.get('page') === 'documentation'
      ) {
        return 'NANA_SWITCH_DOCS';
      }
      // Sous-routes console (/nana-switch/auth, /nana-switch/overview...) → AppPage
      // Route dédiée nanawallet (/wallet, /nanawallet)
      if (
        pathname === '/wallet' ||
        pathname === '/nanawallet' ||
        pathname === '/nana-wallet' ||
        pathname === '/app/wallet' ||
        pathname === '/apps/wallet' ||
        pathname.startsWith('/wallet') ||
        pathname.startsWith('/nanawallet') ||
        pathname.startsWith('/nana-wallet') ||
        params.get('view') === 'wallet' ||
        params.get('view') === 'nanawallet' ||
        params.get('page') === 'wallet' ||
        params.get('page') === 'nanawallet'
      ) {
        return 'WALLET';
      }

      if (pathname.startsWith('/nana-switch/') || pathname.startsWith('/nanaswitch/')) {
        return 'NANA_SWITCH_APP';
      }
      // Nouvelle Landing Page NanaSwitch (BYOK + 26 Pays) — route stricte /nana-switch
      if (
        pathname === '/nana-switch' ||
        pathname === '/nanaswitch' ||
        pathname === '/nana-switch/' ||
        params.get('view') === 'nana-switch' ||
        params.get('view') === 'nanaswitch' ||
        params.get('page') === 'nana-switch' ||
        params.get('page') === 'nanaswitch'
      ) {
        return 'NANA_SWITCH';
      }
      if (
        pathname === '/wameet' ||
        pathname.startsWith('/wameet/') ||
        pathname === '/communaute' ||
        pathname === '/community' ||
        pathname === '/reseau' ||
        params.get('view') === 'wameet' ||
        params.get('page') === 'wameet' ||
        params.get('view') === 'community' ||
        params.get('view') === 'communaute'
      ) {
        if (pathname !== '/wameet' && !pathname.startsWith('/wameet/')) {
          window.history.replaceState({}, '', '/wameet');
        }
        return 'WAMEET';
      }
      if (
        pathname === '/salles-vip' ||
        pathname.startsWith('/salles-vip/') ||
        pathname === '/vip' ||
        pathname.startsWith('/vip/') ||
        pathname === '/salles' ||
        pathname.startsWith('/salles/') ||
        params.get('view') === 'salles-vip' ||
        params.get('view') === 'vip' ||
        params.get('page') === 'salles-vip' ||
        params.get('page') === 'vip'
      ) {
        return 'SALLES_VIP';
      }
    }
    return 'MASTER_HUB';
  });

  // Détection URL des Salles VIP E-learning (/salles-vip/:id, /vip/salle/:id, /vip/room/:id)
  const [selectedVipRoomId, setSelectedVipRoomId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/salles-vip/')) {
        const parts = pathname.split('/salles-vip/');
        if (parts[1]) return decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
      }
      if (pathname.startsWith('/vip/salle/')) {
        const parts = pathname.split('/vip/salle/');
        if (parts[1]) return decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
      }
      if (pathname.startsWith('/vip/room/')) {
        const parts = pathname.split('/vip/room/');
        if (parts[1]) return decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('roomId') || params.get('room') || null;
    }
    return null;
  });
  const [selectedDebtCustomerId, setSelectedDebtCustomerId] = useState<string | null>(null);

  // Détection d'Application Autonome PWA (/dashboard/apps/:appId)
  const [currentStandaloneAppId, setCurrentStandaloneAppId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/dashboard/apps/')) {
        return pathname.split('/dashboard/apps/')[1]?.split('/')[0]?.split('?')[0] || null;
      }
    }
    return null;
  });

  // Détection URL publique de projet séquestre client (/p/:projectId ou ?p=...)
  const [publicEscrowProjectId, setPublicEscrowProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/p/')) {
        const parts = pathname.split('/p/');
        if (parts[1]) {
          return parts[1].split('/')[0].split('?')[0];
        }
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('p') || params.get('project');
    }
    return null;
  });

  // Détection URL de retour après Paiement Sebpay Hosted Checkout (/checkout/return)
  const [isCheckoutReturn, setIsCheckoutReturn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      return pathname.startsWith('/checkout/return') || pathname.startsWith('/payment/return') || pathname === '/checkout-return';
    }
    return false;
  });

  // Détection URL publique de Live / Webinaire (/live/:webinarId ou ?live=...)
  const [publicWebinarId, setPublicWebinarId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/live/')) {
        const parts = pathname.split('/live/');
        if (parts[1]) {
          return parts[1].split('/')[0].split('?')[0];
        }
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('live') || params.get('webinar');
    }
    return null;
  });

  // Détection URL Marketplace LMS (/catalog, /courses ou ?catalog=true)
  const [isCatalogView, setIsCatalogView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (
        pathname === '/catalog' || 
        pathname === '/courses' || 
        pathname === '/marketplace' ||
        pathname === '/dashboard/marketplace' ||
        pathname.startsWith('/dashboard/marketplace') ||
        pathname === '/dashboard/catalogue' ||
        pathname.startsWith('/dashboard/catalogue')
      ) {
        return true;
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('catalog') === 'true' || params.get('courses') === 'true' || params.get('marketplace') === 'true';
    }
    return false;
  });

  // Détection URL publique / dédiée Certificat Officiel & QR Code (/certificat, /certificate, /diplome ou ?cert=...)
  const [isCertificateView, setIsCertificateView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      return (
        pathname === '/certificat' ||
        pathname === '/certificate' ||
        pathname === '/diplome' ||
        pathname.startsWith('/certificat/') ||
        pathname.startsWith('/certificate/') ||
        params.get('view') === 'certificat' ||
        params.get('view') === 'certificate' ||
        params.has('cert')
      );
    }
    return false;
  });

  // Détection URL publique de Cours LMS (/course/:courseId ou /catalog/course/:courseId ou ?course=...)
  const [publicCourseId, setPublicCourseId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/catalog/course/')) {
        const parts = pathname.split('/catalog/course/');
        if (parts[1]) {
          return parts[1].split('/')[0].split('?')[0];
        }
      }
      if (pathname.startsWith('/course/')) {
        const parts = pathname.split('/course/');
        if (parts[1]) {
          return parts[1].split('/')[0].split('?')[0];
        }
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('course');
    }
    return null;
  });

  // Détection URL Tableau de Bord Étudiant (/campus-etudiant, /student-dashboard, /etudiant, /student, /campus ou ?student=true)
  const [isStudentDashboardView, setIsStudentDashboardView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (
        pathname === '/campus-etudiant' ||
        pathname === '/student-dashboard' ||
        pathname === '/student/dashboard' ||
        pathname.startsWith('/student/dashboard') ||
        pathname === '/etudiant' ||
        pathname === '/student' ||
        pathname === '/campus' ||
        pathname === '/mon-campus' ||
        pathname === '/dashboard/campus' ||
        pathname.startsWith('/dashboard/campus') ||
        pathname === '/dashboard/academie' ||
        pathname.startsWith('/dashboard/academie') ||
        pathname === '/dashboard/student' ||
        pathname.startsWith('/dashboard/student') ||
        params.get('view') === 'student' ||
        params.get('view') === 'student-dashboard' ||
        params.get('dashboard') === 'student'
      ) {
        return true;
      }
    }
    return false;
  });

  // Détection URL publique de Salle de Classe Virtuelle LMS (/classroom/:classroomId ou ?classroom=...)
  const [publicClassroomId, setPublicClassroomId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/classroom/')) {
        const parts = pathname.split('/classroom/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      if (pathname === '/classroom') {
        return 'telecom-fintech-masterclass';
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('classroom') || null;
    }
    return null;
  });

  // Détection URL publique Arène Vocale IA NaNa (/arena, /simulation ou ?arena=... ou ?simulation=...)
  const [publicArenaId, setPublicArenaId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/arena/')) {
        const parts = pathname.split('/arena/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      if (pathname === '/arena') return 'default-scenario';
      if (pathname.startsWith('/simulation/')) {
        const parts = pathname.split('/simulation/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      if (pathname === '/simulation') return 'default-scenario';
      const params = new URLSearchParams(window.location.search);
      return params.get('arena') || params.get('simulation');
    }
    return null;
  });

  // Détection URL Espace Formateur (/instructor ou /dashboard/academy ou /academy ou ?instructor=true)
  const [isInstructorView, setIsInstructorView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (
        pathname === '/instructor' || pathname.startsWith('/instructor/') ||
        pathname === '/dashboard/academy' || pathname.startsWith('/dashboard/academy') ||
        pathname === '/academy' || pathname.startsWith('/academy/') ||
        pathname === '/dashboard/courses/create' || pathname === '/dashboard/courses/new' ||
        pathname === '/courses/create' || pathname === '/courses/new' ||
        pathname === '/instructor/courses/new' || pathname === '/instructor/courses/create'
      ) {
        return true;
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('instructor') === 'true' || params.get('view') === 'academy';
    }
    return false;
  });

  // Détection URL publique Promo Funnel (/promo/:campaignId ou ?promo=... ou ?campaign=...)
  const [publicPromoId, setPublicPromoId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/promo/')) {
        const parts = pathname.split('/promo/');
        if (parts[1]) {
          return parts[1].split('/')[0].split('?')[0];
        }
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('promo') || params.get('campaign');
    }
    return null;
  });

  // Détection URL publique Smart Checkout (/checkout/:productId ou /checkout ou /caisse ou ?checkout=...)
  const [publicCheckoutId, setPublicCheckoutId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/checkout/')) {
        const parts = pathname.split('/checkout/');
        if (parts[1]) {
          return parts[1].split('/')[0].split('?')[0];
        }
      }
      if (pathname === '/checkout' || pathname === '/caisse' || pathname === '/pay') {
        return 'nanasore_elite_20_pays';
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('checkout') || (params.has('checkout') ? 'nanasore_elite_20_pays' : null);
    }
    return null;
  });

  // 1. Détection Nana Funnel Studio 3.0 (/t/:slug, /tunnel/:slug, /vente/:slug ou ?t=... / ?tunnel=...) - Lettre 't'
  const [publicModularTunnelSlug, setPublicModularTunnelSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/t/')) {
        const parts = pathname.split('/t/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      if (pathname.startsWith('/tunnel/')) {
        const parts = pathname.split('/tunnel/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      if (pathname.startsWith('/vente/')) {
        const parts = pathname.split('/vente/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('t') || params.get('tunnel') || params.get('vente');
    }
    return null;
  });

  // 2. Détection Ultimate Funnel Studio (/f/:slug, /funnel/:slug ou ?f=... / ?funnel=...) - Lettre 'f'
  const [publicUltimateFunnelSlug, setPublicUltimateFunnelSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/f/')) {
        const parts = pathname.split('/f/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      if (pathname.startsWith('/funnel/')) {
        const parts = pathname.split('/funnel/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('f') || params.get('funnel');
    }
    return null;
  });

  // 3. Détection Caisse Express / Commande 1-Clic (/c/:slug, /deal/:slug, /commande/:slug ou ?c=... / ?deal=...) - Lettre 'c'
  const [publicCheckoutSlug, setPublicCheckoutSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/c/')) {
        const parts = pathname.split('/c/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      if (pathname.startsWith('/deal/')) {
        const parts = pathname.split('/deal/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      if (pathname.startsWith('/commande/')) {
        const parts = pathname.split('/commande/');
        if (parts[1]) return parts[1].split('/')[0].split('?')[0];
      }
      const params = new URLSearchParams(window.location.search);
      return params.get('c') || params.get('deal') || params.get('commande');
    }
    return null;
  });

  // Détection URL publique Deal & Sales Funnel de secours / sous-domaines marchands
  const [publicDealSlug, setPublicDealSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const detectedSub = extractSubdomain(window.location.hostname);
      if (detectedSub) return detectedSub;
      const params = new URLSearchParams(window.location.search);
      return params.get('deal') || null;
    }
    return null;
  });

  // Détection URL CRM Dashboard & Intégrations Silicon Valley (/crm-dashboard, /crm ou ?crm=...)
  const [isCrmDashboardView, setIsCrmDashboardView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      return (
        pathname === '/crm-dashboard' ||
        pathname === '/crm' ||
        pathname.startsWith('/crm-dashboard/') ||
        pathname.startsWith('/crm/') ||
        params.get('page') === 'crm' ||
        params.get('view') === 'crm' ||
        params.get('page') === 'crm-dashboard' ||
        params.get('view') === 'crm-dashboard' ||
        params.has('crm') ||
        params.has('crm-dashboard')
      );
    }
    return false;
  });

  // Auto-suppression stricte de 24h des SMS dans Firebase (sms_recus.json) dès l'ouverture de l'application
  useEffect(() => {
    autoCleanSmsDatabase().catch(console.warn);
    const interval = setInterval(() => {
      autoCleanSmsDatabase().catch(console.warn);
    }, 15 * 60 * 1000);
    const handleFocus = () => {
      autoCleanSmsDatabase().catch(console.warn);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Initialisation de la synchronisation Super Admin (RTDB <-> LocalStorage <-> State)
  const [, setSuperAdminRevision] = useState(0);
  useEffect(() => {
    initSuperAdminSync();
    const handleSuperAdminUpdate = () => {
      setSuperAdminRevision((prev) => prev + 1);
    };
    window.addEventListener('superAdminUpdated', handleSuperAdminUpdate);
    return () => {
      window.removeEventListener('superAdminUpdated', handleSuperAdminUpdate);
    };
  }, []);

  // Synchronisation dynamique du Favicon & Apple-Touch-Icon selon l'écosystème actif :
  // 🛡️ /nana-switch -> /nanaswitch-favicon-mark.svg?v=coeur_routage_v2 (Le Cœur de Routage pur, sans texte)
  // 🌐 /wameet      -> /wameet-icon.svg?v=wameet_v2 (Le Connecteur Wameet)
  // 🌉 Nanasore     -> /nanasore-icon.svg?v=nanasore_arrow_v3 (La Voie Facile Vectoriel)
  useEffect(() => {
    const syncFaviconByEcosystem = () => {
      if (typeof document === 'undefined' || typeof window === 'undefined') return;
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      let targetHref = '/nanasore-icon.svg?v=nanasore_arrow_v3';

      if (
        pathname === '/docs' ||
        pathname.startsWith('/docs') ||
        pathname === '/documentation' ||
        pathname.startsWith('/documentation') ||
        pathname === '/nana-switch/docs' ||
        pathname === '/nanaswitch/docs' ||
        pathname === '/nanaswitch-docs' ||
        params.get('view') === 'docs' ||
        params.get('view') === 'documentation' ||
        pathname === '/nana-switch' ||
        pathname.startsWith('/nana-switch/') ||
        pathname === '/nanaswitch' ||
        pathname.startsWith('/nanaswitch/') ||
        currentView === 'NANA_SWITCH' ||
        currentView === 'nana_switch'
      ) {
        targetHref = '/nanaswitch-favicon-mark.svg?v=coeur_routage_v2';
      } else if (
        pathname === '/wameet' ||
        pathname.startsWith('/wameet/') ||
        currentView === 'WAMEET' ||
        currentView === 'wameet'
      ) {
        targetHref = '/wameet-icon.svg?v=wameet_v2';
      }

      const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
      rels.forEach((relName) => {
        const links = document.querySelectorAll<HTMLLinkElement>(`link[rel="${relName}"]`);
        if (links.length > 0) {
          links.forEach((link) => {
            if (link.getAttribute('href') !== targetHref) {
              link.setAttribute('href', targetHref);
            }
          });
        } else {
          const newLink = document.createElement('link');
          newLink.rel = relName;
          newLink.type = 'image/svg+xml';
          newLink.href = targetHref;
          document.head.appendChild(newLink);
        }
      });
    };

    syncFaviconByEcosystem();
    window.addEventListener('popstate', syncFaviconByEcosystem);
    return () => window.removeEventListener('popstate', syncFaviconByEcosystem);
  }, [currentView]);

  // Écoute des navigations sans rechargement (popstate)
  useEffect(() => {

    const handlePopState = () => {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      // Constructeur Dynamique Central Hub (/admin/hub-builder)
      if (
        pathname === '/admin/hub-builder' ||
        pathname === '/admin/hubbuilder' ||
        pathname === '/hub-builder' ||
        params.get('view') === 'hub_builder' ||
        params.get('view') === 'hub-builder' ||
        params.get('admin') === 'hub-builder'
      ) {
        setCurrentView('HUB_BUILDER');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Super Admin SaaS direct (/admin, /saas-admin, /superadmin)
      if (
        pathname === '/admin' ||
        pathname.startsWith('/admin/') ||
        pathname === '/saas-admin' ||
        pathname === '/superadmin' ||
        params.get('view') === 'admin' ||
        params.get('view') === 'saas_admin' ||
        params.get('view') === 'superadmin' ||
        params.get('admin') === 'saas'
      ) {
        setCurrentView('SAAS_ADMIN');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Nanasore Studio (/studio)
      if (
        pathname === '/studio' ||
        pathname.startsWith('/studio/') ||
        pathname === '/store-studio' ||
        params.get('view') === 'studio' ||
        params.get('page') === 'studio'
      ) {
        setCurrentView('STUDIO');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Hub Central Direction Générale (/hub)
      if (
        pathname === '/hub' ||
        pathname.startsWith('/hub') ||
        pathname === '/central-hub' ||
        pathname === '/master-hub' ||
        params.get('view') === 'hub' ||
        params.get('view') === 'master_hub'
      ) {
        setCurrentView('MASTER_HUB');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Back-Office Dashboard (/dashboard) -> NanaSwitch Cloud Cloned Merchant Dashboard
      if (
        pathname === '/dashboard' ||
        pathname === '/dashboard/' ||
        pathname === '/dashboard/nanaswitch' ||
        pathname === '/dashboard/switch' ||
        params.get('view') === 'switch' ||
        params.get('view') === 'nanaswitch' ||
        params.get('view') === 'dashboard' ||
        params.get('page') === 'dashboard'
      ) {
        setCurrentView('NANA_SWITCH_APP');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Logique Officielle des Modules & Slugs du Dashboard (/dashboard/{nom-du-module}/{nom-du-sous-module})
      if (pathname.startsWith('/dashboard/')) {
        const afterDash = pathname.replace(/^\/dashboard\/?/, '');
        const segments = afterDash.split('/').filter(Boolean);
        const modName = segments[0]?.toLowerCase();
        const subMod = segments[1]?.toLowerCase();

        if (modName === 'apps' && subMod) {
          if (subMod === 'nanagenerator' || subMod === 'nanagenerateur' || subMod === 'studio-ia') return 'AI_STUDIO';
          if (subMod === 'caisse-pos' || subMod === 'pos' || subMod === 'caisse') return 'POS';
          if (subMod === 'vitrine-eshop' || subMod === 'vitrine' || subMod === 'eshop' || subMod === 'boutique') return 'STUDIO';
          if (subMod === 'nana-market' || subMod === 'market') return 'MARKET_DIRECTORY';
          if (subMod === 'funnel-builder' || subMod === 'funnel') return 'MODULAR_FUNNEL';
          if (subMod === 'inventory-stock' || subMod === 'inventaire' || subMod === 'stock' || subMod === 'excel-importer') return 'INVENTORY';
          if (subMod === 'orders-quotes' || subMod === 'commandes') return 'CUSTOMER_ORDERS';
          if (subMod === 'reports-analytics' || subMod === 'rapports') return 'REPORTS';
          if (subMod === 'debt-book' || subMod === 'dettes') return 'DEBT_BOOK';
          if (subMod === 'partners-affiliate' || subMod === 'partenaire') return 'PARTNER';
          if (subMod === 'ai-gemini' || subMod === 'gemini') return 'AI_ADVISOR';
          if (subMod === 'cv-pro' || subMod === 'cv') return 'CV_CREATOR';
          if (subMod === 'lms-academy' || subMod === 'campus') return 'CAMPUS';
          if (subMod === 'lms-marketplace' || subMod === 'marketplace') return 'CATALOG';
          if (subMod === 'instructor-hub' || subMod === 'formateur') return 'INSTRUCTOR';
          if (subMod === 'certificate-hub' || subMod === 'certificats') return 'CERTIFICATE';
          if (subMod === 'wameet-network' || subMod === 'wameet') return 'WAMEET';
          if (subMod === 'salles-vip' || subMod === 'vip') return 'SALLES_VIP';
          if (subMod === 'nana-switch-app' || subMod === 'nanaswitch' || subMod === 'nanaswitch-app' || subMod === 'switch' || subMod === 'nana-switch') return 'NANA_SWITCH_APP';
          if (subMod === 'docusign-hub' || subMod === 'docusign') return 'DOCUSIGN';
          if (subMod === 'connectors-webhooks' || subMod === 'connecteurs') return 'SETTINGS_EXTENSIONS';
          if (subMod === 'saas-admin' || subMod === 'admin') return 'SAAS_ADMIN';
          return 'AI_STUDIO';
        }
        if (modName === 'nanagenerator' || modName === 'nanagenerateur') {
          return 'AI_STUDIO';
        }
        setShowWelcomeShowcase(false);

        if (modName === 'pos' || modName === 'caisse') {
          if (subMod === 'connect') setCurrentView('POS_CONNECT');
          else setCurrentView('POS');
          return;
        }
        if (modName === 'vitrine' || modName === 'boutique' || modName === 'studio') {
          const storeSlugParam = segments[1] ? decodeURIComponent(segments[1]) : null;
          setCurrentView('STUDIO');
          setPublicBoutiqueParams({
            isBoutique: Boolean(storeSlugParam),
            targetStoreId: storeSlugParam,
            targetProductId: null
          });
          return;
        }
        if (modName === 'funnel' || modName === 'funnels' || modName === 'tunnels' || modName === 'tunnel') {
          if (subMod === 'physical' || subMod === 'checkout') setCurrentView('PHYSICAL_FUNNEL');
          else if (subMod === 'ultimate') setCurrentView('ULTIMATE_FUNNEL');
          else setCurrentView('MODULAR_FUNNEL');
          return;
        }
        if (modName === 'inventaire' || modName === 'stock' || modName === 'excel') {
          setCurrentView('INVENTORY');
          if (subMod === 'excel') setIsGlobalExcelImporterOpen(true);
          return;
        }
        if (modName === 'commandes' || modName === 'devis' || modName === 'orders') {
          setCurrentView('CUSTOMER_ORDERS');
          return;
        }
        if (modName === 'rapports' || modName === 'finances' || modName === 'analytics') {
          setCurrentView('REPORTS');
          return;
        }
        if (modName === 'dettes' || modName === 'debt') {
          setCurrentView('DEBT_BOOK');
          return;
        }
        if (modName === 'partenaire' || modName === 'partenaires' || modName === 'affiliation' || modName === 'affiliate') {
          setCurrentView('PARTNER');
          return;
        }
        if (modName === 'ai-studio' || modName === 'studio-ia') {
          setCurrentView('AI_STUDIO');
          return;
        }
        if (modName === 'ai-advisor' || modName === 'gemini') {
          setCurrentView('AI_ADVISOR');
          return;
        }
        if (modName === 'cv' || modName === 'cvpro') {
          setCurrentView('CV_CREATOR');
          return;
        }
        if (modName === 'marketing') {
          setCurrentView('STUDIO');
          handleOpenMarketingAi();
          return;
        }
        if (modName === 'lives' || modName === 'webinaires') {
          setCurrentView('STUDIO');
          setIsGlobalWebinarModalOpen(true);
          return;
        }
        if (modName === 'campus' || modName === 'academie') {
          setIsStudentDashboardView(true);
          return;
        }
        if (modName === 'marketplace' || modName === 'catalogue') {
          setIsCatalogView(true);
          return;
        }
        if (modName === 'courses' && (subMod === 'create' || subMod === 'new')) {
          setIsInstructorView(true);
          setCurrentView('COURSE_CREATE');
          return;
        }
        if (modName === 'formateur' || modName === 'instructor') {
          setIsInstructorView(true);
          if (subMod === 'create' || subMod === 'nouveau') setCurrentView('COURSE_CREATE');
          else setCurrentView('teacher_dashboard');
          return;
        }
        if (modName === 'connecteurs' || modName === 'passerelles' || modName === 'extensions') {
          setCurrentView('SETTINGS_EXTENSIONS');
          return;
        }
        if (modName === 'docusign' || modName === 'signatures') {
          setCurrentView('DOCUSIGN');
          return;
        }
        if (modName === 'admin' || modName === 'saas-admin' || modName === 'superadmin') {
          setCurrentView('SAAS_ADMIN');
          setShowWelcomeShowcase(false);
          setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
          return;
        }
        if (modName === 'wameet') {
          setCurrentView('WAMEET');
          return;
        }
        if (modName === 'salles-vip' || modName === 'vip') {
          setCurrentView('SALLES_VIP');
          return;
        }
        if (modName === 'market' || modName === 'market-directory' || modName === 'annuaire') {
          setCurrentView('MARKET_DIRECTORY');
          return;
        }
        if (modName === 'crm' || modName === 'crm-dashboard') {
          setIsCrmDashboardView(true);
          setCurrentView('CRM_DASHBOARD');
          return;
        }
        if (modName === 'nana-switch-app' || modName === 'nanaswitch-app' || modName === 'nana-switch' || modName === 'nanaswitch' || modName === 'switch') {
          setCurrentView('NANA_SWITCH_APP');
          return;
        }
      }

      // Supra-App Wameet (/wameet) & Redirection Communauté propre
      if (
        pathname === '/wameet' ||
        pathname.startsWith('/wameet/') ||
        pathname === '/communaute' ||
        pathname === '/community' ||
        pathname === '/reseau' ||
        params.get('view') === 'wameet' ||
        params.get('page') === 'wameet' ||
        params.get('view') === 'community'
      ) {
        if (pathname === '/communaute' || pathname === '/community' || pathname === '/reseau') {
          window.history.replaceState({}, '', '/wameet');
        }
        setCurrentView('WAMEET');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Salles VIP E-learning (/salles-vip, /vip, /salles-vip/:id, /vip/salle/:id)
      if (
        pathname === '/salles-vip' ||
        pathname.startsWith('/salles-vip/') ||
        pathname === '/vip' ||
        pathname.startsWith('/vip/') ||
        pathname === '/salles' ||
        pathname.startsWith('/salles/') ||
        params.get('view') === 'salles-vip' ||
        params.get('view') === 'vip' ||
        params.get('page') === 'salles-vip' ||
        params.get('page') === 'vip'
      ) {
        let rId: string | null = null;
        if (pathname.startsWith('/salles-vip/')) {
          const parts = pathname.split('/salles-vip/');
          if (parts[1]) rId = decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
        } else if (pathname.startsWith('/vip/salle/')) {
          const parts = pathname.split('/vip/salle/');
          if (parts[1]) rId = decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
        } else if (pathname.startsWith('/vip/room/')) {
          const parts = pathname.split('/vip/room/');
          if (parts[1]) rId = decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
        } else {
          rId = params.get('roomId') || params.get('room') || null;
        }
        setSelectedVipRoomId(rId);
        setCurrentView('SALLES_VIP');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Smart Checkout
      if (pathname.startsWith('/checkout/')) {
        const p = pathname.split('/checkout/')[1];
        setPublicCheckoutId(p ? p.split('/')[0].split('?')[0] : 'nanasore_elite_20_pays');
      } else if (pathname === '/checkout' || pathname === '/caisse' || pathname === '/pay') {
        setPublicCheckoutId('nanasore_elite_20_pays');
      } else {
        setPublicCheckoutId(params.get('checkout') || (params.has('checkout') ? 'nanasore_elite_20_pays' : null));
      }

      // 1. Nana Funnel Studio 3.0 (/t/:slug, /tunnel/:slug, /vente/:slug) - Lettre 't'
      if (pathname.startsWith('/t/')) {
        const p = pathname.split('/t/')[1];
        setPublicModularTunnelSlug(p ? p.split('/')[0].split('?')[0] : null);
      } else if (pathname.startsWith('/tunnel/')) {
        const p = pathname.split('/tunnel/')[1];
        setPublicModularTunnelSlug(p ? p.split('/')[0].split('?')[0] : null);
      } else if (pathname.startsWith('/vente/')) {
        const p = pathname.split('/vente/')[1];
        setPublicModularTunnelSlug(p ? p.split('/')[0].split('?')[0] : null);
      } else {
        setPublicModularTunnelSlug(params.get('t') || params.get('tunnel') || params.get('vente') || null);
      }

      // 2. Ultimate Funnel Studio (/f/:slug, /funnel/:slug) - Lettre 'f'
      if (pathname.startsWith('/f/')) {
        const p = pathname.split('/f/')[1];
        setPublicUltimateFunnelSlug(p ? p.split('/')[0].split('?')[0] : null);
      } else if (pathname.startsWith('/funnel/')) {
        const p = pathname.split('/funnel/')[1];
        setPublicUltimateFunnelSlug(p ? p.split('/')[0].split('?')[0] : null);
      } else {
        setPublicUltimateFunnelSlug(params.get('f') || params.get('funnel') || null);
      }

      // 3. Caisse Express / Commande 1-Clic (/c/:slug, /deal/:slug, /commande/:slug) - Lettre 'c'
      if (pathname.startsWith('/c/')) {
        const p = pathname.split('/c/')[1];
        setPublicCheckoutSlug(p ? p.split('/')[0].split('?')[0] : null);
      } else if (pathname.startsWith('/deal/')) {
        const p = pathname.split('/deal/')[1];
        setPublicCheckoutSlug(p ? p.split('/')[0].split('?')[0] : null);
      } else if (pathname.startsWith('/commande/')) {
        const p = pathname.split('/commande/')[1];
        setPublicCheckoutSlug(p ? p.split('/')[0].split('?')[0] : null);
      } else {
        setPublicCheckoutSlug(params.get('c') || params.get('deal') || params.get('commande') || null);
      }

      // Sous-domaines dynamiques ou de secours
      const currentSub = extractSubdomain(window.location.hostname);
      setPublicDealSlug(currentSub || null);

      // Promo Funnel
      if (pathname.startsWith('/promo/')) {
        const p = pathname.split('/promo/')[1];
        setPublicPromoId(p ? p.split('/')[0].split('?')[0] : null);
      } else {
        setPublicPromoId(params.get('promo') || params.get('campaign'));
      }

      // Marketplace Catalog
      if (
        pathname === '/catalog' || 
        pathname === '/courses' || 
        pathname === '/marketplace' ||
        pathname === '/dashboard/marketplace' ||
        pathname.startsWith('/dashboard/marketplace') ||
        pathname === '/dashboard/catalogue' ||
        pathname.startsWith('/dashboard/catalogue') ||
        params.has('catalog') ||
        params.has('courses') ||
        params.has('marketplace') ||
        params.get('page') === 'catalog' ||
        params.get('page') === 'courses'
      ) {
        setIsCatalogView(true);
      } else {
        setIsCatalogView(params.get('catalog') === 'true' || params.get('courses') === 'true');
      }

      // Certificat Officiel & Diplôme QR Code
      if (
        pathname === '/certificat' ||
        pathname === '/certificate' ||
        pathname === '/diplome' ||
        pathname.startsWith('/certificat/') ||
        pathname.startsWith('/certificate/') ||
        params.get('view') === 'certificat' ||
        params.get('view') === 'certificate' ||
        params.has('cert')
      ) {
        setIsCertificateView(true);
      } else {
        setIsCertificateView(false);
      }

      // Tableau de Bord Étudiant Élite (Campus Privé)
      if (
        pathname === '/campus-etudiant' ||
        pathname === '/student-dashboard' ||
        pathname === '/student/dashboard' ||
        pathname.startsWith('/student/dashboard') ||
        pathname === '/etudiant' ||
        pathname === '/student' ||
        pathname === '/campus' ||
        pathname === '/mon-campus' ||
        pathname === '/dashboard/campus' ||
        pathname.startsWith('/dashboard/campus') ||
        pathname === '/dashboard/academie' ||
        pathname.startsWith('/dashboard/academie') ||
        pathname === '/dashboard/student' ||
        pathname.startsWith('/dashboard/student') ||
        params.get('view') === 'student' ||
        params.get('view') === 'student-dashboard' ||
        params.get('dashboard') === 'student'
      ) {
        setIsStudentDashboardView(true);
      } else {
        setIsStudentDashboardView(false);
      }

      // Boutique / Shop / Vitrine / Fiche Produit propre (/{themePrefix}/:store, /s/:store/p/:product ou raccourci)
      const routeParams = extractPublicStoreRouteParams(pathname);
      storeIdFromPath = routeParams.storeIdFromPath;
      productIdFromPath = routeParams.productIdFromPath;

      const isBoutiquePath =
        pathname === '/s' ||
        pathname.startsWith('/s/') ||
        pathname === '/boutique' || 
        pathname.startsWith('/boutique/') ||
        pathname === '/shop' ||
        pathname.startsWith('/shop/') ||
        pathname === '/store' ||
        pathname.startsWith('/store/') ||
        pathname.startsWith('/vitrine/') ||
        pathname.startsWith('/p/') ||
        Boolean(storeIdFromPath);

      const storeIdFromQuery =
        params.get('store') ||
        params.get('storeId') ||
        params.get('merchant') ||
        params.get('merchantId') ||
        params.get('boutique') ||
        params.get('shop') ||
        params.get('vitrine');
      const productId = productIdFromPath || params.get('produit') || params.get('product') || params.get('id');

      const isBoutiqueQuery =
        params.get('page') === 'boutique' ||
        params.get('page') === 'store' ||
        params.get('page') === 'shop' ||
        params.has('store') ||
        params.has('shop') ||
        params.has('boutique');

      if (pathname === '/vitrine' || pathname === '/studio' || pathname.startsWith('/studio/')) {
        setCurrentView('STUDIO');
        setPublicBoutiqueParams({
          isBoutique: false,
          targetStoreId: null,
          targetProductId: null,
        });
      } else if (isBoutiquePath || isBoutiqueQuery || storeIdFromQuery || productId) {
        setCurrentView('STUDIO');
        setPublicBoutiqueParams({
          isBoutique: true,
          targetStoreId: storeIdFromPath || storeIdFromQuery || null,
          targetProductId: productId || null,
        });
      }

      // Détection des routes applicatives dédiées (/dashboard/apps/:appId)
      if (pathname.startsWith('/dashboard/apps/')) {
        const subMod = pathname.split('/dashboard/apps/')[1]?.split('/')[0]?.split('?')[0]?.toLowerCase();
        if (subMod) {
          setShowWelcomeShowcase(false);
          setCurrentStandaloneAppId(subMod);
          setCurrentView('STANDALONE_APP');
          return;
        }
      }

      // Nana-générateur & Funnel Builder
      if (
        pathname === '/dashboard/ai-studio' ||
        pathname === '/dashboard/apps/nanagenerator' ||
        pathname.startsWith('/dashboard/apps/nanagenerator') ||
        pathname === '/ai-studio' ||
        pathname === '/aistudio' ||
        pathname === '/generateur' ||
        pathname === '/generator' ||
        pathname === '/nana-generateur' ||
        pathname === '/builder' ||
        pathname.startsWith('/builder') ||
        pathname === '/funnel-builder' ||
        params.get('view') === 'ai-studio' ||
        params.get('page') === 'ai-studio' ||
        params.get('view') === 'generateur' ||
        params.get('view') === 'generator' ||
        params.get('view') === 'builder' ||
        params.get('view') === 'funnel-builder' ||
        params.has('builder')
      ) {
        setCurrentView('AI_STUDIO');
        setShowWelcomeShowcase(false);
      }

      // Live
      if (pathname.startsWith('/live/')) {
        const p = pathname.split('/live/')[1];
        setPublicWebinarId(p ? p.split('/')[0].split('?')[0] : null);
      } else {
        setPublicWebinarId(params.get('live') || params.get('webinar'));
      }

      // Course
      if (pathname.startsWith('/catalog/course/')) {
        const p = pathname.split('/catalog/course/')[1];
        setPublicCourseId(p ? p.split('/')[0].split('?')[0] : null);
      } else if (pathname.startsWith('/course/')) {
        const p = pathname.split('/course/')[1];
        setPublicCourseId(p ? p.split('/')[0].split('?')[0] : null);
      } else {
        setPublicCourseId(params.get('course'));
      }

      // Classroom & Espace Étudiant
      if (pathname.startsWith('/classroom/')) {
        const p = pathname.split('/classroom/')[1];
        setPublicClassroomId(p ? p.split('/')[0].split('?')[0] : 'telecom-fintech-masterclass');
      } else if (pathname.startsWith('/campus/')) {
        const p = pathname.split('/campus/')[1];
        setPublicClassroomId(p ? p.split('/')[0].split('?')[0] : 'telecom-fintech-masterclass');
      } else if (pathname.startsWith('/etudiant/')) {
        const p = pathname.split('/etudiant/')[1];
        setPublicClassroomId(p ? p.split('/')[0].split('?')[0] : 'telecom-fintech-masterclass');
      } else if (pathname.startsWith('/student/')) {
        const p = pathname.split('/student/')[1];
        setPublicClassroomId(p ? p.split('/')[0].split('?')[0] : 'telecom-fintech-masterclass');
      } else if (
        pathname === '/classroom' ||
        pathname === '/campus' ||
        pathname === '/etudiant' ||
        pathname === '/student'
      ) {
        setPublicClassroomId('telecom-fintech-masterclass');
      } else {
        setPublicClassroomId(params.get('classroom') || params.get('campus') || params.get('student') || params.get('etudiant'));
      }

      // Arena Vocale IA
      if (pathname.startsWith('/arena/')) {
        const p = pathname.split('/arena/')[1];
        setPublicArenaId(p ? p.split('/')[0].split('?')[0] : 'default-scenario');
      } else if (pathname === '/arena') {
        setPublicArenaId('default-scenario');
      } else if (pathname.startsWith('/simulation/')) {
        const p = pathname.split('/simulation/')[1];
        setPublicArenaId(p ? p.split('/')[0].split('?')[0] : 'default-scenario');
      } else if (pathname === '/simulation') {
        setPublicArenaId('default-scenario');
      } else {
        setPublicArenaId(params.get('arena') || params.get('simulation'));
      }

      // Auth Register / Login
      if (
        pathname === '/register' ||
        pathname.startsWith('/register/') ||
        pathname === '/login' ||
        pathname === '/signup' ||
        params.get('auth') === 'register' ||
        params.get('step') === 'register' ||
        params.get('plan') === 'free'
      ) {
        setShowWelcomeShowcase(false);
        setIsEmailAuthScreenOpen(true);
      }

      // Auth Teacher / Instructor
      if (pathname === '/auth/teacher' || params.get('view') === 'auth_teacher' || params.get('auth') === 'teacher') {
        setCurrentView('auth_teacher');
        setShowWelcomeShowcase(false);
        setIsInstructorView(false);
      } else if (
        pathname === '/dashboard/courses/create' ||
        pathname === '/dashboard/courses/new' ||
        pathname === '/courses/create' ||
        pathname === '/courses/new' ||
        pathname === '/instructor/courses/new' ||
        pathname === '/instructor/courses/create' ||
        params.get('view') === 'course_create' ||
        params.get('view') === 'course-create' ||
        params.get('create_course') === 'true'
      ) {
        setIsInstructorView(true);
        setCurrentView('COURSE_CREATE');
        setShowWelcomeShowcase(false);
      } else if (
        pathname === '/instructor' || pathname.startsWith('/instructor/') ||
        pathname === '/dashboard/academy' || pathname.startsWith('/dashboard/academy') ||
        pathname === '/academy' || pathname.startsWith('/academy/')
      ) {
        setIsInstructorView(true);
        setCurrentView('teacher_dashboard');
        setShowWelcomeShowcase(false);
      } else {
        setIsInstructorView(params.get('instructor') === 'true' || params.get('view') === 'academy');
      }

      // CRM Dashboard & Intégrations Silicon Valley
      setIsCrmDashboardView(
        pathname === '/crm-dashboard' ||
        pathname === '/crm' ||
        pathname.startsWith('/crm-dashboard/') ||
        pathname.startsWith('/crm/') ||
        params.get('page') === 'crm' ||
        params.get('view') === 'crm' ||
        params.get('page') === 'crm-dashboard' ||
        params.get('view') === 'crm-dashboard' ||
        params.has('crm') ||
        params.has('crm-dashboard')
      );

      // Espace Partenaire & Programme Partenaire
      if (
        pathname === '/partenaire' ||
        pathname === '/partenaires' ||
        pathname === '/affiliate' ||
        pathname === '/affiliation' ||
        pathname === '/dashboard/partenaire' ||
        params.get('page') === 'partenaire' ||
        params.get('page') === 'partenaires' ||
        params.get('view') === 'partenaire' ||
        params.get('view') === 'partenaires' ||
        params.get('view') === 'affiliate' ||
        params.get('partner') === 'true'
      ) {
        setCurrentView('PARTNER');
        setShowWelcomeShowcase(false);
      }

      // Annuaire B2B2C NaNa Market
      if (
        pathname === '/market' ||
        pathname === '/market-directory' ||
        pathname === '/directory' ||
        pathname === '/annuaire' ||
        pathname.startsWith('/market') ||
        pathname.startsWith('/directory') ||
        pathname.startsWith('/annuaire') ||
        params.get('view') === 'market' ||
        params.get('view') === 'market_directory' ||
        params.get('view') === 'directory' ||
        params.get('view') === 'annuaire' ||
        params.get('page') === 'market' ||
        params.get('page') === 'annuaire'
      ) {
        setCurrentView('MARKET_DIRECTORY');
        setShowWelcomeShowcase(false);
      }


      // NaNaSwitch Partenaires B2B App (/app/nanaswitch, /dashboard/nanaswitch, /nana-switch-app)
      if (
        pathname === '/app/nanaswitch' ||
        pathname === '/apps/nanaswitch' ||
        pathname === '/nana-switch-app' ||
        pathname === '/nanaswitch-app' ||
        pathname === '/dashboard/nanaswitch' ||
        pathname === '/dashboard/apps/nana-switch-app' ||
        params.get('app') === 'nanaswitch' ||
        params.get('slug') === 'nanaswitch' ||
        params.get('view') === 'nanaswitch_app' ||
        params.get('view') === 'nana-switch-app'
      ) {
        setCurrentView('NANA_SWITCH_APP');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      if (
        pathname === '/wallet' ||
        pathname === '/nanawallet' ||
        pathname === '/nana-wallet' ||
        pathname === '/app/wallet' ||
        pathname === '/apps/wallet' ||
        pathname.startsWith('/wallet') ||
        pathname.startsWith('/nanawallet') ||
        pathname.startsWith('/nana-wallet') ||
        params.get('view') === 'wallet' ||
        params.get('view') === 'nanawallet'
      ) {
        setCurrentView('WALLET');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Documentation Développeur Publique Autonome (100% Hors Application Protégée)
      if (
        pathname === '/docs' ||
        pathname.startsWith('/docs') ||
        pathname === '/documentation' ||
        pathname.startsWith('/documentation') ||
        pathname === '/nana-switch/docs' ||
        pathname === '/nanaswitch/docs' ||
        pathname === '/nanaswitch-docs' ||
        params.get('view') === 'docs' ||
        params.get('view') === 'documentation' ||
        params.get('page') === 'docs' ||
        params.get('page') === 'documentation'
      ) {
        setCurrentView('NANA_SWITCH_DOCS');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Sous-routes console (/nana-switch/auth, ...) et /nana-switch-apppage → AppPage
      if (
        pathname.startsWith('/nana-switch/') ||
        pathname.startsWith('/nanaswitch/') ||
        pathname === '/nana-switch-apppage' ||
        pathname === '/nanaswitch-apppage'
      ) {
        setCurrentView('NANA_SWITCH_APP');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }
      // Landing NaNaSwitch Cloud (/nana-switch) — route stricte, pas de startsWith
      if (
        pathname === '/nana-switch' ||
        pathname === '/nanaswitch' ||
        pathname === '/nana-switch/' ||
        params.get('view') === 'nana-switch' ||
        params.get('view') === 'nanaswitch' ||
        params.get('page') === 'nana-switch' ||
        params.get('page') === 'nanaswitch'
      ) {
        setCurrentView('NANA_SWITCH');
        setShowWelcomeShowcase(false);
        setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
        return;
      }

      // Espace Caissier & Terminal POS (/pos/connect, /pos/terminal, /pos)
      if (
        pathname === '/pos/connect' ||
        pathname.startsWith('/pos/connect') ||
        params.get('view') === 'pos_connect' ||
        params.get('view') === 'pos-connect'
      ) {
        setCurrentView('POS_CONNECT');
        setShowWelcomeShowcase(false);
      } else if (
        pathname === '/pos/terminal' ||
        pathname === '/pos' ||
        pathname.startsWith('/pos/terminal') ||
        params.get('view') === 'pos'
      ) {
        setCurrentView('POS');
        setShowWelcomeShowcase(false);
      }
    };


    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // État (Google Sign-In)
  const [currentUser, setCurrentUser] = useState<StoreUser | null>(() => {
    const saved = safeGetItem('nana_store_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    return null;
  });

  // Synchronisation de session Supabase Auth en temps réel
  useEffect(() => {
    const unsub = onSupabaseAuthStateChange((supaUser) => {
      if (supaUser) {
        setCurrentUser((prev) => {
          if (prev && prev.id === supaUser.id) return prev;
          const storeId = prev?.storeId || `store-${supaUser.id.slice(0, 8)}`;
          return {
            id: supaUser.id,
            storeId,
            name: supaUser.displayName || supaUser.name || 'Utilisateur Nanasore',
            email: supaUser.email,
            role: (supaUser.role as any) || 'GERANT',
            vendorType: 'ecommerce',
            sellerMode: (supaUser.sellerMode as any) || 'merchant_ecommerce',
            phone: prev?.phone || '+226 00 00 00 00',
            city: prev?.city || 'Ouagadougou',
            country: 'Burkina Faso',
            currency: 'F CFA',
            defaultCreditLimit: 20000,
            loginProvider: 'google',
            kycStatus: 'none',
            plan: prev?.plan || 'free',
            ...prev
          };
        });
      }
    });
    return unsub;
  }, []);

  // Résout systématiquement l'identifiant strict de la boutique du compte connecté
  const getCurrentStoreId = (): string => {
    if (isCustomDomain && customTenant?.storeId) {
      return customTenant.storeId;
    }
    if (currentUser?.storeId && currentUser.storeId !== 'store-nana-1') {
      return currentUser.storeId;
    }
    if (auth.currentUser?.uid) {
      return auth.currentUser.uid;
    }
    if (currentUser?.id === 'usr-demo') {
      let demoStoreId = safeGetItem('nana_demo_store_id');
      if (!demoStoreId) {
        demoStoreId = `demo-store-${Date.now().toString(36)}`;
        safeSetItem('nana_demo_store_id', demoStoreId);
      }
      return demoStoreId;
    }
    if (currentUser?.id) {
      return `store-${currentUser.id}`;
    }
    return 'store-default';
  };

  const storeSlug = getSafeStoreSlug(publicBoutiqueParams.targetStoreId || currentUser, customTenant as any) || currentUser?.storeId || currentUser?.uid || 'ma-boutique';
  useEffect(() => {
    if (typeof window !== 'undefined' && storeSlug) {
      (window as any).storeSlug = storeSlug;
    }
  }, [storeSlug]);

  // Synchronisation du tenant personnalisé ou domaine public vitrine (nsore.shop)
  useEffect(() => {
    if (
      (isCustomDomain && customTenant) || 
      (typeof window !== 'undefined' && window.location.hostname.includes('nsore.shop')) || 
      publicBoutiqueParams.isBoutique
    ) {
      // Bloque formellement la landing page SaaS Nanasore
      setShowWelcomeShowcase(false);
    }
  }, [isCustomDomain, customTenant, publicBoutiqueParams.isBoutique]);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthScreenExplicitlyBypassed, setIsAuthScreenExplicitlyBypassed] = useState(false);
  const [isSecretAdminModalOpen, setIsSecretAdminModalOpen] = useState(false);

  // État de la Landing Page Showcase de bienvenue
  const [showWelcomeShowcase, setShowWelcomeShowcase] = useState<boolean>(() => {
    // Si nous sommes sur un domaine client personnalisé ou nsore.shop, la landing page SaaS est STRICTEMENT désactivée
    if (typeof window !== 'undefined') {
      if (!isNativeDomain(window.location.hostname)) {
        return false;
      }
      if (window.location.hostname.includes('nsore.shop')) {
        return false;
      }
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (
        pathname === '/test-supabase' ||
        pathname.startsWith('/test-supabase') ||
        pathname === '/products' ||
        pathname.startsWith('/products') ||
        pathname === '/pos' ||
        pathname.startsWith('/pos') ||
        pathname === '/dashboard' ||
        pathname.startsWith('/dashboard') ||
        pathname === '/admin' ||
        pathname.startsWith('/admin') ||
        pathname === '/s' ||
        pathname.startsWith('/s/') ||
        pathname === '/boutique' || 
        pathname.startsWith('/boutique/') || 
        pathname === '/shop' ||
        pathname.startsWith('/shop/') ||
        pathname === '/store' ||
        pathname.startsWith('/store/') || 
        pathname.startsWith('/live/') || 
        pathname === '/catalog' ||
        pathname === '/courses' ||
        pathname === '/marketplace' ||
        pathname.startsWith('/catalog/course/') ||
        pathname.startsWith('/course/') ||
        params.get('page') === 'boutique' || 
        params.get('page') === 'store' || 
        params.get('page') === 'shop' || 
        params.get('produit') || 
        params.get('product') ||
        params.get('live') ||
        params.get('webinar') ||
        params.get('catalog') ||
        params.get('courses') ||
        params.get('course') ||
        pathname.startsWith('/checkout/') ||
        pathname.startsWith('/deal/') ||
        pathname.startsWith('/promo/') ||
        pathname.startsWith('/f/') ||
        pathname.startsWith('/c/') ||
        pathname.startsWith('/t/') ||
        pathname.startsWith('/funnel/') ||
        pathname.startsWith('/tunnel/') ||
        pathname.startsWith('/commande/') ||
        pathname.startsWith('/vente/') ||
        params.has('checkout') ||
        params.has('deal') ||
        params.has('promo') ||
        params.has('f') ||
        params.has('c') ||
        params.has('t') ||
        params.has('funnel') ||
        params.has('tunnel') ||
        params.has('store') ||
        params.has('shop') ||
        params.has('boutique') ||
        pathname === '/register' ||
        pathname.startsWith('/register/') ||
        pathname === '/login' ||
        pathname === '/signup' ||
        params.get('auth') === 'register' ||
        params.get('step') === 'register' ||
        params.get('plan') === 'free' ||
        pathname === '/partenaire' ||
        pathname.startsWith('/partenaire/') ||
        pathname === '/partenaires' ||
        pathname.startsWith('/partenaires/') ||
        params.get('view') === 'partenaire' ||
        params.get('view') === 'partenaires' ||
        params.get('page') === 'partenaire' ||
        params.get('page') === 'partenaires' ||
        params.has('partner') ||
        pathname === '/dashboard/ai-studio' ||
        pathname === '/ai-studio' ||
        pathname === '/aistudio' ||
        pathname === '/generateur' ||
        pathname === '/generator' ||
        pathname === '/nana-generateur' ||
        pathname === '/builder' ||
        pathname.startsWith('/builder') ||
        pathname === '/funnel-builder' ||
        params.get('view') === 'ai-studio' ||
        params.get('page') === 'ai-studio' ||
        params.get('view') === 'generateur' ||
        params.get('view') === 'generator' ||
        params.get('view') === 'builder' ||
        params.get('view') === 'funnel-builder' ||
        params.has('builder') ||
        pathname === '/docs' ||
        pathname.startsWith('/docs') ||
        pathname === '/documentation' ||
        pathname.startsWith('/documentation') ||
        pathname === '/nana-switch/docs' ||
        pathname === '/nanaswitch/docs' ||
        pathname === '/nanaswitch-docs' ||
        params.get('view') === 'docs' ||
        params.get('view') === 'documentation' ||
        pathname === '/nana-switch' ||
        pathname === '/nanaswitch' ||
        pathname.startsWith('/nana-switch') ||
        pathname.startsWith('/nanaswitch') ||
        params.get('view') === 'nana-switch' ||
        params.get('view') === 'nanaswitch' ||
        params.get('page') === 'nana-switch' ||
        params.get('page') === 'nanaswitch'
      ) {
        return false;
      }
    }
    const saved = safeGetItem('nana_store_auth_user');
    return !saved;
  });
  const [isPinModalOpenFromLanding, setIsPinModalOpenFromLanding] = useState<boolean>(false);
  const [isEmailAuthScreenOpen, setIsEmailAuthScreenOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (
        pathname === '/register' ||
        pathname.startsWith('/register/') ||
        pathname === '/login' ||
        pathname === '/signup' ||
        params.get('auth') === 'register' ||
        params.get('step') === 'register' ||
        params.get('plan') !== null ||
        params.get('checkout') === 'true'
      ) {
        return true;
      }
    }
    return false;
  });

  // État de verrouillage par code PIN (au redémarrage, inactivité 15 min ou cadenas manuel)
  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (
        pathname === '/boutique' || 
        pathname.startsWith('/boutique/') || 
        pathname.startsWith('/store/') || 
        pathname.startsWith('/live/') || 
        pathname === '/catalog' ||
        pathname === '/courses' ||
        pathname === '/marketplace' ||
        pathname.startsWith('/catalog/course/') ||
        pathname.startsWith('/course/') ||
        params.get('page') === 'boutique' || 
        params.get('produit') || 
        params.get('product') ||
        params.get('live') ||
        params.get('webinar') ||
        params.get('catalog') ||
        params.get('courses') ||
        params.get('course')
      ) {
        return false;
      }
    }
    // Si l'utilisateur est déjà connecté au démarrage, on verrouille pour demander le PIN
    const saved = safeGetItem('nana_store_auth_user');
    return !!saved;
  });
  const [pinLockReason, setPinLockReason] = useState<'LOCK' | 'TIMEOUT' | 'RESTART'>('RESTART');
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isDocuSignOpen, setIsDocuSignOpen] = useState(false);
  const [docuSignDocTitle, setDocuSignDocTitle] = useState('Document Commercial');
  const [isGlobalExcelImporterOpen, setIsGlobalExcelImporterOpen] = useState(false);
  const [isGlobalWebinarModalOpen, setIsGlobalWebinarModalOpen] = useState(false);

  // État de l'Assistant Marketing & Vente IA (Gemini 3.8 Flash / Studio IA)
  const [isMarketingAiModalOpen, setIsMarketingAiModalOpen] = useState(false);
  const [marketingAiProductData, setMarketingAiProductData] = useState<{
    name?: string;
    features?: string;
    price?: number;
    initialMode?: 'text' | 'image' | 'video';
  } | null>(null);

  // État de l'Assistant IA Juridique & Financier OHADA (Global)
  const [isGlobalLegalAiOpen, setIsGlobalLegalAiOpen] = useState(false);

  // État d'ouverture de la boutique (synchronisé avec CentralMasterHubView / paramètres généraux)
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('nana_konkobo_general_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed && typeof parsed.isStoreOpen === 'boolean') {
            return parsed.isStoreOpen;
          }
        }
      } catch (e) {
        console.error('Error reading store open state', e);
      }
    }
    return true;
  });

  useEffect(() => {
    const handleStoreStatusChange = (e: any) => {
      if (e?.detail && typeof e.detail.isStoreOpen === 'boolean') {
        setIsStoreOpen(e.detail.isStoreOpen);
      }
    };
    window.addEventListener('nana_store_status_changed', handleStoreStatusChange);
    return () => {
      window.removeEventListener('nana_store_status_changed', handleStoreStatusChange);
    };
  }, []);

  const reopenStore = () => {
    try {
      const savedSettings = localStorage.getItem('nana_konkobo_general_settings');
      let parsed: any = {};
      if (savedSettings) {
        try { parsed = JSON.parse(savedSettings); } catch {}
      }
      parsed.isStoreOpen = true;
      localStorage.setItem('nana_konkobo_general_settings', JSON.stringify(parsed));
      setIsStoreOpen(true);
      window.dispatchEvent(new CustomEvent('nana_store_status_changed', { detail: { isStoreOpen: true } }));
    } catch (e) {
      setIsStoreOpen(true);
    }
  };

  // Minuteur d'inactivité de 15 minutes (900 000 ms)
  useEffect(() => {
    if (!currentUser || isPinLocked) return;

    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes (900 000 ms)

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log('[SECURITY] 15 minutes d\'inactivité détectées -> Verrouillage par code PIN');
        setPinLockReason('TIMEOUT');
        setIsPinLocked(true);
      }, INACTIVITY_LIMIT_MS);
    };

    // Suivi des événements tactiles et clavier (pointerdown, keydown, touchstart, scroll)
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, resetInactivityTimer, { passive: true });
    });

    // Démarre le timer initial
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, resetInactivityTimer);
      });
    };
  }, [currentUser, isPinLocked]);

  // Persist user in localStorage
  useEffect(() => {
    if (currentUser) {
      safeSetItem('nana_store_auth_user', JSON.stringify(currentUser));
    } else {
      safeRemoveItem('nana_store_auth_user');
    }
  }, [currentUser]);

  // Nettoyage de tout résidu de plan en attente : interdiction stricte d'ouverture automatique à l'accueil/connexion
  useEffect(() => {
    try {
      localStorage.removeItem('nana_pending_checkout_plan');
    } catch (e) {}

    try {
      const pendingPartner = localStorage.getItem('nana_pending_partner_intent');
      if (pendingPartner && (currentUser || auth.currentUser)) {
        localStorage.removeItem('nana_pending_partner_intent');
        setIsAffiliateModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  // Élagage et nettoyage automatique du cache de stockage au démarrage
  useEffect(() => {
    pruneStaleStorageCaches();
    runAutomatedStorageGC();
  }, []);

  // Détection et vérification proactive des privilèges Super Admin Firebase (/admins/{uid})
  useEffect(() => {
    let isCancelled = false;

    const runAdminCheck = async () => {
      try {
        const isAdmin = await verifySuperAdminPrivileges(auth.currentUser);
        if (isAdmin && !isCancelled) {
          setCurrentUser((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              role: 'SUPER_ADMIN',
              isSuperAdmin: true,
              kycStatus: 'verified',
              storeApprovalStatus: 'APPROVED',
              plan: 'elite',
              subscriptionStatus: 'active'
            };
          });
          setStoreApprovalStatus('APPROVED');
        }
      } catch (e) {
        console.warn('[SUPER ADMIN] Vérification privilèges non-bloquante:', e);
      }
    };

    runAdminCheck();

    const handleAdminVerified = (e: any) => {
      if (e?.detail?.isSuperAdmin && !isCancelled) {
        setCurrentUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            role: 'SUPER_ADMIN',
            isSuperAdmin: true,
            kycStatus: 'verified',
            storeApprovalStatus: 'APPROVED',
            plan: 'elite',
            subscriptionStatus: 'active'
          };
        });
        setStoreApprovalStatus('APPROVED');
      }
    };

    window.addEventListener('superAdminStatusVerified', handleAdminVerified);
    return () => {
      isCancelled = true;
      window.removeEventListener('superAdminStatusVerified', handleAdminVerified);
    };
  }, [currentUser?.id, auth.currentUser?.uid]);

  // Accès discret Super Admin (raccourci clavier, URL, code secret *#007#)
  useEffect(() => {
    const isSuperAdmin = isSuperAdminLocally(currentUser);

    let keyBuffer = '';
    let bufferTimer: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Combinaison Ctrl/Cmd + Shift + A/S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        if (isSuperAdmin) {
          playValidationBeep();
          setCurrentView('SAAS_ADMIN');
        } else {
          playTapBeep();
          setIsSecretAdminModalOpen(true);
        }
        return;
      }

      // Saisie du code secret *#007#
      if (e.key.length === 1) {
        keyBuffer += e.key;
        if (keyBuffer.length > 20) {
          keyBuffer = keyBuffer.slice(-20);
        }

        if (bufferTimer) clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => {
          keyBuffer = '';
        }, 2500);

        if (keyBuffer.includes('*#007#') || keyBuffer.endsWith('*#007#')) {
          keyBuffer = '';
          if (isSuperAdmin) {
            playValidationBeep();
            setCurrentView('SAAS_ADMIN');
          } else {
            playTapBeep();
            setIsSecretAdminModalOpen(true);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Fonction globale de secours
    (window as any).openSaasAdmin = () => {
      if (isSuperAdmin) {
        playValidationBeep();
        setCurrentView('SAAS_ADMIN');
      } else {
        setIsSecretAdminModalOpen(true);
      }
    };

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if ((params.get('view') === 'saas_admin' || params.get('admin') === 'saas') && isSuperAdmin) {
        setCurrentView('SAAS_ADMIN');
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (bufferTimer) clearTimeout(bufferTimer);
    };
  }, [currentUser]);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Inventory Products (with stock & purchase cost prices)
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);

  // Stock Movements history (Arrivages & Rapprochements)
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  // Recorded Losses & Breakages
  const [losses, setLosses] = useState<LossRecord[]>([]);

  // Customers for Cahier de Dettes (with localStorage persistence)
  const [customers, setCustomers] = useState<DebtCustomer[]>([]);

  // Sales History (seeded with realistic transactions of the day for reports)
  const [salesHistory, setSalesHistory] = useState<CompletedSale[]>([]);

  // Client Orders (Bons de commande, Devis et Bons de livraison)
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);

  // Compteur dynamique de nouvelles commandes pour alertes et badges
  const pendingOrdersCount = useMemo(() => {
    return customerOrders.filter(
      (o: any) => !o.deliveryStatus || o.deliveryStatus === 'Nouvelle commande' || o.status === 'EN_ATTENTE'
    ).length;
  }, [customerOrders]);

  // Alerte en direct pour commande entrante côté caisse / commerçant
  const [liveAppIncomingOrder, setLiveAppIncomingOrder] = useState<StoreCustomerOrder | null>(null);

  useEffect(() => {
    const handleNewOrderAlert = (e: any) => {
      const ord = e.detail as StoreCustomerOrder;
      if (ord) {
        setLiveAppIncomingOrder(ord);
      }
    };
    window.addEventListener('newCustomerOrderAlert', handleNewOrderAlert);
    return () => window.removeEventListener('newCustomerOrderAlert', handleNewOrderAlert);
  }, []);

  // Sellers State (Multi-vendeurs avec Code PIN & Signature)
  const [sellers, setSellers] = useState<SellerUser[]>([]);
  const [activeSeller, setActiveSeller] = useState<SellerUser | null>(null);

  // Modals
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSellerSwitchModalOpen, setIsSellerSwitchModalOpen] = useState(false);
  const [isPosCameraScannerOpen, setIsPosCameraScannerOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [activeReceiptData, setActiveReceiptData] = useState<ReceiptData | null>(null);
  const [lastSaleToast, setLastSaleToast] = useState<string | null>(null);
  const [securityToast, setSecurityToast] = useState<{ message: string; type?: string } | null>(null);

  // État NaNa Académie (Tiroir interactif & Mini-lecteur vidéo flottant)
  const [isAcademyDrawerOpen, setIsAcademyDrawerOpen] = useState(false);
  const [activeAcademyTutorialId, setActiveAcademyTutorialId] = useState<string | null>(null);
  const [activeMiniTutorial, setActiveMiniTutorial] = useState<TutorialItem | null>(null);
  const [completedTutorialIds, setCompletedTutorialIds] = useState<string[]>(() => getCompletedTutorialIds());

  useEffect(() => {
    const handleOpenAcademy = (e: any) => {
      const targetId = e?.detail?.tutorialId;
      if (targetId) {
        setActiveAcademyTutorialId(targetId);
      }
      setIsAcademyDrawerOpen(true);
    };
    const handleProgress = () => setCompletedTutorialIds(getCompletedTutorialIds());
    window.addEventListener('nana_open_academy', handleOpenAcademy);
    window.addEventListener('tutorialProgressUpdated', handleProgress);
    return () => {
      window.removeEventListener('nana_open_academy', handleOpenAcademy);
      window.removeEventListener('tutorialProgressUpdated', handleProgress);
    };
  }, []);
 
  // Déclenchement automatique du nettoyage SMS dès l'ouverture d'une modale de paiement
  useEffect(() => {
    if (isCashModalOpen || isCreditModalOpen) {
      autoCleanSmsDatabase().catch(console.warn);
    }
  }, [isCashModalOpen, isCreditModalOpen]);

  // Écouteur global pour notifications de sécurité & blocage Démo
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const handleGlobalToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: string; duration?: number }>;
      if (customEvent.detail?.message) {
        setSecurityToast({
          message: customEvent.detail.message,
          type: customEvent.detail.type || 'warning',
        });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          setSecurityToast(null);
        }, customEvent.detail.duration || 4500);
      }
    };
    window.addEventListener('nana_show_toast', handleGlobalToast);
    return () => {
      window.removeEventListener('nana_show_toast', handleGlobalToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Persist customer orders to tenant local storage
  useEffect(() => {
    const currentStoreId = getCurrentStoreId();
    safeSetItem(`nana_tenant_${currentStoreId}_orders`, JSON.stringify(customerOrders));
  }, [customerOrders, currentUser?.storeId]);

  // Sécurité & Verrouillage par Master PIN Gérant (Protection rôle Caissier)
  const [managerAuthModal, setManagerAuthModal] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    actionBadge?: string;
    onSuccess: () => void;
  } | null>(null);

  const isCashierMode = isCashierSession(activeSeller, currentUser);

  const requireManagerAuth = (
    action: () => void,
    title: string = 'Autorisation Gérant Requise',
    badge?: string,
    description?: string
  ) => {
    if (isCashierMode) {
      setManagerAuthModal({
        isOpen: true,
        title,
        description,
        actionBadge: badge,
        onSuccess: action,
      });
    } else {
      action();
    }
  };

  const handleLoginSuccess = (user: StoreUser) => {
    // 1. Vider immédiatement le panier actuel et réinitialiser l'état de caisse
    setCart([]);
    setActiveReceiptData(null);
    setIsCashModalOpen(false);
    setIsCreditModalOpen(false);

    // 2. Nettoyage strict des états en mémoire du précédent compte
    setSalesHistory([]);
    setInventory([]);
    setStockMovements([]);
    setLosses([]);
    setCustomers([]);
    setCustomerOrders([]);
    setSellers([]);
    setActiveSeller(null);

    const targetStoreId =
      user.storeId && user.storeId !== 'store-nana-1'
        ? user.storeId
        : auth.currentUser?.uid
        ? auth.currentUser.uid
        : `store-${user.id}`;

    const resolvedSellerMode = resolveSellerMode(user);
    persistSellerModeLocally(resolvedSellerMode);

    const resolvedUser: StoreUser = {
      ...user,
      storeId: targetStoreId,
      sellerMode: resolvedSellerMode,
    };

    if (isSuperAdminLocally(resolvedUser)) {
      resolvedUser.role = 'SUPER_ADMIN';
      resolvedUser.isSuperAdmin = true;
      resolvedUser.kycStatus = 'verified';
      resolvedUser.storeApprovalStatus = 'APPROVED';
      resolvedUser.plan = 'elite';
      resolvedUser.subscriptionStatus = 'active';
      setStoreApprovalStatus('APPROVED');
    }

    setCurrentUser(resolvedUser);
    setIsPinLocked(false);
    setShowWelcomeShowcase(false);
    setIsPinModalOpenFromLanding(false);
    setIsEmailAuthScreenOpen(false);

    // Persistance Firestore de sellerMode (users/{uid} et stores/{storeId})
    const authUid = auth.currentUser?.uid || (user.id && !user.id.startsWith('usr-') ? user.id : undefined);
    updateSellerModeInFirestore(resolvedSellerMode, authUid, targetStoreId).catch(() => {});

    // 1. S'il vient de /nana-switch/auth -> redirection vers /nana-switch/overview
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/nana-switch/auth') ||
        window.location.pathname.startsWith('/nanaswitch/auth'))
    ) {
      const savedRedirect = sessionStorage.getItem('nanaswitch_auth_redirect');
      if (savedRedirect) {
        sessionStorage.removeItem('nanaswitch_auth_redirect');
      }
      const destination = savedRedirect || '/nana-switch/connectors';
      setCurrentView('NANA_SWITCH_APP');
      setIsInstructorView(false);
      window.history.pushState({}, '', destination);
      setLastSaleToast(`⚡ Bienvenue ${resolvedUser.name} sur NaNaSwitch Overview !`);
      setTimeout(() => setLastSaleToast(null), 4000);
      return;
    }

    // 2. Redirection obligatoire vers le Tableau de Bord Caméléon Central (/dashboard) — JAMAIS vers la Caisse Physique (POS) !
    setIsInstructorView(false);
    setCurrentView('MASTER_HUB');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
    }

    if (resolvedSellerMode === 'creator_trainer') {
      setLastSaleToast(`🎓 Bienvenue ${resolvedUser.name} ! Votre Tableau de Bord Formateur & Digital "${resolvedUser.storeName}" est actif.`);
    } else if (resolvedSellerMode === 'hybrid_all') {
      setLastSaleToast(`🚀 Bienvenue ${resolvedUser.name} ! Votre Tableau de Bord Hybride "${resolvedUser.storeName}" est actif.`);
    } else {
      setLastSaleToast(`🛍️ Bienvenue ${resolvedUser.name} ! Votre Tableau de Bord Commerçant & E-Shop "${resolvedUser.storeName}" est actif.`);
    }
    setTimeout(() => setLastSaleToast(null), 4000);

    // Nettoyage de tout résidu de plan : interdiction d'ouverture automatique post-inscription
    try {
      localStorage.removeItem('nana_pending_checkout_plan');
    } catch (e) {
      console.error(e);
    }

    // Déclenchement automatique de l'Espace Partenaire si une intention d'affiliation était en attente
    try {
      const pendingPartner = localStorage.getItem('nana_pending_partner_intent');
      if (pendingPartner) {
        localStorage.removeItem('nana_pending_partner_intent');
        setIsAffiliateModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualLock = () => {
    playValidationBeep();
    setPinLockReason('LOCK');
    setIsPinLocked(true);
  };

  const handleContinueDemo = () => {
    // 1. Vider immédiatement le panier et réinitialiser la caisse
    setCart([]);
    setActiveReceiptData(null);
    setIsCashModalOpen(false);
    setIsCreditModalOpen(false);

    // 2. Réinitialiser les données en mémoire
    setSalesHistory([]);
    setInventory([]);
    setStockMovements([]);
    setLosses([]);
    setCustomers([]);
    setCustomerOrders([]);
    setSellers([]);
    setActiveSeller(null);

    setIsAuthScreenExplicitlyBypassed(true);
    setShowWelcomeShowcase(false);
    setIsPinModalOpenFromLanding(false);
    setIsEmailAuthScreenOpen(false);
    setIsPinLocked(false);

    let demoStoreId = safeGetItem('nana_demo_store_id');
    if (!demoStoreId) {
      demoStoreId = `demo-store-${Date.now().toString(36)}`;
      safeSetItem('nana_demo_store_id', demoStoreId);
    }

    const demoSellerMode = resolveSellerMode(null);
    const demoUser: StoreUser = {
      id: 'usr-demo',
      storeId: demoStoreId,
      name: 'Amadou Diallo (Démo)',
      email: 'pousbila36@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      storeName: 'Alimentation Générale de la Paix',
      role: 'demo',
      sellerMode: demoSellerMode,
      phone: '+225 07 12 34 56 78',
      city: 'Abidjan (Treichville)',
      country: "Côte d'Ivoire",
      currency: 'F CFA',
      defaultCreditLimit: 20000,
      loginProvider: 'demo',
      pinCode: '1234',
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(demoUser);
    setIsInstructorView(false);
    setCurrentView('MASTER_HUB');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
    }
  };

  // Réinitialisation d'état pour le bouton "Retour à l'accueil" (depuis les tableaux de bord)
  const handleBackToHome = () => {
    playTapBeep();
    setCurrentUser(null);
    setIsAuthScreenExplicitlyBypassed(false);
    setIsEmailAuthScreenOpen(false);
    setShowWelcomeShowcase(true);
    setCurrentView('HOME');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // Ignore
    }
    // Nettoyage strict et immédiat de tout l'état local en mémoire
    setCart([]);
    setActiveReceiptData(null);
    setIsCashModalOpen(false);
    setIsCreditModalOpen(false);
    setSalesHistory([]);
    setInventory([]);
    setStockMovements([]);
    setLosses([]);
    setCustomers([]);
    setCustomerOrders([]);
    setSellers([]);
    setActiveSeller(null);
    setCurrentUser(null);

    setIsAuthScreenExplicitlyBypassed(false);
    setIsAdminModalOpen(false);
    setIsPinLocked(false);
    setShowWelcomeShowcase(true);
    setIsPinModalOpenFromLanding(false);
    setIsEmailAuthScreenOpen(false);

    // Supprimer les clés de session et clés globales non partitionnées pour ne laisser aucun résidu
    safeRemoveItem('nana_store_auth_user');
    safeRemoveItem('nana_store_user');
    safeRemoveItem('nana_active_seller_id');
    safeRemoveItem('nana_sellers');
    safeRemoveItem('nana_inventory');
    safeRemoveItem('nana_sales');
    safeRemoveItem('nana_customers');
    safeRemoveItem('nana_losses');
    safeRemoveItem('nana_stock_movements');
    playTapBeep();
  };

  // SaaS Multi-tenant Subscription & Store Approval
  const [subscription, setSubscription] = useState<StoreSubscription | null>(() => {
    const saved = safeGetItem('nana_store_sub');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse subscription', e);
      }
    }
    return {
      status: 'TRIAL',
      plan: 'FREE_TRIAL',
      expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
      startedAt: Date.now(),
      lastPaymentMethod: 'TRIAL',
      lastAmountPaid: 0,
    };
  });

  // Statut compte gratuit ("Plan Découverte") pour quotas & caissiers
  const isFree = isFreePlan(subscription || currentUser?.subscription);

  const [storeApprovalStatus, setStoreApprovalStatus] = useState<StoreApprovalStatus>(() => {
    if (isSuperAdminLocally(currentUser)) return 'APPROVED';
    return currentUser?.storeApprovalStatus || 'APPROVED';
  });

  const [isPaywallModalOpen, setIsPaywallModalOpen] = useState(false);
  const [selectedCheckoutPlanId, setSelectedCheckoutPlanId] = useState<string>('pro');

  // Écouteur global d'ouverture de paywall / mise à niveau (UpsellModal, Feature Gate)
  useEffect(() => {
    const handleOpenPaywall = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetPlanId?: string }>;
      if (customEvent.detail?.targetPlanId) {
        setSelectedCheckoutPlanId(customEvent.detail.targetPlanId);
      }
      setIsPaywallModalOpen(true);
    };
    window.addEventListener('nana_open_paywall_modal', handleOpenPaywall);
    return () => window.removeEventListener('nana_open_paywall_modal', handleOpenPaywall);
  }, []);

  // Écouteur temps-réel de synchronisation de l'abonnement et de l'utilisateur
  useEffect(() => {
    const handleSubUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ subscription?: StoreSubscription; plan?: string }>;
      const updatedSub = customEvent.detail?.subscription;
      const updatedPlan = customEvent.detail?.plan;

      if (updatedSub) {
        setSubscription(updatedSub);
      }
      if (updatedPlan) {
        const isUnlimited = updatedPlan === 'pro' || updatedPlan === 'elite';
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            plan: updatedPlan,
            subscriptionPlan: updatedPlan,
            subscriptionStatus: 'ACTIVE' as const,
            subscription: updatedSub || prev.subscription,
            quotas: {
              maxCourses: isUnlimited ? -1 : (updatedPlan === 'starter' ? 5 : 1),
              unlimitedCourses: isUnlimited,
            },
          };
          safeSetItem('nana_store_auth_user', JSON.stringify(updated));
          return updated;
        });
      }
    };
    window.addEventListener('nana_subscription_updated', handleSubUpdated);
    return () => window.removeEventListener('nana_subscription_updated', handleSubUpdated);
  }, []);

  // Écouteur temps-réel des crédits IA (Règle 4 : Mise à jour immédiate sans rechargement)
  useEffect(() => {
    const handleCreditsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ credits?: number; creditBonus?: number }>;
      const newCredits = customEvent.detail?.credits;
      const creditBonus = customEvent.detail?.creditBonus;

      setCurrentUser((prev) => {
        if (!prev) return prev;
        const targetCredits = typeof newCredits === 'number' 
          ? newCredits 
          : (prev.credits || 0) + (creditBonus || 0);
        const updated = {
          ...prev,
          credits: targetCredits,
        };
        safeSetItem('nana_store_auth_user', JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener('nana_credits_updated', handleCreditsUpdated);
    return () => window.removeEventListener('nana_credits_updated', handleCreditsUpdated);
  }, []);

  const handleOpenDocuSign = (title: string = 'Document Commercial') => {
    setDocuSignDocTitle(title);
    setIsDocuSignOpen(true);
  };

  const handleOpenMarketingAi = (product?: { name?: string; features?: string; price?: number; initialMode?: 'text' | 'image' | 'video' }) => {
    setMarketingAiProductData(product || null);
    setIsMarketingAiModalOpen(true);
  };

  // Écouteur global pour l'ouverture du Studio IA Interne depuis n'importe quel composant
  useEffect(() => {
    const handleStudioIaEvent = (e: any) => {
      handleOpenMarketingAi(e?.detail);
    };
    window.addEventListener('nana_open_marketing_ai', handleStudioIaEvent);
    return () => window.removeEventListener('nana_open_marketing_ai', handleStudioIaEvent);
  }, []);

  // Sync subscription to localStorage
  useEffect(() => {
    if (subscription) {
      safeSetItem('nana_store_sub', JSON.stringify(subscription));
    }
  }, [subscription]);

  // Synchronisation temps réel (Supabase Realtime) de l'abonnement et du profil utilisateur
  useEffect(() => {
    const sId = currentUser?.storeId;
    const uId = currentUser?.id || auth.currentUser?.uid;
    if (!sId && !uId) return;

    // 1. Écouteur temps réel de l'abonnement sur stores/{storeId} et users/{userId}
    const unsubSub = subscribeToStoreSubscription(sId || uId || '', (liveSub) => {
      if (liveSub) {
        setSubscription(liveSub);
        const isUnlimited = liveSub.plan?.toLowerCase().includes('pro') || liveSub.plan?.toLowerCase().includes('elite');
        setCurrentUser((prev) => {
          if (!prev) return prev;
          if (prev.plan === liveSub.plan && prev.subscriptionStatus === liveSub.status) return prev;
          const updated = {
            ...prev,
            plan: liveSub.plan,
            subscriptionPlan: liveSub.plan,
            subscriptionStatus: liveSub.status,
            subscription: liveSub,
            quotas: {
              maxCourses: isUnlimited ? -1 : (liveSub.plan?.toLowerCase().includes('starter') ? 5 : 1),
              unlimitedCourses: isUnlimited,
            },
          };
          safeSetItem('nana_store_auth_user', JSON.stringify(updated));
          return updated;
        });
      }
    }, uId);

    // 2. Écouteur temps réel du profil users/{userId} (rôle, quotas, plan, crédits)
    const unsubProfile = uId ? subscribeToUserProfile(uId, (liveProfile) => {
      if (liveProfile) {
        if (liveProfile.subscription) {
          setSubscription(liveProfile.subscription);
        }
        const livePlan = liveProfile.plan || liveProfile.subscriptionPlan;
        if (livePlan) {
          const isUnlimited = livePlan.toLowerCase().includes('pro') || livePlan.toLowerCase().includes('elite');
          setCurrentUser((prev) => {
            if (!prev) return prev;
            if (
              prev.plan === livePlan &&
              prev.role === (liveProfile.role || prev.role) &&
              prev.credits === (liveProfile.credits ?? prev.credits) &&
              prev.subscriptionStatus === (liveProfile.subscriptionStatus || prev.subscriptionStatus)
            ) {
              return prev;
            }
            const updated = {
              ...prev,
              plan: livePlan,
              subscriptionPlan: livePlan,
              subscriptionStatus: liveProfile.subscriptionStatus || prev.subscriptionStatus || 'ACTIVE',
              subscription: liveProfile.subscription || prev.subscription,
              role: liveProfile.role || prev.role,
              credits: liveProfile.credits !== undefined ? liveProfile.credits : prev.credits,
              quotas: {
                maxCourses: isUnlimited ? -1 : (livePlan.toLowerCase().includes('starter') ? 5 : 1),
                unlimitedCourses: isUnlimited,
              },
            };
            safeSetItem('nana_store_auth_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    }) : () => {};

    return () => {
      unsubSub();
      unsubProfile();
    };
  }, [currentUser?.storeId, currentUser?.id]);

  // Sync sellers to local storage partitionné par storeId
  useEffect(() => {
    const sId = getCurrentStoreId();
    safeSetItem(`nana_tenant_${sId}_sellers`, JSON.stringify(sellers));
  }, [sellers, currentUser?.storeId]);

  useEffect(() => {
    const sId = getCurrentStoreId();
    if (activeSeller) {
      safeSetItem(`nana_tenant_${sId}_active_seller_id`, activeSeller.id);
    } else {
      safeRemoveItem(`nana_tenant_${sId}_active_seller_id`);
    }
  }, [activeSeller, currentUser?.storeId]);

  // Session de caisse (Casier) concurrente et isolée par onglet / terminal
  const [currentCasierSession, setCurrentCasierSession] = useState<CasierSession>(() => {
    const sId = safeGetItem('nana_selected_store_id') || 'store-default';
    return getOrCreateTabCasierSession(sId, null);
  });

  // Mise à jour de la session de caisse lors d'un changement de boutique ou vendeur
  useEffect(() => {
    const sId = getCurrentStoreId();
    const session = getOrCreateTabCasierSession(sId, activeSeller);
    setCurrentCasierSession(session);
  }, [currentUser?.storeId, activeSeller?.id]);

  const handleSelectSeller = (seller: SellerUser) => {
    // Règle stricte : Vider immédiatement le panier lors d'un changement de vendeur
    setCart([]);
    setActiveReceiptData(null);
    setIsCashModalOpen(false);
    setIsCreditModalOpen(false);
    setActiveSeller(seller);
    setIsSellerSwitchModalOpen(false);
    const sId = getCurrentStoreId();
    safeSetItem(`nana_tenant_${sId}_active_seller_id`, seller.id);
    setLastSaleToast(`👤 Session Caisse : ${seller.name} (${seller.signatureCode})`);
    setTimeout(() => {
      setLastSaleToast(null);
    }, 3500);
  };

  const handleLockPOS = () => {
    // Vider le panier et verrouiller la caisse
    setCart([]);
    setActiveReceiptData(null);
    setIsCashModalOpen(false);
    setIsCreditModalOpen(false);
    setActiveSeller(null);
    const sId = getCurrentStoreId();
    safeRemoveItem(`nana_tenant_${sId}_active_seller_id`);
    setIsSellerSwitchModalOpen(false);
    setLastSaleToast('🔒 Caisse verrouillée ! Code PIN requis pour encaisser.');
    setTimeout(() => {
      setLastSaleToast(null);
    }, 3500);
  };

  const handleAddSeller = (newSellerData: Omit<SellerUser, 'id'>) => {
    const isFree = isFreePlan(subscription || currentUser?.subscription);
    const planLimits = getPlanLimits(subscription || currentUser?.subscription);
    const maxCashiers = isFree ? 1 : (planLimits.maxCashiers ?? 2);

    if (maxCashiers !== -1 && sellers.length >= maxCashiers) {
      const upgradeMsg = isFree
        ? 'Limite atteinte (1/1 caissier sur le Plan Découverte). Passez au Plan Starter ou Pro pour ajouter plusieurs caissiers.'
        : `Limite atteinte (${sellers.length}/${maxCashiers} caissiers). Passez au Plan Starter ou Pro pour ajouter plusieurs caissiers.`;

      triggerUpsellModal({
        mode: 'LIMIT_REACHED',
        limiterKey: 'CASHIERS',
        currentCount: sellers.length,
        maxCount: maxCashiers,
        limiterItemName: 'caissier',
        recommendedPlan: isFree ? 'starter' : 'pro',
        customTitle: 'Limite de caissiers atteinte',
        customMessage: upgradeMsg
      });
      setLastSaleToast(upgradeMsg);
      setTimeout(() => {
        setLastSaleToast(null);
      }, 5000);
      return;
    }

    const currentStoreId = getCurrentStoreId();
    const newSeller: SellerUser = {
      ...newSellerData,
      id: `seller-${Date.now()}`,
      storeId: currentStoreId,
    };
    setSellers((prev) => [...prev, newSeller]);
    persistSeller(newSeller, currentStoreId);
    setActiveSeller(newSeller);
    safeSetItem(`nana_tenant_${currentStoreId}_active_seller_id`, newSeller.id);
    setIsSellerSwitchModalOpen(false);
    setLastSaleToast(`👤 Session Caisse : ${newSeller.name} (${newSeller.signatureCode})`);
    setTimeout(() => {
      setLastSaleToast(null);
    }, 4000);
  };

  // Écouteurs Firestore temps réel STRICTEMENT filtrés par boutique
  useEffect(() => {
    const currentStoreId = getCurrentStoreId();
    if (!currentStoreId || !currentUser) {
      setSalesHistory([]);
      setInventory([]);
      setCustomers([]);
      setLosses([]);
      setStockMovements([]);
      setCustomerOrders([]);
      setSellers([]);
      return;
    }

    // Réinitialisation préalable pour garantir l'absence de fuite de données entre tenants
    setSalesHistory([]);
    setInventory([]);
    setCustomers([]);
    setLosses([]);
    setStockMovements([]);
    setCustomerOrders([]);
    setSellers([]);

    // 1. Écouteur Ventes Firestore (Multi-tenant)
    const unsubSales = subscribeToStoreCollection<CompletedSale>(
      'sales',
      currentStoreId,
      (remoteSales) => {
        setSalesHistory(remoteSales);
      }
    );

    // 2. Écouteur Inventaire Firestore (Multi-tenant)
    const unsubInventory = subscribeToStoreCollection<InventoryProduct>(
      'inventory',
      currentStoreId,
      (remoteInventory) => {
        if (remoteInventory.length > 0) {
          setInventory(remoteInventory);
        } else {
          // Si nouvelle boutique vide, initialiser avec le catalogue
          const initialCatalog = INITIAL_INVENTORY.map((p) => ({
            ...p,
            storeId: currentStoreId,
            stock: 15,
          }));
          setInventory(initialCatalog);
        }
      }
    );

    // 3. Écouteur Carnet de Dettes Firestore (Multi-tenant)
    const unsubCustomers = subscribeToStoreCollection<DebtCustomer>(
      'customers',
      currentStoreId,
      (remoteCustomers) => {
        setCustomers(remoteCustomers);
      }
    );

    // 4. Écouteur Pertes & Casse Firestore (Multi-tenant)
    const unsubLosses = subscribeToStoreCollection<LossRecord>(
      'losses',
      currentStoreId,
      (remoteLosses) => {
        setLosses(remoteLosses);
      }
    );

    // 5. Écouteur Mouvements de stock Firestore (Multi-tenant)
    const unsubMovements = subscribeToStoreCollection<StockMovement>(
      'stockMovements',
      currentStoreId,
      (remoteMovements) => {
        setStockMovements(remoteMovements);
      }
    );

    // 6. Écouteur Bons & Commandes Clients Firestore + RTDB (Multi-tenant)
    const unsubOrders = subscribeToStoreCollection<CustomerOrder>(
      'orders',
      currentStoreId,
      (remoteOrders) => {
        setCustomerOrders(remoteOrders);
      }
    );

    const unsubRtdbOrders = startOrderRealtimeSync(
      currentStoreId,
      (rtdbOrders) => {
        if (rtdbOrders && rtdbOrders.length > 0) {
          setCustomerOrders((prev) => {
            const map = new Map<string, CustomerOrder>();
            rtdbOrders.forEach((o) => map.set(o.id, o));
            prev.forEach((o) => {
              if (!map.has(o.id)) map.set(o.id, o);
            });
            return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          });
        }
      },
      (newOrder) => {
        setLiveAppIncomingOrder(newOrder);
      }
    );

    // 7. Écouteur Vendeurs Firestore (Multi-tenant)
    const unsubSellers = subscribeToStoreCollection<SellerUser>(
      'sellers',
      currentStoreId,
      (remoteSellers) => {
        setSellers(remoteSellers);
        setActiveSeller((curr) => {
          if (curr && remoteSellers.some((s) => s.id === curr.id)) {
            return remoteSellers.find((s) => s.id === curr.id) || curr;
          }
          const savedSellerId = safeGetItem(`nana_tenant_${currentStoreId}_active_seller_id`);
          if (savedSellerId) {
            const found = remoteSellers.find((s) => s.id === savedSellerId);
            if (found) return found;
          }
          return remoteSellers[0] || null;
        });
      }
    );

    return () => {
      unsubSales();
      unsubInventory();
      unsubCustomers();
      unsubLosses();
      unsubMovements();
      unsubOrders();
      unsubRtdbOrders();
      unsubSellers();
    };
  }, [currentUser?.storeId, currentUser?.id]);

  // Changement dynamique de boutique (Multi-tenant Switcher)
  const handleSwitchStoreId = (newStoreId: string, newStoreName?: string) => {
    if (!currentUser) return;
    setCart([]);
    setActiveReceiptData(null);
    setIsCashModalOpen(false);
    setIsCreditModalOpen(false);
    setActiveSeller(null);

    const resolvedName =
      newStoreName ||
      (newStoreId === 'store-nana-1'
        ? 'Alimentation Nana Treichville'
        : newStoreId === 'store-cocody-2'
        ? 'Superette Nana Cocody'
        : `Boutique ${newStoreId}`);

    const updatedUser: StoreUser = {
      ...currentUser,
      storeId: newStoreId,
      storeName: resolvedName,
    };
    setCurrentUser(updatedUser);
    safeSetItem('nana_store_auth_user', JSON.stringify(updatedUser));

    setLastSaleToast(`Boutique active : "${resolvedName}" [ID: ${newStoreId}]`);
    setTimeout(() => setLastSaleToast(null), 4000);
  };

  // Sync to local storage partitionné par storeId (isolation stricte, aucune clé globale polluante)
  useEffect(() => {
    const sId = getCurrentStoreId();
    if (sId && inventory.length > 0) {
      safeSetItem(`nana_tenant_${sId}_inventory`, JSON.stringify(inventory));
    }
  }, [inventory, currentUser?.storeId]);

  useEffect(() => {
    const sId = getCurrentStoreId();
    if (sId) {
      safeSetItem(`nana_tenant_${sId}_losses`, JSON.stringify(losses));
    }
  }, [losses, currentUser?.storeId]);

  useEffect(() => {
    const sId = getCurrentStoreId();
    if (sId) {
      safeSetItem(`nana_tenant_${sId}_stock_movements`, JSON.stringify(stockMovements));
    }
  }, [stockMovements, currentUser?.storeId]);

  useEffect(() => {
    const sId = getCurrentStoreId();
    if (sId) {
      safeSetItem(`nana_tenant_${sId}_customers`, JSON.stringify(customers));
    }
  }, [customers, currentUser?.storeId]);

  useEffect(() => {
    const sId = getCurrentStoreId();
    if (sId) {
      safeSetItem(`nana_tenant_${sId}_sales`, JSON.stringify(salesHistory));
    }
  }, [salesHistory, currentUser?.storeId]);

  // Cart calculations
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalDebtAmount = customers.reduce((sum, c) => sum + c.totalDebt, 0);

  // Fast Sale Add Item
  const handleSelectProduct = (product: FastSaleProduct) => {
    playTapBeep();
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === product.id);
      if (existing) {
        return prevCart.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  // Add Inventory Product to Cart (from POS real-time Search or Barcode/QR scan)
  const handleSelectInventoryProduct = (product: InventoryProduct) => {
    playTapBeep();
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === product.id);
      if (existing) {
        return prevCart.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: product.sellingPrice,
          quantity: 1,
          photoUrl: product.photoUrl,
          barcode: product.barcode,
        },
      ];
    });
    setLastSaleToast(`✓ +1 ${product.name} (${formatCFA(product.sellingPrice)})`);
    setTimeout(() => setLastSaleToast(null), 3000);
  };

  // Add preset amount directly (ex: 500F, 1000F, 2000F...)
  const handleSelectPresetAmount = (amount: number) => {
    playTapBeep();
    const id = `preset-${amount}-${Date.now()}`;
    setCart((prevCart) => [
      ...prevCart,
      {
        id,
        name: `Montant Direct (${formatCFA(amount)})`,
        price: amount,
        quantity: 1,
      },
    ]);
    setLastSaleToast(`✓ +1 Montant (${formatCFA(amount)}) ajouté au ticket`);
    setTimeout(() => setLastSaleToast(null), 3000);
  };

  // Handle scanned barcode (from Physical USB/Bluetooth reader or Selfie/Rear Camera)
  const handleScannedBarcode = (scannedCode: string) => {
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return;

    // 1. Search in inventory by exact barcode, or ID match
    const foundProduct = inventory.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === cleanCode.toLowerCase()) ||
        p.id.toLowerCase() === cleanCode.toLowerCase()
    );

    if (foundProduct) {
      playValidationBeep();
      handleSelectInventoryProduct(foundProduct);
      setLastSaleToast(`✓ Code détecté : ${foundProduct.name} (${formatCFA(foundProduct.sellingPrice)})`);
    } else {
      // 2. Try fast sale products
      const foundFast = FAST_SALE_PRODUCTS.find(
        (p) => p.id.toLowerCase() === cleanCode.toLowerCase()
      );
      if (foundFast) {
        playValidationBeep();
        handleSelectProduct(foundFast);
        setLastSaleToast(`✓ Code détecté : ${foundFast.name}`);
      } else {
        // Unknown barcode
        playTapBeep();
        setLastSaleToast(`⚠️ Code inconnu : "${cleanCode}". Aucun article associé.`);
      }
    }
    setTimeout(() => setLastSaleToast(null), 3500);
  };

  // Global Keyboard Listener: Captures instant input from physical USB/Bluetooth barcode/QR readers
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only active on POS view
      if (currentView !== 'POS') return;

      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      // Barcode scanners transmit characters extremely fast (< 50ms)
      if (timeDiff > 250) {
        barcodeBuffer = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 2) {
          e.preventDefault();
          const captured = barcodeBuffer;
          barcodeBuffer = '';
          handleScannedBarcode(captured);
        } else {
          barcodeBuffer = '';
        }
        return;
      }

      // Collect printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // If an input is focused, only buffer if rapid typing typical of hardware scanner
        if (!isInputActive || timeDiff < 60) {
          barcodeBuffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, inventory]);

  // Update item quantity in cart (+ / -) avec contrôle de stock et recalcul instantané
  const handleUpdateQuantity = (id: string, delta: number) => {
    playTapBeep();
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id === id) {
            // Vérification de la limite de stock disponible si l'article est géré dans l'inventaire
            const invProd = inventory.find((p) => p.id === id);
            if (delta > 0 && invProd && typeof invProd.stock === 'number') {
              if (item.quantity >= invProd.stock) {
                playCancelSound();
                setLastSaleToast(`⚠️ Stock maximum atteint pour ${item.name} (${invProd.stock} disponible${invProd.stock > 1 ? 's' : ''})`);
                setTimeout(() => setLastSaleToast(null), 2500);
                return item;
              }
            }

            const newQty = item.quantity + delta;
            // Si la quantité tombe à 0, retire automatiquement l'article du panier
            if (newQty <= 0) {
              setLastSaleToast(`Article "${item.name}" retiré du panier`);
              setTimeout(() => setLastSaleToast(null), 2000);
              return null;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Remove item from cart
  const handleRemoveItem = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  // Clear cart (sécurisé si rôle Caissier actif)
  const handleCancelCart = () => {
    if (cart.length === 0) return;
    if (isCashierMode) {
      requireManagerAuth(() => {
        setCart([]);
        playTapBeep();
        setLastSaleToast('Ticket annulé avec autorisation gérant');
        setTimeout(() => setLastSaleToast(null), 2500);
      }, 'Annulation du Ticket Caisse', 'Vider Panier', 'Le code secret Master PIN du gérant est requis pour annuler ou vider ce ticket.');
    } else {
      setCart([]);
    }
  };

  // Voice Push-to-Talk Release Action:
  // "Au relâchement du micro, ajoute automatiquement au ticket un article simulant la phrase : '2 Pains et 1 Lait' (Total: 800 F CFA) avec un bip sonore de validation."
  const handleAddVoiceItems = () => {};

  // Deduct sold products from inventory (Local-First : aucune écriture unitaire sur le réseau)
  const deductCartFromInventory = (itemsToDeduct: CartItem[]): InventoryProduct[] => {
    const updatedProducts: InventoryProduct[] = [];
    setInventory((prev) =>
      prev.map((prod) => {
        const sold = itemsToDeduct.find((i) => i.id === prod.id);
        if (sold) {
          const updatedProd: InventoryProduct = {
            ...prod,
            stock: Math.max(0, (prod.stock || 0) - sold.quantity),
          };
          updatedProducts.push(updatedProd);
          return updatedProd;
        }
        return prod;
      })
    );
    return updatedProducts;
  };

  // Cash payment confirmation
  
  const handleQuickCashCheckout = () => {
    if (!isStoreOpen) {
      alert("La boutique est fermée. Veuillez réouvrir la boutique pour utiliser la caisse et enregistrer des ventes.");
      return;
    }
    if (cart.length === 0 || total === 0) return;
    const currentStoreId = getCurrentStoreId();
    
    // Simulate cash amount equal to total
    const amountGiven = total;
    const change = 0;
    
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sale: CompletedSale = {
      id: `sale-${Date.now()}`,
      storeId: currentStoreId,
      date: nowStr,
      timestamp: Date.now(),
      items: [...cart],
      total: total,
      paymentMethod: 'CASH',
      amountGiven: amountGiven,
      changeReturned: change,
      sellerId: activeSeller?.id,
      casierSessionId: currentCasierSession.sessionId,
      casierNumber: currentCasierSession.casierNumber,
    };
    sale.integrityHash = generateSaleIntegrityHash(sale);

    const updatedStock = deductCartFromInventory(cart);
    setSalesHistory((prev) => [sale, ...prev]);
    queuePosSaleBatch(sale, updatedStock, currentStoreId).catch(() => {});
    
    playValidationBeep();
    playValidationBeep(); // Double beep

    // Keep active receipt ready for 1-tap print / reprint
    const receipt = buildReceiptFromSale(sale, currentUser, activeSeller);
    setActiveReceiptData(receipt);

    setCart([]);

    setLastSaleToast(`Vente Rapide : ${formatCFA(total)} enregistrée !`);
    setTimeout(() => {
      setLastSaleToast(null);
    }, 4000);
  };

  const handleConfirmCashPayment = (amountGiven: number, change: number) => {
    if (!isStoreOpen) {
      alert("La boutique est fermée. Veuillez réouvrir la boutique pour utiliser la caisse et enregistrer des ventes.");
      return;
    }
    const currentStoreId = getCurrentStoreId();
    const sale: CompletedSale = {
      id: `sale-${Date.now()}`,
      storeId: currentStoreId,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      items: [...cart],
      total,
      paymentMethod: 'CASH',
      amountGiven,
      changeReturned: change,
      sellerId: activeSeller?.id,
      sellerName: activeSeller?.name,
      sellerSignatureCode: activeSeller?.signatureCode,
      casierSessionId: currentCasierSession.sessionId,
      casierNumber: currentCasierSession.casierNumber,
    };
    sale.integrityHash = generateSaleIntegrityHash(sale);

    const updatedStock = deductCartFromInventory(cart);
    setSalesHistory((prev) => [sale, ...prev]);
    queuePosSaleBatch(sale, updatedStock, currentStoreId).catch(() => {});
    setIsCashModalOpen(false);

    // Keep active receipt ready for 1-tap print / reprint
    const receipt = buildReceiptFromSale(sale, currentUser, activeSeller);
    setActiveReceiptData(receipt);

    setCart([]);

    setLastSaleToast(`Vente Espèces : ${formatCFA(total)} reçue ! Monnaie : ${formatCFA(change)}`);
    setTimeout(() => {
      setLastSaleToast(null);
    }, 6000);
  };

  // Receipt & Print Handlers (Thermique 80mm/58mm & Facture PDF)
  const handleOpenPrintReceiptFromCart = () => {
    if (cart.length === 0) return;
    playTapBeep();
    const receipt = buildReceiptFromCart(cart, total, currentUser, { seller: activeSeller });
    setActiveReceiptData(receipt);
    setIsReceiptModalOpen(true);
  };

  const handleDownloadPdfReceiptFromCart = () => {
    if (cart.length === 0) return;
    playValidationBeep();
    const receipt = buildReceiptFromCart(cart, total, currentUser, { seller: activeSeller });
    downloadReceiptPdf(receipt, 'thermal_80');
  };

  const handlePrintFromCashModal = (amountGiven: number, change: number) => {
    const receipt = buildReceiptFromCart(cart, total, currentUser, {
      paymentMethod: 'CASH',
      amountGiven,
      changeReturned: change,
      seller: activeSeller,
    });
    setActiveReceiptData(receipt);
    setIsReceiptModalOpen(true);
  };

  const handlePdfFromCashModal = (amountGiven: number, change: number) => {
    const receipt = buildReceiptFromCart(cart, total, currentUser, {
      paymentMethod: 'CASH',
      amountGiven,
      changeReturned: change,
      seller: activeSeller,
    });
    downloadReceiptPdf(receipt, 'thermal_80');
  };

  const handleOpenReceiptFromSale = (sale: CompletedSale) => {
    playTapBeep();
    const receipt = buildReceiptFromSale(sale, currentUser, activeSeller);
    setActiveReceiptData(receipt);
    setIsReceiptModalOpen(true);
  };

  // Action : Un clic sur la photo de Mamadou enregistre la vente en cours directement sur son compte de dette et réinitialise le ticket.
  const handleQuickAssignToCustomer = (customer: DebtCustomer) => {
    if (!isStoreOpen) {
      alert("La boutique est fermée. Veuillez réouvrir la boutique pour enregistrer des ventes.");
      return;
    }
    if (cart.length === 0 || total === 0) {
      playTapBeep();
      setLastSaleToast(`Ajoutez des articles au ticket pour enregistrer une vente sur ${customer.shortName}`);
      setTimeout(() => {
        setLastSaleToast(null);
      }, 3500);
      return;
    }

    playValidationBeep();
    const currentStoreId = getCurrentStoreId();
    const currentTotal = total;
    const nowStr = `Aujourd'hui, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const itemsSummary = cart.map((i) => (i.quantity > 1 ? `${i.quantity}x ${i.name}` : i.name)).join(', ');

    let updatedCust: DebtCustomer | null = null;

    // Enregistre la vente en cours directement sur son compte de dette
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customer.id) {
          updatedCust = {
            ...c,
            storeId: currentStoreId,
            totalDebt: c.totalDebt + currentTotal,
            lastPurchaseDate: nowStr,
            daysOverdue: 0,
            status: 'RECENT',
            entries: [
              ...c.entries,
              {
                id: `entry-${Date.now()}`,
                date: nowStr,
                description: `${itemsSummary} (${formatCFA(currentTotal)})`,
                amount: currentTotal,
                paid: false,
              },
            ],
          };
          return updatedCust;
        }
        return c;
      })
    );

    if (updatedCust) {
      persistCustomer(updatedCust, currentStoreId);
    }

    // Record to sales history and deduct inventory
    const sale: CompletedSale = {
      id: `sale-${Date.now()}`,
      storeId: currentStoreId,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      items: [...cart],
      total: currentTotal,
      paymentMethod: 'CREDIT',
      sellerId: activeSeller?.id,
      sellerName: activeSeller?.name,
      sellerSignatureCode: activeSeller?.signatureCode,
      casierSessionId: currentCasierSession.sessionId,
      casierNumber: currentCasierSession.casierNumber,
    };
    sale.integrityHash = generateSaleIntegrityHash(sale);
    const updatedStock = deductCartFromInventory(cart);
    setSalesHistory((prev) => [sale, ...prev]);
    queuePosSaleBatch(sale, updatedStock, currentStoreId).catch(() => {});

    // Réinitialise le ticket
    setCart([]);

    // Feedback Toast
    setLastSaleToast(`Dette de ${formatCFA(currentTotal)} ajoutée à ${customer.shortName} !`);
    setTimeout(() => {
      setLastSaleToast(null);
    }, 4000);
  };

  // Credit assignment
  const handleConfirmCredit = (
    customerId: string | null,
    newCustomerName: string,
    phone: string,
    description: string
  ) => {
    if (!isStoreOpen) {
      alert("La boutique est fermée. Veuillez réouvrir la boutique pour enregistrer un crédit.");
      return;
    }
    const currentStoreId = getCurrentStoreId();
    const nowStr = `Aujourd'hui, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    if (customerId) {
      // Update existing customer
      let updatedCust: DebtCustomer | null = null;
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === customerId) {
            updatedCust = {
              ...c,
              storeId: currentStoreId,
              totalDebt: c.totalDebt + total,
              lastPurchaseDate: nowStr,
              daysOverdue: 0,
              status: 'RECENT',
              entries: [
                ...c.entries,
                {
                  id: `entry-${Date.now()}`,
                  date: nowStr,
                  description: description || `Achat de ${itemCount} articles`,
                  amount: total,
                  paid: false,
                },
              ],
            };
            return updatedCust;
          }
          return c;
        })
      );
      if (updatedCust) {
        persistCustomer(updatedCust, currentStoreId);
      }
    } else {
      // Create new customer
      const shortName = newCustomerName.trim().split(' ')[0] || newCustomerName;
      const initials = newCustomerName
        .trim()
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'CL';

      const newCust: DebtCustomer = {
        id: `cust-${Date.now()}`,
        storeId: currentStoreId,
        name: newCustomerName,
        shortName,
        initials,
        avatarColor: 'bg-indigo-600',
        phone: phone || undefined,
        totalDebt: total,
        lastPurchaseDate: nowStr,
        daysOverdue: 0,
        status: 'RECENT',
        entries: [
          {
            id: `entry-${Date.now()}`,
            date: nowStr,
            description: description || `Achat de ${itemCount} articles`,
            amount: total,
            paid: false,
          },
        ],
      };
      setCustomers((prev) => [newCust, ...prev]);
      persistCustomer(newCust, currentStoreId);
    }

    const recordedTotal = total;
    const creditSale: CompletedSale = {
      id: `sale-${Date.now()}`,
      storeId: currentStoreId,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      items: [...cart],
      total: recordedTotal,
      paymentMethod: 'CREDIT',
      sellerId: activeSeller?.id,
      sellerName: activeSeller?.name,
      sellerSignatureCode: activeSeller?.signatureCode,
      casierSessionId: currentCasierSession.sessionId,
      casierNumber: currentCasierSession.casierNumber,
    };
    creditSale.integrityHash = generateSaleIntegrityHash(creditSale);
    const updatedStock = deductCartFromInventory(cart);
    setSalesHistory((prev) => [creditSale, ...prev]);
    queuePosSaleBatch(creditSale, updatedStock, currentStoreId).catch(() => {});
    setIsCreditModalOpen(false);
    setCart([]);

    setLastSaleToast(`Crédit noté avec succès : ${formatCFA(recordedTotal)}`);
    setTimeout(() => {
      setLastSaleToast(null);
    }, 4000);
  };

  // Enregistrer une perte (Gestion des Pertes & Casse)
  // "La perte doit être déduite immédiatement du stock et recalculer le bénéfice net."
  const handleRecordLoss = (lossData: Omit<LossRecord, 'id' | 'timestamp'>) => {
    const currentStoreId = getCurrentStoreId();
    const newLoss: LossRecord = {
      ...lossData,
      id: `loss-${Date.now()}`,
      storeId: currentStoreId,
      timestamp: Date.now(),
    };

    setLosses((prev) => [newLoss, ...prev]);
    persistLoss(newLoss, currentStoreId);

    // Déduction immédiate du stock
    setInventory((prev) =>
      prev.map((prod) => {
        if (prod.id === lossData.productId) {
          const updated = {
            ...prod,
            stock: Math.max(0, prod.stock - lossData.quantity),
          };
          persistInventoryProduct(updated, currentStoreId);
          return updated;
        }
        return prod;
      })
    );
  };

  // Injecter des articles reconnus par la voix dans le panier
  const handleAddToCartFromVoice = (items: CartItem[]) => {
    setCart((prevCart) => {
      let updated = [...prevCart];
      items.forEach((newItem) => {
        const existing = updated.find((i) => i.id === newItem.id);
        if (existing) {
          updated = updated.map((i) =>
            i.id === newItem.id ? { ...i, quantity: i.quantity + newItem.quantity } : i
          );
        } else {
          updated.push(newItem);
        }
      });
      return updated;
    });

    setLastSaleToast(`Articles vocaux ajoutés au ticket de caisse !`);
    setTimeout(() => {
      setLastSaleToast(null);
    }, 3500);
  };

  // Record payment against existing debt in Cahier de Dettes
  const handleRecordPayment = (customerId: string, amount: number) => {
    const currentStoreId = getCurrentStoreId();
    let updatedCustomer: DebtCustomer | null = null;
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newDebt = Math.max(0, c.totalDebt - amount);
          updatedCustomer = {
            ...c,
            storeId: currentStoreId,
            totalDebt: newDebt,
            status: newDebt === 0 ? 'RECENT' : c.status,
            entries: [
              ...c.entries,
              {
                id: `pay-${Date.now()}`,
                date: `Règlement ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                description: `Paiement reçu (-${formatCFA(amount)})`,
                amount: -amount,
                paid: true,
              },
            ],
          };
          return updatedCustomer;
        }
        return c;
      })
    );

    if (updatedCustomer) {
      persistCustomer(updatedCustomer, currentStoreId);
    }

    setLastSaleToast(`Paiement de ${formatCFA(amount)} enregistré`);
    setTimeout(() => {
      setLastSaleToast(null);
    }, 4000);
  };

  // Manual debt creation from inside Cahier de Dettes
  const handleAddCustomerDebt = (
    customerName: string,
    phone: string,
    amount: number,
    description: string
  ) => {
    const currentStoreId = getCurrentStoreId();
    const nowStr = `Aujourd'hui, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const shortName = customerName.trim().split(' ')[0] || customerName;
    const initials =
      customerName
        .trim()
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'CL';

    const newCust: DebtCustomer = {
      id: `cust-${Date.now()}`,
      storeId: currentStoreId,
      name: customerName,
      shortName,
      initials,
      avatarColor: 'bg-violet-600',
      phone: phone || undefined,
      totalDebt: amount,
      lastPurchaseDate: nowStr,
      daysOverdue: 0,
      status: 'RECENT',
      entries: [
        {
          id: `entry-${Date.now()}`,
          date: nowStr,
          description: description,
          amount: amount,
          paid: false,
        },
      ],
    };
    setCustomers((prev) => [newCust, ...prev]);
    persistCustomer(newCust, currentStoreId);
  };

  // Restock handler (Saisie Rapide Arrivage)
  const handleRestockProduct = (
    productId: string,
    quantityToAdd: number,
    updatedCostPrice?: number
  ) => {
    const currentStoreId = getCurrentStoreId();
    setInventory((prev) =>
      prev.map((prod) => {
        if (prod.id === productId) {
          const prevStock = prod.stock;
          const newStock = prevStock + quantityToAdd;

          const mov: StockMovement = {
            id: `mov-${Date.now()}`,
            storeId: currentStoreId,
            timestamp: Date.now(),
            date: `Aujourd'hui, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            productId: prod.id,
            productName: prod.name,
            type: 'ARRIVAGE',
            quantityDelta: quantityToAdd,
            previousStock: prevStock,
            newStock: newStock,
            note: `Arrivage rapide (+${quantityToAdd})`,
          };
          setStockMovements((m) => [mov, ...m]);
          persistStockMovement(mov, currentStoreId);

          const updatedProduct: InventoryProduct = {
            ...prod,
            storeId: currentStoreId,
            stock: newStock,
            costPrice:
              updatedCostPrice !== undefined && updatedCostPrice > 0
                ? updatedCostPrice
                : prod.costPrice,
          };
          persistInventoryProduct(updatedProduct, currentStoreId);

          return updatedProduct;
        }
        return prod;
      })
    );
  };

  // Stock Reconciliation handler (Rapprochement après comptage physique)
  const handleReconcileStock = (
    productId: string,
    actualStock: number,
    note?: string,
    recordAsLoss: boolean = true
  ) => {
    const currentStoreId = getCurrentStoreId();
    setInventory((prev) =>
      prev.map((prod) => {
        if (prod.id === productId) {
          const prevStock = prod.stock;
          const diff = actualStock - prevStock;

          // If physical count shows missing items and recordAsLoss is true, record in losses
          if (diff < 0 && recordAsLoss) {
            const missingQty = Math.abs(diff);
            const newLoss: LossRecord = {
              id: `loss-reconcile-${Date.now()}`,
              storeId: currentStoreId,
              date: `Aujourd'hui, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              timestamp: Date.now(),
              productId: prod.id,
              productName: prod.name,
              quantity: missingQty,
              costPrice: prod.costPrice,
              lossAmount: missingQty * prod.costPrice,
              reason: 'CASSE',
              notes: note ? `Rapprochement: ${note}` : "Écart d'inventaire physique",
            };
            setLosses((l) => [newLoss, ...l]);
            persistLoss(newLoss, currentStoreId);
          }

          const mov: StockMovement = {
            id: `mov-${Date.now()}`,
            storeId: currentStoreId,
            timestamp: Date.now(),
            date: `Aujourd'hui, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            productId: prod.id,
            productName: prod.name,
            type: 'RAPPROCHEMENT',
            quantityDelta: diff,
            previousStock: prevStock,
            newStock: actualStock,
            note: note || 'Rapprochement comptage physique',
          };
          setStockMovements((m) => [mov, ...m]);
          persistStockMovement(mov, currentStoreId);

          const updatedProduct: InventoryProduct = {
            ...prod,
            storeId: currentStoreId,
            stock: actualStock,
          };
          persistInventoryProduct(updatedProduct, currentStoreId);

          return updatedProduct;
        }
        return prod;
      })
    );
  };

  // Add new product handler (enforces 3 products limit on Free Plan)
  const handleAddNewProduct = (
    newProduct: Omit<InventoryProduct, 'id' | 'storeId'> & { id?: string; storeId?: string; barcode?: string; photoUrl?: string }
  ) => {
    if (isLimitReached(subscription, 'PRODUCTS', inventory.length)) {
      triggerLimitReachedUpsell('PRODUCTS', inventory.length, 3, 'produits');
      return;
    }
    const currentStoreId = getCurrentStoreId();
    const id = newProduct.id?.trim() || `prod-${Date.now()}`;
    const prod: InventoryProduct = {
      ...newProduct,
      id,
      storeId: currentStoreId,
      photoUrl: newProduct.photoUrl || '',
      barcode: newProduct.barcode || '',
    };
    setInventory((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      return [prod, ...filtered];
    });
    persistInventoryProduct(prod, currentStoreId);

    try {
      const customKey = `nana_tenant_${currentStoreId}_custom_store_products`;
      const existingRaw = localStorage.getItem(customKey);
      const existing: InventoryProduct[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedCustom = [prod, ...existing.filter((p) => p.id !== id)];
      localStorage.setItem(customKey, JSON.stringify(updatedCustom));
    } catch {}

    const mov: StockMovement = {
      id: `mov-${Date.now()}`,
      storeId: currentStoreId,
      timestamp: Date.now(),
      date: `Aujourd'hui, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      productId: id,
      productName: prod.name,
      type: 'AJOUT_PRODUIT',
      quantityDelta: prod.stock,
      previousStock: 0,
      newStock: prod.stock,
      note: 'Création initiale du produit',
    };
    setStockMovements((m) => [mov, ...m]);
    persistStockMovement(mov, currentStoreId);
  };

  // Update existing product handler (Photo, Barcode, Prices, etc.)
  const handleUpdateProduct = (updatedProduct: InventoryProduct) => {
    const currentStoreId = getCurrentStoreId();
    const safeProduct: InventoryProduct = {
      ...updatedProduct,
      storeId: currentStoreId,
      photoUrl: updatedProduct.photoUrl || '',
      barcode: updatedProduct.barcode || '',
    };
    setInventory((prev) =>
      prev.map((p) => (p.id === safeProduct.id ? safeProduct : p))
    );
    persistInventoryProduct(safeProduct, currentStoreId);
  };

  // Batch import products handler (Excel / CSV)
  const handleBatchImportProducts = (importedProducts: InventoryProduct[]) => {
    const currentStoreId = getCurrentStoreId();
    if (!importedProducts || importedProducts.length === 0) return;

    // 1. Update inventory in state (O(1) deduping & merge)
    setInventory((prev) => {
      const prevMap = new Map(prev.map((p) => [p.id, p]));
      const newItems: InventoryProduct[] = [];

      importedProducts.forEach((prod) => {
        const safeProduct: InventoryProduct = {
          ...prod,
          storeId: currentStoreId,
          photoUrl: prod.photoUrl || '',
          barcode: prod.barcode || '',
          category: prod.category || 'Général',
        };
        if (prevMap.has(safeProduct.id)) {
          prevMap.set(safeProduct.id, safeProduct);
        } else {
          newItems.push(safeProduct);
        }
      });

      return [...newItems, ...Array.from(prevMap.values())];
    });

    // 2. Persist each product to Firestore and record stock movements
    const now = Date.now();
    const formattedDate = `Aujourd'hui, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newMovements: StockMovement[] = [];

    importedProducts.forEach((prod, index) => {
      const safeProduct: InventoryProduct = {
        ...prod,
        storeId: currentStoreId,
        photoUrl: prod.photoUrl || '',
        barcode: prod.barcode || '',
        category: prod.category || 'Général',
      };
      persistInventoryProduct(safeProduct, currentStoreId);

      const mov: StockMovement = {
        id: `mov-imp-${now}-${index}`,
        storeId: currentStoreId,
        timestamp: now + index,
        date: formattedDate,
        productId: safeProduct.id,
        productName: safeProduct.name,
        type: 'AJOUT_PRODUIT',
        quantityDelta: safeProduct.stock,
        previousStock: 0,
        newStock: safeProduct.stock,
        note: 'Import classeur Excel / CSV',
      };
      newMovements.push(mov);
      persistStockMovement(mov, currentStoreId);
    });

    setStockMovements((m) => [...newMovements, ...m]);
  };

  // Customer Orders Handlers
  const handleSaveCustomerOrder = (order: CustomerOrder) => {
    const currentStoreId = getCurrentStoreId();
    setCustomerOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      if (exists) {
        return prev.map((o) => (o.id === order.id ? order : o));
      }
      return [order, ...prev];
    });
    persistCustomerOrder(order, currentStoreId);

    const docTypeLabel =
      order.type === 'BON_COMMANDE'
        ? 'Bon de Commande'
        : order.type === 'BON_LIVRAISON'
        ? 'Bon de Livraison'
        : 'Devis';
    setLastSaleToast(`📋 ${docTypeLabel} ${order.orderNumber} enregistré !`);
    setTimeout(() => setLastSaleToast(null), 3500);
  };

  const handleDeleteCustomerOrder = (orderId: string) => {
    const currentStoreId = getCurrentStoreId();
    setCustomerOrders((prev) => prev.filter((o) => o.id !== orderId));
    deleteCustomerOrder(orderId, currentStoreId);
    setLastSaleToast('🗑️ Bon supprimé avec succès');
    setTimeout(() => setLastSaleToast(null), 3000);
  };

  const handleLoadOrderIntoCart = (items: CartItem[]) => {
    setCart(items);
    setCurrentView('POS');
    setLastSaleToast(`🛒 ${items.length} article(s) injecté(s) dans la caisse !`);
    setTimeout(() => setLastSaleToast(null), 3500);
  };

  
    // Priorité 0 : Route Gestion des Stocks Nanasore (/products)
  if (currentView === 'PRODUCTS' || currentView === 'products') {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-[#0b1329] flex items-center justify-center text-[#f4f4f6]">Chargement de la gestion des stocks...</div>}>
        <ProductsScreen />
      </React.Suspense>
    );
  }

  // Priorité 0 Absolue : Route de Test Supabase (Mode Sombre)
  if (currentView === 'TEST_SUPABASE' || currentView === 'test_supabase') {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-[#060B18] flex items-center justify-center text-white">Chargement du test Supabase...</div>}>
        <TestSupabaseScreen />
      </React.Suspense>
    );
  }

  // =========================================================================
  // 1. ROUTEUR MODE DOMAINE PERSONNALISÉ (EXTERNAL CUSTOM DOMAIN)
  // Activé lorsqu'un visiteur accède via un domaine externe (ex: mon-domaine.com)
  // Résout le tenant en Firestore et isole totalement l'expérience du marchand.
  // =========================================================================
  if (isCustomDomain) {
    // 1.1 Écran de chargement sécurisé pendant la résolution Firestore du tenant
    if (isLoadingTenant) {
      return <LoadingScreen message={`Connexion sécurisée au domaine ${customHostname}...`} />;
    }

    // 1.2 Domaine en attente d'association (non trouvé dans Firestore ou erreur)
    if (!customTenant || tenantError) {
      return (
        <CustomDomainNotFoundScreen
          hostname={customHostname}
          onRetry={refreshTenant}
          isLoading={isLoadingTenant}
        />
      );
    }

    // 1.3 Tenant associé à un Tunnel de Vente / Funnel
    if (
      customTenant.type === 'funnel' ||
      customTenant.vendorType === 'funnel' ||
      customTenant.funnelSlug ||
      customTenant.dealSlug ||
      customTenant.funnelId
    ) {
      // Supporte les sous-chemins (/f/:slug, /t/:slug, /c/:slug) ou le tunnel principal du domaine
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const subPathF = pathname.startsWith('/f/') ? pathname.split('/f/')[1]?.split('/')[0]?.split('?')[0] : null;
      const subPathT = pathname.startsWith('/t/') ? pathname.split('/t/')[1]?.split('/')[0]?.split('?')[0] : null;
      const subPathC = pathname.startsWith('/c/') ? pathname.split('/c/')[1]?.split('/')[0]?.split('?')[0] : null;

      if (subPathT) {
        return (
          <React.Suspense fallback={<LazyModuleFallback label={`Connexion au Tunnel Studio ${subPathT}...`} />}>
            <PublicModularTunnelView
              slug={subPathT}
              onBackToStore={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
            />
          </React.Suspense>
        );
      }

      if (subPathC) {
        return (
          <React.Suspense fallback={<LazyModuleFallback label={`Connexion à la Caisse Express ${subPathC}...`} />}>
            <PublicPhysicalFunnelView
              slug={subPathC}
              onBackToStore={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
            />
          </React.Suspense>
        );
      }

      const targetSlug = subPathF || customTenant.funnelSlug || customTenant.dealSlug || customTenant.funnelId || customTenant.storeId;
      const shouldUseUltimate = Boolean(subPathF) || (customTenant.hasModularFunnel === false && customTenant.useUltimateFunnel === true);

      if (shouldUseUltimate) {
        return (
          <React.Suspense fallback={<LazyModuleFallback label={`Connexion à l'Ultimate Funnel ${customTenant.storeName || targetSlug}...`} />}>
            <PublicDealPageView
              slug={targetSlug}
              funnelType="f"
              onBackToStore={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
            />
          </React.Suspense>
        );
      }

      return (
        <React.Suspense fallback={<LazyModuleFallback label={`Connexion au Tunnel Modulaire 12 Blocs ${customTenant.storeName || targetSlug}...`} />}>
          <PublicModularTunnelView
            slug={targetSlug}
            onBackToStore={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
          />
        </React.Suspense>
      );
    }

    // 1.4 Tenant associé à un Campus E-Learning
    if (customTenant.vendorType === 'elearning' || customTenant.type === 'campus') {
      const targetCourseId = publicClassroomId || customTenant.courseId || 'telecom-fintech-masterclass';
      return (
        <ClassroomErrorBoundary
          onBackToStore={() => { if (typeof window !== 'undefined') window.location.href = '/'; }}
          onBackToCourse={() => { if (typeof window !== 'undefined') window.location.href = '/'; }}
        >
          <React.Suspense fallback={<LazyModuleFallback label={`Accès à ${customTenant.schoolName || customTenant.storeName || 'Campus'}...`} />}>
            <VirtualCampusView
              courseId={targetCourseId}
              currentUser={currentUser}
              subscription={subscription}
              onBackToCourse={() => {}}
              onBackToStore={() => {}}
            />
          </React.Suspense>
        </ClassroomErrorBoundary>
      );
    }

    // 1.5 Tenant associé à une Boutique E-commerce Vitrine
    return (
      <React.Suspense fallback={<LoadingScreen message={`Chargement de ${customTenant.storeName || 'la Boutique'}...`} />}>
        <PublicStorefrontPage
          storeId={customTenant.storeId}
          whiteLabelConfig={customTenant.whiteLabel}
          initialProductId={publicBoutiqueParams.targetProductId}
          onBack={() => { if (typeof window !== 'undefined') window.location.href = '/'; }}
        />
      </React.Suspense>
    );
  }

  // =========================================================================
  // 2. ROUTEUR MODE DOMAINE PRINCIPAL (nanasore.com, localhost, etc.)
  // Gère instantanément les liens de base (/f/[slug]), les routes publiques et le SaaS
  // =========================================================================

  // 2.1 Nana Funnel Studio 3.0 (/t/:slug, /tunnel/:slug, /vente/:slug) -> Préfixe 't'
  if (publicModularTunnelSlug) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label={`Connexion au Tunnel Studio ${publicModularTunnelSlug}...`} />}>
        <PublicModularTunnelView
          slug={publicModularTunnelSlug}
          onBackToStore={() => {
            setPublicModularTunnelSlug(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 2.2 Ultimate Funnel Studio (/f/:slug, /funnel/:slug) -> Préfixe 'f'
  if (publicUltimateFunnelSlug) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label={`Connexion à l'Ultimate Funnel ${publicUltimateFunnelSlug}...`} />}>
        <PublicDealPageView
          slug={publicUltimateFunnelSlug}
          funnelType="f"
          onBackToStore={() => {
            setPublicUltimateFunnelSlug(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 2.3 Tunnel de Caisse Express / Commande 1-Clic (/c/:slug, /deal/:slug, /commande/:slug) -> Préfixe 'c'
  if (publicCheckoutSlug) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label={`Connexion à la Caisse Express ${publicCheckoutSlug}...`} />}>
        <PublicPhysicalFunnelView
          slug={publicCheckoutSlug}
          onBackToStore={() => {
            setPublicCheckoutSlug(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 2.4 Liens Courts & Directs instantanés génériques de secours (Priorité 1 : Funnel Modulaire 12 blocs)
  if (publicDealSlug) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label={`Connexion au Tunnel Modulaire 12 Blocs ${publicDealSlug}...`} />}>
        <PublicModularTunnelView
          slug={publicDealSlug}
          onBackToStore={() => {
            setPublicDealSlug(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 2.2 Sous-domaines dynamiques rétrocompatibles (*.nanasore.com)
  const dynamicSubdomain = extractSubdomain(
    typeof window !== 'undefined' ? window.location.hostname : (customHostname || '')
  );

  if (dynamicSubdomain) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label={`Connexion au Tunnel ${dynamicSubdomain}...`} />}>
        <PublicDealPageView
          slug={dynamicSubdomain}
          onBackToStore={() => {
            if (typeof window !== 'undefined') {
              window.location.href = 'https://nanasore.com';
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0.000001 Vue Publique Smart Checkout (/checkout/:productId ou ?checkout=...)
  if (publicCheckoutId) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Connexion au Smart Checkout..." />}>
        <SmartCheckoutPage
          productId={publicCheckoutId}
          onBack={() => {
            setPublicCheckoutId(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0.00001 Vue Publique Client : Standalone Cyber-Premium Sales Funnel (/promo/:campaignId)
  // ISOLEMENT TOTAL : ZÉRO barre de navigation (header/footer) pour éliminer toute distraction
  if (publicPromoId) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Connexion au Tunnel Sécurisé..." />}>
        <HighTechFunnelPage
          campaignId={publicPromoId}
          onEnrollSuccess={(courseId) => {
            setPublicPromoId(null);
            setPublicClassroomId(courseId);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', `/classroom/${courseId}`);
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0. Vue Publique Client : Séquestre / Suivi de projet (/p/:projectId)
  if (publicEscrowProjectId) {
    return (
      <React.Suspense fallback={<LazyModuleFallback />}>
        <PublicEscrowProjectView
          projectId={publicEscrowProjectId}
          onBackToApp={() => {
            setPublicEscrowProjectId(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // Helper universel : Assistant Sarah + NaNa Académie + Mini-Lecteur accessibles publiquement (sans authentification requise)
  const handlePublicRequestAuthFromSarah = () => {
    setIsAcademyDrawerOpen(false);
    setShowWelcomeShowcase(false);
    setIsEmailAuthScreenOpen(true);
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/register') &&
      !window.location.pathname.startsWith('/auth/')
    ) {
      window.history.pushState({ intent: 'vendor', plan: 'free' }, '', '/register?intent=vendor&plan=free');
    }
  };

  const renderGlobalAssistantAndAcademy = (viewContextOverride?: string) => (
    <>
      <NanaAcademyDrawer
        isOpen={isAcademyDrawerOpen}
        onClose={() => {
          setIsAcademyDrawerOpen(false);
          setActiveAcademyTutorialId(null);
        }}
        currentContextView={viewContextOverride || currentView}
        initialTutorialId={activeAcademyTutorialId || 'tuto-1-gmail-signup'}
        onLaunchMiniPlayer={(tuto) => {
          setActiveMiniTutorial(tuto);
        }}
        activeMiniTutorialId={activeMiniTutorial?.id}
        isAuthenticated={Boolean(currentUser)}
        onRequestAuth={handlePublicRequestAuthFromSarah}
      />

      {activeMiniTutorial && (
        <MiniVideoPlayer
          tutorial={activeMiniTutorial}
          isCompleted={completedTutorialIds.includes(activeMiniTutorial.id)}
          onClose={() => setActiveMiniTutorial(null)}
          onExpand={() => {
            setIsAcademyDrawerOpen(true);
          }}
          onToggleComplete={() => {
            toggleTutorialCompleted(activeMiniTutorial.id);
          }}
          isAuthenticated={Boolean(currentUser)}
          onRequestAuth={handlePublicRequestAuthFromSarah}
        />
      )}

      <NanasoreAssistantBubble
        currentView={viewContextOverride || currentView}
        onOpenAcademy={() => {
          setActiveAcademyTutorialId('tuto-1-gmail-signup');
          setIsAcademyDrawerOpen(true);
        }}
        onOpenAiAdvisor={() => {
          requireManagerAuth(() => setCurrentView('AI_ADVISOR'), 'Conseils IA Gemini', 'IA');
        }}
        isAuthenticated={Boolean(currentUser)}
        onRequestAuth={handlePublicRequestAuthFromSarah}
        customAvatarUrl="/assets/avatar_nanasore.jpg"
      />
    </>
  );

  // 0.00005 Vue Authentification Formateur / Enseignant (currentView === 'auth_teacher')
  if (currentView === 'auth_teacher' || currentView === 'AUTH_TEACHER') {
    return (
      <ModuleErrorBoundary moduleName="Authentification - Formateur">
        <React.Suspense fallback={<LazyModuleFallback label="Accès à l'espace authentification Formateur..." />}>
          <AuthScreen
            role="teacher"
            onBack={() => {
              setCurrentView('HOME');
              setShowWelcomeShowcase(true);
              setIsInstructorView(false);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
              }
            }}
            onSuccess={(authPayload) => {
              const chosenMode = authPayload?.sellerMode || 'creator_trainer';
              persistSellerModeLocally(chosenMode);
              if (authPayload) {
                setCurrentUser((prev: any) => prev ? {
                  ...prev,
                  name: authPayload.name || prev.name,
                  email: authPayload.email || prev.email,
                  sellerMode: chosenMode,
                  vendorType: chosenMode === 'creator_trainer' ? 'elearning' : chosenMode === 'hybrid_all' ? 'hybrid' : 'physical'
                } : {
                  id: 'inst-' + Date.now(),
                  name: authPayload.name || 'Prof. Ibrahim Konkobo',
                  email: authPayload.email,
                  role: 'GERANT',
                  sellerMode: chosenMode,
                  vendorType: chosenMode === 'creator_trainer' ? 'elearning' : chosenMode === 'hybrid_all' ? 'hybrid' : 'physical',
                  permissions: ['ALL']
                });
              }
              setIsInstructorView(false);
              setCurrentView('MASTER_HUB');
              setShowWelcomeShowcase(false);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/dashboard');
              }
            }}
          />
          {renderGlobalAssistantAndAcademy('AUTH')}
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 0.00006 Vue Authentification Commerçant (currentView === 'auth_merchant')
  if (currentView === 'auth_merchant' || currentView === 'AUTH_MERCHANT') {
    return (
      <ModuleErrorBoundary moduleName="Authentification - Commerçant">
        <React.Suspense fallback={<LazyModuleFallback label="Accès à l'espace authentification Commerçant..." />}>
        <AuthScreen
          role="merchant"
          onBack={() => {
            setCurrentView('HOME');
            setShowWelcomeShowcase(true);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
          onSuccess={(authPayload) => {
            const chosenMode = authPayload?.sellerMode || 'merchant_ecommerce';
            persistSellerModeLocally(chosenMode);
            setShowWelcomeShowcase(false);
            handleContinueDemo();
            if (authPayload) {
              setCurrentUser((prev: any) => prev ? {
                ...prev,
                name: authPayload.name || prev.name,
                email: authPayload.email || prev.email,
                sellerMode: chosenMode,
                vendorType: chosenMode === 'creator_trainer' ? 'elearning' : chosenMode === 'hybrid_all' ? 'hybrid' : 'physical'
              } : {
                id: 'merch-' + Date.now(),
                name: authPayload.name || 'Commerçant NaNa',
                email: authPayload.email,
                role: 'GERANT',
                sellerMode: chosenMode,
                vendorType: chosenMode === 'creator_trainer' ? 'elearning' : chosenMode === 'hybrid_all' ? 'hybrid' : 'physical',
                permissions: ['ALL']
              });
            }
            setIsInstructorView(false);
            setCurrentView('MASTER_HUB');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/dashboard');
            }
          }}
        />
        {renderGlobalAssistantAndAcademy('AUTH')}
      </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 0.0001 Vue Espace Formateur & Tableau de Bord (/instructor, /dashboard/academy, /dashboard/courses/create, currentView === 'COURSE_CREATE')
  if (isInstructorView || currentView === 'teacher_dashboard' || currentView === 'TEACHER_DASHBOARD' || currentView === 'COURSE_CREATE' || currentView === 'course_create' || currentView === 'INSTRUCTOR' || currentView === 'instructor') {
    return (
      <ModuleErrorBoundary moduleName="LMS - Espace Formateur">
        <React.Suspense fallback={<LazyModuleFallback label="Connexion au Tableau de Bord Formateur..." />}>
          <InstructorDashboardView
            instructorName={currentUser?.name || "Prof. Ibrahim Konkobo"}
            planName={(() => {
              const currentP = normalizePlanId(subscription || currentUser?.plan);
              if (currentP === 'pro' || currentP === 'elite') return 'Plan Pro 👑 (Cours Illimités)';
              if (currentP === 'starter') return 'Plan Starter (5 cours max)';
              return 'Plan Gratuit (1 cours max)';
            })()}
            isSuperAdmin={isSuperAdminLocally(currentUser)}
            currentUser={currentUser}
            subscription={subscription}
            initialTab={currentView === 'COURSE_CREATE' || currentView === 'course_create' ? 'COURSE_CREATE' : 'DASHBOARD'}
            onBack={() => {
              setIsInstructorView(false);
              if (currentUser) {
                setCurrentView('MASTER_HUB');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/dashboard');
                }
              } else {
                setCurrentView('HOME');
                setShowWelcomeShowcase(true);
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/');
                }
              }
            }}
            onNavigateModule={(moduleKey) => {
              if (moduleKey === 'COURSE_CREATE' || moduleKey === 'course_create' || moduleKey === 'CREATE_COURSE') {
                setIsInstructorView(true);
                setCurrentView('COURSE_CREATE');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/dashboard/courses/create');
                }
              } else if (moduleKey === 'marketplace_campus' || moduleKey === 'CAMPUS_VIRTUEL' || moduleKey === 'CAMPUS' || moduleKey === 'VIRTUAL_CAMPUS') {
                setIsInstructorView(false);
                setCurrentView('CAMPUS');
                setPublicClassroomId('telecom-fintech-masterclass');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/classroom');
                }
              } else if (moduleKey === 'VITRINE_PUBLIQUE_NANA' || moduleKey === 'CATALOG' || moduleKey === 'COURSES') {
                setIsInstructorView(false);
                setCurrentView('CATALOG');
                setIsCatalogView(true);
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/catalog');
                }
              } else if (moduleKey === 'INTEGRATIONS' || moduleKey === 'SETTINGS_EXTENSIONS' || moduleKey === 'CRM') {
                setIsInstructorView(false);
                setCurrentView('CRM');
                setIsCrmDashboardView(true);
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/crm');
                }
              } else if (moduleKey === 'AI_STUDIO') {
                setIsInstructorView(false);
                setCurrentView('AI_STUDIO');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/ai-studio');
                }
              } else if (moduleKey === 'CV_PRO' || moduleKey === 'CV_CREATOR') {
                setIsInstructorView(false);
                setCurrentView('CV_CREATOR');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/cv-creator');
                }
              } else if (moduleKey === 'DOCUSIGN_HUB' || moduleKey === 'DEVIS_PROJETS' || moduleKey === 'QUOTES_PROJECTS') {
                setIsInstructorView(false);
                setCurrentView('QUOTES_PROJECTS');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/quotes');
                }
              } else {
                setIsInstructorView(false);
                setCurrentView(moduleKey as any);
              }
            }}
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 0.0009 Vue Publique & Admin : Tableau de Bord CRM & Intégrations Silicon Valley (/crm-dashboard, /crm)
  if (isCrmDashboardView || currentView === 'CRM_DASHBOARD' || currentView === 'CRM') {
    return (
      <ModuleErrorBoundary moduleName="CRM - Relations Clients & Intégrations">
        <React.Suspense fallback={<LazyModuleFallback label="Accès au CRM & Intégrations Silicon Valley..." />}>
          <CRMDashboard
            onBackToPOS={() => {
              setIsCrmDashboardView(false);
              setCurrentView('MASTER_HUB');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/dashboard');
              }
            }}
            onClose={() => {
              setIsCrmDashboardView(false);
              setCurrentView('MASTER_HUB');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/dashboard');
              }
            }}
            currentUser={currentUser}
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 0.00092 Vue Connexion Caissier POS (/pos/connect)
  if (currentView === 'POS_CONNECT' || currentView === 'pos_connect') {
    return (
      <ModuleErrorBoundary moduleName="POS - Espace Caissier">
        <React.Suspense fallback={<LazyModuleFallback label="Chargement de l'Espace Caissier..." />}>
          <CashierConnectPage
            onSuccess={(_tid, _cid) => {
              setCurrentView('POS');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/pos/terminal');
              }
            }}
            onBackToHome={() => {
              setCurrentView('MASTER_HUB');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 0.00095 Vue Tableau de Bord Étudiant Élite (/campus-etudiant, /student-dashboard, /etudiant, /student, /campus)
  if (isStudentDashboardView || currentView === 'STUDENT_DASHBOARD' || currentView === 'student_dashboard') {
    return (
      <ModuleErrorBoundary moduleName="LMS - Tableau de Bord Étudiant">
        <React.Suspense fallback={<LazyModuleFallback label="Chargement du Campus Privé Étudiant..." />}>
          <StudentDashboardPage
            onOpenClassroom={(courseId) => {
              setPublicClassroomId(courseId);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', `/classroom/${courseId}`);
              }
            }}
            onOpenCertificate={(certId) => {
              setIsCertificateView(true);
              if (typeof window !== 'undefined') {
                const url = certId ? `/certificat?cert=${encodeURIComponent(certId)}` : '/certificat';
                window.history.pushState({}, '', url);
              }
            }}
            onOpenMarketplace={() => {
              setIsStudentDashboardView(false);
              setIsCatalogView(true);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/catalog');
              }
            }}
            onBackToApp={() => {
              setIsStudentDashboardView(false);
              setCurrentView('MASTER_HUB');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
              }
            }}
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 0.001 Vue Publique Client : Campus Virtuel LMS (/classroom/:classroomId ou ?classroom=...)

  if (publicClassroomId) {
    return (
      <ClassroomErrorBoundary
        onBackToStore={() => {
          setPublicClassroomId(null);
          setIsInstructorView(true);
          setCurrentView('INSTRUCTOR');
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/instructor');
          }
        }}
        onBackToCourse={() => {
          const cId = publicClassroomId;
          setPublicCourseId(cId);
          setPublicClassroomId(null);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', `/course/${cId}`);
          }
        }}
      >
        <React.Suspense fallback={<LazyModuleFallback label="Accès au Campus Virtuel..." />}>
          <VirtualCampusView
            courseId={publicClassroomId}
            currentUser={currentUser}
            subscription={subscription}
            onBackToCourse={() => {
              const cId = publicClassroomId;
              setPublicCourseId(cId);
              setPublicClassroomId(null);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', `/course/${cId}`);
              }
            }}
            onBackToStore={() => {
              setPublicClassroomId(null);
              setIsInstructorView(true);
              setCurrentView('INSTRUCTOR');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/instructor');
              }
            }}
          />
        </React.Suspense>
      </ClassroomErrorBoundary>
    );
  }


  // 0.0012 Vue Publique Client : Arène Vocale IA NaNa (/arena, /simulation ou ?arena=...)
  if (publicArenaId) {
    const defaultArenaScenario: VoiceSimulationScenarioConfig = {
      persona: 'Client Mécontent en Boutique Télécom & Mobile Money',
      objective: 'Calmer le client, analyser son problème de transfert et réussir un up-sell d\'une recharge sécurisée.',
      systemPrompt: 'Tu es un client mécontent mais ouvert aux explications rationnelles et polies.',
      maxDurationMinutes: 3,
      passingScore: 70
    };

    return (
      <React.Suspense fallback={<LoadingScreen message="Connexion à l'Arène Vocale IA NaNa..." />}>
        <VoiceSimulationArena
          scenario={defaultArenaScenario}
          studentId={currentUser?.uid || 'guest-learner'}
          courseId={publicArenaId !== 'default-scenario' ? publicArenaId : 'master-telecom-1'}
          lessonId="voice-eval-lesson-1"
          onFinish={() => {
            setPublicArenaId(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
          onClose={() => {
            setPublicArenaId(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0.0014 Vue Dédiée Certificat Officiel & Vérification QR Code (/certificat, /certificate, /diplome)
  if (isCertificateView || currentView === 'CERTIFICATE') {
    return (
      <ModuleErrorBoundary moduleName="LMS - Certificat Officiel & QR Code">
        <React.Suspense fallback={<LazyModuleFallback label="Chargement du Certificat Officiel..." />}>
          <CertificatePage
            onBack={() => {
              setIsCertificateView(false);
              if (currentView === 'CERTIFICATE') {
                setCurrentView('MASTER_HUB');
              }
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 0.0015 Vue Publique Marketplace LMS (/catalog, /courses ou ?catalog=true)
  if (isCatalogView && !publicCourseId) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Connexion au Marketplace LMS..." />}>
        <MarketplaceDiscoveryHub
          onSelectCourse={(id) => {
            setPublicCourseId(id);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', `/catalog/course/${id}`);
            }
          }}
          onNavigateToClassroom={(id) => {
            setPublicClassroomId(id);
            setIsCatalogView(false);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', `/classroom/${id}`);
            }
          }}
          onBackToApp={() => {
            setIsCatalogView(false);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0.002 Vue Publique Client : Fiche Haute-Conversion Cours LMS (/catalog/course/:id ou /course/:id)
  if (publicCourseId) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Chargement de la Masterclass..." />}>
        <CourseDetailPage
          course={getMarketplaceCourseById(publicCourseId)}
          onNavigateToClassroom={(id) => {
            setPublicClassroomId(id);
            setPublicCourseId(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', `/classroom/${id}`);
            }
          }}
          onBackToDiscovery={() => {
            setPublicCourseId(null);
            setIsCatalogView(true);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/catalog');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0.00 Vue Publique Client : Page de Retour après Paiement Sebpay Hosted Checkout (/checkout/return)
  if (isCheckoutReturn) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Vérification de votre paiement Sebpay..." />}>
        <CheckoutReturnView
          onBackToStore={() => {
            setIsCheckoutReturn(false);
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0.0 Vue Publique Client : Live Shopping, Webinaire & Coaching 1-to-1 (/live/:sessionSlug ou ?live=...)
  if (publicWebinarId) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Connexion au Live Studio Nanasore..." />}>
        <PublicLiveSessionPage
          sessionSlug={publicWebinarId}
          onBackToStore={() => {
            setPublicWebinarId(null);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0.05 Vue Publique : Présentation du Programme Partenaire / Affiliation (/partenaires ou ?view=partenaires)
  if ((currentView === 'PARTNERS' || currentView === 'partners') && !currentUser) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Chargement du Programme Partenaire..." />}>
        <PartnerProgramLandingView
          onBack={() => {
            setCurrentView('HOME');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
          onRegisterPartner={() => {
            if (typeof window !== 'undefined') {
              window.history.pushState({ intent: 'partner' }, '', '/register?intent=partner');
            }
            setIsEmailAuthScreenOpen(true);
          }}
          onOpenLogin={() => {
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/login');
            }
            setIsEmailAuthScreenOpen(true);
          }}
          onOpenInternalPartner={() => {
            setCurrentView('PARTNER');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/partenaire');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0.051 Espace Interne Partenaire Accessible Directement sans blocage (Mode Découverte Partenaire)
  if ((currentView === 'PARTNER' || currentView === 'partner' || currentView === 'AFFILIATE' || currentView === 'affiliate') && !currentUser) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Chargement Espace Partenaire..." />}>
        <div className="relative min-h-screen bg-slate-950 pb-20 text-slate-100 font-sans">
          <div className="max-w-6xl mx-auto p-3 sm:p-6">
            <button
              type="button"
              onClick={() => {
                setCurrentView('HOME');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/');
                }
              }}
              className="mb-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              <span>← Retour à l'accueil</span>
            </button>
            <AffiliateDashboardModal
              isOpen={true}
              isModal={false}
              currentUser={currentUser}
              onClose={() => {
                setCurrentView('HOME');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/');
                }
              }}
            />
          </div>
        </div>
      </React.Suspense>
    );
  }

  // 0.052 Studio IA Accessible Directement en Plein Écran (Mode Découverte Studio)
  if ((currentView === 'AI_STUDIO' || currentView === 'ai_studio') && !currentUser) {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Chargement de Nana-générateur..." />}>
        <div className="w-full h-screen h-[100dvh] bg-[#070b14] flex flex-col overflow-hidden select-none">
          <NanaGeneratorModal
            isOpen={true}
            isModal={false}
            onClose={() => {
              setCurrentView('HOME');
              setShowWelcomeShowcase(true);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
              }
            }}
            storeName="Nana Studio Démo"
            currentUser={null}
          />
        </div>
      </React.Suspense>
    );
  }

  // 0.053 NaNa Market : Annuaire B2B2C des Boutiques (/market, /directory, /annuaire)
  if (currentView === 'MARKET_DIRECTORY' || currentView === 'market_directory') {
    return (
      <React.Suspense fallback={<LazyModuleFallback label="Chargement de NaNa Market..." />}>
        <MarketDirectory
          onNavigateHome={() => {
            if (currentUser) {
              setCurrentView('MASTER_HUB');
            } else {
              setCurrentView('HOME');
              setShowWelcomeShowcase(true);
            }
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
            }
          }}
          onOpenStore={(storeId) => {
            if (storeId.includes('masterclass') || storeId.includes('course') || storeId.includes('academy')) {
              setPublicClassroomId(storeId);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', `/classroom/${storeId}`);
              }
              return;
            }
            if (storeId.includes('live') || storeId.includes('webinar') || storeId.includes('sommet')) {
              setPublicWebinarId(storeId);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', `/live/${storeId}`);
              }
              return;
            }
            setPublicBoutiqueParams({
              isBoutique: true,
              targetStoreId: storeId,
              targetProductId: null,
            });
            setCurrentView('DASHBOARD');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', `/shop/${storeId}`);
            }
          }}
        />
      </React.Suspense>
    );
  }

  // 0.1 Vue Publique Client : Vitrine Boutique & Fiche Produit Partagée (/s/[slug], /shop/[id], ?store=id, etc.)
  if (
    publicBoutiqueParams.isBoutique &&
    currentView !== 'NANA_SWITCH_APP' &&
    currentView !== 'nana_switch_app' &&
    currentView !== 'NANA_SWITCH' &&
    currentView !== 'nana_switch' &&
    currentView !== 'NANA_SWITCH_DOCS' &&
    currentView !== 'nana_switch_docs' &&
    (!currentUser || publicBoutiqueParams.isBoutique)
  ) {
    return (
      <React.Suspense fallback={<StorefrontNeutralLoader label="Chargement de la vitrine officielle..." />}>
        <PublicStorefrontPage
          storeId={publicBoutiqueParams.targetStoreId}
          initialProductId={publicBoutiqueParams.targetProductId}
          onBack={() => {
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/dashboard');
            }
            setPublicBoutiqueParams({ isBoutique: false, targetStoreId: null, targetProductId: null });
            setCurrentView('MASTER_HUB');
          }}
        />
      </React.Suspense>
    );
  }

  // Back-Office Super-Admin : Constructeur Central Hub (/admin/hub-builder)
  if (currentView === 'HUB_BUILDER' || currentView === 'hub_builder') {
    const isSuperAdmin = isSuperAdminLocally(currentUser);
    if (!isSuperAdmin) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 shadow-xl shadow-rose-950/40">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Accès Restreint Super-Admin</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            La page du Constructeur de Blocs Central Hub (<code className="text-cyan-400">/admin/hub-builder</code>) est strictement réservée aux administrateurs de la plateforme Nanasore.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
              setCurrentView('MASTER_HUB');
            }}
            className="px-5 py-2.5 bg-[#4169E1] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#4169E1]/30 transition active:scale-95 cursor-pointer"
          >
            ← Retour au Tableau de Bord
          </button>
        </div>
      );
    }

    return (
      <ModuleErrorBoundary moduleName="Administration - Constructeur Hub Central">
        <React.Suspense fallback={<LazyModuleFallback label="Chargement du Constructeur Hub Central..." />}>
          <HubBuilderPage />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // Super-Admin & Fondateur du SaaS Control Plane (Protégé par SuperAdminGuard)
  if (currentView === 'SAAS_ADMIN' || currentView === 'SUPERADMIN') {
    return (
      <ModuleErrorBoundary moduleName="Administration - Control Plane Super Admin">
        <React.Suspense fallback={<LazyModuleFallback label="Chargement Control Plane Super Admin..." />}>
          <ControlPlaneRouter
            onExitToMerchant={() => setCurrentView('MASTER_HUB')}
            currentUser={currentUser}
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }


  // 1b-docs. Documentation Développeur Publique Autonome (/docs, /documentation, /nana-switch/docs)
  // 100% PUBLIC - ZÉRO AUTHENTIFICATION REQUISE - ACCÈS LIBRE
  if (
    currentView === 'NANA_SWITCH_DOCS' ||
    currentView === 'nana_switch_docs'
  ) {
    return (
      <ModuleErrorBoundary moduleName="Documentation Publique - NanaSwitch Cloud">
        <React.Suspense fallback={<LoadingScreen message="Ouverture de la Documentation NanaSwitch..." />}>
          <NaNaSwitchDocsPage />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 1c. NaNaSwitch Cloud : Landing Page Publique (/nana-switch)
  if (
    currentView === 'NANA_SWITCH' ||
    currentView === 'nana_switch'
  ) {
    return (
      <ModuleErrorBoundary moduleName="NaNaSwitch Cloud - Landing Page">
        <React.Suspense fallback={<LoadingScreen message="Chargement NaNaSwitch Cloud..." />}>
          <NaNaSwitchLandingPage 
            onNavigate={(path) => {
              if (path === '/dashboard' || (path.startsWith('/dashboard') && path !== '/dashboard/nanaswitch')) {
                setCurrentView('MASTER_HUB');
                window.history.pushState({}, '', path);
              } else if (
                path.startsWith('/nana-switch') ||
                path.startsWith('/nanaswitch') ||
                path.startsWith('/app/nanaswitch') ||
                path.startsWith('/dashboard/nanaswitch')
              ) {
                setCurrentView('NANA_SWITCH_APP');
                window.history.pushState({}, '', path);
              } else {
                window.location.href = path;
              }
            }}
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 1cc. NaNaSwitch Partenaires B2B App : Application modulaire & multi-tenant B2B (/nana-switch/apps, /nana-switch/merchant, /app/nanaswitch, /dashboard/nanaswitch, /nana-switch-app)
  if (
    currentView === 'NANA_SWITCH_APP' ||
    currentView === 'nana_switch_app'
  ) {
    const swPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const swParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

    // Console Spécifique Développeurs (BYOK, Connecteurs, Routing direct)
    const isDevConsole =
      swPath === '/nana-switch/connectors' ||
      swPath === '/nana-switch/byok' ||
      swPath === '/nana-switch/keys' ||
      swPath === '/nana-switch/routing' ||
      swPath === '/nana-switch/extension' ||
      swPath === '/nana-switch/pocket' ||
      swPath === '/nana-switch/security' ||
      swParams.get('tab') === 'console' ||
      swParams.get('view') === 'console';

    if (isDevConsole) {
      return (
        <ModuleErrorBoundary moduleName="NaNaSwitch - AppPage Console">
          <React.Suspense fallback={<LoadingScreen message="Connexion à NaNaSwitch Console..." />}>
            <NaNaSwitchAppPage />
          </React.Suspense>
        </ModuleErrorBoundary>
      );
    }

    // Affiche le Tableau de bord marchand NanaSwitchApp (cloné et unifié sur /dashboard)
    return (
      <ModuleErrorBoundary moduleName="NaNaSwitch - Application Partenaire">
        <React.Suspense fallback={<LoadingScreen message="Connexion à NanaSwitch App..." />}>
          <NanaSwitchApp onBack={() => { setCurrentView('MASTER_HUB'); window.history.pushState({}, '', '/hub'); }} />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 1cc-wallet. nanawallet : Écran d'Accueil & Dashboard Portefeuille Mobile Hybride (/wallet, /nanawallet)
  if (
    currentView === 'WALLET' ||
    currentView === 'wallet' ||
    currentView === 'NANA_WALLET' ||
    currentView === 'nanawallet'
  ) {
    return (
      <ModuleErrorBoundary moduleName="nanawallet - Portefeuille Mobile">
        <React.Suspense fallback={<LoadingScreen message="Chargement de nanawallet..." />}>
          <NanaWalletHome 
            onBackToHub={() => {
              setCurrentView('MASTER_HUB');
              window.history.pushState({}, '', '/');
            }}
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 1d. Wameet ("Wa" = Viens en Mooré + "Meet" = Se retrouver) : Supra-App Mobile Sociale, Créative & Commerciale (/wameet)
  if (
    currentView === 'WAMEET' ||
    currentView === 'wameet'
  ) {
    // Si l'URL contient un identifiant de salon (/wameet/:id)
    if (
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/wameet/') &&
      window.location.pathname.replace('/wameet/', '').trim().length > 0
    ) {
      const pathParts = window.location.pathname.split('/');
      const wameetId = pathParts[2] || 'wameet-salon-prive';
      const searchParams = new URLSearchParams(window.location.search);
      const creatorName = searchParams.get('creator') || 'Ibrahim Pousbila';
      const reason = searchParams.get('reason') || 'Discussion & Synergie Business';
      const time = searchParams.get('time') || '18:30 GMT';

      return (
        <ModuleErrorBoundary moduleName="Wameet - Salon Vidéo Privé">
          <React.Suspense fallback={<LoadingScreen message="Connexion au Salon Wameet..." />}>
            <WameetRoomView
              wameetId={wameetId}
              creatorName={creatorName}
              reason={reason}
              time={time}
              onBack={() => {
                window.history.pushState({}, '', '/wameet');
                window.location.reload();
              }}
            />
          </React.Suspense>
        </ModuleErrorBoundary>
      );
    }

    return (
      <ModuleErrorBoundary moduleName="Wameet - Réseau Social & Live">
        <React.Suspense fallback={<LoadingScreen message="Ouverture de Wameet Supra-App..." />}>
          <WameetSupraApp
            currentUser={currentUser}
            onOpenPrivateCampus={() => {
              setPublicClassroomId('telecom-fintech-masterclass');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/classroom/telecom-fintech-masterclass');
              }
            }}
            onBackToDashboard={() => {
              setCurrentView('MASTER_HUB');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/dashboard');
              }
            }}
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 1e. Salles VIP E-learning Multi-Salles (Routes: /salles-vip, /vip, /salles-vip/:id, /vip/salle/:id)
  if (
    currentView === 'SALLES_VIP' ||
    currentView === 'salles_vip' ||
    currentView === 'SALLE_VIP' ||
    currentView === 'salle_vip' ||
    currentView === 'VIP' ||
    currentView === 'vip'
  ) {
    return (
      <ModuleErrorBoundary moduleName="Masterclass - Salles VIP & E-learning">
        <React.Suspense fallback={<LoadingScreen message="Ouverture des Salles VIP E-learning..." />}>
          {selectedVipRoomId ? (
            <SalleVipRoomView
              roomId={selectedVipRoomId}
              currentUser={currentUser}
              onBackToDiscovery={() => {
                setSelectedVipRoomId(null);
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/salles-vip');
                }
              }}
            />
          ) : (
            <SallesVipDiscoveryScreen
              currentUser={currentUser}
              onSelectRoom={(rId) => {
                setSelectedVipRoomId(rId);
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', `/salles-vip/${rId}`);
                }
              }}
              onBackToHome={() => {
                if (currentUser) {
                  setCurrentView('MASTER_HUB');
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/dashboard');
                  }
                } else {
                  setCurrentView('LANDING');
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/');
                  }
                }
              }}
            />
          )}
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  // 1. Landing Page Showcase d'accueil immersive (si visiteur déconnecté, vue HOME/LANDING ou showWelcomeShowcase)
  // STRICTEMENT INTERDIT SUR DOMAINE PERSONNALISÉ (Isolé en Marque Blanche)
  if (!isCustomDomain && (currentView === 'HOME' || currentView === 'home' || currentView === 'LANDING' || currentView === 'landing' || (!currentUser && showWelcomeShowcase && !isAuthScreenExplicitlyBypassed && !isEmailAuthScreenOpen))) {
    return (
      <React.Suspense fallback={<LoadingScreen message="Chargement de l'accueil Nanasore..." />}>
        <WelcomeShowcaseScreen
          onExplore={handleContinueDemo}
          onOpenPinPad={() => setIsPinModalOpenFromLanding(true)}
          onOpenEmailAuth={() => {
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
              window.history.pushState(null, '', '/login');
            }
            setIsEmailAuthScreenOpen(true);
          }}
          onOpenSecretAdmin={() => setIsSecretAdminModalOpen(true)}
          onOpenInstructor={() => {
            setIsInstructorView(false);
            setCurrentView('auth_teacher');
            setShowWelcomeShowcase(false);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/auth/teacher');
            }
          }}
          onCheckout={(planId) => {
            if (planId === 'free') {
              if (typeof window !== 'undefined') {
                window.history.pushState({ intent: 'vendor', plan: 'free' }, '', '/register?intent=vendor&plan=free');
              }
              setIsEmailAuthScreenOpen(true);
              return;
            }
            // Accès direct et immédiat à la Caisse de Paiement Smart Checkout
            setPublicCheckoutId('nanasore_elite_20_pays');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/checkout');
            }
          }}
          onOpenPartnerProgram={() => {
            setShowWelcomeShowcase(false);
            setCurrentView('PARTNER');
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/partenaire');
            }
          }}
        />
        {/* Modal de saisie PIN déclenché de manière fluide depuis la Landing Page */}
        <PinKeypadModal
          isOpen={isPinModalOpenFromLanding}
          expectedPin="1234"
          userName="Espace Commerçant"
          storeName="Nanasore Pro"
          reason="LOCK"
          onSuccess={() => {
            setIsPinModalOpenFromLanding(false);
            setShowWelcomeShowcase(false);
            handleContinueDemo();
            setLastSaleToast('🔓 Espace Commerçant déverrouillé avec succès !');
            setTimeout(() => setLastSaleToast(null), 3500);
          }}
          onMaxAttemptsReached={() => setIsPinModalOpenFromLanding(false)}
          onManualLogout={() => {
            setIsPinModalOpenFromLanding(false);
            setIsEmailAuthScreenOpen(true);
          }}
          onForgotPassword={() => {
            setIsPinModalOpenFromLanding(false);
            setIsEmailAuthScreenOpen(true);
          }}
        />
        <SecretAdminAccessModal
          isOpen={isSecretAdminModalOpen}
          onClose={() => setIsSecretAdminModalOpen(false)}
          onSuccess={() => {
            setIsSecretAdminModalOpen(false);
            setCurrentView('SAAS_ADMIN');
          }}
        />
        {renderGlobalAssistantAndAcademy('HOME')}
      </React.Suspense>
    );
  }

  // 2. Écran de Connexion / Inscription Firebase Auth
  if (!currentUser && !isAuthScreenExplicitlyBypassed) {
    return (
      <React.Suspense fallback={<LoadingScreen message="Connexion à l'authentification..." />}>
        <WelcomeAuthScreen
          onLoginSuccess={handleLoginSuccess}
          onContinueDemo={handleContinueDemo}
          onOpenSaasAdmin={() => setCurrentView('SAAS_ADMIN')}
          onOpenSecretAdminModal={() => setIsSecretAdminModalOpen(true)}
          initialPlan={selectedCheckoutPlanId}
          onBack={() => {
            setIsEmailAuthScreenOpen(false);
            setShowWelcomeShowcase(true);
          }}
        />
        <SecretAdminAccessModal
          isOpen={isSecretAdminModalOpen}
          onClose={() => setIsSecretAdminModalOpen(false)}
          onSuccess={() => {
            setIsSecretAdminModalOpen(false);
            setCurrentView('SAAS_ADMIN');
          }}
        />
        {renderGlobalAssistantAndAcademy('AUTH')}
      </React.Suspense>
    );
  }

  // Paramètres & Modules Extensions (WooCommerce & Passerelle SMS)
  if (currentView === 'SETTINGS_EXTENSIONS') {
    return (
      <ModuleErrorBoundary moduleName="Paramètres - Extensions & Intégrations">
        <React.Suspense fallback={<LazyModuleFallback label="Chargement Paramètres & Extensions..." />}>
          <SettingsExtensionsView
            onBackToPOS={() => setCurrentView('MASTER_HUB')}
            inventory={inventory}
            customers={customers}
            currentUser={currentUser}
            onOpenSaasAdmin={() => setCurrentView('SUPERADMIN')}
          />
          <NanasoreAssistantBubble
            currentView={currentView}
            onOpenAcademy={() => setIsAcademyDrawerOpen(true)}
            onOpenAiAdvisor={() => {
              requireManagerAuth(() => setCurrentView('AI_ADVISOR'), 'Conseils IA Gemini', 'IA');
            }}
            customAvatarUrl="/assets/avatar_nanasore.jpg"
          />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }



  // Écran d'attente d'agrément / validation Super-Admin si boutique en PENDING (Bypass immédiat pour Super-Admin)
  if (storeApprovalStatus === 'PENDING' && !isSuperAdminLocally(currentUser)) {
    return (
      <React.Suspense fallback={<LoadingScreen message="Vérification du statut de la boutique..." />}>
        <StorePendingApprovalScreen
          currentUser={currentUser}
          storeName={currentUser?.storeName || 'Votre Boutique'}
          storeId={getCurrentStoreId()}
          onRefreshStatus={async () => {
            setStoreApprovalStatus('APPROVED');
            setLastSaleToast('✓ Statut de la boutique validé !');
          }}
          onBypassForDemo={() => {
            setStoreApprovalStatus('APPROVED');
            setLastSaleToast('Accès démo activé');
          }}
        />
      </React.Suspense>
    );
  }

  return (
    <AuthProvider user={currentUser} subscription={subscription}>
      <div className="h-screen h-[100dvh] w-full bg-[#070b14] text-slate-100 flex flex-col p-0 font-sans overflow-hidden">
      {/* Root POS App Container: full-width SaaS layout on desktop/tablets, smartphone layout on mobile */}
      <main 
        id="app-main-scroll-zone"
        className="flex-1 w-full min-h-0 flex flex-col relative overflow-y-auto overflow-x-hidden" 
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* Floating Notification / Toast avec bouton d'impression rapide */}
        {lastSaleToast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-xl shadow-emerald-950/50 flex items-center gap-2 border border-emerald-400/40 animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate max-w-[200px]">{lastSaleToast}</span>
            {activeReceiptData && (
              <button
                id="btn-toast-quick-print"
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsReceiptModalOpen(true);
                }}
                className="ml-1 px-2 py-0.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-400/40 font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Imprimer ou voir le ticket"
              >
                <Printer className="w-3 h-3" />
                <span>Ticket</span>
              </button>
            )}
          </div>
        )}

        {/* Bandeau d'alerte en direct pour nouvelle commande boutique */}
        <LiveOrderNotificationBanner
          order={liveAppIncomingOrder}
          onDismiss={() => setLiveAppIncomingOrder(null)}
          onViewOrder={() => {
            setCurrentView('CUSTOMER_ORDERS');
          }}
        />

        {/* Main Views Container */}
        <div className="flex-1 w-full min-h-0 flex flex-col">
          {currentView === 'POS' && (
            /* Main POS Screen (Caisse Ultra-Rapide Adaptative Mobile / Desktop) */
            <ModuleErrorBoundary moduleName="POS - Encaissement & Ventes">
              <div className="w-full flex-col flex flex-1 h-full min-h-0 relative">
              {/* Overlay Verrouillage si la Boutique est Fermée */}
              {!isStoreOpen && (
                <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 shadow-xl shadow-amber-500/10">
                    <Lock className="w-8 h-8 text-amber-400" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
                    Boutique Fermée
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-2">
                    La Caisse POS est Verrouillée
                  </h3>
                  <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
                    La boutique est actuellement configurée comme <strong>Fermée</strong> dans les paramètres. Les encaissements et opérations de vente sont temporairement bloqués. Réouvrez la boutique pour réactiver la caisse immédiatement.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                    <button
                      type="button"
                      onClick={reopenStore}
                      className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                      Réouvrir la Boutique & Caisse
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentView('MASTER_HUB')}
                      className="w-full py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all cursor-pointer"
                    >
                      Retour au Hub Master
                    </button>
                  </div>
                </div>
              )}
              {/* --- MODE MOBILE (< md) : Pile verticale fluide smartphone --- */}
              <div className="flex md:hidden flex-col w-full h-full overflow-y-auto overflow-x-hidden pb-20" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                {/* Zone du Haut : Ticket en temps réel, Total en TRES GROS caractères, Bouton Paiement Cash + Raccourcis 1-Clic sous le ticket */}
                <div className="shrink-0 flex flex-col border-b border-blue-900/30 relative z-30 w-full max-w-full">
                  <HeaderReceipt
                    onBackToHome={handleBackToHome}
                    onQuickCashCheckout={handleQuickCashCheckout}
                    cart={cart}
                    total={total}
                    itemCount={itemCount}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onOpenCashPayment={() => setIsCashModalOpen(true)}
                    onOpenDebtBook={() => setCurrentView('DEBT_BOOK')}
                    onOpenCustomerOrders={() => setCurrentView('CUSTOMER_ORDERS')}
                    onOpenAcademy={() => setIsAcademyDrawerOpen(true)}
                    pendingOrdersCount={pendingOrdersCount}
                    onOpenDocuSign={() => handleOpenDocuSign('Document Commercial')}
                    onOpenQuotesProjects={() => setCurrentView('QUOTES_PROJECTS')}
                    onOpenCvCreator={() => setCurrentView('CV_CREATOR')}
                    onOpenReports={() => setCurrentView('MASTER_HUB')}
                    onOpenCompta={() => requireManagerAuth(() => setCurrentView('REPORTS'), 'Comptabilité & Rapports', 'Compta')}
                    onOpenInventory={() => setCurrentView('INVENTORY')}
                    onOpenVoiceTest={() => setCurrentView('VOICE_TEST')}
                    onOpenAiAdvisor={() => setCurrentView('AI_ADVISOR')}
                    onOpenMarketingAI={() => handleOpenMarketingAi()}
                    onOpenLegalAi={() => setIsGlobalLegalAiOpen(true)}
                    onOpenAdmin={() => setIsAdminModalOpen(true)}
                    onOpenSaasAdmin={() => {
                      setCurrentView('SAAS_ADMIN');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/admin');
                      }
                    }}
                    onOpenSecretAdminModal={() => setIsSecretAdminModalOpen(true)}
                    onOpenSettings={() => setCurrentView('SETTINGS_EXTENSIONS')}
                    onOpenPrintReceipt={handleOpenPrintReceiptFromCart}
                    onDownloadPdfReceipt={handleDownloadPdfReceiptFromCart}
                    onOpenPaywall={() => setIsPaywallModalOpen(true)}
                    onOpenAffiliation={() => setIsAffiliateModalOpen(true)}
                    subscription={subscription}
                    currentUser={currentUser}
                    debtCustomerCount={customers.filter((c) => c.totalDebt > 0).length}
                    totalDebtAmount={totalDebtAmount}
                    activeSeller={activeSeller}
                    onOpenSellerSwitch={() => setIsSellerSwitchModalOpen(true)}
                    onLockManual={handleManualLock}
                    hideTicketOnDesktop={false}
                    isCashierMode={isCashierMode}
                    onRequireManagerAuth={requireManagerAuth}
                  />
                  {/* Raccourcis 1-Clic lors d'une vente : rangée horizontale avec 4 clients réguliers (Mamadou, Fatou, Ibrahim, Oumar) */}
                  <QuickCustomerDebtRow
                    customers={customers}
                    cartTotal={total}
                    cartItemCount={itemCount}
                    onQuickAssignDebt={handleQuickAssignToCustomer}
                  />

                  {/* Barre de Recherche Instantanée & Bouton Scanner Selfie / Caméra */}
                  <PosSearchBar
                    inventory={inventory}
                    onSelectProduct={handleSelectInventoryProduct}
                    onOpenSelfieScanner={() => setIsPosCameraScannerOpen(true)}
                    isSelfieScannerOpen={isPosCameraScannerOpen}
                  />

                  {/* Mini-Bandeau Proactif Conseils & Alertes directes en 1-clic */}
                  <div
                    id="banner-ai-smart-alert"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      playTapBeep();
                      requireManagerAuth(() => setCurrentView('AI_ADVISOR'), 'Conseils Vendeur', 'Conseils');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        playTapBeep();
                        requireManagerAuth(() => setCurrentView('AI_ADVISOR'), 'Conseils Vendeur', 'Conseils');
                      }
                    }}
                    className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 hover:from-indigo-900 hover:to-indigo-900/90 border-t border-indigo-500/30 px-3 py-1 flex items-center justify-between text-[11px] text-indigo-200 cursor-pointer active:scale-[0.99] transition-all"
                    title="Ouvrir les conseils et alertes de stock"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Bot className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span className="font-extrabold text-amber-300 shrink-0">Conseils & Alertes :</span>
                      <span className="truncate text-slate-300">
                        Rupture Sucre dans 2j • Mamadou plafond dépassé (+15k F)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-900/80 px-1.5 py-0.5 rounded shrink-0 border border-indigo-400/30 flex items-center gap-0.5">
                      Conseils &gt;
                      {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-300 shrink-0" />}
                    </span>
                  </div>
                </div>

                {/* Coupures & Montants Rapides (1-clic direct) */}
                <div className="shrink-0 bg-slate-900/50 border-b border-slate-800/60">
                  <FastSaleGrid
                    onSelectPresetAmount={handleSelectPresetAmount}
                  />
                </div>

                {/* Zone Principale Aérée & Commandes du Bas Remontées (Micro Géant Push-to-Talk, Crédit Client, Annuler) */}
                <div className="flex-1 min-h-0 flex flex-col justify-end">
                  <BottomControls
                    onAddVoiceItems={handleAddVoiceItems}
                    onAddRecognizedItems={handleAddToCartFromVoice}
                    inventory={inventory}
                    onOpenCreditModal={() => {
                      if (cart.length > 0) {
                        setIsCreditModalOpen(true);
                      } else {
                        requireManagerAuth(() => setCurrentView('DEBT_BOOK'), 'Cahier de Dettes', 'Dettes');
                      }
                    }}
                    onCancelCart={handleCancelCart}
                    onOpenDebtBook={() => requireManagerAuth(() => setCurrentView('DEBT_BOOK'), 'Cahier de Dettes', 'Dettes')}
                    onOpenInventory={() => requireManagerAuth(() => setCurrentView('INVENTORY'), 'Stock & Inventaire', 'Stock')}
                    onOpenVoiceTest={() => setCurrentView('VOICE_TEST')}
                    cartTotal={total}
                    cartItemCount={itemCount}
                    isCashierMode={isCashierMode}
                  />
                </div>
              </div>

              {/* --- MODE DESKTOP & TABLETTE (>= md) : SaaS Plein Écran Deux Volets (65% / 35%) --- */}
              <div className="hidden md:flex flex-col h-full overflow-hidden min-h-0">
                {/* Micro-barre supérieure SaaS : Logo NANA, profil boutiquier, Marquee continu, outils rapides */}
                <HeaderReceipt
                  onBackToHome={handleBackToHome}
                  onQuickCashCheckout={handleQuickCashCheckout}
                  cart={cart}
                  total={total}
                  itemCount={itemCount}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onOpenCashPayment={() => setIsCashModalOpen(true)}
                  onOpenDebtBook={() => setCurrentView('DEBT_BOOK')}
                  onOpenCustomerOrders={() => setCurrentView('CUSTOMER_ORDERS')}
                  onOpenAcademy={() => setIsAcademyDrawerOpen(true)}
                  pendingOrdersCount={pendingOrdersCount}
                  onOpenDocuSign={() => handleOpenDocuSign('Document Commercial')}
                  onOpenQuotesProjects={() => setCurrentView('QUOTES_PROJECTS')}
                  onOpenCvCreator={() => setCurrentView('CV_CREATOR')}
                  onOpenReports={() => setCurrentView('MASTER_HUB')}
                  onOpenCompta={() => requireManagerAuth(() => setCurrentView('REPORTS'), 'Comptabilité & Rapports', 'Compta')}
                  onOpenInventory={() => setCurrentView('INVENTORY')}
                  onOpenVoiceTest={() => setCurrentView('VOICE_TEST')}
                  onOpenAiAdvisor={() => setCurrentView('AI_ADVISOR')}
                  onOpenMarketingAI={() => handleOpenMarketingAi()}
                  onOpenLegalAi={() => setIsGlobalLegalAiOpen(true)}
                  onOpenAdmin={() => setIsAdminModalOpen(true)}
                  onOpenSaasAdmin={() => {
                    setCurrentView('SAAS_ADMIN');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/dashboard/admin');
                    }
                  }}
                  onOpenSecretAdminModal={() => setIsSecretAdminModalOpen(true)}
                  onOpenSettings={() => setCurrentView('SETTINGS_EXTENSIONS')}
                  onOpenPrintReceipt={handleOpenPrintReceiptFromCart}
                  onDownloadPdfReceipt={handleDownloadPdfReceiptFromCart}
                  onOpenAffiliation={() => {
                    setCurrentView('PARTNER');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/partenaire');
                    }
                  }}
                  subscription={subscription}
                  currentUser={currentUser}
                  debtCustomerCount={customers.filter((c) => c.totalDebt > 0).length}
                  totalDebtAmount={totalDebtAmount}
                  activeSeller={activeSeller}
                  onOpenSellerSwitch={() => setIsSellerSwitchModalOpen(true)}
                  onLockManual={handleManualLock}
                  hideTicketOnDesktop={true}
                  isCashierMode={isCashierMode}
                  onRequireManagerAuth={requireManagerAuth}
                />

                {/* Composant Caisse Desktop SaaS : Volet Gauche (65%) Catalogue & Volet Droit (35%) Ticket Sticky */}
                <div className="flex-1 min-h-0 w-full overflow-hidden">
                  <DesktopPosRegister
                    cart={cart}
                    total={total}
                    itemCount={itemCount}
                    inventory={inventory}
                    customers={customers}
                    activeSeller={activeSeller}
                    currentUser={currentUser}
                    isCashierMode={isCashierMode}
                    casierSession={currentCasierSession}
                    onOpenMarketingAi={handleOpenMarketingAi}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onCancelCart={handleCancelCart}
                    onSelectProduct={handleSelectInventoryProduct}
                    onSelectPresetAmount={handleSelectPresetAmount}
                    onQuickAssignDebt={handleQuickAssignToCustomer}
                    onOpenCashPayment={() => setIsCashModalOpen(true)}
                    onQuickCashCheckout={handleQuickCashCheckout}
                    onOpenCreditModal={() => {
                      if (cart.length > 0) {
                        setIsCreditModalOpen(true);
                      } else {
                        requireManagerAuth(() => setCurrentView('DEBT_BOOK'), 'Cahier de Dettes', 'Dettes');
                      }
                    }}
                    onOpenDebtBook={() => requireManagerAuth(() => setCurrentView('DEBT_BOOK'), 'Cahier de Dettes', 'Dettes')}
                    onOpenSelfieScanner={() => setIsPosCameraScannerOpen(true)}
                    isSelfieScannerOpen={isPosCameraScannerOpen}
                    onOpenAiAdvisor={() => requireManagerAuth(() => setCurrentView('AI_ADVISOR'), 'Conseils IA Gemini', 'IA')}
                    onOpenPrintReceipt={handleOpenPrintReceiptFromCart}
                    onDownloadPdfReceipt={handleDownloadPdfReceiptFromCart}
                    onOpenSellerSwitch={() => setIsSellerSwitchModalOpen(true)}
                    onAddVoiceItems={handleAddVoiceItems}
                    onAddRecognizedItems={handleAddToCartFromVoice}
                  />
                </div>
              </div>
            </div>
            </ModuleErrorBoundary>
          )}

          {currentView === 'DEBT_BOOK' && (
            /* View: Cahier de Dettes */
            <ModuleErrorBoundary moduleName="Comptabilité - Cahier de Dettes">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Cahier de Dettes..." />}>
                <DebtBookView
                  customers={customers}
                  initialCustomerId={selectedDebtCustomerId}
                  onBackToRegister={() => {
                    setSelectedDebtCustomerId(null);
                    setCurrentView('MASTER_HUB');
                  }}
                  onRecordPayment={handleRecordPayment}
                  onAddCustomerDebt={handleAddCustomerDebt}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {currentView === 'REPORTS' && (
            /* View: Rapports & Comptabilité */
            <ModuleErrorBoundary moduleName="Comptabilité - Rapports & Bilan">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Rapports & Comptabilité..." />}>
                <ReportsView
                  sales={salesHistory}
                  inventory={inventory}
                  losses={losses}
                  sellers={sellers}
                  onBackToRegister={() => setCurrentView('MASTER_HUB')}
                  onRecordLoss={handleRecordLoss}
                  onPrintSaleReceipt={handleOpenReceiptFromSale}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {currentView === 'VOICE_TEST' && (
            /* View: Test Reconnaissance Vocale */
            <ModuleErrorBoundary moduleName="Vocal - Reconnaissance Vocale & Vente Rapide">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Module Vocal..." />}>
                <VoiceTestComponent
                  inventory={inventory}
                  onAddToCart={(items) => {
                    handleAddToCartFromVoice(items);
                    setCurrentView('POS');
                  }}
                  onBackToRegister={() => setCurrentView('MASTER_HUB')}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {currentView === 'AI_ADVISOR' && (
            /* View: Conseils & Analyse IA de Gemini (Gratuit) */
            <ModuleErrorBoundary moduleName="IA - Conseiller Gemini">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Conseiller IA..." />}>
                <AiAdvisorView
                  inventory={inventory}
                  customers={customers}
                  sales={salesHistory}
                  losses={losses}
                  onBackToRegister={() => setCurrentView('MASTER_HUB')}
                  onOpenInventory={() => {
                    setCurrentView('INVENTORY');
                  }}
                  onOpenDebtBook={(customerId) => {
                    if (customerId) {
                      setSelectedDebtCustomerId(customerId);
                    }
                    setCurrentView('DEBT_BOOK');
                  }}
                  onQuickRestock={handleRestockProduct}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {currentView === 'INVENTORY' && (
            /* View: Inventaire & Produits (Ultra-simplifiée) */
            <ModuleErrorBoundary moduleName="Stock - Inventaire & Approvisionnement">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Gestion de Stock..." />}>
                <InventoryView
                  inventory={inventory}
                  movements={stockMovements}
                  isCashierMode={isCashierMode}
                  storeId={getCurrentStoreId()}
                  onRequireManagerAuth={requireManagerAuth}
                  onBackToRegister={() => setCurrentView('MASTER_HUB')}
                  onRestockProduct={handleRestockProduct}
                  onReconcileStock={handleReconcileStock}
                  onAddNewProduct={handleAddNewProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onRecordLoss={handleRecordLoss}
                  onBatchImportProducts={handleBatchImportProducts}
                  subscription={subscription}
                  currentUser={currentUser}
                  onOpenMarketingAi={handleOpenMarketingAi}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {currentView === 'CUSTOMER_ORDERS' && (
            /* View: Bons de Commande, Devis & Bons de Livraison */
            <ModuleErrorBoundary moduleName="Ventes - Commandes & Devis">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Commandes & Devis..." />}>
                <CustomerOrdersView
                  orders={customerOrders}
                  inventory={inventory}
                  customers={customers}
                  currentUser={currentUser}
                  onBackToRegister={() => setCurrentView('MASTER_HUB')}
                  onSaveOrder={handleSaveCustomerOrder}
                  onDeleteOrder={handleDeleteCustomerOrder}
                  onLoadOrderIntoCart={handleLoadOrderIntoCart}
                  onOpenDocuSign={handleOpenDocuSign}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {currentView === 'DASHBOARD' && (
            /* View: Tableau de bord Boutique & Hub Commercial */
            <ModuleErrorBoundary moduleName="Commerce - Tableau de Bord">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Tableau de Bord..." />}>
                <DashboardView
                  sales={salesHistory}
                  inventory={inventory}
                  customers={customers}
                  currentUser={currentUser}
                  subscription={subscription}
                  onOpenStudio={() => {
                    setCurrentView('STUDIO');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/studio');
                    }
                  }}
                  onOpenUpgrade={(planId?: string) => {
                    setSelectedCheckoutPlanId(planId || 'starter');
                    setIsPaywallModalOpen(true);
                  }}
                  onBack={() => {
                    setCurrentView('MASTER_HUB');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/dashboard');
                    }
                  }}
                  onBackToHome={() => {
                    setCurrentView('MASTER_HUB');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/dashboard');
                    }
                  }}
                  onBackToPos={() => {
                    setCurrentView('POS');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/?view=pos');
                    }
                  }}
                  onBackToHub={() => {
                    setCurrentView('MASTER_HUB');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/dashboard');
                    }
                  }}
                  initialProductId={publicBoutiqueParams.targetProductId}
                  onAddInventoryProduct={(newProd) => {
                    const currentStoreId = getCurrentStoreId();
                    const safeProduct: InventoryProduct = {
                      ...newProd,
                      storeId: currentStoreId,
                    };
                    setInventory(prev => {
                      const filtered = prev.filter(p => p.id !== safeProduct.id);
                      return [safeProduct, ...filtered];
                    });
                    persistInventoryProduct(safeProduct, currentStoreId).catch((err) => {
                      console.warn('[BOUTIQUE SYNC] Erreur persistance produit vers caisse :', err);
                    });
                  }}
                  onUpdateCurrentUser={(updatedUser) => {
                    setCurrentUser(updatedUser);
                  }}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {(currentView === 'STUDIO' || currentView === 'studio' || currentView === 'BOUTIQUE' || currentView === 'STORE' || currentView === 'SHOP') && (
            /* View: Nanasore Studio (Thèmes & Personnalisation Vitrine) */
            <ModuleErrorBoundary moduleName="Studio - Thèmes & Vitrine">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Nanasore Studio..." />}>
                <StoreStudioPage
                  storeId={currentUser?.uid || currentUser?.storeId || 'store-konkobo-telecom'}
                  currentUser={currentUser}
                  subscription={subscription}
                  inventory={inventory}
                  initialOpenThemes={true}
                  onAddInventoryProduct={(newProd) => {
                    const currentStoreId = getCurrentStoreId();
                    const safeProduct: InventoryProduct = {
                      ...newProd,
                      storeId: currentStoreId,
                    };
                    setInventory(prev => {
                      const filtered = prev.filter(p => p.id !== safeProduct.id);
                      return [safeProduct, ...filtered];
                    });
                    persistInventoryProduct(safeProduct, currentStoreId).catch((err) => {
                      console.warn('[STUDIO SYNC] Erreur persistance produit vers caisse :', err);
                    });
                  }}
                  onBackToDashboard={() => {
                    setCurrentView('MASTER_HUB');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/dashboard');
                    }
                  }}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {(currentView === 'QUOTES_PROJECTS' || currentView === 'DEVIS') && (
            /* View: Devis, Suivi de Projet & Séquestre Financier (Escrow) */
            <ModuleErrorBoundary moduleName="Contrats - Devis & Séquestre Escrow">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Devis & Projets..." />}>
                <EscrowQuotesView
                  onBackToPOS={() => {
                    setIsInstructorView(true);
                    setCurrentView('INSTRUCTOR');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/instructor');
                    }
                  }}
                  currentUser={currentUser}
                  subscription={subscription}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {currentView === 'CV_CREATOR' && (
            /* View: Créateur de CV Professionnels Modernes & Candidature Rapide */
            <ModuleErrorBoundary moduleName="RH - Créateur de CV Pro">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement CV Pro..." />}>
                <ResumeBuilderView
                  onBackToPOS={() => {
                    setIsInstructorView(true);
                    setCurrentView('INSTRUCTOR');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/instructor');
                    }
                  }}
                  currentUser={currentUser}
                  subscription={subscription}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {(currentView === 'AI_STUDIO' || currentView === 'ai_studio') && (
            /* View: Nana-générateur Multimodal (Assistant Texte, Création d'Image, Animation Vidéo) */
            <ModuleErrorBoundary moduleName="IA - Studio Multimodal">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement de Nana-générateur..." />}>
                <div className="w-full h-full flex-1 flex flex-col bg-[#070b14] overflow-hidden select-none">
                  <NanaGeneratorModal
                    isOpen={true}
                    isModal={false}
                    onClose={() => {
                      setCurrentView('MASTER_HUB');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/');
                      }
                    }}
                    storeName={currentUser?.storeName || 'Votre Entreprise'}
                    currentUser={currentUser}
                  />
                </div>
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {(currentView === 'PARTNER' || currentView === 'partner' || currentView === 'AFFILIATE' || currentView === 'affiliate' || ((currentView === 'PARTNERS' || currentView === 'partners') && !!currentUser)) && (
            <ModuleErrorBoundary moduleName="Affiliation - Programme Partenaires">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement Espace Partenaire..." />}>
                <div className="relative min-h-screen bg-slate-950 pb-20">
                  <div className="max-w-6xl mx-auto p-3 sm:p-6">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('MASTER_HUB');
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', '/');
                        }
                      }}
                      className="mb-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-emerald-400" />
                      <span>← Retour au Hub Principal</span>
                    </button>
                    <AffiliateDashboardModal
                      isOpen={true}
                      isModal={false}
                      currentUser={currentUser}
                      onClose={() => {
                        setCurrentView('MASTER_HUB');
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', '/');
                        }
                      }}
                    />
                  </div>
                </div>
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {/* VIEW 1 : Ultimate Funnel Studio (Masterclass & Live) */}
          {(currentView === 'FUNNEL' || currentView === 'funnel' || currentView === 'ULTIMATE_FUNNEL' || currentView === 'ultimate_funnel' || currentView === 'TUNNEL' || currentView === 'tunnel') && (
            <ModuleErrorBoundary moduleName="Tunnels - Ultimate Funnel Studio">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement d'Ultimate Funnel Studio..." />}>
                <div className="fixed inset-0 z-50 bg-[#070b14] overflow-hidden">
                  <UltimateFunnelBuilder
                    isOpen={true}
                    initialData={{
                      id: 'funnel-store-' + Date.now(),
                      type: 'product',
                      title: currentUser?.storeName ? `Tunnel de Vente - ${currentUser.storeName}` : 'Grand Live Shopping & Offre Flash',
                      subtitle: 'Tunnel de conversion haute performance avec bon de commande 1-clic et paiement mobile.',
                      image: inventory[0]?.photoUrl || (inventory[0] as any)?.image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
                      price: inventory[0]?.sellingPrice || (inventory[0] as any)?.price || 15000,
                      originalPrice: ((inventory[0]?.sellingPrice || (inventory[0] as any)?.price || 15000) * 1.35),
                      instructor: currentUser?.storeName || 'Commerçant NaNa',
                      category: 'E-Commerce & Vente Directe',
                      duration: 'Offre Spéciale Limitée'
                    }}
                    sourceType="product"
                    onClose={() => {
                      setCurrentView('MASTER_HUB');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/');
                      }
                    }}
                    onSave={(savedPayload: any) => {
                      if (savedPayload) {
                        saveFunnelConfig(savedPayload);
                      }
                      playValidationBeep();
                    }}
                  />
                </div>
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {/* VIEW 2 : Caisse Express 1-Clic (Produits Physiques) */}
          {(currentView === 'PHYSICAL_FUNNEL' || currentView === 'physical_funnel' || currentView === 'CHECKOUT_FUNNEL' || currentView === 'checkout_funnel') && (
            <ModuleErrorBoundary moduleName="Tunnels - Caisse Express 1-Clic">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement de Caisse Express..." />}>
                <div className="fixed inset-0 z-50 bg-[#070b14] overflow-hidden flex flex-col p-2 sm:p-4">
                  <PhysicalFunnelBuilder
                    className="h-full"
                    onClose={() => {
                      setCurrentView('MASTER_HUB');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/');
                      }
                    }}
                    onSave={(savedPayload: any) => {
                      if (savedPayload) {
                        saveFunnelConfig(savedPayload);
                      }
                      playValidationBeep();
                    }}
                    onViewLive={(slug: string) => {
                      if (typeof window !== 'undefined') {
                        window.open(`/c/${slug}`, '_blank');
                      }
                    }}
                  />
                </div>
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {/* VIEW 3 : NaNa Studio 3.0 (Tunnel Modulaire Divi) */}
          {(currentView === 'MODULAR_FUNNEL' || currentView === 'modular_funnel' || currentView === 'NANA_STUDIO' || currentView === 'nana_studio') && (
            <ModuleErrorBoundary moduleName="Tunnels - Studio Modulaire Divi">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement de NaNa Funnel Studio 3.0..." />}>
                <div className="fixed inset-0 z-50 bg-[#070b14] overflow-hidden">
                  <FunnelBuilder
                    isOpen={true}
                    isPublicView={false}
                    product={inventory[0] ? {
                      id: inventory[0].id || 'prod-nana-1',
                      name: inventory[0].name || (currentUser?.storeName ? `Offre ${currentUser.storeName}` : 'Produit Phare NaNa Store'),
                      price: inventory[0].sellingPrice || 25000,
                      originalPrice: Math.round((inventory[0].sellingPrice || 25000) * 1.4),
                      image: inventory[0].photoUrl || (inventory[0] as any)?.image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
                      description: inventory[0].description || 'Tunnel de vente modulaire haute conversion avec sections Divi et Toolbox Pro.'
                    } : null}
                    onClose={() => {
                      setCurrentView('MASTER_HUB');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/');
                      }
                    }}
                    onSave={(savedPayload: any) => {
                      if (savedPayload) {
                        saveFunnelConfig(savedPayload);
                      }
                      playValidationBeep();
                    }}
                  />
                </div>
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {(currentView === 'EMAILING' || currentView === 'emailing') && (
            <ModuleErrorBoundary moduleName="Studio Emailing">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement du Studio E-mailing..." />}>
                <div className="fixed inset-0 z-50 bg-[#FBF9F5] overflow-y-auto">
                  <TenantEmailingDashboardPage />
                </div>
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {currentView === 'MASTER_HUB' && (
            /* View: Hub Central Master (ENTREPRISE KONKOBO POUSBILA) */
            <ModuleErrorBoundary moduleName="Hub Central - Direction Générale">
              <React.Suspense fallback={<LazyModuleFallback label="Chargement du Hub Master..." />}>
                <CentralMasterHubView
                  currentUser={currentUser}
                  subscription={subscription}
                  onOpenUpgrade={(planId?: string) => {
                    setSelectedCheckoutPlanId(planId || 'starter');
                    setIsPaywallModalOpen(true);
                  }}
                  onOpenAcademy={() => setIsAcademyDrawerOpen(true)}
                  sales={salesHistory}
                  inventory={inventory}
                  customers={customers}
                  customerOrders={customerOrders}
                  onNavigateToCatalog={() => {
                    setIsCatalogView(true);
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/catalog');
                    }
                  }}
                  onNavigate={(v: AppView | string) => {
                    playTapBeep();

                    // Persistance stable du slug d'entreprise dans Firestore lors de l'accès/configuration d'un module
                    const effectiveStoreId = getCurrentStoreId();
                    const currentTenantSlug = getSafeStoreSlug(currentUser, null, { uid: auth.currentUser?.uid }) || 'ma-boutique';
                    ensureAndPersistTenantSlug(effectiveStoreId, currentUser, auth.currentUser?.uid || currentUser?.uid).catch((err) => {
                      console.warn('[SLUG AUTO-HEAL] Persistance différée :', err);
                    });

                    // Routage modulaire d'application autonome (/dashboard/apps/:appId)
                    if (typeof v === 'string' && (v.startsWith('/dashboard/apps/') || v.startsWith('/apps/'))) {
                      const aId = v.replace('/dashboard/apps/', '').replace('/apps/', '').split('/')[0].split('?')[0];
                      if (aId) {
                        setCurrentStandaloneAppId(aId);
                        setCurrentView('STANDALONE_APP');
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', `/dashboard/apps/${aId}`);
                        }
                        return;
                      }
                    }
                    if (v === 'STANDALONE_APP') {
                      setCurrentView('STANDALONE_APP');
                      return;
                    }

                    if (v === 'EMAILING' || v === 'emailing' || v === 'app-emailing' || v === 'email' || v === '/dashboard/marketing/emailing' || v === '/emailing') {
                      setCurrentView('EMAILING');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/marketing/emailing');
                      }
                      return;
                    }

                    // Groupe 3 - Déclencheurs de Modales & Outils Intégrés (Ouverture directe 1-clic)
                    if (v === 'APPS_NANAGENERATOR' || v === 'NANAGENERATOR' || v === 'nanagenerator' || v === 'app-nanagenerator' || v === '/dashboard/apps/nanagenerator') {
                      handleOpenMarketingAi();
                      return;
                    }
                    if (v === 'EXCEL_IMPORT' || v === 'excel' || v === 'tool-excel' || v === '/excel' || v === '/dashboard/inventaire/excel') {
                      requireManagerAuth(() => {
                        setIsGlobalExcelImporterOpen(true);
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', '/dashboard/inventaire/excel');
                        }
                      }, 'Importer Excel / CSV', 'Import');
                      return;
                    }
                    if (v === 'WEBINAR' || v === 'webinar' || v === 'app-webinar' || v === '/webinar' || v === '/dashboard/lives') {
                      requireManagerAuth(() => {
                        setIsGlobalWebinarModalOpen(true);
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', '/dashboard/lives');
                        }
                      }, 'Studio Webinaire & Live Shopping', 'Live');
                      return;
                    }
                    if (v === 'KYC_VERIFICATION' || v === 'kyc' || v === 'srv-kyc' || v === '/kyc') {
                      setIsKycModalOpen(true);
                      return;
                    }
                    if (v === 'BARCODE_SCANNER' || v === 'scanner' || v === 'tool-scanner' || v === '/scanner') {
                      setIsPosCameraScannerOpen(true);
                      return;
                    }
                    if (v === 'ACADEMY' || v === 'academy' || v === 'srv-academy-support' || v === '/academy') {
                      setActiveAcademyTutorialId('tuto-1-gmail-signup');
                      setIsAcademyDrawerOpen(true);
                      return;
                    }

                    // Groupe 2 - Normalisation & Aiguillage Vues Métiers
                    if (v === 'CUSTOMERS' || v === 'debts' || v === 'mod-debts' || v === '/debts' || v === '/dashboard/dettes') {
                      v = 'DEBT_BOOK';
                    }
                    if (v === 'ANALYTICS' || v === 'analytics' || v === 'mod-analytics' || v === '/analytics' || v === '/dashboard/rapports') {
                      v = 'REPORTS';
                    }
                    if (v === 'NANAMARKET' || v === 'nanamarket' || v === 'app-nanamarket' || v === '/nanamarket' || v === '/dashboard/market') {
                      v = 'MARKET_DIRECTORY';
                    }
                    if (v === 'CVPRO' || v === 'cvpro' || v === 'mod-cvpro' || v === '/cvpro' || v === '/dashboard/cv') {
                      v = 'CV_CREATOR';
                    }

                    if (v === 'PARTNER' || v === 'partner' || v === 'PARTNERS' || v === 'partners' || v === 'AFFILIATE' || v === 'affiliate') {
                      setCurrentView('PARTNER');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/partenaire');
                      }
                      return;
                    }
                    if (v === 'CAMPUS' || v === 'STUDENT' || v === 'ETUDIANT' || v === 'STUDENT_DASHBOARD') {
                      setIsStudentDashboardView(true);
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/campus');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                      return;
                    }
                    if (v === 'CLASSROOM') {
                      setPublicClassroomId('telecom-fintech-masterclass');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/campus/telecom-fintech-masterclass');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                      return;
                    }
                    if (v === 'CRM' || v === 'CRM_DASHBOARD') {
                      setIsCrmDashboardView(true);
                      setCurrentView('CRM_DASHBOARD');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/crm-dashboard');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                      return;
                    }

                    if (v === 'CERTIFICATE' || v === 'CERTIFICAT') {
                      setIsCertificateView(true);
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/campus/certificat');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                      return;
                    }

                    if (v === 'CATALOG' || v === 'COURSES') {
                      setIsCatalogView(true);
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/marketplace');
                      }
                      return;
                    }
                    if (v === 'MODULAR_FUNNEL' || v === 'modular_funnel' || v === 'NANA_STUDIO' || v === 'nana_studio' || v === 'FUNNEL' || v === 'funnel' || v === 'TUNNEL' || v === 'tunnel') {
                      setCurrentView('MODULAR_FUNNEL');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/funnel/modular');
                      }
                      return;
                    }
                    if (v === 'ULTIMATE_FUNNEL' || v === 'ultimate_funnel') {
                      setCurrentView('ULTIMATE_FUNNEL');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/funnel/ultimate');
                      }
                      return;
                    }
                    if (v === 'PHYSICAL_FUNNEL' || v === 'physical_funnel' || v === 'CHECKOUT_FUNNEL' || v === 'checkout_funnel') {
                      setCurrentView('PHYSICAL_FUNNEL');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/funnel/physical');
                      }
                      return;
                    }
                    if (v === 'STUDIO' || v === 'studio' || v === 'BOUTIQUE' || v === 'STORE' || v === 'SHOP') {
                      setCurrentView('STUDIO');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', `/dashboard/vitrine/${currentTenantSlug}`);
                      }
                      return;
                    }
                    if (v === 'MASTER_HUB' || v === 'DASHBOARD' || v === 'dashboard') {
                      setCurrentView('MASTER_HUB');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard');
                      }
                      return;
                    }
                    if (v === 'WAMEET' || v === 'wameet' || v === 'COMMUNITY' || v === 'COMMUNAUTE' || v === 'community' || v === 'communaute') {
                      setCurrentView('WAMEET');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/wameet');
                      }
                      return;
                    }
                    if (v === 'AI_STUDIO' || v === 'ai_studio') {
                      setCurrentView('AI_STUDIO');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/ai-studio');
                      }
                      return;
                    }
                    if (v === 'SALLES_VIP' || v === 'salles_vip' || v === 'VIP' || v === 'vip' || v === 'SALLES' || v === 'salles') {
                      setSelectedVipRoomId(null);
                      setCurrentView('SALLES_VIP');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/salles-vip');
                      }
                      return;
                    }
                    if (v === 'COURSE_CREATE' || v === 'course_create') {
                      setIsInstructorView(true);
                      setCurrentView('COURSE_CREATE');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/courses/create');
                      }
                      return;
                    }
                    if (v === 'INSTRUCTOR' || v === 'instructor') {
                      setIsInstructorView(true);
                      setCurrentView('teacher_dashboard');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/formateur');
                      }
                      return;
                    }
                    if (v === 'POS' || v === 'pos') {
                      setCurrentView('POS');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/pos');
                      }
                      return;
                    }
                    if (v === 'SETTINGS_EXTENSIONS' || v === 'connecteurs') {
                      setCurrentView('SETTINGS_EXTENSIONS');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/connecteurs');
                      }
                      return;
                    }
                    if (v === 'DOCUSIGN' || v === 'docusign') {
                      setCurrentView('DOCUSIGN');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/docusign');
                      }
                      return;
                    }
                    if (v === 'SAAS_ADMIN' || v === 'admin') {
                      setCurrentView('SAAS_ADMIN');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/admin');
                      }
                      return;
                    }
                    if (v === 'MARKET_DIRECTORY' || v === 'market') {
                      setCurrentView('MARKET_DIRECTORY');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/market');
                      }
                      return;
                    }
                    if (
                      v === 'INVENTORY' ||
                      v === 'REPORTS' ||
                      v === 'DEBT_BOOK' ||
                      v === 'CUSTOMER_ORDERS' ||
                      v === 'QUOTES_PROJECTS' ||
                      v === 'CV_CREATOR' ||
                      v === 'AI_ADVISOR' ||
                      v === 'DASHBOARD'
                    ) {
                      const routeMap: Record<string, string> = {
                        INVENTORY: '/dashboard/inventaire',
                        REPORTS: '/dashboard/rapports',
                        DEBT_BOOK: '/dashboard/dettes',
                        CUSTOMER_ORDERS: '/dashboard/commandes',
                        QUOTES_PROJECTS: '/dashboard/commandes/devis',
                        CV_CREATOR: '/dashboard/cv',
                        AI_ADVISOR: '/dashboard/ai-advisor',
                        DASHBOARD: '/dashboard',
                      };
                      requireManagerAuth(() => {
                        setCurrentView(v as AppView);
                        if (typeof window !== 'undefined' && routeMap[v]) {
                          window.history.pushState({}, '', routeMap[v]);
                        }
                      }, v, v);
                    } else {
                      setCurrentView(v as AppView);
                    }
                  }}
                  onOpenExcelImporter={() => {
                    requireManagerAuth(() => {
                      setIsGlobalExcelImporterOpen(true);
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/inventaire/excel');
                      }
                    }, 'Importer Excel / CSV', 'Import');
                  }}
                  onOpenWebinarModal={() => {
                    requireManagerAuth(() => {
                      setIsGlobalWebinarModalOpen(true);
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/lives');
                      }
                    }, 'Webinaire & Live Shopping', 'Live');
                  }}
                  onOpenMarketingAi={() => {
                    handleOpenMarketingAi();
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/dashboard/marketing');
                    }
                  }}
                  onOpenAffiliation={() => {
                    setCurrentView('PARTNER');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/dashboard/partenaire');
                    }
                  }}
                  onOpenAdmin={() => {
                    setIsSecretAdminModalOpen(true);
                  }}
                  onOpenSaasAdmin={() => {
                    const isSuperAdmin = isSuperAdminLocally(currentUser);
                    if (isSuperAdmin) {
                      setCurrentView('SAAS_ADMIN');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/dashboard/admin');
                      }
                    } else {
                      setIsSecretAdminModalOpen(true);
                    }
                  }}
                  onOpenSecretAdminModal={() => setIsSecretAdminModalOpen(true)}
                  onOpenDocuSign={() => {
                    handleOpenDocuSign();
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/dashboard/docusign');
                    }
                  }}
                  onLockSession={handleManualLock}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}

          {/* View: Application Autonome PWA (/dashboard/apps/:appId) */}
          {(currentView === 'STANDALONE_APP' || (currentStandaloneAppId && currentView !== 'MASTER_HUB')) && (
            <ModuleErrorBoundary moduleName={`Mini-App PWA - ${currentStandaloneAppId || 'app'}`}>
              <React.Suspense fallback={<LazyModuleFallback label="Chargement de l'application..." />}>
                <StandaloneAppHost
                  appId={currentStandaloneAppId || 'nanagenerator'}
                  currentUser={currentUser}
                  subscription={subscription}
                  sales={salesHistory}
                  inventory={inventory}
                  customers={customers}
                  customerOrders={customerOrders}
                  onNavigate={(v) => {
                    setCurrentStandaloneAppId(null);
                    setCurrentView(v as any);
                  }}
                />
              </React.Suspense>
            </ModuleErrorBoundary>
          )}
        </div>
      </main>

      {/* Global Bottom Navigation Tab Bar (Accès direct 1-clic aux vues de l'app) */}
        <nav
          aria-label="Navigation principale"
          className="h-14 shrink-0 bg-[#0d1527] border-t border-slate-800 flex items-center justify-start sm:justify-center px-3 sm:px-4 gap-2 sm:gap-4 md:gap-6 overflow-x-auto overflow-y-hidden z-40 select-none scroll-smooth touch-pan-x overscroll-x-contain no-scrollbar shadow-[0_-4px_16px_rgba(0,0,0,0.5)]"
        >
          {/* Onglet Hub Master Central (Tableau de Bord Caméléon) */}
          <button
            id="tab-nav-master-hub"
            type="button"
            onClick={() => {
              playTapBeep();
              setCurrentView('MASTER_HUB');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/dashboard');
              }
            }}
            className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer ${
              currentView === 'MASTER_HUB'
                ? 'text-blue-400 font-bold bg-blue-950/50 border border-blue-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
            title="Tableau de Bord Central (QG)"
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span className="text-[10px] tracking-tight font-semibold">Tableau de Bord</span>
          </button>

          {resolveSellerMode(currentUser) !== 'creator_trainer' && (
            <button
              id="tab-nav-pos"
              type="button"
              onClick={() => setCurrentView('POS')}
              className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer ${
                !isStoreOpen
                  ? 'text-amber-400/90 bg-amber-950/30 border border-amber-500/30 shadow-xs'
                  : currentView === 'POS'
                  ? 'text-blue-400 font-bold bg-blue-950/50 border border-blue-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
              title={!isStoreOpen ? 'Caisse Fermée (Boutique Fermée)' : '📠 Caisse Magasin (POS)'}
            >
              {!isStoreOpen ? (
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              ) : (
                <ShoppingBag className="w-4 h-4 shrink-0" />
              )}
              <span className="text-[10px] tracking-tight">{!isStoreOpen ? 'Fermée' : '📠 Caisse POS'}</span>
            </button>
          )}

          <button
            id="tab-nav-inventory"
            type="button"
            onClick={() => requireManagerAuth(() => setCurrentView('INVENTORY'), 'Stock & Inventaire', 'Stock')}
            className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation relative cursor-pointer ${
              currentView === 'INVENTORY'
                ? 'text-blue-400 font-bold bg-blue-950/50 border border-blue-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <Boxes className="w-4 h-4 shrink-0" />
              {inventory.some((p) => p.stock < 5) && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] tracking-tight flex items-center gap-0.5">
              <span>Stock</span>
              {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
            </span>
          </button>

          {/* Onglet Bons & Commandes Clients */}
          <button
            id="tab-nav-orders"
            type="button"
            onClick={() => requireManagerAuth(() => setCurrentView('CUSTOMER_ORDERS'), 'Commandes & Livraisons', 'Commandes')}
            className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation relative cursor-pointer ${
              currentView === 'CUSTOMER_ORDERS' || currentView === 'ORDERS'
                ? 'text-amber-400 font-bold bg-amber-950/50 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <Package className="w-4 h-4 shrink-0" />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-[10px] text-white font-black flex items-center justify-center animate-pulse shadow-sm leading-none">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight flex items-center gap-0.5">
              <span>Commandes</span>
              {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
            </span>
          </button>

          {/* Onglet Cahier de Dettes */}
          <button
            id="tab-nav-debts"
            type="button"
            onClick={() => requireManagerAuth(() => setCurrentView('DEBT_BOOK'), 'Cahier de Dettes', 'Dettes')}
            className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation relative cursor-pointer ${
              currentView === 'DEBT_BOOK'
                ? 'text-amber-400 font-bold bg-amber-950/50 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <BookOpen className="w-4 h-4 shrink-0" />
              {customers.some((c) => c.totalDebt > 0) && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] tracking-tight flex items-center gap-0.5">
              <span>Dettes</span>
              {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
            </span>
          </button>

          {/* Onglet Compta & Rapports */}
          <button
            id="tab-nav-reports"
            type="button"
            onClick={() => requireManagerAuth(() => setCurrentView('REPORTS'), 'Comptabilité & Rapports', 'Compta')}
            className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer ${
              currentView === 'REPORTS'
                ? 'text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span className="text-[10px] tracking-tight flex items-center gap-0.5">
              <span>Compta</span>
              {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
            </span>
          </button>

          {/* Onglet Conseiller IA (Alertes Vendeur) */}
          <button
            id="tab-nav-ai-advisor"
            type="button"
            onClick={() => {
              playTapBeep();
              requireManagerAuth(() => setCurrentView('AI_ADVISOR'), 'Conseils Vendeur', 'Conseils');
            }}
            className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation relative cursor-pointer ${
              currentView === 'AI_ADVISOR'
                ? 'text-amber-300 font-bold bg-amber-950/50 border border-amber-500/40 shadow-xs'
                : 'text-indigo-300 hover:text-indigo-100 font-medium'
            }`}
            title="Conseiller & Alertes Vendeur"
          >
            <div className="relative">
              <Bot className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
            </div>
            <span className="text-[10px] font-bold flex items-center gap-0.5">
              <span>Conseiller IA</span>
              {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
            </span>
          </button>

          {/* --- MODULES HORS CAISSE (Masqués en mode POS pour épurer l'écran de caisse) --- */}
          {currentView !== 'POS' && (
            <>
              {/* Onglet Devis / Projets (Escrow) */}
              <button
                id="tab-nav-quotes-projects"
                type="button"
                onClick={() => {
                  playTapBeep();
                  requireManagerAuth(() => setCurrentView('QUOTES_PROJECTS'), 'Devis & Projets Escrow', 'Devis');
                }}
                className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  currentView === 'QUOTES_PROJECTS' || currentView === 'DEVIS'
                    ? 'text-cyan-400 font-bold bg-cyan-950/50 border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
                title="Devis & Projets avec Tiers de Confiance"
              >
                <FolderKanban className="w-4 h-4 shrink-0" />
                <span className="text-[10px] tracking-tight flex items-center gap-0.5">
                  <span>Devis/Projets</span>
                  {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                </span>
              </button>

              {/* Onglet CV Pro */}
              <button
                id="tab-nav-cv-creator"
                type="button"
                onClick={() => {
                  playTapBeep();
                  requireManagerAuth(() => setCurrentView('CV_CREATOR'), 'Créateur de CV Pro', 'CV Pro');
                }}
                className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  currentView === 'CV_CREATOR'
                    ? 'text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
                title="Créateur de CV Professionnel"
              >
                <FileBadge className="w-4 h-4 shrink-0" />
                <span className="text-[10px] tracking-tight flex items-center gap-0.5">
                  <span>CV Pro</span>
                  {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                </span>
              </button>

              {/* Onglet Générateur Studio */}
              <button
                id="tab-nav-marketing-ai"
                type="button"
                onClick={() => {
                  playTapBeep();
                  requireManagerAuth(() => handleOpenMarketingAi(), 'Générateur Studio', 'Générateur');
                }}
                className="shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation relative cursor-pointer text-amber-400 hover:text-amber-300 font-medium"
                title="Générateur de Fiches & Contenus"
              >
                <div className="relative">
                  <Wand2 className="w-4 h-4 shrink-0 text-amber-400" />
                </div>
                <span className="text-[10px] font-bold flex items-center gap-0.5">
                  <span>Générateur</span>
                  {isCashierMode && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                </span>
              </button>

              {/* Onglet Boutique */}
              <button
                id="tab-nav-store"
                type="button"
                onClick={() => {
                  playTapBeep();
                  setCurrentView('STUDIO');
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/studio');
                  }
                }}
                className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  currentView === 'STUDIO' || currentView === 'BOUTIQUE' || currentView === 'DASHBOARD'
                    ? 'text-indigo-400 font-bold bg-indigo-950/50 border border-indigo-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                <Store className="w-4 h-4 shrink-0" />
                <span className="text-[10px] tracking-tight flex items-center gap-0.5">
                  <span>Boutique</span>
                </span>
              </button>
            
              {/* Onglet Partenaire */}
              <button
                id="tab-nav-affiliate"
                type="button"
                onClick={() => {
                  playTapBeep();
                  setCurrentView('PARTNER');
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/partenaire');
                  }
                }}
                className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  currentView === 'PARTNER' || currentView === 'partner' || currentView === 'AFFILIATE'
                    ? 'text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/40 shadow-xs'
                    : 'text-emerald-400 hover:text-emerald-300 font-medium'
                }`}
              >
                <Gift className="w-4 h-4 shrink-0" />
                <span className="text-[10px] tracking-tight flex items-center gap-0.5">
                  <span>Partenaire</span>
                </span>
              </button>

              {/* Onglet Étudiant */}
              <button
                id="tab-nav-student"
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/classroom/telecom-fintech-masterclass');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                  setPublicClassroomId('telecom-fintech-masterclass');
                }}
                className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  publicClassroomId
                    ? 'text-cyan-400 font-bold bg-cyan-950/50 border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span className="text-[10px] tracking-tight flex items-center gap-0.5">
                  <span>Étudiant</span>
                </span>
              </button>

              {/* Onglet Salles VIP */}
              <button
                id="tab-nav-salles-vip"
                type="button"
                onClick={() => {
                  playTapBeep();
                  setSelectedVipRoomId(null);
                  setCurrentView('SALLES_VIP');
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/salles-vip');
                  }
                }}
                className={`shrink-0 min-w-[56px] min-h-[44px] py-1 px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  currentView === 'SALLES_VIP' || currentView === 'salles_vip' || currentView === 'VIP' || currentView === 'vip'
                    ? 'text-amber-400 font-bold bg-amber-950/50 border border-amber-500/40 shadow-xs'
                    : 'text-amber-400 hover:text-amber-300 font-medium'
                }`}
                title="Salles VIP & E-learning"
              >
                <GraduationCap className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="text-[10px] tracking-tight flex items-center gap-0.5 font-bold">
                  <span>Salles VIP</span>
                </span>
              </button>
            </>
          )}
        </nav>

        {/* Modal: Paiement Cash */}
        <CashPaymentModal
          isOpen={isCashModalOpen}
          total={total}
          cart={cart}
          activeSeller={activeSeller}
          onOpenSellerSwitch={() => setIsSellerSwitchModalOpen(true)}
          onClose={() => setIsCashModalOpen(false)}
          onConfirmPayment={handleConfirmCashPayment}
          onPrintReceipt={handlePrintFromCashModal}
          onDownloadPdf={handlePdfFromCashModal}
        />

        {/* Modal: Changement Rapide de Vendeur / PIN / Verrouillage Caisse */}
        <SellerSwitchModal 
        onLockSession={handleLockPOS}

          isOpen={isSellerSwitchModalOpen}
          onClose={() => setIsSellerSwitchModalOpen(false)}
          sellers={sellers}
          activeSeller={activeSeller}
          onSelectSeller={handleSelectSeller}
          onAddSeller={handleAddSeller}
          currentUser={currentUser}
          subscription={subscription}
          isFreeAccount={isFree}
        />


        {/* Modal: Impression & Téléchargement Reçu / Facture Thermique (80mm / 58mm / PDF) */}
        {isReceiptModalOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Reçu..." />}>
            <ThermalReceiptModal
              isOpen={isReceiptModalOpen}
              onClose={() => setIsReceiptModalOpen(false)}
              receipt={activeReceiptData}
            />
          </React.Suspense>
        )}

        {/* Modal: Crédit Client */}
        <CreditModal
          isOpen={isCreditModalOpen}
          total={total}
          cart={cart}
          customers={customers}
          onClose={() => setIsCreditModalOpen(false)}
          onConfirmCredit={handleConfirmCredit}
        />

        {/* Modal: Scanner Caméra Selfie / Frontale / Arrière en continu pour la Caisse */}
        {isPosCameraScannerOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Scanner..." />}>
            <BarcodeSelfieScanner
              isOpen={isPosCameraScannerOpen}
              onClose={() => setIsPosCameraScannerOpen(false)}
              onDetected={(code) => {
                handleScannedBarcode(code);
              }}
            />
          </React.Suspense>
        )}

        {/* Modal: Administration & Profil Boutiquier Google */}
        {isAdminModalOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Administration..." />}>
            <BoutiqueAdminModal
              isOpen={isAdminModalOpen}
              onClose={() => setIsAdminModalOpen(false)}
              user={currentUser}
              onUpdateUser={(updated) => setCurrentUser(updated)}
              onLogout={handleLogout}
              onOpenSaasSuperAdmin={isSuperAdminLocally(currentUser) ? () => {
                setIsAdminModalOpen(false);
                setCurrentView('SAAS_ADMIN');
              } : undefined}
              onSwitchStoreId={handleSwitchStoreId}
              inventory={inventory}
              customers={customers}
              sales={salesHistory}
            />
          </React.Suspense>
        )}

        {/* Modal SaaS : Paywall & Abonnements Mobile Money / Espèces */}
        {isPaywallModalOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Abonnements..." />}>
            <SubscriptionPaywallModal
              isOpen={isPaywallModalOpen}
              initialPlanId={selectedCheckoutPlanId}
              onClose={() => setIsPaywallModalOpen(false)}
              currentUser={currentUser}
              storeId={getCurrentStoreId()}
              storeName={currentUser?.storeName || 'Votre Boutique'}
              subscription={subscription}
              currentSubscription={subscription}
              onSubscriptionUpdated={(newSub) => {
                setSubscription(newSub);
                const updatedPlan = newSub.plan;
                const isUnlimited = updatedPlan === 'pro' || updatedPlan === 'elite';
                if (currentUser) {
                  const updatedUser = {
                    ...currentUser,
                    plan: updatedPlan,
                    subscription: newSub,
                    subscriptionPlan: updatedPlan,
                    subscriptionStatus: newSub.status,
                    quotas: {
                      maxCourses: isUnlimited ? -1 : (updatedPlan === 'starter' ? 5 : 1),
                      unlimitedCourses: isUnlimited,
                    },
                  };
                  setCurrentUser(updatedUser);
                  safeSetItem('nana_store_auth_user', JSON.stringify(updatedUser));
                }
                safeSetItem('nana_user_plan', updatedPlan);
                safeSetItem('nana_store_plan', updatedPlan);
                safeSetItem('nana_store_sub', JSON.stringify(newSub));
                setLastSaleToast(`🎉 Abonnement ${updatedPlan.toUpperCase()} activé avec succès !`);
                setTimeout(() => setLastSaleToast(null), 4000);
              }}
            />
          </React.Suspense>
        )}

        {/* Modal SaaS : PLG Feature Locks & Quotas Upsell */}
        <React.Suspense fallback={null}>
          <UpsellModal 
            onUpgrade={(targetPlan) => {
              if (targetPlan) setSelectedCheckoutPlanId(targetPlan);
              setIsPaywallModalOpen(true);
            }} 
          />
        </React.Suspense>

        {/* Modal SaaS : Tableau de Bord Affilié / Parrainage */}
        {isAffiliateModalOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Espace Affiliation..." />}>
            <AffiliateDashboardModal
              isOpen={isAffiliateModalOpen}
              onClose={() => setIsAffiliateModalOpen(false)}
              currentUser={currentUser}
            />
          </React.Suspense>
        )}

        {/* Modal SaaS : Politique de Confidentialité & Protection des Données */}
        {isPrivacyModalOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Confidentialité..." />}>
            <PrivacyPolicyModal
              isOpen={isPrivacyModalOpen}
              onClose={() => setIsPrivacyModalOpen(false)}
            />
          </React.Suspense>
        )}

        {/* Modal DocuSignHub : Signature électronique, Scan & Tampon */}
        {isDocuSignOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Signature Électronique..." />}>
            <DocuSignHub
              initialDocTitle={docuSignDocTitle}
              onClose={() => setIsDocuSignOpen(false)}
              currentUser={currentUser}
              subscription={subscription}
              onOpenUpgrade={() => {
                setIsDocuSignOpen(false);
                setIsPaywallModalOpen(true);
              }}
            />
          </React.Suspense>
        )}

        {/* Modal Importer Excel / CSV Global */}
        {isGlobalExcelImporterOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Importateur Excel..." />}>
            <ExcelImporterModal
              isOpen={isGlobalExcelImporterOpen}
              onClose={() => setIsGlobalExcelImporterOpen(false)}
              existingInventory={inventory}
              storeId={getCurrentStoreId()}
              onConfirmImport={(productsToImport) => {
                handleBatchImportProducts(productsToImport);
                setIsGlobalExcelImporterOpen(false);
              }}
            />
          </React.Suspense>
        )}

        {/* Modal Création Live & Webinaire */}
        {isGlobalWebinarModalOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Module Live / Webinaire..." />}>
            <CreateWebinarModal
              isOpen={isGlobalWebinarModalOpen}
              merchantId={getCurrentStoreId()}
              storeName={currentUser?.storeName || 'ENTREPRISE KONKOBO POUSBILA'}
              onClose={() => setIsGlobalWebinarModalOpen(false)}
              onOpenNanaGenerator={() => {
                setIsGlobalWebinarModalOpen(false);
                setIsMarketingAiModalOpen(true);
              }}
              isPublicView={false}
            />
          </React.Suspense>
        )}

        {/* Modal Nana-générateur (Marque Blanche 100% Neutre) */}
        {isMarketingAiModalOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement de Nana-générateur..." />}>
            <NanaGeneratorModal
              isOpen={isMarketingAiModalOpen}
              onClose={() => {
                setIsMarketingAiModalOpen(false);
                setMarketingAiProductData(null);
              }}
              initialMode={marketingAiProductData?.initialMode || 'image'}
              initialPrompt={marketingAiProductData?.name ? `${marketingAiProductData.name} ${marketingAiProductData.features ? `- ${marketingAiProductData.features}` : ''}` : ''}
              storeName={currentUser?.storeName || 'Votre Entreprise'}
              isModal={true}
              currentUser={currentUser}
            />
          </React.Suspense>
        )}

        {/* Modal Chaîne d'Identification KYC & Sécurité */}
        {isKycModalOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement Vérification KYC..." />}>
            <KycVerificationModal
              isOpen={isKycModalOpen}
              onClose={() => setIsKycModalOpen(false)}
              storeId={getCurrentStoreId()}
              storeName={currentUser?.storeName || 'Votre Entreprise'}
              managerName={currentUser?.name || currentUser?.storeName || 'Gérant'}
              managerPhone={currentUser?.whatsappPhone || currentUser?.phone || ''}
              onSubmitted={() => {
                setIsKycModalOpen(false);
              }}
            />
          </React.Suspense>
        )}

        {/* Modal de Verrouillage Sécurisé PIN 4 Chiffres (Sas de sécurité & déverrouillage) */}
        {currentUser && (
          <PinKeypadModal
            isOpen={isPinLocked}
            expectedPin={currentUser.pinCode || '1234'}
            userName={currentUser.name}
            storeName={currentUser.storeName}
            reason={pinLockReason}
            onSuccess={() => {
              setIsPinLocked(false);
              setLastSaleToast('🔓 Caisse déverrouillée');
              setTimeout(() => setLastSaleToast(null), 3000);
            }}
            onMaxAttemptsReached={handleLogout}
            onManualLogout={handleLogout}
            onForgotPassword={handleLogout}
          />
        )}

        {/* Modal d'Accès Secret Super Admin (*#007# / Tapping Logo) */}
        {currentUser && (
          <React.Suspense fallback={null}>
            <MerchantFlashAlert
              merchantId={getCurrentStoreId()}
              storeName={currentUser.storeName || 'ENTREPRISE KONKOBO POUSBILA'}
            />
          </React.Suspense>
        )}

        {/* Sonnerie et Réception des Appels Directs Live Daily.co (Ordinateur Vendeur) */}
        <React.Suspense fallback={null}>
          <LiveIncomingCallAlert
            merchantId={getCurrentStoreId()}
            storeName={currentUser?.storeName || 'ENTREPRISE KONKOBO POUSBILA'}
          />
        </React.Suspense>

        {isSecretAdminModalOpen && (
          <React.Suspense fallback={<LazyModalFallback label="Chargement..." />}>
            <SecretAdminAccessModal
              isOpen={isSecretAdminModalOpen}
              onClose={() => setIsSecretAdminModalOpen(false)}
              onSuccess={() => {
                setIsSecretAdminModalOpen(false);
                setCurrentView('SAAS_ADMIN');
              }}
            />
          </React.Suspense>
        )}

        {/* Assistant IA Juridique & Financier OHADA (Flottant / Draggable) */}
        <React.Suspense fallback={null}>
          <LegalAiAdvisorWidget
            isOpen={isGlobalLegalAiOpen}
            onToggle={() => setIsGlobalLegalAiOpen((prev) => !prev)}
            onClose={() => setIsGlobalLegalAiOpen(false)}
          />
        </React.Suspense>


        {/* Toast Flottant Studio Pub IA Google Flow */}
        <GoogleFlowToast />

        {/* Toast Sécurité & Blocage Démo */}
        {securityToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] max-w-lg w-[92%] sm:w-auto px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white font-bold text-xs sm:text-sm shadow-2xl shadow-orange-950/60 flex items-center gap-3 border border-amber-300/40 animate-in fade-in slide-in-from-top-4 duration-200">
            <Lock className="w-5 h-5 shrink-0 text-amber-200" />
            <span className="leading-snug">{securityToast.message}</span>
            <button
              type="button"
              onClick={() => setSecurityToast(null)}
              className="p-1 hover:bg-white/20 rounded-full transition cursor-pointer ml-auto shrink-0"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal d'Autorisation Master PIN Gérant (Sas de sécurité rôle Caissier) */}
        {managerAuthModal?.isOpen && (
          <ManagerAuthModal
            isOpen={managerAuthModal.isOpen}
            onClose={() => setManagerAuthModal(null)}
            onSuccess={() => {
              const action = managerAuthModal.onSuccess;
              setManagerAuthModal(null);
              action();
            }}
            title={managerAuthModal.title}
            description={managerAuthModal.description}
            actionBadge={managerAuthModal.actionBadge}
            masterPinHashOrCode={currentUser?.masterPin || currentUser?.pinCode}
          />
        )}

        {/* =========================================================================
            TIROIR LATÉRAL NANA ACADÉMIE, MINI-LECTEUR & ASSISTANT SARAH
           ========================================================================= */}
        {renderGlobalAssistantAndAcademy()}
    </div>
    </AuthProvider>
  );
}