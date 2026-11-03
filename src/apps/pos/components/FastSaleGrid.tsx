import React, { useMemo, useCallback } from 'react';
import { FastSaleProduct } from '../../../types';
import { formatCFA, playTapBeep } from '../../../utils/audio';
import { Coins } from 'lucide-react';

interface FastSaleGridProps {
  products?: FastSaleProduct[];
  onSelectProduct?: (product: FastSaleProduct) => void;
  onSelectPresetAmount?: (amount: number) => void;
  onSelectAmount?: (amount: number) => void;
}

const PRESET_AMOUNTS = [50, 100, 150, 200, 500, 1000, 2000, 5000];

export const FastSaleGrid: React.FC<FastSaleGridProps> = ({
  onSelectPresetAmount,
  onSelectAmount,
}) => {
  const handleAmountClick = onSelectPresetAmount || onSelectAmount;

  return (
    <div className="w-full px-3 py-2 select-none shrink-0 bg-slate-900/60 border-b border-slate-800">
      {/* 1. En-tête Coupures & Montants Rapides */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>Coupures &amp; Montants Rapides</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">1-clic direct</span>
      </div>

      {/* 2. Boutons compacts des coupures (+50 F CFA, +100 F CFA, etc.) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {PRESET_AMOUNTS.map((amt) => (
          <button
            key={amt}
            id={`btn-preset-amt-${amt}`}
            type="button"
            onClick={() => {
              playTapBeep();
              if (handleAmountClick) {
                handleAmountClick(amt);
              }
            }}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-amber-950/40 text-slate-200 hover:text-amber-300 border border-slate-700/80 hover:border-amber-400/50 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            +{formatCFA(amt)}
          </button>
        ))}
      </div>
    </div>
  );
};



export default FastSaleGrid;
