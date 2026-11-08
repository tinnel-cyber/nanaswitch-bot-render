import { db } from '../firebaseConfig';
import { 
  collection, 
  getDocs,
  query, 
  orderBy, 
  doc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { supabase } from '../lib/supabase';
import { AssignmentSubmission, StudentRosterItem, InstructorKpiMetrics } from '../types';

export interface EnrollmentRecord {
  id: string;
  courseId: string;
  studentName: string;
  phoneNumber?: string;
  email?: string;
  provider?: string;
  amount: number;
  currency?: string;
  status: string;
  createdAt: number;
}

export interface FinancialDataPoint {
  date: string;
  gains: number;
  retraits: number;
  bonus: number;
}

export type AnalyticsPeriod = '7j' | '30j' | '12m';

export interface ComputedFinancials {
  data: FinancialDataPoint[];
  totalGains: number;
  totalRetraits: number;
  totalBonus: number;
  soldeDisponible: number;
  hasSales: boolean;
}

const ENROLLMENTS_CACHE_KEY = 'nana_enrollments_cache';
const SUBMISSIONS_CACHE_KEY = 'nana_submissions_cache';
const ROSTER_CACHE_KEY = 'nana_roster_cache';

/**
 * Nettoie les caches locaux formateur (inscriptions, devoirs, liste apprenants)
 */
export function clearInstructorLocalCaches(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ENROLLMENTS_CACHE_KEY);
      localStorage.removeItem(SUBMISSIONS_CACHE_KEY);
      localStorage.removeItem(ROSTER_CACHE_KEY);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('nana_enrollments_cache') || k.startsWith('nana_roster_cache') || k.startsWith('nana_submissions_cache'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('[INSTRUCTOR DATA] Erreur nettoyage caches locaux:', e);
  }
}

/**
 * Abonnement en temps réel aux inscriptions (enrollments) réelles depuis Firestore
 */
export function subscribeToEnrollments(
  callback: (enrollments: EnrollmentRecord[]) => void,
  options?: { instructorId?: string; courseIds?: string[] }
): () => void {
  const cacheKey = options?.instructorId ? `${ENROLLMENTS_CACHE_KEY}_${options.instructorId}` : ENROLLMENTS_CACHE_KEY;

  // 1. Initialisation avec le cache local pour éviter les sursauts visuels
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      callback(JSON.parse(cached));
    } else {
      callback([]);
    }
  } catch (e) {
    callback([]);
  }

  // 2. Écouteur Supabase Realtime (remplace Firestore onSnapshot)
  try {
    const fetchEnrollments = async () => {
      try {
        const colRef = collection(db, 'enrollments');
        const q = query(colRef);
        const snapshot = await getDocs(q);
        const list: EnrollmentRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (options?.instructorId && data.instructorId && data.instructorId !== options.instructorId) {
            return;
          }
          if (options?.courseIds && options.courseIds.length > 0 && !options.courseIds.includes(data.courseId)) {
            return;
          }
          list.push({
            id: docSnap.id,
            courseId: data.courseId || '',
            studentName: data.studentName || 'Apprenant',
            phoneNumber: data.phoneNumber || '',
            email: data.email || '',
            provider: data.provider || 'MOBILE_MONEY',
            amount: Number(data.amount) || 0,
            currency: data.currency || 'FCFA',
            status: data.status || 'PAID',
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now()
          });
        });

        try {
          if (typeof window !== 'undefined') {
            if (list.length === 0) {
              localStorage.removeItem(cacheKey);
            } else {
              localStorage.setItem(cacheKey, JSON.stringify(list));
            }
          }
        } catch (e) {}

        callback(list);
      } catch (err) {
        console.warn('[INSTRUCTOR DATA] Erreur lecture enrollments :', err);
      }
    };

    fetchEnrollments();

    const channelName = `inst_enrollments_${Math.random().toString(36).substring(7)}`;
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
          fetchEnrollments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[INSTRUCTOR DATA] Impossible d\'initialiser l\'écoute Realtime enrollments:', err);
    return () => {};
  }
}

/**
 * Calcul dynamique des graphiques de gains sur différentes périodes
 * Ne génère JAMAIS de faux chiffres : si 0 vente, retourne 0 FCFA.
 */
export function computeFinancialAnalytics(
  enrollments: EnrollmentRecord[],
  period: AnalyticsPeriod
): ComputedFinancials {
  const now = new Date();
  const validEnrollments = enrollments.filter(e => e.status === 'PAID' || e.amount > 0);
  const totalGains = validEnrollments.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalRetraits = 0; // Synchronisable avec les demandes de retraits réelles
  const totalBonus = 0;
  const soldeDisponible = totalGains - totalRetraits;
  const hasSales = totalGains > 0;

  let data: FinancialDataPoint[] = [];

  if (period === '7j') {
    const daysLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    data = daysLabels.map((day, idx) => {
      const targetDay = new Date(now);
      targetDay.setDate(now.getDate() - (6 - idx));
      const targetDateStr = targetDay.toISOString().split('T')[0];

      const dayGains = validEnrollments
        .filter(e => {
          const eDate = new Date(e.createdAt).toISOString().split('T')[0];
          return eDate === targetDateStr;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        date: day,
        gains: dayGains,
        retraits: 0,
        bonus: 0
      };
    });
  } else if (period === '30j') {
    const weeks = [
      { label: 'Sem 1', daysBackStart: 28, daysBackEnd: 21 },
      { label: 'Sem 2', daysBackStart: 21, daysBackEnd: 14 },
      { label: 'Sem 3', daysBackStart: 14, daysBackEnd: 7 },
      { label: 'Sem 4', daysBackStart: 7, daysBackEnd: 0 }
    ];

    data = weeks.map(w => {
      const startMs = now.getTime() - w.daysBackStart * 24 * 3600 * 1000;
      const endMs = now.getTime() - w.daysBackEnd * 24 * 3600 * 1000;

      const weekGains = validEnrollments
        .filter(e => e.createdAt >= startMs && e.createdAt <= endMs)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        date: w.label,
        gains: weekGains,
        retraits: 0,
        bonus: 0
      };
    });
  } else {
    // '12m' : 6 derniers mois
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonthIdx = now.getMonth();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonthIdx - i + 12) % 12;
      months.push({
        label: monthNames[mIdx],
        month: mIdx,
        year: now.getFullYear() - (currentMonthIdx - i < 0 ? 1 : 0)
      });
    }

    data = months.map(m => {
      const monthGains = validEnrollments
        .filter(e => {
          const d = new Date(e.createdAt);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        date: m.label,
        gains: monthGains,
        retraits: 0,
        bonus: 0
      };
    });
  }

  return {
    data,
    totalGains,
    totalRetraits,
    totalBonus,
    soldeDisponible,
    hasSales
  };
}

/**
 * Abonnement en temps réel aux soumissions de devoirs (assignments)
 */
export function subscribeToSubmissions(
  callback: (submissions: AssignmentSubmission[]) => void,
  options?: { instructorId?: string; courseIds?: string[] }
): () => void {
  const cacheKey = options?.instructorId ? `${SUBMISSIONS_CACHE_KEY}_${options.instructorId}` : SUBMISSIONS_CACHE_KEY;
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      callback(JSON.parse(cached));
    } else {
      callback([]);
    }
  } catch (e) {
    callback([]);
  }

  try {
    const fetchSubmissions = async () => {
      try {
        const colRef = collection(db, 'assignment_submissions');
        const snapshot = await getDocs(colRef);
        const list: AssignmentSubmission[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (options?.instructorId && data.instructorId && data.instructorId !== options.instructorId) {
            return;
          }
          list.push({
            id: docSnap.id,
            assignmentId: data.assignmentId || docSnap.id,
            assignmentTitle: data.assignmentTitle || 'Devoir',
            studentId: data.studentId || '',
            studentName: data.studentName || 'Étudiant',
            studentEmail: data.studentEmail || '',
            studentAvatarUrl: data.studentAvatarUrl || '',
            courseId: data.courseId || '',
            courseTitle: data.courseTitle || '',
            lessonId: data.lessonId || '',
            lessonTitle: data.lessonTitle || '',
            fileName: data.fileName || 'Devoir.pdf',
            fileSize: data.fileSize || 0,
            fileUrl: data.fileUrl || '',
            fileType: data.fileType || 'PDF',
            submittedAt: data.submittedAt || Date.now(),
            status: data.status || 'PENDING',
            grade: data.grade,
            maxScore: data.maxScore || 20,
            passed: data.passed,
            feedback: data.feedback,
            voiceFeedbackUrl: data.voiceFeedbackUrl,
            voiceDurationSeconds: data.voiceDurationSeconds,
            gradedAt: data.gradedAt,
            gradedByName: data.gradedByName
          });
        });

        try {
          if (typeof window !== 'undefined') {
            if (list.length === 0) {
              localStorage.removeItem(cacheKey);
            } else {
              localStorage.setItem(cacheKey, JSON.stringify(list));
            }
          }
        } catch (e) {}

        callback(list);
      } catch (err) {
        console.warn('[INSTRUCTOR DATA] Erreur lecture submissions:', err);
      }
    };

    fetchSubmissions();

    const channelName = `inst_submissions_${Math.random().toString(36).substring(7)}`;
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
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[INSTRUCTOR DATA] Impossible d\'initialiser l\'écoute submissions:', err);
    return () => {};
  }
}

/**
 * Abonnement en temps réel aux apprenants inscrits (Student Roster)
 * Construit à partir des inscriptions et synchronisé
 */
export function subscribeToStudentRoster(
  callback: (students: StudentRosterItem[]) => void,
  options?: { instructorId?: string; courseIds?: string[] }
): () => void {
  const cacheKey = options?.instructorId ? `${ROSTER_CACHE_KEY}_${options.instructorId}` : ROSTER_CACHE_KEY;
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      callback(JSON.parse(cached));
    } else {
      callback([]);
    }
  } catch (e) {
    callback([]);
  }

  try {
    const fetchRoster = async () => {
      try {
        const colRef = collection(db, 'enrollments');
        const snapshot = await getDocs(colRef);
        const studentMap = new Map<string, StudentRosterItem>();
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (options?.instructorId && d.instructorId && d.instructorId !== options.instructorId) {
            return;
          }
          if (options?.courseIds && options.courseIds.length > 0 && !options.courseIds.includes(d.courseId)) {
            return;
          }
          const key = d.phoneNumber || d.email || d.studentName || docSnap.id;
          if (!studentMap.has(key)) {
            studentMap.set(key, {
              studentId: docSnap.id,
              studentName: d.studentName || 'Apprenant Nanasore',
              studentEmail: d.email || d.phoneNumber || 'Contact Mobile Money',
              studentAvatarUrl: d.studentAvatarUrl || undefined,
              enrolledAt: d.createdAt || Date.now(),
              progressPercentage: Number(d.progressPercentage) || 0,
              completedLessonsCount: Number(d.completedLessonsCount) || 0,
              totalLessonsCount: Number(d.totalLessonsCount) || 6,
              averageQuizScore: Number(d.averageQuizScore) || 0,
              pendingAssignmentsCount: Number(d.pendingAssignmentsCount) || 0,
              status: 'ONLINE',
              lastActiveAt: d.lastActiveAt || d.createdAt || Date.now(),
              certificateIssued: Boolean(d.certificateIssued),
              currentLessonTitle: d.currentLessonTitle || 'Module 1 : Démarrage du cursus'
            });
          }
        });

        const list = Array.from(studentMap.values());
        try {
          if (typeof window !== 'undefined') {
            if (list.length === 0) {
              localStorage.removeItem(cacheKey);
            } else {
              localStorage.setItem(cacheKey, JSON.stringify(list));
            }
          }
        } catch (e) {}

        callback(list);
      } catch (err) {
        console.warn('[INSTRUCTOR DATA] Erreur lecture student roster :', err);
      }
    };

    fetchRoster();

    const channelName = `inst_roster_${Math.random().toString(36).substring(7)}`;
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
          fetchRoster();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[INSTRUCTOR DATA] Impossible d\'initialiser l\'écoute student roster:', err);
    return () => {};
  }
}
