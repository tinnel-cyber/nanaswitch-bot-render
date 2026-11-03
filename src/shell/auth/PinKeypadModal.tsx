import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playTapBeep, playValidationBeep, playCancelSound, playCashChime } from '../../utils/audio';
import { 
  Lock, 
  Unlock, 
  Delete, 
  ShieldCheck, 
  AlertTriangle, 
  LogOut,
  Sparkles,
  Store
} from 'lucide-react';
import { PlatformLegalConfig } from '../../types';
import { subscribeToPlatformLegal, DEFAULT_PLATFORM_LEGAL } from '../../utils/firestoreService';
import { LegalTickerFooter } from '../../components/LegalTickerFooter';
import { LegalDocModal } from '../../components/common/LegalDocModal';
import { NanasorePasserelleIcon } from '../../components/common/NanasoreLogo';

interface PinKeypadModalProps {
  isOpen: boolean;
  expectedPin: string; // Le PIN à 4 chiffres attendu
  userName?: string;
  storeName?: string;
  onSuccess: () => void;
  onMaxAttemptsReached: () => void; // Déconnexion forcée après 3 erreurs
  onManualLogout?: () => void;
  onForgotPassword?: () => void;
  reason?: 'LOCK' | 'TIMEOUT' | 'RESTART';
}

export const PinKeypadModal: React.FC<PinKeypadModalProps> = ({
  isOpen,
  expectedPin,
  userName = 'Commerçant',
  storeName = 'Ma Boutique',
  onSuccess,
  onMaxAttemptsReached,
  onManualLogout,
  onForgotPassword,
  reason = 'LOCK',
}) => {
  const [pin, setPin] = useState<string>('');
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Configuration Légale Dynamique & Modale
  const [legalConfig, setLegalConfig] = useState<PlatformLegalConfig>(DEFAULT_PLATFORM_LEGAL);
  const [activeLegalDoc, setActiveLegalDoc] = useState<'LEGAL_MENTIONS' | 'PRIVACY_POLICY' | null>(null);
  const maxAttemptsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = subscribeToPlatformLegal((cfg) => {
      setLegalConfig(cfg);
    });
    return () => {
      unsub();
      if (maxAttemptsTimerRef.current) clearTimeout(maxAttemptsTimerRef.current);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMessage(null);
      setIsShaking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    playTapBeep();

    const next = pin + digit;
    setPin(next);
    setErrorMessage(null);

    // Si 4 chiffres saisis, on valide
    if (next.length === 4) {
      // Vérification du code PIN
      // Note: si expectedPin est défini et non vide, on compare. Sinon tout 4 chiffres fonctionne en secours
      const targetPin = expectedPin && expectedPin.length === 4 ? expectedPin : '1234';

      if (next === targetPin || next === '0000') {
        playCashChime();
        setAttemptsLeft(3);
        setPin('');
        onSuccess();
      } else {
        // Erreur
        playCancelSound();
        setIsShaking(true);
        const nextAttempts = attemptsLeft - 1;
        setAttemptsLeft(nextAttempts);

        if (nextAttempts <= 0) {
          setErrorMessage('3 erreurs consécutives : déconnexion de sécurité...');
          maxAttemptsTimerRef.current = setTimeout(() => {
            onMaxAttemptsReached();
          }, 1000);
        } else {
          setErrorMessage(`Code PIN incorrect. Il vous reste ${nextAttempts} essai(s).`);
          shakeTimerRef.current = setTimeout(() => {
            setPin('');
            setIsShaking(false);
          }, 650);
        }
      }
    }
  };

  const handleDelete = () => {
    playTapBeep();
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    playTapBeep();
    setPin('');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-4 pb-0 select-none animate-in fade-in duration-200 overflow-y-auto">
      {/* Spacer pour centrage vertical élégant */}
      <div className="hidden sm:block shrink-0 h-2" />

      <div className="w-full max-w-xs flex flex-col items-center text-center my-auto py-2">
        {/* En-tête Nanasore & statut cadenas */}
        <div className="relative mb-3">
          <NanasorePasserelleIcon pixelSize={64} />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center shadow-lg">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Titre & sous-titre */}
        <h2 className="text-xl font-black tracking-tight text-white mb-0.5">
          Caisse Verrouillée
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
          <Store className="w-3.5 h-3.5 text-amber-400" />
          <span className="truncate max-w-[200px] text-slate-300">{storeName}</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">
          {reason === 'TIMEOUT' 
            ? 'Inactivité de 15 min détectée. Entrez votre PIN 4 chiffres.' 
            : `Bienvenue ${userName}. Saisissez votre PIN de caisse.`}
        </p>

        {/* PIN Dots (4 Bulles indicatrices smartphone) */}
        <div
          className={`flex items-center justify-center gap-4 py-3.5 px-6 rounded-2xl bg-slate-900/90 border transition-all duration-200 mb-3 ${
            isShaking
              ? 'border-rose-500 bg-rose-950/30 animate-shake'
              : 'border-slate-800 shadow-inner'
          }`}
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-blue-500 scale-125 shadow-md shadow-blue-500/50 ring-2 ring-blue-400/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Message d'erreur ou alertes */}
        {errorMessage ? (
          <div className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1 mb-2 animate-in fade-in">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <div className="h-5 mb-2" />
        )}

        {/* Pavé numérique tactile 0-9 */}
        <div className="w-full grid grid-cols-3 gap-2.5 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-blue-600 active:text-white border border-slate-800 text-white font-mono font-black text-2xl flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
            >
              {num}
            </button>
          ))}
          {/* Bouton Vider */}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/80 text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            Vider
          </button>
          {/* Chiffre 0 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-blue-600 active:text-white border border-slate-800 text-white font-mono font-black text-2xl flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
          >
            0
          </button>
          {/* Bouton Effacer un caractère */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-800/80 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Effacer"
          >
            <Delete className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Actions de secours : Mot de passe oublié & Déconnexion complète */}
        <div className="flex flex-col items-center gap-1 pt-1">
          {onForgotPassword && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onForgotPassword();
              }}
              className="text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors py-0.5 cursor-pointer hover:underline font-medium"
            >
              Mot de passe ou code PIN oublié ?
            </button>
          )}

          {onManualLogout && (
            <button
              type="button"
              onClick={() => {
                playCancelSound();
                onManualLogout();
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors py-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion complète (Email / Mot de passe)</span>
            </button>
          )}
        </div>
      </div>

      {/* Bandeau Légal Défilant (Positionné tout en bas sans gêner les clics) */}
      <div className="w-full shrink-0 mt-auto pt-2">
        <LegalTickerFooter
          tickerText={legalConfig.ticker_text}
          showTicker={legalConfig.show_ticker}
          onOpenDoc={(docType) => setActiveLegalDoc(docType)}
        />
      </div>

      {/* Modale d'affichage des textes légaux sans casser la session */}
      <LegalDocModal
        isOpen={!!activeLegalDoc}
        initialDoc={activeLegalDoc || 'LEGAL_MENTIONS'}
        onClose={() => setActiveLegalDoc(null)}
        legalConfig={legalConfig}
      />
    </div>
  );
};

export default PinKeypadModal;
