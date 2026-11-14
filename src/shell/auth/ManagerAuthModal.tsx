import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  X, 
  Delete, 
  AlertTriangle, 
  Check, 
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCancelSound, playCashChime } from '../../utils/audio';
import { verifyMasterPin } from '../../utils/managerSecurityService';

export interface ManagerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  actionBadge?: string;
  masterPinHashOrCode?: string;
  maxAttempts?: number;
}

export const ManagerAuthModal: React.FC<ManagerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Autorisation Gérant Requise',
  description = 'Entrez votre code secret Master PIN (4 à 6 chiffres) pour valider cette opération.',
  actionBadge,
  masterPinHashOrCode,
  maxAttempts = 5,
}) => {
  const [pin, setPin] = useState<string>('');
  const [showClearPin, setShowClearPin] = useState<boolean>(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(maxAttempts);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Réinitialiser les états lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMessage(null);
      setIsShaking(false);
      setIsVerifying(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Gestion du décompte de verrouillage temporaire (30 secondes après 5 échecs)
  useEffect(() => {
    if (lockoutSeconds > 0) {
      lockoutTimerRef.current = setTimeout(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isLockedOut && lockoutSeconds === 0) {
      setIsLockedOut(false);
      setAttemptsLeft(maxAttempts);
      setErrorMessage(null);
    }
    return () => {
      if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
    };
  }, [lockoutSeconds, isLockedOut, maxAttempts]);

  const triggerShake = () => {
    setIsShaking(true);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => {
      setIsShaking(false);
    }, 600);
  };

  const handleValidatePin = useCallback(async (pinToValidate: string) => {
    if (isLockedOut || isVerifying || pinToValidate.trim().length < 4) return;

    setIsVerifying(true);
    try {
      const isValid = await verifyMasterPin(pinToValidate, masterPinHashOrCode);

      if (isValid) {
        playCashChime();
        setPin('');
        setErrorMessage(null);
        setAttemptsLeft(maxAttempts);
        onSuccess();
        onClose();
      } else {
        playCancelSound();
        triggerShake();
        setPin('');

        const nextAttempts = attemptsLeft - 1;
        setAttemptsLeft(nextAttempts);

        if (nextAttempts <= 0) {
          setIsLockedOut(true);
          setLockoutSeconds(30);
          setErrorMessage('Trop de tentatives incorrectes. Clavier bloqué pendant 30s.');
        } else {
          setErrorMessage(`Code secret incorrect (${nextAttempts} tentative${nextAttempts > 1 ? 's' : ''} restante${nextAttempts > 1 ? 's' : ''})`);
        }
      }
    } catch (e) {
      console.error('[MANAGER AUTH ERROR]', e);
      setErrorMessage('Erreur de vérification. Veuillez réessayer.');
    } finally {
      setIsVerifying(false);
    }
  }, [attemptsLeft, isLockedOut, isVerifying, masterPinHashOrCode, maxAttempts, onClose, onSuccess]);

  const handleDigit = (digit: string) => {
    if (isLockedOut || isVerifying) return;
    if (pin.length >= 12) return;

    playTapBeep();
    const next = pin + digit;
    setPin(next);
    setErrorMessage(null);

    // Si 6 chiffres saisis (longueur max standard d'un PIN), validation automatique si tout numérique
    if (next.length === 6 && /^\d+$/.test(next)) {
      handleValidatePin(next);
    }
  };

  const handleDelete = () => {
    if (isLockedOut || isVerifying) return;
    playTapBeep();
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    if (isLockedOut || isVerifying) return;
    playTapBeep();
    setPin('');
    setErrorMessage(null);
  };

  // Support clavier matériel (0-9, Backspace, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length >= 4) {
          handleValidatePin(pin);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, handleValidatePin, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-auth-title"
        className={`w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center relative transition-transform ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Bouton Fermer (Min 44x44 Touch Target) */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="absolute top-3 right-3 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95 touch-manipulation"
          title="Fermer"
          aria-label="Fermer l'authentification"
        >
          <X className="w-4 h-4" />
        </button>

        {/* En-tête avec Cadenas / Bouclier */}
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-3 shadow-lg shadow-indigo-600/20">
          <ShieldCheck className="w-7 h-7" />
        </div>

        {/* Badge d'action contextuel */}
        {actionBadge && (
          <span className="mb-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            {actionBadge}
          </span>
        )}

        <h2 id="manager-auth-title" className="text-base sm:text-lg font-black text-white text-center">
          {title}
        </h2>
        <p className="text-xs text-slate-400 text-center mt-1 px-2 leading-relaxed">
          {description}
        </p>

        {/* Champ de saisie direct (Code PIN ou Mot de passe) */}
        <div className="mt-4 mb-2 w-full max-w-[280px] relative">
          <input
            ref={inputRef}
            type={showClearPin ? "text" : "password"}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setErrorMessage(null);
            }}
            placeholder="Code PIN ou Mot de passe"
            autoComplete="current-password"
            disabled={isLockedOut || isVerifying}
            className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 rounded-2xl py-2.5 pl-4 pr-11 text-center font-mono text-base tracking-widest text-white placeholder:text-slate-500 placeholder:text-xs placeholder:tracking-normal outline-none transition shadow-inner disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowClearPin(!showClearPin)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition"
            title={showClearPin ? "Masquer" : "Afficher"}
          >
            {showClearPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Affichage des points masqués (••••••) si saisie numérique standard */}
        <div className="mb-3 flex items-center justify-center gap-2.5">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = idx < pin.length;
            const isFourToSixRange = idx >= 4;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 flex items-center justify-center ${
                  isFilled
                    ? 'bg-indigo-400 scale-110 shadow-md shadow-indigo-400/50'
                    : isFourToSixRange
                    ? 'border-2 border-dashed border-slate-700 bg-slate-800/40'
                    : 'border-2 border-slate-600 bg-slate-800'
                }`}
              >
                {isFilled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* Message d'erreur ou d'état */}
        <div className="h-6 flex items-center justify-center text-center px-2 mb-2">
          {isLockedOut ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Verrouillé : patientez {lockoutSeconds}s</span>
            </div>
          ) : errorMessage ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              {pin.length < 4
                ? 'Saisissez au moins 4 chiffres'
                : 'Appuyez sur Valider (✓) ou tapez Entrée'}
            </span>
          )}
        </div>

        {/* Pavé Numérique Tactile 0-9 */}
        <div className="w-full max-w-[280px] grid grid-cols-3 gap-2 sm:gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLockedOut || isVerifying}
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-white font-black text-lg flex items-center justify-center shadow-md active:scale-95 transition-all border border-slate-700/50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Touche C (Clear) */}
          <button
            type="button"
            disabled={isLockedOut || isVerifying || pin.length === 0}
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center shadow-md active:scale-95 transition-all border border-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Effacer tout"
          >
            C
          </button>

          {/* Touche 0 */}
          <button
            type="button"
            disabled={isLockedOut || isVerifying}
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-white font-black text-lg flex items-center justify-center shadow-md active:scale-95 transition-all border border-slate-700/50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            0
          </button>

          {/* Touche ⌫ (Backspace) */}
          <button
            type="button"
            disabled={isLockedOut || isVerifying || pin.length === 0}
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center shadow-md active:scale-95 transition-all border border-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Corriger le dernier chiffre"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Bouton de Validation Tactile */}
        <div className="w-full max-w-[280px] mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer text-center"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={isLockedOut || isVerifying || pin.length < 4}
            onClick={() => handleValidatePin(pin)}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:pointer-events-none"
          >
            {isVerifying ? (
              <span>Vérification...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Valider</span>
              </>
            )}
          </button>
        </div>

        {/* Note de sécurité */}
        <div className="mt-4 flex items-center gap-1 text-[10px] text-slate-400">
          <Lock className="w-3 h-3 text-indigo-400" />
          <span>Protection cryptographique SHA-256 Nanasore</span>
        </div>
      </div>
    </div>
  );
};

export default ManagerAuthModal;
