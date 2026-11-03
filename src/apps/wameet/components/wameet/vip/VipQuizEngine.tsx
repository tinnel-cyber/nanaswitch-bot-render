import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VipQuizQuestion } from './types';
import { DEFAULT_VIP_QUIZ_QUESTIONS } from './mockVipData';
import { playTapBeep, playValidationBeep, playChaChingSound } from '../../../../../utils/audio';

export interface VipQuizEngineProps {
  questions?: VipQuizQuestion[];
  onQuizCompleted?: (score: number, total: number) => void;
  className?: string;
}

/**
 * Onglet Quiz : Interface QCM intégrée pour la Salle VIP Wameet.
 * Évaluation en direct, feedback pédagogique instantané et score final certifié.
 */
export const VipQuizEngine: React.FC<VipQuizEngineProps> = ({
  questions = DEFAULT_VIP_QUIZ_QUESTIONS,
  onQuizCompleted,
  className = ''
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const currentQ = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleSelectOption = (optionIndex: number) => {
    if (showExplanation) return;
    playTapBeep();
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionIndex
    }));
  };

  const handleValidateCurrent = () => {
    playValidationBeep();
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    playTapBeep();
    setShowExplanation(false);
    if (!isLastQuestion) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Fin du Quiz : Calcul du score
      setIsSubmitted(true);
      const score = calculateScore();
      if (score >= Math.ceil(questions.length * 0.75)) {
        playChaChingSound();
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {}
      }
      onQuizCompleted?.(score, questions.length);
    }
  };

  const handleRestartQuiz = () => {
    playTapBeep();
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setShowExplanation(false);
    setIsSubmitted(false);
  };

  const calculateScore = (): number => {
    return questions.reduce((acc, q, idx) => {
      return selectedAnswers[idx] === q.correctAnswerIndex ? acc + 1 : acc;
    }, 0);
  };

  const score = calculateScore();
  const percentage = Math.round((score / questions.length) * 100);
  const hasPassed = percentage >= 75;

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs ${className}`}
    >
      {/* =====================================================================
          1. ÉCRAN DES RÉSULTATS (LORSQUE LE QUIZ EST TERMINÉ)
         ===================================================================== */}
      {isSubmitted ? (
        <div className="text-center py-6 space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Award className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {hasPassed ? 'Félicitations ! Évaluation Réussie 🎉' : 'Évaluation non validée'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {hasPassed
                ? 'Vous maîtrisez les concepts clés du cours. Votre score a été enregistré dans votre dossier étudiant NaNa POS.'
                : 'Prenez le temps de revoir les leçons vidéo du Chapitre 1 avant de repasser le QCM.'}
            </p>
          </div>

          {/* Jauge de Score */}
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Votre Score
              </span>
              <span className="text-2xl font-black text-slate-900">
                {score} / {questions.length}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Taux de Réussite
              </span>
              <span
                className={`text-2xl font-black ${
                  hasPassed ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {percentage}%
              </span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRestartQuiz}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recommencer le QCM</span>
            </button>
          </div>
        </div>
      ) : (
        /* =====================================================================
           2. INTERFACE QCM INTERACTIVE QUESTION PAR QUESTION
           ===================================================================== */
        <div className="space-y-6">
          {/* Header & Barre de progression du quiz */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                QUESTION {currentQuestionIndex + 1} SUR {questions.length}
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                {currentQ.question}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {questions.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentQuestionIndex
                      ? 'w-6 bg-blue-600'
                      : selectedAnswers[idx] !== undefined
                      ? 'bg-blue-300'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Liste des Choix Multiples (A, B, C, D) */}
          <div className="space-y-2.5">
            {currentQ.options.map((option, optIdx) => {
              const isSelected = selectedAnswers[currentQuestionIndex] === optIdx;
              const isCorrect = currentQ.correctAnswerIndex === optIdx;

              let buttonStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80';

              if (showExplanation) {
                if (isCorrect) {
                  buttonStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                } else if (isSelected) {
                  buttonStyle = 'bg-red-50 border-red-300 text-red-950 line-through';
                } else {
                  buttonStyle = 'bg-slate-50 border-slate-200 opacity-50';
                }
              } else if (isSelected) {
                buttonStyle = 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20';
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={showExplanation}
                  className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${buttonStyle}`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                      showExplanation && isCorrect
                        ? 'bg-emerald-600 text-white'
                        : isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="text-xs sm:text-sm leading-relaxed flex-1">
                    {option}
                  </span>
                  {showExplanation && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {showExplanation && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explication Didactique du Professeur */}
          {showExplanation && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1.5 animate-fade-in">
              <div className="font-black flex items-center gap-1.5 text-blue-700">
                <HelpCircle className="w-4 h-4" />
                <span>Explication Pédagogique du Formateur :</span>
              </div>
              <p className="leading-relaxed font-medium">{currentQ.explanation}</p>
            </div>
          )}

          {/* Bouton d'Action Suivant / Valider */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {selectedAnswers[currentQuestionIndex] === undefined
                ? 'Sélectionnez une réponse pour continuer'
                : 'Réponse sélectionnée'}
            </span>

            {!showExplanation ? (
              <button
                type="button"
                onClick={handleValidateCurrent}
                disabled={selectedAnswers[currentQuestionIndex] === undefined}
                className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition cursor-pointer shadow-md"
              >
                Valider ma réponse
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <span>{isLastQuestion ? 'Voir mon Score Final' : 'Question Suivante'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VipQuizEngine;
