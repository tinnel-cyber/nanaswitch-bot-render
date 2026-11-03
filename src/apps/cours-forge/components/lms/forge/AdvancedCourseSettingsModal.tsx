import React, { useState, useCallback } from 'react';
import { 
  X, 
  Settings, 
  Lock, 
  KeyRound, 
  Search, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Copy, 
  Layers,
  BookOpen,
  Crown
} from 'lucide-react';
import { Course } from '../../../../../types';
import { SEED_MARKETPLACE_COURSES } from '../../../../../services/marketplaceService';
import { saveCourseGlobalSettings } from '../../../../../services/lmsService';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';
import { triggerProFeatureUpsell } from '../../../../../utils/planFeatures';

export interface AdvancedCourseSettingsModalProps {
  isOpen: boolean;
  courseId: string;
  courseTitle: string;
  currentSettings?: {
    prerequisiteCourseIds?: string[];
    isPasswordProtected?: boolean;
    accessPassword?: string;
    strictLinearProgression?: boolean;
  };
  onClose: () => void;
  onSaveSuccess?: (newSettings: any) => void;
  isFreeAccount?: boolean;
}

export const AdvancedCourseSettingsModal: React.FC<AdvancedCourseSettingsModalProps> = ({
  isOpen,
  courseId,
  courseTitle,
  currentSettings,
  onClose,
  onSaveSuccess,
  isFreeAccount = false
}) => {
  const [prereqIds, setPrereqIds] = useState<string[]>(
    currentSettings?.prerequisiteCourseIds || []
  );
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(
    currentSettings?.isPasswordProtected || false
  );
  const [accessPassword, setAccessPassword] = useState<string>(
    currentSettings?.accessPassword || ''
  );
  const [strictLinear, setStrictLinear] = useState<boolean>(
    currentSettings?.strictLinearProgression || false
  );
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [prereqSearch, setPrereqSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  // Liste des cours disponibles pour prérequis (en excluant le cours actuel)
  const availableCourses = SEED_MARKETPLACE_COURSES.filter(c => c.id !== courseId);
  const filteredCourses = availableCourses.filter(c => 
    c.title.toLowerCase().includes(prereqSearch.toLowerCase()) ||
    c.category.toLowerCase().includes(prereqSearch.toLowerCase())
  );

  const togglePrereq = (id: string) => {
    playTapBeep();
    setPrereqIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCopyPassword = () => {
    if (!accessPassword) return;
    navigator.clipboard.writeText(accessPassword);
    setCopied(true);
    playValidationBeep();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    playValidationBeep();
    setIsSaving(true);

    const payload = {
      prerequisiteCourseIds: prereqIds,
      isPasswordProtected,
      accessPassword: isPasswordProtected ? accessPassword : '',
      strictLinearProgression: strictLinear
    };

    await saveCourseGlobalSettings(courseId, payload);
    setIsSaving(false);
    if (onSaveSuccess) onSaveSuccess(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Paramètres Avancés &amp; Accès</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Entreprise LMS
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs">{courseTitle}</p>
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
          {/* 1. PRÉREQUIS INTER-COURS */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Cours Prérequis Obligatoires
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Les étudiants doivent avoir validé 100% de ces formations avant de pouvoir souscrire à ce cours.
              </p>
            </div>

            {/* Barre de recherche des cours */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={prereqSearch}
                onChange={e => setPrereqSearch(e.target.value)}
                placeholder="Rechercher une formation dans le catalogue..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Liste sélectionnable */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {filteredCourses.map(c => {
                const isSelected = prereqIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => togglePrereq(c.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/80 text-amber-200'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold truncate">{c.title}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 shrink-0">
                      {c.category}
                    </span>
                  </div>
                );
              })}
            </div>

            {prereqIds.length > 0 && (
              <div className="text-[11px] font-bold text-amber-400">
                ✓ {prereqIds.length} formation(s) requise(s)
              </div>
            )}
          </div>

          {/* 2. MOT DE PASSE / CODE PIN D'ACCÈS */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>Protection par Code PIN / DRM</span>
                    {isFreeAccount && <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Exige un code secret pour autoriser l&apos;inscription (idéal pour les cohortes privées en entreprise).
                </p>
              </div>

              <button
                type="button"
                onClick={() => { 
                  playTapBeep(); 
                  if (!isPasswordProtected && isFreeAccount) {
                    triggerProFeatureUpsell('COURSE_DRM_PROTECTION');
                    return;
                  }
                  setIsPasswordProtected(!isPasswordProtected); 
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPasswordProtected ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={isPasswordProtected}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isPasswordProtected ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isPasswordProtected && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80 animate-fadeIn">
                <label className="text-xs font-bold text-slate-300">
                  Définir le mot de passe d&apos;inscription :
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={accessPassword}
                      onChange={e => setAccessPassword(e.target.value)}
                      placeholder="Ex: NANA-CORP-2026"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. PROGRESSION LINÉAIRE GLOBALE */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Parcours Séquentiel Strict Global
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Applique la progression linéaire obligatoire à l&apos;ensemble des modules du cours.
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
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-xs transition shadow-lg shadow-indigo-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Enregistrer les Paramètres</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedCourseSettingsModal;
