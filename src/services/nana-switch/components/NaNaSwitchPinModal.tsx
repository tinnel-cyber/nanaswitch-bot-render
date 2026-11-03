/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NaNaSwitch Cloud — Composant Universel de Clavier PIN à 4 Chiffres (NaNaSwitchPinModal)
 * Sécurité Bancaire Zero-Trust :
 * - 4 cercles lumineux indicateurs (○ ○ ○ ○ -> 🔵 🔵 🔵 🔵)
 * - Pavé numérique tactile & support du clavier physique
 * - Protection anti-bruteforce (blocage 30s après 3 échecs)
 * - Support des modes : 'verify' (vérification), 'setup' (création) et 'change' (modification)
 * - Chiffrement SHA-256 via hashPin & verifyPin
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Delete, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Sparkles,
  Zap
} from 'lucide-react';
import { hashPin, verifyPin, grantPinSession } from '../../../utils/nanaSwitchPinCrypto';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { NaNaSwitchLogo } from './NaNaSwitchLogo';

export type PinModalMode = 'verify' | 'setup' | 'change';

export interface NaNaSwitchPinModalProps {
  isOpen: boolean;
  mode?: PinModalMode;
  storedPinHash?: string;
  title?: string;
  description?: string;
  onSuccess: (newHash?: string) => void;
  onClose?: () => void;
  allowCancel?: boolean;
}

export const NaNaSwitchPinModal: React.FC<NaNaSwitchPinModalProps> = ({
  isOpen,
  mode = 'verify',
  storedPinHash,
  title,
  description,
  onSuccess,
  onClose,
  allowCancel = true
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  // Saisie actuelle (max 4 caractères)
  const [pin, setPin] = useState<string>('');

  // Mode 'setup' ou 'change' : étape de confirmation
  const [setupStep, setSetupStep] = useState<'enter_new' | 'confirm_new' | 'verify_old'>(() => {
    if (mode === 'change') return 'verify_old';
    return 'enter_new';
  });
  const [firstEnteredPin, setFirstEnteredPin] = useState<string>('');

  // Protection anti-bruteforce (3 essais -> 30 secondes lockout)
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Erreur & Succès
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccessAnim, setIsSuccessAnim] = useState<boolean>(false);

  // Réinitialisation de l'état quand la modale s'ouvre
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMessage(null);
      setIsSuccessAnim(false);
      if (mode === 'change') {
        setSetupStep('verify_old');
      } else {
        setSetupStep('enter_new');
      }
      setFirstEnteredPin('');
    }
  }, [isOpen, mode]);

  // Décompte de temporisation Anti-Bruteforce (30 secondes)
  useEffect(() => {
    let timer: any = null;
    if (lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [lockoutRemaining]);

  // =========================================================================
  // 2. VALIDATION DU PIN LORSQUE LES 4 CHIFFRES SONT SAISIS
  // =========================================================================

  const processFullPin = useCallback(async (fullPin: string) => {
    if (fullPin.length !== 4) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // ---------------------------------------------------------------------
      // CAS 1 : MODE VÉRIFICATION SIMPLE ('verify')
      // ---------------------------------------------------------------------
      if (mode === 'verify') {
        if (!storedPinHash) {
          // Aucun PIN configuré -> succès immédiat ou invite
          playValidationBeep();
          grantPinSession(10);
          setIsSuccessAnim(true);
          setTimeout(() => {
            onSuccess();
          }, 400);
          return;
        }

        const isValid = await verifyPin(fullPin, storedPinHash);
        if (isValid) {
          playValidationBeep();
          grantPinSession(10);
          setFailedAttempts(0);
          setIsSuccessAnim(true);
          setTimeout(() => {
            onSuccess();
          }, 400);
        } else {
          // Échec de vérification
          const nextFailed = failedAttempts + 1;
          setFailedAttempts(nextFailed);
          setPin('');
          if (nextFailed >= 3) {
            setLockoutRemaining(30);
            setErrorMessage('Trop de tentatives incorrectes. Clavier bloqué pendant 30 secondes.');
          } else {
            setErrorMessage(`Code PIN incorrect. ${3 - nextFailed} essai(s) restant(s).`);
          }
        }
        return;
      }

      // ---------------------------------------------------------------------
      // CAS 2 : MODE CRÉATION DE PIN ('setup')
      // ---------------------------------------------------------------------
      if (mode === 'setup') {
        if (setupStep === 'enter_new') {
          playTapBeep();
          setFirstEnteredPin(fullPin);
          setPin('');
          setSetupStep('confirm_new');
        } else if (setupStep === 'confirm_new') {
          if (fullPin === firstEnteredPin) {
            // Confirmation identique
            playValidationBeep();
            const newHash = await hashPin(fullPin);
            grantPinSession(10);
            setIsSuccessAnim(true);
            setTimeout(() => {
              onSuccess(newHash);
            }, 500);
          } else {
            // Mismatch
            setPin('');
            setErrorMessage('Les deux codes PIN ne correspondent pas. Veuillez recommencer.');
            setSetupStep('enter_new');
            setFirstEnteredPin('');
          }
        }
        return;
      }

      // ---------------------------------------------------------------------
      // CAS 3 : MODE MODIFICATION DE PIN ('change')
      // ---------------------------------------------------------------------
      if (mode === 'change') {
        if (setupStep === 'verify_old') {
          const isValidOld = storedPinHash ? await verifyPin(fullPin, storedPinHash) : true;
          if (isValidOld) {
            playTapBeep();
            setPin('');
            setSetupStep('enter_new');
          } else {
            setPin('');
            setErrorMessage('Ancien code PIN incorrect.');
          }
        } else if (setupStep === 'enter_new') {
          playTapBeep();
          setFirstEnteredPin(fullPin);
          setPin('');
          setSetupStep('confirm_new');
        } else if (setupStep === 'confirm_new') {
          if (fullPin === firstEnteredPin) {
            playValidationBeep();
            const newHash = await hashPin(fullPin);
            grantPinSession(10);
            setIsSuccessAnim(true);
            setTimeout(() => {
              onSuccess(newHash);
            }, 500);
          } else {
            setPin('');
            setErrorMessage('Les codes ne correspondent pas. Recommencez.');
            setSetupStep('enter_new');
          }
        }
      }

    } finally {
      setIsVerifying(false);
    }
  }, [mode, storedPinHash, failedAttempts, setupStep, firstEnteredPin, onSuccess]);

  // =========================================================================
  // 3. GESTION DES CLICS SUR LE PAVÉ NUMÉRIQUE & CLAVIER PHYSIQUE
  // =========================================================================

  const handleKeyPress = useCallback((digit: string) => {
    if (lockoutRemaining > 0 || isVerifying || isSuccessAnim) return;
    playTapBeep();

    setPin(prev => {
      if (prev.length >= 4) return prev;
      const next = prev + digit;
      if (next.length === 4) {
        setTimeout(() => {
          processFullPin(next);
        }, 50);
      }
      return next;
    });
  }, [lockoutRemaining, isVerifying, isSuccessAnim, processFullPin]);

  const handleDelete = useCallback(() => {
    if (lockoutRemaining > 0 || isVerifying || isSuccessAnim) return;
    playTapBeep();
    setErrorMessage(null);
    setPin(prev => prev.slice(0, -1));
  }, [lockoutRemaining, isVerifying, isSuccessAnim]);

  // Écouteur de clavier physique
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape' && allowCancel && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyPress, handleDelete, allowCancel, onClose]);

  if (!isOpen) return null;

  // Libellés d'affichage
  const displayTitle = title || (
    mode === 'setup'
      ? (setupStep === 'enter_new' ? 'Définir mon Code PIN Cloud' : 'Confirmer mon Code PIN')
      : mode === 'change'
      ? (setupStep === 'verify_old' ? 'Entrez l\'ancien Code PIN' : setupStep === 'enter_new' ? 'Nouveau Code PIN' : 'Confirmer le nouveau PIN')
      : 'Vérification de Sécurité'
  );

  const displaySubtitle = description || (
    mode === 'setup'
      ? (setupStep === 'enter_new' ? 'Choisissez 4 chiffres secrets pour sécuriser vos clés et connecteurs' : 'Retapez vos 4 chiffres pour confirmer')
      : mode === 'change'
      ? 'Verrouillage bancaire de vos connecteurs de production'
      : 'Entrez votre Code PIN à 4 chiffres pour déverrouiller cette action sensible'
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border-2 border-blue-600 animate-scaleUp relative flex flex-col items-center text-center">
        
        {/* Bouton Fermer (si autorisé) */}
        {allowCancel && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Annuler"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Emblème Officiel Le Cœur de Routage (variant="full" vertical) */}
        <div className="mb-3 flex flex-col items-center justify-center relative">
          {isSuccessAnim ? (
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-600/30 mb-1">
              <CheckCircle2 className="w-7 h-7 text-emerald-200 animate-bounce" />
            </div>
          ) : (
            <NaNaSwitchLogo variant="full" size="sm" theme="light" layout="vertical" />
          )}
        </div>

        {/* Titres */}
        <div className="space-y-1 mb-5">
          <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>NaNaSwitch Security PIN</span>
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {displayTitle}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            {displaySubtitle}
          </p>
        </div>

        {/* Les 4 Cercles Lumineux Indicateurs */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isSuccessAnim
                    ? 'bg-emerald-500 scale-125 shadow-md shadow-emerald-500/50'
                    : isFilled
                    ? 'bg-blue-600 scale-125 shadow-md shadow-blue-600/50'
                    : 'border-2 border-slate-300 bg-slate-100'
                }`}
              />
            );
          })}
        </div>

        {/* Message d'Erreur ou Alerte de Lockout */}
        {lockoutRemaining > 0 ? (
          <div className="w-full mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-800 animate-pulse">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Bloqué temporairement : {lockoutRemaining}s</span>
          </div>
        ) : errorMessage ? (
          <div className="w-full mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 animate-shake">
            {errorMessage}
          </div>
        ) : null}

        {/* Pavé Numérique Tactile (1 à 9, 0, Effacer) */}
        <div className="w-full max-w-[280px] grid grid-cols-3 gap-3 mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={lockoutRemaining > 0 || isVerifying || isSuccessAnim}
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 text-slate-900 hover:text-blue-700 text-xl font-black transition flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40 shadow-2xs"
            >
              {digit}
            </button>
          ))}

          {/* Touche Vide ou Annuler */}
          <div className="flex items-center justify-center">
            {allowCancel && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 py-2 px-3"
              >
                Annuler
              </button>
            )}
          </div>

          {/* Touche 0 */}
          <button
            type="button"
            disabled={lockoutRemaining > 0 || isVerifying || isSuccessAnim}
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 text-slate-900 hover:text-blue-700 text-xl font-black transition flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40 shadow-2xs"
          >
            0
          </button>

          {/* Touche Effacer ⌫ */}
          <button
            type="button"
            disabled={lockoutRemaining > 0 || isVerifying || isSuccessAnim || pin.length === 0}
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-600 transition flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40 shadow-2xs"
            title="Effacer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Note de Sécurité */}
        <div className="pt-3 text-[10px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Hachage cryptographique SHA-256 • Zéro stockage clair</span>
        </div>

      </div>
    </div>
  );
};

export default NaNaSwitchPinModal;
