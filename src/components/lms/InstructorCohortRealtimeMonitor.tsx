'use client';

import React from 'react';
import { useRealtimeCourseProgress } from '@/hooks/useRealtimeCourseProgress';

interface CohortMonitorProps {
  userId: string;
  courseId: string;
  studentName: string;
}

export function InstructorCohortRealtimeMonitor({ userId, courseId, studentName }: CohortMonitorProps) {
  const { enrollment, loading } = useRealtimeCourseProgress(userId, courseId);

  const percent = enrollment?.progress_percent || 0;
  const isFinished = enrollment?.status === 'completed';

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
      <div className="space-y-1">
        <h4 className="text-sm font-black text-slate-900">{studentName}</h4>
        <span className="text-[11px] text-slate-500 block">
          {enrollment ? `Dernière activité : ${new Date(enrollment.last_accessed_at || enrollment.created_at).toLocaleTimeString()}` : 'Non inscrit'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-28 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${isFinished ? 'bg-emerald-500' : 'bg-blue-600'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs font-black font-mono w-10 text-right text-slate-700">
          {loading ? '...' : `${percent}%`}
        </span>
      </div>
    </div>
  );
}

export default InstructorCohortRealtimeMonitor;
