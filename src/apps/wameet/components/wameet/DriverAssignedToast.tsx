import React, { useState, useEffect, useRef } from 'react';
import { Bike, CheckCircle2, Phone, Clock, X, Navigation } from 'lucide-react';
import { playValidationBeep, playTapBeep } from '../../../../utils/audio';

export interface DriverAssignedData {
  orderId?: string;
  orderNumber?: string;
  driverName: string;
  driverPhone?: string;
  eta?: string;
  productName?: string;
  message?: string;
  timestamp?: number;
}

export interface DriverAssignedToastProps {
  /** Données de l'assignation du livreur */
  data?: DriverAssignedData | null;
  /** Indique si le toast est visible */
  isOpen?: boolean;
  /** Durée d'affichage avant fermeture automatique (défaut: 8000ms) */
  durationMs?: number;
  /** Callback lors de la fermeture */
  onClose?: () => void;
  className?: string;
}

/**
 * COMPOSANT DriverAssignedToast (Le Signal de Réconfort Client - "Wow Effect")
 * 
 * Directives Prompt 17 :
 * Déclenché en plein Live quand un livreur accepte le lot de l'acheteur.
 * Message : "✅ Génial ! Le livreur {driverName} vient de récupérer votre commande. Arrivée prévue dans 45 minutes !"
 */
export const DriverAssignedToast: React.FC<DriverAssignedToastProps> = ({
  data,
  isOpen = false,
  durationMs = 8000,
  onClose,
  className = ''
}) => {
  const [visible, setVisible] = useState(isOpen);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setVisible(isOpen);
    if (isOpen) {
      try {
        playValidationBeep();
      } catch {}

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, durationMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, durationMs, onClose]);

  if (!visible || !data) return null;

  const driverName = data.driverName || 'Moussa Express';
  const eta = data.eta || '45 minutes';

  return (
    <aside
      aria-label="Notification de prise en charge par le livreur"
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[94vw] sm:max-w-md w-full animate-in slide-in-from-top-4 duration-300 ${className}`}
    >
      <div className="relative group flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-lime-400/60 shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_20px_rgba(163,230,53,0.3)] text-white select-none">
        {/* Halo d'accentuation vert fluo */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-lime-500/10 via-emerald-500/5 to-teal-500/10 pointer-events-none" />

        {/* 1. Icône Livreur Moto animée */}
        <div className="relative shrink-0 w-11 h-11 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-black shadow-md">
          <Bike className="w-6 h-6 animate-bounce-subtle" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[8px] text-white font-bold">
            ✓
          </span>
        </div>

        {/* 2. Message de réconfort client */}
        <div className="flex-1 min-w-0 text-left leading-snug">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1">
              <span>✅ Génial !</span>
            </span>
            <span className="text-xs text-lime-300 font-extrabold truncate">
              Le livreur <span className="underline decoration-lime-400">{driverName}</span> vient de récupérer votre commande.
            </span>
          </div>

          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300 font-semibold flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/40 text-[10px] font-black">
              <Clock className="w-3 h-3" />
              <span>Arrivée prévue dans {eta} !</span>
            </span>
            {data.productName && (
              <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                {data.productName}
              </span>
            )}
          </div>
        </div>

        {/* 3. Actions Rapides : Appel Livreur & Fermer */}
        <div className="flex items-center gap-1 shrink-0">
          {data.driverPhone && (
            <a
              href={`tel:${data.driverPhone}`}
              onClick={() => playTapBeep()}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-lime-400 flex items-center justify-center transition cursor-pointer"
              title="Appeler le livreur"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              setVisible(false);
              if (onClose) onClose();
            }}
            className="w-7 h-7 rounded-xl bg-black/40 hover:bg-black/70 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Fermer la notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DriverAssignedToast;
