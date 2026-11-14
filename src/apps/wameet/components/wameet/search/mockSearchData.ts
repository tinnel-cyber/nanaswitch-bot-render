import {
  CreatorProfile,
  ShortVideoResult,
  LongVideoResult,
  LiveSessionResult,
  SoundResult,
  HashtagResult,
  SearchDataCollection
} from './types';

export const INITIAL_SEARCH_HISTORY: string[] = [
  'Chaussures Ouaga',
  'Concert Live',
  "Gâteau d'anniversaire Nanasore",
  'Masterclass Vente 1-Clic',
  'Mode Wax Abidjan',
  'Farotage Wameet'
];

export const TRENDING_SEARCH_SUGGESTIONS: string[] = [
  '🔥 Vente Flash Live Nanasore',
  '💡 Idées Business 18h',
  '📦 Livraison Express Yopougon',
  '🎵 Sons Afrobeat Viraux',
  '🎁 Cadeau Mystère Wameet'
];

export const MOCK_CREATORS: CreatorProfile[] = [
  {
    id: 'creator-awa',
    name: 'Awa Ouédraogo',
    handle: '@awa.empire.bf',
    avatarUrl:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    badge: '🛍️ E-Shop Nanasore',
    verified: true,
    isLiveNow: true,
    liveTitle: 'Vente Flash Chaussures & Sacs en Cuir Ouaga',
    liveViewersCount: 1420,
    followersCount: 184500,
    likesCount: 1200000,
    salesCount: 4280,
    bio: 'Boutique officielle à Ouagadougou & Abidjan. Livraison physique express 24h via Nanasore.',
    category: 'Mode & E-Commerce',
    playlist: [
      {
        id: 'play-1',
        title: 'Arrivage Chaussures Cuir Véritable Ouaga',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
        viewsCount: 94500,
        duration: '0:42',
        category: 'shorts',
        createdAt: 'Il y a 2h',
        createdAtTimestamp: Date.now() - 2 * 3600 * 1000,
        likesCount: 12400,
        productTag: { name: 'Escarpins Royaux Ouaga', priceFcfa: 19500 }
      },
      {
        id: 'play-2',
        title: '🔴 LIVE EN COURS : Déballage 50 Colis Importation',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600&auto=format&fit=crop&q=80',
        viewsCount: 1420,
        duration: 'En Direct',
        category: 'lives',
        createdAt: 'Maintenant',
        createdAtTimestamp: Date.now(),
        likesCount: 8900
      },
      {
        id: 'play-3',
        title: 'Masterclass : Comment lancer sa boutique physique avec Nanasore',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1556742049-0a67e55722ee?w=600&auto=format&fit=crop&q=80',
        viewsCount: 312000,
        duration: '18:24',
        category: 'longs',
        createdAt: 'Il y a 3j',
        createdAtTimestamp: Date.now() - 3 * 86400 * 1000,
        likesCount: 28900
      },
      {
        id: 'play-4',
        title: 'Chaussures d’été tressées à la main',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=600&auto=format&fit=crop&q=80',
        viewsCount: 78200,
        duration: '0:35',
        category: 'shorts',
        createdAt: 'Il y a 5j',
        createdAtTimestamp: Date.now() - 5 * 86400 * 1000,
        likesCount: 9400,
        productTag: { name: 'Sandales Cuir Ouaga', priceFcfa: 12000 }
      }
    ]
  },
  {
    id: 'creator-idriss',
    name: 'Dr. Idriss Kaboré',
    handle: '@idriss.academie',
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    badge: '🎓 Formateur Certifié',
    verified: true,
    isLiveNow: false,
    followersCount: 310000,
    likesCount: 2400000,
    salesCount: 8920,
    bio: 'Fondateur Académie Wameet. Auteur du Tunnel 12 Blocs & expert monétisation d’audience en Afrique.',
    category: 'Formation & Tech',
    playlist: [
      {
        id: 'play-idriss-1',
        title: 'Pourquoi 90% des e-commerçants échouent en Afrique sans le CRM Wameet',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80',
        viewsCount: 520000,
        duration: '22:15',
        category: 'longs',
        createdAt: 'Hier',
        createdAtTimestamp: Date.now() - 86400 * 1000,
        likesCount: 45000
      },
      {
        id: 'play-idriss-2',
        title: '3 astuces pour doubler ses ventes en live shopping',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
        viewsCount: 189000,
        duration: '0:58',
        category: 'shorts',
        createdAt: 'Il y a 4j',
        createdAtTimestamp: Date.now() - 4 * 86400 * 1000,
        likesCount: 19500
      }
    ]
  },
  {
    id: 'creator-ibrahim',
    name: 'Ibrahim Konaté',
    handle: '@ibrahim.k',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    badge: '🎁 Ambassadeur Cadeaux',
    verified: true,
    isLiveNow: true,
    liveTitle: 'Concert Live Acoustique & Surprise Cadeaux Abidjan',
    liveViewersCount: 3890,
    followersCount: 92400,
    likesCount: 890000,
    salesCount: 1420,
    bio: 'Artiste & créateur Wameet. Envoi de cadeaux mystères physiques et sessions musicales en direct.',
    category: 'Musique & Live',
    playlist: [
      {
        id: 'play-ibrahim-1',
        title: 'Concert Live : Session Acoustique Cocody',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
        viewsCount: 3890,
        duration: 'En Direct',
        category: 'lives',
        createdAt: 'Maintenant',
        createdAtTimestamp: Date.now(),
        likesCount: 15400
      },
      {
        id: 'play-ibrahim-2',
        title: 'Je livre un cadeau surprise en scooter à un abonné 🛵🎁',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
        viewsCount: 245000,
        duration: '0:48',
        category: 'shorts',
        createdAt: 'Il y a 1j',
        createdAtTimestamp: Date.now() - 86400 * 1000,
        likesCount: 32000,
        productTag: { name: "Gâteau d'anniversaire Signature", priceFcfa: 15000 }
      }
    ]
  }
];

export const MOCK_SHORTS: ShortVideoResult[] = [
  {
    id: 'short-1',
    title: 'Arrivage Chaussures Cuir Véritable Ouaga • Prix imbattable',
    creatorName: 'Awa Ouédraogo',
    creatorHandle: '@awa.empire.bf',
    creatorAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
    viewsCount: 94500,
    likesCount: 12400,
    createdAt: 'Il y a 2h',
    createdAtTimestamp: Date.now() - 2 * 3600 * 1000,
    hashtags: ['#ChaussuresOuaga', '#Nanasore', '#ModeAfricaine'],
    productTag: { name: 'Escarpins Royaux Ouaga', priceFcfa: 19500 }
  },
  {
    id: 'short-2',
    title: 'Je livre un cadeau surprise en scooter à un abonné 🛵🎁',
    creatorName: 'Ibrahim Konaté',
    creatorHandle: '@ibrahim.k',
    creatorAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    viewsCount: 245000,
    likesCount: 32000,
    createdAt: 'Il y a 1j',
    createdAtTimestamp: Date.now() - 86400 * 1000,
    hashtags: ['#CadeauMystere', '#WameetExpress', '#Abidjan'],
    productTag: { name: "Gâteau d'anniversaire Signature", priceFcfa: 15000 }
  },
  {
    id: 'short-3',
    title: '3 secrets pour doubler vos ventes sur Live Wameet & Reels',
    creatorName: 'Dr. Idriss Kaboré',
    creatorHandle: '@idriss.academie',
    creatorAvatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
    viewsCount: 189000,
    likesCount: 19500,
    createdAt: 'Il y a 4j',
    createdAtTimestamp: Date.now() - 4 * 86400 * 1000,
    hashtags: ['#BusinessAfrique', '#TunnelDeVente']
  },
  {
    id: 'short-4',
    title: 'Chaussures Ouaga : Test d’imperméabilité en direct',
    creatorName: 'Awa Ouédraogo',
    creatorHandle: '@awa.empire.bf',
    creatorAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=600&auto=format&fit=crop&q=80',
    viewsCount: 310000,
    likesCount: 41200,
    createdAt: 'Il y a 1 semaine',
    createdAtTimestamp: Date.now() - 7 * 86400 * 1000,
    hashtags: ['#ChaussuresOuaga', '#QualiteCuir', '#TestDirect']
  }
];

export const MOCK_LONGS: LongVideoResult[] = [
  {
    id: 'long-1',
    title: 'Masterclass Complète : Bâtir son Empire de Vente 1-Clic Wameet & Nanasore',
    creatorName: 'Dr. Idriss Kaboré',
    creatorHandle: '@idriss.academie',
    creatorAvatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80',
    duration: '22:15',
    viewsCount: 520000,
    createdAt: 'Hier',
    createdAtTimestamp: Date.now() - 86400 * 1000,
    category: 'Formation Business'
  },
  {
    id: 'long-2',
    title: 'Reportage Exclusif : Dans les ateliers des maîtres bottiers de Ouaga',
    creatorName: 'Awa Ouédraogo',
    creatorHandle: '@awa.empire.bf',
    creatorAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1556742049-0a67e55722ee?w=600&auto=format&fit=crop&q=80',
    duration: '18:24',
    viewsCount: 312000,
    createdAt: 'Il y a 3j',
    createdAtTimestamp: Date.now() - 3 * 86400 * 1000,
    category: 'Artisanat & Mode'
  },
  {
    id: 'long-3',
    title: 'Concert Live Complet : Festival Nuits Métisses 2026',
    creatorName: 'Ibrahim Konaté',
    creatorHandle: '@ibrahim.k',
    creatorAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    duration: '45:10',
    viewsCount: 180000,
    createdAt: 'Il y a 2 semaines',
    createdAtTimestamp: Date.now() - 14 * 86400 * 1000,
    category: 'Musique'
  }
];

export const MOCK_LIVES: LiveSessionResult[] = [
  {
    id: 'live-1',
    title: '🔴 Concert Live Acoustique & Surprise Cadeaux en Direct',
    creatorName: 'Ibrahim Konaté',
    creatorHandle: '@ibrahim.k',
    creatorAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    viewersCount: 3890,
    category: 'Musique & Show',
    isLive: true,
    productLiveBadge: '🎁 Farotage Ouvert',
    startedAt: 'Il y a 25 min',
    createdAtTimestamp: Date.now() - 25 * 60 * 1000
  },
  {
    id: 'live-2',
    title: '🔴 Vente Flash Chaussures & Sacs en Cuir Ouaga (Stock Limité)',
    creatorName: 'Awa Ouédraogo',
    creatorHandle: '@awa.empire.bf',
    creatorAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600&auto=format&fit=crop&q=80',
    viewersCount: 1420,
    category: 'Shopping Live',
    isLive: true,
    productLiveBadge: '⚡ Achat 1-Clic Actif',
    startedAt: 'Il y a 40 min',
    createdAtTimestamp: Date.now() - 40 * 60 * 1000
  }
];

export const MOCK_SOUNDS: SoundResult[] = [
  {
    id: 'snd-1',
    title: 'Farotage Vibes (Son Officiel Wameet)',
    artist: 'Ibrahim Konaté & Dj Mix',
    duration: '0:30',
    usesCount: 142000,
    coverUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    isTrending: true
  },
  {
    id: 'snd-2',
    title: 'Ouaga Night Groove',
    artist: 'Burkina Sounds All-Stars',
    duration: '0:45',
    usesCount: 89500,
    coverUrl:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80',
    isTrending: true
  },
  {
    id: 'snd-3',
    title: 'Acoustic Soul Abidjan',
    artist: 'Ibrahim Konaté',
    duration: '1:00',
    usesCount: 63400,
    coverUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80'
  }
];

export const MOCK_HASHTAGS: HashtagResult[] = [
  {
    id: 'hash-1',
    tag: '#ChaussuresOuaga',
    viewsCount: 1450000,
    postsCount: 3420,
    isTrending: true
  },
  {
    id: 'hash-2',
    tag: '#ConcertLive',
    viewsCount: 2890000,
    postsCount: 6810,
    isTrending: true
  },
  {
    id: 'hash-3',
    tag: '#Nanasore',
    viewsCount: 5400000,
    postsCount: 12400,
    isTrending: true
  },
  {
    id: 'hash-4',
    tag: '#WameetReels',
    viewsCount: 3900000,
    postsCount: 8900,
    isTrending: true
  },
  {
    id: 'hash-5',
    tag: '#CadeauMystere',
    viewsCount: 980000,
    postsCount: 1850,
    isTrending: false
  }
];

export const MOCK_SEARCH_DATA: SearchDataCollection = {
  creators: MOCK_CREATORS,
  shorts: MOCK_SHORTS,
  longs: MOCK_LONGS,
  lives: MOCK_LIVES,
  sounds: MOCK_SOUNDS,
  hashtags: MOCK_HASHTAGS
};

export default INITIAL_SEARCH_HISTORY;
