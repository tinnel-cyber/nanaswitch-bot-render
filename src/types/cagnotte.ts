/**
 * @file cagnotte.ts
 * @description Types et Modèle de Données pour la "Cagnotte Phygitale Automatisée" Wameet
 * Intégrée à l'inventaire des marchands Nanasore avec exécution par Contrat Intelligent.
 */

export interface NaNaPosGiftItem {
  id: string;
  name: string;
  category: string;
  price: number; // Montant exact en FCFA
  currency: string;
  imageUrl: string;
  description: string;
  stock: number;
  merchantId: string;
  merchantName: string; // Ex: "iStore Ouaga 2000", "Sahel Voyages", "Sublime Parfumerie"
  merchantLocation: string; // Ex: "Avenue Pascal Zagre, Ouaga 2000"
  merchantPhone: string;
  merchantWalletId: string; // Wallet interne Wameet du marchand Nanasore
  estimatedDeliveryMinutes: number;
  badge?: string;
}

export type CagnottePaymentMethod = 'ORANGE_MONEY' | 'WAVE' | 'MOOV' | 'MTN' | 'WAMEET_WALLET';

export interface CagnotteContribution {
  id: string;
  cagnotteId: string;
  contributorId: string;
  contributorName: string;
  contributorPhone?: string;
  contributorAvatar?: string;
  amount: number; // en FCFA
  currency: string;
  note?: string; // Dédicace pour l'anniversaire
  paymentMethod: CagnottePaymentMethod;
  status: 'pending' | 'completed' | 'failed';
  transactionId: string;
  timestamp: number;
}

export interface CagnotteSmartContract {
  isExecuted: boolean;
  executedAt?: number;
  merchantPayoutId?: string;
  merchantWalletCredited?: number;
  posOrderId?: string;
  deliveryStatus: 'pending' | 'preparing' | 'in_transit' | 'delivered';
  deliverySlot: string; // Ex: "Samedi 24 Octobre à 19h30 (Heure de la fête)"
  deliveryAddress: string; // Ex: "Villa 42, Rue des Palmiers, Ouaga 2000"
  deliveryPinCode: string; // PIN sécurisé remis au livreur à la fête
  terms: string;
}

/**
 * Modélisation exacte CagnotteSession (Prompt 21)
 */
export interface CagnotteSession {
  id: string;
  groupId: string;
  productId: string; // lié à l'inventaire Nanasore
  targetAmount: number;
  currentAmount: number; // défaut 0
  status: 'funding' | 'completed';
  createdAt?: number;
  completedAt?: number;
}

export interface CagnotteGroupState {
  id: string;
  groupId: string;
  groupName: string; // Ex: "Anniversaire de Sarah 🎂"
  beneficiaryName: string; // Ex: "Sarah Kaboré"
  beneficiaryAvatar?: string;
  creatorId: string;
  creatorName: string;
  gift: NaNaPosGiftItem;
  targetAmount: number; // Prix du cadeau (ex: 650 000 FCFA)
  collectedAmount: number; // Total cumulé
  progressPercentage: number; // 0 à 100%
  contributionsCount: number;
  contributions: CagnotteContribution[];
  status: 'active' | 'funded' | 'delivered' | 'cancelled';
  eventDate: string; // Date et heure de la fête
  eventLocation: string; // Lieu de la fête
  smartContract: CagnotteSmartContract;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCagnottePayload {
  groupId: string;
  groupName: string;
  beneficiaryName: string;
  beneficiaryAvatar?: string;
  creatorId: string;
  creatorName: string;
  giftId: string;
  eventDate: string;
  eventLocation: string;
}

export interface ContributeCagnottePayload {
  cagnotteId: string;
  contributorId: string;
  contributorName: string;
  contributorPhone?: string;
  contributorAvatar?: string;
  amount: number;
  paymentMethod?: CagnottePaymentMethod;
  note?: string;
}

export const NANA_POS_GIFT_CATALOG: NaNaPosGiftItem[] = [
  {
    id: 'gift_iphone_15_pro_max',
    name: 'Apple iPhone 15 Pro Max (256 Go Titane Naturel)',
    category: 'High-Tech & Smartphone',
    price: 650000,
    currency: 'FCFA',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    description: 'Écran Super Retina XDR 6.7", Puce A17 Pro, Caméra 48 MP avec Zoom Optique 5x, Châssis en Titane ultra-léger.',
    stock: 4,
    merchantId: 'merchant_istore_ouaga_2000',
    merchantName: 'iStore Ouaga 2000 (Revendeur Agréé Apple)',
    merchantLocation: 'Avenue Pascal Zagre, Ouaga 2000, Ouagadougou',
    merchantPhone: '+226 25 37 40 40',
    merchantWalletId: 'wallet_istore_ouaga_2000',
    estimatedDeliveryMinutes: 45,
    badge: '👑 Best-Seller Anniversaire'
  },
  {
    id: 'gift_billet_avion_abidjan',
    name: 'Billet d’Avion A/R Air Burkina (Ouaga - Abidjan)',
    category: 'Voyages & Expériences',
    price: 285000,
    currency: 'FCFA',
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=80',
    description: 'Vol direct Aller/Retour Ouagadougou - Abidjan Félix-Houphouët-Boigny, bagage en soute 2x23kg inclus, dates modifiables.',
    stock: 10,
    merchantId: 'merchant_sahel_voyages',
    merchantName: 'Agence Sahel Voyages & Billetterie',
    merchantLocation: 'Boulevard Charles de Gaulle, Ouagadougou',
    merchantPhone: '+226 25 31 12 12',
    merchantWalletId: 'wallet_sahel_voyages',
    estimatedDeliveryMinutes: 30,
    badge: '✈️ Billet Électronique Instantané'
  },
  {
    id: 'gift_coffret_parfum_luxe',
    name: 'Coffret Parfumerie & Soins de Luxe Paris-Abidjan',
    category: 'Beauté & Bien-être',
    price: 85000,
    currency: 'FCFA',
    imageUrl: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=600&auto=format&fit=crop&q=80',
    description: 'Eau de Parfum Niche 100ml, crème hydratante soyeuse au Karité enrichi et bougie parfumée signature.',
    stock: 8,
    merchantId: 'merchant_sublime_cosmetique',
    merchantName: 'Boutique Sublime Cosmétique',
    merchantLocation: 'Centre Commercial NaNa Mall, Niveau 1',
    merchantPhone: '+226 70 88 99 00',
    merchantWalletId: 'wallet_sublime_cosmetique',
    estimatedDeliveryMinutes: 35,
    badge: '✨ Emballage Cadeau Luxe Offert'
  },
  {
    id: 'gift_ps5_slim_bundle',
    name: 'Console Sony PlayStation 5 Slim + 2 Manettes DualSense',
    category: 'Gaming & High-Tech',
    price: 420000,
    currency: 'FCFA',
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80',
    description: 'Édition standard avec lecteur de disque, 1 To SSD, 2 manettes sans fil DualSense et le jeu EA Sports FC 25 inclus.',
    stock: 3,
    merchantId: 'merchant_gaming_world',
    merchantName: 'Gaming World Ouaga',
    merchantLocation: 'Quartier Koulouba, Rue du Commerce',
    merchantPhone: '+226 76 54 32 10',
    merchantWalletId: 'wallet_gaming_world',
    estimatedDeliveryMinutes: 40,
    badge: '🎮 Pack Gamer VIP'
  },
  {
    id: 'gift_apple_watch_9',
    name: 'Apple Watch Series 9 GPS 45mm Boîtier Minuit',
    category: 'High-Tech & Montres',
    price: 220000,
    currency: 'FCFA',
    imageUrl: 'https://images.unsplash.com/photo-1509741102003-ca64bfe5f069?w=600&auto=format&fit=crop&q=80',
    description: 'Puce S9 SiP, geste Double Toucher, capteur d’oxygène sanguin, ECG et écran Retina lumineux jusqu’à 2 000 nits.',
    stock: 6,
    merchantId: 'merchant_techzone_abidjan',
    merchantName: 'TechZone NaNa Mall',
    merchantLocation: 'Zone Commerciale Kamsonghin, Ouagadougou',
    merchantPhone: '+226 25 41 80 80',
    merchantWalletId: 'wallet_techzone_abidjan',
    estimatedDeliveryMinutes: 45,
    badge: '⌚ Santé & Élégance'
  },
  {
    id: 'gift_samsung_tv_55',
    name: 'Smart TV 55" Crystal UHD 4K Samsung',
    category: 'Électroménager & Maison',
    price: 310000,
    currency: 'FCFA',
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80',
    description: 'Résolution 4K UHD 3840x2160, HDR 10+, Processeur Crystal 4K, Smart Hub Tizen avec Netflix et YouTube intégrés.',
    stock: 5,
    merchantId: 'merchant_electro_plus',
    merchantName: 'Électro-Plus Ouaga',
    merchantLocation: 'Avenue de la Nation, Secteur 4',
    merchantPhone: '+226 25 30 65 65',
    merchantWalletId: 'wallet_electro_plus',
    estimatedDeliveryMinutes: 60,
    badge: '📺 Cinéma à la Maison'
  }
];
