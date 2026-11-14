import React, { useState, useRef, useEffect, useCallback } from 'react';
import { KycSubmission, KycDocumentType, KycStatus, StoreUser } from '../../../../types';
import { compressImageToBase64, submitKycRequest, getStoreKycRequest, submitKycSubmission } from '../../../../utils/kycService';
import { checkAndBlockDemoAction } from '../../../../utils/demoSecurityGuard';
import { playTapBeep, playValidationBeep, playCashChime, playCancelSound } from '../../../../utils/audio';
import { isSuperAdminLocally } from '../../../../services/superAdminService';
import { 
  ShieldCheck, 
  Upload, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText, 
  User, 
  Phone, 
  Clock, 
  ExternalLink,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

interface KycVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: StoreUser | null;
  storeId?: string;
  storeName?: string;
  managerName?: string;
  managerPhone?: string;
  currentSubmission?: KycSubmission | null;
  onSubmitted?: (submission: KycSubmission) => void;
  onKycSubmitted?: (submission: KycSubmission) => void;
}

export const KycVerificationModal: React.FC<KycVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  storeId: propStoreId,
  storeName,
  managerName,
  managerPhone,
  currentSubmission,
  onSubmitted,
  onKycSubmitted
}) => {
  // Exemption totale pour le Super Admin (propriétaire)
  if (isSuperAdminLocally(currentUser)) {
    return null;
  }

  const activeStoreId = propStoreId || currentUser?.storeId || 'store-nana-1';
  const [managerFullName, setManagerFullName] = useState(managerName || currentUser?.name || '');
  const [whatsappPhone, setWhatsappPhone] = useState(managerPhone || currentUser?.phone || '');
  const [documentType, setDocumentType] = useState<KycDocumentType>('CNIB');

  // Photos & Compression Base64
  const [managerPhotoUrl, setManagerPhotoUrl] = useState<string>(currentUser?.avatarUrl || '');
  const [documentPhotoUrl, setDocumentPhotoUrl] = useState<string>('');
  const [isCompressingManager, setIsCompressingManager] = useState(false);
  const [isCompressingDoc, setIsCompressingDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingKyc, setExistingKyc] = useState<KycSubmission | null>(currentSubmission || null);

  const managerFileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  // Charger dossier existant si déjà soumis
  useEffect(() => {
    if (currentSubmission) {
      setExistingKyc(currentSubmission);
      if (currentSubmission.managerFullName) setManagerFullName(currentSubmission.managerFullName);
      if (currentSubmission.whatsappPhone) setWhatsappPhone(currentSubmission.whatsappPhone);
      if (currentSubmission.documentType) setDocumentType(currentSubmission.documentType);
      if (currentSubmission.managerPhotoUrl) setManagerPhotoUrl(currentSubmission.managerPhotoUrl);
      if (currentSubmission.documentPhotoUrl) setDocumentPhotoUrl(currentSubmission.documentPhotoUrl);
    } else if (isOpen && activeStoreId) {
      getStoreKycRequest(activeStoreId).then(existing => {
        if (existing) {
          setExistingKyc(existing);
          setManagerFullName(existing.managerFullName || managerName || currentUser?.name || '');
          setWhatsappPhone(existing.whatsappPhone || managerPhone || currentUser?.phone || '');
          setDocumentType(existing.documentType || 'CNIB');
          if (existing.managerPhotoUrl) setManagerPhotoUrl(existing.managerPhotoUrl);
          if (existing.documentPhotoUrl) setDocumentPhotoUrl(existing.documentPhotoUrl);
        }
      });
    }
  }, [isOpen, activeStoreId, currentSubmission, managerName, managerPhone, currentUser]);

  if (!isOpen) return null;

  // Gestion upload photo gérant
  const handleManagerPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingManager(true);
      playTapBeep();
      const base64 = await compressImageToBase64(file, 800, 0.8);
      setManagerPhotoUrl(base64);
      setErrorMessage(null);
    } catch (err) {
      console.error('Erreur compression photo gérant', err);
      setErrorMessage("Impossible de compresser la photo. Veuillez choisir une autre image.");
    } finally {
      setIsCompressingManager(false);
    }
  };

  // Gestion upload pièce officielle
  const handleDocPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingDoc(true);
      playTapBeep();
      const base64 = await compressImageToBase64(file, 1200, 0.82);
      setDocumentPhotoUrl(base64);
      setErrorMessage(null);
    } catch (err) {
      console.error('Erreur compression pièce', err);
      setErrorMessage("Impossible de compresser la pièce d'identité.");
    } finally {
      setIsCompressingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAndBlockDemoAction(currentUser)) {
      onClose();
      return;
    }
    setErrorMessage(null);

    if (!managerFullName.trim()) {
      setErrorMessage("Le nom et prénom du responsable sont obligatoires.");
      playCancelSound();
      return;
    }

    if (!managerPhotoUrl) {
      setErrorMessage("Veuillez importer une photo de profil nette de l'agent gérant.");
      playCancelSound();
      return;
    }

    if (!documentPhotoUrl) {
      setErrorMessage("Veuillez importer la photo recto (ou page identité) de votre pièce officielle.");
      playCancelSound();
      return;
    }

    const storeId = activeStoreId;
    const resolvedUserId = currentUser?.id || currentUser?.uid || storeId;

    const submission: KycSubmission = {
      id: `kyc-${storeId}`,
      userId: resolvedUserId,
      storeId,
      storeName: storeName || currentUser?.storeName || 'Ma Boutique',
      managerFullName: managerFullName.trim(),
      managerPhotoUrl,
      whatsappPhone: whatsappPhone.trim(),
      documentType,
      documentPhotoUrl,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    try {
      setIsSubmitting(true);
      playTapBeep();
      await submitKycRequest(submission);
      try {
        await submitKycSubmission({ ...submission, userId: resolvedUserId });
      } catch (subErr) {
        console.info('kyc_submissions sync notice:', subErr);
      }
      playValidationBeep();
      if (onSubmitted) {
        onSubmitted(submission);
      }
      if (onKycSubmitted) {
        onKycSubmitted(submission);
      }
      onClose();
    } catch (err) {
      console.error('Erreur soumission dossier KYC', err);
      setErrorMessage("Erreur lors de l'envoi du dossier. Réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border border-theme rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative text-body my-auto max-h-[calc(100vh-2rem)] sm:max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-slate-700">
        
        {/* En-tête avec bouton fermer */}
        <div className="flex items-start justify-between border-b border-theme pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-body tracking-tight">
                  Certification Vitrine Web (KYC)
                </h3>
                <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                  PALIER 2
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Débloquez votre boutique en ligne publique, vos Pixels et le badge de confiance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { playTapBeep(); onClose(); }}
            className="p-2 rounded-full bg-secondary hover:bg-card-hover text-muted hover:text-body border border-theme transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rappel du Palier 1 débloqué */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-600 dark:text-blue-200">
            <span className="font-bold">Palier 1 déjà actif :</span> Vous pouvez encaisser à la caisse physique, gérer vos stocks et imprimer des tickets sans attendre. La vérification ci-dessous ne concerne que l'ouverture de votre vitrine web publique.
          </div>
        </div>

        {/* Message d'état existant */}
        {existingKyc?.status === 'pending_approval' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs text-amber-600 dark:text-amber-200 space-y-1">
              <p className="font-black text-amber-600 dark:text-amber-300">Dossier en cours d'examen par l'équipe administrative</p>
              <p className="text-[11px] text-muted">
                Transmis le {new Date(existingKyc.submittedAt).toLocaleDateString('fr-FR')}. Vous pouvez mettre à jour vos documents à tout moment ci-dessous.
              </p>
            </div>
          </div>
        )}

        {existingKyc?.status === 'rejected' && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-600 dark:text-rose-200 space-y-1">
              <p className="font-black text-rose-600 dark:text-rose-300">Dossier non validé</p>
              <p className="text-[11px] text-muted">
                Motif : <span className="font-semibold text-body">{existingKyc.rejectionReason || "Pièce d'identité illisible ou incomplète."}</span>
              </p>
              <p className="text-[10px] text-muted">Veuillez charger une photo plus nette et renvoyer le formulaire.</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 flex items-center gap-2 text-xs text-rose-500">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulaire de soumission */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* SECTION 1 : IDENTITÉ DU RESPONSABLE */}
          <div className="bg-secondary border border-theme rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-body font-bold text-xs pb-1 border-b border-theme">
              <User className="w-4 h-4 text-emerald-500" />
              <span>1. Identité du Responsable Légal</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-body font-bold mb-1 text-[11px]">
                  Nom et Prénom du Gérant *
                </label>
                <input
                  type="text"
                  value={managerFullName}
                  onChange={(e) => setManagerFullName(e.target.value)}
                  placeholder="Ex: Amadou Diallo"
                  required
                  className="w-full bg-input border border-theme rounded-xl px-3 py-2 text-body text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-body font-bold mb-1 text-[11px]">
                  Contact WhatsApp Direct *
                </label>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="Ex: +225 07 12 34 56 78"
                  required
                  className="w-full bg-input border border-theme rounded-xl px-3 py-2 text-body text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Photo de profil de l'agent / gérant */}
            <div>
              <label className="block text-body font-bold mb-1 text-[11px]">
                Photo de profil nette du gérant *
              </label>
              <input
                type="file"
                ref={managerFileRef}
                accept="image/*"
                className="hidden"
                onChange={handleManagerPhotoChange}
              />

              <div className="flex items-center gap-3">
                {managerPhotoUrl ? (
                  <img
                    src={managerPhotoUrl}
                    alt="Gérant"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-input border border-theme flex items-center justify-center text-muted shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                )}

                <div className="space-y-1">
                  <button
                    type="button"
                    disabled={isCompressingManager}
                    onClick={() => { playTapBeep(); managerFileRef.current?.click(); }}
                    className="bg-secondary hover:bg-card-hover text-body border border-theme text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{managerPhotoUrl ? "Changer photo" : "Importer photo gérant"}</span>
                  </button>
                  <p className="text-[10px] text-muted">Photo claire du visage. Compression Canvas automatique.</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 : PIÈCE OFFICIELLE */}
          <div className="bg-secondary border border-theme rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-body font-bold text-xs pb-1 border-b border-theme">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>2. Pièce d'Identité Officielle</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'CNIB', label: 'CNIB Nationale' },
                { id: 'PASSPORT_AES_CEDEAO', label: 'Passeport AES / CEDEAO' },
                { id: 'CARTE_CONSULAIRE', label: 'Carte Consulaire' }
              ].map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => { playTapBeep(); setDocumentType(doc.id as KycDocumentType); }}
                  className={`p-2.5 rounded-xl border text-center transition font-bold text-[11px] cursor-pointer ${
                    documentType === doc.id
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                      : 'bg-card border-theme text-muted hover:text-body'
                  }`}
                >
                  {doc.label}
                </button>
              ))}
            </div>

            {/* Upload photo pièce d'identité */}
            <div>
              <label className="block text-body font-bold mb-1 text-[11px]">
                Photo recto de la pièce officielle *
              </label>
              <input
                type="file"
                ref={docFileRef}
                accept="image/*"
                className="hidden"
                onChange={handleDocPhotoChange}
              />

              <div className="border-2 border-dashed border-theme hover:border-indigo-500/60 rounded-2xl p-4 text-center transition bg-input/40">
                {documentPhotoUrl ? (
                  <div className="space-y-3">
                    <img
                      src={documentPhotoUrl}
                      alt="Pièce officielle"
                      className="max-h-36 mx-auto rounded-xl object-contain border border-theme shadow-md"
                    />
                    <button
                      type="button"
                      disabled={isCompressingDoc}
                      onClick={() => { playTapBeep(); docFileRef.current?.click(); }}
                      className="text-[11px] text-indigo-500 hover:text-indigo-400 font-bold underline cursor-pointer"
                    >
                      Remplacer le document
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-body font-bold">
                      Cliquez pour importer la photo de votre {documentType === 'CNIB' ? 'CNIB' : documentType === 'PASSPORT_AES_CEDEAO' ? 'Passeport' : 'Carte Consulaire'}
                    </div>
                    <p className="text-[10px] text-muted">
                      Format JPG ou PNG. L'image sera automatiquement compressée via HTML5 Canvas.
                    </p>
                    <button
                      type="button"
                      disabled={isCompressingDoc}
                      onClick={() => { playTapBeep(); docFileRef.current?.click(); }}
                      className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer active:scale-95 shadow-md shadow-indigo-600/30"
                    >
                      Choisir le fichier
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2.5 pt-2 border-t border-theme">
            <button
              type="button"
              onClick={() => { playTapBeep(); onClose(); }}
              className="flex-1 bg-secondary hover:bg-card-hover border border-theme py-3 rounded-2xl font-bold text-xs text-body cursor-pointer transition"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isCompressingDoc || isCompressingManager}
              className="flex-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs py-3 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? "Transmission en cours..." : "Soumettre mon dossier pour approbation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KycVerificationModal;
