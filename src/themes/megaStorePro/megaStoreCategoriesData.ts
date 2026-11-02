import React from 'react';
import { 
  Store, Baby, Sparkles, Cpu, Home as HomeIcon, Utensils, 
  Shirt, Laptop, BookOpen, Compass, Heart 
} from 'lucide-react';

export interface MegaMenuCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  columns: {
    title: string;
    items: string[];
  }[];
  promoBanner?: {
    title: string;
    subtitle: string;
    badge: string;
    cta: string;
  };
}

export const MEGA_CATEGORIES: MegaMenuCategory[] = [
  {
    id: 'shop-layout',
    name: 'Shop Layout',
    icon: Store,
    badge: 'HOT',
    columns: [
      {
        title: 'Mises en page',
        items: ['Grille 4 Colonnes', 'Largeur Maximale (Full-Width)', 'Barre Latérale Moderne', 'Catalogue Haute Densité', 'Vue Liste Compacte']
      },
      {
        title: 'Filtres & Tri',
        items: ['Filtre par Prix Instantané', 'Disponibilité en Stock', 'Tri par Meilleures Ventes', 'Nouveautés de la Semaine', 'Marques Officielles']
      },
      {
        title: 'Options Boutique',
        items: ['Aperçu Rapide Produit', 'Tunnel Express 1-Clic', 'Suivi Commande Direct', 'Programme Fidélité VIP', 'Mode Multi-Devises']
      }
    ],
    promoBanner: {
      title: 'Layout 2026',
      subtitle: 'Marketplace Multi-Rayons',
      badge: 'PRO EXCLUSIF',
      cta: 'Explorer'
    }
  },
  {
    id: 'mother-baby',
    name: 'Mother & Baby',
    icon: Baby,
    columns: [
      {
        title: 'Poussettes & Sorties',
        items: ['Poussettes Tout-Terrain', 'Sièges Auto Certifiés', 'Porte-Bébés Physiologiques', 'Sacs à Langer Pratiques', 'Accessoires de Voyage']
      },
      {
        title: 'Alimentation & Repas',
        items: ['Biberons Anti-Coliques', 'Chauffe-Biberons Rapides', 'Chaises Hautes Évolutives', 'Robots Cuiseurs Bébé', 'Bavoirs & Vaisselle Silicone']
      },
      {
        title: 'Chambre & Sommeil',
        items: ['Lits Parapluie & Berceaux', 'Gigoteuses 4 Saisons', 'Mobiles & Veilleuses LED', 'Matelas Ergonomiques', 'Babyphones Vidéo HD']
      }
    ],
    promoBanner: {
      title: 'Univers Naissance',
      subtitle: '-30% sur les packs confort',
      badge: 'PROMO BÉBÉ',
      cta: 'Voir les offres'
    }
  },
  {
    id: 'health-beauty',
    name: 'Health & Beauty',
    icon: Heart,
    badge: 'SALE',
    columns: [
      {
        title: 'Soins du Visage',
        items: ['Sérums Éclat & Anti-Âge', 'Crèmes Hydratantes Naturelles', 'Nettoyants Moussants Doux', 'Masques Purifiants Argile', 'Protections Solaires SPF50']
      },
      {
        title: 'Parfumerie & Senteurs',
        items: ['Eaux de Parfum Prestige', 'Brumes Parfumées Fraîches', 'Coffrets Cadeaux Senteurs', 'Huiles Essentielles Pures', 'Diffuseurs Aromathérapie']
      },
      {
        title: 'Maquillage & Ongles',
        items: ['Fonds de Teint Longue Tenue', 'Rouges à Lèvres Mat Velours', 'Palettes Yeux Professionnelles', 'Mascaras Volume Intense', 'Vernis Semi-Permanents']
      }
    ],
    promoBanner: {
      title: 'Glow Care',
      subtitle: 'Nouvelle Gamme Bio',
      badge: 'BEST SELLER',
      cta: 'Découvrir'
    }
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: Cpu,
    columns: [
      {
        title: 'Smartphones & Tablettes',
        items: ['Smartphones 5G Pro', 'Tablettes Graphiques & Bureau', 'Coques & Verres Trempés', 'Chargeurs Rapides 65W GaN', 'Câbles Renforcés Tressés']
      },
      {
        title: 'Audio & Casques',
        items: ['Casques Anti-Bruit Actif (ANC)', 'Écouteurs Sans Fil Bluetooth', 'Enceintes Nomades Étanche', 'Barres de Son Dolby Atmos', 'Microphones Podcast USB']
      },
      {
        title: 'Téléviseurs & Cinéma',
        items: ['TV 65" 4K OLED Ultra HD', 'Vidéoprojecteurs Laser Smart', 'Supports Muraux Orientables', 'Box TV Android Streaming', 'Câbles HDMI 2.1 eARC']
      }
    ],
    promoBanner: {
      title: 'Tech Arena',
      subtitle: 'Garantie 2 ans constructeur',
      badge: 'TOP MARQUES',
      cta: 'Voir le rayon'
    }
  },
  {
    id: 'home-garden',
    name: 'Home, Garden',
    icon: HomeIcon,
    columns: [
      {
        title: 'Mobilier Intérieur',
        items: ['Canapés Modulaires Velours', 'Tables Basses Design Bois', 'Chaises Ergonomiques Bureau', 'Meubles TV Minimalistes', 'Étagères Murales Industrielles']
      },
      {
        title: 'Éclairage & Décoration',
        items: ['Plafonniers LED Connectés', 'Lampes de Table Sans Fil', 'Miroirs Ronds Rétroéclairés', 'Tapis Moelleux Géométriques', 'Tableaux Toile Moderne']
      },
      {
        title: 'Jardin & Balcon',
        items: ['Salons de Jardin Résine', 'Barbecues Gaz & Charbon', 'Bains de Soleil Pliables', 'Pots & Jardinières Terrecuite', 'Systèmes d\'Arrosage Auto']
      }
    ],
    promoBanner: {
      title: 'Cocooning Home',
      subtitle: 'Sublimez vos espaces',
      badge: 'NOUVEAU',
      cta: 'Explorer'
    }
  },
  {
    id: 'kitchen-utensils',
    name: 'Kitchen Utensils',
    icon: Utensils,
    columns: [
      {
        title: 'Cuisson & Batteries',
        items: ['Batteries de Cuisine Inox', 'Poêles Antiadhésives Granit', 'Cocottes en Fonte Émaillée', 'Casseroles Induction Pro', 'Faitouts Grande Capacité']
      },
      {
        title: 'Petit Électroménager',
        items: ['Friteuses Sans Huile Air Fryer', 'Mixeurs Plongeants Turbo', 'Robots Pâtissiers Multifonction', 'Cafetières Expresso Broyeur', 'Bouilloires Thermostat Réglable']
      },
      {
        title: 'Découpe & Ustensiles',
        items: ['Sets de Couteaux Japonais', 'Planches à Découper Bambou', 'Balances Précision 0.1g', 'Bocaux de Conservation Sous Vide', 'Ustensiles Silicone Résistant']
      }
    ],
    promoBanner: {
      title: 'Chef Master',
      subtitle: 'Équipements pros chez vous',
      badge: '-25% AUJOURD\'HUI',
      cta: 'Profiter'
    }
  },
  {
    id: 'clothing-shoes',
    name: 'Clothing & Shoes',
    icon: Shirt,
    columns: [
      {
        title: 'Mode Homme',
        items: ['Chemises Coton Infroissables', 'Costumes Élégants Slim Fit', 'T-Shirts Basiques Premium', 'Jeans Denim Confort Stretch', 'Vestes & Blousons Cuir']
      },
      {
        title: 'Mode Femme',
        items: ['Robes Soirée & Cocktail', 'Tailleurs Pantalon Tendance', 'Blouses Soie & Dentelle', 'Pantalons Taille Haute', 'Manteaux Laine & Trenchs']
      },
      {
        title: 'Chaussures & Baskets',
        items: ['Sneakers Tendance Urbaines', 'Mocassins Cuir Italien', 'Escarpins Confortables 6cm', 'Boots & Bottines Cheville', 'Sandales Cuir Tressé']
      }
    ],
    promoBanner: {
      title: 'Urban Fashion',
      subtitle: 'Collection Automne/Hiver',
      badge: 'TENDANCE',
      cta: 'Shopper'
    }
  },
  {
    id: 'laptop-macbook',
    name: 'Laptop & Macbook',
    icon: Laptop,
    columns: [
      {
        title: 'PC Portables Ultra-Slim',
        items: ['Laptops Intel Core i7 / i9', 'Ultrabooks Écran OLED 120Hz', 'PC Portables Étudiants Légers', 'Ordinateurs Portables Gaming RTX', 'Batteries Longue Durée 18h']
      },
      {
        title: 'Univers Apple Mac',
        items: ['MacBook Air Puce M3', 'MacBook Pro 14" & 16" M3 Max', 'Mac Studio & Mac Mini', 'Hubs & Docks USB-C Thunderbolt', 'Chargeurs MagSafe 140W']
      },
      {
        title: 'Périphériques Bureau',
        items: ['Écrans 4K USB-C Hub Integré', 'Claviers Mécaniques Silencieux', 'Souris Ergonomiques Sans Fil', 'Casques Micro Télétravail', 'Tapis de Souris XXL Cuir']
      }
    ],
    promoBanner: {
      title: 'Workstation Pro',
      subtitle: 'Productivité maximale',
      badge: 'GAMME PRO',
      cta: 'Découvrir'
    }
  },
  {
    id: 'books-gifts',
    name: 'Books - Gifts',
    icon: BookOpen,
    columns: [
      {
        title: 'Livres & Guides',
        items: ['Business, Finance & Stratégie', 'Développement Personnel & Succès', 'Romans & Littérature Contemporaine', 'Bandes Dessinées & Mangas', 'Livres Recettes & Gastronomie']
      },
      {
        title: 'Papeterie de Luxe',
        items: ['Carnets Cuir Rechargeables', 'Stylos Plume Haute Précision', 'Agendas & Planificateurs 2026', 'Coffrets Calligraphie Encre', 'Marque-Pages Métal Gravé']
      },
      {
        title: 'Coffrets Prêts à Offrir',
        items: ['Box Bien-Être & Relaxation', 'Paniers Gourmands Terroir', 'Mugs Personnalisés Céramique', 'Bougies Parfumées Cire Végétale', 'Cartes Cadeaux Multi-Enseignes']
      }
    ],
    promoBanner: {
      title: 'Inspiration & Savoir',
      subtitle: 'Offrez le meilleur du livre',
      badge: 'CADEAU IDÉAL',
      cta: 'Feuilleter'
    }
  },
  {
    id: 'outdoors',
    name: 'Outdoors',
    icon: Compass,
    columns: [
      {
        title: 'Camping & Bivouac',
        items: ['Tentes Montage Rapide 3s', 'Duvets Grand Froid -10°C', 'Matelas Autogonflants Compacts', 'Réchauds Gaz Ultra-Légers', 'Lampes Frontales Rechargeables']
      },
      {
        title: 'Randonnée & Trekking',
        items: ['Sacs à Dos Ergonomiques 50L', 'Bâtons de Marche Carbone', 'Gourdes Isothermes Inox 1L', 'Chaussures Gore-Tex Imperméables', 'Vêtements Techniques Respirants']
      },
      {
        title: 'Mobilité & Loisirs',
        items: ['Vélos Électriques Pliants', 'Trottinettes Grande Autonomie', 'Casques Vélo Homologués LED', 'Antivols U Haute Sécurité', 'Supports Téléphone Guidon']
      }
    ],
    promoBanner: {
      title: 'Grande Aventure',
      subtitle: 'Équipez vos expéditions',
      badge: 'OUTDOOR READY',
      cta: 'Explorer'
    }
  }
];
