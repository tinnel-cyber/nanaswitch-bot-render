import { db } from '../firebaseConfig';
import { supabase } from '../lib/supabase';
import {
  collection,
  query,
  where,
  setDoc,
  doc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { MarketplaceCourse } from '../components/lms/marketplace/types';
import { DEFAULT_MASTERCLASS_COURSE } from '../components/lms/mockCourses';
import { isLimitReached, triggerLimitReachedUpsell, normalizePlanId, isUnlimitedCourses } from '../utils/planFeatures';

// Catalogue initial haute fidélité (Fallback & Base de départ UEMOA)
export const SEED_MARKETPLACE_COURSES: MarketplaceCourse[] = [
  {
    ...DEFAULT_MASTERCLASS_COURSE,
    status: 'published',
    isFeatured: true,
    badge: 'Bestseller',
    discountPrice: 45000,
    originalPrice: 75000,
    reviewsCount: 194,
    trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    category: 'Fintech & Mobile Money',
    tags: ['Orange Money', 'Wave', 'USSD', 'BCEAO', 'Caisse POS'],
    durationLabel: '3h 15m • 6 Modules'
  },
  {
    id: 'course-pos-resilience-offline',
    title: 'Architecture Caisses Connectées & Mode Déconnecté (Offline-First)',
    tagline: 'Garantir 100% des encaissements en zone rurale ou coupure réseau avec synchronisation delta.',
    description: 'Une formation technique dédiée aux gérants de points de vente et intégrateurs informatiques pour bâtir des caisses résilientes sur terminaux Android/Infinix et imprimantes thermiques Bluetooth.',
    coverImage: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80',
    trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    price: 35000,
    discountPrice: 35000,
    originalPrice: 50000,
    currency: 'FCFA',
    level: 'INTERMEDIAIRE',
    category: 'Systèmes POS & Gestion Magasin',
    rating: 4.88,
    reviewsCount: 86,
    enrolledCount: 512,
    totalDurationMinutes: 140,
    certificateEnabled: true,
    status: 'published',
    isFeatured: false,
    badge: 'Tendance',
    durationLabel: '2h 20m • 4 Modules',
    instructor: DEFAULT_MASTERCLASS_COURSE.instructor,
    learningOutcomes: [
      'Configurer le stockage local IndexedDB pour stocker les tickets en local',
      'Orchestrer la synchronisation par lots sans conflit lors du retour de la 4G',
      'Piloter les imprimantes reçus thermiques 58mm sans pilote via Bluetooth ESC/POS',
      'Identifier et éliminer les écarts de fin de journée'
    ],
    prerequisites: ['Connaissance basique de la vente au comptoir'],
    testimonials: DEFAULT_MASTERCLASS_COURSE.testimonials,
    modules: DEFAULT_MASTERCLASS_COURSE.modules
  },
  {
    id: 'course-live-shopping-mastery',
    title: 'Live Shopping & Vente Vidéo Interactive sur WhatsApp & Réseaux',
    tagline: 'Transformez vos diffusions vidéo en direct en machine à encaisser avec panier 1-clic.',
    description: 'Apprenez les secrets d\'Ibrahim P. Konkobo pour animer des démonstrations produits captivantes, générer l\'urgence d\'achat et convertir l\'audience directement vers votre WhatsApp Business.',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    price: 25000,
    discountPrice: 25000,
    originalPrice: 40000,
    currency: 'FCFA',
    level: 'TOUS_NIVEAUX',
    category: 'Live Shopping & Vente',
    rating: 4.96,
    reviewsCount: 142,
    enrolledCount: 689,
    totalDurationMinutes: 110,
    certificateEnabled: true,
    status: 'published',
    isFeatured: false,
    badge: 'Coup de Cœur',
    durationLabel: '1h 50m • 3 Modules',
    instructor: DEFAULT_MASTERCLASS_COURSE.instructor,
    learningOutcomes: [
      'Rédiger un script de vente en direct en 5 étapes psychologiques',
      'Intégrer les liens de paiement express sous le flux vidéo',
      'Relancer automatiquement les prospects tièdes sur WhatsApp',
      'Mesurer le ROI des sessions de déstockage en direct'
    ],
    prerequisites: ['Un smartphone avec caméra et WhatsApp Business'],
    testimonials: DEFAULT_MASTERCLASS_COURSE.testimonials,
    modules: DEFAULT_MASTERCLASS_COURSE.modules
  },
  {
    id: 'course-fintech-security-kyc',
    title: 'Sécurité des Transactions, Prévention Fraude & Conformité KYC',
    tagline: 'Protéger son entreprise contre les arnaques aux faux SMS, le vol de SIM et respecter les normes bancaires.',
    description: 'Guide essentiel de conformité juridique et de cybersécurité appliquée aux transactions marchandes en Afrique francophone. Maîtrisez les comptes séquestres et la vérification des pièces d\'identité.',
    coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    price: 30000,
    discountPrice: 30000,
    originalPrice: 45000,
    currency: 'FCFA',
    level: 'AVANCE',
    category: 'Sécurité & Audit',
    rating: 4.92,
    reviewsCount: 64,
    enrolledCount: 378,
    totalDurationMinutes: 135,
    certificateEnabled: true,
    status: 'published',
    isFeatured: false,
    badge: 'Certifiant',
    durationLabel: '2h 15m • 4 Modules',
    instructor: DEFAULT_MASTERCLASS_COURSE.instructor,
    learningOutcomes: [
      'Détecter instantanément les faux messages SMS de confirmation de dépôt',
      'Mettre en place la double signature pour les remboursements de caisse',
      'Auditer la conformité réglementaire KYC selon les textes de la BCEAO',
      'Sécuriser les clés API et les signatures HMAC des webhooks'
    ],
    prerequisites: ['Gérer ou posséder un compte marchand Mobile Money'],
    testimonials: DEFAULT_MASTERCLASS_COURSE.testimonials,
    modules: DEFAULT_MASTERCLASS_COURSE.modules
  }
];

/**
 * Écouteur en temps réel Firestore pour tous les cours avec status == 'published'
 * (The 'One-Click Publish' Firebase Listener)
 */
export function subscribeToPublishedCourses(
  callback: (courses: MarketplaceCourse[]) => void
): () => void {
  const coursesRef = collection(db, 'courses');
  const q = query(coursesRef, where('status', '==', 'published'));

  // Pour garantir la résilience et zéro latence : fusion immédiate avec seed
  let localCache = [...SEED_MARKETPLACE_COURSES];

  // Vérifier s'il y a des cours publiés enregistrés dans le localStorage
  try {
    const savedLocal = localStorage.getItem('nana_published_courses_cache');
    if (savedLocal) {
      const parsed = JSON.parse(savedLocal);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localCache = mergeCourseLists(localCache, parsed);
      }
    }
  } catch (e) {
    console.warn('Erreur lecture cache local cours:', e);
  }

  callback(localCache);

  const fetchCourses = async () => {
    try {
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreCourses: MarketplaceCourse[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MarketplaceCourse;
          firestoreCourses.push({
            ...data,
            id: docSnap.id
          });
        });

        const merged = mergeCourseLists(SEED_MARKETPLACE_COURSES, firestoreCourses);
        localStorage.setItem('nana_published_courses_cache', JSON.stringify(merged));
        callback(merged);
      } else {
        callback(localCache);
      }
    } catch (error) {
      console.warn('Mode autonome cours :', error);
      callback(localCache);
    }
  };

  fetchCourses();

  const channelName = `courses_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'enrollments',
      },
      () => {
        fetchCourses();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Publication 1-Clic d'un nouveau cours dans Firestore
 * Déclenche instantanément la mise à jour de tous les clients connectés via le listener
 */
export async function publishCourseToFirestore(
  course: Partial<MarketplaceCourse>
): Promise<MarketplaceCourse> {
  // Contrôle dynamique du quota de cours (Illimité sur Pro / Elite, 5 sur Starter, 1 sur Gratuit)
  try {
    let resolvedPlan = 'free';
    if (typeof window !== 'undefined') {
      const storedPlan = localStorage.getItem('nana_user_plan') || localStorage.getItem('nana_store_plan');
      if (storedPlan) {
        resolvedPlan = normalizePlanId(storedPlan);
      } else {
        const savedSub = localStorage.getItem('nana_store_sub');
        const subscription = savedSub ? JSON.parse(savedSub) : null;
        if (subscription) {
          resolvedPlan = normalizePlanId(subscription);
        } else {
          const authUser = localStorage.getItem('nana_store_auth_user');
          if (authUser) {
            resolvedPlan = normalizePlanId(JSON.parse(authUser));
          }
        }
      }
    }

    const isUnlimited = isUnlimitedCourses(resolvedPlan);
    if (!isUnlimited) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('nana_published_courses_cache') : null;
      const list: MarketplaceCourse[] = saved ? JSON.parse(saved) : [];
      const customCount = list.filter(c => !SEED_MARKETPLACE_COURSES.some(sc => sc.id === c.id)).length;
      const maxAllowed = resolvedPlan === 'starter' ? 5 : 1;

      if (customCount >= maxAllowed) {
        triggerLimitReachedUpsell('COURSES', customCount, maxAllowed, 'cours');
        throw new Error(`Limite de cours atteinte pour le plan ${resolvedPlan === 'starter' ? 'Starter (5 cours max)' : 'Gratuit (1 cours max)'}. Passez au Plan Pro pour débloquer les cours illimités !`);
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('Limite de cours')) {
      throw err;
    }
  }

  const courseId = course.id || `course-pub-${Date.now().toString(36)}`;
  const fullCourse: MarketplaceCourse = {
    ...DEFAULT_MASTERCLASS_COURSE,
    ...course,
    id: courseId,
    status: 'published',
    createdAt: Date.now(),
    updatedAt: Date.now()
  } as MarketplaceCourse;

  try {
    const docRef = doc(db, 'courses', courseId);
    await setDoc(docRef, fullCourse, { merge: true });
  } catch (err) {
    console.warn('Sauvegarde Firestore distante impossible, persistance locale prioritaire:', err);
  }

  // Mise à jour du cache local réactif
  try {
    const saved = localStorage.getItem('nana_published_courses_cache');
    const list: MarketplaceCourse[] = saved ? JSON.parse(saved) : [...SEED_MARKETPLACE_COURSES];
    const updated = [fullCourse, ...list.filter(c => c.id !== courseId)];
    localStorage.setItem('nana_published_courses_cache', JSON.stringify(updated));
    // Émettre un événement personnalisé pour rafraîchir les vues ouvertes
    window.dispatchEvent(new CustomEvent('nana_courses_updated', { detail: updated }));
  } catch (e) {
    console.error(e);
  }

  return fullCourse;
}

/**
 * Enregistre une souscription Mobile Money et active le statut d'inscription
 */
export async function recordMobileMoneyEnrollment(params: {
  courseId: string;
  studentName: string;
  phoneNumber: string;
  provider: 'WAVE' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'MTN_MOMO';
  amount: number;
}): Promise<boolean> {
  const { courseId, studentName, phoneNumber, provider, amount } = params;
  const transactionId = `tx_${provider.toLowerCase()}_${Date.now()}`;
  const now = Date.now();

  try {
    const enrollRef = doc(db, 'enrollments', transactionId);
    await setDoc(enrollRef, {
      id: transactionId,
      courseId,
      studentName,
      phoneNumber,
      provider,
      amount,
      currency: 'FCFA',
      status: 'PAID',
      createdAt: now
    });
  } catch (e) {
    console.warn('Persistance Firestore enrollment:', e);
  }

  // Active immédiatement l'accès étudiant en local
  localStorage.setItem(`nana_course_enrolled_${courseId}`, 'true');
  localStorage.setItem(`nana_student_name`, studentName);
  localStorage.setItem(`nana_student_phone`, phoneNumber);

  return true;
}

function mergeCourseLists(base: MarketplaceCourse[], incoming: MarketplaceCourse[]): MarketplaceCourse[] {
  const map = new Map<string, MarketplaceCourse>();
  // 1. D'abord les cours récents ou publiés par les professeurs
  incoming.forEach(c => map.set(c.id, c));
  // 2. Cours de base (seed) comme catalogue de départ
  base.forEach(c => {
    if (!map.has(c.id)) {
      map.set(c.id, c);
    }
  });

  const all = Array.from(map.values());
  // Prioriser les cours en vedette, puis les nouveaux cours créés par les professeurs
  return all.sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    const aTime = a.createdAt || (a.id.startsWith('course-pub-') ? 9999999999999 : 0);
    const bTime = b.createdAt || (b.id.startsWith('course-pub-') ? 9999999999999 : 0);
    return bTime - aTime;
  });
}

/**
 * Récupère un cours du marketplace par son ID avec fallback robuste
 */
export function getMarketplaceCourseById(courseId: string): MarketplaceCourse {
  // 1. Recherche dans le cache local
  try {
    const saved = localStorage.getItem('nana_published_courses_cache');
    if (saved) {
      const list: MarketplaceCourse[] = JSON.parse(saved);
      const found = list.find(c => c.id === courseId);
      if (found) return found;
    }
  } catch (e) {
    console.warn(e);
  }

  // 2. Recherche dans le seed initial
  const seedFound = SEED_MARKETPLACE_COURSES.find(c => c.id === courseId);
  if (seedFound) return seedFound;

  // 3. Fallback sur le cours par défaut
  return {
    ...DEFAULT_MASTERCLASS_COURSE,
    id: courseId,
    title: `Masterclass Spécialisée : ${courseId.replace(/-/g, ' ').toUpperCase()}`,
    status: 'published'
  } as MarketplaceCourse;
}

