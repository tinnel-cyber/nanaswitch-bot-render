import React, { useState, useCallback } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  BookOpen, 
  HelpCircle, 
  Lightbulb, 
  Award,
  ChevronLeft,
  Flame
} from 'lucide-react';
import { RemediationModule } from '../../../../types';

interface PersonalizedRemediationViewProps {
  remediation: RemediationModule;
  onComplete: () => Promise<void>;
  onBackToCourse?: () => void;
}

export const PersonalizedRemediationView: React.FC<PersonalizedRemediationViewProps> = ({
  remediation,
  onComplete,
  onBackToCourse
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCompletedSuccess, setIsCompletedSuccess] = useState(remediation.completed);

  const quickCheck = remediation.quickCheckQuestion;
  const isAnswerCorrect = selectedOption === quickCheck.correctOptionIndex;

  const handleVerifyAnswer = () => {
    if (selectedOption === null) return;
    setHasSubmittedAnswer(true);
  };

  const handleCompleteRemediation = async () => {
    setIsValidating(true);
    try {
      await onComplete();
      setIsCompletedSuccess(true);
    } catch (err) {
      console.error('Erreur validation remédiation:', err);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="w-full flex flex-col min-h-[500px] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-950 border-b border-purple-500/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToCourse && (
            <button
              onClick={onBackToCourse}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Retourner au parcours principal"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Sparkles className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Module 2.5 Sur-Mesure
              </span>
              <span className="text-xs text-slate-400">Généré par NaNa AI Tutor</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {remediation.title}
            </h2>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs text-purple-300 font-semibold">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>+25 pts de Réputation à la validation</span>
        </div>
      </div>

      {/* Main Scrollable Content Body */}
      <div className="flex-1 max-h-[750px] overflow-y-auto overscroll-contain p-4 sm:p-8 space-y-6 touch-pan-y custom-scrollbar max-w-4xl mx-auto w-full">
        {/* Why this module exists (Target Concepts) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Pourquoi ce module personnalisé ?
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Notre tuteur IA a identifié que certains concepts clés nécessitaient un éclaircissement avant de passer aux modules suivants. Cette capsule ciblée vous permet de maîtriser ces points à votre rythme.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {remediation.targetConcepts.map((concept, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2.5">
          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            Ce que vous allez retenir
          </h4>
          <ul className="space-y-1.5">
            {remediation.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Remediation Lesson Content */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            Explication Approfondie & Cas Concret
          </h4>
          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line space-y-3">
            {remediation.markdownContent}
          </div>
        </div>

        {/* Interactive Quick-Check Assessment */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Micro-Vérification Interactive
            </h4>
            <span className="text-[11px] text-slate-400">1 question pour valider</span>
          </div>

          <p className="text-sm font-semibold text-white">
            {quickCheck.question}
          </p>

          <div className="space-y-2">
            {quickCheck.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!hasSubmittedAnswer) setSelectedOption(idx);
                  }}
                  disabled={hasSubmittedAnswer}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                    hasSubmittedAnswer
                      ? idx === quickCheck.correctOptionIndex
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold'
                        : isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                      : isSelected
                      ? 'bg-purple-500/20 border-purple-500 text-purple-200 font-bold shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span>{opt}</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
                  }`}>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Verification feedback */}
          {!hasSubmittedAnswer ? (
            <button
              type="button"
              onClick={handleVerifyAnswer}
              disabled={selectedOption === null}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-40 transition"
            >
              Vérifier ma réponse
            </button>
          ) : (
            <div className={`p-4 rounded-xl border space-y-2 ${
              isAnswerCorrect ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/30 border-rose-500/40'
            }`}>
              <div className="flex items-center gap-2">
                {isAnswerCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Excellente réponse !</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-rose-400">Pas tout à fait. Voici l'explication :</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {quickCheck.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Final Completion Button */}
        {(hasSubmittedAnswer || isCompletedSuccess) && (
          <div className="pt-2 pb-6 text-center">
            {isCompletedSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">Module de remédiation validé ! Le module suivant est débloqué.</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCompleteRemediation}
                disabled={isValidating}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-teal-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all active:scale-98 flex items-center justify-center gap-2 mx-auto"
              >
                <Award className="w-4 h-4" />
                <span>{isValidating ? 'Validation en cours...' : 'Valider la Remédiation & Débloquer la Suite'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalizedRemediationView;
