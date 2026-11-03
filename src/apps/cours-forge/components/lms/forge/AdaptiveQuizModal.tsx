import React, { useState, useCallback } from 'react';
import {
  X,
  Brain,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  TrendingUp,
  Award,
  Layers,
  Lightbulb,
  Play,
  Check,
  ChevronRight,
  GitBranch,
  Crown
} from 'lucide-react';
import { AdaptiveQuizQuestion } from '../../../../../types';
import { useFeatureGate } from '../../../../../hooks/useFeatureGate';

interface AdaptiveQuizModalProps {
  isOpen: boolean;
  nodeId: string;
  nodeTitle: string;
  initialQuestions?: AdaptiveQuizQuestion[];
  initialPassingScore?: number;
  initialAiEliteGradingEnabled?: boolean;
  initialAiGradingInstructions?: string;
  onClose: () => void;
  onSave: (
    nodeId: string,
    questions: AdaptiveQuizQuestion[],
    passingScore: number,
    aiEliteGradingEnabled?: boolean,
    aiGradingInstructions?: string
  ) => void;
}

const DEFAULT_QUESTIONS: AdaptiveQuizQuestion[] = [
  {
    id: 'q1',
    level: 1,
    levelName: 'Niveau 1 : Rappel & Définitions',
    difficultyBeta: -1.5,
    discriminationAlpha: 1.2,
    questionText: 'Quelle est la fonction principale d\'un routeur dans une infrastructure réseau ?',
    options: [
      'Acheminer les paquets IP entre différents réseaux logiques',
      'Convertir l\'énergie électrique en signal radio',
      'Fournir uniquement une adresse MAC aux ordinateurs',
      'Stocker les sauvegardes de bases de données'
    ],
    correctOptionIndex: 0,
    hint: 'Pensez à la couche 3 (Réseau) du modèle OSI et au rôle de passerelle.',
    explanation: 'Le routeur opère à la couche réseau (IP) et détermine le meilleur chemin pour acheminer les paquets entre sous-réseaux distincts.',
    topic: 'Fondamentaux Réseau'
  },
  {
    id: 'q2',
    level: 2,
    levelName: 'Niveau 2 : Compréhension & Protocoles',
    difficultyBeta: -0.7,
    discriminationAlpha: 1.4,
    questionText: 'Dans une transaction Mobile Money (Orange Money/Wave), quelle mesure garantit l\'idempotence de la requête ?',
    options: [
      'L\'envoi répété de requêtes HTTP GET',
      'L\'usage d\'une clé d\'idempotence unique (UUID) dans les en-têtes côté client',
      'La désactivation temporaire du pare-feu applicatif',
      'L\'augmentation du délai de timeout TCP à 10 minutes'
    ],
    correctOptionIndex: 1,
    hint: 'Que transmet-on au serveur pour lui indiquer qu\'une tentative de paiement est la même en cas de coupure 4G ?',
    explanation: 'Une Idempotency-Key unique empêche la double-facturation si une requête réseau est réémise suite à une instabilité de connectivité.',
    topic: 'Fintech & Sécurité'
  },
  {
    id: 'q3',
    level: 3,
    levelName: 'Niveau 3 : Application & Cas Pratique',
    difficultyBeta: 0.2,
    discriminationAlpha: 1.7,
    questionText: 'Une agence constate une latence élevée lors des syncs de caisse POS en zone rurale. Quelle stratégie architecturale préconisez-vous ?',
    options: [
      'Forcer un rafraîchissement global du catalogue toutes les 5 secondes',
      'Architecture Offline-First avec IndexedDB local et synchronisation delta en tâche de fond',
      'Bloquer les ventes tant que la 4G n\'est pas au débit maximal',
      'Migrer toutes les données vers un serveur FTP non compressé'
    ],
    correctOptionIndex: 1,
    hint: 'Considérez le mode déconnecté avec réconciliation opportuniste des soldes et des stocks.',
    explanation: 'L\'architecture Offline-First permet l\'encaissement local instantané garanti et regroupe les mutations en batch dès la reconnexion.',
    topic: 'Architecture Hybride'
  },
  {
    id: 'q4',
    level: 4,
    levelName: 'Niveau 4 : Diagnostic & Dépannage',
    difficultyBeta: 1.1,
    discriminationAlpha: 1.9,
    questionText: 'Le webhook d\'accusé de réception Mobile Money renvoie systématiquement un code HTTP 401 lors de la validation. Quel est le diagnostic probable ?',
    options: [
      'Le câble Ethernet du point de vente est débranché',
      'La signature cryptographique HMAC-SHA256 ou le secret API partagé est invalide ou mal décodé',
      'La base de données SQL a manqué d\'espace disque',
      'L\'utilisateur n\'a pas validé son numéro de carte d\'identité'
    ],
    correctOptionIndex: 1,
    hint: 'Le code HTTP 401 Unauthorized indique un rejet d\'authentification cryptographique avant traitement.',
    explanation: 'Les webhooks financiers valident l\'origine via un header sécurisé (e.g. X-Signature-SHA256). Une clé secrète divergente produit une erreur 401 immédiate.',
    topic: 'Sécurité API'
  },
  {
    id: 'q5',
    level: 5,
    levelName: 'Niveau 5 : Architecture Expert & Résilience',
    difficultyBeta: 1.8,
    discriminationAlpha: 2.1,
    questionText: 'En cas de partition réseau (Split-Brain) entre le nœud central et le cache périphérique pendant une vague de retraits, comment maintenir la cohérence stricte des soldes ?',
    options: [
      'Autoriser les découverts illimités sur tous les terminaux',
      'Appliquer le théorème CAP en privilégiant la Consistance (CP) avec consensus distribué (Raft) ou verrouillage optimiste avec réservations de crédit',
      'Supprimer l\'historique des transactions précédentes',
      'Déléguer la résolution manuellement aux clients par SMS'
    ],
    correctOptionIndex: 1,
    hint: 'En finance transactionnelle, le risque de double dépense interdit la disponibilité aveugle (AP).',
    explanation: 'Selon le théorème CAP, la cohérence financière stricte impose d\'isoler le nœud partitionné ou d\'utiliser des quotas de crédit pré-alloués déterministes.',
    topic: 'Systèmes Distribués'
  }
];

export const AdaptiveQuizModal: React.FC<AdaptiveQuizModalProps> = ({
  isOpen,
  nodeId,
  nodeTitle,
  initialQuestions,
  initialPassingScore = 70,
  initialAiEliteGradingEnabled = true,
  initialAiGradingInstructions = '',
  onClose,
  onSave,
}) => {
  const { handlePremiumAction } = useFeatureGate();
  const [activeTab, setActiveTab] = useState<'QUESTIONS' | 'SIMULATOR'>('QUESTIONS');
  const [questions, setQuestions] = useState<AdaptiveQuizQuestion[]>(
    initialQuestions && initialQuestions.length > 0 ? initialQuestions : DEFAULT_QUESTIONS
  );
  const [passingScore, setPassingScore] = useState<number>(initialPassingScore);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'ALL'>('ALL');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Configuration Mode IA Elite 👑 (Google AI Studio)
  const [aiEliteGradingEnabled, setAiEliteGradingEnabled] = useState<boolean>(
    initialAiEliteGradingEnabled ?? true
  );
  const [aiGradingInstructions, setAiGradingInstructions] = useState<string>(
    initialAiGradingInstructions ||
    "Évaluer la rigueur technique, le respect des protocoles UEMOA (Mobile Money/Wave/USSD), la gestion d'idempotence et la tolérance aux pannes réseau."
  );

  // État du simulateur adaptatif IRT
  const [simTheta, setSimTheta] = useState<number>(0.0); // Aptitude estimée θ (-3.0 à +3.0)
  const [simStep, setSimStep] = useState<number>(0);
  const [simSelectedOption, setSimSelectedOption] = useState<number | null>(null);
  const [simIsAnswered, setSimIsAnswered] = useState(false);
  const [simShowHint, setSimShowHint] = useState(false);
  const [simHistory, setSimHistory] = useState<Array<{ qId: string; level: number; isCorrect: boolean; thetaAfter: number }>>([]);

  if (!isOpen) return null;

  // Filtrage des questions
  const filteredQuestions = selectedLevelFilter === 'ALL'
    ? questions
    : questions.filter(q => q.level === selectedLevelFilter);

  // IA Auto-Génération d'une question supplémentaire selon le niveau
  const handleGenerateAiQuestion = (targetLevel: 1 | 2 | 3 | 4 | 5) => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      const levelNames: Record<number, string> = {
        1: 'Niveau 1 : Rappel & Définitions',
        2: 'Niveau 2 : Compréhension & Principes',
        3: 'Niveau 3 : Application & Pratique',
        4: 'Niveau 4 : Diagnostic & Dépannage',
        5: 'Niveau 5 : Architecture Expert'
      };

      const newQ: AdaptiveQuizQuestion = {
        id: `gen_${Date.now()}`,
        level: targetLevel,
        levelName: levelNames[targetLevel],
        difficultyBeta: Number((-2.0 + targetLevel * 0.75).toFixed(2)),
        discriminationAlpha: Number((1.1 + targetLevel * 0.2).toFixed(2)),
        questionText: `[IA Généré] Scénario avancé de niveau ${targetLevel} sur l'optimisation des flux télécom et de caisse hybride.`,
        options: [
          'Solution optimale préconisée avec isolation des sous-systèmes',
          'Méthode alternative synchrone avec goulot d\'étranglement',
          'Approche obsolète non conforme aux protocoles',
          'Désactivation des contrôles cryptographiques'
        ],
        correctOptionIndex: 0,
        hint: `Indice pédagogique calibré pour le niveau de compétence ${targetLevel}. Analysez les dépendances amont.`,
        explanation: `Explication synthétique : Ce choix maximise l'efficience opérationnelle et respecte les contraintes IRT de niveau ${targetLevel}.`,
        topic: 'Généré par NaNa AI'
      };

      setQuestions(prev => [...prev, newQ]);
      setIsGeneratingAI(false);
    }, 700);
  };

  const handleDeleteQuestion = (qId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== qId));
  };

  // Logique du Simulateur IRT (Item Response Theory)
  const getNextAdaptiveQuestion = (): AdaptiveQuizQuestion => {
    let targetLevel: 1 | 2 | 3 | 4 | 5 = 3;
    if (simTheta <= -1.0) targetLevel = 1;
    else if (simTheta <= -0.2) targetLevel = 2;
    else if (simTheta <= 0.6) targetLevel = 3;
    else if (simTheta <= 1.4) targetLevel = 4;
    else targetLevel = 5;

    const answeredIds = new Set(simHistory.map(h => h.qId));
    const available = questions.filter(q => !answeredIds.has(q.id));

    const exactMatch = available.find(q => q.level === targetLevel);
    if (exactMatch) return exactMatch;

    if (available.length > 0) {
      return available.reduce((prev, curr) => 
        Math.abs(curr.difficultyBeta - simTheta) < Math.abs(prev.difficultyBeta - simTheta) ? curr : prev
      );
    }

    return questions[0];
  };

  const currentSimQuestion = getNextAdaptiveQuestion();

  const handleSimSubmitAnswer = () => {
    if (simSelectedOption === null) return;
    const isCorrect = simSelectedOption === currentSimQuestion.correctOptionIndex;

    const pSuccess = 1 / (1 + Math.exp(-currentSimQuestion.discriminationAlpha * (simTheta - currentSimQuestion.difficultyBeta)));
    const score = isCorrect ? 1.0 : 0.0;
    const deltaTheta = 0.5 * currentSimQuestion.discriminationAlpha * (score - pSuccess);
    const newTheta = Number(Math.max(-3.0, Math.min(3.0, simTheta + deltaTheta)).toFixed(2));

    setSimIsAnswered(true);
    setSimHistory(prev => [
      ...prev,
      {
        qId: currentSimQuestion.id,
        level: currentSimQuestion.level,
        isCorrect,
        thetaAfter: newTheta
      }
    ]);
    setSimTheta(newTheta);
  };

  const handleSimNext = () => {
    setSimSelectedOption(null);
    setSimIsAnswered(false);
    setSimShowHint(false);
    setSimStep(prev => prev + 1);
  };

  const handleSimReset = () => {
    setSimTheta(0.0);
    setSimStep(0);
    setSimSelectedOption(null);
    setSimIsAnswered(false);
    setSimShowHint(false);
    setSimHistory([]);
  };

  const handleSaveAndClose = () => {
    onSave(nodeId, questions, passingScore, aiEliteGradingEnabled, aiGradingInstructions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden">
        
        {/* En-tête de la Modal */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Moteur Quiz Adaptatif IRT & Devoirs
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Item Response Theory (N1 - N5)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Nœud sélectionné : <span className="font-semibold text-slate-200">{nodeTitle}</span>
              </p>
            </div>
          </div>

          {/* Onglets Questions / Simulateur Live */}
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('QUESTIONS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'QUESTIONS'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Banque ({questions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SIMULATOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'SIMULATOR'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulateur IRT Live</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps de la Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'QUESTIONS' ? (
            <>
              {/* Configuration Mode IA Elite 👑 */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 p-4 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                          Mode IA Elite 👑
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[9.5px] font-bold border border-amber-500/30">
                          Google AI Studio Powered
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Correction et évaluation automatique continue des devoirs et quiz par IA selon vos critères
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiEliteGradingEnabled}
                      onChange={e => {
                        const willEnable = e.target.checked;
                        if (willEnable) {
                          handlePremiumAction('pro', () => setAiEliteGradingEnabled(true), {
                            featureType: 'CORRECTION',
                            featureName: 'Correction Automatique IA Elite',
                            featureKey: 'AI_GRADING_ENGINE',
                            customTitle: 'Activez la Correction Automatique IA Elite 👑',
                            customMessage: 'Cette fonctionnalité (Correction Automatique IA Elite) est incluse dans nos plans Premium. Gagnez des heures de travail chaque semaine en laissant notre Intelligence Artificielle évaluer les devoirs et quiz de vos étudiants selon vos critères.'
                          });
                        } else {
                          setAiEliteGradingEnabled(false);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-amber-400 shadow-inner"></div>
                    <span className="ml-2.5 text-xs font-bold text-slate-300">
                      {aiEliteGradingEnabled ? (
                        <span className="text-amber-400 font-black">Activé</span>
                      ) : (
                        <span className="text-slate-500">Désactivé</span>
                      )}
                    </span>
                  </label>
                </div>

                {/* Champ texte multiligne si activé */}
                {aiEliteGradingEnabled && (
                  <div className="space-y-2 pt-2 border-t border-slate-800 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <span>📝 Instructions de correction pour l&apos;IA (ex: Les critères de réussite attendus)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {aiGradingInstructions.length} caractères
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={aiGradingInstructions}
                      onChange={e => setAiGradingInstructions(e.target.value)}
                      placeholder="ex: L'étudiant doit justifier l'usage d'une clé d'idempotence, expliquer la tolérance aux pannes réseau et proposer un modèle de réconciliation..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-sans"
                    />

                    {/* Suggestions rapides de critères */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Critères rapides :</span>
                      {[
                        "+ Idempotence Mobile Money",
                        "+ Tolérance aux pannes réseau",
                        "+ Signature HMAC-SHA256",
                        "+ Réconciliation des soldes",
                        "+ Rigueur didactique"
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const cleanChip = chip.replace(/^\+\s*/, '');
                            if (!aiGradingInstructions.includes(cleanChip)) {
                              setAiGradingInstructions(prev => prev ? `${prev} Critère attendu : ${cleanChip}.` : `Critère attendu : ${cleanChip}.`);
                            }
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Barre d'outils et configuration du seuil */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                {/* Seuil de validation */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Seuil de Réussite Déclencheur</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={50}
                      max={90}
                      step={5}
                      value={passingScore}
                      onChange={e => setPassingScore(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <span className="text-sm font-black text-amber-400 min-w-[42px] text-right">
                      {passingScore}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Les scores &lt; {passingScore}% dirigent l&apos;étudiant vers la branche de remédiation.
                  </p>
                </div>

                {/* Filtre par Niveau IRT */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Filtrer par Difficulté</span>
                  </label>
                  <select
                    value={selectedLevelFilter}
                    onChange={e => setSelectedLevelFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-medium focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">Tous les Niveaux (1 à 5)</option>
                    <option value="1">Niveau 1 : Rappel (&beta; = -1.5)</option>
                    <option value="2">Niveau 2 : Compréhension (&beta; = -0.7)</option>
                    <option value="3">Niveau 3 : Application (&beta; = 0.2)</option>
                    <option value="4">Niveau 4 : Dépannage (&beta; = 1.1)</option>
                    <option value="5">Niveau 5 : Expertise (&beta; = 1.8)</option>
                  </select>
                </div>

                {/* Génération Express par IA */}
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    disabled={isGeneratingAI}
                    onClick={() => {
                      handlePremiumAction('pro', () => {
                        handleGenerateAiQuestion((selectedLevelFilter === 'ALL' ? 3 : selectedLevelFilter) as 1 | 2 | 3 | 4 | 5);
                      }, {
                        featureType: 'CORRECTION',
                        featureName: 'Génération IA de Questions Calibrées',
                        featureKey: 'AI_GRADING_ENGINE',
                        customTitle: 'Générez des Questions Calibrées avec l\'IA 👑',
                        customMessage: 'Cette fonctionnalité (Génération IA de Quiz Adaptatif) est incluse dans nos plans Premium. Gagnez des heures de travail chaque semaine en laissant notre Intelligence Artificielle créer vos questions de test.'
                      });
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-60 cursor-pointer group"
                  >
                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span>{isGeneratingAI ? 'Génération en cours...' : '+ IA Générer Question Calibrée'}</span>
                    <Crown className="w-3.5 h-3.5 text-slate-950 fill-slate-950 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Liste des Questions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Questions Calibrées IRT ({filteredQuestions.length})
                  </h4>
                  <span className="text-xs text-slate-400">
                    Architecture d&apos;évaluation adaptative continue
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              q.level === 1 ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                              q.level === 2 ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' :
                              q.level === 3 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              q.level === 4 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                              'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}>
                              Niveau {q.level} • {q.levelName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Difficulté &beta; = {q.difficultyBeta} | Discrimination &alpha; = {q.discriminationAlpha}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white pt-1">
                            {index + 1}. {q.questionText}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Supprimer la question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = optIdx === q.correctOptionIndex;
                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${
                                isCorrect
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                                isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {isCorrect ? '✓' : String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="truncate">{opt}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Indice Pédagogique & Explication */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                        <div className="flex items-start gap-1.5 text-amber-300/90 bg-amber-500/5 p-2 rounded-xl border border-amber-500/20">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-amber-400">Indice Pédagogique :</strong> {q.hint}
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-indigo-300">Justification :</strong> {q.explanation}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* SIMULATEUR D'EXPÉRIENCE ÉTUDIANT IRT */
            <div className="space-y-6">
              {/* Tableau de bord de l'aptitude θ en temps réel */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      Modèle Psychométrique IRT en Direct
                    </span>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Aptitude Estimée de l&apos;Apprenant (&theta;) :</span>
                      <span className={`text-base font-black font-mono px-2 py-0.5 rounded-lg ${
                        simTheta >= 1.0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        simTheta >= 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {simTheta > 0 ? `+${simTheta}` : simTheta}
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Niveau Actuel Ciblé</div>
                      <div className="text-xs font-black text-amber-300">
                        Niveau {currentSimQuestion.level} ({currentSimQuestion.levelName.split(':')[1]?.trim() || 'Pratique'})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimReset}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Réinitialiser</span>
                    </button>
                  </div>
                </div>

                {/* Jauge graphique de l'aptitude */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Niveau 1 (Novice, &theta; = -3.0)</span>
                    <span>Niveau 3 (Médian, &theta; = 0.0)</span>
                    <span>Niveau 5 (Expert, &theta; = +3.0)</span>
                  </div>
                  <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
                      style={{ width: `${Math.min(100, Math.max(0, ((simTheta + 3.0) / 6.0) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Question Active pour le Test Adaptatif */}
              <div className="bg-slate-950/90 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-400">
                    Question Présentée #{simStep + 1}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    {currentSimQuestion.levelName}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white leading-relaxed">
                  {currentSimQuestion.questionText}
                </h4>

                {/* Options Cliquables */}
                <div className="space-y-2">
                  {currentSimQuestion.options.map((opt, optIdx) => {
                    const isSelected = simSelectedOption === optIdx;
                    const isCorrect = optIdx === currentSimQuestion.correctOptionIndex;

                    let btnStyle = 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700';
                    if (simIsAnswered) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold';
                      } else {
                        btnStyle = 'bg-slate-900/50 border-slate-800/60 text-slate-500';
                      }
                    } else if (isSelected) {
                      btnStyle = 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold ring-1 ring-amber-500';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={simIsAnswered}
                        onClick={() => setSimSelectedOption(optIdx)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between cursor-pointer ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {simIsAnswered && isCorrect && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback et Indices après réponse */}
                {simIsAnswered && (
                  <div className="space-y-3 pt-2">
                    {simSelectedOption === currentSimQuestion.correctOptionIndex ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>Excellente réponse !</strong> Le modèle IRT rehausse l&apos;aptitude &theta; et proposera une question de niveau supérieur.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>
                            <strong>Réponse incorrecte.</strong> L&apos;aptitude s&apos;ajuste et l&apos;algorithme adaptera la difficulté vers le bas avec renfort didactique.
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong>Indice Pédagogique Automatique :</strong> {currentSimQuestion.hint}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Barre d'action du simulateur */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  {!simIsAnswered ? (
                    <button
                      type="button"
                      disabled={simSelectedOption === null}
                      onClick={handleSimSubmitAnswer}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Valider la Réponse</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSimNext}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>Question Adaptative Suivante</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  <span className="text-[11px] text-slate-400 font-mono">
                    Historique : {simHistory.length} itérations adaptatives
                  </span>
                </div>
              </div>

              {/* Historique des itérations */}
              {simHistory.length > 0 && (
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Trajectoire de l&apos;Apprenant
                  </h5>
                  <div className="flex items-center gap-2 flex-wrap">
                    {simHistory.map((h, i) => (
                      <div
                        key={i}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                          h.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <span>Q{i + 1} (N{h.level})</span>
                        <span>{h.isCorrect ? '✓' : '✗'}</span>
                        <span className="text-[10px] opacity-75 font-mono">(&theta;={h.thetaAfter})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pied de Page de la Modal */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Algorithme adaptatif configuré pour <span className="text-white font-bold">{questions.length} questions</span>
            {aiEliteGradingEnabled && <span className="text-amber-400 font-bold ml-2">• Mode IA Elite Actif 👑</span>}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Sauvegarder le Quiz Adaptatif</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdaptiveQuizModal;
