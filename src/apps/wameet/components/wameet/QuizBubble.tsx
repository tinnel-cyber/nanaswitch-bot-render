import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Award,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

export interface QuizOption {
  id?: string;
  letter: string; // ex: 'A', 'B', 'C', 'D'
  text: string;
}

export interface QuizBubbleProps {
  id?: string;
  question: string;
  options: (string | QuizOption)[];
  correctOptionIndex: number; // 0-based index
  explanation?: string;
  points?: number; // ex: 10
  categoryBadge?: string; // ex: "Quiz Rapide • E-Commerce"
  timestamp?: string;
  onAnswer?: (selectedIdx: number, isCorrect: boolean) => void;
  className?: string;
}

export const QuizBubble: React.FC<QuizBubbleProps> = ({
  id,
  question,
  options,
  correctOptionIndex,
  explanation,
  points = 10,
  categoryBadge = 'Quiz Rapide',
  timestamp,
  onAnswer,
  className = ''
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Normalisation des options sous forme uniforme { letter, text }
  const normalizedOptions: QuizOption[] = options.map((opt, idx) => {
    const defaultLetter = String.fromCharCode(65 + idx); // A, B, C, D...
    if (typeof opt === 'string') {
      return { letter: defaultLetter, text: opt };
    }
    return {
      letter: opt.letter || defaultLetter,
      text: opt.text
    };
  });

  const hasAnswered = selectedIndex !== null;
  const isCorrect = selectedIndex === correctOptionIndex;

  const handleSelectOption = (idx: number) => {
    if (hasAnswered) return; // Verrouille le vote après la première sélection

    setSelectedIndex(idx);
    const correct = idx === correctOptionIndex;

    if (correct) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    if (onAnswer) {
      onAnswer(idx, correct);
    }
  };

  const handleReset = () => {
    setSelectedIndex(null);
    setShowConfetti(false);
  };

  return (
    <div
      className={`relative max-w-md w-full rounded-2xl bg-white border border-slate-200/90 shadow-md overflow-hidden font-sans select-none transition-all duration-200 hover:shadow-lg ${className}`}
    >
      {/* -------------------------------------------------------------------
          0. EFFET CONFETTIS CSS LORS D'UNE BONNE RÉPONSE 🎉
         ------------------------------------------------------------------- */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex items-center justify-center">
          <div className="relative w-full h-full">
            {Array.from({ length: 32 }).map((_, i) => {
              const colors = ['#10b981', '#0084FF', '#f59e0b', '#ec4899', '#8b5cf6'];
              const color = colors[i % colors.length];
              const left = `${(i * 3.2) + Math.random() * 5}%`;
              const animDuration = `${0.9 + Math.random() * 0.8}s`;
              const animDelay = `${Math.random() * 0.2}s`;
              const size = `${6 + Math.random() * 6}px`;

              return (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '20%',
                    left,
                    width: size,
                    height: size,
                    backgroundColor: color,
                    borderRadius: i % 2 === 0 ? '50%' : '2px',
                    animation: `quizConfettiFall ${animDuration} ease-out ${animDelay} forwards`
                  }}
                />
              );
            })}
          </div>
          <style>{`
            @keyframes quizConfettiFall {
              0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
              100% { transform: translateY(180px) rotate(360deg) scale(0.4); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* -------------------------------------------------------------------
          1. EN-TÊTE DU QUIZ INTERACTIF
         ------------------------------------------------------------------- */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#0084FF] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 truncate">
                {categoryBadge}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-400/30">
                <Award className="w-2.5 h-2.5 text-amber-300" />
                +{points} pts
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 truncate">
              Question à Choix Multiples (QCM)
            </p>
          </div>
        </div>

        {hasAnswered && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border shrink-0 animate-in fade-in duration-200 ${
              isCorrect
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}
          >
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Bonne réponse !
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-rose-400" />
                Réponse incorrecte
              </>
            )}
          </span>
        )}
      </div>

      {/* -------------------------------------------------------------------
          2. ÉNONCÉ DE LA QUESTION
         ------------------------------------------------------------------- */}
      <div className="p-4 space-y-3.5 bg-slate-50/50">
        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
          {question}
        </h4>

        {/* -------------------------------------------------------------------
            3. LISTE DES OPTIONS CLICQUABLES (A, B, C...)
           ------------------------------------------------------------------- */}
        <div className="space-y-2">
          {normalizedOptions.map((opt, idx) => {
            const isThisSelected = selectedIndex === idx;
            const isThisCorrect = idx === correctOptionIndex;

            // Variantes de style dynamiques :
            // Neutre (avant vote) -> Vert (si juste) -> Rouge (si sélectionné et faux)
            let buttonStyle = 'bg-white border-slate-200/90 text-slate-800 hover:bg-blue-50/60 hover:border-blue-300';
            let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

            if (hasAnswered) {
              if (isThisCorrect) {
                // Option correcte (toujours mise en vert pour apprendre)
                buttonStyle = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-bold shadow-xs';
                badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
              } else if (isThisSelected && !isCorrect) {
                // Mauvais choix sélectionné par le client
                buttonStyle = 'bg-rose-50 border-2 border-rose-500 text-rose-950 font-bold shadow-xs';
                badgeStyle = 'bg-rose-600 text-white border-rose-600';
              } else {
                // Autres options non choisies
                buttonStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                badgeStyle = 'bg-slate-200 text-slate-500 border-slate-200';
              }
            }

            return (
              <button
                key={opt.letter || idx}
                type="button"
                disabled={hasAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer disabled:cursor-default ${buttonStyle}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black border shrink-0 transition-colors ${badgeStyle}`}
                  >
                    {opt.letter}
                  </span>
                  <span className="text-xs truncate">{opt.text}</span>
                </div>

                {hasAnswered && (
                  <div className="shrink-0">
                    {isThisCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.4]" />
                    )}
                    {isThisSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-600 stroke-[2.4]" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* -------------------------------------------------------------------
            4. EXPLICATION PÉDAGOGIQUE APRÈS RÉPONSE
           ------------------------------------------------------------------- */}
        {hasAnswered && explanation && (
          <div
            className={`p-3 rounded-xl text-xs leading-relaxed animate-in fade-in duration-200 border ${
              isCorrect
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-blue-50/80 border-blue-200 text-blue-950'
            }`}
          >
            <div className="font-extrabold flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#0084FF]" />
              <span>Explication du formateur :</span>
            </div>
            <p className="font-medium text-[11px] text-slate-700">{explanation}</p>
          </div>
        )}

        {/* Pied discret : Réessayer ou Horodatage */}
        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-semibold">
          {hasAnswered ? (
            <button
              type="button"
              onClick={handleReset}
              className="text-[#0084FF] hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Recommencer le quiz</span>
            </button>
          ) : (
            <span className="text-slate-400">Cliquez sur une option pour valider</span>
          )}

          {timestamp && <span>{timestamp}</span>}
        </div>
      </div>
    </div>
  );
};

export default QuizBubble;
