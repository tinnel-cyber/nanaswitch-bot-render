import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MessageCircle,
  HelpCircle,
  FileText,
  ShoppingBag,
  Send,
  Pin,
  Hand,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Upload,
  Trash2,
  Award,
  Sparkles,
  Phone,
  User,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Zap,
  BarChart2,
  Pencil,
  Check,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LiveSession,
  LiveChatMessage,
  LiveQuizQuestion,
  LiveAssignment,
  LiveSubmission,
  HandRaisedUser,
} from '../../../../types/liveSession';
import { StoreProductItem } from '../../../../components/storeBuilder/types';
import {
  sendLiveChatMessage,
  subscribeLiveChatMessages,
  pinLiveChatMessage,
  raiseHandInSession,
  lowerHandInSession,
  pinLiveQuiz,
  closeLiveQuiz,
  submitQuizAnswer,
  publishLiveAssignment,
  closeLiveAssignment,
  submitLiveAssignmentWork,
  subscribeLiveSubmissions,
  gradeLiveSubmission,
} from '../../../../services/liveSessionService';
import { uploadLiveResourceFile } from '../../../../services/liveResourceUploadService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export type LivePanelTab = 'chat' | 'quiz' | 'assignment' | 'offers';

export interface LiveClassroomInteractivePanelProps {
  session: LiveSession;
  isHost?: boolean;
  roomMode?: 'classroom' | 'live_shopping';
  onOpenFunnel?: (product: StoreProductItem) => void;
  onPinProduct?: (product: StoreProductItem) => void;
  onUnpinProduct?: () => void;
  activeTabOverride?: LivePanelTab;
  onTabChange?: (tab: LivePanelTab) => void;
  className?: string;
}

const AVATAR_PALETTE = [
  'bg-blue-100 text-[#1D4ED8]',
  'bg-indigo-100 text-indigo-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
];

function getInitials(name: string): string {
  const parts = (name || 'E').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'E';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarColor(name: string, isHostMsg: boolean): string {
  if (isHostMsg) return 'bg-[#1D4ED8] text-white';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export const LiveClassroomInteractivePanel: React.FC<LiveClassroomInteractivePanelProps> = ({
  session,
  isHost = false,
  roomMode = 'classroom',
  onOpenFunnel,
  onPinProduct,
  onUnpinProduct,
  activeTabOverride,
  onTabChange,
  className = '',
}) => {
  // 1. DÉCLARATION STRICTE DE TOUS LES HOOKS AU SOMMET (ZÉRO ERREUR #310)
  const [internalTab, setInternalTab] = useState<LivePanelTab>('chat');
  const activeTab = activeTabOverride || internalTab;

  // Profil participant local (mémorisé dans le navigateur, sans disparition pendant la frappe)
  const [participantName, setParticipantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nana_live_participant_name') || '';
    }
    return '';
  });
  const [nameDraft, setNameDraft] = useState<string>(participantName);
  const [isEditingName, setIsEditingName] = useState<boolean>(!participantName && !isHost);

  const [participantContact, setParticipantContact] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nana_live_participant_contact') || '';
    }
    return '';
  });

  // Compteur réel de participants en ligne via Supabase Realtime Presence
  const [onlineCount, setOnlineCount] = useState<number>(1);

  // Chat state
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isQuestionChecked, setIsQuestionChecked] = useState<boolean>(false);
  const [chatFilter, setChatFilter] = useState<'all' | 'questions'>('all');
  const [hasRaisedHand, setHasRaisedHand] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Quiz state
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [hasAnsweredQuiz, setHasAnsweredQuiz] = useState<boolean>(false);

  // Assignment / Devoir state
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<LiveSubmission[]>([]);
  const [studentTextAnswer, setStudentTextAnswer] = useState<string>('');
  const [studentFile, setStudentFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const [isSubmittingWork, setIsSubmittingWork] = useState<boolean>(false);
  const [hasSubmittedWork, setHasSubmittedWork] = useState<boolean>(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<string>('18/20 - Excellent travail !');
  const [feedbackInput, setFeedbackInput] = useState<string>('Très bonne argumentation et maîtrise du sujet.');

  // Compte à rebours du devoir actif
  const [assignmentTimeRemaining, setAssignmentTimeRemaining] = useState<string>('');

  // Synchronisation du nom dans localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && participantName) {
      localStorage.setItem('nana_live_participant_name', participantName);
    }
  }, [participantName]);

  useEffect(() => {
    if (typeof window !== 'undefined' && participantContact) {
      localStorage.setItem('nana_live_participant_contact', participantContact);
    }
  }, [participantContact]);

  // Suivi réel des participants connectés via Supabase Realtime Presence
  useEffect(() => {
    if (!session?.id) return;
    const presenceKey = `p_${Math.random().toString(36).substring(2, 10)}`;
    const presenceChannel = supabase.channel(`live_presence_${session.id}`, {
      config: { presence: { key: presenceKey } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        setOnlineCount(Math.max(1, count));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await presenceChannel.track({
              role: isHost ? 'host' : 'participant',
              joinedAt: Date.now(),
            });
          } catch {
            // ignore
          }
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [session?.id, isHost]);

  // Abonnement aux messages du chat
  useEffect(() => {
    if (!session?.id) return;
    const unsubscribe = subscribeLiveChatMessages(session.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 80);
    });
    return () => unsubscribe();
  }, [session?.id]);

  // Abonnement aux soumissions de devoirs (pour le formateur)
  useEffect(() => {
    if (!session?.id) return;
    const unsubscribe = subscribeLiveSubmissions(session.id, (subs) => {
      setAssignmentSubmissions(subs);
    });
    return () => unsubscribe();
  }, [session?.id]);

  // Compte à rebours devoir
  useEffect(() => {
    if (!session?.activeAssignment?.deadline) {
      setAssignmentTimeRemaining('');
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = (session.activeAssignment?.deadline || 0) - now;
      if (diff <= 0) {
        setAssignmentTimeRemaining('Temps écoulé');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setAssignmentTimeRemaining(`${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.activeAssignment?.deadline]);

  // Bascule automatique vers l'onglet Quiz ou Devoir si nouveau
  useEffect(() => {
    if (session?.activeQuiz?.isActive && !hasAnsweredQuiz) {
      // Notification visuelle d'un nouveau quiz
      playValidationBeep();
    }
  }, [session?.activeQuiz?.isActive, hasAnsweredQuiz]);

  const handleTabChange = useCallback((newTab: LivePanelTab) => {
    playTapBeep();
    if (onTabChange) {
      onTabChange(newTab);
    } else {
      setInternalTab(newTab);
    }
  }, [onTabChange]);

  // Envoi de message chat
  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const sender = participantName.trim() || (isHost ? session.hostName || 'Formateur' : 'Élève Anonyme');
    playTapBeep();
    const textToSend = inputMessage;
    const questionFlag = isQuestionChecked;
    setInputMessage('');
    setIsQuestionChecked(false);

    await sendLiveChatMessage(session.id, {
      senderName: sender,
      senderRole: isHost ? 'host' : 'student',
      text: textToSend,
      isQuestion: questionFlag
    });
  }, [inputMessage, participantName, isHost, session.id, session.hostName, isQuestionChecked]);

  // Lever / Baisser la main
  const handleToggleHandRaise = useCallback(async () => {
    playValidationBeep();
    const sender = participantName.trim() || 'Élève en direct';
    const userId = `user_${sender.replace(/\s+/g, '_')}`;

    if (!hasRaisedHand) {
      setHasRaisedHand(true);
      await raiseHandInSession(session.id, {
        id: userId,
        name: sender,
        timestamp: Date.now()
      });
      // Envoyer un message système dans le chat
      await sendLiveChatMessage(session.id, {
        senderName: sender,
        senderRole: 'student',
        text: '✋ a levé la main pour poser une question en direct !',
        isQuestion: true
      });
    } else {
      setHasRaisedHand(false);
      await lowerHandInSession(session.id, userId);
    }
  }, [hasRaisedHand, participantName, session.id]);

  // Répondre au Quiz
  const handleSelectQuizOption = useCallback(async (optionId: string) => {
    if (hasAnsweredQuiz || !session.activeQuiz) return;
    setSelectedQuizOption(optionId);
    setHasAnsweredQuiz(true);

    const isCorrect = optionId === session.activeQuiz.correctOptionId;
    if (isCorrect) {
      playValidationBeep();
    } else {
      playTapBeep();
    }

    const studentName = participantName.trim() || 'Élève';
    await submitQuizAnswer(session.id, session.activeQuiz.id, {
      studentName,
      selectedOptionId: optionId,
      isCorrect
    });
  }, [hasAnsweredQuiz, session.activeQuiz, session.id, participantName]);

  // Upload réel du fichier devoir (PDF, DOCX, Image, ZIP) vers Supabase Storage
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapBeep();
    setIsSubmittingWork(true);
    try {
      const uploaded = await uploadLiveResourceFile(file, 'submissions', session.id);
      setStudentFile({
        name: uploaded.name,
        url: uploaded.url,
        type: uploaded.type,
      });
    } catch (err: any) {
      alert(err?.message || "Impossible de téléverser ce fichier.");
    } finally {
      setIsSubmittingWork(false);
    }
  }, [session.id]);

  // Soumission du devoir
  const handleSubmitAssignment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFile && !studentTextAnswer.trim()) {
      alert('Veuillez joindre un fichier PDF/document ou rédiger votre réponse texte.');
      return;
    }

    const name = participantName.trim() || 'Élève';
    const contact = participantContact.trim() || 'Non renseigné';

    setIsSubmittingWork(true);
    playValidationBeep();

    await submitLiveAssignmentWork(session.id, {
      assignmentId: session.activeAssignment?.id || 'live-task',
      studentName: name,
      studentContact: contact,
      studentPhone: contact,
      fileName: studentFile?.name,
      fileUrl: studentFile?.url,
      fileType: studentFile?.type,
      textContent: studentTextAnswer.trim()
    });

    setIsSubmittingWork(false);
    setHasSubmittedWork(true);
  }, [studentFile, studentTextAnswer, participantName, participantContact, session.id, session.activeAssignment?.id]);

  // Attribution d'une note (Formateur)
  const handleGradeSubmission = useCallback(async (submissionId: string) => {
    playValidationBeep();
    await gradeLiveSubmission(session.id, submissionId, gradeInput, feedbackInput);
    setGradingSubmissionId(null);
  }, [session.id, gradeInput, feedbackInput]);

  const questionsCount = useMemo(() => messages.filter((m) => m.isQuestion).length, [messages]);
  const visibleMessages = useMemo(
    () => (chatFilter === 'questions' ? messages.filter((m) => m.isQuestion) : messages),
    [messages, chatFilter]
  );

  const showOffersTab = roomMode === 'live_shopping' || (session.products && session.products.length > 0);

  const handleSaveNameDraft = () => {
    const trimmed = nameDraft.trim();
    if (trimmed) {
      setParticipantName(trimmed);
      setIsEditingName(false);
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-3xl border border-slate-200/90 shadow-lg shadow-blue-950/5 overflow-hidden ${className}`}>
      {/* 1. Barre d'Onglets Épurée Nanasore (Blanc cassé + Bleu Royal) */}
      <div className="flex items-center border-b border-slate-200/80 bg-[#F5F7FB] px-2.5 pt-2.5 pb-0 gap-1 select-none shrink-0">
        <button
          type="button"
          onClick={() => handleTabChange('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-t-2xl text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-white text-[#1D4ED8] shadow-xs border-x border-t border-slate-200/80 -mb-px'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Chat</span>
          {messages.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'chat' ? 'bg-blue-100 text-[#1D4ED8]' : 'bg-slate-200/80 text-slate-600'
            }`}>
              {messages.length}
            </span>
          )}
        </button>

        {showOffersTab && (
          <button
            type="button"
            onClick={() => handleTabChange('offers')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-t-2xl text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'offers'
                ? 'bg-white text-[#1D4ED8] shadow-xs border-x border-t border-slate-200/80 -mb-px'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>{roomMode === 'live_shopping' ? 'Produits' : 'Offres'}</span>
            {session.products && session.products.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                {session.products.length}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => handleTabChange('quiz')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-t-2xl text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-white text-[#1D4ED8] shadow-xs border-x border-t border-slate-200/80 -mb-px'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Quiz</span>
          {session.activeQuiz?.isActive && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-2 right-2" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('assignment')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-t-2xl text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === 'assignment'
              ? 'bg-white text-[#1D4ED8] shadow-xs border-x border-t border-slate-200/80 -mb-px'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>Devoir</span>
          {session.activeAssignment?.isActive && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-[#1D4ED8] font-extrabold animate-pulse">
              1
            </span>
          )}
        </button>
      </div>

      {/* 2. Contenu des Onglets */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {/* ========================================================================= */}
        {/* ONGLET 1 : CHAT EN DIRECT & Q&A PROFESSIONNEL                             */}
        {/* ========================================================================= */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Sous-barre : Présence temps réel + Filtre Tous / Q&A + Lever la main */}
            <div className="px-3.5 py-2.5 bg-[#F8FAFD] border-b border-slate-200/70 flex items-center justify-between gap-2 shrink-0 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] font-bold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Users className="w-3 h-3" />
                  <span>{onlineCount}</span>
                </span>

                {/* Filtre Tous / Questions */}
                <div className="inline-flex items-center rounded-lg bg-slate-200/60 p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setChatFilter('all')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      chatFilter === 'all'
                        ? 'bg-white text-[#1D4ED8] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatFilter('questions')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                      chatFilter === 'questions'
                        ? 'bg-white text-[#1D4ED8] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Q&amp;A</span>
                    {questionsCount > 0 && (
                      <span className="text-[10px] px-1 rounded-full bg-amber-100 text-amber-800">
                        {questionsCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {!isHost && (
                <button
                  type="button"
                  onClick={handleToggleHandRaise}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    hasRaisedHand
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200'
                      : 'bg-white text-slate-700 hover:text-[#1D4ED8] hover:bg-blue-50 border border-slate-200'
                  }`}
                >
                  <Hand className={`w-3.5 h-3.5 ${hasRaisedHand ? 'text-white' : 'text-amber-500'}`} />
                  <span>{hasRaisedHand ? 'Main levée' : 'Lever la main'}</span>
                </button>
              )}
            </div>

            {/* Message Épinglé Formateur */}
            {session.pinnedMessage && (
              <div className="mx-3 mt-2.5 p-2.5 bg-blue-50/90 border border-blue-200/80 rounded-2xl flex items-start gap-2.5 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Pin className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-[#1D4ED8] truncate">
                      Message épinglé • {session.pinnedMessage.senderName}
                    </span>
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => pinLiveChatMessage(session.id, null)}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 leading-snug mt-0.5 break-words">
                    {session.pinnedMessage.text}
                  </p>
                </div>
              </div>
            )}

            {/* Liste scrollable plein hauteur (zéro trou vide) */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-3 bg-white"
            >
              {visibleMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5F7FB] border border-slate-200/80 flex items-center justify-center text-[#1D4ED8] mb-3">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    {chatFilter === 'questions'
                      ? 'Aucune question posée pour le moment'
                      : 'Bienvenue dans la discussion en direct'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                    {chatFilter === 'questions'
                      ? 'Cochez « Question » ci-dessous pour mettre votre question en avant.'
                      : 'Échangez avec le formateur et les autres participants en temps réel.'}
                  </p>
                </div>
              ) : (
                visibleMessages.map((msg) => {
                  const isHostMsg = msg.senderRole === 'host';
                  const initials = getInitials(msg.senderName);
                  const avatarCls = getAvatarColor(msg.senderName, isHostMsg);
                  return (
                    <div key={msg.id} className="group flex items-start gap-2.5">
                      {/* Avatar Initiales */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow-xs ${avatarCls}`}
                      >
                        {initials}
                      </div>

                      {/* Bulle Message */}
                      <div
                        className={`flex-1 min-w-0 rounded-2xl px-3 py-2 border transition-colors ${
                          msg.isQuestion
                            ? 'bg-amber-50/70 border-amber-200/80'
                            : isHostMsg
                            ? 'bg-blue-50/70 border-blue-200/80'
                            : 'bg-[#F5F7FB] border-slate-200/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <span
                              className={`text-xs font-extrabold truncate ${
                                isHostMsg ? 'text-[#1D4ED8]' : 'text-slate-900'
                              }`}
                            >
                              {msg.senderName}
                            </span>
                            {isHostMsg && (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-[#1D4ED8] text-white uppercase tracking-wider">
                                Formateur
                              </span>
                            )}
                            {msg.isQuestion && (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-200/80 text-amber-900 flex items-center gap-0.5">
                                <HelpCircle className="w-2.5 h-2.5" /> Q&amp;A
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isHost && (
                              <button
                                type="button"
                                onClick={() => pinLiveChatMessage(session.id, msg)}
                                className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-[#1D4ED8] hover:underline flex items-center gap-0.5 transition cursor-pointer"
                                title="Épingler ce message en haut du chat"
                              >
                                <Pin className="w-2.5 h-2.5" /> Épingler
                              </button>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Zone de saisie moderne (avec édition prénom corrigée) */}
            <form
              onSubmit={(e) => {
                if (isEditingName && nameDraft.trim()) {
                  setParticipantName(nameDraft.trim());
                  setIsEditingName(false);
                }
                handleSendMessage(e);
              }}
              className="p-3 border-t border-slate-200/80 bg-[#F5F7FB] shrink-0 space-y-2"
            >
              {/* Identité participant (ne disparaît PLUS à la 1ère lettre !) */}
              {!isHost && (
                isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveNameDraft();
                        }
                      }}
                      placeholder="Votre prénom ou nom (ex: Moussa)..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNameDraft}
                      disabled={!nameDraft.trim()}
                      className="px-2.5 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-40 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>OK</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                    <span className="truncate">
                      Connecté en tant que{' '}
                      <strong className="text-slate-800">{participantName || 'Participant'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(participantName);
                        setIsEditingName(true);
                      }}
                      className="text-[#1D4ED8] hover:underline font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>Modifier</span>
                    </button>
                  </div>
                )
              )}

              {/* Option Question Q&A */}
              <div className="flex items-center justify-between px-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 hover:text-[#1D4ED8]">
                  <input
                    type="checkbox"
                    checked={isQuestionChecked}
                    onChange={(e) => setIsQuestionChecked(e.target.checked)}
                    className="rounded text-[#1D4ED8] focus:ring-[#1D4ED8] w-3.5 h-3.5"
                  />
                  <span>Marquer comme question (Q&amp;A)</span>
                </label>
              </div>

              {/* Champ message + bouton Bleu Royal */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    isQuestionChecked
                      ? 'Posez votre question au formateur...'
                      : 'Écrivez un message dans la salle...'
                  }
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-2xl border border-slate-300/90 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-[#1D4ED8]"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="p-2.5 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white disabled:opacity-40 transition shadow-sm cursor-pointer shrink-0"
                  title="Envoyer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 2 : QUIZ EN DIRECT ÉPINGLÉ */}
        {/* ========================================================================= */}
        {activeTab === 'quiz' && (
          <div className="flex-1 p-4 overflow-y-auto">
            {session.activeQuiz?.isActive ? (
              <div className="bg-gradient-to-b from-blue-50/50 to-white p-4 rounded-2xl border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold tracking-wider uppercase">
                    <Sparkles className="w-3 h-3" /> Quiz en Direct
                  </div>
                  {session.activeQuiz.totalVotes !== undefined && (
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                      {session.activeQuiz.totalVotes} réponses
                    </span>
                  )}
                </div>

                <h3 className="text-sm lg:text-base font-bold text-slate-900 mb-4 leading-snug">
                  {session.activeQuiz.question}
                </h3>

                {/* Liste des options */}
                <div className="space-y-2.5 mb-4">
                  {session.activeQuiz.options.map((opt) => {
                    const isSelected = selectedQuizOption === opt.id;
                    const isCorrect = opt.id === session.activeQuiz?.correctOptionId;
                    const showResults = hasAnsweredQuiz || isHost;
                    
                    // Calcul du %
                    const votesForThis = session.activeQuiz?.votesBreakdown?.[opt.id] || 0;
                    const totalVotes = session.activeQuiz?.totalVotes || 1;
                    const percent = Math.round((votesForThis / (totalVotes || 1)) * 100);

                    return (
                      <button
                        key={opt.id}
                        disabled={hasAnsweredQuiz}
                        onClick={() => handleSelectQuizOption(opt.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden ${
                          showResults && isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : showResults && isSelected && !isCorrect
                            ? 'bg-red-50 border-red-300 text-red-900'
                            : isSelected
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200'
                            : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {/* Barre de progression des votes */}
                        {showResults && (
                          <div 
                            className={`absolute top-0 bottom-0 left-0 opacity-15 pointer-events-none transition-all duration-500 ${
                              isCorrect ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        )}

                        <div className="flex items-center justify-between relative z-10 gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                              showResults && isCorrect
                                ? 'bg-emerald-600 text-white'
                                : showResults && isSelected && !isCorrect
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {opt.label}
                            </span>
                            <span className="text-xs">{opt.text}</span>
                          </div>

                          {showResults && (
                            <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold">
                              <span>{percent}%</span>
                              {isCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : isSelected ? (
                                <XCircle className="w-4 h-4 text-red-600" />
                              ) : null}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explication pédagogique */}
                {hasAnsweredQuiz && session.activeQuiz.explanation && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 mb-3">
                    <p className="font-bold mb-0.5">💡 Explication du formateur :</p>
                    <p className="leading-relaxed">{session.activeQuiz.explanation}</p>
                  </div>
                )}

                {/* Bouton de clôture (Formateur) */}
                {isHost && (
                  <div className="pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => closeLiveQuiz(session.id)}
                      className="text-xs text-slate-500 hover:text-red-600 font-semibold"
                    >
                      Clôturer et retirer ce Quiz
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <HelpCircle className="w-12 h-12 text-slate-200 mx-auto mb-3 stroke-1" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Aucun Quiz Actif pour le Moment
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                  Le formateur lancera des questions interactives pendant la session pour tester vos connaissances en direct !
                </p>
                {isHost && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl max-w-xs mx-auto">
                    <p className="text-xs font-bold text-blue-900 mb-2">Vous êtes l'animateur :</p>
                    <button
                      onClick={() => {
                        pinLiveQuiz(session.id, {
                          id: `quiz_${Date.now()}`,
                          question: "Quel est le facteur #1 pour réussir une vente en direct ?",
                          options: [
                            { id: 'opt_A', label: 'A', text: "L'interaction et les réponses rapides aux objections" },
                            { id: 'opt_B', label: 'B', text: "Le prix le plus bas possible" },
                            { id: 'opt_C', label: 'C', text: "Avoir un studio de cinéma" },
                            { id: 'opt_D', label: 'D', text: "Parler sans s'arrêter pendant 2 heures" }
                          ],
                          correctOptionId: 'opt_A',
                          explanation: "L'interaction humaine et le traitement direct des questions transforment 5x plus de spectateurs en clients !",
                          isActive: true
                        });
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition-colors"
                    >
                      🚀 Lancer le Quiz Exemple Démo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 3 : DEVOIR, SUPPORT PDF & SOUMISSION */}
        {/* ========================================================================= */}
        {activeTab === 'assignment' && (
          <div className="flex-1 p-4 overflow-y-auto">
            {session.activeAssignment?.isActive ? (
              <div className="space-y-4">
                {/* Carte du Devoir Administré */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase">
                      <FileText className="w-3 h-3" /> Travaux Pratiques en Direct
                    </span>
                    {assignmentTimeRemaining && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-lg shadow-sm">
                        <Clock className="w-3 h-3" /> {assignmentTimeRemaining}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold tracking-tight mb-1">
                    {session.activeAssignment.title}
                  </h3>
                  <p className="text-xs text-blue-100 leading-relaxed mb-3">
                    {session.activeAssignment.instructions}
                  </p>

                  {/* Bouton Télécharger le PDF de l'énoncé */}
                  {session.activeAssignment.pdfUrl && (
                    <a
                      href={session.activeAssignment.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 py-2 px-3.5 rounded-xl bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Télécharger le Support PDF du Formateur
                    </a>
                  )}
                </div>

                {/* Zone de Soumission Élève (Si non formateur) */}
                {!isHost && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-blue-600" /> Remettre mon Devoir au Formateur
                    </h4>

                    {hasSubmittedWork ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                        <h5 className="text-xs font-bold text-emerald-900">Devoir Soumis avec Succès !</h5>
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Le formateur a reçu votre travail et va le corriger en direct.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitAssignment} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Votre Nom & Prénom *
                          </label>
                          <input
                            type="text"
                            required
                            value={participantName}
                            onChange={(e) => setParticipantName(e.target.value)}
                            placeholder="ex: Amina Coulibaly"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Numéro WhatsApp ou Email (pour le corrigé personnel) *
                          </label>
                          <input
                            type="text"
                            required
                            value={participantContact}
                            onChange={(e) => setParticipantContact(e.target.value)}
                            placeholder="ex: +225 07 00 00 00"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                          />
                        </div>

                        {/* Zone d'upload de fichier PDF ou document */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Joindre un Fichier PDF ou Capture
                          </label>
                          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl cursor-pointer bg-white transition-colors">
                            <Upload className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-xs font-bold text-blue-600">
                              {studentFile ? studentFile.name : 'Choisir un fichier PDF / image'}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Glisser-déposer ou cliquer pour parcourir
                            </span>
                            <input
                              type="file"
                              accept=".pdf,image/*,.doc,.docx"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Réponse texte alternative */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Réponse ou note explicative
                          </label>
                          <textarea
                            rows={3}
                            value={studentTextAnswer}
                            onChange={(e) => setStudentTextAnswer(e.target.value)}
                            placeholder="Détaillez vos réponses ou précisions..."
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingWork}
                          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isSubmittingWork ? 'Envoi en cours...' : '✅ Soumettre mon Devoir au Formateur'}</span>
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Vue Côté Formateur : Liste des Devoirs Soumis en Direct */}
                {isHost && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-600" /> 
                        Devoirs Reçus en Direct ({assignmentSubmissions.length})
                      </h4>
                      <button
                        onClick={() => closeLiveAssignment(session.id)}
                        className="text-[11px] text-red-600 hover:underline font-semibold"
                      >
                        Clôturer le devoir
                      </button>
                    </div>

                    {assignmentSubmissions.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">
                        En attente des premières soumissions des élèves...
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {assignmentSubmissions.map((sub) => (
                          <div 
                            key={sub.id}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">
                                  {sub.studentName}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Contact : {sub.studentContact || sub.studentPhone || 'N/A'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {sub.textContent && (
                              <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg mb-2 italic">
                                "{sub.textContent}"
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                {sub.fileUrl && (
                                  <a
                                    href={sub.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                                  >
                                    <FileText className="w-3 h-3" /> 👁️ Voir le PDF
                                  </a>
                                )}
                                {sub.studentContact && (
                                  <a
                                    href={`https://wa.me/${sub.studentContact.replace(/[^0-9]/g, '')}?text=Bonjour%20${encodeURIComponent(sub.studentName)},%20voici%20mon%20retour%20sur%20votre%20exercice%20en%20direct`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                                  >
                                    <Phone className="w-3 h-3" /> WhatsApp
                                  </a>
                                )}
                              </div>

                              {sub.grade ? (
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                  {sub.grade}
                                </span>
                              ) : (
                                <button
                                  onClick={() => setGradingSubmissionId(sub.id)}
                                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                                >
                                  Attribuer une note
                                </button>
                              )}
                            </div>

                            {/* Formulaire rapide de notation */}
                            {gradingSubmissionId === sub.id && (
                              <div className="mt-2.5 p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                                <input
                                  type="text"
                                  value={gradeInput}
                                  onChange={(e) => setGradeInput(e.target.value)}
                                  placeholder="Note (ex: 18/20 - Félicitations !)"
                                  className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                                />
                                <input
                                  type="text"
                                  value={feedbackInput}
                                  onChange={(e) => setFeedbackInput(e.target.value)}
                                  placeholder="Commentaire de correction..."
                                  className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setGradingSubmissionId(null)}
                                    className="text-[11px] text-slate-500 hover:underline"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    onClick={() => handleGradeSubmission(sub.id)}
                                    className="px-3 py-1 rounded bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700"
                                  >
                                    Valider la note
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3 stroke-1" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Aucun Devoir Administré pour le Moment
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                  Les travaux pratiques ou documents PDF transmis par le formateur apparaîtront directement ici.
                </p>
                {isHost && (
                  <button
                    onClick={() => {
                      publishLiveAssignment(session.id, {
                        id: `assign_${Date.now()}`,
                        title: "Exercice Pratique : Structurez votre Offre Irrésistible",
                        instructions: "Prenez 15 minutes pour lister vos 3 bonus exclusifs et définir votre garantie anti-risque.",
                        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                        durationMinutes: 20,
                        deadline: Date.now() + 1000 * 60 * 20
                      });
                    }}
                    className="py-2 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    🚀 Lancer l'Exercice Exemple Démo
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 4 : OFFRES DU LIVE & TUNNELS */}
        {/* ========================================================================= */}
        {activeTab === 'offers' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {(!session.products || session.products.length === 0) ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-2 stroke-1" />
                <p className="text-xs">Aucune offre associée à cette session.</p>
              </div>
            ) : (
              session.products.map((prod) => {
                const isPinned = session.pinnedProductId === prod.id;
                return (
                  <div
                    key={prod.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isPinned 
                        ? 'bg-blue-50/70 border-blue-400 shadow-md ring-2 ring-blue-200' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex gap-3">
                      <img
                        src={prod.image || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=200&auto=format&fit=crop&q=80'}
                        alt={prod.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                      />
                      <div className="flex-1 min-w-0">
                        {isPinned && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-600 text-white uppercase tracking-wider mb-1">
                            <Pin className="w-2.5 h-2.5" /> En Vedette Live
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {prod.name}
                        </h4>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-sm font-extrabold text-blue-600">
                            {prod.price?.toLocaleString()} FCFA
                          </span>
                          {prod.originalPrice && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {prod.originalPrice.toLocaleString()} FCFA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions d'Achat & Épinglage */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => onOpenFunnel && onOpenFunnel(prod)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-1"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Voir Tunnel & Acheter</span>
                      </button>

                      {session.whatsappPhone && (
                        <a
                          href={`https://wa.me/${session.whatsappPhone.replace(/[^0-9]/g, '')}?text=Bonjour,%20je%20suis%20int%C3%A9ress%C3%A9%20par%20l'offre%20du%20live%20:%20${encodeURIComponent(prod.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                          title="Acheter via WhatsApp"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}

                      {isHost && (
                        <button
                          onClick={() => {
                            if (isPinned && onUnpinProduct) {
                              onUnpinProduct();
                            } else if (onPinProduct) {
                              onPinProduct(prod);
                            }
                          }}
                          className={`p-1.5 rounded-xl border text-xs font-bold transition-colors ${
                            isPinned
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={isPinned ? 'Désépingler du direct' : 'Épingler au direct'}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClassroomInteractivePanel;
