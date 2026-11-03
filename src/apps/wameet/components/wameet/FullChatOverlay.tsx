import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  ShoppingBag,
  CheckCheck,
  ChevronLeft,
  Flame,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export interface FullChatOverlayCreatorInfo {
  name: string;
  handle: string;
  avatarUrl: string;
  isOnline?: boolean;
  statusBadge?: string;
  sellerShopName?: string;
}

export interface FullChatOverlayMessage {
  id: string;
  senderHandle: string;
  senderName: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
}

export interface FullChatOverlayProps {
  /** État d'ouverture de l'overlay */
  isOpen: boolean;
  /** Callback de fermeture */
  onClose: () => void;
  /** Informations sur le créateur ou la boutique du Reel */
  creator: FullChatOverlayCreatorInfo;
  /** Contexte optionnel du Reel actuel (titre, produit, etc.) */
  reelContextTitle?: string;
  /** Callback personnalisé lors de l'envoi d'un message */
  onSendMessage?: (text: string) => void;
  /** Profil de l'utilisateur courant */
  currentUser?: {
    name: string;
    handle: string;
    avatarUrl: string;
  };
  /** Classes CSS supplémentaires */
  className?: string;
}

const DEFAULT_URGENT_PRESETS = [
  '🛵 Quel est le délai de livraison ?',
  '🔥 Est-ce disponible immédiatement ?',
  '💳 Paiement Mobile Money accepté ?',
  '📍 Où se trouve votre boutique physique ?'
];

/**
 * PROMPT 4 - Option 2 : FullChatOverlay
 * L'Ouverture Totale du Chat en Plein Écran Flouté (Wameet Reels)
 * 
 * Directives UI/UX au millimètre :
 * - Transition fluide : Volet latéral glissant depuis la droite (motion translate-x-full -> translate-x-0)
 * - Design : Chat haut de gamme en écran complet avec floutage élevé du Reel à l'arrière-plan
 *   (backdrop-blur-2xl bg-black/40) pour ne pas couper brutalement la session de visionnage.
 * - Suggestions rapides pour les questions urgentes
 * - Saisie temps réel avec micro-actions et retour haptique sonore
 */
export const FullChatOverlay: React.FC<FullChatOverlayProps> = ({
  isOpen,
  onClose,
  creator,
  reelContextTitle,
  onSendMessage,
  currentUser = {
    name: 'Moi',
    handle: '@moi.wameet',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  },
  className = ''
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<FullChatOverlayMessage[]>([
    {
      id: 'msg-welcome-1',
      senderHandle: creator.handle,
      senderName: creator.name,
      text: `Bonjour ! Bienvenue sur le chat direct de ${creator.name}. Vous avez une question urgente sur ce Reel ? Je vous réponds immédiatement ! ⚡`,
      timestamp: "À l'instant",
      isOwn: false
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const content = (presetText || inputText).trim();
    if (!content) return;

    playValidationBeep();

    const newMsg: FullChatOverlayMessage = {
      id: `msg-${Date.now()}`,
      senderHandle: currentUser.handle,
      senderName: currentUser.name,
      text: content,
      timestamp: 'À l’instant',
      isOwn: true
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    onSendMessage?.(content);

    // Simulation de réponse automatique ultra-rapide (Pont Wameet W Direct)
    setTimeout(() => {
      const replyMsg: FullChatOverlayMessage = {
        id: `reply-${Date.now()}`,
        senderHandle: creator.handle,
        senderName: creator.name,
        text: `Merci pour votre message ! Notre équipe à Ouagadougou vient de recevoir votre demande : "${content}". Nous préparons votre réponse immédiate 🚀`,
        timestamp: 'À l’instant',
        isOwn: false
      };
      setMessages(prev => [...prev, replyMsg]);
      playValidationBeep();
    }, 1200);
  };

  const handleClose = () => {
    playTapBeep();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`fixed inset-0 z-50 flex justify-end select-none ${className}`}
        >
          {/* 1. Backdrop avec floutage élevé du Reel en arrière-plan sans couper la session */}
          <div
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-2xl transition-all"
          />

          {/* 2. Volet latéral glissant depuis la droite (translate-x-full -> translate-x-0) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md h-full bg-slate-950/85 backdrop-blur-2xl border-l border-white/15 shadow-2xl flex flex-col overflow-hidden text-white z-10"
          >
            {/* EN-TÊTE HAUT DE GAMME */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Fermer le chat"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Avatar du créateur + Badge en ligne */}
                <div className="relative">
                  <img
                    src={creator.avatarUrl}
                    alt={creator.name}
                    className="w-10 h-10 rounded-full object-cover border border-blue-500 ring-2 ring-white/20"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-sm" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {creator.name}
                    </h3>
                    <span className="text-[10px] text-blue-400 font-semibold">
                      {creator.handle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>En direct sur Wameet • Réponse en &lt; 2 min</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Fermer"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* BANDEAU CONTEXTE REEL (SI PRÉSENT) */}
            {reelContextTitle && (
              <div className="px-4 py-2 bg-blue-600/20 border-b border-blue-500/20 flex items-center justify-between text-xs text-blue-200 shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold text-white truncate">
                    Reel : {reelContextTitle}
                  </span>
                </div>
                <span className="text-[10px] text-blue-300 font-bold shrink-0">
                  Chat Lié
                </span>
              </div>
            )}

            {/* LISTE DES MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-md backdrop-blur-md ${
                      msg.isOwn
                        ? 'bg-blue-600 text-white rounded-br-xs border border-blue-400/30'
                        : 'bg-white/10 text-white rounded-bl-xs border border-white/15'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div
                      className={`text-[9px] mt-1 flex items-center gap-1 ${
                        msg.isOwn ? 'text-blue-200 justify-end' : 'text-white/60 justify-start'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {msg.isOwn && <CheckCheck className="w-3 h-3 text-blue-200" />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* SUGGESTIONS RAPIDES : QUESTIONS URGENTES */}
            <div className="px-3 pt-2 pb-1 border-t border-white/10 bg-white/5 shrink-0">
              <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Questions urgentes suggérées :</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {DEFAULT_URGENT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(undefined, preset)}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-blue-600/40 border border-white/15 hover:border-blue-400/50 text-[10px] font-medium text-white/90 whitespace-nowrap transition cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
                  >
                    <span>{preset}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-white/60" />
                  </button>
                ))}
              </div>
            </div>

            {/* BARRE DE SAISIE INFERIEURE */}
            <form
              onSubmit={e => handleSend(e)}
              className="p-3 border-t border-white/10 bg-slate-950/90 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Poser une question urgente..."
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white/10 border border-white/20 focus:border-blue-500 text-xs text-white placeholder-white/50 focus:outline-none transition"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg shadow-blue-600/40 shrink-0"
                title="Envoyer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullChatOverlay;
