import React, { useState } from 'react';
import {
  X,
  Gift,
  Store,
  MapPin,
  Calendar,
  Check,
  ShieldCheck,
  Sparkles,
  Plane,
  Smartphone,
  Tv,
  Gamepad2,
  Watch
} from 'lucide-react';
import { NaNaPosGiftItem, NANA_POS_GIFT_CATALOG } from '../../../../../types/cagnotte';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface CreateCagnotteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGiftId?: string;
  onSelectGift: (gift: NaNaPosGiftItem, eventDate: string, eventLocation: string) => void;
}

export const CreateCagnotteModal: React.FC<CreateCagnotteModalProps> = ({
  isOpen,
  onClose,
  currentGiftId = 'gift_iphone_15_pro_max',
  onSelectGift
}) => {
  const [selectedGiftId, setSelectedGiftId] = useState<string>(currentGiftId);
  const [beneficiaryName, setBeneficiaryName] = useState('Sarah Kaboré');
  const [eventDate, setEventDate] = useState('Samedi 24 Octobre à 19h30');
  const [eventLocation, setEventLocation] = useState('Villa 42, Rue des Ambassades, Ouaga 2000');

  if (!isOpen) return null;

  const selectedGift = NANA_POS_GIFT_CATALOG.find((g) => g.id === selectedGiftId) || NANA_POS_GIFT_CATALOG[0];
  const fmt = (n: number) => n.toLocaleString('fr-FR');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    onSelectGift(selectedGift, eventDate, eventLocation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Sélectionner le Cadeau Nanasore
              </h2>
              <p className="text-xs text-slate-400">
                Inventaire certifié des commerçants du réseau Nanasore
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps Formulaire */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {/* Grille de sélection des cadeaux réels Nanasore */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              1. Choisissez un article réel parmi nos marchands partenaires
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NANA_POS_GIFT_CATALOG.map((item) => {
                const isSelected = item.id === selectedGiftId;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      playTapBeep();
                      setSelectedGiftId(item.id);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-400 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-800"
                    />

                    <div className="min-w-0 flex-1 flex flex-col justify-between text-xs">
                      <div>
                        {item.badge && (
                          <span className="text-[10px] font-bold text-amber-400 block mb-0.5 truncate">
                            {item.badge}
                          </span>
                        )}
                        <h4 className="font-bold text-slate-100 truncate text-[12px]">
                          {item.name}
                        </h4>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <Store className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{item.merchantName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80">
                        <span className="font-black text-emerald-400 text-xs">
                          {fmt(item.price)} FCFA
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Stock: {item.stock} dispo
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 rounded-full p-0.5 shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paramètres de l'événement / Fête */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300">
              2. Coordonnées de livraison à la fête
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Pour qui est ce cadeau ?</label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Date et heure de la fête</label>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">Lieu exact de livraison (Résidence / Fête)</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Résumé du Contrat Intelligent */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/30 text-xs space-y-1.5">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Garantie Contrat Intelligent Nanasore</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Dès que les contributions des membres atteindront les{' '}
              <strong className="text-emerald-400">{fmt(selectedGift.price)} FCFA</strong>, le paiement sera automatiquement viré sur le portefeuille de{' '}
              <strong className="text-white">{selectedGift.merchantName}</strong>.
              Aucun intermédiaire particulier ne touchera l'argent.
            </p>
          </div>

          {/* Bouton de Validation */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>Valider le cadeau : {selectedGift.name} ({fmt(selectedGift.price)} FCFA)</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCagnotteModal;
