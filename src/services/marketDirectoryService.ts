/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Service NaNa Market • L'Annuaire B2B2C des Boutiques
 * Permet la découverte publique des boutiques en ligne sans rechercher produit par produit.
 * Logique de monétisation : Les marchands au Plan Pro apparaissent systématiquement en haut.
 */

import { supabase } from '../lib/supabase';
import { MarketDirectoryStore, DirectoryMerchantType } from '../types';

// ============================================================================
// 1. CATÉGORIES OFFICIELLES DU CENTRE COMMERCIAL DIGITAL
// ============================================================================
export const DIRECTORY_CATEGORIES = [
  'Toutes les Catégories',
  'Électronique & High-Tech',
  'Mode & Prêt-à-Porter',
  'Alimentation & Épicerie',
  'Formations & E-learning',
  'Webinaires & Lives',
  'Coaching & Consulting',
  'Santé, Beauté & Cosmétiques',
  'Maison, Meubles & Déco',
  'Bijouterie & Luxe',
  'Enfants & Bébés',
  'Auto & Quincaillerie'
] as const;

export type DirectoryCategory = typeof DIRECTORY_CATEGORIES[number];

// ============================================================================
// 2. SEED DATA : BOUTIQUES PILOTES DU CENTRE COMMERCIAL (FALLBACK HAUTE FIDÉLITÉ)
// ============================================================================
export const SEED_DIRECTORY_STORES: MarketDirectoryStore[] = [
  {
    id: 'store-abidjan-tech-pro',
    storeId: 'store-abidjan-tech-pro',
    storeName: 'TechZone Pro Abidjan',
    merchantType: 'physical_store',
    logoUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1000&auto=format&fit=crop&q=80',
    category: 'Électronique & High-Tech',
    searchTags: ['smartphones', 'iphone', 'samsung', 'ordinateurs', 'macbook', 'écouteurs', 'câbles', 'tablettes'],
    city: 'Abidjan',
    quarter: 'Plateau & Cocody',
    country: "Côte d'Ivoire",
    isListedInDirectory: true,
    plan: 'pro',
    subscriptionPlan: 'pro',
    verified: true,
    whatsappPhone: '+2250700112233',
    phone: '+2250700112233',
    slug: 'techzone-abidjan',
    rating: 4.9,
    reviewsCount: 312,
    salesCount: 1450,
    description: 'Le distributeur leader en téléphones reconditionnés certifiés et PC portables gaming avec garantie 12 mois et livraison rapide en 2h chrono.',
    createdAt: Date.now() - 30 * 24 * 3600 * 1000
  },
  {
    id: 'store-nana-academy-pro',
    storeId: 'store-nana-academy-pro',
    storeName: 'NaNa Fintech & E-Commerce Academy',
    merchantType: 'digital_creator',
    logoUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=300&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
    category: 'Formations & E-learning',
    searchTags: ['formation', 'video', 'fintech', 'masterclass', 'ecommerce', 'certificat', 'cours', 'diplome'],
    city: '100% En Ligne',
    quarter: 'Afrique & Diaspora',
    country: 'International',
    isListedInDirectory: true,
    plan: 'pro',
    subscriptionPlan: 'pro',
    verified: true,
    whatsappPhone: '+22670001122',
    phone: '+22670001122',
    slug: 'telecom-fintech-masterclass',
    rating: 4.98,
    reviewsCount: 540,
    salesCount: 1820,
    description: 'Académie d\'excellence formant les entrepreneurs africains aux paiements mobiles (Wave, Orange Money), e-commerce et automatisation IA avec délivrance de certificats vérifiés.',
    createdAt: Date.now() - 25 * 24 * 3600 * 1000
  },
  {
    id: 'store-live-ecommerce-summit',
    storeId: 'store-live-ecommerce-summit',
    storeName: 'Sommet E-Commerce Afrique 2026',
    merchantType: 'event_host',
    logoUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=300&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1000&auto=format&fit=crop&q=80',
    category: 'Webinaires & Lives',
    searchTags: ['live', 'webinaire', 'direct', 'conference', 'streaming', 'reservation', 'billetterie'],
    city: 'Live Streaming HD',
    quarter: 'Webinaire Interactif',
    country: 'En direct',
    isListedInDirectory: true,
    plan: 'pro',
    subscriptionPlan: 'pro',
    verified: true,
    whatsappPhone: '+22501020304',
    phone: '+22501020304',
    slug: 'sommet-live-ecommerce',
    rating: 4.92,
    reviewsCount: 290,
    salesCount: 850,
    description: 'Grand webinaire interactif en direct avec 5 leaders du digital africain. Démonstrations en direct, session questions/réponses et ressources téléchargeables offertes.',
    createdAt: Date.now() - 10 * 24 * 3600 * 1000
  },
  {
    id: 'store-coaching-business-tremplin',
    storeId: 'store-coaching-business-tremplin',
    storeName: 'Tremplin Business & Coaching',
    merchantType: 'digital_creator',
    category: 'Coaching & Consulting',
    logoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1000&auto=format&fit=crop&q=80',
    searchTags: ['coaching', 'ebook', 'mentorat', 'strategie', 'audit', 'conseil', 'business'],
    city: '100% En Ligne',
    quarter: 'Visio 1-sur-1 & E-books',
    country: 'Afrique de l\'Ouest',
    isListedInDirectory: true,
    plan: 'pro',
    subscriptionPlan: 'pro',
    verified: true,
    whatsappPhone: '+221781234567',
    phone: '+221781234567',
    slug: 'tremplin-coaching',
    rating: 4.95,
    reviewsCount: 160,
    salesCount: 420,
    description: 'Coaching stratégique pour TPE/PME et créateurs. Débloquez votre croissance, accédez à des guides e-books exclusifs et planifiez vos sessions de mentorat individuel.',
    createdAt: Date.now() - 18 * 24 * 3600 * 1000
  },
  {
    id: 'store-ouaga-luxe-couture',
    storeId: 'store-ouaga-luxe-couture',
    storeName: 'NaNa Élégance & Mode Africaine',
    merchantType: 'physical_store',
    logoUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1000&auto=format&fit=crop&q=80',
    category: 'Mode & Prêt-à-Porter',
    searchTags: ['robes', 'bazin', 'koko dunda', 'pagnes', 'costumes', 'chaussures', 'bijoux', 'mode'],
    city: 'Ouagadougou',
    quarter: 'Ouaga 2000',
    country: 'Burkina Faso',
    isListedInDirectory: true,
    plan: 'pro',
    subscriptionPlan: 'pro',
    verified: true,
    whatsappPhone: '+22670123456',
    phone: '+22670123456',
    slug: 'nana-elegance-mode',
    rating: 4.95,
    reviewsCount: 420,
    salesCount: 2310,
    description: 'Haute couture afro-contemporaine, pièces uniques en Faso Dan Fani tissé main et robes de cérémonie sur mesure. Expédition internationale.',
    createdAt: Date.now() - 45 * 24 * 3600 * 1000
  },
  {
    id: 'store-dakar-saveurs-bio',
    storeId: 'store-dakar-saveurs-bio',
    storeName: 'Teranga Épicerie Fine & Bio',
    logoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1000&auto=format&fit=crop&q=80',
    category: 'Alimentation & Épicerie',
    searchTags: ['épicerie', 'bio', 'jus naturels', 'miel', 'épices', 'thiéboudienne', 'riz', 'café'],
    city: 'Dakar',
    quarter: 'Almadies & Ngor',
    country: 'Sénégal',
    isListedInDirectory: true,
    plan: 'pro',
    subscriptionPlan: 'pro',
    verified: true,
    whatsappPhone: '+221770002244',
    phone: '+221770002244',
    slug: 'teranga-saveurs-dakar',
    rating: 4.88,
    reviewsCount: 184,
    salesCount: 980,
    description: 'Produits du terroir d\'Afrique de l\'Ouest 100% naturels, condiments d\'exception, miels sauvages et paniers de fruits frais livrés à domicile.',
    createdAt: Date.now() - 20 * 24 * 3600 * 1000
  },
  {
    id: 'store-lome-cosmetics-glow',
    storeId: 'store-lome-cosmetics-glow',
    storeName: 'Glow Botanic Beauty',
    logoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1000&auto=format&fit=crop&q=80',
    category: 'Santé, Beauté & Cosmétiques',
    searchTags: ['karité', 'savon noir', 'huiles essentielles', 'soins visage', 'crèmes', 'beauté'],
    city: 'Lomé',
    quarter: 'Baguida & Nyékonakpoé',
    country: 'Togo',
    isListedInDirectory: true,
    plan: 'starter',
    subscriptionPlan: 'starter',
    verified: false,
    whatsappPhone: '+22890112233',
    phone: '+22890112233',
    slug: 'glow-botanic-lome',
    rating: 4.75,
    reviewsCount: 96,
    salesCount: 420,
    description: 'Formules dermatologiques naturelles enrichies au beurre de karité bio du Nord et huiles précieuses de baobab pour peaux noires et métissées.',
    createdAt: Date.now() - 15 * 24 * 3600 * 1000
  },
  {
    id: 'store-cotonou-deco-maison',
    storeId: 'store-cotonou-deco-maison',
    storeName: 'Atelier Racine Déco & Design',
    logoUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1000&auto=format&fit=crop&q=80',
    category: 'Maison, Meubles & Déco',
    searchTags: ['meubles', 'luminaires', 'tableaux', 'décoration', 'chaises', 'bois massif', 'salon'],
    city: 'Cotonou',
    quarter: 'Haie Vive & Cadjehoun',
    country: 'Bénin',
    isListedInDirectory: true,
    plan: 'starter',
    subscriptionPlan: 'starter',
    verified: false,
    whatsappPhone: '+22997003344',
    phone: '+22997003344',
    slug: 'atelier-racine-cotonou',
    rating: 4.82,
    reviewsCount: 78,
    salesCount: 290,
    description: 'Mobilier contemporain fabriqué artisanalement en bois noble africain (iroko, teck) et objets d\'art pour sublimer salons et bureaux.',
    createdAt: Date.now() - 10 * 24 * 3600 * 1000
  },
  {
    id: 'store-bamako-bijoux-or',
    storeId: 'store-bamako-bijoux-or',
    storeName: 'Orfèvrerie Djoliba Prestige',
    logoUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1000&auto=format&fit=crop&q=80',
    category: 'Bijouterie & Luxe',
    searchTags: ['or 18k', 'argent 925', 'colliers', 'bagues', 'bracelets', 'mariage', 'alliances'],
    city: 'Bamako',
    quarter: 'Hamdallaye ACI 2000',
    country: 'Mali',
    isListedInDirectory: true,
    plan: 'free',
    subscriptionPlan: 'free',
    verified: false,
    whatsappPhone: '+22366112233',
    phone: '+22366112233',
    slug: 'bijouterie-djoliba-bamako',
    rating: 4.7,
    reviewsCount: 45,
    salesCount: 175,
    description: 'Bijoux traditionnels et parures de mariage façonnés par des maîtres orfèvres maliens avec certificat d\'authenticité.',
    createdAt: Date.now() - 5 * 24 * 3600 * 1000
  }
];

// ============================================================================
// 3. LOGIQUE DE MONÉTISATION (PLAN PRO) : VÉRIFICATION ET PRIORITISATION
// ============================================================================

/**
 * Vérifie si un marchand bénéficie d'un abonnement Pro ou Élite
 */
export function isProStore(store: MarketDirectoryStore): boolean {
  if (store.verified) return true;
  const plan = String(store.plan || store.subscriptionPlan || '').toLowerCase();
  return plan.includes('pro') || plan.includes('elite') || plan.includes('vip') || plan.includes('enterprise');
}

/**
 * Trie systématiquement les boutiques en affichant les marchands Pro en premier (haut de liste),
 * suivi des boutiques ordinaires triées par note ou volume d'activité.
 */
export function sortStoresWithProFirst(stores: MarketDirectoryStore[]): MarketDirectoryStore[] {
  return [...stores].sort((a, b) => {
    const aPro = isProStore(a);
    const bPro = isProStore(b);

    // 1. Les comptes Pro sont strictement prioritaires
    if (aPro && !bPro) return -1;
    if (!aPro && bPro) return 1;

    // 2. En sous-classement, privilégier la note puis le volume
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (Math.abs(ratingDiff) > 0.05) return ratingDiff;

    return (b.salesCount || 0) - (a.salesCount || 0);
  });
}

// ============================================================================
// 4. RÉCUPÉRATION DES BOUTIQUES DEPUIS FIRESTORE ET DU CACHE
// ============================================================================

const CACHE_KEY = 'nana_market_directory_cache_v1';

/**
 * Récupère toutes les boutiques répertoriées dans l'annuaire depuis Firestore.
 * Fusionne avec les boutiques pilotes si la base est encore en phase de lancement.
 */
export async function getDirectoryStores(): Promise<MarketDirectoryStore[]> {
  const mergedStoresMap = new Map<string, MarketDirectoryStore>();

  // 1. Initialise avec les boutiques pilotes de référence
  SEED_DIRECTORY_STORES.forEach(s => mergedStoresMap.set(s.id, s));

  // 2. Tente la lecture depuis le cache local pour affichage instantané
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: MarketDirectoryStore[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(s => mergedStoresMap.set(s.id, s));
        }
      }
    }
  } catch (err) {
    console.warn('[NANA-MARKET] Erreur lecture cache local :', err);
  }

  // 3. Récupération temps réel depuis Supabase SQL
  try {
    // A. Interrogation des tenants depuis Supabase
    try {
      const { data: supaTenants } = await supabase
        .from('tenants')
        .select('*')
        .limit(50);

      if (supaTenants && supaTenants.length > 0) {
        supaTenants.forEach((tData: any) => {
          const storeId = tData.id || tData.slug;
          mergedStoresMap.set(storeId, {
            id: storeId,
            storeId,
            storeName: tData.name || 'Boutique Partenaire',
            logoUrl: '',
            bannerImage: '',
            category: 'Commerce Général',
            searchTags: [],
            city: 'Abidjan',
            quarter: '',
            country: "Côte d'Ivoire",
            isListedInDirectory: true,
            plan: 'pro',
            subscriptionPlan: 'pro',
            verified: true,
            whatsappPhone: '',
            phone: '',
            customDomain: tData.custom_domain,
            slug: tData.slug || storeId,
            rating: 4.8,
            salesCount: 120,
            description: 'Bienvenue sur notre boutique officielle.'
          });
        });
      }
    } catch (e) {
      console.warn('[NANA-MARKET] Notice requete tenants Supabase :', e);
    }

    // B. Interrogation des cartes nanamarket_cards depuis app_registry
    try {
      const { data: regCards } = await supabase
        .from('app_registry')
        .select('config_json, key')
        .eq('module_key', 'market_cards')
        .limit(100);

      if (regCards && regCards.length > 0) {
        regCards.forEach((row: any) => {
          if (row.config_json) {
            const cData = row.config_json as any;
            const cardId = cData.id || row.key.replace(/^market_card_/, '');
            mergedStoresMap.set(cardId, {
              ...cData,
              id: cardId,
              storeId: cData.storeId || cardId
            });
          }
        });
      }
    } catch (e) {
      console.warn('[NANA-MARKET] Notice requete app_registry market_cards :', e);
    }
  } catch (err) {
    console.error('[NANA-MARKET] Erreur globale récupération boutiques :', err);
  }

  const allStores = Array.from(mergedStoresMap.values()).filter(s => s.isListedInDirectory !== false);
  const sorted = sortStoresWithProFirst(allStores);

  // Mise en cache
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
    }
  } catch {}

  return sorted;
}

// ============================================================================
// 4b. PUBLICATION INSTANTANÉE (1-CLICK PUBLISH) SUR '/nanamarket_cards/$cardId'
// ============================================================================

export interface PublishMarketCardPayload {
  storeName: string;
  category: string;
  description: string;
  city: string;
  country?: string;
  quarter?: string;
  phone: string;
  whatsappPhone?: string;
  wameetHandle?: string;
  shopUrl?: string;
  logoUrl?: string;
  bannerImage?: string;
  merchantType?: DirectoryMerchantType;
  searchTags?: string[];
  storeId?: string;
}

/**
 * Publie instantanément une carte d'entreprise sur '/nanamarket_cards/$cardId'
 * avec status: 'published' et isPublic: true sans aucune étape de blocage.
 */
export async function publishNanaMarketCard(
  data: PublishMarketCardPayload
): Promise<MarketDirectoryStore> {
  const cardId = data.storeId || `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const cleanName = (data.storeName || 'Entreprise Partenaire').trim();
  const cleanPhone = (data.phone || '').trim();
  const cleanWameet = (data.wameetHandle || '').trim().replace(/^@/, '');
  const cleanShop = (data.shopUrl || '').trim();

  // Extraction automatique des tags de recherche
  const autoTags = [
    cleanName.toLowerCase(),
    data.category.toLowerCase(),
    (data.city || '').toLowerCase(),
    ...(Array.isArray(data.searchTags) ? data.searchTags : [])
  ].filter(Boolean);

  const publishedCard: MarketDirectoryStore = {
    id: cardId,
    storeId: cardId,
    storeName: cleanName,
    merchantType: data.merchantType || 'physical_store',
    logoUrl: data.logoUrl || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300&auto=format&fit=crop&q=80',
    bannerImage: data.bannerImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&auto=format&fit=crop&q=80',
    avatarUrl: data.logoUrl || '',
    category: data.category || 'Commerce Général',
    searchTags: Array.from(new Set(autoTags)),
    city: data.city || 'Abidjan',
    quarter: data.quarter || '',
    country: data.country || "Côte d'Ivoire",
    isListedInDirectory: false,
    isPublic: false,
    status: 'pending_approval' as any,
    plan: 'pro',
    subscriptionPlan: 'pro',
    verified: false,
    whatsappPhone: data.whatsappPhone || cleanPhone,
    phone: cleanPhone,
    wameetHandle: cleanWameet ? `@${cleanWameet}` : '',
    wameetUrl: cleanWameet ? `https://wameet.africa/@${cleanWameet}` : '',
    shopUrl: cleanShop,
    slug: cleanShop || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    rating: 5.0,
    reviewsCount: 1,
    salesCount: 0,
    description: (data.description || 'Boutique vérifiée sur NanaMarket. Découvrez nos produits et contactez-nous directement.').trim(),
    createdAt: now,
    updatedAt: now
  };

  // 1. Écriture dans Supabase app_registry (module_key: 'market_cards') en attente de validation Super Admin
  const { error: upsertErr } = await supabase.from('app_registry').upsert({
    key: `market_card_${cardId}`,
    name: cleanName || cardId,
    tenant_id: data.storeId || cardId,
    module_key: 'market_cards',
    config_json: publishedCard,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' });
  if (upsertErr) {
    console.error(`[NANA-MARKET] Erreur enregistrement Supabase market_card_${cardId} :`, upsertErr.message);
    throw new Error(upsertErr.message);
  }

  return publishedCard;
}

/**
 * Abonnement temps réel aux cartes NanaMarket publiées via Supabase Realtime
 */
export function subscribeToNanaMarketCards(
  onUpdate: (cards: MarketDirectoryStore[]) => void
): () => void {
  try {
    const fetchCards = async () => {
      try {
        const { data: rows, error } = await supabase
          .from('app_registry')
          .select('*')
          .eq('module_key', 'market_cards');

        if (error) {
          console.warn('[NANA-MARKET LISTENER WARNING]', error.message);
          return;
        }

        const realTimeCards: MarketDirectoryStore[] = [];
        (rows || []).forEach(row => {
          const cData = (row.config_json as any) || {};
          if (cData.isPublic === true && cData.status === 'published') {
            const cardId = cData.id || row.key.replace(/^market_card_/, '');
            realTimeCards.push({
              id: cardId,
              storeId: cData.storeId || cardId,
              storeName: cData.storeName || row.name || 'Entreprise Partenaire',
              merchantType: cData.merchantType || 'physical_store',
              logoUrl: cData.logoUrl || '',
              bannerImage: cData.bannerImage || '',
              category: cData.category || 'Commerce Général',
              searchTags: Array.isArray(cData.searchTags) ? cData.searchTags : [],
              city: cData.city || 'Abidjan',
              quarter: cData.quarter || '',
              country: cData.country || "Côte d'Ivoire",
              isListedInDirectory: true,
              isPublic: true,
              status: 'published',
              plan: cData.plan || 'pro',
              subscriptionPlan: cData.subscriptionPlan || 'pro',
              verified: cData.verified !== false,
              whatsappPhone: cData.whatsappPhone || cData.phone || '',
              phone: cData.phone || '',
              wameetHandle: cData.wameetHandle || '',
              wameetUrl: cData.wameetUrl || '',
              shopUrl: cData.shopUrl || '',
              slug: cData.slug || cardId,
              rating: Number(cData.rating) || 4.95,
              reviewsCount: Number(cData.reviewsCount) || 12,
              salesCount: Number(cData.salesCount) || 45,
              description: cData.description || '',
              createdAt: cData.createdAt || Date.now()
            });
          }
        });

        if (realTimeCards.length > 0) {
          onUpdate(realTimeCards);
        }
      } catch (err: any) {
        console.warn('[NANA-MARKET LISTENER WARNING]', err?.message);
      }
    };

    fetchCards();

    const channelName = `market_cards_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_registry',
        },
        () => {
          fetchCards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[NANA-MARKET SUBSCRIPTION ERROR]', err);
    return () => {};
  }
}

// ============================================================================
// 5. MISE À JOUR DU STATUT ANNUAIRE DU MARCHAND DANS SUPABASE
// ============================================================================

export interface UpdateStoreDirectoryPayload {
  isListedInDirectory: boolean;
  merchantType?: DirectoryMerchantType;
  category: string;
  searchTags: string[];
  quarter?: string;
  city?: string;
}

/**
 * Enregistre les métadonnées d'annuaire d'une boutique dans Supabase
 * (au niveau de `app_registry` sous `module_key: 'store_directory_settings'`).
 */
export async function updateStoreDirectorySettings(
  storeId: string,
  data: UpdateStoreDirectoryPayload,
  userId?: string
): Promise<void> {
  if (!storeId) return;

  const payload = {
    isListedInDirectory: Boolean(data.isListedInDirectory),
    merchantType: data.merchantType || 'physical_store',
    category: data.category || 'Commerce Général',
    searchTags: Array.isArray(data.searchTags) ? data.searchTags.map(t => t.trim().toLowerCase()).filter(Boolean) : [],
    quarter: data.quarter || '',
    city: data.city || '',
    updatedAt: Date.now()
  };

  // 1. Sauvegarde dans app_registry pour la boutique
  try {
    await supabase.from('app_registry').upsert({
      key: `store_dir_${storeId}`,
      name: `store_dir_${storeId}`,
      module_key: 'store_directory_settings',
      config_json: payload,
      updated_at: new Date().toISOString()
    });
    console.log(`[NANA-MARKET] Annuaire synchronisé dans Supabase app_registry/store_dir_${storeId}`);
  } catch (err) {
    console.warn(`[NANA-MARKET] Échec partiel store_dir_${storeId} :`, err);
  }

  // 2. Sauvegarde pour le userId si présent
  const effectiveUserId = userId || storeId;
  if (effectiveUserId !== storeId) {
    try {
      await supabase.from('app_registry').upsert({
        key: `store_dir_${effectiveUserId}`,
        name: `store_dir_${effectiveUserId}`,
        module_key: 'store_directory_settings',
        config_json: payload,
        updated_at: new Date().toISOString()
      });
    } catch {}
  }

  // 3. Invalidation / mise à jour du cache local
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const list: MarketDirectoryStore[] = JSON.parse(cached);
        const index = list.findIndex(s => s.id === storeId || s.storeId === storeId);
        if (index >= 0) {
          list[index] = { ...list[index], ...payload };
          localStorage.setItem(CACHE_KEY, JSON.stringify(sortStoresWithProFirst(list)));
        }
      }
    }
  } catch {}
}

// ============================================================================
// 6. UTILITAIRE DE FILTRAGE DES BOUTIQUES (RECHERCHE, ONGLETS & CATÉGORIES)
// ============================================================================

export type DirectoryMainTab = 'ALL' | 'PHYSICAL' | 'DIGITAL_EVENTS';

export function filterDirectoryStores(
  stores: MarketDirectoryStore[],
  options: {
    queryText?: string;
    selectedCategory?: string;
    selectedCity?: string;
    onlyPro?: boolean;
    activeTab?: DirectoryMainTab;
  }
): MarketDirectoryStore[] {
  const queryClean = (options.queryText || '').trim().toLowerCase();
  const categoryClean = options.selectedCategory && options.selectedCategory !== 'Toutes les Catégories'
    ? options.selectedCategory.toLowerCase()
    : null;
  const cityClean = options.selectedCity && options.selectedCity !== 'Toutes les Villes'
    ? options.selectedCity.toLowerCase()
    : null;

  const filtered = stores.filter(store => {
    // 0. Onglet Principal (Tabs) : 'PHYSICAL' vs 'DIGITAL_EVENTS' vs 'ALL'
    if (options.activeTab === 'PHYSICAL') {
      const type = store.merchantType || 'physical_store';
      if (type !== 'physical_store') return false;
    } else if (options.activeTab === 'DIGITAL_EVENTS') {
      const type = store.merchantType || 'physical_store';
      if (type !== 'digital_creator' && type !== 'event_host') return false;
    }

    // A. Filtre Pro uniquement
    if (options.onlyPro && !isProStore(store)) {
      return false;
    }

    // B. Filtre par Catégorie
    if (categoryClean && !store.category.toLowerCase().includes(categoryClean)) {
      return false;
    }

    // C. Filtre par Ville
    if (cityClean && !(store.city || '').toLowerCase().includes(cityClean)) {
      return false;
    }

    // D. Filtre textuel (Nom, Catégorie, Quartier, Description, ou Mots-clés searchTags)
    if (queryClean) {
      const matchName = store.storeName.toLowerCase().includes(queryClean);
      const matchCategory = store.category.toLowerCase().includes(queryClean);
      const matchCity = (store.city || '').toLowerCase().includes(queryClean);
      const matchQuarter = (store.quarter || '').toLowerCase().includes(queryClean);
      const matchDesc = (store.description || '').toLowerCase().includes(queryClean);
      const matchTags = (store.searchTags || []).some(tag => tag.toLowerCase().includes(queryClean));

      if (!matchName && !matchCategory && !matchCity && !matchQuarter && !matchDesc && !matchTags) {
        return false;
      }
    }

    return true;
  });

  return sortStoresWithProFirst(filtered);
}

/**
 * Récupère toutes les cartes NaNa Market (en attente, validées, refusées) pour le Dashboard Super Admin
 */
export function subscribeAllMarketCardsForAdmin(
  onUpdate: (cards: Array<MarketDirectoryStore & { status?: string; rejectionReason?: string }>) => void
): () => void {
  let isCancelled = false;

  const fetchAll = async () => {
    try {
      const { data: rows, error } = await supabase
        .from('app_registry')
        .select('*')
        .eq('module_key', 'market_cards');
      if (error || isCancelled) return;
      const list = (rows || []).map((row) => {
        const cData = (row.config_json as any) || {};
        const cardId = cData.id || row.key.replace(/^market_card_/, '');
        return {
          ...cData,
          id: cardId,
          storeId: cData.storeId || cardId,
          storeName: cData.storeName || row.name || 'Entreprise',
          status: cData.status || (cData.isPublic ? 'published' : 'pending_approval'),
          createdAt: cData.createdAt || Date.now(),
        };
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(list);
    } catch {}
  };

  fetchAll();

  const channel = supabase
    .channel(`admin_market_cards_${Math.random().toString(36).slice(2, 7)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_registry', filter: 'module_key=eq.market_cards' },
      () => fetchAll()
    )
    .subscribe();

  return () => {
    isCancelled = true;
    supabase.removeChannel(channel);
  };
}

/**
 * Validation Super Admin : rend la carte visible publiquement sur NaNa Market
 */
export async function approveMarketCard(cardId: string): Promise<void> {
  const key = cardId.startsWith('market_card_') ? cardId : `market_card_${cardId}`;
  const cleanId = key.replace(/^market_card_/, '');
  const { data: row } = await supabase
    .from('app_registry')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  const existing = (row?.config_json as any) || {};
  const approvedCard = {
    ...existing,
    id: cleanId,
    isListedInDirectory: true,
    isPublic: true,
    verified: true,
    status: 'published',
    approvedAt: Date.now(),
    updatedAt: Date.now(),
  };

  const { error } = await supabase
    .from('app_registry')
    .upsert({
      key,
      name: approvedCard.storeName || cleanId,
      tenant_id: approvedCard.storeId || cleanId,
      module_key: 'market_cards',
      config_json: approvedCard,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) throw new Error(error.message);

  // Sync miroir stores
  await supabase.from('app_registry').upsert({
    key: `store_${cleanId}`,
    name: approvedCard.storeName || cleanId,
    module_key: 'stores',
    config_json: approvedCard,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' }).catch(() => {});
}

/**
 * Refus / Masquage Super Admin d'une carte NaNa Market
 */
export async function rejectMarketCard(cardId: string, reason?: string): Promise<void> {
  const key = cardId.startsWith('market_card_') ? cardId : `market_card_${cardId}`;
  const cleanId = key.replace(/^market_card_/, '');
  const { data: row } = await supabase
    .from('app_registry')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  const existing = (row?.config_json as any) || {};
  const rejectedCard = {
    ...existing,
    id: cleanId,
    isListedInDirectory: false,
    isPublic: false,
    verified: false,
    status: 'rejected',
    rejectionReason: reason || 'Non conforme aux critères NaNa Market',
    updatedAt: Date.now(),
  };

  const { error } = await supabase
    .from('app_registry')
    .upsert({
      key,
      name: rejectedCard.storeName || cleanId,
      tenant_id: rejectedCard.storeId || cleanId,
      module_key: 'market_cards',
      config_json: rejectedCard,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
}

/**
 * Récupère le statut de la carte NaNa Market soumise par un marchand
 */
export async function getStoreMarketCard(storeId: string): Promise<(MarketDirectoryStore & { status?: string; rejectionReason?: string }) | null> {
  try {
    const { data: rows } = await supabase
      .from('app_registry')
      .select('*')
      .eq('module_key', 'market_cards')
      .eq('tenant_id', storeId)
      .limit(1);
    if (rows && rows.length > 0 && rows[0].config_json) {
      return rows[0].config_json as any;
    }
  } catch {}
  return null;
}

