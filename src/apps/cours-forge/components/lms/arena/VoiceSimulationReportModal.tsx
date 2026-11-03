import React from 'react';
import { 
  X, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  RotateCcw, 
  ArrowRight, 
  TrendingUp, 
  AlertCircle, 
  ShieldCheck, 
  HeartHandshake, 
  Target, 
  MessageSquare
} from 'lucide-react';
import { VoiceSimulationReport } from '../../../../../types';

interface VoiceSimulationReportModalProps {
  isOpen: boolean;
  report: VoiceSimulationReport | null;
  onClose: () => void;
  onRetry?: () => void;
  onContinue?: () => void;
}

export const VoiceSimulationReportModal: React.FC<VoiceSimulationReportModalProps> = ({
  isOpen,
  report,
  onClose,
  onRetry,
  onContinue
}) => {
  if (!isOpen || !report) return null;

  const passed = report.passed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Card */}
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Header */}
        <div className={`p-6 border-b relative overflow-hidden ${
          passed 
            ? 'bg-gradient-to-r from-emerald-600/30 via-teal-600/20 to-slate-900 border-emerald-500/30' 
            : 'bg-gradient-to-r from-rose-600/30 via-amber-600/20 to-slate-900 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${
                passed 
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                  : 'bg-rose-500/20 border-rose-500/50 text-rose-400'
              }`}>
                {passed ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Rapport Diagnostique NaNa AI
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {passed ? 'Épreuve Vocale Validée avec Succès !' : 'Objectif Non Atteint - Séance Diagnostique'}
                </h3>
              </div>
            </div>

            {/* Score Ring / Pill */}
            <div className={`px-4 py-2 rounded-2xl border text-center shadow-lg ${
              passed
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            }`}>
              <span className="text-2xl font-black block leading-none">{report.score}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">/ 100</span>
            </div>
          </div>
        </div>

        {/* Scrollable Report Details */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6 touch-pan-y custom-scrollbar">
          {/* Summary */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Synthèse de l'Intervention
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {report.summary}
            </p>
          </div>

          {/* Rubrics Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Grille d'Évaluation Multidimensionnelle
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-center">
                <HeartHandshake className="w-4 h-4 text-pink-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block truncate">Empathie</span>
                <span className="text-sm font-bold text-white">{report.rubrics.empathy}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-center">
                <Target className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block truncate">Précision Tech</span>
                <span className="text-sm font-bold text-white">{report.rubrics.technicalAccuracy}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block truncate">Résolution</span>
                <span className="text-sm font-bold text-white">{report.rubrics.resolution}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-center">
                <MessageSquare className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block truncate">Communication</span>
                <span className="text-sm font-bold text-white">{report.rubrics.communication}%</span>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses 2-Column */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Points Forts Observés
              </h5>
              <ul className="space-y-1.5">
                {report.strengths.map((s, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2">
              <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                Axes d'Amélioration
              </h5>
              <ul className="space-y-1.5">
                {report.weaknesses.map((w, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-rose-400 mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendation */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
            <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Recommandation Pédagogique du Tuteur IA
            </h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              {report.recommendation}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            Fermer
          </button>

          <div className="flex items-center gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Recommencer
              </button>
            )}

            {passed && onContinue && (
              <button
                onClick={onContinue}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
              >
                <span>Continuer le Cours</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceSimulationReportModal;
