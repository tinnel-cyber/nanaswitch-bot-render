import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  Sparkles,
  Layers,
  GraduationCap,
  Users,
  Video,
  ShoppingBag,
  Store,
  Receipt,
  FileSpreadsheet,
  FileCheck,
  Globe,
  PenTool,
  Bot,
  Workflow,
  Zap,
  Share2,
  Search,
  Filter,
  ArrowLeft,
  Mail,
  Phone,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Database,
  Server,
  Send,
  MessageSquare,
  Activity,
  ChevronRight,
  ChevronDown,
  UserCheck,
  UserX,
  Crown,
  Terminal,
  Hash,
  Delete,
  Eye,
  Settings,
  ArrowUpRight,
  Radio,
  Clock,
  X,
  Plus,
  Megaphone,
  Smartphone,
  ShoppingCart,
  MessageCircle,
  BarChart,
  Home
} from 'lucide-react';

import {
  playTapBeep,
  playValidationBeep,
  playCancelSound,
  playCashChime,
  formatCFA
} from '../utils/audio';
import { addUserCredits } from '../utils/firestoreService';
import { ThemeSwitcher } from './ThemeSwitcher';
import { FunnelBuilder } from './FunnelBuilder';
import { saveFunnelConfig } from '../services/omniFunnelService';
import { WameetLogo } from './wameet/WameetLogo';

// ── MODULE DEFINITION (Identique aux 14 modules cités au Niveau 1) ───────────

export const NANA_ALL_MODULES = [
  // Pôle Éducation
  'Espace Étudiants',
  'Espace Professeurs',
  'Live/Webinaires',
  // Pôle Business & E-commerce
  'Caisse',
  'Vitrine',
  'Bons & Commandes',
  'Devis & Projets',
  // Pôle Productivité & Outils
  'CV Pro',
  'Générateur Landing Pages',
  'Signature Authentifiée',
  // Pôle IA & Automatisation
  'Création Vidéo (Google Flow)',
  'IA Marketing',
  'Connecteurs (WooCommerce, Brevo, Twilio, WhatsApp)',
  // Pôle Réseau
  'Partenariats',
] as const;

export type NanaModuleName = typeof NANA_ALL_MODULES[number];

// ── TYPES DU SUPER CRM ──────────────────────────────────────────────────────

export type SubscriptionPlanTier = 'Free' | 'Starter' | 'Pro Business' | 'Enterprise VIP';

export interface CrmUserRecord {
  id: string;
  name: string;
  avatar: string;
  companyName?: string;
  country: {
    code: string;
    name: string;
    flag: string;
  };
  email: string;
  phone: string;
  isWhatsAppVerified?: boolean;
  subscribedModules: NanaModuleName[];
  registrationDate: string;
  plan: SubscriptionPlanTier;
  isActive: boolean;
  mrrContribution: number; // en FCFA
}

export interface ConnectorConfig {
  id: 'woocommerce' | 'twilio' | 'brevo' | 'webhooks';
  name: string;
  category: string;
  icon: string;
  status: 'CONNECTED' | 'IDLE' | 'ERROR';
  description: string;
  endpointUrl: string;
  apiKey: string;
  apiSecret?: string;
  webhookSecret?: string;
  fromPhoneNumber?: string;
  senderId?: string;
  senderEmail?: string;
  senderName?: string;
  isPrimaryProvider?: boolean;
  lastPingMs?: number;
  lastSyncTime?: string;
  activeEvents: string[];
}

export interface AutomationLogItem {
  id: string;
  timestamp: string;
  connector: string;
  event: string;
  status: '200_OK' | '201_CREATED' | '500_ERROR' | 'QUEUED';
  payloadPreview: string;
}

// ── DONNÉES DE SIMULATION INITIALES DU SUPER CRM ─────────────────────────────

const INITIAL_CRM_USERS: CrmUserRecord[] = [
  {
    id: 'usr-1',
    name: 'Amadou Ouédraogo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    companyName: 'Sahel Télécom & Pay',
    country: { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
    email: 'amadou.sahel@telecom.bf',
    phone: '+226 70 12 34 56',
    isWhatsAppVerified: true,
    subscribedModules: ['Caisse', 'Vitrine', 'IA Marketing', 'Bons & Commandes'],
    registrationDate: '12 Janvier 2026',
    plan: 'Enterprise VIP',
    isActive: true,
    mrrContribution: 125000,
  },
  {
    id: 'usr-2',
    name: 'Fatoumata Bamba',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    companyName: 'Ivoire Agro Hub',
    country: { code: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮' },
    email: 'f.bamba@ivoireagro.ci',
    phone: '+225 07 89 45 12',
    isWhatsAppVerified: true,
    subscribedModules: ['Espace Étudiants', 'Live/Webinaires', 'Signature Authentifiée', 'Connecteurs (WooCommerce, Brevo, Twilio, WhatsApp)'],
    registrationDate: '04 Février 2026',
    plan: 'Pro Business',
    isActive: true,
    mrrContribution: 75000,
  },
  {
    id: 'usr-3',
    name: 'Moussa Diop',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    companyName: 'Dakar FinTech Academy',
    country: { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
    email: 'moussa@dakarfintech.sn',
    phone: '+221 77 654 32 10',
    isWhatsAppVerified: true,
    subscribedModules: ['Espace Étudiants', 'Espace Professeurs', 'Live/Webinaires', 'Création Vidéo (Google Flow)'],
    registrationDate: '18 Décembre 2025',
    plan: 'Enterprise VIP',
    isActive: true,
    mrrContribution: 150000,
  },
  {
    id: 'usr-4',
    name: 'Aïcha Traoré',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    companyName: 'Bamako Mode & Élegance',
    country: { code: 'ML', name: 'Mali', flag: '🇲🇱' },
    email: 'aicha.traore@bamakomode.ml',
    phone: '+223 66 11 22 33',
    isWhatsAppVerified: true,
    subscribedModules: ['Caisse', 'Vitrine', 'Générateur Landing Pages', 'IA Marketing'],
    registrationDate: '28 Janvier 2026',
    plan: 'Pro Business',
    isActive: true,
    mrrContribution: 65000,
  },
  {
    id: 'usr-5',
    name: 'Koffi Mensah',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    companyName: 'Lomé BTP & Escrow',
    country: { code: 'TG', name: 'Togo', flag: '🇹🇬' },
    email: 'koffi.mensah@lomebtp.tg',
    phone: '+228 90 12 34 56',
    isWhatsAppVerified: false,
    subscribedModules: ['Devis & Projets', 'Signature Authentifiée', 'Bons & Commandes'],
    registrationDate: '09 Février 2026',
    plan: 'Starter',
    isActive: true,
    mrrContribution: 35000,
  },
  {
    id: 'usr-6',
    name: 'Serge Dossou',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    companyName: 'Cotonou Digital Hub',
    country: { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
    email: 'serge.dossou@cotonouhub.bj',
    phone: '+229 97 00 11 22',
    isWhatsAppVerified: false,
    subscribedModules: ['CV Pro', 'Générateur Landing Pages', 'Partenariats'],
    registrationDate: '15 Février 2026',
    plan: 'Free',
    isActive: false,
    mrrContribution: 0,
  },
  {
    id: 'usr-7',
    name: 'Mariam Diallo',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    companyName: 'Conakry Solar Power',
    country: { code: 'GN', name: 'Guinée', flag: '🇬🇳' },
    email: 'mariam@conakrysolar.gn',
    phone: '+224 620 45 67 89',
    isWhatsAppVerified: true,
    subscribedModules: ['Caisse', 'Devis & Projets', 'Signature Authentifiée', 'Connecteurs (WooCommerce, Brevo, Twilio, WhatsApp)'],
    registrationDate: '22 Janvier 2026',
    plan: 'Enterprise VIP',
    isActive: true,
    mrrContribution: 140000,
  },
  {
    id: 'usr-8',
    name: 'Jean-Luc Moreau',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    companyName: 'Diaspora Invest & Partner',
    country: { code: 'FR', name: 'France', flag: '🇫🇷' },
    email: 'jl.moreau@diasporainvest.fr',
    phone: '+33 6 12 34 56 78',
    isWhatsAppVerified: false,
    subscribedModules: ['Partenariats', 'Devis & Projets', 'Espace Professeurs', 'Création Vidéo (Google Flow)'],
    registrationDate: '01 Février 2026',
    plan: 'Pro Business',
    isActive: true,
    mrrContribution: 85000,
  }
];

const INITIAL_CONNECTORS: ConnectorConfig[] = [
  {
    id: 'woocommerce',
    name: 'WooCommerce Store Bridge',
    category: 'E-Commerce Sync',
    icon: 'ShoppingBag',
    status: 'CONNECTED',
    description: 'Synchronise automatiquement les catalogues de produits, stocks POS et commandes payées en ligne.',
    endpointUrl: 'https://boutique.entreprise-nana.com/wp-json/wc/v3',
    apiKey: 'ck_7b9f8e4a2c1d09e8f7a6b5c4d3e2f1a0',
    apiSecret: 'cs_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    lastPingMs: 42,
    lastSyncTime: 'Il y a 3 min',
    activeEvents: ['order.created', 'product.stock_updated', 'customer.created']
  },
  {
    id: 'twilio',
    name: 'Twilio SMS & WhatsApp Gateway',
    category: 'Télécoms & Messaging',
    icon: 'MessageSquare',
    status: 'CONNECTED',
    description: 'Envoi des codes OTP de caisse, reçus de paiement et campagnes transactionnelles WhatsApp Business.',
    endpointUrl: 'https://api.twilio.com/2010-04-01/Accounts',
    apiKey: 'AC98f21908a1c890124e5a67b89',
    apiSecret: 'auth_78192a0b1c2d3e4f5',
    fromPhoneNumber: '+12058492019',
    senderId: 'NANA_STORE',
    isPrimaryProvider: false,
    lastPingMs: 29,
    lastSyncTime: 'Il y a 1 min',
    activeEvents: ['sms.sent', 'whatsapp.delivered', 'otp.verified']
  },
  {
    id: 'brevo',
    name: 'Brevo (Sendinblue) Emailing & SMS',
    category: 'Emailing & SMS Marketing',
    icon: 'Mail',
    status: 'CONNECTED',
    description: 'Campagnes emailing marketing, newsletters, relances automatisées et envois transactionnels par email et SMS.',
    endpointUrl: 'https://api.brevo.com/v3',
    apiKey: '',
    senderEmail: 'contact@nanastore.africa',
    senderName: 'NaNa Store Marketing',
    senderId: 'NANA_STORE',
    isPrimaryProvider: true,
    lastPingMs: 64,
    lastSyncTime: 'Il y a 8 min',
    activeEvents: ['email.campaign_sent', 'email.delivered', 'email.opened', 'sms.transactional', 'contact.created']
  },
  {
    id: 'webhooks',
    name: 'Webhooks Custom ERP Event Bus',
    category: 'Bus d’Événements',
    icon: 'Workflow',
    status: 'CONNECTED',
    description: 'Diffusion en temps réel des webhooks sortants avec signature cryptographique HMAC SHA-256.',
    endpointUrl: 'https://webhook.site/nana-erp-live-feed',
    apiKey: 'whsec_e5f4d3c2b1a0987654321fedcba09876',
    webhookSecret: 'sha256_supersecret_enterprise_signature',
    lastPingMs: 18,
    lastSyncTime: 'Il y a 30 sec',
    activeEvents: ['user.registered', 'invoice.paid', 'contract.signed', 'course.enrolled']
  }
];

const INITIAL_AUTOMATION_LOGS: AutomationLogItem[] = [
  {
    id: 'log-1',
    timestamp: '12:28:44',
    connector: 'Twilio Gateway',
    event: 'sms.otp_sent',
    status: '200_OK',
    payloadPreview: '{ to: "+22670123456", code: "7482", gateway: "Orange/Moov BF" }'
  },
  {
    id: 'log-2',
    timestamp: '12:26:12',
    connector: 'Brevo Marketing',
    event: 'email.contract_delivered',
    status: '200_OK',
    payloadPreview: '{ recipient: "f.bamba@ivoireagro.ci", templateId: "docu_signed_v2" }'
  },
  {
    id: 'log-3',
    timestamp: '12:22:05',
    connector: 'WooCommerce Store Bridge',
    event: 'order.stock_synced',
    status: '200_OK',
    payloadPreview: '{ sku: "NANA-POS-TERM-1", stockQty: 14, store: "Ivoire Agro" }'
  },
  {
    id: 'log-4',
    timestamp: '12:15:30',
    connector: 'Webhooks Custom',
    event: 'contract.signed',
    status: '201_CREATED',
    payloadPreview: '{ contractId: "doc-9941", hashSha256: "9f8a7c6e...2b1", legal: "OHADA" }'
  }
];

// Helper couleurs par module
const getModuleBadgeColor = (moduleName: NanaModuleName): string => {
  if (['Espace Étudiants', 'Espace Professeurs', 'Live/Webinaires'].includes(moduleName)) {
    return 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25';
  }
  if (['Caisse', 'Vitrine', 'Bons & Commandes', 'Devis & Projets'].includes(moduleName)) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25';
  }
  if (['CV Pro', 'Générateur Landing Pages', 'Signature Authentifiée'].includes(moduleName)) {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25';
  }
  if (['Création Vidéo (Google Flow)', 'IA Marketing', 'Connecteurs (WooCommerce, Brevo, Twilio, WhatsApp)'].includes(moduleName)) {
    return 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25';
  }
  return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25';
};

const getPlanBadgeStyle = (plan: SubscriptionPlanTier): string => {
  switch (plan) {
    case 'Enterprise VIP':
      return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10 font-black';
    case 'Pro Business':
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold';
    case 'Starter':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold';
    case 'Free':
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700 font-medium';
  }
};

// ── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────

export interface SuperAdminDashboardProps {
  initialUnlocked?: boolean;
  initialLevel?: 0 | 1 | 2 | 3;
  currentUser?: any;
  onNavigateToStudent?: () => void;
  onNavigateToInstructor?: () => void;
  onNavigateToPos?: () => void;
  onClose?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  initialUnlocked = false,
  initialLevel,
  currentUser: _currentUser,
  onNavigateToStudent,
  onNavigateToInstructor,
  onNavigateToPos,
  onClose,
}) => {
  // Navigation hiérarchique par états locaux (Niveau 0 -> 1 -> 2 -> 3)
  const [currentLevel, setCurrentLevel] = useState<0 | 1 | 2 | 3>(
    initialLevel !== undefined ? initialLevel : (initialUnlocked ? 1 : 0)
  );
  const [isUnlocked, setIsUnlocked] = useState<boolean>(
    initialUnlocked || (initialLevel !== undefined && initialLevel > 0)
  );


  // Niveau 0 : Coffre-fort Security State
  const [pinInput, setPinInput] = useState<string>('');
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'PIN' | 'PASSWORD'>('PIN');
  const [passwordInput, setPasswordInput] = useState<string>('');

  // Niveau 2 : Super CRM State
  const [crmUsers, setCrmUsers] = useState<CrmUserRecord[]>(INITIAL_CRM_USERS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModuleTags, setSelectedModuleTags] = useState<NanaModuleName[]>([]);
  const [planFilter, setPlanFilter] = useState<'ALL' | SubscriptionPlanTier>('ALL');
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [openActionDropdownUserId, setOpenActionDropdownUserId] = useState<string | null>(null);
  const [isSyncingBrevo, setIsSyncingBrevo] = useState<boolean>(false);
  const [isSyncingTwilio, setIsSyncingTwilio] = useState<boolean>(false);
  const [isSyncingWoo, setIsSyncingWoo] = useState<boolean>(false);
  const [isSyncingPostHog, setIsSyncingPostHog] = useState<boolean>(false);
  const [selectedWhatsAppUser, setSelectedWhatsAppUser] = useState<CrmUserRecord | null>(null);
  const [whatsAppTemplateId, setWhatsAppTemplateId] = useState<string>('receipt');
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState<string>('');
  const [showFunnelStudio, setShowFunnelStudio] = useState<boolean>(false);
  const [isAddingCredits, setIsAddingCredits] = useState<boolean>(false);

  // Niveau 3 : Connecteurs & Automatisation State
  const [connectors, setConnectors] = useState<ConnectorConfig[]>(INITIAL_CONNECTORS);
  const [automationLogs, setAutomationLogs] = useState<AutomationLogItem[]>(INITIAL_AUTOMATION_LOGS);
  const [pingTestingId, setPingTestingId] = useState<string | null>(null);
  const [editingConnector, setEditingConnector] = useState<ConnectorConfig | null>(null);

  // Synchronisation des clés maîtresses Twilio & Brevo depuis la configuration plateforme
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nana_sms_gateway_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        setConnectors(prev => prev.map(c => {
          if (c.id === 'twilio') {
            return {
              ...c,
              apiKey: parsed.accountSid || c.apiKey,
              apiSecret: parsed.authToken || c.apiSecret,
              fromPhoneNumber: parsed.fromPhoneNumber || c.fromPhoneNumber || '+12058492019',
              senderId: parsed.senderId || c.senderId || 'NANA_STORE',
              isPrimaryProvider: parsed.provider === 'TWILIO'
            };
          }
          if (c.id === 'brevo') {
            return {
              ...c,
              apiKey: parsed.apiKey || c.apiKey,
              senderId: parsed.senderId || c.senderId || 'NANA_STORE',
              isPrimaryProvider: parsed.provider === 'BREVO'
            };
          }
          return c;
        }));
      }

      // Synchronisation spécifique Brevo Emailing
      const brevoRaw = localStorage.getItem('nana_brevo_config');
      if (brevoRaw) {
        const brevoParsed = JSON.parse(brevoRaw);
        setConnectors(prev => prev.map(c => {
          if (c.id === 'brevo') {
            return {
              ...c,
              apiKey: brevoParsed.apiKey || c.apiKey,
              senderEmail: brevoParsed.senderEmail || c.senderEmail || 'contact@nanastore.africa',
              senderName: brevoParsed.senderName || c.senderName || 'NaNa Store Marketing',
              senderId: brevoParsed.senderId || c.senderId || 'NANA_STORE'
            };
          }
          return c;
        }));
      }
    } catch (e) {
      console.warn('Erreur lecture configurations connecteurs dans SuperAdmin:', e);
    }
  }, []);

  // Modales d'actions CRM
  const [actionModal, setActionModal] = useState<{
    type: 'EMAIL' | 'SMS' | 'UPGRADE' | 'SUSPEND';
    user: CrmUserRecord;
  } | null>(null);
  const [actionEmailSubject, setActionEmailSubject] = useState<string>('');
  const [actionEmailBody, setActionEmailBody] = useState<string>('');
  const [actionSmsText, setActionSmsText] = useState<string>('');
  const [actionUpgradePlan, setActionUpgradePlan] = useState<SubscriptionPlanTier>('Pro Business');

  // Toasts
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3600);
  };

  // Fermeture des dropdowns au clic extérieur
  useEffect(() => {
    const handleWindowClick = () => {
      setOpenActionDropdownUserId(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // ── LOGIQUE DU COFFRE-FORT (NIVEAU 0) ──────────────────────────────────────

  const validatePin = (codeToVerify: string) => {
    const validCodes = ['7777', '0007', '1234', '2026', '8888'];
    if (validCodes.includes(codeToVerify) || codeToVerify === '007') {
      playCashChime();
      setIsUnlocked(true);
      setCurrentLevel(1);
      setPinInput('');
      setPinError(null);
      triggerToast('Accès Direction Super Admin Validé • Session Déverrouillée', 'success');
    } else {
      playCancelSound();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      setPinError(`Code PIN incorrect. Tentatives restantes : ${newAttempts}`);
      setPinInput('');

      if (newAttempts <= 0) {
        triggerToast('Sécurité maximale : Terminal temporairement restreint', 'error');
        setPinError('Trop de tentatives infructueuses. Attendez 30 secondes.');
      }
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    playTapBeep();
    const newPin = pinInput + digit;
    setPinInput(newPin);
    setPinError(null);

    // Si on atteint 4 chiffres (ou code secret "007" / "7777" / "1234" / "2026")
    if (newPin.length === 4) {
      validatePin(newPin);
    }
  };

  const handleDeleteDigit = () => {
    playCancelSound();
    setPinInput(prev => prev.slice(0, -1));
    setPinError(null);
  };

  const handleClearPin = () => {
    playCancelSound();
    setPinInput('');
    setPinError(null);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin' || passwordInput === 'nana2026' || passwordInput === 'superadmin') {
      playCashChime();
      setIsUnlocked(true);
      setCurrentLevel(1);
      setPasswordInput('');
      setPinError(null);
      triggerToast('Accès Direction Super Admin Validé par Clé Maître', 'success');
    } else {
      playCancelSound();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPinError('Mot de passe secret non reconnu.');
    }
  };

  const handleLockVault = () => {
    playCancelSound();
    setIsUnlocked(false);
    setCurrentLevel(0);
    setPinInput('');
    setPasswordInput('');
    triggerToast('Coffre-fort reverrouillé. Accès sous clé.', 'info');
  };

  // ── FILTRAGE DU SUPER CRM (NIVEAU 2) ──────────────────────────────────────

  const handleToggleModuleTag = (tag: NanaModuleName) => {
    playTapBeep();
    setSelectedModuleTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearAllTags = () => {
    playTapBeep();
    setSelectedModuleTags([]);
  };

  const filteredCrmUsers = useMemo(() => {
    return crmUsers.filter(user => {
      // Recherche globale (Nom, Email, Téléphone, Pays)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = user.name.toLowerCase().includes(q);
        const matchEmail = user.email.toLowerCase().includes(q);
        const matchPhone = user.phone.includes(q);
        const matchCountry = user.country.name.toLowerCase().includes(q);
        const matchCompany = user.companyName?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchCountry && !matchCompany) {
          return false;
        }
      }

      // Filtre de plan
      if (planFilter !== 'ALL' && user.plan !== planFilter) {
        return false;
      }

      // Filtre d'activité
      if (activityFilter === 'ACTIVE' && !user.isActive) return false;
      if (activityFilter === 'INACTIVE' && user.isActive) return false;

      // Filtre avancé par Tags de modules
      if (selectedModuleTags.length > 0) {
        // L'utilisateur doit posséder TOUS les modules cochés (ou au moins un si logique OR, ici match inclusif)
        const hasMatchingModules = selectedModuleTags.every(tag =>
          user.subscribedModules.includes(tag)
        );
        if (!hasMatchingModules) return false;
      }

      return true;
    });
  }, [crmUsers, searchQuery, planFilter, activityFilter, selectedModuleTags]);

  // Actions rapides CRM
  const handleToggleUserActive = (userId: string) => {
    playTapBeep();
    setCrmUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const nextState = !u.isActive;
          triggerToast(
            `Statut de ${u.name} mis à jour : ${nextState ? 'Compte Activé' : 'Compte Suspendu'}`,
            nextState ? 'success' : 'error'
          );
          return { ...u, isActive: nextState };
        }
        return u;
      })
    );
  };

  const handleExecuteUpgrade = (userId: string, newPlan: SubscriptionPlanTier) => {
    playValidationBeep();
    setCrmUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          triggerToast(`Plan de ${u.name} surclassé avec succès vers ${newPlan} !`, 'success');
          return { ...u, plan: newPlan };
        }
        return u;
      })
    );
    setActionModal(null);
  };

  const handleSendEmailSimulation = () => {
    if (!actionModal) return;
    playValidationBeep();
    triggerToast(
      `Email transactionnel Brevo envoyé à ${actionModal.user.email} (Sujet: "${actionEmailSubject || 'Notification NaNa'}")`,
      'success'
    );
    // Injection log dans le bus
    setAutomationLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        connector: 'Brevo Marketing',
        event: 'email.direct_sent',
        status: '200_OK',
        payloadPreview: `{ to: "${actionModal.user.email}", subject: "${actionEmailSubject}" }`
      },
      ...prev
    ]);
    setActionModal(null);
    setActionEmailSubject('');
    setActionEmailBody('');
  };

  const handleSendSmsSimulation = () => {
    if (!actionModal) return;
    playValidationBeep();
    triggerToast(
      `SMS Twilio / WhatsApp routé avec succès vers ${actionModal.user.phone}`,
      'success'
    );
    setAutomationLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        connector: 'Twilio Gateway',
        event: 'sms.direct_sent',
        status: '200_OK',
        payloadPreview: `{ to: "${actionModal.user.phone}", text: "${actionSmsText.slice(0, 30)}..." }`
      },
      ...prev
    ]);
    setActionModal(null);
    setActionSmsText('');
  };

  // ── SYNCHRONISATION MARKETING AUTOMATISÉE AVEC L'API BREVO ────────────────
  const handleSyncBrevoAudience = () => {
    if (filteredCrmUsers.length === 0) {
      triggerToast('Aucun utilisateur correspondant aux filtres à exporter vers Brevo.', 'error');
      return;
    }

    playTapBeep();
    setIsSyncingBrevo(true);

    setTimeout(() => {
      playCashChime();
      setIsSyncingBrevo(false);

      // Notification demandée
      triggerToast("✅ Audience exportée vers Brevo avec succès. Campagne prête.", "success");

      // Injection dans le journal des événements d'automatisation (Niveau 3)
      setAutomationLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          connector: 'Brevo Marketing API',
          event: 'audience.segment_synced',
          status: '200_OK',
          payloadPreview: `{ syncedCount: ${filteredCrmUsers.length}, targetFilters: [${selectedModuleTags.map(t => `"${t}"`).join(', ')}], contacts: "${filteredCrmUsers.slice(0, 2).map(u => u.email).join(', ')}..." }`
        },
        ...prev
      ]);
    }, 700);
  };

  // ── SYNCHRONISATION CAMPAGNE SMS AVEC TWILIO ──────────────────────────────
  const handleSyncTwilioCampaign = () => {
    if (filteredCrmUsers.length === 0) {
      triggerToast('Aucun utilisateur correspondant aux filtres pour la campagne SMS.', 'error');
      return;
    }

    playTapBeep();
    setIsSyncingTwilio(true);

    setTimeout(() => {
      playCashChime();
      setIsSyncingTwilio(false);

      // Notification demandée
      triggerToast("✅ Audience exportée vers Twilio. Campagne SMS prête.", "success");

      // Injection journal dans le bus d'automatisation (Niveau 3)
      setAutomationLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          connector: 'Twilio SMS & WhatsApp Gateway',
          event: 'audience.sms_campaign_prepared',
          status: '200_OK',
          payloadPreview: `{ audienceSize: ${filteredCrmUsers.length}, targetPhones: "${filteredCrmUsers.slice(0, 2).map(u => u.phone).join(', ')}...", status: "sms_ready" }`
        },
        ...prev
      ]);
    }, 700);
  };

  // ── SYNCHRONISATION E-COMMERCE AVEC WOOCOMMERCE ────────────────────────────
  const handleSyncWooCommerce = () => {
    playTapBeep();
    setIsSyncingWoo(true);

    setTimeout(() => {
      playCashChime();
      setIsSyncingWoo(false);

      // Notification demandée
      triggerToast("✅ Utilisateurs et commandes synchronisés avec WooCommerce.", "success");

      // Injection journal dans le bus d'automatisation (Niveau 3)
      setAutomationLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          connector: 'WooCommerce Store Bridge',
          event: 'users.orders_synced',
          status: '200_OK',
          payloadPreview: `{ totalUsers: ${filteredCrmUsers.length}, store: "Boutique Centrale NaNa", syncMode: "full_orders_and_accounts" }`
        },
        ...prev
      ]);
    }, 700);
  };

  // ── ANALYSE COMPORTEMENTALE (POSTHOG SESSION REPLAY) ──────────────────────
  const handleOpenPostHogReplay = () => {
    if (filteredCrmUsers.length === 0) {
      triggerToast('Aucun utilisateur sélectionné pour l’analyse PostHog.', 'error');
      return;
    }

    playTapBeep();
    setIsSyncingPostHog(true);

    setTimeout(() => {
      playValidationBeep();
      setIsSyncingPostHog(false);

      // Notification demandée
      triggerToast("✅ Ouverture du Session Replay pour le segment sélectionné.", "success");

      // Injection dans le bus d'automatisation (Niveau 3)
      setAutomationLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          connector: 'PostHog Analytics API',
          event: 'session_replay.cohort_viewed',
          status: '200_OK',
          payloadPreview: `{ segmentCount: ${filteredCrmUsers.length}, targetFilters: [${selectedModuleTags.map(t => `"${t}"`).join(', ')}], sessionStream: "https://app.posthog.com/replay/live" }`
        },
        ...prev
      ]);
    }, 600);
  };

  // ── ENVOI RAPIDE DE TEMPLATE WHATSAPP BUSINESS ────────────────────────────
  const handleSendWhatsAppTemplate = () => {
    if (!selectedWhatsAppUser) return;

    playCashChime();
    const targetUser = selectedWhatsAppUser;
    triggerToast(`✅ Template WhatsApp envoyé avec succès à ${targetUser.name} (${targetUser.phone}).`, "success");

    // Injection dans le bus d'automatisation
    setAutomationLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        connector: 'Twilio WhatsApp API',
        event: 'whatsapp.template_dispatched',
        status: '200_OK',
        payloadPreview: `{ recipient: "${targetUser.phone}", templateId: "${whatsAppTemplateId}", user: "${targetUser.name}" }`
      },
      ...prev
    ]);

    setSelectedWhatsAppUser(null);
    setCustomWhatsAppMsg('');
  };

  // ── LOGIQUE DES CONNECTEURS & PING (NIVEAU 3) ──────────────────────────────

  const handleTestPingConnector = (connectorId: string) => {
    playTapBeep();
    setPingTestingId(connectorId);
    setTimeout(() => {
      playValidationBeep();
      const randomLatency = Math.floor(Math.random() * 35) + 15;
      setConnectors(prev =>
        prev.map(c => {
          if (c.id === connectorId) {
            return {
              ...c,
              lastPingMs: randomLatency,
              lastSyncTime: 'À l’instant',
              status: 'CONNECTED'
            };
          }
          return c;
        })
      );
      setPingTestingId(null);
      triggerToast(`Test Ping réussi : 200 OK (${randomLatency}ms)`, 'success');

      // Ajouter log
      setAutomationLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          connector: connectorId.toUpperCase(),
          event: 'health.ping_probe',
          status: '200_OK',
          payloadPreview: `{ latencyMs: ${randomLatency}, status: "healthy" }`
        },
        ...prev
      ]);
    }, 700);
  };

  const handleSaveConnectorConfig = (updated: ConnectorConfig) => {
    playValidationBeep();
    setConnectors(prev =>
      prev.map(c => {
        if (c.id === updated.id) return updated;
        if (updated.isPrimaryProvider && (c.id === 'twilio' || c.id === 'brevo')) {
          return { ...c, isPrimaryProvider: false };
        }
        return c;
      })
    );

    // Synchronisation directe avec la configuration télécom globale de la plateforme
    try {
      const savedRaw = localStorage.getItem('nana_sms_gateway_config');
      const currentSmsConfig = savedRaw ? JSON.parse(savedRaw) : {};

      if (updated.id === 'twilio') {
        const newSmsConfig = {
          ...currentSmsConfig,
          accountSid: updated.apiKey,
          authToken: updated.apiSecret,
          fromPhoneNumber: updated.fromPhoneNumber || currentSmsConfig.fromPhoneNumber || '+12058492019',
          senderId: updated.senderId || currentSmsConfig.senderId || 'NANA_STORE',
          ...(updated.isPrimaryProvider ? { provider: 'TWILIO' } : {})
        };
        localStorage.setItem('nana_sms_gateway_config', JSON.stringify(newSmsConfig));
      } else if (updated.id === 'brevo') {
        const newSmsConfig = {
          ...currentSmsConfig,
          apiKey: updated.apiKey,
          senderId: updated.senderId || currentSmsConfig.senderId || 'NANA_STORE',
          ...(updated.isPrimaryProvider ? { provider: 'BREVO' } : {})
        };
        localStorage.setItem('nana_sms_gateway_config', JSON.stringify(newSmsConfig));

        // Synchronisation spécifique Brevo Emailing
        const brevoEmailConfig = {
          apiKey: updated.apiKey,
          senderEmail: updated.senderEmail || 'contact@nanastore.africa',
          senderName: updated.senderName || 'NaNa Store Marketing',
          senderId: updated.senderId || 'NANA_STORE',
          endpointUrl: updated.endpointUrl || 'https://api.brevo.com/v3',
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('nana_brevo_config', JSON.stringify(brevoEmailConfig));
        window.dispatchEvent(new CustomEvent('nana_brevo_config_updated', { detail: brevoEmailConfig }));
      }
      window.dispatchEvent(new CustomEvent('nana_sms_config_updated'));
    } catch (e) {
      console.warn('Erreur sync sms config superadmin', e);
    }

    setEditingConnector(null);
    triggerToast(`Configuration "${updated.name}" sauvegardée et appliquée à la plateforme`, 'success');
  };

  // Calculs de synthèse globale
  const totalMrr = useMemo(() => {
    return crmUsers.reduce((acc, u) => acc + (u.isActive ? u.mrrContribution : 0), 0);
  }, [crmUsers]);

  const activeUsersCount = useMemo(() => {
    return crmUsers.filter(u => u.isActive).length;
  }, [crmUsers]);

  return (
    <div className="min-h-screen bg-primary text-body flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden transition-colors duration-200">
      
      {/* Toast Flottant de Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-900/30'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-rose-900/30'
                : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200 shadow-indigo-900/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BARRE DE NAVIGATION SUPÉRIEURE DIRECTION (Visible aux Niveaux 1, 2, 3) ── */}
      {isUnlocked && (
        <header className="sticky top-0 z-40 bg-secondary/90 backdrop-blur-xl border-b border-theme text-body px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => {
                playTapBeep();
                setCurrentLevel(1);
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#090d18] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black tracking-tight text-white text-sm sm:text-base">
                    L'Entreprise NaNa
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    SaaS ERP/CRM
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Direction Générale • SuperAdmin Console v3.2</span>
                </p>
              </div>
            </div>

            {/* Fil d'ariane interactif */}
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setCurrentLevel(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition font-bold ${
                  currentLevel === 1 ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Master Hub
              </button>
              <span className="text-slate-600">/</span>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setCurrentLevel(2);
                }}
                className={`px-2.5 py-1 rounded-lg transition font-bold flex items-center gap-1.5 ${
                  currentLevel === 2 ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>2. Super CRM Global</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </button>
              <span className="text-slate-600">/</span>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setCurrentLevel(3);
                }}
                className={`px-2.5 py-1 rounded-lg transition font-bold flex items-center gap-1.5 ${
                  currentLevel === 3 ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>3. Connecteurs & Automatisation</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              </button>
            </div>
          </div>

          {/* Contrôles droits */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[11px] text-slate-400">MRR :</span>
              <span className="font-black text-emerald-400">{formatCFA(totalMrr)}</span>
            </div>

            {/* Bouton Super Admin : + Ajouter 100 Crédits IA (Admin) */}
            <button
              type="button"
              disabled={isAddingCredits}
              onClick={async () => {
                const targetUid = _currentUser?.id || 'super-admin';
                playTapBeep();
                setIsAddingCredits(true);
                try {
                  const newBal = await addUserCredits(targetUid, 100, `SUPERADMIN-CRM-${Date.now().toString(36).toUpperCase()}`);
                  if (_currentUser) {
                    _currentUser.credits = newBal;
                  }
                  playCashChime();
                  alert(`🎉 100 Crédits IA ajoutés avec succès au compte Super Admin ! Nouveau solde : ${newBal} crédits.`);
                } catch (err: any) {
                  playCancelSound();
                  alert(`Erreur rechargement crédits : ${err?.message || 'Erreur inconnue'}`);
                } finally {
                  setIsAddingCredits(false);
                }
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition shadow-md shadow-amber-950/40 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Créditer mon propre compte Super Admin de 100 Crédits IA instantanément"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>+ Ajouter 100 Crédits IA (Admin)</span>
            </button>

            {/* Bouton Funnel Builder */}

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setShowFunnelStudio(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-900/30 cursor-pointer active:scale-95"
              title="Ouvrir le constructeur de pages Funnel Builder"
            >
              <span>🚀 Funnel Builder</span>
            </button>

            {/* Bouton CRM & Intégrations Silicon Valley */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setCurrentLevel(2);
              }}
              className="flex items-center gap-2 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-white px-3.5 py-1.5 rounded-md font-medium text-xs transition-all cursor-pointer shadow-lg active:scale-95"
              title="Ouvrir le Tableau de Bord CRM & Intégrations Silicon Valley"
            >
              <BarChart className="w-3.5 h-3.5 text-indigo-400" />
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070E22] hover:bg-[#0D1938] text-white border border-[#2563EB] text-xs font-bold transition shadow-sm cursor-pointer"
              title="Ouvrir Wameet Supra-App (/wameet) — Réglages & Tests Super Admin"
            >
              <WameetLogo size="xs" theme="on-dark" />
              <span>Wameet (Réglages)</span>
            </button>

            {/* Theme Switcher Multi-Thème (Dark, Pur Blanc, Pur Bleu) */}
            <ThemeSwitcher variant="dropdown" />

            {/* Bouton de reverrouillage immédiat */}

            <button
              type="button"
              onClick={handleLockVault}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Verrouiller instantanément le terminal Super Admin"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Verrouiller</span>
            </button>

            {(onClose || onNavigateToPos) && (
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  if (onClose) onClose();
                  else if (onNavigateToPos) onNavigateToPos();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black transition shadow-md shadow-indigo-900/40 cursor-pointer active:scale-95"
                title="Retourner au Master Hub Principal de la boutique"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Master Hub Principal</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                title="Quitter la console"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── CONTENEUR MULTI-NIVEAUX AVEC ANIMATIONS DE TRANSITION ─────────── */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* NIVEAU 0 : LE COFFRE-FORT (SÉCURITÉ SUPER ADMIN)                  */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {currentLevel === 0 && (
            <motion.div
              key="level-0-vault"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex items-center justify-center p-4 sm:p-6"
            >
              <div 
                className={`w-full max-w-md bg-[#0b0f19]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden transition-transform ${
                  isShaking ? 'animate-shake' : ''
                }`}
              >
                {/* Lueur d'ambiance néon */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Badge d'accréditation cyber */}
                <div className="text-center space-y-3 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 text-indigo-400 mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/10">
                    <Shield className="w-8 h-8" />
                  </div>

                  <div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Niveau 0 • Coffre-Fort
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-white mt-2 tracking-tight">
                      Direction Générale NaNa
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      Méga-Écosystème ERP / CRM Multi-Services • Accès Restreint
                    </p>
                  </div>
                </div>

                {/* Onglet Mode PIN ou Mot de passe */}
                <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 mt-6 relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setAuthMode('PIN');
                      setPinError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      authMode === 'PIN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>Pavé PIN Biométrique</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setAuthMode('PASSWORD');
                      setPinError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      authMode === 'PASSWORD' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Clé Secrète</span>
                  </button>
                </div>

                {/* Affichage des 4 bulles du PIN */}
                {authMode === 'PIN' && (
                  <div className="mt-6 space-y-6 relative z-10">
                    <div className="flex items-center justify-center gap-4">
                      {[0, 1, 2, 3].map(index => {
                        const isFilled = pinInput.length > index;
                        return (
                          <div
                            key={index}
                            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                              isFilled
                                ? 'bg-indigo-500 border-indigo-400 shadow-md shadow-indigo-500/50 scale-110'
                                : 'bg-slate-900 border-slate-700'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {pinError && (
                      <p className="text-center text-xs font-bold text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40">
                        {pinError}
                      </p>
                    )}

                    {/* Pavé Numérique */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handlePinDigit(num)}
                          className="h-13 sm:h-14 rounded-2xl bg-slate-900/80 hover:bg-indigo-600/20 active:bg-indigo-600/40 border border-slate-800/90 hover:border-indigo-500/50 text-white font-black text-lg transition flex items-center justify-center cursor-pointer shadow-sm hover:shadow-indigo-500/10"
                        >
                          {num}
                        </button>
                      ))}

                      {/* Touche Effacer */}
                      <button
                        type="button"
                        onClick={handleClearPin}
                        className="h-13 sm:h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs transition flex items-center justify-center cursor-pointer"
                      >
                        EFFACER
                      </button>

                      {/* Touche 0 */}
                      <button
                        type="button"
                        onClick={() => handlePinDigit('0')}
                        className="h-13 sm:h-14 rounded-2xl bg-slate-900/80 hover:bg-indigo-600/20 active:bg-indigo-600/40 border border-slate-800/90 hover:border-indigo-500/50 text-white font-black text-lg transition flex items-center justify-center cursor-pointer shadow-sm"
                      >
                        0
                      </button>

                      {/* Touche Retour Arrière */}
                      <button
                        type="button"
                        onClick={handleDeleteDigit}
                        className="h-13 sm:h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 font-bold text-xs transition flex items-center justify-center cursor-pointer"
                      >
                        <Delete className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Raccourci Déverrouillage Rapide SuperAdmin pour test direct */}
                    <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Code maître démo : <strong className="text-indigo-400 font-mono">7777</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          validatePin('7777');
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                      >
                        ⚡ Bypass Immédiat
                      </button>
                    </div>
                  </div>
                )}

                {/* Saisie par Clé Secrète */}
                {authMode === 'PASSWORD' && (
                  <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4 relative z-10">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Mot de passe administrateur principal
                      </label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                        autoFocus
                      />
                    </div>

                    {pinError && (
                      <p className="text-center text-xs font-bold text-rose-400 bg-rose-950/40 p-2 rounded-xl border border-rose-800/40">
                        {pinError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Déverrouiller le Hub</span>
                    </button>

                    <p className="text-center text-[11px] text-slate-500">
                      Clé par défaut : <span className="font-mono text-slate-400">admin</span> ou <span className="font-mono text-slate-400">nana2026</span>
                    </p>
                  </form>
                )}

                {(onClose || onNavigateToPos) && (
                  <div className="pt-4 text-center border-t border-slate-800/80 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (onClose) onClose();
                        else if (onNavigateToPos) onNavigateToPos();
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Retourner au Master Hub de la boutique</span>
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* NIVEAU 1 : LE MASTER HUB (VUE D'ACCUEIL SEGMENTÉE)                */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {currentLevel === 1 && (
            <motion.div
              key="level-1-master-hub"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-8"
            >
              
              {/* 🌟 CARTE VISUELLEMENT DOMINANTE : SUPER CRM GLOBAL 🌟 */}
              <div className="relative rounded-3xl p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-2xl shadow-indigo-500/10 group">
                <div className="bg-[#0b0f19] rounded-[22px] p-6 sm:p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-3 max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-black">
                        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                        <span>Centre Névralgique d’Exploitation • Hub CRM v3.2</span>
                      </div>
                      
                      <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        <span>Super CRM Global</span>
                        <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                      </h2>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Datatable analytique unifiée pour le méga-écosystème NaNa : filtrage instantané 
                        parmi les <strong>14 modules souscrits</strong>, audit en temps réel des comptes clients 
                        et déclenchement d'actions d'automatisation (Brevo, Twilio SMS, Surclassement).
                      </p>

                      {/* Métriques Clés en Bandeau */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Utilisateurs Réseau</p>
                          <p className="text-lg sm:text-xl font-black text-white mt-0.5">{crmUsers.length.toLocaleString()}</p>
                          <span className="text-[10px] text-emerald-400 font-bold">{activeUsersCount} Actifs</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modules Pilotés</p>
                          <p className="text-lg sm:text-xl font-black text-indigo-300 mt-0.5">14 Services</p>
                          <span className="text-[10px] text-slate-400 font-semibold">5 Pôles d'activités</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Volume MRR Global</p>
                          <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">{formatCFA(totalMrr)}</p>
                          <span className="text-[10px] text-emerald-300 font-semibold">+18.4% ce mois</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connecteurs API</p>
                          <p className="text-lg sm:text-xl font-black text-purple-300 mt-0.5">4 Canaux</p>
                          <span className="text-[10px] text-emerald-400 font-semibold">100% Opérationnels</span>
                        </div>
                      </div>
                    </div>

                    {/* Bouton d'action proéminent vers Niveau 2 */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          playValidationBeep();
                          setCurrentLevel(2);
                        }}
                        className="px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-sm tracking-wide transition-all duration-300 shadow-xl shadow-indigo-600/30 hover:scale-[1.02] flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <Database className="w-5 h-5" />
                        <span>Ouvrir la Datatable CRM →</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setCurrentLevel(3);
                        }}
                        className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Workflow className="w-4 h-4 text-purple-400" />
                        <span>Workspace Connecteurs</span>
                      </button>

                      {(onClose || onNavigateToPos) && (
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            if (onClose) onClose();
                            else if (onNavigateToPos) onNavigateToPos();
                          }}
                          className="px-5 py-3 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/50 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Home className="w-4 h-4 text-indigo-400" />
                          <span>Master Hub Principal (/dashboard)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── LES 5 PÔLES D'ACTIVITÉS EN PANORAMIQUE ──────────────────── */}
              <div className="space-y-8">

                {/* 1. PÔLE ÉDUCATION */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-400">
                    <GraduationCap className="w-4 h-4" />
                    <span>1. Pôle Éducation & Académie Numérique</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Espace Étudiants */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        if (onNavigateToStudent) {
                          onNavigateToStudent();
                        } else if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', '/classroom/telecom-fintech-masterclass');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-blue-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-blue-300 transition">
                            Espace Étudiants
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            Campus Virtuel, lecteur vidéo épuré White-Label, Arène Vocale IA et attestations vérifiées.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-blue-400">
                        <span>Accéder à la vue</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Espace Professeurs */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        if (onNavigateToInstructor) {
                          onNavigateToInstructor();
                        } else if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', '/instructor');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-blue-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-blue-300 transition">
                            Espace Professeurs
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            Course Forge Canvas, correction des devoirs en attente, notation vocale et roster enseignant.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-blue-400">
                        <span>Accéder au studio</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Live/Webinaires */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        triggerToast('Lancement du Module Live / Visioconférence Daily.co', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-blue-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-blue-300 transition">
                            Live / Webinaires
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            Salles virtuelles interactives, diffusion masterclass, webinaires automatisés et replay sécurisé.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-blue-400">
                        <span>Gérer les salons</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                  </div>
                </section>

                {/* 2. PÔLE BUSINESS & E-COMMERCE */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400">
                    <ShoppingBag className="w-4 h-4" />
                    <span>2. Pôle Business, Caisse & E-Commerce</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Caisse */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        if (onNavigateToPos) onNavigateToPos();
                        else triggerToast('Accès à la Caisse Tactile Omni-Canal NaNa POS', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-emerald-300 transition">Caisse</h4>
                          <p className="text-xs text-slate-400 mt-1">Terminal POS tactile, QR Code Mobile Money et tickets thermiques.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-2 text-[11px] font-bold text-emerald-400 flex items-center justify-between">
                        <span>Ouvrir la caisse</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                    {/* Vitrine */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        triggerToast('Accès au Constructeur de Vitrine / Storefront', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-emerald-300 transition">Vitrine</h4>
                          <p className="text-xs text-slate-400 mt-1">Storefront builder visuel sans code et catalogues multimarques.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-2 text-[11px] font-bold text-emerald-400 flex items-center justify-between">
                        <span>Gérer la vitrine</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                    {/* Bons & Commandes */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        triggerToast('Accès aux Bons de Commande & Expéditions', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-emerald-300 transition">Bons & Commandes</h4>
                          <p className="text-xs text-slate-400 mt-1">Génération des bordereaux, livraisons WhatsApp et stocks.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-2 text-[11px] font-bold text-emerald-400 flex items-center justify-between">
                        <span>Suivi commandes</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                    {/* Devis & Projets */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        triggerToast('Accès à l’Escrow Tripartite & Devis Sécurisés', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-emerald-300 transition">Devis & Projets</h4>
                          <p className="text-xs text-slate-400 mt-1">Escrow tripartite sécurisé, déblocage des jalons financiers.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-2 text-[11px] font-bold text-emerald-400 flex items-center justify-between">
                        <span>Accéder aux devis</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                  </div>
                </section>

                {/* 3. PÔLE PRODUCTIVITÉ & OUTILS */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
                    <FileCheck className="w-4 h-4" />
                    <span>3. Pôle Productivité & Outils Certifiés</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* CV Pro */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        triggerToast('Générateur de CV Professionnel NaNa', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-amber-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition">CV Pro</h4>
                          <p className="text-xs text-slate-400 mt-1">Création de CV certifié conforme aux standards UEMOA et export PDF haute résolution.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-bold text-amber-400 flex items-center justify-between">
                        <span>Ouvrir l'éditeur</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                    {/* Générateur Landing Pages */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        setShowFunnelStudio(true);
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-amber-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition">Générateur Landing Pages</h4>
                          <p className="text-xs text-slate-400 mt-1">Tunnels de conversion ultra-rapides, intégration pixels Facebook et checkout direct.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-bold text-amber-400 flex items-center justify-between">
                        <span>Créer un funnel</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                    {/* Signature Authentifiée */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        triggerToast('DocuSign Hub • Contrats & Signatures OHADA', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-amber-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <PenTool className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition">Signature Authentifiée</h4>
                          <p className="text-xs text-slate-400 mt-1">DocuSign Hub intégré, paraphe cryptographique et traçabilité juridique OHADA.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-bold text-amber-400 flex items-center justify-between">
                        <span>Consulter les actes</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                  </div>
                </section>

                {/* 4. PÔLE IA & AUTOMATISATION */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-400">
                    <Bot className="w-4 h-4" />
                    <span>4. Pôle IA & Automatisation Avancée</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Création Vidéo (Google Flow) */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        triggerToast('Atelier Vidéo IA Google Flow NaNa', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-purple-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-purple-300 transition">Création Vidéo (Google Flow)</h4>
                          <p className="text-xs text-slate-400 mt-1">Génération de capsules vidéo assistée par IA, sous-titrage automatique et bannières dynamiques.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-bold text-purple-400 flex items-center justify-between">
                        <span>Studio vidéo IA</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                    {/* IA Marketing */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        triggerToast('Assistant IA Marketing & Copywriting Viraux', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-purple-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-purple-300 transition">IA Marketing</h4>
                          <p className="text-xs text-slate-400 mt-1">Rédaction de messages promotionnels WhatsApp, accroches publicitaires et relances ciblées.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-bold text-purple-400 flex items-center justify-between">
                        <span>Lancer l’IA</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                    {/* Connecteurs (WooCommerce, Brevo, Twilio, WhatsApp) -> CLIC OUVRE NIVEAU 3 */}
                    <div 
                      onClick={() => {
                        playValidationBeep();
                        setCurrentLevel(3);
                      }}
                      className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 to-[#0b0f19] border border-purple-500/50 hover:border-purple-400 transition-all duration-200 hover:-translate-y-1.5 cursor-pointer group shadow-lg shadow-purple-950/20 flex flex-col justify-between ring-1 ring-purple-500/20"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Workflow className="w-5 h-5" />
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                            Niveau 3 Direct
                          </span>
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-purple-200 transition">
                            Connecteurs (WooCommerce, Brevo, Twilio, WhatsApp)
                          </h4>
                          <p className="text-xs text-slate-300 mt-1">
                            Passerelles API unifiées, Webhooks en temps réel et orchestration des flux de données.
                          </p>
                        </div>
                      </div>
                      <span className="mt-4 pt-3 border-t border-purple-900/40 text-[11px] font-black text-purple-300 flex items-center justify-between">
                        <span>Ouvrir le Workspace Connecteurs →</span>
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </div>

                  </div>
                </section>

                {/* 5. PÔLE RÉSEAU */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-400">
                    <Share2 className="w-4 h-4" />
                    <span>5. Pôle Réseau & Expansion B2B</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Partenariats */}
                    <div 
                      onClick={() => {
                        playTapBeep();
                        triggerToast('Module Partenariats & Réseau d’Affiliés NaNa', 'info');
                      }}
                      className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 hover:-translate-y-1 cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Share2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white group-hover:text-cyan-300 transition">Partenariats</h4>
                          <p className="text-xs text-slate-400 mt-1">Gestion du réseau d'apporteurs d’affaires, commissions d’affiliation et contrats inter-entreprises.</p>
                        </div>
                      </div>
                      <span className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-bold text-cyan-400 flex items-center justify-between">
                        <span>Gérer les partenariats</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>

                  </div>
                </section>

              </div>

            </motion.div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* NIVEAU 2 : LE SUPER CRM GLOBAL (DATATABLE BIG DATA)               */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {currentLevel === 2 && (
            <motion.div
              key="level-2-super-crm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6"
            >
              
              {/* Barre supérieure avec bouton Retour */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  {(onClose || onNavigateToPos) && (
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (onClose) onClose();
                        else if (onNavigateToPos) onNavigateToPos();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black transition flex items-center gap-2 cursor-pointer border border-indigo-400/40 shadow-md shadow-indigo-900/30 active:scale-95"
                      title="Retourner directement au Master Hub de la Boutique (/dashboard)"
                    >
                      <Home className="w-4 h-4" />
                      <span>Master Hub Principal</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setCurrentLevel(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700 shadow-sm"
                    title="Ouvrir la Console SuperAdmin d'exploitation"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Console SuperAdmin</span>
                  </button>

                  <div className="h-5 w-px bg-slate-800 hidden sm:block" />

                  <div>
                    <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-indigo-400" />
                      <span>Super CRM Datatable Multi-Services</span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Vue 360° des comptes utilisateurs, abonnements et modules souscrits
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">
                    {filteredCrmUsers.length} résultat{filteredCrmUsers.length > 1 ? 's' : ''} sur {crmUsers.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playValidationBeep();
                      triggerToast('Données CRM synchronisées avec le Cloud Firestore', 'success');
                    }}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                    title="Actualiser la liste"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── BARRE DE FILTRES AVANCÉS : TAGS PAR MODULES CITÉS AU NIVEAU 1 ── */}
              <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                    <Filter className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Filtres Avancés par Modules Souscrits :</span>
                  </div>

                  {selectedModuleTags.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllTags}
                      className="text-[11px] font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Effacer les filtres ({selectedModuleTags.length})
                    </button>
                  )}
                </div>

                {/* Badges de Tags cliquables reprenant les 14 modules exacts */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {NANA_ALL_MODULES.map(moduleName => {
                    const isSelected = selectedModuleTags.includes(moduleName);
                    return (
                      <button
                        key={moduleName}
                        type="button"
                        onClick={() => handleToggleModuleTag(moduleName)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-950/70 text-slate-400 border-slate-800/90 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span>{moduleName}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>

                {/* Filtres secondaires : Recherche texte, Plan, Activité */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* Champ de recherche */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un client par nom, email, téléphone, entreprise, pays..."
                      className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filtre Plan */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 hidden sm:inline">Plan :</span>
                    <select
                      value={planFilter}
                      onChange={e => {
                        playTapBeep();
                        setPlanFilter(e.target.value as any);
                      }}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                    >
                      <option value="ALL">Tous les plans</option>
                      <option value="Free">Free</option>
                      <option value="Starter">Starter</option>
                      <option value="Pro Business">Pro Business</option>
                      <option value="Enterprise VIP">Enterprise VIP</option>
                    </select>

                    {/* Filtre Activité */}
                    <select
                      value={activityFilter}
                      onChange={e => {
                        playTapBeep();
                        setActivityFilter(e.target.value as any);
                      }}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                    >
                      <option value="ALL">Tous les statuts</option>
                      <option value="ACTIVE">Actif uniquement</option>
                      <option value="INACTIVE">Inactif uniquement</option>
                    </select>

                    {/* ⚡ GROUPE D'ACTIONS AUTOMATISATIONS MARKETING & E-COMMERCE (ACTION GROUP) */}
                    <div className="flex flex-wrap items-center bg-slate-950/90 p-1 rounded-2xl border border-slate-800 shadow-xl gap-1">
                      
                      {/* 1. Bouton "Synchroniser l'audience Brevo" */}
                      <button
                        type="button"
                        onClick={handleSyncBrevoAudience}
                        disabled={isSyncingBrevo || filteredCrmUsers.length === 0}
                        className="group relative overflow-hidden px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-teal-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-teal-500/40 shrink-0"
                        title={`Exporter les ${filteredCrmUsers.length} utilisateurs visibles vers l'API Brevo`}
                      >
                        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        {isSyncingBrevo ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <Megaphone className="w-3.5 h-3.5 text-teal-200 group-hover:scale-110 group-hover:rotate-12 transition-transform" />
                        )}
                        <span>Audience Brevo</span>
                        <span className="px-1.5 py-0.2 rounded bg-black/40 border border-teal-300/30 text-[10px] font-mono font-bold text-teal-200">
                          {filteredCrmUsers.length}
                        </span>
                      </button>

                      {/* 2. Bouton "Campagne SMS (Twilio)" */}
                      <button
                        type="button"
                        onClick={handleSyncTwilioCampaign}
                        disabled={isSyncingTwilio || filteredCrmUsers.length === 0}
                        className="group relative overflow-hidden px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white text-xs font-bold transition-all duration-200 border border-slate-800 hover:border-indigo-500/40 shadow-sm hover:shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        title={`Exporter les ${filteredCrmUsers.length} utilisateurs vers Twilio SMS`}
                      >
                        <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        {isSyncingTwilio ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                        )}
                        <span>Campagne SMS (Twilio)</span>
                      </button>

                      {/* 3. Bouton "Sync WooCommerce" */}
                      <button
                        type="button"
                        onClick={handleSyncWooCommerce}
                        disabled={isSyncingWoo}
                        className="group relative overflow-hidden px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white text-xs font-bold transition-all duration-200 border border-slate-800 hover:border-pink-500/40 shadow-sm hover:shadow-pink-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        title="Synchroniser utilisateurs et commandes avec WooCommerce"
                      >
                        <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        {isSyncingWoo ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
                        ) : (
                          <ShoppingCart className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
                        )}
                        <span>Sync WooCommerce</span>
                      </button>

                      {/* 4. Bouton "Analyse Comportementale (PostHog)" */}
                      <button
                        type="button"
                        onClick={handleOpenPostHogReplay}
                        disabled={isSyncingPostHog || filteredCrmUsers.length === 0}
                        className="group relative overflow-hidden px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white text-xs font-bold transition-all duration-200 border border-slate-800 hover:border-amber-500/40 shadow-sm hover:shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        title={`Lancer le Session Replay PostHog pour les ${filteredCrmUsers.length} utilisateurs`}
                      >
                        <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        {isSyncingPostHog ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        ) : (
                          <Activity className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                        )}
                        <span>Analyse Comportementale (PostHog)</span>
                      </button>

                    </div>
                  </div>
                </div>
              </div>

              {/* ── TABLEAU DE DONNÉES (DATATABLE) ─────────────────────────── */}
              <div className="rounded-2xl bg-[#0b0f19] border border-slate-800 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-4 px-4 font-bold">Nom & Prénom</th>
                        <th className="py-4 px-4 font-bold text-center">Pays</th>
                        <th className="py-4 px-4 font-bold">Email & Numéro</th>
                        <th className="py-4 px-4 font-bold text-center">WhatsApp</th>
                        <th className="py-4 px-4 font-bold">Modules souscrits</th>
                        <th className="py-4 px-4 font-bold">Inscription</th>
                        <th className="py-4 px-4 font-bold text-center">Plan</th>
                        <th className="py-4 px-4 font-bold text-center">Activité</th>
                        <th className="py-4 px-4 font-bold text-right">Actions Rapides</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredCrmUsers.length > 0 ? (
                        filteredCrmUsers.map(user => (
                          <tr key={user.id} className="hover:bg-slate-900/60 transition group">
                            
                            {/* Nom & Prénom & Entreprise */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-black text-white text-xs truncate">
                                    {user.name}
                                  </p>
                                  {user.companyName && (
                                    <p className="text-[10px] text-indigo-400 font-semibold truncate">
                                      {user.companyName}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Pays */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-200">
                                <span>{user.country.flag}</span>
                                <span>{user.country.code}</span>
                              </span>
                            </td>

                            {/* Email & Numéro */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-200 font-mono">
                                  <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                                  <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>{user.phone}</span>
                                </div>
                              </div>
                            </td>

                            {/* WhatsApp Business (Communication Directe) */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {user.isWhatsAppVerified ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playTapBeep();
                                    setSelectedWhatsAppUser(user);
                                  }}
                                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer shadow-sm hover:scale-105"
                                  title="Numéro validé pour l'API WhatsApp • Cliquer pour envoyer un template"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-emerald-400/20 text-emerald-400 group-hover:scale-110 transition-transform" />
                                  <span>Actif</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playTapBeep();
                                    setSelectedWhatsAppUser(user);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                                  title="Numéro inactif ou non validé pour WhatsApp • Cliquer pour configurer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Inactif</span>
                                </button>
                              )}
                            </td>

                            {/* Modules souscrits (Tags colorés) */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {user.subscribedModules.map(mod => (
                                  <span
                                    key={mod}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${getModuleBadgeColor(mod)}`}
                                  >
                                    {mod}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Date d'inscription */}
                            <td className="py-3.5 px-4 font-medium text-[11px] text-slate-400 whitespace-nowrap">
                              {user.registrationDate}
                            </td>

                            {/* Statut d'abonnement (Plan) */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] border ${getPlanBadgeStyle(user.plan)}`}>
                                {user.plan}
                              </span>
                            </td>

                            {/* Activité (Actif / Inactif) */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                  user.isActive
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                                <span>{user.isActive ? 'Actif' : 'Inactif'}</span>
                              </span>
                            </td>

                            {/* Actions Rapides (Menu Déroulant Contextuel) */}
                            <td className="py-3.5 px-4 text-right relative">
                              <div className="inline-block text-left" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    playTapBeep();
                                    setOpenActionDropdownUserId(
                                      openActionDropdownUserId === user.id ? null : user.id
                                    );
                                  }}
                                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer"
                                  title="Actions rapides"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* Dropdown menu */}
                                {openActionDropdownUserId === user.id && (
                                  <div className="absolute right-4 top-12 z-30 w-52 rounded-2xl bg-[#0e1424] border border-slate-700 shadow-2xl p-1.5 space-y-1 text-left animate-fadeIn">
                                    
                                    {/* Envoyer Email */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playTapBeep();
                                        setOpenActionDropdownUserId(null);
                                        setActionModal({ type: 'EMAIL', user });
                                      }}
                                      className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-indigo-600 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>Envoyer Email Brevo</span>
                                    </button>

                                    {/* Envoyer SMS */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playTapBeep();
                                        setOpenActionDropdownUserId(null);
                                        setActionModal({ type: 'SMS', user });
                                      }}
                                      className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-indigo-600 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Envoyer SMS Twilio</span>
                                    </button>

                                    {/* Upgrader */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playTapBeep();
                                        setOpenActionDropdownUserId(null);
                                        setActionModal({ type: 'UPGRADE', user });
                                      }}
                                      className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-indigo-600 hover:text-white transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Upgrader le Plan</span>
                                    </button>

                                    <div className="h-px bg-slate-800 my-1" />

                                    {/* Suspendre / Activer */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionDropdownUserId(null);
                                        handleToggleUserActive(user.id);
                                      }}
                                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                                        user.isActive
                                          ? 'text-rose-400 hover:bg-rose-950/60 hover:text-rose-200'
                                          : 'text-emerald-400 hover:bg-emerald-950/60 hover:text-emerald-200'
                                      }`}
                                    >
                                      {user.isActive ? (
                                        <>
                                          <UserX className="w-3.5 h-3.5" />
                                          <span>Suspendre l'accès</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5" />
                                          <span>Réactiver le compte</span>
                                        </>
                                      )}
                                    </button>

                                  </div>
                                )}
                              </div>
                            </td>

                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                            Aucun utilisateur ne correspond aux filtres de modules ou de recherche sélectionnés.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* NIVEAU 3 : LE WORKSPACE AUTOMATISATION (CONNECTEURS)              */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {currentLevel === 3 && (
            <motion.div
              key="level-3-automation"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6"
            >
              
              {/* Barre de contrôle Niveau 3 */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  {(onClose || onNavigateToPos) && (
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (onClose) onClose();
                        else if (onNavigateToPos) onNavigateToPos();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black transition flex items-center gap-2 cursor-pointer border border-indigo-400/40 shadow-md shadow-indigo-900/30 active:scale-95"
                      title="Retourner directement au Master Hub de la Boutique (/dashboard)"
                    >
                      <Home className="w-4 h-4" />
                      <span>Master Hub Principal</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setCurrentLevel(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700 shadow-sm"
                    title="Ouvrir la Console SuperAdmin d'exploitation"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Console SuperAdmin</span>
                  </button>

                  <div className="h-5 w-px bg-slate-800 hidden sm:block" />

                  <div>
                    <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                      <Workflow className="w-5 h-5 text-purple-400" />
                      <span>Workspace Automatisation & Connecteurs API</span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Orchestration en temps réel : WooCommerce, Twilio SMS/WhatsApp, Brevo et Webhooks HMAC
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playValidationBeep();
                    triggerToast('Ping global déclenché sur l’ensemble des connecteurs...', 'info');
                    connectors.forEach(c => handleTestPingConnector(c.id));
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tester Tous les Connecteurs</span>
                </button>
              </div>

              {/* ── GRILLE DES 4 CONNECTEURS MAJEURS ───────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {connectors.map(connector => (
                  <div
                    key={connector.id}
                    className="rounded-3xl bg-[#0b0f19] border border-slate-800 hover:border-slate-700 p-6 space-y-5 transition-all shadow-xl relative overflow-hidden"
                  >
                    {/* Header de la carte */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                          {connector.id === 'woocommerce' && <ShoppingBag className="w-6 h-6" />}
                          {connector.id === 'twilio' && <MessageSquare className="w-6 h-6" />}
                          {connector.id === 'brevo' && <Mail className="w-6 h-6" />}
                          {connector.id === 'webhooks' && <Workflow className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-white text-base">{connector.name}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-800">
                              {connector.category}
                            </span>
                            {connector.isPrimaryProvider && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                SMS Passerelle Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{connector.description}</p>
                        </div>
                      </div>

                      {/* Statut Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{connector.status}</span>
                      </span>
                    </div>

                    {/* Métadonnées & Latence */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Endpoint :</span>
                        <span className="font-mono text-[11px] text-slate-300 truncate max-w-[240px]">
                          {connector.endpointUrl}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Clé API masquée :</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {connector.apiKey.slice(0, 8)}••••••••••••{connector.apiKey.slice(-4)}
                        </span>
                      </div>
                      {connector.senderId && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Sender ID :</span>
                          <span className="font-mono text-[11px] text-amber-400 font-bold">
                            {connector.senderId}
                          </span>
                        </div>
                      )}
                      {connector.senderEmail && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Email Expéditeur :</span>
                          <span className="font-mono text-[11px] text-emerald-400 font-bold">
                            {connector.senderEmail}
                          </span>
                        </div>
                      )}
                      {connector.senderName && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Nom Expéditeur :</span>
                          <span className="font-mono text-[11px] text-purple-300 font-bold">
                            {connector.senderName}
                          </span>
                        </div>
                      )}
                      {connector.fromPhoneNumber && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Numéro Expéditeur :</span>
                          <span className="font-mono text-[11px] text-cyan-400 font-bold">
                            {connector.fromPhoneNumber}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                        <span className="text-slate-400">Latence constatée :</span>
                        <span className="font-mono text-emerald-400 font-black">
                          {connector.lastPingMs ? `${connector.lastPingMs} ms` : 'Non testé'}
                        </span>
                      </div>
                    </div>

                    {/* Déclencheurs / Événements abonnés */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                        Événements Abonnés en Temps Réel :
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {connector.activeEvents.map(evt => (
                          <span
                            key={evt}
                            className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300"
                          >
                            {evt}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Boutons d'action */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleTestPingConnector(connector.id)}
                        disabled={pingTestingId === connector.id}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${pingTestingId === connector.id ? 'animate-spin' : ''}`} />
                        <span>{pingTestingId === connector.id ? 'Test en cours...' : 'Tester le Ping'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setEditingConnector(connector);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Configurer</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              {/* ── LIVE EVENT LOG STREAM (CONSOLE TERMINAL EN TEMPS RÉEL) ──── */}
              <div className="rounded-3xl bg-[#070b14] border border-slate-800 p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-black text-white text-xs uppercase tracking-wider">
                      Flux des Événements d'Automatisation (Live Stream)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>SOCKET ACTIF</span>
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-[11px]">
                  {automationLogs.map(log => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between gap-3 text-slate-300 hover:bg-slate-900 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-slate-500">{log.timestamp}</span>
                        <span className="font-bold text-indigo-400 truncate">{log.connector}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px]">{log.event}</span>
                        <span className="text-slate-400 truncate hidden md:inline">{log.payloadPreview}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── MODALE D'ACTION RAPIDE CRM (EMAIL / SMS / UPGRADE) ─────────────── */}
      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="w-full max-w-lg bg-[#0b0f19] border border-slate-700 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    {actionModal.type === 'EMAIL' && <Mail className="w-5 h-5" />}
                    {actionModal.type === 'SMS' && <Phone className="w-5 h-5" />}
                    {actionModal.type === 'UPGRADE' && <Crown className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">
                      {actionModal.type === 'EMAIL' && 'Envoyer un Email Brevo'}
                      {actionModal.type === 'SMS' && 'Envoyer un SMS Twilio / WhatsApp'}
                      {actionModal.type === 'UPGRADE' && 'Surclasser l’Abonnement'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Destinataire : <strong className="text-slate-200">{actionModal.user.name}</strong> ({actionModal.user.email})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulaire selon l'action */}
              {actionModal.type === 'EMAIL' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Objet de l'email</label>
                    <input
                      type="text"
                      value={actionEmailSubject}
                      onChange={e => setActionEmailSubject(e.target.value)}
                      placeholder="Mise à jour importante de votre compte NaNa Enterprise"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Corps du message (HTML/Texte)</label>
                    <textarea
                      rows={4}
                      value={actionEmailBody}
                      onChange={e => setActionEmailBody(e.target.value)}
                      placeholder="Bonjour Amadou, nous avons le plaisir de vous informer..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActionModal(null)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSendEmailSimulation}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Déclencher l'envoi</span>
                    </button>
                  </div>
                </div>
              )}

              {actionModal.type === 'SMS' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Numéro vérifié</label>
                    <p className="font-mono text-slate-300 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                      {actionModal.user.phone}
                    </p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Message SMS / WhatsApp</label>
                    <textarea
                      rows={3}
                      value={actionSmsText}
                      onChange={e => setActionSmsText(e.target.value)}
                      placeholder="Votre commande NaNa Caisse #1042 a été validée..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActionModal(null)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSendSmsSimulation}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Envoyer SMS</span>
                    </button>
                  </div>
                </div>
              )}

              {actionModal.type === 'UPGRADE' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-2">Sélectionner le nouveau plan :</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Free', 'Starter', 'Pro Business', 'Enterprise VIP'] as SubscriptionPlanTier[]).map(plan => (
                        <button
                          key={plan}
                          type="button"
                          onClick={() => setActionUpgradePlan(plan)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            actionUpgradePlan === plan
                              ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <p className="font-black text-xs">{plan}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {plan === 'Free' ? '0 FCFA' : plan === 'Starter' ? '35 000 FCFA/mois' : plan === 'Pro Business' ? '75 000 FCFA/mois' : '150 000 FCFA/mois'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActionModal(null)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteUpgrade(actionModal.user.id, actionUpgradePlan)}
                      className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black flex items-center gap-1.5 shadow-lg shadow-amber-600/30"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Appliquer l'Upgrade</span>
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE DE CONFIGURATION CONNECTEUR API ─────────────────────────── */}
      <AnimatePresence>
        {editingConnector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              className="w-full max-w-lg bg-[#0b0f19] border border-slate-700 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-400" />
                  <span>Configuration : {editingConnector.name}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingConnector(null)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">URL Endpoint API</label>
                  <input
                    type="text"
                    value={editingConnector.endpointUrl}
                    onChange={e =>
                      setEditingConnector({ ...editingConnector, endpointUrl: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {editingConnector.id === 'twilio'
                      ? 'Account SID Twilio (Clé API)'
                      : editingConnector.id === 'brevo'
                      ? 'Clé API Brevo v3 (xkeysib-...)'
                      : 'Clé API (Consumer Key / Account SID)'}
                  </label>
                  <input
                    type="text"
                    value={editingConnector.apiKey}
                    onChange={e =>
                      setEditingConnector({ ...editingConnector, apiKey: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>

                {editingConnector.apiSecret !== undefined && (
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {editingConnector.id === 'twilio' ? 'Auth Token Twilio (Secret Token)' : 'Secret API (Consumer Secret / Token)'}
                    </label>
                    <input
                      type="password"
                      value={editingConnector.apiSecret}
                      onChange={e =>
                        setEditingConnector({ ...editingConnector, apiSecret: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>
                )}

                {/* Paramètres Télécom spécifiques (Brevo & Twilio) */}
                {(editingConnector.id === 'twilio' || editingConnector.id === 'brevo') && (
                  <>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Sender ID (Expéditeur Alphanumérique)</label>
                      <input
                        type="text"
                        placeholder="Ex: NANA_STORE ou NOM_BOUTIQUE"
                        value={editingConnector.senderId || ''}
                        onChange={e =>
                          setEditingConnector({ ...editingConnector, senderId: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                      />
                    </div>
                    {editingConnector.id === 'twilio' && (
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Numéro Twilio Expéditeur (From Phone / E.164)</label>
                        <input
                          type="text"
                          placeholder="Ex: +12058492019"
                          value={editingConnector.fromPhoneNumber || ''}
                          onChange={e =>
                            setEditingConnector({ ...editingConnector, fromPhoneNumber: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                        />
                      </div>
                    )}
                    {editingConnector.id === 'brevo' && (
                      <>
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">Email Expéditeur Certifié Brevo (Sender Email)</label>
                          <input
                            type="email"
                            placeholder="Ex: contact@nanastore.africa ou newsletter@maboutique.com"
                            value={editingConnector.senderEmail || ''}
                            onChange={e =>
                              setEditingConnector({ ...editingConnector, senderEmail: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Adresse expéditrice authentifiée dans Brevo (DKIM/SPF) pour les campagnes emailing.</p>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">Nom d'Expéditeur Email (Sender Display Name)</label>
                          <input
                            type="text"
                            placeholder="Ex: NaNa Store Marketing ou Ma Boutique Pro"
                            value={editingConnector.senderName || ''}
                            onChange={e =>
                              setEditingConnector({ ...editingConnector, senderName: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                          />
                        </div>
                      </>
                    )}
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={!!editingConnector.isPrimaryProvider}
                        onChange={e =>
                          setEditingConnector({ ...editingConnector, isPrimaryProvider: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                      />
                      <div>
                        <div className="font-bold text-white text-xs">Définir comme Passerelle SMS Active Principale</div>
                        <div className="text-[11px] text-slate-400">Règle ce fournisseur comme passerelle SMS par défaut pour tous les marchands</div>
                      </div>
                    </label>
                  </>
                )}

                {editingConnector.webhookSecret !== undefined && (
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Secret HMAC Signature Webhook</label>
                    <input
                      type="text"
                      value={editingConnector.webhookSecret}
                      onChange={e =>
                        setEditingConnector({ ...editingConnector, webhookSecret: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingConnector(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveConnectorConfig(editingConnector)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-600/30"
                  >
                    Enregistrer les Paramètres
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE RAPIDE WHATSAPP BUSINESS (COMMUNICATION DIRECTE) ────────── */}
      <AnimatePresence>
        {selectedWhatsAppUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              className="w-full max-w-lg bg-[#0b0f19] border border-emerald-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl shadow-emerald-950/30 relative"
            >
              {/* Header WhatsApp Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <MessageCircle className="w-5 h-5 fill-emerald-400/20" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-white text-base">WhatsApp Business API</h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {selectedWhatsAppUser.isWhatsAppVerified ? 'Numéro Validé' : 'Non Vérifié'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Destinataire : <strong className="text-white">{selectedWhatsAppUser.name}</strong> •{' '}
                      <span className="font-mono text-emerald-400">{selectedWhatsAppUser.phone}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedWhatsAppUser(null)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sélection du template pré-approuvé */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Modèle de message officiel (Meta WhatsApp Verified) :
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        id: 'receipt',
                        title: 'Reçu Caisse NaNa POS',
                        desc: 'Confirmation de vente & ticket numérique'
                      },
                      {
                        id: 'course',
                        title: 'Accès Campus Virtuel',
                        desc: 'Bienvenue & lien direct de classe'
                      },
                      {
                        id: 'deal',
                        title: 'Notification Escrow Devis',
                        desc: 'Validation de jalon sécurisé'
                      },
                      {
                        id: 'custom',
                        title: 'Message Libre Direct',
                        desc: 'Routage direct WhatsApp API'
                      }
                    ].map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setWhatsAppTemplateId(tpl.id);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          whatsAppTemplateId === tpl.id
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <p className="font-black text-xs text-white">{tpl.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{tpl.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prévisualisation dynamique du template WhatsApp */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Aperçu du message formaté :
                  </label>
                  <div className="p-3.5 rounded-2xl bg-[#07130e] border border-emerald-900/60 font-mono text-[11px] text-emerald-200/90 leading-relaxed shadow-inner">
                    {whatsAppTemplateId === 'receipt' && (
                      <p>
                        🟢 <strong>L'ENTREPRISE NANA • REÇU OFFICIEL</strong><br />
                        Bonjour {selectedWhatsAppUser.name}, votre encaissement NaNa Caisse pour un montant certifié a été validé avec succès. Merci de votre confiance !
                      </p>
                    )}
                    {whatsAppTemplateId === 'course' && (
                      <p>
                        🎓 <strong>CAMPUS VIRTUEL NANA • ACCRÉDITATION</strong><br />
                        Bonjour {selectedWhatsAppUser.name}, vos modules pédagogiques sont débloqués. Rendez-vous sur votre espace apprenant pour débuter vos cours !
                      </p>
                    )}
                    {whatsAppTemplateId === 'deal' && (
                      <p>
                        💼 <strong>ESCROW SÉCURISÉ NANA • PROJET</strong><br />
                        Bonjour {selectedWhatsAppUser.name}, les fonds de votre jalon contractuel ont été consignés sous séquestre sécurisé. Le projet peut démarrer.
                      </p>
                    )}
                    {whatsAppTemplateId === 'custom' && (
                      <textarea
                        rows={3}
                        value={customWhatsAppMsg}
                        onChange={e => setCustomWhatsAppMsg(e.target.value)}
                        placeholder={`Bonjour ${selectedWhatsAppUser.name}, suite à votre inscription sur le méga-écosystème NaNa...`}
                        className="w-full bg-transparent border-none text-emerald-100 placeholder-emerald-700 focus:outline-none resize-none font-mono text-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Passerelle Twilio WhatsApp Business</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedWhatsAppUser(null)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={handleSendWhatsAppTemplate}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition hover:scale-[1.02]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Envoyer le Template</span>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Constructeur de Tunnel de Vente FunnelBuilder */}
      {showFunnelStudio && (
        <FunnelBuilder
          isOpen={showFunnelStudio}
          onClose={() => setShowFunnelStudio(false)}
          onSave={(data: any) => {
            try {
              saveFunnelConfig(data);
            } catch (e) {
              console.warn('Erreur saveFunnelConfig SuperAdmin:', e);
            }
          }}
        />
      )}

    </div>
  );
};

export default SuperAdminDashboard;
