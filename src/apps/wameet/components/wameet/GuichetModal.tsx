import React, { useState } from 'react';
import {
  DoorOpen,
  X,
  Sparkles,
  Coins,
  ShieldCheck,
  Check,
  Clock,
  Camera,
  Layers
} from 'lucide-react';
import { playTapBeep, playValidationBeep, playCashChime } from '../../../../utils/audio';

export interface GuichetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateGuichet: (data: {
    title: string;
    caption: string;
    mediaUrl: string;
    status: 'dispo' | 'business_idea' | 'coaching';
    consultationPrice?: number;
    durationMinutes: number;
  }) => void;
  defaultPrice?: number;
}

export const GuichetModal: React.FC<GuichetModalProps> = ({
  isOpen,
  onClose,
  onActivateGuichet,
  defaultPrice
}) => {
  const [title, setTitle] = useState('Consultation d\'Expertise');
  const [caption, setCaption] = useState('Je réponds à toutes vos questions en direct 1-to-1.');
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&auto=format&fit=crop&q=80');
  const [status, setStatus] = useState<'dispo' | 'business_idea' | 'coaching'>('coaching');
  const [priceInput, setPriceInput] = useState<string>(defaultPrice ? String(defaultPrice) : '15000');
  const [durationMinutes, setDurationMinutes] = useState(120);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    if (Number(priceInput) > 0) {
      try {
        playCashChime();
      } catch {}
    }

    const price = priceInput.trim() !== '' && !isNaN(Number(priceInput)) ? Number(priceInput) : undefined;

    onActivateGuichet({
      title: title.trim() || 'Guichet d\'Expert',
      caption: caption.trim() || 'Session d\'accompagnement en direct',
      mediaUrl: mediaUrl.trim() || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&auto=format&fit=crop&q=80',
      status,
      consultationPrice: price && price > 0 ? price : undefined,
      durationMinutes
    });

    onClose();
  };

  const parsedPrice = Number(priceInput);

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Élégant Bleu Royal */}
        <div className="bg-[#4169E1] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Ouvrir mon Guichet</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-[#4169E1] text-[10px] font-black uppercase">
                  Expert Live
                </span>
              </h3>
              <p className="text-[11px] text-blue-100">
                Configurez votre permanence et monétisez vos consultations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps du Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* 1. Type de Guichet */}
          <div>
            <label className="text-xs font-black text-slate-800 block mb-1.5">
              Type de Guichet / Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('coaching')}
                className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                  status === 'coaching'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 font-black ring-2 ring-purple-600/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="text-sm mb-1">🎓</div>
                <div className="text-[11px]">Coaching</div>
              </button>

              <button
                type="button"
                onClick={() => setStatus('dispo')}
                className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                  status === 'dispo'
                    ? 'border-green-600 bg-green-50 text-green-700 font-black ring-2 ring-green-600/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="text-sm mb-1">🟢</div>
                <div className="text-[11px]">Wameet Dispo</div>
              </button>

              <button
                type="button"
                onClick={() => setStatus('business_idea')}
                className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                  status === 'business_idea'
                    ? 'border-[#4169E1] bg-blue-50 text-[#4169E1] font-black ring-2 ring-[#4169E1]/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="text-sm mb-1">💡</div>
                <div className="text-[11px]">Idée Business</div>
              </button>
            </div>
          </div>

          {/* 2. CHAMP OPTIONNEL EXIGÉ : Tarif de la consultation (en FCFA) */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Tarif de la consultation (FCFA)</span>
              </label>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                Optionnel
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="500"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="Ex: 15000 (Laissez vide si gratuit)"
                className="w-full px-4 py-2.5 pr-16 rounded-xl bg-white border border-amber-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-700">
                FCFA
              </span>
            </div>

            {/* Explication du comportement */}
            <div className="text-[11px] text-amber-800 leading-snug space-y-1 pt-1">
              {parsedPrice > 0 ? (
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Votre Vitrine XXL affichera le badge :{' '}
                    <strong className="underline text-amber-950">
                      Premium - {parsedPrice.toLocaleString('fr-FR')} FCFA
                    </strong>
                    . Le salon vidéo Wameet sera verrouillé jusqu'au paiement Mobile Money.
                  </span>
                </div>
              ) : (
                <p className="text-slate-500">
                  Laissez ce champ vide pour proposer des consultations gratuites sans étape de paiement.
                </p>
              )}
            </div>
          </div>

          {/* 3. Titre et description de la session */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Thème de votre permanence :
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Stratégie E-commerce & Scaling Afrique"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#4169E1]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Message d'accueil pour vos visiteurs :
            </label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Présentez brièvement vos compétences..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#4169E1] resize-none"
            />
          </div>

          {/* 4. Durée d'ouverture (Timer FOMO) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4169E1]" />
              <span className="text-xs font-bold text-slate-800">Durée d'ouverture du guichet</span>
            </div>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
            >
              <option value={60}>1 heure</option>
              <option value={120}>2 heures</option>
              <option value={180}>3 heures</option>
              <option value={240}>4 heures</option>
            </select>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#4169E1] hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-[#4169E1]/30 transition cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ouvrir mon Guichet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuichetModal;
