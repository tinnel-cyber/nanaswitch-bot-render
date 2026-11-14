import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Building,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Store,
  ShoppingBag,
  Layers,
  HelpCircle,
  FileText,
  Camera,
} from 'lucide-react';
import {
  submitAccountOpeningTunnel,
  getLocalUserLicense,
  saveLocalUserLicense,
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

  // Étapes : 'SELECT_ACCOUNT_TYPE' | 'PARTICULIER_FORM' | 'ENTREPRISE_FORM' | 'SUCCESS'
  const [step, setStep] = useState<'SELECT_ACCOUNT_TYPE' | 'PARTICULIER_FORM' | 'ENTREPRISE_FORM' | 'SUCCESS'>('SELECT_ACCOUNT_TYPE');
  const [selectedAccountType, setSelectedAccountType] = useState<'particulier' | 'entreprise'>('particulier');

  // Champs KYC Particulier (Plafond 1 000 000 FCFA / mois - Sans RCCM)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [activityDomain, setActivityDomain] = useState('Commerce Physique & Boutique Caisse POS');
  const [activityDescription, setActivityDescription] = useState('');
  const [idCardFile, setIdCardFile] = useState<string>('');
  const [photoCaptureFile, setPhotoCaptureFile] = useState<string>('');

  // Champs KYC Entreprise (Plafond 5 000 000 FCFA / mois - RCCM & IFU requis)
  const [companyName, setCompanyName] = useState('');
  const [rccmNumber, setRccmNumber] = useState('');
  const [ifuNumber, setIfuNumber] = useState('');
  const [legalDocumentName, setLegalDocumentName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerIdCardFile, setManagerIdCardFile] = useState<string>('');
  const [managerPhotoFile, setManagerPhotoFile] = useState<string>('');
  const [companyEmail, setCompanyEmail] = useState('');

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

  const handleSimulateFileUpload = (type: 'id_card' | 'photo_capture' | 'legal_doc' | 'manager_id' | 'manager_selfie') => {
    const fakeUrl = `https://storage.nanasore.cloud/kyc/${type}_${Date.now()}.png`;
    if (type === 'id_card') setIdCardFile(fakeUrl);
    if (type === 'photo_capture') setPhotoCaptureFile(fakeUrl);
    if (type === 'legal_doc') setLegalDocumentName('Extrait_RCCM_Officiel.pdf');
    if (type === 'manager_id') setManagerIdCardFile(fakeUrl);
    if (type === 'manager_selfie') setManagerPhotoFile(fakeUrl);
  };

  const handleSubmitParticulier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !paymentNumber.trim()) {
      setError('Veuillez renseigner votre nom complet, votre email et votre numéro Mobile Money de reversement.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitAccountOpeningTunnel({
        userId,
        accountType: 'particulier',
        monthlyLimit: 1000000,
        pricingModel: 'commission',
        subscriptionOption: null,
        kycData: {
          accountType: 'particulier',
          monthlyLimit: 1000000,
          fullName,
          email,
          paymentNumber,
          activityDomain,
          activityDescription,
          idCardUrl: idCardFile || 'https://storage.nanasore.cloud/kyc/cnib_default.jpg',
          photoCaptureUrl: photoCaptureFile || 'https://storage.nanasore.cloud/kyc/selfie_default.jpg',
          submittedAt: new Date().toISOString(),
          lightKycValidatedWithoutRccm: true,
          enterpriseKycRequired: false,
        },
      });

      setLoading(false);
      if (res.success) {
        setStep('SUCCESS');
        if (onSuccess) onSuccess(res);
      } else {
        setError(res.error || 'Erreur lors de la soumission du KYC Particulier.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Erreur de connexion au serveur.');
    }
  };

  const handleSubmitEntreprise = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || !email.trim() || !rccmNumber.trim()) {
      setError('Veuillez renseigner la raison sociale, le numéro RCCM et l’email professionnel.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitAccountOpeningTunnel({
        userId,
        accountType: 'entreprise',
        monthlyLimit: 5000000,
        pricingModel: 'subscription',
        subscriptionOption: null,
        kycData: {
          accountType: 'entreprise',
          monthlyLimit: 5000000,
          companyName,
          rccmNumber,
          ifuNumber: ifuNumber || 'IFU-BF-00129384-M',
          legalDocuments: [legalDocumentName || 'Extrait_RCCM.pdf'],
          managerName: managerName || fullName,
          managerIdCardUrl: managerIdCardFile || idCardFile || 'https://storage.nanasore.cloud/kyc/gerant_cnib.jpg',
          managerPhotoUrl: managerPhotoFile || photoCaptureFile || 'https://storage.nanasore.cloud/kyc/gerant_selfie.jpg',
          email: companyEmail || email,
          paymentNumber,
          activityDomain,
          activityDescription,
          submittedAt: new Date().toISOString(),
          enterpriseKycRequired: true,
          lightKycValidatedWithoutRccm: false,
        },
      });

      setLoading(false);
      if (res.success) {
        setStep('SUCCESS');
        if (onSuccess) onSuccess(res);
      } else {
        setError(res.error || 'Erreur lors de la validation du KYC Entreprise.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Erreur de connexion au serveur.');
    }
  };

  const modalContent = (
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
                Identification Juridique & Conformité KYC
                {targetModuleName && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-500/30">
                    Pour : {targetModuleName}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Ouverture de compte pour encaissements légaux • Plafonds mensuels réglementaires
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

        {/* Corps défilable */}
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
              ÉTAPE 1 : CHOIX DU TYPE DE COMPTE (PARTICULIER 1M VS ENTREPRISE 5M)
             ========================================================================= */}
          {step === 'SELECT_ACCOUNT_TYPE' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-white">Choisissez votre type de compte pour les encaissements</h4>
                <p className="text-xs text-slate-400">
                  L'ouverture de compte est une démarche d'identification juridique (KYC) pour fixer votre plafond mensuel d'encaissement. Elle ne constitue pas une souscription de plan payant et ne donne pas accès gratuit aux modules payants.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* COMPTE PARTICULIER */}
                <div
                  onClick={() => setSelectedAccountType('particulier')}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    selectedAccountType === 'particulier'
                      ? 'border-[#4169E1] bg-blue-950/30 shadow-lg shadow-blue-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Plafond 1 000 000 FCFA / mois
                      </span>
                      {selectedAccountType === 'particulier' && (
                        <CheckCircle2 className="w-5 h-5 text-[#4169E1]" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-white flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        Compte Particulier
                      </h5>
                      <p className="text-xs text-slate-400 mt-1">
                        Pour personnes physiques : commerçants physiques (caisse POS, boutique), formateurs, vendeurs digitaux et indépendants.
                      </p>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-slate-300 border-t border-slate-800/80 pt-2">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Plafond : 1 000 000 FCFA d'encaissement mensuel</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>Pièce d'identité (CNIB ou Passeport) + Selfie direct</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>Numéro de versement Mobile Money</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Sans RCCM ni document de société exigé</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccountType('particulier');
                      setStep('PARTICULIER_FORM');
                    }}
                    className="mt-4 w-full py-2.5 bg-[#4169E1] hover:bg-blue-600 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Ouvrir mon Compte Particulier (1M F)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* COMPTE ENTREPRISE */}
                <div
                  onClick={() => setSelectedAccountType('entreprise')}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    selectedAccountType === 'entreprise'
                      ? 'border-[#4169E1] bg-blue-950/30 shadow-lg shadow-blue-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Plafond 5 000 000 FCFA / mois
                      </span>
                      {selectedAccountType === 'entreprise' && (
                        <CheckCircle2 className="w-5 h-5 text-[#4169E1]" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-white flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-400" />
                        Compte Entreprise
                      </h5>
                      <p className="text-xs text-slate-400 mt-1">
                        Pour personnes morales : Sociétés (SARL, SAS, SA), établissements commerciaux et organisations formelles.
                      </p>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-slate-300 border-t border-slate-800/80 pt-2">
                      <div className="flex items-center gap-1.5 text-blue-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Plafond : 5 000 000 FCFA d'encaissement mensuel</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                        <span>Extrait RCCM officiel & Numéro IFU</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                        <span>Pièce d'identité & Selfie du gérant titulaire</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Raison sociale & coordonnées bancaires / Mobile Money</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccountType('entreprise');
                      setStep('ENTREPRISE_FORM');
                    }}
                    className="mt-4 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <span>Ouvrir mon Compte Entreprise (5M F)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* NOTE DE CLARIFICATION JURIDIQUE */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 mt-4">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-200">
                    Règles de conformité juridique et liberté d'activité :
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    • <strong>Polyvalence Particulier :</strong> Un compte Particulier validé peut exercer toute activité (commerçant physique avec caisse et boutique, vente en ligne, formations, prestations) jusqu'à concurrence du plafond mensuel légal de <strong>1 000 000 FCFA/mois</strong>.<br />
                    • <strong>Modules payants :</strong> L'ouverture de compte ne constitue pas une souscription à un plan payant et ne dispense pas des tarifs propres aux modules ou options payantes de la plateforme.<br />
                    • <strong>Plafond Entreprise :</strong> Pour encaisser au-delà de 1 000 000 FCFA et jusqu'à <strong>5 000 000 FCFA/mois</strong>, le dépôt du RCCM et de l'IFU est obligatoire conformément à la réglementation financière.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              ÉTAPE 2A : FORMULAIRE KYC PARTICULIER (PLAFOND 1 000 000 FCFA)
             ========================================================================= */}
          {step === 'PARTICULIER_FORM' && (
            <form onSubmit={handleSubmitParticulier} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('SELECT_ACCOUNT_TYPE')}
                    className="text-xs text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Changer de type de compte
                  </button>
                  <span className="text-slate-600">|</span>
                  <span className="text-xs font-bold text-emerald-400">
                    KYC Particulier (Plafond 1 000 000 FCFA / mois)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Sans RCCM
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom & Prénom (Personne physique) <span className="text-rose-400">*</span>
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
                    Adresse Email de Contact <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aminata@exemple.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Numéro de Reversement Mobile Money <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    placeholder="+226 70 00 00 00 (Orange / Moov / Wave)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Domaine d'Activité Prévu
                  </label>
                  <select
                    value={activityDomain}
                    onChange={(e) => setActivityDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  >
                    <option value="Commerce Physique & Boutique Caisse POS">Commerce Physique & Boutique (Caisse POS)</option>
                    <option value="Commerce en Ligne & E-commerce">Commerce en Ligne & E-commerce</option>
                    <option value="Formation, E-learning & Masterclass">Formation, E-learning & Masterclass</option>
                    <option value="Live Shopping & Création Digitale">Live Shopping & Vente en direct</option>
                    <option value="Services & Conseil Indépendant">Services, Prestations & Conseil</option>
                    <option value="Artisanat & Vente locale">Artisanat, Restauration & Vente locale</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Brève description de votre activité
                </label>
                <textarea
                  rows={2}
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  placeholder="Décrivez les produits physiques, services ou cours que vous commercialisez..."
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
                    <span>{idCardFile ? 'Pièce jointe enregistrée ✓' : 'Téléverser ma pièce'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Photo Capture (Selfie Direct)</span>
                    {photoCaptureFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('photo_capture')}
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera className="w-3 h-3 text-emerald-400" />
                    <span>{photoCaptureFile ? 'Photo enregistrée ✓' : 'Prendre ou joindre selfie'}</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300">
                ✓ <strong>Conformité Particulier :</strong> Plafond de 1 000 000 FCFA/mois activé. Vous pouvez librement opérer votre caisse physique, boutique, formations ou produits digitaux.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#4169E1] hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {loading ? 'Soumission en cours...' : 'Valider mon Compte Particulier (Plafond 1M FCFA/mois)'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* =========================================================================
              ÉTAPE 2B : FORMULAIRE KYC ENTREPRISE (PLAFOND 5 000 000 FCFA)
             ========================================================================= */}
          {step === 'ENTREPRISE_FORM' && (
            <form onSubmit={handleSubmitEntreprise} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_ACCOUNT_TYPE')}
                  className="text-xs text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Changer de type de compte
                </button>
                <span className="text-xs font-bold text-blue-400">
                  KYC Entreprise (Plafond 5 000 000 FCFA / mois)
                </span>
              </div>

              {/* Champs Entreprise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Raison Sociale / Nom de l'Entreprise <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Nanasore Technologies SARL"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Numéro RCCM officiel <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
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
                    Numéro IFU (Identifiant Fiscal Unique)
                  </label>
                  <input
                    type="text"
                    value={ifuNumber}
                    onChange={(e) => setIfuNumber(e.target.value)}
                    placeholder="Ex: 00129384M"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom Complet du Gérant / Représentant Légal
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Nom du gérant titulaire"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Professionnel de l'Entreprise <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={companyEmail || email}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="direction@entreprise.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Numéro / RIB de Versement
                  </label>
                  <input
                    type="text"
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    placeholder="Numéro compte bancaire ou Mobile Money pro"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-[#4169E1] outline-hidden"
                  />
                </div>
              </div>

              {/* Justificatifs Légaux */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Extrait RCCM / Statuts (PDF/Image)</span>
                    {legalDocumentName && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('legal_doc')}
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>{legalDocumentName || 'Téléverser l’extrait RCCM'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Pièce d'Identité du Gérant</span>
                    {managerIdCardFile && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('manager_id')}
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-blue-400" />
                    <span>{managerIdCardFile ? 'CNIB du Gérant ajoutée ✓' : 'Joindre CNIB du gérant'}</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 text-[11px] text-blue-300">
                ✓ <strong>Conformité Entreprise :</strong> Débloque le plafond de 5 000 000 FCFA/mois pour l'ensemble des encaissements de la société.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#4169E1] hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {loading ? 'Validation en cours...' : 'Valider mon Compte Entreprise (Plafond 5M FCFA/mois)'}
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
                <h4 className="text-base font-bold text-white">Identification Juridique & Compte Enregistrés !</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Votre dossier KYC a été enregistré avec succès. Vos encaissements sont désormais autorisés dans le respect de la réglementation financière.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Type de compte :</span>
                  <span className="font-bold text-white uppercase">
                    {selectedAccountType === 'particulier' ? 'Compte Particulier' : 'Compte Entreprise'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Plafond d'encaissement :</span>
                  <span className="font-bold text-emerald-400">
                    {selectedAccountType === 'particulier' ? '1 000 000 FCFA / mois' : '5 000 000 FCFA / mois'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Statut de conformité :</span>
                  <span className="font-bold text-emerald-400">
                    {selectedAccountType === 'particulier' ? 'Validé (Pièce & Selfie)' : 'Validé (RCCM & Gérant)'}
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

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default AccountActivationModal;
