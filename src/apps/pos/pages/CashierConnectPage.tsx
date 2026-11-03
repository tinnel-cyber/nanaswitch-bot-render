import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  ArrowRight, 
  ArrowLeft, 
  Store, 
  Sparkles, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  RotateCcw,
  Delete
} from 'lucide-react';
import { verifyCashierPin, persistCashierSession } from '../../../services/cashierAuthService';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

interface CashierConnectPageProps {
  onSuccess?: (tenantId: string, caisseId: string) => void;
  onBackToHome?: () => void;
}

export const CashierConnectPage: React.FC<CashierConnectPageProps> = ({
  onSuccess,
  onBackToHome
}) => {
  const [pin, setPin] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [caisseId, setCaisseId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [showTenantInput, setShowTenantInput] = useState(false);

  // Redirection standard vers le Terminal POS
  const navigateToTerminal = useCallback((tid: string, cid: string) => {
    if (onSuccess) {
      onSuccess(tid, cid);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/pos/terminal');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onSuccess]);

  // CAS B : Détection automatique des paramètres URL (Lien unique ou scan QR Code)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlTenant = params.get('tenantId') || params.get('tenant') || params.get('storeId') || '';
    const urlCaisse = params.get('caisseId') || params.get('caisse') || '';
    const urlPin = params.get('pin') || params.get('code') || '';

    if (urlTenant) setTenantId(urlTenant);
    if (urlCaisse) setCaisseId(urlCaisse);
    if (urlPin) setPin(urlPin);

    // Auto-connexion instantanée si les 3 paramètres sont présents (Cas B)
    if (urlPin && urlTenant) {
      setIsAutoConnecting(true);
      verifyCashierPin(urlPin, urlTenant, urlCaisse).then((res) => {
        if (res.success && res.tenantId && res.caisseId) {
          playValidationBeep();
          setSuccessMessage(`Connexion réussie ! Bienvenue ${res.cashier?.name || 'Caissier'}`);
          setTimeout(() => {
            navigateToTerminal(res.tenantId!, res.caisseId!);
          }, 600);
        } else {
          setIsAutoConnecting(false);
          setErrorMessage(res.error || 'Impossible de se connecter automatiquement. Veuillez vérifier votre Code PIN.');
        }
      }).catch(() => {
        setIsAutoConnecting(false);
        setErrorMessage('Erreur réseau lors de la validation du lien unique.');
      });
    }
  }, [navigateToTerminal]);

  // Validation manuelle du Code PIN (Cas A)
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage('Veuillez saisir votre Code PIN Caisse.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await verifyCashierPin(pin, tenantId || null, caisseId || null);
      if (res.success && res.tenantId && res.caisseId) {
        playValidationBeep();
        setSuccessMessage(`Connexion réussie ! Bienvenue ${res.cashier?.name || 'Caissier'}`);
        setTimeout(() => {
          navigateToTerminal(res.tenantId!, res.caisseId!);
        }, 600);
      } else {
        setErrorMessage(res.error || 'Code PIN invalide.');
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('Une erreur est survenue lors de la vérification.');
      setIsLoading(false);
    }
  };

  // Clavier tactile interactif
  const handleKeyPress = (num: string) => {
    playTapBeep();
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setErrorMessage(null);
      // Auto-validation si 4 chiffres et pas d'autres données nécessaires
      if (newPin.length === 4 && !showTenantInput) {
        verifyCashierPin(newPin, tenantId || null, caisseId || null).then((res) => {
          if (res.success && res.tenantId && res.caisseId) {
            playValidationBeep();
            setSuccessMessage(`Connexion réussie ! Bienvenue ${res.cashier?.name || 'Caissier'}`);
            setTimeout(() => {
              navigateToTerminal(res.tenantId!, res.caisseId!);
            }, 600);
          }
        });
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

  const handleBack = () => {
    if (onBackToHome) {
      onBackToHome();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Top Navbar Épurée */}
      <header className="w-full bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 transition cursor-pointer text-slate-600 hover:text-slate-900 flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Accueil</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white font-black text-sm shadow-sm">
              N
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-[#0F172A] block leading-none">
                NANASORE
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Terminal POS
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Caisse En Ligne
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#FFFFFF] rounded-3xl border border-[#E2E8F0] shadow-xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1D4ED8]" />

          {/* En-tête */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1D4ED8] mb-3 shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
              Espace Caissier
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Entrez votre Code PIN Caisse pour ouvrir votre terminal de vente
            </p>
          </div>

          {/* Affichage État Auto-Connexion (Cas B) */}
          {isAutoConnecting && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center mb-6 animate-pulse">
              <div className="w-6 h-6 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-[#1D4ED8]">
                Connexion automatique sécurisée en cours...
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vérification du lien unique et des autorisations caisse
              </p>
            </div>
          )}

          {/* Message de Succès */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center mb-6 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs font-black text-emerald-800">{successMessage}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Ouverture du Terminal POS...</p>
            </div>
          )}

          {/* Message d'Erreur */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 mb-5 animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulaire & Clavier */}
          <form onSubmit={handleVerify} className="space-y-5">
            {/* Champ PIN Visual Dots */}
            <div>
              <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-150 ${
                        isFilled 
                          ? 'bg-[#1D4ED8] scale-110 shadow-sm' 
                          : 'bg-slate-200'
                      }`}
                    />
                  );
                })}
                {pin.length > 4 && (
                  <span className="text-xs font-mono font-bold text-[#1D4ED8]">
                    +{pin.length - 4}
                  </span>
                )}
              </div>
            </div>

            {/* Pavé Numérique Épuré */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="h-14 rounded-2xl bg-[#FFFFFF] hover:bg-slate-100 border border-[#E2E8F0] text-xl font-black text-[#0F172A] shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Effacer tout"
              >
                C
              </button>

              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-14 rounded-2xl bg-[#FFFFFF] hover:bg-slate-100 border border-[#E2E8F0] text-xl font-black text-[#0F172A] shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Effacer le dernier chiffre"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Options avancées (ID Boutique / Caisse spécifique) */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowTenantInput(!showTenantInput)}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                {showTenantInput ? 'Masquer identifiant boutique' : 'Boutique ou caisse spécifique ?'}
              </button>

              {showTenantInput && (
                <div className="mt-3 space-y-2 p-3 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-left animate-in fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Identifiant Boutique (Tenant ID)
                    </label>
                    <input
                      type="text"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      placeholder="Ex: boutique-akwaba ou store-123"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E2E8F0] bg-white text-slate-800 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Numéro ou Identifiant Caisse
                    </label>
                    <input
                      type="text"
                      value={caisseId}
                      onChange={(e) => setCaisseId(e.target.value)}
                      placeholder="Ex: caisse-01 ou comptoir-a"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E2E8F0] bg-white text-slate-800 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bouton Principal de Validation */}
            <button
              type="submit"
              disabled={isLoading || pin.length < 4}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                pin.length >= 4 && !isLoading
                  ? 'bg-[#1D4ED8] hover:bg-blue-800 shadow-blue-500/20 active:scale-95'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Vérification du PIN...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Valider et Ouvrir la Caisse</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Info Sécurité */}
          <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Chiffrement AES & Synchronisation Cloud Sécurisée</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-[#E2E8F0] bg-white">
        © {new Date().getFullYear()} Nanasore POS • Tous droits réservés
      </footer>
    </div>
  );
};

export default CashierConnectPage;
