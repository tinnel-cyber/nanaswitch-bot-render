import React, { useState, useEffect, useCallback } from 'react';
import { StoreUser, InventoryProduct, DebtCustomer, CompletedSale, DirectoryMerchantType } from '../../types';
import { formatCFA, playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';
import { 
  X, 
  Store, 
  User, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  LogOut, 
  Save, 
  TrendingUp, 
  Users, 
  Boxes, 
  Sparkles,
  CreditCard,
  ShieldAlert,
  ChevronRight,
  Sliders,
  KeyRound,
  Lock,
  Shield
} from 'lucide-react';
import { hashMasterPin, verifyMasterPin, generateStoreUniqueId } from '../../utils/managerSecurityService';
import { saveUserProfile } from '../../utils/firestoreService';
import { checkAndBlockDemoAction } from '../../utils/demoSecurityGuard';
import { updateStoreDirectorySettings, DIRECTORY_CATEGORIES } from '../../services/marketDirectoryService';

interface BoutiqueAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StoreUser | null;
  onUpdateUser: (updatedUser: StoreUser) => void;
  onLogout: () => void;
  onOpenSaasSuperAdmin?: () => void;
  onOpenSettings?: () => void;
  onSwitchStoreId?: (newStoreId: string, newStoreName?: string) => void;
  inventory: InventoryProduct[];
  customers: DebtCustomer[];
  sales: CompletedSale[];
}

export const BoutiqueAdminModal: React.FC<BoutiqueAdminModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  onOpenSaasSuperAdmin,
  onOpenSettings,
  onSwitchStoreId,
  inventory,
  customers,
  sales,
}) => {
  const [storeName, setStoreName] = useState(user?.storeName || '');
  const [userName, setUserName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [defaultCreditLimit, setDefaultCreditLimit] = useState(user?.defaultCreditLimit || 20000);
  const [pinCode, setPinCode] = useState(user?.pinCode || '1234');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedStoreId, setCopiedStoreId] = useState(false);
  const [copiedStoreUniqueId, setCopiedStoreUniqueId] = useState(false);
  const [customNewStoreId, setCustomNewStoreId] = useState('');
  const [showNewStoreInput, setShowNewStoreInput] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);

  // Master PIN (4 à 6 chiffres) pour actions sensibles
  const [showMasterPinChange, setShowMasterPinChange] = useState(false);
  const [currentMasterPinInput, setCurrentMasterPinInput] = useState('');
  const [newMasterPinInput, setNewMasterPinInput] = useState('');
  const [confirmMasterPinInput, setConfirmMasterPinInput] = useState('');
  const [masterPinError, setMasterPinError] = useState<string | null>(null);
  const [masterPinSuccess, setMasterPinSuccess] = useState<string | null>(null);
  const [isSavingMasterPin, setIsSavingMasterPin] = useState(false);

  // NaNa Market • Annuaire B2B2C des Boutiques & Formateurs
  const [isListedInDirectory, setIsListedInDirectory] = useState<boolean>(user?.isListedInDirectory !== false);
  const [merchantType, setMerchantType] = useState<DirectoryMerchantType>(user?.merchantType || 'physical_store');
  const [category, setCategory] = useState<string>(user?.category || 'Électronique & High-Tech');
  const [searchTags, setSearchTags] = useState<string>((user?.searchTags || []).join(', '));
  const [quarter, setQuarter] = useState<string>(user?.quarter || '');

  // Identifiant unique normalisé (ex: STORE-BF-8924)
  const [storeUniqueId, setStoreUniqueId] = useState<string>(() => {
    return user?.storeUniqueId || generateStoreUniqueId(user?.city);
  });

  useEffect(() => {
    if (user) {
      setStoreName(user.storeName || '');
      setUserName(user.name || '');
      setPhone(user.phone || '');
      setCity(user.city || '');
      setDefaultCreditLimit(user.defaultCreditLimit || 20000);
      setPinCode(user.pinCode || '1234');
      setIsListedInDirectory(user.isListedInDirectory !== false);
      if (user.merchantType) setMerchantType(user.merchantType);
      if (user.category) setCategory(user.category);
      if (user.searchTags) setSearchTags(user.searchTags.join(', '));
      if (user.quarter) setQuarter(user.quarter);
      if (user.storeUniqueId) {
        setStoreUniqueId(user.storeUniqueId);
      }
    }
  }, [user]);

  const handleUpdateMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (checkAndBlockDemoAction(user)) return;
    setMasterPinError(null);
    setMasterPinSuccess(null);

    // 1. Vérification de l'ancien code si configuré
    const existingPin = user.masterPin || user.pinCode;
    if (existingPin) {
      const isValid = await verifyMasterPin(currentMasterPinInput, existingPin);
      if (!isValid) {
        playCancelSound();
        setMasterPinError('Ancien code Master PIN incorrect.');
        return;
      }
    }

    // 2. Validation du nouveau code PIN (4 à 6 chiffres)
    const cleanNewPin = newMasterPinInput.trim();
    if (cleanNewPin.length < 4 || cleanNewPin.length > 6 || !/^\d+$/.test(cleanNewPin)) {
      playCancelSound();
      setMasterPinError('Le nouveau Master PIN doit comporter 4 à 6 chiffres numériques.');
      return;
    }

    // 3. Validation de la confirmation
    if (cleanNewPin !== confirmMasterPinInput.trim()) {
      playCancelSound();
      setMasterPinError('La confirmation ne correspond pas au nouveau code.');
      return;
    }

    // 4. Hachage sécurisé et persistance
    setIsSavingMasterPin(true);
    try {
      const hashedPin = await hashMasterPin(cleanNewPin);
      const now = Date.now();
      const updatedUser: StoreUser = {
        ...user,
        masterPin: hashedPin,
        pinConfiguredAt: now,
        storeUniqueId,
      };

      await saveUserProfile(user.id, {
        masterPin: hashedPin,
        pinConfiguredAt: now,
        storeUniqueId,
      });

      onUpdateUser(updatedUser);
      playValidationBeep();
      setMasterPinSuccess('Master PIN mis à jour avec succès !');
      setCurrentMasterPinInput('');
      setNewMasterPinInput('');
      setConfirmMasterPinInput('');
      setTimeout(() => {
        setMasterPinSuccess(null);
        setShowMasterPinChange(false);
      }, 2500);
    } catch (err) {
      console.error('Erreur mise à jour Master PIN :', err);
      setMasterPinError('Erreur lors de la sauvegarde du PIN.');
    } finally {
      setIsSavingMasterPin(false);
    }
  };

  const handleSecretTap = () => {
    if (!onOpenSaasSuperAdmin) return;
    const nextCount = adminTapCount + 1;
    if (nextCount >= 5) {
      setAdminTapCount(0);
      playValidationBeep();
      onClose();
      onOpenSaasSuperAdmin();
    } else {
      setAdminTapCount(nextCount);
    }
  };

  const handleCopyStoreId = () => {
    if (user?.storeId) {
      navigator.clipboard.writeText(user.storeId);
      setCopiedStoreId(true);
      playTapBeep();
      setTimeout(() => setCopiedStoreId(false), 2500);
    }
  };

  const handleSwitchStore = (newId: string, name?: string) => {
    if (onSwitchStoreId) {
      playValidationBeep();
      onSwitchStoreId(newId, name);
      onClose();
    }
  };

  // Quick statistics
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.total, 0);
  const totalDebt = customers.reduce((sum, c) => sum + c.totalDebt, 0);
  const totalProducts = inventory.length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (checkAndBlockDemoAction(user)) return;
    playValidationBeep();

    const tagsArray = searchTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const updated: StoreUser = {
      ...user,
      storeName: storeName.trim() || user.storeName,
      name: userName.trim() || user.name,
      phone: phone.trim(),
      city: city.trim(),
      defaultCreditLimit: Number(defaultCreditLimit) || 20000,
      pinCode: pinCode.trim() || user.pinCode || '1234',
      isListedInDirectory,
      merchantType,
      category,
      searchTags: tagsArray,
      quarter: quarter.trim()
    };

    onUpdateUser(updated);

    // Synchronisation Firestore asynchrone pour l'annuaire NaNa Market
    updateStoreDirectorySettings(
      user.storeId || user.id,
      {
        isListedInDirectory,
        merchantType,
        category,
        searchTags: tagsArray,
        quarter: quarter.trim(),
        city: city.trim()
      },
      user.id
    ).catch(err => console.warn('[DIRECTORY] Sync error :', err));

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header with Google User Profile Card */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg border-2 border-amber-400">
                  {user.name.charAt(0)}
                </div>
              )}
              {/* Google G badge */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 id="admin-dialog-title" className="text-base font-extrabold text-white leading-tight">
                  {user.name}
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  GÉRANT
                </span>
              </div>
              <p className="text-xs text-blue-300 font-mono truncate max-w-[200px]">{user.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playCancelSound();
              onClose();
            }}
            className="p-2 min-h-[44px] min-w-[44px] rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 touch-manipulation"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                Ventes
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5">
                {formatCFA(totalSalesAmount)}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-red-400" />
                Dettes
              </div>
              <div className="text-xs sm:text-sm font-black text-red-400 mt-0.5">
                {formatCFA(totalDebt)}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1">
                <Boxes className="w-3 h-3 text-blue-400" />
                Articles
              </div>
              <div className="text-xs sm:text-sm font-black text-blue-400 mt-0.5">
                {totalProducts} réf.
              </div>
            </div>
          </div>

          {/* Multi-Tenant Isolation & Store ID Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white">Isolation Multi-Tenant</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Firestore Isolé
              </span>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Identifiant Unique (Store ID)</div>
                <div className="font-mono text-sm font-black text-amber-300 select-all">
                  {user.storeId}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyStoreId}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer shrink-0"
              >
                {copiedStoreId ? '✓ Copié' : 'Copier ID'}
              </button>
            </div>

            {/* Identifiant Unique Boutique Public (Format STORE-BF-8924) */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <span>Identifiant Boutique Officiel</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">Standard Nanasore</span>
                </div>
                <div className="font-mono text-sm font-black text-white select-all mt-0.5">
                  {storeUniqueId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(storeUniqueId);
                  setCopiedStoreUniqueId(true);
                  playTapBeep();
                  setTimeout(() => setCopiedStoreUniqueId(false), 2500);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer shrink-0"
              >
                {copiedStoreUniqueId ? '✓ Copié' : 'Copier ID'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Toutes les requêtes Firestore (ventes, inventaire, clients, pertes) sont strictement partitionnées avec <code className="text-amber-300/90 font-mono text-[10px] bg-slate-950 px-1 py-0.5 rounded">where("storeId", "==", "{user.storeId}")</code>.
            </p>

            {/* Sélecteur de Boutique pour tester l'isolation */}
            {onSwitchStoreId && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Changer de Boutique (Tableau de bord dédié)</span>
                  <button
                    type="button"
                    onClick={() => setShowNewStoreInput(!showNewStoreInput)}
                    className="text-amber-400 hover:text-amber-300 text-[10px] underline cursor-pointer"
                  >
                    {showNewStoreInput ? 'Annuler' : '+ ID Personnalisé'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSwitchStore('store-nana-1', 'Alimentation Nana Treichville')}
                    className={`p-2 rounded-lg text-left text-xs border transition-all cursor-pointer ${
                      user.storeId === 'store-nana-1'
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold truncate text-[11px]">Treichville</div>
                    <div className="text-[9px] text-slate-400 font-mono">store-nana-1</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchStore('store-cocody-2', 'Superette Nana Cocody')}
                    className={`p-2 rounded-lg text-left text-xs border transition-all cursor-pointer ${
                      user.storeId === 'store-cocody-2'
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold truncate text-[11px]">Cocody Marché</div>
                    <div className="text-[9px] text-slate-400 font-mono">store-cocody-2</div>
                  </button>
                </div>

                {showNewStoreInput && (
                  <div className="mt-2 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="ex: store-plateau-03"
                      value={customNewStoreId}
                      onChange={(e) => setCustomNewStoreId(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none font-mono"
                    />
                    <button
                      type="button"
                      disabled={!customNewStoreId.trim()}
                      onClick={() => handleSwitchStore(customNewStoreId.trim())}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      Ouvrir
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form: Boutique & Admin Settings */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                Paramètres de l'établissement
              </span>
              <span className="text-[10px] text-slate-500">Google Sign-In actif</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Nom commercial de la Boutique
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nom du Gérant
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Téléphone (WhatsApp)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Ville / Quartier
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-red-400 rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Plafond Crédit Client (F CFA)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={defaultCreditLimit}
                  onChange={(e) => setDefaultCreditLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white outline-none font-bold text-amber-400"
                />
              </div>
            </div>

            {/* ============================================================ */}
            {/* ANNUAIRE PUBLIC DES BOUTIQUES (NANA MARKET B2B2C)           */}
            {/* ============================================================ */}
            <div className="p-3.5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 rounded-xl border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                    🏪
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">NaNa Market • Annuaire Public</h4>
                    <p className="text-[10px] text-slate-400">Visibilité dans le Centre Commercial Digital B2B2C</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isListedInDirectory}
                    onChange={(e) => setIsListedInDirectory(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {isListedInDirectory && (
                <div className="space-y-2.5 pt-1 border-t border-slate-800/80 animate-in fade-in duration-150">
                  {/* Choix du profil marchand (Boutique, Formateur, Événements) */}
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1.5">
                      Type de profil dans l'annuaire
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMerchantType('physical_store');
                          if (category === 'Formations & E-learning' || category === 'Webinaires & Lives') {
                            setCategory('Électronique & High-Tech');
                          }
                        }}
                        className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col gap-0.5 ${
                          merchantType === 'physical_store'
                            ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-xs ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs font-bold">🛍️ Produits</span>
                        <span className="text-[9px] text-slate-400">Boutique physique</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMerchantType('digital_creator');
                          setCategory('Formations & E-learning');
                        }}
                        className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col gap-0.5 ${
                          merchantType === 'digital_creator'
                            ? 'bg-purple-600/25 border-purple-500 text-white shadow-xs ring-1 ring-purple-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs font-bold">🎓 Formateur</span>
                        <span className="text-[9px] text-slate-400">Formations & E-learning</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMerchantType('event_host');
                          setCategory('Webinaires & Lives');
                        }}
                        className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col gap-0.5 ${
                          merchantType === 'event_host'
                            ? 'bg-rose-600/25 border-rose-500 text-white shadow-xs ring-1 ring-rose-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs font-bold">🔴 Événements</span>
                        <span className="text-[9px] text-slate-400">Lives & Webinaires</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                        Catégorie Principale
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        {DIRECTORY_CATEGORIES.filter(c => c !== 'Toutes les Catégories').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                        {merchantType === 'physical_store' ? 'Quartier / Commune' : 'Format / Précision'}
                      </label>
                      <input
                        type="text"
                        value={quarter}
                        onChange={(e) => setQuarter(e.target.value)}
                        placeholder={
                          merchantType === 'physical_store'
                            ? 'Ex: Cocody Angré, Ouaga 2000'
                            : merchantType === 'digital_creator'
                            ? 'Ex: 100% En Ligne, Zoom & Certificats'
                            : 'Ex: Live Streaming HD, Direct YouTube'
                        }
                        className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                      <span>Mots-clés de Recherche (searchTags)</span>
                      <span className="text-[9.5px] text-slate-500">Séparés par des virgules</span>
                    </label>
                    <input
                      type="text"
                      value={searchTags}
                      onChange={(e) => setSearchTags(e.target.value)}
                      placeholder="Ex: smartphones, iphone, ordinateurs, chargeurs, casques"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Les clients finaux trouveront votre boutique dès qu'ils taperont l'un de ces mots-clés dans la barre de recherche NaNa Market.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Code PIN de Caisse (4 Chiffres) */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Code PIN de Sécurité Caisse (4 chiffres)
                </span>
                <span className="text-[10px] text-slate-500">Protection session</span>
              </label>
              <input
                type="password"
                maxLength={4}
                value={pinCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  setPinCode(val);
                }}
                placeholder="Ex: 1234"
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white font-mono tracking-widest text-center font-bold outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Ce code PIN est demandé au démarrage, après 15 minutes d'inactivité ou lors du verrouillage manuel.
              </p>
            </div>

            {/* Code Secret Master PIN Gérant (4 à 6 chiffres) */}
            <div className="p-3 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 rounded-xl border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-amber-300">Master PIN Gérant (Protection Rôles)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setShowMasterPinChange(!showMasterPinChange);
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 cursor-pointer active:scale-95 transition-all"
                >
                  {showMasterPinChange ? 'Fermer' : 'Modifier le Master PIN'}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                Code secret confidentiel (4 à 6 chiffres) requis pour autoriser l'accès aux modules d'administration, d'inventaire, aux marges confidentielles et à l'annulation de tickets.
              </p>

              {showMasterPinChange && (
                <div className="pt-2 border-t border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                  {/* Ancien Master PIN */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Code Master PIN actuel
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={currentMasterPinInput}
                      onChange={(e) => setCurrentMasterPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Ex: 1234"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tracking-widest outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Nouveau Master PIN (4-6 chiffres)
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newMasterPinInput}
                        onChange={(e) => setNewMasterPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Ex: 8924"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tracking-widest outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Confirmer le code
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={confirmMasterPinInput}
                        onChange={(e) => setConfirmMasterPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Ex: 8924"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tracking-widest outline-none"
                      />
                    </div>
                  </div>

                  {masterPinError && (
                    <div className="p-1.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 text-[11px] font-semibold text-center">
                      {masterPinError}
                    </div>
                  )}

                  {masterPinSuccess && (
                    <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold text-center">
                      {masterPinSuccess}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isSavingMasterPin || newMasterPinInput.length < 4}
                    onClick={handleUpdateMasterPin}
                    className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isSavingMasterPin ? 'Sécurisation...' : 'Enregistrer le nouveau Master PIN'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Save feedback */}
            {saveSuccess && (
              <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold animate-in fade-in">
                ✓ Modifications de la boutique enregistrées avec succès !
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer les paramètres</span>
            </button>
          </form>

          {/* Modules Extensions & Intégrations (WooCommerce & SMS) */}
          {onOpenSettings && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  playValidationBeep();
                  onClose();
                  onOpenSettings();
                }}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 hover:from-blue-900 hover:to-slate-900 border border-blue-500/40 text-left flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-md group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      Paramètres & Extensions
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        WOOCOMMERCE & SMS
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Synchronisation stock Web, passerelle SMS & OTP
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Session & Logout Section */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span
                onClick={handleSecretTap}
                className="flex items-center gap-1 text-[11px] select-none cursor-default active:opacity-75 transition-opacity"
                title=""
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Compte Google synchronisé
              </span>
              <span className="text-[10px] text-slate-500 font-mono">ID: {user.id.slice(0, 14)}...</span>
            </div>

            <button
              type="button"
              onClick={() => {
                playCancelSound();
                onLogout();
              }}
              className="w-full py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 text-red-300 hover:text-red-100 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter de Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoutiqueAdminModal;
