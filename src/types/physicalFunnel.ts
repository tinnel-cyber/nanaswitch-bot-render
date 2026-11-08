/**
 * Types pour le constructeur de pages de vente physiques (NaNa Physical Funnel Builder)
 * Blocs CRO à haute conversion (AIDA, FOMO, Scarcity, Trust Badges, Inline Checkout).
 */

import { DeliveryOption, OrderBumpConfig } from './omniFunnel';

export type PhysicalFunnelBlockType =
  | 'HERO_PRODUCT'
  | 'HERO_SPLIT_LUXURY'
  | 'HERO_VSL_VIDEO'
  | 'HERO_FLASH_CARD'
  | 'LIVE_SALE_TOAST'
  | 'FLASH_LIVE_CTA'
  | 'SCARCITY_URGENCY'
  | 'TRUST_BADGES'
  | 'INLINE_CHECKOUT'
  | 'BENEFITS_LIST'
  | 'CUSTOMER_REVIEWS'
  | 'AUTOPLAY_VIDEO'
  | 'MINI_MARKET_DRAWER';

export interface PhysicalFunnelBlock {
  id: string;
  type: PhysicalFunnelBlockType;
  title: string;
  visible: boolean;
  props: Record<string, any>;
}

export interface OpenGraphMetadata {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  priceAmount?: number;
  currency?: string;
}

export interface PhysicalFunnelConfig {
  id: string;
  slug: string; // e.g. 'montre-luxe-ouaga' -> nanasore.com/c/montre-luxe-ouaga
  productId: string;
  title: string;
  brandColor: string; // e.g. '#10b981', '#6366f1', '#f43f5e', '#06b6d4', '#f59e0b', '#8b5cf6'
  secondaryColor?: string;
  storeId?: string;
  merchantWhatsapp?: string;
  defaultCity?: string;
  shippingFee?: number;
  deliveryTime?: string;
  deliveryOptions?: DeliveryOption[];
  orderBump?: OrderBumpConfig;
  orderBumpEnabled?: boolean;
  paymentMethods?: {
    wave?: boolean;
    orangeMoney?: boolean;
    mtn?: boolean;
    moov?: boolean;
    cashOnDelivery?: boolean;
  };
  funnelType?: string;
  funnelStudio?: string;
  linkPrefix?: string;
  blocks: PhysicalFunnelBlock[];
  ogMetadata: OpenGraphMetadata;
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_PHYSICAL_FUNNEL_BLOCKS: PhysicalFunnelBlock[] = [
  {
    id: 'block-hero',
    type: 'HERO_PRODUCT',
    title: 'Hero Vitrine & Appel à l\'Action',
    visible: true,
    props: {
      headline: 'Offre Spéciale Exclusive',
      subheadline: 'Produit premium sélectionné avec soin. Profitez de notre tarif exclusif et de la livraison express.',
      badgeText: 'VENTE FLASH EXCLUSIVE • STOCK LIMITÉ',
      price: 35000,
      originalPrice: 45000,
      discountBadge: '-25% AUJOURD\'HUI',
      ctaText: 'Commander avec Wave / Orange Money',
      imageUrl: ''
    }
  },
  {
    id: 'block-scarcity',
    type: 'SCARCITY_URGENCY',
    title: 'Jauge de Rareté & Compte à Rebours',
    visible: true,
    props: {
      totalStock: 30,
      remainingStock: 7,
      hoursLeft: 3,
      urgencyText: 'Plus que 7 exemplaires disponibles à ce tarif promotionnel !'
    }
  },
  {
    id: 'block-benefits',
    type: 'BENEFITS_LIST',
    title: 'Avantages Clés (AIDA Framework)',
    visible: true,
    props: {
      headline: 'Pourquoi nos clients adorent ce produit :',
      bullets: [
        { title: 'Qualité Supérieure Certifiée', desc: 'Conçu avec des matériaux durables et résistants.' },
        { title: 'Garantie Totale 12 Mois', desc: 'Échange immédiat en cas de défaut.' },
        { title: 'Livraison Express Sécurisée', desc: 'Vérifiez votre colis avant de régler.' }
      ]
    }
  },
  {
    id: 'block-flash-live',
    type: 'FLASH_LIVE_CTA',
    title: 'Bouton Concierge WebRTC Live (5 min)',
    visible: true,
    props: {
      buttonText: '👁️ Voir le produit en direct (Visio 5 min)',
      badgeText: 'VENDEUR CONNECTÉ EN BOUTIQUE',
      merchantPhone: '+22670000000'
    }
  },
  {
    id: 'block-trust',
    type: 'TRUST_BADGES',
    title: 'Badges de Confiance & Réassurance',
    visible: true,
    props: {
      badges: [
        'Paiement 100% Sécurisé Wave & Orange Money',
        'Livraison Express & Sécurisée',
        'Garantie Authenticité NaNa'
      ]
    }
  },
  {
    id: 'block-mini-market',
    type: 'MINI_MARKET_DRAWER',
    title: 'Mini-Market Express (Auto-composition)',
    visible: true,
    props: {
      buttonText: 'Explorer le Mini-Market',
      badgeText: 'Auto-composition',
      headline: 'Complétez votre commande avec le Mini-Market',
      subheadline: 'Ajoutez des articles et accessoires complémentaires directement.',
      floatingButtonEnabled: true,
    }
  },
  {
    id: 'block-checkout',
    type: 'INLINE_CHECKOUT',
    title: 'Caisse Geo-Routée Intégrée (Sans Panier)',
    visible: true,
    props: {
      heading: 'Finalisez votre commande en 1 minute',
      subheading: 'Paiement sans contact ou règlement à la livraison',
      defaultProvider: 'WAVE'
    }
  },
  {
    id: 'block-fomo',
    type: 'LIVE_SALE_TOAST',
    title: 'Notifications de Ventes en Direct (FOMO)',
    visible: true,
    props: {
      intervalSeconds: 12,
      enabled: true
    }
  }
];
