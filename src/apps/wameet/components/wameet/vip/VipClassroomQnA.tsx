import React, { useState } from 'react';
import {
  Pin,
  ThumbsUp,
  MessageSquare,
  Send,
  ShieldCheck,
  Lock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Award,
  Crown
} from 'lucide-react';
import { VipQnaMessage } from './types';
import { DEFAULT_VIP_QNA_MESSAGES } from './mockVipData';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface VipClassroomQnAProps {
  initialMessages?: VipQnaMessage[];
  isSubscribed?: boolean;
  isInstructor?: boolean;
  currentUser?: {
    name: string;
    avatarUrl?: string;
  };
  className?: string;
}

/**
 * Onglet Q&A (Chat de classe)
 * Un chat dédié où seuls les étudiants abonnés peuvent poser des questions.
 * Le professeur peut épingler les meilleures réponses.
 */
export const VipClassroomQnA: React.FC<VipClassroomQnAProps> = ({
  initialMessages = DEFAULT_VIP_QNA_MESSAGES,
  isSubscribed = true,
  isInstructor = false,
  currentUser = {
    name: 'Moi (Étudiant VIP)',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
  },
  className = ''
}) => {
  const [messages, setMessages] = useState<VipQnaMessage[]>(initialMessages);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({
    'qna-1': true
  });

  const handleTogglePin = (messageId: string) => {
    playValidationBeep();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
      )
    );
  };

  const handleToggleUpvote = (messageId: string) => {
    playTapBeep();
    const isAlreadyUpvoted = !!upvotedIds[messageId];
    setUpvotedIds((prev) => ({
      ...prev,
      [messageId]: !isAlreadyUpvoted
    }));
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              upvotesCount: isAlreadyUpvoted ? m.upvotesCount - 1 : m.upvotesCount + 1
            }
          : m
      )
    );
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || !isSubscribed) return;

    playValidationBeep();
    const newMsg: VipQnaMessage = {
      id: `qna-${Date.now()}`,
      authorName: currentUser.name,
      authorAvatar:
        currentUser.avatarUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      authorRole: 'STUDENT',
      questionText: questionInput.trim(),
      createdAt: "À l'instant",
      isPinned: false,
      upvotesCount: 0
    };

    setMessages((prev) => [newMsg, ...prev]);
    setQuestionInput('');
  };

  const pinnedQuestions = messages.filter((m) => m.isPinned);
  const otherQuestions = messages.filter((m) => !m.isPinned);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Bandeau d'accès réservé aux abonnés */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-bold text-slate-800">
            Espace Q&A Fermé • Réservé exclusivement aux étudiants abonnés NaNa POS
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] shrink-0">
          Accès VIP Actif 🟢
        </span>
      </div>

      {/* =====================================================================
          1. SECTION QUESTIONS ÉPINGLÉES PAR LE PROFESSEUR
         ===================================================================== */}
      {pinnedQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase tracking-wider">
            <Pin className="w-4 h-4 fill-amber-500 text-amber-600" />
            <span>Questions & Réponses Épinglées par le Professeur ({pinnedQuestions.length})</span>
          </div>

          <div className="space-y-3">
            {pinnedQuestions.map((q) => (
              <article
                key={q.id}
                className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border-2 border-amber-300 shadow-xs space-y-3"
              >
                {/* Entête Question */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={q.authorAvatar}
                      alt={q.authorName}
                      className="w-8 h-8 rounded-full object-cover border border-amber-400"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {q.authorName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">
                          Étudiant
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{q.createdAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(q.id)}
                      className="px-2 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                      title="Épingler ou détacher cette question"
                    >
                      <Pin className="w-3 h-3 fill-amber-700" />
                      <span>Épinglé</span>
                    </button>
                  </div>
                </div>

                {/* Texte de la question */}
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed pl-1">
                  {q.questionText}
                </p>

                {/* Réponse Officielle du Professeur */}
                {q.instructorAnswer && (
                  <div className="p-3.5 rounded-xl bg-white border border-amber-300 shadow-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={q.instructorAnswer.authorAvatar}
                        alt={q.instructorAnswer.authorName}
                        className="w-6 h-6 rounded-full object-cover border border-blue-500"
                      />
                      <span className="text-xs font-black text-blue-900">
                        {q.instructorAnswer.authorName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-black uppercase">
                        👨‍🏫 Réponse du Formateur
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {q.instructorAnswer.answeredAt}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed pl-1">
                      {q.instructorAnswer.answerText}
                    </p>
                  </div>
                )}

                {/* Bouton Upvote / Utile */}
                <div className="flex items-center gap-3 pt-1 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => handleToggleUpvote(q.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      upvotedIds[q.id]
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-white hover:bg-amber-100 text-slate-600'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Utile ({q.upvotesCount})</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          2. LISTE DE TOUTES LES QUESTIONS DE LA CLASSE
         ===================================================================== */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>Fils de discussion récents ({otherQuestions.length})</span>
        </h4>

        <div className="space-y-3">
          {otherQuestions.map((q) => (
            <article
              key={q.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={q.authorAvatar}
                    alt={q.authorName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 block truncate">
                      {q.authorName}
                    </span>
                    <span className="text-[10px] text-slate-400">{q.createdAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(q.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                    title="Épingler cette question"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {q.questionText}
              </p>

              {/* Bouton de vote utile */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleToggleUpvote(q.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    upvotedIds[q.id]
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Utile ({q.upvotesCount})</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* =====================================================================
          3. FORMULAIRE D'ENVOI DE QUESTION PAR L'ÉTUDIANT
         ===================================================================== */}
      <form
        onSubmit={handleSubmitQuestion}
        className="sticky bottom-4 z-20 p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl space-y-2"
      >
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-bold flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Poser une question au professeur et à la classe :</span>
          </span>
          <span className="text-[10px] text-slate-400">Visibilité publique pour tous les étudiants</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            required
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ex: Quelle est la différence entre le pattern Saga et 2PC ?"
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition shadow-inner"
          />

          <button
            type="submit"
            disabled={!questionInput.trim()}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95 shrink-0"
          >
            <span>Envoyer</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default VipClassroomQnA;
