import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  ShieldCheck,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Compass
} from 'lucide-react';
import {
  useMysteryGiftGeolocation,
  GeolocationCoordinatesData
} from '../../../../hooks/useMysteryGiftGeolocation';
import { playValidationBeep, playTapBeep } from '../../../../utils/audio';

export interface GeolocationConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentGranted: (coords: GeolocationCoordinatesData) => void;
  senderName?: string;
  merchantName?: string;
  className?: string;
}

/**
 * MODALE ULTRA-CLEAN : Demande de Consentement GPS (Wameet Mystery Gift)
 * Directive Prompt 22 :
 * "Pour recevoir ce cadeau physique, le livreur a besoin de votre position. [Partager ma position]"
 * Utilise l'API HTML5 navigator.geolocation native avec gestion gracieuse des permissions et fallbacks.
 */
export const GeolocationConsentModal: React.FC<GeolocationConsentModalProps> = ({
  isOpen,
  onClose,
  onConsentGranted,
  senderName = 'Ibrahim',
  merchantName = 'Nanasore',
  className = ''
}) => {
  const {
    status,
    isLocating,
    errorMessage,
    requestLocation,
    simulateLocation,
    reset
  } = useMysteryGiftGeolocation();

  const [hasSucceeded, setHasSucceeded] = useState(false);

  if (!isOpen) return null;

  const handleShareLocation = async () => {
    try {
      playTapBeep();
    } catch {}

    try {
      const coords = await requestLocation();
      setHasSucceeded(true);
      try {
        playValidationBeep();
      } catch {}

      // Petite pause visuelle pour confirmer la coche verte avant de fermer la modale
      setTimeout(() => {
        onConsentGranted(coords);
        onClose();
        setHasSucceeded(false);
        reset();
      }, 700);
    } catch (err) {
      console.warn('Geolocation consent rejected or failed:', err);
    }
  };

  const handleSimulateFallback = () => {
    try {
      playValidationBeep();
    } catch {}
    const coords = simulateLocation();
    setHasSucceeded(true);
    setTimeout(() => {
      onConsentGranted(coords);
      onClose();
      setHasSucceeded(false);
      reset();
    }, 500);
  };

  const handleModalClose = () => {
    reset();
    setHasSucceeded(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gps-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={handleModalClose}
    >
      <div
        className={`relative w-full max-w-[360px] sm:max-w-[390px] rounded-[28px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-slate-800 shadow-2xl p-6 sm:p-7 text-center overflow-hidden transition-all duration-300 scale-100 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Halo décoratif d'arrière-plan */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-rose-400/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />

        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={handleModalClose}
          aria-label="Fermer la modale"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. VISUEL RADAR GPS & ICONOGRAPHIE HAUTE FIDÉLITÉ */}
        <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
          {/* Ondes radar concentriques pulsantes */}
          <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping opacity-75" />
          <span className="absolute -inset-2 rounded-full border border-rose-400/30 animate-pulse" />

          {/* Cercle central */}
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
            {isLocating ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : hasSucceeded ? (
              <CheckCircle2 className="w-8 h-8 animate-in zoom-in-75 text-white" />
            ) : (
              <Navigation className="w-8 h-8 -rotate-45" />
            )}
          </div>
        </div>

        {/* 2. BADGE & EN-TÊTE ÉPURÉ */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold tracking-wide uppercase mb-3">
          <Sparkles className="w-3 h-3 text-rose-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Livraison Physique • {merchantName}</span>
        </div>

        {/* 3. MESSAGE STRICT DU CONSENTEMENT (DIRECTIVE PROMPT 22) */}
        <h3
          id="gps-modal-title"
          className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug tracking-tight mb-2.5 px-1"
        >
          Pour recevoir ce cadeau physique, le livreur a besoin de votre position.
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5 px-2">
          {senderName} vous a commandé une surprise réelle. Votre position est transmise uniquement au coursier Nanasore en route.
        </p>

        {/* 4. GESTION DES ERREURS & MESSAGES D'ALERTE */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-left flex items-start gap-2.5 animate-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={handleSimulateFallback}
                className="mt-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 underline hover:no-underline cursor-pointer block"
              >
                ⚡ Utiliser la position approximative (Mode Démo)
              </button>
            </div>
          </div>
        )}

        {/* 5. BOUTON PRINCIPAL D'ACTION STRICT DU CONSENTEMENT */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={isLocating || hasSucceeded}
            onClick={handleShareLocation}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] text-white text-sm font-extrabold shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait border border-red-400/30"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Acquisition GPS haute précision...</span>
              </>
            ) : hasSucceeded ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Position validée !</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                <span>[Partager ma position]</span>
              </>
            )}
          </button>

          {/* Bouton d'annulation discret */}
          <button
            type="button"
            onClick={handleModalClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Plus tard / Annuler
          </button>
        </div>

        {/* 6. MENTION DE SÉCURITÉ & CONFIDENTIALITÉ */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Chiffrement de bout en bout Wameet • NaNa Express</span>
        </div>
      </div>
    </div>
  );
};

export default GeolocationConsentModal;
