import { db } from '../firebaseConfig';
import { supabase } from '../lib/supabase';
import { PromoCampaign, CampaignBonusItem } from '../types/campaign';

// On-demand dynamic Firestore loader for sub-zero initial bundle weight
let firestorePromise: Promise<typeof import('firebase/firestore')> | null = null;
function loadFirestore() {
  if (!firestorePromise) {
    firestorePromise = import('firebase/firestore');
  }
  return firestorePromise;
}

/**
 * Utilitaire d'optimisation d'image pour environnements faible bande passante (3G/4G UEMOA)
 * Compresse et redimensionne les URLs Unsplash dynamiquement
 */
export function getOptimizedImageUrl(url: string, width = 600, quality = 75): string {
  if (!url) return '';
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }
  return url;
}

// Bibliothèque de Bonus Prêts-à-Empiler (Value Stack Neuro-Marketing)
export const AVAILABLE_BONUS_ITEMS: CampaignBonusItem[] = [
  {
    id: 'bonus-ussd-scripts',
    title: 'Pack 50 Scripts USSD & Paywalls Prêts-à-l\'Emploi',
    valueCFA: 45000,
    description: 'Codes sources prêts à copier/coller pour déclencher les menus Orange Money, Wave et MTN sans latence.'
  },
  {
    id: 'bonus-vip-whatsapp',
    title: 'Accès à Vie au Cercle Privé VIP WhatsApp des Dirigeants',
    valueCFA: 60000,
    description: 'Échangez directement avec Ibrahim P. Konkobo et le réseau des meilleurs entrepreneurs télécom d\'Afrique de l\'Ouest.'
  },
  {
    id: 'bonus-bceao-compliance',
    title: 'Kit Juridique de Conformité Réglementaire BCEAO & KYC',
    valueCFA: 40000,
    description: 'Modèles de conditions générales, contrats séquestres et fiches d\'identification des marchands homologuées.'
  },
  {
    id: 'bonus-pos-offline-template',
    title: 'Template Applicatif Caisse Connectée Mode Hors-Ligne',
    valueCFA: 50000,
    description: 'Architecture IndexedDB + synchronisation par lots pour garantir 100% des ventes sans connexion Internet.'
  }
];

// Modèles d'accroches neuro-marketing ultra-performantes
export const HIGH_CONVERTING_HOOKS = [
  {
    category: 'Urgence & Rareté (Scarcity)',
    hook: '🔥 Vente Flash 48h : Bénéficiez de 70% de réduction immédiate avant fermeture définitive des inscriptions !'
  },
  {
    category: 'Transformation & ROI',
    hook: '🚀 Maîtrisez le Mobile Money & les Systèmes Télécom en 30 jours et encaissez vos premiers paiements automatisés.'
  },
  {
    category: 'Exclusivité & Autorité',
    hook: '⭐ Masterclass Privée avec Ibrahim P. Konkobo : Les secrets d\'infrastructure télécom révélés sans filtre.'
  },
  {
    category: 'Résilience Business',
    hook: '⚡ Zéro Coupure, Zéro Perte : Automatisez vos encaissements marchands même en cas de panne réseau.'
  }
];

// Campagnes d'amorçage ultra-optimisées pour test immédiat
export const SEED_PROMO_CAMPAIGNS: PromoCampaign[] = [
  {
    id: 'camp_telecom_flash_48h',
    courseId: 'telecom-fintech-masterclass',
    courseTitle: 'Masterclass : Architecture Télécom & Passerelles Mobile Money UEMOA',
    courseCoverImage: getOptimizedImageUrl('https://images.unsplash.com/photo-1559526324-4b87b5e36e44', 800, 75),
    courseTrailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    category: 'Fintech & Mobile Money',
    campaignName: 'Vente Flash 48H Télécom & Fintech UEMOA',
    headline: '🔥 70% de Réduction Immédiate : Devenez un Expert Télécom & Mobile Money Certifié en 48 Heures !',
    subheadline: 'Accédez à l\'infrastructure complète utilisée par les leaders de la zone UEMOA + Pack de scripts offerts.',
    originalPrice: 75000,
    discountPrice: 25000,
    currency: 'FCFA',
    deadlineTimestamp: Date.now() + 48 * 3600 * 1000,
    ctaType: 'HYBRID',
    ctaLabel: 'Débloquer l\'Accès Immédiat (25 000 FCFA)',
    bonusItems: [
      AVAILABLE_BONUS_ITEMS[0],
      AVAILABLE_BONUS_ITEMS[1],
      AVAILABLE_BONUS_ITEMS[2]
    ],
    instructor: {
      name: 'Ibrahim Pousbila Konkobo',
      title: 'Fondateur & Expert Télécom / Mobile Money UEMOA',
      avatarUrl: getOptimizedImageUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb', 200, 75),
      phoneWhatsApp: '+22670000000'
    },
    urgencyScarcity: {
      totalSeats: 30,
      remainingSeats: 6
    },
    stats: {
      viewsCount: 342,
      clicksCount: 89,
      conversionsCount: 24,
      totalRevenueCFA: 600000
    },
    status: 'active',
    createdAt: Date.now() - 3600 * 1000 * 6,
    updatedAt: Date.now()
  },
  {
    id: 'camp_pos_offline_launch',
    courseId: 'course-pos-resilience-offline',
    courseTitle: 'Architecture Caisses Connectées & Mode Déconnecté (Offline-First)',
    courseCoverImage: getOptimizedImageUrl('https://images.unsplash.com/photo-1556742049-0a67c5574f73', 800, 75),
    courseTrailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    category: 'Systèmes POS & Résilience',
    campaignName: 'Lancement Spécial POS Hors-Ligne',
    headline: '⚡ Encaissez 100% de vos ventes sans jamais dépendre d\'Internet ni de la 4G',
    subheadline: 'Le système complet de synchronisation déconnectée sur téléphones Android & imprimantes thermiques.',
    originalPrice: 50000,
    discountPrice: 20000,
    currency: 'FCFA',
    deadlineTimestamp: Date.now() + 72 * 3600 * 1000,
    ctaType: 'MOBILE_MONEY',
    ctaLabel: 'Activer la Licence POS (20 000 FCFA)',
    bonusItems: [
      AVAILABLE_BONUS_ITEMS[3],
      AVAILABLE_BONUS_ITEMS[1]
    ],
    instructor: {
      name: 'Ibrahim Pousbila Konkobo',
      title: 'Fondateur & Expert Télécom / Mobile Money UEMOA',
      avatarUrl: getOptimizedImageUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb', 200, 75),
      phoneWhatsApp: '+22670000000'
    },
    urgencyScarcity: {
      totalSeats: 25,
      remainingSeats: 4
    },
    stats: {
      viewsCount: 198,
      clicksCount: 52,
      conversionsCount: 14,
      totalRevenueCFA: 280000
    },
    status: 'active',
    createdAt: Date.now() - 3600 * 1000 * 12,
    updatedAt: Date.now()
  }
];

const LOCAL_STORAGE_KEY = 'nana_promo_campaigns_cache';

/**
 * Récupère le cache local des campagnes (synchrone à 0ms)
 */
export function getLocalCampaigns(): PromoCampaign[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeCampaignLists(SEED_PROMO_CAMPAIGNS, parsed);
      }
    }
  } catch (e) {
    console.warn('Erreur lecture cache local campagnes:', e);
  }
  return [...SEED_PROMO_CAMPAIGNS];
}

/**
 * Fusionne deux listes de campagnes sans doublons
 */
function mergeCampaignLists(base: PromoCampaign[], incoming: PromoCampaign[]): PromoCampaign[] {
  const map = new Map<string, PromoCampaign>();
  base.forEach(c => map.set(c.id, c));
  incoming.forEach(c => map.set(c.id, { ...map.get(c.id), ...c }));
  return Array.from(map.values());
}

/**
 * Sauvegarde et synchronise une campagne (Firestore à la demande + localStorage)
 */
export async function saveCampaign(campaign: PromoCampaign): Promise<PromoCampaign> {
  const updatedCampaign = {
    ...campaign,
    updatedAt: Date.now()
  };

  // 1. Mise à jour synchrone du cache local immédiat (0ms)
  try {
    const current = getLocalCampaigns();
    const updated = [updatedCampaign, ...current.filter(c => c.id !== campaign.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Erreur écriture cache local campagne:', e);
  }

  // 2. Persistance asynchrone Firestore à la demande
  try {
    const { doc, setDoc } = await loadFirestore();
    const docRef = doc(db, 'campaigns', campaign.id);
    await setDoc(docRef, updatedCampaign, { merge: true });
  } catch (err) {
    console.warn('Persistance Firestore campagne dégradée (mode autonome actif):', err);
  }

  return updatedCampaign;
}

/**
 * Récupère une campagne par son ID avec résolution ultra-rapide (cache d'abord)
 */
export async function getCampaignById(campaignId: string): Promise<PromoCampaign | null> {
  // 1. Résolution immédiate dans le cache local (0ms)
  const localList = getLocalCampaigns();
  const found = localList.find(c => c.id === campaignId);
  if (found) return found;

  // 2. Fallback asynchrone Firestore
  try {
    const { doc, getDoc } = await loadFirestore();
    const docRef = doc(db, 'campaigns', campaignId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as PromoCampaign;
      return { ...data, id: snap.id };
    }
  } catch (e) {
    console.warn('Erreur récupération Firestore campagne:', e);
  }

  // 3. Fallback sur le premier seed
  const seedMatch = SEED_PROMO_CAMPAIGNS.find(c => c.id === campaignId);
  if (seedMatch) return seedMatch;

  return null;
}

/**
 * Écouteur en temps réel optimisé pour les campagnes de l'instructeur
 */
export function subscribeToCampaigns(
  callback: (campaigns: PromoCampaign[]) => void
): () => void {
  // Notification synchrone immédiate avec le cache local (0ms)
  callback(getLocalCampaigns());

  let isCancelled = false;

  const fetchCampaigns = async () => {
    try {
      const { collection, query, orderBy, getDocs } = await loadFirestore();
      if (isCancelled) return;
      const campaignsRef = collection(db, 'campaigns');
      const q = query(campaignsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreList: PromoCampaign[] = [];
        snapshot.forEach((docSnap) => {
          firestoreList.push({ ...(docSnap.data() as PromoCampaign), id: docSnap.id });
        });
        const merged = mergeCampaignLists(SEED_PROMO_CAMPAIGNS, firestoreList);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        callback(merged);
      }
    } catch (e) {
      console.warn('Lecture campagnes autonome :', e);
      callback(getLocalCampaigns());
    }
  };

  fetchCampaigns();

  // Écouteur Supabase Realtime
  const channelName = `campaigns_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'email_campaigns',
      },
      () => {
        fetchCampaigns();
      }
    )
    .subscribe();

  return () => {
    isCancelled = true;
    supabase.removeChannel(channel);
  };
}

/**
 * Enregistre une visite sur le lien tracké du Funnel (non-bloquant & anti-rebond)
 */
export async function trackCampaignVisit(
  campaignId: string,
  metadata: { referrer?: string; userAgent?: string } = {}
): Promise<void> {
  // Anti-rebond par session (évite de spammer les écritures réseau)
  const sessionKey = `nana_viewed_campaign_${campaignId}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, '1');

  // 1. Incrément local immédiat
  try {
    const current = getLocalCampaigns();
    const updated = current.map(c => {
      if (c.id === campaignId) {
        return {
          ...c,
          stats: {
            ...c.stats,
            viewsCount: (c.stats.viewsCount || 0) + 1
          }
        };
      }
      return c;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  // 2. Incrément asynchrone non-bloquant en tâche de fond
  try {
    const { doc, updateDoc, increment, collection, setDoc } = await loadFirestore();
    const docRef = doc(db, 'campaigns', campaignId);
    await updateDoc(docRef, {
      'stats.viewsCount': increment(1)
    });

    const visitRef = doc(collection(db, 'campaign_visits'));
    await setDoc(visitRef, {
      campaignId,
      timestamp: Date.now(),
      referrer: metadata.referrer || document.referrer || 'direct',
      userAgent: metadata.userAgent || navigator.userAgent || ''
    });
  } catch (err) {
    console.warn('Erreur tracking visite Firestore:', err);
  }
}

/**
 * Enregistre une conversion et le chiffre d'affaires généré par le Funnel
 */
export async function trackCampaignConversion(
  campaignId: string,
  amount: number
): Promise<void> {
  // 1. Incrément local immédiat
  try {
    const current = getLocalCampaigns();
    const updated = current.map(c => {
      if (c.id === campaignId) {
        return {
          ...c,
          stats: {
            ...c.stats,
            conversionsCount: (c.stats.conversionsCount || 0) + 1,
            totalRevenueCFA: (c.stats.totalRevenueCFA || 0) + amount
          },
          urgencyScarcity: {
            ...c.urgencyScarcity,
            remainingSeats: Math.max(1, (c.urgencyScarcity?.remainingSeats || 5) - 1)
          }
        };
      }
      return c;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  // 2. Incrément asynchrone Firestore
  try {
    const { doc, updateDoc, increment } = await loadFirestore();
    const docRef = doc(db, 'campaigns', campaignId);
    await updateDoc(docRef, {
      'stats.conversionsCount': increment(1),
      'stats.totalRevenueCFA': increment(amount),
      'urgencyScarcity.remainingSeats': increment(-1)
    });
  } catch (err) {
    console.warn('Erreur tracking conversion Firestore:', err);
  }
}

/**
 * Génère les URLs de partage social ultra-optimisées et le message viral WhatsApp
 */
export function generateSocialShareData(campaign: PromoCampaign, originUrl?: string) {
  const origin = originUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://nanasore.com');
  const promoUrl = `${origin}/promo/${campaign.id}`;

  const discountPercent = Math.round(((campaign.originalPrice - campaign.discountPrice) / campaign.originalPrice) * 100);

  // Message WhatsApp Viral à Haute Conversion
  const whatsappMessage = 
`⚡ *OFFRE SPÉCIALE LIMITÉE : ${discountPercent}% DE RÉDUCTION !* ⚡

${campaign.headline}

📚 *Formation :* ${campaign.courseTitle}
💰 *Prix Promo :* ~${campaign.originalPrice.toLocaleString('fr-FR')} FCFA~ 👉 *${campaign.discountPrice.toLocaleString('fr-FR')} FCFA*
🎁 *Bonus Inclus :* ${campaign.bonusItems.map(b => b.title).join(' + ')}
⚠️ *Disponibilité :* Plus que *${campaign.urgencyScarcity?.remainingSeats || 5} places disponibles* au tarif préférentiel !

👇 *Cliquez ici pour accéder à l'offre avant expiration :*
${promoUrl}

_Formation dispensée par Ibrahim Pousbila Konkobo (ENTREPRISE KONKOBO POUSBILA)_`;

  const encodedUrl = encodeURIComponent(promoUrl);
  const encodedText = encodeURIComponent(whatsappMessage);

  return {
    promoUrl,
    whatsappMessage,
    whatsappDeepLink: `whatsapp://send?text=${encodedText}`,
    whatsappWebLink: `https://api.whatsapp.com/send?text=${encodedText}`,
    facebookLink: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedinLink: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    twitterLink: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(campaign.headline)}`,
    telegramLink: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(campaign.headline)}`
  };
}

/**
 * Injecte dynamiquement les balises Open Graph et Twitter Card dans document.head
 */
export function injectOpenGraphMeta(campaign: PromoCampaign): void {
  if (typeof document === 'undefined') return;

  const currentOrigin = window.location.origin;
  const promoUrl = `${currentOrigin}/promo/${campaign.id}`;
  const title = `${campaign.campaignName} • -${Math.round(((campaign.originalPrice - campaign.discountPrice) / campaign.originalPrice) * 100)}% de Réduction`;
  const description = `${campaign.headline} - Offre limitée à ${campaign.discountPrice.toLocaleString('fr-FR')} FCFA. Bonus exclusifs inclus !`;
  const image = campaign.courseCoverImage || getOptimizedImageUrl('https://images.unsplash.com/photo-1559526324-4b87b5e36e44', 800, 75);

  document.title = title;

  const setMeta = (attrName: string, attrValue: string, content: string) => {
    let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:url', promoUrl);
  setMeta('property', 'og:type', 'product');
  setMeta('property', 'og:site_name', 'Nanasore Academy • ENTREPRISE KONKOBO POUSBILA');

  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);
}
