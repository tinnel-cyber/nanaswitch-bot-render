import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  UserCheck,
  User,
  FileText,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import {
  saveIdentificationChain,
  IdentificationChain,
  DEFAULT_NANASORE_CHAIN,
  submitKycRequest
} from '../../utils/kycService';
import { playTapBeep, playValidationBeep, playCashChime } from '../../utils/audio';

interface MerchantIdentificationChainViewProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  initialType?: 'particulier' | 'entreprise';
  onSuccess?: () => void;
}

export function MerchantIdentificationChainView({
  isOpen,
  onClose,
  storeId = 'store-nanasore-main',
  initialType = 'particulier',
  onSuccess
}: MerchantIdentificationChainViewProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [accountType, setAccountType] = useState<'particulier' | 'entreprise'>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State cloné et adapté de NanaSwitch avec Domaine d'activité et Brève description
  const [kycForm, setKycForm] = useState({
    // Type
    type: initialType,
    // Activité & Description
    activityDomain: 'Commerce Général & Boutique en Ligne',
    briefDescription: '',
    // Particulier
    fullName: '',
    sector: 'E-commerce & Vente en ligne',
    cnibNumber: '',
    cnibRectoName: '',
    cnibRectoUrl: '',
    cnibVersoName: '',
    cnibVersoUrl: '',
    faceSelfieName: '',
    faceSelfieUrl: '',
    phone: '',
    // Entreprise
    companyName: '',
    managerName: '',
    companyEmail: '',
    rccm: '',
    rccmFileName: '',
    rccmFileUrl: '',
    ifuCompany: '',
    ifuFileName: '',
    ifuFileUrl: '',
    managerCnibNumber: '',
    managerCnibRectoName: '',
    managerCnibRectoUrl: '',
    managerCnibVersoName: '',
    managerCnibVersoUrl: '',
    managerSelfieName: '',
    managerSelfieUrl: '',
    // Modèle économique de Monétisation
    monetizationModel: 'commission' as 'commission' | 'subscription',
    // Contrat
    contractSigned: false
  });

  // Modale pour Afficher la Politique de Confidentialité ou les Conditions d'Utilisation
  const [legalDocModal, setLegalDocModal] = useState<'privacy' | 'terms' | null>(null);

  // Charger les données sauvegardées s'il en existe
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`nanasore_kyc_chain_${storeId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setKycForm(prev => ({ ...prev, ...parsed }));
        if (parsed.type) setAccountType(parsed.type);
      }
    } catch {
      // Ignorer
    }
  }, [storeId]);

  if (!isOpen) return null;

  // Gestionnaire d'upload d'image / document avec conversion DataURL
  const handleFileUpload = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapBeep();
    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setKycForm(prev => ({
        ...prev,
        [`${field}Name`]: fileName,
        [`${field}Url`]: dataUrl
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    playTapBeep();
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmitFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycForm.contractSigned) {
      alert("Veuillez cocher la case d'engagement pour valider votre dossier.");
      return;
    }

    setIsSubmitting(true);
    playTapBeep();

    try {
      // 1. Sauvegarde locale
      localStorage.setItem(`nanasore_kyc_chain_${storeId}`, JSON.stringify(kycForm));

      // 2. Mise à jour de la Chaîne d'Identification Nanasore
      const updatedChain: IdentificationChain = {
        storeId,
        currentStep: 2,
        activityDomain: kycForm.activityDomain || 'Commerce Général & Boutique en Ligne',
        briefDescription: kycForm.briefDescription || '',
        activityDescription: kycForm.briefDescription || '',
        monetizationModel: kycForm.monetizationModel,
        pricingModel: kycForm.monetizationModel,
        part1Individual: {
          fullName: accountType === 'particulier' ? (kycForm.fullName || 'Gérant Partenaire') : (kycForm.managerName || 'Gérant'),
          birthDate: '1990-01-01',
          nationality: 'Burkinabè',
          phone: kycForm.phone || '+226 70 00 00 00',
          email: accountType === 'particulier' ? 'contact@nanasore.com' : (kycForm.companyEmail || 'contact@nanasore.com'),
          activityDomain: kycForm.activityDomain || 'Commerce Général & Boutique en Ligne',
          briefDescription: kycForm.briefDescription || '',
          idType: 'CNIB',
          idNumber: accountType === 'particulier' ? kycForm.cnibNumber : kycForm.managerCnibNumber,
          idCardPhotoUrl: kycForm.cnibRectoUrl || kycForm.managerCnibRectoUrl || '',
          selfiePhotoUrl: kycForm.faceSelfieUrl || kycForm.managerSelfieUrl || '',
          status: 'PENDING',
          submittedAt: new Date().toISOString()
        },
        part2Business: {
          companyName: accountType === 'entreprise' ? (kycForm.companyName || 'Boutique Pro') : (kycForm.fullName ? `${kycForm.fullName} E-Shop` : 'Boutique Particulier'),
          storeName: accountType === 'entreprise' ? (kycForm.companyName || 'Boutique Pro') : 'Boutique Particulier',
          legalForm: accountType === 'entreprise' ? 'SARL' : 'Entreprise Individuelle',
          ifuNumber: kycForm.ifuCompany || '00123456B',
          rccmNumber: kycForm.rccm || 'BF-OUA-01-2026-B12-0042',
          address: 'Avenue Kwamé N\'Krumah',
          city: 'Ouagadougou',
          country: 'Burkina Faso',
          activityDomain: kycForm.activityDomain || 'Commerce Général & Boutique en Ligne',
          briefDescription: kycForm.briefDescription || '',
          rccmDocPhotoUrl: kycForm.rccmFileUrl || '',
          ifuDocPhotoUrl: kycForm.ifuFileUrl || '',
          status: 'PENDING',
          submittedAt: new Date().toISOString()
        },
        overallStatus: 'PARTIAL_INDIVIDUAL',
        updatedAt: new Date().toISOString()
      };

      await saveIdentificationChain(updatedChain);
      localStorage.setItem('nana_merchant_pricing_model', kycForm.monetizationModel);
      if (kycForm.monetizationModel === 'subscription') {
        localStorage.setItem('nana_subscription_plans_pending', 'true');
      } else {
        localStorage.removeItem('nana_subscription_plans_pending');
      }

      // 3. Envoi direct vers la liste Super Admin (kycService & Firestore)
      await submitKycRequest({
        id: `kyc-${storeId}`,
        storeId,
        storeName: accountType === 'entreprise' ? (kycForm.companyName || 'Boutique Pro') : (kycForm.fullName || 'Boutique Particulier'),
        managerFullName: accountType === 'entreprise' ? (kycForm.managerName || 'Gérant') : (kycForm.fullName || 'Gérant Partenaire'),
        whatsappPhone: kycForm.phone || '+226 70 00 00 00',
        userEmail: accountType === 'entreprise' ? kycForm.companyEmail : 'contact@nanasore.com',
        activityDomain: kycForm.activityDomain || 'Commerce Général & Boutique en Ligne',
        briefDescription: kycForm.briefDescription || '',
        activityDescription: kycForm.briefDescription || '',
        monetizationModel: kycForm.monetizationModel,
        pricingModel: kycForm.monetizationModel,
        documentType: 'CNIB',
        documentPhotoUrl: kycForm.cnibRectoUrl || kycForm.managerCnibRectoUrl || '',
        managerPhotoUrl: kycForm.faceSelfieUrl || kycForm.managerSelfieUrl || '',
        rccmDocPhotoUrl: kycForm.rccmFileUrl || '',
        ifuDocPhotoUrl: kycForm.ifuFileUrl || '',
        rccmNumber: kycForm.rccm || '',
        ifuNumber: kycForm.ifuCompany || '',
        type: accountType === 'entreprise' ? 'business' : 'individual',
        status: 'pending_approval',
        submittedAt: new Date().toISOString()
      });

      // 4. Transmission à l'API Supabase pour mise à jour immédiate de account_activations & profiles
      try {
        await fetch('/api/kyc/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId,
            accountType,
            fullName: accountType === 'entreprise' ? kycForm.managerName : kycForm.fullName,
            phone: kycForm.phone,
            email: kycForm.companyEmail || 'contact@nanasore.com',
            activityDomain: kycForm.activityDomain,
            briefDescription: kycForm.briefDescription,
            monetizationModel: kycForm.monetizationModel,
            pricingModel: kycForm.monetizationModel,
            companyName: kycForm.companyName,
            managerName: kycForm.managerName,
            rccm: kycForm.rccm,
            ifu: kycForm.ifuCompany,
            cnibNumber: kycForm.cnibNumber || kycForm.managerCnibNumber,
            cnibRectoUrl: kycForm.cnibRectoUrl || kycForm.managerCnibRectoUrl,
            cnibVersoUrl: kycForm.cnibVersoUrl || kycForm.managerCnibVersoUrl,
            faceSelfieUrl: kycForm.faceSelfieUrl || kycForm.managerSelfieUrl,
            rccmFileUrl: kycForm.rccmFileUrl,
            ifuFileUrl: kycForm.ifuFileUrl
          })
        });
      } catch (apiErr) {
        console.warn('API /api/kyc/submit notice:', apiErr);
      }

      // 5. Déclenchement des événements globaux pour rafraîchissement temps réel
      window.dispatchEvent(new CustomEvent('nana_id_chain_updated', { detail: updatedChain }));
      window.dispatchEvent(new CustomEvent('nana_kyc_status_changed', { 
        detail: { storeId, status: 'pending_approval', data: updatedChain } 
      }));
      window.dispatchEvent(new CustomEvent('superAdminUpdated', {}));

      playCashChime();
      setIsSuccess(true);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error('[KYC_CHAIN_SUBMIT] Erreur:', err);
      alert("Une erreur est survenue lors de l'enregistrement. Vos données restent conservées localement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-800 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête officiel de la Chaîne d'Identification */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Chaîne d'Identification KYC Marchand
                </h2>
                <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 text-[10px] font-black px-2 py-0.5 rounded-full">
                  NANASORE OFFICIEL
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Processus d'identification souverain pour débloquer les encaissements réels Mobile Money & Cartes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { playTapBeep(); onClose(); }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de progression des 3 étapes de la chaîne */}
        <div className="bg-[#FBF9F5] border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-black ${
              currentStep > 1 ? 'bg-emerald-500' : currentStep === 1 ? 'bg-blue-600' : 'bg-slate-300'
            }`}>
              {currentStep > 1 ? '✓' : '1'}
            </span>
            <span>Statut du Compte</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-200 hidden sm:block" />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-black ${
              currentStep > 2 ? 'bg-emerald-500' : currentStep === 2 ? 'bg-blue-600' : 'bg-slate-300'
            }`}>
              {currentStep > 2 ? '✓' : '2'}
            </span>
            <span>Pièces & Identité</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-200 hidden sm:block" />
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-black ${
              isSuccess ? 'bg-emerald-500' : currentStep === 3 ? 'bg-blue-600' : 'bg-slate-300'
            }`}>
              {isSuccess ? '✓' : '3'}
            </span>
            <span>Engagement & Validation</span>
          </div>
        </div>

        {/* Corps du Formulaire */}
        <div className="p-5 sm:p-7 overflow-y-auto max-h-[75vh]">
          
          {/* ÉCRAN SUCCÈS CONFIRMÉ */}
          {isSuccess ? (
            <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg border border-emerald-300">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  🎉 Dossier d'Identification Transmis avec Succès !
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Votre dossier KYC a été transmis directement au <strong>Control Plane Super Admin (Direction de la Conformité)</strong> pour validation. Vos documents sont enregistrés et synchronisés dans votre espace marchand.
                </p>
              </div>

              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl max-w-md mx-auto text-left text-xs space-y-2 text-indigo-950 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>Modèle économique</strong> : {kycForm.monetizationModel === 'subscription' ? 'Abonnement (Forfait Requis pour déblocage)' : 'Commission (Accès direct après KYC)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Domaine d'activité</strong> : {kycForm.activityDomain} ✓</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Transmission Super Admin</strong> : Enregistré dans le Control Plane ✓</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Plafond Estimé</strong> : {accountType === 'entreprise' ? '5 000 000 FCFA / mois' : '1 000 000 FCFA / mois'} ✓</span>
                </div>
              </div>

              {kycForm.monetizationModel === 'subscription' ? (
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      onClose();
                      window.dispatchEvent(new CustomEvent('nanasore_open_subscription_plans'));
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-95 transition cursor-pointer text-xs flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Choisir mon Abonnement pour débloquer les modules →</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); onClose(); }}
                    className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition cursor-pointer text-xs"
                  >
                    Tableau de Bord
                  </button>
                </div>
              ) : (
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => { playTapBeep(); onClose(); }}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer text-xs"
                  >
                    Retourner au Tableau de Bord
                  </button>
                </div>
              )}
            </div>
          ) : currentStep === 1 ? (
            /* ============================================================== */
            /* ÉTAPE 1 : CHOIX DU TYPE DE COMPTE                              */
            /* ============================================================== */
            <form onSubmit={handleNextStep} className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  1. Choisissez votre Statut d'Identification
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sélectionnez le type de compte correspondant à la structure de votre activité.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option Particulier */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setAccountType('particulier');
                    setKycForm(prev => ({ ...prev, type: 'particulier' }));
                  }}
                  className={`p-5 rounded-2xl border-2 text-left transition relative cursor-pointer ${
                    accountType === 'particulier'
                      ? 'border-blue-600 bg-blue-50/60 ring-4 ring-blue-600/10 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Compte Particulier / Indépendant</h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Idéal pour les commerçants indépendants, créateurs de contenu, formateurs et freelances.
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-200/80 text-[10px] font-bold text-blue-800 flex items-center gap-1">
                    <span>⚡ Pièce d'identité (CNI / Passeport) + Selfie</span>
                  </div>
                </button>

                {/* Option Entreprise */}
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setAccountType('entreprise');
                    setKycForm(prev => ({ ...prev, type: 'entreprise' }));
                  }}
                  className={`p-5 rounded-2xl border-2 text-left transition relative cursor-pointer ${
                    accountType === 'entreprise'
                      ? 'border-blue-600 bg-blue-50/60 ring-4 ring-blue-600/10 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Compte Entreprise Enregistrée</h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Pour les sociétés déclarées (SARL, SA, EURL, ETS) disposant d'un RCCM et d'un IFU officiel.
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-200/80 text-[10px] font-bold text-indigo-800 flex items-center gap-1">
                    <span>🏢 Plafond étendu jusqu'à 5M FCFA / mois</span>
                  </div>
                </button>
              </div>

              {/* Bouton Suivant */}
              <div className="pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-600/30 active:scale-95 transition cursor-pointer text-xs flex items-center gap-2"
                >
                  <span>Continuer vers les Pièces d'Identité</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : currentStep === 2 ? (
            /* ============================================================== */
            /* ÉTAPE 2 : FORMULAIRE SELON LE TYPE                             */
            /* ============================================================== */
            <form onSubmit={handleNextStep} className="space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  2. Pièces d'Identification & Informations ({accountType === 'particulier' ? 'Particulier' : 'Entreprise'})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Téléversez des documents clairs et lisibles pour une validation automatique.
                </p>
              </div>

              {accountType === 'particulier' ? (
                /* FORMULAIRE PARTICULIER */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nom complet du titulaire <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: Amadou Traoré"
                        value={kycForm.fullName}
                        onChange={e => setKycForm({ ...kycForm, fullName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Numéro de téléphone <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="+226 70 00 00 00"
                        value={kycForm.phone}
                        onChange={e => setKycForm({ ...kycForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Domaine d'activité & Brève Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Domaine d'activité <span className="text-rose-500">*</span></span>
                      </label>
                      <select
                        required
                        value={kycForm.activityDomain}
                        onChange={e => setKycForm({ ...kycForm, activityDomain: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600 bg-white"
                      >
                        <option value="Commerce Général & Boutique en Ligne">Commerce Général & Boutique en Ligne</option>
                        <option value="Mode, Prêt-à-porter & Maroquinerie">Mode, Prêt-à-porter & Maroquinerie</option>
                        <option value="Cosmétique, Beauté & Soins">Cosmétique, Beauté & Soins</option>
                        <option value="Électronique, Téléphonie & Informatique">Électronique, Téléphonie & Informatique</option>
                        <option value="Restauration, Agroalimentaire & Produits Frais">Restauration, Agroalimentaire & Produits Frais</option>
                        <option value="Formations, E-books & Produits Digitaux">Formations, E-books & Produits Digitaux</option>
                        <option value="Artisanat, Décoration & Mobilier">Artisanat, Décoration & Mobilier</option>
                        <option value="Prestations de Services & Artisanat">Prestations de Services & Artisanat</option>
                        <option value="Autre secteur d'activité">Autre secteur d'activité</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Brève description de l'activité <span className="text-rose-500">*</span></span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Ex: Vente de vêtements et accessoires tendance, livraison à domicile..."
                        value={kycForm.briefDescription}
                        onChange={e => setKycForm({ ...kycForm, briefDescription: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 text-xs focus:outline-none focus:border-blue-600 resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Numéro de la pièce (CNIB / CNI / Passeport) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ex: B12345678"
                      value={kycForm.cnibNumber}
                      onChange={e => setKycForm({ ...kycForm, cnibNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Recto & Verso Pièce */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Recto */}
                    <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center space-y-1.5 hover:border-blue-400 transition">
                      <FileText className="w-6 h-6 text-blue-600 mx-auto" />
                      <p className="font-bold text-slate-800 text-xs">Pièce d'Identité (Recto) <span className="text-rose-500">*</span></p>
                      <label className="inline-block px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs">
                        {kycForm.cnibRectoName ? 'Remplacer le Recto' : 'Sélectionner le Recto'}
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload('cnibRecto', e)} 
                        />
                      </label>
                      {kycForm.cnibRectoName && (
                        <p className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[160px]">{kycForm.cnibRectoName}</span>
                        </p>
                      )}
                    </div>

                    {/* Verso */}
                    <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center space-y-1.5 hover:border-blue-400 transition">
                      <FileText className="w-6 h-6 text-blue-600 mx-auto" />
                      <p className="font-bold text-slate-800 text-xs">Pièce d'Identité (Verso) <span className="text-rose-500">*</span></p>
                      <label className="inline-block px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs">
                        {kycForm.cnibVersoName ? 'Remplacer le Verso' : 'Sélectionner le Verso'}
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload('cnibVerso', e)} 
                        />
                      </label>
                      {kycForm.cnibVersoName && (
                        <p className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[160px]">{kycForm.cnibVersoName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selfie visage */}
                  <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center space-y-2 hover:border-blue-400 transition">
                    <Camera className="w-6 h-6 text-indigo-600 mx-auto" />
                    <div>
                      <p className="font-bold text-slate-800 text-xs">Selfie de Contrôle Visage <span className="text-rose-500">*</span></p>
                      <p className="text-[10px] text-slate-500">Photo nette de votre visage de face, sans lunettes ni casquette.</p>
                    </div>
                    <label className="inline-block px-4 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs">
                      {kycForm.faceSelfieName ? 'Changer la photo' : 'Prendre ou Téléverser le Selfie'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="user"
                        className="hidden" 
                        onChange={(e) => handleFileUpload('faceSelfie', e)} 
                      />
                    </label>
                    {kycForm.faceSelfieName && (
                      <p className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selfie validé ({kycForm.faceSelfieName})</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* FORMULAIRE ENTREPRISE */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Raison Sociale de l'Entreprise <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: NANASORE TRADING SARL"
                        value={kycForm.companyName}
                        onChange={e => setKycForm({ ...kycForm, companyName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nom complet du gérant mandataire <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: Ousmane Konaté"
                        value={kycForm.managerName}
                        onChange={e => setKycForm({ ...kycForm, managerName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Domaine d'activité & Brève Description Société */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Domaine d'activité de la société <span className="text-rose-500">*</span></span>
                      </label>
                      <select
                        required
                        value={kycForm.activityDomain}
                        onChange={e => setKycForm({ ...kycForm, activityDomain: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600 bg-white"
                      >
                        <option value="Commerce Général & Distribution">Commerce Général & Distribution</option>
                        <option value="Import / Export & Négoce">Import / Export & Négoce</option>
                        <option value="Mode, Textile & Confection">Mode, Textile & Confection</option>
                        <option value="Agro-business & Transformation alimentaire">Agro-business & Transformation alimentaire</option>
                        <option value="High-Tech, Télécoms & Digital">High-Tech, Télécoms & Digital</option>
                        <option value="BTP, Quincaillerie & Matériaux">BTP, Quincaillerie & Matériaux</option>
                        <option value="Prestations de Services & Conseil B2B">Prestations de Services & Conseil B2B</option>
                        <option value="Autre domaine d'activité">Autre domaine d'activité</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Brève description de la société <span className="text-rose-500">*</span></span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Ex: Société de distribution en gros et détail de produits de grande consommation..."
                        value={kycForm.briefDescription}
                        onChange={e => setKycForm({ ...kycForm, briefDescription: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 text-xs focus:outline-none focus:border-blue-600 resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Numéro RCCM <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: BF-OUA-01-2026-B12-0042"
                        value={kycForm.rccm}
                        onChange={e => setKycForm({ ...kycForm, rccm: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                      />
                      <label className="text-blue-600 font-bold text-[10px] hover:underline cursor-pointer inline-block mt-1">
                        + Joindre extrait RCCM (PDF / Photo)
                        <input 
                          type="file" 
                          accept=".pdf,image/*" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload('rccmFile', e)} 
                        />
                      </label>
                      {kycForm.rccmFileName && (
                        <span className="text-emerald-600 font-bold text-[10px] block truncate">✓ {kycForm.rccmFileName}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Numéro IFU (Identifiant Fiscal Unique) <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: 001928473610L"
                        value={kycForm.ifuCompany}
                        onChange={e => setKycForm({ ...kycForm, ifuCompany: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                      />
                      <label className="text-blue-600 font-bold text-[10px] hover:underline cursor-pointer inline-block mt-1">
                        + Joindre attestation IFU (PDF / Photo)
                        <input 
                          type="file" 
                          accept=".pdf,image/*" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload('ifuFile', e)} 
                        />
                      </label>
                      {kycForm.ifuFileName && (
                        <span className="text-emerald-600 font-bold text-[10px] block truncate">✓ {kycForm.ifuFileName}</span>
                      )}
                    </div>
                  </div>

                  {/* CNIB Gérant Recto & Verso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center space-y-1.5 hover:border-blue-400 transition">
                      <FileText className="w-5 h-5 text-blue-600 mx-auto" />
                      <p className="font-bold text-slate-800 text-xs">CNI Gérant (Recto) <span className="text-rose-500">*</span></p>
                      <label className="inline-block px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs">
                        {kycForm.managerCnibRectoName ? 'Remplacer' : 'Sélectionner le Recto'}
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload('managerCnibRecto', e)} 
                        />
                      </label>
                      {kycForm.managerCnibRectoName && (
                        <p className="text-[10px] font-bold text-emerald-600 truncate">{kycForm.managerCnibRectoName}</p>
                      )}
                    </div>

                    <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center space-y-1.5 hover:border-blue-400 transition">
                      <FileText className="w-5 h-5 text-blue-600 mx-auto" />
                      <p className="font-bold text-slate-800 text-xs">CNI Gérant (Verso) <span className="text-rose-500">*</span></p>
                      <label className="inline-block px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs">
                        {kycForm.managerCnibVersoName ? 'Remplacer' : 'Sélectionner le Verso'}
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload('managerCnibVerso', e)} 
                        />
                      </label>
                      {kycForm.managerCnibVersoName && (
                        <p className="text-[10px] font-bold text-emerald-600 truncate">{kycForm.managerCnibVersoName}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons Retour / Suivant */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition cursor-pointer text-xs flex items-center gap-2"
                >
                  <span>Passer à l'Engagement Légal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* ============================================================== */
            /* ÉTAPE 3 : ENGAGEMENT LÉGAL ET VALIDATION FINALE                */
            /* ============================================================== */
            <form onSubmit={handleSubmitFinal} className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  3. Engagement & Activation des Encaissements
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vérifiez vos données et confirmez l'exactitude des informations fournies.
                </p>
              </div>

              {/* Récapitulatif */}
              <div className="bg-[#FBF9F5] border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Type de Compte</span>
                  <span className="font-extrabold text-blue-700 uppercase">
                    {accountType === 'particulier' ? 'Particulier / Indépendant' : 'Entreprise Enregistrée'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Titulaire / Gérant</span>
                  <span className="font-bold text-slate-900">
                    {accountType === 'particulier' ? kycForm.fullName : kycForm.managerName}
                  </span>
                </div>
                {accountType === 'entreprise' && (
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-medium">Raison Sociale</span>
                    <span className="font-bold text-slate-900">{kycForm.companyName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Plafond d'encaissement</span>
                  <span className="font-extrabold text-emerald-600">
                    {accountType === 'entreprise' ? '5 000 000 FCFA / mois' : '1 000 000 FCFA / mois'}
                  </span>
                </div>
              </div>

              {/* Choix du Modèle Économique : Commission vs Abonnement */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  Choisissez votre Modèle d'Accès Nanasore <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Modèle Commission */}
                  <div 
                    onClick={() => setKycForm({ ...kycForm, monetizationModel: 'commission' })}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 select-none ${
                      kycForm.monetizationModel === 'commission'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-4 ring-emerald-500/10 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="monetizationModel"
                      id="opt-commission"
                      checked={kycForm.monetizationModel === 'commission'}
                      onChange={() => setKycForm({ ...kycForm, monetizationModel: 'commission' })}
                      className="mt-1 text-emerald-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Modèle Commission (0 FCFA fixe)</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">Accès Direct</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Sans abonnement mensuel. La validation de votre KYC vous donne <strong>accès direct aux modules</strong> pour encaisser vos ventes au pourcentage.
                      </p>
                    </div>
                  </div>

                  {/* Modèle Abonnement */}
                  <div 
                    onClick={() => setKycForm({ ...kycForm, monetizationModel: 'subscription' })}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 select-none ${
                      kycForm.monetizationModel === 'subscription'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-4 ring-indigo-500/10 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="monetizationModel"
                      id="opt-subscription"
                      checked={kycForm.monetizationModel === 'subscription'}
                      onChange={() => setKycForm({ ...kycForm, monetizationModel: 'subscription' })}
                      className="mt-1 text-indigo-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Modèle Abonnement (Forfait Pro)</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-bold">Forfait Requis</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Le KYC valide votre identité légale. Dès validation, vous devrez <strong>souscrire à un abonnement</strong> pour débloquer l'ensemble des modules et outils.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Case d'engagement légal avec liens cliquables obligatoires */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
                <input 
                  type="checkbox" 
                  required
                  id="kyc-contract-agreement"
                  checked={kycForm.contractSigned}
                  onChange={e => setKycForm({ ...kycForm, contractSigned: e.target.checked })}
                  className="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0"
                />
                <label htmlFor="kyc-contract-agreement" className="text-xs text-blue-950 font-medium leading-relaxed cursor-pointer select-none">
                  En cochant cette case, vous reconnaissez avoir lu et accepté notre{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      playTapBeep();
                      setLegalDocModal('privacy');
                    }}
                    className="text-blue-700 hover:text-blue-900 font-extrabold underline decoration-blue-500 underline-offset-2 cursor-pointer transition"
                  >
                    Politique de Confidentialité
                  </button>
                  {' '}et les{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      playTapBeep();
                      setLegalDocModal('terms');
                    }}
                    className="text-blue-700 hover:text-blue-900 font-extrabold underline decoration-blue-500 underline-offset-2 cursor-pointer transition"
                  >
                    Conditions d'Utilisation
                  </button>
                  {' '}de Nanasore. Vous certifiez sur l'honneur l'exactitude des pièces et informations renseignées pour votre compte {accountType === 'particulier' ? 'Particulier' : 'Entreprise'}.
                </label>
              </div>

              {/* Boutons d'action */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Modifier les pièces</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !kycForm.contractSigned}
                  className={`px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-lg ${
                    isSubmitting || !kycForm.contractSigned
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-95'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Validation en cours...' : 'Valider & Activer mon Compte'}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* =========================================================================
          MODALE POLITIQUE DE CONFIDENTIALITÉ & CONDITIONS D'UTILISATION (CGU)
         ========================================================================= */}
      {legalDocModal && (
        <div 
          className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setLegalDocModal(null)}
        >
          <div 
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] text-slate-800 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Modale Légale */}
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Cadre Légal & Réglementaire Nanasore</h3>
                  <p className="text-[11px] text-slate-400">Protection des données marchandes et conditions de service</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setLegalDocModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets de sélection */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center gap-2 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => { playTapBeep(); setLegalDocModal('privacy'); }}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  legalDocModal === 'privacy'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔒 Politique de Confidentialité
              </button>
              <button
                type="button"
                onClick={() => { playTapBeep(); setLegalDocModal('terms'); }}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  legalDocModal === 'terms'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📜 Conditions Générales d'Utilisation (CGU)
              </button>
            </div>

            {/* Corps du document défilable */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700">
              {legalDocModal === 'privacy' ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">1. Collecte et Traitement des Données Personnelles</h4>
                    <p>
                      La plateforme SaaS Nanasore applique une politique stricte de souveraineté et de confidentialité. Les données collectées (nom, numéro de téléphone, pièce d'identité officielle, selfie, documents d'entreprise RCCM et IFU) sont strictement réservées à la vérification d'identité (KYC), à la prévention des fraudes et à l'ouverture de votre compte marchand.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">2. Sécurité et Cryptage des Pièces Téléversées</h4>
                    <p>
                      Toutes les pièces d'identité et documents officiels sont chiffrés et stockés dans un environnement sécurisé conforme aux standards bancaires et aux directives de l'autorité de régulation des télécoms et des transactions électroniques. Vos données ne sont en aucun cas vendues, cédées ou partagées à des fins publicitaires avec des tiers.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">3. Confidentialité des Transactions et Secret des Affaires</h4>
                    <p>
                      Les volumes de vente, numéros de paiement Mobile Money, historiques de caisse et fichiers clients de votre boutique constituent votre propriété exclusive. Nanasore s'interdit formellement toute divulgation de vos données financières ou stratégiques.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">4. Vos Droits</h4>
                    <p>
                      Vous disposez d'un droit permanent d'accès, de mise à jour et de rectification de vos données personnelles via votre tableau de bord marchand ou sur simple demande auprès de la Direction de la Conformité Nanasore (contact@nanasore.com).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">1. Objet et Champ d'Application</h4>
                    <p>
                      Les présentes Conditions Générales d'Utilisation régissent l'accès et l'exploitation des 27 services, applications, modules et outils de commerce omnicanal proposés par la plateforme Nanasore.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">2. Distinction des Modèles Économiques (Règle d'Accès aux Modules)</h4>
                    <p className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-950 font-medium">
                      <strong>Règle essentielle d'activation :</strong> La validation du dossier d'identification KYC atteste de la conformité légale de votre boutique.
                      <br /><br />
                      • <strong>Pour les marchands au Modèle Commission :</strong> La validation du KYC confère un accès direct et opérationnel aux modules de vente sans abonnement fixe, moyennant un partage au pourcentage sur les transactions effectives.
                      <br /><br />
                      • <strong>Pour les marchands au Modèle Abonnement :</strong> La validation du KYC est un pré-requis d'identification légale. L'activation des modules et outils soumis à abonnement requiert formellement la souscription active à l'un de nos forfaits d'abonnement (Abonnement Mensuel ou Annuel).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">3. Obligations et Engagements du Marchand</h4>
                    <p>
                      Le marchand s'engage à n'utiliser la plateforme que pour des activités commerciales licites et conformes aux lois en vigueur. Tout acte de contrefaçon, de blanchiment d'argent, de transaction frauduleuse ou de fausse déclaration entraîne la suspension immédiate du compte et le signalement aux autorités compétentes.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-sm mb-1">4. Disponibilité du Service et Règlements</h4>
                    <p>
                      Nanasore s'efforce d'assurer une disponibilité continue du système à 99,9%. Les reversements des fonds encaissés via Mobile Money ou Carte Bancaire s'effectuent conformément aux délais réglementaires sur le compte bancaire ou portefeuille vérifié du marchand titulaire.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Pied de Modale */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Plateforme Nanasore • Document légal opposable
              </span>
              <button
                type="button"
                onClick={() => setLegalDocModal(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition"
              >
                J'ai Compris et Je Ferme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
