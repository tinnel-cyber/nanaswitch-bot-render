import React, { useState, useCallback } from 'react';
import { 
  Radio, 
  HelpCircle, 
  FileText, 
  ShoppingBag, 
  Hand, 
  Video, 
  Plus, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  Upload, 
  ExternalLink,
  Users,
  Settings,
  ChevronDown
} from 'lucide-react';
import { 
  LiveSession, 
  LiveQuizQuestion, 
  LiveAssignment, 
  HandRaisedUser 
} from '../../../../types/liveSession';
import { StoreProductItem } from '../../../../components/storeBuilder/types';
import { 
  pinLiveQuiz, 
  closeLiveQuiz, 
  publishLiveAssignment, 
  closeLiveAssignment, 
  updatePinnedProduct, 
  lowerHandInSession,
  updateCoachingRoom,
  updateLiveSessionStatus 
} from '../../../../services/liveSessionService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface LiveInstructorControlBarProps {
  session: LiveSession;
  onOpenProductModal?: () => void;
  onSelectTab?: (tab: 'chat' | 'quiz' | 'assignment' | 'offers') => void;
  className?: string;
}

export const LiveInstructorControlBar: React.FC<LiveInstructorControlBarProps> = ({
  session,
  onOpenProductModal,
  onSelectTab,
  className = ''
}) => {
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (ZÉRO ERREUR #310)
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState<boolean>(false);
  const [isHandRaiseDrawerOpen, setIsHandRaiseDrawerOpen] = useState<boolean>(false);
  const [isCoachingModalOpen, setIsCoachingModalOpen] = useState<boolean>(false);

  // Formulaire Quiz
  const [quizQuestion, setQuizQuestion] = useState<string>('');
  const [quizOptA, setQuizOptA] = useState<string>('');
  const [quizOptB, setQuizOptB] = useState<string>('');
  const [quizOptC, setQuizOptC] = useState<string>('');
  const [quizOptD, setQuizOptD] = useState<string>('');
  const [correctOpt, setCorrectOpt] = useState<string>('opt_A');
  const [quizExplanation, setQuizExplanation] = useState<string>('');

  // Formulaire Devoir & PDF
  const [assignTitle, setAssignTitle] = useState<string>('');
  const [assignInstructions, setAssignInstructions] = useState<string>('');
  const [assignPdfUrl, setAssignPdfUrl] = useState<string>('');
  const [assignDuration, setAssignDuration] = useState<number>(20);

  // Formulaire Coaching 1-to-1
  const [coachingRoomInput, setCoachingRoomInput] = useState<string>(
    session.coachingRoomUrl || `https://meet.jit.si/nanasore-coaching-${session.id}`
  );

  // Lancement du Quiz
  const handleLaunchQuiz = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizQuestion.trim() || !quizOptA.trim() || !quizOptB.trim()) {
      alert('Veuillez renseigner au moins la question et les options A et B.');
      return;
    }

    playValidationBeep();
    const newQuiz: LiveQuizQuestion = {
      id: `quiz_${Date.now()}`,
      question: quizQuestion.trim(),
      options: [
        { id: 'opt_A', label: 'A', text: quizOptA.trim() },
        { id: 'opt_B', label: 'B', text: quizOptB.trim() },
        ...(quizOptC.trim() ? [{ id: 'opt_C', label: 'C', text: quizOptC.trim() }] : []),
        ...(quizOptD.trim() ? [{ id: 'opt_D', label: 'D', text: quizOptD.trim() }] : [])
      ],
      correctOptionId: correctOpt,
      explanation: quizExplanation.trim() || undefined,
      isActive: true
    };

    await pinLiveQuiz(session.id, newQuiz);
    setIsQuizModalOpen(false);
    if (onSelectTab) onSelectTab('quiz');
  }, [quizQuestion, quizOptA, quizOptB, quizOptC, quizOptD, correctOpt, quizExplanation, session.id, onSelectTab]);

  // Lancement du Devoir
  const handleLaunchAssignment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim() || !assignInstructions.trim()) {
      alert('Veuillez renseigner le titre et les consignes du devoir.');
      return;
    }

    playValidationBeep();
    const deadline = Date.now() + (assignDuration * 60 * 1000);
    await publishLiveAssignment(session.id, {
      id: `assign_${Date.now()}`,
      title: assignTitle.trim(),
      instructions: assignInstructions.trim(),
      pdfUrl: assignPdfUrl.trim() || undefined,
      durationMinutes: assignDuration,
      deadline
    });

    setIsAssignmentModalOpen(false);
    if (onSelectTab) onSelectTab('assignment');
  }, [assignTitle, assignInstructions, assignPdfUrl, assignDuration, session.id, onSelectTab]);

  // Sauvegarde Coaching Room URL
  const handleSaveCoachingRoom = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    await updateCoachingRoom(session.id, coachingRoomInput.trim());
    setIsCoachingModalOpen(false);
  }, [session.id, coachingRoomInput]);

  const handRaisedList = session.handRaisedUsers || [];

  return (
    <div className={`w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-3 shadow-2xl ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Titre & Mode Formateur */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Console Formateur & Vendeur
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600/30 text-blue-400 border border-blue-500/40">
                DIRECT ACTIF
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Contrôlez vos quiz, devoirs, produits épinglés et appels en direct
            </p>
          </div>
        </div>

        {/* Boutons d'Action Rapide Formateur */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Épingler un Quiz */}
          <button
            onClick={() => {
              playTapBeep();
              setIsQuizModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              session.activeQuiz?.isActive
                ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{session.activeQuiz?.isActive ? 'Quiz en Cours' : '📌 Lancer un Quiz'}</span>
          </button>

          {/* 2. Administrer un Devoir & PDF */}
          <button
            onClick={() => {
              playTapBeep();
              setIsAssignmentModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              session.activeAssignment?.isActive
                ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>{session.activeAssignment?.isActive ? 'Devoir Actif' : '📝 Administrer un Devoir'}</span>
          </button>

          {/* 3. Mains Levées */}
          <button
            onClick={() => {
              playTapBeep();
              setIsHandRaiseDrawerOpen(!isHandRaiseDrawerOpen);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm relative ${
              handRaisedList.length > 0
                ? 'bg-amber-500/20 border border-amber-500 text-amber-300 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Mains Levées ({handRaisedList.length})</span>
            {handRaisedList.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
            )}
          </button>

          {/* 4. Coaching 1-to-1 WebRTC */}
          <button
            onClick={() => {
              playTapBeep();
              setIsCoachingModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
          >
            <Video className="w-3.5 h-3.5" />
            <span>📹 Salon Coaching 1-to-1</span>
          </button>
        </div>
      </div>

      {/* Tiroir / Liste déroulante des mains levées */}
      {isHandRaiseDrawerOpen && (
        <div className="mt-3 p-3 bg-slate-800 rounded-xl border border-slate-700 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5 text-amber-400" />
              Élèves ayant levé la main pour intervenir :
            </h5>
            <button
              onClick={() => setIsHandRaiseDrawerOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {handRaisedList.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Aucune main levée pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {handRaisedList.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-bold text-white">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={session.coachingRoomUrl || `https://meet.jit.si/nanasore-${session.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Video className="w-3 h-3" /> Donner la parole
                    </a>
                    <button
                      onClick={() => lowerHandInSession(session.id, user.id)}
                      className="text-[11px] text-slate-400 hover:text-red-400"
                    >
                      Baisser la main
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CRÉATION RAPIDE DE QUIZ */}
      {/* ========================================================================= */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Lancer un Quiz en Direct
                  </h3>
                  <p className="text-xs text-slate-500">
                    Surgit instantanément sur l'écran de tous les élèves connectés
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsQuizModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLaunchQuiz} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Question posée aux élèves *
                </label>
                <input
                  type="text"
                  required
                  value={quizQuestion}
                  onChange={(e) => setQuizQuestion(e.target.value)}
                  placeholder="ex: Quel est l'élément indispensable d'une offre irrésistible ?"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Options A, B, C, D */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Choix de réponses (Cochez la bonne réponse) *
                </label>

                {/* Option A */}
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_opt"
                    checked={correctOpt === 'opt_A'}
                    onChange={() => setCorrectOpt('opt_A')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="text-xs font-extrabold text-slate-600 w-5">A:</span>
                  <input
                    type="text"
                    required
                    value={quizOptA}
                    onChange={(e) => setQuizOptA(e.target.value)}
                    placeholder="ex: Une garantie sans risque"
                    className="flex-1 text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                {/* Option B */}
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_opt"
                    checked={correctOpt === 'opt_B'}
                    onChange={() => setCorrectOpt('opt_B')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="text-xs font-extrabold text-slate-600 w-5">B:</span>
                  <input
                    type="text"
                    required
                    value={quizOptB}
                    onChange={(e) => setQuizOptB(e.target.value)}
                    placeholder="ex: Des remises permanentes de 80%"
                    className="flex-1 text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                {/* Option C */}
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_opt"
                    checked={correctOpt === 'opt_C'}
                    onChange={() => setCorrectOpt('opt_C')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="text-xs font-extrabold text-slate-600 w-5">C:</span>
                  <input
                    type="text"
                    value={quizOptC}
                    onChange={(e) => setQuizOptC(e.target.value)}
                    placeholder="ex: Aucun bonus additionnel"
                    className="flex-1 text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                {/* Option D */}
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_opt"
                    checked={correctOpt === 'opt_D'}
                    onChange={() => setCorrectOpt('opt_D')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="text-xs font-extrabold text-slate-600 w-5">D:</span>
                  <input
                    type="text"
                    value={quizOptD}
                    onChange={(e) => setQuizOptD(e.target.value)}
                    placeholder="ex: Un site avec 200 pages"
                    className="flex-1 text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Explication */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Explication pédagogique affichée après la réponse
                </label>
                <textarea
                  rows={2}
                  value={quizExplanation}
                  onChange={(e) => setQuizExplanation(e.target.value)}
                  placeholder="ex: La garantie réduit le risque perçu à zéro et fait grimper le taux de conversion !"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuizModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md transition-all"
                >
                  📌 Épingler & Lancer ce Quiz en Direct
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CRÉATION DEVOIR & PARTAGE PDF */}
      {/* ========================================================================= */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Administrer un Devoir / Partager un PDF
                  </h3>
                  <p className="text-xs text-slate-500">
                    Transmettez l'exercice avec chrono et lien PDF téléchargeable
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsAssignmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLaunchAssignment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titre du Devoir / Travaux Pratiques *
                </label>
                <input
                  type="text"
                  required
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="ex: TP #1 : Rédigez le script de relance WhatsApp"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Consignes et Objectifs *
                </label>
                <textarea
                  rows={3}
                  required
                  value={assignInstructions}
                  onChange={(e) => setAssignInstructions(e.target.value)}
                  placeholder="ex: Décrivez le message envoyé à H+2 après l'abandon du panier en incluant une preuve sociale."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Durée du chrono (en minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={assignDuration}
                  onChange={(e) => setAssignDuration(Number(e.target.value))}
                  className="w-32 text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lien du Fichier PDF / Support de Cours (Optionnel)
                </label>
                <input
                  type="url"
                  value={assignPdfUrl}
                  onChange={(e) => setAssignPdfUrl(e.target.value)}
                  placeholder="https://.../support-cours-tp.pdf"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Collez un lien direct PDF ou Google Drive partagé pour que les élèves le téléchargent en 1 clic.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md transition-all"
                >
                  🚀 Envoyer le Devoir aux Élèves
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CONFIGURATION COACHING 1-TO-1 */}
      {/* ========================================================================= */}
      {isCoachingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Salon de Coaching 1-to-1
                  </h3>
                  <p className="text-xs text-slate-500">
                    Visio privée directe intégrée entre coach et participant
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCoachingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoachingRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lien de la salle visio WebRTC / Jitsi / Google Meet
                </label>
                <input
                  type="url"
                  required
                  value={coachingRoomInput}
                  onChange={(e) => setCoachingRoomInput(e.target.value)}
                  placeholder="https://meet.jit.si/nanasore-..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <p className="font-semibold mb-1">💡 Appel Face-à-Face direct :</p>
                <p className="leading-relaxed">
                  L'élève peut rejoindre l'appel sans installation logicielle. Le son et l'image s'ouvrent dans la fenêtre du live.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <a
                  href={coachingRoomInput}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Tester la salle
                </a>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md"
                >
                  Enregistrer & Activer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveInstructorControlBar;
