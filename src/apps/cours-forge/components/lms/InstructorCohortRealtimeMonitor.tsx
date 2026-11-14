import React from 'react';
import { useRealtimeCourseProgress } from '../../../../hooks/useRealtimeCourseProgress';

export interface CohortMonitorProps {
  userId: string;
  courseId: string;
  studentName: string;
  studentEmail?: string;
}

export const InstructorCohortRealtimeMonitor: React.FC<CohortMonitorProps> = ({ 
  userId, 
  courseId, 
  studentName,
  studentEmail
}) => {
  const { enrollment, loading } = useRealtimeCourseProgress(userId, courseId);

  const percent = enrollment?.progress_percent || 0;
  const isFinished = enrollment?.status === 'completed';

  return (
    <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between gap-4 transition hover:border-slate-700">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-black text-white truncate">{studentName}</h4>
          {isFinished && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Certifié
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400 block truncate">
          {studentEmail || (enrollment ? `Dernière activité : ${new Date(enrollment.last_accessed_at || enrollment.created_at).toLocaleTimeString()}` : 'En attente')}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="w-24 sm:w-28 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${isFinished ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs font-black font-mono w-10 text-right text-slate-300">
          {loading ? '...' : `${percent}%`}
        </span>
      </div>
    </div>
  );
};

export default InstructorCohortRealtimeMonitor;
