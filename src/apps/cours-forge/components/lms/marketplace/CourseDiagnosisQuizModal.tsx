import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, ArrowRight, Sparkles, Clock, AlertTriangle, 
  Award, Zap, CheckCircle2, ShieldCheck, Target, ChevronRight, HelpCircle
} from 'lucide-react';
import { MarketplaceCourse } from './types';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../../../../utils/audio';

export interface CourseDiagnosisQuizModalProps {
  course: MarketplaceCourse;
  isOpen: boolean;
  onClose: () => void;
  onClaimDiscount: (discountPercentage: number) => void;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: {
    label: string;
    description: string;
    tag: string;
    recommendedModuleIndex: number;
  }[];
}

export const CourseDiagnosisQuizModal: React.FC<CourseDiagnosisQuizModalProps> = ({
  course,
  isOpen,
  onClose,
  onClaimDiscount
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0); // 0, 1, 2 = questions, 3 = result
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(15 * 60); // 15 min = 900s
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // 1. Questions personnalisées selon le domaine du cours
  const questions: QuizQuestion[] = useMemo(() => [
    {
      id: 1,
      question: "Quel est votre niveau actuel de maîtrise pratique ?",
      options: [
        {
          label: "Débutant Curieux",
          description: "Je pars de zéro et je cherche un accompagnement pas-à-pas clair et sans jargon.",
          tag: "Niveau 1",
          recommendedModuleIndex: 0
        },
        {
          label: "Praticien Intermédiaire",
          description: "J'ai les bases mais je perds du temps sur les erreurs techniques et l'intégration.",
          tag: "Niveau 2",
          recommendedModuleIndex: 1
        },
        {
          label: "Professionnel / Entrepreneur",
          description: "Je souhaite automatiser mes flux, sécuriser mes systèmes et passer à l'échelle.",
          tag: "Niveau 3",
          recommendedModuleIndex: 2
        }
      ]
    },
    {
      id: 2,
      question: "Quel est votre plus grand défi au quotidien ?",
      options: [
        {
          label: "Pertes de temps manuelles",
          description: "Traiter les opérations manuellement au lieu d'avoir un système automatisé fluide.",
          tag: "Productivité",
          recommendedModuleIndex: 1
        },
        {
          label: "Peur des erreurs ou pannes",
          description: "Crainte de bugs, de litiges de paiement ou de perte de données clients.",
          tag: "Sécurité",
          recommendedModuleIndex: 2
        },
        {
          label: "Manque de compétences reconnues",
          description: "Difficulté à prouver mes compétences avec une certification officielle homologuée.",
          tag: "Carrière & Crédibilité",
          recommendedModuleIndex: 0
        }
      ]
    },
    {
      id: 3,
      question: "Quel résultat prioritaire visez-vous d'ici 30 jours ?",
      options: [
        {
          label: "Maîtrise opérationnelle totale",
          description: "Être capable de déployer et configurer le système en totale autonomie.",
          tag: "Autonomie 100%",
          recommendedModuleIndex: 1
        },
        {
          label: "Augmenter mes revenus / rentabilité",
          description: "Générer un retour sur investissement rapide grâce aux compétences acquises.",
          tag: "Croissance Business",
          recommendedModuleIndex: 2
        },
        {
          label: "Décrocher le diplôme certifié",
          description: "Obtenir mon attestation académique signée pour valoriser mon profil en Afrique de l'Ouest.",
          tag: "Diplôme Officiel",
          recommendedModuleIndex: 0
        }
      ]
    }
  ], []);

  // 2. Horloge de réduction flash (15 minutes) dès l'affichage du diagnostic
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && countdownSeconds > 0) {
      interval = setInterval(() => {
        setCountdownSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, countdownSeconds]);

  // Réinitialisation à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setSelectedAnswers([]);
      setCountdownSeconds(15 * 60);
      setIsTimerRunning(false);
    }
  }, [isOpen]);

  const handleSelectOption = (optionIndex: number) => {
    playValidationBeep();
    const newAnswers = [...selectedAnswers];
    newAnswers[currentStep] = optionIndex;
    setSelectedAnswers(newAnswers);

    // Auto-advance après micro-délai pour savourer le feedback visuel
    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        // Fin du quiz -> Passage à l'écran de résultat & déclenchement du timer 15 min
        playCashChime();
        setCurrentStep(3);
        setIsTimerRunning(true);
      }
    }, 280);
  };

  // Calcul du module cible recommandé
  const recommendedModule = useMemo(() => {
    if (selectedAnswers.length === 0 || !course.modules || course.modules.length === 0) {
      return course.modules?.[0] || { title: "Architecture & Fondamentaux Pratiques" };
    }
    const lastAns = selectedAnswers[selectedAnswers.length - 1] || 0;
    const targetIdx = Math.min(lastAns, course.modules.length - 1);
    return course.modules[targetIdx] || course.modules[0];
  }, [selectedAnswers, course.modules]);

  // Calcul des tarifs avec -10% flash discount
  const basePrice = course.discountPrice || course.price;
  const flashPrice = Math.round(basePrice * 0.9);
  const savings = basePrice - flashPrice;

  const mins = Math.floor(countdownSeconds / 60);
  const secs = countdownSeconds % 60;
  const formattedCountdown = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overscroll-contain">
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 relative"
      >
        {/* =========================================================================
            EN-TÊTE DU QUIZ DIAGNOSTIC
           ========================================================================= */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wide">
                Test Express Diagnostic 60s
              </h3>
              <p className="text-[10.5px] text-slate-400 truncate max-w-[230px]">
                {course.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Fermer le test"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de progression des 3 questions */}
        {currentStep < 3 && (
          <div className="w-full bg-slate-900 h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${questions.length > 0 ? Math.min(100, Math.round(((currentStep + 1) / questions.length) * 100)) : 0}%` }}
            />
          </div>
        )}

        {/* =========================================================================
            CORPS DU TEST : ÉTAPES 1, 2, 3 vs RÉSULTAT DIAGNOSTIC
           ========================================================================= */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {currentStep < 3 ? (
            /* QUESTIONS RAPIDES DU QUIZ */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                <span>Question {currentStep + 1} sur 3</span>
                <span>Chrono express</span>
              </div>

              <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                {questions[currentStep].question}
              </h4>

              <div className="space-y-2.5 pt-1">
                {questions[currentStep].options.map((opt, idx) => {
                  const isSelected = selectedAnswers[currentStep] === idx;
                  return (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-emerald-500/70 shadow-lg shadow-emerald-950/40'
                          : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            {opt.label}
                          </span>
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-400 leading-relaxed font-normal">
                          {opt.description}
                        </p>
                      </div>

                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition ${
                        isSelected 
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                          : 'border-slate-700 bg-slate-950'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* =====================================================================
               RÉSULTAT DU DIAGNOSTIC + COMPTE À REBOURS 15 MIN (FOMO ENGINE)
               ===================================================================== */
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 text-center"
            >
              {/* Badge de Diagnostic */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Diagnostic Positif : Formation Recommandée à 98%</span>
              </div>

              <h4 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Ce cours comble exactement votre besoin d&apos;automatisation !
              </h4>

              {/* Passerelle directe vers le module clé du syllabus */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-left space-y-2">
                <div className="text-[10.5px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Votre Passerelle d&apos;Accélération Immédiate</span>
                </div>
                <div className="text-sm font-black text-white">
                  {recommendedModule.title}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Selon vos réponses, ce module pratique est précisément taillé pour vous éviter les pertes de temps et automatiser vos flux dès les premiers jours.
                </p>
              </div>

              {/* ===================================================================
                  LE COMPTE À REBOURS PULSANT 15 MIN (-10% FLASH DISCOUNT)
                 =================================================================== */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/60 border-2 border-rose-500/60 shadow-xl space-y-2.5 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5 animate-pulse">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>Offre Flash Spéciale Test (15 min)</span>
                  </span>
                  <span className="font-mono font-black text-sm text-amber-300 bg-black/50 px-2.5 py-0.5 rounded-lg border border-amber-500/40 shadow-inner">
                    {formattedCountdown}
                  </span>
                </div>

                <div className="flex items-baseline justify-center gap-2.5 pt-1">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {formatCFA(flashPrice)}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 line-through">
                    {formatCFA(basePrice)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black">
                    -10% Économie
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Économisez <strong className="text-white font-bold">{formatCFA(savings)}</strong> en validant votre inscription par Mobile Money avant la fin du décompte.
                </p>
              </div>

              {/* Bouton CTA d'Action Immédiate */}
              <button
                type="button"
                onClick={() => {
                  playCashChime();
                  onClose();
                  onClaimDiscount(10);
                }}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-sm shadow-xl shadow-emerald-950/60 transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>🚀 Réclamer mes -10% &amp; M&apos;inscrire Maintenant</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[10.5px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Paiement sécurisé Wave, Orange Money, Moov, MTN</span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CourseDiagnosisQuizModal;
