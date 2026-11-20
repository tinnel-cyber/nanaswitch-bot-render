import React, { useState, useCallback } from 'react';
import {
  Radio,
  HelpCircle,
  FileText,
  ShoppingBag,
  Hand,
  Video,
  X,
  GraduationCap,
  Share2,
  Calendar,
  Lock,
  Unlock,
  Eye,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  LiveSession,
  LiveQuizQuestion,
} from '../../../../types/liveSession';
import {
  pinLiveQuiz,
  publishLiveAssignment,
  lowerHandInSession,
} from '../../../../services/liveSessionService';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface LiveInstructorControlBarProps {
  session: LiveSession;
  roomMode: 'classroom' | 'live_shopping';
  onChangeRoomMode: (mode: 'classroom' | 'live_shopping') => void;
  isBroadcasterActive: boolean;
  onToggleBroadcaster: () => void;
  onOpenMultistream: () => void;
  onOpenBookingModal: () => void;
  onUpdateAccessGate: (cfg: { isPaid: boolean; accessPrice: number; accessLabel: string }) => void;
  onSelectTab?: (tab: 'chat' | 'quiz' | 'assignment' | 'offers') => void;
  className?: string;
}

export const LiveInstructorControlBar: React.FC<LiveInstructorControlBarProps> = ({
  session,
  roomMode,
  onChangeRoomMode,
  isBroadcasterActive,
  onToggleBroadcaster,
  onOpenMultistream,
  onOpenBookingModal,
  onUpdateAccessGate,
  onSelectTab,
  className = '',
}) => {
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (ZÉRO ERREUR #310)
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState<boolean>(false);
  const [isHandRaiseDrawerOpen, setIsHandRaiseDrawerOpen] = useState<boolean>(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState<boolean>(false);

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

  // Formulaire Accès Cours Payant / Adhésion VIP
  const [gateIsPaid, setGateIsPaid] = useState<boolean>(Boolean(session.isPaid));
  const [gatePrice, setGatePrice] = useState<string>(String(session.accessPrice || 10000));
  const [gateLabel, setGateLabel] = useState<string>(session.accessLabel || 'Accès Cours & Salle VIP');

  // Lancement du Quiz
  const handleLaunchQuiz = useCallback(
    async (e: React.FormEvent) => {
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
          ...(quizOptD.trim() ? [{ id: 'opt_D', label: 'D', text: quizOptD.trim() }] : []),
        ],
        correctOptionId: correctOpt,
        explanation: quizExplanation.trim() || undefined,
        isActive: true,
      };

      await pinLiveQuiz(session.id, newQuiz);
      setIsQuizModalOpen(false);
      onSelectTab?.('quiz');
    },
    [quizQuestion, quizOptA, quizOptB, quizOptC, quizOptD, correctOpt, quizExplanation, session.id, onSelectTab]
  );

  // Lancement du Devoir
  const handleLaunchAssignment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!assignTitle.trim() || !assignInstructions.trim()) {
        alert('Veuillez renseigner le titre et les consignes du devoir.');
        return;
      }

      playValidationBeep();
      const deadline = Date.now() + assignDuration * 60 * 1000;
      await publishLiveAssignment(session.id, {
        id: `assign_${Date.now()}`,
        title: assignTitle.trim(),
        instructions: assignInstructions.trim(),
        pdfUrl: assignPdfUrl.trim() || undefined,
        durationMinutes: assignDuration,
        deadline,
      });

      setIsAssignmentModalOpen(false);
      onSelectTab?.('assignment');
    },
    [assignTitle, assignInstructions, assignPdfUrl, assignDuration, session.id, onSelectTab]
  );

  const handleSaveAccessGate = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    const numericPrice = Math.max(0, Number(gatePrice) || 0);
    onUpdateAccessGate({
      isPaid: gateIsPaid && numericPrice > 0,
      accessPrice: numericPrice,
      accessLabel: gateLabel.trim() || 'Accès Cours & Salle VIP',
    });
    setIsAccessModalOpen(false);
  };

  const handRaisedList = session.handRaisedUsers || [];

  return (
    <div
      className={`w-full bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-sm shadow-blue-950/5 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* 1. Bascule 1-Clic : Salle de Cours <-> Live Shopping Produits Physiques */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#F5F7FB] border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onChangeRoomMode('classroom');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                roomMode === 'classroom'
                  ? 'bg-[#1D4ED8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Salle de Cours</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onChangeRoomMode('live_shopping');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                roomMode === 'live_shopping'
                  ? 'bg-[#1D4ED8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Live Shopping</span>
            </button>
          </div>

          {/* Bouton Accès Libre / Cours Payant */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setGateIsPaid(Boolean(session.isPaid));
              setGatePrice(String(session.accessPrice || 10000));
              setGateLabel(session.accessLabel || 'Accès Cours & Salle VIP');
              setIsAccessModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              session.isPaid && (session.accessPrice || 0) > 0
                ? 'bg-blue-50 border-blue-300 text-[#1D4ED8]'
                : 'bg-[#F5F7FB] hover:bg-blue-50 border-slate-200 text-slate-700'
            }`}
            title="Configurer l'accès gratuit ou payant (Cours / Adhésion VIP)"
          >
            {session.isPaid && (session.accessPrice || 0) > 0 ? (
              <>
                <Lock className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>Payant • {formatCFA(session.accessPrice || 0)}</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Accès Libre</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Outils Studio Unifiés : Diffusion + Pédagogie */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsQuizModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              session.activeQuiz?.isActive
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-[#F5F7FB] hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] border-slate-200'
            }`}
          >
            <HelpCircle className={`w-3.5 h-3.5 ${session.activeQuiz?.isActive ? 'text-white' : 'text-amber-500'}`} />
            <span>Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsAssignmentModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              session.activeAssignment?.isActive
                ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-xs'
                : 'bg-[#F5F7FB] hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] border-slate-200'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${session.activeAssignment?.isActive ? 'text-white' : 'text-[#1D4ED8]'}`} />
            <span>Devoir</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsHandRaiseDrawerOpen(!isHandRaiseDrawerOpen);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition relative cursor-pointer ${
              handRaisedList.length > 0
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-[#F5F7FB] hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] border-slate-200'
            }`}
          >
            <Hand className="w-3.5 h-3.5 text-amber-500" />
            <span>Mains ({handRaisedList.length})</span>
            {handRaisedList.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenBookingModal();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#F5F7FB] hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] border border-slate-200 transition cursor-pointer"
            title="Demandes & Salle Coaching 1-to-1"
          >
            <Calendar className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>RDV 1-to-1</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onOpenMultistream();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#F5F7FB] hover:bg-blue-50 text-slate-700 hover:text-[#1D4ED8] border border-slate-200 transition cursor-pointer"
            title="Clés RTMP, Multistreaming YouTube/Facebook/TikTok et liens de diffusion"
          >
            <Share2 className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Clés &amp; Multistream</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onToggleBroadcaster();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer ${
              isBroadcasterActive
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-[#1D4ED8] hover:bg-[#1E40AF] text-white'
            }`}
          >
            {isBroadcasterActive ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Retour Lecteur</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Caméra WHIP</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tiroir des mains levées (100 % Natif, zéro Jitsi) */}
      {isHandRaiseDrawerOpen && (
        <div className="mt-2.5 p-3 bg-[#F5F7FB] rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5 text-amber-500" />
              Participants ayant levé la main :
            </h5>
            <button
              type="button"
              onClick={() => setIsHandRaiseDrawerOpen(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {handRaisedList.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Aucune main levée pour le moment.</p>
          ) : (
            <div className="space-y-1.5">
              {handRaisedList.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-xs font-bold text-slate-900">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        onOpenBookingModal();
                      }}
                      className="text-[11px] font-bold text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Video className="w-3 h-3" /> Inviter en Visio 1-to-1
                    </button>
                    <button
                      type="button"
                      onClick={() => lowerHandInSession(session.id, user.id)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      Baisser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL CONFIGURATION ACCÈS COURS PAYANT / ADHÉSION VIP */}
      {isAccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Contrôle d&apos;Accès à la Salle
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Activez le sas payant pour vos cours, masterclass ou adhésions VIP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccessModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccessGate} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGateIsPaid(false)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    !gateIsPaid
                      ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8]'
                      : 'bg-[#F5F7FB] border-slate-200 text-slate-600'
                  }`}
                >
                  <Unlock className="w-4 h-4 mb-1" />
                  <div className="text-xs font-black">Accès Libre</div>
                  <div className="text-[10px] opacity-80">Entrée directe par lien</div>
                </button>
                <button
                  type="button"
                  onClick={() => setGateIsPaid(true)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    gateIsPaid
                      ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8]'
                      : 'bg-[#F5F7FB] border-slate-200 text-slate-600'
                  }`}
                >
                  <Lock className="w-4 h-4 mb-1" />
                  <div className="text-xs font-black">Cours / VIP Payant</div>
                  <div className="text-[10px] opacity-80">Sas Mobile Money &amp; Membres</div>
                </button>
              </div>

              {gateIsPaid && (
                <div className="space-y-3 bg-[#F5F7FB] p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Libellé de l&apos;accès
                    </label>
                    <input
                      type="text"
                      value={gateLabel}
                      onChange={(e) => setGateLabel(e.target.value)}
                      placeholder="Ex: Accès Cours VIP, Adhésion Mensuelle..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tarif d&apos;entrée (F CFA)
                    </label>
                    <input
                      type="number"
                      min={500}
                      step={500}
                      value={gatePrice}
                      onChange={(e) => setGatePrice(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccessModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Appliquer en direct</span>
                </button>
              </div>
            </form>
          </div>
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
    </div>
  );
};

export default LiveInstructorControlBar;
