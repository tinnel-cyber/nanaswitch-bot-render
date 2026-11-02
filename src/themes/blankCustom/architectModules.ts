import { 
  CustomSectionType, 
  CustomSectionInstance, 
  HeaderStyleType, 
  FooterStyleType 
} from '../../types';

// Définition exhaustive des 15 Modules (8 Fondamentaux + 7 Exclusivités Mondiales)
export interface ModuleDefinition {
  type: CustomSectionType;
  category: 'fundamental' | 'nanasore_original';
  title: string;
  badge: string;
  icon: string;
  desc: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  defaultSettings: Record<string, any>;
}

// Définition des 6 En-Têtes Premium Nanasore
export const HEADER_STYLES_LIST: { id: HeaderStyleType; title: string; badge: string; icon: string; desc: string }[] = [
  { id: 'mega_hub_marketplace', title: '🏪 Mega-Hub Marketplace', badge: 'Marketplace Pro', icon: '🏪', desc: 'Style You&Me Shop : Ruban défilant, Sélecteur de ville, Hotline WhatsApp & Mega-menu' },
  { id: 'editorial_glowing_luxe', title: '💎 Editorial Glowing Luxe', badge: 'Beauté & Santé', icon: '💎', desc: 'Design épuré haut de gamme, navigation centrée, loupe et univers cosmétique' },
  { id: 'stories_rings_viral', title: '📱 Stories Rings Viral', badge: 'TikTok & Insta', icon: '📱', desc: 'Pastilles et anneaux de stories cliquables animés façon réseaux sociaux' },
  { id: 'dynamic_island_glass', title: '🍏 Dynamic Island Glass', badge: 'Apple Minimal', icon: '🍏', desc: 'Pilule flottante ultra-moderne, effet verre dépoli et transitions fluides' },
  { id: 'live_radar_vocal', title: '🎙️ Live Radar & Note Vocale', badge: 'Direct & Vocal', icon: '🎙️', desc: 'Pulsation radar en direct et déclencheur audio instantané' },
  { id: 'smart_reward_bar', title: '🎁 Smart Reward Bar', badge: 'Conversion Pure', icon: '🎁', desc: 'Jauge de cadeaux et paliers de livraison offerte pour maximiser le panier moyen' },
];

// Définition des 3 Footers Premium Nanasore
export const FOOTER_STYLES_LIST: { id: FooterStyleType; title: string; badge: string; icon: string; desc: string }[] = [
  { id: 'bento_map_trust_footer', title: '🗺️ Bento Map & Trust Hub', badge: 'Apple / Linear', icon: '🗺️', desc: 'Architecture en cartes Bento, E-mailing VIP Bleu & Blanc, Mini-Map interactive avec zoom et réassurance' },
  { id: 'editorial_prestige_footer', title: '🏛️ Éditorial Prestige & Brand Story', badge: 'Luxe & Storytelling', icon: '🏛️', desc: 'Pied de page éditorial épuré, histoire du fondateur, signatures et garanties d\'authenticité' },
  { id: 'conversion_command_footer', title: '⚡ Conversion Command & Fast Dock', badge: 'Ultra-Conversion', icon: '⚡', desc: 'Dock flottant de conversion, commande en 1 clic, réassurance express et assistance WhatsApp' },
];

export const ARCHITECT_MODULES: ModuleDefinition[] = [
  // 1. Les 8 Modules Fondamentaux E-Commerce Réinventés (Partie 5B)
  {
    type: 'bento_hero',
    category: 'fundamental',
    title: 'Bento Grid Hero (Apple Style)',
    badge: 'ACCUEIL • CONVERSION',
    icon: '🍱',
    desc: 'Grand bloc asymétrique bento avec produit phare dominant, micro-badges réactifs et CTA direct vers le tunnel à 12 blocs.',
    defaultTitle: 'La Révolution de Votre Quotidien',
    defaultSubtitle: 'ÉDITION LIMITÉE • DISPONIBLE EN 24H',
    defaultSettings: {
      layout: 'bento_asymmetric',
      ctaText: 'Commander maintenant',
      priceHighlight: 'À partir de 15 000 FCFA'
    }
  },
  {
    type: 'spotify_shelf',
    category: 'fundamental',
    title: 'Rail Produits "Hits Spotify"',
    badge: 'PLAYLIST SOUS LE POUCE',
    icon: '🎧',
    desc: 'Carrousel horizontal ultra-fluide façon playlist musicale avec défilement tactile fluide et boutons de commande rapide.',
    defaultTitle: '🎧 Les Hits de la Semaine',
    defaultSubtitle: 'Nos meilleures ventes sous le pouce façon playlist Spotify',
    defaultSettings: {
      category: 'Tous les produits',
      showPlayPill: true
    }
  },
  {
    type: 'smart_masonry_grid',
    category: 'fundamental',
    title: 'Grille Catalogue Intelligente',
    badge: 'CATALOGUE FLUIDE',
    icon: '📦',
    desc: 'Grille 2, 3 ou 4 colonnes auto-adaptative avec barre de recherche instantanée et filtres par catégories sans rechargement.',
    defaultTitle: '📦 Tout Notre Catalogue',
    defaultSubtitle: 'Parcourez l\'ensemble de nos pépites et commandez en 1 clic',
    defaultSettings: {
      columns: 3,
      showSearch: true,
      showCategories: true
    }
  },
  {
    type: 'glowing_cosmetics_grid',
    category: 'fundamental',
    title: '🌿 Grille Cosmétique & Santé (Vue Large Glowing)',
    badge: 'SANTÉ & BEAUTÉ',
    icon: '🌿',
    desc: 'Grille 4 colonnes épurée style Shopify Glowing avec permutation d\'image au survol, 4 boutons ronds flottants avec tooltips et grande vue produit.',
    defaultTitle: 'Our Featured Products',
    defaultSubtitle: 'Get the skin you want to feel',
    defaultSettings: {
      columns: 4,
      showBadges: true,
      category: 'Tous les produits',
      showColorSwatches: true
    }
  },
  {
    type: 'digital_square_grid',
    category: 'fundamental',
    title: '🎓 Grille Produits Numériques, Formations & Webinaires (1080×1080 + Vue Vidéo)',
    badge: 'DIGITAL & FORMATIONS',
    icon: '🎓',
    desc: 'Affiches carrées 1080×1080, badge bleu & blanc, aperçu vidéo, double carrousel infini et grande vue arrière avec compte à rebours et lecteur vidéo immersif.',
    defaultTitle: 'Nos Formations & Programmes Exclusifs',
    defaultSubtitle: 'Accédez instantanément à nos masterclasses, lives et e-books certifiés',
    defaultSettings: {
      columns: 3,
      countdownHours: 24,
      countdownTitle: '⏳ Offre & Accès Prioritaire expirent dans :',
      enableCounterCarousel: true,
      carouselRowsCount: 2,
      carouselSpeed: 'normal'
    }
  },
  {
    type: 'omni_live_studio',
    category: 'fundamental',
    title: '🔴 Studio Live Multi-Streaming, Webinaire, Quiz, Devoir PDF & Coaching 1-to-1',
    badge: 'LIVE OS & CLASSE',
    icon: '🔴',
    desc: 'Lecteur Caméléon (16:9 / 9:16 / 1:1), WebRTC ou YouTube/FB/TikTok, Chat élèves, Quiz en direct, devoirs & PDF et Coaching 1-to-1.',
    defaultTitle: '🔴 Session en Direct : Live Shopping & Masterclass',
    defaultSubtitle: 'Suivez le direct et profitez des offres exclusives en temps réel sans interruption',
    defaultSettings: {
      sessionMode: 'live_shopping',
      aspectRatio: '16:9',
      streamUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      countdownTitle: '⏳ Tarif Flash du Direct garanti pendant :'
    }
  },
  {
    type: 'flash_deal_vault',
    category: 'fundamental',
    title: 'Coffre-Fort Offre Flash & Chrono',
    badge: 'URGENCE & CHRONO',
    icon: '⚡',
    desc: 'Met en vedette 1 produit avec un compte à rebours dynamique en direct, une jauge de stock brûlante et 3 arguments de réassurance.',
    defaultTitle: '⚡ Vente Flash Exclusive du Jour',
    defaultSubtitle: 'Stock ultra-limité : Tarif garanti jusqu\'à épuisement',
    defaultSettings: {
      countdownHours: 12,
      stockLeft: 7
    }
  },
  {
    type: 'video_story_carousel',
    category: 'fundamental',
    title: 'Carrousel Vidéos Reels / TikTok',
    badge: 'FORMAT 9:16 UGC',
    icon: '🎬',
    desc: '3 vidéos verticales immersives avec lecture automatique et bouton d\'achat instantané directement sous la vidéo.',
    defaultTitle: '🎬 Démonstrations & Routines Vidéo',
    defaultSubtitle: 'Regardez nos produits en action avant de passer commande',
    defaultSettings: {
      mode: 'vertical_trio'
    }
  },
  {
    type: 'parallax_brand_story',
    category: 'fundamental',
    title: 'Histoire de Marque & Chiffres Clés',
    badge: 'BRAND STORY',
    icon: '📖',
    desc: 'Racontez l\'origine de votre boutique, valorisez votre savoir-faire et affichez vos chiffres de satisfaction client.',
    defaultTitle: 'Notre Histoire & Nos Valeurs',
    defaultSubtitle: 'L\'AUTHENTICITÉ & LA PASSION DU SERVICE',
    defaultSettings: {
      imagePosition: 'right'
    }
  },
  {
    type: 'interactive_trust_bar',
    category: 'fundamental',
    title: 'Barre de Réassurance 4 Piliers',
    badge: 'GARANTIES CLIENTES',
    icon: '🛡️',
    desc: 'Les 4 piliers indispensables pour rassurer l\'acheteur : Livraison 24h, Paiement Mobile Money à la réception, WhatsApp 24/7 et Garantie.',
    defaultTitle: 'Pourquoi Commander Chez Nous ?',
    defaultSubtitle: 'Votre satisfaction garantie à 100%',
    defaultSettings: {}
  },
  {
    type: 'smart_faq_concierge',
    category: 'fundamental',
    title: 'FAQ Concierge Interactive',
    badge: 'LEVÉE DES FREINS',
    icon: '❓',
    desc: '4 à 5 questions/réponses dépliables pour lever les dernières objections avant même l\'ouverture du tunnel.',
    defaultTitle: 'Questions Fréquentes',
    defaultSubtitle: 'Tout ce que vous devez savoir avant de passer commande',
    defaultSettings: {}
  },

  // 2. Les 7 Modules Exclusifs au Monde "Nanasore Originals" (Partie 5C)
  {
    type: 'voice_note_pitch',
    category: 'nanasore_original',
    title: 'Note Vocale Vendeur (Style WhatsApp)',
    badge: 'EXCLUSIVITÉ MONDIALE',
    icon: '🎙️',
    desc: 'Un lecteur de message vocal authentique avec onde sonore pulsante pour créer un lien humain ultra-puissant et rassurer en 15 secondes.',
    defaultTitle: '🎙️ Écoutez le message personnel du fondateur',
    defaultSubtitle: 'Une minute pour tout vous expliquer en toute transparence',
    defaultSettings: {
      durationSeconds: 38,
      audioUrl: ''
    }
  },
  {
    type: 'interactive_bundle_lab',
    category: 'nanasore_original',
    title: 'Laboratoire de Packs & Cross-Sell',
    badge: 'BOOSTER PANIER MOYEN',
    icon: '🧪',
    desc: 'Calculateur interactif où le client coche 2 ou 3 articles et voit sa remise immédiate grimper en temps réel.',
    defaultTitle: '🧪 Composez Votre Pack & Économisez',
    defaultSubtitle: 'Cochez 2 articles pour -10%, 3 articles pour -20% immédiats',
    defaultSettings: {
      discountTier1: 10,
      discountTier2: 20
    }
  },
  {
    type: 'live_haggle_offer',
    category: 'nanasore_original',
    title: 'Négociateur Éclair IA / Flash',
    badge: 'CONVERSION IMMÉDIATE',
    icon: '🤝',
    desc: 'Un bouton interactif permettant au client de faire une proposition de prix acceptée automatiquement selon vos marges configurées.',
    defaultTitle: '🤝 Négocier une Offre Spéciale en Direct',
    defaultSubtitle: 'Entrez votre code postal ou faites une offre pour débloquer un cadeau',
    defaultSettings: {
      minDiscount: 5,
      maxDiscount: 15
    }
  },
  {
    type: 'product_finder_quiz',
    category: 'nanasore_original',
    title: 'Quiz Diagnostic Express en 3 Clics',
    badge: 'RECOMMANDATION SUR-MESURE',
    icon: '🎯',
    desc: 'Un questionnaire visuel interactif en 3 étapes qui oriente automatiquement le visiteur vers le produit idéal pour lui.',
    defaultTitle: '🎯 Quel Produit Est Fait Pour Vous ?',
    defaultSubtitle: 'Répondez à 3 questions rapides pour trouver la formule parfaite',
    defaultSettings: {
      stepCount: 3
    }
  },
  {
    type: 'before_after_slider',
    category: 'nanasore_original',
    title: 'Curseur Visuel Avant / Après',
    badge: 'PREUVE VISUELLE',
    icon: '💎',
    desc: 'Un comparateur interactif à glissière montrant la transformation ou l\'efficacité du produit avec une précision chirurgicale.',
    defaultTitle: 'Les Résultats en Images',
    defaultSubtitle: 'Faites glisser le curseur pour observer la transformation',
    defaultSettings: {
      beforeLabel: 'Avant utilisation',
      afterLabel: 'Après 14 jours'
    }
  },
  {
    type: 'social_wall_whatsapp',
    category: 'nanasore_original',
    title: 'Mur de Preuves Sociales WhatsApp',
    badge: 'CONFIANCE AFRICAINE',
    icon: '💬',
    desc: 'Affichage authentique de captures d\'écran de retours clients WhatsApp et avis vérifiés avec pastilles vertes.',
    defaultTitle: '💬 Ce Que Disent Nos Clients sur WhatsApp',
    defaultSubtitle: 'Des centaines de messages reçus chaque semaine partout en Afrique de l\'Ouest',
    defaultSettings: {
      displayCount: 6
    }
  },
  {
    type: 'vip_mystery_scratch',
    category: 'nanasore_original',
    title: 'Carte à Gratter VIP & Cadeau Surprise',
    badge: 'GAMIFICATION VIRALE',
    icon: '🎟️',
    desc: 'Une carte virtuelle à gratter avec le doigt ou la souris qui débloque une remise secrète ou un cadeau pour commander immédiatement.',
    defaultTitle: '🎟️ Grattez Votre Cadeau Mystère',
    defaultSubtitle: 'Passez votre doigt pour révéler votre surprise du jour',
    defaultSettings: {
      rewardText: '🎁 Livraison Express Offerte aujourd\'hui !'
    }
  }
];

// Template recommandé de départ en 1 clic
export const ARCHITECT_RECOMMENDED_SECTIONS: CustomSectionInstance[] = [
  {
    id: 'sec_bento_hero_default',
    type: 'bento_hero',
    title: 'La Révolution de Votre Quotidien',
    subtitle: 'ÉDITION LIMITÉE • DISPONIBLE EN 24H',
    visible: true,
    spacingTop: 'md',
    spacingBottom: 'md',
    backgroundStyle: 'default',
    settings: {
      ctaText: 'Commander maintenant',
      priceHighlight: 'À partir de 15.000 FCFA'
    }
  },
  {
    id: 'sec_spotify_shelf_default',
    type: 'spotify_shelf',
    title: '🎧 Les Hits de la Semaine',
    subtitle: 'Nos meilleures ventes sous le pouce façon playlist Spotify',
    visible: true,
    spacingTop: 'md',
    spacingBottom: 'md',
    backgroundStyle: 'default',
    settings: {
      category: 'Tous les produits'
    }
  },
  {
    id: 'sec_flash_deal_default',
    type: 'flash_deal_vault',
    title: '⚡ Vente Flash Exclusive du Jour',
    subtitle: 'Stock ultra-limité : Tarif garanti jusqu\'à épuisement',
    visible: true,
    spacingTop: 'md',
    spacingBottom: 'md',
    backgroundStyle: 'surface',
    settings: {
      countdownHours: 12,
      stockLeft: 7
    }
  },
  {
    id: 'sec_grid_default',
    type: 'smart_masonry_grid',
    title: '📦 Tout Notre Catalogue',
    subtitle: 'Parcourez l\'ensemble de nos pépites et commandez en 1 clic',
    visible: true,
    spacingTop: 'md',
    spacingBottom: 'md',
    backgroundStyle: 'default',
    settings: {
      columns: 3,
      showSearch: true,
      showCategories: true
    }
  },
  {
    id: 'sec_trust_default',
    type: 'interactive_trust_bar',
    title: 'Pourquoi Commander Chez Nous ?',
    subtitle: 'Votre satisfaction garantie à 100%',
    visible: true,
    spacingTop: 'md',
    spacingBottom: 'md',
    backgroundStyle: 'surface',
    settings: {}
  },
  {
    id: 'sec_faq_default',
    type: 'smart_faq_concierge',
    title: 'Questions Fréquentes',
    subtitle: 'Tout ce que vous devez savoir avant de passer commande',
    visible: true,
    spacingTop: 'md',
    spacingBottom: 'md',
    backgroundStyle: 'default',
    settings: {}
  }
];

export const RECOMMENDED_DEFAULT_SECTIONS = ARCHITECT_RECOMMENDED_SECTIONS;
