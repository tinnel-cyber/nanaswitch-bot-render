import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Building,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Lock,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  GraduationCap,
  Store,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  submitAccountOpeningTunnel,
  getLocalUserLicense,
  saveLocalUserLicense,
  PricingModelTier,
  SubscriptionOptionTier,
} from '../../services/contextualLicensingService';

export interface AccountActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetModuleId?: string;
  targetModuleName?: string;
  userId?: string;
  onSuccess?: (result: any) => void;
}

export const AccountActivationModal: React.FC<AccountActivationModalProps> = ({
  isOpen,
  onClose,
  targetModuleId,
  targetModuleName,
  userId = 'current-user',
  onSuccess,
}) => {
  const currentLicense = getLocalUserLicense(userId);

  // Étape du tunnel : 'SELECT_BRANCH' | 'COMMISSION_FORM' | 'SUBSCRIPTION_FORM' | 'SUCCESS'
  const [step, setStep] = useState<'SELECT_BRANCH' | 'COMMISSION_FORM' | 'SUBSCRIPTION_FORM' | 'SUCCESS'>('SELECT_BRANCH');
  const [selectedBranch, setSelectedBranch] = useState<PricingModelTier>('commission');
  const [subscriptionOption, setSubscriptionOption] = useState<SubscriptionOptionTier>('caisse_vitrine');

  // Champs KYC Léger (Branche Commission)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [activityDomain, setActivityDomain] = useState('Commerce & Services');
  const [activityDescription, setActivityDescription] = useState('');
  const [idCardFile, setIdCardFile] = useState<string>('');
  const [photoCaptureFile, setPhotoCaptureFile] = useState<string>('');

  // Champs KYC Entreprise (Branche Abonnement)
  const [companyName, setCompanyName] = useState('');
  const [rccmNumber, setRccmNumber] = useState('');
  const [legalDocumentName, setLegalDocumentName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSimulateFileUpload = (type: 'id_card' | 'photo_capture' | 'legal_doc') => {
    // Simule une capture ou un téléversement de fichier
    const fakeUrl = `https://storage.nanasore.cloud/kyc/${type}_${Date.now()}.png`;
    if (type === 'id_card') setIdCardFile(fakeUrl);
    if (type === 'photo_capture') setPhotoCaptureFile(fakeUrl);
    if (type === 'legal_doc') setLegalDocumentName('Extrait_RCCM_Certifie.pdf');
  };

  const handleSubmitCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !paymentNumber.trim()) {
      setError('Veuillez remplir votre nom complet, email et numéro de paiement');
      return;
    }

    setLoading(true);
    try {
      const res = await submitAccountOpeningTunnel({
        userId,
        pricingModel: 'commission',
        subscriptionOption: null,
        kycData: {
          fullName,
          email,
          paymentNumber,
          activityDomain,
          activityDescription,
          idCardUrl: idCardFile || 'https://storage.nanasore.cloud/kyc/id_card_default.jpg',
          photoCaptureUrl: photoCaptureFile || 'https://storage.nanasore.cloud/kyc/selfie_default.jpg',
          submittedAt: new Date().toISOString(),
          lightKycValidatedWithoutRccm: true,
        },
      });

      setLoading(false);
      if (res.success) {
        setStep('SUCCESS');
        if (onSuccess) onSuccess(res);
      } else {
        setError(res.error || 'Erreur lors de la soumission du KYC léger');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Erreur réseau');
    }
  };

  const handleSubmitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || !email.trim()) {
      setError('Veuillez renseigner le nom de votre entreprise et votre email professionnel');
      return;
    }

    setLoading(true);
    try {
      const res = await submitAccountOpeningTunnel({
        userId,
        pricingModel: 'subscription',
        subscriptionOption,
        kycData: {
          companyName,
          rccmNumber: rccmNumber || 'RCCM-BF-OUA-2026-B-0129',
          legalDocuments: [legalDocumentName || 'Extrait_RCCM.pdf'],
          email,
          paymentNumber,
          activityDomain,
          activityDescription,
          submittedAt: new Date().toISOString(),
          enterpriseKycRequired: true,
        },
      });

      setLoading(false);
      if (res.success) {
        setStep('SUCCESS');
        if (onSuccess) onSuccess(res);
      } else {
        setError(res.error || 'Erreur lors de la validation de l’abonnement');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Erreur réseau');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999999] overflow-y-auto bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-2xl bg-[#1E1E2E] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal - Fixe et visible en permanence */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-[#161623] shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#4169E1]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Ouvrir mon compte Nanasore
                {targetModuleName && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-500/30">
                    Pour : {targetModuleName}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Licence contextuelle & validation d’accès aux modules métiers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable sans gel : flex-1 min-h-0 + scroll fluide */}
        <div 
          className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0 text-slate-200 overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/40"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* =========================================================================
              ÉTAPE 1 : CHOIX DE LA BRANCHE (COMMISSION VS ABONNEMENT)
             ========================================================================= */}
          {step === 'SELECT_BRANCH' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-white">Choisissez votre modèle d'ouverture de compte</h4>
                <p className="text-xs text-slate-400">
                  L'accès aux modules est configuré instantanément selon votre modèle d'activité
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* BRANCHE COMMISSION (Pay-as-you-go) */}
                <div
                  onClick={() => setSelectedBranch('commission')}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    selectedBranch === 'commission'
                      ? 'border-[#4169E1] bg-blue-950/30 shadow-lg shadow-blue-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        ⚡ Zéro Frais Fixes
                      </span>
                      {selectedBranch === 'commission' && (
                        <CheckCircle2 className="w-5 h-5 text-[#4169E1]" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-white">Branche Commission</h5>
                      <p className="text-xs text-slate-400 mt-1">
                        Idéal pour créateurs, formateurs et influenceurs (Pay-as-you-go).
                      </p>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-slate-300 border-t border-slate-800/80 pt-2">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>KYC Léger (Sans RCCM exigé)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Thème Digital Pro & Live Webinaire activés</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Thèmes E-commerce physique verrouillés</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranch('commission');
                      setStep('COMMISSION_FORM');
                    }}
                    className="mt-4 w-full py-2 bg-[#4169E1] hover:bg-blue-600 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1"
                  >
                    <span>Continuer avec KYC Léger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* BRANCHE ABONNEMENT (White-Label & POS) */}
                <div
                  onClick={() => setSelectedBranch('subscription')}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    selectedBranch === 'subscription'
                      ? 'border-[#4169E1] bg-blue-950/30 shadow-lg shadow-blue-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        🏢 Professionnel & Retail
                      </span>
                      {selectedBranch === 'subscription' && (
                        <CheckCircle2 className="w-5 h-5 text-[#4169E1]" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-white">Branche Abonnement</h5>
                      <p className="text-xs text-slate-400 mt-1">
                        Pour boutiques physiques, grandes vitrines et entreprises formelles.
                      </p>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-slate-300 border-t border-slate-800/80 pt-2">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>KYC Entreprise (RCCM & Pièces légales)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Option Caisse & Vitrine OU Formation</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>0% commission sur vos ventes directes</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranch('subscription');
                      setStep('SUBSCRIPTION_FORM');
                    }}
                    className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1 border border-slate-700"
                  >
                    <span>Choisir l'Abonnement</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* RAPPEL SUR L'ACCÈS SANS KYC */}
              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-3 mt-4">
                <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-200">
                    💡 Déjà disponible sans KYC (Offre Gratuite & Pay-As-You-Go) :
                  </p>
                  <p className="text-slate-400">
                    • <strong>2 Thèmes Inclus :</strong> Le thème <strong>Electro Pro</strong> et le thème <strong>Élite Default</strong>.<br />
                    • <strong>Produits supplémentaires :</strong> Vos 3 premiers produits sont gratuits ; chaque produit supplémentaire activé coûte <strong>1 000 FCFA</strong> débité de votre Wallet.<br />
                    • <strong>Tunnels de vente à l'usage :</strong> <strong>5 000 FCFA</strong> par tunnel haute conversion supplémentaire.<br />
                    • <strong>Modules Pay-As-You-Go :</strong> Générateur CV (500 F), Vidéos Pub IA (150 F), Signatures DocuSign (300 F).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              ÉTAPE 2A : FORMULAIRE KYC LÉGER (BRANCHE COMMISSION)
             ========================================================================= */}
          {step === 'COMMISSION_FORM' && (
            <form onSubmit={handleSubmitCommission} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('SELECT_BRANCH')}
                    className="text-xs text-blue-400 hover:underline cursor-pointer"
                  >
                    ← Changer de branche
                  </button>
                  <span className="text-slate-600">|</span>
                  <span className="text-xs font-bold text-emerald-400">
                    Formulaire KYC Léger (Sans RCCM)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Validation Super Admin
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom & Prénom <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Aminata Ouédraogo"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Adresse Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@exemple.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Numéro de Paiement Mobile Money <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    placeholder="+226 70 00 00 00 / Wave / Orange"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Domaine d'Activité
                  </label>
                  <select
                    value={activityDomain}
                    onChange={(e) => setActivityDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  >
                    <option value="Formation & Coaching">Formation, E-learning & Coaching</option>
                    <option value="Live Shopping & Création">Live Shopping & Création Digitale</option>
                    <option value="Services & Conseil">Services & Conseil Indépendant</option>
                    <option value="Produits Numériques">Produits Numériques & Logiciels</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description de votre activité commerciale
                </label>
                <textarea
                  rows={2}
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  placeholder="Décrivez brièvement les produits, formations ou lives que vous proposez..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                />
              </div>

              {/* Téléversement Pièce d'identité et Selfie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Pièce d'Identité (CNIB/Passeport)</span>
                    {idCardFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('id_card')}
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-blue-400" />
                    <span>{idCardFile ? 'Pièce jointe ajoutée ✓' : 'Téléverser ma pièce'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Photo Capture (Selfie)</span>
                    {photoCaptureFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('photo_capture')}
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-emerald-400" />
                    <span>{photoCaptureFile ? 'Photo enregistrée ✓' : 'Prendre ou joindre photo'}</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 text-[11px] text-blue-300">
                ℹ️ <strong>Effet de la Branche Commission :</strong> Débloque automatiquement le <strong>Thème Digital Pro</strong> et le <strong>Thème Live Webinaire</strong>. Les thèmes de boutiques physiques restent verrouillés.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#4169E1] hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {loading ? 'Soumission en cours...' : 'Soumettre mon KYC léger au Super Admin'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* =========================================================================
              ÉTAPE 2B : FORMULAIRE KYC ENTREPRISE (BRANCHE ABONNEMENT)
             ========================================================================= */}
          {step === 'SUBSCRIPTION_FORM' && (
            <form onSubmit={handleSubmitSubscription} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_BRANCH')}
                  className="text-xs text-blue-400 hover:underline cursor-pointer"
                >
                  ← Changer de branche
                </button>
                <span className="text-xs font-bold text-amber-400">
                  Abonnement Pro & KYC Entreprise
                </span>
              </div>

              {/* Choix de l'Option d'Abonnement */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Choisissez votre option d'Abonnement :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setSubscriptionOption('caisse_vitrine')}
                    className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                      subscriptionOption === 'caisse_vitrine'
                        ? 'border-[#4169E1] bg-blue-950/40 text-white'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-blue-400" />
                        Option Caisse & Vitrine
                      </span>
                      {subscriptionOption === 'caisse_vitrine' && (
                        <CheckCircle2 className="w-4 h-4 text-[#4169E1]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Active la caisse physique, les vitrines physiques et le Live Shopping. Verrouille le Thème Digital Pro.
                    </p>
                  </div>

                  <div
                    onClick={() => setSubscriptionOption('training')}
                    className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                      subscriptionOption === 'training'
                        ? 'border-[#4169E1] bg-blue-950/40 text-white'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                        Option Formation
                      </span>
                      {subscriptionOption === 'training' && (
                        <CheckCircle2 className="w-4 h-4 text-[#4169E1]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Spécifique E-learning & Masterclasses : désactive la caisse physique et la vitrine physique.
                    </p>
                  </div>
                </div>
              </div>

              {/* Champs KYC Entreprise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom de l'Entreprise / Société <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Nanasore Distribution SARL"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Numéro RCCM / IFU <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={rccmNumber}
                    onChange={(e) => setRccmNumber(e.target.value)}
                    placeholder="BF-OUA-2026-B-XXXX"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Professionnel <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="direction@entreprise.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Documents Légaux (RCCM, Statuts)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('legal_doc')}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>{legalDocumentName || 'Téléverser l’extrait RCCM (PDF)'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#4169E1] hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {loading ? 'Validation en cours...' : 'Valider l’Abonnement & Enregistrer le KYC Entreprise'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* =========================================================================
              ÉTAPE 3 : CONFIRMATION & SUCCÈS
             ========================================================================= */}
          {step === 'SUCCESS' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Demande enregistrée avec succès !</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Votre dossier a été soumis avec succès dans Supabase et transmis au Super Admin. Votre licence contextuelle a été appliquée immédiatement.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Modèle activé :</span>
                  <span className="font-bold text-white uppercase">{selectedBranch}</span>
                </div>
                {subscriptionOption && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Option :</span>
                    <span className="font-bold text-blue-400">{subscriptionOption}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-300">
                  <span>Statut KYC :</span>
                  <span className="font-bold text-emerald-400">
                    {selectedBranch === 'commission' ? 'Léger (Sans RCCM)' : 'Entreprise (Vérifié)'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#4169E1] hover:bg-blue-600 text-white font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Retourner aux Modules
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountActivationModal;
