export type { StoreProductItem, StoreConfig } from './components/storeBuilder/types';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  barcode?: string;
  photoUrl?: string;
}

export interface FastSaleProduct {
  id: string;
  name: string;
  price: number;
  iconName: string;
  badge?: string;
  color?: string;
  linkedFunnelId?: string | null;
  funnelDisplayMode?: 'drawer' | 'page';
  // Boosters Multi-Thèmes (Metafields Nanasore)
  colorSwatches?: Array<{ name: string; hex: string }>;
  sizeOptions?: string[];
  keyFeatures?: string[];
  routineVideoUrls?: string[];
  bundleProductIds?: string[];
  bundleDiscountPercent?: number;
  liveLotBadge?: string;
}

export type DebtStatus = 'RECENT' | 'OVERDUE';

export interface DebtEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  paid: boolean;
}

export interface DebtCustomer {
  id: string;
  storeId: string;
  name: string;
  shortName: string;
  initials: string;
  avatarUrl?: string;
  avatarColor: string;
  phone?: string;
  totalDebt: number;
  lastPurchaseDate: string;
  daysOverdue: number;
  status: DebtStatus;
  entries: DebtEntry[];
}

export interface CompletedSale {
  id: string;
  storeId: string;
  date: string;
  timestamp?: number;
  expiresAt?: number; // Archivage après 30 jours
  items: CartItem[];
  total: number;
  paymentMethod: 'CASH' | 'CREDIT';
  customerName?: string;
  amountGiven?: number;
  changeReturned?: number;
  // Multi-seller traceability and signature
  sellerId?: string;
  sellerName?: string;
  sellerSignatureCode?: string;
  sellerRole?: 'GERANT' | 'CAISSIER';
  integrityHash?: string;
  // Multi-register (casier) session traceability
  casierSessionId?: string;
  casierNumber?: string;
}

export interface CasierSession {
  sessionId: string; // `${storeId}_casier_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  storeId: string;
  casierNumber: string; // e.g. "Caisse #1", "Caisse #2"
  deviceName?: string;
  openedAt: number;
  closedAt?: number;
  activeCashierSignature?: string; // e.g. "VND-AM78"
  sellerId?: string;
  sellerName?: string;
  sellerRole?: SellerRole;
  status: 'ouvert' | 'ferme';
  openingBalance?: number;
  currentBalance?: number;
  totalCollected?: number;
  transactionsCount?: number;
  lastActiveAt?: number;
}

export type SellerRole = 'GERANT' | 'CAISSIER';

export interface SellerUser {
  id: string;
  name: string;
  role: SellerRole;
  pinCode: string; // 4-digit PIN code
  signatureCode: string; // e.g. "VND-AM78"
  storeId: string;
  avatarUrl?: string;
  phone?: string;
  active?: boolean;
}

export type LossReason = 'PERIME' | 'CASSE' | 'VOLE' | 'CONSO_PERSO';

export interface LossRecord {
  id: string;
  storeId: string;
  date: string;
  timestamp: number;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  lossAmount: number;
  reason: LossReason;
  notes?: string;
}

export interface InventoryProduct {
  id: string;
  storeId: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  originalPrice?: number;
  stock: number;
  unit: string;
  keywords: string[];
  barcode?: string;
  photoUrl?: string;
  description?: string;
  shortDescription?: string; // Accroche courte 1 à 2 phrases
  richDescription?: string; // Description longue HTML Rich Text
  badge?: string;
  isFlashSale?: boolean;
  flashPrice?: number;
  flashDiscountPercent?: number;
  flashEndsAt?: number;
  hasLiveDemo?: boolean;
  linkedFunnelId?: string | null;
  funnelDisplayMode?: 'drawer' | 'page';
  // Hiérarchie de priorité des tunnels (Funnel Modulaire 12 blocs = Priorité 1, Ultimate Funnel = Priorité 2 conditionnelle)
  hasModularFunnel?: boolean;
  useUltimateFunnel?: boolean;
  modular_funnel?: any;
  ultimate_funnel?: any;
  slug?: string;
  productSlug?: string;
  // Boosters Multi-Thèmes (Metafields Nanasore)
  colorSwatches?: Array<{ name: string; hex: string }>; // Pastilles de couleurs cliquables (Beauté, Mode & Electro)
  sizeOptions?: string[]; // ex: ["50ml", "100ml"] ou ["S", "M", "L", "XL"]
  keyFeatures?: string[]; // 3 à 4 bullet points techniques affichés sous le titre (Electro, MegaStore & Digital Pro)
  routineVideoUrls?: string[]; // 1 à 3 URLs de courtes vidéos pour la section "Complétez votre routine / Démo" (Beauté)
  bundleProductIds?: string[]; // IDs de 1 ou 2 produits complémentaires pour "Fréquemment achetés ensemble / Accessoires"
  bundleDiscountPercent?: number; // ex: 10% de remise si acheté en pack
  liveLotBadge?: string; // ex: "#LOT 01" pour ThemeLiveStreamPro
}

export type StockMovementType = 'ARRIVAGE' | 'RAPPROCHEMENT' | 'VENTE' | 'PERTE' | 'AJOUT_PRODUIT';

export interface StockMovement {
  id: string;
  storeId: string;
  timestamp: number;
  date: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  note?: string;
}

export interface VoiceItemMatch {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  matchedKeyword: string;
}

export interface VoiceParseResult {
  rawPhrase: string;
  recognizedItems: VoiceItemMatch[];
  spokenPrice: number | null;
  calculatedTotal: number;
  priceMatch: boolean;
  confidence: 'HAUTE' | 'MOYENNE' | 'FAIBLE';
  extractedDetails: {
    itemsCount: number;
    discrepancyNote?: string;
  };
}

export type UserRole = 
  | 'GERANT' 
  | 'TENANT_MANAGER' 
  | 'ADMIN' 
  | 'EMPLOYE' 
  | 'SUPER_ADMIN' 
  | 'INSTRUCTOR' 
  | 'STUDENT' 
  | 'instructor' 
  | 'student'
  | 'demo'
  | 'user'
  | 'vendor'
  | 'pro';

// -------------------------------------------------------------
// Système de Quotas Multi-Tenant & Opportunités d'Upsell
// -------------------------------------------------------------
export interface TenantQuotaItem {
  id: string;
  name: string;
  current: number;
  max: number;
  unit: string;
  category: 'live' | 'inventory' | 'marketing' | 'invoicing' | 'sms' | 'sales' | 'storage';
  resetPeriod?: string;
  isSaturated?: boolean;
  emptyStateActionLabel?: string;
  targetAction?: string;
}

export interface TenantUpsellCandidate {
  id: string;
  storeId: string;
  storeName: string;
  managerName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  countryFlag: string;
  avatarUrl?: string;
  currentPlan: 'Starter' | 'Essai Gratuit' | 'Standard';
  criticalQuota: {
    name: string;
    current: number;
    max: number;
    formatted: string;
    percentage: number;
    isSaturated: boolean;
    isCritical: boolean;
  };
  mrrPotential: number; // en FCFA
  lastActive: string;
  contactStatus?: 'NOT_CONTACTED' | 'CONTACTED' | 'UPGRADED';
}

export type KycStatus = 
  | 'unverified' 
  | 'pending_approval' 
  | 'verified' 
  | 'rejected'
  | 'pending'
  | 'approved';

export type KycDocumentType = 'CNIB' | 'PASSPORT_AES_CEDEAO' | 'CARTE_CONSULAIRE' | 'RCCM_OU_IFU' | 'PERMIS_CONDUIRE' | 'RCCM' | 'IFU' | 'COMMERCE_REGISTRY';

export interface KycSubmission {
  id: string;
  userId?: string;
  storeId?: string;
  storeName?: string;
  managerFullName?: string;
  managerPhotoUrl?: string;
  whatsappPhone?: string;
  documentType?: KycDocumentType;
  documentPhotoUrl?: string;
  documentNumber?: string;
  status: KycStatus;
  type?: 'individual' | 'business';
  companyName?: string;
  legalForm?: string;
  rccmNumber?: string;
  ifuNumber?: string;
  businessDocumentUrl?: string;
  rccmDocPhotoUrl?: string;
  ifuDocPhotoUrl?: string;
  address?: string;
  city?: string;
  country?: string;
  userEmail?: string;
  activityDomain?: string;
  briefDescription?: string;
  activityDescription?: string;
  monetizationModel?: 'commission' | 'subscription';
  pricingModel?: 'commission' | 'subscription' | 'pay_per_use';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export type IdentificationStepStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VALIDATED' | 'REJECTED';

export interface IndividualKycData {
  fullName: string;
  birthDate?: string;
  nationality: string;
  phone: string;
  email: string;
  activityDomain?: string;
  briefDescription?: string;
  activityDescription?: string;
  idType: 'CNIB' | 'PASSPORT_AES_CEDEAO' | 'PERMIS_CONDUIRE' | 'CARTE_CONSULAIRE';
  idNumber: string;
  idCardPhotoUrl: string;
  selfiePhotoUrl?: string;
  status: IdentificationStepStatus;
  submittedAt?: string;
  validatedAt?: string;
  validatedBy?: string;
  rejectionReason?: string;
}

export interface BusinessKycData {
  companyName: string;
  storeName: string;
  legalForm: string; // 'SARL' | 'SUARL' | 'ENTREPRISE_INDIVIDUELLE' | 'SA' | 'SAS'
  ifuNumber: string;
  rccmNumber: string;
  address: string;
  city: string;
  country: string;
  activityDomain?: string;
  briefDescription?: string;
  activityDescription?: string;
  rccmDocPhotoUrl: string;
  ifuDocPhotoUrl: string;
  domiciliationProofUrl?: string;
  status: IdentificationStepStatus;
  submittedAt?: string;
  validatedAt?: string;
  validatedBy?: string;
  rejectionReason?: string;
}

export interface IdentificationChain {
  storeId: string;
  currentStep: 1 | 2;
  activityDomain?: string;
  briefDescription?: string;
  activityDescription?: string;
  monetizationModel?: 'commission' | 'subscription';
  pricingModel?: 'commission' | 'subscription' | 'pay_per_use';
  part1Individual: IndividualKycData;
  part2Business: BusinessKycData;
  overallStatus: 'UNVERIFIED' | 'PARTIAL_INDIVIDUAL' | 'FULLY_VERIFIED';
  updatedAt: string;
}

export type SellerMode = 'creator_trainer' | 'merchant_ecommerce' | 'hybrid_all';

export interface StoreUser {
  id: string;
  storeId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  storeName: string;
  role: UserRole;
  phone?: string;
  city?: string;
  country?: string;
  currency: string;
  defaultCreditLimit: number;
  loginProvider: 'google' | 'demo' | 'whatsapp';
  createdAt: string;
  pinCode?: string;
  masterPin?: string; // Hash SHA-256 du code secret à 4-6 chiffres du gérant
  storeUniqueId?: string; // Identifiant unique boutique ex: STORE-BF-8924
  pinConfiguredAt?: number | string; // Date de configuration du Master PIN
  signatureCode?: string;
  storeApprovalStatus?: StoreApprovalStatus;
  kycStatus?: KycStatus;
  kycData?: KycSubmission;
  identificationChain?: IdentificationChain;
  vendorType?: 'ecommerce' | 'elearning' | string;
  sellerMode?: SellerMode;
  uid?: string;
  avatar?: string;
  subscription?: StoreSubscription | null;
  plan?: string;
  credits?: number; // Portefeuille de crédits Studio IA (15 crédits offerts par défaut)
  wallet_balance?: number; // Solde réel du portefeuille Nanasore (XOF / FCFA)
  kyc_status?: 'none' | 'light' | 'full'; // KYC contextuel standardisé
  pricing_model?: 'pay_per_use' | 'commission' | 'subscription'; // Modèle de tarification
  enabled_themes?: string[]; // Thèmes débloqués selon la licence
  // Annuaire Public B2B2C (NaNa Market)
  isListedInDirectory?: boolean;
  merchantType?: DirectoryMerchantType;
  category?: string;
  searchTags?: string[];
  quarter?: string;
  // Routage des Notifications Pulse / Exception Caisse Physique
  hasPhysicalRegister?: boolean; // Vrai si le commerçant a une caisse physique connectée
  wameetTopic?: string; // Topic FCM dédié de notification Wameet
}

// -------------------------------------------------------------
// Annuaire B2B2C des Boutiques & Créateurs NaNa Market
// -------------------------------------------------------------
export type DirectoryMerchantType = 'physical_store' | 'digital_creator' | 'event_host';

export interface MarketDirectoryStore {
  id: string;
  storeId: string;
  storeName: string;
  merchantType?: DirectoryMerchantType; // 'physical_store' | 'digital_creator' | 'event_host'
  logoUrl?: string;
  bannerImage?: string;
  avatarUrl?: string;
  category: string; // ex: 'Électronique & High-Tech', 'Formations & E-learning', 'Webinaires & Lives'
  searchTags: string[]; // ex: ['smartphones', 'iphone', 'live', 'video', 'ebook']
  city?: string;
  quarter?: string;
  country?: string;
  isListedInDirectory: boolean;
  isPublic?: boolean;
  status?: 'published' | 'draft' | string;
  plan?: string; // 'pro' | 'elite' | 'starter' | 'free'
  subscriptionPlan?: string;
  verified?: boolean;
  whatsappPhone?: string;
  phone?: string;
  wameetHandle?: string;
  wameetUrl?: string;
  shopUrl?: string;
  customDomain?: string;
  slug?: string;
  rating?: number;
  reviewsCount?: number;
  salesCount?: number;
  description?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
}

// -------------------------------------------------------------
// Architecture Multi-Tenant & Marque Blanche (Custom Domains)
// -------------------------------------------------------------
export interface CustomDomainTenant {
  storeId: string;
  storeName?: string;
  customDomain: string;
  vendorType?: 'ecommerce' | 'elearning' | 'hybrid' | string;
  type?: 'store' | 'campus' | 'ecommerce' | 'elearning' | 'funnel';
  logoUrl?: string;
  bannerImage?: string;
  primaryColor?: string;
  theme?: 'light' | 'dark';
  whatsappPhone?: string;
  courseId?: string;
  schoolName?: string;
  welcomeText?: string;
  whiteLabel?: {
    hidePoweredBy?: boolean;
    hideReceiptLogo?: boolean;
    customFooterText?: string;
    customSupportPhone?: string;
    customFaviconUrl?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// -------------------------------------------------------------
// Système de Portefeuille de Crédits Studio IA
// -------------------------------------------------------------
export const DEFAULT_FREE_CREDITS = 15;

export const GENERATOR_CREDIT_COSTS = {
  text: 1,
  image: 2,
  video: 20,
  video_flow: 3,
} as const;

export type GeneratorCreditType = keyof typeof GENERATOR_CREDIT_COSTS;

export type SaasStoreHealth = 'CRITICAL' | 'WARNING' | 'HEALTHY';

export type SaasDangerReason = 
  | 'HIGH_PERSONAL_EXPENSES' 
  | 'CRITICAL_STOCK' 
  | 'DROP_IN_SALES' 
  | 'HIGH_UNPAID_DEBTS';

export interface SaasStore {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  city: string;
  country: string;
  totalRevenue: number;
  monthlyRevenue: number;
  previousMonthRevenue: number;
  personalExpensesAmount: number;
  personalExpensesRate: number; // e.g. 42%
  criticalStockCount: number;
  totalDebtAmount: number;
  health: SaasStoreHealth;
  dangerReason?: SaasDangerReason;
  dangerDetails?: string;
  subscriptionPlan: 'PRO' | 'STANDARD' | 'ESSENTIAL';
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
  subscriptionExpiryDate: string;
  lastActive: string;
  syncPendingCount: number;
}

export type SaasTaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM';
export type SaasTaskCategory = 'SUBSCRIPTION' | 'SYNC' | 'HEALTH_ALERT' | 'SUPPORT';

export interface SaasActionTask {
  id: string;
  title: string;
  description: string;
  storeId?: string;
  storeName?: string;
  priority: SaasTaskPriority;
  category: SaasTaskCategory;
  dueDate: string;
  completed: boolean;
  actionType: 'WHATSAPP' | 'SYNC_APPROVE' | 'CALL' | 'RENEW_SUB' | 'AUDIT';
  actionPayload?: string;
  createdAt: string;
}

export interface WooCommerceConfig {
  enabled: boolean;
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  syncDirection: 'BIDIRECTIONAL' | 'POS_TO_WEB' | 'WEB_TO_POS';
  autoSyncOnSale: boolean;
  lastSyncDate?: string;
  lastSyncStatus?: 'SUCCESS' | 'ERROR' | 'IDLE';
  syncedProductsCount: number;
}

export type SmsGatewayProvider = 'TWILIO' | 'BREVO' | 'LOCAL_AFRICA';

export interface SmsGatewayConfig {
  enabled: boolean;
  provider: SmsGatewayProvider;
  senderId: string;
  apiKey?: string;
  accountSid?: string;
  authToken?: string;
  fromPhoneNumber?: string;
  localEndpoint?: string;
  localClientId?: string;
  localSecretKey?: string;
  remainingCredits: number;
  autoOtpOnCredit: boolean;
  autoDebtReminders: boolean;
  reminderDaysBefore: number;
  debtReminderTemplate: string;
  otpTemplate: string;
}

export interface IntegrationSyncLog {
  id: string;
  timestamp: string;
  service: 'WOOCOMMERCE' | 'SMS_GATEWAY';
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  title: string;
  details: string;
}

export type OrderDocumentType = 'BON_COMMANDE' | 'BON_LIVRAISON' | 'DEVIS_PROFORMA';
export type OrderStatus = 'EN_ATTENTE' | 'CONFIRME' | 'LIVRE' | 'PAYE' | 'ANNULE' | 'pending_delivery' | 'pending_verification' | 'confirmed_paid';

export interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string; // Ex: "BC-2026-09-001"
  storeId: string;
  type: OrderDocumentType;
  status: OrderStatus;
  date: string;
  deliveryDate?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  depositAmount: number; // Acompte versé
  remainingBalance: number; // Reste à payer
  paymentTerms?: string;
  notes?: string;
  createdByName?: string;
  createdAt: number;
  timestamp?: number;
  paymentMethod?: 'COD' | 'MOMO' | string;
  paymentReference?: string;
  selectedOperator?: string;
}

// -------------------------------------------------------------
// Statut d'approbation des Boutiques par l'Administrateur SaaS
// -------------------------------------------------------------
export type StoreApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

// -------------------------------------------------------------
// Système d'Abonnement Hybride (Modèle Freemium PLG, Starter, Pro, Elite)
// -------------------------------------------------------------
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'elite' | 'TRIAL_5_DAYS' | string;
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'pending_activation' | 'pending_verification';

export interface StoreSubscription {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  expiresAt: number; // Timestamp en millisecondes
  startedAt: number;
  lastPaymentMethod?: 'MOBILE_MONEY' | 'CASH' | 'CARD' | 'CRYPTO' | 'TRIAL' | 'FREE_PLG' | string;
  lastAmountPaid?: number;
  transactionRef?: string;
  autoRenew?: boolean;
}

// -------------------------------------------------------------
// Limites Dynamiques du Plan (Modèle Freemium PLG)
// -------------------------------------------------------------
export interface SubscriptionPlanLimits {
  maxProducts: number; // e.g. 3 pour Free, 100 pour Starter, -1 pour Illimité
  maxFunnels: number; // e.g. 1 pour Free, 5 pour Starter, -1 pour Illimité
  maxCourses?: number; // e.g. 0 pour Free, 1 pour Starter, -1 pour Illimité
  maxLiveShoppingSessions?: number; // e.g. 1 pour Free, -1 pour Illimité
  customDomainAllowed?: boolean; // false pour Free, true pour Starter/Pro/Elite
  aiAssistanceQueries?: number; // e.g. 5 pour Free, 50 pour Starter, -1 pour Illimité
  docusignInvoices?: number; // e.g. 5 pour Free, 50 pour Starter, -1 pour Illimité
  maxCashiers?: number; // e.g. 1 pour Free, 2 pour Starter, 10 pour Pro, -1 pour Illimité
}

// -------------------------------------------------------------
// Formules et Paramètres de Paiement Plateforme (Super-Admin)
// -------------------------------------------------------------
export interface SubscriptionPlanConfig {
  id: string;
  name: string;
  price: number;
  period: string; // 'mois' | 'trimestre' | 'an'
  badge?: string;
  description?: string;
  features: string[];
  limits?: SubscriptionPlanLimits;
}

export interface MobileOperatorConfig {
  id: string;
  country: string;
  operator: string;
  merchantNumber: string;
  merchantCode?: string; // e.g. "65565805"
  ussdCode: string;
  ussdTemplate?: string; // e.g. "*144*10*{merchantCode}*{montant}#"
  instructions?: string;
  isActive?: boolean;
}

export interface OrangeMoneyBurkinaConfig {
  merchantCode: string; // e.g. "65565805"
  ussdTemplate: string; // e.g. "*144*10*{merchantCode}*{montant}#"
  instructions: string;
}

export interface InternationalRecipientConfig {
  phone: string; // e.g. "+226 65 56 58 05"
  name: string; // e.g. "Nanasore Trésorerie"
  country: string; // e.g. "Burkina Faso"
}

export interface CryptoWalletsConfig {
  usdtTrc20: string;
  moneroXmr: string;
  bitcoinBtc: string;
}

export interface CardGatewayKeysConfig {
  publicKey: string;
  provider: string; // e.g. "Stripe" | "Paystack" | "CinetPay"
  active: boolean;
}

export interface PaymentMethodToggles {
  enableMobileMoney: boolean;
  enableCard: boolean;
  enableCrypto: boolean;
  enableCashOnDelivery: boolean;
}

export interface CentralPaymentConfig {
  orangeMoneyBurkina: OrangeMoneyBurkinaConfig;
  internationalRecipient: InternationalRecipientConfig;
  cryptoWallets: CryptoWalletsConfig;
  cardGatewayKeys: CardGatewayKeysConfig;
  deliveryZones: string[]; // e.g. ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Abidjan"]
  toggles: PaymentMethodToggles;
  scrollingMarquee?: string;
  supportW?: string;
  updatedAt?: number;
  updatedBy?: string;
}

export type CountryCode = 'BF' | 'CI' | 'ML' | 'BJ' | 'SN' | 'TG' | 'NE' | 'GN' | 'CM' | 'GA' | 'CG' | 'TD' | 'CD' | 'GH' | 'NG' | 'KE' | 'MR' | 'RW' | 'UG' | 'TZ' | 'GW' | 'GM' | 'DIASPORA' | 'INT';
export type CryptoCurrency = 'USDT_TRC20' | 'XMR' | 'BTC';

export interface CountryPaymentOption {
  id: string;
  operator: string;
  label: string;
  badge?: string;
  type: 'USSD' | 'APP_TRANSFER' | 'CROSS_BORDER';
  ussdCode?: string;
  telUri?: string;
  recipientNumber?: string;
  instructions: string;
  steps: string[];
}

export interface PlatformPaymentSettings {
  scrollingMarquee: string;
  supportW: string;
  checkoutInstructions?: string;
  operators: MobileOperatorConfig[];
  centralConfig?: CentralPaymentConfig;
}

export interface PlatformSubscriptionConfig {
  plans: SubscriptionPlanConfig[];
  paymentSettings: PlatformPaymentSettings;
  centralPaymentConfig?: CentralPaymentConfig;
  updatedAt?: number;
  updatedBy?: string;
}

// -------------------------------------------------------------
// Passerelle SMS Automatisée MacroDroid -> Firebase Realtime DB
// -------------------------------------------------------------
export interface MacroDroidSmsPayload {
  expediteur: string;
  message: string;
  date: string;
}

export interface SmsPaymentMatchResult {
  matched: boolean;
  smsId: string;
  rawSms: MacroDroidSmsPayload;
  matchedSms?: MacroDroidSmsPayload;
  extractedAmount: number;
  transactionReference: string;
  transactionRef?: string;
  matchedPhone?: string;
}

export type SubscriptionFunnelStep = 'PLAN_SELECTION' | 'UPSELL' | 'DOWNSELL' | 'PAYMENT' | 'SUCCESS';

export interface SubscriptionAddonOption {
  id: string;
  name?: string;
  title?: string;
  description: string;
  price: number;
  badge?: string;
  targetPlans?: string[];
}

// -------------------------------------------------------------
// Intention de Paiement Mobile Money (OTP / USSD)
// -------------------------------------------------------------
export type MobileMoneyProvider = 'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE' | 'MTN_MOMO';

export interface PaymentIntent {
  id: string;
  storeId: string;
  storeName?: string;
  amount: number;
  phoneNumber: string;
  provider: MobileMoneyProvider;
  plan: SubscriptionPlan;
  planMonths: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: number;
  updatedAt?: number;
  referenceCode?: string;
}

// -------------------------------------------------------------
// Demande d'activation par Espèces (Contact Admin)
// -------------------------------------------------------------
export interface AdminCashRequest {
  id: string;
  storeId: string;
  storeName: string;
  ownerName?: string;
  phone?: string;
  plan: SubscriptionPlan;
  planMonths: number;
  amountRequested: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: number;
  processedAt?: number;
  processedByAdminUid?: string;
}

export interface AdminPaymentLog {
  id: string;
  storeId: string;
  storeName?: string;
  amountPaid: number;
  monthsAdded: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'CRYPTO';
  processedByAdminUid: string;
  createdAt: number;
}

// -------------------------------------------------------------
// Agrégation Mensuelle (Optimisation Stockage Firestore)
// -------------------------------------------------------------
export interface MonthlySummary {
  id: string; // Ex: "2026-09"
  storeId: string;
  yearMonth: string; // Ex: "2026-09"
  totalRevenue: number;
  totalProfit: number;
  salesCount: number;
  debtGiven: number;
  debtRecovered: number;
  lossAmount: number;
  updatedAt: number;
}

// -------------------------------------------------------------
// Module d'Affiliation & Parrainage SaaS
// -------------------------------------------------------------
export interface ReferredStore {
  storeId: string;
  storeName: string;
  ownerName: string;
  registeredAt: number;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  commissionGenerated: number;
}

export interface AffiliateProfile {
  id: string;
  storeId: string;
  affiliateCode: string;
  name: string;
  phone: string;
  commissionRate: number; // Par ex: 15 (%)
  availableBalance: number;
  totalEarned: number;
  referredStoresCount: number;
  referredStores: ReferredStore[];
  createdAt: number;
}

export interface AffiliateWithdrawal {
  id: string;
  affiliateId: string;
  affiliateName: string;
  phone: string;
  amount: number;
  provider: MobileMoneyProvider;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  createdAt: number;
  paidAt?: number;
  adminNotes?: string;
}

export interface AffiliateSettingsConfig {
  commissionRate: number; // 15% par défaut
  minWithdrawalAmount: number; // 5000 FCFA
  headlineText: string;
  descriptionBanner: string;
  promoCodePrefix: string;
}

// -------------------------------------------------------------
// Politique de Confidentialité & Mentions Légales
// -------------------------------------------------------------
export interface PrivacyPolicyConfig {
  content: string;
  lastUpdated: string;
  updatedBy: string;
  version: string;
}

// -------------------------------------------------------------
// MODULE 1 : Devis, Suivi de Projet & Séquestre Financier (Escrow)
// -------------------------------------------------------------
export type EscrowStatus =
  | 'draft'               // Devis brouillon
  | 'sent'                // Envoyé au client (attente dépôt fonds)
  | 'funds_locked'        // Fonds consignés & bloqués sous séquestre
  | 'work_in_progress'    // Travaux en cours par le prestataire
  | 'delivered'           // Livrable déposé / remis au client
  | 'completed_released'  // Livraison validée par le client (fonds débloqués)
  | 'funds_withdrawn'     // Fonds retirés par le prestataire
  | 'disputed_paused'     // Gelé / Interrompu par la médiation Super Admin
  | 'refunded_client';    // Remboursé au client suite arbitrage

export interface ProjectMilestone {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface EscrowPaymentDetails {
  provider: string;
  phoneNumber: string;
  transactionRef: string;
  paidAt: number;
  amount: number;
}

export interface EscrowWithdrawalDetails {
  method: 'MOBILE_MONEY' | 'BANK_TRANSFER';
  beneficiaryName: string;
  accountOrPhone: string;
  operatorOrBank?: string;
  requestedAt: number;
  status: 'REQUESTED' | 'PROCESSED';
}

export type EscrowSenderRole = 'CLIENT' | 'MERCHANT' | 'SUPER_ADMIN' | 'SYSTEM';

export interface EscrowChatMessage {
  id: string;
  projectId: string;
  senderRole: EscrowSenderRole;
  senderName: string;
  senderId?: string;
  message: string;
  attachmentUrl?: string; // photo ou capture <= 500 Ko
  attachmentName?: string;
  timestamp: number;
}

export interface EscrowProject {
  id: string;
  storeId: string;
  storeName?: string;
  merchantName?: string;
  merchantPhone?: string;
  merchantEmail?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  projectTitle: string;
  description?: string;
  milestones: ProjectMilestone[];
  totalAmount: number;
  depositAmount?: number;
  termsAndConditions?: string;
  status: EscrowStatus;
  createdAt: number;
  updatedAt: number;
  paymentDetails?: EscrowPaymentDetails;
  withdrawalDetails?: EscrowWithdrawalDetails;
  // Arbitrage et Médiation Super Admin
  disputeReason?: string;
  disputedAt?: number;
  resolutionAction?: 'RELEASED_TO_MERCHANT' | 'REFUNDED_TO_CLIENT';
  resolutionNotes?: string;
  resolvedAt?: number;
  resolvedByAdminUid?: string;
}

// -------------------------------------------------------------
// MODULE 2 : Créateur de CV Professionnels Modernes
// -------------------------------------------------------------
export interface ResumeExperience {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  achievements: string[];
}

export interface ResumeEducation {
  id: string;
  degree: string;
  school: string;
  year: string;
  description?: string;
}

export interface ResumePersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  photoUrl?: string;
  bio: string;
}

export interface ResumeData {
  personalInfo: ResumePersonalInfo;
  experiences: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  softSkills?: string[];
  languages: Array<{ name: string; level: string; percent?: number }>;
  interests?: string[];
  competencesDetaillees?: string[];
  templateId: 'starter' | 'pro' | 'elite' | 'minimal' | 'tech' | 'executive';
  accentColor: string;
  updatedAt: number;
}

// Configuration Juridique & Textes Légaux de la Plateforme (Firestore: platform_settings/legal)
export interface PlatformLegalConfig {
  ticker_text: string;
  legal_mentions_content: string;
  privacy_policy_content: string;
  show_ticker: boolean;
  lastUpdated?: string;
  updatedBy?: string;
}

// -------------------------------------------------------------
// MODULE : Live Room / Hub Webinaire & Shopping en Direct
// -------------------------------------------------------------
export type LivePlatform = 
  | 'daily' 
  | 'jitsi' 
  | 'zoom' 
  | 'google_meet' 
  | 'google_classroom' 
  | 'tiktok' 
  | 'facebook' 
  | 'instagram' 
  | 'youtube' 
  | 'linkedin';

export type LiveRoomMode = 'WEBINAR' | 'CLASSROOM' | 'ONE_ON_ONE';

export type LiveRoomStatus = 'scheduled' | 'live' | 'ended';

export interface LiveChatMessage {
  id: string;
  webinarId: string;
  senderName: string;
  senderId?: string;
  isHost?: boolean;
  message: string;
  timestamp: number;
  type?: 'CHAT' | 'QA' | 'PINNED_OFFER';
  likesCount?: number;
}

export interface LivePinnedProduct {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  photoUrl?: string;
  description?: string;
  stock?: number;
  storeId?: string;
}

export interface LiveWebinar {
  id: string;
  merchantId: string;
  storeId?: string;
  storeName?: string;
  hostName?: string;
  hostAvatarUrl?: string;
  hostPhone?: string;
  title: string;
  description: string;
  date: string;
  platform: LivePlatform;
  roomMode?: LiveRoomMode;
  status: LiveRoomStatus;
  dailyRoomUrl?: string;
  socialStreamUrl?: string;
  meetingUrl?: string;
  isPaid?: boolean;
  price?: number;
  currency?: string;
  aspectRatio?: '16:9' | '9:16';
  resolution?: '360p' | '480p' | '720p' | '1080p';
  pinnedProduct?: LivePinnedProduct;
  maxDurationMinutes?: number;
  viewerCount?: number;
  registeredCount?: number;
  funnelId?: string;
  createdAt?: any;
}

// -------------------------------------------------------------
// MODULE : Premium Classroom & LMS (Académie Digitale)
// -------------------------------------------------------------
export type CourseLevel = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'TOUS_NIVEAUX';

export interface InstructorProfile {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  credentials: string[];
  verifiedBadge?: boolean;
}

export interface CourseTestimonial {
  id: string;
  studentName: string;
  studentRole: string;
  avatarUrl?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface LessonResource {
  id: string;
  title: string;
  fileType: 'PDF' | 'ZIP' | 'CODE' | 'SHEET';
  fileSize: string;
  downloadUrl: string;
  url?: string;
  fileUrl?: string;
}

export type AssignmentSubmissionStatus = 'PENDING' | 'GRADED' | 'NEEDS_REVISION' | 'SUBMITTED' | 'REVIEWED';

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle?: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentAvatarUrl?: string;
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  fileName: string;
  fileSize: number;
  fileUrl?: string;
  fileType?: 'PDF' | 'IMAGE' | 'TEXT' | 'EXCEL' | 'SHEET' | 'OTHER';
  filePreviewContent?: string;
  submittedAt: number;
  status: AssignmentSubmissionStatus;
  grade?: number;
  maxScore?: number;
  passed?: boolean;
  feedback?: string;
  voiceFeedbackUrl?: string;
  voiceDurationSeconds?: number;
  gradedAt?: number;
  gradedByName?: string;
}

export interface StudentRosterItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatarUrl?: string;
  enrolledAt: number;
  progressPercentage: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  averageQuizScore: number;
  pendingAssignmentsCount: number;
  status: 'ONLINE' | 'OFFLINE' | 'IDLE';
  lastActiveAt: number;
  certificateIssued?: boolean;
  currentLessonTitle?: string;
}

export interface InstructorKpiMetrics {
  totalActiveStudents: number;
  averageCourseScore: number;
  pendingAssignmentsCount: number;
  gradedAssignmentsCount: number;
  completionRatePercentage: number;
}

export interface LessonAssignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  dueDate?: string;
  maxScore?: number;
  allowedFileTypes?: string[];
  currentSubmission?: AssignmentSubmission;
  aiEliteGradingEnabled?: boolean;
  aiGradingInstructions?: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface LessonQuiz {
  id: string;
  title: string;
  passingScorePercentage: number;
  questions: QuizQuestion[];
  aiEliteGradingEnabled?: boolean;
  aiGradingInstructions?: string;
}

export interface DripSettings {
  enabled: boolean;
  type: 'DAYS_AFTER_ENROLLMENT' | 'CALENDAR_DATE';
  unlockDays?: number;
  unlockDate?: string;
}

// -------------------------------------------------------------
// MODULE : Hub d'Intégrations Externes (Zoom, Jitsi, Google)
// -------------------------------------------------------------
export type LivePlatformProvider = 'DAILY' | 'ZOOM' | 'GOOGLE_MEET' | 'JITSI';
export type IntegrationProvider = 'ZOOM' | 'JITSI' | 'GOOGLE_CLASSROOM' | 'GOOGLE_MEET';
export type IntegrationStatus = 'DISCONNECTED' | 'CONNECTED' | 'ERROR';

export interface InstructorIntegrationConfig {
  provider: IntegrationProvider;
  status: IntegrationStatus;
  connectedAt?: string;
  lastSyncAt?: string;
  accountEmail?: string;
  accountName?: string;
  // Zoom
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  accountId?: string;
  autoRecord?: boolean;
  // Jitsi
  serverDomain?: string; // ex: meet.jit.si ou meet.entreprise-konkobo.com
  roomPrefix?: string;
  appId?: string;
  jwtSecret?: string;
  // Google Meet & Classroom
  googleClientId?: string;
  googleClientSecret?: string;
  classroomCoursesCount?: number;
  autoCreateClassroomAssignment?: boolean;
}

export interface LiveSessionConfig {
  provider: LivePlatformProvider;
  scheduledAt?: string;
  durationMinutes?: number;
  meetingUrl?: string;
  meetingId?: string;
  passcode?: string;
  hostEmail?: string;
  jitsiServerDomain?: string;
  jitsiRoomName?: string;
  isAutoRecordEnabled?: boolean;
  autoMarkCompletedOnEnd?: boolean;
}

export interface VoiceSimulationScenarioConfig {
  id?: string;
  title?: string;
  persona?: string;
  objective?: string;
  initialGreeting?: string;
  voiceGender?: 'male' | 'female';
  maxDurationSeconds?: number; // default 180 (3 min)
  passingScore?: number; // default 70
  difficulty?: 'DEBUTANT' | 'INTERMEDIAIRE' | 'EXPERT';
  systemPrompt?: string;
  personaName?: string;
  personaRole?: string;
  scenarioContext?: string;
  studentObjective?: string;
  evaluationRubrics?: any[];
  maxDurationMinutes?: number;
  initialAiGreeting?: string;
}

export interface VoiceSimulationTurn {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface VoiceSimulationReport {
  submissionId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  score: number;
  passed: boolean;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  rubrics: {
    empathy: number;
    technicalAccuracy: number;
    resolution: number;
    communication: number;
  };
  createdAt: number;
}

export interface RemediationModule {
  id: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  failedLessonId: string;
  title: string;
  markdownContent: string;
  keyTakeaways: string[];
  targetConcepts: string[];
  quickCheckQuestion: {
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  };
  createdAt: number;
  completed: boolean;
}

export interface LearningPathItem {
  lessonId: string;
  moduleId: string;
  moduleOrder: number;
  type: 'STANDARD' | 'REMEDIATION' | 'VOICE_SIMULATION';
  title: string;
  isRemediation?: boolean;
  remediationId?: string;
  unlocked: boolean;
  completed: boolean;
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  durationMinutes: number;
  videoUrl?: string;
  youtubeUrl?: string;
  hideBranding?: boolean;
  isFreePreview?: boolean;
  isCompleted?: boolean;
  isLocked?: boolean;
  lockReason?: string;
  dripSettings?: DripSettings;
  resources?: LessonResource[];
  attachments?: LessonResource[];
  assignment?: LessonAssignment;
  quiz?: LessonQuiz;
  liveSessionConfig?: LiveSessionConfig;
  voiceSimulationConfig?: VoiceSimulationScenarioConfig;
  remediationId?: string;
  isRemediation?: boolean;
  type?: 'VIDEO' | 'QUIZ' | 'LIVE' | 'VOICE_SIMULATION' | 'ASSIGNMENT' | string;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  hideBranding?: boolean;
  dripSettings?: DripSettings;
  strictLinearProgression?: boolean;
  lessons: CourseLesson[];
}

export interface Course {
  id: string;
  storeId?: string;
  title: string;
  tagline: string;
  description: string;
  coverImage?: string;
  teaserVideoUrl?: string;
  price: number;
  currency?: string;
  level: CourseLevel;
  category: string;
  rating: number;
  enrolledCount: number;
  totalDurationMinutes: number;
  instructor: InstructorProfile;
  learningOutcomes: string[];
  prerequisites?: string[];
  prerequisiteCourseIds?: string[];
  isPasswordProtected?: boolean;
  accessPassword?: string;
  strictLinearProgression?: boolean;
  testimonials: CourseTestimonial[];
  modules: CourseModule[];
  certificateEnabled?: boolean;
  dailyRoomUrl?: string;
  isLive?: boolean;
  createdAt?: number;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  courseId: string;
  enrolledAt: number;
  completedLessonIds: string[];
  quizScores: Record<string, number>; // quizId -> score (0-100)
  assignmentSubmissions: Record<string, AssignmentSubmission>;
  certificateIssued?: boolean;
  certificateIssuedAt?: number;
  certificateId?: string;
  learningPath?: LearningPathItem[];
  remediations?: Record<string, RemediationModule>;
  voiceReports?: Record<string, VoiceSimulationReport>;
}

// -------------------------------------------------------------
// MODULE : NaNa AI Course Forge (Visual Canvas & IRT Engine)
// -------------------------------------------------------------
export type CourseNodeType = 'videoLesson' | 'interactiveQuiz' | 'dailyLive' | 'pdfResource' | 'voiceSimulation';

export type CourseBranchingCondition = 'DEFAULT' | 'ON_PASS' | 'ON_FAIL' | 'REMEDIAL';

export interface AdaptiveQuizQuestion {
  id: string;
  level: 1 | 2 | 3 | 4 | 5; // IRT Difficulty Level
  levelName: string; // Ex: 'Niveau 1 : Rappel' ... 'Niveau 5 : Expertise'
  difficultyBeta: number; // Paramètre de difficulté IRT (-2.0 à +2.0)
  discriminationAlpha: number; // Paramètre de discrimination IRT (0.5 à 2.5)
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  hint: string;
  explanation: string;
  topic?: string;
}

export interface VideoLessonNodeConfig {
  mode: 'MANUAL_UPLOAD' | 'AI_AVATAR' | 'YOUTUBE_EMBED';
  title: string;
  durationMinutes: number;
  // YouTube Stealth
  youtubeUrl?: string;
  hideBranding?: boolean;
  // Manuel
  manualFileName?: string;
  manualFileSize?: number;
  manualVideoUrl?: string;
  uploadProgress?: number;
  isUploaded?: boolean;
  // Avatar IA
  aiScript?: string;
  aiAvatarModel?: string; // 'ibrahim_konkobo_hd' | 'fintech_instructor_female' | 'telecom_expert_male'
  aiVoiceTone?: 'PROFESSIONAL' | 'DYNAMIC' | 'ACADEMIC';
  aiRenderStatus?: 'IDLE' | 'GENERATING' | 'READY';
  aiVideoUrl?: string;
}

export interface CourseNodeData extends Record<string, unknown> {
  id: string;
  type: CourseNodeType;
  title: string;
  subtitle?: string;
  description?: string;
  moduleIndex?: number;
  durationMinutes?: number;
  isRemedial?: boolean;
  // Config spécifique selon type
  videoConfig?: VideoLessonNodeConfig;
  quizQuestions?: AdaptiveQuizQuestion[];
  quizPassingScore?: number;
  aiEliteGradingEnabled?: boolean;
  aiGradingInstructions?: string;
  dailyRoomUrl?: string;
  dailyScheduledDate?: string;
  pdfFileName?: string;
  pdfFileSize?: string;
  pdfDownloadUrl?: string;
  dripSettings?: DripSettings;
  strictLinearProgression?: boolean;
  attachments?: LessonResource[];
  liveSessionConfig?: LiveSessionConfig;
  onEditNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

// -------------------------------------------------------------
// MODULES : Social Campus & Visual Storefront Builder
// -------------------------------------------------------------
export * from './types/community';
export * from './types/storefront';
export * from './types/omniFunnel';
export * from './types/physicalFunnel';

// =============================================================
// CONFIGURATION DE LA PAGE D'ACCUEIL / CMS LANDING (SUPER-ADMIN)
// =============================================================

export interface LandingFeatureHighlight {
  label: string;
  detail: string;
}

export interface LandingIntegrationItem {
  name: string;
  desc: string;
  dot?: string;
}

export interface LandingFeatureCard {
  id: string;
  badge: string;
  badgeStyle?: string;
  iconName?: string;
  iconGradient?: string;
  title: string;
  text: string;
  highlights?: LandingFeatureHighlight[];
  isIntegrationsCard?: boolean;
  integrations?: LandingIntegrationItem[];
  aiBadge?: string;
  footerStatus: string;
  footerTag: string;
  footerSub: string;
}

export interface LandingFeaturesSection {
  badgeText: string;
  title: string;
  description: string;
  cards: LandingFeatureCard[];
  ctaButtonText: string;
}

export interface LandingEliteSlide {
  id?: string;
  name: string;
  type: string;
  location: string;
  metric: string;
  detail: string;
  badge: string;
  avatarBg?: string;
}

export interface LandingImpactStat {
  label: string;
  value: string;
  color?: string;
  /** Petit texte explicatif visible uniquement au survol (fade-in) */
  description?: string;
}

export interface LandingEliteSection {
  badgeText: string;
  title: string;
  description: string;
  slides: LandingEliteSlide[];
  impactStats: LandingImpactStat[];
}

export interface LandingPricingPlan {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  monthlyPriceFCFA: number;
  annualPriceFCFA: number;
  euroEquivalent: string;
  badge?: string;
  isPopular?: boolean;
  features: string[];
  ctaText: string;
}

export interface LandingPricingSection {
  title: string;
  subtitle: string;
  zeroCommissionBanner: {
    title: string;
    description: string;
    badge: string;
  };
  plans: LandingPricingPlan[];
}

export interface LandingFooterConfig {
  brandDescription: string;
  solutionsLinks: { label: string; href: string }[];
  legalLinks: { label: string; href?: string }[];
  copyrightText: string;
  versionText: string;
}

export interface LandingPageConfig {
  featuresSection: LandingFeaturesSection;
  eliteSection: LandingEliteSection;
  pricingSection: LandingPricingSection;
  footerSection: LandingFooterConfig;
  updatedAt?: number;
  updatedBy?: string;
}

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  featuresSection: {
    badgeText: "Technologie Propriétaire Nanasore v2.4",
    title: "L'Arsenal Technologique des Géants du Web.",
    description: "Profitez des innovations logicielles de pointe habituellement réservées aux leaders de la Silicon Valley, entièrement conçues pour vos marchés.",
    ctaButtonText: "Tester ces fonctionnalités en direct",
    cards: [
      {
        id: "funnels",
        badge: "L'Écosystème de Vente",
        badgeStyle: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        iconName: "Filter",
        iconGradient: "from-amber-500 to-rose-600 shadow-amber-500/25",
        title: "Funnels & Conversion Pro",
        text: "Déployez notre Funnel Builder Pro. Générez automatiquement des tunnels de vente à haute conversion pour transformer vos visiteurs en clients fidèles, sans coder.",
        highlights: [
          { label: "⚡ Funnels 1-Clic", detail: "Order Bump & Upsells" },
          { label: "📈 A/B Testing", detail: "Optimisation du ROAS" }
        ],
        footerStatus: "● Tunnels 1-Clic • Bump & Upsell",
        footerTag: "No-Code Engine",
        footerSub: "Taux de conversion boosté jusqu'à +42%"
      },
      {
        id: "pedagogie",
        badge: "L'Ingénierie Pédagogique",
        badgeStyle: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        iconName: "GitFork",
        iconGradient: "from-indigo-600 to-cyan-500 shadow-indigo-500/25",
        title: "Constructeur de Cours Hybride",
        text: "Bâtissez vos cursus universitaires et formations privées visuellement grâce à notre interface innovante par Graphes et Glisser-Déposer. L'apprentissage sur-mesure.",
        highlights: [
          { label: "🧩 Graphes Visuels", detail: "Glisser-déposer de nœuds" },
          { label: "🎓 Cursus Hybride", detail: "Quiz & Certificats auto" }
        ],
        footerStatus: "● Canvas Visuel Nodulaire",
        footerTag: "Graphes & Drag&Drop",
        footerSub: "Parcours d'apprentissage 100% sur-mesure"
      },
      {
        id: "omnicanal",
        badge: "La Diffusion Omnicanale",
        badgeStyle: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        iconName: "Radio",
        iconGradient: "from-rose-600 to-pink-500 shadow-rose-500/25",
        title: "Live Flash & Webinaires Sociaux",
        text: "Multipliez votre audience. Diffusez vos rencontres et ventes flash en simultané sur TikTok, Facebook, Instagram, YouTube et LinkedIn directement depuis Nanasore.",
        highlights: [
          { label: "📡 Multistream RTMP", detail: "5 réseaux en simultané" },
          { label: "⚡ Vente Flash Direct", detail: "Achat immédiat en live" }
        ],
        footerStatus: "● Multistreaming HD Synchrone",
        footerTag: "WebRTC & RTMP",
        footerSub: "TikTok • Facebook • IG • YouTube • LinkedIn"
      },
      {
        id: "securite",
        badge: "La Suite Corporative Sécurisée",
        badgeStyle: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        iconName: "ShieldCheck",
        iconGradient: "from-emerald-600 to-teal-500 shadow-emerald-500/25",
        title: "Gestion, Séquestre & Contrats",
        text: "Automatisez la création de vos sites vitrines et CV Pros. Sécurisez vos transactions avec notre système de devis sous séquestre et signature électronique intégrée (équivalent DocuSign).",
        highlights: [
          { label: "🔒 Séquestre Garanti", detail: "Fonds libérés à livraison" },
          { label: "✍️ Signature e-ID", detail: "Contrats type DocuSign" }
        ],
        footerStatus: "● Séquestre & e-Signature Actifs",
        footerTag: "DocuSign Embedded",
        footerSub: "Protection juridique et financière certifiée"
      },
      {
        id: "integrations_ecommerce",
        badge: "Écosystème E-commerce & CRM",
        badgeStyle: "text-violet-400 bg-violet-500/10 border-violet-500/20",
        iconName: "ShoppingBag",
        iconGradient: "from-violet-600 to-purple-600 shadow-violet-500/25",
        title: "Écosystème E-commerce & CRM",
        text: "Synchronisez votre boutique en ligne, vos ventes et vos campagnes marketing automatisées en direct :",
        isIntegrationsCard: true,
        integrations: [
          { name: "WooCommerce", desc: "analyse & paiement direct", dot: "bg-violet-400" },
          { name: "Brevo", desc: "envoi d’email automatique", dot: "bg-blue-400" },
          { name: "Twilio", desc: "envoi SMS transactionnel", dot: "bg-rose-400" },
          { name: "Webhooks & API", desc: "synchronisation fluide", dot: "bg-emerald-400" }
        ],
        footerStatus: "● E-commerce & CRM Connectés",
        footerTag: "Sync Automatique",
        footerSub: "Commandes, emails et relances 100% synchronisés"
      },
      {
        id: "integrations_collab_ai",
        badge: "Outils Collaboratifs & IA",
        badgeStyle: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
        iconName: "Bot",
        iconGradient: "from-cyan-600 to-blue-600 shadow-cyan-500/25",
        title: "Outils Collaboratifs & IA",
        text: "Animez vos cours et réunions grâce aux leaders mondiaux de la visio et à l'intelligence artificielle :",
        isIntegrationsCard: true,
        integrations: [
          { name: "Google Meet & Zoom", desc: "synchro sessions live", dot: "bg-amber-400" },
          { name: "Jitsi & Classroom", desc: "salles de cours & devoirs", dot: "bg-cyan-400" },
          { name: "Nanasore Live Native", desc: "visioconférence HD fluide", dot: "bg-emerald-400" }
        ],
        aiBadge: "IA Génératives (Gemini, Claude, GPT)",
        footerStatus: "● Salons Visio & IA Opérationnels",
        footerTag: "Visio & IA Hybride",
        footerSub: "Collaboration interactive & assistance IA continue"
      }
    ]
  },
  eliteSection: {
    badgeText: "Showcase Elite",
    title: "Ils bâtissent leur empire avec Nanasore.",
    description: "Découvrez les boutiques et académies souveraines déployées par les membres de notre programme Elite.",
    slides: [
      {
        name: "Maison Wax & Luxe",
        type: "Boutique Mode & Prêt-à-porter",
        location: "Dakar, Sénégal",
        metric: "28M FCFA / mois",
        detail: "45 sessions Live Shopping réalisées",
        badge: "Plan Elite",
        avatarBg: "from-amber-500 to-rose-500"
      },
      {
        name: "Kemet Tech Academy",
        type: "Campus IA & Développement",
        location: "Abidjan, Côte d'Ivoire",
        metric: "1,850 étudiants",
        detail: "Campus 100% Marque Blanche",
        badge: "Plan Elite",
        avatarBg: "from-blue-600 to-indigo-600"
      },
      {
        name: "Sahel Agro-Business",
        type: "Commerce & Distribution",
        location: "Ouagadougou, Burkina Faso",
        metric: "12 boutiques POS",
        detail: "Caisse connectée & mode hors-ligne",
        badge: "Plan Elite",
        avatarBg: "from-emerald-600 to-teal-500"
      },
      {
        name: "FinTech Leadership Institute",
        type: "Formations Exécutives",
        location: "Lomé, Togo",
        metric: "98% Taux de complétion",
        detail: "Certificats officiels QR Code",
        badge: "Plan Elite",
        avatarBg: "from-purple-600 to-pink-600"
      },
      {
        name: "AfroCosmetics Pure",
        type: "Soins & Beauté Naturelle",
        location: "Douala, Cameroun",
        metric: "Ventes 1-Clic WhatsApp",
        detail: "Passerelle Wave & Orange Money",
        badge: "Plan Elite",
        avatarBg: "from-rose-500 to-amber-500"
      },
      {
        name: "BTP & Génie Civil Studio",
        type: "Masterclass Pro & Plans",
        location: "Cotonou, Bénin",
        metric: "Correction IA Activée",
        detail: "Devoirs notés automatiquement",
        badge: "Plan Elite",
        avatarBg: "from-cyan-600 to-blue-600"
      }
    ],
    impactStats: [
      { label: "Paiements sécurisés", value: "🔒 SSL & Chiffré", color: "text-blue-500", description: "Toutes les transactions sont protégées par un chiffrement de bout en bout et les protocoles SSL/TLS." },
      { label: "Déploiement rapide", value: "⚡ < 60 secondes", color: "text-emerald-500", description: "Créez votre boutique ou campus en ligne et commencez à vendre en moins d'une minute." },
      { label: "Support réactif", value: "💬 24h/7j", color: "text-indigo-500", description: "Notre équipe d'assistance technique répond à vos demandes sous 2 heures, tous les jours de la semaine." },
      { label: "Zéro commission", value: "0% prélevé", color: "text-purple-500", description: "Conservez 100% de votre chiffre d'affaires. Aucune commission cachée sur vos ventes." }
    ]
  },
  pricingSection: {
    title: "Des tarifs simples pour bâtir sans limites.",
    subtitle: "Démarrez petit et évoluez à votre rythme. Changez de plan à tout moment en un clic.",
    zeroCommissionBanner: {
      title: "0% de commission. 100% de vos revenus vous appartiennent.",
      description: "Contrairement aux plateformes qui ponctionnent entre 5% et 15% sur chaque vente, Nanasore ne prélève aucun centime sur votre chiffre d'affaires. Vous ne payez qu'un abonnement mensuel transparent.",
      badge: "Zéro Frais Cachés"
    },
    plans: [
      {
        id: "free",
        name: "Plan Zéro",
        subtitle: "Gratuit / Acquisition",
        description: "Démarrez et vendez sans frais ni carte bancaire. 19 outils essentiels inclus pour le commerce physique et l'initiation e-learning.",
        monthlyPriceFCFA: 0,
        annualPriceFCFA: 0,
        euroEquivalent: "100% Gratuit à vie • Aucune carte requise",
        badge: "Freemium",
        isPopular: false,
        features: [
          "Caisse tactile POS de comptoir ou portable avec synchronisation Cloud",
          "Site vitrine offert",
          "Publication Marketplace & catalogue public",
          "Assistant IA décisionnel de base",
          "Impression tickets thermiques (Bluetooth/USB)",
          "Carnet d'ardoises dettes & créances clients",
          "Formulaires devis & contact instantané",
          "Catalogue LMS public pour formations",
          "Centre d'aide & documentation intégrée",
          "Tableau de bord central unifié caméléon",
          "Simulateur de marge & rentabilité",
          "Simulateur de trésorerie (Cashflow)",
          "Extension Nanaswitch Cloud",
          "Revente & affiliation services partenaires",
          "Souscription gratuite au service de livraison pendant le live shopping",
          "Export tunnels formats compatibles",
          "Gestion & consultation multi-devises",
          "Notifications email de confirmation",
          "0% de commission sur vos encaissements"
        ],
        ctaText: "Commencer Gratuitement (0F)"
      },
      {
        id: "starter",
        name: "Plan Pro",
        subtitle: "Boutique & Formateur Pro",
        description: "La formule tout-en-un pour les commerces actifs et les formateurs indépendants voulant encaisser sans aucune limite.",
        monthlyPriceFCFA: 15000,
        annualPriceFCFA: 12500,
        euroEquivalent: "Soit 15 000 FCFA / mois (150 000 / an)",
        badge: "Le Choix Recommandé",
        isPopular: true,
        features: [
          "Caisse POS & Produits illimités",
          "10 Tunnels de vente (Option à l'usage)",
          "Jusqu'à 50 cours hébergés & élèves illimités",
          "Gestion jusqu'à 5 caissiers (PIN)",
          "Module CV Pro inclus en illimité",
          "Passerelles directes à 0% de commission",
          "Certificats officiels sécurisés QR Code"
        ],
        ctaText: "Choisir le Plan Pro"
      },
      {
        id: "pro",
        name: "Plan Business",
        subtitle: "Multi-Boutiques & Campus",
        description: "Solution complète pour commerces en réseau, équipes multi-caissiers et académies avec plusieurs instructeurs.",
        monthlyPriceFCFA: 30000,
        annualPriceFCFA: 25000,
        euroEquivalent: "Soit 30 000 FCFA / mois (300 000 / an)",
        badge: "Croissance & Équipe",
        isPopular: false,
        features: [
          "Multi-points de vente (jusqu'à 20 caissiers)",
          "Stocks multi-magasins synchronisés",
          "Pixels publicitaires Meta & TikTok intégrés",
          "CRM marketing & relances de paniers",
          "Gestion multi-formateurs & cohortes d'élèves",
          "Assistance prioritaire WhatsApp 7j/7"
        ],
        ctaText: "Choisir Plan Business"
      },
      {
        id: "elite",
        name: "Plan Enterprise",
        subtitle: "Franchises & Marque Blanche",
        description: "Pour réseaux de distribution, universités privées et grandes enseignes exigeant une autonomie souveraine absolue.",
        monthlyPriceFCFA: 60000,
        annualPriceFCFA: 50000,
        euroEquivalent: "Soit 60 000 FCFA / mois (600 000 / an)",
        badge: "Marque Blanche 100%",
        isPopular: false,
        features: [
          "Marque Blanche totale (Zéro mention NaNa)",
          "Votre propre nom de domaine personnalisé",
          "Nombre de caisses & campus illimité",
          "CV Pro & attestations d'entreprise illimités",
          "Accès complet aux webhooks & API souveraines",
          "Chargé de compte dédié & SLA garanti 99.9%"
        ],
        ctaText: "Choisir Enterprise"
      }
    ]
  },
  footerSection: {
    brandDescription: "Plateforme SaaS hybride tout-en-un pour le commerce physique, le live shopping et le e-learning en marque blanche. 0% de commission.",
    solutionsLinks: [
      { label: "Caisse POS & Boutiques", href: "#bento" },
      { label: "Live Shopping 1-to-1", href: "#bento" },
      { label: "Campus Formateurs Privés", href: "#bento" },
      { label: "Agent IA de Vente & Correction", href: "#next-gen" },
      { label: "Programme Partenaire", href: "/partenaires" }
    ],
    legalLinks: [
      { label: "Mentions Légales & CGV" },
      { label: "Politique de Confidentialité" },
      { label: "Sécurité des Données Firestore" },
      { label: "Multi-Tenant Partitionné" }
    ],
    copyrightText: "© 2026 Nanasore Technologies Inc. Tous droits réservés.",
    versionText: "SaaS Multi-Tenant Nanasore v2.4 • 0% Commission"
  }
};

// =========================================================================
// Architecture Nanasore Studio OS : Modèle Universel de Personnalisation
// =========================================================================
export interface ThemeCustomizationConfig {
  // 0. Schéma Universel de Personnalisation Modulaire Firebase (Hero à Footer)
  customization?: {
    hero?: {
      title?: string;
      subtitle?: string;
      ctaText?: string;
      bannerUrl?: string;
      description?: string;
      videoUrl?: string;
      priceHighlight?: string;
    };
    features?: {
      title?: string;
      subtitle?: string;
      items?: Array<{ title: string; desc?: string; icon?: string }>;
    };
    productsGrid?: {
      title?: string;
      subtitle?: string;
      ctaText?: string;
      categoryFilter?: string;
    };
    footer?: {
      aboutText?: string;
      contactPhone?: string;
      copyright?: string;
      address?: string;
      email?: string;
    };
  };

  // 1. Identité, Contact & Barre d'Annonce
  storeName?: string;
  storeTagline?: string;
  logoUrl?: string;
  whatsappNumber?: string;
  supportPhone?: string;
  announcementBarEnabled?: boolean;
  announcementBarText?: string; // ex: "🔥 Livraison Express & Paiement Mobile Money à la livraison !"
  primaryAccentColor?: string;
  headerBgColor?: string;
  navLinks?: { label: string; href?: string; category?: string }[];

  // 2. Grande Bannière Hero (Accueil) & Sous-Bannières
  heroSubtitle?: string; // ex: "COLLECTION PRESTIGE" ou "THE NEW STANDARD"
  heroTitle?: string; // Grand titre H1
  heroDescription?: string;
  heroPriceHighlight?: string; // ex: "À partir de 15.000 FCFA"
  heroCtaText?: string; // ex: "Découvrir l'offre"
  heroCtaUrl?: string;
  heroBannerImageUrl?: string;
  heroVideoUrl?: string;
  heroLinkedProductId?: string | null; // Produit ouvert au clic sur le CTA du Hero (ou son Tunnel Dépliable)

  // Sous-Bannières secondaires (ex: MegaStore 30% empilées, Electro mini-bannières)
  subBanner1Badge?: string;
  subBanner1Title?: string;
  subBanner1Subtitle?: string;
  subBanner1Image?: string;
  subBanner1CtaText?: string;
  subBanner2Badge?: string;
  subBanner2Title?: string;
  subBanner2Subtitle?: string;
  subBanner2Image?: string;
  subBanner2CtaText?: string;

  // 3. "Product Picking" (Offre Spéciale & Mise en Avant) & Sections Catalogue / Réassurance
  specialOfferProductId?: string | null; // Produit vedette (Cadre "Special Offer" d'Electro, Offre Épinglée du Live, ou Produit Phare)
  specialOfferCountdownHours?: number; // ex: 12h, 24h
  specialOfferSaveBadgeText?: string; // ex: "Économisez 10.000 F"
  catalogSubtitle?: string;
  catalogTitle?: string;
  testimonialsSubtitle?: string;
  testimonialsTitle?: string;
  reassurance1Title?: string;
  reassurance1Desc?: string;
  reassurance2Title?: string;
  reassurance2Desc?: string;
  reassurance3Title?: string;
  reassurance3Desc?: string;
  reassurance4Title?: string;
  reassurance4Desc?: string;

  // 4. Studio Live Shopping, Preuve Sociale & Pied de page
  liveStreamVideoUrl?: string; // Lien YouTube Live / Facebook / TikTok / MP4
  liveStreamStatus?: 'live' | 'upcoming' | 'replay';
  enableLiveSalesPopup?: boolean; // Bulle de preuve sociale ("Moussa vient d'acheter...")
  footerAboutText?: string;
  footerAddress?: string;
  footerEmail?: string;
  copyrightText?: string;
  paymentIconsVisible?: boolean;
  footerColumns?: { title: string; links: { label: string; href: string }[] }[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    whatsapp?: string;
  };

  // 5. Architecture Nanasore Architect OS (Partie 5A : Arborescence Drag & Drop & Design Tokens)
  customSections?: CustomSectionInstance[];
  customMood?: CustomThemeMood;
  customButtonStyle?: 'none' | 'md' | 'xl' | 'full' | 'rounded-xl' | 'rounded-full' | 'rounded-none';
  customFont?: 'modern-sans' | 'luxury-serif' | 'tech-mono' | 'sans' | 'display' | 'serif';

  // 6. Système des 6 En-Têtes Premium Nanasore
  headerStyle?: HeaderStyleType;
  headerSettings?: Record<string, any>;

  // 7. Système des 3 Pieds de Page (Footers) Premium Nanasore
  footerStyle?: FooterStyleType;
  footerMapCity?: string;
  footerMapCoordinates?: { lat: number; lng: number };
  footerNewsletterTitle?: string;
  footerNewsletterSubtitle?: string;
  footerSettings?: Record<string, any>;

  // 8. Snapshots & Presets de Boutique Enregistrés dans le Studio
  savedPresets?: SavedThemePreset[];

  // 9. Hub Marketing & Pixels Publicitaires (Meta, TikTok, Google)
  metaPixelId?: string;
  tiktokPixelId?: string;
  googleTagId?: string;

  // 10. Barre de Navigation Basse Mobile (iOS / Android 5 Onglets au Pouce)
  showMobileBottomBar?: boolean;
}

export interface SavedThemePreset {
  id: string;
  name: string; // ex: "Mon Thème Principal", "Spécial Promo Fêtes", "Mode Live Shopping"
  savedAt: string; // ISO date ou heure lisible
  createdAt?: string;
  headerStyle?: HeaderStyleType | string;
  footerStyle?: FooterStyleType | string;
  customMood?: string;
  sectionsCount: number;
  configSnapshot: Record<string, any>; // Copie complète des sections, couleurs, header, footer
  config?: Partial<ThemeCustomizationConfig>;
  sections?: CustomSectionInstance[];
  description?: string;
}

export type ThemeSavedPreset = SavedThemePreset;

export type HeaderStyleType = 
  | 'mega_hub_marketplace'   // En-tête 1 : Style You&Me Shop / Marketplace Pro
  | 'editorial_glowing_luxe' // En-tête 2 : Style GLOWING Beauté & Santé
  | 'stories_rings_viral'    // En-tête 3 : Anneaux de Stories TikTok/Insta
  | 'dynamic_island_glass'   // En-tête 4 : Dynamic Island Apple / Linear
  | 'live_radar_vocal'       // En-tête 5 : Radar Live & Note Vocale
  | 'smart_reward_bar';      // En-tête 6 : Jauge de Cadeau & Conversion Pure

export type FooterStyleType = 
  | 'bento_map_trust_footer'      // Footer 1 : Bento Grid Apple + Mini-Map Zoom
  | 'editorial_prestige_footer'   // Footer 2 : Éditorial Luxe GLOWING + Club Email
  | 'conversion_command_footer';  // Footer 3 : Command Dock + Map + QR & WhatsApp


export type CustomThemeMoodPreset = 
  | 'nanasore-royal' 
  | 'spotify-obsidian' 
  | 'hermes-sand' 
  | 'emerald-botanic' 
  | 'cyber-neon' 
  | 'custom';

export interface CustomThemeMood {
  presetId: CustomThemeMoodPreset;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  buttonRadius: 'none' | 'md' | 'xl' | 'full';
  fontPairing: 'modern-sans' | 'luxury-serif' | 'tech-mono';
}

export type CustomSectionType =
  // Les 8 Fondamentaux Réinventés (Partie 5B)
  | 'bento_hero'
  | 'spotify_shelf'
  | 'smart_masonry_grid'
  | 'flash_deal_vault'
  | 'video_story_carousel'
  | 'parallax_brand_story'
  | 'interactive_trust_bar'
  | 'smart_faq_concierge'
  // Modules Dédiés Thématiques Shopify (Cosmétique, Beauté & Santé)
  | 'glowing_cosmetics_grid'
  // Modules Dédiés Produits Numériques, Formations & Webinaires (1080x1080)
  | 'digital_square_grid'
  // Module Révolutionnaire Nanasore Live OS (Live Shopping, Webinaire, Coaching 1-to-1)
  | 'omni_live_studio'
  // Les 7 Modules Exclusifs "Nanasore Originals" (Partie 5C)
  | 'voice_note_pitch'
  | 'interactive_bundle_lab'
  | 'live_haggle_offer'
  | 'product_finder_quiz'
  | 'before_after_slider'
  | 'social_wall_wameet'
  | 'social_wall_w'
  | 'vip_mystery_scratch'
  // Rétrocompatibilité préliminaire
  | 'hero_split_banner'
  | 'spotify_product_shelf'
  | 'product_grid_custom'
  | 'spotlight_deal_countdown'
  | 'video_story_reel'
  | 'trust_badges_strip'
  | 'rich_story_banner'
  | 'faq_accordion_section';

export interface CustomSectionInstance {
  id: string; // ex: 'sec_1712345'
  type: CustomSectionType;
  title: string;
  subtitle?: string;
  visible: boolean;
  spacingTop?: 'none' | 'sm' | 'md' | 'lg';
  spacingBottom?: 'none' | 'sm' | 'md' | 'lg';
  backgroundStyle?: 'default' | 'surface' | 'accent_gradient' | 'dark_glass';
  settings?: Record<string, any>; // Paramètres propres à chaque module
  // Compatibilité ascendante
  enabled?: boolean;
  config?: Record<string, any>;
}

// Alias de rétrocompatibilité
export type CustomThemeSection = CustomSectionInstance;
export type CustomThemeSectionType = CustomSectionType;
export type CustomThemeButtonStyle = 'none' | 'md' | 'xl' | 'full';

export interface SuperAdminRecord {
  user_id: string;
  role: string;
  granted_at: string;
}

export type KycStatusTier = 'none' | 'light' | 'full' | 'verified' | string;
export type PricingModelTier = 'none' | 'pay_per_use' | 'commission' | 'subscription' | string;

export interface AdminUserOverviewItem {
  user_id: string;
  email: string | null;
  full_name: string | null;
  wallet_balance: number;
  kyc_status: KycStatusTier;
  pricing_model: PricingModelTier;
  business_option?: string | null;
  enabled_themes: string[];
  created_at: string;
  parcours_actif: string;
}

