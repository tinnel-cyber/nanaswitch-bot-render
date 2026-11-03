import React, { useState, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Phone,
  User,
  MapPin,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Plus,
  Minus
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import confetti from 'canvas-confetti';
import { db } from '../../../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { initiateSPayment } from '../../../../services/paymentApiService';

export interface CheckoutProductInfo {
  id: string;
  name: string;
  priceFcfa: number;
  imageUrl: string;
  sellerName?: string;
  sellerHandle?: string;
}

export interface WameetReelCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: CheckoutProductInfo | null;
  creator: {
    name: string;
    handle: string;
    avatarUrl: string;
  };
  currentUserProfile?: {
    name: string;
    handle: string;
    avatarUrl?: string;
    phone?: string;
  };
  onOrderSuccess?: (order: any) => void;
}

type PaymentMethodType = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'CASH_ON_DELIVERY';

const PAYMENT_METHODS: Array<{ id: PaymentMethodType; name: string; icon: string; color: string; badge: string }> = [
  { id: 'WAVE', name: 'Wave Mobile Money', icon: '🌊', color: 'from-cyan-500 to-blue-600', badge: '0% Frais' },
  { id: 'ORANGE_MONEY', name: 'Orange Money', icon: '🍊', color: 'from-orange-500 to-amber-600', badge: 'Instantané' },
  { id: 'MTN_MOMO', name: 'MTN MoMo', icon: '💛', color: 'from-amber-400 to-yellow-600', badge: 'Instantané' },
  { id: 'MOOV_MONEY', name: 'Moov Money', icon: '💙', color: 'from-blue-600 to-indigo-700', badge: 'Instantané' },
  { id: 'CASH_ON_DELIVERY', name: 'Paiement à la Livraison', icon: '💵', color: 'from-emerald-600 to-teal-700', badge: 'Sécurisé' }
];

export const WameetReelCheckoutDrawer: React.FC<WameetReelCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  product,
  creator,
  currentUserProfile,
  onOrderSuccess
}) => {
  if (!isOpen || !product) return null;

  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState(currentUserProfile?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUserProfile?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('Abidjan • Cocody / Plateau');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('WAVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [completedOrderData, setCompletedOrderData] = useState<any>(null);

  const deliveryFee = 1500;
  const subtotal = product.priceFcfa * quantity;
  const total = subtotal + deliveryFee;

  const handleQuantityChange = (delta: number) => {
    playTapBeep();
    setQuantity(prev => Math.max(1, Math.min(10, prev + delta)));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      alert('Veuillez renseigner votre numéro de téléphone pour la livraison.');
      return;
    }

    setIsSubmitting(true);
    playValidationBeep();

    const orderPayload = {
      orderId: `WAM-${Date.now().toString().slice(-6)}`,
      productId: product.id,
      productName: product.name,
      productPrice: product.priceFcfa,
      quantity,
      subtotal,
      deliveryFee,
      total,
      sellerName: product.sellerName || creator.name,
      sellerHandle: product.sellerHandle || creator.handle,
      customerName: customerName.trim() || 'Client Wameet',
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      paymentMethod,
      channel: 'WAMEET_SMART_REELS',
      status: 'pending',
      createdAt: serverTimestamp()
    };

    try {
      // Enregistrement dans Firestore
      await addDoc(collection(db, 'orders'), orderPayload);

      // Si paiement mobile money sélectionné, enregistrer l'intention SebPay
      if (paymentMethod !== 'CASH_ON_DELIVERY') {
        try {
          await initiateSPayment({
            orderId: orderPayload.orderId,
            amount: total,
            currency: 'XOF',
            phone: customerPhone.trim(),
            operator: paymentMethod,
            description: `Achat Reel: ${product.name} (Qté: ${quantity})`
          });
        } catch (sErr) {
          console.warn('[REEL SEBPAY INITIATE NOTICE]', sErr);
        }
      }
    } catch (err) {
      console.warn('Erreur Firestore order (mode local):', err);
    }

    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {}

    setCompletedOrderData(orderPayload);
    setIsOrderComplete(true);
    setIsSubmitting(false);

    if (onOrderSuccess) {
      onOrderSuccess(orderPayload);
    }
  };

  const handleContactSellerOnW = () => {
    if (!completedOrderData) return;
    const msg = `Bonjour ${creator.name} ! Je viens de commander *${completedOrderData.productName}* (Qté: ${completedOrderData.quantity}) pour *${completedOrderData.total.toLocaleString('fr-FR')} FCFA* depuis votre Reel Wameet. Mon N° de commande : *${completedOrderData.orderId}*. Merci !`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-40 bg-slate-950/75 backdrop-blur-sm flex flex-col justify-end transition-all animate-in fade-in duration-200 select-none"
    >
      {/* Conteneur Bottom Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-h-[88%] rounded-t-[32px] bg-white text-slate-900 border-t-4 border-[#2563EB] shadow-[0_-20px_50px_rgba(15,23,42,0.6)] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Poignée et En-tête */}
        <div className="pt-2.5 pb-2 px-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Commande Express Zero-Friction</span>
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Boutique officielle de <strong className="text-[#2563EB]">{creator.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center cursor-pointer transition"
            title="Fermer et reprendre la vidéo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps Déroulant */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!isOrderComplete ? (
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Carte Récapitulative du Produit */}
              <div className="p-3 rounded-2xl bg-blue-50/80 border-2 border-blue-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-14 h-14 rounded-xl object-cover border border-blue-300 shrink-0 bg-white"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate">{product.name}</h4>
                    <div className="text-xs font-black text-[#2563EB] font-mono mt-0.5">
                      {product.priceFcfa.toLocaleString('fr-FR')} FCFA
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Garanti authentique</span>
                    </span>
                  </div>
                </div>

                {/* Sélecteur de Quantité */}
                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-xl border border-blue-300 shrink-0 shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer text-xs"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-black font-mono text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= 10}
                    className="w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 disabled:opacity-40 flex items-center justify-center text-[#2563EB] cursor-pointer text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Coordonnées de Livraison Express */}
              <div className="space-y-2">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                  1. Informations de Livraison
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Nom complet ou prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Ex: Aminata Traoré"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#2563EB] outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      N° Téléphone (pour confirmation) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="+226 70 00 00 00"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#2563EB] outline-none text-xs font-semibold font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Ville & Quartier de livraison
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      placeholder="Ex: Ouagadougou • Ouaga 2000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#2563EB] outline-none text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Sélection du Mode de Paiement */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                  2. Mode de Paiement Sécurisé
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map(m => {
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          playTapBeep();
                          setPaymentMethod(m.id);
                        }}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/90 border-[#2563EB] ring-2 ring-blue-500/20 text-[#2563EB]'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{m.icon}</span>
                          <span
                            className={`text-[8px] font-black uppercase px-1 rounded ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {m.badge}
                          </span>
                        </div>
                        <span className="text-[11px] font-black mt-1 leading-tight">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Récapitulatif Tarifaire Net */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 font-medium text-slate-600">
                <div className="flex justify-between">
                  <span>Sous-total ({quantity} article{quantity > 1 ? 's' : ''}) :</span>
                  <span className="font-mono text-slate-900 font-bold">{subtotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span>Livraison express à domicile :</span>
                  <span className="font-mono text-slate-900 font-bold">{deliveryFee.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 flex justify-between items-baseline text-sm font-black text-slate-900">
                  <span>Total Net :</span>
                  <span className="font-mono text-base text-[#2563EB]">{total.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              {/* Bouton de Validation */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-600/30 ring-2 ring-blue-400/40 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
              >
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>
                  {isSubmitting
                    ? 'Traitement de la commande...'
                    : `⚡ Confirmer et Commander (${total.toLocaleString('fr-FR')} FCFA)`}
                </span>
              </button>
            </form>
          ) : (
            /* Écran de Succès Instantané */
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg border-2 border-emerald-300">
                <CheckCircle2 className="w-9 h-9 animate-bounce" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">
                  Commande Confirmée avec Succès !
                </span>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">
                  N° {completedOrderData?.orderId}
                </h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Votre commande de <strong>{product.name}</strong> a été transmise à{' '}
                  <strong>{creator.name}</strong>. Livraison en cours de préparation.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-left space-y-1 font-mono text-slate-700">
                <div>Client : {completedOrderData?.customerName}</div>
                <div>Téléphone : {completedOrderData?.customerPhone}</div>
                <div>Lieu : {completedOrderData?.deliveryAddress}</div>
                <div>Paiement : {completedOrderData?.paymentMethod}</div>
                <div className="font-bold text-[#2563EB] pt-1 border-t border-blue-200">
                  Total : {completedOrderData?.total.toLocaleString('fr-FR')} FCFA
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleContactSellerOnW}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Envoyer la confirmation au créateur</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
                >
                  Reprendre la lecture des Reels Wameet 🎬
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default WameetReelCheckoutDrawer;
