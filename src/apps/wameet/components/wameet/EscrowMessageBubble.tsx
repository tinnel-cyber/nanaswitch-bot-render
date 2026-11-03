import React from 'react';
import {
  Clock,
  Lock,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  PackageCheck,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export type EscrowStatus = 'pending' | 'locked' | 'released';

export interface EscrowMessageBubbleProps {
  id?: string;
  itemTitle: string;
  amountFcfa: number;
  status: EscrowStatus;
  currency?: string;
  itemImageUrl?: string;
  transactionRef?: string;
  timestamp?: string;
  userRole?: 'buyer' | 'seller'; // Pour adapter les boutons selon qui regarde
  isProcessing?: boolean;
  onPay?: () => void;
  onConfirmDelivery?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

/**
 * Formate un montant en devise FCFA standard (ex: 25 000 FCFA)
 */
export function formatCurrencyFcfa(amount: number, currency: string = 'FCFA'): string {
  const formatted = new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0));
  return `${formatted} ${currency}`;
}

export const EscrowMessageBubble: React.FC<EscrowMessageBubbleProps> = ({
  id,
  itemTitle,
  amountFcfa,
  status,
  currency = 'FCFA',
  itemImageUrl,
  transactionRef,
  timestamp,
  userRole = 'buyer',
  isProcessing = false,
  onPay,
  onConfirmDelivery,
  onViewDetails,
  className = ''
}) => {
  const formattedAmount = formatCurrencyFcfa(amountFcfa, currency);

  // ============================================================================
  // CONFIGURATION DES VARIANTES TAILWIND SELON L'ÉTAT (PENDING / LOCKED / RELEASED)
  // ============================================================================
  const config = {
    pending: {
      cardBg: 'bg-white border-slate-200/90 shadow-sm hover:shadow-md',
      headerBg: 'bg-slate-50 border-b border-slate-100',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      badgeText: 'En attente de paiement',
      badgeIcon: Clock,
      amountColor: 'text-slate-900',
      tagColor: 'text-slate-500'
    },
    locked: {
      cardBg: 'bg-gradient-to-br from-blue-50/80 via-white to-amber-50/40 border-blue-200 shadow-md ring-1 ring-blue-500/10',
      headerBg: 'bg-blue-50/60 border-b border-blue-100/80',
      badgeBg: 'bg-blue-100 text-[#0084FF] border-blue-300',
      badgeText: 'Fonds sous séquestre sécurisé',
      badgeIcon: Lock,
      amountColor: 'text-[#0084FF]',
      tagColor: 'text-blue-700'
    },
    released: {
      cardBg: 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border-emerald-200 shadow-sm',
      headerBg: 'bg-emerald-50/80 border-b border-emerald-100',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      badgeText: 'Transaction terminée',
      badgeIcon: CheckCircle2,
      amountColor: 'text-emerald-700',
      tagColor: 'text-emerald-600'
    }
  }[status];

  const BadgeIcon = config.badgeIcon;

  return (
    <div
      className={`max-w-sm w-full rounded-2xl border transition-all duration-200 overflow-hidden font-sans select-none ${config.cardBg} ${className}`}
    >
      {/* -------------------------------------------------------------------
          1. EN-TÊTE : LABEL NANASORE SMART ESCROW & STATUT VISUEL
         ------------------------------------------------------------------- */}
      <div className={`px-4 py-2.5 flex items-center justify-between gap-2 ${config.headerBg}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-[#0084FF] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] font-extrabold tracking-tight text-slate-900 truncate">
            Smart Escrow • Wameet
          </span>
        </div>

        {/* Badge de statut */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${config.badgeBg}`}
        >
          <BadgeIcon className="w-3 h-3 stroke-[2.4]" />
          <span>{config.badgeText}</span>
        </span>
      </div>

      {/* -------------------------------------------------------------------
          2. CORPS : TITRE DE L'ARTICLE, PHOTO OPTIONNELLE & MONTANT EN FCFA
         ------------------------------------------------------------------- */}
      <div className="p-4 space-y-3.5">
        <div className="flex items-start gap-3">
          {itemImageUrl && (
            <img
              src={itemImageUrl}
              alt={itemTitle}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
            />
          )}

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
              {itemTitle}
            </h4>

            {transactionRef && (
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                Réf : <span className="font-mono text-slate-600">{transactionRef}</span>
              </p>
            )}
          </div>
        </div>

        {/* Bloc du Montant */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">Montant sécurisé</span>
          <div className="text-right">
            <span className={`text-lg font-black tracking-tight ${config.amountColor}`}>
              {formattedAmount}
            </span>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            3. BANDEAU DE STATUT DÉTAILLÉ
           ------------------------------------------------------------------- */}
        {status === 'pending' && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-900 text-[11px]">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="font-medium leading-tight">
              En attente du paiement Mobile Money par l'acheteur.
            </p>
          </div>
        )}

        {status === 'locked' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/90 border border-blue-200/80 text-blue-950 text-[11px]">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Lock className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <p className="font-black text-[#0084FF]">
                🔒 Fonds sécurisés par Nanasore
              </p>
              <p className="text-[10px] font-semibold text-slate-600 leading-tight mt-0.5">
                L'argent est bloqué sous séquestre jusqu'à validation de la réception du colis.
              </p>
            </div>
          </div>
        )}

        {status === 'released' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px]">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div>
              <p className="font-black text-emerald-800">
                ✅ Transaction terminée
              </p>
              <p className="text-[10px] font-semibold text-emerald-700 leading-tight mt-0.5">
                Fonds libérés au vendeur. Merci d'utiliser Smart Escrow !
              </p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            4. BOUTONS D'ACTION SELON L'ÉTAT & LE RÔLE
           ------------------------------------------------------------------- */}
        <div>
          {/* ÉTAT 1 : EN ATTENTE (PENDING) -> Bouton "Payer via Mobile Money" */}
          {status === 'pending' && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onPay}
              className="w-full py-3 px-4 rounded-xl bg-[#0084FF] hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-black shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4 stroke-[2.2]" />
              <span>
                {isProcessing ? 'Génération du paiement...' : 'Payer via Mobile Money'}
              </span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}

          {/* ÉTAT 2 : BLOQUÉ (LOCKED) -> Bouton "Confirmer la réception" pour l'acheteur */}
          {status === 'locked' && (
            <div className="space-y-2">
              {userRole === 'buyer' ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={onConfirmDelivery}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-black shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <PackageCheck className="w-4 h-4 stroke-[2.2]" />
                  <span>
                    {isProcessing ? 'Libération des fonds...' : 'Confirmer la réception'}
                  </span>
                </button>
              ) : (
                <div className="text-center py-2 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
                  📦 Colis expédié. En attente de validation par l'acheteur.
                </div>
              )}
            </div>
          )}

          {/* ÉTAT 3 : LIBÉRÉ (RELEASED) -> Reçu ou Détails */}
          {status === 'released' && onViewDetails && (
            <button
              type="button"
              onClick={onViewDetails}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Voir le reçu de la transaction</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Horodatage discret en bas */}
        {timestamp && (
          <div className="text-right pt-0.5">
            <span className="text-[10px] font-semibold text-slate-400">
              {timestamp}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EscrowMessageBubble;
