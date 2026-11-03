import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Store, ShoppingBag, PhoneCall, ChevronLeft, ChevronRight, 
  Search, ShieldCheck, Truck, CreditCard, Sparkles, Star, 
  ExternalLink, ArrowRight, Tag, Heart, X, Check, Lock, Plus,
  MessageSquare, Copy, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Clock,
  Flame, Radio, Globe, Coins, MapPin, AlertTriangle, Eye, Video, Zap
} from 'lucide-react';
import { StoreConfig, StoreProductItem, StoreBlock } from './types';
import { 
  CustomerOrder, 
  MobileOperatorConfig, 
  CentralPaymentConfig,
  CountryCode,
  CryptoCurrency,
  CountryPaymentOption
} from '../../../../types';
import { ProductDetailModal } from './ProductDetailModal';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { 
  saveStoreDocument, 
  DEFAULT_PLATFORM_SUBSCRIPTIONS, 
  subscribeToPlatformSubscriptions,
  subscribeToCentralPaymentConfig
} from '../../../../utils/firestoreService';
import { 
  DEFAULT_CENTRAL_PAYMENT_CONFIG,
  SUPPORTED_COUNTRIES,
  getCryptoOptions,
  getCountryPaymentOptions,
  getQrCodeUrl
} from '../../../../utils/countryPaymentMatrix';
import { generateUssdDialString } from '../../../../utils/ussdGenerator';
import { useSmsPaymentWatcher } from '../../../../hooks/useSmsPaymentWatcher';
import { UltimateCheckout, UltimateCheckout as NanasorePaymentGateway, PaymentSuccessDetails } from '../../../../components/payment/UltimateCheckout';

interface MobileStorePreviewProps {
  storeConfig: StoreConfig;
  catalogItems: StoreProductItem[];
  publicStoreUrl: string;
  isVerified?: boolean;
}

interface CartEntry {
  product: StoreProductItem;
  quantity: number;
}

type CheckoutStep = 'CART' | 'UPSELL' | 'DOWNSELL' | 'PAYMENT' | 'ORDER_CONFIRMED';

export const MobileStorePreview: React.FC<MobileStorePreviewProps> = ({
  storeConfig,
  catalogItems,
  publicStoreUrl,
  isVerified = false
}) => {
  // Navigation du carrousel d'affiches
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const promoScrollRef = useRef<HTMLDivElement>(null);

  // Recherche et filtres de catégories en direct
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');

  // Modal détail du produit sélectionné
  const [selectedProduct, setSelectedProduct] = useState<StoreProductItem | null>(null);

  const previewStoreKey = (storeConfig as any).storeId || (storeConfig as any).slug || 'store-nana-1';

  // Panier virtuel avec auto-cache persistant pour les smartphones
  const [cart, setCart] = useState<CartEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`nana_preview_cart_${previewStoreKey}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(`nana_preview_cart_${previewStoreKey}`, JSON.stringify(cart));
    } catch {}
  }, [cart, previewStoreKey]);

  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('CART');
  const [downsellApplied, setDownsellApplied] = useState(false);
  const [isNanasoreModalOpen, setIsNanasoreModalOpen] = useState(false);

  // Données du client avec auto-cache persistant
  const [orderCustomerName, setOrderCustomerName] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nana_customer_name') || '' : '';
  });
  const [orderCustomerPhone, setOrderCustomerPhone] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nana_customer_phone') || '' : '';
  });
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nana_customer_address') || '' : '';
  });
  const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<string>('Ouagadougou');

  useEffect(() => {
    try {
      if (orderCustomerName) localStorage.setItem('nana_customer_name', orderCustomerName);
      if (orderCustomerPhone) localStorage.setItem('nana_customer_phone', orderCustomerPhone);
      if (orderDeliveryAddress) localStorage.setItem('nana_customer_address', orderDeliveryAddress);
    } catch {}
  }, [orderCustomerName, orderCustomerPhone, orderDeliveryAddress]);

  // Configuration Centrale des Paiements
  const [centralConfig, setCentralConfig] = useState<CentralPaymentConfig>(DEFAULT_CENTRAL_PAYMENT_CONFIG);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'COD' | 'MOMO' | 'CARD' | 'CRYPTO'>('COD');
  const [orderPaymentRef, setOrderPaymentRef] = useState('');

  // Matrice Multi-Pays Mobile Money
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('BF');
  const [selectedMomoIdx, setSelectedMomoIdx] = useState<number>(0);
  const [isCopiedRecipient, setIsCopiedRecipient] = useState(false);
  const [isCopiedUssd, setIsCopiedUssd] = useState(false);

  // Options Crypto
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency>('USDT_TRC20');
  const [cryptoTxHash, setCryptoTxHash] = useState('');
  const [isCopiedCryptoAddr, setIsCopiedCryptoAddr] = useState(false);

  // Formulaire Carte Bancaire
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<CustomerOrder | null>(null);
  const [upsellAddedIds, setUpsellAddedIds] = useState<Record<string, boolean>>({});

  // Écouteur temps réel sur parametres/paiement
  useEffect(() => {
    const unsub = subscribeToCentralPaymentConfig((cfg) => {
      setCentralConfig(cfg);
      if (cfg.deliveryZones && cfg.deliveryZones.length > 0) {
        setSelectedDeliveryZone(prev => prev || cfg.deliveryZones[0]);
      }
    });
    return () => unsub();
  }, []);

  // Réinitialiser le sous-opérateur lors du changement de pays
  useEffect(() => {
    setSelectedMomoIdx(0);
  }, [selectedCountry]);

  // Articles suggérés pour l'upsell (produits du catalogue non encore dans le panier)
  const upsellCandidates = useMemo(() => {
    return catalogItems.filter(item => !cart.some(c => c.product.id === item.id)).slice(0, 3);
  }, [catalogItems, cart]);

  // Modification quantité dans le panier
  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter((item): item is CartEntry => item !== null);
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Catégories uniques
  const categories = useMemo(() => {
    const cats = new Set<string>();
    catalogItems.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return ['TOUS', ...Array.from(cats)];
  }, [catalogItems]);

  // Filtrage en direct des produits
  const filteredProducts = useMemo(() => {
    return catalogItems.filter(item => {
      const matchCat = selectedCategory === 'TOUS' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchQuery = !searchQuery.trim() || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [catalogItems, selectedCategory, searchQuery]);

  // Autoplay du carrousel d'affiches si activé
  const promoBanners = storeConfig.promoBanners || [];
  const promoBlock = storeConfig.layoutBlocks?.find(b => b.type === 'promo_carousel');
  const isAutoplayEnabled = promoBlock?.content?.autoplay ?? true;

  useEffect(() => {
    if (!isAutoplayEnabled || promoBanners.length <= 1) return;

    const interval = setInterval(() => {
      setActivePromoIndex(prev => {
        const next = (prev + 1) % promoBanners.length;
        if (promoScrollRef.current) {
          const scrollWidth = promoScrollRef.current.clientWidth;
          promoScrollRef.current.scrollTo({
            left: next * scrollWidth,
            behavior: 'smooth'
          });
        }
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoplayEnabled, promoBanners.length]);

  const scrollToPromo = (index: number) => {
    playTapBeep();
    setActivePromoIndex(index);
    if (promoScrollRef.current) {
      const scrollWidth = promoScrollRef.current.clientWidth;
      promoScrollRef.current.scrollTo({
        left: index * scrollWidth,
        behavior: 'smooth'
      });
    }
  };

  // Ajout au panier virtuel
  const handleAddToCart = (product: StoreProductItem, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  // Calcul du panier avec support Downsell
  const cartTotalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const downsellDiscount = downsellApplied ? Math.min(2000, Math.max(500, Math.floor(cartSubtotal * 0.1))) : 0;
  const cartTotalPrice = Math.max(0, cartSubtotal - downsellDiscount);

  // Matrice Multi-Pays Mobile Money pour la Boutique
  const countryMomoOptions = useMemo(() => {
    return getCountryPaymentOptions(selectedCountry, cartTotalPrice, centralConfig);
  }, [selectedCountry, cartTotalPrice, centralConfig]);

  const currentMomoOption: CountryPaymentOption = countryMomoOptions[selectedMomoIdx] || countryMomoOptions[0] || {
    id: 'default',
    operator: 'Orange Money Burkina',
    label: 'Orange Money (USSD)',
    type: 'USSD',
    instructions: 'Réglez votre commande avec Orange Money.',
    steps: []
  };

  // Options Crypto dynamiques pour la Boutique (USDT, XMR, BTC)
  const cryptoOptions = useMemo(() => {
    return getCryptoOptions(centralConfig);
  }, [centralConfig]);

  const currentCryptoOption = cryptoOptions.find(c => c.id === selectedCrypto) || cryptoOptions[0];

  const cryptoEstimatedAmount = useMemo(() => {
    switch (selectedCrypto) {
      case 'USDT_TRC20':
        return `${(cartTotalPrice / 620).toFixed(2)} USDT`;
      case 'XMR':
        return `${(cartTotalPrice / 110000).toFixed(4)} XMR`;
      case 'BTC':
        return `${(cartTotalPrice / 40000000).toFixed(6)} BTC`;
      default:
        return `${(cartTotalPrice / 620).toFixed(2)} USDT`;
    }
  }, [selectedCrypto, cartTotalPrice]);

  // Vérification de la zone de livraison COD
  const isDeliveryZoneCovered = useMemo(() => {
    if (!centralConfig.deliveryZones || centralConfig.deliveryZones.length === 0) return true;
    const cleanAddr = (orderDeliveryAddress || '').toLowerCase();
    const cleanZone = (selectedDeliveryZone || '').toLowerCase();
    if (cleanZone === 'autre') return false;
    return centralConfig.deliveryZones.some(z => 
      cleanAddr.includes(z.toLowerCase()) || cleanZone.includes(z.toLowerCase())
    );
  }, [orderDeliveryAddress, selectedDeliveryZone, centralConfig.deliveryZones]);

  // Copier le code USSD
  const copyUssdCode = () => {
    const code = currentMomoOption.ussdCode || '';
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setIsCopiedUssd(true);
      setTimeout(() => setIsCopiedUssd(false), 2000);
    } catch {
      setIsCopiedUssd(true);
      setTimeout(() => setIsCopiedUssd(false), 2000);
    }
  };

  // Copier le numéro destinataire
  const copyRecipientNumber = (num: string) => {
    try {
      navigator.clipboard.writeText(num);
      setIsCopiedRecipient(true);
      setTimeout(() => setIsCopiedRecipient(false), 2000);
    } catch {
      setIsCopiedRecipient(true);
      setTimeout(() => setIsCopiedRecipient(false), 2000);
    }
  };

  // Copier l'adresse crypto
  const copyCryptoAddress = (addr: string) => {
    try {
      navigator.clipboard.writeText(addr);
      setIsCopiedCryptoAddr(true);
      setTimeout(() => setIsCopiedCryptoAddr(false), 2000);
    } catch {
      setIsCopiedCryptoAddr(true);
      setTimeout(() => setIsCopiedCryptoAddr(false), 2000);
    }
  };

  // Écouteur SMS Realtime Database (Passerelle MacroDroid) pour les commandes Boutique
  const { isListening: isSmsListening, matchedPayment: matchedSmsPayment } = useSmsPaymentWatcher({
    enabled: showCartDrawer && checkoutStep === 'PAYMENT' && orderPaymentMethod === 'MOMO',
    expectedAmount: cartTotalPrice,
    customerPhone: orderCustomerPhone,
    targetType: 'STORE_ORDER',
    targetStoreId: (storeConfig as any).storeId || 'store-nana-1',
    onPaymentSuccess: async (result) => {
      playValidationBeep();
      const orderId = `CMD-${Date.now().toString(36).toUpperCase()}`;
      const storeId = (storeConfig as any).storeId || 'store-nana-1';

      const newOrder: CustomerOrder = {
        id: orderId,
        orderNumber: orderId,
        storeId,
        type: 'BON_COMMANDE',
        status: 'confirmed_paid',
        date: new Date().toISOString().split('T')[0],
        deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        customerName: orderCustomerName.trim() || 'Client Vitrine',
        customerPhone: orderCustomerPhone.trim() || result.matchedSms.expediteur,
        customerAddress: orderDeliveryAddress.trim() || selectedDeliveryZone || '',
        items: cart.map(c => ({
          id: `item-${c.product.id}`,
          productId: c.product.id,
          name: c.product.name,
          quantity: c.quantity,
          unitPrice: c.product.price,
          total: c.product.price * c.quantity
        })),
        subtotal: cartSubtotal,
        discount: downsellDiscount,
        total: cartTotalPrice,
        depositAmount: cartTotalPrice,
        remainingBalance: 0,
        paymentMethod: 'MOMO',
        paymentReference: result.transactionRef,
        selectedOperator: currentMomoOption.operator,
        notes: `Paiement Mobile Money validé automatiquement via Sebpay (${result.transactionRef}).`,
        createdAt: Date.now()
      };

      try {
        await saveStoreDocument('orders', newOrder, storeId);
      } catch (e) {
        console.warn('[STOREFRONT] Erreur enregistrement commande auto-paid :', e);
      }

      setOrderPaymentRef(result.transactionRef);
      setConfirmedOrder(newOrder);
      setCheckoutStep('ORDER_CONFIRMED');
    }
  });

  // Callback de validation Nanasore Payment Gateway pour les boutiques vitrines (Règle 3)
  const handleNanasoreMomoSuccess = async (details: PaymentSuccessDetails) => {
    playValidationBeep();
    const orderId = `CMD-${Date.now().toString(36).toUpperCase()}`;
    const storeId = (storeConfig as any).storeId || 'store-nana-1';
    const fullAddress = `${selectedDeliveryZone ? `[Zone: ${selectedDeliveryZone}] ` : ''}${orderDeliveryAddress.trim()}`.trim();

    const newOrder: CustomerOrder = {
      id: orderId,
      orderNumber: orderId,
      storeId,
      type: 'BON_COMMANDE',
      status: 'confirmed_paid',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      customerName: orderCustomerName.trim() || 'Client Vitrine',
      customerPhone: details.phoneNumber || orderCustomerPhone.trim() || '',
      customerAddress: fullAddress,
      items: cart.map(c => ({
        id: `item-${c.product.id}`,
        productId: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price,
        total: c.product.price * c.quantity
      })),
      subtotal: cartSubtotal,
      discount: downsellDiscount,
      total: cartTotalPrice,
      depositAmount: cartTotalPrice,
      remainingBalance: 0,
      paymentMethod: 'MOMO',
      paymentReference: details.transactionId,
      selectedOperator: details.operator?.name || 'Mobile Money',
      notes: `Paiement Mobile Money validé en temps réel via Sebpay (${details.transactionId}).`,
      createdAt: Date.now()
    };

    try {
      await saveStoreDocument('orders', newOrder, storeId);
    } catch (e) {
      console.warn('[STOREFRONT] Erreur enregistrement commande auto-paid :', e);
    }

    setOrderPaymentRef(details.transactionId);
    setConfirmedOrder(newOrder);
    setIsNanasoreModalOpen(false);
    setCheckoutStep('ORDER_CONFIRMED');
  };

  // Envoi WhatsApp du panier complet avec options de règlement
  const getWhatsAppCartUrl = () => {
    const cleanPhone = storeConfig.whatsappPhone.replace(/[^0-9]/g, '');
    let text = `Bonjour *${storeConfig.storeName}* ! 🛒\n\nJe souhaite passer la commande suivante :\n`;
    cart.forEach(item => {
      text += `• ${item.product.name} (x${item.quantity}) = ${formatCFA(item.product.price * item.quantity)}\n`;
    });
    text += `\n*TOTAL : ${formatCFA(cartTotalPrice)}*\n`;
    if (orderPaymentMethod === 'COD') {
      text += `• Règlement : Paiement à la livraison (Cash on Delivery / Espèces)\n`;
    } else {
      text += `• Règlement : Mobile Money (${currentMomoOption.operator})\n`;
      text += `• Réf. Transaction : ${orderPaymentRef.trim() || 'Validée'}\n`;
    }
    if (orderDeliveryAddress.trim()) {
      text += `• Adresse de livraison : ${orderDeliveryAddress.trim()}\n`;
    }
    text += `\nMerci de confirmer la prise en charge de ma commande !`;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  // URL WhatsApp pour Contacter le Livreur (Cash on Delivery)
  const getWhatsAppCodUrl = () => {
    const cleanPhone = storeConfig.whatsappPhone.replace(/[^0-9]/g, '');
    const orderNum = confirmedOrder?.orderNumber || 'CMD-LIVR';
    let text = `Bonjour *${storeConfig.storeName}* ! 🚚\n\nJ'ai passé la commande *#${orderNum}* en *Paiement à la Livraison (Cash on Delivery)* :\n\n`;
    cart.forEach(item => {
      text += `• ${item.product.name} (x${item.quantity}) = ${formatCFA(item.product.price * item.quantity)}\n`;
    });
    text += `\n*MONTANT EXACT EN ESPÈCES À PRÉPARER : ${formatCFA(cartTotalPrice)}*\n`;
    if (orderDeliveryAddress.trim()) {
      text += `📍 *Adresse de livraison :* ${orderDeliveryAddress.trim()}\n`;
    }
    if (orderCustomerPhone.trim()) {
      text += `📞 *Téléphone client :* ${orderCustomerPhone.trim()}\n`;
    }
    if (orderCustomerName.trim()) {
      text += `👤 *Client :* ${orderCustomerName.trim()}\n`;
    }
    text += `\nMerci d'informer le livreur afin de procéder à la livraison. Les espèces sont prêtes !`;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  // URL WhatsApp pour Envoyer la preuve de paiement Mobile Money
  const getWhatsAppMomoUrl = () => {
    const cleanPhone = storeConfig.whatsappPhone.replace(/[^0-9]/g, '');
    const orderNum = confirmedOrder?.orderNumber || 'CMD-MOMO';
    let text = `Bonjour *${storeConfig.storeName}* ! 💳\n\nJ'ai validé le règlement de ma commande *#${orderNum}* par *Mobile Money* :\n\n`;
    cart.forEach(item => {
      text += `• ${item.product.name} (x${item.quantity}) = ${formatCFA(item.product.price * item.quantity)}\n`;
    });
    text += `\n*MONTANT TOTAL RÉGLÉ : ${formatCFA(cartTotalPrice)}*\n`;
    text += `📱 *Opérateur :* ${currentMomoOption.operator} (${selectedCountry})\n`;
    text += `🆔 *RÉFÉRENCE DE TRANSACTION :* ${orderPaymentRef.trim()}\n`;
    if (orderDeliveryAddress.trim() || selectedDeliveryZone) {
      text += `📍 *Adresse de livraison :* ${selectedDeliveryZone ? `[${selectedDeliveryZone}] ` : ''}${orderDeliveryAddress.trim()}\n`;
    }
    if (orderCustomerPhone.trim()) {
      text += `📞 *Téléphone client :* ${orderCustomerPhone.trim()}\n`;
    }
    if (orderCustomerName.trim()) {
      text += `👤 *Client :* ${orderCustomerName.trim()}\n`;
    }
    text += `\nCommande validée avec succès. Merci de confirmer l'expédition !`;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  // URL WhatsApp pour Paiement Carte Bancaire
  const getWhatsAppCardUrl = () => {
    const cleanPhone = storeConfig.whatsappPhone.replace(/[^0-9]/g, '');
    const orderNum = confirmedOrder?.orderNumber || 'CMD-CARD';
    let text = `Bonjour *${storeConfig.storeName}* ! 💳\n\nJ'ai réglé ma commande *#${orderNum}* par *Carte Bancaire 3D-Secure* :\n\n`;
    cart.forEach(item => {
      text += `• ${item.product.name} (x${item.quantity}) = ${formatCFA(item.product.price * item.quantity)}\n`;
    });
    text += `\n*MONTANT RÉGLÉ : ${formatCFA(cartTotalPrice)}*\n`;
    text += `🆔 *Réf. Transaction :* ${orderPaymentRef || confirmedOrder?.paymentReference || 'CARD-TX'}\n`;
    if (orderDeliveryAddress.trim() || selectedDeliveryZone) {
      text += `📍 *Adresse de livraison :* ${selectedDeliveryZone ? `[${selectedDeliveryZone}] ` : ''}${orderDeliveryAddress.trim()}\n`;
    }
    text += `\nMerci de confirmer la prise en charge et l'expédition !`;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  // URL WhatsApp pour Paiement Crypto
  const getWhatsAppCryptoUrl = () => {
    const cleanPhone = storeConfig.whatsappPhone.replace(/[^0-9]/g, '');
    const orderNum = confirmedOrder?.orderNumber || 'CMD-CRYPTO';
    let text = `Bonjour *${storeConfig.storeName}* ! ⚡\n\nJ'ai réglé ma commande *#${orderNum}* par *Crypto (${selectedCrypto})* :\n\n`;
    cart.forEach(item => {
      text += `• ${item.product.name} (x${item.quantity}) = ${formatCFA(item.product.price * item.quantity)}\n`;
    });
    text += `\n*MONTANT : ${formatCFA(cartTotalPrice)}* (≈ ${cryptoEstimatedAmount})\n`;
    text += `🆔 *TXID / Hash :* ${cryptoTxHash || orderPaymentRef || 'CRYPTO-TX'}\n`;
    if (orderDeliveryAddress.trim() || selectedDeliveryZone) {
      text += `📍 *Adresse de livraison :* ${selectedDeliveryZone ? `[${selectedDeliveryZone}] ` : ''}${orderDeliveryAddress.trim()}\n`;
    }
    text += `\nMerci de vérifier la confirmation blockchain et d'expédier ma commande !`;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  // Navigation du tunnel : Upsell ou Règlement
  const handleProceedToUpsellOrPayment = () => {
    playTapBeep();
    if (upsellCandidates.length > 0) {
      setCheckoutStep('UPSELL');
    } else {
      setCheckoutStep('PAYMENT');
    }
  };

  // Ajout produit upsell
  const handleAddUpsellProduct = (product: StoreProductItem) => {
    playTapBeep();
    handleAddToCart(product, 1);
    setUpsellAddedIds(prev => ({ ...prev, [product.id]: true }));
  };

  // Validation Commande Cash on Delivery
  const handleConfirmCodOrder = async () => {
    playTapBeep();
    setIsSubmittingOrder(true);
    const orderId = `CMD-${Date.now().toString(36).toUpperCase()}`;
    const storeId = (storeConfig as any).storeId || 'store-nana-1';
    const fullAddress = `${selectedDeliveryZone ? `[Zone: ${selectedDeliveryZone}] ` : ''}${orderDeliveryAddress.trim()}`.trim();

    const newOrder: CustomerOrder = {
      id: orderId,
      orderNumber: orderId,
      storeId,
      type: 'BON_COMMANDE',
      status: 'pending_delivery',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      customerName: orderCustomerName.trim() || 'Client Vitrine',
      customerPhone: orderCustomerPhone.trim() || '',
      customerAddress: fullAddress,
      items: cart.map(c => ({
        id: `item-${c.product.id}`,
        productId: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price,
        total: c.product.price * c.quantity
      })),
      subtotal: cartSubtotal,
      discount: downsellDiscount,
      total: cartTotalPrice,
      depositAmount: 0,
      remainingBalance: cartTotalPrice,
      paymentMethod: 'COD',
      notes: `Paiement à la livraison. Montant espèces à préparer : ${formatCFA(cartTotalPrice)}. Zone : ${selectedDeliveryZone || 'Standard'}`,
      createdAt: Date.now()
    };

    try {
      await saveStoreDocument('orders', newOrder, storeId);
    } catch (e) {
      console.warn('[STOREFRONT] Erreur enregistrement commande COD :', e);
    }

    playValidationBeep();
    setConfirmedOrder(newOrder);
    setCheckoutStep('ORDER_CONFIRMED');
    setIsSubmittingOrder(false);
  };

  // Validation Commande Mobile Money
  const handleConfirmMomoOrder = async () => {
    if (!orderPaymentRef.trim()) return;
    playTapBeep();
    setIsSubmittingOrder(true);
    const orderId = `CMD-${Date.now().toString(36).toUpperCase()}`;
    const storeId = (storeConfig as any).storeId || 'store-nana-1';
    const fullAddress = `${selectedDeliveryZone ? `[Zone: ${selectedDeliveryZone}] ` : ''}${orderDeliveryAddress.trim()}`.trim();

    const newOrder: CustomerOrder = {
      id: orderId,
      orderNumber: orderId,
      storeId,
      type: 'BON_COMMANDE',
      status: 'pending_verification',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      customerName: orderCustomerName.trim() || 'Client Vitrine',
      customerPhone: orderCustomerPhone.trim() || '',
      customerAddress: fullAddress,
      items: cart.map(c => ({
        id: `item-${c.product.id}`,
        productId: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price,
        total: c.product.price * c.quantity
      })),
      subtotal: cartSubtotal,
      discount: downsellDiscount,
      total: cartTotalPrice,
      depositAmount: cartTotalPrice,
      remainingBalance: 0,
      paymentMethod: 'MOMO',
      paymentReference: orderPaymentRef.trim(),
      selectedOperator: currentMomoOption.operator,
      notes: `Paiement Mobile Money via ${currentMomoOption.operator} (${selectedCountry}). Réf: ${orderPaymentRef.trim()}`,
      createdAt: Date.now()
    };

    try {
      await saveStoreDocument('orders', newOrder, storeId);
    } catch (e) {
      console.warn('[STOREFRONT] Erreur enregistrement commande MOMO :', e);
    }

    playValidationBeep();
    setConfirmedOrder(newOrder);
    setCheckoutStep('ORDER_CONFIRMED');
    setIsSubmittingOrder(false);
  };

  // Validation Commande Carte Bancaire
  const handleConfirmCardOrder = async () => {
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim()) return;
    playTapBeep();
    setIsSubmittingOrder(true);
    const orderId = `CMD-${Date.now().toString(36).toUpperCase()}`;
    const storeId = (storeConfig as any).storeId || 'store-nana-1';
    const txRef = `CARD-TX-${Date.now().toString(36).toUpperCase()}`;
    const fullAddress = `${selectedDeliveryZone ? `[Zone: ${selectedDeliveryZone}] ` : ''}${orderDeliveryAddress.trim()}`.trim();

    const newOrder: CustomerOrder = {
      id: orderId,
      orderNumber: orderId,
      storeId,
      type: 'BON_COMMANDE',
      status: 'confirmed_paid',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      customerName: cardHolder.trim() || orderCustomerName.trim() || 'Client Vitrine',
      customerPhone: orderCustomerPhone.trim() || '',
      customerAddress: fullAddress,
      items: cart.map(c => ({
        id: `item-${c.product.id}`,
        productId: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price,
        total: c.product.price * c.quantity
      })),
      subtotal: cartSubtotal,
      discount: downsellDiscount,
      total: cartTotalPrice,
      depositAmount: cartTotalPrice,
      remainingBalance: 0,
      paymentMethod: 'CARD',
      paymentReference: txRef,
      notes: `Paiement Carte Bancaire 3D-Secure certifié. Réf: ${txRef}`,
      createdAt: Date.now()
    };

    try {
      await saveStoreDocument('orders', newOrder, storeId);
    } catch (e) {
      console.warn('[STOREFRONT] Erreur enregistrement commande Carte :', e);
    }

    playValidationBeep();
    setOrderPaymentRef(txRef);
    setConfirmedOrder(newOrder);
    setCheckoutStep('ORDER_CONFIRMED');
    setIsSubmittingOrder(false);
  };

  // Validation Commande Crypto (USDT, XMR, BTC)
  const handleConfirmCryptoOrder = async () => {
    if (!cryptoTxHash.trim()) return;
    playTapBeep();
    setIsSubmittingOrder(true);
    const orderId = `CMD-${Date.now().toString(36).toUpperCase()}`;
    const storeId = (storeConfig as any).storeId || 'store-nana-1';
    const cleanHash = cryptoTxHash.trim();
    const txRef = `${selectedCrypto}-TX-${cleanHash.slice(0, 14).toUpperCase()}`;
    const fullAddress = `${selectedDeliveryZone ? `[Zone: ${selectedDeliveryZone}] ` : ''}${orderDeliveryAddress.trim()}`.trim();

    const newOrder: CustomerOrder = {
      id: orderId,
      orderNumber: orderId,
      storeId,
      type: 'BON_COMMANDE',
      status: 'confirmed_paid',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      customerName: orderCustomerName.trim() || 'Client Vitrine',
      customerPhone: orderCustomerPhone.trim() || '',
      customerAddress: fullAddress,
      items: cart.map(c => ({
        id: `item-${c.product.id}`,
        productId: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price,
        total: c.product.price * c.quantity
      })),
      subtotal: cartSubtotal,
      discount: downsellDiscount,
      total: cartTotalPrice,
      depositAmount: cartTotalPrice,
      remainingBalance: 0,
      paymentMethod: 'CRYPTO',
      paymentReference: txRef,
      notes: `Règlement Crypto ${selectedCrypto} (${cleanHash}). Réf: ${txRef}`,
      createdAt: Date.now()
    };

    try {
      await saveStoreDocument('orders', newOrder, storeId);
    } catch (e) {
      console.warn('[STOREFRONT] Erreur enregistrement commande Crypto :', e);
    }

    playValidationBeep();
    setOrderPaymentRef(txRef);
    setConfirmedOrder(newOrder);
    setCheckoutStep('ORDER_CONFIRMED');
  };

  // Réinitialiser le tunnel et fermer le panier
  const handleCloseAndResetDrawer = () => {
    playTapBeep();
    setShowCartDrawer(false);
    setCheckoutStep('CART');
    setDownsellApplied(false);
    if (confirmedOrder) {
      setCart([]);
      setConfirmedOrder(null);
      setOrderPaymentRef('');
      setUpsellAddedIds({});
    }
  };

  // Rendu de chaque bloc selon l'ordre défini par le Mini-Elementor
  const renderBlock = (block: StoreBlock) => {
    if (!block.visible) return null;

    switch (block.type) {
      case 'hero_banner': {
        const heading = block.content.heading || storeConfig.welcomeText || storeConfig.storeName;
        const subtext = block.content.subtext || "Livraison express en moins de 30 minutes !";
        const ctaText = block.content.ctaText || "Commander sur WhatsApp";
        const cleanPhone = storeConfig.whatsappPhone.replace(/[^0-9]/g, '');
        const whatsappHeroUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
          `Bonjour *${storeConfig.storeName}*, je souhaite passer une commande !`
        )}`;

        return (
          <div key={block.id} className="relative min-h-[190px] bg-slate-800 flex flex-col justify-end overflow-hidden">
            {storeConfig.bannerImage ? (
              <img 
                src={storeConfig.bannerImage} 
                alt="Bannière" 
                className="absolute inset-0 w-full h-full object-cover" 
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 via-indigo-800 to-purple-900" />
            )}

            {/* Voile sombre en dégradé pour lisibilité parfaite */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

            <div className="relative p-4 z-10 space-y-1.5">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-slate-950 text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                ● Ouvert • Prêt à livrer
              </span>
              <h2 className="text-base font-black text-white leading-tight drop-shadow-sm">
                {heading}
              </h2>
              <p className="text-[11px] text-slate-300 line-clamp-2">
                {subtext}
              </p>
              
              <div className="pt-1">
                <a
                  href={whatsappHeroUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => playTapBeep()}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-lg transition active:scale-95"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{ctaText}</span>
                </a>
              </div>
            </div>
          </div>
        );
      }

      case 'announcement_marquee': {
        if (storeConfig.showPaymentTicker === false) return null;
        const marqueeText = storeConfig.paymentTickerText || block.content.marqueeText || "⚡ PROMO FLASH : Livraison gratuite dès 10 000 F CFA • Paiement Wave & Orange Money acceptés !";
        const bgColor = block.content.bgColor || '#ea580c';
        const customGradient = storeConfig.tickerBgGradient;

        return (
          <div 
            key={block.id}
            style={customGradient ? undefined : { backgroundColor: bgColor }}
            className={`py-1.5 px-3 overflow-hidden whitespace-nowrap text-white text-[11px] font-black flex items-center shadow-inner relative ${
              customGradient ? `bg-gradient-to-r ${customGradient}` : ''
            }`}
          >
            <div className="inline-block animate-marquee uppercase tracking-wider">
              {marqueeText} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; {marqueeText}
            </div>
          </div>
        );
      }

      case 'promo_carousel': {
        if (promoBanners.length === 0) return null;

        return (
          <div key={block.id} className="p-3 bg-slate-950 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Offres & Promotions Spéciales
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollToPromo((activePromoIndex - 1 + promoBanners.length) % promoBanners.length)}
                  className="p-1 rounded-full bg-slate-800 text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToPromo((activePromoIndex + 1) % promoBanners.length)}
                  className="p-1 rounded-full bg-slate-800 text-slate-300 hover:text-white"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Conteneur défilant fluide snap-x */}
            <div 
              ref={promoScrollRef}
              className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none pb-1"
            >
              {promoBanners.map((banner, idx) => (
                <div 
                  key={idx} 
                  className="w-full shrink-0 snap-center rounded-2xl overflow-hidden border border-slate-700/80 shadow-md relative group h-28"
                >
                  <img src={banner} alt={`Promo ${idx}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            {/* Indicateurs à points */}
            {promoBanners.length > 1 && (
              <div className="flex justify-center gap-1.5 pt-0.5">
                {promoBanners.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToPromo(i)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activePromoIndex === i ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'products_section': {
        const layoutMode = block.content.layoutMode || 'CAROUSEL';

        return (
          <div key={block.id} className="p-3.5 space-y-3 bg-slate-950">
            {/* Barre de Recherche Instantanée */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un article..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtres par Catégorie (Boutons horizontaux) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { playTapBeep(); setSelectedCategory(cat); }}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Titre & Nombre de résultats */}
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                {selectedCategory === 'TOUS' ? 'Tous nos Rayons' : selectedCategory}
              </h3>
              <span className="text-[10px] text-indigo-400 font-bold">
                {filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Mode d'affichage 1 : Carrousel Horizontal Défilant (Snap-X) */}
            {layoutMode === 'CAROUSEL' ? (
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 scrollbar-none">
                {filteredProducts.map((prod, idx) => {
                  const isFlash = prod.isFlashSale || (prod.originalPrice && prod.originalPrice > prod.price);
                  const discountPct = prod.originalPrice && prod.originalPrice > prod.price
                    ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
                    : prod.flashDiscountPercent || 0;

                  return (
                    <div
                      key={`preview-carousel-${prod.id}-${idx}`}
                      onClick={() => { playTapBeep(); setSelectedProduct(prod); }}
                      className="w-40 shrink-0 snap-center bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm cursor-pointer transition hover:scale-[1.02]"
                    >
                      <div className="w-full h-24 bg-slate-950 rounded-xl mb-2 flex items-center justify-center relative overflow-hidden">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-slate-600" />
                        )}
                        <span className="absolute top-1 left-1 bg-slate-900/90 backdrop-blur-xs text-[8.5px] text-slate-400 px-1.5 py-0.5 rounded-md font-bold">
                          {prod.category}
                        </span>

                        {isFlash && (
                          <span className="absolute top-1 right-1 bg-gradient-to-r from-rose-600 to-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md animate-pulse flex items-center gap-0.5 z-10">
                            <Zap className="w-2.5 h-2.5" />
                            <span>Flash</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            setSelectedProduct(prod);
                          }}
                          className="absolute bottom-1 right-1 bg-slate-950/80 hover:bg-emerald-600 active:scale-90 text-slate-200 hover:text-white px-1.5 py-0.5 rounded-md text-[8px] font-bold backdrop-blur-xs border border-slate-700/60 shadow-xs flex items-center gap-1 transition-all z-10 cursor-pointer"
                          title={`Aperçu rapide : ${prod.name}`}
                        >
                          <Eye className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Aperçu</span>
                        </button>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-white line-clamp-1">{prod.name}</h4>
                        <div className="flex items-baseline gap-1.5 my-1 flex-wrap">
                          <span className="text-xs text-emerald-400 font-black">{formatCFA(prod.price)}</span>
                          {prod.originalPrice && prod.originalPrice > prod.price && (
                            <span className="text-[9.5px] text-slate-500 line-through font-mono">
                              {formatCFA(prod.originalPrice)}
                            </span>
                          )}
                          {discountPct > 0 && (
                            <span className="text-[8.5px] font-black text-rose-400 bg-rose-500/20 px-1 py-0.2 rounded border border-rose-500/30">
                              -{discountPct}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Boutons d'Action : Voir Direct & Commander */}
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            setSelectedProduct(prod);
                          }}
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-[9px] font-black py-1.5 px-1 rounded-xl flex items-center justify-center gap-1 transition shadow-sm active:scale-95 border border-emerald-400/30"
                          title="Voir le produit en vidéo en direct (5 min)"
                        >
                          <Video className="w-2.5 h-2.5 text-emerald-200 shrink-0" />
                          <span className="truncate">Voir direct</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            setSelectedProduct(prod);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black py-1.5 px-1 rounded-xl flex items-center justify-center gap-1 transition shadow-sm active:scale-95"
                        >
                          <ShoppingBag className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">Commander</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Mode d'affichage 2 : Grille Classique à 2 Colonnes */
              <div className="grid grid-cols-2 gap-2.5">
                {filteredProducts.map((prod, idx) => {
                  const isFlash = prod.isFlashSale || (prod.originalPrice && prod.originalPrice > prod.price);
                  const discountPct = prod.originalPrice && prod.originalPrice > prod.price
                    ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
                    : prod.flashDiscountPercent || 0;

                  return (
                    <div
                      key={`preview-grid-${prod.id}-${idx}`}
                      onClick={() => { playTapBeep(); setSelectedProduct(prod); }}
                      className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm cursor-pointer transition"
                    >
                      <div className="w-full h-22 bg-slate-950 rounded-xl mb-2 flex items-center justify-center relative overflow-hidden">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-slate-600" />
                        )}

                        {isFlash && (
                          <span className="absolute top-1 right-1 bg-gradient-to-r from-rose-600 to-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md animate-pulse flex items-center gap-0.5 z-10">
                            <Zap className="w-2.5 h-2.5" />
                            <span>Flash</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            setSelectedProduct(prod);
                          }}
                          className="absolute bottom-1 right-1 bg-slate-950/80 hover:bg-emerald-600 active:scale-90 text-slate-200 hover:text-white px-1.5 py-0.5 rounded-md text-[8px] font-bold backdrop-blur-xs border border-slate-700/60 shadow-xs flex items-center gap-1 transition-all z-10 cursor-pointer"
                          title={`Aperçu rapide : ${prod.name}`}
                        >
                          <Eye className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Aperçu</span>
                        </button>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-white line-clamp-1">{prod.name}</h4>
                        <div className="flex items-baseline gap-1.5 my-1 flex-wrap">
                          <span className="text-xs text-emerald-400 font-black">{formatCFA(prod.price)}</span>
                          {prod.originalPrice && prod.originalPrice > prod.price && (
                            <span className="text-[9.5px] text-slate-500 line-through font-mono">
                              {formatCFA(prod.originalPrice)}
                            </span>
                          )}
                          {discountPct > 0 && (
                            <span className="text-[8.5px] font-black text-rose-400 bg-rose-500/20 px-1 py-0.2 rounded border border-rose-500/30">
                              -{discountPct}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Boutons d'Action : Voir Direct & Commander */}
                      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            setSelectedProduct(prod);
                          }}
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-[9px] font-black py-1.5 px-1 rounded-xl flex items-center justify-center gap-1 transition shadow-sm active:scale-95 border border-emerald-400/30"
                          title="Voir le produit en vidéo en direct (5 min)"
                        >
                          <Video className="w-2.5 h-2.5 text-emerald-200 shrink-0" />
                          <span className="truncate">Voir direct</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTapBeep();
                            setSelectedProduct(prod);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black py-1.5 px-1 rounded-xl flex items-center justify-center gap-1 transition shadow-sm active:scale-95"
                        >
                          <ShoppingBag className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">Commander</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'reassurance_reviews': {
        const deliveryText = block.content.deliveryText || "Livraison express sous 30 min";
        const paymentText = block.content.paymentText || "Paiement à la livraison : Cash, Wave ou OM";
        const satisfactionText = block.content.satisfactionText || "Plus de 500 clients fidèles !";

        return (
          <div key={block.id} className="p-3.5 bg-slate-900/60 border-t border-slate-800 space-y-2 text-[10.5px]">
            <div className="flex items-center gap-2 text-slate-300">
              <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{deliveryText}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{paymentText}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{satisfactionText}</span>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre d'outils supérieure */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
        <span className="text-xs text-slate-300 font-medium flex items-center gap-2">
          <Store className="w-4 h-4 text-indigo-400" />
          Aperçu interactif smartphone (glissez avec votre doigt ou souris) :
        </span>
        <button 
          type="button"
          onClick={() => { playTapBeep(); window.open(publicStoreUrl, '_blank'); }}
          className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer text-white shadow-sm"
        >
          <span>Plein écran</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Maquette Smartphone Réaliste */}
      <div className="max-w-sm mx-auto bg-slate-900 border-[6px] border-slate-800 rounded-[42px] overflow-hidden shadow-2xl relative">
        
        {/* Encoche Smartphone / Poinçon caméra */}
        <div className="w-28 h-4 bg-slate-800 mx-auto rounded-b-xl mb-1 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950/80 mr-2" />
          <div className="w-8 h-1 rounded-full bg-slate-700/60" />
        </div>

        {/* Écran Intérieur du Smartphone */}
        <div 
          className="bg-slate-950 min-h-[480px] max-h-[75vh] md:max-h-[640px] overflow-y-auto relative pb-16 scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {/* Badge de confiance KYC ou Bannière Brouillon Palier 1 */}
          {isVerified ? (
            <div className="bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border-b border-emerald-500/30 px-3 py-1.5 flex items-center justify-between text-[10px] text-emerald-200 font-bold sticky top-0 z-20 shadow-sm backdrop-blur-xs">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Boutique Vérifiée ✓ (Officiel Nana)</span>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-500/40">
                Certifiée
              </span>
            </div>
          ) : (
            <div className="bg-amber-950/90 border-b border-amber-500/40 px-3 py-1.5 flex items-center justify-between text-[9.5px] text-amber-300 font-bold sticky top-0 z-20 shadow-sm backdrop-blur-xs">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Mode Brouillon Interne (Palier 1)</span>
              </div>
              <span className="text-[8.5px] text-amber-400/80 underline">
                Non certifiée
              </span>
            </div>
          )}

          {/* Rendu dynamique des blocs selon l'ordre défini */}
          {storeConfig.layoutBlocks?.map(block => renderBlock(block))}

          {/* Pied de page du site public */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 text-center space-y-1">
            <p className="text-[10px] text-slate-400">Paiement à la livraison • Satisfaction 100% garantie</p>
            <div className="text-[9px] text-slate-500 font-bold">Propulsé par Nana SaaS Pro</div>
          </div>
        </div>

        {/* Barre Flottante Panier Virtuel (si articles ajoutés) */}
        {cartTotalCount > 0 && (
          <div className="absolute bottom-3 inset-x-3 z-30 bg-indigo-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
            <div>
              <div className="text-[11px] font-black">{cartTotalCount} article{cartTotalCount > 1 ? 's' : ''}</div>
              <div className="text-xs font-black text-emerald-300">{formatCFA(cartTotalPrice)}</div>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setShowCartDrawer(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Commander ({formatCFA(cartTotalPrice)})</span>
            </button>
          </div>
        )}

        {/* Tiroir / Modale Panier avec Restructuration Complète du Tunnel */}
        {showCartDrawer && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-xs flex flex-col justify-end p-3 animate-in fade-in duration-150">
            <div 
              className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-h-[92%] overflow-y-auto space-y-3.5 shadow-2xl"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            >
              
              {/* ÉTAPE 0 : CONTENU DU PANIER */}
              {checkoutStep === 'CART' && (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-white">Mon Panier de Commande</h3>
                        <p className="text-[10px] text-slate-400">{cartTotalCount} article(s) • {formatCFA(cartTotalPrice)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCartDrawer(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Liste des articles */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                      >
                        <div className="flex-1 pr-2 truncate">
                          <div className="font-semibold text-white truncate text-[11px]">{item.product.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatCFA(item.product.price)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 mr-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQuantity(item.product.id, -1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-white text-[11px]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQuantity(item.product.id, 1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="p-1 text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
                            title="Supprimer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right font-mono font-bold text-amber-300 shrink-0 text-[11px]">
                          {formatCFA(item.product.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coordonnées de livraison */}
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <label className="block text-[10.5px] font-bold text-slate-300 uppercase tracking-wide">
                      Coordonnées de livraison
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={orderCustomerName}
                        onChange={(e) => setOrderCustomerName(e.target.value)}
                        placeholder="Votre nom complet..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-semibold"
                      />
                      <input
                        type="tel"
                        value={orderCustomerPhone}
                        onChange={(e) => setOrderCustomerPhone(e.target.value)}
                        placeholder="Téléphone / WhatsApp..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-semibold"
                      />
                    </div>
                    <input
                      type="text"
                      value={orderDeliveryAddress}
                      onChange={(e) => setOrderDeliveryAddress(e.target.value)}
                      placeholder="Adresse ou quartier de livraison précis..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-semibold"
                    />
                  </div>

                  {/* Bouton pour déclencher l'Upsell ou le Choix de Règlement */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">Total panier :</span>
                      <span className="text-sm font-black text-emerald-300 font-mono">{formatCFA(cartTotalPrice)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleProceedToUpsellOrPayment}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition active:scale-98 cursor-pointer"
                    >
                      <span>Valider ma commande</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}

              {/* ÉTAPE 1 : UPSELL / DOWNSELL (OFFRES COMPLÉMENTAIRES) */}
              {checkoutStep === 'UPSELL' && (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setCheckoutStep('CART'); }}
                        className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <h3 className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Offres complémentaires & Suggestions
                        </h3>
                        <p className="text-[10px] text-slate-400">Profitez-en pour compléter votre commande !</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseAndResetDrawer}
                      className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {upsellCandidates.map((product) => {
                      const isAdded = upsellAddedIds[product.id];
                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-amber-500/30 text-xs shadow-md"
                        >
                          <div className="flex items-center gap-2.5 flex-1 pr-2 truncate">
                            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden border border-slate-800">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingBag className="w-5 h-5 text-slate-600" />
                              )}
                            </div>
                            <div className="truncate">
                              <div className="font-bold text-white text-[11px] truncate">{product.name}</div>
                              <div className="text-[10px] text-emerald-400 font-black">{formatCFA(product.price)}</div>
                              <span className="text-[9px] text-amber-400/90 font-medium">Recommandé avec votre panier</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddUpsellProduct(product)}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-[10.5px] shrink-0 transition flex items-center gap-1 cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Ajouté !</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Ajouter à ma commande</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions Upsell */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">Total actuel :</span>
                      <span className="text-sm font-black text-emerald-300 font-mono">{formatCFA(cartTotalPrice)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        if (Object.keys(upsellAddedIds).length === 0) {
                          setCheckoutStep('DOWNSELL');
                        } else {
                          setCheckoutStep('PAYMENT');
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
                    >
                      <span>Passer cette étape & Choisir le paiement</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}

              {/* ÉTAPE 1.5 : DOWNSELL (OFFRE DÉSTOCKAGE / BON DE RÉDUCTION IMMÉDIAT) */}
              {checkoutStep === 'DOWNSELL' && (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setCheckoutStep('UPSELL'); }}
                        className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <h3 className="font-extrabold text-xs text-rose-300 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          Offre Spéciale : Remise Immédiate
                        </h3>
                        <p className="text-[10px] text-slate-400">Coupon exclusif sur votre commande en cours</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseAndResetDrawer}
                      className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/20 border border-rose-500/30 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">Coupon Déstockage -10%</h4>
                        <p className="text-[10.5px] text-slate-300">
                          Économisez {formatCFA(Math.min(2000, Math.max(500, Math.floor(cartSubtotal * 0.1))))} immédiatement sur votre commande !
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Sous-total articles ({cartTotalCount}) :</span>
                        <span className="line-through">{formatCFA(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>Remise immédiate :</span>
                        <span>- {formatCFA(Math.min(2000, Math.max(500, Math.floor(cartSubtotal * 0.1))))}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-800 flex justify-between font-black text-emerald-400">
                        <span>Nouveau total à régler :</span>
                        <span className="text-sm font-mono">
                          {formatCFA(Math.max(0, cartSubtotal - Math.min(2000, Math.max(500, Math.floor(cartSubtotal * 0.1)))))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setDownsellApplied(true);
                        setCheckoutStep('PAYMENT');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Activer la remise & Commander</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setDownsellApplied(false);
                        setCheckoutStep('PAYMENT');
                      }}
                      className="w-full py-2 px-3 text-slate-400 hover:text-slate-200 text-xs font-semibold text-center cursor-pointer transition"
                    >
                      Continuer sans la réduction
                    </button>
                  </div>
                </>
              )}

              {/* ÉTAPE 2 : PAGE DE RÈGLEMENT & CHOIX DU MOYEN DE PAIEMENT */}
              {checkoutStep === 'PAYMENT' && (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          if (downsellApplied) {
                            setCheckoutStep('DOWNSELL');
                          } else if (upsellCandidates.length > 0) {
                            setCheckoutStep('UPSELL');
                          } else {
                            setCheckoutStep('CART');
                          }
                        }}
                        className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <h3 className="font-extrabold text-xs text-white">Choisissez votre moyen de paiement</h3>
                        <p className="text-[10px] text-slate-400">Total : {formatCFA(cartTotalPrice)} • {cartTotalCount} article(s)</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseAndResetDrawer}
                      className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quatre options de règlement */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setOrderPaymentMethod('COD');
                      }}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        orderPaymentMethod === 'COD'
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md ring-1 ring-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-black">
                        <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">À la livraison</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">Cash on Delivery</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setOrderPaymentMethod('MOMO');
                      }}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        orderPaymentMethod === 'MOMO'
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md ring-1 ring-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-black">
                        <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Mobile Money</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">Wave, Orange, Moov</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setOrderPaymentMethod('CARD');
                      }}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        orderPaymentMethod === 'CARD'
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md ring-1 ring-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-black">
                        <CreditCard className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">Carte Bancaire</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">Visa / Mastercard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setOrderPaymentMethod('CRYPTO');
                      }}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition cursor-pointer ${
                        orderPaymentMethod === 'CRYPTO'
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md ring-1 ring-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-black">
                        <Coins className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="truncate">Crypto</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">USDT / XMR / BTC</span>
                    </button>
                  </div>

                  {/* OPTION A : PAIEMENT À LA LIVRAISON (CASH ON DELIVERY) AVEC VÉRIFICATION ZONE */}
                  {orderPaymentMethod === 'COD' && (
                    <div className="space-y-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                      <div className="flex items-start gap-2 text-xs text-slate-300">
                        <Truck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-white text-xs">Paiement en espèces lors de la livraison (COD)</p>
                          <p className="text-[10px] text-slate-400">
                            Préparez l'appoint exact en espèces pour le livreur dès réception de vos articles physiques.
                          </p>
                        </div>
                      </div>

                      {/* Sélection de la Ville / Zone de Livraison */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span>Zone de livraison couverte :</span>
                        </label>
                        <select
                          value={selectedDeliveryZone}
                          onChange={(e) => setSelectedDeliveryZone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-400 font-semibold"
                        >
                          {centralConfig.deliveryZones.map((zone) => (
                            <option key={zone} value={zone}>{zone}</option>
                          ))}
                          <option value="autre">Autre localité (Hors zone express)</option>
                        </select>
                      </div>

                      {/* Adresse détaillée */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Adresse précise / Quartier de livraison :
                        </label>
                        <input
                          type="text"
                          value={orderDeliveryAddress}
                          onChange={(e) => setOrderDeliveryAddress(e.target.value)}
                          placeholder="Ex: Secteur 15, face pharmacie de la Paix"
                          required
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                        />
                      </div>

                      {/* Alerte de Zone de Livraison */}
                      {!isDeliveryZoneCovered ? (
                        <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-200 text-[10.5px] flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-rose-300 font-bold">Zone non desservie en livraison express :</strong>
                            <span>Cette localité est hors de nos zones de coursiers directs. Nous vous recommandons vivement de régler par Mobile Money ou Carte Bancaire.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-[10.5px] flex items-center gap-1.5 font-bold">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Zone validée pour la livraison express Nana POS !</span>
                        </div>
                      )}

                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Montant en espèces à préparer :</span>
                          <strong className="text-amber-300 font-black">{formatCFA(cartTotalPrice)}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmCodOrder}
                        disabled={isSubmittingOrder || !orderDeliveryAddress.trim()}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-98 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirmer ma commande ({formatCFA(cartTotalPrice)})</span>
                      </button>
                    </div>
                  )}

                  {/* OPTION B : PAIEMENT MOBILE MONEY AVEC MATRICE MULTI-PAYS */}
                  {orderPaymentMethod === 'MOMO' && (
                    <div className="space-y-3">
                      {/* Marquee */}
                      <div className="py-1.5 px-2 bg-gradient-to-r from-orange-600 to-amber-600 overflow-hidden whitespace-nowrap text-white text-[10px] font-black rounded-xl shadow-inner">
                        <div className="inline-block animate-marquee uppercase tracking-wider">
                          {centralConfig.scrollingMarquee || "Validation instantanée et sécurisée via Sebpay. Déblocage automatique en quelques secondes !"}
                        </div>
                      </div>

                      {/* 1. Sélecteur de Pays */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                          1. Votre pays / zone de paiement :
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {SUPPORTED_COUNTRIES.map((c) => {
                            const isSelected = selectedCountry === c.code;
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => { playTapBeep(); setSelectedCountry(c.code); }}
                                className={`p-1.5 rounded-xl border flex items-center gap-1.5 text-left transition cursor-pointer text-[10px] ${
                                  isSelected
                                    ? 'bg-orange-500/20 border-orange-400 text-white ring-1 ring-orange-400'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <span className="text-base">{c.flag}</span>
                                <span className="truncate font-bold text-white">{c.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Avertissement strict Togo */}
                      {selectedCountry === 'TG' && (
                        <div className="p-2.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-200 text-[10.5px] flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-amber-300 font-bold">Réglementation Togo :</strong>
                            <span>Paiement opéré <strong className="underline text-white">exclusivement via Wave Togo</strong> vers notre numéro international (+226 65 56 58 05).</span>
                          </div>
                        </div>
                      )}

                      {/* 2. Opérateurs disponibles si multiple */}
                      {countryMomoOptions.length > 1 && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                            2. Opérateur de paiement :
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {countryMomoOptions.map((opt, idx) => {
                              const isSelected = selectedMomoIdx === idx;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => { playTapBeep(); setSelectedMomoIdx(idx); }}
                                  className={`p-1.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer text-[10px] ${
                                    isSelected
                                      ? 'bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400'
                                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <span className="font-bold truncate text-white">{opt.label}</span>
                                  {opt.badge && (
                                    <span className="px-1 py-0.5 rounded text-[8px] font-black bg-amber-400 text-slate-950 uppercase shrink-0">
                                      {opt.badge}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Instructions USSD & Numéro Destinataire */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2 text-[10.5px]">
                        {currentMomoOption.recipientNumber && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              {currentMomoOption.type === 'USSD' ? 'Numéro Marchand :' : 'Destinataire / Trésorerie :'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-white font-mono font-bold">{currentMomoOption.recipientNumber}</strong>
                              <button
                                type="button"
                                onClick={() => copyRecipientNumber(currentMomoOption.recipientNumber || '')}
                                className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer text-[9.5px]"
                              >
                                {isCopiedRecipient ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopiedRecipient ? 'Copié' : 'Copier'}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* USSD dynamique avec 1-click copy et appel direct tel: */}
                        {currentMomoOption.type === 'USSD' && currentMomoOption.ussdCode && (
                          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-[10px] uppercase font-bold">Code USSD direct :</span>
                              <button
                                type="button"
                                onClick={copyUssdCode}
                                className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer text-[9.5px] font-bold"
                              >
                                {isCopiedUssd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopiedUssd ? 'Copié' : 'Copier code'}</span>
                              </button>
                            </div>

                            <div className="font-mono font-black text-xs text-indigo-300 select-all break-all text-center py-1 bg-slate-950 rounded">
                              {currentMomoOption.ussdCode}
                            </div>

                            <a
                              href={currentMomoOption.telUri || `tel:${currentMomoOption.ussdCode.replace(/#/g, '%23')}`}
                              className="w-full py-2 px-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-[10.5px] flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition cursor-pointer"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Lancer l'appel USSD direct</span>
                            </a>
                          </div>
                        )}

                        {/* Étapes détaillées */}
                        {currentMomoOption.steps && currentMomoOption.steps.length > 0 && (
                          <div className="space-y-1 pt-1">
                            {currentMomoOption.steps.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-300">
                                <span className="w-3.5 h-3.5 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold text-amber-400 shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="leading-tight">{step}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Indicateur Passerelle Sécurisée Sebpay temps réel */}
                      <div className="p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-xl flex items-center gap-2.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <div className="text-[10.5px] text-slate-300 leading-tight">
                          <strong className="text-blue-200 block flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Passerelle Sécurisée SebPay connectée
                          </strong>
                          Validation 100% automatique par Webhook en 5 secondes.
                        </div>
                      </div>

                      {/* Bouton Nanasore Payment Gateway Universel (Règle 3) */}
                      <button
                        type="button"
                        onClick={() => { playTapBeep(); setIsNanasoreModalOpen(true); }}
                        className="w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-950/40 transition active:scale-98 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Payer via Nanasore Pay (Validation 100% Automatique)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Téléphone client */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Votre numéro de téléphone débité :
                        </label>
                        <input
                          type="tel"
                          value={orderCustomerPhone}
                          onChange={(e) => setOrderCustomerPhone(e.target.value)}
                          placeholder="Ex: +226 65 56 58 05"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-400 font-semibold"
                        />
                      </div>

                      {/* Champ Référence de transaction */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                          <span>Référence de transaction reçue</span>
                          <span className="text-[9px] text-slate-400 font-normal">Facultatif si validation auto</span>
                        </label>
                        <input
                          type="text"
                          value={orderPaymentRef}
                          onChange={(e) => setOrderPaymentRef(e.target.value)}
                          placeholder="Ex: CI240914.1234.A56789 ou WAV-8821"
                          className="w-full bg-slate-950 border border-orange-500/50 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-400 font-mono font-bold"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmMomoOrder}
                        disabled={isSubmittingOrder || (!orderPaymentRef.trim() && !orderCustomerPhone.trim())}
                        className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer ${
                          orderPaymentRef.trim() || orderCustomerPhone.trim()
                            ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-950'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Valider mon paiement ({formatCFA(cartTotalPrice)})</span>
                      </button>
                    </div>
                  )}

                  {/* OPTION C : PAIEMENT CARTE BANCAIRE (VISA / MASTERCARD) */}
                  {orderPaymentMethod === 'CARD' && (
                    <div className="space-y-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <span>Paiement sécurisé par Carte Bancaire</span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Nom du titulaire :</label>
                          <input
                            type="text"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            placeholder="Ex: IBRAHIM OUEDRAOGO"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Numéro de Carte :</label>
                          <input
                            type="text"
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                              const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                              setCardNumber(formatted);
                            }}
                            placeholder="4532 •••• •••• 8892"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-mono font-semibold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">Expiration :</label>
                            <input
                              type="text"
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                                setCardExpiry(val);
                              }}
                              placeholder="MM/AA"
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-mono text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">CVC / CVV :</label>
                            <input
                              type="password"
                              maxLength={4}
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="•••"
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-mono text-center font-semibold"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[9.5px] text-emerald-400 pt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Chiffrement bancaire SSL 256-bit • 3D-Secure certifié</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmCardOrder}
                        disabled={isSubmittingOrder || !cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim()}
                        className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950 transition active:scale-98 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Payer {formatCFA(cartTotalPrice)} par Carte</span>
                      </button>
                    </div>
                  )}

                  {/* OPTION D : PAIEMENT CRYPTO (USDT / MONERO / BITCOIN) AVEC QR CODE */}
                  {orderPaymentMethod === 'CRYPTO' && (
                    <div className="space-y-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                      {/* Sélecteur de Devise Crypto */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                          Devise Crypto :
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {cryptoOptions.map((c) => {
                            const isSelected = selectedCrypto === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => { playTapBeep(); setSelectedCrypto(c.id); }}
                                className={`p-1.5 rounded-xl border flex flex-col items-center gap-0.5 transition cursor-pointer text-center ${
                                  isSelected
                                    ? 'bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <span className="text-xs font-black text-white">{c.symbol}</span>
                                <span className="text-[8.5px] text-slate-400 truncate">{c.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-300 font-bold">{currentCryptoOption.network}</span>
                        <span className="text-xs font-mono font-black text-amber-300">≈ {cryptoEstimatedAmount}</span>
                      </div>

                      {/* QR Code & Adresse Portefeuille */}
                      <div className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="w-24 h-24 bg-white p-1 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                          <img
                            src={getQrCodeUrl(currentCryptoOption.address, 160)}
                            alt={`QR Code ${currentCryptoOption.symbol}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[9.5px] text-slate-400 uppercase font-bold">Adresse {currentCryptoOption.symbol} :</span>
                            <button
                              type="button"
                              onClick={() => copyCryptoAddress(currentCryptoOption.address)}
                              className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 text-[9.5px] font-bold cursor-pointer"
                            >
                              {isCopiedCryptoAddr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{isCopiedCryptoAddr ? 'Copié' : 'Copier'}</span>
                            </button>
                          </div>
                          <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[9px] text-slate-300 break-all select-all">
                            {currentCryptoOption.address}
                          </div>
                        </div>
                      </div>

                      {/* TXID Input */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Hash de transaction {currentCryptoOption.symbol} (TXID) :
                        </label>
                        <input
                          type="text"
                          value={cryptoTxHash}
                          onChange={(e) => setCryptoTxHash(e.target.value)}
                          placeholder={`Collez le hash / identifiant de transfert ${currentCryptoOption.symbol}...`}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmCryptoOrder}
                        disabled={isSubmittingOrder || !cryptoTxHash.trim()}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition active:scale-98 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Valider mon règlement {currentCryptoOption.symbol} (≈ {cryptoEstimatedAmount})</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ÉTAPE 3 : CONFIRMATION COMMANDE & BOUTONS WHATSAPP */}
              {checkoutStep === 'ORDER_CONFIRMED' && (
                <div className="space-y-3.5 py-1 text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-white">
                      {orderPaymentMethod === 'COD' ? 'Commande Enregistrée !' : 'Paiement Confirmé !'}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-300">
                      {confirmedOrder?.status === 'confirmed_paid' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Statut : Payé & Validé ({orderPaymentMethod})</span>
                        </span>
                      ) : orderPaymentMethod === 'COD' ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-amber-400" />
                          <span>Statut : En attente de livraison (COD)</span>
                        </span>
                      ) : (
                        <span className="text-orange-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-400" />
                          <span>Statut : pending_verification</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Boîte de récapitulatif */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-left text-[11px] space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">N° de Commande :</span>
                      <strong className="text-white font-mono">{confirmedOrder?.orderNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mode de règlement :</span>
                      <strong className="text-white font-semibold">
                        {orderPaymentMethod === 'COD' ? 'Paiement à la livraison (Espèces)' :
                         orderPaymentMethod === 'MOMO' ? `Mobile Money (${currentMomoOption.operator})` :
                         orderPaymentMethod === 'CARD' ? 'Carte Bancaire' :
                         `Crypto (${selectedCrypto})`}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {orderPaymentMethod === 'COD' ? 'Montant espèces à préparer :' : 'Montant total réglé :'}
                      </span>
                      <strong className="text-emerald-400 font-bold">{formatCFA(cartTotalPrice)}</strong>
                    </div>
                    {orderPaymentRef && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Réf. Transaction :</span>
                        <strong className="text-orange-300 font-mono">{orderPaymentRef}</strong>
                      </div>
                    )}
                    {(orderDeliveryAddress || selectedDeliveryZone) && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Livraison :</span>
                        <span className="text-white truncate max-w-[170px]">
                          {selectedDeliveryZone ? `[${selectedDeliveryZone}] ` : ''}{orderDeliveryAddress}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Boutons d'Action WhatsApp Direct */}
                  {orderPaymentMethod === 'COD' ? (
                    <a
                      href={getWhatsAppCodUrl()}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => playValidationBeep()}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-98 cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Informer le livreur sur WhatsApp</span>
                    </a>
                  ) : orderPaymentMethod === 'CARD' ? (
                    <a
                      href={getWhatsAppCardUrl()}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => playValidationBeep()}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-98 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Confirmer la commande carte sur WhatsApp</span>
                    </a>
                  ) : orderPaymentMethod === 'CRYPTO' ? (
                    <a
                      href={getWhatsAppCryptoUrl()}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => playValidationBeep()}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-98 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Transmettre la preuve crypto sur WhatsApp</span>
                    </a>
                  ) : (
                    <a
                      href={getWhatsAppMomoUrl()}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => playValidationBeep()}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-98 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Envoyer la preuve de paiement au commerçant</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleCloseAndResetDrawer}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Fermer & Retour à la boutique
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Tiroir / Modale Détail Produit */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          storeName={storeConfig.storeName}
          whatsappPhone={storeConfig.whatsappPhone}
          merchantId={storeConfig.slug || 'store-konkobo-telecom'}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onDirectCheckout={(prod, qty) => {
            handleAddToCart(prod, qty);
            setSelectedProduct(null);
            setShowCartDrawer(true);
            setCheckoutStep('CART');
          }}
        />
      )}

      {/* Checkout Ultime Universel */}
      {isNanasoreModalOpen && (
        <UltimateCheckout
          isModal={true}
          product={{
            id: 'cart-total',
            name: `Commande ${storeConfig.storeName}`,
            price: cartTotalPrice,
            originalPrice: Math.round(cartTotalPrice * 1.25),
            description: `${cart.length} article(s) dans le panier`,
            imageUrl: cart[0]?.product?.image || '',
            quantity: cart.reduce((sum, i) => sum + i.quantity, 0),
            items: cart.map(i => ({
              id: i.product.id,
              name: i.product.name,
              price: i.product.price,
              quantity: i.quantity,
              imageUrl: i.product.image
            }))
          }}
          amount={cartTotalPrice}
          currency="FCFA"
          orderDescription={`Commande Vitrine : ${storeConfig.storeName}`}
          storeName={storeConfig.storeName}
          whatsappPhone={storeConfig.whatsappPhone}
          defaultPhone={orderCustomerPhone}
          defaultCustomerName={orderCustomerName}
          defaultAddress={orderDeliveryAddress}
          onSuccess={handleNanasoreMomoSuccess}
          onCancel={() => setIsNanasoreModalOpen(false)}
          onBackToStore={() => setIsNanasoreModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MobileStorePreview;
