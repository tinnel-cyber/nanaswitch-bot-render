import React, { useState, useCallback } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Layers, 
  ArrowRight,
  AlertTriangle,
  Crown
} from 'lucide-react';
import { CourseModule, DripSettings } from '../../../../../types';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';
import { triggerProFeatureUpsell } from '../../../../../utils/planFeatures';

export interface ModuleDeliverySettingsModalProps {
  isOpen: boolean;
  module: CourseModule;
  onClose: () => void;
  onSave: (updatedModule: CourseModule) => void;
  isFreeAccount?: boolean;
}

export const ModuleDeliverySettingsModal: React.FC<ModuleDeliverySettingsModalProps> = ({
  isOpen,
  module,
  onClose,
  onSave,
  isFreeAccount = false
}) => {
  const [dripEnabled, setDripEnabled] = useState<boolean>(
    module.dripSettings?.enabled || false
  );
  const [dripType, setDripType] = useState<'DAYS_AFTER_ENROLLMENT' | 'CALENDAR_DATE'>(
    module.dripSettings?.type || 'DAYS_AFTER_ENROLLMENT'
  );
  const [unlockDays, setUnlockDays] = useState<number>(
    module.dripSettings?.unlockDays !== undefined ? module.dripSettings.unlockDays : 7
  );
  const [unlockDate, setUnlockDate] = useState<string>(
    module.dripSettings?.unlockDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [strictLinear, setStrictLinear] = useState<boolean>(
    module.strictLinearProgression || false
  );

  if (!isOpen) return null;

  const handleSave = () => {
    playValidationBeep();
    const updatedDrip: DripSettings = {
      enabled: dripEnabled,
      type: dripType,
      unlockDays: dripType === 'DAYS_AFTER_ENROLLMENT' ? unlockDays : undefined,
      unlockDate: dripType === 'CALENDAR_DATE' ? unlockDate : undefined
    };

    const updatedModule: CourseModule = {
      ...module,
      dripSettings: updatedDrip,
      strictLinearProgression: strictLinear
    };

    onSave(updatedModule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Règles de Diffusion &amp; Protection</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{module.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* SECTION 1 : DRIP CONTENT (DIFFUSION PROGRESSIVE) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>Drip Content (Diffusion progressive)</span>
                    {isFreeAccount && <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Contrôlez le moment précis où ce module se déverrouille pour chaque apprenant.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { 
                  playTapBeep(); 
                  if (!dripEnabled && isFreeAccount) {
                    triggerProFeatureUpsell('CONTENT_DRIP');
                    return;
                  }
                  setDripEnabled(!dripEnabled); 
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  dripEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={dripEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    dripEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {dripEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80 animate-fadeIn">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setDripType('DAYS_AFTER_ENROLLMENT'); }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      dripType === 'DAYS_AFTER_ENROLLMENT'
                        ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-200 ring-1 ring-cyan-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Délai d&apos;inscription</span>
                    </div>
                    <p className="text-[10px] text-slate-400">X jours après la souscription</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { playTapBeep(); setDripType('CALENDAR_DATE'); }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      dripType === 'CALENDAR_DATE'
                        ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-200 ring-1 ring-cyan-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Date Calendrier</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Date fixe pour toute la cohorte</p>
                  </button>
                </div>

                {dripType === 'DAYS_AFTER_ENROLLMENT' ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                    <label className="text-xs font-bold text-slate-300">
                      Débloquer après :
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={unlockDays}
                        onChange={e => setUnlockDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-center text-white focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-xs text-slate-400 font-bold">jours</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                    <label className="text-xs font-bold text-slate-300">
                      Date de déblocage :
                    </label>
                    <input
                      type="date"
                      value={unlockDate}
                      onChange={e => setUnlockDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2 : PROGRESSION LINÉAIRE STRICTE */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Protection du Parcours (Forcer la progression linéaire)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Empêche le saut de modules : le module N+1 reste strictement verrouillé tant que l&apos;étudiant n&apos;a pas complété 100% du module N.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { playTapBeep(); setStrictLinear(!strictLinear); }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  strictLinear ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={strictLinear}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    strictLinear ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {strictLinear && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  La règle Firebase verrouillera l&apos;accès à ce module jusqu&apos;à ce que le document de progression valide le module antérieur.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pied de page */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-xs transition shadow-lg shadow-indigo-500/30 flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Enregistrer les Règles</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleDeliverySettingsModal;
