'use client';

import React, { useState } from 'react';
import { useRealtimeCourseProgress } from '@/hooks/useRealtimeCourseProgress';

interface StudentLessonViewerProps {
  userId: string;
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  totalLessons: number;
}

export function StudentLessonViewerRealtime({
  userId,
  courseId,
  lessonId,
  lessonTitle,
  totalLessons
}: StudentLessonViewerProps) {
  const { enrollment, loading, markLessonComplete } = useRealtimeCourseProgress(userId, courseId);
  const [isSaving, setIsSaving] = useState(false);

  const completedList = enrollment?.completed_lessons || [];
  const isCompleted = completedList.includes(lessonId);

  const handleComplete = async () => {
    setIsSaving(true);
    await markLessonComplete(lessonId, totalLessons);
    setIsSaving(false);
  };

  if (loading) return <div className="p-4 text-xs font-bold text-slate-500">Chargement de votre progression...</div>;

  return (
    <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 text-white space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[10px] font-black uppercase text-blue-400">Leçon en cours</span>
          <h3 className="text-lg font-bold text-white">{lessonTitle}</h3>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-emerald-400">
            {enrollment?.progress_percent || 0}% complété
          </span>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          disabled={isSaving || isCompleted}
          onClick={handleComplete}
          className={`w-full py-3 rounded-2xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
            isCompleted 
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/50'
          }`}
        >
          {isCompleted ? (
            <>
              <span>✓</span>
              <span>Leçon Validée !</span>
            </>
          ) : isSaving ? (
            <span>Enregistrement en direct...</span>
          ) : (
            <span>Marquer cette leçon comme terminée</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default StudentLessonViewerRealtime;
