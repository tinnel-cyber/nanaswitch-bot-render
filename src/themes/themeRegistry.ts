import React from 'react';
import { ThemeDefinition, ThemeId } from '../types/theme';
import { ThemeDefault } from './default/ThemeDefault';
import { ThemeDigitalPro } from './digitalPro/ThemeDigitalPro';
import { ThemeElectroTech } from './electroTech/ThemeElectroTech';
import { ThemeMegaStorePro } from './megaStorePro/ThemeMegaStorePro';
import { ThemeElectroOrange } from './electroOrange/ThemeElectroOrange';
import { ThemeBeautyEmerald } from './beautyEmerald/ThemeBeautyEmerald';
import { ThemeLiveStreamPro } from './liveStreamPro/ThemeLiveStreamPro';
import { ThemeBlankCustom } from './blankCustom/ThemeBlankCustom';

export const DEFAULT_THEME_ID: ThemeId = 'theme-default';

export const AVAILABLE_THEMES: ThemeDefinition[] = [
  {
    id: 'theme-blank-custom',
    name: 'Nanasore Architect (Constructeur Libre A à Z)',
    subtitle: 'Drag & Drop Total • 15 Modules E-Commerce Exclusifs au Monde',
    description: 'Le constructeur nouvelle génération de Nanasore : partez d\'une page blanche ou d\'un des 4 Blueprints en 1 clic. Composez votre vitrine avec 15 modules ultra-rapides (Bento Hero, Rail Hits Spotify, Note Vocale WhatsApp, Négociateur Flash IA, Quiz 3 Clics, Comparateur Avant/Après, etc.).',
    badge: 'ARCHITECT OS • 15 MODULES',
    version: '2.0.0',
    previewMockup: 'blank-custom',
    features: [
      'Arborescence fluide en Glisser-Déposer (Drag & Drop natif HTML5)',
      '8 Modules Fondamentaux E-Commerce Réinventés (Bento Hero, Spotify Shelf...)',
      '7 Exclusivités Mondiales Nanasore (Note Vocale, Négociateur IA, Box sur-mesure...)',
      '4 Blueprints pré-assemblés en 1 clic & Déclenchement 0ms du Tunnel 12 Blocs'
    ],
    isAvailable: true,
    component: ThemeBlankCustom
  },
  {
    id: 'theme-livestream-pro',
    name: 'Studio Live & Webinaire Pro',
    subtitle: 'Ventes Flash en Direct, Multistreaming Réseaux Sociaux & Masterclass',
    description: 'Conçu pour la Vente Flash en Direct (Live Shopping), le Multistreaming sur les réseaux sociaux et les Webinaires Haut de Gamme. Hybride ultra-moderne entre Apple Keynote, Twitch et TikTok Shop. Design System Cinema Dark & Glassmorphism, Scène Live 70/30, Mini-Player PiP au scroll, Drop Zone Ventes Flash, Fiche Produit High-Ticket avec Stack de Valeur et Tunnel Dépliable 1-clic sans interruption vidéo.',
    badge: 'NOUVEAU • LIVE COMMERCE',
    version: '1.0.0',
    previewMockup: 'livestream-pro',
    features: [
      'Design System "Cinema Dark & Glassmorphism" (#090A0F & Verre Dépoli)',
      'Header Broadcast 75px avec badge animé pulsant ● LIVE STUDIO',
      'Indicateurs Multistreaming (Facebook, TikTok, YouTube, Instagram) & 1,420 spectateurs',
      'Scène Live 70/30 avec HUD Offre Épinglée & Activation Sonore 1-clic',
      'Chat en Direct avec Preuves Sociales Dorées, Réactions CSS & Tunnel Dépliable sans coupure',
      'Mini-Player Picture-in-Picture flottant au scroll & sticky mobile avec continuité vidéo 100%',
      'Drop Zone Ventes Flash avec Barre d\'urgence & Chrono HEURES : MINS : SECS',
      'Fiche Produit High-Ticket avec Stack de Valeur décomposée & Support WhatsApp direct',
      'Sessions Masterclass & Replays VIP (Intervenants, 3 Clés & Accès Tunnel direct)'
    ],
    isAvailable: true,
    component: ThemeLiveStreamPro
  },
  {
    id: 'theme-beauty-emerald',
    name: 'Émeraude Prestige (Beauté & Soins)',
    subtitle: 'Cosmétiques, Skincare & Parfumerie Haute Couture',
    description: 'Conçu pour les boutiques de Cosmétiques, Soins de la peau (Skincare), Parfumerie et Santé/Bien-être. Direction artistique exclusive "Émeraude Botanique & Or Champagne", trio typographique Bodoni Moda, Syne et Outfit, Header à micro-badges, Fiche Produit avec Loupe Zoom & Boosters, Avis Immersifs et Footer Marbre Noir & Or.',
    badge: 'Nouveau',
    version: '1.0.0',
    previewMockup: 'beauty-emerald',
    features: [
      'Palette Signature Vert Émeraude Impérial (#0F4C3A) & Or Champagne (#C59B27)',
      'Trio Typographique Haute Couture (Bodoni Moda 600, Syne 800, Outfit)',
      'Header 85px à micro-badges flottants [NEW], [SALE], [HOT]',
      'Fiche Produit (PDP) Loupe Zoom, Jauge d\'Urgence & 3 Boosters de Vente',
      'Carrousel d\'Avis Immersifs 50/50, Live Sales Popup & Footer Marbre Noir'
    ],
    isAvailable: true,
    component: ThemeBeautyEmerald
  },
  {
    id: 'theme-electro-orange',
    name: 'Electro Orange & Blanc',
    subtitle: 'High-Tech, Électronique & Électroménager',
    description: 'Inspiré de l\'architecture mondiale "Electro", revisité en Orange Vif (#FF6A00) & Blanc. Header 3 niveaux adaptatif (barre centrale orange sur pages internes), Mega-Menu 270px, Fiche Produit PDP complète avec Pack Bundle Accessoires, Page Catalogue avec filtres latéraux et Footer multi-niveaux.',
    badge: 'Nouveau',
    version: '1.2.0',
    previewMockup: 'electro-orange',
    features: [
      'Header adaptatif (Orange #FF6A00 sur PDP & Catalogue)',
      'Fiche Produit (PDP) 2 colonnes avec sélecteur de variantes & tunnel direct',
      'Vente groupée "Bundle Accessoires" avec recalcul dynamique du total',
      'Page Catalogue avec filtres latéraux 270px & carrousel Recommandés',
      'Footer complet avec marques grayscale, mini-listes & bandeau newsletter'
    ],
    isAvailable: true,
    component: ThemeElectroOrange
  },
  {
    id: 'theme-default',
    name: 'Standard Élite',
    subtitle: 'Vitrine Complète & Rayons Défilants',
    description: 'La structure standard tout-en-un avec carrousel héroïque, bandeau d\'annonces défilant (ticker), rayon nouveautés sous le pouce et grille produits multi-colonnes responsive.',
    badge: 'Standard',
    version: '1.0.0',
    previewMockup: 'default',
    features: [
      'Carrousel d\'affiches héroïques (Snap-X)',
      'Bandeau d\'urgence & paiement défilant',
      'Rayon Nouveautés sous le pouce (double rangée)',
      'Grille adaptative 2 à 4 colonnes',
      'Cartes de réassurance & preuves de confiance'
    ],
    isAvailable: true,
    component: ThemeDefault
  },
  {
    id: 'theme-mega-store-pro',
    name: 'Mega-Store Pro',
    subtitle: 'Marketplace Haute Densité (Amazon / Shopify)',
    description: 'Structure retail haute densité pour gros catalogues. Header 3 niveaux avec barre de recherche géante et menu déroulant de catégories intégré, navigation verticale avec Mega-Menu déroulant et Hero asymétrique 70/30.',
    badge: 'Nouveau',
    version: '1.0.0',
    previewMockup: 'mega-store-pro',
    features: [
      'Header à 3 niveaux (Top Bar, Search géante, Menu)',
      'Recherche avec sélecteur de catégorie interne',
      'Navigation latérale verticale avec Mega-Menu déroulant',
      'Hero asymétrique 70/30 avec bannières empilées',
      'Design System retail à bordures fines 1px'
    ],
    isAvailable: true,
    component: ThemeMegaStorePro
  },
  {
    id: 'theme-electro-tech',
    name: 'Premium Électronique Tech',
    subtitle: 'High-Tech, Gaming & Équipements',
    description: 'Design System contraint anti-erreur (style Apple/Samsung). Cartes ratio 4:3 avec fond #F9F9FB, badges orange pastel superposés, Hero 50/50 avec visuel 3D et fiche produit PDP complète.',
    badge: 'Nouveau',
    version: '1.0.0',
    previewMockup: 'electro-tech',
    features: [
      'Design System Anti-Erreur (format 4:3 & object-fit contain)',
      'Hero Header 50/50 avec dégradé radial et recherche',
      'Badges orange pastel superposés (Livraison 24h, Garantie)',
      'Fiche produit PDP avec galerie multi-angles et onglets',
      'Barre de réassurance universelle (Mobile Money & SAV)'
    ],
    isAvailable: true,
    component: ThemeElectroTech
  },
  {
    id: 'theme-digital-pro',
    name: 'Premium Digital Pro',
    subtitle: 'E-learning, E-books & Logiciels',
    description: 'Design System contraint anti-erreur (style Apple/Stripe). Cartes carrées 1:1 (format Facebook/Instagram Ads 1080x1080), titres bridés à 2 lignes, Hero 50/50 et tunnel de conversion 60/40 sans friction.',
    badge: 'Recommandé',
    version: '1.0.0',
    previewMockup: 'digital-pro',
    features: [
      'Design System Anti-Erreur (format carré 1:1 Facebook Ads)',
      'Hero Header 50/50 avec dégradé radial et recherche',
      'Cartes indestructibles avec visuel dominant à 60%',
      'Tunnel de vente 60/40 sans friction & achat Sebpay',
      'Barre de réassurance universelle (Mobile Money & WhatsApp)'
    ],
    isAvailable: true,
    component: ThemeDigitalPro
  },
  {
    id: 'theme-minimal',
    name: 'Minimaliste Studio',
    subtitle: 'Écrin Épuré & Focus Typographique',
    description: 'Une esthétique pure et aérée inspirée des boutiques de mode et de créateurs. Visuels grand format, espacements généreux et tunnel d\'achat direct sans friction.',
    badge: 'Prochainement',
    version: '1.0.0',
    previewMockup: 'minimal',
    features: [
      'Hero plein écran immersif avec typographie fine',
      'Grille épurée ultra-aérée avec focus visuel',
      'Fiches produits épurées avec ajout direct',
      'Navigation minimaliste fluide'
    ],
    isAvailable: true,
    // Prêt pour accueillir <ThemeMinimal /> dès les instructions du vendeur
    component: ThemeDefault
  },
  {
    id: 'theme-grid',
    name: 'Catalogue Grand Angle',
    subtitle: 'Grille Immersive Haute Densité',
    description: 'Inspiré des plus grandes marketplaces internationales (Shopify, ASOS, Zara). Navigation fluide à facettes, fiches produits maximisées et filtres instantanés.',
    badge: 'Nouveau',
    version: '1.0.0',
    previewMockup: 'grid',
    features: [
      'Affichage haute densité pour catalogues volumineux',
      'Barre de filtres latérale et facettes rapides',
      'Badges promotionnels visuels impactants',
      'Aperçu rapide interactif'
    ],
    isAvailable: true,
    // Prêt pour accueillir <ThemeGrid /> dès les instructions du vendeur
    component: ThemeDefault
  }
];

export const normalizeThemeId = (themeId?: string | null): ThemeId => {
  if (!themeId) return DEFAULT_THEME_ID;
  const clean = themeId.trim().toLowerCase();

  const ALIAS_MAP: Record<string, ThemeId> = {
    'theme-blank-custom': 'theme-blank-custom',
    'blank-custom': 'theme-blank-custom',
    'blank': 'theme-blank-custom',
    'architect': 'theme-blank-custom',
    'theme-architect': 'theme-blank-custom',

    'theme-livestream-pro': 'theme-livestream-pro',
    'livestream-pro': 'theme-livestream-pro',
    'livestream': 'theme-livestream-pro',
    'live': 'theme-livestream-pro',

    'theme-beauty-emerald': 'theme-beauty-emerald',
    'beauty-emerald': 'theme-beauty-emerald',
    'beauty': 'theme-beauty-emerald',
    'emeraude': 'theme-beauty-emerald',

    'theme-electro-orange': 'theme-electro-orange',
    'electro-orange': 'theme-electro-orange',
    'orange': 'theme-electro-orange',

    'theme-mega-store-pro': 'theme-mega-store-pro',
    'theme-megastore-pro': 'theme-mega-store-pro',
    'mega-store-pro': 'theme-mega-store-pro',
    'megastore-pro': 'theme-mega-store-pro',
    'mega-store': 'theme-mega-store-pro',
    'megastore': 'theme-mega-store-pro',

    'theme-electro-tech': 'theme-electro-tech',
    'electro-tech': 'theme-electro-tech',
    'tech': 'theme-electro-tech',

    'theme-digital-pro': 'theme-digital-pro',
    'digital-pro': 'theme-digital-pro',
    'digital': 'theme-digital-pro',

    'theme-default': 'theme-default',
    'theme-standard-elite': 'theme-default',
    'standard-elite': 'theme-default',
    'default': 'theme-default',
    'standard': 'theme-default',

    'theme-minimal': 'theme-minimal',
    'minimal': 'theme-minimal',

    'theme-grid': 'theme-grid',
    'grid': 'theme-grid'
  };

  if (ALIAS_MAP[clean]) return ALIAS_MAP[clean];
  const found = AVAILABLE_THEMES.find(t => t.id.toLowerCase() === clean);
  if (found) return found.id;
  return DEFAULT_THEME_ID;
};

export const isValidTheme = (themeId?: string | null): boolean => {
  if (!themeId) return false;
  const normalized = normalizeThemeId(themeId);
  return AVAILABLE_THEMES.some(t => t.id === normalized);
};

export const getThemeDefinition = (themeId?: string): ThemeDefinition => {
  const normalizedId = normalizeThemeId(themeId);
  const found = AVAILABLE_THEMES.find(t => t.id === normalizedId);
  if (found) return found;
  const def = AVAILABLE_THEMES.find(t => t.id === DEFAULT_THEME_ID);
  return def || AVAILABLE_THEMES[0];
};

/**
 * Cartographie des licences contextuelles pour les thèmes Nanasore
 */
export const THEMES_BY_PRICING_MODEL = {
  pay_per_use: ['theme-default', 'theme-electro-tech'],
  free: ['theme-default', 'theme-electro-tech'],
  commission: ['theme-digital-pro', 'theme-livestream-pro'],
  subscription_training: ['theme-digital-pro', 'theme-livestream-pro'],
  subscription_caisse_vitrine: [
    'theme-default',
    'theme-electro-tech',
    'theme-electro-orange',
    'theme-beauty-emerald',
    'theme-mega-store-pro',
    'theme-blank-custom',
    'theme-livestream-pro'
  ],
  subscription_all: [
    'theme-default',
    'theme-digital-pro',
    'theme-livestream-pro',
    'theme-electro-tech',
    'theme-electro-orange',
    'theme-beauty-emerald',
    'theme-mega-store-pro',
    'theme-blank-custom'
  ]
} as const;

export const isThemeAllowedByLicense = (
  themeId: string,
  enabledThemes?: string[] | null
): boolean => {
  const normalized = normalizeThemeId(themeId);
  if (!enabledThemes || enabledThemes.length === 0) {
    return normalized === 'theme-default';
  }
  return enabledThemes.includes(normalized);
};


