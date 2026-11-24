import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Smartphone,
  Truck,
  Tag,
  ShoppingBag,
  Phone,
  User,
  Mail,
  MapPin,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  X,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Download,
  FileText,
  Store,
  Receipt,
  Video
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime, playCancelSound, formatCFA } from '../../../utils/audio';
import { supabase } from '@/lib/supabase';
import {
  initiateSPayment,
  verifySPayment,
  SCollectionResponse
} from '../../../services/paymentApiService';
import { extractTransactionReferenceFromSms } from '../../../services/smsPaymentService';
import { getOperatorLogo } from '../../../utils/operatorLogos';
import { ALL_20_COUNTRIES_CONFIG, detectCountryFromPhone, CountryPaymentConfigItem, getDynamicFailoverNotice } from '../../../utils/countryPaymentConfig';
import {
  DigitalReceiptPayload,
  downloadDigitalReceiptPdf,
  getDigitalReceiptWhatsAppUrl,
  sendDigitalReceiptViaApi
} from '../../digitalReceiptService';
import { recordAffiliateSaleCommission } from '../../liveAffiliateService';
import { recordUnifiedOrder } from '../../../services/supabaseOrderService';

const LazyBuyerLiveCallButton = React.lazy(() =>
  import('../../../components/live/BuyerLiveCallButton').then((m) => ({
    default: m.BuyerLiveCallButton || (m as any).default,
  }))
);

// =============================================================================
// TYPES DU CHECKOUT FINTECH ULTIME
// =============================================================================

export interface CheckoutProductSummary {
  id?: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  description?: string;
  quantity?: number;
  items?: Array<{
    id?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  }>;
}

export interface PaymentSuccessDetails {
  transactionId: string;
  amount: number;
  currency: string;
  country?: any;
  operator?: any;
  phoneNumber?: string;
  customerName?: string;
  deliveryAddress?: string;
  customerEmail?: string;
  paymentMethod: 'CASH_ON_DELIVERY' | 'MOBILE_MONEY' | 'PHYSICAL_POS_TOKEN' | string;
  timestamp: number;
  status: string;
  orderId?: string;
  posToken?: string;
}

export interface UltimateCheckoutProps {
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  product?: CheckoutProductSummary;
  amount?: number;
  currency?: string;
  orderDescription?: string;
  orderId?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  defaultCustomerName?: string;
  defaultEmail?: string;
  storeName?: string;
  wPhone?: string;
  whatsappPhone?: string;
  items?: Array<{ product: any; quantity: number }>;
  storeConfig?: any;
  merchantId?: string;
  onClearCart?: () => void;
  sellerConfig?: any;
  onSuccess?: (details: PaymentSuccessDetails) => void;
  onCancel?: () => void;
  onBackToStore?: () => void;
  initialStep?: 'STEP_1' | 'STEP_2B' | 'STEP_3';
  /** Active l'option "Ticket Caisse Physique (TK-...)" UNIQUEMENT pour le Mini-Market (jamais pour abonnements/digital) */
  enablePhysicalPosToken?: boolean;
}

export interface OperatorOption {
  id: string;
  name: string;
  code: string;
  needsOtp?: boolean;
  brandColor?: string;
  ussdTemplate?: string; // Ex: "*144*4*6*{amount}#" ou "*144*4*6#"
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  currency: string;
  defaultCity: string;
  operators: OperatorOption[];
}

// Catalogue complet des 20 pays supportés par le Routeur SebPay
export const CHECKOUT_COUNTRIES: CountryOption[] = ALL_20_COUNTRIES_CONFIG as unknown as CountryOption[];

// =============================================================================
// COMPOSANT EFFET CONFETTI LÉGER HAUTE PERFORMANCE
// =============================================================================

const MiniConfettiShower: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];
    const particles: Array<{
      x: number;
      y: number;
      r: number;
      d: number;
      color: string;
      tilt: number;
      tiltAngleIncremental: number;
      tiltAngle: number;
    }> = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * 40 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
        tiltAngle: 0
      });
    }

    let animationFrameId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(angle + p.d) + 2.5 + p.r / 2) * 1.2;
        p.x += Math.sin(angle);
        p.tilt = Math.sin(p.tiltAngle) * 12;

        ctx.beginPath();
        ctx.lineWidth = p.r / 1.5;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 3, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 3);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const timer = setTimeout(() => {
      cancelAnimationFrame(animationFrameId);
    }, 4500);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-30 w-full h-full"
    />
  );
};

// =============================================================================
// COMPOSANT PRINCIPAL CHECKOUT ULTIME
// =============================================================================

export const UltimateCheckout: React.FC<UltimateCheckoutProps> = ({
  isModal = false,
  isOpen,
  onClose,
  product,
  amount,
  currency = 'FCFA',
  orderDescription,
  orderId: propOrderId,
  defaultPhone = '',
  defaultAddress = '',
  defaultCustomerName = '',
  defaultEmail = '',
  storeName,
  wPhone,
  whatsappPhone,
  items,
  storeConfig,
  merchantId,
  onClearCart,
  sellerConfig,
  onSuccess,
  onCancel,
  onBackToStore,
  initialStep,
  enablePhysicalPosToken = false
}) => {
  const effectiveStoreName = storeName || storeConfig?.storeName || 'NaNa Store';
  const effectiveWPhone = wPhone || whatsappPhone || storeConfig?.whatsappPhone || '+22665565805';

  const handleClose = useCallback(() => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
    else if (onBackToStore) onBackToStore();
  }, [onClose, onCancel, onBackToStore]);

  // 1. Identifiant unique de commande sécurisé
  const [orderId] = useState<string>(() => {
    return propOrderId || `CHK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  });

  // 2. Définition du Produit et Prix
  const resolvedProduct = useMemo<CheckoutProductSummary>(() => {
    if (product) return product;
    if (items && items.length > 0) {
      const total = items.reduce((sum, it) => sum + ((it.product?.price || 0) * (it.quantity || 1)), 0);
      return {
        id: items[0].product?.id || 'direct-item',
        name: items.length === 1 ? items[0].product?.name : `Commande (${items.length} articles)`,
        price: total,
        originalPrice: Math.round(total * 1.25),
        imageUrl: items[0].product?.image || items[0].product?.imageUrl || '',
        description: items.map(i => `${i.product?.name || 'Article'} x${i.quantity || 1}`).join(', '),
        quantity: items.reduce((sum, it) => sum + (it.quantity || 1), 0),
        items: items.map(i => ({
          id: i.product?.id || 'prod',
          name: i.product?.name || 'Article',
          price: i.product?.price || 0,
          quantity: i.quantity || 1,
          imageUrl: i.product?.image || i.product?.imageUrl
        }))
      };
    }
    return {
      id: 'item-default',
      name: orderDescription || 'Article NaNa Store Premium',
      price: amount || 15000,
      originalPrice: (amount || 15000) * 1.3,
      description: 'Produit certifié authentique • Garantie satisfaction & livraison soignée.',
      imageUrl: ''
    };
  }, [product, items, amount, orderDescription]);

  // Détection stricte d'abonnement / licence SaaS / recharge Pay-as-you-go (zéro faux positif sur prod_*, caisse_* ou articles physiques)
  const isSubscriptionProduct = useMemo(() => {
    if (enablePhysicalPosToken) return false;
    const id = (resolvedProduct.id || '').toLowerCase().trim();
    const name = (resolvedProduct.name || '').toLowerCase().trim();
    const desc = (resolvedProduct.description || '').toLowerCase().trim();
    const exactSubIds = new Set(['pro', 'business', 'enterprise', 'starter', 'elite', 'custom_modular', 'pay_as_you_go_recharge']);
    return (
      exactSubIds.has(id) ||
      id.startsWith('sub_') ||
      id.startsWith('plan_') ||
      id.startsWith('nanasore_') ||
      name.includes('abonnement') ||
      name.includes('licence') ||
      name.includes('pay-as-you-go') ||
      name.startsWith('plan ') ||
      name.startsWith('recharge pay-as-you-go') ||
      desc.includes('abonnement saas') ||
      desc.includes('licence') ||
      desc.includes('crédit pay-as-you-go') ||
      (resolvedProduct as any).itemType === 'subscription' ||
      (resolvedProduct as any).itemType === 'recharge'
    );
  }, [resolvedProduct, enablePhysicalPosToken]);

  // Détection si l'article commandé est un produit numérique (déclaré AVANT isCashlessOnly pour éviter toute TDZ)
  const isDigitalProduct = Boolean(
    !enablePhysicalPosToken && (
      (resolvedProduct as any)?.is_digital ||
      (resolvedProduct as any)?.category?.toLowerCase?.().includes('digital') ||
      (resolvedProduct as any)?.category?.toLowerCase?.().includes('numérique') ||
      (resolvedProduct as any)?.category?.toLowerCase?.().includes('e-book') ||
      (resolvedProduct as any)?.category?.toLowerCase?.().includes('pdf') ||
      (resolvedProduct as any)?.category?.toLowerCase?.().includes('formation') ||
      resolvedProduct.name?.toLowerCase?.().includes('.pdf') ||
      resolvedProduct.name?.toLowerCase?.().includes('.zip') ||
      resolvedProduct.name?.toLowerCase?.().includes('.mp4')
    )
  );

  // 3. Navigation d'étapes (Étape 1: Formulaire & Choix, Étape 2B: Mobile Money, Étape 3: Succès)
  const [currentStep, setCurrentStep] = useState<'STEP_1' | 'STEP_2B' | 'STEP_3'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('step') === '2b' || p.get('step') === '2B') return 'STEP_2B';
      if (p.get('step') === '3') return 'STEP_3';
    }
    return initialStep || 'STEP_1';
  });

  // 4. États Étape 1 : Formulaire Minimaliste
  const [customerName, setCustomerName] = useState(() => {
    return defaultCustomerName || (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_name') || '' : '');
  });

  const [deliveryPhone, setDeliveryPhone] = useState(() => {
    return defaultPhone || (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_phone') || '' : '');
  });

  const [customerEmail, setCustomerEmail] = useState(() => {
    return defaultEmail || (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_email') || '' : '');
  });

  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(() => {
    return CHECKOUT_COUNTRIES[0]; // Burkina Faso par défaut
  });

  const [city, setCity] = useState(() => {
    const savedCity = defaultAddress || (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_address') || '' : '');
    return savedCity || selectedCountry.defaultCity;
  });

  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    return defaultAddress || (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_address') || '' : '');
  });

  // Code Promo discret
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number; discountAmount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Paiement 100% digital obligatoire UNIQUEMENT pour abonnements, recharges et produits numériques (jamais pour produits physiques / Mini-Market)
  const isCashlessOnly = Boolean(!enablePhysicalPosToken && (isSubscriptionProduct || isDigitalProduct));

  // Option Caisse Physique STRICTEMENT réservée au Mini-Market (jamais pour abonnements, recharges ou produits numériques)
  const showPhysicalPosOption = Boolean(enablePhysicalPosToken && !isCashlessOnly);
  const [copiedPosToken, setCopiedPosToken] = useState(false);

  // Le Choix Crucial : Option A (Paiement à la livraison), Option B (Mobile Money), Option C (Ticket Caisse Physique si Mini-Market)
  const [paymentChoice, setPaymentChoice] = useState<'COD' | 'MOMO' | 'POS_TOKEN'>(() => {
    if (isCashlessOnly) return 'MOMO';
    const savedMethod = typeof window !== 'undefined' ? localStorage.getItem('nana_customer_payment_method') : '';
    return savedMethod === 'cod' ? 'COD' : 'MOMO';
  });

  // Verrou sécurité : si abonnement / recharge / digital, on force toujours MOMO
  useEffect(() => {
    if (isCashlessOnly && paymentChoice !== 'MOMO') {
      setPaymentChoice('MOMO');
    }
  }, [isCashlessOnly, paymentChoice]);

  // Synchronisation automatique si de nouvelles coordonnées sont injectées depuis le mini-checkout du Funnel
  useEffect(() => {
    if (defaultCustomerName) setCustomerName(defaultCustomerName);
    if (defaultPhone) {
      setDeliveryPhone(defaultPhone);
      setPaymentPhone(defaultPhone);
    }
    if (defaultAddress) {
      setCity(defaultAddress);
      setDeliveryAddress(defaultAddress);
    }
    if (isCashlessOnly) {
      setPaymentChoice('MOMO');
    } else if (typeof window !== 'undefined') {
      const savedMethod = localStorage.getItem('nana_customer_payment_method');
      if (savedMethod === 'cod') setPaymentChoice('COD');
      else if (savedMethod) setPaymentChoice('MOMO');
    }
  }, [defaultCustomerName, defaultPhone, defaultAddress, isOpen, isCashlessOnly]);

  // 5. États Étape 2B : L'Expérience Mobile Money Premium
  const [selectedOperator, setSelectedOperator] = useState<OperatorOption>(() => selectedCountry.operators[0]);
  
  // LOGIQUE REACT DU NUMÉRO : hérite du numéro de l'Étape 1 mais reste 100% indépendant et modifiable !
  const [paymentPhone, setPaymentPhone] = useState<string>(() => deliveryPhone);

  // Synchronisation initiale quand l'utilisateur change son téléphone à l'Étape 1 (sans écraser si modifié en 2B)
  const hasUserEditedPaymentPhone = useRef(false);
  useEffect(() => {
    if (!hasUserEditedPaymentPhone.current && deliveryPhone) {
      setPaymentPhone(deliveryPhone);
    }
  }, [deliveryPhone]);

  // Code OTP (Pays hors BF) & SMS / ID de paiement (Burkina Faso)
  const [otpCode, setOtpCode] = useState('');
  const [bfSmsInput, setBfSmsInput] = useState('');
  const [bfExtractedTxId, setBfExtractedTxId] = useState('');
  const [bfSmsStatus, setBfSmsStatus] = useState<'IDLE' | 'CHECKING' | 'WAITING_REALTIME' | 'MATCHED' | 'ERROR'>('IDLE');
  const [bfSmsNotice, setBfSmsNotice] = useState<string | null>(null);
  const [moovRedirectNotice, setMoovRedirectNotice] = useState<string | null>(null);
  const [isCopiedUssd, setIsCopiedUssd] = useState(false);
  const bfExtractedTxIdRef = useRef('');
  const bfSmsInputRef = useRef('');
  const bfVerificationDoneRef = useRef(false);

  // Support WhatsApp (15 min) & Confirmation verte avec compte à rebours
  const [showBfSupportForm, setShowBfSupportForm] = useState(false);
  const [bfSupportName, setBfSupportName] = useState('');
  const [bfSupportPhone, setBfSupportPhone] = useState('');
  const [bfSupportTxId, setBfSupportTxId] = useState('');
  const [bfSupportNote, setBfSupportNote] = useState('');
  const [bfRedirectCountdown, setBfRedirectCountdown] = useState<number | null>(null);
  const pendingBfSuccessDetailsRef = useRef<PaymentSuccessDetails | null>(null);
  const bfOnSuccessTriggeredRef = useRef(false);

  // Traitement en cours & validation
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [sResponse, setSResponse] = useState<SCollectionResponse | null>(null);
  const [failoverAlert, setFailoverAlert] = useState<{ active: boolean; url: string; message?: string } | null>(null);

  // 6. Succès & Détails finaux
  const [completedDetails, setCompletedDetails] = useState<PaymentSuccessDetails | null>(null);
  const affiliateRecordedTxRef = useRef<string | null>(null);

  // Calculs financiers dynamiques (déclarés AVANT le useEffect qui dépend de finalTotal pour éviter toute TDZ)
  const subtotal = resolvedProduct.price;
  const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (!completedDetails) return;
    const txKey = completedDetails.transactionId || `${completedDetails.timestamp}`;
    if (affiliateRecordedTxRef.current === txKey) return;
    affiliateRecordedTxRef.current = txKey;

    const prodAny = (product || resolvedProduct) as any;
    const isAffiliateAllowed = prodAny?.affiliateEnabled !== false;
    const commPercent = Number(prodAny?.affiliateCommissionPercent) || 10;

    if (isAffiliateAllowed && commPercent > 0) {
      recordAffiliateSaleCommission({
        merchantId: merchantId || storeConfig?.slug || 'boutique',
        productId: resolvedProduct?.id,
        productName: resolvedProduct?.name || orderDescription || 'Commande Nanasore',
        orderAmount: completedDetails.amount || finalTotal || 0,
        commissionPercent: commPercent,
        buyerName: completedDetails.customerName || customerName,
        buyerContact: completedDetails.phoneNumber || completedDetails.customerEmail || paymentPhone,
        transactionId: completedDetails.transactionId,
      }).catch(() => {});
    }
  }, [completedDetails, product, resolvedProduct, merchantId, storeConfig?.slug, orderDescription, finalTotal, customerName, paymentPhone]);

  // Synchronisation du pays
  const handleSelectCountry = (country: CountryOption) => {
    setSelectedCountry(country);
    setSelectedOperator(country.operators[0]);
    if (!city || city === selectedCountry.defaultCity) {
      setCity(country.defaultCity);
    }
    playTapBeep();
  };

  // Détection automatique du pays par l'indicatif téléphonique saisi en direct
  const handlePhoneInputWithAutoDetect = (rawInput: string, isPaymentInput: boolean = false) => {
    if (isPaymentInput) {
      setPaymentPhone(rawInput);
      hasUserEditedPaymentPhone.current = true;
    } else {
      setDeliveryPhone(rawInput);
      if (!hasUserEditedPaymentPhone.current) {
        setPaymentPhone(rawInput);
      }
    }
    if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));

    // Détection automatique en direct parmi les 20 pays
    const detected = detectCountryFromPhone(rawInput);
    if (detected && detected.code !== selectedCountry.code) {
      const countryOption = detected as unknown as CountryOption;
      setSelectedCountry(countryOption);
      setSelectedOperator(countryOption.operators[0]);
      if (!city || city === selectedCountry.defaultCity) {
        setCity(countryOption.defaultCity);
      }
    }
  };

  // Application du code promo
  const handleApplyPromo = () => {
    playTapBeep();
    setPromoError(null);
    const clean = promoInput.trim().toUpperCase();
    if (!clean) return;

    if (clean === 'NANA' || clean === 'VIP10' || clean === 'PROMO' || clean === 'REMISE') {
      const discount = Math.round(subtotal * 0.1);
      setAppliedPromo({
        code: clean,
        discountPercent: 10,
        discountAmount: discount
      });
      playValidationBeep();
    } else if (clean === 'ELITE20' || clean === 'FINTECH') {
      const discount = Math.round(subtotal * 0.2);
      setAppliedPromo({
        code: clean,
        discountPercent: 20,
        discountAmount: discount
      });
      playValidationBeep();
    } else {
      setPromoError('Code invalide ou expiré');
      playCancelSound();
    }
  };

  // Validation des champs de l'Étape 1
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!customerName.trim()) {
      errors.name = 'Veuillez saisir votre nom et prénom';
    }
    if (!deliveryPhone.trim() || deliveryPhone.trim().length < 6) {
      errors.phone = 'Veuillez saisir un numéro de téléphone valide';
    }
    if (!isCashlessOnly && paymentChoice !== 'POS_TOKEN' && !deliveryAddress.trim()) {
      errors.address = 'Veuillez renseigner votre adresse ou quartier';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      playCancelSound();
      return false;
    }
    return true;
  };

  // Enregistrement persistent des infos clients
  const persistCustomerData = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nana_customer_name', customerName.trim());
        localStorage.setItem('nana_customer_phone', deliveryPhone.trim());
        localStorage.setItem('nana_customer_address', deliveryAddress.trim());
        if (customerEmail.trim()) {
          localStorage.setItem('nana_customer_email', customerEmail.trim());
        }
      } catch {}
    }
  };

  // =============================================================================
  // FLUX ÉTAPE 2A : VALIDATION PAIEMENT À LA LIVRAISON (COD)
  // =============================================================================
  const handleConfirmCodOrder = async () => {
    if (!validateStep1()) return;

    playTapBeep();
    setIsProcessingPayment(true);
    persistCustomerData();

    const details: PaymentSuccessDetails = {
      transactionId: `COD-${Date.now().toString(36).toUpperCase()}`,
      orderId,
      amount: finalTotal,
      currency,
      customerName: customerName.trim(),
      phoneNumber: deliveryPhone.trim(),
      deliveryAddress: `${city.trim()}, ${deliveryAddress.trim()}`,
      customerEmail: customerEmail.trim() || undefined,
      paymentMethod: 'CASH_ON_DELIVERY',
      country: selectedCountry,
      operator: { id: 'cod', name: 'Paiement à la livraison (Espèces)' },
      timestamp: Date.now(),
      status: 'CONFIRMED'
    };

    // Sauvegarde en base Supabase SQL (sales & app_registry)
    try {
      await supabase.from('sales').insert({
        total_amount: finalTotal,
        payment_method: 'CASH_ON_DELIVERY',
        status: 'EN_ATTENTE_LIVRAISON',
        is_paid: false
      }).catch(() => {});

      await supabase.from('app_registry').upsert({
        key: `order_${orderId}`,
        name: `order_${orderId}`,
        tenant_id: 'default',
        module_key: 'orders',
        config_json: {
          orderId,
          customerName: details.customerName,
          customerPhone: details.phoneNumber,
          deliveryAddress: details.deliveryAddress,
          customerEmail: details.customerEmail || null,
          total: finalTotal,
          subtotal,
          discount: discountAmount,
          currency,
          paymentMethod: 'CASH_ON_DELIVERY',
          status: 'EN_ATTENTE_LIVRAISON',
          createdAt: Date.now(),
          product: {
            name: resolvedProduct.name,
            price: resolvedProduct.price
          }
        }
      }, { onConflict: 'key' });
    } catch (e) {
      console.warn('[ORDER SAVE] Info sauvegarde Supabase :', e);
    }

    setTimeout(() => {
      setIsProcessingPayment(false);
      setCompletedDetails(details);
      setCurrentStep('STEP_3');
      playCashChime();
      if (onSuccess) onSuccess(details);
    }, 600);
  };

  // =============================================================================
  // FLUX ÉTAPE 2C (MINI-MARKET UNIQUEMENT) : TICKET CAISSE PHYSIQUE (TK-...)
  // =============================================================================
  const handleConfirmPosTokenOrder = async () => {
    if (!validateStep1()) return;

    playTapBeep();
    setIsProcessingPayment(true);
    persistCustomerData();

    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const prefix = merchantId ? merchantId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'NANA' : 'NANA';
    const token = `TK-${prefix}-${randomCode}`;

    const details: PaymentSuccessDetails = {
      transactionId: token,
      posToken: token,
      orderId,
      amount: finalTotal,
      currency,
      customerName: customerName.trim(),
      phoneNumber: deliveryPhone.trim(),
      deliveryAddress: 'Retrait & Paiement au Comptoir Boutique',
      customerEmail: customerEmail.trim() || undefined,
      paymentMethod: 'PHYSICAL_POS_TOKEN',
      country: selectedCountry,
      operator: { id: 'pos_token', name: 'Ticket Caisse Physique (Comptoir)' },
      timestamp: Date.now(),
      status: 'PENDING_POS_COUNTER'
    };

    try {
      const storedOrders = JSON.parse(localStorage.getItem('nanasore_tokens') || '[]');
      storedOrders.unshift({
        token,
        tenantId: merchantId || '',
        dealTitle: resolvedProduct.name,
        cartItems: resolvedProduct.items || [],
        grandTotal: finalTotal,
        createdAt: new Date().toISOString(),
        customerName: details.customerName,
        customerPhone: details.phoneNumber,
      });
      localStorage.setItem('nanasore_tokens', JSON.stringify(storedOrders.slice(0, 50)));
    } catch {}

    try {
      fetch('/api/payments/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          order_id: token,
          tenant_id: merchantId || '',
          amount: finalTotal,
          customer_name: details.customerName,
          customer_phone: details.phoneNumber,
          operator: 'PHYSICAL_POS_TOKEN',
          composed_items: resolvedProduct.items || [],
          status: 'pending_pos_counter',
        }),
      }).catch(() => {});
    } catch {}

    setTimeout(() => {
      setIsProcessingPayment(false);
      setCompletedDetails(details);
      setCurrentStep('STEP_3');
      playValidationBeep();
      if (onSuccess) onSuccess(details);
    }, 450);
  };

  // Passage à l'Étape 2B (Mobile Money)
  const handleProceedToMomo = () => {
    if (!validateStep1()) return;
    playTapBeep();
    persistCustomerData();
    setCurrentStep('STEP_2B');
  };

  // Détection Burkina Faso & Paramètres Marchands (Central vs Boutique Produit Physique)
  const isBurkinaFaso = selectedCountry.code === 'BF';
  const isPhysicalStoreContext = Boolean(storeConfig || sellerConfig);

  const customBfOrangeCode = useMemo(() => {
    const raw =
      storeConfig?.orangeMerchantCode ||
      (storeConfig as any)?.siteSettings?.orangeMerchantCode ||
      (storeConfig as any)?.themeCustomization?.orangeMerchantCode ||
      sellerConfig?.orangeMerchantCode ||
      '';
    return String(raw).replace(/[^0-9]/g, '');
  }, [storeConfig, sellerConfig]);

  const customBfWaveLink = useMemo(() => {
    return String(
      storeConfig?.wavePaymentLink ||
      (storeConfig as any)?.siteSettings?.wavePaymentLink ||
      (storeConfig as any)?.themeCustomization?.wavePaymentLink ||
      sellerConfig?.wavePaymentLink ||
      ''
    ).trim();
  }, [storeConfig, sellerConfig]);

  // Pour les produits physiques d'un marchand BF, on utilise SON code marchand ; sinon le code central (65565805) pour abonnements/wallet/digital/commissions
  const effectiveBfOrangeMerchantCode = (isPhysicalStoreContext && customBfOrangeCode)
    ? customBfOrangeCode
    : '65565805';

  const effectiveBfWaveUrl = useMemo(() => {
    if (customBfWaveLink && /^https?:\/\//i.test(customBfWaveLink)) {
      return customBfWaveLink;
    }
    return 'https://pay.wave.com/';
  }, [customBfWaveLink]);

  // Code USSD dynamique adapté à l'opérateur et au montant
  const currentUssdCode = useMemo(() => {
    if (isBurkinaFaso && selectedOperator.id === 'orange') {
      return `*144*10*${effectiveBfOrangeMerchantCode}*${Math.round(finalTotal)}#`;
    }
    if (!selectedOperator.ussdTemplate) return '*144*4*6#';
    return selectedOperator.ussdTemplate.replace('{amount}', finalTotal.toString());
  }, [isBurkinaFaso, effectiveBfOrangeMerchantCode, selectedOperator, finalTotal]);

  const handleCopyUssd = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentUssdCode);
      setIsCopiedUssd(true);
      playValidationBeep();
      setTimeout(() => setIsCopiedUssd(false), 2000);
    }
  };

  // =============================================================================
  // FLUX ÉTAPE 2B : VALIDATION S & ÉCOUTE TEMPS RÉEL (WEBHOOK / FIRESTORE)
  // =============================================================================

  // Écouteur Supabase Realtime automatique via Webhook S (0% SMS)
  useEffect(() => {
    if (!orderId || currentStep === 'STEP_3' || !isProcessingPayment) return;

    let channel: any = null;
    try {
      const channelName = `ultimate_checkout_${orderId}_${Math.random().toString(36).substring(7)}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sales',
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            if (payload.new) {
              const data = payload.new as any;
              const isPaid =
                data?.isPaid === true ||
                data?.paid === true ||
                ['COMPLETED', 'PAID', 'SUCCESS'].includes(String(data?.status || '').toUpperCase()) ||
                ['COMPLETED', 'PAID'].includes(String(data?.payment_status || '').toUpperCase());

              if (isPaid && currentStep !== 'STEP_3') {
                console.log('[S WEBHOOK DETECTED] Paiement validé par le Webhook Supabase !', data);
                setIsProcessingPayment(false);
                const successDetails: PaymentSuccessDetails = {
                  transactionId: data?.transaction_id || data?.id || orderId,
                  orderId,
                  amount: data?.amount_paid || finalTotal,
                  currency,
                  customerName: customerName.trim(),
                  phoneNumber: paymentPhone.trim() || deliveryPhone.trim(),
                  deliveryAddress: `${city.trim()}, ${deliveryAddress.trim()}`,
                  customerEmail: customerEmail.trim() || undefined,
                  paymentMethod: 'MOBILE_MONEY',
                  country: selectedCountry,
                  operator: selectedOperator,
                  timestamp: Date.now(),
                  status: 'PAID'
                };

                setCompletedDetails(successDetails);
                setCurrentStep('STEP_3');
                playCashChime();
                if (onSuccess) onSuccess(successDetails);
              } else {
                const isFailedOrCancelled =
                  ['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(String(data?.status || '').toUpperCase()) ||
                  ['FAILED', 'CANCELLED', 'CANCELED'].includes(String(data?.payment_status || '').toUpperCase());

                if (isFailedOrCancelled && isProcessingPayment) {
                  setIsProcessingPayment(false);
                  const isCanc = String(data?.status || '').toUpperCase().includes('CANCEL');
                  setPaymentError(
                    isCanc
                      ? 'Transaction annulée par l\'utilisateur ou par l\'opérateur.'
                      : (data?.error || 'Le paiement a échoué. Veuillez vérifier votre solde ou réessayer.')
                  );
                  playCancelSound();
                }
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[REALTIME ATTACH] Erreur attachement :', e);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId, isProcessingPayment, currentStep, finalTotal, currency, customerName, paymentPhone, deliveryPhone, city, deliveryAddress, customerEmail, selectedCountry, selectedOperator, onSuccess]);

  // Enregistrement obligatoire de chaque étape BF dans payment_logs (Super Admin)
  const logBfPaymentStep = useCallback(async (
    stepStatus: string,
    txIdOverride?: string | null,
    extraPayload: Record<string, any> = {}
  ) => {
    try {
      await supabase.rpc('log_bf_payment_step', {
        p_tenant_id: String(merchantId || storeConfig?.slug || 'nanasore_platform'),
        p_order_id: String(orderId),
        p_transaction_id: txIdOverride || bfExtractedTxIdRef.current || orderId,
        p_amount: Math.round(finalTotal),
        p_status: stepStatus,
        p_customer_phone: (paymentPhone || deliveryPhone || '').trim() || null,
        p_raw_payload: {
          country: selectedCountry.code,
          operator: selectedOperator.id,
          operatorName: selectedOperator.name,
          merchantCode: selectedOperator.id === 'orange' ? effectiveBfOrangeMerchantCode : null,
          customerName: customerName.trim() || null,
          productName: resolvedProduct?.name || orderDescription || null,
          ...extraPayload
        }
      });
    } catch {}
  }, [merchantId, storeConfig?.slug, orderId, finalTotal, paymentPhone, deliveryPhone, selectedCountry.code, selectedOperator.id, selectedOperator.name, effectiveBfOrangeMerchantCode, customerName, resolvedProduct?.name, orderDescription]);

  // Déclenchement final de onSuccess (après affichage de l'écran vert ou clic utilisateur)
  const handleBfContinueNow = useCallback(() => {
    if (bfOnSuccessTriggeredRef.current) return;
    bfOnSuccessTriggeredRef.current = true;
    setBfRedirectCountdown(null);
    if (onSuccess && pendingBfSuccessDetailsRef.current) {
      onSuccess(pendingBfSuccessDetailsRef.current);
    }
  }, [onSuccess]);

  // Compte à rebours de redirection douce sur l'écran vert STEP_3
  useEffect(() => {
    if (bfRedirectCountdown === null) return;
    if (bfRedirectCountdown <= 0) {
      handleBfContinueNow();
      return;
    }
    const timer = setTimeout(() => {
      setBfRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [bfRedirectCountdown, handleBfContinueNow]);

  // Finalisation immédiate d'un paiement BF vérifié par SMS / Supabase Realtime
  const completeBfSmsPaymentSuccess = useCallback((verifiedTxId: string, verifiedAmount?: number) => {
    if (bfVerificationDoneRef.current || currentStep === 'STEP_3') return;
    bfVerificationDoneRef.current = true;

    const cleanTxId = String(verifiedTxId || bfExtractedTxIdRef.current || orderId).trim();

    // Rafraîchir le champ SMS immédiatement sans autre manipulation du client
    setBfSmsInput('');
    bfSmsInputRef.current = '';
    setBfExtractedTxId('');
    bfExtractedTxIdRef.current = '';
    setBfSmsStatus('MATCHED');
    setBfSmsNotice(`Paiement confirmé en temps réel (Réf : ${cleanTxId}). Validation automatique...`);
    setPaymentError(null);
    setIsProcessingPayment(false);

    const successDetails: PaymentSuccessDetails = {
      transactionId: cleanTxId,
      orderId,
      amount: verifiedAmount && verifiedAmount > 0 ? verifiedAmount : finalTotal,
      currency,
      customerName: customerName.trim(),
      phoneNumber: paymentPhone.trim() || deliveryPhone.trim(),
      deliveryAddress: `${city.trim()}, ${deliveryAddress.trim()}`,
      customerEmail: customerEmail.trim() || undefined,
      paymentMethod: 'MOBILE_MONEY',
      country: selectedCountry,
      operator: selectedOperator,
      timestamp: Date.now(),
      status: 'PAID'
    };

    logBfPaymentStep('VALIDATED_REALTIME', cleanTxId, {
      verifiedAmount: successDetails.amount
    });

    pendingBfSuccessDetailsRef.current = successDetails;
    bfOnSuccessTriggeredRef.current = false;
    setCompletedDetails(successDetails);
    setCurrentStep('STEP_3');
    setBfRedirectCountdown(5);
    playCashChime();
  }, [currentStep, orderId, finalTotal, currency, customerName, paymentPhone, deliveryPhone, city, deliveryAddress, customerEmail, selectedCountry, selectedOperator, logBfPaymentStep]);

  // Comparaison directe avec le serveur de vérification
  const verifyBfSmsAgainstSupabase = useCallback(async (txIdCandidate: string, rawInputText: string) => {
    const cleanTx = String(txIdCandidate || '').trim();
    if (!cleanTx || cleanTx.length < 4 || bfVerificationDoneRef.current) return false;

    setBfSmsStatus('CHECKING');
    setPaymentError(null);
    setBfSmsNotice(`ID détecté (${cleanTx}) — Vérification en temps réel en cours...`);
    console.log(`[BF-CHECKOUT] Vérification paiement | orderId=${orderId} | txId=${cleanTx} | expectedAmount=${Math.round(finalTotal)} | merchantCode=${selectedOperator.id === 'orange' ? effectiveBfOrangeMerchantCode : 'WAVE'}`);
    logBfPaymentStep('ID_SUBMITTED', cleanTx, { rawInput: rawInputText || cleanTx });

    try {
      const { data, error } = await supabase.rpc('verify_bf_sms_payment', {
        p_order_id: String(orderId),
        p_transaction_id: cleanTx,
        p_expected_amount: Math.round(finalTotal),
        p_customer_phone: (paymentPhone || deliveryPhone || '').trim() || null,
        p_merchant_code: selectedOperator.id === 'orange' ? effectiveBfOrangeMerchantCode : null,
        p_operator: selectedOperator.code || selectedOperator.id,
        p_raw_input: rawInputText || cleanTx
      });

      if (error) {
        console.warn('[BF VERIFY]', error.message);
        setBfSmsStatus('WAITING_REALTIME');
        setBfSmsNotice(`ID extrait : ${cleanTx}. En attente de validation par le système...`);
        logBfPaymentStep('WAITING_REALTIME', cleanTx, { rpcError: error.message });
        return false;
      }

      if (data?.matched === true) {
        completeBfSmsPaymentSuccess(data.transaction_id || cleanTx, Number(data.amount) || finalTotal);
        return true;
      }

      if (data?.alreadyUsed) {
        setBfSmsStatus('ERROR');
        setPaymentError('Cet ID de transaction a déjà été utilisé pour une autre commande.');
        logBfPaymentStep('TRANSACTION_ALREADY_USED', cleanTx);
        playCancelSound();
        return false;
      }

      if (data?.reason === 'AMOUNT_MISMATCH') {
        setBfSmsStatus('ERROR');
        setPaymentError(
          `Montant reçu (${data.received_amount} FCFA) inférieur au montant attendu (${data.expected_amount} FCFA).`
        );
        logBfPaymentStep('AMOUNT_MISMATCH', cleanTx, {
          receivedAmount: data.received_amount,
          expectedAmount: data.expected_amount
        });
        playCancelSound();
        return false;
      }

      if (data?.reason === 'MERCHANT_CODE_MISMATCH') {
        setBfSmsStatus('ERROR');
        setPaymentError(`Ce paiement n'a pas été envoyé au numéro marchand attendu (${effectiveBfOrangeMerchantCode}).`);
        logBfPaymentStep('MERCHANT_CODE_MISMATCH', cleanTx);
        playCancelSound();
        return false;
      }

      // En attente de réception : l'écoute en direct va l'intercepter dès réception
      setBfSmsStatus('WAITING_REALTIME');
      setBfSmsNotice(`ID extrait : ${cleanTx}. En attente de validation par le système...`);
      logBfPaymentStep('WAITING_REALTIME', cleanTx);
      return false;
    } catch (err: any) {
      console.warn('[BF VERIFY]', err?.message);
      setBfSmsStatus('WAITING_REALTIME');
      setBfSmsNotice(`ID extrait : ${cleanTx}. En attente de validation par le système...`);
      logBfPaymentStep('WAITING_REALTIME', cleanTx, { error: err?.message });
      return false;
    }
  }, [orderId, finalTotal, paymentPhone, deliveryPhone, selectedOperator, effectiveBfOrangeMerchantCode, completeBfSmsPaymentSuccess, logBfPaymentStep]);

  // Réinitialiser l'état de vérification BF si l'orderId change
  useEffect(() => {
    bfVerificationDoneRef.current = false;
    bfOnSuccessTriggeredRef.current = false;
    pendingBfSuccessDetailsRef.current = null;
    setBfRedirectCountdown(null);
    setBfSmsStatus('IDLE');
    setBfSmsNotice(null);
  }, [orderId]);

  // Enregistrer automatiquement l'ouverture de STEP_2B côté Super Admin
  useEffect(() => {
    if (isBurkinaFaso && currentStep === 'STEP_2B' && orderId) {
      logBfPaymentStep('STEP_2B_OPENED', orderId);
    }
  }, [isBurkinaFaso, currentStep, orderId, logBfPaymentStep]);

  // Écoute Supabase Realtime active pendant toute la transaction Burkina Faso (STEP_2B)
  useEffect(() => {
    if (!isBurkinaFaso || currentStep !== 'STEP_2B' || !orderId) return;

    let bfChannel: any = null;
    try {
      const channelName = `bf_sms_watch_${orderId}_${Math.random().toString(36).substring(7)}`;
      console.log(`[BF-CHECKOUT] Écoute temps réel activée (${channelName})`);
      bfChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bf_sms_payments'
          },
          async (payload) => {
            if (bfVerificationDoneRef.current) return;
            const row = payload.new as any;
            console.log('[BF-CHECKOUT] Notification reçue :', row);
            if (!row || !row.transaction_id) return;

            const currentTargetTx = bfExtractedTxIdRef.current.trim().toUpperCase();
            const incomingTx = String(row.transaction_id || '').trim().toUpperCase();

            // Si le client a collé un SMS/ID, on compare immédiatement avec le SMS entrant
            if (currentTargetTx && incomingTx === currentTargetTx) {
              await verifyBfSmsAgainstSupabase(row.transaction_id, bfSmsInputRef.current);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[BF REALTIME WATCHER]', e);
    }

    return () => {
      if (bfChannel) supabase.removeChannel(bfChannel);
    };
  }, [isBurkinaFaso, currentStep, orderId, verifyBfSmsAgainstSupabase]);

  // Extraction automatique de l'ID dès que le client colle un SMS ou un ID de paiement (BF)
  const handleBfSmsInputChange = (rawVal: string) => {
    setBfSmsInput(rawVal);
    bfSmsInputRef.current = rawVal;
    setPaymentError(null);

    const trimmed = rawVal.trim();
    if (!trimmed) {
      setBfExtractedTxId('');
      bfExtractedTxIdRef.current = '';
      setBfSmsStatus('IDLE');
      setBfSmsNotice(null);
      return;
    }

    const extracted = extractTransactionReferenceFromSms(trimmed, '');
    const resolvedId = extracted || (trimmed.length >= 5 && !/\s/.test(trimmed) ? trimmed : '');
    setBfExtractedTxId(resolvedId);
    bfExtractedTxIdRef.current = resolvedId;

    if (resolvedId && resolvedId.length >= 4) {
      verifyBfSmsAgainstSupabase(resolvedId, trimmed);
    } else {
      setBfSmsStatus('IDLE');
      setBfSmsNotice('Collez le SMS complet de confirmation ou l\'ID de transaction.');
    }
  };

  // Déclenchement de la requête S (ou validation SMS Burkina Faso)
  const handleInitiateSPayment = async () => {
    const rawPhone = paymentPhone.trim();
    if (!rawPhone || rawPhone.length < 6) {
      setPaymentError('Veuillez renseigner un numéro Mobile Money valide.');
      playCancelSound();
      return;
    }

    if (isBurkinaFaso) {
      const targetId = bfExtractedTxId.trim() || extractTransactionReferenceFromSms(bfSmsInput.trim(), '');
      if (!targetId || targetId.length < 4) {
        setPaymentError("Veuillez coller le SMS de paiement reçu ou saisir l'ID de transaction.");
        playCancelSound();
        return;
      }
      setIsProcessingPayment(true);
      playTapBeep();
      const ok = await verifyBfSmsAgainstSupabase(targetId, bfSmsInput.trim());
      if (!ok) {
        setIsProcessingPayment(false);
      }
      return;
    }

    if (selectedOperator.needsOtp && !otpCode.trim()) {
      setPaymentError("Veuillez renseigner le code d'autorisation OTP de votre opérateur.");
      playCancelSound();
      return;
    }

    setPaymentError(null);
    setIsProcessingPayment(true);
    playTapBeep();

    try {
      const res = await initiateSPayment({
        orderId,
        shopName: effectiveStoreName,
        storeName: effectiveStoreName,
        amount: finalTotal,
        currency: selectedCountry.currency || 'XOF',
        country: selectedCountry.code || 'BF',
        countryCode: selectedCountry.code || 'BF',
        phone: rawPhone,
        customerPhone: rawPhone,
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        operator: selectedOperator.code || selectedOperator.id,
        provider: selectedOperator.code || selectedOperator.id,
        otpCode: selectedOperator.needsOtp ? otpCode.trim() : undefined,
        description: `Paiement ${effectiveStoreName} • ${resolvedProduct.name}`
      });

      if (!res.success && (res.error || res.message)) {
        setIsProcessingPayment(false);
        setPaymentError(res.error || res.message || 'Erreur lors de l\'initiation du paiement direct.');
        playCancelSound();
        return;
      }

      setSResponse(res);
      playValidationBeep();

      // Redirection immédiate pour LigdiCash, Wave ou passerelle externe
      const redirectLink = res.checkout_url || res.redirectUrl || res.provider_link || (res as any).paymentUrl;
      if (redirectLink && typeof window !== 'undefined') {
        if (res.failover) {
          const failoverMsg = res.message || getDynamicFailoverNotice(selectedOperator, selectedCountry);
          setFailoverAlert({
            active: true,
            url: redirectLink,
            message: failoverMsg
          });
          setTimeout(() => {
            window.location.href = redirectLink;
          }, 1800);
          return;
        }
        window.location.href = redirectLink;
        return;
      }

      // Pas de polling automatique en boucle : écoute temps réel via Firestore onSnapshot & Webhook
      // Le client est automatiquement redirigé dès réception du Webhook opérateur.

    } catch (err: any) {
      setIsProcessingPayment(false);
      setPaymentError(err.message || 'Impossible de joindre la passerelle S.');
      playCancelSound();
    }
  };

  // Bouton de vérification manuelle
  const handleManualCheck = async () => {
    setIsProcessingPayment(true);
    playTapBeep();
    try {
      const verify = await verifySPayment(orderId);
      if (verify.success || verify.isPaid) {
        setIsProcessingPayment(false);
        const successDetails: PaymentSuccessDetails = {
          transactionId: verify.data?.transaction_id || orderId,
          orderId,
          amount: finalTotal,
          currency,
          customerName: customerName.trim(),
          phoneNumber: paymentPhone.trim() || deliveryPhone.trim(),
          deliveryAddress: `${city.trim()}, ${deliveryAddress.trim()}`,
          customerEmail: customerEmail.trim() || undefined,
          paymentMethod: 'MOBILE_MONEY',
          country: selectedCountry,
          operator: selectedOperator,
          timestamp: Date.now(),
          status: 'PAID'
        };
        setCompletedDetails(successDetails);
        setCurrentStep('STEP_3');
        playCashChime();
        if (onSuccess) onSuccess(successDetails);
      } else {
        setIsProcessingPayment(false);
        setPaymentError('Paiement toujours en cours de validation. Veuillez vérifier sur votre téléphone.');
      }
    } catch (e: any) {
      setIsProcessingPayment(false);
      setPaymentError('Vérification : ' + e.message);
    }
  };

  const digitalReceiptPayload: DigitalReceiptPayload = useMemo(() => ({
    orderId,
    transactionId: completedDetails?.transactionId || orderId,
    customerName: customerName.trim() || 'Client',
    customerPhone: paymentPhone.trim() || deliveryPhone.trim(),
    customerEmail: customerEmail.trim() || undefined,
    deliveryAddress: `${city.trim()}, ${deliveryAddress.trim()}`,
    storeName: effectiveStoreName,
    storePhone: effectiveWPhone,
    storeEmail:
      storeConfig?.contactEmail ||
      (storeConfig as any)?.siteSettings?.contactEmail ||
      (storeConfig as any)?.footerEmail ||
      sellerConfig?.email ||
      sellerConfig?.contactEmail ||
      undefined,
    storeAddress: `${city.trim()} • Boutique Agréée`,
    items: resolvedProduct.items && resolvedProduct.items.length > 0
      ? resolvedProduct.items.map((i) => ({
          name: i.name,
          quantity: i.quantity || 1,
          price: i.price,
          total: (i.quantity || 1) * i.price,
          isDigital: isDigitalProduct,
          downloadUrl: `/download/${orderId}`
        }))
      : [
          {
            name: resolvedProduct.name,
            quantity: 1,
            price: finalTotal,
            total: finalTotal,
            isDigital: isDigitalProduct,
            downloadUrl: `/download/${orderId}`
          }
        ],
    totalAmount: finalTotal,
    currency,
    paymentMethod: completedDetails?.paymentMethod === 'CASH_ON_DELIVERY' ? 'Paiement à la livraison' : (selectedOperator.name || 'Mobile Money'),
    downloadUrl: `/download/${orderId}`,
    clientDashboardUrl: `/client/dashboard`,
    expiresInSeconds: 3600
  }), [orderId, completedDetails, customerName, paymentPhone, deliveryPhone, customerEmail, city, deliveryAddress, effectiveStoreName, effectiveWPhone, resolvedProduct, isDigitalProduct, finalTotal, currency, selectedOperator]);

  // Classification précise post-paiement : Campus Privé / Salle VIP vs Produit Numérique Téléchargeable
  const digitalDeliveryProfile = useMemo(() => {
    const prodAny = resolvedProduct as any;
    const prodId = String(resolvedProduct.id || '');
    const prodNameLower = String(resolvedProduct.name || '').toLowerCase();
    const prodCatLower = String(prodAny?.category || '').toLowerCase();
    const metaCourseId = prodAny?.metadata?.course_id || prodAny?.courseId || '';
    const metaSource = prodAny?.metadata?.enrollment_source || '';
    const fileKey = prodAny?.file_key || prodAny?.fileKey || prodAny?.metadata?.file_key || '';
    const fileUrl = prodAny?.downloadUrl || prodAny?.file_url || prodAny?.metadata?.file_url || '';
    const authorAllowsDownload = Boolean(prodAny?.allowDownload || prodAny?.metadata?.allow_download || fileKey || fileUrl);

    const isVipRoom = Boolean(
      prodId.startsWith('vip_') ||
      prodId.startsWith('salle_vip_') ||
      prodCatLower.includes('salle vip') ||
      prodNameLower.includes('salle vip')
    );

    const isCampusCourse = Boolean(
      metaCourseId ||
      prodId.startsWith('course_prod_') ||
      prodId.startsWith('course_') ||
      prodId.startsWith('webinar_') ||
      prodId.startsWith('live_webinar_') ||
      prodCatLower.includes('formation') ||
      prodCatLower.includes('masterclass') ||
      prodCatLower.includes('webinaire') ||
      prodCatLower.includes('académie') ||
      prodCatLower.includes('academy') ||
      prodNameLower.includes('formation') ||
      prodNameLower.includes('masterclass') ||
      prodNameLower.includes('webinaire')
    );

    const isCampusOrVip = isCampusCourse || isVipRoom;
    // Un produit numérique classique ou une formation externe avec fichier d'accès est téléchargeable ;
    // une formation Campus Privé / Salle VIP n'est téléchargeable QUE si l'auteur a explicitement attaché un fichier ou activé allowDownload.
    const canDownloadFile = isCampusOrVip ? authorAllowsDownload : Boolean(isDigitalProduct);

    return {
      isCampusOrVip,
      isVipRoom,
      isCampusCourse,
      canDownloadFile,
      fileKey,
      fileUrl,
      cleanCourseId: metaCourseId || (prodId.startsWith('course_prod_') ? prodId.replace(/^course_prod_/, '') : prodId),
      enrollmentSource:
        metaSource ||
        (prodId.startsWith('webinar_') || prodId.startsWith('live_') || prodCatLower.includes('webinaire') || prodCatLower.includes('live') || prodNameLower.includes('webinaire')
          ? 'live_webinar'
          : 'digital_pro'),
    };
  }, [resolvedProduct, isDigitalProduct]);

  // Envoi automatique du reçu + Enregistrement Bon & Commande + Notification Vendeur + Livraison Double Accès
  useEffect(() => {
    if (currentStep === 'STEP_3' && orderId) {
      sendDigitalReceiptViaApi(digitalReceiptPayload).catch(() => {});

      if (completedDetails?.paymentMethod !== 'CASH_ON_DELIVERY') {
        const targetStoreKey = merchantId || storeConfig?.slug || 'boutique';
        recordUnifiedOrder(
          {
            id: orderId,
            orderNumber: orderId,
            storeId: targetStoreKey,
            storeSlug: storeConfig?.slug || targetStoreKey,
            storeName: effectiveStoreName,
            customerName: customerName.trim() || 'Client',
            customerPhone: paymentPhone.trim() || deliveryPhone.trim(),
            deliveryAddress: `${city.trim()}, ${deliveryAddress.trim()}`,
            paymentMethod: selectedOperator?.name || 'Mobile Money',
            status: 'confirmed_paid',
            type: 'BON_COMMANDE',
            subtotal,
            total: finalTotal,
            items: digitalReceiptPayload.items.map((it) => ({
              name: it.name,
              quantity: it.quantity,
              price: it.price,
              category: it.category || 'Général',
            })),
            notes: `Réf : ${completedDetails?.transactionId || orderId}`,
            createdAt: Date.now(),
          },
          targetStoreKey
        ).catch(() => {});

        supabase
          .from('sales')
          .insert({
            total_amount: finalTotal,
            payment_method: selectedOperator?.name || 'MOBILE_MONEY',
            status: 'PAYE',
            is_paid: true,
          })
          .then(null, () => {});

        import('../../studentAuthService')
          .then(({ trackDestinationConversion }) => {
            trackDestinationConversion(finalTotal, orderId);
          })
          .catch(() => {});

        if (digitalDeliveryProfile.isCampusOrVip) {
          import('../../studentAuthService')
            .then(({ recordCourseEnrollment }) => {
              recordCourseEnrollment({
                courseId: digitalDeliveryProfile.cleanCourseId,
                courseTitle: resolvedProduct.name,
                fullName: customerName.trim() || 'Étudiant',
                phoneNumber: paymentPhone.trim() || deliveryPhone.trim(),
                email: customerEmail.trim() || undefined,
                amount: finalTotal,
                paymentMethod: completedDetails?.paymentMethod || 'MOBILE_MONEY',
                transactionId: completedDetails?.transactionId || orderId,
                source: digitalDeliveryProfile.enrollmentSource
              });
            })
            .catch(() => {});
        }

        if (isDigitalProduct || digitalDeliveryProfile.isCampusOrVip) {
          fetch('/api/digital/register-delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify({
              orderId,
              productId: resolvedProduct.id,
              productName: resolvedProduct.name,
              deliveryMode: digitalDeliveryProfile.isVipRoom
                ? 'vip_room'
                : digitalDeliveryProfile.isCampusCourse
                  ? 'campus_private'
                  : 'download_file',
              allowDownload: digitalDeliveryProfile.canDownloadFile,
              fileKey: digitalDeliveryProfile.fileKey,
              fileUrl: digitalDeliveryProfile.fileUrl,
              customerName: customerName.trim() || 'Client',
              customerEmail: customerEmail.trim() || '',
              customerPhone: paymentPhone.trim() || deliveryPhone.trim(),
              storeName: effectiveStoreName
            })
          }).catch(() => {});
        }
      }
    }
  }, [currentStep, orderId, digitalReceiptPayload, digitalDeliveryProfile, isDigitalProduct, resolvedProduct, completedDetails, customerName, paymentPhone, deliveryPhone, customerEmail, finalTotal, effectiveStoreName]);

  // Message W formaté pour le bouton post-paiement
  const getWReceiptUrl = () => {
    return getDigitalReceiptWhatsAppUrl(digitalReceiptPayload, effectiveWPhone);
  };

  // =============================================================================
  // RENDU DU CONTENU DU CHECKOUT
  // =============================================================================

  const checkoutContent = (
    <div className="w-full max-w-4xl mx-auto bg-white border-2 border-blue-200 rounded-3xl overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 relative text-slate-950 font-sans">
      
      {/* 1. Header Minimaliste International Stripe / Apple Pay Grade */}
      <div className="px-5 sm:px-7 py-4.5 border-b-2 border-slate-100 flex items-center justify-between bg-white backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/25">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 text-slate-950">
              <span>{effectiveStoreName}</span>
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Checkout Sécurisé
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Paiement Direct Sécurisé</span>
              </span>
            </h2>
            <p className="text-xs text-slate-700 font-semibold flex items-center gap-1.5 pt-0.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Chiffrement bancaire TLS 256-bit • Passerelle de paiement sécurisée</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(onCancel || onClose || onBackToStore) && currentStep !== 'STEP_3' && (
            <button
              type="button"
              onClick={() => { playTapBeep(); handleClose(); }}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 transition cursor-pointer border border-slate-300 active:scale-95 flex items-center gap-1.5"
              title="Fermer la caisse"
            >
              <X className="w-5 h-5 text-slate-800" />
              <span className="text-xs font-bold hidden sm:inline">Fermer</span>
            </button>
          )}
        </div>
      </div>

      {/* =======================================================================
          ÉTAPE 1 : SAISIE DES INFORMATIONS ESSENTIELLES (VUE SCINDÉE & RESPONSIVE)
         ======================================================================= */}
      {currentStep === 'STEP_1' && (
        <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-white">
          
          {/* GAUCHE / HAUT : LE PRODUIT (RÉSUMÉ VISUEL AVEC EFFET 3D DROP-SHADOW) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 border-2 border-slate-200 space-y-5 shadow-sm">
              
              {/* Image Produit avec effet drop-shadow premium lévitation 3D */}
              <div className="relative group flex items-center justify-center p-3">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/15 via-emerald-500/10 to-transparent rounded-2xl filter blur-xl opacity-80 group-hover:opacity-100 transition duration-500" />
                <div className="relative w-full aspect-square max-w-[210px] rounded-2xl overflow-hidden bg-white border-2 border-slate-200 shadow-[0_20px_35px_-10px_rgba(0,0,0,0.18)] transform hover:-translate-y-1.5 transition-all duration-300 flex items-center justify-center">
                  {resolvedProduct.imageUrl ? (
                    <img
                      src={resolvedProduct.imageUrl}
                      alt={resolvedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : isSubscriptionProduct ? (
                    <div className="w-full h-full p-3.5 flex flex-col justify-between text-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden select-none">
                      {/* Halos d'ambiance */}
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/25 rounded-full blur-xl pointer-events-none" />
                      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-500/25 rounded-full blur-xl pointer-events-none" />
                      
                      {/* Badge Officiel Sécurisé */}
                      <div className="flex items-center justify-center gap-1.5 z-10 pt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                          Licence Officielle
                        </span>
                      </div>

                      {/* Titre & Prix au centre */}
                      <div className="my-auto py-1 z-10 space-y-1">
                        <div className="inline-flex p-2 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-300 mb-0.5 shadow-inner">
                          <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="text-[11px] font-black text-slate-200 uppercase tracking-tight line-clamp-1">
                          {resolvedProduct.name.replace(/•.*/, '').replace(/Abonnement /i, '')}
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight leading-none drop-shadow-sm">
                          {formatCFA(subtotal)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-300 tracking-wide">
                          {subtotal >= 100000 ? '/ an • 2 mois offerts' : '/ mois • 0% commission'}
                        </div>
                      </div>

                      {/* Sceau de réassurance en bas */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-200 z-10">
                        <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Activation Immédiate • TLS 256-bit</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50">
                      <ShoppingBag className="w-14 h-14 text-blue-600 stroke-[1.5] mb-2" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Édition Officielle</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Titre & Description */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-600">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Commande Express 1-Clic</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-950 leading-snug">
                  {resolvedProduct.name}
                </h3>
                {resolvedProduct.description && (
                  <p className="text-xs sm:text-sm text-slate-700 line-clamp-2 leading-relaxed font-medium">
                    {resolvedProduct.description}
                  </p>
                )}
              </div>

              {/* Décomposition du prix épurée */}
              <div className="pt-3 border-t-2 border-slate-200 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>Sous-total</span>
                  <span className="font-mono font-black text-slate-950">{formatCFA(subtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>Frais de livraison</span>
                  <span className="font-black text-emerald-600">Gratuit (Inclus)</span>
                </div>

                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>Frais de transaction</span>
                  <span className="font-black text-emerald-600">0 FCFA (Offert)</span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-blue-600 font-black">
                    <span>Code {appliedPromo.code} (-{appliedPromo.discountPercent}%)</span>
                    <span>-{formatCFA(appliedPromo.discountAmount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                  <span className="font-black text-sm sm:text-base text-slate-950">Total à régler</span>
                  <span className="font-black text-2xl sm:text-3xl font-mono text-blue-600 tracking-tight">
                    {formatCFA(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Badges de réassurance */}
              <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-around text-center text-xs text-slate-800 font-bold">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                  <span>Garantie 100%</span>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-4.5 h-4.5 text-blue-600" />
                  <span>Livraison Rapide</span>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div className="flex flex-col items-center gap-1">
                  <Lock className="w-4.5 h-4.5 text-amber-600" />
                  <span>Paiement Sécurisé</span>
                </div>
              </div>

            </div>
          </div>

          {/* DROITE / BAS : LE FORMULAIRE MINIMALISTE (DESIGN ÉPURÉ & BORDURES FINES) */}
          <div className="lg:col-span-7 space-y-5 text-left">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950">
                  Coordonnées de Livraison
                </span>
                <span className="text-xs font-black text-blue-600">
                  Étape 1 sur 2
                </span>
              </div>

              {/* Nom & Prénom */}
              <div className="space-y-1">
                <label className="text-sm font-black text-slate-950 block">
                  Nom & Prénom <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                    }}
                    placeholder="Ex: Moussa Ouédraogo"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border-2 text-sm sm:text-base font-bold text-slate-950 transition duration-200 placeholder:text-slate-400 placeholder:font-normal focus:outline-none ${
                      formErrors.name
                        ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20'
                    }`}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-xs text-rose-600 font-bold pl-1">{formErrors.name}</p>
                )}
              </div>

              {/* Téléphone (avec détection / sélecteur d'indicatif) */}
              <div className="space-y-1">
                <label className="text-sm font-black text-slate-950 block">
                  Numéro de téléphone (Wameet / SMS) <span className="text-rose-600">*</span>
                </label>
                <div className="relative flex">
                  <div className="inline-flex items-center gap-1 px-3.5 py-3.5 rounded-l-2xl border-2 border-r-0 border-slate-300 bg-slate-100 text-sm font-black text-slate-950">
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.dialCode}</span>
                  </div>
                  <input
                    type="tel"
                    value={deliveryPhone}
                    onChange={(e) => handlePhoneInputWithAutoDetect(e.target.value, false)}
                    placeholder="Ex: 70 12 34 56 ou +225..."
                    className={`w-full pl-4 pr-4 py-3.5 rounded-r-2xl bg-white border-2 text-sm sm:text-base font-mono font-bold text-slate-950 transition duration-200 placeholder:text-slate-400 placeholder:font-normal focus:outline-none ${
                      formErrors.phone
                        ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20'
                    }`}
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-xs text-rose-600 font-bold pl-1">{formErrors.phone}</p>
                )}
              </div>

              {/* Pays & Ville */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-sm font-black text-slate-950 block">
                    Pays <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const found = CHECKOUT_COUNTRIES.find(c => c.code === e.target.value);
                      if (found) handleSelectCountry(found);
                    }}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-slate-300 text-sm sm:text-base font-bold text-slate-950 transition duration-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
                  >
                    {CHECKOUT_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-black text-slate-950 block">
                    Ville <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Ouagadougou"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-slate-300 text-sm sm:text-base font-bold text-slate-950 transition duration-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
              </div>

              {/* Adresse de livraison */}
              <div className="space-y-1">
                <label className="text-sm font-black text-slate-950 block">
                  Adresse de livraison / Quartier <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      if (formErrors.address) setFormErrors(prev => ({ ...prev, address: '' }));
                    }}
                    placeholder="Ex: Secteur 15, face pharmacie de l'Amitié"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border-2 text-sm sm:text-base font-bold text-slate-950 transition duration-200 placeholder:text-slate-400 placeholder:font-normal focus:outline-none ${
                      formErrors.address
                        ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20'
                    }`}
                  />
                </div>
                {formErrors.address && (
                  <p className="text-xs text-rose-600 font-bold pl-1">{formErrors.address}</p>
                )}
              </div>

              {/* Email (marqué comme optionnel) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black text-slate-950">
                    Adresse Email
                  </label>
                  <span className="text-xs text-slate-600 font-bold">Optionnel</span>
                </div>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Pour recevoir votre reçu numérique"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border-2 border-slate-300 text-sm sm:text-base font-bold text-slate-950 transition duration-200 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Code Promo discret avec bouton "Appliquer" */}
              <div className="pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Code Promo (ex: NANA)"
                      className="w-full pl-10 pr-3 py-3 rounded-2xl bg-white border-2 border-slate-300 text-sm font-mono uppercase font-black text-slate-950 tracking-wider placeholder:text-slate-400 placeholder:font-normal focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    Appliquer
                  </button>
                </div>
                {promoError && (
                  <p className="text-xs text-rose-600 mt-1 pl-1 font-bold">{promoError}</p>
                )}
                {appliedPromo && (
                  <p className="text-xs text-emerald-700 mt-1 pl-1 font-black flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Réduction de {appliedPromo.discountPercent}% appliquée avec succès !</span>
                  </p>
                )}
              </div>

              {/* LE CHOIX CRUCIAL (SÉLECTEUR RADIO PROPRE : CARTES CLIQUABLES) */}
              <div className="space-y-3 pt-3">
                <label className="text-sm font-black uppercase tracking-wider text-slate-950 block">
                  Mode de règlement
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* OPTION A : Paiement à la livraison (MASQUÉ pour abonnements, recharges et produits numériques) */}
                  {!isCashlessOnly && (
                  <div
                    onClick={() => {
                      playTapBeep();
                      setPaymentChoice('COD');
                    }}
                    className={`p-4.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 relative hover:scale-[1.01] active:scale-[0.99] ${
                      paymentChoice === 'COD'
                        ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-300 hover:border-blue-400 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                          paymentChoice === 'COD'
                            ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-600/30'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-black text-slate-950">
                            Paiement à la livraison
                          </div>
                          <div className="text-xs sm:text-sm text-slate-700 font-semibold">
                            Réglez en espèces à réception
                          </div>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        paymentChoice === 'COD'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-400 bg-white'
                      }`}>
                        {paymentChoice === 'COD' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-300 w-fit">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Idéal si vous préférez payer au livreur</span>
                    </div>
                  </div>
                  )}

                  {/* OPTION B : Paiement Cash (Mobile Money) */}
                  <div
                    onClick={() => {
                      playTapBeep();
                      setPaymentChoice('MOMO');
                    }}
                    className={`${isCashlessOnly ? 'sm:col-span-2' : ''} p-4.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 relative hover:scale-[1.01] active:scale-[0.99] ${
                      paymentChoice === 'MOMO'
                        ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-300 hover:border-blue-400 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                          paymentChoice === 'MOMO'
                            ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-600/30'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-black text-slate-950">
                            Paiement Cash (Mobile Money)
                          </div>
                          <div className="text-xs sm:text-sm text-slate-700 font-semibold">
                            Orange, Wave, Moov, MTN...
                          </div>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        paymentChoice === 'MOMO'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-400 bg-white'
                      }`}>
                        {paymentChoice === 'MOMO' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-lg border border-blue-300 w-fit">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Instantané • 0% Frais • Reçu direct</span>
                    </div>
                  </div>

                  {/* OPTION C (STRICTEMENT MINI-MARKET) : Ticket Caisse Physique (Payer au Comptoir Boutique) */}
                  {showPhysicalPosOption && (
                    <div
                      onClick={() => {
                        playTapBeep();
                        setPaymentChoice('POS_TOKEN');
                      }}
                      className={`sm:col-span-2 p-4.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 relative hover:scale-[1.01] active:scale-[0.99] ${
                        paymentChoice === 'POS_TOKEN'
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-300 hover:border-emerald-400 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                            paymentChoice === 'POS_TOKEN'
                              ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/30'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            <Store className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm sm:text-base font-black text-slate-950">
                              Payer en Boutique (Ticket Caisse Physique)
                            </div>
                            <div className="text-xs sm:text-sm text-slate-700 font-semibold">
                              Générez un code TK-... à présenter au caissier au comptoir
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          paymentChoice === 'POS_TOKEN'
                            ? 'border-emerald-600 bg-emerald-600'
                            : 'border-slate-400 bg-white'
                        }`}>
                          {paymentChoice === 'POS_TOKEN' && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-300 w-fit">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>En boutique • Aucune adresse requise • Retrait immédiat</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* ÉTAPE 2A : BOUTON D'ACTION SELON L'OPTION */}
              <div className="pt-3">
                {paymentChoice === 'POS_TOKEN' && showPhysicalPosOption ? (
                  <button
                    type="button"
                    onClick={handleConfirmPosTokenOrder}
                    disabled={isProcessingPayment}
                    className="w-full py-4.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-base sm:text-lg shadow-xl shadow-emerald-600/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Génération du Ticket Caisse...</span>
                      </>
                    ) : (
                      <>
                        <Store className="w-5 h-5" />
                        <span>Générer mon Ticket Caisse • {formatCFA(finalTotal)}</span>
                        <ArrowRight className="w-5 h-5 ml-1" />
                      </>
                    )}
                  </button>
                ) : paymentChoice === 'COD' && !isCashlessOnly ? (
                  /* SI PAIEMENT À LA LIVRAISON : LE PARCOURS S'ARRÊTE ICI AVEC CE GRAND CTA */
                  <button
                    type="button"
                    onClick={handleConfirmCodOrder}
                    disabled={isProcessingPayment}
                    className="w-full py-4.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-base sm:text-lg shadow-xl shadow-blue-600/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Enregistrement de la commande...</span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-5 h-5" />
                        <span>Confirmer la commande • {formatCFA(finalTotal)}</span>
                        <ArrowRight className="w-5 h-5 ml-1" />
                      </>
                    )}
                  </button>
                ) : (
                  /* SI PAIEMENT CASH (MOBILE MONEY) : GLISSEMENT VERS L'ÉTAPE 2B */
                  <button
                    type="button"
                    onClick={handleProceedToMomo}
                    className="w-full py-4.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base sm:text-lg shadow-xl shadow-blue-600/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continuer vers le paiement Mobile Money</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* =======================================================================
          ÉTAPE 2B : L'EXPÉRIENCE PREMIUM CASH (MOBILE MONEY S-PAY)
         ======================================================================= */}
      {currentStep === 'STEP_2B' && (
        <div className="p-5 sm:p-8 space-y-6 bg-white animate-in fade-in slide-in-from-right-6 duration-300">
          
          {/* Haut / Résumé Visuel : Montant à payer en grand + Filigrane Nom du pays en arrière-plan */}
          <div className="relative overflow-hidden rounded-3xl bg-blue-50/40 border-2 border-blue-300 p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            {/* Nom du pays sélectionné incrusté en arrière-plan très clair (Watermark / Filigrane) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-5xl sm:text-8xl font-black text-blue-900/[0.06] select-none pointer-events-none uppercase tracking-widest whitespace-nowrap overflow-hidden">
              {selectedCountry.name}
            </div>

            <div className="relative z-10 space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">{selectedCountry.flag}</span>
                <span className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950">
                  {selectedCountry.name} • {selectedOperator.name}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Paiement Mobile Money Sécurisé (Passerelle S-Pay)
              </h3>
            </div>

            <div className="relative z-10 text-left sm:text-right">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 block">
                Montant total
              </span>
              <span className="text-3xl sm:text-5xl font-black font-mono text-blue-600 tracking-tight">
                {formatCFA(finalTotal)}
              </span>
            </div>
          </div>

          {/* Messages d'erreur éventuels */}
          {paymentError && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-700 text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* SÉLECTION DE L'OPÉRATEUR : GRILLE AFFICHANT LES GROS LOGOS VECTORIELS SUR FOND NOIR */}
          <div className="space-y-3.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950 block">
                Choisissez votre opérateur ({selectedCountry.name})
              </label>
              <span className="text-xs sm:text-sm text-blue-600 font-black">
                Logos officiels vectoriels
              </span>
            </div>

            {/* GRILLE D'OPÉRATEURS : FOND NOIR POUR CHAQUE CARTE DE LOGO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {selectedCountry.operators.map((op) => {
                const logoUrl = getOperatorLogo(op.id, selectedCountry.code);
                const isSelected = selectedOperator.id === op.id;
                const isComingSoonBf = isBurkinaFaso && (op.id === 'moov' || op.id === 'wligdicash');

                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      if (isComingSoonBf) {
                        const fallbackOp =
                          selectedCountry.operators.find((o) => o.id === 'orange') ||
                          selectedCountry.operators.find((o) => o.id === 'wave') ||
                          selectedCountry.operators[0];
                        setSelectedOperator(fallbackOp);
                        setMoovRedirectNotice(
                          `${op.name} sera disponible bientôt. Vous avez été redirigé automatiquement vers ${fallbackOp.name}.`
                        );
                        playTapBeep();
                        return;
                      }
                      setMoovRedirectNotice(null);
                      setSelectedOperator(op);
                      playTapBeep();
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer relative hover:scale-[1.02] active:scale-[0.98] bg-black hover:bg-neutral-950 ${
                      isSelected
                        ? 'border-blue-500 ring-4 ring-blue-500/35 shadow-xl shadow-blue-500/25'
                        : isComingSoonBf
                          ? 'border-neutral-800/90 opacity-85 hover:border-amber-400/70'
                          : 'border-neutral-800 hover:border-blue-400'
                    }`}
                  >
                    {/* Badge Bientôt pour Moov & LigdiCash Wallet au Burkina */}
                    {isComingSoonBf && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider">
                        Bientôt
                      </span>
                    )}
                    {/* Logo vectoriel officiel sur fond noir agrandi */}
                    <div className="h-16 sm:h-18 w-full flex items-center justify-center p-2 rounded-xl bg-black">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={op.name}
                          className="max-h-14 sm:max-h-16 max-w-[125px] sm:max-w-[140px] object-contain drop-shadow-md"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm"
                          style={{ backgroundColor: op.brandColor || '#3B82F6' }}
                        >
                          {op.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <span className="text-sm sm:text-base font-black text-white tracking-wide truncate max-w-full text-center">
                      {op.name}
                    </span>

                    {/* Indicateur de sélection illuminé en bleu */}
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-3 h-3 rounded-full bg-blue-500 shadow-md shadow-blue-500 ring-2 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {moovRedirectNotice && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{moovRedirectNotice}</span>
              </div>
            )}
          </div>

          {/* L'EXPÉRIENCE DYNAMIQUE (BURKINA FASO : MARCHAND USSD / WAVE + SMS REALTIME, OU OTP HORS BF) */}
          <div className="space-y-4 text-left">

            {/* 1. BURKINA FASO — ORANGE MONEY MARCHAND (*144*10*CODE*MONTANT#) */}
            {isBurkinaFaso && selectedOperator.id === 'orange' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-orange-50/80 border-2 border-orange-400 space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-orange-950 text-sm sm:text-base font-black">
                    <Smartphone className="w-5 h-5 text-orange-600" />
                    <span>Paiement Marchand Orange Money Burkina</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-orange-200/80 text-orange-900 border border-orange-300">
                    N° Marchand : {effectiveBfOrangeMerchantCode}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-semibold">
                  Composez le code USSD ci-dessous sur votre téléphone pour payer <strong className="text-orange-700">{formatCFA(finalTotal)}</strong> au Numéro Marchand <strong className="font-mono text-orange-800">{effectiveBfOrangeMerchantCode}</strong>, puis collez le SMS reçu ou l'ID de paiement ci-dessous :
                </p>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border-2 border-orange-500 shadow-sm">
                  <span className="font-mono text-lg sm:text-2xl font-black text-orange-700 tracking-wider">
                    {currentUssdCode}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyUssd}
                      className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      {isCopiedUssd ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopiedUssd ? 'Copié !' : 'Copier'}</span>
                    </button>

                    <a
                      href={`tel:${currentUssdCode.replace(/#/g, '%23')}`}
                      className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-black sm:hidden flex items-center gap-1 shadow-sm"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Lancer</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BURKINA FASO — WAVE DIRECT (OUVERTURE APPLICATION WAVE + INSTRUCTIONS) */}
            {isBurkinaFaso && selectedOperator.id === 'wave' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-sky-50/80 border-2 border-sky-400 space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sky-950 text-sm sm:text-base font-black">
                    <ExternalLink className="w-5 h-5 text-sky-600" />
                    <span>Paiement Direct Wave Burkina</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-sky-200/80 text-sky-900 border border-sky-300">
                    0% Frais • Rapide
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-semibold">
                  Ouvrez votre application Wave pour envoyer <strong className="text-sky-700">{formatCFA(finalTotal)}</strong>
                  {customBfWaveLink && !/^https?:\/\//i.test(customBfWaveLink) ? (
                    <> au numéro Wave <strong className="font-mono text-sky-800">{customBfWaveLink}</strong></>
                  ) : null}
                  , puis collez l'ID de transaction (ou le SMS/reçu Wave) dans le champ ci-dessous pour validation instantanée.
                </p>

                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={effectiveBfWaveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Ouvrir Wave (Web / App)</span>
                  </a>
                  <a
                    href="wave://"
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm transition sm:hidden"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Lancer l'App Wave</span>
                  </a>
                </div>
              </div>
            )}

            {/* 3. HORS BURKINA FASO — CODE OTP CLASSIQUE */}
            {!isBurkinaFaso && selectedOperator.needsOtp && (
              <div className="p-5 sm:p-6 rounded-2xl bg-blue-50/70 border-2 border-blue-400 space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-950 text-sm sm:text-base font-black">
                    <Lock className="w-5 h-5 text-blue-600" />
                    <span>Autorisation requise pour {selectedOperator.name}</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-200/70 text-blue-900 border border-blue-300">
                    Étape rapide
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-semibold">
                  Composez le code USSD ci-dessous sur votre téléphone pour générer votre code secret d'autorisation :
                </p>

                {/* Box de code USSD avec bouton Copier & Encadrement bleu */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border-2 border-blue-500 shadow-sm">
                  <span className="font-mono text-xl sm:text-2xl font-black text-blue-700 tracking-wider">
                    {currentUssdCode}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyUssd}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      {isCopiedUssd ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopiedUssd ? 'Copié !' : 'Copier'}</span>
                    </button>

                    <a
                      href={`tel:${currentUssdCode.replace('#', '%23')}`}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black sm:hidden flex items-center gap-1 shadow-sm"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Lancer</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* CHAMPS D'ACTION */}
            <div className={`grid grid-cols-1 ${(isBurkinaFaso || selectedOperator.needsOtp) ? 'sm:grid-cols-2' : ''} gap-4.5`}>
              
              {/* Le champ Numéro : Récupère le state de l'Étape 1 MAIS reste modifiable ! */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm sm:text-base font-black text-slate-950 block">
                    Numéro Mobile Money du payeur <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-xs text-blue-600 font-black">
                    Modifiable
                  </span>
                </div>
                <div className="relative flex">
                  <div className="inline-flex items-center gap-1 px-3.5 py-3.5 rounded-l-2xl border-2 border-r-0 border-blue-200 bg-slate-100 text-sm sm:text-base font-black text-slate-950">
                    <span>{selectedCountry.dialCode}</span>
                  </div>
                  <input
                    type="tel"
                    value={paymentPhone}
                    onChange={(e) => handlePhoneInputWithAutoDetect(e.target.value, true)}
                    placeholder="Ex: 70 12 34 56 ou +225..."
                    className="w-full pl-3 pr-4 py-3.5 rounded-r-2xl bg-white border-2 border-blue-200 text-sm sm:text-base font-mono font-bold text-slate-950 transition duration-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold pl-1">
                  Le compte qui effectue le règlement de {formatCFA(finalTotal)}.
                </p>
              </div>

              {/* BURKINA FASO : Champ "Coller SMS de paiement ou ID" à la place de l'OTP */}
              {isBurkinaFaso ? (
                <div className="space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-sm sm:text-base font-black text-slate-950 block">
                      Coller le SMS de paiement ou l'ID <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-xs text-emerald-700 font-black flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Écoute Realtime active
                    </span>
                  </div>
                  <input
                    type="text"
                    value={bfSmsInput}
                    onChange={(e) => handleBfSmsInputChange(e.target.value)}
                    placeholder="Collez le SMS reçu ou l'ID (ex: PP261124...)"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-blue-200 text-sm sm:text-base font-mono font-bold text-slate-950 transition duration-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                  />
                  {bfExtractedTxId && (
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                      <span>ID extrait : <code className="font-mono font-black">{bfExtractedTxId}</code></span>
                      {bfSmsStatus === 'CHECKING' && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
                      {bfSmsStatus === 'WAITING_REALTIME' && <span className="text-[11px] text-amber-700">En attente SMS...</span>}
                      {bfSmsStatus === 'MATCHED' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                  )}
                  <p className="text-xs sm:text-sm text-slate-700 font-semibold pl-1">
                    {bfSmsNotice || "Dès que vous collez le SMS ou l'ID, la validation est automatique sans autre manipulation."}
                  </p>
                </div>
              ) : (
                /* HORS BURKINA : Champ "Code OTP" affiché STRICTEMENT si l'opérateur en a besoin */
                selectedOperator.needsOtp && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-sm sm:text-base font-black text-slate-950 block">
                        Code OTP <span className="text-rose-600">*</span>
                      </label>
                      <span className="text-xs text-amber-700 font-black">
                        Généré par {selectedOperator.name}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Code OTP à 4 ou 6 chiffres"
                      className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-blue-200 text-base sm:text-lg font-mono font-black tracking-widest text-center text-slate-950 transition duration-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                    />
                    <p className="text-xs sm:text-sm text-slate-700 font-semibold pl-1">
                      Saisissez le code secret généré par l'opérateur pour autoriser la transaction.
                    </p>
                  </div>
                )
              )}

            </div>

            {/* VALIDATION : UN MAGNIFIQUE BOUTON PLEIN EN BLEU AVEC LOADER & ÉTAT DISABLED */}
            <div className="pt-2.5 flex flex-col sm:flex-row items-center gap-3.5">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setCurrentStep('STEP_1');
                }}
                disabled={isProcessingPayment}
                className="w-full sm:w-auto px-5 py-4.5 rounded-2xl border-2 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modifier mes coordonnées</span>
              </button>

              <button
                type="button"
                onClick={handleInitiateSPayment}
                disabled={isProcessingPayment}
                className="w-full flex-1 py-4.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-base sm:text-lg shadow-xl shadow-blue-600/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Traitement en cours...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Valider le paiement de {formatCFA(finalTotal)}</span>
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </button>
            </div>

            {/* Message de réassurance sous le bouton */}
            <p className="text-center text-xs sm:text-sm text-slate-800 font-semibold flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>Paiement 100% Sécurisé • Traitement direct instantané • Confirmation immédiate par SMS / WhatsApp.</span>
            </p>

            {/* Indicateur visible d'écoute temps réel en bas du checkout (Burkina Faso) */}
            {isBurkinaFaso && (
              <div className="px-4 py-3 rounded-2xl border border-orange-300 bg-orange-50/80 text-orange-900 text-center flex flex-wrap items-center justify-center gap-2.5 animate-in fade-in duration-200">
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin shrink-0" />
                <span className="text-xs sm:text-sm font-bold">
                  {bfExtractedTxId
                    ? `En attente de validation par le système (ID : ${bfExtractedTxId}).`
                    : 'En attente de validation par le système.'}
                </span>
                {bfSmsStatus === 'WAITING_REALTIME' && bfExtractedTxId && (
                  <button
                    type="button"
                    onClick={() => verifyBfSmsAgainstSupabase(bfExtractedTxId, bfSmsInput)}
                    className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-black inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Vérifier</span>
                  </button>
                )}
              </div>
            )}

            {/* Bloc Support WhatsApp (15 min) + Appel Vidéo Voir Direct en bas du checkout */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-left">
              <p className="text-xs text-slate-700 font-semibold leading-relaxed text-center">
                Si après <strong>15 minutes</strong> votre ID est reçu mais que le paiement n'est pas validé, contactez le support pour soumettre vos informations à vérifier.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setBfSupportName((prev) => prev || customerName);
                    setBfSupportPhone((prev) => prev || paymentPhone || deliveryPhone);
                    setBfSupportTxId((prev) => prev || bfExtractedTxId || bfSmsInput);
                    setShowBfSupportForm((prev) => !prev);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Support WhatsApp</span>
                </button>

                <React.Suspense
                  fallback={
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600/70 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      <span>Voir Direct...</span>
                    </button>
                  }
                >
                  <LazyBuyerLiveCallButton
                    productId={resolvedProduct?.id || orderId}
                    productName={resolvedProduct?.name || orderDescription}
                    productPrice={finalTotal}
                    productImage={resolvedProduct?.imageUrl}
                    storeName={effectiveStoreName}
                    whatsappPhone={effectiveWPhone}
                    sellerId={merchantId || storeConfig?.slug || 'nanasore_platform'}
                    buttonText="Appel Vidéo (Voir Direct)"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  />
                </React.Suspense>
              </div>

              {showBfSupportForm && (
                <div className="p-3.5 rounded-xl bg-white border border-emerald-300 space-y-2.5 animate-in fade-in duration-200">
                  <div className="text-xs font-black text-emerald-900">
                    Soumettre vos informations au support (+22666782920)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={bfSupportName}
                      onChange={(e) => setBfSupportName(e.target.value)}
                      placeholder="Votre nom complet *"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={bfSupportPhone}
                      onChange={(e) => setBfSupportPhone(e.target.value)}
                      placeholder="Votre numéro payeur *"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={bfSupportTxId}
                      onChange={(e) => setBfSupportTxId(e.target.value)}
                      placeholder="ID de transaction / SMS reçu *"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none sm:col-span-2"
                    />
                    <input
                      type="text"
                      value={bfSupportNote}
                      onChange={(e) => setBfSupportNote(e.target.value)}
                      placeholder="Précision (ex: heure du paiement, opérateur...)"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none sm:col-span-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sName = (bfSupportName || customerName || 'Client').trim();
                      const sPhone = (bfSupportPhone || paymentPhone || deliveryPhone || 'Non précisé').trim();
                      const sTx = (bfSupportTxId || bfExtractedTxId || bfSmsInput || 'Non précisé').trim();
                      const sNote = bfSupportNote.trim();
                      const cleanWa = '22666782920';

                      logBfPaymentStep('SUPPORT_SUBMITTED', sTx, {
                        supportName: sName,
                        supportPhone: sPhone,
                        supportNote: sNote || null
                      });

                      const waLines = [
                        `Bonjour Support *${effectiveStoreName}* 👋`,
                        `Mon paiement n'a pas encore été validé automatiquement (vérification demandée).`,
                        ``,
                        `• *Client :* ${sName}`,
                        `• *Téléphone payeur :* ${sPhone}`,
                        `• *Commande / Réf :* ${orderId}`,
                        `• *Produit / Offre :* ${resolvedProduct?.name || orderDescription}`,
                        `• *Montant :* ${formatCFA(finalTotal)}`,
                        `• *Opérateur :* ${selectedOperator.name} (${selectedCountry.name})`,
                        `• *ID Transaction / SMS :* ${sTx}`,
                        sNote ? `• *Note :* ${sNote}` : ''
                      ].filter(Boolean).join('\n');

                      window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(waLines)}`, '_blank', 'noopener,noreferrer');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Envoyer toutes mes infos sur WhatsApp</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bouton de secours si le paiement est en cours de traitement */}
            {isProcessingPayment && (
              <div className="p-4.5 rounded-2xl bg-blue-50/60 border-2 border-blue-300 text-center space-y-3 animate-in fade-in duration-200">
                <p className="text-xs sm:text-sm text-slate-900 font-bold">
                  En attente du retour de l'opérateur sur votre téléphone...
                </p>

                {/* Bouton d'ouverture directe si une URL de redirection existe (Wave, SasPay Checkout, etc.) */}
                {sResponse && (sResponse.checkout_url || sResponse.redirectUrl || sResponse.provider_link) && (
                  <a
                    href={sResponse.checkout_url || sResponse.redirectUrl || sResponse.provider_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Ouvrir l'application opérateur pour valider</span>
                  </a>
                )}

                <div>
                  <button
                    type="button"
                    onClick={handleManualCheck}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black inline-flex items-center gap-2 transition cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>J'ai déjà validé sur mon téléphone</span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* =======================================================================
          ÉTAPE 3 : LA RÉUSSITE (CONFIRMATION ASYNCHRONE & VUE MAGISTRALE)
         ======================================================================= */}
      {currentStep === 'STEP_3' && (
        <div className="p-8 sm:p-12 text-center space-y-6 relative overflow-hidden bg-white animate-in zoom-in-95 duration-300">
          
          {/* Confettis légers pour célébrer le succès */}
          <MiniConfettiShower />

          {/* GROS TICK VERT ANIMÉ (SVG DRAWING ANIMATION) */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <svg
              className="w-24 h-24 text-emerald-500"
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Cercle tracé */}
              <circle
                cx="26"
                cy="26"
                r="24"
                stroke="currentColor"
                strokeWidth="3.5"
                className="stroke-emerald-500/20"
              />
              <circle
                cx="26"
                cy="26"
                r="24"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeDasharray="150"
                strokeDashoffset="0"
                className="stroke-emerald-500 animate-[dash_0.8s_ease-out_forwards]"
                style={{
                  animation: 'circleDraw 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards'
                }}
              />
              {/* Coche tracée */}
              <path
                d="M15 27L22.5 34.5L37 19"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="50"
                strokeDashoffset="0"
                className="stroke-emerald-500"
                style={{
                  animation: 'checkDraw 0.4s 0.4s cubic-bezier(0.65, 0, 0.45, 1) both'
                }}
              />
            </svg>
          </div>

          <style>{`
            @keyframes circleDraw {
              0% { stroke-dashoffset: 150; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes checkDraw {
              0% { stroke-dashoffset: 50; }
              100% { stroke-dashoffset: 0; }
            }
          `}</style>

          {/* Titre & Sous-titre contextuel en vert */}
          {(() => {
            const labelLower = `${orderDescription || ''} ${resolvedProduct?.name || ''} ${orderId || ''}`.toLowerCase();
            const isSub = orderId.startsWith('SUB-') || labelLower.includes('abonnement') || labelLower.includes('plan ');
            const isWebinar = labelLower.includes('webinaire') || labelLower.includes('formation') || labelLower.includes('cours') || labelLower.includes('souscription');

            const contextualSuccessMsg = isSub
              ? `Votre paiement de ${formatCFA(finalTotal)} pour l'abonnement « ${resolvedProduct.name} » a été validé avec succès !`
              : isWebinar
                ? `Votre paiement de ${formatCFA(finalTotal)} pour la souscription à « ${resolvedProduct.name} » a été validé avec succès !`
                : `Votre paiement de ${formatCFA(finalTotal)} a été validé avec succès ! Vous allez être redirigé vers le site pour continuer vos achats à volonté.`;

            return (
              <div className="space-y-3 max-w-md mx-auto">
                <h2 className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                  Paiement validé avec succès !
                </h2>
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-sm sm:text-base font-bold leading-relaxed">
                  {contextualSuccessMsg}
                </div>
                {bfRedirectCountdown !== null && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                    <span className="text-xs font-bold text-emerald-700">
                      Redirection automatique dans {bfRedirectCountdown}s...
                    </span>
                    <button
                      type="button"
                      onClick={handleBfContinueNow}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shadow-sm"
                    >
                      Continuer maintenant →
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Coordonnées de la boutique concernée */}
          <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-left flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">{effectiveStoreName}</h4>
                <p className="text-[11px] text-slate-600">
                  {city.trim() ? `${city.trim()} • ` : ''}Tél / WhatsApp : {effectiveWPhone}
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Boutique Certifiée
            </span>
          </div>

          {/* Récapitulatif de commande propre */}
          <div className="max-w-md mx-auto p-5.5 rounded-3xl bg-slate-50 border-2 border-slate-200 text-left space-y-3.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-slate-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-slate-400" />
                Référence commande :
              </span>
              <span className="font-mono font-black text-blue-600">
                #{completedDetails?.transactionId || orderId}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 font-semibold">
              <span>Article commandé :</span>
              <span className="font-black text-slate-950 truncate max-w-[200px] flex items-center gap-1.5">
                <span>{resolvedProduct.name}</span>
                {isDigitalProduct && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
                    Numérique
                  </span>
                )}
              </span>
            </div>

            {/* Ticket Caisse Physique (Mini-Market uniquement) à présenter au caissier */}
            {completedDetails?.paymentMethod === 'PHYSICAL_POS_TOKEN' && completedDetails.posToken && (
              <div className="p-4 rounded-2xl bg-slate-950 text-white border-2 border-emerald-500/60 text-center space-y-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  <Store className="w-3.5 h-3.5" />
                  À présenter à la caisse physique
                </span>
                <div className="text-2xl font-mono font-black tracking-[0.18em] text-emerald-400">
                  {completedDetails.posToken}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(completedDetails.posToken || '').catch(() => {});
                    setCopiedPosToken(true);
                    setTimeout(() => setCopiedPosToken(false), 2000);
                  }}
                  className="mx-auto px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedPosToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPosToken ? 'Ticket copié !' : 'Copier le code caisse'}</span>
                </button>
              </div>
            )}

            <div className="flex justify-between items-center text-slate-700 font-semibold">
              <span>{completedDetails?.paymentMethod === 'PHYSICAL_POS_TOKEN' ? 'Total à régler en boutique :' : 'Total réglé :'}</span>
              <span className="font-mono font-black text-lg text-emerald-600">
                {formatCFA(finalTotal)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 font-semibold">
              <span>Mode de paiement :</span>
              <span className="font-black text-slate-950">
                {completedDetails?.paymentMethod === 'PHYSICAL_POS_TOKEN'
                  ? 'Ticket Caisse Physique (Comptoir)'
                  : completedDetails?.paymentMethod === 'CASH_ON_DELIVERY'
                  ? 'Paiement à la livraison (Espèces)'
                  : selectedOperator.name}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 font-semibold pt-2.5 border-t-2 border-slate-200">
              <span>Destinataire :</span>
              <span className="font-black text-slate-950">
                {customerName.trim()} ({paymentPhone.trim() || deliveryPhone.trim()})
              </span>
            </div>

            <div className="flex justify-between items-start text-slate-700 font-semibold">
              <span>Livraison :</span>
              <span className="font-bold text-slate-900 text-right max-w-[220px]">
                {city.trim()}, {deliveryAddress.trim()}
              </span>
            </div>
          </div>

          {/* SECTION ACCÈS POST-PAIEMENT : CAMPUS PRIVÉ / SALLE VIP vs DOUBLE ACCÈS NUMÉRIQUE */}
          {(isDigitalProduct || digitalDeliveryProfile.isCampusOrVip) && (
            <div className="max-w-md mx-auto p-4.5 rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-blue-200 text-left space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    {digitalDeliveryProfile.isCampusOrVip && !digitalDeliveryProfile.canDownloadFile
                      ? 'Accès Activé — Campus Privé & Salles VIP'
                      : 'Vos Accès Produits Numériques (Double Accès)'}
                  </h4>
                  <p className="text-[11px] text-blue-700 font-semibold">
                    {digitalDeliveryProfile.isCampusOrVip && !digitalDeliveryProfile.canDownloadFile
                      ? 'Votre compte étudiant est inscrit automatiquement • Lecture sécurisée en ligne'
                      : customerEmail.trim()
                        ? `Lien direct prêt + copie envoyée par email à ${customerEmail.trim()}`
                        : 'Lien direct sécurisé + disponible dans votre Espace de Téléchargement'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {digitalDeliveryProfile.isCampusOrVip && (
                  <a
                    href="/student/dashboard"
                    className="py-3 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition hover:scale-[1.01] sm:col-span-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Accéder à mon Tableau de Bord Étudiant</span>
                  </a>
                )}

                {digitalDeliveryProfile.canDownloadFile && (
                  <>
                    <a
                      href={`/download/${encodeURIComponent(orderId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition hover:scale-[1.01]"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger Directement</span>
                    </a>

                    <a
                      href="/academic/upload?tab=client"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-3.5 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition hover:scale-[1.01]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Espace Téléchargement</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ACTIONS POST-PAIEMENT : ENVOI ET TÉLÉCHARGEMENT DU REÇU */}
          <div className="max-w-md mx-auto pt-2 space-y-2.5">
            
            {/* Bouton "Recevoir mon Reçu sur WhatsApp" */}
            <a
              href={getWReceiptUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playValidationBeep()}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Recevoir mon Reçu & Liens sur WhatsApp</span>
            </a>

            {/* Bouton "Télécharger mon Reçu Officiel (PDF)" */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                downloadDigitalReceiptPdf(digitalReceiptPayload, 'a4');
              }}
              className="w-full py-3 px-4 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Télécharger mon Reçu Officiel (PDF A4)</span>
            </button>

            {/* Bouton "Retour à la boutique" pour inciter à racheter */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onBackToStore) onBackToStore();
                else if (onCancel) onCancel();
                else if (typeof window !== 'undefined') window.location.href = '/';
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-200 font-black text-xs sm:text-sm transition cursor-pointer"
            >
              <span>Retourner à la boutique</span>
            </button>

          </div>

        </div>
      )}

      {/* Modale / Toast Transparent lors d'un Failover NanaSwitch vers Sebpay Hosted Checkout */}
      {failoverAlert?.active && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300">
                <span>Passerelle de secours activée</span>
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Canal direct temporairement indisponible
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {failoverAlert?.message || getDynamicFailoverNotice(selectedOperator, selectedCountry)}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Redirection automatique en cours...</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-amber-400 h-full animate-[progress_1.8s_ease-in-out_forwards]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

    </div>
  );

  if (isOpen === false) {
    return null;
  }

  // Mode Modale Pop-in avec Backdrop Blur (si isModal ou isOpen est activé)
  if (isModal || isOpen) {
    return (
      <div 
        className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            playTapBeep();
            handleClose();
          }
        }}
      >
        <div className="relative w-full max-w-4xl max-h-[96vh] overflow-y-auto rounded-3xl shadow-2xl bg-white my-auto">
          {checkoutContent}
        </div>
      </div>
    );
  }

  // Mode Page Complète
  return checkoutContent;
};

export default UltimateCheckout;
