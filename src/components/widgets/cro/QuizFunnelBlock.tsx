import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Zap,
  HelpCircle,
  RotateCcw,
  Flame,
  Clock,
  ShieldCheck,
  Tag,
  ArrowRight,
  TrendingUp,
  Target,
  Gift,
  Award,
  Check
} from 'lucide-react';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../utils/audio';

// ============================================================================
// TYPES DU QUIZ DE MICRO-ENGAGEMENT
// ============================================================================

export interface QuizOption {
  id: string;
  text: string;
  subtext?: string;
  badge?: string; // e.g. "🚀", "⚡", "🌱", "💡"
  profile?: 'scale' | 'automation' | 'starter' | string;
  score?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  subtitle?: string;
  options: QuizOption[];
}

export interface QuizOutcome {
  id: string; // e.g. 'scale', 'automation', 'starter'
  badge: string;
  title: string;
  headline: string;
  description: string;
  productName?: string;
  productImage?: string;
  discountBadge?: string;
  promoPrice?: number;
  originalPrice?: number;
  features: string[];
  ctaText: string;
  ctaLink: string;
  urgencyMinutes?: number;
  guaranteeText?: string;
}

export interface QuizFunnelData {
  badgeText?: string;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  bgColor?: string;
  cardBgColor?: string;
  questions?: QuizQuestion[];
  outcomes?: QuizOutcome[];
  autoAdvance?: boolean;
  showUrgencyTimer?: boolean;
  computingDurationMs?: number;
  footerNotice?: string;
}

export interface QuizFunnelBlockProps {
  block?: { id?: string; data?: QuizFunnelData };
  data?: QuizFunnelData;
  activeProduct?: {
    id?: string;
    name?: string;
    price?: number;
    originalPrice?: number;
    image?: string;
    description?: string;
  } | null;
  isBuilderMode?: boolean;
  onCtaClick?: (outcome: QuizOutcome) => void;
  className?: string;
}

// ============================================================================
// DONNÉES PAR DÉFAUT DU QUIZ (OPTIMISÉES CRO & CONVERSION CLICKFUNNELS 2.0)
// ============================================================================

export const DEFAULT_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Quel est votre objectif n°1 pour votre activité ce mois-ci ?',
    subtitle: 'Sélectionnez la priorité absolue qui correspond à votre vision.',
    options: [
      {
        id: 'q1_o1',
        text: 'Booster mes ventes et doubler mes commandes',
        subtext: 'Générer un volume massif et maximiser la rentabilité',
        badge: '🚀',
        profile: 'scale',
        score: 3
      },
      {
        id: 'q1_o2',
        text: 'Automatiser la livraison et le suivi client',
        subtext: 'Gagner du temps précieux sur WhatsApp, Wave et Orange Money',
        badge: '⚡',
        profile: 'automation',
        score: 2
      },
      {
        id: 'q1_o3',
        text: 'Lancer mon premier produit sans prendre de risque',
        subtext: 'Tester le marché avec un budget maîtrisé et un guide fiable',
        badge: '🌱',
        profile: 'starter',
        score: 1
      }
    ]
  },
  {
    id: 'q2',
    question: 'Quel chiffre de ventes mensuel visez-vous concrètement ?',
    subtitle: 'Cette information calibre la puissance de la recommandation.',
    options: [
      {
        id: 'q2_o1',
        text: 'Plus de 1 000 000 FCFA / mois',
        subtext: 'Profil Croissance Élite • Prêt pour l\'expansion rapide',
        badge: '💎',
        profile: 'scale',
        score: 3
      },
      {
        id: 'q2_o2',
        text: 'Entre 250 000 et 1 000 000 FCFA / mois',
        subtext: 'Profil Pro • Structuration et stabilisation des gains',
        badge: '🔥',
        profile: 'automation',
        score: 2
      },
      {
        id: 'q2_o3',
        text: 'Moins de 250 000 FCFA / mois',
        subtext: 'Profil Démarrage • Premiers pas rentables et validation',
        badge: '🎯',
        profile: 'starter',
        score: 1
      }
    ]
  },
  {
    id: 'q3',
    question: 'Quel est votre principal frein ou goulot d\'étranglement actuel ?',
    subtitle: 'Identifier le blocage permet de débloquer l\'offre idéale.',
    options: [
      {
        id: 'q3_o1',
        text: 'Les visiteurs regardent mais ne commandent pas assez',
        subtext: 'Besoin d\'un tunnel de conversion ultra-persuasif',
        badge: '📉',
        profile: 'scale',
        score: 3
      },
      {
        id: 'q3_o2',
        text: 'Je perds trop de temps à gérer les clients manuellement',
        subtext: 'Frictions de paiements, relances et retards de confirmation',
        badge: '⏳',
        profile: 'automation',
        score: 2
      },
      {
        id: 'q3_o3',
        text: 'Je ne sais pas par quoi commencer ni quels outils utiliser',
        subtext: 'Besoin d\'une méthode clé en main éprouvée',
        badge: '💡',
        profile: 'starter',
        score: 1
      }
    ]
  },
  {
    id: 'q4',
    question: 'À quelle vitesse souhaitez-vous mettre en place la solution ?',
    subtitle: 'Nous ajustons notre accompagnement selon votre disponibilité.',
    options: [
      {
        id: 'q4_o1',
        text: 'Immédiatement (Déploiement clé en main sous 24h à 48h)',
        subtext: 'Je veux des résultats dès cette semaine',
        badge: '⚡',
        profile: 'scale',
        score: 3
      },
      {
        id: 'q4_o2',
        text: 'Dans les 7 à 14 prochains jours à mon rythme',
        subtext: 'Je veux prendre le temps d\'adapter la solution',
        badge: '🗓️',
        profile: 'automation',
        score: 2
      },
      {
        id: 'q4_o3',
        text: 'Pas d\'urgence, je teste d\'abord la formule de base',
        subtext: 'Découverte progressive sans pression',
        badge: '🛡️',
        profile: 'starter',
        score: 1
      }
    ]
  }
];

export const DEFAULT_QUIZ_OUTCOMES: QuizOutcome[] = [
  {
    id: 'scale',
    badge: '🎯 98% COMPATIBILITÉ • RECOMMANDATION ÉLITE VIP',
    title: 'Votre Profil : Croissance & Domination de Marché',
    headline: 'Pack Élite NaNa Pro X — Le Moteur de Vente Ultime',
    description: 'Vos réponses indiquent que vous avez l\'ambition et les fondations pour passer à la vitesse supérieure. Le Pack Élite élimine toutes les limites pour multiplier vos conversions dès le premier jour.',
    productName: 'Pack Élite NaNa Pro X (Licence Clé en Main)',
    productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80',
    discountBadge: 'RÉDUCTION EXCLUSIVE -45% DÉBLOQUÉE',
    promoPrice: 45000,
    originalPrice: 85000,
    features: [
      'Tunnel de Vente Haute Conversion Prêt à l\'Emploi (AIDA + FOMO)',
      'Intégration Directe Paiement Wave, Orange Money & COD',
      'Accès Privilégié Mastermind & Support WhatsApp VIP 7j/7',
      'Garantie Satisfait ou Remboursé Intégrale 30 Jours'
    ],
    ctaText: 'Débloquer Mon Pack Élite (-45%) ➔',
    ctaLink: '#checkout',
    urgencyMinutes: 15,
    guaranteeText: 'Sécurisé SSL 256-Bit • Activation Immédiate en 1 Clic'
  },
  {
    id: 'automation',
    badge: '⚡ 94% COMPATIBILITÉ • RECOMMANDATION OPTIMISATION PRO',
    title: 'Votre Profil : Gain de Temps & Automatisation Intelligente',
    headline: 'Formule Système Pro — Zéro Friction, Zéro Temps Perdu',
    description: 'Votre plus grand levier réside dans l\'élimination des tâches manuelles répétitives. Ce système centralise vos commandes et valide vos livraisons automatiquement sans que vous n\'ayez à passer vos journées au téléphone.',
    productName: 'Formule Système Pro NaNa (Automatisation Complète)',
    productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    discountBadge: 'OFFRE SPÉCIALE GAIN DE TEMPS -35%',
    promoPrice: 29000,
    originalPrice: 49000,
    features: [
      'Générateur de Reçus et Notifications WhatsApp Automatisées',
      'Connexion Directe Livraisons Rapides Abidjan, Dakar & Lomé',
      'Guide Vidéo Express : Prise en main complète en 30 minutes',
      'Assistance Technique Dédiée pendant 6 mois'
    ],
    ctaText: 'Sélectionner la Formule Pro (-35%) ➔',
    ctaLink: '#checkout',
    urgencyMinutes: 20,
    guaranteeText: 'Paiement sans risque • Vérification avant validation'
  },
  {
    id: 'starter',
    badge: '🌱 91% COMPATIBILITÉ • RECOMMANDATION DÉMARRAGE RAPIDE',
    title: 'Votre Profil : Décollage Rentable Sans Risque',
    headline: 'Pack Démarrage Accéléré — Vos Premières Ventes Garanties',
    description: 'Vous démarrez ou souhaitez tester un nouveau canal sans engager de dépenses inutiles. Cette formule condensée vous offre l\'essentiel pour sécuriser vos premiers revenus dès vos premiers lancements.',
    productName: 'Pack Démarrage Essentiel NaNa',
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    discountBadge: 'TARIF DE BIENVENUE -30%',
    promoPrice: 19500,
    originalPrice: 35000,
    features: [
      'Gabarit de Page Produit Épuré et Mobile-First',
      'Formulaire de Commande 1-Clic Simplifié',
      'Support par Chat WhatsApp pour vous accompagner pas-à-pas',
      'Garantie Totale Zéro Risque 14 Jours'
    ],
    ctaText: 'Démarrer Mon Activité Sans Risque ➔',
    ctaLink: '#checkout',
    urgencyMinutes: 30,
    guaranteeText: 'Règlement à la livraison ou Wave / Orange Money'
  }
];

export const DEFAULT_QUIZ_FUNNEL_DATA: QuizFunnelData = {
  badgeText: 'DIAGNOSTIC SUR-MESURE ⚡',
  title: 'Trouvez la Formule Exacte Adaptée à Votre Projet',
  subtitle: 'Répondez à quelques questions rapides (moins de 60 secondes) pour débloquer votre recommandation ciblée et une réduction exclusive.',
  accentColor: '#8b5cf6',
  bgColor: '#070b16',
  cardBgColor: '#0d1527',
  questions: DEFAULT_QUIZ_QUESTIONS,
  outcomes: DEFAULT_QUIZ_OUTCOMES,
  autoAdvance: true,
  showUrgencyTimer: true,
  computingDurationMs: 1400,
  footerNotice: '100% Confidentiel • Résultat calculé en temps réel avec diagnostic instantané'
};

// ============================================================================
// CALCULATEUR DE RÉSULTAT (LOGIQUE IF/ELSE & SCORING CRO)
// ============================================================================

export function calculateQuizOutcome(
  selectedAnswers: Record<string, string>,
  questions: QuizQuestion[],
  outcomes: QuizOutcome[]
): QuizOutcome {
  if (!outcomes || outcomes.length === 0) {
    return DEFAULT_QUIZ_OUTCOMES[0];
  }

  // 1. Compteur de profils (scale, automation, starter)
  const profileCounts: Record<string, number> = {
    scale: 0,
    automation: 0,
    starter: 0
  };

  let totalScore = 0;

  // Parcourir les réponses données
  questions.forEach(q => {
    const selectedOptionId = selectedAnswers[q.id];
    if (selectedOptionId) {
      const opt = q.options.find(o => o.id === selectedOptionId);
      if (opt) {
        if (opt.profile && profileCounts[opt.profile] !== undefined) {
          profileCounts[opt.profile] += 1;
        } else if (opt.profile) {
          profileCounts[opt.profile] = (profileCounts[opt.profile] || 0) + 1;
        }
        if (typeof opt.score === 'number') {
          totalScore += opt.score;
        }
      }
    }
  });

  // 2. Logique décisionnelle if/else basée sur le profil dominant et/ou le score global
  const scaleCount = profileCounts.scale || 0;
  const autoCount = profileCounts.automation || 0;
  const starterCount = profileCounts.starter || 0;

  // Logique Conditionnelle Prioritaire :
  // Si le profil 'scale' domine OU score élevé (>= 10 points pour 4 questions) -> Offre Élite
  if (scaleCount >= autoCount && scaleCount >= starterCount && (scaleCount > 0 || totalScore >= 10)) {
    const found = outcomes.find(o => o.id === 'scale');
    if (found) return found;
  }
  
  // Sinon si le profil 'automation' domine OU score intermédiaire (>= 7 points) -> Offre Pro Automation
  else if (autoCount >= starterCount && (autoCount > 0 || totalScore >= 7)) {
    const found = outcomes.find(o => o.id === 'automation');
    if (found) return found;
  }
  
  // Sinon (starter domine ou score de découverte) -> Offre Starter
  else {
    const found = outcomes.find(o => o.id === 'starter');
    if (found) return found;
  }

  // Fallback sûr
  return outcomes[0];
}

// ============================================================================
// COMPOSANT PRINCIPAL : QUIZ FUNNEL BLOCK
// ============================================================================

export const QuizFunnelBlock: React.FC<QuizFunnelBlockProps> = ({
  block,
  data: propsData,
  activeProduct,
  isBuilderMode = false,
  onCtaClick,
  className = ''
}) => {
  // Fusion des données : props.data > block.data > DEFAULT
  const data: QuizFunnelData = useMemo(() => {
    const merged = {
      ...DEFAULT_QUIZ_FUNNEL_DATA,
      ...(block?.data || {}),
      ...(propsData || {})
    };
    // S'assurer que questions et outcomes ne sont pas vides
    if (!merged.questions || merged.questions.length === 0) {
      merged.questions = DEFAULT_QUIZ_QUESTIONS;
    }
    if (!merged.outcomes || merged.outcomes.length === 0) {
      merged.outcomes = DEFAULT_QUIZ_OUTCOMES;
    }
    return merged;
  }, [block?.data, propsData]);

  const questions = data.questions || DEFAULT_QUIZ_QUESTIONS;
  const outcomes = data.outcomes || DEFAULT_QUIZ_OUTCOMES;
  const accentColor = data.accentColor || '#8b5cf6';
  const bgColor = data.bgColor || '#070b16';
  const cardBgColor = data.cardBgColor || '#0d1527';

  // États du Quiz
  // 'quiz': en train de répondre | 'computing': animation d'analyse (1.5s) | 'result': affichage de l'offre
  const [quizState, setQuizState] = useState<'quiz' | 'computing' | 'result'>('quiz');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [computingProgress, setComputingProgress] = useState<number>(0);
  const [computedOutcome, setComputedOutcome] = useState<QuizOutcome | null>(null);

  // Timer de compte à rebours pour l'offre finale
  const initialUrgencyMinutes = (computedOutcome?.urgencyMinutes || 15);
  const [urgencySeconds, setUrgencySeconds] = useState<number>(initialUrgencyMinutes * 60);

  // Synchronisation du timer quand un résultat est calculé
  useEffect(() => {
    if (computedOutcome?.urgencyMinutes) {
      setUrgencySeconds(computedOutcome.urgencyMinutes * 60);
    }
  }, [computedOutcome]);

  // Décompte du timer en mode résultat
  useEffect(() => {
    if (quizState !== 'result') return;
    const interval = setInterval(() => {
      setUrgencySeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [quizState]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const totalQuestions = questions.length;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

  // Gestion de la sélection d'une option
  const handleSelectOption = useCallback((questionId: string, optionId: string) => {
    // Son haptique / audio
    try {
      playTapBeep();
    } catch (e) {
      // Ignorer si audio non autorisé
    }

    const updatedAnswers = {
      ...selectedAnswers,
      [questionId]: optionId
    };
    setSelectedAnswers(updatedAnswers);

    // Auto-advance ou transition
    if (data.autoAdvance !== false) {
      setTimeout(() => {
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          // Dernière question répondue -> Lancement du calcul et de l'animation d'analyse
          startComputingResult(updatedAnswers);
        }
      }, 260);
    }
  }, [selectedAnswers, currentQuestionIndex, totalQuestions, data.autoAdvance]);

  // Écran d'analyse algorithmique animé (Micro-Engagement ClickFunnels 2.0)
  const startComputingResult = useCallback((finalAnswers: Record<string, string>) => {
    setQuizState('computing');
    setComputingProgress(15);

    try {
      playValidationBeep();
    } catch (e) {}

    // Évolution progressive de la jauge d'analyse
    const timer1 = setTimeout(() => setComputingProgress(55), 400);
    const timer2 = setTimeout(() => setComputingProgress(88), 900);
    const timer3 = setTimeout(() => {
      setComputingProgress(100);
      const outcome = calculateQuizOutcome(finalAnswers, questions, outcomes);
      setComputedOutcome(outcome);
      setQuizState('result');
      try {
        playValidationBeep();
      } catch (e) {}
    }, data.computingDurationMs || 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [questions, outcomes, data.computingDurationMs]);

  // Réinitialiser le quiz
  const handleResetQuiz = useCallback(() => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setQuizState('quiz');
    setComputingProgress(0);
    setComputedOutcome(null);
  }, []);

  // Déterminer les prix et le produit final avec fallback sur activeProduct
  const finalOutcome = computedOutcome || outcomes[0];
  const finalProductName = finalOutcome.productName || activeProduct?.name || 'Pack NaNa Recommandé';
  const finalProductImage = finalOutcome.productImage || activeProduct?.image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80';
  const finalPromoPrice = finalOutcome.promoPrice || activeProduct?.price || 35000;
  const finalOriginalPrice = finalOutcome.originalPrice || activeProduct?.originalPrice || Math.round(finalPromoPrice * 1.6);

  return (
    <section
      style={{ backgroundColor: bgColor }}
      className={`relative w-full py-10 sm:py-16 px-3 sm:px-6 md:px-8 overflow-hidden select-none font-sans text-slate-100 ${className}`}
    >
      {/* Halo lumineux d'arrière-plan avec dégradé subtil */}
      <div
        style={{
          background: `radial-gradient(circle at 50% 20%, ${accentColor}25 0%, transparent 70%)`
        }}
        className="absolute inset-0 pointer-events-none"
      />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6 sm:space-y-8">
        
        {/* ================================================================ */}
        {/* EN-TÊTE PRINCIPAL DU BLOC (KICKER + TITRE + SOUS-TITRE)          */}
        {/* ================================================================ */}
        <div className="text-center space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-lg backdrop-blur-md"
            style={{
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}40`,
              color: accentColor
            }}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span>{data.badgeText || 'DIAGNOSTIC SUR-MESURE ⚡'}</span>
          </div>

          <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
            {data.title || 'Trouvez la Formule Exacte Adaptée à Votre Projet'}
          </h2>

          {data.subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              {data.subtitle}
            </p>
          )}

          {/* Badge Mode Éditeur avec réinitialisation rapide */}
          {isBuilderMode && (
            <div className="pt-1 flex items-center justify-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                Mode Éditeur : Étape {quizState === 'result' ? 'Résultat' : `${currentQuestionIndex + 1}/${totalQuestions}`}
              </span>
              <button
                type="button"
                onClick={handleResetQuiz}
                className="text-[10.5px] font-bold text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 cursor-pointer"
                title="Recommencer le quiz pour tester un autre parcours"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Tester à nouveau</span>
              </button>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* 1. ÉTAT DU QUIZ : QUESTIONS INTERACTIVES MULTI-ÉTAPES           */}
        {/* ================================================================ */}
        {quizState === 'quiz' && (
          <div
            style={{ backgroundColor: cardBgColor }}
            className="rounded-3xl border border-slate-800 shadow-2xl p-5 sm:p-8 space-y-6 relative overflow-hidden backdrop-blur-xl"
          >
            {/* Barre de Progression Fluide (Style ClickFunnels 2.0) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  <span>Question {currentQuestionIndex + 1} sur {totalQuestions}</span>
                </span>
                <span className="font-mono" style={{ color: accentColor }}>
                  {progressPercent}% complété
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-slate-700/50">
                <motion.div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 0 12px ${accentColor}80`
                  }}
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Transition Animée entre les Questions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-5"
              >
                {/* Libellé de la Question */}
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                    {currentQuestion.question}
                  </h3>
                  {currentQuestion.subtitle && (
                    <p className="text-xs text-slate-400">
                      {currentQuestion.subtitle}
                    </p>
                  )}
                </div>

                {/* Liste des Choix QCM */}
                <div className="space-y-2.5 sm:space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === option.id;
                    const letter = String.fromCharCode(65 + idx); // A, B, C, D...

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                        style={{
                          borderColor: isSelected ? accentColor : 'rgba(51, 65, 85, 0.6)',
                          backgroundColor: isSelected ? `${accentColor}18` : 'rgba(15, 23, 42, 0.65)'
                        }}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer hover:border-slate-500 hover:bg-slate-800/50 shadow-sm active:scale-[0.99] select-none ${
                          isSelected ? 'ring-2' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                          {/* Pastille Lettre ou Badge */}
                          <div
                            style={{
                              backgroundColor: isSelected ? accentColor : 'rgba(30, 41, 59, 0.9)',
                              borderColor: isSelected ? accentColor : 'rgba(71, 85, 105, 0.5)',
                              color: isSelected ? '#ffffff' : '#94a3b8'
                            }}
                            className="w-8 h-8 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 transition-transform group-hover:scale-105"
                          >
                            {option.badge ? (
                              <span className="text-sm">{option.badge}</span>
                            ) : (
                              <span>{letter}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-200 transition-colors leading-snug">
                              {option.text}
                            </p>
                            {option.subtext && (
                              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug">
                                {option.subtext}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Indicateur de sélection visuelle */}
                        <div
                          style={{
                            borderColor: isSelected ? accentColor : 'rgba(71, 85, 105, 0.4)',
                            backgroundColor: isSelected ? accentColor : 'transparent'
                          }}
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Barre de navigation inférieure (Précédent / Indicateurs) */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              {currentQuestionIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 font-bold cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Question Précédente</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Réponses 100% sécurisées</span>
                </span>
              )}

              {/* Stepper Dots */}
              <div className="flex items-center gap-1.5">
                {questions.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: i === currentQuestionIndex
                        ? accentColor
                        : i < currentQuestionIndex
                        ? `${accentColor}80`
                        : '#334155'
                    }}
                    className="w-2 h-2 rounded-full transition-all"
                  />
                ))}
              </div>

              {/* Bouton Suivant Manuel si autoAdvance est désactivé ou pour avancer */}
              {selectedAnswers[currentQuestion.id] && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentQuestionIndex < totalQuestions - 1) {
                      setCurrentQuestionIndex(prev => prev + 1);
                    } else {
                      startComputingResult(selectedAnswers);
                    }
                  }}
                  style={{ backgroundColor: accentColor }}
                  className="px-3.5 py-1.5 rounded-xl text-white font-bold transition flex items-center gap-1 shadow-md hover:brightness-110 cursor-pointer"
                >
                  <span>{currentQuestionIndex < totalQuestions - 1 ? 'Suivant' : 'Voir Mon Résultat'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 2. ÉTAT COMPUTING : ANIMATION D'ANALYSE DU PROFIL (1.5s)          */}
        {/* ================================================================ */}
        {quizState === 'computing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ backgroundColor: cardBgColor }}
            className="rounded-3xl border border-slate-800 p-8 sm:p-10 text-center space-y-6 shadow-2xl backdrop-blur-xl"
          >
            {/* Cercle d'animation Pulse */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ backgroundColor: `${accentColor}25` }}
                className="absolute inset-0 rounded-full"
              />
              <div
                style={{
                  backgroundColor: `${accentColor}20`,
                  borderColor: accentColor,
                  color: accentColor
                }}
                className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center shadow-lg relative z-10"
              >
                <Zap className="w-7 h-7 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-white">
                Analyse de vos réponses en cours...
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                Notre moteur de ciblage calcule votre profil de compatibilité et génère votre offre personnalisée.
              </p>
            </div>

            {/* Jauge d'analyse */}
            <div className="space-y-1.5 max-w-md mx-auto">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 font-bold">Calcul algorithmique...</span>
                <span style={{ color: accentColor }} className="font-bold">{computingProgress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <motion.div
                  style={{ backgroundColor: accentColor }}
                  className="h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${computingProgress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Checklist d'évaluation en direct */}
            <div className="max-w-sm mx-auto text-left space-y-2 pt-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Validation des contraintes budgétaires & objectifs</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Matching avec le catalogue haute conversion NaNa</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                </motion.div>
                <span className="text-amber-300 font-semibold">Déblocage de votre remise et bonus personnalisés...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================================================================ */}
        {/* 3. ÉTAT RÉSULTAT : OFFRE DYNAMIQUE SUR-MESURE (LOGIQUE IF/ELSE)  */}
        {/* ================================================================ */}
        {quizState === 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ backgroundColor: cardBgColor }}
            className="rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl relative"
          >
            {/* Ruban d'Urgence Supérieur ClickFunnels 2.0 */}
            {data.showUrgencyTimer !== false && (
              <div
                style={{
                  background: `linear-gradient(90deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)`
                }}
                className="py-2.5 px-4 border-b border-indigo-500/30 flex items-center justify-between flex-wrap gap-2 text-xs"
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-black">
                  <Flame className="w-4 h-4 fill-current animate-pulse text-rose-500" />
                  <span className="uppercase tracking-wider">Offre Recommandée Exclusive</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tarif verrouillé pendant :</span>
                  <span className="font-mono font-black text-rose-400 bg-slate-900 px-2 py-0.5 rounded border border-rose-500/30">
                    {formatTimer(urgencySeconds)}
                  </span>
                </div>
              </div>
            )}

            <div className="p-6 sm:p-8 space-y-6">
              {/* Badge de Diagnostic & Titre */}
              <div className="space-y-2 text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-sm"
                  style={{
                    backgroundColor: `${accentColor}18`,
                    borderColor: `${accentColor}50`,
                    color: accentColor
                  }}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{finalOutcome.badge}</span>
                </div>

                <h3 className="text-lg sm:text-2xl font-black text-white leading-tight">
                  {finalOutcome.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {finalOutcome.description}
                </p>
              </div>

              {/* Carte Produit / Pack Recommandé */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Image Produit */}
                  <div className="relative w-full sm:w-28 h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                    <img
                      src={finalProductImage}
                      alt={finalProductName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {finalOutcome.discountBadge && (
                      <span className="absolute top-1 right-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500 text-white shadow">
                        {finalOutcome.discountBadge}
                      </span>
                    )}
                  </div>

                  {/* Infos & Prix Recommandé */}
                  <div className="w-full text-left space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                      SOLUTION RECOMMANDÉE POUR VOUS
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white leading-snug">
                      {finalOutcome.headline || finalProductName}
                    </h4>

                    {/* Bloc Prix */}
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                        {formatCFA(finalPromoPrice)}
                      </span>
                      {finalOriginalPrice && (
                        <span className="text-xs text-slate-500 line-through font-mono">
                          {formatCFA(finalOriginalPrice)}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Économie immédiate
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liste des Avantages / Bonus Débloqués */}
                {finalOutcome.features && finalOutcome.features.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">
                      Bonus & Fonctionnalités Inclus dans Votre Recommandation :
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {finalOutcome.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton d'Action Primaire CTA Haute Conversion */}
              <div className="space-y-3 pt-1">
                <a
                  href={finalOutcome.ctaLink || '#checkout'}
                  onClick={(e) => {
                    if (onCtaClick) {
                      onCtaClick(finalOutcome);
                    }
                  }}
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 10px 25px -5px ${accentColor}60`
                  }}
                  className="w-full py-3.5 sm:py-4 px-6 rounded-2xl text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all duration-150 cursor-pointer text-center"
                >
                  <span>{finalOutcome.ctaText}</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </a>

                {/* Notice de Réassurance */}
                <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 text-center">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{finalOutcome.guaranteeText || 'Paiement Sécurisé Wave / OM • Garantie Totale'}</span>
                  </span>
                </div>

                {/* Bouton de Réinitialisation / Recommencer */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleResetQuiz}
                    className="text-xs text-slate-500 hover:text-slate-300 underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Refaire le test avec d'autres critères</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notice légale / bas de page confidentiel */}
        {data.footerNotice && (
          <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-md mx-auto">
            {data.footerNotice.replace(/\s*selon les standards\s*ClickFunnels(\s*2\.0)?/gi, ' avec diagnostic instantané').replace(/ClickFunnels(\s*2\.0)?/gi, 'NaNa Sore')}
          </p>
        )}
      </div>
    </section>
  );
};

export default QuizFunnelBlock;
