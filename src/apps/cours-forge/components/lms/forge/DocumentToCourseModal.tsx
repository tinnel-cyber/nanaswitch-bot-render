import React, { useState, useCallback } from 'react';
import { 
  X, Sparkles, UploadCloud, FileText, CheckCircle2, 
  RefreshCw, ArrowRight, BookOpen, Layers, Zap, Check
} from 'lucide-react';
import { CourseNodeData, CourseNodeType } from '../../../../../types';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../../utils/audio';

export interface GeneratedGraphData {
  nodes: Array<{
    id: string;
    type: CourseNodeType;
    position: { x: number; y: number };
    data: CourseNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    label?: string;
    animated?: boolean;
    style?: Record<string, any>;
  }>;
  syllabusTitle: string;
}

export interface DocumentToCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (graph: GeneratedGraphData) => void;
}

export const DocumentToCourseModal: React.FC<DocumentToCourseModalProps> = ({
  isOpen,
  onClose,
  onGenerated
}) => {
  if (!isOpen) return null;

  const [inputMode, setInputMode] = useState<'TEXT' | 'PDF'>('TEXT');
  const [textInput, setTextInput] = useState<string>(
    `Réglementation des Télécommunications et de la Monétique en Afrique de l'Ouest (Zone UEMOA).
Ce document traite des infrastructures USSD, des canaux SMS de confirmation de transaction et de l'interopérabilité entre les opérateurs (Orange Money, Moov Money, Wave).
Il détaille les procédures de sécurité contre la fraude, la mise en place de caisses hybrides synchronisées, et les stratégies de Live Shopping avec encaissement instantané.`
  );
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const GENERATION_STEPS = [
    "Analyse sémantique et extraction des concepts clés...",
    "Découpage en 5 modules pédagogiques d'excellence...",
    "Conception des quiz adaptatifs (Théorie de Réponse à l'Item N1-N5)...",
    "Génération des leçons vidéo et supports PDF attachés...",
    "Calcul de la disposition cartographique et des branches de remédiation..."
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playTapBeep();
    setPdfFileName(file.name);
  };

  const handleStartAutoBuild = () => {
    if (inputMode === 'TEXT' && !textInput.trim()) {
      alert("Veuillez saisir ou coller un texte de formation.");
      return;
    }
    if (inputMode === 'PDF' && !pdfFileName) {
      alert("Veuillez téléverser un fichier PDF.");
      return;
    }

    playValidationBeep();
    setIsGenerating(true);
    setCurrentStep(0);

    // Simulation progressive du pipeline IA
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < GENERATION_STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          finalizeGeneration();
          return prev;
        }
      });
    }, 900);
  };

  const finalizeGeneration = () => {
    playCashChime();

    // 5 Modules complets générés avec positions DAG harmonieuses
    const generatedNodes: GeneratedGraphData['nodes'] = [
      // Module 1 : Fondamentaux
      {
        id: 'node-gen-1',
        type: 'videoLesson',
        position: { x: 50, y: 80 },
        data: {
          id: 'node-gen-1',
          type: 'videoLesson',
          title: '1. Introduction aux Réseaux Télécom & Canaux USSD UEMOA',
          durationMinutes: 18,
          videoConfig: {
            mode: 'AI_AVATAR',
            title: '1. Introduction aux Réseaux Télécom & Canaux USSD UEMOA',
            durationMinutes: 18,
            aiAvatarModel: 'ibrahim_konkobo_hd',
            isUploaded: true
          }
        }
      },
      {
        id: 'node-gen-2',
        type: 'pdfResource',
        position: { x: 380, y: 80 },
        data: {
          id: 'node-gen-2',
          type: 'pdfResource',
          title: 'Guide Officiel : Normes Réglementaires BCEAO',
          pdfFileName: 'Normes_Telecom_BCEAO.pdf',
          pdfFileSize: '3.2 MB'
        }
      },
      // Module 2 : Quiz Adaptatif 1 avec branche de remédiation
      {
        id: 'node-gen-3',
        type: 'interactiveQuiz',
        position: { x: 200, y: 260 },
        data: {
          id: 'node-gen-3',
          type: 'interactiveQuiz',
          title: 'Quiz Adaptatif : Régulation & Protocoles USSD',
          quizPassingScore: 70,
          quizQuestions: [
            {
              id: 'q-gen-1',
              level: 1,
              levelName: 'Niveau 1 : Rappel',
              difficultyBeta: -1.2,
              discriminationAlpha: 1.1,
              questionText: "Quel canal GSM délivre des menus interactifs sans connexion data ?",
              options: ['Le canal USSD (*144#)', 'Le protocole FTP', 'Le câble HDMI', 'Le protocole NFC'],
              correctOptionIndex: 0,
              hint: "Il fonctionne directement sur la voix GSM.",
              explanation: "L'USSD opère en temps réel sur le réseau cellulaire de base."
            },
            {
              id: 'q-gen-2',
              level: 3,
              levelName: 'Niveau 3 : Application',
              difficultyBeta: 0.4,
              discriminationAlpha: 1.6,
              questionText: "Quelle mesure évite les doubles débits lors d'un paiement marchand ?",
              options: ['La vérification de l\'ID Transaction unique', 'Le redémarrage du terminal', 'L\'encaissement en espèces', 'L\'envoi d\'un deuxième SMS'],
              correctOptionIndex: 0,
              hint: "Chaque transfert possède une référence irrévocable.",
              explanation: "L'identifiant unique de transaction garantit l'unicité du règlement."
            }
          ]
        }
      },
      // Nœud de Remédiation (si échec au quiz 1)
      {
        id: 'node-gen-remedial',
        type: 'videoLesson',
        position: { x: 420, y: 450 },
        data: {
          id: 'node-gen-remedial',
          type: 'videoLesson',
          title: 'Remédiation : Maîtrise Approfondie des Codes USSD',
          durationMinutes: 12,
          isRemedial: true,
          videoConfig: {
            mode: 'AI_AVATAR',
            title: 'Remédiation : Maîtrise Approfondie des Codes USSD',
            durationMinutes: 12,
            isUploaded: true
          }
        }
      },
      // Module 3 : Intégration Caisse Hybride
      {
        id: 'node-gen-4',
        type: 'videoLesson',
        position: { x: 50, y: 450 },
        data: {
          id: 'node-gen-4',
          type: 'videoLesson',
          title: '2. Déploiement Caisse Hybride POS & Rapprochement',
          durationMinutes: 25,
          videoConfig: {
            mode: 'MANUAL_UPLOAD',
            title: '2. Déploiement Caisse Hybride POS & Rapprochement',
            durationMinutes: 25,
            isUploaded: true
          }
        }
      },
      // Module 4 : Session Live Daily.co
      {
        id: 'node-gen-5',
        type: 'dailyLive',
        position: { x: 200, y: 640 },
        data: {
          id: 'node-gen-5',
          type: 'dailyLive',
          title: 'Atelier en Direct : Questions-Réponses avec Ibrahim Konkobo',
          dailyScheduledDate: 'Jeudi 18h00 GMT'
        }
      },
      // Module 5 : Grand Examen Final
      {
        id: 'node-gen-6',
        type: 'interactiveQuiz',
        position: { x: 200, y: 820 },
        data: {
          id: 'node-gen-6',
          type: 'interactiveQuiz',
          title: 'Examen Final de Certification Professionnelle',
          quizPassingScore: 80
        }
      }
    ];

    const generatedEdges: GeneratedGraphData['edges'] = [
      { id: 'e1-2', source: 'node-gen-1', target: 'node-gen-2', animated: false },
      { id: 'e1-3', source: 'node-gen-1', target: 'node-gen-3', animated: true },
      // Embranchement conditionnel
      { 
        id: 'e-pass-3-4', 
        source: 'node-gen-3', 
        sourceHandle: 'pass', 
        target: 'node-gen-4', 
        label: 'Succès (≥70%)',
        style: { stroke: '#10b981', strokeWidth: 2 }
      },
      { 
        id: 'e-fail-3-rem', 
        source: 'node-gen-3', 
        sourceHandle: 'fail', 
        target: 'node-gen-remedial', 
        label: 'Échec (<70%)',
        animated: true,
        style: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '5,5' }
      },
      { id: 'e-rem-4', source: 'node-gen-remedial', target: 'node-gen-4', label: 'Après rattrapage' },
      { id: 'e4-5', source: 'node-gen-4', target: 'node-gen-5', animated: true },
      { id: 'e5-6', source: 'node-gen-5', target: 'node-gen-6', animated: true }
    ];

    setIsGenerating(false);
    onGenerated({
      nodes: generatedNodes,
      edges: generatedEdges,
      syllabusTitle: "Syllabus IA : Cursus Télécom & Monétique UEMOA (5 Modules)"
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Auto-Gen AI Engine : Document-to-Course
              </h3>
              <p className="text-[11px] text-slate-400">
                Transformez un PDF ou un texte brut en cursus interactif complet à 5 modules
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {isGenerating ? (
            /* Animation d'Étapes IA */
            <div className="py-8 space-y-6 text-center">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">Génération du Cursus en Cours...</h4>
                <p className="text-xs text-indigo-300 font-bold animate-pulse">
                  {GENERATION_STEPS[currentStep]}
                </p>
              </div>

              {/* Liste des étapes validées */}
              <div className="max-w-md mx-auto space-y-2 text-left bg-slate-950 p-4 rounded-2xl border border-slate-800">
                {GENERATION_STEPS.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs">
                    {idx < currentStep ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : idx === currentStep ? (
                      <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                    )}
                    <span className={idx <= currentStep ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Formulaire d'Entrée */
            <div className="space-y-4">
              {/* Sélecteur de Mode */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setInputMode('TEXT'); }}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    inputMode === 'TEXT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Texte Brut / Plan de Cours
                </button>
                <button
                  type="button"
                  onClick={() => { playTapBeep(); setInputMode('PDF'); }}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    inputMode === 'PDF' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Téléverser un Fichier PDF
                </button>
              </div>

              {inputMode === 'TEXT' ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Contenu ou Notes de Formation
                  </label>
                  <textarea
                    rows={6}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Collez vos notes, chapitres ou résumés..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition leading-relaxed resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300">
                      Document Source (PDF)
                    </label>
                    <a
                      href="/academic/upload?role=professeur"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload R2 Direct</span>
                    </a>
                  </div>
                  <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/60 transition">
                    <UploadCloud className="w-8 h-8 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200">
                      {pdfFileName ? pdfFileName : "Cliquez ou déposez votre document PDF ici"}
                    </span>
                    <span className="text-[10px] text-slate-500">PDF jusqu'à 50 Mo</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
                <Zap className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  L'IA structurera automatiquement 5 modules progressifs avec leçons vidéo, quiz adaptatifs et branches de remédiation en cas d'échec.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Boutons Inférieurs */}
        {!isGenerating && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleStartAutoBuild}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer min-h-[42px]"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Lancer l'Auto-Génération IA</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentToCourseModal;
