import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, X, Send, Sparkles, CheckCircle2, ShieldCheck, 
  MessageSquare, ArrowRight, Loader2, Award, Zap, HelpCircle
} from 'lucide-react';
import { MarketplaceCourse } from './types';
import { askTinnelaTutor, TutorChatMessage } from '../../../../../services/courseTutorAiService';
import { formatCFA, playTapBeep, playValidationBeep, playCashChime } from '../../../../../utils/audio';

export interface TinnelaAiTutorModalProps {
  course: MarketplaceCourse;
  isOpen: boolean;
  onClose: () => void;
  onEnrollClick: () => void;
}

const QUICK_PROMPTS = [
  "🎓 Est-ce adapté aux débutants ?",
  "💳 Comment payer par Wave / Orange Money ?",
  "📜 Le certificat est-il reconnu ?",
  "📱 Est-ce accessible sur smartphone 3G/4G ?",
  "⏱️ Combien d'heures dure la formation ?"
];

export const TinnelaAiTutorModal: React.FC<TinnelaAiTutorModalProps> = ({
  course,
  isOpen,
  onClose,
  onEnrollClick
}) => {
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const effectivePrice = course.discountPrice || course.price;
  const instructor = course.instructor?.name || 'Ibrahim Pousbila Konkobo';

  // Message d'accueil initial ancré sur le cours
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'tutor',
          text: `Bonjour ! Je suis **NaNa AI Tutor**, votre conseiller pédagogique virtuel pour la formation **"${course.title}"** animée par ${instructor}.\n\nAvez-vous une question sur le syllabus, les prérequis ou les modalités de certification avant de vous inscrire ?`,
          timestamp: Date.now()
        }
      ]);
    }
  }, [isOpen, messages.length, course.title, instructor]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    playTapBeep();
    setInputText('');

    const userMsg: TutorChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await askTinnelaTutor(course, text, [...messages, userMsg]);
      playValidationBeep();
      setMessages(prev => [
        ...prev,
        {
          id: `tutor-${Date.now()}`,
          sender: 'tutor',
          text: result.reply,
          timestamp: Date.now()
        }
      ]);
    } catch (err) {
      console.warn('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overscroll-contain">
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="w-full max-w-lg bg-slate-950 border border-emerald-500/30 rounded-t-3xl sm:rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col h-[90vh] max-h-[640px] text-slate-100 relative"
      >
        {/* =========================================================================
            1. EN-TÊTE DE L'ASSISTANT TINNELA IA TUTOR
           ========================================================================= */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shrink-0">
              <div className="w-full h-full bg-[#070b14] rounded-[10px] flex items-center justify-center text-emerald-400">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-white truncate">
                  NaNa AI Tutor
                </h3>
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  En ligne
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[220px]">
                Conseiller Pédagogique • {course.title}
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
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =========================================================================
            2. FLUX DES MESSAGES (CHAT CONVERSATIONNEL IA)
           ========================================================================= */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs shadow-md space-y-2'
                }`}
              >
                {/* Formatage propre des sauts de lignes et du markdown simple */}
                <div className="whitespace-pre-line space-y-1">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-xs p-3 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>NaNa AI rédige sa réponse pédagogique...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* =========================================================================
            3. PUCES DE QUESTIONS RAPIDES (QUICK SUGGESTIONS CHIPS)
           ========================================================================= */}
        <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800/80 overflow-x-auto scrollbar-hide flex items-center gap-1.5 shrink-0 overscroll-contain">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(prompt)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shrink-0 transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* =========================================================================
            4. BARRE DE SAISIE & BOUTON D'ENVOI
           ========================================================================= */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Posez votre question sur le programme..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 transition"
          />

          <button
            type="button"
            disabled={!inputText.trim() || isLoading}
            onClick={() => handleSend()}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-black transition cursor-pointer flex items-center justify-center min-h-[40px] min-w-[40px]"
            title="Envoyer"
          >
            <Send className="w-4 h-4 text-slate-950 fill-slate-950" />
          </button>
        </div>

        {/* =========================================================================
            5. BANDEAU DE CONVERSION PERSISTANT EN BAS DE MODAL
           ========================================================================= */}
        <div className="p-2.5 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-t border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-400 pl-1">
            Tarif : <strong className="text-white font-black">{formatCFA(effectivePrice)}</strong>
          </div>

          <button
            type="button"
            onClick={() => {
              playCashChime();
              onClose();
              onEnrollClick();
            }}
            className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-950/40 hover:from-emerald-400 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>S&apos;inscrire en 1-Clic</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TinnelaAiTutorModal;
