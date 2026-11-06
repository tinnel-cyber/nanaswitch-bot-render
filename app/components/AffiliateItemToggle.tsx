'use client';

import { useState } from 'react';
import { Sparkles, DollarSign, Check, HelpCircle } from 'lucide-react';

interface AffiliateItemToggleProps {
  initialEnabled?: boolean;
  initialRate?: number;
  defaultTenantRate?: number;
  onChange?: (data: { isAffiliateEnabled: boolean; commissionRate: number }) => void;
  namePrefix?: string;
}

export default function AffiliateItemToggle({
  initialEnabled = true,
  initialRate = 15,
  defaultTenantRate = 15,
  onChange,
  namePrefix = 'affiliate',
}: AffiliateItemToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [rate, setRate] = useState(initialRate || defaultTenantRate);

  const handleToggle = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    onChange?.({ isAffiliateEnabled: nextState, commissionRate: rate });
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    onChange?.({ isAffiliateEnabled: enabled, commissionRate: newRate });
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
      {/* Champs masqués pour les formulaires natifs FormData / Server Actions */}
      <input type="hidden" name={`${namePrefix}_enabled`} value={enabled ? 'true' : 'false'} />
      <input type="hidden" name={`${namePrefix}_rate`} value={rate} />

      {/* Bouton Toggle principal */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl transition-colors ${enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Activer le Programme d'Affiliation pour cet article / ce cours</span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {enabled ? 'Affiliation Active' : 'Désactivée'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Affiche un badge interactif sur la page pour permettre aux ambassadeurs de vendre cet article et d'encaisser une commission.
            </p>
          </div>
        </div>

        {/* Bouton Switch On/Off */}
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Options détaillées si l'affiliation est activée */}
      {enabled && (
        <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pourcentage de commission offert à l'affilié :</span>
            </label>

            <div className="flex items-center gap-2">
              {[10, 15, 20, 30].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleRateChange(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    rate === preset
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset}%
                </button>
              ))}

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={rate}
                  onChange={(e) => handleRateChange(Math.max(1, Math.min(80, Number(e.target.value) || 0)))}
                  className="w-16 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-center text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-2 top-1 text-xs text-slate-400 pointer-events-none">%</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>
              Au clic sur le badge, les visiteurs pourront soit <strong>ajouter cet article à leur liste affiliée existante</strong>, soit <strong>s'inscrire en tant qu'affilié</strong>.
              Les demandes pour les boutiques Standard sont transmises au <strong>Dashboard Super Admin</strong>, tandis que les boutiques Marque Blanche les gèrent en direct.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
