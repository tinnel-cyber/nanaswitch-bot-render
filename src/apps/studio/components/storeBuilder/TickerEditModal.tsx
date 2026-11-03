import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, Zap, Sparkles, CreditCard, Truck, RefreshCw, Palette } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';

interface TickerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentText?: string;
  initialText?: string;
  currentGradient?: string;
  initialBgGradient?: string;
  isVisible?: boolean;
  initialShowTicker?: boolean;
  onSave: (newText: string, newGradient: string, isVisible: boolean) => void;
}

const GRADIENT_THEMES = [
  { id: 'amber', name: 'Ambre & Orange', class: 'from-amber-600 via-orange-600 to-amber-600', icon: '🔥' },
  { id: 'emerald', name: 'Émeraude & Vert', class: 'from-emerald-600 via-teal-600 to-emerald-600', icon: '🌿' },
  { id: 'indigo', name: 'Indigo & Violet', class: 'from-indigo-600 via-purple-600 to-indigo-600', icon: '💎' },
  { id: 'gold', name: 'Noir & Or Luxe', class: 'from-slate-900 via-amber-700 to-slate-900', icon: '✨' },
  { id: 'rose', name: 'Rubis & Framboise', class: 'from-rose-600 via-pink-600 to-rose-600', icon: '🎯' },
];

const QUICK_TAGS = [
  '💳 Paiement Wave',
  '🟠 Orange Money',
  '💵 Espèces à la livraison',
  '🚚 Livraison en 30 min',
  '⚡ Promo Flash',
  '✨ Nouveautés en stock',
  '📞 Commande 1-Clic WhatsApp',
  '🛡️ Fraîcheur 100% garantie',
];

const PRESET_MESSAGES = [
  {
    title: 'Moyens de Paiement & Livraison',
    text: '💳 PAIEMENT À LA RÉCEPTION : WAVE, ORANGE MONEY OU ESPÈCES • 🚚 LIVRAISON EXPRESS EN 30 MIN À DOMICILE & BUREAU • 📲 COMMANDEZ EN 1 CLIC SUR WHATSAPP'
  },
  {
    title: 'Offre Spéciale & Promotions',
    text: '⚡ PROMO FLASH : LIVRAISON OFFERTE DÈS 10 000 F CFA ! • 🏷️ REMISES SPÉCIALES SUR LES NOUVEAUTÉS • 💳 PAIEMENT SÉCURISÉ WAVE & ORANGE MONEY'
  },
  {
    title: 'Produits Frais & Disponibilité',
    text: '✨ ARRIVAGE DU JOUR EN STOCK • 🛡️ QUALITÉ & FRAÎCHEUR GARANTIES • 💳 RÈGLEMENT PAR WAVE, ORANGE MONEY OU CASH • COMMANDE 7J/7'
  }
];

export const TickerEditModal: React.FC<TickerEditModalProps> = ({
  isOpen,
  onClose,
  currentText,
  initialText,
  currentGradient,
  initialBgGradient,
  isVisible,
  initialShowTicker,
  onSave
}) => {
  const activeText = initialText ?? currentText ?? '';
  const activeGradient = initialBgGradient ?? currentGradient ?? 'from-amber-600 via-orange-600 to-amber-600';
  const activeVisible = initialShowTicker ?? isVisible ?? true;

  const [text, setText] = useState(activeText);
  const [gradient, setGradient] = useState(activeGradient);
  const [visible, setVisible] = useState(activeVisible);

  useEffect(() => {
    if (isOpen) {
      setText(initialText ?? currentText ?? '');
      setGradient(initialBgGradient ?? currentGradient ?? 'from-amber-600 via-orange-600 to-amber-600');
      setVisible(initialShowTicker ?? isVisible ?? true);
    }
  }, [isOpen, initialText, currentText, initialBgGradient, currentGradient, initialShowTicker, isVisible]);

  if (!isOpen) return null;

  const handleInsertTag = (tag: string) => {
    playTapBeep();
    setText(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      return `${trimmed} • ${tag}`;
    });
  };

  const handleApplyPreset = (presetText: string) => {
    playTapBeep();
    setText(presetText);
  };

  const handleSave = () => {
    playValidationBeep();
    onSave(text.trim() || currentText, gradient, visible);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* En-tête */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white">
                Bandeau Défilant & Moyens de Paiement
              </h3>
              <p className="text-[11px] text-slate-400">
                Personnalisez les messages promotionnels et les options de paiement
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { playTapBeep(); onClose(); }}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aperçu en direct du bandeau */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Aperçu en direct sur votre vitrine :
          </span>

          <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-2 text-white text-xs font-black shadow-md overflow-hidden whitespace-nowrap flex items-center gap-2 transition-all`}>
            <Zap className="w-4 h-4 text-amber-200 shrink-0 ml-1 animate-pulse" />
            <div className="inline-block animate-marquee uppercase tracking-wider font-extrabold text-[11px]">
              {text.trim() || '⚡ VOTRE MESSAGE DÉFILERA ICI...'}
            </div>
          </div>
        </div>

        {/* Activer / Masquer le bandeau */}
        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl">
          <div>
            <span className="text-xs font-bold text-white block">Afficher le bandeau sur la boutique</span>
            <span className="text-[10px] text-slate-400">Active ou désactive la barre défilante en haut du catalogue</span>
          </div>
          <button
            type="button"
            onClick={() => { playTapBeep(); setVisible(!visible); }}
            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer ${
              visible ? 'bg-emerald-600' : 'bg-slate-800'
            }`}
          >
            <div className={`w-5.5 h-5.5 rounded-full bg-white transition-transform ${
              visible ? 'translate-x-5.5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Zone de Texte Personnalisée */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">
            Texte du message défilant
          </label>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: 💳 PAIEMENT WAVE & ORANGE MONEY • LIVRAISON EN 30 MIN..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none leading-relaxed"
          />
        </div>

        {/* Raccourcis d'insertion 1-Clic */}
        <div className="space-y-1.5">
          <span className="text-[10.5px] font-bold text-slate-400">
            Ajouter un élément en 1 clic :
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleInsertTag(tag)}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-slate-700/60 transition cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Modèles Prédéfinis */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10.5px] font-bold text-slate-400">
            Ou choisir un modèle prêt à l'emploi :
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESET_MESSAGES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset.text)}
                className="p-2.5 bg-slate-950 hover:bg-slate-800/80 active:scale-95 border border-slate-800 rounded-xl text-left transition cursor-pointer group"
              >
                <div className="text-[10.5px] font-bold text-amber-400 group-hover:text-amber-300">
                  {preset.title}
                </div>
                <div className="text-[9.5px] text-slate-400 line-clamp-2 mt-0.5">
                  {preset.text}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thème Couleur du Dégradé */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1">
            <Palette className="w-3 h-3 text-indigo-400" />
            Style & Couleur du bandeau :
          </span>
          <div className="flex flex-wrap gap-2">
            {GRADIENT_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => { playTapBeep(); setGradient(theme.class); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  gradient === theme.class
                    ? 'border-white bg-slate-800 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{theme.icon}</span>
                <span className="text-[10.5px]">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Boutons d'Action */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => { playTapBeep(); onClose(); }}
            className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-95 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-2.5 rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Valider & Appliquer</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default TickerEditModal;
