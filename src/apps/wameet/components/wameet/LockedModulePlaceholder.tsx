import React from 'react';
import { Lock, ArrowUpRight, Sparkles, BookOpen } from 'lucide-react';

export interface LockedModulePlaceholderProps {
  moduleTitle?: string;
  requiredLessonTitle?: string;
  prerequisiteLessonId?: string;
  onGoToPrerequisite?: (prerequisiteLessonId?: string) => void;
  className?: string;
}

/**
 * Composant de substitution affiché dans le chat lorsqu'un message/module est verrouillé
 * par le formateur tant que le module prérequis n'est pas terminé par l'étudiant.
 */
export const LockedModulePlaceholder: React.FC<LockedModulePlaceholderProps> = ({
  moduleTitle = 'Module suivant',
  requiredLessonTitle = 'le module précédent',
  prerequisiteLessonId,
  onGoToPrerequisite,
  className = ''
}) => {
  return (
    <div
      className={`max-w-md w-full rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 text-white p-4 shadow-md font-sans select-none transition-all duration-200 hover:border-slate-700 ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Icône Cadenas stylisée */}
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
          <Lock className="w-5 h-5 stroke-[2.2]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              Contenu Verrouillé 🔒
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              Progression requise
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-100 truncate">
            {moduleTitle}
          </h4>

          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Ce cours se débloquera dès que vous aurez validé :{' '}
            <strong className="text-blue-300 font-bold">{requiredLessonTitle}</strong>.
          </p>

          {onGoToPrerequisite && prerequisiteLessonId && (
            <button
              type="button"
              onClick={() => onGoToPrerequisite(prerequisiteLessonId)}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#0084FF] hover:text-blue-400 hover:underline transition-colors cursor-pointer"
            >
              <span>Accéder au module prérequis</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LockedModulePlaceholder;
