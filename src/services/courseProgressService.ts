// ============================================================================
// SERVICE FRONTEND WAMEET : SYNCHRONISATION PROGRESSION LMS (TUTOR LMS / FIRESTORE)
// ============================================================================

import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { supabase } from '../lib/supabase';

export interface CourseProgressPayload {
  userId: string;
  channelId: string;
  courseId?: string;
  lessonId: string;
  type?: 'video' | 'quiz' | string;
  score?: number;
  isCompleted?: boolean;
  lessonTitle?: string;
  moduleIndex?: number;
  metadata?: Record<string, any>;
}

export interface CourseProgressData {
  userId: string;
  channelId: string;
  courseId?: string;
  completedLessonIds: string[];
  totalScore: number;
  completedCount: number;
  lastCompletedLessonId: string | null;
  lessons?: Record<string, {
    lessonId: string;
    type?: string;
    score?: number;
    isCompleted?: boolean;
    completedAt?: any;
  }>;
  updatedAt?: string | null;
}

export interface CourseProgressResponse {
  success: boolean;
  message?: string;
  progress?: CourseProgressData;
  error?: string;
}

const PAYMENT_API_BASE_URL =
  (typeof process !== 'undefined' && (process as any).env?.VITE_PAYMENT_API_URL) ||
  'https://nana-payment-api.onrender.com';

const LOCAL_STORAGE_PREFIX = 'wameet_lms_progress_';

/**
 * Envoie la validation d'une leçon (vidéo vue ou quiz réussi) vers l'API backend
 * (POST /api/lms/progress), avec synchronisation Firestore et cache hors-ligne.
 */
export async function saveCourseProgress(
  payload: CourseProgressPayload
): Promise<CourseProgressResponse> {
  const { userId, channelId, courseId, lessonId, score = 0, type = 'video', isCompleted = true } = payload;
  const storageKey = `${LOCAL_STORAGE_PREFIX}${userId}_${channelId}`;

  // 1. Sauvegarde optimiste immédiate dans le cache local
  try {
    const cached = localStorage.getItem(storageKey);
    const existing: CourseProgressData = cached
      ? JSON.parse(cached)
      : {
          userId,
          channelId,
          courseId: courseId || channelId,
          completedLessonIds: [],
          totalScore: 0,
          completedCount: 0,
          lastCompletedLessonId: null
        };

    if (!existing.completedLessonIds.includes(lessonId)) {
      existing.completedLessonIds.push(lessonId);
      existing.completedCount = existing.completedLessonIds.length;
      existing.totalScore = (existing.totalScore || 0) + Number(score || 0);
      existing.lastCompletedLessonId = lessonId;
      existing.updatedAt = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify(existing));
    }
  } catch (e) {
    console.warn('[COURSE PROGRESS SERVICE] Erreur écriture cache local :', e);
  }

  // 2. Appel de l'API backend Node.js (Render)
  try {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/lms/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.progress) {
        localStorage.setItem(storageKey, JSON.stringify(data.progress));
      }
      return data;
    }
    console.warn('[COURSE PROGRESS API] Échec réponse HTTP :', response.status);
  } catch (fetchErr: any) {
    console.warn('[COURSE PROGRESS API NOTICE] Erreur réseau API backend, bascule storage direct :', fetchErr.message);
  }

  // 3. Fallback direct Firestore si le backend Express est en veille ou injoignable
  try {
    if (db) {
      const docId = `${userId}_${channelId}`;
      const progressRef = doc(db, 'wameet_course_progress', docId);

      const snap = await getDoc(progressRef);
      let currentCompleted: string[] = [];
      let currentScore = 0;

      if (snap.exists()) {
        const d = snap.data();
        currentCompleted = d.completedLessonIds || [];
        currentScore = d.totalScore || 0;
      }

      if (!currentCompleted.includes(lessonId)) {
        currentCompleted.push(lessonId);
      }

      const updatedData: CourseProgressData = {
        userId,
        channelId,
        courseId: courseId || channelId,
        completedLessonIds: currentCompleted,
        totalScore: currentScore + Number(score || 0),
        completedCount: currentCompleted.length,
        lastCompletedLessonId: lessonId,
        updatedAt: new Date().toISOString()
      };

      await setDoc(progressRef, {
        ...updatedData,
        [`lessons.${lessonId}`]: {
          lessonId,
          type,
          score: Number(score || 0),
          isCompleted,
          updatedAt: new Date().toISOString()
        }
      }, { merge: true });

      localStorage.setItem(storageKey, JSON.stringify(updatedData));

      return {
        success: true,
        message: 'Progression synchronisée via Firestore direct (Mode résilient).',
        progress: updatedData
      };
    }
  } catch (fsErr: any) {
    console.error('[COURSE PROGRESS storage ERROR]', fsErr);
  }

  // Si tout échoue, on renvoie le statut basé sur le cache local
  const finalCached = localStorage.getItem(storageKey);
  return {
    success: true,
    message: 'Progression enregistrée localement (Mode hors-ligne).',
    progress: finalCached ? JSON.parse(finalCached) : undefined
  };
}

/**
 * Récupère la progression d'un apprenant pour une chaîne donnée
 */
export async function fetchCourseProgress(
  userId: string,
  channelId: string,
  courseId?: string
): Promise<CourseProgressData | null> {
  const storageKey = `${LOCAL_STORAGE_PREFIX}${userId}_${channelId}`;

  // 1. Appel API backend
  try {
    const params = new URLSearchParams({ userId, channelId });
    if (courseId) params.append('courseId', courseId);

    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/lms/progress?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.progress) {
        localStorage.setItem(storageKey, JSON.stringify(data.progress));
        return data.progress;
      }
    }
  } catch (err: any) {
    console.warn('[FETCH PROGRESS API NOTICE]', err.message);
  }

  // 2. Fallback Firestore
  try {
    if (db) {
      const snap = await getDoc(doc(db, 'wameet_course_progress', `${userId}_${channelId}`));
      if (snap.exists()) {
        const d = snap.data() as CourseProgressData;
        localStorage.setItem(storageKey, JSON.stringify(d));
        return d;
      }
    }
  } catch (err) {
    console.warn('[FETCH PROGRESS storage NOTICE]', err);
  }

  // 3. Fallback LocalStorage
  const cached = localStorage.getItem(storageKey);
  return cached ? JSON.parse(cached) : null;
}

/**
 * Abonnement en temps réel aux progrès d'un étudiant via Supabase Realtime
 */
export function subscribeToCourseProgress(
  userId: string,
  channelId: string,
  onUpdate: (data: CourseProgressData) => void
): () => void {
  if (!userId || !channelId) {
    return () => {};
  }

  // 1. Lecture locale immédiate
  const storageKey = `wameet_course_progress_${userId}_${channelId}`;
  try {
    const cached = localStorage.getItem(storageKey);
    if (cached) onUpdate(JSON.parse(cached));
  } catch {}

  // 2. Écouteur Supabase Realtime
  const channelName = `progress_${userId}_${channelId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'enrollments',
        filter: `course_id=eq.${channelId}`,
      },
      (payload) => {
        if (payload.new) {
          const row = payload.new as any;
          if (row.user_id === userId) {
            onUpdate({
              userId,
              channelId,
              completedLessonIds: row.completed_lesson_ids || [],
              totalScore: row.total_score || 0,
              completedCount: row.completed_count || 0,
              lastCompletedLessonId: row.last_lesson_id || null,
            });
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
