import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Logo } from '../../../components/common/Logo';
import { OmniFunnelOrder, FunnelProductItem } from '../../../types/omniFunnel';
import { playTapBeep } from '../../../utils/audio';
import { UltimateCheckout, PaymentSuccessDetails } from '../../../components/payment/UltimateCheckout';

interface SmartCheckoutPageProps {
  productId: string;
  merchantId?: string;
  onBack?: () => void;
  className?: string;
}

export const SmartCheckoutPage: React.FC<SmartCheckoutPageProps> = ({
  productId,
  merchantId,
  onBack,
  className = ''
}) => {
  // Initialisation dynamique du produit ciblé
  const [product] = useState<FunnelProductItem>(() => {
    if (
      productId.includes('elite') || 
      productId.includes('20') || 
      productId === 'nanasore_elite_20_pays' || 
      productId === 'caisse' || 
      productId === 'checkout'
    ) {
      return {
        id: 'nanasore_elite_20_pays',
        name: 'Abonnement Élite Nanasore POS • Licence Multi-Pays (20 Pays)',
        price: 15000,
        originalPrice: 25000,
        itemType: 'digital',
        imageUrl: '',
        description: 'Licence officielle multi-pays : encaissement temps réel Sebpay dans 20 pays, multi-caisses illimitées, IA Nanasore et support prioritaire 24/7.'
      };
    }
    return {
      id: productId,
      name: productId.includes('fintech')
        ? 'Masterclass Systèmes Hybrides & Monétique UEMOA'
        : 'Produit Vedette NaNa Store Pro',
      price: productId.includes('fintech') ? 45000 : 15000,
      originalPrice: productId.includes('fintech') ? 75000 : 25000,
      itemType: productId.includes('fintech') ? 'digital' : 'physical',
      courseId: productId.includes('fintech') ? productId : undefined,
      imageUrl: '',
      description: 'Article certifié authentique avec garantie fabricant et support VIP 24/7.'
    };
  });

  const handleGatewaySuccess = (details: PaymentSuccessDetails) => {
    console.log('[SMART CHECKOUT] Commande payée avec succès !', details);
  };

  return (
    <div className={`min-h-screen w-full bg-slate-100 text-slate-950 font-sans select-none flex flex-col ${className}`}>
      {/* 1. Header Minimaliste Apple/Stripe-grade */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onBack();
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 transition cursor-pointer border border-slate-200"
              title="Retour"
            >
              <ChevronLeft className="w-5 h-5 text-slate-900" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <Logo size="sm" accentColor="text-blue-600" />
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-950">
                Nanasore
              </span>
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                Pay
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border-2 border-emerald-300 text-xs sm:text-sm font-bold">
            <span className="hidden sm:inline">Caisse Sécurisée</span>
            <span>TLS 256-bit</span>
          </div>
        </div>
      </header>

      {/* 2. Conteneur Principal : Ultimate Checkout */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <UltimateCheckout
          isModal={false}
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            description: product.description,
            imageUrl: product.imageUrl
          }}
          amount={product.price}
          currency="FCFA"
          orderDescription={product.name}
          orderId={`CHK-${product.id}-${Date.now().toString(36).toUpperCase()}`}
          onSuccess={handleGatewaySuccess}
          onCancel={onBack}
          onBackToStore={onBack}
        />
      </main>
    </div>
  );
};

export default SmartCheckoutPage;
