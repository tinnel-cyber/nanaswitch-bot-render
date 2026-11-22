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

export interface InstructorPayoutRecord {
  id: string;
  amount: number;
  status?: string;
  createdAt?: string | number;
}

/**
 * Abonnement en temps réel aux inscriptions (enrollments) réelles depuis le Cloud
 */
export function subscribeToEnrollments(
  callback: (enrollments: EnrollmentRecord[]) => void,
  options?: { instructorId?: string; courseIds?: string[]; strictCourseFilter?: boolean }
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

  // 2. Requête et écouteur Temps Réel Cloud
  try {
    const fetchEnrollments = async () => {
      try {
        if (options?.strictCourseFilter && (!options.courseIds || options.courseIds.length === 0)) {
          callback([]);
          return;
        }

        let query = supabase.from('enrollments').select('*');
        if (options?.courseIds && options.courseIds.length > 0) {
          query = query.in('course_id', options.courseIds);
        }

        const { data, error } = await query;
        if (!error && data) {
          const list: EnrollmentRecord[] = data.map((d: any) => ({
            id: d.id,
            courseId: d.course_id || '',
            studentName: d.student_name || d.user_email?.split('@')[0] || d.student_email?.split('@')[0] || d.user_id || 'Apprenant',
            phoneNumber: d.phone_number || d.student_phone || '',
            email: d.user_email || d.student_email || '',
            provider: d.provider || 'MOBILE_MONEY',
            amount: Number(d.amount_paid ?? d.amount ?? 0) || 0,
            currency: d.currency || 'FCFA',
            status: d.status?.toUpperCase() === 'ACTIVE' || d.status === 'completed' || d.status === 'PAID' ? 'PAID' : (d.status || 'PAID'),
            createdAt: d.enrolled_at ? new Date(d.enrolled_at).getTime() : (d.created_at ? new Date(d.created_at).getTime() : Date.now())
          }));

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
        }
      } catch (err) {
        console.warn('[INSTRUCTOR DATA] Erreur lecture enrollments:', err);
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
 * Calcul dynamique des graphiques de gains et retraits sur différentes périodes
 * Ne génère JAMAIS de faux chiffres : si 0 vente ou 0 retrait, retourne 0 FCFA.
 */
export function computeFinancialAnalytics(
  enrollments: EnrollmentRecord[],
  period: AnalyticsPeriod,
  payouts: InstructorPayoutRecord[] = []
): ComputedFinancials {
  const now = new Date();
  const validEnrollments = enrollments.filter(e => e.status === 'PAID' || e.amount > 0);
  const validPayouts = (payouts || []).filter(p => String(p.status || '').toUpperCase() !== 'REJECTED' && (Number(p.amount) || 0) > 0);

  const totalGains = validEnrollments.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalRetraits = validPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalBonus = 0;
  const soldeDisponible = Math.max(0, totalGains - totalRetraits);
  const hasSales = totalGains > 0;

  const toTimestamp = (v?: string | number) => {
    if (!v) return 0;
    const t = typeof v === 'number' ? v : new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  let data: FinancialDataPoint[] = [];

  if (period === '7j') {
    const weekdayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    data = Array.from({ length: 7 }, (_, idx) => {
      const targetDay = new Date(now);
      targetDay.setDate(now.getDate() - (6 - idx));
      const targetDateStr = targetDay.toISOString().split('T')[0];
      const dayLabel = `${weekdayNames[targetDay.getDay()]} ${String(targetDay.getDate()).padStart(2, '0')}`;

      const dayGains = validEnrollments
        .filter(e => new Date(e.createdAt).toISOString().split('T')[0] === targetDateStr)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const dayRetraits = validPayouts
        .filter(p => {
          const ts = toTimestamp(p.createdAt);
          return ts > 0 && new Date(ts).toISOString().split('T')[0] === targetDateStr;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        date: dayLabel,
        gains: dayGains,
        retraits: dayRetraits,
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

      const weekRetraits = validPayouts
        .filter(p => {
          const ts = toTimestamp(p.createdAt);
          return ts >= startMs && ts <= endMs;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        date: w.label,
        gains: weekGains,
        retraits: weekRetraits,
        bonus: 0
      };
    });
  } else {
    // '12m' : les 12 derniers mois complets
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonthIdx = now.getMonth();
    const months = [];
    for (let i = 11; i >= 0; i--) {
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

      const monthRetraits = validPayouts
        .filter(p => {
          const ts = toTimestamp(p.createdAt);
          if (!ts) return false;
          const d = new Date(ts);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        date: m.label,
        gains: monthGains,
        retraits: monthRetraits,
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
 * Abonnement en temps réel aux soumissions de devoirs (assignments) via Supabase Realtime
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
        let query = supabase.from('assignment_submissions').select('*');
        if (options?.courseIds && options.courseIds.length > 0) {
          query = query.in('course_id', options.courseIds);
        }

        const { data, error } = await query;
        if (!error && data) {
          const list: AssignmentSubmission[] = data.map((d: any) => ({
            id: d.id,
            assignmentId: d.assignment_id || d.id,
            assignmentTitle: d.assignment_title || 'Devoir',
            studentId: d.student_id || '',
            studentName: d.student_name || 'Étudiant',
            studentEmail: d.student_email || '',
            studentAvatarUrl: d.student_avatar_url || '',
            courseId: d.course_id || '',
            courseTitle: d.course_title || '',
            lessonId: d.lesson_id || '',
            lessonTitle: d.lesson_title || '',
            fileName: d.file_name || 'Devoir.pdf',
            fileSize: Number(d.file_size) || 0,
            fileUrl: d.file_url || '',
            fileType: d.file_type || 'PDF',
            submittedAt: d.submitted_at ? new Date(d.submitted_at).getTime() : Date.now(),
            status: d.status || 'PENDING',
            grade: d.grade != null ? Number(d.grade) : undefined,
            maxScore: Number(d.max_score) || 20,
            passed: d.passed != null ? Boolean(d.passed) : undefined,
            feedback: d.feedback,
            voiceFeedbackUrl: d.voice_feedback_url,
            voiceDurationSeconds: d.voice_duration_seconds ? Number(d.voice_duration_seconds) : undefined,
            gradedAt: d.graded_at ? new Date(d.graded_at).getTime() : undefined,
            gradedByName: d.graded_by_name
          }));

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
        }
      } catch (err) {
        console.warn('[INSTRUCTOR DATA] Erreur lecture submissions Supabase:', err);
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
          table: 'assignment_submissions',
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
    console.warn('[INSTRUCTOR DATA] Impossible d\'initialiser l\'écoute submissions Supabase:', err);
    return () => {};
  }
}

/**
 * Abonnement en temps réel aux apprenants inscrits (Student Roster) via Supabase Realtime
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
        let query = supabase.from('enrollments').select('*');
        if (options?.courseIds && options.courseIds.length > 0) {
          query = query.in('course_id', options.courseIds);
        }

        const { data, error } = await query;
        if (!error && data) {
          const studentMap = new Map<string, StudentRosterItem>();
          data.forEach((d: any) => {
            const key = d.user_email || d.user_id || d.id;
            if (!studentMap.has(key)) {
              studentMap.set(key, {
                studentId: d.user_id || d.id,
                studentName: d.user_email?.split('@')[0] || 'Apprenant Nanasore',
                studentEmail: d.user_email || 'Contact Mobile Money',
                studentAvatarUrl: d.student_avatar_url || undefined,
                enrolledAt: d.enrolled_at ? new Date(d.enrolled_at).getTime() : Date.now(),
                progressPercentage: Number(d.progress_percent) || 0,
                completedLessonsCount: Array.isArray(d.completed_lessons) ? d.completed_lessons.length : 0,
                totalLessonsCount: 6,
                averageQuizScore: 0,
                pendingAssignmentsCount: 0,
                status: 'ONLINE',
                lastActiveAt: d.last_accessed_at ? new Date(d.last_accessed_at).getTime() : Date.now(),
                certificateIssued: Number(d.progress_percent) >= 100,
                currentLessonTitle: 'Module en cours d\'apprentissage'
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
        }
      } catch (err) {
        console.warn('[INSTRUCTOR DATA] Erreur lecture student roster Supabase:', err);
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
