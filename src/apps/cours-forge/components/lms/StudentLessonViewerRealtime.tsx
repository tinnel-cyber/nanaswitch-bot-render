import React, { useState } from 'react';
import { useRealtimeCourseProgress } from '../../../../hooks/useRealtimeCourseProgress';

export interface StudentLessonViewerProps {
  userId: string;
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  totalLessons: number;
  onLessonValidated?: (lessonId: string) => void;
}

export const StudentLessonViewerRealtime: React.FC<StudentLessonViewerProps> = ({
  userId,
  courseId,
  lessonId,
  lessonTitle,
  totalLessons,
  onLessonValidated
}) => {
  const { enrollment, loading, markLessonComplete } = useRealtimeCourseProgress(userId, courseId);
  const [isSaving, setIsSaving] = useState(false);

  const completedList = enrollment?.completed_lessons || [];
  const isCompleted = completedList.includes(lessonId);

  const handleComplete = async () => {
    setIsSaving(true);
    await markLessonComplete(lessonId, totalLessons);
    setIsSaving(false);
    onLessonValidated?.(lessonId);
  };

  if (loading) return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs font-bold text-slate-400 flex items-center gap-2">
      <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <span>Synchronisation Supabase Realtime...</span>
    </div>
  );

  return (
    <div className="p-4 sm:p-5 bg-slate-900/90 rounded-2xl border border-slate-800 text-white space-y-3 shadow-lg">
      <div className="flex justify-between items-center gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Progression en Direct</span>
          <h3 className="text-sm sm:text-base font-bold text-white truncate">{lessonTitle}</h3>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
            {enrollment?.progress_percent || 0}% complété
          </span>
        </div>
      </div>

      <div className="pt-1">
        <button
          type="button"
          disabled={isSaving || isCompleted}
          onClick={handleComplete}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
            isCompleted 
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 cursor-default' 
              : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-950/50'
          }`}
        >
          {isCompleted ? (
            <>
              <span className="text-emerald-400">✓</span>
              <span>Leçon Validée dans le Cloud !</span>
            </>
          ) : isSaving ? (
            <span>Enregistrement en direct...</span>
          ) : (
            <span>Valider cette leçon en temps réel</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default StudentLessonViewerRealtime;
