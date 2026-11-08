import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  saveCourseProgress,
  fetchCourseProgress,
  subscribeToCourseProgress,
  CourseProgressData,
  CourseProgressPayload
} from '../services/courseProgressService';

export interface UseCourseProgressOptions {
  channelId: string;
  courseId?: string;
  userId?: string | null;
  isInstructor?: boolean; // Les formateurs ont un accès complet à tous les modules
  totalLessonsCount?: number; // Pour le calcul du pourcentage de complétion
  initialCompletedLessons?: string[];
  onProgressUpdated?: (data: CourseProgressData) => void;
}

export interface UseCourseProgressReturn {
  completedLessonIds: string[];
  totalScore: number;
  completedCount: number;
  lastCompletedLessonId: string | null;
  progressPercentage: number;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  isLessonCompleted: (lessonId: string) => boolean;
  isLessonUnlocked: (lessonId: string, prerequisiteLessonId?: string | null) => boolean;
  canViewMessage: (message: { prerequisiteLessonId?: string; [key: string]: any }) => boolean;
  markLessonCompleted: (
    lessonId: string,
    metadata?: {
      title?: string;
      type?: 'video' | 'quiz' | string;
      score?: number;
      moduleIndex?: number;
    }
  ) => Promise<boolean>;
  submitQuizResult: (
    quizId: string,
    isCorrect: boolean,
    points?: number,
    metadata?: Record<string, any>
  ) => Promise<boolean>;
  reloadProgress: () => Promise<void>;
}

export function useCourseProgress({
  channelId,
  courseId,
  userId,
  isInstructor = false,
  totalLessonsCount,
  initialCompletedLessons = [],
  onProgressUpdated
}: UseCourseProgressOptions): UseCourseProgressReturn {
  // ID effectif de l'utilisateur (fallback sur un identifiant local invité si non connecté)
  const effectiveUserId = useMemo(() => {
    if (userId) return userId;
    let localId = localStorage.getItem('wameet_guest_learner_id');
    if (!localId) {
      localId = `learner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('wameet_guest_learner_id', localId);
    }
    return localId;
  }, [userId]);

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(initialCompletedLessons);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [lastCompletedLessonId, setLastCompletedLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Set mémoïsé pour des lookups O(1) ultra-rapides
  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);

  // Synchronisation des données reçues (serveur ou Firestore onSnapshot)
  const applyProgressData = useCallback((data: CourseProgressData) => {
    if (Array.isArray(data.completedLessonIds)) {
      setCompletedLessonIds(prev => {
        // Fusion sans doublons
        const combined = Array.from(new Set([...prev, ...data.completedLessonIds]));
        return combined;
      });
    }
    if (typeof data.totalScore === 'number') {
      setTotalScore(data.totalScore);
    }
    if (data.lastCompletedLessonId) {
      setLastCompletedLessonId(data.lastCompletedLessonId);
    }
    if (onProgressUpdated) {
      onProgressUpdated(data);
    }
  }, [onProgressUpdated]);

  // 1. Chargement initial de la progression
  const reloadProgress = useCallback(async () => {
    if (!channelId || !effectiveUserId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCourseProgress(effectiveUserId, channelId, courseId);
      if (data) {
        applyProgressData(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement de la progression');
    } finally {
      setIsLoading(false);
    }
  }, [channelId, courseId, effectiveUserId, applyProgressData]);

  useEffect(() => {
    reloadProgress();
  }, [reloadProgress]);

  // 2. Écoute temps réel réactive via Supabase Realtime (remplace Firestore onSnapshot)
  useEffect(() => {
    if (!channelId || !effectiveUserId) return;

    const unsubscribe = subscribeToCourseProgress(
      effectiveUserId,
      channelId,
      (liveData) => {
        applyProgressData(liveData);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [channelId, effectiveUserId, applyProgressData]);

  // 3. Vérifie si une leçon spécifique est terminée
  const isLessonCompleted = useCallback(
    (lessonId: string): boolean => {
      if (!lessonId) return false;
      return completedSet.has(lessonId);
    },
    [completedSet]
  );

  // 4. Logique de déblocage séquentiel (Drip / Prérequis conditionnel)
  // Règle stricte : Un formateur a toujours accès à tout. Pour l'étudiant, la leçon est
  // débloquée s'il n'y a aucun prérequis OU si le prérequis est dans la liste des leçons terminées.
  const isLessonUnlocked = useCallback(
    (lessonId: string, prerequisiteLessonId?: string | null): boolean => {
      if (isInstructor) return true;
      if (!prerequisiteLessonId) return true;
      return completedSet.has(prerequisiteLessonId);
    },
    [isInstructor, completedSet]
  );

  // 5. Vérifie si un message de chat LMS doit être affiché ou débloqué
  const canViewMessage = useCallback(
    (message: { prerequisiteLessonId?: string; [key: string]: any }): boolean => {
      if (isInstructor) return true;
      if (!message.prerequisiteLessonId) return true;
      return completedSet.has(message.prerequisiteLessonId);
    },
    [isInstructor, completedSet]
  );

  // 6. Action : Marquer une leçon comme terminée (ex: clic sur "Marquer la vidéo comme terminée")
  const markLessonCompleted = useCallback(
    async (
      lessonId: string,
      metadata?: {
        title?: string;
        type?: 'video' | 'quiz' | string;
        score?: number;
        moduleIndex?: number;
      }
    ): Promise<boolean> => {
      if (!lessonId) return false;

      // Mise à jour optimiste instantanée de l'UI
      setCompletedLessonIds(prev => {
        if (prev.includes(lessonId)) return prev;
        return [...prev, lessonId];
      });
      setLastCompletedLessonId(lessonId);
      if (metadata?.score) {
        setTotalScore(prev => prev + (metadata.score || 0));
      }

      setIsSaving(true);
      try {
        const payload: CourseProgressPayload = {
          userId: effectiveUserId,
          channelId,
          courseId,
          lessonId,
          lessonTitle: metadata?.title,
          type: metadata?.type || 'video',
          score: metadata?.score || 0,
          moduleIndex: metadata?.moduleIndex,
          isCompleted: true
        };

        const res = await saveCourseProgress(payload);
        if (res.progress) {
          applyProgressData(res.progress);
        }
        return true;
      } catch (err: any) {
        console.error('[USE COURSE PROGRESS] Erreur sauvegarde :', err);
        setError(err.message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [channelId, courseId, effectiveUserId, applyProgressData]
  );

  // 7. Action : Soumission d'un Quiz (QCM)
  const submitQuizResult = useCallback(
    async (
      quizId: string,
      isCorrect: boolean,
      points: number = 10,
      metadata?: Record<string, any>
    ): Promise<boolean> => {
      if (!quizId) return false;

      // Si le quiz est réussi, on le marque comme terminé et on crédite les points
      if (isCorrect) {
        return await markLessonCompleted(quizId, {
          type: 'quiz',
          score: points,
          title: metadata?.title || 'Quiz validé'
        });
      }

      return false;
    },
    [markLessonCompleted]
  );

  // Calcul dynamique du pourcentage d'avancement
  const progressPercentage = useMemo(() => {
    if (totalLessonsCount && totalLessonsCount > 0) {
      const pct = Math.round((completedLessonIds.length / totalLessonsCount) * 100);
      return Math.min(100, Math.max(0, pct));
    }
    return completedLessonIds.length > 0 ? 100 : 0;
  }, [completedLessonIds.length, totalLessonsCount]);

  return {
    completedLessonIds,
    totalScore,
    completedCount: completedLessonIds.length,
    lastCompletedLessonId,
    progressPercentage,
    isLoading,
    isSaving,
    error,
    isLessonCompleted,
    isLessonUnlocked,
    canViewMessage,
    markLessonCompleted,
    submitQuizResult,
    reloadProgress
  };
}

export default useCourseProgress;
