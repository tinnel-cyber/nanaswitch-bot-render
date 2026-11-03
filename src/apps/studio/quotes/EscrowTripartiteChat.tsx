import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EscrowChatMessage, EscrowSenderRole } from '../../../types';
import { 
  subscribeToEscrowMessages, 
  sendEscrowChatMessage 
} from '../../../services/escrowService';
import { compressImageToBase64 } from '../../../utils/imageCompressor';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { 
  Send, 
  Paperclip, 
  ShieldAlert, 
  ShieldCheck, 
  Image as ImageIcon, 
  Check, 
  Clock, 
  X, 
  User, 
  Briefcase, 
  Lock,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface EscrowTripartiteChatProps {
  projectId: string;
  storeId: string;
  currentUserRole: EscrowSenderRole; // 'CLIENT' | 'MERCHANT' | 'SUPER_ADMIN'
  currentUserName: string;
  currentUserId?: string;
  isDisputed?: boolean;
  disputeReason?: string;
  onClose?: () => void;
  compact?: boolean;
}

export const EscrowTripartiteChat: React.FC<EscrowTripartiteChatProps> = ({
  projectId,
  storeId,
  currentUserRole,
  currentUserName,
  currentUserId,
  isDisputed = false,
  disputeReason,
  onClose,
  compact = false,
}) => {
  const [messages, setMessages] = useState<EscrowChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Abonnement temps réel avec nettoyage
  useEffect(() => {
    const unsubscribe = subscribeToEscrowMessages(projectId, (data) => {
      setMessages(data);
    });
    return () => unsubscribe();
  }, [projectId]);

  // Défilement automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Upload d'image avec compression automatique Canvas < 500 Ko
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapBeep();
    setIsCompressingImage(true);
    try {
      // Compression Canvas max 600x600, qualité 0.72 -> taille ~40-90 Ko
      const base64 = await compressImageToBase64(file, 600, 600, 0.72);
      setAttachedImage(base64);
      playValidationBeep();
    } catch (err) {
      console.warn('Erreur compression image chat :', err);
    } finally {
      setIsCompressingImage(false);
    }
  };

  // Envoi du message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || isSending) return;

    playTapBeep();
    setIsSending(true);

    try {
      await sendEscrowChatMessage(projectId, storeId, {
        projectId,
        senderRole: currentUserRole,
        senderName: currentUserName,
        senderId: currentUserId,
        message: inputText.trim(),
        attachmentUrl: attachedImage || undefined,
      });

      setInputText('');
      setAttachedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      playValidationBeep();
    } catch (err) {
      console.warn('Erreur envoi message chat :', err);
    } finally {
      setIsSending(false);
    }
  };

  // Badge du rôle de l'émetteur
  const renderSenderBadge = (role: EscrowSenderRole) => {
    switch (role) {
      case 'CLIENT':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
            [Client]
          </span>
        );
      case 'MERCHANT':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            [Prestataire]
          </span>
        );
      case 'SUPER_ADMIN':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
            <ShieldAlert className="w-2.5 h-2.5" />
            [Médiateur / Support Super Admin]
          </span>
        );
      case 'SYSTEM':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-700 text-slate-300 border border-slate-600">
            [Système]
          </span>
        );
    }
  };

  return (
    <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden ${
      compact ? 'h-[420px]' : 'h-[520px]'
    }`}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Chat Header */}
      <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-white">Messagerie Tripartite en Direct</h4>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Connecté en direct" />
            </div>
            <p className="text-[10px] text-slate-400">
              Échanges sécurisés entre Client, Prestataire et Médiation Super Admin
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Alerte Litige / Gel si actif */}
      {isDisputed && (
        <div className="bg-amber-950/70 border-b border-amber-500/40 px-3 py-2 flex items-start gap-2 text-xs text-amber-200 animate-pulse">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Arbitrage en cours par la Médiation Super Admin</span>
            <span className="text-[10.5px] text-amber-300/80">
              {disputeReason ? `Motif : ${disputeReason}` : 'Les déblocages de fonds sont suspendus pendant l\'examen.'}
            </span>
          </div>
        </div>
      )}

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-1 py-8">
            <MessageSquare className="w-8 h-8 opacity-30 mx-auto mb-1" />
            <p className="font-bold text-slate-400">Aucun message pour l'instant</p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Posez vos questions, envoyez des captures d'écran de validation ou demandez l'avis du médiateur.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === currentUserRole;
            const isSystem = msg.senderRole === 'SYSTEM';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="max-w-md bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-1.5 text-center text-[10.5px] text-amber-200 shadow-md">
                    <div className="font-bold flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                      <ShieldAlert className="w-3 h-3" />
                      <span>{msg.senderName}</span>
                    </div>
                    <p className="leading-snug">{msg.message}</p>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-300">{msg.senderName}</span>
                  {renderSenderBadge(msg.senderRole)}
                  <span className="text-[9px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 space-y-1.5 shadow-md ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : msg.senderRole === 'SUPER_ADMIN'
                      ? 'bg-amber-950/80 border border-amber-500/40 text-amber-100 rounded-tl-xs'
                      : 'bg-slate-800 text-slate-200 rounded-tl-xs border border-slate-700/60'
                  }`}
                >
                  {msg.message && (
                    <p className="leading-relaxed whitespace-pre-wrap break-words text-xs">
                      {msg.message}
                    </p>
                  )}

                  {msg.attachmentUrl && (
                    <div 
                      onClick={() => setPreviewImage(msg.attachmentUrl || null)}
                      className="rounded-xl overflow-hidden border border-white/20 max-w-[220px] max-h-[160px] cursor-pointer hover:opacity-90 transition relative group"
                    >
                      <img
                        src={msg.attachmentUrl}
                        alt="Pièce jointe"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-bold transition">
                        Agrandir
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview attachment draft */}
      {attachedImage && (
        <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-indigo-500/50">
              <img src={attachedImage} alt="Capture" className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] text-slate-300 font-semibold">Capture prête à envoyer (&lt; 500 Ko)</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isCompressingImage}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
          title="Joindre une capture ou fichier (< 500 Ko)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isCompressingImage 
              ? 'Compression image en cours...' 
              : 'Écrivez votre message en direct...'
          }
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={(!inputText.trim() && !attachedImage) || isSending}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition cursor-pointer shrink-0 shadow-md"
          title="Envoyer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Modal Image Zoom */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[90vh]">
            <img src={previewImage} alt="Capture plein écran" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscrowTripartiteChat;
