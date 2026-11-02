import { 
  Laptop, Camera, Smartphone, Gamepad2, Tv, Watch, 
  Car, Headphones, Sparkles, Flame, Tag, LucideIcon 
} from 'lucide-react';

export interface ElectroSubColumn {
  title: string;
  items: string[];
}

export interface ElectroPromoBanner {
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  bgColor?: string;
}

export interface ElectroDepartmentCategory {
  id: string;
  name: string;
  icon?: LucideIcon;
  isFeatured?: boolean;
  hasSubmenu?: boolean;
  columns?: ElectroSubColumn[];
  promoBanner?: ElectroPromoBanner;
}

export const ELECTRO_DEPARTMENTS: ElectroDepartmentCategory[] = [
  {
    id: 'value-of-day',
    name: 'Offre Spéciale du Jour',
    icon: Flame,
    isFeatured: true,
    hasSubmenu: false
  },
  {
    id: 'top-100',
    name: 'Top 100 Meilleures Ventes',
    icon: Tag,
    isFeatured: true,
    hasSubmenu: false
  },
  {
    id: 'new-arrivals',
    name: 'Derniers Arrivages High-Tech',
    icon: Flame,
    isFeatured: true,
    hasSubmenu: false
  },
  {
    id: 'computers-accessories',
    name: 'Ordinateurs & Accessoires',
    icon: Laptop,
    hasSubmenu: true,
    columns: [
      {
        title: 'PC & Portables',
        items: ['MacBook Pro & Air', 'Ultrabooks Slim', 'PC Gamers Tour', 'Chromebooks', 'PC Tout-en-un']
      },
      {
        title: 'Périphériques',
        items: ['Claviers Mécaniques', 'Souris Gaming Ergonomiques', 'Écrans 4K & Incurvés', 'Casques Micro', 'Webcams Full HD']
      },
      {
        title: 'Stockage & Réseau',
        items: ['SSD NVMe 1To / 2To', 'Disques Durs Externes', 'Routeurs Wi-Fi 6', 'Clés USB 3.2', 'Hubs Type-C GaN']
      }
    ],
    promoBanner: {
      badge: 'NOUVEAU',
      title: 'PC Portables GaN',
      subtitle: 'Autonomie 24h & Processeurs M3/i9',
      cta: 'Découvrir'
    }
  },
  {
    id: 'cameras-audio-video',
    name: 'Caméras, Audio & Vidéo',
    icon: Camera,
    hasSubmenu: true,
    columns: [
      {
        title: 'Photographie',
        items: ['Appareils Hybrides', 'Reflex Numériques', 'Objectifs 50mm / 85mm', 'Trépieds Carbone', 'Stabilisateurs Gimbal']
      },
      {
        title: 'Audio Hi-Fi',
        items: ['Casques Réduction Bruit', 'Écouteurs True Wireless', 'Enceintes Bluetooth', 'Barres de Son Dolby', 'Amplificateurs DAC']
      },
      {
        title: 'Vidéo & Vlogging',
        items: ['Caméras d\'Action 4K', 'Micros Cravate Sans Fil', 'Éclairages Ring Light', 'Cartes d\'Acquisition', 'Drones Vidéo']
      }
    ],
    promoBanner: {
      badge: 'PROMO -30%',
      title: 'Studio Vlogging',
      subtitle: 'Packs complets prêts à diffuser',
      cta: 'Voir les offres'
    }
  },
  {
    id: 'mobiles-tablets',
    name: 'Smartphones & Tablettes',
    icon: Smartphone,
    hasSubmenu: true,
    columns: [
      {
        title: 'Smartphones',
        items: ['iPhone 15 / 16 Pro', 'Samsung Galaxy S24 Ultra', 'Xiaomi 14 Series', 'Google Pixel 9', 'Smartphones Pliables']
      },
      {
        title: 'Tablettes',
        items: ['iPad Pro M4', 'Samsung Galaxy Tab S9', 'Stylets & Pencils', 'Étuis avec Clavier', 'Support Tablette Pro']
      },
      {
        title: 'Protection & Énergie',
        items: ['Coques MagSafe', 'Verres Trempés 9H', 'Powerbanks 65W', 'Chargeurs Rapides GaN', 'Câbles Tressés 240W']
      }
    ],
    promoBanner: {
      badge: 'POPULAIRE',
      title: 'Flagships 5G',
      subtitle: 'Livraison 24h & Garantie 1 an',
      cta: 'Commander'
    }
  },
  {
    id: 'gaming-consoles',
    name: 'Jeux Vidéo & Consoles',
    icon: Gamepad2,
    hasSubmenu: true,
    columns: [
      {
        title: 'Consoles',
        items: ['PlayStation 5 Slim', 'Xbox Series X / S', 'Nintendo Switch OLED', 'Consoles Portables PC', 'Consoles Rétrogaming']
      },
      {
        title: 'Manettes & Accessoires',
        items: ['Manettes Pro Sans Fil', 'Volants de Course Retour Force', 'Sièges Gaming Ergonomiques', 'Cartes Mémoire PS5', 'Bases de Recharge']
      },
      {
        title: 'Jeux Phares',
        items: ['EA Sports FC 25', 'Call of Duty Black Ops 6', 'GTA V & GTA VI Préco', 'Zelda Tears of Kingdom', 'Spider-Man 2']
      }
    ],
    promoBanner: {
      badge: 'GAMING FEST',
      title: 'Pack PS5 + Manette',
      subtitle: '2ème manette offerte ce week-end',
      cta: 'Profiter du deal'
    }
  },
  {
    id: 'tv-audio',
    name: 'TV & Home Cinéma',
    icon: Tv,
    hasSubmenu: true,
    columns: [
      {
        title: 'Téléviseurs',
        items: ['Smart TV OLED 65"', 'Téléviseurs QLED 4K 55"', 'Mini-LED 144Hz Gaming', 'TV Portables', 'Télécommandes Vocales']
      },
      {
        title: 'Vidéoprojecteurs',
        items: ['Projecteurs Laser 4K', 'Mini Projecteurs Portables', 'Toiles de Projection', 'Box TV Android 4K', 'Supports Muraux VESA']
      },
      {
        title: 'Audio Salon',
        items: ['Systèmes 5.1 Dolby Atmos', 'Caissons de Basse Actifs', 'Câbles HDMI 2.1 8K', 'Transmetteurs Bluetooth', 'Casques TV Sans Fil']
      }
    ],
    promoBanner: {
      badge: 'CINÉMA',
      title: 'Smart TV OLED',
      subtitle: 'Expérience cinéma chez soi',
      cta: 'Comparer'
    }
  },
  {
    id: 'watches-eyewear',
    name: 'Montres & Objets Connectés',
    icon: Watch,
    hasSubmenu: true,
    columns: [
      {
        title: 'Montres Sport & Santé',
        items: ['Apple Watch Ultra 2', 'Samsung Galaxy Watch 7', 'Montres GPS Multisport', 'Bracelets Fitness Cardio', 'Bagues Connectées']
      },
      {
        title: 'Bracelets & Accessoires',
        items: ['Bracelets Métal Maille Milanaise', 'Bracelets Cuir Vintage', 'Bracelets Sport Silicone', 'Chargeurs Sans Fil Magnétiques', 'Films de Protection']
      },
      {
        title: 'Objets du Quotidien',
        items: ['Balises GPS Anti-Perte', 'Lunettes Audio Connectées', 'Balances Impédancemètre', 'Capteurs de Sommeil', 'Thermomètres Connectés']
      }
    ],
    promoBanner: {
      badge: 'SANTÉ & SPORT',
      title: 'Montre Pro GPS',
      subtitle: 'Cardio précis & Batterie 14 jours',
      cta: 'Voir le modèle'
    }
  },
  {
    id: 'accessories',
    name: 'Accessoires High-Tech & Auto',
    icon: Car,
    hasSubmenu: true,
    columns: [
      {
        title: 'High-Tech Auto',
        items: ['Dashcams Avant/Arrière 4K', 'Transmetteurs FM Bluetooth', 'Supports Téléphone Magnétiques', 'Chargeurs Allume-Cigare 100W', 'Compresseurs Pneus Portables']
      },
      {
        title: 'Câblerie & Connectique',
        items: ['Câbles USB-C vers Lightning', 'Adaptateurs HDMI multi-écrans', 'Rallonges Multiprises USB', 'Organisateurs de Câbles', 'Batteries de Démarrage Booster']
      },
      {
        title: 'Maison Intelligente',
        items: ['Ampoules LED RGB Connectées', 'Prises Connectées Mesure Énergie', 'Caméras Sécurité Wi-Fi', 'Sonnettes Vidéo Interphone', 'Capteurs Température & Humidité']
      }
    ],
    promoBanner: {
      badge: 'INDISPENSABLE',
      title: 'Dashcam 4K Sécurisée',
      subtitle: 'Enregistrement 24h & Vision de nuit',
      cta: 'Découvrir'
    }
  }
];
