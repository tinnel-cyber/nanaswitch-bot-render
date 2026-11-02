import React, { useState } from 'react';
import { X, Bell, CheckCircle2, MessageCircle, Mail, Sparkles } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

interface LiveAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
}

export const LiveAlertModal: React.FC<LiveAlertModalProps> = ({
  isOpen,
  onClose,
  storeName = 'Studio Broadcast'
}) => {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [contactValue, setContactValue] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValue.trim()) return;

    playValidationBeep();
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setContactValue('');
      onClose();
    }, 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-[#090A0F] border border-white/15 rounded-3xl p-6 text-white shadow-2xl shadow-indigo-950/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lueur d'ambiance d'arrière-plan */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-rose-600/15 blur-3xl pointer-events-none" />

        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">Rappel Activé !</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Vous recevrez le lien VIP du prochain Live direct sur votre {channel === 'whatsapp' ? 'WhatsApp' : 'Email'} avec les coupons exclusifs.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center justify-center shadow-inner">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Ne Manquez Aucun Live !
                </h3>
                <p className="text-xs text-slate-400">
                  Soyez prévenu 15 min avant le début des ventes flash.
                </p>
              </div>
            </div>

            {/* Sélecteur de canal (WhatsApp ou Email) */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  channel === 'email'
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>
            </div>

            {/* Formulaire de saisie */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  {channel === 'whatsapp' ? 'Votre Numéro WhatsApp (+225 / +226...)' : 'Votre Adresse Email'}
                </label>
                <input
                  type={channel === 'whatsapp' ? 'tel' : 'email'}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder={channel === 'whatsapp' ? '+225 07 00 00 00 00' : 'vous@exemple.com'}
                  required
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Zéro spam • Désinscription en 1 clic • Accès VIP gratuit</span>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-white live-btn-accent cursor-pointer active:scale-98 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>M'inscrire aux alertes Live</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
