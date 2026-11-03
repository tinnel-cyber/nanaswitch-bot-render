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
  Sparkles,
  Copy,
  Check,
  X,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime, playCancelSound, formatCFA } from '../../../utils/audio';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import {
  initiateSPayment,
  verifySPayment,
  SCollectionResponse
} from '../../../services/paymentApiService';
import { getOperatorLogo } from '../../../utils/operatorLogos';
import { ALL_20_COUNTRIES_CONFIG, detectCountryFromPhone, CountryPaymentConfigItem, getDynamicFailoverNotice } from '../../../utils/countryPaymentConfig';

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
  paymentMethod: 'CASH_ON_DELIVERY' | 'MOBILE_MONEY' | string;
  timestamp: number;
  status: string;
  orderId?: string;
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
  initialStep
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

  const [city, setCity] = useState(() => selectedCountry.defaultCity);

  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    return defaultAddress || (typeof window !== 'undefined' ? localStorage.getItem('nana_customer_address') || '' : '');
  });

  // Code Promo discret
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number; discountAmount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Le Choix Crucial : Option A (Paiement à la livraison) vs Option B (Mobile Money)
  const [paymentChoice, setPaymentChoice] = useState<'COD' | 'MOMO'>('MOMO');

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

  // Code OTP
  const [otpCode, setOtpCode] = useState('');
  const [isCopiedUssd, setIsCopiedUssd] = useState(false);

  // Traitement en cours & validation
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [sResponse, setSResponse] = useState<SCollectionResponse | null>(null);
  const [failoverAlert, setFailoverAlert] = useState<{ active: boolean; url: string; message?: string } | null>(null);

  // 6. Succès & Détails finaux
  const [completedDetails, setCompletedDetails] = useState<PaymentSuccessDetails | null>(null);

  // Calculs financiers dynamiques
  const subtotal = resolvedProduct.price;
  const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

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
    if (!deliveryAddress.trim()) {
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

    // Sauvegarde en base Firestore / LocalStorage
    try {
      const orderRef = doc(db, 'orders', orderId);
      await setDoc(orderRef, {
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
      }, { merge: true });
    } catch (e) {
      console.warn('[ORDER SAVE] Info sauvegarde locale :', e);
    }

    setTimeout(() => {
      setIsProcessingPayment(false);
      setCompletedDetails(details);
      setCurrentStep('STEP_3');
      playCashChime();
      if (onSuccess) onSuccess(details);
    }, 600);
  };

  // Passage à l'Étape 2B (Mobile Money)
  const handleProceedToMomo = () => {
    if (!validateStep1()) return;
    playTapBeep();
    persistCustomerData();
    setCurrentStep('STEP_2B');
  };

  // Code USSD dynamique adapté à l'opérateur et au montant
  const currentUssdCode = useMemo(() => {
    if (!selectedOperator.ussdTemplate) return '*144*4*6#';
    return selectedOperator.ussdTemplate.replace('{amount}', finalTotal.toString());
  }, [selectedOperator, finalTotal]);

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

  // Écouteur Firestore onSnapshot automatique via Webhook S (0% SMS)
  useEffect(() => {
    if (!orderId || currentStep === 'STEP_3' || !isProcessingPayment) return;

    let unsub: (() => void) | null = null;
    try {
      const intentDocRef = doc(db, 'payment_intents', orderId);
      unsub = onSnapshot(intentDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const isPaid =
            data?.isPaid === true ||
            data?.paid === true ||
            ['COMPLETED', 'PAID', 'SUCCESS'].includes(String(data?.status || '').toUpperCase()) ||
            ['COMPLETED', 'PAID'].includes(String(data?.paymentStatus || '').toUpperCase());

          if (isPaid && currentStep !== 'STEP_3') {
            console.log('[S WEBHOOK DETECTED] Paiement validé par le Webhook !', data);
            setIsProcessingPayment(false);
            const successDetails: PaymentSuccessDetails = {
              transactionId: data?.transactionId || orderId,
              orderId,
              amount: data?.amountPaid || finalTotal,
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
              ['FAILED', 'CANCELLED', 'CANCELED'].includes(String(data?.paymentStatus || '').toUpperCase());

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
      }, (err) => {
        console.warn('[FIRESTORE LISTENER] Webhook snapshot note :', err.message);
      });
    } catch (e) {
      console.warn('[FIRESTORE ATTACH] Erreur attachement :', e);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [orderId, isProcessingPayment, currentStep, finalTotal, currency, customerName, paymentPhone, deliveryPhone, city, deliveryAddress, customerEmail, selectedCountry, selectedOperator, onSuccess]);

  // Déclenchement de la requête S
  const handleInitiateSPayment = async () => {
    const rawPhone = paymentPhone.trim();
    if (!rawPhone || rawPhone.length < 6) {
      setPaymentError('Veuillez renseigner un numéro Mobile Money valide.');
      playCancelSound();
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

  // Message W formaté pour le bouton post-paiement
  const getWReceiptUrl = () => {
    const cleanNumber = effectiveWPhone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Bonjour *${effectiveStoreName}* ! 🛍️\n\n` +
      `Je viens de valider ma commande avec succès :\n` +
      `• *Réf. Commande :* ${orderId}\n` +
      `• *Article :* ${resolvedProduct.name}\n` +
      `• *Montant :* ${formatCFA(finalTotal)}\n` +
      `• *Mode :* ${completedDetails?.paymentMethod === 'CASH_ON_DELIVERY' ? 'Paiement à la livraison' : selectedOperator.name}\n` +
      `• *Client :* ${customerName.trim()} (${deliveryPhone.trim()})\n` +
      `• *Adresse :* ${city.trim()}, ${deliveryAddress.trim()}\n\n` +
      `Merci de confirmer la bonne prise en compte et l'expédition ! 🚀`
    );
    return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${msg}`;
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
                  <Sparkles className="w-3.5 h-3.5" />
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
                  
                  {/* OPTION A : Paiement à la livraison */}
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

                  {/* OPTION B : Paiement Cash (Mobile Money) */}
                  <div
                    onClick={() => {
                      playTapBeep();
                      setPaymentChoice('MOMO');
                    }}
                    className={`p-4.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 relative hover:scale-[1.01] active:scale-[0.99] ${
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
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Instantané • 0% Frais • Reçu direct</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* ÉTAPE 2A : BOUTON D'ACTION SELON L'OPTION */}
              <div className="pt-3">
                {paymentChoice === 'COD' ? (
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

                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      setSelectedOperator(op);
                      playTapBeep();
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer relative hover:scale-[1.02] active:scale-[0.98] bg-black hover:bg-neutral-950 ${
                      isSelected
                        ? 'border-blue-500 ring-4 ring-blue-500/35 shadow-xl shadow-blue-500/25'
                        : 'border-neutral-800 hover:border-blue-400'
                    }`}
                  >
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
          </div>

          {/* L'EXPÉRIENCE DYNAMIQUE (EXEMPLE: ORANGE BURKINA & CODE OTP) */}
          <div className="space-y-4 text-left">
            
            {/* Si l'opérateur exige un code OTP : Encart avec code USSD exact à composer */}
            {selectedOperator.needsOtp && (
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
            <div className={`grid grid-cols-1 ${selectedOperator.needsOtp ? 'sm:grid-cols-2' : ''} gap-4.5`}>
              
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
                  Le compte qui sera débité de {formatCFA(finalTotal)}.
                </p>
              </div>

              {/* Champ "Code OTP" affiché STRICTEMENT si l'opérateur en a besoin (Orange Money) */}
              {selectedOperator.needsOtp && (
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

          {/* Titre & Sous-titre */}
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Paiement effectué avec succès !
            </h2>
            <p className="text-sm sm:text-base text-slate-800 font-semibold">
              Votre commande est confirmée et validée par la passerelle de paiement.
            </p>
          </div>

          {/* Récapitulatif de commande propre */}
          <div className="max-w-md mx-auto p-5.5 rounded-3xl bg-slate-50 border-2 border-slate-200 text-left space-y-3.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-slate-700 font-semibold">
              <span>Référence commande :</span>
              <span className="font-mono font-black text-blue-600">
                {completedDetails?.transactionId || orderId}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 font-semibold">
              <span>Article commandé :</span>
              <span className="font-black text-slate-950 truncate max-w-[200px]">
                {resolvedProduct.name}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 font-semibold">
              <span>Total réglé :</span>
              <span className="font-mono font-black text-lg text-emerald-600">
                {formatCFA(finalTotal)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 font-semibold">
              <span>Mode de paiement :</span>
              <span className="font-black text-slate-950">
                {completedDetails?.paymentMethod === 'CASH_ON_DELIVERY'
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

          {/* ACTIONS POST-PAIEMENT (BOUTONS SECONDAIRES) */}
          <div className="max-w-md mx-auto pt-2 flex flex-col sm:flex-row items-center gap-3.5">
            
            {/* Bouton "Contacter sur Wameet Direct" avec icône verte */}
            <a
              href={getWReceiptUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playValidationBeep()}
              className="w-full sm:flex-1 py-4 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Contacter sur Wameet Direct</span>
            </a>

            {/* Bouton "Retour à la boutique" pour inciter à racheter */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onBackToStore) onBackToStore();
                else if (onCancel) onCancel();
                else if (typeof window !== 'undefined') window.location.href = '/';
              }}
              className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-950 border-2 border-slate-300 font-black text-xs sm:text-sm transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Retour à la boutique</span>
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
