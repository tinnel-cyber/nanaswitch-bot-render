/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modale d'Upsell Premium PLG (Product-Led Growth).
 * Déclenchée par l'intercepteur de clics pour convertir les utilisateurs Free/Starter
 * vers les plans Pro/Elite lorsqu'ils cliquent sur des outils d'IA ou atteignent leurs quotas.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Crown, 
  Sparkles, 
  Zap, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  Rocket,
  ShieldCheck,
  Flame,
  Brain
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import { UpsellTriggerDetail, PRO_FEATURES_CATALOG } from '../../utils/planFeatures';

export interface UpsellModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onUpgrade?: (targetPlanId?: string) => void;
  initialDetail?: UpsellTriggerDetail | null;
}

export const UpsellModal: React.FC<UpsellModalProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onUpgrade,
  initialDetail = null
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [detail, setDetail] = useState<UpsellTriggerDetail | null>(initialDetail);

  const isControlled = typeof controlledIsOpen === 'boolean';
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  // Écouteur global pour intercepter et ouvrir l'upsell depuis n'importe quel bouton
  useEffect(() => {
    const handleGlobalTrigger = (event: Event) => {
      const customEvent = event as CustomEvent<UpsellTriggerDetail>;
      if (customEvent.detail) {
        setDetail(customEvent.detail);
        setInternalIsOpen(true);
      }
    };

    window.addEventListener('nana_trigger_upsell', handleGlobalTrigger);
    return () => {
      window.removeEventListener('nana_trigger_upsell', handleGlobalTrigger);
    };
  }, []);

  useEffect(() => {
    if (initialDetail) {
      setDetail(initialDetail);
    }
  }, [initialDetail]);

  const handleClose = () => {
    playTapBeep();
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleUpgradeClick = () => {
    playValidationBeep();
    const targetPlan = detail?.recommendedPlan || (detail?.mode === 'FEATURE_LOCKED' ? 'pro' : 'starter');
    
    if (onUpgrade) {
      onUpgrade(targetPlan);
    } else {
      // Déclenche l'ouverture de la modal de tarification / checkout
      window.dispatchEvent(
        new CustomEvent('nana_open_paywall_modal', {
          detail: { targetPlanId: targetPlan, source: 'UPSELL_MODAL' }
        })
      );
    }
    handleClose();
  };

  if (!isOpen) return null;

  const isFeatureLock = detail?.mode === 'FEATURE_LOCKED' || !detail?.mode;
  const featureMeta = detail?.featureKey ? PRO_FEATURES_CATALOG[detail.featureKey] : null;

  // Libellé de la fonctionnalité ciblée
  const featureLabel = detail?.featureLabel || featureMeta?.label || 'Intelligence Artificielle';
  const currentCount = detail?.currentCount ?? 3;
  const maxCount = detail?.maxCount ?? 3;
  const itemName = detail?.limiterItemName || 'éléments';

  // Titre dynamique
  const defaultTitle = isFeatureLock
    ? "Débloquez la puissance de l'IA 👑"
    : `Passez à la vitesse supérieure ! (${currentCount}/${maxCount} ${itemName})`;

  const mainTitle = detail?.customTitle || defaultTitle;

  // Contenu conforme au cahier des charges
  const defaultDescription = isFeatureLock
    ? `Cette fonctionnalité (${featureLabel}) est incluse dans nos plans Premium. Gagnez des heures de travail chaque semaine en laissant notre Intelligence Artificielle travailler pour vous.`
    : "Débloquez l'illimité pour faire grandir votre business sans aucune friction !";

  const mainMessage = detail?.customMessage || defaultDescription;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-[#060913] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Halos lumineux d'ambiance dorée et violette */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Bouton Fermer discret en haut à droite */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Illustration lumineuse centrale : Couronne lumineuse 👑 & Fusée 🚀 */}
        <div className="flex flex-col items-center text-center space-y-3 pt-1">
          <div className="relative">
            {/* Boîte à icône avec double halo */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-indigo-600 p-[2px] shadow-2xl shadow-amber-500/30 flex items-center justify-center animate-pulse">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-indigo-500/15" />
                <Crown className="w-10 h-10 text-amber-400 fill-amber-400/20 filter drop-shadow-[0_0_12px_rgba(251,191,36,0.7)] animate-bounce duration-1000" />
              </div>
            </div>

            {/* Badge Fusée flottante */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 border border-slate-900">
              <Rocket className="w-4 h-4" />
            </div>

            {/* Étincelle d'accentuation */}
            <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            </div>
          </div>

          {/* Badge de Contexte */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Exclusivité Plans Premium Pro & Elite</span>
          </div>

          {/* Titre Dynamique */}
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            {mainTitle}
          </h3>

          {/* Contenu textuel conforme */}
          <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed max-w-md">
            {mainMessage}
          </p>
        </div>

        {/* Bloc d'avantages & Arguments de conversion */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Zap className="w-3.5 h-3.5" />
              <span>Outil demandé :</span>
            </span>
            <span className="text-amber-200 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1 text-[11px]">
              <Crown className="w-3 h-3 text-amber-400" />
              <span>{featureLabel}</span>
            </span>
          </div>

          {/* Liste des bénéfices IA */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Génération instantanée en 1 clic :</strong> Fiches produits, miniatures et scripts finalisés en quelques secondes.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Avatars Vidéo & Correction IA :</strong> Animez vos cours sans caméra et évaluez vos étudiants 24h/24.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Moteurs Google AI Studio & Imagen 3 :</strong> Algorithmes les plus puissants du marché sans configuration technique.</span>
            </div>
          </div>

          {/* Badge réassurance */}
          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Déblocage instantané sur votre compte</span>
            </span>
            <span className="text-emerald-400 font-bold">Sans engagement</span>
          </div>
        </div>

        {/* Boutons d'Action (CTA) */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          {/* 1. Gros bouton principal "Voir les plans Premium" */}
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-tight shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Crown className="w-4 h-4 fill-slate-950" />
            <span>Voir les plans Premium</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* 2. Bouton texte discret "Plus tard" */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-bold text-xs transition cursor-pointer"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpsellModal;
