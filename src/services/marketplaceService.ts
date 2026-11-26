import { db } from '../lib/supabaseBridge';
import { supabase } from '../lib/supabase';
import {
  collection,
  query,
  where,
  setDoc,
  doc,
  getDocs,
  serverTimestamp
} from '../lib/supabaseBridge';
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

export function mapSupabaseCourseToMarketplace(row: any): MarketplaceCourse {
  const s = row.settings || {};
  const modules = row.modules || s.modules || [];
  const totalDuration = modules.reduce((acc: number, m: any) => {
    return acc + (m.lessons || []).reduce((lacc: number, l: any) => lacc + (Number(l.durationMinutes) || 15), 0);
  }, 0);

  return {
    ...DEFAULT_MASTERCLASS_COURSE,
    id: row.id,
    title: row.title || s.title || `Formation ${row.id}`,
    tagline: row.description || s.description || (row.title ? `Maîtrisez ${row.title} de bout en bout.` : 'Formation complète et certifiante.'),
    description: row.description || s.description || '',
    coverImage: row.thumbnail_url || s.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    trailerVideoUrl: s.trailerVideoUrl || (modules[0]?.lessons?.[0]?.videoUrl) || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    price: Number(row.price != null ? row.price : (s.price != null ? s.price : 25000)),
    discountPrice: Number(row.price != null ? row.price : (s.price != null ? s.price : 25000)),
    originalPrice: Number(row.price ? Math.round(row.price * 1.5) : 40000),
    currency: 'FCFA',
    level: s.level || 'TOUS_NIVEAUX',
    category: s.category || 'Fintech & Mobile Money',
    rating: 5.0,
    reviewsCount: 1,
    enrolledCount: 1,
    totalDurationMinutes: totalDuration || 60,
    durationLabel: totalDuration ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m • ${modules.length} Modules` : `${modules.length} Modules`,
    certificateEnabled: true,
    status: row.status || 'published',
    modules: modules,
    instructor: s.instructor || {
      name: s.instructorName || 'Instructeur NaNa Academy',
      title: 'Formateur Certifié',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      bio: 'Expert professionnel agréé NaNa Academy.'
    },
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
  };
}

/**
 * Écouteur en temps réel pour tous les cours publiés (Supabase SQL & Firestore)
 * Garantit la disponibilité immédiate des cours créés par les formateurs
 */
const DISMISSED_EXAMPLES_KEY = 'nana_dismissed_example_courses_v1';

export function isExampleCourseId(courseId: string): boolean {
  return SEED_MARKETPLACE_COURSES.some((sc) => sc.id === courseId);
}

export function getDismissedExampleCourseIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_EXAMPLES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function getActiveSeedCourses(): MarketplaceCourse[] {
  const dismissed = new Set(getDismissedExampleCourseIds());
  return SEED_MARKETPLACE_COURSES.filter((c) => !dismissed.has(c.id));
}

export function dismissExampleCourse(courseId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = new Set(getDismissedExampleCourseIds());
    current.add(courseId);
    localStorage.setItem(DISMISSED_EXAMPLES_KEY, JSON.stringify(Array.from(current)));
    const cached = localStorage.getItem('nana_published_courses_cache');
    if (cached) {
      const list = JSON.parse(cached).filter((c: any) => c.id !== courseId);
      localStorage.setItem('nana_published_courses_cache', JSON.stringify(list));
    }
    window.dispatchEvent(new CustomEvent('nana_courses_updated'));
  } catch {}
}

export function dismissAllExampleCourses(): void {
  if (typeof window === 'undefined') return;
  try {
    const allSeedIds = SEED_MARKETPLACE_COURSES.map((c) => c.id);
    localStorage.setItem(DISMISSED_EXAMPLES_KEY, JSON.stringify(allSeedIds));
    const cached = localStorage.getItem('nana_published_courses_cache');
    if (cached) {
      const seedSet = new Set(allSeedIds);
      const list = JSON.parse(cached).filter((c: any) => !seedSet.has(c.id));
      localStorage.setItem('nana_published_courses_cache', JSON.stringify(list));
    }
    window.dispatchEvent(new CustomEvent('nana_courses_updated'));
  } catch {}
}

export function restoreExampleCourses(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DISMISSED_EXAMPLES_KEY);
    window.dispatchEvent(new CustomEvent('nana_courses_updated'));
  } catch {}
}

export async function deleteCourseEverywhere(courseId: string): Promise<boolean> {
  if (isExampleCourseId(courseId)) {
    dismissExampleCourse(courseId);
    return true;
  }
  try {
    await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}`, { method: 'DELETE' }).catch(() => {});
    await Promise.allSettled([
      supabase.from('courses').delete().eq('id', courseId),
      supabase.from('products').delete().eq('id', `course_prod_${courseId}`),
    ]);
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('nana_published_courses_cache');
      if (cached) {
        const list = JSON.parse(cached).filter((c: any) => c.id !== courseId);
        localStorage.setItem('nana_published_courses_cache', JSON.stringify(list));
      }
      localStorage.removeItem(`nana_course_structure_${courseId}`);
      window.dispatchEvent(new CustomEvent('nana_courses_updated'));
    }
    return true;
  } catch {
    return false;
  }
}

export function subscribeToPublishedCourses(
  callback: (courses: MarketplaceCourse[]) => void
): () => void {
  const coursesRef = collection(db, 'courses');
  const q = query(coursesRef, where('status', '==', 'published'));

  const buildInitialList = () => {
    const dismissed = new Set(getDismissedExampleCourseIds());
    let localCache = getActiveSeedCourses();
    try {
      const savedLocal = localStorage.getItem('nana_published_courses_cache');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleanParsed = parsed.filter((c: any) => !dismissed.has(c.id));
          localCache = mergeCourseLists(localCache, cleanParsed);
        }
      }
    } catch (e) {
      console.warn('Erreur lecture cache local cours:', e);
    }
    return localCache;
  };

  callback(buildInitialList());

  const fetchCourses = async () => {
    try {
      const dismissed = new Set(getDismissedExampleCourseIds());
      const allFoundCourses: MarketplaceCourse[] = [];

      // 1. Supabase Courses (Source Principale des Formateurs)
      try {
        const { data: supaData, error: supaErr } = await supabase
          .from('courses')
          .select('*')
          .neq('status', 'draft');

        if (!supaErr && Array.isArray(supaData)) {
          supaData.forEach(row => {
            if (!dismissed.has(String(row.id))) {
              allFoundCourses.push(mapSupabaseCourseToMarketplace(row));
            }
          });
        }
      } catch (err) {
        console.warn('[MARKETPLACE] Supabase fetch courses notice:', err);
      }

      // 2. Firestore Courses (Compatibilité)
      try {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            if (dismissed.has(docSnap.id)) return;
            const data = docSnap.data() as MarketplaceCourse;
            if (!allFoundCourses.some(c => c.id === docSnap.id)) {
              allFoundCourses.push({
                ...data,
                id: docSnap.id
              });
            }
          });
        }
      } catch (err) {
        console.warn('[MARKETPLACE] Firestore fetch courses notice:', err);
      }

      const merged = mergeCourseLists(getActiveSeedCourses(), allFoundCourses).filter(
        (c) => !dismissed.has(c.id)
      );
      localStorage.setItem('nana_published_courses_cache', JSON.stringify(merged));
      callback(merged);
    } catch (error) {
      console.warn('Mode autonome cours :', error);
      callback(buildInitialList());
    }
  };

  fetchCourses();

  const onLocalUpdate = () => {
    callback(buildInitialList());
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('nana_courses_updated', onLocalUpdate);
  }

  // Écoute temps réel des changements sur la table 'courses' Supabase
  const channelName = `courses_live_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'courses',
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

  // 1. Sauvegarde Firestore
  try {
    const docRef = doc(db, 'courses', courseId);
    await setDoc(docRef, fullCourse, { merge: true });
  } catch (err) {
    console.warn('Sauvegarde storage distante impossible, persistance locale prioritaire:', err);
  }

  // 2. Synchronisation Supabase SQL (pour accès direct classroom & SSR)
  try {
    await supabase.from('courses').upsert({
      id: courseId,
      title: fullCourse.title,
      description: fullCourse.description || fullCourse.tagline,
      price: fullCourse.price,
      status: 'published',
      modules: fullCourse.modules || [],
      thumbnail_url: fullCourse.coverImage || '',
      settings: {
        ...fullCourse,
        updatedAt: Date.now()
      },
      updated_at: new Date().toISOString()
    });
  } catch (supaErr) {
    console.warn('[MARKETPLACE] Erreur synchronisation Supabase courses:', supaErr);
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
  provider: 'WAVE' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'MTN_MOMO' | string;
  amount: number;
  studentId?: string;
  studentEmail?: string;
}): Promise<boolean> {
  const { courseId, studentName, phoneNumber, provider, amount, studentId, studentEmail } = params;
  const transactionId = `tx_${provider.toLowerCase()}_${Date.now()}`;
  const now = Date.now();
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const emailEffective = studentEmail || (cleanPhone ? `student_${cleanPhone}@nanasore.internal` : `student_${transactionId}@nanasore.internal`);

  // 1. Sauvegarde Firestore
  try {
    const enrollRef = doc(db, 'enrollments', transactionId);
    await setDoc(enrollRef, {
      id: transactionId,
      courseId,
      studentName,
      phoneNumber,
      studentEmail: emailEffective,
      provider,
      amount,
      currency: 'FCFA',
      status: 'PAID',
      createdAt: now
    });
  } catch (e) {
    console.warn('Persistance storage enrollment:', e);
  }

  // 2. Sauvegarde Supabase SQL enrollments (accès immédiat campus & instructeur)
  try {
    await supabase.from('enrollments').upsert({
      id: transactionId,
      course_id: courseId,
      user_id: studentId || (cleanPhone ? `phone_${cleanPhone}` : undefined),
      user_email: emailEffective,
      phone_number: phoneNumber,
      student_name: studentName,
      provider: provider,
      amount: amount,
      status: 'active',
      completed_lessons: [],
      progress_percent: 0,
      enrolled_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString()
    });
  } catch (supaErr) {
    console.warn('[MARKETPLACE] Erreur synchronisation Supabase enrollments:', supaErr);
  }

  // Active immédiatement l'accès étudiant en local
  localStorage.setItem(`nana_course_enrolled_${courseId}`, 'true');
  localStorage.setItem(`nana_student_name`, studentName);
  localStorage.setItem(`nana_student_phone`, phoneNumber);
  localStorage.setItem(`nana_student_email`, emailEffective);

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
 * Récupère un cours du marketplace par son ID (synchrone avec fallback)
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

/**
 * Récupère un cours de manière asynchrone depuis Supabase SQL avec cache
 */
export async function fetchMarketplaceCourseById(courseId: string): Promise<MarketplaceCourse> {
  // 1. Vérification dans le cache
  try {
    const saved = localStorage.getItem('nana_published_courses_cache');
    if (saved) {
      const list: MarketplaceCourse[] = JSON.parse(saved);
      const found = list.find(c => c.id === courseId);
      if (found && found.modules && found.modules.length > 0) return found;
    }
  } catch (e) {}

  // 2. Requête Supabase SQL
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!error && data) {
      const mapped = mapSupabaseCourseToMarketplace(data);
      try {
        const saved = localStorage.getItem('nana_published_courses_cache');
        const list: MarketplaceCourse[] = saved ? JSON.parse(saved) : [...SEED_MARKETPLACE_COURSES];
        const nextList = [mapped, ...list.filter(c => c.id !== mapped.id)];
        localStorage.setItem('nana_published_courses_cache', JSON.stringify(nextList));
      } catch (e) {}
      return mapped;
    }
  } catch (err) {
    console.warn('[MARKETPLACE] Erreur fetch Supabase course by id:', err);
  }

  // 3. Fallback synchrone
  return getMarketplaceCourseById(courseId);
}

