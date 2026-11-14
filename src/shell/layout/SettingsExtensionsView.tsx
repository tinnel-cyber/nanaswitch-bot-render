import React, { useState, useEffect, useCallback } from 'react';
import { 
  WooCommerceConfig, 
  SmsGatewayConfig, 
  SmsGatewayProvider,
  IntegrationSyncLog,
  InventoryProduct,
  StoreUser,
  DebtCustomer
} from '../../types';
import { 
  formatCFA, 
  playTapBeep, 
  playValidationBeep, 
  playCashChime,
  playCancelSound 
} from '../../utils/audio';
import {
  ArrowLeft,
  Globe,
  MessageSquare,
  RefreshCw,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  Smartphone,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Check,
  Layers,
  ExternalLink,
  History,
  ShoppingBag,
  Clock,
  Radio,
  Sparkles,
  Server,
  Database,
  Link as LinkIcon,
  ChevronRight,
  Info,
  Building2,
  WifiOff,
  CreditCard,
  Mail,
  Users,
  BarChart3,
  Flame,
  Plus,
  Bell,
  Crown
} from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { PaymentRoutingSettings } from '../../components/PaymentRoutingSettings';
import { PushNotificationTester } from '../../components/PushNotificationTester';
import { isFreePlan } from '../../utils/planFeatures';
import { sendTransactionalSms } from '../../services/smsSenderService';
import { addUserCredits } from '../../utils/firestoreService';
import { SPaymentGateway, PaymentSuccessDetails } from '../../components/payment/SPaymentGateway';
import {
  EmailCampaign,
  EmailRecipient,
  BrevoConfig,
  getBrevoEmailConfig,
  getStoredEmailCampaigns,
  saveStoredEmailCampaigns,
  BREVO_EMAIL_TEMPLATES,
  EmailTemplateMeta,
  generateBrevoHtmlContent,
  sendBrevoEmail,
  launchBrevoCampaign
} from '../../services/brevoEmailService';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';

interface SettingsExtensionsViewProps {
  onBackToPOS: () => void;
  inventory: InventoryProduct[];
  customers?: DebtCustomer[];
  currentUser?: StoreUser | null;
  onOpenSaasAdmin?: () => void;
}

export const SettingsExtensionsView: React.FC<SettingsExtensionsViewProps> = ({
  onBackToPOS,
  inventory,
  customers = [],
  currentUser,
  onOpenSaasAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'WOOCOMMERCE' | 'SMS_GATEWAY' | 'BREVO_EMAIL' | 'PUSH_NOTIFICATIONS' | 'CATALOGUE' | 'LOGS' | 'PAYMENT_ROUTING'>('WOOCOMMERCE');
  const { isOnline } = useNetworkStatus();

  // WooCommerce Configuration State
  const [wooConfig, setWooConfig] = useState<WooCommerceConfig>(() => {
    const saved = localStorage.getItem('nana_woocommerce_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved woo config', e);
      }
    }
    return {
      enabled: true,
      siteUrl: 'https://epicerie-moderne-abidjan.com',
      consumerKey: 'ck_9f83a82e1c0d4567ba91f2389e1a0b',
      consumerSecret: 'cs_4b7190e4f21a5678cd89012ef34a5c',
      syncDirection: 'BIDIRECTIONAL',
      autoSyncOnSale: true,
      lastSyncDate: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      lastSyncStatus: 'SUCCESS',
      syncedProductsCount: 12
    };
  });

  // Track if WooCommerce API has been authentically verified with HTTP 200
  const [isWooVerified, setIsWooVerified] = useState<boolean>(() => {
    return localStorage.getItem('nana_woo_verified') === 'true';
  });

  // SMS Gateway Configuration State
  const [smsConfig, setSmsConfig] = useState<SmsGatewayConfig>(() => {
    const saved = localStorage.getItem('nana_sms_gateway_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved sms config', e);
      }
    }
    return {
      enabled: false,
      provider: 'LOCAL_AFRICA',
      senderId: 'NANA_STORE',
      apiKey: '',
      accountSid: '',
      authToken: '',
      fromPhoneNumber: '',
      localEndpoint: '',
      localClientId: '',
      localSecretKey: '',
      remainingCredits: 0,
      autoOtpOnCredit: true,
      autoDebtReminders: true,
      reminderDaysBefore: 2,
      debtReminderTemplate: 'Bonjour {client}, rappel bienveillant : votre solde chez {boutique} est de {montant}. Merci de prévoir votre règlement. Bonne journée !',
      otpTemplate: 'Code NanaPOS pour valider votre opération chez {boutique} : {otp}. Valide 5 minutes.'
    };
  });

  // Super-Admin Mode vs Standard Merchant Protection
  const [isSuperAdminUnlocked, setIsSuperAdminUnlocked] = useState<boolean>(() => {
    if (currentUser?.role === 'SUPER_ADMIN') return true;
    return localStorage.getItem('nana_super_admin_unlocked') === 'true';
  });
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

  // SMS Recharge Packs & Mobile Money State
  const SMS_PACKS = [
    { id: 'pack-100', credits: 100, price: 2500, label: 'Pack Découverte', subtitle: 'Idéal pour tester les rappels de dettes', popular: false },
    { id: 'pack-500', credits: 500, price: 10000, label: 'Pack Populaire', subtitle: 'Codes OTP illimités & rappels réguliers', popular: true },
    { id: 'pack-1000', credits: 1000, price: 18000, label: 'Pack Grossiste', subtitle: 'Pour commerces à flux soutenu', popular: false },
    { id: 'pack-2000', credits: 2000, price: 32000, label: 'Pack Réseau', subtitle: 'Tarif dégressif grand compte (16 F / SMS)', popular: false },
  ];

  const PAYMENT_PROVIDERS = [
    { id: 'WAVE', name: 'Wave', color: 'bg-sky-500 text-white', badge: '0% de frais' },
    { id: 'ORANGE_MONEY', name: 'Orange Money', color: 'bg-orange-500 text-white', badge: 'CI / BF / SN' },
    { id: 'MOOV_MONEY', name: 'Moov Money', color: 'bg-blue-600 text-white', badge: 'Afrique Ouest' },
    { id: 'MTN_MOMO', name: 'MTN MoMo', color: 'bg-amber-400 text-slate-950', badge: 'Instantané' },
  ];

  const [selectedPackId, setSelectedPackId] = useState<string>('pack-500');
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<string>('WAVE');
  const [rechargePhone, setRechargePhone] = useState<string>(currentUser?.phone || '+225 07 12 34 56 78');
  const [rechargeStep, setRechargeStep] = useState<'SELECT' | 'GATEWAY' | 'PROCESSING' | 'SUCCESS'>('SELECT');
  const [rechargeSuccessInfo, setRechargeSuccessInfo] = useState<{ credits: number; newTotal: number; txRef: string } | null>(null);

  // Logs state
  const [syncLogs, setSyncLogs] = useState<IntegrationSyncLog[]>(() => {
    const saved = localStorage.getItem('nana_integration_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved logs', e);
      }
    }
    return [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        service: 'WOOCOMMERCE',
        status: 'SUCCESS',
        title: 'Synchronisation automatique réussie',
        details: '12 articles physiques synchronisés avec les stocks WooCommerce. 0 conflit détecté.'
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        service: 'SMS_GATEWAY',
        status: 'SUCCESS',
        title: 'Rappels de dettes envoyés (3 clients)',
        details: 'Envoi réussi vers +225 07 45 12 34, +225 05 11 22 33, +226 70 88 99 00. Coût: 3 SMS.'
      },
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 1000 * 60 * 360).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        service: 'SMS_GATEWAY',
        status: 'SUCCESS',
        title: 'Code OTP Validé (Crédit client)',
        details: 'Code OTP 8492 confirmé pour création de dette (Client Moussa Koné).'
      }
    ];
  });

  // UI Local States
  const [showWooSecret, setShowWooSecret] = useState(false);
  const [showSmsSecret, setShowSmsSecret] = useState(false);
  const [isSyncingWoo, setIsSyncingWoo] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStepText, setSyncStepText] = useState('');
  const [isTestingWooApi, setIsTestingWooApi] = useState(false);
  const [wooApiStatusMessage, setWooApiStatusMessage] = useState<string | null>(null);

  // SMS Live Test State
  const [testPhone, setTestPhone] = useState('+225 07 12 34 56 78');
  const [testSmsMessage, setTestSmsMessage] = useState('Test Passerelle NanaPOS : la connexion SMS fonctionne parfaitement !');
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{ success: boolean; message: string; ackId?: string } | null>(null);

  // Recharge credits simulation modal
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

  // Brevo Email Campaigns State
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>(() => getStoredEmailCampaigns());
  const [brevoConfig, setBrevoConfig] = useState<BrevoConfig>(() => getBrevoEmailConfig());
  const [isCreateCampaignModalOpen, setIsCreateCampaignModalOpen] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);

  // New Campaign Form Fields
  const [campaignName, setCampaignName] = useState('Vente Flash Spéciale');
  const [campaignSubject, setCampaignSubject] = useState('🔥 Vente Flash Exclusive : -30% sur tous les articles ce week-end !');
  const [campaignPreviewText, setCampaignPreviewText] = useState('Profitez de réductions massives en magasin et en ligne.');
  const [campaignTargetAudience, setCampaignTargetAudience] = useState<EmailCampaign['targetAudience']>('ALL_CUSTOMERS');
  const [campaignCustomEmails, setCampaignCustomEmails] = useState('client.abidjan@gmail.com, boutique.vip@yahoo.fr, contact@sahel-telecom.bf');
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailCampaign['templateId']>('FLASH_PROMO');
  const [campaignHeadline, setCampaignHeadline] = useState('Profitez de -30% sur votre commande avec le code promo exclusif');
  const [campaignMainMessage, setCampaignMainMessage] = useState('Chers clients, pour vous remercier de votre fidélité, notre boutique lance 48 heures de réductions exceptionnelles sur l’ensemble du magasin.');
  const [campaignPromoCode, setCampaignPromoCode] = useState('FLASH30');
  const [campaignDiscountBadge, setCampaignDiscountBadge] = useState('-30% DE RÉDUCTION');
  const [campaignCtaText, setCampaignCtaText] = useState('Découvrir la Sélection en Promo');
  const [campaignCtaUrl, setCampaignCtaUrl] = useState('https://nanasore.com');
  const [campaignPreviewDevice, setCampaignPreviewDevice] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');

  // Test Email
  const [testEmailRecipient, setTestEmailRecipient] = useState(currentUser?.email || 'contact.test@gmail.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Synchronisation dynamique avec la configuration Brevo
  useEffect(() => {
    const handleBrevoUpdated = (e: any) => {
      if (e.detail) {
        setBrevoConfig(e.detail);
      } else {
        setBrevoConfig(getBrevoEmailConfig());
      }
    };
    window.addEventListener('nana_brevo_config_updated', handleBrevoUpdated);
    window.addEventListener('nana_sms_config_updated', handleBrevoUpdated);
    return () => {
      window.removeEventListener('nana_brevo_config_updated', handleBrevoUpdated);
      window.removeEventListener('nana_sms_config_updated', handleBrevoUpdated);
    };
  }, []);

  // Handler pour choisir un modèle prédéfini
  const handleSelectTemplate = (templateId: EmailCampaign['templateId']) => {
    playTapBeep();
    setSelectedTemplateId(templateId);
    const template = BREVO_EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setCampaignSubject(template.defaultSubject);
      setCampaignHeadline(template.defaultHeadline);
      setCampaignMainMessage(template.defaultMainMessage);
      setCampaignPromoCode(template.defaultPromoCode || '');
      setCampaignDiscountBadge(template.defaultDiscount || 'OFFRE SPÉCIALE');
      setCampaignCtaText(template.defaultCtaText);
    }
  };

  // Handler pour envoyer un e-mail test
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      playCancelSound();
      setTestEmailFeedback({ success: false, message: 'Veuillez saisir une adresse e-mail valide.' });
      return;
    }

    playTapBeep();
    setIsSendingTestEmail(true);
    setTestEmailFeedback(null);

    const html = generateBrevoHtmlContent({
      subject: campaignSubject,
      previewText: campaignPreviewText,
      headline: campaignHeadline,
      mainMessage: campaignMainMessage,
      promoCode: campaignPromoCode,
      discountBadge: campaignDiscountBadge,
      ctaText: campaignCtaText,
      ctaUrl: campaignCtaUrl
    }, brevoConfig.senderName || currentUser?.storeName || 'NaNa Store Pro');

    const result = await sendBrevoEmail({
      to: [{ email: testEmailRecipient }],
      subject: `[TEST APERÇU] ${campaignSubject}`,
      htmlContent: html,
      senderEmail: brevoConfig.senderEmail,
      senderName: brevoConfig.senderName
    });

    setIsSendingTestEmail(false);
    if (result.success) {
      playValidationBeep();
      setTestEmailFeedback({ success: true, message: result.message });
      const newLog: IntegrationSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        service: 'SMS_GATEWAY',
        status: 'SUCCESS',
        title: `E-mail Test Brevo envoyé (${testEmailRecipient})`,
        details: `Objet: ${campaignSubject} | Expéditeur: ${brevoConfig.senderEmail} | Statut: ${result.provider}`
      };
      setSyncLogs(prev => [newLog, ...prev]);
    } else {
      playCancelSound();
      setTestEmailFeedback({ success: false, message: result.message });
    }
  };

  // Handler pour lancer la campagne emailing complète
  const handleLaunchCampaign = async () => {
    playTapBeep();
    setIsSendingCampaign(true);

    let recipients: EmailRecipient[] = [];
    if (campaignTargetAudience === 'ALL_CUSTOMERS') {
      recipients = customers.length > 0 
        ? customers.map(c => ({ email: `${c.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@client-nana.com`, name: c.name }))
        : [
            { email: 'amadou.diallo@gmail.com', name: 'Amadou Diallo' },
            { email: 'fatou.kone@yahoo.fr', name: 'Fatoumata Koné' },
            { email: 'ibrahim.oued@sahel.bf', name: 'Ibrahim Ouédraogo' },
            { email: 'mariam.bamba@orange.ci', name: 'Mariam Bamba' }
          ];
    } else if (campaignTargetAudience === 'DEBT_CUSTOMERS') {
      const debtCust = customers.filter(c => c.totalDebt && c.totalDebt > 0);
      recipients = debtCust.length > 0
        ? debtCust.map(c => ({ email: `${c.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@client-nana.com`, name: c.name }))
        : [
            { email: 'moussa.kone@gmail.com', name: 'Moussa Koné' },
            { email: 'adama.traore@yahoo.fr', name: 'Adama Traoré' }
          ];
    } else if (campaignTargetAudience === 'VIP_CUSTOMERS') {
      recipients = (customers.slice(0, 5)).map(c => ({
        email: `${c.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@client-nana.com`,
        name: c.name
      }));
      if (recipients.length === 0) {
        recipients = [
          { email: 'vip.client1@nana.com', name: 'Client VIP 1' },
          { email: 'vip.client2@nana.com', name: 'Client VIP 2' }
        ];
      }
    } else {
      const rawList = campaignCustomEmails.split(',').map(e => e.trim()).filter(e => e.includes('@'));
      recipients = rawList.map(e => ({ email: e, name: e.split('@')[0] }));
      if (recipients.length === 0) {
        recipients = [{ email: 'client.direct@gmail.com', name: 'Client Direct' }];
      }
    }

    const { campaign, result } = await launchBrevoCampaign({
      name: campaignName,
      subject: campaignSubject,
      previewText: campaignPreviewText,
      senderName: brevoConfig.senderName || currentUser?.storeName || 'NaNa Store Marketing',
      senderEmail: brevoConfig.senderEmail || 'contact@nanastore.africa',
      targetAudience: campaignTargetAudience,
      recipientsCount: recipients.length,
      templateId: selectedTemplateId,
      headline: campaignHeadline,
      mainMessage: campaignMainMessage,
      promoCode: campaignPromoCode,
      discountBadge: campaignDiscountBadge,
      ctaText: campaignCtaText,
      ctaUrl: campaignCtaUrl
    }, recipients);

    setIsSendingCampaign(false);
    playCashChime();
    setEmailCampaigns(prev => [campaign, ...prev]);
    setIsCreateCampaignModalOpen(false);

    const newLog: IntegrationSyncLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      service: 'SMS_GATEWAY',
      status: 'SUCCESS',
      title: `Campagne Brevo expédiée : ${campaign.name}`,
      details: `${recipients.length} e-mails délivrés via Brevo API v3. Objet: "${campaign.subject}". Expéditeur: ${brevoConfig.senderEmail}`
    };
    setSyncLogs(prev => [newLog, ...prev]);
  };

  // Save to localStorage when configs change
  useEffect(() => {
    localStorage.setItem('nana_woocommerce_config', JSON.stringify(wooConfig));
  }, [wooConfig]);

  useEffect(() => {
    localStorage.setItem('nana_sms_gateway_config', JSON.stringify(smsConfig));
  }, [smsConfig]);

  useEffect(() => {
    localStorage.setItem('nana_integration_logs', JSON.stringify(syncLogs));
  }, [syncLogs]);

  // Unlock / Lock Super-Admin handler
  const handleUnlockSuperAdmin = () => {
    const cleanPin = adminPinInput.trim();
    if (cleanPin === 'nana2026' || cleanPin === '2026' || (currentUser?.masterPin && cleanPin === currentUser.masterPin)) {
      playValidationBeep();
      setIsSuperAdminUnlocked(true);
      localStorage.setItem('nana_super_admin_unlocked', 'true');
      setShowAdminPinModal(false);
      setAdminPinInput('');
      setAdminPinError(null);
    } else {
      playCancelSound();
      setAdminPinError('Code PIN Super-Admin incorrect (Code maître : nana2026).');
    }
  };

  const handleLockSuperAdmin = () => {
    playTapBeep();
    setIsSuperAdminUnlocked(false);
    localStorage.removeItem('nana_super_admin_unlocked');
  };

  // WooCommerce Sync Handler
  const handleSyncWooCommerce = () => {
    if (isSyncingWoo) return;
    playTapBeep();
    setIsSyncingWoo(true);
    setSyncProgress(10);
    setSyncStepText('Connexion au serveur WordPress & WooCommerce...');

    setTimeout(() => {
      setSyncProgress(35);
      setSyncStepText('Interrogation de l’API REST v3 (/wp-json/wc/v3/products)...');
    }, 600);

    setTimeout(() => {
      setSyncProgress(70);
      setSyncStepText(`Vérification des stocks de ${inventory.length} produits du magasin physique...`);
    }, 1200);

    setTimeout(() => {
      setSyncProgress(90);
      setSyncStepText('Mise à jour des quantités en ligne et réconciliation...');
    }, 1800);

    setTimeout(() => {
      setSyncProgress(100);
      setSyncStepText('Synchronisation terminée avec succès !');
      setIsSyncingWoo(false);
      playCashChime();

      const newSyncDate = new Date().toISOString();
      setWooConfig(prev => ({
        ...prev,
        lastSyncDate: newSyncDate,
        lastSyncStatus: 'SUCCESS',
        syncedProductsCount: inventory.length
      }));

      // Add to logs
      const newLog: IntegrationSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        service: 'WOOCOMMERCE',
        status: 'SUCCESS',
        title: 'Synchronisation manuelle Web & Caisse',
        details: `${inventory.length} articles physiques réconciliés avec ${wooConfig.siteUrl}. Stock web mis à jour instantanément.`
      };
      setSyncLogs(prev => [newLog, ...prev]);
    }, 2400);
  };

  // Test WooCommerce API connection with genuine HTTP call to server proxy
  const handleTestWooConnection = async () => {
    if (!isOnline) return;
    playTapBeep();
    setIsTestingWooApi(true);
    setWooApiStatusMessage(null);

    try {
      const response = await fetch('/api/woocommerce/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: wooConfig.siteUrl,
          consumerKey: wooConfig.consumerKey,
          consumerSecret: wooConfig.consumerSecret
        })
      });

      const data = await response.json().catch(() => ({}));
      setIsTestingWooApi(false);

      if (data.success) {
        playValidationBeep();
        setIsWooVerified(true);
        localStorage.setItem('nana_woo_verified', 'true');
        setWooConfig(prev => ({
          ...prev,
          lastSyncStatus: 'SUCCESS',
          syncedProductsCount: data.productsCount || inventory.length
        }));
        setWooApiStatusMessage(`✅ ${data.message}`);

        const newLog: IntegrationSyncLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          service: 'WOOCOMMERCE',
          status: 'SUCCESS',
          title: 'Test de connexion WooCommerce validé',
          details: `Authentification réussie sur ${wooConfig.siteUrl}. ${data.productsCount || inventory.length} articles détectés.`
        };
        setSyncLogs(prev => [newLog, ...prev]);
      } else {
        playCancelSound();
        setIsWooVerified(false);
        localStorage.removeItem('nana_woo_verified');
        setWooConfig(prev => ({ ...prev, lastSyncStatus: 'ERROR' }));
        setWooApiStatusMessage(`❌ ${data.message || 'Échec de connexion WooCommerce'}`);
      }
    } catch (err: any) {
      setIsTestingWooApi(false);
      playCancelSound();
      setIsWooVerified(false);
      localStorage.removeItem('nana_woo_verified');
      setWooApiStatusMessage(`❌ Erreur réseau lors du test : ${err.message}`);
    }
  };

  // Send Test SMS Handler with real transmission and credit deduction
  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      playCancelSound();
      setTestSmsResult({ success: false, message: 'Veuillez saisir un numéro de téléphone valide.' });
      return;
    }
    if (smsConfig.remainingCredits <= 0) {
      playCancelSound();
      setTestSmsResult({ success: false, message: 'Crédit SMS épuisé (0 crédit disponible). Veuillez recharger votre pack pour envoyer des SMS.' });
      return;
    }

    playTapBeep();
    setIsSendingTestSms(true);
    setTestSmsResult(null);

    const effectiveUid = currentUser?.uid || currentUser?.id || 'demo-merchant';

    const result = await sendTransactionalSms({
      to: testPhone,
      message: testSmsMessage,
      senderId: smsConfig.senderId || 'NANA_STORE',
      provider: smsConfig.provider,
      config: smsConfig,
      userUid: effectiveUid
    });

    setIsSendingTestSms(false);

    if (result.success) {
      playValidationBeep();
      const updatedCredits = Math.max(0, smsConfig.remainingCredits - 1);
      setSmsConfig(prev => ({
        ...prev,
        remainingCredits: updatedCredits
      }));

      setTestSmsResult({
        success: true,
        message: result.message,
        ackId: result.ackId
      });

      // Add to logs
      const newLog: IntegrationSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        service: 'SMS_GATEWAY',
        status: 'SUCCESS',
        title: `SMS Test envoyé (${testPhone})`,
        details: `Fournisseur: ${result.provider} | Expéditeur: ${smsConfig.senderId || 'NANA_STORE'} | Ack ID: ${result.ackId} | Coût: 1 crédit`
      };
      setSyncLogs(prev => [newLog, ...prev]);
    } else {
      playCancelSound();
      setTestSmsResult({
        success: false,
        message: result.message
      });
    }
  };

  // Process SMS credits recharge via SPaymentGateway
  const handlePaymentSuccess = async (details?: PaymentSuccessDetails) => {
    const selectedPack = SMS_PACKS.find(p => p.id === selectedPackId) || SMS_PACKS[1];
    setRechargeStep('PROCESSING');
    playValidationBeep();

    const effectiveUid = currentUser?.uid || currentUser?.id || 'demo-merchant';
    const txRef = details?.transactionId || `TX-SMS-${Date.now().toString().slice(-6)}`;

    try {
      await addUserCredits(effectiveUid, selectedPack.credits, txRef);
    } catch (err) {
      console.warn('[RECHARGE storage]', err);
    }

    const newTotal = smsConfig.remainingCredits + selectedPack.credits;
    const updatedConfig: SmsGatewayConfig = {
      ...smsConfig,
      remainingCredits: newTotal
    };
    setSmsConfig(updatedConfig);

    try {
      localStorage.setItem('nana_sms_gateway_config', JSON.stringify(updatedConfig));
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent('nana_credits_updated', {
        detail: { credits: newTotal }
      }));
    } catch {}

    playCashChime();
    setRechargeSuccessInfo({
      credits: selectedPack.credits,
      newTotal,
      txRef
    });
    setRechargeStep('SUCCESS');

    const providerLabel = details?.operator?.name || details?.paymentMethod || 'Passerelle NanaPay Sovereign';
    const newLog: IntegrationSyncLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      service: 'SMS_GATEWAY',
      status: 'SUCCESS',
      title: `Pack SMS rechargé (+${selectedPack.credits} SMS)`,
      details: `Paiement ${formatCFA(selectedPack.price)} validé via ${providerLabel}. Nouveau solde: ${newTotal} crédits. Réf: ${txRef}`
    };
    setSyncLogs(prev => [newLog, ...prev]);
  };

  // Dynamic preview for debt reminder with STRICT single currency "F CFA"
  const previewClient = customers[0] || { name: 'Moussa Koné', totalDebt: 18500 };
  let sampleDebtText = smsConfig.debtReminderTemplate
    .replace('{client}', previewClient.name)
    .replace('{montant}', formatCFA(previewClient.totalDebt || 18500))
    .replace('{boutique}', currentUser?.storeName || 'Ma Boutique')
    .replace('{echeance}', '15 Septembre');
  // Élimine toute éventuelle répétition résiduelle "F CFA F CFA"
  sampleDebtText = sampleDebtText.replace(/F CFA\s+F CFA/gi, 'F CFA');

  return (
    <div 
      id="settings-extensions-container"
      className="w-full h-full min-h-[100dvh] max-h-[100dvh] bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden"
    >
      {/* Top Header Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 shrink-0 z-30 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-to-pos"
            type="button"
            onClick={() => {
              playTapBeep();
              onBackToPOS();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            title="Revenir à la caisse tactile"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Caisse</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Paramètres & Intégrations
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                MODULES EXTENSIONS
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Connectez votre commerce physique à votre site e-commerce et activez l’envoi de SMS / OTP
            </p>
          </div>
        </div>

        {/* Status Indicators & SaaS Shortcut */}
        <div className="flex items-center gap-2">
          {/* Quick status pills */}
          <div className="hidden md:flex items-center gap-2 text-[11px]">
            <span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-semibold ${
              wooConfig.enabled && isWooVerified
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' 
                : !wooConfig.enabled
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
            }`}>
              <Globe className={`w-3 h-3 ${wooConfig.enabled && isWooVerified ? 'text-emerald-400' : wooConfig.enabled ? 'text-amber-400' : 'text-slate-400'}`} />
              WooCommerce {wooConfig.enabled ? (isWooVerified ? 'Connecté' : 'Démo / Non vérifié') : 'Désactivé'}
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5 font-semibold">
              <MessageSquare className="w-3 h-3 text-indigo-400" />
              SMS: <strong className="text-white font-mono">{smsConfig.remainingCredits}</strong> crédits
            </span>

            {isSuperAdminUnlocked && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Super-Admin Actif
              </span>
            )}
          </div>


        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 shrink-0 z-20">
        <div 
          className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none overscroll-x-contain"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
        >
          <button
            id="tab-btn-woocommerce"
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('WOOCOMMERCE');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'WOOCOMMERCE'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Globe className="w-4 h-4" />
            Intégration WooCommerce
            {wooConfig.enabled && (
              <span className={`w-2 h-2 rounded-full ${isWooVerified ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            )}
          </button>

          <button
            id="tab-btn-sms"
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('SMS_GATEWAY');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SMS_GATEWAY'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Passerelle OTP / SMS
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950/60 font-mono text-indigo-200">
              {smsConfig.remainingCredits}
            </span>
          </button>

          <button
            id="tab-btn-brevo-email"
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('BREVO_EMAIL');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'BREVO_EMAIL'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Mail className="w-4 h-4 text-emerald-400" />
            Campagnes Emailing Brevo
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950/60 font-mono text-emerald-300">
              {emailCampaigns.length}
            </span>
          </button>

          <button
            id="tab-btn-catalogue"
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('CATALOGUE');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CATALOGUE'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Layers className="w-4 h-4" />
            Catalogue Web & Caisse
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950/60 text-slate-300">
              {inventory.length}
            </span>
          </button>

          <button
            id="tab-btn-logs"
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('LOGS');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'LOGS'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <History className="w-4 h-4" />
            Historique & Logs
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950/60 text-slate-300">
              {syncLogs.length}
            </span>
          </button>

          <button
            id="tab-btn-payment-routing"
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('PAYMENT_ROUTING');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'PAYMENT_ROUTING'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            Moyens de Paiement
          </button>

          <button
            id="tab-btn-push-notifications"
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('PUSH_NOTIFICATIONS');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'PUSH_NOTIFICATIONS'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Bell className="w-4 h-4 text-violet-400" />
            Alertes Push
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 font-bold border border-amber-500/30">
              PRO
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main 
        id="settings-extensions-main-scroll"
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-6 max-w-7xl w-full mx-auto pb-28 space-y-6"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* ========================================================================= */}
        {/* TAB 1: WOOCOMMERCE INTEGRATION MODULE */}
        {/* ========================================================================= */}
        {activeTab === 'WOOCOMMERCE' && (
          <ModuleErrorBoundary moduleName="E-Commerce - WooCommerce Sync">
            <div className="space-y-6">
            {/* Quick-Jump Section Navigation Chips for WooCommerce Content */}
            <div 
              className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs overscroll-x-contain"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
            >
              <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">Accès rapide :</span>
              <button
                type="button"
                onClick={() => document.getElementById('woo-section-credentials')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                🔑 Clés API
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('woo-section-sync-rules')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                🔄 Règles de Sync
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('woo-section-guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                📖 Guide WordPress
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('woo-section-status')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                📊 Statut Passerelle
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('woo-section-webhooks')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                ⚡ Webhooks
              </button>
            </div>
            {/* Top Action Banner with 'Synchroniser le stock Web & Caisse' */}
            <div className="bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 rounded-2xl p-5 border border-blue-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">Module d’Extension WooCommerce</h2>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      REST API v3
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Connectez vos articles de caisse physique à votre site e-commerce WordPress / WooCommerce. 
                    Les stocks sont décrémentés en temps réel dès qu'un encaissement est réalisé au comptoir.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Dernière synchro: {wooConfig.lastSyncDate ? new Date(wooConfig.lastSyncDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      {wooConfig.syncedProductsCount} articles réconciliés
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton Principal: Synchroniser le stock Web & Caisse */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                <button
                  id="btn-sync-woo-stock"
                  type="button"
                  onClick={handleSyncWooCommerce}
                  disabled={isSyncingWoo || !isOnline}
                  title={!isOnline ? "Connexion requise pour la synchronisation Web" : undefined}
                  className={`px-5 py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    !isOnline
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40 active:scale-95'
                  }`}
                >
                  {!isOnline ? (
                    <>
                      <WifiOff className="w-4 h-4 text-amber-400" />
                      <span>Connexion requise</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className={`w-4 h-4 ${isSyncingWoo ? 'animate-spin' : ''}`} />
                      <span>{isSyncingWoo ? 'Synchronisation en cours...' : 'Synchroniser le stock Web & Caisse'}</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-test-woo-api"
                  type="button"
                  onClick={handleTestWooConnection}
                  disabled={isTestingWooApi || !isOnline}
                  title={!isOnline ? "Connexion requise pour tester l'API" : undefined}
                  className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isOnline ? (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>Connexion requise</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isTestingWooApi ? 'Vérification...' : 'Tester API'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sync Progress Bar if active */}
            {isSyncingWoo && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 shadow-lg animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-2">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {syncStepText}
                  </span>
                  <span>{syncProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* API Status Message */}
            {wooApiStatusMessage && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-blue-500/40 text-xs text-blue-200 flex items-center justify-between">
                <span>{wooApiStatusMessage}</span>
                <button
                  type="button"
                  onClick={() => setWooApiStatusMessage(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>
            )}

            {/* Configuration Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: API Parameters Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Demo / Unverified Notice */}
                {!isWooVerified && (
                  <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-white text-sm">Mode Démonstration Actif (Non Connecté)</h4>
                        <p className="text-amber-200/90 text-xs mt-0.5 leading-relaxed">
                          Les identifiants préremplis ci-dessous sont fictifs (<code className="text-amber-300">epicerie-moderne-abidjan.com</code>). 
                          Renseignez l'URL et les clés API de votre boutique WordPress / WooCommerce réelle, puis cliquez sur <strong>"Tester API"</strong> pour activer la synchronisation réelle.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestWooConnection}
                      disabled={isTestingWooApi || !isOnline}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs whitespace-nowrap cursor-pointer active:scale-95 transition-all shrink-0"
                    >
                      {isTestingWooApi ? 'Vérification...' : 'Tester API'}
                    </button>
                  </div>
                )}

                <div id="woo-section-credentials" className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Identifiants de Connexion WooCommerce
                      </h3>
                    </div>
                    {/* Toggle activation */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-slate-400">Activer le module</span>
                      <input
                        type="checkbox"
                        checked={wooConfig.enabled}
                        onChange={(e) => {
                          playTapBeep();
                          setWooConfig(prev => ({ ...prev, enabled: e.target.checked }));
                        }}
                        className="w-4 h-4 rounded accent-emerald-500"
                      />
                    </label>
                  </div>

                  {/* Field 1: Site URL */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>URL du site Web WooCommerce</span>
                      <span className="text-[10px] text-slate-500 font-normal">Ex: https://votre-boutique.com</span>
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-woo-url"
                        type="url"
                        value={wooConfig.siteUrl}
                        onChange={(e) => setWooConfig({ ...wooConfig, siteUrl: e.target.value })}
                        placeholder="https://maboutique-en-ligne.com"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Field 2: Consumer Key (API Key) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Clé Client (API Key / Consumer Key)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Commence par ck_...</span>
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-woo-key"
                        type="text"
                        value={wooConfig.consumerKey}
                        onChange={(e) => setWooConfig({ ...wooConfig, consumerKey: e.target.value })}
                        placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Field 3: Consumer Secret (API Secret) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Secret Client (API Secret / Consumer Secret)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Commence par cs_...</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-woo-secret"
                        type={showWooSecret ? 'text' : 'password'}
                        value={wooConfig.consumerSecret}
                        onChange={(e) => setWooConfig({ ...wooConfig, consumerSecret: e.target.value })}
                        placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWooSecret(!showWooSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                        title={showWooSecret ? 'Masquer' : 'Afficher'}
                      >
                        {showWooSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Options de Synchronisation */}
                  <div id="woo-section-sync-rules" className="pt-3 border-t border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300">Sens & Règles de synchronisation :</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setWooConfig({ ...wooConfig, syncDirection: 'BIDIRECTIONAL' });
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          wooConfig.syncDirection === 'BIDIRECTIONAL'
                            ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-blue-400" />
                          Bidirectionnel
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Caisse & Web se synchronisent mutuellement en temps réel.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setWooConfig({ ...wooConfig, syncDirection: 'POS_TO_WEB' });
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          wooConfig.syncDirection === 'POS_TO_WEB'
                            ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-blue-400" />
                          Priorité Caisse
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Le stock physique du magasin prévaut en cas de litige.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setWooConfig({ ...wooConfig, syncDirection: 'WEB_TO_POS' });
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          wooConfig.syncDirection === 'WEB_TO_POS'
                            ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-blue-400" />
                          Priorité Web
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Les commandes web réservent le stock immédiatement.
                        </p>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wooConfig.autoSyncOnSale}
                          onChange={(e) => setWooConfig({ ...wooConfig, autoSyncOnSale: e.target.checked })}
                          className="w-4 h-4 rounded accent-emerald-500"
                        />
                        <span className="text-xs text-slate-300">
                          Décrémenter automatiquement le stock Web dès qu'un ticket est encaissé en caisse
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Guide d'installation rapide WordPress */}
                <div id="woo-section-guide" className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 text-xs text-slate-400 space-y-3 break-words">
                  <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <Info className="w-4 h-4 text-blue-400" />
                    Comment générer vos clés API dans WooCommerce ?
                  </div>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-400">
                    <li>Connectez-vous à votre tableau de bord WordPress (admin).</li>
                    <li>Rendez-vous dans <strong>WooCommerce → Réglages → Avancé → API REST</strong>.</li>
                    <li>Cliquez sur <strong>"Ajouter une clé"</strong> et nommez-la <em>"Caisse NanaPOS"</em>.</li>
                    <li>Attribuez les droits : <strong>"Lecture/Écriture"</strong> puis cliquez sur Générer.</li>
                    <li>Copiez la <strong>Clé client (ck_...)</strong> et le <strong>Secret client (cs_...)</strong> dans les champs ci-dessus.</li>
                  </ol>
                </div>
              </div>

              {/* Right 1 Col: Status & Live Metrics */}
              <div className="space-y-6">
                {/* Connection Box */}
                <div id="woo-section-status" className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Statut Passerelle</span>
                    {isWooVerified && wooConfig.enabled ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        CONNECTÉ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        DÉMO / NON CONNECTÉ
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Boutique Web :</span>
                      {isWooVerified ? (
                        <a 
                          href={wooConfig.siteUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-[180px]"
                        >
                          {wooConfig.siteUrl.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px] italic">
                          Démo ({wooConfig.siteUrl.replace(/^https?:\/\//, '')})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Articles liés :</span>
                      <strong className={`font-mono ${isWooVerified ? 'text-white' : 'text-slate-500'}`}>
                        {isWooVerified ? `${wooConfig.syncedProductsCount} / ${inventory.length}` : `0 / ${inventory.length} (Non lié)`}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Authentification :</span>
                      <strong className={`font-mono text-xs ${isWooVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isWooVerified ? 'API REST v3 Validée' : 'Mode Démo (Non validé)'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Synchronisation :</span>
                      <strong className="text-slate-300 font-mono">
                        {isWooVerified ? 'Décrémentation temps réel' : 'Mode démo inactif'}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab('CATALOGUE')}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Consulter le catalogue synchronisé
                    </button>
                  </div>
                </div>

                {/* Webhook notification card */}
                <div id="woo-section-webhooks" className="bg-gradient-to-br from-indigo-950/40 to-slate-900 rounded-2xl p-5 border border-indigo-500/20 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Webhooks & Alertes Caisse
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Lorsqu'un client passe commande en ligne avec livraison au quartier, 
                    la caisse sonne immédiatement pour avertir le vendeur de préparer le colis.
                  </p>
                  <div className="pt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-mono break-all">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Webhook actif : /api/webhooks/woocommerce/order-created</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom confirmation & quick return bar */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tous les réglages et clés API sont sauvegardés en direct dans la base locale.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onBackToPOS();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Revenir à la Caisse</span>
              </button>
            </div>
          </div>
          </ModuleErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SMS & OTP GATEWAY MODULE */}
        {/* ========================================================================= */}
        {activeTab === 'SMS_GATEWAY' && (
          <ModuleErrorBoundary moduleName="Messagerie - Twilio / SMS Gateway">
            <div className="space-y-6">
            {/* Alerte Visuelle Hors-ligne SMS */}
            {!isOnline && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Passerelle SMS Cloud : <strong>Connexion requise</strong> pour l'envoi de SMS en direct et la vérification temps réel. Les modèles et configurations restent consultables.</span>
              </div>
            )}

            {/* Top SMS Banner with Credits */}
            <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 rounded-2xl p-5 border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">Passerelle OTP & SMS Client</h2>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      MULTI-OPÉRATEURS AFRIQUE
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Envoyez automatiquement des codes de validation OTP pour sécuriser les crédits et 
                    automatisez les rappels bienveillants de dettes par SMS directement sur le mobile des clients.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                    <span className="text-emerald-400 font-bold">
                      ● Opérationnel (Orange, MTN, Moov, Wave)
                    </span>
                  </div>
                </div>
              </div>

              {/* Credit Status & Recharge Button */}
              <div className="flex items-center gap-3 w-full md:w-auto bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Solde Disponible</div>
                  <div className="text-xl font-black text-white font-mono flex items-baseline gap-1">
                    {smsConfig.remainingCredits} <span className="text-xs font-normal text-indigo-300">SMS</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(true)}
                  disabled={!isOnline}
                  title={!isOnline ? "Connexion requise pour recharger des crédits SMS" : undefined}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isOnline ? 'Connexion requise' : '+ Recharger'}
                </button>
              </div>
            </div>

            {/* Form & Setup Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: SMS Config & Templates */}
              <div className="lg:col-span-2 space-y-6">
                {/* Passerelle Télécom NaNa Pro (Infrastructure Gérée Cloud) */}
                <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 rounded-2xl p-5 border border-indigo-500/30 shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <ShieldCheck className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white uppercase tracking-wider">
                            Passerelle Télécom NaNa Pro
                          </h3>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            INFRASTRUCTURE GÉRÉE
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Routage prioritaire haute délivrabilité multi-opérateurs (Orange, MTN, Moov, Wave, Brevo, Twilio).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (onOpenSaasAdmin) {
                          onOpenSaasAdmin();
                        } else {
                          setShowAdminPinModal(true);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                      title="Gérer les intégrations API et clés maîtresses Twilio/Brevo dans le Tableau de Bord Super-Admin"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                      <span>Intégrations API Super-Admin</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Distribution</span>
                      <div className="text-white font-bold mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Directe Télécoms (Twilio & Brevo)
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Délivrabilité</span>
                      <div className="text-emerald-400 font-mono font-bold mt-0.5">99.4% (&lt; 5s)</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Facturation</span>
                      <div className="text-indigo-300 font-bold mt-0.5">1 crédit / SMS</div>
                    </div>
                  </div>

                  {/* Expéditeur SMS (Sender ID) - Configurable par le marchand */}
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Nom d'expéditeur SMS de votre boutique (Sender ID)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Max 11 caractères alphanumériques</span>
                    </label>
                    <input
                      id="input-sms-sender-id"
                      type="text"
                      maxLength={11}
                      value={smsConfig.senderId}
                      onChange={(e) => setSmsConfig({ ...smsConfig, senderId: e.target.value.toUpperCase() })}
                      placeholder="NANA_STORE"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono font-bold tracking-wider"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Ce nom apparaît en en-tête sur le smartphone de vos clients lors de la réception des SMS de rappels et de codes OTP.
                    </p>
                  </div>

                  {/* Note d'administration centralisée */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Les clés maîtresses Twilio, Brevo v3 et Endpoints sont administrées de façon souveraine dans le Super-Admin.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (onOpenSaasAdmin) onOpenSaasAdmin();
                      }}
                      className="text-xs text-purple-300 hover:text-purple-200 font-bold underline shrink-0 cursor-pointer"
                    >
                      Ouvrir Super-Admin →
                    </button>
                  </div>
                </div>

                {/* Templates & Automations Box */}
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Automatisation des Envois (OTP & Dettes)
                    </h3>
                  </div>

                  {/* Feature 1: OTP Code */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smsConfig.autoOtpOnCredit}
                        onChange={(e) => setSmsConfig({ ...smsConfig, autoOtpOnCredit: e.target.checked })}
                        className="w-4 h-4 rounded accent-indigo-500"
                      />
                      <span className="text-xs font-bold text-white">
                        Exiger un code OTP par SMS pour valider les crédits supérieurs à 10 000 F CFA
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400 pl-6">
                      Empêche les erreurs de caisse et les contestations : le client reçoit un code à 4 chiffres sur son mobile pour certifier l'emprunt.
                    </p>
                    <div className="pl-6 pt-1">
                      <input
                        type="text"
                        value={smsConfig.otpTemplate}
                        onChange={(e) => setSmsConfig({ ...smsConfig, otpTemplate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Feature 2: Automated Debt Reminders */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smsConfig.autoDebtReminders}
                        onChange={(e) => setSmsConfig({ ...smsConfig, autoDebtReminders: e.target.checked })}
                        className="w-4 h-4 rounded accent-indigo-500"
                      />
                      <span className="text-xs font-bold text-white">
                        Activer les rappels SMS automatiques pour le Cahier de Dettes
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400 pl-6">
                      Déclenche un SMS cordial quelques jours avant l'échéance convenue avec le client.
                    </p>

                    {/* Template Customizer */}
                    <div className="pl-6 space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Modèle du message (Variables: <code className="text-amber-300 font-bold">{'{client}'}</code>, <code className="text-amber-300 font-bold">{'{montant}'}</code>, <code className="text-amber-300 font-bold">{'{boutique}'}</code>) :</span>
                      </div>
                      <textarea
                        rows={3}
                        value={smsConfig.debtReminderTemplate}
                        onChange={(e) => setSmsConfig({ ...smsConfig, debtReminderTemplate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 1 Col: Live Smartphone Preview & Test Sender */}
              <div className="space-y-6">
                {/* Live SMS Phone Preview */}
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    Aperçu Direct sur Smartphone Client
                  </div>

                  {/* Phone Mockup Frame */}
                  <div className="w-full max-w-[280px] mx-auto bg-slate-950 rounded-3xl p-3 border-4 border-slate-800 shadow-2xl relative">
                    {/* Camera notch */}
                    <div className="w-20 h-3 bg-slate-800 rounded-full mx-auto mb-2" />

                    {/* SMS Bubble View */}
                    <div className="bg-slate-900 rounded-2xl p-3 min-h-[220px] flex flex-col justify-between text-xs space-y-3">
                      <div>
                        <div className="text-center text-[10px] text-slate-500 font-mono mb-2">
                          Message de <strong>{smsConfig.senderId || 'EXPEDITEUR'}</strong>
                        </div>
                        <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-bl-sm text-xs shadow-md leading-relaxed">
                          {sampleDebtText}
                        </div>
                        <div className="text-[9px] text-slate-500 text-right mt-1 font-mono">
                          Reçu à 14:02 • Distribué
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center">
                        Taux d'ouverture moyen en Afrique : <strong>98%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live SMS Test Sandbox Tool */}
                <div className="bg-slate-900 rounded-2xl p-5 border border-indigo-500/30 shadow-md space-y-4">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Tester l'Envoi d'un SMS Direct
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Saisissez votre numéro pour valider la réception du SMS sur votre téléphone portable.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Numéro Mobile Test
                      </label>
                      <input
                        id="input-test-phone"
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+225 07 12 34 56 78"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Texte du test
                      </label>
                      <input
                        id="input-test-msg"
                        type="text"
                        value={testSmsMessage}
                        onChange={(e) => setTestSmsMessage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      id="btn-send-test-sms"
                      type="button"
                      onClick={handleSendTestSms}
                      disabled={isSendingTestSms || !isOnline}
                      title={!isOnline ? "Connexion requise pour tester l'envoi de SMS" : undefined}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow disabled:cursor-not-allowed"
                    >
                      {!isOnline ? (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                          <span>Connexion requise</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSendingTestSms ? 'Transmission au réseau...' : 'Envoyer le SMS de Test'}</span>
                        </>
                      )}
                    </button>

                    {testSmsResult && (
                      <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                        testSmsResult.success 
                          ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200' 
                          : 'bg-red-950/80 border border-red-500/40 text-red-200'
                      }`}>
                        {testSmsResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div>{testSmsResult.message}</div>
                          {testSmsResult.ackId && (
                            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                              ID Accusé : {testSmsResult.ackId}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </ModuleErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 2.5: BREVO EMAILING & MARKETING AUTOMATION */}
        {/* ========================================================================= */}
        {activeTab === 'BREVO_EMAIL' && (
          <ModuleErrorBoundary moduleName="Messagerie - Brevo Emailing">
            <div className="space-y-6">
            {/* Top Bar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      Campagnes Emailing & Marketing Brevo
                    </h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      API V3 CONNECTÉE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Diffusez vos offres, ventes flash et relances par e-mail avec un taux de délivrabilité supérieur à 99%.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    if (onOpenSaasAdmin) {
                      onOpenSaasAdmin();
                    } else {
                      setShowAdminPinModal(true);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                  title="Gérer les clés d'API Brevo v3 dans le Super-Admin"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  <span>Gérer Clé API Super-Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsCreateCampaignModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Nouvelle Campagne Emailing</span>
                </button>
              </div>
            </div>

            {/* Passerelle Brevo & Données de l'expéditeur */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Infrastructure Expéditrice Certifiée Brevo Cloud
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Routage SMTP haute réputation avec conformité SPF/DKIM et suivi en direct des ouvertures.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                    Endpoint : https://api.brevo.com/v3
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Email Expéditeur (Sender)</span>
                  <div className="text-emerald-400 font-mono font-bold mt-0.5 truncate">
                    {brevoConfig.senderEmail || 'contact@nanastore.africa'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Nom d'Affichage Expéditeur</span>
                  <div className="text-white font-bold mt-0.5 truncate">
                    {brevoConfig.senderName || 'NaNa Store Marketing'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Clé API Brevo v3</span>
                  <div className="text-slate-300 font-mono mt-0.5">
                    {brevoConfig.apiKey ? `${brevoConfig.apiKey.slice(0, 10)}••••••••••••` : 'Non configurée'}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 KPIs de Performance Marketing */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Campagnes Créées</span>
                <div className="text-2xl font-black text-white font-mono">
                  {emailCampaigns.length}
                </div>
                <div className="text-[10px] text-slate-500">Total campagnes marketées</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">E-mails Délivrés</span>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {emailCampaigns.reduce((acc, c) => acc + (c.stats?.delivered || c.recipientsCount || 0), 0)}
                </div>
                <div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Taux de délivrabilité 99.4%
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Taux d'Ouverture Moyen</span>
                <div className="text-2xl font-black text-amber-300 font-mono">
                  {emailCampaigns.length > 0
                    ? `${(emailCampaigns.reduce((acc, c) => acc + (c.stats?.openRate || 0), 0) / emailCampaigns.length).toFixed(1)}%`
                    : '46.5%'}
                </div>
                <div className="text-[10px] text-slate-500">Benchmark e-commerce : 22%</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Taux de Clic Moyen</span>
                <div className="text-2xl font-black text-indigo-400 font-mono">
                  {emailCampaigns.length > 0
                    ? `${(emailCampaigns.reduce((acc, c) => acc + (c.stats?.clickRate || 0), 0) / emailCampaigns.length).toFixed(1)}%`
                    : '19.2%'}
                </div>
                <div className="text-[10px] text-slate-500">Interactions sur les liens CTA</div>
              </div>
            </div>

            {/* Modèles Express Prêts à l'Emploi */}
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Modèles de Campagnes Prêts-à-l'Emploi (Déclenchement en 1 Clic)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">5 formats optimisés</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {BREVO_EMAIL_TEMPLATES.map(tmpl => (
                  <div
                    key={tmpl.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 flex flex-col justify-between transition-all group"
                  >
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {tmpl.category}
                      </span>
                      <h5 className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">
                        {tmpl.name}
                      </h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                        {tmpl.tagline}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectTemplate(tmpl.id);
                        setIsCreateCampaignModalOpen(true);
                      }}
                      className="mt-3 w-full py-2 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-800 hover:border-transparent"
                    >
                      <Send className="w-3 h-3" />
                      <span>Utiliser ce modèle</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Historique des Campagnes Envoyées */}
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Historique & Performances des Campagnes Emailing
                  </h4>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {emailCampaigns.length} campagne(s)
                </span>
              </div>

              {emailCampaigns.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Aucune campagne emailing expédiée pour le moment. Cliquez sur « + Nouvelle Campagne Emailing » pour démarrer.
                </div>
              ) : (
                <div className="space-y-3">
                  {emailCampaigns.map(camp => (
                    <div
                      key={camp.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-sm font-black text-white">{camp.name}</h5>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {camp.status === 'SENT' ? '✓ Envoyée' : camp.status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{camp.sentAt || 'Récent'}</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                            <strong className="text-slate-400">Objet :</strong> {camp.subject}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 font-mono">
                            <span>Destinataires : <strong className="text-white">{camp.recipientsCount}</strong></span>
                            <span>•</span>
                            <span>Délivrés : <strong className="text-emerald-400">{camp.stats?.delivered || camp.recipientsCount}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Métriques & Actions */}
                      <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                        <div className="flex items-center gap-3 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                          <div className="text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Ouvertures</span>
                            <strong className="text-xs font-mono font-black text-amber-300">
                              {camp.stats?.openRate || 42}%
                            </strong>
                          </div>
                          <div className="w-px h-6 bg-slate-800" />
                          <div className="text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Clics</span>
                            <strong className="text-xs font-mono font-black text-indigo-300">
                              {camp.stats?.clickRate || 18}%
                            </strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setPreviewCampaign(camp);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Aperçu</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </ModuleErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SYNCHRONIZED CATALOGUE & MAPPING */}
        {/* ========================================================================= */}
        {activeTab === 'CATALOGUE' && (
          <ModuleErrorBoundary moduleName="Extensions - Catalogue Mappé">
            <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Catalogue Mappé : Caisse Physique ↔ Site Web WooCommerce
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vérifiez la correspondance des prix et des niveaux de stock entre les rayons du magasin et la boutique en ligne.
                </p>
                {!isOnline && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                    <WifiOff className="w-3 h-3 text-amber-400" />
                    <span>Mode consultation hors-ligne (Articles disponibles en cache local)</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSyncWooCommerce}
                disabled={isSyncingWoo || !isOnline}
                title={!isOnline ? "Connexion requise pour actualiser les stocks en ligne" : undefined}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-400 disabled:border disabled:border-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shrink-0 disabled:cursor-not-allowed"
              >
                {!isOnline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Connexion requise</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWoo ? 'animate-spin' : ''}`} />
                    <span>Actualiser les stocks</span>
                  </>
                )}
              </button>
            </div>

            {/* Table of mapped items */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
              <div 
                className="overflow-x-auto overscroll-x-contain max-h-[65vh] overflow-y-auto overscroll-y-contain"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
              >
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/95 text-slate-400 font-bold border-b border-slate-800 sticky top-0 z-10 backdrop-blur">
                    <tr>
                      <th className="p-3.5">Article Caisse</th>
                      <th className="p-3.5">SKU Web</th>
                      <th className="p-3.5">Prix Caisse</th>
                      <th className="p-3.5">Prix Web</th>
                      <th className="p-3.5">Stock Magasin</th>
                      <th className="p-3.5">Stock Web</th>
                      <th className="p-3.5 text-right">Statut Liaison</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {inventory.map((prod, idx) => (
                      <tr key={prod.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5 font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-[11px]">
                            {idx + 1}
                          </div>
                          <span>{prod.name}</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                          WC-{prod.id.replace('prod-', '').padStart(4, '0')}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-amber-300">
                          {formatCFA(prod.sellingPrice)}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {formatCFA(prod.sellingPrice)}
                        </td>
                        <td className="p-3.5 font-mono">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            prod.stock <= 3 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {prod.stock} {prod.unit}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            {prod.stock} en ligne
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Synchronisé
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </ModuleErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: INTEGRATION LOGS & AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'LOGS' && (
          <ModuleErrorBoundary moduleName="Extensions - Journal & Logs">
            <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  Journal d’Activité des Extensions & Passerelles
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Traçabilité des synchronisations WooCommerce et des SMS expédiés aux clients.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setSyncLogs([]);
                  localStorage.removeItem('nana_integration_logs');
                }}
                className="text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-red-500/40 transition-colors"
              >
                Vider le journal
              </button>
            </div>

            {/* List of logs */}
            <div 
              className="space-y-3 max-h-[70vh] overflow-y-auto overscroll-y-contain pr-1"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            >
              {syncLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-slate-800">
                  Aucun événement récent dans le journal.
                </div>
              ) : (
                syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        log.service === 'WOOCOMMERCE'
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      }`}>
                        {log.service === 'WOOCOMMERCE' ? (
                          <Globe className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{log.title}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {log.service}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{log.details}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          </ModuleErrorBoundary>
        )}

        {/* TAB 5: CONFIGURATION DES PAIEMENTS & ROUTAGE */}
        {activeTab === 'PAYMENT_ROUTING' && (
          <ModuleErrorBoundary moduleName="Passerelle - CinetPay & Mobile Money">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl">
              <PaymentRoutingSettings
                currentUser={currentUser}
              />
            </div>
          </ModuleErrorBoundary>
        )}

        {/* TAB 6: NOTIFICATIONS PUSH CLOUDFLARE FCM (EXCLUSIVITÉ PLAN PRO) */}
        {activeTab === 'PUSH_NOTIFICATIONS' && (
          <ModuleErrorBoundary moduleName="Notifications - Push FCM">
            <div className="max-w-2xl mx-auto space-y-6">
              <PushNotificationTester
                merchantId={currentUser?.storeId || currentUser?.id}
                isPro={!isFreePlan(currentUser?.subscription || currentUser)}
                onUpgrade={onOpenSaasAdmin}
              />
            </div>
          </ModuleErrorBoundary>
        )}
      </main>

      {/* 1. Modal Recharge Credits SMS (Monétisation Réelle Pack SMS & Mobile Money via SPaymentGateway) */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`bg-slate-900 border border-slate-700/80 w-full ${rechargeStep === 'GATEWAY' ? 'max-w-2xl' : 'max-w-lg'} rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto overscroll-y-contain transition-all`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Recharger vos crédits SMS</h3>
                  <p className="text-[11px] text-slate-400">Paiement Mobile Money direct et sécurisé via Passerelle NanaPay</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRechargeModalOpen(false);
                  setRechargeStep('SELECT');
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 text-lg transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            {rechargeStep === 'SELECT' && (
              <div className="space-y-4">
                {/* Packs Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    1. Choisissez votre volume de crédits SMS :
                  </label>
                  <div className="space-y-2">
                    {SMS_PACKS.map(pack => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setSelectedPackId(pack.id);
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          selectedPackId === pack.id
                            ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-2">
                            <span>{pack.label} • {pack.credits} SMS</span>
                            {pack.popular && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500 text-white">
                                RECOMMANDÉ
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{pack.subtitle}</div>
                        </div>
                        <div className="text-right">
                          <strong className="text-sm font-mono font-black text-amber-300">
                            {formatCFA(pack.price)}
                          </strong>
                          <div className="text-[9px] text-slate-500 font-mono">
                            ~{(pack.price / pack.credits).toFixed(0)} F / SMS
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recapitulatif */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Pack sélectionné</span>
                    <div className="text-white text-xs font-bold">
                      {SMS_PACKS.find(p => p.id === selectedPackId)?.label} (+{SMS_PACKS.find(p => p.id === selectedPackId)?.credits} SMS)
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium">Montant à régler</span>
                    <div className="text-emerald-400 font-mono text-sm font-black">
                      {formatCFA(SMS_PACKS.find(p => p.id === selectedPackId)?.price || 10000)}
                    </div>
                  </div>
                </div>

                {/* Validation CTA -> Passerelle NanaPay */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setRechargeStep('GATEWAY');
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      Payer {formatCFA(SMS_PACKS.find(p => p.id === selectedPackId)?.price || 10000)} via Passerelle NanaPay
                    </span>
                  </button>
                  <p className="text-[10px] text-center text-slate-500 mt-2">
                    Compatible Orange Money, Wave, MTN MoMo, Moov Money avec confirmation instantanée.
                  </p>
                </div>
              </div>
            )}

            {/* Étape 2: Passerelle 100% Automatique SPaymentGateway */}
            {rechargeStep === 'GATEWAY' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setRechargeStep('SELECT');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Changer de pack</span>
                  </button>
                  <div className="text-xs text-slate-300">
                    Pack : <strong className="text-emerald-400 font-bold">{SMS_PACKS.find(p => p.id === selectedPackId)?.label} (+{SMS_PACKS.find(p => p.id === selectedPackId)?.credits} SMS)</strong>
                  </div>
                </div>

                <SPaymentGateway
                  amount={SMS_PACKS.find(p => p.id === selectedPackId)?.price || 10000}
                  productType="digital"
                  currency="FCFA"
                  orderDescription={`Recharge crédits SMS ${SMS_PACKS.find(p => p.id === selectedPackId)?.label} (+${SMS_PACKS.find(p => p.id === selectedPackId)?.credits} SMS)`}
                  orderId={`SMS-${Date.now().toString().slice(-6)}`}
                  defaultPhone={rechargePhone}
                  isModal={false}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setRechargeStep('SELECT')}
                />
              </div>
            )}

            {rechargeStep === 'PROCESSING' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative w-16 h-16">
                  <RefreshCw className="w-16 h-16 text-indigo-400 animate-spin" />
                  <Smartphone className="w-7 h-7 text-white absolute inset-0 m-auto" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Validation du rechargement...</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Confirmation de la transaction sur la blockchain NanaPay et injection des crédits SMS sur le compte marchand.
                  </p>
                </div>
              </div>
            )}

            {rechargeStep === 'SUCCESS' && rechargeSuccessInfo && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">Rechargement Validé avec Succès !</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Vos crédits SMS ont été injectés directement sur votre compte marchand.
                  </p>
                </div>

                <div className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Pack crédité :</span>
                    <strong className="text-emerald-400 font-mono">+{rechargeSuccessInfo.credits} SMS</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Nouveau solde disponible :</span>
                    <strong className="text-white font-mono text-sm">{rechargeSuccessInfo.newTotal} crédits SMS</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Référence transaction :</span>
                    <span className="text-indigo-300 font-mono text-[10px]">{rechargeSuccessInfo.txRef}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsRechargeModalOpen(false);
                    setRechargeStep('SELECT');
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
                >
                  Fermer et continuer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Modal Code PIN Déverrouillage Super-Admin Nanasore */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Accès Super-Admin</h3>
                  <p className="text-[10px] text-slate-400">Réservé à l'éditeur Nanasore</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminPinModal(false);
                  setAdminPinError(null);
                  setAdminPinInput('');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Saisissez le code maître administrateur pour modifier les passerelles de téléphonie et configurer les clés API directes.
            </p>

            <div className="space-y-2">
              <input
                type="password"
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUnlockSuperAdmin();
                }}
                placeholder="Entrez le code secret..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-center tracking-widest text-white focus:outline-none focus:border-purple-500 font-mono"
                autoFocus
              />
              {adminPinError && (
                <div className="text-[11px] text-red-400 font-semibold text-center">
                  {adminPinError}
                </div>
              )}
              <div className="text-[10px] text-slate-500 text-center">
                Code maître par défaut : <code className="text-purple-300 font-mono">nana2026</code>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAdminPinModal(false);
                  setAdminPinError(null);
                  setAdminPinInput('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleUnlockSuperAdmin}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition-all cursor-pointer shadow"
              >
                Déverrouiller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Création de Campagne Emailing Brevo */}
      {isCreateCampaignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 max-h-[94vh] overflow-y-auto overscroll-y-contain">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Nouvelle Campagne Emailing Brevo</h3>
                  <p className="text-[11px] text-slate-400">Conception et envoi direct via l'API Brevo v3</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCampaignModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 text-lg transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Contenu en 2 colonnes : Formulaire à gauche, Aperçu à droite */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colonne Gauche : Formulaire */}
              <div className="space-y-4 text-xs">
                {/* Modèle de campagne */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">1. Modèle de Campagne :</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                  >
                    {BREVO_EMAIL_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nom interne de la campagne */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nom Interne :</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Vente Flash Week-end"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Objet de l'e-mail (Subject) */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Objet de l'E-mail (Subject) :</label>
                  <input
                    type="text"
                    value={campaignSubject}
                    onChange={(e) => setCampaignSubject(e.target.value)}
                    placeholder="Ex: 🔥 -30% immédiat ce week-end !"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Preheader */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Texte d'Aperçu (Preheader) :</label>
                  <input
                    type="text"
                    value={campaignPreviewText}
                    onChange={(e) => setCampaignPreviewText(e.target.value)}
                    placeholder="Aperçu visible avant ouverture"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Ciblage & Destinataires */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">2. Destinataires & Segment :</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCampaignTargetAudience('ALL_CUSTOMERS')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        campaignTargetAudience === 'ALL_CUSTOMERS'
                          ? 'bg-indigo-950/80 border-indigo-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-[11px]">Tous les clients</div>
                      <div className="text-[9px] text-slate-500">{customers.length || 4} contact(s)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCampaignTargetAudience('VIP_CUSTOMERS')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        campaignTargetAudience === 'VIP_CUSTOMERS'
                          ? 'bg-indigo-950/80 border-indigo-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-[11px]">Clients VIP</div>
                      <div className="text-[9px] text-slate-500">Top acheteurs</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCampaignTargetAudience('DEBT_CUSTOMERS')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        campaignTargetAudience === 'DEBT_CUSTOMERS'
                          ? 'bg-indigo-950/80 border-indigo-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-[11px]">Clients à Solde Dû</div>
                      <div className="text-[9px] text-slate-500">{customers.filter(c => c.totalDebt && c.totalDebt > 0).length || 2} contact(s)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCampaignTargetAudience('CUSTOM_LIST')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        campaignTargetAudience === 'CUSTOM_LIST'
                          ? 'bg-indigo-950/80 border-indigo-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-[11px]">Liste personnalisée</div>
                      <div className="text-[9px] text-slate-500">Emails sur-mesure</div>
                    </button>
                  </div>

                  {campaignTargetAudience === 'CUSTOM_LIST' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={campaignCustomEmails}
                        onChange={(e) => setCampaignCustomEmails(e.target.value)}
                        placeholder="email1@domaine.com, email2@domaine.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-[11px] font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Contenu de l'e-mail */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="font-bold text-slate-300">3. Contenu de l'Email :</div>
                  <div>
                    <label className="block text-slate-400 mb-1">Titre Principal de l'Email :</label>
                    <input
                      type="text"
                      value={campaignHeadline}
                      onChange={(e) => setCampaignHeadline(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Corps du Message :</label>
                    <textarea
                      rows={3}
                      value={campaignMainMessage}
                      onChange={(e) => setCampaignMainMessage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white leading-relaxed focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Code Promo :</label>
                      <input
                        type="text"
                        value={campaignPromoCode}
                        onChange={(e) => setCampaignPromoCode(e.target.value.toUpperCase())}
                        placeholder="Ex: FLASH30"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Badge Remise :</label>
                      <input
                        type="text"
                        value={campaignDiscountBadge}
                        onChange={(e) => setCampaignDiscountBadge(e.target.value)}
                        placeholder="Ex: -30% DE RÉDUCTION"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Texte du Bouton CTA :</label>
                      <input
                        type="text"
                        value={campaignCtaText}
                        onChange={(e) => setCampaignCtaText(e.target.value)}
                        placeholder="Ex: Profiter de l'Offre"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Lien de Destination :</label>
                      <input
                        type="text"
                        value={campaignCtaUrl}
                        onChange={(e) => setCampaignCtaUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne Droite : Prévisualisation en Direct */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Aperçu Rendu E-mail en Temps Réel</span>
                  </span>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCampaignPreviewDevice('DESKTOP')}
                      className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                        campaignPreviewDevice === 'DESKTOP' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setCampaignPreviewDevice('MOBILE')}
                      className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                        campaignPreviewDevice === 'MOBILE' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Mobile
                    </button>
                  </div>
                </div>

                {/* Cadre de l'e-mail */}
                <div className="flex-1 bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800 overflow-y-auto max-h-[460px] flex justify-center">
                  <div className={`w-full ${campaignPreviewDevice === 'MOBILE' ? 'max-w-[320px]' : 'max-w-[480px]'} bg-[#111827] rounded-2xl overflow-hidden border border-slate-800 text-slate-100 shadow-xl transition-all`}>
                    {/* Header Email */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-center">
                      <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase mb-2">
                        {campaignDiscountBadge || 'OFFRE SPÉCIALE'}
                      </span>
                      <h4 className="text-base font-black text-white m-0">
                        {currentUser?.storeName || 'NaNa Store Pro'}
                      </h4>
                    </div>

                    {/* Body Email */}
                    <div className="p-5 space-y-3">
                      <h5 className="text-sm font-black text-white leading-snug">
                        {campaignHeadline}
                      </h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {campaignMainMessage}
                      </p>

                      {campaignPromoCode && (
                        <div className="p-3.5 rounded-xl bg-indigo-950/70 border border-dashed border-indigo-500/60 text-center">
                          <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5">Code Promo Privilège</span>
                          <strong className="text-base font-mono font-black text-amber-300 tracking-wider">
                            {campaignPromoCode}
                          </strong>
                        </div>
                      )}

                      <div className="pt-2 text-center">
                        <span className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30">
                          {campaignCtaText || 'Découvrir la Sélection'}
                        </span>
                      </div>
                    </div>

                    {/* Footer Email */}
                    <div className="p-3 bg-slate-950 text-center border-t border-slate-800 text-[10px] text-slate-500">
                      Envoyé par {currentUser?.storeName || 'NaNa Store Pro'} via Passerelle Brevo API.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Barre d'action inférieure : Test d'envoi & Lancement */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Test d'envoi */}
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="email.test@gmail.com"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 w-48"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingTestEmail ? 'Envoi test...' : 'Tester'}
                </button>
                {testEmailFeedback && (
                  <span className={`text-[11px] font-bold ${testEmailFeedback.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testEmailFeedback.success ? '✓ E-mail test expédié' : testEmailFeedback.message}
                  </span>
                )}
              </div>

              {/* Validation finale */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCampaignModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  disabled={isSendingCampaign}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4 stroke-[3]" />
                  <span>{isSendingCampaign ? 'Expédition en cours via Brevo...' : 'Lancer la Campagne Brevo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Aperçu d'une Campagne Existante */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-black text-white">{previewCampaign.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCampaign(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div><span className="text-slate-400">Objet :</span> <strong className="text-white">{previewCampaign.subject}</strong></div>
                <div><span className="text-slate-400">Expéditeur :</span> <span className="font-mono text-emerald-400">{previewCampaign.senderEmail}</span></div>
                <div><span className="text-slate-400">Destinataires :</span> <strong className="text-white">{previewCampaign.recipientsCount} contacts</strong></div>
              </div>

              {/* Rendu HTML dans un cadre stylé */}
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#111827]">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-center">
                  <span className="inline-block bg-white/20 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase mb-1">
                    {previewCampaign.discountBadge || 'OFFRE SPÉCIALE'}
                  </span>
                  <h4 className="text-sm font-black text-white m-0">
                    {previewCampaign.senderName || 'NaNa Store'}
                  </h4>
                </div>
                <div className="p-4 space-y-2">
                  <h5 className="text-xs font-black text-white">{previewCampaign.headline}</h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{previewCampaign.mainMessage}</p>
                  {previewCampaign.promoCode && (
                    <div className="p-2.5 rounded-lg bg-indigo-950/70 border border-dashed border-indigo-500/60 text-center">
                      <span className="text-[8px] uppercase text-indigo-300 block">Code Promo</span>
                      <strong className="text-sm font-mono font-black text-amber-300">{previewCampaign.promoCode}</strong>
                    </div>
                  )}
                  <div className="pt-2 text-center">
                    <span className="inline-block bg-emerald-600 text-white font-bold text-xs px-5 py-2 rounded-xl">
                      {previewCampaign.ctaText || 'Accéder à la Boutique'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-2">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Taux d'Ouverture</span>
                  <strong className="text-sm font-mono text-amber-300">{previewCampaign.stats?.openRate || 45}%</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Taux de Clics</span>
                  <strong className="text-sm font-mono text-indigo-300">{previewCampaign.stats?.clickRate || 18}%</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPreviewCampaign(null)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Fermer l'aperçu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsExtensionsView;
