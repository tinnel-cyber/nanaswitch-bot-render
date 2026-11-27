import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  FileSignature,
  CheckCircle2,
  ShieldCheck,
  Download,
  Send,
  PenTool,
  RotateCcw,
  Phone,
  User,
  Briefcase,
  AlertCircle,
  Loader2,
  Stamp,
  ArrowLeft,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { supabase } from '../../lib/supabase';

export interface CommissionAccountRecord {
  id: string;
  user_id: string;
  universe_id: string;
  email?: string | null;
  store_name?: string | null;
  status: string;
  commission_rate_percent: number;
  total_sales_xof: number;
  total_commission_xof: number;
  total_net_merchant_xof: number;
  transactions_count: number;
  full_name?: string | null;
  business_domain?: string | null;
  payment_number_1?: string | null;
  payment_number_2?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  signature_data_url?: string | null;
  contract_accepted?: boolean;
  contract_number?: string | null;
  contract_signed_at?: string | null;
  enrolled_at?: string | null;
}

interface CommissionSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  universeId: string;
  storeName: string;
  commissionRatePercent?: number;
  existingAccount?: CommissionAccountRecord | null;
  onEnrolled?: (account: CommissionAccountRecord) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CommissionSubscriptionModal: React.FC<CommissionSubscriptionModalProps> = ({
  isOpen,
  onClose,
  universeId,
  storeName,
  commissionRatePercent = 14,
  existingAccount,
  onEnrolled,
  showToast,
}) => {
  const [step, setStep] = useState<'FORM' | 'CONTRACT'>('FORM');

  // Champs du formulaire
  const [fullName, setFullName] = useState('');
  const [businessDomain, setBusinessDomain] = useState('');
  const [paymentNumber1, setPaymentNumber1] = useState('');
  const [paymentNumber2, setPaymentNumber2] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Contrat & Signature
  const [contractNumber] = useState(
    () => existingAccount?.contract_number || `CTR-COM-${Date.now().toString(36).toUpperCase()}`
  );
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (existingAccount) {
      if (existingAccount.full_name) setFullName(existingAccount.full_name);
      if (existingAccount.business_domain) setBusinessDomain(existingAccount.business_domain);
      if (existingAccount.payment_number_1) setPaymentNumber1(existingAccount.payment_number_1);
      if (existingAccount.payment_number_2) setPaymentNumber2(existingAccount.payment_number_2);
      if (existingAccount.emergency_contact_name) setEmergencyContactName(existingAccount.emergency_contact_name);
      if (existingAccount.emergency_contact_phone) setEmergencyContactPhone(existingAccount.emergency_contact_phone);
      if (existingAccount.signature_data_url) setSignatureDataUrl(existingAccount.signature_data_url);
    }
  }, [existingAccount]);

  useEffect(() => {
    if (!isSignatureModalOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasDrawn(false);
  }, [isSignatureModalOpen]);

  if (!isOpen) return null;

  const getPointerPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawingRef.current = true;
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const confirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setIsSignatureModalOpen(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (
      !fullName.trim() ||
      !businessDomain.trim() ||
      !paymentNumber1.trim() ||
      !paymentNumber2.trim() ||
      !emergencyContactName.trim() ||
      !emergencyContactPhone.trim()
    ) {
      setFormError('Veuillez renseigner tous les champs obligatoires avant de générer le contrat.');
      return;
    }
    setStep('CONTRACT');
  };

  const buildContractHtml = (signedDateStr: string) => {
    return `
      <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 24px; border: 2px solid #1e293b; border-radius: 12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e2e8f0; padding-bottom:14px;">
          <div>
            <h2 style="margin:0; font-size:18px;">CONTRAT D'ADHÉSION — NANASORE COMMISSION PLAN</h2>
            <p style="margin:4px 0 0; font-size:12px; color:#475569;">Référence : <strong>${contractNumber}</strong> • Date : ${signedDateStr}</p>
          </div>
          <div style="border:3px solid #b45309; color:#b45309; padding:6px 12px; font-weight:900; font-size:11px; transform:rotate(-6deg); border-radius:8px;">
            NANASORE COMMISSION PLAN<br/>TAUX OFFICIEL : ${commissionRatePercent}%
          </div>
        </div>
        <p style="font-size:13px; margin-top:16px;"><strong>Souscripteur :</strong> ${fullName} — <strong>Boutique :</strong> ${storeName || universeId}</p>
        <p style="font-size:13px;"><strong>Domaine d'activité :</strong> ${businessDomain}</p>
        <p style="font-size:13px;"><strong>Numéros de paiement :</strong> 1) ${paymentNumber1} | 2) ${paymentNumber2}</p>
        <p style="font-size:13px;"><strong>Contact d'urgence :</strong> ${emergencyContactName} (${emergencyContactPhone})</p>
        <hr style="margin:14px 0; border-color:#e2e8f0;" />
        <p style="font-size:12px;"><strong>Article 1 (Objet &amp; Domaine d'activité) :</strong> Activation du Plan Commission sans frais fixes mensuels pour le domaine d'activité déclaré (<strong>${businessDomain}</strong>), couvrant les prestations de services, la vente de produits numériques, formations, documents PDF et accès digitaux.</p>
        <p style="font-size:12px;"><strong>Article 2 (Taux &amp; Répartition) :</strong> Commission unique de ${commissionRatePercent}% prélevée automatiquement sur chaque vente ou prestation encaissée. ${100 - commissionRatePercent}% net reversé au marchand / prestataire de service.</p>
        <p style="font-size:12px;"><strong>Article 3 (Reversement &amp; Séquestre) :</strong> Les fonds sont protégés sous séquestre Escrow puis versés sur les numéros déclarés (${paymentNumber1} / ${paymentNumber2}).</p>
        <p style="font-size:12px;"><strong>Article 4 (Conformité) :</strong> Le souscripteur certifie l'exactitude de son identité, de son domaine d'activité (${businessDomain}) et de son contact d'urgence (${emergencyContactName} - ${emergencyContactPhone}).</p>
        <div style="margin-top:20px;">
          <p style="font-weight:bold; font-size:13px; margin-bottom:6px;">Lu et approuvé</p>
          ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="Signature" style="max-height:80px; border-bottom:1px solid #94a3b8;" />` : ''}
        </div>
      </div>
    `;
  };

  const downloadSignedContractPdf = (signedDateStr: string) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Bordure officielle
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.7);
    doc.rect(10, 10, pageW - 20, 277);

    // En-tête
    doc.setFillColor(15, 23, 42);
    doc.rect(10, 10, pageW - 20, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CONTRAT D\'ADHÉSION — NANASORE COMMISSION PLAN', 16, 21);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Réf. Contrat : ${contractNumber}   |   Date : ${signedDateStr}`, 16, 29);

    // Tampon officiel NANASORE COMMISSION PLAN
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.9);
    doc.roundedRect(pageW - 68, 42, 52, 18, 2, 2);
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('NANASORE', pageW - 42, 48, { align: 'center' });
    doc.text('COMMISSION PLAN', pageW - 42, 53, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text(`CERTIFIÉ • TAUX ${commissionRatePercent}%`, pageW - 42, 57.5, { align: 'center' });

    // Informations du souscripteur
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. IDENTIFICATION DU MARCHAND / PRESTATAIRE DE SERVICE', 16, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    let y = 56;
    const rows = [
      `Nom complet : ${fullName}`,
      `Boutique / Univers : ${storeName || universeId}`,
      `Domaine d'activité : ${businessDomain}`,
      `Numéro de paiement 1 (Principal) : ${paymentNumber1}`,
      `Numéro de paiement 2 (Secondaire) : ${paymentNumber2}`,
      `Contact d'urgence : ${emergencyContactName} — Tél : ${emergencyContactPhone}`,
    ];
    rows.forEach((line) => {
      doc.text(line, 16, y);
      y += 6.5;
    });

    // Clauses du contrat
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`2. CLAUSES & CONDITIONS DU PLAN COMMISSION (${commissionRatePercent}%)`, 16, y);
    y += 7;

    const clauses = [
      `Article 1 - Objet & Domaine d'activité : Le présent contrat régit l'adhésion du Souscripteur au Plan Commission NaNaSore (0 F CFA d'abonnement mensuel fixe) pour son domaine d'activité (« ${businessDomain} »), couvrant les prestations de services, la commercialisation de produits numériques, formations, PDF, masterclasses et accès digitaux.`,
      `Article 2 - Taux de Commission (${commissionRatePercent}%) : Sur chaque vente ou prestation de service encaissée via la plateforme, une commission unique de ${commissionRatePercent}% est prélevée automatiquement. Le Souscripteur perçoit ${100 - commissionRatePercent}% net de chaque transaction.`,
      `Article 3 - Séquestre Escrow & Reversement : Les paiements clients transitent sous protection séquestre Escrow et sont reversés vers les numéros de paiement déclarés (${paymentNumber1} ou ${paymentNumber2}).`,
      `Article 4 - Transparence Analytique : Chaque vente génère un relevé détaillé (Montant Brut, Commission ${commissionRatePercent}%, Revenu Net) consultable en temps réel dans le tableau de bord Analytique.`,
      `Article 5 - Contact d'Urgence & Résiliation : En cas de besoin opérationnel ou de litige, NaNaSore est autorisé à joindre ${emergencyContactName} (${emergencyContactPhone}). Le Souscripteur peut à tout moment basculer vers un Plan Abonnement (0% commission).`,
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    clauses.forEach((clause) => {
      const wrapped = doc.splitTextToSize(clause, pageW - 32);
      doc.text(wrapped, 16, y);
      y += wrapped.length * 4.8 + 3;
    });

    // Bloc Lu et approuvé + Signature positionnée juste en bas
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Lu et approuvé', 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Signé électroniquement par ${fullName} le ${signedDateStr}`, 16, y + 5);

    if (signatureDataUrl) {
      try {
        doc.addImage(signatureDataUrl, 'PNG', 16, y + 8, 62, 26);
      } catch {
        // Fallback silencieux si l'image canvas ne peut être intégrée
      }
    }
    doc.setDrawColor(148, 163, 184);
    doc.line(16, y + 36, 84, y + 36);

    doc.save(`Contrat_Commission_NaNaSore_${contractNumber}.pdf`);
  };

  const handleValidateAndDownload = async () => {
    setSubmitError(null);
    if (!signatureDataUrl) {
      setSubmitError('Veuillez d\'abord apposer votre signature dans le modal de signature.');
      return;
    }
    if (!contractAccepted) {
      setSubmitError('Veuillez cocher la case "Lu et approuvé" pour valider et télécharger le contrat.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Session utilisateur non détectée. Veuillez vous reconnecter.');
      }

      const signedDateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const contractHtml = buildContractHtml(signedDateStr);

      const response = await fetch('/api/merchant/commission/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          universeId,
          storeName,
          commissionRatePercent,
          fullName: fullName.trim(),
          businessDomain: businessDomain.trim(),
          paymentNumber1: paymentNumber1.trim(),
          paymentNumber2: paymentNumber2.trim(),
          emergencyContactName: emergencyContactName.trim(),
          emergencyContactPhone: emergencyContactPhone.trim(),
          signatureDataUrl,
          contractAccepted: true,
          contractNumber,
          contractHtml,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error || 'Impossible d\'enregistrer le contrat dans Supabase.');
      }

      // Persistance locale synchronisée avec Supabase
      try {
        localStorage.setItem(
          `nanasore_commission_plan_${universeId || 'default'}`,
          JSON.stringify({
            active: true,
            contractNumber,
            rate: commissionRatePercent,
            account: payload.account,
            savedAt: new Date().toISOString(),
          })
        );
      } catch {}

      // Téléchargement automatique du PDF signé
      downloadSignedContractPdf(signedDateStr);

      showToast?.(
        `Contrat ${contractNumber} validé, enregistré dans Supabase et transmis au Super Admin Dashboard !`,
        'success'
      );
      onEnrolled?.(payload.account);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Erreur lors de la validation du contrat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {step === 'FORM'
                  ? 'Souscrire au Plan Commission NaNaSore'
                  : 'Contrat Officiel & Signature Électronique'}
              </h3>
              <p className="text-[11px] text-indigo-200 font-medium">
                {step === 'FORM'
                  ? `Commission unique ${commissionRatePercent}% par vente • 0 F CFA d'abonnement fixe`
                  : `Référence : ${contractNumber} • Copie transmise au Super Admin`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-5 flex-1">
          {step === 'FORM' ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-950 leading-relaxed">
                  Renseignez vos informations officielles (créateur, formateur ou <strong>prestataire de service</strong>)
                  pour générer votre contrat pré-rempli{' '}
                  <strong>NaNaSore Commission Plan ({commissionRatePercent}%)</strong>. Vos deux numéros de paiement
                  permettront le reversement sécurisé de vos revenus nets (86%).
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Nom complet <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Kouassi Jean-Marc"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Domaine d'activité <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={businessDomain}
                      onChange={(e) => setBusinessDomain(e.target.value)}
                      placeholder="Ex: Prestataire de service, Formation, Coaching, Consulting..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Numéro de paiement 1 (Principal) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={paymentNumber1}
                      onChange={(e) => setPaymentNumber1(e.target.value)}
                      placeholder="Ex: +225 07 00 00 00 01 (Wave / OM)"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Numéro de paiement 2 (Secondaire) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={paymentNumber2}
                      onChange={(e) => setPaymentNumber2(e.target.value)}
                      placeholder="Ex: +225 05 00 00 00 02 (MTN / Moov)"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                  Personne à prévenir en cas de besoin
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Nom complet (contact d'urgence) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Ex: Koné Aminata"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Numéro de téléphone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="Ex: +225 01 02 03 04 05"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-slate-900 hover:from-indigo-700 hover:to-slate-950 text-white text-xs sm:text-sm font-black shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Envoyer &amp; Générer le Contrat</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Contrat pré-rempli avec Tampon NANASORE COMMISSION PLAN */}
              <div className="relative rounded-2xl border-2 border-slate-800 bg-slate-50/70 p-5 sm:p-7 space-y-4 shadow-inner">
                {/* Tampon officiel */}
                <div className="sm:absolute sm:top-5 sm:right-5 inline-flex flex-col items-center justify-center px-3.5 py-2 rounded-xl border-2 border-amber-700 text-amber-800 bg-amber-50/90 -rotate-3 shadow-sm select-none">
                  <div className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase">
                    <Stamp className="w-3.5 h-3.5" />
                    <span>NANASORE</span>
                  </div>
                  <div className="text-xs font-black tracking-wider uppercase">COMMISSION PLAN</div>
                  <div className="text-[9px] font-extrabold text-amber-700">CERTIFIÉ • TAUX {commissionRatePercent}%</div>
                </div>

                <div className="pr-0 sm:pr-44 border-b border-slate-300 pb-4">
                  <h4 className="text-base sm:text-lg font-black text-slate-900">
                    CONTRAT D'ADHÉSION AU PLAN COMMISSION
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    N° {contractNumber} • Établi le{' '}
                    {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Récapitulatif pré-rempli */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-bold block">Souscripteur</span>
                    <span className="text-slate-900 font-black">{fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Domaine d'activité</span>
                    <span className="text-slate-900 font-black">{businessDomain}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Numéro de paiement 1</span>
                    <span className="text-emerald-700 font-black">{paymentNumber1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Numéro de paiement 2</span>
                    <span className="text-indigo-700 font-black">{paymentNumber2}</span>
                  </div>
                  <div className="sm:col-span-2 pt-1 border-t border-slate-100">
                    <span className="text-slate-400 font-bold block">Personne à prévenir en cas de besoin</span>
                    <span className="text-slate-900 font-bold">
                      {emergencyContactName} — {emergencyContactPhone}
                    </span>
                  </div>
                </div>

                {/* Clauses */}
                <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 max-h-56 overflow-y-auto">
                  <p>
                    <strong>Article 1 — Objet &amp; Domaine d'activité :</strong> Le présent contrat officialise l'adhésion
                    de <strong>{fullName}</strong> (Boutique : <strong>{storeName || universeId}</strong>) au{' '}
                    <strong>Plan Commission NaNaSore</strong> pour son domaine d'activité déclaré :{' '}
                    <strong>« {businessDomain} »</strong>, couvrant les <strong>prestations de services</strong>, la vente
                    de produits numériques, formations, documents PDF et accès digitaux sans abonnement mensuel fixe.
                  </p>
                  <p>
                    <strong>Article 2 — Taux de Commission ({commissionRatePercent}%) :</strong> Une commission fixe et
                    unique de <strong>{commissionRatePercent}%</strong> est prélevée uniquement lors de chaque vente ou
                    prestation de service encaissée. Le marchand / prestataire de service conserve{' '}
                    <strong>{100 - commissionRatePercent}% net</strong> de son chiffre d'affaires.
                  </p>
                  <p>
                    <strong>Article 3 — Reversement &amp; Séquestre Escrow :</strong> Les paiements clients sont
                    sécurisés sous séquestre Escrow automatique et reversés sur les numéros déclarés (
                    <strong>{paymentNumber1}</strong> / <strong>{paymentNumber2}</strong>).
                  </p>
                  <p>
                    <strong>Article 4 — Suivi Analytique :</strong> Chaque vente est enregistrée en temps réel dans le
                    tableau de bord Analytique (Montant brut, Commission {commissionRatePercent}%, Net marchand).
                  </p>
                  <p>
                    <strong>Article 5 — Contact d'urgence &amp; Évolution :</strong> En cas de vérification ou
                    d'indisponibilité, NaNaSore peut contacter <strong>{emergencyContactName}</strong> (
                    {emergencyContactPhone}). Le marchand reste libre de migrer vers un Plan Abonnement (0% commission)
                    à tout moment.
                  </p>
                </div>

                {/* Zone Lu et approuvé + Signature positionnée juste en bas */}
                <div className="bg-white p-4 rounded-xl border border-slate-300 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-black text-slate-900 underline decoration-slate-400 underline-offset-4">
                      Lu et approuvé
                    </div>
                    {signatureDataUrl ? (
                      <div className="pt-1">
                        <img
                          src={signatureDataUrl}
                          alt="Signature du souscripteur"
                          className="h-20 max-w-[230px] object-contain border border-slate-200 rounded-lg bg-white p-1"
                        />
                        <p className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Signature validée et positionnée sous « Lu et approuvé »</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700 font-semibold italic">
                        Aucune signature apposée pour le moment. Cliquez sur « Signer le contrat ».
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-sm cursor-pointer self-start sm:self-end"
                  >
                    <PenTool className="w-4 h-4" />
                    <span>{signatureDataUrl ? 'Modifier la signature' : 'Signer le contrat'}</span>
                  </button>
                </div>
              </div>

              {/* Case à cocher */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-100 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contractAccepted}
                  onChange={(e) => setContractAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-800 leading-relaxed">
                  <strong>En cochant cette case</strong>, je déclare avoir <strong>lu et approuvé</strong> l'intégralité
                  du contrat <strong>NaNaSore Commission Plan ({commissionRatePercent}%)</strong>, j'accepte sans
                  réserve nos <strong>Conditions Générales d'Utilisation (CGU)</strong>, notre{' '}
                  <strong>Politique de Confidentialité</strong>, notre{' '}
                  <strong>Politique de Séquestre Escrow &amp; de Commission ({commissionRatePercent}%)</strong>, je
                  certifie l'exactitude des informations saisies et j'autorise la transmission d'une copie officielle
                  signée au Super Admin Dashboard.
                </span>
              </label>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Modifier mes informations</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !signatureDataUrl || !contractAccepted}
                  onClick={handleValidateAndDownload}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-black shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validation &amp; Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Valider et télécharger</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Signature Manuscrite */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900">Signature Électronique du Contrat</h4>
                <p className="text-[11px] text-slate-500">
                  Tracez votre signature ci-dessous avec la souris ou le doigt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={460}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 touch-none cursor-crosshair block"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={clearSignatureCanvas}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Effacer</span>
              </button>

              <button
                type="button"
                disabled={!hasDrawn}
                onClick={confirmSignature}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider la signature</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
