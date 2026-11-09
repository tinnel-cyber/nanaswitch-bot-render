/**
 * Types pour le module NaNa Omni-Funnel Engine
 * Prise en charge des produits digitaux et physiques, Checkout universel,
 * OTO (Upsell & Downsell), calculs logistiques, synchronisation WooCommerce, Brevo et Twilio.
 */

export type ItemType = 'digital' | 'physical';

export type FunnelStep = 'CHECKOUT' | 'UPSELL' | 'DOWNSELL' | 'SUCCESS';

export type FunnelPaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'MTN_MOMO' | 'STRIPE' | 'CASH_ON_DELIVERY';

export interface UtmParameters {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface DeliveryOption {
  id: string;
  name: string;
  price: number;
  estimatedTime: string;
  description?: string;
  supportedCities?: string[];
}

export interface ShippingAddress {
  fullName: string;
  phoneNumber: string;
  city: string;
  district: string;
  streetAddress?: string;
  notes?: string;
  googleMapsPin?: string;
  latitude?: number;
  longitude?: number;
}

export interface OrderBumpConfig {
  id: string;
  title: string;
  description: string;
  price: number;
  badge?: string;
  enabled: boolean;
}

export interface FunnelProductItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  itemType: ItemType;
  stock?: number;
  sku?: string;
  wooCommerceId?: number;
  courseId?: string; // Si itemType === 'digital'
  storeId?: string;
}

export interface UpsellOfferConfig {
  id: string;
  title: string;
  headline: string;
  subheadline?: string;
  videoUrl?: string;
  imageUrl?: string;
  product: FunnelProductItem;
  discountPrice: number;
  originalPrice: number;
  durationSeconds: number; // e.g. 180 (3 min)
  benefits: string[];
  ctaLabel: string;
  declineLabel: string;
}

export interface DownsellOfferConfig {
  id: string;
  title: string;
  headline: string;
  subheadline?: string;
  product: FunnelProductItem;
  discountPrice: number;
  originalPrice: number;
  benefits: string[];
  ctaLabel: string;
  declineLabel: string;
}

export interface OmniFunnelOrder {
  orderId: string;
  wooOrderId?: number;
  storeId?: string;
  status: 'PENDING' | 'ON_HOLD' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  itemType: ItemType;
  primaryProduct: FunnelProductItem;
  orderBump?: {
    bumpId: string;
    title: string;
    price: number;
    accepted: boolean;
  };
  delivery?: {
    option: DeliveryOption;
    shippingAddress: ShippingAddress;
    status: 'PENDING_PREPARATION' | 'DISPATCHED' | 'DELIVERED';
    trackingNumber?: string;
  };
  upsell?: {
    upsellId: string;
    title: string;
    price: number;
    purchased: boolean;
    purchasedAt?: number;
  };
  downsell?: {
    downsellId: string;
    title: string;
    price: number;
    purchased: boolean;
    purchasedAt?: number;
  };
  customer: {
    fullName: string;
    email?: string;
    phoneNumber: string;
    userId?: string;
  };
  payment: {
    provider: FunnelPaymentProvider;
    transactionId?: string;
    primaryAmount: number;
    bumpAmount: number;
    shippingAmount: number;
    upsellAmount: number;
    downsellAmount: number;
    grandTotal: number;
    currency: string;
    paidAt?: number;
  };
  utm: UtmParameters;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'express-bobo',
    name: 'Livraison Express Bobo-Dioulasso (2h)',
    price: 1500,
    estimatedTime: 'Moins de 2 heures',
    description: 'Coursier dédié par moto dans tout Bobo-Dioulasso',
    supportedCities: ['Bobo-Dioulasso']
  },
  {
    id: 'standard-ouaga',
    name: 'Livraison Standard Ouagadougou (24h)',
    price: 2000,
    estimatedTime: '24 heures maximum',
    description: 'Livraison sécurisée à domicile ou en point relais',
    supportedCities: ['Ouagadougou']
  },
  {
    id: 'inter-state',
    name: 'Expédition Côte d\'Ivoire / Sénégal (48h-72h)',
    price: 4500,
    estimatedTime: '48 à 72 heures',
    description: 'Colis express suivi avec notification SMS',
    supportedCities: ['Abidjan', 'Dakar', 'Bouaké', 'San Pedro']
  },
  {
    id: 'store-pickup',
    name: 'Retrait Immédiat en Boutique NaNa',
    price: 0,
    estimatedTime: 'Immédiat aux heures d\'ouverture',
    description: 'Boutique NaNa POS Pro - Espace Konkobo Pousbila Telecom',
    supportedCities: ['Bobo-Dioulasso', 'Ouagadougou']
  }
];

export const DEFAULT_ORDER_BUMP: OrderBumpConfig = {
  id: 'bump-gift-packaging',
  title: '🎁 Ajouter un emballage cadeau premium + Ruban de luxe',
  description: 'Boîte rigide ultra-élégante, carte personnalisée et ruban satiné offert.',
  price: 1000,
  badge: 'OFFRE POPULAIRE',
  enabled: true
};
