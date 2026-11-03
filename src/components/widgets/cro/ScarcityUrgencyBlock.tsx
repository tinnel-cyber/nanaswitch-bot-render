import React, { useState, useEffect, useCallback } from 'react';
import { Flame, Clock, AlertTriangle } from 'lucide-react';

interface ScarcityUrgencyBlockProps {
  totalStock?: number;
  remainingStock?: number;
  hoursLeft?: number;
  urgencyText?: string;
  className?: string;
}

export const ScarcityUrgencyBlock: React.FC<ScarcityUrgencyBlockProps> = ({
  totalStock = 30,
  remainingStock = 7,
  hoursLeft = 3,
  urgencyText,
  className = ''
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(hoursLeft * 3600);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const stockPercentage = totalStock > 0 
    ? (remainingStock <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((remainingStock / totalStock) * 100))))
    : 0;

  return (
    <div className={`p-4 rounded-2xl bg-[#090e1a] border border-amber-500/30 space-y-3 select-none ${className}`}>
      {/* Entête Rareté */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-amber-400 font-black">
          <Flame className="w-4 h-4 fill-current animate-bounce" />
          <span>OFFRE LIMITÉE DANS LE TEMPS</span>
        </div>

        {/* Compte à rebours */}
        <div className="flex items-center gap-1 font-mono font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-amber-400 mr-0.5" />
          <span className="text-amber-300">{hours.toString().padStart(2, '0')}</span>
          <span>:</span>
          <span>{minutes.toString().padStart(2, '0')}</span>
          <span>:</span>
          <span className="text-rose-400">{seconds.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Barre de Stock en direct */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-300 font-medium">
            {urgencyText || `Stock critique : Plus que ${remainingStock} pièces disponibles`}
          </span>
          <span className="text-rose-400 font-extrabold">{remainingStock} / {totalStock}</span>
        </div>

        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            style={{ width: `${stockPercentage}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              remainingStock <= 5 ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-amber-500 to-rose-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
