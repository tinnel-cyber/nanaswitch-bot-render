import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Paperclip,
  Send,
  Smile,
  Mic,
  ShieldCheck,
  Banknote,
  Gift,
  PieChart,
  Radio,
  X,
  Sparkles,
  ShoppingBag,
  Image as ImageIcon
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

export type SmartActionType =
  | 'escrow'
  | 'farotage'
  | 'gift'
  | 'pool'
  | 'live'
  | 'product'
  | 'photo';

export interface SmartActionItem {
  id: SmartActionType;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconColor: string;
  bgCircle: string;
  borderCircle: string;
  hoverBg: string;
  description?: string;
}

export interface WameetMessageInputProps {
  onSendMessage?: (text: string) => void;
  onActionSelect?: (actionId: SmartActionType) => void;
  onVoiceRecordStart?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

// ----------------------------------------------------------------------------
// LISTE DES ACTIONS DU SMART ACTION MENU (COMMERCIALES & SOCIALES WAMEET)
// ----------------------------------------------------------------------------
export const SMART_ACTIONS: SmartActionItem[] = [
  {
    id: 'escrow',
    label: 'Escrow',
    icon: ShieldCheck,
    iconColor: 'text-blue-600',
    bgCircle: 'bg-blue-50/80',
    borderCircle: 'border-blue-100/50',
    hoverBg: 'group-hover:bg-blue-100',
    description: 'Paiement Sécurisé'
  },
  {
    id: 'farotage',
    label: 'Farotage',
    icon: Banknote,
    iconColor: 'text-emerald-600',
    bgCircle: 'bg-emerald-50/80',
    borderCircle: 'border-emerald-100/50',
    hoverBg: 'group-hover:bg-emerald-100',
    description: 'Pourboire en Direct'
  },
  {
    id: 'gift',
    label: 'Cadeau',
    icon: Gift,
    iconColor: 'text-rose-600',
    bgCircle: 'bg-rose-50/80',
    borderCircle: 'border-rose-100/50',
    hoverBg: 'group-hover:bg-rose-100',
    description: 'Cadeau Mystère'
  },
  {
    id: 'pool',
    label: 'Cagnotte',
    icon: PieChart,
    iconColor: 'text-purple-600',
    bgCircle: 'bg-purple-50/80',
    borderCircle: 'border-purple-100/50',
    hoverBg: 'group-hover:bg-purple-100',
    description: 'Cotisation de groupe'
  },
  {
    id: 'live',
    label: 'Live',
    icon: Radio,
    iconColor: 'text-rose-600',
    bgCircle: 'bg-red-50/80',
    borderCircle: 'border-red-100/50',
    hoverBg: 'group-hover:bg-red-100',
    description: 'Live Shopping Flash'
  }
];

export const WameetMessageInput: React.FC<WameetMessageInputProps> = ({
  onSendMessage,
  onActionSelect,
  onVoiceRecordStart,
  placeholder = 'Message...',
  disabled = false,
  className = '',
  autoFocus = false
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fermer le menu lors d'un clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Bascule d'ouverture du menu avec son haptique
  const toggleMenu = () => {
    try {
      playTapBeep();
    } catch {}
    setIsMenuOpen(prev => !prev);
  };

  const handleActionClick = (actionId: SmartActionType) => {
    try {
      playValidationBeep();
    } catch {}
    setIsMenuOpen(false);
    if (onActionSelect) {
      onActionSelect(actionId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || disabled) return;

    try {
      playTapBeep();
    } catch {}

    if (onSendMessage) {
      onSendMessage(trimmed);
    }
    setInputText('');
    setIsMenuOpen(false);
  };

  const hasText = inputText.trim().length > 0;

  return (
    <div
      ref={menuRef}
      className={`relative w-full bg-white border-t border-slate-100 p-2.5 sm:p-3 font-sans ${className}`}
    >
      {/* =====================================================================
          1. SMART ACTION MENU (DÉROULANT EN VERRE DÉPOLI - GLASSMORPHISM)
             S'ouvre au-dessus de la barre de saisie avec animation douce
         ===================================================================== */}
      {isMenuOpen && (
        <div
          role="menu"
          aria-label="Menu d'actions intelligentes"
          className="absolute bottom-full left-3 right-3 sm:left-4 sm:right-4 mb-2.5 z-40 bg-white/85 backdrop-blur-md border border-gray-100 shadow-xl rounded-2xl p-4 transition-all duration-200 ease-out animate-in slide-in-from-bottom-3 fade-in"
        >
          {/* En-tête discret du menu */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#0084FF]" />
              <span>Actions Wameet</span>
            </span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Fermer"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grille 4 colonnes sur mobile, 5 sur écran large */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3.5 sm:gap-4 justify-items-center">
            {SMART_ACTIONS.map(action => {
              const IconComp = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleActionClick(action.id)}
                  className="flex flex-col items-center gap-1.5 group transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
                >
                  <div
                    className={`w-12 h-12 rounded-full ${action.bgCircle} flex items-center justify-center border ${action.borderCircle} ${action.hoverBg} transition-colors shadow-2xs`}
                  >
                    <IconComp className={`w-5 h-5 ${action.iconColor}`} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] text-gray-600 font-medium tracking-wide text-center">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          2. BARRE DE SAISIE MINIMALISTE (MESSAGE INPUT)
             Déclencheur (+) | Champ texte épuré | Micro / Envoi dynamique
         ===================================================================== */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Le Déclencheur : Bouton d'attachement stylisé (Plus / Paperclip) */}
        <button
          type="button"
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-label="Actions rapides"
          className={`p-2.5 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all duration-200 cursor-pointer shrink-0 focus:outline-none ${
            isMenuOpen
              ? 'bg-blue-50 text-[#0084FF] rotate-45'
              : 'bg-slate-100/80 text-slate-600'
          }`}
          title="Ajouter une action (Escrow, Farotage, Cadeau...)"
        >
          <Plus className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* Champ de texte minimaliste */}
        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            disabled={disabled}
            onChange={e => setInputText(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 border border-transparent focus:border-[#0084FF]/30 focus:ring-4 focus:ring-[#0084FF]/10 transition-all duration-200 outline-none"
          />

          {/* Bouton Smiley discret incrusté dans le champ */}
          <button
            type="button"
            onClick={() => setInputText(prev => prev + ' 😊')}
            className="absolute right-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            title="Ajouter un emoji"
            aria-label="Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        {/* Bouton d'action à droite : Micro (si vide) ou Envoyer (si texte présent) */}
        {hasText ? (
          <button
            type="submit"
            disabled={disabled}
            className="p-2.5 rounded-full bg-[#0084FF] hover:bg-blue-600 active:scale-90 text-white shadow-md shadow-blue-500/25 transition-all duration-150 cursor-pointer shrink-0"
            title="Envoyer"
            aria-label="Envoyer"
          >
            <Send className="w-4 h-4 fill-white stroke-none" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              try {
                playTapBeep();
              } catch {}
              if (onVoiceRecordStart) onVoiceRecordStart();
            }}
            className="p-2.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 active:scale-90 text-slate-600 hover:text-slate-800 transition-all duration-150 cursor-pointer shrink-0"
            title="Note vocale"
            aria-label="Enregistrer une note vocale"
          >
            <Mic className="w-4 h-4 stroke-[2]" />
          </button>
        )}
      </form>
    </div>
  );
};

export default WameetMessageInput;
