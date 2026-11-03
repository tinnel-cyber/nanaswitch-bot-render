import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Radio, Calendar, Edit3, Trash2, ShieldCheck, Users } from 'lucide-react';
import { CourseNodeData } from '../../../../../../types';

export const DailyLiveNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CourseNodeData;

  const provider = nodeData.liveSessionConfig?.provider || 'DAILY';
  const meetingId = nodeData.liveSessionConfig?.meetingId;

  const getProviderBadge = () => {
    switch (provider) {
      case 'ZOOM':
        return { label: 'Zoom Live', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'GOOGLE_MEET':
        return { label: 'Google Meet', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
      case 'JITSI':
        return { label: 'Jitsi Iframe', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      case 'DAILY':
      default:
        return { label: 'Daily.co', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
  };

  const badge = getProviderBadge();

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-2xl p-3.5 shadow-2xl transition-all duration-200 border text-slate-100 ${
        selected
          ? 'ring-2 ring-emerald-500 border-emerald-400 bg-slate-900/95 shadow-emerald-950/60'
          : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
      }`}
    >
      {/* Target Handle (Entrée) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-950 -top-1.5"
      />

      {/* En-tête */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
            Live Streaming
          </span>
        </div>

        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black border ${badge.color}`}>
          <span>{badge.label}</span>
        </span>
      </div>

      {/* Contenu */}
      <div className="py-2.5 space-y-1.5">
        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
          {nodeData.title || 'Session Directe Interactive'}
        </h4>

        <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-indigo-400" />
            <span>{nodeData.liveSessionConfig?.scheduledAt ? new Date(nodeData.liveSessionConfig.scheduledAt).toLocaleDateString() : nodeData.dailyScheduledDate || 'Direct'}</span>
          </span>
          <span className={meetingId ? 'text-emerald-400 font-bold' : 'text-slate-500 font-medium'}>
            {meetingId ? 'Lien actif ✓' : 'À configurer'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <button
          type="button"
          onClick={() => nodeData.onEditNode && nodeData.onEditNode(id)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <Edit3 className="w-3 h-3 text-emerald-400" />
          <span>Configurer</span>
        </button>

        {nodeData.onDeleteNode && (
          <button
            type="button"
            onClick={() => nodeData.onDeleteNode && nodeData.onDeleteNode(id)}
            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition cursor-pointer"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Source Handle (Sortie) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-950 -bottom-1.5"
      />
    </div>
  );
};

export default DailyLiveNode;
