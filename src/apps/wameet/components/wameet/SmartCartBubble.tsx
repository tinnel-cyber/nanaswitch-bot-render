import React from 'react';
import {
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Receipt,
  ShieldCheck,
  Check,
  CreditCard,
  X
} from 'lucide-react';

export interface DetectedCartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface SmartCartData {
  isOrderIntent?: boolean;
  detectedItems: DetectedCartItem[];
  totalAmount: number;
  currency?: string;
}

export interface SmartCartBubbleProps {
  cartData: SmartCartData;
  timestamp?: string;
  merchantName?: string;
  isProcessing?: boolean;
  onValidateAndPay?: (cart: SmartCartData) => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Formate un montant en devise FCFA standard (ex: 30 000 FCFA)
 */
export function formatCartCurrency(amount: number, currency: string = 'FCFA'): string {
  const formatted = new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0));
  return `${formatted} ${currency}`;
}

export const SmartCartBubble: React.FC<SmartCartBubbleProps> = ({
  cartData,
  timestamp,
  merchantName,
  isProcessing = false,
  onValidateAndPay,
  onDismiss,
  className = ''
}) => {
  const items = Array.isArray(cartData?.detectedItems) ? cartData.detectedItems : [];
  const currency = cartData?.currency || 'FCFA';

  // Calcul du montant total sécurisé
  const computedTotal =
    cartData?.totalAmount ||
    items.reduce((acc, item) => acc + (item.quantity || 1) * (item.unitPrice || 0), 0);

  const formattedTotal = formatCartCurrency(computedTotal, currency);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`max-w-sm w-full rounded-2xl bg-white border border-slate-200/90 shadow-md overflow-hidden font-sans select-none transition-all duration-200 hover:shadow-lg ${className}`}
    >
      {/* -------------------------------------------------------------------
          1. EN-TÊTE TYPE TICKET DE CAISSE ÉPURÉ AVEC BADGE IA
         ------------------------------------------------------------------- */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#0084FF] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Receipt className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-tight uppercase text-white truncate">
                Panier Détecté
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-black border border-blue-400/30">
                <Sparkles className="w-2.5 h-2.5 text-blue-300" />
                IA
              </span>
            </div>
            {merchantName && (
              <p className="text-[10px] text-slate-400 truncate">
                Boutique : {merchantName}
              </p>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Ignorer ce panier"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* -------------------------------------------------------------------
          2. CORPS DU TICKET DE CAISSE : ARTICLES & LIGNE POINTILLÉE
         ------------------------------------------------------------------- */}
      <div className="p-4 space-y-3 bg-slate-50/50">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1">
          Détail des articles
        </div>

        <div className="space-y-2.5 divide-y divide-slate-100">
          {items.map((item, index) => {
            const lineTotal = (item.quantity || 1) * (item.unitPrice || 0);

            return (
              <div key={item.id || index} className="pt-2 first:pt-0 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-snug truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    <span className="font-bold text-slate-700">{item.quantity}</span> ×{' '}
                    <span>{formatCartCurrency(item.unitPrice, currency)}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-slate-900 font-mono">
                    {formatCartCurrency(lineTotal, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* LIGNE DE SÉPARATION POINTILLÉE STYLE TICKET DE CAISSE */}
        <div className="border-t-2 border-dashed border-slate-300/80 my-3 relative">
          {/* Petites encoches circulaires de chaque côté */}
          <div className="absolute -left-6 -top-2.5 w-3 h-5 rounded-r-full bg-white border-r border-slate-200" />
          <div className="absolute -right-6 -top-2.5 w-3 h-5 rounded-l-full bg-white border-l border-slate-200" />
        </div>

        {/* -------------------------------------------------------------------
            3. LIGNE DU TOTAL
           ------------------------------------------------------------------- */}
        <div className="flex items-baseline justify-between pt-0.5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Total à payer
            </span>
            <div className="text-[10px] font-semibold text-slate-400">
              Paiement sécurisé par NaNaSwitch
            </div>
          </div>

          <div className="text-right">
            <span className="text-lg font-black tracking-tight text-[#0084FF] font-mono">
              {formattedTotal}
            </span>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            4. BOUTON D'APPEL À L'ACTION ULTRA-VISIBLE : "Valider et Payer X FCFA"
           ------------------------------------------------------------------- */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onValidateAndPay && onValidateAndPay(cartData)}
            className="w-full py-3.5 px-4 rounded-xl bg-[#0084FF] hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4 stroke-[2.2]" />
            <span>
              {isProcessing
                ? 'Génération de la commande...'
                : `Valider et Payer ${formattedTotal}`}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.4]" />
          </button>
        </div>

        {/* Pied de ticket discret */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Séquestre garanti
          </span>
          {timestamp && <span>{timestamp}</span>}
        </div>
      </div>
    </div>
  );
};

export default SmartCartBubble;
