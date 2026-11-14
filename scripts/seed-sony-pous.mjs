import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAds0VCLfekX8qQw-ya8ATlUbSyrG4Y6Zk",
  authDomain: "nanasore.firebaseapp.com",
  projectId: "nanasore",
  storageBucket: "nanasore.firebasestorage.app",
  messagingSenderId: "60089897725",
  appId: "1:60089897725:web:0c675e63e72040dea56494"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const allBlocks = [
  {
    id: 's-hero',
    type: 'hero_live_masterclass',
    title: 'Hero 3D Live & Masterclass',
    visible: true,
    data: {
      headline: 'Tunnel de Vente Flash Live Shopping',
      subheadline: 'Session interactive en direct avec offres flash et bonus VIP réservés aux participants.',
      promoBadge: '-53% OFFRE LIMITÉE',
      instructorName: 'Nsore • Live / Webinaire Haute Fréquence',
      instructorRole: 'Casque Audio Sans Fil Haut de Gamme',
      productName: 'Sony WH-CH520 - Casque Bluetooth sans Fil, Multipoint, Micro intégré - Beige',
      image: 'https://s3-ap-southeast-2.amazonaws.com/wc-prod-pim/JPEG_1000x1000/DIWHCH520C_sony_whch520_wireless_headphones_beige.jpg',
      price: 35000,
      originalPrice: 25000,
      buttonText: 'Rejoindre le Programme • 35 000 F CFA 🚀',
      bgColor: 'transparent',
      btnBgColor: '#f59e0b'
    },
    props: {
      headline: 'Tunnel de Vente Flash Live Shopping',
      subheadline: 'Session interactive en direct avec offres flash et bonus VIP réservés aux participants.',
      badgeText: '-53% OFFRE LIMITÉE',
      instructorName: 'Nsore • Live / Webinaire Haute Fréquence',
      imageUrl: 'https://s3-ap-southeast-2.amazonaws.com/wc-prod-pim/JPEG_1000x1000/DIWHCH520C_sony_whch520_wireless_headphones_beige.jpg',
      price: 35000,
      originalPrice: 25000,
      ctaText: 'Rejoindre le Programme • 35 000 F CFA 🚀',
      btnBgColor: '#f59e0b'
    }
  },
  {
    id: 's-timer',
    type: 'countdown_timer',
    title: 'Minuteur Urgence Défilant (FOMO)',
    visible: true,
    data: {
      title: '🚨 CETTE OFFRE SPÉCIALE PREND FIN DANS :',
      initialHours: 18,
      initialMinutes: 30,
      initialSeconds: 45
    }
  },
  {
    id: 's-seats',
    type: 'seats_progress_bar',
    title: 'Jauge de Rareté des Places en Direct',
    visible: true,
    data: {
      text: 'Dernières places disponibles avant clôture définitive !',
      percentage: 84
    }
  },
  {
    id: 's-syllabus',
    type: 'syllabus_modules',
    title: 'Programme & Spécifications',
    visible: true,
    data: {
      headline: 'Spécifications Techniques Sony WH-CH520',
      subheadline: 'Profitez d’un son d’exception et d’une autonomie hors norme jusqu’à 50 heures.',
      modules: [
        { title: 'Autonomie Record 50 Heures & Charge Rapide', lessons: '3 min = 1h30 d\'écoute', duration: '50h HD' },
        { title: 'Connexion Multipoint Bluetooth 5.2', lessons: 'Bascule fluide PC / Smartphone', duration: 'BT 5.2' },
        { title: 'Technologie DSEE (Digital Sound Enhancement)', lessons: 'Restitution sonore studio', duration: 'DSEE' },
        { title: 'Microphone Intégré avec Réduction de Bruit', lessons: 'Appels mains-libres cristallins', duration: 'Certifié' }
      ]
    }
  },
  {
    id: 's-bio',
    type: 'instructor_bio',
    title: 'Fiche Formateur & Distinctions',
    visible: true,
    data: {
      name: 'Nsore • Live / Webinaire Haute Fréquence',
      title: 'Distributeur Agréé & Service Certifié',
      bio: 'Produit 100% authentique garanti avec support prioritaire WhatsApp et service après-vente dédié.',
      avatar: 'https://s3-ap-southeast-2.amazonaws.com/wc-prod-pim/JPEG_1000x1000/DIWHCH520C_sony_whch520_wireless_headphones_beige.jpg',
      badges: ['Note Clients 4.9/5', 'Certifié Constructeur 1 An', 'Assistance WhatsApp Direct']
    }
  },
  {
    id: 's-cta',
    type: 'neon_pulse_cta',
    title: 'Bouton Géant Pulse Néon 3D',
    visible: true,
    data: {
      buttonText: 'COMMANDER EN 1-CLIC (35 000 F CFA) 🚀',
      subtext: '🔒 Garantie satisfait ou échangé • Règlement Wave & Orange Money',
      btnBgColor: '#f59e0b',
      btnTextColor: '#000000'
    }
  },
  {
    id: 's-checkout',
    type: 'INLINE_CHECKOUT',
    title: 'Caisse Sécurisée Flash',
    visible: true,
    data: {
      productName: 'Sony WH-CH520 - Casque Bluetooth sans Fil Beige',
      price: 35000,
      originalPrice: 25000
    },
    props: {
      productName: 'Sony WH-CH520 - Casque Bluetooth sans Fil Beige',
      price: 35000,
      originalPrice: 25000
    }
  },
  {
    id: 's-faq',
    type: 'faq_webinar',
    title: 'FAQ Levée des Objections',
    visible: true,
    data: {
      headline: 'Questions Fréquentes sur le Casque Sony',
      items: [
        { q: 'Le produit est-il garanti authentique ?', a: 'Oui, casque 100% original Sony avec emballage scellé d\'origine et garantie constructeur 1 an.' },
        { q: 'Puis-je régler à la livraison ?', a: 'Oui, vous pouvez régler par Wave, Orange Money ou Espèces après vérification du colis en main propre.' },
        { q: 'Est-il compatible iPhone et Android ?', a: 'Oui, parfaitement compatible avec tous les smartphones (iOS, Android), ordinateurs et télévisions Bluetooth.' }
      ]
    }
  },
  {
    id: 's-trust',
    type: 'trust_badges_edu',
    title: 'Garanties et Confiance',
    visible: true,
    data: {
      text: 'Plateforme certifiée • Transactions 100% sécurisées • Garantie NaNa Pro',
      badges: ['Paiement Wave Direct', 'Orange Money Sécurisé', 'Garantie Constructeur 1 An', 'Livraison Express 2H']
    }
  }
];

const pousData = {
  id: 'pous',
  slug: 'pous',
  subdomain: 'pous',
  customDomain: 'pous.nanasore.com',
  title: 'Tunnel de Vente Flash Live Shopping',
  funnelTitle: 'Tunnel de Vente Flash Live Shopping',
  subtitle: 'Session interactive en direct avec offres flash et bonus VIP réservés aux participants.',
  description: 'Session interactive en direct avec offres flash et bonus VIP réservés aux participants.',
  productId: 'prod_sony_whch520',
  productName: 'Sony WH-CH520 - Casque Bluetooth sans Fil, Multipoint, Micro intégré - Beige',
  brandColor: '#f59e0b',
  isPublished: true,
  currency: 'FCFA',
  salePrice: 35000,
  price: 35000,
  originalPrice: 25000,
  promoBadge: '-53% OFFRE LIMITÉE',
  instructorName: 'Nsore • Live / Webinaire Haute Fréquence',
  category: 'Live Shopping & Masterclass',
  image: 'https://s3-ap-southeast-2.amazonaws.com/wc-prod-pim/JPEG_1000x1000/DIWHCH520C_sony_whch520_wireless_headphones_beige.jpg',
  ogImageUrl: 'https://s3-ap-southeast-2.amazonaws.com/wc-prod-pim/JPEG_1000x1000/DIWHCH520C_sony_whch520_wireless_headphones_beige.jpg',
  ogMetadata: {
    title: 'Tunnel de Vente Flash Live Shopping',
    description: 'Session interactive en direct avec offres flash et bonus VIP réservés aux participants.',
    imageUrl: 'https://s3-ap-southeast-2.amazonaws.com/wc-prod-pim/JPEG_1000x1000/DIWHCH520C_sony_whch520_wireless_headphones_beige.jpg',
    priceAmount: 35000,
    currency: 'FCFA'
  },
  blocks: allBlocks,
  steps: {
    sales: allBlocks
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
};

const tenantData = {
  storeId: 'pous',
  storeName: 'Tunnel de Vente Flash Live Shopping',
  title: 'Tunnel de Vente Flash Live Shopping',
  customDomain: 'pous.nanasore.com',
  subdomain: 'pous',
  type: 'funnel',
  vendorType: 'funnel',
  funnelId: 'pous',
  funnelSlug: 'pous',
  dealSlug: 'pous',
  productId: 'prod_sony_whch520',
  salePrice: 35000,
  price: 35000,
  originalPrice: 25000,
  primaryColor: '#f59e0b',
  brandColor: '#f59e0b',
  theme: 'dark',
  funnelData: pousData,
  updatedAt: Date.now()
};

async function seed() {
  console.log('Seeding Ultimate Funnel blocks for pous...');
  
  await setDoc(doc(db, 'tenants', 'pous'), tenantData, { merge: true });
  await setDoc(doc(db, 'tenants', 'pous.nanasore.com'), tenantData, { merge: true });
  await setDoc(doc(db, 'funnels', 'pous'), pousData, { merge: true });
  await setDoc(doc(db, 'funnels', 'pous.nanasore.com'), pousData, { merge: true });
  await setDoc(doc(db, 'deals', 'pous'), pousData, { merge: true });
  await setDoc(doc(db, 'deals', 'pous.nanasore.com'), pousData, { merge: true });
  
  console.log('SEED COMPLETE WITH ALL 9 ULTIMATE FUNNEL BLOCKS!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
