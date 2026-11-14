/**
 * @file discoverySearchController.ts
 * @description Moteur Backend Node.js / Express - Algorithme de Recherche "Discovery" & Historique Wameet
 * 
 * Directives architecturales strictes (Prompt 25) :
 * 1. Route Principale : GET /api/discovery/search
 *    - Paramètres de requête : q (texte), category (top, users, shorts, longs, lives, sounds, tags), sortBy (views, newest).
 * 2. Opérateurs de Recherche Avancés :
 *    - Si q commence par '@' (ex: @ibrahim) : Filtre avec une précision absolue (exact match) sur la table Users (username/handle).
 *    - Si q commence par '#' : Cherche uniquement dans les tags des vidéos/lives.
 * 3. Algorithme de Tri (Sorting) :
 *    - sortBy=newest : Trie par createdAt DESC.
 *    - sortBy=views : Trie par viewCount DESC.
 *    - category=top : Algorithme croisant vues récentes, partages ("Micro-Relais") et pertinence sémantique.
 * 4. Historique de Recherche : GET & POST /api/discovery/history
 *    - Table SearchHistory limitée aux 15 dernières recherches par utilisateur (pruning automatique).
 *    - Renvoyé dès le focus sur la barre de recherche (avant même la saisie).
 */

import type { Request, Response, Express } from 'express';

// ============================================================================
// 1. TYPES & INTERFACES DU MOTEUR DISCOVERY
// ============================================================================

export type DiscoveryCategory =
  | 'top'
  | 'users'
  | 'shorts'
  | 'longs'
  | 'lives'
  | 'sounds'
  | 'tags';

export type DiscoverySortBy = 'views' | 'newest';

export interface SearchHistoryItem {
  id: string;
  userId: string;
  query: string;
  searchedAt: number;
  count: number;
}

export interface ParsedSearchQuery {
  raw: string;
  clean: string;
  isHandleMatch: boolean;
  targetHandle?: string;
  isHashtagMatch: boolean;
  targetTag?: string;
  terms: string[];
}

export interface DiscoveryVideoItem {
  id: string;
  title: string;
  category: 'shorts' | 'longs' | 'lives';
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  thumbnailUrl: string;
  videoUrl?: string;
  viewCount: number;
  likesCount: number;
  sharesCount: number; // Micro-Relais (Prompt 15)
  durationSec: number;
  durationLabel: string;
  hashtags: string[];
  createdAt: string;
  createdAtTimestamp: number;
  isLive?: boolean;
  viewersCount?: number;
  productTag?: {
    name: string;
    priceFcfa: number;
  };
  score?: number;
}

export interface DiscoveryUserItem {
  id: string;
  name: string;
  username: string; // Handle sans @ (ex: 'ibrahim.k')
  handle: string;   // Handle complet (ex: '@ibrahim.k')
  avatarUrl: string;
  verified: boolean;
  followersCount: number;
  likesCount: number;
  salesCount: number; // Ventes Nanasore
  isLiveNow: boolean;
  bio: string;
  category: string;
  createdAtTimestamp: number;
}

export interface DiscoverySoundItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  usesCount: number;
  coverUrl: string;
  isTrending: boolean;
  createdAtTimestamp: number;
}

export interface DiscoveryHashtagItem {
  id: string;
  tag: string; // Ex: '#ChaussuresOuaga'
  cleanTag: string; // Ex: 'chaussuresouaga'
  viewsCount: number;
  postsCount: number;
  isTrending: boolean;
}

// ============================================================================
// 2. BASE DE DONNÉES EN MÉMOIRE HAUTE PERFORMANCE & INDEXATION TEXTUELLE
// ============================================================================

/**
 * Registre de l'historique utilisateur (UserId -> SearchHistoryItem[])
 * Limité strictement à 15 items maximum par utilisateur
 */
const USER_SEARCH_HISTORY_DB = new Map<string, SearchHistoryItem[]>();

// Initialisation avec l'historique de démonstration standard Wameet
USER_SEARCH_HISTORY_DB.set('usr_default', [
  { id: 'h-1', userId: 'usr_default', query: 'Chaussures Ouaga', searchedAt: Date.now() - 1000 * 60 * 15, count: 4 },
  { id: 'h-2', userId: 'usr_default', query: 'Concert Live', searchedAt: Date.now() - 1000 * 60 * 60, count: 3 },
  { id: 'h-3', userId: 'usr_default', query: "Gâteau d'anniversaire Nanasore", searchedAt: Date.now() - 1000 * 3600 * 3, count: 2 },
  { id: 'h-4', userId: 'usr_default', query: 'Masterclass Vente 1-Clic', searchedAt: Date.now() - 1000 * 3600 * 12, count: 1 }
]);

/**
 * Base de données des utilisateurs Wameet avec indexation username
 */
const WAMEET_USERS_TABLE: DiscoveryUserItem[] = [
  {
    id: 'u-awa',
    name: 'Awa Ouédraogo',
    username: 'awa.empire.bf',
    handle: '@awa.empire.bf',
    avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    verified: true,
    followersCount: 184500,
    likesCount: 1200000,
    salesCount: 4280,
    isLiveNow: true,
    bio: 'Boutique officielle Chaussures & Sacs en cuir à Ouagadougou et Abidjan. Livraison physique express Nanasore.',
    category: 'Mode & E-Commerce',
    createdAtTimestamp: Date.now() - 180 * 86400 * 1000
  },
  {
    id: 'u-idriss',
    name: 'Dr. Idriss Kaboré',
    username: 'idriss.academie',
    handle: '@idriss.academie',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    verified: true,
    followersCount: 310000,
    likesCount: 2400000,
    salesCount: 8920,
    isLiveNow: false,
    bio: 'Fondateur Académie Wameet. Spécialiste du Tunnel 12 Blocs et de la monétisation Wameet.',
    category: 'Formation & Tech',
    createdAtTimestamp: Date.now() - 365 * 86400 * 1000
  },
  {
    id: 'u-ibrahim',
    name: 'Ibrahim Konaté',
    username: 'ibrahim',
    handle: '@ibrahim',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    verified: true,
    followersCount: 92400,
    likesCount: 890000,
    salesCount: 1420,
    isLiveNow: true,
    bio: 'Artiste Wameet, live concerts acoustiques et expédition de cadeaux mystères physiques à domicile.',
    category: 'Musique & Show',
    createdAtTimestamp: Date.now() - 90 * 86400 * 1000
  },
  {
    id: 'u-clarisse',
    name: 'Clarisse Zongo',
    username: 'clarisse.coach',
    handle: '@clarisse.coach',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    verified: false,
    followersCount: 45200,
    likesCount: 340000,
    salesCount: 890,
    isLiveNow: false,
    bio: 'Coach bien-être et business du soir. Retrouvons-nous chaque soir après le boulot.',
    category: 'Coaching',
    createdAtTimestamp: Date.now() - 60 * 86400 * 1000
  }
];

/**
 * Index de recherche inversé exact par Username en minuscule (O(1) lookup)
 */
const USERNAME_EXACT_INDEX = new Map<string, DiscoveryUserItem>();
for (const user of WAMEET_USERS_TABLE) {
  USERNAME_EXACT_INDEX.set(user.username.toLowerCase(), user);
  USERNAME_EXACT_INDEX.set(user.handle.toLowerCase().replace(/^@/, ''), user);
}

/**
 * Base de données des vidéos et sessions Live Wameet
 */
const WAMEET_VIDEOS_TABLE: DiscoveryVideoItem[] = [
  {
    id: 'vid-1',
    title: 'Arrivage Chaussures Cuir Véritable Ouaga • Prix de gros direct',
    category: 'shorts',
    creatorId: 'u-awa',
    creatorName: 'Awa Ouédraogo',
    creatorHandle: '@awa.empire.bf',
    creatorAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    viewCount: 94500,
    likesCount: 12400,
    sharesCount: 3200, // Partages Micro-Relais
    durationSec: 42,
    durationLabel: '0:42',
    hashtags: ['#chaussuresouaga', '#nanapos', '#modeafricaine', '#cuir'],
    createdAt: 'Il y a 2h',
    createdAtTimestamp: Date.now() - 2 * 3600 * 1000,
    productTag: { name: 'Escarpins Royaux Ouaga', priceFcfa: 19500 }
  },
  {
    id: 'vid-2',
    title: '🔴 Concert Live Acoustique & Surprise Cadeaux en Direct Abidjan',
    category: 'lives',
    creatorId: 'u-ibrahim',
    creatorName: 'Ibrahim Konaté',
    creatorHandle: '@ibrahim',
    creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    viewCount: 18500,
    likesCount: 15400,
    sharesCount: 4890,
    durationSec: 3600,
    durationLabel: 'En Direct',
    isLive: true,
    viewersCount: 3890,
    hashtags: ['#concertlive', '#musique', '#abidjan', '#cadeaumystere'],
    createdAt: 'En Direct',
    createdAtTimestamp: Date.now() - 30 * 60 * 1000
  },
  {
    id: 'vid-3',
    title: 'Je livre un cadeau surprise en scooter à un abonné 🛵🎁',
    category: 'shorts',
    creatorId: 'u-ibrahim',
    creatorName: 'Ibrahim Konaté',
    creatorHandle: '@ibrahim',
    creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    viewCount: 245000,
    likesCount: 32000,
    sharesCount: 7850,
    durationSec: 48,
    durationLabel: '0:48',
    hashtags: ['#cadeaumystere', '#wameetexpress', '#abidjan', '#surprise'],
    createdAt: 'Il y a 1j',
    createdAtTimestamp: Date.now() - 86400 * 1000,
    productTag: { name: "Gâteau d'anniversaire Signature", priceFcfa: 15000 }
  },
  {
    id: 'vid-4',
    title: 'Masterclass Complète : Bâtir son Empire de Vente 1-Clic Wameet Direct & Nanasore',
    category: 'longs',
    creatorId: 'u-idriss',
    creatorName: 'Dr. Idriss Kaboré',
    creatorHandle: '@idriss.academie',
    creatorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    viewCount: 520000,
    likesCount: 45000,
    sharesCount: 14200,
    durationSec: 1335,
    durationLabel: '22:15',
    hashtags: ['#masterclass', '#businessafrique', '#tunneldevente', '#nanapos'],
    createdAt: 'Hier',
    createdAtTimestamp: Date.now() - 86400 * 1000
  },
  {
    id: 'vid-5',
    title: 'Chaussures Ouaga : Test de durabilité du cuir pleine fleur',
    category: 'shorts',
    creatorId: 'u-awa',
    creatorName: 'Awa Ouédraogo',
    creatorHandle: '@awa.empire.bf',
    creatorAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=600&auto=format&fit=crop&q=80',
    viewCount: 310000,
    likesCount: 41200,
    sharesCount: 9100,
    durationSec: 35,
    durationLabel: '0:35',
    hashtags: ['#chaussuresouaga', '#cuirartisanal', '#burkina'],
    createdAt: 'Il y a 5j',
    createdAtTimestamp: Date.now() - 5 * 86400 * 1000,
    productTag: { name: 'Sandales Cuir Ouaga', priceFcfa: 12000 }
  },
  {
    id: 'vid-6',
    title: '🔴 LIVE SHOPPING : Déballage et vente flash 50 paires Escarpins Royaux',
    category: 'lives',
    creatorId: 'u-awa',
    creatorName: 'Awa Ouédraogo',
    creatorHandle: '@awa.empire.bf',
    creatorAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600&auto=format&fit=crop&q=80',
    viewCount: 14200,
    likesCount: 8900,
    sharesCount: 3100,
    durationSec: 2400,
    durationLabel: 'En Direct',
    isLive: true,
    viewersCount: 1420,
    hashtags: ['#liveshopping', '#chaussuresouaga', '#venteflash'],
    createdAt: 'En Direct',
    createdAtTimestamp: Date.now() - 40 * 60 * 1000
  }
];

/**
 * Pistes audio virales
 */
const WAMEET_SOUNDS_TABLE: DiscoverySoundItem[] = [
  {
    id: 'snd-1',
    title: 'Farotage Vibes (Son Officiel Wameet)',
    artist: 'Ibrahim Konaté & Dj Mix',
    duration: '0:30',
    usesCount: 142000,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    isTrending: true,
    createdAtTimestamp: Date.now() - 20 * 86400 * 1000
  },
  {
    id: 'snd-2',
    title: 'Ouaga Night Groove',
    artist: 'Burkina Sounds All-Stars',
    duration: '0:45',
    usesCount: 89500,
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80',
    isTrending: true,
    createdAtTimestamp: Date.now() - 10 * 86400 * 1000
  },
  {
    id: 'snd-3',
    title: 'Acoustic Soul Abidjan',
    artist: 'Ibrahim Konaté',
    duration: '1:00',
    usesCount: 63400,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    isTrending: false,
    createdAtTimestamp: Date.now() - 40 * 86400 * 1000
  }
];

/**
 * Index des hashtags
 */
const WAMEET_HASHTAGS_TABLE: DiscoveryHashtagItem[] = [
  { id: 'h-1', tag: '#ChaussuresOuaga', cleanTag: 'chaussuresouaga', viewsCount: 1450000, postsCount: 3420, isTrending: true },
  { id: 'h-2', tag: '#ConcertLive', cleanTag: 'concertlive', viewsCount: 2890000, postsCount: 6810, isTrending: true },
  { id: 'h-3', tag: '#NaNaPOS', cleanTag: 'nanapos', viewsCount: 5400000, postsCount: 12400, isTrending: true },
  { id: 'h-4', tag: '#WameetReels', cleanTag: 'wameetreels', viewsCount: 3900000, postsCount: 8900, isTrending: true },
  { id: 'h-5', tag: '#CadeauMystere', cleanTag: 'cadeaumystere', viewsCount: 980000, postsCount: 1850, isTrending: false }
];

// ============================================================================
// 3. ANALYSEUR DE REQUÊTE & PARSEUR D'OPÉRATEURS SPÉCIAUX
// ============================================================================

/**
 * Analyse la requête utilisateur et extrait les opérateurs stricts :
 * - '@' : Ciblage absolu sur les noms d'utilisateurs (Exact Match)
 * - '#' : Ciblage exclusif sur les hashtags des vidéos/lives
 */
export function parseSearchQuery(rawQuery: string = ''): ParsedSearchQuery {
  const trimmed = rawQuery.trim();

  // Opérateur 1 : Préfixe '@' (ex: @ibrahim ou @awa.empire.bf)
  if (trimmed.startsWith('@')) {
    const handleWithoutAt = trimmed.slice(1).trim().toLowerCase();
    return {
      raw: trimmed,
      clean: handleWithoutAt,
      isHandleMatch: true,
      targetHandle: handleWithoutAt,
      isHashtagMatch: false,
      terms: [handleWithoutAt]
    };
  }

  // Opérateur 2 : Préfixe '#' (ex: #ChaussuresOuaga)
  if (trimmed.startsWith('#')) {
    const tagWithoutHash = trimmed.slice(1).trim().toLowerCase();
    return {
      raw: trimmed,
      clean: tagWithoutHash,
      isHandleMatch: false,
      isHashtagMatch: true,
      targetTag: '#' + tagWithoutHash,
      terms: [tagWithoutHash]
    };
  }

  // Texte standard
  const lower = trimmed.toLowerCase();
  const terms = lower.split(/\s+/).filter((t) => t.length > 0);

  return {
    raw: trimmed,
    clean: lower,
    isHandleMatch: false,
    isHashtagMatch: false,
    terms
  };
}

// ============================================================================
// 4. ALGORITHME DE TRI & CALCUL DU SCORE VIRAL "TOP"
// ============================================================================

/**
 * Calcule le score algorithmique pour la catégorie 'Top' :
 * Croise :
 * 1. Volume de vues
 * 2. Multiplicateur viral de partages ("Micro-Relais" Prompt 15 - pondération 4.5x)
 * 3. Décroissance temporelle (fraîcheur / demi-vie de 72h)
 * 4. Pertinence textuelle (titre et tags)
 */
export function computeTopViralScore(
  video: DiscoveryVideoItem,
  parsed: ParsedSearchQuery,
  nowTimestamp: number = Date.now()
): number {
  // 1. Logarithme des vues pour éviter qu'une très vieille vidéo écrase tout
  const viewsScore = Math.log10(Math.max(1, video.viewCount)) * 20;

  // 2. Partages Micro-Relais (Signal de viralité sociale très fort)
  const sharesScore = (video.sharesCount || 0) * 0.08;

  // 3. Décroissance temporelle (Bonus pour les vidéos des dernières 72 heures)
  const ageInHours = Math.max(0, (nowTimestamp - video.createdAtTimestamp) / (1000 * 3600));
  const recencyMultiplier = Math.exp(-ageInHours / 72); // Demi-vie de 72 heures
  const recencyBonus = recencyMultiplier * 45;

  // 4. Bonus Live en direct (Les Lives en cours reçoivent une priorité d'attention)
  const liveBonus = video.isLive ? 60 : 0;

  // 5. Pertinence textuelle
  let relevanceBonus = 0;
  const titleLower = video.title.toLowerCase();

  if (parsed.clean) {
    if (titleLower === parsed.clean) {
      relevanceBonus += 80;
    } else if (titleLower.includes(parsed.clean)) {
      relevanceBonus += 40;
    } else {
      for (const term of parsed.terms) {
        if (titleLower.includes(term)) relevanceBonus += 15;
      }
    }

    // Correspondance exacte avec les tags
    for (const tag of video.hashtags) {
      if (tag.toLowerCase().includes(parsed.clean)) {
        relevanceBonus += 25;
      }
    }
  }

  return viewsScore + sharesScore + recencyBonus + liveBonus + relevanceBonus;
}

// ============================================================================
// 5. CONTRÔLEURS DE ROUTES EXPRESS
// ============================================================================

/**
 * CONTRÔLEUR PRINCIPAL : GET /api/discovery/search
 * - Traite les paramètres q, category et sortBy
 * - Applique les opérateurs stricts '@' et '#'
 * - Trie par views, newest ou score viral multicritère
 */
export async function handleDiscoverySearch(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    const rawQuery = String(req.query.q || '').trim();
    const category = (String(req.query.category || 'top').toLowerCase() as DiscoveryCategory);
    const sortBy = (String(req.query.sortBy || 'views').toLowerCase() as DiscoverySortBy);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10));

    const parsed = parseSearchQuery(rawQuery);

    // =========================================================================
    // CAS 1 : OPÉRATEUR AVANCÉ '@' -> EXACT MATCH SUR LES USERS (USERNAME)
    // =========================================================================
    if (parsed.isHandleMatch && parsed.targetHandle) {
      const exactUser = USERNAME_EXACT_INDEX.get(parsed.targetHandle);
      const matchedUsers = exactUser
        ? [exactUser]
        : WAMEET_USERS_TABLE.filter(
            (u) =>
              u.username.toLowerCase() === parsed.targetHandle ||
              u.handle.toLowerCase() === `@${parsed.targetHandle}`
          );

      // On joint également les vidéos du créateur exact
      let creatorVideos: DiscoveryVideoItem[] = [];
      if (exactUser) {
        creatorVideos = WAMEET_VIDEOS_TABLE.filter((v) => v.creatorId === exactUser.id);
        if (sortBy === 'newest') {
          creatorVideos.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp);
        } else {
          creatorVideos.sort((a, b) => b.viewCount - a.viewCount);
        }
      }

      res.status(200).json({
        success: true,
        operator: 'HANDLE_EXACT_MATCH',
        query: rawQuery,
        targetHandle: parsed.targetHandle,
        total: matchedUsers.length,
        execTimeMs: Date.now() - startTime,
        results: {
          users: matchedUsers,
          videos: creatorVideos,
          playlist: exactUser
            ? creatorVideos.map((v) => ({
                id: v.id,
                title: v.title,
                thumbnailUrl: v.thumbnailUrl,
                viewsCount: v.viewCount,
                duration: v.durationLabel,
                category: v.category,
                productTag: v.productTag
              }))
            : []
        }
      });
      return;
    }

    // =========================================================================
    // CAS 2 : OPÉRATEUR AVANCÉ '#' -> RECHERCHE STRICTEMENT DANS LES HASHTAGS
    // =========================================================================
    if (parsed.isHashtagMatch && parsed.targetTag) {
      const cleanTag = parsed.targetTag.toLowerCase();
      let matchedVideos = WAMEET_VIDEOS_TABLE.filter((v) =>
        v.hashtags.some((h) => h.toLowerCase() === cleanTag || h.toLowerCase().includes(parsed.clean))
      );

      // Application du tri demandé
      if (sortBy === 'newest') {
        matchedVideos.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp);
      } else {
        matchedVideos.sort((a, b) => b.viewCount - a.viewCount);
      }

      const matchedTags = WAMEET_HASHTAGS_TABLE.filter(
        (h) => h.tag.toLowerCase() === cleanTag || h.cleanTag.includes(parsed.clean)
      );

      res.status(200).json({
        success: true,
        operator: 'HASHTAG_MATCH',
        query: rawQuery,
        targetTag: parsed.targetTag,
        total: matchedVideos.length,
        execTimeMs: Date.now() - startTime,
        results: {
          hashtags: matchedTags,
          videos: matchedVideos.slice(offset, offset + limit),
          shorts: matchedVideos.filter((v) => v.category === 'shorts'),
          lives: matchedVideos.filter((v) => v.category === 'lives')
        }
      });
      return;
    }

    // =========================================================================
    // CAS 3 : RECHERCHE UNIFIÉE MULTICATÉGORIE & TRI DYNAMIQUE
    // =========================================================================

    // Filtrage textuel des vidéos
    let videos = WAMEET_VIDEOS_TABLE.filter((v) => {
      if (!parsed.clean) return true;
      const titleMatches = v.title.toLowerCase().includes(parsed.clean);
      const creatorMatches =
        v.creatorName.toLowerCase().includes(parsed.clean) ||
        v.creatorHandle.toLowerCase().includes(parsed.clean);
      const tagMatches = v.hashtags.some((h) => h.toLowerCase().includes(parsed.clean));
      return titleMatches || creatorMatches || tagMatches;
    });

    // Filtrage textuel des utilisateurs
    let users = WAMEET_USERS_TABLE.filter((u) => {
      if (!parsed.clean) return true;
      return (
        u.name.toLowerCase().includes(parsed.clean) ||
        u.handle.toLowerCase().includes(parsed.clean) ||
        u.category.toLowerCase().includes(parsed.clean) ||
        u.bio.toLowerCase().includes(parsed.clean)
      );
    });

    // Filtrage des sons
    let sounds = WAMEET_SOUNDS_TABLE.filter((s) => {
      if (!parsed.clean) return true;
      return s.title.toLowerCase().includes(parsed.clean) || s.artist.toLowerCase().includes(parsed.clean);
    });

    // Filtrage des hashtags
    let hashtags = WAMEET_HASHTAGS_TABLE.filter((h) => {
      if (!parsed.clean) return true;
      return h.tag.toLowerCase().includes(parsed.clean) || h.cleanTag.includes(parsed.clean);
    });

    // Application du Tri
    if (category === 'top') {
      // Score viral multicritère
      const now = Date.now();
      videos = videos
        .map((v) => ({ ...v, score: computeTopViralScore(v, parsed, now) }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      users.sort((a, b) => b.followersCount - a.followersCount);
    } else if (sortBy === 'newest') {
      // Tri par date de création descendante
      videos.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp);
      users.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp);
      sounds.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp);
    } else {
      // Tri par vues descendantes (par défaut)
      videos.sort((a, b) => b.viewCount - a.viewCount);
      users.sort((a, b) => b.followersCount - a.followersCount);
      sounds.sort((a, b) => b.usesCount - a.usesCount);
      hashtags.sort((a, b) => b.viewsCount - a.viewsCount);
    }

    // Répartition selon la catégorie demandée
    let categorizedOutput: Record<string, any> = {};

    switch (category) {
      case 'users':
        categorizedOutput = { users: users.slice(offset, offset + limit) };
        break;
      case 'shorts':
        categorizedOutput = {
          shorts: videos.filter((v) => v.category === 'shorts').slice(offset, offset + limit)
        };
        break;
      case 'longs':
        categorizedOutput = {
          longs: videos.filter((v) => v.category === 'longs').slice(offset, offset + limit)
        };
        break;
      case 'lives':
        categorizedOutput = {
          lives: videos.filter((v) => v.category === 'lives' || v.isLive).slice(offset, offset + limit)
        };
        break;
      case 'sounds':
        categorizedOutput = { sounds: sounds.slice(offset, offset + limit) };
        break;
      case 'tags':
        categorizedOutput = { hashtags: hashtags.slice(offset, offset + limit) };
        break;
      case 'top':
      default:
        categorizedOutput = {
          topCreators: users.slice(0, 3),
          lives: videos.filter((v) => v.isLive).slice(0, 4),
          shorts: videos.filter((v) => v.category === 'shorts').slice(0, 6),
          longs: videos.filter((v) => v.category === 'longs').slice(0, 3),
          sounds: sounds.slice(0, 3),
          hashtags: hashtags.slice(0, 4)
        };
        break;
    }

    res.status(200).json({
      success: true,
      query: rawQuery,
      category,
      sortBy,
      execTimeMs: Date.now() - startTime,
      results: categorizedOutput
    });
  } catch (error: any) {
    console.error('[DISCOVERY SEARCH API] Erreur interne :', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement de la recherche Discovery',
      message: error?.message || 'Erreur inconnue'
    });
  }
}

/**
 * CONTRÔLEUR : GET /api/discovery/history
 * Renvoie l'historique de recherche d'un utilisateur dès le focus de la barre
 * (limité aux 15 dernières recherches, ordonnées par searchedAt DESC).
 */
export async function handleGetSearchHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = String(req.query.userId || req.headers['x-user-id'] || 'usr_default').trim();
    const userHistory = USER_SEARCH_HISTORY_DB.get(userId) || [];

    // Ordonné par date de recherche la plus récente en tête
    const sorted = [...userHistory].sort((a, b) => b.searchedAt - a.searchedAt);

    res.status(200).json({
      success: true,
      userId,
      count: sorted.length,
      history: sorted.map((h) => ({
        id: h.id,
        query: h.query,
        searchedAt: h.searchedAt,
        count: h.count
      }))
    });
  } catch (error: any) {
    console.error('[DISCOVERY HISTORY GET] Erreur :', error);
    res.status(500).json({ success: false, error: 'Impossible de récupérer l’historique de recherche' });
  }
}

/**
 * CONTRÔLEUR : POST /api/discovery/history
 * Enregistre une expression recherchée par un utilisateur.
 * Optimisation DB : Limite stricte à 15 entrées par utilisateur (pruning des plus anciennes).
 */
export async function handleSaveSearchHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = String(req.body.userId || req.headers['x-user-id'] || 'usr_default').trim();
    const rawQuery = String(req.body.query || '').trim();

    if (!rawQuery) {
      res.status(400).json({ success: false, error: 'La requête de recherche (query) est obligatoire.' });
      return;
    }

    let userHistory = USER_SEARCH_HISTORY_DB.get(userId) || [];

    // Vérifie si la phrase existe déjà (pour la remonter en haut sans doublon)
    const existingIndex = userHistory.findIndex(
      (h) => h.query.toLowerCase() === rawQuery.toLowerCase()
    );

    const now = Date.now();

    if (existingIndex >= 0) {
      const existing = userHistory[existingIndex];
      existing.searchedAt = now;
      existing.count += 1;
      // Remonte en tête
      userHistory.splice(existingIndex, 1);
      userHistory.unshift(existing);
    } else {
      const newItem: SearchHistoryItem = {
        id: `sh-${now}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        query: rawQuery,
        searchedAt: now,
        count: 1
      };
      userHistory.unshift(newItem);
    }

    // DIRECTIVE STRICTE : Limitation aux 15 dernières recherches par utilisateur
    if (userHistory.length > 15) {
      userHistory = userHistory.slice(0, 15);
    }

    USER_SEARCH_HISTORY_DB.set(userId, userHistory);

    res.status(201).json({
      success: true,
      message: 'Recherche enregistrée dans l’historique',
      historyCount: userHistory.length,
      latest: userHistory[0]
    });
  } catch (error: any) {
    console.error('[DISCOVERY HISTORY POST] Erreur :', error);
    res.status(500).json({ success: false, error: 'Impossible d’enregistrer la recherche' });
  }
}

/**
 * CONTRÔLEUR : DELETE /api/discovery/history
 * Supprime un élément individuel ou vide l'historique complet
 */
export async function handleDeleteSearchHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = String(req.query.userId || req.headers['x-user-id'] || 'usr_default').trim();
    const itemQuery = req.query.query ? String(req.query.query).trim().toLowerCase() : null;

    if (!itemQuery) {
      // Vider tout l'historique
      USER_SEARCH_HISTORY_DB.set(userId, []);
      res.status(200).json({ success: true, message: 'Historique de recherche vidé avec succès' });
      return;
    }

    // Supprimer un élément spécifique
    let userHistory = USER_SEARCH_HISTORY_DB.get(userId) || [];
    userHistory = userHistory.filter((h) => h.query.toLowerCase() !== itemQuery);
    USER_SEARCH_HISTORY_DB.set(userId, userHistory);

    res.status(200).json({
      success: true,
      message: `Terme "${itemQuery}" supprimé de l’historique`,
      remainingCount: userHistory.length
    });
  } catch (error: any) {
    console.error('[DISCOVERY HISTORY DELETE] Erreur :', error);
    res.status(500).json({ success: false, error: 'Impossible de supprimer de l’historique' });
  }
}

// ============================================================================
// 6. ATTACHEMENT DES ROUTES AU SERVEUR EXPRESS
// ============================================================================

/**
 * Attache les routes du moteur Discovery à l'application Express
 */
export function attachDiscoverySearchRoutes(app: Express): void {
  // 1. Route Principale de Recherche Discovery
  app.get('/api/discovery/search', handleDiscoverySearch);

  // 2. Routes d'Historique de Recherche Utilisateur
  app.get('/api/discovery/history', handleGetSearchHistory);
  app.post('/api/discovery/history', handleSaveSearchHistory);
  app.delete('/api/discovery/history', handleDeleteSearchHistory);
}
