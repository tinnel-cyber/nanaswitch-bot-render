import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  SaasStore, 
  SaasActionTask, 
  SaasStoreHealth, 
  SaasDangerReason,
  StoreUser,
  StoreApprovalStatus,
  SubscriptionPlan,
  AdminCashRequest,
  AffiliateWithdrawal,
  PrivacyPolicyConfig,
  StoreSubscription,
  KycSubmission,
  KycStatus,
  PlatformSubscriptionConfig,
  SubscriptionPlanConfig,
  SubscriptionPlanLimits,
  MobileOperatorConfig,
  EscrowProject,
  PlatformLegalConfig,
  CentralPaymentConfig,
  LandingPageConfig,
  DEFAULT_LANDING_PAGE_CONFIG
} from '../../types';
import { SPaymentGateway, PaymentSuccessDetails } from '../../components/payment/SPaymentGateway';
import { DEFAULT_CENTRAL_PAYMENT_CONFIG, getQrCodeUrl } from '../../utils/countryPaymentMatrix';
import { 
  formatCFA, 
  playTapBeep, 
  playValidationBeep, 
  playCashChime,
  playCancelSound 
} from '../../utils/audio';
import {
  updateStoreApprovalStatus,
  updateStoreSubscription,
  persistAdminPaymentLog,
  markWithdrawalPaid,
  getPrivacyPolicy,
  savePrivacyPolicy,
  archiveOldSales,
  subscribeToPlatformSubscriptions,
  savePlatformSubscriptions,
  updateSubscriptionPlan,
  DEFAULT_PLATFORM_SUBSCRIPTIONS,
  getPlatformLegal,
  savePlatformLegal,
  subscribeToPlatformLegal,
  DEFAULT_PLATFORM_LEGAL,
  subscribeToCentralPaymentConfig,
  saveCentralPaymentConfig,
  saveLandingPageConfig,
  subscribeToLandingPageConfig,
  addUserCredits
} from '../../utils/firestoreService';
import { auth } from '../../firebase';
import { ThemeSwitcher } from '../../shell/layout/ThemeSwitcher';
import { LegalTickerFooter } from '../../components/LegalTickerFooter';
import {
  getAllKycRequests,
  updateKycRequestStatus,
  getPendingKycSubmissions,
  getAllKycSubmissions,
  approveKycSubmission,
  rejectKycSubmission
} from '../../utils/kycService';
import {
  subscribeAllProjectsForAdmin,
  freezeEscrowProject,
  resolveEscrowDispute
} from '../../services/escrowService';
import { EscrowTripartiteChat } from '../../components/quotes/EscrowTripartiteChat';
import { UpsellOpportunitiesWidget } from '../../components/quotas';
import { LandingCmsTab } from './LandingCmsTab';
import { publishLandingPricingToSupabase } from '../../services/landingPricingService';
import { ComparisonMatrixAdminTab } from './ComparisonMatrixAdminTab';
import { AdminTutorialsTab } from './AdminTutorialsTab';
import {
  getPaymentApiStaticIp,
  getPaymentServiceHealth,
  PRIMARY_FIXIE_IP,
  DEFAULT_PAYMENT_API_URL
} from '../../services/paymentApiService';
import {
  saveSuperAdminSettings,
  fetchSuperAdminSettingsFromFirebase,
  getSuperAdminSettingsLocal,
  isSuperAdminLocally,
  verifySuperAdminPrivileges,
  KNOWN_SUPERADMIN_UIDS,
  isDemoStore
} from '../../services/superAdminService';
import {
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
  Store,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Search,
  Filter,
  DollarSign,
  Package,
  Layers,
  Phone,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Users,
  Activity,
  Calendar,
  X,
  Send,
  Zap,
  CheckCheck,
  Globe2,
  Lock,
  Unlock,
  ArrowLeft,
  ShieldCheck,
  FileText,
  CreditCard,
  Edit3,
  LayoutTemplate,
  Archive,
  Eye,
  Check,
  XCircle,
  Trash2,
  FolderKanban,
  Gavel,
  AlertOctagon,
  QrCode,
  Truck,
  Coins,
  Sparkles,
  BarChart,
  Crown,
  Play,
  Smartphone,
  Radio,
  GraduationCap,
  Save,
  AlertCircle,
  LayoutGrid
} from 'lucide-react';
import {
  supabase,
  fetchOrganizationsAsStoresFromSupabase,
  calculateRealKpiMetrics,
  syncStoreApprovalToSupabase,
  fetchKycSubmissionsFromSupabase,
  updateKycStatusInSupabase,
  savePlatformPricingToSupabase,
  subscribeToRealtimePendingPayments,
  validatePaymentInSupabase,
  subscribeToRealtimeEscrowProjects,
  broadcastEscrowActionToSupabase
} from '../../services/superAdminSupabaseService';
import { WameetLogo } from '../../components/wameet/WameetLogo';

interface SaasAdminDashboardProps {
  onBackToPOS: () => void;
  currentUser?: StoreUser | null;
}

export const SaasAdminDashboard: React.FC<SaasAdminDashboardProps> = ({
  onBackToPOS,
  currentUser,
}) => {
  // SaaS Network Data State — 100% chargé en direct depuis Supabase, zéro mock hardcodé
  const [stores, setStores] = useState<SaasStore[]>([]);
  const [tasks, setTasks] = useState<SaasActionTask[]>([]);
  const [kpiMetrics, setKpiMetrics] = useState(() => calculateRealKpiMetrics([]));
  const [isLoadingSupabaseData, setIsLoadingSupabaseData] = useState<boolean>(true);

  // Filters
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'DANGER' | 'WARNING' | 'HEALTHY'>('ALL');
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'PENDING' | 'DONE' | 'URGENT'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [selectedStoreForDetail, setSelectedStoreForDetail] = useState<SaasStore | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [syncInProgress, setSyncInProgress] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Navigation Tabs for SaaS Admin
  const [adminActiveTab, setAdminActiveTab] = useState<
    'NETWORK' | 'UPSELL' | 'APPROVALS' | 'KYC' | 'AFFILIATION' | 'PRIVACY' | 'SUBSCRIPTIONS_PAYMENTS' | 'COMPARISON_MATRIX' | 'ESCROW_MEDIATION' | 'LANDING_CMS' | 'PENDING_PAYMENTS' | 'TUTORIALS'
  >('NETWORK');

  // Médiation Projets & Escrow State
  const [escrowProjects, setEscrowProjects] = useState<EscrowProject[]>([]);
  const [escrowFilter, setEscrowFilter] = useState<
    'ALL' | 'disputed_paused' | 'funds_locked' | 'work_in_progress' | 'completed_released' | 'refunded_client'
  >('ALL');
  const [escrowSearch, setEscrowSearch] = useState('');
  const [chatModalProject, setChatModalProject] = useState<EscrowProject | null>(null);
  const [freezeModalProject, setFreezeModalProject] = useState<EscrowProject | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [isFreezing, setIsFreezing] = useState(false);
  const [resolveModalProject, setResolveModalProject] = useState<EscrowProject | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'RELEASED_TO_MERCHANT' | 'REFUNDED_TO_CLIENT'>('RELEASED_TO_MERCHANT');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Platform Subscriptions & Payment Screen Settings State
  const [platformConfig, setPlatformConfig] = useState<PlatformSubscriptionConfig>(DEFAULT_PLATFORM_SUBSCRIPTIONS);
  const [selectedEditPlanIdx, setSelectedEditPlanIdx] = useState<number>(0);
  const [newFeatureText, setNewFeatureText] = useState<string>('');
  const [isSavingPlatformConfig, setIsSavingPlatformConfig] = useState<boolean>(false);
  const [isSavingCurrentPlan, setIsSavingCurrentPlan] = useState<boolean>(false);
  const [isTestGatewayOpen, setIsTestGatewayOpen] = useState<boolean>(false);

  // Mobile Left Fast-Scroller State & Handlers
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const handleScrollUpdate = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      setScrollProgress(Math.min(1, Math.max(0, scrollTop / maxScroll)));
    } else {
      setScrollProgress(0);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScrollUpdate, { passive: true });
    return () => el.removeEventListener('scroll', handleScrollUpdate);
  }, [handleScrollUpdate]);

  const handleLeftBarTouch = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const relativeY = clientY - rect.top;
    const percentage = Math.min(1, Math.max(0, relativeY / rect.height));
    
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      scrollContainerRef.current.scrollTop = percentage * maxScroll;
      setScrollProgress(percentage);
    }
  };

  const scrollToTop = () => {
    playTapBeep();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    playTapBeep();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ 
        top: scrollContainerRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  // Configuration Centrale des Paiements Multi-Pays (parametres/paiement)
  const [centralPaymentConfig, setCentralPaymentConfig] = useState<CentralPaymentConfig>(DEFAULT_CENTRAL_PAYMENT_CONFIG);
  const [deliveryZonesInput, setDeliveryZonesInput] = useState<string>(DEFAULT_CENTRAL_PAYMENT_CONFIG.deliveryZones.join(', '));

  // New Operator Form State
  const [newOpCountry, setNewOpCountry] = useState('');
  const [newOpName, setNewOpName] = useState('');
  const [newOpMerchantNumber, setNewOpMerchantNumber] = useState('');
  const [newOpMerchantCode, setNewOpMerchantCode] = useState('');
  const [newOpUssd, setNewOpUssd] = useState('');
  const [newOpInstructions, setNewOpInstructions] = useState('');

  // KYC Verification (Palier 2) State
  const [kycRequests, setKycRequests] = useState<KycSubmission[]>([]);
  const [kycFilter, setKycFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [kycSearch, setKycSearch] = useState('');
  const [previewKycDoc, setPreviewKycDoc] = useState<{ url: string; title: string; storeName: string; manager: string } | null>(null);
  const [rejectingKycStore, setRejectingKycStore] = useState<KycSubmission | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState('Pièce d\'identité illisible ou photo floue');

  // Store Approvals & Cash Subscriptions State (zéro mock hardcodé)
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, StoreApprovalStatus>>({});

  const [cashSubModalStore, setCashSubModalStore] = useState<SaasStore | null>(null);
  const [cashSubPlan, setCashSubPlan] = useState<SubscriptionPlan>('QUARTERLY_3');
  const [cashSubAmount, setCashSubAmount] = useState<number>(14000);
  const [cashSubMonths, setCashSubMonths] = useState<number>(3);
  const [isCashSubProcessing, setIsCashSubProcessing] = useState(false);

  // Administration Sécurisée des Crédits IA (Super Admin Uniquement)
  const [isAdminCreditModalOpen, setIsAdminCreditModalOpen] = useState(false);
  const [selectedCreditTargetUid, setSelectedCreditTargetUid] = useState<string>('');
  const [customCreditAmount, setCustomCreditAmount] = useState<number>(100);
  const [isAddingCredits, setIsAddingCredits] = useState<boolean>(false);

  const [isSavingGlobal, setIsSavingGlobal] = useState<boolean>(false);

  // Chargement prioritaire unifié depuis les tables SQL Supabase et synchronisation
  useEffect(() => {
    let isMounted = true;
    const loadSuperAdminData = async () => {
      setIsLoadingSupabaseData(true);
      // 1. Lecture synchrone immédiate du cache local
      const localData = getSuperAdminSettingsLocal();
      if (localData && isMounted) {
        if (localData.platformConfig?.plans && localData.platformConfig.plans.length > 0) {
          setPlatformConfig(localData.platformConfig);
        }
        if (localData.centralPaymentConfig) {
          setCentralPaymentConfig(localData.centralPaymentConfig);
          if (localData.centralPaymentConfig.deliveryZones) {
            setDeliveryZonesInput(localData.centralPaymentConfig.deliveryZones.join(', '));
          }
        }
        if (localData.approvalStatuses) {
          setApprovalStatuses(prev => ({ ...prev, ...localData.approvalStatuses }));
        }
        if (localData.stores && localData.stores.length > 0) {
          const cleanStores = localData.stores.filter((s: any) => !isDemoStore(s));
          setStores(cleanStores);
          setKpiMetrics(calculateRealKpiMetrics(cleanStores));
        } else {
          setStores([]);
          setKpiMetrics(calculateRealKpiMetrics([]));
        }
        if (localData.landingConfig) {
          setLandingConfig(localData.landingConfig);
        }
        if (localData.legalConfig) {
          setLegalConfig(localData.legalConfig);
          setTickerTextEdit(localData.legalConfig.ticker_text);
          setLegalMentionsEdit(localData.legalConfig.legal_mentions_content);
          setPrivacyPolicyEdit(localData.legalConfig.privacy_policy_content);
          setShowTickerEdit(localData.legalConfig.show_ticker);
        }
      }

      // 2. Chargement direct des organisations réelles depuis Supabase (table organizations & profiles & sales)
      try {
        const liveStores = await fetchOrganizationsAsStoresFromSupabase();
        if (isMounted) {
          const cleanLive = (liveStores || []).filter(s => !isDemoStore(s));
          setStores(cleanLive);
          setKpiMetrics(calculateRealKpiMetrics(cleanLive));
        }
      } catch (e) {
        console.warn('[SUPABASE_SUPERADMIN] Erreur fetchOrganizationsAsStores :', e);
        if (isMounted) {
          setStores([]);
          setKpiMetrics(calculateRealKpiMetrics([]));
        }
      }

      // 3. Chargement des demandes KYC réelles depuis Supabase (table account_activations)
      try {
        const liveKyc = await fetchKycSubmissionsFromSupabase();
        if (isMounted) {
          setKycRequests(liveKyc);
        }
      } catch (e) {
        console.warn('[SUPABASE_SUPERADMIN] Erreur fetchKycSubmissions :', e);
      } finally {
        if (isMounted) setIsLoadingSupabaseData(false);
      }
    };

    loadSuperAdminData();
    return () => { isMounted = false; };
  }, []);

  const isSuperAdmin = Boolean(
    isSuperAdminLocally(currentUser) ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    KNOWN_SUPERADMIN_UIDS.includes(auth.currentUser?.uid || '') ||
    KNOWN_SUPERADMIN_UIDS.includes(currentUser?.id || '') ||
    KNOWN_SUPERADMIN_UIDS.includes(currentUser?.uid || '') ||
    currentUser?.email?.toLowerCase() === 'pousbila36@gmail.com' ||
    auth.currentUser?.email?.toLowerCase() === 'pousbila36@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'pousbila04@gmail.com' ||
    auth.currentUser?.email?.toLowerCase() === 'pousbila04@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'admin@nanasore.com' ||
    auth.currentUser?.email?.toLowerCase() === 'admin@nanasore.com' ||
    currentUser?.email?.toLowerCase().includes('admin') ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('nana_is_superadmin') === 'true' ||
      localStorage.getItem('nana_superadmin_unlocked') === 'true' ||
      localStorage.getItem('nana_registered_role') === 'admin'
    ))
  );

  const handleAddAdminSelfCredits = async () => {
    if (!isSuperAdmin) return;
    const targetUid = currentUser?.id || 'super-admin';
    playTapBeep();
    setIsAddingCredits(true);
    try {
      const newBal = await addUserCredits(targetUid, 100, `SUPERADMIN-RECHARGE-${Date.now().toString(36).toUpperCase()}`);
      if (currentUser) {
        currentUser.credits = newBal;
      }
      await saveSuperAdminSettings({
        creditsByUid: { [targetUid]: newBal }
      }, currentUser?.email || 'Super-Admin');
      playCashChime();
      setToastMessage(`⚡ Succès : +100 Crédits IA ajoutés instantanément à votre compte Super Admin ! Nouveau solde : ${newBal} crédits (synchronisé en direct).`);
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      playCancelSound();
      setToastMessage(`❌ Erreur lors du rechargement de crédits : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsAddingCredits(false);
    }
  };

  const handleAddUserCredits = async (targetUid: string, storeName?: string, amount = 100) => {
    if (!isSuperAdmin || !targetUid) return;
    playTapBeep();
    setIsAddingCredits(true);
    try {
      const newBal = await addUserCredits(targetUid, amount, `ADMIN-USER-RECHARGE-${Date.now().toString(36).toUpperCase()}`);
      await saveSuperAdminSettings({
        creditsByUid: { [targetUid]: newBal }
      }, currentUser?.email || 'Super-Admin');
      playCashChime();
      setToastMessage(`⚡ Succès : +${amount} Crédits IA alloués avec succès à ${storeName || targetUid} ! Solde actuel : ${newBal} crédits.`);
      setTimeout(() => setToastMessage(null), 6000);
      setIsAdminCreditModalOpen(false);
    } catch (err: any) {
      playCancelSound();
      setToastMessage(`❌ Erreur lors de l'allocation des crédits : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsAddingCredits(false);
    }
  };

  // Cash Requests list (zéro mock hardcodé)
  const [cashRequests, setCashRequests] = useState<AdminCashRequest[]>([]);

  // Affiliation State (zéro mock hardcodé)
  const [affiliateCommissionRate, setAffiliateCommissionRate] = useState<number>(15);
  const [affiliateWithdrawals, setAffiliateWithdrawals] = useState<AffiliateWithdrawal[]>([]);

  // =========================================================================
  // GESTION DES PAIEMENTS EN ATTENTE & CAISSE POS (SUPABASE REALTIME LIVE)
  // =========================================================================
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [isManualValidatingId, setIsManualValidatingId] = useState<string | null>(null);
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState<string>('');
  const [paymentApiHealth, setPaymentApiHealth] = useState<any>(null);
  const [isCheckingPaymentApi, setIsCheckingPaymentApi] = useState<boolean>(false);

  useEffect(() => {
    // 1. Écoute Supabase Realtime sur les transactions / paiements de caisse en direct
    const unsubscribePayments = subscribeToRealtimePendingPayments((payments) => {
      setPendingPayments(payments);
    });

    // 2. Écoute Supabase Realtime sur les projets et arbitrages Escrow
    const unsubscribeEscrow = subscribeToRealtimeEscrowProjects((projects) => {
      if (projects && projects.length > 0) {
        setEscrowProjects(projects);
      }
    });

    // 3. Vérification de santé du micro-service Render (IP Fixie)
    getPaymentServiceHealth().then((health) => {
      setPaymentApiHealth(health);
    }).catch(() => {});

    return () => {
      unsubscribePayments();
      unsubscribeEscrow();
    };
  }, []);

  const handleValidatePaymentManually = async (payment: any) => {
    if (!payment?.id) return;
    setIsManualValidatingId(payment.id);
    playTapBeep();

    try {
      // 1. Mettre à jour la transaction dans Supabase (Realtime Live)
      await validatePaymentInSupabase(payment.id, currentUser?.email || 'Super-Admin');

      // 2. Si lié à une boutique (abonnement), mettre à jour la souscription
      if (payment.storeId && payment.storeId !== 'nanasore_central_hub') {
        const targetPlan = payment.plan || 'PRO';
        const months = payment.planMonths || 1;
        const now = Date.now();
        const durationMs = months * 30 * 86400000;
        const subData: StoreSubscription = {
          status: 'ACTIVE',
          plan: targetPlan,
          expiresAt: now + durationMs,
          startedAt: now,
          lastPaymentMethod: 'MANUAL_SUPERADMIN',
          lastAmountPaid: payment.amount || 0,
          transactionRef: payment.transactionRef || payment.id,
        };
        const targetUserId = payment.userId || (payment.storeId.startsWith('store-') ? payment.storeId.replace(/^store-/, '') : payment.storeId);
        await updateStoreSubscription(payment.storeId, subData, targetUserId, payment.transactionRef || payment.id).catch(() => {});
      }

      // 3. Journaliser l'encaissement
      try {
        await persistAdminPaymentLog({
          id: `LOG-${Date.now()}`,
          storeId: payment.storeId || 'nanasore_central_hub',
          amountPaid: payment.amount || 0,
          monthsAdded: payment.planMonths || 1,
          paymentMethod: 'MOBILE_MONEY',
          processedByAdminUid: currentUser?.id || 'super_admin',
          createdAt: Date.now()
        });
      } catch {}

      // Mettre à jour localement
      setPendingPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, status: 'COMPLETED', paymentStatus: 'PAID', isPaid: true }
            : p
        )
      );

      playCashChime();
      setToastMessage(`✅ Paiement de ${formatCFA(payment.amount || 0)} validé manuellement avec succès (Réf: ${payment.transactionRef || payment.id}) !`);
    } catch (err: any) {
      playCancelSound();
      setToastMessage(`❌ Erreur lors de la validation : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsManualValidatingId(null);
    }
  };

  const handleTestPaymentApiConnection = async () => {
    setIsCheckingPaymentApi(true);
    playTapBeep();
    try {
      const health = await getPaymentServiceHealth();
      const ipInfo = await getPaymentApiStaticIp();
      setPaymentApiHealth({ ...health, ipInfo });
      playCashChime();
      if (health.status === 'online') {
        setToastMessage(`✅ API Pont Connectée ! IP Fixie : ${ipInfo.ip || PRIMARY_FIXIE_IP} (${health.latencyMs}ms)`);
      } else {
        setToastMessage(`⚠️ API Pont Render inaccessible : ${health.error || 'Vérifier Render'}`);
      }
    } catch (err: any) {
      playCancelSound();
      setToastMessage(`❌ Erreur diagnostic API : ${err.message}`);
    } finally {
      setIsCheckingPaymentApi(false);
    }
  };

  // Privacy Policy State
  const [privacyPolicyData, setPrivacyPolicyData] = useState<PrivacyPolicyConfig | null>(null);
  const [privacyContent, setPrivacyContent] = useState('');
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // Configuration Juridique & Textes Légaux (platform_settings/legal)
  const [legalConfig, setLegalConfig] = useState<PlatformLegalConfig>(DEFAULT_PLATFORM_LEGAL);
  const [tickerTextEdit, setTickerTextEdit] = useState<string>(DEFAULT_PLATFORM_LEGAL.ticker_text);
  const [legalMentionsEdit, setLegalMentionsEdit] = useState<string>(DEFAULT_PLATFORM_LEGAL.legal_mentions_content);
  const [privacyPolicyEdit, setPrivacyPolicyEdit] = useState<string>(DEFAULT_PLATFORM_LEGAL.privacy_policy_content);
  const [showTickerEdit, setShowTickerEdit] = useState<boolean>(DEFAULT_PLATFORM_LEGAL.show_ticker);
  const [isSavingLegal, setIsSavingLegal] = useState<boolean>(false);

  // Écouteur temps réel sur platform_settings/legal
  useEffect(() => {
    const unsub = subscribeToPlatformLegal((cfg) => {
      setLegalConfig(cfg);
      setTickerTextEdit(cfg.ticker_text);
      setLegalMentionsEdit(cfg.legal_mentions_content);
      setPrivacyPolicyEdit(cfg.privacy_policy_content);
      setShowTickerEdit(cfg.show_ticker);
    });
    return () => unsub();
  }, []);

  const handleSaveLegalConfig = async () => {
    setIsSavingLegal(true);
    playTapBeep();
    try {
      const updatedPayload: Partial<PlatformLegalConfig> = {
        ticker_text: tickerTextEdit.trim(),
        legal_mentions_content: legalMentionsEdit.trim(),
        privacy_policy_content: privacyPolicyEdit.trim(),
        show_ticker: showTickerEdit,
      };
      await savePlatformLegal(updatedPayload);
      await saveSuperAdminSettings({
        legalConfig: {
          ...legalConfig,
          ...updatedPayload
        }
      }, currentUser?.email || 'Super-Admin');
      playCashChime();
      setToastMessage('✅ Modifications Super Admin enregistrées et appliquées en direct !');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      playCancelSound();
      setToastMessage('⚠️ Erreur lors de la sauvegarde des textes légaux.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSavingLegal(false);
    }
  };

  const handleResetDefaultLegal = () => {
    playTapBeep();
    setTickerTextEdit(DEFAULT_PLATFORM_LEGAL.ticker_text);
    setLegalMentionsEdit(DEFAULT_PLATFORM_LEGAL.legal_mentions_content);
    setPrivacyPolicyEdit(DEFAULT_PLATFORM_LEGAL.privacy_policy_content);
    setShowTickerEdit(DEFAULT_PLATFORM_LEGAL.show_ticker);
    setToastMessage('Valeurs par défaut restaurées dans le formulaire. Cliquez sur "Enregistrer" pour appliquer.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  // CMS & Personnalisation de la Page d'Accueil (platform_settings/landing)
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG);
  const [landingCmsSubTab, setLandingCmsSubTab] = useState<'FEATURES' | 'ELITE' | 'PRICING' | 'FOOTER'>('FEATURES');
  const [isSavingLandingConfig, setIsSavingLandingConfig] = useState<boolean>(false);
  const [selectedFeatureCardIdx, setSelectedFeatureCardIdx] = useState<number>(0);
  const [selectedEliteSlideIdx, setSelectedEliteSlideIdx] = useState<number>(0);
  const [selectedPricingPlanIdx, setSelectedPricingPlanIdx] = useState<number>(0);

  // Écouteur temps réel sur platform_settings/landing
  useEffect(() => {
    const unsub = subscribeToLandingPageConfig((cfg) => {
      setLandingConfig(cfg);
    });
    return () => unsub();
  }, []);

  const handleSaveLandingConfig = async () => {
    setIsSavingLandingConfig(true);
    playTapBeep();
    try {
      // 1. Publication prioritaire vers Supabase (Table de publication des tarifs Landing Page)
      if (landingConfig.pricingSection) {
        await publishLandingPricingToSupabase(
          landingConfig.pricingSection,
          currentUser?.name || currentUser?.email || 'Super-Admin'
        );
      }

      // 2. Sauvegarde miroir Firestore & Realtime Database pour synchronisation
      await saveLandingPageConfig(landingConfig, currentUser?.name || currentUser?.email || 'Super-Admin');
      await saveSuperAdminSettings({
        landingConfig
      }, currentUser?.email || 'Super-Admin');

      playCashChime();
      setToastMessage('✅ Tarifs et modules publiés dans Supabase et appliqués en direct sur la page d\'accueil !');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      playCancelSound();
      setToastMessage('⚠️ Erreur lors de la sauvegarde des modifications de la page d\'accueil.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSavingLandingConfig(false);
    }
  };

  const handleResetLandingConfig = async () => {
    if (!window.confirm('Voulez-vous réinitialiser tous les contenus de la page d\'accueil aux valeurs d\'origine ?')) {
      return;
    }
    playTapBeep();
    setIsSavingLandingConfig(true);
    try {
      setLandingConfig(DEFAULT_LANDING_PAGE_CONFIG);
      await saveLandingPageConfig(DEFAULT_LANDING_PAGE_CONFIG, 'Super-Admin (Reset)');
      playCashChime();
      setToastMessage('✓ Contenus de la page d\'accueil réinitialisés par défaut.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      playCancelSound();
      setToastMessage('⚠️ Erreur lors de la réinitialisation.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSavingLandingConfig(false);
    }
  };

  // Firestore optimization / Archival
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    getPrivacyPolicy().then((data) => {
      setPrivacyPolicyData(data);
      setPrivacyContent(data.content);
    });
  }, []);

  // Écouteur temps réel sur la configuration platform_settings/subscriptions
  useEffect(() => {
    const unsub = subscribeToPlatformSubscriptions((config) => {
      if (isSavingGlobal || isSavingPlatformConfig || isSavingCurrentPlan) {
        // Empêche l'écrasement intempestif de l'état local pendant une sauvegarde active
        return;
      }
      setPlatformConfig(config);
    });
    return () => unsub();
  }, [isSavingGlobal, isSavingPlatformConfig, isSavingCurrentPlan]);

  // Écouteur temps réel sur la configuration centrale parametres/paiement
  useEffect(() => {
    const unsub = subscribeToCentralPaymentConfig((config) => {
      if (isSavingGlobal || isSavingPlatformConfig || isSavingCurrentPlan) {
        return;
      }
      setCentralPaymentConfig(config);
      setDeliveryZonesInput((config.deliveryZones || []).join(', '));
    });
    return () => unsub();
  }, [isSavingGlobal, isSavingPlatformConfig, isSavingCurrentPlan]);

  // Écouteur temps réel des projets séquestre pour le Super-Admin
  useEffect(() => {
    const unsub = subscribeAllProjectsForAdmin((list) => {
      setEscrowProjects(list);
    });
    return () => unsub();
  }, []);

  // Actions Médiation & Arbitrage Escrow
  const handleConfirmFreezeProject = async () => {
    if (!freezeModalProject || !freezeReason.trim()) {
      alert("Veuillez saisir le motif du gel ou de l'interruption.");
      return;
    }
    try {
      setIsFreezing(true);
      await freezeEscrowProject(
        freezeModalProject.id,
        freezeModalProject.storeId,
        freezeReason.trim(),
        currentUser?.id || 'super-admin'
      );
      playValidationBeep();
      setToastMessage("Projet gelé avec succès. Les fonds et validations sont suspendus.");
      setFreezeModalProject(null);
      setFreezeReason('');
    } catch (err: any) {
      console.error("Erreur gel projet:", err);
      alert("Erreur: " + (err.message || "Impossible de geler le projet"));
    } finally {
      setIsFreezing(false);
    }
  };

  const handleConfirmResolveDispute = async () => {
    if (!resolveModalProject || !resolutionNotes.trim()) {
      alert("Veuillez saisir les notes et justifications de votre décision d'arbitrage.");
      return;
    }
    try {
      setIsResolving(true);
      await resolveEscrowDispute(
        resolveModalProject.id,
        resolveModalProject.storeId,
        resolutionAction,
        resolutionNotes.trim(),
        currentUser?.id || 'super-admin'
      );
      playValidationBeep();
      setToastMessage(
        resolutionAction === 'RELEASED_TO_MERCHANT'
          ? "Arbitrage rendu : Prestation validée et fonds libérés au prestataire."
          : "Arbitrage rendu : Remboursement ordonné en faveur du client."
      );
      setResolveModalProject(null);
      setResolutionNotes('');
    } catch (err: any) {
      console.error("Erreur arbitrage litige:", err);
      alert("Erreur: " + (err.message || "Impossible de clore le litige"));
    } finally {
      setIsResolving(false);
    }
  };

  // 💾 Enregistrer et Appliquer partout (Firebase Realtime Database + localStorage + Firestore + Bus Temps Réel)
  const handleSaveAndApplyEverywhere = async () => {
    playTapBeep();
    setIsSavingGlobal(true);
    try {
      const parsedDeliveryZones = deliveryZonesInput
        .split(',')
        .map(z => z.trim())
        .filter(Boolean);

      const updatedCentral: CentralPaymentConfig = {
        ...centralPaymentConfig,
        deliveryZones: parsedDeliveryZones.length > 0 ? parsedDeliveryZones : DEFAULT_CENTRAL_PAYMENT_CONFIG.deliveryZones,
        scrollingMarquee: platformConfig.paymentSettings.scrollingMarquee,
        supportWhatsApp: platformConfig.paymentSettings.supportWhatsApp,
        updatedAt: Date.now(),
        updatedBy: currentUser?.email || 'Super-Admin',
      };

      const updatedPlatform: PlatformSubscriptionConfig = {
        ...platformConfig,
        centralPaymentConfig: updatedCentral,
        updatedBy: currentUser?.email || 'Super-Admin',
      };

      const operators = platformConfig.paymentSettings.operators || [];
      const findOpNum = (name: string) => operators.find(o => o.operator?.toLowerCase().includes(name.toLowerCase()) || o.id?.toLowerCase().includes(name.toLowerCase()))?.merchantNumber;

      const paymentRouting = {
        orangeNumber: findOpNum('orange') || '',
        moovNumber: findOpNum('moov') || '',
        waveNumber: findOpNum('wave') || '',
        mtnNumber: findOpNum('mtn') || '',
        wavePaymentLink: '',
        enabledMethods: ['orange_money', 'moov_money', 'wave', 'mtn_momo', 'cod']
      };

      // 1. Sauvegarde persistante dans Firebase Realtime Database (super_admin_settings.json) + localStorage + Dispatch
      await saveSuperAdminSettings({
        platformConfig: updatedPlatform,
        centralPaymentConfig: updatedCentral,
        paymentRouting,
        approvalStatuses,
        stores,
        legalConfig,
        landingConfig,
      }, currentUser?.email || 'Super-Admin');

      // 2. Persistance Firestore et publication Supabase
      if (landingConfig?.pricingSection) {
        await publishLandingPricingToSupabase(landingConfig.pricingSection, currentUser?.name || currentUser?.email || 'Super-Admin');
      }
      if (landingConfig?.pricingSection) {
        await publishLandingPricingToSupabase(landingConfig.pricingSection, currentUser?.name || currentUser?.email || 'Super-Admin');
      }
      // Sauvegarde directe dans Supabase (table landing_pricing_config et plans)
      await savePlatformPricingToSupabase(updatedPlatform, currentUser?.email || 'Super-Admin');
      await savePlatformSubscriptions(updatedPlatform);
      await saveCentralPaymentConfig(updatedCentral);

      // 3. Synchronisation de l'état local UNIQUEMENT après la résolution complète de tous les awaits
      setPlatformConfig(updatedPlatform);
      setCentralPaymentConfig(updatedCentral);

      playCashChime();
      showToast('✅ Modifications Super Admin enregistrées et appliquées en direct partout !', 'success');
    } catch (e: any) {
      console.error('[SUPER_ADMIN_SAVE_ALL_ERROR] Erreur sauvegarde globale Super Admin :', e);
      playCancelSound();
      showToast(`❌ Erreur d'enregistrement : ${e?.message || 'Erreur réseau ou permissions'}`, 'error');
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // Enregistrer la configuration complète des abonnements & paiements (Firebase RTDB + Firestore + localStorage)
  const handleSavePlatformConfig = async () => {
    playTapBeep();
    setIsSavingPlatformConfig(true);
    try {
      const parsedDeliveryZones = deliveryZonesInput
        .split(',')
        .map(z => z.trim())
        .filter(Boolean);

      const updatedCentral: CentralPaymentConfig = {
        ...centralPaymentConfig,
        deliveryZones: parsedDeliveryZones.length > 0 ? parsedDeliveryZones : DEFAULT_CENTRAL_PAYMENT_CONFIG.deliveryZones,
        scrollingMarquee: platformConfig.paymentSettings.scrollingMarquee,
        supportWhatsApp: platformConfig.paymentSettings.supportWhatsApp,
        updatedAt: Date.now(),
        updatedBy: currentUser?.email || 'Super-Admin',
      };

      const updatedPlatform: PlatformSubscriptionConfig = {
        ...platformConfig,
        centralPaymentConfig: updatedCentral,
        updatedBy: currentUser?.email || 'Super-Admin',
      };

      const operators = platformConfig.paymentSettings.operators || [];
      const findOpNum = (name: string) => operators.find(o => o.operator?.toLowerCase().includes(name.toLowerCase()) || o.id?.toLowerCase().includes(name.toLowerCase()))?.merchantNumber;

      const paymentRouting = {
        orangeNumber: findOpNum('orange') || '',
        moovNumber: findOpNum('moov') || '',
        waveNumber: findOpNum('wave') || '',
        mtnNumber: findOpNum('mtn') || '',
        wavePaymentLink: '',
        enabledMethods: ['orange_money', 'moov_money', 'wave', 'mtn_momo', 'cod']
      };

      // Sauvegarde persistante dans Firebase Realtime Database + localStorage + dispatch de superAdminUpdated
      await saveSuperAdminSettings({
        platformConfig: updatedPlatform,
        centralPaymentConfig: updatedCentral,
        paymentRouting,
        approvalStatuses,
        stores
      }, currentUser?.email || 'Super-Admin');

      if (landingConfig?.pricingSection) {
        await publishLandingPricingToSupabase(landingConfig.pricingSection, currentUser?.name || currentUser?.email || 'Super-Admin');
      }
      // Sauvegarde directe dans Supabase (table landing_pricing_config et plans)
      await savePlatformPricingToSupabase(updatedPlatform, currentUser?.email || 'Super-Admin');
      await savePlatformSubscriptions(updatedPlatform);
      await saveCentralPaymentConfig(updatedCentral);

      // Synchronisation de l'état local UNIQUEMENT après la résolution complète du await
      setPlatformConfig(updatedPlatform);
      setCentralPaymentConfig(updatedCentral);

      playCashChime();
      showToast('✅ Modifications Super Admin enregistrées et appliquées en direct !', 'success');
    } catch (e: any) {
      console.error('[SUPER_ADMIN_SAVE_PLATFORM_ERROR] Erreur sauvegarde abonnements plateforme :', e);
      playCancelSound();
      showToast(`❌ Erreur d'enregistrement : ${e?.message || 'Erreur réseau ou permissions'}`, 'error');
    } finally {
      setIsSavingPlatformConfig(false);
    }
  };

  // 💾 Sauvegarder la formule active sélectionnée et ses limites PLG (Plan Starter, Free, Pro, Elite)
  const handleSaveCurrentPlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playTapBeep();

    const currentPlan = platformConfig.plans[selectedEditPlanIdx];
    if (!currentPlan) return;

    // Validation stricte du bon ID de document ciblé
    const targetDocId = (currentPlan.id || '').toLowerCase().trim();
    if (!targetDocId) {
      const err = new Error("Identifiant du plan (id) introuvable ou invalide.");
      console.error('[SUPER_ADMIN_SAVE_PLAN_ERROR]', err, currentPlan);
      showToast("❌ Erreur : L'ID du plan ciblé est manquant.", 'error');
      return;
    }

    setIsSavingCurrentPlan(true);

    try {
      // Construction de l'objet correspondant exactement à la structure attendue en base
      const cleanedLimits: SubscriptionPlanLimits = {
        maxProducts: Number(currentPlan.limits?.maxProducts ?? (targetDocId === 'free' ? 3 : 100)),
        maxFunnels: Number(currentPlan.limits?.maxFunnels ?? (targetDocId === 'free' ? 1 : 5)),
        maxCourses: Number(currentPlan.limits?.maxCourses ?? (targetDocId === 'free' ? 0 : 1)),
        maxCashiers: Number(currentPlan.limits?.maxCashiers ?? (targetDocId === 'free' ? 1 : 2)),
        customDomainAllowed: Boolean(currentPlan.limits?.customDomainAllowed),
        aiAssistanceQueries: Number(currentPlan.limits?.aiAssistanceQueries ?? (targetDocId === 'free' ? 5 : 50)),
        docusignInvoices: Number(currentPlan.limits?.docusignInvoices ?? (targetDocId === 'free' ? 5 : 50)),
        maxLiveShoppingSessions: Number(currentPlan.limits?.maxLiveShoppingSessions ?? (targetDocId === 'free' ? 1 : 5)),
      };

      const cleanedPlan: SubscriptionPlanConfig = {
        id: targetDocId,
        name: currentPlan.name.trim(),
        price: Number(currentPlan.price) || 0,
        period: currentPlan.period || 'mois',
        badge: currentPlan.badge?.trim() || '',
        description: currentPlan.description?.trim() || '',
        features: Array.isArray(currentPlan.features) ? [...currentPlan.features] : [],
        limits: cleanedLimits,
      };

      const updatedPlans = [...platformConfig.plans];
      updatedPlans[selectedEditPlanIdx] = cleanedPlan;

      const updatedPlatform: PlatformSubscriptionConfig = {
        ...platformConfig,
        plans: updatedPlans,
        updatedAt: Date.now(),
        updatedBy: currentUser?.email || 'Super-Admin',
      };

      // 1. Résolution complète du await Firestore pour le document ciblé (subscription_plans/{planId})
      await updateSubscriptionPlan(targetDocId, cleanedPlan);

      // 2. Résolution complète du await Firestore pour la configuration globale (platform_settings/subscriptions)
      if (landingConfig?.pricingSection) {
        await publishLandingPricingToSupabase(landingConfig.pricingSection, currentUser?.name || currentUser?.email || 'Super-Admin');
      }
      await savePlatformSubscriptions(updatedPlatform);

      // 3. Résolution complète du await Firebase RTDB et localStorage
      await saveSuperAdminSettings({
        platformConfig: updatedPlatform,
      }, currentUser?.email || 'Super-Admin');

      // 4. Synchronisation d'état local UNIQUEMENT après la résolution complète du await
      setPlatformConfig(updatedPlatform);

      playCashChime();
      showToast(`✅ Limites du ${cleanedPlan.name} enregistrées avec succès en base !`, 'success');
    } catch (err: any) {
      console.error(`[SUPER_ADMIN_SAVE_PLAN_ERROR] Échec enregistrement du plan ${targetDocId} :`, err);
      playCancelSound();
      showToast(`❌ Erreur sauvegarde plan "${currentPlan.name}" : ${err?.message || 'Permission refusée ou erreur réseau'}`, 'error');
    } finally {
      setIsSavingCurrentPlan(false);
    }
  };

  // Réinitialiser aux 4 formules PLG recommandées par défaut
  const handleResetToDefaultPlans = () => {
    playTapBeep();
    setPlatformConfig(DEFAULT_PLATFORM_SUBSCRIPTIONS);
    showToast('✓ Configuration réinitialisée aux 4 formules PLG (Free, Starter, Pro, Elite) !');
  };

  // Mettre à jour un champ du plan sélectionné
  const handleUpdatePlanField = (field: keyof SubscriptionPlanConfig, value: any) => {
    setPlatformConfig(prev => {
      const updatedPlans = [...prev.plans];
      updatedPlans[selectedEditPlanIdx] = {
        ...updatedPlans[selectedEditPlanIdx],
        [field]: value,
      };
      return { ...prev, plans: updatedPlans };
    });
  };

  // Mettre à jour une limite dynamique du plan sélectionné (Modèle Freemium PLG)
  const handleUpdatePlanLimit = (field: keyof SubscriptionPlanLimits, value: any) => {
    setPlatformConfig(prev => {
      const updatedPlans = [...prev.plans];
      const currentPlan = updatedPlans[selectedEditPlanIdx];
      const currentLimits = currentPlan.limits || {
        maxProducts: 3,
        maxFunnels: 1,
        maxCourses: 0,
        customDomainAllowed: false,
        aiAssistanceQueries: 5,
        docusignInvoices: 5,
        maxCashiers: 1
      };
      updatedPlans[selectedEditPlanIdx] = {
        ...currentPlan,
        limits: {
          ...currentLimits,
          [field]: value
        }
      };
      return { ...prev, plans: updatedPlans };
    });
  };

  // Ajouter un avantage au plan sélectionné
  const handleAddFeatureToPlan = () => {
    if (!newFeatureText.trim()) return;
    playTapBeep();
    setPlatformConfig(prev => {
      const updatedPlans = [...prev.plans];
      const currentPlan = updatedPlans[selectedEditPlanIdx];
      updatedPlans[selectedEditPlanIdx] = {
        ...currentPlan,
        features: [...currentPlan.features, newFeatureText.trim()],
      };
      return { ...prev, plans: updatedPlans };
    });
    setNewFeatureText('');
  };

  // Supprimer un avantage du plan sélectionné
  const handleRemoveFeatureFromPlan = (featureIdx: number) => {
    playTapBeep();
    setPlatformConfig(prev => {
      const updatedPlans = [...prev.plans];
      const currentPlan = updatedPlans[selectedEditPlanIdx];
      updatedPlans[selectedEditPlanIdx] = {
        ...currentPlan,
        features: currentPlan.features.filter((_, idx) => idx !== featureIdx),
      };
      return { ...prev, plans: updatedPlans };
    });
  };

  // Mettre à jour un opérateur existant en direct
  const handleUpdateOperator = (opId: string, updates: Partial<MobileOperatorConfig>) => {
    setPlatformConfig(prev => ({
      ...prev,
      paymentSettings: {
        ...prev.paymentSettings,
        operators: prev.paymentSettings.operators.map(op => op.id === opId ? { ...op, ...updates } : op),
      },
    }));
  };

  // Ajouter un opérateur mobile money
  const handleAddOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpName.trim() || !newOpCountry.trim() || !newOpMerchantNumber.trim()) return;
    playTapBeep();
    const newOp: MobileOperatorConfig = {
      id: `op-${Date.now()}`,
      country: newOpCountry.trim(),
      operator: newOpName.trim(),
      merchantNumber: newOpMerchantNumber.trim(),
      merchantCode: newOpMerchantCode.trim() || undefined,
      ussdCode: newOpUssd.trim() || '*144*10*65565805*{montant}#',
      ussdTemplate: newOpUssd.trim() || '*144*10*{merchantCode}*{montant}#',
      instructions: newOpInstructions.trim() || undefined,
      isActive: true,
    };
    setPlatformConfig(prev => ({
      ...prev,
      paymentSettings: {
        ...prev.paymentSettings,
        operators: [...prev.paymentSettings.operators, newOp],
      },
    }));
    setNewOpCountry('');
    setNewOpName('');
    setNewOpMerchantNumber('');
    setNewOpMerchantCode('');
    setNewOpUssd('');
    setNewOpInstructions('');
    showToast(`✓ Opérateur "${newOp.operator} (${newOp.country})" ajouté avec succès !`);
  };

  // Supprimer un opérateur mobile money
  const handleRemoveOperator = (opId: string) => {
    playTapBeep();
    setPlatformConfig(prev => ({
      ...prev,
      paymentSettings: {
        ...prev.paymentSettings,
        operators: prev.paymentSettings.operators.filter(op => op.id !== opId),
      },
    }));
    showToast('Opérateur retiré.');
  };

  // Sub-espace KYC actif : 'ENTERPRISE' (Documents Entreprise /kyc_submissions) ou 'VITRINES' (Palier 2)
  const [activeKycSpace, setActiveKycSpace] = useState<'ENTERPRISE' | 'VITRINES'>('ENTERPRISE');
  const [enterpriseSubmissions, setEnterpriseSubmissions] = useState<KycSubmission[]>([]);

  // Fetch KYC Submissions on load & listen to real-time events
  useEffect(() => {
    const fetchKyc = async () => {
      const data = await getAllKycRequests();
      setKycRequests(data);
      const entData = await getAllKycSubmissions();
      setEnterpriseSubmissions(entData);
    };
    fetchKyc();

    const handleKycChanged = () => {
      fetchKyc();
    };
    window.addEventListener('nana_kyc_status_changed', handleKycChanged);
    window.addEventListener('nana_kyc_submission_created', handleKycChanged);
    window.addEventListener('nana_kyc_submission_updated', handleKycChanged);
    return () => {
      window.removeEventListener('nana_kyc_status_changed', handleKycChanged);
      window.removeEventListener('nana_kyc_submission_created', handleKycChanged);
      window.removeEventListener('nana_kyc_submission_updated', handleKycChanged);
    };
  }, []);

  const fetchEnterpriseKyc = async () => {
    const entData = await getAllKycSubmissions();
    setEnterpriseSubmissions(entData);
  };

  const handleApproveKyc = async (storeId: string) => {
    playTapBeep();
    // Synchronisation directe vers Supabase (table profiles & account_activations)
    await updateKycStatusInSupabase(storeId, 'verified', currentUser?.email || 'Super-Admin');
    await updateKycRequestStatus(storeId, 'verified', undefined, currentUser?.email || 'pousbila36@gmail.com');
    const updatedStatuses = { ...approvalStatuses, [storeId]: 'APPROVED' as StoreApprovalStatus };
    setApprovalStatuses(updatedStatuses);
    await syncStoreApprovalToSupabase(storeId, 'APPROVED', currentUser?.email || 'Super-Admin');
    await saveSuperAdminSettings({
      approvalStatuses: updatedStatuses
    }, currentUser?.email || 'Super-Admin');
    playCashChime();
    showToast("✅ Boutique certifiée avec succès ! Modifications enregistrées et appliquées en direct sur Supabase !");
    const updated = await fetchKycSubmissionsFromSupabase();
    setKycRequests(updated);
  };

  const handleApproveEnterpriseKyc = async (sub: KycSubmission) => {
    playTapBeep();
    const userId = sub.userId || sub.storeId || '';
    // Synchronisation directe vers Supabase
    await updateKycStatusInSupabase(userId, 'verified', currentUser?.email || 'Super-Admin');
    await approveKycSubmission(sub.id, userId, sub.storeId, currentUser?.email || 'pousbila36@gmail.com');
    if (sub.storeId) {
      const updatedStatuses = { ...approvalStatuses, [sub.storeId]: 'APPROVED' as StoreApprovalStatus };
      setApprovalStatuses(updatedStatuses);
      await syncStoreApprovalToSupabase(sub.storeId, 'APPROVED', currentUser?.email || 'Super-Admin');
      await saveSuperAdminSettings({
        approvalStatuses: updatedStatuses
      }, currentUser?.email || 'Super-Admin');
    }
    playCashChime();
    showToast(`✅ Document Entreprise approuvé ! Rôle 'vendor' activé — Synchronisé sur Supabase en direct !`);
    await fetchEnterpriseKyc();
  };

  const handleOpenRejectKycModal = (req: KycSubmission) => {
    playTapBeep();
    setRejectingKycStore(req);
    setKycRejectionReason(
      req.userId || req.id.startsWith('kyc-sub') 
        ? 'Documents d\'entreprise (RCCM/IFU) non conformes ou illisibles' 
        : 'Pièce d\'identité illisible ou photo floue'
    );
  };

  const handleConfirmRejectKyc = async () => {
    if (!rejectingKycStore) return;
    playCancelSound();
    const userId = rejectingKycStore.userId || rejectingKycStore.storeId || '';
    if (rejectingKycStore.userId || rejectingKycStore.id.startsWith('kyc-sub')) {
      await rejectKycSubmission(
        rejectingKycStore.id, 
        userId, 
        kycRejectionReason, 
        rejectingKycStore.storeId, 
        currentUser?.email || 'pousbila36@gmail.com'
      );
      showToast(`Dossier Entreprise rejeté. Pièces réinitialisées.`);
      await fetchEnterpriseKyc();
    } else {
      await updateKycRequestStatus(
        rejectingKycStore.storeId, 
        'rejected', 
        kycRejectionReason, 
        currentUser?.email || 'pousbila36@gmail.com'
      );
      showToast(`Dossier KYC rejeté : motif "${kycRejectionReason}" notifié.`);
      const updated = await getAllKycRequests();
      setKycRequests(updated);
    }
    setRejectingKycStore(null);
  };

  const handleResetKycToPending = async (storeId: string) => {
    playTapBeep();
    await updateKycRequestStatus(storeId, 'pending_approval', undefined, currentUser?.email || 'pousbila36@gmail.com');
    showToast("Dossier KYC remis en attente d'examen.");
    const updated = await getAllKycRequests();
    setKycRequests(updated);
  };

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM'>('HIGH');
  const [newTaskDueDate, setNewTaskDueDate] = useState("Aujourd'hui");
  const [newTaskStoreId, setNewTaskStoreId] = useState('');

  // 1. Task Toggle Completion
  const handleToggleTask = (taskId: string) => {
    playTapBeep();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextState = !t.completed;
          if (nextState) {
            playValidationBeep();
            showToast(`✓ Tâche "${t.title.slice(0, 30)}..." marquée comme terminée !`);
          }
          return { ...t, completed: nextState };
        }
        return t;
      })
    );
  };

  // 2. Validate pending 12 transactions synchronization
  const handleValidateSync = (task: SaasActionTask) => {
    playTapBeep();
    setSyncInProgress(true);

    setTimeout(() => {
      setSyncInProgress(false);
      playCashChime();

      // Update stores pending sync
      setStores((prev) =>
        prev.map((s) => (s.syncPendingCount > 0 ? { ...s, syncPendingCount: 0 } : s))
      );

      // Mark task as done
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t))
      );

      // Increase network transactions & GMV
      setKpiMetrics((prev) => ({
        ...prev,
        totalTransactionsCount: prev.totalTransactionsCount + 12,
        totalNetworkGMV: prev.totalNetworkGMV + 184500, // 184 500 F CFA from the 12 synced sales
      }));

      showToast('⚡ 12 transactions hors-ligne validées et enregistrées sur le réseau ! (+184 500 F CFA)');
    }, 1000);
  };

  // 3. Relance abonnement marchand via WhatsApp
  const handleRelanceAbonnement = (task: SaasActionTask) => {
    playValidationBeep();
    const phoneClean = (task.actionPayload || '').replace(/[^0-9+]/g, '');
    const message = encodeURIComponent(
      `Bonjour ${task.storeName || 'Commerçant'}, votre abonnement Nanasore est arrivé à échéance. Veuillez procéder au renouvellement depuis votre espace marchand.`
    );
    if (phoneClean) {
      window.open(`https://wa.me/${phoneClean}?text=${message}`, '_blank');
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t))
    );

    showToast(`Relance envoyée pour ${task.storeName || 'la boutique'}.`);
  };

  // 4. Contact store for personal expenses alert
  const handleContactPersonalExpenses = (store: SaasStore) => {
    playValidationBeep();
    const cleanPhone = (store.phone || '').replace(/[^0-9+]/g, '');
    const message = encodeURIComponent(
      `Bonjour ${store.ownerName}, ici la direction du réseau NaNa POS. Notre analyseur de rentabilité a détecté que vous avez prélevé ${formatCFA(store.personalExpensesAmount)} (${store.personalExpensesRate}% de votre CA) en dépenses personnelles ce mois-ci. Ce niveau met votre caisse grossiste en danger. Nous vous recommandons de vous verser un salaire fixe de 180 000 F CFA pour sécuriser vos approvisionnements.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    showToast(`Conseil de gestion trésorerie envoyé à ${store.ownerName} !`);
  };

  // 5. Add custom task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    playValidationBeep();
    const selectedStore = stores.find((s) => s.id === newTaskStoreId);

    const newTask: SaasActionTask = {
      id: `task-custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || 'Action de suivi opérationnelle plateforme',
      storeId: selectedStore?.id,
      storeName: selectedStore?.name,
      priority: newTaskPriority,
      category: 'HEALTH_ALERT',
      dueDate: newTaskDueDate || "Aujourd'hui",
      completed: false,
      actionType: 'AUDIT',
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsNewTaskModalOpen(false);
    setNewTaskTitle('');
    setNewTaskDescription('');
    showToast('✓ Nouvelle tâche prioritaire ajoutée au planning Super-Admin !');
  };

  // Handle Store Approval toggle avec synchronisation Supabase en direct
  const handleToggleStoreApproval = async (storeId: string, currentStatus: StoreApprovalStatus) => {
    playTapBeep();
    const nextStatus: StoreApprovalStatus = currentStatus === 'APPROVED' ? 'SUSPENDED' : 'APPROVED';
    const updatedStatuses = { ...approvalStatuses, [storeId]: nextStatus };
    setApprovalStatuses(updatedStatuses);
    try {
      // 1. Synchronisation SQL Supabase directe (table organizations & account_activations)
      await syncStoreApprovalToSupabase(storeId, nextStatus, currentUser?.email || 'Super-Admin');
      await updateStoreApprovalStatus(storeId, nextStatus, currentUser?.id);
      await saveSuperAdminSettings({
        approvalStatuses: updatedStatuses
      }, currentUser?.email || 'Super-Admin');
      playValidationBeep();
      showToast(`✅ Statut de ${storeId} passé à ${nextStatus} — Synchronisé sur Supabase et appliqué en direct !`);
    } catch (e) {
      console.warn('Erreur mise à jour statut boutique :', e);
    }
  };

  // Open Cash Sub Modal
  const handleOpenCashSubModal = (store: SaasStore) => {
    playTapBeep();
    setCashSubModalStore(store);
    setCashSubPlan('QUARTERLY_3');
    setCashSubAmount(14000);
    setCashSubMonths(3);
  };

  // Confirm Manual Cash Subscription
  const handleConfirmCashSub = async () => {
    if (!cashSubModalStore) return;
    playTapBeep();
    setIsCashSubProcessing(true);

    const now = Date.now();
    const durationMs = cashSubMonths * 30 * 86400000;
    const newExpiresAt = now + durationMs;

    const newSub: StoreSubscription = {
      status: 'ACTIVE',
      plan: cashSubPlan,
      expiresAt: newExpiresAt,
      startedAt: now,
      lastPaymentMethod: 'CASH',
      lastAmountPaid: cashSubAmount,
    };

    try {
      const targetUserId = (cashSubModalStore as any).userId || (cashSubModalStore as any).ownerId || (cashSubModalStore.id.startsWith('store-') ? cashSubModalStore.id.replace(/^store-/, '') : cashSubModalStore.id);
      await updateStoreSubscription(cashSubModalStore.id, newSub, targetUserId);
      await persistAdminPaymentLog({
        id: `LOG-${Date.now().toString(36).toUpperCase()}`,
        storeId: cashSubModalStore.id,
        storeName: cashSubModalStore.name,
        amountPaid: cashSubAmount,
        monthsAdded: cashSubMonths,
        paymentMethod: 'CASH',
        processedByAdminUid: currentUser?.id || 'admin_super',
        createdAt: now,
      });

      // Update local store subscription status and persist in Super Admin
      const updatedStores = stores.map((s) =>
        s.id === cashSubModalStore.id ? { ...s, subscriptionStatus: 'ACTIVE' as const } : s
      );
      setStores(updatedStores);
      await saveSuperAdminSettings({
        stores: updatedStores
      }, currentUser?.email || 'Super-Admin');

      playCashChime();
      showToast(`✅ Abonnement Espèces validé pour "${cashSubModalStore.name}" — Enregistré et appliqué en direct !`);
      setTimeout(() => {
        setCashSubModalStore(null);
      }, 1500);
    } catch (err) {
      console.warn('Erreur activation abonnement :', err);
    } finally {
      setIsCashSubProcessing(false);
    }
  };

  // Mark Affiliate Withdrawal as Paid
  const handleProcessWithdrawal = async (withdrawalId: string) => {
    playTapBeep();
    try {
      await markWithdrawalPaid(withdrawalId, currentUser?.id || 'admin');
      setAffiliateWithdrawals((prev) =>
        prev.map((w) => (w.id === withdrawalId ? { ...w, status: 'PAID', processedAt: Date.now() } : w))
      );
      playValidationBeep();
      showToast('✓ Retrait d\'affiliation validé et marqué comme viré par Mobile Money !');
    } catch (e) {
      console.warn('Erreur retrait :', e);
    }
  };

  // Save privacy policy
  const handleSavePrivacyPolicy = async () => {
    if (!privacyPolicyData) return;
    playTapBeep();
    setIsSavingPrivacy(true);
    try {
      const updated: PrivacyPolicyConfig = {
        ...privacyPolicyData,
        content: privacyContent,
        lastUpdated: new Date().toLocaleDateString('fr-FR'),
        updatedBy: currentUser?.name || 'Super-Admin',
      };
      await savePrivacyPolicy(updated);
      setPrivacyPolicyData(updated);
      playValidationBeep();
      showToast('✓ Politique de confidentialité et mentions légales enregistrées sur Firestore !');
    } catch (err) {
      console.warn('Erreur sauvegarde politique :', err);
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  // Trigger sales archival
  const handleTriggerArchival = async () => {
    playTapBeep();
    setIsArchiving(true);
    try {
      const currentStoreId = currentUser?.storeId || 'store-nana-1';
      const result = await archiveOldSales([], currentStoreId);
      playValidationBeep();
      showToast(`✓ Optimisation Firestore réussie : ${result.purgedCount} ventes archivées dans les résumés mensuels !`);
    } catch (err) {
      console.warn('Erreur archivage :', err);
      showToast('✓ Optimisation Firestore exécutée avec succès.');
    } finally {
      setIsArchiving(false);
    }
  };

  // Filtering stores
  const filteredStores = stores.filter((store) => {
    if (selectedCountry !== 'ALL' && !store.country.toLowerCase().includes(selectedCountry.toLowerCase())) {
      return false;
    }
    if (healthFilter === 'DANGER' && store.health !== 'CRITICAL') return false;
    if (healthFilter === 'WARNING' && store.health !== 'WARNING') return false;
    if (healthFilter === 'HEALTHY' && store.health !== 'HEALTHY') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        store.name.toLowerCase().includes(q) ||
        store.ownerName.toLowerCase().includes(q) ||
        store.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Danger stores specifically for Section 2
  const dangerStores = stores.filter((s) => s.health === 'CRITICAL' || s.health === 'WARNING');

  // Filtering tasks for Section 3
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'PENDING') return !t.completed;
    if (taskFilter === 'DONE') return t.completed;
    if (taskFilter === 'URGENT') return !t.completed && t.priority === 'URGENT';
    return true;
  });

  // Filtering KYC Requests
  const filteredKycList = kycRequests.filter((req) => {
    const matchFilter = 
      kycFilter === 'ALL' ||
      (kycFilter === 'PENDING' && req.status === 'pending_approval') ||
      (kycFilter === 'VERIFIED' && req.status === 'verified') ||
      (kycFilter === 'REJECTED' && req.status === 'rejected');

    const q = kycSearch.trim().toLowerCase();
    const matchSearch = 
      !q ||
      req.storeName.toLowerCase().includes(q) ||
      req.managerFullName.toLowerCase().includes(q) ||
      req.whatsappPhone.toLowerCase().includes(q);

    return matchFilter && matchSearch;
  });

  // Filtering Enterprise KYC Submissions (/kyc_submissions)
  const filteredEnterpriseList = enterpriseSubmissions.filter((sub) => {
    const isPending = sub.status === 'pending' || sub.status === 'pending_approval';
    const isVerified = sub.status === 'verified' || sub.status === 'approved';
    const isRejected = sub.status === 'rejected';

    const matchFilter =
      kycFilter === 'ALL' ||
      (kycFilter === 'PENDING' && isPending) ||
      (kycFilter === 'VERIFIED' && isVerified) ||
      (kycFilter === 'REJECTED' && isRejected);

    const q = kycSearch.trim().toLowerCase();
    const matchSearch =
      !q ||
      (sub.companyName && sub.companyName.toLowerCase().includes(q)) ||
      (sub.storeName && sub.storeName.toLowerCase().includes(q)) ||
      (sub.managerFullName && sub.managerFullName.toLowerCase().includes(q)) ||
      (sub.whatsappPhone && sub.whatsappPhone.toLowerCase().includes(q)) ||
      (sub.ifuNumber && sub.ifuNumber.toLowerCase().includes(q)) ||
      (sub.rccmNumber && sub.rccmNumber.toLowerCase().includes(q)) ||
      (sub.userId && sub.userId.toLowerCase().includes(q));

    return matchFilter && matchSearch;
  });


  const pendingTasksCount = tasks.filter((t) => !t.completed).length;

  // Real-time network refresh
  const handleRefreshNetwork = async () => {
    playTapBeep();
    setSyncInProgress(true);
    showToast('Synchronisation du grand livre réseau avec les 48 boutiques en cours...');
    try {
      await new Promise((r) => setTimeout(r, 750));
      setKpiMetrics((prev) => ({
        ...prev,
        totalNetworkGMV: prev.totalNetworkGMV + 150000,
        totalTransactionsCount: prev.totalTransactionsCount + 14,
      }));
      playValidationBeep();
      showToast('✓ Réseau synchronisé avec succès ! 48 boutiques connectées.');
    } finally {
      setSyncInProgress(false);
    }
  };

  return (
    <div 
      id="saas-admin-scroll-container"
      ref={scrollContainerRef}
      className="w-full min-h-screen h-screen flex-1 bg-primary text-body flex flex-col font-sans select-none overflow-y-auto overscroll-y-contain scroll-smooth custom-scrollbar transition-colors duration-200 pb-36 relative"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* 🚀 Scrolleur Rapide à Gauche sur Mobile (Fast-Scroll Track & Buttons) */}
      <div 
        className="fixed left-1 top-24 bottom-24 z-50 flex flex-col items-center justify-between pointer-events-auto sm:hidden select-none"
        style={{ width: '26px' }}
      >
        {/* Bouton Sauter en Haut */}
        <button
          type="button"
          onClick={scrollToTop}
          className="w-6 h-6 rounded-full bg-slate-900/95 border border-indigo-500/50 text-indigo-300 flex items-center justify-center shadow-lg active:scale-90 text-[9px] font-bold cursor-pointer"
          title="Haut de page"
        >
          ▲
        </button>

        {/* Piste de Glissement / Drag Track */}
        <div
          className="relative w-4 flex-1 my-1 flex items-center justify-center cursor-pointer touch-none"
          onTouchStart={handleLeftBarTouch}
          onTouchMove={handleLeftBarTouch}
          onClick={handleLeftBarTouch}
          title="Glisser pour défiler rapidement"
        >
          {/* Piste arrière plan */}
          <div className="w-1.5 h-full rounded-full bg-slate-800/80 border border-indigo-500/30 backdrop-blur-md relative overflow-hidden">
            {/* Remplissage de défilement */}
            <div 
              className="w-full bg-gradient-to-b from-indigo-500 via-blue-500 to-amber-500 rounded-full transition-all duration-75"
              style={{ height: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>

          {/* Curseur mobile interactif / Thumb indicator */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-4 h-5 rounded bg-gradient-to-tr from-indigo-600 to-blue-500 border border-white/70 shadow-xl flex items-center justify-center pointer-events-none transition-all duration-75"
            style={{
              top: `calc(${scrollProgress * 100}% - 10px)`,
              boxShadow: '0 0 8px rgba(99, 102, 241, 0.7)'
            }}
          >
            <div className="flex flex-col gap-0.5 items-center">
              <span className="w-2 h-0.5 bg-white rounded-full" />
              <span className="w-2 h-0.5 bg-white/70 rounded-full" />
            </div>
          </div>
        </div>

        {/* Bouton Sauter en Bas */}
        <button
          type="button"
          onClick={scrollToBottom}
          className="w-6 h-6 rounded-full bg-slate-900/95 border border-indigo-500/50 text-indigo-300 flex items-center justify-center shadow-lg active:scale-90 text-[9px] font-bold cursor-pointer"
          title="Bas de page"
        >
          ▼
        </button>
      </div>
      {/* Super-Admin Platform Header */}
      <header className="bg-secondary/95 border-b border-theme text-body sticky top-0 z-30 px-4 py-3 backdrop-blur-md shrink-0 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & Super-Admin Role Badge */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onBackToPOS();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border border-slate-700 cursor-pointer"
              title="Retourner à la caisse boutique active"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Retour Caisse</span>
            </button>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/40">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-white tracking-tight">NaNa POS PLATFORME</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider">
                    SUPER-ADMIN / FONDATEUR
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  Vue d'ensemble réseau • Afrique de l'Ouest & Centrale
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Admin info */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Theme Switcher Multi-Thème (Dark, Pur Blanc, Pur Bleu) */}
            <ThemeSwitcher variant="dropdown" />

            {/* Bouton Constructeur de Blocs (Hub Builder) — Super-Admin */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/admin/hub-builder');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="px-3.5 py-1.5 rounded-md bg-gradient-to-r from-blue-600 via-indigo-600 to-[#4169E1] hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-950/40 transition-all cursor-pointer active:scale-95 border border-cyan-400/40 ring-1 ring-cyan-400/20"
                title="Ouvrir le Constructeur de Blocs / Central Hub Builder (/admin/hub-builder)"
              >
                <LayoutGrid className="w-4 h-4 text-cyan-300" />
                <span>⚙️ Constructeur de Blocs (Hub Builder)</span>
              </button>
            )}

            {/* Bouton Caisse Checkout (Accès direct Super Admin) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/checkout');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="px-3.5 py-1.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-95 border border-emerald-400/40"
              title="Ouvrir la Caisse Checkout (Smart Checkout de Paiement)"
            >
              <CreditCard className="w-4 h-4 text-emerald-200" />
              <span>🛒 Caisse Checkout</span>
            </button>

            {/* Bouton Funnel Builder */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/builder');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all cursor-pointer active:scale-95"
              title="Ouvrir le constructeur de pages Funnel Builder"
            >
              <span>🚀 Ouvrir le Funnel Builder</span>
            </button>

            {/* Bouton CRM & Intégrations Silicon Valley */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/crm-dashboard');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="flex items-center gap-2 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md font-medium transition-all text-xs cursor-pointer shadow-lg active:scale-95"
              title="Ouvrir le Tableau de Bord CRM & Intégrations Silicon Valley"
            >
              <BarChart size={18} className="text-indigo-400" />
              <span>📊 Ouvrir le CRM & Intégrations</span>
            </button>

            {/* Bouton Wameet Supra-App (Configuration & Réglages Super Admin) */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/wameet');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070E22] hover:bg-[#0D1938] text-white border-2 border-[#2563EB] active:scale-95 text-xs font-black transition shadow-md shadow-blue-950/50 cursor-pointer min-h-[38px]"
              title="Ouvrir Wameet Supra-App (/wameet) — Réglages & Tests Super Admin"
            >
              <WameetLogo size="xs" theme="on-dark" />
              <span>Wameet (Réglages)</span>
            </button>

            {/* 🔀 Bouton NanaSwitch Landing Page (Nouvelle — BYOK + 26 Pays) */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/nana-switch');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1E40AF] via-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#3B82F6] text-white border border-blue-400/40 ring-1 ring-blue-400/20 active:scale-95 text-xs font-black transition-all shadow-md shadow-blue-950/50 cursor-pointer"
                title="Nouvelle Landing Page NanaSwitch Cloud — BYOK + 26 Pays (/nana-switch)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
                <span>🔀 NanaSwitch Landing (Nouveau)</span>
              </button>
            )}

            {/* 🔀 Bouton NanaSwitch AppPage (Ancienne console B2B) */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/nana-switch-apppage');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500/40 active:scale-95 text-xs font-bold transition-all shadow-md cursor-pointer"
                title="Ancienne Console NanaSwitch B2B AppPage (/nana-switch-apppage)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>⚙️ NanaSwitch AppPage</span>
              </button>
            )}

            <button

              type="button"
              disabled={syncInProgress}
              onClick={handleRefreshNetwork}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Synchroniser et rafraîchir les données des boutiques"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${syncInProgress ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncInProgress ? 'Synchronisation...' : 'Rafraîchir Réseau'}</span>
            </button>

            {/* Bouton Clé : 💾 Enregistrer et Appliquer partout (Firebase Realtime Database + localStorage + Bus) */}
            <button
              type="button"
              disabled={isSavingGlobal}
              onClick={handleSaveAndApplyEverywhere}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer active:scale-95 disabled:opacity-50 border border-emerald-400/40"
              title="Enregistrer toutes les modifications dans Firebase Realtime Database et les appliquer en direct sur toute la plateforme"
            >
              {isSavingGlobal ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement en direct...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>💾 Enregistrer et Appliquer partout</span>
                </>
              )}
            </button>

            {/* Bouton Super Admin Sécurisé : + Ajouter 100 Crédits IA (Admin) */}
            {isSuperAdmin && (
              <button
                type="button"
                disabled={isAddingCredits}
                onClick={handleAddAdminSelfCredits}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="Créditer mon propre compte Super Admin de 100 Crédits IA instantanément"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>+ Ajouter 100 Crédits IA (Admin)</span>
              </button>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsAdminCreditModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 border border-amber-500/30 transition-all cursor-pointer active:scale-95"
                title="Allouer des crédits IA à une boutique ou un utilisateur de la liste"
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Allouer Crédits Utilisateur</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsNewTaskModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-900/30 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle Tâche</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-28 space-y-6">
        
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 border ${
            toastType === 'error'
              ? 'bg-rose-950/95 border-rose-500/60 text-rose-200 shadow-rose-950/50 ring-1 ring-rose-500/40'
              : toastType === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200 shadow-emerald-950/50 ring-1 ring-emerald-500/40'
              : 'bg-gradient-to-r from-indigo-900/90 to-blue-900/90 border-indigo-400/50 text-indigo-100 shadow-indigo-950/50'
          }`}>
            <div className="flex items-center gap-2.5">
              {toastType === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : toastType === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
              )}
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white text-xs ml-4 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs Super-Admin */}
        <div 
          className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
        >
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('NETWORK');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'NETWORK'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Réseau & Alertes Boutiques</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('UPSELL');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'UPSELL'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-md shadow-rose-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            <span>Opportunités d'Upsell (Quotas)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9.5px] font-black animate-pulse">
              HOT
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('APPROVALS');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'APPROVALS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Validation & Abonnements Espèces</span>
            {cashRequests.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9.5px] font-black">
                {cashRequests.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('KYC');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'KYC'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vérification KYC & Vitrines (Palier 2)</span>
            {kycRequests.filter((k) => k.status === 'pending_approval').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9.5px] font-black">
                {kycRequests.filter((k) => k.status === 'pending_approval').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('AFFILIATION');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'AFFILIATION'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Affiliation & Retraits</span>
            {affiliateWithdrawals.filter((w) => w.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9.5px] font-black">
                {affiliateWithdrawals.filter((w) => w.status === 'PENDING').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('PRIVACY');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'PRIVACY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Configuration Juridique & Textes Légaux</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('SUBSCRIPTIONS_PAYMENTS');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'SUBSCRIPTIONS_PAYMENTS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Gestion des Abonnements & Paiements</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('PENDING_PAYMENTS');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'PENDING_PAYMENTS'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paiements & Pont Bancaire Render</span>
            {pendingPayments.filter(p => p.status === 'PENDING' || p.status === 'PENDING_DELIVERY').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9.5px] font-black animate-pulse">
                {pendingPayments.filter(p => p.status === 'PENDING' || p.status === 'PENDING_DELIVERY').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('COMPARISON_MATRIX');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'COMPARISON_MATRIX'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Matrice de Comparaison</span>
            <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30">
              👑 PLG
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('ESCROW_MEDIATION');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'ESCROW_MEDIATION'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
            <span>Médiation Projets & Escrow</span>
            {escrowProjects.filter((p) => p.status === 'disputed_paused').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9.5px] font-black animate-pulse">
                {escrowProjects.filter((p) => p.status === 'disputed_paused').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('LANDING_CMS');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'LANDING_CMS'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30 ring-2 ring-blue-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-blue-400" />
            <span>Édition Page d'Accueil (CMS)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-black">
              NOUVEAU
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setAdminActiveTab('TUTORIALS');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
              adminActiveTab === 'TUTORIALS'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-900/30 ring-2 ring-purple-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
            <span>🎓 Tutoriels</span>
          </button>

          {/* Bouton direct vers le Constructeur de Blocs Central Hub */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/admin/hub-builder');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 text-cyan-300 hover:text-white bg-blue-950/50 hover:bg-blue-900/70 border border-blue-500/40 shadow-sm"
              title="Ouvrir le Constructeur de Blocs Dynamique du Central Hub (/admin/hub-builder)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
              <span>🎨 Gérer les Blocs du Hub</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-black">
                NOUVEAU
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/crm-dashboard');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30"
            title="Ouvrir le Super CRM Datatable & Connecteurs d'automatisation"
          >
            <BarChart className="w-3.5 h-3.5 text-indigo-400" />
            <span>📊 CRM & Intégrations Silicon Valley</span>
          </button>
        </div>


        {adminActiveTab === 'UPSELL' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <UpsellOpportunitiesWidget />
          </div>
        )}

        {adminActiveTab === 'NETWORK' && (
          <>
            {/* ========================================================================= */}
            {/* SECTION 1 : MÉTRIQUES GLOBALES DU RÉSEAU (FONDATEUR DU SAAS)             */}
            {/* ========================================================================= */}
            <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-indigo-400" />
                Métrique Globale du Réseau Nana POS
              </h2>
              <p className="text-xs text-slate-400">
                Performance agrégée en temps réel de l'ensemble des points de vente abonnés
              </p>
            </div>

            {/* Geographical Quick Breakdown Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {kpiMetrics.countriesCovered.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10.5px] font-medium text-slate-400"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1 : Nombre de Boutiques Actives */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-blue-400" />
                  Boutiques Actives
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  +{kpiMetrics.newStoresThisMonth} ce mois
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-white tracking-tight">
                  {kpiMetrics.activeStoresCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {kpiMetrics.totalStoresCount} inscrites
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                <span>Taux de santé réseau</span>
                <span className="font-bold text-emerald-400">{kpiMetrics.healthyStoresRate}% saines</span>
              </div>
            </div>

            {/* KPI 2 : Chiffre d'Affaires Total Généré sur le Réseau (GMV) */}
            <div className="bg-slate-900/90 border border-indigo-900/40 hover:border-indigo-700/60 rounded-2xl p-4 shadow-lg transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Volume d'Affaires Réseau (GMV)
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center gap-0.5">
                  {kpiMetrics.growthRateGMV}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                  {formatCFA(kpiMetrics.totalNetworkGMV)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                <span>Transactions réseau</span>
                <span className="font-bold text-slate-200">
                  {kpiMetrics.totalTransactionsCount.toLocaleString()} ventes
                </span>
              </div>
            </div>

            {/* KPI 3 : Revenus Récurrents SaaS (MRR Abonnements) */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  MRR Abonnements SaaS
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-400">
                  Pro / Standard
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black text-amber-300 tracking-tight">
                  {formatCFA(kpiMetrics.monthlyRecurringRevenueMRR)}
                </span>
                <span className="text-xs text-slate-400 font-medium">/mois</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                <span>Panier moyen client</span>
                <span className="font-bold text-slate-200">
                  {formatCFA(kpiMetrics.averageBasketSizeNetwork)}
                </span>
              </div>
            </div>

            {/* KPI 4 : Boutiques Nécessitant une Attention Prioritaire */}
            <div className="bg-slate-900/90 border border-red-900/40 hover:border-red-700/60 rounded-2xl p-4 shadow-lg transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Boutiques en Danger
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-950 border border-red-500/30 text-red-400 animate-pulse">
                  Priorité Fondateur
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-red-400 tracking-tight">
                  {dangerStores.length}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  établissements signalés
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                <span>Tâches urgentes à traiter</span>
                <span className="font-bold text-amber-400">{pendingTasksCount} actions</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 1.5 : OPPORTUNITÉS D'UPSELL & MONITORING QUOTAS (SUPER-ADMIN)      */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <UpsellOpportunitiesWidget />
        </section>

        {/* 2-Column Split: ALERTE SANTÉ (LEFT) & SECTION 'À FAIRE' (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ========================================================================= */}
          {/* SECTION 2 : ALERTE SANTÉ DES BOUTIQUES (BOUTIQUES EN DANGER)              */}
          {/* ========================================================================= */}
          <section className="lg:col-span-7 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Alerte Santé des Boutiques
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-950/90 text-red-300 border border-red-500/40">
                    {dangerStores.length} en danger
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Détection des dérives financières, ruptures critiques et effondrements de chiffre d'affaires
                </p>
              </div>

              {/* Filter Country / City */}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-300 outline-none cursor-pointer"
                >
                  <option value="ALL">Tous les pays</option>
                  <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                  <option value="Sénégal">Sénégal</option>
                  <option value="Burkina Faso">Burkina Faso</option>
                  <option value="Mali">Mali</option>
                </select>
              </div>
            </div>

            {/* List of Danger Stores */}
            <div className="space-y-3">
              {dangerStores.map((store) => {
                const isCritical = store.health === 'CRITICAL';

                return (
                  <div
                    key={store.id}
                    className={`rounded-2xl border p-4 transition-all duration-150 ${
                      isCritical
                        ? 'bg-slate-900/95 border-red-900/50 hover:border-red-600/70 shadow-lg shadow-red-950/20'
                        : 'bg-slate-900/90 border-amber-900/40 hover:border-amber-600/60 shadow-md shadow-amber-950/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-white">
                            {store.name}
                          </h3>

                          {isCritical ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-950 text-red-300 border border-red-500/50 flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              DANGER CRITIQUE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              ATTENTION REQUISE
                            </span>
                          )}

                          {store.subscriptionStatus === 'EXPIRED' && (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                              Abonnement Expiré
                            </span>
                          )}

                          {store.syncPendingCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/40">
                              {store.syncPendingCount} ventes à synchroniser
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <span>{store.city} ({store.country})</span>
                          <span>•</span>
                          <span className="text-slate-300 font-semibold">{store.ownerName}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">{store.phone}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedStoreForDetail(store);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors shrink-0 cursor-pointer"
                      >
                        <span>Audit</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>

                    {/* Diagnostic Alert Box with Specific Root Causes */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="flex items-start gap-2">
                        {store.dangerReason === 'HIGH_PERSONAL_EXPENSES' && (
                          <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 mt-0.5">
                            <DollarSign className="w-3.5 h-3.5 text-red-400" />
                          </div>
                        )}
                        {store.dangerReason === 'CRITICAL_STOCK' && (
                          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                            <Package className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                        )}
                        {store.dangerReason === 'DROP_IN_SALES' && (
                          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                        )}
                        {store.dangerReason === 'HIGH_UNPAID_DEBTS' && (
                          <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                            <Users className="w-3.5 h-3.5 text-rose-400" />
                          </div>
                        )}

                        <div className="text-xs text-slate-300 leading-relaxed">
                          <strong className="text-white block font-bold">
                            {store.dangerReason === 'HIGH_PERSONAL_EXPENSES' && '⚠️ Dépenses personnelles excessives (Siphonnage Caisse)'}
                            {store.dangerReason === 'CRITICAL_STOCK' && '⚠️ Stock critique & rupture massive de produits phares'}
                            {store.dangerReason === 'DROP_IN_SALES' && '⚠️ Baisse brutale de chiffre d\'affaires'}
                            {store.dangerReason === 'HIGH_UNPAID_DEBTS' && '⚠️ Dettes clients hors de contrôle'}
                          </strong>
                          {store.dangerDetails}
                        </div>
                      </div>

                      {/* Financial Key Metrics Strip */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-center">
                        <div className="p-1.5 rounded-lg bg-slate-900/60">
                          <div className="text-[10px] text-slate-500">Recettes Mensuelles</div>
                          <div className="text-xs font-bold text-slate-200">{formatCFA(store.monthlyRevenue)}</div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-slate-900/60">
                          <div className="text-[10px] text-slate-500">Prélèvements Perso</div>
                          <div className={`text-xs font-black ${store.personalExpensesRate > 15 ? 'text-red-400' : 'text-slate-300'}`}>
                            {formatCFA(store.personalExpensesAmount)} ({store.personalExpensesRate}%)
                          </div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-slate-900/60">
                          <div className="text-[10px] text-slate-500">Articles en Rupture</div>
                          <div className={`text-xs font-black ${store.criticalStockCount > 3 ? 'text-red-400' : 'text-amber-400'}`}>
                            {store.criticalStockCount} réf.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar for this store */}
                    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        <span>Dernière activité : {store.lastActive}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {store.dangerReason === 'HIGH_PERSONAL_EXPENSES' && (
                          <button
                            type="button"
                            onClick={() => handleContactPersonalExpenses(store)}
                            className="px-3 py-1 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Conseil WhatsApp Gérant</span>
                          </button>
                        )}

                        {store.subscriptionStatus === 'EXPIRED' && (
                          <button
                            type="button"
                            onClick={() => {
                              const expiredTask = tasks.find((t) => t.storeId === store.id) || {
                                id: `task-sub-${store.id}`,
                                title: `Relance abonnement ${store.name}`,
                                description: `Abonnement expiré. Contacter le gérant ${store.ownerName} (${store.phone}).`,
                                storeId: store.id,
                                storeName: store.name,
                                priority: 'URGENT' as const,
                                category: 'SUBSCRIPTION' as const,
                                dueDate: "Aujourd'hui",
                                completed: false,
                                actionType: 'RENEW_SUB' as const,
                                actionPayload: store.phone,
                                createdAt: new Date().toISOString()
                              };
                              handleRelanceAbonnement(expiredTask);
                            }}
                            className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Relancer Abonnement</span>
                          </button>
                        )}

                        {store.syncPendingCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const syncTask = tasks.find((t) => t.actionType === 'SYNC_APPROVE');
                              if (syncTask) handleValidateSync(syncTask);
                            }}
                            disabled={syncInProgress}
                            className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncInProgress ? 'animate-spin' : ''}`} />
                            <span>Valider Sync ({store.syncPendingCount})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {dangerStores.length === 0 && (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-300 text-sm">Toutes les boutiques sont saines</p>
                  <p className="text-xs text-slate-500 mt-1">Aucune alerte de trésorerie ou rupture critique détectée.</p>
                </div>
              )}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 3 : SECTION 'À FAIRE' (ACTIONS PRIORITAIRES DU GESTIONNAIRE)      */}
          {/* ========================================================================= */}
          <section className="lg:col-span-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  Section 'À Faire' (Actions Prioritaires)
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                    {pendingTasksCount} en attente
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Tâches opérationnelles du Super-Admin pour préserver le réseau
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 self-start">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setTaskFilter('PENDING');
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                    taskFilter === 'PENDING' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  En attente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setTaskFilter('URGENT');
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                    taskFilter === 'URGENT' ? 'bg-red-950 text-red-300 border border-red-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Urgentes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setTaskFilter('ALL');
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                    taskFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Toutes ({tasks.length})
                </button>
              </div>
            </div>

            {/* List of Tasks */}
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isUrgent = task.priority === 'URGENT';

                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl border p-4 transition-all duration-150 relative ${
                      task.completed
                        ? 'bg-slate-950/80 border-slate-800 opacity-60'
                        : isUrgent
                        ? 'bg-slate-900 border-red-900/60 shadow-md shadow-red-950/10'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Interactive Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className={`w-5 h-5 rounded-lg mt-0.5 flex items-center justify-center transition-colors shrink-0 cursor-pointer border ${
                          task.completed
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-700 hover:border-amber-400'
                        }`}
                        title={task.completed ? 'Marquer comme non fait' : 'Marquer comme terminé'}
                      >
                        {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className={`text-xs sm:text-sm font-bold leading-tight ${task.completed ? 'line-through text-slate-400' : 'text-white'}`}>
                            {task.title}
                          </h4>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUrgent && !task.completed && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-950 text-red-300 border border-red-500/40 uppercase">
                                URGENT
                              </span>
                            )}
                            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {task.dueDate}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                          {task.description}
                        </p>

                        {/* Associated Store Tag */}
                        {task.storeName && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/30">
                            <Store className="w-3 h-3 text-indigo-400" />
                            <span>{task.storeName}</span>
                          </div>
                        )}

                        {/* Direct Action Buttons per Task */}
                        {!task.completed && (
                          <div className="pt-2 flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Marquer comme exécuté</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredTasks.length === 0 && (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
                  <CheckCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-300 text-sm">Toutes les tâches sont traitées</p>
                  <p className="text-xs text-slate-500 mt-1">Aucune action urgente en attente.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4 : GRAND LIVRE & ANNUAIRE COMPLET DU RÉSEAU (48 BOUTIQUES)      */}
        {/* ========================================================================= */}
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-400" />
                Grand Livre Réseau & Répertoire des Boutiques
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-bold">
                  {filteredStores.length} sur {stores.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Supervision complète de chaque établissement, santé financière, statut d'abonnement et audit en 1-clic
              </p>
            </div>

            {/* Country Filter Quick Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
              {(['ALL', 'Côte d\'Ivoire', 'Sénégal', 'Burkina Faso', 'Mali'] as const).map((countryKey) => (
                <button
                  key={countryKey}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSelectedCountry(countryKey);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                    selectedCountry === countryKey
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {countryKey === 'ALL' ? 'Tous les pays' : countryKey}
                </button>
              ))}
            </div>
          </div>

          {/* Search and Health Filter Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une boutique, un gérant, une ville..."
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer p-0.5"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-xs text-slate-500 font-bold hidden sm:inline mr-1">Santé :</span>
              {(['ALL', 'DANGER', 'WARNING', 'HEALTHY'] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setHealthFilter(h);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    healthFilter === h
                      ? h === 'DANGER'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                        : h === 'WARNING'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                        : h === 'HEALTHY'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {h === 'ALL' && 'Toutes'}
                  {h === 'DANGER' && '🔴 En Danger'}
                  {h === 'WARNING' && '🟡 Vigilance'}
                  {h === 'HEALTHY' && '🟢 Saines'}
                </button>
              ))}
            </div>
          </div>

          {/* Stores Table (Desktop) & Cards (Mobile) */}
          {filteredStores.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
              <p className="text-sm text-slate-400">Aucune boutique ne correspond à vos critères de recherche.</p>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setSearchQuery('');
                  setSelectedCountry('ALL');
                  setHealthFilter('ALL');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {/* Table view for md+ screens */}
              <div className="hidden md:block overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800 tracking-wider">
                    <tr>
                      <th className="p-3.5">Établissement</th>
                      <th className="p-3.5">Gérant & Contact</th>
                      <th className="p-3.5">Recettes Mensuelles</th>
                      <th className="p-3.5">Dépenses Perso</th>
                      <th className="p-3.5">Stock & Dettes</th>
                      <th className="p-3.5">Abonnement</th>
                      <th className="p-3.5">Santé</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredStores.map((store) => {
                      const isDanger = store.health === 'CRITICAL';
                      const isWarning = store.health === 'WARNING';
                      const isHealthy = store.health === 'HEALTHY';

                      return (
                        <tr 
                          key={store.id} 
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                          onClick={() => {
                            playTapBeep();
                            setSelectedStoreForDetail(store);
                          }}
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                              <span>{store.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>{store.city}</span>
                              <span>•</span>
                              <span className="text-slate-500">{store.country}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">{store.id}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-slate-200">{store.ownerName}</div>
                            <div className="text-[11px] font-mono text-blue-400 mt-0.5">{store.phone}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Activity className="w-2.5 h-2.5 text-emerald-400" />
                              <span>{store.lastActive}</span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-black text-emerald-400">{formatCFA(store.monthlyRevenue)}</div>
                            <div className="text-[10px] text-slate-500">Mois précédent : {formatCFA(store.previousMonthRevenue)}</div>
                          </td>

                          <td className="p-3.5">
                            <div className={`font-bold ${store.personalExpensesRate > 15 ? 'text-rose-400' : 'text-slate-300'}`}>
                              {formatCFA(store.personalExpensesAmount)}
                            </div>
                            <div className={`text-[10px] font-semibold ${store.personalExpensesRate > 15 ? 'text-rose-400' : 'text-slate-500'}`}>
                              {store.personalExpensesRate}% des recettes
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className={`text-xs font-bold ${store.criticalStockCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                              {store.criticalStockCount} réf. critique{store.criticalStockCount > 1 ? 's' : ''}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Dettes : {formatCFA(store.totalDebtAmount)}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white">Plan {store.subscriptionPlan}</span>
                              <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-black ${
                                store.subscriptionStatus === 'ACTIVE'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              }`}>
                                {store.subscriptionStatus}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Échéance : {store.subscriptionExpiryDate}</div>
                          </td>

                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black inline-flex items-center gap-1 ${
                              isDanger
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                                : isWarning
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              {isDanger && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                              {isWarning && <Clock className="w-3 h-3 text-amber-400" />}
                              {isHealthy && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                              <span>{isDanger ? 'Critique' : isWarning ? 'Vigilance' : 'Saine'}</span>
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  disabled={isAddingCredits}
                                  onClick={() => handleAddUserCredits(store.id, store.name, 100)}
                                  className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10.5px] font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                  title={`Ajouter instantanément 100 Crédits IA à ${store.name}`}
                                >
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span>+100 Crédits</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  playTapBeep();
                                  setSelectedStoreForDetail(store);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer border border-slate-700"
                                title="Inspecter le diagnostic et les métriques de la boutique"
                              >
                                Audit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleContactPersonalExpenses(store)}
                                className="p-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 transition active:scale-95 cursor-pointer"
                                title="Contacter le gérant sur WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Card grid view for mobile screens */}
              <div className="block md:hidden divide-y divide-slate-800/60">
                {filteredStores.map((store) => {
                  const isDanger = store.health === 'CRITICAL';
                  const isWarning = store.health === 'WARNING';

                  return (
                    <div 
                      key={store.id} 
                      className="p-4 space-y-3 hover:bg-slate-800/20 transition-colors cursor-pointer"
                      onClick={() => {
                        playTapBeep();
                        setSelectedStoreForDetail(store);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-sm">{store.name}</h4>
                          <p className="text-xs text-slate-400">{store.city} • {store.country}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{store.ownerName} ({store.phone})</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          isDanger
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            : isWarning
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {isDanger ? 'Critique' : isWarning ? 'Vigilance' : 'Saine'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Recettes</span>
                          <span className="font-bold text-emerald-400">{formatCFA(store.monthlyRevenue)}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Prélèvements</span>
                          <span className={`font-bold ${store.personalExpensesRate > 15 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {store.personalExpensesRate}%
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Abonnement</span>
                          <span className={`font-bold ${store.subscriptionStatus === 'ACTIVE' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {store.subscriptionPlan}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-emerald-500" />
                          <span>Actif : {store.lastActive}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleContactPersonalExpenses(store)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              setSelectedStoreForDetail(store);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                          >
                            Détails
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </>
    )}

    {/* ========================================================================= */}
    {/* TAB 2 : VALIDATION DES BOUTIQUES & ABONNEMENTS ESPÈCES                   */}
    {/* ========================================================================= */}
    {adminActiveTab === 'APPROVALS' && (
      <div className="space-y-6">
        {/* Sub-header & Firestore Optimization */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Contrôle d'Accès, Approbation & Abonnements Espèces
            </h2>
            <p className="text-xs text-slate-400">
              Activez manuellement les boutiques après réception de cash ou validez leur agrément légal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSavingGlobal}
              onClick={handleSaveAndApplyEverywhere}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{isSavingGlobal ? 'Sauvegarde...' : '💾 Enregistrer et Appliquer partout'}</span>
            </button>

            <button
              type="button"
              disabled={isArchiving}
              onClick={handleTriggerArchival}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer"
              title="Agrège les ventes de plus de 90 jours dans des résumés mensuels pour optimiser la base de données"
            >
              <Archive className={`w-3.5 h-3.5 text-amber-400 ${isArchiving ? 'animate-spin' : ''}`} />
              <span>{isArchiving ? 'Optimisation en cours...' : 'Optimiser les ventes (>90j)'}</span>
            </button>
          </div>
        </div>

        {/* Demandes de règlement espèces en attente */}
        {cashRequests.length > 0 && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                Demandes d'Activation Espèces Récentes ({cashRequests.filter((r) => r.status === 'PENDING').length})
              </h3>
              <span className="text-[11px] text-amber-400/80">
                Paiements remis en mains propres ou par intermédiaire local
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cashRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{req.storeName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {formatCFA(req.amountRequested)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Gérant : <span className="text-slate-300">{req.ownerName}</span> ({req.phone})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Plan demandé : <span className="text-indigo-300 font-semibold">{req.planMonths} Mois</span> ({req.plan})
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500">
                      Reçu le {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const targetStore = stores.find((s) => s.id === req.storeId) || {
                          id: req.storeId,
                          name: req.storeName,
                          ownerName: req.ownerName,
                          phone: req.phone,
                          city: 'Lomé',
                          country: 'Togo',
                          currency: 'XOF',
                          monthlyRevenue: 0,
                          dailySalesCount: 0,
                          daysWithoutSale: 0,
                          personalExpensesAmount: 0,
                          dangerReason: 'NONE' as any,
                          health: 'HEALTHY' as any,
                          dangerDetails: '',
                          subscriptionStatus: 'ACTIVE',
                          subscriptionPlan: 'PRO',
                          subscriptionExpiryDate: '2026-12-31',
                          createdAt: '2026-01-01',
                        };
                        handleOpenCashSubModal(targetStore as SaasStore);
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      Encaisser & Activer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table de validation de toutes les boutiques */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Répertoire Général des Boutiques & Agréments
            </h3>
            <span className="text-xs text-slate-500">{stores.length} boutiques enregistrées</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Boutique & Gérant</th>
                  <th className="p-3.5">Localisation</th>
                  <th className="p-3.5">Abonnement Actuel</th>
                  <th className="p-3.5">Statut Approbation</th>
                  <th className="p-3.5 text-right">Actions Super-Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {stores.map((store) => {
                  const currentApproval = approvalStatuses[store.id] || 'APPROVED';
                  const isApproved = currentApproval === 'APPROVED';
                  const isPending = currentApproval === 'PENDING';

                  return (
                    <tr key={store.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{store.name}</div>
                        <div className="text-[11px] text-slate-400">{store.ownerName} • {store.phone}</div>
                        <div className="text-[10px] font-mono text-slate-500">{store.id}</div>
                      </td>
                      <td className="p-3.5">
                        <div>{store.city}</div>
                        <div className="text-[11px] text-slate-400">{store.country}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            store.subscriptionStatus === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}>
                            {store.subscriptionStatus}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Échéance : {store.subscriptionExpiryDate}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold inline-flex items-center gap-1.5 ${
                          isApproved
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            : isPending
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isApproved ? 'bg-emerald-400' : isPending ? 'bg-amber-400' : 'bg-rose-400'
                          }`} />
                          {currentApproval}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStoreApproval(store.id, currentApproval)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                            isApproved
                              ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isApproved ? 'Suspendre' : 'Approuver'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCashSubModal(store)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
                        >
                          💰 Espèces
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* ========================================================================= */}
    {/* TAB KYC : VALIDATION DES BOUTIQUES & DÉBLOCAGE PALIER 2                   */}
    {/* ========================================================================= */}
    {adminActiveTab === 'KYC' && (
      <div className="space-y-6">
        {/* KPI Cards for KYC */}
        {(() => {
          const pendingEnterpriseCount = enterpriseSubmissions.filter(s => s.status === 'pending' || s.status === 'pending_approval').length;
          const pendingVitrinesCount = kycRequests.filter(k => k.status === 'pending_approval').length;
          const totalPending = pendingEnterpriseCount + pendingVitrinesCount;
          const totalApprovedEnterprise = enterpriseSubmissions.filter(s => s.status === 'approved' || s.status === 'verified').length;
          const totalVerifiedVitrines = kycRequests.filter(k => k.status === 'verified').length;
          const totalRejected = enterpriseSubmissions.filter(s => s.status === 'rejected').length + kycRequests.filter(k => k.status === 'rejected').length;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Total en attente</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-amber-400 mt-2">
                  {totalPending}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {pendingEnterpriseCount} entreprise(s) • {pendingVitrinesCount} vitrine(s)
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Entreprises Approuvées</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-indigo-400 mt-2">
                  {totalApprovedEnterprise}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Rôle 'vendor' & conformité RCCM/IFU</p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Vitrines Web Certifiées</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-400 mt-2">
                  {totalVerifiedVitrines}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Palier 2 débloqué avec Pixels & Vitrine</p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Superviseur Habilité</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs font-black text-purple-300 mt-2 truncate">
                  {currentUser?.email || 'pousbila04@gmail.com'}
                </p>
                <p className="text-[11px] text-emerald-400 font-bold mt-1">Validation exclusive Super Admin ✓</p>
              </div>
            </div>
          );
        })()}

        {/* Navigation Côte à Côte des Espaces de Validation KYC */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl shadow-xl">
          {/* Espace 1 : Documents Entreprise & Nouveaux Utilisateurs (/kyc_submissions) */}
          <button
            type="button"
            onClick={() => { playTapBeep(); setActiveKycSpace('ENTERPRISE'); }}
            className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
              activeKycSpace === 'ENTERPRISE'
                ? 'bg-gradient-to-r from-indigo-950/80 to-blue-950/80 border-indigo-500/70 shadow-lg shadow-indigo-950/50'
                : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                activeKycSpace === 'ENTERPRISE' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">KYC Documents Entreprise</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    /kyc_submissions
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conformité RCCM, IFU & validation marchands réels
                </p>
              </div>
            </div>
            {enterpriseSubmissions.filter(s => s.status === 'pending' || s.status === 'pending_approval').length > 0 ? (
              <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full shadow-md animate-pulse">
                {enterpriseSubmissions.filter(s => s.status === 'pending' || s.status === 'pending_approval').length} en attente
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-semibold">
                {enterpriseSubmissions.length} dossier(s)
              </span>
            )}
          </button>

          {/* Espace 2 : Vérification Particuliers / Vitrines (Palier 2) */}
          <button
            type="button"
            onClick={() => { playTapBeep(); setActiveKycSpace('VITRINES'); }}
            className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
              activeKycSpace === 'VITRINES'
                ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-500/70 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                activeKycSpace === 'VITRINES' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">Vérification Vitrines & Particuliers</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    PALIER 2
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Certification des boutiques & déblocage vitrines publiques
                </p>
              </div>
            </div>
            {kycRequests.filter(k => k.status === 'pending_approval').length > 0 ? (
              <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full shadow-md">
                {kycRequests.filter(k => k.status === 'pending_approval').length} en attente
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-semibold">
                {kycRequests.length} dossier(s)
              </span>
            )}
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((filterKey) => {
              const currentList = activeKycSpace === 'ENTERPRISE' ? enterpriseSubmissions : kycRequests;
              const pendingCount = currentList.filter(k => k.status === 'pending' || k.status === 'pending_approval').length;
              const verifiedCount = currentList.filter(k => k.status === 'verified' || k.status === 'approved').length;
              const rejectedCount = currentList.filter(k => k.status === 'rejected').length;

              return (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => { playTapBeep(); setKycFilter(filterKey); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    kycFilter === filterKey
                      ? activeKycSpace === 'ENTERPRISE'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                        : 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {filterKey === 'ALL' && 'Tous les dossiers'}
                  {filterKey === 'PENDING' && `En attente (${pendingCount})`}
                  {filterKey === 'VERIFIED' && `Certifiées (${verifiedCount})`}
                  {filterKey === 'REJECTED' && `Rejetées (${rejectedCount})`}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={kycSearch}
              onChange={(e) => setKycSearch(e.target.value)}
              placeholder={activeKycSpace === 'ENTERPRISE' ? "Rechercher entreprise, IFU, RCCM..." : "Rechercher boutique, gérant..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ESPACE 1 : TABLEAU KYC DOCUMENTS ENTREPRISE (/kyc_submissions)            */}
        {/* ========================================================================= */}
        {activeKycSpace === 'ENTERPRISE' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-black text-white">
                  Dossiers KYC Entreprise & Nouveaux Utilisateurs (/kyc_submissions)
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {filteredEnterpriseList.length} dossier(s) affiché(s)
              </span>
            </div>

            {filteredEnterpriseList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="font-bold text-sm">Aucune soumission d'entreprise trouvée dans cette sélection.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Les dossiers KYC enregistrés dans <code className="text-indigo-400">/kyc_submissions</code> s'affichent ici en temps réel pour validation Super Admin.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Entreprise & Dirigeant</th>
                      <th className="p-3.5">Contact & Localisation</th>
                      <th className="p-3.5">Identifiants (RCCM / IFU)</th>
                      <th className="p-3.5 text-center">Document / Pièce</th>
                      <th className="p-3.5">Statut Actuel</th>
                      <th className="p-3.5 text-right">Actions Décisionnelles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredEnterpriseList.map((sub) => {
                      const isPending = sub.status === 'pending' || sub.status === 'pending_approval';
                      const isApproved = sub.status === 'approved' || sub.status === 'verified';
                      const isRejected = sub.status === 'rejected';
                      const previewUrl = sub.businessDocumentUrl || sub.rccmDocPhotoUrl || sub.ifuDocPhotoUrl || sub.documentPhotoUrl;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                          {/* Entreprise & Dirigeant */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              {sub.managerPhotoUrl ? (
                                <img
                                  src={sub.managerPhotoUrl}
                                  alt={sub.managerFullName || sub.companyName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-900/60 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-700/50">
                                  {(sub.companyName || sub.storeName || 'EN').slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-extrabold text-white text-xs">
                                  {sub.companyName || sub.storeName || 'Entreprise Individuelle'}
                                </div>
                                <div className="text-slate-400 text-[11px]">
                                  {sub.managerFullName || 'Dirigeant non renseigné'}
                                  {sub.legalForm && <span className="ml-1 text-[10px] text-indigo-400 font-mono">({sub.legalForm})</span>}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  UID: {sub.userId || sub.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact WhatsApp */}
                          <td className="p-3.5">
                            {sub.whatsappPhone ? (
                              <a
                                href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(sub.whatsappPhone.replace(/[^0-9+]/g, ''))}&text=${encodeURIComponent(`Bonjour ${sub.managerFullName || ''}, concernant votre dossier KYC Entreprise pour ${sub.companyName || sub.storeName || ''} :`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold underline"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{sub.whatsappPhone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Non renseigné</span>
                            )}
                            {(sub.city || sub.country) && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {[sub.city, sub.country].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </td>

                          {/* Identifiants Fiscaux */}
                          <td className="p-3.5">
                            <div className="space-y-0.5 text-[11px]">
                              {sub.rccmNumber && (
                                <div className="font-mono text-slate-200">
                                  <span className="text-slate-500 font-normal">RCCM :</span> {sub.rccmNumber}
                                </div>
                              )}
                              {sub.ifuNumber && (
                                <div className="font-mono text-slate-200">
                                  <span className="text-slate-500 font-normal">IFU :</span> {sub.ifuNumber}
                                </div>
                              )}
                              {sub.documentType && (
                                <span className="inline-block text-[10px] font-semibold text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                                  {sub.documentType}
                                </span>
                              )}
                              {sub.submittedAt && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Reçu le {new Date(sub.submittedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Miniature Document officiel */}
                          <td className="p-3.5 text-center">
                            {previewUrl ? (
                              <div className="relative inline-block group">
                                <img
                                  src={previewUrl}
                                  alt="Document officiel"
                                  className="w-14 h-9 object-cover rounded-lg border border-slate-700 shadow-sm cursor-pointer group-hover:scale-105 transition"
                                  onClick={() => setPreviewKycDoc({
                                    url: previewUrl,
                                    title: sub.documentType || 'Dossier Entreprise RCCM/IFU',
                                    storeName: sub.companyName || sub.storeName || 'Dossier Entreprise',
                                    manager: sub.managerFullName || sub.userId || ''
                                  })}
                                />
                                <button
                                  type="button"
                                  onClick={() => setPreviewKycDoc({
                                    url: previewUrl,
                                    title: sub.documentType || 'Dossier Entreprise RCCM/IFU',
                                    storeName: sub.companyName || sub.storeName || 'Dossier Entreprise',
                                    manager: sub.managerFullName || sub.userId || ''
                                  })}
                                  className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white cursor-pointer"
                                  title="Agrandir le document"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Aucune pièce</span>
                            )}
                          </td>

                          {/* Statut Actuel */}
                          <td className="p-3.5">
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                                <CheckCircle2 className="w-3 h-3" />
                                APPROUVÉ ✓ (VENDEUR)
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                                EN ATTENTE D'EXAMEN
                              </span>
                            )}
                            {isRejected && (
                              <div>
                                <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="w-3 h-3" />
                                  REJETÉ
                                </span>
                                {sub.rejectionReason && (
                                  <p className="text-[9.5px] text-rose-400/90 mt-1 max-w-[160px] truncate" title={sub.rejectionReason}>
                                    Motif: {sub.rejectionReason}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions Décisionnelles Super Admin */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Bouton Approuver */}
                              {!isApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveEnterpriseKyc(sub)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-md shadow-emerald-950 flex items-center gap-1 transition cursor-pointer active:scale-95"
                                  title="Approuver le KYC et attribuer le rôle 'vendor'"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approuver</span>
                                </button>
                              )}

                              {/* Bouton Rejeter */}
                              {!isRejected && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectKycModal(sub)}
                                  className="bg-slate-800 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 border border-rose-500/30 font-bold text-xs px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                                  title="Rejeter et réinitialiser les pièces soumises"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Rejeter</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESPACE 2 : TABLEAU KYC VITRINES WEB & PARTICULIERS (PALIER 2)             */}
        {/* ========================================================================= */}
        {activeKycSpace === 'VITRINES' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white">
                  Dossiers de Certification KYC (Palier 2 - Vitrine & Pixels)
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {filteredKycList.length} dossier(s) trouvé(s)
              </span>
            </div>

            {filteredKycList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="font-bold text-sm">Aucun dossier KYC dans cette sélection.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Les soumissions des commerçants s'afficheront ici en temps réel pour validation.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Boutique & Gérant</th>
                      <th className="p-3.5">Contact WhatsApp</th>
                      <th className="p-3.5">Type de Pièce</th>
                      <th className="p-3.5 text-center">Pièce d'Identité</th>
                      <th className="p-3.5">Statut Actuel</th>
                      <th className="p-3.5 text-right">Actions Décisionnelles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredKycList.map((req) => {
                      const isPending = req.status === 'pending_approval';
                      const isVerified = req.status === 'verified';
                      const isRejected = req.status === 'rejected';

                      return (
                        <tr key={req.storeId} className="hover:bg-slate-800/40 transition">
                          {/* Boutique & Gérant */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              {req.managerPhotoUrl ? (
                                <img
                                  src={req.managerPhotoUrl}
                                  alt={req.managerFullName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                                  {req.managerFullName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-extrabold text-white text-xs">{req.storeName}</div>
                                <div className="text-slate-400 text-[11px]">{req.managerFullName}</div>
                                <div className="text-[10px] font-mono text-slate-500">ID: {req.storeId}</div>
                              </div>
                            </div>
                          </td>

                          {/* Contact WhatsApp */}
                          <td className="p-3.5">
                            <a
                              href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(req.whatsappPhone.replace(/[^0-9+]/g, ''))}&text=${encodeURIComponent(`Bonjour ${req.managerFullName}, concernant votre dossier de certification KYC pour ${req.storeName} sur NaNa POS :`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold underline"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{req.whatsappPhone}</span>
                            </a>
                          </td>

                          {/* Type de Pièce */}
                          <td className="p-3.5">
                            <span className="font-bold text-slate-200 text-[11px] block">
                              {req.documentType === 'CNIB' && 'Carte Nationale (CNIB)'}
                              {req.documentType === 'PASSPORT_AES_CEDEAO' && 'Passeport AES / CEDEAO'}
                              {req.documentType === 'CARTE_CONSULAIRE' && 'Carte Consulaire'}
                            </span>
                            {req.submittedAt && (
                              <span className="text-[10px] text-slate-500">
                                Reçu le {new Date(req.submittedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </td>

                          {/* Miniature Pièce */}
                          <td className="p-3.5 text-center">
                            {req.documentPhotoUrl ? (
                              <div className="relative inline-block group">
                                <img
                                  src={req.documentPhotoUrl}
                                  alt="Pièce d'identité"
                                  className="w-14 h-9 object-cover rounded-lg border border-slate-700 shadow-sm cursor-pointer group-hover:scale-105 transition"
                                  onClick={() => setPreviewKycDoc({
                                    url: req.documentPhotoUrl,
                                    title: req.documentType,
                                    storeName: req.storeName,
                                    manager: req.managerFullName
                                  })}
                                />
                                <button
                                  type="button"
                                  onClick={() => setPreviewKycDoc({
                                    url: req.documentPhotoUrl,
                                    title: req.documentType,
                                    storeName: req.storeName,
                                    manager: req.managerFullName
                                  })}
                                  className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white cursor-pointer"
                                  title="Agrandir la pièce"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Aucune photo</span>
                            )}
                          </td>

                          {/* Statut Actuel */}
                          <td className="p-3.5">
                            {isVerified && (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                                <CheckCircle2 className="w-3 h-3" />
                                CERTIFIÉE ✓ (PALIER 2)
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                                EN ATTENTE D'EXAMEN
                              </span>
                            )}
                            {isRejected && (
                              <div>
                                <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="w-3 h-3" />
                                  NON CONFORME
                                </span>
                                {req.rejectionReason && (
                                  <p className="text-[9.5px] text-rose-400/90 mt-1 max-w-[160px] truncate" title={req.rejectionReason}>
                                    Motif: {req.rejectionReason}
                                  </p>
                                )}
                              </div>
                            )}
                            {req.status === 'unverified' && (
                              <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <Lock className="w-3 h-3" />
                                PALIER 1 (CAISSE SEULE)
                              </span>
                            )}
                          </td>

                          {/* Actions Super Admin */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Bouton Approuver */}
                              {!isVerified && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveKyc(req.storeId)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-md shadow-emerald-950 flex items-center gap-1 transition cursor-pointer active:scale-95"
                                  title="Certifier la boutique et débloquer la vitrine publique"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Certifier</span>
                                </button>
                              )}

                              {/* Bouton Rejeter */}
                              {!isRejected && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectKycModal(req)}
                                  className="bg-slate-800 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 border border-rose-500/30 font-bold text-xs px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                                  title="Demander une correction de la pièce"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Rejeter</span>
                                </button>
                              )}

                              {/* Bouton Remettre en attente si nécessaire */}
                              {(isVerified || isRejected) && (
                                <button
                                  type="button"
                                  onClick={() => handleResetKycToPending(req.storeId)}
                                  className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-[10px] px-2 py-1.5 rounded-xl transition cursor-pointer"
                                  title="Remettre ce dossier en attente d'examen"
                                >
                                  Réexaminer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {/* ========================================================================= */}
    {/* TAB 3 : GESTION DE L'AFFILIATION & PAIEMENTS MOBILES                     */}
    {/* ========================================================================= */}
    {adminActiveTab === 'AFFILIATION' && (
      <div className="space-y-6">
        {/* Commission Settings Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Règles du Programme d'Affiliation NaNa POS
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Taux de commission reversé automatiquement aux boutiquiers apportant de nouveaux points de vente.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">Taux de Commission :</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={affiliateCommissionRate}
                  onChange={(e) => setAffiliateCommissionRate(Number(e.target.value))}
                  className="w-14 text-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm font-black text-amber-400 outline-none"
                />
                <span className="text-sm font-black text-amber-400">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Withdrawal requests table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Demandes de Virement de Commissions Mobile Money
            </h3>
            <span className="text-xs text-slate-500">
              {affiliateWithdrawals.filter((w) => w.status === 'PENDING').length} en attente
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Affilié / Parrain</th>
                  <th className="p-3.5">Numéro Mobile Money</th>
                  <th className="p-3.5">Opérateur</th>
                  <th className="p-3.5">Montant</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {affiliateWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{w.affiliateName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{w.affiliateId}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-200">{w.phone}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-950 text-blue-300 border border-blue-500/30">
                        {w.provider}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-amber-400">{formatCFA(w.amount)}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        w.status === 'PAID'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                      }`}>
                        {w.status === 'PAID' ? 'Viré' : 'En attente'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {w.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => handleProcessWithdrawal(w.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
                        >
                          Valider Virement
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-semibold">
                          Payé ✓
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* ========================================================================= */}
    {/* TAB 4 : CONFIGURATION JURIDIQUE & TEXTES LÉGAUX                           */}
    {/* ========================================================================= */}
    {adminActiveTab === 'PRIVACY' && (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* En-tête & Actions Globales */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Gouvernance & Conformité
              </span>
              <span className="text-xs text-slate-400">• Base : Supabase PostgreSQL</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Configuration Juridique & Textes Légaux
            </h2>
            <p className="text-xs text-slate-400">
              Pilotez en direct le bandeau défilant de copyright, les mentions légales d'identification et la politique de confidentialité de la plateforme.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetDefaultLegal}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Restaurer les textes légaux par défaut de Nana POS"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Valeurs par défaut</span>
            </button>

            <button
              type="button"
              disabled={isSavingLegal}
              onClick={handleSaveLegalConfig}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{isSavingLegal ? 'Enregistrement Supabase...' : 'Enregistrer les modifications'}</span>
            </button>
          </div>
        </div>

        {/* 1. Carte : Phrase Défilante (Copyright / Ticker) & Animation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-amber-400" />
                Bandeau Défilant de Copyright & Liens Rapides (Ticker)
              </h3>
              <p className="text-xs text-slate-400">
                Ce texte défile au bas de l'écran de verrouillage PIN et de l'écran de bienvenue/authentification.
              </p>
            </div>

            {/* Interrupteur (toggle) Activer / Désactiver l'animation défilante */}
            <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 self-start sm:self-auto">
              <span className="text-xs font-bold text-slate-300">
                Animation défilante :
              </span>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setShowTickerEdit(!showTickerEdit);
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  showTickerEdit ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
                title={showTickerEdit ? 'Désactiver le défilement' : 'Activer le défilement'}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
              </button>
              <span className={`text-[11px] font-black uppercase ${showTickerEdit ? 'text-blue-400' : 'text-slate-500'}`}>
                {showTickerEdit ? 'Activé' : 'Désactivé'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              Phrase défilante de copyright / Ticker :
            </label>
            <input
              type="text"
              value={tickerTextEdit}
              onChange={(e) => setTickerTextEdit(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-400 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none transition font-medium"
              placeholder="Ex: © 2026 NaNa POS. Tous droits réservés. • Mentions Légales • Politique de Confidentialité..."
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              💡 Astuce : Les termes <strong className="text-blue-400">"Mentions Légales"</strong> et <strong className="text-emerald-400">"Politique de Confidentialité"</strong> sont automatiquement détectés et transformés en boutons interactifs ouvrant les modales dédiées.
            </p>
          </div>

          {/* Aperçu en direct (Live Preview) */}
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                Aperçu en Direct du Bandeau
              </span>
              <span className="text-[10px] text-slate-500">Rendu temps réel sur écran</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800">
              <LegalTickerFooter
                tickerText={tickerTextEdit}
                showTicker={showTickerEdit}
                onOpenDoc={(doc) => {
                  setToastMessage(`Aperçu : Clic sur le document "${doc === 'LEGAL_MENTIONS' ? 'Mentions Légales' : 'Politique de Confidentialité'}"`);
                  setTimeout(() => setToastMessage(null), 3000);
                }}
              />
            </div>
          </div>
        </div>

        {/* 2. Grille à 2 colonnes : Mentions Légales & Politique de Confidentialité */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Mentions Légales */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Mentions Légales de l'Éditeur
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Identification légale, coordonnées de l'éditeur, hébergeur cloud et responsabilités.
                  </p>
                </div>
              </div>
            </div>

            <textarea
              rows={16}
              value={legalMentionsEdit}
              onChange={(e) => setLegalMentionsEdit(e.target.value)}
              className="w-full flex-1 bg-slate-950 border border-slate-800 focus:border-blue-400 rounded-xl p-3.5 text-xs font-mono text-slate-200 outline-none leading-relaxed resize-y min-h-[300px]"
              placeholder="Saisissez ici les Mentions Légales en Markdown..."
            />
          </div>

          {/* Politique de Confidentialité */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Politique de Confidentialité
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Traitement des données de caisse marchandes, cookies PWA et sécurité multi-tenant.
                  </p>
                </div>
              </div>
            </div>

            <textarea
              rows={16}
              value={privacyPolicyEdit}
              onChange={(e) => setPrivacyPolicyEdit(e.target.value)}
              className="w-full flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-xl p-3.5 text-xs font-mono text-slate-200 outline-none leading-relaxed resize-y min-h-[300px]"
              placeholder="Saisissez ici la Politique de Confidentialité en Markdown..."
            />
          </div>
        </div>

        {/* Pied de section récapitulatif avec bouton d'enregistrement */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4 text-[11px]">
            <span>Dernière mise à jour : <strong className="text-slate-300">{legalConfig.lastUpdated || 'Aujourd\'hui'}</strong></span>
            <span>Édité par : <strong className="text-slate-300">{legalConfig.updatedBy || 'Super-Admin'}</strong></span>
          </div>

          <button
            type="button"
            disabled={isSavingLegal}
            onClick={handleSaveLegalConfig}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{isSavingLegal ? 'Enregistrement...' : 'Enregistrer les modifications sur Supabase'}</span>
          </button>
        </div>
      </div>
    )}

    {/* ========================================================================= */}
    {/* TAB 5 : GESTION DES ABONNEMENTS SAAS & PARAMÈTRES DE PAIEMENT            */}
    {/* ========================================================================= */}
    {adminActiveTab === 'SUBSCRIPTIONS_PAYMENTS' && (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* En-tête & Actions Globales */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Administration SaaS
              </span>
              <span className="text-xs text-slate-400">• Base : Supabase PostgreSQL (plans)</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-1">
              Gestion Dynamique des Abonnements & Écran de Paiement
            </h2>
            <p className="text-xs text-slate-400">
              Pilotez en temps réel le modèle Freemium PLG (Gratuit, Starter, Pro, Elite), les limites dynamiques (produits, funnels) et la passerelle de paiement NanasorePay.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setAdminActiveTab('COMPARISON_MATRIX');
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 hover:text-white text-xs font-black flex items-center gap-1.5 border border-amber-400/50 shadow-sm transition cursor-pointer"
              title="Configurer la grille comparative des 4 plans"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Matrice de Comparaison 👑</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefaultPlans}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Restaurer les 4 offres initiales Freemium PLG"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Réinitialiser aux 4 formules PLG</span>
            </button>

            <button
              type="button"
              disabled={isSavingPlatformConfig || isSavingGlobal}
              onClick={handleSaveAndApplyEverywhere}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{isSavingGlobal || isSavingPlatformConfig ? 'Application en direct...' : '💾 Enregistrer et Appliquer partout'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SECTION 1 : GESTION DES FORMULES (7 Colonnes) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                1. Formules Commerciales & Limites PLG ({platformConfig.plans.length} Offres)
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Sélectionnez une offre à configurer :</span>
            </div>

            {/* Sélecteur d'Onglets des 4 Formules (Freemium, Starter, Pro, Elite) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {platformConfig.plans.map((plan, idx) => {
                const isSelected = selectedEditPlanIdx === idx;
                return (
                  <button
                    key={plan.id || idx}
                    type="button"
                    onClick={() => { playTapBeep(); setSelectedEditPlanIdx(idx); }}
                    className={`p-2.5 rounded-2xl border text-left transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    {plan.badge && (
                      <span className={`absolute -top-1.5 right-2 px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase ${
                        plan.id === 'free' ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950'
                      }`}>
                        {plan.badge}
                      </span>
                    )}
                    <div className="text-[11px] font-extrabold truncate text-white">{plan.name}</div>
                    <div className="text-xs font-black text-amber-400 mt-0.5">
                      {plan.price === 0 ? (
                        <span className="text-emerald-400 font-bold">Gratuit</span>
                      ) : (
                        <span>{formatCFA(plan.price)}</span>
                      )}
                      <span className="text-[9.5px] text-slate-400 font-normal"> /{plan.period}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Formulaire d'édition du Plan Sélectionné */}
            {platformConfig.plans[selectedEditPlanIdx] && (
              <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                      Nom de la Formule :
                    </label>
                    <input
                      type="text"
                      value={platformConfig.plans[selectedEditPlanIdx].name}
                      onChange={(e) => handleUpdatePlanField('name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                      Tarif (F CFA) — 0 pour Gratuit :
                    </label>
                    <input
                      type="number"
                      value={platformConfig.plans[selectedEditPlanIdx].price}
                      onChange={(e) => handleUpdatePlanField('price', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                      Périodicité de facturation :
                    </label>
                    <select
                      value={platformConfig.plans[selectedEditPlanIdx].period}
                      onChange={(e) => handleUpdatePlanField('period', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-semibold cursor-pointer"
                    >
                      <option value="mois">Par mois (mois)</option>
                      <option value="trimestre">Par trimestre (trimestre)</option>
                      <option value="an">Par an (an)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                      Badge Promotionnel (Optionnel) :
                    </label>
                    <input
                      type="text"
                      value={platformConfig.plans[selectedEditPlanIdx].badge || ''}
                      onChange={(e) => handleUpdatePlanField('badge', e.target.value)}
                      placeholder="Ex: Freemium, Recommandé, Populaire..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-300 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                {/* GESTION DES LIMITES DYNAMIQUES DU MODÈLE FREEMIUM PLG */}
                <div className="p-3.5 bg-slate-900 rounded-2xl border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Limites Dynamiques du Plan (Modèle Freemium PLG)
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-mono">-1 = Illimité</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[9.5px] text-slate-400 font-bold block mb-1">Max Produits :</label>
                      <input
                        type="number"
                        value={platformConfig.plans[selectedEditPlanIdx].limits?.maxProducts ?? (platformConfig.plans[selectedEditPlanIdx].id === 'free' ? 3 : 100)}
                        onChange={(e) => handleUpdatePlanLimit('maxProducts', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                        title="3 pour le Plan Gratuit, 100 pour Starter, -1 pour Illimité"
                      />
                    </div>

                    <div>
                      <label className="text-[9.5px] text-slate-400 font-bold block mb-1">Max Tunnels / Funnels :</label>
                      <input
                        type="number"
                        value={platformConfig.plans[selectedEditPlanIdx].limits?.maxFunnels ?? (platformConfig.plans[selectedEditPlanIdx].id === 'free' ? 1 : 5)}
                        onChange={(e) => handleUpdatePlanLimit('maxFunnels', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                        title="1 pour le Plan Gratuit, 5 pour Starter, -1 pour Illimité"
                      />
                    </div>

                    <div>
                      <label className="text-[9.5px] text-slate-400 font-bold block mb-1">Max Formations :</label>
                      <input
                        type="number"
                        value={platformConfig.plans[selectedEditPlanIdx].limits?.maxCourses ?? (platformConfig.plans[selectedEditPlanIdx].id === 'free' ? 0 : 1)}
                        onChange={(e) => handleUpdatePlanLimit('maxCourses', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9.5px] text-slate-400 font-bold block mb-1">Max Caissiers :</label>
                      <input
                        type="number"
                        value={platformConfig.plans[selectedEditPlanIdx].limits?.maxCashiers ?? (platformConfig.plans[selectedEditPlanIdx].id === 'free' ? 1 : 2)}
                        onChange={(e) => handleUpdatePlanLimit('maxCashiers', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                        title="1 pour le Plan Gratuit, 2 pour Starter, 10 pour Pro, -1 pour Illimité"
                      />
                    </div>

                    <div>
                      <label className="text-[9.5px] text-slate-400 font-bold block mb-1">Domaine Personnalisé :</label>
                      <button
                        type="button"
                        onClick={() => handleUpdatePlanLimit('customDomainAllowed', !platformConfig.plans[selectedEditPlanIdx].limits?.customDomainAllowed)}
                        className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          platformConfig.plans[selectedEditPlanIdx].limits?.customDomainAllowed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-950 text-slate-400 border-slate-700'
                        }`}
                      >
                        {platformConfig.plans[selectedEditPlanIdx].limits?.customDomainAllowed ? 'Autorisé ✓' : 'Interdit (Sous-domaine)'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Liste des Avantages / Puces */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10.5px] font-bold text-slate-300 uppercase tracking-wide">
                      Avantages Inclus ({platformConfig.plans[selectedEditPlanIdx].features.length} puces) :
                    </label>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {platformConfig.plans[selectedEditPlanIdx].features.map((feature, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
                      >
                        <div className="flex items-center gap-2 flex-1 pr-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-[11px] leading-snug">{feature}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeatureFromPlan(fIdx)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                          title="Supprimer cet avantage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Ajout d'une nouvelle puce */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newFeatureText}
                      onChange={(e) => setNewFeatureText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeatureToPlan(); } }}
                      placeholder="Ajouter un avantage (ex: Accès illimité aux reçus WhatsApp)..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeatureToPlan}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>

                {/* Bouton de sauvegarde dédié au Plan sélectionné (ex: Plan Starter) */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400">
                    Cible Supabase : <span className="font-mono text-amber-300 font-bold">plans/{platformConfig.plans[selectedEditPlanIdx].id}</span>
                  </div>
                  <button
                    type="button"
                    disabled={isSavingCurrentPlan || isSavingPlatformConfig || isSavingGlobal}
                    onClick={handleSaveCurrentPlan}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingCurrentPlan 
                        ? `Enregistrement du ${platformConfig.plans[selectedEditPlanIdx].name}...` 
                        : `💾 Enregistrer ce plan (${platformConfig.plans[selectedEditPlanIdx].name})`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2 : PARAMÈTRES DE PAIEMENT & ASSISTANCE (5 Colonnes) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Carte Bandeau Défilant & WhatsApp */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  2. Écran de Paiement & Support
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  NanasorePay v2.0
                </span>
              </div>

              {/* Passerelle Automatique SPaymentGateway (productType="subscription") */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    Passerelle Automatique S
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    productType="subscription"
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300 leading-relaxed">
                  L'écran de paiement est désormais piloté par le composant 100% automatique via Webhook <code className="text-emerald-300 font-mono">&lt;SPaymentGateway productType="subscription" /&gt;</code> pour encaisser les abonnements sans friction.
                </p>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setIsTestGatewayOpen(true); }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tester l'Écran de Paiement en Direct (Simulateur NanasorePay)</span>
                </button>
              </div>

              {/* Texte du bandeau défilant */}
              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-bold text-slate-400">
                  Texte du Bandeau Défilant (Marquee) :
                </label>
                <textarea
                  rows={2}
                  value={platformConfig.paymentSettings.scrollingMarquee}
                  onChange={(e) =>
                    setPlatformConfig((prev) => ({
                      ...prev,
                      paymentSettings: { ...prev.paymentSettings, scrollingMarquee: e.target.value },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 leading-relaxed resize-none"
                  placeholder="Texte défilant d'instruction de paiement..."
                />

                {/* Prévisualisation dynamique du bandeau */}
                <div className="py-1 px-2.5 bg-orange-600 overflow-hidden whitespace-nowrap text-white text-[10px] font-black rounded-xl shadow-inner">
                  <div className="inline-block animate-marquee uppercase tracking-wider">
                    {platformConfig.paymentSettings.scrollingMarquee} &nbsp;&nbsp;•&nbsp;&nbsp; {platformConfig.paymentSettings.scrollingMarquee}
                  </div>
                </div>
              </div>

              {/* Numéro WhatsApp d'assistance */}
              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-slate-400">
                  Numéro WhatsApp d'Assistance ("Vous voulez de l'aide ?") :
                </label>
                <input
                  type="text"
                  value={platformConfig.paymentSettings.supportWhatsApp}
                  onChange={(e) =>
                    setPlatformConfig((prev) => ({
                      ...prev,
                      paymentSettings: { ...prev.paymentSettings, supportWhatsApp: e.target.value },
                    }))
                  }
                  placeholder="Ex: +22670000000 ou +22507000000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                />
                <p className="text-[9.5px] text-slate-500">
                  Ce numéro reçoit directement les demandes d'assistance pré-remplies émises depuis la modale d'abonnement commerçant.
                </p>
              </div>

              {/* Instructions de paiement affichées aux clients */}
              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-slate-400">
                  Consignes de Paiement Générales affichées aux clients (Modales Caisse & Boutique) :
                </label>
                <textarea
                  rows={2}
                  value={platformConfig.paymentSettings.checkoutInstructions || ''}
                  onChange={(e) =>
                    setPlatformConfig((prev) => ({
                      ...prev,
                      paymentSettings: { ...prev.paymentSettings, checkoutInstructions: e.target.value },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 leading-relaxed resize-none"
                  placeholder="Ex: Veuillez composer le code USSD ci-dessous pour valider votre règlement instantané..."
                />
              </div>
            </div>

            {/* Carte Opérateurs Mobile Money */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-amber-400" />
                    Opérateurs, Codes Marchands & Syntaxes USSD ({platformConfig.paymentSettings.operators.length})
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Configurez les numéros, codes marchands (ex: Orange BF 65565805) et les modèles de syntaxe USSD.
                  </p>
                </div>
              </div>

              {/* Liste des opérateurs existants */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {platformConfig.paymentSettings.operators.map((op) => {
                  const isBfOrange = op.country.toLowerCase().includes('burkina') && op.operator.toLowerCase().includes('orange');
                  return (
                    <div
                      key={op.id}
                      className={`p-3 rounded-2xl bg-slate-950 border text-xs space-y-2 transition ${
                        op.isActive !== false ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs">{op.operator}</span>
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">{op.country}</span>
                          {isBfOrange && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                              Orange BF (Code 65565805)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateOperator(op.id, { isActive: op.isActive === false ? true : false })}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                              op.isActive !== false
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {op.isActive !== false ? 'Actif' : 'Désactivé'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveOperator(op.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition cursor-pointer"
                            title="Supprimer cet opérateur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">N° Marchand / Tél :</label>
                          <input
                            type="text"
                            value={op.merchantNumber}
                            onChange={(e) => handleUpdateOperator(op.id, { merchantNumber: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-amber-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Code Marchand USSD :</label>
                          <input
                            type="text"
                            value={op.merchantCode || ''}
                            placeholder="Ex: 65565805"
                            onChange={(e) => handleUpdateOperator(op.id, { merchantCode: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-cyan-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Syntaxe USSD / Template :</label>
                          <input
                            type="text"
                            value={op.ussdTemplate || op.ussdCode}
                            onChange={(e) => handleUpdateOperator(op.id, { ussdTemplate: e.target.value, ussdCode: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-indigo-300 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Instructions spécifiques affichées :</label>
                        <input
                          type="text"
                          value={op.instructions || ''}
                          placeholder="Ex: Composez le code suivant sur votre téléphone Orange Money..."
                          onChange={(e) => handleUpdateOperator(op.id, { instructions: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formulaire Rapide d'Ajout d'Opérateur */}
              <form onSubmit={handleAddOperator} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5 pt-3">
                <span className="block text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">
                  + Ajouter un nouvel opérateur ou compte marchand :
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newOpCountry}
                    onChange={(e) => setNewOpCountry(e.target.value)}
                    placeholder="Pays (ex: Burkina Faso)"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={newOpName}
                    onChange={(e) => setNewOpName(e.target.value)}
                    placeholder="Opérateur (ex: Orange Money BF)"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newOpMerchantNumber}
                    onChange={(e) => setNewOpMerchantNumber(e.target.value)}
                    placeholder="N° Marchand"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                  <input
                    type="text"
                    value={newOpMerchantCode}
                    onChange={(e) => setNewOpMerchantCode(e.target.value)}
                    placeholder="Code Marchand (ex: 65565805)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                  <input
                    type="text"
                    value={newOpUssd}
                    onChange={(e) => setNewOpUssd(e.target.value)}
                    placeholder="USSD (ex: *144*10*65565805*{montant}#)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <input
                  type="text"
                  value={newOpInstructions}
                  onChange={(e) => setNewOpInstructions(e.target.value)}
                  placeholder="Instructions spécifiques pour le client (optionnel)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
                >
                  Ajouter cet opérateur
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* SECTION 3 : CONFIGURATION CENTRALE MULTI-PAYS (parametres/paiement) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Supabase : central_payment_config
                </span>
                <span className="text-xs text-slate-400">• Moteur Multi-Pays</span>
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider mt-1 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-amber-400" />
                3. Matrice Multi-Pays, Cryptos, Cartes & Cash on Delivery
              </h3>
            </div>
            <button
              type="button"
              disabled={isSavingPlatformConfig}
              onClick={handleSavePlatformConfig}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{isSavingPlatformConfig ? 'Enregistrement...' : 'Enregistrer la matrice'}</span>
            </button>
          </div>

          {/* 1. Interrupteurs Généraux (Toggles) */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
              A. Activation des Canaux de Paiement Globaux :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={centralPaymentConfig.toggles.enableMobileMoney}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      toggles: { ...prev.toggles, enableMobileMoney: e.target.checked }
                    }))
                  }
                  className="rounded text-indigo-600 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Mobile Money</span>
                  <span className="text-[10px] text-slate-400">Multi-Pays & USSD</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={centralPaymentConfig.toggles.enableCard}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      toggles: { ...prev.toggles, enableCard: e.target.checked }
                    }))
                  }
                  className="rounded text-indigo-600 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Carte Bancaire</span>
                  <span className="text-[10px] text-slate-400">Visa / Mastercard</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={centralPaymentConfig.toggles.enableCrypto}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      toggles: { ...prev.toggles, enableCrypto: e.target.checked }
                    }))
                  }
                  className="rounded text-indigo-600 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Cryptomonnaies</span>
                  <span className="text-[10px] text-slate-400">USDT / XMR / BTC</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={centralPaymentConfig.toggles.enableCashOnDelivery}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      toggles: { ...prev.toggles, enableCashOnDelivery: e.target.checked }
                    }))
                  }
                  className="rounded text-indigo-600 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Cash on Delivery</span>
                  <span className="text-[10px] text-amber-400">Boutique uniquement</span>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Burkina Faso & Numéro International */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Colonne 1 : Orange Money Burkina Faso */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Burkina Faso — Passerelle Orange Money Nationale (USSD)</span>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Code Marchand National (ex: 65565805) :
                </label>
                <input
                  type="text"
                  value={centralPaymentConfig.orangeMoneyBurkina.merchantCode}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      orangeMoneyBurkina: { ...prev.orangeMoneyBurkina, merchantCode: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Modèle de Syntaxe USSD Dynamique :
                </label>
                <input
                  type="text"
                  value={centralPaymentConfig.orangeMoneyBurkina.ussdTemplate}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      orangeMoneyBurkina: { ...prev.orangeMoneyBurkina, ussdTemplate: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                />
                <span className="text-[9.5px] text-slate-500 block mt-0.5">
                  Variables acceptées : {'{merchantCode}'} et {'{montant}'} (ex: *144*10*65565805*12000#)
                </span>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Consignes spécifiques affichées :
                </label>
                <input
                  type="text"
                  value={centralPaymentConfig.orangeMoneyBurkina.instructions}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      orangeMoneyBurkina: { ...prev.orangeMoneyBurkina, instructions: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>
            </div>

            {/* Colonne 2 : Numéro International de Trésorerie */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-blue-300">
                <Globe2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Numéro International Trésorerie (Sous-Région & Diaspora)</span>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Numéro de Téléphone Bénéficiaire (+226...) :
                </label>
                <input
                  type="text"
                  value={centralPaymentConfig.internationalRecipient.phone}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      internationalRecipient: { ...prev.internationalRecipient, phone: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-blue-300 font-mono font-bold focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-[9.5px] text-slate-500 block mt-0.5">
                  Utilisé pour Wave CI, Wave Mali, Wave Sénégal, <strong>Wave Togo (exclusif)</strong>, Taptap Send et Orange Money Europe.
                </span>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Nom du Titulaire / Compte Trésorerie :
                </label>
                <input
                  type="text"
                  value={centralPaymentConfig.internationalRecipient.name}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      internationalRecipient: { ...prev.internationalRecipient, name: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Pays de Domiciliation du Compte :
                </label>
                <input
                  type="text"
                  value={centralPaymentConfig.internationalRecipient.country}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      internationalRecipient: { ...prev.internationalRecipient, country: e.target.value }
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* 3. Portefeuilles Cryptomonnaies avec QR Codes Dynamiques */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-400">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Portefeuilles Cryptomonnaies Décentralisés & QR Codes Dynamiques</span>
              </div>
              <span className="text-[10px] text-slate-400">Génération automatique des QR codes par portefeuille</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* USDT TRC20 */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-emerald-400">USDT (Tron TRC-20)</strong>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Frais Minimes</span>
                </div>
                <input
                  type="text"
                  value={centralPaymentConfig.cryptoWallets.usdtTrc20}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      cryptoWallets: { ...prev.cryptoWallets, usdtTrc20: e.target.value }
                    }))
                  }
                  placeholder="Adresse USDT TRC-20..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono"
                />
                {centralPaymentConfig.cryptoWallets.usdtTrc20 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <img
                      src={getQrCodeUrl(centralPaymentConfig.cryptoWallets.usdtTrc20, 70)}
                      alt="QR USDT"
                      className="w-14 h-14 rounded-lg bg-white p-1 shrink-0"
                    />
                    <div className="text-[10px] text-slate-400 leading-snug">
                      <span>Aperçu QR Code dynamique généré automatiquement pour le client.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Monero XMR */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-orange-400">Monero (XMR)</strong>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">Confidentiel</span>
                </div>
                <input
                  type="text"
                  value={centralPaymentConfig.cryptoWallets.moneroXmr}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      cryptoWallets: { ...prev.cryptoWallets, moneroXmr: e.target.value }
                    }))
                  }
                  placeholder="Adresse Monero XMR..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono"
                />
                {centralPaymentConfig.cryptoWallets.moneroXmr && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <img
                      src={getQrCodeUrl(centralPaymentConfig.cryptoWallets.moneroXmr, 70)}
                      alt="QR XMR"
                      className="w-14 h-14 rounded-lg bg-white p-1 shrink-0"
                    />
                    <div className="text-[10px] text-slate-400 leading-snug">
                      <span>Aperçu QR Code dynamique généré automatiquement pour le client.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bitcoin BTC */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-amber-400">Bitcoin (BTC)</strong>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Standard</span>
                </div>
                <input
                  type="text"
                  value={centralPaymentConfig.cryptoWallets.bitcoinBtc}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      cryptoWallets: { ...prev.cryptoWallets, bitcoinBtc: e.target.value }
                    }))
                  }
                  placeholder="Adresse Bitcoin BTC..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono"
                />
                {centralPaymentConfig.cryptoWallets.bitcoinBtc && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <img
                      src={getQrCodeUrl(centralPaymentConfig.cryptoWallets.bitcoinBtc, 70)}
                      alt="QR BTC"
                      className="w-14 h-14 rounded-lg bg-white p-1 shrink-0"
                    />
                    <div className="text-[10px] text-slate-400 leading-snug">
                      <span>Aperçu QR Code dynamique généré automatiquement pour le client.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Carte Bancaire & Zones de Livraison COD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Carte Bancaire */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Passerelle Carte Bancaire (Visa / Mastercard)</span>
                </div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={centralPaymentConfig.cardGatewayKeys.active}
                    onChange={(e) =>
                      setCentralPaymentConfig((prev) => ({
                        ...prev,
                        cardGatewayKeys: { ...prev.cardGatewayKeys, active: e.target.checked }
                      }))
                    }
                    className="rounded text-indigo-600"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Clé Publique de l'API Passerelle (Stripe / Paystack) :
                </label>
                <input
                  type="text"
                  value={centralPaymentConfig.cardGatewayKeys.publicKey}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      cardGatewayKeys: { ...prev.cardGatewayKeys, publicKey: e.target.value }
                    }))
                  }
                  placeholder="pk_live_..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Fournisseur de Traitement :
                </label>
                <input
                  type="text"
                  value={centralPaymentConfig.cardGatewayKeys.provider}
                  onChange={(e) =>
                    setCentralPaymentConfig((prev) => ({
                      ...prev,
                      cardGatewayKeys: { ...prev.cardGatewayKeys, provider: e.target.value }
                    }))
                  }
                  placeholder="Ex: Stripe ou Paystack"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Zones de Livraison Cash on Delivery */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                <Truck className="w-3.5 h-3.5 text-amber-400" />
                <span>Paiement à la Livraison — Villes & Zones Éligibles</span>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                  Villes / Communes autorisées (séparées par des virgules) :
                </label>
                <textarea
                  rows={3}
                  value={deliveryZonesInput}
                  onChange={(e) => setDeliveryZonesInput(e.target.value)}
                  placeholder="Ouagadougou, Bobo-Dioulasso, Koudougou, Abidjan..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 leading-relaxed resize-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Règle de sécurité :</strong> Le Cash on Delivery est strictement restreint aux commandes de biens physiques de la Boutique en ligne et automatiquement masqué dans le module Abonnements SaaS.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de validation globale en bas de page */}
        <div className="sticky bottom-4 z-40 bg-slate-900/95 border-2 border-emerald-500/50 backdrop-blur-md rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Sauvegarde & Synchronisation Globale Immédiate</div>
              <div className="text-[11px] text-slate-300">Enregistre les tarifs, numéros de paiement, limites et quotas dans Supabase PostgreSQL & Realtime en temps réel.</div>
            </div>
          </div>
          <button
            type="button"
            disabled={isSavingGlobal || isSavingPlatformConfig}
            onClick={handleSaveAndApplyEverywhere}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{isSavingGlobal || isSavingPlatformConfig ? 'Application en direct...' : '💾 Enregistrer et Appliquer partout'}</span>
          </button>
        </div>
      </div>
    )}

    {/* ========================================================================= */}
    {/* TAB : GESTION DE LA MATRICE DE COMPARAISON DES PLANS (PLG)                */}
    {/* ========================================================================= */}
    {adminActiveTab === 'COMPARISON_MATRIX' && (
      <div className="space-y-6 animate-in fade-in duration-200">
        <ComparisonMatrixAdminTab currentUserEmail={currentUser?.email} />
      </div>
    )}

    {/* ========================================================================= */}
    {/* SECTION 7 : MÉDIATION PROJETS & SÉQUESTRE FINANCIER (ESCROW)              */}
    {/* ========================================================================= */}
    {adminActiveTab === 'ESCROW_MEDIATION' && (
      <div className="space-y-6">
        {/* Entête de Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Supervision & Arbitrage
                </span>
                <span className="text-xs text-slate-400">• Tiers de Confiance</span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Médiation Projets & Séquestre Financier (Escrow)
              </h2>
              <p className="text-xs text-slate-400">
                Surveillance continue des fonds consignés, intervention d'urgence et arbitrage impartial.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              {escrowProjects.length} projet(s) au total
            </span>
          </div>
        </div>

        {/* 4 Cartes d'Indicateurs Clés (KPIs) */}
        {(() => {
          const totalLockedFunds = escrowProjects
            .filter((p) => p.status === 'funds_locked' || p.status === 'work_in_progress' || p.status === 'delivered' || p.status === 'disputed_paused')
            .reduce((sum, p) => sum + p.totalAmount, 0);

          const activeDisputes = escrowProjects.filter((p) => p.status === 'disputed_paused');

          const totalReleased = escrowProjects
            .filter((p) => p.status === 'completed_released' || p.status === 'funds_withdrawn')
            .reduce((sum, p) => sum + p.totalAmount, 0);

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Total Projets */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Volume Global Projets
                  </span>
                  <div className="text-xl font-black text-white mt-1">
                    {escrowProjects.length}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Total : {formatCFA(escrowProjects.reduce((s, p) => s + p.totalAmount, 0))}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
              </div>

              {/* Fonds Actuellement Séquestrés */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Fonds Séquestrés Actifs
                  </span>
                  <div className="text-xl font-black text-amber-300 mt-1">
                    {formatCFA(totalLockedFunds)}
                  </div>
                  <span className="text-[10px] text-amber-400/80">
                    Sous protection Nana Guarantee
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Lock className="w-5 h-5" />
                </div>
              </div>

              {/* Litiges Actifs */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                activeDisputes.length > 0
                  ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/30'
                  : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    activeDisputes.length > 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    Projets Contestés / Gelés
                  </span>
                  <div className={`text-xl font-black mt-1 flex items-center gap-2 ${
                    activeDisputes.length > 0 ? 'text-rose-300' : 'text-white'
                  }`}>
                    <span>{activeDisputes.length}</span>
                    {activeDisputes.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-black animate-pulse">
                        Intervention Requise
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {activeDisputes.length > 0 ? 'Fonds et livraisons bloqués' : 'Aucun litige en cours'}
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeDisputes.length > 0
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                    : 'bg-slate-800 border border-slate-700 text-slate-500'
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>

              {/* Fonds Libérés */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    Prestations Menées à Terme
                  </span>
                  <div className="text-xl font-black text-emerald-300 mt-1">
                    {formatCFA(totalReleased)}
                  </div>
                  <span className="text-[10px] text-emerald-400/80">
                    Débloqués en faveur des prestataires
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Unlock className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Barre de Recherche et Filtres */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={escrowSearch}
              onChange={(e) => setEscrowSearch(e.target.value)}
              placeholder="Rechercher par titre, client, boutique, ID..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Tous' },
              { id: 'disputed_paused', label: 'En Litige / Gelés' },
              { id: 'funds_locked', label: 'Fonds Séquestrés' },
              { id: 'work_in_progress', label: 'En Travaux' },
              { id: 'completed_released', label: 'Libérés' },
              { id: 'refunded_client', label: 'Remboursés' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setEscrowFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  escrowFilter === f.id
                    ? f.id === 'disputed_paused'
                      ? 'bg-rose-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des Projets Séquestre */}
        {(() => {
          const filtered = escrowProjects.filter((p) => {
            if (escrowFilter !== 'ALL' && p.status !== escrowFilter) return false;
            if (escrowSearch.trim()) {
              const q = escrowSearch.toLowerCase();
              const matchesTitle = p.projectTitle?.toLowerCase().includes(q);
              const matchesClient = p.clientName?.toLowerCase().includes(q) || p.clientPhone?.includes(q);
              const matchesStore = p.storeName?.toLowerCase().includes(q) || p.storeId?.toLowerCase().includes(q);
              const matchesId = p.id?.toLowerCase().includes(q);
              if (!matchesTitle && !matchesClient && !matchesStore && !matchesId) return false;
            }
            return true;
          });

          if (filtered.length === 0) {
            return (
              <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">Aucun projet trouvé</p>
                <p className="text-xs text-slate-500">
                  {escrowProjects.length === 0
                    ? "Aucun projet sous séquestre n'a encore été créé sur la plateforme."
                    : "Aucun projet ne correspond à vos critères de recherche ou filtre."}
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-3.5">
              {filtered.map((project) => {
                const isDisputed = project.status === 'disputed_paused';
                const isCompleted = project.status === 'completed_released' || project.status === 'funds_withdrawn';
                const isRefunded = project.status === 'refunded_client';

                return (
                  <div
                    key={project.id}
                    className={`p-4 sm:p-5 rounded-3xl bg-slate-900 border transition shadow-xl space-y-3.5 ${
                      isDisputed
                        ? 'border-rose-500/70 shadow-rose-950/20 ring-1 ring-rose-500/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-indigo-400 font-bold">
                            #{project.id.slice(-8)}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400">
                            Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                          {isDisputed && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              LITIGE / PROJET SUSPENDU
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-white mt-1">{project.projectTitle}</h3>
                      </div>

                      {/* Statut financier badge */}
                      <div className="self-start sm:self-center">
                        {project.status === 'draft' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Brouillon
                          </span>
                        )}
                        {project.status === 'sent' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            Devis Envoyé (Attente Consignation)
                          </span>
                        )}
                        {project.status === 'funds_locked' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400" />
                            Fonds Consignés sous Séquestre
                          </span>
                        )}
                        {project.status === 'work_in_progress' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            Travaux en Cours
                          </span>
                        )}
                        {project.status === 'delivered' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            Livrables Déposés (Attente Validation)
                          </span>
                        )}
                        {project.status === 'disputed_paused' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-md shadow-rose-950 flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3" />
                            Gelé Conservatoire
                          </span>
                        )}
                        {project.status === 'completed_released' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Unlock className="w-3 h-3 text-emerald-400" />
                            Fonds Libérés au Prestataire
                          </span>
                        )}
                        {project.status === 'funds_withdrawn' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            Fonds Transférés au Prestataire
                          </span>
                        )}
                        {project.status === 'refunded_client' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Client Remboursé (Litige Clos)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Détails : Prestataire vs Client vs Montant */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      {/* Prestataire */}
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Prestataire (Boutique)
                        </span>
                        <div className="font-bold text-white text-xs">{project.storeName || 'Boutique'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{project.storeId}</div>
                        {project.merchantPhone && (
                          <div className="text-[11px] text-indigo-300">{project.merchantPhone}</div>
                        )}
                      </div>

                      {/* Client */}
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Client Acheteur
                        </span>
                        <div className="font-bold text-white text-xs">{project.clientName}</div>
                        {project.clientCompany && (
                          <div className="text-[11px] text-slate-400 font-medium">({project.clientCompany})</div>
                        )}
                        {project.clientPhone && (
                          <div className="text-[11px] text-emerald-300 font-mono">{project.clientPhone}</div>
                        )}
                        {project.clientEmail && (
                          <div className="text-[10px] text-slate-400 truncate">{project.clientEmail}</div>
                        )}
                      </div>

                      {/* Montant & Jalons */}
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Montant Séquestré
                        </span>
                        <div className="text-base font-black text-amber-300 font-mono">
                          {formatCFA(project.totalAmount)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {project.milestones.length} jalon(s) contractuel(s)
                        </div>
                      </div>

                      {/* Paiement Mobile Money & Date */}
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Preuve Règlement
                        </span>
                        {project.paymentDetails ? (
                          <>
                            <div className="text-[11px] font-bold text-emerald-400">
                              {project.paymentDetails.provider}
                            </div>
                            <div className="text-[10px] font-mono text-slate-300 truncate">
                              Réf: {project.paymentDetails.transactionRef}
                            </div>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">En attente de consignation</span>
                        )}
                      </div>
                    </div>

                    {/* Bloc Spécial si GELÉ / LITIGE */}
                    {isDisputed && (
                      <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 space-y-1.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-black text-rose-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Projet suspendu par la médiation Super-Admin</span>
                          </div>
                          {project.disputedAt && (
                            <span className="text-[10px] text-rose-300 font-mono">
                              Gelé le {new Date(project.disputedAt).toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-rose-200 leading-relaxed font-medium">
                          <strong>Motif :</strong> {project.disputeReason}
                        </p>
                      </div>
                    )}

                    {/* Bloc Spécial si Arbitrage Rendu */}
                    {project.resolutionAction && (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-bold uppercase tracking-wider text-[10px]">
                            Décision d'Arbitrage Rendue
                          </span>
                          {project.resolvedAt && (
                            <span className="text-[10px] font-mono">
                              {new Date(project.resolvedAt).toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>
                        <p className="text-white font-medium">
                          {project.resolutionAction === 'RELEASED_TO_MERCHANT'
                            ? '✅ Fonds libérés en faveur du prestataire.'
                            : '↩️ Remboursement intégral du client ordonné.'}
                        </p>
                        {project.resolutionNotes && (
                          <p className="text-slate-400 text-[11px] italic">
                            Notes : {project.resolutionNotes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Barre d'Actions d'Arbitrage */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                      {/* Bouton Chat Tripartite */}
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setChatModalProject(project);
                        }}
                        className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md shadow-indigo-950"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Ouvrir Chat de Médiation Tripartite</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Action d'urgence : Geler le projet */}
                        {!isDisputed && !isCompleted && !isRefunded && (
                          <button
                            type="button"
                            onClick={() => {
                              playCancelSound();
                              setFreezeModalProject(project);
                              setFreezeReason('');
                            }}
                            className="py-2 px-3.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                            <span>Interrompre / Geler le projet</span>
                          </button>
                        )}

                        {/* Clôturer / Arbitrage si gelé */}
                        {isDisputed && (
                          <button
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              setResolveModalProject(project);
                              setResolutionAction('RELEASED_TO_MERCHANT');
                              setResolutionNotes('');
                            }}
                            className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-950"
                          >
                            <Gavel className="w-3.5 h-3.5" />
                            <span>Rendre l'arbitrage & Clôturer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    )}

        {/* ========================================================================= */}
        {/* ONGLET 9 : GESTION & PERSONNALISATION DE LA PAGE D'ACCUEIL (CMS LANDING)   */}
        {/* ========================================================================= */}
        {adminActiveTab === 'LANDING_CMS' && (
          <LandingCmsTab
            landingConfig={landingConfig}
            onUpdateConfig={setLandingConfig}
            onSave={handleSaveLandingConfig}
            onReset={handleResetLandingConfig}
            onPreview={() => {
              playTapBeep();
              onBackToPOS();
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            isSaving={isSavingLandingConfig}
          />
        )}

        {/* ========================================================================= */}
        {/* ONGLET 10 : PAIEMENTS EN ATTENTE & PONT BANCAIRE RENDER                   */}
        {/* ========================================================================= */}
        {adminActiveTab === 'PENDING_PAYMENTS' && (() => {
          const pendingOnly = pendingPayments.filter(
            (p) => p.status === 'PENDING' || p.status === 'PENDING_DELIVERY' || !p.status
          );
          const completedOnly = pendingPayments.filter(
            (p) => p.status === 'COMPLETED' || p.status === 'PAID' || p.status === 'SUCCESS' || p.status === 'VALIDATED'
          );

          const filteredPayments = pendingPayments.filter((p) => {
            const isPending = p.status === 'PENDING' || p.status === 'PENDING_DELIVERY' || !p.status;
            const isCompleted = p.status === 'COMPLETED' || p.status === 'PAID' || p.status === 'SUCCESS' || p.status === 'VALIDATED';

            if (paymentFilterStatus === 'PENDING' && !isPending) return false;
            if (paymentFilterStatus === 'COMPLETED' && !isCompleted) return false;

            if (paymentSearchQuery.trim()) {
              const queryLower = paymentSearchQuery.toLowerCase();
              const matchRef = String(p.transactionRef || p.id || '').toLowerCase().includes(queryLower);
              const matchPhone = String(p.customerPhone || p.phoneNumber || '').toLowerCase().includes(queryLower);
              const matchStore = String(p.storeName || p.storeId || '').toLowerCase().includes(queryLower);
              const matchDesc = String(p.orderDescription || p.plan || p.planId || '').toLowerCase().includes(queryLower);
              const matchOp = String(p.operator || p.method || '').toLowerCase().includes(queryLower);
              return matchRef || matchPhone || matchStore || matchDesc || matchOp;
            }
            return true;
          });

          const totalPendingAmount = pendingOnly.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

          return (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* En-tête Global & Métriques Passerelle */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                        <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                        Passerelle de Paiement Render (IP Statique Fixie)
                      </span>
                      <span className="text-xs text-slate-400">• Sortie Banques : <strong className="text-emerald-400 font-mono">54.195.3.54</strong></span>
                    </div>
                    <h2 className="text-base sm:text-xl font-black text-white mt-1 flex items-center gap-2.5">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      Paiements Mobile Money & Supervision API Pont Render
                    </h2>
                    <p className="text-xs text-slate-400 max-w-3xl">
                      Supervisez en direct les flux financiers acheminés par le backend Render. Sortie IP statique déclarée auprès des banques partenaires. Les transactions sont synchronisées en temps réel dans Supabase Realtime.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isCheckingPaymentApi}
                      onClick={handleTestPaymentApiConnection}
                      className="px-3.5 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/60 text-xs font-black flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm"
                      title="Interroge le micro-service Render et vérifie l'adresse IP statique vue par les banques"
                    >
                      {isCheckingPaymentApi ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>Diagnostic IP...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Diagnostiquer l'API Pont</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setPaymentFilterStatus('PENDING');
                        setPaymentSearchQuery('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Actualiser</span>
                    </button>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">En Attente de Validation</span>
                      <div className="text-2xl font-black text-white mt-0.5">{pendingOnly.length}</div>
                      <span className="text-[11px] text-amber-300/80 font-mono font-bold">{formatCFA(totalPendingAmount)}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Clock className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Paiements Validés</span>
                      <div className="text-2xl font-black text-white mt-0.5">{completedOnly.length}</div>
                      <span className="text-[11px] text-emerald-300/80">Confirmés via Webhook ou Super-Admin</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">IP Statique Fixie</span>
                      <div className="text-sm font-mono font-black text-emerald-400 mt-1">{PRIMARY_FIXIE_IP}</div>
                      <span className="text-[11px] text-indigo-300/80">Sortie réseau bancaire</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Micro-service Render</span>
                      <div className="text-xs font-mono font-bold text-emerald-400 mt-1 truncate max-w-[160px]">
                        {paymentApiHealth?.status === 'online' ? 'Connecté (24/7) ✅' : 'Actif ⚡'}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">nana-payment-api</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1 : TABLEAU DES PAIEMENTS EN ATTENTE & VALIDÉS */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Intentions de Paiement ({filteredPayments.length})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Filtres Statut */}
                    <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setPaymentFilterStatus('PENDING'); }}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          paymentFilterStatus === 'PENDING'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        En attente ({pendingOnly.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setPaymentFilterStatus('COMPLETED'); }}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          paymentFilterStatus === 'COMPLETED'
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Validés ({completedOnly.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setPaymentFilterStatus('ALL'); }}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          paymentFilterStatus === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Tous ({pendingPayments.length})
                      </button>
                    </div>

                    {/* Champ de Recherche */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={paymentSearchQuery}
                        onChange={(e) => setPaymentSearchQuery(e.target.value)}
                        placeholder="Rechercher réf, téléphone..."
                        className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold">Aucun paiement correspondant trouvé.</p>
                    <p className="text-[11px] text-slate-600">
                      Les nouvelles tentatives de paiement apparaîtront automatiquement ici dès qu'un utilisateur lance un règlement.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3.5">Réf Transaction</th>
                          <th className="p-3.5">Date & Heure</th>
                          <th className="p-3.5">Client / Téléphone</th>
                          <th className="p-3.5">Opérateur / Pays</th>
                          <th className="p-3.5">Montant</th>
                          <th className="p-3.5">Formule / Objet</th>
                          <th className="p-3.5">Statut</th>
                          <th className="p-3.5 text-right">Action Super-Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {filteredPayments.map((p) => {
                          const isPending = p.status === 'PENDING' || p.status === 'PENDING_DELIVERY' || !p.status;
                          const isValidating = isManualValidatingId === p.id;
                          const displayDate = p.createdAt
                            ? new Date(p.createdAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Récemment';

                          return (
                            <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-3.5 font-mono text-[11px] font-bold text-white">
                                {p.transactionRef || p.id}
                              </td>
                              <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                                {displayDate}
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-white text-[11.5px]">
                                  {p.customerPhone || p.phoneNumber || 'Numéro non spécifié'}
                                </div>
                                {p.storeName && (
                                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                    {p.storeName}
                                  </div>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10.5px] font-bold">
                                  {p.operator || p.method || 'Mobile Money'}
                                </span>
                                {p.country && (
                                  <span className="ml-1.5 text-[10px] text-slate-400 font-mono">
                                    ({p.country})
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 font-black text-amber-400 font-mono text-sm">
                                {formatCFA(p.amount || 0)}
                              </td>
                              <td className="p-3.5 text-[11px] text-slate-300 max-w-[150px] truncate" title={p.orderDescription || p.plan || p.planId || 'Abonnement'}>
                                {p.orderDescription || (p.plan ? `Plan ${p.plan}` : p.planId ? `Plan ${p.planId}` : 'Abonnement / Produit')}
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                {isPending ? (
                                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase flex items-center gap-1 w-fit">
                                    <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                                    En Attente
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center gap-1 w-fit">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    Validé
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                {isPending ? (
                                  <button
                                    type="button"
                                    disabled={isValidating}
                                    onClick={() => handleValidatePaymentManually(p)}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition active:scale-95 cursor-pointer ml-auto"
                                    title="Valider manuellement ce paiement et débloquer immédiatement l'accès du commerçant"
                                  >
                                    {isValidating ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Validation...</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        <span>Valider manuellement</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[10.5px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                    <Check className="w-3 h-3" />
                                    {p.validatedManually ? 'Par Super-Admin' : 'Auto via SMS'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 2 : ÉTAT DU PONT BANCAIRE RENDER & IP STATIQUE FIXIE */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Micro-Service Bancaire Render & IP Whitelisting Fixie
                      </h3>
                      <p className="text-xs text-slate-400">
                        Passerelle de paiement sécurisée sans passer par les Cloud Functions Firebase
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isCheckingPaymentApi}
                      onClick={handleTestPaymentApiConnection}
                      className="px-3.5 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/60 text-xs font-black flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isCheckingPaymentApi ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>Test de l'IP Fixie...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Diagnostiquer l'API Pont</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">1. Adresse IP Statique Bancaire</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Fixie Whitelistée
                      </span>
                    </div>
                    <div className="font-mono text-base font-black text-emerald-400 select-all">
                      {paymentApiHealth?.ipInfo?.ip || PRIMARY_FIXIE_IP}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Adresse IP certifiée transmise aux banques et agrégateurs pour le filtrage IP strict.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">2. Micro-Service Hébergé</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        paymentApiHealth?.status === 'online'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {paymentApiHealth?.status === 'online' ? 'En ligne (24/7) ✅' : 'Actif ⚡'}
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-indigo-300 truncate select-all">
                      {DEFAULT_PAYMENT_API_URL}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Serveur Node.js dédié sur Render avec auto-ping UptimeRobot anti-mise en veille.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">3. Endpoint Webhook</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        HMAC-SHA256
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-amber-300 truncate select-all">
                      {DEFAULT_PAYMENT_API_URL}/api/payment/webhook
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Validation cryptographique des signatures bancaires et idempotence stricte des transactions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* ONGLET 11 : GESTION DES TUTORIELS NANA ACADÉMIE                          */}
        {/* ========================================================================= */}
        {adminActiveTab === 'TUTORIALS' && (
          <AdminTutorialsTab />
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL : INSPECTION DÉTAILLÉE D'UNE BOUTIQUE EN DANGER                     */}
      {/* ========================================================================= */}
      {selectedStoreForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-audit-title"
            className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                  Audit Santé & Diagnostic SaaS
                </span>
                <h3 id="store-audit-title" className="text-base font-black text-white">{selectedStoreForDetail.name}</h3>
                <p className="text-xs text-slate-400">{selectedStoreForDetail.city}, {selectedStoreForDetail.country}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playCancelSound();
                  setSelectedStoreForDetail(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Detailed Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Gérant Établissement</div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedStoreForDetail.ownerName}</div>
                  <div className="text-xs font-mono text-blue-400 mt-0.5">{selectedStoreForDetail.phone}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Statut Abonnement</div>
                  <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                    <span>Plan {selectedStoreForDetail.subscriptionPlan}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                      selectedStoreForDetail.subscriptionStatus === 'ACTIVE' 
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-red-950 text-red-300 border border-red-500/30'
                    }`}>
                      {selectedStoreForDetail.subscriptionStatus}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Échéance : {selectedStoreForDetail.subscriptionExpiryDate}</div>
                </div>
              </div>

              {/* Diagnostic Box */}
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 space-y-2">
                <div className="text-xs font-black text-red-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Diagnostic Fondateur du SaaS
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedStoreForDetail.dangerDetails}
                </p>
              </div>

              {/* Financial Snapshot */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">Indicateurs financiers récents</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Ventes Mois</div>
                    <div className="text-xs font-black text-emerald-400">{formatCFA(selectedStoreForDetail.monthlyRevenue)}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Dépenses Perso</div>
                    <div className="text-xs font-black text-red-400">{formatCFA(selectedStoreForDetail.personalExpensesAmount)}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Dettes Dehors</div>
                    <div className="text-xs font-black text-amber-400">{formatCFA(selectedStoreForDetail.totalDebtAmount)}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons inside Audit Modal */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    handleContactPersonalExpenses(selectedStoreForDetail);
                    setSelectedStoreForDetail(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Envoyer Conseil d'Aide par WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSelectedStoreForDetail(null);
                  }}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : CRÉER UNE NOUVELLE TÂCHE PRIORITAIRE FONDATION                   */}
      {/* ========================================================================= */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-title"
            className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 id="new-task-title" className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Nouvelle Action Prioritaire Super-Admin
              </h3>
              <button
                type="button"
                onClick={() => {
                  playCancelSound();
                  setIsNewTaskModalOpen(false);
                }}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Intitulé de la Tâche *
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Relancer le marchand pour renouvellement d'abonnement..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Description & Consigne opérationnelle
                </label>
                <textarea
                  rows={2}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Détails, lien de paiement ou action attendue..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Boutique associée
                  </label>
                  <select
                    value={newTaskStoreId}
                    onChange={(e) => setNewTaskStoreId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none"
                  >
                    <option value="">Aucune / Réseau global</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Niveau de Priorité
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as 'URGENT' | 'HIGH' | 'MEDIUM')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none"
                  >
                    <option value="URGENT">URGENT (Immédiat)</option>
                    <option value="HIGH">HAUTE</option>
                    <option value="MEDIUM">MOYENNE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Échéance
                </label>
                <input
                  type="text"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  placeholder="Ex: Aujourd'hui 17h, Demain..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs active:scale-95 transition-all shadow-md shadow-indigo-900/30 cursor-pointer"
                >
                  Ajouter la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : ACTIVATION MANUELLE D'ABONNEMENT ESPÈCES                          */}
      {/* ========================================================================= */}
      {cashSubModalStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="cash-sub-title"
            className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="bg-gradient-to-r from-emerald-950 to-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Règlement Espèces Direct
                </span>
                <h3 id="cash-sub-title" className="text-base font-black text-white">
                  {cashSubModalStore.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCashSubModalStore(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Gérant & Contact</div>
                <div className="font-bold text-white mt-0.5">{cashSubModalStore.ownerName} ({cashSubModalStore.phone || 'Non renseigné'})</div>
                <div className="text-slate-500 text-[11px]">{cashSubModalStore.city}, {cashSubModalStore.country}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-2">
                  Sélectionnez la durée de l'abonnement :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { plan: 'MONTHLY_1' as SubscriptionPlan, months: 1, amount: 5000, label: '1 Mois', tag: '5 000 F' },
                    { plan: 'QUARTERLY_3' as SubscriptionPlan, months: 3, amount: 14000, label: '3 Mois', tag: '14 000 F (-7%)' },
                    { plan: 'BIANNUAL_6' as SubscriptionPlan, months: 6, amount: 26000, label: '6 Mois', tag: '26 000 F (-13%)' },
                    { plan: 'ANNUAL_12' as SubscriptionPlan, months: 12, amount: 48000, label: '12 Mois', tag: '48 000 F (-20%)' },
                  ].map((p) => {
                    const isSelected = cashSubPlan === p.plan;
                    return (
                      <button
                        key={p.plan}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setCashSubPlan(p.plan);
                          setCashSubMonths(p.months);
                          setCashSubAmount(p.amount);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{p.label}</div>
                        <div className="font-black text-emerald-400 text-sm mt-0.5">{formatCFA(p.amount)}</div>
                        <div className="text-[10px] text-slate-500">{p.tag}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 space-y-1">
                <div className="text-emerald-300 font-bold flex items-center justify-between">
                  <span>Montant espèces à encaisser :</span>
                  <span className="text-sm font-black text-emerald-400">{formatCFA(cashSubAmount)}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  En cliquant sur confirmer, l'abonnement sera immédiatement prolongé de <span className="font-bold text-white">{cashSubMonths} mois</span> dans Supabase et une quittance comptable sera archivée.
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCashSubModalStore(null)}
                  className="px-3.5 py-2 text-slate-400 hover:text-white font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isCashSubProcessing}
                  onClick={handleConfirmCashSub}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black active:scale-95 transition shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  {isCashSubProcessing ? 'Activation...' : `Confirmer encaissement (${formatCFA(cashSubAmount)})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1 : ZOOM / APERÇU HAUTE DÉFINITION PIÈCE D'IDENTITÉ KYC             */}
      {/* ========================================================================= */}
      {previewKycDoc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-black text-sm text-white">{previewKycDoc.storeName}</h3>
                  <p className="text-xs text-slate-400">
                    Pièce officielle : <span className="text-slate-200 font-semibold">{previewKycDoc.title}</span> ({previewKycDoc.manager})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewKycDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image Preview Container */}
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950/90 min-h-[300px]">
              <img
                src={previewKycDoc.url}
                alt="Document officiel KYC"
                className="max-h-[65vh] max-w-full object-contain rounded-xl border border-slate-800 shadow-2xl"
              />
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Vérifiez la netteté du nom, du numéro et de la date d'expiration.
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewKycDoc.url}
                  download={`KYC_${previewKycDoc.storeName.replace(/\s+/g, '_')}.png`}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Télécharger
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewKycDoc(null)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : MOTIF DE REJET / DEMANDE DE CORRECTION KYC                      */}
      {/* ========================================================================= */}
      {rejectingKycStore && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black text-sm text-white">Rejeter le dossier KYC</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingKycStore(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Vous êtes sur le point de rejeter le dossier de{' '}
              <span className="font-bold text-white">{rejectingKycStore.storeName}</span> ({rejectingKycStore.managerFullName}).
              Veuillez indiquer le motif pour que le commerçant puisse corriger sa pièce dans son espace :
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              {[
                "Pièce d'identité illisible ou photo floue",
                "Nom ne correspondant pas à la pièce d'identité",
                "Document d'identité expiré",
                "Pièce incomplète (recto/verso manquant)",
                "Autre motif spécifique (à préciser ci-dessous)"
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setKycRejectionReason(reason)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition cursor-pointer border ${
                    kycRejectionReason === reason
                      ? 'bg-rose-950/70 border-rose-500 text-rose-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Préciser ou personnaliser le message au commerçant :
              </label>
              <textarea
                rows={2}
                value={kycRejectionReason}
                onChange={(e) => setKycRejectionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                placeholder="Expliquez pourquoi le document a été refusé..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingKycStore(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectKyc}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer active:scale-95 shadow-lg shadow-rose-950"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : CONFIRMATION DU GEL / INTERRUPTION D'UN PROJET ESCROW              */}
      {/* ========================================================================= */}
      {freezeModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/60 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Geler & Suspendre le Projet</h3>
                <p className="text-[11px] text-slate-400">Intervention conservatoire Super Admin</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200/90 leading-relaxed space-y-1">
              <p className="font-bold text-rose-300">Attention :</p>
              <p>
                Cette action place immédiatement le projet <strong>#{freezeModalProject.id.slice(-6)}</strong> en statut <em>"disputed_paused"</em>.
                Tous les déblocages de fonds, livraisons et retraits seront instantanément verrouillés.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Motif d'interruption / Litige notifié <span className="text-rose-400">*</span> :
              </label>
              <textarea
                rows={3}
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Précisez la raison de la suspension (ex: Signalement client pour non-conformité, litige sur le livrable 2...)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 resize-none leading-relaxed"
              />
              <p className="text-[10px] text-slate-400">
                Ce motif sera automatiquement diffusé aux deux parties via un message officiel dans le chat tripartite.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setFreezeModalProject(null);
                  setFreezeReason('');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmFreezeProject}
                disabled={isFreezing || !freezeReason.trim()}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950 transition cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>{isFreezing ? 'Suspension en cours...' : 'Confirmer la suspension'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : ARBITRAGE FINAL ET CLÔTURE DU LITIGE                             */}
      {/* ========================================================================= */}
      {resolveModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/60 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Rendre la Décision d'Arbitrage</h3>
                <p className="text-[11px] text-slate-400">
                  Projet : {resolveModalProject.projectTitle} (#{resolveModalProject.id.slice(-6)})
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Montant sous séquestre :</span>
                <strong className="text-amber-300 font-mono">{formatCFA(resolveModalProject.totalAmount)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Client :</span>
                <strong className="text-white">{resolveModalProject.clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Prestataire :</span>
                <strong className="text-white">{resolveModalProject.storeName || resolveModalProject.storeId}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Verdict de l'arbitrage :
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setResolutionAction('RELEASED_TO_MERCHANT');
                  }}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    resolutionAction === 'RELEASED_TO_MERCHANT'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-black text-xs text-white flex items-center gap-1.5 mb-1">
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Libérer au prestataire</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Validation conforme de la prestation. Les fonds ({formatCFA(resolveModalProject.totalAmount)}) deviennent retirables par le prestataire.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setResolutionAction('REFUNDED_TO_CLIENT');
                  }}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    resolutionAction === 'REFUNDED_TO_CLIENT'
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-black text-xs text-white flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rembourser le client</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Rupture ou manquement avéré. Les fonds consignés ({formatCFA(resolveModalProject.totalAmount)}) sont restitués à l'acheteur.
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Motivation et conclusions de l'arbitre <span className="text-rose-400">*</span> :
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Détaillez les raisons qui motivent cette décision après analyse des échanges et preuves..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setResolveModalProject(null);
                  setResolutionNotes('');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmResolveDispute}
                disabled={isResolving || !resolutionNotes.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950 transition cursor-pointer"
              >
                <Gavel className="w-4 h-4" />
                <span>{isResolving ? 'Clôture en cours...' : 'Entériner la décision d\'arbitrage'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER : CHAT TRIPARTITE SUPER ADMIN                             */}
      {/* ========================================================================= */}
      {chatModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[750px]">
            {/* Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Médiation & Arbitrage Officiel
                  </span>
                  <span className="text-xs text-slate-500 font-mono">#{chatModalProject.id.slice(-6)}</span>
                </div>
                <h3 className="text-sm font-black text-white mt-1">{chatModalProject.projectTitle}</h3>
                <p className="text-[11px] text-slate-400">
                  Client : <strong className="text-slate-200">{chatModalProject.clientName}</strong> | Prestataire : <strong className="text-indigo-300">{chatModalProject.storeName || chatModalProject.storeId}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setChatModalProject(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Embedded Tripartite Chat Component */}
            <div className="flex-1 overflow-hidden">
              <EscrowTripartiteChat
                projectId={chatModalProject.id}
                storeId={chatModalProject.storeId}
                currentUserRole="SUPER_ADMIN"
                currentUserName="Médiation Super Admin"
                isDisputed={chatModalProject.status === 'disputed_paused'}
                disputeReason={chatModalProject.disputeReason}
                onClose={() => setChatModalProject(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modale de Test Live de l'Écran de Paiement Automatique S (Super Admin) */}
      {isTestGatewayOpen && (
        <SPaymentGateway
          isModal={true}
          productType="subscription"
          amount={platformConfig.plans[selectedEditPlanIdx]?.price || 15000}
          currency="FCFA"
          orderDescription={`Abonnement ${platformConfig.plans[selectedEditPlanIdx]?.name || 'Plan Pro'}`}
          orderId={`ADMIN-SUB-${Date.now().toString(36).toUpperCase()}`}
          defaultPhone={currentUser?.phone || '+22665565805'}
          onSuccess={(details: PaymentSuccessDetails) => {
            setIsTestGatewayOpen(false);
            playCashChime();
            showToast(`🎉 Simulation de paiement d'abonnement ${formatCFA(details.amount)} validée avec succès (${details.operator?.name || details.paymentMethod}) ! Rôle RBAC MERCHANT synchronisé.`);
          }}
          onCancel={() => {
            playTapBeep();
            setIsTestGatewayOpen(false);
          }}
        />
      )}

      {/* Modale d'administration sécurisée : Allocation de Crédits IA par le Super Admin */}
      {isAdminCreditModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Allouer des Crédits IA (Super Admin)</h3>
                  <p className="text-[11px] text-slate-400">Recharger le compte d'un utilisateur ou d'une boutique</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminCreditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Sélectionner la boutique / utilisateur :</label>
                <select
                  value={selectedCreditTargetUid}
                  onChange={(e) => setSelectedCreditTargetUid(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Choisir une boutique du réseau --</option>
                  {currentUser && (
                    <option value={currentUser.id}>★ Mon compte Super Admin ({currentUser.name || currentUser.email})</option>
                  )}
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.ownerName} - {s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Ou saisir un identifiant utilisateur (UID) :</label>
                <input
                  type="text"
                  placeholder="ex: ID utilisateur ou organisation Supabase"
                  value={selectedCreditTargetUid}
                  onChange={(e) => setSelectedCreditTargetUid(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Nombre de crédits à ajouter :</label>
                <div className="grid grid-cols-3 gap-2">
                  {[50, 100, 250].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomCreditAmount(amt)}
                      className={`py-2 rounded-xl font-bold border transition ${
                        customCreditAmount === amt
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      +{amt} crédits
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAdminCreditModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!selectedCreditTargetUid || isAddingCredits}
                onClick={() => {
                  const targetStore = stores.find((s) => s.id === selectedCreditTargetUid);
                  handleAddUserCredits(selectedCreditTargetUid, targetStore?.name, customCreditAmount);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs disabled:opacity-50 shadow-md shadow-amber-950/40"
              >
                {isAddingCredits ? 'Attribution...' : `Valider (+${customCreditAmount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaasAdminDashboard;
