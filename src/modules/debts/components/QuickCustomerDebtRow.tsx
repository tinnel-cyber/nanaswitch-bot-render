import React from 'react';
import { DebtCustomer, CartItem } from '../../../types';
import { formatCFA } from '../../../utils/audio';
import { Zap, AlertCircle } from 'lucide-react';

interface QuickCustomerDebtRowProps {
  customers: DebtCustomer[];
  cartTotal: number;
  cartItemCount: number;
  onQuickAssignDebt: (customer: DebtCustomer) => void;
}

export const QuickCustomerDebtRow: React.FC<QuickCustomerDebtRowProps> = ({
  customers,
  cartTotal,
  cartItemCount,
  onQuickAssignDebt,
}) => {
  // Grab the 4 regular customers (Mamadou, Fatou, Ibrahim, Oumar)
  const regularCustomers = customers.slice(0, 4);

  return (
    <div className="w-full bg-slate-900/95 border-b border-blue-900/30 px-3 py-1.5 select-none">
      {/* Label and visual cue */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
          <Zap className={`w-3 h-3 ${cartTotal > 0 ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-slate-500'}`} />
          <span>Crédit 1-Clic (Clients Réguliers)</span>
        </div>
        {cartTotal > 0 ? (
          <span className="text-[10px] text-amber-300 font-semibold animate-pulse">
            Touchez pour imputer {formatCFA(cartTotal)}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500">
            Ardoises directes
          </span>
        )}
      </div>

      {/* Horizontal row of 4 regular customer buttons */}
      <div className="grid grid-cols-4 gap-2">
        {regularCustomers.map((customer) => {
          const isOverdue = customer.status === 'OVERDUE';

          return (
            <button
              key={customer.id}
              id={`btn-1clic-${customer.shortName.toLowerCase()}`}
              type="button"
              onClick={() => onQuickAssignDebt(customer)}
              className={`relative flex flex-col items-center justify-center p-1 rounded-xl border transition-all cursor-pointer group active:scale-95 ${
                cartTotal > 0
                  ? 'bg-slate-800/90 border-blue-500/50 hover:border-amber-400 hover:bg-slate-800 shadow-md shadow-black/30'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800/80'
              }`}
              title={
                cartTotal > 0
                  ? `Imputer immédiatement ${formatCFA(cartTotal)} à ${customer.name}`
                  : `${customer.name} - Dette actuelle: ${formatCFA(customer.totalDebt)}`
              }
            >
              {/* Photo / Avatar with Initials Fallback */}
              <div className="relative mb-1">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 transition-transform group-hover:scale-105 flex items-center justify-center text-white font-black text-xs shadow-inner ${
                    isOverdue
                      ? 'border-red-500 ring-2 ring-red-500/20'
                      : 'border-emerald-400 ring-2 ring-emerald-500/20'
                  } ${customer.avatarColor || 'bg-blue-600'}`}
                >
                  {customer.avatarUrl ? (
                    <img
                      src={customer.avatarUrl}
                      alt={customer.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-[11px] pointer-events-none">
                    {customer.initials}
                  </span>
                </div>

                {/* Overdue/Recent dot indicator */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                    isOverdue ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
                  }`}
                  title={isOverdue ? 'Retard de paiement' : 'Dette récente'}
                />
              </div>

              {/* Customer Short Name */}
              <span className="text-[11px] sm:text-xs font-bold text-white truncate max-w-full leading-tight">
                {customer.shortName}
              </span>

              {/* Current Debt Badge */}
              <span
                className={`text-[9px] font-mono font-bold px-1 rounded mt-0.5 leading-tight truncate max-w-full ${
                  customer.totalDebt > 0
                    ? isOverdue
                      ? 'text-red-300 bg-red-950/60'
                      : 'text-emerald-300 bg-emerald-950/60'
                    : 'text-slate-400 bg-slate-900'
                }`}
              >
                {Math.round(customer.totalDebt / 1000)}k F
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickCustomerDebtRow;
