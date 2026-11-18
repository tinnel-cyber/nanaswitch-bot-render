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
  planName?: string;
  amount?: number;
  isAnnual?: boolean;
}

export const SmartCheckoutPage: React.FC<SmartCheckoutPageProps> = ({
  productId,
  merchantId,
  onBack,
  className = '',
  planName: propPlanName,
  amount: propAmount,
  isAnnual: propIsAnnual
}) => {
  // Initialisation 100% dynamique du produit ciblé (URL Params + Props + ProductId)
  const [product] = useState<FunnelProductItem>(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const planParam = (urlParams?.get('plan') || urlParams?.get('planId') || '').toLowerCase();
    const cycleParam = (urlParams?.get('cycle') || urlParams?.get('period') || '').toLowerCase();
    const amountParam = urlParams?.get('amount') || urlParams?.get('price') || '';
    const nameParam = urlParams?.get('name') || urlParams?.get('title') || propPlanName || '';
    const descParam = urlParams?.get('desc') || urlParams?.get('description') || '';

    const isAnnual = propIsAnnual !== undefined 
      ? propIsAnnual 
      : (cycleParam === 'annual' || cycleParam === 'year' || cycleParam === 'annuel' || cycleParam === '12');

    const effectiveId = (productId || planParam || 'pro').toLowerCase();

    // 1. Détection Formule Enterprise / Élite (60 000 F CFA / mois ou 600 000 F CFA / an)
    // À la carte : Caisse 20k, Vitrine 20k, Formateur 40k, Pack 60k
    if (
      effectiveId === 'enterprise' || 
      effectiveId === 'elite' || 
      effectiveId === 'plan_enterprise' || 
      effectiveId === 'plan-enterprise' ||
      effectiveId === 'nanasore_elite_20_pays'
    ) {
      const price = propAmount || (amountParam ? Number(amountParam) : (isAnnual ? 600000 : 60000));
      let planTitle = nameParam || (isAnnual ? 'Abonnement Enterprise Nanasore • Licence Annuelle Marque Blanche' : 'Abonnement Enterprise / Élite • Marque Blanche 100% Souveraine');
      let planDescription = descParam || 'Licence Enterprise : Marque Blanche intégrale (nom de domaine dédié), caisses & campus illimités, API/Webhooks et SLA 99.9% garanti.';

      if (price === 20000) {
        planTitle = 'Abonnement Enterprise • La Caisse ou Vitrine uniquement (Caisses Illimitées)';
        planDescription = 'Module Enterprise à la carte : Caisses POS physiques illimitées, tickets thermiques, clôture Z et autonomie souveraine.';
      } else if (price === 40000) {
        planTitle = 'Abonnement Enterprise • Formateur Académie ou Combiné Caisse + Vitrine';
        planDescription = 'Module Enterprise à la carte : Campus en ligne illimité, masterclasses Wameet et clés API dédiées.';
      }

      return {
        id: 'plan_enterprise',
        name: planTitle,
        price,
        originalPrice: Math.round(price * 1.3),
        itemType: 'subscription',
        imageUrl: '',
        description: planDescription
      };
    }

    // 2. Détection Formule Business (30 000 F CFA / mois ou 300 000 F CFA / an, 'pro' dans les configs canoniques)
    // À la carte : Caisse 10k, Vitrine 10k, Formateur 20k, Pack 30k
    if (
      effectiveId === 'business' || 
      effectiveId === 'plan_business' || 
      effectiveId === 'plan-business' ||
      (effectiveId === 'pro' && (propAmount === 30000 || propAmount === 300000 || amountParam === '30000' || amountParam === '300000' || amountParam === '10000' || amountParam === '20000'))
    ) {
      const price = propAmount || (amountParam ? Number(amountParam) : (isAnnual ? 300000 : 30000));
      let planTitle = nameParam || (isAnnual ? 'Abonnement Business Nanasore • Licence Annuelle (-20%)' : 'Abonnement Business Nanasore • Multi-Boutiques & Campus');
      let planDescription = descParam || 'Licence Business : Multi-points de vente (20 caissiers), stocks synchronisés, Pixels Meta/TikTok et CRM marketing automatisé.';

      if (price === 10000) {
        planTitle = 'Abonnement Business • La Caisse ou Vitrine uniquement (20 caissiers PIN)';
        planDescription = 'Module Business à la carte : Caisse multi-vendeurs avec code PIN, stocks multi-magasins et reçus thermiques.';
      } else if (price === 20000) {
        planTitle = 'Abonnement Business • Formateur Académie ou Combiné Caisse + Vitrine';
        planDescription = 'Module Business à la carte : Gestion multi-formateurs, cohortes d\'élèves et relances de paniers automatisées.';
      }

      return {
        id: 'plan_business',
        name: planTitle,
        price,
        originalPrice: Math.round(price * 1.3),
        itemType: 'subscription',
        imageUrl: '',
        description: planDescription
      };
    }

    // 3. Détection Formule Pro (15 000 F CFA / mois ou 150 000 F CFA / an, 'starter' dans les configs canoniques)
    // À la carte : Caisse 5k, Vitrine 5k, Formateur 10k, Pack 15k
    if (
      effectiveId === 'starter' || 
      effectiveId === 'pro' || 
      effectiveId === 'plan_pro' || 
      effectiveId === 'plan-pro' || 
      effectiveId === 'plan_starter' || 
      effectiveId === 'plan-starter' || 
      effectiveId === 'caisse'
    ) {
      const price = propAmount || (amountParam ? Number(amountParam) : (isAnnual ? 150000 : 15000));
      let planTitle = nameParam || (isAnnual ? 'Abonnement Plan Pro Nanasore • Licence Annuelle (2 mois offerts)' : 'Abonnement Plan Pro Nanasore • Boutique & Formateur Pro');
      let planDescription = descParam || 'Licence Pro : Caisse POS tactile, produits illimités, jusqu\'à 50 cours hébergés, multi-caissiers PIN, Live Shopping et 0% de commission.';

      if (price === 5000) {
        planTitle = 'Abonnement Plan Pro • La Caisse ou Vitrine uniquement';
        planDescription = 'Module Pro à la carte : Caisse tactile de comptoir ou Vitrine nsore.shop avec panier WhatsApp à 0% commission.';
      } else if (price === 10000) {
        planTitle = 'Abonnement Plan Pro • Formateur ou Combiné Caisse + Vitrine';
        planDescription = 'Module Pro à la carte : Cours vidéo hébergés, diplômes QR Code officiels ou Caisse + Vitrine réunies.';
      }

      return {
        id: 'plan_pro',
        name: planTitle,
        price,
        originalPrice: Math.round(price * 1.3),
        itemType: 'subscription',
        imageUrl: '',
        description: planDescription
      };
    }

    // 5. Formule Modulaire Sur-Mesure ou montant passé via l'URL
    if (effectiveId === 'custom_modular' || amountParam) {
      const price = propAmount || (amountParam ? Number(amountParam) : (isAnnual ? 150000 : 15000));
      return {
        id: 'custom_modular',
        name: nameParam || 'Formule Modulaire Nanasore Sur-Mesure',
        price,
        originalPrice: Math.round(price * 1.25),
        itemType: 'subscription',
        imageUrl: '',
        description: descParam || 'Formule sur-mesure configurée selon vos piliers d\'activité (Caisse POS, Vitrine Web, Formateur Académie).'
      };
    }

    // 6. Masterclass / Formations
    if (effectiveId.includes('fintech')) {
      return {
        id: productId,
        name: nameParam || 'Masterclass Systèmes Hybrides & Monétique UEMOA',
        price: 45000,
        originalPrice: 75000,
        itemType: 'digital',
        courseId: productId,
        imageUrl: '',
        description: 'Formation certifiée avec modules vidéo haute fidélité, exercices pratiques et attestation QR Code officielle.'
      };
    }

    // 7. Produit standard / Catalogue boutique
    return {
      id: productId,
      name: nameParam || 'Produit Vedette NaNa Store Pro',
      price: propAmount || (amountParam ? Number(amountParam) : 15000),
      originalPrice: propAmount ? Math.round(propAmount * 1.3) : 25000,
      itemType: 'physical',
      imageUrl: '',
      description: descParam || 'Article certifié authentique avec garantie fabricant et support VIP 24/7.'
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
