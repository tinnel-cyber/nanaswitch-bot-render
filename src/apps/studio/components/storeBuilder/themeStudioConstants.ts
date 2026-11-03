import { StoreProductItem } from './types';
import { ThemeCustomizationConfig } from '../../../../types';

export const FALLBACK_STUDIO_PRODUCTS: StoreProductItem[] = [
  {
    id: 'studio-p1',
    name: "Sérum Visage Éclat & Anti-Oxydant 50ml",
    price: 18500,
    originalPrice: 22000,
    category: "Soins Visage",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
    stock: 25,
    description: "Formule concentrée enrichie en Vitamine C et Acide Hyaluronique pour un teint lumineux dès la première semaine.",
    badge: "Bestseller",
    colorSwatches: [
      { name: "Or Pur 24K", hex: "#D4AF37" },
      { name: "Émeraude Botanique", hex: "#0F4C3A" },
      { name: "Rose Pêche", hex: "#F4A460" }
    ],
    sizeOptions: ["30ml", "50ml", "100ml"],
    keyFeatures: [
      "Concentré à 15% de Vitamine C stabilisée",
      "Hydratation prouvée 24h sans effet gras",
      "Fabriqué avec des extraits d'aloe vera bio"
    ],
    bundleProductIds: ['studio-p2', 'studio-p3'],
    bundleDiscountPercent: 15,
    liveLotBadge: "#LOT 01"
  },
  {
    id: 'studio-p2',
    name: "Huile Botanique Précieuse Régénérante",
    price: 14000,
    originalPrice: 17500,
    category: "Sérums",
    image: "https://images.unsplash.com/photo-1608248597359-e93574c8b056?w=600&auto=format&fit=crop&q=80",
    stock: 18,
    description: "Complexe de 7 huiles naturelles nourrissantes pressées à froid pour revitaliser la peau en profondeur.",
    badge: "Bio 100%",
    sizeOptions: ["50ml", "100ml"],
    keyFeatures: [
      "7 huiles précieuses pressées à froid",
      "Régénération cellulaire nocturne",
      "Toucher sec et absorption ultra-rapide"
    ],
    bundleProductIds: ['studio-p1'],
    bundleDiscountPercent: 10,
    liveLotBadge: "#LOT 02"
  },
  {
    id: 'studio-p3',
    name: "Crème Hydratante Intense 24h Velours",
    price: 12500,
    originalPrice: 15000,
    category: "Corps",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
    stock: 30,
    description: "Texture fondante non grasse adaptée aux climats tropicaux et peaux sensibles. Hydratation prouvée 24h.",
    badge: "Nouveau",
    sizeOptions: ["100ml", "200ml"],
    keyFeatures: [
      "Beurre de karité brut d'Afrique de l'Ouest",
      "Protège des agressions climatiques",
      "Parfum délicat sans allergènes"
    ],
    liveLotBadge: "#LOT 03"
  },
  {
    id: 'studio-p4',
    name: "Coffret Rituel Spa Prestige 4-en-1",
    price: 35000,
    originalPrice: 45000,
    category: "Nouveautés",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80",
    stock: 10,
    description: "L'expérience bien-être complète à domicile : Gommage exfoliant, Crème veloutée, Sérum tenseur et Masque purifiant.",
    badge: "Promo Flash",
    keyFeatures: [
      "Coffret cadeau premium avec trousse offerte",
      "Économie de 10 000 FCFA par rapport à l'achat séparé",
      "Livraison offerte en boîte scellée"
    ],
    liveLotBadge: "#LOT 04"
  }
];

export const getDefaultCustomConfig = (storeName?: string, phone?: string): ThemeCustomizationConfig => ({
  storeName: storeName || 'Ma Boutique Studio',
  storeTagline: 'Cosmétiques, Skincare & Parfumerie Haute Couture',
  logoUrl: '',
  whatsappNumber: phone || '+225 07 00 00 00',
  supportPhone: '+225 05 00 00 00',
  announcementBarEnabled: true,
  announcementBarText: '⚡ PROMO FLASH : LIVRAISON OFFERTE DÈS 10 000 F CFA AUJOURD\'HUI ! • PAIEMENT MOBILE MONEY',
  primaryAccentColor: '#0F4C3A',
  headerBgColor: '',
  heroSubtitle: 'COLLECTION PRESTIGE 2026',
  heroTitle: 'L\'Excellence & Le Bien-Être au Quotidien',
  heroDescription: 'Des formules exclusives enrichies en actifs naturels d\'Afrique de l\'Ouest pour sublimer votre éclat.',
  heroPriceHighlight: 'À partir de 12.500 FCFA',
  heroCtaText: 'Découvrir la Collection',
  heroCtaUrl: '',
  heroBannerImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
  heroVideoUrl: '',
  heroLinkedProductId: null,
  subBanner1Badge: '-40% FLASH',
  subBanner1Title: 'Sélection Ventes Flash',
  subBanner1Subtitle: 'Jusqu\'à -40% immédiat',
  subBanner1Image: '',
  subBanner1CtaText: 'Profiter de l\'offre',
  subBanner2Badge: '100% AUTHENTIQUE',
  subBanner2Title: 'Meilleures Ventes',
  subBanner2Subtitle: 'Qualité certifiée & garantie',
  subBanner2Image: '',
  subBanner2CtaText: 'Explorer',
  specialOfferProductId: null,
  specialOfferCountdownHours: 24,
  specialOfferSaveBadgeText: 'Économisez jusqu\'à 25%',
  catalogSubtitle: 'Nouvelle Saison',
  catalogTitle: 'Produits Tendances',
  testimonialsSubtitle: 'Résultats Visibles & Témoignages',
  testimonialsTitle: 'Ce que disent nos clientes',
  reassurance1Title: 'Livraison Express 24h',
  reassurance1Desc: 'Partout à Abidjan & intérieur',
  reassurance2Title: 'Paiement Sécurisé',
  reassurance2Desc: 'Wave, Orange, MTN, Moov & Cash',
  reassurance3Title: 'Garantie Satisfait',
  reassurance3Desc: 'Produits 100% authentiques vérifiés',
  reassurance4Title: 'Support Client 7j/7',
  reassurance4Desc: 'Assistance directe par WhatsApp',
  liveStreamVideoUrl: '',
  liveStreamStatus: 'upcoming',
  enableLiveSalesPopup: true,
  footerAboutText: 'Boutique certifiée Nanasore. Produits 100% authentiques avec garantie satisfaction.',
  footerAddress: 'Abidjan, Cocody Riviera Palmeraie',
  footerEmail: 'contact@nsore.shop',
  copyrightText: '',
  paymentIconsVisible: true,
  socialLinks: {
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    whatsapp: ''
  }
});

export default FALLBACK_STUDIO_PRODUCTS;
