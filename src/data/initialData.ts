import { FastSaleProduct, DebtCustomer, InventoryProduct, LossRecord, StockMovement, SellerUser, CompletedSale, CustomerOrder } from '../types';

export const FAST_SALE_PRODUCTS: (FastSaleProduct & { photoUrl?: string; imageUrl?: string; category?: string; unit?: string })[] = [
  {
    id: 'fast-prod-1',
    name: 'Riz Parfumé Mémé Cassé (25kg)',
    price: 18500,
    iconName: 'Package',
    badge: 'Populaire',
    category: 'Alimentation',
    unit: 'sac',
    photoUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'fast-prod-2',
    name: 'Bidon Huile Végétale Dinor (5L)',
    price: 6500,
    iconName: 'Droplet',
    badge: 'Essentiel',
    category: 'Alimentation',
    unit: 'bidon',
    photoUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'fast-prod-3',
    name: 'Paquet Sucre Morceaux SN SOSUCO (1kg)',
    price: 900,
    iconName: 'Box',
    badge: 'Vente Rapide',
    category: 'Épicerie',
    unit: 'paquet',
    photoUrl: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'fast-prod-4',
    name: 'Boîte Lait Concentré Bonnet Rouge (410g)',
    price: 750,
    iconName: 'Coffee',
    badge: 'Rayon Frais',
    category: 'Épicerie',
    unit: 'boîte',
    photoUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'fast-prod-5',
    name: 'Pack Savon de Marseille Traditionnel (400g)',
    price: 600,
    iconName: 'Sparkles',
    badge: 'Hygiène',
    category: 'Entretien',
    unit: 'morceau',
    photoUrl: 'https://images.unsplash.com/photo-1607006314641-65b530c30a44?w=500&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1607006314641-65b530c30a44?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'fast-prod-6',
    name: 'Bocal Nescafé Classic 100g',
    price: 1800,
    iconName: 'Coffee',
    badge: 'Boisson',
    category: 'Épicerie',
    unit: 'bocal',
    photoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_INVENTORY: InventoryProduct[] = [
  {
    id: 'init-prod-1',
    storeId: '',
    name: 'Riz Parfumé Mémé Cassé (25kg)',
    category: 'Alimentation',
    costPrice: 15500,
    sellingPrice: 18500,
    stock: 45,
    unit: 'sac',
    keywords: ['riz', 'mémé', 'parfumé', 'alimentation'],
    barcode: '61811001001',
    photoUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    description: 'Riz blanc parfumé de qualité supérieure, sac de 25kg.'
  },
  {
    id: 'init-prod-2',
    storeId: '',
    name: 'Bidon Huile Végétale Dinor (5L)',
    category: 'Alimentation',
    costPrice: 5200,
    sellingPrice: 6500,
    stock: 30,
    unit: 'bidon',
    keywords: ['huile', 'dinor', 'végétale', 'cuisson'],
    barcode: '61811001002',
    photoUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
    description: 'Huile végétale raffinée pour friture et assaisonnement.'
  },
  {
    id: 'init-prod-3',
    storeId: '',
    name: 'Paquet Sucre Morceaux SN SOSUCO (1kg)',
    category: 'Épicerie',
    costPrice: 750,
    sellingPrice: 900,
    stock: 60,
    unit: 'paquet',
    keywords: ['sucre', 'sosuco', 'morceaux', 'épicerie'],
    barcode: '61811001003',
    photoUrl: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&auto=format&fit=crop&q=80',
    description: 'Sucre blanc de canne en morceaux raffiné 1kg.'
  },
  {
    id: 'init-prod-4',
    storeId: '',
    name: 'Boîte Lait Concentré Bonnet Rouge (410g)',
    category: 'Épicerie',
    costPrice: 625,
    sellingPrice: 750,
    stock: 50,
    unit: 'boîte',
    keywords: ['lait', 'bonnet', 'rouge', 'concentré'],
    barcode: '61811001004',
    photoUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
    description: 'Lait concentré sucré enrichi en vitamines.'
  },
  {
    id: 'init-prod-5',
    storeId: '',
    name: 'Pack Savon de Marseille Traditionnel (400g)',
    category: 'Entretien',
    costPrice: 450,
    sellingPrice: 600,
    stock: 80,
    unit: 'morceau',
    keywords: ['savon', 'marseille', 'lessive', 'hygiène'],
    barcode: '61811001005',
    photoUrl: 'https://images.unsplash.com/photo-1607006314641-65b530c30a44?w=500&auto=format&fit=crop&q=80',
    description: 'Savon pur végétal multi-usages pour corps et linge.'
  },
  {
    id: 'init-prod-6',
    storeId: '',
    name: 'Bocal Nescafé Classic 100g',
    category: 'Épicerie',
    costPrice: 1450,
    sellingPrice: 1800,
    stock: 25,
    unit: 'bocal',
    keywords: ['café', 'nescafé', 'classic', 'boisson'],
    barcode: '61811001006',
    photoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    description: 'Café soluble 100% pur café torréfié.'
  }
];

export const INITIAL_CUSTOMERS: DebtCustomer[] = [];
export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];
export const INITIAL_LOSSES: LossRecord[] = [];
export const INITIAL_SELLERS: SellerUser[] = [];
export const INITIAL_SALES: CompletedSale[] = [];
export const INITIAL_ORDERS: CustomerOrder[] = [];
