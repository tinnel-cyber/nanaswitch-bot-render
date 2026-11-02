import { CustomSectionInstance, CustomThemeMoodPreset, HeaderStyleType, FooterStyleType } from '../../types';
import { THEME_MOOD_PRESETS } from './moodStyles';

export interface ArchitectBlueprint {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  icon: string;
  moodPreset: CustomThemeMoodPreset;
  headerStyle?: HeaderStyleType;
  footerStyle?: FooterStyleType;
  sections: CustomSectionInstance[];
}

export const ARCHITECT_BLUEPRINTS: ArchitectBlueprint[] = [
  // 1. Machine à Cash Viral (Wameet / Ads)
  {
    id: 'blueprint-viral-cash',
    name: 'Machine à Cash Viral (Wameet / Ads)',
    subtitle: 'Optimisé pour les campagnes Ads avec paiement à la livraison (COD)',
    badge: 'VIRAL & COD',
    icon: '⚡',
    moodPreset: 'nanasore-royal',
    headerStyle: 'stories_rings_viral',
    sections: [
      {
        id: 'sec_viral_bento',
        type: 'bento_hero',
        title: "L'Offre Irrésistible du Moment",
        subtitle: 'ÉDITION LIMITÉE • VU SUR WAMEET',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          layout: 'bento_3_cards',
          ctaText: 'Commander maintenant',
          priceHighlight: 'À partir de 15 000 FCFA'
        }
      },
      {
        id: 'sec_viral_voice',
        type: 'voice_note_pitch',
        title: '🎙️ Écoutez Pourquoi Ce Produit Fait le Buzz',
        subtitle: 'MESSAGE PERSONNEL DU FONDATEUR',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'surface',
        settings: {
          durationLabel: '0:35',
          founderName: 'Mamadou K. • Fondateur'
        }
      },
      {
        id: 'sec_viral_haggle',
        type: 'live_haggle_offer',
        title: '🤝 Négociez Votre Offre Exclusive en Direct',
        subtitle: 'NÉGOCIATEUR FLASH IA • ACCORD IMMÉDIAT',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          floorDiscountPercent: 15,
          timerMinutes: 10
        }
      },
      {
        id: 'sec_viral_video',
        type: 'video_story_carousel',
        title: '🎬 Démonstrations & Preuves en Vidéo',
        subtitle: 'REGARDEZ NOS PRODUITS EN ACTION AVANT DE COMMANDER',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'surface',
        settings: {}
      },
      {
        id: 'sec_viral_social',
        type: 'social_wall_wameet',
        title: '💬 Retours Wameet de Nos Vrais Clients',
        subtitle: 'AVIS VÉRIFIÉS DE CLIENTS LIVRÉS PARTOUT EN CÔTE D\'IVOIRE',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {}
      },
      {
        id: 'sec_viral_grid',
        type: 'smart_masonry_grid',
        title: '📦 Tout Notre Catalogue Viral',
        subtitle: 'PARCOUREZ L\'ENSEMBLE DE NOS PÉPITES ET COMMANDEZ EN 1 CLIC',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          columns: 3,
          showSearch: true,
          showCategories: true,
          cardStyle: 'bordered'
        }
      }
    ]
  },

  // 2. Spotify Curated Store
  {
    id: 'blueprint-spotify-curated',
    name: 'Spotify Curated Store',
    subtitle: 'Ambiance dark épurée avec rayons audio et gamification immersive',
    badge: 'PLAYLIST OBSIDIAN',
    icon: '🎧',
    moodPreset: 'spotify-obsidian',
    headerStyle: 'dynamic_island_glass',
    sections: [
      {
        id: 'sec_spotify_hero',
        type: 'bento_hero',
        title: 'La Playlist de Vos Envies',
        subtitle: 'SÉLECTION OFFICIELLE SPOTIFY STYLE',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          layout: 'split_cinema',
          ctaText: 'Explorer les hits',
          priceHighlight: 'Tarif garanti 24h'
        }
      },
      {
        id: 'sec_spotify_shelf',
        type: 'spotify_shelf',
        title: '🎧 Les Hits de la Semaine',
        subtitle: 'Nos meilleures ventes sous le pouce façon playlist musicale',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          category: 'Tous les produits'
        }
      },
      {
        id: 'sec_spotify_bundle',
        type: 'interactive_bundle_lab',
        title: '🧪 Composez Votre Box Sur-Mesure',
        subtitle: 'Jusqu\'à -20% de remise progressive + Cadeau VIP offert',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'surface',
        settings: {
          discountTier2: 10,
          discountTier3: 20
        }
      },
      {
        id: 'sec_spotify_scratch',
        type: 'vip_mystery_scratch',
        title: '🎰 Tentez Votre Chance : Coffre Mystère VIP',
        subtitle: 'TIRAGE PRIVILÈGE DU JOUR • 100% GAGNANT',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          discountPercent: 15
        }
      },
      {
        id: 'sec_spotify_grid',
        type: 'smart_masonry_grid',
        title: '📦 Tous les Albums & Collections',
        subtitle: 'Explorez l\'intégralité des références disponibles en stock',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          columns: 3,
          cardStyle: 'glass',
          showSearch: true
        }
      }
    ]
  },

  // 3. Prestige & Rituel (Beauté / Santé)
  {
    id: 'blueprint-beauty-prestige',
    name: 'Prestige & Rituel (Beauté / Santé)',
    subtitle: 'Diagnostic de peau intelligent, transformation avant/après et rassurance',
    badge: 'ÉLÉGANCE BOTANIQUE',
    icon: '🌿',
    moodPreset: 'emerald-botanic',
    headerStyle: 'editorial_glowing_luxe',
    footerStyle: 'editorial_prestige_footer',
    sections: [
      {
        id: 'sec_beauty_hero',
        type: 'bento_hero',
        title: 'Le Rituel de Soin Quotidien Parfait',
        subtitle: 'ACTIFS NATURELS BIO • RÉSULTATS VISIBLES',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          layout: 'center_minimal',
          ctaText: 'Commencer mon rituel',
          priceHighlight: 'Livraison offerte dès 15 000 F'
        }
      },
      {
        id: 'sec_beauty_quiz',
        type: 'product_finder_quiz',
        title: '🎯 Diagnostic Express : Quel Soin Pour Votre Peau ?',
        subtitle: 'RECOMMANDATION SUR-MESURE EN 3 CLICS',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'surface',
        settings: {}
      },
      {
        id: 'sec_beauty_slider',
        type: 'before_after_slider',
        title: 'Les Résultats Visibles : Avant vs Après',
        subtitle: 'GLISSEZ LE CURSEUR POUR OBSERVER LA TRANSFORMATION',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          beforeLabel: 'AVANT',
          afterLabel: 'APRÈS 14 JOURS'
        }
      },
      {
        id: 'sec_beauty_video',
        type: 'video_story_carousel',
        title: '🎬 Routines & Conseils d\'Application',
        subtitle: 'TUTORIELS D\'UTILISATION PAR NOS EXPERTS EN BEAUTÉ',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'surface',
        settings: {}
      },
      {
        id: 'sec_beauty_bundle',
        type: 'interactive_bundle_lab',
        title: '🧪 Composez Votre Coffret Routine Beauté',
        subtitle: 'RÉDUCTION PROGRESSIVE SUR VOTRE LOT SUR-MESURE',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          discountTier2: 10,
          discountTier3: 20
        }
      },
      {
        id: 'sec_beauty_glowing_grid',
        type: 'glowing_cosmetics_grid',
        title: 'Our Featured Products',
        subtitle: 'Get the skin you want to feel',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          columns: 4,
          showBadges: true,
          showColorSwatches: true
        }
      },
      {
        id: 'sec_beauty_faq',
        type: 'smart_faq_concierge',
        title: 'Questions Fréquentes sur Nos Formules',
        subtitle: 'TOUTES LES RÉPONSES POUR VOTRE TRANQUILLITÉ D\'ESPRIT',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'surface',
        settings: {}
      }
    ]
  },

  // 4. High-Tech & Deals Extrêmes
  {
    id: 'blueprint-hightech-deals',
    name: 'High-Tech & Deals Extrêmes',
    subtitle: 'Vente flash sous tension, négociation IA et garantie 1 an',
    badge: 'PERFORMANCE & CHRONO',
    icon: '🔥',
    moodPreset: 'cyber-neon',
    headerStyle: 'mega_hub_marketplace',
    sections: [
      {
        id: 'sec_tech_hero',
        type: 'bento_hero',
        title: 'Performance Maximale • Technologie 2026',
        subtitle: 'NOUVELLE GÉNÉRATION EN STOCK • EXPÉDITION 24H',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          layout: 'bento_3_cards',
          ctaText: 'Commander avec remise',
          priceHighlight: 'Garantie 1 An Incluse'
        }
      },
      {
        id: 'sec_tech_vault',
        type: 'flash_deal_vault',
        title: '⚡ Vente Flash Exclusive du Jour',
        subtitle: 'COMPTE À REBOURS ACTIF • STOCK LIMITÉ GARANTI',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'surface',
        settings: {
          countdownHours: 12,
          stockLeft: 5
        }
      },
      {
        id: 'sec_tech_haggle',
        type: 'live_haggle_offer',
        title: '🤝 Négociateur Flash High-Tech',
        subtitle: 'FAITES VOTRE OFFRE POUR UN ACHAT IMMÉDIAT',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          floorDiscountPercent: 15,
          timerMinutes: 10
        }
      },
      {
        id: 'sec_tech_grid',
        type: 'smart_masonry_grid',
        title: '📦 Tout le Rayon Électronique & Accessoires',
        subtitle: 'DES CENTAINES D\'APPAREILS VÉRIFIÉS PIÈCE PAR PIÈCE',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          columns: 3,
          cardStyle: 'bordered',
          showSearch: true
        }
      },
      {
        id: 'sec_tech_trust',
        type: 'interactive_trust_bar',
        title: 'Garantie 1 An & Contrôle du Colis à la Livraison',
        subtitle: 'VOTRE ACHAT 100% SÉCURISÉ EN TOUTE CONFIANCE',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'surface',
        settings: {}
      }
    ]
  },

  // 5. Académie Numérique, Formations & E-Books
  {
    id: 'blueprint-digital-academy',
    name: 'Académie Numérique, Formations & E-Books',
    subtitle: 'Affiches 1080x1080, grande vue vidéo, compte à rebours et accès immédiat',
    badge: 'DIGITAL & FORMATIONS',
    icon: '🎓',
    moodPreset: 'french-blue',
    headerStyle: 'live_radar_vocal',
    description: 'Le blueprint suprême pour formateurs, créateurs de cours vidéo, webinaires, e-books et logiciels en Afrique.',
    sections: [
      {
        id: 'sec_digital_grid',
        type: 'digital_square_grid',
        title: '🎓 Nos Formations, Webinaires & Produits Numériques',
        subtitle: 'Accédez instantanément à nos masterclasses, affiches de lives et e-books certifiés',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {
          columns: 3,
          countdownHours: 24,
          countdownTitle: '⏳ Offre & Accès Prioritaire expirent dans :',
          enableCounterCarousel: true,
          carouselRowsCount: 2,
          carouselSpeed: 'normal'
        }
      },
      {
        id: 'sec_digital_trust',
        type: 'interactive_trust_bar',
        title: 'Accès Immédiat 24h/24 & Support Pédagogique 7j/7',
        subtitle: 'DES FORMATIONS RECONNUES AVEC CERTIFICAT OFFICIEL',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'surface',
        settings: {}
      },
      {
        id: 'sec_digital_faq',
        type: 'smart_faq_concierge',
        title: 'Questions Fréquentes sur vos Accès & Replays',
        subtitle: 'TOUT CE QU\'IL FAUT SAVOIR AVANT DE REJOINDRE LE PROGRAMME',
        visible: true,
        spacingTop: 'md',
        spacingBottom: 'md',
        backgroundStyle: 'default',
        settings: {}
      }
    ]
  }
];
