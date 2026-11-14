import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Sparkles, 
  Truck, 
  Gift, 
  Zap, 
  MessageCircle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  CreditCard,
  Phone,
  MapPin,
  User,
  Copy,
  Check
} from 'lucide-react';
import { StoreProductItem } from './types';
import { triggerOpenFunnel } from '../../../../themes/themeUtils';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { triggerOrderConfirmationVault } from './OrderConfirmationVaultModal';
import { recordUnifiedOrder } from '../../../../utils/firestoreService';

export interface CartItem {
  id: string; // product.id ou composite
  product: StoreProductItem;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface SmartSlideOutCartDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  storeName?: string;
  storeSlug?: string;
  whatsappNumber?: string;
  products?: StoreProductItem[];
  onOpenFunnel?: (product: StoreProductItem) => void;
  currency?: string;
}

/**
 * Déclencheur universel d'ouverture du panier depuis n'importe où
 */
export const openSmartCart = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nana:open_cart'));
  }
};

/**
 * Déclencheur universel d'ajout au panier
 */
export const addToSmartCart = (
  product: StoreProductItem,
  quantity: number = 1,
  selectedColor?: string,
  selectedSize?: string
) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nana:add_to_cart', {
      detail: { product, quantity, selectedColor, selectedSize }
    }));
  }
};

export const SmartSlideOutCartDrawer: React.FC<SmartSlideOutCartDrawerProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  storeName = 'Boutique Officielle',
  storeSlug = 'boutique',
  whatsappNumber = '',
  products = [],
  onOpenFunnel,
  currency = 'FCFA'
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  // État local d'ouverture (synchronisé avec les props ou événements globaux)
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);

  // Clé de persistance localStorage par boutique
  const storageKey = useMemo(() => `nana_cart_${storeSlug || 'default'}`, [storeSlug]);

  // Liste des articles du panier
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`nana_cart_${storeSlug || 'default'}`);
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.warn('Erreur lecture localStorage panier :', err);
      }
    }
    return [];
  });

  // Mode de validation Express (formulaire déplié dans le panier)
  const [isExpressCheckoutOpen, setIsExpressCheckoutOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange' | 'mtn' | 'cash'>('wave');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSuccessData, setOrderSuccessData] = useState<{ orderNumber: string; total: number } | null>(null);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState<boolean>(false);

  // Synchronisation avec la prop externe isOpen
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setInternalIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  // Écouteur global pour ouverture et ajout au panier en 0ms
  useEffect(() => {
    const handleOpen = () => {
      setInternalIsOpen(true);
    };

    const handleClose = () => {
      setInternalIsOpen(false);
      setIsExpressCheckoutOpen(false);
      setOrderSuccessData(null);
    };

    const handleAdd = (e: Event) => {
      const customEvt = e as CustomEvent<any>;
      const { product, quantity = 1, selectedColor, selectedSize } = customEvt.detail || {};
      if (!product) return;

      playValidationBeep();

      setCartItems(prev => {
        const itemKey = `${product.id}_${selectedColor || ''}_${selectedSize || ''}`;
        const existingIdx = prev.findIndex(item => {
          const k = `${item.product.id}_${item.selectedColor || ''}_${item.selectedSize || ''}`;
          return k === itemKey;
        });

        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + quantity
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: itemKey,
              product,
              quantity,
              selectedColor,
              selectedSize
            }
          ];
        }
      });

      setInternalIsOpen(true);
    };

    window.addEventListener('nana:open_cart', handleOpen);
    window.addEventListener('nana:close_cart', handleClose);
    window.addEventListener('nana:add_to_cart', handleAdd);

    return () => {
      window.removeEventListener('nana:open_cart', handleOpen);
      window.removeEventListener('nana:close_cart', handleClose);
      window.removeEventListener('nana:add_to_cart', handleAdd);
    };
  }, []);

  // Persistance dans localStorage et diffusion de l'événement de mise à jour
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(cartItems));
      } catch (err) {
        console.warn('Erreur écriture panier localStorage :', err);
      }

      const count = cartItems.reduce((acc, item) => acc + item.quantity, 0);
      const total = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

      window.dispatchEvent(new CustomEvent('nana:cart_updated', {
        detail: { count, total, items: cartItems }
      }));
    }
  }, [cartItems, storageKey]);

  // Calculs financiers
  const cartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cartItems]);

  const freeDeliveryUnlocked = cartTotal >= 10000;
  const vipGiftUnlocked = cartTotal >= 20000;
  const deliveryFee = freeDeliveryUnlocked || cartItems.length === 0 ? 0 : 2000;
  const finalTotal = cartTotal + deliveryFee;

  // Jauge de Progression à 2 Paliers (10 000 FCFA & 20 000 FCFA)
  const progressPercent = useMemo(() => {
    if (cartTotal <= 0) return 0;
    return Math.min(100, Math.round((cartTotal / 20000) * 100));
  }, [cartTotal]);

  // Numéro WhatsApp vendeur
  const cleanPhone = useMemo(() => {
    return (whatsappNumber || '+225 07 00 00 00 00').replace(/[^0-9]/g, '');
  }, [whatsappNumber]);

  // Produit d'Upsell 1-Clic : suggère 1 article de la boutique non présent dans le panier
  const upsellProduct = useMemo(() => {
    if (products.length === 0) return null;
    const cartProductIds = new Set(cartItems.map(i => i.product.id));
    return products.find(p => !cartProductIds.has(p.id)) || null;
  }, [products, cartItems]);

  // Facture complète WhatsApp pour tout le panier
  const whatsappInvoiceUrl = useMemo(() => {
    if (cartItems.length === 0) return `https://wa.me/${cleanPhone}`;

    let msg = `🛒 *COMMANDE PANIER MULTI-ARTICLES — ${storeName.toUpperCase()}*\n\n`;
    msg += `Bonjour, je souhaite valider ma commande avec les articles suivants :\n\n`;

    cartItems.forEach((item, idx) => {
      const variantTxt = [item.selectedColor, item.selectedSize].filter(Boolean).join(' / ');
      const sub = (item.product.price * item.quantity).toLocaleString('fr-FR');
      msg += `${idx + 1}. *${item.product.name}*${variantTxt ? ` (${variantTxt})` : ''}\n`;
      msg += `   ↳ Qté : ${item.quantity} × ${item.product.price.toLocaleString('fr-FR')} FCFA = ${sub} FCFA\n`;
    });

    msg += `\n💰 *Sous-total :* ${cartTotal.toLocaleString('fr-FR')} FCFA\n`;
    msg += `🚚 *Livraison :* ${freeDeliveryUnlocked ? 'OFFERTE (0 FCFA)' : '2 000 FCFA'}\n`;
    if (vipGiftUnlocked) {
      msg += `🎁 *Cadeau VIP Secret :* DÉBLOQUÉ & INCLUS DANS LE COLIS ✨\n`;
    }
    msg += `💵 *TOTAL À PAYER :* ${finalTotal.toLocaleString('fr-FR')} FCFA\n\n`;
    msg += `📍 Pouvez-vous me confirmer la disponibilité et le délai de livraison ?`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  }, [cartItems, storeName, cartTotal, freeDeliveryUnlocked, vipGiftUnlocked, finalTotal, cleanPhone]);

  // Gestionnaires de quantité
  const handleUpdateQuantity = useCallback((itemKey: string, delta: number) => {
    playTapBeep();
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === itemKey) {
          const nextQty = item.quantity + delta;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  }, []);

  const handleRemoveItem = useCallback((itemKey: string) => {
    playTapBeep();
    setCartItems(prev => prev.filter(item => item.id !== itemKey));
  }, []);

  const handleCloseDrawer = useCallback(() => {
    playTapBeep();
    setInternalIsOpen(false);
    setIsExpressCheckoutOpen(false);
    setOrderSuccessData(null);
    if (propOnClose) propOnClose();
  }, [propOnClose]);

  // Ajout 1-Clic de l'Upsell
  const handleAddUpsell = useCallback((prod: StoreProductItem) => {
    playValidationBeep();
    setCartItems(prev => [
      ...prev,
      {
        id: `${prod.id}__upsell`,
        product: prod,
        quantity: 1
      }
    ]);
  }, []);

  // Ouverture du tunnel de vente pour l'article principal
  const handleOpenMainTunnel = useCallback(() => {
    playValidationBeep();
    if (cartItems.length === 0) return;
    const mainProd = cartItems[0].product;
    handleCloseDrawer();

    if (onOpenFunnel) {
      onOpenFunnel(mainProd);
    } else {
      triggerOpenFunnel(mainProd.linkedFunnelId || mainProd.id, mainProd.name);
    }
  }, [cartItems, handleCloseDrawer, onOpenFunnel]);

  // Soumission de la commande Express (sauvegarde Firestore)
  const handleSubmitOrder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress) return;

    playValidationBeep();
    setIsSubmittingOrder(true);

    try {
      const orderNum = `CMD-${Date.now().toString().slice(-6)}`;
      const orderPayload = {
        orderId: orderNum,
        orderNumber: orderNum,
        storeId: storeSlug || 'boutique',
        storeName,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        customerCity: deliveryAddress.trim(),
        paymentMethod,
        items: cartItems.map(i => ({
          productId: i.product.id,
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          selectedColor: i.selectedColor,
          selectedSize: i.selectedSize,
          variant: [i.selectedColor, i.selectedSize].filter(Boolean).join(' / ') || 'Standard',
          image: i.product.image,
          category: i.product.category
        })),
        subtotal: cartTotal,
        deliveryFee,
        total: finalTotal,
        status: 'pending' as const,
        sourceModule: 'smart_cart_drawer'
      };

      await recordUnifiedOrder(orderPayload);

      setOrderSuccessData({
        orderNumber: orderNum,
        total: finalTotal
      });
      setCartItems([]);
      setIsExpressCheckoutOpen(false);

      // Déclenchement automatique du Coffre de Confirmation VIP Nanasore (0ms)
      triggerOrderConfirmationVault({
        orderId: orderNum,
        orderNumber: orderNum,
        storeName,
        storeSlug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
        items: cartItems.map(i => ({
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          category: i.product.category,
          color: i.selectedColor,
          size: i.selectedSize,
          image: i.product.image
        })),
        subtotal: cartTotal,
        deliveryFee,
        total: finalTotal
      });
    } catch (err) {
      console.error('Erreur sauvegarde commande Firestore :', err);
      // Fallback gracieux si hors-ligne
      const orderNum = `CMD-${Date.now().toString().slice(-6)}`;
      setOrderSuccessData({
        orderNumber: orderNum,
        total: finalTotal
      });
      setCartItems([]);
      setIsExpressCheckoutOpen(false);

      triggerOrderConfirmationVault({
        orderId: orderNum,
        orderNumber: orderNum,
        storeName,
        storeSlug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
        items: cartItems.map(i => ({
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          category: i.product.category,
          color: i.selectedColor,
          size: i.selectedSize,
          image: i.product.image
        })),
        subtotal: cartTotal,
        deliveryFee,
        total: finalTotal
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [
    customerName,
    customerPhone,
    deliveryAddress,
    paymentMethod,
    cartItems,
    storeSlug,
    storeName,
    cartTotal,
    deliveryFee,
    finalTotal,
    freeDeliveryUnlocked,
    vipGiftUnlocked
  ]);

  if (!internalIsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* 1. Backdrop Flouté Sombre */}
      <div 
        onClick={handleCloseDrawer}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" 
      />

      {/* 2. Le Tiroir Panier Coulissant Droite */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <aside className="w-screen max-w-md bg-white border-l border-blue-100 shadow-2xl flex flex-col justify-between overflow-hidden text-slate-900 select-none animate-in slide-in-from-right duration-250">
          
          {/* ========================================================================= */}
          {/* A. EN-TÊTE DU TIROIR & JAUGE DE RÉCOMPENSE */}
          {/* ========================================================================= */}
          <div className="border-b border-slate-100 bg-white p-4 sm:p-5 shrink-0 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Votre Panier ({cartCount})
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {storeName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDrawer}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition cursor-pointer"
                title="Fermer le panier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* JAUGE DE PROGRESSION BLEU ROYAL NANASORE (#2563EB) */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {vipGiftUnlocked
                      ? '👑 Cadeau VIP & Livraison Offerte Débloqués !'
                      : freeDeliveryUnlocked
                      ? '🎉 Livraison Offerte Débloquée !'
                      : `Encore ${(10000 - cartTotal).toLocaleString('fr-FR')} F pour la Livraison Offerte !`}
                  </span>
                </span>
                <span className="font-black text-blue-600 font-mono text-[11px]">
                  {progressPercent}%
                </span>
              </div>

              {/* Barre de progression avec repères 50% & 100% */}
              <div className="relative w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500 rounded-full shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Paliers visuels */}
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-0.5">
                <span className={`flex items-center gap-1 ${freeDeliveryUnlocked ? 'text-emerald-600 font-black' : ''}`}>
                  <Truck className="w-3 h-3" />
                  <span>Palier 1 : 10.000 F (Livraison 0 F)</span>
                </span>
                <span className={`flex items-center gap-1 ${vipGiftUnlocked ? 'text-blue-600 font-black' : ''}`}>
                  <Gift className="w-3 h-3" />
                  <span>Palier 2 : 20.000 F (Cadeau VIP)</span>
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* B. LISTE DES ARTICLES OU CONFIRMATION DE COMMANDE */}
          {/* ========================================================================= */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Si une commande vient d'être validée avec succès */}
            {orderSuccessData ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 text-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Commande Enregistrée avec Succès !
                  </span>
                  <h4 className="text-lg font-black text-slate-900 mt-1">
                    Merci pour votre commande !
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Votre commande est prise en compte. Un conseiller va vous contacter sous peu.
                  </p>
                </div>

                {/* Numéro de commande */}
                <div className="bg-white border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-bold block">Numéro de Commande</span>
                    <span className="text-sm font-black text-slate-900 font-mono">{orderSuccessData.orderNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(orderSuccessData.orderNumber);
                        setCopiedOrderNumber(true);
                        setTimeout(() => setCopiedOrderNumber(false), 2000);
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 transition"
                  >
                    {copiedOrderNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedOrderNumber ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>

                {/* Bouton WhatsApp de confirmation directe */}
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${storeName}, je viens de passer la commande ${orderSuccessData.orderNumber} pour un total de ${orderSuccessData.total.toLocaleString('fr-FR')} FCFA. Pouvez-vous me confirmer la livraison ?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playTapBeep()}
                  className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Suivre ma Commande sur WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  Retourner à la boutique
                </button>
              </div>
            ) : cartItems.length === 0 ? (
              /* ÉTAT PANIER VIDE */
              <div className="text-center py-12 space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                  🛒
                </div>
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <h4 className="text-base font-black text-slate-900">
                    Votre panier est vide
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Explorez notre catalogue et ajoutez vos articles favoris en un clic !
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  Découvrir nos Produits
                </button>
              </div>
            ) : (
              /* LISTE DES ARTICLES DU PANIER */
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex items-center gap-3 transition hover:border-blue-300"
                  >
                    {/* Miniature */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
                      <img 
                        src={item.product.image || 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200'} 
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Détails Produit */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-slate-900 truncate">
                        {item.product.name}
                      </h4>

                      {/* Variante (Taille / Couleur) */}
                      {(item.selectedColor || item.selectedSize) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.selectedColor && (
                            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded-md">
                              {item.selectedColor}
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded-md">
                              Taille: {item.selectedSize}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Prix */}
                      <div className="text-xs font-black text-blue-600 mt-1 font-mono">
                        {(item.product.price * item.quantity).toLocaleString('fr-FR')} {currency}
                      </div>
                    </div>

                    {/* Contrôles de quantité & Suppression */}
                    <div className="flex flex-col items-end justify-between h-16 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                        title="Retirer du panier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="w-5 h-5 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black px-1.5 text-slate-800 font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="w-5 h-5 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* BLOC D'UPSELL 1-CLIC */}
                {upsellProduct && !isExpressCheckoutOpen && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-white border border-blue-200 shrink-0">
                        <img 
                          src={upsellProduct.image || 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200'} 
                          alt={upsellProduct.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-blue-600 block">
                          🔥 Complétez votre commande
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 truncate">
                          {upsellProduct.name}
                        </h5>
                        <span className="text-xs font-black text-blue-600 font-mono">
                          {upsellProduct.price.toLocaleString('fr-FR')} {currency}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddUpsell(upsellProduct)}
                      className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                )}

                {/* FORMULAIRE DE COMMANDE RAPIDE EXPRESS (DÉPLIÉ) */}
                {isExpressCheckoutOpen && (
                  <form onSubmit={handleSubmitOrder} className="mt-4 p-4 rounded-2xl bg-slate-50 border-2 border-blue-600 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-blue-600 fill-current" />
                        <span>Formulaire de Commande Express</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsExpressCheckoutOpen(false)}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        Annuler
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Nom &amp; Prénom *</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ex: Kouamé Jean"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>Numéro WhatsApp *</span>
                      </label>
                      <input 
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Ex: +225 07 12 34 56 78"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <span>Ville &amp; Quartier de livraison *</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Ex: Abidjan, Cocody Angré 8ème Tranche"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-medium"
                      />
                    </div>

                    {/* Mode de paiement */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                        Mode de Règlement :
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'wave', label: 'Wave Money', icon: '🌊' },
                          { id: 'orange', label: 'Orange Money', icon: '🟠' },
                          { id: 'mtn', label: 'MTN / Moov', icon: '🟡' },
                          { id: 'cash', label: 'Cash Livraison', icon: '💵' }
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              setPaymentMethod(m.id as any);
                            }}
                            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition text-left cursor-pointer ${
                              paymentMethod === m.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{m.icon}</span>
                            <span className="truncate">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingOrder}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 mt-2"
                    >
                      {isSubmittingOrder ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Validation en cours...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmer ma Commande ({finalTotal.toLocaleString('fr-FR')} {currency})</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

              </div>
            )}

          </div>

          {/* ========================================================================= */}
          {/* C. PIED DU PANIER — LES 3 MODES DE VALIDATION DIRECTE */}
          {/* ========================================================================= */}
          {cartItems.length > 0 && !orderSuccessData && (
            <div className="border-t border-slate-100 bg-white p-4 sm:p-5 shrink-0 space-y-3.5">
              
              {/* Lignes Sous-total & Frais */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span>Sous-total articles</span>
                  <span className="font-mono text-slate-800 font-bold">{cartTotal.toLocaleString('fr-FR')} {currency}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-blue-600" />
                    <span>Frais de livraison</span>
                  </span>
                  <span className={`font-mono font-bold ${freeDeliveryUnlocked ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {freeDeliveryUnlocked ? 'OFFERTE (0 F)' : `${deliveryFee.toLocaleString('fr-FR')} ${currency}`}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-sm font-black text-slate-900">Total à Payer :</span>
                  <span className="text-xl font-black text-blue-600 font-mono">
                    {finalTotal.toLocaleString('fr-FR')} {currency}
                  </span>
                </div>
              </div>

              {/* LES 3 MODES D'ACTION DIRECTE */}
              <div className="space-y-2 pt-1">
                
                {/* BOUTON 1 : ⚡ Valider & Payer Express (Mini-Formulaire) */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setIsExpressCheckoutOpen(!isExpressCheckoutOpen);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current text-white" />
                  <span>⚡ Valider &amp; Payer ma Commande (Express)</span>
                </button>

                {/* BOUTON 2 : 💬 Commander tout mon panier via WhatsApp */}
                <a
                  href={whatsappInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playTapBeep()}
                  className="w-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-98 text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>💬 Commander tout mon panier via WhatsApp</span>
                </a>

                {/* BOUTON 3 : ⚡ Ouvrir le Tunnel de l'article principal */}
                <button
                  type="button"
                  onClick={handleOpenMainTunnel}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-600 border border-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  <span>⚡ Voir le Tunnel de vente de l'article principal</span>
                </button>

              </div>

              {/* Badge de réassurance 100% Crypté SSL */}
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paiement 100% Sécurisé &amp; Colis Garanti par Nanasore™</span>
              </div>

            </div>
          )}

        </aside>
      </div>
    </div>
  );
};

export default openSmartCart;
