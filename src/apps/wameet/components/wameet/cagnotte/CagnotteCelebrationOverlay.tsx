import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Store,
  Clock,
  MapPin,
  X,
  Share2,
  Download,
  PartyPopper,
  KeyRound
} from 'lucide-react';
import type { CagnotteGroupState } from '../../../../../types/cagnotte';
import { playCashChime, playValidationBeep, playTapBeep } from '../../../../../utils/audio';

export interface CagnotteCelebrationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  cagnotte: CagnotteGroupState;
}

export const CagnotteCelebrationOverlay: React.FC<CagnotteCelebrationOverlayProps> = ({
  isOpen,
  onClose,
  cagnotte
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Son de célébration joyeux
    playCashChime();
    setTimeout(() => playValidationBeep(), 400);

    // Salve de confettis multicolores festive
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const {
    beneficiaryName,
    gift,
    targetAmount,
    contributionsCount,
    smartContract,
    eventDate,
    eventLocation
  } = cagnotte;

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-400/80 rounded-3xl shadow-2xl shadow-emerald-500/20 text-white overflow-hidden flex flex-col relative">
        {/* Glow Background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Célébration */}
        <div className="p-6 text-center space-y-2 relative z-10">
          <div className="inline-flex p-3 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/20 mb-1 animate-bounce">
            <PartyPopper className="w-8 h-8" />
          </div>

          <span className="inline-block text-[11px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            Contrat Intelligent Exécuté avec Succès
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white">
            🎉 Objectif 100% Atteint !
          </h2>

          <p className="text-xs text-slate-300 max-w-sm mx-auto">
            Le cadeau de <strong className="text-emerald-400">{beneficiaryName}</strong> est officiellement payé et commandé chez le commerçant.
          </p>
        </div>

        {/* Reçu Numérique Scellé */}
        <div className="px-6 pb-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-inner space-y-3 text-xs relative overflow-hidden">
            {/* Filigrane 'PAYÉ' */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 rotate-[-20deg] font-black text-4xl text-emerald-500/15 select-none pointer-events-none border-4 border-emerald-500/20 px-3 py-1 rounded-xl">
              PAYÉ PAR CONTAT
            </div>

            {/* Détails Produit */}
            <div className="flex items-center gap-3">
              <img
                src={gift.imageUrl}
                alt={gift.name}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-700 shadow-md"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-sm truncate">{gift.name}</div>
                <div className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Store className="w-3 h-3 text-emerald-400" />
                  <span>{gift.merchantName}</span>
                </div>
                <div className="text-emerald-400 font-bold text-xs mt-0.5">
                  Montant réglé : {fmt(targetAmount)} FCFA
                </div>
              </div>
            </div>

            {/* Preuve de Sécurité & Zéro Détournement */}
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Sécurité absolue :</strong> Les {fmt(targetAmount)} FCFA ont été virés
                directement sur le compte du marchand Nanasore.
                <div className="text-slate-400 text-[10px] mt-0.5">
                  0 FCFA n'a transité par un compte individuel.
                </div>
              </div>
            </div>

            {/* Bon de Commande & Livraison à la Fête */}
            <div className="border-t border-slate-800 pt-2 space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">N° Commande POS :</span>
                <span className="font-mono font-bold text-white">
                  {smartContract.posOrderId || 'CMD-POS-GIFT-89421'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date de livraison :</span>
                <span className="font-bold text-amber-300">{eventDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lieu de fête :</span>
                <span className="text-slate-200 truncate max-w-[200px]">{eventLocation}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-emerald-400" /> Code PIN Livreur :
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 font-mono font-black px-2 py-0.5 rounded text-xs">
                  {smartContract.deliveryPinCode}
                </span>
              </div>
            </div>
          </div>

          {/* Boutons d'Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                onClose();
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Voir la conversation du groupe</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CagnotteCelebrationOverlay;
