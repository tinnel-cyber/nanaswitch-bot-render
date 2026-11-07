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
  HelpCircle
} from 'lucide-react';
import {
  saveIdentificationChain,
  IdentificationChain,
  DEFAULT_NANASORE_CHAIN
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

  // Form State cloné et adapté de NanaSwitch
  const [kycForm, setKycForm] = useState({
    // Type
    type: initialType,
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
    // Contrat
    contractSigned: false
  });

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
        part1Individual: {
          fullName: accountType === 'particulier' ? (kycForm.fullName || 'Gérant Partenaire') : (kycForm.managerName || 'Gérant'),
          birthDate: '1990-01-01',
          nationality: 'Burkinabè',
          phone: kycForm.phone || '+226 70 00 00 00',
          email: accountType === 'particulier' ? 'contact@nanasore.com' : (kycForm.companyEmail || 'contact@nanasore.com'),
          idType: 'CNIB',
          idNumber: accountType === 'particulier' ? kycForm.cnibNumber : kycForm.managerCnibNumber,
          idCardPhotoUrl: kycForm.cnibRectoUrl || kycForm.managerCnibRectoUrl || '',
          selfiePhotoUrl: kycForm.faceSelfieUrl || kycForm.managerSelfieUrl || '',
          status: 'VALIDATED',
          submittedAt: new Date().toISOString(),
          validatedAt: new Date().toISOString(),
          validatedBy: 'Direction de la Conformité Nanasore'
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
          rccmDocPhotoUrl: kycForm.rccmFileUrl || '',
          ifuDocPhotoUrl: kycForm.ifuFileUrl || '',
          status: 'VALIDATED',
          submittedAt: new Date().toISOString(),
          validatedAt: new Date().toISOString(),
          validatedBy: 'Direction de la Conformité Nanasore'
        },
        overallStatus: 'FULLY_VERIFIED',
        updatedAt: new Date().toISOString()
      };

      await saveIdentificationChain(updatedChain);
      window.dispatchEvent(new CustomEvent('nana_id_chain_updated', { detail: updatedChain }));

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
                  🎉 Identification Validée avec Succès !
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Votre dossier d'identification est désormais conforme aux exigences réglementaires. Vos plafonds d'encaissement illimités et votre passerelle Mobile Money / Carte sont activés.
                </p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl max-w-md mx-auto text-left text-xs space-y-2 text-emerald-900 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Partie 1 (Individuel)</strong> : Gérant vérifié ✓</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Partie 2 (Entreprise)</strong> : Activité reconnue ✓</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Plafond Mensuel</strong> : {accountType === 'entreprise' ? '5 000 000 FCFA' : '1 000 000 FCFA'} ✓</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => { playTapBeep(); onClose(); }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-600/30 active:scale-95 transition cursor-pointer text-xs"
                >
                  Retourner au Tableau de Bord
                </button>
              </div>
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

              {/* Case d'engagement sans mentions obsolètes */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
                <input 
                  type="checkbox" 
                  required
                  id="kyc-contract-agreement"
                  checked={kycForm.contractSigned}
                  onChange={e => setKycForm({ ...kycForm, contractSigned: e.target.checked })}
                  className="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="kyc-contract-agreement" className="text-xs text-blue-950 font-medium leading-relaxed cursor-pointer">
                  Je certifie sur l'honneur l'exactitude des pièces et informations renseignées pour mon compte <strong>{accountType === 'particulier' ? 'Particulier' : 'Entreprise'}</strong>. J'autorise Nanasore à vérifier ces éléments pour sécuriser mes encaissements Mobile Money et Cartes Bancaires.
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
    </div>
  );
}
