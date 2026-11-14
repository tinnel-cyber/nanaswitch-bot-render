import React, { useState, useEffect } from 'react';
import { Smartphone, ShieldCheck, CheckCircle2, Zap, ArrowRight, Lock, MapPin, Truck, Banknote } from 'lucide-react';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../../utils/audio';
import { DEFAULT_DELIVERY_OPTIONS, DEFAULT_ORDER_BUMP, DeliveryOption, OrderBumpConfig } from '../../../types/omniFunnel';
import { notifyMerchantNewOrder } from '../../../services/PushNotificationService';

interface InlineGeoCheckoutBlockProps {
  productName: string;
  price: number;
  originalPrice?: number;
  brandColor?: string;
  heading?: string;
  subheading?: string;
  deliveryOptions?: DeliveryOption[];
  orderBump?: OrderBumpConfig;
  orderBumpEnabled?: boolean;
  acceptedProviders?: {
    wave?: boolean;
    orangeMoney?: boolean;
    moov?: boolean;
    mtn?: boolean;
    cashOnDelivery?: boolean;
  };
  ctaText?: string;
  merchantId?: string;
  merchantPhone?: string;
  merchantWhatsapp?: string;
  onPaymentCompleted?: (transactionData: any) => void;
  className?: string;
}

export const InlineGeoCheckoutBlock: React.FC<InlineGeoCheckoutBlockProps> = ({
  productName,
  price,
  originalPrice,
  brandColor = '#10b981',
  heading = 'Finalisez votre commande',
  subheading = 'Paiement sans contact ou règlement à la livraison',
  deliveryOptions,
  orderBump,
  orderBumpEnabled = true,
  acceptedProviders = {
    wave: true,
    orangeMoney: true,
    moov: true,
    mtn: true,
    cashOnDelivery: true
  },
  ctaText,
  merchantId,
  merchantPhone,
  merchantWhatsapp,
  onPaymentCompleted,
  className = ''
}) => {
  const activeDeliveryList: DeliveryOption[] = (deliveryOptions && deliveryOptions.length > 0)
    ? deliveryOptions
    : DEFAULT_DELIVERY_OPTIONS.slice(0, 3);

  const activeBump: OrderBumpConfig = orderBump || DEFAULT_ORDER_BUMP;

  const [provider, setProvider] = useState<'WAVE' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'MTN_MOMO' | 'CASH_ON_DELIVERY'>('WAVE');
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOption>(activeDeliveryList[0]);
  const [includeOrderBump, setIncludeOrderBump] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ussdModalCode, setUssdModalCode] = useState<string | null>(null);

  // État des articles auto-composés depuis le Mini-Market
  const [miniMarketItems, setMiniMarketItems] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('nana_checkout_cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.cart) {
        setMiniMarketItems(e.detail.cart);
      }
    };
    window.addEventListener('nana_cart_updated', handler);
    return () => window.removeEventListener('nana_cart_updated', handler);
  }, []);

  // Synchronise si les options changent
  useEffect(() => {
    if (activeDeliveryList.length > 0 && !activeDeliveryList.some(d => d.id === selectedDelivery.id)) {
      setSelectedDelivery(activeDeliveryList[0]);
    }
  }, [deliveryOptions]);

  const bumpPrice = (orderBumpEnabled && includeOrderBump) ? activeBump.price : 0;
  const shippingPrice = selectedDelivery ? selectedDelivery.price : 0;
  const miniMarketTotal = miniMarketItems.reduce(
    (acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1),
    0
  );
  const totalAmount = price + bumpPrice + shippingPrice + miniMarketTotal;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim()) {
      return;
    }
    playValidationBeep();
    setIsProcessing(true);

    const cleanMerchantNum = (merchantPhone || merchantWhatsapp || '').replace(/\D/g, '') || '0700000000';
    const isBurkina = phoneNumber.startsWith('+226') || phoneNumber.startsWith('226');

    const generatedUssd = provider === 'ORANGE_MONEY'
      ? (isBurkina ? `*144*10*${cleanMerchantNum}*${totalAmount}#` : `*144*4*${cleanMerchantNum}*${totalAmount}#`)
      : provider === 'MOOV_MONEY'
      ? `*555*2*1*${totalAmount}#`
      : provider === 'MTN_MOMO'
      ? `*133#`
      : null;

    if (generatedUssd) {
      setUssdModalCode(generatedUssd);
    }

    setTimeout(() => {
      setIsProcessing(false);
      playCashChime();

      // Notification Push au Marchand (Exclusivité Plan PRO)
      notifyMerchantNewOrder({
        merchantId,
        customerName: customerName.trim(),
        orderTotal: totalAmount,
        productName,
        orderId: `tx_inline_${Date.now()}`
      }).catch(console.warn);

      if (onPaymentCompleted) {
        onPaymentCompleted({
          transactionId: `tx_inline_${Date.now()}`,
          customerName: customerName.trim(),
          phoneNumber: phoneNumber.trim(),
          totalAmount,
          provider,
          delivery: selectedDelivery,
          orderBumpAccepted: includeOrderBump,
          composedItems: miniMarketItems,
          isCashOnDelivery: provider === 'CASH_ON_DELIVERY'
        });
      }
    }, 1200);
  };

  const availableProviders = [
    { key: 'wave', id: 'WAVE' as const, label: 'Wave Money', sub: 'Application Directe', color: '#1dc4e9' },
    { key: 'orangeMoney', id: 'ORANGE_MONEY' as const, label: 'Orange Money', sub: '*144# USSD / OTP', color: '#ff7900' },
    { key: 'moov', id: 'MOOV_MONEY' as const, label: 'Moov Money', sub: '*555# USSD', color: '#0082c3' },
    { key: 'mtn', id: 'MTN_MOMO' as const, label: 'MTN MoMo', sub: '*133# USSD', color: '#ffcc00' },
    { key: 'cashOnDelivery', id: 'CASH_ON_DELIVERY' as const, label: 'À la Livraison', sub: 'Règlement en main propre', color: brandColor }
  ].filter(p => acceptedProviders[p.key as keyof typeof acceptedProviders] !== false);

  return (
    <div
      id="inline-checkout"
      style={{ borderColor: `${brandColor}50` }}
      className={`p-4 sm:p-6 rounded-3xl bg-slate-900 border-2 shadow-2xl space-y-5 text-slate-100 transition-colors duration-300 ${className}`}
    >
      {/* Entête Caisse */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span
            style={{ backgroundColor: `${brandColor}20`, borderColor: `${brandColor}40`, color: brandColor }}
            className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black border"
          >
            PAIEMENT 1-CLIC & LIVRAISON GÉO-ROUTÉE
          </span>
          <h3 className="text-base sm:text-lg font-black text-white mt-1">{heading}</h3>
          <p className="text-xs text-slate-400">{subheading}</p>
        </div>

        <div className="text-right shrink-0">
          <div style={{ color: brandColor }} className="text-xl sm:text-2xl font-black font-mono">
            {formatCFA(totalAmount)}
          </div>
          {originalPrice && (
            <div className="text-xs text-slate-500 line-through font-mono">
              {formatCFA(originalPrice + bumpPrice + shippingPrice)}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handlePay} className="space-y-4">
        {/* 1. Choix Moyen de Paiement */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">1. Sélectionnez votre moyen de paiement :</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableProviders.map(p => {
              const isSelected = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { playTapBeep(); setProvider(p.id); }}
                  style={{
                    borderColor: isSelected ? p.color : undefined,
                    backgroundColor: isSelected ? `${p.color}20` : undefined,
                    color: isSelected ? p.color : undefined
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition cursor-pointer ${
                    isSelected ? 'shadow-md ring-1' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-black truncate">{p.label}</span>
                  <span className="text-[9.5px] font-normal opacity-80">{p.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Coordonnées Client */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Votre Nom & Prénom :</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              placeholder="Ex: Amadou Koné"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Numéro Mobile Money / Appel :</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              placeholder="+225 07 00 00 00 00"
            />
          </div>
        </div>

        {/* 3. Choix de Livraison Personnalisable */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. Mode de livraison :</span>
            </label>
            <span className="text-[10px] text-slate-400 font-bold">Colis vérifié avant règlement</span>
          </div>

          <div className="space-y-1.5">
            {activeDeliveryList.map((opt) => {
              const isSelected = selectedDelivery?.id === opt.id;
              return (
                <label
                  key={opt.id}
                  onClick={() => setSelectedDelivery(opt)}
                  style={{
                    borderColor: isSelected ? brandColor : undefined,
                    backgroundColor: isSelected ? `${brandColor}12` : undefined
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition ${
                    isSelected ? 'ring-1 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="radio"
                      name="delivery_opt"
                      checked={isSelected}
                      onChange={() => setSelectedDelivery(opt)}
                      style={{ accentColor: brandColor }}
                      className="w-4 h-4 cursor-pointer shrink-0"
                    />
                    <div className="truncate">
                      <p className="font-bold truncate text-white">{opt.name}</p>
                      <p className="text-[10.5px] text-slate-400 truncate">
                        {opt.estimatedTime} • {opt.description || 'Livraison sécurisée avec suivi'}
                      </p>
                    </div>
                  </div>
                  <span style={{ color: isSelected ? brandColor : undefined }} className="font-mono font-bold shrink-0">
                    {opt.price === 0 ? 'Gratuit' : formatCFA(opt.price)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 4. Order Bump / Emballage ou Assurance (Personnalisable) */}
        {orderBumpEnabled && activeBump && (
          <label
            onClick={() => { playTapBeep(); setIncludeOrderBump(!includeOrderBump); }}
            style={{
              borderColor: includeOrderBump ? '#f59e0b' : 'rgba(245, 158, 11, 0.3)',
              backgroundColor: includeOrderBump ? 'rgba(245, 158, 11, 0.1)' : undefined
            }}
            className="p-3 rounded-2xl border-2 flex items-start gap-3 cursor-pointer select-none transition bg-slate-950/60 hover:border-amber-500/60"
          >
            <input
              type="checkbox"
              checked={includeOrderBump}
              onChange={(e) => setIncludeOrderBump(e.target.checked)}
              className="mt-1 accent-amber-500 w-4 h-4 cursor-pointer shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-300">{activeBump.title}</span>
                <span className="text-xs font-black text-white font-mono shrink-0">+{formatCFA(activeBump.price)}</span>
              </div>
              <p className="text-[10.5px] text-slate-300 pt-0.5">{activeBump.description}</p>
            </div>
          </label>
        )}

        {/* Récapitulatif Auto-composition Mini-Market si présent */}
        {miniMarketItems.length > 0 && (
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black text-emerald-400">
              <span>Articles auto-composés ({miniMarketItems.length}) :</span>
              <span className="font-mono text-white">+{formatCFA(miniMarketTotal)}</span>
            </div>
            {miniMarketItems.map((item: any) => (
              <div key={item.id} className="flex justify-between text-[11px] text-slate-300 pl-2">
                <span className="truncate pr-2">• {item.name} <strong className="text-slate-400 font-mono">x{item.quantity}</strong></span>
                <span className="font-mono text-slate-300 shrink-0">{formatCFA(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        )}

        {/* 5. Bouton de Paiement / Confirmation avec brandColor */}
        <button
          type="submit"
          disabled={isProcessing}
          style={{
            backgroundColor: brandColor,
            boxShadow: `0 12px 30px -6px ${brandColor}60`
          }}
          className="w-full py-4 px-6 active:scale-98 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Confirmation en cours...</span>
            </span>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5 text-white/90" />
              <span>{ctaText || `Confirmer la Commande (${formatCFA(totalAmount)})`}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-4 text-[10.5px] text-slate-400">
          <span className="flex items-center gap-1">
            <Lock style={{ color: brandColor }} className="w-3 h-3" />
            Paiement Chiffré TLS 1.3
          </span>
          <span>•</span>
          <span>Confirmation Instantanée</span>
          <span>•</span>
          <span>Garantie Satisfait ou Remboursé</span>
        </div>
      </form>
    </div>
  );
};
