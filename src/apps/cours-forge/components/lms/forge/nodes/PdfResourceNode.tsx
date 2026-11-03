import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Download, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { CourseNodeData } from '../../../../../../types';

export const PdfResourceNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CourseNodeData;

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-2xl p-3.5 shadow-2xl transition-all duration-200 border text-slate-100 ${
        selected
          ? 'ring-2 ring-rose-500 border-rose-400 bg-slate-900/95 shadow-rose-950/60'
          : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
      }`}
    >
      {/* Target Handle (Entrée) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-slate-950 -top-1.5"
      />

      {/* En-tête */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
            Document PDF
          </span>
        </div>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[9.5px] font-bold border border-rose-500/30">
          <span>{nodeData.pdfFileSize || '2.4 MB'}</span>
        </span>
      </div>

      {/* Contenu */}
      <div className="py-2.5 space-y-1.5">
        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
          {nodeData.title || 'Support de Cours & Guide Pratique'}
        </h4>

        <p className="text-[10.5px] text-slate-400 truncate">
          {nodeData.pdfFileName || 'Documentation_Officielle.pdf'}
        </p>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <button
          type="button"
          onClick={() => nodeData.onEditNode && nodeData.onEditNode(id)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <Edit3 className="w-3 h-3 text-rose-400" />
          <span>Fichier</span>
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
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-slate-950 -bottom-1.5"
      />
    </div>
  );
};

export default PdfResourceNode;
