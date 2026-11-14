import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, KeyRound, X, Check, Lock, AlertCircle } from 'lucide-react';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';
import { promoteSuperAdminLocally } from '../../services/superAdminService';

interface SecretAdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SecretAdminAccessModal: React.FC<SecretAdminAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCodeInput('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = codeInput.trim();

    // Codes secrets autorisés pour le Super Admin (*#007#, 007, codes PIN, ou identifiants maîtres)
    const validCodes = [
      '*#007#', '007', '*#007', 'pousbila36@gmail.com', 'pousbila04@gmail.com', 
      'pousbila', 'pousbila04', 'admin2026', '2026', '1234', '7777', '8888', '0007', 'admin', 'superadmin', 'konkobo'
    ];

    if (validCodes.includes(cleanCode) || validCodes.includes(cleanCode.toLowerCase())) {
      playValidationBeep();
      promoteSuperAdminLocally('pousbila04-superadmin');
      onSuccess();
      onClose();
    } else {
      playCancelSound();
      setErrorMessage("Code d'accès incorrect.");
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div 
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-black text-base text-white">Accès Sécurisé</h3>
          <p className="text-xs text-slate-400">
            Veuillez saisir votre code d'accès administrateur
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="password"
              autoFocus
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Code d'accès"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 text-center font-mono font-bold tracking-widest text-sm text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              <span>Valider</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecretAdminAccessModal;
