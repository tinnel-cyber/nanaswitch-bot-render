import React, { useState, useEffect, useCallback } from 'react';
import { SellerUser, StoreUser, StoreSubscription } from '../../types';
import { playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';
import { isFreePlan, triggerProFeatureUpsell, getPlanLimits, triggerUpsellModal } from '../../utils/planFeatures';
import {
  Users,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  X,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Delete,
  Plus,
  UserCheck,
  UserX,
  Sparkles,
  Crown
} from 'lucide-react';

interface SellerSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellers: SellerUser[];
  activeSeller: SellerUser | null;
  onSelectSeller: (seller: SellerUser) => void;
  onLockSession: () => void;
  onAddSeller?: (seller: SellerUser) => void;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  isFreeAccount?: boolean;
}

export const SellerSwitchModal: React.FC<SellerSwitchModalProps> = ({
  isOpen,
  onClose,
  sellers,
  activeSeller,
  onSelectSeller,
  onLockSession,
  onAddSeller,
  currentUser,
  subscription,
  isFreeAccount = false
}) => {
  const isFree = isFreeAccount || isFreePlan(subscription || currentUser?.subscription);
  const planLimits = getPlanLimits(subscription || currentUser?.subscription);
  const maxCashiers = isFree ? 1 : (planLimits.maxCashiers ?? 2);
  const currentCashiersCount = sellers.length;
  const isCashierLimitReached = maxCashiers !== -1 && currentCashiersCount >= maxCashiers;

  // If user selected a seller to unlock with PIN
  const [selectedSellerForPin, setSelectedSellerForPin] = useState<SellerUser | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // New Seller form modal inside
  const [isAddingSeller, setIsAddingSeller] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'CAISSIER' | 'GERANT'>('CAISSIER');
  const [newPin, setNewPin] = useState('');
  const [newSignature, setNewSignature] = useState('');

  const handleOpenAddSeller = () => {
    playTapBeep();
    if (isFree && isCashierLimitReached) {
      const upgradeMsg = "Limite atteinte (1/1 caissier sur le Plan Découverte). Passez au Plan Starter ou Pro pour ajouter plusieurs caissiers.";
      setErrorMessage(upgradeMsg);
      triggerUpsellModal({
        mode: 'LIMIT_REACHED',
        limiterKey: 'CASHIERS',
        currentCount: currentCashiersCount,
        maxCount: 1,
        limiterItemName: 'caissier',
        recommendedPlan: 'starter',
        customTitle: 'Limite de caissiers atteinte',
        customMessage: upgradeMsg
      });
      return;
    }
    if (!isFree && isCashierLimitReached) {
      const upgradeMsg = `Limite atteinte (${currentCashiersCount}/${maxCashiers} caissiers). Passez à un plan supérieur pour ajouter plusieurs caissiers.`;
      setErrorMessage(upgradeMsg);
      triggerUpsellModal({
        mode: 'LIMIT_REACHED',
        limiterKey: 'CASHIERS',
        currentCount: currentCashiersCount,
        maxCount: maxCashiers,
        limiterItemName: 'caissier',
        recommendedPlan: 'pro',
        customTitle: 'Limite de caissiers atteinte',
        customMessage: upgradeMsg
      });
      return;
    }
    setErrorMessage(null);
    setIsAddingSeller(true);
  };

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedSellerForPin(null);
      setEnteredPin('');
      setErrorMessage(null);
      setIsAddingSeller(false);
    }
  }, [isOpen]);

  // Handle PIN character addition
  const handleDigitPress = (digit: string) => {
    if (enteredPin.length >= 4) return;
    playTapBeep();
    setErrorMessage(null);

    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    // Auto-verify on 4 digits
    if (nextPin.length === 4 && selectedSellerForPin) {
      if (nextPin === selectedSellerForPin.pinCode) {
        // Success
        playCashChime();
        onSelectSeller(selectedSellerForPin);
        onClose();
      } else {
        // Error
        setIsShaking(true);
        setErrorMessage('Code PIN incorrect. Veuillez réessayer.');
        setTimeout(() => {
          setEnteredPin('');
          setIsShaking(false);
        }, 600);
      }
    }
  };

  const handleDeleteDigit = () => {
    playTapBeep();
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClearPin = () => {
    playTapBeep();
    setEnteredPin('');
    setErrorMessage(null);
  };

  const handleSelectCard = (seller: SellerUser) => {
    playTapBeep();
    setSelectedSellerForPin(seller);
    setEnteredPin('');
    setErrorMessage(null);
  };

  const handleBackToList = () => {
    playTapBeep();
    setSelectedSellerForPin(null);
    setEnteredPin('');
    setErrorMessage(null);
  };

  const handleCreateSellerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPin.length !== 4) return;

    if (isCashierLimitReached) {
      const upgradeMsg = isFree
        ? "Limite atteinte (1/1 caissier sur le Plan Découverte). Passez au Plan Starter ou Pro pour ajouter plusieurs caissiers."
        : `Limite atteinte (${currentCashiersCount}/${maxCashiers} caissiers). Passez à un plan supérieur pour ajouter plusieurs caissiers.`;
      setErrorMessage(upgradeMsg);
      triggerUpsellModal({
        mode: 'LIMIT_REACHED',
        limiterKey: 'CASHIERS',
        currentCount: currentCashiersCount,
        maxCount: maxCashiers,
        limiterItemName: 'caissier',
        recommendedPlan: isFree ? 'starter' : 'pro',
        customTitle: 'Limite de caissiers atteinte',
        customMessage: upgradeMsg
      });
      return;
    }

    playValidationBeep();

    const initials = newName
      .trim()
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const signature = newSignature.trim() || `VND-${initials}${Math.floor(10 + Math.random() * 89)}`;

    const newSeller: SellerUser = {
      id: `seller-${Date.now()}`,
      name: newName.trim(),
      role: newRole,
      pinCode: newPin,
      signatureCode: signature,
      storeId: currentUser?.storeId || 'store-nana-1',
      active: true,
    };

    if (onAddSeller) {
      onAddSeller(newSeller);
    }
    setIsAddingSeller(false);
    setNewName('');
    setNewPin('');
    setNewSignature('');
    setSelectedSellerForPin(newSeller);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none overflow-y-auto">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/90 rounded-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Changement de Vendeur</h3>
              <p className="text-[11px] text-slate-400">
                Verrouillage & signature électronique des tickets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Seller Status Banner */}
        <div className="mt-3 p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeSeller ? (
              <>
                <div className="relative">
                  {activeSeller.avatarUrl ? (
                    <img
                      src={activeSeller.avatarUrl}
                      alt={activeSeller.name}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-400"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-500/40">
                      {activeSeller.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span>{activeSeller.name}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        activeSeller.role === 'GERANT'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {activeSeller.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Signature : {activeSeller.signatureCode}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
                <div>
                  <div className="text-xs font-bold text-amber-300">Caisse Verrouillée</div>
                  <div className="text-[10px] text-slate-400">Aucun vendeur identifié</div>
                </div>
              </div>
            )}
          </div>

          {activeSeller && (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                onLockSession();
              }}
              className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Verrouiller la caisse immédiatement"
            >
              <Lock className="w-3 h-3" />
              <span>Verrouiller</span>
            </button>
          )}
        </div>

        {/* VIEW 1: PIN ENTRY KEYPAD FOR SELECTED SELLER */}
        {selectedSellerForPin ? (
          <div className="mt-3 flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
            {/* Top Back bar */}
            <div className="w-full flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={handleBackToList}
                className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Tous les vendeurs</span>
              </button>
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                PIN démo : {selectedSellerForPin.pinCode}
              </span>
            </div>

            {/* Profile Avatar & Name */}
            <div className="text-center my-1">
              <div className="relative inline-block">
                {selectedSellerForPin.avatarUrl ? (
                  <img
                    src={selectedSellerForPin.avatarUrl}
                    alt={selectedSellerForPin.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-400 shadow-lg mx-auto"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center border-2 border-blue-400 shadow-lg mx-auto">
                    {selectedSellerForPin.name.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-900 border border-slate-700">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                </div>
              </div>
              <h4 className="font-extrabold text-sm text-white mt-1">
                {selectedSellerForPin.name}
              </h4>
              <p className="text-[11px] text-slate-400 font-mono">
                {selectedSellerForPin.role} • Réf : {selectedSellerForPin.signatureCode}
              </p>
            </div>

            {/* PIN Dots Display */}
            <div
              className={`my-3 flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border transition-all ${
                isShaking
                  ? 'border-rose-500 animate-shake'
                  : 'border-slate-800'
              }`}
            >
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = enteredPin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      isFilled
                        ? 'bg-blue-500 scale-110 shadow-sm shadow-blue-500/50 ring-2 ring-blue-400/40'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <p className="text-rose-400 text-xs font-bold mb-2 animate-in fade-in">
                {errorMessage}
              </p>
            )}

            {/* Tactile Keypad */}
            <div className="w-full max-w-[260px] grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-blue-600 active:text-white border border-slate-700 text-white font-mono font-black text-xl flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearPin}
                className="h-12 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-750 text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                Vider
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-blue-600 active:text-white border border-slate-700 text-white font-mono font-black text-xl flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDeleteDigit}
                className="h-12 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-750 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Effacer le dernier chiffre"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : isAddingSeller ? (
          /* VIEW 2: ADD NEW SELLER FORM */
          <form onSubmit={handleCreateSellerSubmit} className="mt-3 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                Nouveau profil vendeur
              </span>
              <button
                type="button"
                onClick={() => setIsAddingSeller(false)}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                Annuler
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Nom complet du vendeur :
              </label>
              <input
                type="text"
                required
                placeholder="Ex : Mariam Touré"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Rôle :
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'CAISSIER' | 'GERANT')}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="CAISSIER">Caissier(ère)</option>
                  <option value="GERANT">Gérant(e)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Code PIN (4 chiffres) :
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="Ex : 1234"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Code signature (automatique si vide) :
              </label>
              <input
                type="text"
                placeholder="Ex : VND-MT99"
                value={newSignature}
                onChange={(e) => setNewSignature(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-semibold focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddingSeller(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-750"
              >
                Retour
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 cursor-pointer"
              >
                Enregistrer & Activer
              </button>
            </div>
          </form>
        ) : (
          /* VIEW 3: LIST OF SELLERS CARDS */
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-0.5">
              <span>Sélectionnez votre profil :</span>
              <span>
                {sellers.length} {sellers.length > 1 ? 'vendeurs' : 'vendeur'}
                {isFree ? ' (1 max sur Plan Découverte)' : ''}
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
              {sellers.map((seller) => {
                const isActive = activeSeller?.id === seller.id;

                return (
                  <div
                    key={seller.id}
                    onClick={() => handleSelectCard(seller)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isActive
                        ? 'bg-blue-950/40 border-blue-500/70 shadow-md shadow-blue-950/50'
                        : 'bg-slate-850 hover:bg-slate-800 border-slate-750 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {seller.avatarUrl ? (
                          <img
                            src={seller.avatarUrl}
                            alt={seller.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-600"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center border border-blue-400">
                            {seller.name.charAt(0)}
                          </div>
                        )}
                        {isActive && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 flex items-center justify-center text-[7px] text-slate-950 font-black">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs sm:text-sm truncate">
                            {seller.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                              seller.role === 'GERANT'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {seller.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>Réf : {seller.signatureCode}</span>
                          <span>•</span>
                          <span className="text-slate-500">PIN : ••••</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isActive ? (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Actif</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1 border border-blue-400/40 shadow-sm"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>PIN</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message de limite / mise à niveau */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="leading-snug">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Quick Add Seller Button */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenAddSeller}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                  isFree && isCashierLimitReached
                    ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-500/40'
                    : isCashierLimitReached
                    ? 'bg-slate-800/80 text-amber-300 border-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-750 text-blue-300 hover:text-white border-slate-700'
                }`}
              >
                {isFree && isCashierLimitReached ? (
                  <>
                    <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Ajouter un Caissier (1/1 atteint)</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-500/30">PRO</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-blue-400" />
                    <span>Ajouter un Caissier</span>
                    {isFree && currentCashiersCount === 0 && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">
                        1 inclus (0/1)
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer info note */}
        <div className="mt-3 pt-2 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-slate-400" />
            <span>Chaque ticket émis est signé avec le code vendeur actif</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerSwitchModal;
