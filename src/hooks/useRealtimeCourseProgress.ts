'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CourseEnrollment {
  id: string;
  tenant_id?: string;
  user_id: string;
  course_id: string;
  progress_percent: number;
  completed_lessons: string[];
  status: 'active' | 'completed' | 'suspended';
  last_accessed_at: string;
  created_at: string;
}

export function useRealtimeCourseProgress(userId?: string | null, courseId?: string | null) {
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !courseId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial Fetch
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();

        if (!isMounted) return;
        if (fetchErr) {
          console.warn('[RealtimeCourseProgress] Erreur fetch enrollment:', fetchErr);
          setError(fetchErr.message);
        } else if (data) {
          setEnrollment(data as CourseEnrollment);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Erreur fetch progression');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProgress();

    // 2. Écouteur Supabase Realtime
    const channelName = `progress_${userId}_${courseId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isMounted) return;
          const rec = payload.new as any;
          if (rec && rec.course_id === courseId) {
            setEnrollment(rec as CourseEnrollment);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, courseId]);

  // Validation d'une leçon complétée
  const markLessonComplete = useCallback(async (lessonId: string, totalLessons: number) => {
    if (!userId || !courseId || !enrollment) return { success: false };

    const currentCompleted = Array.isArray(enrollment.completed_lessons) ? enrollment.completed_lessons : [];
    if (currentCompleted.includes(lessonId)) return { success: true };

    const updatedLessons = [...currentCompleted, lessonId];
    const newPercent = Math.min(100, Math.round((updatedLessons.length / Math.max(1, totalLessons)) * 100));

    try {
      const { data, error: updateErr } = await supabase
        .from('enrollments')
        .update({
          completed_lessons: updatedLessons,
          progress_percent: newPercent,
          status: newPercent === 100 ? 'completed' : 'active',
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', enrollment.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return { success: true, data };
    } catch (err: any) {
      console.error('[RealtimeCourseProgress] Erreur mise à jour leçon:', err);
      return { success: false, error: err?.message };
    }
  }, [userId, courseId, enrollment]);

  return { enrollment, loading, error, markLessonComplete };
}

export default useRealtimeCourseProgress;
