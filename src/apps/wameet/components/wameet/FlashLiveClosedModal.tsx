import React, { useEffect, useState } from 'react';
import { Sparkles, Home, Heart, ShoppingBag, CheckCircle2 } from 'lucide-react';

export interface FlashLiveClosedModalProps {
  farewellMessage?: string | null;
  onRedirectHome: () => void;
  redirectCountdownSec?: number;
}

/**
 * Modale de clôture et de remerciement affichée lorsque le Live Shopping se termine
 * Redirige proprement les spectateurs et acheteurs vers l'accueil
 */
export const FlashLiveClosedModal: React.FC<FlashLiveClosedModalProps> = ({
  farewellMessage,
  onRedirectHome,
  redirectCountdownSec = 4
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(redirectCountdownSec);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onRedirectHome();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onRedirectHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onRedirectHome]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fin du Live Shopping"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300 font-sans"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-6 text-center text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Halo décoratif */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-[#0084FF]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-rose-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Icône de célébration */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-[#0084FF] to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Sparkles className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h3 className="text-lg font-black text-white tracking-tight">
          Vente Flash Terminée !
        </h3>

        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          {farewellMessage ||
            "Merci infiniment d'avoir suivi notre direct ! Les commandes passées en 1 clic sont transmises au vendeur pour expédition immédiate."}
        </p>

        {/* Badge récapitulatif */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-left flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-[11px] leading-tight">
            <p className="font-bold text-slate-100">Salon éphémère clôturé</p>
            <p className="text-slate-400">Vos fonds restent sécurisés via Smart Escrow</p>
          </div>
        </div>

        {/* Bouton de redirection immédiate */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onRedirectHome}
            className="w-full py-3 px-4 rounded-xl bg-[#0084FF] hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-black shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Retourner à l'accueil ({secondsLeft}s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashLiveClosedModal;
