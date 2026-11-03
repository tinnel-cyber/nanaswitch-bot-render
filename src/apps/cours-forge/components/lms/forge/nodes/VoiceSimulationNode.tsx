import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mic, Bot, Sparkles, Edit3, Trash2, GitBranch, Clock, Award } from 'lucide-react';
import { CourseNodeData, VoiceSimulationScenarioConfig } from '../../../../../../types';

export const VoiceSimulationNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as CourseNodeData;
  const config = (nodeData as any).voiceSimulationConfig as VoiceSimulationScenarioConfig | undefined;
  const title = config?.title || (nodeData as any).title || 'Simulation Vocale IA NaNa';
  const persona = config?.persona || 'Client mécontent exigeant un remboursement';
  const maxDuration = config?.maxDurationSeconds ? Math.round(config.maxDurationSeconds / 60) : 3;
  const passingScore = config?.passingScore || 70;

  return (
    <div
      className={`min-w-[270px] max-w-[300px] rounded-2xl p-3.5 shadow-2xl transition-all duration-200 border text-slate-100 ${
        selected
          ? 'ring-2 ring-cyan-500 border-cyan-400 bg-slate-900/95 shadow-cyan-950/60'
          : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
      }`}
    >
      {/* Target Handle (Entrée) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-slate-950 -top-1.5"
      />

      {/* En-tête du Nœud Simulation */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Mic className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300">
            Arène Vocale IA
          </span>
        </div>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[9.5px] font-black border border-cyan-500/30">
          <Bot className="w-2.5 h-2.5" />
          <span>Gemini 3.8</span>
        </span>
      </div>

      {/* Contenu Principal */}
      <div className="py-2.5 space-y-2">
        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
          {title}
        </h4>

        <p className="text-[10.5px] text-slate-400 line-clamp-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
          <span className="font-semibold text-cyan-400">Persona : </span>
          {persona}
        </p>

        <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            {maxDuration} min max
          </span>
          <span className="font-bold text-emerald-300 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            Seuil : {passingScore}%
          </span>
        </div>
      </div>

      {/* Actions Inférieures du Nœud */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between mb-3.5">
        <button
          type="button"
          onClick={() => nodeData.onEditNode && nodeData.onEditNode(id)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700 hover:border-cyan-500/50"
        >
          <Edit3 className="w-3 h-3 text-cyan-400" />
          <span>Configurer Scénario</span>
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
          <span>Validé (≥{passingScore}%)</span>
        </div>

        {/* Branche Échec / Remédiation (Orange/Rose) */}
        <div className="flex items-center gap-1 text-rose-400">
          <span>Remédiation (&lt;{passingScore}%)</span>
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

      {/* Handle Échec / Remédiation (Droite bas) */}
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

export default VoiceSimulationNode;
