import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Smile, Radio, Flame, Heart } from 'lucide-react';
import {
  LiveEventChatMessage,
  subscribeToLiveChat,
  sendLiveChatMessage
} from '../../../../services/nanasoreLiveSyncService';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface WameetLiveChatOverlayProps {
  liveId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  isHost?: boolean;
  className?: string;
}

const QUICK_EMOJIS = ['👏', '🔥', '❤️', '😍', '⚡', '🎉'];

export const WameetLiveChatOverlay: React.FC<WameetLiveChatOverlayProps> = ({
  liveId,
  currentUserName = 'Spectateur Wameet',
  currentUserAvatar,
  isHost = false,
  className = ''
}) => {
  const [messages, setMessages] = useState<LiveEventChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Abonnement Firestore Temps Réel Absolu (Zéro Délai - Instatanéité Totale)
  useEffect(() => {
    if (!liveId) return;

    const unsubscribe = subscribeToLiveChat(liveId, (newMsgs) => {
      setMessages(newMsgs);
      // Auto-scroll vers le dernier message
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 50);
    });

    return () => unsubscribe();
  }, [liveId]);

  const handleSendMessage = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (directText || inputText).trim();
    if (!textToSend || isSending) return;

    playTapBeep();
    if (!directText) setInputText('');
    setIsSending(true);

    try {
      // Envoi immédiat en base (0ms de délai artificiel)
      await sendLiveChatMessage(liveId, {
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        senderRole: isHost ? 'host' : 'viewer',
        text: textToSend
      });
    } catch (err) {
      console.warn('[WAMEET LIVE CHAT] Erreur envoi message direct :', err);
    } finally {
      setIsSending(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  };

  const handleSendEmoji = (emoji: string) => {
    playValidationBeep();
    handleSendMessage(undefined, emoji);
  };

  return (
    <div
      role="region"
      aria-label="Chat en Direct Wameet"
      className={`flex flex-col justify-end max-w-[340px] sm:max-w-[380px] pointer-events-auto ${className}`}
    >
      {/* ============================================================== */}
      {/* 1. FLUX DES MESSAGES DÉFILANTS (GLASSMORPHISM SEMI-TRANSPARENT) */}
      {/* ============================================================== */}
      <div
        ref={scrollContainerRef}
        className="max-h-[180px] sm:max-h-[220px] overflow-y-auto space-y-2 pr-1 select-text scroll-smooth"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)'
        }}
      >
        {messages.map((msg) => {
          const isSenderHost = msg.senderRole === 'host';
          return (
            <div
              key={msg.id}
              className={`inline-flex items-start gap-2 p-2 rounded-2xl text-xs backdrop-blur-md border max-w-full leading-snug animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                isSenderHost
                  ? 'bg-amber-950/70 border-amber-500/40 text-amber-100 shadow-md shadow-amber-950/40'
                  : 'bg-black/50 border-white/15 text-slate-100 shadow-md shadow-black/50'
              }`}
            >
              {/* Avatar ou Initiale */}
              {msg.senderAvatar ? (
                <img
                  src={msg.senderAvatar}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-white/30"
                />
              ) : (
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isSenderHost ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'
                  }`}
                >
                  {msg.senderName.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Contenu du message */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`font-black text-[11px] truncate ${
                      isSenderHost ? 'text-amber-300' : 'text-blue-300'
                    }`}
                  >
                    {msg.senderName}
                  </span>

                  {isSenderHost && (
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-tight">
                      Vendeur
                    </span>
                  )}
                </div>

                <p className="text-white text-[11.5px] font-medium break-words mt-0.5">
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 2. BARRE D'ÉMOTICÔNES EXPRESS                                  */}
      {/* ============================================================== */}
      <div className="flex items-center gap-1.5 py-1.5 overflow-x-auto no-scrollbar">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleSendEmoji(emoji)}
            className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-sm flex items-center justify-center transition active:scale-125 cursor-pointer backdrop-blur-md shrink-0"
            title={`Envoyer ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* 3. BARRE DE SAISIE COMPACTE (TEMPS RÉEL SANS LATENCE)          */}
      {/* ============================================================== */}
      <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2 mt-0.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Posez une question en direct..."
            className="w-full pl-3.5 pr-8 py-2 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-8 h-8 rounded-full bg-[#2563EB] hover:bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition active:scale-90 cursor-pointer disabled:opacity-40 disabled:scale-100 shrink-0"
          title="Envoyer instantanément (0 délai)"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

export default WameetLiveChatOverlay;
