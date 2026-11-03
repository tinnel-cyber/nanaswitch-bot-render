import React, { useEffect, useCallback } from 'react';
import { 
  Rocket, 
  GraduationCap, 
  Store, 
  ArrowRight, 
  X, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  ShoppingBag,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

export interface StartWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInstructor: () => void;
  onSelectMerchant: () => void;
  title?: string;
  subtitle?: string;
}

export const StartWorkspaceModal: React.FC<StartWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSelectInstructor,
  onSelectMerchant,
  title = "Choisissez votre espace de travail",
  subtitle = "Basculez instantanément entre la gestion de votre campus et votre boutique commerciale."
}) => {
  // Gestion de la touche Échap pour fermer la modale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Conteneur de la Modale */}
      <div 
        className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border border-slate-750/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40 text-slate-100 overflow-hidden transform transition-all duration-300 scale-100 opacity-100 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Halos de lumière d'ambiance en arrière-plan */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Bouton de fermeture */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700/60 active:scale-95"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* En-tête de la Modale */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Rocket className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Aiguilleur d'Espaces NaNa
              </span>
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Multi-Tenant
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {title}
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
          {subtitle}
        </p>

        {/* Grille des 2 Grandes Cartes d'Accès */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* OPTION A : Vente de produits (E-commerce & Physique) */}
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onClose();
              onSelectMerchant();
            }}
            className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-900/90 hover:from-emerald-950/50 hover:to-slate-900/95 border border-slate-700/70 hover:border-emerald-500/80 transition-all duration-300 transform active:scale-98 text-left cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-0.5"
          >
            {/* Lueur d'accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

            <div>
              {/* Badge & Icône */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Store className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  Option A
                </span>
              </div>

              {/* Titre */}
              <h3 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-200 transition-colors flex items-center gap-1.5">
                <span>Je veux vendre des produits (E-commerce, Physique)</span>
              </h3>

              {/* Description exigée */}
              <p className="text-xs text-slate-300/90 font-medium leading-relaxed mt-1.5 mb-4">
                Gérez votre boutique, vos produits et le Live Shopping.
              </p>

              {/* Tags fonctionnalités */}
              <div className="space-y-1.5 pt-2 border-t border-slate-750/70 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Caisse POS & Ticket de Caisse</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Jusqu'à 3 produits physiques (Plan Gratuit)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Stocks, Dettes & Encaissements 0% com.</span>
                </div>
              </div>
            </div>

            {/* Pied de Carte & Bouton d'action */}
            <div className="mt-5 pt-3 border-t border-slate-750/60 flex items-center justify-between text-xs font-black text-emerald-400 group-hover:text-emerald-300 transition-colors">
              <span>Commencer avec les produits (0F)</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-200" />
            </div>
          </button>

          {/* OPTION B : Vente d'expertise (Formations) */}
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onClose();
              onSelectInstructor();
            }}
            className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-900/90 hover:from-indigo-950/50 hover:to-slate-900/95 border border-slate-700/70 hover:border-indigo-500/80 transition-all duration-300 transform active:scale-98 text-left cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-0.5"
          >
            {/* Lueur d'accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full blur-xl pointer-events-none group-hover:bg-indigo-500/20 transition-all" />

            <div>
              {/* Badge & Icône */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  Option B
                </span>
              </div>

              {/* Titre */}
              <h3 className="text-base sm:text-lg font-black text-white group-hover:text-indigo-200 transition-colors flex items-center gap-1.5">
                <span>Je veux vendre mon expertise (Formations)</span>
              </h3>

              {/* Description exigée */}
              <p className="text-xs text-slate-300/90 font-medium leading-relaxed mt-1.5 mb-4">
                Gérez votre campus, vos cours vidéo et vos étudiants.
              </p>

              {/* Tags fonctionnalités */}
              <div className="space-y-1.5 pt-2 border-t border-slate-750/70 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>Mon Campus Privé (Marque Blanche)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>1 cours vidéo inclus (Plan Gratuit)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Gains 100% directs & Retraits 0% com.</span>
                </div>
              </div>
            </div>

            {/* Pied de Carte & Bouton d'action */}
            <div className="mt-5 pt-3 border-t border-slate-750/60 flex items-center justify-between text-xs font-black text-indigo-400 group-hover:text-indigo-300 transition-colors">
              <span>Commencer avec les formations (0F)</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-200" />
            </div>
          </button>

        </div>

        {/* Mention de bas de modale */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            Chaque espace conserve ses données et permissions isolées.
          </span>
          <span className="text-slate-500 font-mono text-[10px]">
            NaNa Hub Switcher v2.4
          </span>
        </div>
      </div>
    </div>
  );
};

export default StartWorkspaceModal;
