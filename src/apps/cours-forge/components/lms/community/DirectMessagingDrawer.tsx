import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Send, 
  User, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  CheckCheck, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { DirectMessage } from '../../../../../types/community';
import { subscribeToDirectMessages, sendDirectMessage } from '../../../../../services/communityService';

interface DirectMessagingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  targetUserId: string | null;
  targetUserName?: string;
  targetUserAvatar?: string;
  targetUserRole?: 'STUDENT' | 'INSTRUCTOR';
}

export const DirectMessagingDrawer: React.FC<DirectMessagingDrawerProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  targetUserId,
  targetUserName = 'Apprenant NaNa',
  targetUserAvatar,
  targetUserRole = 'STUDENT'
}) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on message updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !targetUserId || !currentUserId) return;

    // Real-time Firestore subscription to direct messages between these two users
    const unsubscribe = subscribeToDirectMessages(
      currentUserId,
      targetUserId,
      (newMessages) => {
        setMessages(newMessages);
        setTimeout(scrollToBottom, 100);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, currentUserId, targetUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !targetUserId || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await sendDirectMessage(
        currentUserId,
        targetUserId,
        messageText,
        currentUserName,
        targetUserName,
        currentUserAvatar
      );
      scrollToBottom();
    } catch (err) {
      console.error('Erreur envoi message direct:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Drawer Container */}
      <div 
        className="w-full max-w-md h-full bg-slate-900/95 border-l border-slate-700/80 shadow-2xl flex flex-col justify-between text-slate-100 animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={targetUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={targetUserName}
                className="w-10 h-10 rounded-xl object-cover border-2 border-slate-800"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white truncate max-w-[180px]">
                  {targetUserName}
                </h4>
                {targetUserRole === 'INSTRUCTOR' ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Formateur
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Apprenant
                  </span>
                )}
              </div>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En ligne sur le Social Campus
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer le chat"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security / Encryption Notice */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>Messagerie sécurisée chiffrée de bout en bout de l'écosystème NaNa.</span>
        </div>

        {/* Scrollable Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto overscroll-contain space-y-3 touch-pan-y custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-6">
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 mb-3 text-emerald-400">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="text-xs font-bold text-white mb-1">Démarrez votre échange</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Posez vos questions ou échangez sur les exercices et devoirs directement avec {targetUserName}.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400 px-1">
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <CheckCheck className={`w-3 h-3 ${msg.read ? 'text-emerald-400' : 'text-slate-500'}`} />
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Écrivez un message direct..."
              disabled={isSending}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold disabled:opacity-40 transition-transform active:scale-95 flex items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DirectMessagingDrawer;
