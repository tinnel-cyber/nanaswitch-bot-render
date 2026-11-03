import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Banknote,
  Gift,
  PieChart,
  Sparkles,
  Check,
  CheckCheck,
  ArrowRight,
  Lock,
  Heart,
  PartyPopper
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { LockedGiftBubble } from './LockedGiftBubble';

export type SmartTransactionType = 'escrow' | 'farotage' | 'gift' | 'cagnotte' | 'pool';

export interface SmartTransactionData {
  title?: string;
  amount?: number | string;
  currency?: string; // Par défaut 'FCFA'
  status?: 'pending' | 'locked' | 'released' | 'completed' | 'active' | string;
  senderName?: string;
  recipientName?: string;
  message?: string;
  currentAmount?: number; // Pour la cagnotte
  targetAmount?: number;  // Pour la cagnotte
  isOpened?: boolean;     // Pour le cadeau mystère
  timestamp?: string;
  transactionId?: string;
  [key: string]: any;
}

export interface SmartTransactionBubbleProps {
  type: SmartTransactionType;
  data: SmartTransactionData;
  isMe?: boolean;
  onActionClick?: (type: SmartTransactionType, data: SmartTransactionData) => void;
  className?: string;
}

/**
 * Formate un montant en devise avec séparateur de milliers
 */
export function formatBubbleAmount(amount?: number | string, currency = 'FCFA'): string {
  if (amount == null || amount === '') return `0 ${currency}`;
  const num = typeof amount === 'number' ? amount : Number(amount.toString().replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return `${amount} ${currency}`;
  return `${num.toLocaleString('fr-FR')} ${currency}`;
}

/**
 * COMPOSANT SmartTransactionBubble (Wameet CRM & Actions Intelligentes)
 * Affiche les micro-cartes interactives pour Escrow, Farotage, Cadeau et Cagnotte
 * avec bordures arrondies asymétriques selon l'expéditeur.
 */
export const SmartTransactionBubble: React.FC<SmartTransactionBubbleProps> = ({
  type,
  data,
  isMe = false,
  onActionClick,
  className = ''
}) => {
  const [isGiftUnwrapped, setIsGiftUnwrapped] = useState<boolean>(Boolean(data.isOpened));

  // Normalisation du type (alias cagnotte / pool)
  const normalizedType = type === 'pool' ? 'cagnotte' : type;

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      playValidationBeep();
    } catch {}

    if (normalizedType === 'gift' && !isGiftUnwrapped) {
      setIsGiftUnwrapped(true);
    }

    if (onActionClick) {
      onActionClick(normalizedType, data);
    }
  };

  // --------------------------------------------------------------------------
  // DESIGN SYSTEM : BORDURES ASYMÉTRIQUES SELON L'EXPÉDITEUR
  // --------------------------------------------------------------------------
  const bubbleCorners = isMe
    ? 'rounded-2xl rounded-tr-xs ml-auto'
    : 'rounded-2xl rounded-tl-xs mr-auto';

  // Formatage du montant
  const formattedAmount = formatBubbleAmount(data.amount, data.currency || 'FCFA');

  // =========================================================================
  // SWITCH(TYPE) : RENDU DES DIFFÉRENTES MICRO-CARTES INTERACTIVES
  // =========================================================================
  const renderCardContent = () => {
    switch (normalizedType) {
      // ---------------------------------------------------------------------
      // VARIANTE 1 : "Farotage" (Célébration & Pourboire en Direct)
      // ---------------------------------------------------------------------
      case 'farotage': {
        return (
          <div
            className={`flex flex-col w-[260px] sm:w-[280px] bg-white ${bubbleCorners} border border-amber-200/80 overflow-hidden shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all`}
          >
            {/* Header : Badge doré avec lueur festive */}
            <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/10 px-3 py-2 border-b border-amber-200/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PartyPopper className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                  🎉 Farotage Digital
                </span>
              </div>
              <span className="text-[9px] font-extrabold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-md shadow-2xs">
                Direct
              </span>
            </div>

            {/* Corps : Montant géant text-2xl font-bold text-gray-900 */}
            <div className="p-3.5 space-y-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-500">
                  {data.title || (isMe ? 'Vous avez envoyé un farotage :' : 'Farotage reçu avec succès :')}
                </p>
                <p className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                  {formattedAmount}
                </p>
              </div>

              {data.message && (
                <p className="text-xs text-slate-700 bg-amber-50/70 p-2 rounded-xl border border-amber-100 italic leading-snug">
                  « {data.message} »
                </p>
              )}

              {/* Bouton d'action / Remerciement */}
              <button
                type="button"
                onClick={handleAction}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-slate-950 text-xs font-black shadow-md shadow-amber-400/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>{isMe ? 'Détails du Farotage' : 'Dire merci 🙏'}</span>
              </button>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // VARIANTE 2 : "Smart Escrow" (Sécurité & Vente Protégée)
      // ---------------------------------------------------------------------
      case 'escrow': {
        const isLocked = data.status === 'locked';
        const isReleased = data.status === 'released';

        let badgeText = '🔒 En attente de paiement';
        let badgeColor = 'bg-slate-50 border-gray-100 text-slate-600';
        let buttonText = 'Payer en sécurité';
        let buttonStyle = 'bg-slate-900 hover:bg-slate-800 text-white';

        if (isLocked) {
          badgeText = '🔒 Fonds sécurisés par Nanasore';
          badgeColor = 'bg-blue-50/80 border-blue-100 text-blue-700';
          buttonText = isMe ? 'Fonds consignés' : 'Confirmer la réception';
          buttonStyle = 'bg-blue-600 hover:bg-blue-700 text-white';
        } else if (isReleased) {
          badgeText = '✅ Transaction terminée';
          badgeColor = 'bg-emerald-50/80 border-emerald-100 text-emerald-700';
          buttonText = 'Fonds libérés au vendeur';
          buttonStyle = 'bg-emerald-600 text-white cursor-default';
        }

        return (
          <div
            className={`flex flex-col w-[260px] sm:w-[280px] bg-white ${bubbleCorners} border border-gray-100 overflow-hidden shadow-sm`}
          >
            {/* Header Badge avec point clignotant */}
            <div
              className={`px-3 py-1.5 border-b flex items-center justify-between ${badgeColor}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                  {badgeText}
                </span>
              </div>
              {!isReleased && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
              )}
            </div>

            {/* Corps : Titre du produit + Montant */}
            <div className="p-3.5 space-y-1.5">
              <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                {data.title || 'Paiement Sécurisé Smart Escrow'}
              </p>

              <p className="text-lg font-extrabold text-blue-600">
                {formattedAmount}
              </p>

              <div className="pt-1.5">
                {/* Footer : Bouton d'action selon directive stricte */}
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={isReleased}
                  className={`w-full py-2 px-3 rounded-xl text-sm font-semibold transition-transform active:scale-95 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-80 disabled:cursor-default ${buttonStyle}`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{buttonText}</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ---------------------------------------------------------------------
      // VARIANTE 3 : "Cadeau Mystère" (Mystery Gift Bubble - Prompt 22)
      // ---------------------------------------------------------------------
      case 'gift': {
        return (
          <LockedGiftBubble
            senderName={data.senderName || 'Ibrahim'}
            recipientName={data.recipientName}
            isMe={isMe}
            timestamp={data.timestamp}
            isInitiallyUnlocked={Boolean(data.isOpened || isGiftUnwrapped)}
            giftProduct={{
              title: data.title || "Gâteau d'anniversaire Signature",
              price: data.amount || 15000,
              currency: data.currency || 'FCFA',
              merchantName: data.merchantName || 'NaNa POS',
              imageUrl:
                data.imageUrl ||
                'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format&fit=crop'
            }}
            onUnlocked={(coords) => {
              setIsGiftUnwrapped(true);
              if (onActionClick) {
                onActionClick('gift', {
                  ...data,
                  isOpened: true,
                  deliveryGps: coords
                });
              }
            }}
            className={className}
          />
        );
      }


      // ---------------------------------------------------------------------
      // VARIANTE 4 : "Cagnotte" (Cotisation & Financement de Groupe)
      // ---------------------------------------------------------------------
      case 'cagnotte': {
        const current = Number(data.currentAmount ?? data.amount ?? 0);
        const target = Number(data.targetAmount ?? (current > 0 ? current * 2 : 100000));
        const progressPct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 50;

        return (
          <div
            className={`flex flex-col w-[260px] sm:w-[280px] bg-white ${bubbleCorners} border border-purple-100 overflow-hidden shadow-sm`}
          >
            {/* Header Badge */}
            <div className="bg-purple-50 px-3 py-1.5 border-b border-purple-100/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                  📊 Cagnotte Solidaire
                </span>
              </div>
              <span className="text-[9px] font-black text-purple-700 bg-purple-200/60 px-1.5 py-0.2 rounded-md">
                {progressPct}%
              </span>
            </div>

            {/* Corps */}
            <div className="p-3.5 space-y-2">
              <p className="text-sm font-semibold text-gray-800 line-clamp-2">
                {data.title || 'Cotisation collective Wameet'}
              </p>

              {/* Barre de progression */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-purple-700">{formatBubbleAmount(current)}</span>
                  <span className="text-slate-400">Obj. {formatBubbleAmount(target)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAction}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-black shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Contribuer à la cagnotte</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      className={`max-w-[85%] select-none font-sans my-1 ${
        isMe ? 'flex justify-end' : 'flex justify-start'
      } ${className}`}
    >
      <div className="space-y-0.5">
        {/* Rendu dynamique de la micro-carte selon le type */}
        {renderCardContent()}

        {/* Pied discret d'horodatage et statut */}
        {data.timestamp && (
          <div
            className={`flex items-center gap-1 text-[10px] text-slate-400 font-medium px-1 ${
              isMe ? 'justify-end' : 'justify-start'
            }`}
          >
            <span>{data.timestamp}</span>
            {isMe && <CheckCheck className="w-3 h-3 text-[#0084FF]" />}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartTransactionBubble;
