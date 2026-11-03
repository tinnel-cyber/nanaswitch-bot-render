import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Users,
  Gift,
  Sparkles,
  RotateCcw,
  Send,
  MessageCircle,
  MoreVertical,
  CheckCheck,
  ShieldCheck,
  Smile,
  Mic,
  Image as ImageIcon
} from 'lucide-react';
import type { CagnotteGroupState, NaNaPosGiftItem } from '../../../../../types/cagnotte';
import { PinnedCagnotteBanner } from './PinnedCagnotteBanner';
import { CagnotteHeaderTracker } from './CagnotteHeaderTracker';
import { ContributeCagnotteModal } from './ContributeCagnotteModal';
import { CreateCagnotteModal } from './CreateCagnotteModal';
import { CagnotteCelebrationOverlay } from './CagnotteCelebrationOverlay';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../../utils/audio';

export interface CagnotteGroupDemoScreenProps {
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isMe?: boolean;
  isSystem?: boolean;
  systemTag?: string;
}

export const CagnotteGroupDemoScreen: React.FC<CagnotteGroupDemoScreenProps> = ({ onClose }) => {
  const [cagnotte, setCagnotte] = useState<CagnotteGroupState | null>(null);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [useGlassTracker, setUseGlassTracker] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      senderName: 'Moussa Traoré (Organisateur)',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      text: "Salut la famille ! Pour l'anniversaire de Sarah samedi, j'ai configuré la Cagnotte Phygitale Wameet directement sur l'iPhone 15 Pro Max chez iStore Ouaga 2000.",
      timestamp: '10:14'
    },
    {
      id: 'm2',
      senderName: 'Fatou K.',
      senderAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
      text: 'Excellente idée ! Fini les collectes sur des comptes privés où on ne sait jamais où va l’argent. Tout est transparent et va direct au magasin !',
      timestamp: '10:18'
    },
    {
      id: 'm3',
      senderName: 'Wameet Smart Contract',
      senderAvatar: '',
      text: '🎁 Fatou K. a contribué +75 000 FCFA via Wave !',
      timestamp: '10:20',
      isSystem: true,
      systemTag: 'CONTRIBUTION'
    },
    {
      id: 'm4',
      senderName: 'Tonton Boureima',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      text: 'Je viens de mettre 100 000 FCFA avec Orange Money. Que Dieu bénisse notre petite Sarah pour ses 25 ans ! 🙏🏽✨',
      timestamp: '11:05'
    },
    {
      id: 'm5',
      senderName: 'Aminata Diallo',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      text: 'On approche du but les amis ! Qui peut mettre la dernière part pour débloquer le contrat intelligent ?',
      timestamp: '12:30'
    }
  ]);

  // Chargement de l'état initial depuis le backend
  const fetchCagnotteState = async () => {
    try {
      const res = await fetch('/api/cagnotte/group/group_anniv_sarah');
      const data = await res.json();
      if (data.success && data.cagnotte) {
        setCagnotte(data.cagnotte);
      }
    } catch (e) {
      console.warn('Erreur fetch cagnotte:', e);
    }
  };

  useEffect(() => {
    fetchCagnotteState();

    // Polling doux ou écoute WS pour synchronisation
    const interval = setInterval(fetchCagnotteState, 6000);
    return () => clearInterval(interval);
  }, []);

  // Déclenché lorsqu'une contribution réussit
  const handleContributeSuccess = (amount: number, contributorName: string, note: string) => {
    playValidationBeep();

    // Ajoute un message système dans le chat
    const newSysMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      senderName: 'Wameet Smart Contract',
      senderAvatar: '',
      text: `🎁 ${contributorName} a contribué +${amount.toLocaleString('fr-FR')} FCFA à la cagnotte ! "${note}"`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
      systemTag: 'CONTRIBUTION'
    };

    setChatMessages((prev) => [...prev, newSysMsg]);
    fetchCagnotteState();
  };

  // Simule le passage instantané à 100% (Exécution du Contrat Intelligent)
  const handleCompleteTo100 = async () => {
    playTapBeep();
    try {
      const res = await fetch('/api/cagnotte/simulate-contribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cagnotteId: cagnotte?.id || 'cagnotte_anniv_sarah_2026',
          contributorName: 'Ali & Les Amis de Ouaga',
          autoCompleteTo100: true,
          note: 'Et voilà les 100% ! Vive la reine de la fête ! 🎂🚀'
        })
      });

      const data = await res.json();
      if (data.success) {
        playCashChime();
        setIsCelebrationOpen(true);

        const newSysMsg: ChatMessage = {
          id: `sys_100_${Date.now()}`,
          senderName: 'Wameet Smart Contract',
          senderAvatar: '',
          text: `🚀 CONTRAT INTELLIGENT EXÉCUTÉ ! ${cagnotte?.targetAmount.toLocaleString('fr-FR')} FCFA transférés directement à ${cagnotte?.gift.merchantName}. Le cadeau est commandé et sera livré à l'heure de la fête !`,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          isSystem: true,
          systemTag: 'SMART_CONTRACT_100'
        };

        setChatMessages((prev) => [...prev, newSysMsg]);
        fetchCagnotteState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Réinitialiser la démo
  const handleResetDemo = async () => {
    playTapBeep();
    try {
      const res = await fetch('/api/cagnotte/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCagnotte(data.cagnotte);
        setIsCelebrationOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Envoi d'un message textuel dans le chat de groupe
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    playTapBeep();
    const newMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      senderName: 'Moi',
      senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white relative overflow-hidden">
      {/* 1. Header du Groupe Wameet */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onClose();
              }}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500/50 bg-slate-800">
              <img
                src={cagnotte?.beneficiaryAvatar || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100'}
                alt="Sarah"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 text-xs">🎂</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                {cagnotte?.groupName || 'Anniversaire de Sarah 🎂'}
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Mode Cagnotte Actif
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-500" />
              <span>14 membres • Fête : {cagnotte?.eventDate || 'Samedi 24 à 19h30'}</span>
            </p>
          </div>
        </div>

        {/* Boutons d'Action Rapide de Démo */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleResetDemo}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition cursor-pointer"
            title="Réinitialiser la démo à 65%"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Jauge Visuelle Épinglée (Prompt 20 : Smart Cagnotte Tracker Sticky Header) */}
      {cagnotte && (
        useGlassTracker ? (
          <CagnotteHeaderTracker
            targetAmount={cagnotte.targetAmount}
            currentAmount={cagnotte.collectedAmount}
            productImage={cagnotte.gift.imageUrl}
            productName={cagnotte.gift.name}
            beneficiaryName={cagnotte.beneficiaryName.split(' ')[0] || 'Sarah'}
            onOpenContribute={() => setIsContributeOpen(true)}
            onOpenActionMenu={() => setIsContributeOpen(true)}
          />
        ) : (
          <PinnedCagnotteBanner
            cagnotte={cagnotte}
            onOpenContribute={() => setIsContributeOpen(true)}
            onOpenChangeGift={() => setIsCreateOpen(true)}
            onOpenCelebration={() => setIsCelebrationOpen(true)}
          />
        )
      )}

      {/* Barre d'outils de Démonstration Rapide */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Actions Démo :
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle Style Prompt 20 Glassmorphism vs Bannière Complète */}
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setUseGlassTracker(!useGlassTracker);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-bold border border-violet-500/40 cursor-pointer transition text-[11px] flex items-center gap-1"
            title="Basculer entre le Tracker Glassmorphism (Prompt 20) et la Bannière Détaillée"
          >
            {useGlassTracker ? '🎨 Tracker Glass (P20)' : '📋 Bannière Détaillée'}
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsContributeOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 cursor-pointer transition text-[11px] flex items-center gap-1"
          >
            <Gift className="w-3 h-3" /> Contribuer
          </button>

          <button
            type="button"
            onClick={handleCompleteTo100}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black cursor-pointer transition text-[11px] flex items-center gap-1 shadow-sm"
          >
            <span>🚀 Booster à 100% (Smart Contract)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setIsCreateOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition text-[11px]"
          >
            Changer Cadeau NaNa POS
          </button>
        </div>
      </div>

      {/* 3. Fil de Discussion du Groupe Wameet */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
        {chatMessages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div
                  className={`px-3 py-1.5 rounded-2xl text-xs max-w-md text-center border shadow-xs ${
                    msg.systemTag === 'SMART_CONTRACT_100'
                      ? 'bg-gradient-to-r from-emerald-950 to-teal-950 text-emerald-300 border-emerald-500/50 font-bold animate-pulse'
                      : 'bg-slate-900/90 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <span>{msg.text}</span>
                  <div className="text-[9px] text-slate-400 mt-0.5">{msg.timestamp}</div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!msg.isMe && (
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderName}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-slate-700"
                />
              )}

              <div
                className={`max-w-[80%] sm:max-w-md rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                  msg.isMe
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {!msg.isMe && (
                  <div className="font-bold text-emerald-400 text-[11px] mb-0.5">
                    {msg.senderName}
                  </div>
                )}
                <p>{msg.text}</p>
                <div
                  className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                    msg.isMe ? 'text-emerald-200' : 'text-slate-500'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.isMe && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Barre de Saisie du Message de Chat */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0"
      >
        <div className="flex-1 bg-slate-950 border border-slate-700/80 rounded-2xl px-3 py-2 flex items-center gap-2 focus-within:border-emerald-500 transition">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Écrire dans le groupe Anniversaire..."
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-hidden"
          />
        </div>

        <button
          type="submit"
          className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Modals & Overlays */}
      {cagnotte && (
        <>
          <ContributeCagnotteModal
            isOpen={isContributeOpen}
            onClose={() => setIsContributeOpen(false)}
            cagnotte={cagnotte}
            onContributeSuccess={handleContributeSuccess}
          />

          <CreateCagnotteModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            currentGiftId={cagnotte.gift.id}
            onSelectGift={(newGift, newDate, newLoc) => {
              setCagnotte((prev) =>
                prev
                  ? {
                      ...prev,
                      gift: newGift,
                      targetAmount: newGift.price,
                      progressPercentage: Math.min(
                        100,
                        Math.round((prev.collectedAmount / newGift.price) * 100)
                      ),
                      eventDate: newDate,
                      eventLocation: newLoc
                    }
                  : null
              );
            }}
          />

          <CagnotteCelebrationOverlay
            isOpen={isCelebrationOpen}
            onClose={() => setIsCelebrationOpen(false)}
            cagnotte={cagnotte}
          />
        </>
      )}
    </div>
  );
};

export default CagnotteGroupDemoScreen;
