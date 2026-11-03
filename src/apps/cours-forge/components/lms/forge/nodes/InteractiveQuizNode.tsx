import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HelpCircle, Award, Check, AlertTriangle, Edit3, Trash2, GitBranch } from 'lucide-react';
import { CourseNodeData } from '../../../../../../types';

export const InteractiveQuizNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CourseNodeData;
  const questionsCount = nodeData.quizQuestions?.length || 4;
  const passingScore = nodeData.quizPassingScore || 70;

  return (
    <div
      className={`min-w-[260px] max-w-[290px] rounded-2xl p-3.5 shadow-2xl transition-all duration-200 border text-slate-100 ${
        selected
          ? 'ring-2 ring-amber-500 border-amber-400 bg-slate-900/95 shadow-amber-950/60'
          : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
      }`}
    >
      {/* Target Handle (Entrée) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-950 -top-1.5"
      />

      {/* En-tête du Nœud Quiz */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
            Quiz Adaptatif
          </span>
        </div>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9.5px] font-black border border-amber-500/30">
          <GitBranch className="w-2.5 h-2.5" />
          <span>IRT N1-N5</span>
        </span>
      </div>

      {/* Contenu Principal */}
      <div className="py-2.5 space-y-1.5">
        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
          {nodeData.title || 'Évaluation des Connaissances'}
        </h4>

        <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-0.5">
          <span>{questionsCount} questions calibrées</span>
          <span className="font-bold text-amber-300">Seuil : {passingScore}%</span>
        </div>
      </div>

      {/* Actions Inférieures du Nœud */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => nodeData.onEditNode && nodeData.onEditNode(id)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <Edit3 className="w-3 h-3 text-amber-400" />
          <span>Gérer IRT</span>
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

      {/* DOUBLE CONNECTEURS CONDITIONNELS EN BAS */}
      <div className="flex items-center justify-between text-[9.5px] font-black px-1 text-slate-400 pt-1 border-t border-slate-800/40">
        {/* Branche Succès (Vert) */}
        <div className="flex items-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Succès (≥{passingScore}%)</span>
        </div>

        {/* Branche Échec / Remédiation (Orange) */}
        <div className="flex items-center gap-1 text-rose-400">
          <span>Échec ({'<'}70%)</span>
          <span className="w-2 h-2 rounded-full bg-rose-500" />
        </div>
      </div>

      {/* Handle Succès (Gauche bas) */}
      <Handle
        id="pass"
        type="source"
        position={Position.Bottom}
        style={{ left: '25%' }}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-950 -bottom-1.5"
      />

      {/* Handle Échec (Droite bas) */}
      <Handle
        id="fail"
        type="source"
        position={Position.Bottom}
        style={{ left: '75%' }}
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-slate-950 -bottom-1.5"
      />
    </div>
  );
};

export default InteractiveQuizNode;
