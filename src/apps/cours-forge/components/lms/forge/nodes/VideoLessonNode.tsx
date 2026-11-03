import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Video, Sparkles, Clock, Edit3, Trash2, CheckCircle2, ShieldAlert, Youtube, ShieldCheck } from 'lucide-react';
import { CourseNodeData } from '../../../../../../types';

export const VideoLessonNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CourseNodeData;
  const isAiAvatar = nodeData.videoConfig?.mode === 'AI_AVATAR';
  const isYouTube = nodeData.videoConfig?.mode === 'YOUTUBE_EMBED' || !!nodeData.videoConfig?.youtubeUrl;
  const isRemedial = nodeData.isRemedial;
  const hideBranding = nodeData.videoConfig?.hideBranding !== false;

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-2xl p-3.5 shadow-2xl transition-all duration-200 border text-slate-100 ${
        selected
          ? 'ring-2 ring-indigo-500 border-indigo-400 bg-slate-900/95 shadow-indigo-950/60'
          : isRemedial
            ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/40 to-slate-900/95'
            : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
      }`}
    >
      {/* Target Handle (Entrée) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-slate-950 -top-1.5"
      />

      {/* En-tête du Nœud */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
            isRemedial 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'bg-indigo-500/20 text-indigo-400'
          }`}>
            <Video className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
            {isRemedial ? 'Rattrapage' : 'Leçon Vidéo'}
          </span>
        </div>

        {/* Badge Mode */}
        {isAiAvatar ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[9.5px] font-black border border-rose-500/40">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Avatar IA</span>
          </span>
        ) : isYouTube ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[9.5px] font-black border border-red-500/40">
            <Youtube className="w-2.5 h-2.5" />
            <span>YouTube</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[9.5px] font-bold border border-indigo-500/30">
            <span>MP4 Manuel</span>
          </span>
        )}
      </div>

      {/* Contenu Principal */}
      <div className="py-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
            {nodeData.title || 'Nouvelle Leçon Vidéo'}
          </h4>
        </div>

        {hideBranding && (
          <div className="flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 w-fit">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Branding Masqué</span>
          </div>
        )}

        <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{nodeData.durationMinutes || 15} min</span>
          </span>

          {nodeData.videoConfig?.isUploaded ? (
            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>Prête</span>
            </span>
          ) : (
            <span className="text-amber-400 font-medium">À configurer</span>
          )}
        </div>
      </div>

      {/* Actions Inférieures du Nœud */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <button
          type="button"
          onClick={() => nodeData.onEditNode && nodeData.onEditNode(id)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <Edit3 className="w-3 h-3 text-indigo-400" />
          <span>Configurer</span>
        </button>

        {nodeData.onDeleteNode && (
          <button
            type="button"
            onClick={() => nodeData.onDeleteNode && nodeData.onDeleteNode(id)}
            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition cursor-pointer"
            title="Supprimer le nœud"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Source Handle (Sortie) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-slate-950 -bottom-1.5"
      />
    </div>
  );
};

export default VideoLessonNode;
