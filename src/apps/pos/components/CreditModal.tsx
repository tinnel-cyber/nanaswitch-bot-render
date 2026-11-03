import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DebtCustomer, CartItem } from '../../../types';
import { formatCFA, playValidationBeep } from '../../../utils/audio';
import { UserCheck, Plus, X, Phone, User } from 'lucide-react';

interface CreditModalProps {
  total: number;
  cart: CartItem[];
  customers: DebtCustomer[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmCredit: (customerId: string | null, newCustomerName: string, phone: string, description: string) => void;
}

export const CreditModal: React.FC<CreditModalProps> = ({
  total,
  cart,
  customers,
  isOpen,
  onClose,
  onConfirmCredit,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customers[0]?.id || null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  if (!isOpen) return null;

  const itemSummary = cart.map(i => `${i.quantity}x ${i.name}`).join(', ');

  const handleValidate = () => {
    if (isCreatingNew) {
      if (!newCustomerName.trim()) return;
      playValidationBeep();
      onConfirmCredit(null, newCustomerName.trim(), newCustomerPhone.trim(), itemSummary);
    } else {
      if (!selectedCustomerId) return;
      playValidationBeep();
      onConfirmCredit(selectedCustomerId, '', '', itemSummary);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Attribuer à Crédit</h3>
              <p className="text-[11px] text-slate-400">Noter dans le Cahier de Dettes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-800 cursor-pointer active:scale-95 touch-manipulation"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Montant & Panier */}
        <div className="py-3 space-y-3">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Montant à inscrire
              </span>
              <div className="text-xl font-black text-rose-400 font-mono">
                {formatCFA(total)}
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400 max-w-[170px] truncate">
              {itemSummary || 'Vente en cours'}
            </div>
          </div>

          {/* Toggle Existing vs New Customer */}
          <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                !isCreatingNew ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Client Existant
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                isCreatingNew ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Nouveau Client
            </button>
          </div>

          {/* Customer Selection or Inputs */}
          {!isCreatingNew ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Sélectionnez le client :
              </label>
              {customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedCustomerId === c.id
                      ? 'bg-blue-950/60 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-xs">{c.name}</div>
                      {c.phone && <div className="text-[10px] text-slate-400">{c.phone}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Dette :</span>
                    <span className="font-mono font-bold text-xs text-rose-300 ml-1">
                      {formatCFA(c.totalDebt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-0.5">
                  Nom complet du client *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Seydou Koulibaly"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-0.5">
                  Téléphone / WhatsApp (facultatif)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="Ex: +225 07 00 00 00"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs cursor-pointer"
          >
            Annuler
          </button>
          <button
            id="btn-valider-credit-final"
            type="button"
            onClick={handleValidate}
            className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs tracking-wide shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
          >
            Noter au Cahier ({formatCFA(total)})
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditModal;
